#!/usr/bin/env python3
"""Agrega iconos Lucide (ISC) al sprite curso/app/js/iatu-iconos.js sin tocar los existentes.
Uso: python3 herramientas/iconos_extra.py <ruta a lucide-static/icons>"""
import json, os, re, sys
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
P = os.path.join(RAIZ, "curso", "app", "js", "iatu-iconos.js")
NUEVOS = {"candado": "lock", "chispa": "sparkles", "cohete": "rocket", "trofeo": "trophy", "llama": "flame", "cerebro": "brain",
          "rayo": "zap", "diana": "target", "medalla": "award", "brujula": "compass", "red": "network", "cronometro": "timer",
          "ruta": "route", "estrella": "star", "flecha-arriba-der": "arrow-up-right", "jugar": "circle-play", "chat": "message-square-text",
          "escudo": "shield-check", "grafico": "chart-no-axes-column", "tablero": "layout-dashboard", "musica": "music", "sin-musica": "volume-x"}
src = open(P, encoding="utf-8").read()
svg = json.loads(src[src.index("=") + 1:].strip().rstrip(";"))
for nombre, luc in NUEVOS.items():
    if f'id="i-{nombre}"' in svg: continue
    body = open(os.path.join(sys.argv[1], luc + ".svg"), encoding="utf-8").read()
    inner = re.search(r"<svg[^>]*>(.*)</svg>", body, re.S).group(1).strip()
    inner = re.sub(r"\s+", " ", inner)
    sym = f'<symbol id="i-{nombre}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{inner}</symbol>\n'
    svg = svg.replace("</svg>", sym + "</svg>")
open(P, "w", encoding="utf-8").write("/* Sprite Lucide (ISC). Generado por herramientas (iconos_extra.py agrega los nuevos). */\nwindow.IATU_ICONOS=" + json.dumps(svg) + ";\n")
print("iconos:", svg.count("<symbol"))
