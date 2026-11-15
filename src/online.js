// Haven Ankara — Çevrim İçi Çok Oyunculu Arena Sistemi (P2P WebRTC & Local Channel)
import { text } from './gfx.js';
import { sprites } from './heroes.js';
import { sfx } from './audio.js';
import { hurtPlayer, spark, star, num, shake } from './game.js';

const PEERJS_URL = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
const ROOM_PREFIX = 'haven-ank-room-';
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const HERO_LIST = [
  { id: 'akin', name: 'AKIN', desc: 'Dengeli dövüşçü, Ship It şarjı' },
  { id: 'mert', name: 'MERT', desc: 'Sokak dövüşçüsü, seri yumruklar' },
  { id: 'tuna', name: 'TUNA', desc: 'Hızlı kombolar ve çevik vuruşlar' },
  { id: 'gokoz', name: 'GÖKOZ', desc: 'Döner ustası, güçlü tekmeler' },
  { id: 'ozgur', name: 'ÖZGÜR', desc: 'Etkinlik lideri, yüksek moral' },
];

export function randomCode() {
  let s = '';
  for (let i = 0; i < 5; i++) s += LETTERS[Math.floor(Math.random() * LETTERS.length)];
  return s;
}

export function normalizeCode(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
}

let peerLibPromise = null;
function loadPeerJS() {
  if (globalThis.Peer) return Promise.resolve(globalThis.Peer);
  if (peerLibPromise) return peerLibPromise;
  peerLibPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = PEERJS_URL;
    script.onload = () => resolve(globalThis.Peer);
    script.onerror = () => resolve(null); // fallback to local broadcast channel
    document.head.appendChild(script);
  });
  return peerLibPromise;
}

export class OnlineManager {
  constructor() {
    this.session = null;
    this.peer = null;
    this.conns = new Map();
    this.bc = null; // BroadcastChannel fallback
    this.syncTimer = null;
    this.world = null;
    this.localPlayer = null;
    this.myHero = 'akin';
    this.heroIdx = 0;
    this.statusMsg = '';
  }

  cycleHero(dir = 1) {
    this.heroIdx = (this.heroIdx + dir + HERO_LIST.length) % HERO_LIST.length;
    this.myHero = HERO_LIST[this.heroIdx].id;
    if (this.session) {
      this.session.myHero = this.myHero;
      this.broadcast({ t: 'hero_change', id: this.session.myId, hero: this.myHero });
    }
  }

  async host(code = randomCode()) {
    this.close();
    code = normalizeCode(code);
    const myId = 'host_' + Math.random().toString(36).slice(2, 7);
    this.session = {
      role: 'host',
      code,
      myId,
      myHero: this.myHero,
      myName: 'EV SAHİBİ (' + HERO_LIST[this.heroIdx].name + ')',
      players: new Map([[myId, { id: myId, name: 'SEN (HOST)', hero: this.myHero, isHost: true, score: 0 }]]),
      state: 'lobby',
      matchTimer: 90,
      countdown: 0,
      winner: null,
    };

    // BroadcastChannel for instant local multi-tab testing
    try {
      this.bc = new BroadcastChannel(ROOM_PREFIX + code);
      this.bc.onmessage = (e) => this.handleData('local_peer', e.data);
    } catch (_) {}

    // WebRTC via PeerJS
    try {
      const Peer = await loadPeerJS();
      if (Peer) {
        this.peer = new Peer(ROOM_PREFIX + code);
        this.peer.on('connection', (conn) => {
          conn.on('open', () => {
            const peerId = conn.peer;
            this.conns.set(peerId, conn);
            // send welcome
            const plist = Array.from(this.session.players.values());
            conn.send({ t: 'welcome', code, players: plist, matchState: this.session.state });
          });
          conn.on('data', (data) => this.handleData(conn.peer, data));
          conn.on('close', () => this.handleLeave(conn.peer));
          conn.on('error', () => this.handleLeave(conn.peer));
        });
        this.peer.on('error', (e) => {
          if (e.type === 'unavailable-id') {
            this.statusMsg = 'Bu oda zaten açık! Başka kod deneyin.';
          }
        });
      }
    } catch (e) {
      console.warn('PeerJS init failed, using local channel:', e);
    }
    return this.session;
  }

