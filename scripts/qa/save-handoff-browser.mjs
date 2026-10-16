import assert from 'node:assert/strict';import{createRequire}from'node:module';import{mkdirSync,writeFileSync}from'node:fs';
const require=createRequire(import.meta.url);const{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='outputs/save-handoff-fix';mkdirSync(out,{recursive:true});const pilot=process.argv.includes('--pilot'),errorOnly=process.argv.includes('--error');
const cases=errorOnly?[{width:1024,mode:'stop-error'},{width:390,mode:'stop-error'}]:pilot?[{width:1024,mode:'delayed'},{width:390,mode:'delayed'}]:[
 ...[1400,1024,768,390,320].flatMap(width=>['no-preference','reduce'].map(motion=>({width,mode:'plain',motion}))),
 ...[1024,390].flatMap(width=>['delayed','paused','interrupted','timeout','last','validation','quota','storage-slow'].map(mode=>({width,mode}))),
 ...[1024,390].map(width=>({width,mode:'delayed',motion:'reduce'}))];
const b=await chromium.launch({args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});const results=[];
try{for(const{width,mode,motion='no-preference'}of cases){
 const height=width===1400?900:width===768?1024:width<600?844:768,key=`${width}-${mode}-${motion}`;const c=await b.newContext({viewport:{width,height},hasTouch:width<=768,isMobile:width<600,reducedMotion:motion,permissions:['microphone']});const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));const run={key,errors};results.push(run);
 try{
 await p.addInitScript(()=>{localStorage.setItem('tahqeeq.hintSeen.assignedRail.v1','1');localStorage.setItem('tanween.phrases.help.v1','seen');});
 await p.goto('http://127.0.0.1:5346/scripts/qa/mobile-paper.html?sessionStorage=3&qaSurah=79&qaAyah=33&qaLines=10',{waitUntil:'domcontentloaded'});await p.getByRole('button',{name:'Load prepared mobile sample'}).click();await p.locator('.page-fixed-mushaf').first().waitFor();await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(150);
 const recording=['delayed','paused','interrupted','timeout','stop-error'].includes(mode);
 if(recording){await p.evaluate(()=>{const acquire=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async(...args)=>{const stream=await acquire(...args);window.qaStream=stream;return stream;};});await p.getByRole('checkbox',{name:'Record this practice recitation'}).check();}
 if(mode==='last')await p.evaluate(()=>{const q=window.providerQA,id=q.state.preparedRecitation.participant.id;q.dispatch({type:'LOAD',state:{...q.state,roster:q.state.roster.map(r=>({...r,judged:r.id!==id}))}});});
 await p.getByRole('button',{name:'Begin judging',exact:true}).click();await p.waitForFunction(()=>window.providerQA.state.sessionActive);
 if(recording){await p.getByRole('button',{name:/Pause recording at/}).waitFor();await p.waitForTimeout(1100);}
 if(mode==='paused')await p.getByRole('button',{name:/Pause recording at/}).click();
 if(mode==='interrupted'){await p.evaluate(()=>{const t=window.qaStream.getAudioTracks()[0];t.stop();t.dispatchEvent(new Event('ended'));});await p.getByText('Recording interrupted',{exact:true}).waitFor();}
 await p.getByRole('button',{name:width<600?'Finish':'Finish recitation',exact:true}).click();
 const dialog=p.locator('.finish-dialog'),save=p.getByRole('button',{name:mode==='last'?'Save recitation':'Save and select next reciter',exact:true});
 if(mode==='validation'){await save.click();await p.locator('.finish-mark-error').waitFor();assert.equal(await p.evaluate(()=>window.providerQA.state.history.length),0);assert.equal(await dialog.getAttribute('aria-busy'),null);await dialog.getByRole('slider',{name:'Adu / Raagu marks'}).press('End');}
 else {const mark=dialog.getByRole('spinbutton',{name:'Adu / Raagu marks'});await mark.focus();await mark.press('End');}
 // Add one finding and a note so preservation checks cover non-empty evidence.
 await p.evaluate(async()=>{await window.providerQA.addFindings(1);window.providerQA.dispatch({type:'SET_NOTES',notes:'Synthetic handoff QA note'});});
 await p.waitForFunction(()=>window.providerQA.state.mistakes.length===1&&window.providerQA.state.notes==='Synthetic handoff QA note');
 run.expected=await p.evaluate(async()=>{const q=window.providerQA,{computeScores}=await import('/src/lib/scoring.ts');const s=computeScores(q.state);return{id:q.state.activeSessionId,total:s.total,totalMax:s.totalMax,mistakes:q.state.mistakes,notes:q.state.notes,impressions:q.state.impressions,question:q.state.activeQuestion};});
 if(mode==='quota'){await p.waitForFunction(()=>window.providerQA.status.phase==='saved');await p.evaluate(()=>{window.qaPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,key){if(this.name==='snapshots'&&key==='current')throw new DOMException('Controlled QA quota failure','QuotaExceededError');return window.qaPut.call(this,value,key);};});}
 if(mode==='storage-slow'){await p.waitForFunction(()=>window.providerQA.status.phase==='saved');await p.evaluate(()=>{const digest=crypto.subtle.digest.bind(crypto.subtle);crypto.subtle.digest=async(...args)=>{await new Promise(r=>setTimeout(r,500));return digest(...args);};});}
 if(mode==='delayed'||mode==='timeout')await p.evaluate(ms=>{const stop=MediaRecorder.prototype.stop;window.qaStopCalls=0;MediaRecorder.prototype.stop=function(){window.qaStopCalls++;if(ms<0)return;const recorder=this;setTimeout(()=>stop.call(recorder),ms);};},mode==='timeout'?-1:650);
 if(mode==='stop-error')await p.evaluate(()=>{window.qaNativeStop=MediaRecorder.prototype.stop;MediaRecorder.prototype.stop=function(){window.qaFaultRecorder=this;throw new Error('Controlled platform stop error');};});
 if(pilot)await p.screenshot({path:`${out}/${key}-review.png`});
 const cdp=await c.newCDPSession(p),paints=[];if(pilot){await cdp.send('Page.enable');const dir=`${out}/${key}-paint`;mkdirSync(dir,{recursive:true});cdp.on('Page.screencastFrame',e=>{const file=`${dir}/${String(paints.length).padStart(3,'0')}.jpg`;writeFileSync(file,Buffer.from(e.data,'base64'));paints.push({file,t:e.metadata.timestamp});void cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId});});await cdp.send('Page.startScreencast',{format:'jpeg',quality:90,maxWidth:width,maxHeight:height,everyNthFrame:1});}
 await p.evaluate(()=>{window.handoffDialog=document.querySelector('.finish-dialog');window.handoffFrames=[];window.handoffStop=false;const start=performance.now();function frame(){const d=document.querySelector('.finish-dialog[open]'),q=d?.querySelector('.reciter-start-dialog'),r=d?.getBoundingClientRect();window.handoffFrames.push({t:performance.now()-start,open:!!d,same:d===window.handoffDialog,queue:!!q,busy:d?.getAttribute('aria-busy'),box:r?{x:r.x,y:r.y,w:r.width,h:r.height}:null,queueTransform:q?getComputedStyle(q).transform:null,backdrop:d?getComputedStyle(d,'::backdrop').backgroundColor:null,focusInside:!!d?.contains(document.activeElement),history:window.providerQA.state.history.length});if(!window.handoffStop)requestAnimationFrame(frame);}frame();});
 await save.click();
 if(mode==='stop-error'){
  await p.getByText('Could not save. Your marks are still here. Please try again.',{exact:true}).waitFor();assert.equal(await p.evaluate(()=>window.providerQA.state.history.length),0);assert.equal(await dialog.evaluate(e=>e.open),true);await p.waitForFunction(()=>!document.querySelector('.finish-dialog-body').inert);assert.equal(await save.isEnabled(),true);await p.screenshot({path:`${out}/${key}-error.png`});
  await p.evaluate(()=>{MediaRecorder.prototype.stop=window.qaNativeStop;window.qaFaultRecorder.stop();});await p.waitForFunction(()=>document.querySelector('.finish-dialog-actions .btn-primary:not([disabled])'));await save.click();
 }
 if(mode==='delayed'||mode==='timeout'){
  await p.getByText('Saving…',{exact:true}).waitFor();assert.equal(await dialog.evaluate(e=>e.open),true);assert.equal(await p.getByRole('button',{name:'Keep judging',exact:true}).isDisabled(),true);assert.equal(await dialog.locator('.finish-dialog-body').evaluate(e=>e.inert),true);
  await p.keyboard.press('Escape');assert.equal(await dialog.evaluate(e=>e.open),true,'Escape cannot dismiss an in-flight save');
  await p.evaluate(()=>{const btn=document.querySelector('.finish-dialog-actions .btn-primary');btn.click();btn.click();});
  if(pilot)await p.screenshot({path:`${out}/${key}-saving.png`});
 }
 await p.waitForFunction(()=>window.providerQA.state.history.length===1,{},{timeout:10000});
 if(mode==='last'){await dialog.waitFor({state:'hidden'});}else if(mode==='quota'){
  await p.getByRole('button',{name:'Retry saving',exact:true}).waitFor();await dialog.waitFor({state:'hidden'});assert.equal(await p.getByRole('button',{name:'Retry saving',exact:true}).isEnabled(),true);await p.evaluate(()=>{IDBObjectStore.prototype.put=window.qaPut;});await p.getByRole('button',{name:'Retry saving',exact:true}).click();await p.waitForFunction(()=>window.providerQA.status.phase==='saved');
 }else{
  await p.getByRole('heading',{name:'Reciter queue',exact:true}).waitFor();await p.waitForTimeout(150);
  assert.equal(await dialog.evaluate(e=>e===window.handoffDialog&&e.open),true,'The same native modal survives the handoff');assert.equal(await p.getByRole('dialog').count(),1,'Only one modal owner');assert.equal(await dialog.evaluate(e=>e.contains(document.activeElement)),true,'Focus enters the queue');
  assert.equal(await dialog.locator('.reciter-start-dialog').evaluate(e=>getComputedStyle(e).transform),'none');
  assert.equal(await dialog.evaluate(e=>getComputedStyle(e,'::backdrop').backgroundColor),await p.evaluate(()=>getComputedStyle(document.body).backgroundColor),'Opaque queue backdrop hides paper reload');
  if(pilot)await p.screenshot({path:`${out}/${key}-queue.png`});
  await p.keyboard.press('Tab');assert.equal(await dialog.evaluate(e=>e.contains(document.activeElement)),true);
  const scroll=dialog.locator('.queue-scroll');await scroll.evaluate(e=>{e.scrollTop=e.scrollHeight;});
  const reachable=await dialog.locator('.queue-participant-button:visible').last().evaluate(e=>{const r=e.getBoundingClientRect(),s=e.closest('.queue-scroll').getBoundingClientRect();return r.bottom<=s.bottom+1&&r.top>=s.top-1;});assert.equal(reachable,true,'The end of the open queue group remains reachable');await scroll.evaluate(e=>{e.scrollTop=0;});
 }
 await p.evaluate(()=>window.handoffStop=true);run.frames=await p.evaluate(()=>window.handoffFrames);run.paints=paints;if(pilot)await cdp.send('Page.stopScreencast');
 if(!['last','quota'].includes(mode))assert.ok(run.frames.every(f=>f.open&&f.same),'No uncovered frame between review and queue');
 run.saved=await p.evaluate(()=>window.providerQA.state.history[0]);assert.equal(run.saved.id,run.expected.id);assert.equal(run.saved.total,run.expected.total);assert.equal(run.saved.totalMax,run.expected.totalMax);assert.deepEqual(run.saved.mistakes,run.expected.mistakes);assert.equal(run.saved.notes,run.expected.notes);assert.deepEqual(run.saved.impressions,run.expected.impressions);assert.deepEqual(run.saved.question,run.expected.question);assert.equal(run.saved.events.filter(e=>e.type==='session_finalized').length,1);assert.equal(await p.evaluate(()=>window.providerQA.state.history.length),1);
 if(mode==='delayed')assert.equal(await p.evaluate(()=>window.qaStopCalls),1,'Repeated confirmations stop/save only once');
 await p.waitForFunction(()=>window.providerQA.status.phase==='saved');
 const persisted=await p.evaluate(async()=>{const copy=await window.providerQA.repository.inspect();return copy.kind==='ready'?copy.current.state.history[0]:null;});assert.equal(persisted?.id,run.expected.id);assert.equal(persisted.total,run.expected.total);
 if(!['last','quota'].includes(mode)){
  await p.locator('.next-reciter-main').click();await p.getByRole('heading',{name:'Choose a question',exact:true}).waitFor();await p.getByRole('button',{name:'Change reciter',exact:true}).click();await p.getByRole('heading',{name:'Reciter queue',exact:true}).waitFor();await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  assert.equal(await p.evaluate(()=>window.providerQA.state.history.length),1,'Closing queue cannot resave');
 }
 assert.deepEqual(errors,[]);console.log(`PASS handoff ${key}`);
 }catch(e){run.failure=String(e.stack||e);await p.screenshot({path:`${out}/${key}-failure.png`});throw e;}
 finally{await c.close();writeFileSync(`${out}/${errorOnly?'error-results':pilot?'pilot':'results'}.json`,JSON.stringify(results,null,2));}
}}finally{await b.close();}
