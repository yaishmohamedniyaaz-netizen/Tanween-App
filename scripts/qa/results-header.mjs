import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch();
try {
 for(const [width,height] of [[1024,768],[1280,800],[1400,900],[390,844]]) {
  const context=await browser.newContext({viewport:{width,height}});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:5296/scripts/qa/mobile-paper.html');
  await page.getByRole('button',{name:'Load prepared mobile sample'}).click();
  await page.getByRole('button',{name:'Begin judging',exact:true}).click();
  await page.locator('[data-word-hit]').first().waitFor();
  const measure=()=>page.locator('.app-header').evaluate(e=>({height:e.getBoundingClientRect().height,padding:getComputedStyle(e).padding}));
  const judge=await measure();
  await page.locator('.view-toggle').click();
  await page.locator('.view-records').waitFor();
  const results=await measure();
  console.log({width,judge,results});
  await page.waitForTimeout(350);
  await page.screenshot({path:`outputs/results-header-${width}.png`});
  if(process.argv.includes('--verify') && width>900) assert.equal(results.height,judge.height);
  await page.locator('.view-toggle').click();
  assert.deepEqual(await measure(),judge);
  await context.close();
 }
}finally{await browser.close();}
