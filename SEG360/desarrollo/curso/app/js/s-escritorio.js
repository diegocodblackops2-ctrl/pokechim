/* Seguridad 360 · computador simulado de Pehuén: escritorio con apps (correo, navegador, archivos, teléfono, chat interno,
   configuración y asistente de IA) y misiones. Todo es inocuo: los links no abren nada y los formularios no reciben datos. */
(function () {
  "use strict";
  var S = window.S360, u = S.u, h = u.h, media = S.media;
  var T = S.tipos = S.tipos || {};
  var APPS = {
    correo: { nombre: "Correo", icono: "mail" },
    navegador: { nombre: "Navegador", icono: "globe" },
    archivos: { nombre: "Archivos", icono: "folder" },
    chat: { nombre: "Chat interno", icono: "messages-square" },
    configuracion: { nombre: "Configuración", icono: "settings" },
    asistente_ia: { nombre: "Asistente de IA", icono: "bot" },
    telefono: { nombre: "Celular", icono: "smartphone" }
  };

  function dominioUrl(url) { var m = String(url || "").match(/^(\w+):\/\/([^/]+)(.*)$/); return m ? { prot: m[1], host: m[2], resto: m[3] } : { prot: "", host: url, resto: "" }; }

  T.escritorio = function (scr, ctx) {
    var w = h("div", { class: "pc-w" });
    if (scr.consigna || scr.texto) w.appendChild(u.prose(scr.consigna || scr.texto, "prose consigna"));
    var r0 = ctx.result() || {};
    var resp = JSON.parse(JSON.stringify(r0.resp || {}));
    var items = {};
    ["correo", "navegador", "archivos", "telefono", "chat", "configuracion", "asistente_ia"].forEach(function (app) {
      (scr[app] || []).forEach(function (it) { items[it.id] = { app: app, it: it }; });
    });
    var misiones = scr.misiones || [];
    var persona = (window.S360_DATA.curso.personajes || {})[scr.usuario] || { nombre: "Persona de Pehuén" };

    var pc = h("div", { class: "pc", role: "application", "aria-label": "Computador simulado" });
    var escritorio = h("div", { class: "pc-escritorio" });
    var ventana = h("div", { class: "pc-ventana", hidden: true, role: "dialog" });
    var barra = h("div", { class: "pc-barra", role: "toolbar", "aria-label": "Apps" });
    var misionesEl = h("aside", { class: "pc-misiones", "aria-label": "Misiones" });
    var reloj = h("span", { class: "pc-reloj" }, scr.hora || "16:30");
    escritorio.appendChild(h("div", { class: "pc-fondo", "aria-hidden": "true" }, h("span", { class: "pc-logo" }, S.marca(), h("b", null, "Pehuén"), " Distribución")));
    var iconosEsc = h("div", { class: "pc-iconos" });
    escritorio.appendChild(iconosEsc);
    escritorio.appendChild(ventana);
    var notif = h("div", { class: "pc-notif", "aria-live": "polite" });
    escritorio.appendChild(notif);
    pc.appendChild(h("div", { class: "pc-cuerpo" }, escritorio, misionesEl));
    pc.appendChild(barra);
    w.appendChild(pc);

    var appsPresentes = Object.keys(APPS).filter(function (a) { return (scr[a] || []).length; });
    function pendientes(app) { return (scr[app] || []).filter(function (it) { return !(resp[it.id] && resp[it.id].ok); }).length; }
    function pintarBarra() {
      u.clear(barra); u.clear(iconosEsc);
      barra.appendChild(h("span", { class: "pc-inicio" }, S.marca()));
      appsPresentes.forEach(function (a) {
        var p = pendientes(a);
        var b = h("button", { type: "button", class: "pc-app" + (abierta === a ? " on" : ""), "aria-label": APPS[a].nombre + (p ? ", " + p + " por revisar" : "") }, u.icon(APPS[a].icono), h("span", { class: "pc-app-n" }, APPS[a].nombre), p ? h("b", { class: "pc-badge" }, String(p)) : null);
        b.addEventListener("click", function () { abrir(a); });
        barra.appendChild(b);
        iconosEsc.appendChild(h("button", { type: "button", class: "pc-icono", onclick: function () { abrir(a); } }, h("span", null, u.icon(APPS[a].icono)), APPS[a].nombre, p ? h("b", { class: "pc-badge" }, String(p)) : null));
      });
      barra.appendChild(h("span", { class: "pc-usuario" }, u.icon("circle-user"), persona.nombre.split(" ")[0]));
      barra.appendChild(reloj);
    }
    function pintarMisiones() {
      u.clear(misionesEl);
      var hechas = misiones.filter(function (m) { return resp[m.elemento] && resp[m.elemento].ok; }).length;
      misionesEl.appendChild(h("div", { class: "pm-cab" }, h("p", { class: "kicker" }, u.icon("list-checks"), "Misiones"), h("span", { class: "pm-cont" }, hechas + "/" + misiones.length)));
      var ol = h("ol");
      misiones.forEach(function (m) {
        var r = resp[m.elemento], ok = r && r.ok;
        ol.appendChild(h("li", { class: ok ? "ok" : r ? "intentada" : "" }, h("button", { type: "button", onclick: function () { abrir(m.app, m.elemento); } }, u.icon(ok ? "circle-check" : "circle"), h("span", null, m.texto))));
      });
      misionesEl.appendChild(ol);
      if (hechas === misiones.length && misiones.length) {
        var primeras = misiones.filter(function (m) { return resp[m.elemento] && resp[m.elemento].primera; }).length;
        misionesEl.appendChild(h("div", { class: "pm-fin" }, u.icon("trophy"), h("p", null, h("b", null, "Misiones cumplidas. "), primeras + " de " + misiones.length + " resueltas al primer intento.")));
      }
      return hechas;
    }
    var abierta = null, elementoSel = null;
    function abrir(app, elemId) {
      abierta = app; elementoSel = elemId || null;
      media.sfx("abrir");
      ventana.hidden = false;
      u.clear(ventana);
      ventana.setAttribute("aria-label", APPS[app].nombre);
      ventana.appendChild(h("div", { class: "pc-vtit" }, u.icon(APPS[app].icono), h("b", null, APPS[app].nombre), h("span", { class: "pc-vctl" }, h("i"), h("i"), h("button", { type: "button", "aria-label": "Cerrar " + APPS[app].nombre, onclick: cerrar }, u.icon("x")))));
      var cuerpo = h("div", { class: "pc-vcuerpo app-" + app });
      ventana.appendChild(cuerpo);
      RENDER[app](cuerpo, elemId);
      pintarBarra();
      var f = ventana.querySelector(".pc-vcuerpo button, .pc-vcuerpo [tabindex]"); if (f) f.focus({ preventScroll: true });
    }
    function cerrar() { ventana.hidden = true; abierta = null; pintarBarra(); }

    /* Acciones de un elemento: botones, feedback y registro. */
    function acciones(it, cont) {
      var box = h("div", { class: "pc-acc" }, h("p", { class: "kicker" }, "¿Qué haces?"));
      var out = h("div", { class: "pc-out" });
      var r = resp[it.id];
      (it.acciones || []).forEach(function (a) {
        var elegida = r && r.sel && r.sel.indexOf(a.id) >= 0;
        var b = h("button", { type: "button", class: "pc-btn-acc" + (elegida ? (a.correcta ? " ok" : " mal") : "") }, h("span", null, a.texto));
        b.addEventListener("click", function () { decidir(it, a, out, box); });
        box.appendChild(b);
      });
      cont.appendChild(box); cont.appendChild(out);
      if (r && r.ultima) { var a0 = (it.acciones || []).filter(function (x) { return x.id === r.ultima; })[0]; if (a0) out.appendChild(S.fb(a0.correcta ? "ok" : "mal", a0.feedback, a0.correcta ? "Bien resuelto" : "No es lo mejor")); }
    }
    function decidir(it, a, out, box) {
      var r = resp[it.id] || { sel: [] };
      if (r.sel.indexOf(a.id) < 0) r.sel.push(a.id);
      if (r.primera === undefined) r.primera = !!a.correcta;
      r.ultima = a.id;
      if (a.correcta) r.ok = true;
      resp[it.id] = r;
      u.$$(".pc-btn-acc", box).forEach(function (b, k) { var ac = it.acciones[k]; if (r.sel.indexOf(ac.id) >= 0) b.classList.add(ac.correcta ? "ok" : "mal"); });
      u.clear(out);
      out.appendChild(S.fb(a.correcta ? "ok" : "mal", a.feedback, a.correcta ? "Bien resuelto" : "No es lo mejor"));
      var hechas = pintarMisiones();
      var todas = misiones.length && hechas === misiones.length;
      var sc = misiones.length ? misiones.filter(function (m) { return resp[m.elemento] && resp[m.elemento].primera; }).length / misiones.length : 1;
      ctx.save({ resp: resp, done: todas || undefined, sc: sc });
      pintarBarra();
      if (todas) { media.sfx("logro"); u.toast("Cumpliste todas las misiones.", "ok"); }
    }

    /* ---------- Apps ---------- */
    var RENDER = {
      correo: function (c, sel) {
        var lista = h("ul", { class: "correo-lista" }), lector = h("div", { class: "correo-lector" });
        function ver(it) {
          u.$$(".correo-it", lista).forEach(function (x) { x.classList.toggle("abierto", x.dataset.id === it.id); });
          u.clear(lector);
          var dom = S.dominio(it.de_correo);
          lector.appendChild(h("div", { class: "cl-cab" }, h("h2", null, it.asunto),
            h("div", { class: "cl-de" }, h("span", { class: "ci-av" }, (it.de_nombre || "?").charAt(0)),
              h("div", null, h("b", null, it.de_nombre), " ", h("button", { type: "button", class: "dir-correo", onclick: function (ev) { ev.currentTarget.classList.toggle("ver"); } }, "<", h("span", { class: "dir-u" }, String(it.de_correo || "").replace("@" + dom, "")), h("span", { class: "dir-d" }, "@" + dom), ">"),
                h("small", null, "Para: " + (it.para || "mí") + " · " + (it.fecha || ""))))));
          lector.appendChild(S.cuerpoCorreo(it));
          if ((it.adjuntos || []).length) lector.appendChild(h("div", { class: "adjuntos" }, it.adjuntos.map(function (a) { return h("button", { type: "button", class: "adjunto", onclick: function () { u.toast("En esta simulación los adjuntos no se abren. Fíjate en el nombre y en quién lo envía.", "info"); } }, u.icon("paperclip"), a); })));
          acciones(it, lector);
        }
        (scr.correo || []).forEach(function (it) {
          var r = resp[it.id];
          var li = h("li", { class: "correo-it" + (r ? (r.ok ? " bien" : " mal") : " nuevo"), "data-id": it.id, tabindex: "0", role: "button" },
            h("span", { class: "ci-av" }, (it.de_nombre || "?").charAt(0)),
            h("span", { class: "ci-txt" }, h("b", null, it.de_nombre), h("span", { class: "ci-asunto" }, it.asunto), h("small", null, (it.cuerpo || "").replace(/\n/g, " ").slice(0, 60) + "…")),
            h("span", { class: "ci-meta" }, h("small", null, it.fecha || ""), h("span", { class: "ci-estado" })));
          li.addEventListener("click", function () { ver(it); });
          li.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ver(it); } });
          lista.appendChild(li);
        });
        c.appendChild(h("div", { class: "correo-cuerpo-app" }, h("div", { class: "correo-col" }, h("p", { class: "cc-tit" }, u.icon("inbox"), "Recibidos"), lista), lector));
        var first = sel ? (scr.correo || []).filter(function (x) { return x.id === sel; })[0] : (scr.correo || [])[0];
        if (first) ver(first);
      },
      navegador: function (c, sel) {
        var pags = scr.navegador || [];
        var tabs = h("div", { class: "nav-tabs", role: "tablist" });
        var vista = h("div", { class: "nav-vista" });
        function ver(it) {
          u.$$(".nav-tab", tabs).forEach(function (t) { t.classList.toggle("on", t.dataset.id === it.id); t.setAttribute("aria-selected", String(t.dataset.id === it.id)); });
          u.clear(vista);
          var d = dominioUrl(it.url);
          vista.appendChild(h("div", { class: "nav-url" }, u.icon(d.prot === "https" ? "lock" : "lock-open"), h("span", { class: "url-p" }, d.prot ? d.prot + "://" : ""), h("b", { class: "url-h" }, d.host), h("span", { class: "url-r" }, d.resto)));
          var pag = h("div", { class: "nav-pag tipo-" + (it.tipo || "sitio") });
          pag.appendChild(h("h2", null, it.titulo));
          pag.appendChild(u.prose(it.contenido, "prose"));
          if (it.tipo === "login") pag.appendChild(h("div", { class: "nav-form", "aria-hidden": "true" }, h("label", null, "Correo", h("input", { type: "text", readonly: true, tabindex: "-1", value: "" })), h("label", null, "Contraseña", h("input", { type: "text", readonly: true, tabindex: "-1", value: "" })), h("span", { class: "nav-btn-falso" }, "Ingresar")));
          if (it.tipo === "descarga") pag.appendChild(h("div", { class: "nav-desc", "aria-hidden": "true" }, u.icon("download"), h("span", null, "Descargar")));
          vista.appendChild(pag);
          acciones(it, vista);
        }
        pags.forEach(function (it) {
          var d = dominioUrl(it.url);
          var t = h("button", { type: "button", role: "tab", class: "nav-tab", "data-id": it.id }, u.icon("globe"), h("span", null, it.titulo || d.host));
          t.addEventListener("click", function () { ver(it); });
          tabs.appendChild(t);
        });
        c.appendChild(tabs); c.appendChild(vista);
        var first = sel ? pags.filter(function (x) { return x.id === sel; })[0] : pags[0];
        if (first) ver(first);
      },
      archivos: function (c, sel) {
        var lista = h("ul", { class: "arch-lista" }), det = h("div", { class: "arch-det" });
        function ver(it) {
          u.$$(".arch-it", lista).forEach(function (x) { x.classList.toggle("on", x.dataset.id === it.id); });
          u.clear(det);
          det.appendChild(h("h2", null, u.icon(/\.xlsx?$/i.test(it.nombre) ? "file-spreadsheet" : /\.pdf$/i.test(it.nombre) ? "file-text" : "file"), it.nombre));
          det.appendChild(h("dl", { class: "arch-meta" },
            it.ubicacion ? h("div", null, h("dt", null, "Ubicación"), h("dd", null, it.ubicacion)) : null,
            it.compartido ? h("div", null, h("dt", null, "Compartido"), h("dd", null, it.compartido)) : null,
            it.clasificacion ? h("div", null, h("dt", null, "Clasificación"), h("dd", null, it.clasificacion)) : null,
            it.contenido ? h("div", null, h("dt", null, "Contenido"), h("dd", null, it.contenido)) : null));
          acciones(it, det);
        }
        (scr.archivos || []).forEach(function (it) {
          var r = resp[it.id];
          var li = h("li", { class: "arch-it" + (r ? (r.ok ? " bien" : " mal") : ""), "data-id": it.id, tabindex: "0", role: "button" }, u.icon("file-text"), h("span", null, h("b", null, it.nombre), h("small", null, it.compartido || it.ubicacion || "")));
          li.addEventListener("click", function () { ver(it); });
          li.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ver(it); } });
          lista.appendChild(li);
        });
        c.appendChild(h("div", { class: "arch" }, lista, det));
        var first = sel ? (scr.archivos || []).filter(function (x) { return x.id === sel; })[0] : (scr.archivos || [])[0];
        if (first) ver(first);
      },
      telefono: function (c, sel) {
        var tel = h("div", { class: "telefono pc-tel" }, h("div", { class: "tel-top" }, h("span", null, scr.hora || "16:30"), h("span", { class: "tel-icos" }, u.icon("signal"), u.icon("wifi"), u.icon("battery-medium"))));
        var lst = h("div", { class: "tel-notifs" }), det = h("div", { class: "tel-det" });
        function ver(it) {
          u.clear(det);
          var ic = { mfa: "shield-question", sms: "message-square", whatsapp: "message-circle", llamada: "phone-incoming" }[it.tipo] || "bell";
          det.appendChild(h("div", { class: "tel-card tipo-" + it.tipo }, h("p", { class: "tel-rem" }, u.icon(ic), h("b", null, it.remitente || ""), h("small", null, it.hora || "")), u.prose(it.texto, "prose")));
          if (it.tipo === "mfa") det.appendChild(h("div", { class: "mfa-falso", "aria-hidden": "true" }, h("span", { class: "mfa-no" }, "Rechazar"), h("span", { class: "mfa-si" }, "Aprobar")));
          acciones(it, det);
        }
        (scr.telefono || []).forEach(function (it) {
          var r = resp[it.id];
          var b = h("button", { type: "button", class: "tel-notif" + (r ? (r.ok ? " bien" : " mal") : " nueva") }, u.icon({ mfa: "shield-question", sms: "message-square", whatsapp: "message-circle", llamada: "phone-incoming" }[it.tipo] || "bell"), h("span", null, h("b", null, it.remitente || ""), h("small", null, (it.texto || "").slice(0, 60) + "…")));
          b.addEventListener("click", function () { ver(it); });
          lst.appendChild(b);
        });
        tel.appendChild(lst);
        c.appendChild(h("div", { class: "tel-lay" }, tel, det));
        var first = sel ? (scr.telefono || []).filter(function (x) { return x.id === sel; })[0] : (scr.telefono || [])[0];
        if (first) ver(first);
      },
      chat: function (c, sel) {
        var hilo = h("div", { class: "chat-int" });
        (scr.chat || []).forEach(function (it) {
          var r = resp[it.id];
          var msg = h("div", { class: "ci-msj" + (sel === it.id ? " foco" : "") }, h("span", { class: "ci-av" }, (it.de || "?").charAt(0)), h("div", null, h("p", null, h("b", null, it.de || ""), " ", h("small", null, it.hora || "")), u.prose(it.texto, "prose")));
          var box = h("div", { class: "ci-acc" });
          var abrirB = h("button", { type: "button", class: "btn btn-sec btn-mini" + (r && r.ok ? " ok" : "") }, u.icon(r && r.ok ? "check" : "reply"), r && r.ok ? "Resuelto" : "Decidir qué hacer");
          abrirB.addEventListener("click", function () { u.clear(box); acciones(it, box); });
          msg.lastChild.appendChild(abrirB);
          msg.lastChild.appendChild(box);
          hilo.appendChild(msg);
          if (sel === it.id) acciones(it, box);
        });
        c.appendChild(hilo);
      },
      configuracion: function (c, sel) {
        var lst = h("div", { class: "cfg-lista" });
        (scr.configuracion || []).forEach(function (it) {
          var r = resp[it.id];
          var det = h("div", { class: "cfg-det", hidden: sel !== it.id && !(!sel && it === scr.configuracion[0]) });
          var fila = h("div", { class: "cfg-it" + (r ? (r.ok ? " bien" : " mal") : "") },
            h("button", { type: "button", class: "cfg-btn", onclick: function () { det.hidden = !det.hidden; if (!det.hidden && !det.childNodes.length) acciones(it, det); } }, u.icon(it.icono || "settings-2"), h("span", null, h("b", null, it.titulo), h("small", null, it.estado || "")), u.icon("chevron-down")), det);
          if (!det.hidden) acciones(it, det);
          lst.appendChild(fila);
        });
        c.appendChild(lst);
      },
      asistente_ia: function (c, sel) {
        (scr.asistente_ia || []).forEach(function (it) {
          if (sel && sel !== it.id && (scr.asistente_ia || []).length > 1) return;
          var aut = it.herramienta === "autorizada";
          var box = h("div", { class: "ia-app" }, h("div", { class: "ia-cab" }, u.icon("bot"), h("b", null, it.nombre_herramienta || (aut ? "Asistente corporativo de Pehuén" : "Asistente web gratuito")), h("span", { class: "ia-tag " + (aut ? "ok" : "no") }, aut ? "Autorizada por Pehuén" : "No autorizada por Pehuén")),
            h("div", { class: "ia-chat" }, h("p", { class: "ia-hint" }, "Lo que la persona estaba por enviar:"), h("div", { class: "ia-borrador" }, u.prose(it.borrador, "prose"))));
          acciones(it, box);
          c.appendChild(box);
        });
      }
    };

    pintarBarra(); pintarMisiones();
    // aviso inicial de notificación del celular
    if ((scr.telefono || []).some(function (t) { return !(resp[t.id] && resp[t.id].ok); })) {
      setTimeout(function () {
        var t = (scr.telefono || []).filter(function (x) { return !(resp[x.id] && resp[x.id].ok); })[0];
        if (!t) return;
        var n = h("button", { type: "button", class: "pc-toast" }, u.icon("smartphone"), h("span", null, h("b", null, t.remitente || "Celular"), h("small", null, (t.texto || "").slice(0, 70) + "…")));
        n.addEventListener("click", function () { n.remove(); abrir("telefono", t.id); });
        notif.appendChild(n); media.sfx("notificacion");
        setTimeout(function () { n.classList.add("fuera"); }, 9000);
      }, 2500);
    }
    return w;
  };
})();
