#!/usr/bin/env python3
"""Corta las locuciones de ElevenLabs producidas por grupo en las 328 pistas del curso.

Cada grupo de herramientas/elevenlabs_grupos.json se generó como una sola toma (mismo tono a lo largo de una
lección) con «[long pause]» entre pantallas. Este script:
  1. transcribe la toma con Whisper (faster-whisper, local) y obtiene el tiempo de cada palabra;
  2. alinea esas palabras con el texto oral de cada segmento (difflib sobre palabras normalizadas);
  3. corta en el punto de menor energía dentro de la pausa entre segmentos;
  4. recorta silencios, normaliza a -16 LUFS y escribe MP3 mono en curso/media/audio/<archivo>;
  5. escribe el VTT de cada pista con tiempos medidos y registra la pista y su QA (similitud, negaciones).

Uso: python herramientas/cortar_grupos.py --entrada <carpeta con ORI-B01.mp3, M01-B01.mp3…> --voz "Storyline · Catalina"
     (--bloques elevenlabs para los grupos por lección generados con ElevenLabs)
"""
import argparse, difflib, hashlib, json, os, re, subprocess, unicodedata
import numpy as np

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
AUDIO = os.path.join(RAIZ, "curso", "media", "audio")
SR = 16000
KBPS = 64
VOZ = {
    "nombre": "Catalina - Español Chileno",
    "voice_id": "6Gr4AVmTax1pMJO0lHRK",
    "modelo": "eleven_v4",
    "proveedor": "ElevenLabs (cuenta de Diego / Dibork)",
    "tipo": "sintética (TTS); no es grabación humana",
    "idioma": "es-CL",
    "licencia": "Generada con la cuenta de ElevenLabs del titular; el uso comercial depende del plan de esa cuenta (verificar plan pagado vigente).",
    "aprobacion_muestra": "Aprobada por Diego (elección «Catalina ElevenLabs»)",
}
CRIT = {"no", "ni", "nunca", "todavia", "aun", "pendiente", "sin", "tampoco", "solo"}
ETIQUETAS = {"warmly", "long", "pause"}


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.findall(r"[a-z0-9]+", s)


def cargar(f, sr=SR):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-f", "s16le", "-ac", "1", "-ar", str(sr), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0