  async join(code) {
    this.close();
    code = normalizeCode(code);
    if (!code) throw new Error('Oda kodu boş olamaz');
    const myId = 'client_' + Math.random().toString(36).slice(2, 7);
    this.session = {
      role: 'client',
      code,
      myId,
      myHero: this.myHero,
      myName: 'KATILIMCI (' + HERO_LIST[this.heroIdx].name + ')',
      players: new Map([[myId, { id: myId, name: 'SEN', hero: this.myHero, isHost: false, score: 0 }]]),
      state: 'lobby',
      matchTimer: 90,
      countdown: 0,
      winner: null,
    };

    // BroadcastChannel
    try {
      this.bc = new BroadcastChannel(ROOM_PREFIX + code);
      this.bc.onmessage = (e) => this.handleData('host', e.data);
      // broadcast join ping
      this.bc.postMessage({ t: 'join_req', id: myId, name: this.session.myName, hero: this.myHero });
    } catch (_) {}

    // WebRTC
    try {
      const Peer = await loadPeerJS();
      if (Peer) {
        this.peer = new Peer();
        this.peer.on('open', () => {
          const conn = this.peer.connect(ROOM_PREFIX + code, { reliable: true });
          conn.on('open', () => {
            this.conns.set('host', conn);
            conn.send({ t: 'join_req', id: myId, name: this.session.myName, hero: this.myHero });
          });
          conn.on('data', (data) => this.handleData('host', data));
          conn.on('close', () => this.handleLeave('host'));
          conn.on('error', () => this.handleLeave('host'));
        });
        this.peer.on('error', (e) => {
          this.statusMsg = 'Odaya bağlanılamadı (' + (e.type || 'Hata') + ')';
        });
      }
    } catch (e) {
      console.warn('PeerJS join error:', e);
    }
    return this.session;
  }

  broadcast(msg) {
    if (this.bc) {
      try { this.bc.postMessage(msg); } catch (_) {}
    }
    for (const [_, conn] of this.conns) {
      if (conn.open) {
        try { conn.send(msg); } catch (_) {}
      }
    }
  }

  handleData(from, msg) {
    if (!this.session || !msg || !msg.t) return;
    const s = this.session;

    if (msg.t === 'join_req') {
      if (s.role === 'host') {
        const p = { id: msg.id, name: msg.name || 'OYUNCU', hero: msg.hero || 'mert', isHost: false, score: 0 };
        s.players.set(msg.id, p);
        this.broadcast({ t: 'player_list', players: Array.from(s.players.values()) });
        sfx('power');
      }
    } else if (msg.t === 'welcome' || msg.t === 'player_list') {
      if (Array.isArray(msg.players)) {
        s.players.clear();
        for (const p of msg.players) {
          s.players.set(p.id, p);
        }
      }
    } else if (msg.t === 'hero_change') {
      const p = s.players.get(msg.id);
      if (p) {
        p.hero = msg.hero;
        if (s.role === 'host') this.broadcast({ t: 'player_list', players: Array.from(s.players.values()) });
      }
    } else if (msg.t === 'start_match') {
      s.state = 'match';
      s.matchTimer = msg.matchTimer || 90;
      if (this.onStartGame) this.onStartGame();
    } else if (msg.t === 'ps') {
      // Remote player state update
      if (this.world && this.world.remotePlayers) {
        let rp = this.world.remotePlayers.find((r) => r.id === msg.id);
        if (!rp) {
          rp = {
            id: msg.id,
            name: msg.name || 'RAKIP',
            hero: msg.hero || 'mert',
            x: msg.x,
            y: msg.y,
            vx: msg.vx,
            vy: msg.vy,
            face: msg.face || 1,
            state: msg.state || 'idle',
            st: msg.st || 0,
            hp: msg.hp || 100,
            maxHp: msg.maxHp || 100,
            inv: msg.inv || 0,
            grounded: msg.grounded !== undefined ? msg.grounded : true,
            score: msg.score || 0,
            spr: sprites(msg.hero || 'mert'),
          };
          this.world.remotePlayers.push(rp);
        } else {
          rp.x = msg.x;
          rp.y = msg.y;
          rp.vx = msg.vx;
          rp.vy = msg.vy;
          rp.face = msg.face;
          rp.state = msg.state;
          rp.st = msg.st;
          rp.hp = msg.hp;
          rp.inv = msg.inv;
          rp.grounded = msg.grounded;
          rp.score = msg.score;
        }
      }
    } else if (msg.t === 'hit') {
      if (this.world && msg.targetId === s.myId) {
        hurtPlayer(this.world, msg.dmg, msg.fromX, msg.kx, msg.ky);
      }
    } else if (msg.t === 'ko') {
      if (s.players.has(msg.killerId)) {
        s.players.get(msg.killerId).score = (s.players.get(msg.killerId).score || 0) + 1;
      }
      sfx('win');
    } else if (msg.t === 'match_end') {
      s.state = 'result';
      s.winner = msg.winner;
      sfx('win');
    }
  }

