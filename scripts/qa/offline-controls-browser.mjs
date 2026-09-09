import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch();
const results = [];
try {
  for (const width of [1400, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.matchMedia = query => {
        const media = original(query);
        if (query === '(display-mode: standalone)') Object.defineProperty(media, 'matches', { value: true });
        return media;
      };
      localStorage.setItem('tahqeeq:offline-mushaf-prompt:1405-artwork-5a5f9f3846158475', 'later');
    });
    const p = await context.newPage();
    await p.goto('http://127.0.0.1:5302/');
    await p.locator('.page-fixed-mushaf').first().waitFor();
    await p.getByRole('button', { name: 'More actions and view controls', exact: true }).click();
    await p.waitForFunction(() => document.body.innerText.includes('about 143 MB'));
    await p.getByRole('button', { name: /(?:Resume Mushaf download|Download Mushaf offline)/ }).click();
    await p.getByRole('button', { name: /Pause Mushaf download/ }).click();
    await p.getByRole('button', { name: /Resume Mushaf download/ }).waitFor();
    await p.screenshot({ path: `outputs/offline-validation/download-controls-${width}.png` });
    results.push({ width, defaultArtwork: true, measuredSizeVisible: true, downloadAndPause: true, standaloneEmulated: true });
    await context.close();
  }
  writeFileSync('outputs/offline-validation/controls-results.json', JSON.stringify(results, null, 2));
  console.log(results);
} finally { await browser.close(); }
