import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const mode = process.argv[2] || 'before';
const out = 'outputs/mobile-calibration';
mkdirSync(out, {recursive:true});
const browser = await chromium.launch();
const report=[];
try {
  for (const [width,height] of [[1024,768],[1280,800],[1400,900],[844,390],[390,844],[430,932]]) {
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
    await context.addInitScript(()=>{const NativeDate=Date;globalThis.Date=class extends NativeDate {constructor(...args){super(...(args.length?args:[1893456000000]));} static now(){return 1893456000000;}};});
    const p=await context.newPage();
    await p.goto('http://127.0.0.1:5296/scripts/qa/mobile-paper.html');
    await p.getByRole('button',{name:'Load prepared mobile sample'}).click();
    await p.locator('.page-fixed-mushaf').first().waitFor();
    await p.goto(`http://127.0.0.1:5296/?mobileCalibration=${mode==='after'?'1':'0'}`);
    await p.locator('.page-fixed-mushaf').first().waitFor();
    await p.waitForLoadState('networkidle');
    await p.addStyleTag({content:'*,*::before,*::after { animation: none !important; transition: none !important; caret-color: transparent !important; }'});
    await p.evaluate(()=>document.fonts.ready);
    await p.waitForTimeout(700);
    for (const phase of ['ready','live']) {
      if(phase==='live') {await p.getByRole('button',{name:'Begin judging',exact:true}).click();await p.waitForTimeout(700);}
      const metrics=await p.evaluate(()=>{
        const rect=s=>{const e=document.querySelector(s),r=e?.getBoundingClientRect();return r?{x:r.x,y:r.y,w:r.width,h:r.height}:null;};
        return {paper:rect('.fixed-page-frame'),nav:rect('.page-nav'),deck:rect('.mobile-judge-dock'),header:rect('.app-header'),overflow:document.documentElement.scrollWidth>innerWidth+1};
      });
      const name=`${width}-${height}-${phase}`;
      const png=await p.screenshot({animations:'disabled'});
      writeFileSync(`${out}/${mode}-${name}.png`,png);
      report.push({name,...metrics,...(mode==='after'&&width>600?{identical:png.equals(readFileSync(`${out}/baseline-${name}.png`))}:{})});
    }
    await context.close();
  }
} finally {await browser.close();writeFileSync(`${out}/${mode}.json`,JSON.stringify(report,null,2));console.log(report);}
