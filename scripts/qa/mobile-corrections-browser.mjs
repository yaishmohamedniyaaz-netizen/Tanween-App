import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url);const {chromium}=require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='outputs/mobile-corrections';mkdirSync(out,{recursive:true});const browser=await chromium.launch();const report=[],errors=[];
const metrics=()=>{const rect=s=>document.querySelector(s)?.getBoundingClientRect().toJSON();const footer=rect('.mobile-dock-actions');return {paper:rect('.fixed-page-frame'),nav:rect('.page-nav'),deck:rect('.mobile-judge-deck'),scroll:scrollY,values:[...document.querySelectorAll('.mobile-criterion-chip')].map(e=>({w:e.getBoundingClientRect().width,text:e.innerText,font:getComputedStyle(e.querySelector('.mobile-criterion-value')).fontSize,clearance:footer.top-e.querySelector('.mobile-criterion-value').getBoundingClientRect().bottom}))};};
try{
if(process.argv[2]!=='desktop') for(const [w,h]of [[390,844],[430,932],[320,568]]){
 const c=await browser.newContext({viewport:{width:w,height:h},hasTouch:true,isMobile:true});const p=await c.newPage();p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:5296/scripts/qa/mobile-paper.html?mobileCalibration=1&simulateSafeAreas=1');await p.getByRole('button',{name:'Load prepared mobile sample'}).click();await p.locator('.page-fixed-mushaf').waitFor();await p.waitForTimeout(300);const ready=await p.locator('.fixed-page-frame').boundingBox();
 await p.getByRole('button',{name:'Begin judging',exact:true}).click();await p.waitForTimeout(500);const normal=await p.evaluate(metrics);
 if(w>=390)assert.deepEqual(await p.locator('.fixed-page-frame').boundingBox(),ready,'normal Ready/Live stability');
 assert.ok(normal.values.every(v=>v.clearance>=7),'normal value clearance');assert.ok(normal.values.every(v=>v.w===normal.values[0].w),'equal columns');
 await p.screenshot({path:`${out}/${w}-normal.png`});
 await p.getByRole('button',{name:/Pages .*Jump to page/}).click();await p.getByRole('spinbutton').waitFor();await p.waitForTimeout(150);
 assert.equal(await p.getByRole('spinbutton').evaluate(e=>getComputedStyle(e).fontSize),'16px');
 const paperBeforeKeyboard=await p.locator('.fixed-page-frame').boundingBox();
 // Synthetic visual-viewport events test placement math, not a native keyboard.
 await p.evaluate(()=>{Object.defineProperty(visualViewport,'height',{configurable:true,value:300});Object.defineProperty(visualViewport,'offsetTop',{configurable:true,value:60});visualViewport.dispatchEvent(new Event('resize'));visualViewport.dispatchEvent(new Event('scroll'));});await p.waitForTimeout(150);
 const menu=await p.locator('.page-nav-popover').boundingBox();assert.ok(menu.y>=72&&menu.y+menu.height<=348.1);assert.ok(menu.x>=0&&menu.x+menu.width<=w);assert.deepEqual(await p.locator('.fixed-page-frame').boundingBox(),paperBeforeKeyboard);
 await p.screenshot({path:`${out}/${w}-viewport-popup.png`});await p.keyboard.press('Escape');assert.equal(await p.locator('.page-nav-popover').count(),0);assert.equal(await p.evaluate(()=>document.activeElement.className),'page-nav-page');
 await p.evaluate(()=>{delete visualViewport.height;delete visualViewport.offsetTop;visualViewport.dispatchEvent(new Event('resize'));});
 await p.locator('[data-word-hit]').first().click();await p.locator('[data-unit-tid]').first().click();await p.locator('[data-pill="jali"]').click();await p.locator('.mobile-mistake-expiry').waitFor();
 const length=()=>p.locator('.mobile-mistake-expiry').evaluate(e=>e.getBoundingClientRect().width);const initial=await length();await p.waitForTimeout(400);assert.ok(await length()<initial);
 assert.deepEqual(await p.locator('.fixed-page-frame').boundingBox(),paperBeforeKeyboard,'notification keeps paper stable');await p.screenshot({path:`${out}/${w}-countdown.png`});
 await p.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await p.locator('.mobile-mistake-expiry').count(),0);
 if(w===390){
  await p.emulateMedia({reducedMotion:'reduce'});
  await p.locator('[data-word-hit]').first().click();await p.locator('[data-unit-tid]').first().click();await p.locator('[data-pill="jali"]').click();
  await p.locator('.mobile-last-action').waitFor();
  assert.equal(await p.locator('.mobile-mistake-expiry').evaluate(e=>getComputedStyle(e).display),'none');
  await p.locator('.mobile-last-action').waitFor({state:'detached',timeout:6500});
  assert.deepEqual(await p.locator('.fixed-page-frame').boundingBox(),paperBeforeKeyboard,'deadline expiry keeps paper stable');
  await p.emulateMedia({reducedMotion:'no-preference'});
 }
 const style=await p.addStyleTag({content:'.mobile-criterion-label{font-size:24px!important}.mobile-criterion-value{font-size:28px!important}'});await p.waitForTimeout(350);const enlarged=await p.evaluate(metrics);assert.ok(enlarged.values.every(v=>v.font==='28px'&&v.clearance>=7));assert.ok(enlarged.paper.bottom<=enlarged.nav.y);assert.ok(enlarged.nav.bottom<=enlarged.deck.y+1);assert.equal(enlarged.scroll,0);await p.screenshot({path:`${out}/${w}-enlarged.png`});await style.evaluate(e=>e.remove());await p.waitForTimeout(200);
 // Visual-only typography extremes, no fabricated persisted judging records.
 const halfMarks=await p.locator('.mobile-criterion-value').last().evaluate(e=>{const saved=e.textContent;e.textContent='17.5 / 20';const result={width:e.getBoundingClientRect().width,available:e.parentElement.clientWidth};e.textContent=saved;return result;});assert.ok(halfMarks.width<=halfMarks.available-4);
 if(w===390){const safe=await p.addStyleTag({content:'.app[data-mobile-calibration="true"].view-judge .mushaf-scroll.has-fixed-pages .mushaf-shared-nav>.page-nav{width:132px;grid-template-columns:repeat(3,44px)}'});await p.screenshot({path:`${out}/touch-width-comparison.png`});await safe.evaluate(e=>e.remove());}
 report.push({w,h,normal,enlarged,popup:menu,halfMarks,deadlineLine:true,keyboardIsSynthetic:true});await c.close();
}
for(const [w,h]of [[1024,768],[1280,800],[1400,900],[844,390]]){
 const c=await browser.newContext({viewport:{width:w,height:h},reducedMotion:'reduce'});const p=await c.newPage();await p.goto('http://127.0.0.1:5296/scripts/qa/mobile-paper.html');await p.getByRole('button',{name:'Load prepared mobile sample'}).click();await p.locator('.page-fixed-mushaf').first().waitFor();await p.getByRole('button',{name:'Begin judging',exact:true}).click();
 const shots=[];for(const flag of [0,1]){await p.goto(`http://127.0.0.1:5296/?mobileCalibration=${flag}`);await p.locator('.page-fixed-mushaf').first().waitFor();await p.addStyleTag({content:'*,*::before,*::after{caret-color:transparent!important}'});await p.mouse.move(0,0);await p.waitForTimeout(600);shots.push(await p.screenshot({path:`${out}/${w}-${h}-${flag}.png`,animations:'disabled'}));}
 const raster=JSON.parse(execFileSync('python',['-c',"from PIL import Image,ImageChops;import sys,json;d=ImageChops.difference(Image.open(sys.argv[1]).convert('RGB'),Image.open(sys.argv[2]).convert('RGB'));ps=list(d.getdata());print(json.dumps({'pixels':sum(max(p)>0 for p in ps),'maxDelta':max(max(p) for p in ps),'bounds':d.getbbox()}))",`${out}/${w}-${h}-0.png`,`${out}/${w}-${h}-1.png`],{encoding:'utf8'}));
 report.push({w,h,flagScreenshotsIdentical:shots[0].equals(shots[1]),raster});assert.ok(raster.pixels<=10&&raster.maxDelta<=1,'no difference beyond isolated 1/255 edge antialiasing');await c.close();
}
assert.deepEqual(errors,[]);
}catch(e){errors.push(String(e));console.error(e);process.exitCode=1;}finally{await browser.close();writeFileSync(`${out}/${process.argv[2]==='desktop'?'desktop-report':'report'}.json`,JSON.stringify({report,errors},null,2));console.log(JSON.stringify({report,errors}));}
