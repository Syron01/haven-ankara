// World simulation: physics, player combat, enemy AI, bosses, weapons, pickups and world rendering.
import { clamp, rnd, pick, sgn, cv, flipH, whiten, text, textW, wrap } from './gfx.js';
import { sprites, ANIMS } from './heroes.js';
import { SPR, TILE, draw, background } from './art.js';
import { GR, ROWS } from './levels.js';
import { sfx } from './audio.js';

export const DT = 1 / 60;
const GRAV = 900, FLOOR = GR * TILE, WORLD_H = ROWS * TILE;

const ATK = {
  p1: { anim: 'p1', dur: 0.22, a0: 0.05, a1: 0.13, dmg: 5, kx: 45, ky: -20, bw: 27, by: -32, bh: 20, hs: 0.035, next: 'p2', cancel: 0.12, lunge: 70 },
  p2: { anim: 'p2', dur: 0.22, a0: 0.05, a1: 0.13, dmg: 5, kx: 55, ky: -20, bw: 28, by: -32, bh: 20, hs: 0.035, next: 'p3', cancel: 0.12, lunge: 70 },
  p3: { anim: 'kick', dur: 0.36, a0: 0.08, a1: 0.18, dmg: 9, kx: 200, ky: -150, bw: 33, by: -34, bh: 24, hs: 0.085, fin: true, lunge: 100 },
  kick: { anim: 'kick', dur: 0.34, a0: 0.08, a1: 0.17, dmg: 8, kx: 170, ky: -110, bw: 32, by: -34, bh: 24, hs: 0.06, fin: true, lunge: 50 },
  upper: { anim: 'upper', dur: 0.4, a0: 0.06, a1: 0.2, dmg: 8, kx: 25, ky: -330, bw: 26, by: -56, bh: 48, hs: 0.06, fin: true, launch: true },
  air: { anim: 'air', dur: 0.3, a0: 0.04, a1: 0.22, dmg: 6, kx: 70, ky: -160, bw: 30, by: -36, bh: 32, hs: 0.04 },
  slam: { anim: 'slam', dur: 9, dmg: 10, kx: 130, ky: -190, fin: true },
  special: { anim: 'special', dur: 0.62 },
  throw: { anim: 'throw', dur: 0.26 },
};
const EDEF = {
  slime: { w: 18, h: 14, hp: 16, drop: 2 },
  imp: { w: 12, h: 28, hp: 15, hero: 'imp', drop: 3 },
  bot: { w: 18, h: 20, hp: 14, fly: true, drop: 3 },
  knight: { w: 14, h: 30, hp: 46, hero: 'knight', drop: 6 },
  troll: { w: 12, h: 28, hp: 18, hero: 'troll', drop: 4 },
  clone: { w: 12, h: 28, hp: 12, hero: 'buglord', drop: 2 },
  spam: { w: 26, h: 70, hp: 280, fly: true, boss: true, name: 'SPAM MAGE' },
  buglord: { w: 28, h: 58, hp: 220, hero: 'buglord', scale: 2, boss: true, name: 'BUG LORD' },
  goblin: { w: 30, h: 58, hp: 240, hero: 'goblin', scale: 2, boss: true, name: 'DEADLINE GOBLIN' },
  doner: { w: 40, h: 80, hp: 400, boss: true, name: 'DÖNER OVERLORD' },
};
const HERO_KEYS = ['idle', 'run', 'jump', 'fall', 'dash', 'tele', 'smash', 'throw', 'hit', 'ko', 'win'];

// ------------------------------------------------------------------ world
export function createWorld(make, save, chapterIdx) {
  const lv = make();
  const w = {
    lv, tw: lv.w, grid: lv.grid, pxw: lv.w * TILE, t: 0, VW: 480, VH: 270,
    enemies: [], shots: [], picks: [], crates: [], fx: [], nums: [], flags: [], npcs: [], movers: [], zones: [],
    cam: { x: 0, y: 0, shake: 0 }, lockL: 0, lockR: lv.w * TILE, arena: null, hitstop: 0, flash: 0,
    boss: null, pads: [], cage: lv.cage !== undefined ? { x: lv.cage * TILE + 8 } : null, hint: null, hintI: 0, events: [], tokens: 0, go: 0, devinCd: 20, devin: { x: 0, y: 0 },
    stats: { stickers: 0, kos: 0, time: 0, badges: 0, maxCombo: 0 }, save, chapterIdx, over: false, cats: [],
  };
  w.bg = background(lv.theme);
  const up = save.upg;
  w.player = {
    x: lv.start * TILE, y: FLOOR, vx: 0, vy: 0, w: 12, h: 30, face: 1, grounded: true, jumps: 2, state: 'idle', st: 0,
    maxHp: 100 + up.hp * 20 + (save.moral ? 20 : 0), hp: 100 + up.hp * 20 + (save.moral ? 20 : 0), lives: 3, en: 0, inv: 0, combo: 0, comboT: 0, hitSet: new Set(), queue: null,
    weapon: null, cay: 0, don: 0, dashCd: 0, airDash: true, coy: 0, cut: false, landT: 0, airJumpT: 0, safeX: lv.start * TILE, safeY: FLOOR,
    dmgMul: 1 + up.power * 0.15, kb: false, kbT: 0, pow: 0, enMul: 1 + up.energy * 0.3, spr: sprites('akin'), drop: 0, ride: null, atkId: 0,
  };
  w.check = { x: lv.start * TILE, y: FLOOR };
  for (const m of lv.movers) w.movers.push({ bx: m.x * TILE, y: m.row * TILE, w: m.w, range: m.range, period: m.period, phase: m.phase, x: m.x * TILE, dx: 0 });
  for (const n of lv.npcs) w.npcs.push({ id: n.id, x: n.x * TILE + 8, y: FLOOR, story: n.story, spr: sprites(n.id, ['idle', 'win', 'hit']) });
  for (const e of lv.ents) {
    const x = e.x * TILE + 8, y = e.row !== undefined ? e.row * TILE + TILE : FLOOR;
    if (EDEF[e.t]) spawnEnemy(w, e.t, x, e.row !== undefined ? y : e.t === 'bot' ? FLOOR - 70 : FLOOR, null);
    else if (e.t === 'pad') w.pads.push({ x, y, t: 0 });
    else if (e.t === 'crate') w.crates.push({ x, y, hp: 2, drop: e.drop, shake: 0 });
    else if (e.t === 'flag') w.flags.push({ x, y: FLOOR, on: false, npc: e.npc && { id: e.npc, spr: sprites(e.npc, ['idle', 'win', 'hit']), gift: e.gift, say: e.say, given: false } });
    else w.picks.push({ k: e.t, x, y: y - 4, vy: 0, fixed: true, t: rnd(6) });
  }
  for (const a of lv.arenas) { a.state = 0; a.wave = -1; a.cutDone = false; }
  buildStatic(w);
  w.cam.x = clamp(w.player.x - 200, 0, w.pxw - 480);
  return w;
}

const tileAt = (w, tx, ty) => (tx < 0 || tx >= w.tw ? 1 : ty < 0 || ty >= ROWS ? 0 : w.grid[ty * w.tw + tx]);
const zoneOf = (w, tx) => { for (const z of w.lv.zones) if (tx >= z.x0 && tx <= z.x1) return z.set; return 'st'; };

function buildStatic(w) {
  const lv = w.lv, P = SPR.props, T = SPR.tiles;
  const [back, g] = cv(w.pxw, WORLD_H);
  if (lv.interior) {
    const x0 = lv.interior[0] * TILE, x1 = lv.interior[1] * TILE;
    g.fillStyle = '#e9dcc0'; g.fillRect(x0, 0, x1 - x0, FLOOR);
    g.fillStyle = '#f5ecd6'; g.fillRect(x0, 22, x1 - x0, 3);
    g.fillStyle = '#3f2a36'; g.fillRect(x0, 0, x1 - x0, 20); g.fillStyle = '#6b4a5a'; g.fillRect(x0, 18, x1 - x0, 2);
    g.fillStyle = '#b8946a'; g.fillRect(x0, FLOOR - 44, x1 - x0, 44); g.fillStyle = '#d9b98a'; g.fillRect(x0, FLOOR - 44, x1 - x0, 3); g.fillStyle = '#8a6a4a'; g.fillRect(x0, FLOOR - 6, x1 - x0, 6);
    for (let x = x0 + 40; x < x1 - 80; x += 150) { // windows show the city outside
      g.fillStyle = '#3f2a36'; g.fillRect(x - 3, 47, 76, 78); g.clearRect(x, 50, 70, 72);
      g.fillStyle = '#3f2a36'; g.fillRect(x + 34, 50, 2, 72); g.fillRect(x, 84, 70, 2); g.fillStyle = '#f5ecd6'; g.fillRect(x - 5, 125, 80, 4);
      g.fillStyle = '#ffffff30'; g.fillRect(x + 4, 54, 10, 26);
    }
    for (let x = x0 + 30; x < x1; x += 96) { g.fillStyle = '#2a1c26'; g.fillRect(x, 20, 2, 10); g.fillStyle = '#fde68a'; g.fillRect(x - 5, 30, 12, 5); g.fillStyle = '#fffbe620'; g.beginPath(); g.moveTo(x - 5, 35); g.lineTo(x + 7, 35); g.lineTo(x + 34, FLOOR); g.lineTo(x - 32, FLOOR); g.fill(); }
    for (let x = x0; x < x1; x += 14) { const c = ['#ec3750', '#22d3ee', '#facc15', '#a78bfa'][(x / 14) % 4 | 0]; g.fillStyle = c; g.fillRect(x + 3, 22 + Math.round(Math.sin(x * 0.045) * 3) + 3, 7, 6); g.fillRect(x + 5, 31 + Math.round(Math.sin(x * 0.045) * 3), 3, 3); }
    g.fillStyle = '#3f2a36'; g.fillRect(x1 - 6, 0, 10, FLOOR);
  }
  if (lv.park) { // a wall of dark trees hides the shop row behind the park
    const x0 = lv.park[0] * TILE, x1 = (lv.park[1] + 1) * TILE;
    g.fillStyle = '#0b1f2e'; g.fillRect(x0, 100, x1 - x0, FLOOR - 100);
    for (let x = x0 - 8; x < x1 + 8; x += 14) for (let k = 0; k < 9; k++) {
      const cy = 104 + k * 17 + Math.round(Math.sin(x * 0.31 + k * 2.1) * 5), r = 12 + Math.round(Math.abs(Math.sin(x * 0.17 + k)) * 5);
      g.fillStyle = k % 2 ? '#0f2e3d' : '#143d49'; g.beginPath(); g.arc(x + (k % 2) * 7, cy, r, 0, 7); g.fill();
      if ((x + k * 5) % 5 === 0) { g.fillStyle = '#7de2a3'; g.fillRect(x + k, cy - 3, 2, 2); }
    }
  }
  if (lv.pond) {
    const x0 = lv.pond[0] * TILE, x1 = (lv.pond[1] + 1) * TILE;
    g.fillStyle = '#17285a'; g.fillRect(x0, FLOOR + 4, x1 - x0, WORLD_H); g.fillStyle = '#2f5aa8'; g.fillRect(x0, FLOOR + 4, x1 - x0, 3); g.fillStyle = '#1e3a7a'; g.fillRect(x0, FLOOR + 7, x1 - x0, 4);
    for (let x = x0 + 6; x < x1 - 10; x += 19) { g.fillStyle = '#4a7bd0'; g.fillRect(x, FLOOR + 12 + ((x * 7) % 5) * 5, 10, 1); g.fillStyle = '#fde68a55'; if ((x >> 3) % 3 === 0) g.fillRect(x + 2, FLOOR + 9, 6, 1); }
  }
  for (const p of lv.props) {
    let c = P[p.k];
    if (Array.isArray(c)) c = c[p.v || 0];
    if (p.k === 'lamp' && lv.theme === 'night') c = P.lampN;
    const x = Math.round(p.x * TILE) - (c === P.lampN ? 10 : 0), y = p.y !== undefined ? Math.round(p.y * TILE) : FLOOR - c.height;
    g.drawImage(c, x, y);
    if (p.cat) w.cats.push({ x: x + 20, y: FLOOR - 12 });
  }
  const [front, f] = cv(w.pxw, WORLD_H);
  for (let tx = 0; tx < w.tw; tx++) {
    const z = zoneOf(w, tx);
    for (let ty = 0; ty < ROWS; ty++) {
      const t = w.grid[ty * w.tw + tx];
      if (t === 1) {
        let img;
        if (ty < GR) img = z === 'in' || z === 'sg' ? T.box : T.brick;
        else img = tileAt(w, tx, ty - 1) === 1 ? T[z + 'Fill'] : T[z + 'Top'];
        f.drawImage(img, tx * TILE, ty * TILE);
        if (ty >= GR && tileAt(w, tx - 1, ty) !== 1) { f.fillStyle = '#00000050'; f.fillRect(tx * TILE, ty * TILE + (tileAt(w, tx, ty - 1) === 1 ? 0 : 2), 2, TILE); }
        if (ty >= GR && tileAt(w, tx + 1, ty) !== 1) { f.fillStyle = '#00000050'; f.fillRect(tx * TILE + 14, ty * TILE + (tileAt(w, tx, ty - 1) === 1 ? 0 : 2), 2, TILE); }
      } else if (t === 2) f.drawImage(z === 'in' || z === 'sg' ? T.shelf : z === 'gr' || z === 'ng' || z === 'dg' ? T.branch : T.awning, tx * TILE, ty * TILE);
    }
  }
  w.back = back; w.front = front;
  const [cl, cg] = cv(72, 22);
  cg.fillStyle = w.bg.clouds || '#fff';
  for (const [x, y, ww, h] of [[8, 10, 56, 10], [18, 4, 22, 8], [38, 6, 18, 6], [0, 14, 72, 6]]) cg.fillRect(x, y, ww, h);
  w.cloud = cl;
}

