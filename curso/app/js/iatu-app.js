/* Curso 5 — aplicación: rutas, navegación, pantallas, módulo, cierre, portada, orientación, biblioteca y ajustes.
   Modo SCO (LMS): window.IATU_SCO define el SCO activo y solo se muestran sus páginas.
   Modo vista previa (index.html): todos los SCO en un solo documento con almacenamiento local rotulado. */
(function () {
  "use strict";
  var IATU = window.IATU = window.IATU || {};
  var u = IATU.u, h = u.h, icon = u.icon, store = IATU.store, I = IATU.inter, M = IATU.media, P = IATU.practica;
  var CFG = window.IATU_CONFIG || {};
  var BASE = CFG.base || "";
  IATU.data = window.IATU_DATA || (window.IATU_DATA = {});

  var SCO_LOCK = window.IATU_SCO || null;     // SCO fijo cuando se lanza desde el LMS
  var PREVIEW = !SCO_LOCK;
  var app = {};
  var main, drawer, pager, topbarMeter, savePill;

  /* ---------- Carga diferida de datos de módulo ---------- */
  var loading = {};
  function loadData(name) {
    if (IATU.data[name]) return Promise.resolve(IATU.data[name]);
    if (loading[name]) return loading[name];
    loading[name] = new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = BASE + "data/" + name + ".js";
      s.onload = function () { res(IATU.data[name]); };
      s.onerror = function () { rej(new Error("No se pudo cargar " + name)); };
      document.head.appendChild(s);
    });
    return loading[name];
  }

  /* ---------- Secuencias de páginas por SCO ---------- */
  function scoPages(sco) {
    var C = IATU.data.curso;
    if (sco === "orientacion") return [
      { r: "orientacion/bienvenida", t: "Bienvenida" },
      { r: "orientacion/como-estudiar", t: "Cómo estudiar y rutas" },
      { r: "orientacion/diagnostico", t: "Diagnóstico inicial" },
      { r: "orientacion/tarea", t: "Tu tarea inicial" },
      { r: "orientacion/mapa", t: "Mapa del programa" }];
    if (sco === "evaluacion") return [
      { r: "evaluacion/requisitos", t: "Requisitos" },
      { r: "evaluacion/examen", t: "Situaciones aplicadas" },
      { r: "evaluacion/proyecto", t: "Proyecto de desempeño" },
      { r: "evaluacion/resultado", t: "Resultado" },
      { r: "evaluacion/transferencia", t: "Transferencia" },
      { r: "evaluacion/cierre", t: "Cierre del programa" }];
    var m = IATU.data[sco];
    if (!m) return [];
    var out = [{ r: sco + "/intro", t: "Introducción" }];
    m.lessons.forEach(function (l) { l.screens.forEach(function (s, i) { out.push({ r: sco + "/" + s.id, t: l.title + " · " + (i + 1) + "/4", screen: s, lesson: l }); }); });
    m.workshops.forEach(function (w) { out.push({ r: sco + "/taller/" + w.id, t: w.title, workshop: w }); });
    m.cases.forEach(function (c) { out.push({ r: sco + "/caso/" + c.id, t: c.title, kase: c }); });
    out.push({ r: sco + "/cierre", t: "Cierre del módulo" });
    return out;
  }

  function firstRoute(sco) { return sco === "orientacion" ? "orientacion/bienvenida" : sco === "evaluacion" ? "evaluacion/requisitos" : sco + "/intro"; }

  /* ---------- Requisitos y progreso de un SCO ---------- */
  function itemDone(type, id, st) {
    st = st || store.state;
    if (type === "screen") return !!(st.s && st.s[id]);
    if (type === "practice") { var a = (st.a && st.a[id]) || (st.p && st.p[id]); return !!(a && a.sub && a.fbr); }
    if (type === "workshop") { var w = st.w && st.w[id]; return !!(w && w.sub && w.fbr); }
    if (type === "case") { var c = st.c && st.c[id]; return !!(c && c.done); }
    return false;
  }
  function practiceKey(m, sid) {
    // Las 32 P04 estructuradas guardan su estado con el ID de la actividad; las abiertas, con el ID de pantalla.
    var out = sid;
    m.lessons.forEach(function (l) { l.screens.forEach(function (s) { if (s.id === sid && s.activity) out = s.activity.id; }); });
    return out;
  }
  function requirements(sco, st) {
    st = st || (sco === store.sco ? store.state : store.peek(sco));
    if (!st) st = { s: {}, a: {}, p: {}, w: {}, c: {}, d: {} };
    if (sco === "orientacion") {
      var diag = st.d && st.d.diag;
      var list = [
        { type: "screen", id: "ori-bienvenida", label: "Bienvenida", r: "orientacion/bienvenida" },
        { type: "screen", id: "ori-como", label: "Cómo estudiar y condiciones", r: "orientacion/como-estudiar" },
        { type: "diag", id: "diag", label: "Diagnóstico (16 situaciones, sin nota)", r: "orientacion/diagnostico", done: !!(diag && diag.done) },
        { type: "screen", id: "ori-tarea", label: "Tarea inicial ficticia", r: "orientacion/tarea" }];
      list.forEach(function (x) { if (x.done === undefined) x.done = itemDone(x.type, x.id, st); });
      return list;
    }
    if (sco === "evaluacion") return [];
    var m = IATU.data[sco];
    if (!m) return [];
    return m.required.map(function (q) {
      var label = q.id, route = sco + "/" + q.id, key = q.id;
      if (q.type === "practice") { key = practiceKey(m, q.id); label = "Práctica " + q.id.replace(/^IATU-/, ""); }
      if (q.type === "screen") label = "Pantalla " + q.id.replace(/^IATU-/, "");
      if (q.type === "workshop") { route = sco + "/taller/" + q.id; label = "Taller " + m.workshops.filter(function (w) { return w.id === q.id; })[0].title; }
      if (q.type === "case") { route = sco + "/caso/" + q.id; label = "Caso " + m.cases.filter(function (c) { return c.id === q.id; })[0].title; }
      return { type: q.type, id: q.id, label: label, r: route, done: itemDone(q.type, key, st) };
    });
  }
  function progressOf(sco, st) {
    var req = requirements(sco, st);
    if (!req.length) return { done: 0, total: 0, pct: 0, complete: false };
    var d = req.filter(function (x) { return x.done; }).length;
    return { done: d, total: req.length, pct: d / req.length, complete: d === req.length };
  }

  var reportedComplete = {};
  app.refreshProgress = function () {
    var sco = store.sco;
    if (!sco || sco === "evaluacion") return;
    var p = progressOf(sco);
    if (topbarMeter) {
      topbarMeter.querySelector("i").style.width = Math.round(p.pct * 100) + "%";
      topbarMeter.querySelector(".lbl").textContent = p.done + "/" + p.total;
      topbarMeter.setAttribute("aria-label", "Avance obligatorio del " + (sco === "orientacion" ? "módulo de orientación" : "módulo") + ": " + p.done + " de " + p.total);
    }
    store.adapter.setCompletion({ completed: p.complete, success: p.complete ? "passed" : "unknown", progress: p.pct });
    if (p.complete && !reportedComplete[sco]) {
      reportedComplete[sco] = true;
      store.save(true);
      u.toast(sco === "orientacion" ? "Orientación completa." : "Módulo completo: requisitos obligatorios revisados.");
    }
    if (IATU.service.configured()) {
      reportProgress(sco, p);
    }
    renderDrawer();
  };
  var reportProgress = u.debounce(function (sco, p) {
    IATU.service.call("PUT", "/api/v1/progreso/" + encodeURIComponent(sco), { cv: IATU.CV, done: p.done, total: p.total, complete: p.complete })
      .catch(function () { /* el estado del LMS sigue siendo la referencia; el examen consultará al servicio */ });
  }, 1500);

  /* ---------- Rutas ---------- */
  function parse() {
    var raw = (location.hash || "").replace(/^#\/?/, "");
    var parts = raw.split("/").filter(Boolean);
    return { raw: raw, parts: parts };
  }
  function go(r) { location.hash = "#/" + r; }
  app.go = go;
  function scoOfRoute(parts) {
    if (!parts.length) return null;
    var p0 = parts[0];
    if (p0 === "orientacion" || p0 === "evaluacion" || /^m\d\d$/.test(p0)) return p0;
    return null;
  }

  function route() {
    M.stopAll();
    var R = parse(), parts = R.parts;
    if (!parts.length) {
      if (SCO_LOCK) {
        var loc = store.location();
        return go(loc || firstRoute(SCO_LOCK));
      }
      return show(renderHome);
    }
    var sco = scoOfRoute(parts);
    if (SCO_LOCK && sco && sco !== SCO_LOCK) return show(function (mnt) { renderOtherSco(mnt, sco); });
    if (parts[0] === "biblioteca") return show(function (mnt) { renderLibrary(mnt, parts.slice(1)); });
    if (parts[0] === "ajustes") return show(renderSettings);
    if (parts[0] === "creditos") return show(renderCredits);
    if (!sco) return show(function (mnt) { mnt.appendChild(h("p", null, "Página no encontrada. ")).appendChild(h("a", { href: "#/" }, "Volver al inicio")); });
    var need = /^m\d\d$/.test(sco) ? loadData(sco) : Promise.resolve();
    need.then(function () {
      if (store.sco !== sco) { store.save(true); store.load(sco); }
      store.location(R.raw);
      if (sco === "orientacion") return show(function (mnt) { renderOrientation(mnt, parts[1] || "bienvenida"); }, sco, R.raw);
      if (sco === "evaluacion") return show(function (mnt) { IATU.evaluacion.render(mnt, parts[1] || "requisitos", api); }, sco, R.raw);
      return show(function (mnt) { renderModulePage(mnt, sco, parts.slice(1)); }, sco, R.raw);
    }, function (e) { show(function (mnt) { mnt.appendChild(h("div", { class: "callout risk" }, e.message)); }); });
  }

  function show(fn, sco, raw) {
    u.clear(main);
    var stage = h("div", { class: "stage fade-in" });
    main.appendChild(stage);
    fn(stage);
    renderPager(sco, raw);
    renderDrawer();
    if (sco) app.refreshProgress();
    window.scrollTo(0, 0);
    var h1 = stage.querySelector("h1");
    if (h1) { h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); document.title = h1.textContent + " · IA para trabajar mejor"; }
    if (window.innerWidth < 1100) closeDrawer();
  }

  /* ---------- Pager ---------- */
  function renderPager(sco, raw) {
    u.clear(pager);
    if (!sco) { pager.hidden = true; return; }
    pager.hidden = false;
    var pages = scoPages(sco), i = -1;
    pages.forEach(function (p, k) { if (p.r === raw) i = k; });
    if (i < 0) { pager.hidden = true; return; }
    var cur = pages[i], prev = pages[i - 1], next = pages[i + 1];
    var prevB = h("a", { class: "btn" + (prev ? "" : " is-disabled"), href: prev ? "#/" + prev.r : null, "aria-disabled": prev ? null : "true" }, icon("anterior"), h("span", { class: "t-long" }, "Anterior"));
    var isTeaching = cur.screen && cur.screen.kind === "lesson";
    var nextLabel = next ? (isTeaching ? (store.get("s", cur.screen.id) ? "Siguiente" : "Revisada · siguiente") : "Siguiente") : (isTeaching && !store.get("s", cur.screen.id) ? "Marcar revisada" : "Fin de la sección");
    var nextB = h("button", { class: "btn btn-primary", type: "button" }, h("span", null, nextLabel), icon("siguiente"));
    nextB.addEventListener("click", function () {
      if (isTeaching && !store.get("s", cur.screen.id)) {
        store.put("s", cur.screen.id, { r: 1 }, { now: true });
        app.refreshProgress();
      }
      if (next) go(next.r);
      else { u.toast("Fin de esta sección. Revisa el cierre para ver tus pendientes."); renderPager(sco, raw); }
    });
    if (!next && !isTeaching) nextB.disabled = true;
    pager.appendChild(prevB);
    pager.appendChild(h("div", { class: "pos" }, (i + 1) + " de " + pages.length + " · " + cur.t));
    pager.appendChild(nextB);
  }

  /* ---------- Drawer (mapa) ---------- */
  function statusIcon(done) { return h("span", { class: "st " + (done ? "st-done" : "st-pend") }, icon(done ? "circulo-check" : "pendiente", done ? "completado" : "pendiente")); }
  function renderDrawer() {
    if (!drawer) return;
    var C = IATU.data.curso, R = parse(), cur = R.raw;
    u.clear(drawer);
    drawer.appendChild(h("nav", { "aria-label": "Mapa del curso" }, (function () {
      var frag = document.createDocumentFragment();
      if (PREVIEW) frag.appendChild(h("ul", { class: "nav-list" }, h("li", null, h("a", { href: "#/", "aria-current": cur === "" ? "page" : null }, icon("inicio"), "Portada del programa"))));
      var scos = SCO_LOCK ? [SCO_LOCK] : C.scos;
      // SCO activo: lista detallada
      scos.forEach(function (sco) {
        var title = sco === "orientacion" ? "Orientación" : sco === "evaluacion" ? "Evaluación y proyecto" : "Módulo " + parseInt(sco.slice(1), 10) + " · " + C.modules[parseInt(sco.slice(1), 10) - 1].title;
        var active = scoOfRoute(R.parts) === sco || SCO_LOCK === sco;
        var prog = sco !== "evaluacion" ? progressOf(sco) : null;
        var det = h("details", { class: "navmod", open: active });
        det.appendChild(h("summary", { class: "nav-list" }, h("span", { class: "navbtn", style: { display: "flex", gap: ".5rem", padding: ".45rem .5rem", fontWeight: active ? 700 : 500 } },
          h("span", { class: "num" }, sco === "orientacion" ? "00" : sco === "evaluacion" ? "EV" : sco.slice(1)), h("span", null, title),
          prog && prog.total ? statusIcon(prog.complete) : null)));
        if (active && (sco === "orientacion" || sco === "evaluacion" || IATU.data[sco])) {
          var ul = h("ul", { class: "nav-sub" });
          var pages = scoPages(sco), lastLesson = null, sub = null;
          pages.forEach(function (p) {
            if (p.lesson) {
              if (p.lesson !== lastLesson) {
                lastLesson = p.lesson;
                sub = h("ul", { class: "nav-sub" });
                ul.appendChild(h("li", null, h("span", { class: "nav-title", style: { margin: ".6rem .5rem .2rem", display: "block", textTransform: "none", letterSpacing: 0, fontSize: ".8rem" } }, "L" + p.lesson.number + " · " + p.lesson.title), sub));
              }
              var sdone = p.screen.kind === "lesson" ? !!store.get("s", p.screen.id) : itemDone("practice", p.screen.activity ? p.screen.activity.id : p.screen.id);
              sub.appendChild(h("li", null, h("a", { href: "#/" + p.r, "aria-current": cur === p.r ? "page" : null }, h("span", null, p.screen.title), statusIcon(sdone))));
            } else {
              var dd = p.workshop ? itemDone("workshop", p.workshop.id) : p.kase ? itemDone("case", p.kase.id) : null;
              ul.appendChild(h("li", { class: "nav-list" }, h("a", { href: "#/" + p.r, "aria-current": cur === p.r ? "page" : null }, h("span", null, p.t), dd === null ? null : statusIcon(dd))));
            }
          });
          det.appendChild(ul);
        } else if (PREVIEW) {
          det.appendChild(h("ul", { class: "nav-sub" }, h("li", null, h("a", { href: "#/" + firstRoute(sco) }, "Abrir"))));
        }
        frag.appendChild(det);
      });
      if (SCO_LOCK) {
        frag.appendChild(h("p", { class: "nav-title" }, "Otros módulos"));
        frag.appendChild(h("p", { class: "note", style: { margin: "0 .5rem" } }, "Cada módulo es un SCO del LMS. Ábrelo desde el índice del curso en Dibork Learning."));
      }
      frag.appendChild(h("p", { class: "nav-title" }, "Recursos"));
      frag.appendChild(h("ul", { class: "nav-list" },
        h("li", null, h("a", { href: "#/biblioteca" }, icon("biblioteca"), "Biblioteca y descargas")),
        h("li", null, h("a", { href: "#/ajustes" }, icon("medidor"), "Ajustes de lectura")),
        h("li", null, h("a", { href: "#/creditos" }, icon("info"), "Créditos y licencias"))));
      return frag;
    })()));
  }
  function openDrawer() { drawer.hidden = false; document.body.classList.add("with-drawer"); var b = u.$("#drawer-btn"); if (b) b.setAttribute("aria-expanded", "true"); if (window.innerWidth < 1100) { var bd = h("div", { class: "drawer-backdrop", id: "drawer-backdrop" }); bd.addEventListener("click", closeDrawer); document.body.appendChild(bd); } }
  function closeDrawer() { if (window.innerWidth >= 1100) return; drawer.hidden = true; document.body.classList.remove("with-drawer"); var b = u.$("#drawer-btn"); if (b) b.setAttribute("aria-expanded", "false"); var bd = u.$("#drawer-backdrop"); if (bd) bd.remove(); }

  /* ---------- Portada (vista previa) ---------- */
  function renderHome(mnt) {
    var C = IATU.data.curso, pub = C.publication;
    var img = C.images["IATU-IMG001"];
    var hero = h("section", { class: "hero" + (img && img.file ? "" : " hero-noimg") });
    if (img && img.file) hero.appendChild(h("div", { class: "hero-img" }, h("img", { src: BASE + img.file, alt: "", srcset: img.sm ? BASE + img.sm + " 720w, " + BASE + img.file + " 1440w" : null, sizes: "100vw" })));
    hero.appendChild(h("div", { class: "hero-inner" },
      h("span", { class: "kicker" }, "Curso 5 · Laboratorio de criterio"),
      h("h1", null, "IA para trabajar mejor"),
      h("p", null, pub.subtitle),
      h("div", { class: "btn-row" },
        h("a", { class: "btn btn-primary", href: "#/orientacion/bienvenida" }, "Empezar por la orientación", icon("siguiente")),
        h("a", { class: "btn", href: "#/m01/intro" }, "Ir al módulo 1"))));
    mnt.appendChild(hero);
    if (PREVIEW) mnt.appendChild(h("div", { class: "callout warn" }, h("p", null, h("b", null, "Vista previa. "), "Tu avance se guarda solo en este navegador. En Dibork Learning el curso funciona como 18 SCO con guardado en el LMS y examen corregido por el servicio autorizado.")));
    mnt.appendChild(h("div", { class: "stats" },
      [["16", "módulos"], ["64", "lecciones"], ["32", "talleres con producto"], ["3", "casos con decisiones"], ["60 h", "estimadas de trabajo activo*"]].map(function (s) { return h("div", { class: "stat" }, h("b", null, s[0]), h("span", null, s[1])); })));
    mnt.appendChild(h("p", { class: "lead reading" }, pub.short));
    mnt.appendChild(h("p", { class: "note reading" }, "* " + pub.duration));
    mnt.appendChild(h("h2", null, "Los cuatro niveles de uso que recorre el programa"));
    mnt.appendChild(h("div", { class: "levels" },
      [["Consultar", "Pedir una explicación o un primer apoyo."], ["Colaborar", "Iterar con objetivo, contexto y revisión."], ["Sistematizar", "Procedimiento reutilizable con fuentes, criterios y pruebas."], ["Automatizar con supervisión", "Ejecutar partes con límites, permisos y respuesta ante fallos."]]
        .map(function (l, i) { return h("div", null, h("span", { class: "mono note" }, "Nivel " + (i + 1)), h("b", null, l[0]), l[1]); })));
    mnt.appendChild(h("p", { class: "note reading" }, "Mapa editorial de trabajo, no una escala científica ni un ranking de personas."));
    mnt.appendChild(h("h2", null, "Programa"));
    var routes = [[1, 6, "Ruta esencial"], [7, 12, "Aplicación profesional"], [13, 16, "Profundización"]];
    var grid = h("div", { class: "mod-grid" });
    var ori = progressOf("orientacion");
    grid.appendChild(modCard("00", "Orientación y diagnóstico", "Condiciones, rutas, 16 situaciones sin nota y tu tarea inicial.", "60 min", "#/orientacion/bienvenida", ori, "Inicio"));
    C.modules.forEach(function (m) {
      var band = routes.filter(function (r) { return m.number >= r[0] && m.number <= r[1]; })[0][2];
      grid.appendChild(modCard(("0" + m.number).slice(-2), m.title, m.objective, (m.minutes / 60) + " h", "#/" + m.sco + "/intro", progressOfPeek(m.sco), band));
    });
    grid.appendChild(modCard("EV", "Evaluación, proyecto y transferencia", "Situaciones aplicadas A/B, proyecto con rúbrica y revisión humana, transferencia.", "11 h", "#/evaluacion/requisitos", null, "Cierre"));
    mnt.appendChild(grid);
    mnt.appendChild(h("h2", null, "Qué vas a lograr"));
    mnt.appendChild(h("ol", { class: "reading" }, pub.outcomes.map(function (o) { return h("li", null, o); })));
    mnt.appendChild(h("div", { class: "callout info reading" }, h("h3", null, "Lo que este programa no promete"), h("p", null, pub.not_promised)));
    mnt.appendChild(h("p", { class: "note reading" }, h("b", null, "Requisitos: "), pub.requirements));
  }
  function progressOfPeek(sco) {
    if (!IATU.data[sco]) {
      // Sin cargar el módulo no conocemos el total; se informa solo si hay estado guardado.
      var st = store.peek(sco); if (!st) return null;
      return { unknown: true, started: true };
    }
    return progressOf(sco);
  }
  function modCard(n, title, obj, time, href, prog, band) {
    var pct = prog && prog.total ? Math.round(prog.pct * 100) : null;
    return h("a", { class: "mod-card", href: href },
      h("span", { class: "route-band" }, band),
      h("span", { class: "n", "aria-hidden": "true" }, n),
      h("h3", null, title),
      h("p", { class: "obj" }, obj),
      pct !== null ? h("div", { class: "mini-bar", role: "img", "aria-label": "Avance " + pct + "%" }, h("i", { style: { width: pct + "%" } })) : null,
      h("div", { class: "foot" }, h("span", null, icon("reloj"), " " + time), prog && prog.complete ? h("span", { class: "tag tag-teal" }, "Completo") : prog && (prog.started || prog.done) ? h("span", { class: "tag tag-ochre" }, "En curso") : h("span", null, "Abrir →")));
  }

  /* ---------- Orientación ---------- */
  function renderOrientation(mnt, page) {
    var C = IATU.data.curso, O = C.orientation;
    function head(k, t) { mnt.appendChild(h("div", { class: "crumbs" }, "Orientación")); mnt.appendChild(h("span", { class: "kicker" }, k)); mnt.appendChild(h("h1", null, t)); }
    if (page === "bienvenida") {
      head("Bienvenida", "Un laboratorio para trabajar con criterio");
      mnt.appendChild(M.audioPlayer("IATU-BIENVENIDA"));
      mnt.appendChild(h("p", { class: "lead reading" }, O.welcome));
      mnt.appendChild(h("div", { class: "grid grid-3", style: { margin: "1.5rem 0" } },
        [["encargo", "Formula", "Encargos con producto, fuentes, límites y criterio de aceptación."], ["revision", "Verifica", "Contrasta cada afirmación con su fuente antes de usarla."], ["limite", "Decide", "Cuándo apoyarte, cuándo detenerte y cuándo no usar IA."]]
          .map(function (x) { return h("div", { class: "card" }, icon(x[0]), h("h3", { style: { marginTop: ".4rem" } }, x[1]), h("p", { class: "note", style: { margin: 0 } }, x[2])); })));
      mnt.appendChild(h("div", { class: "callout info reading" }, h("p", null, C.scope)));
      markReviewed("ori-bienvenida");
    } else if (page === "como-estudiar") {
      head("Cómo estudiar", "Cómo funciona el programa");
      mnt.appendChild(M.audioPlayer("IATU-COMO_ESTUDIAR"));
      mnt.appendChild(u.paragraphs(O.how_to, "prose"));
      mnt.appendChild(h("h2", null, "Rutas"));
      mnt.appendChild(M.audioPlayer("IATU-RUTAS", { label: "Rutas · voz sintética" }));
      mnt.appendChild(u.paragraphs(O.study_routes, "prose"));
      var hrs = O.hours;
      mnt.appendChild(h("div", { class: "table-wrap" }, h("table", { class: "data" },
        h("caption", { class: "sr-only" }, "Distribución estimada de horas"),
        h("thead", null, h("tr", null, h("th", { scope: "col" }, "Componente"), h("th", { scope: "col" }, "Minutos estimados"))),
        h("tbody", null, [["16 módulos", hrs.modules], ["Orientación y diagnóstico", hrs.orientation], ["Situaciones aplicadas (examen)", hrs.exam], ["Proyecto de desempeño", hrs.project], ["Transferencia", hrs.transfer], ["Total", hrs.total]]
          .map(function (r) { return h("tr", null, h("td", null, r[0]), h("td", null, String(r[1]))); })))));
      mnt.appendChild(h("p", { class: "note" }, C.publication.duration));
      mnt.appendChild(h("h2", null, "Condiciones de avance"));
      mnt.appendChild(h("ul", { class: "reading" },
        h("li", null, "Pantallas de enseñanza: revisión declarada, sin tiempo mínimo."),
        h("li", null, "Prácticas (P04): un intento y revisar la devolución. No se exige acertar."),
        h("li", null, "Talleres: entregar tu borrador y revisar la pauta. Sin nota automática de calidad."),
        h("li", null, "Casos: completar decisiones y escribir tu versión."),
        h("li", null, "Audio, videos, tarjetas y zonas exploradas son opcionales y no dan puntos."),
        h("li", null, "La evaluación se habilita cuando completas lo obligatorio, verificado por el servicio autorizado.")));
      mnt.appendChild(h("div", { class: "callout warn reading" }, h("h3", null, icon("privado"), " Tus datos"), h("p", null, "Trabaja con los expedientes ficticios del curso. Si usas un asistente real, comparte solo datos ficticios o autorizados y registra lo que hiciste. No escribas contraseñas ni datos personales reales en las respuestas.")));
      mnt.appendChild(h("div", { class: "callout info reading" }, h("p", null, C.honesty)));
      markReviewed("ori-como");
    } else if (page === "diagnostico") {
      head("Diagnóstico", "16 situaciones para empezar");
      P.diagnostic(mnt, function () { app.refreshProgress(); });
    } else if (page === "tarea") {
      head("Tu tarea inicial", "Elige una tarea ficticia para ensayar");
      mnt.appendChild(u.paragraphs(O.onboarding_plan, "prose"));
      var rec = store.get("o", "tarea") || {};
      var fields = [["tarea", "Describe una tarea frecuente de tu trabajo, con datos ficticios", "Ej.: responder consultas sobre el estado de pedidos usando una tabla interna."],
        ["producto", "¿Qué producto entregas y a quién?", "Ej.: un correo de estado para la persona que consultó."],
        ["datos", "¿Qué datos necesitarías y cuáles no deberías compartir?", "Ej.: estado y fecha comprometida sí; RUT, dirección o pago no."],
        ["nivel", "¿En qué nivel crees que está hoy: consultar, colaborar, sistematizar o automatizar con supervisión?", ""]];
      fields.forEach(function (f) {
        var id = u.newId("ot");
        var ta = h("textarea", { id: id, rows: 3, placeholder: f[2] }, rec[f[0]] || "");
        ta.addEventListener("input", function () { var r = store.get("o", "tarea") || {}; r[f[0]] = ta.value; store.put("o", "tarea", r); });
        mnt.appendChild(h("label", { class: "fl", for: id }, f[1])); mnt.appendChild(ta);
      });
      var b = h("button", { class: "btn btn-primary", type: "button" }, icon("guardar"), store.get("s", "ori-tarea") ? "Tarea guardada" : "Guardar mi tarea inicial");
      b.addEventListener("click", function () { store.put("s", "ori-tarea", { r: 1 }, { now: true }); b.lastChild.textContent = "Tarea guardada"; app.refreshProgress(); u.announce("Tarea inicial guardada."); });
      mnt.appendChild(h("div", { class: "btn-row" }, b));
      mnt.appendChild(h("p", { class: "note" }, "Volverás a esta tarea en el cierre del programa para medir con evidencia qué cambió."));
    } else if (page === "mapa") {
      head("Mapa", "Mapa del programa");
      var reqs = requirements("orientacion");
      mnt.appendChild(h("h2", null, "Requisitos de esta orientación"));
      mnt.appendChild(reqList(reqs));
      mnt.appendChild(h("h2", null, "Módulos"));
      mnt.appendChild(h("ol", { class: "reading" }, C.modules.map(function (m) {
        return h("li", null, h("b", null, m.title), h("br"), h("span", { class: "note" }, m.objective));
      })));
      if (SCO_LOCK) mnt.appendChild(h("p", { class: "note" }, "Cada módulo se abre desde el índice del curso en Dibork Learning."));
    }
  }
  function markReviewed(id) { if (!store.get("s", id)) { store.put("s", id, { r: 1 }); setTimeout(app.refreshProgress, 50); } }
  function reqList(reqs) {
    return h("ul", { class: "req-list" }, reqs.map(function (q) {
      return h("li", { class: q.done ? "done" : "" }, h("a", { href: "#/" + q.r }, statusIcon(q.done), h("span", null, q.label)));
    }));
  }

  /* ---------- Página de módulo ---------- */
  function renderModulePage(mnt, sco, rest) {
    var m = IATU.data[sco];
    var crumbs = h("div", { class: "crumbs" }, h("span", null, "Módulo " + m.number), h("span", { class: "sep" }, "·"), h("span", null, m.title));
    if (!rest.length || rest[0] === "intro") return renderIntro(mnt, m);
    if (rest[0] === "cierre") return renderClosure(mnt, m);
    if (rest[0] === "taller") { mnt.appendChild(crumbs); var w = m.workshops.filter(function (x) { return x.id === rest[1]; })[0]; return w ? P.workshop(w, mnt) : null; }
    if (rest[0] === "caso") { mnt.appendChild(crumbs); var c = m.cases.filter(function (x) { return x.id === rest[1]; })[0]; return c ? P.branchCase(c, mnt) : null; }
    var sid = rest[0], screen = null, lesson = null, idx = 0;
    m.lessons.forEach(function (l) { l.screens.forEach(function (s, i) { if (s.id === sid) { screen = s; lesson = l; idx = i; } }); });
    if (!screen) { mnt.appendChild(h("p", null, "Pantalla no encontrada.")); return; }
    crumbs.appendChild(h("span", { class: "sep" }, "·"));
    crumbs.appendChild(h("span", null, "Lección " + lesson.number + " · pantalla " + (idx + 1) + " de 4"));
    mnt.appendChild(crumbs);
    mnt.appendChild(h("header", { class: "screen-head" }, h("div", null,
      h("span", { class: "kicker" }, screen.title),
      h("h1", null, lesson.title),
      h("div", { class: "meta-row" }, h("span", { class: "tag" }, icon("reloj"), lesson.minutes + " min la lección"),
        screen.mandatory ? h("span", { class: "tag tag-ochre" }, "Práctica obligatoria") : null,
        screen.kind === "lesson" ? (store.get("s", screen.id) ? h("span", { class: "tag tag-teal" }, icon("check"), " Revisada") : null) : null))));
    var ap = M.audioPlayer(screen.audio_id);
    if (ap) mnt.appendChild(ap);
    if (screen.kind === "decision") {
      if (screen.activity) I.activity(screen.activity, mnt);
      else I.decision(screen, mnt);
      return;
    }
    if (screen.image_ids && screen.image_ids.length) {
      var f = M.figure(screen.image_ids[0], { side: false });
      if (f) mnt.appendChild(f);
    }
    if (/resolución/i.test(screen.title)) {
      mnt.appendChild(h("section", { class: "resolution", "aria-label": "Resolución comentada" },
        h("span", { class: "ref-label" }, "Resolución comentada"), u.paragraphs(screen.text, "prose")));
    } else if (/procedimiento/i.test(screen.title)) {
      mnt.appendChild(h("section", { class: "procedure", "aria-label": "Procedimiento" }, u.paragraphs(screen.text, "prose")));
    } else mnt.appendChild(u.paragraphs(screen.text, "prose"));
    if (screen.video_id) { var v = M.videoCard(screen.video_id); if (v) mnt.appendChild(v); }
    if (screen.flipcards) I.flipcards(screen.flipcards, mnt);
    if (screen.hotspots) screen.hotspots.forEach(function (hs) { I.hotspots(hs, mnt); });
    // Anotación personal (la interacción declarada es «Lectura, contraste y anotación»)
    var nrec = store.get("n", screen.id) || {};
    var nid = u.newId("note");
    var ta = h("textarea", { id: nid, rows: 3, placeholder: "Por ejemplo: una frase que aplicarías en tu trabajo o una duda." }, nrec.t || "");
    ta.addEventListener("input", function () { store.put("n", screen.id, { t: ta.value }); });
    mnt.appendChild(h("details", { class: "card", style: { marginTop: "1.5rem" }, open: !!nrec.t },
      h("summary", null, h("b", null, icon("lapiz"), " Tu anotación (opcional)")),
      h("label", { class: "sr-only", for: nid }, "Tu anotación"), ta));
    mnt.appendChild(h("p", { class: "note" }, "Fuentes de esta pantalla: ", screen.source_ids.map(function (id) { return h("a", { class: "src", href: "#/biblioteca/fuentes/" + id }, id); })));
  }

  function renderIntro(mnt, m) {
    mnt.appendChild(h("div", { class: "crumbs" }, "Módulo " + m.number + " de 16"));
    var C = IATU.data.curso, firstImg = null;
    m.lessons.some(function (l) { return l.screens.some(function (s) { return (s.image_ids || []).some(function (id) { if (C.images[id] && C.images[id].file) { firstImg = C.images[id]; return true; } return false; }); }); });
    var banner = h("header", { class: "mod-banner" + (firstImg ? "" : " noimg") },
      firstImg ? h("img", { src: BASE + firstImg.file, alt: "", srcset: firstImg.sm ? BASE + firstImg.sm + " 720w, " + BASE + firstImg.file + " 1440w" : null, sizes: "(max-width: 900px) 100vw, 980px" }) : null,
      h("div", { class: "mod-banner-in" }, h("span", { class: "mod-num", "aria-hidden": "true" }, ("0" + m.number).slice(-2)),
        h("div", null, h("span", { class: "kicker" }, "Módulo " + m.number + " · objetivo " + m.objective_id), h("h1", null, m.title))));
    mnt.appendChild(banner);
    mnt.appendChild(M.audioPlayer(m.intro_audio, { label: "Introducción · voz sintética" }));
    mnt.appendChild(h("p", { class: "lead reading" }, m.introduction));
    mnt.appendChild(h("div", { class: "callout reading" }, h("h3", null, icon("bandera"), " Al terminar podrás"), h("p", null, m.objective)));
    var tc = m.time_components;
    mnt.appendChild(h("div", { class: "stats" },
      [[tc.lecciones_y_micropractica + " min", "4 lecciones y prácticas"], [tc.taller_guiado + " min", "taller guiado"], [tc.taller_independiente + " min", "taller de transferencia"], [tc.revision_y_reintento + " min", "revisión y reintento" + (m.cases.length ? " (incluye el caso)" : "")]]
        .map(function (s) { return h("div", { class: "stat" }, h("b", null, s[0]), h("span", null, s[1])); })));
    mnt.appendChild(h("h2", null, "Recorrido"));
    var ol = h("ol", { class: "req-list" });
    m.lessons.forEach(function (l) {
      ol.appendChild(h("li", null, h("a", { href: "#/" + m.sco + "/" + l.screens[0].id }, icon("fuente"), h("span", null, h("b", null, "Lección " + l.number + ". "), l.title), h("span", { class: "note", style: { marginLeft: "auto" } }, l.minutes + " min"))));
    });
    m.workshops.forEach(function (w) {
      ol.appendChild(h("li", null, h("a", { href: "#/" + m.sco + "/taller/" + w.id }, icon("archivo"), h("span", null, h("b", null, (/T1$/.test(w.id) ? "Taller guiado. " : "Taller de transferencia. ")), w.title), h("span", { class: "note", style: { marginLeft: "auto" } }, w.minutes + " min"))));
    });
    m.cases.forEach(function (c) {
      ol.appendChild(h("li", null, h("a", { href: "#/" + m.sco + "/caso/" + c.id }, icon("ramas"), h("span", null, h("b", null, "Caso. "), c.title), h("span", { class: "note", style: { marginLeft: "auto" } }, c.minutes + " min"))));
    });
    mnt.appendChild(ol);
    mnt.appendChild(h("div", { class: "btn-row" }, h("a", { class: "btn btn-primary", href: "#/" + m.sco + "/" + m.lessons[0].screens[0].id }, "Comenzar la lección 1", icon("siguiente"))));
  }

  function renderClosure(mnt, m) {
    mnt.appendChild(h("div", { class: "crumbs" }, "Módulo " + m.number + " · cierre"));
    mnt.appendChild(h("span", { class: "kicker" }, "Cierre del módulo"));
    mnt.appendChild(h("h1", null, m.title));
    mnt.appendChild(M.audioPlayer(m.closure_audio, { label: "Cierre · voz sintética" }));
    mnt.appendChild(h("p", { class: "lead reading" }, m.closure));
    var reqs = requirements(m.sco), p = progressOf(m.sco);
    mnt.appendChild(h("div", { class: "callout " + (p.complete ? "" : "warn") }, h("h3", null, p.complete ? "Requisitos obligatorios completos" : "Te faltan " + (p.total - p.done) + " de " + p.total + " requisitos"),
      h("p", null, p.complete ? "Este módulo quedó registrado como completo. Puedes volver a cualquier pantalla para repasar." : "Abre cada pendiente desde la lista. No se exige acertar: basta intentar y revisar la devolución.")));
    var pend = reqs.filter(function (q) { return !q.done; });
    if (pend.length) { mnt.appendChild(h("h2", null, "Pendientes")); mnt.appendChild(reqList(pend)); }
    mnt.appendChild(h("details", null, h("summary", null, "Ver todos los requisitos (" + reqs.length + ")"), reqList(reqs)));
    mnt.appendChild(h("h2", null, "Tu evidencia del módulo"));
    mnt.appendChild(h("p", null, "Descarga tus productos (talleres, microproductos, casos y anotaciones) para tu portafolio. Conservar tus productos y correcciones es la evidencia de lo que aprendiste."));
    var dl = h("button", { class: "btn", type: "button" }, icon("descargar"), "Descargar mi evidencia (.txt)");
    dl.addEventListener("click", function () { u.download("IATU-" + m.sco + "-evidencia.txt", evidenceText(m)); });
    mnt.appendChild(h("div", { class: "btn-row" }, dl));
  }
  function evidenceText(m) {
    var st = store.state, out = ["IA para trabajar mejor · " + "Módulo " + m.number + ": " + m.title, "Exportado: " + new Date().toLocaleString("es-CL"), ""];
    m.lessons.forEach(function (l) {
      l.screens.forEach(function (s) {
        var n = st.n[s.id]; if (n && n.t) out.push("[Anotación " + s.id + "] " + n.t);
        var p = st.p[s.id]; if (p && p.mp) out.push("[Microproducto " + s.id + "] decisión " + (p.last || "-") + "\n" + p.mp);
        if (s.activity) { var a = st.a[s.activity.id]; if (a && a.tr) out.push("[Variante " + s.activity.id + "]\n" + a.tr); }
      });
    });
    m.workshops.forEach(function (w) { var r = st.w[w.id]; if (r) { out.push("\n== Taller " + w.id + ": " + w.title + " =="); if (r.prod) out.push(r.prod); if (r.retry) out.push("-- Variante --\n" + r.retry); } });
    m.cases.forEach(function (c) { var r = st.c[c.id]; if (r) { out.push("\n== Caso " + c.id + ": " + c.title + " =="); if (r.refl) out.push(r.refl); if (r.retry) out.push("-- Variante --\n" + r.retry); } });
    return out.join("\n");
  }

  function renderOtherSco(mnt, sco) {
    mnt.appendChild(h("h1", null, "Este contenido está en otro SCO"));
    mnt.appendChild(h("p", null, "Ábrelo desde el índice del curso en Dibork Learning."));
    var b = h("button", { class: "btn btn-primary", type: "button" }, "Solicitar al LMS abrir " + sco);
    b.addEventListener("click", function () { if (!store.navChoice("ITEM-" + sco.toUpperCase())) u.toast("El LMS no permite la navegación directa desde aquí. Usa el índice del curso."); else store.finish(); });
    mnt.appendChild(h("div", { class: "btn-row" }, b));
  }

  /* ---------- Biblioteca ---------- */
  function renderLibrary(mnt, parts) {
    var C = IATU.data.curso, tab = parts[0] || "prompts";
    mnt.appendChild(h("span", { class: "kicker" }, "Biblioteca opcional"));
    mnt.appendChild(h("h1", null, "Biblioteca y recursos"));
    mnt.appendChild(h("p", { class: "note reading" }, "Recursos de consulta. No suman horas obligatorias ni puntos."));
    var tabs = [["prompts", "Encargos comparados (" + C.prompts.length + ")"], ["plantillas", "Plantillas (" + C.templates.length + ")"], ["auditorias", "Auditorías (" + C.faults.length + ")"], ["materiales", "Documentos de casos"], ["glosario", "Glosario"], ["fuentes", "Fuentes"], ["descargas", "Descargas"]];
    mnt.appendChild(h("nav", { class: "lib-tabs", "aria-label": "Secciones de la biblioteca" }, tabs.map(function (t) { return h("a", { href: "#/biblioteca/" + t[0], "aria-current": t[0] === tab ? "page" : null }, t[1]); })));
    if (tab === "prompts") {
      C.prompts.forEach(function (p) {
        var d = h("details", { class: "card", style: { marginBottom: ".8rem" }, open: parts[1] === p.id, id: p.id });
        d.appendChild(h("summary", null, h("b", null, p.title), h("br"), h("span", { class: "note" }, p.use)));
        d.appendChild(u.docView({ tab: "Insumo ficticio", text: p.input, compact: true }));
        d.appendChild(h("div", { class: "prompt-pair" },
          h("div", null, h("span", { class: "ref-label" }, "Encargo vago"), h("div", { class: "prompt-box vague" }, p.vague)),
          h("div", null, h("span", { class: "ref-label" }, "Encargo completo"), h("div", { class: "prompt-box good" }, p.prompt))));
        var copy = h("button", { class: "btn btn-sm", type: "button" }, icon("archivo"), "Copiar encargo completo");
        copy.addEventListener("click", function () { (navigator.clipboard ? navigator.clipboard.writeText(p.prompt) : Promise.reject()).then(function () { u.toast("Encargo copiado. Úsalo solo con datos ficticios o autorizados."); }, function () { u.toast("No se pudo copiar; selecciona el texto manualmente."); }); });
        d.appendChild(h("div", { class: "btn-row" }, copy));
        d.appendChild(h("details", null, h("summary", null, "Ver referencia y controles"),
          h("div", { class: "ref" }, h("span", { class: "ref-label" }, "Referencia"), p.reference),
          h("ul", null, p.checks.map(function (c) { return h("li", null, c); })),
          h("p", null, h("b", null, "Mejora: "), p.improvement)));
        d.appendChild(h("p", { class: "note" }, p.comment));
        mnt.appendChild(d);
      });
    } else if (tab === "plantillas") {
      C.templates.forEach(function (t) {
        var d = h("details", { class: "card", style: { marginBottom: ".8rem" }, open: parts[1] === t.id });
        d.appendChild(h("summary", null, h("b", null, t.title)));
        d.appendChild(h("p", { class: "note" }, t.intro));
        var vals = (store.get("x", t.id) || {}).v || {};
        t.fields.forEach(function (f, i) {
          var id = u.newId("tp");
          var ta = h("textarea", { id: id, rows: 2 }, vals[i] || "");
          ta.addEventListener("input", function () { vals[i] = ta.value; store.put("x", t.id, { v: vals }); });
          d.appendChild(h("label", { class: "fl", for: id }, f)); d.appendChild(ta);
        });
        var dl = h("button", { class: "btn btn-sm", type: "button" }, icon("descargar"), "Descargar completada (.txt)");
        dl.addEventListener("click", function () { u.download(t.id + ".txt", t.title + "\n\n" + t.fields.map(function (f, i) { return f + "\n" + (vals[i] || "") + "\n"; }).join("\n")); });
        d.appendChild(h("div", { class: "btn-row" }, dl));
        mnt.appendChild(d);
      });
    } else if (tab === "auditorias") {
      C.faults.forEach(function (f) {
        var d = h("section", { class: "card", style: { marginBottom: "1rem" } });
        d.appendChild(h("h2", { style: { marginTop: 0 } }, f.title));
        d.appendChild(u.docView({ tab: "Fuente", text: f.input, compact: true }));
        d.appendChild(h("div", { class: "output" }, h("div", { class: "oh" }, h("b", null, "Salida a auditar"), h("span", { class: "tag tag-brick" }, "Revisar")), h("p", { style: { margin: 0 } }, f.output)));
        d.appendChild(h("p", null, h("b", null, "Tarea: "), f.task));
        var id = u.newId("au");
        var ta = h("textarea", { id: id }, ((store.get("x", f.id) || {}).t) || "");
        ta.addEventListener("input", function () { store.put("x", f.id, { t: ta.value }); });
        d.appendChild(h("label", { class: "fl", for: id }, "Tu auditoría")); d.appendChild(ta);
        var sol = h("div", { class: "ref", hidden: true }, h("span", { class: "ref-label" }, "Solución"), f.solution);
        var b = h("button", { class: "btn btn-sm", type: "button" }, icon("ver"), "Ver solución");
        b.addEventListener("click", function () { sol.hidden = false; });
        d.appendChild(h("div", { class: "btn-row" }, b)); d.appendChild(sol);
        mnt.appendChild(d);
      });
    } else if (tab === "materiales") {
      Object.keys(C.materials).forEach(function (k) { var m = C.materials[k]; mnt.appendChild(u.docView({ tab: m.id + " · " + m.kind, title: m.title, text: m.text })); });
    } else if (tab === "glosario") {
      var q = h("input", { type: "search", placeholder: "Buscar término", "aria-label": "Buscar en el glosario" });
      var dl2 = h("dl", { class: "glossary reading" });
      function fill() {
        u.clear(dl2);
        var s = q.value.trim().toLowerCase();
        C.glossary.forEach(function (g) { if (!s || (g[0] + g[1]).toLowerCase().indexOf(s) >= 0) { dl2.appendChild(h("dt", null, g[0])); dl2.appendChild(h("dd", null, g[1])); } });
      }
      q.addEventListener("input", fill); fill();
      mnt.appendChild(h("div", { style: { maxWidth: "420px" } }, q)); mnt.appendChild(dl2);
    } else if (tab === "fuentes") {
      mnt.appendChild(h("p", { class: "note reading" }, "Cada marca como ", h("span", { class: "src" }, "N1"), " en el texto remite a esta lista. Las fuentes indican su alcance y estado de consulta; las funciones de productos cambian y deben verificarse en documentación oficial antes de publicar."));
      C.sources.forEach(function (s) {
        var open = parts[1] === s.id;
        var d = h("div", { class: "card", id: "src-" + s.id, style: { marginBottom: ".6rem", borderColor: open ? "var(--teal)" : null } },
          h("p", { style: { margin: 0 } }, h("span", { class: "src" }, s.id), " ", h("b", null, s.title)),
          h("p", { class: "note", style: { margin: ".3rem 0" } }, s.kind + " · " + s.status + " · consultado " + s.consulted),
          h("p", { style: { margin: ".3rem 0", fontSize: ".9rem" } }, s.supported_scope),
          s.url ? h("a", { href: s.url, target: "_blank", rel: "noopener" }, "Abrir fuente ↗") : null);
        mnt.appendChild(d);
        if (open) setTimeout(function () { d.scrollIntoView({ block: "center" }); }, 60);
      });
    } else if (tab === "descargas") {
      var files = [
        ["descargas/IATU_Cuaderno_participante.docx", "Cuaderno del participante", "Word · programa, pautas y espacios de trabajo"],
        ["descargas/IATU_Laboratorio_datos_productividad.xlsx", "Laboratorio de datos y productividad", "Excel · tablas ficticias para M09 y M12"],
        ["descargas/IATU_M03_archivo_practica.csv", "Archivo de práctica M03", "CSV ficticio"],
        ["descargas/IATU_M09_casos_originales.csv", "Casos originales M09", "CSV ficticio con vacíos y duplicados intencionales"],
        ["descargas/IATU_M09_tasas.csv", "Tasas M09", "CSV ficticio"]];
      mnt.appendChild(h("div", { class: "dl-list" }, files.map(function (f) {
        return h("a", { class: "dl-item", href: BASE + f[0], download: "" }, icon("descargar"), h("span", null, h("b", null, f[1]), h("small", null, f[2])));
      })));
      mnt.appendChild(h("p", { class: "note" }, "Todos los datos de estos archivos son ficticios. Las claves del examen no se incluyen en materiales del participante."));
    }
  }

  /* ---------- Ajustes ---------- */
  function prefs() { try { return JSON.parse(localStorage.getItem("iatu5:prefs") || "{}"); } catch (e) { return {}; } }
  function applyPrefs() {
    var p = prefs(), r = document.documentElement;
    if (p.size) r.setAttribute("data-size", p.size); else r.removeAttribute("data-size");
    if (p.theme) r.setAttribute("data-theme", p.theme); else r.removeAttribute("data-theme");
    document.body.classList.toggle("no-motion", !!p.nomotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function setPref(k, v) { var p = prefs(); if (v === null) delete p[k]; else p[k] = v; try { localStorage.setItem("iatu5:prefs", JSON.stringify(p)); } catch (e) { /* sin acción */ } applyPrefs(); }
  function renderSettings(mnt) {
    mnt.appendChild(h("h1", null, "Ajustes de lectura"));
    var p = prefs();
    function seg(label, key, opts) {
      var g = h("div", { class: "seg", role: "group", "aria-label": label });
      opts.forEach(function (o) {
        var b = h("button", { type: "button", "aria-pressed": String((p[key] || null) === o[0]) }, o[1]);
        b.addEventListener("click", function () { setPref(key, o[0]); u.$$("button", g).forEach(function (x) { x.setAttribute("aria-pressed", "false"); }); b.setAttribute("aria-pressed", "true"); });
        g.appendChild(b);
      });
      return h("div", null, h("p", { class: "fl" }, label), g);
    }
    mnt.appendChild(h("div", { class: "settings" },
      seg("Tamaño del texto", "size", [[null, "Normal"], ["l", "Grande"], ["xl", "Muy grande"]]),
      seg("Tema", "theme", [[null, "Según el sistema"], ["light", "Claro"], ["dark", "Oscuro"]]),
      seg("Animaciones", "nomotion", [[null, "Según el sistema"], [true, "Reducir movimiento"]])));
    mnt.appendChild(h("p", { class: "note" }, "Las tarjetas se muestran sin giro animado cuando reduces el movimiento."));
  }
  function renderCredits(mnt) {
    mnt.appendChild(h("h1", null, "Créditos y licencias"));
    mnt.appendChild(h("ul", { class: "reading" },
      h("li", null, "Contenido y casos ficticios: Curso 5 v3, Dibork Learning."),
      h("li", null, "Narración: voz sintética «Catalina» (Microsoft Azure Neural, es-CL-CatalinaNeural). Es una voz generada por computador, no una grabación humana. Uso sujeto a la licencia que confirme Dibork."),
      h("li", null, "Iconos: Lucide (licencia ISC)."),
      h("li", null, "Imágenes: generadas para el curso (Canva / entregadas por Dibork); no representan personas, marcas ni lugares reales."),
      h("li", null, "Las salidas X/Y/Z de las actividades son material controlado del curso; no son resultados de ChatGPT, Claude ni Gemini.")));
  }

  /* ---------- Arranque ---------- */
  var api = { requirements: requirements, progressOf: progressOf, loadData: loadData, scoPages: scoPages, go: go, reqList: reqList, statusIcon: statusIcon };
  app.api = api;

  function buildShell() {
    var C = IATU.data.curso;
    document.body.insertAdjacentHTML("afterbegin", window.IATU_ICONOS || "");
    var skip = h("a", { class: "skip-link", href: "#contenido" }, "Saltar al contenido");
    var drawerBtn = h("button", { class: "btn btn-icon btn-ghost", id: "drawer-btn", type: "button", "aria-label": "Mapa del curso", "aria-controls": "drawer", "aria-expanded": "false" }, icon("menu"));
    drawerBtn.addEventListener("click", function () { if (drawer.hidden) openDrawer(); else { drawer.hidden = true; document.body.classList.remove("with-drawer"); drawerBtn.setAttribute("aria-expanded", "false"); var bd = u.$("#drawer-backdrop"); if (bd) bd.remove(); } });
    savePill = h("span", { class: "save-pill", role: "status", "aria-live": "polite" }, h("span", { class: "dot" }), h("span", { class: "lbl" }, ""));
    topbarMeter = h("div", { class: "progress-meter", role: "img", "aria-label": "Avance" }, h("span", { class: "lbl" }, ""), h("span", { class: "bar" }, h("i", { style: { width: "0%" } })));
    var brand = h("a", { class: "brand", href: PREVIEW ? "#/" : "#/" + firstRoute(SCO_LOCK) },
      h("span", { class: "brand-mark", html: '<svg viewBox="0 0 34 34" aria-hidden="true"><rect x="2" y="2" width="30" height="30" rx="8" fill="#17202b"/><path d="M10 11h10l4 4v9a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V12a1 1 0 0 1 1-1z" fill="#f5efe3"/><path d="M20 11v4h4" fill="none" stroke="#17202b" stroke-width="1.4"/><circle cx="21" cy="21" r="3.6" fill="none" stroke="#17625e" stroke-width="2"/><path d="M23.6 23.6l2.6 2.6" stroke="#17625e" stroke-width="2" stroke-linecap="round"/></svg>' }),
      h("span", { class: "brand-txt" }, h("b", null, "IA para trabajar mejor"), h("small", null, "Dibork Learning · Curso 5")));
    var top = h("header", { class: "topbar" }, drawerBtn, brand, h("span", { class: "spacer" }), topbarMeter, savePill,
      h("a", { class: "btn btn-icon btn-ghost", href: "#/biblioteca", "aria-label": "Biblioteca" }, icon("biblioteca")));
    drawer = h("aside", { class: "drawer", id: "drawer", hidden: true, "aria-label": "Navegación" });
    main = h("main", { class: "main", id: "contenido", tabindex: "-1" });
    pager = h("nav", { class: "pager", "aria-label": "Navegación entre pantallas", hidden: true });
    var layout = h("div", { class: "layout" }, drawer, main);
    document.body.appendChild(skip);
    document.body.appendChild(top);
    if (CFG.banner) document.body.appendChild(h("div", { class: "banner" }, CFG.banner));
    document.body.appendChild(layout);
    document.body.appendChild(pager);
    document.body.appendChild(h("div", { id: "live-polite", class: "sr-only", "aria-live": "polite" }));
    document.body.appendChild(h("div", { id: "live-assert", class: "sr-only", "aria-live": "assertive" }));
    if (window.innerWidth >= 1100) openDrawer();
    store.on(function (s, msg) { savePill.setAttribute("data-state", s); savePill.title = msg; savePill.lastChild.textContent = msg; });
    store.setStatus(store.status, store.statusMsg);
    window.addEventListener("resize", u.debounce(function () { if (window.innerWidth >= 1100 && drawer.hidden) openDrawer(); }, 200));
  }

  function start() {
    applyPrefs();
    var C = IATU.data.curso;
    if (!C) { document.body.textContent = "No se pudieron cargar los datos del curso."; return; }
    store.init(SCO_LOCK || "orientacion", C.scos);
    buildShell();
    window.addEventListener("hashchange", route);
    route();
  }
  IATU.app = app;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
