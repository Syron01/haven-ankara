// Entry point: screen scaling, input (keyboard + touch), save data and the game-state machine.
import { clamp } from './gfx.js';
import { buildArt } from './art.js';
import { CHAPTERS, STORY } from './levels.js';
import { createWorld, step, render, continueFromCheckpoint, removeStoryNpc, DT } from './game.js';
import { drawHUD, drawDialog, drawMenu, drawTitle, drawCount, drawBanner, drawResult, drawHelp } from './ui.js';
import { audio, unlock, sfx, music } from './audio.js';

const canvas = document.getElementById('game');
const g = canvas.getContext('2d');
let VW = 480, VH = 270, K = 2;

// ---------------------------------------------------------------- save
const SAVE_KEY = 'haven-ankara-save-v1';
const fresh = () => ({ unlocked: 1, stickers: 0, upg: { power: 0, hp: 0, energy: 0 }, badges: {}, sfx: true, music: true });
let save = fresh();
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.upg) save = Object.assign(fresh(), s); } catch (e) { /* storage unavailable */ }
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } };
audio.sfx = save.sfx; audio.music = save.music;

// ---------------------------------------------------------------- scaling
function resize() {
  const dpr = window.devicePixelRatio || 1, pw = window.innerWidth * dpr, ph = window.innerHeight * dpr;
  K = Math.max(1, Math.round(ph / 270));
  if (ph / K < 216) K = Math.max(1, K - 1);
  if (pw / K < 300) K = Math.max(1, Math.floor(pw / 300));
  VW = clamp(Math.ceil(pw / K), 240, 640); VH = clamp(Math.ceil(ph / K), 180, 288);
  canvas.width = VW; canvas.height = VH;
  canvas.style.width = (VW * K) / dpr + 'px'; canvas.style.height = (VH * K) / dpr + 'px';
  g.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);

// ---------------------------------------------------------------- input
const keys = Object.create(null);
const inp = { l: false, r: false, u: false, d: false, jumpHeld: false, jump: 0, atk: 0, kick: 0, use: 0, dash: 0, spec: 0 };
const touch = { on: false, l: false, r: false, u: false, d: false, jump: false };
const HELD = { l: ['ArrowLeft', 'KeyA'], r: ['ArrowRight', 'KeyD'], u: ['ArrowUp', 'KeyW'], d: ['ArrowDown', 'KeyS'], jumpHeld: ['Space', 'ArrowUp', 'KeyW'] };
const PRESS = { Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyJ: 'atk', KeyZ: 'atk', KeyK: 'kick', KeyX: 'kick', KeyL: 'use', KeyC: 'use', ShiftLeft: 'dash', ShiftRight: 'dash', KeyI: 'dash', KeyQ: 'spec', KeyU: 'spec', KeyV: 'spec' };
const BUFFER = 0.14;
function press(a) { inp[a] = BUFFER; }
function readHeld() {
  for (const k in HELD) inp[k] = HELD[k].some((c) => keys[c]);
  if (touch.on) { inp.l = inp.l || touch.l; inp.r = inp.r || touch.r; inp.u = inp.u || touch.u; inp.d = inp.d || touch.d; inp.jumpHeld = inp.jumpHeld || touch.jump; }
}
function clearInput() { for (const k of ['jump', 'atk', 'kick', 'use', 'dash', 'spec']) inp[k] = 0; }
window.addEventListener('keydown', (e) => {
  unlock();
  if (e.repeat) { if (PRESS[e.code] || e.code.startsWith('Arrow')) e.preventDefault(); return; }
  keys[e.code] = true;
  if (PRESS[e.code] || e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  if (S.name === 'play' && PRESS[e.code]) press(PRESS[e.code]);
  uiKey(e.code);
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; touch.l = touch.r = touch.u = touch.d = touch.jump = false; if (S.name === 'play' || S.name === 'count') openPause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && (S.name === 'play' || S.name === 'count')) openPause(); });

// touch buttons (DOM so that several fingers work at once and they can sit outside the letterbox)
const pad = document.getElementById('pad');
function bindTouch(el, down, up) {
  const d = (e) => { e.preventDefault(); unlock(); el.classList.add('on'); down(); };
  const u = (e) => { e.preventDefault(); el.classList.remove('on'); if (up) up(); };
  el.addEventListener('pointerdown', d); el.addEventListener('pointerup', u); el.addEventListener('pointercancel', u); el.addEventListener('pointerleave', u);
}
for (const el of pad.querySelectorAll('[data-h]')) bindTouch(el, () => { touch[el.dataset.h] = true; if (el.dataset.h === 'jump' && S.name === 'play') press('jump'); }, () => { touch[el.dataset.h] = false; });
for (const el of pad.querySelectorAll('[data-p]')) bindTouch(el, () => { if (S.name === 'play') press(el.dataset.p); else uiKey('Enter'); });
bindTouch(document.getElementById('pauseBtn'), () => { if (S.name === 'play') openPause(); else if (S.name === 'pause') S.menu.items[0].fn(); });
window.addEventListener('touchstart', () => { if (!touch.on) { touch.on = true; document.body.classList.add('touch'); } }, { passive: true });

