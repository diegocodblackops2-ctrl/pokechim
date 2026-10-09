#!/usr/bin/env python3
"""QA objetiva de locuciones: transcribe cada pista con Whisper (faster-whisper, local) y la compara con el
texto oral. Señala palabras omitidas/cambiadas, en especial negaciones, cifras y pendientes.
No reemplaza la escucha humana: Whisper también se equivoca con marcas y siglas.
Uso: python herramientas/qa/qa_audio_asr.py [IDs...]  (por defecto, todas las del registro)"""
import difflib, json, os, re, subprocess, sys, unicodedata
import numpy as np
from faster_whisper import WhisperModel
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
AUDIO = os.path.join(RAIZ, "curso", "media", "audio")
CRIT = {"no", "ni", "nunca", "todavía", "aún", "pendiente", "sin", "tampoco", "solo"}
def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.findall(r"[a-z0-9]+", s)
def load(f):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0
reg = json.load(open(os.path.join(AUDIO, "registro_audio.json"), encoding="utf-8"))
adapt = json.load(open(os.path.join(AUDIO, "adaptacion_oral.json"), encoding="utf-8"))
ids = sys.argv[1:] or [p["id"] for p in reg["pistas"]]
m = WhisperModel(os.environ.get("WM", "small"), device="cpu", compute_type="int8")
out = []
for p in reg["pistas"]:
    if p["id"] not in ids: continue
    segs, _ = m.transcribe(load(os.path.join(RAIZ, "curso", p["archivo"])), language="es", beam_size=5)
    asr = " ".join(s.text.strip() for s in segs)
    a, b = norm(adapt[p["id"]]["oral"]), norm(asr)
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    diffs, perdidas_criticas = [], []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op != "equal":
            diffs.append({"guion": " ".join(a[i1:i2]), "asr": " ".join(b[j1:j2])})
            perdidas_criticas += [w for w in a[i1:i2] if w in CRIT]
    wer = 1 - sm.ratio()
    out.append({"id": p["id"], "similitud": round(sm.ratio(), 4), "diferencias": diffs, "negaciones_o_limites_afectados": perdidas_criticas, "asr": asr})
    print(f"{p['id']}: similitud {sm.ratio():.3f}; diferencias {len(diffs)}; críticas {perdidas_criticas}", flush=True)
json.dump({"modelo": "faster-whisper " + os.environ.get("WM", "small"), "nota": "Indicador automático; requiere escucha humana.", "pistas": out},
          open(os.path.join(AUDIO, "qa_asr.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
