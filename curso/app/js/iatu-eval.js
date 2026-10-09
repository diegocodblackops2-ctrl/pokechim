/* Curso 5 — SCO de evaluación.
   El cliente NO contiene banco, claves ni soluciones: el servicio autorizado entrega la forma (A/B) después
   de verificar requisitos, guarda respuestas, corrige (3 decisión + 2 evidencia) y libera la devolución
   solo tras entregar la forma completa. El proyecto queda "pendiente de revisión" hasta revisión humana real.
   Sin servicio configurado, el examen formal permanece bloqueado (no se finge seguridad ocultando claves). */
(function () {
  "use strict";
  var IATU = window.IATU = window.IATU || {};
  var u = IATU.u, h = u.h, icon = u.icon, store = IATU.store, S = IATU.service, M = IATU.media, I = IATU.inter;

  function head(mnt, k, t) { mnt.appendChild(h("div", { class: "crumbs" }, "Evaluación y proyecto")); mnt.appendChild(h("span", { class: "kicker" }, k)); mnt.appendChild(h("h1", null, t)); }
  function noService(mnt) {
    mnt.appendChild(h("div", { class: "callout risk reading" },
      h("h3", null, icon("candado-abierto"), " Evaluación formal no disponible en este paquete"),
      h("p", null, "Las situaciones aplicadas y el proyecto se corrigen en el servicio autorizado de Dibork Learning, que guarda el banco privado, verifica tus requisitos y registra la revisión humana. Este paquete no tiene ese servicio configurado, por eso la evaluación permanece bloqueada."),
      h("p", { class: "note" }, "Para integradores: configurar IATU_CONFIG.servicio.url (ver docs/INTEGRACION_DIBORK.md).")));
  }
  function errBox(e) { return h("div", { class: "callout risk", role: "alert" }, h("p", null, (e && e.message) || "Error del servicio."), e && e.data && e.data.faltan ? h("p", null, "Pendientes informados por el servicio: " + e.data.faltan.join(", ")) : null); }

  /* ---------- Requisitos ---------- */
  function requisitos(mnt, api) {
    head(mnt, "Requisitos", "Antes de la evaluación");
    var C = IATU.data.curso;
    mnt.appendChild(h("p", { class: "reading" }, C.evaluation_rules));
    var R = C.exam_public;
    mnt.appendChild(h("div", { class: "stats" },
      [["64", "situaciones por forma (A o B)"], ["4", "bloques de 16, con pausa"], ["3 + 2", "puntos: decisión + evidencia"], ["40 % / 60 %", "situaciones / proyecto"]].map(function (s) { return h("div", { class: "stat" }, h("b", null, s[0]), h("span", null, s[1])); })));
    mnt.appendChild(h("p", { class: "note reading" }, R.count_definition + " " + R.feedback_policy));
    mnt.appendChild(h("h2", null, "Tu avance obligatorio"));
    var obj = store.objectives() || {};
    var list = h("ul", { class: "gate-list" });
    var missing = 0;
    C.scos.filter(function (s) { return s !== "evaluacion"; }).forEach(function (sco) {
      var st = obj["obj-" + sco];
      var known = st !== undefined;
      var ok = st === "passed";
      if (!ok) missing++;
      var title = sco === "orientacion" ? "Orientación" : "Módulo " + parseInt(sco.slice(1), 10) + " · " + C.modules[parseInt(sco.slice(1), 10) - 1].title;
      var link;
      if (!store.isLMS()) link = h("a", { href: "#/" + (sco === "orientacion" ? "orientacion/bienvenida" : sco + "/cierre") }, ok ? "Revisar" : "Ver pendientes");
      else {
        link = h("button", { class: "btn btn-sm", type: "button" }, "Abrir");
        link.addEventListener("click", function () { if (!store.navChoice("ITEM-" + sco.toUpperCase())) u.toast("Abre este módulo desde el índice del curso."); });
      }
      list.appendChild(h("li", { class: ok ? "ok" : "" }, api.statusIcon(ok), h("span", { class: "grow" }, title), h("span", { class: "note" }, ok ? "Completo" : known ? "Pendiente" : "Sin dato del LMS"), ok ? null : link));
    });
    mnt.appendChild(list);
    if (store.isLMS() && store.adapter.kind === "scorm12") mnt.appendChild(h("p", { class: "note" }, "SCORM 1.2 no permite que este SCO lea el estado de los otros módulos; la verificación la realiza el servicio autorizado y, si el LMS lo admite, los prerrequisitos del manifiesto."));
    var srv = h("div");
    mnt.appendChild(h("h2", null, "Verificación del servicio autorizado"));
    mnt.appendChild(srv);
    if (!S.configured()) { noService(srv); return; }
    srv.appendChild(h("p", { class: "loading" }, "Consultando…"));
    S.call("GET", "/api/v1/requisitos").then(function (r) {
      u.clear(srv);
      if (r.ok) srv.appendChild(h("div", { class: "callout" }, h("h3", null, icon("candado-abierto"), " Requisitos verificados"), h("p", null, "Puedes iniciar las situaciones aplicadas y el proyecto."), h("div", { class: "btn-row" }, h("a", { class: "btn btn-primary", href: "#/evaluacion/examen" }, "Ir a las situaciones aplicadas", icon("siguiente")))));
      else srv.appendChild(h("div", { class: "callout warn" }, h("h3", null, icon("privado"), " Evaluación bloqueada"), h("p", null, "El servicio informa pendientes en: " + r.faltan.map(nombreSco).join(", ") + "."), h("p", { class: "note" }, "Completa lo obligatorio de cada módulo (sin exigir acierto) y vuelve aquí.")));
    }, function (e) { u.clear(srv); srv.appendChild(errBox(e)); });
  }
  function nombreSco(s) { return s === "orientacion" ? "Orientación" : /^m\d\d$/.test(s) ? "Módulo " + parseInt(s.slice(1), 10) : s; }

  /* ---------- Examen ---------- */
  var exam = null; // {attempt, units, answers, idx}
  function examen(mnt) {
    head(mnt, "Situaciones aplicadas", "Situaciones aplicadas");
    if (!S.configured()) return noService(mnt);
    var box = h("div", null, h("p", { class: "loading" }, "Consultando tu intento…"));
    mnt.appendChild(box);
    S.call("GET", "/api/v1/intentos/actual").then(function (r) {
      u.clear(box);
      if (r.intento && r.intento.estado === "en_curso") { exam = { a: r.intento, idx: r.intento.posicion || 0 }; return runExam(box); }
      if (r.intento && r.intento.estado === "entregado") return results(box, r.intento);
      startScreen(box, r);
    }, function (e) { u.clear(box); box.appendChild(errBox(e)); });
  }
  function startScreen(box, r) {
    box.appendChild(h("div", { class: "reading" },
      h("p", null, "Cada situación tiene un expediente que permanece visible mientras respondes. Primero eliges la decisión y luego la evidencia que la sustenta. Son partes de una misma unidad: 3 puntos por la decisión y 2 por la evidencia, de forma independiente."),
      h("ul", null,
        h("li", null, "Puedes pausar entre bloques y volver: tus respuestas quedan guardadas en el servicio."),
        h("li", null, "Puedes revisar y cambiar respuestas antes de entregar."),
        h("li", null, "La devolución se muestra después de entregar la forma completa."),
        h("li", null, "Intentos usados: " + (r.usados || 0) + " de " + (r.maximo || 2) + ". El segundo intento usa la otra forma."))));
    var b = h("button", { class: "btn btn-primary", type: "button", disabled: (r.usados || 0) >= (r.maximo || 2) }, icon("bandera"), "Iniciar intento");
    b.addEventListener("click", function () {
      b.disabled = true;
      S.call("POST", "/api/v1/intentos", {}).then(function (a) { exam = { a: a.intento, idx: 0 }; u.clear(box); runExam(box); },
        function (e) { b.disabled = false; box.appendChild(errBox(e)); });
    });
    box.appendChild(h("div", { class: "btn-row" }, b));
  }
  var saveAnswers = u.debounce(function () {
    if (!exam) return;
    S.call("PUT", "/api/v1/intentos/" + exam.a.id + "/respuestas", { respuestas: exam.a.respuestas, posicion: exam.idx })
      .then(function () { store.setStatus("lms", "Respuestas guardadas en el servicio"); }, function () { store.setStatus("error", "No se confirmó el guardado de respuestas; reintenta antes de salir."); });
  }, 800);
  function runExam(box) {
    var units = exam.a.unidades, ans = exam.a.respuestas = exam.a.respuestas || {};
    var mapBox = h("nav", { class: "unit-map", "aria-label": "Mapa de situaciones" });
    var stage = h("div");
    var status = h("p", { class: "note" });
    box.appendChild(h("div", { class: "meta-row" }, h("span", { class: "tag tag-violet" }, "Forma " + exam.a.forma), h("span", { class: "tag" }, "Intento " + exam.a.numero), status));
    box.appendChild(mapBox);
    box.appendChild(stage);
    function stateOf(id) { var a = ans[id] || {}; return a.d && a.e ? "ans" : (a.d || a.e) ? "part" : ""; }
    function renderMap() {
      u.clear(mapBox);
      units.forEach(function (un, i) {
        var a = ans[un.id] || {};
        var b = h("button", { type: "button", class: stateOf(un.id) + (a.f ? " flag" : ""), "aria-current": i === exam.idx ? "true" : null, "aria-label": "Situación " + (i + 1) + (stateOf(un.id) === "ans" ? ", respondida" : stateOf(un.id) === "part" ? ", incompleta" : ", sin responder") + (a.f ? ", marcada" : "") }, String(i + 1));
        b.addEventListener("click", function () { exam.idx = i; render(); });
        mapBox.appendChild(b);
      });
      var n = units.filter(function (x) { return stateOf(x.id) === "ans"; }).length;
      status.textContent = n + " de " + units.length + " completas · bloque " + (Math.floor(exam.idx / 16) + 1) + " de 4";
    }
    function render() {
      renderMap();
      u.clear(stage);
      if (exam.idx >= units.length) return review();
      var un = units[exam.idx], a = ans[un.id] || (ans[un.id] = {});
      var lay = h("div", { class: "exam-layout" });
      var ctx = h("div", { class: "ctx" }, u.docView({ tab: "Expediente · situación " + (exam.idx + 1), title: un.title, text: un.input }));
      var q = h("div");
      q.appendChild(h("h2", { tabindex: "-1", style: { marginTop: ".4rem" } }, "Situación " + (exam.idx + 1) + " de " + units.length));
      q.appendChild(h("p", { class: "lead", style: { fontSize: "1.05rem" } }, un.task));
      function group(legend, opts, key, name) {
        var fs = h("fieldset", { class: "opts" }, h("legend", null, legend));
        opts.forEach(function (o) {
          var r = h("input", { type: "radio", name: name, value: o.id, checked: a[key] === o.id });
          r.addEventListener("change", function () { a[key] = o.id; saveAnswers(); renderMap(); });
          fs.appendChild(h("label", { class: "opt" }, r, h("span", { class: "oid" }, o.id), h("span", null, o.text)));
        });
        return fs;
      }
      q.appendChild(group("Decisión", un.options, "d", un.id + "-d"));
      q.appendChild(group("Evidencia que mejor la sustenta", un.evidence_options, "e", un.id + "-e"));
      var flag = h("label", { class: "opt", style: { maxWidth: "340px" } }, h("input", { type: "checkbox", checked: !!a.f }), h("span", null, "Marcar para revisar antes de entregar"));
      flag.firstChild.addEventListener("change", function (ev) { a.f = ev.target.checked; saveAnswers(); renderMap(); });
      q.appendChild(flag);
      var prev = h("button", { class: "btn", type: "button", disabled: exam.idx === 0 }, icon("anterior"), "Anterior");
      prev.addEventListener("click", function () { exam.idx--; saveAnswers(); render(); });
      var next = h("button", { class: "btn btn-primary", type: "button" }, exam.idx + 1 < units.length ? "Siguiente" : "Revisar y entregar", icon("siguiente"));
      next.addEventListener("click", function () { exam.idx++; saveAnswers(); render(); });
      var pause = h("button", { class: "btn btn-ghost", type: "button" }, icon("pausa"), "Pausar");
      pause.addEventListener("click", function () { saveAnswers(); u.toast("Tu intento quedó guardado. Puedes volver cuando quieras."); });
      q.appendChild(h("div", { class: "btn-row" }, prev, next, pause));
      if ((exam.idx + 1) % 16 === 0 && exam.idx + 1 < units.length) q.appendChild(h("p", { class: "note" }, "Fin del bloque " + ((exam.idx + 1) / 16) + ". Buen momento para una pausa."));
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
      var confirm = h("label", { class: "opt", style: { maxWidth: "520px" } }, h("input", { type: "checkbox" }), h("span", null, "Revisé mis respuestas y quiero entregar la forma " + exam.a.forma + ". Después de entregar no podré cambiarlas."));
      var send = h("button", { class: "btn btn-primary", type: "button", disabled: true }, icon("enviar"), "Entregar forma");
      confirm.firstChild.addEventListener("change", function (ev) { send.disabled = !ev.target.checked; });
      send.addEventListener("click", function () {
        send.disabled = true;
        S.call("PUT", "/api/v1/intentos/" + exam.a.id + "/respuestas", { respuestas: ans, posicion: exam.idx })
          .then(function () { return S.call("POST", "/api/v1/intentos/" + exam.a.id + "/entregar", {}); })
          .then(function (r) {
            store.put("x", "examen", { entregado: true, intento: exam.a.id }, { now: true });
            reportUnits(r.intento);
            exam = null; u.clear(box); results(box, r.intento);
          }, function (e) { send.disabled = false; c.appendChild(errBox(e)); });
      });
      c.appendChild(confirm);
      c.appendChild(h("div", { class: "btn-row" }, send));
      stage.appendChild(c);
      c.querySelector("h2").focus();
    }
    render();
  }
  function reportUnits(at) {
    (at.resultado.unidades || []).forEach(function (r) {
      store.interaction({ id: r.id, type: "choice", response: (r.d || "") + "/" + (r.e || ""), result: r.puntos === 5 ? "correct" : r.puntos ? "neutral" : "incorrect", description: "Unidad " + r.id });
    });
  }
  function results(box, at) {
    var R = at.resultado;
    box.appendChild(h("div", { class: "card" },
      h("p", { class: "note", style: { margin: 0 } }, "Forma " + at.forma + " · intento " + at.numero + " · entregada " + new Date(at.entregado).toLocaleString("es-CL")),
      h("div", { class: "score-big" }, R.normalizado.toFixed(2).replace(".", ",")),
      h("p", null, "de 100 en situaciones aplicadas (" + R.bruto + " de " + R.maximo + " puntos). Pondera 40 % de la nota global."),
      h("p", { class: "note" }, "La aprobación final depende también del proyecto (60 %) y su revisión humana.")));
    if (R.por_modulo) {
      box.appendChild(h("h2", null, "Por objetivo"));
      box.appendChild(h("div", { class: "table-wrap" }, h("table", { class: "data" }, h("thead", null, h("tr", null, h("th", null, "Módulo"), h("th", null, "Puntos"), h("th", null, "Sugerencia"))),
        h("tbody", null, Object.keys(R.por_modulo).map(function (m) {
          var v = R.por_modulo[m];
          return h("tr", null, h("td", null, "Módulo " + parseInt(m, 10)), h("td", null, v.puntos + " / " + v.maximo), h("td", null, v.puntos / v.maximo < 0.6 ? "Repasar talleres y práctica del módulo" : "—"));
        })))));
    }
    box.appendChild(h("h2", null, "Devolución por situación"));
    (R.unidades || []).forEach(function (r, i) {
      var d = h("details", { class: "card", style: { marginBottom: ".5rem" } });
      d.appendChild(h("summary", null, h("b", null, (i + 1) + ". " + r.titulo), " · ", h("span", { class: "tag " + (r.puntos === 5 ? "tag-teal" : r.puntos ? "tag-ochre" : "tag-brick") }, r.puntos + " / 5")));
      d.appendChild(h("p", null, h("b", null, "Tu decisión: "), (r.d || "sin respuesta") + (r.d_ok ? " ✓" : "") + " · ", h("b", null, "Tu evidencia: "), (r.e || "sin respuesta") + (r.e_ok ? " ✓" : "")));
      if (r.razon_d) d.appendChild(h("p", null, h("b", null, "Sobre tu decisión: "), r.razon_d));
      if (r.razon_e) d.appendChild(h("p", null, h("b", null, "Sobre tu evidencia: "), r.razon_e));
      d.appendChild(h("p", null, h("b", null, "Criterio: "), r.justificacion));
      d.appendChild(h("p", { class: "note" }, h("b", null, "Siguiente acción: "), r.siguiente));
      box.appendChild(d);
    });
    box.appendChild(h("div", { class: "btn-row" }, h("a", { class: "btn btn-primary", href: "#/evaluacion/proyecto" }, "Ir al proyecto", icon("siguiente"))));
  }

  /* ---------- Proyecto ---------- */
  function proyecto(mnt) {
    head(mnt, "Proyecto de desempeño", "Proyecto de desempeño");
    if (!S.configured()) return noService(mnt);
    var box = h("div", null, h("p", { class: "loading" }, "Cargando tu expediente…"));
    mnt.appendChild(box);
    S.call("GET", "/api/v1/proyecto").then(function (r) { u.clear(box); renderProject(box, r); }, function (e) { u.clear(box); box.appendChild(errBox(e)); });
  }
  function renderProject(box, r) {
    var p = r.brief, C = IATU.data.curso;
    var ent = r.entrega || {};
    var locked = ent.estado === "pendiente_revision" || ent.estado === "revisado";
    box.appendChild(h("div", { class: "meta-row" }, h("span", { class: "tag tag-violet" }, "Forma " + p.form), h("span", { class: "tag" }, icon("reloj"), " " + p.minutes / 60 + " h estimadas"),
      h("span", { class: "tag " + (ent.estado === "revisado" ? "tag-teal" : ent.estado === "pendiente_revision" ? "tag-ochre" : "") }, estadoTxt(ent.estado))));
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
    var ev = (ent.evidencias || []).slice();
    var save = u.debounce(function () {
      IATU.service.call("PUT", "/api/v1/proyecto/borrador", { evidencias: ev, actualizacion: upd.value })
        .then(function () { store.setStatus("lms", "Borrador del proyecto guardado en el servicio"); }, function () { store.setStatus("error", "No se confirmó el guardado del proyecto"); });
    }, 1200);
    p.expected_evidence.forEach(function (lab, i) {
      var id = u.newId("ev");
      var ta = h("textarea", { id: id, rows: 6, disabled: locked }, ev[i] || "");
      ta.addEventListener("input", function () { ev[i] = ta.value; save(); });
      box.appendChild(h("label", { class: "fl", for: id }, (i + 1) + ". " + lab)); box.appendChild(ta);
    });
    box.appendChild(h("h3", null, "Actualización del expediente"));
    box.appendChild(u.docView({ tab: "Actualización autorizada", text: p.update }));
    var uid = u.newId("upd");
    var upd = h("textarea", { id: uid, rows: 6, disabled: locked }, ent.actualizacion || "");
    upd.addEventListener("input", save);
    box.appendChild(h("label", { class: "fl", for: uid }, "Cómo aplicaste la actualización a todos los productos afectados")); box.appendChild(upd);
    if (!locked) {
      var cf = h("label", { class: "opt", style: { maxWidth: "620px" } }, h("input", { type: "checkbox" }), h("span", null, "Entrego mi proyecto para revisión humana. Confirmo que usé solo datos del expediente ficticio y que no envié, publiqué ni conecté servicios reales."));
      var send = h("button", { class: "btn btn-primary", type: "button", disabled: true }, icon("enviar"), "Entregar proyecto");
      cf.firstChild.addEventListener("change", function (e2) { send.disabled = !e2.target.checked; });
      send.addEventListener("click", function () {
        var empty = ev.filter(function (x, i) { return !(x && x.trim()); }).length + (8 - ev.length);
        if (empty > 0 && !window.confirm("Hay evidencias vacías. ¿Entregar de todas formas? Cada criterio se revisará con lo entregado.")) return;
        send.disabled = true;
        IATU.service.call("PUT", "/api/v1/proyecto/borrador", { evidencias: ev, actualizacion: upd.value })
          .then(function () { return IATU.service.call("POST", "/api/v1/proyecto/entregar", {}); })
          .then(function () { store.put("x", "proyecto", { entregado: true }, { now: true }); u.clear(box); proyectoReload(box); },
            function (e) { send.disabled = false; box.appendChild(errBox(e)); });
      });
      box.appendChild(cf); box.appendChild(h("div", { class: "btn-row" }, send));
    }
    if (ent.estado === "pendiente_revision") box.appendChild(h("div", { class: "callout warn" }, h("h3", null, "Pendiente de revisión humana"), h("p", null, "Tu proyecto fue recibido. Una persona revisora autorizada lo evaluará con la rúbrica. No se asigna nota por subir archivos, extensión ni coincidencia literal.")));
    if (ent.estado === "revisado") box.appendChild(reviewView(ent.revision, C.rubric));
  }
  function proyectoReload(box) { IATU.service.call("GET", "/api/v1/proyecto").then(function (r) { renderProject(box, r); }); }
  function estadoTxt(s) { return { borrador: "Borrador", pendiente_revision: "Pendiente de revisión", revisado: "Revisado" }[s] || "Sin iniciar"; }
  function rubricTable(rub) {
    return h("div", { class: "table-wrap" }, h("table", { class: "rubric" },
      h("thead", null, h("tr", null, h("th", { scope: "col" }, "Criterio"), [0, 1, 2, 3].map(function (n) { return h("th", { scope: "col" }, "Nivel " + n); }))),
      h("tbody", null, rub.map(function (c) { return h("tr", null, h("th", { scope: "row" }, c.id + " · " + c.title + " (" + c.weight + " %)"), [0, 1, 2, 3].map(function (n) { return h("td", null, c.levels[String(n)]); })); }))));
  }
  function reviewView(rv, rub) {
    var c = h("div", { class: "card" }, h("h3", { style: { marginTop: 0 } }, "Revisión del proyecto"),
      h("div", { class: "score-big" }, rv.puntaje.toFixed(2).replace(".", ",")), h("p", null, "de 100 en el proyecto (60 % de la nota global)."));
    rub.forEach(function (k) { var n = rv.niveles[k.id]; c.appendChild(h("p", null, h("b", null, k.id + " · " + k.title + ": nivel " + n + " de 3. "), rv.comentarios && rv.comentarios[k.id] || "")); });
    if (rv.critico) c.appendChild(h("div", { class: "callout risk" }, h("p", null, h("b", null, "Fallo crítico registrado: "), rv.critico_detalle || "", " La aprobación queda pendiente de subsanación.")));
    return c;
  }

  /* ---------- Resultado ---------- */
  function resultado(mnt) {
    head(mnt, "Resultado", "Tu resultado");
    if (!S.configured()) return noService(mnt);
    var box = h("div", null, h("p", { class: "loading" }, "Consultando…"));
    mnt.appendChild(box);
    S.call("GET", "/api/v1/resultado").then(function (r) {
      u.clear(box);
      var rows = [["Situaciones aplicadas (40 %)", r.banco === null ? "Sin entregar" : r.banco.toFixed(2).replace(".", ",") + " / 100"],
        ["Proyecto (60 %)", r.proyecto_estado === "revisado" ? r.proyecto.toFixed(2).replace(".", ",") + " / 100" : estadoTxt(r.proyecto_estado)],
        ["Nota global", r.global === null ? "Pendiente" : r.global.toFixed(2).replace(".", ",") + " / 100"]];
      box.appendChild(h("div", { class: "table-wrap" }, h("table", { class: "data" }, h("tbody", null, rows.map(function (x) { return h("tr", null, h("th", { scope: "row" }, x[0]), h("td", null, x[1])); })))));
      var st = r.estado; // pendiente | aprobado | no_aprobado | pendiente_subsanacion
      var msg = { pendiente: ["warn", "Resultado pendiente", "Falta entregar o revisar algún componente. No se asume aprobación."],
        aprobado: ["", "Aprobado", "Cumples global ≥ 80, proyecto ≥ 75 y revisión real sin fallos críticos pendientes."],
        no_aprobado: ["risk", "Aún no aprobado", "Revisa la devolución por criterio. Puedes usar el segundo intento con la otra forma según las reglas del LMS."],
        pendiente_subsanacion: ["warn", "Pendiente de subsanación", "Hay un fallo crítico registrado en el proyecto. Corrige la brecha indicada."] }[st] || ["warn", st, ""];
      box.appendChild(h("div", { class: "callout " + msg[0] }, h("h3", null, msg[1]), h("p", null, msg[2]), h("p", { class: "note" }, r.reglas)));
      var final = st === "aprobado" || st === "no_aprobado";
      store.setCompletion({
        completed: !!(r.banco !== null && r.proyecto_estado && r.proyecto_estado !== "borrador"),
        success: st === "aprobado" ? "passed" : st === "no_aprobado" ? "failed" : "unknown",
        raw: r.global, scaled: r.global === null ? null : r.global / 100, max: 100, final: final
      });
    }, function (e) { u.clear(box); box.appendChild(errBox(e)); });
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

  IATU.evaluacion = {
    render: function (mnt, page, api) {
      ({ requisitos: function () { requisitos(mnt, api); }, examen: function () { examen(mnt); }, proyecto: function () { proyecto(mnt); },
        resultado: function () { resultado(mnt); }, transferencia: function () { transferencia(mnt); }, cierre: function () { cierre(mnt); } }[page] || function () { requisitos(mnt, api); })();
    }
  };
})();
