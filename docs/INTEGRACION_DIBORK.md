# Integración con Dibork Learning · Curso 5

Este documento es para quien administra Dibork Learning. **Esta entrega no cambió infraestructura, permisos, autenticación, superadmin, otras apps ni almacenamiento** (Firebase/Google Cloud Storage se mantiene; no hay migración a R2). No se tuvo acceso al LMS real ni a la copia en `D:`; todo lo que sigue está probado en vista previa y con un LMS simulado (scorm-again).

## 1. Paquetes

| Paquete | Contenido | Estado |
|---|---|---|
| `IATU_C05_SCORM2004_4ed_v3.0.0.zip` | 18 SCO (orientación + 16 módulos + evaluación), `imsmanifest.xml` en la raíz | Recomendado |
| `IATU_C05_SCORM12_v3.0.0.zip` | Mismos 18 SCO, manifiesto 1.2 | Alternativa con límites |

Se generan con `python3 herramientas/empaquetar_scorm.py [--servicio-url URL]`. Ningún paquete incluye banco, claves, soluciones ni originales de medios.

Cada SCO es una página propia (`sco_m05.html`) que fija `window.IATU_SCO` y comparte `app/`, `data/`, `media/` y `descargas/` (recurso `RES-COMUN`). No es "varias páginas dentro de un SCO": cada módulo tiene su propio registro de intento, `suspend_data`, completitud y objetivo.

## 2. SCORM 2004: secuenciación y estados

- **Módulos y orientación**: objetivo primario `obj-<sco>` con `writeSatisfiedStatus`. El SCO marca `completion_status=completed` y `success_status=passed` solo cuando completa sus requisitos obligatorios (pantallas revisadas, prácticas con devolución revisada, talleres entregados con pauta revisada y casos terminados). `progress_measure` informa el avance.
- **Evaluación**: lee los 17 objetivos globales (`readSatisfiedStatus`) y tiene una regla `preConditionRule` → `disabled` mientras alguno no esté satisfecho. El SCO, además, lee `cmi.objectives` y muestra qué módulo falta.
- **Estados del SCO de evaluación**: `completed` cuando el examen y el proyecto fueron entregados; `success_status` queda `unknown` hasta que el servicio informa un resultado final (`passed`/`failed`); `score.raw/scaled` = nota global solo con revisión humana.
- `cmi.exit = suspend` mientras no está completo; `cmi.location` guarda la pantalla; `cmi.suspend_data` usa JSON comprimido (prefijo `z1:`).
- Interacciones formativas se registran en `cmi.interactions` (tipo `choice`/`other`) solo como información; no puntúan.

## 3. SCORM 1.2: diferencias reales

| Tema | 2004 | 1.2 |
|---|---|---|
| Secuenciación/bloqueo | Regla `disabled` por objetivos globales | No existe. Se declara `adlcp:prerequisites` (soporte opcional del LMS). El bloqueo real queda en el servicio. |
| Lectura de otros módulos | `cmi.objectives` mapeados | No disponible: el SCO de evaluación no puede ver otros SCO. |
| `suspend_data` | 64.000 caracteres | 4.096. Si el estado comprimido no cabe, se guarda una versión «lite» con el avance y los textos largos van al servicio (`PUT /api/v1/estado/:sco`); sin servicio, se avisa: «tus textos largos quedaron solo en este navegador». |
| Estados | completion + success separados | Un solo `lesson_status` (`incomplete`/`completed`/`passed`/`failed`). |
| Interacciones | Se registran | No se escriben (opcionales y frágiles en 1.2). |

## 4. Servicio autorizado de corrección (requerido para el examen)

El examen formal **no funciona sin servicio**: el cliente no contiene banco ni claves, y ocultar claves en JavaScript no es seguridad. Hay una **implementación de referencia** en `servicio-correccion/servidor.mjs` (Node sin dependencias) que define y prueba el contrato; Dibork decide cómo implementarlo en su backend (por ejemplo, Cloud Functions + Firestore). No se desplegó nada.

