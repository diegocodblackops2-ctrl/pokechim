# Revisión editorial y técnica · Ruta EPP (SEG360-R3-EPP)

Documento interno para la revisión experta humana (prevención de riesgos y normativa chilena). No va al participante.
Fecha de la revisión: octubre de 2026. Archivos revisados: `autoria/fuente/modulos/SEG360-EPP-M01…M06.json`, `casos/SEG360-CASO-EPP-1/2.json`, `videos/SEG360-VID09…12.json` y `docente_privado/fuente/EVAL-EPP.json`.

No cambió ningún ID, ningún conteo de pantallas, ítems, opciones ni nodos, ni la estructura de claves. JSON validados; los dos casos se siguen recorriendo de punta a punta y alcanzan sus cuatro finales; el chequeo estructural de la evaluación queda con 0 errores y 0 advertencias.

---

## 1. Cambios realizados

### 1.1 Laboratorio ↔ caso

**M04-LAB ↔ SEG360-CASO-EPP-1 (Despacho con lluvia)**
- LAB-P01: ahora es «Martes, 16:10, llueve», con la carga del caso: 24 cajas, 8 con esquineros de fleje metálico, y un pallet de bidones DG-40. El camión sale a las 17:30 y la envolvedora está girando con otro pedido. Se eliminó la afirmación de que la envolvedora «tiene su reja», porque en el caso el film alcanza a tirar de la manga.
- LAB-P02 y LAB-P03: las fichas ficticias «GT-35» (PVC) y «CI-10» (chaqueta) se reemplazaron por las mismas dos fichas que usa el caso: el **guante B** (cuero anticorte con forro) y el **guante A** (nitrilo de puño largo). Se reescribieron las preguntas y el feedback. El contenido cuadra con las evidencias `e_ficha_a` y `e_ficha_b` del caso.
- LAB-P04: la combinación que falla ahora es la del caso: parka talla L que tapa el chaleco, capucha con cordones, antiparras que se empañan y guantes de cuero empapados junto a la envolvedora en marcha. La opción correcta coincide con la del nodo n5 del caso.
- LAB-P06 (construir): se alinearon el contexto, la ayuda, los criterios y los ejemplos con el caso (toldo, pasillo 2, guía del camión, hoja de datos, parka talla L, armario de EPP). Se quitaron el cartonero y los zunchos, que no aparecen en el caso.
- LAB-P07: se ajustó la idea 3 (toldo, máquina detenida, guía del camión).
- Caso EPP-1: se unificó «armario de EPP, junto al andén». El registro de entrega ahora dice quién entregó: Marisol. En la hoja de datos se corrigió la frase de primeros auxilios que estaba duplicada y se unificaron el peligro («lesiones oculares graves») y la protección ocular («antiparras»). No se tocaron nodos, opciones, marcas, condiciones ni `siguiente`.

**M06-LAB ↔ SEG360-CASO-EPP-2 (Turno de limpieza profunda)**
- LAB-P01, P04 y P05: «viernes 18:10» pasó a **sábado 8:30 con la bodega cerrada**. Marisol está de turno por teléfono, Patricia no trabaja los sábados y la visita de Los Aromos es el lunes, igual que en el caso.
- LAB-P02: el resumen de la hoja de datos ahora es la del DG-40 del caso: peligros, dilución agregando el producto al agua, no mezclar con cloro ni ácidos, ventilación, nitrilo según la tabla del fabricante, antiparras al diluir y primeros auxilios. Se suavizó la frase absoluta «todo producto químico debe tener su hoja de datos» (ver 2.6).
- LAB-P03: la ficha de «guante desechable de nitrilo» pasó a **guante desechable de látex**, que es lo que hay en el armario del caso (en el caso, «no hay guantes de nitrilo»). Los «lentes sin sello» ahora son «lentes sin protección lateral». Se reescribieron las preguntas y el feedback.
- LAB-P05 (construir): el contexto y el ejemplo sólido calzan con el caso: sector C, portón cerrado, armario con látex, lentes sin protección lateral, mascarillas para polvo, botas y pecheras, y Héctor con barba de varios días. El seguimiento se deja en el formulario de solicitud y en el cuaderno de novedades, igual que en el nodo m7. El desengrase pasa al lunes a primera hora, como en el final seguro.

