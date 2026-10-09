# Integración con Dibork Learning · Curso 5

Este documento es para quien administra Dibork Learning. **Esta entrega no cambió infraestructura, permisos, autenticación, superadmin, otras apps ni almacenamiento** (Firebase/Google Cloud Storage se mantiene; no hay migración a R2). No hubo acceso al LMS real: todo está probado en vista previa y con un LMS simulado (scorm-again).

## 1. Paquetes
| Paquete | Contenido | Uso |
|---|---|---|
| `IATU_C05_SCORM2004_4ed_v3.0.0.zip` | **1 SCO** (`index.html`), `imsmanifest.xml` en la raíz | **Recomendado** |
| `IATU_C05_SCORM12_v3.0.0.zip` | El mismo curso con manifiesto 1.2 | Solo si el LMS no admite 2004 |

Se generan con `python3 herramientas/build_publico.py && python3 herramientas/empaquetar_scorm.py`. El build necesita el paquete privado v3 en `autoria_privada/`. Ningún paquete incluye originales de medios, modelos ni soluciones de proyecto.

## 2. Qué escribe el curso en el LMS (SCORM 2004)
| Elemento | Valor |
|---|---|
| `cmi.suspend_data` | Estado de **todo** el programa en un registro comprimido (prefijo `z1:`): las 17 secciones, la evaluación, el proyecto y el tiempo. Límite de 64.000 caracteres; si no cabe, se guarda una versión «lite» con los avances y se avisa. |
| `cmi.location` | Última pantalla (para «continuar donde quedaste»). |
| `cmi.progress_measure` | 0–1: 90 % por requisitos de las 17 secciones, 5 % por entregar las situaciones aplicadas y 5 % por entregar el proyecto. |
| `cmi.completion_status` | `completed` cuando las 17 secciones están completas **y** se entregaron las dos partes de la evaluación; si no, `incomplete`. |
| `cmi.success_status` | `unknown` hasta entregar las dos partes. Luego `passed` si la nota global es 80 o más, el proyecto 75 o más y no hay fallos críticos pendientes; si no, `failed` (puede pasar a `passed` con el segundo intento o al subsanar). |
| `cmi.score.raw/min/max/scaled` | Nota global 0–100 = 40 % situaciones (mejor intento) + 60 % proyecto (mejor intento), y su versión escalada. |
| `cmi.session_time` | Tiempo activo de la sesión (solo con la pestaña visible y actividad reciente). |
| `cmi.objectives.n` | Un objetivo por sección (`obj-orientacion`, `obj-m01`…`obj-m16`, `obj-evaluacion`) con completion/success/progress. Son informativos. |
| `cmi.interactions.n` | Una por situación del examen (decisión/evidencia y resultado), una por ítem del proyecto (puntos obtenidos/posibles) y la subsanación de fallos críticos. |
| `cmi.exit` | Siempre `suspend`. Así la persona puede volver a su devolución; la nota y el estado quedan registrados igual. |

**SCORM 1.2:** `cmi.core.lesson_status` (`incomplete` → `passed`/`failed`), `cmi.core.score.raw/min/max` y `cmi.core.session_time`. El estado va en `cmi.suspend_data`, limitado a **4.096 caracteres**: el avance siempre cabe en versión «lite», pero los textos largos de talleres y proyecto pueden quedar solo en el navegador, y el curso lo avisa. Por eso se recomienda 2004.

## 3. Evaluación dentro del SCORM (100 % automática)
- Bloqueada hasta que las 17 secciones cumplen sus requisitos (pantallas revisadas, prácticas y talleres con devolución revisada, casos terminados y diagnóstico de orientación).
- **Situaciones aplicadas (40 %):** forma A en el primer intento y B en el segundo; 64 situaciones; 3 + 2 puntos; nota = 100 × puntos / 320. Cuenta el mejor intento.
- **Proyecto de desempeño (60 %):** forma A (Lumbre) y luego B (Marea), en 9 etapas con el expediente siempre visible: clasificar documentos, elegir, calcular indicadores, ordenar el flujo, escribir los encargos (6 partes) y redactar el producto final, más la actualización del expediente. Se corrige al entregar con una pauta derivada del modelo y las anclas del maestro v3, ponderada por criterio de la rúbrica (C1 20 · C2 25 · C3 30 · C4 25). Los textos se revisan con comprobaciones concretas (fechas, cifras, límites, datos que no deben aparecer); la redacción es libre.
- **Fallos críticos:** usar la versión reemplazada, inventar aprobaciones, incluir datos personales, o dejar sin hacer el encargo o el producto final. El puntaje se conserva, pero la aprobación queda pendiente hasta que la persona corrige el texto señalado en la misma pantalla de devolución.
- **Aprobación:** nota global ≥ 80, proyecto ≥ 75 y sin fallos críticos pendientes (regla del maestro v3; ya no requiere revisión humana). Tras entregar, la persona ve su devolución por etapa con el modelo de referencia.
- Límite declarado: la corrección automática de textos se basa en reglas; acepta redacciones distintas, pero no evalúa estilo ni matices. Si Dibork quiere una revisión adicional, el registro del LMS y las interacciones permiten auditarla.
- **Seguridad:** banco y pauta viajan **ofuscados** en `data/eval.js`. Evita la lectura casual de claves, pero no es seguridad: quien tenga el paquete y conocimientos técnicos puede leerlas. No subir el ZIP a lugares públicos. La pauta fuente es `autoria_privada/proyecto_auto_v1.json` (privada, fuera del repositorio).

## 4. Configuración (`config.js` en la raíz del paquete)
```js
window.IATU_CONFIG = { base: "", evaluacion: { intentos: 2, umbral: 80 }, proyecto: { intentos: 2, umbral: 75 },
  global: { peso_examen: 0.4, peso_proyecto: 0.6 }, servicio: { url: "", token: null }, banner: "" };
```
`servicio.url` es opcional: si se configura, en SCORM 1.2 los textos largos que no caben se respaldan en `PUT /api/v1/estado/curso`.

## 5. Medios y carga
- Las fuentes (Sora 33 KB y Manrope 25 KB) van incluidas: no hay llamadas externas.
- Los datos de cada módulo, las imágenes (con `srcset` móvil), el audio (`preload="none"`) y el banco del examen se cargan solo cuando hacen falta.
- La música de fondo es opcional: si existen `media/music/*.mp3`, aparece el botón; si no, no se muestra nada.

## 6. Qué validar en el LMS real
1. Importar el ZIP 2004: un ítem «IA para trabajar mejor».
2. Avanzar unas pantallas, salir y volver: la portada ofrece «continuar donde quedaste» y el tiempo acumulado se mantiene.
3. Simular un error de red durante el guardado: el curso muestra el error, no «guardado».
4. Con una matrícula de prueba, completar las 17 secciones: la evaluación se habilita.
5. Rendir situaciones (A y luego B) y proyecto: revisar en el LMS `score` (nota global), `success_status` y `completion_status`, el reporte de interacciones y los objetivos. Probar un fallo crítico y su subsanación.
6. Repetir con el ZIP 1.2 y comprobar el aviso de capacidad.
7. Medir los tiempos de carga desde el LMS.
