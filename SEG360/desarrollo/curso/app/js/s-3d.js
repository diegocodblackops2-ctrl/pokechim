/* Seguridad 360 · visor 3D: escenas recorribles con puntos de interés (explorar o detectar) y modelos de EPP
   que se giran, se acercan y se separan en partes. Three.js se carga solo al entrar a una pantalla 3D.
   Siempre hay una alternativa en lista, operable con teclado y lector de pantalla. */
(function () {
  "use strict";
  var S = window.S360, u = S.u, h = u.h, media = S.media;
  var T = S.tipos = S.tipos || {};
  var CFG = window.S360_CONFIG || {};
  var KIT = null, S3 = null, loading = null;

  function cargar() {
    if (KIT) return Promise.resolve(KIT);
    if (!loading) loading = u.loadScript((CFG.base || "") + "app/vendor/three-s360.min.js").then(function () { S3 = window.S3; KIT = S.d3kit.init(S3); return KIT; });
    return loading;
  }
  function webgl() {
    try { var c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch (e) { return false; }
  }

  /* ---------- Visor genérico ---------- */
  function Visor(cont, opts) {
    var THREE = S3.THREE, self = this;
    this.opts = opts; this.cont = cont;
    var r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: !!opts.transparente, powerPreference: "high-performance" });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.5 : 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = opts.exposicion || 1.0;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.VSMShadowMap;
    cont.appendChild(r.domElement);
    r.domElement.setAttribute("aria-hidden", "true");
    var scene = this.scene = new THREE.Scene();
    if (!opts.transparente) scene.background = new THREE.Color(opts.fondo || "#dfe5e3");
    var pm = new THREE.PMREMGenerator(r);
    scene.environment = pm.fromScene(new S3.RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = opts.env || 0.55;
    var cam = this.camera = new THREE.PerspectiveCamera(opts.fov || 50, 1, 0.02, 200);
    var ctl = this.controls = new S3.OrbitControls(cam, r.domElement);
    ctl.enableDamping = true; ctl.dampingFactor = 0.08; ctl.rotateSpeed = 0.6; ctl.zoomSpeed = 0.8;
    ctl.addEventListener("change", function () { self.dirty = true; if (opts.onMove) opts.onMove(); });
    ctl.addEventListener("start", function () { self.cont.classList.add("usado"); self.stopTween(); });
    this.dirty = true; this.alive = true; this.visible = true;
    this.anim = [];
    var ro = this.ro = new ResizeObserver(function () { self.resize(); });
    ro.observe(cont);
    if ("IntersectionObserver" in window) {
      this.io = new IntersectionObserver(function (en) { self.visible = en[0].isIntersecting; if (self.visible) self.dirty = true; });
      this.io.observe(cont);
    }
    this.resize();
    var loop = function () {
      if (!self.alive) return;
      self.raf = requestAnimationFrame(loop);
      if (!self.visible || document.hidden) return;
      ctl.update();
      if (self.tween) self.stepTween();
      if (self.anim.length) { self.anim.forEach(function (f) { f(); }); self.dirty = true; }
      if (opts.autoGiro && !self.cont.classList.contains("usado")) { ctl.autoRotate = true; ctl.autoRotateSpeed = 1.2; self.dirty = true; } else ctl.autoRotate = false;
      if (self.dirty) { self.dirty = false; r.render(scene, cam); if (self.onRender) self.onRender(); }
    };
    loop();
  }
  Visor.prototype.resize = function () {
    var w = this.cont.clientWidth || 600, hh = this.cont.clientHeight || 400;
    this.renderer.setSize(w, hh, false);
    this.renderer.domElement.style.width = "100%"; this.renderer.domElement.style.height = "100%";
    this.camera.aspect = w / hh; this.camera.updateProjectionMatrix(); this.dirty = true;
  };
  Visor.prototype.mirar = function (pos, target, instant) {
    var THREE = S3.THREE;
    var p1 = new THREE.Vector3().fromArray(pos), t1 = new THREE.Vector3().fromArray(target);
    if (instant || u.reducedMotion()) { this.camera.position.copy(p1); this.controls.target.copy(t1); this.controls.update(); this.dirty = true; return; }
    this.tween = { p0: this.camera.position.clone(), t0: this.controls.target.clone(), p1: p1, t1: t1, t: 0 };
  };
  Visor.prototype.stepTween = function () {
    var tw = this.tween; tw.t = Math.min(1, tw.t + 0.025);
    var e = tw.t < 0.5 ? 2 * tw.t * tw.t : 1 - Math.pow(-2 * tw.t + 2, 2) / 2;
    this.camera.position.lerpVectors(tw.p0, tw.p1, e); this.controls.target.lerpVectors(tw.t0, tw.t1, e);
    this.dirty = true;
    if (tw.t >= 1) this.tween = null;
  };
  Visor.prototype.stopTween = function () { this.tween = null; };
  Visor.prototype.proyectar = function (v3) {
    var THREE = S3.THREE, v = new THREE.Vector3().fromArray(v3).project(this.camera);
    var w = this.cont.clientWidth, hh = this.cont.clientHeight;
    return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * hh, visible: v.z < 1 && v.x > -1.1 && v.x < 1.1 && v.y > -1.1 && v.y < 1.1 };
  };
  Visor.prototype.pick = function (ev, objetos) {
    var THREE = S3.THREE, rect = this.renderer.domElement.getBoundingClientRect();
    var m = new THREE.Vector2(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
    var rc = new THREE.Raycaster(); rc.setFromCamera(m, this.camera);
    var hits = rc.intersectObjects(objetos || this.scene.children, true);
    return hits.length ? hits[0] : null;
  };
  Visor.prototype.destruir = function () {
    this.alive = false; cancelAnimationFrame(this.raf);
    try { this.ro.disconnect(); if (this.io) this.io.disconnect(); } catch (e) { /* sin acción */ }
    this.controls.dispose();
    this.scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
    if (this.scene.environment) this.scene.environment.dispose();
    this.renderer.dispose();
    try { this.renderer.forceContextLoss(); } catch (e) { /* sin acción */ }
    if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
  };

  function luces(scene, interior, size) {
    var THREE = S3.THREE;
    scene.add(new THREE.HemisphereLight("#ffffff", "#8a8f86", interior ? 0.9 : 0.75));
    var sol = new THREE.DirectionalLight("#fff4e2", interior ? 1.3 : 1.8);
    var s = Math.max(size[0], size[2]);
    sol.position.set(s * 0.35, s * 0.8, s * 0.45);
    sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
    var sc = sol.shadow.camera; sc.left = -s * 0.6; sc.right = s * 0.6; sc.top = s * 0.6; sc.bottom = -s * 0.6; sc.near = 0.5; sc.far = s * 3;
    sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.02; sol.shadow.radius = 4;
    scene.add(sol);
    var rel = new THREE.DirectionalLight("#cfe6ff", 0.35); rel.position.set(-s * 0.4, s * 0.5, -s * 0.3); scene.add(rel);
  }

  /* ---------- Contenedor común con barra de herramientas, carga y ayuda ---------- */
  function lienzo(alto) {
    var c = h("div", { class: "v3d-lienzo", style: { "--alto": alto || "" } });
    var carga = h("div", { class: "v3d-carga" }, S.ilus("rotate-3d"), h("p", null, "Preparando la escena…"));
    c.appendChild(carga);
    var ayuda = h("div", { class: "v3d-ayuda", "aria-hidden": "true" }, h("span", { class: "v3d-mano" }, u.icon("hand")), h("span", null, "Arrastra para mirar · rueda o pellizco para acercar"));
    c.appendChild(ayuda);
    return c;
  }
  function pantallaCompleta(el) {
    return h("button", { type: "button", class: "v3d-btn", "aria-label": "Pantalla completa", title: "Pantalla completa", onclick: function () {
      var full = document.fullscreenElement;
      if (full) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(function () { el.classList.toggle("v3d-max"); }); else el.classList.toggle("v3d-max");
    } }, u.icon("maximize"));
  }

  /* =================== ESCENA 3D =================== */
  T.escena3d = function (scr, ctx) {
    var detectar = scr.modo === "detectar";
    var w = h("div", { class: "v3d v3d-escena" + (detectar ? " v3d-detectar" : "") });
    if (scr.consigna || scr.texto) w.appendChild(u.prose(scr.consigna || scr.texto, "prose consigna"));
    var cuerpo = h("div", { class: "v3d-cuerpo" });
    var lz = lienzo();
    var capa = h("div", { class: "hs-capa" });
    lz.appendChild(capa);
    var barra = h("div", { class: "v3d-barra" });
    lz.appendChild(barra);
    var panel = h("aside", { class: "v3d-panel", "aria-live": "polite" });
    cuerpo.appendChild(lz); cuerpo.appendChild(panel);
    w.appendChild(cuerpo);
    var puntos = (scr.puntos || []).map(function (p, i) { return Object.assign({ _i: i }, p); });
    var r0 = ctx.result() || {};
    var ev = Object.assign({}, r0.ev || {}), vistos = Object.assign({}, r0.vistos || {}), hallados = Object.assign({}, r0.hallados || {});
    var pistas = !!r0.pistas || !detectar;
    var sel = null, visor = null, data = null, markers = [];

    /* Alternativa accesible: lista de puntos con la misma interacción. */
    var alt = h("details", { class: "alt-lista" }, h("summary", null, u.icon("list"), detectar ? "Revisar los puntos en una lista (sin 3D)" : "Ver los puntos en una lista (sin 3D)"));
    var altUl = h("ol");
    alt.appendChild(altUl);
    w.appendChild(alt);
    function pintarAlt() {
      u.clear(altUl);
      puntos.forEach(function (p) {
        var est = ev[p._i];
        altUl.appendChild(h("li", null, h("button", { type: "button", class: "alt-it" + (est ? " hecho" : vistos[p._i] ? " visto" : ""), onclick: function () { elegir(p._i, true); panel.scrollIntoView({ block: "nearest" }); } },
          h("span", { class: "alt-n" }, String(p._i + 1)), h("span", null, detectar && !est ? descripcionNeutra(p) : p.titulo), est ? u.icon(est.ok ? "check" : "x") : null)));
      });
    }
    function descripcionNeutra(p) { return p.descripcion || p.titulo; }

    function resumen() {
      var n = puntos.length;
      if (!detectar) { var vv = Object.keys(vistos).length; return vv + " de " + n + " puntos revisados"; }
      var e = Object.keys(ev).length, h2 = Object.keys(hallados).length;
      return (pistas ? "" : h2 + " de " + n + " encontrados · ") + e + " de " + n + " evaluados";
    }
    var estadoEl = h("p", { class: "v3d-estado" });
    function actualizarEstado() {
      estadoEl.textContent = resumen();
      var n = puntos.length;
      if (detectar) {
        var e = Object.keys(ev).length;
        if (e === n) {
          var ok = puntos.filter(function (p) { return ev[p._i] && ev[p._i].ok; }).length;
          ctx.save({ ev: ev, hallados: hallados, pistas: pistas, done: true, sc: ok / n });
        }
      } else if (Object.keys(vistos).length === n) ctx.save({ vistos: vistos, done: true });
    }
    function panelInicio() {
      u.clear(panel);
      panel.appendChild(h("p", { class: "kicker" }, u.icon(detectar ? "scan-search" : "compass"), detectar ? "Modo inspección" : "Modo exploración"));
      panel.appendChild(h("p", { class: "v3d-intro" }, detectar ? (pistas ? "Abre cada señal y decide si es un riesgo y qué tan prioritario es." : "Hay " + puntos.length + " cosas que vale la pena revisar en esta escena. Recorre y haz clic sobre lo que te llame la atención.") : "Toca las señales para ver qué hay en cada punto."));
      panel.appendChild(estadoEl);
      if (detectar && !pistas) panel.appendChild(h("button", { type: "button", class: "btn btn-sec", onclick: function () { pistas = true; ctx.save({ pistas: true }); pintarMarcadores(); panelInicio(); media.sfx("pista"); } }, u.icon("lightbulb"), "Mostrar pistas"));
      if (detectar && Object.keys(ev).length === puntos.length) panel.appendChild(cierreDetectar());
      actualizarEstado();
    }
    function cierreDetectar() {
      var ok = puntos.filter(function (p) { return ev[p._i] && ev[p._i].ok; }).length;
      var riesgosNoVistos = puntos.filter(function (p) { return p.es_riesgo && ev[p._i] && !ev[p._i].riesgo; }).length;
      return S.fb(ok === puntos.length ? "ok" : riesgosNoVistos ? "mal" : "parcial",
        (riesgosNoVistos ? "Pasaste por alto " + riesgosNoVistos + (riesgosNoVistos === 1 ? " riesgo" : " riesgos") + " que estaban a la vista. " : "") + "Abre de nuevo cualquier punto para releer el feedback. " + (scr.cierre || ""),
        ok + " de " + puntos.length + " bien evaluados");
    }
    var PRI = [["alta", "Alta"], ["media", "Media"], ["baja", "Baja"]];
    function elegir(i, desdeLista) {
      var p = puntos[i];
      sel = i;
      if (!detectar) vistos[i] = 1;
      if (detectar) hallados[i] = 1;
      markers.forEach(function (m) { m.el.classList.toggle("activo", m.i === i); });
      if (visor && data && data.anchors[p.objeto] && !desdeLista) enfocar(p);
      if (visor && data && data.anchors[p.objeto] && desdeLista) enfocar(p);
      media.sfx("hotspot");
      u.clear(panel);
      panel.appendChild(h("button", { type: "button", class: "v3d-volver", onclick: function () { sel = null; markers.forEach(function (m) { m.el.classList.remove("activo"); }); panelInicio(); } }, u.icon("arrow-left"), "Volver"));
      panel.appendChild(h("p", { class: "kicker" }, "Punto " + (i + 1) + " de " + puntos.length));
      if (!detectar) {
        panel.appendChild(h("h2", null, p.titulo));
        panel.appendChild(u.prose(p.texto, "prose"));
        if (p.accion) panel.appendChild(h("div", { class: "v3d-accion" }, h("b", null, u.icon(p.es_riesgo ? "shield-alert" : "check"), p.es_riesgo ? "Qué corresponde" : "Por qué está bien"), u.prose(p.accion, "prose")));
        ctx.save({ vistos: vistos });
        actualizarEstado();
        panel.appendChild(estadoEl);
        siguienteBtn(i);
        pintarMarcadores();
        return;
      }
      var e = ev[i];
      panel.appendChild(h("h2", null, e ? p.titulo : descripcionNeutra(p)));
      if (!e) {
        var tmp = { riesgo: null, prioridad: null };
        var q1 = h("div", { class: "v3d-q" }, h("p", null, h("b", null, "¿Es un riesgo que hay que atender?")));
        var bSi = h("button", { type: "button", class: "btn-sel" }, u.icon("triangle-alert"), "Sí, es un riesgo");
        var bNo = h("button", { type: "button", class: "btn-sel" }, u.icon("check"), "Está bien así");
        var q2 = h("div", { class: "v3d-q", hidden: true }, h("p", null, h("b", null, "¿Qué prioridad le das?")));
        var seg = h("div", { class: "seg" });
        PRI.forEach(function (pr) { seg.appendChild(h("button", { type: "button", class: "", onclick: function () { tmp.prioridad = pr[0]; u.$$("button", seg).forEach(function (b) { b.classList.toggle("on", b.textContent === pr[1]); }); conf.disabled = false; } }, pr[1])); });
        q2.appendChild(seg);
        var conf = h("button", { type: "button", class: "btn btn-pri", disabled: true, onclick: function () { evaluar(i, tmp); } }, u.icon("check"), "Confirmar");
        bSi.addEventListener("click", function () { tmp.riesgo = true; bSi.classList.add("on"); bNo.classList.remove("on"); q2.hidden = false; conf.disabled = !tmp.prioridad; });
        bNo.addEventListener("click", function () { tmp.riesgo = false; tmp.prioridad = null; bNo.classList.add("on"); bSi.classList.remove("on"); q2.hidden = true; conf.disabled = false; });
        q1.appendChild(h("div", { class: "fila-sel" }, bSi, bNo));
        panel.appendChild(q1); panel.appendChild(q2); panel.appendChild(h("div", { class: "fila-acc" }, conf));
      } else {
        mostrarEval(i);
      }
      pintarMarcadores(); pintarAlt();
    }
    function evaluar(i, tmp) {
      var p = puntos[i], okRiesgo = tmp.riesgo === !!p.es_riesgo;
      var okPri = !p.es_riesgo || !p.prioridad || !tmp.prioridad || Math.abs(PRI.map(function (x) { return x[0]; }).indexOf(tmp.prioridad) - PRI.map(function (x) { return x[0]; }).indexOf(p.prioridad)) <= 1;
      ev[i] = { riesgo: tmp.riesgo, prioridad: tmp.prioridad, ok: okRiesgo && okPri };
      media.sfx(ev[i].ok ? "bien" : "mal");
      ctx.save({ ev: ev, hallados: hallados, pistas: pistas });
      actualizarEstado();
      elegir(i, true);
    }
    function mostrarEval(i) {
      var p = puntos[i], e = ev[i];
      var titulo = e.riesgo === !!p.es_riesgo ? (p.es_riesgo ? (e.ok ? "Bien visto: es un riesgo" : "Es un riesgo, pero revisa la prioridad") : "Bien: esto está en orden") : (p.es_riesgo ? "Aquí había un riesgo" : "Esto no era un riesgo");
      panel.appendChild(S.fb(e.ok ? "ok" : "mal", p.texto, titulo));
      if (p.es_riesgo && p.prioridad) panel.appendChild(h("p", { class: "v3d-pri" }, "Prioridad sugerida: ", h("b", { class: "pri-" + p.prioridad }, p.prioridad), e.prioridad ? " · tu respuesta: " + e.prioridad : ""));
      if (p.accion) panel.appendChild(h("div", { class: "v3d-accion" }, h("b", null, u.icon(p.es_riesgo ? "shield-alert" : "check"), p.es_riesgo ? "Qué corresponde" : "Por qué está bien"), u.prose(p.accion, "prose")));
      panel.appendChild(estadoEl);
      siguienteBtn(i);
    }
    function siguienteBtn(i) {
      var next = null;
      for (var k = 1; k <= puntos.length; k++) { var j = (i + k) % puntos.length; if (detectar ? (!ev[j] && (pistas || hallados[j])) : !vistos[j]) { next = j; break; } }
      if (next !== null) panel.appendChild(h("div", { class: "fila-acc" }, h("button", { type: "button", class: "btn btn-sec", onclick: function () { elegir(next, true); } }, "Siguiente punto", u.icon("arrow-right"))));
      else if (detectar && Object.keys(ev).length === puntos.length) panel.appendChild(cierreDetectar());
    }
    function enfocar(p) {
      var a = data.anchors[p.objeto]; if (!a) return;
      var c = visor.camera.position, t = a;
      var dir = [c.x - t[0], c.y - t[1], c.z - t[2]], len = Math.hypot(dir[0], dir[1], dir[2]) || 1;
      var dist = data.interior ? 2.2 : 3.2;
      var pos = [t[0] + dir[0] / len * dist, Math.max(t[1] + 0.6, 1.2), t[2] + dir[2] / len * dist];
      visor.mirar(pos, t);
    }
    function pintarMarcadores() {
      markers.forEach(function (m) {
        var p = puntos[m.i], e = ev[m.i];
        var visible = pistas || hallados[m.i] || !detectar;
        m.el.hidden = !visible;
        m.el.className = "hs" + (e ? (e.ok ? " ok" : " mal") : (vistos[m.i] ? " visto" : "")) + (sel === m.i ? " activo" : "");
        m.el.setAttribute("aria-label", "Punto " + (m.i + 1) + ": " + (detectar && !e ? descripcionNeutra(p) : p.titulo));
      });
      pintarAlt();
    }
    function posMarcadores() {
      markers.forEach(function (m) {
        var a = data.anchors[puntos[m.i].objeto]; if (!a) { m.el.hidden = true; return; }
        var pr = visor.proyectar(a);
        m.el.style.transform = "translate(" + pr.x.toFixed(1) + "px," + pr.y.toFixed(1) + "px)";
        m.el.classList.toggle("fuera", !pr.visible);
      });
    }
    function iniciar3d() {
      if (!webgl()) { lz.classList.add("sin3d"); u.clear(lz); lz.appendChild(h("div", { class: "v3d-sin" }, S.ilus("monitor-off"), h("p", null, "Tu navegador no puede mostrar la vista 3D. Usa la lista de puntos de abajo: tiene la misma actividad."))); alt.open = true; return; }
      cargar().then(function () {
        var THREE = S3.THREE;
        data = KIT.SCENES[scr.escena || "bodega"](scr.variante || "inicial");
        visor = new Visor(lz, { fondo: data.interior ? "#0d1d27" : "#0b1a23", fov: 55, exposicion: 1.05, env: data.interior ? 0.6 : 0.5, onMove: function () {} });
        visor.scene.add(data.root);
        luces(visor.scene, data.interior, data.size);
        visor.scene.fog = new THREE.Fog(visor.scene.background, 18, 42);
        var c0 = data.camaras[0]; visor.mirar(c0.pos, c0.mira, true);
        var ctl = visor.controls;
        ctl.maxPolarAngle = Math.PI * 0.49; ctl.minDistance = 0.6; ctl.maxDistance = data.interior ? 10 : 18;
        var lim = data.size;
        ctl.addEventListener("change", function () {
          var t = ctl.target; t.x = Math.max(-lim[0] / 2, Math.min(lim[0] / 2, t.x)); t.z = Math.max(-lim[2] / 2, Math.min(lim[2] / 2, t.z)); t.y = Math.max(0, Math.min(lim[1], t.y));
        });
        visor.onRender = posMarcadores;
        puntos.forEach(function (p) {
          var el = h("button", { type: "button", class: "hs" }, h("span", { class: "hs-onda" }), h("span", { class: "hs-n" }, String(p._i + 1)));
          el.addEventListener("click", function (ev2) { ev2.stopPropagation(); elegir(p._i); });
          capa.appendChild(el);
          markers.push({ i: p._i, el: el });
        });
        pintarMarcadores();
        // clic sobre la escena: en modo detectar, encuentra el punto más cercano al lugar tocado
        var down = null;
        lz.addEventListener("pointerdown", function (e) { down = [e.clientX, e.clientY]; });
        lz.addEventListener("pointerup", function (e) {
          if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
          if (e.target.closest(".hs, .v3d-barra")) return;
          var hit = visor.pick(e); if (!hit) return;
          var best = null, bd = data.interior ? 0.9 : 1.4;
          puntos.forEach(function (p) { var a = data.anchors[p.objeto]; if (!a) return; var d = hit.point.distanceTo(new THREE.Vector3().fromArray(a)); if (d < bd) { bd = d; best = p._i; } });
          if (best !== null) { if (detectar && !hallados[best]) { hallados[best] = 1; media.sfx("encontrado"); ctx.save({ hallados: hallados }); u.toast("Encontraste algo para revisar: punto " + (best + 1) + ".", "ok"); } elegir(best); }
          else if (detectar && !pistas) { media.sfx("tic"); }
        });
        // barra: vistas, restablecer, pantalla completa
        var sel2 = h("select", { class: "v3d-vistas", "aria-label": "Ir a una vista" });
        data.camaras.forEach(function (c, k) { sel2.appendChild(h("option", { value: String(k) }, c.nombre)); });
        sel2.addEventListener("change", function () { var c = data.camaras[+sel2.value]; visor.mirar(c.pos, c.mira); media.sfx("pasar"); });
        barra.appendChild(h("label", { class: "v3d-vlab" }, u.icon("video"), sel2));
        barra.appendChild(h("button", { type: "button", class: "v3d-btn", "aria-label": "Volver a la vista general", title: "Vista general", onclick: function () { sel2.value = "0"; var c = data.camaras[0]; visor.mirar(c.pos, c.mira); } }, u.icon("rotate-ccw")));
        barra.appendChild(pantallaCompleta(lz));
        lz.classList.add("listo");
        S.onLeave(function () { visor.destruir(); });
      }).catch(function () { lz.classList.add("sin3d"); alt.open = true; });
    }
    panelInicio();
    pintarAlt();
    iniciar3d();
    return w;
  };

  /* =================== MODELO 3D =================== */
  function visorModelo(cont, nombre, partesInfo, opts) {
    opts = opts || {};
    var THREE = S3.THREE;
    var m = KIT.MODELS[nombre] ? KIT.MODELS[nombre]() : KIT.MODELS.casco();
    var visor = new Visor(cont, { transparente: false, fondo: opts.fondo || "#0b1b25", fov: 35, env: 0.9, exposicion: 1.1, autoGiro: opts.autoGiro });
    visor.scene.add(m.root);
    var hemi = new THREE.HemisphereLight("#ffffff", "#9aa39c", 1.0); visor.scene.add(hemi);
    var key = new THREE.DirectionalLight("#ffffff", 2.0); key.position.set(1.2, 2, 1.5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); visor.scene.add(key);
    var rim = new THREE.DirectionalLight("#bfe3ff", 0.8); rim.position.set(-1.5, 1, -1.2); visor.scene.add(rim);
    var box3 = new THREE.Box3().setFromObject(m.root);
    var piso = new THREE.Mesh(new THREE.CircleGeometry(m.distancia * 0.7, 48), new THREE.ShadowMaterial({ opacity: 0.18 }));
    piso.rotation.x = -Math.PI / 2; piso.position.y = box3.min.y - 0.002; piso.receiveShadow = true; visor.scene.add(piso);
    var c = m.centro || [0, 0, 0], d = m.distancia;
    visor.mirar([c[0] + d * 0.62, c[1] + d * 0.35, c[2] + d * 0.72], c, true);
    visor.controls.minDistance = d * 0.35; visor.controls.maxDistance = d * 2.2; visor.controls.enablePan = false;
    // partes: agrupar mallas por id y preparar resaltado
    var partes = {};
    m.root.traverse(function (o) {
      if (!o.isMesh || !o.userData.parte) return;
      (partes[o.userData.parte] = partes[o.userData.parte] || []).push(o);
      o.userData.matOrig = o.material;
    });
    var tops = {};
    m.root.children.forEach(function (o) { if (o.userData.parte) (tops[o.userData.parte] = tops[o.userData.parte] || []).push(o); });
    var resaltado = null;
    function resaltar(id) {
      if (resaltado) (partes[resaltado] || []).forEach(function (o) { o.material = o.userData.matOrig; });
      resaltado = id;
      if (id) (partes[id] || []).forEach(function (o) {
        var mm = o.userData.matOrig.clone(); mm.emissive = new THREE.Color("#FFB84D"); mm.emissiveIntensity = 0.55; o.material = mm;
      });
      visor.dirty = true;
    }
    var exp = 0, expTarget = 0;
    visor.anim.push(function () {
      if (Math.abs(exp - expTarget) < 0.002) return;
      exp += (expTarget - exp) * 0.12;
      Object.keys(tops).forEach(function (id) {
        tops[id].forEach(function (o) {
          var e = o.userData.explode || [0, 0, 0], b = o.userData.base;
          o.position.set(b.x + e[0] * exp, b.y + e[1] * exp, b.z + e[2] * exp);
          o.children.forEach(function (ch) { if (ch.userData.ex !== undefined) { if (ch.userData.bx === undefined) ch.userData.bx = ch.position.x; ch.position.x = ch.userData.bx + ch.userData.ex * exp; } });
        });
      });
    });
    var tieneExplode = Object.keys(tops).some(function (id) { return tops[id].some(function (o) { var e = o.userData.explode || [0, 0, 0]; return e[0] || e[1] || e[2] || o.children.some(function (ch) { return ch.userData.ex; }); }); });
    return {
      visor: visor, partes: partes, tops: tops, resaltar: resaltar, tieneExplode: tieneExplode,
      explotar: function (on) { expTarget = on ? 1 : 0; visor.dirty = true; },
      enfocar: function (id) {
        var g = tops[id]; if (!g || !g.length) return;
        var b = new THREE.Box3(); g.forEach(function (o) { b.expandByObject(o); });
        var ctr = b.getCenter(new THREE.Vector3());
        var dir = visor.camera.position.clone().sub(visor.controls.target).normalize();
        var dist = Math.max(d * 0.55, b.getSize(new THREE.Vector3()).length() * 2.2);
        visor.mirar(ctr.clone().add(dir.multiplyScalar(dist)).toArray(), ctr.toArray());
      },
      ver: function (id, on) { (tops[id] || []).forEach(function (o) { o.visible = on; }); visor.dirty = true; },
      pickParte: function (ev) { var hit = visor.pick(ev, [m.root]); return hit ? hit.object.userData.parte : null; },
      general: function () { visor.mirar([c[0] + d * 0.62, c[1] + d * 0.35, c[2] + d * 0.72], c); }
    };
  }

  T.modelo3d = function (scr, ctx) {
    var w = h("div", { class: "v3d v3d-modelo" });
    if (scr.consigna || scr.texto) w.appendChild(u.prose(scr.consigna || scr.texto, "prose consigna"));
    var lz = lienzo(); lz.classList.add("v3d-mod-lienzo");
    var barra = h("div", { class: "v3d-barra" }); lz.appendChild(barra);
    var panel = h("aside", { class: "v3d-panel" });
    var partes = scr.partes || [];
    var r0 = ctx.result() || {}, vistas = Object.assign({}, r0.vistas || {});
    var info = h("div", { class: "pt-info", "aria-live": "polite" });
    var lista = h("ol", { class: "pt-lista" });
    var mv = null;
    var operario = scr.modelo === "operario";
    partes.forEach(function (p, i) {
      var b = h("button", { type: "button", class: "pt-btn" + (vistas[i] ? " visto" : "") }, h("span", { class: "pt-n" }, String(i + 1)), h("span", null, p.titulo));
      b.addEventListener("click", function () { elegir(i); });
      var li = h("li", null, b);
      if (operario) {
        var tg = h("input", { type: "checkbox", "aria-label": "Mostrar " + p.titulo, title: "Mostrar u ocultar" }); tg.checked = true;
        tg.addEventListener("change", function () { if (mv) mv.ver(p.parte, tg.checked); media.sfx("tic"); });
        li.appendChild(tg);
      }
      lista.appendChild(li);
    });
    function elegir(i) {
      var p = partes[i]; vistas[i] = 1;
      u.$$(".pt-btn", lista).forEach(function (b, k) { b.classList.toggle("on", k === i); if (vistas[k]) b.classList.add("visto"); });
      u.clear(info);
      info.appendChild(h("p", { class: "kicker" }, "Parte " + (i + 1) + " de " + partes.length));
      info.appendChild(h("h2", null, p.titulo));
      info.appendChild(u.prose(p.texto, "prose"));
      if (mv) { mv.resaltar(p.parte); mv.enfocar(p.parte); }
      media.sfx("hotspot");
      var done = Object.keys(vistas).length === partes.length && !(scr.opciones && scr.opciones.length);
      ctx.save({ vistas: vistas, done: done || undefined });
    }
    panel.appendChild(h("p", { class: "kicker" }, u.icon("box"), "Partes"));
    panel.appendChild(lista);
    panel.appendChild(info);
    info.appendChild(h("p", { class: "nota-suave" }, "Elige una parte para verla de cerca. Puedes girar el modelo arrastrándolo."));
    w.appendChild(h("div", { class: "v3d-cuerpo" }, lz, panel));
    if (scr.opciones && scr.opciones.length) w.appendChild(S.eleccion(scr, ctx));
    if (!webgl()) { lz.classList.add("sin3d"); u.clear(lz); lz.appendChild(h("div", { class: "v3d-sin" }, S.ilus("box"), h("p", null, "Tu navegador no puede mostrar el modelo 3D. La lista de partes tiene la misma información."))); return w; }
    cargar().then(function () {
      mv = visorModelo(lz, scr.modelo, partes, { autoGiro: true });
      if (mv.tieneExplode) {
        var on = false;
        var be = h("button", { type: "button", class: "v3d-btn v3d-btn-txt", "aria-pressed": "false", onclick: function () { on = !on; mv.explotar(on); be.setAttribute("aria-pressed", String(on)); be.classList.toggle("on", on); media.sfx("separar"); } }, u.icon("layers"), h("span", null, "Separar partes"));
        barra.appendChild(be);
      }
      barra.appendChild(h("button", { type: "button", class: "v3d-btn", "aria-label": "Vista general", title: "Vista general", onclick: function () { mv.resaltar(null); mv.general(); } }, u.icon("rotate-ccw")));
      barra.appendChild(pantallaCompleta(lz));
      var down = null;
      lz.addEventListener("pointerdown", function (e) { down = [e.clientX, e.clientY]; });
      lz.addEventListener("pointerup", function (e) {
        if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6 || e.target.closest(".v3d-barra")) return;
        var id = mv.pickParte(e); if (!id) return;
        for (var i = 0; i < partes.length; i++) if (partes[i].parte === id) { elegir(i); return; }
      });
      lz.classList.add("listo");
      S.onLeave(function () { mv.visor.destruir(); });
    }).catch(function () { lz.classList.add("sin3d"); });
    return w;
  };

  /* Visor compacto para otras pantallas (inspección, videos). */
  function visor(opts) {
    var lz = lienzo(); lz.classList.add("v3d-mini");
    if (!webgl()) { lz.classList.add("sin3d"); u.clear(lz); lz.appendChild(S.ilus("box")); return lz; }
    cargar().then(function () {
      var mv = visorModelo(lz, opts.modelo, opts.partes || [], { autoGiro: opts.autoGiro !== false, fondo: opts.fondo });
      if (opts.explotado) setTimeout(function () { mv.explotar(true); }, 600);
      if (opts.foco) setTimeout(function () { mv.resaltar(opts.foco); mv.enfocar(opts.foco); }, 400);
      lz.classList.add("listo");
      lz._mv = mv;
      var muerto = false;
      lz.destruir = function () { if (!muerto) { muerto = true; mv.visor.destruir(); } };
      if (lz._pendienteDestruir) lz.destruir();
      S.onLeave(lz.destruir);
    });
    return lz;
  }
  /* Recorrido automático de una escena (para animaciones narradas). */
  function recorrido(opts) {
    var lz = lienzo(); lz.classList.add("v3d-mini", "v3d-recorrido");
    if (!webgl()) { lz.classList.add("sin3d"); u.clear(lz); lz.appendChild(S.ilus("rotate-3d")); return lz; }
    cargar().then(function () {
      var THREE = S3.THREE;
      var data = KIT.SCENES[opts.escena || "bodega"](opts.variante || "inicial");
      var v = new Visor(lz, { fondo: data.interior ? "#e9ebe7" : "#d7dedd", fov: 52, env: 0.55 });
      v.scene.add(data.root); luces(v.scene, data.interior, data.size);
      var a = opts.foco && data.anchors[opts.foco];
      if (a) { v.mirar([a[0] + 3.2, a[1] + 1.6, a[2] + 3.2], a, true); v.mirar([a[0] + 1.6, a[1] + 0.8, a[2] + 1.8], a); }
      else { var c = data.camaras[0]; v.mirar(c.pos, c.mira, true); }
      v.controls.autoRotate = true; v.controls.autoRotateSpeed = 0.6;
      v.anim.push(function () { v.controls.update(); });
      if (a) { var mk = h("span", { class: "hs hs-auto" }, h("span", { class: "hs-onda" }), h("span", { class: "hs-n" }, "!")); lz.appendChild(h("div", { class: "hs-capa" }, mk)); v.onRender = function () { var p = v.proyectar(a); mk.style.transform = "translate(" + p.x + "px," + p.y + "px)"; }; }
      lz.classList.add("listo");
      var muerto = false;
      lz.destruir = function () { if (!muerto) { muerto = true; v.destruir(); } };
      if (lz._pendienteDestruir) lz.destruir();
      S.onLeave(lz.destruir);
    });
    return lz;
  }

  S.d3 = { cargar: cargar, visor: visor, recorrido: recorrido, webgl: webgl };
})();
