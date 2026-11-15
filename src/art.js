// Every non-humanoid sprite, item, prop, tile and background layer. All art is generated in code, pixel by pixel.
import { Buf, OUT, cv, text, textW } from './gfx.js';

export const SPR = {};
export const TILE = 16;

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const spr = (frames, ax, ay) => ({ f: frames, ax, ay });
const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

// ---------------------------------------------------------------- enemies
function slime(sq, mood) {
  const b = new Buf(32, 28);
  const rx = 11 + sq, ry = 9 - sq, cy = 27 - ry;
  b.ell(16, cy, rx, ry, '#2dd4bf'); b.rect(16 - rx, cy, rx * 2 + 1, ry, '#2dd4bf');
  b.ell(16, cy + ry - 3, rx - 1, 3, '#0f9488'); b.rect(16 - rx + 1, 25, rx * 2 - 1, 2, '#0f766e');
  b.ell(12, cy - ry + 3, 3, 2, '#99f6e4'); b.set(10, cy - ry + 2, '#ffffff');
  // glitch slices
  b.rect(16 - rx - 2, cy + 1, 5, 2, '#f0abfc'); b.rect(16 + rx - 2, cy - 2, 5, 1, '#22d3ee'); b.rect(14, cy + 4, 6, 1, '#f0abfc');
  const ey = cy - 2;
  if (mood === 'x') { for (const ex of [10, 19]) { b.set(ex, ey, OUT); b.set(ex + 2, ey, OUT); b.set(ex + 1, ey + 1, OUT); b.set(ex, ey + 2, OUT); b.set(ex + 2, ey + 2, OUT); } }
  else { for (const ex of [10, 19]) { b.rect(ex, ey, 4, 4, mood === 'mad' ? '#fecaca' : '#ffffff'); b.rect(ex + 2, ey + 1, 2, 3, mood === 'mad' ? '#b91c1c' : OUT); } if (mood === 'mad') { b.rect(9, ey - 2, 4, 1, OUT); b.set(13, ey - 1, OUT); b.rect(20, ey - 2, 4, 1, OUT); b.set(19, ey - 1, OUT); } }
  b.rect(14, cy + 3, 5, 1, OUT);
  return b.outline().canvas();
}
function bot(fl, mood) {
  const b = new Buf(32, 34);
  b.rect(15, 1, 2, 6, '#64748b'); b.rect(14, 0, 4, 3, mood === 'mad' ? '#ef4444' : '#fbbf24'); if (mood === 'mad') b.set(15, 0, '#ffffff');
  b.rect(6, 7, 20, 15, '#475569'); b.rect(7, 6, 18, 1, '#475569'); b.rect(6, 7, 20, 2, '#64748b'); b.rect(6, 19, 20, 3, '#334155');
  b.rect(2, 11, 4, 7, '#334155'); b.rect(26, 11, 4, 7, '#334155'); b.rect(2, 11, 4, 1, '#64748b'); b.rect(26, 11, 4, 1, '#64748b');
  b.rect(9, 10, 14, 8, mood === 'mad' ? '#450a0a' : '#083344');
  if (mood === 'mad') { b.rect(15, 11, 2, 4, '#f87171'); b.rect(15, 16, 2, 1, '#f87171'); }
  else if (mood === 'x') { b.line(11, 11, 14, 16, '#67e8f9'); b.line(14, 11, 11, 16, '#67e8f9'); b.line(18, 11, 21, 16, '#67e8f9'); b.line(21, 11, 18, 16, '#67e8f9'); }
  else { b.rect(11, 12, 3, 3, '#67e8f9'); b.rect(18, 12, 3, 3, '#67e8f9'); b.rect(13, 16, 6, 1, '#67e8f9'); b.set(11, 12, '#ffffff'); b.set(18, 12, '#ffffff'); }
  b.rect(11, 22, 10, 3, '#1e293b'); b.rect(13, 25, 6, 2, '#94a3b8');
  b.rect(13, 27, 6, 2 + fl, '#fb923c'); b.rect(14, 27, 4, 1 + fl, '#fde047'); b.set(15 + fl, 30 + fl, '#fb923c');
  return b.outline().canvas();
}
function doner(o) {
  const b = new Buf(84, 94), by = o.bob || 0, m = new Buf(84, 94), a = new Buf(84, 94);
  // cart
  b.rect(16, 78, 52, 9, '#b91c1c'); b.rect(16, 78, 52, 2, '#ef4444'); b.rect(16, 85, 52, 2, '#7f1d1d'); b.rect(22, 81, 40, 2, '#fde68a');
  b.ell(26, 89, 4, 4, '#1f2937'); b.ell(58, 89, 4, 4, '#1f2937'); b.set(26, 89, '#9ca3af'); b.set(58, 89, '#9ca3af');
  b.rect(40, 6 + by, 3, 73, '#9ca3af'); b.rect(40, 6 + by, 1, 73, '#e5e7eb'); b.rect(30, 74, 24, 4, '#6b7280'); b.rect(30, 74, 24, 1, '#d1d5db');
  // meat cone
  const rnd = seeded(7);
  for (let y = 20; y <= 73; y++) {
    const hw = Math.round(21 - (y - 20) * 0.17);
    const band = Math.floor((y - 20) / 3) % 3, base = ['#9a5530', '#b06637', '#7c4223'][band];
    for (let x = -hw; x <= hw; x++) {
      let c = base;
      if (x < -hw + 3) c = '#d08a52'; else if (x > hw - 4) c = '#5c2f18';
      if (rnd() < 0.07) c = '#4a2412';
      if (o.spin && ((x + y * 3 + o.spin * 5) % 13 === 0 || (y % 6 === o.spin))) c = '#e0a56c';
      m.set(41 + x, y + by, c);
    }
  }
  m.ell(41, 18 + by, 20, 4, '#f3d9a4'); m.ell(41, 17 + by, 17, 2, '#fff1cf');
  m.ell(41, 11 + by, 7, 5, '#ef4444'); m.ell(39, 9 + by, 3, 2, '#fca5a5'); m.rect(40, 4 + by, 3, 3, '#16a34a');
  // crown
  m.rect(35, 2 + by, 13, 3, '#facc15'); m.rect(35, 0 + by, 2, 2, '#facc15'); m.rect(40, 0 + by, 3, 2, '#facc15'); m.rect(46, 0 + by, 2, 2, '#facc15');
  if (!o.spin) {
    const ey = 36 + by;
    if (o.eyes === 'x') { for (const ex of [30, 45]) { m.line(ex, ey, ex + 5, ey + 5, OUT); m.line(ex + 5, ey, ex, ey + 5, OUT); } m.rect(36, ey + 13, 12, 3, OUT); m.rect(40, ey + 15, 5, 4, '#fb7185'); }
    else {
      const ec = o.eyes === 'red' ? '#fecaca' : '#ffffff', pc = o.eyes === 'red' ? '#dc2626' : OUT;
      m.rect(29, ey, 8, 6, ec); m.rect(45, ey, 8, 6, ec); m.rect(32, ey + 2, 4, 4, pc); m.rect(46, ey + 2, 4, 4, pc);
      m.line(27, ey - 4, 37, ey - 1, OUT); m.line(27, ey - 3, 37, ey, OUT); m.line(55, ey - 4, 45, ey - 1, OUT); m.line(55, ey - 3, 45, ey, OUT);
      m.rect(33, ey + 12, 17, 5, OUT); for (let i = 0; i < 4; i++) m.rect(34 + i * 4, ey + 12, 3, 2, '#fffbe6'); m.rect(36, ey + 15, 11, 1, '#b91c1c');
    }
  }
  // arms
  if (o.arms !== 'none') {
    const kx = o.arms === 'raise' ? 6 : 10, ky = o.arms === 'raise' ? 30 : 46 + by;
    a.seg(22, 46 + by, kx, ky, 2.2, '#7c4223', '#9a5530', '#5c2f18');
    if (o.arms === 'raise') { a.rect(0, 8, 4, 24, '#e5e7eb'); a.rect(3, 8, 1, 24, '#9ca3af'); a.rect(1, 6, 2, 2, '#e5e7eb'); a.rect(-1, 30, 7, 3, '#451a03'); }
    else { a.rect(4, 18 + by, 4, 26, '#e5e7eb'); a.rect(7, 18 + by, 1, 26, '#9ca3af'); a.rect(5, 16 + by, 2, 2, '#e5e7eb'); a.rect(3, 44 + by, 7, 3, '#451a03'); }
    const hx = o.arms === 'throw' ? 72 : 66, hy = o.arms === 'throw' ? 26 : 48 + by;
    a.seg(60, 46 + by, hx, hy, 2.2, '#7c4223', '#9a5530', '#5c2f18');
    if (o.arms === 'throw') { a.rect(69, 17, 7, 9, '#f8fafc'); a.rect(69, 20, 7, 2, '#38bdf8'); a.rect(69, 16, 7, 2, '#e2e8f0'); }
    if (o.shield) { a.ell(70, 48 + by, 9, 15, '#f1d9a7'); a.ell(69, 46 + by, 6, 11, '#f8e8c4'); for (const [sx, sy] of [[67, 40], [72, 46], [66, 52], [71, 56], [74, 40]]) a.rect(sx, sy + by, 2, 2, '#c08a4a'); }
  }
  const out = new Buf(84, 94);
  out.blit(b.outline()); out.blit(m.outline()); out.blit(a.outline());
  return out.canvas();
}


