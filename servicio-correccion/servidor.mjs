#!/usr/bin/env node
/* Servicio de corrección de REFERENCIA · Curso 5 · IA para trabajar mejor
   ---------------------------------------------------------------------------------------------
   Propósito: demostrar y probar el contrato que necesita el SCO de evaluación. NO es infraestructura
   de producción de Dibork Learning y no se despliega por este encargo. El responsable del LMS decide
   cómo implementarlo sobre Firebase/Google Cloud (ver docs/INTEGRACION_DIBORK.md).

   - Lee el banco privado (128 unidades con claves) y los proyectos A/B SOLO en el servidor.
   - Verifica requisitos (17 SCO completos) antes de entregar una forma.
   - Entrega la forma sin claves; guarda respuestas; corrige 3 (decisión) + 2 (evidencia) por unidad.
   - Libera la devolución solo después de entregar la forma completa.
   - Proyecto: borrador → pendiente de revisión → revisado por una persona con rol revisor.
   - Nota global = 0,4 × situaciones + 0,6 × proyecto; aprueba con global ≥ 80, proyecto ≥ 75,
     revisión real y sin fallo crítico pendiente (umbrales editoriales provisionales del maestro v3).

   Uso (desarrollo):
     IATU_MODO=desarrollo node servicio-correccion/servidor.mjs --puerto 8790 --estatico curso
   Producción: IATU_SECRETO=<clave HMAC> y tokens firmados emitidos por el LMS (sin modo desarrollo).
   Sin dependencias externas (Node 18+). */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith("--") ? a.concat([[v.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : true]]) : a), []));
const PUERTO = parseInt(args.puerto || process.env.PORT || "8790", 10);
const DEV = process.env.IATU_MODO === "desarrollo";
const SECRETO = process.env.IATU_SECRETO || "";
const PRIVADO = process.env.IATU_PRIVADO || path.join(__dirname, "data", "evaluacion_privada.json");
const REGISTROS = process.env.IATU_REGISTROS || path.join(__dirname, "registros");
const ESTATICO = args.estatico ? path.resolve(String(args.estatico)) : null;
const MAX_INTENTOS = 2;
const SCOS = ["orientacion", ...Array.from({ length: 16 }, (_, i) => "m" + String(i + 1).padStart(2, "0"))];

if (!DEV && !SECRETO) { console.error("Falta IATU_SECRETO (o IATU_MODO=desarrollo para pruebas locales)."); process.exit(1); }
const P = JSON.parse(fs.readFileSync(PRIVADO, "utf8"));
const BANK = P.bank;
const UNIDADES = Object.fromEntries(BANK.units.map((u) => [u.id, u]));
fs.mkdirSync(REGISTROS, { recursive: true });

/* ---------- Identidad ---------- */
function identidad(req) {
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!t) return null;
  if (DEV && /^dev:[\w.\-@]{1,80}$/.test(t)) return { sub: t.slice(4), rol: "participante" };
  if (DEV && /^revisor:[\w.\-@]{1,80}$/.test(t)) return { sub: t.slice(8), rol: "revisor" };
  // Token firmado por el LMS: base64url(JSON{sub,rol,exp}) + "." + base64url(HMAC-SHA256)
  const [b, s] = t.split(".");
  if (!b || !s || !SECRETO) return null;
  const esperado = crypto.createHmac("sha256", SECRETO).update(b).digest("base64url");
  if (esperado.length !== s.length || !crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(s))) return null;
  try {
    const p = JSON.parse(Buffer.from(b, "base64url").toString("utf8"));
    if (!p.sub || (p.exp && Date.now() / 1000 > p.exp)) return null;
    return { sub: String(p.sub), rol: p.rol === "revisor" ? "revisor" : "participante" };
  } catch { return null; }
}

/* ---------- Registro por participante (archivo JSON; en producción, la base autorizada) ---------- */
const rutaReg = (sub) => path.join(REGISTROS, crypto.createHash("sha256").update(sub).digest("hex").slice(0, 32) + ".json");
function leer(sub) {
  try { return JSON.parse(fs.readFileSync(rutaReg(sub), "utf8")); }
  catch { return { sub, progreso: {}, estado: {}, intentos: [], proyecto: null }; }
}
function escribir(reg) {
  const tmp = rutaReg(reg.sub) + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(reg));
  fs.renameSync(tmp, rutaReg(reg.sub));
}
function todos() {
  return fs.readdirSync(REGISTROS).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(REGISTROS, f), "utf8")));
}

