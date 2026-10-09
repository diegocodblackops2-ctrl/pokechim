# Revisión editorial y técnica · Ruta CIBER (SEG360-R2-CIBER)

Fecha de la revisión: 9 de octubre de 2026. Archivos revisados: `SEG360-CIBER-M01…M06`, `SEG360-CASO-CIBER-1` y `-2`, `SEG360-VID05…08` y `docente_privado/fuente/EVAL-CIBER.json`.

Este documento es para revisión experta humana. Lista (1) las convenciones que quedaron unificadas, (2) cada afirmación normativa o técnica sensible que sigue en el contenido, con la pantalla y la fuente del catálogo, y (3) los cambios hechos. No se cambiaron IDs, conteos de pantallas, ítems, opciones, claves, marcas, condiciones ni `siguiente`. Ambos casos se recorrieron por completo con un simulador: todos los nodos y todos los finales son alcanzables (CIBER-1: 6 finales, 10 392 caminos; CIBER-2: 5 finales, 25 272 caminos).

---

## 1. Convenciones unificadas de Pehuén (ruta CIBER)

| Elemento | Versión canónica |
|---|---|
| Soporte TI | Ignacio «Nacho» Pérez. Anexo **210** (horario de oficina). **Celular de soporte** +56 9 0000 0210, publicado en la intranet y en el afiche junto a la impresora; contesta también fuera de horario. Chat interno, con un **canal de incidentes**. Correo soporte@pehuen.example. |
| Canal fuera de horario | Si entregaste tu clave o aprobaste algo: llamar al celular de soporte. Si rechazaste todo y no entregaste nada: basta dejar el aviso escrito en el canal de incidentes del chat interno (Nacho lo revisa hasta la medianoche y a primera hora). Si el correo puede estar comprometido: nunca avisar por correo. Los viernes Nacho sale a las 18:00. |
| Reporte de mensajes | Botón **«Reportar»** del correo o aviso a Nacho, sin reenviar a colegas. |
| Regla de pagos | «En Pehuén, **los datos bancarios nunca se cambian por correo**»: todo cambio se confirma por teléfono con el contacto registrado y lo aprueba **Rodrigo** (doble aprobación), con registro de la verificación. |
| Herramienta de IA autorizada | **Asistente Pehuén**, con la cuenta corporativa. Nunca contraseñas; datos personales o confidenciales solo si la política lo permite para esa tarea. |
| Niveles de clasificación | **Pública, Interna, Confidencial, Restringida** (M01-LAB-P02). Base de clientes, cotizaciones y contratos: Confidencial. Liquidaciones, licencias médicas, datos bancarios y claves: Restringida. |
| Embalajes del Litoral | Dominio `litoral.example`. Claudia Herrera, cobranzas; Verónica Lagos, jefa comercial; Jorge, recepción. Central registrada +56 32 555 0147, anexo 214 (cobranzas). |
| Ferretería Los Aromos | Paula Reyes, compras (`paula.reyes@losaromos.example`); Andrés, logística; Sr. Tapia, contacto de pagos. |
| Estudio contable externo | Sofía Araneda (`saraneda@andescontable.example`). |

---

## 2. Afirmaciones normativas que quedan (Chile)

Criterio aplicado: solo lo que el brief permite o es claramente correcto; sin artículos, plazos ni multas.

