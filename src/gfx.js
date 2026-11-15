// Pixel drawing primitives, pixel font and small helpers shared by every module.
export const OUT = '#141021';

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
export const sgn = (v) => (v < 0 ? -1 : 1);

export function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}

const hexCache = new Map();
function rgb(col) {
  let v = hexCache.get(col);
  if (!v) {
    v = [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)];
    hexCache.set(col, v);
  }
  return v;
}

// Integer pixel buffer with per-layer outlining, used to "hand place" every sprite pixel.
export class Buf {
  constructor(w, h = w) {
    this.w = w;
    this.h = h;
    this.d = new Array(w * h).fill(null);
  }
  set(x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || c === undefined) return;
    this.d[y * this.w + x] = c;
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.d[y * this.w + x];
  }
  rect(x, y, w, h, c) {
    const x0 = Math.round(x), y0 = Math.round(y), x1 = Math.round(x + w), y1 = Math.round(y + h);
    for (let py = y0; py < y1; py++) for (let px = x0; px < x1; px++) this.set(px, py, c);
  }
  ell(cx, cy, rx, ry, c) {
    for (let py = Math.floor(cy - ry); py <= Math.ceil(cy + ry); py++)
      for (let px = Math.floor(cx - rx); px <= Math.ceil(cx + rx); px++) {
        const dx = (px - cx) / rx, dy = (py - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(px, py, c);
      }
  }
  // thick shaded segment (limbs)
  seg(x0, y0, x1, y1, r, c, light, dark) {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    const r0 = Math.floor(-r), r1 = Math.ceil(r);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, cx = x0 + (x1 - x0) * t, cy = y0 + (y1 - y0) * t;
      for (let dy = r0; dy <= r1; dy++)
        for (let dx = r0; dx <= r1; dx++)
          if (dx * dx + dy * dy <= r * r + 0.25) {
            let col = c;
            if (light && dy < -r * 0.25) col = light;
            else if (dark && dy > r * 0.35) col = dark;
            this.set(cx + dx, cy + dy, col);
          }
    }
  }
  line(x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
  }
  outline(col = OUT) {
    const o = new Buf(this.w, this.h);
    o.d = this.d.slice();
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.d[y * this.w + x] !== null) continue;
        if (this.get(x + 1, y) || this.get(x - 1, y) || this.get(x, y + 1) || this.get(x, y - 1)) o.d[y * this.w + x] = col;
      }
    return o;
  }
  blit(src, ox = 0, oy = 0) {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const c = src.d[y * src.w + x];
        if (c !== null) this.set(x + ox, y + oy, c);
      }
    return this;
  }
  // quarter turn clockwise, used for knocked-out poses
  rot90() {
    const o = new Buf(this.h, this.w);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) o.d[x * o.w + (this.h - 1 - y)] = this.d[y * this.w + x];
    return o;
  }
  canvas() {
    const [c, g] = cv(this.w, this.h);
    const img = g.createImageData(this.w, this.h);
    for (let i = 0; i < this.d.length; i++) {
      const col = this.d[i];
      if (!col) continue;
      const v = rgb(col);
      img.data[i * 4] = v[0];
      img.data[i * 4 + 1] = v[1];
      img.data[i * 4 + 2] = v[2];
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
}

const flipCache = new WeakMap();
export function flipH(c) {
  let f = flipCache.get(c);
  if (!f) {
    const [n, g] = cv(c.width, c.height);
    g.translate(c.width, 0);
    g.scale(-1, 1);
    g.drawImage(c, 0, 0);
    f = n;
    flipCache.set(c, f);
  }
  return f;
}
const whiteCache = new WeakMap();
export function whiten(c) {
  let f = whiteCache.get(c);
  if (!f) {
    const [n, g] = cv(c.width, c.height);
    g.drawImage(c, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, c.width, c.height);
    f = n;
    whiteCache.set(c, f);
  }
  return f;
}

// ---------------------------------------------------------------- pixel font (5x7 body, Turkish capitals)
const G = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#', B: '####.|#...#|#...#|####.|#...#|#...#|####.',
  C: '.####|#....|#....|#....|#....|#....|.####', D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
  E: '#####|#....|#....|####.|#....|#....|#####', F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.####|#....|#....|#.###|#...#|#...#|.####', H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '###|.#.|.#.|.#.|.#.|.#.|###', J: '..###|...#.|...#.|...#.|...#.|#..#.|.##..',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#', L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#', N: '#...#|##..#|#.#.#|#.#.#|#..##|#...#|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.', P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#', R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.', T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.', V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  W: '#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#', X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..', Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.', 1: '.#.|##.|.#.|.#.|.#.|.#.|###',
  2: '.###.|#...#|....#|...#.|..#..|.#...|#####', 3: '####.|....#|....#|.###.|....#|....#|####.',
  4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.', 5: '#####|#....|####.|....#|....#|#...#|.###.',
  6: '.###.|#....|#....|####.|#...#|#...#|.###.', 7: '#####|....#|...#.|..#..|..#..|..#..|..#..',
  8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.', 9: '.###.|#...#|#...#|.####|....#|....#|.###.',
  '!': '#|#|#|#|#|.|#', '?': '.###.|#...#|....#|...#.|..#..|.....|..#..', '.': '.|.|.|.|.|.|#', ',': '..|..|..|..|..|.#|#.',
  ':': '.|.|#|.|.|#|.', "'": '#|#|.|.|.|.|.', '"': '#.#|#.#|...|...|...|...|...', '-': '...|...|...|###|...|...|...',
  '+': '...|...|.#.|###|.#.|...|...', '/': '....#|...#.|...#.|..#..|.#...|.#...|#....', '(': '.#|#.|#.|#.|#.|#.|.#',
  ')': '#.|.#|.#|.#|.#|.#|#.', '%': '##..#|##.#.|...#.|..#..|.#...|.#.##|#..##', '>': '#...|.#..|..#.|...#|..#.|.#..|#...',
  '<': '...#|..#.|.#..|#...|.#..|..#.|...#', '*': '.....|#.#.#|.###.|#####|.###.|#.#.#|.....', 'x': '.....|.....|#...#|.#.#.|..#..|.#.#.|#...#',
  '=': '....|....|####|....|####|....|....', '#': '.#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#.', '_': '.....|.....|.....|.....|.....|.....|#####',
  '♥': '.....|.#.#.|#####|#####|.###.|..#..|.....', '▲': '.....|..#..|..#..|.###.|.###.|#####|.....',
  '▼': '.....|#####|.###.|.###.|..#..|..#..|.....', '★': '..#..|..#..|#####|.###.|.###.|##.##|#...#',
  '●': '.###.|#####|#####|#####|#####|#####|.###.', '◆': '..#..|.###.|#####|#####|#####|.###.|..#..', '»': '#.#..|.#.#.|..#.#|..#.#|..#.#|.#.#.|#.#..',
};
const ACC = { 'Ö': ['O', '.#.#.'], 'Ü': ['U', '.#.#.'], 'İ': ['I', '.#.'], 'Ğ': ['G', '.###.'], 'Ç': ['C', null, '..#..'], 'Ş': ['S', null, '..#..'], 'Â': ['A', '..#..|.#.#.'] };
const glyphs = new Map(); // char -> {w, px:[[x,y]...]}
function glyph(ch) {
  let g = glyphs.get(ch);
  if (g) return g;
  let rows, top = null, bot = null;
  if (ACC[ch]) {
    rows = G[ACC[ch][0]].split('|');
    top = ACC[ch][1];
    bot = ACC[ch][2];
  } else if (G[ch]) rows = G[ch].split('|');
  else rows = null;
  if (!rows) g = { w: 3, px: [] };
  else {
    const px = [];
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === '#') px.push([x, y + 2]); });
    if (top) top.split('|').forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === '#') px.push([x, y]); });
    if (bot) for (let x = 0; x < bot.length; x++) if (bot[x] === '#') px.push([x, 9]);
    g = { w: rows[0].length, px };
  }
  glyphs.set(ch, g);
  return g;
}
export function textW(str, scale = 1) {
  let w = 0;
  for (const ch of str) w += glyph(ch).w + 1;
  return Math.max(0, w - 1) * scale;
}
// align: 0 left, 0.5 center, 1 right. Text box is 10 rows high (accent row, gap, 7 body rows, cedilla row).
export function text(g, str, x, y, col = '#fff', scale = 1, align = 0, shadow = null) {
  x = Math.round(x - textW(str, scale) * align);
  y = Math.round(y);
  if (shadow) {
    text(g, str, x + scale, y + scale, shadow, scale, 0, null);
  }
  g.fillStyle = col;
  for (const ch of str) {
    const gl = glyph(ch);
    for (let i = 0; i < gl.px.length; i++) g.fillRect(x + gl.px[i][0] * scale, y + gl.px[i][1] * scale, scale, scale);
    x += (gl.w + 1) * scale;
  }
}
export function wrap(str, maxW) {
  const out = [];
  let line = '';
  for (const word of str.split(' ')) {
    const t = line ? line + ' ' + word : word;
    if (textW(t) > maxW && line) {
      out.push(line);
      line = word;
    } else line = t;
  }
  if (line) out.push(line);
  return out;
}
