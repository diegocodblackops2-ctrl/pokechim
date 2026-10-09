/* Seguridad 360 · microvideos: animaciones narradas que se arman en el navegador (imágenes con movimiento,
   modelos y escenas 3D, íconos y tipografía) sincronizadas con la voz de cada escena. Sin la voz, avanzan con
   el ritmo de lectura y muestran el texto. Siempre hay una descripción accesible. */
(function () {
  "use strict";
  var S = window.S360, u = S.u, h = u.h, media = S.media;
  var DATA = window.S360_DATA;

  function duracion(esc, vid) {
    var id = vid + "-S" + String(esc.n).padStart(2, "0");
    var info = (window.S360_MEDIA.audio || {})[id];
    if (info && info.dur) return info.dur + 0.6;
    return Math.max(4.5, u.words(esc.voz) / 2.6 + 1.2);
  }

  function visual(esc, vid) {
    var v = esc.visual || {}, mov = v.movimiento || "";
    var box = h("div", { class: "vd-vis vd-" + v.tipo });
    if (v.tipo === "imagen") {
      box.appendChild(S.img(v.ref, { sinMarco: true, eager: true, decorativa: true, clase: "vd-foto mov-" + (mov || "zoom_lento"), sizes: "100vw" }));
    } else if (v.tipo === "iconos") {
      var fila = h("div", { class: "vd-iconos" });
      (v.ref || []).forEach(function (ic, i) { fila.appendChild(h("span", { class: "vd-ico", style: { "--i": i } }, u.icon(ic))); });
      box.appendChild(fila);
    } else if (v.tipo === "texto") {
      box.appendChild(h("p", { class: "vd-frase" }, String(v.ref || esc.texto_en_pantalla || "").split(" ").map(function (w, i) { return h("span", { style: { "--i": i } }, w + " "); })));
    } else if (v.tipo === "modelo3d" && S.d3) {
      var foco = /^acercar:/.test(mov) ? mov.split(":")[1] : null;
      box.appendChild(S.d3.visor({ modelo: v.ref, explotado: mov === "explosionado", foco: foco, autoGiro: !foco, fondo: "#132532" }));
    } else if (v.tipo === "escena3d" && S.d3) {
      box.appendChild(S.d3.recorrido({ escena: v.ref, foco: v.foco, variante: v.variante }));
    } else {
      box.appendChild(S.ilus("clapperboard", "ilus-grande"));
    }
    return box;
  }

  /* Reproductor embebido en una pantalla `video`. */
  function inline(scr, ctx) {
    var vid = (DATA.curso.videos || {})[scr.video_id];
    var w = h("div", { class: "video-w" });
    if (scr.texto) w.appendChild(u.prose(scr.texto, "prose"));
    if (!vid) { w.appendChild(S.ilus("clapperboard", "ilus-grande")); return w; }
    var escenas = vid.escenas || [];
    var stage = h("div", { class: "vd", role: "region", "aria-label": "Video: " + vid.titulo });
    var lienzo = h("div", { class: "vd-lienzo" });
    var rotulo = h("div", { class: "vd-rotulo", "aria-hidden": "true" });
    var sub = h("div", { class: "vd-sub", "aria-live": "off" });
    var portada = h("div", { class: "vd-portada" }, h("div", { class: "vd-port-vis" }, S.img(primeraImagen(escenas), { sinMarco: true, decorativa: true, icono: "clapperboard" })),
      h("button", { type: "button", class: "vd-play-grande", "aria-label": "Reproducir el video" }, u.icon("play")),
      h("div", { class: "vd-port-txt" }, h("p", { class: "kicker" }, u.icon("clapperboard"), "Video · " + u.fmtTime(escenas.reduce(function (a, e) { return a + duracion(e, vid.id); }, 0))), h("h2", null, vid.titulo)));
    lienzo.appendChild(portada);
    lienzo.appendChild(rotulo); lienzo.appendChild(sub);
    var barra = h("div", { class: "vd-barra" });
    var bPlay = h("button", { type: "button", class: "vd-btn", "aria-label": "Reproducir" }, u.icon("play"));
    var bPrev = h("button", { type: "button", class: "vd-btn", "aria-label": "Escena anterior" }, u.icon("skip-back"));
    var bNext = h("button", { type: "button", class: "vd-btn", "aria-label": "Escena siguiente" }, u.icon("skip-forward"));
    var tl = h("div", { class: "vd-tl" });
    var tiempo = h("span", { class: "vd-t" }, "0:00");
    var bFull = h("button", { type: "button", class: "vd-btn", "aria-label": "Pantalla completa" }, u.icon("maximize"));
    escenas.forEach(function (e, i) { tl.appendChild(h("button", { type: "button", class: "vd-seg", style: { flex: String(duracion(e, vid.id)) }, "aria-label": "Ir a la escena " + (i + 1), onclick: function () { ir(i, true); } }, h("i"))); });
    barra.appendChild(bPlay); barra.appendChild(bPrev); barra.appendChild(bNext); barra.appendChild(tl); barra.appendChild(tiempo); barra.appendChild(bFull);
    stage.appendChild(lienzo); stage.appendChild(barra);
    w.appendChild(stage);
    var desc = h("details", { class: "vd-desc" }, h("summary", null, u.icon("text"), "Descripción y texto del video"),
      vid.descripcion_accesible ? u.prose(vid.descripcion_accesible, "prose") : null,
      h("ol", null, escenas.map(function (e) { return h("li", null, h("b", null, e.texto_en_pantalla || ""), " ", e.voz); })));
    w.appendChild(desc);

    var cur = -1, playing = false, t0 = 0, acum = 0, timer = null, audio = null, visAct = null;
    function primeraImagen(es) { for (var i = 0; i < es.length; i++) if (es[i].visual && es[i].visual.tipo === "imagen") return es[i].visual.ref; return null; }
    function limpiarVisual() {
      if (visAct) { u.$$(".v3d-lienzo", visAct).forEach(function (l) { if (l.destruir) l.destruir(); else l._pendienteDestruir = true; }); visAct.remove(); visAct = null; }
    }
    function ir(i, manual) {
      if (i < 0 || i >= escenas.length) { if (i >= escenas.length) terminar(); return; }
      cur = i; acum = 0;
      portada.hidden = true;
      var e = escenas[i];
      var nuevo = visual(e, vid.id);
      nuevo.classList.add("entra");
      lienzo.insertBefore(nuevo, rotulo);
      var viejo = visAct; visAct = nuevo;
      if (viejo) { viejo.classList.add("sale"); setTimeout(function () { u.$$(".v3d-lienzo", viejo).forEach(function (l) { if (l.destruir) l.destruir(); else l._pendienteDestruir = true; }); viejo.remove(); }, 700); }
      u.clear(rotulo);
      if (e.texto_en_pantalla && (e.visual || {}).tipo !== "texto") rotulo.appendChild(h("span", null, e.texto_en_pantalla));
      sub.textContent = media.prefs.subs ? e.voz : "";
      u.$$(".vd-seg", tl).forEach(function (s, k) { s.classList.toggle("ya", k < i); s.classList.toggle("on", k === i); s.firstChild.style.width = k < i ? "100%" : "0%"; });
      if (audio) { audio.pause(); audio = null; }
      var tr = media.track(vid.id + "-S" + String(e.n).padStart(2, "0"));
      if (tr && playing) { audio = tr.audio; audio.play().catch(function () { /* sin acción */ }); media.duck(true); }
      else if (tr) audio = tr.audio;
      if (manual) media.sfx("tic");
      t0 = performance.now();
    }
    function tick() {
      if (!playing) return;
      var e = escenas[cur], d = duracion(e, vid.id);
      var t = audio && !audio.paused ? audio.currentTime : acum + (performance.now() - t0) / 1000;
      var seg = u.$$(".vd-seg", tl)[cur];
      if (seg) seg.firstChild.style.width = Math.min(100, 100 * t / d) + "%";
      var total = 0; for (var k = 0; k < cur; k++) total += duracion(escenas[k], vid.id);
      tiempo.textContent = u.fmtTime(total + t);
      var acabo = audio ? (audio.ended || (audio.paused && t >= d - 0.7)) : t >= d;
      if (acabo) { if (cur < escenas.length - 1) ir(cur + 1); else return terminar(); }
      timer = requestAnimationFrame(tick);
    }
    function play() {
      if (cur < 0 || cur >= escenas.length) ir(0);
      playing = true; stage.classList.add("reproduciendo");
      u.clear(bPlay); bPlay.appendChild(u.icon("pause")); bPlay.setAttribute("aria-label", "Pausar");
      if (audio) { audio.playbackRate = media.prefs.rate; audio.play().catch(function () { /* sin acción */ }); media.duck(true); }
      t0 = performance.now();
      media.stopVoice();
      cancelAnimationFrame(timer); timer = requestAnimationFrame(tick);
    }
    function pause() {
      playing = false; stage.classList.remove("reproduciendo");
      if (audio) audio.pause(); else acum += (performance.now() - t0) / 1000;
      media.duck(false);
      u.clear(bPlay); bPlay.appendChild(u.icon("play")); bPlay.setAttribute("aria-label", "Reproducir");
    }
    function terminar() {
      pause(); cur = escenas.length;
      ctx.save({ done: true, visto: 1 });
      u.$$(".vd-seg", tl).forEach(function (s) { s.classList.add("ya"); s.firstChild.style.width = "100%"; });
      limpiarVisual();
      portada.hidden = false;
      u.clear(rotulo); sub.textContent = "";
      media.sfx("logro");
    }
    portada.querySelector(".vd-play-grande").addEventListener("click", play);
    bPlay.addEventListener("click", function () { if (playing) pause(); else play(); });
    bPrev.addEventListener("click", function () { ir(Math.max(0, cur - 1), true); if (playing && audio) audio.play(); });
    bNext.addEventListener("click", function () { ir(cur + 1, true); if (playing && audio) audio.play(); });
    bFull.addEventListener("click", function () { if (document.fullscreenElement) document.exitFullscreen(); else if (stage.requestFullscreen) stage.requestFullscreen().catch(function () { /* sin acción */ }); });
    stage.addEventListener("keydown", function (ev) { if (ev.key === " " && ev.target === stage) { ev.preventDefault(); bPlay.click(); } });
    S.onLeave(function () { playing = false; cancelAnimationFrame(timer); if (audio) audio.pause(); limpiarVisual(); });
    return w;
  }

  S.video = { inline: inline };
})();
