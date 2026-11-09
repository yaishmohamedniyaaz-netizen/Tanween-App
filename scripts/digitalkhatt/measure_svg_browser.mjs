// Local-only candidate benchmark, not Tanween app performance or iPad approval.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [inputArg, reportArg] = process.argv.slice(2);
if (!inputArg || !reportArg) throw new Error('Usage: node measure_svg_browser.mjs LOCAL_SVG_DIRECTORY REPORT_JSON');
const input = path.resolve(inputArg);
if (input === root || input.startsWith(root + path.sep)) throw new Error('PDF-derived local files must stay outside the repository');
const pages = [1, 2, 3, 50, 187, 293, 582, 600, 604];
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
const results = [];
try {
  for (const n of pages) {
    const svg = fs.readFileSync(path.join(input, `p${n}.svg`), 'utf8').replace(/<\?xml[^>]*>/g, '');
    const html = '<!doctype html><meta charset="utf-8"><title>Local SVG research</title><style>html,body{margin:0;background:white}svg{display:block;width:768px;height:1230px}</style>' + svg;
    const file = path.join(input, `p${n}-browser.html`);
    fs.writeFileSync(file, html);
    const trials = [];
    for (let trial = 0; trial < 3; trial++) {
      const context = await browser.newContext({ viewport: { width: 768, height: 1230 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
      await page.waitForFunction(() => performance.getEntriesByName('first-contentful-paint').length > 0);
      trials.push(await page.evaluate(() => performance.getEntriesByName('first-contentful-paint')[0].startTime));
      if (trial === 0 && [1, 2, 293, 582].includes(n)) await page.screenshot({ path: path.join(input, `p${n}-browser.png`), fullPage: true });
      await context.close();
    }
    results.push({ page: n, firstContentfulPaintMs: trials, medianMs: [...trials].sort((a,b) => a-b)[1] });
  }
  fs.writeFileSync(reportArg, JSON.stringify({ schema: 'digitalkhatt-local-svg-first-paint-v1', browser: browser.version(),
    methodology: 'Three fresh Chromium contexts per page; inline SVG in local file; 768x1230 viewport; device scale 1; CDP CPU x4; no network or app code. FCP is not proof all glyphs painted.',
    limits: 'Not app page-turn latency, end-to-end loading, tablet hardware, memory, offline caching or Safari/iPad correctness. PDF-derived SVG candidates remain local-only.', results }, null, 2) + '\n');
} finally { await browser.close(); }
