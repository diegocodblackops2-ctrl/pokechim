/* Seguridad 360 · voz por pantalla, música de fondo y efectos de sonido.
   Reglas: nada suena solo al cargar; una voz activa a la vez; la música baja durante la voz;
   todo se detiene al salir de la pantalla o al ocultarse la pestaña; preferencias recordadas. */
(function () {
  "use strict";
  var S = window.S360, u = S.u, h = u.h;
  var CFG = window.S360_CONFIG || {};
  var M = window.S360_MEDIA = window.S360_MEDIA || { audio: {}, music: [], sfx: {}, images: {} };
  var BASE = (CFG.base || "");
  var SPEEDS = [0.8, 0.9, 1, 1.1, 1.25, 1.5];

  var prefs = {
    rate: u.pref("rate") || 1,
    sfx: u.pref("sfx") === null ? true : !!u.pref("sfx"),
    music: !!u.pref("music"),
    musicVol: u.pref("musicVol") || 0.35,
    subs: u.pref("subs") === null ? true : !!u.pref("subs"),
    autoplay: !!u.pref("autoplay")
  };

  /* ---------- Efectos de sonido (WebAudio, archivos pequeños) ---------- */
  var ctx = null, buffers = {}, loadingSfx = {};
  function actx() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function sfx(name) {
    if (!prefs.sfx || !M.sfx[name]) return;
    var c = actx(); if (!c) return;
    var play = function (buf) { try { var s = c.createBufferSource(), g = c.createGain(); g.gain.value = 0.55; s.buffer = buf; s.connect(g).connect(c.destination); s.start(); } catch (e) { /* sin acción */ } };
    if (buffers[name]) return play(buffers[name]);
    if (loadingSfx[name]) return;
    loadingSfx[name] = fetch(BASE + "media/sfx/" + M.sfx[name]).then(function (r) { return r.arrayBuffer(); })
      .then(function (ab) { return new Promise(function (res, rej) { c.decodeAudioData(ab, res, rej); }); })
      .then(function (buf) { buffers[name] = buf; play(buf); }).catch(function () { /* sin acción */ });
  }

  /* ---------- Música de fondo (opcional, apagada por defecto) ---------- */
  var music = { el: null, track: null, ducked: false };
  function musicFor(ctxName) {
    var list = M.music || [];
    for (var i = 0; i < list.length; i++) if (list[i].uso === ctxName) return list[i];
    return list[0] || null;
  }
  function setMusicContext(ctxName) {
    music.want = ctxName;
    if (!prefs.music) return;
    var t = musicFor(ctxName);
    if (!t) return;
    if (music.track && music.track.file === t.file && music.el && !music.el.paused) return;
    fadeOutMusic(function () {
      music.track = t;
      music.el = new Audio(BASE + "media/music/" + t.file);
      music.el.loop = true; music.el.preload = "auto";
      music.el.volume = 0;
      music.el.play().then(function () { fadeTo(music.ducked ? prefs.musicVol * 0.25 : prefs.musicVol); }).catch(function () { /* sin acción */ });
    });
  }
  var fadeTimer = null;
  function fadeTo(target, cb) {
    clearInterval(fadeTimer);
    if (!music.el) { if (cb) cb(); return; }
    fadeTimer = setInterval(function () {
      if (!music.el) { clearInterval(fadeTimer); if (cb) cb(); return; }
      var v = music.el.volume, d = target - v;
      if (Math.abs(d) < 0.02) { music.el.volume = Math.max(0, Math.min(1, target)); clearInterval(fadeTimer); if (cb) cb(); return; }
      music.el.volume = Math.max(0, Math.min(1, v + d * 0.18));
    }, 50);
  }
  function fadeOutMusic(cb) {
    if (!music.el) { if (cb) cb(); return; }
    var el = music.el;
    fadeTo(0, function () { try { el.pause(); } catch (e) { /* sin acción */ } if (music.el === el) music.el = null; if (cb) cb(); });
  }
  function duck(on) {
    music.ducked = on;
    if (music.el && prefs.music) fadeTo(on ? prefs.musicVol * 0.22 : prefs.musicVol);
  }
  function toggleMusic(on) {
    prefs.music = on; u.pref("music", on);
    if (on) setMusicContext(music.want || "exploracion"); else fadeOutMusic();
  }

  /* ---------- Voz por pantalla ---------- */
  var current = null; // { audio, id, ui }
  function hasVoice(id) { return !!(M.audio && M.audio[id]); }
  function stopVoice() {
    if (current && current.audio) { try { current.audio.pause(); } catch (e) { /* sin acción */ } }
    if (current && current.ui) current.ui.classList.remove("sonando");
    current = null; duck(false);
  }
  function parseVTT(txt) {
    var cues = [], blocks = String(txt).replace(/\r/g, "").split(/\n\n+/);
    blocks.forEach(function (b) {
      var m = b.match(/(\d+:)?(\d+):(\d+)[.,](\d+)\s*-->\s*(\d+:)?(\d+):(\d+)[.,](\d+)[^\n]*\n([\s\S]+)/);
      if (!m) return;
      var t = function (hh, mm, ss, ms) { return (parseInt(hh || "0", 10) * 3600) + parseInt(mm, 10) * 60 + parseInt(ss, 10) + parseInt(ms, 10) / 1000; };
      cues.push({ a: t(m[1] && m[1].slice(0, -1), m[2], m[3], m[4]), b: t(m[5] && m[5].slice(0, -1), m[6], m[7], m[8]), text: m[9].trim() });
    });
    return cues;
  }
  /* Reproductor compacto de la voz: botón, barra, velocidad, subtítulos. Devuelve el nodo (o null si no hay audio). */
  function voiceBar(id, opts) {
    opts = opts || {};
    if (!hasVoice(id)) return null;
    var info = M.audio[id];
    var wrap = h("div", { class: "voz", role: "group", "aria-label": "Narración" });
    var btn = h("button", { class: "voz-play", type: "button", "aria-label": "Escuchar la narración" }, u.icon("play"), u.icon("pause", null, "i-pause"));
    var bar = h("div", { class: "voz-barra", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-label": "Avance de la narración" }, h("i"));
    var time = h("span", { class: "voz-tiempo" }, u.fmtTime(info.dur || 0));
    var speed = h("button", { class: "voz-vel", type: "button", "aria-label": "Velocidad de la narración" }, fmtRate(prefs.rate));
    var eq = h("span", { class: "voz-eq", "aria-hidden": "true" }, h("b"), h("b"), h("b"), h("b"));
    var sub = h("div", { class: "voz-sub", "aria-hidden": "true" });
    wrap.appendChild(btn); wrap.appendChild(eq); wrap.appendChild(bar); wrap.appendChild(time); wrap.appendChild(speed);
    var cues = null;
    if (info.vtt) fetch(BASE + "media/audio/" + id + ".vtt").then(function (r) { return r.text(); }).then(function (t) { cues = parseVTT(t); }).catch(function () { cues = null; });
    var audio = null;
    function ensure() {
      if (audio) return audio;
      audio = new Audio(BASE + "media/audio/" + (info.file || id + ".mp3"));
      audio.preload = "metadata";
      audio.playbackRate = prefs.rate;
      audio.addEventListener("timeupdate", function () {
        var d = audio.duration || info.dur || 1;
        bar.firstChild.style.width = (100 * audio.currentTime / d).toFixed(1) + "%";
        bar.setAttribute("aria-valuenow", Math.round(100 * audio.currentTime / d));
        time.textContent = u.fmtTime(audio.currentTime) + " / " + u.fmtTime(d);
        if (cues && prefs.subs) {
          var c = null;
          for (var i = 0; i < cues.length; i++) if (audio.currentTime >= cues[i].a && audio.currentTime <= cues[i].b + 0.15) { c = cues[i]; break; }
          sub.textContent = c ? c.text : "";
          sub.classList.toggle("on", !!c);
        }
      });
      audio.addEventListener("ended", function () {
        wrap.classList.remove("sonando"); duck(false); sub.classList.remove("on");
        if (current && current.audio === audio) current = null;
        if (opts.onEnd) opts.onEnd();
      });
      audio.addEventListener("pause", function () { wrap.classList.remove("sonando"); });
      audio.addEventListener("play", function () { wrap.classList.add("sonando"); });
      return audio;
    }
    function play() {
      var a = ensure();
      if (current && current.audio !== a) stopVoice();
      current = { audio: a, id: id, ui: wrap };
      duck(true);
      a.playbackRate = prefs.rate;
      a.play().catch(function () { wrap.classList.remove("sonando"); });
    }
    btn.addEventListener("click", function () {
      var a = ensure();
      if (a.paused) { play(); btn.setAttribute("aria-label", "Pausar la narración"); }
      else { a.pause(); duck(false); btn.setAttribute("aria-label", "Escuchar la narración"); }
    });
    bar.addEventListener("click", function (ev) {
      var a = ensure(), r = bar.getBoundingClientRect();
      var d = a.duration || info.dur || 0;
      if (d) a.currentTime = Math.max(0, Math.min(d, d * (ev.clientX - r.left) / r.width));
    });
    speed.addEventListener("click", function () {
      var i = SPEEDS.indexOf(prefs.rate); prefs.rate = SPEEDS[(i + 1) % SPEEDS.length]; u.pref("rate", prefs.rate);
      speed.textContent = fmtRate(prefs.rate);
      if (audio) audio.playbackRate = prefs.rate;
    });
    wrap.sub = sub;
    wrap.play = play;
    if (opts.autoplay && prefs.autoplay) setTimeout(play, 350);
    return wrap;
  }
  function fmtRate(r) { return "×" + String(r).replace(".", ","); }

  /* Audio para escenas temporizadas (videos, casos): devuelve un objeto con play/pause/currentTime. */
  function track(id) {
    if (!hasVoice(id)) return null;
    var info = M.audio[id];
    var a = new Audio(BASE + "media/audio/" + (info.file || id + ".mp3"));
    a.preload = "auto"; a.playbackRate = prefs.rate;
    return { audio: a, dur: info.dur || 0, vtt: info.vtt ? BASE + "media/audio/" + id + ".vtt" : null };
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { if (current && current.audio) current.audio.pause(); if (music.el) music.el.pause(); }
    else if (music.el && prefs.music) music.el.play().catch(function () { /* sin acción */ });
  });

  S.media = {
    prefs: prefs, sfx: sfx, voiceBar: voiceBar, stopVoice: stopVoice, hasVoice: hasVoice, track: track, parseVTT: parseVTT,
    setMusicContext: setMusicContext, toggleMusic: toggleMusic, hasMusic: function () { return (M.music || []).length > 0; },
    setSfx: function (on) { prefs.sfx = on; u.pref("sfx", on); if (on) actx(); },
    setSubs: function (on) { prefs.subs = on; u.pref("subs", on); },
    setAutoplay: function (on) { prefs.autoplay = on; u.pref("autoplay", on); },
    setMusicVol: function (v) { prefs.musicVol = v; u.pref("musicVol", v); if (music.el && !music.ducked) music.el.volume = v; },
    duck: duck, unlock: actx
  };
})();
