import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
mkdirSync('outputs/claude-completion/numbers',{recursive:true});
const browser=await chromium.launch();const results=[];
try {
 for(const mode of ['ruler','stepper']) for(const [width,height,slim,side,theme] of [[1191,668,true,'left','light'],[1024,768,true,'left','light'],[1400,900,false,'left','light'],[1280,800,false,'right','dark'],[390,844,true,'left','light'],[320,740,true,'left','light']]) {
  const page=await browser.newPage({viewport:{width,height},hasTouch:width<600,deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({mode,slim,side,theme})=>{localStorage.setItem('tahqeeq.hintSeen.assignedRail.v1','1');localStorage.setItem('tanween.phrases.help.v1','seen');localStorage.setItem('tahqeeq:devicePreferences.v5',JSON.stringify({version:5,slimScorePanel:slim,judgeRailSide:side,aduRaaguInputMode:mode,theme}));},{mode,slim,side,theme});
  await page.goto('http://127.0.0.1:5346/scripts/qa/mobile-paper.html?sessionStorage=3&qaSurah=79&qaAyah=33&qaLines=10');
  await page.waitForFunction(()=>window.providerQA);
  await page.evaluate(()=>window.providerQA.dispatch({type:'SET_CONFIG',category:'adu-raagu',start:20}));
  await page.waitForFunction(()=>window.providerQA.state.config['adu-raagu'].start===20);
  await page.getByRole('button',{name:'Load prepared mobile sample'}).click();
  await page.getByRole('button',{name:'Begin judging',exact:true}).click();
  await page.waitForFunction(()=>window.providerQA?.state.sessionActive);
  await page.evaluate(()=>window.providerQA.addFindings(8));
  if(width<600)await page.locator('.mobile-score-action').click();
  const card=page.locator('.scorecard:visible');const picker=card.locator('.mark-picker');
  await page.waitForTimeout(250);
  assert.ok(await picker.evaluate((el,mode)=>el.classList.contains(`mark-picker-${mode}`),mode));
  const cases=[];
  for(const value of [0,.5,7.5,9.5,10,11.5,19.5,20]) {
   await page.evaluate(value=>window.providerQA.dispatch({type:'SET_IMPRESSION',category:'adu-raagu',awarded:value}),value);
   await page.waitForFunction(value=>document.querySelector('.scorecard .mark-picker')?.getAttribute('aria-valuenow')===String(value),value);
   const geometry=await picker.evaluate(el=>{
    const b=el.getBoundingClientRect();
    const textBounds=node=>{const range=document.createRange();range.selectNodeContents(node);return range.getBoundingClientRect();};
    const n=textBounds(el.querySelector('.mark-picker-value'));const m=textBounds(el.querySelector('.mark-picker-of'));
    return {width:b.width,height:b.height,leftInset:n.left-b.left,rightInset:b.right-m.right,centerError:Math.abs((n.left+m.right)/2-(b.left+b.right)/2),text:el.textContent,overflow:el.scrollWidth>el.clientWidth};
   });
   assert.ok(geometry.centerError<.5,JSON.stringify({width,value,geometry}));
   assert.ok(geometry.leftInset>=8 && geometry.rightInset>=8 && !geometry.overflow && geometry.height===44,JSON.stringify({width,value,geometry}));
   if(cases.length)assert.equal(geometry.width,cases[0].geometry.width);
   cases.push({value,geometry});
   if(value===11.5 && mode==='ruler'){
    await card.screenshot({path:`outputs/claude-completion/numbers/card-${width}.png`});
    await page.locator(width<600?'.mobile-score-sheet':'.sidebar').screenshot({path:`outputs/claude-completion/numbers/context-${width}.png`});
   }
  }
  await picker.focus();await picker.press('ArrowLeft');
  await page.waitForFunction(()=>window.providerQA.state.impressions.some(i=>i.category==='adu-raagu'&&i.awarded===19.5));
  assert.deepEqual(errors,[]);results.push({mode,width,cases});await page.close();
 }
 writeFileSync('outputs/claude-completion/numbers/results.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify({views:results.length,values:results.reduce((n,r)=>n+r.cases.length,0),maxCenterError:Math.max(...results.flatMap(r=>r.cases.map(c=>c.geometry.centerError))),minInset:Math.min(...results.flatMap(r=>r.cases.map(c=>c.geometry.leftInset))),modes:[...new Set(results.map(r=>r.mode))]}));
}finally{await browser.close();}