canvas.addEventListener('pointerdown', (e) => {
  unlock();
  const r = canvas.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * VW, y = ((e.clientY - r.top) / r.height) * VH;
  if (S.menu && S.rects) { for (const b of S.rects) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { if (S.menu.sel === b.i || e.pointerType !== 'mouse') { S.menu.sel = b.i; activate(); } else S.menu.sel = b.i; return; } }
  else if (S.name === 'dialog' || S.name === 'help') uiKey('Enter');
});
canvas.addEventListener('pointermove', (e) => {
  if (!S.menu || !S.rects || e.pointerType !== 'mouse') return;
  const r = canvas.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * VW, y = ((e.clientY - r.top) / r.height) * VH;
  for (const b of S.rects) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h && !S.menu.items[b.i].disabled) S.menu.sel = b.i;
});

// ---------------------------------------------------------------- states
const S = { name: 'title', menu: null, rects: null, t: 0, armed: 0 };
let world = null, demo = null, dialog = null, count = 0, banner = 0, chapter = 0;
let acc = 0, last = performance.now();

function setMenu(name, menu) { S.name = name; S.menu = menu; S.rects = null; S.armed = 0.25; if (menu) { menu.sel = menu.items.findIndex((i) => !i.disabled); } document.body.dataset.state = name; }
function activate() {
  if (S.armed > 0 || !S.menu) return;
  const it = S.menu.items[S.menu.sel];
  if (!it || it.disabled) return;
  sfx('ui'); it.fn();
}
function uiKey(code) {
  if (S.name === 'play') { if (code === 'Escape' || code === 'KeyP') openPause(); return; }
  if (S.name === 'dialog') {
    if (S.armed > 0) return;
    if (code === 'Escape') endDialog(true);
    else if (['Enter', 'Space', 'KeyJ', 'KeyZ'].includes(code)) { const line = dialog.lines[dialog.i]; if (dialog.c < line[1].length) dialog.c = line[1].length; else nextLine(); }
    return;
  }
  if (S.name === 'help') { if (S.armed <= 0) S.back(); return; }
  if (!S.menu) return;
  const m = S.menu, n = m.items.length;
  const move = (d) => { let i = m.sel; for (let k = 0; k < n; k++) { i = (i + d + n) % n; if (!m.items[i].disabled) break; } if (i !== m.sel) { m.sel = i; sfx('ui'); } };
  if (code === 'ArrowDown' || code === 'KeyS') move(1);
  else if (code === 'ArrowUp' || code === 'KeyW') move(-1);
  else if (code === 'Enter' || code === 'Space' || code === 'KeyJ') activate();
  else if (code === 'Escape' && m.back) { sfx('ui'); m.back(); }
}

