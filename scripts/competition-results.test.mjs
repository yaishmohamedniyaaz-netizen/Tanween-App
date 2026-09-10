import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCompetitionResults, selectedResultView } from '../src/lib/competitionResults.ts';
import { finalizeParticipantResult } from '../src/lib/finalResults.ts';

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
    participant:person('p1'),config,total:0,totalMax:0,notes:'original note',mistakes:[],impressions:[],events:[],
    assignment:{version:1,panel:state.competition.liveSnapshot.panel,judgeSeatId:'j1',judgeName:'Judge A',judgeLabel:'Judge 1',categories,config},...overrides};
}
test('frozen roster includes participants without sessions; no fabricated totals',()=>{
  const state=fixture(); const result=buildCompetitionResults(state);
  assert.equal(result.total,3); assert.equal(result.complete,0);assert.equal(result.attention,3);
  assert.ok(result.rows.every(r=>r.view===null&&r.received===0));
  state.roster.pop(); assert.equal(buildCompetitionResults(state).total,3);
});
test('complete sources use existing score computation without mutation',()=>{
  const state=fixture();state.history=[record(state)];const before=JSON.stringify(state);
  const result=buildCompetitionResults(state);assert.equal(result.complete,1);
  assert.equal(result.rows[0].view.preview.total,100); assert.equal(result.rows[0].received,3);
  assert.equal(JSON.stringify(state),before);
});
test('missing criteria remain incomplete, not zero',()=>{
  const state=fixture();const s=record(state);s.assignment.categories=['jali'];state.history=[s];
  const r=buildCompetitionResults(state).rows[0];assert.equal(r.received,1);assert.equal(r.view.preview,null);
  assert.match(r.reasons.join(' '),/Awaiting/);assert.equal(r.complete,false);
});
test('competition, version, sample and judge/category ownership cannot leak into scores',()=>{
  for(const bad of [ {competitionId:'other'}, {competitionVersionId:'v0'}, {competitionVersionId:undefined}, {isSample:true},
    {assignment:{judgeSeatId:'other',categories}}, {participant:person('orphan')} ]) {
    const state=fixture();state.history=[record(state,bad)];const r=buildCompetitionResults(state);
    assert.equal(r.complete,0,JSON.stringify(bad));assert.ok(r.rows.every(row=>row.view===null));
  }
});
test('a mismatched roster identity is shown but cannot count complete',()=>{
  const state=fixture();state.history=[record(state,{participant:{...person('p1'),name:'Different person'}})];
  const r=buildCompetitionResults(state).rows[0];assert.equal(r.complete,false);assert.match(r.reasons.join(' '),/differ from the roster/);
});
test('absent entries sort last, retain records and do not modify export state',()=>{
  const state=fixture();state.roster[0].absent=true;state.history=[record(state)];const before=JSON.stringify(state);
  const result=buildCompetitionResults(state);const r=result.rows.at(-1);
  assert.equal(r.participant.id,'p1');assert.equal(r.absent,true);assert.equal(r.complete,false);
  assert.equal(r.view.preview.total,100);assert.match(r.reasons[0],/saved results exist/);
  assert.equal(JSON.stringify(state),before);state.roster[0].absent=false;
  assert.equal(buildCompetitionResults(state).complete,1);
});
test('viewed sources and old official score remain separate through revisions',()=>{
  const state=fixture();state.history=[record(state)];let row=buildCompetitionResults(state).rows[0];
  const official=finalizeParticipantResult(row.item.candidate,{});
  state.finalizedResults=[{...official,competitionId:'c1',competitionVersionId:'v1',isSample:false,finalizedAt:200}];
  const alternate=record(state,{id:'s2',savedAt:300,config:{...config,jali:{...config.jali,start:40}}});
  state.history.push(alternate);
  row=buildCompetitionResults(state,{p1:{jali:'s2',khafi:'s2',fasaha:'s2'}}).rows[0];
  assert.equal(row.view.preview.total,90);assert.equal(row.view.official.total,100);assert.equal(row.view.matchesOfficial,false);
  assert.equal(row.complete,false);
  const invalid=selectedResultView(row.item,{jali:'removed'});assert.equal(invalid.preview,null);
});
test('no automatic choice between conflicting records without an official source',()=>{
  const state=fixture();state.history=[record(state),record(state,{id:'s2'})];
  const r=buildCompetitionResults(state).rows[0];assert.equal(r.view.preview,null);assert.equal(r.complete,false);
  assert.match(r.reasons.join(' '),/Choose source/);
});
test('same-session changed revision is not labelled the old official result',()=>{
  const state=fixture();state.history=[record(state)];const row=buildCompetitionResults(state).rows[0];
  state.finalizedResults=[{...finalizeParticipantResult(row.item.candidate,{}),competitionId:'c1',competitionVersionId:'v1'}];
  state.history[0].revision=2;
  const view=buildCompetitionResults(state).rows[0].view;
  assert.equal(view.preview.total,100);assert.equal(view.matchesOfficial,false);
});
test('another version official result cannot become current by participant ID',()=>{
  const state=fixture();state.history=[record(state)];const row=buildCompetitionResults(state).rows[0];
  state.finalizedResults=[{...finalizeParticipantResult(row.item.candidate,{}),competitionId:'c1',competitionVersionId:'old'}];
  assert.equal(buildCompetitionResults(state).rows[0].view.official,undefined);
});

test('a saved score with different competition configuration needs attention',()=>{
  const state=fixture();state.history=[record(state,{config:{...config,jali:{...config.jali,start:40}}})];
  const row=buildCompetitionResults(state).rows[0];
  assert.equal(row.complete,false);assert.match(row.reasons.join(' '),/configuration differs/);
});

test('an absent participant with only an official result still needs attention',()=>{
  const state=fixture();state.history=[record(state)];const row=buildCompetitionResults(state).rows[0];
  state.finalizedResults=[{...finalizeParticipantResult(row.item.candidate,{}),competitionId:'c1',competitionVersionId:'v1'}];
  state.history=[];state.roster[0].absent=true;
  const result=buildCompetitionResults(state);
  assert.equal(result.rows.at(-1).needsAttention,true);assert.equal(result.attention,3);
});

test('an unentered impression mark never displays an inferred full total',()=>{
  const state=fixture();
  state.config={...config,'adu-raagu':{enabled:true,start:10,step:.5}};
  state.competition.liveSnapshot.scoreConfig=state.config;
  state.competition.liveSnapshot.panel.seats[0].categories=[...categories,'adu-raagu'];
  const s=record(state,{config:state.config});
  s.assignment={...s.assignment,categories:[...categories,'adu-raagu'],config:state.config};
  state.history=[s];
  const row=buildCompetitionResults(state).rows[0];
  assert.equal(row.view.preview,null);assert.equal(row.complete,false);
  assert.match(row.reasons.join(' '),/mark has not been entered/);
});

test('a missing live roster entry does not remove frozen identity or saved evidence',()=>{
  const state=fixture();
  state.roster=state.roster.filter(p=>p.id!=='p1');
  state.history=[record(state)];
  const row=buildCompetitionResults(state).rows[0];
  assert.equal(row.participant.id,'p1');
  assert.equal(row.absent,false);
  assert.ok(row.item);
});

test('returning an absent participant to present recomputes the overview',()=>{
  const state=fixture();
  state.history=[record(state)];
  state.roster[0].absent=true;
  assert.equal(buildCompetitionResults(state).complete,0);
  state.roster[0].absent=false;
  assert.equal(buildCompetitionResults(state).rows[0].complete,true);
});