  handleLeave(peerId) {
    if (!this.session) return;
    this.conns.delete(peerId);
    if (this.session.role === 'host') {
      this.session.players.delete(peerId);
      this.broadcast({ t: 'player_list', players: Array.from(this.session.players.values()) });
    }
    if (this.world && this.world.remotePlayers) {
      this.world.remotePlayers = this.world.remotePlayers.filter((r) => r.id !== peerId);
    }
  }

  startMatch() {
    if (!this.session || this.session.role !== 'host') return;
    this.session.state = 'match';
    this.session.matchTimer = 90;
    this.broadcast({ t: 'start_match', matchTimer: 90 });
    if (this.onStartGame) this.onStartGame();
  }

  bindWorld(world) {
    this.world = world;
    world.isOnline = true;
    world.remotePlayers = [];

    // Populate existing peers
    if (this.session) {
      for (const [id, p] of this.session.players) {
        if (id !== this.session.myId) {
          world.remotePlayers.push({
            id,
            name: p.name,
            hero: p.hero || 'mert',
            x: 24 * 16,
            y: 15 * 16,
            vx: 0,
            vy: 0,
            face: -1,
            state: 'idle',
            st: 0,
            hp: 100,
            maxHp: 100,
            inv: 0,
            grounded: true,
            score: p.score || 0,
            spr: sprites(p.hero || 'mert'),
          });
        }
      }
    }

    // On local player striking a remote player
    world.onHitRemote = (rp, h) => {
      rp.hp = Math.max(0, rp.hp - h.dmg);
      rp.state = 'hit';
      rp.st = 0;
      rp.inv = 0.4;
      spark(world, rp.x, rp.y - 16, '#fde68a', 8, 120);
      star(world, rp.x, rp.y - 16, '#ffffff', h.fin);
      num(world, rp.x, rp.y - 36, String(h.dmg), '#ffd27a');
      shake(world, 4);
      sfx(h.fin ? 'heavy' : 'hit');

      this.broadcast({
        t: 'hit',
        targetId: rp.id,
        dmg: h.dmg,
        fromX: world.player.x,
        kx: h.kx,
        ky: h.ky,
      });

      if (rp.hp <= 0) {
        rp.state = 'ko';
        const myP = this.session.players.get(this.session.myId);
        if (myP) myP.score = (myP.score || 0) + 1;
        this.broadcast({ t: 'ko', victimId: rp.id, killerId: this.session.myId });
        sfx('ko');
      }
    };
  }

  update(dt) {
    if (!this.session || this.session.state !== 'match' || !this.world) return;
    const s = this.session, p = this.world.player;

    // Send local player state packet
    this.broadcast({
      t: 'ps',
      id: s.myId,
      name: s.myName,
      hero: s.myHero,
      x: Math.round(p.x),
      y: Math.round(p.y),
      vx: Math.round(p.vx),
      vy: Math.round(p.vy),
      face: p.face,
      state: p.state,
      st: Number(p.st.toFixed(2)),
      hp: p.hp,
      maxHp: p.maxHp,
      inv: p.inv,
      grounded: p.grounded,
      score: s.players.get(s.myId)?.score || 0,
    });

    // Handle local KO respawn
    if (p.state === 'ko' && p.st > 1.8) {
      p.hp = p.maxHp;
      p.x = 8 * 16 + Math.random() * 20 * 16;
      p.y = 15 * 16;
      p.vx = p.vy = 0;
      p.inv = 2.5;
      p.state = 'idle';
      spark(this.world, p.x, p.y - 16, '#7cf0ff', 16, 130);
      sfx('power');
    }

    // Host handles match clock
    if (s.role === 'host') {
      s.matchTimer -= dt;
      if (s.matchTimer <= 0) {
        s.matchTimer = 0;
        let best = null, bestScore = -1;
        for (const [_, pl] of s.players) {
          if (pl.score > bestScore) {
            bestScore = pl.score;
            best = pl;
          }
        }
        const winName = best ? best.name : 'BERABERE';
        s.state = 'result';
        s.winner = winName;
        this.broadcast({ t: 'match_end', winner: winName });
      }
    }
  }

