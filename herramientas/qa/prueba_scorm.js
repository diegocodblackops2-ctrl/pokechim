/* Prueba de runtime SCORM (un solo SCO) con LMS simulado (scorm-again). Uso:
   NODE_PATH=<node_modules> node herramientas/qa/prueba_scorm.js <url-base-con-lms_simulado.html (…/lms2004)> <capturas>
   Recorre: inicio, guardado y reanudación, tiempo, objetivos por sección, examen bloqueado, 17 secciones completas,
   forma A reprobada, forma B aprobada, nota/aprobado en el LMS, guardado rechazado y límite de SCORM 1.2. */
const { chromium } = require('playwright-core'); const fs = require('fs');
const BASE = process.argv[2], OUT = process.argv[3] || '.';
const R = []; const ok = (n, c, d) => R.push({ prueba: n, resultado: c ? 'OK' : 'FALLA', detalle: d || '' });
(async () => {
  const b = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const open = async (q) => { await p.goto(BASE + '/lms_simulado.html?' + q); await p.waitForTimeout(1800); return p.frame({ url: /paquete\/index\.html/ }); };
  const cmi = () => p.evaluate(() => window.API_1484_11.cmi.toJSON());
  const get = (k) => p.evaluate((k) => window.API_1484_11.GetValue(k), k);

  // ---- SCORM 2004 · un solo SCO ----
  let f = await open('ed=2004&ruta=m01/IATU-M01-L01-P01');
  ok('2004: el SCO inicializa la API', await p.evaluate(() => window.API_1484_11.isInitialized()));
  ok('2004: indicador de guardado muestra conexión al LMS', /LMS|SCORM 2004/.test(await f.getAttribute('.save-pill', 'title')), await f.getAttribute('.save-pill', 'title'));
  await f.click('.pager .btn-primary'); await p.waitForTimeout(900);
  let c1 = await cmi();
  ok('2004: suspend_data comprimido (un registro para todo el curso)', /^z1:/.test(c1.suspend_data || ''), (c1.suspend_data || '').length + ' caracteres');
  ok('2004: cmi.location guardada', !!c1.location, c1.location);
  ok('2004: incompleto mientras faltan secciones', c1.completion_status === 'incomplete', c1.completion_status);
  ok('2004: progress_measure informado', parseFloat(c1.progress_measure) > 0, c1.progress_measure);
  ok('2004: cmi.exit = suspend', c1.exit === 'suspend', c1.exit);
  ok('2004: objetivo por sección (obj-m01)', (await get('cmi.objectives._count')) >= 1 && (await get('cmi.objectives.0.id')) === 'obj-m01', await get('cmi.objectives.0.id'));
  // tiempo activo: forzar un tick del reloj
  await f.evaluate(() => { window.IATU.store.addTime(75); window.IATU.app.updateTopbar(); window.IATU.store.save(true); });
  const commit1 = await p.evaluate(() => JSON.stringify(window.API_1484_11.renderCommitCMI(true)));
  ok('2004: cmi.session_time informado (solo escritura: se lee del commit)', /session_time":"PT/.test(commit1), (commit1.match(/session_time":"[^"]*/) || [''])[0]);
  ok('2004: el reloj de dedicación se muestra', /1 min/.test(await f.textContent('.chip.time')), (await f.textContent('.chip.time')).trim());
  // Reanudar
  c1 = await cmi();
  f = await open('ed=2004&estado=' + encodeURIComponent(JSON.stringify({ suspend_data: c1.suspend_data, location: c1.location, entry: 'resume' })));
  ok('2004: reanuda el avance (pantalla revisada)', await f.evaluate(() => !!(window.IATU.store.peek('m01') || {}).s['IATU-M01-L01-P01']));
  ok('2004: reanuda el tiempo acumulado', await f.evaluate(() => window.IATU.store.totalTime() >= 75));
  ok('2004: portada ofrece «continuar donde quedaste»', await f.isVisible('.resume'));
  // Evaluación bloqueada
  await f.evaluate(() => { location.hash = '#/evaluacion/examen'; }); await p.waitForTimeout(900);
  ok('2004: examen bloqueado hasta completar las 17 secciones', await f.isVisible('text=Aún bloqueada'));
  // Completar las 17 secciones con la lógica real de requisitos
  await f.evaluate(async () => {
    const A = window.IATU.app.api, S = window.IATU.store;
    for (const sco of window.IATU_DATA.curso.scos.filter(x => x !== 'evaluacion')) {
      if (sco !== 'orientacion') await A.loadData(sco);
      S.load(sco);
      A.requirements(sco).forEach(q => {
        if (q.type === 'screen') S.put('s', q.id, { r: 1 });
        else if (q.type === 'diag') S.put('d', 'diag', { done: true });
        else if (q.type === 'workshop') S.put('w', q.id, { sub: true, fbr: true });
        else if (q.type === 'case') S.put('c', q.id, { done: true });
        else if (q.type === 'practice') { const m = window.IATU_DATA[sco]; let key = q.id; m.lessons.forEach(l => l.screens.forEach(s => { if (s.id === q.id && s.activity) key = s.activity.id; })); S.put('a', key, { sub: true, fbr: true }); S.put('p', key, { sub: true, fbr: true }); }
      });
      window.IATU.app.refreshProgress();
    }
    await S.save(true);
  });
  await p.waitForTimeout(800);
  const cp = await f.evaluate(() => window.IATU.app.courseProg());
  ok('2004: las 17 secciones quedan completas', cp.complete && cp.secs === 17, cp.secs + '/17');
  ok('2004: 17 objetivos de sección en el LMS', parseInt(await get('cmi.objectives._count'), 10) >= 17, await get('cmi.objectives._count'));
  ok('2004: sin examen entregado el curso sigue incompleto', (await get('cmi.completion_status')) === 'incomplete', await get('cmi.completion_status'));
  await f.evaluate(() => { location.hash = '#/evaluacion/requisitos'; }); await p.waitForTimeout(900);
  ok('2004: la evaluación aparece disponible', await f.isVisible('text=Evaluación disponible'));
  await p.screenshot({ path: OUT + '/qa-scorm-puerta.png' });
  // Forma A: responder mal todo → reprobado
  await f.evaluate(() => { location.hash = '#/evaluacion/examen'; }); await p.waitForTimeout(1500);
  await f.click('text=Iniciar forma A'); await p.waitForTimeout(600);
  ok('2004: forma A con 64 situaciones', (await f.$$('.unit-map button')).length === 64);
  await f.evaluate(() => { const x = window.IATU.store.peek('evaluacion').x.ex; x.idx = 64; });
  await f.evaluate(() => { location.hash = '#/evaluacion/requisitos'; }); await p.waitForTimeout(500);
  await f.evaluate(() => { location.hash = '#/evaluacion/examen'; }); await p.waitForTimeout(900);
  await f.check('.card input[type=checkbox]'); await f.click('text=Entregar forma'); await p.waitForTimeout(1200);
  ok('2004: forma A sin respuestas → no aprobado', await f.isVisible('text=Aún no alcanzas'));
  ok('2004: success_status = failed tras forma A', (await get('cmi.success_status')) === 'failed', await get('cmi.success_status'));
  ok('2004: score.scaled = 0', parseFloat(await get('cmi.score.scaled')) === 0, await get('cmi.score.scaled'));
  ok('2004: interacciones del examen registradas', parseInt(await get('cmi.interactions._count'), 10) >= 64, await get('cmi.interactions._count'));
  ok('2004: completion_status = completed (17 secciones + examen entregado)', (await get('cmi.completion_status')) === 'completed', await get('cmi.completion_status'));
  // Forma B: responder con las claves (lectura del banco ofuscado en la prueba) → aprobado
  await f.click('text=Usar mi segundo intento'); await p.waitForTimeout(1200);
  await f.click('text=Iniciar forma B'); await p.waitForTimeout(600);
  await f.evaluate(() => {
    const E = window.IATU_DATA.eval, U = window.IATU.u.desofuscar(E.formas.B, 'IATU-C05-B'), x = window.IATU.store.peek('evaluacion').x.ex;
    U.forEach((un, i) => { x.ans[un.id] = i < 56 ? { d: un.k[0], e: un.k[1] } : { d: un.k[0] }; }); x.idx = 64;
  });
  await f.evaluate(() => { location.hash = '#/evaluacion/requisitos'; }); await p.waitForTimeout(400);
  await f.evaluate(() => { location.hash = '#/evaluacion/examen'; }); await p.waitForTimeout(900);
  await f.check('.card input[type=checkbox]'); await f.click('text=Entregar forma'); await p.waitForTimeout(1500);
  // 56×5 + 8×3 = 304 / 320 = 95
  ok('2004: forma B aprobada (95 de 100)', await f.isVisible('text=¡Aprobado!'));
  ok('2004: success_status = passed', (await get('cmi.success_status')) === 'passed', await get('cmi.success_status'));
  ok('2004: score.raw = 95 y scaled = 0,95', parseFloat(await get('cmi.score.raw')) === 95 && parseFloat(await get('cmi.score.scaled')) === 0.95, (await get('cmi.score.raw')) + ' / ' + (await get('cmi.score.scaled')));
  ok('2004: score.min/max 0–100', (await get('cmi.score.min')) === '0' && (await get('cmi.score.max')) === '100');
  const commit2 = await p.evaluate(() => JSON.stringify(window.API_1484_11.renderCommitCMI(true)));
  ok('2004: cmi.exit = suspend también al aprobar (permite volver a la devolución)', /"exit":"suspend"/.test(commit2), (commit2.match(/"exit":"[^"]*/) || [''])[0]);
  await p.screenshot({ path: OUT + '/qa-scorm-aprobado.png' });
  // Guardado rechazado
  await p.evaluate(() => { window.API_1484_11.Commit = function () { return 'false'; }; });
  await f.evaluate(() => { window.IATU.store.load('m01'); window.IATU.store.put('n', 'IATU-M01-L01-P01', { t: 'nota' }); return window.IATU.store.save(true); });
  await p.waitForTimeout(300);
  ok('2004: guardado rechazado se informa como error', (await f.getAttribute('.save-pill', 'data-state')) === 'error', await f.getAttribute('.save-pill', 'title'));

  // ---- SCORM 1.2 ----
  const base12 = BASE.replace('/lms2004', '/lms12');
  await p.goto(base12 + '/lms_simulado.html?ed=12&ruta=m02/IATU-M02-L01-P01'); await p.waitForTimeout(1800); f = p.frame({ url: /paquete\/index\.html/ });
  ok('1.2: el SCO inicializa la API', await p.evaluate(() => window.API.isInitialized()));
  await f.click('.pager .btn-primary'); await p.waitForTimeout(900);
  let d = await p.evaluate(() => window.API.cmi.toJSON());
  ok('1.2: lesson_status incomplete + suspend_data', (await p.evaluate(() => window.API.LMSGetValue('cmi.core.lesson_status'))) === 'incomplete' && /^z1:/.test(d.suspend_data), d.suspend_data.length + ' caracteres');
  await f.evaluate(() => { window.IATU.store.addTime(3700); window.IATU.store.save(true); });
  const st12 = await p.evaluate(() => JSON.stringify(window.API.renderCommitCMI(true)));
  ok('1.2: session_time en formato HHHH:MM:SS', /\d{4}:\d\d:\d\d/.test(st12), (st12.match(/session_time[^,}]*/) || [''])[0]);
  await f.evaluate(() => { let t = ''; for (let i = 0; i < 900; i++) t += 'Producto ' + i + ' ' + Math.random().toString(36) + ' '; window.IATU.store.put('w', 'IATU-M02-T1', { prod: t }); return window.IATU.store.save(true); });
  await p.waitForTimeout(500);
  d = await p.evaluate(() => window.API.cmi.toJSON());
  ok('1.2: respeta 4.096 caracteres (guarda avance «lite»)', d.suspend_data.length <= 4096, d.suspend_data.length + ' caracteres');
  ok('1.2: informa que los textos largos quedaron solo en el navegador', /solo en este navegador/.test(await f.getAttribute('.save-pill', 'title')), await f.getAttribute('.save-pill', 'title'));
  ok('Sin errores de JavaScript', errs.length === 0, errs.join(' | '));
  await b.close();
  console.log(JSON.stringify(R, null, 1)); const fl = R.filter(x => x.resultado !== 'OK').length; console.log(`\n${R.length - fl}/${R.length} OK`); process.exit(fl ? 1 : 0);
})();
