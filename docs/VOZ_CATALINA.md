# Voz en off · Catalina (es-CL)

## Qué voz se usó
| Campo | Valor |
|---|---|
| Nombre | Catalina |
| `voice_id` | `es-CL-CatalinaNeural` |
| Proveedor | Microsoft (Azure AI Speech, voz neuronal) |
| Tipo | **Sintética (TTS)**, no es una grabación humana; así se rotula en el curso |
| Idioma | Español de Chile, femenina |
| Canal usado para la muestra | Servicio de lectura de Microsoft Edge (paquete `edge-tts`): sin cuenta, sin créditos |
| Licencia para publicar | **Pendiente.** El canal de muestra sirve para revisar, no confirma uso comercial. Para el lote final: Azure Speech con la cuenta de Dibork (misma voz) o la cuenta de Articulate/ElevenLabs donde Dibork tenga su «Catalina» |
| Aprobación de la muestra | **Pendiente de escucha de Diego** |

Diego indicó que su Catalina venía de Articulate o ElevenLabs. No pude confirmar desde aquí si es la misma voz de Microsoft. Si Articulate la ofrece, lo más probable es que sea esta; ElevenLabs tiene una biblioteca distinta. La forma de saberlo es comparar al oído la muestra `curso/media/audio/muestras/muestra-guia-voz-catalina.mp3` con la referencia. Si la voz aprobada es otra, `herramientas/tts_lote.py --backend archivos --entrada <carpeta>` integra MP3 exportados de esa herramienta con los nombres del catálogo, sin cambiar nada más.

## Qué está producido
- La muestra de la guía de voz (32 s).
- 13 pistas de muestra en contexto: bienvenida, cómo estudiar, rutas, cierre del curso, introducción y cierre del M01, lección muestra M01-L03 (sus 4 pantallas) y las 3 escenas del VID01.
- El microvideo VID01 completo con esa voz.
- Todas: MP3 mono, 24 kHz, 64 kbps, sonoridad normalizada a -16 LUFS (pico -1,5 dBTP) y silencios recortados. Están registradas en `curso/media/audio/registro_audio.json` con la duración medida y los hashes del guion y del audio.

## Pronunciación: verificación objetiva
Probé términos de riesgo con reconocimiento de voz (Whisper, local) y con la duración de cada palabra que entrega el motor:

| Caso | Lectura sin adaptar | Decisión |
|---|---|---|
| `12/18` | «diciembre del 18» (como fecha) | Se lee «12 de 18» |
| `16:00` | «las cuatro» (ambiguo) | Se lee «dieciséis horas» |
| `C1–C4`, `1–6` | El guion largo no se pronunciaba | Se lee «C1 a C4» |
| `→` | Silencio | Se lee «y luego» |
| `I A` (separado) | «primera» (número romano) | Se mantiene «IA» tal cual |
| Dibork, Claude, Gemini, «prompts» | Dudoso por reconocimiento automático | **Escucha humana**; no se cambia la escritura |

Las adaptaciones quedan por ID en `curso/media/audio/adaptacion_oral.json`. El texto visible no cambia y las negaciones, cifras y pendientes se conservan.

Resultado de la QA automática de las 13 pistas (`curso/media/audio/qa_asr.json`): **similitud 0,955–1,000 con el guion y ninguna negación ni límite perdido**. Esto es un indicador; no reemplaza la escucha.

## Cómo producir el lote (cuando apruebes)
```bash
# Con licencia (recomendado): Azure Speech de Dibork
AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=... python3 herramientas/tts_lote.py --set todo --backend azure --estado generado_pendiente_escucha
# QA automática y luego los 11 videos restantes
python herramientas/qa/qa_audio_asr.py
python3 herramientas/render_videos.py --videos IATU-VID02,IATU-VID03,...,IATU-VID12
python3 herramientas/build_publico.py && python3 herramientas/empaquetar_scorm.py
```
Duración estimada del lote: 328 pistas, unas 2,6 horas de audio. En el curso, el audio es opcional, no se reproduce solo y siempre está el texto completo.
