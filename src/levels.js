// Level layouts. Tiles: 0 empty, 1 solid, 2 one-way platform, 3 glitch spikes.
export const GR = 15; // ground row (tile units); world is 18 rows tall
export const ROWS = 18;

function builder(wTiles) {
  const grid = new Uint8Array(wTiles * ROWS);
  const L = { w: wTiles, grid, ents: [], props: [], arenas: [], hints: [], npcs: [], movers: [], zones: [], plats: 'shelf' };
  const set = (x, y, v) => { if (x >= 0 && x < wTiles && y >= 0 && y < ROWS) grid[y * wTiles + x] = v; };
  L.ground = (x0, x1) => { for (let x = x0; x <= x1; x++) for (let y = GR; y < ROWS; y++) set(x, y, 1); };
  L.pit = (x0, x1) => { for (let x = x0; x <= x1; x++) for (let y = GR; y < ROWS; y++) set(x, y, 0); };
  L.plat = (x0, x1, row) => { for (let x = x0; x <= x1; x++) set(x, row, 2); };
  L.block = (x0, x1, y0, y1) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) set(x, y, 1); };
  L.spikes = (x0, x1) => { for (let x = x0; x <= x1; x++) set(x, GR - 1, 3); };
  L.e = (t, x, extra) => L.ents.push({ t, x, ...extra });
  L.coins = (x0, n, row = GR - 2, step = 1) => { for (let i = 0; i < n; i++) L.ents.push({ t: 'sticker', x: x0 + i * step, row }); };
  L.p = (k, x, extra) => L.props.push({ k, x, ...extra });
  return L;
}

function chapter1() {
  const L = builder(222);
  Object.assign(L, { id: 1, name: 'KAPILAR AÇILIYOR', sub: 'ÇANKAYA GENÇLİK MERKEZİ', theme: 'day', music: 'hall', interior: [0, 75], intro: 'intro1', outro: 'outro1', start: 3 });
  L.zones = [{ x0: 0, x1: 75, set: 'in' }, { x0: 76, x1: 221, set: 'gr' }];
  L.ground(0, 221);
  // --- event hall
  L.npcs.push({ id: 'mert', x: 10 }, { id: 'tuna', x: 13 }, { id: 'gokoz', x: 16 }, { id: 'ozgur', x: 19, story: true });
  L.p('banner', 6, { y: 5 }); L.p('reg', 19); L.p('poster', 26, { y: 6, v: 0 }); L.p('desk', 30); L.p('plant', 34); L.p('poster', 37, { y: 6, v: 1 });
  L.p('urn', 41); L.p('desk', 45); L.p('bean', 50); L.p('poster', 53, { y: 6, v: 2 }); L.p('pizza', 56); L.p('banner', 44, { y: 4 }); L.p('plant', 59);
  L.hints.push({ x: 4, t: 'YÜRÜ, ZIPLA. HAVADAYKEN BİR KEZ DAHA ZIPLAYABİLİRSİN!' }, { x: 23, t: 'J J J: ÜÇLÜ KOMBO! MERCH KUTULARINI DA KIR.' });
  L.e('crate', 25, { drop: 'simit' }); L.e('crate', 27, { drop: 'stickers' }); L.coins(21, 3);
  L.arenas.push({ x0: 30, x1: 60, waves: [['slime', 'slime'], ['slime', 'slime', 'imp']] });
  L.hints.push({ x: 62, t: 'RAFLARIN TEPESİNDE BİR ŞEY PARLIYOR...' });
  L.plat(62, 65, 12); L.plat(67, 70, 9); L.plat(62, 65, 6); L.coins(62, 4, 11); L.coins(67, 4, 8); L.e('rozet', 63, { row: 5 }); L.e('cay', 65, { row: 5 });
  L.block(71, 72, 13, 14); L.e('crate', 71, { row: 12, drop: 'stickers' }); L.p('desk', 66); L.p('door', 74);
  // --- courtyard
  L.e('flag', 78, { npc: 'mert', gift: 'topac', say: 'AL, ÇOCUKLUĞUMUN TOPACI. L İLE FIRLAT, HEPSİNİ BİÇER!' });
  L.p('tree', 80); L.p('bench', 85); L.p('lamp', 90); L.p('tree', 104); L.p('bin', 109); L.p('bench', 122); L.p('tree', 134); L.p('lamp', 146); L.p('tree', 158); L.p('bench', 172); L.p('lamp', 180);
  L.hints.push({ x: 82, t: 'SHIFT İLE ATIL! SPAM ZARFLARINI YUMRUKLARSAN GERİ GİDER.' });
  L.e('bot', 88); L.e('bot', 93); L.coins(84, 4);
  L.pit(96, 98); L.coins(96, 3, 11);
  L.e('slime', 102); L.e('slime', 106); L.e('crate', 100, { drop: 'stickers' });
  L.spikes(111, 114); L.plat(110, 115, 12); L.coins(111, 4, 11);
  L.hints.push({ x: 116, t: 'AŞAĞI + K HAVAYA KALDIRIR. HAVADA J İLE DEVAM ET!' });
  L.arenas.push({ x0: 118, x1: 148, waves: [['bot', 'imp', 'imp'], ['knight', 'slime', 'bot']] });
  L.hints.push({ x: 120, t: 'ŞÖVALYENİN KALKANI SAĞLAM: KOMBOYU BİTİR YA DA ARKASINA GEÇ.' }, { x: 138, t: 'DARBE YEDİN Mİ? YERE DEĞMEDEN ZIPLA: GERİ SEK!' });
  L.pit(150, 153); L.plat(151, 152, 13);
  L.plat(156, 158, 12); L.plat(160, 162, 9); L.plat(156, 158, 6); L.e('rozet', 157, { row: 5 }); L.coins(160, 3, 8); L.e('doneri', 161, { row: 8 });
  L.e('crate', 164, { drop: 'sapan' }); L.e('knight', 169); L.e('bot', 172); L.coins(166, 5);
  L.e('flag', 178, { npc: 'tuna', gift: 'doneri', say: 'DÖNER MOLASI! CAN DA VERİR, GAZ DA.' });
  L.hints.push({ x: 180, t: 'ENERJİ BARI DOLUNCA Q: SHIP IT! HER ŞEYİ DELİP GEÇER.' });
  L.p('stage', 196); L.p('poster', 188, { y: 6, v: 1 }); L.p('poster', 212, { y: 6, v: 0 });
  L.arenas.push({ x0: 185, x1: 217, boss: 'goblin', cut: 'goblinIntro' });
  return L;
}