| Pantalla / ítem | Afirmación | Fuente |
|---|---|---|
| M01-L01-P07 (nota), M06-L01-P02 (profundiza), M06-L03-P02 (nota) | La Ley 21.663, Ley Marco de Ciberseguridad (2024), creó la ANCI y el CSIRT Nacional y establece deberes de reporte para ciertas organizaciones; si una empresa como Pehuén los tiene lo determina la propia empresa. | CIB-LEY21663, CIB-CSIRT |
| M01-L03-P01, P03 (texto, nota, profundiza), P09, CIERRE | Ley 21.719: publicada en diciembre de 2024, plena vigencia el 1 de diciembre de 2026; principios de licitud, finalidad, proporcionalidad y seguridad (y, en profundiza, calidad, responsabilidad, transparencia y confidencialidad); derechos de acceso, corrección, eliminación y oposición; crea una agencia de protección de datos que fiscaliza y sanciona. | CIB-LEY21719 |
| M01-L03-P02 (texto, profundiza) | Definición de dato personal y de dato sensible (salud, biométricos, afiliación sindical, creencias, orientación sexual, entre otros); los sensibles solo se tratan en casos que la ley contempla, como el consentimiento o el cumplimiento de obligaciones laborales. **Revisar redacción con asesoría legal.** | CIB-LEY21719 |
| M01-L03-P04 (profundiza) | Hay datos que no se pueden eliminar de inmediato por obligaciones legales de conservación (tributarias, laborales), sin plazos. | CIB-LEY21719 |
| M04-L02-P02, M04-L03-P01, M05-L01-P02, M05-L03-P02 (nota), M06-L03-P02 | La Ley 21.719 refuerza el deber de proteger datos personales; usar datos para fines definidos, en la medida necesaria y con seguridad. | CIB-LEY21719 |
| M02-L03-P02 (nota), M02-LAB-P02 (profundiza) | La Ley 21.459 sanciona, entre otras conductas, el acceso ilícito a sistemas y el fraude informático; el cambio de cuenta de proveedor «puede constituir» fraude informático. | CIB-LEY21459 |
| M03-L03-P02 (profundiza) | Acceder sin autorización a un sistema informático, **superando sus medidas de seguridad**, es delito según la Ley 21.459 (se agregó el matiz de las medidas de seguridad). | CIB-LEY21459 |
| M04-L03-P01 (texto, nota, profundiza), M04-L03-P05 (profundiza) | Ley 21.220 (2020) modificó el Código del Trabajo: acuerdo escrito, equipos, herramientas y materiales (incluidos EPP) los proporciona el empleador, derecho a desconexión; su reglamento de seguridad y salud: el empleador identifica y evalúa riesgos, informa y capacita; la persona cumple las medidas y avisa cambios. | SST-LEY21220 |
| EVAL DG-01, DG-05, PA-A01, A03, A04, A17, A19, B03, B16, B17, B19, PP-A01, A02, A09, A10, PP-B01, B02 | Aplicación de los principios de la Ley 21.719 (finalidad, proporcionalidad, datos sensibles) sin citar artículos. | CIB-LEY21719 |

## 3. Afirmaciones técnicas sensibles que quedan

| Pantalla / ítem | Afirmación | Fuente |
|---|---|---|
| M01-L01-P02 (nota) | NIST CSF 2.0 incluye la función «Identificar». **Corregido**: antes decía que el marco «parte por» Identificar; en la versión 2.0 la función Gobernar es la central. | CIB-NISTCSF2 |
| M06-L01-P02, M06-L03-P02 | NIST CSF 2.0 (2024): seis funciones (Gobernar, Identificar, Proteger, Detectar, Responder, Recuperar); es un marco de gestión, no ley ni certificación; contenido de Responder y Recuperar. | CIB-NISTCSF2 |
| M04-L01-P02 (profundiza) | La gestión de actualizaciones cae dentro de la función Proteger del CSF 2.0. | CIB-NISTCSF2 |
| M02-L01-P05, M02-L02-P03, M04-L02-P03 | El candado / https indica conexión cifrada, no que el sitio sea legítimo; el dominio que manda es el que está justo antes de la primera «/». | CIB-CISA-PHISH, CIB-INCIBE |
| M02-L02-P02, P05, P06, P07 | QR adulterado (quishing), smishing, vishing; escanear ya es abrir el link; el número que aparece en pantalla se puede falsificar; los códigos de verificación no se comparten. | CIB-CISA-PHISH, CIB-INCIBE |
| M02-L03-P02, LAB-P02 (profundiza) | Patrón del fraude de cambio de cuenta (cuenta del proveedor comprometida, lectura silenciosa, reglas de reenvío); mientras antes se avisa al banco, más posibilidades de recuperar el dinero (sin garantía). | CIB-CISA-PHISH, CIB-INCIBE |
| M03-L01-P02, P03, P04 (y LAB-P02) | Relleno de credenciales; el largo pesa más que los símbolos; las guías del NIST no recomiendan cambios periódicos forzados sin motivo y sí revisar listas de claves comprometidas. | CIB-NIST80063B |
| M03-L01-P05 | El gestor rellena solo en el dominio guardado (ayuda a detectar phishing); clave maestra única con MFA; recuperación de la bóveda puede ser imposible sin preparación previa. | CIB-NIST80063B, CIB-INCIBE |
| M03-L02-P02, P03 | SMS desviable por duplicado de SIM; códigos y aprobaciones se pueden capturar con una página falsa en tiempo real; fatiga de MFA; CISA recomienda la coincidencia de números como mitigación. | CIB-CISA-MFA, CIB-NIST80063B |
| M03-L02-P02, P05, glosario; EVAL PA-A11, PP-A06 | Passkeys y llaves físicas (FIDO) ligadas al origen: resistentes al phishing, **no infalibles** (equipo desbloqueado, malware con sesión abierta, recuperación débil, pérdida del dispositivo). **Ajustado**: la nota ahora dice que «están entre» las formas resistentes al phishing (CISA también incluye MFA basado en PKI) y agrega «resistentes no significa infalibles». | CIB-FIDO, CIB-CISA-MFA |
| M03-L03-P02, P04, P05 | Preguntas de seguridad débiles; números reasignados; verificación de identidad por devolución de llamada; códigos de respaldo de un solo uso. | CIB-NIST80063B |
| M04-L01-P02, P04, P05, P06, P07 | Actualizaciones y vulnerabilidades conocidas; actualizaciones falsas en páginas web; atajos Windows + L y Control + Comando + Q; riesgo de convertidores en línea y extensiones. | CIB-INCIBE, CIB-CSIRT |
| M04-L02-P02 | Dispositivos con forma de pendrive que el equipo reconoce como teclado. | CIB-INCIBE |
| M04-L02-P03, P04, P05, glosario | La VPN cifra el camino a la red de Pehuén pero no protege de phishing, malware, aprobaciones falsas ni miradas; red con clave compartida no protege de otros clientes; redes gemelas y portales cautivos; VPN gratuitas no autorizadas; el punto de acceso del celular «suele» ser más seguro que un Wi-Fi abierto. | CIB-INCIBE |
| M05-L02-P02, P03 | Papelera e historial de versiones no reemplazan los backups; quitar mal la sincronización puede borrar archivos en la nube. | CIB-NISTCSF2, CIB-INCIBE |
| M05-L03-P02, P04, P06 | Qué revisa una empresa al autorizar una IA; seudonimizar no es anonimizar; la IA genera texto probable, no verificado («alucinación»); la IA no detecta fraudes con certeza. | CIB-LEY21719, CIB-NISTCSF2 |
| M06-L01-P03, P05; M06-L02-P02, P04; VID08; EVAL PA-A23, B23 | Señales de cuenta comprometida (reglas de reenvío, enviados); ransomware; lentitud sola no prueba nada; desconectar la red si el procedimiento lo indica y **no apagar** sin consultar porque se pierde información en memoria; cambiar la clave desde otro equipo y coordinado con TI. | CIB-NISTCSF2, CIB-INCIBE, CIB-CSIRT |
| M06-L03-P02 (profundiza) | Backups probados y al menos una copia separada de la red. | CIB-NISTCSF2 |
| Varias pantallas | «Ningún control protege al cien por ciento» (antivirus, MFA, VPN, IA autorizada). | General |

