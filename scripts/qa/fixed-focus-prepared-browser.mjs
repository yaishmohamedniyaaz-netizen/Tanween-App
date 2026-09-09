import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = 'outputs/focus-prepared';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const checks = [];
try {
  for (const [width, height, page] of [[1400,900,604],[1400,650,2],[390,844,604],[390,650,1]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const p = await context.newPage();
    await p.goto(`http://127.0.0.1:5295/scripts/qa/fixed-mushaf.html?page=${page}`);
    await p.locator(`.page-fixed-mushaf[data-page="${page}"]`).waitFor();
    await p.getByRole('button', { name: 'Start test judging', exact: true }).click();
    await p.waitForFunction(() => JSON.parse(document.querySelector('#fixed-evidence').textContent).sessionActive);
    await p.getByRole('button', { name: 'Prepare test judging', exact: true }).click();
    await p.waitForFunction(() => JSON.parse(document.querySelector('#fixed-evidence').textContent).prepared);
    await p.evaluate(async page => {
      const pref = await import('/src/lib/devicePreferences.ts');
      pref.writeDevicePreferences({ ...pref.DEFAULT_DEVICE_PREFERENCES, mushafLayout: 'spread' });
      localStorage.setItem('tahqeeq:lastPage', String(page));
    }, page);
    await p.goto('http://127.0.0.1:5295/');
    await p.locator(`.page-fixed-mushaf[data-page="${page}"]`).waitFor();
    await p.getByRole('button', { name: 'Begin judging', exact: true }).waitFor();
    const result = await p.evaluate(() => {
      const card = document.querySelector('.prepared-recording').getBoundingClientRect();
      const button = document.querySelector('.prepared-sidebar-actions > .btn-primary').getBoundingClientRect();
      const roots = [...document.querySelectorAll('.page-fixed-mushaf')];
      const gaps = roots.flatMap(root => [...root.querySelectorAll('.fixed-artwork-context')]);
      const overlap = roots.some(root => [...root.querySelectorAll('.fixed-artwork-context')].some(gap => {
        const g = gap.getBoundingClientRect();
        return [...root.querySelectorAll('.fixed-word')].some(word => {
          const w = word.getBoundingClientRect();
          return Math.min(g.bottom,w.bottom) - Math.max(g.top,w.top) > 0.1;
        });
      }));
      const faded = gaps.every(g => getComputedStyle(g).display === 'block' && getComputedStyle(g).opacity === '0.65');
      // Focus off must restore the original decoration without changing geometry.
      roots.forEach(root => root.setAttribute('data-question-focus-mode', 'off'));
      const offRestores = gaps.every(g => getComputedStyle(g).display === 'none');
      roots.forEach(root => root.setAttribute('data-question-focus-mode', 'fade'));
      return { gap: button.top-card.bottom, faded, offRestores, overlap,
        noOverflow: document.documentElement.scrollWidth <= innerWidth + 1 };
    });
    if (result.gap < -0.1 || !result.faded || !result.offRestores || result.overlap || !result.noOverflow) throw new Error(JSON.stringify({width,height,page,...result}));
    checks.push({width,height,page,...result});
    await p.screenshot({ path: `${out}/prepared-${width}-${height}-p${page}.png` });
    await context.close();
  }
  console.log(checks);
} finally {
  writeFileSync(`${out}/results.json`, JSON.stringify(checks,null,2));
  await browser.close();
}
