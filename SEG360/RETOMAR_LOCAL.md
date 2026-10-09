# SEG360 · Guía para retomar en local (Claude Code)

Rama: `claude/peaceful-curie-2b8ce7` del repo `diegocodblackops2-ctrl/pokechim` (repo **público**). Todo lo de este curso vive en `SEG360/`. El Curso 5 (IA), en `curso/`, `docs/` y `herramientas/`, **no se toca**.

Encargo original: `SEG360` es el curso «Seguridad 360: prevención, ciberseguridad y protección personal» de Dibork Learning. Tiene 3 rutas (SST, CIBER y EPP), 3 certificados, 18 módulos y unas 57 h. El prompt maestro completo lo tiene Diego (`01_PROMPT_AGENTE_CURSO_SEGURIDAD_360.md`). Lo que pide Diego, en sus palabras:
- un curso «de otro nivel», con mucha interacción e inmersión real: escenas 3D recorribles con hotspots, EPP en 3D, un computador simulado, videos, tarjetas, arrastrar, música y efectos;
- interfaz futurista con personalidad, no «simplona»;
- que cargue rápido;
- español de Chile natural, sin traducciones chafas;
- **nunca** cosas internas en pantalla: SCO, SCORM, LMS, «voz sintética», «imagen generada con IA», etc.

---

## 0. Primero: restaurar lo privado (no está en git en claro)

El material docente privado (bancos de evaluación con claves, rúbricas con anclas y pauta) va cifrado en `SEG360/respaldo_privado/SEG360_privado_docente.zip.enc`. **Diego tiene la clave.** Para descifrarlo:

```bash
cd <repo>
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in SEG360/respaldo_privado/SEG360_privado_docente.zip.enc -out /tmp/seg360_priv.zip -pass pass:'<CLAVE>'
unzip -o /tmp/seg360_priv.zip -d .        # crea SEG360/docente_privado/fuente/EVAL-SST.json, EVAL-CIBER.json, EVAL-EPP.json
```
- `SEG360/docente_privado/` está en `.gitignore`. Nunca subirlo en claro.
- Si se edita, vuelve a cifrarlo con el mismo comando, cambiando `-d` por `-salt` y entrada por salida.
- Los originales de las imágenes (`SEG360/originales_medios/`, 27 MB) tampoco van en git; en el curso ya están los WebP. Si hacen falta, se reexportan desde Canva con los `media_id` de `SEG360/diseno/registro_A.json` y `registro_B.json`.

## 1. Requisitos y comandos

- Python 3.10+ con `pillow` y `python-docx`. Node 18+ con `playwright` (Chromium) y `esbuild` (`npm i -D esbuild three@0.186.1` dentro de `SEG360/desarrollo/`; el build busca `SEG360/desarrollo/node_modules/.bin/esbuild`). `ffmpeg` en el PATH.

```bash
python3 SEG360/desarrollo/herramientas/optimizar_imagenes.py   # originales → WebP + variante --sm (si hay originales nuevos)
python3 SEG360/desarrollo/herramientas/build.py                # datos públicos, banco portátil ofuscado, íconos, paquetes min
cd SEG360/desarrollo/curso && python3 -m http.server 8770       # http://localhost:8770 (requiere servidor: no abrir con file://)
```

El build avisa si encuentra palabras internas en el texto público, si falta un módulo o evaluación, o si no hay descargables.

## 2. Estructura

