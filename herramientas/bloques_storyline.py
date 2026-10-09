#!/usr/bin/env python3
"""Agrupa las 328 locuciones en bloques de hasta 3.000 caracteres (límite de texto a voz de Storyline / Articulate),
en orden del curso y sin cruzar módulos ni partir una pantalla. Escribe:
  herramientas/storyline_bloques.json   (lo usa herramientas/cortar_grupos.py --bloques storyline)
  dist/voces_storyline/                 (un .txt por bloque, índice CSV e instrucciones) y su ZIP
Los segmentos se separan con una línea en blanco: la pausa natural entre párrafos basta para cortar."""
import argparse, csv, json, os, re, shutil, zipfile
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MAX = 2950  # margen bajo 3.000
G = json.load(open(os.path.join(RAIZ, "herramientas", "elevenlabs_grupos.json"), encoding="utf-8"))
seg = {s["id"]: s for g in G for s in g["segmentos"]}
secciones = [("ORI", ["IATU-BIENVENIDA", "IATU-COMO_ESTUDIAR", "IATU-RUTAS", "IATU-CIERRE_CURSO"])]
for m in range(1, 17):
    ids = [f"IATU-M{m:02d}-INTRO"] + [f"IATU-M{m:02d}-L{l:02d}-P0{p}" for l in range(1, 5) for p in range(1, 5)] + [f"IATU-M{m:02d}-CIERRE"]
    secciones.append((f"M{m:02d}", ids))
secciones.append(("VID", [f"IATU-VID{v:02d}-S0{s}" for v in range(1, 13) for s in range(1, 4)]))
SEP = "\n\n"

# ---------- Lectura de códigos para voz IA (pedido de Diego, 9-oct-2026) ----------
# «NX-14» → «ene equis 14», «N4» → «ene 4», «POL-A» → «pol a», «CASO-1» → «caso 1». Los números siguen siendo números.
LETRAS = {"A": "a", "B": "be", "C": "ce", "D": "de", "E": "e", "F": "efe", "G": "ge", "H": "hache", "I": "i", "J": "jota", "K": "ka",
          "L": "ele", "M": "eme", "N": "ene", "Ñ": "eñe", "O": "o", "P": "pe", "Q": "cu", "R": "erre", "S": "ese", "T": "te", "U": "u",
          "V": "ve", "W": "doble ve", "X": "equis", "Y": "ye", "Z": "zeta"}
SIGLAS = {"CSV": "ce ese ve", "JSON": "yeison", "XLSX": "equis ele ese equis", "ID": "i de", "IDs": "i des", "SLA": "ese ele a",
          "LMS": "ele eme ese", "COUNTA": "caunt a", "PDF": "pe de efe", "URL": "u erre ele"}
def _parte(p):
    if p.isdigit(): return p
    m = re.fullmatch(r"([A-ZÑ]+)(\d+)", p)
    if m: return _parte(m.group(1)) + " " + m.group(2)
    if len(p) >= 3 and re.search(r"[AEIOU]", p): return p.lower()          # palabra pronunciable: CASO, NEXO, POL
    return " ".join(LETRAS.get(ch, ch) for ch in p)                        # sigla deletreada: NX, RC, S
def deletrear(t):
    t = re.sub(r"\b([A-Z]{1,2}\d+):([A-Z]{1,2}\d+)\b", r"\1 a \2", t)          # rangos de celdas B2:B5 → B2 a B5
    t = re.sub(r"=(?=[A-Z]{2,})", "igual a ", t)                               # =COUNTIF( → igual a COUNTIF(
    t = t.replace("AVERAGEIF", "average if").replace("COUNTIF", "caunt if").replace("IF(", "if(")
    t = re.sub(r"(?<![\w-])(IDs|ID|CSV|JSON|XLSX|SLA|LMS|COUNTA|PDF|URL)(?![\w-])", lambda m: SIGLAS[m.group(1)], t)
    t = re.sub(r"(?<![\w-])v(\d+)(?![\w-])", lambda m: "ve " + m.group(1), t)
    t = re.sub(r"(?<![\w-])([A-ZÑ]{1,6}(?:-[A-Z0-9]+)+|[A-ZÑ]{1,3}\d+)(?![\w-])", lambda m: " ".join(_parte(x) for x in m.group(1).split("-")), t)
    return t
bloques = []
for pref, ids in secciones:
    cur, n = [], 1
    def cerrar():
        global cur
    for i in ids:
        s = seg[i]
        largo = len(SEP.join([x["oral"] for x in cur] + [s["oral"]]))
        if cur and largo > MAX:
            bloques.append({"grupo": f"{pref}-B{n:02d}", "segmentos": cur}); cur, n = [], n + 1
        cur.append(s)
    if cur: bloques.append({"grupo": f"{pref}-B{n:02d}", "segmentos": cur})
