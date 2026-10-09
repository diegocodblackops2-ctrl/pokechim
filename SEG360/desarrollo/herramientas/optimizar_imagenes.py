#!/usr/bin/env python3
"""Convierte los originales de SEG360/originales_medios/imagenes/<ID>.jpg en WebP optimizados para el curso:
curso/media/images/seg360-img0NN.webp (1600 px de ancho, calidad 80) y la variante móvil --sm (800 px, calidad 74).
Los retratos (SEG360-PERnn) salen a 640 y 240 px. Uso: python3 herramientas/optimizar_imagenes.py [--forzar]"""
import glob, os, sys
from PIL import Image
AQUI = os.path.dirname(os.path.abspath(__file__))
SEG = os.path.abspath(os.path.join(AQUI, "..", ".."))
ORI = os.path.join(SEG, "originales_medios", "imagenes")
DST = os.path.join(SEG, "desarrollo", "curso", "media", "images")
os.makedirs(DST, exist_ok=True)
forzar = "--forzar" in sys.argv
n = 0
for f in sorted(glob.glob(os.path.join(ORI, "SEG360-*.jpg")) + sorted(glob.glob(os.path.join(ORI, "SEG360-*.png")))):
    iid = os.path.splitext(os.path.basename(f))[0]
    base = iid.lower()
    out, sm = os.path.join(DST, base + ".webp"), os.path.join(DST, base + "--sm.webp")
    if os.path.exists(out) and os.path.exists(sm) and not forzar and os.path.getmtime(out) > os.path.getmtime(f):
        continue
    im = Image.open(f).convert("RGB")
    grande, chico = (640, 240) if "-PER" in iid else (1600, 800)
    for ancho, q, dst in ((grande, 80, out), (chico, 74, sm)):
        w, h = im.size
        r = im if w <= ancho else im.resize((ancho, round(h * ancho / w)), Image.LANCZOS)
        r.save(dst, "WEBP", quality=q, method=6)
    n += 1
tot = sum(os.path.getsize(p) for p in glob.glob(os.path.join(DST, "*.webp")))
print(n, "convertidas ·", len(glob.glob(os.path.join(DST, "*.webp"))), "archivos ·", round(tot / 1e6, 2), "MB")
