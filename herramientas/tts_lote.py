#!/usr/bin/env python3
"""Producción de locuciones del Curso 5 (voz candidata: Catalina, es-CL).

Lee los 328 guiones de 05_AUDIO_VIDEO/IATU_Locuciones_master.json, aplica una ADAPTACIÓN ORAL mínima y
trazable (sin cambiar hechos ni el texto visible), sintetiza, normaliza sonoridad, mide la duración real y
registra cada pista en curso/media/audio/registro_audio.json.

Backends:
  --backend azure  Azure AI Speech (licencia comercial de la cuenta de Dibork). Requiere AZURE_SPEECH_KEY y
                   AZURE_SPEECH_REGION. Voz por defecto: es-CL-CatalinaNeural. Ruta recomendada para publicar.
  --backend edge   Servicio de lectura de Microsoft Edge (paquete edge-tts). Misma voz, sin cuenta ni créditos.
                   SOLO para muestras y revisión interna: no es un canal con licencia comercial confirmada.
  --backend archivos  No sintetiza: integra MP3 ya producidos por Dibork (p. ej., exportados de Articulate o
                   ElevenLabs) desde --entrada, con los nombres del catálogo, y los normaliza y registra.

Conjuntos:
  --set muestra    Muestra de la guía de voz + orientación + M01 (intro/cierre) + lección muestra M01-L03 + VID01.
  --set todo       Las 328 pistas (no ejecutar antes de aprobar voz, derechos y alcance).
  --ids A,B,C      IDs concretos.

Ejemplo:
  python3 herramientas/tts_lote.py --set muestra --backend edge --estado muestra_para_aprobacion
"""
import argparse
import asyncio
import hashlib
import json
import os
import re
import ssl
import subprocess
import sys
import urllib.request

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
AUDIO = os.path.join(RAIZ, "curso", "media", "audio")
VOZ = "es-CL-CatalinaNeural"
MUESTRA_GUIA = ("En Dibork Learning vas a practicar con información ficticia. La idea es usar la inteligencia artificial "
                "para trabajar mejor, sin perder el control de lo que entregas. No compartas contraseñas ni datos de "
                "clientes. El trece de noviembre, a las once de la mañana, revisaremos tres documentos. Antes de usar un "
                "resultado, comprueba su fuente, la fecha y lo que todavía está pendiente. ChatGPT, Claude y Gemini son "
                "herramientas distintas: elige según tu tarea, no solo por la marca.")
SET_MUESTRA = ["IATU-BIENVENIDA", "IATU-COMO_ESTUDIAR", "IATU-RUTAS", "IATU-CIERRE_CURSO", "IATU-M01-INTRO", "IATU-M01-CIERRE",
               "IATU-M01-L03-P01", "IATU-M01-L03-P02", "IATU-M01-L03-P03", "IATU-M01-L03-P04",
               "IATU-VID01-S01", "IATU-VID01-S02", "IATU-VID01-S03"]

# ---------- Adaptación oral ----------
UNIDADES = ["cero", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce",
            "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuna",
            "veintidós", "veintitrés"]
