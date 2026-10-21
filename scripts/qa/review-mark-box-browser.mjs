import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='outputs/review-mark-box';mkdirSync(out,{recursive:true});
const browser=await chromium.launch();const results=[];
const measure=el=>{
 const b=el.getBoundingClientRect(),s=getComputedStyle(el),p=getComputedStyle(el,'::before');
 const bounds=selector=>{const r=document.createRange();r.selectNodeContents(el.querySelector(selector));return r.getBoundingClientRect();};
 const n=bounds('.mark-picker-value'),m=bounds('.mark-picker-of');
 return {width:b.width,height:b.height,visibleHeight:b.height-parseFloat(p.top)-parseFloat(p.bottom),font:getComputedStyle(el.querySelector('.mark-picker-value')).fontSize,padding:s.padding,gap:s.columnGap,centerError:Math.abs((n.left+m.right)/2-(b.left+b.right)/2),leftInset:n.left-b.left,rightInset:b.right-m.right,overflow:el.scrollWidth>el.clientWidth};
};
try{
 for(const mode of ['ruler','stepper'])for(const width of [1191,390,320]){
  const page=await browser.newPage({viewport:{width,height:width>600?768:844},hasTouch:width<600,isMobile:width<600});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(mode=>{localStorage.setItem('tahqeeq.hintSeen.assignedRail.v1','1');localStorage.setItem('tanween.phrases.help.v1','seen');localStorage.setItem('tahqeeq:devicePreferences.v5',JSON.stringify({version:5,slimScorePanel:true,aduRaaguInputMode:mode}));},mode);
  await page.goto('http://127.0.0.1:5346/scripts/qa/mobile-paper.html?sessionStorage=3&qaSurah=79&qaAyah=33&qaLines=10',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.providerQA);
  await page.evaluate(()=>window.providerQA.dispatch({type:'SET_CONFIG',category:'adu-raagu',start:20}));
  await page.getByRole('button',{name:'Load prepared mobile sample'}).click();
  await page.getByRole('button',{name:'Begin judging',exact:true}).click();
  await page.waitForFunction(()=>window.providerQA.state.sessionActive);
  await page.evaluate(()=>window.providerQA.dispatch({type:'SET_IMPRESSION',category:'adu-raagu',awarded:11.5}));
  await page.evaluate(()=>document.fonts.ready);
  if(width<600)await page.locator('.mobile-score-action').click();
  const main=await page.locator('.scorecard:visible .mark-picker').evaluate(measure);
  if(mode==='ruler')await page.locator(width<600?'.mobile-score-sheet':'.sidebar').screenshot({path:`${out}/main-${width}.png`});
  if(width<600)await page.keyboard.press('Escape');
  await page.getByRole('button',{name:width<600?'Finish':'Finish recitation',exact:true}).click();
  const picker=page.locator('.finish-dialog .mark-picker');await picker.waitFor();
  await page.locator('.finish-dialog').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished));});
  const cases=[];
  for(const value of [0,.5,9.5,10,11.5,19.5,20]){
   await page.evaluate(value=>window.providerQA.dispatch({type:'SET_IMPRESSION',category:'adu-raagu',awarded:value}),value);
   await page.waitForFunction(value=>document.querySelector('.finish-dialog .mark-picker')?.getAttribute('aria-valuenow')===String(value),value);
   const g=await picker.evaluate(measure);
   for(const key of ['width','height','visibleHeight'])assert.ok(Math.abs(g[key]-main[key])<.1,`${width}/${mode}/${key}`);
   for(const key of ['font','padding','gap'])assert.equal(g[key],main[key],`${width}/${mode}/${key}`);
   assert.ok(g.centerError<.5&&g.leftInset>=8&&g.rightInset>=8&&!g.overflow,JSON.stringify(g));
   cases.push({value,...g});
   if(value===11.5&&mode==='ruler')await page.locator('.finish-dialog').screenshot({path:`${out}/review-${width}.png`});
  }
  await picker.focus();await picker.press('ArrowLeft');
  await page.waitForFunction(()=>window.providerQA.state.impressions.some(i=>i.category==='adu-raagu'&&i.awarded===19.5));
  await picker.click();
  await page.locator('.mark-bar:visible').waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.finish-dialog').evaluate(el=>el.open),true);
  assert.deepEqual(errors,[]);results.push({width,mode,main,cases});await page.close();
 }
 writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify({views:results.length,values:results.reduce((n,r)=>n+r.cases.length,0),passed:true}));
}finally{await browser.close();}
