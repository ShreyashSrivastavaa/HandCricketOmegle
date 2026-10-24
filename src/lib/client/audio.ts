// Web Audio API sound generator + haptic feedback
// Guarantees zero latency and 100% asset availability on any deployment without external audio files.

let audioCtx: AudioContext | null = null;
let isMuted = false;

// Load mute state from localStorage if available in browser
if (typeof window !== "undefined") {
  try {
    isMuted = localStorage.getItem("hc_sound_muted") === "true";
  } catch {
    isMuted = false;
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    } catch {
      audioCtx = null;
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function withAudioContext(play: (ctx: AudioContext) => void): void {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    play(ctx);
  } catch {}
}

export function isSoundMuted(): boolean {
  return isMuted;
}

export function toggleSoundMute(): boolean {
  isMuted = !isMuted;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("hc_sound_muted", isMuted ? "true" : "false");
    } catch {}
  }
  return isMuted;
}

export function triggerHaptic(type: "light" | "medium" | "heavy" | "wicket" | "win" = "light"): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    switch (type) {
      case "light":
        navigator.vibrate(15);
        break;
      case "medium":
        navigator.vibrate(40);
        break;
      case "heavy":
        navigator.vibrate(70);
        break;
      case "wicket":
        navigator.vibrate([80, 50, 120]);
        break;
      case "win":
        navigator.vibrate([40, 40, 80, 40, 120]);
        break;
    }
  } catch {}
}

export function playBatHitSound(): void {
  withAudioContext((ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.13);
    triggerHaptic("light");
  });
}

let crowdNoiseBuffer: AudioBuffer | null = null;
let crowdReverb: ConvolverNode | null = null;

function getCrowdNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (crowdNoiseBuffer && crowdNoiseBuffer.sampleRate === ctx.sampleRate) {
    return crowdNoiseBuffer;
  }

  const length = Math.floor(ctx.sampleRate * 2.5);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }

  crowdNoiseBuffer = buffer;
  return buffer;
}

function getCrowdReverb(ctx: AudioContext): ConvolverNode {
  if (crowdReverb) return crowdReverb;

  const length = Math.floor(ctx.sampleRate * 0.9);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const decay = Math.pow(1 - i / length, 2.8);
      data[i] = (Math.random() * 2 - 1) * decay;
    }
  }

  crowdReverb = ctx.createConvolver();
  crowdReverb.buffer = impulse;
  return crowdReverb;
}

function playCrowdCheer(ctx: AudioContext, runs: 4 | 6): void {
  const now = ctx.currentTime;
  const isSix = runs === 6;
  const duration = isSix ? 2.2 : 1.6;
  const peak = isSix ? 1.4 : 1.1;

  const master = ctx.createGain();
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -12;
  compressor.knee.value = 18;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.3;

  master.gain.setValueAtTime(0.0001, now);
  master.gain.linearRampToValueAtTime(peak, now + 0.16);
  master.gain.setValueAtTime(peak, now + duration * 0.55);
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  const dry = ctx.createGain();
  dry.gain.value = 0.82;
  const wet = ctx.createGain();
  wet.gain.value = isSix ? 0.22 : 0.16;

  const reverb = getCrowdReverb(ctx);
  master.connect(dry);
  dry.connect(compressor);
  master.connect(reverb);
  reverb.connect(wet);
  wet.connect(compressor);
  compressor.connect(ctx.destination);

  const noise = getCrowdNoiseBuffer(ctx);
  const layers = [
    { frequency: 180, q: 0.7, gain: 0.35, pan: 0, rate: 0.92 },
    { frequency: 480, q: 0.8, gain: 0.5, pan: -0.4, rate: 1 },
    { frequency: 950, q: 1, gain: 0.42, pan: 0.35, rate: 1.04 },
    { frequency: 1700, q: 1.2, gain: 0.28, pan: 0.05, rate: 1.08 },
  ];

  layers.forEach((layer, index) => {
    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    source.playbackRate.value = layer.rate;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = layer.frequency;
    filter.Q.value = layer.q;

    const gain = ctx.createGain();
    gain.gain.value = layer.gain;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 2.4 + index * 1.3;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = layer.gain * 0.18;
    const lfoFilterGain = ctx.createGain();
    lfoFilterGain.gain.value = layer.frequency * 0.06;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.connect(lfoFilterGain);
    lfoFilterGain.connect(filter.frequency);

    source.connect(filter);
    filter.connect(gain);

    const panner =
      typeof ctx.createStereoPanner === "function" ? ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.value = layer.pan;
      gain.connect(panner);
      panner.connect(master);
    } else {
      gain.connect(master);
    }

    source.start(now);
    source.stop(now + duration + 0.1);
    lfo.start(now);
    lfo.stop(now + duration + 0.1);
  });

  const clapCount = isSix ? 16 : 10;
  for (let i = 0; i < clapCount; i++) {
    const start = now + 0.1 + Math.random() * (duration - 0.35);
    const clap = ctx.createBufferSource();
    clap.buffer = noise;
    clap.playbackRate.value = 1.1 + Math.random() * 0.7;

    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 1100 + Math.random() * 900;

    const gain = ctx.createGain();
    const level = 0.04 + Math.random() * 0.05;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(level, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.05 + Math.random() * 0.04);

    clap.connect(highpass);
    highpass.connect(gain);
    gain.connect(master);
    clap.start(start, Math.random() * 1.2, 0.1);
  }

  const whistleStart = now + 0.18;
  const whistle = ctx.createOscillator();
  const whistleGain = ctx.createGain();
  whistle.type = "sine";
  whistle.frequency.setValueAtTime(1800 + Math.random() * 300, whistleStart);
  whistle.frequency.linearRampToValueAtTime(2300 + Math.random() * 500, whistleStart + 0.35);
  whistleGain.gain.setValueAtTime(0.0001, whistleStart);
  whistleGain.gain.linearRampToValueAtTime(isSix ? 0.035 : 0.022, whistleStart + 0.06);
  whistleGain.gain.exponentialRampToValueAtTime(0.0001, whistleStart + 0.6);
  whistle.connect(whistleGain);
  whistleGain.connect(master);
  whistle.start(whistleStart);
  whistle.stop(whistleStart + 0.65);
}

export function playBoundarySound(runs?: 4 | 6): void {
  withAudioContext((ctx) => {
    // Dual tone for maximum impact
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(260, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(540, ctx.currentTime + 0.25);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(520, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);
    osc2.stop(ctx.currentTime + 0.35);

    if (runs) {
      playCrowdCheer(ctx, runs);
    }

    triggerHaptic(runs === 6 ? "heavy" : "medium");
  });
}

export function playWicketSound(): void {
  withAudioContext((ctx) => {
    // Dramatic crash / wood stump sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.45);

    gain.gain.setValueAtTime(0.55, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.46);
    triggerHaptic("wicket");
  });
}

export function playClickSound(): void {
  withAudioContext((ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(750, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
    triggerHaptic("light");
  });
}

export function playVictorySound(): void {
  withAudioContext((ctx) => {
    const notes = [440, 554.37, 659.25, 880]; // A major chord
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);

      gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.1);
      osc.stop(ctx.currentTime + idx * 0.1 + 0.42);
    });

    triggerHaptic("win");
  });
}
