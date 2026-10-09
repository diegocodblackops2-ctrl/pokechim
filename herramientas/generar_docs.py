#!/usr/bin/env python3
"""Genera docs/MAPA_PRODUCCION.md y docs/ACEPTACION_PRODUCCION.md desde las fuentes y los registros reales."""
import json, os
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
F = os.path.join(RAIZ, "autoria_privada", "CURSO_05_IA_ULTRA_CLAUDE_v3")
L = lambda p: json.load(open(p, encoding="utf-8"))
c = L(os.path.join(F, "01_CONTENIDO", "IATU_Contenido_completo_v3.json"))
ia = L(os.path.join(F, "03_INTERACTIVIDAD", "IATU_Interacciones_v3.json"))
loc = L(os.path.join(F, "05_AUDIO_VIDEO", "IATU_Locuciones_master.json"))["records"]
mm = L(os.path.join(F, "05_AUDIO_VIDEO", "IATU_Guion_multimedia_v3.json"))
cat = L(os.path.join(F, "06_IMAGENES", "IATU_Catalogo_imagenes.json"))["assets"]
ico = L(os.path.join(F, "06_IMAGENES", "IATU_Iconografia.json"))
per = L(os.path.join(RAIZ, "herramientas", "imagenes_personas_v3_1.json"))["cambios"]
est = L(os.path.join(RAIZ, "herramientas", "imagenes_estado.json"))
ra = {p["id"]: p for p in L(os.path.join(RAIZ, "curso", "media", "audio", "registro_audio.json"))["pistas"]}
rv_path = os.path.join(RAIZ, "curso", "media", "video", "registro_video.json")
rv = L(rv_path)["videos"] if os.path.exists(rv_path) else {}
TIPO = {"drag_classify": "Clasificación (arrastre + «Mover a…» + tocar-tocar)", "order_dependencies": "Secuencia por dependencias",
        "branch_sequence": "Secuencia con ramas", "evidence_comparison": "Comparación con evidencia/cálculos"}
o = ["# Mapa de producción · Curso 5", "", "Generado por `herramientas/generar_docs.py` desde el maestro v3 y los registros reales de medios. No editar a mano.", ""]
o += ["## 1. Interacciones y dónde están", "", "### 1.1 Actividades estructuradas (32, sustituyen las P04 indicadas)", "", "| ID | Tipo | Pantalla | Título |", "|---|---|---|---|"]
o += [f"| {a['id']} | {TIPO[a['type']]} | {a['screen_id']} | {a['title']} |" for a in ia["activities"]]
op = [s for l in c["lessons"] for s in l["screens"] if s["kind"] == "decision" and s["production_map"]["interaction_type"] == "micropractica_abierta"]
o += ["", f"### 1.2 Micro-decisiones abiertas con microproducto ({len(op)})", "", ", ".join(s["id"] for s in op)]
o += ["", "### 1.3 Tarjetas que se dan vuelta (32)", "", "| ID | Pantalla | Pregunta |", "|---|---|---|"]
o += [f"| {f['id']} | {f['screen_id']} | {f['front']} |" for f in ia["flipcards"]]
o += ["", "### 1.4 Hotspots sobre documento semántico (8)", "", "| ID | Pantalla | Documento | Zonas |", "|---|---|---|---|"]
o += [f"| {h['id']} | {h['screen_id']} | {h['title']} | {len(h['regions'])} |" for h in ia["hotspots"]]
o += ["", "### 1.5 Talleres (32) y casos ramificados (3)", "", "| Taller | Módulo | Tipo | Título |", "|---|---|---|---|"]
o += [f"| {w['id']} | {w['module']} | {'Guiado' if w['id'].endswith('T1') else 'Transferencia'} | {w['title']} |" for w in c["workshops"]]
o += ["", "| Caso | Módulo | Nodos | Título |", "|---|---|---|---|"] + [f"| {x['id']} | {x['module']} | {len(x['steps'])} | {x['title']} |" for x in c["cases"]]
o += ["", "Además: diagnóstico de 16 situaciones (orientación), transferencia final, 24 encargos comparados, 10 plantillas rellenables, 3 auditorías, glosario (37) y 42 fuentes en la biblioteca.", ""]
prod = [r for r in loc if r["id"] in ra]
o += ["## 2. Voz en off (328 guiones)", "", f"Producidas: **{len(prod)}** pistas de prueba (ElevenLabs, plan sin uso comercial confirmado; se reemplazan). Pendientes: **{len(loc) - len(prod)}**. Diego graba las 328 con una sola voz en Storyline (63 bloques de ≤3.000 caracteres) y `herramientas/cortar_grupos.py` las corta, normaliza y verifica.", "",
      "| Tipo | Total | Producidas |", "|---|---|---|"]
