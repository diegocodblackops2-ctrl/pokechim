# Matriz de aceptación de producción · estado real (9-oct-2026)

Fuente de los 48 casos: `07_QA_HERRAMIENTAS/IATU_Aceptacion_produccion.json` del paquete v3.
Estados: **Cumple (local)** = probado con evidencia en vista previa o LMS simulado · **Parcial** = probado en parte o con límite declarado · **Pendiente** = requiere LMS real, persona revisora, voz aprobada, imágenes o pilotaje.
"Local" nunca significa Dibork Learning: no hubo acceso al LMS real ni a matrículas de prueba.

Evidencia automática en `docs/qa/` (reproducible con `herramientas/qa/ejecutar_todo.sh`): interacciones 32/32, recorrido 9/9, SCORM de un solo SCO en LMS simulado 36/36 (incluye examen A/B, nota y aprobado).

| ID | Prueba | Estado | Observado / evidencia |
|---|---|---|---|
| 001 | Recorrido íntegro | Cumple (local) | Las 256 pantallas, 32 talleres y 3 casos se abren con su texto completo (`recorrido.json`). Texto íntegro del maestro v3, sin resumir. |
| 002 | Contexto visible | Cumple (local) | Expediente visible junto a cada actividad y a cada situación del examen (diseño en dos columnas). |
| 003 | Trazabilidad | Cumple (local) | IDs de pantalla, actividad, tarjeta, hotspot, audio, imagen y video conservados; el build cruza las referencias del maestro. |
| 004 | Datos de producto | Pendiente | No se investigaron funciones o planes vigentes de ChatGPT, Claude ni Gemini en esta producción (igual que en el paquete). Requiere revisión con fuentes oficiales y fecha antes de publicar. |
| 005 | Arrastre de tarjetas | Cumple (local, ratón) | Arrastre desde el asa sin capturar el desplazamiento de página; no duplica ni pierde tarjetas. Táctil real: pendiente en dispositivo. |
| 006 | Alternativa a arrastrar | Cumple (local) | «Mover a…» por tarjeta y tocar tarjeta → tocar destino, con deshacer; mismo estado y misma comprobación por ID. |
| 007 | Órdenes alternativos | Cumple (local) | Se valida cada relación antes/después (cualquier orden topológico); la devolución nombra la dependencia incumplida. |
| 008 | Ruta incierta M14 | Cumple (local) | Rama incierta A–B aceptada; la misma ruta rechazada para «envío confirmado». Se evalúa solo la rama elegida; no hay servicios reales. |
| 009 | Tarjetas reversibles | Parcial | Teclado y foco estable comprobados; cara oculta con `inert` y `aria-hidden`; modo sin giro. Falta prueba con lector de pantalla real. |
| 010 | Hotspots equivalentes | Cumple (local) | Zonas ancladas a bloques del documento HTML y lista equivalente con la misma devolución; en móvil se apilan. |
| 011 | Cambio de tamaño | Parcial | Sin coordenadas rígidas; reflujo a 360 px sin scroll horizontal. Rotación de dispositivo real: pendiente. |
| 012 | Avance sin clics ficticios | Cumple (local) | Girar tarjetas, abrir zonas, audio y video no cuentan para completar; requisitos = pantallas revisadas + prácticas con devolución revisada + talleres + casos. |
| 013 | Puerta de entrada | Cumple (LMS simulado) | Un solo SCO: el examen y el proyecto se bloquean dentro del curso hasta que las 17 secciones cumplen sus requisitos (cálculo con la lógica real de requisitos). Probado en `scorm.txt`. |
| 014 | Formas A y B | Cumple (LMS simulado) | Forma A en el 1.er intento y B en el 2.º; 64 situaciones por forma; máximo 2 intentos (configurable en `config.js`). |
| 015 | Puntaje parcial | Cumple (LMS simulado) | 3 (decisión) + 2 (evidencia) por situación; vacías = 0; nota = 100 × puntos / 320. Caso probado: 56×5 + 8×3 = 304 → 95. |
| 016 | Revisión de proyectos | Parcial | Entrega al LMS y calificación de un profesor (decisión de Diego, 9-oct-2026). Del lado del curso, probado con LMS simulado: entrega en `comments_from_learner` + interacciones + `postMessage`, devolución con comentarios, reenvío sin gastar intento y calificación C1–C4 → global 92 `passed`. Falta que el LMS construya la bandeja y la vista del profesor (contrato en `INTEGRACION_PROYECTO_LMS.md`). |
| 017 | Borrador interrumpido | Cumple (local / LMS simulado) | Borradores y posición se recuperan tras recargar (vista previa) y al reanudar con el CMI guardado (2004). |
| 018 | Guardado rechazado | Cumple (LMS simulado) | Si el LMS no confirma `Commit`, se muestra error y el dato sigue disponible para reintentar; nunca «guardado». |
| 019 | Doble sesión | Pendiente | No implementado un contrato de concurrencia: el LMS/servicio real debe definirlo (última escritura vs. versión). Documentado en INTEGRACION. |
| 020 | Cierre de SCO | Parcial | `Terminate`/`LMSFinish` en `pagehide`; `cmi.exit = suspend` siempre (permite volver a la devolución). Falta prueba en LMS real con su botón de salida. |
| 021 | Voz exacta | Parcial | Diego eligió producir todas las voces con una misma voz en Storyline (bloques ≤3.000 caracteres, desde la bienvenida). Se entregaron los 63 bloques con códigos deletreados. Licencia: la de la cuenta de Articulate/ElevenLabs de Dibork, por confirmar. |
| 022 | Pistas reales | Parcial | Hay 22 pistas de prueba (ElevenLabs, plan sin uso comercial confirmado), que se reemplazan con la grabación definitiva. El cortador automático y la QA por reconocimiento de voz están probados (similitud 0,97–1,0). |
| 023 | Controles y exclusión | Cumple (local) | Sin autoplay, una pista activa, pausa al cambiar de pantalla; abrir devoluciones no reinicia la pista. |
| 024 | Curso sin audio | Cumple (local) | Todas las pruebas automáticas se ejecutan sin audio; el texto es el contenido completo. |
| 025 | Guion a edición | Parcial | VID01 producido con escenas del guion; 11 videos con composiciones listas, esperan la voz aprobada. |
| 026 | Subtítulos reales | Parcial | VTT de VID01 construido con tiempos medidos sobre el audio final (Whisper, palabras) y texto del guion; falta revisión humana en reproducción. |
| 027 | Alternativa textual | Cumple (local) | Cada video muestra escenas, narración y descripción visual; sin video producido se muestra la versión textual. |
| 028 | Carga a demanda | Cumple (local) | Primera carga sin MP3/MP4 ni módulos; `preload="none"`. |
| 029 | Identidad y nombres | Cumple | 60 de 60 imágenes integradas con los nombres del catálogo; 31 con personas, acento violeta. |
| 030 | WebP y peso | Cumple | Conversor del paquete: 60 WebP + 60 variantes móviles, 3,7 MB en total. |
| 031 | Móvil y transparencia | Parcial | Variantes `--sm` con `srcset`; revisión visual en claro y oscuro hecha con capturas en portada, módulos y lecciones; falta recorrer las 60 en dispositivo. |
| 032 | Alternativas visuales | Parcial | Alt vacío en ambientales y contextual en conceptuales y con personas; iconos de acción con nombre accesible. Falta lector de pantalla real. |
| 033 | Navegación de teclado | Cumple (local) | Recorrido con Tab: todos los controles alcanzables con foco visible; sin trampas detectadas. |
| 034 | Reflujo | Cumple (local) | 360 px sin desplazamiento horizontal en portada, clasificación, comparación, hotspot y taller; tablas con contenedor desplazable. |
| 035 | Lectura y contraste | Parcial | Estados con texto e icono (no solo color); tokens con contraste alto. No se declara auditoría WCAG: falta medición formal. |
| 036 | Movimiento y ayuda | Cumple (local) | `prefers-reduced-motion` y ajuste manual; tarjetas sin giro; pistas sin tiempo límite. |
| 037 | Inicio frío | Parcial | 501 KiB en 14 solicitudes (local, sin limitación). Falta medición con red/CPU limitadas y desde el LMS. |
| 038 | Memoria de medios | Pendiente | Diseño: una pista activa, `preload=none`. Sin medición de memoria tras 30 pantallas. |
| 039 | Respuesta local | Cumple (local) | Interacciones no reconstruyen la app; guardados agrupados (1,2 s) y formales inmediatos. |
| 040 | Carga LMS | Pendiente | Requiere LMS real. |
| 041 | Claves fuera de cliente | Parcial (decisión de Dibork) | El banco A/B viaja OFUSCADO dentro del paquete para corregir en el SCORM. Evita la lectura casual, pero no es seguridad. Nunca entra al repositorio público (`.gitignore`); modelos y soluciones de proyecto no viajan. |
| 042 | Aislamiento | Parcial | Servicio de referencia: rol revisor separado (participante recibe 403), registros por identidad. Falta prueba con identidades reales de Dibork. |
| 043 | Sin acciones reales | Cumple | Ninguna actividad envía, compra ni conecta servicios; todo es simulado y rotulado. |
| 044 | Fuente no confiable | Cumple (contenido) | Casos y videos (VID07-S02, M15) tratan instrucciones dentro de documentos como contenido no confiable. |
| 045 | Paquete y manifest | Cumple (estructural) | 1 SCO, 208 archivos declarados, 0 faltantes, 0 IDs duplicados, 0 referencias rotas, 0 material privado detectado. No se validó contra los XSD oficiales. |
| 046 | Interoperabilidad 2004 | Parcial | Probado con scorm-again: inicio, guardado, reanudación, tiempo, objetivos por sección, puerta, intentos A/B, score, passed/failed y guardado rechazado. Falta importación en Dibork Learning. |
| 047 | Versión 1.2 separada | Parcial | Mismo curso con manifiesto 1.2; lesson_status passed/failed, score.raw, session_time; límite de 4.096 respetado con aviso honesto. Recomendado usar 2004. Falta LMS real. |
| 048 | Puerta de publicación | Pendiente | **No publicable todavía**: faltan las 328 pistas de voz definitivas (Storyline), re-render de los 12 videos con esa voz, música (opcional), revisión de datos de producto (004) y prueba en Dibork Learning. |
