// HUD, menus and overlays. Everything is drawn on the game canvas with the pixel font.
import { text, textW, wrap, clamp } from './gfx.js';
import { SPR, draw } from './art.js';
import { sprites } from './heroes.js';

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
  const totalH = rows * (bh + gap) + (m.title ? 26 : 0) + (m.note ? 14 : 0) + (m.items.some((it) => it.desc) ? 12 : 0);
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
    const col = it.disabled ? '#9a93b3' : sel ? PAPER : it.poor ? '#8a6f7a' : INK;
    text(g, it.label, it.value !== undefined ? x + 8 : VW / 2, by + 4 + (sel ? 1 : 0), col, 1, it.value !== undefined ? 0 : 0.5);
    if (it.value !== undefined) text(g, it.value, x + bw - 8, by + 4 + (sel ? 1 : 0), col, 1, 1);
    if (sel && Math.floor(t * 4) % 2) text(g, '>', x - 12, by + 4, GOLD, 1, 0, INK);
    rects.push({ x: x - 2, y: by - 2, w: bw + 4, h: bh + 6, i });
  });
  const d = m.items[m.sel] && m.items[m.sel].desc;
  if (d) text(g, d, VW / 2, y + rows * (bh + gap) + 2, '#a5f3fc', 1, 0.5, INK);
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

// ---- mobile-style lobby; menu items: 0 MACERA 1 HİKÂYE 2 KALE 3 ÇOK OYUNCULU 4 DÜKKÂN 5 KONTROLLER 6 AYARLAR
function lbox(g, x, y, w, h, fill, top, sel) {
  const yy = sel ? y - 1 : y;
  if (sel) { g.fillStyle = GOLD; g.fillRect(x - 3, yy - 3, w + 6, h + 6 + 1); }
  g.fillStyle = INK; g.fillRect(x - 2, yy - 2, w + 4, h + 4 + 1);
  g.fillStyle = fill; g.fillRect(x, yy, w, h);
  g.fillStyle = top; g.fillRect(x, yy, w, 2);
  return yy;
}
// ---- Dan the Man style UI helpers
function drawDanLogo(g, cx, cy, sc, t) {
  // 3D Chunky HAVEN
  const ly = cy;
  // Black drop shadow
  text(g, 'HAVEN', cx + 2, ly + 3, '#07060f', sc, 0.5);
  // Red/terracotta 3D extrusion
  text(g, 'HAVEN', cx + 1, ly + 2, '#851a08', sc, 0.5);
  text(g, 'HAVEN', cx + 1, ly + 1, '#b91c1c', sc, 0.5);
  // Warm orange base
  text(g, 'HAVEN', cx, ly, '#ea580c', sc, 0.5);
  // Bright golden top half
  g.save();
  g.beginPath();
  g.rect(0, 0, 9999, ly + sc * 5);
  g.clip();
  text(g, 'HAVEN', cx, ly, '#fde047', sc, 0.5);
  g.restore();

  // Spinning ninja star / sticker on top-left of HAVEN
  const starFr = Math.floor(t * 6) % 4;
  const starX = cx - Math.round(textW('HAVEN', sc) * 0.5) - 14;
  draw(g, SPR.sticker, starFr, starX, ly + 2, false);

  // ANKARA pill banner below
  const ay = ly + sc * 10 + 2;
  const aw = textW('ANKARA', sc > 2 ? 2 : 1) + 20, ah = sc > 2 ? 14 : 11;
  const ax = Math.round(cx - aw / 2);
  // Banner border and shadow
  g.fillStyle = '#07060f'; g.fillRect(ax - 2, ay - 1, aw + 4, ah + 3);
  g.fillStyle = '#1e1b4b'; g.fillRect(ax, ay, aw, ah);
  g.fillStyle = '#facc15'; g.fillRect(ax + 1, ay + 1, aw - 2, 1);
  text(g, 'ANKARA', cx, ay + (sc > 2 ? 3 : 2), '#fff7ed', sc > 2 ? 2 : 1, 0.5, '#07060f');

  // Small CLASSIC / CODE JAM badge
  const cjw = textW('CODE JAM') + 8;
  g.fillStyle = '#07060f'; g.fillRect(Math.round(cx - cjw / 2) - 1, ay + ah + 1, cjw + 2, 9);
  g.fillStyle = '#15803d'; g.fillRect(Math.round(cx - cjw / 2), ay + ah + 2, cjw, 7);
  text(g, 'CODE JAM', cx, ay + ah + 3, '#a7f3d0', 1, 0.5);

  return ay + ah + 12;
}

