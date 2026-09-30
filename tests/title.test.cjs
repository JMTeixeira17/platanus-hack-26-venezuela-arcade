// Behavioral tests for the static title screen (hero, name, ranking, controls, START, Platanus footer)
// and for the PLATANUS HACK 2026 intro shown before a match.
const fs = require('fs');
let src = fs.readFileSync(require('path').join(__dirname, '..', 'game.js'), 'utf8');
src = src.slice(0, src.indexOf('new Phaser.Game('));
/* Record every txt() call as [text, scale], and count simStep / drawRun calls, so tests can see what a screen does. */
src = 'const TXT = []; let SIMN = 0, DRN = 0;\n' + src
  .replace("function txt(s, x, y, col, sc = 1, al = 'l', sh = '#000') {", "function txt(s, x, y, col, sc = 1, al = 'l', sh = '#000') { TXT.push([String(s), sc]);")
  .replace('function simStep(S, dt) {', 'function simStep(S, dt) { SIMN++;')
  .replace(/function drawRun\(S[^)]*\) \{/, m => m + ' DRN++;');
global.window = { addEventListener() {} };
global.document = { createElement: () => ({ getContext: () => ({ set fillStyle(v) {}, fillRect() {} }) }) };
const G = new Function(src + `
return { drawTitle, render, tick, W, H, STEP, held, pressed, TXT, FONT, norm, tw, pressTxt,
  setX: c => { X = c; }, setMT: t => { MT = t; }, setMode: md => { MODE = md; MT = 0; }, getMode: () => MODE, getMT: () => MT,
  counts: () => ({ sim: SIMN, draw: DRN }), getRun: () => RUN, setRun: r => { RUN = r; }, newRun, getSel: () => SEL, setSel: s => { SEL = s; }, getRank: () => RANK,
  get hero() { return { img: HERO, w: HW, h: HH, keys: HK, pal: PAL, px: HF }; } };`)();