// ------------------------------------------------------------------ physics
function moveBody(w, b, walls) {
  b.hitWall = 0;
  let nx = b.x + b.vx * DT;
  const top = b.y - b.h + 1, bot = b.y - 1;
  if (b.vx !== 0) {
    const edge = nx + (b.vx > 0 ? b.w / 2 : -b.w / 2), tx = Math.floor(edge / TILE);
    for (let ty = Math.floor(top / TILE); ty <= Math.floor(bot / TILE); ty++)
      if (tileAt(w, tx, ty) === 1) { nx = b.vx > 0 ? tx * TILE - b.w / 2 - 0.01 : (tx + 1) * TILE + b.w / 2 + 0.01; b.hitWall = sgn(b.vx); b.vx = 0; break; }
  }
  if (walls) { const l = w.lockL + b.w / 2 + 2, r = w.lockR - b.w / 2 - 2; if (nx < l) { nx = l; b.hitWall = -1; } else if (nx > r) { nx = r; b.hitWall = 1; } }
  b.x = nx;
  let ny = b.y + b.vy * DT;
  const was = b.grounded;
  b.grounded = false; b.ride = null;
  const lx = Math.floor((b.x - b.w / 2 + 1) / TILE), rx = Math.floor((b.x + b.w / 2 - 1) / TILE);
  if (b.vy >= 0) {
    const ty = Math.floor(ny / TILE);
    for (let tx = lx; tx <= rx; tx++) {
      const t = tileAt(w, tx, ty);
      if (t === 1 || (t === 2 && b.y <= ty * TILE + 0.5 && !(b.drop > 0))) { ny = ty * TILE; b.vy = 0; b.grounded = true; break; }
    }
    if (!b.grounded && !(b.drop > 0)) for (const m of w.movers)
      if (b.x > m.x - m.w / 2 - 4 && b.x < m.x + m.w / 2 + 4 && b.y <= m.y + 1.5 && ny >= m.y) { ny = m.y; b.vy = 0; b.grounded = true; b.ride = m; break; }
  } else {
    const ty = Math.floor((ny - b.h) / TILE);
    for (let tx = lx; tx <= rx; tx++) if (tileAt(w, tx, ty) === 1) { ny = (ty + 1) * TILE + b.h; b.vy = 0; break; }
  }
  b.y = ny;
  b.landed = !was && b.grounded;
}
const groundDist = (w, b) => { const t0 = Math.floor(b.y / TILE); for (let ty = t0; ty < t0 + 8; ty++) { const t = tileAt(w, Math.floor(b.x / TILE), ty); if (t === 1 || (t === 2 && ty * TILE >= b.y - 1)) return ty * TILE - b.y; } return 999; };
const groundAhead = (w, e, dir) => tileAt(w, Math.floor((e.x + dir * (e.w / 2 + 6)) / TILE), Math.floor((e.y + 4) / TILE)) !== 0;
const overlap = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

// ------------------------------------------------------------------ effects
function spark(w, x, y, col, n = 6, sp = 120, grav = 300, life = 0.35) {
  for (let i = 0; i < n && w.fx.length < 260; i++) {
    const a = rnd(6.283), s = sp * rnd(0.35, 1);
    w.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: life * rnd(0.6, 1.2), max: life, col, size: rnd() < 0.4 ? 3 : 2, grav });
  }
}
function dust(w, x, y, n = 4) { for (let i = 0; i < n && w.fx.length < 260; i++) w.fx.push({ x: x + rnd(-6, 6), y, vx: rnd(-40, 40), vy: rnd(-30, -5), life: rnd(0.2, 0.4), max: 0.4, col: '#e8e4f0', size: 3, grav: -20 }); }
function star(w, x, y, col = '#ffffff', big = false) { w.fx.push({ x, y, vx: 0, vy: 0, life: 0.12, max: 0.12, col, star: big ? 9 : 6 }); }
function num(w, x, y, str, col = '#ffffff') { if (w.nums.length < 24) w.nums.push({ x, y, t: 0, str, col }); }
function shake(w, a) { w.cam.shake = Math.max(w.cam.shake, a); }

// ------------------------------------------------------------------ enemies
function spawnEnemy(w, t, x, y, arena) {
  const d = EDEF[t];
  const e = {
    t, x, y, vx: 0, vy: 0, w: d.w, h: d.h, face: -1, hp: d.hp, maxHp: d.hp, state: 'idle', st: 0, grounded: false, hitT: 0, stun: 0,
    home: x, dead: false, cd: rnd(0.6, 1.6), boss: !!d.boss, fly: !!d.fly, arena, spawnT: arena ? 0.5 : 0, inv: 0, hop: rnd(0.5), seen: -1, turn: 0,
    phase: 1, form: 1, dmgOn: false, n: 0, n2: 0, drop: 0, name: d.name,
  };
  if (d.hero) { e.spr = sprites(d.hero, HERO_KEYS); e.scale = d.scale || 1; }
  if (d.boss) { e.state = 'intro'; e.cd = 1; w.boss = e; }
  w.enemies.push(e);
  if (arena) { spark(w, x, y - d.h / 2, '#f0abfc', 10, 90, 0, 0.4); spark(w, x, y - d.h / 2, '#22d3ee', 8, 70, 0, 0.4); }
  return e;
}
const setE = (e, s) => { e.state = s; e.st = 0; };

function hitEnemy(w, e, h) {
  if (e.dead || e.inv > 0 || e.spawnT > 0) return false;
  const p = w.player;
  let dmg = h.dmg, guarded = false;
  const front = sgn(h.fromX - e.x) === e.face;
  const breaker = h.fin || h.weapon || h.special;
  if (e.t === 'knight' && front && e.state !== 'rec' && e.state !== 'stag' && e.state !== 'hit') {
    if (breaker) { setE(e, 'stag'); e.vx = -e.face * 60; sfx('heavy'); num(w, e.x, e.y - 40, 'KIRILDI!', '#facc15'); }
    else guarded = true;
  }
  if (e.t === 'doner' && e.shield && e.shieldDown <= 0 && front && e.state !== 'dizzy') {
    if (h.weapon || h.special) { e.shieldDown = 4.5; sfx('heavy'); num(w, e.x, e.y - 90, 'LAVAŞ DÜŞTÜ!', '#facc15'); spark(w, e.x + e.face * 26, e.y - 44, '#f1d9a7', 14, 150); }
    else guarded = true;
  }
  if (guarded) {
    dmg = Math.max(1, Math.round(dmg * 0.2));
    e.hp -= dmg; e.hitT = 0.05; sfx('clang'); star(w, e.x + e.face * 10, h.y, '#e2e8f0');
    num(w, e.x, e.y - e.h - 6, 'BLOK', '#94a3b8');
    if (e.hp <= 0) killEnemy(w, e, h);
    return true;
  }
  if (e.boss) dmg = Math.max(1, Math.round(dmg * (e.state === 'dizzy' ? 1.5 : 0.6)));
  e.hp -= dmg; e.hitT = 0.12;
  num(w, e.x + rnd(-4, 4), e.y - e.h - 4, String(dmg), h.fin || h.special ? '#facc15' : '#ffffff');
  star(w, (e.x + h.fromX) / 2 + sgn(e.x - h.fromX) * 6, h.y, '#ffffff', h.fin);
  spark(w, e.x, h.y, h.col || '#fde68a', h.fin ? 10 : 5, h.fin ? 170 : 110);
  sfx(h.fin || h.special ? 'heavy' : 'hit');
  if (e.hp <= 0) { if (e.t === 'buglord' && e.form < 3) bugNext(w, e); else killEnemy(w, e, h); return true; }
  if (e.boss) { if (e.t === 'goblin' && e.state === 'dizzy') e.vx = 0; return true; }
  e.vx = h.kx; e.vy = h.ky; if (h.ky < -60) e.grounded = false;
  e.stun = 0.28 + (h.launch ? 0.45 : h.fin ? 0.2 : 0);
  if (e.state !== 'stag') setE(e, 'hit');
  e.dmgOn = false;
  return true;
}
// Bug Lord: form 1 -> CRASH -> (cutscene, player bounces back) -> short final form
function bugNext(w, e) {
  const p = w.player;
  w.shots = w.shots.filter((s) => s.friendly);
  for (const o of w.enemies) if (o !== e && !o.dead) killEnemy(w, o, { fromX: e.x, kx: 0, ky: -200 });
  shake(w, 10); sfx('boom'); w.flash = 0.4; e.vx = 0;
  if (e.form === 1) { e.form = 2; e.hp = e.maxHp = 260; e.phase = 2; e.name = 'BUG LORD: CRASH'; e.n = 0; setE(e, 'roar'); e.inv = 1.4; w.crash = true; num(w, e.x, e.y - 120, 'CRASH!', '#60a5fa'); }
  else { e.hp = 1; e.inv = 99; setE(e, 'crashed'); w.crashHold = 0; p.state = 'ko'; p.st = 0.8; p.vx = 0; w.events.push({ type: 'cut', id: 'bugCrash' }); }
}
function killEnemy(w, e, h) {
  e.dead = true; e.state = 'ko'; e.st = 0; e.vx = (h.kx || 0) * 1.2 + sgn(e.x - h.fromX) * 60; e.vy = Math.min(h.ky || 0, -190); e.grounded = false; e.dmgOn = false;
  w.stats.kos++;
  sfx(e.boss ? 'boom' : 'ko'); shake(w, e.boss ? 10 : 4);
  const n = e.boss ? 24 : EDEF[e.t].drop;
  for (let i = 0; i < n; i++) w.picks.push({ k: 'sticker', x: e.x + rnd(-8, 8), y: e.y - e.h / 2, vx: rnd(-90, 90), vy: rnd(-260, -120), t: rnd(6) });
  if (!e.boss && rnd() < 0.1) w.picks.push({ k: 'simit', x: e.x, y: e.y - 10, vx: 0, vy: -200, t: 0 });
  if (e.boss) {
    w.hitstop = 0.25; w.flash = 0.5; w.bossDead = 1.8;
    for (const o of w.enemies) if (!o.dead && o !== e) killEnemy(w, o, { fromX: e.x, kx: 0, ky: -200 });
    w.shots = w.shots.filter((s) => s.friendly);
    if (e.t === 'doner') for (let i = 0; i < 3; i++) w.picks.push({ k: 'doneri', x: e.x + rnd(-20, 20), y: e.y - 40, vx: rnd(-80, 80), vy: rnd(-300, -200), t: 0 });
  }
}
// melee strike from the player (or a friendly projectile) against everything hittable
function strike(w, bx, by, bw, bh, h, set) {
  let n = 0;
  for (const e of w.enemies) {
    if (e.dead || (set && set.has(e))) continue;
    if (overlap(bx, by, bw, bh, e.x - e.w / 2, e.y - e.h, e.w, e.h)) { if (hitEnemy(w, e, h)) { n++; if (set) set.add(e); } }
  }
  for (const c of w.crates) {
    if (c.hp <= 0 || (set && set.has(c))) continue;
    if (overlap(bx, by, bw, bh, c.x - 11, c.y - 20, 22, 20)) {
      if (set) set.add(c);
      c.hp -= h.fin || h.weapon || h.special ? 2 : 1; c.shake = 0.15; n++; sfx('crate'); star(w, c.x, c.y - 10);
      if (c.hp <= 0) breakCrate(w, c);
    }
  }
  if (!h.shot) for (const s of w.shots) {
    if (s.k === 'env' && !s.friendly && overlap(bx, by, bw, bh, s.x - 7, s.y - 5, 14, 10)) { s.friendly = true; s.vx = -s.vx * 1.5; s.vy = -s.vy * 0.5; s.dmg = 12; s.life = 2; n++; sfx('clang'); star(w, s.x, s.y, '#fde68a', true); }
  }
  return n;
}
function breakCrate(w, c) {
  spark(w, c.x, c.y - 10, '#b7793e', 12, 150); spark(w, c.x, c.y - 10, '#f8e8c4', 5, 100);
  if (c.drop === 'stickers') for (let i = 0; i < 6; i++) w.picks.push({ k: 'sticker', x: c.x, y: c.y - 10, vx: rnd(-70, 70), vy: rnd(-240, -140), t: rnd(6) });
  else { w.picks.push({ k: c.drop, x: c.x, y: c.y - 8, vx: 0, vy: -180, t: 0 }); for (let i = 0; i < 2; i++) w.picks.push({ k: 'sticker', x: c.x, y: c.y - 10, vx: rnd(-70, 70), vy: rnd(-220, -140), t: rnd(6) }); }
}
export function hurtPlayer(w, dmg, fromX, kx = 150, ky = -170) {
  const p = w.player;
  if (p.inv > 0 || p.state === 'ko' || p.state === 'win' || w.over) return false;
  p.hp -= dmg; p.inv = 1.1; p.combo = 0; p.en = Math.min(1, p.en + 0.03);
  p.vx = sgn(p.x - fromX) * kx; p.vy = ky; p.grounded = false; p.state = 'hit'; p.st = 0; p.queue = null;
  shake(w, 5); w.hitstop = 0.06; sfx('hurt'); spark(w, p.x, p.y - 18, '#f87171', 8, 130); num(w, p.x, p.y - 40, '-' + dmg, '#f87171');
  p.kb = p.hp > 0; p.kbT = 0.25;
  if (p.hp <= 0) { p.hp = 0; p.state = 'ko'; p.lives--; p.inv = 9; p.vy = -230; sfx('ko'); w.hitstop = 0.18; shake(w, 9); }
  return true;
}
function hitPlayerBox(w, x, y, bw, bh, dmg, fromX, kx, ky) {
  const p = w.player;
  if (overlap(x, y, bw, bh, p.x - 6, p.y - 28, 12, 28)) return hurtPlayer(w, dmg, fromX, kx, ky);
  return false;
}

