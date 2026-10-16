import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin=process.env.SETUP_QA_URL||'http://127.0.0.1:5346';
const out='outputs/preview-loading-fix';mkdirSync(out,{recursive:true});
const browser=await chromium.launch();const results=[];
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<1,`${label}: ${a} vs ${b}`);
try{for(const [width,height] of [[1400,900],[1024,768],[768,1024],[390,844],[320,740]]){
 for(const reducedMotion of ['no-preference','reduce']){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<=768,isMobile:width<=390,reducedMotion,serviceWorkers:'block'});
  const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  const holds=new Map();const hold=n=>{let release;const promise=new Promise(r=>release=r);holds.set(n,promise);return release;};
  await p.route('**/pages/p*.json*',async r=>{const n=Number(new URL(r.request().url()).pathname.match(/p(\d+)\.json/)[1]);if(holds.has(n))await holds.get(n);if(n===301)return r.fulfill({status:503,body:'Controlled QA failure'});await r.continue();});
  const initialRelease=hold(582);
  await p.goto(origin,{waitUntil:'domcontentloaded'});
  await p.getByRole('button',{name:/Open competition setup/}).click();
  await p.getByRole('button',{name:/^Draft questions,/}).click();
  await p.getByRole('button',{name:/Open question workspace/}).click();
  await p.locator('.question-preview-state').waitFor();
  const geometry=()=>p.evaluate(()=>{const preview=document.querySelector('.question-preview');return {preview:preview.getBoundingClientRect().height,canvas:preview.querySelector('.question-preview-canvas').getBoundingClientRect().height,actions:document.querySelector('.question-builder-actions').getBoundingClientRect().top,scroll:document.querySelector('main').scrollTop,details:[...preview.children].map(e=>({cls:e.className,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})),paper:{w:preview.querySelector('.page').getBoundingClientRect().width,h:preview.querySelector('.page').getBoundingClientRect().height}};});
  const same=(a,b,label)=>{near(a.preview,b.preview,`${label} preview`);near(a.canvas,b.canvas,`${label} canvas`);near(a.actions,b.actions,`${label} actions`);near(a.scroll,b.scroll,`${label} scroll`);};
  await p.evaluate(()=>document.fonts.ready);await p.getByText('Already saved',{exact:true}).waitFor();await p.waitForTimeout(400);const initial=await geometry();initialRelease();
  await p.locator('.question-preview-page[data-page="582"]').waitFor();same(initial,await geometry(),'first load');
  const go=async n=>{await p.locator('#question-preview-page').fill(String(n));await p.locator('#question-preview-page').press('Enter');};
  const release300=hold(300);await go(300);await p.locator('.question-preview-state[role="status"]').waitFor();
  assert.equal(await p.locator('.question-preview .m-word').count(),0,'No stale Quran text under a newly requested page number');
  assert.equal(await p.locator('.question-preview-canvas').getAttribute('aria-busy'),'true');
  const loading=await geometry();release300();await p.locator('.question-preview-page[data-page="300"]').waitFor();same(loading,await geometry(),'cold load');
  assert.equal(await p.locator('.question-preview-canvas').getAttribute('aria-busy'),'false');
  const ready=await geometry();await go(301);await p.locator('.question-preview-state[role="alert"]').waitFor();same(ready,await geometry(),'failed load');
  await p.screenshot({path:`${out}/error-${width}-${reducedMotion}.png`});
  const release302=hold(302);await go(302);await p.locator('.question-preview-state[role="status"]').waitFor();const recovering=await geometry();
  release302();await p.locator('.question-preview-page[data-page="302"]').waitFor();same(recovering,await geometry(),'recovery');
  const release303=hold(303);await go(303);await p.locator('.question-preview-state').waitFor();
  await p.setViewportSize({width:width===320?390:320,height:740});await p.waitForTimeout(400);const resized=await geometry();
  release303();await p.locator('.question-preview-page[data-page="303"]').waitFor();const resizedLoaded=await geometry();if(Math.abs(resized.preview-resizedLoaded.preview)>1){console.log(JSON.stringify({width,reducedMotion,resized,resizedLoaded}));await p.screenshot({path:`${out}/resize-debug.png`});}same(resized,resizedLoaded,'resize while loading');
  await p.setViewportSize({width,height});await p.waitForTimeout(400);
  const release304=hold(304);await go(304);await p.locator('.question-preview-state').waitFor();await go(305);await p.locator('.question-preview-page[data-page="305"]').waitFor();
  release304();await p.waitForTimeout(150);assert.equal(await p.locator('.question-preview-page[data-page]').getAttribute('data-page'),'305','Late response cannot replace the current page');
  // Font failure must retain the semantic Quran text and reserved paper geometry.
  await p.route('**/p306.woff2*',r=>r.abort());const release306=hold(306);await go(306);await p.locator('.question-preview-state').waitFor();const fontLoading=await geometry();release306();
  await p.locator('.question-preview-page[data-page="306"][data-font-ready="false"]').waitFor();same(fontLoading,await geometry(),'font fallback');
  assert.ok((await p.locator('.question-preview .m-word').first().textContent()).trim().length>0);
  // Opening and short pages still use the same paper dimensions.
  for(const n of [1,2,604]){const prior=await geometry();await go(n);await p.locator(`.question-preview-page[data-page="${n}"]`).waitFor();same(prior,await geometry(),`page ${n}`);}
  await go(582);await p.locator('.question-preview-page[data-page="582"]').waitFor();
  const marker=p.locator('.question-preview .question-ayah-pick').nth(1);await marker.focus();await p.keyboard.press('Enter');await p.locator('.question-preview .question-ayah-pick[aria-pressed="true"]').waitFor();
  assert.ok(await p.locator('.question-preview .question-range-word').count(),'Passage selection is retained');
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');assert.deepEqual(errors,[]);
  results.push({width,height,reducedMotion,firstLoad:true,coldLoad:true,error:true,recovery:true,resizedLoad:true,staleResponseIgnored:true,fontFallback:true,openingAndShortPages:true,ayahSelection:true});
  console.log(`PASS preview loading ${width}px ${reducedMotion}`);await context.close();
 }
}}finally{await browser.close();writeFileSync(`${out}/browser-results.json`,JSON.stringify(results,null,2));}
