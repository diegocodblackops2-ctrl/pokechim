#!/usr/bin/env python3
"""Crea derivados WebP del catálogo sin modificar originales ni inventar imágenes.

Python 3.10+ y Pillow. Nombra cada entrada iatu-img-001-<nombre>.png/jpg/webp.
El límite de peso es un objetivo: no se sacrifica indefinidamente la calidad.
Un resultado técnico no equivale a aprobación visual ni comprueba derechos.
"""
from __future__ import annotations
import argparse
import hashlib
import io
import json
import re
from pathlib import Path
from typing import Any
from PIL import Image, ImageOps, ImageCms

SUPPORTED = {'.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff'}

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def identify(name: str) -> str | None:
    match = re.match(r'iatu[-_]?img[-_]?(\d{3})(?:[-_.]|$)', name, re.I)
    return f'IATU-IMG{match.group(1)}' if match else None

def clean_pixels(source: Path) -> tuple[Image.Image, dict[str, Any]]:
    with Image.open(source) as raw:
        if getattr(raw, 'n_frames', 1) != 1:
            raise ValueError('Imagen animada o multipágina: entregar una imagen estática revisada.')
        raw.load()
        image = ImageOps.exif_transpose(raw)
        meta: dict[str, Any] = {'source_format': raw.format, 'source_size': list(raw.size),
                               'orientation_applied': True, 'icc_conversion': 'sin perfil'}
        has_alpha = 'A' in image.getbands() or 'transparency' in image.info
        icc = image.info.get('icc_profile')
        if icc:
            try:
                alpha = image.convert('RGBA').getchannel('A') if has_alpha else None
                image = ImageCms.profileToProfile(
                    image.convert('RGB'), ImageCms.ImageCmsProfile(io.BytesIO(icc)),
                    ImageCms.createProfile('sRGB'), outputMode='RGB')
                if alpha is not None:
                    image.putalpha(alpha)
                meta['icc_conversion'] = 'convertido a sRGB'
            except Exception as exc:
                # No omitir en silencio un perfil que no se pudo interpretar.
                raise ValueError(f'Perfil de color no convertible; revisar original: {exc}') from exc
        image = image.convert('RGBA' if has_alpha else 'RGB')
        # Copiar solo píxeles: no llevar EXIF, ubicación, XMP ni comentarios a WebP.
        clean = Image.new(image.mode, image.size)
        clean.paste(image)
        meta['working_size'] = list(clean.size)
        meta['alpha_preserved'] = has_alpha
        return clean, meta

def derivative(image: Image.Image, box: tuple[int, int], budget: int,
               start: int = 82, floor: int = 64) -> tuple[bytes, dict[str, Any]]:
    if not (1 <= floor <= start <= 100):
        raise ValueError('Rango de calidad inválido.')
    resized = image.copy()
    resized.thumbnail(box, Image.Resampling.LANCZOS)  # Nunca amplía ni recorta.
    qualities = list(range(start, floor - 1, -3))
    if qualities[-1] != floor:
        qualities.append(floor)
    payload = b''
    selected = start
    for quality in qualities:
        buffer = io.BytesIO()
        resized.save(buffer, format='WEBP', quality=quality, method=6, exact=True)
        payload = buffer.getvalue()
        selected = quality
        if len(payload) <= budget:
            break
    with Image.open(io.BytesIO(payload)) as verify:
        verify.load()
        if verify.format != 'WEBP' or verify.size != resized.size:
            raise ValueError('El derivado no pasa la verificación de formato y dimensiones.')
        if any(verify.info.get(k) for k in ['exif', 'xmp', 'icc_profile']):
            raise ValueError('Se detectaron metadatos inesperados en el derivado.')
    return payload, {'width': resized.width, 'height': resized.height,
                     'bytes': len(payload), 'kib': round(len(payload) / 1024, 2),
                     'target_kib': budget / 1024, 'target_met': len(payload) <= budget,
                     'quality': selected, 'sha256': sha(payload), 'format_verified': 'WEBP',
                     'metadata_removed': True, 'visual_review': 'pendiente'}

