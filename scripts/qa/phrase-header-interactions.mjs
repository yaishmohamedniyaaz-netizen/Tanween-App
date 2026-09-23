import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const base=process.env.QA_BASE_URL || 'http://127.0.0.1:5320';
try {
 for(const width of [320,390,740,1400]) {
  const context=await browser.newContext({viewport:{width,height:width===740?360:844},permissions:['microphone']});
  const page=await context.newPage();
  await page.addInitScript(()=>{
   localStorage.setItem('tahqeeq.hintSeen.assignedRail.v1','1');
   localStorage.setItem('tanween.phrases.help.v1','seen');
   window.qaMicrophoneCalls=0;
   const get=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
   navigator.mediaDevices.getUserMedia=(...args)=>{window.qaMicrophoneCalls++;return get(...args);};
  });
  await page.goto(`${base}/scripts/qa/mobile-paper.html?phraseHeader=1`);
  await page.getByRole('button',{name:'Load prepared mobile sample'}).click();
  await page.getByRole('checkbox',{name:'Record this practice recitation'}).check();
  await page.getByRole('button',{name:'Begin judging',exact:true}).click();
  await page.getByRole('button',{name:/Pause recording at/}).waitFor();
  await page.evaluate(()=>window.scrollTo(0,0));
  const official=await page.evaluate(()=>localStorage.getItem('tahqeeq.session.v1'));
  const microphoneCalls=await page.evaluate(()=>window.qaMicrophoneCalls);
  await page.locator('.phrase-header-trigger').click();
  await page.locator('.phrase-word').first().waitFor();
  const word=page.locator('.phrase-word').first();
  for(const index of [0,1]) {
   await word.click();await page.locator('[data-unit-tid]').nth(index).click();await page.locator('[data-pill="jali"]').click();
  }
  assert.equal(await word.getAttribute('aria-label'),'أَعُوذُ, 2 findings');
  assert.equal(await page.locator('.phrase-word-count').textContent(),'2');
  assert.equal(await page.evaluate(()=>window.qaMicrophoneCalls),microphoneCalls,'Opening/marking must not acquire another microphone stream');
  assert.equal(await page.evaluate(()=>localStorage.getItem('tahqeeq.session.v1')),official,'UI proof must not write official evidence');
  await page.getByRole('button',{name:/Pause recording at/}).click();
  await page.getByRole('button',{name:/Resume recording at/}).waitFor();
  assert.equal(await page.locator('#starting-ending-panel').count(),0);
  await page.screenshot({path:`outputs/phrase-header/recording-paused-${width}.png`});
  await page.getByRole('button',{name:/Resume recording at/}).click();
  await page.getByRole('button',{name:/Pause recording at/}).waitFor();
  // Navigate away: Return keeps its own context slot beside the new action.
  await page.locator('.page-nav-page').click();
  await page.getByRole('dialog',{name:'Jump to page',exact:true}).getByRole('spinbutton').fill('600');
  await page.getByRole('button',{name:'Go',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('.page-fixed-mushaf')].some(e=>e.dataset.page==='600'));
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:`outputs/phrase-header/return-recording-${width}.png`});
  const returnButton=width<600?page.locator('.mobile-question-return'):page.locator('.question-return-bubble');
  assert(await returnButton.isVisible());
  await page.locator('.phrase-header-trigger').click();
  await page.locator('.phrase-word').first().waitFor();
  await returnButton.click();
  assert.equal(await page.locator('#starting-ending-panel').count(),0);
  await page.waitForFunction(()=>[...document.querySelectorAll('.page-fixed-mushaf')].some(e=>e.dataset.page==='604'));
  // Theme and Results have exactly one visible entry on compact active judging.
  if(width<600) {
   assert.equal(await page.locator('.view-toggle').isVisible(),false);
   await page.getByRole('button',{name:'More actions and view controls',exact:true}).click();
   await page.getByRole('button',{name:'Switch to dark mode',exact:true}).click();
   await page.waitForTimeout(1000);
   await page.locator('.phrase-header-trigger').click();
   await page.locator('.phrase-word').first().waitFor();
   await page.screenshot({path:`outputs/phrase-header/dark-${width}.png`});
  }
  await page.locator('.phrase-header-trigger').focus();
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.getByRole('button',{name:/Pause recording at/}).click();
  console.log(`PASS recording, Return, two letters, storage isolation ${width}`);
  await context.close();
 }
}finally{await browser.close();}
