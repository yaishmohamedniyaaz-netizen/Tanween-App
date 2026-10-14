import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = 'outputs/judging-motion-preview'; mkdirSync(out, { recursive: true });
const browser = await chromium.launch(); const results = [];
async function track(page, name, action) {
  await page.evaluate(() => {
    window.framesQA = []; window.doneQA = false; const start = performance.now();
    function frame() {
      const data = { scroll: scrollY, t: performance.now() - start };
      for (const selector of ['.mushaf-shell', '.page-fixed-mushaf', '.mushaf-shared-nav']) {
        const el = document.querySelector(selector); const b = el?.getBoundingClientRect();
        data[selector] = b ? { x: b.x, y: b.y, w: b.width, h: b.height } : null;
      }
      window.framesQA.push(data);
      if (performance.now() - start < 1200) requestAnimationFrame(frame); else window.doneQA = true;
    } frame();
  });
  await action(); await page.waitForFunction(() => window.doneQA);
  return { name, frames: await page.evaluate(() => window.framesQA) };
}
try {
  for (const [width, height] of [[1191,668],[1024,768],[768,1024],[390,844],[320,740]]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 900 });
    await page.addInitScript(() => {
      localStorage.setItem('tahqeeq.hintSeen.assignedRail.v1','1'); localStorage.setItem('tanween.phrases.help.v1','seen');
      localStorage.setItem('tahqeeq:devicePreferences.v5', JSON.stringify({version:5,slimScorePanel:true,judgeRailSide:'left'}));
    });
    await page.route(/\.(woff2?|ttf)(\?|$)/, async route => { await new Promise(r => setTimeout(r, 900)); await route.continue(); });
    await page.goto('http://127.0.0.1:5346/scripts/qa/mobile-paper.html?sessionStorage=3&qaSurah=79&qaAyah=33&qaLines=10');
    await page.getByRole('button',{name:'Load prepared mobile sample'}).click();
    await page.locator('.page-fixed-mushaf').first().waitFor();
    const actions = [];
    await page.screenshot({path:`${out}/prepared-${width}.png`});
    actions.push(await track(page,'begin', () => page.getByRole('button',{name:'Begin judging',exact:true}).evaluate(el => el.click())));
    await page.screenshot({path:`${out}/live-${width}.png`});
    actions.push(await track(page,'finish-open', () => page.getByRole('button',{name:width < 600 ? 'Finish' : 'Finish recitation',exact:true}).evaluate(el => el.click())));
    await page.screenshot({path:`${out}/finish-${width}.png`});
    actions.push(await track(page,'finish-cancel', () => page.getByRole('button',{name:'Keep judging',exact:true}).evaluate(el => el.click())));
    for (const action of actions) {
      for (const selector of ['.mushaf-shell', '.page-fixed-mushaf', '.mushaf-shared-nav']) {
        const boxes = action.frames.map(frame => frame[selector]).filter(Boolean);
        for (const key of ['x','y','w','h']) {
          assert.ok(Math.max(...boxes.map(b => b[key])) - Math.min(...boxes.map(b => b[key])) < 0.5,
            `${width} ${action.name}: ${selector} ${key} drift`);
        }
      }
    }
    if (width === 320) {
      await page.setViewportSize({width:390,height:844}); await page.waitForTimeout(250);
      const space = await page.evaluate(() => ({
        reserved: parseFloat(document.querySelector('.app').style.getPropertyValue('--mobile-measured-dock-space')),
        actual: document.querySelector('.mobile-judge-deck').getBoundingClientRect().height,
      }));
      assert.ok(Math.abs(space.reserved - space.actual) < 0.5, 'Resizing clears the narrow-phone reserve');
    }
    results.push({width,actions}); await page.close();
  }
} finally {
  await browser.close(); writeFileSync(`${out}/results.json`, JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.map(r => ({width:r.width,actions:r.actions.map(a => ({name:a.name,range:Object.fromEntries(['.mushaf-shell','.page-fixed-mushaf','.mushaf-shared-nav'].map(s => {const f=a.frames.map(x=>x[s]).filter(Boolean); return [s,Object.fromEntries(['x','y','w','h'].map(k=>[k,f.length?Math.max(...f.map(x=>x[k]))-Math.min(...f.map(x=>x[k])):null]))]})),scroll:Math.max(...a.frames.map(x=>x.scroll))-Math.min(...a.frames.map(x=>x.scroll))}))}))));
}