function stepEnemy(w, e) {
  const p = w.player, d = EDEF[e.t];
  e.st += DT; if (e.hitT > 0) e.hitT -= DT; if (e.inv > 0) e.inv -= DT; if (e.cd > 0) e.cd -= DT;
  if (e.spawnT > 0) { e.spawnT -= DT; if (!e.fly) { e.vy += GRAV * DT; moveBody(w, e, !!e.arena); } return; }
  if (e.dead) {
    e.vy += GRAV * DT; e.vx *= 0.98; e.x += e.vx * DT; e.y += e.vy * DT;
    if (e.y > FLOOR && e.vy > 0 && e.st < 5 && tileAt(w, Math.floor(e.x / TILE), GR) === 1) { e.y = FLOOR; e.vy = e.vy > 120 ? -e.vy * 0.3 : 0; e.vx *= 0.5; }
    if (e.boss && e.st < 1.4 && Math.random() < 0.5) { spark(w, e.x + rnd(-24, 24), e.y - rnd(e.h), pick(['#fde68a', '#fb923c', '#ffffff']), 5, 160); if (Math.random() < 0.15) sfx('boom'); }
    return;
  }
  const dx = p.x - e.x, adx = Math.abs(dx), dir = sgn(dx), dy = p.y - e.y;
  const active = Math.abs(e.x - (w.cam.x + w.VW / 2)) < w.VW / 2 + 50 || e.arena;
  const pDown = p.state === 'ko' || w.over;
  if (e.t === 'slime') {
    if (e.state === 'hit') { if (e.st > e.stun && e.grounded) setE(e, 'idle'); }
    else if (e.state === 'tele') { e.vx = 0; if (e.st > 0.38) { setE(e, 'atk'); e.vx = e.face * 175; e.vy = -175; e.grounded = false; e.dmgOn = true; } }
    else if (e.state === 'atk') { if (e.dmgOn && hitPlayerBox(w, e.x - 9, e.y - 14, 18, 14, 8, e.x)) e.dmgOn = false; if (e.grounded && e.st > 0.1) { e.dmgOn = false; e.cd = rnd(1, 1.7); setE(e, 'rec'); dust(w, e.x, e.y); } }
    else if (e.state === 'rec') { e.vx *= 0.8; if (e.st > 0.6) setE(e, 'idle'); }
    else if (e.grounded) {
      e.vx *= 0.7; e.hop -= DT;
      const chase = active && (adx < 170 || e.arena) && !pDown;
      if (chase) e.face = dir;
      if (chase && adx < 48 && Math.abs(dy) < 30 && e.cd <= 0 && w.tokens < 2) { setE(e, 'tele'); w.tokens++; }
      else if (e.hop <= 0) {
        e.hop = chase ? rnd(0.45, 0.7) : rnd(0.9, 1.6);
        let hd = chase ? (adx > 40 ? dir : -dir) : sgn(e.home + rnd(-40, 40) - e.x);
        if (!groundAhead(w, e, hd)) hd = -hd;
        if (!chase) e.face = hd;
        e.vx = hd * (chase ? 78 : 40); e.vy = -150; e.grounded = false;
      }
    }
  } else if (e.t === 'troll') {
    if (e.state === 'hit') { if (e.st > e.stun && e.grounded) setE(e, 'idle'); }
    else if (e.state === 'tele') { e.vx = 0; e.face = dir; if (e.st > 0.5) { setE(e, 'throw'); w.shots.push({ k: 'ayran', sp: 'cup', x: e.x + e.face * 8, y: e.y - 24, vx: (p.x + p.vx * 0.3 - e.x) / 0.75, vy: -300, dmg: 9, life: 5, col: '#f8fafc' }); sfx('throw'); } }
    else if (e.state === 'throw') { e.vx = 0; if (e.st > 0.35) { e.cd = rnd(1.8, 2.8); setE(e, 'idle'); } }
    else if (active && !pDown) {
      e.face = dir;
      let mv = adx > 150 ? dir : adx < 85 ? -dir : 0; // keeps its distance and lobs coffee
      if (mv && !groundAhead(w, e, mv)) mv = 0;
      e.vx = mv * 95;
      if (e.hitWall && e.grounded) { e.vy = -270; e.grounded = false; }
      if (adx < 260 && adx > 50 && e.cd <= 0 && w.tokens < 3 && e.grounded) { setE(e, 'tele'); w.tokens++; }
    } else e.vx *= 0.8;
  } else if (e.t === 'imp' || e.t === 'clone') {
    if (e.state === 'hit') { if (e.st > e.stun && e.grounded) setE(e, 'idle'); }
    else if (e.state === 'tele') { e.vx *= 0.7; if (e.st > 0.3) { setE(e, 'atk'); e.dmgOn = true; sfx('dash'); } }
    else if (e.state === 'atk') { e.vx = e.face * 235; if (e.dmgOn && hitPlayerBox(w, e.x - 8 + e.face * 6, e.y - 26, 16, 24, 9, e.x)) e.dmgOn = false; if (e.st > 0.3 || e.hitWall || !groundAhead(w, e, e.face)) { e.dmgOn = false; e.vx *= 0.3; e.cd = rnd(1, 1.7); setE(e, 'rec'); } }
    else if (e.state === 'rec') { const away = -dir; e.face = dir; e.vx = groundAhead(w, e, away) ? away * 95 : 0; if (e.st > 0.5) setE(e, 'idle'); }
    else if (e.state === 'hopb') { if (e.grounded && e.st > 0.1) setE(e, 'idle'); }
    else if (active && !pDown) {
      e.face = dir;
      // reacts to the player's swing with a back-hop, once per swing
      if (ATK[p.state] && p.atkId !== e.seen && adx < 54 && e.grounded) { e.seen = p.atkId; if (Math.random() < 0.3) { e.vx = -dir * 170; e.vy = -170; e.grounded = false; setE(e, 'hopb'); } }
      if (e.state === 'idle') {
        const want = e.cd > 0 ? 78 : 50;
        let mv = adx > want + 8 ? dir : adx < want - 14 ? -dir : 0;
        if (mv && !groundAhead(w, e, mv)) mv = 0;
        e.vx = mv * 132;
        if (e.hitWall && e.grounded) { e.vy = -270; e.grounded = false; }
        if (adx < 62 && Math.abs(dy) < 34 && e.cd <= 0 && w.tokens < 2 && e.grounded) { setE(e, 'tele'); w.tokens++; }
      }
    } else e.vx *= 0.8;
  } else if (e.t === 'bot') {
    if (e.state === 'hit') { e.vy += GRAV * 0.6 * DT; e.vx *= 0.95; if (e.st > e.stun) setE(e, 'idle'); }
    else {
      const side = e.x < p.x ? -1 : 1;
      const tx = active && !pDown ? p.x + side * 98 : e.home, ty = (active ? p.y : FLOOR) - 62 + Math.sin(w.t * 2 + e.home) * 8 - (adx < 46 ? 34 : 0);
      e.vx += clamp((tx - e.x) * 2 - e.vx, -200, 200) * DT * 3; e.vy += clamp((ty - e.y) * 2 - e.vy, -200, 200) * DT * 3;
      e.vx = clamp(e.vx, -70, 70); e.vy = clamp(e.vy, -60, 60); e.face = dir;
      if (e.state === 'tele') { e.vx *= 0.85; e.vy *= 0.85; if (e.st > 0.55) { const a = Math.atan2(p.y - 16 - (e.y - 12), dx); w.shots.push({ k: 'env', x: e.x + dir * 8, y: e.y - 12, vx: Math.cos(a) * 128, vy: Math.sin(a) * 128, dmg: 8, life: 3 }); sfx('shoot'); e.cd = rnd(2, 3); setE(e, 'idle'); } }
      else if (active && !pDown && e.cd <= 0 && adx < 230 && w.tokens < 3) { setE(e, 'tele'); w.tokens++; sfx('warn'); }
    }
    e.x += e.vx * DT; e.y += e.vy * DT; e.y = Math.min(e.y, FLOOR - 6);
    if (e.arena) e.x = clamp(e.x, w.lockL + 12, w.lockR - 12);
    return;
  } else if (e.t === 'knight') {
    if (e.state === 'hit') { if (e.st > e.stun && e.grounded) setE(e, 'idle'); }
    else if (e.state === 'stag') { e.vx *= 0.85; if (e.st > 1.3) setE(e, 'idle'); }
    else if (e.state === 'tele') { e.vx = 0; if (e.st > 0.55) { setE(e, 'atk'); e.dmgOn = true; sfx('swing'); } }
    else if (e.state === 'atk') { e.vx = 0; if (e.st > 0.08 && e.dmgOn) { e.dmgOn = false; shake(w, 3); dust(w, e.x + e.face * 24, e.y, 5); sfx('heavy'); hitPlayerBox(w, e.x + (e.face > 0 ? 2 : -38), e.y - 34, 36, 34, 16, e.x, 210, -190); } if (e.st > 0.3) { e.cd = rnd(1.2, 1.8); setE(e, 'rec'); } }
    else if (e.state === 'rec') { e.vx = 0; if (e.st > 0.9) setE(e, 'idle'); }
    else if (active && !pDown) {
      if (dir !== e.face) { e.turn += DT; if (e.turn > 0.55) { e.face = dir; e.turn = 0; } } else e.turn = 0;
      let mv = adx > 30 ? e.face : 0;
      if (mv && !groundAhead(w, e, mv)) mv = 0;
      e.vx = mv * 36;
      if (adx < 38 && dir === e.face && Math.abs(dy) < 36 && e.cd <= 0 && w.tokens < 2) { setE(e, 'tele'); w.tokens++; }
    } else e.vx = 0;
  } else if (e.t === 'goblin') stepGoblin(w, e, dx, adx, dir, pDown);
  else if (e.t === 'doner') stepDoner(w, e, dx, adx, dir, pDown);
  else if (e.t === 'spam') { stepSpam(w, e, dx, adx, dir, pDown); return; }
  else if (e.t === 'buglord') stepBug(w, e, dx, adx, dir, pDown);
  if (e.state === 'tele' && e.st < DT * 1.5 && !e.boss && e.t !== 'bot') sfx('warn');
  e.vy = Math.min(e.vy + GRAV * DT, 460);
  const pvx = e.vx;
  moveBody(w, e, !!e.arena);
  if (e.hitWall && e.state === 'hit' && !e.boss && Math.abs(pvx) > 110) { // knocked into a wall: bounce off
    e.vx = -pvx * 0.55; e.vy = Math.min(e.vy, -110); e.grounded = false; e.hp -= 3; star(w, e.x + e.hitWall * 8, e.y - e.h / 2, '#fde68a'); num(w, e.x, e.y - e.h - 6, 'BONK', '#fde68a'); sfx('hit');
    if (e.hp <= 0) killEnemy(w, e, { fromX: e.x - e.hitWall, kx: 0, ky: 0 });
  }
  if (e.y > WORLD_H + 60 && !e.dead) killEnemy(w, e, { fromX: e.x, kx: 0, ky: 0 });
}
function bossPhase(w, e) {
  if (e.phase === 1 && e.hp <= e.maxHp / 2) {
    e.phase = 2; setE(e, 'roar'); e.inv = 1.1; e.vx = 0; shake(w, 8); sfx('boom'); w.flash = 0.25;
    num(w, e.x, e.y - e.h - 14, 'İKİNCİ AŞAMA!', '#f87171');
    return true;
  }
  return false;
}

