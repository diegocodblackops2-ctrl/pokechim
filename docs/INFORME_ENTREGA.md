# Informe de entrega · Curso 5 «IA para trabajar mejor» · 9-oct-2026

## Qué quedó construido
- **Curso completo implementado** con el contenido íntegro del maestro v3: orientación con diagnóstico de 16 situaciones, 16 módulos, 64 lecciones, 256 pantallas, 32 talleres con producto, pauta, modelo, variante y las 96 devoluciones corregidas, 3 casos ramificados con reparación, biblioteca (24 encargos comparados, 10 plantillas rellenables y descargables, 3 auditorías, glosario, 42 fuentes, documentos de casos y descargas del participante), evaluación, proyecto, transferencia y cierre.
- **Identidad propia, «Laboratorio de criterio»**: tinta, papel cálido y teal discreto. Los expedientes aparecen como documentos con líneas etiquetadas (E1, F2…), con sellos «Ficticio», encabezados de módulo con número grande e imagen, tema oscuro, tres tamaños de texto y modo sin movimiento. Usa tipografía del sistema e iconos Lucide (ISC) para los 24 roles.
- **Interactividad con propósito** (detalle en `MAPA_PRODUCCION.md`):
  - 16 clasificaciones: arrastre desde el asa, «Mover a…», tocar tarjeta y luego destino, y deshacer. Las tres vías llegan al mismo estado.
  - 7 secuencias que aceptan cualquier orden válido y explican qué dependencia falta.
  - 1 secuencia con ramas (M14) que evalúa solo la rama elegida.
  - 8 comparaciones X/Y/Z con cálculos: aceptan coma decimal, negativos y conjuntos sin importar el orden.
  - 32 micro-decisiones con microproducto (la referencia se desbloquea al escribir).
  - 32 tarjetas reversibles con predicción opcional.
  - 8 hotspots anclados a documentos HTML, con lista equivalente.
  - Anotación personal por pantalla y descarga de la evidencia del módulo.
- **Evaluación seria y protegida.** El banco A/B de 128 unidades se sirve desde un servicio autorizado y nunca llega al navegador. La corrección es 3+2 por unidad, con devolución por situación tras entregar la forma completa. El proyecto queda «pendiente de revisión» hasta que lo revise una persona con la rúbrica C1–C4. Resultado: 40/60, global ≥ 80 y proyecto ≥ 75. Se entrega un servicio de referencia y una herramienta para quien revisa.
- **SCORM 2004 multi-SCO real (18 SCO)** con secuenciación que bloquea la evaluación hasta completar los 17 módulos, y **SCORM 1.2 separado** con sus límites declarados.
- **Voz:** Catalina `es-CL-CatalinaNeural`, con muestra y lección muestra producidas, adaptación oral verificada y producción del lote lista para un comando. Ver `VOZ_CATALINA.md`.
- **Microvideo VID01 producido:** composiciones del curso, voz y subtítulos medidos sobre el audio final. Los otros 11 tienen sus composiciones escritas en `herramientas/videos_escenas.json`.
- **Imágenes con personas:** a pedido de Diego, se reescribieron 29 briefs ambientales para mostrar personas adultas ficticias trabajando, con lo que quedan 31 de 60 con personas. 6 imágenes integradas en WebP y 10 generadas en Canva sin exportar.

## Pruebas ejecutadas (evidencia en `docs/qa/`)
| Suite | Resultado | Cubre |
|---|---|---|
| Interacciones | 32/32 | Las 4 familias, alternativa sin arrastre, teclado, persistencia, móvil a 360 px |
| Recorrido | 9/9 | 256 pantallas, talleres, casos, biblioteca, carga a demanda, primera carga de 501 KiB, foco visible |
| Evaluación + servicio | 26/26 | Puerta, forma A/B, sin claves en el cliente, reanudación, 3+2, proyecto, revisión, resultado y número de intentos |
| SCORM (LMS simulado) | 22/22 | 2004 y 1.2: inicio, guardado, reanudación, completitud, objetivos, guardado rechazado y límite de 4.096 |
| Locución (reconocimiento de voz) | 13 pistas | Similitud 0,955–1,0; ninguna negación perdida |

Ninguna de estas pruebas se hizo en Dibork Learning ni con personas reales: falta la validación en el LMS y el pilotaje.

## Decisiones tomadas (y por qué)
1. **El repositorio `pokechim` es público.** Por eso el banco con claves, las soluciones de proyectos y el maestro completo quedan fuera de git (`.gitignore`). El build y el empaquetador fallan si detectan material privado. **Recomendación: pasar el repositorio a privado**, porque igual contiene el curso vendible.
2. **Las claves formativas sí viajan al cliente**, porque el maestro las declara publicadas («claves y rúbrica publicadas»). Las claves del examen nunca.
3. **Sin servicio no hay examen formal.** Ocultar claves no es seguridad; sin servicio, la evaluación muestra el bloqueo y su motivo.
4. **Voz:** se produjo solo la muestra, como pide la guía. El lote se produce cuando Diego apruebe la voz y su licencia.
5. **Referencia de calidad:** el curso de referencia «con voces chilenas» no estaba en el repositorio ni en Drive. No se inventó; se usaron como vara el prompt y los criterios del paquete.
6. **Observación editorial:** la unidad `IATU-M12-U02` del banco usa el mismo expediente que la práctica `IATU-M12-L01-P04`, así que el participante ya lo vio antes. Conviene variarla.

## Pendientes concretos (bloquean la publicación)
| Pendiente | Responsable | Cómo se cierra |
|---|---|---|
| Aprobar la voz Catalina y su licencia (o indicar otra) | Diego | Escuchar la muestra; definir Azure, Articulate o ElevenLabs. Luego un comando produce las 315 pistas restantes y los 11 videos |
| Imágenes: 4 tuyas sin archivo (003, 004, 006, 007), 10 en Canva sin exportar (011–020) y 40 por generar | Diego / Claude | Subir los archivos o autorizar a seguir con Canva |
| Servicio de corrección en la infraestructura de Dibork | Responsable del LMS | Implementar el contrato de `INTEGRACION_DIBORK.md` |
| Persona revisora de proyectos | Dibork | Asignar rol y flujo |
| Importación y pruebas en Dibork Learning (2004 y 1.2) | Responsable del LMS | Checklist de la sección 6 de `INTEGRACION_DIBORK.md` |
| Revisión de funciones y planes vigentes de ChatGPT, Claude y Gemini | Contenido | Fuentes oficiales con fecha (caso 004) |
| Lector de pantalla, medición WCAG, red limitada, memoria y dispositivos táctiles reales | QA | Casos parciales de `ACEPTACION_PRODUCCION.md` |
| Pilotaje: las 60 h siguen siendo una estimación | Dibork | Piloto con participantes |
