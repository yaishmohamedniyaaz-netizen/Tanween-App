import { createRoot } from "react-dom/client";
import { ParticipantReviewWorkspace } from "../../src/components/ParticipantReviewWorkspace";
import { ResultSheetView } from "../../src/components/ResultSheet";
import { buildCompetitionResults } from "../../src/lib/competitionResults";
import { phraseFixture, savedPhraseFixture, phraseStateFixture } from "./phrase-evidence-fixtures";
import type { JudgingState } from "../../src/types";
import { loadQuestionIndex, resolveQuestionRange, QUESTION_INDEX_VERSION } from "../../src/lib/questionBank";
import { MUSHAF_LAYOUT } from "../../src/lib/mushafContract";
import "../../src/styles/global.css";
import "../../src/styles/motion.css";

const session = savedPhraseFixture([phraseFixture(),phraseFixture({phraseId:"bismillah",wordIndex:2}),phraseFixture({phraseId:"closing"})]);
if (new URLSearchParams(location.search).has("passage")) {
  const resolved = resolveQuestionRange(await loadQuestionIndex(),{surah:112,ayah:1},3);
  if (!resolved.ok) throw Error("Fixture passage unavailable");
  const range = {version:1 as const,...resolved.range,mushafLayout:MUSHAF_LAYOUT,questionIndexVersion:QUESTION_INDEX_VERSION};
  session.question = {version:2,id:"phrase-reader-question",kind:"prepared-draft",participantId:session.participant.id,
    divisionId:"fixture",muqarrar:"feshey-kolhu",selectedAt:50,label:"112:1–112:4",sourceQuestionId:"fixture",
    startAyah:range.startAyah,endAyah:range.endAyah,requestedLines:range.requestedLines,resolvedLines:range.resolvedLines,
    startPage:range.startPage,endPage:range.endPage,sourceVersion:range.sourceVersion,questionIndexVersion:QUESTION_INDEX_VERSION,
    layoutHash:range.layoutHash,range};
}
const state = phraseStateFixture(session) as unknown as JudgingState;
const row = buildCompetitionResults(state).rows[0];
const mode = new URLSearchParams(location.search).get("mode");
createRoot(document.getElementById("root")!).render(mode === "print" ? <ResultSheetView state={state}/> :
  <ParticipantReviewWorkspace item={row.item!} selected={row.view!.selected} isSample active reasons={row.reasons}
    onSelectSource={()=>{throw Error("Read-only fixture must not change source");}} onBack={()=>{}}/>);
