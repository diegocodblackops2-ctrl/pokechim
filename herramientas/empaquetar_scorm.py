#!/usr/bin/env python3
"""Empaqueta el Curso 5 como SCORM 2004 4.ª edición multi-SCO y como SCORM 1.2 separado.

18 SCO: orientación + 16 módulos + evaluación. Cada SCO tiene su página de lanzamiento (sco_<id>.html) y comparte
app/, data/, media/ y descargas/. El paquete NO incluye banco, claves, soluciones ni originales de medios.

SCORM 2004: cada módulo escribe su objetivo global obj-<sco> (satisfecho = requisitos obligatorios completos).
La evaluación lee esos 17 objetivos y tiene una regla de precondición «disabled» mientras alguno no esté
satisfecho. Además, el SCO de evaluación exige verificación del servicio autorizado (doble control).
SCORM 1.2: sin secuenciación; se declara adlcp:prerequisites (soporte opcional del LMS) y el servicio mantiene el
bloqueo real. Límite de cmi.suspend_data 4.096 caracteres: el avance se guarda en el LMS y los textos extensos en
el servicio (o, sin servicio, solo en el navegador, informado al participante).

Uso: python3 herramientas/empaquetar_scorm.py [--salida dist] [--servicio-url URL]
"""
import argparse, hashlib, json, os, re, shutil, sys, zipfile
from xml.sax.saxutils import escape

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CURSO = os.path.join(RAIZ, "curso")
VERSION = "3.0.0"
TITULO = "IA para trabajar mejor · Curso 5 · Dibork Learning"
SCRIPTS = ["app/js/iatu-iconos.js", "app/js/iatu-util.js", "app/js/iatu-store.js", "app/js/iatu-media.js", "app/js/iatu-inter.js",
           "app/js/iatu-practica.js", "app/js/iatu-eval.js", "app/js/iatu-app.js"]
EXT_PUBLICAS = {".js", ".css", ".svg", ".txt", ".mp3", ".vtt", ".webp", ".mp4", ".docx", ".xlsx", ".csv", ".html"}
EXCLUIR = re.compile(r"(registro_audio\.json|adaptacion_oral\.json|qa_asr\.json|reporte_webp\.json|registro_video\.json|/muestras/)")

def titulo_sco(sco, mods):
    if sco == "orientacion": return "Orientación y diagnóstico"
    if sco == "evaluacion": return "Evaluación, proyecto y transferencia"
    n = int(sco[1:]); return f"Módulo {n} · {mods[n - 1]['title']}"

def pagina_sco(sco):
    pre = "" if sco in ("orientacion", "evaluacion") else f'\n<script src="data/{sco}.js"></script>'
    scripts = "\n".join(f'<script src="{s}"></script>' for s in SCRIPTS)
    return f"""<!doctype html>
<html lang="es-CL">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(sco)} · IA para trabajar mejor</title>
<link rel="stylesheet" href="app/css/iatu.css">
<link rel="icon" href="app/icons/favicon.svg" type="image/svg+xml">
</head>
<body>
<noscript>Este curso requiere JavaScript habilitado.</noscript>
<script>window.IATU_SCO = "{sco}";</script>
<script src="config.js"></script>
<script src="data/curso.js"></script>{pre}
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

def manifest_2004(scos, mods, files):
    org_items, res = [], []
    for sco in scos:
        ident = "ITEM-" + sco.upper()
        if sco == "evaluacion":
            objs = "".join(
                f'<imsss:objective objectiveID="obj-{s}"><imsss:mapInfo targetObjectiveID="obj-{s}" readSatisfiedStatus="true" writeSatisfiedStatus="false"/></imsss:objective>'
                for s in scos if s != "evaluacion")
            conds = "".join(f'<imsss:ruleCondition referencedObjective="obj-{s}" operator="not" condition="satisfied"/>' for s in scos if s != "evaluacion")
            seq = (f'<imsss:sequencing><imsss:sequencingRules><imsss:preConditionRule><imsss:ruleConditions conditionCombination="any">{conds}'
                   f'</imsss:ruleConditions><imsss:ruleAction action="disabled"/></imsss:preConditionRule></imsss:sequencingRules>'
                   f'<imsss:objectives><imsss:primaryObjective objectiveID="obj-evaluacion" satisfiedByMeasure="false"/>{objs}</imsss:objectives>'
                   f'<imsss:deliveryControls completionSetByContent="true" objectiveSetByContent="true"/></imsss:sequencing>')
        else:
            seq = (f'<imsss:sequencing><imsss:objectives><imsss:primaryObjective objectiveID="obj-{sco}" satisfiedByMeasure="false">'
                   f'<imsss:mapInfo targetObjectiveID="obj-{sco}" readSatisfiedStatus="false" writeSatisfiedStatus="true"/></imsss:primaryObjective>'
                   f'</imsss:objectives><imsss:deliveryControls completionSetByContent="true" objectiveSetByContent="true"/></imsss:sequencing>')
        org_items.append(f'<item identifier="{ident}" identifierref="RES-{sco.upper()}"><title>{escape(titulo_sco(sco, mods))}</title>'
                         f'<adlcp:completionThreshold completedByMeasure="false"/>{seq}</item>')
        res.append(f'<resource identifier="RES-{sco.upper()}" type="webcontent" adlcp:scormType="sco" href="sco_{sco}.html">'
                   f'<file href="sco_{sco}.html"/><dependency identifierref="RES-COMUN"/></resource>')
    comun = "".join(f'<file href="{escape(f)}"/>' for f in ["config.js"] + files)
    res.append(f'<resource identifier="RES-COMUN" type="webcontent" adlcp:scormType="asset">{comun}</resource>')
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
<organizations default="ORG-IATU"><organization identifier="ORG-IATU" adlseq:objectivesGlobalToSystem="false">
<title>{escape(TITULO)}</title>
{chr(10).join(org_items)}
<imsss:sequencing><imsss:controlMode choice="true" flow="true"/></imsss:sequencing>
</organization></organizations>
<resources>
{chr(10).join(res)}
</resources>
</manifest>
"""