const POEMS = ['GÜL KIRMIZI, GÖK MAVİ, ABONE OL, ÇIKMA SAKIN.', 'İNBOKSUNDA AŞK VAR, TIKLA DA GÖR!', 'ŞİİR YAZDIM SPAM GİBİ: SİLEMEZSİN HİÇ.', 'KUĞU GİBİ ZARİF, TUĞLA GİBİ DÜŞER!'];
function stepSpam(w, e, dx, adx, dir, pDown) {
  const p = w.player, poet = e.phase === 2, fast = poet ? 0.7 : 1, lo = w.lockL + 40, hi = w.lockR - 40;
  if (poet) e.name = 'GLITCH ŞAİR';
  if (e.sayT > 0) e.sayT -= DT;
  e.face = dir; e.hide = e.state === 'blink' && e.st < 0.25;
  const sink = e.state === 'dizzy' ? FLOOR : FLOOR - 12 + Math.sin(w.t * 2.5) * 3;
  e.y += (sink - e.y) * 0.15; e.vx = e.vy = 0;
  if (e.state === 'intro') { if (e.st > 0.7) setE(e, 'idle'); }
  else if (e.state === 'roar') { if (e.st > 1.2) { setE(e, 'idle'); e.cd = 0.5; } }
  else if (e.state === 'idle') {
    e.x = clamp(e.x + (adx < 80 ? -dir : adx > 210 ? dir : 0) * 55 * DT, lo, hi);
    if (bossPhase(w, e)) return;
    if (e.cd <= 0 && !pDown) {
      const bots = w.enemies.filter((o) => o.t === 'bot' && !o.dead).length;
      const r = pick(poet ? ['tele', 'tele', 'blink', 'poem', 'poem', 'summon'] : ['tele', 'tele', 'blink', 'summon']);
      e.n = 0; setE(e, r === 'summon' && bots >= 2 ? 'tele' : r);
      if (e.state === 'tele') sfx('warn');
    }
  } else if (e.state === 'tele') { if (e.st > 0.55 * fast) { setE(e, 'barrage'); e.n = 0; } }
  else if (e.state === 'barrage') {
    const count = poet ? 5 : 3;
    if (e.st > e.n * 0.26 * fast + 0.05 && e.n < count) {
      const a = Math.atan2(p.y - 18 - (e.y - 34), p.x - e.x) + (e.n - (count - 1) / 2) * 0.17, sp = poet ? 142 : 124;
      w.shots.push({ k: 'env', x: e.x + dir * 12, y: e.y - 34, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: 8, life: 4 }); sfx('shoot'); e.n++;
    }
    if (e.st > count * 0.26 * fast + 0.5) { setE(e, 'dizzy'); e.long = false; } // spent: floats down, open to attack
  } else if (e.state === 'blink') {
    e.inv = Math.max(e.inv, 0.1);
    if (e.st >= 0.25 && !e.n) { e.n = 1; e.x = clamp(p.x + (Math.random() < 0.5 ? -1 : 1) * rnd(110, 170), lo, hi); sfx('glitch'); spark(w, e.x, e.y - 30, '#f0abfc', 10, 100, 0, 0.4); spark(w, e.x, e.y - 30, '#22d3ee', 8, 80, 0, 0.4); }
    if (e.st > 0.55) { setE(e, 'idle'); e.cd = 0.3; }
  } else if (e.state === 'summon') {
    if (e.st > 0.4 && !e.n) { e.n = 1; sfx('glitch'); for (const s of [-1, 1]) spawnEnemy(w, 'bot', clamp(e.x + s * 70, lo, hi), FLOOR - 80, e.arena); }
    if (e.st > 1) { setE(e, 'idle'); e.cd = 0.9 * fast; }
  } else if (e.state === 'poem') {
    if (!e.say || e.st < DT * 1.5) { e.say = pick(POEMS); e.sayT = 2.6; sfx('devin'); }
    const count = 6;
    if (e.st > 0.7 && e.st > 0.7 + e.n * 0.2 && e.n < count) { w.shots.push({ k: 'marker', x: clamp(e.n ? p.x + rnd(-130, 130) : p.x, w.lockL + 20, w.lockR - 20), y: FLOOR, vx: 0, vy: 0, life: 0.8, dmg: 0, then: 'tblock', bw: 28, bh: 14, v: Math.floor(rnd(4)) }); sfx('swing'); e.n++; }
    if (e.st > 0.7 + count * 0.2 + 0.9) { setE(e, 'idle'); e.cd = 0.6; }
  } else if (e.state === 'dizzy') { if (e.st > (e.long ? 2.6 : poet ? 1.4 : 1.8)) { setE(e, 'idle'); e.cd = 0.6; e.long = false; } }
}
function stepBug(w, e, dx, adx, dir, pDown) {
  const p = w.player, f = e.form, fast = f === 3 ? 0.65 : 1;
  const touch = () => hitPlayerBox(w, e.x - 15, e.y - 56, 30, 56, 14, e.x, 230, -210);
  e.hide = e.state === 'blink' && e.st < 0.14;
  if (e.state === 'intro') { e.face = dir; if (e.st > 0.7) setE(e, 'idle'); }
  else if (e.state === 'roar') { e.vx = 0; if (e.st > (f === 1 ? 1 : 1.1)) { setE(e, 'idle'); e.cd = 0.5; } }
  else if (e.state === 'crashed') { e.vx = 0; }
  else if (e.state === 'idle') {
    e.face = dir; e.vx = f !== 2 && adx > 90 && groundAhead(w, e, dir) ? dir * 62 : f === 2 && adx > 70 ? dir * 28 : 0;
    if (e.cd <= 0 && !pDown && e.grounded) {
      e.vx = 0; e.n = e.n || 0;
      if (f === 2) {
        if (e.n >= 2) { e.n = 0; setE(e, 'dizzy'); sfx('glitch'); num(w, e.x, e.y - 120, 'AŞIRI ISINDI!', '#fde68a'); }
        else if (Math.random() < 0.5) setE(e, 'errors'); else { setE(e, 'slamT'); e.n++; sfx('warn'); }
      } else {
        const clones = w.enemies.some((o) => o.t === 'clone' && !o.dead), r = pick(f === 1 ? ['teleS', 'teleS', 'lunge', 'cast'] : ['teleS', 'lunge', 'lunge', 'teleS']);
        if (r === 'teleS') { setE(e, 'teleS'); e.tx = clamp(p.x + sgn(p.x - e.x) * 38, w.lockL + 24, w.lockR - 24); w.shots.push({ k: 'marker', x: e.tx, y: FLOOR, vx: 0, vy: 0, life: 0.55 * fast, dmg: 0, then: 'none', wd: 26 }); sfx('warn'); }
        else if (r === 'lunge') { setE(e, 'teleC'); sfx('warn'); }
        else setE(e, clones ? 'teleC' : 'cast');
      }
    }
  } else if (e.state === 'teleS') { e.vx = 0; if (e.st > 0.55 * fast) { setE(e, 'blink'); sfx('glitch'); spark(w, e.x, e.y - 30, '#22d3ee', 12, 100, 0, 0.4); } }
  else if (e.state === 'blink') {
    e.vx = 0; e.inv = Math.max(e.inv, 0.1);
    if (e.st >= 0.14 && !e.n2) { e.n2 = 1; e.x = e.tx; e.face = sgn(p.x - e.x); sfx('glitch'); spark(w, e.x, e.y - 30, '#f0abfc', 12, 110, 0, 0.4); }
    if (e.st > 0.2) { e.n2 = 0; setE(e, 'slash'); sfx('swing'); e.dmgOn = true; }
  } else if (e.state === 'slash') {
    e.vx = 0;
    if (e.dmgOn && e.st > 0.08) { e.dmgOn = false; shake(w, 3); hitPlayerBox(w, e.face > 0 ? e.x : e.x - 54, e.y - 52, 54, 44, 14, e.x, 220, -180); spark(w, e.x + e.face * 30, e.y - 30, '#a3e635', 8, 150); }
    if (e.st > 0.45) { setE(e, 'rec'); }
  } else if (e.state === 'teleC') { e.vx = 0; if (e.st > 0.65 * fast) { setE(e, 'charge'); sfx('dash'); } }
  else if (e.state === 'charge') {
    e.vx = e.face * (f === 3 ? 310 : 255); touch();
    if (Math.random() < 0.5) dust(w, e.x - e.face * 14, e.y, 1);
    if (e.hitWall) { setE(e, 'dizzy'); e.vx = -e.face * 70; e.vy = -150; shake(w, 9); sfx('boom'); spark(w, e.x + e.face * 16, e.y - 30, '#fde68a', 14, 180); }
    else if (e.st > 1.4) setE(e, 'rec');
  } else if (e.state === 'cast') {
    e.vx = 0;
    if (e.st > 0.6 && !e.n2) { e.n2 = 1; sfx('glitch'); for (const s of [-1, 1]) spawnEnemy(w, 'clone', clamp(p.x + s * 90, w.lockL + 24, w.lockR - 24), FLOOR, e.arena); }
    if (e.st > 1) { e.n2 = 0; setE(e, 'rec'); }
  } else if (e.state === 'errors') {
    e.vx = 0;
    if (e.st > 0.5 + e.n2 * 0.22 && e.n2 < 7) { w.shots.push({ k: 'marker', x: clamp(p.x + rnd(-150, 150) * (e.n2 % 2 ? 1 : 0.4), w.lockL + 20, w.lockR - 20), y: FLOOR, vx: 0, vy: 0, life: 0.8, dmg: 0, then: 'errwin', bw: 26, bh: 18 }); sfx('swing'); e.n2++; }
    if (e.st > 0.5 + 7 * 0.22 + 0.9) { e.n2 = 0; setE(e, 'rec'); }
  } else if (e.state === 'slamT') {
    e.vx = 0;
    if (!e.n2) { e.n2 = 1; w.shots.push({ k: 'marker', x: clamp(p.x, w.lockL + 24, w.lockR - 24), y: FLOOR, vx: 0, vy: 0, life: 0.95, dmg: 0, then: 'hand', bw: 36, bh: 56, wd: 40 }); }
    if (e.st > 1.6) { e.n2 = 0; setE(e, 'rec'); }
  } else if (e.state === 'dizzy') { e.vx *= 0.85; if (e.st > (f === 3 ? 1.1 : f === 2 ? 2.4 : 1.6)) { setE(e, 'idle'); e.cd = 0.5; } }
  else if (e.state === 'rec') { e.vx = 0; if (e.st > 0.7 * fast) { setE(e, 'idle'); e.cd = rnd(0.4, 0.8) * fast; } }
}
function stepGoblin(w, e, dx, adx, dir, pDown) {
  const p = w.player, fast = e.phase === 2 ? 0.7 : 1;
  const touch = () => hitPlayerBox(w, e.x - 15, e.y - 56, 30, 56, 14, e.x, 230, -210);
  if (e.state === 'intro') { e.face = dir; if (e.st > 0.7) setE(e, 'idle'); }
  else if (e.state === 'roar') { if (e.st > 0.5 && e.n !== 99) { e.n = 99; for (const s of [-1, 1]) spawnEnemy(w, 'imp', clamp(e.x + s * 70, w.lockL + 20, w.lockR - 20), FLOOR, e.arena); } if (e.st > 1) { e.n = 0; setE(e, 'idle'); e.cd = 0.4; } }
  else if (e.state === 'idle') {
    e.vx *= 0.8; e.face = dir;
    if (bossPhase(w, e)) return;
    if (e.cd <= 0 && !pDown && e.grounded) {
      const r = Math.random();
      e.n = 0;
      if (r < 0.4 && adx > 70) { setE(e, 'teleC'); sfx('warn'); }
      else if (r < 0.72) { setE(e, 'throw'); }
      else { setE(e, 'teleL'); sfx('warn'); }
    }
  } else if (e.state === 'teleC') { e.vx = 0; if (e.st > 0.7 * fast) { setE(e, 'charge'); sfx('dash'); } }
  else if (e.state === 'charge') {
    e.vx = e.face * (e.phase === 2 ? 255 : 215); touch();
    if (Math.random() < 0.5) dust(w, e.x - e.face * 14, e.y, 1);
    if (e.hitWall) { setE(e, 'dizzy'); e.vx = -e.face * 70; e.vy = -150; shake(w, 9); sfx('boom'); spark(w, e.x + e.face * 16, e.y - 30, '#fde68a', 14, 180); }
    else if (e.st > 1.6) { setE(e, 'rec'); }
  } else if (e.state === 'dizzy') { e.vx *= 0.9; if (e.st > (e.phase === 2 ? 1.5 : 1.9)) { setE(e, 'idle'); e.cd = 0.5; } }
  else if (e.state === 'throw') {
    e.vx = 0; e.face = dir;
    const count = e.phase === 2 ? 5 : 3;
    if (e.st > 0.3 + e.n * 0.28 && e.n < count) { e.n++; const tx = p.x + rnd(-36, 36) + (e.n - 2) * 22; w.shots.push({ k: 'clock', x: e.x + e.face * 16, y: e.y - 60, vx: (tx - e.x) / 0.95, vy: -300, dmg: 12, life: 6, fuse: 1 }); sfx('throw'); }
    if (e.st > 0.5 + count * 0.28) { setE(e, 'rec'); }
  } else if (e.state === 'teleL') { e.vx = 0; if (e.st > 0.45 * fast) { setE(e, 'leap'); e.vx = clamp(dx / 0.75, -260, 260); e.vy = -360; e.grounded = false; sfx('jump'); } }
  else if (e.state === 'leap') {
    if (e.vy > 0) touch();
    if (e.grounded && e.st > 0.2) { e.vx = 0; shake(w, 8); sfx('boom'); dust(w, e.x, e.y, 10); for (const s of [-1, 1]) w.shots.push({ k: 'shock', x: e.x + s * 18, y: FLOOR, vx: s * 120, vy: 0, dmg: 10, life: 1.5 }); setE(e, 'rec'); }
  } else if (e.state === 'rec') { e.vx *= 0.8; if (e.st > 0.55 * fast) { setE(e, 'idle'); e.cd = rnd(0.5, 1) * fast; } }
}
function stepDoner(w, e, dx, adx, dir, pDown) {
  const p = w.player, fast = e.phase === 2 ? 0.75 : 1;
  if (e.shieldDown > 0) e.shieldDown -= DT;
  if (e.state === 'intro') { e.face = dir; if (e.st > 0.7) setE(e, 'idle'); }
  else if (e.state === 'roar') { if (e.st > 1) { e.shield = true; e.shieldDown = 0; setE(e, 'idle'); e.cd = 0.4; } }
  else if (e.state === 'idle') {
    e.face = dir; e.vx = adx > 120 ? dir * 26 : 0;
    if (bossPhase(w, e)) return;
    if (e.cd <= 0 && !pDown) {
      const r = Math.random(); e.n = 0;
      if (r < 0.4) { setE(e, 'teleS'); sfx('warn'); } else if (r < 0.7) setE(e, 'ayran'); else { setE(e, 'shave'); sfx('warn'); }
    }
  } else if (e.state === 'teleS') { e.vx = 0; if (e.st > 0.7 * fast) { setE(e, 'spin'); e.n = 0; sfx('dash'); } }
  else if (e.state === 'spin') {
    e.vx = e.face * (e.phase === 2 ? 250 : 200);
    hitPlayerBox(w, e.x - 22, e.y - 70, 44, 70, 14, e.x, 240, -200);
    if (Math.random() < 0.4) spark(w, e.x - e.face * 20, e.y - rnd(60), '#d08a52', 1, 60);
    if (e.hitWall) { e.n++; e.face = -e.face; shake(w, 5); sfx('heavy'); if (e.n >= (e.phase === 2 ? 3 : 2)) { setE(e, 'dizzy'); e.vx = 0; } }
  } else if (e.state === 'dizzy') { e.vx *= 0.85; if (e.st > (e.phase === 2 ? 1.4 : 1.8)) { setE(e, 'idle'); e.cd = 0.6; } }
  else if (e.state === 'ayran') {
    e.vx = 0; e.face = dir;
    const count = e.phase === 2 ? 4 : 3;
    if (e.st > 0.35 + e.n * 0.32 && e.n < count) { e.n++; const tx = p.x + p.vx * 0.5 + rnd(-24, 24); w.shots.push({ k: 'ayran', x: e.x + e.face * 28, y: e.y - 70, vx: (tx - (e.x + e.face * 28)) / 1.0, vy: -330, dmg: 10, life: 6 }); sfx('throw'); }
    if (e.st > 0.6 + count * 0.32) { setE(e, 'rec'); }
  } else if (e.state === 'shave') {
    e.vx = 0;
    const count = e.phase === 2 ? 7 : 5;
    if (e.st > 0.4 + e.n * 0.22 && e.n < count) { e.n++; w.shots.push({ k: 'marker', x: clamp(p.x + (e.n % 2 ? -1 : 1) * (e.n - 1) * 18 + rnd(-8, 8), w.lockL + 16, w.lockR - 16), y: FLOOR, vx: 0, vy: 0, life: 0.75, dmg: 0 }); sfx('swing'); }
    if (e.st > 0.8 + count * 0.22) { setE(e, 'rec'); }
  } else if (e.state === 'rec') { e.vx = 0; if (e.st > 0.6 * fast) { setE(e, 'idle'); e.cd = rnd(0.5, 1) * fast; } }
}

