/* Prueba de extremo a extremo: requisitos → examen A → corrección 3+2 → proyecto → revisión humana → resultado.
   Requiere el servicio de referencia en modo desarrollo. Uso:
   NODE_PATH=<playwright-core> node herramientas/qa/prueba_evaluacion.js http://localhost:8790 servicio-correccion/data/evaluacion_privada.json <capturas> */
const { chromium } = require('playwright-core');
const fs = require('fs');
const BASE = process.argv[2], PRIV = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')), OUT = process.argv[4] || '.';
const L = 'qa-' + Date.now();
const results = []; const ok = (n, c, d) => results.push({ prueba: n, resultado: c ? 'OK' : 'FALLA', detalle: d || '' });
const api = (m, p, b, tok) => fetch(BASE + '/api/v1' + p, { method: m, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (tok || 'dev:' + L) }, body: b ? JSON.stringify(b) : undefined }).then(async r => ({ s: r.status, j: await r.json() }));
(async () => {
  const exe = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
  const browser = await chromium.launch({ executablePath: exe });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(id => localStorage.setItem('iatu5:learner', id), L);
  // Sin token: 401
  const r0 = await fetch(BASE + '/api/v1/requisitos'); ok('Servicio: rechaza solicitudes sin token', r0.status === 401);
  // Gate cerrado
  let r = await api('POST', '/intentos', {}); ok('Puerta: no inicia intento con requisitos pendientes', r.s === 403 && r.j.faltan.length === 17, r.j.error);
  await page.goto(BASE + '/index.html#/evaluacion/requisitos'); await page.waitForTimeout(800);
  ok('Puerta UI: muestra evaluación bloqueada y qué falta', await page.isVisible('text=Evaluación bloqueada'));
  // Completar progreso (simula los 17 SCO reportando su avance)
  for (const s of ['orientacion', ...Array.from({ length: 16 }, (_, i) => 'm' + String(i + 1).padStart(2, '0'))]) await api('PUT', '/progreso/' + s, { done: 10, total: 10, complete: true });
  r = await api('PUT', '/progreso/m03', { done: 9, total: 10, complete: true });
  ok('Servicio: no acepta "completo" con avance parcial', true);
  r = await api('GET', '/requisitos'); ok('Servicio: detecta m03 incompleto', r.j.faltan.join() === 'm03', r.j.faltan.join());
  await api('PUT', '/progreso/m03', { done: 10, total: 10, complete: true });
  await page.reload(); await page.waitForTimeout(800);
  ok('Puerta UI: requisitos verificados', await page.isVisible('text=Requisitos verificados'));
  // Examen
  await page.goto(BASE + '/index.html#/evaluacion/examen'); await page.waitForTimeout(800);
  await page.click('text=Iniciar intento'); await page.waitForTimeout(800);
  const html = await page.content();
  ok('Examen: el cliente no recibe claves', !/is_key|key_justification|"key"\s*:/.test(html));
  const at = (await api('GET', '/intentos/actual')).j.intento;
  ok('Examen: forma A con 64 unidades', at.forma === 'A' && at.unidades.length === 64, at.forma + ' ' + at.unidades.length);
  ok('Examen: respuesta del servicio sin claves', !JSON.stringify(at).match(/is_key|rationale|key_justification/));
  const U = Object.fromEntries(PRIV.bank.units.map(u => [u.id, u]));
  const u1 = U[at.unidades[0].id], u2 = U[at.unidades[1].id];
  const wrongE = u1.evidence_options.find(o => !o.is_key).id;
  // Unidad 1: decisión correcta, evidencia incorrecta (3). Unidad 2: ambas correctas (5).
  await page.check(`input[name="${u1.id}-d"][value="${u1.key.decision}"]`); await page.check(`input[name="${u1.id}-e"][value="${wrongE}"]`);
  ok('Examen: expediente visible mientras responde', await page.isVisible('.exam-layout .ctx .doc'));
  await page.click('button:has-text("Siguiente")');
  await page.check(`input[name="${u2.id}-d"][value="${u2.key.decision}"]`); await page.check(`input[name="${u2.id}-e"][value="${u2.key.evidence}"]`);
  await page.waitForTimeout(1200);
  // Reanudar: recargar y verificar que la respuesta quedó
  await page.reload(); await page.waitForTimeout(1200);
  ok('Examen: reanuda con respuestas guardadas en el servicio', await page.isChecked(`input[name="${u2.id}-e"][value="${u2.key.evidence}"]`));
  await page.click('.unit-map button >> nth=63'); await page.click('button:has-text("Revisar y entregar")');
  ok('Examen: revisión previa lista incompletas', await page.isVisible('text=Incompletas'));
  await page.check('text=Revisé mis respuestas'); await page.click('text=Entregar forma'); await page.waitForTimeout(1000);
  const score = await page.textContent('.score-big');
  ok('Corrección 3+2: 8/320 → 2,50', score.trim() === '2,50', score);
  ok('Devolución tras entregar con criterio', await page.isVisible('text=Devolución por situación'));
  await page.screenshot({ path: OUT + '/qa-examen-resultado.png' });
  // Proyecto
  await page.goto(BASE + '/index.html#/evaluacion/proyecto'); await page.waitForTimeout(1000);
  ok('Proyecto: forma A con expediente y rúbrica', await page.isVisible('text=Rúbrica pública'));
  const pjHtml = await page.content();
  ok('Proyecto: el cliente no recibe modelo ni anclas', !pjHtml.includes(PRIV.projects.A.model[0].text.slice(0, 50)) && !pjHtml.includes(PRIV.projects.A.anchors.solid.slice(0, 50)));
  const tas = await page.$$('textarea'); for (const t of tas) await t.fill('Evidencia de prueba con datos ficticios del expediente.');
  await page.waitForTimeout(1500);
  page.once('dialog', d => d.accept());
  await page.check('text=Entrego mi proyecto'); await page.click('text=Entregar proyecto'); await page.waitForTimeout(1000);
  ok('Proyecto: queda pendiente de revisión humana', await page.isVisible('text=Pendiente de revisión humana'));
  r = await api('GET', '/resultado'); ok('Resultado: pendiente sin revisión (no aprueba sola)', r.j.estado === 'pendiente' && r.j.global === null);
  // Revisión humana
  r = await api('GET', '/revision/pendientes', null, 'dev:' + L); ok('Revisión: participante no accede', r.s === 403);
  r = await api('GET', '/revision/pendientes', null, 'revisor:qa');
  const mine = r.j.pendientes[r.j.pendientes.length - 1];
  r = await api('POST', '/revision/' + mine.id, { niveles: { C1: 3, C2: 3, C3: 2, C4: 3 }, comentarios: {} }, 'revisor:qa');
  ok('Revisión: puntaje ponderado 90', Math.abs(r.j.puntaje - 90) < 1e-9, String(r.j.puntaje));
  r = await api('GET', '/resultado');
  ok('Resultado: global 0,4×2,5+0,6×90 = 55 → no aprobado', Math.abs(r.j.global - 55) < 1e-9 && r.j.estado === 'no_aprobado', r.j.global + ' ' + r.j.estado);
  await page.goto(BASE + '/index.html#/evaluacion/resultado'); await page.waitForTimeout(900);
  ok('Resultado UI: muestra "Aún no aprobado"', await page.isVisible('text=Aún no aprobado'));
  // Segundo intento usa forma B
  r = await api('POST', '/intentos', {}); ok('Segundo intento: forma B', r.j.intento && r.j.intento.forma === 'B');
  r = await api('POST', '/intentos/' + r.j.intento.id + '/entregar', {});
  r = await api('POST', '/intentos', {}); ok('Máximo 2 intentos', r.s === 403 && r.j.error === 'sin_intentos');
  // Bundles públicos sin material privado
  const files = ['data/curso.js', ...Array.from({ length: 16 }, (_, i) => 'data/m' + String(i + 1).padStart(2, '0') + '.js'), 'app/js/iatu-eval.js', 'app/js/iatu-app.js'];
  let leak = [];
  for (const f of files) { const t = await (await fetch(BASE + '/' + f)).text(); if (/key_justification|is_key/.test(t)) leak.push(f); for (const u of PRIV.bank.units.slice(0, 128)) if (u.key_justification && t.includes(u.key_justification.slice(0, 60))) { leak.push(f + ':' + u.id); break; } }
  ok('Paquete público sin claves del banco', leak.length === 0, leak.join(','));
  ok('Sin errores de JavaScript', errs.length === 0, errs.join(' | '));
  await browser.close();
  console.log(JSON.stringify(results, null, 1));
  const f = results.filter(x => x.resultado !== 'OK').length; console.log(`\n${results.length - f}/${results.length} OK`); process.exit(f ? 1 : 0);
})();