function drawMiniArcade(g, x, y) {
  // Mini retro arcade cabinet (14x20)
  g.fillStyle = '#07060f'; g.fillRect(x - 1, y - 1, 16, 22);
  g.fillStyle = '#4c1d95'; g.fillRect(x, y, 14, 20); // cabinet body
  g.fillStyle = '#6d28d9'; g.fillRect(x + 1, y + 1, 12, 3); // marquee
  g.fillStyle = '#fde047'; g.fillRect(x + 3, y + 2, 8, 1); // marquee text
  g.fillStyle = '#0f172a'; g.fillRect(x + 1, y + 5, 12, 8); // screen bezel
  g.fillStyle = '#22d3ee'; g.fillRect(x + 3, y + 6, 8, 6); // glowing cyan screen
  g.fillStyle = '#ffffff'; g.fillRect(x + 5, y + 7, 3, 3); // screen character
  g.fillStyle = '#1e1b4b'; g.fillRect(x + 1, y + 14, 12, 3); // control panel
  g.fillStyle = '#ef4444'; g.fillRect(x + 3, y + 13, 2, 2); // joystick
  g.fillStyle = '#facc15'; g.fillRect(x + 8, y + 15, 2, 1); // button 1
  g.fillStyle = '#3b82f6'; g.fillRect(x + 11, y + 15, 2, 1); // button 2
}

function drawMiniIsland(g, x, y, w) {
  // Lush green grass ledge (w x 12)
  g.fillStyle = '#07060f'; g.fillRect(x - 2, y, w + 4, 10);
  g.fillStyle = '#15803d'; g.fillRect(x, y + 1, w, 3); // grass top
  g.fillStyle = '#22c55e'; g.fillRect(x, y + 1, w, 1); // grass highlight
  g.fillStyle = '#78350f'; g.fillRect(x, y + 4, w, 5); // dirt base
  g.fillStyle = '#92400e'; g.fillRect(x + 2, y + 5, w - 4, 2);
}

