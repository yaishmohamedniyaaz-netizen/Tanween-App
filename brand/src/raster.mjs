import { chromium } from 'playwright-core';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const dir='file://'+process.cwd()+'/';
async function icon(src,out,px){
  const p=await b.newPage({viewport:{width:px,height:px},deviceScaleFactor:1});
  await p.goto(dir+'assets/'+src); await p.waitForTimeout(200);
  await p.screenshot({path:'assets/'+out,omitBackground:true}); await p.close();
}
for(const [src,out,px] of [
  ['tanween-icon-dark.svg','tanween-icon-1024.png',1024],
  ['tanween-icon-dark.svg','tanween-icon-512.png',512],
  ['tanween-icon-dark.svg','tanween-icon-192.png',192],
  ['tanween-icon-dark.svg','tanween-icon-apple-180.png',180],
  ['tanween-favicon.svg','tanween-favicon-32.png',32],
  ['tanween-favicon.svg','tanween-favicon-16.png',16],
]) await icon(src,out,px);
for(const [f,out] of [['r_lockup_ink','tanween-lockup-ink.png'],['r_lockup_paper','tanween-lockup-paper.png']]){
  const p=await b.newPage({viewport:{width:400,height:120},deviceScaleFactor:4});
  await p.goto(dir+f+'.html',{waitUntil:'networkidle'}); await p.waitForTimeout(600);
  await p.locator('#t').screenshot({path:'assets/'+out,omitBackground:true}); await p.close();
}
const p=await b.newPage({viewport:{width:1140,height:760},deviceScaleFactor:2});
await p.goto(dir+'r_proof.html',{waitUntil:'networkidle'}); await p.waitForTimeout(600);
await p.screenshot({path:'assetproof.png',fullPage:true});
await b.close(); console.log('raster done');