def manifest_12(scos, mods, files):
    items, res = [], []
    pre = "&amp;".join("ITEM-" + s.upper() for s in scos if s != "evaluacion")
    for sco in scos:
        p = f"<adlcp:prerequisites type=\"aicc_script\">{pre}</adlcp:prerequisites>" if sco == "evaluacion" else ""
        items.append(f'<item identifier="ITEM-{sco.upper()}" identifierref="RES-{sco.upper()}"><title>{escape(titulo_sco(sco, mods))}</title>{p}</item>')
        res.append(f'<resource identifier="RES-{sco.upper()}" type="webcontent" adlcp:scormtype="sco" href="sco_{sco}.html"><file href="sco_{sco}.html"/><dependency identifierref="RES-COMUN"/></resource>')
    comun = "".join(f'<file href="{escape(f)}"/>' for f in ["config.js"] + files)
    res.append(f'<resource identifier="RES-COMUN" type="webcontent" adlcp:scormtype="asset">{comun}</resource>')
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="IATU-C05-{VERSION}-12" version="1.1"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
<metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
<organizations default="ORG-IATU"><organization identifier="ORG-IATU"><title>{escape(TITULO)}</title>
{chr(10).join(items)}
</organization></organizations>
<resources>
{chr(10).join(res)}
</resources>
</manifest>
"""

def construir(dest, edicion, scos, mods, files, servicio_url):
    if os.path.exists(dest): shutil.rmtree(dest)
    os.makedirs(dest)
    for f in files:
        os.makedirs(os.path.dirname(os.path.join(dest, f)), exist_ok=True)
        shutil.copy2(os.path.join(CURSO, f), os.path.join(dest, f))
    with open(os.path.join(dest, "config.js"), "w", encoding="utf-8") as fh:
        fh.write("/* Configuración de integración (editar en Dibork Learning; sin secretos). Ver docs/INTEGRACION_DIBORK.md */\n"
                 "window.IATU_CONFIG = window.IATU_CONFIG || { base: \"\", servicio: { url: " + json.dumps(servicio_url) +
                 ", token: (window.parent && window.parent.DIBORK_IATU_TOKEN) ? function () { return window.parent.DIBORK_IATU_TOKEN(); } : null }, banner: \"\" };\n")
    for sco in scos:
        with open(os.path.join(dest, f"sco_{sco}.html"), "w", encoding="utf-8") as fh: fh.write(pagina_sco(sco))
    man = manifest_2004(scos, mods, files) if edicion == "2004" else manifest_12(scos, mods, files)
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
            if re.search(r"key_justification|\"is_key\"|anchors|update_model", txt) and not f.endswith("iatu-eval.js"):
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
    ap.add_argument("--servicio-url", default="")
    a = ap.parse_args()
    datos = open(os.path.join(CURSO, "data", "curso.js"), encoding="utf-8").read()
    C = json.loads(datos[datos.index("=", datos.index("[\"curso\"]")) + 1:].rstrip().rstrip(";"))
    scos, mods = C["scos"], C["modules"]
    files = archivos_publicos()
    informe = {"version": VERSION, "sco": len(scos)}
    for ed, nombre in (("2004", "IATU_C05_SCORM2004_4ed_v" + VERSION), ("12", "IATU_C05_SCORM12_v" + VERSION)):
        dest = os.path.join(a.salida, nombre)
        construir(dest, ed, scos, mods, files, a.servicio_url)
        chk = comprobar(dest)
        z = zipear(dest, dest + ".zip")
        informe["scorm" + ed] = {**chk, **z}
        print(nombre, json.dumps({k: v for k, v in chk.items()}, ensure_ascii=False), z["bytes"] // 1024, "KiB")
    json.dump(informe, open(os.path.join(a.salida, "informe_empaquetado.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()