```
SEG360/
  programa/Programa_y_objetivos.json   18 módulos, resultados, imágenes, videos, casos y recursos asignados (fuente de verdad del programa)
  autoria/fuente/_brief/               BRIEF_AUTORIA.md (tono, esquema de pantallas, catálogo 3D, escritorio), ESQUEMA_VIDEOS_CASOS.md, ESQUEMA_EVALUACION.md
  autoria/fuente/modulos/*.json        18 módulos COMPLETOS (613 pantallas en total, con texto, voz, profundiza, actividades y feedback)
  autoria/fuente/casos/*.json          6 casos ramificados (2 por ruta), validados por recorrido exhaustivo de caminos
  autoria/fuente/videos/*.json         12 microvideos (escenas, texto en pantalla, voz, descripción accesible)
  autoria/fuente/orientacion.json      7 pantallas de orientación
  diseno/Catalogo_imagenes.json|csv    86 imágenes (IMG001–078 + PER01–08) con prompt, alt y uso
  fuentes/Fuentes_y_revision.json      catálogo de fuentes (IDs usados en el contenido)
  fuentes/revision_SST.md, revision_CIBER.md, (revision_EPP.md)  afirmaciones normativas y técnicas para revisión experta humana
  desarrollo/curso/                    EL CURSO (reproductor «Señal»)
    index.html, config.js
    app/js/*.js                        fuente del reproductor (el build los une en app/s360.js)
    app/css/*.css                      fuente de estilos (el build los une en app/s360.css)
    app/vendor/three-s360.min.js       Three.js r186 + OrbitControls, RoomEnvironment, RoundedBox (se carga solo en pantallas 3D)
    app/fonts                          Bricolage Grotesque, Atkinson Hyperlegible Next, JetBrains Mono (OFL)
    data/                              GENERADO por build.py (curso.js, <mod>.js, caso-*.js, medios.js; eval-*.js NO se versiona)
    media/images/                      86 WebP + variantes móviles (5,8 MB)
    media/audio|music|sfx              VACÍOS: ver pendientes 3 y 4
  desarrollo/herramientas/build.py, optimizar_imagenes.py
  desarrollo/vendor_fuente/lucide-icons.tgz   íconos Lucide (ISC) de los que el build arma el sprite
  docente_privado/ (git-ignored)       EVAL-<RUTA>.json: diagnóstico 6 + producción 24 A + 24 B + portátil 12 A + 12 B + tarea aplicada A/B con rúbrica, anclas, pauta y respuestas límite
```

## 3. Cómo funciona el reproductor (`desarrollo/curso/app/js`)

| Archivo | Qué hace |
|---|---|
| `s-util.js` | DOM, íconos (`u.icon`), texto con **negrita** y listas, compresión LZ, ofuscación, carga diferida, preferencias |
| `s-store.js` | SCORM 2004 / 1.2 / local (adaptado del Curso 5). Una sección por ruta (`ori`, `SST`, `CIBER`, `EPP`). Ámbitos: `v` vistas, `r` resultados, `n` notas, `c` casos, `x` evaluación |
| `s-media.js` | Voz por pantalla (`media/audio/<ID>.mp3` + `.vtt`), velocidad, subtítulos, música con *ducking*, efectos (WebAudio). Solo aparece lo que existe en `data/medios.js` |
| `s-app.js` | Rutas `#/`, `#/orientacion`, `#/ruta/SST`, `#/m/<mod>`, `#/p/<pantalla>`, `#/caso/<id>`, `#/eval/<RUTA>/(diagnostico|situaciones|tarea)`, `#/recursos`, `#/glosario`; portada, ruta, módulo, marco de pantalla, índice, ajustes y progreso |
| `s-pantallas.js` | intro, cierre, apertura, explicación, tarjetas (flip), pestañas, proceso, comparación, diálogo, cierre de lección, reflexión, checklist, lanzador de caso |
| `s-actividades.js` | decisión, quiz, mito/realidad, clasificar (arrastrar + chips; pirámide de jerarquía de controles), ordenar, matriz 3×3, chat, bandeja de correo (los links muestran su destino real), permisos, ficha, inspección, construir con autoevaluación por criterios |
| `s-3d-kit.js` | Escenas procedurales `bodega`, `oficina` y `teletrabajo` (variantes `inicial` y `corregida`, con anclas por objeto del catálogo) y modelos `casco`, `lentes`, `antiparras`, `protector_facial`, `fono`, `tapones`, `respirador`, `guante`, `zapato`, `chaleco`, `operario`, `zapatilla_electrica` y `alargador`, con partes y desplazamientos de «vista separada» |
| `s-3d.js` | Visor: órbita, vistas de cámara, hotspots HTML proyectados, modo explorar o detectar (buscar con clic, «Mostrar pistas», evaluar riesgo y prioridad), lista accesible alternativa, modelo con partes resaltables, «Separar partes», visor mini y recorrido para videos |
| `s-escritorio.js` | Computador simulado: correo, navegador (URL con dominio resaltado; los formularios no reciben datos), archivos, celular (MFA, SMS, WhatsApp), chat interno, configuración, asistente de IA; misiones |
| `s-caso.js` | Casos a pantalla completa: variables, evidencias que se desbloquean, `solo_si`/`salvo_si`, finales por condición, cierre con Patricia o Daniela, volver a jugar |
| `s-video.js` | Microvideos armados en el navegador (foto con movimiento, íconos animados, tipografía, modelo o escena 3D), sincronizados con la voz de cada escena (`<VID>-S01`…); sin audio avanzan con el ritmo de lectura |
| `s-eval.js` | Diagnóstico, situaciones (A y B, ≥ 80 %), tarea aplicada que califica un docente vía campus, nota de ruta = 0,4 × situaciones + 0,6 × tarea, reporte SCORM por ruta (objetivos) y global (aprueba solo si todas las rutas incluidas aprueban; la nota es la mínima) |

