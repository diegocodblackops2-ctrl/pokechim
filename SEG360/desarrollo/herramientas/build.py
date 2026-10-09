#!/usr/bin/env python3
"""Seguridad 360 · build.

Lee la fuente de autoría (SEG360/autoria/fuente, programa y fuentes) y genera el sitio del curso en
SEG360/desarrollo/curso:
  data/curso.js            resumen del programa, rutas, módulos (sin pantallas), personajes, recursos, fuentes, glosario,
                           orientación, metadatos de casos, videos y la parte pública de la evaluación.
  data/<módulo>.js         un archivo por módulo (carga diferida), sin prompts de imágenes.
  data/caso-<id>.js        un archivo por caso ramificado.
  data/eval-<RUTA>.js      diagnóstico + banco PORTÁTIL (formas A y B) + tarea aplicada (parte pública), ofuscados.
                           Nunca el banco privado de producción ni las anclas o la pauta docente. No se versiona.
  data/medios.js           manifiesto de imágenes, audio, música y efectos presentes.
  app/s360.js, app/s360.css  paquetes unidos (minificados con esbuild si está disponible).
  app/s-iconos.js          sprite con los íconos Lucide que el curso usa.
Uso: python3 SEG360/desarrollo/herramientas/build.py [--sin-minificar]
"""
import base64, glob, io, json, os, re, shutil, subprocess, sys, tarfile

AQUI = os.path.dirname(os.path.abspath(__file__))
SEG = os.path.abspath(os.path.join(AQUI, "..", ".."))
SRC = os.path.join(SEG, "autoria", "fuente")
PRIV = os.path.join(SEG, "docente_privado", "fuente")
OUT = os.path.join(SEG, "desarrollo", "curso")
DATA = os.path.join(OUT, "data")
VERSION = "1.0.0"
JS_ORDEN = ["s-util.js", "s-store.js", "s-media.js", "s-app.js", "s-pantallas.js", "s-actividades.js", "s-3d-kit.js", "s-3d.js",
            "s-escritorio.js", "s-caso.js", "s-video.js", "s-eval.js"]
CSS_ORDEN = ["s-tokens.css", "s-base.css", "s-vistas.css", "s-actividades.css", "s-inmersivo.css", "s-hud.css"]

PROHIBIDAS = [r"\bSCORM\b", r"\bLMS\b", r"\bSCO\b", r"sint[eé]tic", r"generad[ao]s? (con|por) IA", r"placeholder", r"storyboard", r"\bTODO\b", r"\[S\d\]", r"4C/ID"]


