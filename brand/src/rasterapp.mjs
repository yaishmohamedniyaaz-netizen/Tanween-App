import { chromium } from 'playwright-core';
import fs from 'fs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const [f,px] of [['tanween-512',512],['tanween-192',192],['tanween-maskable-512',512],['tanween-apple-touch-180',180]]){
  const p=await b.newPage({viewport:{width:px,height:px},deviceScaleFactor:1});
  await p.goto('file://'+process.cwd()+'/appicons/'+f+'.svg'); await p.waitForTimeout(180);
  await p.screenshot({path:'appicons/'+f+'.png',omitBackground:true}); await p.close();
}
await b.close(); console.log('png written');
