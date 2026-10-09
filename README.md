# Curso 5 · IA para trabajar mejor · Dibork Learning

Producción del Curso 5 ULTRA (v3), con la identidad **«Laboratorio de criterio»**: 16 módulos, 64 lecciones, 256 pantallas, 32 talleres, 3 casos ramificados, evaluación A/B con servicio de corrección, proyecto con revisión humana, SCORM 2004 multi-SCO y SCORM 1.2.

> **Estado:** curso implementado y probado en vista previa y en un LMS simulado. **No está publicado ni listo para venta**: falta aprobar la voz y su licencia, completar las imágenes y los videos restantes, implementar el servicio de corrección en Dibork y probar en el LMS real. Ver [`docs/INFORME_ENTREGA.md`](docs/INFORME_ENTREGA.md).

## Documentos
| Documento | Para qué |
|---|---|
| [`docs/INFORME_ENTREGA.md`](docs/INFORME_ENTREGA.md) | Qué se construyó, decisiones y pendientes |
| [`docs/MAPA_PRODUCCION.md`](docs/MAPA_PRODUCCION.md) | Qué interacción, voz, video e imagen va en cada pantalla, con su estado real |
| [`docs/ACEPTACION_PRODUCCION.md`](docs/ACEPTACION_PRODUCCION.md) | Los 48 casos de aceptación con su estado observado |
| [`docs/INTEGRACION_DIBORK.md`](docs/INTEGRACION_DIBORK.md) | SCORM 2004/1.2, secuenciación, contrato del servicio y checklist del LMS |
| [`docs/VOZ_CATALINA.md`](docs/VOZ_CATALINA.md) | Voz, licencia, pronunciación y producción del lote |
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
# 3. Vista previa con evaluación (servicio de referencia, identidad de desarrollo)
IATU_MODO=desarrollo node servicio-correccion/servidor.mjs --puerto 8790 --estatico curso
#    revisión de proyectos: http://localhost:8790/revisor  (token revisor:nombre)
# 4. Paquetes SCORM
python3 herramientas/empaquetar_scorm.py --servicio-url https://<servicio-autorizado>
# 5. Pruebas
NODE_PATH=<node_modules con playwright-core y scorm-again> bash herramientas/qa/ejecutar_todo.sh
```

Imágenes nuevas: dejar los originales en `originales_medios/imagenes/` con el nombre del catálogo (`iatu-img-0NN-…`) y ejecutar `herramientas/optimizar_webp.py` (copia del conversor del paquete) con salida a `curso/media/images`. Luego hay que volver a ejecutar el build.

## Privacidad
Este repositorio es **público**. El banco de evaluación, las soluciones y el maestro completo nunca se versionan, y el build se detiene si detecta material privado en los datos públicos. Recomendación: pasar el repositorio a privado.

Créditos: iconos [Lucide](https://lucide.dev) (ISC). La voz es sintética (Microsoft es-CL-CatalinaNeural) y su licencia de publicación está pendiente. Los datos de todas las actividades son ficticios.
