import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../../src/App';
import { JudgingProvider, useJudging } from '../../src/state/store';
import { createLiveCompetitionSnapshot } from '../../src/lib/competition';
import { createPanelPreset, makeAssignmentSnapshot } from '../../src/lib/judgeAssignments';
import { enabledCategories } from '../../src/config';
import { loadQuestionIndex, resolveQuestionRange, QUESTION_INDEX_VERSION } from '../../src/lib/questionBank';
import { MUSHAF_LAYOUT } from '../../src/lib/page';
import { participantDivision } from '../../src/lib/reciterQuestions';
import type { RecitationRangeSnapshot, ReciterQuestionAssignment } from '../../src/types';
import '../../src/styles/global.css';
import '../../src/styles/motion.css';
import '../../src/styles/settings.css';
import '../../src/styles/competition-setup-v2.css';

function Fixture() {
  const {state, dispatch} = useJudging();
  const [loaded,setLoaded] = useState(() => state.preparedRecitation?.id === 'qa-mobile-prepared'
    || state.activeQuestion?.id === 'qa-mobile-paper-question');
  if (loaded) return <>
    {new URLSearchParams(location.search).get('simulateSafeAreas') === '1' && <style>{`
      @media(max-width:600px) and (orientation:portrait) {
        .app { --mobile-judge-safe-top:47px !important; --mobile-judge-safe-bottom:34px !important; }
      }
      @media(min-width:393px) and (max-width:600px) and (orientation:portrait) {
        .app { --mobile-judge-safe-top:59px !important; }
      }
    `}</style>}
    <App/>
  </>;
  const safe = import.meta.env.DEV && location.hostname === '127.0.0.1' && ['5296', '5320'].includes(location.port)
    && state.competition.isSample && !state.sessionActive && state.history.length === 0;
  return <button disabled={!safe} onClick={async()=>{
    const params = new URLSearchParams(location.search);
    const result = resolveQuestionRange(await loadQuestionIndex(),{
      surah:Number(params.get('qaSurah') || 112),ayah:Number(params.get('qaAyah') || 1),
    },Number(params.get('qaLines') || 3));
    if (!result.ok) throw new Error('Fixture range unavailable');
    const range: RecitationRangeSnapshot = {version:1,...result.range,mushafLayout:MUSHAF_LAYOUT,questionIndexVersion:QUESTION_INDEX_VERSION};
    const participant = state.roster[0];
    if (!participant || !participant.muqarrar) throw new Error('Fixture participant needs a muqarrar side');
    const panel = createPanelPreset('all',enabledCategories(state.config));
    const assignment = makeAssignmentSnapshot(panel,panel.seats[0].id,state.config)!;
    const competition = {...state.competition,questionPolicy:{...state.competition.questionPolicy,mode:'manual' as const}};
    const liveSnapshot = createLiveCompetitionSnapshot({competition,panel,config:state.config,roster:state.roster});
    const division = participantDivision(participant,liveSnapshot.divisions)!;
    const question: ReciterQuestionAssignment = {version:2,id:'qa-mobile-paper-question',kind:'manual',
      participantId:participant.id,divisionId:division.id,muqarrar:participant.muqarrar,selectedAt:Date.now(),
      drawId:'qa-mobile-draw',drawPosition:1,drawCycle:1,label:'Mobile paper QA',sourceQuestionId:'qa-mobile',
      startAyah:range.startAyah,endAyah:range.endAyah,requestedLines:range.requestedLines,resolvedLines:range.resolvedLines,
      startPage:range.startPage,endPage:range.endPage,sourceVersion:range.sourceVersion,questionIndexVersion:QUESTION_INDEX_VERSION,
      layoutHash:range.layoutHash,range};
    dispatch({type:'LOAD',state:{...state,participant,panel,deviceJudgeId:panel.seats[0].id,
      competition:{...competition,status:'live',liveSnapshot},sessionActive:false,
      activeSessionId:null,activeStartedAt:null,activeAssignment:null,activeQuestion:null,
      preparedRecitation:{version:1,id:'qa-mobile-prepared',participant,assignment,question,preparedAt:Date.now()},
      mistakes:[],impressions:[],events:[]}});
    setLoaded(true);
  }}>Load prepared mobile sample</button>;
}
createRoot(document.getElementById('root')!).render(<JudgingProvider><Fixture/></JudgingProvider>);
