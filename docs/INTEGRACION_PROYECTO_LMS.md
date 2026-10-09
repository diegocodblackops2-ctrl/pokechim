# Proyecto de desempeño: entrega al LMS y calificación del profesor

Este documento es para quien implementa la recepción en Dibork Learning, por ejemplo el agente del LMS. Explica qué envía el curso cuando la persona entrega su proyecto y cómo el LMS le devuelve la calificación del profesor.

Modo por defecto en `config.js`: `proyecto: { correccion: "docente" }`. Con `"automatica"`, el curso corrige solo y no necesita nada de esto.

## 1. Flujo
1. La persona completa las 9 etapas del proyecto: forma A en el primer intento y B en el segundo. Luego pulsa **Enviar al profesor**.
2. El curso deja la entrega en el LMS por tres vías (sección 2) y muestra «Entregado · en revisión del profesor».
3. El profesor abre la entrega en el LMS, la lee junto a la pauta docente (sección 5) y la califica con la rúbrica C1–C4, niveles 0 a 3.
4. El LMS devuelve la evaluación al curso (sección 3): **evaluado**, con niveles o nota, o **devuelto**, con comentarios para corregir.
5. El curso muestra la nota y los comentarios. Calcula la nota global (40 % situaciones + 60 % proyecto) y reporta `success_status` y `score`.

## 2. Qué envía el curso (entrega)
Cada entrega tiene un `entrega_id` único, por ejemplo `IATU-P-A1-lx3k9a`.

**a) `cmi.comments_from_learner.n`** (SCORM 2004), siempre presente y la vía más simple de leer:
- `comment`: el texto completo y legible de la entrega, en trozos de hasta 3.900 caracteres. Los saltos de línea van como « ¶ » (SCORM 2004 no los admite en un comentario); para mostrarlo, reemplaza « ¶ » por un salto de línea.
- `location`: `IATU-PROYECTO|<entrega_id>|<parte>/<total>`. Para armar el texto, junta las partes en orden.
- `timestamp`: la fecha de la entrega.

En SCORM 1.2 el texto va en `cmi.comments`, limitado a 4.096 caracteres. Para el proyecto se recomienda SCORM 2004.

**b) `cmi.interactions.n`**: una por pregunta.
- `id`: `IATU-PROY-<forma><intento>-<etapa>-<n>`, por ejemplo `IATU-PROY-A1-A4-0`.
- `type`: `long-fill-in` para los textos y `other` para el resto.
- `learner_response`: la respuesta en texto legible.
- `description`: la etapa y la pregunta.

**c) `postMessage` a la página del LMS**, para un aviso inmediato. El origen destino se configura en `proyecto.origen_lms`.
```json
{
  "type": "dibork:iatu:proyecto-entregado", "version": 1, "curso": "IATU-C05",
  "entrega_id": "IATU-P-A1-lx3k9a", "forma": "A", "intento": 1, "reenvio_de": null, "fecha": "2026-10-09T15:20:00.000Z",
  "participante": { "id": "<cmi.learner_id>", "nombre": "<cmi.learner_name>" },
  "respuestas": [ { "clave": "A4.0", "etapa": "4 · Comunicación final (borrador, sin envío)", "criterio": "C4",
                    "tipo": "text", "pregunta": "", "respuesta": "Asunto: …", "valor": "Asunto: …" } ],
  "prevalidacion": { "nota_sugerida": 84.5, "por_criterio": { "C1": [12.2, 17] }, "alertas": ["No usa la versión antigua…"] },
  "texto": "PROYECTO DE DESEMPEÑO · …"
}
```
- `prevalidacion` es solo orientativa: cálculos y datos clave revisados por reglas. **No es la nota.** Sirve para que el profesor parta por las alertas.
- Si `servicio.url` está configurado, también se envía `POST <servicio.url>/api/v1/proyecto/entrega` con el mismo cuerpo.

**Estado en el LMS al entregar:**
- `cmi.completion_status = completed`, si además completó las 17 secciones y las situaciones.
- `cmi.success_status = unknown` hasta que el profesor califique.
- Objetivo `obj-proyecto`: `completed`, con `success_status unknown`.

