import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch();
try {
 for(const [width,height] of [[1024,768],[1280,800],[1400,900]]) {
  const context=await browser.newContext({viewport:{width,height}});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:5296/scripts/qa/mobile-paper.html');
  await page.getByRole('button',{name:'Load prepared mobile sample'}).click();
  await page.getByRole('button',{name:'Begin judging',exact:true}).click();
  await page.locator('[data-word-hit]').first().waitFor();
  const pages=await page.locator('.page-fixed-mushaf').evaluateAll(nodes=>nodes.map(e=>Number(e.dataset.page)));
  assert.equal(pages.length,2);
  for(const number of pages) {
   await page.locator(`.page-fixed-mushaf[data-page="${number}"] [data-word-hit]`).first().click();
   await page.locator('[data-unit-tid]').first().click();
   await page.locator('[data-pill="jali"]').click();
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('tahqeeq.session.v1')));
   assert.ok(saved.mistakes.some(m=>m.page===number),`page ${number} did not save a mistake at ${width}`);
  }
  await page.reload();
  await page.locator('[data-word-hit]').first().waitFor();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('tahqeeq.session.v1')));
  assert.deepEqual(saved.mistakes.map(m=>m.page).sort(),pages.sort());
  console.log(`${width}x${height}: both pages save exactly one mark and retain them after reload`);
  await context.close();
 }
} finally {await browser.close();}
