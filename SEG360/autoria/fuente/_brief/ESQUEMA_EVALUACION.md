# Esquema de evaluación por ruta (PRIVADO: va en SEG360/docente_privado/fuente/)

Archivo: `SEG360/docente_privado/fuente/EVAL-<RUTA>.json` (RUTA = SST | CIBER | EPP).

```json
{
  "ruta": "SST", "ruta_id": "SEG360-R1-SST",
  "reglas": { "umbral_situaciones": 80, "umbral_ruta": 80, "peso_situaciones": 0.4, "peso_tarea": 0.6, "intentos_situaciones": 2, "intentos_tarea": 2,
              "nota": "Aprueba la ruta con nota ≥ 80, situaciones ≥ 80 (mejor intento) y tarea aplicada sin condición crítica y con los criterios esenciales en nivel ≥ 2." },
  "tabla_especificaciones": [ { "objetivo": "SEG360-SST-M01", "items_A": 4, "items_B": 4, "dificultad_A": {"baja":1,"media":2,"alta":1}, "dificultad_B": {"baja":1,"media":2,"alta":1} } ],
  "diagnostico": [ ITEM, … 6 ],
  "banco_produccion": { "A": [ ITEM × 24 ], "B": [ ITEM × 24 ] },
  "banco_portable": { "A": [ ITEM × 12 ], "B": [ ITEM × 12 ] },
  "tarea_aplicada": TAREA,
  "recuperacion": { "plan": "…", "por_objetivo": { "SEG360-SST-M01": "qué repasar y qué práctica rehacer" }, "nueva_evidencia": "…" }
}
```

## ITEM
```json
{ "id": "SEG360-SST-PA-A01", "forma": "A", "objetivo": "SEG360-SST-M02", "dificultad": "media",
  "tipo": "unica | multiple | ordenar",
  "conjunto": null,
  "evidencia": { "tipo": "texto | correo | chat | ficha | tabla | escena", "titulo": "…", "contenido": "…" },
  "enunciado": "…",
  "opciones": [ { "id": "a", "texto": "…" }, { "id": "b", "texto": "…" }, { "id": "c", "texto": "…" }, { "id": "d", "texto": "…" } ],
  "seleccion": { "minimo": 1, "maximo": 1 },
  "clave": ["b"],
  "orden_clave": null,
  "puntaje": 1,
  "justificacion": "por qué la clave es correcta (para el docente)",
  "feedback": { "a": "…", "b": "…", "c": "…", "d": "…" },
  "fuente": ["SST-DS44"]
}
```
- IDs: diagnóstico `SEG360-<RUTA>-DG-01…06`; producción `SEG360-<RUTA>-PA-A01…A24` y `…-PA-B01…B24`; portable `SEG360-<RUTA>-PP-A01…A12` y `…-PP-B01…B12`. Los ítems portables son distintos de los de producción (no copias ni paráfrasis cercanas).
- Situacionales: interpretar evidencias, priorizar, decidir y justificar. Nada de definiciones de memoria. Opciones plausibles, de largo parecido; la clave en posiciones variadas (no siempre b).
- `multiple`: `seleccion` con mínimo/máximo explícitos y `puntaje` 2 (crédito completo solo si coincide exactamente; el docente puede ver el detalle).
- `ordenar`: `opciones` son los pasos; `orden_clave` [ids] y `alternativas_validas` [[ids]] si hay más de una secuencia válida; `puntaje` 2.
- `conjunto`: varios ítems pueden compartir una evidencia (p. ej. "SET-A1"); cada ítem se califica por sí solo y ninguno depende de haber acertado el anterior.
- A y B cubren los 6 módulos con la misma cantidad de ítems por módulo (4 por módulo) y una dificultad prevista comparable. No se afirma equivalencia psicométrica.
- Sin límite de tiempo. Se puede consultar el material del curso.
- El feedback por opción es formativo y no revela la clave de otros ítems.

## TAREA
```json
{
  "id": "SEG360-SST-TA", "titulo": "…", "resultado": "…",
  "instrucciones": "lo que la persona debe hacer, incluidas las condiciones críticas declaradas ANTES de empezar",
  "condiciones_criticas": [ { "id": "CC1", "texto": "Proponer intervenir o reparar un equipo eléctrico por cuenta propia." } ],
  "variantes": {
    "A": { "titulo": "…", "contexto": "…",
           "expediente": [ { "id": "A-D1", "titulo": "…", "tipo": "texto | correo | chat | ficha | tabla | foto_descrita | registro", "contenido": "…" } ],
           "producto": [ { "id": "A-P1", "etiqueta": "…", "ayuda": "…", "tipo": "texto_largo | lista | tabla", "criterio": "C1" } ] },
    "B": { … misma estructura, situación distinta y comparable … }
  },
  "rubrica": [ { "id": "C1", "criterio": "Identificación", "peso": 25, "esencial": true,
                 "niveles": { "0": "…", "1": "…", "2": "…", "3": "…" } } ],
  "calculo": "Nota = Σ peso × nivel / 3. Aprueba con ≥ 80, criterios esenciales ≥ 2 y sin condición crítica.",
  "anclas": { "A": { "nivel3": "respuesta modelo completa", "nivel2": "…", "nivel1": "…" }, "B": { … } },
  "pauta_docente": { "A": { "A-P1": ["elementos esperados", "…"] }, "B": { … } },
  "respuestas_limite": [ { "situacion": "respuesta ambigua típica", "como_calificar": "…" } ]
}
```
Rúbrica: 4 criterios (identificación, justificación, control/acción, comunicación, adaptados a la ruta), niveles 0–3 observables, pesos que suman 100.