// ---------------------------------------------------------------- chapter 3-5 sprites: bounce pad, hazards, Spam Mage
function mage(o) {
  const b = new Buf(64, 82), by = o.bob || 0, poet = o.poet;
  const rb = poet ? '#0e7490' : '#6d28d9', rl = poet ? '#22d3ee' : '#8b5cf6', rd = poet ? '#164e63' : '#4c1d95', ac = poet ? '#f0abfc' : '#fde68a';
  for (let y = 30; y <= 74; y++) { // robe widens towards a ragged hem
    const hw = 8 + Math.round((y - 30) * 0.32), tear = y > 68 ? ((y * 7) % 5 < 2 ? 3 : 0) : 0;
    b.rect(32 - hw, y + by, hw * 2 + 1, 1, rb); b.set(32 - hw, y + by, rl); b.rect(32 + hw - 2, y + by, 3, 1, rd);
    if (tear) b.rect(32 - hw, y + by, hw * 2 + 1, 1, null);
  }
  b.rect(22, 54 + by, 21, 2, ac); // sash
  for (const [x, y] of [[16, 70], [26, 77], [38, 74], [47, 70]]) { b.rect(x, y + by, 7, 5, '#f8fafc'); b.line(x, y + by, x + 3, y + 3 + by, '#94a3b8'); b.line(x + 6, y + by, x + 3, y + 3 + by, '#94a3b8'); } // dissolving into mail
  for (let y = 0; y < 22; y++) { const hw = Math.max(1, Math.round((y + 3) * 0.55)); b.rect(32 - hw + (y < 8 ? Math.round((8 - y) * 0.5) : 0), y + 4 + by, hw * 2, 1, y % 7 === 6 ? ac : rb); } // pointed hat
  b.rect(19, 22 + by, 26, 4, rd); b.rect(19, 22 + by, 26, 1, rl); b.rect(30, 22 + by, 4, 4, ac);
  b.rect(21, 24 + by, 22, 16, '#f8fafc'); b.rect(21, 24 + by, 22, 1, '#ffffff'); b.rect(21, 38 + by, 22, 2, '#cbd5e1'); // envelope face
  b.line(22, 25 + by, 32, 33 + by, '#94a3b8'); b.line(42, 25 + by, 32, 33 + by, '#94a3b8'); b.rect(31, 32 + by, 3, 3, '#ef4444');
  if (o.mood === 'x') { for (const ex of [25, 37]) { b.line(ex, 35 + by, ex + 3, 38 + by, OUT); b.line(ex + 3, 35 + by, ex, 38 + by, OUT); } }
  else for (const ex of [25, 37]) { b.rect(ex, 35 + by, 4, 3, o.mood === 'mad' ? '#fecaca' : '#ffffff'); b.rect(ex + 1, 35 + by, 2, 3, o.mood === 'mad' ? '#b91c1c' : OUT); }
  const hy = o.raise ? 14 : 48;
  for (const hx of [8, 56]) { b.ell(hx, hy + by, 4, 4, '#f8fafc'); b.set(hx - 1, hy - 1 + by, '#e2e8f0'); b.rect(hx - 3, hy + 4 + by, 7, 1, rd); if (o.raise) { b.rect(hx - 4, hy - 9 + by, 9, 6, '#f8fafc'); b.line(hx - 4, hy - 9 + by, hx, hy - 6 + by, '#94a3b8'); b.line(hx + 4, hy - 9 + by, hx, hy - 6 + by, '#94a3b8'); } }
  return b.outline().canvas();
}
function pad(f) {
  const h = [10, 5, 13][f], b = new Buf(22, 16);
  b.rect(1, 13, 20, 3, '#334155'); b.rect(1, 13, 20, 1, '#64748b');
  for (let y = 16 - 3 - h + 3; y < 13; y += 2) { b.rect(5, y, 12, 1, '#94a3b8'); b.rect(7, y + 1, 8, 1, '#475569'); }
  const ty = 13 - h + 1;
  b.rect(1, ty, 20, 4, '#ef4444'); b.rect(1, ty, 20, 1, '#fca5a5'); b.rect(1, ty + 3, 20, 1, '#991b1b');
  b.rect(8, ty + 1, 6, 1, '#fff7ed'); b.rect(10, ty, 2, 1, '#fff7ed');
  return b.outline().canvas();
}
function glassWin(txt, w = 28, h = 20) {
  return small(w, h, (b) => { b.rect(0, 0, w, h, '#e2e8f0'); b.rect(0, 0, w, 5, '#1d4ed8'); b.rect(w - 5, 1, 3, 3, '#ef4444'); b.rect(1, 5, w - 2, h - 6, '#f8fafc'); b.rect(3, 8, 8, 8, '#ef4444'); b.line(4, 9, 9, 14, '#ffffff'); b.line(9, 9, 4, 14, '#ffffff'); for (let i = 0; i < 2; i++) b.rect(13, 9 + i * 4, w - 17 - i * 3, 1, '#64748b'); });
}
function bigHand(f) {
  const b = new Buf(48, 60);
  b.rect(14, 0, 20, 16, '#14532d'); b.rect(14, 0, 20, 2, '#1f7a43'); // sleeve
  b.rect(8, 16, 32, 22, '#4ade80'); b.rect(8, 16, 32, 3, '#86efac'); b.rect(32, 19, 8, 19, '#2fb866');
  for (let i = 0; i < 4; i++) { b.rect(9 + i * 8, 36, 7, 18 + (i % 2) * 2 - f, '#4ade80'); b.rect(9 + i * 8, 36, 2, 18, '#86efac'); b.rect(14 + i * 8, 36, 1, 18, '#1c7a45'); b.rect(9 + i * 8, 52 + (i % 2) * 2 - f, 7, 2, '#a3e635'); }
  b.rect(10, 22, 8, 1, '#1c7a45'); b.rect(26, 26, 7, 1, '#1c7a45'); b.set(20, 28, '#f43f5e'); b.set(21, 28, '#f43f5e');
  return b.outline().canvas();
}
function buildExtra() {
  SPR.pad = spr([0, 1, 2].map(pad), 11, 15);
  SPR.cup = spr([0, 1].map((f) => small(11, 13, (b) => { b.rect(1, 4, 8, 8, '#f8fafc'); b.rect(1, 4, 8, 2, '#e2e8f0'); b.rect(2, 7, 6, 3, '#92400e'); b.rect(9, 6, 2, 4, '#e2e8f0'); b.rect(0, 11, 10, 2, '#cbd5e1'); b.rect(3 + f, 0, 1, 3, '#cbd5e1'); b.rect(6 - f, 1, 1, 2, '#cbd5e1'); })), 5, 12);
  SPR.errwin = spr([glassWin()], 14, 20);
  SPR.hand = spr([0, 1].map(bigHand), 24, 59);
  SPR.tblock = spr(['RE:', 'FWD', 'TIKLA', 'SPAM'].map((t, i) => small(30, 16, (b) => { const c = ['#22d3ee', '#f0abfc', '#fde68a', '#a3e635'][i]; b.rect(0, 0, 30, 16, '#0f172a'); b.rect(1, 1, 28, 14, c); b.rect(1, 1, 28, 2, '#ffffff'); b.rect(2, 12, 26, 2, '#00000030'); b.rect(14 - t.length * 2, 5, t.length * 4 - 1, 6, '#0f172a'); for (let k = 0; k < t.length; k++) b.rect(15 - t.length * 2 + k * 4, 6, 2, 4, c); }, true)), 15, 15);
  SPR.spam = { idle: spr([mage({}), mage({ bob: 1 })], 32, 81), tele: spr([mage({ mood: 'mad', raise: 1 }), mage({ mood: 'mad', raise: 1, bob: 1 })], 32, 81), hit: spr([mage({ mood: 'x' })], 32, 81) };
  SPR.poet = { idle: spr([mage({ poet: 1 }), mage({ poet: 1, bob: 1 })], 32, 81), tele: spr([mage({ poet: 1, mood: 'mad', raise: 1 }), mage({ poet: 1, mood: 'mad', raise: 1, bob: 1 })], 32, 81), hit: spr([mage({ poet: 1, mood: 'x' })], 32, 81) };
}

