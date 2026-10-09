# Voz en off del Curso 5

## Estado (9-oct-2026)
| Tema | Estado |
|---|---|
| Voz Microsoft `es-CL-CatalinaNeural` | **Descartada** por Diego («muy robótica»). Se retiró del curso y del video VID01, cuyo archivo quedó fuera del paquete. |
| ElevenLabs «Catalina - Español Chileno» (`6Gr4AVmTax1pMJO0lHRK`, Eleven v4) | Se probó y se produjeron 22 pistas (orientación, M01 L01–L03, introducciones y cierres de M01–M03). La cuenta conectada llegó a su tope de **10.000 créditos al mes**, que corresponde al plan gratuito. **No usar en producción** sin confirmar un plan con uso comercial. Estas pistas son de prueba. |
| Voz definitiva | Diego graba **todas** las voces con una sola voz en **Storyline**, desde la bienvenida, para evitar cambios bruscos de timbre. |

La voz es sintética: así se rotula en el curso («voz sintética (es-CL)») y nunca se presenta como humana. No se usa la voz del navegador.

## Cómo se producen las 328 pistas
1. `herramientas/bloques_storyline.py` arma **63 bloques de ≤3.000 caracteres** en orden del curso, sin partir pantallas ni cruzar módulos. Cada uno queda en un `.txt` con un índice CSV del nombre esperado de cada MP3 (`ORI-B01.mp3`, `M01-B01.mp3`…).
2. Al texto oral se le aplican estas adaptaciones (el texto visible no cambia):
   - horas: «16:00» → «dieciséis horas»
   - rangos: «C1–C4» → «C1 a C4»
   - flechas: «→» → «y luego»
   - **códigos deletreados** (desde el bloque 07): «NX-14» → «ene equis 14», «N4» → «ene 4», «POL-A» → «pol a», «CASO-1» → «caso 1», «CSV» → «ce ese ve», «JSON» → «yeison»
   - rangos de celdas: «B2:B5» → «B2 a B5»
   - Los números siguen siendo números.
3. Diego genera una toma por bloque con la misma voz y los mismos ajustes, y exporta MP3 (o WAV/M4A) con el nombre del índice.
4. `python herramientas/cortar_grupos.py --entrada <carpeta> --voz "Storyline · <nombre de la voz>"` hace lo siguiente:
   - transcribe cada toma con Whisper local para obtener el tiempo de cada palabra;
   - corta en el silencio entre pantallas;
   - recorta y normaliza a −16 LUFS en MP3 mono de 64 kbps;
   - escribe el VTT de cada pista;
   - registra la pista en `curso/media/audio/registro_audio.json` y su control de calidad (similitud, negaciones afectadas, etiquetas leídas) en `qa_asr.json`.
5. `python3 herramientas/build_publico.py && python3 herramientas/empaquetar_scorm.py`.

Los bloques 01–06 se grabaron antes del deletreo; el cortador usa su texto original para que la alineación calce. Los bloques 02–04 incluyen «C1…C4», «F1…F4», «IDs» y «V1» sin deletrear: si suenan mal, conviene regrabarlos.

## Reproductor
- Sin reproducción automática; una sola pista activa a la vez.
- Velocidades ×0,75 · ×0,8 · ×0,9 · ×1 · ×1,1 · ×1,2 · ×1,25, que se recuerdan.
- Transcripción y ecualizador animado mientras suena.
- La música de fondo, si existe, baja sola durante la narración.

## Licencia
Debe ser la de la cuenta con que se generen las pistas (Articulate 360 o ElevenLabs de Dibork). Confirmar que permita el uso comercial en un curso antes de publicar.
