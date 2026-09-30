// Builds cover.png (800x600) for the arcade gallery from the game's own pixel art.
// Loads game.js (without starting Phaser) in headless Google Chrome over the DevTools protocol,
// composes the scene at 400x300 with the game's sprites and font, scales it 2x without smoothing
// and saves the PNG. No npm dependencies.
//
//   node tools/make-cover.mjs            (needs Google Chrome installed)
//   CHROME=/path/to/chrome node tools/make-cover.mjs
//   CHROME_PROFILE_DIR=/some/tmp/dir ...   (optional throwaway Chrome profile; default: a fresh temp dir)
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'cover.png');
const CHROME = process.env.CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(p => existsSync(p));
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* Runs inside the page. Everything it needs comes from game.js itself. */
function compose(src) {
  const G = new Function(src + '\nreturn { setX: c => { X = c; }, F, Q, txt, tw, vehSpr, COP, HERO, HSIL, HW, HH };')();
  const LW = 400, LH = 300, L = document.createElement('canvas'); L.width = LW; L.height = LH;
  const c = L.getContext('2d'); c.imageSmoothingEnabled = false; G.setX(c);
  const { F, Q, txt } = G;
  let seed = 11; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const disc = (cx, cy, r, col, sy = 1) => { F(col); for (let j = -r; j <= r; j++) { const w = Math.round(Math.sqrt(r * r - j * j)); Q(cx - w, cy + Math.round(j * sy), 2 * w + 1, Math.max(1, Math.round(sy))); } };

  // --- sky: sunset bands with a one-row checker dither between them
  const SKY = [[0, '#1d1238'], [24, '#2c1650'], [44, '#461e66'], [62, '#6a2878'], [78, '#963478'], [92, '#c4446e'], [104, '#e8625e'], [114, '#ff8c4a'], [124, '#ffb84a'], [134, '#ffd86a']];
  SKY.forEach(([y, col], i) => {
    const y1 = i + 1 < SKY.length ? SKY[i + 1][0] : 170; F(col); Q(0, y, LW, y1 - y);
    if (i) { F(SKY[i - 1][1]); for (let x = y % 2; x < LW; x += 2) Q(x, y, 1, 1); }
  });
  for (let i = 0; i < 40; i++) { F(rnd() < .7 ? '#f2f2f2' : '#ffd23a'); Q(Math.floor(rnd() * LW), Math.floor(rnd() * 56), 1, 1); }

  // --- striped sun going down behind the Avila
  const SX = 318, SY = 92, SR = 42;
  for (let j = -SR; j <= SR; j++) {
    if (j > 4 && (j % 7) < 1 + (j - 4) / 10) continue;
    const w = Math.round(Math.sqrt(SR * SR - j * j));
    F(j < -24 ? '#fff4b0' : j < -6 ? '#ffe066' : j < 10 ? '#ffb23a' : j < 24 ? '#ff7a4a' : '#ff4f7a'); Q(SX - w, SY + j, 2 * w + 1, 1);
  }

  // --- el Avila: hazy far ridge, darker near ridge with the Silla de Caracas twin peaks, sun rim light
  const g = (x, m, s) => Math.exp(-(((x - m) / s) ** 2));
  const far = x => 150 - (30 + 26 * g(x, 110, 70) + 20 * g(x, 300, 60) + 5 * Math.sin(x * .09) + 3 * Math.sin(x * .23 + 2));
  const near = x => 158 - (22 + 16 * g(x, 60, 45) + 30 * g(x, 250, 55) + 13 * g(x, 236, 9) + 15 * g(x, 266, 9) + 4 * Math.sin(x * .13 + 1) + 2 * Math.sin(x * .41));
  for (let x = 0; x < LW; x++) {
    const a = Math.round(far(x)), b = Math.round(near(x));
    F('#5b3f6e'); Q(x, a, 1, 170 - a); F('#7a557e'); Q(x, a, 1, 1);
    F('#27463a'); Q(x, b, 1, 170 - b); F('#335a44'); Q(x, b + 3, 1, 170 - b - 3);
    F(Math.abs(x - SX) < 90 ? '#ffae5a' : '#4f8a5a'); Q(x, b, 1, 1);
    if (x % 3 === 0 && b < 150) { F('#1f3a30'); Q(x, b + 6 + (x * 7) % 9, 1, 3); }
  }

  // --- Caracas skyline with lit windows (Parque Central twin towers on the left)
  const bld = (x, w, h, col, win) => {
    const y = 162 - h; F(col); Q(x, y, w, h); F('#15101e'); Q(x + w - 1, y, 1, h);
    for (let yy = y + 3; yy < 158; yy += 4) for (let xx = x + 2; xx < x + w - 3; xx += 4) if (rnd() < win) { F(rnd() < .75 ? '#ffd23a' : '#f2c56b'); Q(xx, yy, 2, 2); }
  };
  for (let x = -6; x < LW;) { const w = 12 + Math.floor(rnd() * 18), h = 14 + Math.floor(rnd() * 30); bld(x, w, h, rnd() < .5 ? '#2a2442' : '#342a50', .35); x += w + Math.floor(rnd() * 4); }
  for (const tx of [26, 44]) { bld(tx, 13, 92, '#3a2c56', .55); F('#e03a33'); Q(tx + 6, 162 - 96, 1, 4); Q(tx + 5, 162 - 96, 3, 1); }

  // --- la Fajardo: wall, road, lanes, and the Guaire underneath
  F('#9a9488'); Q(0, 160, LW, 10); F('#d6cdb8'); Q(0, 160, LW, 1); F('#6f6a60'); for (let x = 0; x < LW; x += 32) Q(x, 161, 1, 9);
  F('#34373f'); Q(0, 170, LW, 116); F('#3f434b'); for (let i = 0; i < 260; i++) Q(Math.floor(rnd() * LW), 172 + Math.floor(rnd() * 112), 2, 1);
  F('#ffd23a'); Q(0, 171, LW, 1); F('#e8e8e8'); Q(0, 284, LW, 1);
  for (const y of [209, 247]) for (let x = -8; x < LW; x += 28) Q(x, y, 14, 2);
  F('#4a4d52'); Q(0, 285, LW, 3); F('#6e6446'); Q(0, 288, LW, 12); F('#5a5034'); Q(0, 294, LW, 6);

  // --- light rays from the hero (per pixel, so edges stay crisp)
  const HX = 72, HY = 280 - (G.HH - 2) * 3, CX = HX + Math.round(G.HW / 2) * 3, CY = HY + Math.round(G.HH * .45) * 3, img = c.getImageData(0, 0, LW, LH), d = img.data;
  for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
    const a = Math.atan2(y - CY, x - CX), k = ((a / (Math.PI * 2) * 18) % 1 + 1) % 1, r = Math.hypot(x - CX, y - CY);
    if (k < .42 && r > 20) { const t = Math.min(.34, .12 + r / 900) * (y < 170 ? 1 : .55), i = (y * LW + x) * 4; d[i] += (255 - d[i]) * t; d[i + 1] += (236 - d[i + 1]) * t; d[i + 2] += (140 - d[i + 2]) * t; }
  }
  c.putImageData(img, 0, 0);

  // --- traffic (game sprites at 2x)
  const veh = (kind, col, x, bottom) => { const v = G.vehSpr(kind, col); c.drawImage(v.img, x, bottom - v.gb * 2, v.img.width * 2, v.img.height * 2); return v; };
  veh('bus', '#3fd0e0', 232, 206); veh('car', '#ffd23a', 360, 206); veh('suv', '#2f6fe0', 318, 244); veh('car', '#e03a33', 250, 282);

  // --- speed lines and the dust the rear wheel kicks up
  F('rgba(255,255,255,.7)'); for (let i = 0; i < 16; i++) { const y = 178 + Math.floor(rnd() * 100), l = 18 + Math.floor(rnd() * 50); Q(Math.floor(rnd() * 70) - 10, y, l, 1); }
  for (const [x, y, r] of [[HX + 12, 274, 6], [HX, 268, 5], [HX - 8, 262, 3]]) { disc(x, y, r, 'rgba(210,200,190,.55)'); disc(x - 1, y - 2, Math.max(1, r - 3), 'rgba(255,255,255,.45)'); }

  // --- el fiscal chasing from behind, siren on
  const PX = -12, PB = 284, py = PB - 63;
  F('rgba(0,0,0,.4)'); Q(PX + 4, PB - 3, 70, 4);
  c.drawImage(G.COP, PX, py, 78, 63);
  disc(PX + 14, py + 1, 10, 'rgba(224,58,51,.35)'); disc(PX + 20, py + 1, 10, 'rgba(47,111,224,.35)');
  F('#e03a33'); Q(PX + 12, py - 2, 4, 4); F('#2f6fe0'); Q(PX + 17, py - 2, 4, 4); F('#fff'); Q(PX + 13, py - 1, 1, 1); Q(PX + 18, py - 1, 1, 1);
  const bub = (s, x, y) => { const w = G.tw(s, 2) + 8; F('#151515'); Q(x - 1, y - 1, w + 2, 16); F('#fff'); Q(x, y, w, 14); Q(x + 6, y + 14, 4, 3); F('#151515'); Q(x + 5, y + 15, 1, 2); Q(x + 10, y + 14, 1, 3); txt(s, x + 4, y + 2, '#151515', 2, 'l', null); };
  bub('PARATE AHI!', 2, py - 26);

  // --- the hero at 3x with a white sticker border
  F('rgba(0,0,0,.35)'); Q(HX + 20, 281, 52, 3);
  for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, -2], [-2, 2], [2, 2]]) c.drawImage(G.HSIL, HX + dx, HY + dy, G.HW * 3, G.HH * 3);
  c.drawImage(G.HERO, HX, HY, G.HW * 3, G.HH * 3);

  // --- title in the game's font: shadow, black outline, darker bevel, yellow face
  const title = (s, y, sc, col, bev, o) => {
    const x = 200;
    txt(s, x + o + 1, y + o + 2, '#2a1030', sc, 'c', null);
    for (let dy = -o; dy <= o; dy++) for (let dx = -o; dx <= o; dx++) if (dx || dy) txt(s, x + dx, y + dy, '#151515', sc, 'c', null);
    txt(s, x, y + 1, bev, sc, 'c', null); txt(s, x, y, col, sc, 'c', null);
  };
  title('MOTO PIRUETAS', 10, 7, '#e6ff00', '#9fb800', 2);
  title('EL MOTORIZADO ENAMORADO', 54, 3, '#f28aa0', '#c0587a', 1);

  const out = document.createElement('canvas'); out.width = 800; out.height = 600;
  const o = out.getContext('2d'); o.imageSmoothingEnabled = false; o.drawImage(L, 0, 0, 800, 600);
  return out.toDataURL('image/png');
}