// ---------------------------------------------------------------- Devin (the original fez-wearing hedgehog mascot model, kept as is)
const QUILLS = (() => {
  const r = [];
  for (let deg = -205; deg <= 25; deg += 23) {
    const a = (deg * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
    for (const [rad, s] of [[10, 5], [13, 4], [15.5, 3], [17.5, 2]]) r.push({ x: Math.round(dx * rad - s / 2), y: Math.round(-14 + dy * rad * 1.05 - s / 2), s });
  }
  return r;
})();
const BODY = [[-26, 4], [-25, 6], [-24, 7], [-23, 8], [-22, 8], [-21, 9], [-20, 9], [-19, 9], [-18, 9], [-17, 10], [-16, 10], [-15, 10], [-14, 10], [-13, 10], [-12, 10], [-11, 10], [-10, 10], [-9, 10], [-8, 10], [-7, 9], [-6, 9], [-5, 8], [-4, 7], [-3, 5]];
const KIRPI = { primary: '#B07A4F', shade: '#8A5A36', light: '#D9A877', dark: '#4A2E1A', quill: '#5C3A21', trim: '#F5DEB3' };
function devin(blink, tas) {
  const [c, g] = cv(48, 40);
  g.translate(24, 38);
  const K = KIRPI, r = (x, y, w, h, col) => R(g, x, y, w, h, col);
  for (const q of QUILLS) r(q.x - 1, q.y - 1, q.s + 2, q.s + 2, '#140A10');
  for (const q of QUILLS) r(q.x, q.y, q.s, q.s, K.quill);
  for (const q of QUILLS) if (q.s <= 3) r(q.x, q.y, 1, 1, K.light);
  for (const e of [{ x: -10, y: -27, s: 5 }, { x: 5, y: -27, s: 5 }]) { r(e.x - 1, e.y - 1, e.s + 2, e.s + 2, K.dark); r(e.x, e.y, e.s, e.s, K.primary); r(e.x + 1, e.y + 1, e.s - 2, e.s - 2, '#F0A8A0'); }
  r(-4, -27, 8, 1, K.dark);
  for (const [ry, hw] of BODY) r(-hw - 1, ry, (hw + 1) * 2, 1, K.dark);
  r(-5, -2, 10, 1, K.dark);
  for (const [ry, hw] of BODY) r(-hw, ry, hw * 2, 1, K.primary);
  r(-6, -15, 12, 10, K.trim); r(-8, -5, 16, 2, K.shade); r(5, -16, 5, 10, K.shade); r(-6, -24, 5, 2, K.light); r(-8, -22, 3, 4, K.light);
  r(-10, -10, 20, 4, K.shade); r(-10, -9, 20, 2, '#FFD54F'); r(1, -10, 3, 4, '#FFD54F');
  for (const ex of [-3, 4]) { if (blink) r(ex, -18, 3, 1, '#0F172A'); else { r(ex, -20, 3, 4, '#FFFFFF'); r(ex + 1, -19, 2, 3, '#0F172A'); r(ex + 1, -19, 1, 1, '#FFFFFF'); } }
  r(-1, -15, 3, 2, '#3B1F10'); r(-5, -13, 4, 1, '#2A1A0E'); r(2, -13, 4, 1, '#2A1A0E'); r(-6, -12, 2, 1, '#2A1A0E'); r(5, -12, 2, 1, '#2A1A0E');
  r(-4, -33, 9, 7, '#14101C'); r(-3, -32, 7, 6, '#C81E32'); r(-3, -27, 7, 1, '#7A1120'); r(1, -34, 1, 1, '#14101C'); r(2 + tas, -33, 2, 4, '#FFD54F');
  r(-11, -21, 2, 5, '#0F172A'); r(-11, -16, 5, 1, '#0F172A');
  return c;
}

// ---------------------------------------------------------------- items, projectiles
function small(w, h, fn, noOutline) {
  const b = new Buf(w, h);
  fn(b);
  return (noOutline ? b : b.outline()).canvas();
}
function buildItems() {
  SPR.cay = spr([0, 1].map((f) => small(13, 16, (b) => {
    b.rect(2, 13, 9, 2, '#e2e8f0'); b.rect(3, 14, 7, 1, '#94a3b8');
    b.rect(4, 5, 5, 8, '#b4231f'); b.rect(5, 8, 3, 2, '#b4231f'); b.rect(4, 5, 5, 2, '#e2553a'); b.set(4, 9, null); b.set(8, 9, null); b.set(4, 8, null); b.set(8, 8, null);
    b.rect(4, 4, 5, 1, '#fde68a'); b.set(5, 6, '#fca5a5'); b.rect(5 + f, 1, 1, 2, '#e2e8f0'); b.rect(7 - f, 0, 1, 2, '#e2e8f0');
  })), 6, 15);
  SPR.doneri = spr([small(18, 12, (b) => {
    b.seg(3, 8, 13, 4, 3, '#f1d9a7', '#fbe9c6', '#d9b77a'); b.rect(12, 1, 4, 5, '#9a5530'); b.set(13, 1, '#ef4444'); b.set(15, 3, '#16a34a'); b.set(14, 2, '#f3d9a4');
    b.seg(2, 9, 7, 7, 3, '#f8fafc', '#ffffff', '#cbd5e1'); b.set(4, 8, '#ef4444'); b.set(6, 7, '#ef4444');
  })], 9, 11);
  SPR.simit = spr([small(13, 13, (b) => {
    b.ell(6, 6, 5.5, 5.5, '#b45309'); b.ell(6, 6, 2, 2, null); b.rect(5, 5, 3, 3, null);
    for (const [x, y] of [[2, 4], [4, 2], [8, 2], [10, 5], [9, 9], [5, 10], [2, 8], [6, 1]]) b.set(x, y, '#fde68a');
    b.set(3, 3, '#d97706'); b.set(4, 3, '#d97706');
  })], 6, 12);
  SPR.sticker = spr([10, 7, 3, 7].map((w) => small(12, 12, (b) => {
    b.ell(5.5, 5.5, w / 2, 5, '#ec3750'); if (w > 5) { b.ell(5.5, 5.5, w / 2 - 1.5, 3.2, '#ff8c37'); b.rect(5, 3, 2, 5, '#fff7ed'); b.rect(3, 5, 6, 1, '#fff7ed'); } else b.rect(5, 2, 1, 7, '#ff8c37');
  })), 6, 11);
  SPR.rozet = spr([small(14, 17, (b) => {
    b.rect(3, 8, 3, 8, '#2563eb'); b.rect(8, 8, 3, 8, '#1d4ed8'); b.set(4, 15, null); b.set(9, 15, null);
    b.ell(6.5, 5.5, 5.5, 5.5, '#facc15'); b.ell(6.5, 5.5, 3.5, 3.5, '#fde68a'); b.rect(6, 3, 2, 5, '#b45309'); b.rect(5, 5, 4, 1, '#b45309');
  })], 7, 16);
  SPR.heart = spr([small(9, 8, (b) => { b.rect(1, 1, 3, 3, '#ef4444'); b.rect(5, 1, 3, 3, '#ef4444'); b.rect(1, 3, 7, 2, '#ef4444'); b.rect(2, 5, 5, 1, '#dc2626'); b.rect(3, 6, 3, 1, '#dc2626'); b.set(4, 7, '#b91c1c'); b.set(2, 2, '#fecaca'); })], 4, 4);
  SPR.crate = spr([small(22, 21, (b) => {
    b.rect(1, 1, 20, 19, '#b7793e'); b.rect(1, 1, 20, 2, '#d99a57'); b.rect(1, 17, 20, 3, '#8a5526'); b.rect(1, 1, 2, 19, '#8a5526'); b.rect(19, 1, 2, 19, '#8a5526');
    b.rect(3, 9, 16, 3, '#ec3750'); b.rect(9, 3, 3, 14, '#f8e8c4'); b.rect(5, 5, 3, 1, '#8a5526'); b.rect(13, 14, 4, 1, '#8a5526');
  })], 11, 20);
  SPR.flag = spr([0, 1, 2].map((f) => small(22, 34, (b) => {
    b.rect(3, 2, 2, 31, '#94a3b8'); b.rect(3, 2, 1, 31, '#e2e8f0'); b.rect(1, 31, 6, 2, '#475569'); b.rect(2, 0, 4, 3, '#facc15');
    const col = f === 0 ? '#64748b' : '#ec3750', hi = f === 0 ? '#94a3b8' : '#ff8c37';
    for (let x = 0; x < 14; x++) { const o = f === 2 ? Math.round(Math.sin(x * 0.7) * 1.4) : f === 1 ? Math.round(Math.cos(x * 0.7) * 1.4) : 0; b.rect(5 + x, 4 + o, 1, 10, col); b.set(5 + x, 4 + o, hi); }
    if (f > 0) { b.rect(9, 7, 1, 5, '#fff7ed'); b.rect(12, 7, 1, 5, '#fff7ed'); b.rect(10, 9, 2, 1, '#fff7ed'); }
  })), 4, 33);
  SPR.topac = spr([0, 1, 2].map((f) => small(14, 16, (b) => {
    b.rect(6, 0, 2, 3, '#a16207');
    for (let y = 3; y < 13; y++) { const hw = y < 6 ? y - 1 : Math.max(1, Math.round((13 - y) * 0.75) + 1); b.rect(7 - hw, y, hw * 2, 1, y % 4 < 2 ? '#dc2626' : '#facc15'); b.set(7 - hw + ((f * 2 + y) % (hw * 2)), y, '#fff7ed'); }
    b.rect(6, 13, 2, 2, '#9ca3af');
  })), 7, 15);
  SPR.sapan = spr([small(13, 15, (b) => {
    b.seg(6, 14, 6, 8, 1.2, '#a16207', '#ca8a04', '#713f12'); b.seg(6, 8, 2, 2, 1.1, '#a16207', '#ca8a04', '#713f12'); b.seg(6, 8, 10, 2, 1.1, '#a16207', '#ca8a04', '#713f12');
    b.line(2, 2, 6, 5, '#ef4444'); b.line(10, 2, 6, 5, '#ef4444'); b.rect(5, 5, 3, 2, '#44403c');
  })], 6, 14);
  SPR.klavye = spr([small(22, 10, (b) => {
    b.rect(1, 2, 20, 7, '#334155'); b.rect(1, 2, 20, 1, '#64748b'); b.rect(1, 8, 20, 1, '#1e293b');
    for (let i = 0; i < 6; i++) { b.rect(2 + i * 3, 3, 2, 2, i === 2 ? '#22d3ee' : '#e2e8f0'); b.rect(3 + i * 3, 6, 2, 1, i === 4 ? '#ec3750' : '#cbd5e1'); }
  })], 11, 9);
  SPR.pebble = spr([small(6, 6, (b) => { b.ell(2.5, 2.5, 2, 2, '#cbd5e1'); b.set(2, 2, '#ffffff'); })], 3, 3);
  SPR.env = spr([0, 1].map((f) => small(15, 11, (b) => {
    b.rect(1, 1, 13, 9, '#f8fafc'); b.rect(1, 8, 13, 2, '#cbd5e1'); b.line(1, 1, 7, 6, '#94a3b8'); b.line(13, 1, 7, 6, '#94a3b8'); b.rect(6, 4 + f, 3, 3, '#ef4444');
  })), 7, 5);
  SPR.clock = spr([0, 1].map((f) => small(16, 17, (b) => {
    b.ell(4, 3, 2.5, 2, '#facc15'); b.ell(11, 3, 2.5, 2, '#facc15'); b.rect(7, 1 - f, 2, 2, '#94a3b8');
    b.ell(7.5, 9, 6, 6, '#ef4444'); b.ell(7.5, 9, 4, 4, '#fffbe6'); b.rect(7, 6, 1, 4, OUT); b.rect(7, 9, 3 - f, 1, OUT); b.rect(3, 15, 2, 1, '#7f1d1d'); b.rect(11, 15, 2, 1, '#7f1d1d');
  })), 8, 16);
  SPR.ayran = spr([small(11, 14, (b) => { b.rect(2, 3, 7, 10, '#f8fafc'); b.rect(3, 12, 5, 1, '#cbd5e1'); b.rect(2, 6, 7, 3, '#38bdf8'); b.rect(1, 2, 9, 2, '#e2e8f0'); b.ell(5, 1.5, 3, 1.5, '#ffffff'); })], 5, 13);
  SPR.meat = spr([small(10, 9, (b) => { b.ell(4.5, 4, 4, 3.5, '#9a5530'); b.rect(2, 2, 3, 1, '#d08a52'); b.set(6, 5, '#4a2412'); b.set(4, 6, '#4a2412'); })], 5, 8);
  SPR.wave = spr([0, 1].map((f) => small(22, 44, (b) => {
    for (let i = -20; i <= 20; i++) { const x = 16 - (i * i) / 30; b.rect(x - 4 - f, 22 + i, 3, 1, '#22d3ee'); b.rect(x - 1, 22 + i, 3, 1, '#a5f3fc'); b.set(x + 2, 22 + i, '#ffffff'); if ((i + f) % 5 === 0) b.rect(x - 9, 22 + i, 3, 1, '#0ea5e9'); }
    for (const [x, y] of [[4, 8], [2, 22], [5, 36]]) { b.rect(x, y + f * 2, 3, 2, '#e0f2fe'); }
  }, true)), 11, 40);
  SPR.shock = spr([0, 1].map((f) => small(16, 16, (b) => { b.ell(8, 11 - f, 6, 4 + f, '#fde68a'); b.ell(8, 12 - f, 4, 3, '#fb923c'); b.rect(3, 14, 10, 2, '#fff7ed'); }, true)), 8, 15);
  SPR.cat = spr([0, 1].map((f) => small(18, 14, (b) => {
    b.ell(8, 9, 6, 4, '#f59e0b'); b.rect(3, 10, 11, 3, '#f59e0b'); b.ell(13, 6, 3.5, 3, '#f59e0b'); b.rect(11, 2, 2, 2, '#f59e0b'); b.rect(15, 2, 2, 2, '#f59e0b');
    b.set(12, 6, OUT); b.set(15, 6, OUT); b.set(14, 7, '#fda4af'); b.rect(5, 8, 2, 4, '#d97706'); b.rect(9, 8, 2, 4, '#d97706');
    b.line(2, 9, 0, 5 - f * 2, '#f59e0b'); b.set(0, 4 - f * 2, '#fff7ed');
  })), 9, 13);
}
function buildEnemies() {
  SPR.slime = { idle: spr([slime(0), slime(1)], 16, 27), hop: spr([slime(-2)], 16, 27), tele: spr([slime(2, 'mad'), slime(1, 'mad')], 16, 27), hit: spr([slime(1, 'x')], 16, 27) };
  SPR.bot = { idle: spr([bot(0), bot(1)], 16, 30), tele: spr([bot(0, 'mad'), bot(1, 'mad')], 16, 30), hit: spr([bot(0, 'x')], 16, 30) };
  const D = {};
  for (const sh of [0, 1]) {
    const s = !!sh, k = (n) => n + (s ? 'S' : '');
    D[k('idle')] = spr([doner({ shield: s }), doner({ shield: s, bob: 1 })], 42, 93);
    D[k('tele')] = spr([doner({ shield: s, eyes: 'red', arms: 'raise' }), doner({ shield: s, eyes: 'red', arms: 'raise', bob: 1 })], 42, 93);
    D[k('throw')] = spr([doner({ shield: s, arms: 'throw' })], 42, 93);
    D[k('dizzy')] = spr([doner({ shield: s, eyes: 'x' }), doner({ shield: s, eyes: 'x', bob: 1 })], 42, 93);
  }
  D.spin = spr([doner({ spin: 1, arms: 'none' }), doner({ spin: 2, arms: 'none' }), doner({ spin: 3, arms: 'none' })], 42, 93);
  SPR.doner = D;
  SPR.devin = spr([devin(false, 0), devin(false, 1), devin(false, -1), devin(true, 0)], 24, 38);
}

// ---------------------------------------------------------------- tiles
function tileCanvas(fn) {
  const [c, g] = cv(TILE, TILE);
  fn(g);
  return c;
}
function buildTiles() {
  const T = {};
  // interior: polished event-hall floor
  T.inTop = tileCanvas((g) => { R(g, 0, 0, 16, 16, '#8a6a4a'); R(g, 0, 0, 16, 2, '#e9c98f'); R(g, 0, 2, 16, 2, '#c79a5e'); R(g, 0, 4, 16, 1, '#5c4330'); R(g, 7, 5, 1, 11, '#6f553b'); R(g, 0, 10, 16, 1, '#6f553b'); R(g, 2, 0, 3, 1, '#fff3d1'); });
  T.inFill = tileCanvas((g) => { R(g, 0, 0, 16, 16, '#5c4330'); R(g, 0, 7, 16, 1, '#4a3526'); R(g, 4, 0, 1, 7, '#4a3526'); R(g, 11, 8, 1, 8, '#4a3526'); });
  const paveSet = (k, c) => {
    T[k + 'Top'] = tileCanvas((g) => { R(g, 0, 0, 16, 16, c.bg); R(g, 0, 0, 16, 6, c.top); R(g, 0, 0, 16, 1, c.hi); R(g, 0, 6, 16, 1, c.line); R(g, 7, 1, 1, 5, c.seam); R(g, 15, 1, 1, 5, c.seam); R(g, 0, 3, 16, 1, c.mid); R(g, 3, 10, 4, 1, c.dk); R(g, 10, 13, 3, 1, c.dk); });
    T[k + 'Fill'] = tileCanvas((g) => { R(g, 0, 0, 16, 16, c.bg); R(g, 1, 4, 5, 1, c.dk); R(g, 9, 11, 4, 1, c.dk); R(g, 12, 3, 2, 1, c.seam); });
  };
  const grassSet = (k, c) => {
    T[k + 'Top'] = tileCanvas((g) => { R(g, 0, 0, 16, 16, c.soil); R(g, 0, 0, 16, 5, c.g); R(g, 0, 0, 16, 2, c.hi); R(g, 0, 5, 16, 1, c.dk); for (const x of [1, 5, 9, 13]) { R(g, x, 6, 2, 1, c.dk); R(g, x + 1, 0, 1, 1, c.bl); } R(g, 3, 10, 2, 1, c.m1); R(g, 10, 13, 3, 1, c.m1); R(g, 12, 8, 1, 1, c.m2); });
    T[k + 'Fill'] = tileCanvas((g) => { R(g, 0, 0, 16, 16, c.soil); R(g, 2, 3, 3, 1, c.m1); R(g, 9, 9, 3, 1, c.m1); R(g, 12, 2, 1, 1, c.m2); R(g, 5, 12, 2, 1, c.m2); });
  };
  grassSet('gr', { soil: '#7a5234', g: '#4caf50', hi: '#7ed957', dk: '#2e7d32', bl: '#b9f27c', m1: '#5d3b22', m2: '#9b6b45' }); // courtyard
  paveSet('st', { bg: '#3b3a52', top: '#8d8aa8', hi: '#c9c6e0', line: '#55536f', seam: '#6d6a8a', mid: '#7a7796', dk: '#2c2b40' }); // street
  paveSet('nt', { bg: '#232845', top: '#4a5078', hi: '#7c84b4', line: '#2f3558', seam: '#3a4068', mid: '#3f4570', dk: '#171a30' }); // night street
  grassSet('ng', { soil: '#2d2433', g: '#1f6b4a', hi: '#3ea76a', dk: '#134e3a', bl: '#7de2a3', m1: '#1b1524', m2: '#4a3a52' }); // night park
  paveSet('dv', { bg: '#5d4f6a', top: '#c4b5c8', hi: '#f1e4e6', line: '#8a7690', seam: '#a595ab', mid: '#b0a0b6', dk: '#473b52' }); // dawn street
  grassSet('dg', { soil: '#6b4e47', g: '#6fae5a', hi: '#a8d98a', dk: '#4a8040', bl: '#d6f2b0', m1: '#4a342f', m2: '#9a7468' }); // dawn park
  paveSet('av', { bg: '#8b8396', top: '#e4dccb', hi: '#fbf5e6', line: '#b3a994', seam: '#c9bfaa', mid: '#d3c9b4', dk: '#6f6878' }); // pale stone avenue
  paveSet('sg', { bg: '#14101f', top: '#3a2e52', hi: '#7c5ea8', line: '#241a38', seam: '#2c2146', mid: '#32284a', dk: '#0c0914' }); // stage floor
  // solid blocks
  T.box = tileCanvas((g) => { R(g, 0, 0, 16, 16, '#b7793e'); R(g, 0, 0, 16, 2, '#d99a57'); R(g, 0, 14, 16, 2, '#8a5526'); R(g, 0, 0, 1, 16, '#8a5526'); R(g, 15, 0, 1, 16, '#8a5526'); R(g, 2, 7, 12, 2, '#f8e8c4'); R(g, 6, 3, 4, 1, '#8a5526'); R(g, 5, 11, 6, 1, '#8a5526'); });
  T.brick = tileCanvas((g) => { R(g, 0, 0, 16, 16, '#6b4a5a'); R(g, 0, 0, 16, 1, '#9a7186'); R(g, 0, 7, 16, 1, '#3f2a36'); R(g, 0, 15, 16, 1, '#3f2a36'); R(g, 7, 0, 1, 7, '#3f2a36'); R(g, 3, 8, 1, 7, '#3f2a36'); R(g, 11, 8, 1, 7, '#3f2a36'); R(g, 1, 2, 3, 1, '#8a6176'); });
  // one-way platforms
  T.shelf = tileCanvas((g) => { R(g, 0, 0, 16, 5, '#a9744a'); R(g, 0, 0, 16, 1, '#e0b07a'); R(g, 0, 4, 16, 1, '#6e4426'); R(g, 0, 5, 16, 1, '#141021'); R(g, 3, 5, 2, 4, '#6e4426'); R(g, 11, 5, 2, 4, '#6e4426'); });
  T.awning = tileCanvas((g) => { for (let x = 0; x < 16; x += 4) { R(g, x, 0, 2, 6, '#ef4444'); R(g, x + 2, 0, 2, 6, '#fff7ed'); } R(g, 0, 0, 16, 1, '#fecaca'); R(g, 0, 6, 16, 1, '#141021'); for (let x = 0; x < 16; x += 4) R(g, x + 1, 7, 2, 1, '#b91c1c'); });
  T.branch = tileCanvas((g) => { R(g, 0, 1, 16, 4, '#7a4f2a'); R(g, 0, 1, 16, 1, '#a8733f'); R(g, 0, 5, 16, 1, '#141021'); R(g, 0, 0, 16, 1, '#4caf50'); for (const x of [1, 6, 11]) R(g, x, -1 + 1, 3, 1, '#7ed957'); });
  // glitch spikes (2 frames)
  T.spike = [0, 1].map((f) => tileCanvas((g) => { for (let i = 0; i < 4; i++) { const x = i * 4, h = 6 + ((i + f) % 2) * 3; R(g, x + 1, 16 - h, 2, h, i % 2 ? '#22d3ee' : '#f0abfc'); R(g, x, 16 - h + 3, 4, h - 3, i % 2 ? '#0e7490' : '#a21caf'); R(g, x + 1, 16 - h, 1, 1, '#ffffff'); } R(g, f ? 2 : 9, 5, 4, 1, '#f0abfc'); }));
  SPR.tiles = T;
}

// ---------------------------------------------------------------- props (drawn into the level backdrop)
function prop(w, h, fn) {
  const [c, g] = cv(w, h);
  fn(g);
  return c;
}
function laptop(g, x, y, col) { R(g, x, y, 12, 8, '#1e293b'); R(g, x + 1, y + 1, 10, 6, col); R(g, x + 2, y + 2, 5, 1, '#ffffff'); R(g, x + 2, y + 4, 7, 1, '#ffffff'); R(g, x - 2, y + 8, 16, 2, '#94a3b8'); }
function sign(w, label, col, bg = '#1a1630') {
  return prop(w, 16, (g) => { R(g, 0, 0, w, 16, '#0b0916'); R(g, 1, 1, w - 2, 14, bg); R(g, 1, 1, w - 2, 1, col); R(g, 1, 14, w - 2, 1, col); g.globalAlpha = 0.35; text(g, label, w / 2 + 1, 3, col, 1, 0.5); g.globalAlpha = 1; text(g, label, w / 2, 3, '#ffffff', 1, 0.5); text(g, label, w / 2, 3, col, 1, 0.5); g.globalAlpha = 0.55; text(g, label, w / 2, 3, '#ffffff', 1, 0.5); g.globalAlpha = 1; });
}
function buildProps() {
  const P = {};
  P.desk = prop(48, 30, (g) => { R(g, 0, 12, 48, 4, '#c79a5e'); R(g, 0, 12, 48, 1, '#e9c98f'); R(g, 0, 16, 48, 1, '#141021'); R(g, 3, 17, 3, 13, '#6e4426'); R(g, 42, 17, 3, 13, '#6e4426'); laptop(g, 6, 2, '#22d3ee'); laptop(g, 28, 2, '#a78bfa'); R(g, 22, 8, 3, 4, '#ef4444'); R(g, 21, 7, 5, 1, '#fecaca'); R(g, 14, 17, 1, 9, '#141021'); R(g, 14, 26, 8, 1, '#141021'); });
  P.reg = prop(72, 44, (g) => { R(g, 0, 20, 72, 24, '#ec3750'); R(g, 0, 20, 72, 2, '#ff8c37'); R(g, 0, 42, 72, 2, '#9f1239'); R(g, 0, 18, 72, 2, '#fff7ed'); text(g, 'KAYIT', 36, 26, '#fff7ed', 1, 0.5, '#9f1239'); R(g, 6, 10, 10, 8, '#f8fafc'); R(g, 7, 12, 8, 1, '#94a3b8'); R(g, 7, 14, 6, 1, '#94a3b8'); R(g, 50, 8, 14, 10, '#facc15'); R(g, 52, 10, 10, 2, '#ec3750'); R(g, 52, 13, 10, 1, '#b45309'); R(g, 26, 12, 4, 6, '#b4231f'); R(g, 32, 12, 4, 6, '#b4231f'); });
  P.banner = prop(120, 26, (g) => { R(g, 0, 0, 120, 22, '#ec3750'); R(g, 0, 0, 120, 2, '#ff8c37'); R(g, 0, 20, 120, 2, '#9f1239'); for (let x = 0; x < 120; x += 12) { R(g, x, 22, 6, 2, '#ec3750'); R(g, x + 2, 24, 2, 2, '#ec3750'); } text(g, 'HAVEN ANKARA', 60, 5, '#fff7ed', 1, 0.5, '#9f1239'); R(g, 4, 6, 8, 8, '#fff7ed'); R(g, 6, 8, 4, 4, '#ec3750'); R(g, 108, 6, 8, 8, '#fff7ed'); R(g, 110, 8, 4, 4, '#ec3750'); });
  P.poster = [['#22d3ee', 'SHIP'], ['#facc15', 'JAM'], ['#a78bfa', 'CODE']].map(([c, t]) => prop(26, 32, (g) => { R(g, 0, 0, 26, 32, '#141021'); R(g, 1, 1, 24, 30, '#1e1b4b'); R(g, 3, 3, 20, 12, c); R(g, 5, 6, 6, 6, '#141021'); R(g, 13, 5, 8, 2, '#141021'); R(g, 13, 9, 6, 2, '#141021'); text(g, t, 13, 18, c, 1, 0.5); R(g, 4, 28, 18, 1, '#64748b'); }));
  P.plant = prop(20, 34, (g) => { R(g, 5, 22, 10, 12, '#c2410c'); R(g, 4, 22, 12, 2, '#ea580c'); R(g, 6, 32, 8, 2, '#7c2d12'); for (const [x, y, w, h] of [[8, 2, 4, 20], [2, 8, 6, 5], [12, 6, 6, 5], [1, 15, 7, 4], [12, 14, 7, 4], [6, 0, 3, 5]]) { R(g, x, y, w, h, '#16a34a'); R(g, x, y, w, 1, '#4ade80'); } R(g, 9, 6, 1, 16, '#166534'); });
  P.bean = prop(30, 16, (g) => { R(g, 3, 4, 24, 12, '#7c3aed'); R(g, 1, 8, 28, 8, '#7c3aed'); R(g, 5, 2, 18, 3, '#7c3aed'); R(g, 6, 3, 12, 2, '#a78bfa'); R(g, 1, 14, 28, 2, '#5b21b6'); R(g, 12, 7, 8, 1, '#5b21b6'); });
  P.urn = prop(30, 40, (g) => { R(g, 0, 26, 30, 3, '#c79a5e'); R(g, 0, 26, 30, 1, '#e9c98f'); R(g, 3, 29, 3, 11, '#6e4426'); R(g, 24, 29, 3, 11, '#6e4426'); R(g, 9, 6, 10, 20, '#d4a017'); R(g, 9, 6, 3, 20, '#fde68a'); R(g, 16, 6, 3, 20, '#a16207'); R(g, 11, 2, 6, 4, '#a16207'); R(g, 13, 0, 2, 2, '#fde68a'); R(g, 19, 18, 4, 2, '#a16207'); R(g, 22, 20, 1, 3, '#a16207'); R(g, 2, 21, 4, 5, '#b4231f'); R(g, 2, 20, 4, 1, '#fde68a'); R(g, 23, 23, 5, 3, '#f8fafc'); });
  P.pizza = prop(22, 12, (g) => { for (let i = 0; i < 3; i++) { R(g, i, 8 - i * 4, 20, 4, '#e7d3b0'); R(g, i, 8 - i * 4, 20, 1, '#f8e8c4'); R(g, i, 11 - i * 4, 20, 1, '#a8895e'); R(g, 8 + i, 9 - i * 4, 5, 2, '#ef4444'); } });
  P.door = prop(40, 72, (g) => { R(g, 0, 0, 40, 72, '#3f2a36'); R(g, 3, 3, 34, 69, '#14532d'); R(g, 3, 3, 34, 2, '#22c55e'); R(g, 6, 8, 12, 26, '#bae6fd'); R(g, 22, 8, 12, 26, '#bae6fd'); R(g, 6, 8, 12, 2, '#e0f2fe'); R(g, 22, 8, 12, 2, '#e0f2fe'); R(g, 19, 3, 2, 69, '#0b3d1e'); R(g, 16, 40, 2, 6, '#facc15'); R(g, 22, 40, 2, 6, '#facc15'); text(g, 'ÇIKIŞ', 20, 50, '#bbf7d0', 1, 0.5); });
  P.lamp = prop(20, 84, (g) => { R(g, 9, 10, 2, 74, '#2c2b40'); R(g, 9, 10, 1, 74, '#55536f'); R(g, 6, 80, 8, 4, '#2c2b40'); R(g, 3, 4, 14, 3, '#2c2b40'); R(g, 5, 7, 10, 5, '#fde68a'); R(g, 6, 8, 8, 3, '#fffbe6'); R(g, 4, 2, 12, 2, '#55536f'); });
  P.tree = prop(64, 84, (g) => { R(g, 28, 40, 8, 44, '#6e4426'); R(g, 28, 40, 3, 44, '#a8733f'); R(g, 24, 80, 16, 4, '#5d3b22'); const blobs = [[32, 22, 26, 20], [14, 32, 14, 12], [50, 30, 14, 12], [30, 8, 16, 10]]; for (const [x, y, rx, ry] of blobs) { g.fillStyle = '#2e7d32'; for (let yy = -ry; yy <= ry; yy++) { const w = Math.round(rx * Math.sqrt(1 - (yy * yy) / (ry * ry))); g.fillRect(x - w, y + yy, w * 2, 1); } } for (const [x, y, rx, ry] of blobs) { g.fillStyle = '#4caf50'; for (let yy = -ry; yy <= 0; yy++) { const w = Math.round((rx - 4) * Math.sqrt(1 - (yy * yy) / (ry * ry))); g.fillRect(x - w - 2, y + yy - 1, w * 2, 1); } } for (const [x, y] of [[20, 14], [36, 6], [44, 22], [12, 28], [28, 20], [50, 26]]) { R(g, x, y, 4, 2, '#7ed957'); R(g, x + 1, y + 2, 2, 1, '#7ed957'); } });
  P.bench = prop(40, 20, (g) => { R(g, 2, 2, 36, 3, '#a9744a'); R(g, 2, 7, 36, 3, '#a9744a'); R(g, 0, 12, 40, 3, '#c79a5e'); R(g, 0, 12, 40, 1, '#e9c98f'); R(g, 4, 2, 2, 18, '#2c2b40'); R(g, 34, 2, 2, 18, '#2c2b40'); R(g, 2, 2, 36, 1, '#e0b07a'); });
  P.bin = prop(14, 20, (g) => { R(g, 1, 4, 12, 16, '#166534'); R(g, 1, 4, 3, 16, '#22c55e'); R(g, 0, 2, 14, 3, '#14532d'); R(g, 5, 9, 4, 4, '#bbf7d0'); R(g, 2, 18, 10, 2, '#0b3d1e'); });
  P.cart = prop(52, 52, (g) => { R(g, 4, 0, 44, 5, '#ef4444'); for (let x = 4; x < 48; x += 8) R(g, x, 0, 4, 5, '#fff7ed'); R(g, 6, 5, 2, 20, '#94a3b8'); R(g, 44, 5, 2, 20, '#94a3b8'); R(g, 4, 24, 44, 18, '#bae6fd'); R(g, 4, 24, 44, 2, '#e0f2fe'); R(g, 4, 40, 44, 4, '#1d4ed8'); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { g.fillStyle = '#b45309'; g.fillRect(9 + i * 10, 28 + j * 6, 6, 4); R(g, 11 + i * 10, 29 + j * 6, 2, 2, '#bae6fd'); R(g, 9 + i * 10, 28 + j * 6, 2, 1, '#fde68a'); } R(g, 8, 44, 3, 4, '#475569'); R(g, 40, 44, 3, 4, '#475569'); for (const x of [12, 40]) { g.fillStyle = '#1f2937'; g.fillRect(x - 4, 44, 8, 8); R(g, x - 1, 47, 2, 2, '#9ca3af'); } text(g, 'SİMİT', 26, 7, '#b91c1c', 1, 0.5); });
  P.stop = prop(34, 70, (g) => { R(g, 2, 0, 30, 4, '#1d4ed8'); R(g, 2, 0, 30, 1, '#60a5fa'); R(g, 3, 4, 2, 66, '#475569'); R(g, 29, 4, 2, 66, '#475569'); R(g, 5, 6, 24, 34, '#bae6fd'); g.globalAlpha = 0.45; R(g, 5, 6, 24, 34, '#1e1b4b'); g.globalAlpha = 1; R(g, 9, 10, 16, 12, '#f8fafc'); text(g, 'EGO', 17, 11, '#1d4ed8', 1, 0.5); R(g, 5, 52, 24, 3, '#c79a5e'); R(g, 5, 55, 24, 1, '#141021'); });
  P.metro = prop(18, 60, (g) => { R(g, 8, 16, 2, 44, '#475569'); R(g, 0, 0, 18, 16, '#dc2626'); R(g, 1, 1, 16, 14, '#ef4444'); text(g, 'M', 9, 3, '#ffffff', 1, 0.5); });
  P.signs = { doner: sign(46, 'DÖNER', '#fb923c'), cay: sign(30, 'ÇAY', '#f87171'), bufe: sign(36, 'BÜFE', '#22d3ee'), kizilay: sign(58, 'KIZILAY', '#f0abfc'), jam: sign(62, 'CODE JAM', '#a3e635') };
  P.bus = prop(150, 52, (g) => { R(g, 0, 6, 150, 38, '#1d4ed8'); R(g, 0, 6, 150, 3, '#60a5fa'); R(g, 0, 30, 150, 4, '#f8fafc'); R(g, 0, 40, 150, 4, '#1e3a8a'); for (let i = 0; i < 6; i++) { R(g, 6 + i * 22, 11, 18, 14, '#fde68a'); R(g, 6 + i * 22, 11, 18, 2, '#fffbe6'); R(g, 10 + i * 22, 17, 4, 8, '#1e1b4b'); } R(g, 136, 11, 12, 20, '#bae6fd'); R(g, 2, 2, 60, 5, '#0b0916'); text(g, '413 KIZILAY', 4, -1, '#fb923c'); for (const x of [26, 118]) { g.fillStyle = '#0b0916'; g.fillRect(x - 8, 38, 16, 14); R(g, x - 5, 41, 10, 8, '#374151'); R(g, x - 2, 44, 4, 2, '#9ca3af'); } text(g, 'EGO', 70, 32, '#1d4ed8'); R(g, 146, 34, 4, 3, '#fde68a'); });
  P.stage = prop(160, 60, (g) => { R(g, 0, 0, 160, 60, '#0b0916'); R(g, 4, 4, 152, 44, '#1e1b4b'); R(g, 4, 4, 152, 2, '#4c1d95'); text(g, 'SHOWCASE', 80, 12, '#f0abfc', 2, 0.5, '#4c1d95'); text(g, 'YAKINDA BURADA', 80, 36, '#a5b4fc', 1, 0.5); R(g, 0, 50, 160, 10, '#3f2a36'); R(g, 0, 50, 160, 2, '#6b4a5a'); });
  P.cafe = prop(56, 64, (g) => { for (let r = 0; r < 15; r++) { const hw = 6 + Math.round(r * 1.9); for (let x = 28 - hw; x < 28 + hw; x++) R(g, x, r, 1, 1, ((x >> 2) & 1) ? '#fff7ed' : '#f59e0b'); } R(g, 0, 14, 56, 1, '#b45309'); R(g, 27, 15, 2, 32, '#64748b'); R(g, 13, 44, 30, 3, '#c79a5e'); R(g, 13, 44, 30, 1, '#e9c98f'); R(g, 27, 47, 2, 14, '#6e4426'); R(g, 20, 60, 16, 2, '#475569'); R(g, 27, 40, 2, 4, '#fff7ed'); R(g, 27, 38, 2, 2, '#fde68a'); for (const x of [4, 44]) { R(g, x, 40, 2, 22, '#2c2b40'); R(g, x, 50, 8, 2, '#2c2b40'); R(g, x + (x < 20 ? 0 : 6), 40, 2, 10, '#2c2b40'); } g.globalAlpha = 0.18; R(g, 8, 36, 40, 26, '#fde68a'); g.globalAlpha = 1; });
  P.bookstall = prop(64, 52, (g) => { for (let x = 0; x < 64; x += 8) { R(g, x, 0, 4, 9, '#0f766e'); R(g, x + 4, 0, 4, 9, '#fff7ed'); } R(g, 0, 9, 64, 1, '#134e4a'); R(g, 3, 10, 2, 40, '#6e4426'); R(g, 59, 10, 2, 40, '#6e4426'); for (const y of [14, 28, 42]) { R(g, 3, y + 8, 58, 2, '#a9744a'); R(g, 3, y + 8, 58, 1, '#e0b07a'); } const cols = ['#ef4444', '#3b82f6', '#facc15', '#22c55e', '#a855f7', '#f97316', '#e2e8f0']; for (let r = 0; r < 3; r++) for (let x = 6, i = r; x < 56; i++) { const bw = 3 + ((i * 5) % 3), bh = 12 - ((i * 7) % 4); R(g, x, 14 + r * 14 + 8 - bh, bw, bh, cols[(i * 3 + r) % 7]); R(g, x, 14 + r * 14 + 8 - bh, bw, 1, '#ffffff60'); x += bw + 1; } R(g, 8, 49, 8, 3, '#141021'); R(g, 48, 49, 8, 3, '#141021'); text(g, 'KİTAP', 32, 12, '#134e4a', 1, 0.5); });
  P.recstall = prop(60, 46, (g) => { R(g, 2, 18, 56, 24, '#3f2a36'); R(g, 2, 18, 56, 2, '#6b4a5a'); for (let i = 0; i < 7; i++) { R(g, 5 + i * 7, 8 + (i % 2) * 2, 6, 14, '#141021'); R(g, 6 + i * 7, 12 + (i % 2) * 2, 4, 4, ['#ef4444', '#facc15', '#22d3ee', '#f0abfc'][i % 4]); R(g, 5 + i * 7, 8 + (i % 2) * 2, 6, 1, '#475569'); } R(g, 2, 42, 56, 2, '#1c1230'); R(g, 6, 44, 3, 2, '#141021'); R(g, 51, 44, 3, 2, '#141021'); R(g, 10, 0, 40, 7, '#0b0916'); R(g, 11, 1, 38, 5, '#1a1630'); text(g, 'PLAK', 30, -1, '#f0abfc', 1, 0.5); g.globalAlpha = 0.3; text(g, 'PLAK', 30, -1, '#ffffff', 1, 0.5); g.globalAlpha = 1; });
  P.swan = small(26, 24, (b) => { b.ell(12, 17, 9, 5, '#f8fafc'); b.rect(3, 15, 6, 3, '#f8fafc'); b.set(1, 14, '#f8fafc'); b.set(2, 13, '#f8fafc'); b.rect(8, 19, 10, 1, '#cbd5e1'); b.rect(15, 9, 3, 9, '#f8fafc'); b.rect(15, 5, 2, 5, '#f8fafc'); b.rect(15, 3, 5, 3, '#f8fafc'); b.rect(20, 4, 3, 2, '#fb923c'); b.set(18, 4, '#141021'); b.rect(7, 14, 5, 2, '#e2e8f0'); });
  P.reeds = prop(16, 30, (g) => { for (const [x, h] of [[3, 24], [7, 30], [11, 21]]) { R(g, x, 30 - h, 1, h, '#2f7f4e'); R(g, x - 1, 30 - h, 3, 7, '#7c4a2a'); R(g, x - 1, 30 - h, 3, 1, '#a8733f'); } });
  P.lampN = prop(40, 84, (g) => { g.globalAlpha = 0.14; for (let r = 18; r > 4; r -= 4) { g.fillStyle = '#fde68a'; g.beginPath(); g.arc(20, 10, r + 6, 0, 7); g.fill(); } g.globalAlpha = 1; g.drawImage(P.lamp, 10, 0); });
  const tr = (w, h, ph) => { const [c, g] = cv(w, h), b = new Buf(w, h); R(g, 0, 0, w, h, '#e30a17'); const cy = h / 2; b.ell(w * 0.36, cy, h * 0.27, h * 0.27, '#ffffff'); b.ell(w * 0.36 + h * 0.07, cy, h * 0.22, h * 0.22, '#e30a17'); const sx = Math.round(w * 0.55); for (const [dx, dy] of [[0, -2], [-1, -1], [0, -1], [1, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [-1, 2], [1, 2]]) b.set(sx + dx, cy + dy, '#ffffff'); g.drawImage(b.canvas(), 0, 0); const [o, og] = cv(w, h + 4); for (let x = 0; x < w; x++) og.drawImage(c, x, 0, 1, h, x, 2 + Math.round(Math.sin(x * 0.45 + ph) * 1.6), 1, h); R(og, 0, 2, w, 1, '#00000025'); return o; };
  P.flagpole = [0, 2.2].map((ph) => prop(40, 128, (g) => { R(g, 4, 6, 2, 122, '#cbd5e1'); R(g, 4, 6, 1, 122, '#ffffff'); R(g, 1, 126, 8, 2, '#64748b'); g.fillStyle = '#facc15'; g.fillRect(3, 2, 4, 4); g.drawImage(tr(30, 20, ph), 6, 8); }));
  P.speaker = prop(30, 52, (g) => { R(g, 0, 0, 30, 52, '#0b0916'); R(g, 1, 1, 28, 50, '#1b1830'); R(g, 1, 1, 28, 1, '#4b4570'); for (const cy of [14, 36]) { g.fillStyle = '#0b0916'; g.beginPath(); g.arc(15, cy, 9, 0, 7); g.fill(); g.fillStyle = '#2c2845'; g.beginPath(); g.arc(15, cy, 7, 0, 7); g.fill(); g.fillStyle = '#0b0916'; g.beginPath(); g.arc(15, cy, 3, 0, 7); g.fill(); } R(g, 11, 48, 8, 1, '#ec3750'); });
  P.bigscreen = prop(176, 100, (g) => { R(g, 0, 0, 176, 100, '#0b0916'); R(g, 4, 4, 168, 84, '#111033'); R(g, 4, 4, 168, 2, '#4c1d95'); R(g, 8, 8, 160, 76, '#1e1b4b'); for (let y = 8; y < 84; y += 4) R(g, 8, y, 160, 1, '#27246a'); text(g, 'HAVEN ANKARA', 88, 22, '#f0abfc', 2, 0.5, '#4c1d95'); text(g, 'DEMO GÜNÜ', 88, 46, '#a5f3fc', 1, 0.5); R(g, 78, 60, 20, 16, '#ec3750'); g.fillStyle = '#fff7ed'; g.beginPath(); g.moveTo(85, 63); g.lineTo(85, 73); g.lineTo(93, 68); g.fill(); R(g, 40, 90, 6, 10, '#2c2845'); R(g, 130, 90, 6, 10, '#2c2845'); });
  P.signs.kafe = sign(36, 'KAFE', '#fbbf24'); P.signs.kitap = sign(52, 'KİTABEVİ', '#a3e635'); P.signs.plak = sign(36, 'PLAK', '#f0abfc'); P.signs.tunali = sign(58, 'TUNALI', '#22d3ee'); P.signs.pasta = sign(46, 'PASTA', '#fb7185');
  SPR.props = P;
}

// ---------------------------------------------------------------- backgrounds (tileable parallax layers)
function skyline(seed, w, h, cols, lit, features) {
  const [c, g] = cv(w, h), r = seeded(seed);
  let x = 0;
  while (x < w) {
    const bw = 22 + Math.floor(r() * 26), bh = Math.floor(h * (0.35 + r() * 0.5));
    R(g, x, h - bh, bw, bh, cols[0]); R(g, x, h - bh, bw, 2, cols[1]); R(g, x + bw - 3, h - bh, 3, bh, cols[2]);
    if (r() < 0.5) { R(g, x + 4, h - bh - 5, 8, 5, cols[0]); R(g, x + 6, h - bh - 9, 1, 4, cols[2]); }
    if (r() < 0.3) { R(g, x + bw - 12, h - bh - 4, 6, 4, cols[2]); }
    for (let wy = h - bh + 6; wy < h - 6; wy += 8)
      for (let wx = x + 4; wx < x + bw - 6; wx += 7) { const q = r(); R(g, wx, wy, 4, 5, q < lit ? cols[3] : cols[2]); if (q < lit * 0.5) R(g, wx, wy, 4, 1, cols[4]); }
    x += bw + (r() < 0.25 ? 6 : 1);
  }
  if (features) features(g, w, h);
  return c;
}
function atakule(g, x, h, col, hi, glow) {
  R(g, x - 3, h - 150, 6, 150, col); R(g, x - 3, h - 150, 2, 150, hi);
  for (let i = 0; i < 9; i++) { const w = [6, 10, 14, 17, 18, 17, 14, 10, 6][i]; R(g, x - w, h - 172 + i * 3, w * 2, 3, i % 2 ? col : hi); }
  R(g, x - 15, h - 160, 30, 1, glow); R(g, x - 1, h - 196, 2, 24, col); R(g, x - 1, h - 198, 2, 2, '#ef4444');
}
const KIZILAY_SHOPS = [['doner', '#fb923c', '#7c2d12'], ['cay', '#f87171', '#7f1d1d'], ['bufe', '#22d3ee', '#155e75'], ['kizilay', '#f0abfc', '#701a75'], ['jam', '#a3e635', '#365314']];
const TUNALI_SHOPS = [['kafe', '#fbbf24', '#78350f'], ['kitap', '#a3e635', '#365314'], ['pasta', '#fb7185', '#881337'], ['plak', '#f0abfc', '#701a75'], ['tunali', '#22d3ee', '#155e75']];
function shopRow(w, h, shops = KIZILAY_SHOPS, walls = ['#4a3b63', '#5b4a3f', '#3d4a66', '#5a3f55']) {
  const [c, g] = cv(w, h), r = seeded(42);
  let x = 0, i = 0;
  while (x < w) {
    const sw = 96 + (i % 2) * 24, [key, col, dk] = shops[i % shops.length];
    const wall = walls[i % 4];
    R(g, x, 0, sw, h, wall); R(g, x, 0, 2, h, '#00000040'); R(g, x + sw - 2, 0, 2, h, '#00000040');
    // upper floor windows + balcony
    for (let wx = x + 10; wx < x + sw - 22; wx += 26) { const on = r() < 0.6; R(g, wx, 10, 16, 20, '#141021'); R(g, wx + 1, 11, 14, 18, on ? '#fde68a' : '#2b2a45'); if (on) { R(g, wx + 1, 11, 14, 3, '#fffbe6'); R(g, wx + 5, 18, 4, 11, '#b4530980'); } R(g, wx + 7, 11, 1, 18, '#141021'); R(g, wx - 2, 31, 20, 2, '#2c2b40'); for (let k = 0; k < 5; k++) R(g, wx - 1 + k * 4, 33, 1, 5, '#2c2b40'); R(g, wx - 2, 38, 20, 1, '#2c2b40'); }
    R(g, x + sw - 16, 14, 10, 7, '#cbd5e1'); R(g, x + sw - 15, 15, 8, 2, '#64748b');
    // shop front
    const fy = h - 66;
    R(g, x + 4, fy, sw - 8, 66, '#141021'); R(g, x + 6, fy + 18, sw - 12, 48, dk);
    R(g, x + 8, fy + 22, sw - 46, 34, '#fde68a'); R(g, x + 8, fy + 22, sw - 46, 4, '#fffbe6'); R(g, x + 8, fy + 50, sw - 46, 6, '#b45309');
    // goods silhouettes in the window
    for (let k = 0; k < 3; k++) { R(g, x + 14 + k * 14, fy + 36, 8, 14, '#92400e'); R(g, x + 15 + k * 14, fy + 34, 6, 3, '#451a03'); }
    R(g, x + sw - 34, fy + 22, 24, 44, '#1e1b2e'); R(g, x + sw - 32, fy + 24, 20, 26, '#fbbf24'); R(g, x + sw - 32, fy + 24, 20, 3, '#fde68a'); R(g, x + sw - 14, fy + 44, 2, 4, '#e2e8f0');
    for (let ax = x + 4; ax < x + sw - 4; ax += 8) { R(g, ax, fy + 12, 4, 7, col); R(g, ax + 4, fy + 12, 4, 7, '#fff7ed'); } R(g, x + 4, fy + 12, sw - 8, 1, '#ffffff80'); R(g, x + 4, fy + 19, sw - 8, 1, '#141021');
    const s = SPR.props.signs[key];
    g.drawImage(s, x + Math.floor((sw - s.width) / 2), fy - 6);
    g.globalAlpha = 0.18; R(g, x + Math.floor((sw - s.width) / 2) - 3, fy - 9, s.width + 6, 22, col); g.globalAlpha = 1;
    x += sw; i++;
  }
  return c;
}
function hallWall(w, h) { // youth-centre garden wall for the courtyard
  const [c, g] = cv(w, h);
  R(g, 0, 0, w, h, '#d9c7a3'); R(g, 0, 0, w, 4, '#f3e6c8'); R(g, 0, 4, w, 2, '#a8895e');
  for (let x = 0; x < w; x += 64) { R(g, x, 6, 6, h - 6, '#c2ad84'); R(g, x + 14, 16, 36, 30, '#141021'); R(g, x + 16, 18, 32, 26, '#7dd3fc'); R(g, x + 16, 18, 32, 5, '#e0f2fe'); R(g, x + 31, 18, 2, 26, '#141021'); R(g, x + 16, 30, 32, 2, '#141021'); R(g, x + 12, 46, 40, 3, '#a8895e'); }
  for (let x = 0; x < w; x += 16) { g.fillStyle = '#2e7d32'; g.fillRect(x, h - 18, 16, 18); R(g, x + 2, h - 22, 12, 4, '#2e7d32'); R(g, x + 3, h - 21, 8, 2, '#4caf50'); R(g, x + 5, h - 12, 3, 2, '#4caf50'); }
  return c;
}

function anitkabir(w, h) { // distant hill and a plain colonnaded silhouette, nothing more
  const [c, g] = cv(w, h), far = '#9d93bd', hi = '#b9aed0', mon = '#7f76a3';
  for (let x = 0; x < w; x++) { const y = Math.round(34 * Math.exp(-Math.pow((x - 560) / 330, 2)) + 10 * Math.sin(x * 0.011) + 6 * Math.sin(x * 0.027 + 2)); R(g, x, h - 30 - y, 1, 30 + y, far); R(g, x, h - 30 - y, 1, 1, hi); }
  const mx = 560, my = h - 30 - 44;
  R(g, mx - 78, my + 2, 156, 4, mon); R(g, mx - 70, my - 2, 140, 4, mon); // stepped terrace
  R(g, mx - 54, my - 20, 108, 18, mon); R(g, mx - 58, my - 24, 116, 4, mon); // main hall under a flat roof
  for (let i = -6; i <= 6; i++) R(g, mx + i * 8 - 1, my - 19, 2, 17, hi); // colonnade
  for (const side of [-1, 1]) { R(g, mx + side * 68 - 6, my - 30, 12, 30, mon); R(g, mx + side * 68 - 7, my - 33, 14, 3, mon); R(g, mx + side * 68 - 1, my - 26, 2, 12, hi); } // corner towers
  for (let x = 0; x < w; x += 16) { const th = 12 + ((x * 7) % 9); R(g, x + 4, h - 30 - th + 6, 2, th, '#7e7aa3'); R(g, x + 3, h - 30 - th - 2 + 6, 4, 8, '#7e7aa3'); } // cypress row
  return c;
}
function treeline(w, h, col, hi, seed) {
  const [c, g] = cv(w, h), r = seeded(seed);
  R(g, 0, h - 14, w, 14, col);
  for (let x = 0; x < w; x += 10) { const th = 26 + Math.floor(r() * 44), rw = 8 + Math.floor(r() * 6); g.fillStyle = col; for (let y = 0; y < th; y++) { const hw = Math.round(rw * Math.sin(Math.min(1, y / th * 1.15) * 1.57 + 0.3) * 0.5 + 2); g.fillRect(x + 5 - hw, h - th - 6 + y, hw * 2, 1); } R(g, x + 3, h - th - 6, 2, 3, hi); }
  return c;
}
function audience(w, h, seed) {
  const [c, g] = cv(w, h), r = seeded(seed);
  R(g, 0, h - 40, w, 40, '#07050f');
  for (let x = 0; x < w; x += 9) { const hh = h - 40 - Math.floor(r() * 9); g.fillStyle = '#07050f'; g.fillRect(x + 1, hh, 7, 10); g.beginPath(); g.arc(x + 4.5, hh - 2, 4, 0, 7); g.fill(); if (r() < 0.3) { R(g, x + 6, hh - 18 - Math.floor(r() * 6), 2, 14, '#07050f'); if (r() < 0.6) R(g, x + 5, hh - 22, 4, 4, ['#f0abfc', '#22d3ee', '#fde68a'][Math.floor(r() * 3)]); } if (r() < 0.12) R(g, x + 6, hh - 14, 3, 5, '#e0f2fe'); }
  return c;
}
function ledWall(w, h) {
  const [c, g] = cv(w, h);
  R(g, 0, 0, w, h, '#0c0a1c');
  for (let x = 0; x < w; x += 32) for (let y = 4; y < h - 36; y += 20) { R(g, x + 1, y, 30, 18, '#13103a'); R(g, x + 1, y, 30, 1, '#2a2470'); const hue = ((x / 32 + y / 20) % 3); R(g, x + 12, y + 7, 8, 4, ['#22d3ee', '#f0abfc', '#6366f1'][hue] + '66'); }
  for (let x = 40; x < w; x += 170) for (const [col, dx] of [['#22d3ee', -20], ['#f0abfc', 20]]) { g.globalAlpha = 0.1; g.fillStyle = col; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + dx - 26, h - 40); g.lineTo(x + dx + 26, h - 40); g.fill(); g.globalAlpha = 1; }
  return c;
}
function stageFront(w, h) {
  const [c, g] = cv(w, h);
  R(g, 0, 0, w, 6, '#1b1830'); R(g, 0, 0, w, 1, '#4b4570'); R(g, 0, 5, w, 1, '#0b0916');
  for (let x = 14; x < w; x += 44) { R(g, x, 6, 8, 8, '#0b0916'); R(g, x + 1, 12, 6, 2, ['#22d3ee', '#f0abfc', '#fde68a', '#a3e635'][(x / 44) % 4 | 0]); g.globalAlpha = 0.07; g.fillStyle = '#e0f2fe'; g.beginPath(); g.moveTo(x + 2, 14); g.lineTo(x + 6, 14); g.lineTo(x + 26, h); g.lineTo(x - 18, h); g.fill(); g.globalAlpha = 1; }
  for (let x = 20; x < w; x += 132) g.drawImage(SPR.props.speaker, x, h - 52 - 8);
  R(g, 0, h - 8, w, 8, '#0b0916'); R(g, 0, h - 8, w, 1, '#ec3750');
  return c;
}
export function background(theme) {
  const sky = [];
  if (theme === 'day') {
    sky.push(['#3d8fe0', '#58a8ee', '#78c0f6', '#9cd6fb', '#c2e9fd', '#e6f7fe']);
    const far = skyline(11, 512, 200, ['#a9c9e8', '#c4dcf2', '#92b6da', '#92b6da', '#c4dcf2'], 0, (g, w, h) => { atakule(g, 380, h, '#8fb0d6', '#b4cfea', '#ffffff'); g.fillStyle = '#9dbfe2'; for (let x = 0; x < 150; x++) { const y = Math.round(40 * Math.sin((x / 150) * Math.PI)); g.fillRect(40 + x, h - y, 1, y); } R(g, 84, h - 52, 60, 12, '#8fb0d6'); for (let k = 0; k < 6; k++) R(g, 84 + k * 11, h - 56, 5, 4, '#8fb0d6'); R(g, 108, h - 64, 12, 12, '#8fb0d6'); });
    const mid = skyline(23, 512, 150, ['#7fa3c7', '#a3c1de', '#6889ad', '#5d7da0', '#a3c1de'], 0.2);
    return { sky: sky[0], layers: [{ c: far, f: 0.12, by: 214 }, { c: mid, f: 0.3, by: 236 }, { c: hallWall(512, 96), f: 0.62, by: 246 }], clouds: '#ffffff', sun: 'day', ground: '#3e8e41' };
  }
  if (theme === 'night') {
    const far = skyline(31, 512, 200, ['#161b3d', '#232a58', '#0e1230', '#f5d36a', '#fde68a'], 0.28, (g, w, h) => { atakule(g, 150, h, '#1c2250', '#2c3470', '#fde68a'); });
    const mid = skyline(37, 512, 170, ['#10142e', '#1c2250', '#090c20', '#fbbf24', '#fde68a'], 0.4);
    return { sky: ['#070b1f', '#0c1233', '#131a47', '#1c2559', '#2a3270', '#3b3f86', '#524a95'], layers: [{ c: far, f: 0.1, by: 206 }, { c: mid, f: 0.28, by: 232 }, { c: shopRow(1160, 150, TUNALI_SHOPS, ['#2b2347', '#33283f', '#232b4d', '#3a2442']), f: 0.7, by: 242 }], clouds: '#2f3678', sun: 'moon', ground: '#232845' };
  }
  if (theme === 'dawn') {
    return { sky: ['#6d7fb8', '#8f8fc4', '#b79bc9', '#dba7c0', '#f3b3b0', '#f9c6a0', '#fcd9a0'], layers: [{ c: anitkabir(1100, 150), f: 0.1, by: 222 }, { c: treeline(512, 120, '#6e6c98', '#8c88b3', 3), f: 0.28, by: 238 }, { c: treeline(512, 88, '#3f4a6b', '#5a6890', 8), f: 0.62, by: 246 }], clouds: '#fbd5cf', sun: 'dawn', ground: '#8b8396' };
  }
  if (theme === 'stage') {
    return { sky: ['#0a0716', '#100b24', '#160f33', '#1d1442', '#241850', '#2a1c5c', '#31206a'], layers: [{ c: ledWall(512, 214), f: 0.1, by: 232 }, { c: audience(512, 90, 13), f: 0.3, by: 244 }, { c: stageFront(640, 130), f: 0.7, by: 246 }], clouds: null, sun: null, ground: '#14101f' };
  }
  sky.push(['#1b1640', '#2d1f5c', '#4a2a78', '#7b3a8a', '#b84f85', '#ee7b6b', '#fbb46b']);
  const far = skyline(5, 512, 200, ['#3a2a66', '#4d3a80', '#2b1f52', '#2b1f52', '#4d3a80'], 0.25, (g, w, h) => { atakule(g, 130, h, '#33255c', '#4d3a80', '#fde68a'); });
  const mid = skyline(9, 512, 170, ['#2a2150', '#3d3170', '#1c1638', '#fbbf24', '#fde68a'], 0.45);
  return { sky: sky[0], layers: [{ c: far, f: 0.1, by: 206 }, { c: mid, f: 0.28, by: 232 }, { c: shopRow(1160, 150), f: 0.7, by: 242 }], clouds: '#f9a8d4', sun: 'dusk', ground: '#2c2b40' };
}

let built = false;
export function buildArt() {
  if (built) return;
  built = true;
  buildItems(); buildEnemies(); buildExtra(); buildTiles(); buildProps();
}
export function draw(g, s, frame, x, y, flip) {
  const c = s.f[frame % s.f.length];
  if (flip) { g.save(); g.translate(Math.round(x), Math.round(y)); g.scale(-1, 1); g.drawImage(c, -s.ax, -s.ay); g.restore(); }
  else g.drawImage(c, Math.round(x - s.ax), Math.round(y - s.ay));
}