function openTitle() {
  world = null; music('menu');
  if (!demo) { demo = createWorld(CHAPTERS[1], save, 1); demo.enemies.length = 0; demo.hint = null; }
  setMenu('title', { y: null, items: [
    { label: save.unlocked > 1 || save.stickers > 0 ? 'DEVAM ET' : 'OYNA', fn: openChapters },
    { label: 'DÜKKÂN', fn: () => openShop(openTitle) },
    { label: 'KONTROLLER', fn: () => openHelp(openTitle) },
    { label: 'AYARLAR', fn: () => openSettings(openTitle) },
  ] });
}
function openChapters() {
  const items = CHAPTERS.map((mk, i) => {
    const names = ['KAPILAR AÇILIYOR', 'KIZILAY KAOSU'];
    return { label: (i + 1) + '. ' + names[i], value: i < save.unlocked ? 'ROZET ' + (save.badges[i + 1] || 0) + '/2' : 'KİLİTLİ', disabled: i >= save.unlocked, fn: () => startChapter(i) };
  });
  items.push({ label: 'GERİ', fn: openTitle });
  setMenu('chapters', { title: 'BÖLÜM SEÇ', wide: true, dim: true, items, back: openTitle });
}
const UPG = [['power', 'GÜÇ', 'VURUŞ HASARI +%15'], ['hp', 'CAN', 'AZAMİ CAN +20'], ['energy', 'ENERJİ', 'SHIP IT DAHA HIZLI DOLAR']];
const PRICE = [30, 70, 130];
function openShop(back, keep) {
  const items = UPG.map(([k, name]) => {
    const lv = save.upg[k], max = lv >= 3;
    return { label: name + ' ' + '★'.repeat(lv) + (max ? '' : ''), value: max ? 'TAM' : PRICE[lv] + ' STICKER', disabled: max || save.stickers < PRICE[lv], fn: () => { save.stickers -= PRICE[lv]; save.upg[k]++; persist(); sfx('power'); openShop(back, k); } };
  });
  items.push({ label: 'GERİ', fn: back });
  setMenu('shop', { title: 'DÜKKÂN', note: 'STICKER: ' + save.stickers + '   GÜÇ: HASAR  CAN: +20  ENERJİ: HIZLI DOLUM', wide: true, dim: true, items, back });
  if (keep) { const i = UPG.findIndex((u) => u[0] === keep); if (!items[i].disabled) S.menu.sel = i; }
  if (S.menu.sel < 0) S.menu.sel = items.length - 1;
}
function openSettings(back) {
  let wipe = false;
  const build = (sel) => {
    setMenu('settings', { title: 'AYARLAR', dim: true, wide: true, back, items: [
      { label: 'SES EFEKTLERİ', value: save.sfx ? 'AÇIK' : 'KAPALI', fn: () => { save.sfx = audio.sfx = !save.sfx; persist(); build(0); } },
      { label: 'MÜZİK', value: save.music ? 'AÇIK' : 'KAPALI', fn: () => { save.music = audio.music = !save.music; persist(); build(1); } },
      { label: 'TAM EKRAN', value: document.fullscreenElement ? 'AÇIK' : 'KAPALI', disabled: !document.documentElement.requestFullscreen, fn: () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); setTimeout(() => build(2), 300); } },
      { label: wipe ? 'EMİN MİSİN? TEKRAR BAS' : 'KAYDI SIFIRLA', fn: () => { if (!wipe) { wipe = true; build(3); } else { save = fresh(); persist(); audio.sfx = audio.music = true; wipe = false; build(3); } } },
      { label: 'GERİ', fn: back },
    ] });
    S.menu.sel = sel; S.armed = 0.12;
  };
  build(0);
}
function openHelp(back) { S.name = 'help'; S.menu = null; S.back = back; S.armed = 0.3; document.body.dataset.state = 'help'; }
function openPause() {
  if (S.name !== 'play' && S.name !== 'count') return;
  const resume = () => { S.name = 'play'; S.menu = null; document.body.dataset.state = 'play'; clearInput(); last = performance.now(); if (count > 0) S.name = 'count'; };
  const again = () => setMenu('pause', { title: 'DURAKLATILDI', dim: true, back: resume, items: [
    { label: 'DEVAM', fn: resume },
    { label: 'KONTROLLER', fn: () => openHelp(again) },
    { label: 'AYARLAR', fn: () => openSettings(again) },
    { label: 'BÖLÜMÜ YENİDEN BAŞLAT', fn: () => startChapter(chapter) },
    { label: 'ANA MENÜ', fn: openTitle },
  ] });
  again();
}
function startChapter(i) {
  if (S.name === 'count' || S.name === 'dialog') return; // never start twice
  chapter = i; world = createWorld(CHAPTERS[i], save, i);
  music(world.lv.music); clearInput(); acc = 0; banner = 2.6;
  startDialog(world.lv.intro, () => startCount());
}
function startCount() { count = 2.4; S.name = 'count'; S.menu = null; document.body.dataset.state = 'play'; clearInput(); }
function startDialog(id, done) {
  dialog = { lines: STORY[id], i: 0, c: 0, done, skipLabel: touch.on ? 'DOKUN: DEVAM' : 'ENTER: DEVAM   ESC: GEÇ' };
  S.name = 'dialog'; S.menu = null; S.armed = 0.35; document.body.dataset.state = 'dialog';
}
function lineAction(line) { if (line[2] === 'kidnap' && world) removeStoryNpc(world); }
function nextLine() {
  lineAction(dialog.lines[dialog.i]);
  dialog.i++; dialog.c = 0;
  if (dialog.i >= dialog.lines.length) endDialog(false); else sfx('ui');
}
function endDialog(skipped) {
  if (skipped) for (let i = dialog.i; i < dialog.lines.length; i++) lineAction(dialog.lines[i]);
  const d = dialog; dialog = null; clearInput(); d.done();
}
function resumePlay() { S.name = 'play'; S.menu = null; document.body.dataset.state = 'play'; clearInput(); last = performance.now(); }
function onClear() {
  startDialog(world.lv.outro, () => {
    save.stickers += world.stats.stickers;
    save.badges[world.lv.id] = Math.max(save.badges[world.lv.id] || 0, world.stats.badges);
    save.unlocked = Math.max(save.unlocked, Math.min(CHAPTERS.length, chapter + 2));
    world.stats.banked = true; persist(); sfx('win'); music('menu');
    const items = [];
    if (chapter + 1 < CHAPTERS.length) items.push({ label: 'SONRAKİ BÖLÜM', fn: () => startChapter(chapter + 1) });
    items.push({ label: 'DÜKKÂN', fn: () => openShop(showResult) }, { label: 'ANA MENÜ', fn: openTitle });
    const showResult = () => { setMenu('result', { y: Math.round(VH * 0.08) + 112, items }); };
    showResult();
  });
}
function onGameOver() {
  sfx('lose');
  setMenu('gameover', { title: 'OYUN BİTTİ', titleCol: '#f87171', note: 'DEVİN: "BİR ÇAY İÇ, TEKRAR DENE."', dim: true, items: [
    { label: 'KAYIT NOKTASINDAN DEVAM', fn: () => { continueFromCheckpoint(world); music(world.lv.music); startCount(); } },
    { label: 'ANA MENÜ', fn: () => { save.stickers += world.stats.stickers; persist(); openTitle(); } },
  ] });
  S.armed = 0.8;
}

