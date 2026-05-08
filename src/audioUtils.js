// Browser-side audio capture and WAV encoding for voice input.
// Records from the microphone at 16 kHz mono PCM — the format Wispr Flow expects.

const TARGET_SR = 16000;

export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, sampleRate: TARGET_SR, echoCancellation: true, noiseSuppression: true }
  });

  const ctx = new AudioContext({ sampleRate: TARGET_SR });
  const source = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const chunks = [];

  proc.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  source.connect(proc);
  proc.connect(ctx.destination);

  return {
    stop: async () => {
      proc.disconnect();
      source.disconnect();
      stream.getTracks().forEach(t => t.stop());
      await ctx.close();
      return encodeWAV(merge(chunks), TARGET_SR);
    }
  };
}

function merge(chunks) {
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Float32Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

function encodeWAV(f32, sr) {
  const pcm = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  const buf = new ArrayBuffer(44 + pcm.byteLength);
  const v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };

  w(0, 'RIFF');  v.setUint32(4, 36 + pcm.byteLength, true);
  w(8, 'WAVE');  w(12, 'fmt ');  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);          // PCM
  v.setUint16(22, 1, true);          // mono
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, pcm.byteLength, true);
  new Uint8Array(buf, 44).set(new Uint8Array(pcm.buffer));

  // Chunked base64 to avoid call-stack overflow on long recordings
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }

  return { base64: btoa(binary), mimeType: 'audio/wav', duration: f32.length / sr };
}
