// Small sound helpers (Web Audio API). Kept dependency-free.

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
  if (!Ctx) return null;
  if (!audioContext) audioContext = new Ctx();
  return audioContext;
};

/** Get current sound settings from localStorage */
export const getSoundSettings = () => {
  if (typeof window === "undefined") return { soundEnabled: true, soundVolume: 50 };
  try {
    const saved = localStorage.getItem("cashier_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        soundEnabled: parsed.soundEnabled ?? true,
        soundVolume: parsed.soundVolume ?? 50,
      };
    }
  } catch {
    // ignore
  }
  return { soundEnabled: true, soundVolume: 50 };
};

/** Short, subtle beep for cashier cart add (must be called from user gesture). */
export const playCartAddSound = async () => {
  try {
    const { soundEnabled, soundVolume } = getSoundSettings();
    if (!soundEnabled) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Scale volume: 0-100 -> 0-0.15
    const baseVolume = (soundVolume / 100) * 0.15;
    const t0 = ctx.currentTime;
    gainNode.gain.setValueAtTime(baseVolume, t0);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);

    oscillator.start(t0);
    oscillator.stop(t0 + 0.09);
  } catch {
    // ignore sound errors (blocked audio policy etc.)
  }
};

/** Two-tone alert: KKM disconnected (descending) */
export const playKkmDisconnectSound = async () => {
  try {
    const { soundEnabled, soundVolume } = getSoundSettings();
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();

    const vol = (soundVolume / 100) * 0.2;
    const t0 = ctx.currentTime;

    // High then low tone
    for (const [freq, offset] of [[660, 0], [440, 0.15]] as const) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      osc.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(vol, t0 + offset);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + offset + 0.12);
      osc.start(t0 + offset);
      osc.stop(t0 + offset + 0.13);
    }
  } catch {}
};

/** Rising chime: KKM reconnected */
export const playKkmReconnectSound = async () => {
  try {
    const { soundEnabled, soundVolume } = getSoundSettings();
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();

    const vol = (soundVolume / 100) * 0.15;
    const t0 = ctx.currentTime;

    for (const [freq, offset] of [[523, 0], [659, 0.1], [784, 0.2]] as const) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(vol, t0 + offset);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + offset + 0.12);
      osc.start(t0 + offset);
      osc.stop(t0 + offset + 0.13);
    }
  } catch {}
};
