/* Curso 5 — estado, persistencia (SCORM 2004 / SCORM 1.2 / vista previa local) y cliente del servicio.
   Regla: solo se muestra "Guardado en el LMS" cuando el LMS confirma Commit sin error.
   El almacenamiento local de la vista previa se rotula como tal; nunca se presenta como LMS. */
(function () {
  "use strict";
  var IATU = window.IATU = window.IATU || {};
  var u = IATU.u;
  var CFG = window.IATU_CONFIG || {};
  var CV = "3.0.0";
  var LIMITS = { scorm2004: 64000, scorm12: 4096 };

  /* ---------- Descubrimiento de la API SCORM ---------- */
  function findAPI(win, name) {
    var tries = 0;
    while (win && tries < 12) {
      try { if (win[name]) return win[name]; } catch (e) { return null; }
      if (win.parent && win.parent !== win) win = win.parent; else break;
      tries++;
    }
    return null;
  }
  function discover(name) {
    var api = findAPI(window, name);
    if (!api) { try { if (window.opener) api = findAPI(window.opener, name); } catch (e) { api = null; } }
    return api;
  }

  /* ---------- Adaptadores ---------- */
  function Scorm2004(api) {
    this.kind = "scorm2004"; this.api = api;
    this.label = "SCORM 2004";
  }
  Scorm2004.prototype = {
    init: function () { return this.api.Initialize("") === "true" || this.err() === 103; },
    err: function () { return parseInt(this.api.GetLastError(), 10) || 0; },
    get: function (k) { var v = this.api.GetValue(k); return this.err() ? "" : v; },
    set: function (k, v) { return this.api.SetValue(k, String(v)) === "true"; },
    commit: function () { return this.api.Commit("") === "true" && this.err() === 0; },
    finish: function () { try { this.api.Terminate(""); } catch (e) { /* sin acción */ } },
    learner: function () { return this.get("cmi.learner_id") || "anon"; },
    learnerName: function () { return this.get("cmi.learner_name"); },
    readState: function () { return this.get("cmi.suspend_data"); },
    writeState: function (s) { return this.set("cmi.suspend_data", s); },
    location: function (v) { if (v === undefined) return this.get("cmi.location"); return this.set("cmi.location", v.slice(0, 1000)); },
    setCompletion: function (o) {
      if (o.progress !== undefined) this.set("cmi.progress_measure", Math.max(0, Math.min(1, o.progress)).toFixed(4));
      if (o.completed !== undefined) this.set("cmi.completion_status", o.completed ? "completed" : "incomplete");
      if (o.success) this.set("cmi.success_status", o.success);
      if (o.scaled !== undefined && o.scaled !== null) { this.set("cmi.score.scaled", o.scaled.toFixed(4)); }
      if (o.raw !== undefined && o.raw !== null) { this.set("cmi.score.raw", o.raw); this.set("cmi.score.min", 0); this.set("cmi.score.max", o.max || 100); }
      this.set("cmi.exit", o.completed && o.final ? "normal" : "suspend");
    },
    objectives: function () {
      var n = parseInt(this.get("cmi.objectives._count"), 10) || 0, out = {};
      for (var i = 0; i < n; i++) out[this.get("cmi.objectives." + i + ".id")] = this.get("cmi.objectives." + i + ".success_status");
      return out;
    },
    interaction: function (it) {
      var n = parseInt(this.get("cmi.interactions._count"), 10) || 0;
      var p = "cmi.interactions." + n + ".";
      this.set(p + "id", it.id.replace(/[^A-Za-z0-9_\-.:]/g, "_").slice(0, 250));
      this.set(p + "type", it.type || "other");
      this.set(p + "timestamp", new Date().toISOString().slice(0, 19));
      if (it.response !== undefined) this.set(p + "learner_response", String(it.response).slice(0, 4000));
      if (it.result) this.set(p + "result", it.result);
      if (it.description) this.set(p + "description", String(it.description).slice(0, 250));
    },
    navChoice: function (target) {
      var ok = this.get("adl.nav.request_valid.choice.{target=" + target + "}");
      if (ok === "false") return false;
      this.set("adl.nav.request", "{target=" + target + "}choice");
      return true;
    }
  };

  function Scorm12(api) { this.kind = "scorm12"; this.api = api; this.label = "SCORM 1.2"; }
  Scorm12.prototype = {
    init: function () { return this.api.LMSInitialize("") === "true" || this.err() === 101; },
    err: function () { return parseInt(this.api.LMSGetLastError(), 10) || 0; },
    get: function (k) { var v = this.api.LMSGetValue(k); return this.err() ? "" : v; },
    set: function (k, v) { return this.api.LMSSetValue(k, String(v)) === "true"; },
    commit: function () { return this.api.LMSCommit("") === "true" && this.err() === 0; },
    finish: function () { try { this.api.LMSFinish(""); } catch (e) { /* sin acción */ } },
    learner: function () { return this.get("cmi.core.student_id") || "anon"; },
    learnerName: function () { return this.get("cmi.core.student_name"); },
    readState: function () { return this.get("cmi.suspend_data"); },
    writeState: function (s) { return this.set("cmi.suspend_data", s); },
    location: function (v) { if (v === undefined) return this.get("cmi.core.lesson_location"); return this.set("cmi.core.lesson_location", v.slice(0, 255)); },
    setCompletion: function (o) {
      var st = o.success === "passed" ? "passed" : o.success === "failed" ? "failed" : (o.completed ? "completed" : "incomplete");
      this.set("cmi.core.lesson_status", st);
      if (o.raw !== undefined && o.raw !== null) { this.set("cmi.core.score.raw", Math.round(o.raw)); this.set("cmi.core.score.min", 0); this.set("cmi.core.score.max", o.max || 100); }
      this.set("cmi.core.exit", o.completed && o.final ? "" : "suspend");
    },
    objectives: function () { return null; },
    interaction: function () { /* SCORM 1.2: cmi.interactions es de solo escritura y opcional; no se usa para evitar errores en LMS. */ },
    navChoice: function () { return false; }
  };

  function Local() { this.kind = "local"; this.label = "Vista previa"; }
  Local.prototype = {
    init: function () { return true; },
    key: function (sco) { return "iatu5:" + CV + ":" + (this.learnerId || "vista") + ":" + sco; },
    readState: function () { try { return localStorage.getItem(this.key(store.sco)) || ""; } catch (e) { return ""; } },
    writeState: function (s) { try { localStorage.setItem(this.key(store.sco), s); return true; } catch (e) { return false; } },
    commit: function () { return true; },
    finish: function () {},
    learner: function () {
      try {
        var id = localStorage.getItem("iatu5:learner");
        if (!id) { id = "vista-" + Math.random().toString(36).slice(2, 8); localStorage.setItem("iatu5:learner", id); }
        return id;
      } catch (e) { return "vista"; }
    },
    learnerName: function () { return ""; },
    location: function (v) { try { if (v === undefined) return localStorage.getItem(this.key(store.sco) + ":loc") || ""; localStorage.setItem(this.key(store.sco) + ":loc", v); } catch (e) { return ""; } return true; },
    setCompletion: function (o) { try { localStorage.setItem(this.key(store.sco) + ":done", JSON.stringify(o)); } catch (e) { /* sin acción */ } },
    objectives: function () {
      var out = {};
      (store.scos || []).forEach(function (s) {
        try {
          var v = JSON.parse(localStorage.getItem(this.key(s) + ":done") || "null");
          out["obj-" + s] = v && v.completed ? "passed" : "unknown";
        } catch (e) { out["obj-" + s] = "unknown"; }
      }, this);
      return out;
    },
    interaction: function () {},
    navChoice: function () { return false; }
  };

  /* ---------- Servicio autorizado (corrección, evidencias extensas, requisito de examen) ---------- */
  var service = {
    url: function () { return (CFG.servicio && CFG.servicio.url) || ""; },
    configured: function () { return !!service.url(); },
    token: function () {
      if (CFG.servicio && typeof CFG.servicio.token === "function") return CFG.servicio.token(store.learner);
      return null;
    },
    call: function (method, path, body) {
      if (!service.configured()) return Promise.reject({ code: "sin_servicio", message: "No hay servicio de corrección configurado." });
      var headers = { "Content-Type": "application/json" };
      var t = service.token(); if (t) headers.Authorization = "Bearer " + t;
      return fetch(service.url() + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined, credentials: "include" })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            if (!r.ok) throw { code: j.error || ("http_" + r.status), message: j.message || ("Respuesta " + r.status), status: r.status, data: j };
            return j;
          });
        }, function () { throw { code: "red", message: "No se pudo contactar el servicio." }; });
    }
  };

  /* ---------- Estado ---------- */
  var store = {
    sco: null, scos: [], adapter: null, learner: null, state: null, status: "local", statusMsg: "",
    listeners: [], overflow: false,

    init: function (sco, scos) {
      store.sco = sco; store.scos = scos || [];
      var api = discover("API_1484_11"), adapter;
      if (api) adapter = new Scorm2004(api);
      else if ((api = discover("API"))) adapter = new Scorm12(api);
      else adapter = new Local();
      if (!adapter.init()) { adapter = new Local(); store.setStatus("error", "El LMS no aceptó la inicialización; usando almacenamiento local de emergencia."); }
      store.adapter = adapter;
      store.learner = adapter.learner();
      if (adapter.kind === "local") adapter.learnerId = store.learner;
      store.load(sco);
      store.setStatus(adapter.kind === "local" ? "local" : "lms",
        adapter.kind === "local" ? "Vista previa: guardado solo en este navegador (no es el LMS)" : "Conectado a " + adapter.label);
      window.addEventListener("pagehide", store.finish);
      window.addEventListener("beforeunload", store.finish);
      return store.state;
    },

    /* Carga el estado de un SCO. En la vista previa (un solo documento con todos los SCO) se usa al cambiar de módulo. */
    load: function (sco) {
      store.sco = sco;
      var raw = store.adapter.readState(), st = null;
      if (raw) {
        try { st = JSON.parse(raw.slice(0, 3) === "z1:" ? u.decompressB64(raw.slice(3)) : raw); } catch (e) { st = null; }
      }
      // Respaldo local cuando el LMS no tenía capacidad para el texto completo (estado "lite").
      var backup = null;
      try { backup = JSON.parse(localStorage.getItem("iatu5:respaldo:" + store.learner + ":" + sco) || "null"); } catch (e) { backup = null; }
      if (st && st.lite && backup && (backup.t || 0) >= (st.t || 0)) st = backup;
      store.state = st && st.cv ? st : { cv: CV, sco: sco, t: 0, s: {}, n: {}, p: {}, a: {}, fc: {}, hs: {}, w: {}, c: {}, d: {}, o: {}, x: {} };
      return store.state;
    },
    /* Solo vista previa: lee el estado guardado de otro SCO sin activarlo. */
    peek: function (sco) {
      if (!store.adapter || store.adapter.kind !== "local") return null;
      if (sco === store.sco) return store.state;
      try {
        var raw = localStorage.getItem(store.adapter.key(sco)) || "";
        return raw ? JSON.parse(raw.slice(0, 3) === "z1:" ? u.decompressB64(raw.slice(3)) : raw) : null;
      } catch (e) { return null; }
    },
    on: function (fn) { store.listeners.push(fn); },
    setStatus: function (s, msg) {
      store.status = s; store.statusMsg = msg || "";
      store.listeners.forEach(function (fn) { try { fn(s, msg); } catch (e) { /* sin acción */ } });
    },

    /* scope: s|n|p|a|fc|hs|w|c|d|o|x ; id ; patch (objeto que se fusiona) */
    get: function (scope, id) { var b = store.state[scope] || (store.state[scope] = {}); return id === undefined ? b : (b[id] || null); },
    put: function (scope, id, patch, opts) {
      var b = store.state[scope] || (store.state[scope] = {});
      var cur = b[id] || {};
      for (var k in patch) cur[k] = patch[k];
      cur.u = Date.now();
      b[id] = cur;
      store.state.t = Date.now();
      if (opts && opts.now) return store.save(true);
      store.saveSoon();
      return Promise.resolve(true);
    },

    saveSoon: u.debounce(function () { store.save(false); }, 1200),

    serialize: function (lite) {
      var st = store.state;
      if (lite) {
        // Solo avances (sin textos): permite reanudar el progreso en LMS con poca capacidad.
        var l = { cv: st.cv, sco: st.sco, t: st.t, lite: 1, s: st.s, o: st.o, d: {}, p: {}, a: {}, w: {}, c: {} };
        ["p", "a", "w", "c", "d"].forEach(function (sc) {
          var src = st[sc] || {};
          for (var id in src) {
            var r = src[id], keep = {};
            ["sub", "fbr", "done", "att", "ans", "pr"].forEach(function (k) { if (r[k] !== undefined) keep[k] = r[k]; });
            l[sc][id] = keep;
          }
        });
        return "z1:" + u.compressB64(JSON.stringify(l));
      }
      return "z1:" + u.compressB64(JSON.stringify(st));
    },

    save: function (formal) {
      var a = store.adapter, limit = LIMITS[a.kind] || Infinity;
      var full = store.serialize(false), payload = full, lite = false;
      if (full.length > limit) { payload = store.serialize(true); lite = true; }
      if (a.kind !== "local") store.setStatus("saving", "Guardando en el LMS…");
      var ok = a.writeState(payload) && a.commit();
      try { localStorage.setItem("iatu5:respaldo:" + store.learner + ":" + store.sco, JSON.stringify(store.state)); } catch (e) { /* sin acción */ }
      if (a.kind === "local") {
        store.setStatus(ok ? "local" : "error", ok ? "Vista previa: guardado solo en este navegador (no es el LMS)" : "No se pudo guardar en este navegador");
        return Promise.resolve(ok);
      }
      if (!ok) { store.setStatus("error", "El LMS no confirmó el guardado. Tus respuestas siguen en pantalla; reintenta."); return Promise.resolve(false); }
      if (lite) {
        store.overflow = true;
        if (service.configured()) {
          return service.call("PUT", "/api/v1/estado/" + encodeURIComponent(store.sco), { cv: CV, state: store.state })
            .then(function () { store.setStatus("lms", "Guardado: avance en el LMS y textos en el servicio"); return true; },
              function () { store.setStatus("error", "El LMS guardó tu avance, pero tus textos largos quedaron solo en este navegador (límite de " + a.label + ")."); return false; });
        }
        store.setStatus("error", "El LMS guardó tu avance, pero tus textos largos quedaron solo en este navegador (límite de " + a.label + ").");
        return Promise.resolve(false);
      }
      store.setStatus("lms", "Guardado en el LMS");
      return Promise.resolve(true);
    },

    location: function (v) { try { return store.adapter.location(v); } catch (e) { return ""; } },
    setCompletion: function (o) { store.adapter.setCompletion(o); return store.save(true); },
    objectives: function () { return store.adapter.objectives(); },
    interaction: function (it) { try { store.adapter.interaction(it); } catch (e) { /* sin acción */ } },
    navChoice: function (t) { try { return store.adapter.navChoice(t); } catch (e) { return false; } },
    finished: false,
    finish: function () {
      if (store.finished || !store.adapter) return;
      store.finished = true;
      try { store.save(true); } catch (e) { /* sin acción */ }
      store.adapter.finish();
    },
    isLMS: function () { return store.adapter && store.adapter.kind !== "local"; }
  };

  IATU.store = store;
  IATU.service = service;
  IATU.CV = CV;
})();
