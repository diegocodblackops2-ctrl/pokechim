/* Seguridad 360 — estado, persistencia (SCORM 2004 / SCORM 1.2 / vista previa local) y cliente del servicio.
   Regla: solo se muestra "Guardado en el LMS" cuando el LMS confirma Commit sin error.
   El almacenamiento local de la vista previa se rotula como tal; nunca se presenta como LMS. */
(function () {
  "use strict";
  var S = window.S360 = window.S360 || {};
  var u = S.u;
  var CFG = window.S360_CONFIG || {};
  var CV = "1.0.0";
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
      // Siempre «suspend»: conserva el registro para volver a la devolución y la biblioteca; con «normal» varios LMS
      // abren un intento nuevo y vacío. completion/success/score quedan registrados igual.
      this.set("cmi.exit", "suspend");
    },
    sessionTime: function (sec) {
      var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), x = Math.floor(sec % 60);
      this.set("cmi.session_time", "PT" + h + "H" + m + "M" + x + "S");
    },
    /* Un objetivo por sección (orientación, módulos y evaluación) para que el LMS muestre el detalle. */
    section: function (id, done, pct, ext) {
      var n = parseInt(this.get("cmi.objectives._count"), 10) || 0, i = 0;
      for (; i < n; i++) if (this.get("cmi.objectives." + i + ".id") === id) break;
      var p = "cmi.objectives." + i + ".";
      if (i === n) this.set(p + "id", id);
      this.set(p + "completion_status", done ? "completed" : "incomplete");
      this.set(p + "success_status", ext && ext.success ? ext.success : done ? "passed" : "unknown");
      if (pct !== undefined) this.set(p + "progress_measure", Math.max(0, Math.min(1, pct)).toFixed(4));
      if (ext && ext.scaled !== undefined && ext.scaled !== null) this.set(p + "score.scaled", Math.max(0, Math.min(1, ext.scaled)).toFixed(4));
      if (ext && ext.description) this.set(p + "description", String(ext.description).slice(0, 250));
    },
    /* Entrega del proyecto: texto legible para el profesor en cmi.comments_from_learner (4.000 caracteres por comentario). */
    learnerComment: function (text, loc) {
      var n = parseInt(this.get("cmi.comments_from_learner._count"), 10) || 0, p = "cmi.comments_from_learner." + n + ".";
      var ok = this.set(p + "comment", String(text).slice(0, 4000));
      this.set(p + "location", String(loc || "").slice(0, 250));
      this.set(p + "timestamp", new Date().toISOString().slice(0, 19));
      return ok;
    },
    /* Evaluación del profesor que el LMS deja en cmi.comments_from_lms (ver docs/INTEGRACION_PROYECTO_LMS.md). */
    lmsComments: function () {
      var n = parseInt(this.get("cmi.comments_from_lms._count"), 10) || 0, out = [];
      for (var i = 0; i < n; i++) out.push({ comment: this.get("cmi.comments_from_lms." + i + ".comment"), location: this.get("cmi.comments_from_lms." + i + ".location"), timestamp: this.get("cmi.comments_from_lms." + i + ".timestamp") });
      return out;
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
      this.set("cmi.core.exit", "suspend");
    },
    sessionTime: function (sec) {
      var h = Math.min(9999, Math.floor(sec / 3600)), m = Math.floor(sec % 3600 / 60), x = Math.floor(sec % 60);
      this.set("cmi.core.session_time", ("000" + h).slice(-4) + ":" + ("0" + m).slice(-2) + ":" + ("0" + x).slice(-2));
    },
    section: function () { /* SCORM 1.2: los objetivos no aportan; el avance va en suspend_data */ },
    learnerComment: function (text) { var prev = this.get("cmi.comments") || ""; return this.set("cmi.comments", (prev ? prev + "\n\n" : "") + String(text).slice(0, Math.max(0, 4000 - prev.length))); },
    lmsComments: function () { var c = this.get("cmi.comments_from_lms"); return c ? [{ comment: c, location: "", timestamp: "" }] : []; },
    objectives: function () { return null; },
    interaction: function () { /* SCORM 1.2: cmi.interactions es de solo escritura y opcional; no se usa para evitar errores en LMS. */ },
    navChoice: function () { return false; }
  };

  function Local() { this.kind = "local"; this.label = "Vista previa"; }
  Local.prototype = {
    init: function () { return true; },
    key: function () { return "s360:" + CV + ":" + (this.learnerId || "vista") + ":curso"; },
    readState: function () { try { return localStorage.getItem(this.key()) || ""; } catch (e) { return ""; } },
    writeState: function (s) { try { localStorage.setItem(this.key(), s); return true; } catch (e) { return false; } },
    commit: function () { return true; },
    finish: function () {},
    learner: function () {
      try {
        var id = localStorage.getItem("s360:learner");
        if (!id) { id = "vista-" + Math.random().toString(36).slice(2, 8); localStorage.setItem("s360:learner", id); }
        return id;
      } catch (e) { return "vista"; }
    },
    learnerName: function () { return ""; },
    location: function (v) { try { if (v === undefined) return localStorage.getItem(this.key() + ":loc") || ""; localStorage.setItem(this.key() + ":loc", v); } catch (e) { return ""; } return true; },
    setCompletion: function (o) { try { localStorage.setItem(this.key() + ":lms", JSON.stringify(o)); } catch (e) { /* sin acción */ } },
    sessionTime: function () {},
    section: function () {},
    learnerComment: function (text, loc) { try { var k = this.key() + ":comments", a = JSON.parse(localStorage.getItem(k) || "[]"); a.push({ comment: text, location: loc, timestamp: new Date().toISOString() }); localStorage.setItem(k, JSON.stringify(a)); } catch (e) { /* sin acción */ } return true; },
    lmsComments: function () { try { return JSON.parse(localStorage.getItem(this.key() + ":lmsComments") || "[]"); } catch (e) { return []; } },
    objectives: function () { return {}; },
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
    sco: null, scos: [], adapter: null, learner: null, state: null, root: null, status: "local", statusMsg: "",
    listeners: [], overflow: false,

    init: function (sco, scos) {
      store.sco = sco; store.scos = scos || [];
      var api = discover("API_1484_11"), adapter;
      if (api) adapter = new Scorm2004(api);
      else if ((api = discover("API"))) adapter = new Scorm12(api);
      else adapter = new Local();
      if (!adapter.init()) { adapter = new Local(); store.setStatus("error", "No pudimos conectar con el LMS. Por ahora tu avance se guarda en este navegador."); }
      store.adapter = adapter;
      store.learner = adapter.learner();
      if (adapter.kind === "local") adapter.learnerId = store.learner;
      store.load(sco);
      store.setStatus(adapter.kind === "local" ? "local" : "lms",
        adapter.kind === "local" ? "Guardado en este navegador" : "Conectado a " + adapter.label);
      window.addEventListener("pagehide", store.finish);
      window.addEventListener("beforeunload", store.finish);
      return store.state;
    },

    /* Todo el paquete vive en un registro (root) con una sección por ruta (ori, SST, CIBER, EPP).
       root = { cv, t, time (segundos activos), secs: { ori|SST|CIBER|EPP: estado } } */
    readRoot: function () {
      var raw = store.adapter.readState(), rt = null;
      if (raw) { try { rt = JSON.parse(raw.slice(0, 3) === "z1:" ? u.decompressB64(raw.slice(3)) : raw); } catch (e) { rt = null; } }
      // Respaldo local cuando el LMS no tenía capacidad para el texto completo (estado "lite").
      var backup = null;
      try { backup = JSON.parse(localStorage.getItem("s360:respaldo:" + store.learner) || "null"); } catch (e) { backup = null; }
      if (rt && rt.lite && backup && backup.secs && (backup.t || 0) >= (rt.t || 0)) rt = backup;
      if (rt && rt.sco && !rt.secs) { var old = rt; rt = { cv: CV, t: old.t || 0, time: 0, secs: {} }; rt.secs[old.sco] = old; } // formato antiguo por SCO
      if (!rt || !rt.secs) rt = { cv: CV, t: 0, time: 0, secs: {} };
      rt.time = rt.time || 0;
      store.root = rt;
    },
    fresh: function (sco) { return { cv: CV, sco: sco, t: 0, v: {}, r: {}, n: {}, c: {}, x: {}, o: {} }; },
    /* Activa la sección del programa en uso (no hay recarga: todas las secciones están en el mismo registro). */
    load: function (sco) {
      if (!store.root) store.readRoot();
      store.sco = sco;
      store.state = store.root.secs[sco] || (store.root.secs[sco] = store.fresh(sco));
      return store.state;
    },
    /* Lee el estado de otra sección sin activarla. */
    peek: function (sco) { return store.root && store.root.secs[sco] || null; },
    /* Tiempo activo acumulado (segundos), visible para la persona y enviado al LMS como session_time. */
    sessionStart: Date.now(), sessionSec: 0,
    addTime: function (sec) {
      if (!store.root) return;
      store.root.time = (store.root.time || 0) + sec;
      store.sessionSec += sec;
      try { store.adapter.sessionTime(store.sessionSec); } catch (e) { /* sin acción */ }
    },
    totalTime: function () { return store.root ? store.root.time || 0 : 0; },
    section: function (id, done, pct, ext) { try { store.adapter.section(id, done, pct, ext); } catch (e) { /* sin acción */ } },
    on: function (fn) { store.listeners.push(fn); },
    setStatus: function (s, msg) {
      store.status = s; store.statusMsg = msg || "";
      store.listeners.forEach(function (fn) { try { fn(s, msg); } catch (e) { /* sin acción */ } });
    },

    /* scope: v (visto) | r (resultado de actividad) | n (notas) | c (casos) | x (evaluación) | o (otros) ; id ; patch */
    /* Pantalla vista: se guarda compacto (sin marca de tiempo) para que quepa en SCORM 1.2. */
    visit: function (id) {
      var k = store.short(id), v = store.state.v || (store.state.v = {});
      if (v[k]) return false;
      v[k] = 1; store.state.t = store.root.t = Date.now(); store.saveSoon(); return true;
    },
    seen: function (id, st) { var v = (st || store.state).v || {}; return !!v[store.short(id)]; },
    short: function (id) { return String(id).replace(/^SEG360-(SST|CIBER|EPP)-/, ""); },
    get: function (scope, id) { var b = store.state[scope] || (store.state[scope] = {}); return id === undefined ? b : (b[id] || null); },
    put: function (scope, id, patch, opts) {
      var b = store.state[scope] || (store.state[scope] = {});
      var cur = b[id] || {};
      for (var k in patch) cur[k] = patch[k];
      cur.u = Date.now();
      b[id] = cur;
      store.state.t = store.root.t = Date.now();
      if (opts && opts.now) return store.save(true);
      store.saveSoon();
      return Promise.resolve(true);
    },

    saveSoon: u.debounce(function () { store.save(false); }, 1200),

    serialize: function (lite) {
      var rt = store.root;
      if (lite) {
        // Solo avances (sin textos largos): permite reanudar el progreso en LMS con poca capacidad.
        var L = { cv: rt.cv, t: rt.t, time: rt.time, lite: 1, secs: {} };
        for (var sc0 in rt.secs) {
          var st = rt.secs[sc0], l = { cv: st.cv, sco: st.sco, t: st.t, v: st.v, r: {}, c: {}, x: {}, o: st.o || {} };
          for (var id in (st.r || {})) { var r = st.r[id], k2 = {}; ["ok", "done", "n", "sc", "env"].forEach(function (k) { if (r[k] !== undefined) k2[k] = r[k]; }); l.r[id] = k2; }
          for (var cid in (st.c || {})) { var c = st.c[cid]; l.c[cid] = { fin: c.fin, tipo: c.tipo, n: c.n }; }
          for (var xid in (st.x || {})) {
            var xv = st.x[xid];
            if (Array.isArray(xv)) l.x[xid] = xv.map(function (a) { var b = {}; for (var q in a) if (q !== "ans" && q !== "items" && q !== "texto") b[q] = a[q]; return b; });
            else l.x[xid] = xv;
          }
          L.secs[sc0] = l;
        }
        return "z1:" + u.compressB64(JSON.stringify(L));
      }
      return "z1:" + u.compressB64(JSON.stringify(rt));
    },

    save: function (formal) {
      var a = store.adapter, limit = LIMITS[a.kind] || Infinity;
      var full = store.serialize(false), payload = full, lite = false;
      if (full.length > limit) { payload = store.serialize(true); lite = true; }
      if (a.kind !== "local") store.setStatus("saving", "Guardando en el LMS…");
      var ok = a.writeState(payload) && a.commit();
      try { localStorage.setItem("s360:respaldo:" + store.learner, JSON.stringify(store.root)); } catch (e) { /* sin acción */ }
      if (a.kind === "local") {
        store.setStatus(ok ? "local" : "error", ok ? "Guardado en este navegador" : "No se pudo guardar en este navegador");
        return Promise.resolve(ok);
      }
      if (!ok) { store.setStatus("error", "El LMS no confirmó el guardado. Tus respuestas siguen en pantalla: vuelve a intentarlo."); return Promise.resolve(false); }
      if (lite) {
        store.overflow = true;
        if (service.configured()) {
          return service.call("PUT", "/api/v1/estado/curso", { cv: CV, state: store.root })
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
    learnerComment: function (t, loc) { try { return store.adapter.learnerComment(t, loc); } catch (e) { return false; } },
    lmsComments: function () { try { return store.adapter.lmsComments() || []; } catch (e) { return []; } },
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

  S.store = store;
  S.service = service;
  S.CV = CV;
})();