`config.js`:
- `rutas`: `null` = las 3; `["SST"]` = paquete de una ruta.
- `evaluacion.perfil`: `portable` usa el banco portátil ofuscado; `dibork_verified` le pide los ítems y la corrección al campus por postMessage.
- `herramientas_vista_previa`: en los paquetes del campus va en `false`. Con `true` aparece el simulador de revisión docente, solo en vista previa local.

## 4. Estado al 9-oct-2026 (honesto)

**Hecho:**
- Las 18 lecciones-módulo están escritas y revisadas. La revisión editorial cruzada ya se hizo en SST y CIBER (registros en `fuentes/revision_*.md`). La de EPP estaba en curso: si no existe `fuentes/revision_EPP.md`, hay que repetirla (ver §6).
- 6 casos, 12 videos, orientación, catálogo de fuentes y las 3 evaluaciones completas (privadas).
- Reproductor completo, con build sin errores de consola en la vista previa (Chromium).
- 86 imágenes en WebP.
- Identidad visual «Señal · centro de control» (oscura, con vidrio, retícula y neón por ruta: SST ámbar `#FF9A52`, CIBER violeta `#B49CFF`, EPP menta `#33E3B2`, cian señal `#3FE0EE`). Los objetos del mundo (correos, fichas, documentos) son claros, con la clase `.claro`.

**Lo que se vio en la última captura y hay que arreglar:**
- `.v3d-btn` (barra de las vistas 3D) perdió el fondo en el tema oscuro: devolverle un vidrio oscuro con borde.
- **Modelos 3D toscos:** el casco tiene una «cresta» que sobresale, la visera mal formada y la cámara muy cerca. Hay que subir mucho la calidad de TODOS los modelos y escenas (ver §5.1). Para Diego esto es lo que más importa («hazme sentir orgulloso con la inmersión»).
- **Escena `oficina`:** la cámara «Vista general» quedó dentro de la sala de equipos. Revisar las posiciones de cámara de cada escena con capturas, una por vista.
- Pasar por QA visual todos los tipos de pantalla con capturas (escritorio, matriz, bandeja, caso, video, evaluación) y en móvil (390×844).

## 5. Pendientes, en orden de prioridad

### 5.1 3D de primer nivel (prioridad máxima)
- **Opción recomendada:** modelar los EPP y los objetos clave en Blender (`pip install bpy` funciona, 5.2) con materiales PBR. Exportar GLB optimizados (Draco o meshopt; menos de 300 KB por modelo y menos de 2 MB por escena) a `curso/media/3d/`. Agregar `GLTFLoader` (y el decodificador si se usa compresión) al bundle `three-s360.min.js` (ver cómo se armó en el commit: entrada esbuild con `window.S3 = {...}`) y cargar el GLB en `KIT.MODELS[...]` y `KIT.SCENES[...]`, manteniendo los nombres de parte (`userData.parte` = id del catálogo de partes del brief §7) y las `anchors` de cada objeto de escena.
- Para las escenas: luz horneada (lightmaps) o al menos AO; materiales con textura; personas estilizadas con chaleco o casco. Hay que mantener los IDs de objeto del catálogo (`pallet_pasillo`, `cable_piso`, etc.) y sus `anchors`, porque el contenido los usa.
- **Alternativa rápida:** mejorar las geometrías procedurales de `s-3d-kit.js`. Casco con un perfil de lathe correcto, visera curva continua, sin «cresta» de caja; respirador, fono y guante más realistas; fondo oscuro con piso reflectante suave.
- Probar con `--use-angle=swiftshader` y en un equipo real. Mantener la alternativa en lista.

### 5.2 Voces (Diego graba en Articulate/Storyline con ElevenLabs: Cristian Cornejo y Catalina)
- Diego dijo: «ElevenLabs no nos va a servir». Él genera todos los audios y yo preparo **tandas de máximo 3.000 caracteres**, con puntuación perfecta para que la IA lea bien, y después las corto.
- **Voces:**
  - `hablante: "narrador"` → **Cristian Cornejo** (voz principal del curso).
  - `"patricia"` (SST y EPP) y `"daniela"` (CIBER) → **Catalina**.
  - Armar las tandas **por voz**. No mezclar voces en una tanda.
- **IDs de audio** (los que lee el reproductor en `media/audio/<ID>.mp3`):
  - pantalla: su `id`;
  - intro: `SEG360-XXX-Mnn-INTRO`; cierre: `…-CIERRE`;
  - orientación: `SEG360-ORI-Pnn`;
  - casos: `<CASO>-PRES`, `<CASO>-<nodo>`, `<CASO>-<final>`, `<CASO>-DEBRIEF`;
  - videos: `<VID>-S01`…`S08`, una pista por escena.
