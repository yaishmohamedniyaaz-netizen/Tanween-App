import { useEffect } from "react";
import { useJudging } from "../../src/state/store";
import { useSessionSaveStatus } from "../../src/components/SessionStorageBoundary";
import { createSessionStorage } from "../../src/state/sessionStorageV3";
import { loadPage } from "../../src/lib/page";
import { judgingTargetsOf, TARGET_RULE_VERSION, TARGET_SOURCE_VERSION } from "../../src/lib/judgingUnits";

export function SessionProviderProbe() {
  const {state,dispatch}=useJudging();const status=useSessionSaveStatus();
  useEffect(()=>{
    if(!import.meta.env.DEV || location.hostname!=="127.0.0.1")return;
    Object.assign(window,{providerQA:{state,status,dispatch,repository:createSessionStorage(),async addFindings(count:number){
      const page=await loadPage(state.activeQuestion!.startPage!);
      const words=page.lines.flatMap(line=>"words" in line?line.words:[]).filter(word=>word.role==="letter");
      const targets=words.flatMap(word=>judgingTargetsOf(word.text,word.role,word.wid).map(unit=>({word,unit})));
      for(const {word,unit} of targets.slice(0,count))dispatch({type:"ADD_MISTAKE",mistake:{
        id:`provider-qa:${unit.tid}`,tid:unit.tid,wordId:word.wid,wordText:word.text,
        surah:word.surah,ayah:word.ayah,page:page.page,glyph:unit.fullGlyph,primaryGlyph:unit.primaryGlyph,fullGlyph:unit.fullGlyph,
        sourceStart:unit.start,sourceEnd:unit.end,targetVersion:2,sourceVersion:TARGET_SOURCE_VERSION,ruleVersion:TARGET_RULE_VERSION,
        label:`${word.surah}:${word.ayah}`,category:"jali",amount:state.config.jali.step,ts:Date.now()}});
    }}});
  },[state,dispatch,status]);
  return null;
}