// ------------------------------------------------------------------ player
const take = (inp, k) => { if (inp[k] > 0) { inp[k] = 0; return true; } return false; };
function setP(p, s) { p.state = s; p.st = 0; p.queue = null; if (ATK[s]) { p.hitSet.clear(); p.atkId++; p.fired = false; } }
const dmOf = (p) => p.dmgMul * (p.don > 0 ? 1.5 : 1) * (p.pow > 0 ? 1.5 : 1);
function approach(v, t, d) { return v < t ? Math.min(v + d, t) : Math.max(v - d, t); }

function stepPlayer(w, inp) {
  const p = w.player;
  p.st += DT; if (p.inv > 0) p.inv -= DT; if (p.dashCd > 0) p.dashCd -= DT; if (p.drop > 0) p.drop -= DT; if (p.cay > 0) p.cay -= DT; if (p.don > 0) p.don -= DT; if (p.pow > 0) p.pow -= DT;
  if (p.landT > 0) p.landT -= DT; if (p.airJumpT > 0) p.airJumpT -= DT; if (p.comboT > 0) { p.comboT -= DT; if (p.comboT <= 0) p.combo = 0; }
  if (p.coy > 0) p.coy -= DT;
  const dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0), spd = 118 * (p.cay > 0 ? 1.3 : 1), A = ATK[p.state];
  // GERİ SEK: JUMP just before or on landing after a knock-back bounces Akın back up
  if (p.kb && p.state !== 'ko' && p.state !== 'win' && inp.jump > 0 && (p.grounded || (p.vy > 0 && groundDist(w, p) <= p.vy * 0.25 + 4))) {
    inp.jump = 0; p.kb = false; p.vy = -310; p.vx *= 0.3; p.grounded = false; p.jumps = 1; p.cut = true; p.inv = Math.max(p.inv, 0.5); p.en = Math.min(1, p.en + 0.2);
    setP(p, 'jump'); w.fx.push({ ring: 1, x: p.x, y: p.y - 14, vx: 0, vy: 0, life: 0.42, max: 0.42, col: '#7cf0ff' }); spark(w, p.x, p.y - 8, '#7cf0ff', 10, 130, 0, 0.35);
    num(w, p.x, p.y - 44, 'GERİ SEK!', '#7cf0ff'); sfx('boing'); w.hitstop = 0.04; w.stats.bounces = (w.stats.bounces || 0) + 1;
  }
  let grav = true;
  if (p.state === 'ko') {
    p.vx *= 0.94;
    if (p.st > 1.5 && w.crashHold === undefined) {
      if (p.lives <= 0) { if (!w.over) { w.over = true; w.events.push({ type: 'gameover' }); } }
      else { p.hp = p.maxHp; p.x = p.safeX; p.y = p.safeY; p.vx = p.vy = 0; p.inv = 2; setP(p, 'idle'); spark(w, p.x, p.y - 16, '#7cf0ff', 16, 120, 0); sfx('power'); }
    }
  } else if (p.state === 'win') { p.vx *= 0.8; }
  else if (p.state === 'hit') { if (p.st > 0.3) setP(p, p.grounded ? 'idle' : 'fall'); }
  else if (p.state === 'dash') {
    grav = false; p.vy = 0; p.vx = p.face * 270;
    if (p.st > 0.19) { p.vx *= 0.35; setP(p, p.grounded ? 'idle' : 'fall'); }
  } else if (A) {
    if (p.grounded) p.vx = approach(p.vx, 0, 900 * DT); else if (dir) p.vx = approach(p.vx, dir * spd, 500 * DT);
    const dm = dmOf(p);
    if (p.state === 'slam') {
      p.vy = 400; p.vx *= 0.9;
      const set = p.hitSet;
      strike(w, p.x - 10, p.y - 20, 20, 24, { dmg: Math.round(8 * dm), kx: p.face * 60, ky: -120, fromX: p.x, y: p.y - 8, fin: true }, set);
    } else if (p.state === 'special') {
      p.vx = 0; p.inv = Math.max(p.inv, 0.1);
      if (!p.fired && p.st >= 0.22) { p.fired = true; w.shots.push({ k: 'wave', friendly: true, x: p.x + p.face * 18, y: p.y, vx: p.face * 210, vy: 0, dmg: Math.round(26 * dm), life: 1.1, special: true, hit: new Set() }); shake(w, 8); w.flash = 0.2; sfx('special'); spark(w, p.x + p.face * 16, p.y - 20, '#7cf0ff', 18, 200, 0); }
    } else if (p.state === 'throw') {
      if (!p.fired && p.st >= 0.1 && p.weapon) {
        p.fired = true; const wp = p.weapon;
        if (wp.k === 'topac') w.shots.push({ k: 'topac', friendly: true, weapon: true, x: p.x + p.face * 12, y: p.y - 18, vx: p.face * 165, vy: -90, dmg: Math.round(7 * dm), life: 3.4, cdMap: new Map() });
        else w.shots.push({ k: 'pebble', friendly: true, weapon: true, x: p.x + p.face * 12, y: p.y - 20, vx: p.face * 350, vy: -20, dmg: Math.round(7 * dm), life: 0.9 });
        sfx('throw'); if (--wp.ammo <= 0) p.weapon = null;
      }
    } else {
      const kl = p.weapon && p.weapon.k === 'klavye' && p.state !== 'air' && p.state !== 'upper';
      if (p.st >= A.a0 && p.st <= A.a1) {
        const bw = A.bw + (kl ? 10 : 0), bx = p.face > 0 ? p.x - 2 : p.x + 2 - bw;
        const before = p.hitSet.size;
        const n = strike(w, bx, p.y + A.by, bw, A.bh, { dmg: Math.round((A.dmg + (kl ? 4 : 0)) * dm), kx: p.face * A.kx, ky: A.ky, fromX: p.x, y: p.y + A.by + A.bh / 2, fin: A.fin, launch: A.launch, col: kl ? '#22d3ee' : '#fde68a' }, p.hitSet);
        if (n && p.hitSet.size > before) {
          w.hitstop = Math.max(w.hitstop, A.hs); shake(w, A.fin ? 5 : 2);
          p.combo += n; p.comboT = 1.6; w.stats.maxCombo = Math.max(w.stats.maxCombo, p.combo);
          p.en = Math.min(1, p.en + 0.055 * n * p.enMul);
          if (kl && --p.weapon.ammo <= 0) { p.weapon = null; num(w, p.x, p.y - 44, 'KLAVYE KIRILDI', '#94a3b8'); }
          if (p.state === 'air') { p.vy = Math.min(p.vy, -150); }
        }
      }
      if (p.state === 'upper' && p.st > 0.06 && !p.fired) { p.fired = true; p.vy = -255; p.grounded = false; }
      if (A.next && inp.atk > 0 && p.st > 0.04) { inp.atk = 0; p.queue = A.next; }
      if ((p.state === 'p1' || p.state === 'p2') && inp.kick > 0 && p.st > 0.04) { inp.kick = 0; p.queue = inp.d ? 'upper' : 'kick'; }
      if (p.queue && p.st >= A.cancel) { const q = p.queue; if (dir) p.face = dir; setP(p, q); p.vx = p.face * ATK[q].lunge; sfx('swing'); }
      else if (p.st >= A.dur || (p.state === 'air' && p.grounded)) setP(p, p.grounded ? 'idle' : 'fall');
    }
    if (p.state === 'special' || p.state === 'throw') { if (p.st >= A.dur) setP(p, p.grounded ? 'idle' : 'fall'); }
    if (A && take(inp, 'dash') && p.dashCd <= 0 && p.state !== 'special' && p.state !== 'slam' && (p.grounded || p.airDash)) startDash(w, p, dir);
  } else {
    if (dir) { p.face = dir; p.vx = approach(p.vx, dir * spd, (p.grounded ? 1500 : 900) * DT); }
    else p.vx = approach(p.vx, 0, (p.grounded ? 1700 : 350) * DT);
    if (take(inp, 'jump')) {
      if (inp.d && p.grounded && tileAt(w, Math.floor(p.x / TILE), Math.floor((p.y + 2) / TILE)) === 2) { p.drop = 0.22; p.grounded = false; }
      else if (inp.d && p.ride) { p.drop = 0.22; p.grounded = false; }
      else if (p.grounded || p.coy > 0) { p.vy = -305; p.grounded = false; p.coy = 0; p.jumps = 1; p.cut = false; sfx('jump'); dust(w, p.x, p.y, 3); }
      else if (p.jumps > 0) { p.vy = -275; p.jumps--; p.cut = false; p.airJumpT = 0.22; sfx('djump'); spark(w, p.x, p.y, '#7cf0ff', 6, 70, 0, 0.25); }
    }
    if (!inp.jumpHeld && p.vy < -130 && !p.cut) { p.vy = -130; p.cut = true; }
    if (take(inp, 'dash') && p.dashCd <= 0 && (p.grounded || p.airDash)) startDash(w, p, dir);
    else if (take(inp, 'spec')) { if (p.en >= 1) { p.en = 0; setP(p, 'special'); sfx('power'); } else num(w, p.x, p.y - 44, 'ENERJİ YOK', '#94a3b8'); }
    else if (take(inp, 'use')) { if (p.weapon && p.weapon.k !== 'klavye') setP(p, 'throw'); }
    else if (take(inp, 'kick')) { if (p.grounded) { setP(p, inp.d ? 'upper' : 'kick'); p.vx = p.face * ATK[p.state].lunge || 0; } else { setP(p, 'slam'); } sfx('swing'); }
    else if (take(inp, 'atk')) { setP(p, p.grounded ? 'p1' : 'air'); if (p.grounded) p.vx = p.face * ATK.p1.lunge; sfx('swing'); }
    else p.state = p.grounded ? (Math.abs(p.vx) > 12 ? 'run' : 'idle') : p.vy < 0 ? 'jump' : 'fall';
  }
  if (grav) p.vy = Math.min(p.vy + GRAV * DT, 440);
  const wasG = p.grounded, rode = p.ride;
  moveBody(w, p, true);
  if (rode && p.ride === rode) p.x += rode.dx;
  if (p.kb && p.grounded && (p.kbT -= DT) <= 0) p.kb = false;
  if (wasG && !p.grounded && p.vy >= 0 && !(p.drop > 0)) { p.coy = 0.09; p.jumps = Math.min(p.jumps, 1); }
  if (p.landed) {
    p.jumps = 2; p.airDash = true; p.landT = 0.08; dust(w, p.x, p.y, 3);
    if (p.state === 'slam') {
      shake(w, 6); sfx('heavy'); dust(w, p.x, p.y, 10);
      const dm = dmOf(p), set = new Set();
      const n = strike(w, p.x - 34, p.y - 22, 68, 26, { dmg: Math.round(ATK.slam.dmg * dm), kx: 0, ky: ATK.slam.ky, fromX: p.x, y: p.y - 6, fin: true }, set);
      if (n) { w.hitstop = 0.07; p.combo += n; p.comboT = 1.6; p.en = Math.min(1, p.en + 0.05 * n * p.enMul); }
      setP(p, 'idle'); p.landT = 0.14;
    }
  }
  if (p.grounded && !p.ride && p.state !== 'ko' && tileAt(w, Math.floor(p.x / TILE), Math.floor((p.y + 2) / TILE)) === 1 && !w.arena) { p.safeX = p.x; p.safeY = p.y; }
  else if (p.grounded && !p.ride && w.arena && p.state !== 'ko') { p.safeX = p.x; p.safeY = p.y; }
  // hazards
  if (p.state !== 'ko') {
    if (p.y > WORLD_H + 30) {
      p.x = p.safeX; p.y = p.safeY; p.vx = p.vy = 0; p.inv = 0;
      hurtPlayer(w, 15, p.x, 0, -120);
    } else if (tileAt(w, Math.floor(p.x / TILE), Math.floor((p.y - 2) / TILE)) === 3 && p.y > (GR - 1) * TILE + 6) hurtPlayer(w, 12, p.x - p.face, 120, -260);
  }
  p.x = clamp(p.x, 8, w.pxw - 8);
}
function startDash(w, p, dir) {
  if (dir) p.face = dir;
  if (!p.grounded) p.airDash = false;
  setP(p, 'dash'); p.inv = Math.max(p.inv, 0.22); p.dashCd = 0.45; sfx('dash'); dust(w, p.x, p.y, 4);
}

