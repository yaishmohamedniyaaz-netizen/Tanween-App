import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = 'http://127.0.0.1:5295';
const out = 'outputs/fixed-mushaf-source';
const report = { checks: [], errors: [], physicalDevice: false };
function check(name, pass, details) { report.checks.push({ name, pass, details }); if (!pass) throw new Error(name); }
const browser = await chromium.launch();
try {
  for (const [width, rail] of [[1400, 'left'], [1400, 'right'], [390, 'left']]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true });
    const p = await context.newPage(); p.on('pageerror', e => report.errors.push(String(e)));
    await p.goto(`${base}/scripts/qa/fixed-mushaf.html?page=4`);
    await p.locator('.page-fixed-mushaf[data-page="4"]').waitFor();
    await p.getByRole('button', { name: 'Start test judging', exact: true }).click();
    await p.locator('[data-word-hit]').first().click();
    await p.locator('[data-unit-tid]').first().click();
    await p.locator('[data-pill="jali"]').click();
    const before = JSON.parse(await p.locator('#fixed-evidence').textContent()).mistakes;
    await p.evaluate(async rail => {
      const pref = await import('/src/lib/devicePreferences.ts');
      pref.writeDevicePreferences({ ...pref.DEFAULT_DEVICE_PREFERENCES, judgeRailSide: rail, mushafLayout: 'spread' });
      localStorage.setItem('tahqeeq:lastPage', '4');
    }, rail);
    await p.goto(`${base}/?fixedMushaf=1`);
    await p.locator('.page-fixed-mushaf[data-page="4"]').waitFor();
    await p.locator('[data-word-hit]').first().waitFor();
    check(`Real app pages ${width} ${rail}`, await p.locator('.page-fixed-mushaf').count() === (width === 390 ? 1 : 2));
    check(`Default focus ${width} ${rail}`, await p.locator('.page-fixed-mushaf').first().getAttribute('data-question-focus-mode') === 'fade');
    check(`One visible selector ${width} ${rail}`, await p.locator('.page-nav:visible').count() === 1);
    check(`No horizontal overflow ${width} ${rail}`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    const geometry = await p.evaluate(() => {
      const pages = [...document.querySelectorAll('.page-fixed-mushaf')].map(e => e.getBoundingClientRect());
      const nav = document.querySelector('.mushaf-shared-nav').getBoundingClientRect();
      return { gap: Math.min(...pages.map(r => r.top)) - nav.bottom, navBottom: nav.bottom, height: innerHeight };
    });
    check(`Top selector clears artwork ${width} ${rail}`, geometry.gap >= -1 && geometry.gap < 15, geometry);
    await p.getByRole('button', { name: width === 390 ? 'next page' : 'next two pages', exact: true }).click();
    await p.locator(`.page-fixed-mushaf[data-page="${width === 390 ? 5 : 6}"]`).waitFor();
    await p.getByRole('button', { name: 'Return to selected question on page 4', exact: true }).filter({ visible: true }).click();
    await p.locator('.page-fixed-mushaf[data-page="4"]').waitFor();
    check(`Return to question ${width} ${rail}`, await p.locator('.page-nav:visible').count() === 1);
    await p.screenshot({ path: `${out}/app-live-${width}-${rail}.png` });
    await p.locator('[data-word-hit]').first().click();
    await p.locator('[data-unit-tid]').first().click();
    await p.locator('[data-pill="khafi"]').click();
    await p.reload(); await p.locator('.page-fixed-mushaf[data-page="4"]').waitFor();
    await p.goto(`${base}/scripts/qa/fixed-mushaf.html?page=4`);
    await p.locator('.page-fixed-mushaf[data-page="4"]').waitFor();
    const after = JSON.parse(await p.locator('#fixed-evidence').textContent()).mistakes;
    check(`Real app edit and reload preserve target ${width} ${rail}`, after.length === 1 && after[0].wordId === before[0].wordId && after[0].tid === before[0].tid && after[0].category === 'khafi');
    await p.goto(`${base}/scripts/qa/fixed-evidence.html?fixedMushaf=1`);
    await p.locator('.page-fixed-mushaf[data-page="4"]').waitFor();
    await p.locator('.evidence-marker-button').first().click();
    const evidence = JSON.parse(await p.locator('#evidence-check').textContent());
    check(`Evidence finding and replay retain identity ${width} ${rail}`, evidence.selected === 'test-0' && evidence.replay === before[0].wordId && evidence.wordCount > 0, evidence);
    check(`Evidence bounded image count ${width} ${rail}`, await p.locator('.page-fixed-mushaf').count() <= 2);
    await p.screenshot({ path: `${out}/evidence-${width}-${rail}.png` });
    await p.getByRole('button', { name: 'Next', exact: true }).click();
    await p.locator('.page-fixed-mushaf[data-page="5"]').waitFor();
    check(`Evidence navigation ${width} ${rail}`, await p.locator('.recitation-evidence-page.is-active').first().getAttribute('aria-label') === 'Recorded Quran page 5' || await p.locator('.page-fixed-mushaf[data-page="5"]').count() === 1);
    await p.goto(`${base}/scripts/qa/fixed-evidence.html?fixedMushaf=1&lines=30&start=2:20`);
    await p.locator('.page-fixed-mushaf[data-page="4"]').waitFor();
    check(`Long evidence range loads one artwork page ${width} ${rail}`, await p.locator('.page-fixed-mushaf').count() === 1);
    await p.getByRole('button', { name: 'Next', exact: true }).click();
    await p.locator('.page-fixed-mushaf[data-page="5"]').waitFor();
    check(`Long evidence range navigation ${width} ${rail}`, await p.locator('.page-fixed-mushaf').count() === 1);
    await p.goto(`${base}/scripts/qa/fixed-mushaf.html?page=4`);
    await p.locator('.page-fixed-mushaf[data-page="4"]').waitFor();
    await p.getByRole('button', { name: 'Prepare test judging', exact: true }).click();
    await p.waitForFunction(() => JSON.parse(document.querySelector('#fixed-evidence').textContent).prepared === true);
    await p.goto(`${base}/?fixedMushaf=1`);
    await p.locator('.page-fixed-mushaf[data-page="4"]').waitFor();
    check(`Prepared session does not permit marking ${width} ${rail}`, await p.locator('[data-word-hit]').count() === 0);
    check(`Prepared has one selector ${width} ${rail}`, await p.locator('.page-nav:visible').count() === 1);
    await p.screenshot({ path: `${out}/app-prepared-${width}-${rail}.png` });
    await p.route('**/mushaf/*/p4.png', route => route.fulfill({ status: 200, body: 'invalid' }));
    await p.evaluate(async () => { for (const name of await caches.keys()) if (name.startsWith('tahqeeq-mushaf-artwork-')) await caches.delete(name); });
    await p.reload(); await p.getByRole('alert').waitFor();
    check(`Missing artwork prevents marking ${width} ${rail}`, await p.locator('[data-word-hit]').count() === 0 && await p.locator('.page-nav:visible').count() === 1);
    await p.unrouteAll(); await p.getByRole('button', { name: 'Retry', exact: true }).click();
    await p.locator('.page-fixed-mushaf[data-page="4"]').waitFor();
    check(`Retry restores prepared page ${width} ${rail}`, await p.locator('.page-fixed-mushaf').count() === (width === 390 ? 1 : 2));
    await context.close();
  }
  check('No browser exceptions', report.errors.length === 0, report.errors);
} catch (e) { report.failure = String(e); process.exitCode = 1; }
finally { await browser.close(); writeFileSync(`${out}/app-browser-results.json`, JSON.stringify(report, null, 2)); console.log({ passed: report.checks.filter(c => c.pass).length, total: report.checks.length, failure: report.failure, errors: report.errors }); }