function chapter2() {
  const L = builder(222);
  Object.assign(L, { id: 2, name: 'KIZILAY KAOSU', sub: 'KIZILAY, AKŞAMÜSTÜ', theme: 'dusk', music: 'street', intro: 'intro2', outro: 'outro2', start: 3, plats: 'awning', bus: true });
  L.zones = [{ x0: 0, x1: 221, set: 'st' }];
  L.ground(0, 221);
  for (let x = 6; x < 220; x += 17) L.p('lamp', x);
  L.p('cart', 9); L.p('stop', 20); L.p('bench', 24, { cat: true }); L.p('metro', 33); L.p('bin', 40); L.p('bench', 64); L.p('cart', 100); L.p('stop', 118); L.p('bin', 131); L.p('bench', 160, { cat: true }); L.p('metro', 170);
  L.e('simit', 10, { row: 13 }); L.e('crate', 14, { drop: 'klavye' }); L.coins(15, 4);
  L.hints.push({ x: 13, t: 'KUTUDA KLAVYE VAR: YUMRUKLARIN DAHA UZAĞA, DAHA SERT VURUR!' });
  L.e('imp', 19); L.e('imp', 25); L.e('slime', 22);
  L.plat(28, 32, 12); L.plat(35, 39, 9); L.plat(42, 44, 6); L.coins(28, 5, 11); L.coins(35, 5, 8); L.e('rozet', 43, { row: 5 }); L.e('bot', 37, { row: 6 });
  L.arenas.push({ x0: 46, x1: 76, waves: [['imp', 'imp', 'bot'], ['knight', 'bot', 'slime'], ['knight', 'imp', 'imp']] });
  L.e('flag', 80, { npc: 'gokoz', gift: 'cay', say: 'ÇAYIN BENDEN. İÇİNCE ZAMAN YAVAŞLAMIYOR AMA SEN HIZLANIYORSUN.' });
  L.hints.push({ x: 82, t: 'METRO İNŞAATI! HAREKETLİ PLATFORMLARA DİKKAT.' });
  L.pit(84, 95);
  L.movers.push({ x: 87, row: 14, w: 40, range: 26, period: 3.2, phase: 0 }, { x: 92.5, row: 13, w: 40, range: 26, period: 3.2, phase: 1.6 });
  L.coins(86, 2, 11); L.coins(92, 2, 10);
  L.e('crate', 99, { drop: 'topac' }); L.e('slime', 102); L.e('bot', 106); L.spikes(104, 105); L.spikes(110, 112); L.plat(103, 113, 11); L.coins(104, 8, 10); L.e('imp', 115); L.e('crate', 117, { drop: 'cay' });
  L.arenas.push({ x0: 122, x1: 152, waves: [['knight', 'knight'], ['bot', 'bot', 'imp', 'imp'], ['knight', 'imp', 'bot', 'slime']] });
  L.e('flag', 156, { npc: 'mert', gift: 'topac', say: 'DÖNERCİNİN ORADA İŞLER KIZIŞMIŞ. TOPAÇLARI ONA SAKLA!' });
  L.plat(160, 162, 12); L.plat(164, 166, 9); L.plat(160, 162, 6); L.plat(166, 169, 4); L.e('rozet', 168, { row: 3 }); L.e('doneri', 161, { row: 5 }); L.coins(164, 3, 8);
  L.e('crate', 172, { drop: 'sapan' }); L.coins(173, 4);
  L.arenas.push({ x0: 180, x1: 214, boss: 'doner', cut: 'donerIntro' });
  return L;
}


