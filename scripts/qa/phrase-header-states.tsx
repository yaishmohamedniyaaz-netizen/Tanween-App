import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { Header } from '../../src/components/Header';
import { JudgingProvider, useJudging } from '../../src/state/store';
import { createPanelPreset, makeAssignmentSnapshot } from '../../src/lib/judgeAssignments';
import { enabledCategories } from '../../src/config';
import { DEFAULT_DEVICE_PREFERENCES as preferences } from '../../src/lib/devicePreferences';
import type { RecitationRecorderStatus } from '../../src/hooks/useRecitationRecorder';
import '../../src/styles/global.css';
import '../../src/styles/motion.css';
const noop = () => {};
function Fixture() {
 const {state,dispatch}=useJudging();
 const [host,setHost]=useState<HTMLDivElement|null>(null);
 const params=new URLSearchParams(location.search);
 useEffect(()=>{
  if(!import.meta.env.DEV || !state.competition.isSample || state.sessionActive) return;
  const panel=createPanelPreset('all',enabledCategories(state.config));
  const assignment=makeAssignmentSnapshot(panel,panel.seats[0].id,state.config)!;
  dispatch({type:'LOAD',state:{...state,panel,activeAssignment:assignment,sessionActive:true,
   activeSessionId:'qa-header-only',participant:{...state.roster[0],name:'Ahmed Mohamed Abdulrahman Rasheed'}}});
 },[]);
 return <div className="app view-judge" data-mobile-judge-deck="true">
  <Header view="judge" mobileMushafControlsRef={setHost} onPhrasesOpenChange={noop}
   onToggleView={noop} onOpenSetup={noop} onOpenSettings={noop} onChangeReciter={noop}
   mushafZoom={preferences.mushafZoom} onMushafZoomChange={noop}
   mushafLayout={preferences.mushafLayout} onMushafLayoutChange={noop}
   judgeRailSide={preferences.judgeRailSide} onJudgeRailSideChange={noop}
   questionFocusMode={preferences.questionFocusMode} onQuestionFocusModeChange={noop}
   aduRaaguInputMode={preferences.aduRaaguInputMode} onAduRaaguInputModeChange={noop}
   slimScorePanel={preferences.slimScorePanel} onSlimScorePanelChange={noop}
   selectorTashkeel={preferences.selectorTashkeel} onSelectorTashkeelChange={noop}
   lastMarkStrip={preferences.lastMarkStrip} onLastMarkStripChange={noop}
   onShowMarkingGuide={noop} onMoreControlsOpenChange={noop} theme="light" onThemeChange={noop}
   recording={{status:(params.get('status') || 'recording') as RecitationRecorderStatus,
    durationLabel:'03:27',inputLevel:.7,lowInput:params.has('low'),onPause:noop,onResume:noop}} />
  {host && params.has('return') && createPortal(<button className="mobile-question-return" aria-label="Return to selected question on page 604">
   <span><span className="question-return-arrow" aria-hidden="true">↩ </span>Return 604</span><small>{state.participant.name}</small>
  </button>,host)}
 </div>;
}
createRoot(document.getElementById('root')!).render(<JudgingProvider><Fixture/></JudgingProvider>);