async function main() {
  if (!CHROME) throw new Error('Google Chrome not found; set CHROME=/path/to/chrome');
  let src = readFileSync(join(ROOT, 'game.js'), 'utf8');
  const cut = src.indexOf('new Phaser.Game(');
  if (cut < 0) throw new Error('game.js: "new Phaser.Game(" not found');
  src = src.slice(0, cut);
  const own = !process.env.CHROME_PROFILE_DIR, prof = own ? mkdtempSync(join(tmpdir(), 'moto-cover-')) : process.env.CHROME_PROFILE_DIR;
  mkdirSync(prof, { recursive: true }); rmSync(join(prof, 'DevToolsActivePort'), { force: true });
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${prof}`, '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', 'about:blank'], { stdio: 'ignore' });
  const guard = setTimeout(() => { console.error('timeout'); chrome.kill('SIGKILL'); process.exit(1); }, 45000);
  let ws;
  try {
    let port;
    for (let i = 0; i < 150 && !port; i++) { try { port = readFileSync(join(prof, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim(); } catch {} if (!port) await sleep(100); }
    if (!port) throw new Error('Chrome did not open the DevTools port');
    let page;
    for (let i = 0; i < 50 && !page; i++) { try { page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch {} if (!page) await sleep(100); }
    if (!page) throw new Error('no page target');
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    let id = 0; const pending = new Map();
    ws.addEventListener('message', m => { const d = JSON.parse(m.data); const p = pending.get(d.id); if (p) { pending.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); } });
    const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
    const r = await send('Runtime.evaluate', { expression: `(${compose.toString()})(${JSON.stringify(src)})`, returnByValue: true });
    if (r.exceptionDetails) throw new Error('page error: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    const png = Buffer.from(String(r.result.value).replace(/^data:image\/png;base64,/, ''), 'base64');
    const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
    if (png.readUInt32BE(0) !== 0x89504e47 || w !== 800 || h !== 600) throw new Error(`unexpected PNG ${w}x${h}`);
    if (png.length > 500 * 1024) throw new Error(`cover too big: ${png.length} bytes`);
    writeFileSync(OUT, png);
    console.log(`cover.png ${w}x${h}, ${(png.length / 1024).toFixed(1)} KB`);
  } finally {
    clearTimeout(guard); try { ws?.close(); } catch {} chrome.kill('SIGKILL');
    if (own) { await sleep(300); rmSync(prof, { recursive: true, force: true }); }
  }
}
main().catch(e => { console.error(e.message); process.exit(1); });