### Identidad
El SCO envía `Authorization: Bearer <token>`. En producción, el token lo emite el LMS para el participante autenticado: `base64url(JSON{sub, rol, exp}) + "." + base64url(HMAC-SHA256)`, con un secreto que solo conocen el LMS y el servicio. El SCO lo obtiene con `IATU_CONFIG.servicio.token()`; en el paquete, por defecto lo pide a `window.parent.DIBORK_IATU_TOKEN()` si el LMS lo expone. **Nunca** se debe confiar solo en `cmi.learner_id` enviado por el cliente. El modo `dev:<id>` del servicio de referencia existe solo con `IATU_MODO=desarrollo`.

### Endpoints (prefijo `/api/v1`)
| Método y ruta | Uso |
|---|---|
| `PUT /progreso/:sco` | El SCO informa `{done,total,complete}`. **Recomendación:** en producción, el servicio debería leer el tracking SCORM del LMS en vez de confiar en este reporte. |
| `GET /requisitos` | `{ok, faltan[]}` para la puerta de entrada. |
| `GET /intentos/actual` · `POST /intentos` | Intento abierto o nuevo (403 si faltan requisitos o intentos). Forma A en el 1.º intento y B en el 2.º; máximo 2 (configurable). |
| `PUT /intentos/:id/respuestas` | Guarda `{respuestas:{unidad:{d,e,f}}, posicion}`; permite pausar y reanudar. |
| `POST /intentos/:id/entregar` | Corrige 3 (decisión) + 2 (evidencia) por unidad, máx. 320, normaliza a 100 y libera la devolución. |
| `GET /proyecto` · `PUT /proyecto/borrador` · `POST /proyecto/entregar` | Brief público de la forma, 8 evidencias + actualización, «pendiente de revisión». |
| `GET /revision/pendientes` · `GET/POST /revision/:id` | Solo rol revisor. Ve modelo, anclas y soluciones; asigna niveles 0–3 en C1–C4 (pesos 20/25/30/25) y fallo crítico si corresponde. |
| `GET /resultado` | Global = 0,4 × situaciones + 0,6 × proyecto (sin redondeo previo). Aprobado: global ≥ 80, proyecto ≥ 75, revisión real y sin fallo crítico pendiente. |
| `PUT/GET /estado/:sco` | Respaldo de estado extenso (SCORM 1.2). |

Datos privados: `servicio-correccion/data/evaluacion_privada.json`, generado por `herramientas/build_publico.py` desde el banco v3 (fuera del repositorio).

### Pendientes del contrato que Dibork debe definir
- Concurrencia de dos sesiones (última escritura vs. control de versión): no implementado.
- Persona revisora autorizada y su acceso (la herramienta `revisor.html` es de referencia).
- Número de intentos y política de recuperación según las reglas del LMS.
- Almacenamiento de archivos adjuntos del proyecto (la referencia recibe texto).

## 5. Configuración del paquete
`config.js` en la raíz del paquete:
```js
window.IATU_CONFIG = { base: "", servicio: { url: "https://<servicio-autorizado>", token: function () { return window.parent.DIBORK_IATU_TOKEN(); } }, banner: "" };
```
Sin `servicio.url`, el curso funciona completo salvo la evaluación formal, que muestra el bloqueo y su motivo.

## 6. Qué validar en el LMS real (checklist)
1. Importar el ZIP 2004: 18 ítems visibles y la evaluación deshabilitada al inicio.
2. Completar un módulo con una matrícula de prueba y verificar `completed/passed` y el objetivo global.
3. Salir y volver: posición y respuestas recuperadas.
4. Simular un error de red durante el guardado: el curso muestra el error, no «guardado».
5. Completar los 17 requisitos: la evaluación se habilita (secuenciación) y el servicio responde `ok`.
6. Intento A, entrega, devolución; proyecto pendiente; revisión; resultado; segundo intento B.
7. Repetir en 1.2 y comprobar el aviso de capacidad.
8. Revisar los tiempos de carga desde el LMS por separado de los del paquete.