export function drawLobby(g, m, VW, VH, t) {
  const u = Math.min(VW, VH), rects = [], sel = m.sel;

  // 1. Rich Dan the Man Indigo/Purple Radial Gradient Background
  const rad = g.createRadialGradient(VW / 2, VH * 0.42, 10, VW / 2, VH * 0.46, Math.max(VW, VH) * 0.85);
  rad.addColorStop(0, '#2d226a');
  rad.addColorStop(0.52, '#1e174b');
  rad.addColorStop(1, '#0e0a2b');
  g.fillStyle = rad;
  g.fillRect(0, 0, VW, VH);

  // Soft horizontal stage light stripe behind cards
  const yStage = Math.round(VH * 0.5);
  g.fillStyle = 'rgba(255, 255, 255, 0.05)';
  g.fillRect(0, yStage - 2, VW, 4);
  g.fillStyle = 'rgba(129, 140, 248, 0.07)';
  g.fillRect(0, yStage, VW, VH - yStage);

  // Animated subtle floating pattern (Devin heads, code brackets, pixel stars)
  g.globalAlpha = 0.08;
  const gl = ['</>', '{ }', '^.^', '*'];
  const cw = 44, ch = 24, ox = (t * 5) % cw, oy = (t * 3) % ch;
  for (let r = -1; r * ch < VH + ch; r++) {
    for (let c = -1; c * cw < VW + cw; c++) {
      text(g, gl[(r * 3 + c + 99) % gl.length], c * cw + (r & 1) * 22 - ox, r * ch - oy, '#c7d2fe', 1, 0);
    }
  }
  g.globalAlpha = 1;

  // 2. Top-Center Dan the Man 3D Logo
  const sc = VH < 240 ? 2 : 3;
  const logoTop = VH < 240 ? 4 : 8;
  const logoBottom = drawDanLogo(g, VW / 2, logoTop, sc, t);

  // 3. Top-Right: Gold Sticker Capsule Pill Counter (Dan the Man style)
  const num = String(m.stickers || 0).padStart(4, '0');
  const pillW = 82, pillH = 18, pillX = VW - pillW - 8, pillY = 6;
  g.fillStyle = '#07060f'; g.fillRect(pillX - 2, pillY - 1, pillW + 4, pillH + 2);
  g.fillStyle = '#1e1b4b'; g.fillRect(pillX, pillY, pillW, pillH);
  g.fillStyle = '#facc15'; g.fillRect(pillX + 1, pillY + 1, pillW - 2, 1);
  // Gold sticker icon
  draw(g, SPR.sticker, Math.floor(t * 6) % 4, pillX + 2, pillY + 16, false);
  // Number
  text(g, num, pillX + 38, pillY + 5, '#fde047', 1.2, 0.5, '#07060f');
  // Plus (+) button
  g.fillStyle = '#07060f'; g.fillRect(pillX + pillW - 17, pillY + 2, 15, 14);
  g.fillStyle = '#f97316'; g.fillRect(pillX + pillW - 16, pillY + 3, 13, 12);
  g.fillStyle = '#ea580c'; g.fillRect(pillX + pillW - 16, pillY + 13, 13, 2);
  text(g, '+', pillX + pillW - 10, pillY + 5, '#ffffff', 1.2, 0.5, '#07060f');

  // 4. Top-Left: Hero Avatar Button (Dan the Man "CHARACTERS" style)
  const heroBtnW = 34, heroBtnH = 34, heroBtnX = 8, heroBtnY = 6;
  g.fillStyle = '#07060f'; g.fillRect(heroBtnX - 2, heroBtnY - 2, heroBtnW + 4, heroBtnH + 4);
  g.fillStyle = '#1e3a8a'; g.fillRect(heroBtnX, heroBtnY, heroBtnW, heroBtnH);
  g.fillStyle = '#60a5fa'; g.fillRect(heroBtnX + 1, heroBtnY + 1, heroBtnW - 2, 1);
  // Mini hero face
  const akinIdle = sprites('akin', ['idle']).idle;
  const hfr = akinIdle[Math.floor(t * 5) % akinIdle.length];
  g.drawImage(hfr, 16, 8, 32, 32, heroBtnX + 1, heroBtnY + 1, 32, 32);
  // Label below
  g.fillStyle = '#07060f'; g.fillRect(heroBtnX - 3, heroBtnY + heroBtnH - 7, heroBtnW + 6, 9);
  g.fillStyle = '#3b82f6'; g.fillRect(heroBtnX - 2, heroBtnY + heroBtnH - 6, heroBtnW + 4, 7);
  text(g, 'KAHRAMAN', heroBtnX + heroBtnW / 2, heroBtnY + heroBtnH - 5, '#ffffff', 0.8, 0.5);

  // 5. Right-Side Stack: DÜKKÂN (3) and KONTROLLER (4)
  const rBtnW = 38, rBtnH = 36, rBtnX = VW - rBtnW - 8;
  let ry = logoBottom + 4;
  [
    [3, 'DÜKKÂN', '#f59e0b', '#fbbf24', 'shop'],
    [4, 'KONTROL', '#3b82f6', '#60a5fa', 'pad'],
  ].forEach(([idx, lab, c1, c2, icon]) => {
    const isSel = sel === idx;
    const byy = isSel ? ry - 2 : ry;
    if (isSel) {
      g.fillStyle = GOLD; g.fillRect(rBtnX - 4, byy - 4, rBtnW + 8, rBtnH + 8);
    }
    g.fillStyle = '#07060f'; g.fillRect(rBtnX - 2, byy - 2, rBtnW + 4, rBtnH + 4);
    g.fillStyle = '#1e293b'; g.fillRect(rBtnX, byy, rBtnW, rBtnH);
    g.fillStyle = isSel ? c2 : c1; g.fillRect(rBtnX + 1, byy + 1, rBtnW - 2, 2);

    // Icon
    if (icon === 'shop') {
      // Golden prize cup / medal
      g.fillStyle = '#fde047';
      g.fillRect(rBtnX + 13, byy + 6, 12, 10);
      g.fillRect(rBtnX + 11, byy + 7, 2, 5);
      g.fillRect(rBtnX + 25, byy + 7, 2, 5);
      g.fillStyle = '#ca8a04'; g.fillRect(rBtnX + 17, byy + 16, 4, 3);
      g.fillRect(rBtnX + 14, byy + 19, 10, 2);
    } else {
      // Gamepad icon
      g.fillStyle = '#94a3b8'; g.fillRect(rBtnX + 10, byy + 9, 18, 10);
      g.fillStyle = '#07060f';
      g.fillRect(rBtnX + 13, byy + 12, 5, 2); g.fillRect(rBtnX + 15, byy + 10, 2, 5); // dpad
      g.fillStyle = '#ef4444'; g.fillRect(rBtnX + 22, byy + 11, 2, 2); // btn a
      g.fillStyle = '#facc15'; g.fillRect(rBtnX + 24, byy + 14, 2, 2); // btn b
    }
    // Label
    g.fillStyle = '#07060f'; g.fillRect(rBtnX - 3, byy + rBtnH - 8, rBtnW + 6, 10);
    g.fillStyle = isSel ? '#2563eb' : '#1e3a8a'; g.fillRect(rBtnX - 2, byy + rBtnH - 7, rBtnW + 4, 8);
    text(g, lab, rBtnX + rBtnW / 2, byy + rBtnH - 6, isSel ? GOLD : PAPER, 0.8, 0.5);

    rects.push({ x: rBtnX - 2, y: byy - 2, w: rBtnW + 4, h: rBtnH + 4, i: idx });
    ry += rBtnH + 8;
  });

  // 6. Bottom-Right: Gear Button for AYARLAR (5)
  const gs = clamp(Math.round(u * 0.1), 22, 28);
  const gx = VW - gs - 8, gy = VH - gs - 6;
  const isGearSel = sel === 5;
  const gyy = isGearSel ? gy - 2 : gy;
  if (isGearSel) { g.fillStyle = GOLD; g.fillRect(gx - 4, gyy - 4, gs + 8, gs + 8); }
  g.fillStyle = '#07060f'; g.fillRect(gx - 2, gyy - 2, gs + 4, gs + 4);
  g.fillStyle = '#1e3a8a'; g.fillRect(gx, gyy, gs, gs);
  g.fillStyle = '#3b82f6'; g.fillRect(gx + 1, gyy + 1, gs - 2, 2);
  drawGear(g, gx + Math.round((gs - Math.floor(gs * 0.6 / 12) * 12) / 2), gyy + Math.round((gs - Math.floor(gs * 0.6 / 12) * 12) / 2), Math.floor(gs * 0.6), isGearSel ? GOLD : PAPER);
  rects.push({ x: gx - 2, y: gyy - 2, w: gs + 4, h: gs + 4, i: 5 });

  // -------------------------------------------------------------
  // 7. CENTERPIECE: DAN THE MAN 3-CARD DIORAMA CAROUSEL!
  // Left: MACERA (0) | Center Diamond: HİKÂYE (1) | Right: ÇEVRİM İÇİ (2)
  // -------------------------------------------------------------
  const cardW = clamp(Math.round(u * 0.38), 64, 94);
  const cardH = clamp(Math.round(u * 0.44), 72, 106);
  const diaSize = Math.round(cardW * 1.18); // Elevated center diamond
  const gap = Math.max(8, Math.round(u * 0.03));
  const cx = Math.round(VW / 2);
  const totalW = cardW + gap + diaSize + gap + cardW;
  const baseX = Math.round(cx - totalW / 2);
  const cyCards = Math.round(VH * 0.64);

  // ---- (0) LEFT CARD: MACERA (ADVENTURE)
  {
    const isSel = sel === 0;
    const cw = cardW, ch = cardH;
    const x = baseX, y = isSel ? cyCards - Math.round(ch / 2) - 3 : cyCards - Math.round(ch / 2);

    // Golden halo when selected
    if (isSel) {
      g.fillStyle = GOLD;
      g.fillRect(x - 4, y - 4, cw + 8, ch + 8 + 10);
    }
    // Outer border
    g.fillStyle = '#07060f';
    g.fillRect(x - 2, y - 2, cw + 4, ch + 4 + 8);
    // Card backdrop
    g.fillStyle = '#1e1b4b';
    g.fillRect(x, y, cw, ch);
    // Header gradient
    g.fillStyle = '#312e81';
    g.fillRect(x, y, cw, 16);

    // Mini Island & Akın Hero Diorama
    const islY = y + ch - 22;
    drawMiniIsland(g, x + 6, islY, cw - 12);
    // Akın sprite bobbing proudly
    const akinSpr = sprites('akin', ['idle']).idle;
    const fr = akinSpr[Math.floor(t * 5) % akinSpr.length];
    const sprSize = Math.min(52, cw - 8);
    draw64(g, fr, x + (cw - sprSize) / 2, islY - sprSize + 8, sprSize);

    // Bottom Plaque: MACERA
    const py = y + ch - 6;
    g.fillStyle = '#07060f'; g.fillRect(x - 1, py - 1, cw + 2, 16);
    g.fillStyle = isSel ? '#fbbf24' : '#f59e0b'; g.fillRect(x, py, cw, 14);
    g.fillStyle = '#d97706'; g.fillRect(x, py + 11, cw, 3);
    text(g, 'MACERA', x + cw / 2, py + 3, '#fff7ed', 1.2, 0.5, '#07060f');

    rects.push({ x: x - 2, y: y - 2, w: cw + 4, h: ch + 14, i: 0 });
  }

  // ---- (1) CENTER CARD: HİKÂYE (STORY) — THE DAN THE MAN DIAMOND!
  {
    const isSel = sel === 1;
    const dw = diaSize, dh = diaSize;
    const x = Math.round(cx - dw / 2);
    const y = isSel ? cyCards - Math.round(dh / 2) - 8 : cyCards - Math.round(dh / 2) - 4;

    // Diamond path points
    const pTop = [cx, y];
    const pRight = [cx + dw / 2, y + dh / 2];
    const pBottom = [cx, y + dh];
    const pLeft = [cx - dw / 2, y + dh / 2];

    // Glow halo when selected
    if (isSel) {
      g.save();
      g.beginPath();
      g.moveTo(cx, y - 5);
      g.lineTo(cx + dw / 2 + 5, y + dh / 2);
      g.lineTo(cx, y + dh + 5);
      g.lineTo(cx - dw / 2 - 5, y + dh / 2);
      g.closePath();
      g.fillStyle = GOLD;
      g.fill();
      g.restore();
    }

    // Outer dark border
    g.save();
    g.beginPath();
    g.moveTo(pTop[0], pTop[1] - 3);
    g.lineTo(pRight[0] + 3, pRight[1]);
    g.lineTo(pBottom[0], pBottom[1] + 3);
    g.lineTo(pLeft[0] - 3, pLeft[1]);
    g.closePath();
    g.fillStyle = '#07060f';
    g.fill();

    // Diamond interior (clipped to show the 3 heroes together!)
    g.beginPath();
    g.moveTo(pTop[0], pTop[1]);
    g.lineTo(pRight[0], pRight[1]);
    g.lineTo(pBottom[0], pBottom[1]);
    g.lineTo(pLeft[0], pLeft[1]);
    g.closePath();
    g.fillStyle = '#172554'; // Deep navy blue
    g.fill();
    g.clip();

    // Diamond border highlight
    g.strokeStyle = isSel ? '#60a5fa' : '#2563eb';
    g.lineWidth = 4;
    g.stroke();

    // Backdrop stars inside diamond
    g.fillStyle = '#38bdf8';
    g.fillRect(cx - 12, y + 14, 2, 2);
    g.fillRect(cx + 18, y + 22, 2, 2);
    g.fillRect(cx - 24, y + 36, 1, 1);

    // --- The Trio of Heroes Diorama inside Diamond!
    const baseHeroY = y + dh - 12;
    const heroSize = Math.min(48, Math.round(dw * 0.48));

    // Left: Tuna
    const tunaIdle = sprites('tuna', ['idle']).idle;
    const tFr = tunaIdle[Math.floor(t * 5 + 1) % tunaIdle.length];
    draw64(g, tFr, cx - dw * 0.36, baseHeroY - heroSize + 2, heroSize - 4);

    // Right: Mert
    const mertIdle = sprites('mert', ['idle']).idle;
    const mFr = mertIdle[Math.floor(t * 5 + 2) % mertIdle.length];
    draw64(g, mFr, cx + dw * 0.05, baseHeroY - heroSize + 2, heroSize - 4);

    // Center Front: Özgür with his Royal Crown!
    const ozgIdle = sprites('ozgur', ['idle']).idle;
    const oFr = ozgIdle[Math.floor(t * 5) % ozgIdle.length];
    draw64(g, oFr, cx - heroSize / 2, baseHeroY - heroSize - 2, heroSize + 4);

    // Devin mascot peeking from the top
    draw(g, SPR.devin, Math.floor(t * 4) % 4, cx - 10, y + 22, false);

    g.restore();

    // --- Vibrant Green Ribbon / Pendant Under Diamond: HİKÂYE
    const ribW = Math.round(dw * 0.82), ribH = 18;
    const ribX = Math.round(cx - ribW / 2), ribY = y + dh - 10;
    // Ribbon shadow & border
    g.fillStyle = '#07060f';
    g.beginPath();
    g.moveTo(ribX - 2, ribY - 1);
    g.lineTo(ribX + ribW + 2, ribY - 1);
    g.lineTo(cx, ribY + ribH + 4);
    g.closePath();
    g.fill();
    // Ribbon body
    g.fillStyle = isSel ? '#4ade80' : '#22c55e';
    g.beginPath();
    g.moveTo(ribX, ribY);
    g.lineTo(ribX + ribW, ribY);
    g.lineTo(cx, ribY + ribH + 2);
    g.closePath();
    g.fill();
    g.fillStyle = '#15803d';
    g.fillRect(ribX, ribY, ribW, 2);
    // Story text
    text(g, 'HİKÂYE', cx, ribY + 3, isSel ? GOLD : PAPER, 1.3, 0.5, '#07060f');

    rects.push({ x: cx - dw / 2 - 4, y: y - 4, w: dw + 8, h: dh + 18, i: 1 });
  }

  // ---- (2) RIGHT CARD: ÇEVRİM İÇİ (ONLINE / SURVIVAL)
  {
    const isSel = sel === 2;
    const cw = cardW, ch = cardH;
    const x = baseX + cardW + gap + diaSize + gap;
    const y = isSel ? cyCards - Math.round(ch / 2) - 3 : cyCards - Math.round(ch / 2);

    // Golden halo when selected
    if (isSel) {
      g.fillStyle = GOLD;
      g.fillRect(x - 4, y - 4, cw + 8, ch + 8 + 10);
    }
    // Outer border
    g.fillStyle = '#07060f';
    g.fillRect(x - 2, y - 2, cw + 4, ch + 4 + 8);
    // Card backdrop
    g.fillStyle = '#1e1b4b';
    g.fillRect(x, y, cw, ch);
    // Header gradient
    g.fillStyle = '#4c1d95';
    g.fillRect(x, y, cw, 16);

    // Cyber battle diorama: Mini Arcade Cabinet & Gökoz fighter
    const botY = y + ch - 12;
    drawMiniArcade(g, x + 6, botY - 20);

    // Gökoz sprite ready for battle
    const gokozSpr = sprites('gokoz', ['idle']).idle;
    const fr = gokozSpr[Math.floor(t * 5) % gokozSpr.length];
    const sprSize = Math.min(52, cw - 8);
    draw64(g, fr, x + cw - sprSize + 2, botY - sprSize + 6, sprSize);

    // Neon glowing CANLI / PVP badge on top-right
    const badgeW = 28, badgeH = 10;
    const bx = x + cw - badgeW - 2, by = y + 2;
    g.fillStyle = '#07060f'; g.fillRect(bx - 1, by - 1, badgeW + 2, badgeH + 2);
    g.fillStyle = '#22c55e'; g.fillRect(bx, by, badgeW, badgeH);
    // Blinking dot
    if (Math.floor(t * 3) % 2 === 0) {
      g.fillStyle = '#ffffff'; g.fillRect(bx + 3, by + 3, 3, 3);
    }
    text(g, 'CANLI', bx + 16, by + 1, '#ffffff', 0.8, 0.5, '#07060f');

    // Bottom Plaque: ÇEVRİM İÇİ
    const py = y + ch - 6;
    g.fillStyle = '#07060f'; g.fillRect(x - 1, py - 1, cw + 2, 16);
    g.fillStyle = isSel ? '#c084fc' : '#8b5cf6'; g.fillRect(x, py, cw, 14);
    g.fillStyle = '#6d28d9'; g.fillRect(x, py + 11, cw, 3);
    text(g, 'ÇEVRİM İÇİ', x + cw / 2, py + 3, '#fff7ed', 1.1, 0.5, '#07060f');

    rects.push({ x: x - 2, y: y - 2, w: cw + 4, h: ch + 14, i: 2 });
  }

  // 8. Footer Theme Text
  text(g, 'CODE JAM TEMASI: BOUNCE BACK • DÜŞERSEN GERİ SEK', VW / 2, VH - 8, '#818cf8', 1, 0.5, '#07060f');

  return rects;
}
function draw64(g, c, x, y, s) { const d = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, c.width, c.height, Math.round(x), Math.round(y), s, s); g.imageSmoothingEnabled = d; }
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
  const step = VH < 240 ? 11 : 12, y0 = 36;
  rows.forEach(([a, b], i) => { text(g, a, VW / 2 - 12, y0 + i * step, PAPER, 1, 1, INK); text(g, b, VW / 2 + 4, y0 + i * step, '#a5f3fc', 1, 0, INK); });
  // the bounce-back tip sits in its own box so it is not lost in the list
  const lines = wrap(touch ? 'DARBE YİYİNCE YERE DÜŞERKEN ▲ BAS: GERİ SEK!' : 'DARBE YİYİNCE YERE DÜŞERKEN ZIPLA: GERİ SEK!', Math.min(260, VW - 40));
  const bw = Math.max(...lines.map((l) => textW(l))) + 16, bh = 20 + lines.length * 11, bx = Math.round((VW - bw) / 2), by = Math.min(y0 + rows.length * step + 8, VH - bh - 4);
  g.fillStyle = INK; g.fillRect(bx - 1, by - 1, bw + 2, bh + 2); g.fillStyle = '#7cf0ff'; g.fillRect(bx, by, bw, 2); g.fillStyle = '#1e1b3a'; g.fillRect(bx, by + 2, bw, bh - 2);
  text(g, 'GERİ SEK', VW / 2, by + 6, '#7cf0ff', 1, 0.5);
  lines.forEach((l, k) => text(g, l, VW / 2, by + 19 + k * 11, PAPER, 1, 0.5));
}
