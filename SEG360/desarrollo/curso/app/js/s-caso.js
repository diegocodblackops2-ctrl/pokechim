/* Seguridad 360 · casos ramificados a pantalla completa: variables visibles, evidencias que se desbloquean,
   opciones condicionadas por decisiones anteriores, feedback inmediato, finales según el estado y cierre guiado. */
(function () {
  "use strict";
  var S = window.S360, u = S.u, h = u.h, media = S.media, store = S.store;
  var DATA = window.S360_DATA;
  var CFG = window.S360_CONFIG || {};

  function cargarCaso(id) {
    if (DATA[id]) return Promise.resolve(DATA[id]);
    var meta = (DATA.curso.casos || {})[id];
    if (!meta) return Promise.reject(new Error("caso"));
    return u.loadScript((CFG.base || "") + "data/" + meta.archivo).then(function () { return DATA[id]; });
  }
  function arr(x) { return x === undefined || x === null ? [] : Array.isArray(x) ? x : [x]; }
  function tiene(st, m) { return st.marcas.indexOf(m) >= 0; }
  function visible(st, o) {
    if (arr(o.solo_si).some(function (m) { return !tiene(st, m); })) return false;
    if (arr(o.salvo_si).some(function (m) { return tiene(st, m); })) return false;
    return true;
  }
  function cumple(st, cond) {
    if (!cond) return true;
    for (var k in cond) {
      var v = cond[k];
      if (k === "requiere_marcas") { if (arr(v).some(function (m) { return !tiene(st, m); })) return false; continue; }
      if (k === "excluye_marcas") { if (arr(v).some(function (m) { return tiene(st, m); })) return false; continue; }
      var mm = k.match(/^(.+)_(max|min)$/);
      if (mm) { var val = st.vars[mm[1]]; if (val === undefined) continue; if (mm[2] === "max" ? val > v : val < v) return false; }
    }
    return true;
  }
  function nuevoEstado(caso) {
    var st = { nodo: caso.nodos[0].id, vars: {}, marcas: [], ev: [], hist: [], fin: null, inicio: Date.now() };
    (caso.variables || []).forEach(function (v) { st.vars[v.id] = v.inicial || 0; });
    (caso.evidencias || []).forEach(function (e) { if (e.inicial) st.ev.push(e.id); });
    return st;
  }

  function vista(id) {
    var meta = (DATA.curso.casos || {})[id];
    if (!meta) return h("div", { class: "vista error" }, h("h1", null, "Caso no disponible"));
    var cod = S.rutaDe(id.replace("CASO-", ""));
    var ruta = meta.ruta || (id.match(/CASO-(\w+)-/) || [])[1];
    return cargarCaso(id).then(function (caso) {
      store.load(ruta);
      document.body.setAttribute("data-ruta", ruta);
      var r = S.rutaMeta(ruta); if (r) document.documentElement.style.setProperty("--ruta", r.color);
      document.body.classList.add("modo-inmersivo");
      S.setPie(null, null);
      media.setMusicContext("caso");
      var guardado = (store.get("c", id) || {}).st;
      var st = guardado && !guardado.fin ? JSON.parse(JSON.stringify(guardado)) : null;
      var w = h("div", { class: "caso" });
      var volver = "#/p/" + (meta.pantalla || "");
      var top = h("header", { class: "caso-top" },
        h("a", { class: "caso-salir", href: volver, "aria-label": "Salir del caso y volver al módulo" }, u.icon("x")),
        h("div", { class: "caso-tit" }, h("p", { class: "kicker" }, h("span", { class: "baliza" }), "Caso · ", r ? r.codigo : ""), h("h1", null, caso.titulo)),
        h("div", { class: "caso-vars", role: "group", "aria-label": "Estado del caso" }),
        h("button", { type: "button", class: "caso-ev-btn", "aria-label": "Evidencias", onclick: function () { abrirEvidencias(); } }, u.icon("folder-open"), h("span", null, "Evidencias"), h("b", { class: "ev-n" }, "0")));
      var escenario = h("div", { class: "caso-escenario" });
      var cajonEv = h("aside", { class: "caso-ev", hidden: true, "aria-label": "Evidencias del caso" });
      w.appendChild(top); w.appendChild(escenario); w.appendChild(cajonEv);
      var varsEl = top.querySelector(".caso-vars"), evN = top.querySelector(".ev-n");

      function pintarVars(prev) {
        u.clear(varsEl);
        (caso.variables || []).forEach(function (v) {
          if (v.visible === false) return;
          var val = st.vars[v.id], max = v.max || Math.max(10, (v.inicial || 0) * 1.6, val);
          var pct = Math.max(0, Math.min(1, val / max));
          var malo = v.bueno === "bajo" ? pct > 0.5 : pct < 0.35;
          var delta = prev && prev[v.id] !== undefined ? val - prev[v.id] : 0;
          var el = h("div", { class: "cvar" + (malo ? " malo" : ""), title: v.nombre },
            u.icon(v.icono || "gauge"), h("span", { class: "cvar-n" }, v.nombre),
            h("span", { class: "cvar-b" }, h("i", { style: { width: Math.round(pct * 100) + "%" } })),
            h("b", { class: "cvar-v" }, String(val)),
            delta ? h("span", { class: "cvar-d " + ((delta > 0) === (v.bueno !== "bajo") ? "bien" : "mal") }, (delta > 0 ? "+" : "") + delta) : null);
          varsEl.appendChild(el);
        });
        evN.textContent = String(st.ev.length);
      }
      function abrirEvidencias(nueva) {
        u.clear(cajonEv);
        cajonEv.hidden = false;
        cajonEv.appendChild(h("div", { class: "panel-cab" }, h("h2", null, u.icon("folder-open"), "Evidencias"), h("button", { type: "button", class: "x", "aria-label": "Cerrar", onclick: function () { cajonEv.hidden = true; } }, u.icon("x"))));
        var lst = h("div", { class: "ev-lista" });
        (caso.evidencias || []).forEach(function (e) {
          if (st.ev.indexOf(e.id) < 0) return;
          lst.appendChild(h("details", { class: "ev-doc", open: e.id === nueva }, h("summary", null, u.icon(e.icono || "file-text"), e.titulo, e.id === nueva ? h("span", { class: "ev-nueva" }, "Nueva") : null), u.prose(e.contenido, "prose doc")));
        });
        var bloqueadas = (caso.evidencias || []).length - st.ev.length;
        if (bloqueadas > 0) lst.appendChild(h("p", { class: "nota-suave" }, u.icon("lock"), " Hay " + bloqueadas + (bloqueadas === 1 ? " evidencia" : " evidencias") + " que aparecen según lo que decidas."));
        cajonEv.appendChild(lst);
        var f = cajonEv.querySelector("button"); if (f) f.focus();
      }
      function guardar() { store.put("c", id, { st: st, fin: st.fin ? 1 : (store.get("c", id) || {}).fin, tipo: st.finTipo || (store.get("c", id) || {}).tipo, n: (store.get("c", id) || {}).n || 0 }); }

      function textoNodo(n) {
        var t = n.escena;
        arr(n.condicion_texto).forEach(function (c) { if (t !== n.escena) return; if (tiene(st, c.si)) t = c.texto; });
        return t;
      }
      function presentacion() {
        u.clear(escenario);
        var p = caso.presentacion || {};
        var vb = media.voiceBar(id + "-PRES");
        escenario.appendChild(h("div", { class: "caso-lay entrada" },
          h("div", { class: "caso-vis" }, S.img(p.imagen || (caso.imagenes && caso.imagenes[0] && caso.imagenes[0].id), { clase: "foto-caso", eager: true, icono: "git-branch", sizes: "(max-width: 760px) 100vw, 55vw" })),
          h("div", { class: "caso-txt" },
            h("p", { class: "kicker" }, "Antes de empezar"),
            h("h2", null, caso.subtitulo || caso.titulo),
            vb, u.prose(p.texto, "prose"),
            h("ul", { class: "caso-reglas" },
              h("li", null, u.icon("split"), "Cada decisión cambia lo que pasa después."),
              h("li", null, u.icon("gauge"), "Arriba ves cómo van las cosas: " + (caso.variables || []).filter(function (v) { return v.visible !== false; }).map(function (v) { return v.nombre.toLowerCase(); }).join(", ") + "."),
              h("li", null, u.icon("folder-open"), "Revisa las evidencias cuando quieras: algunas aparecen según lo que hagas."),
              h("li", null, u.icon("rotate-ccw"), "Si te equivocas, casi siempre puedes corregir el rumbo. Como en la vida real, con algún costo.")),
            h("div", { class: "fila-acc" }, S.btn("Empezar", "play", function () { st = nuevoEstado(caso); guardar(); pintarVars(); nodo(st.nodo); media.sfx("inicio"); })))));
        S.setTranscript({ voz: p.voz, hablante: p.hablante });
      }
      function nodo(nid) {
        if (nid === "FIN") return fin();
        var n = caso.nodos.filter(function (x) { return x.id === nid; })[0];
        if (!n) return fin();
        st.nodo = nid; guardar();
        u.clear(escenario);
        media.stopVoice();
        var vb = media.voiceBar(id + "-" + n.id, { autoplay: true });
        var ops = n.opciones.filter(function (o) { return visible(st, o); });
        ops = u.shuffle(ops, id + n.id + st.hist.length);
        var lista = h("div", { class: "caso-ops", role: "group", "aria-label": n.pregunta || "Opciones" });
        var paso = st.hist.length + 1;
        ops.forEach(function (o, k) {
          lista.appendChild(h("button", { type: "button", class: "caso-op", style: { "--i": k }, onclick: function () { decidir(n, o); } }, h("span", { class: "op-l" }, "ABCDEF"[k]), h("span", null, o.texto)));
        });
        var who = n.hablante && n.hablante !== "narrador" && (DATA.curso.personajes || {})[n.hablante];
        escenario.appendChild(h("div", { class: "caso-lay" },
          h("div", { class: "caso-vis" }, S.img(n.imagen, { clase: "foto-caso", icono: "map-pin", sizes: "(max-width: 760px) 100vw, 55vw" })),
          h("div", { class: "caso-txt" },
            h("p", { class: "kicker" }, "Decisión " + paso),
            h("h2", null, n.titulo),
            vb ? h("div", { class: "p-voz" }, who ? h("span", { class: "voz-quien" }, S.avatar(n.hablante, "sm"), h("b", null, who.nombre.split(" ")[0])) : null, vb) : null,
            u.prose(textoNodo(n), "prose escena-txt"),
            n.pregunta ? h("p", { class: "caso-preg" }, u.icon("circle-help"), h("b", null, n.pregunta)) : null,
            lista)));
        S.setTranscript({ voz: n.voz, hablante: n.hablante });
        var h2 = escenario.querySelector("h2"); if (h2) { h2.setAttribute("tabindex", "-1"); h2.focus({ preventScroll: true }); }
        if (vb && vb.sub) escenario.appendChild(vb.sub);
      }
      function decidir(n, o) {
        var prev = Object.assign({}, st.vars);
        Object.keys(o.efectos || {}).forEach(function (k) { st.vars[k] = Math.max(0, (st.vars[k] || 0) + o.efectos[k]); });
        arr(o.marca).forEach(function (m) { if (st.marcas.indexOf(m) < 0) st.marcas.push(m); });
        var nuevas = arr(o.desbloquea).filter(function (e) { return st.ev.indexOf(e) < 0; });
        nuevas.forEach(function (e) { st.ev.push(e); });
        st.hist.push({ n: n.id, t: o.texto });
        guardar();
        pintarVars(prev);
        var malo = Object.keys(o.efectos || {}).some(function (k) { var v = (caso.variables || []).filter(function (x) { return x.id === k; })[0]; return v && v.bueno === "bajo" ? o.efectos[k] > 0 : o.efectos[k] < 0 && k !== "tiempo"; });
        media.sfx(malo ? "consecuencia" : "decision");
        var out = h("div", { class: "caso-fb" + (malo ? " malo" : " bueno"), role: "status" },
          h("p", { class: "kicker" }, u.icon("corner-down-right"), "Lo que pasa"),
          u.prose(o.feedback || "", "prose"),
          nuevas.length ? h("button", { type: "button", class: "ev-aviso", onclick: function () { abrirEvidencias(nuevas[0]); } }, u.icon("file-plus"), (nuevas.length === 1 ? "Nueva evidencia: " : "Nuevas evidencias: ") + nuevas.map(function (e) { return ((caso.evidencias || []).filter(function (x) { return x.id === e; })[0] || {}).titulo; }).join(", ")) : null,
          h("div", { class: "fila-acc" }, S.btn("Continuar", "arrow-right", function () { nodo(o.siguiente || "FIN"); })));
        var lst = escenario.querySelector(".caso-ops");
        u.$$(".caso-op", lst).forEach(function (b) { b.disabled = true; if (b.textContent.indexOf(o.texto) >= 0) b.classList.add("elegida"); });
        lst.parentNode.appendChild(out);
        u.announce(u.plain(o.feedback || ""));
        var c = out.querySelector(".fila-acc button"); if (c) c.focus({ preventScroll: true });
        if (out.scrollIntoView && !u.reducedMotion()) out.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
      function fin() {
        var f = null;
        for (var i = 0; i < caso.finales.length; i++) if (cumple(st, caso.finales[i].condicion)) { f = caso.finales[i]; break; }
        f = f || caso.finales[caso.finales.length - 1];
        st.fin = f.id; st.finTipo = f.tipo;
        var prevRec = store.get("c", id) || {};
        store.put("c", id, { st: st, fin: f.id, tipo: f.tipo, n: (prevRec.n || 0) + 1, finales: Object.assign({}, prevRec.finales || {}, (function () { var o = {}; o[f.id] = 1; return o; })()) });
        S.reportProgress();
        media.sfx(f.tipo === "seguro" ? "logro" : f.tipo === "parcial" ? "parcial" : "consecuencia");
        u.clear(escenario);
        var vb = media.voiceBar(id + "-" + f.id, { autoplay: true });
        var etiqueta = { seguro: "Final seguro", parcial: "Final a medias", inseguro: "Final con daño" }[f.tipo] || "Final";
        var totalFin = caso.finales.length, vistos = Object.keys((store.get("c", id) || {}).finales || {}).length;
        escenario.appendChild(h("div", { class: "caso-lay caso-final f-" + f.tipo },
          h("div", { class: "caso-vis" }, h("div", { class: "final-sello" }, S.ilus(f.tipo === "seguro" ? "shield-check" : f.tipo === "parcial" ? "shield-half" : "shield-x", "ilus-grande"))),
          h("div", { class: "caso-txt" },
            h("p", { class: "kicker" }, etiqueta, " · descubriste " + vistos + " de " + totalFin + " finales"),
            h("h2", null, f.titulo), vb, u.prose(f.texto, "prose"),
            h("details", { class: "recorrido" }, h("summary", null, u.icon("route"), "Tus decisiones"), h("ol", null, st.hist.map(function (x) { return h("li", null, x.t); }))),
            h("div", { class: "fila-acc" }, S.btn("Ver lo que pasó y por qué", "lightbulb", debrief)))));
        S.setTranscript({ voz: f.voz, hablante: f.hablante });
        var h2 = escenario.querySelector("h2"); if (h2) { h2.setAttribute("tabindex", "-1"); h2.focus({ preventScroll: true }); }
      }
      function debrief() {
        var d = caso.debrief || {};
        u.clear(escenario);
        var vb = media.voiceBar(id + "-DEBRIEF", { autoplay: true });
        var who = d.hablante && d.hablante !== "narrador" && (DATA.curso.personajes || {})[d.hablante];
        var ta = h("textarea", { rows: "4", "aria-label": d.pregunta_transferencia || "Tu reflexión" });
        ta.value = (store.get("n", id) || {}).t || "";
        ta.addEventListener("input", u.debounce(function () { store.put("n", id, { t: ta.value }); }, 600));
        escenario.appendChild(h("div", { class: "caso-debrief" },
          h("p", { class: "kicker" }, u.icon("lightbulb"), d.titulo || "Lo que pasó y por qué"),
          who ? h("div", { class: "p-voz" }, h("span", { class: "voz-quien" }, S.avatar(d.hablante, "sm"), h("span", null, h("b", null, who.nombre), " · ", who.rol)), vb) : vb,
          h("ol", { class: "ideas" }, (d.puntos || []).map(function (p, i) { return h("li", { style: { "--i": i } }, h("span", { class: "idea-n" }, String(i + 1)), h("span", null, p)); })),
          d.pregunta_transferencia ? h("div", { class: "pregunta-transfer" }, h("p", null, u.icon("arrow-up-right"), h("b", null, d.pregunta_transferencia)), ta) : null,
          h("div", { class: "fila-acc" },
            S.btn("Jugar otra vez", "rotate-ccw", function () { st = nuevoEstado(caso); guardar(); pintarVars(); nodo(st.nodo); }, "btn-sec"),
            h("a", { class: "btn btn-pri", href: volver }, "Volver al módulo", u.icon("arrow-right")))));
        S.setTranscript({ voz: d.voz, hablante: d.hablante });
      }

      if (st && st.fin) st = null;
      if (st) { pintarVars(); nodo(st.nodo); }
      else { st = nuevoEstado(caso); pintarVars(); presentacion(); }
      S.onLeave(function () { document.body.classList.remove("modo-inmersivo"); });
      return w;
    });
  }

  S.caso = { vista: vista, cumple: cumple, visible: visible, nuevoEstado: nuevoEstado };
})();
