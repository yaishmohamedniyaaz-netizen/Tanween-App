/** Dev-only real-media component regression harness. No competition data. */
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { SessionRecordingPlayer } from "../../src/components/SessionRecordingPlayer.tsx";
import { appendLocalRecordingChunk, appendReplayRevision, beginLocalRecordingSegment, createLocalRecording,
  finalizeLocalRecordingSegment, loadReplayRevisions } from "../../src/lib/recitationAudioStorage.ts";
import { encodeReplayWav } from "../../src/lib/recitationReplay.ts";
import "../../src/styles/global.css";

const prefix = `qa-replay-ui-${crypto.randomUUID()}`;
const sources = [{ sessionId: `${prefix}-a`, label: "Two-part recording" }, { sessionId: `${prefix}-b`, label: "Other recording" }];
const words = [{ wordId: "112.1.0", text: "قُلْ", surah: 112, ayah: 1 }];
const query = <T extends Element>(selector: string) => document.querySelector<T>(selector)!;
const wait = async (check: () => boolean, label: string) => {
  const end = performance.now() + 8000;
  while (!check()) { if (performance.now() > end) throw new Error(`Timed out: ${label}`); await new Promise((resolve) => setTimeout(resolve, 30)); }
};
const change = (selector: string, value: string) => {
  const input = query<HTMLInputElement | HTMLSelectElement>(selector);
  const proto = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true })); input.dispatchEvent(new Event("change", { bubbles: true }));
};
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>(".test-player button")].find((item) => item.textContent === text)!;

