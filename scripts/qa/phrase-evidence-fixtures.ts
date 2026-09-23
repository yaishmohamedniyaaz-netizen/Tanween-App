import type { CategoryId, Mistake, PhraseMistake, SavedSession, ScoreConfig } from "../../src/types.ts";
import { RECITATION_PHRASES } from "../../src/lib/recitationPhrases.ts";
import { PHRASE_CATALOGUE_VERSION, phraseWordId } from "../../src/lib/phraseEvidence.ts";
import { judgingTargetsOf, TARGET_RULE_VERSION } from "../../src/lib/judgingUnits.ts";
import { seedLedgerEvents } from "../../src/lib/judgingLedger.ts";
import { computeCategoryScores } from "../../src/lib/scoring.ts";

export const phraseTestConfig: ScoreConfig = {
  jali:{enabled:true,start:50,step:2}, khafi:{enabled:true,start:30,step:1},
  fasaha:{enabled:true,start:20,step:1}, "adu-raagu":{enabled:false,start:0,step:1},
};

/** Test fixture only: explicit amounts/occurrences are not application policy. */
export function phraseFixture({phraseId="istiadhah", wordIndex=0, unitIndex=0, occurrenceId="explicit-fixture-1",
  category="jali", amount=2, judgeSeatId="j1"}: {
  phraseId?: PhraseMistake["phrase"]["phraseId"]; wordIndex?: number; unitIndex?: number;
  occurrenceId?: string; category?: CategoryId; amount?: number; judgeSeatId?: string;
} = {}): PhraseMistake {
  const phrase = {catalogueVersion:PHRASE_CATALOGUE_VERSION,phraseId,wordIndex,occurrenceId};
  const wordText=RECITATION_PHRASES.find(item=>item.id===phraseId)!.words[wordIndex];
  const wordId=phraseWordId(phrase);
  const unit=judgingTargetsOf(wordText,"letter",wordId)[unitIndex];
  return {id:`fixture:${unit.tid}:${judgeSeatId}`,tid:unit.tid,evidenceKind:"phrase",phrase,judgeSeatId,
    targetVersion:2,sourceVersion:PHRASE_CATALOGUE_VERSION,ruleVersion:TARGET_RULE_VERSION,
    wordId,wordText,sourceStart:unit.start,sourceEnd:unit.end,primaryGlyph:unit.primaryGlyph,fullGlyph:unit.fullGlyph,
    glyph:unit.fullGlyph,label:`${phraseId === "closing" ? "Ending" : "Starting"} · word ${wordIndex+1} · letter ${unitIndex+1}`,
    category,amount,ts:100};
}

export function savedPhraseFixture(mistakes: Mistake[] = [phraseFixture()]): SavedSession {
  const config=structuredClone(phraseTestConfig);
  const participant={id:"phrase-reader-person",number:"01",name:"Phrase reader sample",ageGroup:"Under 14",
    category:"baliagen" as const,muqarrar:"feshey-kolhu" as const,phone:"",institution:""};
  const categories: CategoryId[]=["jali","khafi","fasaha"];
  const panel={version:1 as const,preset:"all" as const,seats:[{id:"j1",label:"Judge 1",name:"Sample judge",categories}]};
  const assignment={version:1 as const,panel,judgeSeatId:"j1",judgeLabel:"Judge 1",judgeName:"Sample judge",categories,config};
  const events=seedLedgerEvents({sessionId:"phrase-reader-session",participant,startedAt:50,mistakes,assignment});
  const score=computeCategoryScores(config,mistakes);
  return {id:"phrase-reader-session",participant,competitionId:"phrase-reader-competition",competitionVersionId:"phrase-reader-version",
    isSample:true,savedAt:200,startedAt:50,revision:1,ledgerVersion:3,assignment,config,mistakes,impressions:[],events,
    total:score.total,totalMax:score.totalMax,notes:"",scoreKind:"judge-section"};
}

export const phraseTestCompetition = {id:"phrase-reader-competition",name:"Reader fixtures",edition:"1",isSample:true,
  liveSnapshot:{versionId:"phrase-reader-version"}};

export function phraseStateFixture(session = savedPhraseFixture()) {
  return {competition:{...phraseTestCompetition,liveSnapshot:{...phraseTestCompetition.liveSnapshot,
    panel:session.assignment!.panel,scoreConfig:session.config,roster:[session.participant]}},
    participant:session.participant,config:session.config,activeAssignment:session.assignment,
    activeSessionId:session.id,sessionActive:true,mistakes:session.mistakes,events:session.events!,
    impressions:[],notes:"",roster:[session.participant],history:[session],finalizedResults:[]};
}
