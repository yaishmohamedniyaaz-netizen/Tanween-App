/** Disposable, dev-only IndexedDB fault checks; never imported by the app. */
import { appendLocalRecordingChunk, appendReplayRevision, beginLocalRecordingSegment, createLocalRecording,
  deleteLocalRecording, finalizeLocalRecordingSegment, getLocalRecording, loadLocalRecordingPlayback,
  loadReplayRevisions, RECITATION_AUDIO_DB_NAME, RECITATION_AUDIO_DB_VERSION,
  type LocalRecordingManifest } from "../../src/lib/recitationAudioStorage.ts";
import { sha256Audio, type ReplayRevision } from "../../src/lib/recitationReplay.ts";

type Assert = (condition: boolean, message: string) => void;
async function alterFixture(id: string, change: (transaction: IDBTransaction) => void) {
  if (!id.startsWith("qa-replay-reliability-")) throw new Error("Not a disposable test recording");
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(RECITATION_AUDIO_DB_NAME, RECITATION_AUDIO_DB_VERSION);
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(["chunks", "recordings"], "readwrite");
      transaction.oncomplete = () => resolve(); transaction.onabort = () => reject(transaction.error);
      change(transaction);
    });
  } finally { database.close(); }
}

export async function runReplayReliabilityChecks(assert: Assert) {
  const ids: string[] = [];
  const rejected = async (operation: () => Promise<unknown>, label: string) => {
    let failed = false; try { await operation(); } catch { failed = true; }
    assert(failed, label);
  };
  const create = async () => {
    const id = `qa-replay-reliability-${crypto.randomUUID()}`; ids.push(id);
    const manifest = await createLocalRecording(id, "audio/wav");
    const part = await beginLocalRecordingSegment(id, "audio/wav");
    for (let index = 0; index < 3; index++) await appendLocalRecordingChunk(id, part, index, new Blob([`chunk-${index}`]));
    await finalizeLocalRecordingSegment(id, part, 3000, "ready");
    const playback = (await loadLocalRecordingPlayback(id))!;
    const entry: ReplayRevision = { version: 1, id: crypto.randomUUID(), occurrenceId: crypto.randomUUID(), revision: 1,
      media: { sessionId: id, recordingCreatedAt: manifest.createdAt, segmentIndex: part,
        sha256: await sha256Audio(await playback.segments[0].blob.arrayBuffer()), sampleRate: 48000,
        sampleCount: 144000, questionFingerprint: "qa-reliability" },
      target: { kind: "word", wordIds: ["112.1.0"], label: "قُلْ" }, startSample: 48000, endSample: 96000,
      status: "reviewed", method: "manual", createdAt: new Date().toISOString(), reviewer: "qa" };
    return { id, part, entry };
  };
  try {
    for (const missing of [0, 1, 2]) {
      const { id, entry } = await create();
      const part2 = await beginLocalRecordingSegment(id, "audio/wav");
      await appendLocalRecordingChunk(id, part2, 0, new Blob(["second part"]));
      await finalizeLocalRecordingSegment(id, part2, 1000, "ready");
      await alterFixture(id, (transaction) => { transaction.objectStore("chunks").delete(`${id}:0:${missing}`); });
      const loaded = (await loadLocalRecordingPlayback(id))!;
      assert(loaded.segments.length === 2 && loaded.segments[0].index === 0 && loaded.segments[1].index === 1,
        `missing chunk ${missing}: part numbering retained`);
      assert(Boolean(loaded.segments[0].integrityError) && loaded.segments[1].integrityError === null,
        `missing chunk ${missing}: affected part quarantined, other part retained`);
      await rejected(() => appendReplayRevision(entry), `missing chunk ${missing}: reviewed save rejected`);
    }
    const { id, part, entry } = await create();
    await rejected(() => createLocalRecording(id, "audio/wav"), "existing recording cannot be silently replaced");
    await rejected(() => appendLocalRecordingChunk(id, part, 0, new Blob(["replace"])), "finalized audio cannot be overwritten");
    await rejected(() => appendReplayRevision({ ...entry, media: { ...entry.media, sha256: "a".repeat(64) } }), "fabricated original-audio hash rejected");
    await appendReplayRevision(entry);
    const before = await getLocalRecording(id);
    const originalAdd = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (...args: Parameters<IDBObjectStore["add"]>) {
      if (this.name === "replay-revisions") throw new DOMException("Injected quota", "QuotaExceededError");
      return originalAdd.apply(this, args);
    };
    try {
      await rejected(() => appendReplayRevision({ ...entry, id: crypto.randomUUID(), revision: 2 }), "quota failure rejects unsaved correction");
    } finally { IDBObjectStore.prototype.add = originalAdd; }
    assert((await loadReplayRevisions(id)).length === 1, "quota failure leaves earlier timing history intact");
    assert(JSON.stringify(await getLocalRecording(id)) === JSON.stringify(before), "quota failure leaves original recording manifest intact");
    const conflict = await Promise.allSettled([0, 1].map(() => appendReplayRevision({ ...entry, id: crypto.randomUUID(), revision: 2 })));
    assert(conflict.filter((item) => item.status === "fulfilled").length === 1, "concurrent corrections accept exactly one revision");
    await alterFixture(id, (transaction) => {
      const recordings = transaction.objectStore("recordings");
      const request = recordings.get(id);
      request.onsuccess = () => {
        const manifest = request.result as LocalRecordingManifest;
        manifest.segments[0].bytes += 1; recordings.put(manifest);
      };
    });
    assert(Boolean((await loadLocalRecordingPlayback(id))!.segments[0].integrityError), "manifest byte mismatch quarantines the part");
    await rejected(() => appendReplayRevision({ ...entry, id: crypto.randomUUID(), revision: 3 }), "mismatched source cannot receive a new timing");
    const failed = await create();
    await finalizeLocalRecordingSegment(failed.id, failed.part, 1000, "failed");
    assert(Boolean((await loadLocalRecordingPlayback(failed.id))!.segments[0].integrityError), "failed capture remains marked incomplete despite surviving chunks");
    const emptyId = `qa-replay-reliability-${crypto.randomUUID()}`; ids.push(emptyId);
    await createLocalRecording(emptyId, "audio/wav");
    const emptyPart = await beginLocalRecordingSegment(emptyId, "audio/wav");
    await rejected(() => appendLocalRecordingChunk(emptyId, emptyPart, 1, new Blob(["gap"])), "out-of-order capture cannot create a hidden gap");
    await finalizeLocalRecordingSegment(emptyId, emptyPart, 0, "ready");
    assert((await loadLocalRecordingPlayback(emptyId))!.segments.length === 1 && Boolean((await loadLocalRecordingPlayback(emptyId))!.segments[0].integrityError),
      "empty finalized part remains visible as unavailable");
  } finally {
    for (const id of ids) await deleteLocalRecording(id);
  }
}
