// Tiny WebAudio synth: sound effects and looping chiptune tracks. No audio files.
let ctx = null, master = null, musicGain = null, sfxGain = null, noiseBuf = null;
export const audio = { sfx: true, music: true };
let track = null, step = 0, nextT = 0, timer = null;

export function unlock() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.32; musicGain.connect(master);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.8; sfxGain.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}
function tone(f0, f1, dur, type, vol, delay = 0, out = sfxGain) {
  if (!ctx) return;
  const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, fc, delay = 0, out = sfxGain) {
  if (!ctx) return;
  const t = ctx.currentTime + delay, s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = fc;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + dur + 0.02);
}
const FX = {
  jump: () => tone(300, 620, 0.12, 'square', 0.12),
  djump: () => tone(420, 900, 0.12, 'square', 0.12),
  swing: () => noise(0.07, 0.18, 2600),
  hit: () => { noise(0.08, 0.5, 1400); tone(190, 70, 0.09, 'square', 0.22); },
  heavy: () => { noise(0.16, 0.7, 900); tone(140, 40, 0.18, 'sawtooth', 0.3); },
  clang: () => { tone(900, 700, 0.12, 'square', 0.14); tone(1400, 1100, 0.1, 'triangle', 0.12); },
  hurt: () => { tone(260, 90, 0.2, 'sawtooth', 0.25); noise(0.1, 0.3, 800); },
  dash: () => noise(0.14, 0.25, 4200),
  coin: () => { tone(880, 880, 0.06, 'square', 0.12); tone(1320, 1320, 0.1, 'square', 0.12, 0.06); },
  pickup: () => { tone(520, 780, 0.08, 'triangle', 0.2); tone(780, 1040, 0.1, 'triangle', 0.2, 0.08); },
  power: () => { for (let i = 0; i < 4; i++) tone(440 * Math.pow(1.26, i), 440 * Math.pow(1.26, i), 0.09, 'square', 0.14, i * 0.07); },
  throw: () => tone(700, 300, 0.12, 'triangle', 0.2),
  special: () => { tone(200, 1200, 0.35, 'sawtooth', 0.22); noise(0.4, 0.4, 3000, 0.1); },
  boom: () => { noise(0.4, 0.9, 500); tone(110, 30, 0.4, 'sawtooth', 0.35); },
  crate: () => { noise(0.14, 0.5, 1800); tone(240, 120, 0.08, 'square', 0.12); },
  ko: () => { tone(500, 60, 0.45, 'square', 0.2); noise(0.3, 0.4, 700); },
  shoot: () => tone(1200, 500, 0.1, 'square', 0.1),
  warn: () => { tone(660, 660, 0.08, 'square', 0.1); tone(660, 660, 0.08, 'square', 0.1, 0.12); },
  ui: () => tone(660, 880, 0.05, 'square', 0.1),
  talk: () => tone(520 + Math.random() * 180, 480, 0.03, 'square', 0.05),
  devin: () => { tone(900, 1300, 0.06, 'triangle', 0.14); tone(1300, 1000, 0.07, 'triangle', 0.14, 0.07); },
  count: () => tone(520, 520, 0.12, 'square', 0.16),
  go: () => { tone(780, 780, 0.1, 'square', 0.16); tone(1040, 1040, 0.25, 'square', 0.16, 0.1); },
  flag: () => { for (let i = 0; i < 3; i++) tone([523, 659, 784][i], [523, 659, 784][i], 0.1, 'triangle', 0.2, i * 0.09); },
  win: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, f, 0.16, 'square', 0.16, i * 0.13)); },
  lose: () => { [392, 349, 311, 262].forEach((f, i) => tone(f, f, 0.25, 'triangle', 0.2, i * 0.22)); },
};
export function sfx(name) {
  if (!audio.sfx || !ctx || !FX[name]) return;
  FX[name]();
}

// ---- music: 16-step patterns, semitone offsets from A2/A3/A4 ('-' = rest)
const N = (s) => s.split(' ').map((v) => (v === '-' ? null : +v));
const TRACKS = {
  menu: { bpm: 104, lead: N('12 - 15 - 19 - 15 12 14 - 17 - 10 - 14 - 12 - 15 - 19 22 19 15 14 - 12 - 10 - - -'), bass: N('0 - 0 - 7 - 7 - 5 - 5 - 3 - 3 5'), hat: 2 },
  hall: { bpm: 132, lead: N('12 12 15 12 17 - 15 - 12 12 15 12 19 - 17 - 10 10 14 10 15 - 14 - 12 15 19 22 19 - - -'), bass: N('0 0 - 0 3 3 - 3 5 5 - 5 7 7 5 3'), hat: 1 },
  street: { bpm: 146, lead: N('7 - 10 12 - 10 7 - 5 - 7 10 - - 3 5 7 - 10 12 - 15 14 - 12 - 10 7 - - - -'), bass: N('0 - 0 0 - 0 3 - 5 - 5 5 - 5 7 3'), hat: 1 },
  boss: { bpm: 164, lead: N('12 13 12 - 8 - 7 - 12 13 12 - 15 - 13 - 12 13 12 - 8 - 7 5 3 - 5 - 7 8 12 -'), bass: N('0 0 0 0 1 1 1 1 0 0 0 0 5 5 3 3'), hat: 1 },
};
function schedule() {
  if (!ctx || !track) return;
  const t = TRACKS[track], sp = 60 / t.bpm / 2;
  while (nextT < ctx.currentTime + 0.25) {
    const d = Math.max(0, nextT - ctx.currentTime);
    const l = t.lead[step % t.lead.length], b = t.bass[step % t.bass.length];
    if (l !== null) tone(220 * Math.pow(2, l / 12), 220 * Math.pow(2, l / 12), sp * 0.9, 'square', 0.1, d, musicGain);
    if (b !== null) tone(55 * Math.pow(2, b / 12), 55 * Math.pow(2, b / 12), sp * 0.95, 'triangle', 0.3, d, musicGain);
    if (step % t.hat === 0) noise(0.03, step % 4 === 2 ? 0.22 : 0.08, step % 4 === 2 ? 1800 : 7000, d, musicGain);
    if (step % 8 === 0) tone(120, 40, 0.1, 'sine', 0.35, d, musicGain);
    nextT += sp; step++;
  }
}
export function music(name) {
  if (name === track) return;
  track = name; step = 0;
  if (ctx) nextT = ctx.currentTime + 0.05;
  if (!timer) timer = setInterval(() => { if (audio.music && track) { if (ctx && nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05; schedule(); } }, 80);
}
