import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCompetitionResults } from '../src/lib/competitionResults.ts';
import { finalizeParticipantResult } from '../src/lib/finalResults.ts';
import { resultStatus, RESULT_STATUS_WORDS } from '../src/lib/resultStatus.ts';

const config = { jali: {enabled:true,start:50,step:2}, khafi:{enabled:true,start:30,step:1}, fasaha:{enabled:true,start:20,step:1}, 'adu-raagu':{enabled:false,start:0,step:.5} };
const categories = ['jali','khafi','fasaha'];
const person = id => ({id,number:id.slice(1),name:`Participant ${id}`,ageGroup:'Under 14',category:'memorisation',muqarrar:'feshey-kolhu',phone:'',institution:''});
function fixture() {
  const roster = ['p1','p2','p3'].map(id => ({...person(id),judged:false}));
  const panel = {version:1,preset:'custom',seats:[{id:'j1',label:'Judge 1',name:'Judge A',categories}]};
  const competition = {id:'c1',isSample:false,liveSnapshot:{versionId:'v1',roster:structuredClone(roster),scoreConfig:config,panel}};
  return {competition,roster,config,history:[],finalizedResults:[]};
}
function record(state, overrides={}) {
  return {id:'s1',competitionId:'c1',competitionVersionId:'v1',isSample:false,revision:1,savedAt:100,
    participant:person('p1'),config,total:0,totalMax:0,notes:'',mistakes:[],impressions:[],events:[],
    assignment:{version:1,panel:state.competition.liveSnapshot.panel,judgeSeatId:'j1',judgeName:'Judge A',judgeLabel:'Judge 1',categories,config},...overrides};
}
const statusOf = (state, id = 'p1') => resultStatus(buildCompetitionResults(state).rows.find(r => r.participant.id === id), categories);

test('status words are the agreed ones', () => {
  assert.deepEqual(RESULT_STATUS_WORDS, { ready:'Ready', check:'Check needed', official:'Official', awaiting:'Awaiting marks', partial:'Awaiting', absent:'Absent' });
});
test('no judge result is "Awaiting marks", a complete result is "Ready"', () => {
  const state = fixture();
  assert.deepEqual(statusOf(state), { status: 'awaiting' });
  state.history = [record(state)];
  assert.deepEqual(statusOf(state), { status: 'ready' });
});
test('a partly received result names the criteria still awaited, by short name', () => {
  const state = fixture(); const s = record(state); s.assignment.categories = ['jali']; state.history = [s];
  assert.deepEqual(statusOf(state), { status: 'partial', detail: 'Khafi, Fasaha' });
});
test('a result that matches the official result is "Official"', () => {
  const state = fixture(); state.history = [record(state)];
  const row = buildCompetitionResults(state).rows[0];
  state.finalizedResults = [{...finalizeParticipantResult(row.item.candidate, {}), competitionId:'c1', competitionVersionId:'v1', isSample:false, finalizedAt:200}];
  assert.equal(statusOf(state).status, 'official');
});
test('anything a person must resolve is "Check needed", with the reason on the second line', () => {
  const state = fixture(); state.history = [record(state, {participant:{...person('p1'), name:'Different person'}})];
  assert.deepEqual(statusOf(state), { status: 'check', detail: 'Participant details differ from the roster' });
});
test('absent is "Absent", unless saved results exist, which needs a check', () => {
  const state = fixture(); state.roster[1].absent = true;
  assert.deepEqual(statusOf(state, 'p2'), { status: 'absent' });
  state.roster[0].absent = true; state.history = [record(state)];
  assert.equal(statusOf(state).status, 'check');
});
test('list layout keeps the agreed column rhythm and status colours', () => {
  const css = readFileSync(new URL('../src/styles/resultsOverview.css', import.meta.url), 'utf8');
  assert.match(css, /\.ro-table \.ro-c-num \{ width: 96px; text-align: center;/);
  assert.match(css, /\.ro-table \.ro-c-score \{ width: 112px; padding-left: 32px;/);
  assert.match(css, /\.ro-n::before \{ content: ""; width: 17px;/);
  assert.match(css, /\.ro-status\.is-check \{ --st: var\(--ro-st-check\); \}/);
  assert.doesNotMatch(css, /\.ro-status\.is-ready \{[^}]*background/);
});
