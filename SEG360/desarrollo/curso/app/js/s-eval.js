/* Seguridad 360 · evaluación por ruta: diagnóstico (sin nota), situaciones aplicadas (forma A y luego B, corrección
   automática), tarea aplicada (variante A y luego B, la califica un docente en el campus) y nota de la ruta.
   El curso nunca emite certificados: informa al campus y refleja la calificación que el campus devuelve.
   Perfiles (config.js › evaluacion.perfil):
     "portable"        el banco portátil viaja ofuscado en data/eval-<RUTA>.js (no es el banco privado de producción).
     "dibork_verified" los ítems y la corrección los entrega el campus por postMessage (ver integracion/Handoff_al_agente_LMS.md). */
(function () {
  "use strict";
  var S = window.S360, u = S.u, h = u.h, media = S.media, store = S.store;
  var CFG = window.S360_CONFIG || {};
  var EC = Object.assign({ perfil: "portable", intentos: 2, umbral_situaciones: 80, umbral_ruta: 80, umbral_tarea: 80, peso_situaciones: 0.4, peso_tarea: 0.6, origen_lms: "*" }, CFG.evaluacion || {});
  var DATA = window.S360_DATA;
  var bancos = {};

  function cargar(ruta) {
    if (bancos[ruta]) return Promise.resolve(bancos[ruta]);
    var meta = (DATA.curso.evaluaciones || {})[ruta];
    if (!meta) return Promise.reject(new Error("sin evaluación"));
    return u.loadScript((CFG.base || "") + "data/" + meta.archivo).then(function () {
      var raw = DATA["eval-" + ruta];
      bancos[ruta] = raw && raw.z ? u.desofuscar(raw.z, "SEG360-" + ruta + "-" + DATA.curso.version) : raw;
      return bancos[ruta];
    });
  }
  function x(ruta) { var st = store.peek(ruta) || store.load(ruta); st.x = st.x || {}; return st.x; }
  function setX(ruta, k, v) { store.load(ruta); var xx = x(ruta); xx[k] = v; store.state.t = store.root.t = Date.now(); return store.save(true); }

  /* ---------- Estado y notas ---------- */
  function notaTarea(t, rub) {
    if (!t || !t.eval || t.eval.estado !== "evaluado") return null;
    var e = t.eval;
    if (e.niveles && rub) {
      var n = 0; rub.forEach(function (c) { n += c.peso * (e.niveles[c.id] || 0) / 3; });
      return Math.round(n * 10) / 10;
    }
    return typeof e.nota === "number" ? e.nota : null;
  }
  function tareaAprobada(t, rub) {
    var n = notaTarea(t, rub); if (n === null) return null;
    if (t.eval.critico) return false;
    if (rub && t.eval.niveles) { for (var i = 0; i < rub.length; i++) if (rub[i].esencial && (t.eval.niveles[rub[i].id] || 0) < 2) return false; }
    return n >= EC.umbral_tarea;
  }
  function estadoRuta(ruta) {
    var xx = (store.peek(ruta) || {}).x || {};
    var sit = xx.sit || [], tar = xx.tar || [];
    var mejorSit = sit.reduce(function (m, a) { return Math.max(m, a.nota || 0); }, sit.length ? 0 : null);
    var rub = (DATA.curso.evaluaciones[ruta] || {}).rubrica;
    var calif = tar.filter(function (t) { return t.eval && t.eval.estado === "evaluado"; });
    var aprob = calif.filter(function (t) { return tareaAprobada(t, rub); });
    var mejorTar = null, base = aprob.length ? aprob : calif;
    base.forEach(function (t) { var n = notaTarea(t, rub); if (n !== null && (mejorTar === null || n > mejorTar)) mejorTar = n; });
    var tarAprob = aprob.length > 0;
    var enRevision = tar.some(function (t) { return t.env && !t.eval; }) || tar.some(function (t) { return t.eval && t.eval.estado === "devuelto" && !t.reenviada; }) && false;
    var pendRev = tar.length && tar[tar.length - 1].env && !tar[tar.length - 1].eval;
    var nota = mejorSit !== null && mejorTar !== null ? Math.round((EC.peso_situaciones * mejorSit + EC.peso_tarea * mejorTar) * 10) / 10 : null;
    var aprobada = nota !== null && nota >= EC.umbral_ruta && mejorSit >= EC.umbral_situaciones && tarAprob;
    var intentosSit = sit.length, intentosTar = tar.filter(function (t) { return t.env && !(t.eval && t.eval.estado === "devuelto"); }).length;
    var reprobada = nota !== null && !aprobada && intentosSit >= EC.intentos && intentosTar >= EC.intentos && !pendRev;
    return { sit: sit, tar: tar, mejorSit: mejorSit, mejorTar: mejorTar, tarAprob: tarAprob, nota: nota, aprobada: aprobada, reprobada: reprobada, pendienteRevision: !!pendRev || enRevision,
      modulosOk: S.rutaProgress(ruta).done, intentosSit: intentosSit, intentosTar: intentosTar };
  }

  /* Informa al campus: avance, completitud, nota y estado por ruta. Nunca usa "passed" sin calificación docente. */
  function report() {
    var C = DATA.curso, rutas = C.rutas.filter(function (r) { return !CFG.rutas || CFG.rutas.indexOf(r.codigo) >= 0; });
    var progreso = 0, completas = 0, todasAprob = true, algunaRep = false, notas = [];
    rutas.forEach(function (r) {
      var p = S.rutaProgress(r.codigo), e = estadoRuta(r.codigo);
      var entregado = e.sit.length > 0 && e.tar.some(function (t) { return t.env; });
      var pr = p.pct * 0.85 + (e.sit.length ? 0.075 : 0) + (e.tar.some(function (t) { return t.env; }) ? 0.075 : 0);
      progreso += pr / rutas.length;
      if (p.done && entregado) completas++;
      if (!e.aprobada) todasAprob = false;
      if (e.reprobada) algunaRep = true;
      notas.push(e.nota);
      store.section(r.id, p.done && entregado, pr, { success: e.aprobada ? "passed" : e.reprobada ? "failed" : "unknown", scaled: e.nota !== null ? e.nota / 100 : null, description: r.titulo });
    });
    var conNota = notas.every(function (n) { return n !== null; });
    store.setCompletion({
      progress: progreso, completed: completas === rutas.length,
      success: todasAprob ? "passed" : algunaRep ? "failed" : "unknown",
      raw: conNota ? Math.min.apply(null, notas) : null, scaled: conNota ? Math.min.apply(null, notas) / 100 : null
    });
  }

  /* ---------- Mensajes con el campus ---------- */
  function enviarCampus(msg) {
    msg.version = 1; msg.curso = "SEG360";
    var dest = [window.parent, window.top, window.opener].filter(function (w2, i, a) { return w2 && w2 !== window && a.indexOf(w2) === i; });
    dest.forEach(function (w2) { try { w2.postMessage(msg, EC.origen_lms || "*"); } catch (e) { /* sin acción */ } });
    return dest.length > 0;
  }
  var esperas = {};
  window.addEventListener("message", function (ev) {
    var okSrc = ev.source && (ev.source === window.parent || ev.source === window.top || ev.source === window.opener);
    if (!okSrc || !ev.data || typeof ev.data !== "object") return;
    if (EC.origen_lms && EC.origen_lms !== "*" && ev.origin !== EC.origen_lms) return;
    var d = ev.data;
    if (d.type === "dibork:seg360:tarea-evaluada" && d.evaluacion) { aplicarEvaluacion(d.evaluacion); S.route(); }
    if (esperas[d.type]) { esperas[d.type](d); delete esperas[d.type]; }
  });
  function esperar(tipo, ms) {
    return new Promise(function (res, rej) { esperas[tipo] = res; setTimeout(function () { if (esperas[tipo]) { delete esperas[tipo]; rej(new Error("sin respuesta")); } }, ms || 12000); });
  }
  function aplicarEvaluacion(ev) {
    if (!ev || !ev.ruta) { var m = String(ev && ev.entrega_id || "").match(/SEG360-(SST|CIBER|EPP)-T/); if (m) ev.ruta = m[1]; }
    if (!ev || !ev.ruta) return false;
    var xx = x(ev.ruta), tar = xx.tar || [];
    var t = null;
    for (var i = tar.length - 1; i >= 0; i--) if (!ev.entrega_id || tar[i].id === ev.entrega_id) { t = tar[i]; break; }
    if (!t) return false;
    if (t.eval && t.eval.fecha === ev.fecha && t.eval.estado === ev.estado) return false;
    t.eval = { estado: ev.estado, niveles: ev.niveles || null, nota: ev.nota, critico: !!ev.critico, comentario: ev.comentario || "", docente: ev.profesor || ev.docente || "", fecha: ev.fecha || new Date().toISOString() };
    if (ev.estado === "devuelto") t.devuelta = 1;
    setX(ev.ruta, "tar", tar);
    report();
    return true;
  }
  /* Al abrir, lee las calificaciones que el campus dejó en cmi.comments_from_lms (location SEG360-TAREA). */
  function leerComentariosLMS() {
    store.lmsComments().forEach(function (c) {
      if (!/^SEG360-TAREA/.test(c.location || "") && String(c.comment || "").indexOf("seg360-tarea-evaluacion") < 0) return;
      try { aplicarEvaluacion(JSON.parse(c.comment)); } catch (e) { /* sin acción */ }
    });
  }

  /* ---------- Panel de evaluación en la página de la ruta ---------- */
  function panelRuta(ruta) {
    var e = estadoRuta(ruta), meta = DATA.curso.evaluaciones[ruta] || {};
    var r = S.rutaMeta(ruta);
    var sec = h("section", { class: "bloque eval-panel" }, h("h2", { class: "h-sec" }, "Evaluación y certificado"));
    var grid = h("div", { class: "ev-grid" });
    var dg = (x(ruta).diag || null);
    grid.appendChild(tarjetaEv("compass", "Diagnóstico inicial", "Seis situaciones para ver desde dónde partes. No tiene nota.", dg ? "Hecho" : "Opcional", "#/eval/" + ruta + "/diagnostico", false, dg ? "ok" : ""));
    var sitTxt = e.mejorSit !== null ? "Mejor resultado: " + e.mejorSit + " %" : "Forma A y, si la necesitas, forma B. Sin límite de tiempo.";
    grid.appendChild(tarjetaEv("list-checks", "Situaciones aplicadas", sitTxt, e.modulosOk ? (e.intentosSit >= EC.intentos ? "Intentos usados" : "Disponible") : "Se abre al completar los 6 módulos", "#/eval/" + ruta + "/situaciones", !e.modulosOk, e.mejorSit !== null && e.mejorSit >= EC.umbral_situaciones ? "ok" : ""));
    var tarTxt = e.pendienteRevision ? "Entregada. Un docente la está revisando." : e.mejorTar !== null ? "Nota de la tarea: " + e.mejorTar : "Resuelves un caso con su expediente. La revisa un docente.";
    grid.appendChild(tarjetaEv("clipboard-pen", "Tarea aplicada", tarTxt, e.modulosOk ? (e.pendienteRevision ? "En revisión" : "Disponible") : "Se abre al completar los 6 módulos", "#/eval/" + ruta + "/tarea", !e.modulosOk, e.tarAprob ? "ok" : e.pendienteRevision ? "rev" : ""));
    sec.appendChild(grid);
    var cert = h("div", { class: "cert" + (e.aprobada ? " ok" : "") },
      h("div", { class: "cert-sello", "aria-hidden": "true" }, u.icon(e.aprobada ? "award" : "badge")),
      h("div", null, h("p", { class: "kicker" }, "Certificado"), h("h3", null, r.certificado),
        h("p", null, e.aprobada ? (store.isLMS() ? "Aprobaste la ruta con nota " + e.nota + ". El campus emite tu certificado." : "Ruta aprobada con nota " + e.nota + ". En esta vista previa no se emiten certificados.") :
          e.reprobada ? "Esta vez no alcanzaste los requisitos. Revisa el plan de repaso y conversa con tu docente sobre un nuevo intento." :
          "Para aprobar: nota de la ruta de " + EC.umbral_ruta + " o más (" + Math.round(EC.peso_situaciones * 100) + " % situaciones y " + Math.round(EC.peso_tarea * 100) + " % tarea), situaciones con " + EC.umbral_situaciones + " % o más y la tarea aprobada sin condiciones críticas."),
        e.nota !== null ? h("p", { class: "cert-nota" }, "Nota de la ruta: ", h("b", null, String(e.nota).replace(".", ","))) : null));
    sec.appendChild(cert);
    sec.appendChild(h("p", { class: "nota-suave" }, "El certificado acredita la formación preventiva de esta ruta. No reemplaza la inducción de tu puesto, la evaluación práctica en terreno ni las habilitaciones para tareas de alto riesgo."));
    return sec;
  }
  function tarjetaEv(ic, tit, txt, est, href, bloq, cls) {
    return h(bloq ? "div" : "a", { class: "ev-card" + (bloq ? " bloq" : "") + (cls ? " " + cls : ""), href: bloq ? null : href, "aria-disabled": bloq ? "true" : null },
      h("span", { class: "evc-ico" }, u.icon(bloq ? "lock" : ic)), h("b", null, tit), h("span", null, txt), h("small", { class: "evc-est" }, est));
  }

  /* ---------- Vistas ---------- */
  function vista(ruta, parte) {
    var r = S.rutaMeta(ruta);
    if (!r) return h("div");
    store.load(ruta);
    media.setMusicContext("evaluacion");
    S.setPie({ href: "#/ruta/" + ruta, t: "Ruta " + ruta }, null);
    if (!parte) return vEval(ruta);
    if (parte === "diagnostico") return vDiagnostico(ruta);
    var e = estadoRuta(ruta);
    if (!e.modulosOk && !CFG.vista_previa_sin_bloqueo) return h("div", { class: "vista eval" }, h("p", { class: "kicker" }, h("span", { class: "baliza" }), "Evaluación · ", r.codigo), h("h1", null, "Primero completa los módulos"),
      h("p", { class: "bajada" }, "La evaluación se abre cuando los 6 módulos de la ruta están completos. Así llegas con todo lo que se evalúa practicado."), h("a", { class: "btn btn-pri", href: "#/ruta/" + ruta }, "Ver mi avance"));
    if (parte === "situaciones") return vSituaciones(ruta);
    if (parte === "tarea") return vTarea(ruta);
    return vEval(ruta);
  }
  function vEval(ruta) {
    var r = S.rutaMeta(ruta);
    var v = h("div", { class: "vista eval" }, h("p", { class: "kicker" }, h("span", { class: "baliza" }), "Ruta ", r.codigo), h("h1", null, "Evaluación: " + r.titulo));
    v.appendChild(panelRuta(ruta));
    return v;
  }

  /* Ítem: evidencia + enunciado + opciones (única, múltiple u ordenar). */
  function itemView(it, resp, onChange, revisar) {
    var w = h("div", { class: "item" });
    if (it.evidencia && it.evidencia.contenido) {
      var ev = it.evidencia;
      w.appendChild(h("div", { class: "item-ev ev-" + (ev.tipo || "texto") }, h("p", { class: "kicker" }, u.icon({ correo: "mail", chat: "message-circle", ficha: "file-badge", tabla: "table", escena: "scan-eye" }[ev.tipo] || "file-text"), ev.titulo || "Evidencia"), u.prose(ev.contenido, "prose doc")));
    }
    w.appendChild(h("p", { class: "item-enun" }, h("b", null, it.enunciado)));
    var sel = resp ? resp.slice() : [];
    var tipo = it.tipo || "unica";
    if (tipo === "ordenar") {
      var orden = sel.length ? sel : u.shuffle(it.opciones.map(function (o) { return o.id; }), it.id);
      if (!sel.length) onChange(orden.slice());
      var byId = {}; it.opciones.forEach(function (o) { byId[o.id] = o; });
      var ol = h("ol", { class: "orden-lista" });
      var pintar = function () {
        u.clear(ol);
        orden.forEach(function (id, k) {
          ol.appendChild(h("li", { class: "orden-it" }, h("span", { class: "or-n" }, String(k + 1)), h("span", { class: "or-t" }, byId[id].texto),
            revisar ? null : h("span", { class: "or-acc" },
              h("button", { type: "button", "aria-label": "Subir", disabled: k === 0, onclick: function () { orden.splice(k - 1, 0, orden.splice(k, 1)[0]); onChange(orden.slice()); pintar(); } }, u.icon("chevron-up")),
              h("button", { type: "button", "aria-label": "Bajar", disabled: k === orden.length - 1, onclick: function () { orden.splice(k + 1, 0, orden.splice(k, 1)[0]); onChange(orden.slice()); pintar(); } }, u.icon("chevron-down")))));
        });
      };
      pintar(); w.appendChild(ol);
    } else {
      var multi = tipo === "multiple";
      if (multi && it.seleccion) w.appendChild(h("p", { class: "nota-suave" }, "Marca " + (it.seleccion.minimo === it.seleccion.maximo ? it.seleccion.minimo : "entre " + it.seleccion.minimo + " y " + it.seleccion.maximo) + " opciones."));
      var g = h("div", { class: "el-opciones", role: multi ? "group" : "radiogroup" });
      it.opciones.forEach(function (o) {
        var on = sel.indexOf(o.id) >= 0;
        var b = h("button", { type: "button", class: "opcion" + (on ? " sel" : ""), role: multi ? "checkbox" : "radio", "aria-checked": String(on), disabled: !!revisar },
          h("span", { class: "op-l" }, o.id.toUpperCase()), h("span", { class: "op-t" }, o.texto), h("span", { class: "op-m" }, u.icon(multi ? "square" : "circle")));
        b.addEventListener("click", function () {
          if (multi) { var i = sel.indexOf(o.id); if (i >= 0) sel.splice(i, 1); else { if (it.seleccion && sel.length >= it.seleccion.maximo) { u.toast("Puedes marcar como máximo " + it.seleccion.maximo + "."); return; } sel.push(o.id); } }
          else sel = [o.id];
          onChange(sel.slice());
          u.$$(".opcion", g).forEach(function (bb, k) { var id = it.opciones[k].id, s2 = sel.indexOf(id) >= 0; bb.classList.toggle("sel", s2); bb.setAttribute("aria-checked", String(s2)); });
          media.sfx("tic");
        });
        g.appendChild(b);
      });
      w.appendChild(g);
    }
    return w;
  }
  function puntaje(it, resp) {
    var pts = it.puntaje || 1;
    if (!resp || !resp.length) return 0;
    if (it.tipo === "ordenar") {
      var val = [it.orden_clave || it.clave].concat(it.alternativas_validas || []);
      return val.some(function (v) { return v && v.join() === resp.join(); }) ? pts : 0;
    }
    var k = (it.clave || []).slice().sort().join(), rr = resp.slice().sort().join();
    return k === rr ? pts : 0;
  }

  /* ---------- Diagnóstico ---------- */
  function vDiagnostico(ruta) {
    var r = S.rutaMeta(ruta);
    var v = h("div", { class: "vista eval" }, h("p", { class: "kicker" }, h("span", { class: "baliza" }), "Diagnóstico · ", r.codigo), h("h1", null, "¿Desde dónde partes?"));
    return cargar(ruta).then(function (b) {
      var items = b.diagnostico || [];
      var prev = x(ruta).diag;
      var resp = prev ? prev.resp : {};
      v.appendChild(h("p", { class: "bajada" }, "Seis situaciones, una por módulo. No tiene nota ni afecta tu certificado: sirve para que sepas en qué poner más atención. Responde con lo que harías hoy."));
      var lista = h("div", { class: "diag" });
      items.forEach(function (it, i) {
        lista.appendChild(h("section", { class: "diag-it" }, h("p", { class: "kicker" }, "Situación " + (i + 1) + " de " + items.length), itemView(it, resp[it.id], function (s) { resp[it.id] = s; }, !!prev)));
      });
      v.appendChild(lista);
      var out = h("div");
      function resultado() {
        u.clear(out);
        var C = DATA.curso, mods = S.rutaMeta(ruta).modulos;
        var ul = h("ul", { class: "diag-res" });
        items.forEach(function (it) {
          var ok = puntaje(it, resp[it.id]) > 0, m = mods.filter(function (mm) { return mm.id === it.objetivo; })[0];
          ul.appendChild(h("li", { class: ok ? "ok" : "rep" }, u.icon(ok ? "circle-check" : "bookmark"), h("span", null, h("b", null, m ? "Módulo " + m.numero + " · " + m.titulo : it.objetivo), ok ? " — partes con una buena base." : " — vale la pena ponerle atención."),
            h("small", null, (it.feedback || {})[(resp[it.id] || [])[0]] || "")));
        });
        out.appendChild(h("h2", { class: "h-mini" }, "Tu punto de partida"));
        out.appendChild(ul);
        out.appendChild(h("a", { class: "btn btn-pri", href: "#/ruta/" + ruta }, "Ir a los módulos", u.icon("arrow-right")));
      }
      if (prev) resultado();
      else v.appendChild(h("div", { class: "fila-acc" }, S.btn("Ver mi punto de partida", "check", function () {
        if (Object.keys(resp).length < items.length) { u.toast("Responde las seis situaciones."); return; }
        setX(ruta, "diag", { resp: resp, fecha: new Date().toISOString() }); prevSet(); resultado(); media.sfx("logro");
      })));
      function prevSet() { u.$$(".opcion, .or-acc button", lista).forEach(function (b) { b.disabled = true; }); }
      v.appendChild(out);
      return v;
    }).catch(function () { v.appendChild(h("p", null, "No pudimos cargar el diagnóstico.")); return v; });
  }

  /* ---------- Situaciones aplicadas ---------- */
  function vSituaciones(ruta) {
    var r = S.rutaMeta(ruta), e = estadoRuta(ruta);
    var v = h("div", { class: "vista eval eval-sit" }, h("p", { class: "kicker" }, h("span", { class: "baliza" }), "Evaluación · ", r.codigo), h("h1", null, "Situaciones aplicadas"));
    var enCurso = x(ruta).sitBorrador;
    if (!enCurso) {
      v.appendChild(h("p", { class: "bajada" }, "Vas a resolver situaciones de trabajo con evidencia: relatos, fotos descritas, mensajes, fichas y registros. No hay límite de tiempo y puedes consultar el material del curso."));
      var hist = h("div", { class: "sit-hist" });
      e.sit.forEach(function (a, i) { hist.appendChild(h("p", { class: a.nota >= EC.umbral_situaciones ? "ok" : "" }, u.icon(a.nota >= EC.umbral_situaciones ? "circle-check" : "circle"), "Intento " + (i + 1) + " · forma " + a.forma + ": ", h("b", null, a.nota + " %"))); });
      if (e.sit.length) v.appendChild(hist);
      if (e.intentosSit >= EC.intentos) { v.appendChild(h("p", { class: "aviso" }, u.icon("info"), "Usaste los " + EC.intentos + " intentos. Cuenta tu mejor resultado.")); if (e.sit.length) v.appendChild(revision(ruta, e.sit[e.sit.length - 1])); return v; }
      if (e.mejorSit !== null && e.mejorSit >= EC.umbral_situaciones) { v.appendChild(h("p", { class: "aviso ok" }, u.icon("circle-check"), "Ya alcanzaste el mínimo. Si quieres, puedes intentar subir tu nota con la otra forma.")); }
      v.appendChild(h("ul", { class: "lista-check" },
        h("li", null, u.icon("check"), "Para aprobar esta parte necesitas " + EC.umbral_situaciones + " % o más. Cuenta tu mejor intento."),
        h("li", null, u.icon("check"), "Tienes " + EC.intentos + " intentos: el primero con la forma A y el segundo con la forma B."),
        h("li", null, u.icon("check"), "Puedes moverte entre las situaciones y revisar antes de enviar. Tus respuestas se guardan mientras avanzas."),
        h("li", null, u.icon("check"), "En las de selección múltiple y ordenar, el puntaje es completo solo si la respuesta coincide entera.")));
      v.appendChild(h("div", { class: "fila-acc" }, S.btn(e.sit.length ? "Empezar el intento " + (e.sit.length + 1) : "Empezar", "play", function () {
        var forma = e.sit.length % 2 === 0 ? "A" : "B";
        setX(ruta, "sitBorrador", { forma: forma, resp: {}, inicio: new Date().toISOString(), i: 0 }).then(function () { S.route(); });
      })));
      if (e.sit.length) v.appendChild(revision(ruta, e.sit[e.sit.length - 1]));
      return v;
    }
    return obtenerItems(ruta, enCurso.forma).then(function (items) {
      var bor = x(ruta).sitBorrador, resp = bor.resp, idx = bor.i || 0;
      var cab = h("div", { class: "sit-nav" }), cuerpo = h("div", { class: "sit-cuerpo" });
      function guardarBorrador() { bor.resp = resp; bor.i = idx; setX(ruta, "sitBorrador", bor); }
      function pintar() {
        u.clear(cab); u.clear(cuerpo);
        items.forEach(function (it, k) { cab.appendChild(h("button", { type: "button", class: "qz-dot" + (k === idx ? " on" : "") + (resp[it.id] && resp[it.id].length ? " resp" : ""), "aria-label": "Situación " + (k + 1), onclick: function () { idx = k; guardarBorrador(); pintar(); } }, String(k + 1))); });
        var it = items[idx];
        cuerpo.appendChild(h("p", { class: "kicker" }, "Forma " + bor.forma + " · situación " + (idx + 1) + " de " + items.length));
        cuerpo.appendChild(itemView(it, resp[it.id], function (s) { resp[it.id] = s; guardarBorrador(); u.$$(".qz-dot", cab)[idx].classList.add("resp"); }));
        var nav = h("div", { class: "fila-acc" });
        if (idx > 0) nav.appendChild(S.btn("Anterior", "arrow-left", function () { idx--; guardarBorrador(); pintar(); }, "btn-sec"));
        if (idx < items.length - 1) nav.appendChild(S.btn("Siguiente", "arrow-right", function () { idx++; guardarBorrador(); pintar(); }, "btn-sec"));
        else nav.appendChild(S.btn("Revisar y enviar", "send", enviar));
        cuerpo.appendChild(nav);
        window.scrollTo(0, 0);
      }
      function enviar() {
        var faltan = items.filter(function (it) { return !resp[it.id] || !resp[it.id].length; }).length;
        if (faltan && !confirm("Te faltan " + faltan + " situaciones sin responder. ¿Enviar de todos modos?")) return;
        corregir(ruta, bor.forma, items, resp).then(function (res) {
          var sit = (x(ruta).sit || []).slice();
          sit.push(res);
          store.load(ruta); var xx = x(ruta); xx.sit = sit; delete xx.sitBorrador;
          store.save(true);
          items.forEach(function (it) {
            store.interaction({ id: "SEG360-" + ruta + "-SIT-" + bor.forma + (sit.length) + "-" + it.id.split("-").pop(), type: it.tipo === "ordenar" ? "sequencing" : "choice", response: (resp[it.id] || []).join(","), result: res.det[it.id] && res.det[it.id].pts > 0 ? "correct" : "incorrect", description: (it.enunciado || "").slice(0, 240) });
          });
          enviarCampus({ type: "dibork:seg360:situaciones-entregadas", ruta: ruta, forma: bor.forma, intento: sit.length, nota: res.nota, participante: { id: store.learner } });
          report();
          media.sfx(res.nota >= EC.umbral_situaciones ? "logro" : "parcial");
          S.route();
        });
      }
      v.appendChild(cab); v.appendChild(cuerpo);
      pintar();
      return v;
    }).catch(function (err) {
      v.appendChild(h("p", { class: "aviso" }, u.icon("cloud-off"), EC.perfil === "dibork_verified" ? "El campus todavía no entrega esta evaluación. Vuelve a intentarlo en un momento o avisa a tu docente." : "No pudimos cargar la evaluación."));
      return v;
    });
  }
  function obtenerItems(ruta, forma) {
    if (EC.perfil === "dibork_verified") {
      enviarCampus({ type: "dibork:seg360:solicitar-situaciones", ruta: ruta, forma: forma, participante: { id: store.learner } });
      return esperar("dibork:seg360:situaciones", 15000).then(function (d) { return d.items || []; });
    }
    return cargar(ruta).then(function (b) { return ((b.portable || {})[forma] || []); });
  }
  function corregir(ruta, forma, items, resp) {
    if (EC.perfil === "dibork_verified") {
      enviarCampus({ type: "dibork:seg360:entregar-situaciones", ruta: ruta, forma: forma, respuestas: resp, participante: { id: store.learner } });
      return esperar("dibork:seg360:resultado-situaciones", 20000).then(function (d) { return { forma: forma, nota: d.nota, fecha: new Date().toISOString(), det: d.detalle || {}, porObj: d.por_objetivo || {} }; });
    }
    var tot = 0, ok = 0, det = {}, porObj = {};
    items.forEach(function (it) {
      var pts = puntaje(it, resp[it.id]), max = it.puntaje || 1;
      tot += max; ok += pts;
      det[it.id] = { pts: pts, max: max };
      var o = porObj[it.objetivo] || (porObj[it.objetivo] = { ok: 0, max: 0 }); o.ok += pts; o.max += max;
    });
    return Promise.resolve({ forma: forma, nota: Math.round(1000 * ok / Math.max(1, tot)) / 10, fecha: new Date().toISOString(), det: det, porObj: porObj, ans: resp });
  }
  function revision(ruta, a) {
    var box = h("div", { class: "sit-rev" }, h("h2", { class: "h-mini" }, u.icon("chart-no-axes-column"), "Tu resultado por módulo (intento con forma " + a.forma + ")"));
    var mods = S.rutaMeta(ruta).modulos;
    var ul = h("ul", { class: "por-obj" });
    Object.keys(a.porObj || {}).forEach(function (oid) {
      var o = a.porObj[oid], m = mods.filter(function (mm) { return mm.id === oid; })[0], pct = o.max ? o.ok / o.max : 0;
      ul.appendChild(h("li", { class: pct >= 0.75 ? "ok" : "rep" }, h("span", null, m ? "Módulo " + m.numero + " · " + m.titulo : oid), h("span", { class: "mf-barra" }, h("i", { style: { width: Math.round(pct * 100) + "%" } })), h("b", null, Math.round(pct * 100) + " %"),
        pct < 0.75 && m ? h("a", { href: "#/m/" + m.id }, "Repasar") : null));
    });
    box.appendChild(ul);
    if (EC.perfil !== "dibork_verified" && a.ans) {
      var det = h("details", { class: "sit-det" }, h("summary", null, "Ver el feedback de cada situación"));
      cargar(ruta).then(function (b) {
        ((b.portable || {})[a.forma] || []).forEach(function (it, i) {
          var rr = a.ans[it.id] || [], pts = (a.det[it.id] || {}).pts || 0;
          var fbTxt = it.tipo === "ordenar" ? (pts ? "Orden adecuado." : (it.justificacion || "Revisa la secuencia.")) : rr.map(function (id) { return (it.feedback || {})[id]; }).filter(Boolean).join(" ");
          det.appendChild(h("div", { class: "rev-it " + (pts ? "ok" : "mal") }, h("p", null, u.icon(pts ? "check" : "x"), h("b", null, (i + 1) + ". "), it.enunciado), fbTxt ? h("p", { class: "nota-suave" }, fbTxt) : null));
        });
      });
      box.appendChild(det);
    }
    return box;
  }

  /* ---------- Tarea aplicada ---------- */
  function vTarea(ruta) {
    var r = S.rutaMeta(ruta), e = estadoRuta(ruta);
    var v = h("div", { class: "vista eval eval-tarea" }, h("p", { class: "kicker" }, h("span", { class: "baliza" }), "Evaluación · ", r.codigo), h("h1", null, "Tarea aplicada"));
    return cargar(ruta).then(function (b) {
      var T = b.tarea, rub = T.rubrica;
      var tar = (x(ruta).tar || []).slice();
      var ultima = tar[tar.length - 1];
      // historial y devoluciones
      tar.forEach(function (t, i) {
        if (!t.env) return;
        var n = notaTarea(t, rub);
        var est = t.eval ? (t.eval.estado === "devuelto" ? "Devuelta para corregir" : "Calificada") : "En revisión";
        v.appendChild(h("div", { class: "tarea-hist" + (t.eval && t.eval.estado === "evaluado" ? (tareaAprobada(t, rub) ? " ok" : " mal") : "") },
          h("p", null, u.icon(t.eval ? "message-square-text" : "hourglass"), h("b", null, "Entrega " + (i + 1) + " · variante " + t.var + ": " + est), n !== null ? " · nota " + String(n).replace(".", ",") : ""),
          t.eval && t.eval.niveles ? h("ul", { class: "niv-lista" }, rub.map(function (c) { return h("li", null, c.criterio + ": nivel " + (t.eval.niveles[c.id] || 0) + " de 3"); })) : null,
          t.eval && t.eval.critico ? h("p", { class: "aviso" }, u.icon("triangle-alert"), "El docente marcó una condición crítica. La tarea no se aprueba aunque tenga puntaje.") : null,
          t.eval && t.eval.comentario ? h("blockquote", null, t.eval.comentario, t.eval.docente ? h("cite", null, " — " + t.eval.docente) : null) : null));
      });
      if (CFG.herramientas_vista_previa && !store.isLMS() && ultima && ultima.env && !ultima.eval) v.appendChild(simuladorDocente(ruta, ultima, rub));
      var abierta = ultima && !ultima.env ? ultima : ultima && ultima.eval && ultima.eval.estado === "devuelto" ? null : null;
      var usadas = tar.filter(function (t) { return t.env && !(t.eval && t.eval.estado === "devuelto"); }).length;
      var devuelta = ultima && ultima.eval && ultima.eval.estado === "devuelto";
      if (e.tarAprob) { v.appendChild(h("p", { class: "aviso ok" }, u.icon("circle-check"), "Tu tarea está aprobada.")); return v; }
      if (ultima && ultima.env && !ultima.eval) { v.appendChild(h("p", { class: "bajada" }, "Tu entrega está en revisión. Cuando el docente la califique, verás aquí su devolución.")); return v; }
      if (usadas >= EC.intentos && !devuelta) { v.appendChild(h("p", { class: "aviso" }, u.icon("info"), "Usaste los " + EC.intentos + " intentos de la tarea. Conversa con tu docente sobre el plan de repaso.")); return v; }
      var t = abierta || (devuelta ? { id: ultima.id + "-R", var: ultima.var, resp: Object.assign({}, ultima.resp), reenvio_de: ultima.id } : { id: "SEG360-" + ruta + "-T-" + Date.now().toString(36), var: usadas % 2 === 0 ? "A" : "B", resp: {} });
      if (!abierta) { tar.push(t); setX(ruta, "tar", tar); }
      var V = T.variantes[t.var];
      v.appendChild(h("p", { class: "bajada" }, T.titulo));
      v.appendChild(u.prose(T.instrucciones, "prose"));
      if ((T.condiciones_criticas || []).length) v.appendChild(h("div", { class: "criticas" }, h("p", { class: "kicker" }, u.icon("octagon-alert"), "Condiciones críticas: si aparece alguna, la tarea no se aprueba"), h("ul", null, T.condiciones_criticas.map(function (c) { return h("li", null, c.texto); }))));
      v.appendChild(h("details", { class: "rubrica" }, h("summary", null, u.icon("list-checks"), "Cómo se evalúa (criterios y niveles)"),
        h("div", { class: "rub-tabla" }, rub.map(function (c) {
          return h("div", { class: "rub-c" }, h("p", null, h("b", null, c.criterio), " · " + c.peso + " %", c.esencial ? h("span", { class: "tag" }, "esencial") : null),
            h("ol", { start: "0" }, ["0", "1", "2", "3"].map(function (k) { return h("li", null, h("b", null, "Nivel " + k + ": "), c.niveles[k]); })));
        })), h("p", { class: "nota-suave" }, T.calculo || "")));
      v.appendChild(h("section", { class: "tarea-caso" }, h("p", { class: "kicker" }, "Variante " + t.var), h("h2", null, V.titulo), u.prose(V.contexto, "prose")));
      var exp = h("div", { class: "expediente" }, h("h2", { class: "h-mini" }, u.icon("folder-open"), "Expediente"));
      V.expediente.forEach(function (d) { exp.appendChild(h("details", { class: "ev-doc" }, h("summary", null, u.icon({ correo: "mail", chat: "message-circle", ficha: "file-badge", tabla: "table", foto_descrita: "image", registro: "clipboard-list" }[d.tipo] || "file-text"), d.titulo), u.prose(d.contenido, "prose doc"))); });
      v.appendChild(exp);
      var form = h("div", { class: "cons-form" }, h("h2", { class: "h-mini" }, u.icon("pen-line"), "Tu producto"));
      V.producto.forEach(function (p) {
        var id = u.newId("tp"), ta = h("textarea", { id: id, rows: p.tipo === "texto_largo" ? "8" : "5" });
        ta.value = t.resp[p.id] || "";
        var cont = h("span", { class: "cf-cont" }, u.words(ta.value) + " palabras");
        ta.addEventListener("input", u.debounce(function () { t.resp[p.id] = ta.value; cont.textContent = u.words(ta.value) + " palabras"; setX(ruta, "tar", tar); }, 700));
        form.appendChild(h("div", { class: "cf" }, h("label", { for: id }, h("b", null, p.etiqueta), p.ayuda ? h("small", null, p.ayuda) : null), ta, cont));
      });
      v.appendChild(form);
      var estado = h("p", { class: "nota-suave", "aria-live": "polite" }, "Tu borrador se guarda mientras escribes.");
      v.appendChild(estado);
      v.appendChild(h("div", { class: "fila-acc" }, S.btn("Enviar al docente", "send", function () {
        var vacios = V.producto.filter(function (p) { return u.words(t.resp[p.id]) < 15; });
        if (vacios.length) { u.toast("Desarrolla todas las partes del producto antes de enviar: «" + vacios[0].etiqueta + "»."); return; }
        if (!confirm("¿Enviar tu tarea al docente? Después no podrás editarla, salvo que te la devuelva para corregir.")) return;
        t.env = 1; t.fecha = new Date().toISOString();
        entregarTarea(ruta, T, V, t);
        setX(ruta, "tar", tar).then(function () { report(); media.sfx("enviar"); S.route(); });
      })));
      return v;
    });
  }
  function entregarTarea(ruta, T, V, t) {
    var texto = "SEG360 · TAREA APLICADA · " + ruta + " · variante " + t.var + "\n" + V.titulo + "\n\n" + V.producto.map(function (p) { return "## " + p.etiqueta + "\n" + (t.resp[p.id] || ""); }).join("\n\n");
    var plano = texto.replace(/\n/g, " ¶ ");
    var partes = Math.ceil(plano.length / 3900) || 1;
    for (var i = 0; i < partes; i++) store.learnerComment(plano.slice(i * 3900, (i + 1) * 3900), ("SEG360-TAREA|" + ruta + "|" + t.id + "|" + (i + 1) + "/" + partes).slice(0, 250));
    V.producto.forEach(function (p) { store.interaction({ id: t.id + "-" + p.id, type: "long-fill-in", response: (t.resp[p.id] || "").slice(0, 4000), description: p.etiqueta }); });
    enviarCampus({ type: "dibork:seg360:tarea-entregada", ruta: ruta, entrega_id: t.id, variante: t.var, reenvio_de: t.reenvio_de || null, fecha: t.fecha,
      participante: { id: store.learner, nombre: store.adapter && store.adapter.learnerName ? store.adapter.learnerName() : "" },
      respuestas: V.producto.map(function (p) { return { id: p.id, etiqueta: p.etiqueta, criterio: p.criterio, respuesta: t.resp[p.id] || "" }; }), texto: texto });
  }
  /* Solo en la vista previa local (nunca en el paquete del campus): permite probar el circuito de revisión. */
  function simuladorDocente(ruta, t, rub) {
    var niveles = {}, crit = false;
    var box = h("details", { class: "sim-docente" }, h("summary", null, u.icon("wrench"), "Vista previa: simular la revisión docente"));
    rub.forEach(function (c) {
      var g = h("div", { class: "seg" });
      [0, 1, 2, 3].forEach(function (n) { g.appendChild(h("button", { type: "button", onclick: function () { niveles[c.id] = n; u.$$("button", g).forEach(function (b, k) { b.classList.toggle("on", k === n); }); } }, String(n))); });
      box.appendChild(h("div", { class: "ajuste" }, h("span", null, c.criterio), g));
    });
    var ck = h("input", { type: "checkbox" }); ck.addEventListener("change", function () { crit = ck.checked; });
    box.appendChild(h("label", { class: "ajuste" }, ck, " Condición crítica"));
    box.appendChild(h("div", { class: "fila-acc" },
      S.btn("Calificar", "check", function () { aplicarEvaluacion({ tipo: "seg360-tarea-evaluacion", ruta: ruta, entrega_id: t.id, estado: "evaluado", niveles: niveles, critico: crit, comentario: "Revisión simulada en la vista previa.", profesor: "Vista previa" }); S.route(); }),
      S.btn("Devolver para corregir", "undo-2", function () { aplicarEvaluacion({ tipo: "seg360-tarea-evaluacion", ruta: ruta, entrega_id: t.id, estado: "devuelto", comentario: "Completa el riesgo residual y a quién avisas.", profesor: "Vista previa" }); S.route(); }, "btn-sec")));
    return box;
  }

  function init() { leerComentariosLMS(); }

  S.eval = { vista: vista, panelRuta: panelRuta, estadoRuta: estadoRuta, report: report, init: init, aplicarEvaluacion: aplicarEvaluacion, puntaje: puntaje };
})();
