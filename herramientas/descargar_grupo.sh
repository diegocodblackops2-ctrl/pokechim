#!/bin/bash
# Uso: descargar_grupo.sh GRUPO URL  — descarga una toma de ElevenLabs y verifica que sea audio válido.
set -e
D="$(dirname "$0")/../originales_medios/audio/grupos"; mkdir -p "$D"
curl -sS -f -o "$D/$1.mp3" "$2"
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$D/$1.mp3")
echo "$1 ok ${dur}s"
