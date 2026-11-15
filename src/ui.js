// HUD, dialogue boxes, menus and overlays. Everything is drawn on the game canvas with the pixel font.
import { text, textW, wrap, cv, clamp } from './gfx.js';
import { SPR, draw } from './art.js';

const INK = '#141021', PAPER = '#fff7ed', RED = '#ec3750', GOLD = '#fde68a';
export const NAMES = { akin: 'AKIN', devin: 'DEVİN', mert: 'MERT', tuna: 'TUNA', gokoz: 'GÖKÖZ', ozgur: 'ÖZGÜR', buglord: 'BUG LORD', goblin: 'DEADLINE GOBLIN', doner: 'DÖNER OVERLORD', spam: 'SPAM MAGE', jury: 'JÜRİ' };
export const TINT = { akin: '#7cc6e8', devin: '#d9a877', mert: '#fbbf24', tuna: '#22d3ee', gokoz: '#34d399', ozgur: '#ff477e', buglord: '#a3e635', goblin: '#ef4444', doner: '#fb923c', spam: '#f0abfc', jury: '#fde68a' };

function bar(g, x, y, w, h, v, col, trail, trailCol = '#ffffff') {
  g.fillStyle = INK; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = '#3b3050'; g.fillRect(x, y, w, h);
  if (trail !== undefined && trail > v) { g.fillStyle = trailCol; g.fillRect(x, y, Math.round(w * clamp(trail, 0, 1)), h); }
  g.fillStyle = col; g.fillRect(x, y, Math.round(w * clamp(v, 0, 1)), h);
  g.fillStyle = '#ffffff50'; g.fillRect(x, y, Math.round(w * clamp(v, 0, 1)), 1);
}

let hpTrail = 1, bossTrail = 1;
export function drawHUD(g, w, VW, VH, t) {
  const p = w.player, hp = p.hp / p.maxHp;
  hpTrail = hpTrail < hp ? hp : Math.max(hp, hpTrail - 0.006);
  // portrait
  g.fillStyle = INK; g.fillRect(5, 5, 28, 28); g.fillStyle = '#7cc6e8'; g.fillRect(7, 7, 24, 24);
  g.drawImage(p.spr.idle[0], 20, 10, 24, 24, 7, 7, 24, 24);
  const bw = Math.min(96, VW * 0.3);
  bar(g, 37, 8, bw, 7, hp, hp < 0.3 && Math.floor(t * 6) % 2 ? '#fca5a5' : '#ef4444', hpTrail, GOLD);
  bar(g, 37, 19, bw * 0.7, 4, p.en, p.en >= 1 ? (Math.floor(t * 8) % 2 ? '#ffffff' : '#22d3ee') : '#22d3ee');
  for (let i = 0; i < p.lives; i++) draw(g, SPR.heart, 0, 42 + i * 11, 31, false);
  // buffs
  let bx = 37 + bw * 0.7 + 6;
  if (p.cay > 0) { draw(g, SPR.cay, 0, bx + 6, 28, false); bx += 14; }
  if (p.don > 0) { draw(g, SPR.doneri, 0, bx + 9, 28, false); }
  // stickers + weapon
  const s = String(w.save.stickers + w.stats.stickers);
  text(g, s, VW - 8, 6, PAPER, 1, 1, INK); draw(g, SPR.sticker, 0, VW - 16 - textW(s), 18, false);
  if (p.weapon) {
    const sp = SPR[p.weapon.k], lbl = 'x' + p.weapon.ammo;
    text(g, lbl, VW - 8, 21, GOLD, 1, 1, INK); draw(g, sp, 0, VW - 18 - textW(lbl) - (p.weapon.k === 'klavye' ? 6 : 0), 34, false);
  }
  if (p.combo >= 3) { const sc = p.comboT > 1.45 ? 3 : 2; text(g, p.combo + ' KOMBO', VW - 8, 52, p.combo >= 10 ? '#f0abfc' : GOLD, sc === 3 ? 2 : 1, 1, INK); }
  // boss bar
  if (w.boss && !w.boss.dead) {
    const b = w.boss, v = b.hp / b.maxHp, ww = Math.min(220, VW - 60), x = Math.round((VW - ww) / 2), y = VH - 16;
    bossTrail = bossTrail < v ? v : Math.max(v, bossTrail - 0.004);
    text(g, b.name, VW / 2, y - 13, PAPER, 1, 0.5, INK);
    bar(g, x, y, ww, 6, v, b.phase === 2 ? '#f97316' : '#a855f7', bossTrail, PAPER);
    g.fillStyle = INK; g.fillRect(x + ww / 2, y, 1, 6);
  } else bossTrail = 1;
}

