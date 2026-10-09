#!/usr/bin/env python3
"""Empaqueta el Curso 5 como UN SOLO SCO (SCORM 2004 4.ª edición, recomendado) y como alternativa SCORM 1.2.

Todo el programa (orientación, 16 módulos, evaluación, proyecto y transferencia) se lanza desde index.html y guarda
un único registro en el LMS: cmi.suspend_data (estado comprimido), cmi.location, cmi.progress_measure,
cmi.completion_status, cmi.success_status, cmi.score.*, cmi.session_time, cmi.objectives (uno por sección) e
interacciones del examen. El examen se bloquea dentro del curso hasta completar las 17 secciones.
SCORM 1.2: un solo lesson_status (passed/failed/incomplete), score.raw y session_time; suspend_data de 4.096
caracteres (si no cabe, se guarda el avance «lite» y los textos largos quedan en el navegador, con aviso).
El paquete NO incluye originales de medios ni modelos/soluciones de proyecto. El banco del examen viaja ofuscado
(data/eval.js) por decisión de Dibork: no es seguridad (ver docs/INTEGRACION_DIBORK.md).

Uso: python3 herramientas/empaquetar_scorm.py [--salida dist]
"""
import argparse, hashlib, json, os, re, shutil, sys, zipfile
from xml.sax.saxutils import escape

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CURSO = os.path.join(RAIZ, "curso")
VERSION = "3.0.0"
TITULO = "IA para trabajar mejor · Curso 5 · Dibork Learning"
SCRIPTS = ["app/js/iatu-iconos.js", "app/js/iatu-util.js", "app/js/iatu-fx.js", "app/js/iatu-store.js", "app/js/iatu-media.js", "app/js/iatu-inter.js",
           "app/js/iatu-practica.js", "app/js/iatu-eval.js", "app/js/iatu-app.js"]
EXT_PUBLICAS = {".js", ".css", ".svg", ".txt", ".mp3", ".vtt", ".webp", ".mp4", ".docx", ".xlsx", ".csv", ".woff2"}
EXCLUIR = re.compile(r"(registro_audio\.json|adaptacion_oral\.json|qa_asr\.json|reporte_webp\.json|registro_video\.json|/muestras/)")

def pagina_lanzamiento():
    scripts = "\n".join(f'<script src="{x}"></script>' for x in SCRIPTS)
    return f"""<!doctype html>
<html lang="es-CL">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>IA para trabajar mejor · Curso 5 · Dibork Learning</title>
<meta name="theme-color" content="#0b0816">
<link rel="preload" href="app/fonts/sora.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="app/fonts/manrope.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="app/css/iatu.css">
<link rel="stylesheet" href="app/css/iatu-fx.css">
<link rel="icon" href="app/icons/favicon.svg" type="image/svg+xml">
</head>
<body>
<noscript>Este curso requiere JavaScript habilitado.</noscript>
<script src="config.js"></script>
<script src="data/curso.js"></script>
{scripts}
</body>
</html>
"""

def archivos_publicos():
    out = []
    for base, _, files in os.walk(CURSO):
        for f in files:
            rel = os.path.relpath(os.path.join(base, f), CURSO).replace(os.sep, "/")
            if rel in ("index.html", "config.js"): continue
            if os.path.splitext(f)[1].lower() not in EXT_PUBLICAS or EXCLUIR.search("/" + rel): continue
            out.append(rel)
    return sorted(out)

def manifest_2004(files):
    archivos = "".join(f'<file href="{escape(f)}"/>' for f in ["index.html", "config.js"] + files)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="IATU-C05-{VERSION}" version="{VERSION}"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd">
<metadata><schema>ADL SCORM</schema><schemaversion>2004 4th Edition</schemaversion></metadata>
<organizations default="ORG-IATU"><organization identifier="ORG-IATU">
<title>{escape(TITULO)}</title>
<item identifier="ITEM-CURSO" identifierref="RES-CURSO"><title>{escape(TITULO)}</title>
<adlcp:completionThreshold completedByMeasure="false"/>
<imsss:sequencing><imsss:deliveryControls tracked="true" completionSetByContent="true" objectiveSetByContent="true"/></imsss:sequencing>
</item>
<imsss:sequencing><imsss:controlMode choice="true" flow="true"/></imsss:sequencing>
</organization></organizations>
<resources>
<resource identifier="RES-CURSO" type="webcontent" adlcp:scormType="sco" href="index.html">{archivos}</resource>
</resources>
</manifest>
"""

def manifest_12(files):
    archivos = "".join(f'<file href="{escape(f)}"/>' for f in ["index.html", "config.js"] + files)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="IATU-C05-{VERSION}-12" version="1.1"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
<metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
<organizations default="ORG-IATU"><organization identifier="ORG-IATU"><title>{escape(TITULO)}</title>
<item identifier="ITEM-CURSO" identifierref="RES-CURSO"><title>{escape(TITULO)}</title></item>
</organization></organizations>
<resources>
<resource identifier="RES-CURSO" type="webcontent" adlcp:scormtype="sco" href="index.html">{archivos}</resource>
</resources>
</manifest>
"""

