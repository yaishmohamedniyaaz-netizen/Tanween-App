class TahqeeqTilawaAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.bufferSize = 2400;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    const ratio = sampleRate / 16000;
    for (let index = 0; index < channel.length; index += ratio) {
      this.buffer.push(channel[Math.floor(index)]);
    }

    if (this.buffer.length >= this.bufferSize) {
      const chunk = new Float32Array(this.buffer);
      this.port.postMessage(chunk.buffer, [chunk.buffer]);
      this.buffer = [];
    }
    return true;
  }
}

registerProcessor("tahqeeq-tilawa-audio", TahqeeqTilawaAudioProcessor);
