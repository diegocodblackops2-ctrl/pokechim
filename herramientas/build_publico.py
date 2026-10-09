#!/usr/bin/env python3
"""Compila los datos PÚBLICOS del Curso 5 (IA para trabajar mejor) desde el paquete de autoría v3.

Separa lo que viaja al navegador del participante de lo que nunca debe salir del servicio privado:

* Público (curso/data/*.js): orientación, diagnóstico formativo, módulos, 256 pantallas, actividades
  formativas con su devolución, tarjetas, hotspots, talleres, casos, biblioteca, rúbrica pública,
  índices de audio/imagen/video. Las claves FORMATIVAS son públicas por diseño del curso
  ("claves y rúbrica publicadas", maestro v3 · pedagogy.alignment.criteria).
* Privado (servicio-correccion/data/, ignorado por git): banco A/B de 128 unidades con claves,
  proyectos A/B con modelo, anclas y actualización resuelta. Solo lo lee el servicio de corrección.

Uso:
    python3 herramientas/build_publico.py --fuente autoria_privada/CURSO_05_IA_ULTRA_CLAUDE_v3

El script falla si detecta en la salida pública un campo de clave del banco o un modelo de proyecto.
"""
import argparse
import base64
import hashlib
import json
import os
import re
import sys

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CONTENT_VERSION = "3.0.0"


def cargar(ruta):
    with open(ruta, encoding="utf-8") as f:
        return json.load(f)


def js_registro(nombre, datos):
    cuerpo = json.dumps(datos, ensure_ascii=False, separators=(",", ":"))
    return "/* Generado por herramientas/build_publico.py — no editar a mano */\n" \
           "window.IATU_DATA=window.IATU_DATA||{};window.IATU_DATA[%s]=%s;\n" % (json.dumps(nombre), cuerpo)


def escribir(ruta, texto):
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    with open(ruta, "w", encoding="utf-8") as f:
        f.write(texto)


def ofuscar(obj, etiqueta):
    """Ofusca (no cifra) un objeto para el paquete SCORM: XOR con un generador congruencial sembrado por la etiqueta.
    Evita que las claves se lean a simple vista en el código; NO es seguridad: cualquiera con el paquete puede revertirlo.
    El cliente lo revierte con IATU.u.desofuscar (misma fórmula, Math.imul)."""
    data = json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    x = 0x811C9DC5  # FNV-1a 32 bits sobre la etiqueta (ASCII), recortado a 31 bits
    for ch in etiqueta.encode("ascii"):
        x = ((x ^ ch) * 0x01000193) & 0xFFFFFFFF
    x &= 0x7FFFFFFF
    out = bytearray()
    for b in data:
        x = (x * 1103515245 + 12345) & 0x7FFFFFFF
        out.append(b ^ ((x >> 16) & 0xFF))
    return base64.b64encode(bytes(out)).decode("ascii")

def musica():
    """Pistas de música de fondo (opcionales): curso/media/music/*.mp3 en orden alfabético."""
    d = os.path.join(RAIZ, "curso", "media", "music")
    if not os.path.isdir(d): return []
    return [{"file": "media/music/" + f, "title": os.path.splitext(f)[0]} for f in sorted(os.listdir(d)) if f.lower().endswith(".mp3")]