def leer(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def js(nombre, obj):
    return "/* Generado por herramientas/build.py — no editar a mano */\nwindow.S360_DATA=window.S360_DATA||{};window.S360_DATA[%s]=%s;\n" % (
        json.dumps(nombre), json.dumps(obj, ensure_ascii=False, separators=(",", ":")))


def escribir(ruta, texto):
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    with open(ruta, "w", encoding="utf-8") as f:
        f.write(texto)


def seed31(s):
    x = 0x811c9dc5
    for ch in s:
        x ^= ord(ch)
        x = (x * 0x01000193) & 0xffffffff
    return x & 0x7fffffff


def ofuscar(obj, etiqueta):
    data = json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    x = seed31(etiqueta)
    out = bytearray(len(data))
    for i, b in enumerate(data):
        x = ((x * 1103515245) + 12345) & 0x7fffffff
        out[i] = b ^ ((x >> 16) & 0xff)
    return base64.b64encode(bytes(out)).decode("ascii")


REQ = {"decision", "quiz", "clasificar", "ordenar", "matriz", "mito_realidad", "bandeja", "permisos", "ficha", "inspeccion",
       "construir", "escritorio", "caso", "reflexion", "checklist"}


def requiere(s):
    t = s.get("tipo")
    if t in REQ:
        return True
    if t == "escena3d" and s.get("modo") == "detectar":
        return True
    if t in ("chat", "dialogo", "modelo3d") and s.get("opciones"):
        return True
    return False


def main():
    minificar = "--sin-minificar" not in sys.argv
    prog = leer(os.path.join(SEG, "programa", "Programa_y_objetivos.json"))
    fuentes = leer(os.path.join(SEG, "fuentes", "Fuentes_y_revision.json"))["fuentes"]
    ori = leer(os.path.join(SRC, "orientacion.json"))["pantallas"]
    cat_img = {c["id"]: c for c in leer(os.path.join(SEG, "diseno", "Catalogo_imagenes.json"))}
    os.makedirs(DATA, exist_ok=True)
    for f in glob.glob(os.path.join(DATA, "*.js")):
        os.remove(f)

    avisos = []
    personajes = {
        "patricia": {"nombre": "Patricia Soto", "rol": "prevencionista de riesgos", "color": "#0B7360"},
        "marisol": {"nombre": "Marisol Fuentes", "rol": "jefa de bodega", "color": "#A64B00"},
        "camila": {"nombre": "Camila Vergara", "rol": "auxiliar de bodega", "color": "#c77d00"},
        "rodrigo": {"nombre": "Rodrigo Muñoz", "rol": "gerente de operaciones", "color": "#22558a"},
        "daniela": {"nombre": "Daniela Rojas", "rol": "encargada del local de atención", "color": "#6240C5"},
        "javier": {"nombre": "Javier Contreras", "rol": "administración y finanzas", "color": "#3d5566"},
        "nacho": {"nombre": "Ignacio «Nacho» Pérez", "rol": "soporte TI", "color": "#087E8B"},
        "hector": {"nombre": "Héctor Paredes", "rol": "mantención y aseo industrial", "color": "#5a4632"},
    }
    for pid, img in prog["personajes"].items():
        personajes[pid]["imagen"] = img

    # ---------- medios presentes ----------
    medios = {"images": {}, "audio": {}, "music": [], "sfx": {}}
    imgdir = os.path.join(OUT, "media", "images")
    for f in sorted(glob.glob(os.path.join(imgdir, "seg360-*.webp"))):
        b = os.path.basename(f)
        if b.endswith("--sm.webp"):
            continue
        m = re.match(r"seg360-(img|per)(\d+)", b)
        if not m:
            continue
        iid = "SEG360-%s%s" % (m.group(1).upper(), m.group(2))
        info = {"file": b, "alt": cat_img.get(iid, {}).get("alt", "")}
        sm = b.replace(".webp", "--sm.webp")
        if os.path.exists(os.path.join(imgdir, sm)):
            info["sm"] = sm
        try:
            from PIL import Image
            with Image.open(f) as im:
                info["w"], info["h"] = im.size
        except Exception:
            pass
        medios["images"][iid] = info
    reg_audio = os.path.join(OUT, "media", "audio", "registro_audio.json")
    if os.path.exists(reg_audio):
        for aid, a in leer(reg_audio).get("pistas", {}).items():
            if os.path.exists(os.path.join(OUT, "media", "audio", a["file"])):
                medios["audio"][aid] = {"file": a["file"], "dur": a.get("dur", 0), "vtt": os.path.exists(os.path.join(OUT, "media", "audio", aid + ".vtt"))}
    mus = os.path.join(OUT, "media", "music", "musica.json")
    if os.path.exists(mus):
        medios["music"] = [t for t in leer(mus) if os.path.exists(os.path.join(OUT, "media", "music", t["file"]))]
    for f in sorted(glob.glob(os.path.join(OUT, "media", "sfx", "*.mp3"))):
        medios["sfx"][os.path.basename(f)[:-4]] = os.path.basename(f)
    escribir(os.path.join(DATA, "medios.js"), "/* Generado por herramientas/build.py */\nwindow.S360_MEDIA=%s;\n" % json.dumps(medios, ensure_ascii=False, separators=(",", ":")))

    # ---------- casos y videos ----------
    casos_meta, casos = {}, {}
    for f in sorted(glob.glob(os.path.join(SRC, "casos", "*.json"))):
        c = leer(f)
        casos[c["id"]] = c
    videos = {}
    for f in sorted(glob.glob(os.path.join(SRC, "videos", "*.json"))):
        v = leer(f)
        videos[v["id"]] = {k: v[k] for k in ("id", "titulo", "modulo", "escenas", "descripcion_accesible") if k in v}

    # ---------- módulos ----------
    rutas, glosario, totales_min = [], [], 0
    texto_publico = []
    for r in prog["rutas"]:
        R = {"id": r["id"], "codigo": r["codigo"], "titulo": r["titulo"], "color": r["color"], "certificado": r["certificado"],
             "resultado": r["resultado"], "imagen": {"SST": "SEG360-IMG003", "CIBER": "SEG360-IMG004", "EPP": "SEG360-IMG005"}[r["codigo"]],
             "bajada": {"SST": "Mira tu lugar de trabajo como lo mira una prevencionista: peligros, controles y cómo avisar a tiempo.",
                        "CIBER": "Reconoce engaños bien hechos, protege tus accesos y sabe qué hacer en los primeros minutos de un incidente.",
                        "EPP": "Cuándo tiene sentido un EPP, cómo elegirlo, revisarlo y combinarlo, y qué hacer cuando falla."}[r["codigo"]],
             "modulos": []}
        horas_ruta = 0
        for i, mp in enumerate(r["modulos"], 1):
            p = os.path.join(SRC, "modulos", mp["id"] + ".json")
            if not os.path.exists(p):
                avisos.append("falta módulo " + mp["id"])
                continue
            m = leer(p)
            pub = {k: v for k, v in m.items() if k not in ("imagenes", "minutos_desglose")}
            pantallas, unidades, tipos = [], [], set()
            intro = dict(m["intro"]); intro.setdefault("id", mp["id"] + "-INTRO")
            cierre = dict(m["cierre"]); cierre.setdefault("id", mp["id"] + "-CIERRE")
            pub["intro"], pub["cierre"] = intro, cierre
            unidades.append({"id": "INTRO", "rotulo": "Inicio", "titulo": "Presentación", "icono": "flag", "minutos": 5, "primera": intro["id"]})
            pantallas.append({"id": intro["id"], "u": "INTRO", "tipo": "intro"})
            for k, l in enumerate(m["lecciones"], 1):
                uid = "L%02d" % k
                unidades.append({"id": uid, "rotulo": "Lección %d" % k, "titulo": l["titulo"], "icono": "book-open", "minutos": l.get("minutos"), "primera": l["pantallas"][0]["id"]})
                for s in l["pantallas"]:
                    tipos.add(s["tipo"])
                    pantallas.append({"id": s["id"], "u": uid, "tipo": s["tipo"], "req": 1 if requiere(s) else 0, **({"caso": s["caso_id"]} if s["tipo"] == "caso" else {})})
            lab = m["laboratorio"]
            es_caso = any(s["tipo"] == "caso" for s in lab["pantallas"])
            unidades.append({"id": "LAB", "rotulo": "Caso" if es_caso else "Laboratorio", "titulo": re.sub(r"^(Laboratorio|Caso):\s*", "", lab["titulo"]), "icono": "git-branch" if es_caso else "flask-conical", "minutos": lab.get("minutos"), "primera": lab["pantallas"][0]["id"]})
            for s in lab["pantallas"]:
                tipos.add(s["tipo"])
                pantallas.append({"id": s["id"], "u": "LAB", "tipo": s["tipo"], "req": 1 if requiere(s) else 0, **({"caso": s["caso_id"]} if s["tipo"] == "caso" else {})})
                if s["tipo"] == "caso" and s.get("caso_id") in casos:
                    casos_meta[s["caso_id"]] = {"pantalla": s["id"], "modulo": mp["id"]}
            unidades.append({"id": "CIERRE", "rotulo": "Cierre", "titulo": "Lo que te llevas", "icono": "flag-triangle-right", "minutos": 5, "primera": cierre["id"]})
            pantallas.append({"id": cierre["id"], "u": "CIERRE", "tipo": "cierre"})
            etiquetas = []
            if "escena3d" in tipos: etiquetas.append({"icono": "rotate-3d", "texto": "Escena 3D"})
            if "modelo3d" in tipos: etiquetas.append({"icono": "box", "texto": "Modelo 3D"})
            if "escritorio" in tipos: etiquetas.append({"icono": "monitor", "texto": "Simulación"})
            if "caso" in tipos: etiquetas.append({"icono": "git-branch", "texto": "Caso"})
            if "video" in tipos: etiquetas.append({"icono": "clapperboard", "texto": "Video"})
            fuentes_mod = list(dict.fromkeys((m.get("fuentes") or []) + [f for l in m["lecciones"] for f in l.get("fuentes", [])] + lab.get("fuentes", [])))
            fuentes_mod = [f for f in fuentes_mod if f in fuentes]
            horas = m.get("horas") or 3.0
            horas_ruta += horas
            archivo = mp["id"].replace("SEG360-", "").lower() + ".js"
            R["modulos"].append({"id": mp["id"], "numero": i, "titulo": m["titulo"], "subtitulo": m.get("subtitulo", ""), "resultado": m.get("resultado") or mp["resultado"],
                                 "horas": horas, "imagen": intro.get("imagen") or (mp["imagenes"] or [None])[0], "archivo": archivo, "etiquetas": etiquetas,
                                 "unidades": unidades, "pantallas": pantallas, "recursos": m.get("recursos", []), "fuentes": fuentes_mod})
            for g in m.get("glosario", []):
                glosario.append({"termino": g["termino"], "definicion": g["definicion"], "ruta": r["codigo"]})
            escribir(os.path.join(DATA, archivo), js(mp["id"], pub))
            texto_publico.append(json.dumps(pub, ensure_ascii=False))
        R["horas"] = round(horas_ruta + 1.5)
        totales_min += R["horas"]
        rutas.append(R)

    for cid, c in casos.items():
        pub = {k: v for k, v in c.items() if k not in ("imagenes", "regla_final")}
        archivo = "caso-" + cid.replace("SEG360-CASO-", "").lower() + ".js"
        escribir(os.path.join(DATA, archivo), js(cid, pub))
        texto_publico.append(json.dumps(pub, ensure_ascii=False))
        meta = casos_meta.get(cid, {})
        meta.update({"archivo": archivo, "titulo": c["titulo"], "subtitulo": c.get("subtitulo", ""), "ruta": c["ruta"], "duracion_min": c.get("duracion_min", 20),
                     "decisiones": max(6, len(c.get("nodos", [])) - 2), "imagen": (c.get("presentacion") or {}).get("imagen")})
        casos_meta[cid] = meta

    # ---------- glosario sin duplicados ----------
    vistos, glos = set(), []
    for g in sorted(glosario, key=lambda x: x["termino"].lower()):
        k = (g["termino"].lower(), g["ruta"])
        if k in vistos:
            continue
        vistos.add(k); glos.append(g)

    # ---------- evaluación ----------
    evaluaciones = {}
    for r in rutas:
        cod = r["codigo"]
        p = os.path.join(PRIV, "EVAL-%s.json" % cod)
        if not os.path.exists(p):
            avisos.append("falta evaluación " + cod)
            continue
        ev = leer(p)
        t = ev["tarea_aplicada"]
        tarea_pub = {"id": t["id"], "titulo": t["titulo"], "resultado": t.get("resultado", ""), "instrucciones": t["instrucciones"],
                     "condiciones_criticas": t.get("condiciones_criticas", []), "calculo": t.get("calculo", ""),
                     "rubrica": [{k: c[k] for k in ("id", "criterio", "peso", "esencial", "niveles")} for c in t["rubrica"]],
                     "variantes": {k: {"titulo": v["titulo"], "contexto": v["contexto"], "expediente": v["expediente"], "producto": v["producto"]} for k, v in t["variantes"].items()}}
        limpiar = lambda it: {k: v for k, v in it.items() if k not in ("justificacion_docente",)}
        portable = {"diagnostico": [limpiar(i) for i in ev["diagnostico"]], "portable": {f: [limpiar(i) for i in ev["banco_portable"][f]] for f in ("A", "B")}, "tarea": tarea_pub}
        etiqueta = "SEG360-%s-%s" % (cod, VERSION)
        escribir(os.path.join(DATA, "eval-%s.js" % cod), "/* Generado por herramientas/build.py — material de evaluación ofuscado (no es seguridad) */\nwindow.S360_DATA=window.S360_DATA||{};window.S360_DATA[%s]={z:%s};\n" % (json.dumps("eval-" + cod), json.dumps(ofuscar(portable, etiqueta))))
        evaluaciones[cod] = {"archivo": "eval-%s.js" % cod, "rubrica": tarea_pub["rubrica"]}

    # ---------- recursos ----------
    recursos = {}
    rec_dir = os.path.join(OUT, "descargas")
    rec_meta = os.path.join(SEG, "participante", "recursos.json")
    if os.path.exists(rec_meta):
        for rid, rr in leer(rec_meta).items():
            if os.path.exists(os.path.join(rec_dir, rr["archivo"])):
                recursos[rid] = rr
    if not recursos:
        avisos.append("sin recursos descargables en curso/descargas")

    curso = {
        "id": "SEG360", "version": VERSION, "titulo": prog["titulo"], "titulo_corto": prog["titulo_corto"], "institucion": prog["institucion"],
        "subtitulo": "Prevención, ciberseguridad y protección personal para el trabajo de todos los días. Tres rutas, tres certificados.",
        "portada": "SEG360-IMG001", "rutas": rutas, "personajes": personajes, "recursos": recursos,
        "fuentes": {k: {"cita": v["cita"]} for k, v in fuentes.items()}, "glosario": glos, "orientacion": ori,
        "casos": casos_meta, "videos": videos, "evaluaciones": evaluaciones,
        "totales": {"modulos": sum(len(r["modulos"]) for r in rutas), "horas": totales_min}
    }
    escribir(os.path.join(DATA, "curso.js"), js("curso", curso))
    texto_publico.append(json.dumps(ori, ensure_ascii=False))

    # ---------- control de palabras internas en el texto público ----------
    blob = "\n".join(texto_publico)
    for pat in PROHIBIDAS:
        for mm in re.finditer(pat, blob):
            avisos.append("palabra interna «%s» en contenido público: …%s…" % (mm.group(0), blob[max(0, mm.start() - 50):mm.end() + 50].replace("\n", " ")))

    # ---------- íconos ----------
    iconos(blob)

    # ---------- paquetes JS y CSS ----------
    jsdir, cssdir = os.path.join(OUT, "app", "js"), os.path.join(OUT, "app", "css")
    js_all = "\n;\n".join(open(os.path.join(jsdir, f), encoding="utf-8").read() for f in JS_ORDEN)
    css_all = "\n".join(open(os.path.join(cssdir, f), encoding="utf-8").read().replace("../fonts/", "fonts/") for f in CSS_ORDEN)
    escribir(os.path.join(OUT, "app", "s360.js"), js_all)
    escribir(os.path.join(OUT, "app", "s360.css"), css_all)
    if minificar:
        esb = buscar_esbuild()
        if esb:
            for f in ("s360.js", "s360.css"):
                p = os.path.join(OUT, "app", f)
                r = subprocess.run([esb, p, "--minify", "--allow-overwrite", "--outfile=" + p] + (["--target=es2017"] if f.endswith(".js") else []), capture_output=True, text=True)
                if r.returncode:
                    avisos.append("esbuild falló en %s: %s" % (f, r.stderr[:300]))
        else:
            avisos.append("esbuild no disponible: paquetes sin minificar")

    print(json.dumps({"rutas": len(rutas), "modulos": curso["totales"]["modulos"], "pantallas": sum(len(m["pantallas"]) for r in rutas for m in r["modulos"]),
                      "casos": len(casos), "videos": len(videos), "imagenes": len(medios["images"]), "audio": len(medios["audio"]),
                      "evaluaciones": list(evaluaciones), "avisos": avisos[:40], "n_avisos": len(avisos)}, ensure_ascii=False, indent=1))


def buscar_esbuild():
    cands = [os.environ.get("ESBUILD", ""), shutil.which("esbuild") or ""]
    cands += glob.glob("/tmp/claude-0/*/*/scratchpad/deps/node_modules/.bin/esbuild")
    cands += glob.glob(os.path.join(SEG, "desarrollo", "node_modules", ".bin", "esbuild"))
    for c in cands:
        if c and os.path.exists(c):
            return c
    return None


def iconos(blob):
    tgz = os.path.join(SEG, "desarrollo", "vendor_fuente", "lucide-icons.tgz")
    usados = set(re.findall(r'"([a-z][a-z0-9]*(?:-[a-z0-9]+)*)"', blob))
    for f in glob.glob(os.path.join(OUT, "app", "js", "*.js")):
        usados |= set(re.findall(r'"([a-z][a-z0-9]*(?:-[a-z0-9]+)*)"', open(f, encoding="utf-8").read()))
    simbolos = []
    alias = {"fire-extinguisher": "flame-kindling", "forklift": "truck", "home": "house", "mail-search": "mail-question", "ladder": "rows-3",
             "clipboard-pen": "clipboard-pen-line", "octagon-alert": "octagon-alert", "circle-dot": "circle-dot"}
    with tarfile.open(tgz) as tf:
        nombres = {os.path.basename(m.name)[:-4]: m for m in tf.getmembers() if m.name.endswith(".svg")}
        necesarios = {u for u in usados if u in nombres}
        for a, b in alias.items():
            if a in usados and a not in nombres and b in nombres:
                necesarios.add(b)
        necesarios.add("circle-dot")
        for n in sorted(necesarios):
            svg = tf.extractfile(nombres[n]).read().decode("utf-8")
            inner = re.search(r"<svg[^>]*>(.*)</svg>", svg, re.S).group(1)
            inner = re.sub(r"\s+", " ", inner).strip()
            simbolos.append('<symbol id="i-%s" viewBox="0 0 24 24">%s</symbol>' % (n, inner))
    alias_js = {a: b for a, b in alias.items() if a in usados and a not in nombres}
    sprite = '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">%s</svg>' % "".join(simbolos)
    code = "/* Íconos Lucide (ISC) usados por el curso — generado por herramientas/build.py */\n(function(){var d=document.createElement('div');d.innerHTML=%s;document.addEventListener('DOMContentLoaded',function(){document.body.insertBefore(d.firstChild,document.body.firstChild);});window.S360=window.S360||{};window.S360_ICON_ALIAS=%s;})();\n" % (json.dumps(sprite), json.dumps(alias_js))
    escribir(os.path.join(OUT, "app", "s-iconos.js"), code)


if __name__ == "__main__":
    main()
