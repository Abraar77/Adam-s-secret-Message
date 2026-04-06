// ---------------------------------------------------------------------------
// Client-only: Web Audio API voice effect chains.
// Import only from client components — this module uses browser globals.
// ---------------------------------------------------------------------------

export type VoicePreset = "normal" | "deep" | "chipmunk" | "robot" | "telephone";

export const VOICE_PRESETS: { id: VoicePreset; label: string; description: string }[] = [
  { id: "normal",    label: "Normal",    description: "No effect" },
  { id: "deep",      label: "Deep",      description: "Lower, slower" },
  { id: "chipmunk",  label: "Chipmunk",  description: "Higher, faster" },
  { id: "robot",     label: "Robot",     description: "Metallic pulse" },
  { id: "telephone", label: "Telephone", description: "Filtered & warm" },
];

/**
 * Wire a source node through the chosen effect and into `destination`.
 * Also starts any internal oscillators that are needed.
 * Returns a cleanup function that stops those oscillators when called.
 */
export function connectEffect(
  ctx: BaseAudioContext,
  source: AudioBufferSourceNode,
  preset: VoicePreset,
  destination: AudioNode,
): () => void {
  switch (preset) {
    case "normal": {
      source.connect(destination);
      return () => {};
    }

    case "deep": {
      source.playbackRate.value = 0.72;
      source.connect(destination);
      return () => {};
    }

    case "chipmunk": {
      source.playbackRate.value = 1.55;
      source.connect(destination);
      return () => {};
    }

    case "robot": {
      // Amplitude modulation at 60 Hz produces a buzzing robotic quality.
      // gain.gain DC offset = 0.5; oscillator adds ±0.5 → total gain 0–1.
      const gain = ctx.createGain();
      gain.gain.value = 0.5;

      const oscGain = ctx.createGain();
      oscGain.gain.value = 0.5;

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 60;

      source.connect(gain);
      osc.connect(oscGain);
      oscGain.connect(gain.gain);
      gain.connect(destination);
      osc.start(0);

      return () => { try { osc.stop(); } catch { /* already stopped */ } };
    }

    case "telephone": {
      // Narrow bandpass centered ~1800 Hz mimics telephone frequency response.
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1800;
      filter.Q.value = 0.65;

      // Soft-clip distortion for the slightly crunchy telephone quality.
      const dist = ctx.createWaveShaper();
      dist.curve = makeSoftClipCurve(256, 30);

      const gainOut = ctx.createGain();
      gainOut.gain.value = 1.5; // compensate for filter attenuation

      source.connect(filter);
      filter.connect(dist);
      dist.connect(gainOut);
      gainOut.connect(destination);
      return () => {};
    }
  }
}

// ---------------------------------------------------------------------------
// Helper: soft-clip wave-shaper curve
// ---------------------------------------------------------------------------

function makeSoftClipCurve(size: number, drive: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(size * 4));
  for (let i = 0; i < size; i++) {
    const x = (i * 2) / size - 1;
    curve[i] = ((Math.PI + drive) * x) / (Math.PI + drive * Math.abs(x));
  }
  return curve;
}

// ---------------------------------------------------------------------------
// Helper: return the first MediaRecorder mimeType the browser supports
// ---------------------------------------------------------------------------

export function getSupportedAudioMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];
  if (typeof MediaRecorder === "undefined") return "";
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}