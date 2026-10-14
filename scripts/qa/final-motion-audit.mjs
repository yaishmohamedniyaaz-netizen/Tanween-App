import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='outputs/final-motion-audit';mkdirSync(out,{recursive:true});
const browser=await chromium.launch();const results=[];
try {
 for(const [width,height] of [[1191,668],[768,1024],[390,844],[320,740]]) {
  for(const reduced of [false,true]) {
   const page=await browser.newPage({viewport:{width,height},hasTouch:width<900,reducedMotion:reduced?'reduce':'no-preference'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{localStorage.setItem('tahqeeq.hintSeen.assignedRail.v1','1');localStorage.setItem('tanween.phrases.help.v1','seen');localStorage.setItem('tahqeeq:devicePreferences.v5',JSON.stringify({version:5,slimScorePanel:true,judgeRailSide:'left'}));});
   await page.goto('http://127.0.0.1:5346/scripts/qa/mobile-paper.html?sessionStorage=3&qaSurah=79&qaAyah=33&qaLines=10');
   await page.getByRole('button',{name:'Load prepared mobile sample'}).click();
   await page.getByRole('button',{name:'Begin judging',exact:true}).evaluate(e=>e.click());
   await page.waitForFunction(()=>window.providerQA?.state.sessionActive);await page.evaluate(()=>window.providerQA.addFindings(8));await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);
   const original=await page.locator('.page-fixed-mushaf').first().boundingBox();
   const ledger=await page.evaluate(()=>JSON.stringify({events:window.providerQA.state.events,mistakes:window.providerQA.state.mistakes}));
   const checks=[];
   async function stable(label) {
    const current=await page.locator('.page-fixed-mushaf').first().boundingBox();
    for(const k of ['x','y','width','height'])assert.ok(Math.abs(current[k]-original[k])<.5,`${width}: ${label} paper ${k}`);
    checks.push(label);
   }
   if(width<600) {
    for(let i=0;i<3;i++) {
     await page.locator('.mobile-score-action').click();await page.waitForTimeout(100);await stable('score-open');
     assert.equal(await page.locator('.mobile-sheet-close').evaluate(el=>el===document.activeElement),true);
     await page.keyboard.press('Escape');await page.waitForTimeout(100);await stable('score-close');
     assert.equal(await page.locator('.mobile-score-action').evaluate(el=>el===document.activeElement),true);
    }
   }
   for(let i=0;i<3;i++) {
    if(width<600)await page.locator('.mobile-mistakes-action').click();
    else await page.getByRole('button',{name:'View all',exact:true}).evaluate(e=>e.click());
    await page.waitForTimeout(100);await stable('review-open');
    const panel=page.locator('.mistake-panel.is-expanded:visible');
    for(const name of ['History','Current']) {
     await page.getByRole(width<600?'button':'tab',{name:width<600?(name==='History'?/^History/:'Current mistakes'):new RegExp(`^${name}`)}).evaluate(e=>e.click());
     await page.waitForTimeout(80);await stable(name);
    }
    await page.keyboard.press('Escape');await page.waitForTimeout(100);await stable('review-close');
    const trigger=width<600?page.locator('.mobile-mistakes-action'):page.getByRole('button',{name:'View all',exact:true});
    assert.ok(await trigger.evaluate(el=>el===document.activeElement),'Review returns keyboard focus');
   }
   await page.getByRole('button',{name:width<600?'Finish':'Finish recitation',exact:true}).evaluate(e=>e.click());
   await page.waitForTimeout(120);await stable('finish-review');
   const moving=await page.locator('.finish-dialog').evaluate(el=>el.getAnimations().map(a=>({keyframes:a.effect.getKeyframes(),timing:a.effect.getComputedTiming()})));
   await page.keyboard.press('Escape');await page.waitForTimeout(100);await stable('finish-cancel');
   assert.equal(await page.evaluate(()=>JSON.stringify({events:window.providerQA.state.events,mistakes:window.providerQA.state.mistakes})),ledger,'Review does not change judging evidence');
   assert.deepEqual(errors,[]);
   await page.screenshot({path:`${out}/${width}-${reduced?'reduced':'normal'}.png`});
   results.push({width,reduced,checks,errors,finishAnimations:moving});await page.close();
  }
 }
}finally{await browser.close();writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));}
console.log(JSON.stringify(results.map(({width,reduced,checks,errors})=>({width,reduced,passed:checks.length,errors}))));
