/* Prueba funcional de interacciones en la vista previa (Playwright). Uso:
   NODE_PATH=<node_modules con playwright-core> node herramientas/qa/prueba_interacciones.js http://localhost:8765 <dir_capturas> */
const { chromium } = require('playwright-core');
const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:8765';
const OUT = process.argv[3] || '.';
const results = [];
function ok(name, cond, detail) { results.push({ prueba: name, resultado: cond ? 'OK' : 'FALLA', detalle: detail || '' }); }
(async () => {
  const exe = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
  const browser = await chromium.launch({ executablePath: exe });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  const go = async (r) => { await page.goto(BASE + '/index.html#/' + r); await page.waitForTimeout(500); };

  // 1. Clasificación con "Mover a…" (alternativa accesible) – primero incorrecta, luego correcta
  await go('m01/IATU-M01-L01-P04');
  const sels = await page.$$('.dcard select');
  ok('Clasificación: 6 tarjetas con selector Mover a…', sels.length === 6, sels.length + ' selectores');
  for (const s of sels) await s.selectOption('A');
  await page.click('text=Comprobar distribución');
  let fb = await page.textContent('.fb');
  ok('Clasificación: devolución por tarjeta ante errores', /por revisar/.test(fb), fb.slice(0, 80));
  const key = { C01: 'A', C02: 'G', C03: 'X', C04: 'A', C05: 'G', C06: 'X' };
  for (const [id, b] of Object.entries(key)) await page.selectOption(`.dcard[data-item="${id}"] select`, b);
  await page.click('text=Comprobar distribución');
  fb = await page.textContent('.fb');
  ok('Clasificación: acierto reconocido', /coherente/.test(fb), fb.slice(0, 80));
  await page.click('text=Revisé la devolución');
  // Tocar-tocar: seleccionar tarjeta y colocar
  await page.click('.dcard[data-item="C01"] .grip');
  const placeVisible = await page.isVisible('[data-place="G"]');
  ok('Clasificación: flujo tocar tarjeta → tocar destino', placeVisible);
  await page.click('[data-place="G"]');
  const inG = await page.$('.bin[data-bin="G"] .dcard[data-item="C01"]');
  ok('Clasificación: tarjeta colocada por toque', !!inG);
  await page.click('text=Deshacer');
  const backA = await page.$('.bin[data-bin="A"] .dcard[data-item="C01"]');
  ok('Clasificación: deshacer', !!backA);
  // Arrastre con puntero desde el asa
  const grip = await page.$('.dcard[data-item="C02"] .grip');
  const gb = await grip.boundingBox(); const tb = await (await page.$('.bin[data-bin="X"]')).boundingBox();
  await page.mouse.move(gb.x + 10, gb.y + 10); await page.mouse.down();
  await page.mouse.move(gb.x + 40, gb.y + 40, { steps: 5 });
  await page.mouse.move(tb.x + tb.width / 2, tb.y + 30, { steps: 10 }); await page.mouse.up();
  const dragged = await page.$('.bin[data-bin="X"] .dcard[data-item="C02"]');
  ok('Clasificación: arrastre con puntero', !!dragged);
  await page.screenshot({ path: OUT + '/qa-clasificacion.png', fullPage: true });

  // 2. Secuencia por dependencias: Subir/Bajar hasta orden válido
  await go('m01/IATU-M01-L04-P04');
  for (let pass = 0; pass < 8; pass++) {
    const ids = await page.$$eval('.seq > li', ls => ls.map(l => l.getAttribute('data-node')));
    const target = ['A', 'B', 'C', 'D', 'E', 'F'];
    const i = ids.findIndex((x, k) => x !== target[k]); if (i < 0) break;
    const want = target[i]; let at = ids.indexOf(want);
    while (at > i) { await page.click(`.seq > li[data-node="${want}"] .mv .btn:first-child`); at--; }
  }
  await page.click('text=Comprobar dependencias');
  fb = await page.textContent('.fb');
  ok('Secuencia: orden topológico válido aceptado', /Orden válido/.test(fb), fb.slice(0, 60));

  // 3. Secuencia con ramas M14: rama "consulta sin respuesta" = A,B
  await go('m14/IATU-M14-L03-P04');
  await page.check('input[value="unknown"]');
  await page.click('button:has-text("A Pausar")'); await page.click('button:has-text("B Consultar")');
  await page.click('text=Comprobar ruta');
  fb = await page.textContent('.fb');
  ok('Ramas: ruta A–B para resultado incierto', /Ruta correcta/.test(fb), fb.slice(0, 60));
  await page.check('input[value="sent"]');
  await page.click('text=Comprobar ruta');
  fb = await page.textContent('.fb');
  ok('Ramas: misma ruta no basta para envío confirmado', /no corresponde/.test(fb), fb.slice(0, 60));

  // 4. Comparación con cálculo (M12: coma decimal y negativo)
  await go('m12/IATU-M12-L02-P04');
  const nums = await page.$$('.field-block input[type="text"]');
  ok('Comparación: 3 campos numéricos M12', nums.length === 3, String(nums.length));
  await nums[0].fill('30'); await nums[1].fill('32,0'); await nums[2].fill('-70');
  await page.click('text=Comprobar registro');
  const okFields = await page.$$('.field-block.ok');
  ok('Comparación: coma decimal y negativo aceptados', okFields.length === 3, okFields.length + ' campos OK');

  // 5. Comparación multiselección (M05)
  await go('m05/IATU-M05-L03-P04');
  await page.check('input[name="IATU-INT-M05-B-H"][value="X"]'); await page.check('input[name="IATU-INT-M05-B-H"][value="Y"]');
  await page.check('input[name="IATU-INT-M05-B-G"][value="Y"]'); await page.check('input[name="IATU-INT-M05-B-F"][value="retirar_grabacion"]');
  await page.click('text=Comprobar registro');
  ok('Comparación: conjunto por IDs (orden indiferente)', (await page.$$('.field-block.ok')).length === 3);

  // 6. Decisión abierta + microproducto
  await go('m01/IATU-M01-L03-P04');
  await page.check('input[name="IATU-M01-L03-P04-d"][value="A"]');
  await page.click('text=Comprobar decisión');
  fb = await page.textContent('.fb');
  ok('Decisión: devolución con clave tras intento', /más defendible es B/.test(fb));
  const refBtn = await page.$('button:has-text("Comparar con la referencia")');
  ok('Decisión: referencia bloqueada sin producto', await refBtn.isDisabled());
  await page.fill('.card textarea', 'Consulta: pedir agrupación. Sistematización: categorías, IDs, prueba y revisión.');
  ok('Decisión: referencia habilitada con producto', !(await refBtn.isDisabled()));
  await page.click('text=Revisé la devolución');

  // 7. Tarjeta reversible con teclado
  await go('m01/IATU-M01-L02-P02');
  await page.focus('.flip button:has-text("Mostrar criterio")'); await page.keyboard.press('Enter');
  const back = await page.$('.flip.is-back');
  ok('Tarjeta: gira con teclado (Enter)', !!back);
  const focusTxt = await page.evaluate(() => document.activeElement.textContent);
  ok('Tarjeta: foco pasa a «Volver a la pregunta»', /Volver/.test(focusTxt), focusTxt);

  // 8. Hotspot: documento semántico + lista equivalente
  await go('m02/IATU-M02-L02-P03');
  const blocks = await page.$$('.hs-block');
  ok('Hotspot: zonas ancladas a bloques', blocks.length >= 3, blocks.length + ' zonas');
  await page.click('.hs-list button >> nth=1');
  const det = await page.textContent('.hs-panel .card');
  ok('Hotspot: lista equivalente abre la misma devolución', /Zona 2/.test(det));

  // 9. Taller: entregar, pauta, variante
  await go('m01/taller/IATU-M01-T1');
  await page.click('text=Ver una pista');
  await page.fill('textarea >> nth=0', 'Tabla: acceso a información C1; acceso C2; valoración positiva C3; descarga C4. Excluyo enviar respuestas porque F2 solo pide una tabla interna.');
  await page.click('text=Entregar borrador para revisión formativa');
  ok('Taller: pauta y modelo tras entregar', await page.isVisible('text=Modelo de referencia'));
  await page.click('text=Revisé la pauta y guardé mi evidencia');
  await page.screenshot({ path: OUT + '/qa-taller.png', fullPage: false });

  // 10. Caso ramificado: error → reparación → acierto
  await go('m07/caso/IAT-C01');
  await page.check('input[name="IAT-C01-N1-d"][value="B"]'); await page.check('input[name="IAT-C01-N1-e"][value="1"]');
  await page.click('text=Confirmar decisión y evidencia');
  ok('Caso: reparación ante decisión incorrecta', await page.isVisible('.repair'));
  await page.check('input[name="IAT-C01-N1-d"][value="A"]');
  await page.click('text=Confirmar decisión y evidencia');
  ok('Caso: avance tras decisión + evidencia correctas', await page.isVisible('text=Decisión sustentada'));

  // 11. Diagnóstico con «No lo sé»
  await go('orientacion/diagnostico');
  await page.click('button:has-text("No lo sé")');
  ok('Diagnóstico: «No lo sé» con devolución', await page.isVisible('text=Está bien no saberlo todavía'));

  // 12. Persistencia: recargar y comprobar que la clasificación quedó guardada
  await go('m01/IATU-M01-L01-P04');
  await page.reload(); await page.waitForTimeout(500);
  const persisted = await page.$('.bin[data-bin="X"] .dcard[data-item="C02"]');
  ok('Persistencia: borrador de clasificación tras recarga', !!persisted);

  // 13. Examen sin servicio: bloqueado y sin claves
  await go('evaluacion/examen');
  ok('Examen: bloqueado sin servicio configurado', await page.isVisible('text=Evaluación formal no disponible'));

  // 14. Móvil 360 px sin desplazamiento horizontal
  await page.setViewportSize({ width: 360, height: 780 });
  for (const r of ['', 'm01/IATU-M01-L01-P04', 'm05/IATU-M05-L03-P04', 'm02/IATU-M02-L02-P03', 'm01/taller/IATU-M01-T1']) {
    await go(r);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    ok('Móvil 360 px sin scroll horizontal: /' + r, sw <= 362, 'scrollWidth=' + sw);
  }
  await go('m01/IATU-M01-L01-P04');
  await page.screenshot({ path: OUT + '/qa-movil-clasificacion.png', fullPage: false });

  ok('Sin errores de JavaScript', errs.length === 0, errs.join(' | '));
  await browser.close();
  console.log(JSON.stringify(results, null, 1));
  const f = results.filter(r => r.resultado !== 'OK').length;
  console.log(`\n${results.length - f}/${results.length} OK`);
  process.exit(f ? 1 : 0);
})();
