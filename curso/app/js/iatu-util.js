/* Curso 5 · IA para trabajar mejor — utilidades comunes (sin dependencias). */
(function () {
  "use strict";
  var IATU = window.IATU = window.IATU || {};

  /* ---------- DOM ---------- */
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
        else if (k === "style" && typeof v === "object") { for (var s in v) el.style[s] = v[s]; }
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
  function icon(name, label) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "ico");
    if (label) { svg.setAttribute("role", "img"); svg.setAttribute("aria-label", label); }
    else svg.setAttribute("aria-hidden", "true");
    var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#i-" + name);
    svg.appendChild(use);
    return svg;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  var uid = 0;
  function newId(p) { uid += 1; return (p || "u") + "-" + uid; }

  /* ---------- Anuncios para lectores de pantalla ---------- */
  function announce(msg, assertive) {
    var r = document.getElementById(assertive ? "live-assert" : "live-polite");
    if (!r) return;
    r.textContent = "";
    setTimeout(function () { r.textContent = msg; }, 40);
  }
  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) { t = h("div", { id: "toast", class: "toast", role: "status" }); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 3200);
  }

  /* ---------- Texto: fuentes, párrafos y expedientes ---------- */
  var SRC_RE = /\[((?:[A-Z]{1,3}\d{0,2})(?:\s*[;,]\s*[A-Z]{1,3}\d{0,2})*)\]/g;
  function inline(text, target) {
    // Inserta texto con marcas de fuente [N1; ED] convertidas en enlaces a la biblioteca.
    var last = 0, m;
    SRC_RE.lastIndex = 0;
    while ((m = SRC_RE.exec(text))) {
      if (m.index > last) target.appendChild(document.createTextNode(text.slice(last, m.index)));
      m[1].split(/\s*[;,]\s*/).forEach(function (id) {
        target.appendChild(h("a", { class: "src", href: "#/biblioteca/fuentes/" + id, title: "Fuente " + id + " · ver en la biblioteca" }, id));
      });
      last = m.index + m[0].length;
    }
    if (last < text.length) target.appendChild(document.createTextNode(text.slice(last)));
    return target;
  }
  function paragraphs(text, cls) {
    var wrap = h("div", { class: cls || "prose" });
    String(text || "").split(/\n+/).forEach(function (p) {
      if (p.trim()) wrap.appendChild(inline(p.trim(), h("p")));
    });
    return wrap;
  }
  // Divide un expediente en líneas etiquetadas (E1., F2., S3., A-E1., P1., R2., T1., N1., I1., C-18…)
  var LINE_RE = /(?:^|\s)((?:[A-Z]-)?[A-Z]{1,3}\d{1,2})\.\s/g;
  function docLines(text) {
    var out = [];
    String(text || "").split(/\n+/).forEach(function (block) {
      block = block.trim();
      if (!block) return;
      var idx = [], m;
      LINE_RE.lastIndex = 0;
      while ((m = LINE_RE.exec(block))) idx.push({ at: m.index + (m[0].charAt(0) === " " ? 1 : 0), label: m[1], len: m[1].length + 2 });
      if (!idx.length || idx[0].at > 0) {
        var head = idx.length ? block.slice(0, idx[0].at).trim() : block;
        if (head) out.push({ label: null, text: head });
      }
      idx.forEach(function (it, i) {
        var end = i + 1 < idx.length ? idx[i + 1].at : block.length;
        out.push({ label: it.label, text: block.slice(it.at + it.len, end).trim() });
      });
    });
    return out;
  }
  function docView(opts) {
    // opts: {tab, title, text, fiction, compact, lines}
    var d = h("section", { class: "doc" + (opts.compact ? " compact" : ""), "aria-label": opts.title || opts.tab || "Expediente" });
    if (opts.tab) d.appendChild(h("div", { class: "doc-tab" }, icon(opts.icon || "documento"), opts.tab));
    if (opts.fiction !== false) d.appendChild(h("span", { class: "fiction stamp fic", title: "Material ficticio del curso" }, "Ficticio"));
    if (opts.title) d.appendChild(h("h3", { class: "doc-title" }, opts.title));
    var lines = opts.lines || docLines(opts.text);
    lines.forEach(function (ln) {
      if (ln.label) d.appendChild(h("div", { class: "doc-line" }, h("span", { class: "lbl" }, ln.label), inline(ln.text, h("span", { class: "txt" }))));
      else d.appendChild(inline(ln.text, h("p", { class: "doc-plain" })));
    });
    return d;
  }

  /* ---------- Números con coma decimal ---------- */
  function parseNum(s) {
    if (s === null || s === undefined) return NaN;
    s = String(s).trim().replace(/\s/g, "").replace(/%$/, "");
    if (!s) return NaN;
    // 1.234,5 → 1234.5 ; 66,7 → 66.7 ; 66.7 → 66.7
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(",", ".");
    if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
    return parseFloat(s);
  }

  function debounce(fn, ms) {
    var t = null;
    return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); };
  }
  function nowISO() { return new Date().toISOString(); }
  function fmtTime(s) { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }

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

  /* Revierte la ofuscación del banco de evaluación (ver herramientas/build_publico.py · ofuscar). No es seguridad. */
  function desofuscar(b64, etiqueta) {
    var bin = atob(b64), out = new Uint8Array(bin.length), x = seed31(etiqueta);
    for (var i = 0; i < bin.length; i++) { x = (Math.imul(x, 1103515245) + 12345) & 0x7fffffff; out[i] = bin.charCodeAt(i) ^ ((x >> 16) & 0xff); }
    return JSON.parse(new TextDecoder("utf-8").decode(out));
  }
  /* Semilla de la ofuscación: FNV-1a de 32 bits sobre la etiqueta, recortado a 31 bits. */
  function seed31(str) {
    var x = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; }
    return x & 0x7fffffff;
  }
  function download(name, text, mime) {
    var blob = new Blob([text], { type: (mime || "text/plain") + ";charset=utf-8" });
    var a = h("a", { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  IATU.u = {
    h: h, add: add, icon: icon, clear: clear, $: $, $$: $$, newId: newId, announce: announce, toast: toast,
    seed31: seed31, inline: inline, paragraphs: paragraphs, docLines: docLines, docView: docView, parseNum: parseNum,
    debounce: debounce, nowISO: nowISO, desofuscar: desofuscar, fmtTime: fmtTime, compressB64: compressB64, decompressB64: decompressB64,
    download: download
  };
})();
