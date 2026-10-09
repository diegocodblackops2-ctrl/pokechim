/* Recorrido íntegro de la vista previa: 18 SCO, 256 pantallas, 32 talleres, 3 casos, intros y cierres.
   Mide la primera carga y verifica que no se descarguen medios al entrar. Uso: node prueba_recorrido.js <base> <salida.json> */
const { chromium } = require('playwright-core'); const fs = require('fs');
const BASE = process.argv[2], OUTF = process.argv[3];
const R = []; const ok = (n, c, d) => R.push({ prueba: n, resultado: c ? 'OK' : 'FALLA', detalle: d || '' });
(async () => {
  const b = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  // Primera carga en frío
  let bytes = 0, reqs = [];
  p.on('response', async r => { try { const h = r.headers()['content-length']; bytes += h ? parseInt(h) : (await r.body()).length; reqs.push(r.url()); } catch (e) {} });
  const t0 = Date.now();
  await p.goto(BASE + '/index.html'); await p.waitForLoadState('networkidle');
  const tLoad = Date.now() - t0;
  ok('Inicio frío: transferencia de la portada', bytes < 1.5 * 1024 * 1024, Math.round(bytes / 1024) + ' KiB en ' + reqs.length + ' solicitudes, ' + tLoad + ' ms (local, sin limitación de red)');
  ok('Carga a demanda: sin audio ni video al entrar', !reqs.some(u => /\.(mp3|mp4)(\?|$)/.test(u)), reqs.filter(u => /\.(mp3|mp4)/.test(u)).join(','));
  ok('Carga a demanda: no carga los 16 módulos al entrar', !reqs.some(u => /data\/m\d\d\.js/.test(u)));
  // Recorrido
  const C = await p.evaluate(() => window.IATU_DATA.curso);
  let screens = 0, empty = [], wsN = 0, csN = 0, ids = new Set();
  for (const m of C.modules) {
    await p.goto(BASE + '/index.html#/' + m.sco + '/intro'); await p.waitForTimeout(250);
    const M = await p.evaluate(s => window.IATU_DATA[s], m.sco);
    for (const l of M.lessons) for (const s of l.screens) {
      await p.evaluate(r => { location.hash = '#/' + r; }, m.sco + '/' + s.id); await p.waitForTimeout(60);
      const txt = await p.evaluate(() => document.querySelector('.stage').innerText);
      screens++; ids.add(s.id);
      const strip = t => t.replace(/(^|\s)(?:[A-Z]-)?[A-Z]{1,3}\d{1,2}\.\s/g, ' ').replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
      const probe = strip(s.activity ? s.activity.context : s.text).slice(0, 40);
      if (txt.length < 200 || !strip(txt).includes(probe.slice(0, 30))) empty.push(s.id);
    }
    for (const w of M.workshops) { await p.evaluate(r => { location.hash = '#/' + r; }, m.sco + '/taller/' + w.id); await p.waitForTimeout(60); { const st = t => t.replace(/(^|\s)(?:[A-Z]-)?[A-Z]{1,3}\d{1,2}\.\s/g, ' ').replace(/\s+/g, ' ').trim(); if (st(await p.evaluate(() => document.querySelector('.stage').innerText)).includes(st(w.input).slice(0, 25))) wsN++; } }
    for (const c of M.cases) { await p.evaluate(r => { location.hash = '#/' + r; }, m.sco + '/caso/' + c.id); await p.waitForTimeout(80); if ((await p.evaluate(() => document.querySelector('.stage').innerText)).includes(c.brief.slice(0, 25))) csN++; }
    await p.evaluate(r => { location.hash = '#/' + r; }, m.sco + '/cierre'); await p.waitForTimeout(60);
  }
  ok('Recorrido: 256 pantallas renderizadas con su texto', screens === 256 && empty.length === 0, screens + ' pantallas; sin texto esperado: ' + empty.join(','));
  ok('Recorrido: 32 talleres con expediente', wsN === 32, String(wsN));
  ok('Recorrido: 3 casos con antecedentes', csN === 3, String(csN));
  for (const r of ['orientacion/bienvenida', 'orientacion/como-estudiar', 'orientacion/diagnostico', 'orientacion/tarea', 'orientacion/mapa', 'evaluacion/requisitos', 'evaluacion/transferencia', 'evaluacion/cierre', 'biblioteca/prompts', 'biblioteca/plantillas', 'biblioteca/auditorias', 'biblioteca/materiales', 'biblioteca/glosario', 'biblioteca/fuentes', 'biblioteca/descargas', 'ajustes', 'creditos']) {
    await p.evaluate(x => { location.hash = '#/' + x; }, r); await p.waitForTimeout(120);
  }
  ok('Orientación, evaluación y biblioteca abren sin errores', errs.length === 0, errs.join(' | '));
  // Teclado: recorrer con Tab una pantalla de clasificación y comprobar foco visible en controles
  await p.goto(BASE + '/index.html#/m01/IATU-M01-L01-P04'); await p.waitForTimeout(400);
  let visited = new Set();
  for (let i = 0; i < 60; i++) { await p.keyboard.press('Tab'); const tag = await p.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); return a.tagName + '|' + (cs.outlineStyle !== 'none' && cs.outlineWidth !== '0px'); }); visited.add(tag); }
  const noVisible = [...visited].filter(x => x.endsWith('false') && !x.startsWith('BODY'));
  ok('Teclado: controles alcanzables con Tab muestran foco visible', noVisible.length === 0, [...visited].join(', '));
  ok('Sin errores de JavaScript', errs.length === 0, errs.join(' | '));
  await b.close();
  fs.writeFileSync(OUTF, JSON.stringify(R, null, 1));
  console.log(JSON.stringify(R, null, 1)); const fl = R.filter(x => x.resultado !== 'OK').length; console.log(`\n${R.length - fl}/${R.length} OK`);
})();
