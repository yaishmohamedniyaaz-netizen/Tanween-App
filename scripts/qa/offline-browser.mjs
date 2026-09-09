import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = resolve('outputs/offline-validation/build');
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm' };
let workerRevision = process.argv.includes('--legacy') ? -1 : 0;
const requests = [];
const server = createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  requests.push(pathname);
  const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + '/') && !file.startsWith(root + '\\')) { res.writeHead(403).end(); return; }
  if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end(); return; }
  let bytes = readFileSync(file);
  if (pathname === '/sw.js' && workerRevision === -1) bytes = readFileSync('outputs/offline-validation/previous-sw.js');
  if (pathname === '/sw.js') bytes = Buffer.from(bytes.toString().replace('version: FIXED_PACKAGE?.version', 'version: FIXED_PACKAGE?.version, build: APP_CACHE_VERSION'));
  if (pathname === '/sw.js' && workerRevision > 0) bytes = Buffer.from(bytes.toString().replace('app-v30-', `app-v30-update${workerRevision}-`));
  res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(bytes);
});
await new Promise(resolve => server.listen(5301, '127.0.0.1', resolve));
const browser = await chromium.launch();
const report = { checks: [], errors: [], physicalDevice: false };
const check = (name, pass, details) => { report.checks.push({ name, pass, details }); console.log(name, pass); if (!pass) throw new Error(name); };
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const p = await context.newPage(); p.on('pageerror', e => report.errors.push(String(e)));
const state = () => p.evaluate(() => window.offlineQA.getOfflineMushafState());
const finish = async () => {
  await p.evaluate(() => { void window.offlineQA.startOfflineMushafDownload(); });
  await p.waitForFunction(() => ['complete', 'error'].includes(window.offlineQA.getOfflineMushafState().phase), null, { timeout: 180000 });
  check('Download reaches verified complete', (await state()).phase === 'complete', await state());
};
try {
  await p.goto('http://127.0.0.1:5301/');
  await p.waitForFunction(() => navigator.serviceWorker.controller && window.offlineQA, null, { timeout: 60000 });
  await p.waitForFunction(() => window.offlineQA.getOfflineMushafState().phase !== 'checking');
  check('New default loads artwork', await p.locator('.page-fixed-mushaf').count() > 0);
  check('Opening does not fetch the full artwork corpus', requests.filter(url => /\/mushaf\/.*\.png$/.test(url)).length < 6);
  await p.evaluate(async () => {
    const page = await caches.open('tahqeeq-mushaf-pages-v1-1405-r2');
    const font = await caches.open('tahqeeq-mushaf-fonts-qcf-v1-3.1');
    for (let n = 1; n <= 604; n++) {
      await page.put(`/pages/p${n}.json?v=v1-1405-r2`, new Response('{}'));
      await font.put(`https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v1-optimized/woff2/p${n}.woff2?v=3.1`, new Response('old'));
    }
    localStorage.setItem('offline-qa-preserve', 'saved-findings');
    await window.offlineQA.refreshOfflineMushaf();
  });
  check('Old complete font package cannot mark artwork complete', (await state()).readyPages < 604 && (await state()).phase !== 'complete');
  if (workerRevision === -1) {
    check('Previous worker cannot certify the new offline shell', await p.evaluate(async () => !await window.offlineQA.offlineShellReady()));
    workerRevision = 0;
    await p.evaluate(async () => { window.qaRegistration = await navigator.serviceWorker.getRegistration(); await window.qaRegistration.update(); });
    await p.waitForFunction(() => window.qaRegistration.waiting?.state === 'installed', null, { timeout: 60000 });
    check('Actual v29 worker keeps its open window during migration', await p.evaluate(() => navigator.serviceWorker.controller === window.qaRegistration.active));
    // A new window cannot activate a waiting worker while the original stays open.
    const handoff = await context.newPage(); await handoff.goto('http://127.0.0.1:5301/');
    await handoff.waitForFunction(() => navigator.serviceWorker.controller);
    await p.close(); await handoff.close();
    const migrated = await context.newPage(); await migrated.goto('http://127.0.0.1:5301/');
    await migrated.waitForFunction(() => window.offlineQA && navigator.serviceWorker.controller);
    check('New worker validates the shell after the old windows close', await migrated.evaluate(() => window.offlineQA.offlineShellReady()));
    check('Legacy package and local evidence survive migration', await migrated.evaluate(async () => (await caches.keys()).includes('tahqeeq-mushaf-fonts-qcf-v1-3.1') && localStorage.getItem('offline-qa-preserve') === 'saved-findings'));
    await migrated.close();
    report.legacyMigration = true;
  } else {
  await p.evaluate(() => {
    window.originalEstimate = navigator.storage.estimate.bind(navigator.storage);
    navigator.storage.estimate = async () => ({ quota: 1, usage: 1 });
  });
  await p.evaluate(() => window.offlineQA.startOfflineMushafDownload());
  check('Insufficient storage reports an error', (await state()).phase === 'error' && /storage/.test((await state()).error));
  await p.evaluate(() => { navigator.storage.estimate = window.originalEstimate; void window.offlineQA.startOfflineMushafDownload(); });
  await p.waitForFunction(() => window.offlineQA.getOfflineMushafState().readyPages >= 15, null, { timeout: 90000 });
  await p.evaluate(() => window.offlineQA.pauseOfflineMushafDownload());
  check('Download pauses', (await state()).phase === 'paused');
  await p.reload();
  await p.waitForFunction(() => window.offlineQA?.getOfflineMushafState().phase === 'available', null, { timeout: 60000 });
  check('Reload retains partial progress', (await state()).readyPages >= 15 && (await state()).readyPages < 604, await state());
  await finish();
  await context.setOffline(true);
  check('Existing semantic consumers work offline from the artwork package', await p.evaluate(async () => (await (await fetch('/pages/p400.json?v=v1-1405-r2')).json()).page === 400));
  for (const number of [1, 400, 604]) {
    await p.evaluate(n => localStorage.setItem('tahqeeq:lastPage', String(n)), number);
    await p.reload();
    await p.locator(`.page-fixed-mushaf[data-page="${number}"]`).waitFor({ timeout: 60000 });
    check(`Fresh offline reload page ${number}`, await p.locator(`.page-fixed-mushaf[data-page="${number}"] img`).evaluate(img => img.complete && img.naturalWidth === 1920));
  }
  await p.evaluate(async () => {
    const qa = window.offlineQA, manifest = await qa.loader.manifest();
    await (await caches.open(qa.cacheName)).put(manifest.pages[399].image.url, new Response('corrupt'));
    try { await qa.loader.load(400); } catch { /* Expected while offline. */ }
    await qa.refreshOfflineMushaf();
  });
  check('Corrupt image removes complete status', (await state()).phase !== 'complete' && (await state()).readyPages === 603, await state());
  await context.setOffline(false); requests.length = 0;
  await finish();
  check('Repair fetches only the damaged image', requests.filter(url => /\/mushaf\/.*\.png$/.test(url)).length === 1, requests.filter(url => /\/mushaf\/.*\.png$/.test(url)));
  await p.evaluate(async () => {
    const qa = window.offlineQA;
    await (await caches.open(qa.cacheName)).delete(qa.descriptor.manifest.url);
    await qa.refreshOfflineMushaf();
  });
  check('Missing manifest prevents complete status', (await state()).phase !== 'complete');
  await finish();
  await p.evaluate(async () => {
    for (const name of await caches.keys()) if (name.startsWith('tahqeeq-static-app-v30')) {
      const cache = await caches.open(name);
      const asset = (await cache.keys()).find(request => request.url.includes('.js'));
      if (asset) { window.deletedShellAsset = asset.url; await cache.delete(asset); }
    }
    await window.offlineQA.refreshOfflineMushaf();
  });
  check('Missing app file prevents complete status', (await state()).phase !== 'complete');
  await finish();
  check('Retry repairs the missing app file', await p.evaluate(async () => (await caches.match(window.deletedShellAsset))?.ok === true));
  // Seed through the real judging UI on its separate disposable QA origin.
  const seed = await context.newPage();
  await seed.goto('http://127.0.0.1:5295/scripts/qa/fixed-mushaf.html?page=4');
  await seed.locator('.page-fixed-mushaf[data-page="4"]').waitFor();
  await seed.getByRole('button', { name: 'Start test judging', exact: true }).click();
  await seed.locator('[data-word-hit]').first().click();
  await seed.locator('[data-unit-tid]').first().click();
  await seed.locator('[data-pill="jali"]').click();
  const savedSession = await seed.evaluate(() => localStorage.getItem('tahqeeq.session.v1'));
  await seed.close();
  await p.evaluate(raw => localStorage.setItem('tahqeeq.session.v1', raw), savedSession);
  await p.reload(); await p.locator('.page-fixed-mushaf[data-page="4"] [data-word-hit]').first().waitFor();
  check('Real saved finding is present before update', await p.evaluate(() => JSON.parse(localStorage.getItem('tahqeeq.session.v1')).mistakes.length === 1));
  const second = await context.newPage(); await second.goto('http://127.0.0.1:5301/');
  await second.waitForFunction(() => navigator.serviceWorker.controller && window.offlineQA);
  const details = page => page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const worker = navigator.serviceWorker.controller;
    const build = await new Promise(resolve => { const c = new MessageChannel(); c.port1.onmessage = e => { c.port1.close(); resolve(e.data); }; worker.postMessage({ type: 'VERIFY_OFFLINE_SHELL' }, [c.port2]); });
    return { active: reg.active?.state, waiting: reg.waiting?.state, controlledByActive: worker === reg.active, build };
  });
  console.log('Before update', await details(p), await details(second));
  workerRevision = 1;
  await p.evaluate(async () => { window.qaRegistration = await navigator.serviceWorker.getRegistration(); await window.qaRegistration.update(); });
  await p.waitForFunction(() => window.qaRegistration.waiting?.state === 'installed', null, { timeout: 60000 });
  check('Update waits while app windows remain open', await p.evaluate(async () => (await navigator.serviceWorker.getRegistration()).active.state === 'activated'));
  console.log('While waiting', await details(p), await details(second));
  await p.close();
  console.log('After first closes', await details(second));
  check('Another open window keeps the previous worker active', await second.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting)));
  await second.close();
  const last = await context.newPage(); await last.goto('http://127.0.0.1:5301/');
  await last.evaluate(async () => { window.qaRegistration = await navigator.serviceWorker.getRegistration(); });
  await last.waitForFunction(() => !window.qaRegistration.waiting && window.qaRegistration.active?.state === 'activated', null, { timeout: 60000 });
  check('Reopening after all windows close activates the update', true);
  check('Update retains previous Mushaf and saved local data', await last.evaluate(async () => (await caches.keys()).includes('tahqeeq-mushaf-fonts-qcf-v1-3.1') && localStorage.getItem('offline-qa-preserve') === 'saved-findings'));
  await context.setOffline(true); await last.reload();
  await last.locator('.page-fixed-mushaf').first().waitFor();
  check('Updated app reopens offline', true);
  check('Live question and real finding survive offline update', await last.evaluate(raw => {
    const before = JSON.parse(raw), after = JSON.parse(localStorage.getItem('tahqeeq.session.v1'));
    return after.sessionActive && after.activeQuestion.id === before.activeQuestion.id && JSON.stringify(after.mistakes) === JSON.stringify(before.mistakes) && JSON.stringify(after.events) === JSON.stringify(before.events);
  }, savedSession));
  await last.screenshot({ path: 'outputs/offline-validation/offline-default-390.png' });
  await last.evaluate(() => window.offlineQA.removeOfflineMushafDownload());
  check('Removal keeps the core page and saved evidence', await last.evaluate(() => window.offlineQA.getOfflineMushafState().readyPages === 1 && localStorage.getItem('offline-qa-preserve') === 'saved-findings'));
  await last.evaluate(() => localStorage.setItem('tahqeeq:lastPage', '604'));
  await last.reload(); await last.locator('.page-fixed-mushaf[data-page="604"]').waitFor();
  check('Core page still opens offline after removal', true);
  check('No browser exceptions', report.errors.length === 0, report.errors);
  }
} catch (error) { report.failure = String(error); process.exitCode = 1; }
finally { await browser.close(); server.close(); writeFileSync(`outputs/offline-validation/${process.argv.includes('--legacy') ? 'legacy-' : ''}browser-results.json`, JSON.stringify(report, null, 2)); console.log({ passed: report.checks.filter(c => c.pass).length, total: report.checks.length, failure: report.failure }); }