def existe_media(rel):
    return os.path.isfile(os.path.join(RAIZ, "curso", rel))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fuente", default=os.path.join(RAIZ, "autoria_privada", "CURSO_05_IA_ULTRA_CLAUDE_v3"))
    ap.add_argument("--privado", default=os.path.join(RAIZ, "servicio-correccion", "data"))
    args = ap.parse_args()
    F = args.fuente

    c = cargar(os.path.join(F, "01_CONTENIDO", "IATU_Contenido_completo_v3.json"))
    ia = cargar(os.path.join(F, "03_INTERACTIVIDAD", "IATU_Interacciones_v3.json"))
    loc = cargar(os.path.join(F, "05_AUDIO_VIDEO", "IATU_Locuciones_master.json"))
    mm = cargar(os.path.join(F, "05_AUDIO_VIDEO", "IATU_Guion_multimedia_v3.json"))
    cat = cargar(os.path.join(F, "06_IMAGENES", "IATU_Catalogo_imagenes.json"))
    icon = cargar(os.path.join(F, "06_IMAGENES", "IATU_Iconografia.json"))
    banco = cargar(os.path.join(F, "04_EVALUACION_PRIVADA", "IATU_Banco_evaluacion_v3.json"))
    proy_sol = cargar(os.path.join(F, "04_EVALUACION_PRIVADA", "IATU_Proyectos_AB_soluciones.json"))

    # ---------- medios: índices con disponibilidad REAL en disco ----------
    medidas = {}
    reg_audio = os.path.join(RAIZ, "curso", "media", "audio", "registro_audio.json")
    if os.path.isfile(reg_audio):
        for r in cargar(reg_audio).get("pistas", []):
            medidas[r["id"]] = r
    audio = {}
    for r in loc["records"]:
        rel = "media/audio/" + r["filename"]
        vtt = rel[:-4] + ".vtt"
        ok = existe_media(rel)
        audio[r["id"]] = {
            "file": rel if ok else None,
            "vtt": vtt if ok and existe_media(vtt) else None,
            "kind": r["kind"],
            "est": r["estimated_seconds"],
            "dur": medidas.get(r["id"], {}).get("measured_seconds"),
            "status": medidas.get(r["id"], {}).get("estado", "guion"),
            # La transcripción de una pantalla es su texto visible (se muestra en la propia pantalla);
            # solo se incluye texto aparte para introducciones, cierres, orientación y escenas.
            "text": None if r["kind"] == "pantalla" else r["transcript_text"],
        }

    personas = cargar(os.path.join(RAIZ, "herramientas", "imagenes_personas_v3_1.json"))["cambios"]
    imagenes = {}
    for a in cat["assets"]:
        rel = a["path_expected"]
        rel_sm = a["mobile_path_expected"]
        ok = existe_media(rel)
        imagenes[a["id"]] = {
            "file": rel if ok else None,
            "sm": rel_sm if ok and existe_media(rel_sm) else None,
            "w": a["width"], "h": a["height"], "ratio": a["aspect_ratio"],
            "role": a["role"], "alt": personas[a["id"]]["alt"] if a["id"] in personas else a["alt_draft"], "title": a["title"],
            "people": a["id"] in personas or a["id"] in ("IATU-IMG025", "IATU-IMG059"),
            "screen": a["screen_id"],
        }

    videos = {}
    for v in mm["videos"]:
        df = v["delivery_files"]
        ok = existe_media(df["video"])
        videos[v["id"]] = {
            "id": v["id"], "module": v["module"], "title": v["title"], "screen_id": v["screen_id"],
            "file": df["video"] if ok else None,
            "vtt": df["captions"] if ok and existe_media(df["captions"]) else None,
            "poster": (df["video"][:-4] + "-poster.webp") if ok and existe_media(df["video"][:-4] + "-poster.webp") else None,
            "before": v["before_watch"], "after": v["after_watch"],
            "scenes": [{"id": s["id"], "narration": s["narration"], "visible_text": s["visible_text"],
                        "description": s["description"]} for s in v["scenes"]],
            "source_ids": v["source_ids"],
        }

    # ---------- interacciones por pantalla ----------
    act_por_pantalla = {a["screen_id"]: a for a in ia["activities"]}
    fc_por_pantalla, hs_por_pantalla = {}, {}
    for f in ia["flipcards"]:
        fc_por_pantalla.setdefault(f["screen_id"], []).append(f)
    for h in ia["hotspots"]:
        hs_por_pantalla.setdefault(h["screen_id"], []).append(h)
    vid_por_pantalla = {v["screen_id"]: v["id"] for v in mm["videos"]}

    def limpiar_act(a):
        b = {k: v for k, v in a.items() if k not in ("state_fields", "save", "voice", "keyboard", "classification")}
        return b

    # ---------- módulos ----------
    lecciones_por_mod = {}
    for l in c["lessons"]:
        lecciones_por_mod.setdefault(l["module"], []).append(l)
    talleres_por_mod = {}
    for w in c["workshops"]:
        talleres_por_mod.setdefault(w["module"], []).append(w)
    casos_por_mod = {}
    for cs in c["cases"]:
        casos_por_mod.setdefault(cs["module"], []).append(cs)

    resumen_mod = []
    for m in c["modules"]:
        n = m["number"]
        mid = "m%02d" % n
        lecciones = []
        req = []
        for l in sorted(lecciones_por_mod[n], key=lambda x: x["number"]):
            pantallas = []
            for s in l["screens"]:
                pm = s["production_map"]
                p = {
                    "id": s["id"], "kind": s["kind"], "title": s["title"],
                    "text": s["visible_text"], "itype": pm["interaction_type"],
                    "source_ids": s["source_ids"], "objective": s["objective"],
                    "image_ids": pm["image_ids"], "audio_id": pm["audio_id"],
                    "video_id": vid_por_pantalla.get(s["id"]) or pm["video_id"] or None,
                    "mandatory": pm["mandatory_practice"],
                }
                if s["id"] in act_por_pantalla:
                    p["activity"] = limpiar_act(act_por_pantalla[s["id"]])
                elif s["kind"] == "decision":
                    p["decision"] = {"options": s["options"], "key": s["key"], "feedback": s["feedback"],
                                     "action": s["action"], "reference": s["reference"]}
                if s["id"] in fc_por_pantalla:
                    p["flipcards"] = fc_por_pantalla[s["id"]]
                if s["id"] in hs_por_pantalla:
                    p["hotspots"] = hs_por_pantalla[s["id"]]
                pantallas.append(p)
                req.append({"type": "practice" if s["kind"] == "decision" else "screen", "id": s["id"]})
            lecciones.append({"id": l["id"], "number": l["number"], "title": l["title"], "minutes": l["minutes"],
                              "time_note": l["time_note"], "objective": l["objective"], "sources": l["sources"],
                              "screens": pantallas})
        talleres = sorted(talleres_por_mod.get(n, []), key=lambda w: w["id"])
        for w in talleres:
            req.append({"type": "workshop", "id": w["id"]})
        casos = casos_por_mod.get(n, [])
        for cs in casos:
            req.append({"type": "case", "id": cs["id"]})
        datos_mod = {
            "id": m["id"], "sco": mid, "number": n, "title": m["title"], "objective_id": m["objective_id"],
            "objective": m["objective"], "introduction": m["introduction"], "closure": m["closure"],
            "minutes": m["minutes"], "time_components": m["time_components"], "sources": m["sources"],
            "intro_audio": "IATU-M%02d-INTRO" % n, "closure_audio": "IATU-M%02d-CIERRE" % n,
            "lessons": lecciones, "workshops": talleres, "cases": casos, "required": req,
        }
        escribir(os.path.join(RAIZ, "curso", "data", mid + ".js"), js_registro(mid, datos_mod))
        resumen_mod.append({
            "id": m["id"], "sco": mid, "number": n, "title": m["title"], "objective": m["objective"],
            "minutes": m["minutes"], "lesson_titles": m["lesson_titles"],
            "lessons": [{"id": l["id"], "title": l["title"]} for l in lecciones],
            "workshops": [{"id": w["id"], "title": w["title"]} for w in talleres],
            "cases": [{"id": cs["id"], "title": cs["title"]} for cs in casos],
            "required_count": len(req),
        })

    # ---------- proyecto: brief PÚBLICO (sin modelo, anclas ni actualización resuelta) ----------
    def proyecto_publico(p):
        permitido = ["id", "form", "title", "role", "audience", "minutes", "purpose", "documents", "task",
                     "restrictions", "workplan", "public_criteria", "expected_evidence", "update",
                     "accepted", "critical_policy", "recovery", "correction"]
        return {k: p[k] for k in permitido if k in p}

    curso = {
        "id": c["id"], "version": c["version"], "content_version": CONTENT_VERSION, "date": c["date"],
        "title": c["title"], "publication": c["publication"],
        "orientation": c["orientation"], "diagnostic": c["diagnostic"],
        "modules": resumen_mod,
        "rubric": c["rubric"], "evaluation_rules": c["pedagogy"]["evaluation"],
        "honesty": c["pedagogy"]["honesty"], "scope": c["pedagogy"]["scope"],
        "pilot": c["pedagogy"]["pilot"], "accessibility": c["pedagogy"]["accessibility"],
        "required_progress": c["required_progress_v3"],
        "materials": c["materials"], "prompts": c["prompts"], "faults": c["faults"],
        "templates": c["templates"], "glossary": c["glossary"],
        "sources": c["sources"], "icons": icon,
        "audio": audio, "images": imagenes, "videos": videos, "music": musica(),
        "scos": ["orientacion"] + ["m%02d" % m["number"] for m in c["modules"]] + ["evaluacion"],
        "exam_public": {
            "forms": 2, "units_per_form": 64, "blocks": 4, "units_per_block": 16, "minutes": 180,
            "scoring_rule": {k: v for k, v in banco["scoring_rule"].items()},
            "feedback_policy": banco["feedback_policy"],
            "count_definition": banco["count_definition"],
        },
    }
    escribir(os.path.join(RAIZ, "curso", "data", "curso.js"), js_registro("curso", curso))

    # ---------- evaluación dentro del SCORM (decisión de Diego): banco A/B ofuscado + brief público del proyecto ----------
    # No incluye modelos, anclas ni soluciones de proyecto: esos quedan solo para la persona revisora.
    def unidad_cliente(u):
        return {"id": u["id"], "module": u["module"], "title": u["title"], "input": u["input"], "task": u["task"],
                "options": [{"id": o["id"], "text": o["text"], "why": o.get("rationale", "")} for o in u["options"]],
                "evidence": [{"id": o["id"], "text": o["text"], "why": o.get("rationale", "")} for o in u["evidence_options"]],
                "k": [u["key"]["decision"], u["key"]["evidence"]], "just": u.get("key_justification", ""),
                "next": (u.get("feedback") or {}).get("next_action", "")}
    por_id = {u["id"]: u for u in banco["units"]}
    eval_cliente = {"formas": {}, "regla": banco["scoring_rule"], "umbral": 80, "intentos": 2}
    for fid, f in banco["forms"].items():
        eval_cliente["formas"][fid] = ofuscar([unidad_cliente(por_id[i]) for i in f["unit_ids"]], "IATU-C05-" + fid)
    eval_cliente["proyectos"] = ofuscar({p["form"]: proyecto_publico(p) for p in c["projects"]}, "IATU-C05-PROY")
    escribir(os.path.join(RAIZ, "curso", "data", "eval.js"), js_registro("eval", eval_cliente))

    # ---------- privado: servicio de corrección ----------
    os.makedirs(args.privado, exist_ok=True)
    privado = {
        "generated_from": "IATU_Banco_evaluacion_v3.json + IATU_Contenido_completo_v3.json#projects",
        "content_version": CONTENT_VERSION,
        "bank": banco,
        "projects": {p["form"]: p for p in c["projects"]},
        "projects_public": {p["form"]: proyecto_publico(p) for p in c["projects"]},
        "project_solutions": proy_sol,
        "rubric": c["rubric"],
        "required": {m["sco"]: m["required_count"] for m in resumen_mod},
    }
    with open(os.path.join(args.privado, "evaluacion_privada.json"), "w", encoding="utf-8") as f:
        json.dump(privado, f, ensure_ascii=False)

    # ---------- comprobación de fuga: nada del banco ni de modelos de proyecto en lo público ----------
    publico = ""
    for nombre in sorted(os.listdir(os.path.join(RAIZ, "curso", "data"))):
        with open(os.path.join(RAIZ, "curso", "data", nombre), encoding="utf-8") as f:
            publico += f.read()
    fugas = []
    unidades = banco["units"]
    textos_leccion = " ".join(s["visible_text"] for l in c["lessons"] for s in l["screens"])
    observaciones = []
    for u in unidades:
        if u["input"][:80] in publico:
            if u["input"][:80] in textos_leccion:
                # El maestro v3 reutiliza el expediente de una práctica enseñada: no es fuga de clave,
                # pero se informa como observación editorial (exposición previa del contexto).
                observaciones.append(u["id"] + ": expediente coincide con una pantalla de lección del maestro")
            else:
                fugas.append(u["id"] + " (expediente del banco)")
        if u.get("key_justification") and u["key_justification"][:60] in publico:
            fugas.append(u["id"] + " (justificación de clave)")
    for p in c["projects"]:
        for blk in p["model"]:
            if blk["text"][:60] in publico:
                fugas.append(p["id"] + " (modelo)")
        if p["update_model"][:60] in publico:
            fugas.append(p["id"] + " (update_model)")
        for k, v in p["anchors"].items():
            if v[:60] in publico:
                fugas.append(p["id"] + " (ancla %s)" % k)
        for d in p["documents"]:
            if d["text"][:60] in publico:
                fugas.append(p["id"] + " (documento de proyecto en cliente)")
    if fugas:
        print("FUGA DE MATERIAL PRIVADO:", fugas, file=sys.stderr)
        sys.exit(2)

    total_pantallas = sum(len(l["screens"]) for l in c["lessons"])
    print(json.dumps({
        "modulos": len(resumen_mod), "lecciones": len(c["lessons"]), "pantallas": total_pantallas,
        "actividades": len(ia["activities"]), "tarjetas": len(ia["flipcards"]), "hotspots": len(ia["hotspots"]),
        "talleres": len(c["workshops"]), "casos": len(c["cases"]), "diagnostico": len(c["diagnostic"]),
        "audio_disponible": sum(1 for a in audio.values() if a["file"]), "audio_total": len(audio),
        "imagenes_disponibles": sum(1 for i in imagenes.values() if i["file"]), "imagenes_total": len(imagenes),
        "videos_disponibles": sum(1 for v in videos.values() if v["file"]), "videos_total": len(videos),
        "fuga_privada": "ninguna detectada",
        "observaciones": observaciones,
    }, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