def construir(dest, edicion, files):
    if os.path.exists(dest): shutil.rmtree(dest)
    os.makedirs(dest)
    for f in files:
        os.makedirs(os.path.dirname(os.path.join(dest, f)), exist_ok=True)
        shutil.copy2(os.path.join(CURSO, f), os.path.join(dest, f))
    shutil.copy2(os.path.join(CURSO, "config.js"), os.path.join(dest, "config.js"))
    with open(os.path.join(dest, "index.html"), "w", encoding="utf-8") as fh: fh.write(pagina_lanzamiento())
    man = manifest_2004(files) if edicion == "2004" else manifest_12(files)
    with open(os.path.join(dest, "imsmanifest.xml"), "w", encoding="utf-8") as fh: fh.write(man)

def comprobar(dest):
    import xml.etree.ElementTree as ET
    t = ET.parse(os.path.join(dest, "imsmanifest.xml"))
    hrefs = [e.attrib["href"] for e in t.iter() if e.tag.endswith("}file")]
    faltan = [h for h in hrefs if not os.path.isfile(os.path.join(dest, h))]
    ids = [e.attrib.get("identifier") for e in t.iter() if e.attrib.get("identifier")]
    dup = sorted({i for i in ids if ids.count(i) > 1})
    refs = [e.attrib["identifierref"] for e in t.iter() if "identifierref" in e.attrib]
    rotas = [r for r in refs if r not in ids]
    en_disco = []
    for b, _, fs in os.walk(dest):
        for f in fs: en_disco.append(os.path.relpath(os.path.join(b, f), dest).replace(os.sep, "/"))
    no_declarados = [f for f in en_disco if f not in hrefs and f != "imsmanifest.xml"]
    privado = []
    for f in en_disco:
        if f.endswith((".js", ".html", ".json")):
            txt = open(os.path.join(dest, f), encoding="utf-8", errors="ignore").read()
            if re.search(r"key_justification|\"is_key\"|\"anchors\"|update_model", txt):
                privado.append(f)
    return {"archivos_declarados": len(hrefs), "faltantes": faltan, "ids_duplicados": dup, "referencias_rotas": rotas,
            "archivos_no_declarados": no_declarados, "posible_material_privado": privado,
            "sco": sum(1 for e in t.iter() if e.attrib.get("{http://www.adlnet.org/xsd/adlcp_v1p3}scormType") == "sco" or e.attrib.get("{http://www.adlnet.org/xsd/adlcp_rootv1p2}scormtype") == "sco")}

def zipear(src, zpath):
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for b, _, fs in os.walk(src):
            for f in sorted(fs):
                p = os.path.join(b, f); arc = os.path.relpath(p, src).replace(os.sep, "/")
                z.write(p, arc, compress_type=zipfile.ZIP_STORED if f.endswith((".mp3", ".mp4", ".webp", ".docx", ".xlsx")) else zipfile.ZIP_DEFLATED)
    h = hashlib.sha256(open(zpath, "rb").read()).hexdigest()
    return {"zip": os.path.relpath(zpath, RAIZ), "bytes": os.path.getsize(zpath), "sha256": h}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--salida", default=os.path.join(RAIZ, "dist"))
    a = ap.parse_args()
    files = archivos_publicos()
    informe = {"version": VERSION, "sco": 1}
    for ed, nombre in (("2004", "IATU_C05_SCORM2004_4ed_v" + VERSION), ("12", "IATU_C05_SCORM12_v" + VERSION)):
        dest = os.path.join(a.salida, nombre)
        construir(dest, ed, files)
        chk = comprobar(dest)
        z = zipear(dest, dest + ".zip")
        informe["scorm" + ed] = {**chk, **z}
        print(nombre, json.dumps({k: v for k, v in chk.items()}, ensure_ascii=False), z["bytes"] // 1024, "KiB")
    json.dump(informe, open(os.path.join(a.salida, "informe_empaquetado.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()
