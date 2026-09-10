import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { buildSync } from 'esbuild';
import { buildCompetitionResults } from '../src/lib/competitionResults.ts';

const temporary = mkdtempSync(join(tmpdir(),'tahqeeq-workspace-test-'));
const compiled = join(temporary,'workspace.cjs');
buildSync({entryPoints:['scripts/qa/workspace-render-entry.tsx'],outfile:compiled,bundle:true,
  platform:'node',format:'cjs',jsx:'automatic',loader:{'.css':'empty'},logLevel:'silent'});
const {renderWorkspace} = createRequire(import.meta.url)(compiled);
after(()=>{unlinkSync(compiled);rmdirSync(temporary);});
function props() {
  const participant={id:'p1',number:'01',name:'Test participant',ageGroup:'Under 14',category:'baliagen',muqarrar:'feshey-kolhu'};
  const config={jali:{enabled:true,start:50,step:2},khafi:{enabled:false,start:30,step:1},fasaha:{enabled:false,start:10,step:1},'adu-raagu':{enabled:false,start:10,step:.5}};
  const record={id:'s1',competitionId:'c1',isSample:false,participant,config,savedAt:1,revision:1,
    assignment:{judgeSeatId:'j1',judgeName:'Source judge',judgeLabel:'Judge',categories:['jali'],config},
    mistakes:[{id:'m1',tid:'legacy',surah:109,ayah:1,category:'jali',amount:2,label:'Recorded finding',note:'Retained note',glyph:'ق',ts:1}],notes:'Session note'};
  const row=buildCompetitionResults({competition:{id:'c1',isSample:false},roster:[participant],config,history:[record],finalizedResults:[]}).rows[0];
  return {item:row.item,selected:row.view.selected,isSample:false,active:true,reasons:row.reasons,
    onSelectSource(){throw new Error('Rendering must not change sources');},onBack(){},onNext(){}};
}
test('workspace is a read-only composition of existing score and findings',()=>{
  const input=props(), before=JSON.stringify(input); const html=renderWorkspace(input);
  assert.match(html,/48/);assert.match(html,/Recorded finding/);assert.match(html,/Source judge/);
  assert.equal(JSON.stringify(input),before);assert.doesNotMatch(html,/Finalize result|Save as reviewed/);
});
test('missing saved passage stays unavailable without hiding judge findings',()=>{
  const html=renderWorkspace(props());assert.match(html,/older result has no saved Quran range/);
  assert.match(html,/Recorded finding/);assert.doesNotMatch(html,/recitation-evidence-page/);
});
test('source notes and score attribution remain in secondary disclosures',()=>{
  const html=renderWorkspace(props());assert.match(html,/Source notes &amp; question history/);
  assert.match(html,/Session note/);assert.match(html,/Score breakdown and judge sources/);
  assert.match(html,/revision 1/);
});
test('inactive Review does not mount a player or run its recording lookup',()=>{
  const html=renderWorkspace({...props(),active:false});
  assert.doesNotMatch(html,/Checking local recording|<audio/);
  assert.match(renderWorkspace(props()),/Checking local recording/);
});
test('neighbour actions are explicit and disabled at a filtered boundary',()=>{
  const html=renderWorkspace(props());
  assert.match(html,/disabled=""[^>]*aria-label="Previous participant"/);
  assert.match(html,/aria-label="Next participant"/);
});
