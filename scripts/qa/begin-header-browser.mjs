import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
// The production header entry is opt-in on Vite dev: always exercise it here.
const origin=process.env.BEGIN_QA_URL||'http://127.0.0.1:5346/?phraseHeader=1';
const out=process.env.BEGIN_QA_OUT||'outputs/begin-header-fix';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({ignoreDefaultArgs:['--hide-scrollbars']});const results=[];
const read=()=>{
 const box=el=>{const b=el.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height};};
 return{header:box(document.querySelector('.app-header')),
  frame:box(document.querySelector('.mushaf-shell')),
  pages:[...document.querySelectorAll('.mushaf-scroll > .mushaf-composition .page-fixed-mushaf')]
   .filter(el=>!el.closest('.mushaf-swipe-layer'))
   .map(el=>({page:el.dataset.page,paper:box(el),image:box(el.querySelector('img'))}))};
};
try{
 for(const [width,height] of [[870,668],[1191,668],[1400,900],[390,844]])
 for(const zoom of width<600?[100]:[100,125])
 for(const motion of ['no-preference','reduce']){
  const key=`${width}-${zoom}-${motion}`;
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<=900,isMobile:width<600,reducedMotion:motion});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(zoom=>localStorage.setItem('tahqeeq:devicePreferences.v5',JSON.stringify({version:5,mushafZoom:zoom})),zoom);
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:/Open competition setup/}).click();
  await page.getByRole('button',{name:'Start competition',exact:true}).click();
  await page.getByRole('button',{name:'Reciter queue',exact:true}).click();
  await page.locator('.next-reciter-main').click();
  await page.getByRole('button',{name:'Number 1',exact:true}).click();
  const begin=page.getByRole('button',{name:'Begin judging',exact:true});await begin.waitFor();
  const summary=await page.locator('.prepared-sidebar-question-summary-full').textContent();
  const expected=summary.match(/page (\d+)/)?.[1];assert.ok(expected);
  await page.waitForFunction(expected=>[...document.querySelectorAll('.mushaf-scroll > .mushaf-composition .page-fixed-mushaf')].some(el=>!el.closest('.mushaf-swipe-layer')&&el.dataset.page===expected),expected);
  await page.locator('.fixed-navigation-status').waitFor({state:'hidden'});
  await page.evaluate(()=>document.fonts.ready);
  await begin.scrollIntoViewIfNeeded();await page.waitForTimeout(150);
  const before=await page.evaluate(read);
  if(zoom===100&&motion==='no-preference')await page.screenshot({path:`${out}/prepared-${width}.png`});
  await page.evaluate(src=>{const read=(0,eval)(`(${src})`),start=performance.now();window.beginFrames=[];window.beginDone=false;function frame(){window.beginFrames.push(read());if(performance.now()-start<900)requestAnimationFrame(frame);else window.beginDone=true;}frame();},String(read));
  await begin.click();await page.waitForFunction(()=>window.beginDone);
  const frames=await page.evaluate(()=>window.beginFrames);
  const trigger=page.locator('.phrase-header-trigger');await trigger.waitFor({state:'visible'});
  assert.ok((await trigger.boundingBox()).height>=44,'Retain the phrase control touch target');
  let maxDrift=0;
  for(const frame of frames){
   assert.deepEqual(frame.pages.map(p=>p.page),before.pages.map(p=>p.page));
   const pairs=[[before.header,frame.header],[before.frame,frame.frame],...before.pages.flatMap((p,i)=>[[p.paper,frame.pages[i].paper],[p.image,frame.pages[i].image]])];
   for(const [a,b] of pairs)for(const k of ['x','y','w','h'])maxDrift=Math.max(maxDrift,Math.abs(a[k]-b[k]));
  }
  if(maxDrift>=.5)writeFileSync(`${out}/failure-${key}.json`,JSON.stringify({before,frames},null,2));
  assert.ok(maxDrift<.5,`${key}: ${maxDrift}px movement at Begin`);
  assert.deepEqual(errors,[]);
  if(zoom===100&&motion==='no-preference')await page.screenshot({path:`${out}/live-${width}.png`});
  results.push({key,maxDrift,frames:frames.length,errors});
  writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log(`PASS ${key}: ${maxDrift}px drift`);
  await context.close();
 }
}finally{await browser.close();}