- **Herramienta a escribir:** `desarrollo/herramientas/bloques_voz.py`. Que haga lo siguiente:
  - recorrer módulos, casos, videos y orientación en orden;
  - aplicar la adaptación oral, sin tocar el texto visible: horas «16:45» → «dieciséis cuarenta y cinco»; siglas: EPP → «e pe pe», SST → «ese ese te», MFA → «eme efe a», QR → «cu erre», VPN → «ve pe ene», PDF → «pe de efe», USB → «u ese be», DIAT → «diat», CPHS → «comité paritario», Wi-Fi → «wifi»; dB(A) → «decibeles»; leyes en palabras; sin paréntesis ni símbolos; «link» y «phishing» quedan como se escriben;
  - armar `.txt` de ≤ 3.000 caracteres sin partir una pantalla, con un índice CSV (orden, ID y texto);
  - dejar una línea en blanco y una pausa clara (punto y aparte) entre pantallas.
- Reutilizar la adaptación de `herramientas/tts_lote.py` (`adaptar`) y el cortador `herramientas/cortar_grupos.py` del Curso 5 (Whisper local, corte en silencios, −16 LUFS, MP3 mono 24–32 kbps, VTT por pista, QA de similitud). Registrar en `curso/media/audio/registro_audio.json` → `{"pistas": {"<ID>": {"file": "<ID>.mp3", "dur": 12.3}}}`. El build lo lee solo.
- Calcular cuántas tandas son (≈ 613 pantallas + casos + videos: del orden de 70–90 tandas) y entregarle a Diego un ZIP con las tandas numeradas por voz.

### 5.3 Música y efectos
- **Efectos:** se piden por nombre con `media.sfx(nombre)` y se esperan en `curso/media/sfx/<nombre>.mp3`. Nombres: `bien, mal, parcial, tic, girar, soltar, pasar, abrir, hotspot, encontrado, pista, mensaje, notificacion, decision, consecuencia, logro, inicio, enviar, guardar, separar`. Se pueden sintetizar con numpy (FM, ruido filtrado, envolventes cortas, menos de 15 KB cada uno) o con la herramienta que Diego prefiera.
- **Música:** `curso/media/music/musica.json` = `[{"file": "…mp3", "uso": "apertura|exploracion|transicion|caso|evaluacion|cierre"}]`, en loops de 60–90 s a 96 kbps. Está apagada por defecto y el botón aparece solo.

### 5.4 Descargables (10 recursos REC01–REC10, ver `programa/Programa_y_objetivos.json`)
- Hacer DOCX y PDF con instrucciones, un ejemplo resuelto didáctico y espacio para trabajar, en `curso/descargas/`.
- Hacer `participante/recursos.json` → `{"SEG360-REC01": {"titulo", "descripcion", "archivo", "formato", "icono"}}`.
- Los ejemplos de la evaluación final NO van aquí.

### 5.5 Documentos del prompt (§15)
Que un mismo contenido alimente Word, JSON y el curso: generar todo desde `autoria/fuente` y `docente_privado/fuente`.
- **Programa:** `programa/Programa_completo.docx`.
- **Autoría:**
  - `autoria/Curso_completo.docx` y `Contenido_completo.json` (el consolidado de módulos);
  - `Storyboard.json`;
  - `Matriz_alineamiento.csv`: resultado → explicación → demostración → práctica → evaluación → evidencia → criterio → fuente → ruta;
  - `Matriz_tiempos.csv`, a partir de `minutos_desglose` de cada módulo;
  - `Guiones_locucion.csv`, `Guiones_microvideos.json` y `seg360.course.manifest.json`.
- **Diseño:** `diseno/Guia_visual.md` y `Tokens.css` (copiar `app/css/s-tokens.css`), y `Manifiesto_medios.json`.
- **Docente privado:**
  - `Bancos_por_ruta.json`, `Rubricas_y_anclas.json` y `Guia_correccion.docx`;
  - en `docente_privado/`, cifrar el respaldo.
- **Otros:**
  - `sence/Expediente_preparacion.md` (R.E. 632 de 2026: no hay autoaprendizaje nuevo; no prometer código SENCE);
  - `qa/Plan_y_resultados.md` y `qa/Evidencias/`;
  - `integracion/Handoff_al_agente_LMS.md` (ver §5.7);
  - `LEEME.md`, `ESTADO_ENTREGA.md` y `SIGUIENTE_PASO.md`.

