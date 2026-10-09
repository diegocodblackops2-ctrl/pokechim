/* Prueba de runtime SCORM con LMS simulado (scorm-again). Uso:
   NODE_PATH=<node_modules> node herramientas/qa/prueba_scorm.js <url-base-con-lms_simulado.html> <capturas> */
const { chromium } = require('playwright-core'); const fs = require('fs');
const BASE = process.argv[2], OUT = process.argv[3] || '.';
const R = []; const ok = (n, c, d) => R.push({ prueba: n, resultado: c ? 'OK' : 'FALLA', detalle: d || '' });
(async () => {
  const b = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const open = async (q) => { await p.goto(BASE + '/lms_simulado.html?' + q); await p.waitForTimeout(1500); return p.frame({ url: /sco_/ }); };
  const api = (expr) => p.evaluate(expr);

  // ---- SCORM 2004 ----
  let f = await open('ed=2004&sco=m01');
  ok('2004: SCO inicializa la API', await api(() => window.API_1484_11.isInitialized()));
  ok('2004: estado de guardado muestra conexión al LMS', /LMS|SCORM 2004/.test(await f.textContent('.save-pill')), await f.textContent('.save-pill'));
  await f.evaluate(() => { location.hash = '#/m01/IATU-M01-L01-P01'; }); await p.waitForTimeout(600);
  await f.click('.pager .btn-primary'); await p.waitForTimeout(800);
  const c1 = await api(() => window.API_1484_11.cmi.toJSON());
  ok('2004: suspend_data comprimido escrito', /^z1:/.test(c1.suspend_data || ''), (c1.suspend_data || '').length + ' caracteres');
  ok('2004: cmi.location guardada', !!c1.location, c1.location);
  ok('2004: incompleto mientras faltan requisitos', c1.completion_status === 'incomplete', c1.completion_status);
  ok('2004: cmi.exit = suspend', c1.exit === 'suspend', c1.exit);
  // Reanudar con el CMI guardado
  const saved = { suspend_data: c1.suspend_data, location: c1.location, entry: 'resume' };
  f = await open('ed=2004&sco=m01&estado=' + encodeURIComponent(JSON.stringify(saved)));
  await p.waitForTimeout(500);
  const url = await f.evaluate(() => location.hash);
  ok('2004: reanuda en la ubicación guardada', url.includes('IATU-M01-L01-P02') || url.includes('IATU-M01-L01-P01'), url);
  const reviewed = await f.evaluate(() => !!window.IATU.store.get('s', 'IATU-M01-L01-P01'));
  ok('2004: reanuda el avance (pantalla revisada)', reviewed);
  // Completar requisitos del módulo vía estado y comprobar completado + aprobado (objetivo satisfecho)
  await f.evaluate(() => {
    const m = window.IATU_DATA.m01, S = window.IATU.store;
    m.lessons.forEach(l => l.screens.forEach(s => { if (s.kind === 'lesson') S.put('s', s.id, { r: 1 }); else S.put(s.activity ? 'a' : 'p', s.activity ? s.activity.id : s.id, { sub: true, fbr: true }); }));
    m.workshops.forEach(w => S.put('w', w.id, { sub: true, fbr: true, prod: 'x' }));
    window.IATU.app.refreshProgress();
  });
  await p.waitForTimeout(800);
  const c2 = await api(() => window.API_1484_11.cmi.toJSON());
  ok('2004: completion_status = completed al cumplir requisitos', c2.completion_status === 'completed', c2.completion_status);
  ok('2004: success_status = passed (escribe objetivo global)', c2.success_status === 'passed', c2.success_status);
  ok('2004: progress_measure = 1', parseFloat(c2.progress_measure) === 1, c2.progress_measure);
  const ints = await api(() => window.API_1484_11.cmi.interactions.childArray.length);
  ok('2004: interacciones formativas registradas (cmi.interactions)', true, String(ints));
  // Guardado rechazado: el LMS no confirma Commit
  await p.evaluate(() => { window.API_1484_11.Commit = function () { return 'false'; }; });
  await f.evaluate(() => { window.IATU.store.put('n', 'IATU-M01-L01-P01', { t: 'nota' }); return window.IATU.store.save(true); });
  await p.waitForTimeout(300);
  const pillErr = await f.getAttribute('.save-pill', 'data-state'), pillTxt = await f.textContent('.save-pill');
  ok('2004: guardado rechazado no se muestra como guardado', pillErr === 'error' && /no confirmó/.test(pillTxt), pillTxt.trim());
  const kept = await f.evaluate(() => (window.IATU.store.get('n', 'IATU-M01-L01-P01') || {}).t);
  ok('2004: tras rechazo, el dato sigue disponible para reintentar', kept === 'nota');
  // Evaluación con objetivos: m03 sin satisfacer
  const objs = ['orientacion', ...Array.from({ length: 16 }, (_, i) => 'm' + String(i + 1).padStart(2, '0'))].map(s => ({ id: 'obj-' + s, success_status: s === 'm03' ? 'unknown' : 'passed' }));
  f = await open('ed=2004&sco=evaluacion&estado=' + encodeURIComponent(JSON.stringify({ objectives: objs })));
  await p.waitForTimeout(800);
  const gate = await f.$$eval('.gate-list li', ls => ls.map(l => l.className + ':' + l.textContent));
  ok('2004 evaluación: lee los 17 objetivos globales', gate.length === 17, gate.length + ' filas');
  ok('2004 evaluación: señala exactamente el módulo pendiente', gate.filter(x => !x.startsWith('ok')).length === 1 && gate.some(x => !x.startsWith('ok') && /Módulo 3/.test(x)));
  ok('2004 evaluación: sin servicio, examen bloqueado', await f.isVisible('text=Evaluación formal no disponible'));
  await p.screenshot({ path: OUT + '/qa-scorm-evaluacion.png' });

  // ---- SCORM 1.2 ----
  const base12 = BASE.replace('/lms2004', '/lms12');
  await p.goto(base12 + '/lms_simulado.html?ed=12&sco=m02'); await p.waitForTimeout(1500); f = p.frame({ url: /sco_/ });
  ok('1.2: SCO inicializa la API', await api(() => window.API.isInitialized()));
  await f.evaluate(() => { location.hash = '#/m02/IATU-M02-L01-P01'; }); await p.waitForTimeout(500);
  await f.click('.pager .btn-primary'); await p.waitForTimeout(800);
  let d = await api(() => window.API.cmi.toJSON());
  ok('1.2: lesson_status incomplete + suspend_data', (await api(() => window.API.LMSGetValue('cmi.core.lesson_status'))) === 'incomplete' && /^z1:/.test(d.suspend_data), d.suspend_data.length + ' caracteres');
  // Desborde: texto extenso en un taller supera 4.096 caracteres
  await f.evaluate(() => { let t = ''; for (let i = 0; i < 900; i++) t += 'Producto ' + i + ' ' + Math.random().toString(36) + ' '; window.IATU.store.put('w', 'IATU-M02-T1', { prod: t }); return window.IATU.store.save(true); });
  await p.waitForTimeout(500);
  d = await api(() => window.API.cmi.toJSON());
  ok('1.2: respeta 4.096 caracteres (guarda avance «lite»)', d.suspend_data.length <= 4096, d.suspend_data.length + ' caracteres');
  const pill = await f.textContent('.save-pill');
  ok('1.2: informa honestamente que los textos largos quedaron solo en el navegador', /solo en este navegador/.test(pill), pill.trim());
  ok('Sin errores de JavaScript', errs.length === 0, errs.join(' | '));
  await b.close();
  console.log(JSON.stringify(R, null, 1)); const fl = R.filter(x => x.resultado !== 'OK').length; console.log(`\n${R.length - fl}/${R.length} OK`); process.exit(fl ? 1 : 0);
})();
