// Dev-only, explicit fixture loading. Not a production entry point.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "../../src/App";
import { JudgingProvider, useJudging } from "../../src/state/store";
import { createLiveCompetitionSnapshot } from "../../src/lib/competition";
import { createPanelPreset, makeAssignmentSnapshot } from "../../src/lib/judgeAssignments";
import { enabledCategories } from "../../src/config";
import type { SavedSession, ReciterQuestionAssignment, RecitationRangeSnapshot } from "../../src/types";
import { loadQuestionIndex, resolveQuestionRange, QUESTION_INDEX_VERSION } from "../../src/lib/questionBank";
import { MUSHAF_LAYOUT, loadPage } from "../../src/lib/page";
import { createLocalRecording, getLocalRecording, beginLocalRecordingSegment, appendLocalRecordingChunk, finalizeLocalRecordingSegment, loadLocalRecordingPlayback, loadReplayRevisions, appendReplayRevision } from "../../src/lib/recitationAudioStorage";
import { encodeReplayWav } from "../../src/lib/recitationReplay";
import { decodeReplayAudio } from "../../src/lib/decodeReplayAudio";
import { questionEvidenceFingerprint } from "../../src/lib/questionEvidence";
import "../../src/styles/global.css";
import "../../src/styles/motion.css";
import "../../src/styles/settings.css";
import "../../src/styles/competition-setup-v2.css";

