#!/usr/bin/env bash
# Ejecuta todas las pruebas automáticas y guarda la evidencia en docs/qa/.
# Requisitos: Python 3.10+, Node 18+, playwright-core y scorm-again en NODE_PATH, Chromium, ffmpeg.
# Uso: NODE_PATH=/ruta/node_modules bash herramientas/qa/ejecutar_todo.sh
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$RAIZ"
QA="$RAIZ/docs/qa"; mkdir -p "$QA"; TMP="$(mktemp -d)"
python3 herramientas/build_publico.py > "$QA/build_publico.json"
python3 herramientas/empaquetar_scorm.py > "$QA/empaquetado.txt"; cp dist/informe_empaquetado.json "$QA/"
( cd curso && python3 -m http.server 8765 >/dev/null 2>&1 & echo $! > "$TMP/p1" )
mkdir -p "$TMP/lms/lms2004" "$TMP/lms/lms12"
SA="$(node -e "console.log(require.resolve('scorm-again/dist/scorm-again.min.js'))")"
for e in 2004 12; do cp herramientas/qa/lms/lms_simulado.html "$SA" "$TMP/lms/lms$e/"; done
ln -s "$RAIZ/dist/IATU_C05_SCORM2004_4ed_v3.0.0" "$TMP/lms/lms2004/paquete"; ln -s "$RAIZ/dist/IATU_C05_SCORM12_v3.0.0" "$TMP/lms/lms12/paquete"
( cd "$TMP/lms" && python3 -m http.server 8766 >/dev/null 2>&1 & echo $! > "$TMP/p3" )
sleep 2
set +e
node herramientas/qa/prueba_interacciones.js http://localhost:8765 "$TMP" > "$QA/interacciones.txt" 2>&1
node herramientas/qa/prueba_recorrido.js http://localhost:8765 "$QA/recorrido.json" > /dev/null 2>&1
node herramientas/qa/prueba_scorm.js http://localhost:8766/lms2004 "$QA" > "$QA/scorm.txt" 2>&1
set -e
for f in p1 p3; do kill "$(cat "$TMP/$f")" 2>/dev/null || true; done
for f in interacciones scorm; do echo "$f: $(tail -1 "$QA/$f.txt")"; done
echo "recorrido: $(grep -c '"OK"' "$QA/recorrido.json") OK de $(grep -c '"resultado"' "$QA/recorrido.json")"
