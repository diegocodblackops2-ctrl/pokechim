/* Curso 5 — audio, video e imágenes. Una sola pista activa, sin autoplay, carga diferida.
   El audio es opcional: nunca bloquea el progreso y siempre hay texto equivalente. */
(function () {
  "use strict";
  var IATU = window.IATU = window.IATU || {};
  var u = IATU.u, h = u.h, icon = u.icon;
  var active = null;
  var BASE = (window.IATU_CONFIG && window.IATU_CONFIG.base) || "";

  function stopAll() { if (active) { try { active.pause(); } catch (e) { /* sin acción */ } active = null; } }
  var RATES = [0.75, 0.8, 0.9, 1, 1.1, 1.2, 1.25];
  function prefRate() {
    var r = IATU.store && IATU.store.root && IATU.store.root.rate;
    return RATES.indexOf(r) >= 0 ? r : 1;
  }
  function setPrefRate(r) { if (IATU.store && IATU.store.root) { IATU.store.root.rate = r; IATU.store.saveSoon(); } }
  function fmtRate(r) { return "×" + String(r).replace(".", ","); }

  /* ---------- Música de fondo: apagada por defecto, se baja sola cuando suena la narración o un video ---------- */
  var music = { el: null, on: false, i: 0, duck: 0, vol: 0.14, tracks: [], btn: null };
  function musicTracks() { return (IATU.data.curso && IATU.data.curso.music) || []; }
  function musicTarget() { return music.on ? (music.duck > 0 ? music.vol * 0.22 : music.vol) : 0; }
  function musicFade() {
    if (!music.el) return;
    var target = musicTarget(), el = music.el;
    clearInterval(music.timer);
    music.timer = setInterval(function () {
      var v = el.volume, d = target - v;
      if (Math.abs(d) < 0.01) { el.volume = target; clearInterval(music.timer); if (!music.on) el.pause(); return; }
      el.volume = Math.max(0, Math.min(1, v + d * 0.25));
    }, 60);
  }
  function musicPlay() {
    var list = musicTracks(); if (!list.length) return;
    if (!music.el) {
      music.el = new Audio(); music.el.preload = "none"; music.el.volume = 0;
      music.el.addEventListener("ended", function () { music.i = (music.i + 1) % list.length; music.el.src = BASE + list[music.i].file; music.el.play().catch(function () {}); });
    }
    if (!music.el.src) music.el.src = BASE + list[music.i].file;
    music.el.play().then(musicFade, function () { /* el navegador exige una interacción; se reintenta en el próximo clic */ });
  }
  function musicSet(on) {
    music.on = on;
    try { localStorage.setItem("iatu5:musica", on ? "1" : "0"); } catch (e) { /* sin acción */ }
    if (music.btn) {
      music.btn.setAttribute("aria-pressed", String(on));
      music.btn.setAttribute("aria-label", on ? "Silenciar la música de fondo" : "Activar música de fondo");
      music.btn.title = on ? "Música de fondo: activada" : "Música de fondo: silenciada";
      u.clear(music.btn); music.btn.appendChild(icon(on ? "musica" : "sin-musica"));
    }
    if (on) musicPlay(); else musicFade();
  }
  function musicButton() {
    if (!musicTracks().length) return null;
    music.btn = h("button", { class: "btn btn-icon btn-ghost music-btn", type: "button", "aria-pressed": "false" });
    music.btn.addEventListener("click", function () { musicSet(!music.on); });
    var want = false; try { want = localStorage.getItem("iatu5:musica") === "1"; } catch (e) { want = false; }
    musicSet(false);
    if (want) {
      // Autoplay bloqueado: se reanuda con la primera interacción de la persona.
      var once = function () { window.removeEventListener("pointerdown", once, true); window.removeEventListener("keydown", once, true); if (!music.on) musicSet(true); };
      window.addEventListener("pointerdown", once, true); window.addEventListener("keydown", once, true);
    }
    return music.btn;
  }
  function duck(on) { music.duck = Math.max(0, music.duck + (on ? 1 : -1)); musicFade(); }

  function audioPlayer(audioId, opts) {
    opts = opts || {};
    var C = IATU.data.curso, rec = C.audio[audioId];
    if (!rec) return null;
    if (!rec.file) {
      // Pista aún no producida/aprobada: se informa sin simular audio ni usar voz del navegador.
      return h("div", { class: "audio na", role: "note" },
        icon("audio"),
        h("span", { class: "label" }, "Narración pendiente de aprobación de voz. El texto de esta pantalla es el contenido completo."));
    }
    var el = new Audio();
    el.preload = "none";
    var playing = false;
    var btn = h("button", { class: "btn btn-icon btn-primary", type: "button", "aria-label": "Reproducir narración" }, icon("play"));
    var range = h("input", { type: "range", min: 0, max: 1000, value: 0, "aria-label": "Posición de la narración", step: 1 });
    var time = h("span", { class: "time" }, "0:00 / " + u.fmtTime(rec.dur || rec.est));
    var cur = prefRate();
    var speed = h("select", { "aria-label": "Velocidad de la narración" },
      RATES.map(function (r) { return h("option", { value: r, selected: r === cur }, fmtRate(r)); }));
    var eq = h("span", { class: "eq", "aria-hidden": "true" }, h("i"), h("i"), h("i"), h("i"));
    var trBtn = h("button", { class: "btn btn-sm btn-ghost", type: "button", "aria-expanded": "false" }, icon("transcripcion"), "Transcripción");
    var trBox = h("div", { class: "transcript", hidden: true });
    var muestra = /^muestra/.test(rec.status || "");
    var label = h("span", { class: "label" }, eq, (opts.label || "Narración") + " · voz sintética (es-CL)", muestra ? h("span", { class: "tag tag-ochre", title: "Pista de muestra pendiente de aprobación de voz y licencia" }, "muestra") : null);
    function setIcon(name, lbl) { u.clear(btn); btn.appendChild(icon(name)); btn.setAttribute("aria-label", lbl); }
    btn.addEventListener("click", function () {
      if (!el.src) el.src = BASE + rec.file;
      if (playing) { el.pause(); return; }
      if (active && active !== el) active.pause();
      active = el;
      el.playbackRate = parseFloat(speed.value);
      el.play().catch(function () { u.toast("No se pudo reproducir el audio. El texto de la pantalla contiene la misma información."); });
    });
    el.addEventListener("play", function () { playing = true; wrapA.classList.add("is-playing"); duck(true); setIcon("pausa", "Pausar narración"); });
    el.addEventListener("pause", function () { if (playing) duck(false); playing = false; wrapA.classList.remove("is-playing"); setIcon("play", "Reproducir narración"); });
    el.addEventListener("ended", function () { playing = false; wrapA.classList.remove("is-playing"); setIcon("play", "Reproducir narración"); });
    el.addEventListener("timeupdate", function () {
      if (el.duration) range.value = Math.round(1000 * el.currentTime / el.duration);
      time.textContent = u.fmtTime(el.currentTime) + " / " + u.fmtTime(el.duration || rec.dur || rec.est);
    });
    range.addEventListener("input", function () {
      if (!el.src) el.src = BASE + rec.file;
      if (el.duration) el.currentTime = el.duration * range.value / 1000;
    });
    speed.addEventListener("change", function () { el.playbackRate = parseFloat(speed.value); setPrefRate(parseFloat(speed.value)); });
    trBtn.addEventListener("click", function () {
      var open = trBox.hidden;
      trBox.hidden = !open; trBtn.setAttribute("aria-expanded", String(open));
      if (open && !trBox.firstChild) {
        if (rec.text) trBox.appendChild(u.paragraphs(rec.text, ""));
        else trBox.appendChild(h("p", null, "La narración lee el texto de esta pantalla, sin agregar información."));
      }
    });
    var wrapA = h("div", { class: "audio", role: "group", "aria-label": "Narración opcional" },
        btn, h("div", { class: "track" }, label, range), time, speed, trBtn);
    var wrap = h("div", null, wrapA, trBox);
    wrap._audio = el;
    return wrap;
  }

  function figure(imgId, opts) {
    opts = opts || {};
    var C = IATU.data.curso, im = C.images[imgId];
    if (!im || !im.file) return null; // sin marcador "imagen pendiente" en la vista del participante
    var img = h("img", {
      src: BASE + im.file, alt: im.alt || "", loading: "lazy", decoding: "async",
      width: im.w, height: im.h
    });
    if (im.sm) { img.setAttribute("srcset", BASE + im.sm + " 720w, " + BASE + im.file + " " + im.w + "w"); img.setAttribute("sizes", opts.side ? "(max-width: 720px) 100vw, 360px" : "(max-width: 900px) 100vw, 860px"); }
    return h("figure", { class: "figure" + (opts.side ? " figure-side" : ""), "data-img": imgId }, img);
  }

  function videoCard(vidId) {
    var C = IATU.data.curso, v = C.videos[vidId];
    if (!v) return null;
    var body = h("div", { class: "vbody" });
    var card = h("section", { class: "video-card", "aria-label": "Microvideo: " + v.title },
      h("div", { class: "vhead" }, icon("video"), h("div", null, h("span", { class: "note" }, "Microvideo · complementario"), h("br"), h("b", null, v.title))));
    if (v.file) {
      var vid = h("video", { controls: true, preload: "none", playsinline: true, poster: v.poster ? BASE + v.poster : null, "aria-describedby": "" });
      vid.appendChild(h("source", { src: BASE + v.file, type: "video/mp4" }));
      if (v.vtt) vid.appendChild(h("track", { kind: "captions", src: BASE + v.vtt, srclang: "es-CL", label: "Español (Chile)", default: true }));
      vid.addEventListener("play", function () { if (active && active !== vid) active.pause(); active = vid; duck(true); });
      vid.addEventListener("pause", function () { duck(false); });
      vid.playbackRate = prefRate();
      card.appendChild(vid);
    }
    body.appendChild(h("p", { class: "note" }, h("b", null, "Antes de ver: "), v.before));
    var det = h("details", { open: !v.file });
    det.appendChild(h("summary", null, v.file ? "Alternativa textual y escenas" : "Escenas del microvideo (versión textual)"));
    var ol = h("ol", { class: "scenes" });
    v.scenes.forEach(function (s) {
      ol.appendChild(h("li", null, h("div", { class: "vt" }, s.visible_text), h("p", null, s.narration), h("p", { class: "note" }, "Visual: " + s.description)));
    });
    det.appendChild(ol);
    body.appendChild(det);
    body.appendChild(h("p", { class: "note" }, h("b", null, "Después: "), v.after));
    card.appendChild(body);
    return card;
  }

  IATU.media = { audioPlayer: audioPlayer, figure: figure, videoCard: videoCard, stopAll: stopAll, musicButton: musicButton };
})();
