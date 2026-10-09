/* Seguridad 360 · pantallas de contenido: intro y cierre de módulo, escena, explicación, tarjetas, pestañas, proceso,
   comparación, diálogo, cierre de lección, reflexión, plan y lanzadores de caso y video. */
(function () {
  "use strict";
  var S = window.S360, u = S.u, h = u.h, media = S.media;
  var T = S.tipos = S.tipos || {};

  function media2col(scr, txt, opts) {
    opts = opts || {};
    var vis = scr.imagen ? S.img(scr.imagen, { icono: scr.icono }) : (opts.ilus !== false ? S.ilus(scr.icono || opts.icono || "scan-eye", "ilus-grande") : null);
    return h("div", { class: "dos-col" + (opts.invertir ? " inv" : "") + (vis ? "" : " una") }, h("div", { class: "dc-txt" }, txt), vis ? h("div", { class: "dc-vis" }, vis) : null);
  }
  S.media2col = media2col;

  /* Retroalimentación común para todas las actividades. */
  function fb(estado, texto, titulo) {
    var ic = estado === "ok" ? "circle-check" : estado === "parcial" ? "circle-alert" : estado === "info" ? "lightbulb" : "circle-x";
    var el = h("div", { class: "fb fb-" + estado, role: "status" }, h("span", { class: "fb-ico" }, u.icon(ic)),
      h("div", { class: "fb-txt" }, titulo ? h("b", null, titulo) : null, u.prose(texto || "", "prose")));
    if (estado === "ok") media.sfx("bien"); else if (estado === "mal") media.sfx("mal"); else if (estado === "parcial") media.sfx("parcial");
    u.announce((titulo ? titulo + ". " : "") + u.plain(texto || ""));
    return el;
  }
  S.fb = fb;
  function btn(txt, ic, fn, cls) { return h("button", { type: "button", class: "btn " + (cls || "btn-pri"), onclick: fn }, ic ? u.icon(ic) : null, txt); }
  S.btn = btn;

  /* ---------- Intro de módulo ---------- */
  T.intro = function (scr, ctx) {
    var meta = S.modMeta(ctx.mod.id);
    var w = h("div", { class: "intro-mod" });
    w.appendChild(media2col(scr, h("div", null, u.prose(scr.texto, "prose lead"),
      scr.logros && scr.logros.length ? h("div", { class: "logros" }, h("h2", { class: "h-mini" }, "Lo que vas a lograr"),
        h("ol", null, scr.logros.map(function (l, i) { return h("li", { style: { "--i": i } }, h("span", { class: "lg-n" }, String(i + 1)), h("span", null, l)); }))) : null)));
    var mapa = h("ol", { class: "mini-pista", "aria-label": "Recorrido del módulo" });
    meta.unidades.forEach(function (un) { mapa.appendChild(h("li", null, u.icon(un.icono), h("span", null, h("small", null, un.rotulo), un.titulo))); });
    w.appendChild(mapa);
    return w;
  };

  /* ---------- Cierre de módulo ---------- */
  T.cierre = function (scr, ctx) {
    ctx.save({ done: true });
    var w = h("div", { class: "cierre-mod" });
    w.appendChild(h("div", { class: "cm-sello", "aria-hidden": "true" }, S.ilus("flag", "ilus-sello")));
    w.appendChild(u.prose(scr.texto, "prose lead"));
    if (scr.transferencia && scr.transferencia.length) {
      w.appendChild(h("div", { class: "transfer" }, h("h2", { class: "h-mini" }, u.icon("briefcase"), "Llévalo a tu trabajo"),
        h("ul", { class: "lista-check" }, scr.transferencia.map(function (t) { return h("li", null, u.icon("arrow-right"), h("span", null, t)); }))));
    }
    if (scr.siguiente) w.appendChild(h("p", { class: "siguiente" }, u.icon("signpost"), h("span", null, scr.siguiente)));
    var glos = ctx.mod.glosario || [];
    if (glos.length) {
      w.appendChild(h("details", { class: "glos-mod" }, h("summary", null, u.icon("book-a"), "Glosario del módulo (" + glos.length + " términos)"),
        h("dl", { class: "glosario" }, glos.map(function (g) { return h("div", { class: "g-item" }, h("dt", null, g.termino), h("dd", null, g.definicion)); }))));
    }
    return w;
  };

  /* ---------- Escena de apertura ---------- */
  T.apertura = function (scr) {
    var w = h("div", { class: "apertura" });
    var vis = scr.imagen ? S.img(scr.imagen, { clase: "foto-escena", sizes: "(max-width: 760px) 100vw, 70vw" }) : S.ilus(scr.icono || "eye", "ilus-grande");
    w.appendChild(h("div", { class: "ap-escena" }, vis,
      scr.escena ? h("div", { class: "ap-relato" }, h("span", { class: "ap-rel-k" }, u.icon("map-pin"), "En Pehuén"), u.prose(scr.escena, "prose")) : null));
    if (scr.pregunta) w.appendChild(h("p", { class: "ap-pregunta" }, u.icon("circle-help"), h("span", null, scr.pregunta)));
    if (scr.texto) w.appendChild(u.prose(scr.texto, "prose"));
    return w;
  };

  /* ---------- Explicación ---------- */
  T.explicacion = function (scr) {
    var txt = h("div", null, u.prose(scr.texto, "prose"));
    if (scr.bloques && scr.bloques.length) {
      txt.appendChild(h("div", { class: "bloques n" + scr.bloques.length }, scr.bloques.map(function (b, i) {
        return h("div", { class: "bloque-idea", style: { "--i": i } }, h("span", { class: "bi-ico" }, u.icon(b.icono || "circle-dot")), h("div", null, h("b", null, b.titulo), h("p", null, b.texto)));
      })));
    }
    if (scr.nota) txt.appendChild(nota(scr.nota));
    return media2col(scr, txt);
  };
  function nota(n) {
    var map = { ojo: ["eye", "Ojo"], dato: ["info", "Dato"], norma: ["scale", "Lo que dice la norma"], terreno: ["hard-hat", "Desde el terreno"] };
    var m = map[n.tipo] || map.dato;
    return h("aside", { class: "nota nota-" + (n.tipo || "dato") }, h("span", { class: "nota-k" }, u.icon(m[0]), m[1]), u.prose(n.texto, "prose"));
  }
  S.nota = nota;

  /* ---------- Tarjetas que se dan vuelta ---------- */
  T.tarjetas = function (scr, ctx) {
    var w = h("div", { class: "tarjetas-w" });
    if (scr.consigna || scr.texto) w.appendChild(u.prose(scr.consigna || scr.texto, "prose consigna"));
    var vistas = (ctx.result() || {}).vistas || {};
    var grid = h("div", { class: "tarjetas n" + scr.tarjetas.length });
    scr.tarjetas.forEach(function (t, i) {
      var card = h("button", { type: "button", class: "tarjeta" + (vistas[i] ? " vista" : ""), "aria-pressed": "false", style: { "--i": i } },
        h("span", { class: "tj-cara tj-frente" }, h("span", { class: "tj-ico" }, u.icon(t.icono || "circle-help")), h("b", null, t.frente), h("small", null, u.icon("rotate-ccw"), "Dar vuelta")),
        h("span", { class: "tj-cara tj-reverso" }, h("b", null, t.frente), h("span", null, t.reverso)));
      card.addEventListener("click", function () {
        var on = !card.classList.contains("girada");
        card.classList.toggle("girada", on); card.setAttribute("aria-pressed", String(on));
        if (on) { media.sfx("girar"); vistas[i] = 1; card.classList.add("vista"); ctx.save({ vistas: vistas }); u.announce(t.frente + ": " + t.reverso); }
      });
      grid.appendChild(card);
    });
    w.appendChild(grid);
    return w;
  };

  /* ---------- Pestañas ---------- */
  T.pestanas = function (scr) {
    var w = h("div", { class: "pestanas-w" });
    if (scr.texto) w.appendChild(u.prose(scr.texto, "prose"));
    var list = h("div", { class: "tabs", role: "tablist" }), panes = h("div", { class: "tab-panes" });
    var tabs = [];
    scr.pestanas.forEach(function (p, i) {
      var tid = u.newId("tab"), pid = u.newId("tp");
      var t = h("button", { type: "button", role: "tab", id: tid, "aria-controls": pid, "aria-selected": String(i === 0), tabindex: i === 0 ? "0" : "-1" }, u.icon(p.icono || "circle-dot"), h("span", null, p.titulo));
      var pane = h("div", { role: "tabpanel", id: pid, "aria-labelledby": tid, class: "tab-pane", hidden: i !== 0 }, h("h2", { class: "h-mini" }, p.titulo), u.prose(p.texto, "prose"));
      t.addEventListener("click", function () { sel(i); });
      t.addEventListener("keydown", function (ev) {
        if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") { ev.preventDefault(); var n = (i + (ev.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length; sel(n); tabs[n].focus(); }
      });
      tabs.push(t); list.appendChild(t); panes.appendChild(pane);
    });
    function sel(i) {
      tabs.forEach(function (t, k) { t.setAttribute("aria-selected", String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      u.$$(".tab-pane", panes).forEach(function (p, k) { p.hidden = k !== i; });
      media.sfx("tic");
    }
    w.appendChild(media2col(scr, h("div", null, list, panes), { ilus: false }));
    return w;
  };

  /* ---------- Proceso paso a paso ---------- */
  T.proceso = function (scr) {
    var w = h("div", { class: "proceso-w" });
    if (scr.texto) w.appendChild(u.prose(scr.texto, "prose"));
    var cur = 0;
    var linea = h("ol", { class: "proceso" });
    var det = h("div", { class: "proc-det", "aria-live": "polite" });
    var items = scr.pasos.map(function (p, i) {
      var b = h("button", { type: "button", class: "paso", "aria-current": i === 0 ? "step" : null }, h("span", { class: "paso-n" }, String(i + 1)), h("span", { class: "paso-ico" }, u.icon(p.icono || "circle-dot")), h("span", { class: "paso-t" }, p.titulo));
      b.addEventListener("click", function () { go(i); });
      linea.appendChild(h("li", { style: { "--i": i } }, b));
      return b;
    });
    var nav = h("div", { class: "proc-nav" },
      h("button", { type: "button", class: "btn btn-sec", onclick: function () { go(cur - 1); } }, u.icon("chevron-left"), "Paso anterior"),
      h("button", { type: "button", class: "btn btn-sec", onclick: function () { go(cur + 1); } }, "Paso siguiente", u.icon("chevron-right")));
    function go(i) {
      if (i < 0 || i >= scr.pasos.length) return;
      cur = i;
      items.forEach(function (b, k) { b.classList.toggle("on", k === i); b.classList.toggle("ya", k < i); if (k === i) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
      u.clear(det);
      var p = scr.pasos[i];
      det.appendChild(h("div", { class: "pd-ico" }, u.icon(p.icono || "circle-dot")));
      det.appendChild(h("div", null, h("p", { class: "kicker" }, "Paso " + (i + 1) + " de " + scr.pasos.length), h("h2", { class: "h-mini" }, p.titulo), u.prose(p.texto, "prose")));
      linea.style.setProperty("--avance", (scr.pasos.length > 1 ? i / (scr.pasos.length - 1) : 1));
      media.sfx("tic");
    }
    w.appendChild(linea); w.appendChild(det); w.appendChild(nav);
    go(0);
    return w;
  };

  /* ---------- Comparación ---------- */
  T.comparacion = function (scr) {
    var w = h("div", { class: "comparacion-w" });
    if (scr.texto) w.appendChild(u.prose(scr.texto, "prose"));
    function col(c, lado) {
      return h("div", { class: "cmp-col cmp-" + lado }, h("div", { class: "cmp-cab" }, h("span", { class: "cmp-ico" }, u.icon(c.icono || (lado === "izq" ? "circle-x" : "circle-check"))), h("h2", null, c.titulo)),
        c.imagen ? S.img(c.imagen, { sizes: "(max-width: 760px) 100vw, 40vw" }) : null,
        h("ul", null, (c.puntos || []).map(function (p, i) { return h("li", { style: { "--i": i } }, p); })));
    }
    w.appendChild(h("div", { class: "cmp" }, col(scr.izquierda, "izq"), h("span", { class: "cmp-vs", "aria-hidden": "true" }, "vs"), col(scr.derecha, "der")));
    if (scr.conclusion) w.appendChild(h("div", { class: "cmp-concl" }, u.icon("arrow-down-right"), u.prose(scr.conclusion, "prose")));
    return w;
  };

  /* ---------- Diálogo (con o sin pregunta final) ---------- */
  T.dialogo = function (scr, ctx) {
    var w = h("div", { class: "dialogo-w" });
    if (scr.texto) w.appendChild(u.prose(scr.texto, "prose"));
    var hilo = h("ol", { class: "dialogo", "aria-label": "Conversación" });
    var lines = scr.lineas || [], shown = 0;
    var mas = h("button", { type: "button", class: "btn btn-sec dlg-mas" }, u.icon("message-circle-more"), "Siguiente mensaje");
    var todo = h("button", { type: "button", class: "btn btn-ter" }, "Ver toda la conversación");
    var finalBox = h("div", { class: "dlg-final" });
    var personajes = (window.S360_DATA.curso.personajes || {}), lados = {};
    function addLine(l) {
      var p = personajes[l.personaje] || { nombre: l.nombre || l.personaje || "" };
      if (!(l.personaje in lados)) lados[l.personaje] = Object.keys(lados).length % 2 ? "der" : "izq";
      hilo.appendChild(h("li", { class: "burbuja b-" + lados[l.personaje] }, S.avatar(l.personaje, "sm"), h("div", null, h("b", null, p.nombre), h("p", null, l.texto))));
    }
    function step(all) {
      do { if (shown < lines.length) { addLine(lines[shown]); shown++; } } while (all && shown < lines.length);
      media.sfx("mensaje");
      if (shown >= lines.length) { mas.hidden = true; todo.hidden = true; showFinal(); }
      var last = hilo.lastChild; if (last && last.scrollIntoView && !u.reducedMotion()) last.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    function showFinal() {
      if (finalBox.childNodes.length) return;
      if (scr.opciones && scr.opciones.length) finalBox.appendChild(S.eleccion(scr, ctx));
      else if (scr.reflexion) finalBox.appendChild(T.reflexion({ id: scr.id, pregunta: scr.reflexion, ayuda: "" }, ctx));
    }
    mas.addEventListener("click", function () { step(false); });
    todo.addEventListener("click", function () { step(true); });
    var prev = ctx.result();
    w.appendChild(hilo);
    w.appendChild(h("div", { class: "dlg-acc" }, mas, todo));
    w.appendChild(finalBox);
    if (prev && prev.done) step(true); else step(false);
    return w;
  };

  /* ---------- Cierre de lección ---------- */
  T.cierre_leccion = function (scr, ctx) {
    var w = h("div", { class: "cierre-lec" });
    if (scr.texto) w.appendChild(u.prose(scr.texto, "prose"));
    w.appendChild(h("ol", { class: "ideas" }, (scr.ideas || []).map(function (t, i) { return h("li", { style: { "--i": i } }, h("span", { class: "idea-n" }, String(i + 1)), h("span", null, t)); })));
    if (scr.pregunta) {
      var prev = ctx.note() || "";
      var ta = h("textarea", { rows: "3", "aria-label": scr.pregunta, placeholder: "Escribe una idea breve (opcional)…" });
      ta.value = prev;
      ta.addEventListener("input", u.debounce(function () { ctx.note(ta.value); }, 600));
      w.appendChild(h("div", { class: "pregunta-transfer" }, h("p", null, u.icon("arrow-up-right"), h("b", null, scr.pregunta)), ta));
    }
    return w;
  };

  /* ---------- Reflexión ---------- */
  T.reflexion = function (scr, ctx) {
    var w = h("div", { class: "reflexion-w" });
    if (scr.texto) w.appendChild(u.prose(scr.texto, "prose"));
    var ta = h("textarea", { rows: "6", "aria-label": scr.pregunta });
    var prev = ctx.note(); if (prev) ta.value = prev;
    var estado = h("p", { class: "nota-suave", "aria-live": "polite" });
    var guardar = btn("Guardar mi reflexión", "save", function () {
      if (u.words(ta.value) < 5) { estado.textContent = "Escribe al menos una o dos frases para guardarla."; return; }
      ctx.note(ta.value); ctx.save({ done: true }); estado.textContent = "Guardada. Puedes volver a editarla cuando quieras."; media.sfx("guardar");
    });
    w.appendChild(media2col(scr, h("div", { class: "refl" }, h("p", { class: "refl-preg" }, u.icon("message-circle-question"), h("b", null, scr.pregunta)),
      scr.ayuda ? h("p", { class: "nota-suave" }, scr.ayuda) : null, ta, h("div", { class: "fila-acc" }, guardar), estado), { icono: "notebook-pen" }));
    return w;
  };

  /* ---------- Plan / checklist ---------- */
  T.checklist = function (scr, ctx) {
    var w = h("div", { class: "checklist-w" });
    if (scr.consigna || scr.texto) w.appendChild(u.prose(scr.consigna || scr.texto, "prose consigna"));
    var prev = (ctx.result() || {}).marcados || {};
    var ul = h("ul", { class: "checklist" });
    scr.items.forEach(function (it, i) {
      var id = u.newId("ck");
      var inp = h("input", { type: "checkbox", id: id }); inp.checked = !!prev[i];
      inp.addEventListener("change", function () { prev[i] = inp.checked ? 1 : 0; ctx.save({ marcados: prev, done: true }); if (inp.checked) media.sfx("tic"); });
      ul.appendChild(h("li", null, inp, h("label", { for: id }, typeof it === "string" ? it : it.texto)));
    });
    w.appendChild(ul);
    var notaTa = h("textarea", { rows: "3", placeholder: "¿Qué harás primero y cuándo? (opcional)", "aria-label": "Notas de tu plan" });
    notaTa.value = ctx.note() || "";
    notaTa.addEventListener("input", u.debounce(function () { ctx.note(notaTa.value); ctx.save({ marcados: prev, done: true }); }, 600));
    w.appendChild(notaTa);
    return w;
  };

  /* ---------- Lanzadores ---------- */
  T.caso = function (scr, ctx) {
    var caso = (window.S360_DATA.curso.casos || {})[scr.caso_id] || {};
    var st = (S.store.peek(ctx.ruta) || {}).c || {};
    var est = st[scr.caso_id];
    var w = h("div", { class: "lanzador lz-caso" },
      h("div", { class: "lz-vis" }, S.img(caso.imagen, { icono: "git-branch", sizes: "(max-width: 760px) 100vw, 60vw" }), h("span", { class: "lz-badge" }, u.icon("git-branch"), "Caso con decisiones")),
      h("div", { class: "lz-txt" }, h("h2", null, caso.titulo || scr.titulo), caso.subtitulo ? h("p", { class: "bajada" }, caso.subtitulo) : null,
        u.prose(scr.texto || "", "prose"),
        h("ul", { class: "lz-datos" }, h("li", null, u.icon("clock"), "≈" + (caso.duracion_min || 20) + " min"), h("li", null, u.icon("split"), (caso.decisiones || 6) + " decisiones o más"), h("li", null, u.icon("flag"), "Varios finales posibles")),
        est && est.fin ? h("p", { class: "lz-estado" }, u.icon("check"), "Ya lo jugaste. Puedes volver a intentarlo para explorar otras decisiones.") : null,
        h("a", { class: "btn btn-pri", href: "#/caso/" + scr.caso_id }, u.icon("play"), est && est.fin ? "Jugar otra vez" : est ? "Continuar el caso" : "Empezar el caso")));
    return w;
  };
  T.video = function (scr, ctx) {
    if (S.video) return S.video.inline(scr, ctx);
    return u.prose(scr.texto || "", "prose");
  };
})();
