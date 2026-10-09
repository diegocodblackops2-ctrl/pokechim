#!/usr/bin/env python3
"""Produce los microvideos del Curso 5 a partir de: guion v3 (escenas), composiciones (videos_escenas.json),
locuciones ya generadas (registro_audio.json) y la identidad visual del curso.

Por escena: composición HTML en dos pasos → PNG (Chromium/Playwright) → fundido → voz real → MP4.
Subtítulos: VTT construido sobre el AUDIO FINAL con marcas de tiempo de palabras (Whisper local), usando el texto
del guion (no la transcripción automática). Póster WebP. Registro con duración medida, peso y hash.

Uso: python3 herramientas/render_videos.py --videos IATU-VID01 [--node-modules <ruta con playwright-core>]
Requiere ffmpeg, Node 18+, playwright-core, faster-whisper (para VTT)."""
import argparse, difflib, hashlib, html, json, os, re, subprocess, sys, tempfile, unicodedata

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
VIDEO = os.path.join(RAIZ, "curso", "media", "video")
W, H = 1280, 720
TITULO_S = 2.6

FUENTES = os.path.join(RAIZ, "curso", "app", "fonts")
CSS = """
@font-face{font-family:Sora;src:url(file://@FUENTES@/sora.woff2)}@font-face{font-family:Manrope;src:url(file://@FUENTES@/manrope.woff2)}
*{box-sizing:border-box}body{margin:0;width:1280px;height:720px;overflow:hidden;background:#f6f2fc;color:#1c1530;
font-family:Manrope,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}
.f{position:absolute;inset:0;padding:56px 64px;display:grid;grid-template-columns:44% 1fr;gap:48px;align-items:center}
.k{font:700 15px/1 system-ui;letter-spacing:.14em;text-transform:uppercase;color:#7c3aed;display:flex;gap:10px;align-items:center}
.k:before{content:"";width:26px;height:3px;background:#7c3aed}
h1{font:600 54px/1.12 'Iowan Old Style','Palatino Linotype',Palatino,Sora,Georgia,serif;margin:18px 0 0;letter-spacing:-.01em}
.bar{position:absolute;left:0;bottom:0;height:8px;background:#7c3aed}
.foot{position:absolute;left:64px;bottom:28px;font-size:16px;color:#6b6085}
.il{position:absolute;right:64px;top:30px;font:700 13px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;color:#6b6085;border:2px solid #cbbdf0;padding:7px 10px;border-radius:4px}
.card{background:#ffffff;border:1px solid #e2d8f5;border-radius:14px;box-shadow:0 2px 6px rgba(46,16,101,.08),0 18px 40px rgba(46,16,101,.10);padding:26px 28px}
.st{display:inline-block;font:800 13px/1 system-ui;letter-spacing:.14em;text-transform:uppercase;border:2.5px solid currentColor;border-radius:5px;padding:7px 9px;transform:rotate(-3deg)}
.ok{color:#7c3aed}.pend{color:#a16207}.no{color:#be123c}
.panels{display:grid;gap:18px}.panel h3{margin:0 0 10px;font:600 26px Sora,Georgia,serif}.panel p{margin:4px 0;font-size:24px}
.panel{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start}
.list{display:grid;gap:14px;counter-reset:n}.li{display:grid;grid-template-columns:52px 1fr;gap:16px;align-items:center}
.li .n{width:52px;height:52px;border-radius:50%;background:#7c3aed;color:#fff;font:700 24px/52px ui-monospace,monospace;text-align:center}
.li b{font:600 28px Sora,Georgia,serif;display:block}.li span{font-size:21px;color:#3f3558}
.rec{width:100%;border-collapse:collapse;font-size:23px}.rec td{padding:14px 10px;border-bottom:1px dashed #e2d8f5}.rec td:last-child{text-align:right}
.cmp{display:grid;grid-template-columns:1fr 1fr;gap:18px}.cmp .card h3{margin:0 0 10px;font:600 24px Sora,Georgia,serif}.cmp p{margin:6px 0;font-size:21px}
.cmp .vag{border-color:#be123c;background:#fde2e8}.cmp .good{border-color:#7c3aed}
.hl{font:500 34px/1.5 Sora,Georgia,serif}.hl mark{background:none;border-bottom:5px solid #7c3aed;padding:0 2px}.hl mark.b2{border-color:#be123c}
.tags{display:flex;gap:14px;margin-top:20px}.tag{font:700 17px system-ui;padding:8px 14px;border-radius:999px;background:#ede4fd;color:#4c1d95}.tag.b2{background:#fde2e8;color:#be123c}
.flow{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.fb{background:#ffffff;border:2px solid #1c1530;border-radius:10px;padding:14px 16px;font:600 21px system-ui}
.ar{font-size:30px;color:#7c3aed}.rama{margin-top:22px;border-left:5px solid #a16207;padding:10px 16px;font-size:21px;background:#fdf3d7;border-radius:6px}
.formula{font:700 76px/1.1 Sora,Georgia,serif;color:#7c3aed;margin-bottom:22px}.defs p{font-size:23px;margin:8px 0}
.cols{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:14px}.cols .card{padding:20px}.cols h3{margin:0 0 10px;font:600 24px Sora,Georgia,serif}.cols p{font-size:20px;margin:0}
.states{display:grid;gap:12px}.state{display:flex;justify-content:space-between;align-items:center;font-size:23px;background:#ffffff;border:1px solid #e2d8f5;border-radius:10px;padding:14px 18px}
.dec{display:grid;gap:12px}.opt{font-size:24px;padding:16px 20px;border:2px solid #cbbdf0;border-radius:12px;background:#ffffff;display:flex;gap:14px;align-items:center}
.opt:before{content:"";width:22px;height:22px;border-radius:50%;border:3px solid #7c3aed;flex:none}
.layers{display:grid;gap:0}.layer{font:600 25px system-ui;padding:18px 22px;border:1px solid #e2d8f5;background:#ffffff;border-radius:10px;margin-top:-6px;box-shadow:0 4px 10px rgba(46,16,101,.08)}
.layer:nth-child(2){margin-left:22px}.layer:nth-child(3){margin-left:44px}.layer:nth-child(4){margin-left:66px}
.pie{margin-top:20px;font-size:20px;color:#3f3558;border-left:4px solid #7c3aed;padding-left:14px}
.hide{visibility:hidden}
.t{position:absolute;inset:0;background:radial-gradient(100% 120% at 100% 0%,#3b1670,#0b0816 70%);color:#f6f1e7;display:flex;flex-direction:column;justify-content:center;padding:0 96px}
.t h1{color:#fffaf0;font-size:64px;max-width:900px}.t .k{color:#c4b5fd}.t .k:before{background:#c4b5fd}.t p{font-size:22px;color:#d8cdf5;margin-top:26px}
""".replace("@FUENTES@", FUENTES)