// ---------------------------------------------------------------- loop
function tick() {
  readHeld();
  step(world, inp);
  for (const k of ['jump', 'atk', 'kick', 'use', 'dash', 'spec']) if (inp[k] > 0) inp[k] -= DT;
  while (world.events.length) {
    const e = world.events.shift();
    if (e.type === 'cut') startDialog(e.id, resumePlay);
    else if (e.type === 'music') music(e.id);
    else if (e.type === 'clear') { S.name = 'clearing'; S.t = 0; }
    else if (e.type === 'gameover') onGameOver();
  }
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (document.hidden) return;
  S.t += dt; if (S.armed > 0) S.armed -= dt;
  const t = now / 1000;
  if (S.name === 'play' || S.name === 'clearing') {
    acc += dt;
    let n = 0;
    while (acc >= DT && n < 5) { tick(); acc -= DT; n++; if (S.name !== 'play' && S.name !== 'clearing') { acc = 0; break; } }
    if (n === 5) acc = 0;
    if (S.name === 'clearing' && S.t > 1.6) onClear();
  } else if (S.name === 'count') {
    const before = Math.ceil(count / 0.6);
    count -= dt;
    const after = Math.ceil(count / 0.6);
    if (after !== before) sfx(after <= 1 ? 'go' : 'count');
    if (count <= 0.6 && S.name === 'count') { S.name = 'play'; clearInput(); acc = 0; }
  } else if (S.name === 'dialog' && dialog) {
    const line = dialog.lines[dialog.i], c0 = Math.floor(dialog.c);
    dialog.c = Math.min(line[1].length, dialog.c + dt * 48);
    if (Math.floor(dialog.c) !== c0 && Math.floor(dialog.c) % 3 === 0) sfx(line[0] === 'devin' ? 'devin' : 'talk');
  }
  if (banner > 0 && S.name !== 'pause') banner -= dt;
  if (world && S.name !== 'play' && S.name !== 'clearing' && world.flash > 0) world.flash -= dt;
  if (count > 0 && S.name === 'play') count -= dt;
  // draw
  const w = world || demo;
  if (!world) { demo.t += dt; demo.cam.x = (Math.sin(demo.t * 0.07) * 0.5 + 0.5) * Math.max(0, 1500 - VW) + 60; demo.player.x = -200; demo.devin.x = -200; demo.cam.y = Math.max(0, 288 - VH); }
  render(w, g, VW, VH);
  if (world) {
    if (S.name !== 'result') drawHUD(g, world, VW, VH, t);
    if (banner > 0 && S.name !== 'result') drawBanner(g, world.lv, Math.min(banner, 1) * 1.5, VW, VH);
    if (count > 0 && (S.name === 'count' || S.name === 'play')) { const n = Math.ceil(count / 0.6) - 1; drawCount(g, n, (count / 0.6) % 1, VW, VH); }
    if (S.name === 'dialog' && dialog) drawDialog(g, dialog, VW, VH, t);
    if (S.name === 'result') drawResult(g, world, VW, VH, 2);
  } else if (S.name === 'title') drawTitle(g, VW, VH, t);
  if (S.name === 'help') drawHelp(g, VW, VH, touch.on);
  else if (S.menu) {
    if (S.name === 'title') S.menu.y = Math.round(VH * 0.14) + (VW < 400 ? 3 : 4) * 21 + 26;
    S.rects = drawMenu(g, S.menu, VW, VH, t);
  }
}

buildArt();
resize();
openTitle();
requestAnimationFrame(frame);
if (location.hash === '#debug') window.__haven = { S, get world() { return world; }, inp, get save() { return save; }, startChapter, tick, press, keys, skip: () => endDialog(true), go: () => { count = 0; S.name = 'play'; }, onClear, activate, uiKey };