ap = argparse.ArgumentParser()
ap.add_argument("--desde", type=int, default=1, help="Bloques anteriores a este número se conservan tal como ya se grabaron")
ap.add_argument("--zip-desde", type=int, default=1, help="El ZIP incluye solo los bloques desde este número")
A = ap.parse_args()
previo = []
pj = os.path.join(RAIZ, "herramientas", "storyline_bloques.json")
if A.desde > 1 and os.path.exists(pj): previo = json.load(open(pj, encoding="utf-8"))
final = []
for k, b in enumerate(bloques, 1):
    if k < A.desde and k <= len(previo):
        final.append(previo[k - 1]); continue
    segs = [dict(x, oral=deletrear(x["oral"]), cambios=x.get("cambios", []) + (["códigos deletreados para voz"] if deletrear(x["oral"]) != x["oral"] else [])) for x in b["segmentos"]]
    # si al deletrear el bloque supera 3.000 caracteres, se divide en a/b sin partir pantallas
    parts, cur = [], []
    for x in segs:
        if cur and len(SEP.join([y["oral"] for y in cur] + [x["oral"]])) > MAX: parts.append(cur); cur = []
        cur.append(x)
    parts.append(cur)
    for j, pp in enumerate(parts):
        final.append({"grupo": b["grupo"] + ("abcdef"[j] if len(parts) > 1 else ""), "segmentos": pp})
bloques = final
for b in bloques:
    b["prompt"] = SEP.join(s["oral"] for s in b["segmentos"]); b["chars"] = len(b["prompt"])
    assert b["chars"] <= 3000, b["grupo"]
json.dump(bloques, open(os.path.join(RAIZ, "herramientas", "storyline_bloques.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

out = os.path.join(RAIZ, "dist", "voces_storyline")
shutil.rmtree(out, ignore_errors=True); os.makedirs(os.path.join(out, "bloques"))
with open(os.path.join(out, "INDICE_BLOQUES.csv"), "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f, delimiter=";"); w.writerow(["n", "archivo_mp3_esperado", "caracteres", "pantallas"])
    for k, b in enumerate(bloques, 1):
        if k < A.zip_desde: continue
        open(os.path.join(out, "bloques", f"{k:02d}_{b['grupo']}.txt"), "w", encoding="utf-8").write(b["prompt"] + "\n")
        w.writerow([k, b["grupo"] + ".mp3", b["chars"], " ".join(s["id"] for s in b["segmentos"])])
total = sum(b["chars"] for b in bloques)
open(os.path.join(out, "LEEME_VOCES.txt"), "w", encoding="utf-8").write(f"""VOCES DEL CURSO 5 · IA PARA TRABAJAR MEJOR
{len(bloques)} bloques · {f"{total:,}".replace(",", ".")} caracteres · máximo {max(b['chars'] for b in bloques)} por bloque (límite 3.000)

1. Usa la MISMA voz y los MISMOS ajustes para todos los bloques (velocidad, estabilidad, estilo).
   Recomendación: genera primero el bloque 01 y escúchalo completo antes de seguir.
2. Abre cada archivo de la carpeta "bloques" en orden, copia TODO el texto y pégalo tal cual
   (incluye las líneas en blanco: marcan la pausa entre pantallas; no agregues títulos ni números).
3. Genera una sola toma por bloque y expórtala en MP3 con el nombre de la columna
   "archivo_mp3_esperado" de INDICE_BLOQUES.csv (por ejemplo ORI-B01.mp3, M01-B01.mp3).
   Si la herramienta no exporta MP3, sirve WAV o M4A con el mismo nombre.
4. Súbeme los archivos (o la carpeta comprimida). Yo los corto automáticamente en las 328 pistas,
   normalizo el volumen, genero subtítulos y reviso cada pista con reconocimiento de voz
   (palabras omitidas, negaciones y cifras).

Notas
- Los textos ya vienen adaptados para lectura oral (por ejemplo "dieciséis horas", "C1 a C4").
  No cambies cifras ni negaciones.
- Si un bloque sale con un error de pronunciación, basta regenerar ese bloque con el mismo nombre.
- Los bloques VID-* son la narración de los 12 microvideos; con ellos vuelvo a renderizar los videos.
""" + (f"""
ESTA ENTREGA: bloques {A.zip_desde:02d} a {len(bloques):02d}. Los anteriores ya están grabados y no cambian.
Los códigos ahora vienen escritos como se dicen (NX-14 → «ene equis 14», N4 → «ene 4», POL-A → «pol a»).
Tres bloques quedaron divididos en dos (sufijos a y b) para no pasar de 3.000 caracteres al deletrear.
""" if A.zip_desde > 1 else ""))
z = os.path.join(RAIZ, "dist", "IATU_C05_voces_storyline_bloques" + (f"_desde_{A.zip_desde:02d}" if A.zip_desde > 1 else "") + ".zip")
with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
    for r, _, fs in os.walk(out):
        for fn in fs:
            p = os.path.join(r, fn); zf.write(p, os.path.relpath(p, os.path.dirname(out)))
print(len(bloques), "bloques;", total, "caracteres; máx", max(b["chars"] for b in bloques), "->", z)
