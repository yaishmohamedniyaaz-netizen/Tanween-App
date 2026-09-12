import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
try {
 for(const size of [{width:390,height:844},{width:1280,height:800}]){
  const c=await browser.newContext({viewport:size});const p=await c.newPage();
  await p.goto('http://127.0.0.1:5296/scripts/qa/mobile-paper.html?simulateSafeAreas=1');
  await p.getByRole('button',{name:'Load prepared mobile sample'}).click();
  await p.getByRole('checkbox',{name:'Record this practice recitation'}).check();
  await p.evaluate(()=>{window.qaStops=0;Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:()=>new Promise(resolve=>{window.qaGrant=()=>resolve({getTracks:()=>[{stop:()=>window.qaStops++}]});})});});
  await p.getByRole('button',{name:'Begin judging',exact:true}).click();
  await p.getByRole('button',{name:'Starting microphone…',exact:true}).waitFor();
  const fallback=p.getByRole('button',{name:'Begin without recording',exact:true});
  assert.equal(await fallback.isVisible(),true);
  assert.equal(await p.getByRole('button',{name:/technical details|Recording details/}).count(),0);
  await p.screenshot({path:`outputs/microphone-simple-${size.width}.png`});
  await p.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('tahqeeq.session.v1')).sessionActive),false);
  await p.evaluate(()=>window.qaGrant());await p.waitForTimeout(100);
  assert.equal(await p.evaluate(()=>window.qaStops),1);
  await p.getByRole('button',{name:'Begin judging',exact:true}).click();
  await p.getByRole('button',{name:'Starting microphone…',exact:true}).waitFor();
  const box=await fallback.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=size.height);
  await fallback.click();await p.evaluate(()=>window.qaGrant());await p.waitForTimeout(200);
  assert.equal(await p.evaluate(()=>window.qaStops),2);
  const state=await p.evaluate(()=>JSON.parse(localStorage.getItem('tahqeeq.session.v1')));
  assert.equal(state.sessionActive,true);
  assert.equal(state.events.filter(e=>e.type==='session_started').length,1);
  console.log(size,'pending fallback reachable, late stream stopped, one session start');
  await c.close();
 }
 const c=await browser.newContext({viewport:{width:390,height:844}});const p=await c.newPage();
 await p.goto('http://127.0.0.1:5296/scripts/qa/mobile-paper.html?simulateSafeAreas=1&recordingDiagnostics=1');
 await p.getByRole('button',{name:'Load prepared mobile sample'}).click();
 await p.getByRole('checkbox',{name:'Record this practice recitation'}).check();
 await p.evaluate(()=>{const acquire=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
   navigator.mediaDevices.getUserMedia=async (...args)=>{const stream=await acquire(...args);window.qaLiveStream=stream;return stream;};});
 await p.getByRole('button',{name:'Begin judging',exact:true}).click();
 const pause=p.getByRole('button',{name:/Pause recording at/});await pause.waitFor();
 await p.waitForTimeout(1400);
 await p.evaluate(()=>{const track=window.qaLiveStream.getAudioTracks()[0];track.stop();track.dispatchEvent(new Event('ended'));});
 await p.getByText('Recording interrupted',{exact:true}).waitFor();
 await p.screenshot({path:'outputs/microphone-interrupted-390.png'});
 await p.setViewportSize({width:1280,height:800});
 await p.screenshot({path:'outputs/microphone-interrupted-1280.png'});
 await p.setViewportSize({width:390,height:844});
 const savedBefore=await p.evaluate(async()=>{
   const {getLocalRecording}=await import('/src/lib/recitationAudioStorage.ts');
   const state=JSON.parse(localStorage.getItem('tahqeeq.session.v1'));
   return getLocalRecording(state.activeSessionId);
 });
 assert.ok(savedBefore.bytes>0);assert.equal(savedBefore.state,'interrupted');
 await p.evaluate(()=>{window.qaAcquire=navigator.mediaDevices.getUserMedia;
   navigator.mediaDevices.getUserMedia=()=>Promise.reject(new DOMException('Denied','NotAllowedError'));});
 await p.getByRole('button',{name:/Resume recording at/}).click();
 await p.getByText('Recording interrupted',{exact:true}).waitFor();
 const savedAfter=await p.evaluate(async()=>{
   const {getLocalRecording}=await import('/src/lib/recitationAudioStorage.ts');
   const state=JSON.parse(localStorage.getItem('tahqeeq.session.v1'));
   return getLocalRecording(state.activeSessionId);
 });
 assert.deepEqual(savedAfter,savedBefore);
 await p.evaluate(()=>navigator.mediaDevices.getUserMedia=window.qaAcquire);
 await p.getByRole('button',{name:/Resume recording at/}).click();await pause.waitFor();
 await p.waitForTimeout(1400);await pause.click();
 const resume=p.getByRole('button',{name:/Resume recording at/});await resume.waitFor();await resume.click();await pause.waitFor();
 await p.waitForTimeout(1200);await pause.click();await resume.waitFor();
 console.log('Synthetic microphone: recorder start, first chunks, pause/resume/pause succeeded');
 await c.close();
 const stalled=await browser.newContext({viewport:{width:390,height:844}});const sp=await stalled.newPage();
 await sp.goto('http://127.0.0.1:5296/scripts/qa/mobile-paper.html?simulateSafeAreas=1');
 await sp.getByRole('button',{name:'Load prepared mobile sample'}).click();
 await sp.getByRole('checkbox',{name:'Record this practice recitation'}).check();
 await sp.evaluate(()=>{window.MediaRecorder=class {
   static isTypeSupported(){return true;}
   state='inactive'; mimeType='audio/webm';
   start(){this.state='recording';} // Native start event intentionally never arrives.
   requestData(){}
   stop(){this.state='inactive';queueMicrotask(()=>this.onstop?.());}
 };});
 await sp.getByRole('button',{name:'Begin judging',exact:true}).click();
 await sp.getByText('Starting recording',{exact:true}).waitFor();
 await sp.getByText('Recording stopped',{exact:true}).waitFor({timeout:15000});
 assert.equal(await sp.getByRole('dialog',{name:'Recording details'}).count(),0);
 const failedState=await sp.evaluate(()=>JSON.parse(localStorage.getItem('tahqeeq.session.v1')));
 assert.equal(failedState.sessionActive,true);
 assert.equal(failedState.events.filter(e=>e.type==='session_started').length,1);
 console.log('Permission success + missing recorder start event: bounded error, judging session preserved');
 await stalled.close();
 const finishing=await browser.newContext({viewport:{width:390,height:844}});const fp=await finishing.newPage();
 await fp.goto('http://127.0.0.1:5296/scripts/qa/mobile-paper.html?simulateSafeAreas=1');
 await fp.getByRole('button',{name:'Load prepared mobile sample'}).click();
 await fp.getByRole('checkbox',{name:'Record this practice recitation'}).check();
 await fp.evaluate(()=>{window.MediaRecorder=class {
   static isTypeSupported(){return true;}
   state='inactive';mimeType='audio/webm';
   constructor(stream){window.qaCaptured=stream;window.qaRecorder=this;}
   start(){this.state='recording';}
   requestData(){}
   stop(){this.state='inactive';queueMicrotask(()=>this.onstop?.());}
 };});
 await fp.getByRole('button',{name:'Begin judging',exact:true}).click();
 await fp.getByText('Starting recording',{exact:true}).waitFor();
 await fp.getByRole('button',{name:'Finish',exact:true}).click();
 await fp.getByRole('dialog').getByRole('spinbutton').press('End');
 await fp.getByRole('button',{name:/Save (recitation|and select next reciter)/}).click();
 await fp.waitForFunction(()=>JSON.parse(localStorage.getItem('tahqeeq.session.v1')).sessionActive===false);
 assert.equal(await fp.evaluate(()=>window.qaCaptured.getTracks().every(track=>track.readyState==='ended')),true);
 await fp.evaluate(()=>window.qaRecorder.onstart?.());await fp.waitForTimeout(200);
 assert.equal(await fp.evaluate(()=>JSON.parse(localStorage.getItem('tahqeeq.session.v1')).sessionActive),false);
 console.log('Finish during recorder startup stops tracks; late start cannot restart the session');
 await finishing.close();
}finally{await browser.close();}
