import * as ort from "onnxruntime-web/wasm";
import {
  CONSERVATIVE_STREAMING_CONFIG,
  createTilawaSession,
  type TilawaSession,
  type WorkerOutbound,
} from "@tilawa/core";
import { greedyWordWindows, matchReplayContext, type ReplaySuggestion } from "../lib/recitationReplayAnalysis.ts";
import { tilawaMushafWordId } from "../lib/tilawaWordFocus.ts";
import { sha256Audio } from "../lib/recitationReplay.ts";

const MODEL_URL = "/tilawa/fastconformer_full_mixed.onnx";
const VOCAB_URL = "/tilawa/vocab.json";
const CTC_TOKENS_URL = "/tilawa/quran_ctc_tokens.json";
const QURAN_URL = "/tilawa/quran.json";
const MODEL_CACHE_DB = "tahqeeq-tilawa-prototype";
const MODEL_CACHE_STORE = "models";
const MODEL_CACHE_KEY = "tilawa-v0.2.0-fastconformer-full-mixed";

type PrototypeInbound =
  | { type: "init" }
  | { type: "audio"; samples: Float32Array }
  | { type: "reset" };

interface ReplayAnalysisRequest {
  type: "analyze_replay";
  samples: Float32Array;
  allowedWordIds: string[];
}

type PrototypeOutbound =
  | { type: "loading"; percent: number }
  | { type: "loading_status"; message: string }
  | { type: "performance"; processingMs: number; queuedMs: number }
  | { type: "ready" }
  | { type: "error"; message: string }
  | { type: "replay_analysis"; suggestions: ReplaySuggestion[]; modelHash: string; vocabHash: string; referenceStrategy: "tilawa-contiguous-v1" }
  | WorkerOutbound;

const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<PrototypeInbound | ReplayAnalysisRequest>) => void) | null;
  postMessage: (message: PrototypeOutbound) => void;
};

let tilawaSession: TilawaSession | null = null;
let initialization: Promise<void> | null = null;
let pendingAudio: Float32Array[] = [];
let feedActive = false;
let modelHash = "";
let vocabHash = "";
let replayAnalysisActive = false;

function post(message: PrototypeOutbound) {
  scope.postMessage(message);
}

function concatenateAudio(chunks: readonly Float32Array[]): Float32Array {
  const sampleCount = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const combined = new Float32Array(sampleCount);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  return combined;
}

function queuedMilliseconds(): number {
  const samples = pendingAudio.reduce((total, chunk) => total + chunk.length, 0);
  return Math.round(samples / 16);
}

async function drainAudio() {
  if (feedActive) return;
  feedActive = true;
  try {
    await initialization;
    while (pendingAudio.length > 0) {
      // One model pass may take longer than the 150 ms microphone cadence.
      // Merge everything that arrived during that pass so inference catches up
      // to the live edge instead of replaying an ever-growing promise queue.
      const samples = concatenateAudio(pendingAudio.splice(0));
      const startedAt = performance.now();
      await tilawaSession?.feed(samples);
      post({
        type: "performance",
        processingMs: Math.round(performance.now() - startedAt),
        queuedMs: queuedMilliseconds(),
      });
    }
  } catch (error) {
    pendingAudio = [];
    post({
      type: "error",
      message: error instanceof Error ? error.message : "Tilawa inference stopped.",
    });
  } finally {
    feedActive = false;
    if (pendingAudio.length > 0) void drainAudio();
  }
}