// bounce pads launch anything that lands on them
function stepPads(w) {
  const p = w.player;
  for (const pd of w.pads) {
    if (pd.t > 0) pd.t -= DT;
    for (const b of [p, ...w.enemies]) {
      if (b !== p && (b.dead || b.boss || b.fly || b.spawnT > 0)) continue;
      if (b === p && (p.state === 'ko' || p.state === 'dash')) continue;
      if (b.vy < 0 || Math.abs(b.x - pd.x) > 12 || b.y < pd.y - 1 || b.y > pd.y + 7) continue;
      b.vy = -545; b.grounded = false; pd.t = 0.35; sfx('boing'); spark(w, pd.x, pd.y - 8, '#fca5a5', 6, 90, 0, 0.3);
      if (b === p) { p.jumps = 1; p.airDash = true; p.cut = true; p.coy = 0; if (!ATK[p.state] || p.state === 'slam') p.state = 'jump'; } else { b.state = 'hit'; b.st = 0; b.stun = 0.5; }
    }
  }
}
// ------------------------------------------------------------------ projectiles and pickups
function explode(w, x, y, r, dmg, col) {
  spark(w, x, y, col, 16, 190); spark(w, x, y, '#ffffff', 8, 120); star(w, x, y, '#fde68a', true); shake(w, 5); sfx('boom');
  const p = w.player;
  if (Math.abs(p.x - x) < r + 6 && Math.abs(p.y - 14 - y) < r + 14) hurtPlayer(w, dmg, x);
}
function stepShots(w) {
  const p = w.player;
  for (let i = w.shots.length - 1; i >= 0; i--) {
    const s = w.shots[i];
    if (!s) continue; // a boss kill can replace the array mid-loop
    s.life -= DT; s.t = (s.t || 0) + DT;
    let dead = s.life <= 0;
    if (s.k === 'env') {
      s.x += s.vx * DT; s.y += s.vy * DT;
      if (s.friendly) { for (const e of w.enemies) if (!e.dead && overlap(s.x - 6, s.y - 5, 12, 10, e.x - e.w / 2, e.y - e.h, e.w, e.h)) {
        if (hitEnemy(w, e, { dmg: s.dmg, kx: sgn(s.vx) * 120, ky: -120, fromX: s.x - s.vx, y: s.y, fin: true, shot: true }) && e.t === 'spam' && !e.dead && (e.state === 'barrage' || e.state === 'tele' || e.state === 'idle')) { setE(e, 'dizzy'); e.long = true; num(w, e.x, e.y - e.h - 16, 'GERİ GELDİ!', '#fde68a'); }
        dead = true; break;
      } }
      else if (hitPlayerBox(w, s.x - 5, s.y - 4, 10, 8, s.dmg, s.x - s.vx, 110, -120)) dead = true;
      if (tileAt(w, Math.floor(s.x / TILE), Math.floor(s.y / TILE)) === 1) { dead = true; spark(w, s.x, s.y, '#f8fafc', 4, 70); }
    } else if (s.k === 'clock') {
      if (!s.landed) { s.vy += GRAV * DT; s.x += s.vx * DT; s.y += s.vy * DT; s.x = clamp(s.x, w.lockL + 8, w.lockR - 8); if (s.y >= FLOOR && s.vy > 0) { s.y = FLOOR; s.landed = true; sfx('warn'); } }
      else { s.fuse -= DT; if (s.fuse <= 0) { explode(w, s.x, s.y - 6, 26, s.dmg, '#ef4444'); dead = true; } }
    } else if (s.k === 'ayran') {
      s.vy += GRAV * DT; s.x += s.vx * DT; s.y += s.vy * DT;
      if (hitPlayerBox(w, s.x - 5, s.y - 12, 10, 12, s.dmg, s.x)) dead = true;
      if (s.y >= FLOOR && s.vy > 0) { dead = true; spark(w, s.x, FLOOR - 2, '#ffffff', 12, 150); spark(w, s.x, FLOOR - 2, s.col || '#bae6fd', 6, 100); sfx('crate'); if (Math.abs(p.x - s.x) < 24 && p.y > FLOOR - 20) hurtPlayer(w, s.dmg, s.x); }
    } else if (s.k === 'marker') {
      if (dead && s.then !== 'none') w.shots.push({ k: s.then || 'meat', x: s.x, y: w.cam.y - 10, vx: 0, vy: s.then === 'hand' ? 820 : 280, dmg: s.then === 'hand' ? 18 : s.then ? 12 : 10, life: 3, bw: s.bw, bh: s.bh, v: s.v });
    } else if (s.k === 'meat' || s.k === 'tblock' || s.k === 'errwin' || s.k === 'hand') {
      s.y += s.vy * DT;
      const bw = s.bw || 10, bh = s.bh || 8;
      if (hitPlayerBox(w, s.x - bw / 2, s.y - bh, bw, bh, s.dmg, s.x)) dead = true;
      if (s.y >= FLOOR) {
        dead = true; spark(w, s.x, FLOOR - 2, s.k === 'meat' ? '#9a5530' : s.k === 'tblock' ? '#fde68a' : '#93c5fd', 8, 120); dust(w, s.x, FLOOR, 3); sfx('crate');
        if (s.k === 'hand') { shake(w, 9); sfx('boom'); dust(w, s.x, FLOOR, 8); for (const d of [-1, 1]) w.shots.push({ k: 'shock', x: s.x + d * 22, y: FLOOR, vx: d * 130, vy: 0, dmg: 10, life: 1.4 }); }
      }
    } else if (s.k === 'shock') {
      s.x += s.vx * DT;
      if (hitPlayerBox(w, s.x - 6, s.y - 12, 12, 12, s.dmg, s.x - s.vx)) dead = true;
      if (s.x < w.lockL + 6 || s.x > w.lockR - 6) dead = true;
    } else if (s.k === 'topac') {
      s.vy += GRAV * DT; s.x += s.vx * DT; s.y += s.vy * DT;
      const tx = Math.floor((s.x + sgn(s.vx) * 7) / TILE);
      if (tileAt(w, tx, Math.floor((s.y - 6) / TILE)) === 1 || s.x < w.lockL + 6 || s.x > w.lockR - 6) { s.vx = -s.vx; s.x += s.vx * DT * 2; spark(w, s.x, s.y - 6, '#facc15', 3, 60); }
      const t = tileAt(w, Math.floor(s.x / TILE), Math.floor(s.y / TILE));
      if (s.vy > 0 && (t === 1 || t === 2) && s.y - s.vy * DT <= Math.floor(s.y / TILE) * TILE + 1) { s.y = Math.floor(s.y / TILE) * TILE; s.vy = 0; if (Math.random() < 0.3) spark(w, s.x, s.y, '#fde68a', 1, 40); }
      for (const [e, t0] of s.cdMap) if (w.t - t0 > 0.35) s.cdMap.delete(e);
      const set = new Set(s.cdMap.keys()), before = set.size;
      strike(w, s.x - 8, s.y - 16, 16, 16, { dmg: s.dmg, kx: sgn(s.vx) * 60, ky: -110, fromX: s.x - s.vx, y: s.y - 8, weapon: true, shot: true, col: '#facc15' }, set);
      if (set.size > before) { for (const e of set) if (!s.cdMap.has(e)) s.cdMap.set(e, w.t); w.hitstop = Math.max(w.hitstop, 0.03); p.en = Math.min(1, p.en + 0.03 * p.enMul); }
      if (s.y > WORLD_H + 20) dead = true;
      if (dead) spark(w, s.x, s.y - 6, '#dc2626', 8, 100);
    } else if (s.k === 'pebble') {
      s.vy += 200 * DT; s.x += s.vx * DT; s.y += s.vy * DT;
      const set = new Set();
      if (strike(w, s.x - 4, s.y - 4, 8, 8, { dmg: s.dmg, kx: sgn(s.vx) * 90, ky: -60, fromX: s.x - s.vx, y: s.y, weapon: true, shot: true }, set)) { dead = true; p.en = Math.min(1, p.en + 0.03 * p.enMul); }
      if (tileAt(w, Math.floor(s.x / TILE), Math.floor(s.y / TILE)) === 1) { dead = true; spark(w, s.x, s.y, '#cbd5e1', 4, 80); }
    } else if (s.k === 'wave') {
      s.x += s.vx * DT;
      if (strike(w, s.x - 10, s.y - 44, 20, 44, { dmg: s.dmg, kx: sgn(s.vx) * 230, ky: -200, fromX: s.x - s.vx, y: s.y - 22, special: true, fin: true, shot: true, col: '#7cf0ff' }, s.hit)) w.hitstop = Math.max(w.hitstop, 0.06);
      if (Math.random() < 0.6) spark(w, s.x - sgn(s.vx) * 8, s.y - rnd(40), '#a5f3fc', 1, 40, 0, 0.3);
      if (s.x < w.cam.x - 30 || s.x > w.cam.x + w.VW + 30) dead = true;
    }
    if (dead) w.shots.splice(i, 1);
  }
}
const NAMES = { cay: 'ÇAY: HIZ!', doneri: 'DÖNER: CAN + GÜÇ!', simit: 'SİMİT', topac: 'TOPAÇ x3', sapan: 'SAPAN x8', klavye: 'KLAVYE!', rozet: 'ROZET BULDUN!' };
function collect(w, k, x, y) {
  const p = w.player;
  if (k === 'sticker') { w.stats.stickers++; sfx('coin'); spark(w, x, y, '#ff8c37', 3, 60, 0, 0.25); return; }
  sfx(k === 'rozet' ? 'flag' : 'pickup'); num(w, x, y - 16, NAMES[k], '#fde68a'); spark(w, x, y, '#fde68a', 10, 100, 0);
  if (k === 'cay') p.cay = 10;
  else if (k === 'doneri') { p.hp = Math.min(p.maxHp, p.hp + 50); p.don = 10; }
  else if (k === 'simit') p.hp = Math.min(p.maxHp, p.hp + 18);
  else if (k === 'rozet') w.stats.badges++;
  else if (k === 'topac') p.weapon = { k, ammo: (p.weapon && p.weapon.k === k ? p.weapon.ammo : 0) + 3 };
  else if (k === 'sapan') p.weapon = { k, ammo: (p.weapon && p.weapon.k === k ? p.weapon.ammo : 0) + 8 };
  else if (k === 'klavye') p.weapon = { k, ammo: 16 };
}
function stepPicks(w) {
  const p = w.player;
  for (let i = w.picks.length - 1; i >= 0; i--) {
    const k = w.picks[i];
    k.t += DT;
    if (!k.fixed) {
      k.vy += GRAV * DT; k.x += (k.vx || 0) * DT; k.y += k.vy * DT;
      const ty = Math.floor(k.y / TILE), t = tileAt(w, Math.floor(k.x / TILE), ty);
      if (k.vy > 0 && (t === 1 || t === 2) && k.y - k.vy * DT <= ty * TILE + 2) { k.y = ty * TILE; k.vy = k.vy > 90 ? -k.vy * 0.4 : 0; k.vx = (k.vx || 0) * 0.6; }
      if (k.y > WORLD_H + 40) { w.picks.splice(i, 1); continue; }
    }
    const dx = p.x - k.x, dy = p.y - 14 - k.y;
    if (k.t > 0.25 && p.state !== 'ko') {
      if (k.k === 'sticker' && Math.abs(dx) < 34 && Math.abs(dy) < 34) { k.fixed = true; k.x += dx * 0.2; k.y += dy * 0.2; }
      if (Math.abs(dx) < 12 && Math.abs(dy) < 18) { collect(w, k.k, k.x, k.y); w.picks.splice(i, 1); }
    }
  }
}

// ------------------------------------------------------------------ arenas, checkpoints, hints
function stepFlow(w) {
  const p = w.player, lv = w.lv;
  for (const m of w.movers) { const nx = m.bx + Math.sin((w.t / m.period) * 6.283 + m.phase) * m.range; m.dx = nx - m.x; m.x = nx; }
  if (!w.arena) {
    for (const a of lv.arenas) if (a.state === 0 && p.x > a.x0 * TILE + 76) {
      a.state = 1; a.wave = -1; a.wait = 0.3; w.arena = a;
      w.lockL = a.x0 * TILE; w.lockR = Math.max(a.x1 * TILE, w.lockL + w.VW);
      if (a.boss) { const b = spawnEnemy(w, a.boss, w.lockR - 70, FLOOR, a); b.spawnT = 0; if (a.cut && !a.cutDone) { a.cutDone = true; w.events.push({ type: 'cut', id: a.cut }); } w.events.push({ type: 'music', id: 'boss' }); }
      break;
    }
  } else {
    const a = w.arena;
    if (a.boss) { if (w.bossDead !== undefined) { w.bossDead -= DT; if (w.bossDead <= 0 && !w.over) { w.over = true; a.state = 2; w.arena = null; setP(p, 'win'); w.events.push({ type: 'clear' }); } } }
    else if (!w.enemies.some((e) => e.arena === a && !e.dead)) {
      a.wait -= DT;
      if (a.wait <= 0) {
        a.wave++;
        if (a.wave >= a.waves.length) { a.state = 2; w.arena = null; w.lockL = 0; w.lockR = w.pxw; w.go = 3; sfx('flag'); }
        else {
          a.wait = 0.8;
          a.waves[a.wave].forEach((t, i) => {
            let right = i % 2 === 0;
            let x = right ? w.lockR - 34 - (i >> 1) * 22 : w.lockL + 34 + (i >> 1) * 22;
            if (Math.abs(x - p.x) < 70) x = right ? w.lockL + 34 : w.lockR - 34;
            spawnEnemy(w, t, x, t === 'bot' ? FLOOR - 80 : FLOOR, a);
          });
          sfx('warn');
        }
      }
    }
  }
  for (const f of w.flags) if (!f.on && Math.abs(p.x - f.x) < 14 && p.state !== 'ko') {
    f.on = true; w.check = { x: f.x, y: FLOOR }; sfx('flag'); spark(w, f.x + 8, f.y - 24, '#ff8c37', 14, 120, 0); num(w, f.x, f.y - 44, 'KAYIT NOKTASI', '#fde68a');
    p.hp = Math.min(p.maxHp, p.hp + 25);
    if (f.npc && !f.npc.given) { f.npc.given = true; w.picks.push({ k: f.npc.gift, x: f.x + 30, y: FLOOR - 30, vx: 20, vy: -220, t: 0 }); w.hint = { t: 5, text: f.npc.say, who: f.npc.id }; }
  }
  if (w.hintI < lv.hints.length && p.x > lv.hints[w.hintI].x * TILE) { w.hint = { t: 6, text: lv.hints[w.hintI].t, who: 'devin' }; w.hintI++; sfx('devin'); }
  if (w.hint) { w.hint.t -= DT; if (w.hint.t <= 0) w.hint = null; }
  if (lv.goal !== undefined && !w.over && !w.arena && p.x >= lv.goal * TILE && p.state !== 'ko') { w.over = true; p.vx = 0; setP(p, 'win'); w.events.push({ type: 'clear' }); }
  if (lv.calm !== undefined && !w.calm && p.x > lv.calm * TILE) { w.calm = true; w.enemies.length = 0; w.shots.length = 0; w.events.push({ type: 'music', id: 'calm' }); }
  if (w.crashHold !== undefined && (w.crashHold += DT) > 5) storyAction(w, 'bounceBack'); // safety net if the cutscene never calls it
  if (w.go > 0) w.go -= DT;
  // Devin tosses a simit when things look bad
  w.devinCd -= DT;
  if (p.hp < p.maxHp * 0.3 && p.state !== 'ko' && w.devinCd <= 0) { w.devinCd = 45; w.picks.push({ k: 'simit', x: w.devin.x, y: w.devin.y, vx: (p.x - w.devin.x) * 1.2, vy: -160, t: 0 }); w.hint = { t: 3.5, text: 'AL BUNU, SİMİT İYİ GELİR!', who: 'devin' }; sfx('devin'); }
  const tx = p.x - p.face * 30, ty = p.y - 52 + Math.sin(w.t * 3) * 3;
  w.devin.x += (tx - w.devin.x) * 0.06; w.devin.y += (ty - w.devin.y) * 0.08;
}
// Restart from the last checkpoint after a game over.
export function continueFromCheckpoint(w) {
  const p = w.player, a = w.arena;
  if (a) { w.enemies = w.enemies.filter((e) => e.arena !== a); a.state = 0; a.wave = -1; w.arena = null; w.boss = null; w.bossDead = undefined; }
  w.shots.length = 0; w.lockL = 0; w.lockR = w.pxw; w.over = false;
  p.lives = 3; p.hp = p.maxHp; p.x = w.check.x; p.y = w.check.y; p.safeX = p.x; p.safeY = p.y; p.vx = p.vy = 0; p.inv = 2; p.en = 0; setP(p, 'idle');
  w.cam.x = clamp(p.x - w.VW / 2, 0, w.pxw - w.VW);
}
export function storyAction(w, name) {
  const p = w.player;
  if (name === 'kidnap') removeStoryNpc(w);
  else if (name === 'moral') {
    const had = w.save.moral; w.save.moral = true;
    if (!had) { p.maxHp += 20; p.hp = p.maxHp; num(w, p.x, p.y - 46, 'MORAL: +20 CAN', '#fde68a'); spark(w, p.x, p.y - 20, '#fde68a', 14, 90, 0, 0.7); sfx('power'); }
  } else if (name === 'bounceBack') {
    const e = w.enemies.find((o) => o.t === 'buglord' && o.state === 'crashed');
    if (!e) return;
    w.crash = false; w.crashHold = undefined; w.cheer = true; w.flash = 0.6;
    e.form = 3; e.hp = e.maxHp = 110; e.name = 'BUG LORD'; e.inv = 1.4; e.n = 0; setE(e, 'roar');
    p.hp = p.maxHp; p.en = 1; p.pow = 16; p.inv = 1.5; p.vx = p.vy = 0; setP(p, 'jump'); p.vy = -330; p.grounded = false;
    for (let i = 0; i < 3; i++) w.fx.push({ ring: 1, x: p.x, y: p.y - 14, vx: 0, vy: 0, life: 0.5 + i * 0.12, max: 0.5 + i * 0.12, col: i % 2 ? '#ffffff' : '#7cf0ff' });
    spark(w, p.x, p.y - 16, '#7cf0ff', 24, 160, 0, 0.6); num(w, p.x, p.y - 50, 'BOUNCE BACK!', '#7cf0ff'); sfx('power'); sfx('boing'); w.events.push({ type: 'music', id: 'boss' });
  } else if (name === 'free') {
    const n = w.npcs.find((o) => o.id === 'ozgur');
    if (n) { n.spr = sprites('ozgurFree', ['idle', 'win', 'hit']); spark(w, n.x, n.y - 24, '#f0abfc', 16, 120, 0, 0.7); num(w, n.x, n.y - 50, 'ÖZGÜR SERBEST!', '#f0abfc'); }
    w.cage = null; w.cheer = true; w.flash = 0.3; sfx('flag');
  }
}
export function removeStoryNpc(w) {
  for (const n of w.npcs) if (n.story) { for (let i = 0; i < 5; i++) spark(w, n.x + rnd(-8, 8), n.y - rnd(40), pick(['#f0abfc', '#22d3ee', '#a3e635']), 8, 140, 0, 0.6); }
  w.npcs = w.npcs.filter((n) => !n.story); w.flash = 0.4; shake(w, 8); sfx('boom');
}

