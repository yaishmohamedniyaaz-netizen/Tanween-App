import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { RecitationReplayPlayer } from "../../src/components/RecitationReplayPlayer";
import { createLocalRecording, beginLocalRecordingSegment, appendLocalRecordingChunk,
  finalizeLocalRecordingSegment, getLocalRecording, appendReplayRevision } from "../../src/lib/recitationAudioStorage";
import { encodeReplayWav } from "../../src/lib/recitationReplay";
import { decodeReplayAudio } from "../../src/lib/decodeReplayAudio";
import "../../src/styles/global.css";

const sessionId = `qa-navigation-${crypto.randomUUID()}`;
const words = [{wordId:"112.1.0",text:"قُلْ",surah:112,ayah:1}];
function App() {
  const [ready,setReady]=useState(false);
  const [events,setEvents]=useState<string[]>([]);
  const [report,setReport]=useState("Synthetic tones only. No competition records are used.");
  const setup=async(missingPart=false)=>{
    try {
      await createLocalRecording(sessionId,"audio/wav");
      for(let part=0;part<(missingPart?4:3);part++) {
        const index=await beginLocalRecordingSegment(sessionId,"audio/wav");
        const samples=new Float32Array(48000*4);
        for(let i=0;i<samples.length;i++) samples[i]=Math.sin(i/48000*2*Math.PI*(part?660:440))*0.05;
        const blob=new Blob([encodeReplayWav(samples,48000)],{type:"audio/wav"});
        if (!(missingPart && part===2)) await appendLocalRecordingChunk(sessionId,index,0,blob);
        await finalizeLocalRecordingSegment(sessionId,index,4000,"ready");
        if(part===1) {
          const audio=await decodeReplayAudio(blob), recording=await getLocalRecording(sessionId);
          await appendReplayRevision({version:1,id:crypto.randomUUID(),occurrenceId:crypto.randomUUID(),revision:1,
            media:{sessionId,recordingCreatedAt:recording!.createdAt,segmentIndex:index,sha256:audio.sha256,
              sampleRate:audio.sampleRate,sampleCount:audio.samples.length,questionFingerprint:"qa-navigation"},
            target:{kind:"word",wordIds:["112.1.0"],label:"قُلْ"},startSample:48000,endSample:72000,
            status:"reviewed",method:"manual",createdAt:new Date().toISOString(),reviewer:"qa"});
        }
      }
      setReady(true);setReport(missingPart
        ? "Part 3 has no audio. Replay must stop after Part 2 without skipping into Part 4."
        : "Word exists only in Part 2. Play word should switch from Part 1, begin at 0.5s, then continue into Part 3 at zero.");
    } catch(error) {setReport(String(error));}
  };
  return <main style={{maxWidth:700,margin:"24px auto",padding:16}}>
    <h1>Cross-part word replay</h1><p>{report}</p>
    {!ready && <button disabled={!import.meta.env.DEV} onClick={()=>void setup()}>Create isolated audio fixture</button>}
    {!ready && <button disabled={!import.meta.env.DEV} onClick={()=>void setup(true)}>Create missing-part fixture</button>}
    {ready && <div onPlayCapture={event=>{const audio=event.target as HTMLAudioElement;setEvents(items=>[...items,`play ${audio.currentTime.toFixed(3)}`]);}}
      onEndedCapture={event=>{const audio=event.target as HTMLAudioElement;setEvents(items=>[...items,`ended ${audio.currentTime.toFixed(3)}`]);}}>
      <RecitationReplayPlayer sources={[{sessionId,label:"Synthetic recording"}]}
      embedded fallback={null} context={{questionFingerprint:"qa-navigation",words,selectedWordId:"112.1.0",
        requestedSessionId:null,onWordSelect:()=>{},onPlaybackWord:()=>{}}} /></div>}
    <pre aria-label="Playback event trace">{events.join("\n")}</pre>
  </main>;
}
createRoot(document.getElementById("root")!).render(<App/>);