/* ---------- Reglas ---------- */
function faltantes(reg) { return SCOS.filter((s) => !(reg.progreso[s] && reg.progreso[s].complete)); }
function unidadPublica(u) {
  return { id: u.id, module: u.module, title: u.title, input: u.input, task: u.task, response_format: u.response_format,
    options: u.options.map((o) => ({ id: o.id, text: o.text })), evidence_options: u.evidence_options.map((o) => ({ id: o.id, text: o.text })),
    time_minutes: u.time_minutes };
}
function intentoPublico(a, conResultado) {
  const o = { id: a.id, forma: a.forma, numero: a.numero, estado: a.estado, iniciado: a.iniciado, entregado: a.entregado, posicion: a.posicion || 0 };
  if (a.estado === "en_curso") { o.unidades = BANK.forms[a.forma].unit_ids.map((id) => unidadPublica(UNIDADES[id])); o.respuestas = a.respuestas || {}; }
  if (conResultado && a.resultado) o.resultado = a.resultado;
  return o;
}
function corregir(a) {
  const R = BANK.scoring_rule;
  let bruto = 0;
  const porModulo = {};
  const unidades = BANK.forms[a.forma].unit_ids.map((id) => {
    const u = UNIDADES[id], r = (a.respuestas || {})[id] || {};
    const dOk = r.d === u.key.decision, eOk = r.e === u.key.evidence;
    const pts = (dOk ? R.decision : 0) + (eOk ? R.evidence : 0);
    bruto += pts;
    const m = String(u.module).padStart(2, "0");
    porModulo[m] = porModulo[m] || { puntos: 0, maximo: 0 };
    porModulo[m].puntos += pts; porModulo[m].maximo += R.max_unit;
    const od = u.options.find((o) => o.id === r.d), oe = u.evidence_options.find((o) => o.id === r.e);
    return { id, titulo: u.title, d: r.d || null, e: r.e || null, d_ok: dOk, e_ok: eOk, puntos: pts,
      razon_d: od ? od.rationale : null, razon_e: oe ? oe.rationale : null, justificacion: u.key_justification,
      siguiente: u.feedback.next_action, meta: u.feedback.goal };
  });
  const maximo = BANK.forms[a.forma].max_points;
  return { bruto, maximo, normalizado: (100 * bruto) / maximo, por_modulo: porModulo, unidades };
}
function formaProyecto(reg) {
  const ult = reg.intentos[reg.intentos.length - 1];
  return ult ? ult.forma : "A";
}
function resultado(reg) {
  const entregados = reg.intentos.filter((a) => a.estado === "entregado");
  const ult = entregados[entregados.length - 1];
  const banco = ult ? ult.resultado.normalizado : null;
  const pr = reg.proyecto;
  const pe = pr ? pr.estado : null;
  const proy = pe === "revisado" ? pr.revision.puntaje : null;
  const global = banco !== null && proy !== null ? 0.4 * banco + 0.6 * proy : null; // sin redondeo previo
  let estado = "pendiente";
  if (global !== null) {
    if (pr.revision.critico) estado = "pendiente_subsanacion";
    else estado = global >= 80 && proy >= 75 ? "aprobado" : "no_aprobado";
  }
  return { banco, proyecto: proy, proyecto_estado: pe, global, estado,
    reglas: "Global = 0,4 × situaciones + 0,6 × proyecto, sin redondeo previo. Aprobación: global ≥ 80, proyecto ≥ 75, revisión humana real y sin fallo crítico pendiente. Umbrales editoriales provisionales del maestro v3." };
}

