#!/usr/bin/env python3
"""Arma los grupos de locución para ElevenLabs (una generación por lección / módulo / video) y los guarda en
herramientas/elevenlabs_grupos.json. Cada grupo une varios guiones con una pausa larga entre ellos; luego
herramientas/cortar_grupos.py corta el MP3 por segmento alineando palabras con Whisper."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from tts_lote import adaptar
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
F = os.path.join(RAIZ, "autoria_privada", "CURSO_05_IA_ULTRA_CLAUDE_v3")
recs = json.load(open(os.path.join(F, "05_AUDIO_VIDEO", "IATU_Locuciones_master.json"), encoding="utf-8"))["records"]
R = {r["id"]: r for r in recs}
grupos = []
def g(gid, ids):
    segs = []
    for i in ids:
        oral, cambios = adaptar(R[i]["text_clean"])
        # «junio,20» / «cerrado,10» (coma pegada a una cifra que no es decimal) se lee como un número raro
        o2 = re.sub(r"(?<=[^\d\s]),(?=\d)", ", ", oral)
        if o2 != oral:
            oral = o2; cambios = cambios + ["coma pegada a cifra → «, »"]
        segs.append({"id": i, "oral": oral.replace("\n", " "), "file": R[i]["filename"], "cambios": cambios})
    prompt = "[warmly] " + " [long pause] ".join(s["oral"] for s in segs)
    grupos.append({"grupo": gid, "segmentos": segs, "prompt": prompt, "chars": len(prompt)})
g("ORIENTACION", ["IATU-BIENVENIDA", "IATU-COMO_ESTUDIAR", "IATU-RUTAS", "IATU-CIERRE_CURSO"])
for m in range(1, 17):
    g(f"M{m:02d}-INTRO-CIERRE", [f"IATU-M{m:02d}-INTRO", f"IATU-M{m:02d}-CIERRE"])
    for l in range(1, 5):
        g(f"M{m:02d}-L{l:02d}", [f"IATU-M{m:02d}-L{l:02d}-P0{p}" for p in range(1, 5)])
for v in range(1, 13):
    g(f"VID{v:02d}", [f"IATU-VID{v:02d}-S0{s}" for s in range(1, 4)])
json.dump(grupos, open(os.path.join(RAIZ, "herramientas", "elevenlabs_grupos.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(grupos), "grupos;", sum(len(x["segmentos"]) for x in grupos), "segmentos;", sum(x["chars"] for x in grupos), "caracteres; máx", max(x["chars"] for x in grupos))
