# Informe de entrega · Curso 5 «IA para trabajar mejor» · 9-oct-2026 (segunda iteración)

## Qué cambió en esta iteración (pedidos de Diego)
| Pedido | Qué se hizo |
|---|---|
| «Que sea bakán, que se mueva, morado, no azul ni verde» | Nueva identidad, **«Laboratorio nocturno de criterio»**: tinta violeta, auroras, fucsia y ámbar, tipografías Sora y Manrope (OFL, incluidas en el paquete). En la portada, una **red neuronal del programa**: 18 nodos (orientación, 16 módulos y evaluación) que se encienden con el avance real y llevan a cada sección. Además: título animado, subtítulo que se «escribe», tarjetas de módulo con imagen, inclinación y brillo, cabeceras de módulo con imagen viva y número gigante, aparición al hacer scroll, celebración con confeti al completar un módulo o aprobar. Todo se apaga con «Reducir movimiento». |
| «Que diga cuántas horas llevas, una línea con el progreso» | **Reloj de dedicación**: solo cuenta tiempo activo con la pestaña visible; se guarda en el LMS y se informa como `session_time`. **Línea de progreso** del programa en la barra superior, panel de avance en el mapa lateral, anillos por módulo, insignias, «continuar donde quedaste» y una **línea de recorrido** por módulo (lecciones → talleres → caso → cierre). |
| «Más actividades, realmente interactivo» | Se agregaron, todas con contenido real del maestro: escalera interactiva de los 4 niveles de uso; **predice antes de ver la resolución** (64 pantallas); **procedimiento paso a paso** (64 pantallas); **glosario vivo** (los términos se marcan en el texto y muestran su definición); carrusel con lo que permite cada lección. Se mantienen las 32 actividades, 32 tarjetas, 8 hotspots, 32 talleres y 3 casos. |
| «Examen bloqueado hasta completar todo; % y aprobado al LMS» | **Un solo SCO** (SCORM 2004 4.ª ed. recomendado y 1.2 como alternativa). Las situaciones aplicadas se abren solo con las 17 secciones completas: forma A en el primer intento y B en el segundo, 64 situaciones por forma, 3 + 2 puntos. El proyecto de desempeño (9 etapas, forma A y luego B) **se envía al LMS y lo califica un profesor** con la rúbrica C1–C4 (o lo devuelve con comentarios); la nota vuelve al curso. Nota global = 40 % situaciones + 60 % proyecto; aprueba con 80 o más, proyecto 75 o más y sin fallos críticos pendientes. Al LMS llegan `score.raw/scaled` (nota global), `success_status` (passed/failed), `completion_status`, `progress_measure`, objetivos por sección e interacciones. |
| «Las imágenes las puedes pedir a Canva; no tantas sin personas» | **60 de 60 imágenes** generadas en Canva, exportadas a resolución completa y convertidas a WebP con su variante móvil (3,7 MB en total). 31 tienen personas adultas ficticias trabajando y todas tienen acentos violeta. |
| «La voz Microsoft es robótica; todas las voces desde el inicio, sin cambios bruscos» | Se probó Catalina de ElevenLabs: la cuenta conectada llegó a su tope de 10.000 créditos tras 22 pistas. Diego decidió grabar **todas** las voces en Storyline con una sola voz. Se entregaron **63 bloques de ≤3.000 caracteres**, con los códigos escritos como se pronuncian («ene equis 14», «ce 1», «pol a»), y un **cortador automático** que separa cada MP3 en sus pantallas, normaliza, crea subtítulos y revisa cada pista con reconocimiento de voz. Se retiró la voz de Microsoft del curso. |
| «Velocidades ×0,75 a ×1,25» y «música de fondo con botón para silenciar» | Selector ×0,75 · ×0,8 · ×0,9 · ×1 · ×1,1 · ×1,2 · ×1,25, que se recuerda por persona. Botón de música en la barra superior (parte silenciado); la música baja sola cuando suena la narración o un video. Los prompts para 3 pistas están en `docs/locucion/MUSICA_PROMPTS.md`. |

## Pruebas (evidencia en `docs/qa/`, reproducible con `herramientas/qa/ejecutar_todo.sh`)
| Suite | Resultado | Cubre |
|---|---|---|
| Interacciones | 32/32 | Las 4 familias, alternativa sin arrastre, teclado, persistencia, examen bloqueado, móvil a 360 px sin scroll horizontal |
| Recorrido | 9/9 | 256 pantallas (con predicción y procedimientos abiertos), 32 talleres, 3 casos, biblioteca, carga a demanda, foco visible |
| SCORM (LMS simulado, 1 SCO) | 36/36 | 2004: inicio, guardado, reanudación, tiempo, objetivos por sección, puerta de 17 secciones, forma A reprobada → `failed`, forma B aprobada → `passed` con 95/100, interacciones, guardado rechazado. 1.2: estado, `session_time` y límite de 4.096 |
| Locución (reconocimiento de voz) | 22 pistas | Similitud 0,97–1,00; ninguna negación perdida; las etiquetas de dirección no se leen |

Ninguna prueba se hizo en Dibork Learning ni con personas reales.

## Decisiones (y por qué)
1. **Un solo SCO.** Lo pidió Diego y es lo más robusto: un solo registro, sin depender de la secuenciación del LMS. La puerta del examen la controla el curso.
2. **Banco ofuscado dentro del paquete.** Lo eligió Diego para tener el examen dentro del SCORM. Es ofuscación, no seguridad: quien tenga el ZIP y conocimientos técnicos puede leer las claves. El banco **nunca** se sube al repositorio, que es público (`curso/data/eval.js` está en `.gitignore`). Si más adelante hace falta seguridad real, se puede volver al servicio de corrección de referencia (`servicio-correccion/`).
3. **`cmi.exit = suspend` siempre.** Así la persona puede volver a ver su devolución y la biblioteca; la nota y el aprobado quedan registrados igual. Con «normal», varios LMS abren un intento nuevo y vacío.
4. **Voz.** No se usa voz del navegador ni se presenta la voz sintética como humana. Mientras no estén las pistas definitivas, cada pantalla muestra que su narración está pendiente y el texto completo sigue disponible.
5. **Repositorio público.** Sigue la recomendación de pasarlo a privado.

## Pendientes (bloquean la publicación)
| Pendiente | Responsable | Cómo se cierra |
|---|---|---|
| Grabar los 63 bloques de voz (Storyline) y entregarlos | Diego | Paquete `IATU_C05_voces_storyline_bloques*.zip`. Luego `python herramientas/cortar_grupos.py --entrada <carpeta> --voz "Storyline · <voz>"` y re-empaquetar |
| Re-render de los 12 microvideos con la voz definitiva | Claude | `herramientas/render_videos.py` (composiciones listas) en cuanto lleguen los bloques VID-* |
| Música de fondo (opcional) | Diego | Generar con `docs/locucion/MUSICA_PROMPTS.md`, dejar los MP3 en `curso/media/music/` y re-empaquetar |
| Revisión de funciones y planes vigentes de ChatGPT, Claude y Gemini | Contenido | Fuentes oficiales con fecha (caso 004) |
| Bandeja y vista del profesor en el LMS | Agente del LMS | Implementar `INTEGRACION_PROYECTO_LMS.md` (recepción, corrección con `pauta_docente.json`, devolución por `comments_from_lms`) |
| Importación y prueba en Dibork Learning | Responsable del LMS | Checklist de `INTEGRACION_DIBORK.md` |
| Lector de pantalla, medición WCAG, red limitada y dispositivos táctiles reales | QA | Casos parciales de `ACEPTACION_PRODUCCION.md` |