---

## 4. Cambios realizados

### Laboratorio ↔ caso
- **M02-LAB (P01–P04) ahora calza con SEG360-CASO-CIBER-1**: martes 16:45, nómina de las 18:00, hilo «Facturas septiembre – Pehuén», Claudia Herrera de cobranzas, dominio parecido `litoral-embalajes.example`, celular en la firma, central registrada con anexo de cobranzas, Rodrigo en vuelo a Puerto Montt. Antes decía martes 10:05, hilo «Factura agosto», pago del viernes y «margen para verificar sin apuro». El bloque «El tiempo» ahora dice que retener un pago es legítimo si no alcanzas a confirmar. La nota sobre el hilo real incluye el caso del dominio casi igual.
- M02-LAB-P04 (`construir`): contexto, ayuda del mensaje al proveedor (por el contacto registrado, no por el hilo, coherente con el nodo n7 del caso), criterios de nivel 2–3 (pago de hoy: a la cuenta registrada solo con confirmación; si no, se retiene, como en los finales del caso), ejemplo sólido y ejemplo débil reescritos con los datos del caso.
- **M06-LAB-P04 (`construir`) ahora calza con SEG360-CASO-CIBER-2**: el ejemplo sólido sigue un recorrido real del caso que termina en «Contenido a tiempo» (n1 reenvío a Marisol → n2 «No fui yo» → n3 llamada al celular de soporte → n4a relato completo → n5 cambio de clave sin usar el link del SMS → n6 revisión de reglas con Nacho → n7 alerta a Marisol). Se reemplazaron los datos «ilustrativos» (`factura-electronica.invalid`, 16:52, desconexión del Wi-Fi, computador de Rodrigo) por los del caso: viernes 17:46/17:50/17:51/17:53/17:56, `avisos@seguimiento-envios.example`, `correo-pehuen.seguimiento-envios.invalid`. Se mantuvo el error honesto (reenvío a Marisol), que existe como opción del caso. Contexto, voz y ejemplo débil ajustados.
- M06-LAB-P02 y P03: tarjeta del canal oficial y textos de presentación alineados con el caso (viernes, casi las seis, local, Nacho sale a las 18:00).

### Casos
- CIBER-1: la ficha del maestro (e3) enuncia la regla canónica y la aprobación de Rodrigo. El reporte a Nacho se hace con el botón «Reportar» (n3 feedback, n4 opción 5, n6 opción 1) en vez de «reenviar como adjunto».
- CIBER-2: «celular de soporte de Nacho» en n3; el cambio de clave se hace desde otro equipo (oficina del segundo piso), coherente con M06-L02 («desde otro dispositivo»), en e5 y n5; Camila escribe por el chat interno y el grupo pasa a ser «del local y bodega» (Camila es de bodega); el debrief nombra los canales canónicos.