  close() {
    if (this.bc) {
      try { this.bc.close(); } catch (_) {}
      this.bc = null;
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch (_) {}
      this.peer = null;
    }
    this.conns.clear();
    this.session = null;
    this.world = null;
    this.statusMsg = '';
  }
}

export const onlineManager = new OnlineManager();

// ---------------------------------------------------------------- UI Drawing
export function drawOnlineLobbyScreen(g, session, VW, VH, t) {
  g.fillStyle = '#0f172a';
  g.fillRect(0, 0, VW, VH);

  // Background pixel grid
  g.globalAlpha = 0.08;
  g.fillStyle = '#60a5fa';
  for (let x = 0; x < VW; x += 20) g.fillRect(x, 0, 1, VH);
  for (let y = 0; y < VH; y += 20) g.fillRect(0, y, VW, 1);
  g.globalAlpha = 1;

  // Header Banner
  const titleY = 12;
  text(g, 'ÇEVRİM İÇİ ARENA', VW / 2, titleY, '#fde68a', 2, 0.5, '#07060f');
  text(g, 'HAVEN ANKARA P2P ÇOK OYUNCULU', VW / 2, titleY + 18, '#94a3b8', 1, 0.5);

  const rects = [];
  const u = Math.min(VW, VH);
  const isHost = session.role === 'host';

  // Room Code Box
  const codeBoxW = Math.min(220, VW - 40), codeBoxH = 26;
  const cbx = Math.round((VW - codeBoxW) / 2), cby = titleY + 32;
  g.fillStyle = '#1e1b4b'; g.fillRect(cbx, cby, codeBoxW, codeBoxH);
  g.strokeStyle = '#6366f1'; g.lineWidth = 2; g.strokeRect(cbx, cby, codeBoxW, codeBoxH);
  text(g, 'ODA KODU: ' + session.code, VW / 2, cby + 5, '#a5f3fc', 1.5, 0.5, '#07060f');
  text(g, 'Arkadaşına bu kodu ver veya aynı ağda katıl', VW / 2, cby + 17, '#cbd5e1', 0.8, 0.5);

  // Hero Preview Card
  const cardW = 120, cardH = 92;
  const cardX = Math.round(VW * 0.22 - cardW / 2), cardY = cby + 34;
  g.fillStyle = '#1e293b'; g.fillRect(cardX, cardY, cardW, cardH);
  g.strokeStyle = '#38bdf8'; g.lineWidth = 2; g.strokeRect(cardX, cardY, cardW, cardH);
  text(g, 'SENİN KAHRAMANIN', cardX + cardW / 2, cardY + 5, '#38bdf8', 1, 0.5);

  // Hero Animated Sprite
  const heroInfo = HERO_LIST[onlineManager.heroIdx];
  const curSpr = sprites(heroInfo.id, ['idle']).idle;
  const fr = curSpr[Math.floor(t * 6) % curSpr.length];
  g.drawImage(fr, 0, 0, fr.width, fr.height, cardX + cardW / 2 - 24, cardY + 18, 48, 48);
  text(g, '< ' + heroInfo.name + ' >', cardX + cardW / 2, cardY + 70, '#fde68a', 1, 0.5, '#07060f');
  text(g, '(DEĞİŞTİR: A/D veya TIKLA)', cardX + cardW / 2, cardY + 81, '#94a3b8', 0.8, 0.5);
  rects.push({ x: cardX, y: cardY, w: cardW, h: cardH, action: 'hero' });

  // Players in Room Card
  const pCardW = Math.min(220, VW * 0.5), pCardH = 92;
  const pCardX = Math.round(VW * 0.72 - pCardW / 2), pCardY = cardY;
  g.fillStyle = '#1e293b'; g.fillRect(pCardX, pCardY, pCardW, pCardH);
  g.strokeStyle = '#4ade80'; g.lineWidth = 2; g.strokeRect(pCardX, pCardY, pCardW, pCardH);
  text(g, 'ODADAKİLER (' + session.players.size + '/4)', pCardX + pCardW / 2, pCardY + 5, '#4ade80', 1, 0.5);

  let py = pCardY + 19;
  for (const [_, p] of session.players) {
    const isMe = p.id === session.myId;
    const tag = isMe ? ' (SEN)' : '';
    const hName = (HERO_LIST.find((h) => h.id === p.hero)?.name || p.hero).toUpperCase();
    text(g, '• ' + hName + tag + (p.isHost ? ' [HOST]' : ' [KATILDI]'), pCardX + 10, py, isMe ? '#a5f3fc' : '#ffffff', 1, 0);
    py += 14;
    if (py > pCardY + pCardH - 12) break;
  }
  if (session.players.size === 1) {
    text(g, 'İkinci oyuncu bekleniyor...', pCardX + 10, py, '#94a3b8', 0.8, 0);
  }

  // Buttons at bottom
  const btnW = 110, btnH = 22;
  const by = VH - 30;

  // Start button (for host)
  if (isHost) {
    const canStart = true;
    const bx1 = Math.round(VW / 2 - btnW - 8);
    g.fillStyle = canStart ? '#16a34a' : '#334155';
    g.fillRect(bx1, by, btnW, btnH);
    g.strokeStyle = canStart ? '#4ade80' : '#475569';
    g.lineWidth = 2; g.strokeRect(bx1, by, btnW, btnH);
    text(g, 'DÖVÜŞÜ BAŞLAT', bx1 + btnW / 2, by + 6, '#ffffff', 1, 0.5, '#07060f');
    rects.push({ x: bx1, y: by, w: btnW, h: btnH, action: 'start' });
  } else {
    text(g, 'Hostun oyunu başlatması bekleniyor...', VW / 2, by - 12, '#fde68a', 1, 0.5);
  }

  // Leave button
  const bx2 = isHost ? Math.round(VW / 2 + 8) : Math.round(VW / 2 - btnW / 2);
  g.fillStyle = '#dc2626'; g.fillRect(bx2, by, btnW, btnH);
  g.strokeStyle = '#f87171'; g.lineWidth = 2; g.strokeRect(bx2, by, btnW, btnH);
  text(g, 'AYRIL', bx2 + btnW / 2, by + 6, '#ffffff', 1, 0.5, '#07060f');
  rects.push({ x: bx2, y: by, w: btnW, h: btnH, action: 'leave' });

  if (onlineManager.statusMsg) {
    text(g, onlineManager.statusMsg, VW / 2, by - 16, '#f87171', 1, 0.5);
  }

  return rects;
}

