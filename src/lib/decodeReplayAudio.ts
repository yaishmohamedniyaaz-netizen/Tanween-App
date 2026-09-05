import { encodeReplayWav, sha256Audio } from "./recitationReplay.ts";

export interface DecodedReplayAudio {
  samples: Float32Array;
  sampleRate: number;
  sha256: string;
  blob: Blob;
}

export async function decodeReplayAudio(blob: Blob): Promise<DecodedReplayAudio> {
  // Bound the prototype before allocating a decoded buffer on mobile devices.
  if (blob.size > 12 * 1024 * 1024) throw new Error("This part is too large for word review. Full recording playback is still available.");
  const bytes = await blob.arrayBuffer();
  const hash = await sha256Audio(bytes);
  // A fixed decode rate makes sidecar addresses stable after audio-device changes.
  // Offline decoding also avoids opening a second live audio device for review.
  const context = new OfflineAudioContext(1, 1, 48000);
  const decoded = await context.decodeAudioData(bytes);
  if (decoded.duration > 300 || decoded.length === 0) {
    throw new Error("Word review supports recording parts up to five minutes. Full recording playback is still available.");
  }
  const samples = new Float32Array(decoded.length);
  for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
    const input = decoded.getChannelData(channel);
    for (let index = 0; index < input.length; index++) samples[index] += input[index] / decoded.numberOfChannels;
  }
  return { samples, sampleRate: decoded.sampleRate, sha256: hash,
    blob: new Blob([encodeReplayWav(samples, decoded.sampleRate)], { type: "audio/wav" }) };
}
