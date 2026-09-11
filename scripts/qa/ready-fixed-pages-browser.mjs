import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='outputs/mobile-ready-pages';mkdirSync(out,{recursive:true});
const browser=await chromium.launch();const report=[],errors=[];
async function jump(p,n){await p.getByRole('button',{name:/Pages .*Jump to page/}).click();await p.getByRole('spinbutton').fill(String(n));await p.getByRole('button',{name:'Go',exact:true}).click();}
try{
for(const [w,h] of [[390,844],[430,932],[320,568]]){
 const ctx=await browser.newContext({viewport:{width:w,height:h},hasTouch:true,isMobile:true});
 await ctx.addInitScript(()=>{const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);window.assets={alive:new Set(),peak:0};URL.createObjectURL=b=>{const u=create(b);window.assets.alive.add(u);window.assets.peak=Math.max(window.assets.peak,window.assets.alive.size);return u;};URL.revokeObjectURL=u=>{window.assets.alive.delete(u);return revoke(u);};});
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:5296/scripts/qa/mobile-paper.html?mobileCalibration=1&simulateSafeAreas=1');
 await p.getByRole('button',{name:'Load prepared mobile sample'}).click();await p.locator('.page-fixed-mushaf').waitFor();
 await p.getByRole('button',{name:'Begin judging',exact:true}).click();await p.waitForTimeout(700);
 await p.evaluate(()=>{window.frames=[];window.observer=new MutationObserver(()=>window.frames.push({loading:!!document.querySelector('.fixed-mushaf-loading,.mushaf-loading'),pages:[...document.querySelectorAll('.page-fixed-mushaf')].map(e=>e.dataset.page),label:document.querySelector('.page-nav-page')?.getAttribute('aria-label')}));window.observer.observe(document.querySelector('#root'),{subtree:true,childList:true,attributes:true});});
 for(const n of [603,604,603]){await jump(p,n);await p.locator(`.page-fixed-mushaf[data-page="${n}"]`).waitFor();await p.waitForTimeout(250);}
 const warm=await p.evaluate(()=>window.frames);assert.ok(!warm.some(f=>f.loading),'warm page must never mount a loading placeholder');
 assert.ok(warm.every(f=>f.pages.length===1 && f.label===`Pages ${f.pages[0]}. Jump to page.`),'label/artwork agree in every observed mutation');
 let release;const gate=new Promise(r=>release=r);
 await p.route('**/mushaf/**/p255.*',async route=>{await gate;await route.continue();});
 const state=()=>p.evaluate(()=>localStorage.getItem('tahqeeq.session.v1'));
 const before=await state();await jump(p,255);await p.locator('.fixed-navigation-status').waitFor();
 assert.equal(await p.locator('.page-fixed-mushaf').getAttribute('data-page'),'603');
 assert.equal(await p.locator('.page-fixed-mushaf').getAttribute('data-judging-enabled'),'false');
 assert.match(await p.locator('.page-nav-page').getAttribute('aria-label'),/Pages 603\./);
 assert.equal(await state(),before);
 release();await p.locator('.page-fixed-mushaf[data-page="255"]').waitFor();await p.unroute('**/mushaf/**/p255.*');await p.waitForTimeout(400);
 await p.locator('[data-word-hit]').first().click();await p.locator('[data-unit-tid]').first().click();await p.locator('[data-pill="jali"]').click();
 await p.getByRole('button',{name:'Dismiss last mistake'}).waitFor();const marked=JSON.parse(await state());assert.equal(marked.mistakes.at(-1).page,255);
 await p.getByRole('button',{name:'Undo',exact:true}).click();
 await ctx.setOffline(true);await jump(p,256);await p.locator('.page-fixed-mushaf[data-page="256"]').waitFor();await jump(p,255);await p.locator('.page-fixed-mushaf[data-page="255"]').waitFor();
 await jump(p,500);await p.locator('.fixed-navigation-status[role="alert"]').waitFor();assert.equal(await p.locator('.page-fixed-mushaf').getAttribute('data-page'),'255');
 await ctx.setOffline(false);await p.getByRole('button',{name:'Retry',exact:true}).click();await p.locator('.page-fixed-mushaf[data-page="500"]').waitFor();await p.waitForTimeout(500);
 const owned=await p.evaluate(()=>({peak:window.assets.peak,current:window.assets.alive.size}));assert.ok(owned.peak<=3,`page blob bound ${JSON.stringify(owned)}`);
 await p.screenshot({path:`${out}/${w}-ready.png`});
 report.push({w,h,warmNoPlaceholder:true,coherentLabels:true,coldOldPagePinned:true,pendingMarkingDisabled:true,markedPage:255,offlineWarm:true,offlineErrorRetry:true,owned});
 await p.setViewportSize({width:844,height:390});await p.waitForTimeout(500);assert.ok(await p.locator('.page-fixed-mushaf').count()>0);await p.setViewportSize({width:w,height:h});await p.waitForTimeout(600);assert.ok(await p.locator('.page-fixed-mushaf').count()===1);
 await ctx.close();
}
assert.deepEqual(errors,[]);
}catch(e){errors.push(String(e));console.error(e);process.exitCode=1;}finally{await browser.close();writeFileSync(`${out}/report.json`,JSON.stringify({report,errors},null,2));console.log(JSON.stringify({report,errors}));}
