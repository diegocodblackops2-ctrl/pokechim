/* Seguridad 360 · kit 3D procedural: texturas, materiales, objetos, escenas (bodega, oficina, teletrabajo) y modelos de EPP.
   Todo se construye con geometrías simples para que pese poco y cargue rápido. Unidades: metros. */
(function () {
  "use strict";
  var S = window.S360;
  var K = S.d3kit = {};

  K.init = function (S3) {
    var THREE = S3.THREE, RBox = S3.RoundedBoxGeometry;
    var cache = {};

    /* ---------- Texturas dibujadas en canvas ---------- */
    function canvasTex(w, hgt, draw, rep) {
      var c = document.createElement("canvas"); c.width = w; c.height = hgt;
      var g = c.getContext("2d"); draw(g, w, hgt);
      var t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
      return t;
    }
    function noise(g, w, hgt, base, amt, n) {
      g.fillStyle = base; g.fillRect(0, 0, w, hgt);
      for (var i = 0; i < (n || 2600); i++) {
        var a = Math.random() * amt;
        g.fillStyle = Math.random() < 0.5 ? "rgba(0,0,0," + a + ")" : "rgba(255,255,255," + a + ")";
        g.fillRect(Math.random() * w, Math.random() * hgt, 1 + Math.random() * 2.5, 1 + Math.random() * 2.5);
      }
    }
    function tex(name) {
      if (cache["t" + name]) return cache["t" + name];
      var t;
      switch (name) {
        case "concreto": t = canvasTex(512, 512, function (g, w, hh) {
          noise(g, w, hh, "#a9aca6", 0.07, 9000);
          g.strokeStyle = "rgba(60,60,60,.18)"; g.lineWidth = 2;
          g.beginPath(); g.moveTo(0, 256); g.lineTo(512, 256); g.moveTo(256, 0); g.lineTo(256, 512); g.stroke();
        }, [10, 7]); break;
        case "piso_oficina": t = canvasTex(512, 512, function (g, w, hh) {
          noise(g, w, hh, "#c9c3b8", 0.04, 4000);
          g.strokeStyle = "rgba(90,80,70,.25)"; g.lineWidth = 2;
          for (var i = 0; i <= 512; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
        }, [6, 5]); break;
        case "madera_piso": t = canvasTex(512, 512, function (g, w, hh) {
          for (var i = 0; i < 8; i++) { g.fillStyle = ["#a27a54", "#9a7350", "#a8805a", "#93704d"][i % 4]; g.fillRect(0, i * 64, w, 64); }
          for (var k = 0; k < 1800; k++) { g.fillStyle = "rgba(60,35,15," + Math.random() * 0.12 + ")"; g.fillRect(Math.random() * w, Math.random() * hh, 8 + Math.random() * 40, 1); }
          g.strokeStyle = "rgba(50,30,15,.35)"; for (var j = 0; j <= 8; j++) { g.beginPath(); g.moveTo(0, j * 64); g.lineTo(w, j * 64); g.stroke(); }
        }, [4, 4]); break;
        case "carton": t = canvasTex(256, 256, function (g, w, hh) {
          noise(g, w, hh, "#b98d5c", 0.06, 2500);
          g.fillStyle = "rgba(210,190,150,.55)"; g.fillRect(0, 112, w, 32);
          g.fillStyle = "rgba(40,30,20,.55)"; g.font = "bold 22px sans-serif"; g.fillText("↑↑", 18, 60);
        }); break;
        case "carton2": t = canvasTex(256, 256, function (g, w, hh) {
          noise(g, w, hh, "#a77c4e", 0.06, 2500);
          g.fillStyle = "rgba(225,215,190,.6)"; g.fillRect(118, 0, 22, hh);
          g.fillStyle = "#fff"; g.fillRect(150, 160, 80, 56); g.fillStyle = "#333"; for (var i = 0; i < 5; i++) g.fillRect(156, 168 + i * 9, 40 + Math.random() * 25, 3);
        }); break;
        case "pallet": t = canvasTex(128, 128, function (g, w, hh) { noise(g, w, hh, "#b08a5a", 0.12, 1500); for (var i = 0; i < 30; i++) { g.fillStyle = "rgba(80,50,20,.25)"; g.fillRect(0, Math.random() * hh, w, 1); } }); break;
        case "pared": t = canvasTex(256, 256, function (g, w, hh) { noise(g, w, hh, "#e8e6e0", 0.025, 3000); }, [6, 2]); break;
        case "pared_bodega": t = canvasTex(256, 256, function (g, w, hh) {
          noise(g, w, hh, "#d9dcd8", 0.03, 2500);
          g.strokeStyle = "rgba(90,100,100,.18)"; g.lineWidth = 3; for (var i = 0; i < 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); }
        }, [10, 2]); break;
        case "salida": t = canvasTex(512, 256, function (g, w, hh) {
          g.fillStyle = "#0a8a3c"; g.fillRect(0, 0, w, hh);
          g.fillStyle = "#fff"; g.fillRect(14, 14, w - 28, hh - 28); g.fillStyle = "#0a8a3c"; g.fillRect(22, 22, w - 44, hh - 44);
          dibujarCorredor(g, 70, 40, 1.15, "#fff");
          g.fillStyle = "#fff"; g.beginPath(); g.moveTo(300, 128); g.lineTo(380, 128); g.lineTo(380, 98); g.lineTo(450, 140); g.lineTo(380, 182); g.lineTo(380, 152); g.lineTo(300, 152); g.closePath(); g.fill();
        }); break;
        case "botiquin": t = canvasTex(256, 256, function (g, w, hh) {
          g.fillStyle = "#0a8a3c"; g.fillRect(0, 0, w, hh);
          g.fillStyle = "#fff"; g.fillRect(98, 48, 60, 160); g.fillRect(48, 98, 160, 60);
        }); break;
        case "extintor_senal": t = canvasTex(256, 256, function (g, w, hh) {
          g.fillStyle = "#c8102e"; g.fillRect(0, 0, w, hh);
          g.fillStyle = "#fff"; g.beginPath(); g.ellipse(128, 150, 34, 70, 0, 0, Math.PI * 2); g.fill();
          g.fillRect(118, 50, 20, 40); g.fillRect(138, 56, 40, 10); g.fillRect(170, 56, 10, 50);
        }); break;
        case "piso_mojado": t = canvasTex(256, 256, function (g, w, hh) {
          g.fillStyle = "#ffd200"; g.fillRect(0, 0, w, hh);
          g.fillStyle = "#111"; g.beginPath(); g.moveTo(128, 20); g.lineTo(236, 210); g.lineTo(20, 210); g.closePath(); g.lineWidth = 10; g.strokeStyle = "#111"; g.stroke();
          g.beginPath(); g.arc(120, 105, 12, 0, Math.PI * 2); g.fill(); g.fillRect(112, 120, 14, 50); g.fillRect(80, 172, 90, 8);
        }); break;
        case "fuera_servicio": t = canvasTex(256, 128, function (g, w, hh) {
          g.fillStyle = "#c8102e"; g.fillRect(0, 0, w, hh); g.fillStyle = "#fff"; g.font = "bold 30px sans-serif"; g.textAlign = "center";
          g.fillText("FUERA DE", w / 2, 52); g.fillText("SERVICIO", w / 2, 92);
        }); break;
        case "franja": t = canvasTex(256, 32, function (g, w, hh) {
          g.fillStyle = "#f2c200"; g.fillRect(0, 0, w, hh); g.fillStyle = "#111";
          for (var i = -32; i < w; i += 32) { g.beginPath(); g.moveTo(i, hh); g.lineTo(i + 16, 0); g.lineTo(i + 32, 0); g.lineTo(i + 16, hh); g.closePath(); g.fill(); }
        }, [1, 1]); break;
        case "pantalla_escritorio": t = canvasTex(512, 320, function (g, w, hh) {
          var gr = g.createLinearGradient(0, 0, w, hh); gr.addColorStop(0, "#1d4f6b"); gr.addColorStop(1, "#0f2a3a"); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
          g.fillStyle = "#f6f7f4"; g.fillRect(40, 40, 300, 210); g.fillStyle = "#087E8B"; g.fillRect(40, 40, 300, 24);
          g.fillStyle = "#9aa"; for (var i = 0; i < 9; i++) g.fillRect(56, 80 + i * 18, 120 + Math.random() * 140, 7);
          g.fillStyle = "#132532"; g.fillRect(0, hh - 22, w, 22); g.fillStyle = "#087E8B"; g.fillRect(10, hh - 18, 14, 14);
        }); break;
        case "pantalla_bloqueo": t = canvasTex(512, 320, function (g, w, hh) {
          var gr = g.createLinearGradient(0, 0, w, hh); gr.addColorStop(0, "#132532"); gr.addColorStop(1, "#087E8B"); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
          g.fillStyle = "#fff"; g.font = "bold 64px sans-serif"; g.textAlign = "center"; g.fillText("10:24", w / 2, 150);
          g.font = "22px sans-serif"; g.fillText("🔒  Sesión bloqueada", w / 2, 200);
        }); break;
        case "postit": t = canvasTex(128, 128, function (g, w, hh) {
          g.fillStyle = "#ffe066"; g.fillRect(0, 0, w, hh); g.fillStyle = "#334"; g.font = "bold 17px sans-serif";
          g.fillText("clave:", 12, 40); g.fillText("Pehuen*24", 12, 70); g.fillText("(no borrar)", 12, 100);
        }); break;
        case "pizarra": t = canvasTex(512, 256, function (g, w, hh) {
          g.fillStyle = "#f4f6f5"; g.fillRect(0, 0, w, hh); g.strokeStyle = "#8a9"; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, hh - 8);
          g.fillStyle = "#1d3fa0"; g.font = "bold 26px sans-serif"; g.fillText("WIFI: Pehuen-Oficina", 24, 52); g.fillText("clave: bodega2026", 24, 92);
          g.fillStyle = "#b02020"; g.fillText("Llamar a Los Aromos", 24, 150); g.font = "22px sans-serif"; g.fillText("RUT 76.xxx.xxx-x / pago pendiente", 24, 186);
        }); break;
        case "papel": t = canvasTex(128, 160, function (g, w, hh) { g.fillStyle = "#fbfbf8"; g.fillRect(0, 0, w, hh); g.fillStyle = "#99a"; for (var i = 0; i < 12; i++) g.fillRect(12, 18 + i * 11, 60 + Math.random() * 45, 3); g.fillStyle = "#087E8B"; g.fillRect(12, 6, 40, 6); }); break;
        case "router": t = canvasTex(256, 64, function (g, w, hh) { g.fillStyle = "#f5f5f5"; g.fillRect(0, 0, w, hh); g.fillStyle = "#222"; g.font = "bold 14px monospace"; g.fillText("SSID: CASA-4F2A", 10, 24); g.fillText("CLAVE: admin1234", 10, 46); }); break;
        case "celular_mfa": t = canvasTex(160, 320, function (g, w, hh) {
          g.fillStyle = "#0f1720"; g.fillRect(0, 0, w, hh); g.fillStyle = "#fff"; g.font = "bold 30px sans-serif"; g.textAlign = "center"; g.fillText("21:47", w / 2, 60);
          g.fillStyle = "#f6f7f4"; g.fillRect(10, 110, w - 20, 92); g.fillStyle = "#132532"; g.font = "bold 13px sans-serif"; g.textAlign = "left";
          g.fillText("¿Estás intentando", 18, 134); g.fillText("iniciar sesión?", 18, 152); g.fillStyle = "#087E8B"; g.fillRect(18, 166, 56, 24); g.fillStyle = "#b02020"; g.fillRect(84, 166, 56, 24);
        }); break;
        case "enchufe_quemado": t = canvasTex(128, 128, function (g, w, hh) {
          g.fillStyle = "#f2f0ea"; g.fillRect(0, 0, w, hh);
          var gr = g.createRadialGradient(64, 60, 4, 64, 60, 46); gr.addColorStop(0, "rgba(40,25,10,.85)"); gr.addColorStop(1, "rgba(80,50,20,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
          g.fillStyle = "#222"; [44, 64, 84].forEach(function (x) { g.beginPath(); g.arc(x, 64, 5, 0, Math.PI * 2); g.fill(); });
        }); break;
        case "etiqueta_32kg": t = canvasTex(128, 64, function (g, w, hh) { g.fillStyle = "#fff"; g.fillRect(0, 0, w, hh); g.fillStyle = "#c8102e"; g.font = "bold 30px sans-serif"; g.fillText("32 kg", 14, 44); }); break;
        case "tela": t = canvasTex(128, 128, function (g, w, hh) { noise(g, w, hh, "#8fa3b0", 0.05, 1200); for (var i = 0; i < 128; i += 8) { g.fillStyle = "rgba(0,0,0,.06)"; g.fillRect(i, 0, 3, hh); } }, [2, 2]); break;
        case "alfombra": t = canvasTex(256, 256, function (g, w, hh) { noise(g, w, hh, "#6c7f86", 0.06, 3000); g.strokeStyle = "rgba(255,255,255,.25)"; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, hh - 28); }); break;
        default: t = null;
      }
      cache["t" + name] = t;
      return t;
    }
    function dibujarCorredor(g, x, y, s, col) {
      g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = col; g.strokeStyle = col; g.lineCap = "round"; g.lineWidth = 16;
      g.beginPath(); g.arc(96, 18, 15, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(88, 42); g.lineTo(70, 100); g.stroke();
      g.beginPath(); g.moveTo(84, 54); g.lineTo(112, 74); g.lineTo(132, 62); g.stroke();
      g.beginPath(); g.moveTo(84, 56); g.lineTo(56, 70); g.lineTo(40, 58); g.stroke();
      g.beginPath(); g.moveTo(70, 100); g.lineTo(96, 126); g.lineTo(90, 158); g.stroke();
      g.beginPath(); g.moveTo(70, 100); g.lineTo(46, 128); g.lineTo(20, 130); g.stroke();
      g.restore();
    }

    /* ---------- Materiales ---------- */
    function mat(key, opts) {
      var k = key + JSON.stringify(opts || {});
      if (cache[k]) return cache[k];
      opts = opts || {};
      var m;
      var P = {
        concreto: { map: tex("concreto"), roughness: 0.92, metalness: 0 },
        oficina: { map: tex("piso_oficina"), roughness: 0.6 },
        madera_piso: { map: tex("madera_piso"), roughness: 0.65 },
        pared: { map: tex("pared"), roughness: 0.95 },
        pared_bodega: { map: tex("pared_bodega"), roughness: 0.9 },
        carton: { map: tex("carton"), roughness: 0.95 },
        carton2: { map: tex("carton2"), roughness: 0.95 },
        pallet: { map: tex("pallet"), roughness: 0.9 },
        metal_azul: { color: "#2c5f8a", roughness: 0.45, metalness: 0.55 },
        metal_naranjo: { color: "#e07a1f", roughness: 0.5, metalness: 0.45 },
        metal: { color: "#9aa3a8", roughness: 0.35, metalness: 0.8 },
        metal_oscuro: { color: "#3b4349", roughness: 0.5, metalness: 0.6 },
        plastico_negro: { color: "#1f2326", roughness: 0.55 },
        plastico_blanco: { color: "#f1f1ee", roughness: 0.45 },
        plastico_gris: { color: "#7b858b", roughness: 0.5 },
        rojo: { color: "#c8102e", roughness: 0.4, metalness: 0.1 },
        amarillo: { color: "#f2c200", roughness: 0.45 },
        verde: { color: "#0a8a3c", roughness: 0.5 },
        madera: { color: "#9b7653", roughness: 0.7 },
        madera_clara: { color: "#c9a77c", roughness: 0.65 },
        tela_sofa: { map: tex("tela"), roughness: 0.95 },
        alfombra: { map: tex("alfombra"), roughness: 1 },
        vidrio: { color: "#bfe3ee", roughness: 0.05, metalness: 0, transparent: true, opacity: 0.25 },
        cable: { color: "#232527", roughness: 0.6 },
        cable_naranjo: { color: "#e8681a", roughness: 0.55 },
        cobre: { color: "#c27b45", roughness: 0.3, metalness: 0.9 },
        derrame: { color: "#6fb7c4", roughness: 0.03, metalness: 0.2, transparent: true, opacity: 0.55 },
        emisivo: { color: "#ffffff", emissive: "#fff6e0", emissiveIntensity: 1.6 },
        apagado: { color: "#7b7f80", roughness: 0.6 }
      };
      var p = Object.assign({}, P[key] || { color: key }, opts);
      m = new THREE.MeshStandardMaterial(p);
      cache[k] = m;
      return m;
    }
    function planeTex(name, w, hh, extra) {
      var m = new THREE.MeshStandardMaterial(Object.assign({ map: tex(name), roughness: 0.6 }, extra || {}));
      return new THREE.Mesh(new THREE.PlaneGeometry(w, hh), m);
    }

    /* ---------- Primitivas ---------- */
    function mesh(geo, m, sombra) { var x = new THREE.Mesh(geo, m); x.castShadow = sombra !== false; x.receiveShadow = true; return x; }
    function box(w, hh, d, m, x, y, z) { var b = mesh(new THREE.BoxGeometry(w, hh, d), m); b.position.set(x || 0, (y || 0) + hh / 2, z || 0); return b; }
    function rbox(w, hh, d, r, m, x, y, z) { var b = mesh(new RBox(w, hh, d, 3, Math.min(r, w / 2, hh / 2, d / 2)), m); b.position.set(x || 0, (y || 0) + hh / 2, z || 0); return b; }
    function cyl(rt, rb, hh, m, x, y, z, seg) { var c = mesh(new THREE.CylinderGeometry(rt, rb, hh, seg || 24), m); c.position.set(x || 0, (y || 0) + hh / 2, z || 0); return c; }
    function tube(points, r, m) {
      var curve = new THREE.CatmullRomCurve3(points.map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); }));
      return mesh(new THREE.TubeGeometry(curve, Math.max(24, points.length * 12), r, 8, false), m);
    }
    function group(name) { var g = new THREE.Group(); if (name) g.name = name; return g; }
    function at(obj, x, y, z, ry) { obj.position.set(x, y, z); if (ry) obj.rotation.y = ry; return obj; }

    /* ---------- Objetos comunes ---------- */
    function caja(w, hh, d, variante) { return rbox(w, hh, d, 0.012, mat(variante === 2 ? "carton2" : "carton")); }
    function pallet(conCajas, alto) {
      var g = group();
      var m = mat("pallet");
      for (var i = 0; i < 5; i++) g.add(box(1.2, 0.022, 0.14, m, 0, 0.12, -0.45 + i * 0.225));
      [-0.5, 0, 0.5].forEach(function (x) { g.add(box(0.1, 0.1, 1.0, m, x, 0.02, 0)); });
      for (var k = 0; k < 3; k++) g.add(box(1.2, 0.02, 0.1, m, 0, 0, -0.45 + k * 0.45));
      if (conCajas) {
        var filas = alto || 3;
        for (var y = 0; y < filas; y++) for (var a = 0; a < 2; a++) for (var b = 0; b < 2; b++) {
          var c = caja(0.56, 0.4, 0.46, (a + b + y) % 2 ? 2 : 1); c.position.set(-0.29 + a * 0.58, 0.142 + y * 0.405 + 0.2, -0.24 + b * 0.48); c.rotation.y = (Math.random() - 0.5) * 0.05; g.add(c);
        }
      }
      return g;
    }
    function estante(largo, niveles, cajasFn) {
      var g = group(), m = mat("metal_azul"), v = mat("metal_naranjo");
      var alto = niveles * 0.75 + 0.35;
      [[-largo / 2, -0.45], [largo / 2, -0.45], [-largo / 2, 0.45], [largo / 2, 0.45]].forEach(function (p) { g.add(box(0.08, alto, 0.08, m, p[0], 0, p[1])); });
      for (var n = 0; n <= niveles; n++) {
        var y = 0.12 + n * 0.75;
        g.add(box(largo, 0.08, 0.06, v, 0, y, -0.45)); g.add(box(largo, 0.08, 0.06, v, 0, y, 0.45));
        g.add(box(largo - 0.05, 0.02, 0.9, mat("metal_oscuro"), 0, y + 0.06, 0));
        if (cajasFn) cajasFn(g, n, y + 0.08, largo);
      }
      return g;
    }
    function lampara(encendida, x, y, z, largo) {
      var g = group();
      g.add(box(largo || 1.4, 0.06, 0.2, mat("plastico_gris"), 0, 0, 0));
      var tubo = cyl(0.03, 0.03, (largo || 1.4) - 0.1, encendida ? mat("emisivo") : mat("apagado"), 0, -0.04, 0);
      tubo.rotation.z = Math.PI / 2; tubo.position.y = -0.01; g.add(tubo);
      return at(g, x, y, z);
    }
    function extintor() {
      var g = group();
      g.add(cyl(0.085, 0.085, 0.5, mat("rojo"), 0, 0.1, 0));
      var dome = mesh(new THREE.SphereGeometry(0.085, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat("rojo")); dome.position.y = 0.6; g.add(dome);
      g.add(cyl(0.02, 0.02, 0.08, mat("metal_oscuro"), 0, 0.66, 0));
      g.add(box(0.12, 0.02, 0.03, mat("plastico_negro"), 0.04, 0.73, 0));
      g.add(tube([[0.02, 0.7, 0.03], [0.1, 0.6, 0.09], [0.11, 0.35, 0.09], [0.08, 0.25, 0.08]], 0.012, mat("plastico_negro")));
      g.add(box(0.1, 0.14, 0.005, mat("plastico_blanco"), 0, 0.3, 0.086));
      var soporte = box(0.2, 0.25, 0.04, mat("metal_oscuro"), 0, 0.35, -0.11); g.add(soporte);
      return g;
    }
    function senal(texName, w, hh) { var p = planeTex(texName, w, hh, { roughness: 0.4, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.12 }); p.castShadow = false; return p; }
    function zapatillaElectrica(sobrecargada, segura) {
      var g = group();
      g.add(rbox(0.36, 0.045, 0.07, 0.015, mat(segura ? "plastico_blanco" : "plastico_gris")));
      for (var i = 0; i < 5; i++) {
        var s = box(0.045, 0.005, 0.045, mat("plastico_negro"), -0.13 + i * 0.065, 0.045, 0); g.add(s);
        if (sobrecargada && i < 5) { var en = rbox(0.04, 0.05, 0.04, 0.01, mat(i % 2 ? "plastico_negro" : "plastico_blanco"), -0.13 + i * 0.065, 0.05, 0); g.add(en); }
      }
      var sw = rbox(0.035, 0.02, 0.03, 0.006, mat(sobrecargada ? "rojo" : "verde"), 0.16, 0.045, 0); g.add(sw);
      if (sobrecargada) {
        var crack = box(0.12, 0.004, 0.004, mat("plastico_negro"), 0.02, 0.046, 0.03); crack.rotation.y = 0.4; g.add(crack);
        var adap = rbox(0.06, 0.06, 0.05, 0.01, mat("plastico_blanco"), 0.06, 0.1, 0); g.add(adap);
      }
      return g;
    }
    function escaleraTijera(danada) {
      var g = group(), m = mat("metal"), pel = mat("metal_oscuro");
      var lado = function (sign) {
        var s = group();
        s.add(box(0.04, 1.6, 0.025, m, -0.22, 0, 0)); s.add(box(0.04, 1.6, 0.025, m, 0.22, 0, 0));
        s.rotation.x = sign * 0.2; s.position.z = sign * 0.16;
        return s;
      };
      g.add(lado(1)); g.add(lado(-1));
      for (var i = 0; i < 4; i++) {
        var y = 0.32 + i * 0.36, z = 0.16 - y * 0.2 + 0.02;
        var p = box(0.44, 0.03, 0.1, pel, 0, y, z); g.add(p);
        if (danada && i === 1) { p.rotation.z = 0.12; var fis = box(0.006, 0.032, 0.1, mat("amarillo"), 0.05, y, z); g.add(fis); }
      }
      g.add(box(0.5, 0.05, 0.3, mat("plastico_gris"), 0, 1.6, 0));
      return g;
    }
    function transpaleta() {
      var g = group(), m = mat("metal_naranjo"), n = mat("plastico_negro");
      g.add(box(0.16, 0.06, 1.15, m, -0.17, 0.04, 0.2)); g.add(box(0.16, 0.06, 1.15, m, 0.17, 0.04, 0.2));
      g.add(box(0.56, 0.2, 0.18, m, 0, 0.04, -0.4));
      var bomba = cyl(0.06, 0.06, 0.35, mat("metal_oscuro"), 0, 0.2, -0.42); g.add(bomba);
      var asa = tube([[0, 0.5, -0.45], [0, 0.9, -0.62], [0, 1.15, -0.72]], 0.02, m); g.add(asa);
      g.add(tube([[-0.12, 1.15, -0.72], [0.12, 1.15, -0.72]], 0.025, n));
      [-0.17, 0.17].forEach(function (x) { var r = cyl(0.04, 0.04, 0.06, n, x, 0, 0.72); r.rotation.z = Math.PI / 2; r.position.y = 0.04; g.add(r); });
      return g;
    }
    function persona(colorRopa, conChaleco, conCasco) {
      var g = group(), piel = mat("#c99a7a"), ropa = mat(colorRopa || "#3d5566"), pant = mat("#2b3138");
      [-0.1, 0.1].forEach(function (x) { g.add(cyl(0.07, 0.065, 0.82, pant, x, 0, 0)); g.add(rbox(0.11, 0.08, 0.26, 0.03, mat("plastico_negro"), x, 0, 0.04)); });
      g.add(rbox(0.42, 0.62, 0.24, 0.1, ropa, 0, 0.8, 0));
      if (conChaleco) { var ch = rbox(0.44, 0.5, 0.26, 0.1, mat("#d7ff1f", { emissive: "#5a6a00", emissiveIntensity: 0.25 }), 0, 0.86, 0); g.add(ch); g.add(box(0.45, 0.04, 0.27, mat("#d9dde0", { metalness: 0.6, roughness: 0.2 }), 0, 1.0, 0)); }
      [-0.27, 0.27].forEach(function (x) { var a = cyl(0.055, 0.05, 0.58, ropa, x, 0.82, 0); a.rotation.z = x > 0 ? 0.12 : -0.12; g.add(a); });
      var cab = mesh(new THREE.SphereGeometry(0.12, 24, 16), piel); cab.position.y = 1.58; g.add(cab);
      g.add(cyl(0.05, 0.05, 0.08, piel, 0, 1.42, 0));
      if (conCasco) { var c = mesh(new THREE.SphereGeometry(0.135, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat("#f6f7f4", { roughness: 0.35 })); c.position.y = 1.6; g.add(c); var al = cyl(0.17, 0.17, 0.015, mat("#f6f7f4"), 0, 1.6, 0.02); g.add(al); }
      return g;
    }

    /* =================== ESCENAS =================== */
    var SCENES = {};

    /* ---------- Bodega + andén ---------- */
    SCENES.bodega = function (v) {
      var corr = v === "corregida";
      var root = group("bodega"), anchors = {};
      var W = 20, D = 14, H = 6;
      var piso = mesh(new THREE.PlaneGeometry(W, D), mat("concreto")); piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true; root.add(piso);
      // pasillo peatonal demarcado
      [[-1.2, 0], [1.2, 0]].forEach(function (p) { var l = mesh(new THREE.PlaneGeometry(0.1, D - 2), mat("amarillo")); l.rotation.x = -Math.PI / 2; l.position.set(p[0], 0.003, 0); l.receiveShadow = true; root.add(l); });
      var pared = mat("pared_bodega");
      var pf = mesh(new THREE.PlaneGeometry(W, H), pared); pf.position.set(0, H / 2, -D / 2); root.add(pf);
      var pi = mesh(new THREE.PlaneGeometry(D, H), pared); pi.rotation.y = Math.PI / 2; pi.position.set(-W / 2, H / 2, 0); root.add(pi);
      var pd = mesh(new THREE.PlaneGeometry(D, H), pared); pd.rotation.y = -Math.PI / 2; pd.position.set(W / 2, H / 2, 0); root.add(pd);
      // techo con vigas
      for (var vx = -9; vx <= 9; vx += 3) root.add(box(0.15, 0.3, D, mat("metal_oscuro"), vx, H - 0.3, 0));
      // estanterías a ambos lados del pasillo
      var estantes = [[-4.2, -3.5], [-4.2, 0.5], [4.2, -3.5], [4.2, 0.5]];
      estantes.forEach(function (p, k) {
        var e = estante(3.4, 3, function (g, n, y, largo) {
          if (n === 3) return;
          for (var i = 0; i < 4; i++) {
            if ((k + n + i) % 5 === 0) continue;
            var c = caja(0.65, 0.42 + (i % 2) * 0.12, 0.7, (i + n) % 2 ? 2 : 1); c.position.set(-largo / 2 + 0.5 + i * 0.8, y + c.geometry.parameters.height / 2, 0); g.add(c);
          }
        });
        e.rotation.y = Math.PI / 2; e.position.set(p[0], 0, p[1]); root.add(e);
      });
      // estante con cajas pesadas arriba (o corregido: abajo)
      var ep = estante(2.2, 3, function (g, n, y) {
        if (corr ? n === 0 : n === 2) { for (var i = 0; i < 2; i++) { var c = caja(0.8, 0.55, 0.75, 2); c.position.set(-0.5 + i * 1.0, y + 0.275, 0); g.add(c); var et = planeTex("etiqueta_32kg", 0.2, 0.1); et.position.set(-0.5 + i * 1.0, y + 0.3, 0.38); g.add(et); } }
        else if (n < 3 && n !== (corr ? 0 : 2)) { for (var j = 0; j < 3; j++) { var c2 = caja(0.5, 0.3, 0.5, 1); c2.position.set(-0.7 + j * 0.7, y + 0.15, 0); g.add(c2); } }
      });
      ep.position.set(-7.6, 0, -5.3); root.add(ep);
      anchors.estante_pesado_arriba = [-7.6, corr ? 0.6 : 2.0, -4.8];
      // pallet en el pasillo
      var pal = pallet(true, 3);
      if (corr) at(pal, -8.0, 0, 2.6, 0.1); else at(pal, -0.55, 0, 1.2, 0.25);
      root.add(pal); anchors.pallet_pasillo = corr ? [-8.0, 1.5, 2.6] : [-0.55, 1.5, 1.2];
      // demarcación de zona de pallets
      var zona = mesh(new THREE.PlaneGeometry(2.4, 2.4), mat("amarillo", { transparent: true, opacity: 0.25 })); zona.rotation.x = -Math.PI / 2; zona.position.set(-8.0, 0.004, 2.6); root.add(zona);
      // mesa de despacho
      var mesa = group();
      mesa.add(box(1.8, 0.04, 0.8, mat("madera_clara"), 0, 0.74, 0));
      [[-0.85, -0.35], [0.85, -0.35], [-0.85, 0.35], [0.85, 0.35]].forEach(function (p) { mesa.add(box(0.05, 0.74, 0.05, mat("metal_oscuro"), p[0], 0, p[1])); });
      var nb = group();
      if (!corr) { nb.add(caja(0.4, 0.12, 0.3, 1)); nb.children[0].position.y = 0.84; }
      else { nb.add(box(0.3, 0.12, 0.24, mat("metal"), 0, 0.78, 0)); }
      var base = box(0.34, 0.02, 0.24, mat("plastico_negro"), 0, corr ? 0.9 : 0.9, 0); nb.add(base);
      var pant = mesh(new THREE.BoxGeometry(0.34, 0.22, 0.01), mat("plastico_negro")); pant.position.set(0, 1.02, -0.12); pant.rotation.x = -0.25; nb.add(pant);
      var scr = planeTex("pantalla_escritorio", 0.32, 0.2, { emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.6, emissiveMap: tex("pantalla_escritorio") }); scr.position.set(0, 1.02, -0.113); scr.rotation.x = -0.25; nb.add(scr);
      nb.position.set(-0.3, 0, 0); mesa.add(nb);
      mesa.add(rbox(0.25, 0.15, 0.2, 0.03, mat("plastico_gris"), 0.5, 0.76, 0)); // impresora de etiquetas
      if (!corr) { var silla = group(); silla.add(cyl(0.2, 0.2, 0.05, mat("plastico_negro"), 0, 0.6, 0)); silla.add(cyl(0.03, 0.03, 0.6, mat("metal"), 0, 0, 0)); silla.add(cyl(0.25, 0.25, 0.03, mat("metal_oscuro"), 0, 0, 0)); at(silla, 0, 0, 0.75); mesa.add(silla); }
      else { var silla2 = group(); silla2.add(rbox(0.45, 0.08, 0.45, 0.03, mat("plastico_negro"), 0, 0.5, 0)); silla2.add(rbox(0.45, 0.5, 0.06, 0.03, mat("plastico_negro"), 0, 0.6, 0.22)); silla2.add(cyl(0.03, 0.03, 0.5, mat("metal"), 0, 0, 0)); silla2.add(cyl(0.28, 0.28, 0.03, mat("metal_oscuro"), 0, 0, 0)); at(silla2, 0, 0, 0.75); mesa.add(silla2); }
      at(mesa, 3.2, 0, 4.6); root.add(mesa);
      anchors.mesa_despacho = [3.0, 1.1, 4.6];
      // zapatilla eléctrica bajo la mesa
      var zap = zapatillaElectrica(!corr, corr);
      at(zap, corr ? 3.9 : 3.4, corr ? 0.78 : 0.02, corr ? 4.35 : 4.9, 0.3); root.add(zap);
      if (!corr) { var herv = cyl(0.08, 0.09, 0.22, mat("plastico_blanco"), 3.75, 0, 5.15); root.add(herv); root.add(tube([[3.75, 0.08, 5.1], [3.6, 0.03, 5.0], [3.5, 0.03, 4.92]], 0.006, mat("cable"))); }
      anchors.zapatilla_sobrecargada = corr ? [3.9, 0.85, 4.35] : [3.4, 0.15, 4.9];
      // cable cruzando el pasillo (o canalizado)
      if (!corr) root.add(tube([[3.3, 0.02, 4.9], [2.0, 0.015, 4.6], [0.0, 0.015, 4.2], [-1.5, 0.015, 4.0], [-3.2, 0.015, 3.9], [-3.6, 0.3, 3.9], [-3.6, 1.0, 3.9]], 0.012, mat("cable_naranjo")));
      else { var canal = box(4.0, 0.03, 0.12, mat("amarillo"), 1.0, 0, 4.3); root.add(canal); }
      anchors.cable_piso = [0.2, 0.15, 4.2];
      // salida de emergencia
      var puerta = group();
      puerta.add(box(1.4, 2.2, 0.06, mat("#d4d8d6", { metalness: 0.3, roughness: 0.5 }), 0, 0, 0));
      puerta.add(box(1.0, 0.05, 0.08, mat("metal"), 0, 1.05, 0.05)); // barra antipánico
      var sal = senal("salida", 0.8, 0.4); sal.position.set(0, 2.55, 0.04); puerta.add(sal);
      at(puerta, 9.96, 0, -2.0, -Math.PI / 2); root.add(puerta);
      if (!corr) { for (var b = 0; b < 4; b++) { var cc = caja(0.6, 0.45, 0.6, b % 2 ? 1 : 2); cc.position.set(9.3 - (b % 2) * 0.1, 0.225 + Math.floor(b / 2) * 0.45, -2.3 + (b % 2) * 0.62); root.add(cc); } }
      anchors.salida_bloqueada = [9.6, 1.4, -2.0];
      // señalética de evacuación sobre el pasillo
      var sev = senal("salida", 0.6, 0.3); sev.position.set(0, 3.2, -6.95); root.add(sev);
      anchors.senal_evacuacion = [0, 3.2, -6.9];
      // extintor y su señal
      var ext = extintor(); at(ext, 9.85, 0.2, 1.5, -Math.PI / 2); root.add(ext);
      var sext = senal("extintor_senal", 0.3, 0.3); sext.position.set(9.94, 1.65, 1.5); sext.rotation.y = -Math.PI / 2; root.add(sext);
      anchors.extintor = [9.7, 0.8, 1.5];
      // botiquín
      var bot = box(0.45, 0.35, 0.15, mat("verde"), -9.9, 1.3, -1.0); bot.rotation.y = Math.PI / 2; root.add(bot);
      var bs = senal("botiquin", 0.25, 0.25); bs.position.set(-9.81, 1.48, -1.0); bs.rotation.y = Math.PI / 2; root.add(bs);
      anchors.botiquin = [-9.8, 1.5, -1.0];
      // derrame junto a productos de aseo
      var ea = estante(2.0, 2, function (g, n, y) { if (n < 2) for (var i = 0; i < 6; i++) { var bid = cyl(0.11, 0.11, 0.32, mat(i % 2 ? "#2f7fb5" : "#e2e6e9"), -0.75 + i * 0.3, y, 0); g.add(bid); } });
      at(ea, 7.6, 0, -5.4); root.add(ea);
      if (!corr) { var der = mesh(new THREE.CircleGeometry(0.75, 32), mat("derrame")); der.rotation.x = -Math.PI / 2; der.scale.set(1.3, 0.8, 1); der.position.set(7.4, 0.006, -4.3); der.receiveShadow = true; root.add(der); }
      else { var cono = group(); cono.add(box(0.32, 0.6, 0.02, mat("amarillo"), 0, 0, 0)); var pm = senal("piso_mojado", 0.28, 0.28); pm.position.set(0, 0.36, 0.012); cono.add(pm); cono.rotation.x = -0.18; at(cono, 7.4, 0, -4.1); root.add(cono); var paño = box(0.8, 0.02, 0.5, mat("#3b6f9a"), 7.4, 0, -4.4); root.add(paño); }
      anchors.derrame = [7.4, 0.25, -4.3];
      // escalera de tijera
      var esc = escaleraTijera(!corr); at(esc, corr ? -9.2 : 5.6, 0, corr ? 4.8 : -2.4, 0.4); root.add(esc);
      if (corr) { var fs = senal("fuera_servicio", 0.3, 0.15); fs.position.set(-9.2, 1.0, 5.05); root.add(fs); }
      anchors.escalera_tijera = corr ? [-9.2, 1.0, 4.8] : [5.6, 1.0, -2.4];
      // caja pesada en el piso
      var cp = caja(0.6, 0.45, 0.5, 2); cp.position.set(1.8, 0.225, -1.2); root.add(cp);
      var et32 = planeTex("etiqueta_32kg", 0.22, 0.11); et32.position.set(1.8, 0.3, -0.94); root.add(et32);
      anchors.caja_pesada = [1.8, 0.5, -1.2];
      // transpaleta en su zona
      var tp = transpaleta(); at(tp, -7.6, 0, 5.2, Math.PI / 2); root.add(tp);
      var ztp = mesh(new THREE.PlaneGeometry(1.8, 1.0), mat("amarillo", { transparent: true, opacity: 0.25 })); ztp.rotation.x = -Math.PI / 2; ztp.position.set(-7.5, 0.004, 5.2); root.add(ztp);
      anchors.transpaleta = [-7.6, 0.8, 5.2];
      // cartonero
      var cart = group(); cart.add(rbox(0.16, 0.025, 0.035, 0.008, mat("amarillo"))); if (!corr) cart.add(box(0.06, 0.004, 0.015, mat("metal"), 0.1, 0.008, 0));
      at(cart, 3.75, 0.76, 4.45, 0.6); root.add(cart);
      anchors.cartonero = [3.75, 0.85, 4.45];
      // andén
      var anden = box(7, 1.2, 0.6, mat("concreto"), 0, -1.2, 7.3); root.add(anden);
      var borde = mesh(new THREE.PlaneGeometry(7, 0.18), mat("#ffffff", { map: tex("franja") })); borde.rotation.x = -Math.PI / 2; borde.position.set(0, 0.005, 6.75); if (corr) root.add(borde);
      var foso = box(7, 0.02, 2.5, mat("#3b4349"), 0, -1.22, 8.3); root.add(foso);
      if (corr) { [-3.3, 3.3].forEach(function (x) { root.add(cyl(0.05, 0.05, 1.0, mat("amarillo"), x, 0, 6.85)); }); root.add(tube([[-3.3, 0.95, 6.85], [0, 0.75, 6.85], [3.3, 0.95, 6.85]], 0.02, mat("amarillo"))); }
      var portón = box(4.0, 0.35, 0.1, mat("metal_oscuro"), 0, 4.2, 6.98); root.add(portón);
      anchors.borde_anden = [0, 0.3, 6.9];
      // envolvedora de pallets
      var env = group();
      env.add(cyl(0.9, 0.9, 0.1, mat("metal_oscuro"), 0, 0, 0));
      env.add(box(0.25, 2.4, 0.25, mat("#e9eef0", { metalness: 0.3 }), 1.15, 0, 0));
      env.add(rbox(0.35, 0.4, 0.3, 0.04, mat("#087E8B"), 1.15, 1.1, 0.25));
      var rollo = cyl(0.07, 0.07, 0.5, mat("#cfe8ee", { transparent: true, opacity: 0.8 }), 1.0, 1.0, 0.35); env.add(rollo);
      var reja = group(); for (var r = 0; r < 6; r++) reja.add(box(0.03, 1.4, 0.03, mat("amarillo"), -0.6 + r * 0.24, 0, 0)); reja.add(box(1.3, 0.05, 0.05, mat("amarillo"), 0, 1.38, 0)); reja.add(box(1.3, 0.05, 0.05, mat("amarillo"), 0, 0.1, 0));
      if (corr) { at(reja, 0, 0, 1.1); } else { at(reja, 2.2, 0, -0.9, 0.2); reja.rotation.z = 0.12; }
      env.add(reja);
      var pal2 = pallet(true, 2); pal2.position.y = 0.1; env.add(pal2);
      at(env, -5.8, 0, -1.6); root.add(env);
      anchors.envolvedora = [-5.8, 1.3, -1.6];
      // luminarias
      for (var lx = -6; lx <= 6; lx += 4) for (var lz = -5; lz <= 4; lz += 4.5) {
        var quemada = !corr && lz < -3 && lx > 3;
        root.add(lampara(!quemada, lx, H - 0.6, lz, 1.6));
      }
      anchors.luminaria_quemada = [6, H - 0.7, -5];
      // personas trabajando
      var p1 = persona("#4a6274", true, false); at(p1, -2.5, 0, 5.4, 2.6); root.add(p1);
      var p2 = persona("#7a4a2a", true, false); at(p2, 5.0, 0, 2.2, -1.2); root.add(p2);
      return { root: root, anchors: anchors, size: [W, H, D], camaras: [
        { id: "general", nombre: "Vista general", pos: [0, 6.2, 11.5], mira: [0, 0.8, 0] },
        { id: "despacho", nombre: "Mesa de despacho", pos: [0.2, 1.8, 7.8], mira: [2.8, 0.6, 4.4] },
        { id: "pasillo", nombre: "Pasillo central", pos: [0, 1.7, 5.5], mira: [0, 1.0, -4] },
        { id: "fondo", nombre: "Fondo de la bodega", pos: [2.5, 2.6, 1.5], mira: [6.5, 0.8, -4.5] },
        { id: "anden", nombre: "Andén", pos: [-3.5, 2.6, 2.5], mira: [0.5, 0.0, 7.0] }
      ] };
    };

    /* ---------- Oficina + sala de equipos ---------- */
    SCENES.oficina = function (v) {
      var corr = v === "corregida";
      var root = group("oficina"), anchors = {};
      var W = 14, D = 10, H = 3;
      var piso = mesh(new THREE.PlaneGeometry(W, D), mat("oficina")); piso.rotation.x = -Math.PI / 2; root.add(piso);
      var pared = mat("pared");
      var pf = mesh(new THREE.PlaneGeometry(W, H), pared); pf.position.set(0, H / 2, -D / 2); root.add(pf);
      var pi = mesh(new THREE.PlaneGeometry(D, H), pared); pi.rotation.y = Math.PI / 2; pi.position.set(-W / 2, H / 2, 0); root.add(pi);
      var pd = mesh(new THREE.PlaneGeometry(D, H), pared); pd.rotation.y = -Math.PI / 2; pd.position.set(W / 2, H / 2, 0); root.add(pd);
      var techo = mesh(new THREE.PlaneGeometry(W, D), mat("#f3f3f0")); techo.rotation.x = Math.PI / 2; techo.position.y = H; techo.receiveShadow = false; root.add(techo);
      // ventana con luz fuerte
      var vent = mesh(new THREE.PlaneGeometry(4, 1.6), new THREE.MeshStandardMaterial({ color: "#dff4ff", emissive: "#e8f7ff", emissiveIntensity: 1.2 })); vent.position.set(-1, 1.6, -4.99); root.add(vent);
      if (corr) { for (var k = 0; k < 10; k++) root.add(box(4.0, 0.03, 0.05, mat("plastico_blanco"), -1, 0.85 + k * 0.16, -4.92)); }
      anchors.ventana_reflejo = [-1, 1.6, -4.9];
      function escritorio(x, z, ry, cfg) {
        var g = group();
        g.add(box(1.6, 0.04, 0.8, mat("madera_clara"), 0, 0.72, 0));
        g.add(box(0.04, 0.72, 0.76, mat("plastico_gris"), -0.76, 0, 0)); g.add(box(0.04, 0.72, 0.76, mat("plastico_gris"), 0.76, 0, 0));
        var cajonera = group(); cajonera.add(box(0.42, 0.6, 0.6, mat("plastico_gris"), 0, 0, 0));
        if (cfg.cajon) cajonera.add(box(0.38, 0.18, 0.55, mat("plastico_blanco"), 0, 0.05, 0.42));
        at(cajonera, 0.5, 0, 0.05); g.add(cajonera);
        // monitor o notebook
        if (cfg.notebookBajo) {
          var nbb = group(); nbb.add(box(0.34, 0.02, 0.24, mat("plastico_negro"), 0, 0.74, 0.05));
          var tapa = box(0.34, 0.22, 0.01, mat("plastico_negro"), 0, 0.75, -0.07); tapa.rotation.x = -0.35; nbb.add(tapa); g.add(nbb);
        } else {
          g.add(cyl(0.1, 0.12, 0.02, mat("plastico_negro"), 0, 0.74, -0.2)); g.add(box(0.05, 0.3, 0.05, mat("plastico_negro"), 0, 0.74, -0.22));
          g.add(box(0.58, 0.36, 0.03, mat("plastico_negro"), 0, 1.0, -0.22));
          var s = planeTex(cfg.bloqueado ? "pantalla_bloqueo" : "pantalla_escritorio", 0.55, 0.33, { emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.55, emissiveMap: tex(cfg.bloqueado ? "pantalla_bloqueo" : "pantalla_escritorio") }); s.position.set(0, 1.18, -0.203); g.add(s);
          if (cfg.postit) { var pt = planeTex("postit", 0.08, 0.08); pt.position.set(0.25, 1.06, -0.202); pt.rotation.z = 0.1; g.add(pt); }
          if (cfg.glare) { var gl = mesh(new THREE.PlaneGeometry(0.3, 0.2), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.55 })); gl.position.set(-0.08, 1.2, -0.2); g.add(gl); }
          g.add(box(0.44, 0.02, 0.14, mat("plastico_negro"), 0, 0.74, 0.12));
        }
        // silla
        var silla = group();
        silla.add(rbox(0.48, 0.08, 0.46, 0.03, mat("#2f3b44"), 0, 0.46, 0)); silla.add(rbox(0.46, 0.55, 0.06, 0.03, mat("#2f3b44"), 0, 0.55, 0.24));
        silla.add(cyl(0.03, 0.03, 0.46, mat("metal"), 0, 0, 0)); silla.add(cyl(0.3, 0.3, 0.03, mat("metal_oscuro"), 0, 0.02, 0));
        at(silla, 0, 0, 0.7, Math.PI); g.add(silla);
        if (cfg.cafe) g.add(cyl(0.04, 0.035, 0.1, mat("#c8102e"), 0.32, 0.74, 0.1));
        return at(g, x, 0, z, ry || 0);
      }
      root.add(escritorio(-4, -2.5, 0, { notebookBajo: !corr, postit: false }));
      if (corr) { var nbs = group(); nbs.add(box(0.26, 0.18, 0.22, mat("metal"), 0, 0.74, -0.15)); var tapa2 = box(0.34, 0.22, 0.01, mat("plastico_negro"), 0, 0.93, -0.25); tapa2.rotation.x = -0.15; nbs.add(tapa2); nbs.add(box(0.44, 0.02, 0.14, mat("plastico_negro"), 0, 0.74, 0.15)); at(nbs, -4, 0, -2.5); root.add(nbs); }
      anchors.monitor_bajo = [-4, 1.0, -2.6]; anchors.silla = [-4, 0.8, -1.8];
      root.add(escritorio(-1, -2.5, 0, { postit: !corr, bloqueado: corr, glare: !corr, cafe: !corr }));
      anchors.postit_clave = [-0.75, 1.1, -2.7]; anchors.pc_desbloqueado = [-1, 1.25, -2.7]; anchors.cafe_teclado = [-0.68, 0.85, -2.4];
      root.add(escritorio(2, -2.5, 0, { cajon: !corr }));
      anchors.cajon_abierto = [2.5, 0.35, -1.9];
      root.add(escritorio(-4, 1.5, Math.PI, { bloqueado: true }));
      root.add(escritorio(-1, 1.5, Math.PI, { bloqueado: corr }));
      // zapatillas en cadena bajo el escritorio
      var z1 = zapatillaElectrica(!corr, corr); at(z1, -1.3, 0.01, -2.2, 0.2); root.add(z1);
      if (!corr) { var z2 = zapatillaElectrica(true, false); at(z2, -0.6, 0.01, -2.0, -0.3); root.add(z2); root.add(tube([[-1.15, 0.03, -2.2], [-0.9, 0.03, -2.0], [-0.75, 0.03, -2.0]], 0.006, mat("cable"))); }
      anchors.zapatilla_cadena = [-1.0, 0.15, -2.1];
      // cable de teléfono cruzando
      if (!corr) root.add(tube([[2.6, 0.01, -2.2], [2.6, 0.01, -0.5], [3.4, 0.01, 0.4], [4.8, 0.01, 0.6]], 0.006, mat("plastico_gris")));
      // enchufe quemado en la pared
      var ench = planeTex(corr ? "papel" : "enchufe_quemado", 0.14, 0.14); ench.position.set(2.0, 0.4, -4.99); root.add(ench);
      if (corr) { var aviso = senal("fuera_servicio", 0.22, 0.11); aviso.position.set(2.0, 0.6, -4.985); root.add(aviso); }
      anchors.enchufe_quemado = [2.0, 0.4, -4.9];
      // estufa junto a cajas de papel
      var est = group(); est.add(rbox(0.45, 0.55, 0.2, 0.04, mat("plastico_blanco"))); est.add(box(0.36, 0.3, 0.01, mat("#ff8a3d", { emissive: "#ff5a1f", emissiveIntensity: 0.9 }), 0, 0.12, 0.1));
      at(est, corr ? -6.4 : 4.6, 0, corr ? 3.5 : -4.2); root.add(est);
      [0, 1, 2].forEach(function (i) { var c = caja(0.45, 0.32, 0.35, 2); c.position.set(5.2 + (i % 2) * 0.05, 0.16 + i * 0.32, -4.4); root.add(c); });
      anchors.estufa_papeles = corr ? [-6.4, 0.5, 3.5] : [4.8, 0.5, -4.2];
      // impresora con documentos
      var imp = group(); imp.add(box(0.8, 0.75, 0.6, mat("plastico_gris"))); imp.add(rbox(0.6, 0.25, 0.5, 0.03, mat("plastico_blanco"), 0, 0.75, 0));
      if (!corr) for (var pp = 0; pp < 4; pp++) { var hoja = planeTex("papel", 0.21, 0.28); hoja.rotation.x = -Math.PI / 2; hoja.rotation.z = (pp - 2) * 0.08; hoja.position.set(0, 1.01 + pp * 0.003, 0.05); imp.add(hoja); }
      at(imp, 5.5, 0, -1.2, -Math.PI / 2); root.add(imp);
      anchors.impresora_documentos = [5.5, 1.15, -1.2];
      // pendrive
      if (!corr) { var pen = group(); pen.add(rbox(0.06, 0.012, 0.02, 0.004, mat("#087E8B"))); pen.add(box(0.015, 0.008, 0.014, mat("metal"), 0.035, 0.002, 0)); at(pen, 1.7, 0.76, -2.3, 0.4); root.add(pen); }
      anchors.pendrive_desconocido = [1.7, 0.85, -2.3];
      // pizarra
      var piz = planeTex(corr ? "pared" : "pizarra", 1.8, 0.9, { roughness: 0.3 }); piz.position.set(-6.98, 1.5, -1.5); piz.rotation.y = Math.PI / 2; root.add(piz);
      if (corr) { var marco = box(0.02, 0.92, 1.82, mat("plastico_gris"), -6.99, 1.04, -1.5); root.add(marco); }
      anchors.pizarra_datos = [-6.9, 1.5, -1.5];
      // sala de equipos (rack)
      var sala = group();
      sala.add(box(0.1, 2.6, 2.6, mat("pared"), -1.3, 0, 0)); sala.add(box(2.6, 2.6, 0.1, mat("pared"), 0, 0, -1.3));
      var rack = group(); rack.add(box(0.6, 1.9, 0.8, mat("plastico_negro"))); for (var rr = 0; rr < 7; rr++) { rack.add(box(0.5, 0.08, 0.02, mat("metal_oscuro"), 0, 0.3 + rr * 0.2, 0.41)); rack.add(box(0.02, 0.02, 0.01, mat("#2dff7a", { emissive: "#2dff7a", emissiveIntensity: 1.5 }), 0.18, 0.33 + rr * 0.2, 0.425)); }
      at(rack, 0, 0, -0.6); sala.add(rack);
      if (!corr) { [0, 1].forEach(function (i) { var c = caja(0.5, 0.4, 0.45, i + 1); c.position.set(0.6, 0.2 + i * 0.4, 0.3); sala.add(c); }); }
      var puertaSala = box(0.9, 2.1, 0.05, mat("#c7ccc9"), 0, 0, 0);
      if (corr) { puertaSala.position.set(0.85, 1.05, 1.3); } else { puertaSala.position.set(1.4, 1.05, 1.75); puertaSala.rotation.y = -1.2; }
      sala.add(puertaSala);
      at(sala, 5.6, 0, 3.3); root.add(sala);
      anchors.rack_abierto = [5.8, 1.2, 3.6];
      // extintor
      var ext = extintor(); at(ext, -6.85, 0.2, 3.8, Math.PI / 2); root.add(ext);
      var sext = senal("extintor_senal", 0.25, 0.25); sext.position.set(-6.97, 1.6, 3.8); sext.rotation.y = Math.PI / 2; root.add(sext);
      anchors.extintor_oficina = [-6.8, 0.8, 3.8];
      // basurero con documentos / triturador
      var bas = cyl(0.17, 0.14, 0.4, mat("plastico_gris"), 3.0, 0, -1.0); root.add(bas);
      if (!corr) for (var bb = 0; bb < 3; bb++) { var hb = planeTex("papel", 0.2, 0.26); hb.position.set(3.0 + (bb - 1) * 0.04, 0.42, -1.0); hb.rotation.x = -1.2; hb.rotation.z = bb; root.add(hb); }
      else { root.add(rbox(0.4, 0.6, 0.3, 0.03, mat("plastico_negro"), 3.6, 0, -1.0)); }
      anchors.documentos_basurero = [3.0, 0.6, -1.0];
      // teléfono
      var tel = rbox(0.2, 0.06, 0.18, 0.02, mat("plastico_negro"), 2.5, 0.74, -2.7); root.add(tel);
      anchors.telefono = [2.5, 0.85, -2.7];
      // luminarias
      for (var lx = -4.5; lx <= 4.5; lx += 3) for (var lz = -3; lz <= 3; lz += 3) root.add(lampara(true, lx, H - 0.05, lz, 1.2));
      var p1 = persona("#5b6f7d", false, false); at(p1, -4.0, 0, 2.3, Math.PI); root.add(p1);
      return { root: root, anchors: anchors, size: [W, H, D], interior: true, camaras: [
        { id: "general", nombre: "Vista general", pos: [5.5, 2.7, 4.6], mira: [-1.2, 0.8, -1.8] },
        { id: "puesto", nombre: "Puestos de trabajo", pos: [-1.2, 1.55, 0.4], mira: [-1.6, 0.9, -2.8] },
        { id: "impresora", nombre: "Impresora y basurero", pos: [1.4, 1.6, 1.5], mira: [4.6, 0.8, -1.3] },
        { id: "sala", nombre: "Sala de equipos", pos: [2.2, 1.6, 1.6], mira: [5.8, 1.0, 3.4] },
        { id: "pizarra", nombre: "Pizarra y extintor", pos: [-2.5, 1.6, 1.0], mira: [-6.9, 1.2, 0.5] }
      ] };
    };

    /* ---------- Teletrabajo (departamento) ---------- */
    SCENES.teletrabajo = function (v) {
      var corr = v === "corregida";
      var root = group("teletrabajo"), anchors = {};
      var W = 8, D = 7, H = 2.5;
      var piso = mesh(new THREE.PlaneGeometry(W, D), mat("madera_piso")); piso.rotation.x = -Math.PI / 2; root.add(piso);
      var pared = mat("#e9e3d8", { roughness: 0.95 });
      var pf = mesh(new THREE.PlaneGeometry(W, H), pared); pf.position.set(0, H / 2, -D / 2); root.add(pf);
      var pi = mesh(new THREE.PlaneGeometry(D, H), pared); pi.rotation.y = Math.PI / 2; pi.position.set(-W / 2, H / 2, 0); root.add(pi);
      var pd = mesh(new THREE.PlaneGeometry(D, H), pared); pd.rotation.y = -Math.PI / 2; pd.position.set(W / 2, H / 2, 0); root.add(pd);
      var techo = mesh(new THREE.PlaneGeometry(W, D), mat("#f6f3ee")); techo.rotation.x = Math.PI / 2; techo.position.y = H; root.add(techo);
      // ventana con cortina
      var vent = mesh(new THREE.PlaneGeometry(2.2, 1.4), new THREE.MeshStandardMaterial({ color: "#e6f6ff", emissive: "#f2fbff", emissiveIntensity: 1.3 })); vent.position.set(-1.0, 1.35, -3.49); root.add(vent);
      var cort = mesh(new THREE.PlaneGeometry(0.7, 2.0), mat("#c9b9a6", { side: THREE.DoubleSide })); cort.position.set(-2.4, 1.2, -3.4); root.add(cort);
      var alf = mesh(new THREE.PlaneGeometry(2.6, 1.8), mat("alfombra")); alf.rotation.x = -Math.PI / 2; alf.position.set(0.6, 0.004, 0.4); root.add(alf);
      // sofá
      var sofa = group(); sofa.add(rbox(2.0, 0.42, 0.85, 0.08, mat("tela_sofa"), 0, 0, 0)); sofa.add(rbox(2.0, 0.5, 0.2, 0.08, mat("tela_sofa"), 0, 0.4, -0.35)); sofa.add(rbox(0.2, 0.32, 0.85, 0.06, mat("tela_sofa"), -0.95, 0.4, 0)); sofa.add(rbox(0.2, 0.32, 0.85, 0.06, mat("tela_sofa"), 0.95, 0.4, 0));
      at(sofa, 0.6, 0, 2.0, Math.PI); root.add(sofa);
      // mesa de centro con notebook (o mesa de trabajo correcta)
      var mc = group(); mc.add(rbox(1.1, 0.04, 0.6, 0.02, mat("madera"), 0, 0.4, 0)); [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]].forEach(function (p) { mc.add(box(0.04, 0.4, 0.04, mat("madera"), p[0], 0, p[1])); });
      at(mc, 0.6, 0, 0.6); root.add(mc);
      var nb = group(); nb.add(box(0.34, 0.02, 0.24, mat("plastico_gris"), 0, 0, 0)); var tapa = box(0.34, 0.22, 0.01, mat("plastico_gris"), 0, 0.01, -0.12); tapa.rotation.x = -0.3; nb.add(tapa);
      var scrn = planeTex(corr ? "pantalla_bloqueo" : "pantalla_escritorio", 0.31, 0.19, { emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.6, emissiveMap: tex(corr ? "pantalla_bloqueo" : "pantalla_escritorio") }); scrn.position.set(0, 0.12, -0.155); scrn.rotation.x = -0.3; nb.add(scrn);
      // mesa de comedor (puesto)
      var mesa = group(); mesa.add(rbox(1.4, 0.04, 0.8, 0.02, mat("madera_clara"), 0, 0.74, 0)); [[-0.62, -0.32], [0.62, -0.32], [-0.62, 0.32], [0.62, 0.32]].forEach(function (p) { mesa.add(box(0.05, 0.74, 0.05, mat("madera"), p[0], 0, p[1])); });
      at(mesa, -2.4, 0, -1.6, 0); root.add(mesa);
      if (corr) { var sop = box(0.26, 0.16, 0.22, mat("metal"), 0, 0.78, -0.2); mesa.add(sop); var nb2 = nb.clone(); at(nb2, 0, 0.95, -0.2); mesa.add(nb2); mesa.add(box(0.44, 0.02, 0.14, mat("plastico_negro"), 0, 0.78, 0.15)); }
      else { at(nb, 0.6, 0.42, 0.55, 0.2); root.add(nb); }
      anchors.notebook_mesa_baja = corr ? [-2.4, 1.0, -1.8] : [0.6, 0.6, 0.55];
      anchors.notebook_desbloqueado = corr ? [-2.4, 1.05, -1.8] : [0.6, 0.62, 0.45];
      // silla de comedor
      var sc = group(); sc.add(box(0.45, 0.04, 0.45, mat("madera"), 0, 0.45, 0)); sc.add(box(0.45, 0.5, 0.04, mat("madera"), 0, 0.47, 0.21)); [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(function (p) { sc.add(box(0.04, 0.45, 0.04, mat("madera"), p[0], 0, p[1])); });
      if (corr) { sc.add(rbox(0.36, 0.25, 0.1, 0.04, mat("#087E8B"), 0, 0.6, 0.15)); var rp = box(0.4, 0.1, 0.3, mat("plastico_negro"), 0, 0, -0.5); sc.add(rp); }
      at(sc, -2.4, 0, -0.9, Math.PI); root.add(sc);
      anchors.silla_comedor = [-2.4, 0.7, -0.9];
      // router
      var rt = group(); rt.add(rbox(0.24, 0.05, 0.16, 0.02, mat("plastico_blanco"))); [-0.08, 0.08].forEach(function (x) { var an = cyl(0.008, 0.008, 0.16, mat("plastico_blanco"), x, 0.05, -0.06); rt.add(an); });
      if (!corr) { var et = planeTex("router", 0.16, 0.04); et.position.set(0, 0.026, 0.081); rt.add(et); }
      var mueble = box(0.9, 0.6, 0.35, mat("madera"), 2.9, 0, -3.1); root.add(mueble);
      at(rt, 2.8, 0.6, -3.05); root.add(rt);
      anchors.router = [2.8, 0.8, -3.05];
      // pantalla visible desde el pasillo / ventana
      anchors.pantalla_visible = corr ? [-2.4, 1.2, -2.0] : [0.6, 0.75, 0.4];
      // alargador cruzando a la cocina
      if (!corr) root.add(tube([[3.9, 0.3, -1.0], [3.5, 0.01, -0.6], [2.4, 0.01, 0.2], [1.2, 0.01, 0.9], [0.8, 0.4, 0.7]], 0.008, mat("plastico_blanco")));
      else root.add(tube([[3.9, 0.3, -3.3], [3.9, 0.01, -3.4], [-1.6, 0.01, -3.45], [-1.9, 0.6, -1.9]], 0.008, mat("plastico_blanco")));
      anchors.alargador_paso = corr ? [1.5, 0.2, -3.4] : [2.4, 0.15, 0.2];
      // documentos sobre la mesa
      if (!corr) for (var d = 0; d < 3; d++) { var dp = planeTex("papel", 0.21, 0.28); dp.rotation.x = -Math.PI / 2; dp.rotation.z = d * 0.4; dp.position.set(0.2 + d * 0.1, 0.43, 0.75); root.add(dp); }
      else { root.add(box(0.35, 0.3, 0.28, mat("plastico_gris"), 3.0, 0.6, -3.1)); }
      anchors.documentos_mesa = corr ? [3.0, 0.9, -3.1] : [0.3, 0.5, 0.75];
      // celular con notificación MFA
      var cel = group(); cel.add(rbox(0.075, 0.008, 0.155, 0.01, mat("plastico_negro"))); var cs = planeTex("celular_mfa", 0.068, 0.14, { emissive: new THREE.Color("#fff"), emissiveIntensity: 0.6, emissiveMap: tex("celular_mfa") }); cs.rotation.x = -Math.PI / 2; cs.position.y = 0.0045; cel.add(cs);
      at(cel, 1.0, 0.42, 0.45, 0.3); root.add(cel);
      anchors.celular_trabajo = [1.0, 0.5, 0.45];
      // iluminación
      var lamp = group(); lamp.add(cyl(0.12, 0.15, 0.03, mat("plastico_negro"), 0, 0, 0)); lamp.add(cyl(0.012, 0.012, 1.5, mat("metal"), 0, 0, 0)); lamp.add(cyl(0.12, 0.2, 0.22, mat(corr ? "#fff6e0" : "#d9cdb8", corr ? { emissive: "#fff2cc", emissiveIntensity: 0.9 } : {}), 0, 1.45, 0));
      at(lamp, corr ? -3.4 : 2.0, 0, corr ? -2.2 : 1.6); root.add(lamp);
      anchors.iluminacion = corr ? [-3.4, 1.6, -2.2] : [2.0, 1.6, 1.6];
      // pendrive personal
      if (!corr) { var pen = group(); pen.add(rbox(0.05, 0.012, 0.018, 0.004, mat("#c8102e"))); at(pen, 0.82, 0.43, 0.6, 0.3); root.add(pen); }
      anchors.pendrive_personal = [0.8, 0.5, 0.6];
      // estufa cerca de la cortina
      var est = group();
      if (!corr) { est.add(cyl(0.22, 0.25, 0.5, mat("#3b4349"), 0, 0, 0)); est.add(cyl(0.16, 0.16, 0.2, mat("#ff7a2a", { emissive: "#ff5a1f", emissiveIntensity: 1.1 }), 0, 0.5, 0)); at(est, -2.1, 0, -3.0); }
      else { est.add(rbox(0.45, 0.55, 0.2, 0.04, mat("plastico_blanco"))); est.add(box(0.36, 0.3, 0.01, mat("#ff8a3d", { emissive: "#ff5a1f", emissiveIntensity: 0.6 }), 0, 0.12, 0.1)); at(est, 3.4, 0, 1.5, -Math.PI / 2); }
      root.add(est);
      anchors.estufa_cortina = corr ? [3.4, 0.5, 1.5] : [-2.1, 0.5, -3.0];
      // audífonos
      var aud = group(); var arco = mesh(new THREE.TorusGeometry(0.08, 0.008, 8, 24, Math.PI), mat("plastico_negro")); arco.rotation.x = -Math.PI / 2; aud.add(arco); [-0.08, 0.08].forEach(function (x) { aud.add(cyl(0.035, 0.035, 0.03, mat("plastico_negro"), x, 0, 0)); });
      at(aud, 0.25, 0.42, 0.45); root.add(aud);
      anchors.audifonos = [0.25, 0.5, 0.45];
      var luz = lampara(true, 0, H - 0.04, 0, 0.8); root.add(luz);
      return { root: root, anchors: anchors, size: [W, H, D], interior: true, camaras: [
        { id: "general", nombre: "Vista general", pos: [3.3, 2.0, 3.1], mira: [-0.6, 0.5, -1.0] },
        { id: "living", nombre: "Mesa del living", pos: [1.9, 1.35, 1.9], mira: [0.5, 0.4, 0.4] },
        { id: "comedor", nombre: "Mesa de comedor", pos: [-0.8, 1.5, 0.6], mira: [-2.4, 0.8, -1.8] },
        { id: "ventana", nombre: "Ventana y estufa", pos: [0.6, 1.6, 0.6], mira: [-1.8, 0.9, -3.2] }
      ] };
    };

    /* =================== MODELOS DE EPP Y EQUIPOS =================== */
    var MODELS = {};
    function parte(g, id, obj, explode) { obj.userData.parte = id; obj.userData.explode = explode || [0, 0, 0]; obj.userData.base = obj.position.clone(); g.add(obj); obj.traverse(function (o) { o.userData.parte = id; }); return obj; }

    MODELS.casco = function () {
      var g = group("casco"), blanco = mat("#f4f5f1", { roughness: 0.32, metalness: 0.05 });
      var perfil = [];
      for (var i = 0; i <= 16; i++) { var a = i / 16 * Math.PI / 2; perfil.push(new THREE.Vector2(Math.cos(a) * 0.15 + 0.002, Math.sin(a) * 0.135)); }
      var cascara = mesh(new THREE.LatheGeometry(perfil, 48), blanco); cascara.scale.set(1, 1, 1.15); cascara.position.y = 0.07;
      var carc = group(); carc.add(cascara);
      var cresta = mesh(new THREE.BoxGeometry(0.03, 0.02, 0.32), blanco); cresta.position.set(0, 0.2, 0); carc.add(cresta);
      parte(g, "carcasa", carc, [0, 0.12, 0]);
      var vis = mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.012, 48, 1, false, -0.9, 1.8), blanco); vis.position.set(0, 0.075, 0.03); vis.scale.z = 1.2;
      parte(g, "visera", vis, [0, 0.1, 0.12]);
      var sus = group(), cinta = mat("#2b3138", { roughness: 0.8 });
      for (var k = 0; k < 4; k++) { var arco = mesh(new THREE.TorusGeometry(0.12, 0.007, 6, 24, Math.PI), cinta); arco.rotation.y = k * Math.PI / 4; arco.rotation.x = 0; arco.position.y = 0.05; arco.scale.set(1, 0.9, 1); sus.add(arco); }
      parte(g, "suspension", sus, [0, 0.0, 0]);
      var banda = mesh(new THREE.TorusGeometry(0.125, 0.012, 8, 40), cinta); banda.rotation.x = Math.PI / 2; banda.position.y = 0.04; banda.scale.set(1, 1.18, 1);
      parte(g, "banda_sudor", banda, [0, -0.06, 0]);
      var rueda = group(); rueda.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 20), mat("plastico_negro"))); rueda.rotation.x = Math.PI / 2; rueda.position.set(0, 0.02, -0.15);
      parte(g, "banda_ajuste", rueda, [0, -0.08, -0.12]);
      var barb = tube([[-0.12, 0.04, 0.02], [-0.1, -0.12, 0.04], [0, -0.2, 0.06], [0.1, -0.12, 0.04], [0.12, 0.04, 0.02]], 0.006, mat("#3d5566"));
      parte(g, "barboquejo", barb, [0, -0.12, 0.05]);
      var ran = group(); [-1, 1].forEach(function (s) { var r = box(0.03, 0.012, 0.05, mat("plastico_gris"), s * 0.155, 0.07, 0); ran.add(r); });
      parte(g, "ranuras_accesorios", ran, [0, 0.0, 0]);
      var marc = planeTex("papel", 0.06, 0.04); marc.rotation.x = Math.PI / 2; marc.position.set(0, 0.19, 0); marc.material = mat("#d9dcd6");
      parte(g, "marcado", marc, [0, 0.25, 0]);
      return { root: g, escala: 1, distancia: 0.75, centro: [0, 0.08, 0] };
    };
    MODELS.lentes = function () {
      var g = group("lentes"), m = mat("plastico_negro"), mica = new THREE.MeshPhysicalMaterial({ color: "#d8f1f5", roughness: 0.05, transmission: 0.85, thickness: 0.01, transparent: true, opacity: 0.55 });
      var micas = group();
      [-1, 1].forEach(function (s) { var l = mesh(new THREE.SphereGeometry(0.2, 32, 16, -0.32, 0.64, 1.25, 0.6), mica); l.position.set(s * 0.04, -0.01, -0.15); l.rotation.y = s * 0.24; micas.add(l); });
      parte(g, "micas", micas, [0, 0, 0.06]);
      var marco = group(); marco.add(tube([[-0.11, 0.03, 0.035], [0, 0.04, 0.05], [0.11, 0.03, 0.035]], 0.006, m)); marco.add(box(0.02, 0.012, 0.012, m, 0, 0.0, 0.05));
      parte(g, "marco", marco, [0, 0.05, 0]);
      var lat = group(); [-1, 1].forEach(function (s) { var p = mesh(new THREE.BoxGeometry(0.008, 0.045, 0.04), mica); p.position.set(s * 0.12, 0.01, 0.015); lat.add(p); });
      parte(g, "protecciones_laterales", lat, [0, 0, 0]);
      var pat = group(); [-1, 1].forEach(function (s) { pat.add(tube([[s * 0.12, 0.025, 0.02], [s * 0.125, 0.025, -0.08], [s * 0.12, 0.0, -0.13]], 0.005, m)); });
      parte(g, "patillas", pat, [0, 0, -0.06]);
      var marc = box(0.03, 0.006, 0.002, mat("plastico_blanco"), 0.06, 0.035, 0.056); parte(g, "marcado", marc, [0, 0.04, 0.04]);
      return { root: g, distancia: 0.42, centro: [0, 0.02, 0] };
    };
    MODELS.antiparras = function () {
      var g = group("antiparras");
      var marco = mesh(new THREE.TorusGeometry(0.1, 0.022, 10, 40), mat("#2b3138", { roughness: 0.6 })); marco.scale.set(1.25, 0.6, 1); parte(g, "marco", marco, [0, 0, 0]);
      var mica = mesh(new THREE.CircleGeometry(0.1, 40), new THREE.MeshPhysicalMaterial({ color: "#e0f6fa", transmission: 0.8, roughness: 0.05, transparent: true, opacity: 0.55 })); mica.scale.set(1.25, 0.6, 1); mica.position.z = 0.012; parte(g, "mica", mica, [0, 0, 0.08]);
      var vent = group(); for (var i = 0; i < 5; i++) vent.add(box(0.012, 0.012, 0.01, mat("plastico_gris"), -0.06 + i * 0.03, 0.062, 0.0)); parte(g, "ventilacion", vent, [0, 0.06, 0]);
      var el = mesh(new THREE.TorusGeometry(0.14, 0.006, 6, 40, Math.PI), mat("#087E8B")); el.rotation.x = Math.PI / 2; el.rotation.z = Math.PI; el.position.z = -0.01; el.scale.set(1, 1.3, 1); parte(g, "elastico", el, [0, 0, -0.08]);
      return { root: g, distancia: 0.45, centro: [0, 0, -0.03] };
    };
    MODELS.protector_facial = function () {
      var g = group("protector_facial");
      var vis = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.24, 40, 1, true, -1.2, 2.4), new THREE.MeshPhysicalMaterial({ color: "#e3f5f8", transmission: 0.85, roughness: 0.04, transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
      vis.position.set(0, -0.08, 0); parte(g, "visor", vis, [0, -0.04, 0.08]);
      var cab = mesh(new THREE.TorusGeometry(0.11, 0.012, 8, 40), mat("plastico_negro")); cab.rotation.x = Math.PI / 2; cab.position.y = 0.06; cab.scale.set(1, 1.2, 1); parte(g, "cabezal", cab, [0, 0.06, 0]);
      var aj = cyl(0.025, 0.025, 0.02, mat("plastico_gris"), 0, 0.05, -0.13); aj.rotation.x = Math.PI / 2; parte(g, "ajuste", aj, [0, 0.0, -0.08]);
      return { root: g, distancia: 0.65, centro: [0, -0.02, 0] };
    };
    MODELS.fono = function () {
      var g = group("fono");
      var dia = mesh(new THREE.TorusGeometry(0.11, 0.012, 10, 40, Math.PI), mat("#087E8B")); dia.position.y = 0.0; parte(g, "diadema", dia, [0, 0.07, 0]);
      var copas = group(), alm = group();
      [-1, 1].forEach(function (s) {
        var c = mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.05, 32), mat("#f2c200", { roughness: 0.4 })); c.rotation.z = Math.PI / 2; c.position.set(s * 0.12, -0.07, 0); c.scale.set(1, 1, 1.3); copas.add(c);
        var a = mesh(new THREE.TorusGeometry(0.045, 0.014, 10, 30), mat("plastico_negro")); a.rotation.y = Math.PI / 2; a.position.set(s * 0.093, -0.07, 0); a.scale.set(1, 1.3, 1); alm.add(a);
      });
      parte(g, "copas", copas, [0, 0, 0]); parte(g, "almohadillas", alm, [0, -0.05, 0]);
      var marc = box(0.002, 0.03, 0.04, mat("plastico_blanco"), 0.147, -0.07, 0); parte(g, "marcado", marc, [0.05, 0, 0]);
      return { root: g, distancia: 0.55, centro: [0, -0.03, 0] };
    };
    MODELS.tapones = function () {
      var g = group("tapones"), esp = group();
      [-1, 1].forEach(function (s) { var t = cyl(0.012, 0.009, 0.03, mat("#ff8a3d", { roughness: 0.9 }), s * 0.05, 0, 0); t.rotation.z = Math.PI / 2; esp.add(t); });
      parte(g, "espuma", esp, [0, 0.02, 0]);
      parte(g, "cordon", tube([[-0.065, 0, 0], [-0.04, -0.05, 0.02], [0, -0.07, 0.03], [0.04, -0.05, 0.02], [0.065, 0, 0]], 0.0025, mat("#087E8B")), [0, -0.02, 0]);
      return { root: g, distancia: 0.25, centro: [0, -0.02, 0] };
    };
    MODELS.respirador = function () {
      var g = group("respirador"), gris = mat("#5a656c", { roughness: 0.7 });
      var pieza = mesh(new THREE.SphereGeometry(0.09, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.62), gris); pieza.rotation.x = Math.PI / 2; pieza.scale.set(1, 1.15, 0.8);
      parte(g, "pieza_facial", pieza, [0, 0, 0]);
      var sello = mesh(new THREE.TorusGeometry(0.075, 0.009, 10, 40), mat("#3b4349", { roughness: 0.9 })); sello.scale.set(1, 1.2, 1); sello.position.z = -0.03; parte(g, "sello", sello, [0, 0, -0.06]);
      var ve = cyl(0.025, 0.025, 0.015, mat("plastico_negro"), 0, -0.04, 0.06); ve.rotation.x = Math.PI / 2; ve.position.set(0, -0.035, 0.065); parte(g, "valvula_exhalacion", ve, [0, -0.02, 0.06]);
      var vi = group(); [-1, 1].forEach(function (s) { var v2 = cyl(0.02, 0.02, 0.01, mat("plastico_gris"), 0, 0, 0); v2.rotation.z = Math.PI / 2; v2.position.set(s * 0.07, 0.0, 0.02); vi.add(v2); }); parte(g, "valvulas_inhalacion", vi, [0, 0, 0]);
      var fil = group(); [-1, 1].forEach(function (s) { var f = cyl(0.04, 0.04, 0.035, mat("#d24a8f", { roughness: 0.6 }), 0, 0, 0); f.rotation.z = Math.PI / 2; f.position.set(s * 0.1, 0, 0.025); fil.add(f); });
      parte(g, "filtros", fil, [0, 0, 0.0]);
      fil.userData.explode = [0, 0, 0]; fil.children.forEach(function (c, k) { c.userData.ex = k ? 0.06 : -0.06; });
      var arn = group(); arn.add(tube([[-0.07, 0.05, -0.02], [-0.11, 0.06, -0.12], [0, 0.07, -0.17], [0.11, 0.06, -0.12], [0.07, 0.05, -0.02]], 0.005, mat("#2b3138"))); arn.add(tube([[-0.07, -0.05, -0.02], [-0.1, -0.08, -0.12], [0, -0.09, -0.16], [0.1, -0.08, -0.12], [0.07, -0.05, -0.02]], 0.005, mat("#2b3138")));
      parte(g, "arnes", arn, [0, 0, -0.06]);
      return { root: g, distancia: 0.5, centro: [0, 0, 0] };
    };
    MODELS.guante = function () {
      var g = group("guante"), rec = mat("#087E8B", { roughness: 0.75 }), tej = mat("#e9ecee", { roughness: 0.95 });
      var palma = rbox(0.09, 0.11, 0.03, 0.012, rec, 0, 0, 0); parte(g, "palma", palma, [0, 0, 0.03]);
      var dorso = rbox(0.088, 0.1, 0.012, 0.005, tej, 0, 0.005, -0.017); parte(g, "dorso", dorso, [0, 0, -0.04]);
      var dedos = group(); [[-0.033, 0.06], [-0.011, 0.068], [0.011, 0.066], [0.033, 0.058]].forEach(function (d) { var f = mesh(new THREE.CapsuleGeometry(0.0105, d[1], 6, 12), rec); f.position.set(d[0], 0.11 + d[1] / 2, 0); dedos.add(f); });
      var pul = mesh(new THREE.CapsuleGeometry(0.012, 0.045, 6, 12), rec); pul.position.set(0.058, 0.04, 0.008); pul.rotation.z = -0.7; dedos.add(pul);
      parte(g, "recubrimiento", dedos, [0, 0.02, 0.02]);
      var puno = cyl(0.05, 0.052, 0.06, tej, 0, -0.1, 0); puno.scale.z = 0.5; var franja = cyl(0.051, 0.051, 0.01, mat("#e07a1f"), 0, -0.05, 0); franja.scale.z = 0.5;
      var pg = group(); pg.add(puno); pg.add(franja); parte(g, "puno", pg, [0, -0.06, 0]);
      return { root: g, distancia: 0.42, centro: [0, 0.04, 0] };
    };
    MODELS.zapato = function () {
      var g = group("zapato"), cuero = mat("#3a2a1f", { roughness: 0.55 });
      var cuerpo = rbox(0.1, 0.09, 0.27, 0.035, cuero, 0, 0.03, 0); parte(g, "cana", (function () { var gg = group(); gg.add(cuerpo); gg.add(rbox(0.09, 0.08, 0.1, 0.03, cuero, 0, 0.1, -0.08)); return gg; })(), [0, 0.04, 0]);
      var punta = mesh(new THREE.SphereGeometry(0.055, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat("#9aa3a8", { metalness: 0.7, roughness: 0.3 })); punta.scale.set(0.95, 0.85, 1.1); punta.position.set(0, 0.03, 0.1); parte(g, "puntera", punta, [0, 0.07, 0.06]);
      var plant = box(0.095, 0.006, 0.26, mat("#c9ced1", { metalness: 0.4 }), 0, 0.022, 0); parte(g, "plantilla_antiperforacion", plant, [0, 0.03, 0]);
      var suela = rbox(0.11, 0.025, 0.29, 0.01, mat("#f2c200", { roughness: 0.9 }), 0, 0, 0); var tacos = group(); tacos.add(suela); for (var i = 0; i < 8; i++) tacos.add(box(0.1, 0.006, 0.012, mat("plastico_negro"), 0, -0.006, -0.12 + i * 0.034)); parte(g, "suela", tacos, [0, -0.05, 0]);
      return { root: g, distancia: 0.6, centro: [0, 0.06, 0] };
    };
    MODELS.chaleco = function () {
      var g = group("chaleco"), fl = mat("#d7ff1f", { emissive: "#6a7f00", emissiveIntensity: 0.3, roughness: 0.8 });
      var cuerpo = group(); [-1, 1].forEach(function (s) { var p = rbox(0.17, 0.5, 0.05, 0.04, fl, s * 0.1, 0, 0.08); cuerpo.add(p); }); cuerpo.add(rbox(0.38, 0.52, 0.05, 0.04, fl, 0, 0, -0.08));
      parte(g, "material_fluorescente", cuerpo, [0, 0, 0]);
      var cintas = group(), refl = mat("#e6eaec", { metalness: 0.7, roughness: 0.15, emissive: "#555", emissiveIntensity: 0.3 });
      [0.12, 0.3].forEach(function (y) { cintas.add(box(0.4, 0.04, 0.22, refl, 0, y, 0)); });
      parte(g, "cintas_reflectantes", cintas, [0, 0, 0.06]);
      var cierre = box(0.012, 0.46, 0.012, mat("plastico_gris"), 0, 0.02, 0.11); parte(g, "cierre", cierre, [0, 0, 0.08]);
      return { root: g, distancia: 1.1, centro: [0, 0.25, 0] };
    };
    MODELS.zapatilla_electrica = function () {
      var g = group("zapatilla_electrica");
      var carc = rbox(0.36, 0.045, 0.07, 0.015, mat("plastico_blanco")); parte(g, "carcasa", carc, [0, -0.03, 0]);
      var enc = group(); for (var i = 0; i < 4; i++) { var s = box(0.05, 0.004, 0.05, mat("plastico_gris"), -0.12 + i * 0.07, 0.045, 0); enc.add(s); [-0.012, 0, 0.012].forEach(function (x) { enc.add(cyl(0.0035, 0.0035, 0.006, mat("plastico_negro"), -0.12 + i * 0.07 + x, 0.046, 0)); }); }
      parte(g, "enchufes", enc, [0, 0.03, 0]);
      var sw = rbox(0.035, 0.02, 0.03, 0.006, mat("rojo"), 0.16, 0.045, 0); parte(g, "interruptor", sw, [0.03, 0.03, 0]);
      var cab = tube([[-0.18, 0.02, 0], [-0.3, 0.02, 0.05], [-0.4, 0.02, 0.15], [-0.45, 0.02, 0.3]], 0.006, mat("cable")); parte(g, "cable", cab, [-0.03, 0, 0]);
      var marc = box(0.05, 0.002, 0.03, mat("#d9dcd6"), 0.0, -0.001, 0); parte(g, "marcado", marc, [0, -0.06, 0]);
      return { root: g, distancia: 0.75, centro: [-0.05, 0.02, 0.05] };
    };
    MODELS.alargador = function () {
      var g = group("alargador");
      var car = group(); var rr = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 32), mat("#e07a1f")); rr.rotation.z = Math.PI / 2; car.add(rr); car.add(box(0.02, 0.22, 0.02, mat("plastico_negro"), 0.05, -0.11, 0)); parte(g, "carrete", car, [0, 0, 0]);
      var ais = tube([[0, -0.08, 0.1], [0, -0.12, 0.25], [0.05, -0.12, 0.4], [0.12, -0.12, 0.5]], 0.007, mat("cable_naranjo")); parte(g, "aislacion", ais, [0, -0.03, 0.03]);
      var danio = box(0.03, 0.016, 0.016, mat("cobre"), 0.03, -0.128, 0.36); parte(g, "aislacion", danio, [0, -0.03, 0.03]);
      var macho = rbox(0.03, 0.03, 0.05, 0.008, mat("plastico_negro"), 0.12, -0.135, 0.53); parte(g, "enchufe_macho", macho, [0.04, 0, 0.04]);
      var hem = rbox(0.06, 0.04, 0.04, 0.01, mat("plastico_negro"), 0, 0.12, 0); parte(g, "enchufe_hembra", hem, [0, 0.05, 0]);
      return { root: g, distancia: 0.9, centro: [0.05, -0.05, 0.2] };
    };
    MODELS.operario = function () {
      var g = group("operario");
      var p = persona("#3d5566", false, false); g.add(p);
      var casco = mesh(new THREE.SphereGeometry(0.135, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat("#f4f5f1", { roughness: 0.35 })); casco.position.y = 1.6; var al = cyl(0.17, 0.17, 0.015, mat("#f4f5f1"), 0, 1.6, 0.02); var cg = group(); cg.add(casco); cg.add(al); parte(g, "cabeza", cg, [0, 0.12, 0]);
      var lent = box(0.2, 0.04, 0.02, new THREE.MeshPhysicalMaterial({ color: "#d8f1f5", transmission: 0.8, transparent: true, opacity: 0.6 }), 0, 1.57, 0.12); parte(g, "ojos", lent, [0, 0, 0.08]);
      var fon = group(); [-1, 1].forEach(function (s) { var c = cyl(0.045, 0.045, 0.04, mat("#f2c200"), 0, 0, 0); c.rotation.z = Math.PI / 2; c.position.set(s * 0.135, 1.57, 0); fon.add(c); }); parte(g, "oidos", fon, [0, 0, 0]);
      fon.children.forEach(function (c, k) { c.userData.ex = k ? 0.06 : -0.06; });
      var resp = mesh(new THREE.SphereGeometry(0.06, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), mat("#5a656c")); resp.rotation.x = Math.PI / 2; resp.position.set(0, 1.5, 0.1); parte(g, "vias_respiratorias", resp, [0, 0, 0.1]);
      var gu = group(); [-1, 1].forEach(function (s) { var gg = rbox(0.08, 0.1, 0.05, 0.02, mat("#087E8B"), s * 0.31, 0.45, 0); gu.add(gg); }); parte(g, "manos", gu, [0, -0.05, 0.05]);
      var zp = group(); [-1, 1].forEach(function (s) { zp.add(rbox(0.13, 0.1, 0.3, 0.04, mat("#3a2a1f"), s * 0.1, 0, 0.05)); zp.add(box(0.14, 0.02, 0.31, mat("#f2c200"), s * 0.1, 0, 0.05)); }); parte(g, "pies", zp, [0, -0.06, 0.06]);
      var ch = group(); ch.add(rbox(0.45, 0.5, 0.27, 0.1, mat("#d7ff1f", { emissive: "#5a6a00", emissiveIntensity: 0.25 }), 0, 0.86, 0)); ch.add(box(0.46, 0.04, 0.28, mat("#e6eaec", { metalness: 0.6, roughness: 0.2 }), 0, 1.0, 0)); parte(g, "cuerpo", ch, [0, 0, 0.1]);
      return { root: g, distancia: 2.6, centro: [0, 0.95, 0] };
    };

    return { tex: tex, mat: mat, SCENES: SCENES, MODELS: MODELS, box: box, cyl: cyl, group: group };
  };
})();
