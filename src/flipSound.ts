/**
 * The sound of a card flipping past: a short, soft paper flick made on the spot with the Web Audio
 * API (filtered noise with a quick fade), so there's no audio file to load. Browsers only allow
 * sound after a click or key press, which is always what flips a card.
 */
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let last = 0;

export function playFlip() {
  const now = performance.now();
  if (now - last < 45) return; // fast flipping stays a patter, not a buzz
  last = now;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    if (!noise) {
      noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.2), ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const flick = (at: number, loudness: number, from: number, to: number, length: number) => {
      const src = ctx!.createBufferSource();
      src.buffer = noise;
      const filter = ctx!.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 0.9;
      filter.frequency.setValueAtTime(from, at);
      filter.frequency.exponentialRampToValueAtTime(to, at + length);
      const gain = ctx!.createGain();
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(loudness, at + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
      src.connect(filter).connect(gain).connect(ctx!.destination);
      src.start(at, Math.random() * 0.1, length + 0.02);
    };
    const t = ctx.currentTime;
    flick(t, 0.32, 4200, 1500, 0.09); // the card lifting
    flick(t + 0.055, 0.16, 2600, 1100, 0.07); // and settling
  } catch {
    /* no audio available: flipping stays silent */
  }
}
