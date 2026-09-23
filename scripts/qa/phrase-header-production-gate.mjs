import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch();
mkdirSync('outputs/phrase-header/production',{recursive:true});
try {
 const seed=await browser.newContext(),p=await seed.newPage();
 await p.goto('http://127.0.0.1:5320/scripts/qa/mobile-paper.html');
 await p.getByRole('button',{name:'Load prepared mobile sample'}).click();
 await p.getByRole('button',{name:'Begin judging',exact:true}).click();
 await p.locator('[data-word-hit]').first().waitFor();
 const storage=await p.evaluate(()=>Object.entries(localStorage));
 for(const width of [390,1400]) {
  const target=await browser.newContext({viewport:{width,height:900}});
  await target.addInitScript(entries=>{
   // Seed once: a reload must not rewrite the migration baseline.
   if(!localStorage.getItem('qa-seeded')) {
    for(const [key,value] of entries)localStorage.setItem(key,value);
    const s=JSON.parse(localStorage.getItem('tahqeeq.session.v1'));s.competition.isSample=false;
    if(s.competition.liveSnapshot)s.competition.liveSnapshot.isSample=false;
    localStorage.setItem('tahqeeq.session.v1',JSON.stringify(s));localStorage.setItem('qa-seeded','1');
   }
   localStorage.setItem('tanween.phrases.help.v1','seen');localStorage.setItem('tahqeeq.hintSeen.assignedRail.v1','1');
   window.legacyBefore=localStorage.getItem('tahqeeq.session.v1');
   window.readSaved=async()=>{
    const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('tanween-session-v3');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    const raw=await new Promise(resolve=>{const r=db.transaction('snapshots').objectStore('snapshots').get('current');r.onsuccess=()=>resolve(r.result);});db.close();
    return raw?JSON.parse(JSON.parse(raw).payload).state:null;
   };
  },storage);
  const page=await target.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5322/');await page.locator('.phrase-header-trigger').waitFor();
  const trigger=await page.locator('.phrase-header-trigger').boundingBox(),card=await page.locator('.reciter-chip').boundingBox();
  assert(trigger.x+trigger.width<=card.x,'Starting & ending must be left of the participant card');
  await page.waitForFunction(async()=>!!await window.readSaved());
  assert.equal(await page.evaluate(()=>localStorage.getItem('tahqeeq.session.v1')),await page.evaluate(()=>window.legacyBefore));
  const before=await page.evaluate(()=>window.readSaved());assert.equal(before.competition.isSample,false);assert(before.activeSessionId);
  await page.locator('.phrase-header-trigger').click();
  const mark=async category=>{await page.locator('.phrase-word').first().click();await page.locator('[data-unit-tid]').first().click();await page.locator(`[data-pill="${category}"]`).click();};
  await mark('jali');await page.waitForFunction(async()=>(await window.readSaved())?.mistakes.length===1);
  await mark('khafi');await page.waitForFunction(async()=>(await window.readSaved())?.mistakes[0].category==='khafi');
  await page.reload();await page.locator('.page-nav-page:visible').first().waitFor();await page.locator('.phrase-header-trigger').click();
  await page.locator('#starting-ending-panel').waitFor();
  const visibleNav=await page.locator('.page-nav:visible').first().boundingBox(),panel=await page.locator('#starting-ending-panel').boundingBox();
  assert(panel.x+panel.width<=visibleNav.x || panel.x>=visibleNav.x+visibleNav.width || panel.y>=visibleNav.y+visibleNav.height || panel.y+panel.height<=visibleNav.y,'Panel must leave the page selector accessible');
  assert.equal(await page.locator('.phrase-word').first().getAttribute('aria-label'),'أَعُوذُ, 1 finding');
  const after=await page.evaluate(()=>window.readSaved());assert.equal(after.mistakes.length,1);assert.equal(after.activeSessionId,before.activeSessionId);
  assert.equal(await page.evaluate(()=>localStorage.getItem('tahqeeq.session.v1')),await page.evaluate(()=>window.legacyBefore));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`outputs/phrase-header/production/left-saved-${width}.png`});
  assert.deepEqual(errors,[]);console.log(`PASS production migration, left header, official phrase correction and reload ${width}`);
  await target.close();
 }
 await seed.close();
}finally{await browser.close();}