def run(input_dir: Path, output_dir: Path, catalog_file: Path, report_file: Path,
        overwrite: bool = False) -> dict[str, Any]:
    source = input_dir.resolve()
    dest = output_dir.resolve()
    if not source.is_dir():
        raise ValueError(f'No existe carpeta de originales: {source}')
    if source == dest or source in dest.parents or dest in source.parents:
        raise ValueError('Usar carpetas independientes para originales y derivados.')
    report_path = report_file.resolve()
    if report_path.suffix.lower() != '.json' or source == report_path.parent or source in report_path.parents:
        raise ValueError('Guardar informe JSON fuera de la carpeta de originales.')

    raw = json.loads(catalog_file.read_text(encoding='utf-8'))
    catalog = {a['id']: a for a in raw['assets']}
    dest.mkdir(parents=True, exist_ok=True)
    entries = [p for p in source.iterdir() if p.is_file() and p.suffix.lower() in SUPPORTED]
    counts: dict[str, int] = {}
    for p in entries:
        key = identify(p.name)
        if key:
            counts[key] = counts.get(key, 0) + 1
    results: list[dict[str, Any]] = []
    for path in sorted(entries):
        key = identify(path.name)
        item: dict[str, Any] = {'input': path.name, 'id': key}
        try:
            if key not in catalog:
                raise ValueError('Nombre sin ID del catálogo; renombrar sin adivinar su ubicación.')
            if counts.get(key, 0) != 1:
                raise ValueError('ID duplicado en originales; conservar una sola versión seleccionada.')
            asset = catalog[key]
            names = [asset['filename'], asset['mobile_filename']]
            if any(Path(n).name != n or not n.endswith('.webp') for n in names):
                raise ValueError('Nombre de salida inseguro o extensión distinta de WebP.')
            targets = [dest / n for n in names]
            if not overwrite and any(p.exists() for p in targets):
                raise FileExistsError('Ya existe un derivado; usar --overwrite solo tras revisar la versión.')
            image, metadata = clean_pixels(path)
            item.update(metadata)
            item['source_sha256'] = sha(path.read_bytes())
            ratio = asset['width'] / asset['height']
            item['aspect_ratio_review'] = abs(image.width / image.height / ratio - 1) > .025
            main, main_meta = derivative(image, (asset['width'], asset['height']),
                                         int(asset['max_kib_target'] * 1024),
                                         asset['quality_start'], asset['quality_floor'])
            mobile_box = (800, round(800 / ratio))
            small, small_meta = derivative(image, mobile_box,
                                           int(asset['mobile_max_kib_target'] * 1024),
                                           asset['quality_start'], asset['quality_floor'])
            # Ambas conversiones están verificadas antes de escribir; originales intactos.
            for target, payload in zip(targets, (main, small)):
                temp = target.with_suffix('.webp.tmp')
                temp.write_bytes(payload)
                temp.replace(target)
            main_meta['filename'], small_meta['filename'] = names
            item.update(status='convertido; pendiente de revisión visual', main=main_meta, mobile=small_meta)
        except Exception as exc:
            item.update(status='error', error=f'{type(exc).__name__}: {exc}')
        results.append(item)
    report = {'catalog_version': raw.get('version'), 'originals_modified': False,
              'generated_images': False, 'files_detected': len(entries),
              'converted': sum(r['status'] != 'error' for r in results),
              'errors': sum(r['status'] == 'error' for r in results), 'results': results,
              'note': 'No marca activos como aprobados. Revisar recorte, calidad, derechos, alt y uso en móvil.'}
    report_file.parent.mkdir(parents=True, exist_ok=True)
    report_file.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    return report

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--catalog', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--overwrite', action='store_true')
    args = parser.parse_args()
    try:
        report = run(args.input, args.output, args.catalog, args.report, args.overwrite)
    except Exception as exc:
        parser.exit(2, f'No se pudo convertir: {exc}\n')
    print(f"Convertidos: {report['converted']}; errores: {report['errors']}; informe: {args.report}")
    return 1 if report['errors'] else 0

if __name__ == '__main__':
    raise SystemExit(main())