// generic vertical menu; returns button rects for pointer input
export function drawMenu(g, m, VW, VH, t) {
  const rows = m.items.length, bw = Math.min(VW - 40, m.wide ? 250 : 170), bh = 17, gap = 5;
  const totalH = rows * (bh + gap) + (m.title ? 26 : 0) + (m.note ? 14 : 0);
  let y = Math.round(m.y !== undefined ? m.y : (VH - totalH) / 2);
  const x = Math.round((VW - bw) / 2), rects = [];
  if (m.dim) { g.globalAlpha = 0.72; g.fillStyle = '#0b0916'; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1; }
  if (m.title) { text(g, m.title, VW / 2, y, m.titleCol || GOLD, 2, 0.5, INK); y += 26; }
  if (m.note) { text(g, m.note, VW / 2, y - 2, PAPER, 1, 0.5, INK); y += 14; }
  m.items.forEach((it, i) => {
    const sel = i === m.sel, by = y + i * (bh + gap);
    g.fillStyle = INK; g.fillRect(x - 2, by - 2, bw + 4, bh + 4 + 2);
    g.fillStyle = it.disabled ? '#57506e' : sel ? RED : PAPER; g.fillRect(x, by + (sel ? 1 : 0), bw, bh);
    if (!it.disabled) { g.fillStyle = sel ? '#ff8c37' : '#ffffff'; g.fillRect(x, by + (sel ? 1 : 0), bw, 2); }
    const col = it.disabled ? '#9a93b3' : sel ? PAPER : INK;
    text(g, it.label, it.value !== undefined ? x + 8 : VW / 2, by + 4 + (sel ? 1 : 0), col, 1, it.value !== undefined ? 0 : 0.5);
    if (it.value !== undefined) text(g, it.value, x + bw - 8, by + 4 + (sel ? 1 : 0), col, 1, 1);
    if (sel && Math.floor(t * 4) % 2) text(g, '>', x - 12, by + 4, GOLD, 1, 0, INK);
    rects.push({ x: x - 2, y: by - 2, w: bw + 4, h: bh + 6, i });
  });
  return rects;
}

export const titleScale = (VW, VH) => (VH < 250 ? 2 : VH < 275 || VW < 400 ? 3 : 4);
export function drawTitle(g, VW, VH, t) {
  const y = Math.round(VH * 0.14);
  const sc = titleScale(VW, VH);
  g.globalAlpha = 0.55; g.fillStyle = '#0b0916'; g.fillRect(0, 0, VW, y + sc * 21 + 22); g.globalAlpha = 1;
  text(g, 'HAVEN', VW / 2, y, '#141021', sc, 0.5); text(g, 'HAVEN', VW / 2 - 1, y - 2, RED, sc, 0.5); text(g, 'HAVEN', VW / 2 - 1, y - 3, '#ff8c37', sc, 0.5);
  g.save(); g.beginPath(); g.rect(0, y + sc * 5, VW, 99); g.clip(); text(g, 'HAVEN', VW / 2 - 1, y - 3, RED, sc, 0.5); g.restore();
  text(g, 'ANKARA', VW / 2, y + sc * 10 + 2, PAPER, sc, 0.5, INK);
  const sub = 'ÇAY, DÖNER VE CODE JAM';
  const sw = textW(sub) + 12;
  g.fillStyle = INK; g.fillRect(Math.round(VW / 2 - sw / 2), y + sc * 21 + 2, sw, 14); text(g, sub, VW / 2, y + sc * 21 + 4, GOLD, 1, 0.5);
  text(g, 'CODE JAM TEMASI: BOUNCE BACK', VW / 2, VH - 13, PAPER, 1, 0.5, INK);
}
const CREDITS = [['HAVEN ANKARA', 3, GOLD], ['ÇAY, DÖNER VE CODE JAM', 1, PAPER], [], ['TEMA', 1, '#a5f3fc'], ['BOUNCE BACK', 2, PAPER], [], ['EKİP', 1, '#a5f3fc'],
  ['AKIN', 2, PAPER], ['MERT', 2, PAPER], ['TUNA', 2, PAPER], ['GÖKÖZ', 2, PAPER], ['ÖZGÜR', 2, PAPER], ['DEVİN', 2, PAPER], [], ['HACK CLUB', 1, '#a5f3fc'], ['HAVEN ANKARA', 2, GOLD], [], ['OYNADIĞIN İÇİN TEŞEKKÜRLER', 1, PAPER], ['DÜŞERSEN KALK.', 2, RED]];
