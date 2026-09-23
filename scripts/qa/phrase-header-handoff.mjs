import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch();
try {
 for(const width of [390,1400]) {
  const c=await browser.newContext({viewport:{width,height:900},hasTouch:true});const p=await c.newPage();
  await p.addInitScript(()=>localStorage.setItem('tahqeeq.hintSeen.assignedRail.v1','1'));
  await p.goto('http://127.0.0.1:5320/scripts/qa/mobile-paper.html?phraseHeader=1');
  await p.getByRole('button',{name:'Load prepared mobile sample'}).click();
  await p.getByRole('button',{name:'Begin judging',exact:true}).click();
  await p.locator('[data-word-hit]').first().waitFor();
  await p.evaluate(()=>window.scrollTo(0,0));
  await p.locator('.phrase-header-trigger').tap();
  await p.getByRole('button',{name:'Got it',exact:true}).tap();
  const word=p.locator('.phrase-word').first();
  // Continuous pointer gesture through the same letter/category controls.
  const box=await word.boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();
  const unit=await p.locator('[data-unit-tid]').first().boundingBox();await p.mouse.move(unit.x+unit.width/2,unit.y+unit.height/2,{steps:5});
  const category=await p.locator('[data-pill="jali"]').boundingBox();await p.mouse.move(category.x+category.width/2,category.y+category.height/2,{steps:5});await p.mouse.up();
  await p.locator('.phrase-word.has-mark').waitFor();
  // Tap pathway, keyboard cancellation, and no focus theft on handoff.
  await word.tap();await p.locator('.drag-menu').waitFor();
  await p.keyboard.press('Escape');assert.equal(await p.locator('.drag-menu').count(),0);
  assert.equal(await p.locator('#starting-ending-panel').count(),1);
  const more=p.getByRole('button',{name:'More actions and view controls',exact:true});await more.focus();
  await p.waitForFunction(()=>!document.querySelector('#starting-ending-panel'));
  assert(await more.evaluate(e=>document.activeElement===e));
  await p.keyboard.press('Enter');await p.locator('.more-controls-popover').waitFor();
  await p.locator('.phrase-header-trigger').focus();assert.equal(await p.locator('.more-controls-popover').count(),0);
  await p.keyboard.press('Enter');await word.waitFor();
  assert.equal(await p.getByRole('button',{name:'Got it',exact:true}).count(),0);
  await p.getByRole('button',{name:'Phrase marking help',exact:true}).click();await p.getByRole('button',{name:'Got it',exact:true}).click();
  const point=await p.evaluate(()=>{
   const panel=document.querySelector('#starting-ending-panel').getBoundingClientRect();
   for(const e of document.querySelectorAll('[data-word-hit]')) {
    const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
    if(y>60&&y<innerHeight-110&&x>0&&x<innerWidth&&!(x>panel.left&&x<panel.right&&y>panel.top&&y<panel.bottom))return {x,y};
   }
   return null;
  });assert(point,'An exposed Quran word is required for the first-press safety check');
  const saved=await p.evaluate(()=>localStorage.getItem('tahqeeq.session.v1'));
  await p.touchscreen.tap(point.x,point.y);
  assert.equal(await p.locator('#starting-ending-panel').count(),0);assert.equal(await p.locator('.drag-menu').count(),0);
  assert.equal(await p.evaluate(()=>localStorage.getItem('tahqeeq.session.v1')),saved);
  // Both rail homes and full/spread layout retain a usable independent panel.
  await more.click();await p.getByRole('radio',{name:'Right',exact:true}).click();
  await p.getByRole('radio',{name:'Full page',exact:true}).click();await p.keyboard.press('Escape');
  await p.locator('.phrase-header-trigger').click();await word.waitFor();
  await p.screenshot({path:`outputs/phrase-header/right-full-${width}.png`});
  assert.equal(await p.locator('.workspace.rail-right.layout-full').count(),1);
  console.log(`PASS gestures, keyboard handoff, first-press protection, right rail ${width}`);await c.close();
 }
}finally{await browser.close();}
