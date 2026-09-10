import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch();const results=[];
const base='http://127.0.0.1:5296/scripts/qa/mobile-paper.html?simulateSafeAreas=1&mobileCalibration=';
async function settle(p){await p.locator('.page-fixed-mushaf').waitFor();await p.waitForLoadState('networkidle');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(400);}
function diff(a,b,path=''){if(JSON.stringify(a)===JSON.stringify(b))return [];if(a&&b&&typeof a==='object'&&typeof b==='object')return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(k=>diff(a[k],b[k],`${path}.${k}`));return [{path,before:a,after:b}];}
try {
 for(const [w,h] of [[390,844],[430,932],[320,568]]){
  const c=await browser.newContext({viewport:{width:w,height:h},hasTouch:true,reducedMotion:'reduce'});const p=await c.newPage();
  await p.goto(base+'1');await p.getByRole('button',{name:'Load prepared mobile sample'}).click();await settle(p);
  await p.getByRole('button',{name:'Begin judging',exact:true}).click();await settle(p);
  // Include a real mark in the persisted-state comparison.
  await p.locator('[data-word-hit]').first().click();await p.locator('[data-unit-tid]').first().click();await p.locator('[data-pill="jali"]').click();await p.getByRole('button',{name:'Dismiss last mistake'}).click();
  const state=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('tahqeeq.session.v1')));
  let before=await state();
  for(const flag of ['1','1','0','1']){await p.goto(base+flag);await settle(p);const after=await state();results.push({test:'reload-state',w,flag,changes:diff(before,after)});before=after;}
  const measure=()=>p.locator('.mobile-criterion-value').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();const strip=document.querySelector('.mobile-criterion-strip').getBoundingClientRect();const footer=document.querySelector('.mobile-dock-actions').getBoundingClientRect();return {text:e.textContent,font:getComputedStyle(e).fontSize,y:r.y,bottom:r.bottom,stripBottom:strip.bottom,footerTop:footer.top,overlapsFooter:r.bottom>footer.top+1};}));
  const dismiss=p.getByRole('button',{name:'Dismiss last mistake'});if(await dismiss.isVisible())await dismiss.click();await p.locator('.mobile-criterion-value').first().waitFor();
  results.push({test:'default-text',w,values:await measure()});
  const cd=await c.newCDPSession(p);const hit=await p.locator('[data-word-hit]').first().boundingBox();const xy={x:hit.x+hit.width/2,y:hit.y+hit.height/2};const original=await state();
  await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[xy]});await p.waitForTimeout(600);await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:xy.x+10,y:xy.y+10}]});await cd.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  results.push({test:'touch-cancel',w,changes:diff(original,await state()),scrollY:await p.evaluate(()=>scrollY)});
  await p.locator('.mobile-criterion-label,.mobile-criterion-value').evaluateAll(es=>es.forEach(e=>e.style.setProperty('font-size',e.classList.contains('mobile-criterion-label')?'24px':'28px','important')));
  await p.waitForTimeout(400);
  results.push({test:'enlarged-text',w,values:await measure()});await p.screenshot({path:`outputs/mobile-calibration-safety/${w}-verified-enlarged.png`});await c.close();
 }
}finally{await browser.close();writeFileSync('outputs/mobile-calibration-safety/followup.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));}
