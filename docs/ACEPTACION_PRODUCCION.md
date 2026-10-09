# Matriz de aceptación de producción · estado real (9-oct-2026)

Fuente de los 48 casos: `07_QA_HERRAMIENTAS/IATU_Aceptacion_produccion.json` del paquete v3.
Estados: **Cumple (local)** = probado con evidencia en vista previa o LMS simulado · **Parcial** = probado en parte o con límite declarado · **Pendiente** = requiere LMS real, persona revisora, voz aprobada, imágenes o pilotaje.
"Local" nunca significa Dibork Learning: no hubo acceso al LMS real ni a matrículas de prueba.

Evidencia automática en `docs/qa/` (reproducible con `herramientas/qa/ejecutar_todo.sh`): interacciones 32/32, recorrido 9/9, evaluación 26/26, SCORM 22/22.

| ID | Prueba | Estado | Observado / evidencia |
|---|---|---|---|
| 001 | Recorrido íntegro | Cumple (local) | Las 256 pantallas, 32 talleres y 3 casos se abren con su texto completo (`recorrido.json`). Texto íntegro del maestro v3, sin resumir. |
| 002 | Contexto visible | Cumple (local) | Expediente visible junto a cada actividad y a cada situación del examen (diseño en dos columnas). El examen no recibe claves (`evaluacion.txt`). |
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
| 013 | Puerta de entrada | Parcial | Triple control: secuenciación 2004 (`disabled` hasta 17 objetivos satisfechos), lectura de objetivos en el SCO y verificación del servicio (403 con pendientes). Probado con LMS simulado y servicio de referencia; falta LMS real y acceso directo por URL en Dibork. |
| 014 | Formas A y B | Cumple (servicio de referencia) | Forma A con 64 unidades; segundo intento usa B; máximo 2 intentos; sin claves en la respuesta. |
| 015 | Puntaje parcial | Cumple (servicio de referencia) | Decisión correcta + evidencia incorrecta = 3; ambas = 5; vacías = 0; normalización 8/320 = 2,50. |
| 016 | Revisión de proyectos | Cumple (servicio de referencia) | Entrega queda «pendiente de revisión»; resultado no aprueba sin revisión; nota solo con rúbrica C1–C4 por rol revisor. No hay revisor real asignado: pendiente operativo. |
| 017 | Borrador interrumpido | Cumple (local / LMS simulado) | Borradores y posición se recuperan tras recargar (vista previa) y al reanudar con el CMI guardado (2004). |
| 018 | Guardado rechazado | Cumple (LMS simulado) | Si el LMS no confirma `Commit`, se muestra error y el dato sigue disponible para reintentar; nunca «guardado». |
| 019 | Doble sesión | Pendiente | No implementado un contrato de concurrencia: el LMS/servicio real debe definirlo (última escritura vs. versión). Documentado en INTEGRACION. |
| 020 | Cierre de SCO | Parcial | `Terminate`/`LMSFinish` en `pagehide`, `cmi.exit = suspend` hasta completar. Falta prueba en LMS real con su botón de salida. |
| 021 | Voz exacta | Parcial | Voz identificada: `es-CL-CatalinaNeural` (Microsoft). Licencia y aprobación de muestra: **pendientes de Diego**. Sin sustitución silenciosa. |
| 022 | Pistas reales | Parcial | 13 pistas reales decodificables y medidas (muestra); QA por reconocimiento de voz 98–100 % sin negaciones perdidas. 315 pendientes de aprobación. |
| 023 | Controles y exclusión | Cumple (local) | Sin autoplay, una pista activa, pausa al cambiar de pantalla; abrir devoluciones no reinicia la pista. |
| 024 | Curso sin audio | Cumple (local) | Todas las pruebas automáticas se ejecutan sin audio; el texto es el contenido completo. |
| 025 | Guion a edición | Parcial | VID01 producido con escenas del guion; 11 videos con composiciones listas, esperan la voz aprobada. |
| 026 | Subtítulos reales | Parcial | VTT de VID01 construido con tiempos medidos sobre el audio final (Whisper, palabras) y texto del guion; falta revisión humana en reproducción. |
| 027 | Alternativa textual | Cumple (local) | Cada video muestra escenas, narración y descripción visual; sin video producido se muestra la versión textual. |
| 028 | Carga a demanda | Cumple (local) | Primera carga sin MP3/MP4 ni módulos; `preload="none"`. |
| 029 | Identidad y nombres | Parcial | Nombres e IDs del catálogo conservados; 6 de 60 integradas. |
| 030 | WebP y peso | Cumple (6 imágenes) | Conversor del paquete: WebP verdadero, sin metadatos, 31–56 KiB (objetivo 180) y móvil 11–29 KiB (objetivo 90). |
| 031 | Móvil y transparencia | Parcial | Variantes `--sm` con `srcset`; revisión visual en claro/oscuro pendiente para cada tanda. |
| 032 | Alternativas visuales | Parcial | Alt vacío en ambientales y contextual en conceptuales y con personas; iconos de acción con nombre accesible. Falta lector de pantalla real. |
| 033 | Navegación de teclado | Cumple (local) | Recorrido con Tab: todos los controles alcanzables con foco visible; sin trampas detectadas. |
| 034 | Reflujo | Cumple (local) | 360 px sin desplazamiento horizontal en portada, clasificación, comparación, hotspot y taller; tablas con contenedor desplazable. |
| 035 | Lectura y contraste | Parcial | Estados con texto e icono (no solo color); tokens con contraste alto. No se declara auditoría WCAG: falta medición formal. |
| 036 | Movimiento y ayuda | Cumple (local) | `prefers-reduced-motion` y ajuste manual; tarjetas sin giro; pistas sin tiempo límite. |
| 037 | Inicio frío | Parcial | 501 KiB en 14 solicitudes (local, sin limitación). Falta medición con red/CPU limitadas y desde el LMS. |
| 038 | Memoria de medios | Pendiente | Diseño: una pista activa, `preload=none`. Sin medición de memoria tras 30 pantallas. |
| 039 | Respuesta local | Cumple (local) | Interacciones no reconstruyen la app; guardados agrupados (1,2 s) y formales inmediatos. |
| 040 | Carga LMS | Pendiente | Requiere LMS real. |
| 041 | Claves fuera de cliente | Cumple | Banco, soluciones y proyectos resueltos nunca entran al paquete ni al repositorio (público); build y empaquetador fallan si detectan material privado. |
| 042 | Aislamiento | Parcial | Servicio de referencia: rol revisor separado (participante recibe 403), registros por identidad. Falta prueba con identidades reales de Dibork. |
| 043 | Sin acciones reales | Cumple | Ninguna actividad envía, compra ni conecta servicios; todo es simulado y rotulado. |
| 044 | Fuente no confiable | Cumple (contenido) | Casos y videos (VID07-S02, M15) tratan instrucciones dentro de documentos como contenido no confiable. |
| 045 | Paquete y manifest | Cumple (estructural) | 18 SCO reales, 95 archivos declarados, 0 faltantes, 0 IDs duplicados, 0 referencias rotas. No se validó contra los XSD oficiales. |
| 046 | Interoperabilidad 2004 | Parcial | Probado con scorm-again (inicio, guardar, reanudar, completar, aprobar, objetivos globales). Falta importación en Dibork Learning. |
| 047 | Versión 1.2 separada | Parcial | Paquete separado; límite 4.096 respetado con aviso honesto; prerrequisitos declarados. Falta LMS real. |
| 048 | Puerta de publicación | Pendiente | **No publicable todavía**: falta aprobación de voz/licencia, 54 imágenes, 11 videos, servicio de corrección en Dibork, revisor y pruebas en LMS. |
