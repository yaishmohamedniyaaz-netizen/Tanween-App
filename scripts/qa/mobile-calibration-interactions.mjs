import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch();const report=[];const errors=[];
mkdirSync('outputs/mobile-calibration',{recursive:true});
try {
  for(const [w,h] of [[390,844],[430,932],[320,568]]) {
    const ctx=await browser.newContext({viewport:{width:w,height:h},hasTouch:true,reducedMotion:'reduce'});
    const p=await ctx.newPage();p.on('pageerror',e=>errors.push(String(e)));
    await p.goto('http://127.0.0.1:5296/scripts/qa/mobile-paper.html?mobileCalibration=1&simulateSafeAreas=1');
    await p.getByRole('button',{name:'Load prepared mobile sample'}).click();
    await p.locator('.page-fixed-mushaf').waitFor();await p.waitForTimeout(350);
    const paper=()=>p.locator('.fixed-page-frame').boundingBox();
    const ready=await paper();
    await p.getByRole('button',{name:'Begin judging',exact:true}).click();await p.waitForTimeout(350);
    assert.deepEqual(await paper(),ready,'Ready to Live must not shift the paper');
    await p.getByRole('button',{name:'Pages 604. Jump to page.',exact:true}).click();
    const menu=await p.locator('.page-nav-popover').boundingBox();
    assert.ok(menu.x>=0 && menu.x+menu.width<=w,'menu stays in viewport');
    await p.getByRole('spinbutton').fill('601');await p.getByRole('button',{name:'Go',exact:true}).click();
    await p.locator('.page-fixed-mushaf[data-page="601"]').waitFor();await p.waitForTimeout(350);
    const selected=await paper();
    await p.screenshot({path:`outputs/mobile-calibration/pwa-${w}-live.png`,animations:'disabled'});
    await p.getByRole('button',{name:'Switch to dark mode'}).click();await p.waitForTimeout(350);
    assert.deepEqual(await paper(),selected,'theme does not move page');
    await p.screenshot({path:`outputs/mobile-calibration/pwa-${w}-dark.png`,animations:'disabled'});
    await p.locator('[data-word-hit]').first().click();
    await p.locator('[data-unit-tid]').first().click();
    await p.locator('[data-pill="jali"]').click();
    await p.getByRole('button',{name:'Dismiss last mistake'}).waitFor();
    assert.deepEqual(await paper(),selected,'mistake strip does not move page');
    await p.getByRole('button',{name:'Undo',exact:true}).click();
    await p.getByRole('button',{name:'Finish',exact:true}).click();
    await p.getByRole('dialog').first().waitFor();
    report.push({size:[w,h],paper:selected,menu,readyLiveStable:true,themeStable:true,markUndo:true,finishReachable:true});
    await ctx.close();
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();writeFileSync('outputs/mobile-calibration/interactions.json',JSON.stringify({report,errors},null,2));console.log(report,errors);}