function chapter3() {
  const L = builder(222);
  Object.assign(L, { id: 3, name: 'TUNALI GÖREVİ', sub: 'TUNALI HİLMİ, GECE', theme: 'night', music: 'night', intro: 'intro3', outro: 'outro3', start: 3, plats: 'awning', park: [104, 157], pond: [110, 126] });
  L.zones = [{ x0: 0, x1: 103, set: 'nt' }, { x0: 104, x1: 157, set: 'ng' }, { x0: 158, x1: 221, set: 'nt' }];
  L.ground(0, 221);
  for (const x of [5, 30, 56, 78, 98, 106, 130, 146, 166, 190, 212]) L.p('lamp', x);
  // --- cafés
  L.p('cafe', 9); L.p('cafe', 18); L.p('bench', 27, { cat: true }); L.p('cafe', 36); L.p('bin', 45); L.p('cafe', 52); L.p('cafe', 62);
  L.hints.push({ x: 6, t: 'KIRMIZI YAYLARA BAS, YUKARI FIRLA! HAVADA BİR KEZ DAHA ZIPLAMAYI DA UNUTMA.' });
  L.e('pad', 13); L.plat(16, 21, 6); L.coins(16, 6, 5); L.e('rozet', 19, { row: 5 });
  L.e('crate', 24, { drop: 'stickers' }); L.e('troll', 27); L.e('imp', 31);
  L.e('flag', 34, { npc: 'tuna', gift: 'klavye', say: 'KAFEDE KOD YAZARKEN KULLANDIĞIM KLAVYE. AL, SERT VURUR!' });
  L.hints.push({ x: 36, t: 'YORUM TROLLERİ UZAKTAN KAHVE FIRLATIR. YAKLAŞ YA DA ATIL!' });
  L.arenas.push({ x0: 38, x1: 68, waves: [['troll', 'imp'], ['troll', 'bot', 'slime'], ['knight', 'troll', 'imp']] });
  // --- bookstore and record shop
  L.p('bookstall', 70); L.p('recstall', 82); L.p('bin', 92); L.p('bookstall', 96);
  L.hints.push({ x: 71, t: 'KİTAPÇININ ÜSTÜNDE BİR ŞEY PARLIYOR. YAYI KULLAN!' });
  L.e('pad', 73); L.plat(76, 81, 6); L.coins(76, 6, 5); L.e('rozet', 78, { row: 5 }); L.e('cay', 80, { row: 5 });
  L.e('troll', 86); L.e('bot', 90); L.spikes(88, 91); L.plat(87, 92, 12); L.coins(88, 4, 11);
  L.e('crate', 94, { drop: 'topac' }); L.e('knight', 97);
  L.e('flag', 100, { npc: 'gokoz', gift: 'doneri', say: 'PLAKÇIDAN DÖNER KOKUSU GELİYOR... YOK YOK, BENDEN AL.' });
  // --- Kuğulu Park
  L.hints.push({ x: 103, t: 'KUĞULU PARK! GÖLETE DÜŞME, SU SOĞUK. KÜTÜKLERDEN ATLA.' });
  L.pit(110, 126); for (const x of [112, 116, 120, 124]) L.plat(x, x + 1, 14);
  L.coins(112, 2, 12); L.coins(116, 2, 11); L.coins(120, 2, 12); L.coins(124, 2, 11);
  L.p('swan', 114.2, { y: 13.9 }); L.p('swan', 118.2, { y: 13.9 }); L.p('swan', 122.2, { y: 13.9 }); L.p('reeds', 108); L.p('reeds', 127); L.p('reeds', 128.6);
  L.p('tree', 105); L.p('bench', 108.5); L.p('tree', 132); L.p('bench', 142, { cat: true }); L.p('tree', 150); L.p('bench', 154);
  L.e('slime', 129); L.e('crate', 131, { drop: 'stickers' });
  L.arenas.push({ x0: 130, x1: 160, waves: [['troll', 'troll', 'slime'], ['bot', 'bot', 'knight'], ['troll', 'imp', 'imp', 'bot']] });
  L.e('flag', 162, { npc: 'mert', gift: 'topac', say: 'KUĞULAR SALDIRMADI, İYİ İŞ! TOPAÇ SENDE KALSIN.' });
  // --- the plaza
  L.p('recstall', 168); L.p('cafe', 176); L.p('bookstall', 184);
  L.e('pad', 166); L.plat(169, 174, 6); L.coins(169, 6, 5);
  L.e('slime', 172); L.e('troll', 177); L.e('crate', 179, { drop: 'sapan' });
  L.hints.push({ x: 181, t: 'SPAM MAGE! ZARFLARI YUMRUKLA GERİ GÖNDER, SERSEMLER. BOTLARI DA KIR!' });
  L.arenas.push({ x0: 185, x1: 217, boss: 'spam', cut: 'spamIntro' });
  return L;
}

