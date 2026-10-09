/* Seguridad 360 · actividades: elección (decisión, quiz, chat), mito o realidad, clasificar, ordenar, matriz,
   bandeja de correo, permisos, ficha, inspección y construir. Todas funcionan con teclado y sin arrastrar. */
(function () {
  "use strict";
  var S = window.S360, u = S.u, h = u.h, media = S.media;
  var T = S.tipos = S.tipos || {};
  var fb = function () { return S.fb.apply(null, arguments); };
  var btn = function () { return S.btn.apply(null, arguments); };

  /* ---------- Elección única o múltiple con feedback por opción ---------- */
  function eleccion(q, ctx, opts) {
    opts = opts || {};
    var key = opts.key || "e";
    var prev = (ctx.result() || {})[key];
    var multiple = !!q.multiple;
    var opciones = q.opciones.map(function (o, i) { return Object.assign({ _i: i }, o); });
    if (!q.sin_barajar) opciones = u.shuffle(opciones, (q.id || ctx.scr.id) + key);
    var w = h("div", { class: "eleccion" + (multiple ? " multiple" : "") });
    if (q.pregunta || q.enunciado) w.appendChild(h("p", { class: "el-preg" }, h("b", null, q.pregunta || q.enunciado)));
    if (multiple) w.appendChild(h("p", { class: "nota-suave" }, "Elige " + (q.minimo && q.maximo && q.minimo !== q.maximo ? "entre " + q.minimo + " y " + q.maximo : (q.maximo || "todas las") ) + " opciones y luego comprueba."));
    var list = h("div", { class: "el-opciones", role: multiple ? "group" : "radiogroup", "aria-label": q.pregunta || q.enunciado || "Opciones" });
    var out = h("div", { class: "el-fb" });
    var sel = {};
    var letras = "ABCDEFG";
    var buttons = opciones.map(function (o, k) {
      var b = h("button", { type: "button", class: "opcion", role: multiple ? "checkbox" : "radio", "aria-checked": "false" },
        h("span", { class: "op-l" }, letras[k]), h("span", { class: "op-t" }, o.texto), h("span", { class: "op-m" }, u.icon(multiple ? "square" : "circle")));
      b.addEventListener("click", function () {
        if (w.classList.contains("cerrada")) return;
        if (multiple) { sel[o._i] = !sel[o._i]; b.setAttribute("aria-checked", String(!!sel[o._i])); b.classList.toggle("sel", !!sel[o._i]); media.sfx("tic"); }
        else responder([o._i]);
      });
      list.appendChild(b);
      return b;
    });
    function responder(ids) {
      var correctas = q.opciones.map(function (o, i) { return o.correcta ? i : -1; }).filter(function (i) { return i >= 0; });
      var ok = ids.length === correctas.length && ids.every(function (i) { return correctas.indexOf(i) >= 0; });
      var r = ctx.result() || {}, cur = r[key] || { n: 0 };
      cur.n = (cur.n || 0) + 1; cur.sel = ids; cur.ok = ok; if (cur.primera === undefined) cur.primera = ok;
      var patch = {}; patch[key] = cur;
      if (!opts.noDone) patch.done = true;
      ctx.save(patch);
      pintar(ids, ok, true);
      if (opts.onAnswer) opts.onAnswer(ok, ids);
    }
    function pintar(ids, ok, animar) {
      u.clear(out);
      w.classList.add("cerrada");
      buttons.forEach(function (b, k) {
        var o = opciones[k], elegido = ids.indexOf(o._i) >= 0;
        b.classList.toggle("sel", elegido);
        b.setAttribute("aria-checked", String(elegido));
        b.classList.toggle("correcta", !!o.correcta && (ok || elegido || multiple));
        b.classList.toggle("incorrecta", elegido && !o.correcta);
        b.disabled = true;
      });
      if (multiple) {
        var lst = h("ul", { class: "fb-lista" });
        opciones.forEach(function (o) {
          var elegido = ids.indexOf(o._i) >= 0;
          if (!elegido && !o.correcta) return;
          lst.appendChild(h("li", { class: o.correcta ? (elegido ? "ok" : "falto") : "mal" }, u.icon(o.correcta ? (elegido ? "check" : "circle-dashed") : "x"), h("span", null, h("b", null, o.texto + ": "), o.feedback || "")));
        });
        out.appendChild(fb(ok ? "ok" : "parcial", ok ? (q.explicacion || "") : "Revisa lo que marcaste y lo que faltó.", ok ? "Bien resuelto" : "Casi"));
        out.appendChild(lst);
        if (!ok && q.explicacion) out.appendChild(fb("info", q.explicacion));
      } else {
        var o = q.opciones[ids[0]];
        out.appendChild(fb(ok ? "ok" : "mal", o.feedback || "", ok ? "Buena decisión" : "Piénsalo de nuevo"));
        if (q.explicacion && ok) out.appendChild(h("div", { class: "el-expl" }, u.icon("lightbulb"), u.prose(q.explicacion, "prose")));
      }
      if (!ok || multiple) {
        out.appendChild(h("div", { class: "fila-acc" }, btn(ok ? "Volver a intentarlo" : "Intentar otra vez", "rotate-ccw", function () {
          w.classList.remove("cerrada"); sel = {}; u.clear(out);
          buttons.forEach(function (b) { b.disabled = false; b.className = "opcion"; b.setAttribute("aria-checked", "false"); });
          buttons[0].focus();
        }, "btn-sec")));
      }
      if (animar) out.scrollIntoView && !u.reducedMotion() && out.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    w.appendChild(list);
    if (multiple) {
      w.appendChild(h("div", { class: "fila-acc" }, btn("Comprobar", "check", function () {
        var ids = Object.keys(sel).filter(function (k) { return sel[k]; }).map(Number);
        var min = q.minimo || 1, max = q.maximo || q.opciones.length;
        if (ids.length < min || ids.length > max) { u.toast("Marca " + (min === max ? min : "entre " + min + " y " + max) + " opciones."); return; }
        responder(ids);
      })));
    }
    w.appendChild(out);
    if (prev && prev.sel) pintar(prev.sel, prev.ok, false);
    return w;
  }
  S.eleccion = function (q, ctx, opts) { return eleccion(q, ctx, opts); };

  /* ---------- Decisión ---------- */
  T.decision = function (scr, ctx) {
    var sit = h("div", { class: "situacion" }, h("span", { class: "sit-k" }, u.icon("map-pin"), "La situación"), u.prose(scr.situacion || scr.texto || "", "prose"));
    var w = h("div", { class: "decision-w" });
    var top = scr.imagen ? S.media2col(scr, sit) : sit;
    w.appendChild(top);
    if (scr.situacion && scr.texto) w.appendChild(u.prose(scr.texto, "prose"));
    w.appendChild(eleccion(scr, ctx));
    return w;
  };

  /* ---------- Quiz (varias preguntas) ---------- */
  T.quiz = function (scr, ctx) {
    var w = h("div", { class: "quiz-w" });
    if (scr.texto) w.appendChild(u.prose(scr.texto, "prose"));
    var n = scr.preguntas.length, cur = 0;
    var cab = h("div", { class: "quiz-cab" });
    var box = h("div", { class: "quiz-box" });
    var r0 = ctx.result() || {};
    function estado() {
      var r = ctx.result() || {}, ok = 0, resp = 0;
      for (var i = 0; i < n; i++) { if (r["q" + i]) { resp++; if (r["q" + i].primera) ok++; } }
      return { ok: ok, resp: resp };
    }
    function show(i) {
      cur = i; u.clear(box); u.clear(cab);
      for (var k = 0; k < n; k++) {
        var rr = (ctx.result() || {})["q" + k];
        cab.appendChild(h("button", { type: "button", class: "qz-dot" + (k === i ? " on" : "") + (rr ? (rr.ok ? " ok" : " mal") : ""), "aria-label": "Pregunta " + (k + 1), onclick: (function (kk) { return function () { show(kk); }; })(k) }, String(k + 1)));
      }
      var q = Object.assign({ id: scr.id + "-q" + i }, scr.preguntas[i]);
      box.appendChild(h("p", { class: "kicker" }, "Pregunta " + (i + 1) + " de " + n));
      box.appendChild(eleccion(q, ctx, { key: "q" + i, noDone: true, onAnswer: function () {
        var e = estado();
        if (e.resp === n) ctx.save({ done: true, sc: e.ok / n });
        show(cur);
      } }));
      var nav = h("div", { class: "fila-acc" });
      if (i < n - 1) nav.appendChild(btn("Siguiente pregunta", "arrow-right", function () { show(i + 1); }, "btn-sec"));
      else if (estado().resp === n) nav.appendChild(h("p", { class: "qz-res" }, u.icon("circle-check"), "Respondiste todas. Acertaste " + estado().ok + " de " + n + " en el primer intento."));
      box.appendChild(nav);
    }
    w.appendChild(cab); w.appendChild(box);
    var first = 0; for (var k = 0; k < n; k++) if (!r0["q" + k]) { first = k; break; }
    show(first);
    return w;
  };

  /* ---------- Mito o realidad ---------- */
  T.mito_realidad = function (scr, ctx) {
    var w = h("div", { class: "mito-w" });
    if (scr.texto) w.appendChild(u.prose(scr.texto, "prose"));
    var prev = (ctx.result() || {}).resp || {};
    var grid = h("div", { class: "mitos" });
    scr.afirmaciones.forEach(function (a, i) {
      var card = h("div", { class: "mito", style: { "--i": i } });
      var res = h("div", { class: "mito-res" });
      var bM = h("button", { type: "button", class: "btn-mito" }, u.icon("ghost"), "Mito");
      var bR = h("button", { type: "button", class: "btn-mito" }, u.icon("badge-check"), "Realidad");
      function resp(esVerdad, silent) {
        prev[i] = esVerdad ? "r" : "m";
        var ok = esVerdad === !!a.es_verdad;
        card.classList.add("resp", ok ? "ok" : "mal");
        bM.disabled = bR.disabled = true;
        (esVerdad ? bR : bM).classList.add("sel");
        u.clear(res);
        res.appendChild(h("p", { class: "mito-ver" }, u.icon(a.es_verdad ? "badge-check" : "ghost"), h("b", null, a.es_verdad ? "Realidad" : "Mito"), ok ? " · acertaste" : " · no era así"));
        res.appendChild(u.prose(a.explicacion, "prose"));
        if (!silent) { media.sfx(ok ? "bien" : "mal"); u.announce((ok ? "Acertaste. " : "No era así. ") + a.explicacion); }
        var done = Object.keys(prev).length === scr.afirmaciones.length;
        if (!silent) ctx.save({ resp: prev, done: done || undefined });
      }
      bM.addEventListener("click", function () { resp(false); });
      bR.addEventListener("click", function () { resp(true); });
      card.appendChild(h("p", { class: "mito-af" }, "«" + a.texto + "»"));
      card.appendChild(h("div", { class: "mito-acc" }, bM, bR));
      card.appendChild(res);
      grid.appendChild(card);
      if (prev[i]) resp(prev[i] === "r", true);
    });
    w.appendChild(grid);
    return w;
  };

  /* ---------- Clasificar (y pirámide de jerarquía de controles) ---------- */
  T.clasificar = function (scr, ctx) {
    var piramide = scr.estilo === "piramide";
    var w = h("div", { class: "clasificar-w" + (piramide ? " piramide-w" : "") });
    if (scr.consigna || scr.texto) w.appendChild(u.prose(scr.consigna || scr.texto, "prose consigna"));
    var prev = (ctx.result() || {}).asig || {};
    var asig = Object.assign({}, prev);
    var elementos = u.shuffle(scr.elementos.map(function (e, i) { return Object.assign({ _i: i }, e); }), scr.id);
    var cats = scr.categorias;
    var zonas = h("div", { class: "cl-zonas" + (piramide ? " piramide" : "") + " n" + cats.length });
    var pool = h("div", { class: "cl-pool", "aria-label": "Elementos por clasificar" });
    var zoneLists = {};
    cats.forEach(function (c, k) {
      var lst = h("ul", { class: "cl-lista" });
      zoneLists[c.id] = lst;
      var z = h("section", { class: "cl-zona", "data-cat": c.id, style: { "--k": k, "--n": cats.length } },
        h("header", null, u.icon(c.icono || "folder"), h("b", null, c.nombre), c.descripcion ? h("small", null, c.descripcion) : null), lst);
      z.addEventListener("dragover", function (ev) { ev.preventDefault(); z.classList.add("sobre"); });
      z.addEventListener("dragleave", function () { z.classList.remove("sobre"); });
      z.addEventListener("drop", function (ev) { ev.preventDefault(); z.classList.remove("sobre"); var i = parseInt(ev.dataTransfer.getData("text/plain"), 10); if (!isNaN(i)) mover(i, c.id); });
      zonas.appendChild(z);
    });
    var cards = {};
    elementos.forEach(function (e) {
      var chips = h("div", { class: "cl-chips", role: "group", "aria-label": "Clasificar en" });
      cats.forEach(function (c) {
        chips.appendChild(h("button", { type: "button", class: "chip", title: c.nombre, onclick: function () { mover(e._i, c.id); } }, u.icon(c.icono || "folder"), h("span", null, c.nombre)));
      });
      var card = h("li", { class: "cl-el", draggable: "true", "data-i": e._i }, h("span", { class: "cl-txt" }, e.texto), chips, h("div", { class: "cl-fb" }));
      card.addEventListener("dragstart", function (ev) { ev.dataTransfer.setData("text/plain", String(e._i)); card.classList.add("arrastrando"); });
      card.addEventListener("dragend", function () { card.classList.remove("arrastrando"); });
      cards[e._i] = card;
    });
    var poolList = h("ul", { class: "cl-lista" });
    pool.appendChild(h("p", { class: "kicker" }, u.icon("hand"), "Elige dónde va cada uno (puedes arrastrar o usar los botones)"));
    pool.appendChild(poolList);
    function mover(i, cat, silent) {
      asig[i] = cat;
      var card = cards[i];
      card.classList.remove("ok", "mal"); u.clear(card.querySelector(".cl-fb"));
      zoneLists[cat].appendChild(card);
      u.$$(".chip", card).forEach(function (c, k) { c.classList.toggle("on", cats[k].id === cat); c.setAttribute("aria-pressed", String(cats[k].id === cat)); });
      if (!silent) { media.sfx("soltar"); ctx.save({ asig: asig }); }
      pool.hidden = !poolList.children.length;
    }
    elementos.forEach(function (e) { if (asig[e._i]) mover(e._i, asig[e._i], true); else poolList.appendChild(cards[e._i]); });
    pool.hidden = !poolList.children.length;
    var out = h("div", { class: "cl-out" });
    function comprobar(silent) {
      var faltan = scr.elementos.filter(function (e, i) { return !asig[i]; }).length;
      if (faltan) { if (!silent) u.toast("Te faltan " + faltan + " por clasificar."); return; }
      var ok = 0;
      scr.elementos.forEach(function (e, i) {
        var card = cards[i], bien = asig[i] === e.categoria;
        card.classList.toggle("ok", bien); card.classList.toggle("mal", !bien);
        var f = card.querySelector(".cl-fb"); u.clear(f);
        if (!bien || e.feedback) f.appendChild(h("p", null, u.icon(bien ? "check" : "x"), h("span", null, (bien ? "" : "Va en «" + nombreCat(e.categoria) + "». ") + (e.feedback || ""))));
        if (bien) ok++;
      });
      u.clear(out);
      var total = scr.elementos.length, todo = ok === total;
      out.appendChild(fb(todo ? "ok" : ok >= total * 0.6 ? "parcial" : "mal", todo ? (scr.feedback_ok || "Todo en su lugar. Revisa igual la explicación de cada uno.") : "Acertaste " + ok + " de " + total + ". Lee el feedback de los que quedaron en rojo, muévelos y vuelve a comprobar.", ok + " de " + total));
      var r = ctx.result() || {};
      ctx.save({ asig: asig, done: true, ok: todo, sc: ok / total, n: (r.n || 0) + (silent ? 0 : 1), primera: r.primera === undefined ? ok / total : r.primera });
    }
    function nombreCat(id) { var c = cats.filter(function (x) { return x.id === id; })[0]; return c ? c.nombre : id; }
    w.appendChild(pool);
    w.appendChild(zonas);
    w.appendChild(h("div", { class: "fila-acc" }, btn("Comprobar", "check", function () { comprobar(false); })));
    w.appendChild(out);
    if ((ctx.result() || {}).done) comprobar(true);
    return w;
  };

  /* ---------- Ordenar ---------- */
  T.ordenar = function (scr, ctx) {
    var w = h("div", { class: "ordenar-w" });
    if (scr.consigna || scr.texto) w.appendChild(u.prose(scr.consigna || scr.texto, "prose consigna"));
    var prev = (ctx.result() || {}).orden;
    var orden = prev && prev.length === scr.pasos.length ? prev.slice() : u.shuffle(scr.pasos.map(function (p) { return p.id; }), scr.id);
    if (!prev && orden.join() === (scr.orden || []).join()) orden.reverse();
    var byId = {}; scr.pasos.forEach(function (p) { byId[p.id] = p; });
    var ol = h("ol", { class: "orden-lista" });
    var out = h("div", { class: "cl-out" });
    function pintar(focusId) {
      u.clear(ol);
      orden.forEach(function (id, k) {
        var li = h("li", { class: "orden-it", draggable: "true", "data-id": id },
          h("span", { class: "or-n" }, String(k + 1)), h("span", { class: "or-t" }, byId[id].texto),
          h("span", { class: "or-acc" },
            h("button", { type: "button", "aria-label": "Subir: " + byId[id].texto, disabled: k === 0, onclick: function () { mover(k, k - 1); } }, u.icon("chevron-up")),
            h("button", { type: "button", "aria-label": "Bajar: " + byId[id].texto, disabled: k === orden.length - 1, onclick: function () { mover(k, k + 1); } }, u.icon("chevron-down"))));
        li.addEventListener("dragstart", function (ev) { ev.dataTransfer.setData("text/plain", String(k)); li.classList.add("arrastrando"); });
        li.addEventListener("dragend", function () { li.classList.remove("arrastrando"); });
        li.addEventListener("dragover", function (ev) { ev.preventDefault(); });
        li.addEventListener("drop", function (ev) { ev.preventDefault(); var from = parseInt(ev.dataTransfer.getData("text/plain"), 10); if (!isNaN(from)) mover(from, k); });
        ol.appendChild(li);
      });
      if (focusId) { var el = ol.querySelector('[data-id="' + focusId + '"] .or-acc button:not([disabled])'); if (el) el.focus(); }
    }
    function mover(a, b) {
      if (b < 0 || b >= orden.length) return;
      var id = orden.splice(a, 1)[0]; orden.splice(b, 0, id);
      media.sfx("soltar"); u.clear(out); ctx.save({ orden: orden }); pintar(id);
      u.announce(byId[id].texto + ": posición " + (b + 1));
    }
    pintar();
    function comprobar(silent) {
      var validas = [scr.orden].concat(scr.alternativas_validas || []);
      var ok = validas.some(function (v) { return v && v.join() === orden.join(); });
      var bien = 0; orden.forEach(function (id, k) { if (scr.orden[k] === id) bien++; });
      u.$$(".orden-it", ol).forEach(function (li, k) { li.classList.toggle("ok", ok || scr.orden[k] === orden[k]); li.classList.toggle("mal", !ok && scr.orden[k] !== orden[k]); });
      u.clear(out);
      out.appendChild(fb(ok ? "ok" : "mal", ok ? (scr.feedback_ok || "") : (scr.feedback_error || "Revisa qué tiene que pasar antes de qué."), ok ? "Orden correcto" : bien + " de " + orden.length + " en su lugar"));
      var r = ctx.result() || {};
      ctx.save({ orden: orden, done: true, ok: ok, n: (r.n || 0) + (silent ? 0 : 1) });
    }
    w.appendChild(ol);
    w.appendChild(h("div", { class: "fila-acc" }, btn("Comprobar el orden", "check", function () { comprobar(false); })));
    w.appendChild(out);
    if ((ctx.result() || {}).done) comprobar(true);
    return w;
  };

  /* ---------- Matriz de probabilidad y consecuencia ---------- */
  T.matriz = function (scr, ctx) {
    var w = h("div", { class: "matriz-w" });
    if (scr.consigna || scr.texto) w.appendChild(u.prose(scr.consigna || scr.texto, "prose consigna"));
    var P = ["Baja", "Media", "Alta"], Cn = ["Leve", "Moderada", "Grave"];
    var prev = (ctx.result() || {}).val || {};
    var val = JSON.parse(JSON.stringify(prev));
    var nivel = function (p, c) { var s = p * c; return s >= 6 ? ["Alto", "alto"] : s >= 3 ? ["Medio", "medio"] : ["Bajo", "bajo"]; };
    var tabla = h("div", { class: "mz-lista" });
    var heat = h("div", { class: "mz-heat", "aria-hidden": "true" });
    for (var cc = 3; cc >= 1; cc--) for (var pp = 1; pp <= 3; pp++) heat.appendChild(h("span", { class: "mz-c n-" + nivel(pp, cc)[1], "data-pc": pp + "-" + cc }));
    var heatW = h("div", { class: "mz-heat-w" }, h("span", { class: "mz-ejey" }, "Consecuencia"), heat, h("span", { class: "mz-ejex" }, "Probabilidad"));
    function seg(lbl, opciones, cur, fn) {
      var g = h("div", { class: "seg", role: "radiogroup", "aria-label": lbl });
      opciones.forEach(function (o, k) {
        g.appendChild(h("button", { type: "button", role: "radio", "aria-checked": String(cur === k + 1), class: cur === k + 1 ? "on" : "", onclick: function () { fn(k + 1); } }, o));
      });
      return g;
    }
    function fila(pz, i) {
      var v = val[pz.id] || {};
      var res = h("span", { class: "mz-nivel" + (v.p && v.c ? " n-" + nivel(v.p, v.c)[1] : "") }, v.p && v.c ? nivel(v.p, v.c)[0] : "—");
      var f = h("div", { class: "mz-fila", style: { "--i": i } },
        h("p", { class: "mz-pel" }, h("span", { class: "mz-n" }, String(i + 1)), pz.texto),
        h("div", { class: "mz-ctrl" },
          h("div", null, h("small", null, "Probabilidad"), seg("Probabilidad de: " + pz.texto, P, v.p, function (k) { set(pz.id, "p", k); })),
          h("div", null, h("small", null, "Consecuencia"), seg("Consecuencia de: " + pz.texto, Cn, v.c, function (k) { set(pz.id, "c", k); })),
          h("div", null, h("small", null, "Nivel"), res)),
        h("div", { class: "mz-fb" }));
      return f;
    }
    function set(id, k, n) { val[id] = val[id] || {}; val[id][k] = n; media.sfx("tic"); ctx.save({ val: val }); pintar(); }
    function pintar() {
      u.clear(tabla);
      scr.peligros.forEach(function (pz, i) { tabla.appendChild(fila(pz, i)); });
      u.$$(".mz-c", heat).forEach(function (c) { u.clear(c); });
      scr.peligros.forEach(function (pz, i) {
        var v = val[pz.id]; if (!v || !v.p || !v.c) return;
        var cell = heat.querySelector('[data-pc="' + v.p + "-" + v.c + '"]');
        if (cell) cell.appendChild(h("b", null, String(i + 1)));
      });
    }
    pintar();
    var out = h("div", { class: "cl-out" });
    function comprobar(silent) {
      var faltan = scr.peligros.filter(function (pz) { var v = val[pz.id]; return !v || !v.p || !v.c; }).length;
      if (faltan) { if (!silent) u.toast("Completa probabilidad y consecuencia de todos los peligros."); return; }
      var ok = 0;
      pintar();
      u.$$(".mz-fila", tabla).forEach(function (f, i) {
        var pz = scr.peligros[i], v = val[pz.id];
        var dentro = Math.abs(v.p - pz.probabilidad) <= 1 && Math.abs(v.c - pz.consecuencia) <= 1;
        var exacto = v.p === pz.probabilidad && v.c === pz.consecuencia;
        if (dentro) ok++;
        f.classList.add(dentro ? "ok" : "mal");
        var box = f.querySelector(".mz-fb");
        box.appendChild(h("p", null, h("b", null, (exacto ? "Coincide con nuestra estimación" : dentro ? "Cercano a nuestra estimación" : "Lejos de nuestra estimación") + " (probabilidad " + P[pz.probabilidad - 1].toLowerCase() + ", consecuencia " + Cn[pz.consecuencia - 1].toLowerCase() + "). "), pz.justificacion || ""));
        if (pz.control) box.appendChild(h("p", { class: "mz-ctl" }, u.icon("shield-check"), h("span", null, h("b", null, "Control sugerido: "), pz.control)));
      });
      u.clear(out);
      out.appendChild(fb(ok === scr.peligros.length ? "ok" : "parcial", "Una matriz simple ordena la conversación, pero no reemplaza mirar el trabajo real ni el criterio de quien conoce la tarea. Lo importante es que puedas justificar tu estimación.", ok + " de " + scr.peligros.length + " estimaciones razonables"));
      var r = ctx.result() || {};
      ctx.save({ val: val, done: true, sc: ok / scr.peligros.length, n: (r.n || 0) + (silent ? 0 : 1) });
    }
    w.appendChild(h("div", { class: "mz" }, tabla, heatW));
    w.appendChild(h("div", { class: "fila-acc" }, btn("Comprobar mis estimaciones", "check", function () { comprobar(false); })));
    w.appendChild(out);
    if ((ctx.result() || {}).done) comprobar(true);
    return w;
  };

  /* ---------- Chat (WhatsApp, chat interno, SMS) ---------- */
  T.chat = function (scr, ctx) {
    var canal = scr.canal || "whatsapp";
    var w = h("div", { class: "chat-w" });
    if (scr.texto) w.appendChild(u.prose(scr.texto, "prose"));
    var c = scr.contacto || {};
    var tel = h("div", { class: "telefono canal-" + canal, role: "group", "aria-label": "Conversación de " + (canal === "chat_interno" ? "chat interno" : canal === "sms" ? "SMS" : "WhatsApp") },
      h("div", { class: "tel-top" }, h("span", null, "9:41"), h("span", { class: "tel-icos" }, u.icon("signal"), u.icon("wifi"), u.icon("battery-medium"))),
      h("div", { class: "tel-cab" }, u.icon("chevron-left"), h("span", { class: "tel-av" }, (c.nombre || "?").charAt(0)), h("div", null, h("b", null, c.nombre || ""), h("small", null, c.detalle || "")), u.icon(canal === "sms" ? "message-square" : "phone")));
    var hilo = h("div", { class: "tel-hilo", "aria-live": "polite" });
    tel.appendChild(hilo);
    var fin = h("div", { class: "chat-fin" });
    var i = 0, msgs = scr.mensajes || [];
    var prev = ctx.result();
    function add(m, rapido) {
      var b = h("div", { class: "msj " + (m.de === "yo" ? "msj-yo" : "msj-otro") }, u.prose(m.texto, "prose"), h("small", null, m.hora || ""));
      hilo.appendChild(b);
      hilo.scrollTop = hilo.scrollHeight;
      if (!rapido) media.sfx("mensaje");
    }
    function siguiente() {
      if (i >= msgs.length) { mostrarFin(); return; }
      var m = msgs[i++];
      if (u.reducedMotion() || (prev && prev.done)) { add(m, true); siguiente(); return; }
      var typing = h("div", { class: "msj msj-otro escribiendo", "aria-hidden": "true" }, h("i"), h("i"), h("i"));
      if (m.de !== "yo") { hilo.appendChild(typing); hilo.scrollTop = hilo.scrollHeight; }
      setTimeout(function () { typing.remove(); add(m); setTimeout(siguiente, 500); }, m.de === "yo" ? 300 : Math.min(1800, 500 + m.texto.length * 12));
    }
    function mostrarFin() {
      if (fin.childNodes.length) return;
      if (scr.opciones && scr.opciones.length) fin.appendChild(eleccion(scr, ctx));
    }
    w.appendChild(h("div", { class: "chat-lay" }, tel, fin));
    var started = false;
    var go = btn("Ver los mensajes", "message-circle", function () { go.remove(); started = true; siguiente(); }, "btn-pri btn-chat");
    if (prev && prev.done) { msgs.forEach(function (m) { add(m, true); }); i = msgs.length; mostrarFin(); }
    else hilo.appendChild(go);
    S.onLeave(function () { started = false; });
    return w;
  };

  /* ---------- Bandeja de correo ---------- */
  function linkHover(texto, destino, onPeek) {
    var tip = h("span", { class: "lk-tip", role: "tooltip" }, u.icon("link"), "Lleva a: ", h("code", null, destino));
    var a = h("button", { type: "button", class: "lk-falso", "aria-describedby": null }, texto, tip);
    a.addEventListener("mouseenter", function () { a.classList.add("ver"); if (onPeek) onPeek(); });
    a.addEventListener("mouseleave", function () { a.classList.remove("ver"); });
    a.addEventListener("focus", function () { a.classList.add("ver"); if (onPeek) onPeek(); });
    a.addEventListener("blur", function () { a.classList.remove("ver"); });
    a.addEventListener("click", function () { a.classList.add("ver"); u.toast("En esta simulación los links no abren nada. Fíjate a dónde llevaría: " + destino, "info"); });
    return a;
  }
  S.linkHover = linkHover;
  function dominio(correo) { var m = String(correo || "").match(/@(.+)$/); return m ? m[1] : ""; }
  S.dominio = dominio;
  function cuerpoCorreo(c, onPeek) {
    var body = h("div", { class: "correo-cuerpo" });
    var txt = c.cuerpo || "";
    var enl = c.enlaces || [];
    String(txt).split(/\n/).forEach(function (ln) {
      var p = h("p");
      var restante = ln, puesto = false;
      enl.forEach(function (e) {
        if (puesto || !e.texto) return;
        var k = restante.indexOf(e.texto);
        if (k >= 0) { p.appendChild(document.createTextNode(restante.slice(0, k))); p.appendChild(linkHover(e.texto, e.destino_real, onPeek)); restante = restante.slice(k + e.texto.length); puesto = true; }
      });
      p.appendChild(document.createTextNode(restante));
      if (ln.trim() || puesto) body.appendChild(p);
    });
    var sueltos = enl.filter(function (e) { return e.texto && String(txt).indexOf(e.texto) < 0; });
    if (sueltos.length) body.appendChild(h("p", { class: "correo-btns" }, sueltos.map(function (e) { return linkHover(e.texto, e.destino_real, onPeek); })));
    return body;
  }
  S.cuerpoCorreo = cuerpoCorreo;
  T.bandeja = function (scr, ctx) {
    var w = h("div", { class: "bandeja-w" });
    if (scr.consigna || scr.texto) w.appendChild(u.prose(scr.consigna || scr.texto, "prose consigna"));
    var r0 = ctx.result() || {}, resp = Object.assign({}, r0.resp || {});
    var acciones = scr.acciones || [{ id: "reportar", nombre: "Reportar como sospechoso", icono: "shield-alert" }, { id: "verificar", nombre: "Verificar por otro canal", icono: "phone-call" }, { id: "responder", nombre: "Responder", icono: "reply" }, { id: "archivar", nombre: "Archivar (es legítimo)", icono: "archive" }];
    var app = h("div", { class: "correo-app" });
    var lista = h("ul", { class: "correo-lista", role: "listbox", "aria-label": "Correos" });
    var lector = h("div", { class: "correo-lector", "aria-live": "polite" });
    var prog = h("div", { class: "bj-prog" });
    var items = {};
    function marcar() {
      var n = Object.keys(resp).length, ok = 0;
      scr.correos.forEach(function (c) { if (resp[c.id] && c.accion_correcta.indexOf(resp[c.id]) >= 0) ok++; });
      u.clear(prog);
      prog.appendChild(h("span", null, u.icon("inbox"), n + " de " + scr.correos.length + " correos resueltos"));
      if (n === scr.correos.length) prog.appendChild(h("span", { class: "bj-res" }, u.icon("circle-check"), ok + " decisiones adecuadas"));
      return { n: n, ok: ok };
    }
    scr.correos.forEach(function (c, i) {
      var li = h("li", { role: "option", tabindex: "0", class: "correo-it" + (resp[c.id] ? " leido" : " nuevo"), "aria-selected": "false" },
        h("span", { class: "ci-av" }, (c.de_nombre || "?").charAt(0)),
        h("span", { class: "ci-txt" }, h("b", null, c.de_nombre), h("span", { class: "ci-asunto" }, c.asunto), h("small", null, (c.cuerpo || "").replace(/\n/g, " ").slice(0, 70) + "…")),
        h("span", { class: "ci-meta" }, h("small", null, c.fecha || ""), (c.adjuntos || []).length ? u.icon("paperclip") : null, h("span", { class: "ci-estado" })));
      li.addEventListener("click", function () { abrir(i); });
      li.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); abrir(i); } if (ev.key === "ArrowDown" && li.nextSibling) li.nextSibling.focus(); if (ev.key === "ArrowUp" && li.previousSibling) li.previousSibling.focus(); });
      items[c.id] = li;
      lista.appendChild(li);
    });
    function abrir(i) {
      var c = scr.correos[i];
      u.$$(".correo-it", lista).forEach(function (x, k) { x.classList.toggle("abierto", k === i); x.setAttribute("aria-selected", String(k === i)); });
      media.sfx("abrir");
      u.clear(lector);
      var dom = dominio(c.de_correo);
      lector.appendChild(h("div", { class: "cl-cab" },
        h("h2", null, c.asunto),
        h("div", { class: "cl-de" }, h("span", { class: "ci-av" }, (c.de_nombre || "?").charAt(0)),
          h("div", null, h("b", null, c.de_nombre), " ", h("button", { type: "button", class: "dir-correo", title: "Ver la dirección completa", onclick: function (ev) { ev.currentTarget.classList.toggle("ver"); } }, "<", h("span", { class: "dir-u" }, String(c.de_correo || "").replace("@" + dom, "")), h("span", { class: "dir-d" }, "@" + dom), ">"),
            h("small", null, "Para: " + (c.para || "mí") + " · " + (c.fecha || "")))) ));
      lector.appendChild(cuerpoCorreo(c));
      if ((c.adjuntos || []).length) lector.appendChild(h("div", { class: "adjuntos" }, c.adjuntos.map(function (a) { return h("span", { class: "adjunto" }, u.icon(/pdf$/i.test(a) ? "file-text" : /zip|rar|exe|htm|iso|js$/i.test(a) ? "file-warning" : "file"), a); })));
      var acc = h("div", { class: "cl-acc", role: "group", "aria-label": "¿Qué haces con este correo?" }, h("p", { class: "kicker" }, "¿Qué haces con este correo?"));
      acciones.forEach(function (a) {
        acc.appendChild(h("button", { type: "button", class: "btn-acc" + (resp[c.id] === a.id ? " sel" : ""), onclick: function () { decidir(i, a.id); } }, u.icon(a.icono || "circle-dot"), a.nombre));
      });
      lector.appendChild(acc);
      var out = h("div", { class: "cl-out" });
      lector.appendChild(out);
      if (resp[c.id]) mostrarFb(c, resp[c.id], out);
      if (window.innerWidth < 760) lector.scrollIntoView({ behavior: u.reducedMotion() ? "auto" : "smooth" });
    }
    function mostrarFb(c, aid, out) {
      u.clear(out);
      var ok = c.accion_correcta.indexOf(aid) >= 0;
      out.appendChild(fb(ok ? "ok" : "mal", (c.feedback || {})[aid] || (ok ? "Decisión adecuada." : "No es la mejor decisión con lo que muestra este correo."), ok ? "Bien decidido" : "Ojo con este"));
      if (c.senales && c.senales.length) out.appendChild(h("div", { class: "senales" }, h("b", null, u.icon("scan-eye"), c.accion_correcta.indexOf("archivar") >= 0 && ok ? "Por qué es confiable" : "Señales para mirar"), h("ul", null, c.senales.map(function (s) { return h("li", null, s); }))));
    }
    function decidir(i, aid) {
      var c = scr.correos[i];
      resp[c.id] = aid;
      items[c.id].classList.remove("nuevo"); items[c.id].classList.add("leido");
      var ok = c.accion_correcta.indexOf(aid) >= 0;
      items[c.id].classList.toggle("bien", ok); items[c.id].classList.toggle("mal", !ok);
      var st = marcar();
      ctx.save({ resp: resp, done: st.n === scr.correos.length || undefined, sc: st.ok / scr.correos.length });
      abrir(i);
    }
    app.appendChild(h("div", { class: "correo-bar" }, h("span", { class: "cb-logo" }, u.icon("mail"), "Correo · Pehuén"), h("span", { class: "cb-buscar" }, u.icon("search"), "Buscar"), h("span", { class: "cb-user" }, u.icon("circle-user"))));
    app.appendChild(h("div", { class: "correo-cuerpo-app" }, h("div", { class: "correo-col" }, h("p", { class: "cc-tit" }, u.icon("inbox"), "Recibidos"), lista), lector));
    w.appendChild(app);
    w.appendChild(prog);
    scr.correos.forEach(function (c) { if (resp[c.id]) { var ok = c.accion_correcta.indexOf(resp[c.id]) >= 0; items[c.id].classList.add(ok ? "bien" : "mal"); } });
    marcar();
    lector.appendChild(h("div", { class: "cl-vacio" }, S.ilus("mail-search"), h("p", null, "Abre un correo para leerlo y decidir qué haces.")));
    return w;
  };

  /* ---------- Permisos ---------- */
  T.permisos = function (scr, ctx) {
    var w = h("div", { class: "permisos-w" });
    if (scr.consigna || scr.texto) w.appendChild(u.prose(scr.consigna || scr.texto, "prose consigna"));
    var resp = Object.assign({}, (ctx.result() || {}).resp || {});
    var panel = h("div", { class: "drive" }, h("div", { class: "drive-bar" }, u.icon("hard-drive"), h("b", null, "Archivos compartidos · Pehuén"), h("span", { class: "drive-ruta" }, scr.carpeta || "Mi unidad")));
    var lst = h("ul", { class: "drive-lista" });
    scr.archivos.forEach(function (f, i) {
      var det = h("div", { class: "pm-det", hidden: true });
      var estado = h("span", { class: "pm-estado" });
      var fila = h("li", { class: "pm-fila" },
        h("button", { type: "button", class: "pm-btn", "aria-expanded": "false" }, h("span", { class: "pm-ico" }, u.icon(f.icono || "file-text")), h("span", { class: "pm-txt" }, h("b", null, f.nombre), h("small", null, f.contexto || "")),
          h("span", { class: "pm-actual" }, u.icon(/cualquiera|público|publico/i.test(f.actual) ? "globe" : /externo|invitad/i.test(f.actual) ? "user-round-plus" : "users"), f.actual), estado, u.icon("chevron-down")),
        det);
      var b = fila.querySelector(".pm-btn");
      b.addEventListener("click", function () { det.hidden = !det.hidden; b.setAttribute("aria-expanded", String(!det.hidden)); if (!det.hidden) pintar(); });
      function pintar() {
        u.clear(det);
        det.appendChild(h("p", { class: "kicker" }, u.icon("share-2"), "Compartir «" + f.nombre + "»"));
        det.appendChild(h("p", { class: "pm-hoy" }, "Hoy: ", h("b", null, f.actual)));
        var g = h("div", { class: "pm-ops", role: "radiogroup", "aria-label": "Nueva configuración para " + f.nombre });
        f.opciones.forEach(function (o, k) {
          g.appendChild(h("button", { type: "button", role: "radio", "aria-checked": String(resp[f.id] === k), class: "pm-op" + (resp[f.id] === k ? " sel" : ""), onclick: function () { elegir(k); } }, h("span", { class: "radio" }), h("span", null, o.texto)));
        });
        det.appendChild(g);
        if (resp[f.id] !== undefined) {
          var o = f.opciones[resp[f.id]];
          det.appendChild(fb(o.correcta ? "ok" : "mal", o.feedback || "", o.correcta ? "Bien ajustado" : "Todavía hay un problema"));
        }
      }
      function elegir(k) {
        resp[f.id] = k; media.sfx("tic");
        var o = f.opciones[k];
        estado.className = "pm-estado " + (o.correcta ? "ok" : "mal");
        u.clear(estado); estado.appendChild(u.icon(o.correcta ? "check" : "triangle-alert", o.correcta ? "Bien" : "Revisar"));
        var n = Object.keys(resp).length, ok = scr.archivos.filter(function (x) { return resp[x.id] !== undefined && x.opciones[resp[x.id]].correcta; }).length;
        ctx.save({ resp: resp, done: n === scr.archivos.length || undefined, sc: ok / scr.archivos.length });
        pintar();
      }
      if (resp[f.id] !== undefined) { var o = f.opciones[resp[f.id]]; estado.className = "pm-estado " + (o.correcta ? "ok" : "mal"); estado.appendChild(u.icon(o.correcta ? "check" : "triangle-alert", o.correcta ? "Bien" : "Revisar")); }
      lst.appendChild(fila);
    });
    panel.appendChild(lst);
    w.appendChild(panel);
    return w;
  };

  /* ---------- Ficha técnica (de práctica) ---------- */
  function fichaView(f) {
    return h("div", { class: "ficha" },
      h("div", { class: "ficha-cab" }, h("span", { class: "ficha-sello" }, "Ficha de práctica"), h("h2", null, f.titulo), f.subtitulo ? h("p", null, f.subtitulo) : null),
      h("dl", { class: "ficha-campos" }, (f.campos || []).map(function (c) { return h("div", null, h("dt", null, c.etiqueta), h("dd", null, c.valor)); })),
      (f.advertencias || []).length ? h("div", { class: "ficha-adv" }, h("b", null, u.icon("triangle-alert"), "Advertencias"), h("ul", null, f.advertencias.map(function (a) { return h("li", null, a); }))) : null);
  }
  S.fichaView = fichaView;
  T.ficha = function (scr, ctx) {
    var w = h("div", { class: "ficha-w" });
    if (scr.texto) w.appendChild(u.prose(scr.texto, "prose"));
    var fichas = scr.fichas || (scr.ficha ? [scr.ficha] : []);
    var preg = h("div", { class: "ficha-preg" });
    var q = { id: scr.id, preguntas: scr.preguntas || [] };
    if (q.preguntas.length) preg.appendChild(T.quiz(Object.assign({}, scr, { texto: "", preguntas: q.preguntas }), ctx));
    w.appendChild(h("div", { class: "ficha-lay" + (fichas.length > 1 ? " varias" : "") }, h("div", { class: "fichas" }, fichas.map(fichaView)), preg));
    return w;
  };

  /* ---------- Inspección con check-list ---------- */
  T.inspeccion = function (scr, ctx) {
    var w = h("div", { class: "inspeccion-w" });
    if (scr.consigna || scr.texto) w.appendChild(u.prose(scr.consigna || scr.texto, "prose consigna"));
    var vis = h("div", { class: "insp-vis" });
    if (scr.modelo && S.d3) vis.appendChild(S.d3.visor({ modelo: scr.modelo, compacto: true, partes: [] }, ctx));
    else if (scr.imagen) vis.appendChild(S.img(scr.imagen));
    else vis.appendChild(S.ilus("scan-search", "ilus-grande"));
    var resp = Object.assign({}, (ctx.result() || {}).resp || {});
    var estados = [["aceptable", "Aceptable", "check"], ["retirar", "Retirar de uso", "ban"], ["consultar", "Consultar", "message-circle-question"]];
    var ul = h("ol", { class: "insp-lista" });
    scr.observaciones.forEach(function (o, i) {
      var g = h("div", { class: "seg seg-insp", role: "radiogroup", "aria-label": "Estado para: " + o.texto });
      estados.forEach(function (e) {
        g.appendChild(h("button", { type: "button", role: "radio", "aria-checked": String(resp[i] === e[0]), class: (resp[i] === e[0] ? "on " : "") + "e-" + e[0], onclick: function () { resp[i] = e[0]; media.sfx("tic"); ctx.save({ resp: resp }); pintar(false); } }, u.icon(e[2]), e[1]));
      });
      ul.appendChild(h("li", { class: "insp-it" }, h("p", null, h("span", { class: "insp-n" }, String(i + 1)), o.texto), g, h("div", { class: "insp-fb" })));
    });
    var out = h("div", { class: "cl-out" });
    function pintar(corregir) {
      u.$$(".insp-it", ul).forEach(function (li, i) {
        u.$$(".seg-insp button", li).forEach(function (b, k) { var on = resp[i] === estados[k][0]; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); });
        var f = li.querySelector(".insp-fb"); u.clear(f); li.classList.remove("ok", "mal");
        if (corregir && resp[i]) {
          var o = scr.observaciones[i], ok = resp[i] === o.estado;
          li.classList.add(ok ? "ok" : "mal");
          f.appendChild(h("p", null, u.icon(ok ? "check" : "x"), h("span", null, ok ? "" : h("b", null, "Lo adecuado: " + estados.filter(function (e) { return e[0] === o.estado; })[0][1].toLowerCase() + ". "), o.feedback || "")));
        }
      });
    }
    function comprobar(silent) {
      var faltan = scr.observaciones.filter(function (o, i) { return !resp[i]; }).length;
      if (faltan) { if (!silent) u.toast("Te faltan " + faltan + " observaciones por evaluar."); return; }
      pintar(true);
      var ok = scr.observaciones.filter(function (o, i) { return resp[i] === o.estado; }).length;
      var criticoMal = scr.observaciones.some(function (o, i) { return o.estado === "retirar" && resp[i] === "aceptable"; });
      u.clear(out);
      out.appendChild(fb(ok === scr.observaciones.length ? "ok" : criticoMal ? "mal" : "parcial", criticoMal ? "Diste por aceptable algo que obliga a retirar el equipo. En una inspección real, ese es el error que más importa evitar." : ok === scr.observaciones.length ? "Inspección bien resuelta." : "Revisa las observaciones marcadas.", ok + " de " + scr.observaciones.length));
      var r = ctx.result() || {};
      ctx.save({ resp: resp, done: true, sc: ok / scr.observaciones.length, critico: criticoMal, n: (r.n || 0) + (silent ? 0 : 1) });
    }
    pintar(false);
    w.appendChild(h("div", { class: "insp-lay" }, vis, h("div", null, h("p", { class: "kicker" }, u.icon("clipboard-check"), (scr.objeto || "Equipo") + " · check-list"), ul)));
    w.appendChild(h("div", { class: "fila-acc" }, btn("Comprobar la inspección", "check", function () { comprobar(false); })));
    w.appendChild(out);
    if ((ctx.result() || {}).done) comprobar(true);
    return w;
  };

  /* ---------- Construir (producción con autoevaluación guiada) ---------- */
  T.construir = function (scr, ctx) {
    var w = h("div", { class: "construir-w" });
    if (scr.consigna) w.appendChild(u.prose(scr.consigna, "prose consigna"));
    if (scr.contexto) w.appendChild(h("div", { class: "situacion" }, h("span", { class: "sit-k" }, u.icon("folder-open"), "Contexto"), u.prose(scr.contexto, "prose")));
    var r0 = ctx.result() || {};
    var resp = Object.assign({}, r0.resp || {});
    var form = h("div", { class: "cons-form" });
    var campos = scr.campos || [{ id: "c1", etiqueta: "Tu respuesta", tipo: "texto_largo", min_palabras: 40 }];
    campos.forEach(function (c) {
      var id = u.newId("cf");
      var cont = h("span", { class: "cf-cont" });
      var ta = h(c.tipo === "texto" ? "input" : "textarea", { id: id, rows: c.tipo === "texto" ? null : "6", type: c.tipo === "texto" ? "text" : null });
      ta.value = resp[c.id] || "";
      var upd = function () { var n = u.words(ta.value); cont.textContent = n + " palabras" + (c.min_palabras ? " · mínimo sugerido " + c.min_palabras : ""); cont.classList.toggle("ok", !c.min_palabras || n >= c.min_palabras); };
      ta.addEventListener("input", function () { resp[c.id] = ta.value; upd(); guardarBorrador(); });
      upd();
      form.appendChild(h("div", { class: "cf" }, h("label", { for: id }, h("b", null, c.etiqueta), c.ayuda ? h("small", null, c.ayuda) : null), ta, cont));
    });
    var guardarBorrador = u.debounce(function () { ctx.save({ resp: resp }); }, 800);
    w.appendChild(form);
    var autoBox = h("div", { class: "cons-auto" });
    var acc = h("div", { class: "fila-acc" }, btn("Guardar y revisar con los criterios", "clipboard-check", function () {
      var corto = campos.filter(function (c) { return c.min_palabras && u.words(resp[c.id]) < Math.ceil(c.min_palabras * 0.6); });
      if (corto.length) { u.toast("Desarrolla un poco más: «" + corto[0].etiqueta + "»."); return; }
      ctx.save({ resp: resp, env: 1 });
      media.sfx("guardar");
      autoeval();
    }));
    w.appendChild(acc);
    w.appendChild(autoBox);
    function autoeval() {
      u.clear(autoBox);
      var niv = Object.assign({}, (ctx.result() || {}).niv || {});
      autoBox.appendChild(h("h2", { class: "h-mini" }, u.icon("list-checks"), "Revisa tu respuesta con estos criterios"));
      autoBox.appendChild(h("p", { class: "nota-suave" }, "Elige el nivel que mejor describe lo que escribiste. Sé honesto: esto es para ti."));
      (scr.criterios || []).forEach(function (cr, i) {
        var g = h("div", { class: "crit-niveles", role: "radiogroup", "aria-label": cr.criterio });
        (cr.niveles || []).forEach(function (d, k) {
          g.appendChild(h("button", { type: "button", role: "radio", "aria-checked": String(niv[i] === k), class: "crit-n" + (niv[i] === k ? " on" : ""), onclick: function () { niv[i] = k; ctx.save({ niv: niv }); autoeval(); } }, h("b", null, "Nivel " + k), h("span", null, d)));
        });
        autoBox.appendChild(h("div", { class: "crit" }, h("p", { class: "crit-t" }, cr.criterio), g));
      });
      var completos = (scr.criterios || []).every(function (c, i) { return niv[i] !== undefined; });
      if (completos || !(scr.criterios || []).length) {
        ctx.save({ niv: niv, done: true });
        if (scr.ejemplo_solido) autoBox.appendChild(h("div", { class: "ejemplo ej-solido" }, h("p", { class: "kicker" }, u.icon("star"), "Una respuesta sólida se parece a esto"), u.prose(scr.ejemplo_solido, "prose")));
        if (scr.ejemplo_debil) autoBox.appendChild(h("div", { class: "ejemplo ej-debil" }, h("p", { class: "kicker" }, u.icon("triangle-alert"), "Una respuesta que todavía no alcanza"), u.prose(scr.ejemplo_debil, "prose")));
        autoBox.appendChild(h("p", { class: "nota-suave" }, "Puedes mejorar tu texto y volver a revisarlo cuando quieras. Queda guardado en tu avance."));
      }
    }
    if (r0.env) autoeval();
    return w;
  };
})();