export function drawOnlineMatchHUD(g, session, world, VW, VH, t) {
  if (!session) return;
  // Match clock in center top
  const secs = Math.max(0, Math.ceil(session.matchTimer || 0));
  const timeStr = String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
  const tw = 48, th = 16, tx = Math.round((VW - tw) / 2), ty = 4;
  g.fillStyle = '#0f172a'; g.fillRect(tx - 1, ty - 1, tw + 2, th + 2);
  g.fillStyle = '#312e81'; g.fillRect(tx, ty, tw, th);
  text(g, timeStr, VW / 2, ty + 4, secs <= 10 ? '#ef4444' : '#fde68a', 1.2, 0.5, '#07060f');

  // Scores
  let sx = 8;
  for (const [id, p] of session.players) {
    const isMe = id === session.myId;
    const hName = (HERO_LIST.find((h) => h.id === p.hero)?.name || p.hero).slice(0, 5);
    const sc = p.score || 0;
    const label = (isMe ? 'SEN' : hName) + ': ' + sc;
    const w = 54, h = 14;
    g.fillStyle = isMe ? '#1e3a8a' : '#1e293b'; g.fillRect(sx, 4, w, h);
    g.strokeStyle = isMe ? '#60a5fa' : '#64748b'; g.lineWidth = 1; g.strokeRect(sx, 4, w, h);
    text(g, label, sx + w / 2, 6, isMe ? '#a5f3fc' : '#ffffff', 1, 0.5, '#07060f');
    sx += w + 6;
    if (sx > VW - 70) break;
  }
}