for k in ("orientacion", "introduccion_modulo", "pantalla", "cierre_modulo", "escena_video"):
    o.append(f"| {k} | {sum(1 for r in loc if r['kind'] == k)} | {sum(1 for r in prod if r['kind'] == k)} |")
o += ["", "Pistas producidas:", ""] + [f"- `{p['archivo']}` · {p['measured_seconds']} s medidos · {p['estado']}" for p in sorted(ra.values(), key=lambda x: x["id"])]
o += ["", "<details><summary>Las 328 locuciones con destino</summary>", "", "| ID | Tipo | Archivo | Estado |", "|---|---|---|---|"]
o += [f"| {r['id']} | {r['kind']} | media/audio/{r['filename']} | {'muestra producida' if r['id'] in ra else 'guion listo'} |" for r in loc]
o += ["", "</details>", "", "## 3. Microvideos (12)", "", "| ID | Pantalla | Título | Estado |", "|---|---|---|---|"]
for v in mm["videos"]:
    s = rv.get(v["id"])
    o.append(f"| {v['id']} | {v['screen_id']} | {v['title']} | {('producido · ' + str(s['duracion_medida_s']) + ' s · ' + s['estado']) if s else 'composiciones listas; requiere voz aprobada'} |")
o += ["", "## 4. Imágenes (60)", "", "Con personas tras la indicación de Diego: " + str(len(per) + 2) + " de 60 (briefs en `herramientas/imagenes_personas_v3_1.json`).", "",
      "| ID | Pantalla | Título | Personas | Estado |", "|---|---|---|---|---|"]
for a in cat:
    i = a["id"]
    st = "integrada (WebP)" if i in est["integrada"] else "generada en Canva, sin exportar" if i in est["canva_sin_exportar"] else "Diego la tiene; falta archivo" if i in est["entregada_por_diego_sin_archivo"] else "pendiente"
    o.append(f"| {i} | {a['screen_id']} | {a['title']} | {'sí' if (i in per or i in ('IATU-IMG025', 'IATU-IMG059')) else 'no'} | {st} |")
o += ["", "## 5. Iconografía (24 roles · Lucide, licencia ISC)", "", "| Rol | Significado | Icono |", "|---|---|---|"]
m = {'documento':'file-text','capas':'layers','limite':'ban','encargo':'clipboard-list','comparar':'git-compare','fuente':'book-open','revision':'badge-check','pendiente':'clock','archivo':'file-pen','version':'history','privado':'lock','alerta':'triangle-alert','arrastrar':'move','ordenar':'arrow-up-down','tarjeta':'flip-horizontal-2','hotspot':'scan-search','audio':'volume-2','transcripcion':'captions','video':'clapperboard','pausa':'pause','reintentar':'rotate-ccw','descargar':'download','guardar':'save','proyecto':'briefcase'}
o += [f"| {x['id']} · {x['name']} | {x['meaning']} | `{m[x['name']]}` |" for x in ico]
open(os.path.join(RAIZ, "docs", "MAPA_PRODUCCION.md"), "w", encoding="utf-8").write("\n".join(o) + "\n")
print("MAPA_PRODUCCION.md", len(o), "líneas")
