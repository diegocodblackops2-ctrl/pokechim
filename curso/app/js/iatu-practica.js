/* Curso 5 — talleres (32), casos ramificados (3) y diagnóstico (16). Formativos: sin nota automática de calidad. */
(function () {
  "use strict";
  var IATU = window.IATU = window.IATU || {};
  var u = IATU.u, h = u.h, icon = u.icon, store = IATU.store, I = IATU.inter;

  /* ===================== TALLER ===================== */
  function workshop(w, mount) {
    var rec = store.get("w", w.id) || {};
    var guided = /T1$/.test(w.id);
    var head = h("header", { class: "screen-head" },
      h("div", null,
        h("span", { class: "kicker" }, guided ? "Taller guiado" : "Taller de transferencia"),
        h("h1", null, w.title),
        h("div", { class: "meta-row" },
          h("span", { class: "tag" }, icon("reloj"), w.minutes + " min estimados"),
          h("span", { class: "tag" }, w.scaffolding),
          h("span", { class: "tag tag-violet" }, "Formativo · sin nota automática"))));
    mount.appendChild(head);
    var steps = h("ol", { class: "ws-steps", "aria-label": "Etapas sugeridas" });
    w.workflow.forEach(function (s, i) {
      var cls = rec.sub ? (i < 2 ? "done" : "on") : (i === 0 ? "on" : "");
      steps.appendChild(h("li", { class: cls }, h("b", null, (i + 1) + ". " + s.stage), s.minutes + " min"));
    });
    mount.appendChild(steps);
    mount.appendChild(u.docView({ tab: "Expediente del taller", text: w.input }));
    mount.appendChild(h("div", { class: "callout" }, h("h3", null, icon("encargo"), " Encargo"), u.paragraphs(w.task, "")));
    mount.appendChild(h("p", { class: "note" }, h("b", null, "Producto esperado: "), w.product));

    // Pistas progresivas
    var hintsBox = h("div", { class: "hints" });
    var shown = rec.hints || 0;
    var hintBtn = h("button", { class: "btn btn-sm", type: "button" }, icon("idea"), "Ver una pista");
    function renderHints() {
      u.clear(hintsBox);
      for (var i = 0; i < shown; i++) hintsBox.appendChild(h("div", { class: "hint-card" }, h("b", null, "Pista " + (i + 1) + ". "), w.hints[i]));
      hintBtn.hidden = shown >= w.hints.length;
      hintBtn.lastChild.textContent = shown ? "Ver otra pista (" + (w.hints.length - shown) + ")" : "Ver una pista";
    }
    hintBtn.addEventListener("click", function () { shown++; store.put("w", w.id, { hints: shown }); renderHints(); u.announce("Pista " + shown + " mostrada."); });
    mount.appendChild(h("div", { class: "btn-row" }, hintBtn));
    mount.appendChild(hintsBox);
    renderHints();

    // Producto
    var pid = u.newId("prod");
    var ta = h("textarea", { id: pid, rows: 12, "aria-describedby": pid + "-h" }, rec.prod || "");
    var cnt = h("p", { class: "counter" });
    function count() { var n = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0; cnt.textContent = n + " palabras · guardado automático"; }
    ta.addEventListener("input", function () { store.put("w", w.id, { prod: ta.value }); count(); });
    count();
    mount.appendChild(h("h2", null, icon("archivo"), " Tu producto"));
    mount.appendChild(h("p", { class: "hint", id: pid + "-h" }, "Escribe tu producto editable y un registro breve que vincule cada decisión con los antecedentes (por ejemplo, «F2: tabla interna»)."));
    mount.appendChild(h("label", { class: "sr-only", for: pid }, "Producto del taller " + w.title));
    mount.appendChild(ta); mount.appendChild(cnt);

    // Ruta real opcional (honestidad)
    var live = h("details", { class: "card", style: { margin: "1rem 0" } }, h("summary", null, h("b", null, "Opcional: si usaste un asistente real autorizado")));
    live.appendChild(h("p", { class: "note" }, w.live_route));
    var lr = rec.live || {};
    [["herramienta", "Herramienta y tipo de cuenta"], ["fecha", "Fecha"], ["insumos", "Insumos que compartiste (solo ficticios o autorizados)"], ["salida", "Salida obtenida"], ["comprobaciones", "Comprobaciones que hiciste"]].forEach(function (f) {
      var iid = u.newId("lr");
      var inp = h("input", { type: "text", id: iid, value: lr[f[0]] || "" });
      inp.addEventListener("input", function () { lr[f[0]] = inp.value; store.put("w", w.id, { live: lr }); });
      live.appendChild(h("label", { class: "fl", for: iid }, f[1])); live.appendChild(inp);
    });
    mount.appendChild(live);

    var post = h("div");
    var submit = h("button", { class: "btn btn-primary", type: "button" }, icon("enviar"), rec.sub ? "Actualizar mi borrador" : "Entregar borrador para revisión formativa");
    var dl = h("button", { class: "btn", type: "button" }, icon("descargar"), "Descargar mi producto (.txt)");
    dl.addEventListener("click", function () {
      u.download(w.id + "-producto.txt", w.title + "\n\n" + ta.value + "\n\n— Registro de ruta real —\n" + JSON.stringify(lr, null, 2));
    });
    submit.addEventListener("click", function () {
      if (ta.value.trim().length < 40) { u.toast("Escribe tu producto (al menos un par de frases) antes de entregarlo."); ta.focus(); return; }
      var cur = store.get("w", w.id) || {};
      store.put("w", w.id, { sub: true, att: (cur.att || 0) + 1, firstProd: cur.firstProd || ta.value }, { now: true });
      submit.lastChild.textContent = "Actualizar mi borrador";
      renderPost(true);
      IATU.app && IATU.app.refreshProgress();
    });
    mount.appendChild(h("div", { class: "btn-row" }, submit, dl));
    mount.appendChild(post);

    function renderPost(focus) {
      var r = store.get("w", w.id) || {};
      u.clear(post);
      post.appendChild(h("h2", { tabindex: "-1" }, icon("revision"), " Revisa con la pauta"));
      post.appendChild(h("p", null, "Compara tu producto con cada control. Marca los que cumple; los que no, corrígelos en tu producto."));
      var checks = (r.checks || []).slice();
      var cl = h("ul", { class: "checklist" });
      w.checks.forEach(function (c, i) {
        var cb = h("input", { type: "checkbox", checked: checks.indexOf(i) >= 0 });
        cb.addEventListener("change", function () {
          checks = checks.filter(function (x) { return x !== i; }); if (cb.checked) checks.push(i);
          store.put("w", w.id, { checks: checks });
        });
        cl.appendChild(h("li", null, h("label", null, cb, h("span", null, c))));
      });
      post.appendChild(cl);
      post.appendChild(h("h3", null, "¿Aparece alguno de estos errores frecuentes?"));
      var gl = h("div", { class: "gap-list" });
      var gaps = (r.gaps || []).slice();
      w.feedback.forEach(function (f, i) {
        var d = h("details", { class: "gap-item", open: gaps.indexOf(i) >= 0 });
        d.appendChild(h("summary", null, f.gap));
        d.appendChild(h("p", null, h("b", null, "Siguiente acción: "), f.next_action));
        d.appendChild(h("p", { class: "note" }, f.release));
        d.addEventListener("toggle", function () {
          gaps = gaps.filter(function (x) { return x !== i; }); if (d.open) gaps.push(i);
          store.put("w", w.id, { gaps: gaps });
        });
        gl.appendChild(d);
      });
      post.appendChild(gl);
      var model = h("div", { class: "ref" }, h("span", { class: "ref-label" }, "Modelo de referencia"), w.model);
      post.appendChild(model);
      post.appendChild(h("p", { class: "note" }, w.accepted));
      post.appendChild(h("p", { class: "note" }, h("b", null, "Corrección: "), w.correction));
      // Reintento / variante
      var rt = h("div", { class: "card", style: { marginTop: "1.2rem" } });
      rt.appendChild(h("h3", { style: { marginTop: 0 } }, icon("reintentar"), " Variante breve"));
      rt.appendChild(h("p", null, h("b", null, "Cambio: "), w.retry.input));
      rt.appendChild(h("p", null, h("b", null, "Tarea: "), w.retry.task));
      var rid = u.newId("rt");
      var rta = h("textarea", { id: rid }, r.retry || "");
      rta.addEventListener("input", function () { store.put("w", w.id, { retry: rta.value }); });
      rt.appendChild(h("label", { class: "fl", for: rid }, "Tu ajuste")); rt.appendChild(rta);
      var rref = h("div", { class: "ref", hidden: !r.rref, tabindex: "-1" }, h("span", { class: "ref-label" }, "Referencia de la variante"), w.retry.model);
      var rb = h("button", { class: "btn btn-sm", type: "button" }, icon("ver"), "Comparar con la referencia");
      rb.addEventListener("click", function () { rref.hidden = false; rref.focus(); store.put("w", w.id, { rref: true }); });
      rt.appendChild(h("div", { class: "btn-row" }, rb)); rt.appendChild(rref);
      post.appendChild(rt);
      var done = h("button", { class: "btn" + (r.fbr ? "" : " btn-primary"), type: "button" }, icon("check"), r.fbr ? "Pauta revisada" : "Revisé la pauta y guardé mi evidencia");
      done.addEventListener("click", function () {
        store.put("w", w.id, { fbr: true, done: true }, { now: true });
        done.lastChild.textContent = "Pauta revisada"; done.classList.remove("btn-primary");
        u.announce("Taller registrado: evidencia y revisión guardadas.");
        IATU.app && IATU.app.refreshProgress();
      });
      post.appendChild(h("div", { class: "btn-row" }, done));
      post.appendChild(h("p", { class: "note" }, "Completar el taller exige entregar tu borrador y revisar la pauta. No se exige coincidir con el modelo ni un puntaje."));
      if (focus) post.firstChild.focus();
    }
    if (rec.sub) renderPost(false);
  }

  /* ===================== CASO RAMIFICADO ===================== */
  function branchCase(cs, mount) {
    var C = IATU.data.curso;
    var rec = store.get("c", cs.id) || {};
    var ans = rec.ans || {};
    var idx = rec.node || 0;
    mount.appendChild(h("header", { class: "screen-head" }, h("div", null,
      h("span", { class: "kicker" }, "Caso con decisiones"),
      h("h1", null, cs.title),
      h("div", { class: "meta-row" }, h("span", { class: "tag" }, icon("reloj"), cs.minutes + " min"), h("span", { class: "tag tag-violet" }, "Práctica sin nota"), h("span", { class: "tag" }, cs.placement)))));
    mount.appendChild(h("div", { class: "callout" }, h("p", null, cs.brief)));
    var mats = h("details", { class: "materials-toggle", open: true }, h("summary", null, h("b", null, "Materiales del caso (" + cs.materials.length + ")")));
    cs.materials.forEach(function (mid) {
      var m = C.materials[mid];
      if (m) mats.appendChild(u.docView({ tab: m.id + " · " + m.kind, title: m.title, text: m.text }));
    });
    mount.appendChild(mats);
    var track = h("div", { class: "case-track", "aria-hidden": "true" });
    var stage = h("div", { "aria-live": "polite" });
    mount.appendChild(track);
    mount.appendChild(stage);

    function save(extra) { var p = { ans: ans, node: idx }; for (var k in extra || {}) p[k] = extra[k]; store.put("c", cs.id, p, { now: true }); }
    function renderTrack() {
      u.clear(track);
      cs.steps.forEach(function (s, i) { track.appendChild(h("span", { class: i < idx ? "done" : i === idx ? "on" : "" })); });
      track.appendChild(h("span", { class: idx >= cs.steps.length ? "on" : "" }));
    }
    function renderNode() {
      renderTrack();
      u.clear(stage);
      if (idx >= cs.steps.length) return renderFinal();
      var s = cs.steps[idx], a = ans[s.id] || {};
      var box = h("section", { class: "activity" });
      box.appendChild(h("div", { class: "activity-head" }, h("span", { class: "tag" }, "Decisión " + (idx + 1) + " de " + cs.steps.length), h("h2", null, s.question)));
      var B = h("div", { class: "activity-body" }); box.appendChild(B);
      var d = a.d || null, e = a.e || null;
      var fs1 = h("fieldset", { class: "opts" }, h("legend", null, "Decisión"));
      s.options.forEach(function (o) {
        var r = h("input", { type: "radio", name: s.id + "-d", value: o.id, checked: d === o.id });
        r.addEventListener("change", function () { d = o.id; });
        fs1.appendChild(h("label", { class: "opt" }, r, h("span", { class: "oid" }, o.id), h("span", null, o.text)));
      });
      var fs2 = h("fieldset", { class: "opts" }, h("legend", null, "Evidencia que la sustenta"));
      s.evidence_options.forEach(function (o) {
        var r = h("input", { type: "radio", name: s.id + "-e", value: o.id, checked: e === o.id });
        r.addEventListener("change", function () { e = o.id; });
        fs2.appendChild(h("label", { class: "opt" }, r, h("span", { class: "oid" }, o.id), h("span", null, o.text)));
      });
      B.appendChild(fs1); B.appendChild(fs2);
      var fb = h("div");
      var go = h("button", { class: "btn btn-primary", type: "button" }, icon("revision"), "Confirmar decisión y evidencia");
      go.addEventListener("click", function () {
        if (!d || !e) { u.toast("Elige una decisión y su evidencia."); return; }
        var ok = d === s.key && e === s.evidence_key;
        var cur = ans[s.id] || {};
        ans[s.id] = { d: d, e: e, ok: ok, att: (cur.att || 0) + 1, first: cur.first || (d + "/" + e) };
        save();
        u.clear(fb);
        if (ok) {
          fb.appendChild(I.fbBox(true, "Decisión sustentada", s.feedback));
          var nx = h("button", { class: "btn btn-primary", type: "button" }, "Continuar", icon("siguiente"));
          nx.addEventListener("click", function () { idx++; save(); renderNode(); stage.querySelector("h2, h3") && stage.querySelector("h2, h3").setAttribute("tabindex", "-1"); var t = stage.querySelector("h2, h3"); if (t) t.focus(); });
          fb.appendChild(h("div", { class: "btn-row" }, nx));
        } else {
          var parts = [];
          if (d !== s.key) parts.push("la decisión");
          if (e !== s.evidence_key) parts.push("la evidencia");
          var rp = h("div", { class: "fb no repair", role: "status" }, h("h3", null, icon("circulo-alerta"), "Revisión " + s.repair_id + ": revisa " + parts.join(" y ")), h("p", null, s.repair_text));
          fb.appendChild(rp);
        }
        u.announce(ok ? "Decisión sustentada. Puedes continuar." : "Revisa el antecedente y vuelve a confirmar.", true);
      });
      B.appendChild(h("div", { class: "btn-row" }, go));
      B.appendChild(fb);
      B.appendChild(h("p", { class: "note" }, "No se envía ni se concede nada desde el curso. " + s.expected));
      stage.appendChild(box);
    }
    function renderFinal() {
      var r = store.get("c", cs.id) || {};
      var box = h("section", { class: "card" });
      box.appendChild(h("h2", { style: { marginTop: 0 } }, icon("lapiz"), " Tu versión propia"));
      box.appendChild(h("p", null, "Con las cinco decisiones tomadas, escribe tu versión del producto. Luego compárala con el modelo y explica qué conservas del documento."));
      var tid = u.newId("cr");
      var ta = h("textarea", { id: tid, rows: 8 }, r.refl || "");
      ta.addEventListener("input", function () { store.put("c", cs.id, { refl: ta.value }); });
      box.appendChild(h("label", { class: "fl", for: tid }, "Tu versión"));
      box.appendChild(ta);
      var model = h("div", { class: "ref", hidden: !r.model, tabindex: "-1" }, h("span", { class: "ref-label" }, "Modelo"), cs.model);
      var mb = h("button", { class: "btn btn-sm", type: "button" }, icon("ver"), "Comparar con el modelo");
      mb.addEventListener("click", function () {
        if (ta.value.trim().length < 30) { u.toast("Escribe tu versión antes de abrir el modelo."); return; }
        model.hidden = false; model.focus(); store.put("c", cs.id, { model: true });
      });
      box.appendChild(h("div", { class: "btn-row" }, mb)); box.appendChild(model);
      var rv = h("div", { class: "card", style: { marginTop: "1rem" } }, h("h3", { style: { marginTop: 0 } }, icon("reintentar"), " Variante"), h("p", null, cs.retry));
      var vid = u.newId("cv");
      var vta = h("textarea", { id: vid }, r.retry || "");
      vta.addEventListener("input", function () { store.put("c", cs.id, { retry: vta.value }); });
      rv.appendChild(h("label", { class: "fl", for: vid }, "Tu ajuste")); rv.appendChild(vta);
      var vref = h("div", { class: "ref", hidden: !r.vref, tabindex: "-1" }, h("span", { class: "ref-label" }, "Referencia"), cs.retry_model);
      var vb = h("button", { class: "btn btn-sm", type: "button" }, icon("ver"), "Comparar con la referencia");
      vb.addEventListener("click", function () { vref.hidden = false; vref.focus(); store.put("c", cs.id, { vref: true }); });
      rv.appendChild(h("div", { class: "btn-row" }, vb)); rv.appendChild(vref);
      box.appendChild(rv);
      var done = h("button", { class: "btn" + (r.done ? "" : " btn-primary"), type: "button" }, icon("check"), r.done ? "Caso completado" : "Terminar el caso");
      done.addEventListener("click", function () {
        if (ta.value.trim().length < 30) { u.toast("Escribe tu versión propia para terminar el caso."); return; }
        store.put("c", cs.id, { done: true, sub: true, fbr: true }, { now: true });
        done.lastChild.textContent = "Caso completado"; done.classList.remove("btn-primary");
        IATU.app && IATU.app.refreshProgress();
        u.announce("Caso completado.");
      });
      box.appendChild(h("div", { class: "btn-row" }, done));
      var review = h("button", { class: "linklike", type: "button" }, "Volver a recorrer las decisiones");
      review.addEventListener("click", function () { idx = 0; save(); renderNode(); });
      box.appendChild(h("p", { class: "note" }, cs.scoring, " ", review));
      stage.appendChild(box);
    }
    renderNode();
  }

  /* ===================== DIAGNÓSTICO ===================== */
  function diagnostic(mount, onChange) {
    var C = IATU.data.curso, items = C.diagnostic;
    var st = store.get("d", "diag") || {};
    var answers = st.ans || {};
    var i = st.at || 0;
    var stage = h("div");
    mount.appendChild(h("p", { class: "note" }, "16 situaciones breves. No hay nota ni bloqueo por resultado: sirve para que sepas qué conviene reforzar. Puedes elegir «No lo sé»."));
    var dots = h("div", { class: "case-track", "aria-hidden": "true" });
    mount.appendChild(dots);
    mount.appendChild(stage);
    function save() { store.put("d", "diag", { ans: answers, at: i, done: Object.keys(answers).length >= items.length }); if (onChange) onChange(); }
    function render() {
      u.clear(dots);
      items.forEach(function (it, k) { dots.appendChild(h("span", { class: answers[it.id] ? "done" : k === i ? "on" : "" })); });
      u.clear(stage);
      if (i >= items.length) return summary();
      var it = items[i], a = answers[it.id];
      var box = h("section", { class: "activity" });
      box.appendChild(h("div", { class: "activity-head" }, h("span", { class: "tag" }, "Situación " + (i + 1) + " de " + items.length), h("h2", { tabindex: "-1" }, it.topic)));
      var B = h("div", { class: "activity-body" }); box.appendChild(B);
      B.appendChild(h("p", { class: "lead" }, it.input));
      var fs = h("fieldset", { class: "opts" }, h("legend", null, it.question));
      var ch = a || null;
      it.options.forEach(function (o) {
        var r = h("input", { type: "radio", name: it.id, value: o.id, checked: ch === o.id });
        r.addEventListener("change", function () { ch = o.id; });
        fs.appendChild(h("label", { class: "opt" }, r, h("span", { class: "oid" }, o.id), h("span", null, o.text)));
      });
      B.appendChild(fs);
      var fb = h("div");
      function respond(val) {
        answers[it.id] = val; save();
        u.clear(fb);
        var ok = val === it.key;
        fb.appendChild(I.fbBox(ok, val === "unknown" ? "Está bien no saberlo todavía" : ok ? "Buena lectura" : "Para reforzar", it.feedback[val]));
        var nx = h("button", { class: "btn btn-primary", type: "button" }, i + 1 < items.length ? "Siguiente situación" : "Ver mi mapa inicial", icon("siguiente"));
        nx.addEventListener("click", function () { i++; save(); render(); var t = stage.querySelector("h2"); if (t) t.focus(); });
        fb.appendChild(h("div", { class: "btn-row" }, nx));
      }
      var ok = h("button", { class: "btn btn-primary", type: "button" }, "Responder");
      ok.addEventListener("click", function () { if (!ch) { u.toast("Elige una alternativa o «No lo sé»."); return; } respond(ch); });
      var nk = h("button", { class: "btn", type: "button" }, "No lo sé");
      nk.addEventListener("click", function () { respond("unknown"); });
      var prev = h("button", { class: "btn btn-ghost", type: "button", disabled: i === 0 }, icon("anterior"), "Anterior");
      prev.addEventListener("click", function () { i--; save(); render(); });
      B.appendChild(h("div", { class: "btn-row" }, ok, nk, prev));
      B.appendChild(fb);
      if (a) respond(a);
      stage.appendChild(box);
    }
    function summary() {
      var weak = items.filter(function (it) { return answers[it.id] !== it.key; });
      var box = h("section", { class: "card" });
      box.appendChild(h("h2", { tabindex: "-1", style: { marginTop: 0 } }, "Tu mapa inicial"));
      box.appendChild(h("p", null, "Este resultado no se registra como nota. Úsalo para decidir dónde poner más atención."));
      if (weak.length) {
        box.appendChild(h("h3", null, "Temas para reforzar (" + weak.length + ")"));
        box.appendChild(h("ul", null, weak.map(function (it) { return h("li", null, it.topic); })));
      } else box.appendChild(h("p", null, "Leíste bien las 16 situaciones. Igual conviene recorrer los talleres: el diagnóstico no mide producción."));
      var again = h("button", { class: "btn", type: "button" }, icon("reintentar"), "Revisar las situaciones");
      again.addEventListener("click", function () { i = 0; save(); render(); });
      box.appendChild(h("div", { class: "btn-row" }, again));
      stage.appendChild(box);
    }
    render();
  }

  IATU.practica = { workshop: workshop, branchCase: branchCase, diagnostic: diagnostic };
})();