### 1.2 Coherencia entre módulos
- **Desengrasante**: el producto se llamaba «DA-40» en M04-L03-P02 y «DG-40» en los casos. Quedó como **DG-40** en todo el curso, con un solo perfil: «provoca irritación de la piel y lesiones oculares graves». Se ajustó el feedback de M04-L03-P02 que hablaba de «quemaduras».
- **Respirador R-200**: M03-L02-P06 decía que los filtros FC-30 eran «serie M». Ahora son compatibles con la pieza **R-200**, la misma de M03-LAB-P02 y M05-LAB-P03.
- **Lugar donde se guarda el EPP**: se unificó como «armario de EPP». Antes había «estante de EPP» (M02-L01), «repisa» (M04-L03-P03 y M04-LAB) y «pañol» (unas 40 veces en EVAL). En la evaluación, el «pañol de mantención» pasó a ser el «taller de mantención», que es como lo llama M03; la bomba dosificadora quedó en la «sala de aseo», como en M04.
- **Quién entrega el EPP**: Marisol entrega y registra. En M01-L02-P01 los guantes ya no salen «de Héctor», sino del armario.
- **Barba de Héctor**: Héctor normalmente se afeita y usa respirador con prueba de ajuste (M03, M05). Por eso la barba aparece solo donde importa para el sello, y siempre como **barba de varios días**: M03-L03-P07, el caso EPP-2 (antes decía «barba de varias semanas» y la imagen mostraba barba completa), EVAL PA-A12 y la tarea, variante B. Se ajustaron los prompts y los textos alternativos de IMG076 e IMG078. En IMG078 se quitó la barba porque ahí no importa.
- **Lentes ópticos de Héctor**: EVAL PA-A08 decía «Héctor, que no usa lentes ópticos», lo que contradice M02. Ahora el ítem habla de «un auxiliar del turno tarde».
- **Talla de guante de Camila**: es S, como en M05 y M06. Se eliminó la «talla 7» de M04-LAB y de EVAL (PA-A02 y tarea A, donde las tallas del GN-35 pasaron a S, M, L y XL, con anclas y pauta ajustadas).

### 1.3 Evaluación ↔ enseñanza (EVAL-EPP.json)
- **PA-B14** (M04, media, ordenar): la secuencia para quitarse los guantes, que el curso enseña solo de pasada, se reemplazó por un ítem de **lectura de una hoja de datos antes de diluir**: leer la hoja, verificar dosificador y ventilación, ponerse el EPP indicado, diluir sin mezclar y cerrar sin contaminarse. Es lo que se practica en M04-L03-P02, M06-LAB y los dos casos. Se mantienen el ID, el tipo, la clave b-a-d-e-c y el puntaje. Se agregó una alternativa válida (b-d-a-e-c), porque revisar los controles y ponerse el EPP pueden invertirse sin exponerse.
- **PA-B20**: el ítem decía que un calendario de cambio de filtros «es un error». Ahora sigue lo que enseñan M03 y M05: un programa de cambio que define la empresa con la información del fabricante y, además, cambio inmediato si cuesta respirar o si el filtro está dañado o húmedo. Se mantiene la clave c.
- **PA-B10**: el feedback ahora dice explícitamente que la prueba de ajuste la hace personal competente con un procedimiento, y que la verificación de sello la hace la persona en cada uso.
- **PA-B15 y B16 (UV)**: «gorro tipo legionario» pasó a «jockey con legionario», el término del módulo (M04-L03-P05).
- **PP-A08**: ítem corregido para que no contradiga lo enseñado sobre la envolvedora (detalle en el material docente privado).
- **PA-A20 y PA-B06**: la ficha ficticia del casco C-3 decía «hasta 5 años», la misma cifra del mito que desarma M02-L01-P07. Se cambió a «hasta 4 años». Sigue siendo un plazo que declara ese fabricante ficticio, no una regla general, y la clave no cambia (A20: 2 años, dentro del plazo pero con señales de retiro; B06: 5 años y 7 meses, plazo superado).
- La distribución de claves, la tabla de especificaciones, los conjuntos y los conteos no cambiaron.