function App() {
  const [ready, setReady] = useState(false);
  const [report, setReport] = useState("Preparing disposable audio…");
  const [selected, setSelected] = useState("112.1.0");
  const [focus, setFocus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showChecks, setShowChecks] = useState(true);
  useEffect(() => { void (async () => {
    for (const source of sources) {
      await createLocalRecording(source.sessionId, "audio/wav");
      for (let part = 0; part < (source === sources[0] ? 2 : 1); part++) {
        const index = await beginLocalRecordingSegment(source.sessionId, "audio/wav");
        const samples = new Float32Array(48000 * 3);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.sin(i / 48000 * 2 * Math.PI * (part ? 660 : 440)) * 0.08;
        await appendLocalRecordingChunk(source.sessionId, index, 0, new Blob([encodeReplayWav(samples, 48000)], { type: "audio/wav" }));
        await finalizeLocalRecordingSegment(source.sessionId, index, 3000, "ready");
      }
    }
    setReady(true); setReport("Ready. These synthetic tones are not Quran recitation.");
  })().catch((failure) => setReport(`FAIL ${failure}`)); }, []);

  const run = async () => {
    setBusy(true); setShowChecks(true);
    const results: string[] = [];
    const pass = (value: boolean, label: string) => { if (!value) throw new Error(label); results.push(`PASS ${label}`); setReport(results.join("\n")); };
    const audio = () => query<HTMLAudioElement>(".test-player audio");
    try {
      await wait(() => Boolean(audio()?.readyState), "first media metadata");
      query<HTMLButtonElement>('[aria-label="Play recitation replay"]').click();
      await wait(() => !audio().paused, "full replay playing");
      const firstPart = audio();
      change('[aria-label="Recitation replay position"]', "3500");
      await wait(() => audio() !== firstPart && !audio().paused && audio().currentTime >= 0.49, "scrub to next part");
      pass(firstPart.paused && !firstPart.getAttribute("src") && Boolean(audio().getAttribute("src")), "cross-part seek preserves new source and releases old media");
      const oldSource = audio();
      change(".session-recording-heading select", sources[1].sessionId);
      await wait(() => audio() !== oldSource && audio()?.readyState > 0, "other source loaded");
      pass(oldSource.paused && !oldSource.getAttribute("src") && audio().paused && audio().currentTime === 0, "source switch cancels old playback intentions");
      change(".session-recording-heading select", sources[0].sessionId);
      await wait(() => audio()?.duration === 3 && query<HTMLSelectElement>(".session-recording-heading select").value === sources[0].sessionId, "first source reload");
      query<HTMLButtonElement>('[aria-label="Play recitation replay"]').click();
      await wait(() => !audio().paused, "play before automatic next part");
      const autoFirst = audio();
      change('[aria-label="Recitation replay position"]', "2750");
      await wait(() => audio() !== autoFirst && !audio().paused, "automatic next part");
      pass(Boolean(audio().getAttribute("src")), "automatic next part retains its audio source");
      const fullPlayer = audio();
      button("Review words").click();
      await wait(() => Boolean(query<HTMLButtonElement>('[aria-label="Play word replay"]')) && !query<HTMLButtonElement>('[aria-label="Play word replay"]').disabled, "word player ready");
      pass(fullPlayer.paused && !fullPlayer.getAttribute("src"), "opening word review stops and releases full playback");
      change('[aria-label="Replay start seconds"]', "0.5"); change('[aria-label="Replay end seconds"]', "1.2");
      button("Save as reviewed").click();
      await wait(() => Boolean(query(".replay-notice")), "first save");
      const original = (await loadReplayRevisions(sources[0].sessionId))[0];
      await appendReplayRevision({ ...original, id: crypto.randomUUID(), revision: 2, startSample: 28800, endSample: 62400 });
      change('[aria-label="Replay start seconds"]', "0.7");
      button("Save as reviewed").click();
      await wait(() => Boolean(button("Load latest timing · keep my draft")), "conflict recovery");
      pass(query<HTMLInputElement>('[aria-label="Replay start seconds"]').value === "0.7" && button("Save as reviewed").disabled, "conflict keeps draft and blocks silent overwrite");
      button("Load latest timing · keep my draft").click();
      await wait(() => !button("Save as reviewed").disabled, "latest timings loaded");
      pass(query<HTMLInputElement>('[aria-label="Replay start seconds"]').value === "0.7" && query(".replay-notice").textContent!.includes("revision 2"), "reload shows new revision without replacing draft");
      button("Save as reviewed").click();
      await wait(() => Boolean(query(".replay-notice")?.textContent?.startsWith("Timing saved")), "explicit correction saved");
      pass((await loadReplayRevisions(sources[0].sessionId)).length === 3, "explicit correction appends revision three");
      const originalAdd = IDBObjectStore.prototype.add;
      IDBObjectStore.prototype.add = function (...args: Parameters<IDBObjectStore["add"]>) {
        if (this.name === "replay-revisions") throw new DOMException("Injected quota", "QuotaExceededError");
        return originalAdd.apply(this, args);
      };
      try {
        change('[aria-label="Replay end seconds"]', "1.4"); button("Save as reviewed").click();
        await wait(() => Boolean(query(".replay-error")?.textContent?.includes("no space")), "quota failure visible");
        pass(!query(".replay-notice") && query<HTMLInputElement>('[aria-label="Replay end seconds"]').value === "1.4", "failed save removes stale success and preserves boundaries");
      } finally { IDBObjectStore.prototype.add = originalAdd; }
      const oldReview = audio();
      query<HTMLButtonElement>('[aria-label="Play word replay"]').click();
      await wait(() => !audio().paused, "word playback started");
      change('[aria-label="Recording part"]', "1");
      await wait(() => audio() !== oldReview && Boolean(audio()?.readyState), "word part switch");
      pass(oldReview.paused && !oldReview.getAttribute("src") && audio().paused, "word part switch clears playback and old timing state");
      pass(query<HTMLInputElement>('[aria-label="Replay start seconds"]').value === "0.00", "new part starts without old timing boundaries");
      const closing = audio(); button("Close word review").click();
      await wait(() => Boolean(query('[aria-label="Play recitation replay"]')), "fallback restored");
      pass(closing.paused && !closing.getAttribute("src"), "closing word review releases its media");
      setReport([...results, "COMPLETE: playback and recovery checks passed"].join("\n"));
    } catch (failure) { setReport([...results, `FAIL ${String(failure)}`, JSON.stringify({
      paused: audio()?.paused, time: audio()?.currentTime, src: audio()?.getAttribute("src"),
      mediaReady: audio()?.readyState, controls: query(".test-player")?.textContent,
    })].join("\n")); }
    finally { setBusy(false); }
  };
  return <main style={{ maxWidth: 1000, padding: 16, margin: "0 auto" }}>
    <h1>Replay reliability</h1><p>Disposable local tones. No judging records or microphone access.</p>
    <button className="btn-secondary" disabled={!ready || busy} onClick={() => void run()}>Run playback lifecycle checks</button>
    <button className="btn-secondary" onClick={() => setShowChecks((value) => !value)}>{showChecks ? "Hide check report" : "Show check report"}</button>
    {showChecks && <pre style={{ whiteSpace: "pre-wrap", marginBlock: 16 }} role="status">{report}</pre>}
    <div className="test-player">{ready && <SessionRecordingPlayer sources={sources} replay={{ questionFingerprint: "qa-replay-ui",
      words, selectedWordId: selected, requestedSessionId: null, onWordSelect: setSelected, onPlaybackWord: setFocus }} />}</div>
    <p>Playback focus: {focus ?? "none"}</p>
  </main>;
}
const root = createRoot(document.getElementById("root")!); root.render(<App />);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
