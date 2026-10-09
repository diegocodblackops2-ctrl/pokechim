/* Curso 5 — capa de movimiento y señales de avance.
   Red neuronal del programa (18 nodos: orientación, 16 módulos y evaluación) que se enciende con el avance real,
   escritura progresiva, aparición al hacer scroll, inclinación de tarjetas, conteo, confeti y reloj de dedicación.
   Todo respeta prefers-reduced-motion y Ajustes › Reducir movimiento. Ningún efecto transmite información
   que no esté también en el texto. */
(function () {
  "use strict";
  var IATU = window.IATU = window.IATU || {};
  var fx = {};

  fx.reduced = function () {
    return document.documentElement.classList.contains("no-motion") ||
      (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  };

  /* ---------- Palabras que entran una a una ---------- */
  fx.words = function (el, text, delay0) {
    el.textContent = "";
    var parts = text.split(/(\s+)/), d = delay0 || 0;
    parts.forEach(function (p) {
      if (/^\s+$/.test(p)) { el.appendChild(document.createTextNode(p)); return; }
      var s = document.createElement("span");
      s.className = "kw"; s.textContent = p; s.style.animationDelay = d + "ms"; d += 90;
      el.appendChild(s);
    });
    el.setAttribute("aria-label", text);
    return el;
  };

  /* ---------- Escritura progresiva (como una salida generada que luego se revisa) ---------- */
  fx.type = function (el, text, speed) {
    el.setAttribute("aria-label", text);
    if (fx.reduced()) { el.textContent = text; return; }
    var span = document.createElement("span"), caret = document.createElement("span");
    span.setAttribute("aria-hidden", "true"); caret.className = "caret"; caret.setAttribute("aria-hidden", "true");
    el.textContent = ""; el.appendChild(span); el.appendChild(caret);
    var i = 0, sp = speed || 16;
    (function step() {
      if (!el.isConnected) return;
      i += 1 + (Math.random() < .3 ? 1 : 0);
      span.textContent = text.slice(0, i);
      if (i < text.length) setTimeout(step, sp + (/[.,:;]/.test(text[i - 1]) ? 140 : 0));
      else setTimeout(function () { caret.remove(); }, 2400);
    })();
  };

  /* ---------- Conteo animado ---------- */
  fx.count = function (el, to, suffix, ms) {
    suffix = suffix || "";
    if (fx.reduced()) { el.textContent = to + suffix; return; }
    var t0 = null, dur = ms || 1400;
    function f(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(to * e) + suffix;
      if (k < 1) requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  };

  /* ---------- Aparición al hacer scroll ---------- */
  var io = null;
  fx.reveal = function (root) {
    var els = (root || document).querySelectorAll(".rv:not(.in)");
    if (fx.reduced() || !("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    if (!io) io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });
    var k = 0;
    els.forEach(function (e) { e.style.transitionDelay = Math.min(k++ % 6, 5) * 60 + "ms"; io.observe(e); });
  };

  /* ---------- Inclinación con brillo (tarjetas) ---------- */
  fx.tilt = function (el) {
    if (fx.reduced() || !window.matchMedia("(hover: hover)").matches) return;
    el.addEventListener("pointermove", function (ev) {
      var r = el.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
      el.style.setProperty("--ry", ((x - .5) * 8).toFixed(2) + "deg");
      el.style.setProperty("--rx", ((.5 - y) * 6).toFixed(2) + "deg");
      el.style.setProperty("--gx", (x * 100).toFixed(1) + "%"); el.style.setProperty("--gy", (y * 100).toFixed(1) + "%");
    });
    el.addEventListener("pointerleave", function () { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); });
  };

  /* ---------- Red neuronal del programa ---------- */
  /* nodes: [{label, state: "done"|"here"|"todo"|"lock", href}] — se dibujan como una ruta serpenteante. */
  fx.neural = function (canvas, nodes, opts) {
    opts = opts || {};
    var ctx = canvas.getContext("2d"), W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    var pts = [], dust = [], mouse = { x: -999, y: -999 }, hover = -1, raf = 0, visible = true, t0 = performance.now();
    var COL = { done: [240, 171, 252], here: [252, 211, 77], todo: [167, 139, 250], lock: [120, 105, 160] };
    function layout() {
      var r = canvas.getBoundingClientRect(); W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = nodes.length, x0 = W < 760 ? W * .08 : W * .64, x1 = W * .96, rows = W < 760 ? 3 : 4, perRow = Math.ceil(n / rows);
      pts = nodes.map(function (nd, i) {
        var row = Math.floor(i / perRow), col = i % perRow, colN = row % 2 ? perRow - 1 - col : col;
        var x = x0 + (x1 - x0) * (colN + .5) / perRow, y = H * (rows === 4 ? .17 + row * .2 : .24 + row * .26);
        var jx = Math.sin(i * 12.9898) * 14, jy = Math.cos(i * 78.233) * 16;
        return { x: x + jx, y: y + jy, n: nd, ph: i * .7 };
      });
      if (!dust.length) for (var k = 0; k < (W < 760 ? 28 : 64); k++) dust.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .18, vy: (Math.random() - .5) * .18, r: Math.random() * 1.6 + .4 });
    }
    function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
    function frame(now) {
      var t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      // polvo de datos
      dust.forEach(function (d) {
        if (!fx.reduced()) { d.x += d.vx; d.y += d.vy; if (d.x < 0 || d.x > W) d.vx *= -1; if (d.y < 0 || d.y > H) d.vy *= -1; }
        var dx = d.x - mouse.x, dy = d.y - mouse.y, md = Math.sqrt(dx * dx + dy * dy);
        if (md < 120 && !fx.reduced()) { d.x += dx / md * .6; d.y += dy / md * .6; }
        ctx.fillStyle = "rgba(196,181,253,.55)"; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill();
      });
      for (var a = 0; a < dust.length; a++) for (var b = a + 1; b < dust.length; b++) {
        var p = dust[a], q = dust[b], dd = (p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y);
        if (dd < 9000) { ctx.strokeStyle = "rgba(167,139,250," + (0.16 * (1 - dd / 9000)).toFixed(3) + ")"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
      }
      // conexiones del programa
      for (var i = 0; i < pts.length - 1; i++) {
        var A = pts[i], B = pts[i + 1], lit = A.n.state === "done";
        var g = ctx.createLinearGradient(A.x, A.y, B.x, B.y);
        g.addColorStop(0, lit ? "rgba(240,171,252,.85)" : "rgba(167,139,250,.22)");
        g.addColorStop(1, lit && B.n.state === "done" ? "rgba(240,171,252,.85)" : lit ? "rgba(252,211,77,.6)" : "rgba(167,139,250,.18)");
        ctx.strokeStyle = g; ctx.lineWidth = lit ? 2.2 : 1.2; ctx.beginPath(); ctx.moveTo(A.x, A.y);
        var mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2 + (i % 2 ? 18 : -18);
        ctx.quadraticCurveTo(mx, my, B.x, B.y); ctx.stroke();
        // pulso viajando por la ruta encendida
        if (lit && !fx.reduced()) {
          var k = (t * .45 + i * .13) % 1, ix = (1 - k) * (1 - k) * A.x + 2 * (1 - k) * k * mx + k * k * B.x, iy = (1 - k) * (1 - k) * A.y + 2 * (1 - k) * k * my + k * k * B.y;
          ctx.fillStyle = "rgba(255,255,255,.95)"; ctx.shadowColor = "rgba(240,171,252,1)"; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(ix, iy, 2.4, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
        }
      }
      // nodos
      pts.forEach(function (P, j) {
        var c = COL[P.n.state] || COL.todo, pulse = fx.reduced() ? 0 : (Math.sin(t * 2 + P.ph) + 1) / 2;
        var r = P.n.state === "here" ? 9 + pulse * 2 : P.n.state === "done" ? 7 : 5.5;
        if (j === hover) r += 3;
        if (P.n.state !== "lock") { var halo = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, r * 4.2); halo.addColorStop(0, rgba(c, P.n.state === "todo" ? .18 : .45)); halo.addColorStop(1, rgba(c, 0)); ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(P.x, P.y, r * 4.2, 0, 6.283); ctx.fill(); }
        ctx.fillStyle = P.n.state === "todo" ? "rgba(22,12,46,1)" : rgba(c, 1);
        ctx.strokeStyle = rgba(c, .95); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(P.x, P.y, r, 0, 6.283); ctx.fill(); ctx.stroke();
        if (P.n.state === "here" && !fx.reduced()) { ctx.strokeStyle = rgba(c, .5 * (1 - pulse)); ctx.beginPath(); ctx.arc(P.x, P.y, r + 6 + pulse * 10, 0, 6.283); ctx.stroke(); }
        if (P.n.short && W >= 760) { ctx.fillStyle = "rgba(233,213,255," + (j === hover ? .95 : .55) + ")"; ctx.font = "600 11px Manrope, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText(P.n.short, P.x, P.y + r + 15); }
      });
      if (hover >= 0) {
        var H0 = pts[hover], lbl = H0.n.label;
        ctx.font = "600 13px Manrope, system-ui, sans-serif"; var tw = ctx.measureText(lbl).width + 22, bx = Math.min(Math.max(H0.x - tw / 2, 6), W - tw - 6), by = H0.y - 44;
        ctx.fillStyle = "rgba(18,10,38,.92)"; ctx.strokeStyle = "rgba(240,171,252,.5)"; ctx.lineWidth = 1;
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bx, by, tw, 28, 9); else ctx.rect(bx, by, tw, 28); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.fillText(lbl, bx + 11, by + 18.5);
      }
      if (visible && !fx.reduced()) raf = requestAnimationFrame(frame);
    }
    function pick(ev) {
      var r = canvas.getBoundingClientRect(); mouse.x = ev.clientX - r.left; mouse.y = ev.clientY - r.top;
      var best = -1, bd = 22 * 22;
      pts.forEach(function (P, i) { var d = (P.x - mouse.x) * (P.x - mouse.x) + (P.y - mouse.y) * (P.y - mouse.y); if (d < bd) { bd = d; best = i; } });
      hover = best; canvas.style.cursor = best >= 0 && pts[best].n.href ? "pointer" : "default";
      if (fx.reduced()) frame(performance.now());
    }
    canvas.addEventListener("pointermove", pick);
    canvas.addEventListener("pointerleave", function () { mouse.x = mouse.y = -999; hover = -1; });
    canvas.addEventListener("click", function () { if (hover >= 0 && pts[hover].n.href) location.hash = pts[hover].n.href; });
    layout();
    var ro = window.ResizeObserver ? new ResizeObserver(function () { layout(); if (fx.reduced()) frame(performance.now()); }) : null;
    if (ro) ro.observe(canvas);
    if ("IntersectionObserver" in window) new IntersectionObserver(function (e) {
      visible = e[0].isIntersecting; cancelAnimationFrame(raf); if (visible) raf = requestAnimationFrame(frame);
    }).observe(canvas);
    raf = requestAnimationFrame(frame);
    return { stop: function () { visible = false; cancelAnimationFrame(raf); if (ro) ro.disconnect(); } };
  };

  /* ---------- Confeti y medalla ---------- */
  fx.confetti = function () {
    if (fx.reduced()) return;
    var c = document.createElement("canvas"); c.className = "confetti"; c.setAttribute("aria-hidden", "true");
    document.body.appendChild(c);
    var ctx = c.getContext("2d"), W = c.width = innerWidth, H = c.height = innerHeight, cols = ["#a855f7", "#d946ef", "#fcd34d", "#f0abfc", "#c4b5fd", "#ffffff"];
    var ps = []; for (var i = 0; i < 160; i++) ps.push({ x: W / 2 + (Math.random() - .5) * 120, y: H * .32, vx: (Math.random() - .5) * 13, vy: -Math.random() * 13 - 3, s: Math.random() * 7 + 3, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: cols[i % cols.length], sh: i % 3 });
    var t = 0;
    (function f() {
      ctx.clearRect(0, 0, W, H); t++;
      ps.forEach(function (p) {
        p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - t / 150);
        if (p.sh === 0) ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); else if (p.sh === 1) { ctx.beginPath(); ctx.arc(0, 0, p.s / 3, 0, 6.283); ctx.fill(); } else { ctx.beginPath(); ctx.moveTo(0, -p.s / 2); ctx.lineTo(p.s / 2, p.s / 2); ctx.lineTo(-p.s / 2, p.s / 2); ctx.fill(); }
        ctx.restore();
      });
      if (t < 150) requestAnimationFrame(f); else c.remove();
    })();
  };
  fx.celebrate = function (medal, title, sub) {
    fx.confetti();
    var el = document.createElement("div"); el.className = "celebrate"; el.setAttribute("role", "status");
    el.innerHTML = '<span class="medal" aria-hidden="true"></span><div><b></b><span></span></div>';
    el.querySelector(".medal").textContent = medal; el.querySelector("b").textContent = title; el.querySelector(":scope > div > span").textContent = sub || "";
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("on"); });
    setTimeout(function () { el.classList.remove("on"); setTimeout(function () { el.remove(); }, 600); }, 4200);
  };

  /* ---------- Reloj de dedicación: solo cuenta tiempo activo con la pestaña visible ---------- */
  fx.clock = function (store, onTick) {
    var last = Date.now(), TICK = 15;
    ["pointerdown", "keydown", "scroll", "wheel", "touchstart"].forEach(function (ev) { window.addEventListener(ev, function () { last = Date.now(); }, { passive: true }); });
    window.addEventListener("pointermove", function () { last = Date.now(); }, { passive: true });
    setInterval(function () {
      var playing = Array.prototype.some.call(document.querySelectorAll("audio, video"), function (m) { return !m.paused; });
      if (document.visibilityState === "visible" && (playing || Date.now() - last < 120000)) {
        store.addTime(TICK);
        if (onTick) onTick(store.totalTime());
      }
    }, TICK * 1000);
  };
  fx.fmtTime = function (sec) {
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60);
    if (h) return h + " h " + (m < 10 ? "0" : "") + m + " min";
    return m + " min";
  };

  IATU.fx = fx;
})();
