#!/usr/bin/env python3
"""Voces de corrección: solo las pantallas cuyo texto cambió con herramientas/correcciones_estilo.json.

Compara el texto oral de cada pantalla (herramientas/elevenlabs_grupos.json, antes del deletreo) con su versión corregida
(la misma capa de estilo que usa build_publico.py). Las pantallas con palabras distintas se agrupan en bloques de
≤ 2.950 caracteres, en orden del curso, con el mismo deletreo para voz IA. Escribe:
  herramientas/storyline_correcciones.json   (lo usa cortar_grupos.py --bloques correcciones)
  dist/voces_correccion/ y dist/IATU_C05_voces_correccion.zip
Uso: python3 herramientas/bloques_correccion.py"""
import csv, json, os, re, shutil, zipfile
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
H = os.path.join(RAIZ, "herramientas")
# capa de estilo (misma función que el build)
src = open(os.path.join(H, "build_publico.py"), encoding="utf-8").read()
ns = {"json": json, "os": os, "re": re, "__file__": os.path.join(H, "build_publico.py")}
exec(src[src.index("# ---------- Corrección de estilo"):src.index("def js_registro")], ns)
estilo = ns["estilo"]
# deletreo para voz (misma función que bloques_storyline.py)
src2 = open(os.path.join(H, "bloques_storyline.py"), encoding="utf-8").read()
ns2 = {"re": re, "json": json, "os": os, "__file__": os.path.join(H, "bloques_storyline.py")}
exec(src2[src2.index("SEP = "):src2.index("bloques = []")], ns2)
deletrear = ns2["deletrear"]
MAX, SEP = 2950, "\n\n"
palabras = lambda t: re.findall(r"[a-záéíóúñü0-9]+", t.lower())

G = json.load(open(os.path.join(H, "elevenlabs_grupos.json"), encoding="utf-8"))
orden = [s for g in G for s in g["segmentos"]]
cambios = []
for s in orden:
    if s["id"].startswith("IATU-VID"):
        continue  # las narraciones de video no cambian
    nuevo = estilo(s["oral"])
    if palabras(nuevo) != palabras(s["oral"]):
        cambios.append(dict(s, oral=deletrear(nuevo), antes=s["oral"]))

bloques, cur = [], []
for s in cambios:
    if cur and len(SEP.join([x["oral"] for x in cur] + [s["oral"]])) > MAX:
        bloques.append(cur); cur = []
    cur.append(s)
if cur: bloques.append(cur)
salida = [{"grupo": f"COR-B{i:02d}", "segmentos": [{"id": x["id"], "oral": x["oral"]} for x in b],
           "prompt": SEP.join(x["oral"] for x in b), "chars": len(SEP.join(x["oral"] for x in b))} for i, b in enumerate(bloques, 1)]
json.dump(salida, open(os.path.join(H, "storyline_correcciones.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

out = os.path.join(RAIZ, "dist", "voces_correccion")
shutil.rmtree(out, ignore_errors=True); os.makedirs(os.path.join(out, "bloques"))
with open(os.path.join(out, "INDICE_CORRECCION.csv"), "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f); w.writerow(["n", "bloque", "archivo_esperado", "caracteres", "pantallas"])
    for i, b in enumerate(salida, 1):
        w.writerow([i, b["grupo"], b["grupo"] + ".wav", b["chars"], " ".join(x["id"].replace("IATU-", "") for x in b["segmentos"])])
        open(os.path.join(out, "bloques", f"{i:02d}_{b['grupo']}.txt"), "w", encoding="utf-8").write(b["prompt"] + "\n")
open(os.path.join(out, "LEEME_CORRECCION.txt"), "w", encoding="utf-8").write(f"""VOCES DE CORRECCIÓN · CURSO 5
Al revisar la redacción del curso cambió el texto de {len(cambios)} pantallas. Para que la narración diga exactamente
lo mismo que la pantalla, graba estos {len(salida)} bloques con la MISMA voz y los MISMOS ajustes de las tomas anteriores.

1. Abre cada archivo de la carpeta «bloques», pega el texto completo en Storyline y genera la voz.
2. Nombra cada archivo como indica INDICE_CORRECCION.csv (COR-B01.wav, COR-B02.wav…). WAV o MP3 sirven.
3. Envíalos en un ZIP. Se cortan solos y reemplazan solo esas pantallas; el resto de las voces no cambia.
""")
z = os.path.join(RAIZ, "dist", "IATU_C05_voces_correccion.zip")
with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
    for base, _, files in os.walk(out):
        for fn in files:
            p = os.path.join(base, fn); zf.write(p, os.path.relpath(p, os.path.dirname(out)))
print(len(cambios), "pantallas en", len(salida), "bloques ·", sum(b["chars"] for b in salida), "caracteres ·", z)