def minutos(n):
    base = {0: "cero", 1: "un", 2: "dos", 3: "tres", 4: "cuatro", 5: "cinco", 6: "seis", 7: "siete", 8: "ocho", 9: "nueve",
            10: "diez", 11: "once", 12: "doce", 13: "trece", 14: "catorce", 15: "quince", 16: "dieciséis", 17: "diecisiete",
            18: "dieciocho", 19: "diecinueve", 20: "veinte", 21: "veintiún", 22: "veintidós", 23: "veintitrés", 24: "veinticuatro",
            25: "veinticinco", 26: "veintiséis", 27: "veintisiete", 28: "veintiocho", 29: "veintinueve"}
    if n in base: return base[n]
    dec = {3: "treinta", 4: "cuarenta", 5: "cincuenta"}[n // 10]
    return dec if n % 10 == 0 else dec + " y " + base[n % 10]

def adaptar(texto):
    """Devuelve (texto_oral, cambios). Cada regla responde a una lectura errónea comprobada con reconocimiento de voz."""
    cambios = []
    t = texto
    def sub(pat, rep, motivo):
        nonlocal t
        nuevo = re.sub(pat, rep, t)
        if nuevo != t:
            cambios.append(motivo)
            t = nuevo
    # 16:00 se leía «las cuatro» (ambiguo); 10:02 conserva los minutos.
    def hora(m):
        hh, mm = int(m.group(1)), int(m.group(2))
        if hh > 23: return m.group(0)
        s = UNIDADES[hh] + " horas" if hh != 1 else "una hora"
        if mm: s += " con " + minutos(mm) + (" minuto" if mm == 1 else " minutos")
        return s
    sub(r"\b(\d{1,2}):(\d{2})\b(?:\s*horas)?", hora, "hora HH:MM → «dieciséis horas» (se leía en formato de 12 h)")
    # 12/18 se leía como fecha («diciembre del 18»).
    sub(r"\b(\d+)/(\d+)\b", r"\1 de \2", "fracción a/b → «a de b» (se leía como fecha)")
    # Rangos con guion largo: el guion no se pronunciaba.
    sub(r"\b([A-Z]?\d{1,3})\s?–\s?([A-Z]?\d{1,3})\b", r"\1 a \2", "rango X–Y → «X a Y» (el guion no se pronunciaba)")
    sub(r"\s*→\s*", " y luego ", "flecha → «y luego»")
    # Saltos de línea → pausa de párrafo
    t = re.sub(r"\s*\n+\s*", "\n", t).strip()
    return t, cambios

def sha256_txt(s): return hashlib.sha256(s.encode("utf-8")).hexdigest()
def sha256_file(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(65536), b""): h.update(b)
    return h.hexdigest()

def duracion(p):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", p], capture_output=True, text=True)
    return round(float(out.stdout.strip()), 2)

def normalizar(src, dst, kbps):
    """Sonoridad de voz (-16 LUFS, pico -1,5 dBTP), mono, sin silencios largos al inicio/fin."""
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-af",
                    "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.15,areverse,"
                    "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.25,areverse,"
                    "loudnorm=I=-16:TP=-1.5:LRA=11", "-ac", "1", "-ar", "24000", "-b:a", f"{kbps}k", dst], check=True)

# ---------- Backends ----------
async def edge_sintetizar(texto, mp3, vtt):
    import edge_tts, edge_tts.communicate as c  # pip install edge-tts
    ca = os.environ.get("SSL_CERT_FILE") or ("/root/.ccr/ca-bundle.crt" if os.path.exists("/root/.ccr/ca-bundle.crt") else None)
    if ca: c._SSL_CTX = ssl.create_default_context(cafile=ca)
    com = edge_tts.Communicate(texto, VOZ, boundary="SentenceBoundary")
    sub = edge_tts.SubMaker()
    with open(mp3, "wb") as f:
        async for ch in com.stream():
            if ch["type"] == "audio": f.write(ch["data"])
            elif ch["type"] == "SentenceBoundary": sub.feed(ch)
    srt = sub.get_srt()
    vtt_txt = "WEBVTT\n\n" + re.sub(r"(\d{2}:\d{2}:\d{2}),(\d{3})", r"\1.\2", srt)
    with open(vtt, "w", encoding="utf-8") as f: f.write(vtt_txt)

