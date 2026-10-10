/**
 * audio.js — every sound is synthesised with WebAudio, so the game ships with
 * no audio files at all. The context is created lazily on the first gesture.
 */

let ctx = null;
let master = null;
let enabled = true;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'sine', gain = 0.2, delay = 0, glide = 0) {
  const c = ac();
  if (!c || !enabled) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * glide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(master);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

function noise(dur, gain = 0.12, freq = 1600, delay = 0) {
  const c = ac();
  if (!c || !enabled) return;
  const t0 = c.currentTime + delay;
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t0);
}

export const audio = {
  unlock() { ac(); },
  setEnabled(v) { enabled = !!v; },
  isEnabled() { return enabled; },

  place() { tone(880, 0.07, 'square', 0.09); noise(0.05, 0.05, 2600); },
  segment() { noise(0.16, 0.10, 1200); tone(420, 0.10, 'triangle', 0.06, 0, 1.5); },
  circle() { tone(300, 0.34, 'sine', 0.10, 0, 2.6); },
  sphere() { tone(180, 0.5, 'sine', 0.11, 0, 3.2); noise(0.3, 0.05, 700); },
  erase() { tone(240, 0.10, 'sawtooth', 0.07, 0, 0.5); },
  ui() { tone(1200, 0.035, 'square', 0.05); },

  solve() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(f, 0.5, 'triangle', 0.14, i * 0.09));
    noise(0.5, 0.05, 3000, 0.05);
  },
  star(i) { tone(700 + i * 260, 0.16, 'triangle', 0.12, 0.34 + i * 0.12); },
  achievement() {
    [659.25, 987.77, 1318.5].forEach((f, i) => tone(f, 0.3, 'sine', 0.12, i * 0.08));
  }
};
