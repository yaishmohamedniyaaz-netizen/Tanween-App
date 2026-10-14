import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch();const results=[];
try {
  for(const width of [1191,390]) for(const reduced of [false,true]) {
    const page=await browser.newPage({viewport:{width,height:844},reducedMotion:reduced?'reduce':'no-preference'});
    await page.goto('http://127.0.0.1:5346/scripts/qa/mobile-paper.html?sessionStorage=3');
    const result=await page.evaluate(() => {
      const pill=document.createElement('div');pill.className='pill committing';pill.textContent='Motion probe';document.body.append(pill);
      const animation=pill.getAnimations().find(a=>a.animationName==='pill-commit');
      if(!animation)throw new Error('Commit animation unavailable');
      animation.pause();const keyframes=animation.effect.getKeyframes();
      const transforms=[];
      for(const time of [0,20,40,60]) {animation.currentTime=time;transforms.push(getComputedStyle(pill).transform);}
      const timing=animation.effect.getTiming();pill.remove();return{keyframes,transforms,duration:timing.duration};
    });
    const hasScale=result.keyframes.some(k=>k.transform&&k.transform!=='none');
    assert.equal(hasScale,!reduced,'Commit scaling must follow the motion preference');
    if(reduced)assert.ok(result.transforms.every(t=>t==='none'),'Reduced motion keeps the pill geometry fixed');
    assert.ok(result.keyframes.some(k=>k.opacity==='0'),'Commit feedback retains its fade');
    results.push({width,reduced,...result});await page.close();
  }
}finally{await browser.close();}
console.log(JSON.stringify(results,null,2));