function Fixture() {
  const { state, dispatch } = useJudging();
  const [loaded, setLoaded] = useState(false);
  const [audioFixture, setAudioFixture] = useState(false);
  const [largeRoster, setLargeRoster] = useState(false);
  if (loaded) return <App />;
  const safe = import.meta.env.DEV && location.hostname === "127.0.0.1" && location.port === "5207"
    && state.competition.isSample && !state.sessionActive
    && state.history.every(s => s.id.startsWith("qa-overview-"));
  return <main style={{padding:24}}><h1>Results overview test fixture</h1>
    <p>Replaces only the sample data on this isolated local origin. No production data or recordings.</p>
    <label><input type="checkbox" checked={audioFixture} onChange={e => setAudioFixture(e.target.checked)}/> Include synthetic tone audio (not Quran recitation)</label>
    <label><input type="checkbox" checked={largeRoster} onChange={e => setLargeRoster(e.target.checked)}/> Use 23 participants for pagination checks</label>
    <button disabled={!safe} onClick={async () => {
      const index = await loadQuestionIndex();
      const resolved = resolveQuestionRange(index, {surah:109,ayah:1}, 18);
      if (!resolved.ok) throw new Error("QA range unavailable");
      const range: RecitationRangeSnapshot = {version:1,...resolved.range,mushafLayout:MUSHAF_LAYOUT,questionIndexVersion:QUESTION_INDEX_VERSION};
      const firstPage = await loadPage(range.startPage);
      const target = firstPage.lines.flatMap(l => l.type === "surah-header" ? [] : l.words).find(w => w.wid === range.startWordId)!;
      const baseRoster = state.roster.slice(0,10);
      const roster = Array.from({length:largeRoster ? 23 : 10},(_,i) => ({...baseRoster[i%baseRoster.length],
        ...(i>=10 ? {id:`qa-roster-${i}`,number:String(i+1).padStart(2,"0"),name:i===10 ? "QA participant with a deliberately long name for compact layout checks" : `QA participant ${i+1}`} : {}),
        absent:i===8 || i===9, judged:i<6}));
      const panel = createPanelPreset("all", enabledCategories(state.config));
      const assignment = makeAssignmentSnapshot(panel, panel.seats[0].id, state.config)!;
      const snapshot = createLiveCompetitionSnapshot({competition:state.competition,panel,config:state.config,roster});
      const history: SavedSession[] = [0,1,2,3,4,5,8].map(i => ({
        id:`qa-overview-${i}`,competitionId:state.competition.id,competitionVersionId:snapshot.versionId,
        isSample:true,savedAt:Date.now()+i,revision:1,participant:roster[i],config:state.config,
        total:100,totalMax:100,assignment,notes:i===0 ? "Synthetic QA finding; not a real participant assessment." : "",events:[],
        question:i===4 ? undefined : {version:2,id:`qa-question-${i}`,kind:"prepared-draft",participantId:roster[i].id,
          divisionId:"qa-division",muqarrar:roster[i].muqarrar,selectedAt:Date.now(),label:"QA · 109:1 onward",
          sourceQuestionId:"qa-question",startAyah:range.startAyah,endAyah:range.endAyah,
          requestedLines:range.requestedLines,resolvedLines:range.resolvedLines,startPage:range.startPage,endPage:range.endPage,
          sourceVersion:range.sourceVersion,questionIndexVersion:range.questionIndexVersion,layoutHash:range.layoutHash,range} as ReciterQuestionAssignment,
        mistakes:i===0 ? ["jali","khafi"].map((category,n) => ({id:`qa-finding-${n}`,tid:`${target.wid}:${n}`,wordId:target.wid,
          wordText:target.text,glyph:target.glyph || target.text,surah:target.surah,ayah:target.ayah,page:range.startPage,
          label:n===0 ? "QA pronunciation finding" : "QA second finding",category:category as "jali"|"khafi",amount:n===0?2:1,note:"QA note retained",ts:Date.now()})) : [],
        impressions:i===5 ? [] : [{category:"adu-raagu",awarded:state.config["adu-raagu"].start,set:true,note:"",ts:Date.now()}],
      }));
      if (audioFixture && !await getLocalRecording("qa-overview-0")) {
        const rate=48000, samples=new Float32Array(rate*4);
        for(let i=0;i<samples.length;i++) samples[i]=Math.sin(2*Math.PI*440*i/rate)*0.1;
        const blob=new Blob([encodeReplayWav(samples,rate)],{type:"audio/wav"});
        await createLocalRecording("qa-overview-0",blob.type);
        const part=await beginLocalRecordingSegment("qa-overview-0",blob.type);
        await appendLocalRecordingChunk("qa-overview-0",part,0,blob);
        await finalizeLocalRecordingSegment("qa-overview-0",part,4000,"ready");
      }
      if (audioFixture) {
        const playback = (await loadLocalRecordingPlayback("qa-overview-0"))!;
        const audio = await decodeReplayAudio(playback.segments[0].blob);
        const existing = await loadReplayRevisions("qa-overview-0");
        const ayahWords = firstPage.lines.flatMap(l => l.type === "surah-header" ? [] : l.words)
          .filter(w => w.role === "letter" && w.surah === 109 && w.ayah === 2).map(w => w.wid);
        for (const fixture of [
          {id:"reviewed",ids:["109.1.0"],status:"reviewed",kind:"word",start:1,end:1.5},
          {id:"suggested",ids:["109.1.1"],status:"suggested",kind:"word",start:1.5,end:2},
          {id:"repeat-a",ids:["109.1.2"],status:"reviewed",kind:"word",start:1,end:1.5},
          {id:"repeat-b",ids:["109.1.2"],status:"reviewed",kind:"word",start:2,end:2.5},
          {id:"ayah",ids:ayahWords,status:"reviewed",kind:"ayah",start:2,end:3},
        ] as const) {
          const id=`qa-direct-${fixture.id}`;
          if (existing.some(r=>r.id===id)) continue;
          await appendReplayRevision({version:1,id,occurrenceId:id,revision:1,
            media:{sessionId:"qa-overview-0",recordingCreatedAt:playback.manifest.createdAt,segmentIndex:0,
              sha256:audio.sha256,sampleRate:audio.sampleRate,sampleCount:audio.samples.length,
              questionFingerprint:questionEvidenceFingerprint(history[0].question!,history[0])!},
            target:{kind:fixture.kind,wordIds:[...fixture.ids],label:"Synthetic QA interval, not recitation"},
            startSample:Math.round(fixture.start*audio.sampleRate),endSample:Math.round(fixture.end*audio.sampleRate),
            status:fixture.status,method:"manual",reviewer:fixture.status==="reviewed"?"QA fixture":null,createdAt:new Date().toISOString()});
        }
      }
      dispatch({type:"LOAD",state:{...state,roster,panel,deviceJudgeId:panel.seats[0].id,history,
        finalizedResults:[],competition:{...state.competition,status:"live",liveSnapshot:snapshot}}});
      setLoaded(true);
    }}>Load ten-participant test fixture</button>
    {!safe && <p>Blocked: this is not the isolated sample-only QA origin.</p>}
  </main>;
}
createRoot(document.getElementById("root")!).render(<JudgingProvider><Fixture /></JudgingProvider>);
