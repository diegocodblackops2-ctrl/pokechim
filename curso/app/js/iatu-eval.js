/* Curso 5 — Evaluación dentro del SCORM (decisiones de Diego, 9-oct-2026), corregida 100 % automáticamente.
   - Se habilita solo cuando las 17 secciones (orientación y 16 módulos) cumplen sus requisitos.
   - Situaciones aplicadas: forma A y luego B; 3 (decisión) + 2 (evidencia) por situación; nota = 100 × puntos / 320.
   - Proyecto de desempeño: forma A y luego B; 9 etapas (clasificar, elegir, calcular, ordenar, encargos y textos).
     Por defecto lo califica un PROFESOR en el LMS (config.js › proyecto.correccion = "docente"): el curso envía la entrega
     (interacciones, cmi.comments_from_learner y postMessage) y recibe la evaluación (cmi.comments_from_lms o postMessage).
     Contrato: docs/INTEGRACION_PROYECTO_LMS.md. Con "automatica" se corrige con la pauta y la devolución es inmediata.
   - Global = 40 % situaciones (mejor intento) + 60 % proyecto (mejor intento). Aprueba con global ≥ 80, proyecto ≥ 75
     y sin fallos críticos pendientes (se subsanan corrigiendo el texto señalado). Todo configurable en config.js.
   - Informa al LMS: cmi.score (raw/scaled/min/max), success_status, completion_status e interacciones.
   - Banco y pauta viajan OFUSCADOS en data/eval.js: evita la lectura casual de claves, NO es seguridad. */
