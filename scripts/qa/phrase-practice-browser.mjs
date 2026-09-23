import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch();
const base=process.env.QA_BASE_URL || 'http://127.0.0.1:5320';
const url=`${base}/scripts/qa/mobile-paper.html?phraseHeader=1&sessionStorage=3`;
mkdirSync('outputs/phrase-header/practice',{recursive:true});
const results=[];
const saved=p=>p.waitForFunction(()=>window.providerQA?.status?.phase==='saved');
const state=p=>p.evaluate(()=>window.providerQA.state);
const open=async p=>{if(!await p.locator('#starting-ending-panel').count())await p.locator('.phrase-header-trigger').click();await p.locator('.phrase-word').first().waitFor();};
const mark=async(p,word,letter,category)=>{await open(p);await p.locator('.phrase-word').nth(word).click();await p.locator('[data-unit-tid]').nth(letter).click();await p.locator(`[data-pill="${category}"]`).click();};
const finish=async(p,count=1)=>{
  await p.evaluate(()=>{const q=window.providerQA;if(q.state.activeAssignment.categories.includes('adu-raagu'))q.dispatch({type:'SET_IMPRESSION',category:'adu-raagu',awarded:q.state.activeAssignment.config['adu-raagu'].start});q.dispatch({type:'FINISH_SESSION'});});
  await p.waitForFunction(count=>window.providerQA.state.history.length===count,count);await saved(p);
};
try {
 for(const width of [390,1400]) {
  const c=await browser.newContext({viewport:{width,height:900}}),p=await c.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{localStorage.setItem('tahqeeq.hintSeen.assignedRail.v1','1');localStorage.setItem('tanween.phrases.help.v1','seen');});
  await p.goto(url);await p.getByRole('button',{name:'Load prepared mobile sample'}).click();
  await p.getByRole('button',{name:'Begin judging',exact:true}).click();await p.locator('[data-word-hit]').first().waitFor();await saved(p);
  const initial=await state(p);assert.equal(initial.mistakes.length,0,'optional phrases must not add automatic deductions');
  await mark(p,0,0,'jali');await p.waitForFunction(()=>window.providerQA.state.mistakes.length===1);await saved(p);
  let current=await state(p);const id=current.mistakes[0].id;
  assert.equal(current.mistakes[0].evidenceKind,'phrase');assert.equal(current.mistakes[0].phrase.occurrenceId,current.activeSessionId);
  assert.equal(current.mistakes[0].surah,undefined);
  const events=current.events.length;
  await mark(p,0,0,'jali');await saved(p);assert.equal((await state(p)).events.length,events,'same category must not create another event');
  await p.evaluate(id=>window.providerQA.dispatch({type:'SET_MISTAKE_AMOUNT',id,amount:0.75}),id);
  await p.waitForFunction(()=>window.providerQA.state.mistakes[0].amount===0.75);await saved(p);
  await mark(p,0,0,'jali');assert.equal((await state(p)).mistakes[0].amount,0.75,'repeat must retain manually adjusted amount');
  await mark(p,0,0,'khafi');await p.waitForFunction(()=>window.providerQA.state.mistakes[0].category==='khafi');await saved(p);
  current=await state(p);assert.equal(current.mistakes.length,1);assert.equal(current.mistakes[0].id,id);assert.equal(current.mistakes[0].amount,current.activeAssignment.config.khafi.step);
  await p.reload();await p.waitForFunction(()=>window.providerQA?.state.mistakes.length===1);await saved(p);await open(p);
  assert.equal(await p.locator('.phrase-word').first().getAttribute('aria-label'),'أَعُوذُ, 1 finding');
  await mark(p,0,1,'jali');await p.waitForFunction(()=>window.providerQA.state.mistakes.length===2);await saved(p);
  await p.screenshot({path:`outputs/phrase-header/practice/highlights-${width}.png`});
  // Use the existing correction tray's hold-to-undo control.
  await p.locator('.phrase-word').first().click();await p.locator('[data-unit-tid]').first().click();
  const undo=p.getByRole('button',{name:/Hold to undo/i});
  await undo.waitFor();const box=await undo.boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.waitForTimeout(1000);await p.mouse.up();
  await p.waitForFunction(()=>window.providerQA.state.mistakes.length===1);await saved(p);
  let undone=(await state(p)).events.filter(e=>e.type==='mistake_undone').at(-1);
  await p.reload();await p.waitForFunction(()=>window.providerQA?.state.mistakes.length===1);await saved(p);
  await p.evaluate(eventId=>window.providerQA.dispatch({type:'RESTORE_MISTAKE',eventId}),undone.id);
  await p.waitForFunction(()=>window.providerQA.state.mistakes.length===2);await saved(p);
  // A removed letter marked afresh cannot also restore its former deduction.
  await p.evaluate(id=>window.providerQA.dispatch({type:'REMOVE_MISTAKE',id}),id);
  await p.waitForFunction(()=>window.providerQA.state.mistakes.length===1);await saved(p);
  undone=(await state(p)).events.filter(e=>e.type==='mistake_undone').at(-1);
  await mark(p,0,0,'khafi');await p.waitForFunction(()=>window.providerQA.state.mistakes.length===2);await saved(p);
  const beforeRestore=(await state(p)).events.length;
  await p.evaluate(eventId=>window.providerQA.dispatch({type:'RESTORE_MISTAKE',eventId}),undone.id);
  assert.equal((await state(p)).events.length,beforeRestore);assert.equal((await state(p)).mistakes.length,2);
  // Bismillah and closing use their own exact targets; nothing is mandatory.
  await mark(p,5,0,'jali');await mark(p,9,0,'khafi');
  await p.waitForFunction(()=>window.providerQA.state.mistakes.length===4);await saved(p);
  current=await state(p);const mistakes=current.mistakes;
  const beforeInvalid=current.events.length;
  await p.evaluate(mistake=>{
    for(const patch of [{wordText:'invalid'},{judgeSeatId:'another-judge'},{phrase:{...mistake.phrase,occurrenceId:'another-recitation'}},{evidenceKind:'unknown'}])
      window.providerQA.dispatch({type:'ADD_MISTAKE',mistake:{...mistake,...patch,id:'invalid-attempt'}});
  },mistakes[0]);
  assert.equal((await state(p)).events.length,beforeInvalid,'invalid source, ownership and recitation must be rejected');
  const expected=await p.evaluate(async()=>{const {computeScores}=await import('/src/lib/scoring.ts');return computeScores(window.providerQA.state).total;});
  await finish(p);
  current=await state(p);assert.equal(current.history[0].ledgerVersion,3);assert.equal(current.history[0].mistakes.length,4);
  // Required impression is awarded its full score during finish.
  const expectedFinal=expected+(initial.activeAssignment.categories.includes('adu-raagu')?initial.activeAssignment.config['adu-raagu'].start:0);
  assert.equal(current.history[0].total,expectedFinal);
  const packageCheck=await p.evaluate(async()=>{const m=await import('/src/lib/resultPackages.ts');const s=window.providerQA.state;const result=m.buildJudgeResultPackage(s.history[0],s.competition);const backup=m.buildStateBackup(s);return {schema:result.schema,count:m.parseJudgeResultPackage(result).session.mistakes.length,backup:m.parseStateBackup(backup).history[0].mistakes.length};});
  assert.deepEqual(packageCheck,{schema:'judge-result-v2',count:4,backup:4});
  await p.evaluate(()=>window.providerQA.dispatch({type:'REOPEN_SESSION',id:window.providerQA.state.history[0].id,reason:'Practice correction verification'}));
  await p.waitForFunction(()=>window.providerQA.state.sessionActive);await saved(p);await open(p);
  assert.equal(await p.locator('.phrase-word').first().getAttribute('aria-label'),'أَعُوذُ, 2 findings');
  await mark(p,0,1,'khafi');await saved(p);assert.equal((await state(p)).mistakes.length,4);
  await finish(p);await p.evaluate(()=>window.providerQA.dispatch({type:'SET_PARTICIPANT',patch:{name:'Next practice reciter'}}));
  await p.waitForFunction(()=>window.providerQA.state.participant.name==='Next practice reciter');await saved(p);
  await p.reload();await p.waitForFunction(()=>window.providerQA?.state.participant.name==='Next practice reciter');await saved(p);
  current=await state(p);assert.equal(current.mistakes.length,0);assert.equal(current.history[0].mistakes.length,4);
  assert.equal(await p.evaluate(()=>localStorage.getItem('tahqeeq.session.v1')),null);
  // The approved main-app writer also supports ordinary competitions.
  await p.evaluate(initial=>window.providerQA.dispatch({type:'LOAD',state:{...initial,competition:{...initial.competition,isSample:false}}}),initial);
  await p.waitForFunction(()=>!window.providerQA.state.competition.isSample);await saved(p);
  await p.evaluate(mistake=>window.providerQA.dispatch({type:'ADD_MISTAKE',mistake}),mistakes[0]);
  await p.waitForFunction(()=>window.providerQA.state.mistakes.length===1);await saved(p);
  await finish(p);
  // Real file readers and reducer: backup restore, conflicting result import,
  // reopened correction, resave, and reload retain the original evidence IDs.
  await p.evaluate(async()=>{
    const m=await import('/src/lib/resultPackages.ts'),q=window.providerQA;
    const backup=await m.readStateBackupFile(new File([JSON.stringify(m.buildStateBackup(q.state))],'backup.json'));
    q.dispatch({type:'LOAD',state:backup});
  });await saved(p);
  await p.evaluate(async()=>{
    const m=await import('/src/lib/resultPackages.ts'),q=window.providerQA;
    const copy={...q.state.history[0],notes:'Imported correction copy'};
    const result=await m.readJudgeResultFile(new File([JSON.stringify(m.buildJudgeResultPackage(copy,q.state.competition))],'result.json'));
    q.dispatch({type:'IMPORT_SESSION',session:result.session});
  });
  await p.waitForFunction(()=>window.providerQA.state.history.length===2);await saved(p);
  await p.evaluate(()=>{const q=window.providerQA;q.dispatch({type:'REOPEN_SESSION',id:q.state.history.find(s=>s.conflictsWith).id,reason:'Review imported correction'});});
  await p.waitForFunction(()=>window.providerQA.state.sessionActive);await saved(p);
  await open(p);assert.equal(await p.locator('.phrase-word').first().getAttribute('aria-label'),'أَعُوذُ, 1 finding');
  await mark(p,0,1,'khafi');await saved(p);assert.equal((await state(p)).mistakes.length,1);
  await finish(p,2);await p.reload();await p.waitForFunction(()=>window.providerQA?.state.history.length===2);await saved(p);
  assert.deepEqual(errors,[]);
  results.push({width,sameLetterCorrection:true,adjustedAmountPreserved:true,reload:true,holdUndo:true,restore:true,noDuplicateRestore:true,finishReopen:true,packageRoundtrip:true});
  console.log(`PASS saved phrase practice ${width}`);await c.close();
 }
 writeFileSync('outputs/phrase-header/practice/results.json',JSON.stringify(results,null,2));
}finally{await browser.close();}
