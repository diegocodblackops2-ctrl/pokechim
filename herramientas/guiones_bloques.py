#!/usr/bin/env python3
"""Escribe docs/locucion/GUIONES_POR_BLOQUE.md: los 93 bloques de locución listos para pegar en ElevenLabs o Articulate,
con su estado (producido / pendiente) según curso/media/audio/registro_audio.json."""
import json, os
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
g = json.load(open(os.path.join(RAIZ, "herramientas", "elevenlabs_grupos.json"), encoding="utf-8"))
reg = json.load(open(os.path.join(RAIZ, "curso", "media", "audio", "registro_audio.json"), encoding="utf-8"))
hechos = {p.get("grupo") for p in reg["pistas"]}
pend = sum(x["chars"] for x in g if x["grupo"] not in hechos)
L = ["# Guiones de locución en bloques · Curso 5", "",
     "Voz: **Catalina - Español Chileno** (ElevenLabs, `voice_id 6Gr4AVmTax1pMJO0lHRK`), modelo **Eleven v4**.", "",
     "Cómo usarlos:",
     "1. Copia el bloque tal cual. `[warmly]` y `[long pause]` son indicaciones de dirección y no se leen.",
     "2. Genera **una sola toma** por bloque y descárgala en MP3 con el nombre exacto del bloque (por ejemplo `M02-L01.mp3`).",
     "3. Deja los MP3 en `originales_medios/audio/grupos/` y ejecuta `python herramientas/cortar_grupos.py`. El script corta cada bloque en sus pantallas, normaliza la sonoridad, crea los subtítulos y deja el control de calidad en `curso/media/audio/qa_asr.json`.", "",
     f"Bloques: {len(g)} · producidos: {sum(1 for x in g if x['grupo'] in hechos)} · pendientes: {sum(1 for x in g if x['grupo'] not in hechos)} · créditos pendientes aprox.: {pend:,}".replace(",", "."), ""]
for x in g:
    est = "producido" if x["grupo"] in hechos else "pendiente"
    L += [f"## {x['grupo']} · {est} · {x['chars']} caracteres", "", "Pantallas: " + ", ".join(s["id"] for s in x["segmentos"]), "",
          "```text", x["prompt"], "```", ""]
os.makedirs(os.path.join(RAIZ, "docs", "locucion"), exist_ok=True)
open(os.path.join(RAIZ, "docs", "locucion", "GUIONES_POR_BLOQUE.md"), "w", encoding="utf-8").write("\n".join(L))
print("bloques", len(g), "pendientes (caracteres)", pend)