def esc(s): return html.escape(str(s))
def paso(it, step): return "" if it.get("paso", 1) <= step else " hide"

def comp(spec, step):
    t = spec["tipo"]
    if t == "paneles":
        out = "<div class='panels'>"
        for it in spec["items"]:
            out += f"<div class='card panel{paso(it, step)}'><div><h3>{esc(it['t'])}</h3>" + "".join(f"<p>{esc(l)}</p>" for l in it["lineas"]) + f"</div><span class='st {it.get('tono','ok')}'>{esc(it['sello'])}</span></div>"
        return out + "</div>"
    if t == "lista":
        out = "<div class='card list'>"
        for i, it in enumerate(spec["items"], 1):
            out += f"<div class='li{paso(it, step)}'><span class='n'>{i}</span><div><b>{esc(it['t'])}</b><span>{esc(it['d'])}</span></div></div>"
        return out + "</div>"
    if t == "registro":
        rows = ""
        for f in spec["filas"]:
            p = f[3] if len(f) > 3 else 1
            rows += f"<tr class='{'' if p <= step else 'hide'}'><td>{esc(f[0])}</td><td><span class='st {f[2]}'>{esc(f[1])}</span></td></tr>"
        return f"<div class='card'><table class='rec'>{rows}</table></div>"
    if t == "comparar":
        i, d = spec["izq"], spec["der"]
        ci = "vag" if i.get("tono", "no") == "no" else ""
        return (f"<div class='cmp'><div class='card {ci}'><h3>{esc(i['t'])}</h3>" + "".join(f"<p>{esc(l)}</p>" for l in i["lineas"]) +
                f"</div><div class='card good{'' if step > 1 else ' hide'}'><h3>{esc(d['t'])}</h3>" + "".join(f"<p>{esc(l)}</p>" for l in d["lineas"]) + "</div></div>")
    if t == "destacar":
        parts = re.split(r"\{([^}]+)\}", spec["texto"]); out, k = "", 0
        for j, ptxt in enumerate(parts):
            if j % 2: out += f"<mark class='{'b2' if k else ''}'>{esc(ptxt)}</mark>"; k += 1
            else: out += esc(ptxt)
        tags = "".join(f"<span class='tag{' b2' if n else ''}'>{esc(x)}</span>" for n, x in enumerate(spec["etiquetas"]))
        return f"<div class='card'><div class='hl'>{out}</div><div class='tags{'' if step > 1 else ' hide'}'>{tags}</div></div>"
    if t == "flujo":
        out = "<div class='flow'>"
        n = len(spec["pasos"])
        for j, s in enumerate(spec["pasos"]):
            vis = "" if (step > 1 or j < (n + 1) // 2) else " hide"
            out += f"<span class='fb{vis}'>{esc(s)}</span>" + (f"<span class='ar{vis}'>→</span>" if j < n - 1 else "")
        out += "</div>"
        if spec.get("rama"): out += f"<div class='rama{'' if step > 1 else ' hide'}'>{esc(spec['rama'])}</div>"
        return out
    if t == "formula":
        return f"<div class='card'><div class='formula'>{esc(spec['formula'])}</div><div class='defs{'' if step > 1 else ' hide'}'>" + "".join(f"<p><b>{esc(a)}</b> = {esc(b)}</p>" for a, b in spec["defs"]) + "</div></div>"
    if t == "columnas":
        return "<div class='cols'>" + "".join(f"<div class='card{'' if step > 1 or j == 0 else ' hide'}'><h3>{esc(c[0])}</h3><p>{esc(c[1])}</p></div>" for j, c in enumerate(spec["cols"])) + "</div>"
    if t == "estados":
        return "<div class='states'>" + "".join(f"<div class='state{'' if (s[3] if len(s) > 3 else 1) <= step else ' hide'}'><span>{esc(s[0])}</span><span class='st {s[2]}'>{esc(s[1])}</span></div>" for s in spec["items"]) + "</div>"
    if t == "decision":
        return "<div class='dec'>" + "".join(f"<div class='opt{'' if step > 1 or j == 0 else ' hide'}'>{esc(o)}</div>" for j, o in enumerate(spec["opciones"])) + "</div>"
    if t == "capas":
        return "<div class='layers'>" + "".join(f"<div class='layer{'' if step > 1 or j < 2 else ' hide'}'>{esc(x)}</div>" for j, x in enumerate(spec["items"])) + "</div>"
    raise ValueError(t)

def pagina(v, s, idx, spec, step, total_scenes, prog):
    pie = f"<div class='pie{'' if step > 1 else ' hide'}'>{esc(spec['pie'])}</div>" if spec.get("pie") else ""
    il = "<div class='il'>Ilustrativo</div>" if spec.get("ilustrativo") else ""
    return (f"<!doctype html><html lang='es-CL'><meta charset='utf-8'><style>{CSS}</style><body>{il}<div class='f'><div>"
            f"<div class='k'>Microvideo · Módulo {v['module']} · {idx}/{total_scenes}</div><h1>{esc(s['visible_text'])}</h1></div>"
            f"<div>{comp(spec, step)}{pie}</div></div><div class='foot'>IA para trabajar mejor · Dibork Learning</div>"
            f"<div class='bar' style='width:{prog:.1f}%'></div></body></html>")

def titulo(v):
    return (f"<!doctype html><html lang='es-CL'><meta charset='utf-8'><style>{CSS}</style><body><div class='t'><div class='k'>Microvideo · Módulo {v['module']}</div>"
            f"<h1>{esc(v['title'])}</h1><p>IA para trabajar mejor · Dibork Learning</p></div></body></html>")

SHOT_JS = r"""
const { chromium } = require('playwright-core'); const fs = require('fs');
(async () => { const exe = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
 const b = await chromium.launch({ executablePath: exe }); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
 for (const f of JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))) { await p.goto('file://' + f[0]); await p.screenshot({ path: f[1] }); }
 await b.close(); })();
"""

def run(cmd): subprocess.run(cmd, check=True)
def dur(p): return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", p], capture_output=True, text=True).stdout)
def sha(p):
    h = hashlib.sha256(); h.update(open(p, "rb").read()); return h.hexdigest()
def norm(w):
    w = unicodedata.normalize("NFD", w.lower()); return re.sub(r"[^a-z0-9]", "", "".join(c for c in w if unicodedata.category(c) != "Mn"))
def ts(t): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f"{h:02d}:{m:02d}:{s:06.3f}"

def alinear(model, audio, texto, offset):
    """Cues por frase: tiempos medidos desde las palabras reconocidas en el audio final; texto del guion."""
    import numpy as np
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", audio, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
    segs, _ = model.transcribe(np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0, language="es", word_timestamps=True)
    words = [w for s in segs for w in s.words]
    asr = [norm(w.word) for w in words]
    frases = [f.strip() for f in re.split(r"(?<=[.!?])\s+", texto) if f.strip()]
    toks, owner = [], []
    for i, f in enumerate(frases):
        for w in f.split(): toks.append(norm(w)); owner.append(i)
    sm = difflib.SequenceMatcher(a=toks, b=asr, autojunk=False)
    t_ini, t_fin = {}, {}
    for a0, b0, n in sm.get_matching_blocks():
        for k in range(n):
            fi = owner[a0 + k]; w = words[b0 + k]
            t_ini.setdefault(fi, w.start); t_fin[fi] = w.end
    cues, prev_end = [], 0.0
    total = dur(audio)
    for i, f in enumerate(frases):
        a = t_ini.get(i, prev_end); b = t_fin.get(i, a + 1.5)
        if i + 1 < len(frases) and (i + 1) in t_ini: b = max(b, min(t_ini[i + 1] - 0.05, b + 0.6))
        b = min(b + 0.25, total)
        cues.append([offset + a, offset + b, f]); prev_end = b
    for i in range(len(cues) - 1):  # sin solapamientos entre frases
        cues[i][1] = min(cues[i][1], cues[i + 1][0] - 0.04)
    return [tuple(c) for c in cues]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fuente", default=os.path.join(RAIZ, "autoria_privada", "CURSO_05_IA_ULTRA_CLAUDE_v3"))
    ap.add_argument("--videos", default="IATU-VID01")
    ap.add_argument("--node-modules", default=os.environ.get("NODE_PATH", ""))
    ap.add_argument("--estado", default="muestra_para_aprobacion")
    a = ap.parse_args()
    g = json.load(open(os.path.join(a.fuente, "05_AUDIO_VIDEO", "IATU_Guion_multimedia_v3.json"), encoding="utf-8"))
    specs = json.load(open(os.path.join(RAIZ, "herramientas", "videos_escenas.json"), encoding="utf-8"))["escenas"]
    reg_a = {p["id"]: p for p in json.load(open(os.path.join(RAIZ, "curso", "media", "audio", "registro_audio.json"), encoding="utf-8"))["pistas"]}
    os.makedirs(VIDEO, exist_ok=True)
    reg_v_path = os.path.join(VIDEO, "registro_video.json")
    reg_v = json.load(open(reg_v_path, encoding="utf-8")) if os.path.exists(reg_v_path) else {"videos": {}}
    from faster_whisper import WhisperModel
    model = WhisperModel(os.environ.get("WM", "small"), device="cpu", compute_type="int8")
    for vid in a.videos.split(","):
        v = next(x for x in g["videos"] if x["id"] == vid)
        faltan = [s["id"] for s in v["scenes"] if s["id"] not in reg_a]
        if faltan: print(vid, "sin locución para", faltan, "— se omite"); continue
        tmp = tempfile.mkdtemp(prefix=vid)
        jobs, n = [], len(v["scenes"])
        open(os.path.join(tmp, "t.html"), "w", encoding="utf-8").write(titulo(v)); jobs.append([os.path.join(tmp, "t.html"), os.path.join(tmp, "t.png")])
        for i, s in enumerate(v["scenes"], 1):
            for st in (1, 2):
                f = os.path.join(tmp, f"s{i}_{st}.html")
                open(f, "w", encoding="utf-8").write(pagina(v, s, i, specs[s["id"]], st, n, 100 * (i - 1 + (0.4 if st == 1 else 1)) / n))
                jobs.append([f, f[:-5] + ".png"])
        jf = os.path.join(tmp, "jobs.json"); json.dump(jobs, open(jf, "w"))
        js = os.path.join(tmp, "shot.js"); open(js, "w").write(SHOT_JS)
        env = dict(os.environ, NODE_PATH=a.node_modules)
        subprocess.run(["node", js, jf], check=True, env=env)
        clips, cues, t0 = [], [], TITULO_S
        # Tarjeta de título (silencio breve)
        c0 = os.path.join(tmp, "c0.mp4")
        run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-t", str(TITULO_S), "-i", os.path.join(tmp, "t.png"), "-f", "lavfi", "-t", str(TITULO_S), "-i", "anullsrc=r=24000:cl=mono",
             "-vf", "fade=t=in:st=0:d=0.4,format=yuv420p", "-r", "25", "-c:v", "libx264", "-crf", "22", "-preset", "medium", "-c:a", "aac", "-b:a", "64k", "-shortest", c0])
        clips.append(c0)
        for i, s in enumerate(v["scenes"], 1):
            au = os.path.join(RAIZ, "curso", reg_a[s["id"]]["archivo"])
            d = dur(au) + 0.7
            t1 = max(1.2, round(d * 0.35, 2))
            ci = os.path.join(tmp, f"c{i}.mp4")
            run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-t", str(t1 + 0.5), "-i", os.path.join(tmp, f"s{i}_1.png"), "-loop", "1", "-t", str(d - t1 + 0.5), "-i", os.path.join(tmp, f"s{i}_2.png"),
                 "-i", au, "-filter_complex", f"[0][1]xfade=transition=fade:duration=0.5:offset={t1},format=yuv420p,trim=duration={d}[v];[2]adelay=250|250,apad,atrim=duration={d}[a]",
                 "-map", "[v]", "-map", "[a]", "-r", "25", "-c:v", "libx264", "-crf", "22", "-preset", "medium", "-c:a", "aac", "-b:a", "64k", "-ac", "1", ci])
            cues += alinear(model, au, s["narration"], t0 + 0.25)
            clips.append(ci); t0 += dur(ci)
        lst = os.path.join(tmp, "l.txt"); open(lst, "w").write("".join(f"file '{c}'\n" for c in clips))
        out = os.path.join(VIDEO, vid.lower() + ".mp4")
        run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", "-movflags", "+faststart", out])
        vtt = os.path.join(VIDEO, vid.lower() + ".es-CL.vtt")
        with open(vtt, "w", encoding="utf-8") as f:
            f.write("WEBVTT\n\n")
            for k, (x, y, txt) in enumerate(cues, 1): f.write(f"{k}\n{ts(x)} --> {ts(y)}\n{txt}\n\n")
        txt = os.path.join(VIDEO, vid.lower() + ".txt")
        with open(txt, "w", encoding="utf-8") as f:
            f.write(v["title"] + "\n\n" + "\n\n".join(f"Escena {i}. {s['visible_text']}\nNarración: {s['narration']}\nVisual: {s['description']}" for i, s in enumerate(v["scenes"], 1)) + "\n")
        poster = os.path.join(VIDEO, vid.lower() + "-poster.webp")
        run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(tmp, "s1_2.png"), "-vf", "scale=960:-1", "-quality", "80", poster])
        reg_v["videos"][vid] = {"archivo": "media/video/" + os.path.basename(out), "vtt": "media/video/" + os.path.basename(vtt), "poster": "media/video/" + os.path.basename(poster),
                                "duracion_medida_s": round(dur(out), 2), "bytes": os.path.getsize(out), "sha256": sha(out), "resolucion": f"{W}x{H}", "fps": 25,
                                "voz": json.load(open(os.path.join(RAIZ, "curso", "media", "audio", "registro_audio.json"), encoding="utf-8"))["voz"].get("nombre", "ver registro_audio.json"), "estado": a.estado,
                                "subtitulos": "VTT por frase, tiempos medidos sobre el audio final (Whisper, palabras); texto del guion. Revisar en reproducción.",
                                "licencia_visual": "Composiciones HTML propias del curso; iconografía y tipografía del sistema."}
        print(vid, reg_v["videos"][vid]["duracion_medida_s"], "s", reg_v["videos"][vid]["bytes"] // 1024, "KiB")
    json.dump(reg_v, open(reg_v_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()
