/* Curso 5 — interacciones formativas.
   32 actividades estructuradas (16 clasificaciones, 7 secuencias, 1 secuencia con ramas, 8 comparaciones),
   32 micro-decisiones abiertas, 32 tarjetas reversibles y 8 hotspots sobre documentos semánticos.
   Todas: teclado, alternativa al arrastre con la misma evidencia, sin depender de color ni animación. */
(function () {
  "use strict";
  var IATU = window.IATU = window.IATU || {};
  var u = IATU.u, h = u.h, icon = u.icon, store = IATU.store;

  function frame(title, tag, tagCls, ic) {
    var body = h("div", { class: "activity-body" });
    var head = h("div", { class: "activity-head" }, icon(ic || "lista"), h("h2", null, title), h("span", { class: "tag " + (tagCls || "tag-teal") }, tag));
    var el = h("section", { class: "activity", "aria-label": title }, head, body);
    el._body = body; el._head = head;
    return el;
  }
  function fbBox(ok, title, text) {
    return h("div", { class: "fb " + (ok ? "ok" : "no"), role: "status" },
      h("h3", null, icon(ok ? "circulo-check" : "circulo-alerta"), title), text ? u.paragraphs(text, "") : null);
  }
  function reviewedButton(scope, id, onDone) {
    var rec = store.get(scope, id) || {};
    var b = h("button", { class: "btn" + (rec.fbr ? "" : " btn-primary"), type: "button" }, icon("check"), rec.fbr ? "Devolución revisada" : "Revisé la devolución");
    b.addEventListener("click", function () {
      store.put(scope, id, { fbr: true }, { now: true });
      u.clear(b); b.appendChild(icon("check")); b.appendChild(document.createTextNode("Devolución revisada"));
      b.classList.remove("btn-primary");
      u.announce("Práctica registrada como revisada.");
      if (onDone) onDone();
      IATU.app && IATU.app.refreshProgress();
    });
    return b;
  }
  function stateLine(rec) {
    var st = !rec || !rec.sub ? ["Sin intento", "tag"] : rec.fbr ? ["Intentada y revisada", "tag tag-teal"] : ["Intentada · falta revisar la devolución", "tag tag-ochre"];
    return h("div", { class: "state-line" }, h("span", { class: st[1] }, st[0]), rec && rec.att ? h("span", null, "Intentos: " + rec.att) : null,
      h("span", null, "Formativa: no suma puntos al examen."));
  }

  /* Bloque de transferencia (variante) común a las actividades estructuradas */
  function transferBlock(act) {
    var t = act.transfer; if (!t) return null;
    var rec = store.get("a", act.id) || {};
    var wrap = h("div", { class: "card", style: { marginTop: "1.2rem" } }, h("h3", { style: { marginTop: 0 } }, icon("reintentar"), " Variante: aplica el criterio"));
    if (t.base_input) {
      wrap.appendChild(u.docView({ tab: "Expediente base del taller", text: t.base_input, compact: true }));
      if (t.context_note) wrap.appendChild(h("p", { class: "note" }, t.context_note));
    }
    wrap.appendChild(h("p", null, h("b", null, "Actualización: "), t.input));
    wrap.appendChild(h("p", null, h("b", null, "Tu tarea: "), t.task));
    var tid = u.newId("tr");
    var ta = h("textarea", { id: tid, "aria-describedby": tid + "-h" }, rec.tr || "");
    ta.addEventListener("input", function () { store.put("a", act.id, { tr: ta.value }); });
    wrap.appendChild(h("label", { class: "fl", for: tid }, "Tu respuesta a la variante"));
    wrap.appendChild(h("p", { class: "hint", id: tid + "-h" }, t.evaluation || "Respuesta abierta formativa; se compara con una referencia, no se califica por coincidencia literal."));
    wrap.appendChild(ta);
    var refBox = h("div", { class: "ref", hidden: !rec.trRef }, h("span", { class: "ref-label" }, "Referencia"), t.reference);
    var b = h("button", { class: "btn btn-sm", type: "button" }, icon("ver"), "Comparar con la referencia");
    b.addEventListener("click", function () { refBox.hidden = false; store.put("a", act.id, { trRef: true }); refBox.focus && refBox.setAttribute("tabindex", "-1"); refBox.focus(); });
    wrap.appendChild(h("div", { class: "btn-row" }, b));
    wrap.appendChild(refBox);
    return wrap;
  }
  function microNote(act) {
    if (!act.source_note) return null;
    return h("p", { class: "note" }, act.source_note);
  }
  function recordAttempt(act, response, correct) {
    var rec = store.get("a", act.id) || {};
    var patch = { sub: true, last: response, att: (rec.att || 0) + 1 };
    if (!rec.first) patch.first = response;
    store.put("a", act.id, patch, { now: true });
    store.interaction({ id: act.id, type: "other", response: JSON.stringify(response).slice(0, 4000), result: correct ? "correct" : "incorrect", description: act.title });
  }

  /* =====================================================================
     1. Clasificación con arrastre + alternativa accesible (select / tocar-tocar)
     ===================================================================== */
  function classify(act, mount) {
    var rec = store.get("a", act.id) || {};
    var place = {}; // itemId -> binId|null
    act.items.forEach(function (it) { place[it.id] = (rec.draft && rec.draft[it.id]) || null; });
    var undo = [];
    var selected = null;
    var checked = !!(rec.sub && rec.showfb);
    var el = frame(act.title, "Clasificación", "tag-teal", "arrastrar");
    var B = el._body;
    B.appendChild(u.docView({ tab: "Expediente", text: act.context }));
    B.appendChild(h("p", { class: "instr" }, act.instruction));
    B.appendChild(h("p", { class: "note" }, icon("info"), " Arrastra desde el asa ", icon("arrastrar"), ", usa «Mover a…» o toca una tarjeta y luego la categoría. Las tres formas guardan lo mismo."));
    var board = h("div", { class: "classify" });
    var pool = h("div", { class: "pool", "data-bin": "" }, h("h3", null, "Sin clasificar", h("span", { class: "note", "data-count": "" })));
    var bins = h("div", { class: "bins" });
    var binEls = {};
    act.bins.forEach(function (b) {
      var be = h("div", { class: "bin", "data-bin": b.id, role: "group", "aria-label": "Categoría: " + b.label },
        h("h3", null, b.label, h("span", { class: "note", "data-count": "" })));
      var placeBtn = h("button", { class: "btn btn-sm", type: "button", hidden: true, "data-place": b.id }, icon("mas"), "Colocar aquí");
      placeBtn.addEventListener("click", function () { if (selected) move(selected, b.id, true); });
      be.appendChild(placeBtn);
      binEls[b.id] = be; bins.appendChild(be);
    });
    var poolPlace = h("button", { class: "btn btn-sm", type: "button", hidden: true }, icon("deshacer"), "Devolver a sin clasificar");
    poolPlace.addEventListener("click", function () { if (selected) move(selected, null, true); });
    pool.appendChild(poolPlace);
    board.appendChild(pool); board.appendChild(bins);
    B.appendChild(board);

    var cards = {};
    act.items.forEach(function (it) {
      var sel = h("select", { "aria-label": "Mover «" + it.text + "» a…" },
        h("option", { value: "" }, "Mover a… (sin clasificar)"),
        act.bins.map(function (b) { return h("option", { value: b.id }, b.label); }));
      var grip = h("button", { class: "grip", type: "button", "aria-label": "Seleccionar o arrastrar «" + it.text + "»", "aria-pressed": "false" }, icon("arrastrar"));
      var c = h("div", { class: "dcard", "data-item": it.id },
        h("div", { class: "row" }, grip, h("div", { class: "ctext" }, h("span", { class: "cid" }, it.id), h("br"), it.text)),
        h("div", { class: "ctrl" }, sel));
      sel.addEventListener("change", function () { move(it.id, sel.value || null, true); });
      grip.addEventListener("click", function (e) { if (dragMoved) { dragMoved = false; return; } toggleSelect(it.id); e.preventDefault(); });
      enableDrag(grip, c, it.id);
      cards[it.id] = { el: c, sel: sel, grip: grip, item: it };
    });

    function toggleSelect(id) {
      selected = selected === id ? null : id;
      Object.keys(cards).forEach(function (k) {
        cards[k].el.classList.toggle("selected", k === selected);
        cards[k].grip.setAttribute("aria-pressed", String(k === selected));
      });
      Object.keys(binEls).forEach(function (b) {
        binEls[b].classList.toggle("target-ready", !!selected);
        binEls[b].querySelector("[data-place]").hidden = !selected;
      });
      poolPlace.hidden = !selected || !place[selected];
      if (selected) u.announce("Tarjeta seleccionada: " + cards[selected].item.text + ". Elige una categoría.");
    }
    function move(id, bin, record) {
      if (record) undo.push({ id: id, from: place[id] });
      place[id] = bin;
      if (selected) toggleSelect(selected);
      layout();
      persist();
      var lbl = bin ? act.bins.filter(function (b) { return b.id === bin; })[0].label : "sin clasificar";
      u.announce("«" + cards[id].item.text + "» movida a " + lbl + ".");
      undoBtn.disabled = !undo.length;
    }
    function layout() {
      act.items.forEach(function (it) {
        var target = place[it.id] ? binEls[place[it.id]] : pool;
        var c = cards[it.id];
        target.insertBefore(c.el, target.querySelector("[data-place]") || (target === pool ? poolPlace : null));
        c.sel.value = place[it.id] || "";
        c.el.classList.remove("ok", "no");
        var old = c.el.querySelector(".cfb"); if (old) old.remove();
      });
      var count = function (be, n) { var s = be.querySelector("[data-count]"); s.textContent = n ? n + " tarjeta" + (n > 1 ? "s" : "") : ""; };
      count(pool, act.items.filter(function (i) { return !place[i.id]; }).length);
      if (!act.items.some(function (i) { return !place[i.id]; })) { if (!pool.querySelector(".empty-hint")) pool.insertBefore(h("p", { class: "empty-hint" }, "Todas las tarjetas están ubicadas."), poolPlace); }
      else { var eh = pool.querySelector(".empty-hint"); if (eh) eh.remove(); }
      act.bins.forEach(function (b) { count(binEls[b.id], act.items.filter(function (i) { return place[i.id] === b.id; }).length); });
      fbArea.hidden = true;
    }
    function persist() { store.put("a", act.id, { draft: Object.assign({}, place) }); }

    /* Arrastre con puntero: solo desde el asa (no captura el desplazamiento de página al tocar la tarjeta). */
    var dragMoved = false;
    function enableDrag(handle, card, id) {
      var ghost = null, sx = 0, sy = 0, started = false, over = null;
      handle.addEventListener("pointerdown", function (e) {
        if (e.button !== 0) return;
        sx = e.clientX; sy = e.clientY; started = false; dragMoved = false;
        handle.setPointerCapture(e.pointerId);
      });
      handle.addEventListener("pointermove", function (e) {
        if (!handle.hasPointerCapture(e.pointerId)) return;
        if (!started && Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) < 8) return;
        if (!started) {
          started = true; dragMoved = true;
          ghost = card.cloneNode(true); ghost.classList.add("drag-ghost"); ghost.style.width = card.offsetWidth + "px";
          document.body.appendChild(ghost); card.classList.add("dragging");
        }
        ghost.style.left = (e.clientX - 20) + "px"; ghost.style.top = (e.clientY - 20) + "px";
        var t = document.elementFromPoint(e.clientX, e.clientY);
        var zone = t && t.closest ? t.closest("[data-bin]") : null;
        if (zone && !board.contains(zone)) zone = null;
        if (over !== zone) { if (over) over.classList.remove("drop-over"); over = zone; if (over) over.classList.add("drop-over"); }
      });
      function end(e) {
        if (!started) return;
        started = false;
        if (ghost) ghost.remove(); ghost = null; card.classList.remove("dragging");
        if (over) { over.classList.remove("drop-over"); move(id, over.getAttribute("data-bin") || null, true); }
        over = null;
        try { handle.releasePointerCapture(e.pointerId); } catch (x) { /* sin acción */ }
      }
      handle.addEventListener("pointerup", end);
      handle.addEventListener("pointercancel", end);
    }

    var undoBtn = h("button", { class: "btn", type: "button", disabled: true }, icon("deshacer"), "Deshacer");
    undoBtn.addEventListener("click", function () { var last = undo.pop(); if (last) { move(last.id, last.from, false); } undoBtn.disabled = !undo.length; });
    var checkBtn = h("button", { class: "btn btn-primary", type: "button" }, icon("revision"), "Comprobar distribución");
    var fbArea = h("div", { hidden: true });
    checkBtn.addEventListener("click", function () {
      var missing = act.items.filter(function (i) { return !place[i.id]; });
      if (missing.length) {
        fbArea.hidden = false; u.clear(fbArea);
        fbArea.appendChild(fbBox(false, "Distribución incompleta", "Quedan " + missing.length + " tarjeta(s) sin clasificar. Tu avance está guardado; ubícalas para comprobar."));
        u.announce("Distribución incompleta.", true); return;
      }
      showFeedback(true);
    });
    function showFeedback(fresh) {
      var wrong = 0;
      act.items.forEach(function (it) {
        var c = cards[it.id], ok = it.accepted_bins.indexOf(place[it.id]) >= 0;
        c.el.classList.add(ok ? "ok" : "no");
        var old = c.el.querySelector(".cfb"); if (old) old.remove();
        if (!ok) { wrong++; c.el.appendChild(h("div", { class: "cfb" }, h("b", null, "Revisa: "), it.feedback)); }
        else c.el.appendChild(h("div", { class: "cfb" }, h("span", { class: "sr-only" }, "Correcta. "), icon("check"), " ", it.feedback));
      });
      if (fresh) { recordAttempt(act, Object.assign({}, place), wrong === 0); store.put("a", act.id, { showfb: true }); }
      fbArea.hidden = false; u.clear(fbArea);
      fbArea.appendChild(fbBox(wrong === 0, wrong === 0 ? "Distribución coherente con el expediente" : wrong + " tarjeta(s) por revisar",
        wrong === 0 ? act.feedback.success : act.feedback.retry));
      fbArea.appendChild(h("div", { class: "btn-row" }, reviewedButton("a", act.id)));
      fbArea.appendChild(stateLine(store.get("a", act.id)));
      u.announce(wrong === 0 ? "Comprobado: todas las tarjetas coinciden." : wrong + " tarjetas por revisar. Cada una muestra su criterio.", true);
    }
    B.appendChild(h("div", { class: "btn-row" }, checkBtn, undoBtn));
    B.appendChild(fbArea);
    B.appendChild(transferBlock(act));
    B.appendChild(microNote(act));
    layout();
    if (checked && act.items.every(function (i) { return place[i.id]; })) showFeedback(false);
    mount.appendChild(el);
  }

  /* =====================================================================
     2. Secuencia por dependencias (acepta cualquier orden topológico válido)
     ===================================================================== */
  function textOf(act, id) { return act.nodes.filter(function (n) { return n.id === id; })[0].text; }
  function seqList(act, order, onChange, opts) {
    opts = opts || {};
    var ol = h("ol", { class: "seq", "aria-label": opts.label || "Secuencia" });
    function render(focusId) {
      u.clear(ol);
      order.forEach(function (id, i) {
        var up = h("button", { class: "btn btn-sm", type: "button", "aria-label": "Subir «" + textOf(act, id) + "»", disabled: i === 0 }, icon("subir"));
        var dn = h("button", { class: "btn btn-sm", type: "button", "aria-label": "Bajar «" + textOf(act, id) + "»", disabled: i === order.length - 1 }, icon("bajar"));
        var grip = h("button", { class: "grip", type: "button", "aria-label": "Arrastrar «" + textOf(act, id) + "» (también puedes usar Subir y Bajar)" }, icon("arrastrar"));
        var li = h("li", { "data-node": id },
          h("div", { class: "dcard", "data-node": id }, grip, h("span", { class: "pos", "aria-hidden": "true" }),
            h("div", { class: "ctext" }, h("span", { class: "cid" }, id), " ", textOf(act, id)),
            h("div", { class: "mv" }, up, dn),
            opts.removable ? (function () {
              var x = h("button", { class: "btn btn-sm", type: "button", "aria-label": "Quitar «" + textOf(act, id) + "» de la ruta" }, icon("cerrar"));
              x.addEventListener("click", function () { opts.onRemove(id); });
              return x;
            })() : null));
        up.addEventListener("click", function () { swap(i, i - 1, id, "up"); });
        dn.addEventListener("click", function () { swap(i, i + 1, id, "down"); });
        dragReorder(grip, li, id);
        ol.appendChild(li);
      });
      if (focusId) {
        var f = ol.querySelector('li[data-node="' + focusId + '"] .mv .btn:not([disabled])');
        if (f) f.focus();
      }
    }
    function swap(i, j, id) {
      var t = order[i]; order[i] = order[j]; order[j] = t;
      render(id); onChange(order);
      u.announce("«" + textOf(act, id) + "» ahora en la posición " + (order.indexOf(id) + 1) + " de " + order.length + ".");
    }
    function dragReorder(handle, li, id) {
      var started = false, sy = 0, ghost = null, target = null;
      handle.addEventListener("pointerdown", function (e) { if (e.button !== 0) return; sy = e.clientY; started = false; handle.setPointerCapture(e.pointerId); });
      handle.addEventListener("pointermove", function (e) {
        if (!handle.hasPointerCapture(e.pointerId)) return;
        if (!started && Math.abs(e.clientY - sy) < 8) return;
        if (!started) { started = true; ghost = li.firstChild.cloneNode(true); ghost.classList.add("drag-ghost"); ghost.style.width = li.offsetWidth + "px"; document.body.appendChild(ghost); li.firstChild.classList.add("dragging"); }
        ghost.style.left = (e.clientX - 20) + "px"; ghost.style.top = (e.clientY - 16) + "px";
        var t = document.elementFromPoint(e.clientX, e.clientY), over = t && t.closest ? t.closest("li[data-node]") : null;
        u.$$(".drop-before", ol).forEach(function (x) { x.classList.remove("drop-before"); });
        target = over && ol.contains(over) ? over : null;
        if (target) target.firstChild.classList.add("drop-before");
      });
      function end(e) {
        if (!started) return; started = false;
        if (ghost) ghost.remove(); li.firstChild.classList.remove("dragging");
        u.$$(".drop-before", ol).forEach(function (x) { x.classList.remove("drop-before"); });
        try { handle.releasePointerCapture(e.pointerId); } catch (x) { /* sin acción */ }
        if (target) {
          var to = order.indexOf(target.getAttribute("data-node")), from = order.indexOf(id);
          order.splice(from, 1); order.splice(to, 0, id);
          render(); onChange(order);
          u.announce("«" + textOf(act, id) + "» ahora en la posición " + (order.indexOf(id) + 1) + " de " + order.length + ".");
        }
        target = null;
      }
      handle.addEventListener("pointerup", end); handle.addEventListener("pointercancel", end);
    }
    render();
    ol._render = render;
    return ol;
  }
  function violations(act, order, prec) {
    var out = [];
    (prec || act.precedence).forEach(function (p) {
      var a = order.indexOf(p.before), b = order.indexOf(p.after);
      if (a >= 0 && b >= 0 && a > b) out.push("«" + textOf(act, p.after) + "» depende de «" + textOf(act, p.before) + "», que debe ocurrir antes.");
    });
    return out;
  }
  function orderDeps(act, mount) {
    var rec = store.get("a", act.id) || {};
    var initial = rec.draft || shuffledStable(act.nodes.map(function (n) { return n.id; }), act.id);
    var order = initial.slice();
    var el = frame(act.title, "Secuencia por dependencias", "tag-violet", "ordenar");
    var B = el._body;
    B.appendChild(u.docView({ tab: "Expediente", text: act.context }));
    B.appendChild(h("p", { class: "instr" }, act.instruction));
    var list = seqList(act, order, function (o) { order = o; store.put("a", act.id, { draft: o.slice() }); fbArea.hidden = true; }, { label: "Etapas a ordenar" });
    B.appendChild(list);
    var fbArea = h("div", { hidden: true });
    var check = h("button", { class: "btn btn-primary", type: "button" }, icon("revision"), "Comprobar dependencias");
    check.addEventListener("click", function () { show(true); });
    function show(fresh) {
      var v = violations(act, order);
      if (fresh) { recordAttempt(act, order.slice(), v.length === 0); store.put("a", act.id, { showfb: true }); }
      u.clear(fbArea); fbArea.hidden = false;
      var box = fbBox(v.length === 0, v.length === 0 ? "Orden válido: respeta todas las dependencias" : v.length + " dependencia(s) sin respetar", v.length === 0 ? act.feedback.success : act.feedback.retry);
      if (v.length) box.appendChild(h("ul", { class: "violations" }, v.map(function (t) { return h("li", null, t); })));
      if (v.length === 0) box.appendChild(h("p", { class: "note" }, "Se acepta cualquier orden que respete los requisitos previos; no se compara con una lista memorizada."));
      fbArea.appendChild(box);
      fbArea.appendChild(h("div", { class: "btn-row" }, reviewedButton("a", act.id)));
      fbArea.appendChild(stateLine(store.get("a", act.id)));
      u.announce(v.length ? "Hay dependencias por corregir." : "Orden válido.", true);
    }
    B.appendChild(h("div", { class: "btn-row" }, check));
    B.appendChild(fbArea);
    B.appendChild(transferBlock(act));
    B.appendChild(microNote(act));
    if (rec.sub && rec.showfb) show(false);
    mount.appendChild(el);
  }
  // Orden inicial desordenado pero estable (mismo para cada persona y recarga), nunca igual al orden de autoría.
  function shuffledStable(ids, seed) {
    var s = 0; for (var i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    var a = ids.slice();
    for (var j = a.length - 1; j > 0; j--) { s = (s * 1103515245 + 12345) >>> 0; var k = s % (j + 1); var t = a[j]; a[j] = a[k]; a[k] = t; }
    if (a.join() === ids.join()) a.push(a.shift());
    return a;
  }

  /* =====================================================================
     3. Secuencia con ramas (M14): se evalúa solo la ruta elegida
     ===================================================================== */
  function branchSeq(act, mount) {
    var rec = store.get("a", act.id) || {};
    var d = rec.draft || {};
    var branch = d.branch || null;
    var route = (d.route || []).slice();
    var el = frame(act.title, "Secuencia con ramas", "tag-violet", "ramas");
    var B = el._body;
    B.appendChild(u.docView({ tab: "Expediente", text: act.context }));
    B.appendChild(h("p", { class: "instr" }, act.instruction));
    var fs = h("fieldset", { class: "opts" }, h("legend", null, "1. Resultado de la consulta de estado"));
    var pick = h("div", { class: "branch-pick" });
    act.branches.forEach(function (b) {
      var r = h("input", { type: "radio", name: act.id + "-br", value: b.id, checked: branch === b.id });
      r.addEventListener("change", function () { branch = b.id; persist(); fbArea.hidden = true; });
      pick.appendChild(h("label", { class: "opt" }, r, h("span", null, b.label)));
    });
    fs.appendChild(pick); B.appendChild(fs);
    B.appendChild(h("h3", null, "2. Construye solo la ruta que corresponde"));
    B.appendChild(h("p", { class: "note" }, "Agrega las etapas necesarias y ordénalas. No ejecutes la rama alternativa: incluir pasos de otra rama también se revisa."));
    var avail = h("div", { class: "grid grid-2" });
    var routeWrap = h("div");
    function renderAvail() {
      u.clear(avail);
      act.nodes.forEach(function (n) {
        var inR = route.indexOf(n.id) >= 0;
        var b = h("button", { class: "btn btn-sm", type: "button", "aria-pressed": String(inR), disabled: inR, style: { justifyContent: "flex-start", textAlign: "left", height: "auto", borderRadius: "8px" } },
          icon(inR ? "check" : "mas"), h("span", null, h("b", { class: "mono" }, n.id + " "), n.text));
        b.addEventListener("click", function () { route.push(n.id); persist(); renderAll(); u.announce("Agregada a la ruta: " + n.text + ". Posición " + route.length + "."); });
        avail.appendChild(b);
      });
    }
    function renderRoute() {
      u.clear(routeWrap);
      routeWrap.appendChild(h("h4", null, "Tu ruta (" + route.length + " etapas)"));
      if (!route.length) { routeWrap.appendChild(h("p", { class: "empty-hint" }, "Aún no agregas etapas.")); return; }
      routeWrap.appendChild(seqList(act, route, function (o) { route = o; persist(); fbArea.hidden = true; }, {
        label: "Ruta construida", removable: true,
        onRemove: function (id) { route.splice(route.indexOf(id), 1); persist(); renderAll(); u.announce("Etapa quitada de la ruta."); }
      }));
    }
    function renderAll() { renderAvail(); renderRoute(); fbArea.hidden = true; }
    function persist() { store.put("a", act.id, { draft: { branch: branch, route: route.slice() } }); }
    B.appendChild(avail);
    B.appendChild(routeWrap);
    var fbArea = h("div", { hidden: true });
    var check = h("button", { class: "btn btn-primary", type: "button" }, icon("revision"), "Comprobar ruta");
    check.addEventListener("click", function () {
      if (!branch) { u.clear(fbArea); fbArea.hidden = false; fbArea.appendChild(fbBox(false, "Primero elige el resultado de la consulta", "La ruta depende de lo que informe el canal autorizado.")); return; }
      show(true);
    });
    function show(fresh) {
      var br = act.branches.filter(function (b) { return b.id === branch; })[0];
      var ok = br.allowed_sequences.some(function (sq) { return sq.join() === route.join(); });
      var allowedSet = {}; br.allowed_sequences.forEach(function (sq) { sq.forEach(function (x) { allowedSet[x] = 1; }); });
      var extra = route.filter(function (x) { return !allowedSet[x]; });
      var missing = Object.keys(allowedSet).filter(function (x) { return route.indexOf(x) < 0; });
      var v = violations(act, route, act.precedence.filter(function (p) { return allowedSet[p.before] && allowedSet[p.after]; }));
      if (fresh) { recordAttempt(act, { branch: branch, route: route.slice() }, ok); store.put("a", act.id, { showfb: true }); }
      u.clear(fbArea); fbArea.hidden = false;
      var box = fbBox(ok, ok ? "Ruta correcta para «" + br.label + "»" : "La ruta no corresponde a «" + br.label + "»", ok ? act.feedback.success : act.feedback.retry);
      var ul = h("ul", { class: "violations" });
      extra.forEach(function (x) { ul.appendChild(h("li", null, "«" + textOf(act, x) + "» no corresponde a este resultado.")); });
      missing.forEach(function (x) { ul.appendChild(h("li", null, "Falta «" + textOf(act, x) + "».")); });
      v.forEach(function (t) { ul.appendChild(h("li", null, t)); });
      if (ul.childNodes.length) box.appendChild(ul);
      if (br.end_state) box.appendChild(h("p", null, h("b", null, "Estado final: "), br.end_state));
      fbArea.appendChild(box);
      fbArea.appendChild(h("div", { class: "btn-row" }, reviewedButton("a", act.id)));
      fbArea.appendChild(stateLine(store.get("a", act.id)));
    }
    B.appendChild(h("div", { class: "btn-row" }, check));
    B.appendChild(fbArea);
    B.appendChild(transferBlock(act));
    B.appendChild(microNote(act));
    renderAll();
    if (rec.sub && rec.showfb && branch) show(false);
    mount.appendChild(el);
  }

  /* =====================================================================
     4. Comparación con evidencia y cálculos (salidas X/Y/Z controladas)
     ===================================================================== */
  function unitFor(label) {
    if (/porcentaje/i.test(label)) return "%";
    if (/tiempo|ahorro|diferencia|minutos|media/i.test(label)) return "minutos";
    return "";
  }
  function compare(act, mount) {
    var rec = store.get("a", act.id) || {};
    var ans = Object.assign({}, rec.draft || {});
    var el = frame(act.title, "Comparación con evidencia", "tag-ochre", "comparar");
    var B = el._body;
    B.appendChild(u.docView({ tab: "Expediente", text: act.context }));
    B.appendChild(h("p", { class: "instr" }, act.instruction));
    var outs = h("div", { class: "outputs", role: "list", "aria-label": "Salidas a comparar" });
    act.outputs.forEach(function (o) {
      outs.appendChild(h("article", { class: "output", role: "listitem", "data-out": o.id },
        h("div", { class: "oh" }, h("b", null, "Salida " + o.id), h("span", { class: "tag" }, "Controlada")),
        h("p", { style: { whiteSpace: "pre-wrap", margin: 0 } }, o.text),
        h("p", { class: "origin" }, o.origin)));
    });
    B.appendChild(outs);
    var fields = h("div", { class: "fields" });
    var fEls = {};
    act.fields.forEach(function (f) {
      var fb = h("div", { class: "field-block", "data-field": f.id });
      var lblId = u.newId("fl");
      fb.appendChild(h("span", { class: "flabel", id: lblId }, f.id + ". " + f.label));
      if (f.input_type === "number") {
        var inp = h("input", { type: "text", inputmode: "decimal", "aria-labelledby": lblId, value: ans[f.id] || "", autocomplete: "off", style: { maxWidth: "160px" } });
        inp.addEventListener("input", function () { ans[f.id] = inp.value; persist(); });
        var un = unitFor(f.label);
        fb.appendChild(h("div", { class: "num-input" }, inp, un ? h("span", { class: "unit" }, un) : null));
        fb.appendChild(h("p", { class: "hint" }, "Acepta coma o punto decimal. Escribe solo el número; la unidad se muestra aparte."));
      } else {
        var multi = f.input_type === "multi_select";
        var grp = h("div", { class: "opts", role: multi ? "group" : "radiogroup", "aria-labelledby": lblId });
        f.options.forEach(function (o) {
          var cur = ans[f.id] || (multi ? [] : null);
          var inp2 = h("input", { type: multi ? "checkbox" : "radio", name: act.id + "-" + f.id, value: o.id, checked: multi ? cur.indexOf(o.id) >= 0 : cur === o.id });
          inp2.addEventListener("change", function () {
            if (multi) {
              var arr = (ans[f.id] || []).filter(function (x) { return x !== o.id; });
              if (inp2.checked) arr.push(o.id);
              ans[f.id] = arr;
            } else ans[f.id] = o.id;
            persist();
            if (!multi && /salida/i.test(o.label)) highlight(o.id);
          });
          grp.appendChild(h("label", { class: "opt" }, inp2, h("span", null, o.label)));
        });
        if (multi) fb.appendChild(h("p", { class: "hint" }, "Puedes marcar más de una."));
        fb.appendChild(grp);
      }
      fEls[f.id] = fb; fields.appendChild(fb);
    });
    function highlight(id) { u.$$(".output", outs).forEach(function (o) { o.classList.toggle("chosen", o.getAttribute("data-out") === id); }); }
    B.appendChild(fields);
    function persist() { store.put("a", act.id, { draft: Object.assign({}, ans) }); fbArea.hidden = true; }
    function fieldOk(f) {
      var v = ans[f.id];
      if (f.input_type === "number") {
        var n = u.parseNum(v), e = u.parseNum(f.expected);
        return !isNaN(n) && Math.abs(n - e) <= ((act.scoring && act.scoring.numeric_tolerance) || 0.01);
      }
      if (f.input_type === "multi_select") return (v || []).slice().sort().join(",") === f.expected.split(",").map(function (x) { return x.trim(); }).sort().join(",");
      return v === f.expected;
    }
    var fbArea = h("div", { hidden: true });
    var check = h("button", { class: "btn btn-primary", type: "button" }, icon("revision"), "Comprobar registro");
    check.addEventListener("click", function () {
      var empty = act.fields.filter(function (f) { var v = ans[f.id]; return v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length); });
      if (empty.length) { u.clear(fbArea); fbArea.hidden = false; fbArea.appendChild(fbBox(false, "Faltan campos", "Completa: " + empty.map(function (f) { return f.id; }).join(", ") + ". Tu avance está guardado.")); return; }
      show(true);
    });
    function show(fresh) {
      var wrong = 0;
      act.fields.forEach(function (f) {
        var ok = fieldOk(f), fb = fEls[f.id];
        fb.classList.remove("ok", "no"); fb.classList.add(ok ? "ok" : "no");
        var old = fb.querySelector(".ffb"); if (old) old.remove();
        fb.appendChild(h("p", { class: "ffb" }, h("b", null, ok ? "Coincide. " : "Revisa. "), f.feedback));
        if (!ok) wrong++;
      });
      if (fresh) { recordAttempt(act, Object.assign({}, ans), wrong === 0); store.put("a", act.id, { showfb: true }); }
      u.clear(fbArea); fbArea.hidden = false;
      fbArea.appendChild(fbBox(wrong === 0, wrong === 0 ? "Registro coherente con el expediente" : wrong + " campo(s) por revisar", wrong === 0 ? act.feedback.success : act.feedback.retry));
      if (act.key_output) highlight(act.key_output);
      fbArea.appendChild(h("p", { class: "note" }, "Salida defendible: " + act.key_output + ". Las salidas son material controlado del curso; no se atribuyen a un proveedor."));
      fbArea.appendChild(h("div", { class: "btn-row" }, reviewedButton("a", act.id)));
      fbArea.appendChild(stateLine(store.get("a", act.id)));
    }
    B.appendChild(h("div", { class: "btn-row" }, check));
    B.appendChild(fbArea);
    B.appendChild(transferBlock(act));
    B.appendChild(microNote(act));
    if (rec.sub && rec.showfb) show(false);
    mount.appendChild(el);
  }

  /* =====================================================================
     5. Micro-decisión abierta (P04) + microproducto
     ===================================================================== */
  function decision(screen, mount) {
    var D = screen.decision, id = screen.id;
    var rec = store.get("p", id) || {};
    var el = frame("Haz tu propia comprobación", "Micropráctica", "tag-teal", "encargo");
    var B = el._body;
    B.appendChild(u.paragraphs(screen.text, "prose"));
    var fs = h("fieldset", { class: "opts" }, h("legend", null, "Elige la decisión más defendible"));
    var choice = rec.ch || null;
    D.options.forEach(function (o) {
      var r = h("input", { type: "radio", name: id + "-d", value: o.id, checked: choice === o.id });
      r.addEventListener("change", function () { choice = o.id; store.put("p", id, { ch: o.id }); });
      fs.appendChild(h("label", { class: "opt", "data-opt": o.id }, r, h("span", { class: "oid" }, o.id), h("span", null, o.text)));
    });
    B.appendChild(fs);
    var fbArea = h("div");
    var check = h("button", { class: "btn btn-primary", type: "button" }, icon("revision"), "Comprobar decisión");
    check.addEventListener("click", function () {
      if (!choice) { u.toast("Elige una alternativa antes de comprobar."); return; }
      var ok = choice === D.key;
      var cur = store.get("p", id) || {};
      store.put("p", id, { sub: true, ok: ok, att: (cur.att || 0) + 1, first: cur.first || choice, last: choice }, { now: true });
      store.interaction({ id: id, type: "choice", response: choice, result: ok ? "correct" : "incorrect", description: "Micropráctica " + id });
      showFb();
      IATU.app && IATU.app.refreshProgress();
    });
    function showFb() {
      var r = store.get("p", id) || {};
      u.$$(".opt", fs).forEach(function (l) {
        l.classList.remove("is-key", "is-wrong");
        var oid = l.getAttribute("data-opt");
        if (oid === D.key) l.classList.add("is-key"); else if (oid === r.last) l.classList.add("is-wrong");
      });
      u.clear(fbArea);
      var ok = r.last === D.key;
      fbArea.appendChild(fbBox(ok, ok ? "Decisión defendible (" + D.key + ")" : "La decisión más defendible es " + D.key, D.feedback));
      // Microproducto
      var mp = h("div", { class: "card", style: { marginTop: "1rem" } });
      mp.appendChild(h("h3", { style: { marginTop: 0 } }, icon("lapiz"), " Microproducto"));
      mp.appendChild(h("p", null, D.action));
      var tid = u.newId("mp");
      var ta = h("textarea", { id: tid }, r.mp || "");
      var refBox = h("div", { class: "ref", hidden: !r.ref, tabindex: "-1" }, h("span", { class: "ref-label" }, "Referencia"), D.reference);
      var cnt = h("p", { class: "counter", "aria-live": "polite" });
      var showRef = h("button", { class: "btn btn-sm", type: "button", disabled: !(r.mp && r.mp.trim().length >= 20) && !r.ref }, icon("ver"), "Comparar con la referencia");
      var skip = h("button", { class: "linklike", type: "button" }, "No puedo escribir ahora: ver la referencia igual");
      ta.addEventListener("input", function () {
        store.put("p", id, { mp: ta.value });
        showRef.disabled = ta.value.trim().length < 20;
        cnt.textContent = ta.value.trim().length < 20 ? "Escribe al menos una frase para desbloquear la referencia." : "";
      });
      function reveal(noProduct) {
        refBox.hidden = false; refBox.focus();
        store.put("p", id, { ref: true, sinProducto: !!noProduct });
      }
      showRef.addEventListener("click", function () { reveal(false); });
      skip.addEventListener("click", function () { reveal(true); });
      mp.appendChild(h("label", { class: "fl", for: tid }, "Tu versión"));
      mp.appendChild(ta); mp.appendChild(cnt);
      mp.appendChild(h("div", { class: "btn-row" }, showRef, skip));
      mp.appendChild(refBox);
      mp.appendChild(h("p", { class: "note" }, "Compara criterios, no palabras. Se aceptan redacciones distintas que conserven hechos y límites."));
      fbArea.appendChild(mp);
      fbArea.appendChild(h("div", { class: "btn-row" }, reviewedButton("p", id)));
      fbArea.appendChild(stateLine(store.get("p", id)));
    }
    B.appendChild(h("div", { class: "btn-row" }, check));
    B.appendChild(fbArea);
    if (rec.sub) showFb();
    mount.appendChild(el);
  }

  /* =====================================================================
     6. Tarjetas que se dan vuelta (predicción opcional; girar no da puntos)
     ===================================================================== */
  function flipcards(list, mount) {
    var grid = h("div", { class: "flips" });
    list.forEach(function (fc) {
      var rec = store.get("fc", fc.id) || {};
      var back = rec.face === "back";
      var backId = u.newId("fcb");
      var predId = u.newId("fcp");
      var pred = h("textarea", { id: predId, rows: 2, placeholder: "Tu hipótesis (opcional)" }, rec.pred || "");
      pred.addEventListener("input", function () { store.put("fc", fc.id, { pred: pred.value }); });
      var toBack = h("button", { class: "btn btn-sm", type: "button", "aria-expanded": String(back), "aria-controls": backId }, icon("tarjeta"), "Mostrar criterio");
      var toFront = h("button", { class: "btn btn-sm", type: "button" }, icon("deshacer"), "Volver a la pregunta");
      var front = h("div", { class: "flip-face flip-front", "aria-hidden": String(back) },
        h("span", { class: "face-label" }, "Pregunta"), h("p", { class: "q" }, fc.front),
        h("label", { class: "sr-only", for: predId }, "Tu hipótesis antes de ver el criterio (opcional)"), pred, toBack);
      var bk = h("div", { class: "flip-face flip-back", id: backId, "aria-hidden": String(!back) },
        h("span", { class: "face-label" }, "Criterio"), h("p", null, fc.back), toFront);
      var card = h("div", { class: "flip" + (back ? " is-back" : ""), "data-fc": fc.id }, h("div", { class: "flip-inner" }, front, bk));
      function setFace(b) {
        card.classList.toggle("is-back", b);
        front.setAttribute("aria-hidden", String(b)); bk.setAttribute("aria-hidden", String(!b));
        toBack.setAttribute("aria-expanded", String(b));
        if (b) { front.inert = true; bk.inert = false; } else { front.inert = false; bk.inert = true; }
        store.put("fc", fc.id, { face: b ? "back" : "front", rev: true });
        (b ? toFront : toBack).focus();
      }
      front.inert = back; bk.inert = !back;
      toBack.addEventListener("click", function () { setFace(true); });
      toFront.addEventListener("click", function () { setFace(false); });
      var extra = h("details", { class: "flip-extra" }, h("summary", null, "Aplícalo"), h("p", null, fc.action));
      grid.appendChild(h("div", null, card, extra));
    });
    mount.appendChild(h("section", { "aria-label": "Tarjetas de contraste" },
      h("h2", null, icon("tarjeta"), " Contrasta antes de seguir"),
      h("p", { class: "note" }, "Piensa tu respuesta y luego gira la tarjeta. Girar tarjetas es opcional y no otorga puntos."),
      grid));
  }

  /* =====================================================================
     7. Hotspots anclados a bloques de un documento HTML semántico
     ===================================================================== */
  function hotspots(hs, mount) {
    var rec = store.get("hs", hs.id) || {};
    var visited = (rec.vis || []).slice();
    var el = frame(hs.title, "Explora el documento", "tag-violet", "hotspot");
    var B = el._body;
    B.appendChild(h("p", { class: "note" }, hs.source_input));
    var wrap = h("div", { class: "hs-wrap" });
    var doc = h("div", { class: "doc hs-doc", "aria-label": hs.document.title },
      h("div", { class: "doc-tab" }, icon("documento"), hs.document.kind),
      h("h3", { class: "doc-title" }, hs.document.title));
    var panel = h("div", { class: "hs-panel" });
    var detail = h("div", { class: "card", role: "region", "aria-live": "polite", tabindex: "-1" }, h("p", { class: "note" }, "Elige una zona numerada del documento o de la lista."));
    var list = h("ul", { class: "hs-list", "aria-label": "Zonas del documento" });
    var blockBtns = {};
    hs.regions.forEach(function (r) {
      var blk = hs.document.blocks.filter(function (b) { return b.id === r.anchor.block_id; })[0];
      var btn = h("button", { class: "hs-block" + (visited.indexOf(r.id) >= 0 ? " visited" : ""), type: "button", "aria-expanded": "false", "aria-controls": "", "data-region": r.id },
        h("span", { class: "hs-marker", "aria-hidden": "true" }, r.region_number),
        h("span", { class: "blabel" }, "Zona " + r.region_number + " · " + (blk ? blk.label : r.label)),
        blk ? blk.text : r.text);
      btn.addEventListener("click", function () { open(r.id); });
      blockBtns[r.id] = btn; doc.appendChild(btn);
      var lb = h("button", { class: "btn btn-sm", type: "button" }, h("span", { class: "mono" }, r.region_number + "."), " " + r.label);
      lb.addEventListener("click", function () { open(r.id, true); });
      list.appendChild(h("li", null, lb));
    });
    function open(rid, fromList) {
      var r = hs.regions.filter(function (x) { return x.id === rid; })[0];
      Object.keys(blockBtns).forEach(function (k) { blockBtns[k].setAttribute("aria-expanded", String(k === rid)); });
      if (visited.indexOf(rid) < 0) visited.push(rid);
      blockBtns[rid].classList.add("visited");
      store.put("hs", hs.id, { open: rid, vis: visited.slice() });
      u.clear(detail);
      detail.appendChild(h("h3", { style: { marginTop: 0 } }, "Zona " + r.region_number + ": " + r.label));
      detail.appendChild(h("p", null, r.feedback));
      if (fromList) detail.focus();
    }
    panel.appendChild(detail);
    panel.appendChild(h("h3", null, "Lista equivalente de zonas"));
    panel.appendChild(list);
    wrap.appendChild(doc); wrap.appendChild(panel);
    B.appendChild(wrap);
    // Decisión posterior (abierta y formativa)
    var dec = h("div", { class: "card", style: { marginTop: "1.2rem" } });
    dec.appendChild(h("h3", { style: { marginTop: 0 } }, "Decisión: " + hs.decision.prompt));
    dec.appendChild(h("p", { class: "note" }, hs.decision.instruction));
    var tid = u.newId("hsd");
    var ta = h("textarea", { id: tid }, rec.draft || "");
    ta.addEventListener("input", function () { store.put("hs", hs.id, { draft: ta.value }); });
    dec.appendChild(h("label", { class: "fl", for: tid }, "Tu conclusión"));
    dec.appendChild(ta);
    var refBox = h("div", { class: "ref", hidden: !rec.fbr, tabindex: "-1" }, h("span", { class: "ref-label" }, "Referencia"), hs.decision.reference);
    var b = h("button", { class: "btn btn-sm", type: "button" }, icon("ver"), "Comparar con la referencia");
    b.addEventListener("click", function () { refBox.hidden = false; refBox.focus(); store.put("hs", hs.id, { fbr: true }); });
    dec.appendChild(h("div", { class: "btn-row" }, b));
    dec.appendChild(refBox);
    dec.appendChild(h("p", { class: "note" }, "Abrir zonas no da puntos ni es obligatorio: sirve para encontrar la evidencia antes de decidir."));
    B.appendChild(dec);
    mount.appendChild(el);
  }

  IATU.inter = {
    activity: function (act, mount) {
      if (act.type === "drag_classify") return classify(act, mount);
      if (act.type === "order_dependencies") return orderDeps(act, mount);
      if (act.type === "branch_sequence") return branchSeq(act, mount);
      if (act.type === "evidence_comparison") return compare(act, mount);
    },
    decision: decision, flipcards: flipcards, hotspots: hotspots,
    frame: frame, fbBox: fbBox, reviewedButton: reviewedButton, stateLine: stateLine
  };
})();