function chapter4() {
  const L = builder(172);
  Object.assign(L, { id: 4, name: 'SESSİZ YÜRÜYÜŞ', sub: 'ANITKABİR YOLU, GÜN DOĞARKEN', theme: 'dawn', music: 'dawn', intro: 'intro4', outro: 'outro4', start: 3, plats: 'awning', goal: 166, calm: 86 });
  L.zones = [{ x0: 0, x1: 39, set: 'dv' }, { x0: 40, x1: 85, set: 'dg' }, { x0: 86, x1: 171, set: 'av' }];
  L.ground(0, 171);
  // --- streets and park: a little scuffle on the way
  for (const x of [6, 30, 52, 76]) L.p('lamp', x);
  L.p('stop', 14); L.p('bench', 20); L.p('bin', 33); L.p('tree', 44); L.p('bench', 60, { cat: true }); L.p('tree', 70);
  L.hints.push({ x: 6, t: 'SABAH SERİN. ÖNCE ŞU GLITCH ARTIKLARINI TEMİZLEYELİM.' });
  L.e('slime', 11); L.e('imp', 16); L.coins(18, 4); L.e('crate', 22, { drop: 'cay' });
  L.arenas.push({ x0: 24, x1: 54, waves: [['slime', 'imp'], ['bot', 'imp', 'slime']] });
  L.e('flag', 38, { npc: 'gokoz', gift: 'cay', say: 'SABAH ÇAYI. YOLUN UZUN, YAVAŞ YAVAŞ GİDELİM.' });
  L.e('bot', 60); L.e('slime', 66); L.plat(62, 66, 12); L.coins(62, 5, 11);
  L.e('flag', 82, { npc: 'mert', gift: 'simit', say: 'BUNDAN SONRASI SESSİZ. HAZIR OL AKIN.' });
  // --- the quiet walk: no enemies, no pickups, only flags and the road
  for (let x = 90, i = 0; x <= 162; x += 8, i++) L.p('flagpole', x, { v: i % 2 });
  for (const x of [94, 110, 126, 142, 158]) L.p('tree', x + 3);
  L.e('flag', 124);
  L.npcs.push({ id: 'mert', x: 160 }, { id: 'tuna', x: 162 }, { id: 'gokoz', x: 164 });
  return L;
}

