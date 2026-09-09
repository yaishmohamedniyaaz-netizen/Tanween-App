import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = 'outputs/fixed-mushaf-source';
mkdirSync(out, { recursive: true });
const report = { checks: [], errors: [], physicalDevice: false };
function check(name, pass, details) {
  report.checks.push({ name, pass, details });
  if (!pass) throw new Error(name);
}
const browser = await chromium.launch();
try {
  for (const width of [1400, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true });
    await context.addInitScript(() => {
      const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
      window.fixedImageURLs = new Set();
      URL.createObjectURL = blob => { const url = create(blob); window.fixedImageURLs.add(url); return url; };
      URL.revokeObjectURL = url => { window.fixedImageURLs.delete(url); revoke(url); };
    });
    const p = await context.newPage();
    p.on('pageerror', error => report.errors.push(String(error)));
    const images = new Set();
    p.on('request', request => { if (/\/mushaf\/.*\.png$/.test(request.url())) images.add(request.url()); });
    await p.goto('http://127.0.0.1:5295/scripts/qa/fixed-mushaf.html?page=4');
    await p.locator('.page-fixed-mushaf[data-page="4"]').waitFor();
    check(`No automatic full download ${width}`, images.size === 1);
    check(`No fade before an assigned passage ${width}`, await p.locator('.fixed-word.question-context-line, .fixed-word:has(.question-context-word)').count() === 0);
    await p.getByRole('button', { name: 'Start test judging', exact: true }).click();
    await p.locator('.fixed-word.question-context-line').first().waitFor();
    const fade = await p.evaluate(() => {
      const context = document.querySelector('.fixed-word.question-context-line');
      const active = [...document.querySelectorAll('.fixed-word')].find(w => !w.matches('.question-context-line, :has(.question-context-word)'));
      return { contextOpacity: getComputedStyle(context).opacity,
        wash: getComputedStyle(context, '::before').opacity,
        activeWash: getComputedStyle(active, '::before').content,
        shadedBands: document.querySelectorAll('.question-context-band').length };
    });
    check(`Only surrounding artwork fades ${width}`, fade.contextOpacity === '1' && fade.wash === '0.65' && fade.activeWash === 'none' && fade.shadedBands === 0, fade);
    for (const number of [178, 400, 602, 4, 178, 4]) {
      await p.getByLabel('Test page', { exact: true }).selectOption(String(number));
      await p.locator(`.page-fixed-mushaf[data-page="${number}"]`).waitFor();
      check(`Only one owned image after p${number} at ${width}`, await p.evaluate(() => window.fixedImageURLs.size) === 1);
    }
    const word = p.locator('[data-word-hit]').first();
    await word.tap();
    await p.locator('[data-unit-tid]').first().click();
    await p.locator('[data-pill="jali"]').click();
    check(`New corpus page accepts actual finding ${width}`, JSON.parse(await p.locator('#fixed-evidence').textContent()).mistakes.length === 1);
    await p.screenshot({ path: `${out}/package-fade-${width}.png` });
    check(`No horizontal overflow ${width}`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    if (width === 1400) {
      await p.getByLabel('View', { exact: true }).selectOption('spread');
      await p.locator('.page-fixed-mushaf[data-page="5"]').waitFor();
      check('Spread owns exactly two images', await p.evaluate(() => window.fixedImageURLs.size) === 2);
    }
    await context.close();
  }
  check('No browser exceptions', report.errors.length === 0, report.errors);
} catch (error) { report.failure = String(error); process.exitCode = 1; }
finally {
  await browser.close();
  writeFileSync(`${out}/browser-results.json`, JSON.stringify(report, null, 2));
  console.log({ passed: report.checks.filter(c => c.pass).length, total: report.checks.length, failure: report.failure });
}