def minimo_energia(x, t1, t2):
    """Instante de menor energía (ventanas de 20 ms) entre t1 y t2."""
    if t2 - t1 < 0.06:
        return (t1 + t2) / 2
    a, b = int(t1 * SR), int(t2 * SR)
    w = int(0.02 * SR)
    seg = x[a:b]
    n = max(1, len(seg) // w)
    e = [float(np.mean(seg[i * w:(i + 1) * w] ** 2)) for i in range(n)]
    # centro del tramo más silencioso (preferir el medio de la pausa)
    umbral = min(e) * 4 + 1e-7
    quietos = [i for i, v in enumerate(e) if v <= umbral]
    i = quietos[len(quietos) // 2]
    return t1 + (i + 0.5) * w / SR


def ts(t):
    h, r = divmod(max(t, 0), 3600)
    m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}"


def cues(oral, tiempos):
    """Divide el texto oral en frases (≤ ~90 caracteres) con los tiempos de sus palabras."""
    palabras = oral.split()
    trozos, actual = [], []
    for p in palabras:
        actual.append(p)
        largo = len(" ".join(actual))
        if (re.search(r"[.!?:;]$", p) and largo > 25) or largo > 85:
            trozos.append(actual); actual = []
    if actual: trozos.append(actual)
    out, k = [], 0
    for tr in trozos:
        n = len(tr)
        ini = [t for t in tiempos[k:k + n] if t]
        if ini:
            out.append([ini[0][0], ini[-1][1], " ".join(tr)])
        elif out:
            out[-1][2] += " " + " ".join(tr)
        k += n
    for i in range(len(out) - 1):
        out[i][1] = min(out[i][1] + 0.25, out[i + 1][0] - 0.04)
    return out


def procesar(g, mp3, modelo, dur_prev):
    x = cargar(mp3)
    total = len(x) / SR
    segs, _ = modelo.transcribe(x, language="es", beam_size=5, word_timestamps=True, vad_filter=False)
    asr = [(w.word, w.start, w.end) for s in segs for w in s.words]
    asr_n = []  # (palabra normalizada, inicio, fin)
    for w, a, b in asr:
        for t in norm(w):
            asr_n.append((t, a, b))
    ref, dueño, crudo = [], [], []  # palabra normalizada, segmento, índice de palabra cruda del segmento
    for k, s in enumerate(g["segmentos"]):
        for j, p in enumerate(s["oral"].split()):
            for t in norm(p):
                ref.append(t); dueño.append(k); crudo.append(j)
    sm = difflib.SequenceMatcher(a=ref, b=[t for t, _, _ in asr_n], autojunk=False)
    mapa = {}
    for blk in sm.get_matching_blocks():
        for d in range(blk.size):
            mapa[blk.a + d] = asr_n[blk.b + d]
    # tiempos por segmento
    n = len(g["segmentos"])
    lim = []
    for k in range(n):
        idx = [i for i in range(len(ref)) if dueño[i] == k and i in mapa]
        if not idx:
            raise SystemExit(f"{g['grupo']}: el segmento {g['segmentos'][k]['id']} no se reconoció en el audio")
        lim.append((mapa[idx[0]][1], mapa[idx[-1]][2]))
    cortes = [0.0]
    for k in range(n - 1):
        cortes.append(minimo_energia(x, lim[k][1], max(lim[k][1], lim[k + 1][0])))
    cortes.append(total)
    # palabras de etiquetas leídas en voz alta (no deberían aparecer)
    leidas = [t for t, _, _ in asr_n if t in ETIQUETAS]
    res = []
    for k, s in enumerate(g["segmentos"]):
        a, b = cortes[k], cortes[k + 1]
        a2, b2 = max(a, lim[k][0] - 0.12), min(b, lim[k][1] + 0.35)
        dst = os.path.join(AUDIO, s["file"])
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{a2:.3f}", "-to", f"{b2:.3f}", "-i", mp3,
                        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100", "-ac", "1", "-b:a", f"{KBPS}k",
                        "-codec:a", "libmp3lame", dst], check=True)
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", dst],
                                   capture_output=True, text=True).stdout.strip())
        # tiempos de cada palabra cruda del segmento, relativos al recorte
        palabras = s["oral"].split()
        tiempos = [None] * len(palabras)
        for i in range(len(ref)):
            if dueño[i] == k and i in mapa:
                j = crudo[i]
                _, t1, t2 = mapa[i]
                t1, t2 = max(t1 - a2, 0), max(t2 - a2, 0)
                tiempos[j] = (t1, t2) if tiempos[j] is None else (tiempos[j][0], t2)
        vtt = ["WEBVTT", ""]
        for c1, c2, txt in cues(s["oral"], tiempos):
            vtt += [f"{ts(c1)} --> {ts(min(c2, dur))}", txt, ""]
        open(dst[:-4] + ".vtt", "w", encoding="utf-8").write("\n".join(vtt))
        # QA: palabras del guion vs reconocidas dentro del segmento
        r = [ref[i] for i in range(len(ref)) if dueño[i] == k]
        h = [t for t, t1, t2 in asr_n if t1 >= a - 0.05 and t2 <= b + 0.05 and t not in ETIQUETAS]
        qm = difflib.SequenceMatcher(a=r, b=h, autojunk=False)
        diffs, crit = [], []
        for op, i1, i2, j1, j2 in qm.get_opcodes():
            if op != "equal":
                diffs.append({"guion": " ".join(r[i1:i2]), "asr": " ".join(h[j1:j2])})
                crit += [w for w in r[i1:i2] if w in CRIT]
        datos = open(dst, "rb").read()
        res.append({
            "pista": {
                "id": s["id"], "archivo": "media/audio/" + s["file"], "voice_id": VOZ["voice_id"], "backend": "elevenlabs",
                "proveedor": " · ".join(x for x in (VOZ["proveedor"], VOZ["nombre"], VOZ["modelo"]) if x), "grupo": g["grupo"],
                "measured_seconds": round(dur, 2), "audio_sha256": hashlib.sha256(datos).hexdigest(),
                "oral_sha256": hashlib.sha256(s["oral"].encode()).hexdigest(), "kbps": KBPS, "bytes": len(datos),
                "estado": "generado_pendiente_escucha", "adaptaciones": s.get("cambios", []),
            },
            "qa": {"id": s["id"], "similitud": round(qm.ratio(), 4), "diferencias": diffs,
                   "negaciones_o_limites_afectados": crit, "etiquetas_leidas": leidas if k == 0 else []},
        })
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--entrada", default=os.path.join(RAIZ, "originales_medios", "audio", "grupos"))
    ap.add_argument("--grupos", default="")
    ap.add_argument("--bloques", default="storyline", choices=["storyline", "elevenlabs"],
                    help="storyline: bloques ≤3.000 caracteres (herramientas/storyline_bloques.json); elevenlabs: grupos por lección")
    ap.add_argument("--voz", default="", help="Descripción de la voz usada (proveedor · nombre), queda en el registro")
    a = ap.parse_args()
    from faster_whisper import WhisperModel
    grupos = json.load(open(os.path.join(RAIZ, "herramientas", ("storyline_bloques.json" if a.bloques == "storyline" else "elevenlabs_grupos.json")), encoding="utf-8"))
    if a.voz:
        VOZ.update({"nombre": a.voz, "voice_id": a.voz, "modelo": "", "proveedor": a.voz,
                    "licencia": "Generada por Dibork con su cuenta; confirmar derechos de uso comercial del proveedor."})
    pedidos = set(filter(None, a.grupos.split(",")))
    regf, qaf = os.path.join(AUDIO, "registro_audio.json"), os.path.join(AUDIO, "qa_asr.json")
    reg = json.load(open(regf, encoding="utf-8"))
    qa = json.load(open(qaf, encoding="utf-8"))
    # el registro pasa a la voz de ElevenLabs; las pistas antiguas de Microsoft se reemplazan
    if reg.get("voz", {}).get("voice_id") != VOZ["voice_id"] or reg.get("voz", {}).get("nombre") != VOZ["nombre"]:
        reg = {"voz": VOZ, "pistas": []}
        qa = {"modelo": "faster-whisper " + os.environ.get("WM", "small"),
              "nota": "Indicador automático; requiere escucha humana.", "pistas": []}
    pistas = {p["id"]: p for p in reg["pistas"]}
    qas = {q["id"]: q for q in qa["pistas"]}
    modelo = WhisperModel(os.environ.get("WM", "small"), device="cpu", compute_type="int8")
    for g in grupos:
        if pedidos and g["grupo"] not in pedidos: continue
        mp3 = next((os.path.join(a.entrada, g["grupo"] + ext) for ext in (".mp3", ".wav", ".m4a", ".MP3", ".WAV")
                    if os.path.exists(os.path.join(a.entrada, g["grupo"] + ext))), None)
        if not mp3:
            continue
        for r in procesar(g, mp3, modelo, None):
            pistas[r["pista"]["id"]] = r["pista"]; qas[r["qa"]["id"]] = r["qa"]
            q = r["qa"]
            print(f"{q['id']}: {r['pista']['measured_seconds']:.1f}s similitud {q['similitud']:.3f} "
                  f"críticas {q['negaciones_o_limites_afectados']} etiquetas {q['etiquetas_leidas']}", flush=True)
        reg["pistas"] = sorted(pistas.values(), key=lambda p: p["id"])
        qa["pistas"] = sorted(qas.values(), key=lambda p: p["id"])
        json.dump(reg, open(regf, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        json.dump(qa, open(qaf, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
