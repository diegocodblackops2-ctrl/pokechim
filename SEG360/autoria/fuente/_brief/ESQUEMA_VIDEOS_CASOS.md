# Esquemas complementarios

## Microvideo / animación narrada (`autoria/fuente/videos/SEG360-VIDxx.json`)
Duración 60–100 s. 5–8 escenas. Se anima en el propio curso (imágenes con movimiento, modelos 3D, composiciones de iconos y texto), sincronizado con la voz.
```json
{ "id": "SEG360-VID01", "titulo": "…", "modulo": "SEG360-SST-M01", "pantalla": "SEG360-SST-M01-L01-P05",
  "objetivo": "qué debe poder hacer quien lo ve",
  "escenas": [
    { "n": 1, "visual": { "tipo": "imagen", "ref": "SEG360-IMG007", "movimiento": "zoom_lento|paneo_izq|paneo_der|fijo" },
      "texto_en_pantalla": "≤ 8 palabras", "voz": "lo que dice la voz en esta escena (1–3 frases)", "hablante": "narrador" },
    { "n": 2, "visual": { "tipo": "iconos", "ref": ["plug", "flame", "triangle-alert"], "movimiento": "secuencia" }, "texto_en_pantalla": "…", "voz": "…", "hablante": "narrador" },
    { "n": 3, "visual": { "tipo": "modelo3d", "ref": "zapatilla_electrica", "movimiento": "giro|explosionado|acercar:parte" }, "texto_en_pantalla": "…", "voz": "…", "hablante": "narrador" },
    { "n": 4, "visual": { "tipo": "escena3d", "ref": "bodega", "foco": "cable_piso", "movimiento": "recorrido" }, "texto_en_pantalla": "…", "voz": "…", "hablante": "narrador" },
    { "n": 5, "visual": { "tipo": "texto", "ref": "frase clave grande" }, "texto_en_pantalla": "…", "voz": "…", "hablante": "narrador" }
  ],
  "descripcion_accesible": "Descripción de lo que se ve en el video, escena por escena, para quien no puede verlo."
}
```
Los demostrativos nunca enseñan maniobras peligrosas: se observa, no se manipula.

## Caso ramificado (`autoria/fuente/casos/SEG360-CASO-XXX-n.json`)
Al menos 6 decisiones con efectos reales en la información disponible, las opciones posteriores o el resultado; estado persistente (variables); al menos 3 finales distintos (seguro, parcial, inseguro) y caminos de recuperación razonada (equivocarse a mitad de camino no condena: se puede corregir con una buena decisión posterior, a un costo visible).
```json
{ "id": "SEG360-CASO-SST-1", "ruta": "SST", "modulo": "SEG360-SST-M03", "titulo": "…", "subtitulo": "…",
  "resultado": "qué demuestra quien lo resuelve bien",
  "protagonista": "camila", "duracion_min": 25,
  "presentacion": { "texto": "…", "voz": "…", "hablante": "narrador", "imagen": "SEG360-IMG061" },
  "variables": [ { "id": "riesgo", "nombre": "Exposición al riesgo", "inicial": 0, "visible": true, "icono": "triangle-alert", "bueno": "bajo" },
                 { "id": "tiempo", "nombre": "Minutos para el despacho", "inicial": 30, "visible": true, "icono": "clock", "bueno": "alto" },
                 { "id": "confianza", "nombre": "Confianza del equipo", "inicial": 2, "visible": true, "icono": "users", "bueno": "alto" } ],
  "evidencias": [ { "id": "e1", "titulo": "…", "icono": "file-text", "contenido": "…", "inicial": true } ],
  "nodos": [
    { "id": "n1", "titulo": "…", "imagen": "SEG360-IMG061", "escena": "lo que pasa (2–5 frases)",
      "voz": "narración o voz del personaje (30–90 palabras)", "hablante": "narrador",
      "pregunta": "…",
      "opciones": [ { "texto": "…", "efectos": { "riesgo": 1, "tiempo": -5 }, "desbloquea": ["e2"], "marca": "aviso_marisol", "siguiente": "n2", "feedback": "consecuencia inmediata, en 1–3 frases, sin sermonear" } ] },
    { "id": "n3", "condicion_texto": [ { "si": "aviso_marisol", "texto": "texto alternativo de la escena si antes avisó" } ], "…": "…" }
  ],
  "finales": [ { "id": "f_seguro", "tipo": "seguro|parcial|inseguro", "titulo": "…", "texto": "…", "voz": "…", "hablante": "narrador",
                 "condicion": { "riesgo_max": 1, "requiere_marcas": ["aviso_marisol"] } } ],
  "regla_final": "Descripción en palabras de cómo se elige el final (se evalúa en orden: el primero cuya condición se cumple).",
  "debrief": { "titulo": "Lo que pasó y por qué", "puntos": ["…", "…", "…", "…"], "voz": "…", "hablante": "patricia",
               "pregunta_transferencia": "…" }
}
```
`condicion` admite: `riesgo_max`, `riesgo_min`, `<variable>_min`, `<variable>_max`, `requiere_marcas` [..], `excluye_marcas` [..]. Un nodo puede tener `"siguiente": "FIN"` para pasar a la evaluación de finales. Las opciones pueden llevar `"solo_si": "marca"` o `"salvo_si": "marca"` para aparecer según lo que pasó antes.