// returns true once the last line has settled, so the caller can show the exit hint
export function drawCredits(g, t, VW, VH) {
  g.fillStyle = '#0b0916'; g.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 40; i++) { g.fillStyle = (i + Math.floor(t * 2)) % 5 ? '#3b3050' : PAPER; g.fillRect((i * i * 37 + i * 91 + 13) % VW, (i * i * 29 + i * 53 + 7) % VH, 1, 1); }
  const hs = CREDITS.map((c) => (c.length ? c[1] * 10 + 8 : 12)), total = hs.reduce((a, b) => a + b, 0), last = hs[hs.length - 1];
  const off = Math.min(t * 26, VH / 2 + 10 + total - last);
  let y = VH + 10 - off;
  CREDITS.forEach((c, i) => { if (c.length && y > -30 && y < VH) text(g, c[0], VW / 2, Math.round(y), c[2], c[1], 0.5, INK); y += hs[i]; });
  return t * 26 >= VH / 2 + 10 + total - last;
}
export function drawCount(g, n, frac, VW, VH) {
  const label = n > 0 ? String(n) : 'BAŞLA!';
  const sc = n > 0 ? 6 + Math.round((1 - frac) * 2) : 4;
  text(g, label, VW / 2, VH / 2 - sc * 6, n > 0 ? GOLD : PAPER, sc, 0.5, INK);
}
export function drawResult(g, w, VW, VH, total) {
  g.globalAlpha = 0.78; g.fillStyle = '#0b0916'; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1;
  const y = Math.round(VH * 0.08);
  text(g, 'BUG FIXED!', VW / 2, y, '#a3e635', 3, 0.5, INK);
  text(g, 'BÖLÜM ' + w.lv.id + ' TAMAM', VW / 2, y + 34, PAPER, 1, 0.5, INK);
  const s = w.stats, mm = Math.floor(s.time / 60), ss = String(Math.floor(s.time % 60)).padStart(2, '0');
  const rows = [['STICKER', '+' + s.stickers], ['ROZET', s.badges + '/' + total], ['EN UZUN KOMBO', String(s.maxCombo)], ['SÜRE', mm + ':' + ss]];
  rows.forEach(([a, b], i) => { text(g, a, VW / 2 - 70, y + 52 + i * 13, GOLD, 1, 0, INK); text(g, b, VW / 2 + 70, y + 52 + i * 13, PAPER, 1, 1, INK); });
}
export function drawHelp(g, VW, VH, touch) {
  g.globalAlpha = 0.85; g.fillStyle = '#0b0916'; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1;
  text(g, 'KONTROLLER', VW / 2, 12, GOLD, 2, 0.5, INK);
  const rows = touch
    ? [['< >', 'YÜRÜ'], ['▲', 'ZIPLA (İKİ KEZ)'], ['●', 'YUMRUK: ÜÇLÜ KOMBO'], ['◆', 'TEKME / HAVADA ÇAKIL'], ['▼ + ◆', 'HAVAYA KALDIR'], ['»', 'ATIL'], ['T', 'SİLAHI FIRLAT'], ['★', 'SHIP IT (ENERJİ DOLUNCA)']]
    : [['A D / OKLAR', 'YÜRÜ'], ['BOŞLUK / W', 'ZIPLA (İKİ KEZ)'], ['J', 'YUMRUK: ÜÇLÜ KOMBO'], ['K', 'TEKME / HAVADA ÇAKIL'], ['S + K', 'HAVAYA KALDIR'], ['SHIFT', 'ATIL'], ['L', 'SİLAHI FIRLAT'], ['Q', 'SHIP IT (ENERJİ DOLUNCA)'], ['S + BOŞLUK', 'PLATFORMDAN İN'], ['ESC', 'DURAKLAT']];
  rows.forEach(([a, b], i) => { text(g, a, VW / 2 - 12, 38 + i * 13, PAPER, 1, 1, INK); text(g, b, VW / 2 + 4, 38 + i * 13, '#a5f3fc', 1, 0, INK); });
}