// ------------------------------------------------------------------ tick
export function step(w, inp) {
  w.VWs = w.VW;
  if (w.hitstop > 0) { w.hitstop -= DT; return; }
  w.t += DT; if (!w.over) w.stats.time += DT;
  if (w.flash > 0) w.flash -= DT;
  w.tokens = 0;
  for (const e of w.enemies) if (!e.dead && (e.state === 'tele' || e.state === 'atk')) w.tokens++;
  stepPlayer(w, inp);
  for (const e of w.enemies) stepEnemy(w, e);
  for (let i = w.enemies.length - 1; i >= 0; i--) { const e = w.enemies[i]; if (e.dead && (e.st > (e.boss ? 2.2 : 1.1) || e.y > WORLD_H + 80)) { if (w.boss === e) w.boss = null; w.enemies.splice(i, 1); } }
  stepPads(w); stepShots(w); stepPicks(w); stepFlow(w);
  for (const c of w.crates) if (c.shake > 0) c.shake -= DT;
  for (let i = w.fx.length - 1; i >= 0; i--) { const f = w.fx[i]; f.life -= DT; if (f.life <= 0) { w.fx.splice(i, 1); continue; } if (!f.star) { f.vy += (f.grav || 0) * DT; f.x += f.vx * DT; f.y += f.vy * DT; } }
  for (let i = w.nums.length - 1; i >= 0; i--) { const n = w.nums[i]; n.t += DT; n.y -= 22 * DT; if (n.t > 0.8) w.nums.splice(i, 1); }
  const p = w.player;
  if (Math.random() < 0.2) { if (p.cay > 0) w.fx.push({ x: p.x + rnd(-6, 6), y: p.y - rnd(30), vx: 0, vy: -30, life: 0.4, max: 0.4, col: '#ffffff', size: 2, grav: 0 }); if (p.don > 0) w.fx.push({ x: p.x + rnd(-6, 6), y: p.y - rnd(30), vx: 0, vy: -30, life: 0.4, max: 0.4, col: '#fb923c', size: 2, grav: 0 }); }
  if (p.pow > 0 && Math.random() < 0.5) w.fx.push({ x: p.x + rnd(-8, 8), y: p.y - rnd(32), vx: 0, vy: -45, life: 0.45, max: 0.45, col: Math.random() < 0.5 ? '#7cf0ff' : '#ffffff', size: 2, grav: 0 });
  // camera
  const c = w.cam, lo = w.arena ? w.lockL : 0, hi = (w.arena ? w.lockR : w.pxw) - w.VW;
  const tx = clamp(p.x + p.face * 26 - w.VW / 2, lo, Math.max(lo, hi));
  c.x += (tx - c.x) * (w.arena ? 0.08 : 0.12);
  c.x = clamp(c.x, 0, Math.max(0, w.pxw - w.VW));
  const maxY = Math.max(0, WORLD_H - w.VH);
  c.y += (clamp(p.y - w.VH * 0.66, 0, maxY) - c.y) * 0.1;
  if (c.shake > 0) c.shake = Math.max(0, c.shake - 30 * DT);
}

// ------------------------------------------------------------------ rendering
function playerFrame(p, t) {
  const S = p.spr, s = p.state, A = ATK[s];
  if (s === 'idle') return p.landT > 0 ? S.jump[0] : S.idle[Math.floor(t * 6) % 4];
  if (s === 'run') return S.run[Math.floor(t * 13) % 6];
  if (s === 'jump' || s === 'fall') { if (p.airJumpT > 0) return S.jump[3]; return s === 'jump' ? S.jump[p.vy < -180 ? 1 : 2] : S.fall[Math.floor(t * 9) % 2]; }
  if (s === 'dash') return S.dash[Math.min(3, Math.floor((p.st / 0.2) * 4))];
  if (s === 'hit') return S.hit[Math.min(2, Math.floor((p.st / 0.3) * 3))];
  if (s === 'ko') return S.ko[p.st < 0.3 ? 0 : p.st < 0.55 ? 1 : 2];
  if (s === 'win') return S.win[Math.floor(t * 6) % 4];
  if (s === 'slam') return S.slam[Math.floor(t * 14) % 2];
  if (A) { const fr = S[A.anim]; return fr[Math.min(fr.length - 1, Math.floor((p.st / A.dur) * fr.length))]; }
  return S.idle[0];
}
function heroFrame(e, t) {
  const S = e.spr, s = e.state;
  if (e.dead) return S.ko[e.st < 0.25 ? 0 : e.st < 0.5 ? 1 : 2];
  if (s === 'hit' || s === 'stag' || s === 'dizzy') return S.hit[s === 'hit' ? Math.min(2, Math.floor(e.st * 10)) : 1 + (Math.floor(t * 8) % 2)];
  if (s === 'tele' || s === 'teleC' || s === 'teleL' || s === 'teleS' || s === 'roar' || s === 'cast' || s === 'errors' || s === 'slamT' || s === 'crashed') return S.tele[Math.floor(t * 10) % 2];
  if (s === 'slash') return S.smash[Math.min(2, Math.floor(e.st * 9))];
  if (s === 'atk' && e.t === 'knight') return S.smash[Math.min(2, 1 + Math.floor(e.st * 8))];
  if (s === 'atk' || s === 'charge') return S.dash[1 + (Math.floor(t * 14) % 2)];
  if (s === 'throw') return S.throw[Math.floor(e.st * 7) % 3];
  if (s === 'leap' || s === 'hopb' || !e.grounded) return e.vy < 0 ? S.jump[2] : S.fall[Math.floor(t * 9) % 2];
  if (Math.abs(e.vx) > 8) return S.run[Math.floor(t * (e.t === 'knight' ? 7 : 12) + e.home) % 6];
  return S.idle[Math.floor(t * 5 + e.home) % 4];
}
function drawHero(g, fr, x, y, face, scale = 1, white = false) {
  let c = white ? whiten(fr) : fr;
  if (face < 0) c = flipH(c);
  if (scale === 1) g.drawImage(c, Math.round(x - 32), Math.round(y - 58));
  else g.drawImage(c, Math.round(x - 32 * scale), Math.round(y - 58 * scale), 64 * scale, 64 * scale);
}
function shadow(g, x, y, r) { g.fillStyle = 'rgba(10,6,24,0.35)'; g.fillRect(Math.round(x - r), Math.round(y - 1), r * 2, 3); g.fillRect(Math.round(x - r + 2), Math.round(y - 2), r * 2 - 4, 1); g.fillRect(Math.round(x - r + 2), Math.round(y + 2), r * 2 - 4, 1); }

