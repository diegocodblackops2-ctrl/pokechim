# Retomar el Curso 5 en local (para Claude Code)

Rama: `claude/curso-5-ia-trabajo-3dg6h1` del repo `diegocodblackops2-ctrl/pokechim`. Todo el código, los datos públicos, las 328 voces cortadas, las imágenes y la documentación están en git.

## 1. Lo que NO está en git (copiarlo antes de empezar)
| Qué | Dónde va | De dónde sale |
|---|---|---|
| Paquete maestro v3 (`Curso_5_IA_ULTRA_Paquete_FINAL_para_Claude_v3.zip`) | descomprimir en `autoria_privada/CURSO_05_IA_ULTRA_CLAUDE_v3/` | lo tiene Diego (es el ZIP del inicio) |
| `proyecto_auto_v1.json` (pauta del proyecto, con respuestas) | `autoria_privada/` | `IATU_C05_privado_para_retomar.zip` |
| `pauta_docente.json` (vista del profesor en el LMS) | `dist/lms_proyecto/` | mismo ZIP, o `python3 herramientas/paquete_docente.py` |
| Tomas WAV de Storyline (A1–A63) | `originales_medios/audio/storyline_zip/` | los ZIP VOCES_1…12 y VOCES_LASY de Diego |
`autoria_privada/`, `dist/`, `originales_medios/` y `curso/data/eval.js` están en `.gitignore` a propósito: el repo es público y contienen claves.

## 2. Herramientas
- Python 3.10+ con `pip install faster-whisper numpy` (el modelo `small` se descarga solo la primera vez).
- Node 18+ con `npm i playwright-core scorm-again` en una carpeta y `NODE_PATH` apuntando a su `node_modules`.
- Chromium (Playwright) y `ffmpeg` en el PATH.

## 3. Comandos
```bash
python3 herramientas/build_publico.py        # datos públicos + eval.js ofuscado (aplica correcciones_estilo.json)
python3 herramientas/empaquetar_scorm.py     # dist/IATU_C05_SCORM2004_4ed_v3.0.0.zip y SCORM12
NODE_PATH=… bash herramientas/qa/ejecutar_todo.sh   # build + empaquetado + 3 pruebas (hoy: 32/32, 44/44, 9/9)
```

## 4. Estado al 9-oct-2026
- Voces: las 63 tomas de Storyline están cortadas en 328 pistas (×0,95, MP3 mono 24 kbps, 22 kHz, −16 LUFS; el SCORM completo pesa ~27 MB). Similitud media con el guion: 0,973.
- Redacción: `herramientas/correcciones_estilo.json` (271 reglas) corrige calcos, anglicismos, palabras pegadas, plantillas y notas internas visibles. El maestro no se toca. «Prompt» se define en M02-L01-P01 y se usa desde ahí. El módulo 2 se llama «Ingeniería de prompts: instrucciones que funcionan».
- Proyecto: lo califica un profesor en el LMS (`config.js › proyecto.correccion = "docente"`). Contrato en `docs/INTEGRACION_PROYECTO_LMS.md`.
- Portada, ficha y datos del formulario del LMS: `docs/FICHA_CURSO_LMS.md` y `dist/ficha_lms/` (regenerables).

## 5. Pendientes, en orden
1. **Voces de corrección:** Diego graba `dist/IATU_C05_voces_correccion.zip` (22 bloques COR-B01…COR-B22, 95 pantallas cuyo texto cambió). Para regenerar ese ZIP: `python3 herramientas/bloques_correccion.py`. Al recibir los WAV:
   ```bash
   mkdir -p originales_medios/audio/correccion_x095
   for f in <carpeta>/COR-B*.wav; do ffmpeg -v error -y -i "$f" -af atempo=0.95 -ar 22050 -ac 1 originales_medios/audio/correccion_x095/$(basename "$f"); done
   python3 herramientas/cortar_grupos.py --bloques correcciones --entrada originales_medios/audio/correccion_x095 --voz "Articulate Storyline · voz IA (es) · ×0,95"
   ```
   Usar EXACTAMENTE ese `--voz`: si cambia, el registro se reinicia y se pierden las otras pistas.
2. **Regrabar 3 pistas con error de voz** (el reconocimiento con el modelo `medium` lo confirma):
   - `IATU-M06-L02-P03`: la voz dice «plus» en vez de «más».
   - `IATU-M03-L02-P03`: lo mismo.
   - `IATU-M09-L03-P03`: omite «dividido por» en las fórmulas.

   Lo más simple es incluirlas en un bloque de corrección o grabarlas sueltas y cortarlas igual.
3. **Escuchar las pistas con similitud < 0,90** de `curso/media/audio/qa_asr.json`. Casi todas son diferencias del reconocimiento automático, por ejemplo «ce 1» transcrito como «C1» o «cuarenta» como «40», no errores de voz.
4. **Re-renderizar los 12 videos con la voz nueva** (paleta violeta lista):
   `NODE_PATH=… python3 herramientas/render_videos.py --videos IATU-VID01,IATU-VID02,…,IATU-VID12 --estado produccion`
5. **Música (opcional):** prompts en `docs/locucion/MUSICA_PROMPTS.md`. Dejar los MP3 en `curso/media/music/` (`iatu-musica-01-laboratorio.mp3`…), recomprimir a 96 kbps y reconstruir. El botón aparece solo.
6. **Agente del LMS:** implementar la bandeja y la vista del profesor según `docs/INTEGRACION_PROYECTO_LMS.md` y cargar `pauta_docente.json` solo en la vista docente.
7. **Pruebas en el LMS real:** checklist de `docs/INTEGRACION_DIBORK.md` §6 (reanudar, nota, entrega y calificación del proyecto).
8. **Peso:** el SCORM pesa ~27 MB (22 MB de audio a 24 kbps). Las pistas nuevas salen a 24 kbps (`KBPS` en `cortar_grupos.py`).
9. Revisión humana final de redacción, con `scratchpad` como apoyo: volcar el texto con un script que recorra `curso/data/*.js`.

## 6. Reglas que siguen vigentes
- No publicar en producción, gastar créditos, clonar voces ni cambiar infraestructura, permisos o almacenamiento (Firebase/GCS) sin autorización.
- No subir `eval.js`, la pauta ni el maestro al repo público. El banco va ofuscado dentro del SCORM: no es seguridad.
- No presentar la voz sintética como humana. No usar `speechSynthesis` del navegador.
- Los commits terminan con las líneas de coautoría de la sesión.