def azure_sintetizar(texto, mp3):
    key, region = os.environ.get("AZURE_SPEECH_KEY"), os.environ.get("AZURE_SPEECH_REGION")
    if not key or not region: sys.exit("Faltan AZURE_SPEECH_KEY / AZURE_SPEECH_REGION (cuenta con licencia de Dibork).")
    esc = texto.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    esc = esc.replace("\n", '<break time="450ms"/>')
    ssml = f"<speak version='1.0' xml:lang='es-CL'><voice name='{VOZ}'>{esc}</voice></speak>"
    req = urllib.request.Request(f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1", data=ssml.encode("utf-8"),
                                 headers={"Ocp-Apim-Subscription-Key": key, "Content-Type": "application/ssml+xml",
                                          "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3", "User-Agent": "iatu-curso5"})
    with urllib.request.urlopen(req, timeout=120) as r, open(mp3, "wb") as f: f.write(r.read())

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fuente", default=os.path.join(RAIZ, "autoria_privada", "CURSO_05_IA_ULTRA_CLAUDE_v3"))
    ap.add_argument("--backend", choices=["edge", "azure", "archivos"], required=True)
    ap.add_argument("--set", choices=["muestra", "todo"])
    ap.add_argument("--ids", default="")
    ap.add_argument("--entrada", help="carpeta con MP3 ya producidos (backend archivos)")
    ap.add_argument("--estado", default="generado_pendiente_escucha")
    ap.add_argument("--kbps", type=int, default=64)
    ap.add_argument("--originales", default=os.path.join(RAIZ, "originales_medios", "audio"))
    a = ap.parse_args()

    recs = json.load(open(os.path.join(a.fuente, "05_AUDIO_VIDEO", "IATU_Locuciones_master.json"), encoding="utf-8"))["records"]
    por_id = {r["id"]: r for r in recs}
    ids = SET_MUESTRA if a.set == "muestra" else [r["id"] for r in recs] if a.set == "todo" else [x for x in a.ids.split(",") if x]
    os.makedirs(AUDIO, exist_ok=True); os.makedirs(a.originales, exist_ok=True)
    reg_path = os.path.join(AUDIO, "registro_audio.json")
    reg = json.load(open(reg_path, encoding="utf-8")) if os.path.exists(reg_path) else {
        "voz": {"nombre": "Catalina", "voice_id": VOZ, "proveedor": "Microsoft Azure AI Speech (voz neuronal sintética)",
                "tipo": "sintética (TTS); no es grabación humana", "idioma": "es-CL",
                "licencia": "PENDIENTE: confirmar cuenta y licencia de Dibork (Azure Speech, o la voz Catalina de Articulate/ElevenLabs si es otra).",
                "aprobacion_muestra": "PENDIENTE de escucha humana por Diego"},
        "pistas": []}
    idx = {p["id"]: p for p in reg["pistas"]}
    adapt_path = os.path.join(AUDIO, "adaptacion_oral.json")
    adapt = json.load(open(adapt_path, encoding="utf-8")) if os.path.exists(adapt_path) else {}

    for i, pid in enumerate(ids, 1):
        r = por_id[pid]
        oral, cambios = adaptar(r["text_clean"])
        adapt[pid] = {"texto": r["text_clean"], "oral": oral, "cambios": cambios, "script_sha256": r["script_sha256"]}
        dst = os.path.join(AUDIO, r["filename"])
        crudo = os.path.join(a.originales, r["filename"])
        vtt = dst[:-4] + ".vtt"
        if a.backend == "edge":
            asyncio.run(edge_sintetizar(oral, crudo, vtt))
            proveedor = "edge-tts (canal de revisión, sin licencia comercial confirmada)"
        elif a.backend == "azure":
            azure_sintetizar(oral, crudo)
            proveedor = "Azure AI Speech (cuenta de Dibork)"
            if os.path.exists(vtt): os.remove(vtt)
        else:
            src = os.path.join(a.entrada, r["filename"])
            if not os.path.exists(src): print("FALTA", src); continue
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, crudo], check=True)
            proveedor = "archivo entregado por Dibork"
        normalizar(crudo, dst, a.kbps)
        d = duracion(dst)
        idx[pid] = {"id": pid, "archivo": "media/audio/" + r["filename"], "voice_id": VOZ, "backend": a.backend, "proveedor": proveedor,
                    "measured_seconds": d, "estimated_seconds": r["estimated_seconds"], "audio_sha256": sha256_file(dst),
                    "script_sha256": r["script_sha256"], "oral_sha256": sha256_txt(oral), "kbps": a.kbps,
                    "bytes": os.path.getsize(dst), "estado": a.estado, "adaptaciones": cambios}
        print(f"[{i}/{len(ids)}] {pid} {d:.1f}s {os.path.getsize(dst)//1024} KiB {('· ' + '; '.join(cambios)) if cambios else ''}", flush=True)

    reg["pistas"] = sorted(idx.values(), key=lambda p: p["id"])
    json.dump(reg, open(reg_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(adapt, open(adapt_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    if a.set == "muestra" and a.backend == "edge":
        mp3 = os.path.join(AUDIO, "muestras", "muestra-guia-voz-catalina.mp3")
        os.makedirs(os.path.dirname(mp3), exist_ok=True)
        tmp = os.path.join(a.originales, "muestra-guia.mp3")
        asyncio.run(edge_sintetizar(MUESTRA_GUIA, tmp, mp3[:-4] + ".vtt"))
        normalizar(tmp, mp3, a.kbps)
        print("Muestra de la guía:", mp3, duracion(mp3), "s")

if __name__ == "__main__":
    main()
