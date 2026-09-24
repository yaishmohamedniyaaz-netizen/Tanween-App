import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch();
const out='outputs/phrase-header/printed-basmala';mkdirSync(out,{recursive:true});
const base=process.env.QA_BASE_URL || 'http://127.0.0.1:5320';
try {
 for(const [width,surah,ayah,lines,pageNumber] of [[1400,79,33,10,585],[390,79,33,10,585],[1400,2,1,5,2],[390,112,1,3,604]]) {
  const context=await browser.newContext({viewport:{width,height:900}}),p=await context.newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{localStorage.setItem('tahqeeq.hintSeen.assignedRail.v1','1');localStorage.setItem('tanween.phrases.help.v1','seen');});
  await p.goto(`${base}/scripts/qa/mobile-paper.html?phraseHeader=1&sessionStorage=3&qaSurah=${surah}&qaAyah=${ayah}&qaLines=${lines}`);
  await p.getByRole('button',{name:'Load prepared mobile sample'}).click();
  await p.getByRole('button',{name:'Begin judging',exact:true}).click();
  await p.locator('[data-word-hit]').first().waitFor();
  if(!await p.locator(`.page-fixed-mushaf[data-page="${pageNumber}"]`).count()) {
   await p.locator('.page-nav-page').click();
   await p.getByRole('dialog',{name:'Jump to page',exact:true}).getByRole('spinbutton').fill(String(pageNumber));
   await p.getByRole('button',{name:'Go',exact:true}).click();
  }
  const root=p.locator(`.page-fixed-mushaf[data-page="${pageNumber}"]`);
  const targetSurah=pageNumber===585?80:surah;
  const wid=`${targetSurah}.b.0`;
  await root.locator(`[data-word-hit="${wid}"]`).waitFor();
  await p.screenshot({path:`${out}/opening-${width}-p${pageNumber}.png`});
  for(let i=0;i<4;i++) {
   const target=root.locator(`[data-word-hit="${targetSurah}.b.${i}"]`);
   await target.click();await p.locator('[data-unit-tid]').first().click();
   await p.locator('[data-pill="jali"]').click();
   await p.waitForFunction(count=>window.providerQA.state.mistakes.length===count,i+1);
  }
  const before=await p.evaluate(()=>window.providerQA.state.mistakes);
  assert(before.every(m=>m.surah===targetSurah && m.ayah===null && m.page===pageNumber && !m.phrase));
  await root.locator(`[data-word-hit="${wid}"]`).click();await p.locator('[data-unit-tid]').first().click();
  await p.locator('[data-pill="khafi"]').click();
  await p.waitForFunction(()=>window.providerQA.state.mistakes[0].category==='khafi');
  assert.equal(await p.evaluate(()=>window.providerQA.state.mistakes.length),4);
  await p.waitForFunction(()=>window.providerQA.status.phase==='saved');
  await p.reload();await p.waitForFunction(()=>window.providerQA?.state.mistakes.length===4);
  await root.locator(`[data-word-hit="${wid}"]`).waitFor();
  await p.screenshot({path:`${out}/marked-${width}-p${pageNumber}.png`});
  if(width===390 && pageNumber===585) {
   await p.getByRole('button',{name:'More actions and view controls',exact:true}).click();
   await p.getByRole('button',{name:'Switch to dark mode',exact:true}).click();
   await p.keyboard.press('Escape');
   await root.locator(`[data-word-hit="${wid}"]`).click();
   await p.locator('[data-unit-tid]').first().click();
   await p.screenshot({path:`${out}/dark-letter-tray-${width}.png`});
   const undo=await p.getByRole('button',{name:/Hold to undo/i}).boundingBox();
   await p.mouse.move(undo.x+undo.width/2,undo.y+undo.height/2);
   await p.mouse.down();await p.waitForTimeout(1000);await p.mouse.up();
   await p.waitForFunction(()=>window.providerQA.state.mistakes.length===3);
   await root.locator(`[data-word-hit="${wid}"]`).click();await p.locator('[data-unit-tid]').first().click();
   await p.locator('[data-pill="khafi"]').click();
   await p.waitForFunction(()=>window.providerQA.state.mistakes.length===4);
  }
  // Opening recital Bismillah is a separate finding, not an alias of surah.b.
  await p.locator('.phrase-header-trigger').click();await p.locator('.phrase-word').nth(5).click();
  await p.locator('[data-unit-tid]').first().click();await p.locator('[data-pill="jali"]').click();
  await p.waitForFunction(()=>window.providerQA.state.mistakes.length===5);
  assert.equal(await p.evaluate(()=>window.providerQA.state.mistakes.filter(m=>m.evidenceKind==='phrase').length),1);
  await p.evaluate(async()=>{
   const q=window.providerQA;
   q.dispatch({type:'SET_IMPRESSION',category:'adu-raagu',awarded:q.state.activeAssignment.config['adu-raagu'].start});
   q.dispatch({type:'FINISH_SESSION'});
  });
  await p.waitForFunction(()=>window.providerQA.state.history.length===1);
  const restored=await p.evaluate(async()=>{
   const {buildStateBackup,parseStateBackup}=await import('/src/lib/resultPackages.ts');
   return parseStateBackup(buildStateBackup(window.providerQA.state)).history[0].mistakes;
  });
  assert.equal(restored.length,5);assert.equal(restored.filter(m=>m.ayah===null).length,4);
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width} page ${pageNumber}: four words, correction, reload, separate opening phrase, completed backup`);
  await context.close();
 }
} finally {await browser.close();}
