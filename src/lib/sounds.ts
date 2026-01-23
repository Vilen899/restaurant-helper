// Small sound helpers (Web Audio API). Kept dependency-free.

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
  if (!Ctx) return null;
  if (!audioContext) audioContext = new Ctx();
  return audioContext;
};

/** Short, subtle beep for cashier cart add (must be called from user gesture). */
export const playCartAddSound = async () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      // Some browsers require resume inside a user gesture.
      await ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // very low volume to avoid being annoying in POS flow
    const t0 = ctx.currentTime;
    gainNode.gain.setValueAtTime(0.08, t0);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);

    oscillator.start(t0);
    oscillator.stop(t0 + 0.09);
  } catch {
    // ignore sound errors (blocked audio policy etc.)
  }
};