(function () {
  "use strict";
  var IATU = window.IATU = window.IATU || {};
  var u = IATU.u, h = u.h, icon = u.icon, store = IATU.store, M = IATU.media;
  var CFG = window.IATU_CONFIG || {};
  var cache = {};

  function sec() { return store.peek("evaluacion") || (store.root.secs.evaluacion = store.fresh("evaluacion")); }
  function X() { var st = sec(); st.x = st.x || {}; return st.x; }
  function hist() { return X().hist || []; }
  function maxIntentos() { var E = IATU.data.eval; return (CFG.evaluacion && CFG.evaluacion.intentos) || (E && E.intentos) || 2; }
  function umbral() { var E = IATU.data.eval; return (CFG.evaluacion && CFG.evaluacion.umbral) || (E && E.umbral) || 80; }
  function best() { return hist().reduce(function (b, a) { return !b || a.pct > b.pct ? a : b; }, null); }
  function persist(now) { var st = sec(); st.t = store.root.t = Date.now(); if (now) return store.save(true); store.saveSoon(); }
  function loadEval() { return IATU.app.api.loadData("eval"); }
  function forma(id) { return cache[id] || (cache[id] = u.desofuscar(IATU.data.eval.formas[id], "IATU-C05-" + id)); }
  function proyectos() { return cache.P || (cache.P = u.desofuscar(IATU.data.eval.proyectos, "IATU-C05-PROY")); }

  function pauta() { return cache.PA || (cache.PA = u.desofuscar(IATU.data.eval.pauto, "IATU-C05-PAUTO")); }
  function regla() {
    var E = IATU.data.eval || {}, g = E.global || {}, c = CFG.global || {}, p = CFG.proyecto || {};
    return { pe: c.peso_examen != null ? c.peso_examen : g.peso_examen != null ? g.peso_examen : .4,
      pp: c.peso_proyecto != null ? c.peso_proyecto : g.peso_proyecto != null ? g.peso_proyecto : .6,
      umbral: umbral(), up: p.umbral || g.umbral_proyecto || 75, pint: p.intentos || 2 };
  }
  function phist() { return X().phist || []; }
  /* Corrección del proyecto: «docente» (por defecto, pedido de Diego 9-oct-2026: el LMS recibe la entrega y un profesor
     la califica con la rúbrica) o «automatica» (pauta automática con devolución inmediata). Se elige en config.js. */
  function docente() { return ((CFG.proyecto && CFG.proyecto.correccion) || "docente") !== "automatica"; }
  /* Solo cuentan los intentos ya calificados (pct definido). Mejor sin fallos críticos (el que sirve para aprobar) y mejor a secas. */
  function pbest(clean) { return phist().reduce(function (b, a) { return a.pct === undefined || a.pct === null || (clean && a.crit && a.crit.length) || (b && b.pct >= a.pct) ? b : a; }, null); }
  function intentosProy() { var ns = {}; phist().forEach(function (a) { ns[a.n] = 1; }); return Object.keys(ns).length; }
  function ultimaProy() { var ph = phist(); return ph[ph.length - 1] || null; }

  function status() {
    var hs = hist(), b = best(), R = regla(), pb = pbest(true), pa = pbest(false), ph = phist();
    var g = b && (pb || pa) ? R.pe * b.pct + R.pp * (pb || pa).pct : null;
    var pass = !!(b && pb && pb.pct >= R.up && g >= R.umbral);
    var pend = !!(pa && pa.crit && pa.crit.length && !pb), ul = ultimaProy();
    var revision = !!(ul && ul.estado === "en_revision"), devuelto = !!(ul && ul.estado === "devuelto"), npi = intentosProy();
    return { sent: hs.length > 0, best: b ? b.pct : null, attempts: hs.length, max: maxIntentos(), inProgress: !!X().ex,
      psent: ph.length > 0, pbest: (pb || pa) ? (pb || pa).pct : null, pattempts: npi, pmax: R.pint, pInProgress: !!X().proj, pend: pend,
      revision: revision, devuelto: devuelto, docente: docente(),
      done: hs.length > 0 && ph.length > 0, global: g, pass: pass,
      final: pass || (hs.length >= maxIntentos() && npi >= R.pint && !pend && !revision && !devuelto && g !== null) };
  }

  function head(mnt, k, t) { mnt.appendChild(h("div", { class: "crumbs" }, "Evaluación y proyecto")); mnt.appendChild(h("span", { class: "kicker" }, k)); mnt.appendChild(h("h1", null, t)); }
  function nombreSco(s) { return s === "orientacion" ? "Orientación" : "Módulo " + parseInt(s.slice(1), 10) + " · " + IATU.data.curso.modules[parseInt(s.slice(1), 10) - 1].title; }
  function fmt(n) { return (Math.round(n * 10) / 10).toFixed(1).replace(".", ","); }

  /* ---------- Puerta: requisitos ---------- */
  function gate(mnt, api) {
    var cp = IATU.app.courseProg(), stt = status();
    var lock = h("div", { class: "lockbig" }, icon(cp.complete ? "candado-abierto" : "candado"));
    mnt.appendChild(h("div", { class: "crumbs" }, "Evaluación y proyecto"));
    mnt.appendChild(h("section", { class: "gate-hero" }, h("div", { style: { display: "flex", gap: "1.2rem", alignItems: "center", flexWrap: "wrap" } }, lock,
      h("div", null, h("span", { class: "eyebrow" }, h("span", { class: "live" }), cp.complete ? "Evaluación disponible" : "Evaluación bloqueada"),
        h("h1", { style: { margin: ".5rem 0 .3rem" } }, cp.complete ? "Llegó el momento de demostrarlo" : "Primero, completa las 17 secciones"),
        h("p", { style: { margin: 0 } }, cp.complete
          ? "Dos partes que se corrigen solas al entregar: 64 situaciones aplicadas (40 %) y un proyecto de 9 etapas (60 %). Apruebas con " + umbral() + " o más de nota global y " + regla().up + " o más en el proyecto."
          : "Llevas " + cp.secs + " de " + cp.nsecs + " secciones completas (" + Math.round(cp.pct * 100) + " % de los requisitos). La evaluación se abre sola cuando termines.")))));
    var C = IATU.data.curso;
    mnt.appendChild(h("div", { class: "stats" },
      [["64", "situaciones aplicadas (40 %)"], ["9", "etapas de proyecto (60 %)"], ["≥ " + umbral(), "nota global para aprobar"], ["≥ " + regla().up, "en el proyecto"]].map(function (s) { return h("div", { class: "stat" }, h("b", null, s[0]), h("span", null, s[1])); })));
    mnt.appendChild(h("h2", null, "Tus 17 secciones"));
    var list = h("ul", { class: "gate-list" });
    C.scos.filter(function (s) { return s !== "evaluacion"; }).forEach(function (sco) {
      var p = IATU.app.secProg(sco);
      list.appendChild(h("li", { class: p.complete ? "ok" : "" }, h("span", { class: "ring" + (p.complete ? " full" : ""), style: "--v:" + p.pct.toFixed(3), "aria-hidden": "true" }),
        h("span", { class: "grow" }, nombreSco(sco)), h("span", { class: "note" }, p.complete ? "Completa" : Math.round(p.pct * 100) + " %"),
        p.complete ? null : h("a", { class: "btn btn-sm", href: "#/" + (sco === "orientacion" ? "orientacion/bienvenida" : sco + "/cierre") }, "Ver pendientes")));
    });
    mnt.appendChild(list);
    mnt.appendChild(h("p", { class: "note reading" }, C.exam_public.count_definition));
    if (cp.complete) {
      mnt.appendChild(h("h2", null, "Tus dos partes"));
      mnt.appendChild(h("div", { class: "parts" }, parte("Situaciones aplicadas", "40 %", stt.sent ? fmt(stt.best) + " / 100" : "Pendiente",
        stt.inProgress ? "Tienes un intento en curso." : stt.attempts + " de " + stt.max + " intentos usados · forma A y luego B.", "#/evaluacion/examen",
        stt.inProgress ? "Continuar" : !stt.sent ? "Empezar" : stt.attempts < stt.max && !stt.pass ? "Mejorar con la forma B" : "Ver devolución", "bandera"),
        parte("Proyecto de desempeño", "60 %", stt.pInProgress ? "En curso" : stt.revision ? "En revisión" : stt.devuelto ? "Devuelto" : stt.pbest !== null ? fmt(stt.pbest) + " / 100" : "Pendiente",
        stt.pInProgress ? "Tienes un proyecto en curso." : stt.revision ? "Lo está revisando tu profesor con la rúbrica." : stt.devuelto ? "Tu profesor te pidió correcciones." : stt.pend ? (stt.docente ? "Tu profesor señaló un fallo crítico." : "Hay un fallo crítico por subsanar.") : stt.pattempts + " de " + stt.pmax + " intentos usados · forma A y luego B." + (stt.docente ? " Lo califica un profesor." : ""), "#/evaluacion/proyecto",
        stt.pInProgress ? "Continuar" : stt.devuelto ? "Corregir" : stt.pend && !stt.docente ? "Subsanar" : !stt.psent ? "Empezar" : stt.revision ? "Ver mi entrega" : "Ver devolución", "proyecto")));
      if (stt.done && stt.global !== null) mnt.appendChild(h("div", { class: "btn-row" }, h("a", { class: "btn btn-primary", href: "#/evaluacion/resultado" }, icon("medalla"), "Ver mi nota global")));
    }
  }
  function parte(t, peso, nota, sub, href, cta, ic) {
    return h("section", { class: "part-card" }, h("div", { class: "pc-top" }, h("span", { class: "tag tag-violet" }, peso), h("b", { class: "pc-score" }, nota)),
      h("h3", null, t), h("p", { class: "note" }, sub), h("a", { class: "btn btn-sm btn-primary", href: href }, icon(ic), cta));
  }
  function blocked(mnt) {
    mnt.appendChild(h("div", { class: "callout warn" }, h("h3", null, icon("candado"), " Aún bloqueada"),
      h("p", null, "La evaluación se habilita cuando completas lo obligatorio de las 17 secciones."), h("a", { class: "btn btn-sm", href: "#/evaluacion/requisitos" }, "Ver lo que falta")));
  }

  /* ---------- Situaciones aplicadas ---------- */
  function examen(mnt) {
    head(mnt, "Situaciones aplicadas", "Situaciones aplicadas");
    if (!IATU.app.courseProg().complete) return blocked(mnt);
    var box = h("div", null, h("p", { class: "loading" }, "Preparando tu forma…"));
    mnt.appendChild(box);
    loadEval().then(function () {
      u.clear(box);
      var x = X(), stt = status();
      if (x.ex) return runExam(box);
      if (stt.pass || stt.attempts >= stt.max) return results(box, hist()[hist().length - 1]);
      if (stt.sent && !x.nuevo) return results(box, hist()[hist().length - 1]);
      startScreen(box, stt);
    }, function (e) { u.clear(box); box.appendChild(h("div", { class: "callout risk" }, e.message)); });
  }
  function startScreen(box, stt) {
    var f = stt.attempts % 2 === 0 ? "A" : "B";
    box.appendChild(h("div", { class: "reading" },
      h("p", null, "Cada situación tiene un expediente que queda visible mientras respondes. Primero eliges la decisión y luego la evidencia que la sustenta: 3 puntos por la decisión y 2 por la evidencia, de forma independiente."),
      h("ul", null,
        h("li", null, "Puedes pausar y volver: tus respuestas quedan guardadas en el LMS."),
        h("li", null, "Puedes revisar y cambiar respuestas antes de entregar."),
        h("li", null, "La devolución se muestra después de entregar la forma completa."),
        h("li", null, "Intento " + (stt.attempts + 1) + " de " + stt.max + " · forma " + f + ". Cuenta tu mejor intento, que aporta el " + Math.round(regla().pe * 100) + " % de la nota global."))));
    var b = h("button", { class: "btn btn-primary", type: "button" }, icon("bandera"), "Iniciar forma " + f);
    b.addEventListener("click", function () {
      X().ex = { n: stt.attempts + 1, forma: f, ans: {}, idx: 0, ini: new Date().toISOString() }; delete X().nuevo;
      persist(true); u.clear(box); runExam(box);
    });
    box.appendChild(h("div", { class: "btn-row" }, b));
  }
  function runExam(box) {
    var ex = X().ex, units = forma(ex.forma), ans = ex.ans;
    var mapBox = h("nav", { class: "unit-map", "aria-label": "Mapa de situaciones" });
    var stage = h("div"), status1 = h("p", { class: "note" });
    var bar = h("div", { class: "drawer-sum", style: { margin: "0 0 1rem" } }, h("div", { class: "bar" }, h("i", { style: { width: "0%" } })));
    box.appendChild(h("div", { class: "meta-row" }, h("span", { class: "tag tag-violet" }, "Forma " + ex.forma), h("span", { class: "tag" }, "Intento " + ex.n + " de " + maxIntentos()), status1));
    box.appendChild(bar);
    box.appendChild(mapBox);
    box.appendChild(stage);
    function stateOf(id) { var a = ans[id] || {}; return a.d && a.e ? "ans" : (a.d || a.e) ? "part" : ""; }
    function renderMap() {
      u.clear(mapBox);
      units.forEach(function (un, i) {
        var a = ans[un.id] || {};
        var b = h("button", { type: "button", class: stateOf(un.id) + (a.f ? " flag" : ""), "aria-current": i === ex.idx ? "true" : null, "aria-label": "Situación " + (i + 1) + (stateOf(un.id) === "ans" ? ", respondida" : stateOf(un.id) === "part" ? ", incompleta" : ", sin responder") + (a.f ? ", marcada" : "") }, String(i + 1));
        b.addEventListener("click", function () { ex.idx = i; persist(); render(); });
        mapBox.appendChild(b);
      });
      var n = units.filter(function (x) { return stateOf(x.id) === "ans"; }).length;
      status1.textContent = n + " de " + units.length + " completas · bloque " + Math.min(4, Math.floor(ex.idx / 16) + 1) + " de 4";
      bar.querySelector("i").style.width = Math.round(100 * n / units.length) + "%";
    }
    function render() {
      renderMap();
      u.clear(stage);
      if (ex.idx >= units.length) return review();
      var un = units[ex.idx], a = ans[un.id] || (ans[un.id] = {});
      var lay = h("div", { class: "exam-layout" });
      var ctx = h("div", { class: "ctx" }, u.docView({ tab: "Expediente · situación " + (ex.idx + 1), title: un.title, text: un.input }));
      var q = h("div");
      q.appendChild(h("h2", { tabindex: "-1", style: { marginTop: ".4rem" } }, "Situación " + (ex.idx + 1) + " de " + units.length));
      q.appendChild(h("p", { class: "lead", style: { fontSize: "1.05rem" } }, un.task));
      function group(legend, opts, key, name) {
        var fs = h("fieldset", { class: "opts" }, h("legend", null, legend));
        opts.forEach(function (o) {
          var r = h("input", { type: "radio", name: name, value: o.id, checked: a[key] === o.id });
          r.addEventListener("change", function () { a[key] = o.id; persist(); renderMap(); });
          fs.appendChild(h("label", { class: "opt" }, r, h("span", { class: "oid" }, o.id), h("span", null, o.text)));
        });
        return fs;
      }
      q.appendChild(group("Decisión", un.options, "d", un.id + "-d"));
      q.appendChild(group("Evidencia que mejor la sustenta", un.evidence, "e", un.id + "-e"));
      var flag = h("label", { class: "opt", style: { maxWidth: "340px" } }, h("input", { type: "checkbox", checked: !!a.f }), h("span", null, "Marcar para revisar antes de entregar"));
      flag.firstChild.addEventListener("change", function (ev) { a.f = ev.target.checked; persist(); renderMap(); });
      q.appendChild(flag);
      var prev = h("button", { class: "btn", type: "button", disabled: ex.idx === 0 }, icon("anterior"), "Anterior");
      prev.addEventListener("click", function () { ex.idx--; persist(); render(); });
      var next = h("button", { class: "btn btn-primary", type: "button" }, ex.idx + 1 < units.length ? "Siguiente" : "Revisar y entregar", icon("siguiente"));
      next.addEventListener("click", function () { ex.idx++; persist(); render(); });
      var pause = h("button", { class: "btn btn-ghost", type: "button" }, icon("pausa"), "Pausar");
      pause.addEventListener("click", function () { persist(true); u.toast("Tu intento quedó guardado. Puedes volver cuando quieras."); });
      q.appendChild(h("div", { class: "btn-row" }, prev, next, pause));
      if ((ex.idx + 1) % 16 === 0 && ex.idx + 1 < units.length) q.appendChild(h("p", { class: "note" }, "Fin del bloque " + ((ex.idx + 1) / 16) + ". Buen momento para una pausa."));
      lay.appendChild(ctx); lay.appendChild(q);
      stage.appendChild(lay);
      var t = q.querySelector("h2"); if (t) t.focus();
    }
    function review() {
      var miss = units.filter(function (x) { return stateOf(x.id) !== "ans"; });
      var flagged = units.filter(function (x) { return (ans[x.id] || {}).f; });
      var c = h("section", { class: "card" });
      c.appendChild(h("h2", { tabindex: "-1", style: { marginTop: 0 } }, "Revisión antes de entregar"));
      c.appendChild(h("p", null, (units.length - miss.length) + " de " + units.length + " situaciones completas (decisión y evidencia)."));
      if (miss.length) c.appendChild(h("p", null, "Incompletas: " + miss.map(function (x) { return units.indexOf(x) + 1; }).join(", ") + ". Una parte vacía vale 0 puntos; no hay penalización adicional."));
      if (flagged.length) c.appendChild(h("p", null, "Marcadas para revisar: " + flagged.map(function (x) { return units.indexOf(x) + 1; }).join(", ") + "."));
      var confirm = h("label", { class: "opt", style: { maxWidth: "520px" } }, h("input", { type: "checkbox" }), h("span", null, "Revisé mis respuestas y quiero entregar la forma " + ex.forma + ". Después de entregar no podré cambiarlas."));
      var send = h("button", { class: "btn btn-primary", type: "button", disabled: true }, icon("enviar"), "Entregar forma");
      confirm.firstChild.addEventListener("change", function (ev) { send.disabled = !ev.target.checked; });
      send.addEventListener("click", function () { send.disabled = true; var at = grade(); u.clear(box); results(box, at, true); });
      c.appendChild(confirm);
      c.appendChild(h("div", { class: "btn-row" }, send));
      stage.appendChild(c);
      c.querySelector("h2").focus();
    }
    render();
  }

  /* Corrige, guarda el intento y lo informa al LMS. */
  function grade() {
    var x = X(), ex = x.ex, units = forma(ex.forma), R = IATU.data.eval.regla, raw = 0, porMod = {};
    units.forEach(function (un) {
      var a = ex.ans[un.id] || {}, pts = (a.d === un.k[0] ? R.decision : 0) + (a.e === un.k[1] ? R.evidence : 0);
      raw += pts;
      var m = ("0" + un.module).slice(-2);
      porMod[m] = porMod[m] || [0, 0]; porMod[m][0] += pts; porMod[m][1] += R.max_unit;
      store.interaction({ id: un.id, type: "other", response: (a.d || "-") + "/" + (a.e || "-"), result: pts === R.max_unit ? "correct" : pts ? "neutral" : "incorrect", description: "Forma " + ex.forma + " · " + un.title });
    });
    var max = units.length * R.max_unit, pct = 100 * raw / max;
    var at = { n: ex.n, forma: ex.forma, raw: raw, max: max, pct: Math.round(pct * 100) / 100, pass: pct >= umbral(), ans: {}, at: new Date().toISOString(), mod: porMod };
    units.forEach(function (un) { var a = ex.ans[un.id] || {}; at.ans[un.id] = (a.d || "") + (a.e || ""); });
    x.hist = hist().concat([at]);
    delete x.ex;
    report();
    persist(true);
    IATU.app.refreshProgress();
    return at;
  }
  /* Registro completo para el LMS: lo usan la evaluación y app.refreshProgress (así nadie pisa el passed/failed). */
  function lms() {
    var cp = IATU.app.courseProg(), stt = status(), o = { completed: cp.complete && stt.done, progress: Math.min(1, cp.pct * .9 + (stt.sent ? .05 : 0) + (stt.psent ? .05 : 0)) };
    // Con corrección docente, la nota global y el aprobado se informan recién cuando el profesor califica el proyecto.
    if (stt.done && stt.global !== null) {
      var g = Math.round(stt.global * 100) / 100;
      o.success = stt.pass ? "passed" : "failed"; o.raw = g; o.scaled = g / 100; o.max = 100; o.final = stt.final;
    }
    return o;
  }
  function report() {
    var stt = status();
    store.setCompletion(lms());
    if (stt.sent) store.section("obj-situaciones", true, 1, { success: "unknown", scaled: stt.best / 100, description: "Situaciones aplicadas (40 %): mejor intento " + fmt(stt.best) + " / 100" });
    if (stt.psent) store.section("obj-proyecto", true, 1, { success: stt.pbest !== null && !stt.revision && !stt.devuelto ? (stt.pbest >= regla().up && !stt.pend ? "passed" : "failed") : "unknown",
      scaled: stt.pbest !== null ? stt.pbest / 100 : null, description: stt.revision ? "Proyecto entregado: en revisión del profesor" : stt.devuelto ? "Proyecto devuelto para corrección" : "Proyecto calificado" });
    if (stt.done && stt.global !== null) store.section("obj-evaluacion", stt.pass, 1, { success: stt.pass ? "passed" : "failed", scaled: stt.global / 100 });
  }
  function results(box, at, fresh) {
    if (!at) { box.appendChild(h("p", null, "Aún no entregas ninguna forma.")); return; }
    var units = forma(at.forma), stt = status();
    var ring = h("div", { class: "ringbig", style: "--v:" + (at.pct / 100).toFixed(3) + ";width:150px;height:150px;font-size:1.6rem" }, h("span", null, fmt(at.pct)));
    box.appendChild(h("section", { class: "gate-hero" }, h("div", { style: { display: "flex", gap: "1.6rem", alignItems: "center", flexWrap: "wrap" } }, ring,
      h("div", null, h("span", { class: "eyebrow" }, "Forma " + at.forma + " · intento " + at.n + " de " + stt.max),
        h("h2", { style: { color: "#fff", margin: ".5rem 0 .3rem" } }, at.pct >= umbral() ? "¡Muy buen resultado!" : "Situaciones aplicadas: " + fmt(at.pct) + " / 100"),
        h("p", { style: { margin: 0 } }, at.raw + " de " + at.max + " puntos · " + fmt(at.pct) + " de 100. Cuenta tu mejor intento y aporta el " + Math.round(regla().pe * 100) + " % de la nota global. " +
          (stt.pass ? "Tu evaluación está aprobada." : !stt.psent ? "Te falta el proyecto (60 %)." : stt.attempts < stt.max ? "Puedes mejorar con la forma B." : ""))))));
    if (fresh && at.pct >= umbral()) IATU.fx.celebrate("✓", "Situaciones aplicadas", fmt(at.pct) + " de 100.");
    box.appendChild(h("h2", null, "Por módulo"));
    var bars = h("div", { class: "modbars" });
    Object.keys(at.mod).sort().forEach(function (m) {
      var v = at.mod[m], pc = Math.round(100 * v[0] / v[1]);
      bars.appendChild(h("div", { class: "modbar" + (pc < 60 ? " low" : "") }, h("span", null, "M" + m), h("div", { class: "bar" }, h("i", { style: { width: pc + "%" } })), h("b", null, v[0] + "/" + v[1])));
    });
    box.appendChild(bars);
    box.appendChild(h("p", { class: "note" }, "Bajo 60 % en un módulo: conviene repasar su taller y la práctica de decisión."));
    box.appendChild(h("h2", null, "Devolución por situación"));
    units.forEach(function (un, i) {
      var r = at.ans[un.id] || "", d = r.charAt(0) || null, e = r.slice(1) || null, dOk = d === un.k[0], eOk = e === un.k[1], pts = (dOk ? 3 : 0) + (eOk ? 2 : 0);
      var od = un.options.filter(function (o) { return o.id === d; })[0], oe = un.evidence.filter(function (o) { return o.id === e; })[0];
      var det = h("details", { class: "card", style: { marginBottom: ".5rem" } });
      det.appendChild(h("summary", null, h("b", null, (i + 1) + ". " + un.title), " · ", h("span", { class: "tag " + (pts === 5 ? "tag-teal" : pts ? "tag-ochre" : "tag-brick") }, pts + " / 5")));
      det.appendChild(h("p", null, h("b", null, "Tu decisión: "), (d || "sin respuesta") + (dOk ? " ✓" : ""), " · ", h("b", null, "Tu evidencia: "), (e || "sin respuesta") + (eOk ? " ✓" : "")));
      if (od && od.why) det.appendChild(h("p", null, h("b", null, "Sobre tu decisión: "), od.why));
      if (oe && oe.why) det.appendChild(h("p", null, h("b", null, "Sobre tu evidencia: "), oe.why));
      det.appendChild(h("p", null, h("b", null, "Criterio: "), un.just));
      if (un.next) det.appendChild(h("p", { class: "note" }, h("b", null, "Siguiente acción: "), un.next));
      box.appendChild(det);
    });
    var row = h("div", { class: "btn-row" });
    if (!stt.pass && stt.attempts < stt.max) {
      var again = h("a", { class: "btn", href: "#/evaluacion/examen" }, icon("reintentar"), "Usar mi segundo intento (forma B)");
      again.addEventListener("click", function () { X().nuevo = 1; });
      row.appendChild(again);
    }
    row.appendChild(h("a", { class: "btn btn-primary", href: stt.done ? "#/evaluacion/resultado" : "#/evaluacion/proyecto" }, icon(stt.done ? "medalla" : "proyecto"), stt.done ? "Ver mi nota global" : "Ir al proyecto"));
    box.appendChild(row);
  }

  /* ---------- Proyecto de desempeño: 9 etapas con corrección automática ---------- */
  function sinTildes(t) { return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  /* ¿El texto cumple la comprobación? Con «neg», ignora la coincidencia si va negada justo antes («ya no es el 18…»). */
  function cumple(c, txt) {
    var re = new RegExp(sinTildes(c.re), "gi"), t = sinTildes(txt), m;
    while ((m = re.exec(t))) {
      if (!c.neg || !/(^|[^a-z])(no|sin|nunca|tampoco|ni)\s[^.]{0,25}$/i.test(t.slice(Math.max(0, m.index - 30), m.index))) return true;
      if (m[0] === "") re.lastIndex++;
    }
    return false;
  }
  function palabras(t) { return (String(t || "").match(/[0-9A-Za-zÀ-ÿ%:/.,-]+/g) || []).filter(function (w) { return /[0-9A-Za-zÀ-ÿ]/.test(w); }).length; }
  function fmtN(n) { return String(Math.round(n * 100) / 100).replace(".", ","); }
  function semilla(str) { var x = u.seed31(str); return function () { x = (Math.imul(x, 1103515245) + 12345) & 0x7fffffff; return x / 0x7fffffff; }; }
  function barajar(n, key) { var r = semilla(key), a = []; for (var i = 0; i < n; i++) a.push(i); for (i = n - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } if (a.every(function (v, k) { return v === k; })) a.reverse(); return a; }

  /* Corrige un ítem. Devuelve { s, max, det:[[ok, texto]], crit:[etiquetas] }. */
  function corregirItem(it, v) {
    var r = { s: 0, max: it.pts, det: [], crit: [] }, ok = 0;
    if (it.t === "classify") {
      it.rows.forEach(function (row) {
        var a = v ? v[row[0]] : undefined, good = a === it.key[row[0]]; if (good) ok++;
        r.det.push([good, row[1] + " → " + (a === undefined || a === null ? "sin respuesta" : it.cats[a]) + (good ? "" : " · correcto: " + it.cats[it.key[row[0]]])]);
      });
      r.s = it.pts * ok / it.rows.length;
    } else if (it.t === "multi") {
      var sel = v || [], hit = 0, fp = 0;
      it.opts.forEach(function (o, i) {
        var k = it.key.indexOf(i) >= 0, m = sel.indexOf(i) >= 0;
        if (k && m) hit++; if (!k && m) fp++;
        r.det.push([k === m, (k ? (m ? "Marcaste bien: " : "Faltó marcar: ") : (m ? "No correspondía: " : "Bien dejado fuera: ")) + o]);
      });
      r.s = it.pts * Math.max(0, (hit - fp) / it.key.length);
    } else if (it.t === "mcq") {
      var g1 = v === it.key; r.s = g1 ? it.pts : 0;
      r.det.push([g1, v === undefined || v === null ? "Sin respuesta" : "Elegiste: " + it.opts[v]]);
      if (!g1) r.det.push([true, "Respuesta esperada: " + it.opts[it.key]]);
    } else if (it.t === "num") {
      it.fields.forEach(function (f, i) {
        var raw = v && v[i], n = u.parseNum(raw), tol = f[2] > 0 ? Math.max(f[2], 0.051) : 1e-9, good = !isNaN(n) && Math.abs(n - f[1]) <= tol;
        if (good) ok++;
        r.det.push([good, f[0] + ": " + (raw ? raw : "vacío") + (good ? "" : " · esperado " + fmtN(f[1]) + (f[3] ? " " + f[3] : ""))]);
      });
      r.s = it.pts * ok / it.fields.length;
    } else if (it.t === "order") {
      var o = v || [], n = it.steps.length, pares = 0, bien = 0;
      for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) { pares++; if (o.indexOf(i) > -1 && o.indexOf(i) < o.indexOf(j)) bien++; }
      var f1 = o.length === n ? Math.max(0, (bien / pares - .5) * 2) : 0;
      r.s = it.pts * f1;
      r.det.push([f1 === 1, f1 === 1 ? "Orden correcto." : "Tu orden: " + o.map(function (k) { return it.steps[k]; }).join(" → ")]);
      if (f1 < 1) r.det.push([true, "Orden esperado: " + it.steps.join(" → ")]);
    } else if (it.t === "prompt") {
      var vv = v || [], llenos = it.fields.filter(function (f, i) { return (vv[i] || "").trim().length >= it.min; }).length, pas = 0, todo = vv.join("\n");
      r.det.push([llenos === it.fields.length, llenos + " de " + it.fields.length + " partes del encargo completas (mínimo " + it.min + " caracteres cada una)"]);
      it.checks.forEach(function (c) { var g = cumple(c, c.field < 0 ? todo : vv[c.field] || ""); if (g) pas++; r.det.push([g, c.label]); });
      r.s = it.pts * (.25 * llenos / it.fields.length + .75 * pas / it.checks.length);
      if (llenos < 4) r.crit.push("Encargo incompleto: faltan partes del encargo (" + llenos + " de " + it.fields.length + ")");
    } else if (it.t === "text") {
      var tx = v || "", w = palabras(tx), enRango = w >= it.min_words && w <= it.max_words, tot = it.checks.length + 1, pas2 = enRango ? 1 : 0;
      r.det.push([enRango, "Extensión: " + w + " palabras (pedido: " + it.min_words + "–" + it.max_words + ")"]);
      it.checks.forEach(function (c) {
        var hay = cumple(c, tx), g = c.must ? hay : !hay; if (g) pas2++;
        r.det.push([g, c.label]);
        if (!c.must && hay && c.critical) r.crit.push(c.label);
      });
      r.s = it.pts * pas2 / tot;
      // Sin producto no hay puntaje: las comprobaciones «no debe aparecer» no premian un texto vacío.
      if (w < it.min_words * .5) { r.s = 0; r.crit.push("Producto final ausente o demasiado breve (" + w + " palabras)"); }
    }
    r.s = Math.round(r.s * 100) / 100;
    return r;
  }
  function corregirProyecto(forma, ans) {
    var P = pauta(), F = P.formas[forma], cr = {}, items = {}, crit = [], raw = 0, max = 0;
    F.etapas.forEach(function (e) {
      e.items.forEach(function (it, i) {
        var k = e.id + "." + i, r = corregirItem(it, ans[k]);
        items[k] = [r.s, r.max]; raw += r.s; max += r.max;
        cr[e.crit] = cr[e.crit] || [0, 0]; cr[e.crit][0] += r.s; cr[e.crit][1] += r.max;
        r.crit.forEach(function (c) { crit.push({ k: k, label: c }); });
      });
    });
    var W = P.criterios, sw = 0, pct = 0;
    Object.keys(W).forEach(function (c) { if (cr[c]) { sw += W[c]; pct += W[c] * cr[c][0] / cr[c][1]; } });
    pct = sw ? 100 * pct / sw : 0;
    return { pct: Math.round(pct * 100) / 100, raw: Math.round(raw * 100) / 100, max: max, cr: cr, items: items, crit: crit };
  }

  function proyecto(mnt) {
    head(mnt, "Proyecto de desempeño", "Proyecto de desempeño");
    if (!IATU.app.courseProg().complete) return blocked(mnt);
    var box = h("div", null, h("p", { class: "loading" }, "Cargando tu expediente…"));
    mnt.appendChild(box);
    loadEval().then(function () {
      u.clear(box);
      var x = X(), stt = status(), ph = phist();
      if (x.proj) return runProject(box);
      if (ph.length && (!x.pnuevo || stt.pass || stt.pattempts >= stt.pmax)) return (docente() ? projDocente : projResults)(box, ph[ph.length - 1]);
      projStart(box, stt);
    }, function (e) { u.clear(box); box.appendChild(h("div", { class: "callout risk" }, e.message)); });
  }
  function brief(box, p) {
    box.appendChild(h("h2", null, p.title));
    box.appendChild(h("p", null, h("b", null, "Rol: "), p.role, " · ", h("b", null, "Destinatarios: "), p.audience));
    box.appendChild(h("p", { class: "lead reading" }, p.purpose));
    box.appendChild(h("div", { class: "callout warn reading" }, h("h3", null, icon("limite"), " Restricciones"), h("p", null, p.restrictions)));
    box.appendChild(h("div", { class: "callout" }, h("h3", null, "Encargo"), h("p", null, p.task)));
  }
  function projStart(box, stt) {
    var f = stt.pattempts % 2 === 0 ? "A" : "B", p = proyectos()[f], F = pauta().formas[f], R = regla();
    box.appendChild(h("div", { class: "meta-row" }, h("span", { class: "tag tag-violet" }, "Forma " + f), h("span", { class: "tag" }, icon("reloj"), " " + p.minutes / 60 + " h estimadas"), h("span", { class: "tag" }, "Intento " + (stt.pattempts + 1) + " de " + stt.pmax)));
    brief(box, p);
    box.appendChild(h("h3", null, "Cómo se corrige"));
    if (docente()) box.appendChild(h("ul", { class: "reading" },
      h("li", null, "Trabajas en 9 etapas con el expediente siempre a mano: clasificar, elegir, calcular, ordenar, escribir tus encargos y redactar el producto final."),
      h("li", null, "Al terminar, envías tu proyecto: llega al LMS y lo califica un profesor con la rúbrica del curso (C1 20 %, C2 25 %, C3 30 % y C4 25 %)."),
      h("li", null, "La redacción es libre. Se valora que uses los datos vigentes del expediente, respetes los límites y que el producto sirva."),
      h("li", null, "Si el profesor encuentra algo que corregir, te devuelve el proyecto con comentarios para que lo reenvíes."),
      h("li", null, "El proyecto aporta el " + Math.round(R.pp * 100) + " % de la nota global y necesitas " + R.up + " o más. Puedes pausar: tus respuestas quedan guardadas.")));
    else box.appendChild(h("ul", { class: "reading" },
      h("li", null, "Trabajas en 9 etapas con el expediente siempre a mano: clasificar, elegir, calcular, ordenar, escribir tus encargos y redactar el producto final."),
      h("li", null, "Al entregar, todo se corrige automáticamente con la pauta del curso, por criterio de la rúbrica: C1 20 %, C2 25 %, C3 30 % y C4 25 %."),
      h("li", null, "Los textos se revisan con comprobaciones concretas (fechas, cifras, límites, datos que no deben aparecer). La redacción es libre: no se exige coincidencia literal."),
      h("li", null, "Un fallo crítico (por ejemplo, usar la versión reemplazada o incluir datos personales) deja la aprobación pendiente hasta que lo subsanes."),
      h("li", null, "El proyecto aporta el " + Math.round(R.pp * 100) + " % de la nota global y necesitas " + R.up + " o más. Puedes pausar: tus respuestas quedan guardadas.")));
    box.appendChild(h("ol", { class: "ws-steps" }, F.etapas.map(function (e) { return h("li", null, h("b", null, e.title.replace(/^\d+ · /, "")), e.crit); })));
    var b = h("button", { class: "btn btn-primary", type: "button" }, icon("proyecto"), "Comenzar proyecto (forma " + f + ")");
    b.addEventListener("click", function () {
      X().proj = { n: stt.pattempts + 1, forma: f, ans: {}, idx: 0, ini: new Date().toISOString() }; delete X().pnuevo;
      persist(true); u.clear(box); runProject(box);
    });
    box.appendChild(h("div", { class: "btn-row" }, b));
  }

  function runProject(box) {
    var pr = X().proj, p = proyectos()[pr.forma], F = pauta().formas[pr.forma], ans = pr.ans, docSel = pr.doc || 0;
    var steps = h("nav", { class: "pstages", "aria-label": "Etapas del proyecto" }), stage = h("div"), bar = h("div", { class: "pbar", "aria-hidden": "true" }, h("i", { style: { width: "0%" } }));
    box.appendChild(h("div", { class: "meta-row" }, h("span", { class: "tag tag-violet" }, "Forma " + pr.forma + " · " + p.title), h("span", { class: "tag" }, "Intento " + pr.n + " de " + regla().pint)));
    box.appendChild(bar); box.appendChild(steps); box.appendChild(stage);
    function key(e, i) { return e.id + "." + i; }
    function lleno(it, v) {
      if (v === undefined || v === null) return false;
      if (it.t === "classify") return it.rows.every(function (r) { return v[r[0]] !== undefined && v[r[0]] !== null; });
      if (it.t === "multi") return v.length > 0;
      if (it.t === "num") return it.fields.every(function (f, i) { return (v[i] || "").trim() !== ""; });
      if (it.t === "prompt") return it.fields.every(function (f, i) { return (v[i] || "").trim().length >= it.min; });
      if (it.t === "text") return palabras(v) >= Math.round(it.min_words * .6);
      return true;
    }
    function etapaOk(e) { return e.items.every(function (it, i) { return lleno(it, ans[key(e, i)]); }); }
    function renderSteps() {
      u.clear(steps);
      F.etapas.forEach(function (e, i) {
        var b = h("button", { type: "button", class: etapaOk(e) ? "ok" : "", "aria-current": i === pr.idx ? "step" : null, title: e.title }, i < 8 ? String(i + 1) : "9");
        b.addEventListener("click", function () { pr.idx = i; persist(); render(); });
        steps.appendChild(b);
      });
      var fin = h("button", { type: "button", class: "fin", "aria-current": pr.idx >= F.etapas.length ? "step" : null }, icon("enviar"), "Entrega");
      fin.addEventListener("click", function () { pr.idx = F.etapas.length; persist(); render(); });
      steps.appendChild(fin);
      var n = F.etapas.filter(etapaOk).length;
      bar.querySelector("i").style.width = Math.round(100 * n / F.etapas.length) + "%";
    }
    function carpeta() {
      var docs = p.documents, view = h("div");
      var picks = h("div", { class: "docpick", role: "tablist", "aria-label": "Documentos del expediente" });
      function show(i) {
        docSel = pr.doc = i; u.clear(view);
        view.appendChild(u.docView({ tab: docs[i].id + " · " + docs[i].classification, title: docs[i].title, text: docs[i].text }));
        [].forEach.call(picks.children, function (b, k) { b.setAttribute("aria-selected", k === i ? "true" : "false"); });
      }
      docs.forEach(function (d, i) { var b = h("button", { type: "button", role: "tab" }, d.id); b.addEventListener("click", function () { show(i); }); picks.appendChild(b); });
      // En pantallas angostas el expediente parte plegado para no empujar la etapa hacia abajo.
      var ancho = !window.matchMedia || window.matchMedia("(min-width: 961px)").matches;
      var c = h("details", { class: "carpeta", open: ancho || pr.carpeta ? true : null }, h("summary", { class: "ref-label" }, icon("archivo"), " Expediente · " + docs.length + " documentos"), picks, view);
      c.addEventListener("toggle", function () { if (!ancho) pr.carpeta = c.open; });
      show(Math.min(docSel, docs.length - 1));
      return c;
    }
    function persistAns(k, v) { ans[k] = v; persist(); renderSteps(); }
    function itemUI(it, k) {
      var v = ans[k], c = h("div", { class: "pitem" });
      if (it.q) c.appendChild(h("p", { class: "pq" }, it.q));
      if (it.t === "classify") {
        var cur = v || {};
        it.rows.forEach(function (row) {
          var id = u.newId("cl"), sel = h("select", { id: id }, h("option", { value: "" }, "Elige…"), it.cats.map(function (ct, ci) { return h("option", { value: String(ci), selected: cur[row[0]] === ci }, ct); }));
          sel.addEventListener("change", function () { cur[row[0]] = sel.value === "" ? null : +sel.value; persistAns(k, cur); });
          c.appendChild(h("div", { class: "cls-row" }, h("label", { for: id }, row[1]), sel));
        });
      } else if (it.t === "multi" || it.t === "mcq") {
        var fs = h("fieldset", { class: "opts" }, h("legend", { class: "sr-only" }, it.q || "Opciones"));
        it.opts.forEach(function (o, i) {
          var inp = it.t === "multi" ? h("input", { type: "checkbox", checked: (v || []).indexOf(i) >= 0 }) : h("input", { type: "radio", name: k, checked: v === i });
          inp.addEventListener("change", function () {
            if (it.t === "mcq") return persistAns(k, i);
            var s2 = (ans[k] || []).filter(function (z) { return z !== i; }); if (inp.checked) s2.push(i); s2.sort(); persistAns(k, s2);
          });
          fs.appendChild(h("label", { class: "opt" }, inp, h("span", null, o)));
        });
        c.appendChild(fs);
      } else if (it.t === "num") {
        var vals = v || [], grid = h("div", { class: "num-grid" });
        it.fields.forEach(function (f, i) {
          var id = u.newId("nm"), inp = h("input", { id: id, type: "text", inputmode: "decimal", autocomplete: "off", value: vals[i] || "", placeholder: f[3] === "%" ? "ej.: 66,67" : "número" });
          inp.addEventListener("input", function () { vals[i] = inp.value; persistAns(k, vals); });
          grid.appendChild(h("div", { class: "num-f" }, h("label", { for: id }, f[0]), h("div", { class: "num-in" }, inp, f[3] ? h("span", null, f[3]) : null)));
        });
        c.appendChild(grid);
        c.appendChild(h("p", { class: "note" }, "Acepta coma o punto decimal. Porcentajes con dos decimales (ej.: 73,33)."));
      } else if (it.t === "order") {
        if (!v) { v = barajar(it.steps.length, k + pr.n); ans[k] = v; }
        var ol = h("ol", { class: "ord-list" });
        var draw = function () {
          u.clear(ol);
          v.forEach(function (si, pos) {
            var up = h("button", { type: "button", class: "btn btn-ghost btn-sm", disabled: pos === 0, "aria-label": "Subir «" + it.steps[si] + "»" }, icon("subir"));
            var dn = h("button", { type: "button", class: "btn btn-ghost btn-sm", disabled: pos === v.length - 1, "aria-label": "Bajar «" + it.steps[si] + "»" }, icon("bajar"));
            up.addEventListener("click", function () { v.splice(pos - 1, 0, v.splice(pos, 1)[0]); persistAns(k, v); draw(); ol.children[pos - 1].querySelector("button").focus(); });
            dn.addEventListener("click", function () { v.splice(pos + 1, 0, v.splice(pos, 1)[0]); persistAns(k, v); draw(); var b2 = ol.children[pos + 1].querySelectorAll("button")[1]; if (b2) b2.focus(); });
            ol.appendChild(h("li", null, h("span", { class: "grow" }, it.steps[si]), up, dn));
          });
        };
        draw(); c.appendChild(ol);
      } else if (it.t === "prompt") {
        var pv = v || [];
        it.fields.forEach(function (f, i) {
          var id = u.newId("pf"), ta = h("textarea", { id: id, rows: i === 2 || i === 3 ? 4 : 2 }, pv[i] || "");
          ta.addEventListener("input", function () { pv[i] = ta.value; persistAns(k, pv); });
          c.appendChild(h("label", { class: "fl", for: id }, (i + 1) + ". " + f)); c.appendChild(ta);
        });
      } else if (it.t === "text") {
        var id2 = u.newId("tx"), ta2 = h("textarea", { id: id2, rows: 10 }, v || ""), wc = h("span", { class: "wc" });
        var cnt = function () { var w = palabras(ta2.value); wc.textContent = w + " palabras · pedido " + it.min_words + "–" + it.max_words; wc.className = "wc" + (w >= it.min_words && w <= it.max_words ? " ok" : ""); };
        ta2.addEventListener("input", function () { cnt(); persistAns(k, ta2.value); });
        cnt();
        c.appendChild(h("label", { class: "fl", for: id2 }, it.label)); c.appendChild(ta2); c.appendChild(wc);
      }
      return c;
    }
    function render() {
      renderSteps(); u.clear(stage);
      if (pr.idx >= F.etapas.length) return revisar();
      var e = F.etapas[pr.idx], lay = h("div", { class: "exam-layout" }), q = h("div");
      q.appendChild(h("div", { class: "meta-row" }, h("span", { class: "tag" }, "Etapa " + (pr.idx + 1) + " de " + F.etapas.length), h("span", { class: "tag tag-violet" }, e.crit)));
      q.appendChild(h("h2", { tabindex: "-1", style: { marginTop: ".4rem" } }, e.title.replace(/^\d+ · /, "")));
      if (e.intro) q.appendChild(h("p", { class: "lead", style: { fontSize: "1.02rem" } }, e.intro));
      if (pr.idx === F.etapas.length - 1) q.appendChild(u.docView({ tab: "Actualización autorizada del expediente", text: p.update }));
      e.items.forEach(function (it, i) { q.appendChild(itemUI(it, key(e, i))); });
      var prev = h("button", { class: "btn", type: "button", disabled: pr.idx === 0 }, icon("anterior"), "Anterior");
      prev.addEventListener("click", function () { pr.idx--; persist(); render(); });
      var next = h("button", { class: "btn btn-primary", type: "button" }, pr.idx + 1 < F.etapas.length ? "Siguiente etapa" : "Revisar y entregar", icon("siguiente"));
      next.addEventListener("click", function () { pr.idx++; persist(); render(); });
      var pause = h("button", { class: "btn btn-ghost", type: "button" }, icon("pausa"), "Pausar");
      pause.addEventListener("click", function () { persist(true); u.toast("Tu proyecto quedó guardado. Puedes volver cuando quieras."); });
      q.appendChild(h("div", { class: "btn-row" }, prev, next, pause));
      lay.appendChild(h("div", { class: "ctx" }, carpeta())); lay.appendChild(q);
      stage.appendChild(lay);
      q.querySelector("h2").focus();
    }
    function revisar() {
      var falta = F.etapas.filter(function (e) { return !etapaOk(e); });
      var c = h("section", { class: "card" });
      c.appendChild(h("h2", { tabindex: "-1", style: { marginTop: 0 } }, "Revisión antes de entregar"));
      c.appendChild(h("p", null, (F.etapas.length - falta.length) + " de " + F.etapas.length + " etapas completas."));
      if (falta.length) c.appendChild(h("p", null, "Incompletas: " + falta.map(function (e) { return e.title.replace(/ · .*/, ""); }).join(", ") + ". Lo vacío vale 0 puntos."));
      c.appendChild(h("p", { class: "note" }, docente()
        ? "Al enviar, tu proyecto llega al LMS para que lo califique un profesor. Después no podrás cambiarlo, salvo que te lo devuelva con comentarios."
        : "Al entregar se corrige todo de inmediato y verás tu devolución por etapa con el modelo de referencia. Tus encargos (etapa 3) y el producto final (etapa 4) son obligatorios: si faltan, la aprobación queda pendiente hasta completarlos."));
      var cf = h("label", { class: "opt", style: { maxWidth: "620px" } }, h("input", { type: "checkbox" }), h("span", null, "Entrego mi proyecto (forma " + pr.forma + "). Confirmo que usé solo datos del expediente ficticio y que no envié, publiqué ni conecté servicios reales."));
      var send = h("button", { class: "btn btn-primary", type: "button", disabled: true }, icon("enviar"), docente() ? "Enviar al profesor" : "Entregar y corregir");
      cf.firstChild.addEventListener("change", function (ev) { send.disabled = !ev.target.checked; });
      send.addEventListener("click", function () {
        send.disabled = true;
        if (docente()) { var en = entregarProyecto(); u.clear(box); projDocente(box, en, true); return; }
        var at = gradeProject(); u.clear(box); projResults(box, at, true);
      });
      c.appendChild(cf); c.appendChild(h("div", { class: "btn-row" }, send));
      stage.appendChild(c); c.querySelector("h2").focus();
    }
    render();
  }

  /* ---------- Corrección docente: entrega al LMS y evaluación del profesor ----------
     Contrato completo en docs/INTEGRACION_PROYECTO_LMS.md. */
  function respuestaLegible(it, v) {
    if (v === undefined || v === null || v === "") return "(sin respuesta)";
    if (it.t === "classify") return it.rows.map(function (r) { var a = v[r[0]]; return r[1] + " → " + (a === undefined || a === null ? "(sin respuesta)" : it.cats[a]); }).join("\n");
    if (it.t === "multi") return v.length ? v.map(function (i) { return "• " + it.opts[i]; }).join("\n") : "(nada marcado)";
    if (it.t === "mcq") return it.opts[v];
    if (it.t === "num") return it.fields.map(function (f, i) { return f[0] + ": " + ((v[i] || "").trim() || "(vacío)") + (f[3] ? " " + f[3] : ""); }).join("\n");
    if (it.t === "order") return v.map(function (k, i) { return (i + 1) + ". " + it.steps[k]; }).join("\n");
    if (it.t === "prompt") return it.fields.map(function (f, i) { return (i + 1) + ". " + f + ": " + ((v[i] || "").trim() || "(vacío)"); }).join("\n");
    return String(v);
  }
  function respuestas(forma, ans) {
    var out = [];
    pauta().formas[forma].etapas.forEach(function (e) {
      e.items.forEach(function (it, i) {
        var k = e.id + "." + i;
        out.push({ clave: k, etapa: e.title, criterio: e.crit, tipo: it.t, pregunta: it.q || it.label || "", respuesta: respuestaLegible(it, ans[k]), valor: ans[k] === undefined ? null : ans[k] });
      });
    });
    return out;
  }
  function textoEntrega(en, resp) {
    var t = "PROYECTO DE DESEMPEÑO · IA para trabajar mejor (Curso 5)\nEntrega " + en.id + " · forma " + en.forma + " · intento " + en.n + "\nParticipante: " + (store.adapter.learnerName && store.adapter.learnerName() || store.learner) + " (" + store.learner + ")\nFecha: " + en.at + "\n";
    var etapa = "";
    resp.forEach(function (r) {
      if (r.etapa !== etapa) { etapa = r.etapa; t += "\n== " + r.etapa + " · " + r.criterio + " ==\n"; }
      if (r.pregunta) t += "• " + r.pregunta + "\n";
      t += r.respuesta + "\n";
    });
    t += "\n-- Prevalidación automática (orientativa para el profesor; no es la nota): " + fmt(en.pre.pct) + " / 100" + (en.pre.alertas.length ? " · Alertas: " + en.pre.alertas.join(" · ") : "") + "\n";
    return t;
  }
  function entregarProyecto() {
    var x = X(), pr = x.proj, pre = corregirProyecto(pr.forma, pr.ans), now = new Date().toISOString();
    var en = { id: "IATU-P-" + pr.forma + pr.n + "-" + Date.now().toString(36), n: pr.n, forma: pr.forma, ans: pr.ans, at: now, estado: "en_revision",
      pre: { pct: pre.pct, cr: pre.cr, alertas: pre.crit.map(function (c) { return c.label; }) }, reenvio: pr.reenvio || null };
    var resp = respuestas(pr.forma, pr.ans), texto = textoEntrega(en, resp);
    // 1) Interacciones: una por ítem, legibles en el reporte del LMS.
    resp.forEach(function (r) {
      store.interaction({ id: "IATU-PROY-" + en.forma + en.n + "-" + r.clave.replace(".", "-"), type: r.tipo === "prompt" || r.tipo === "text" ? "long-fill-in" : "other",
        response: r.respuesta, result: "neutral", description: r.etapa + (r.pregunta ? " · " + r.pregunta : "") });
    });
    // 2) Texto completo para el profesor en cmi.comments_from_learner (trozos de 3.900 caracteres).
    // SCORM 2004 (localized_string) no admite saltos de línea en un comentario: se marcan con « ¶ ».
    var plano = texto.replace(/\n+/g, " ¶ "), partes = []; for (var i = 0; i < plano.length; i += 3900) partes.push(plano.slice(i, i + 3900));
    partes.forEach(function (pt, j) { store.learnerComment(pt, "IATU-PROYECTO|" + en.id + "|" + (j + 1) + "/" + partes.length); });
    // 3) Aviso inmediato a la página del LMS que contiene el curso (si está escuchando).
    var msg = { type: "dibork:iatu:proyecto-entregado", version: 1, curso: "IATU-C05", entrega_id: en.id, forma: en.forma, intento: en.n, reenvio_de: en.reenvio, fecha: now,
      participante: { id: store.learner, nombre: store.adapter.learnerName ? store.adapter.learnerName() || "" : "" },
      respuestas: resp, prevalidacion: { nota_sugerida: pre.pct, por_criterio: pre.cr, alertas: en.pre.alertas }, texto: texto };
    avisarLMS(msg);
    if (IATU.service && IATU.service.configured()) IATU.service.call("POST", "/api/v1/proyecto/entrega", msg).catch(function () { /* el LMS ya tiene la entrega en el CMI */ });
    x.phist = phist().concat([en]);
    delete x.proj;
    report(); persist(true); IATU.app.refreshProgress();
    return en;
  }
  function avisarLMS(msg) {
    var origen = (CFG.proyecto && CFG.proyecto.origen_lms) || "*";
    [window.parent, window.top, window.opener].forEach(function (w, i, a) {
      try { if (w && w !== window && a.indexOf(w) === i) w.postMessage(msg, origen); } catch (e) { /* sin acción */ }
    });
  }
  /* Aplica una evaluación del profesor. ev = { entrega_id?, forma?, estado: "evaluado" | "devuelto",
     niveles?: {C1..C4: 0–3}, nota?: 0–100, critico?: bool, comentario?, profesor?, fecha? }. Devuelve true si cambió algo. */
  function aplicarEvaluacion(ev) {
    if (!ev || (ev.estado !== "evaluado" && ev.estado !== "devuelto")) return false;
    var ph = phist(), en = null;
    for (var i = ph.length - 1; i >= 0; i--) { if (ev.entrega_id ? ph[i].id === ev.entrega_id : !ev.forma || ph[i].forma === ev.forma) { en = ph[i]; break; } }
    if (!en) return false;
    var firma = JSON.stringify([ev.estado, ev.niveles, ev.nota, ev.critico, ev.comentario, ev.fecha]);
    if (en.eval && en.eval.firma === firma) return false;
    var nota = null, W = { C1: 20, C2: 25, C3: 30, C4: 25 };
    try { W = pauta().criterios; } catch (e) { /* pesos por defecto */ }
    if (ev.niveles && typeof ev.niveles === "object") {
      var sw = 0, acc = 0;
      Object.keys(W).forEach(function (c) { var n = Number(ev.niveles[c]); if (!isNaN(n)) { sw += W[c]; acc += W[c] * Math.max(0, Math.min(3, n)) / 3; } });
      if (sw) nota = 100 * acc / sw;
    }
    if (nota === null && ev.nota !== undefined && !isNaN(Number(ev.nota))) nota = Math.max(0, Math.min(100, Number(ev.nota)));
    if (ev.estado === "evaluado" && nota === null) return false;
    en.eval = { estado: ev.estado, niveles: ev.niveles || null, nota: nota, critico: !!ev.critico, comentario: String(ev.comentario || "").slice(0, 4000), profesor: String(ev.profesor || "").slice(0, 120), fecha: ev.fecha || new Date().toISOString(), firma: firma };
    en.estado = ev.estado;
    if (ev.estado === "evaluado") { en.pct = Math.round(nota * 100) / 100; en.crit = ev.critico ? [{ k: "", label: "Fallo crítico señalado por el profesor" }] : []; }
    else { delete en.pct; en.crit = []; }
    report(); persist(true);
    return true;
  }
  /* Lee las evaluaciones que el LMS dejó en cmi.comments_from_lms (JSON con "tipo": "iatu-proyecto-evaluacion"). */
  function sincronizar() {
    var cambio = false;
    store.lmsComments().forEach(function (c) {
      var t = (c && c.comment) || "";
      if (!/^\s*\{/.test(t)) return;
      try { var j = JSON.parse(t); if (j && (j.tipo === "iatu-proyecto-evaluacion" || /^IATU-PROYECTO/.test(c.location || ""))) cambio = aplicarEvaluacion(j) || cambio; } catch (e) { /* comentario no estructurado */ }
    });
    return cambio;
  }
  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || d.type !== "dibork:iatu:proyecto-evaluado") return;
    if (e.source !== window.parent && e.source !== window.top && e.source !== window.opener) return;
    if (store.root && aplicarEvaluacion(d.evaluacion || d)) {
      u.toast(d.estado === "devuelto" || (d.evaluacion && d.evaluacion.estado === "devuelto") ? "Tu profesor te devolvió el proyecto con comentarios." : "Tu profesor calificó tu proyecto.");
      IATU.app.refreshProgress();
      if (/^#\/evaluacion/.test(location.hash)) window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  });

  function projDocente(box, en, fresh) {
    var R = regla(), stt = status(), C = IATU.data.curso, ev = en.eval || {};
    var hero = h("div", null, h("span", { class: "eyebrow" }, "Proyecto · forma " + en.forma + " · intento " + en.n + " de " + R.pint));
    var ringv = en.estado === "evaluado" ? en.pct : null;
    if (en.estado === "en_revision") {
      hero.appendChild(h("h2", { style: { color: "#fff", margin: ".5rem 0 .3rem" } }, "Entregado · en revisión del profesor"));
      hero.appendChild(h("p", { style: { margin: 0 } }, "Enviado el " + new Date(en.at).toLocaleString("es-CL") + ". Tu profesor lo calificará con la rúbrica; cuando lo haga, verás aquí tu nota y sus comentarios. " + (!stt.sent ? "Mientras tanto, puedes rendir las situaciones aplicadas." : "")));
    } else if (en.estado === "devuelto") {
      hero.appendChild(h("h2", { style: { color: "#fff", margin: ".5rem 0 .3rem" } }, "Tu profesor te pidió correcciones"));
      hero.appendChild(h("p", { style: { margin: 0 } }, "Revisa sus comentarios, corrige y vuelve a enviar. No cuenta como un intento nuevo."));
    } else {
      hero.appendChild(h("h2", { style: { color: "#fff", margin: ".5rem 0 .3rem" } }, en.crit && en.crit.length ? "Calificado con un fallo crítico" : en.pct >= R.up ? "Proyecto aprobado por tu profesor" : "Aún bajo el " + R.up));
      hero.appendChild(h("p", { style: { margin: 0 } }, fmt(en.pct) + " de 100 con la rúbrica. Aporta el " + Math.round(R.pp * 100) + " % de tu nota global. " + (stt.pass ? "Tu evaluación está aprobada." : !stt.sent ? "Te faltan las situaciones aplicadas (40 %)." : "")));
    }
    var top = h("div", { style: { display: "flex", gap: "1.6rem", alignItems: "center", flexWrap: "wrap" } });
    top.appendChild(ringv !== null ? h("div", { class: "ringbig", style: "--v:" + (ringv / 100).toFixed(3) + ";width:150px;height:150px;font-size:1.6rem" }, h("span", null, fmt(ringv)))
      : h("div", { class: "lockbig" }, icon(en.estado === "devuelto" ? "lapiz" : "reloj")));
    top.appendChild(hero);
    box.appendChild(h("section", { class: "gate-hero" }, top));
    if (fresh && en.estado === "en_revision") IATU.fx.celebrate("★", "Proyecto enviado", "Quedó en el LMS para tu profesor.");
    if (ev.comentario) box.appendChild(h("div", { class: "callout " + (en.estado === "devuelto" ? "warn" : "info") }, h("h3", null, icon("chat"), " Comentarios" + (ev.profesor ? " de " + ev.profesor : " del profesor")), u.paragraphs(ev.comentario, "")));
    if (en.estado === "evaluado" && ev.niveles) {
      box.appendChild(h("h2", null, "Por criterio de la rúbrica"));
      var bars = h("div", { class: "modbars" });
      C.rubric.forEach(function (c) {
        var n = Number(ev.niveles[c.id]); if (isNaN(n)) return;
        bars.appendChild(h("div", { class: "modbar" + (n < 2 ? " low" : "") }, h("span", null, c.id), h("div", { class: "bar" }, h("i", { style: { width: Math.round(100 * n / 3) + "%" } })), h("b", null, "Nivel " + n + " de 3")));
      });
      box.appendChild(bars);
      box.appendChild(h("p", { class: "note" }, C.rubric.map(function (c) { return c.id + ": " + c.title + " (" + c.weight + " %)"; }).join(" · ")));
    }
    var row = h("div", { class: "btn-row" });
    if (en.estado === "devuelto") {
      var fix = h("button", { class: "btn btn-primary", type: "button" }, icon("lapiz"), "Corregir y reenviar");
      fix.addEventListener("click", function () {
        X().proj = { n: en.n, forma: en.forma, ans: JSON.parse(JSON.stringify(en.ans || {})), idx: 0, reenvio: en.id, ini: new Date().toISOString() };
        persist(true); u.clear(box); runProject(box);
      });
      row.appendChild(fix);
    }
    if (en.estado === "evaluado" && !stt.pass && stt.pattempts < R.pint) {
      var again = h("a", { class: "btn", href: "#/evaluacion/proyecto" }, icon("reintentar"), "Usar mi segundo intento (forma B)");
      again.addEventListener("click", function () { X().pnuevo = 1; });
      row.appendChild(again);
    }
    row.appendChild(h("a", { class: "btn" + (en.estado === "devuelto" ? "" : " btn-primary"), href: stt.sent ? "#/evaluacion/resultado" : "#/evaluacion/examen" }, icon(stt.sent ? "medalla" : "bandera"), stt.sent ? "Ver mi resultado" : "Ir a las situaciones aplicadas"));
    box.appendChild(row);
    var det = h("details", { class: "card" }, h("summary", null, h("b", null, "Lo que enviaste")));
    var etapa = "";
    respuestas(en.forma, en.ans || {}).forEach(function (r) {
      if (r.etapa !== etapa) { etapa = r.etapa; det.appendChild(h("h4", null, r.etapa)); }
      if (r.pregunta) det.appendChild(h("p", { class: "pq" }, r.pregunta));
      det.appendChild(h("div", { class: "ref", style: { whiteSpace: "pre-wrap" } }, r.respuesta));
    });
    box.appendChild(det);
  }

  function gradeProject() {
    var x = X(), pr = x.proj, res = corregirProyecto(pr.forma, pr.ans);
    var at = { n: pr.n, forma: pr.forma, pct: res.pct, raw: res.raw, max: res.max, cr: res.cr, items: res.items, crit: res.crit, crit0: res.crit.length, ans: pr.ans, at: new Date().toISOString() };
    Object.keys(res.items).forEach(function (k) {
      var v = res.items[k];
      store.interaction({ id: "IATU-PROY-" + pr.forma + "-" + k.replace(".", "-"), type: "other", response: v[0] + "/" + v[1], result: v[0] >= v[1] ? "correct" : v[0] > 0 ? "neutral" : "incorrect", description: "Proyecto forma " + pr.forma + " · etapa " + k });
    });
    x.phist = phist().concat([at]);
    delete x.proj;
    report(); persist(true); IATU.app.refreshProgress();
    return at;
  }

  function projResults(box, at, fresh) {
    var F = pauta().formas[at.forma], W = pauta().criterios, stt = status(), R = regla(), C = IATU.data.curso;
    var ring = h("div", { class: "ringbig", style: "--v:" + (at.pct / 100).toFixed(3) + ";width:150px;height:150px;font-size:1.6rem" }, h("span", null, fmt(at.pct)));
    var pendiente = at.crit && at.crit.length;
    box.appendChild(h("section", { class: "gate-hero" }, h("div", { style: { display: "flex", gap: "1.6rem", alignItems: "center", flexWrap: "wrap" } }, ring,
      h("div", null, h("span", { class: "eyebrow" }, "Proyecto · forma " + at.forma + " · intento " + at.n + " de " + R.pint),
        h("h2", { style: { color: "#fff", margin: ".5rem 0 .3rem" } }, pendiente ? "Hay un fallo crítico por subsanar" : at.pct >= R.up ? "Proyecto sobre el estándar" : "Aún bajo el " + R.up),
        h("p", { style: { margin: 0 } }, fmt(at.pct) + " de 100, ponderado por criterio. Aporta el " + Math.round(R.pp * 100) + " % de tu nota global. " +
          (stt.pass ? "Tu evaluación está aprobada." : !stt.sent ? "Te faltan las situaciones aplicadas (40 %)." : ""))))));
    if (fresh && !pendiente && at.pct >= R.up) IATU.fx.celebrate("★", "Proyecto corregido", fmt(at.pct) + " de 100.");
    if (pendiente) {
      var cb = h("div", { class: "callout risk critbox" }, h("h3", null, icon("circulo-alerta"), " Fallo crítico: la aprobación queda pendiente"),
        h("p", null, "Tu puntaje se conserva, pero para aprobar debes corregir lo señalado. Edita solo lo necesario y vuelve a comprobar."),
        h("ul", null, at.crit.map(function (c) { return h("li", null, c.label); })));
      var eds = [], keys = at.crit.map(function (c) { return c.k; }).filter(function (k, i, a) { return a.indexOf(k) === i; });
      keys.forEach(function (k) {
        var it0 = null; F.etapas.forEach(function (e) { e.items.forEach(function (it, i) { if (e.id + "." + i === k) it0 = it; }); });
        var prev = (at.sub && at.sub[k]) || at.ans[k], ed;
        if (it0.t === "prompt") {
          var vals = (prev || []).slice(), w = h("div");
          it0.fields.forEach(function (f, i) {
            var id = u.newId("sub"), ta = h("textarea", { id: id, rows: 2 }, vals[i] || "");
            ta.addEventListener("input", function () { vals[i] = ta.value; });
            w.appendChild(h("label", { class: "fl", for: id }, (i + 1) + ". " + f)); w.appendChild(ta);
          });
          ed = { k: k, it: it0, val: function () { return vals; } }; cb.appendChild(h("h4", null, "Tu encargo (versión corregida)")); cb.appendChild(w);
        } else {
          var id2 = u.newId("sub"), ta2 = h("textarea", { id: id2, rows: 10 }, prev || "");
          ed = { k: k, it: it0, val: function () { return ta2.value; } };
          cb.appendChild(h("label", { class: "fl", for: id2 }, it0.label + " (versión corregida)")); cb.appendChild(ta2);
        }
        eds.push(ed);
      });
      var chk = h("button", { class: "btn btn-primary", type: "button" }, icon("check"), "Comprobar y subsanar");
      chk.addEventListener("click", function () {
        var quedan = [];
        at.sub = at.sub || {};
        eds.forEach(function (ed) { var r = corregirItem(ed.it, ed.val()); at.sub[ed.k] = ed.val(); r.crit.forEach(function (l) { quedan.push({ k: ed.k, label: l }); }); });
        at.crit = quedan;
        if (quedan.length) { persist(true); u.toast("Aún falta: " + quedan.map(function (c) { return c.label; }).join(" · ")); return; }
        at.fix = new Date().toISOString();
        store.interaction({ id: "IATU-PROY-" + at.forma + "-SUBSANA", type: "other", response: "subsanado", result: "correct", description: "Fallo crítico subsanado" });
        report(); persist(true); IATU.app.refreshProgress(); u.clear(box); projResults(box, at, true);
      });
      cb.appendChild(h("div", { class: "btn-row" }, chk));
      box.appendChild(cb);
    } else if (at.fix) box.appendChild(h("div", { class: "callout info" }, h("p", null, icon("circulo-check"), " Fallo crítico subsanado el " + new Date(at.fix).toLocaleString("es-CL") + ". El puntaje analítico se mantiene.")));
    box.appendChild(h("h2", null, "Por criterio de la rúbrica"));
    var bars = h("div", { class: "modbars" });
    C.rubric.forEach(function (c) {
      var v = at.cr[c.id]; if (!v) return;
      var pc = Math.round(100 * v[0] / v[1]);
      bars.appendChild(h("div", { class: "modbar" + (pc < 60 ? " low" : "") }, h("span", null, c.id), h("div", { class: "bar" }, h("i", { style: { width: pc + "%" } })), h("b", null, pc + " % · peso " + W[c.id])));
    });
    box.appendChild(bars);
    box.appendChild(h("p", { class: "note" }, C.rubric.map(function (c) { return c.id + ": " + c.title; }).join(" · ")));
    box.appendChild(h("h2", null, "Devolución por etapa"));
    F.etapas.forEach(function (e) {
      var s = 0, m = 0;
      e.items.forEach(function (it, i) { var v = at.items[e.id + "." + i] || [0, it.pts]; s += v[0]; m += v[1]; });
      var det = h("details", { class: "card", style: { marginBottom: ".5rem" } });
      det.appendChild(h("summary", null, h("b", null, e.title), " · ", h("span", { class: "tag " + (s >= m ? "tag-teal" : s > 0 ? "tag-ochre" : "tag-brick") }, fmtN(s) + " / " + m), " ", h("span", { class: "tag" }, e.crit)));
      e.items.forEach(function (it, i) {
        var r = corregirItem(it, at.ans[e.id + "." + i]);
        det.appendChild(h("p", { class: "pq" }, it.q || it.label));
        det.appendChild(h("ul", { class: "chk" }, r.det.map(function (d) { return h("li", { class: d[0] ? "ok" : "no" }, icon(d[0] ? "circulo-check" : "circulo-x"), h("span", null, d[1])); })));
        if (it.why) det.appendChild(h("p", { class: "note" }, h("b", null, "Por qué: "), it.why));
      });
      if (e.modelo) det.appendChild(h("div", { class: "ref" }, h("span", { class: "ref-label" }, "Modelo de referencia · " + e.modelo.title), e.modelo.text));
      box.appendChild(det);
    });
    var row = h("div", { class: "btn-row" });
    if (!stt.pass && stt.pattempts < R.pint && !X().proj) {
      var again = h("a", { class: "btn", href: "#/evaluacion/proyecto" }, icon("reintentar"), "Usar mi segundo intento (forma B)");
      again.addEventListener("click", function () { X().pnuevo = 1; });
      row.appendChild(again);
    }
    row.appendChild(h("a", { class: "btn btn-primary", href: stt.done ? "#/evaluacion/resultado" : "#/evaluacion/examen" }, icon(stt.done ? "medalla" : "bandera"), stt.done ? "Ver mi nota global" : "Ir a las situaciones aplicadas"));
    box.appendChild(row);
  }

  /* ---------- Resultado ---------- */
  function resultado(mnt) {
    head(mnt, "Resultado", "Tu resultado");
    var stt = status(), b = best(), R = regla(), pb = pbest(true) || pbest(false);
    if (!stt.done) {
      mnt.appendChild(h("p", null, "Tu nota global aparece cuando entregas las dos partes: " + (stt.sent ? "te falta el proyecto." : stt.psent ? "te faltan las situaciones aplicadas." : "situaciones aplicadas y proyecto.")));
      mnt.appendChild(h("a", { class: "btn btn-primary", href: "#/evaluacion/requisitos" }, "Ir a la evaluación")); return;
    }
    if (stt.global === null) {
      mnt.appendChild(h("div", { class: "callout info" }, h("h3", null, icon("reloj"), stt.devuelto ? " Proyecto devuelto para corrección" : " Proyecto en revisión"),
        h("p", null, "Situaciones aplicadas: " + fmt(b.pct) + " / 100 (mejor intento). " + (stt.devuelto ? "Tu profesor te pidió correcciones: revisa sus comentarios y reenvía." : "Tu nota global y el resultado aparecen cuando tu profesor califique el proyecto. Te avisaremos aquí."))));
      mnt.appendChild(h("div", { class: "btn-row" }, h("a", { class: "btn btn-primary", href: "#/evaluacion/proyecto" }, icon("proyecto"), stt.devuelto ? "Corregir y reenviar" : "Ver mi entrega"), h("a", { class: "btn", href: "#/evaluacion/transferencia" }, "Transferencia", icon("siguiente"))));
      report(); return;
    }
    var g = stt.global;
    mnt.appendChild(h("section", { class: "gate-hero" }, h("div", { style: { display: "flex", gap: "1.6rem", alignItems: "center", flexWrap: "wrap" } },
      h("div", { class: "ringbig", style: "--v:" + (g / 100).toFixed(3) + ";width:150px;height:150px;font-size:1.6rem" }, h("span", null, fmt(g))),
      h("div", null, h("span", { class: "eyebrow" }, "Nota global"),
        h("h2", { style: { color: "#fff", margin: ".5rem 0 .3rem" } }, stt.pass ? "¡Aprobado!" : stt.pend ? "Aprobación pendiente de subsanación" : "Aún no apruebas"),
        h("p", { style: { margin: 0 } }, fmt(R.pe * 100) .replace(",0", "") + " % × " + fmt(b.pct) + " (situaciones) + " + fmt(R.pp * 100).replace(",0", "") + " % × " + fmt(pb.pct) + " (proyecto) = " + fmt(g) + ". Necesitas " + R.umbral + " global y " + R.up + " en el proyecto.")))));
    var rows = [["Situaciones aplicadas (mejor intento)", fmt(b.pct) + " / 100 · forma " + b.forma + " · " + stt.attempts + " de " + stt.max + " intentos"],
      ["Proyecto de desempeño (mejor intento)", fmt(pb.pct) + " / 100 · forma " + pb.forma + " · " + stt.pattempts + " de " + stt.pmax + " intentos" + (stt.pend ? " · fallo crítico pendiente" : "")],
      ["Nota global", fmt(g) + " / 100 (umbral " + R.umbral + ")"],
      ["Resultado informado al LMS", stt.pass ? "Aprobado (passed)" : "No aprobado (failed)" + (stt.final ? "" : " · aún puedes mejorar")],
      ["Tiempo activo en el curso", IATU.fx.fmtTime(store.totalTime())]];
    mnt.appendChild(h("div", { class: "table-wrap" }, h("table", { class: "data" }, h("tbody", null, rows.map(function (x) { return h("tr", null, h("th", { scope: "row" }, x[0]), h("td", null, x[1])); })))));
    if (!stt.pass && !stt.final) {
      var tips = [];
      if (stt.pend) tips.push("Subsana el fallo crítico del proyecto: es lo único que se interpone si tu nota ya alcanza.");
      if (pb.pct < R.up && stt.pattempts < stt.pmax) tips.push("Tu proyecto está bajo " + R.up + ": usa el segundo intento (forma B).");
      if (stt.attempts < stt.max) tips.push("Puedes subir la parte de situaciones con la forma B.");
      if (tips.length) mnt.appendChild(h("div", { class: "callout info" }, h("h3", null, icon("idea"), " Cómo mejorar"), h("ul", null, tips.map(function (t) { return h("li", null, t); }))));
    }
    var row = h("div", { class: "btn-row" }, h("a", { class: "btn", href: "#/evaluacion/examen" }, icon("ver"), "Situaciones"), h("a", { class: "btn", href: "#/evaluacion/proyecto" }, icon("proyecto"), "Proyecto"),
      h("a", { class: "btn btn-primary", href: "#/evaluacion/transferencia" }, "Transferencia", icon("siguiente")));
    mnt.appendChild(row);
    if (stt.pass && !(store.root.cel || {}).global) { (store.root.cel = store.root.cel || {}).global = 1; IATU.fx.celebrate("✓", "Curso aprobado", fmt(g) + " de 100 de nota global."); }
    report();
  }

  /* ---------- Transferencia (formativa) ---------- */
  function transferencia(mnt) {
    var T = IATU.data.curso.orientation.transfer;
    head(mnt, "Transferencia", "Lleva el criterio a una tarea nueva");
    mnt.appendChild(h("p", { class: "note" }, T.minutes + " minutos estimados · formativo, sin nota."));
    mnt.appendChild(u.docView({ tab: "Caso ficticio de transferencia", text: T.input }));
    mnt.appendChild(h("div", { class: "callout" }, h("h3", null, "Tarea"), u.paragraphs(T.task, "")));
    var rec = store.get("x", "transfer") || {};
    function area(key, label) {
      var id = u.newId("tf"), ta = h("textarea", { id: id, rows: 7 }, rec[key] || "");
      ta.addEventListener("input", function () { rec[key] = ta.value; store.put("x", "transfer", rec); });
      mnt.appendChild(h("label", { class: "fl", for: id }, label)); mnt.appendChild(ta);
    }
    area("proc", "Procedimiento actual, tarea acotada y tu propuesta");
    var ref = h("div", { class: "ref", hidden: !rec.r1 }, h("span", { class: "ref-label" }, "Referencia"), T.reference);
    var b1 = h("button", { class: "btn btn-sm", type: "button" }, icon("ver"), "Comparar con la referencia");
    b1.addEventListener("click", function () { ref.hidden = false; rec.r1 = true; store.put("x", "transfer", rec); });
    mnt.appendChild(h("div", { class: "btn-row" }, b1)); mnt.appendChild(ref);
    mnt.appendChild(h("h2", null, "Revisa una salida"));
    mnt.appendChild(u.docView({ tab: "Aviso nuevo (insumo)", text: T.new_input }));
    mnt.appendChild(h("div", { class: "output" }, h("div", { class: "oh" }, h("b", null, "Salida a revisar"), h("span", { class: "tag tag-brick" }, "Revisar")), h("p", { style: { margin: 0 } }, T.model_output)));
    area("rev", "Tu revisión: qué cambia, con qué evidencia");
    var rv = h("div", { class: "ref", hidden: !rec.r2 }, h("span", { class: "ref-label" }, "Pauta de revisión"), T.review);
    var b2 = h("button", { class: "btn btn-sm", type: "button" }, icon("ver"), "Ver la pauta");
    b2.addEventListener("click", function () { rv.hidden = false; rec.r2 = true; store.put("x", "transfer", rec); });
    mnt.appendChild(h("div", { class: "btn-row" }, b2)); mnt.appendChild(rv);
    var tarea = store.peek && store.peek("orientacion");
    var t0 = tarea && tarea.o && tarea.o.tarea;
    if (t0 && t0.tarea) mnt.appendChild(h("div", { class: "callout info" }, h("h3", null, "Tu tarea inicial"), h("p", null, t0.tarea), h("p", { class: "note" }, "¿En qué nivel la ubicarías hoy y qué control agregarías?")));
  }

  function cierre(mnt) {
    var O = IATU.data.curso.orientation;
    head(mnt, "Cierre", "Cierre del programa");
    mnt.appendChild(M.audioPlayer("IATU-CIERRE_CURSO"));
    mnt.appendChild(h("p", { class: "lead reading" }, O.finish));
    // «pilot» del maestro es una nota de producción (pendientes del pilotaje): no se muestra al participante.
    mnt.appendChild(h("div", { class: "callout info reading" }, h("p", null, "Este curso está en su primera versión. Si algo no se entendió o encontraste un error, cuéntaselo a tu equipo formador: tus comentarios nos ayudan a mejorarlo.")));
  }

  function rubricTable(rub) {
    return h("div", { class: "table-wrap" }, h("table", { class: "rubric" },
      h("thead", null, h("tr", null, h("th", { scope: "col" }, "Criterio"), [0, 1, 2, 3].map(function (n) { return h("th", { scope: "col" }, "Nivel " + n); }))),
      h("tbody", null, rub.map(function (c) { return h("tr", null, h("th", { scope: "row" }, c.id + " · " + c.title + " (" + c.weight + " %)"), [0, 1, 2, 3].map(function (n) { return h("td", null, c.levels[String(n)]); })); }))));
  }
  IATU.evaluacion = {
    status: status, lms: lms, corregirItem: corregirItem, corregirProyecto: corregirProyecto,
    sincronizar: sincronizar, recibirEvaluacion: function (ev) { var c = aplicarEvaluacion(ev); if (c) IATU.app.refreshProgress(); return c; },
    render: function (mnt, page, api) {
      ({ requisitos: function () { gate(mnt, api); }, examen: function () { examen(mnt); }, proyecto: function () { proyecto(mnt); },
        resultado: function () { resultado(mnt); }, transferencia: function () { transferencia(mnt); }, cierre: function () { cierre(mnt); } }[page] || function () { gate(mnt, api); })();
    }
  };
})();