### 5.6 Paquetes SCORM (`exportaciones/`)
- Adaptar `herramientas/empaquetar_scorm.py` del Curso 5. Hacer un SCO por paquete, en SCORM 2004 4.ª edición (recomendado) y en 1.2.
- **Paquetes por ruta** (para los 3 certificados): `SEG360-R1-SST`, `R2-CIBER` y `R3-EPP`, cada uno con `config.js` con `rutas: ["SST"]`, etc. Además, un paquete completo con las 3 rutas (reporta un objetivo por ruta; aprueba solo si todas aprueban).
- **Excluir** `app/js/`, `app/css/` (las fuentes), `media/**/originales` y todo lo privado. Incluir `data/eval-<RUTA>.js` (banco portátil ofuscado) solo en el perfil `portable`.
- `herramientas_vista_previa: false`.
- El peso objetivo es de menos de 30 MB por paquete.

### 5.7 Contrato con el agente del LMS (trabaja en local; escribir `integracion/Handoff_al_agente_LMS.md`)
**Tarea aplicada** (igual que el proyecto del Curso 5, ver `docs/INTEGRACION_PROYECTO_LMS.md`):
- `cmi.comments_from_learner`, con location `SEG360-TAREA|<RUTA>|<entrega_id>|i/n` y saltos de línea « ¶ »;
- `cmi.interactions`, con `<entrega_id>-<producto>`;
- postMessage `dibork:seg360:tarea-entregada` (ruta, entrega_id, variante, respuestas, texto).

**Calificación de vuelta:** por `cmi.comments_from_lms` (location `SEG360-TAREA`) o por postMessage `dibork:seg360:tarea-evaluada`, con `{evaluacion: {ruta, entrega_id, estado: "evaluado"|"devuelto", niveles: {C1..C4: 0–3}, critico, comentario, profesor, fecha}}`.

**Situaciones:** el postMessage `dibork:seg360:situaciones-entregadas` es un aviso.

**Perfil `dibork_verified`:**
- el curso envía `dibork:seg360:solicitar-situaciones` (ruta, forma) y espera `dibork:seg360:situaciones` con `{items}` sin clave;
- el curso envía `dibork:seg360:entregar-situaciones` (respuestas) y espera `dibork:seg360:resultado-situaciones` con `{nota, detalle, por_objetivo}`;
- el banco de producción (`docente_privado`) lo carga solo el campus.

**SCORM:**
- objetivos por ruta `SEG360-R1-SST`/`R2-CIBER`/`R3-EPP` y por módulo;
- `success_status` solo en `passed` con la tarea calificada por un docente;
- el certificado lo emite el campus, nunca el curso.

### 5.8 QA obligatorio (del prompt)
- Casos con cada desenlace.
- Ítems sin clave duplicada ni ausente.
- Rúbricas y pesos.
- Frontera 79/80.
- Criterio crítico fallido con nota alta.
- Entrega vacía.
- Revisión pendiente.
- Reintento válido.
- Sin audio.
- Teclado.
- Imagen ausente.
- Progreso recuperado tras cerrar.
- Varias rutas sin contaminación.
- Examen fuera del bundle público.
- Ningún certificado desde la vista previa.
- Medir carga (primera carga, cambio de módulo, 3D) en escritorio y móvil.

Usar Playwright y un LMS simulado (scorm-again), como en `herramientas/qa/` del Curso 5.

## 6. Si falta la revisión editorial de EPP
Lanzar un agente con el mismo encargo que tuvieron SST y CIBER. En resumen:
- alinear los laboratorios con los casos (M04-LAB con CASO-EPP-1: guantes A de nitrilo y B de cuero anticorte; M06-LAB con CASO-EPP-2: sábado en la mañana, desengrasante y barba de Héctor);
- alinear EVAL-EPP con lo enseñado;
- revisar la normativa (85 dB(A), Ley 20.096, sin vidas útiles universales) y registrar en `fuentes/revision_EPP.md`;
- revisar el lenguaje y que las voces se lean bien;
- mantener IDs y conteos.

## 7. Reglas que siguen vigentes
- No publicar, no gastar créditos sin que Diego lo pida, no clonar voces, no tocar el Curso 5, el LMS ni la infraestructura.
- Nada interno en pantalla. El build lo revisa con `PROHIBIDAS` en `build.py`.
- Todo dato de práctica: dominios `.example`/`.invalid`, Pehuén Distribución ficticia, «Ficha de práctica» en los EPP.
- La revisión experta de seguridad, prevención y normativa debe hacerla una persona real (ver `fuentes/revision_*.md`). No simularla.
- Los commits terminan con las líneas de coautoría de la sesión.
