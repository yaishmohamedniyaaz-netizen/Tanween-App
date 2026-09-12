import { chromium } from 'playwright-core';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage();
await p.goto('file://'+process.cwd()+'/manual.html',{waitUntil:'networkidle'});
await p.waitForTimeout(2500);
await p.pdf({path:'Tanween-Brand-Standards.pdf',width:'1600px',height:'820px',
  printBackground:true,margin:{top:'0',right:'0',bottom:'0',left:'0'}});
await b.close(); console.log('pdf');
