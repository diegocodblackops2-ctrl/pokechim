# Curso 5 · IA para trabajar mejor · Dibork Learning

Producción del Curso 5 ULTRA (v3), con la identidad **«Laboratorio nocturno de criterio»** (violeta, en movimiento, con una red del programa que se enciende con el avance): 16 módulos, 64 lecciones, 256 pantallas, 32 talleres, 3 casos ramificados, evaluación 100 % automática dentro del SCORM (situaciones A/B 40 % + proyecto por etapas 60 %), y **un solo SCO** para SCORM 2004 (recomendado) y 1.2.

> **Estado:** curso implementado y probado en vista previa y en un LMS simulado (36/36), con 60/60 imágenes. **No está publicado ni listo para venta**: faltan las 328 pistas de voz definitivas (Diego las graba en Storyline con los bloques entregados), los 12 videos con esa voz y la prueba en Dibork Learning. Ver [`docs/INFORME_ENTREGA.md`](docs/INFORME_ENTREGA.md).

## Documentos
| Documento | Para qué |
|---|---|
| [`docs/INFORME_ENTREGA.md`](docs/INFORME_ENTREGA.md) | Qué se construyó, decisiones y pendientes |
| [`docs/MAPA_PRODUCCION.md`](docs/MAPA_PRODUCCION.md) | Qué interacción, voz, video e imagen va en cada pantalla, con su estado real |
| [`docs/ACEPTACION_PRODUCCION.md`](docs/ACEPTACION_PRODUCCION.md) | Los 48 casos de aceptación con su estado observado |
| [`docs/INTEGRACION_DIBORK.md`](docs/INTEGRACION_DIBORK.md) | Un solo SCO: qué se escribe en el LMS, examen interno, configuración y checklist |
| [`docs/VOZ_CATALINA.md`](docs/VOZ_CATALINA.md) | Voz: bloques para Storyline, deletreo, cortador automático y QA |
| [`docs/locucion/`](docs/locucion/) | Guiones por bloque y prompts de música de fondo |
| `docs/qa/` | Evidencia de las pruebas automáticas |

## Estructura
```
curso/                 Vista previa web y fuente editable del curso
  index.html           Vista previa (todos los SCO, guardado local rotulado)
  app/                 Reproductor: css/, js/ (util, store, media, inter, practica, eval, app), icons/
  data/                Datos PÚBLICOS generados (curso.js + m01..m16.js), carga diferida
  media/               audio/, images/, video/ (solo derivados optimizados)
  descargas/           Cuaderno, laboratorio Excel y CSV del participante
servicio-correccion/   Servicio de referencia (Node, sin dependencias) + herramienta de revisión
herramientas/          build, empaquetado SCORM, locución, videos, WebP, generación de docs y QA
docs/                  Informes y evidencia
autoria_privada/       (NO versionado) paquete v3 completo: banco, soluciones, maestro
```

## Uso rápido
```bash
# 1. Paquete de autoría v3 en autoria_privada/CURSO_05_IA_ULTRA_CLAUDE_v3 (no se versiona)
python3 herramientas/build_publico.py            # datos públicos + datos privados del servicio
# 2. Vista previa (sin evaluación formal)
cd curso && python3 -m http.server 8765          # http://localhost:8765
# 3. (Opcional, referencia) servicio de corrección externo, si en el futuro se quiere seguridad real del banco
IATU_MODO=desarrollo node servicio-correccion/servidor.mjs --puerto 8790 --estatico curso
# 4. Paquetes SCORM (un solo SCO; 2004 y 1.2)
python3 herramientas/empaquetar_scorm.py
# Voces: bloques ≤3.000 caracteres y corte automático de las tomas grabadas
python3 herramientas/bloques_storyline.py --desde 7 --zip-desde 7
python herramientas/cortar_grupos.py --entrada <carpeta con ORI-B01.mp3…> --voz "Storyline · <voz>"
# 5. Pruebas
NODE_PATH=<node_modules con playwright-core y scorm-again> bash herramientas/qa/ejecutar_todo.sh
```

Imágenes nuevas: dejar los originales en `originales_medios/imagenes/` con el nombre del catálogo (`iatu-img-0NN-…`) y ejecutar `herramientas/optimizar_webp.py` (copia del conversor del paquete) con salida a `curso/media/images`. Luego hay que volver a ejecutar el build.

## Privacidad
Este repositorio es **público**. El banco de evaluación (también su versión ofuscada `curso/data/eval.js`), las soluciones y el maestro completo nunca se versionan; el banco ofuscado solo viaja dentro del ZIP SCORM. El build se detiene si detecta material privado en claro. Recomendación: pasar el repositorio a privado.

Créditos: iconos [Lucide](https://lucide.dev) (ISC); tipografías Sora y Manrope (OFL 1.1); imágenes generadas en Canva para el curso. La voz es sintética y su licencia depende de la cuenta con que se produzca. Los datos de todas las actividades son ficticios.
