// Level layouts and story scripts. Tiles: 0 empty, 1 solid, 2 one-way platform, 3 glitch spikes.
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
  L.npcs.push({ id: 'mert', x: 7 }, { id: 'tuna', x: 10 }, { id: 'gokoz', x: 13 }, { id: 'ozgur', x: 16, story: true });
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
  L.hints.push({ x: 120, t: 'ŞÖVALYENİN KALKANI SAĞLAM: KOMBOYU BİTİR YA DA ARKASINA GEÇ.' });
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

export const CHAPTERS = [chapter1, chapter2];

export const STORY = {
  intro1: [
    ['devin', "HAVEN ANKARA'YA HOŞ GELDİN AKIN! 48 SAAT, BİR OYUN, SINIRSIZ ÇAY."],
    ['akin', 'SINIRSIZ ÇAY MI? TAMAM, KALDIM.'],
    ['mert', "KAYIT ŞURADA. STICKER'INI AL, PRİZ KAPMACA BAŞLAMADAN OTUR."],
    ['tuna', 'PRİZ KAPMACA DÜN BAŞLADI MERT. BEN ÜÇ ÇOKLU PRİZ SAKLADIM.'],
    ['gokoz', 'BENİM FİKİR ŞU: OYUNUMUZDA DÖNER UÇSUN. FİZİĞİNE SONRA BAKARIZ.'],
    ['ozgur', "SHOWCASE'E KADAR HER ŞEY KONTROLÜM ALTINDA. HİÇBİR ŞEY TERS GİD-"],
    ['buglord', "TERS GİTMEK Mİ DEDİNİZ? BEN BUG LORD! SHOWCASE'İNİZ ARTIK BENİM!"],
    ['buglord', 'ŞU KARİZMATİK ORGANİZATÖRÜ DE ALIYORUM. PRENSESSİZ HİKÂYE OLMAZ!'],
    ['ozgur', 'PRENSES Mİ?! BARİ TACIM DÜZGÜN OLSUN... AKIN, LAPTOPUMA DOKUNMA!', 'kidnap'],
    ['devin', "ÖZGÜR'Ü KAÇIRDI! HER YER GLITCH DOLDU! AKIN, YUMRUKLARIN ŞARJLI MI?"],
    ['akin', 'GÖZLÜĞÜM TAKILI. YETERİNCE ŞARJLIYIM.'],
  ],
  goblinIntro: [
    ['goblin', 'TİK TAK TİK TAK! TESLİME ÜÇ DAKİKA KALDI! PANİK YAPIN!'],
    ['akin', 'SEN DE KİMSİN?'],
    ['goblin', 'DEADLINE GOBLIN! HER PROJENİN SON GECESİNDE BEN VARIM!'],
    ['devin', 'KOŞARKEN DUVARA TOSLARSA SERSEMLİYOR, O ZAMAN VUR! BEN VURAMAM, KOLLARIM KISA.'],
  ],
  outro1: [
    ['goblin', 'TESLİM... ERTELENDİ...'],
    ['mert', "BUG FIXED! ÖZGÜR'ÜN İZİ KIZILAY'A GİDİYOR."],
    ['tuna', 'BEN BURADA KALIP LAPTOPLARI KURTARIYORUM. SEN YOLA DEVAM ET.'],
    ['gokoz', "BUG LORD SHOWCASE EKRANINI İSTİYOR. ÖNCE KIZILAY'I GEÇMEN LAZIM."],
    ['akin', "KIZILAY'DA AKŞAM TRAFİĞİ... ASIL BOSS O."],
    ['devin', "HADİ! EGO'YU BEKLEMEYELİM, YÜRÜYEREK DAHA HIZLI."],
  ],
  intro2: [
    ['devin', 'KIZILAY! NEONLAR, SİMİTÇİLER VE... HER YERDE GLITCH.'],
    ['akin', 'DÖNERCİYE DOKUNMASINLAR DA GERİSİ KOLAY.'],
    ['devin', 'ŞEY... O KONUDA KÖTÜ BİR HABERİM OLABİLİR.'],
    ['akin', 'DEVİN.'],
    ['devin', 'YÜRÜ YÜRÜ, BELKİ YANLIŞ GÖRMÜŞÜMDÜR!'],
  ],
  donerIntro: [
    ['doner', 'BEN DÖNER OVERLORD! BUG LORD BANA BİLİNÇ VERDİ, BEN DE ONA SADAKAT!'],
    ['akin', 'BİR DÖNER... KONUŞUYOR.'],
    ['doner', 'ARTIK KİMSE BENİ YARIM EKMEĞE KOYAMAYACAK! AYRAN DA BENİM!'],
    ['devin', 'DÖNERKEN DOKUNMA! DURUNCA BAŞI DÖNÜYOR, O ZAMAN GİR. LAVAŞ KALKANINA TOPAÇ AT!'],
    ['akin', 'AFFET USTA. KİŞİSEL DEĞİL. ...BİRAZ KİŞİSEL.'],
  ],
  outro2: [
    ['doner', 'BOL... SOĞANLI... OLSUN...'],
    ['ozgur', "(TELSİZDEN) AKIN! BUG LORD BENİ TUNALI'YA GÖTÜRÜYOR! BU TAÇ DA ÇOK AĞIR!"],
    ['akin', 'DAYAN ÖZGÜR! BİR ÇAY İÇEYİM, HEMEN GELİYORUM.'],
    ['devin', 'KIZILAY KURTULDU! SIRADAKİ DURAK TUNALI. O BÖLÜM HÂLÂ DERLENİYOR AMA.'],
    ['devin', "YANİ: DEVAMI SONRAKİ BUILD'DE. O ZAMANA KADAR DÜKKÂNA UĞRA, GÜÇLEN!"],
  ],
};
