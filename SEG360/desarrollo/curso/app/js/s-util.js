/* Seguridad 360 · utilidades comunes (sin dependencias). */
(function () {
  "use strict";
  var S = window.S360 = window.S360 || {};

  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        var v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
        else if (k === "html") el.innerHTML = v;
        else if (k.slice(0, 2) === "on" && typeof v === "function") el.addEventListener(k.slice(2), v);
        else if (k === "style" && typeof v === "object") { for (var s in v) el.style.setProperty(s, v[s]); }
        else if (v === true) el.setAttribute(k, "");
        else el.setAttribute(k, v);
      }
    }
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
    if (typeof c === "string" || typeof c === "number") el.appendChild(document.createTextNode(String(c)));
    else el.appendChild(c);
  }
  var ICON_ALIAS = {};
  function icon(name, label, cls) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "ico" + (cls ? " " + cls : ""));
    svg.setAttribute("viewBox", "0 0 24 24");
    if (label) { svg.setAttribute("role", "img"); svg.setAttribute("aria-label", label); }
    else svg.setAttribute("aria-hidden", "true");
    var n = (window.S360_ICON_ALIAS || {})[name] || ICON_ALIAS[name] || name;
    if (!document.getElementById("i-" + n)) n = "circle-dot";
    var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#i-" + n);
    svg.appendChild(use);
    return svg;
  }
  function clear(el) { while (el && el.firstChild) el.removeChild(el.firstChild); return el; }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  var uid = 0;
  function newId(p) { uid += 1; return (p || "u") + "-" + uid; }

  function announce(msg, assertive) {
    var r = document.getElementById(assertive ? "live-assert" : "live-polite");
    if (!r) return;
    r.textContent = "";
    setTimeout(function () { r.textContent = msg; }, 40);
  }
  var toastTimer = null;
  function toast(msg, tipo) {
    var t = document.getElementById("toast");
    if (!t) { t = h("div", { id: "toast", class: "toast", role: "status" }); document.body.appendChild(t); }
    t.className = "toast" + (tipo ? " t-" + tipo : "");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 3600);
  }

  /* Texto con **negrita**, saltos de párrafo (\n\n o \n) y viñetas que empiezan con «- » o «• ». */
  function inline(text, target) {
    var parts = String(text).split(/(\*\*[^*]+\*\*)/g);
    parts.forEach(function (p) {
      if (!p) return;
      if (/^\*\*[^*]+\*\*$/.test(p)) target.appendChild(h("strong", null, p.slice(2, -2)));
      else target.appendChild(document.createTextNode(p));
    });
    return target;
  }
  function prose(text, cls) {
    var wrap = h("div", { class: cls || "prose" });
    var list = null;
    String(text || "").split(/\n/).forEach(function (line) {
      var t = line.trim();
      if (!t) { list = null; return; }
      var m = t.match(/^(?:[-•·]|\d+[.)])\s+(.*)$/);
      if (m) {
        if (!list) { list = h(/^\d/.test(t) ? "ol" : "ul"); wrap.appendChild(list); }
        list.appendChild(inline(m[1], h("li")));
      } else { list = null; wrap.appendChild(inline(t, h("p"))); }
    });
    return wrap;
  }
  function plain(text) { return String(text || "").replace(/\*\*/g, ""); }

  function debounce(fn, ms) {
    var t = null;
    return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); };
  }
  function fmtTime(s) { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
  function fmtHoras(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    var hh = Math.floor(sec / 3600), mm = Math.floor(sec % 3600 / 60);
    return hh ? hh + " h " + mm + " min" : mm + " min";
  }
  /* Barajado determinista (para que el orden de opciones no cambie al volver a la pantalla). */
  function seed31(str) {
    var x = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; }
    return x & 0x7fffffff;
  }
  function shuffle(arr, seedStr) {
    var a = arr.slice(), x = seed31(String(seedStr || "s")) || 1;
    for (var i = a.length - 1; i > 0; i--) {
      x = (Math.imul(x, 1103515245) + 12345) & 0x7fffffff;
      var j = x % (i + 1), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function words(t) { return String(t || "").trim().split(/\s+/).filter(Boolean).length; }
  function reducedMotion() { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("sin-movimiento"); } catch (e) { return false; } }

  /* ---------- Compresión LZ (basada en el algoritmo público LZ-String, implementación propia) ---------- */
  var KEY64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  function compress(uncompressed, bitsPerChar, getCharFromInt) {
    if (uncompressed == null) return "";
    var i, value, dict = {}, dictToCreate = {}, c = "", wc = "", w = "", enlargeIn = 2, dictSize = 3, numBits = 2,
      data = [], dataVal = 0, dataPos = 0, ii;
    function writeBit(bit) {
      dataVal = (dataVal << 1) | bit;
      if (dataPos === bitsPerChar - 1) { dataPos = 0; data.push(getCharFromInt(dataVal)); dataVal = 0; } else dataPos++;
    }
    function writeBits(n, v) { for (var k = 0; k < n; k++) { writeBit(v & 1); v >>= 1; } }
    for (ii = 0; ii < uncompressed.length; ii++) {
      c = uncompressed.charAt(ii);
      if (!Object.prototype.hasOwnProperty.call(dict, c)) { dict[c] = dictSize++; dictToCreate[c] = true; }
      wc = w + c;
      if (Object.prototype.hasOwnProperty.call(dict, wc)) { w = wc; continue; }
      if (Object.prototype.hasOwnProperty.call(dictToCreate, w)) {
        if (w.charCodeAt(0) < 256) { for (i = 0; i < numBits; i++) writeBit(0); writeBits(8, w.charCodeAt(0)); }
        else { value = 1; for (i = 0; i < numBits; i++) { writeBit(value); value = 0; } writeBits(16, w.charCodeAt(0)); }
        enlargeIn--; if (enlargeIn === 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
        delete dictToCreate[w];
      } else { writeBits(numBits, dict[w]); }
      enlargeIn--; if (enlargeIn === 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
      dict[wc] = dictSize++;
      w = String(c);
    }
    if (w !== "") {
      if (Object.prototype.hasOwnProperty.call(dictToCreate, w)) {
        if (w.charCodeAt(0) < 256) { for (i = 0; i < numBits; i++) writeBit(0); writeBits(8, w.charCodeAt(0)); }
        else { value = 1; for (i = 0; i < numBits; i++) { writeBit(value); value = 0; } writeBits(16, w.charCodeAt(0)); }
        enlargeIn--; if (enlargeIn === 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
        delete dictToCreate[w];
      } else { writeBits(numBits, dict[w]); }
      enlargeIn--; if (enlargeIn === 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
    }
    writeBits(numBits, 2);
    while (true) { dataVal = (dataVal << 1); if (dataPos === bitsPerChar - 1) { data.push(getCharFromInt(dataVal)); break; } else dataPos++; }
    return data.join("");
  }
  function decompress(length, resetValue, getNextValue) {
    var dictionary = [], enlargeIn = 4, dictSize = 4, numBits = 3, entry = "", result = [], i, w, c, bits, resb, maxpower, power,
      data = { val: getNextValue(0), position: resetValue, index: 1 };
    function readBits(n) {
      bits = 0; maxpower = Math.pow(2, n); power = 1;
      while (power !== maxpower) {
        resb = data.val & data.position; data.position >>= 1;
        if (data.position === 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
        bits |= (resb > 0 ? 1 : 0) * power; power <<= 1;
      }
      return bits;
    }
    for (i = 0; i < 3; i++) dictionary[i] = i;
    var next = readBits(2);
    switch (next) {
      case 0: c = String.fromCharCode(readBits(8)); break;
      case 1: c = String.fromCharCode(readBits(16)); break;
      case 2: return "";
    }
    dictionary[3] = c; w = c; result.push(c);
    while (true) {
      if (data.index > length) return "";
      c = readBits(numBits);
      switch (c) {
        case 0: dictionary[dictSize++] = String.fromCharCode(readBits(8)); c = dictSize - 1; enlargeIn--; break;
        case 1: dictionary[dictSize++] = String.fromCharCode(readBits(16)); c = dictSize - 1; enlargeIn--; break;
        case 2: return result.join("");
      }
      if (enlargeIn === 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
      if (dictionary[c]) entry = dictionary[c];
      else if (c === dictSize) entry = w + w.charAt(0);
      else return null;
      result.push(entry);
      dictionary[dictSize++] = w + entry.charAt(0);
      enlargeIn--;
      w = entry;
      if (enlargeIn === 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
    }
  }
  var rev64 = {};
  for (var q = 0; q < KEY64.length; q++) rev64[KEY64.charAt(q)] = q;
  function compressB64(s) {
    var r = compress(s, 6, function (a) { return KEY64.charAt(a); });
    switch (r.length % 4) { case 1: return r + "==="; case 2: return r + "=="; case 3: return r + "="; default: return r; }
  }
  function decompressB64(s) {
    if (!s) return "";
    return decompress(s.length, 32, function (i) { return rev64[s.charAt(i)]; });
  }


  /* Revierte la ofuscación del banco portátil (ver herramientas/build.py). No es seguridad. */
  function desofuscar(b64, etiqueta) {
    var bin = atob(b64), out = new Uint8Array(bin.length), x = seed31(etiqueta);
    for (var i = 0; i < bin.length; i++) { x = (Math.imul(x, 1103515245) + 12345) & 0x7fffffff; out[i] = bin.charCodeAt(i) ^ ((x >> 16) & 0xff); }
    return JSON.parse(new TextDecoder("utf-8").decode(out));
  }
  function download(name, text, mime) {
    var blob = new Blob([text], { type: (mime || "text/plain") + ";charset=utf-8" });
    var a = h("a", { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  /* Carga diferida de un script (datos de un módulo, Three.js…). Devuelve una promesa. */
  var loaded = {};
  function loadScript(src) {
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = function () { res(); };
      s.onerror = function () { delete loaded[src]; rej(new Error("No se pudo cargar " + src)); };
      document.head.appendChild(s);
    });
    return loaded[src];
  }
  function pref(k, v) {
    try {
      if (v === undefined) { var r = localStorage.getItem("s360:pref:" + k); return r === null ? null : JSON.parse(r); }
      localStorage.setItem("s360:pref:" + k, JSON.stringify(v));
    } catch (e) { return null; }
    return v;
  }

  S.u = {
    h: h, add: add, icon: icon, ICON_ALIAS: ICON_ALIAS, clear: clear, $: $, $$: $$, newId: newId, announce: announce, toast: toast,
    inline: inline, prose: prose, plain: plain, debounce: debounce, fmtTime: fmtTime, fmtHoras: fmtHoras, seed31: seed31,
    shuffle: shuffle, words: words, reducedMotion: reducedMotion, compressB64: compressB64, decompressB64: decompressB64,
    desofuscar: desofuscar, download: download, loadScript: loadScript, pref: pref
  };
})();