function bubble(g, str, ax, ay, VW, minY) { // pixel speech bubble whose tail points at (ax, ay)
  const lines = wrap(str, Math.min(190, VW - 30)), bw = Math.max(...lines.map((l) => textW(l))) + 10, bh = lines.length * 10 + 6;
  const bx = clamp(Math.round(ax - bw / 2), 4, VW - bw - 4), by = Math.max(minY, Math.round(ay - bh));
  g.fillStyle = '#141021'; g.fillRect(bx - 1, by - 1, bw + 2, bh + 2); g.fillStyle = '#fff7ed'; g.fillRect(bx, by, bw, bh);
  g.fillStyle = '#141021'; g.fillRect(clamp(Math.round(ax), bx + 4, bx + bw - 6), by + bh + 1, 3, 3);
  lines.forEach((l, i) => text(g, l, bx + 5, by + 2 + i * 10, '#141021'));
}
export function render(w, g, VW, VH) {
  w.VW = VW; w.VH = VH;
  const c = w.cam, t = w.t;
  if (!w.camInit) { w.camInit = true; c.y = clamp(w.player.y - VH * 0.66, 0, Math.max(0, WORLD_H - VH)); c.x = clamp(w.player.x - VW / 2, 0, Math.max(0, w.pxw - VW)); }
  const sx = c.shake > 0 ? Math.round(rnd(-1, 1) * c.shake * 0.4) : 0, sy = c.shake > 0 ? Math.round(rnd(-1, 1) * c.shake * 0.4) : 0;
  const cx = Math.round(c.x) + sx, oy = (VH > WORLD_H ? VH - WORLD_H : -Math.round(c.y)) + sy;
  // sky bands
  const sky = w.bg.sky, bh = Math.ceil((FLOOR + oy + 20) / sky.length);
  for (let i = 0; i < sky.length; i++) { g.fillStyle = sky[i]; g.fillRect(0, i * bh, VW, bh + 1); }
  g.fillStyle = sky[sky.length - 1]; g.fillRect(0, sky.length * bh, VW, VH);
  const B = w.bg;
  if (B.sun === 'dusk') { g.fillStyle = '#fde68a'; g.fillRect(VW * 0.7 - 12, 96 + oy * 0.2, 24, 24); g.fillStyle = '#fff7ed'; g.fillRect(VW * 0.7 - 8, 100 + oy * 0.2, 16, 16); for (let i = 0; i < 24; i++) { g.fillStyle = i % 3 ? '#ffffff90' : '#fde68a'; g.fillRect((i * 97 + 13) % VW, (i * 53) % 90, 1, 1); } }
  else if (B.sun === 'moon') { for (let i = 0; i < 46; i++) { g.fillStyle = (i + Math.floor(t * 1.5)) % 7 ? '#ffffff90' : '#ffffff'; g.fillRect((i * 89 + 7) % VW, (i * 47) % 120, 1, 1); } g.fillStyle = '#fef9c3'; g.fillRect(VW * 0.78 - 10, 30, 20, 20); g.fillRect(VW * 0.78 - 12, 33, 24, 14); g.fillStyle = '#e7dca0'; g.fillRect(VW * 0.78 - 4, 36, 4, 3); g.fillRect(VW * 0.78 + 3, 42, 3, 3); g.fillStyle = '#fffbe6'; g.fillRect(VW * 0.78 - 8, 32, 6, 3); }
  else if (B.sun === 'dawn') { g.fillStyle = '#fde2a8'; g.fillRect(VW * 0.28 - 18, 140 + oy * 0.2, 36, 36); g.fillStyle = '#fff4d6'; g.fillRect(VW * 0.28 - 12, 146 + oy * 0.2, 24, 24); for (let i = 0; i < 8; i++) { g.fillStyle = '#ffffff90'; g.fillRect((i * 97 + 13) % VW, (i * 53) % 50, 1, 1); } }
  else if (B.sun === 'day') { g.fillStyle = '#fff7c2'; g.fillRect(VW * 0.78 - 11, 30, 22, 22); g.fillStyle = '#ffffff'; g.fillRect(VW * 0.78 - 7, 34, 14, 14); }
  if (B.clouds) for (let i = 0; i < 4; i++) { const x = ((i * 190 - cx * 0.06 - t * (4 + i)) % (VW + 90) + VW + 90) % (VW + 90) - 80; g.globalAlpha = B.sun === 'moon' ? 0.5 : 0.85; g.drawImage(w.cloud, Math.round(x), 22 + i * 21 + Math.round(oy * 0.1)); g.globalAlpha = 1; }
  // parallax layers
  w.bg.layers.forEach((L, li) => {
    const lw = L.c.width, y = L.by - L.c.height + Math.round(oy * (0.3 + L.f * 0.7));
    let x = -Math.round((cx * L.f) % lw); if (x > 0) x -= lw;
    for (; x < VW; x += lw) g.drawImage(L.c, x, y);
    if (li === 1 && w.lv.bus) { const bx = ((t * 46 - cx * 0.5) % 1400 + 1400) % 1400 - 200; g.drawImage(SPR.props.bus, Math.round(bx), 194 + Math.round(oy * 0.8)); }
  });
  if (w.crash) { // blue screen: the whole venue goes BSOD while Bug Lord is crashing
    g.globalAlpha = 0.88; g.fillStyle = '#0a3fb8'; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1;
    text(g, ':(', 22, 44, '#ffffff', 5); text(g, 'BİLGİSAYARINDA BİR SORUN OLUŞTU.', 22, 94, '#ffffff'); text(g, 'BUG_LORD.EXE DURDURULDU. %' + (37 + Math.floor(t * 3) % 40) + ' TAMAMLANDI.', 22, 108, '#bfdbfe');
    for (let i = 0; i < 3; i++) { const q = Math.floor(t * 9) + i * 7; g.fillStyle = i % 2 ? '#22d3ee66' : '#f0abfc66'; g.fillRect((q * 53) % VW, (q * 31) % 200, 40 + (q * 13) % 90, 2); }
  }
  g.fillStyle = B.ground; g.fillRect(0, 242 + oy, VW, VH);
  g.drawImage(w.back, cx, 0, VW, WORLD_H, 0, oy, VW, WORLD_H);
  for (const ct of w.cats) draw(g, SPR.cat, Math.floor(t * 2 + ct.x) % 2, ct.x - cx, ct.y + oy, false);
  g.drawImage(w.front, cx, 0, VW, WORLD_H, 0, oy, VW, WORLD_H);
  // spikes
  const tx0 = Math.floor(cx / TILE), tx1 = tx0 + Math.ceil(VW / TILE) + 1;
  for (let tx = tx0; tx <= tx1; tx++) if (tileAt(w, tx, GR - 1) === 3) g.drawImage(SPR.tiles.spike[Math.floor(t * 6 + tx) % 2], tx * TILE - cx, (GR - 1) * TILE + oy);
  for (const m of w.movers) { const x = Math.round(m.x - m.w / 2 - cx), y = m.y + oy; g.fillStyle = '#141021'; g.fillRect(x - 1, y - 1, m.w + 2, 9); g.fillStyle = '#facc15'; g.fillRect(x, y, m.w, 7); g.fillStyle = '#141021'; for (let i = 2; i < m.w - 4; i += 10) g.fillRect(x + i, y + 2, 5, 5); g.fillStyle = '#fef08a'; g.fillRect(x, y, m.w, 1); g.fillStyle = '#64748b'; g.fillRect(x + 4, y + 8, 2, 4); g.fillRect(x + m.w - 6, y + 8, 2, 4); }
  const p = w.player;
  // flags + helpers, npcs
  for (const f of w.flags) { draw(g, SPR.flag, f.on ? 1 + (Math.floor(t * 6) % 2) : 0, f.x - cx, f.y + oy, false); if (f.npc) { shadow(g, f.x + 22 - cx, f.y + oy, 9); drawHero(g, f.npc.spr[f.on ? 'win' : 'idle'][Math.floor(t * 5) % 4], f.x + 22 - cx, f.y + oy, p.x < f.x + 22 ? -1 : 1); } }
  for (const n of w.npcs) { shadow(g, n.x - cx, n.y + oy, 9); drawHero(g, n.spr[w.cheer ? 'win' : 'idle'][Math.floor(t * 5 + n.x) % 4], n.x - cx, n.y + oy, p.x < n.x ? -1 : 1); }
  for (const pd of w.pads) draw(g, SPR.pad, pd.t > 0.2 ? 1 : pd.t > 0 ? 2 : 0, pd.x - cx, pd.y + oy, false);
  if (w.cage) { const nx = Math.round(w.cage.x - cx) - 15, top = FLOOR - 50 + oy; g.fillStyle = '#a21caf'; g.fillRect(nx, top, 31, 3); g.fillRect(nx, FLOOR - 3 + oy, 31, 3); for (let i = 0; i < 6; i++) g.fillRect(nx + i * 6, top, 2, 50); g.fillStyle = '#f0abfc'; g.fillRect(nx, top, 31, 1); }
  for (const cr of w.crates) if (cr.hp > 0) draw(g, SPR.crate, 0, cr.x - cx + (cr.shake > 0 ? Math.round(Math.sin(t * 80) * 2) : 0), cr.y + oy, false);
  for (const k of w.picks) {
    const s = SPR[k.k], bob = k.fixed ? Math.round(Math.sin(k.t * 4) * 2) : 0;
    if (k.k !== 'sticker') { g.globalAlpha = 0.5 + Math.sin(k.t * 6) * 0.2; g.fillStyle = '#fff7c2'; g.fillRect(Math.round(k.x - cx) - 1, Math.round(k.y + oy - 20 + bob), 2, 2); g.globalAlpha = 1; }
    draw(g, s, Math.floor(k.t * 8), k.x - cx, k.y + oy + bob, false);
  }
  // enemies
  for (const e of w.enemies) {
    const x = e.x - cx, y = e.y + oy;
    if (x < -90 || x > VW + 90) continue;
    if (e.hide || (e.spawnT > 0 && Math.floor(t * 30) % 2)) continue;
    if (e.dead && !e.boss && e.st > 0.7 && Math.floor(t * 30) % 2) continue;
    const white = e.hitT > 0;
    if (!e.fly && e.grounded) shadow(g, x, y, e.w * 0.6 + 2);
    else if (e.t === 'spam' && !e.dead) shadow(g, x, FLOOR + oy, 16);
    if (e.spr) {
      const fr = heroFrame(e, t);
      if (e.t === 'buglord' && e.form === 2 && !e.dead) { g.globalAlpha = 0.5; drawHero(g, fr, x + (Math.floor(t * 18) % 3 - 1) * 4, y, e.face, e.scale); g.globalAlpha = 1; }
      if (e.t === 'clone') g.globalAlpha = 0.72;
      drawHero(g, fr, x, y, e.face, e.scale, white); g.globalAlpha = 1;
    }
    else {
      let s;
      if (e.t === 'slime') s = e.dead || e.state === 'hit' ? SPR.slime.hit : e.state === 'tele' ? SPR.slime.tele : !e.grounded ? SPR.slime.hop : SPR.slime.idle;
      else if (e.t === 'bot') s = e.dead || e.state === 'hit' ? SPR.bot.hit : e.state === 'tele' ? SPR.bot.tele : SPR.bot.idle;
      else if (e.t === 'spam') { const M = e.phase === 2 ? SPR.poet : SPR.spam, st = e.state; s = e.dead || st === 'dizzy' || e.hitT > 0 ? M.hit : st === 'tele' || st === 'barrage' || st === 'roar' || st === 'summon' || st === 'poem' ? M.tele : M.idle; }
      else { const sh = e.shield && e.shieldDown <= 0 ? 'S' : ''; s = e.state === 'spin' ? SPR.doner.spin : e.dead || e.state === 'dizzy' ? SPR.doner['dizzy' + sh] : e.state === 'teleS' || e.state === 'shave' || e.state === 'roar' ? SPR.doner['tele' + sh] : e.state === 'ayran' ? SPR.doner['throw' + sh] : SPR.doner['idle' + sh]; }
      const fr = Math.floor(t * (e.state === 'spin' ? 20 : e.state === 'tele' ? 12 : 5)) % s.f.length;
      if (white) { const cnv = whiten(s.f[fr]); g.drawImage(e.t === 'doner' && e.face < 0 ? flipH(cnv) : cnv, Math.round(x - s.ax), Math.round(y - s.ay)); }
      else draw(g, s, fr, x, y, e.t === 'doner' && e.face < 0);
    }
    if ((e.state === 'dizzy' || e.state === 'stag') && !e.dead) for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; g.fillStyle = '#fde047'; g.fillRect(Math.round(x + Math.cos(a) * 12), Math.round(y - e.h - 8 + Math.sin(a) * 3), 3, 3); }
    if ((e.state === 'teleC' || e.state === 'teleL' || e.state === 'teleS' || (e.state === 'tele' && (e.t === 'knight' || e.t === 'troll' || e.t === 'spam')) || e.state === 'teleS' || e.state === 'cast' || e.state === 'slamT') && Math.floor(t * 12) % 2) text(g, '!', x, y - e.h - 18, '#ef4444', 2, 0.5, '#141021');
    if (!e.boss && !e.dead && e.hp < e.maxHp) { g.fillStyle = '#141021'; g.fillRect(Math.round(x - 9), Math.round(y - e.h - 7), 18, 4); g.fillStyle = '#ef4444'; g.fillRect(Math.round(x - 8), Math.round(y - e.h - 6), Math.max(1, Math.round((16 * e.hp) / e.maxHp)), 2); }
  }
  // player
  if (!(p.inv > 0 && p.state !== 'dash' && p.state !== 'ko' && p.state !== 'special' && Math.floor(t * 24) % 2)) {
    if (p.grounded) shadow(g, p.x - cx, p.y + oy, 9);
    const fr = playerFrame(p, t);
    if (p.state === 'dash') { g.globalAlpha = 0.3; drawHero(g, fr, p.x - cx - p.face * 20, p.y + oy, p.face); g.globalAlpha = 0.55; drawHero(g, fr, p.x - cx - p.face * 10, p.y + oy, p.face); g.globalAlpha = 1; }
    if (p.pow > 0) { g.globalAlpha = 0.16 + Math.sin(t * 14) * 0.06; g.fillStyle = '#7cf0ff'; g.fillRect(Math.round(p.x - cx) - 12, Math.round(p.y + oy) - 38, 24, 40); g.fillRect(Math.round(p.x - cx) - 8, Math.round(p.y + oy) - 44, 16, 52); g.globalAlpha = 1; }
    drawHero(g, fr, p.x - cx, p.y + oy, p.face, 1, p.state === 'hit' && p.st < 0.08);
    if (p.weapon && p.weapon.k === 'klavye' && (p.state === 'p1' || p.state === 'p2') && p.st > 0.04 && p.st < 0.16) draw(g, SPR.klavye, 0, p.x - cx + p.face * 26, p.y + oy - 18, p.face < 0);
  }
  // projectiles
  for (const s of w.shots) {
    const x = s.x - cx, y = s.y + oy;
    if (s.k === 'marker') { if (Math.floor(t * 14) % 2) { const hw = (s.wd || 16) / 2; g.fillStyle = '#ef4444'; g.fillRect(Math.round(x - hw), Math.round(y - 2), hw * 2, 2); g.fillRect(Math.round(x - 1), Math.round(y - 12), 2, 7); g.fillRect(Math.round(x - 1), Math.round(y - 4), 2, 2); } }
    else if (s.k === 'clock') { draw(g, SPR.clock, Math.floor(t * 16), x + (s.landed ? Math.round(Math.sin(t * 60)) : 0), y, false); if (s.landed) { g.globalAlpha = 0.25; g.fillStyle = '#ef4444'; g.fillRect(Math.round(x - 26), Math.round(y - 3), 52, 3); g.globalAlpha = 1; } }
    else if (s.k === 'wave') draw(g, SPR.wave, Math.floor(t * 16), x, y, s.vx < 0);
    else draw(g, SPR[s.sp || s.k], s.v !== undefined ? s.v : Math.floor(t * 14), x, y, s.vx < 0 && s.k !== 'topac' && s.k !== 'ayran');
  }
  // particles
  for (const f of w.fx) {
    const x = Math.round(f.x - cx), y = Math.round(f.y + oy);
    g.fillStyle = f.col;
    if (f.ring) { const r = 4 + (1 - f.life / f.max) * 26; if (f.life < f.max * 0.4) g.globalAlpha = 0.5; for (let a = 0; a < 20; a++) g.fillRect(Math.round(x + Math.cos(a * 0.314) * r), Math.round(y + Math.sin(a * 0.314) * r * 0.7), 3, 3); g.globalAlpha = 1; }
    else if (f.star) { const r = Math.round(f.star * (0.5 + f.life / f.max)); g.fillRect(x - r, y - 1, r * 2, 2); g.fillRect(x - 1, y - r, 2, r * 2); g.fillRect(x - 2, y - 2, 4, 4); }
    else { if (f.life < f.max * 0.35) g.globalAlpha = 0.5; g.fillRect(x, y, f.size, f.size); g.globalAlpha = 1; }
  }
  for (const n of w.nums) text(g, n.str, n.x - cx, n.y + oy, n.col, 1, 0.5, '#141021');
  // Devin and his speech bubble
  const dv = w.devin, dxs = dv.x - cx, dys = dv.y + oy;
  draw(g, SPR.devin, Math.floor(t * 4) % 4, dxs, dys, p.x < dv.x);
  if (w.hint) bubble(g, w.hint.text, dxs, dys - 44, VW, 34);
  for (const e of w.enemies) if (e.sayT > 0 && !e.dead) bubble(g, e.say, e.x - cx, e.y + oy - e.h - 6, VW, 8);
  if (w.go > 0 && Math.floor(t * 4) % 2) text(g, 'İLERİ >>', VW - 12, VH * 0.4, '#fde68a', 2, 1, '#141021');
  if (w.flash > 0) { g.globalAlpha = Math.min(0.8, w.flash * 2); g.fillStyle = '#ffffff'; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1; }
}
export { ATK, EDEF, FLOOR, ANIMS };
