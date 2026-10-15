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
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
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
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

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
}

export function playBoundarySound(): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

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
  triggerHaptic("medium");
}

export function playWicketSound(): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

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
}

export function playClickSound(): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

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
}

export function playVictorySound(): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

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
}