function openModelCache(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MODEL_CACHE_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(MODEL_CACHE_STORE)) {
        request.result.createObjectStore(MODEL_CACHE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readCachedModel(): Promise<ArrayBuffer | null> {
  const database = await openModelCache();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(MODEL_CACHE_STORE, "readonly");
    const request = transaction.objectStore(MODEL_CACHE_STORE).get(MODEL_CACHE_KEY);
    request.onsuccess = () => resolve((request.result as ArrayBuffer | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function writeCachedModel(model: ArrayBuffer): Promise<void> {
  const database = await openModelCache();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(MODEL_CACHE_STORE, "readwrite");
    transaction.objectStore(MODEL_CACHE_STORE).put(model, MODEL_CACHE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Tilawa asset download failed (${response.status}).`);
  return response.json() as Promise<T>;
}

async function loadModel(): Promise<ArrayBuffer> {
  const cached = await readCachedModel();
  if (cached) {
    post({ type: "loading_status", message: "Using the downloaded model" });
    return cached;
  }

  post({ type: "loading_status", message: "Downloading the 88 MB recognition model" });
  const response = await fetch(MODEL_URL);
  if (!response.ok || !response.body) {
    throw new Error(`Tilawa model download failed (${response.status}).`);
  }
  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    post({
      type: "loading",
      percent: total > 0 ? Math.round((loaded / total) * 100) : 0,
    });
  }

  const model = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    model.set(chunk, offset);
    offset += chunk.byteLength;
  }
  await writeCachedModel(model.buffer);
  return model.buffer;
}

async function initialize() {
  try {
    post({ type: "loading_status", message: "Loading Tilawa text assets" });
    const [vocab, quranCtcTokens, quran, model] = await Promise.all([
      fetchJson<Record<string, string>>(VOCAB_URL),
      fetchJson<Record<string, number[]>>(CTC_TOKENS_URL),
      fetchJson<unknown[]>(QURAN_URL),
      loadModel(),
    ]);
    [modelHash, vocabHash] = await Promise.all([
      sha256Audio(model), sha256Audio(new TextEncoder().encode(JSON.stringify(vocab)).buffer),
    ]);

    post({ type: "loading_status", message: "Starting the on-device model" });
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.simd = true;
    ort.env.wasm.wasmPaths = {
      wasm: "/tilawa/ort-wasm-simd-threaded.wasm",
    };
    const inferenceSession = await ort.InferenceSession.create(model, {
      executionProviders: ["wasm"],
    });
    tilawaSession = createTilawaSession(
      {
        async run(audio) {
          const input = new ort.Tensor("float32", audio, [1, audio.length]);
          const length = new ort.Tensor(
            "int64",
            BigInt64Array.from([BigInt(audio.length)]),
            [1],
          );
          const results = await inferenceSession.run({ audio_signal: input, length });
          const output = results[inferenceSession.outputNames[0]];
          const [, timeSteps, vocabSize] = output.dims as number[];
          return {
            logprobs: output.data as Float32Array,
            timeSteps,
            vocabSize,
          };
        },
      },
      { vocab, quranCtcTokens, quran, blankId: 1024 },
      {
        config: CONSERVATIVE_STREAMING_CONFIG,
        onOutput: post,
      },
    );
    post({ type: "ready" });
  } catch (error) {
    post({
      type: "error",
      message: error instanceof Error ? error.message : "Tilawa could not start.",
    });
  }
}

async function analyzeReplay(message: ReplayAnalysisRequest) {
  if (replayAnalysisActive) return;
  replayAnalysisActive = true;
  try {
    await initialization;
    if (!tilawaSession) throw new Error("The recognition model is unavailable.");
    if (message.samples.length < 16000 || message.samples.length > 30 * 16000 || message.allowedWordIds.length > 5000) {
      throw new Error("Choose a recording window between one and thirty seconds.");
    }
    const raw = await tilawaSession.transcribeRaw(message.samples);
    const acoustic = raw.acoustic;
    if (!acoustic) throw new Error("No acoustic evidence was returned.");
    const vocab: Record<string, string> = {};
    for (let id = 0; id < acoustic.vocabSize; id++) {
      vocab[String(id)] = tilawaSession.decoder.tokenIdsToRawTokens([id])[0] ?? "<unk>";
    }
    const allowed = new Set(message.allowedWordIds);
    const references = tilawaSession.db.verses.map((verse) => ({ surah: verse.surah, ayah: verse.ayah,
      words: verse.phoneme_words.map((text, index) => {
      const id = tilawaMushafWordId({ surah: verse.surah, ayah: verse.ayah,
        word_index: index + 1, total_words: verse.phoneme_words.length });
      let ids = id ? [id] : [];
      // Joined model tokens have one interval for both printed words.
      const split = ({ "2:181": 2, "8:6": 3, "13:37": 7 } as Record<string, number>)[`${verse.surah}:${verse.ayah}`];
      if (split === index && id) ids = [`${verse.surah}.${verse.ayah}.${index}`, id];
      return { text, wordIds: ids.every((value) => allowed.has(value)) ? ids : [] };
    }) }));
    const words = greedyWordWindows(acoustic.logprobs, acoustic.timeSteps, acoustic.vocabSize, vocab, acoustic.blankId);
    post({ type: "replay_analysis", modelHash, vocabHash, referenceStrategy: "tilawa-contiguous-v1",
      suggestions: matchReplayContext(words, references, acoustic.timeSteps, message.samples.length / 16000) });
  } catch (error) {
    post({ type: "error", message: error instanceof Error ? error.message : "Recording analysis failed." });
  } finally {
    replayAnalysisActive = false;
  }
}

scope.onmessage = (event) => {
  const message = event.data;
  if (message.type === "analyze_replay") {
    initialization ??= initialize();
    void analyzeReplay(message);
    return;
  }
  if (message.type === "init") {
    initialization ??= initialize();
    return;
  }
  if (message.type === "reset") {
    pendingAudio = [];
    tilawaSession?.reset();
    return;
  }
  if (message.type === "audio") {
    pendingAudio.push(message.samples);
    void drainAudio();
  }
};