## 3. Cómo devuelve el LMS la calificación
El JSON de la evaluación es el mismo en las dos vías:
```json
{ "tipo": "iatu-proyecto-evaluacion", "entrega_id": "IATU-P-A1-lx3k9a", "estado": "evaluado",
  "niveles": { "C1": 3, "C2": 2, "C3": 3, "C4": 2 }, "critico": false,
  "comentario": "Usaste bien la versión vigente…", "profesor": "Nombre Apellido", "fecha": "2026-10-10T12:00:00Z" }
```

| Campo | Obligatorio | Significado |
|---|---|---|
| `estado` | sí | `evaluado` (con nota) o `devuelto` (sin nota; la persona corrige y reenvía sin gastar intento) |
| `niveles` | uno de los dos | C1–C4 de 0 a 3. Nota = Σ peso × nivel / 3, con pesos C1 20, C2 25, C3 30 y C4 25 |
| `nota` | uno de los dos | 0–100. Se usa si no vienen `niveles` |
| `critico` | no | `true` si hay un fallo crítico. El proyecto no aprueba aunque tenga nota y la persona puede usar su segundo intento |
| `comentario` | no | Devolución para la persona (hasta 4.000 caracteres) |
| `entrega_id` | recomendado | Si falta, se aplica a la última entrega de esa `forma` o a la última entrega |

**Vía 1 · `cmi.comments_from_lms`.** Funciona aunque la persona no esté conectada. Al calificar, el LMS agrega un comentario a `cmi.comments_from_lms` del registro de esa persona:
- `comment`: el JSON de arriba.
- `location`: `IATU-PROYECTO`.

El curso lo lee cada vez que se abre.

**Vía 2 · `postMessage` en vivo.** Sirve si la persona tiene el curso abierto. La página del LMS que contiene el curso envía:
```js
iframeDelCurso.contentWindow.postMessage({ type: "dibork:iatu:proyecto-evaluado", evaluacion: { /* JSON de arriba */ } }, "*");
```
El curso solo acepta este mensaje de su ventana padre, la superior o la que lo abrió.

## 4. Reglas de aprobación (las aplica el curso)
- Nota global = 0,4 × mejor intento de situaciones + 0,6 × mejor proyecto calificado sin fallo crítico.
- Para aprobar se necesita nota global ≥ 80 y proyecto ≥ 75.
- Con eso, el curso informa `success_status passed`/`failed`, `score.raw` (nota global 0–100) y `score.scaled`.
- Hay dos intentos de proyecto: forma A y luego B. Un `devuelto` no gasta intento.
- **Importante:** la calificación oficial es la que guarda el LMS con la evaluación del profesor. El SCO solo la refleja. Para certificar, usa el registro del LMS, no el `success_status` que escribe el SCO.

## 5. Pauta para el profesor
El LMS debe mostrar al profesor, junto a cada entrega:
- la rúbrica C1–C4, con los niveles 0–3 descritos;
- el modelo de referencia de cada etapa;
- las respuestas esperadas en clasificaciones y cálculos;
- las anclas de calificación (sólido, parcial, insuficiente).

Todo eso está en `dist/lms_proyecto/pauta_docente.json`, que se genera con `python3 herramientas/paquete_docente.py`. **Es privada:** contiene las respuestas. Solo debe cargarse en la vista del profesor y nunca va en el paquete SCORM ni en el repositorio.

## 6. Qué tiene que construir el LMS (lista para el agente)
1. **Recepción:** al recibir `dibork:iatu:proyecto-entregado`, o al leer `comments_from_learner` con `location` que empiece por `IATU-PROYECTO|`, crear o actualizar la entrega con `entrega_id`, participante, forma, intento y respuestas.
2. **Bandeja del profesor:** lista de entregas pendientes por curso y grupo, con fecha y estado (en revisión, devuelta o calificada).
3. **Vista de corrección:** a la izquierda, las respuestas por etapa; a la derecha, la pauta docente de esa forma. Abajo:
   - selector de nivel 0–3 para cada criterio;
   - casilla de «fallo crítico»;
   - campo de comentario;
   - botones **Calificar** y **Devolver para corregir**.
4. **Devolución al curso:** escribir el JSON en `cmi.comments_from_lms` del registro SCORM de la persona y, si tiene el curso abierto, enviar el `postMessage`.
5. **Registro oficial:** guardar la nota del proyecto y la nota global en el expediente del LMS, que es el dato para la constancia.
