# Haven Ankara: Çay, Döner ve Code Jam

Hack Club Haven Ankara için yapılmış, hikâyeli 2D pixel art aksiyon-platform oyunu.
Akın, maskot kirpi Devin ile birlikte Bug Lord'un kaçırdığı Özgür'ün peşine düşer.

**Oyna:** `index.html` dosyasını bir web sunucusundan aç (ör. GitHub Pages ya da `python3 -m http.server`).
Derleme adımı ve bağımlılık yok; bütün grafikler ve sesler kodla üretilir.

## İçerik

- 2 bölüm: **Kapılar Açılıyor** (Çankaya Gençlik Merkezi, boss: Deadline Goblin) ve **Kızılay Kaosu** (boss: Döner Overlord, iki aşamalı)
- 4 düşman türü: Glitch Slime, Merge Conflict Imp, Spam Bot, Laptop Şövalyesi
- Üçlü kombo, tekme, havaya kaldırma, hava saldırısı, yere çakılma, atılma, "Ship It" özel saldırısı
- Silahlar: topaç, sapan, klavye. Güçlendirmeler: çay, döner, simit
- Arena dalgaları, kayıt noktaları, gizli rozetler, hareketli platformlar, dükkân ve otomatik kayıt
- Klavye ve dokunmatik kontroller; telefon, tablet ve masaüstünde çalışır

## Kontroller

| Tuş | İşlev |
| --- | --- |
| A / D veya oklar | Yürü |
| Boşluk / W | Zıpla (iki kez) |
| J | Yumruk (üçlü kombo) |
| K | Tekme, havada yere çakıl |
| S + K | Havaya kaldır |
| Shift | Atıl |
| L | Silahı fırlat |
| Q | Ship It (enerji dolunca) |
| S + Boşluk | Platformdan in |
| Esc | Duraklat |

## Kod yapısı

- `src/gfx.js` piksel tamponu, piksel font
- `src/heroes.js` insan biçimli karakterlerin sprite üreticisi
- `src/art.js` düşmanlar, eşyalar, karolar, arka planlar
- `src/levels.js` bölüm düzenleri ve diyaloglar
- `src/game.js` fizik, dövüş, düşman yapay zekâsı, çizim
- `src/ui.js` HUD, menüler, diyalog kutusu
- `src/audio.js` ses efektleri ve müzik
- `src/main.js` giriş, kayıt, oyun akışı
