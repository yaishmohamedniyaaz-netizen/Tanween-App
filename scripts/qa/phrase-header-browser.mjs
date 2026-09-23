import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch();
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:5320';
mkdirSync('outputs/phrase-header', { recursive: true });
const results = [];
try {
  for (const [width,height] of [[320,568],[390,844],[430,932],[740,360],[900,768],[1024,768],[1400,900]]) {
    const context = await browser.newContext({ viewport: { width,height }, hasTouch: width < 600 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('tahqeeq.hintSeen.assignedRail.v1','1'));
    await page.goto(`${base}/scripts/qa/mobile-paper.html?phraseHeader=1`);
    await page.getByRole('button', {name:'Load prepared mobile sample'}).click();
    await page.getByRole('button', {name:'Begin judging',exact:true}).click();
    await page.locator('[data-word-hit]').first().waitFor();
    await page.evaluate(() => window.scrollTo(0,0));
    await page.waitForTimeout(500);
    const geometry = () => page.evaluate(() => {
      const box = selector => {
        const r = document.querySelector(selector)?.getBoundingClientRect();
        return r ? {x:r.x,y:r.y,width:r.width,height:r.height} : null;
      };
      return {header:box('.app-header'),paper:box('.mushaf-composition'),nav:box('.mushaf-shared-nav')};
    });
    const before = await geometry();
    assert(before.paper.width > 100 && before.paper.height > 140, 'The Mushaf must not collapse while Fit settles');
    await page.getByRole('button',{name:'Starting & ending',exact:true}).click();
    await page.getByRole('button',{name:'Got it',exact:true}).click();
    await page.locator('.phrase-word').first().waitFor();
    await page.screenshot({path:`outputs/phrase-header/open-${width}.png`});
    assert.deepEqual(await geometry(), before, 'Opening must not change header, page or navigation geometry');
    const bounds = await page.locator('#starting-ending-panel').boundingBox();
    assert(bounds.x>=0 && bounds.x+bounds.width<=width+1 && bounds.y>=before.header.y+before.header.height, 'Panel within viewport below header');
    const word = page.locator('.phrase-word').first();
    await word.click();
    await page.locator('.drag-menu [data-unit-tid]').first().click();
    await page.locator('.drag-menu [data-pill="jali"]').click();
    await page.locator('.phrase-word.has-mark').waitFor();
    assert.equal(await word.getAttribute('aria-label'), 'أَعُوذُ, 1 finding');
    await word.click();
    await page.locator('.drag-menu [data-unit-tid]').first().click();
    await page.locator('.drag-menu [data-pill="khafi"]').click();
    assert(await word.evaluate(e => e.classList.contains('cat-khafi')));
    await word.click();
    await page.locator('.drag-menu [data-unit-tid]').first().click();
    const trayFrames = await page.evaluate(async () => {
      const frames=[];
      for(let i=0;i<30;i++) { await new Promise(requestAnimationFrame); const r=document.querySelector('.drag-menu').getBoundingClientRect(); frames.push([r.x,r.y,r.width,r.height]); }
      return frames;
    });
    assert.deepEqual(trayFrames.at(-1),trayFrames.at(-10),'Correction tray must settle');
    const tray=trayFrames.at(-1);
    assert(tray[1]>=bounds.y-1 && tray[1]+tray[3]<=bounds.y+bounds.height+1,'Correction tray must stay inside the phrase surface');
    assert(tray[0]>=bounds.x-1 && tray[0]+tray[2]<=bounds.x+bounds.width+1,'Tray stays within the card horizontally');
    const closeCenter=await page.locator('.phrase-close').evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.phrase-close')===e;});
    assert(closeCenter,'Close must remain reachable while correcting');
    await page.screenshot({path:`outputs/phrase-header/correction-${width}.png`});
    await page.getByRole('button',{name:'Hold to undo selected mistake',exact:true}).focus();
    await page.keyboard.down('Space');
    await page.waitForTimeout(750);
    await page.keyboard.up('Space');
    await page.waitForFunction(() => !document.querySelector('.phrase-word.has-mark'));
    await word.click();
    await page.locator('.drag-menu [data-unit-tid]').first().click();
    await page.locator('.drag-menu [data-pill="jali"]').click();
    await page.screenshot({path:`outputs/phrase-header/marked-${width}.png`});
    await page.getByRole('button',{name:'Close starting and ending',exact:true}).click();
    await page.waitForFunction(() => document.activeElement === document.querySelector('.phrase-header-trigger'));
    assert.deepEqual(await geometry(),before);
    for (let i=0;i<4;i++) {
      await page.locator('.phrase-header-trigger').click();
      await page.locator('.phrase-word.has-mark').waitFor();
      assert.equal(await page.locator('.phrase-word.has-mark').count(),1);
      await page.keyboard.press('Escape');
      assert.deepEqual(await geometry(),before);
    }
    await page.locator('.phrase-header-trigger').click();
    await page.getByRole('button',{name:'More actions and view controls',exact:true}).click();
    assert.equal(await page.locator('#starting-ending-panel').count(),0);
    await page.locator('.phrase-header-trigger').click();
    assert.equal(await page.locator('.more-controls-popover').count(),0);
    await page.locator('.page-nav-page').click();
    assert.equal(await page.locator('#starting-ending-panel').count(),0);
    await page.locator('.phrase-header-trigger').click();
    assert.equal(await page.getByRole('dialog',{name:'Jump to page',exact:true}).count(),0);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
    assert.deepEqual(errors,[]);
    results.push({width,height,before,bounds,passed:true});
    console.log(`PASS ${width}x${height}`);
    await context.close();
  }
} finally { await browser.close(); writeFileSync('outputs/phrase-header/results.json',JSON.stringify(results,null,2)); }
