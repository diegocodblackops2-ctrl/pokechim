/* Curso 5 — aplicación: rutas, navegación, pantallas, módulo, cierre, portada, orientación, biblioteca y ajustes.
   Un solo SCO: todo el programa (orientación, 16 módulos y evaluación) vive en un documento y en un registro del LMS.
   Sin LMS, el mismo documento funciona como vista previa con guardado local rotulado. */
(function () {
  "use strict";
  var IATU = window.IATU = window.IATU || {};
  var u = IATU.u, h = u.h, icon = u.icon, store = IATU.store, I = IATU.inter, M = IATU.media, P = IATU.practica, fx = IATU.fx;
  var CFG = window.IATU_CONFIG || {};
  var BASE = CFG.base || "";
  IATU.data = window.IATU_DATA || (window.IATU_DATA = {});

  var SCO_LOCK = null;                         // compatibilidad: el paquete es de un solo SCO
  var PREVIEW = true;                          // siempre se muestra el programa completo
  var app = {};
  var main, drawer, pager, topbarMeter, savePill, courseLine, pctChip, timeChip;

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

  /* ---------- Avance global del programa (un solo SCO) ---------- */
  function learningScos() { return IATU.data.curso.scos.filter(function (s) { return s !== "evaluacion"; }); }
  function cacheProg(sco, p) { var r = store.root; r.prog = r.prog || {}; r.prog[sco] = { d: p.done, t: p.total, c: p.complete ? 1 : 0 }; }
  /* Avance de una sección aunque su módulo aún no esté cargado (se usa el último cálculo guardado). */
  function secProg(sco) {
    if (sco === "orientacion" || IATU.data[sco]) { var p = progressOf(sco); if (p.total) cacheProg(sco, p); return p; }
    var c = store.root.prog && store.root.prog[sco], mod = IATU.data.curso.modules[parseInt(sco.slice(1), 10) - 1];
    var t = (c && c.t) || mod.required_count, d = c ? c.d : 0;
    return { done: d, total: t, pct: t ? d / t : 0, complete: !!(c && c.c), started: !!store.peek(sco) };
  }
  function courseProg() {
    var d = 0, t = 0, n = 0, k = 0;
    learningScos().forEach(function (s) { var p = secProg(s); d += p.done; t += p.total; if (p.complete) n++; k++; });
    return { done: d, total: t, pct: t ? d / t : 0, secs: n, nsecs: k, complete: n === k };
  }
  function examStatus() { return IATU.evaluacion && IATU.evaluacion.status ? IATU.evaluacion.status() : { sent: false }; }
  app.courseProg = courseProg; app.secProg = secProg;
  function updateTopbar() {
    var cp = courseProg(), pct = Math.round(cp.pct * 100);
    if (courseLine) { courseLine.firstChild.style.width = pct + "%"; courseLine.setAttribute("aria-label", "Avance del programa: " + pct + " %"); }
    if (pctChip) { pctChip.lastChild.textContent = pct + " %"; pctChip.title = cp.secs + " de " + cp.nsecs + " secciones completas"; }
    if (timeChip) timeChip.lastChild.textContent = fx.fmtTime(store.totalTime());
  }
  app.updateTopbar = updateTopbar;
  app.refreshProgress = function () {
    var sco = store.sco;
    if (sco && sco !== "evaluacion") {
      var p = progressOf(sco);
      cacheProg(sco, p);
      store.section("obj-" + sco, p.complete, p.pct);
      var cel = store.root.cel || (store.root.cel = {});
      if (p.complete && !cel[sco]) {
        cel[sco] = 1;
        store.save(true);
        fx.celebrate(sco === "orientacion" ? "00" : sco.slice(1), sco === "orientacion" ? "Orientación completa" : "Módulo " + parseInt(sco.slice(1), 10) + " completo",
          "Se encendió un nodo más de tu red del programa.");
        u.announce(sco === "orientacion" ? "Orientación completa." : "Módulo completo: requisitos obligatorios revisados.");
      }
      if (IATU.service.configured()) reportProgress(sco, p);
    }
    var cp = courseProg(), ex = examStatus();
    updateTopbar();
    // «completed» solo con las 17 secciones completas, el examen y el proyecto entregados. La evaluación arma el registro
    // completo (estado, aprobado y nota) para que ninguna llamada pise el passed/failed (SCORM 1.2 usa un solo campo).
    store.adapter.setCompletion(IATU.evaluacion && IATU.evaluacion.lms ? IATU.evaluacion.lms() : { completed: cp.complete && !!ex.done, progress: Math.min(1, cp.pct * .9) });
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
    decorate(stage);
    renderPager(sco, raw);
    renderDrawer();
    if (sco) app.refreshProgress();
    window.scrollTo(0, 0);
    var h1 = stage.querySelector("h1");
    if (h1) { h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); document.title = h1.textContent + " · IA para trabajar mejor"; }
    if (window.innerWidth < 1100) closeDrawer();
  }

  /* Aparición progresiva al hacer scroll: bloques de primer nivel y párrafos de lectura. */
  function decorate(stage) {
    Array.prototype.forEach.call(stage.children, function (el, i) {
      if (i < 2 || /lab-hero|mod-hero|lesson-head|crumbs|activity|settings/.test(el.className) || el.tagName === "H1") return;
      el.classList.add("rv");
    });
    u.$$(".prose > p, .prose > ul, .prose > ol, .mod-grid > *, .ladder > *, .badges > *", stage).forEach(function (el) { el.classList.add("rv"); });
    var firstP = stage.classList.contains("lesson-page") ? stage.querySelector(":scope > .prose > p") : null;
    if (firstP && firstP.textContent.length > 120) firstP.classList.add("lead-in");
    fx.reveal(stage);
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
    var cp = courseProg(), ex = examStatus();
    drawer.appendChild(h("div", { class: "drawer-sum" },
      h("div", { class: "row" }, h("span", null, "Tu avance en el programa"), h("b", null, Math.round(cp.pct * 100) + " %")),
      h("div", { class: "bar", role: "img", "aria-label": "Avance " + Math.round(cp.pct * 100) + " %" }, h("i", { style: { width: Math.round(cp.pct * 100) + "%" } })),
      h("div", { class: "row" }, h("span", null, cp.secs + " de " + cp.nsecs + " secciones"), h("span", null, icon("reloj"), " ", fx.fmtTime(store.totalTime())))));
    drawer.appendChild(h("nav", { "aria-label": "Mapa del curso" }, (function () {
      var frag = document.createDocumentFragment();
      frag.appendChild(h("ul", { class: "nav-list" }, h("li", null, h("a", { href: "#/", "aria-current": cur === "" ? "page" : null }, icon("inicio"), "Portada del programa"))));
      C.scos.forEach(function (sco) {
        var title = sco === "orientacion" ? "Orientación" : sco === "evaluacion" ? "Evaluación y proyecto" : "Módulo " + parseInt(sco.slice(1), 10) + " · " + C.modules[parseInt(sco.slice(1), 10) - 1].title;
        var active = scoOfRoute(R.parts) === sco;
        var prog = sco !== "evaluacion" ? secProg(sco) : null;
        var mark = sco === "evaluacion"
          ? (cp.complete ? (ex.done ? h("span", { class: "ring full", role: "img", "aria-label": "entregada" }) : null) : h("span", { class: "nav-lock" }, icon("candado", "bloqueada hasta completar las 17 secciones")))
          : h("span", { class: "ring" + (prog.complete ? " full" : ""), style: "--v:" + prog.pct.toFixed(3), role: "img", "aria-label": prog.complete ? "completo" : Math.round(prog.pct * 100) + " %" });
        var det = h("details", { class: "navmod", open: active });
        det.appendChild(h("summary", { class: "nav-list" }, h("span", { class: "navbtn", style: { display: "flex", gap: ".5rem", alignItems: "center", padding: ".45rem .5rem", fontWeight: active ? 700 : 500 } },
          h("span", { class: "num" }, sco === "orientacion" ? "00" : sco === "evaluacion" ? "EV" : sco.slice(1)), h("span", null, title), mark)));
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
        } else {
          det.appendChild(h("ul", { class: "nav-sub" }, h("li", null, h("a", { href: "#/" + firstRoute(sco) }, "Abrir"))));
        }
        frag.appendChild(det);
      });
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

  /* ---------- Imágenes por sección ---------- */
  function imagesFor(prefix) {
    var C = IATU.data.curso, out = [];
    for (var id in C.images) { var im = C.images[id]; if (im.file && im.screen && im.screen.indexOf(prefix) === 0) out.push(im); }
    return out.sort(function (x, y) { return x.screen < y.screen ? -1 : 1; });
  }
  function secImage(sco) {
    var C = IATU.data.curso;
    if (sco === "orientacion") return C.images["IATU-IMG024"];
    if (sco === "evaluacion") return C.images["IATU-IMG060"];
    // Portada de sección: se prefiere una imagen con personas trabajando.
    var l = imagesFor("IATU-" + sco.toUpperCase());
    return l.filter(function (x) { return x.people; })[0] || l[0] || C.images["IATU-IMG001"];
  }
  function imgEl(im, cls, sizes) {
    if (!im || !im.file) return null;
    return h("img", { class: cls || null, src: BASE + im.file, alt: "", loading: "lazy", decoding: "async",
      srcset: im.sm ? BASE + im.sm + " 720w, " + BASE + im.file + " 1440w" : null, sizes: sizes || "(max-width: 760px) 100vw, 420px" });
  }
  app.secImage = secImage; app.imgEl = imgEl; app.imagesFor = imagesFor;

  function secTitle(sco) {
    var C = IATU.data.curso;
    return sco === "orientacion" ? "Orientación" : sco === "evaluacion" ? "Evaluación y proyecto" : "Módulo " + parseInt(sco.slice(1), 10) + " · " + C.modules[parseInt(sco.slice(1), 10) - 1].title;
  }
  function resumeTarget() {
    var loc = store.location();
    if (!loc) return null;
    var sco = scoOfRoute(loc.split("/"));
    return sco ? { r: loc, sco: sco } : null;
  }

  /* ---------- Portada ---------- */
  function renderHome(mnt) {
    var C = IATU.data.curso, pub = C.publication;
    mnt.classList.add("stage-wide");
    var cp = courseProg(), ex = examStatus(), res = resumeTarget();
    var hereSco = res ? res.sco : learningScos().filter(function (s) { return !secProg(s).complete; })[0] || "evaluacion";

    // 1. Héroe: red del programa que se enciende con tu avance real
    var nodes = C.scos.map(function (sco) {
      var p = sco === "evaluacion" ? null : secProg(sco);
      var st = sco === "evaluacion" ? (cp.complete ? (ex.done ? "done" : "here") : "lock") : p.complete ? "done" : sco === hereSco ? "here" : "todo";
      return { label: secTitle(sco), short: sco === "orientacion" ? "00" : sco === "evaluacion" ? "EV" : sco.slice(1), state: st, href: st === "lock" ? null : "#/" + firstRoute(sco) };
    });
    var canvas = h("canvas", { class: "neural", "aria-hidden": "true" });
    var title = h("h1", null, h("span", { class: "t1" }), " ", h("span", { class: "grad-text" }, "mejor"));
    fx.words(title.querySelector(".t1"), "IA para trabajar");
    var typed = h("p", { class: "typed" });
    var started = cp.done > 0 || !!res;
    var primary = h("a", { class: "btn btn-primary", href: "#/" + (res ? res.r : "orientacion/bienvenida") }, icon(started ? "jugar" : "cohete"), started ? "Continuar donde quedé" : "Empezar el laboratorio");
    var meta = h("div", { class: "hero-meta" });
    [[16, "", "módulos"], [64, "", "lecciones"], [32, "", "talleres con producto"], [3, "", "casos con decisiones"]].forEach(function (m) {
      var b = h("b", null, "0"); meta.appendChild(h("div", null, b, h("span", null, m[2]))); setTimeout(function () { fx.count(b, m[0], m[1]); }, 500);
    });
    var hero = h("section", { class: "lab-hero", "aria-labelledby": "hero-t" },
      h("div", { class: "hero-photo", "aria-hidden": "true" }, imgEl(C.images["IATU-IMG001"], null, "60vw")),
      canvas,
      h("div", { class: "lab-hero-in" },
        h("span", { class: "eyebrow" }, h("span", { class: "live" }), "Curso 5 · Laboratorio de criterio"),
        title, typed,
        h("div", { class: "hero-cta" }, primary, h("a", { class: "btn btn-glass", href: "#programa" }, icon("mapa"), "Ver el programa")),
        meta),
      h("div", { class: "hero-legend", "aria-hidden": "true" },
        h("span", null, h("i", { style: { background: "#f0abfc" } }), "completado"), h("span", null, h("i", { style: { background: "#fcd34d" } }), "estás aquí"), h("span", null, h("i", { style: { background: "#5b4a8f" } }), "por recorrer")));
    title.id = "hero-t";
    mnt.appendChild(hero);
    fx.type(typed, pub.subtitle, 14);
    setTimeout(function () { fx.neural(canvas, nodes); }, 60);
    var progressTxt = "Tu red del programa: " + cp.secs + " de " + cp.nsecs + " secciones completas" + (cp.complete ? "; la evaluación está disponible." : "; la evaluación se habilita al completar todas.");
    mnt.appendChild(h("p", { class: "sr-only" }, progressTxt));

    // 2. Cinta con términos del glosario del curso
    var terms = glossary().map(function (g) { return g[0]; });
    if (terms.length) {
      var track = h("div", { class: "ticker-track", "aria-hidden": "true" });
      terms.concat(terms).forEach(function (t) { track.appendChild(h("span", null, t)); });
      mnt.appendChild(h("div", { class: "ticker" }, track));
    }

    if (!store.isLMS()) mnt.appendChild(h("div", { class: "callout warn" }, h("p", null, h("b", null, "Vista previa. "), "Tu avance se guarda solo en este navegador. En Dibork Learning el mismo curso guarda tu avance, tu tiempo, la nota y el resultado en el LMS.")));

    // 3. Continuar
    if (res) {
      var rt = secTitle(res.sco);
      mnt.appendChild(h("a", { class: "resume", href: "#/" + res.r },
        imgEl(secImage(res.sco), null, "220px"),
        h("div", null, h("small", null, "Continúa donde quedaste"), h("h3", null, rt), h("p", null, "Llevas " + fx.fmtTime(store.totalTime()) + " de trabajo activo y " + Math.round(cp.pct * 100) + " % de los requisitos del programa.")),
        h("span", { class: "go", "aria-hidden": "true" }, icon("siguiente"))));
    }

    // 4. Tu avance e insignias
    mnt.appendChild(h("div", { class: "sec-head" }, h("div", null, h("span", { class: "sec-kick" }, "Tu laboratorio"), h("h2", null, "Tu avance, a la vista"),
      h("p", null, "Cada sección completa enciende un nodo y una insignia. La evaluación final se abre cuando las 17 están listas."))));
    var tiles = h("div", { class: "stats" },
      [[fx.fmtTime(store.totalTime()), "de trabajo activo"], [Math.round(cp.pct * 100) + " %", "de requisitos cumplidos"], [cp.secs + "/" + cp.nsecs, "secciones completas"], [ex.pass ? "Aprobada" : ex.done ? "Entregada" : cp.complete ? "Disponible" : "Bloqueada", "evaluación final"]]
        .map(function (x) { return h("div", { class: "stat" }, h("b", null, x[0]), h("span", null, x[1])); }));
    mnt.appendChild(tiles);
    var badges = h("div", { class: "badges", role: "list", "aria-label": "Insignias del recorrido" });
    C.scos.forEach(function (sco) {
      var on = sco === "evaluacion" ? !!ex.done : secProg(sco).complete;
      badges.appendChild(h("div", { class: "badge" + (on ? " on" : ""), role: "listitem" }, h("i", { "aria-hidden": "true" }, h("span", null, sco === "orientacion" ? "00" : sco === "evaluacion" ? "EV" : sco.slice(1))),
        h("span", null, (sco === "orientacion" ? "Orientación" : sco === "evaluacion" ? "Evaluación" : "Módulo " + parseInt(sco.slice(1), 10)) + (on ? " · lograda" : ""))));
    });
    mnt.appendChild(badges);

    // 5. Escalera de niveles de uso (interactiva)
    mnt.appendChild(h("div", { class: "sec-head" }, h("div", null, h("span", { class: "sec-kick" }, "El mapa del programa"), h("h2", null, "Cuatro niveles de uso, una sola pregunta: ¿quién controla el resultado?"),
      h("p", null, "Toca cada nivel. Es un mapa editorial de trabajo, no una escala científica ni un ranking de personas."))));
    var lv = [["Consultar", "Pedir una explicación o un primer apoyo."], ["Colaborar", "Iterar con objetivo, contexto y revisión."], ["Sistematizar", "Procedimiento reutilizable con fuentes, criterios y pruebas."], ["Automatizar con supervisión", "Ejecutar partes con límites, permisos y respuesta ante fallos."]];
    var ladder = h("div", { class: "ladder", role: "group", "aria-label": "Niveles de uso" });
    lv.forEach(function (l, i) {
      var b = h("button", { type: "button", "aria-pressed": i === 0 ? "true" : "false", style: "--h:" + (25 * (i + 1)) },
        h("span", { class: "lv", "aria-hidden": "true" }, "0" + (i + 1)), h("b", null, l[0]), h("span", { class: "d" }, l[1]));
      b.addEventListener("click", function () { u.$$("button", ladder).forEach(function (x) { x.setAttribute("aria-pressed", "false"); }); b.setAttribute("aria-pressed", "true"); });
      ladder.appendChild(b);
    });
    mnt.appendChild(ladder);

    // 6. Programa
    mnt.appendChild(h("div", { class: "sec-head", id: "programa", tabindex: "-1" }, h("div", null, h("span", { class: "sec-kick" }, "Programa"), h("h2", null, "18 paradas, 60 horas de trabajo activo"),
      h("p", null, pub.short))));
    var routes = [[1, 6, "Ruta esencial"], [7, 12, "Aplicación profesional"], [13, 16, "Profundización"]];
    var grid = h("div", { class: "mod-grid" });
    grid.appendChild(mcard({ n: "00", title: "Orientación y diagnóstico", obj: "Condiciones, rutas, 16 situaciones sin nota y tu tarea inicial.", time: "60 min", href: "#/orientacion/bienvenida", prog: secProg("orientacion"), band: "Inicio", img: secImage("orientacion") }));
    C.modules.forEach(function (m) {
      var band = routes.filter(function (r) { return m.number >= r[0] && m.number <= r[1]; })[0][2];
      grid.appendChild(mcard({ n: ("0" + m.number).slice(-2), title: m.title, obj: m.objective, time: (m.minutes / 60) + " h", href: "#/" + m.sco + "/intro", prog: secProg(m.sco), band: band, img: secImage(m.sco) }));
    });
    grid.appendChild(mcard({ n: "EV", title: "Evaluación, proyecto y transferencia", obj: "Situaciones aplicadas y proyecto con corrección automática al entregar, y transferencia a tu trabajo.", time: "11 h", href: "#/evaluacion/requisitos", prog: null, band: cp.complete ? "Disponible" : "Bloqueada", img: secImage("evaluacion"), locked: !cp.complete, sent: ex.done }));
    mnt.appendChild(grid);
    u.$$(".mcard", grid).forEach(fx.tilt);

    // 7. Qué vas a lograr
    mnt.appendChild(h("div", { class: "sec-head" }, h("div", null, h("span", { class: "sec-kick" }, "Al terminar"), h("h2", null, "Qué vas a lograr"))));
    mnt.appendChild(h("ol", { class: "reading" }, pub.outcomes.map(function (o) { return h("li", null, o); })));
    mnt.appendChild(h("div", { class: "callout info reading" }, h("h3", null, "Lo que este programa no promete"), h("p", null, pub.not_promised)));
    mnt.appendChild(h("p", { class: "note reading" }, h("b", null, "Requisitos: "), pub.requirements, " ", pub.duration));
  }
  function mcard(o) {
    var p = o.prog, pct = p && p.total ? Math.round(p.pct * 100) : 0;
    var state = o.locked ? h("span", null, icon("candado"), " Se abre al completar las 17 secciones")
      : o.sent ? h("span", { class: "badge-done" }, icon("medalla"), " Entregada")
      : p && p.complete ? h("span", { class: "badge-done" }, icon("medalla"), " Completo")
      : p && (p.done || p.started) ? h("span", null, "En curso") : h("span", null, "Por empezar");
    return h("a", { class: "mcard" + (o.locked ? " locked" : "") + (p && p.complete ? " done" : ""), href: o.href, "aria-label": (o.n === "EV" ? "" : "Sección " + o.n + ": ") + o.title + (o.locked ? " (bloqueada)" : p ? ", avance " + pct + " %" : "") },
      h("div", { class: "ph" }, o.img ? imgEl(o.img) : null, h("span", { class: "num", "aria-hidden": "true" }, o.n), h("span", { class: "band" }, o.band)),
      h("div", { class: "body" }, h("h3", null, o.title), h("p", { class: "obj" }, o.obj),
        h("div", { class: "foot" }, icon("reloj"), h("span", null, o.time), h("span", null, "·"), state,
          p ? h("span", { class: "ringbig", style: "--v:" + (pct / 100).toFixed(3), "aria-hidden": "true" }, h("span", null, pct + "%")) : null)),
      h("span", { class: "glare", "aria-hidden": "true" }));
  }
  function progressOfPeek(sco) { return secProg(sco); }

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
    if (rest[0] === "taller") { mnt.appendChild(crumbs); mnt.appendChild(journey(m, rest[1])); var w = m.workshops.filter(function (x) { return x.id === rest[1]; })[0]; return w ? P.workshop(w, mnt) : null; }
    if (rest[0] === "caso") { mnt.appendChild(crumbs); mnt.appendChild(journey(m, rest[1])); var c = m.cases.filter(function (x) { return x.id === rest[1]; })[0]; return c ? P.branchCase(c, mnt) : null; }
    var sid = rest[0], screen = null, lesson = null, idx = 0;
    m.lessons.forEach(function (l) { l.screens.forEach(function (s, i) { if (s.id === sid) { screen = s; lesson = l; idx = i; } }); });
    if (!screen) { mnt.appendChild(h("p", null, "Pantalla no encontrada.")); return; }
    mnt.classList.add("lesson-page");
    mnt.appendChild(crumbs);
    // La imagen propia de la pantalla va en la cabecera (con su texto alternativo); si no tiene, se usa una de la lección o del módulo como fondo decorativo.
    var stripImg = null, ownImg = false;
    (screen.image_ids || []).some(function (id) { var im = IATU.data.curso.images[id]; if (im && im.file) { stripImg = im; ownImg = true; return true; } return false; });
    if (!stripImg) lesson.screens.reduce(function (acc, x) { return acc.concat(x.image_ids || []); }, []).some(function (id) { var im = IATU.data.curso.images[id]; if (im && im.file) { stripImg = im; return true; } return false; });
    if (!stripImg) stripImg = secImage(sco);
    var steps = h("div", { class: "steps4", role: "list", "aria-label": "Pantallas de la lección" }, lesson.screens.map(function (x, k) {
      var dn = x.kind === "lesson" ? !!store.get("s", x.id) : itemDone("practice", x.activity ? x.activity.id : x.id);
      return h("a", { role: "listitem", href: "#/" + sco + "/" + x.id, class: (dn ? "done" : "") + (k === idx ? " here" : ""), "aria-label": "Pantalla " + (k + 1) + ": " + x.title + (dn ? " (completa)" : ""), "aria-current": k === idx ? "step" : null });
    }));
    mnt.appendChild(h("header", { class: "lesson-head" + (stripImg ? "" : " noimg") },
      stripImg ? h("div", { class: "strip" + (ownImg ? " own" : ""), "aria-hidden": ownImg && stripImg.alt ? null : "true" }, (function () { var im = imgEl(stripImg, null, "(max-width: 900px) 100vw, 980px"); if (ownImg && stripImg.alt) im.setAttribute("alt", stripImg.alt); return im; })()) : null,
      h("div", { class: "in" },
        h("span", { class: "eyebrow", style: { background: "var(--grad-soft)", color: "var(--violet)", borderColor: "var(--rule)" } }, "Lección " + lesson.number + " · " + (idx + 1) + " de 4 · " + screen.title),
        h("h1", null, lesson.title),
        steps,
        h("div", { class: "steps-label" }, h("span", null, lesson.minutes + " min la lección"),
          h("span", null, screen.mandatory ? "Práctica obligatoria" : screen.kind === "lesson" ? (store.get("s", screen.id) ? "Revisada" : "Por revisar") : "")))));
    var ap = M.audioPlayer(screen.audio_id);
    if (ap) mnt.appendChild(ap);
    if (screen.kind === "decision") {
      if (screen.activity) I.activity(screen.activity, mnt);
      else I.decision(screen, mnt);
      return;
    }
    // (la imagen de la pantalla ya está en la cabecera)
    if (/resolución/i.test(screen.title)) {
      mnt.appendChild(predictFirst(screen));
    } else if (/procedimiento/i.test(screen.title)) {
      mnt.appendChild(stepper(screen));
    } else mnt.appendChild(glossify(u.paragraphs(screen.text, "prose")));
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

  /* Línea de recorrido del módulo: lecciones, talleres, caso y cierre, con el avance real. */
  function journey(m, curKey) {
    var reqs = requirements(m.sco), done = {};
    reqs.forEach(function (q) { done[q.id] = q.done; });
    var stops = [];
    m.lessons.forEach(function (l) {
      var ids = l.screens.map(function (x) { return x.id; });
      var lreq = reqs.filter(function (q) { return ids.indexOf(q.id) >= 0; });
      stops.push({ key: "L" + l.number, label: "Lección " + l.number, sub: l.minutes + " min", ic: "fuente", r: m.sco + "/" + l.screens[0].id, done: lreq.length > 0 && lreq.every(function (q) { return q.done; }) });
    });
    m.workshops.forEach(function (w) { stops.push({ key: w.id, label: /T1$/.test(w.id) ? "Taller guiado" : "Taller de transferencia", sub: w.minutes + " min", ic: "archivo", r: m.sco + "/taller/" + w.id, done: !!done[w.id] }); });
    m.cases.forEach(function (c) { stops.push({ key: c.id, label: "Caso", sub: c.minutes + " min", ic: "ramas", r: m.sco + "/caso/" + c.id, done: !!done[c.id] }); });
    var p = progressOf(m.sco);
    stops.push({ key: "cierre", label: "Cierre", sub: p.done + "/" + p.total, ic: "bandera", r: m.sco + "/cierre", done: p.complete });
    var here = curKey ? stops.filter(function (x) { return x.key === curKey; })[0] : stops.filter(function (x) { return !x.done; })[0];
    var nd = stops.filter(function (x) { return x.done; }).length;
    var fill = h("span", { class: "fill", "aria-hidden": "true" });
    var nav = h("nav", { class: "journey", "aria-label": "Recorrido del módulo: " + nd + " de " + stops.length + " paradas completas" }, fill,
      stops.map(function (x) {
        return h("a", { href: "#/" + x.r, class: (x.done ? "done" : "") + (x === here ? " here" : ""), "aria-current": x === here && curKey ? "step" : null },
          h("span", { class: "dot" }, icon(x.done ? "check" : x.ic)), h("b", null, x.label), h("small", null, x.done ? "listo" : x.sub));
      }));
    var k = Math.max(0, stops.indexOf(here) >= 0 ? stops.indexOf(here) : nd);
    setTimeout(function () { var dots = nav.querySelectorAll(".dot"); if (dots.length > 1) { var a = dots[0].getBoundingClientRect(), b = dots[Math.min(k, dots.length - 1)].getBoundingClientRect(); fill.style.width = Math.max(0, b.left - a.left) + "px"; } }, 120);
    return nav;
  }
  app.journey = journey;

  /* Carrusel de lo que cada lección permite hacer (objetivos de lección del maestro). */
  function keyIdeas(items, label) {
    if (!items.length) return null;
    var i = 0, txt = h("p", { class: "ki-text", "aria-live": "polite" }, items[0]);
    var nav = h("div", { class: "ki-nav" });
    var timer = null;
    function go(k) { i = k; txt.textContent = items[k]; u.$$("button", nav).forEach(function (b, j) { b.setAttribute("aria-current", String(j === k)); }); }
    items.forEach(function (_, k) { var b = h("button", { type: "button", "aria-label": "Idea " + (k + 1) + " de " + items.length, "aria-current": String(k === 0) }); b.addEventListener("click", function () { clearInterval(timer); go(k); }); nav.appendChild(b); });
    var box = h("section", { class: "keyidea", "aria-label": label }, h("span", { class: "ki-label" }, label), txt, nav);
    if (!fx.reduced()) timer = setInterval(function () { if (!box.isConnected) return clearInterval(timer); go((i + 1) % items.length); }, 6500);
    return box;
  }

  /* ---------- Interacciones de lectura derivadas del contenido ---------- */
  /* Resolución comentada: primero tu predicción (opcional), luego la resolución para contrastar. */
  function predictFirst(screen) {
    var rec = store.get("o", "pred-" + screen.id) || {};
    var res = h("section", { class: "resolution", "aria-label": "Resolución comentada", hidden: !rec.shown },
      h("span", { class: "ref-label" }, "Resolución comentada"), glossify(u.paragraphs(screen.text, "prose")));
    var id = u.newId("pred"), ta = h("textarea", { id: id, rows: 3, placeholder: "Por ejemplo: qué dato revisaría primero y qué no prometería." }, rec.t || "");
    ta.addEventListener("input", function () { store.put("o", "pred-" + screen.id, { t: ta.value }); });
    var show = h("button", { class: "btn btn-primary", type: "button" }, icon("ver"), "Ver la resolución");
    var skip = h("button", { class: "btn btn-ghost", type: "button" }, "Ver sin predecir");
    function reveal() { res.hidden = false; box.classList.add("revealed"); store.put("o", "pred-" + screen.id, { t: ta.value, shown: 1 }); u.announce("Resolución visible."); res.scrollIntoView({ behavior: fx.reduced() ? "auto" : "smooth", block: "start" }); }
    show.addEventListener("click", reveal); skip.addEventListener("click", reveal);
    var box = h("section", { class: "predict" + (rec.shown ? " revealed" : ""), "aria-label": "Predice antes de ver" },
      h("div", { class: "predict-q" }, h("span", { class: "sec-kick" }, icon("chispa"), " Predice primero"),
        h("label", { class: "fl", for: id }, "Antes de leer la resolución: ¿qué harías tú con este caso?"), ta,
        h("div", { class: "btn-row" }, show, skip)),
      res);
    return box;
  }
  /* Procedimiento: un paso a la vez, con avance visible (se puede mostrar todo de una vez). */
  function stepper(screen) {
    var paras = String(screen.text || "").split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    var rec = store.get("o", "steps-" + screen.id) || {}, shown = Math.max(1, Math.min(paras.length, rec.n || 1));
    var list = h("ol", { class: "steps" }), bar = h("i"), count = h("span");
    var next = h("button", { class: "btn btn-primary", type: "button" }, "Siguiente paso", icon("siguiente"));
    var all = h("button", { class: "btn btn-ghost", type: "button" }, "Ver todo el procedimiento");
    paras.forEach(function (t, i) { list.appendChild(h("li", { class: "step", hidden: i >= shown }, h("span", { class: "n", "aria-hidden": "true" }, String(i + 1)), glossify(u.paragraphs(t, "prose")))); });
    function upd(focus) {
      u.$$("li", list).forEach(function (li, i) { var was = li.hidden; li.hidden = i >= shown; if (was && !li.hidden) { li.classList.add("enter"); if (focus) li.setAttribute("tabindex", "-1"), li.focus(); } });
      bar.style.width = Math.round(100 * shown / paras.length) + "%"; count.textContent = "Paso " + shown + " de " + paras.length;
      next.hidden = all.hidden = shown >= paras.length;
      store.put("o", "steps-" + screen.id, { n: shown });
    }
    next.addEventListener("click", function () { shown++; upd(true); });
    all.addEventListener("click", function () { shown = paras.length; upd(false); });
    var box = h("section", { class: "procedure stepper", "aria-label": "Procedimiento paso a paso" },
      h("div", { class: "step-head" }, h("span", { class: "sec-kick" }, icon("ruta"), " Procedimiento"), count),
      h("div", { class: "step-bar", "aria-hidden": "true" }, bar), list, h("div", { class: "btn-row" }, next, all));
    upd(false);
    return box;
  }
  function glossary() { return (IATU.data.curso.glossary || []).map(function (g) { return Array.isArray(g) ? g : [g.term, g.definition]; }).filter(function (g) { return g[0] && g[1]; }); }
  /* Glosario vivo: marca la primera aparición de cada término del glosario y muestra su definición al tocarlo. */
  function glossify(root) {
    var G = glossary().slice().sort(function (a, b) { return b[0].length - a[0].length; });
    if (!G.length) return root;
    var used = {};
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (tn) {
      if (tn.parentNode.closest && tn.parentNode.closest(".src, .gterm, a, button")) return;
      G.some(function (g) {
        if (used[g[0]]) return false;
        var re = new RegExp("(^|[^\\wáéíóúñÁÉÍÓÚÑ])(" + g[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")(?![\\wáéíóúñÁÉÍÓÚÑ])", "i");
        var m = re.exec(tn.nodeValue);
        if (!m) return false;
        used[g[0]] = 1;
        var start = m.index + m[1].length, after = tn.splitText(start), rest = after.splitText(m[2].length);
        var tipId = u.newId("gl");
        var btn = h("button", { type: "button", class: "gterm", "aria-expanded": "false", "aria-controls": tipId }, after.nodeValue);
        var tip = h("span", { class: "gtip", id: tipId, role: "note", hidden: true }, h("b", null, g[0] + ": "), g[1]);
        btn.addEventListener("click", function () { var open = tip.hidden; u.$$(".gtip").forEach(function (x) { x.hidden = true; }); u.$$(".gterm").forEach(function (x) { x.setAttribute("aria-expanded", "false"); }); tip.hidden = !open; btn.setAttribute("aria-expanded", String(open)); });
        btn.addEventListener("keydown", function (ev) { if (ev.key === "Escape") { tip.hidden = true; btn.setAttribute("aria-expanded", "false"); } });
        var wrap = h("span", { class: "gwrap" }, btn, tip);
        after.parentNode.replaceChild(wrap, after);
        tn = rest;
        return true;
      });
    });
    return root;
  }
  app.glossify = glossify;

  function renderIntro(mnt, m) {
    var im = secImage(m.sco);
    mnt.appendChild(h("header", { class: "mod-hero" },
      im ? h("img", { class: "bg", src: BASE + im.file, alt: "", srcset: im.sm ? BASE + im.sm + " 720w, " + BASE + im.file + " 1440w" : null, sizes: "(max-width: 900px) 100vw, 1000px" }) : null,
      h("div", { class: "mod-hero-in" }, h("span", { class: "bignum", "aria-hidden": "true" }, ("0" + m.number).slice(-2)),
        h("div", null, h("span", { class: "eyebrow" }, h("span", { class: "live" }), "Módulo " + m.number + " de 16 · " + (m.minutes / 60) + " h"),
          h("h1", null, m.title), h("p", null, m.objective)))));
    mnt.appendChild(journey(m));
    mnt.appendChild(M.audioPlayer(m.intro_audio, { label: "Introducción" }));
    mnt.appendChild(h("p", { class: "lead reading" }, m.introduction));
    mnt.appendChild(keyIdeas(m.lessons.map(function (l) { return "Lección " + l.number + " · " + l.objective; }), "Lo que vas a poder hacer"));
    var tc = m.time_components;
    mnt.appendChild(h("div", { class: "stats" },
      [[tc.lecciones_y_micropractica + " min", "4 lecciones y prácticas"], [tc.taller_guiado + " min", "taller guiado"], [tc.taller_independiente + " min", "taller de transferencia"], [tc.revision_y_reintento + " min", "revisión y reintento" + (m.cases.length ? " (incluye el caso)" : "")]]
        .map(function (x) { return h("div", { class: "stat" }, h("b", null, x[0]), h("span", null, x[1])); })));
    var p = progressOf(m.sco), next = requirements(m.sco).filter(function (q) { return !q.done; })[0];
    mnt.appendChild(h("div", { class: "btn-row" },
      h("a", { class: "btn btn-primary", href: "#/" + (p.done && next ? next.r : m.sco + "/" + m.lessons[0].screens[0].id) }, icon(p.done ? "jugar" : "cohete"), p.complete ? "Repasar el módulo" : p.done ? "Seguir con lo pendiente" : "Comenzar la lección 1"),
      h("a", { class: "btn", href: "#/" + m.sco + "/cierre" }, icon("lista"), "Ver requisitos")));
  }

  function renderClosure(mnt, m) {
    mnt.appendChild(h("div", { class: "crumbs" }, "Módulo " + m.number + " · cierre"));
    mnt.appendChild(journey(m, "cierre"));
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
        glossary().forEach(function (g) { if (!s || (g[0] + g[1]).toLowerCase().indexOf(s) >= 0) { dl2.appendChild(h("dt", null, g[0])); dl2.appendChild(h("dd", null, g[1])); } });
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
      h("li", null, "Narración: voz sintética en español de Chile, generada por computador (no es una grabación humana). Uso sujeto a la licencia de la cuenta con que Dibork produce las pistas."),
      h("li", null, "Iconos: Lucide (licencia ISC). Tipografías: Sora y Manrope (SIL Open Font License 1.1, incluidas en app/fonts)."),
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
    courseLine = h("div", { class: "course-line", role: "img", "aria-label": "Avance del programa" }, h("i"));
    pctChip = h("span", { class: "chip pct" }, icon("red"), h("b", null, "0 %"));
    timeChip = h("span", { class: "chip time", title: "Tiempo activo en el curso (se cuenta solo con la pestaña visible y actividad reciente)" }, icon("cronometro"), h("span", { class: "t-long" }, "Llevas "), h("b", null, "0 min"));
    var brand = h("a", { class: "brand", href: PREVIEW ? "#/" : "#/" + firstRoute(SCO_LOCK) },
      h("span", { class: "brand-mark", html: '<svg viewBox="0 0 34 34" aria-hidden="true"><defs><linearGradient id="bm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#d946ef"/></linearGradient></defs><rect x="2" y="2" width="30" height="30" rx="9" fill="url(#bm)"/><circle cx="11" cy="12" r="2.6" fill="#fff"/><circle cx="23" cy="11" r="2.2" fill="#fff" opacity=".85"/><circle cx="17" cy="22" r="3" fill="#fff"/><circle cx="26" cy="23" r="1.8" fill="#fcd34d"/><path d="M11 12L17 22L23 11M17 22L26 23" stroke="#fff" stroke-width="1.4" opacity=".75" fill="none"/></svg>' }),
      h("span", { class: "brand-txt" }, h("b", null, "IA para trabajar mejor"), h("small", null, "Dibork Learning · Curso 5")));
    var top = h("header", { class: "topbar" }, drawerBtn, brand, h("span", { class: "spacer" }), timeChip, pctChip, savePill, M.musicButton(),
      h("a", { class: "btn btn-icon btn-ghost", href: "#/biblioteca", "aria-label": "Biblioteca" }, icon("biblioteca")), courseLine);
    drawer = h("aside", { class: "drawer", id: "drawer", hidden: true, "aria-label": "Navegación" });
    main = h("main", { class: "main", id: "contenido", tabindex: "-1" });
    pager = h("nav", { class: "pager", "aria-label": "Navegación entre pantallas", hidden: true });
    var layout = h("div", { class: "layout" }, drawer, main);
    document.body.appendChild(h("div", { class: "aurora", "aria-hidden": "true" }));
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
    store.init("orientacion", C.scos);
    buildShell();
    updateTopbar();
    fx.clock(store, function () { updateTopbar(); store.saveSoon(); });
    window.addEventListener("hashchange", route);
    // Un enlace a la misma ruta (por ejemplo «usar mi segundo intento» desde el resultado) vuelve a dibujar la pantalla.
    document.addEventListener("click", function (ev) {
      var a = ev.target.closest && ev.target.closest('a[href^="#/"]');
      if (a && a.getAttribute("href") === location.hash && !ev.defaultPrevented) { ev.preventDefault(); route(); }
    });
    route();
  }
  IATU.app = app;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
