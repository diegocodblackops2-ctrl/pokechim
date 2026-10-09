/* Curso 5 — Evaluación dentro del SCORM (decisión de Diego, 9-oct-2026).
   - Se habilita solo cuando las 17 secciones (orientación y 16 módulos) cumplen sus requisitos.
   - Forma A en el primer intento y B en el segundo (máximo configurable, 2 por defecto).
   - Corrección 3 (decisión) + 2 (evidencia) por situación; nota = 100 × puntos / 320; aprobado con 80 o más.
   - Informa al LMS: cmi.score (raw/scaled/min/max), success_status (passed/failed), completion_status e interacciones.
   - El banco viaja OFUSCADO en data/eval.js: evita la lectura casual de claves, NO es seguridad. Ver docs/INTEGRACION_DIBORK.md.
   - El proyecto se entrega como evidencia para revisión humana y no bloquea la aprobación. */
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

  function status() {
    var hs = hist(), b = best();
    return { sent: hs.length > 0, pass: !!(b && b.pass), best: b ? b.pct : null, attempts: hs.length, max: maxIntentos(), inProgress: !!X().ex };
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
          ? "64 situaciones aplicadas con expediente. Necesitas " + umbral() + " o más para aprobar. Tienes " + (stt.max - stt.attempts) + " de " + stt.max + " intentos disponibles."
          : "Llevas " + cp.secs + " de " + cp.nsecs + " secciones completas (" + Math.round(cp.pct * 100) + " % de los requisitos). La evaluación se abre sola cuando termines.")))));
    var C = IATU.data.curso;
    mnt.appendChild(h("div", { class: "stats" },
      [["64", "situaciones por forma (A o B)"], ["4", "bloques de 16, con pausa"], ["3 + 2", "puntos: decisión + evidencia"], ["≥ " + umbral(), "para aprobar"]].map(function (s) { return h("div", { class: "stat" }, h("b", null, s[0]), h("span", null, s[1])); })));
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
      var row = h("div", { class: "btn-row" });
      if (stt.inProgress) row.appendChild(h("a", { class: "btn btn-primary", href: "#/evaluacion/examen" }, icon("jugar"), "Continuar mi intento"));
      else if (stt.pass || stt.attempts >= stt.max) row.appendChild(h("a", { class: "btn btn-primary", href: "#/evaluacion/resultado" }, icon("medalla"), "Ver mi resultado"));
      else row.appendChild(h("a", { class: "btn btn-primary", href: "#/evaluacion/examen" }, icon("bandera"), stt.attempts ? "Usar mi segundo intento (forma B)" : "Ir a las situaciones aplicadas"));
      row.appendChild(h("a", { class: "btn", href: "#/evaluacion/proyecto" }, icon("proyecto"), "Proyecto de desempeño"));
      mnt.appendChild(row);
    }
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
        h("li", null, "Intento " + (stt.attempts + 1) + " de " + stt.max + " · forma " + f + ". Apruebas con " + umbral() + " o más."))));
    var b = h("button", { class: "btn btn-primary", type: "button" }, icon("bandera"), "Iniciar forma " + f);
    b.addEventListener("click", function () {
      X().ex = { n: stt.attempts + 1, forma: f, ans: {}, idx: 0, ini: new Date().toISOString() };
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
  function report() {
    var b = best(), stt = status(), cp = IATU.app.courseProg();
    if (!b) return;
    var final = stt.pass || stt.attempts >= stt.max;
    store.setCompletion({ completed: cp.complete, success: b.pass ? "passed" : "failed", raw: Math.round(b.pct * 100) / 100, scaled: b.pct / 100, max: 100, final: final, progress: 1 });
    store.section("obj-evaluacion", b.pass, 1);
  }

  function results(box, at, fresh) {
    if (!at) { box.appendChild(h("p", null, "Aún no entregas ninguna forma.")); return; }
    var units = forma(at.forma), stt = status();
    var ring = h("div", { class: "ringbig", style: "--v:" + (at.pct / 100).toFixed(3) + ";width:150px;height:150px;font-size:1.6rem" }, h("span", null, fmt(at.pct)));
    box.appendChild(h("section", { class: "gate-hero" }, h("div", { style: { display: "flex", gap: "1.6rem", alignItems: "center", flexWrap: "wrap" } }, ring,
      h("div", null, h("span", { class: "eyebrow" }, "Forma " + at.forma + " · intento " + at.n + " de " + stt.max),
        h("h2", { style: { color: "#fff", margin: ".5rem 0 .3rem" } }, at.pass ? "¡Aprobado!" : "Aún no alcanzas el " + umbral()),
        h("p", { style: { margin: 0 } }, at.raw + " de " + at.max + " puntos · " + fmt(at.pct) + " de 100. " + (at.pass ? "Tu resultado quedó informado al LMS." : stt.attempts < stt.max ? "Revisa la devolución y usa tu segundo intento con la forma B." : "Usaste tus intentos. Revisa la devolución con tu equipo formador."))))));
    if (fresh && at.pass) IATU.fx.celebrate("✓", "Evaluación aprobada", fmt(at.pct) + " de 100 en situaciones aplicadas.");
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
    if (!stt.pass && stt.attempts < stt.max) row.appendChild(h("a", { class: "btn btn-primary", href: "#/evaluacion/examen" }, icon("reintentar"), "Usar mi segundo intento (forma B)"));
    row.appendChild(h("a", { class: "btn" + (stt.pass ? " btn-primary" : ""), href: "#/evaluacion/proyecto" }, icon("proyecto"), "Ir al proyecto"));
    box.appendChild(row);
  }

  /* ---------- Proyecto (evidencia para revisión humana; no bloquea la aprobación) ---------- */
  function proyecto(mnt) {
    head(mnt, "Proyecto de desempeño", "Proyecto de desempeño");
    if (!IATU.app.courseProg().complete) return blocked(mnt);
    var box = h("div", null, h("p", { class: "loading" }, "Cargando tu expediente…"));
    mnt.appendChild(box);
    loadEval().then(function () { u.clear(box); renderProject(box); }, function (e) { u.clear(box); box.appendChild(h("div", { class: "callout risk" }, e.message)); });
  }
  function renderProject(box) {
    var x = X(), pr = x.proj || (x.proj = { forma: hist().length > 1 ? "B" : "A", ev: [], upd: "" });
    var p = proyectos()[pr.forma], C = IATU.data.curso, locked = !!pr.sent;
    box.appendChild(h("div", { class: "callout info reading" }, h("p", null, h("b", null, "Cómo se usa: "), "el proyecto es tu evidencia de desempeño para la revisión humana de Dibork. Tu aprobación en el LMS depende de las situaciones aplicadas; el proyecto no la bloquea. Al entregar, descarga tu copia y súbela donde indique tu equipo formador.")));
    box.appendChild(h("div", { class: "meta-row" }, h("span", { class: "tag tag-violet" }, "Forma " + p.form), h("span", { class: "tag" }, icon("reloj"), " " + p.minutes / 60 + " h estimadas"), h("span", { class: "tag " + (locked ? "tag-teal" : "") }, locked ? "Entregado" : "Borrador")));
    box.appendChild(h("h2", null, p.title));
    box.appendChild(h("p", null, h("b", null, "Rol: "), p.role, " · ", h("b", null, "Destinatarios: "), p.audience));
    box.appendChild(h("p", { class: "lead reading" }, p.purpose));
    box.appendChild(h("div", { class: "callout warn reading" }, h("h3", null, icon("limite"), " Restricciones"), h("p", null, p.restrictions)));
    box.appendChild(h("h3", null, "Plan de trabajo sugerido"));
    box.appendChild(h("ol", { class: "ws-steps" }, p.workplan.map(function (s, i) { return h("li", null, h("b", null, (i + 1) + ". " + s.stage), s.minutes + " min"); })));
    var docs = h("details", { open: !locked }, h("summary", null, h("b", null, "Expediente completo (" + p.documents.length + " documentos)")));
    p.documents.forEach(function (d) { docs.appendChild(u.docView({ tab: d.id + " · " + d.classification, title: d.title, text: d.text })); });
    box.appendChild(docs);
    box.appendChild(h("div", { class: "callout" }, h("h3", null, "Encargo"), h("p", null, p.task)));
    box.appendChild(h("h3", null, "Rúbrica pública"));
    box.appendChild(rubricTable(C.rubric));
    box.appendChild(h("p", { class: "note reading" }, p.accepted));
    box.appendChild(h("p", { class: "note reading" }, h("b", null, "Fallos críticos: "), p.critical_policy));
    box.appendChild(h("h2", null, "Tus ocho evidencias"));
    p.expected_evidence.forEach(function (lab, i) {
      var id = u.newId("ev"), ta = h("textarea", { id: id, rows: 6, disabled: locked }, pr.ev[i] || "");
      ta.addEventListener("input", function () { pr.ev[i] = ta.value; persist(); });
      box.appendChild(h("label", { class: "fl", for: id }, (i + 1) + ". " + lab)); box.appendChild(ta);
    });
    box.appendChild(h("h3", null, "Actualización del expediente"));
    box.appendChild(u.docView({ tab: "Actualización autorizada", text: p.update }));
    var uid = u.newId("upd"), upd = h("textarea", { id: uid, rows: 6, disabled: locked }, pr.upd || "");
    upd.addEventListener("input", function () { pr.upd = upd.value; persist(); });
    box.appendChild(h("label", { class: "fl", for: uid }, "Cómo aplicaste la actualización a todos los productos afectados")); box.appendChild(upd);
    function exportar() {
      var t = "PROYECTO DE DESEMPEÑO · Curso 5 · IA para trabajar mejor\nForma " + p.form + " · " + p.title + "\nParticipante: " + (store.adapter.learnerName ? store.adapter.learnerName() || store.learner : store.learner) + "\nFecha: " + new Date().toLocaleString("es-CL") + "\n\n";
      p.expected_evidence.forEach(function (lab, i) { t += "== " + (i + 1) + ". " + lab + " ==\n" + (pr.ev[i] || "(vacío)") + "\n\n"; });
      t += "== Actualización del expediente ==\n" + (pr.upd || "(vacío)") + "\n";
      u.download("IATU_proyecto_forma_" + p.form + ".txt", t);
    }
    var dl = h("button", { class: "btn", type: "button" }, icon("descargar"), "Descargar mi proyecto");
    dl.addEventListener("click", exportar);
    if (!locked) {
      var cf = h("label", { class: "opt", style: { maxWidth: "620px" } }, h("input", { type: "checkbox" }), h("span", null, "Entrego mi proyecto como evidencia para revisión humana. Confirmo que usé solo datos del expediente ficticio y que no envié, publiqué ni conecté servicios reales."));
      var send = h("button", { class: "btn btn-primary", type: "button", disabled: true }, icon("enviar"), "Entregar proyecto");
      cf.firstChild.addEventListener("change", function (e2) { send.disabled = !e2.target.checked; });
      send.addEventListener("click", function () {
        pr.sent = new Date().toISOString(); persist(true);
        store.interaction({ id: "IATU-PROYECTO-" + p.form, type: "long-fill-in", response: "entregado", description: "Proyecto entregado como evidencia" });
        exportar(); u.clear(box); renderProject(box);
        IATU.fx.celebrate("★", "Proyecto entregado", "Descargamos tu copia para la revisión humana.");
      });
      box.appendChild(cf); box.appendChild(h("div", { class: "btn-row" }, send, dl));
    } else {
      box.appendChild(h("div", { class: "callout" }, h("h3", null, "Proyecto entregado"), h("p", null, "Entregado el " + new Date(pr.sent).toLocaleString("es-CL") + ". Una persona revisora de Dibork lo evaluará con la rúbrica. Guarda tu copia descargada."), h("div", { class: "btn-row" }, dl)));
    }
  }

  /* ---------- Resultado ---------- */
  function resultado(mnt) {
    head(mnt, "Resultado", "Tu resultado");
    var stt = status(), b = best(), pr = X().proj;
    if (!stt.sent) { mnt.appendChild(h("p", null, "Aún no entregas las situaciones aplicadas.")); mnt.appendChild(h("a", { class: "btn btn-primary", href: "#/evaluacion/requisitos" }, "Ir a la evaluación")); return; }
    var rows = [["Situaciones aplicadas (mejor intento)", fmt(b.pct) + " / 100 · forma " + b.forma],
      ["Intentos usados", stt.attempts + " de " + stt.max], ["Umbral de aprobación", umbral() + " / 100"],
      ["Resultado informado al LMS", b.pass ? "Aprobado (passed)" : "No aprobado (failed)"],
      ["Proyecto de desempeño", pr && pr.sent ? "Entregado para revisión humana" : "Sin entregar (no bloquea la aprobación)"],
      ["Tiempo activo en el curso", IATU.fx.fmtTime(store.totalTime())]];
    mnt.appendChild(h("div", { class: "table-wrap" }, h("table", { class: "data" }, h("tbody", null, rows.map(function (x) { return h("tr", null, h("th", { scope: "row" }, x[0]), h("td", null, x[1])); })))));
    var row = h("div", { class: "btn-row" }, h("a", { class: "btn", href: "#/evaluacion/examen" }, icon("ver"), "Ver la devolución"), h("a", { class: "btn btn-primary", href: "#/evaluacion/transferencia" }, "Transferencia", icon("siguiente")));
    mnt.appendChild(row);
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
    mnt.appendChild(h("div", { class: "callout info reading" }, h("p", null, IATU.data.curso.pilot)));
  }

  function rubricTable(rub) {
    return h("div", { class: "table-wrap" }, h("table", { class: "rubric" },
      h("thead", null, h("tr", null, h("th", { scope: "col" }, "Criterio"), [0, 1, 2, 3].map(function (n) { return h("th", { scope: "col" }, "Nivel " + n); }))),
      h("tbody", null, rub.map(function (c) { return h("tr", null, h("th", { scope: "row" }, c.id + " · " + c.title + " (" + c.weight + " %)"), [0, 1, 2, 3].map(function (n) { return h("td", null, c.levels[String(n)]); })); }))));
  }
  IATU.evaluacion = {
    status: status,
    render: function (mnt, page, api) {
      ({ requisitos: function () { gate(mnt, api); }, examen: function () { examen(mnt); }, proyecto: function () { proyecto(mnt); },
        resultado: function () { resultado(mnt); }, transferencia: function () { transferencia(mnt); }, cierre: function () { cierre(mnt); } }[page] || function () { gate(mnt, api); })();
    }
  };
})();