/* Fake canvas: records every fillRect and drawImage with its destination box (the menus use no transforms). */
function fake(log) {
  let fs = '';
  return { set fillStyle(v) { fs = v; }, get fillStyle() { return fs; }, set globalAlpha(v) {}, get globalAlpha() { return 1; },
    fillRect(x, y, w, h) { log.push({ k: 'r', x, y, w, h, c: fs }); },
    drawImage(img, x, y, w, h) { log.push({ k: 'i', img, x, y, w: w == null ? img.width : w, h: h == null ? img.height : h }); },
    save() {}, restore() {}, translate() {}, rotate() {}, setTransform() {} };
}
function release() { for (const k in G.held) G.held[k] = false; for (const k in G.pressed) G.pressed[k] = false; }
function paintTitle(t) { const log = []; G.setX(fake(log)); G.setMT(t); G.TXT.length = 0; G.drawTitle(); return log; }
function frame(mode, t) { const log = []; G.setX(fake(log)); G.setMode(mode); G.setMT(t); G.TXT.length = 0; G.render(); return log; }
const texts = () => G.TXT.map(q => q[0]);
const key = e => [e.k, e.x, e.y, e.w, e.h, e.c].join();
const rgbOf = c => { const m = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(String(c).replace(/\s/g, '')); if (m) return m.slice(1).map(Number); const h = /^#([0-9a-f]{6})$/i.exec(c); return h ? [0, 2, 4].map(k => parseInt(h[1].substr(k, 2), 16)) : null; };
/* HSV of an [r, g, b] triple: hue in degrees, saturation and value in 0..1. */
const hsv = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; return [h < 0 ? h + 360 : h, mx ? d / mx : 0, mx / 255]; };
/* Ray colours: rgb() shades of the title-band yellow #e6ff00 (hue ~65.9 deg), kept bright (value >= 85%); hex text/band colours never match. */
const isBurst = c => { const v = /^rgb\(/.test(String(c)) && rgbOf(c); if (!v) return false; const [h, sat, val] = hsv(v); return Math.abs(h - 65.9) <= 2 && sat >= .4 && val >= .85; };
/* Night-sky star colours drawn by the shared blue background (dim, mid, bright). */
const STAR = ['#5a6aa8', '#aab8ee', '#ffffff'];
const stars = log => log.filter(e => e.k === 'r' && STAR.includes(e.c) && e.w <= 3 && e.h <= 3);
const geoKey = e => isBurst(e.c) ? [e.k, e.x, e.y, e.w, e.h, 'ray'].join() : key(e);
const inside = e => [e.x, e.y, e.w, e.h].every(Number.isFinite) && e.x >= 0 && e.y >= 0 && e.x + e.w <= G.W && e.y + e.h <= G.H;
const ON = .1, OFF = .5;                 // START prompt shown / hidden (it blinks at 2.5 Hz)
const PROMPT = [203, 217];               // y band of the scale-2 prompt at y 204 (with its shadow)
const hits = (e, [a, b]) => e.y < b && e.y + e.h > a;
const full = e => e.x <= 0 && e.x + e.w >= G.W;
/* Press a button for one tick, like update() does (pressed flags are cleared after each tick). */
function press(code) { G.held[code] = true; G.pressed[code] = true; G.tick(G.STEP); G.held[code] = false; for (const k in G.pressed) G.pressed[k] = false; }
function ticks(n) { for (let i = 0; i < n; i++) { G.tick(G.STEP); for (const k in G.pressed) G.pressed[k] = false; } }
function toIntro(sel = 2) { release(); G.setX(fake([])); G.setMode('select'); G.setSel(sel); G.setRun(null); ticks(20); press('P1_1'); }

const cases = [
  /* ---------- static title ---------- */
  ['title layout is static: only the ray colours (and the prompt blink) change over time', () => {
    const a = paintTitle(ON).map(geoKey).join('|');
    return a.length > 0 && [.9, 7.3, 13.7, 21.7, 61.7].every(t => paintTitle(t).map(geoKey).join('|') === a);
  }],
  ['the blinking START prompt is the only thing that changes, and it sits on the prompt row', () => {
    const on = paintTitle(ON), off = new Set(paintTitle(OFF).map(geoKey)), extra = on.filter(e => !off.has(geoKey(e)));
    G.TXT.length = 0; paintTitle(ON); const said = texts().includes(G.pressTxt());
    return said && extra.length > 50 && extra.every(e => e.y >= 204 && e.y + e.h <= 217) && paintTitle(OFF).length === on.length - extra.length;
  }],
  ['title does not draw or simulate the running game behind it', () => {
    release(); const before = G.counts();
    frame('title', 0); ticks(600); G.render();
    const after = G.counts(); G.TXT.length = 0; G.render();
    return G.getMode() === 'title' && after.sim === before.sim && after.draw === before.draw && !texts().some(s => /TIEMPO|PUNTOS|SIRENA/.test(s));
  }],
  ['title writes MOTOPIRUETAS as one word at scale 4, inside the screen', () => {
    paintTitle(ON); const t = G.TXT.filter(q => q[0] === 'MOTOPIRUETAS');
    return t.length === 1 && t[0][1] === 4 && G.tw('MOTOPIRUETAS', 4) + 8 <= G.W && !texts().some(q => /MOTO PIRUETAS|ESMACHETAO|FRENOS/.test(q));
  }],
  ['a solid yellow band is drawn behind the dark title text', () => {
    const log = paintTitle(ON), bi = log.findIndex(e => e.k === 'r' && e.c === '#e6ff00' && e.w >= G.W && e.h >= 24);
    if (bi < 0) return false; const b = log[bi];
    const glyphs = log.map((e, i) => [e, i]).filter(([e]) => e.k === 'r' && e.w === 4 && e.h === 4 && e.c === '#151515');
    return glyphs.length > 100 && glyphs.every(([e, i]) => i > bi && e.y >= b.y && e.y + e.h <= b.y + b.h);
  }],
  ['EL MOTORIZADO ENAMORADO is written in ice white just below the band', () => {
    const log = paintTitle(ON), b = log.find(e => e.k === 'r' && e.c === '#e6ff00' && e.w >= G.W && e.h >= 24), sub = log.filter(e => e.k === 'r' && e.c === '#eaf6ff' && e.y < 60);
    return texts().includes('EL MOTORIZADO ENAMORADO') && !texts().includes('HORA PICO EN LA FAJARDO') && sub.length > 30 && sub.every(e => e.y >= b.y + b.h && e.y < b.y + b.h + 16);
  }],
  ['hero and controls are on the same screen, and there is no ranking on the title', () => {
    const log = paintTitle(ON), t = texts(), hero = log.filter(e => e.k === 'i' && e.img === G.hero.img);
    const noRank = !t.includes('LOS MAS PIRUETEROS') && !G.getRank().some(e => t.includes(String(e.s).padStart(6, '0')));
    const ctl = ['WASD', 'MOVERSE', 'J', 'CABALLITO', 'K', 'CORNETA'].every(w => t.includes(w)) && !t.some(s => /CARRIL|ACELERA|GIRAR|BOTON|MATAS|CONTROLES/.test(s));
    return hero.length === 1 && hero[0].w === G.hero.w * 2 && hero[0].h === G.hero.h * 2 && noRank && ctl;
  }],
  ['the hero is centered horizontally', () => { const h = paintTitle(ON).find(e => e.k === 'i' && e.img === G.hero.img); return Math.abs(h.x + h.w / 2 - G.W / 2) <= 1; }],
  ['the title background is a vertical gradient from #000628 (top) to #011469 (bottom)', () => {
    const rgb = c => { const m = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(String(c).replace(/\s/g, '')); if (m) return m.slice(1).map(Number); const h = /^#([0-9a-f]{6})$/i.exec(c); return h ? [0, 2, 4].map(k => parseInt(h[1].substr(k, 2), 16)) : null; };
    const log = paintTitle(ON), rows = log.filter(e => e.k === 'r' && full(e) && e.h === 1 && rgb(e.c)).sort((a, b) => a.y - b.y);
    if (rows.length < 60 || rows[0].y !== 0 || rows[rows.length - 1].y + rows[rows.length - 1].h < G.H) return false;
    const top = rgb(rows[0].c), bot = rgb(rows[rows.length - 1].c), blues = rows.map(r => rgb(r.c)[2]);
    const same = (a, b) => a.every((v, k) => Math.abs(v - b[k]) <= 1);
    return same(top, [0, 6, 40]) && same(bot, [1, 20, 105]) && blues.every((v, k) => !k || v >= blues[k - 1]) && !log.some(e => e.k === 'r' && ['#140c22', '#211833', '#000', '#000000'].includes(e.c) && full(e) && e.h >= G.H);
  }],
  ['everything on the title stays inside 0..320 x 0..240 with finite coordinates', () => [ON, OFF].every(t => paintTitle(t).every(inside))],
  ['nothing but the START prompt touches the prompt row (backgrounds aside)', () => {
    const off = paintTitle(OFF);
    return off.every(e => full(e) || STAR.includes(e.c) || !hits(e, PROMPT));
  }],
  ['controls sit on both sides of the centered hero, never on it or on the burst', () => {
    const log = paintTitle(ON), b = log.find(e => e.k === 'r' && e.c === '#e6ff00' && e.w >= G.W && e.h >= 24), hero = log.find(e => e.k === 'i' && e.img === G.hero.img);
    const px = log.filter(e => e.k === 'r' && e.w <= 2 && e.h <= 2 && e.y >= b.y + b.h + 18 && e.y < PROMPT[0] && ['#e6ff00', '#f2f2f2'].includes(e.c));
    const burst = log.filter(e => e.k === 'r' && isBurst(e.c) && e.y > b.y + b.h && e.y < PROMPT[0]);
    const apart = (p, r) => p.x + p.w <= r.x || r.x + r.w <= p.x || p.y + p.h <= r.y || r.y + r.h <= p.y;
    const beside = px.every(e => e.x + e.w <= hero.x || e.x >= hero.x + hero.w);
    return hero.y >= b.y + b.h && hero.y + hero.h <= PROMPT[0] && px.length > 100 && beside && px.some(e => e.x < hero.x) && px.some(e => e.x >= hero.x + hero.w) && px.every(p => burst.every(r => apart(p, r)));
  }],
  ['footer names PLATANUS HACK 26 with a small banana icon next to it', () => {
    const log = paintTitle(ON), t = texts(), ban = log.filter(e => e.k === 'r' && e.y >= 218 && ['#ffd23a', '#f2c56b', '#c98a3a', '#8a5530'].includes(e.c));
    const words = log.filter(e => e.k === 'r' && e.y >= 218 && e.c === '#8e8e88');
    return t.some(s => s.includes('PLATANUS HACK 26')) && ban.length >= 4 && words.length > 0 && Math.max(...ban.map(e => e.x + e.w)) <= Math.min(...words.map(e => e.x));
  }],
  ['rendering the title for 20 s never throws and keeps drawing the hero', () => {
    release(); const log = []; G.setX(fake(log)); G.setMode('title');
    for (let i = 0; i < 20 * 60; i++) { G.tick(G.STEP); if (i % 30 === 0) G.render(); }
    return G.getMode() === 'title' && log.filter(e => e.k === 'i' && e.img === G.hero.img).length === 40;
  }],
  /* ---------- hero sprite ---------- */
  ['hero sprite decodes to exactly its declared width x height', () => {
    const h = G.hero, px = h.px;
    return h.w >= 48 && h.h >= 40 && px.length === h.w * h.h && h.img.width === h.w && h.img.height === h.h;
  }],
  ['every hero pixel uses a key of its palette, and every key has a colour', () => {
    const h = G.hero, px = h.px;
    return px.every(k => h.keys.includes(k)) && [...h.keys].every(k => k === '.' || /^#[0-9a-f]{6}$/i.test(h.pal[k])) && h.keys.length <= 17;
  }],
  ['hero sprite keeps a transparent 1 px border so the outline fits', () => {
    const h = G.hero, px = h.px, at = (x, y) => px[y * h.w + x];
    for (let x = 0; x < h.w; x++) if (at(x, 0) !== '.' || at(x, h.h - 1) !== '.') return false;
    for (let y = 0; y < h.h; y++) if (at(0, y) !== '.' || at(h.w - 1, y) !== '.') return false;
    return true;
  }],
  /* ---------- name ---------- */
  ['metadata.json names the game "Moto Piruetas: El Motorizado Enamorado"', () => require('../metadata.json').game_name === 'Moto Piruetas: El Motorizado Enamorado'],
  /* ---------- PLATANUS HACK 2026 intro ---------- */
  ['confirming a rider goes to the intro first, not straight to the match', () => { toIntro(); return G.getMode() === 'intro' && G.getRun() === null; }],
  ['intro: black screen with PLATANUS HACK 2026, CARACAS and the Venezuelan flag', () => {
    const log = frame('intro', .5), t = texts();
    const Y = log.find(e => e.c === '#ffd23a' && e.w >= 60), B = Y && log.find(e => e.c === '#1b4fa0' && e.x === Y.x && e.w === Y.w && e.y === Y.y + Y.h && e.h === Y.h);
    const R = B && log.find(e => e.c === '#e03a33' && e.x === Y.x && e.w === Y.w && e.y === B.y + B.h && e.h === Y.h);
    const stars = B ? log.filter(e => e.c === '#f2f2f2' && e.x >= B.x && e.x + e.w <= B.x + B.w && e.y >= B.y && e.y + e.h <= B.y + B.h) : [];
    const bg = log.filter(full), colours = new Set(log.map(e => e.c));
    return t.includes('PLATANUS HACK 2026') && t.includes('CARACAS') && !!R && stars.length >= 8 && bg.length >= 1 && bg.every(e => e.c === '#000')
      && [...colours].every(c => ['#000', '#ffd23a', '#1b4fa0', '#e03a33', '#f2f2f2', '#e6ff00'].includes(c)) && log.every(inside);
  }],
  ['intro: the 8 stars form an arc inside the blue stripe', () => {
    const log = frame('intro', .5), Y = log.find(e => e.c === '#ffd23a' && e.w >= 60), B = log.find(e => e.c === '#1b4fa0' && e.y === Y.y + Y.h);
    const st = log.filter(e => e.c === '#f2f2f2' && e.y >= B.y && e.y + e.h <= B.y + B.h), xs = [...new Set(st.map(e => e.x + e.w / 2 | 0))];
    const groups = []; for (const e of st.slice().sort((a, b) => a.x - b.x)) { const g = groups.find(q => Math.abs(q.x - e.x) <= 2); if (g) g.ys.push(e.y); else groups.push({ x: e.x, ys: [e.y] }); }
    const top = groups.map(g => Math.min(...g.ys)), mid = (top[3] + top[4]) / 2, ends = (top[0] + top[7]) / 2;
    return xs.length >= 8 && groups.length === 8 && mid < ends;
  }],
  ['intro starts the match by itself after about 2.5 s', () => {
    toIntro(3); ticks(Math.round(2.3 * 60)); const still = G.getMode() === 'intro';
    ticks(Math.round(.4 * 60)); const r = G.getRun();
    return still && G.getMode() === 'play' && r && r.m.ri === 3 && r.day === 1 && r.score === 0;
  }],
  ['START or button 1 skip the intro after 0.3 s, not before', () => {
    toIntro(); press('START1'); const early = G.getMode() === 'intro'; ticks(20); press('START1'); const a = G.getMode() === 'play';
    toIntro(); ticks(20); press('P1_1'); return early && a && G.getMode() === 'play';
  }],
  ['arriving at la chamita\'s place goes to the next night without the intro', () => {
    release(); G.setX(fake([])); G.setMode('play'); const r = G.newRun(1, 1, 500); r.arrived = r.t = 1; r.t = 5; G.setRun(r);
    let seen = false; for (let i = 0; i < 30 && G.getRun() === r; i++) { G.tick(G.STEP); seen = seen || G.getMode() === 'intro'; }
    const n = G.getRun(); return !seen && G.getMode() === 'play' && n !== r && n.day === 2 && n.score === 500;
  }],
  ['rendering the intro never throws', () => { try { for (const t of [0, .3, 1, 2.4]) frame('intro', t); return true; } catch (e) { return false; } }],
  ['controls are 3 short key + action pairs, all drawn at scale 2 so they read well', () => {
    paintTitle(ON); const c = G.TXT.filter(q => ['WASD', 'MOVERSE', 'J', 'CABALLITO', 'K', 'CORNETA'].includes(q[0]));
    return c.length === 6 && c.every(q => q[1] === 2);
  }],
  ['the rays use only bright shades of the title-band yellow #e6ff00: no olive, no orange, no pink', () => {
    const log = paintTitle(ON), area = log.filter(e => e.k === 'r' && e.y > 40 && e.y < PROMPT[0] && /^rgb\(/.test(e.c) && !full(e));
    const rays = area.filter(e => isBurst(e.c)), c = rays.map(e => rgbOf(e.c));
    const lime = c.some(v => v.every((x, k) => Math.abs(x - [230, 255, 0][k]) <= 8)), light = c.some(v => v[2] >= 80), val = c.map(v => hsv(v)[2]);
    return rays.length > 300 && rays.length === area.length && lime && light && Math.min(...val) >= .85 && !log.some(e => e.y > 40 && e.y < PROMPT[0] && ['#ff3d8b', '#ffd23a', '#ff7a1a'].includes(e.c));
  }],
  ['the ray gradient rotates over time on the same ray geometry', () => {
    const a = paintTitle(1).filter(e => isBurst(e.c) && e.y < PROMPT[0]), b = paintTitle(2).filter(e => isBurst(e.c) && e.y < PROMPT[0]);
    const same = a.length > 300 && a.length === b.length && a.every((e, i) => e.x === b[i].x && e.y === b[i].y && e.w === b[i].w);
    return same && a.filter((e, i) => e.c !== b[i].c).length > a.length / 4;
  }],
  ['the rider select screen uses the same blue gradient background', () => {
    const log = frame('select', 0), rows = log.filter(e => e.k === 'r' && full(e) && e.h === 1 && rgbOf(e.c)).sort((a, b) => a.y - b.y);
    const same = (a, b) => a.every((v, k) => Math.abs(v - b[k]) <= 1);
    return rows.length >= 200 && rows[0].y === 0 && same(rgbOf(rows[0].c), [0, 6, 40]) && same(rgbOf(rows[rows.length - 1].c), [1, 20, 105]) && !log.some(e => ['#140c22', '#211833'].includes(e.c));
  }],
  ['the title background has night stars: many small dots spread over the sky, in a few brightnesses', () => {
    const st = stars(paintTitle(ON)), cols = new Set(st.map(e => e.c));
    const q = [st.some(e => e.x < 160 && e.y < 120), st.some(e => e.x >= 160 && e.y < 120), st.some(e => e.x < 160 && e.y >= 120), st.some(e => e.x >= 160 && e.y >= 120)];
    return st.length >= 50 && cols.size === 3 && q.every(Boolean) && st.every(inside);
  }],
  ['the stars stay in place (same positions every frame)', () => {
    const k = log => stars(log).map(key).join('|'), a = k(paintTitle(ON));
    return a.length > 0 && [.9, 7.3, 21.7].every(t => k(paintTitle(t)) === a);
  }],
  ['the rider select screen shows the same stars', () => {
    const t = stars(paintTitle(ON)).map(key).join('|'), sel = stars(frame('select', 0)).map(key).join('|');
    return t.length > 0 && sel === t;
  }],
];
let fail = 0;
for (let [name, fn] of cases) { let ok; try { ok = fn(); } catch (e) { ok = false; name += '  [' + e.message + ']'; } if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name); }
console.log(`\n${cases.length - fail}/${cases.length} passed`); process.exit(fail ? 1 : 0);
