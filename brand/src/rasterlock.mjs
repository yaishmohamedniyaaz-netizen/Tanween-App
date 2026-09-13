import { chromium } from 'playwright-core';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
// lockup aspect: 293.76 x 44.71
const H=240, W=Math.round(240*293.76/44.71);
for(const n of ['tanween-lockup-ink','tanween-lockup-paper']){
  const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
  await p.goto('file://'+process.cwd()+'/assets/'+n+'.svg'); await p.waitForTimeout(200);
  await p.screenshot({path:'assets/'+n+'.png',omitBackground:true}); await p.close();
}
const CW=Math.round(240*6.7101), CH=240;
for(const n of ['tanween-wordmark-ink','tanween-wordmark-paper']){
  const p=await b.newPage({viewport:{width:CW,height:CH},deviceScaleFactor:1});
  await p.goto('file://'+process.cwd()+'/assets/'+n+'.svg'); await p.waitForTimeout(200);
  await p.screenshot({path:'assets/'+n+'.png',omitBackground:true}); await p.close();
}
await b.close(); console.log('lockup pngs');