### Coherencia entre módulos
- Canal fuera de horario unificado en M03-LAB-P03 (contexto y ejemplo sólido), M03-LAB-P04 (respuesta automática de Nacho), M06-L02-P02, M06-LAB-P02 y M06-L03-P07.
- Botón «Reportar» en M03-L02-P06, M03-LAB-P04 y M04-LAB-P03 (este último decía «reenviar el aviso por el canal de reporte», contradictorio con «no reenvíes»).
- Regla «los datos bancarios nunca se cambian por correo» en M02-L03-P06, M02-LAB-P02/P04, M06-L03-P05 y caso CIBER-1.
- Clasificación: M04-LAB-P03 («Uso interno» → Confidencial), M05-L03-P05 (reclamos con datos de clientes → Confidencial), M05-LAB-P04 (pagos con datos bancarios y remuneraciones → Restringida). M01-LAB-P02: Confidencial ya no dice «carpeta restringida» para no confundir con el nivel Restringida. M01-LAB-P01: «un par de archivos» con link público (eran dos).
- Nombres: el contacto de Los Aromos de la voz de M06-L01-P06 pasa de «don Raúl» (que en M01 es un vecino de la Sra. Inés) a Paula Reyes; M06-INTRO, «una clienta». En M06-L03-P01 y P06, el correo que abrió Javier «citaba una conversación» suya (antes «traía mi firma», incoherente).
- M04-LAB-P06: «miércoles en la oficina» (antes jueves, día de teletrabajo de Javier). M04-LAB-P05: aviso de pérdida al celular de soporte.
- M03-INTRO explica MFA la primera vez que aparece en el módulo (se usaba en L01 antes de definirse en L02).
- M05-L03-P05: tarjeta «terminada en 2209» (antes 4417, el mismo final que la cuenta de Litoral del caso).
- VID08: el clic del microvideo es un jueves (antes viernes, se confundía con el caso del viernes de Daniela).
- Voz: se reescribieron dos voces que repetían el texto en pantalla (M05-L03-P05, M06-L02-P07). Revisión automática: ninguna voz tiene direcciones, URLs, cifras, paréntesis ni símbolos; solo siglas comunes (MFA, VPN, QR, TI, IA, SMS, RUT, PDF, PIN).
- M02 (escritorio, t2): «Un banco nunca te pide…» → «Para anular algo, el banco no necesita que le leas una clave dinámica».

### Evaluación (EVAL-CIBER.json)
- Contadora externa renombrada a **Sofía Araneda** (PA-A04, PA-A17, variante A de la tarea, anclas y pauta): «Paula Reyes» es la compradora de Los Aromos en M05 y M06.
- Embalajes del Litoral: Verónica Lagos queda como jefa comercial y Claudia Herrera como cobranzas, igual que en el caso (PA-A07, A08, tarea A-D6); teléfono de la central unificado con el caso (+56 32 555 0147).
- Variante B de la tarea: el falso soporte se llama «Cristián» (antes «Felipe», mismo nombre que el ex trabajador Felipe Araya de M05).
- PP-B12: ya no afirma que Pehuén no tenía procedimiento escrito para cambios de cuenta (contradecía M02 y el caso); ahora la causa es que la ficha de un proveedor nuevo no tenía teléfono registrado. Hora 17:30 (antes 17:50, la del caso).
- PP-B04: «aprobación de Rodrigo» en vez de «aprobación del procedimiento». PA-A19: tarjeta «3390».
- Se revisó que cada ítem y la tarea evalúen lo que se enseña y practica en los módulos: no fue necesario reescribir ítems completos. Se mantuvieron IDs, conteos (6 + 24 + 24 + 12 + 12), tipos, claves y su distribución, y feedback por opción.

## 5. Para la revisión experta
1. Redacción sobre datos sensibles y bases de tratamiento en M01-L03-P02 (profundiza) frente al texto final de la Ley 21.719.
2. Lista de principios de la Ley 21.719 en M01-L03-P03 (profundiza).
3. Descripción del reglamento de la Ley 21.220 en M04-L03-P01 (profundiza).
4. Deberes de reporte de la Ley 21.663 «para ciertas organizaciones» en M06-L01-P02.
5. Recomendación de no apagar el equipo ante sospecha de malware (M06-L02-P02, P04, P07; EVAL PA-A23, B23): está condicionada al procedimiento de la empresa; confirmar que calza con la política que se quiera enseñar.