function chapter5() {
  const L = builder(172);
  Object.assign(L, { id: 5, name: 'SHOWCASE FİNALİ', sub: 'ÇANKAYA GENÇLİK MERKEZİ, ANA SAHNE', theme: 'stage', music: 'stage', intro: 'intro5', outro: 'ending', start: 3, plats: 'shelf', cage: 161 });
  L.zones = [{ x0: 0, x1: 171, set: 'sg' }];
  L.ground(0, 171);
  for (const x of [8, 40, 70, 100, 125]) L.p('speaker', x);
  L.p('banner', 14, { y: 3 }); L.p('banner', 76, { y: 3 }); L.p('banner', 108, { y: 3 }); L.p('plant', 23); L.p('plant', 63);
  L.hints.push({ x: 6, t: 'SAHNE ARKASI! KIRMIZI YAYLAR SENİ ÜST RAFLARA FIRLATIR.' });
  L.e('pad', 12); L.plat(15, 20, 6); L.coins(15, 6, 5); L.e('rozet', 17, { row: 5 });
  L.e('crate', 24, { drop: 'stickers' }); L.e('slime', 26); L.e('bot', 28);
  L.arenas.push({ x0: 30, x1: 60, waves: [['troll', 'troll'], ['imp', 'imp', 'bot'], ['knight', 'troll', 'slime']] });
  L.e('flag', 64, { npc: 'gokoz', gift: 'cay', say: 'JÜRİ SALONDA! SON DÜZLÜK, AKIN!' });
  L.e('crate', 66, { drop: 'topac' }); L.e('troll', 69);
  L.spikes(72, 75); L.plat(71, 76, 12); L.coins(72, 4, 11);
  L.e('knight', 79); L.e('pad', 83); L.plat(86, 91, 6); L.coins(86, 6, 5); L.e('rozet', 88, { row: 5 });
  L.arenas.push({ x0: 92, x1: 124, waves: [['knight', 'knight', 'troll'], ['bot', 'bot', 'imp', 'imp'], ['troll', 'troll', 'knight', 'slime']] });
  L.e('pad', 98); L.plat(103, 108, 10); L.e('pad', 118);
  L.e('flag', 127, { npc: 'mert', gift: 'doneri', say: 'BUG LORD SAHNEDE. HEPİMİZ ARKANDAYIZ!' });
  L.e('crate', 129, { drop: 'doneri' });
  L.hints.push({ x: 130, t: 'BUG LORD SENİ YERE SERERSE BİLE PES ETME: YERE DEĞMEDEN ZIPLA, GERİ SEK!' });
  L.p('bigscreen', 140, { y: 3 }); L.p('speaker', 134); L.p('speaker', 162);
  L.npcs.push({ id: 'mert', x: 134 }, { id: 'tuna', x: 136 }, { id: 'gokoz', x: 138 }, { id: 'ozgur', x: 161 });
  L.e('pad', 142); L.plat(145, 152, 10); L.e('pad', 156);
  L.arenas.push({ x0: 132, x1: 164, boss: 'buglord', cut: 'bugIntro' });
  return L;
}

export function createOnlineArena() {
  const L = builder(38);
  Object.assign(L, { id: 99, name: 'HAVEN ARENA', sub: 'ÇOK OYUNCULU ARENA KAPISMASI', theme: 'night', music: 'stage', start: 6 });
  L.zones = [{ x0: 0, x1: 37, set: 'in' }];
  L.ground(0, 37);
  // Arena sınır duvarları
  L.block(0, 1, 0, GR - 1);
  L.block(36, 37, 0, GR - 1);
  // Platformlar
  L.plat(5, 11, 11);
  L.plat(26, 32, 11);
  L.plat(13, 24, 8);
  // Zıplama trambolinleri
  L.e('pad', 3);
  L.e('pad', 34);
  // Kutular (çay ve döner güçlendirmeleri)
  L.e('crate', 8, { row: 10, drop: 'cay' });
  L.e('crate', 29, { row: 10, drop: 'doner' });
  // Dekoratif öğeler
  L.p('banner', 16, { y: 3 });
  L.p('speaker', 3);
  L.p('speaker', 34);
  L.p('poster', 7, { y: 6, v: 0 });
  L.p('poster', 28, { y: 6, v: 1 });
  return L;
}

export const CHAPTERS = [chapter1, chapter2, chapter3, chapter4, chapter5];