/* ---------- HTTP ---------- */
function enviar(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(JSON.stringify(obj));
}
function cuerpo(req) {
  return new Promise((ok, fail) => {
    let b = ""; req.on("data", (c) => { b += c; if (b.length > 2e6) { fail(new Error("cuerpo demasiado grande")); req.destroy(); } });
    req.on("end", () => { try { ok(b ? JSON.parse(b) : {}); } catch (e) { fail(e); } });
  });
}
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".vtt": "text/vtt; charset=utf-8", ".json": "application/json", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".csv": "text/csv; charset=utf-8", ".txt": "text/plain; charset=utf-8" };
function estatico(req, res, url) {
  if (url.pathname === "/config.js" && DEV) {
    res.writeHead(200, { "Content-Type": MIME[".js"] });
    return res.end(`/* Configuración de DESARROLLO servida por el servicio de referencia. */
window.IATU_CONFIG={base:"",banner:"Entorno de desarrollo: servicio de corrección de referencia con identidad de prueba (no es Dibork Learning).",
servicio:{url:location.origin,token:function(id){return "dev:"+id;}}};`);
  }
  if (url.pathname === "/revisor" || url.pathname === "/revisor.html") {
    res.writeHead(200, { "Content-Type": MIME[".html"] });
    return res.end(fs.readFileSync(path.join(__dirname, "revisor.html")));
  }
  if (!ESTATICO) return enviar(res, 404, { error: "no_encontrado" });
  let p = decodeURIComponent(url.pathname); if (p === "/") p = "/index.html";
  const f = path.resolve(ESTATICO, "." + p);
  if (!f.startsWith(ESTATICO)) return enviar(res, 403, { error: "prohibido" });
  fs.stat(f, (err, st) => {
    if (err || !st.isFile()) return enviar(res, 404, { error: "no_encontrado" });
    const range = req.headers.range;
    const type = MIME[path.extname(f).toLowerCase()] || "application/octet-stream";
    if (range && /^bytes=\d*-\d*$/.test(range)) {
      let [s, e] = range.slice(6).split("-").map((x) => (x === "" ? null : parseInt(x, 10)));
      if (s === null) { s = st.size - e; e = st.size - 1; } if (e === null || e >= st.size) e = st.size - 1;
      res.writeHead(206, { "Content-Type": type, "Content-Range": `bytes ${s}-${e}/${st.size}`, "Accept-Ranges": "bytes", "Content-Length": e - s + 1 });
      return fs.createReadStream(f, { start: s, end: e }).pipe(res);
    }
    res.writeHead(200, { "Content-Type": type, "Content-Length": st.size, "Accept-Ranges": "bytes" });
    fs.createReadStream(f).pipe(res);
  });
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (!url.pathname.startsWith("/api/")) return estatico(req, res, url);
  const yo = identidad(req);
  if (!yo) return enviar(res, 401, { error: "no_autenticado", message: "Token ausente o inválido." });
  const seg = url.pathname.split("/").filter(Boolean).slice(2); // tras /api/v1
  const M = req.method;
  try {
    /* ----- Revisión humana (rol revisor) ----- */
    if (seg[0] === "revision") {
      if (yo.rol !== "revisor") return enviar(res, 403, { error: "prohibido", message: "Requiere rol revisor." });
      if (M === "GET" && seg.length === 2 && seg[1] === "pendientes") {
        return enviar(res, 200, { pendientes: todos().filter((r) => r.proyecto && r.proyecto.estado === "pendiente_revision").map((r) => ({ id: crypto.createHash("sha256").update(r.sub).digest("hex").slice(0, 32), forma: r.proyecto.forma, entregado: r.proyecto.entregado })) });
      }
      const reg = todos().find((r) => crypto.createHash("sha256").update(r.sub).digest("hex").slice(0, 32) === seg[1]);
      if (!reg || !reg.proyecto) return enviar(res, 404, { error: "no_encontrado" });
      if (M === "GET") {
        const f = reg.proyecto.forma, pr = P.projects[f];
        return enviar(res, 200, { entrega: reg.proyecto, brief: P.projects_public[f], rubrica: P.rubric,
          privado: { modelo: pr.model, anclas: pr.anchors, actualizacion_resuelta: pr.update_model, soluciones: P.project_solutions } });
      }
      if (M === "POST") {
        const b = await cuerpo(req);
        const niveles = b.niveles || {};
        for (const c of P.rubric) if (![0, 1, 2, 3].includes(niveles[c.id])) return enviar(res, 400, { error: "niveles_incompletos", message: "Asigna nivel 0–3 a " + c.id });
        const puntaje = P.rubric.reduce((s, c) => s + (c.weight * niveles[c.id]) / 3, 0);
        reg.proyecto.estado = "revisado";
        reg.proyecto.revision = { niveles, comentarios: b.comentarios || {}, critico: !!b.critico, critico_detalle: b.critico_detalle || "", puntaje, revisor: yo.sub, fecha: new Date().toISOString() };
        escribir(reg);
        return enviar(res, 200, { ok: true, puntaje });
      }
    }
    if (yo.rol !== "participante") return enviar(res, 403, { error: "prohibido" });
    const reg = leer(yo.sub);

    if (seg[0] === "progreso" && M === "PUT" && SCOS.includes(seg[1])) {
      const b = await cuerpo(req);
      reg.progreso[seg[1]] = { done: +b.done || 0, total: +b.total || 0, complete: !!b.complete && +b.done === +b.total && +b.total > 0, cv: b.cv, t: new Date().toISOString() };
      escribir(reg); return enviar(res, 200, { ok: true });
    }
    if (seg[0] === "estado" && seg[1]) {
      if (M === "PUT") { const b = await cuerpo(req); reg.estado[seg[1]] = { cv: b.cv, state: b.state, t: new Date().toISOString() }; escribir(reg); return enviar(res, 200, { ok: true }); }
      if (M === "GET") return enviar(res, 200, reg.estado[seg[1]] || {});
    }
    if (seg[0] === "requisitos" && M === "GET") { const f = faltantes(reg); return enviar(res, 200, { ok: f.length === 0, faltan: f }); }

    if (seg[0] === "intentos") {
      if (M === "GET" && seg[1] === "actual") {
        const ult = reg.intentos[reg.intentos.length - 1];
        return enviar(res, 200, { intento: ult ? intentoPublico(ult, ult.estado === "entregado") : null, usados: reg.intentos.length, maximo: MAX_INTENTOS });
      }
      if (M === "POST" && seg.length === 1) {
        const f = faltantes(reg);
        if (f.length) return enviar(res, 403, { error: "requisitos_pendientes", message: "Completa los requisitos obligatorios antes de iniciar.", faltan: f });
        const abierto = reg.intentos.find((a) => a.estado === "en_curso");
        if (abierto) return enviar(res, 200, { intento: intentoPublico(abierto) });
        if (reg.intentos.length >= MAX_INTENTOS) return enviar(res, 403, { error: "sin_intentos", message: "No quedan intentos según la configuración actual." });
        const previo = reg.intentos[reg.intentos.length - 1];
        const forma = previo ? (previo.forma === "A" ? "B" : "A") : "A";
        const a = { id: crypto.randomUUID(), forma, numero: reg.intentos.length + 1, estado: "en_curso", iniciado: new Date().toISOString(), respuestas: {}, cv: P.content_version, banco: BANK.version };
        reg.intentos.push(a); escribir(reg);
        return enviar(res, 201, { intento: intentoPublico(a) });
      }
      const a = reg.intentos.find((x) => x.id === seg[1]);
      if (!a) return enviar(res, 404, { error: "no_encontrado" });
      if (M === "PUT" && seg[2] === "respuestas") {
        if (a.estado !== "en_curso") return enviar(res, 409, { error: "cerrado", message: "El intento ya fue entregado." });
        const b = await cuerpo(req), ids = new Set(BANK.forms[a.forma].unit_ids), limpio = {};
        for (const [k, v] of Object.entries(b.respuestas || {})) if (ids.has(k)) limpio[k] = { d: v.d || null, e: v.e || null, f: !!v.f };
        a.respuestas = limpio; a.posicion = +b.posicion || 0; a.actualizado = new Date().toISOString();
        escribir(reg); return enviar(res, 200, { ok: true });
      }
      if (M === "POST" && seg[2] === "entregar") {
        if (a.estado !== "en_curso") return enviar(res, 409, { error: "cerrado" });
        a.estado = "entregado"; a.entregado = new Date().toISOString(); a.resultado = corregir(a);
        escribir(reg); return enviar(res, 200, { intento: intentoPublico(a, true) });
      }
    }

    if (seg[0] === "proyecto") {
      if (faltantes(reg).length) return enviar(res, 403, { error: "requisitos_pendientes", message: "Completa los requisitos obligatorios.", faltan: faltantes(reg) });
      const forma = reg.proyecto && reg.proyecto.estado !== "borrador" ? reg.proyecto.forma : formaProyecto(reg);
      if (M === "GET" && seg.length === 1) return enviar(res, 200, { brief: P.projects_public[forma], entrega: reg.proyecto && reg.proyecto.forma === forma ? reg.proyecto : null });
      if (M === "PUT" && seg[1] === "borrador") {
        if (reg.proyecto && reg.proyecto.estado !== "borrador" && reg.proyecto.forma === forma) return enviar(res, 409, { error: "entregado" });
        const b = await cuerpo(req);
        reg.proyecto = { forma, estado: "borrador", evidencias: (b.evidencias || []).slice(0, 8).map((x) => String(x || "").slice(0, 60000)), actualizacion: String(b.actualizacion || "").slice(0, 60000), actualizado: new Date().toISOString() };
        escribir(reg); return enviar(res, 200, { ok: true });
      }
      if (M === "POST" && seg[1] === "entregar") {
        if (!reg.proyecto) return enviar(res, 400, { error: "sin_borrador" });
        reg.proyecto.estado = "pendiente_revision"; reg.proyecto.entregado = new Date().toISOString();
        escribir(reg); return enviar(res, 200, { ok: true, estado: "pendiente_revision" });
      }
    }
    if (seg[0] === "resultado" && M === "GET") return enviar(res, 200, resultado(reg));
    return enviar(res, 404, { error: "no_encontrado" });
  } catch (e) {
    return enviar(res, 400, { error: "solicitud_invalida", message: String(e.message || e) });
  }
});
servidor.listen(PUERTO, () => console.log(`Servicio de referencia IATU en http://localhost:${PUERTO} (${DEV ? "DESARROLLO" : "firmado"})`));
