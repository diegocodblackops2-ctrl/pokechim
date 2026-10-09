/* Seguridad 360 · aplicación: carga de datos, rutas (#/…), vistas de portada, ruta y módulo, marco de pantalla,
   índice, ajustes y progreso. Los tipos de pantalla viven en s-pantallas.js, s-actividades.js, s-3d.js, s-escritorio.js,
   s-caso.js, s-video.js y s-eval.js. */
(function () {
  "use strict";
  var S = window.S360, u = S.u, h = u.h, store = S.store, media = S.media;
  var CFG = window.S360_CONFIG || {};
  var DATA = window.S360_DATA = window.S360_DATA || {};
  var MEDIA = window.S360_MEDIA || { images: {}, audio: {} };
  var BASE = CFG.base || "";
  var C = DATA.curso;

  S.tipos = S.tipos || {};
  S.etiquetas = {
    apertura: "Escena", explicacion: "Idea clave", tarjetas: "Explora", pestanas: "Explora", proceso: "Paso a paso",
    comparacion: "Compara", mito_realidad: "¿Mito o realidad?", decision: "Decide", quiz: "Comprueba", clasificar: "Clasifica",
    ordenar: "Ordena", matriz: "Evalúa", dialogo: "Conversación", chat: "Mensajes", bandeja: "Bandeja de entrada",
    permisos: "Permisos", ficha: "Lee la ficha", inspeccion: "Inspecciona", construir: "Produce", reflexion: "Reflexiona",
    checklist: "Tu plan", escena3d: "Recorre en 3D", modelo3d: "Observa en 3D", escritorio: "Simulación", video: "Mira",
    caso: "Caso", cierre_leccion: "Para llevar", intro: "Módulo", cierre: "Cierre del módulo", ori: "Orientación"
  };
  /* Tipos que cuentan como completos solo cuando la persona responde o termina la actividad. */
  S.requiereRespuesta = { decision: 1, quiz: 1, clasificar: 1, ordenar: 1, matriz: 1, mito_realidad: 1, bandeja: 1, permisos: 1,
    ficha: 1, inspeccion: 1, construir: 1, escritorio: 1, caso: 1, reflexion: 1, checklist: 1 };
  function requiere(scr) {
    if (S.requiereRespuesta[scr.tipo]) return true;
    if (scr.tipo === "escena3d" && scr.modo === "detectar") return true;
    if ((scr.tipo === "chat" || scr.tipo === "dialogo" || scr.tipo === "modelo3d") && scr.opciones && scr.opciones.length) return true;
    return false;
  }
  S.requiere = requiere;

  /* ---------- Datos ---------- */
  var mods = {};
  function rutaDe(id) { var m = String(id).match(/^SEG360-(SST|CIBER|EPP)/); return m ? m[1] : null; }
  function modId(id) { var m = String(id).match(/^(SEG360-(?:SST|CIBER|EPP)-M\d\d)/); return m ? m[1] : null; }
  function modMeta(mid) { var r = C.rutas.filter(function (x) { return x.codigo === rutaDe(mid); })[0]; return r && r.modulos.filter(function (m) { return m.id === mid; })[0]; }
  function rutaMeta(cod) { return C.rutas.filter(function (r) { return r.codigo === cod; })[0]; }
  function incluida(cod) { return !CFG.rutas || CFG.rutas.indexOf(cod) >= 0; }
  function loadMod(mid) {
    if (mods[mid]) return Promise.resolve(mods[mid]);
    var meta = modMeta(mid);
    return u.loadScript(BASE + "data/" + meta.archivo).then(function () { mods[mid] = DATA[mid]; return mods[mid]; });
  }
  S.loadMod = loadMod; S.rutaDe = rutaDe; S.modId = modId; S.modMeta = modMeta; S.rutaMeta = rutaMeta;

  /* ---------- Imágenes y personajes ---------- */
  function img(id, opts) {
    opts = opts || {};
    var info = id && MEDIA.images && MEDIA.images[id];
    if (!info) return opts.fallback === false ? null : ilus(opts.icono || "scan-eye", opts.clase);
    var fig = h("figure", { class: "foto" + (opts.clase ? " " + opts.clase : "") });
    var im = h("img", { src: BASE + "media/images/" + info.file, alt: opts.decorativa ? "" : (info.alt || ""), loading: opts.eager ? "eager" : "lazy", decoding: "async", width: info.w || null, height: info.h || null });
    if (info.sm) { im.setAttribute("srcset", BASE + "media/images/" + info.sm + " 800w, " + BASE + "media/images/" + info.file + " " + (info.w || 1600) + "w"); im.setAttribute("sizes", opts.sizes || "(max-width: 760px) 100vw, 60vw"); }
    fig.appendChild(im);
    if (!opts.sinMarco) fig.appendChild(h("span", { class: "visor", "aria-hidden": "true" }, h("i"), h("i"), h("i"), h("i")));
    if (opts.pie) fig.appendChild(h("figcaption", null, opts.pie));
    return fig;
  }
  /* Ilustración animada con un ícono y las ondas de «señal» (cuando no hay foto o como recurso visual). */
  function ilus(icono, clase) {
    var w = h("div", { class: "ilus" + (clase ? " " + clase : ""), "aria-hidden": "true" },
      h("span", { class: "onda o1" }), h("span", { class: "onda o2" }), h("span", { class: "onda o3" }),
      h("span", { class: "nucleo" }, u.icon(icono)));
    return w;
  }
  function avatar(pid, size) {
    var p = (C.personajes || {})[pid];
    if (!p) return h("span", { class: "avatar" }, "?");
    var info = MEDIA.images && MEDIA.images[p.imagen];
    var a = h("span", { class: "avatar" + (size ? " " + size : ""), title: p.nombre + " · " + p.rol, style: { "--av": p.color || "#087E8B" } });
    if (info) a.appendChild(h("img", { src: BASE + "media/images/" + (info.sm || info.file), alt: "", loading: "lazy" }));
    else a.appendChild(h("b", null, p.nombre.split(" ").map(function (x) { return x.charAt(0); }).slice(0, 2).join("")));
    return a;
  }
  S.img = img; S.ilus = ilus; S.avatar = avatar;

  /* ---------- Progreso ---------- */
  function screenDone(scr, st) {
    st = st || store.peek(rutaDe(scr.id)) || {};
    if (!store.seen(scr.id, st)) return false;
    if (!requiere(scr)) return true;
    var r = (st.r || {})[scr.id];
    if (scr.tipo === "caso") { var c = (st.c || {})[scr.caso_id]; return !!(c && c.fin); }
    return !!(r && r.done);
  }
  /* Progreso de un módulo a partir del resumen del curso (no hace falta cargar el módulo). */
  function modProgress(mid) {
    var meta = modMeta(mid), st = store.peek(rutaDe(mid)) || {};
    var total = 0, ok = 0;
    (meta.pantallas || []).forEach(function (p) {
      total++;
      if (!store.seen(p.id, st)) return;
      if (!p.req) { ok++; return; }
      if (p.tipo === "caso") { var c = (st.c || {})[p.caso]; if (c && c.fin) ok++; return; }
      var r = (st.r || {})[p.id]; if (r && r.done) ok++;
    });
    return { total: total, ok: ok, pct: total ? ok / total : 0, done: total > 0 && ok === total };
  }
  function unitProgress(mid, uid) {
    var meta = modMeta(mid), st = store.peek(rutaDe(mid)) || {}, t = 0, ok = 0;
    (meta.pantallas || []).forEach(function (p) {
      if (p.u !== uid) return; t++;
      if (!store.seen(p.id, st)) return;
      if (!p.req) { ok++; return; }
      if (p.tipo === "caso") { var c = (st.c || {})[p.caso]; if (c && c.fin) ok++; return; }
      var r = (st.r || {})[p.id]; if (r && r.done) ok++;
    });
    return { total: t, ok: ok, pct: t ? ok / t : 0, done: t > 0 && ok === t };
  }
  function rutaProgress(cod) {
    var r = rutaMeta(cod), t = 0, ok = 0, mdone = 0;
    r.modulos.forEach(function (m) { var p = modProgress(m.id); t += p.total; ok += p.ok; if (p.done) mdone++; });
    return { pct: t ? ok / t : 0, modulos: mdone, total: r.modulos.length, done: mdone === r.modulos.length };
  }
  S.screenDone = screenDone; S.modProgress = modProgress; S.unitProgress = unitProgress; S.rutaProgress = rutaProgress;

  /* Informa avance al LMS: objetivos por ruta y por módulo; la nota y el estado de aprobación los fija s-eval.js. */
  var reportProgress = u.debounce(function () {
    var rutas = C.rutas.filter(function (r) { return incluida(r.codigo); });
    var total = 0, sum = 0;
    rutas.forEach(function (r) {
      var p = rutaProgress(r.codigo);
      r.modulos.forEach(function (m) { var mp = modProgress(m.id); store.section(m.id, mp.done, mp.pct, { description: m.titulo }); });
      total++; sum += p.pct;
    });
    if (S.eval && S.eval.report) S.eval.report(); else store.setCompletion({ progress: total ? sum / total * 0.8 : 0, completed: false });
  }, 1500);
  S.reportProgress = reportProgress;

  /* ---------- Marco general ---------- */
  var main, crumbs, saveEl, progEl, pie, drawer, ajustes, transcript, cleanup = [];
  function onLeave(fn) { cleanup.push(fn); }
  S.onLeave = onLeave;
  function leave() {
    media.stopVoice();
    cleanup.splice(0).forEach(function (fn) { try { fn(); } catch (e) { /* sin acción */ } });
  }
  function shell() {
    document.body.appendChild(h("a", { class: "saltar", href: "#main" }, "Saltar al contenido"));
    var top = h("header", { class: "top" },
      h("a", { class: "marca", href: "#/", "aria-label": "Seguridad 360 · inicio" }, marca(), h("span", { class: "marca-txt" }, h("b", null, "Seguridad"), " 360")),
      crumbs = h("nav", { class: "migas", "aria-label": "Ubicación" }),
      h("div", { class: "top-acc" },
        saveEl = h("span", { class: "guardado", role: "status", "aria-live": "polite" }),
        progEl = h("span", { class: "top-prog", "aria-hidden": "true" }),
        btnTop("align-left", "Texto de la narración", function () { toggleTranscript(); }, "b-transc"),
        btnTop("sliders-horizontal", "Ajustes de sonido y lectura", function () { toggleAjustes(); }, "b-ajustes"),
        btnTop("menu", "Índice del curso", function () { toggleDrawer(); }, "b-indice")));
    document.body.appendChild(top);
    main = h("main", { id: "main", tabindex: "-1" });
    document.body.appendChild(main);
    pie = h("nav", { class: "pie", "aria-label": "Navegación entre pantallas" });
    document.body.appendChild(pie);
    drawer = h("aside", { class: "cajon", id: "indice", "aria-label": "Índice del curso", hidden: true });
    document.body.appendChild(drawer);
    ajustes = h("div", { class: "panel-ajustes", id: "ajustes", role: "dialog", "aria-label": "Ajustes", hidden: true });
    document.body.appendChild(ajustes);
    transcript = h("aside", { class: "panel-transc", id: "transc", "aria-label": "Texto de la narración", hidden: true });
    document.body.appendChild(transcript);
    document.body.appendChild(h("div", { id: "live-polite", class: "sr", "aria-live": "polite" }));
    document.body.appendChild(h("div", { id: "live-assert", class: "sr", "aria-live": "assertive" }));
    document.body.appendChild(h("div", { class: "velo", hidden: true, onclick: function () { closePanels(); } }));
    store.on(function (s, msg) { saveEl.textContent = msg; saveEl.className = "guardado g-" + s; });
    saveEl.textContent = store.statusMsg; saveEl.className = "guardado g-" + store.status;
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") closePanels();
      if (ev.target && /input|textarea|select/i.test(ev.target.tagName)) return;
      if (ev.altKey && ev.key === "ArrowRight") { var n = u.$(".pie .sig"); if (n) n.click(); }
      if (ev.altKey && ev.key === "ArrowLeft") { var p = u.$(".pie .ant"); if (p) p.click(); }
    });
    document.addEventListener("pointerdown", function () { media.unlock(); }, { once: true });
    applyPrefs();
  }
  function marca() {
    return h("span", { class: "marca-sig", "aria-hidden": "true" }, h("i", { class: "m1" }), h("i", { class: "m2" }), h("i", { class: "m3" }), h("b"));
  }
  S.marca = marca;
  function btnTop(ic, label, fn, cls) { return h("button", { class: "btn-top " + (cls || ""), type: "button", "aria-label": label, title: label, onclick: fn }, u.icon(ic)); }
  function closePanels() {
    drawer.hidden = true; ajustes.hidden = true; transcript.hidden = true;
    u.$(".velo").hidden = true; document.body.classList.remove("con-panel");
  }
  function openPanel(el) { closePanels(); el.hidden = false; u.$(".velo").hidden = false; document.body.classList.add("con-panel"); var f = el.querySelector("button, a, input"); if (f) f.focus(); }
  function toggleDrawer() { if (!drawer.hidden) return closePanels(); renderDrawer(); openPanel(drawer); }
  function toggleAjustes() { if (!ajustes.hidden) return closePanels(); renderAjustes(); openPanel(ajustes); }
  function toggleTranscript() { if (!transcript.hidden) return closePanels(); openPanel(transcript); }

  function setTranscript(scr) {
    u.clear(transcript);
    transcript.appendChild(h("div", { class: "panel-cab" }, h("h2", null, "Texto de la narración"), h("button", { class: "x", type: "button", "aria-label": "Cerrar", onclick: closePanels }, u.icon("x"))));
    var t = scr && (scr.voz || (scr.presentacion && scr.presentacion.voz));
    if (!t) { transcript.appendChild(h("p", { class: "nota-suave" }, "Esta pantalla no tiene narración.")); return; }
    var who = scr.hablante && scr.hablante !== "narrador" && (C.personajes || {})[scr.hablante];
    transcript.appendChild(h("p", { class: "transc-quien" }, who ? who.nombre + " · " + who.rol : "Narración"));
    transcript.appendChild(u.prose(t, "prose transc"));
  }
  S.setTranscript = setTranscript;

  function renderAjustes() {
    u.clear(ajustes);
    var p = media.prefs;
    ajustes.appendChild(h("div", { class: "panel-cab" }, h("h2", null, "Ajustes"), h("button", { class: "x", type: "button", "aria-label": "Cerrar", onclick: closePanels }, u.icon("x"))));
    function sw(label, desc, on, fn) {
      var id = u.newId("sw");
      var inp = h("input", { type: "checkbox", id: id, role: "switch" }); inp.checked = !!on;
      inp.addEventListener("change", function () { fn(inp.checked); });
      return h("div", { class: "ajuste" }, h("label", { for: id }, h("b", null, label), desc ? h("span", null, desc) : null), inp);
    }
    ajustes.appendChild(sw("Efectos de sonido", "Sonidos breves al responder y explorar.", p.sfx, function (v) { media.setSfx(v); }));
    if (media.hasMusic()) ajustes.appendChild(sw("Música de fondo", "Baja sola cuando habla la narración.", p.music, function (v) { media.toggleMusic(v); }));
    ajustes.appendChild(sw("Subtítulos de la narración", null, p.subs, function (v) { media.setSubs(v); }));
    ajustes.appendChild(sw("Reproducir la narración al entrar a cada pantalla", "Solo después de que la actives aquí.", p.autoplay, function (v) { media.setAutoplay(v); }));
    ajustes.appendChild(sw("Reducir movimiento", "Detiene animaciones y transiciones.", !!u.pref("sinMov"), function (v) { u.pref("sinMov", v); applyPrefs(); }));
    ajustes.appendChild(sw("Alto contraste", null, !!u.pref("contraste"), function (v) { u.pref("contraste", v); applyPrefs(); }));
    var sizes = [["Normal", 1], ["Grande", 1.12], ["Muy grande", 1.25]], cur = u.pref("escala") || 1;
    var g = h("div", { class: "ajuste ajuste-col", role: "radiogroup", "aria-label": "Tamaño del texto" }, h("b", null, "Tamaño del texto"));
    var row = h("div", { class: "seg" });
    sizes.forEach(function (s) {
      row.appendChild(h("button", { type: "button", role: "radio", "aria-checked": String(cur === s[1]), class: cur === s[1] ? "on" : "", onclick: function () { u.pref("escala", s[1]); applyPrefs(); renderAjustes(); } }, s[0]));
    });
    g.appendChild(row); ajustes.appendChild(g);
    ajustes.appendChild(h("p", { class: "nota-suave" }, "Atajos: Alt + → siguiente pantalla · Alt + ← anterior · Esc cierra paneles."));
  }
  function applyPrefs() {
    var root = document.documentElement;
    root.classList.toggle("sin-movimiento", !!u.pref("sinMov"));
    root.classList.toggle("alto-contraste", !!u.pref("contraste"));
    root.style.setProperty("--escala", u.pref("escala") || 1);
  }

  function renderDrawer() {
    u.clear(drawer);
    drawer.appendChild(h("div", { class: "panel-cab" }, h("h2", null, "Índice"), h("button", { class: "x", type: "button", "aria-label": "Cerrar", onclick: closePanels }, u.icon("x"))));
    var nav = h("nav", { class: "arbol" });
    nav.appendChild(h("a", { href: "#/", onclick: closePanels, class: "arb-inicio" }, u.icon("home"), "Inicio"));
    nav.appendChild(h("a", { href: "#/orientacion", onclick: closePanels, class: "arb-inicio" }, u.icon("compass"), "Orientación"));
    C.rutas.forEach(function (r) {
      if (!incluida(r.codigo)) return;
      var d = h("details", { class: "arb-ruta", style: { "--ruta": r.color }, open: S.rutaActual === r.codigo });
      var rp = rutaProgress(r.codigo);
      d.appendChild(h("summary", null, h("span", { class: "chip-ruta" }, r.codigo), h("span", null, r.titulo), h("span", { class: "pct" }, Math.round(rp.pct * 100) + " %")));
      var ul = h("ol");
      r.modulos.forEach(function (m) {
        var mp = modProgress(m.id);
        ul.appendChild(h("li", null, h("a", { href: "#/m/" + m.id, onclick: closePanels, class: mp.done ? "hecho" : "" },
          h("span", { class: "num" }, String(m.numero).padStart(2, "0")), h("span", null, m.titulo), mp.done ? u.icon("check", "Completo") : h("span", { class: "pct" }, Math.round(mp.pct * 100) + " %"))));
      });
      ul.appendChild(h("li", null, h("a", { href: "#/eval/" + r.codigo, onclick: closePanels }, h("span", { class: "num" }, u.icon("badge-check")), h("span", null, "Evaluación y certificado"))));
      d.appendChild(ul);
      nav.appendChild(d);
    });
    nav.appendChild(h("a", { href: "#/recursos", onclick: closePanels, class: "arb-inicio" }, u.icon("folder-down"), "Recursos descargables"));
    nav.appendChild(h("a", { href: "#/glosario", onclick: closePanels, class: "arb-inicio" }, u.icon("book-open"), "Glosario"));
    drawer.appendChild(nav);
    drawer.appendChild(h("p", { class: "nota-suave tiempo-total" }, u.icon("clock"), " Tiempo de trabajo registrado: ", u.fmtHoras(store.totalTime())));
  }

  function setCrumbs(items) {
    u.clear(crumbs);
    items.forEach(function (it, i) {
      if (i) crumbs.appendChild(h("span", { class: "sep", "aria-hidden": "true" }, "/"));
      crumbs.appendChild(it.href ? h("a", { href: it.href }, it.t) : h("span", { "aria-current": "page" }, it.t));
    });
  }
  function setRuta(cod) {
    S.rutaActual = cod || null;
    document.body.setAttribute("data-ruta", cod || "");
    if (cod) store.load(cod);
    var r = cod && rutaMeta(cod);
    if (r) document.documentElement.style.setProperty("--ruta", r.color); else document.documentElement.style.removeProperty("--ruta");
    var p = cod ? rutaProgress(cod) : null;
    progEl.textContent = p ? Math.round(p.pct * 100) + " %" : "";
  }
  function setPie(prev, next, extra) {
    u.clear(pie);
    pie.hidden = !prev && !next && !extra;
    pie.appendChild(prev ? h("a", { class: "ant", href: prev.href, onclick: function () { media.sfx("pasar"); } }, u.icon("arrow-left"), h("span", null, prev.t || "Anterior")) : h("span"));
    pie.appendChild(extra || h("span"));
    pie.appendChild(next ? h("a", { class: "sig" + (next.fuerte ? " fuerte" : ""), href: next.href, onclick: function () { media.sfx("pasar"); } }, h("span", null, next.t || "Siguiente"), u.icon("arrow-right")) : h("span"));
  }
  S.setPie = setPie;

  /* ---------- Portada ---------- */
  function vPortada() {
    setRuta(null); setCrumbs([{ t: "Inicio" }]); setPie(null, null);
    media.setMusicContext("apertura");
    var v = h("div", { class: "vista portada" });
    var hero = h("section", { class: "hero-portada" },
      h("div", { class: "hero-txt" },
        h("p", { class: "kicker" }, h("span", { class: "baliza" }), C.institucion),
        h("h1", null, h("span", { class: "h1-a" }, "Seguridad"), h("span", { class: "h1-b" }, "360")),
        h("p", { class: "bajada" }, C.subtitulo),
        h("div", { class: "hero-acc" },
          continuarBtn(),
          h("a", { class: "btn btn-sec", href: "#/orientacion" }, u.icon("compass"), "Cómo funciona el curso")),
        h("ul", { class: "hero-datos" },
          h("li", null, h("b", null, String(C.rutas.filter(function (r) { return incluida(r.codigo); }).length)), h("span", null, "rutas con certificado")),
          h("li", null, h("b", null, String(C.totales.modulos)), h("span", null, "módulos")),
          h("li", null, h("b", null, "≈" + C.totales.horas + " h"), h("span", null, "de trabajo práctico")))),
      h("div", { class: "hero-vis" }, img(C.portada, { clase: "hero-foto", eager: true, sizes: "(max-width: 760px) 100vw, 50vw" }), radar()));
    v.appendChild(hero);
    var grid = h("section", { class: "rutas", "aria-label": "Rutas del curso" });
    C.rutas.forEach(function (r, i) {
      if (!incluida(r.codigo)) return;
      var p = rutaProgress(r.codigo), ev = S.eval ? S.eval.estadoRuta(r.codigo) : null;
      grid.appendChild(h("a", { class: "ruta-card", href: "#/ruta/" + r.codigo, style: { "--ruta": r.color, "--i": i } },
        h("div", { class: "rc-foto" }, img(r.imagen, { sinMarco: true, decorativa: true, sizes: "(max-width: 760px) 100vw, 33vw" })),
        h("div", { class: "rc-cuerpo" },
          h("p", { class: "kicker" }, "Ruta " + (i + 1) + " · ", r.codigo),
          h("h2", null, r.titulo),
          h("p", null, r.bajada),
          h("div", { class: "rc-pie" }, anillo(p.pct, r.color), h("span", null, p.modulos + " de " + p.total + " módulos"),
            ev && ev.aprobada ? h("span", { class: "sello ok" }, u.icon("badge-check"), "Aprobada") : null))));
    });
    v.appendChild(grid);
    v.appendChild(h("section", { class: "franja-como" },
      h("div", { class: "como-item" }, u.icon("rotate-3d"), h("b", null, "Recorre y observa"), h("span", null, "Ambientes y equipos en 3D que puedes girar y explorar.")),
      h("div", { class: "como-item" }, u.icon("git-branch"), h("b", null, "Decide"), h("span", null, "Casos con consecuencias reales y feedback que explica el porqué.")),
      h("div", { class: "como-item" }, u.icon("monitor"), h("b", null, "Simula"), h("span", null, "Un computador de trabajo para practicar sin riesgo.")),
      h("div", { class: "como-item" }, u.icon("award"), h("b", null, "Demuestra"), h("span", null, "Una evaluación por ruta y un certificado por cada una."))));
    return v;
  }
  function radar() {
    var r = h("div", { class: "radar", "aria-hidden": "true" }, h("span", { class: "barrido" }), h("span", { class: "aro a1" }), h("span", { class: "aro a2" }), h("span", { class: "aro a3" }));
    [["hard-hat", "SST", 18, 30], ["shield-check", "CIBER", 70, 22], ["glasses", "EPP", 58, 74], ["triangle-alert", "", 26, 70], ["mail-warning", "", 84, 58], ["plug-zap", "", 40, 12]].forEach(function (x, i) {
      r.appendChild(h("span", { class: "blip b" + i, style: { left: x[2] + "%", top: x[3] + "%" } }, u.icon(x[0])));
    });
    return r;
  }
  function anillo(p, color) {
    var c = 2 * Math.PI * 16, off = c * (1 - p);
    var svg = '<svg viewBox="0 0 40 40" class="anillo" aria-hidden="true"><circle cx="20" cy="20" r="16" class="an-f"/><circle cx="20" cy="20" r="16" class="an-v" style="stroke:' + color + ';stroke-dasharray:' + c.toFixed(1) + ';stroke-dashoffset:' + off.toFixed(1) + '"/></svg>';
    return h("span", { class: "anillo-w", html: svg + '<span class="an-t">' + Math.round(p * 100) + "%</span>" });
  }
  S.anillo = anillo;
  function continuarBtn() {
    var loc = store.location();
    if (loc && /^#\/(p|m|caso|eval|ruta)\//.test(loc)) return h("a", { class: "btn btn-pri", href: loc }, u.icon("play"), "Continuar donde quedaste");
    var first = C.rutas.filter(function (r) { return incluida(r.codigo); })[0];
    return h("a", { class: "btn btn-pri", href: CFG.rutas && CFG.rutas.length === 1 ? "#/ruta/" + first.codigo : "#/orientacion" }, u.icon("play"), "Empezar");
  }

  /* ---------- Orientación ---------- */
  function vOrientacion(idx) {
    setRuta(null); store.load("ori");
    var pantallas = C.orientacion || [];
    idx = Math.max(0, Math.min(pantallas.length - 1, idx || 0));
    var scr = pantallas[idx];
    setCrumbs([{ t: "Inicio", href: "#/" }, { t: "Orientación" }]);
    store.visit("ORI-" + idx);
    var v = marco(scr, { kicker: "Orientación · " + (idx + 1) + " de " + pantallas.length });
    setPie(idx > 0 ? { href: "#/orientacion/" + (idx - 1) } : { href: "#/", t: "Inicio" },
      idx < pantallas.length - 1 ? { href: "#/orientacion/" + (idx + 1) } : { href: CFG.rutas && CFG.rutas.length === 1 ? "#/ruta/" + CFG.rutas[0] : "#/", t: "Elegir mi ruta", fuerte: true },
      dots(pantallas.length, idx));
    return v;
  }
  function dots(n, i) {
    var d = h("div", { class: "puntos", "aria-label": "Pantalla " + (i + 1) + " de " + n });
    var max = Math.min(n, 14);
    for (var k = 0; k < max; k++) { var real = n <= 14 ? k : Math.round(k * (n - 1) / (max - 1)); d.appendChild(h("i", { class: real === i ? "on" : real < i ? "ya" : "" })); }
    d.appendChild(h("span", { class: "puntos-t" }, (i + 1) + " / " + n));
    return d;
  }

  /* ---------- Ruta ---------- */
  function vRuta(cod) {
    var r = rutaMeta(cod);
    if (!r || !incluida(cod)) return vPortada();
    setRuta(cod); setCrumbs([{ t: "Inicio", href: "#/" }, { t: r.titulo }]);
    media.setMusicContext("transicion");
    var p = rutaProgress(cod);
    var v = h("div", { class: "vista ruta", style: { "--ruta": r.color } });
    v.appendChild(h("section", { class: "hero-ruta" },
      h("div", { class: "hr-foto" }, img(r.imagen, { sinMarco: true, eager: true, decorativa: true, sizes: "100vw" })),
      h("div", { class: "hr-txt" },
        h("p", { class: "kicker" }, h("span", { class: "baliza" }), "Ruta · ", r.codigo, " · certificado propio"),
        h("h1", null, r.titulo),
        h("p", { class: "bajada" }, r.resultado),
        h("div", { class: "hr-meta" }, anillo(p.pct, "#fff"), h("span", null, p.modulos + " de " + p.total + " módulos completos · ≈" + r.horas + " h")))));
    var lista = h("ol", { class: "lista-mod" });
    r.modulos.forEach(function (m, i) {
      var mp = modProgress(m.id);
      lista.appendChild(h("li", { style: { "--i": i } }, h("a", { href: "#/m/" + m.id, class: "mod-fila" + (mp.done ? " hecho" : mp.ok ? " en-curso" : "") },
        h("span", { class: "mf-num" }, String(m.numero).padStart(2, "0")),
        h("span", { class: "mf-txt" }, h("b", null, m.titulo), h("span", null, m.subtitulo)),
        h("span", { class: "mf-tags" }, (m.etiquetas || []).map(function (t) { return h("span", { class: "tag" }, u.icon(t.icono), t.texto); })),
        h("span", { class: "mf-dur" }, u.icon("clock"), "≈" + m.horas.toString().replace(".", ",") + " h"),
        h("span", { class: "mf-barra", "aria-label": Math.round(mp.pct * 100) + " % completo" }, h("i", { style: { width: Math.round(mp.pct * 100) + "%" } })))));
    });
    v.appendChild(h("section", { class: "bloque" }, h("h2", { class: "h-sec" }, "Módulos"), lista));
    if (S.eval) v.appendChild(S.eval.panelRuta(cod));
    setPie({ href: "#/", t: "Inicio" }, { href: "#/m/" + nextModule(cod), t: p.ok ? "Continuar" : "Empezar la ruta", fuerte: true });
    return v;
  }
  function nextModule(cod) {
    var r = rutaMeta(cod);
    for (var i = 0; i < r.modulos.length; i++) if (!modProgress(r.modulos[i].id).done) return r.modulos[i].id;
    return r.modulos[0].id;
  }

  /* ---------- Módulo ---------- */
  function vModulo(mid) {
    var meta = modMeta(mid);
    if (!meta) return vPortada();
    var cod = rutaDe(mid), r = rutaMeta(cod);
    setRuta(cod);
    setCrumbs([{ t: "Inicio", href: "#/" }, { t: r.codigo, href: "#/ruta/" + cod }, { t: "Módulo " + meta.numero }]);
    var v = h("div", { class: "vista modulo" });
    var mp = modProgress(mid);
    v.appendChild(h("section", { class: "hero-mod" },
      h("div", { class: "hm-txt" },
        h("p", { class: "kicker" }, h("span", { class: "baliza" }), "Ruta ", r.codigo, " · Módulo ", String(meta.numero).padStart(2, "0")),
        h("h1", null, meta.titulo), h("p", { class: "bajada" }, meta.subtitulo),
        h("div", { class: "logro" }, h("b", null, "Al terminar podrás"), h("p", null, meta.resultado_participante || meta.resultado))),
      h("div", { class: "hm-foto" }, img(meta.imagen, { sizes: "(max-width: 760px) 100vw, 40vw" }))));
    var pista = h("ol", { class: "pista" });
    meta.unidades.forEach(function (un, i) {
      var up = unitProgress(mid, un.id);
      pista.appendChild(h("li", { class: "pista-n" + (up.done ? " hecho" : up.ok ? " en-curso" : ""), style: { "--i": i } },
        h("a", { href: "#/p/" + un.primera },
          h("span", { class: "pn-ico" }, u.icon(up.done ? "check" : un.icono)),
          h("span", { class: "pn-txt" }, h("small", null, un.rotulo), h("b", null, un.titulo)),
          h("span", { class: "pn-min" }, un.minutos ? "≈" + un.minutos + " min" : ""),
          h("span", { class: "pn-barra" }, h("i", { style: { width: Math.round(up.pct * 100) + "%" } })))));
    });
    v.appendChild(h("section", { class: "bloque" }, h("h2", { class: "h-sec" }, "Recorrido del módulo"), pista));
    var extra = h("section", { class: "bloque mod-extra" });
    if (meta.recursos && meta.recursos.length) {
      extra.appendChild(h("div", { class: "me-col" }, h("h3", null, u.icon("folder-down"), "Descargables"), h("ul", { class: "lista-rec" }, meta.recursos.map(function (rid) {
        var rec = (C.recursos || {})[rid]; if (!rec) return null;
        return h("li", null, h("a", { href: BASE + "descargas/" + rec.archivo, download: "" }, u.icon("file-down"), rec.titulo));
      }))));
    }
    if (meta.fuentes && meta.fuentes.length) {
      extra.appendChild(h("div", { class: "me-col" }, h("h3", null, u.icon("library"), "Referencias del módulo"), h("ul", { class: "lista-fuentes" }, meta.fuentes.map(function (fid) {
        var f = (C.fuentes || {})[fid]; return f ? h("li", null, f.cita) : null;
      }))));
    }
    if (extra.childNodes.length) v.appendChild(extra);
    var first = meta.unidades[0].primera, cont = first;
    for (var i = 0; i < meta.pantallas.length; i++) { if (!S.screenDone(meta.pantallas[i])) { cont = meta.pantallas[i].id; break; } }
    var idx = r.modulos.indexOf(meta);
    setPie({ href: "#/ruta/" + cod, t: "Ruta " + cod }, { href: "#/p/" + cont, t: mp.ok ? (mp.done ? "Repasar" : "Continuar") : "Empezar el módulo", fuerte: true },
      idx < r.modulos.length - 1 ? h("a", { class: "pie-sec", href: "#/m/" + r.modulos[idx + 1].id }, "Módulo siguiente") : h("a", { class: "pie-sec", href: "#/eval/" + cod }, "Evaluación de la ruta"));
    media.setMusicContext("transicion");
    return v;
  }

  /* ---------- Pantalla ---------- */
  function findScreen(mod, sid) {
    var out = null;
    (mod._seq || []).forEach(function (s) { if (s.id === sid) out = s; });
    return out;
  }
  function vPantalla(sid) {
    var mid = modId(sid), meta = modMeta(mid);
    if (!meta) return Promise.resolve(vPortada());
    var cod = rutaDe(mid), r = rutaMeta(cod);
    setRuta(cod);
    return loadMod(mid).then(function (mod) {
      if (!mod._seq) prepMod(mod);
      var scr = findScreen(mod, sid);
      if (!scr) return vModulo(mid);
      var pos = mod._seq.indexOf(scr), un = scr._unidad;
      setCrumbs([{ t: "Inicio", href: "#/" }, { t: r.codigo, href: "#/ruta/" + cod }, { t: "Módulo " + meta.numero, href: "#/m/" + mid }, { t: un.rotulo }]);
      store.visit(sid);
      var v = marco(scr, { kicker: un.rotulo + " · " + (un.pantallas.indexOf(scr) + 1) + " de " + un.pantallas.length, mod: mod });
      var prev = pos > 0 ? { href: "#/p/" + mod._seq[pos - 1].id } : { href: "#/m/" + mid, t: "Módulo" };
      var next;
      if (pos < mod._seq.length - 1) {
        var nx = mod._seq[pos + 1];
        next = { href: "#/p/" + nx.id, t: nx._unidad !== un ? "Ir a: " + nx._unidad.rotulo : "Siguiente", fuerte: nx._unidad !== un };
      } else {
        var idx = r.modulos.indexOf(meta);
        next = idx < r.modulos.length - 1 ? { href: "#/m/" + r.modulos[idx + 1].id, t: "Módulo siguiente", fuerte: true } : { href: "#/eval/" + cod, t: "Evaluación de la ruta", fuerte: true };
      }
      setPie(prev, next, dots(un.pantallas.length, un.pantallas.indexOf(scr)));
      media.setMusicContext(scr.tipo === "escena3d" || scr.tipo === "modelo3d" ? "exploracion" : scr.tipo === "cierre" ? "cierre" : "exploracion");
      reportProgress();
      return v;
    });
  }
  /* Arma la secuencia lineal del módulo: intro → L01 → L02 → L03 → laboratorio → cierre. */
  function prepMod(mod) {
    var seq = [], meta = modMeta(mod.id);
    meta.unidades.forEach(function (un) {
      var src = un.id === "INTRO" ? [Object.assign({ tipo: "intro" }, mod.intro)] :
        un.id === "CIERRE" ? [Object.assign({ tipo: "cierre" }, mod.cierre)] :
        un.id === "LAB" ? mod.laboratorio.pantallas :
        mod.lecciones.filter(function (l) { return l.id.slice(-3) === un.id; })[0].pantallas;
      un.pantallas = src;
      src.forEach(function (s) { s._unidad = un; seq.push(s); });
    });
    mod._seq = seq;
  }

  /* Marco común de una pantalla: encabezado, cuerpo según tipo, voz, texto de la narración y «profundiza». */
  function marco(scr, opts) {
    var v = h("article", { class: "vista pantalla t-" + scr.tipo, "data-id": scr.id || "" });
    var who = scr.hablante && scr.hablante !== "narrador" && (C.personajes || {})[scr.hablante];
    var head = h("header", { class: "p-cab" },
      h("p", { class: "kicker" }, h("span", { class: "baliza" }), opts.kicker, h("span", { class: "k-tipo" }, S.etiquetas[scr.tipo] || "")),
      h("h1", null, scr.titulo || ""));
    v.appendChild(head);
    var vb = scr.id ? media.voiceBar(scr.id, { autoplay: true }) : null;
    if (vb) {
      var vw = h("div", { class: "p-voz" }, who ? h("span", { class: "voz-quien" }, avatar(scr.hablante, "sm"), h("span", null, h("b", null, who.nombre.split(" ")[0]), " te cuenta")) : null, vb);
      head.appendChild(vw);
    }
    var render = S.tipos[scr.tipo] || S.tipos.explicacion;
    var ctx = {
      ruta: S.rutaActual, mod: opts.mod, scr: scr,
      result: function () { return store.get("r", scr.id); },
      save: function (patch) { store.put("r", scr.id, patch); if (patch.done) { reportProgress(); v.classList.add("hecha"); } },
      note: function (t) { if (t === undefined) { var n = store.get("n", scr.id); return n ? n.t : ""; } store.put("n", scr.id, { t: t }); }
    };
    var body;
    try { body = render(scr, ctx); } catch (e) { console.error(e); body = h("div", { class: "prose" }, h("p", null, "No pudimos mostrar esta actividad. Avanza a la siguiente pantalla y vuelve a intentarlo más tarde.")); }
    v.appendChild(h("div", { class: "p-cuerpo" }, body));
    if (vb && vb.sub) v.appendChild(vb.sub);
    if (scr.profundiza) {
      v.appendChild(h("details", { class: "profundiza" }, h("summary", null, u.icon("book-open-text"), "Profundiza"), u.prose(scr.profundiza)));
    }
    if (scr.voz) {
      v.appendChild(h("details", { class: "transc-inline" }, h("summary", null, u.icon("align-left"), who ? "Lo que cuenta " + who.nombre.split(" ")[0] : "Texto de la narración"), u.prose(scr.voz)));
    }
    setTranscript(scr);
    if (requiere(scr) && S.screenDone(scr)) v.classList.add("hecha");
    return v;
  }
  S.marco = marco;

  /* ---------- Recursos y glosario ---------- */
  function vRecursos() {
    setRuta(null); setCrumbs([{ t: "Inicio", href: "#/" }, { t: "Recursos" }]); setPie({ href: "#/", t: "Inicio" }, null);
    var v = h("div", { class: "vista lista-simple" }, h("p", { class: "kicker" }, h("span", { class: "baliza" }), "Biblioteca"), h("h1", null, "Recursos descargables"),
      h("p", { class: "bajada" }, "Plantillas y guías para usar en tu trabajo. Cada una trae instrucciones y, cuando corresponde, un ejemplo resuelto."));
    var ul = h("ul", { class: "rec-grid" });
    Object.keys(C.recursos || {}).forEach(function (rid) {
      var rec = C.recursos[rid];
      ul.appendChild(h("li", null, h("a", { href: BASE + "descargas/" + rec.archivo, download: "" }, h("span", { class: "rec-ico" }, u.icon(rec.icono || "file-text")), h("b", null, rec.titulo), h("span", null, rec.descripcion || ""), h("small", null, rec.formato || "PDF"))));
    });
    v.appendChild(ul);
    return v;
  }
  function vGlosario() {
    setRuta(null); setCrumbs([{ t: "Inicio", href: "#/" }, { t: "Glosario" }]); setPie({ href: "#/", t: "Inicio" }, null);
    var v = h("div", { class: "vista lista-simple" }, h("p", { class: "kicker" }, h("span", { class: "baliza" }), "Biblioteca"), h("h1", null, "Glosario"));
    var q = h("input", { type: "search", class: "buscar", placeholder: "Buscar un término…", "aria-label": "Buscar en el glosario" });
    var dl = h("dl", { class: "glosario" });
    function pintar() {
      u.clear(dl);
      var t = q.value.trim().toLowerCase();
      (C.glosario || []).forEach(function (g) {
        if (t && (g.termino + " " + g.definicion).toLowerCase().indexOf(t) < 0) return;
        dl.appendChild(h("div", { class: "g-item", style: { "--ruta": (rutaMeta(g.ruta) || {}).color || "#087E8B" } }, h("dt", null, g.termino, h("span", { class: "chip-ruta" }, g.ruta)), h("dd", null, g.definicion)));
      });
    }
    q.addEventListener("input", pintar); pintar();
    v.appendChild(q); v.appendChild(dl);
    return v;
  }

  /* ---------- Enrutador ---------- */
  var timeTick = null, lastAct = Date.now();
  function route() {
    leave();
    var hash = location.hash || "#/";
    var m, out;
    if ((m = hash.match(/^#\/p\/(.+)$/))) out = vPantalla(decodeURIComponent(m[1]));
    else if ((m = hash.match(/^#\/m\/(.+)$/))) out = vModulo(decodeURIComponent(m[1]));
    else if ((m = hash.match(/^#\/ruta\/(\w+)$/))) out = vRuta(m[1]);
    else if ((m = hash.match(/^#\/orientacion(?:\/(\d+))?$/))) out = vOrientacion(parseInt(m[1] || "0", 10));
    else if ((m = hash.match(/^#\/caso\/(.+)$/)) && S.caso) out = S.caso.vista(decodeURIComponent(m[1]));
    else if ((m = hash.match(/^#\/eval\/(\w+)(?:\/(\w+))?$/)) && S.eval) { setRuta(m[1]); out = S.eval.vista(m[1], m[2]); }
    else if (hash === "#/recursos") out = vRecursos();
    else if (hash === "#/glosario") out = vGlosario();
    else out = vPortada();
    Promise.resolve(out).then(function (view) {
      u.clear(main);
      if (view) main.appendChild(view);
      if (!/^#\/(caso|eval)/.test(hash)) document.body.classList.remove("modo-inmersivo");
      if (hash !== "#/" && !/^#\/(recursos|glosario)$/.test(hash)) store.location(hash);
      window.scrollTo(0, 0);
      var h1 = main.querySelector("h1"); if (h1) { h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); }
      document.title = (h1 ? u.plain(h1.textContent) + " · " : "") + "Seguridad 360";
    }).catch(function (e) {
      console.error(e);
      u.clear(main);
      main.appendChild(h("div", { class: "vista error" }, h("h1", null, "No pudimos abrir esta parte del curso"), h("p", null, "Revisa tu conexión y vuelve a intentarlo."), h("a", { class: "btn btn-pri", href: "#/" }, "Volver al inicio")));
    });
  }
  function start() {
    store.init("ori", ["ori"].concat(C.rutas.map(function (r) { return r.codigo; })));
    shell();
    window.addEventListener("hashchange", route);
    ["pointerdown", "keydown", "scroll", "touchstart"].forEach(function (e) { window.addEventListener(e, function () { lastAct = Date.now(); }, { passive: true }); });
    timeTick = setInterval(function () { if (!document.hidden && Date.now() - lastAct < 5 * 60 * 1000) store.addTime(15); }, 15000);
    if (S.eval && S.eval.init) S.eval.init();
    route();
  }
  S.start = start;
  S.route = route;
  document.addEventListener("DOMContentLoaded", function () { if (!C) return; start(); });
})();