### 1.4 Seguridad del contenido y lenguaje
- **M04-L01-P07, elemento 8**: decía «acercarse a guiar el film mientras el plato gira» y lo clasificaba como «sin guantes», lo que se podía leer como «a mano descubierta está bien». Ahora el elemento es vigilar el ciclo junto al panel, sin tocar la carga, y el feedback dice que primero se detiene la máquina.
- En las voces: se quitó un código («AP-30», en M02-LAB-P03). «Les cuento» pasó a «Te cuento» (M03-L01-P02), «fíjense» a «fíjate» (M06-LAB-P02) y «les quería mostrar» a «te quería mostrar» (M04-LAB-P04).
- En VID11, escena 3, el texto en pantalla «Buen filtro + fuga = poca protección» pasó a «Buen filtro con fuga: poca protección». También se ajustó la descripción accesible.
- No se encontraron palabras internas de producción (SCORM, LMS, voz sintética, placeholder, etc.) en los textos para el participante.

---

## 2. Afirmaciones normativas y técnicas sensibles que quedan (para validar)

| # | Pantalla o ítem | Afirmación (resumen) | Fuente del catálogo | Observación para quien revise |
|---|---|---|---|---|
| 2.1 | M01-L03-P02; M05-L01-P02; M05-L03-P05 y P07; M06-L02-P03 y P07; EVAL PA-A02 | El empleador entrega EPP adecuados al riesgo, sin costo y con instrucción. La persona debe usarlos mientras esté expuesta. | SST-DS594 | Corresponde al art. 53 del DS 594. El artículo se cita solo en M01-L03-P02. |
| 2.2 | M01-L03-P02; M02-L01-P03; M03-L01-P05; M03-L02-P03; M04-L01-P02; M04-L02-P02; M05-L01-P02; EVAL PA-B02 | Los EPP deben contar con certificación de calidad, y el ISP mantiene información sobre EPP certificados. | SST-DS18, SST-ISP-EPP | Correcto según el brief. No se nombra ninguna norma técnica de certificación. |
| 2.3 | M03-L01-P03 (tarjeta y profundiza), M03-L01-P09 | 85 dB(A) para 8 horas como referencia del DS 594. Criterio de igual energía: cada 3 dB(A) más, el tiempo permitido se reduce a la mitad (88 dB(A), unas 4 horas). | SST-DS594, SST-PREXOR | Coincide con la tabla del DS 594 para ruido estable o fluctuante. Conviene confirmarlo contra el texto vigente. |
| 2.4 | M03-L01-P02 (profundiza) | Las personas expuestas sobre los criterios del protocolo del Minsal entran a vigilancia de salud a través del organismo administrador. | SST-PREXOR, SST-LEY16744 | Va sin cifra de acción a propósito. |
| 2.5 | M02-L02-P02 (profundiza); M04-L03-P05 (texto, nota y profundiza); EVAL PA-B15 y B16 | La Ley 20.096 obliga al empleador a adoptar medidas para proteger a quienes trabajan expuestos a radiación UV. El índice UV se publica a diario y la radiación UV atraviesa las nubes. | EPP-LEY20096 | No se cita artículo ni guía técnica específica («la autoridad sanitaria ha emitido orientaciones»). Validar la redacción. |
| 2.6 | M04-L03-P05 (voz y bloque «Ojos») | Un lente oscuro sin filtro UV dilata la pupila y puede dejar entrar más radiación. | EPP-FABRICANTE | Afirmación técnica sensible. Se mantuvo con «pueden ser peores». Revisar si se suaviza más. |
| 2.7 | M06-LAB-P02 (texto y profundiza) | Los productos químicos que se usan en el trabajo vienen con una hoja de datos de seguridad que entrega el proveedor. Tiene que estar disponible donde se usa el producto, y la empresa debe informar lo que dice. | SST-DS44 (derecho a la información), EPP-ISP-GUIAS | Se quitó el absoluto «todo producto debe tener». No se cita el reglamento de etiquetado de sustancias químicas porque no está en el catálogo. Revisar la redacción. |
| 2.8 | M06-L02-P03 (profundiza) | El Código del Trabajo reconoce el derecho a interrumpir labores y, si es necesario, abandonar el lugar ante un riesgo grave e inminente, informando de inmediato a la jefatura. | SST-CT184 | Va sin número de artículo ni plazos, como se pidió. Confirmar la redacción. |
| 2.9 | M01-L01-P02 y P03; M06-L02-P03 y P07; M06-L03-P05 | Art. 184 del Código del Trabajo: deber de protección eficaz. | SST-CT184 | Según el brief. |
| 2.10 | M01-L01-P02 (nota); M01-L02-P02; M03-L02-P03; M06-L03-P02 y P05 | DS 44 de 2024: jerarquía de controles, matriz, derecho a la información y Comité Paritario (obligatorio sobre 25 personas trabajadoras). Vigente desde febrero de 2025. | SST-DS44 | Según el brief. |
| 2.11 | M06-L03-P05 (profundiza) | Si alguien es perjudicado por avisar, puede plantearlo a la jefatura, a la prevencionista, al Comité Paritario o, cuando corresponda, a la Inspección del Trabajo. | SST-DS44 | Va sin base legal específica. Validar. |
| 2.12 | M01-L01-P03, P06; M01-LAB-P02 | Ley 20.949: máximo de 25 kg de manejo manual por persona. | SST-LEY20949 | Según el brief. |
| 2.13 | M03-L03-P02 y P05; M03-LAB; M05-LAB-P03; VID11; EVAL PA-A12, PA-B10, PA-B11, PP-A02, PP-B10 y tarea B | La prueba de ajuste la hace personal competente con un procedimiento (cualitativa o cuantitativa) y vale para un modelo y talla. El chequeo de sello (presión positiva y negativa) lo hace la persona en cada colocación y no la reemplaza. Con barba o vello en la zona del sello no se usan respiradores de ajuste facial. | EPP-ISP-RESP | Coherente en todo el curso. M03-L03-P05 describe en general cómo es la prueba (capucha, ejercicios). |
| 2.14 | M03-L01-P04, elemento 7 | La mantención de la sierra se clasifica como control de ingeniería («actúa sobre la fuente»). | SST-PREXOR | Se puede discutir: otras fuentes la clasifican como administrativa. Decidir. |
| 2.15 | M02-L01-P03 y P07; M05-L03-P02; VID10; EVAL PA-A20 y PA-B06 | No hay vida útil universal para cascos. En la evaluación, las fichas ficticias C-3 declaran «hasta 4 años» como dato de ese fabricante. | EPP-FABRICANTE | Se cambió desde 5 años para no reforzar el mito. Se puede reemplazar por una redacción sin cifra si se prefiere. |
| 2.16 | M04-L01 (P02, P06 y P07); M04-LAB-P02 y P03; caso EPP-1; EVAL DG-04, PA-A13, PP-A08 y tarea | No se usan guantes cerca de partes que giran, y la máquina se detiene antes de acercar la mano. | EPP-FABRICANTE, EPP-ISP-GUIAS | M04-L01 dice «en general», con una excepción solo si la evaluación y el fabricante de la máquina indican otra cosa. Confirmar si se mantiene esa excepción. |
| 2.17 | M04-L02-P02 (profundiza); M04-L02-P07 | Después del impacto fuerte de un objeto pesado sobre la puntera, se recomienda reemplazar el calzado. | EPP-FABRICANTE | Va como recomendación del fabricante. |
| 2.18 | M04-L03-P02; casos EPP-1 y EPP-2; M06-LAB-P02 | Hoja de datos ficticia del DG-40: irritación de la piel, lesiones oculares graves, vapores irritantes en lugares cerrados, no mezclar con cloro ni ácidos, diluir agregando el producto al agua, nitrilo según la tabla del fabricante, antiparras al diluir y primeros auxilios con agua abundante. | EPP-FABRICANTE | Producto ficticio, unificado en los cuatro lugares. Revisar que los primeros auxilios estén redactados con prudencia. |
| 2.19 | EVAL tarea A (A-D1) | DX-40, otro producto ficticio de la evaluación: el concentrado provoca quemaduras y la dilución 1:10 es irritante. | EPP-FABRICANTE | Se dejó distinto del DG-40 a propósito, porque es una situación nueva y solo vale lo que dicen sus fichas. |

## 3. Puntos que quedan a criterio de la revisión experta
1. Si se mantiene la cifra ficticia de vida útil del casco C-3 (2.15) o se reescriben A20 y B06 sin cifra.
2. La clasificación de la mantención de la sierra (2.14).
3. La alternativa válida agregada en PA-B14. Sin ella, el ordenar podría penalizar una secuencia segura.
4. Que la imagen IMG058 (M06, Héctor afeitado con respirador) y las del caso EPP-2 (barba de varios días) se generen de acuerdo con esta línea de continuidad.
