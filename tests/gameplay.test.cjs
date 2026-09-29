// Behavioral tests for gameplay rules in game.js: the cop (el paco), squeezing through a jam, pickups.
const fs = require('fs');
let src = fs.readFileSync(require('path').join(__dirname, '..', 'game.js'), 'utf8');
src = src.slice(0, src.indexOf('new Phaser.Game('));
/* Record every txt() call so the story tests can read what a screen writes. */
src = 'const TXT = [];\n' + src.replace("function txt(s, x, y, col, sc = 1, al = 'l', sh = '#000') {", "function txt(s, x, y, col, sc = 1, al = 'l', sh = '#000') { TXT.push([String(s), sc, x, y]);");
global.window = { addEventListener() {} };
global.document = { createElement: () => ({ getContext: () => ({ set fillStyle(v) {}, fillRect() {} }) }) };
const G = new Function(src + '\nreturn { newRun, simStep, drawRun, GY, STEP, vehSpr, held, pressed, tw, W, MX, FONT, setAC: a => { AC = a; }, setX: c => { X = c; }, tick, render, getMode: () => MODE, setMode: md => { MODE = md; MT = 0; }, TXT, H, TRIP, drawOver, setMT: t => { MT = t; }, setRun: r => { RUN = r; }, setSel: i => { SEL = i; }, get CHAMA() { return CHAMA; }, TRAMOS, ENDS, crash, spawnCola, occ };')();

function release() { for (const k in G.held) G.held[k] = false; for (const k in G.pressed) G.pressed[k] = false; }
function scene(pos, v = 0) {
  release();
  const S = G.newRun(0, 1, 0);
  S.cd = 0; S.spawnT = 1e9; S.haz = []; S.pick = []; S.riv = []; S.vnd = []; S.cop = null; S.veh = [];
  for (const k in S.nx) S.nx[k] = 1e9;
  const m = S.m; m.x = 1000; m.v = v; m.tpos = pos; m.y = G.GY[pos];
  return S;
}
function addVeh(S, kind, lane, x) {
  const sp = G.vehSpr(kind, '#fff');
  const v = { kind, img: sp.img, L: sp.L, gb: sp.gb, lane, gy: G.GY[lane * 2], x, v: 0, base: 0,
    wide: kind === 'bus' || kind === 'gandola' || kind === 'grua', bubble: null, bubbleT: 0 };
  S.veh.push(v); return v;
}
/* A stopped jam like spawnCola: cars 6 px apart covering the player's x. */
function jam(S, lane) { for (let x = S.m.x - 5 - 42 * 5; x < S.m.x + 220; x += 42) addVeh(S, 'car', lane, x); }
function step(S, n = 1, keep) { for (let i = 0; i < n; i++) { if (keep) keep(S); G.simStep(S, G.STEP); for (const k in G.pressed) G.pressed[k] = false; } }
function press(S, code, brake) {
  G.held[code] = true; G.pressed[code] = true; if (brake) G.held.P1_L = true;
  step(S); G.held[code] = false;
}
const hasFloat = (S, s) => S.floats.some(f => f.s === s);

/* ---------- pickups ---------- */
function grab(kind) { const S = scene(2, 50); S.pick = [{ kind, pos: 2, x: S.m.x }]; step(S); return S; }
/* Fake Web Audio: records every oscillator (frequency, type, start/stop, gain envelope). */
function listen(fn) {
  const osc = [], P = () => ({ value: 0, pts: [], setValueAtTime(v, t) { this.pts.push([v, t]); }, linearRampToValueAtTime(v, t) { this.pts.push([v, t]); }, exponentialRampToValueAtTime(v, t) { this.pts.push([v, t]); } });
  G.setAC({ currentTime: 0, sampleRate: 8000, state: 'running', destination: {},
    createOscillator() { const o = { type: 'sine', frequency: P(), connect(g) { o.g = g; }, start(t) { o.t0 = t; }, stop(t) { o.t1 = t; } }; osc.push(o); return o; },
    createGain() { return { gain: P(), connect() {} }; },
    createBuffer: (c, n) => ({ getChannelData: () => new Float32Array(n) }), createBufferSource: () => ({ connect() {}, start() {} }) });
  try { fn(); } finally { G.setAC(null); }
  return osc.map(o => ({ f: o.frequency.value || (o.frequency.pts[0] || [0])[0], type: o.type, t0: o.t0, t1: o.t1, peak: Math.max(o.g.gain.value, ...o.g.gain.pts.map(q => q[0])) }));
}
const near = (os, f, test) => os.some(o => Math.abs(o.f - f) < 1 && test(o));
/* Fake canvas: returns every fillRect as "x,y,w,h,color". */
function paint(S) {
  const rects = []; let fs = '';
  G.setX({ set fillStyle(v) { fs = v; }, get fillStyle() { return fs; }, set globalAlpha(v) {}, fillRect(x, y, w, h) { rects.push([x, y, w, h, fs].join()); }, drawImage() {}, save() {}, restore() {}, translate() {}, rotate() {} });
  G.drawRun(S, false); return rects;
}
function extraRects(S) {
  const b = S.bless; S.bless = 0; const base = paint(S); S.bless = b; const withB = paint(S), left = new Map();
  for (const r of base) left.set(r, (left.get(r) || 0) + 1);
  return withB.filter(r => { const n = left.get(r) || 0; if (n) { left.set(r, n - 1); return false; } return true; }).map(r => r.split(',').slice(0, 4).map(Number));
}
const ANIS = 'ANIS CARTUJO PARA GENTE DE LUJOO!!';
/* A fresh run with a cola spawned just ahead; kind true = the choque variant, false = the vendors cola. */
function colaOf(kind) {
  for (let i = 0; i < 80; i++) { const S = scene(2, 50); S.cam = S.m.x - G.MX; G.spawnCola(S); if (!!S.cola.ch === kind) return S; }
  throw new Error('no cola of kind ' + kind);
}
const laneFree = (S, l) => !S.veh.some(v => G.occ(v).includes(l * 2) && v.x < S.cola.x1 + 60 && v.x + v.L > S.cola.x0 - 5);
/* Positions the wreck closes: its lanes and the canals (or hombrillo) next to them. */
const closed = S => { const b = new Set(); for (const l of [0, 1, 2]) if (!laneFree(S, l)) for (const p of [l * 2 - 1, l * 2, l * 2 + 1]) if (p >= 0 && p <= 5) b.add(p); return b; };
function rideAt(S, p, x, v, n) { const m = S.m; m.x = x; m.v = v; m.tpos = p; m.y = G.GY[p]; S.cam = m.x - G.MX; step(S, n, () => { G.held.P1_R = true; }); release(); return m; }

/* ---------- el paco (the cop) ---------- */
function copGiveUpTime() {
  const S = scene(2, 112); S.siren = 1; step(S); const c = S.cop; if (!c) return -1;
  for (let i = 0; i < 60 * 20 && !c.lost; i++) step(S, 1, s => { if (s.cop) s.cop.x = s.m.x - 300; });
  return c.lost ? c.t : 99;
}
function copScene(copPos, playerPos, catchT) {
  const S = scene(playerPos, 0); S.siren = 1; step(S); const c = S.cop;
  c.tpos = copPos; c.y = G.GY[copPos]; c.x = S.m.x - 20; c.v = 0; c.t = 1; c.catchT = catchT;
  return { S, c };
}

/* ---------- night story helpers ---------- */
const rgbOf = c => { const m = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(String(c).replace(/\s/g, '')); if (m) return m.slice(1).map(Number); let h = /^#([0-9a-f]{3})$/i.exec(c); if (h) c = '#' + [...h[1]].map(d => d + d).join(''); h = /^#([0-9a-f]{6})$/i.exec(c); return h ? [0, 2, 4].map(k => parseInt(h[1].substr(k, 2), 16)) : null; };
/* Fake canvas that records drawImage calls with their destination box. */
function fakeImg(log) { let fs = ''; return { set fillStyle(v) { fs = v; }, get fillStyle() { return fs; }, set globalAlpha(v) {}, fillRect(x, y, w, h) { log.push({ k: 'r', x, y, w, h, c: fs }); }, drawImage(img, x, y, w, h) { log.push({ k: 'i', img, x, y, w: w == null ? img.width : w, h: h == null ? img.height : h }); }, save() {}, restore() {}, translate() {}, rotate() {}, setTransform() {} }; }
/* paint() rows as [x, y, w, h, colour] (the colour may be rgb(a,b,c)). */
const rec = S => paint(S).map(q => { const a = q.split(','); return [...a.slice(0, 4), a.slice(4).join(',')]; });
function draws(S) { const log = []; G.setX(fakeImg(log)); G.drawRun(S); return log.filter(e => e.k === 'i'); }
/* Ride into the last sign (la chamita's place) at speed v and return the run just after arriving. */
function arrive(v = 120) { const S = scene(2, v); S.time = 30; S.m.x = S.signs[5].x - 3; for (let i = 0; i < 20 && !S.arrived; i++) step(S); return S; }

const cases = [
  ['paco spawns with +21 over the player speed', () => { const S = scene(2, 112); S.siren = 1; step(S); return !!S.cop && Math.abs(S.cop.v - (S.m.v + 21)) < 1e-6; }],
  ['paco far chase target is player speed +21', () => {
    const S = scene(2, 112); S.siren = 1; step(S); const c = S.cop; c.x = S.m.x - 120; c.v = S.m.v;
    step(S, 30); return c.x < S.m.x - 40 && Math.abs(c.v - (S.m.v + 21)) < .5;
  }],
  ['paco gives up at 9 s, not before 8.9 s', () => { const t = copGiveUpTime(); return t > 8.9 && t < 9.05; }],
  ['paco gives up with EL PACO SE CANSO', () => { const S = scene(2, 112); S.siren = 1; step(S); const c = S.cop; c.t = 8.995; step(S); return c.lost && hasFloat(S, 'EL PACO SE CANSO'); }],
  ['the chase starts with an EL PACO! banner', () => { const S = scene(2, 112); S.siren = 1; step(S); return !!S.cop && S.banners.some(b => b.s === 'EL PACO!'); }],
  ['getting caught reads TE AGARRO EL PACO', () => G.ENDS.preso[0] === 'PRESO!' && G.ENDS.preso[1] === 'TE AGARRO EL PACO'],
  ['no FISCAL is left on screen text in game.js', () => !/FISCAL/i.test(fs.readFileSync(require('path').join(__dirname, '..', 'game.js'), 'utf8'))],
  ['catch progress resets when a vehicle blocks the paco lane step', () => {
    const { S, c } = copScene(2, 4, 1); addVeh(S, 'bus', 2, S.m.x - 80); step(S); return c.catchT === 0;
  }],
  ['catch progress only decays when the lane step is free', () => {
    const { S, c } = copScene(2, 4, 1); step(S); return c.catchT > .9 && c.catchT < 1 && c.tpos === 3;
  }],
  /* ---------- escaping el paco by skill ---------- */
  ['paco top speed is capped, even when you ride on turbo', () => {
    const S = scene(2, 190); S.m.turbo = 4; S.m.drunkT = 99; S.siren = 1; let top = 0;
    step(S, 180, s => { G.held.P1_R = true; s.m.drunkT = 99; if (s.cop) top = Math.max(top, s.cop.v); });
    return !!S.cop && top > 100 && top <= 135;
  }],
  ['accelerating in a wheelie pulls away from a paco right behind', () => {
    const S = scene(2, 112); S.siren = 1; step(S); const c = S.cop; c.x = S.m.x - 32; c.tpos = 2; c.y = G.GY[2]; c.v = S.m.v; c.t = 1;
    step(S, 90, () => { G.held.P1_R = true; G.held.P1_1 = true; }); const g1 = S.m.x - c.x;
    step(S, 60, () => { G.held.P1_R = true; G.held.P1_1 = true; }); const g2 = S.m.x - c.x; release();
    return !S.m.crashed && g1 > 32 && g2 > g1 + 25;
  }],
  ['zigzagging every 0.5 s for 6 s with the paco close never gets you caught, and he falls back', () => {
    const S = scene(2, 112); S.siren = 1; step(S); const c = S.cop; c.x = S.m.x - 25; c.tpos = 2; c.y = G.GY[2]; c.v = S.m.v; c.t = 1;
    for (let i = 0; i < 12 && !S.m.crashed; i++) { press(S, i % 2 ? 'P1_U' : 'P1_D'); step(S, 29); }
    return !S.m.crashed && !c.lost && S.m.x - c.x > 25; // he fell back
  }],
  ['your lane change resets his catch progress', () => {
    const { S, c } = copScene(2, 2, 1); S.m.v = 100; c.v = 100; press(S, 'P1_D'); return c.catchT < .05;
  }],
  ['his lane change to follow you costs him speed', () => {
    const { S, c } = copScene(2, 3, 0); S.m.v = 100; c.v = 100; step(S); return c.tpos === 3 && c.v < 90;
  }],
  ['riding straight in his lane without doing anything gets you caught', () => {
    const S = scene(2, 112); S.siren = 1; step(S); const c = S.cop;
    for (let i = 0; i < 60 * 10 && !S.m.crashed && !c.lost; i++) step(S);
    return S.m.crashed && S.m.why === 'preso';
  }],
  ['flying off a grua still loses the paco', () => {
    const S = scene(2, 112); S.siren = 1; step(S); const c = S.cop; addVeh(S, 'grua', 1, S.m.x + 5); step(S); return S.m.air && c.lost;
  }],
  /* ---------- colarse ---------- */
  ['slow in canal 3, lane jammed, press up -> squeezes to canal 1', () => {
    const S = scene(3, 30); jam(S, 1); press(S, 'P1_U', true);
    const went = S.m.tpos === 1 && hasFloat(S, 'TE COLASTE!');
    step(S, 60, () => { G.held.P1_L = true; });
    return went && !S.m.crashed && S.m.tpos === 1 && Math.abs(S.m.y - G.GY[1]) < 1 && S.m.sq == null;
  }],
  ['squeezing does not score rasante on the crossed lane', () => {
    const S = scene(3, 30); const v = addVeh(S, 'car', 1, S.m.x - 5); jam(S, 1); press(S, 'P1_U', true);
    step(S, 12, () => { G.held.P1_L = true; }); return !v.adj;
  }],
  ['slow on hombrillo, lane jammed, press up -> squeezes to canal 3', () => {
    const S = scene(5, 30); jam(S, 2); press(S, 'P1_U', true);
    step(S, 60, () => { G.held.P1_L = true; });
    return !S.m.crashed && S.m.tpos === 3 && Math.abs(S.m.y - G.GY[3]) < 1;
  }],
  ['fast in canal 3, lane jammed, press up -> steps in and crashes', () => {
    const S = scene(3, 100); jam(S, 1); press(S, 'P1_U');
    const into = S.m.tpos === 2; step(S, 60); return into && S.m.crashed && S.m.why === 'choque';
  }],
  ['destination canal blocked -> no squeeze', () => {
    const S = scene(3, 30); jam(S, 1); addVeh(S, 'bus', 0, S.m.x - 30); press(S, 'P1_U', true);
    return S.m.tpos === 2 && S.m.sq == null;
  }],
  ['canal 1 pressing up with lane 0 jammed -> no squeeze', () => {
    const S = scene(1, 30); jam(S, 0); press(S, 'P1_U', true); return S.m.tpos === 0 && S.m.sq == null;
  }],
  ['COLA banner also tells how to squeeze', () => {
    const S = scene(2, 50); S.cola = { x0: S.m.x + 40, x1: S.m.x + 400 }; S.colaDone = false; S.colaB = false;
    step(S); return S.banners.some(b => b.s === 'COLA!') && hasFloat(S, 'FRENA PARA COLARTE');
  }],
  /* ---------- estampita ---------- */
  ['estampita: invincibility, banner and the blessing timer', () => { const S = grab('estampita'); return S.m.inv > 5 && S.bless > 2.5 && S.banners.some(b => b.s === 'ESTAMPITA!'); }],
  ['estampita: the old JOSE GREGORIO TE CUIDA float is gone', () => !hasFloat(grab('estampita'), 'JOSE GREGORIO TE CUIDA')],
  ['estampita: blessing lasts about 3 s and decays to 0', () => { const S = grab('estampita'); step(S, 150); const mid = S.bless > 0; step(S, 60); return mid && S.bless === 0; }],
  ['estampita: ghost and DIOS TE BENDIGA are drawn below the HUD, inside the screen', () => {
    const S = grab('estampita'); let ex = [], ok = true;
    for (let k = 0; k < 12; k++) { step(S, 13); const e = extraRects(S); ok = ok && e.length > 40; ex = ex.concat(e); }
    return ok && ex.every(([x, y, w, h]) => y >= 12 && x >= 0 && x + w <= G.W && y + h <= 100);
  }],
  ['estampita: plays a soft F -> C major amen instead of the pick jingle', () => {
    const os = listen(() => grab('estampita'));
    const F = [174.6, 220, 261.6, 349.2].every(f => near(os, f, o => o.t0 < .1)), C = [130.8, 164.8, 196, 261.6].every(f => near(os, f, o => o.t0 > .5));
    const end = Math.max(...os.map(o => o.t1));
    return F && C && os.every(o => o.type !== 'square' && o.peak <= .03) && end > 1.5 && end < 2.6;
  }],
  ['other pickups still play the pick jingle', () => near(listen(() => grab('empanada')), 523, o => o.type === 'square')],
  /* ---------- anis ---------- */
  ['anis: turbo, banner and the exact CARTUJO text', () => { const S = grab('anis'); return S.m.turbo > 3.9 && S.banners.some(b => b.s === 'ANIS!') && hasFloat(S, ANIS); }],
  ['anis: CARTUJO text uses only font glyphs and fits in 0..320', () => {
    const S = grab('anis'), f = S.floats.find(q => q.s === ANIS); if (!f) return false;
    const w = G.tw(ANIS), x0 = Math.round(f.x - w / 2);
    return [...ANIS].every(c => c === ' ' || G.FONT[c]) && x0 - 2 >= 0 && x0 + w + 2 <= G.W;
  }],
  ['leaving the ranking screen does not crash the next render (real browser froze here)', () => {
    const any = new Proxy(function () {}, { get: () => any, set: () => true, apply: () => any });
    G.setX(any); release(); G.setMode('rank');
    for (let i = 0; i < 8 * 60 && G.getMode() === 'rank'; i++) G.tick(G.STEP); // stop on the transition tick, like update() does before render()
    if (G.getMode() !== 'title') return false;
    try { G.render(); return true; } catch (e) { return false; }
  }],
  /* ---------- night story: pick up la chamita before Wilkerson does ---------- */
  ['match sky is night: none of the old day sky colours, a dark blue band with stars', () => {
    const r = rec(scene(2)), cols = r.map(q => q[4]);
    const sky = r.filter(q => +q[0] <= 0 && +q[2] >= G.W && +q[1] >= 12 && +q[1] < 60 && +q[3] <= 2).map(q => rgbOf(q[4])).filter(Boolean);
    const stars = r.filter(q => +q[1] >= 12 && +q[1] < 60 && +q[2] <= 3 && +q[3] <= 3 && ['#ffffff', '#aab8ee', '#5a6aa8'].includes(q[4]));
    return !['#8fcaff', '#b4dcff', '#d2ecff', '#f4f9ff'].some(c => cols.includes(c)) && sky.length >= 30 && sky.every(([R, Gc, B]) => B > R + 30 && B > Gc + 30 && B <= 120) && stars.length >= 5;
  }],
  ['night city: buildings show warm lit windows and some dark ones, the same every frame', () => {
    const S = scene(2), a = paint(S), win = rec(S).filter(q => q[2] === '2' && q[3] === '2' && +q[1] >= 40 && +q[1] < 92);
    const lit = win.filter(q => ['#ffd23a', '#f2c56b', '#ff9a2a'].includes(q[4])), off = win.filter(q => !['#ffd23a', '#f2c56b', '#ff9a2a'].includes(q[4]));
    return lit.length >= 20 && off.length >= 10 && paint(S).join('|') === a.join('|');
  }],
  ['the road is darker than by day but lanes, edges and potholes stay readable', () => {
    const S = scene(2); S.cam = S.m.x - G.MX; S.haz = [{ kind: 'hueco', pos: 2, x: S.m.x + 60 }]; const r = rec(S);
    const road = r.find(q => +q[0] === 0 && +q[1] === 100 && +q[2] >= G.W && +q[3] >= 80), lane = r.find(q => +q[1] === 130 && +q[2] === 12), hole = r.find(q => +q[2] === 10 && +q[3] === 4);
    const L = c => { const v = rgbOf(c); return .3 * v[0] + .59 * v[1] + .11 * v[2]; };
    return road && lane && hole && L(road[4]) < L('#3b3f46') && L(lane[4]) - L(road[4]) > 120 && L(road[4]) - L(hole[4]) > 25;
  }],
  ['the last TRAMO is la chamita\'s place and fits on its sign', () => /CHAMITA/.test(G.TRAMOS[5]) && G.tw(G.TRAMOS[5]) <= 84],
  ['running out of time: WILKERSON SE LA LLEVO, and both lines fit', () => {
    const S = scene(2, 50); S.time = .01; step(S, 2);
    return S.m.why === 'tarde' && S.end[0] === 'WILKERSON SE LA LLEVO' && /CHAMITA/.test(S.end[1]) && G.tw(S.end[0], 2) <= 316 && G.tw(S.end[1]) <= 316;
  }],
  ['arriving: LA RECOGISTE! A RUMBEAR! banner that fits the screen', () => {
    const S = arrive(); const b = S.banners[0];
    return S.arrived > 0 && b && b.s === 'LA RECOGISTE! A RUMBEAR!' && G.tw(b.s, 2) + 16 <= G.W;
  }],
  ['levels are NOCHE N: start banner, HUD and game-over row, never DIA', () => {
    const S = G.newRun(0, 2, 0), start = S.banners[0] && S.banners[0].s;
    G.TXT.length = 0; paint(S); const hud = G.TXT.map(q => q[0]);
    S.end = G.ENDS.tarde; G.TXT.length = 0; G.setMT(1); G.drawOver(S); const over = G.TXT.map(q => q[0]);
    return start === 'NOCHE 2' && hud.includes('NOCHE 2') && over.includes('NOCHE') && ![...hud, ...over].some(t => /^DIA\b/.test(t));
  }],
  ['rider select asks to pick up la chamita before time runs out, inside the screen', () => {
    release(); G.setX(fakeImg([])); G.setMode('select'); G.TXT.length = 0; G.render();
    const t = G.TXT.find(q => /CHAMITA/.test(q[0])); return !!t && G.tw(t[0], t[1]) <= G.W - 4 && !G.TXT.some(q => /OFICINA/.test(q[0]));
  }],
  ['la chamita is not drawn before arriving, nor after a crash or a time-out', () => {
    const cham = S => draws(S).filter(e => e.img === G.CHAMA).length;
    const a = scene(2, 50), b = scene(2, 50), c = scene(2, 50); G.crash(b, 'choque'); c.time = .01; step(c, 2); step(b, 30); step(c, 30);
    const near = scene(2, 120); near.m.x = near.signs[5].x - 40; step(near, 5);
    return cham(a) === 0 && cham(b) === 0 && cham(c) === 0 && !near.arrived && cham(near) === 0;
  }],
  ['after arriving la chamita celebrates: drawn, jumping over time, saying VAMOS A RUMBEAR!', () => {
    const S = arrive(), ys = new Set(); let said = false;
    for (let i = 0; i < 40; i++) { step(S, 2); G.TXT.length = 0; const d = draws(S).filter(e => e.img === G.CHAMA); if (d.length !== 1) return false; ys.add(d[0].y); said = said || G.TXT.some(q => q[0] === 'VAMOS A RUMBEAR!'); }
    return ys.size >= 3 && said;
  }],
  ['la chamita and her hearts stay inside the screen for the whole arrival, even arriving on turbo', () => [120, 210].every(v => {
    const S = arrive(v); let ok = true, n = 0;
    for (let i = 0; i < 3.1 * 60 && ok; i++) { step(S); const d = draws(S); const ch = d.filter(e => e.img === G.CHAMA); n += ch.length; ok = ch.every(e => e.x >= 0 && e.x + e.w <= G.W && e.y >= 12 && e.y + e.h <= G.H); }
    return ok && n > 150;
  })],
  ['no office / work wording is left in game.js', () => !/OFICINA|TRABAJO|TE BOTARON|JEFE|'DIA /i.test(fs.readFileSync(require('path').join(__dirname, '..', 'game.js'), 'utf8'))],
  /* ---------- cola spawn keeps what is on screen ---------- */
  ['a car visible at the right edge survives a cola spawn and no cola car overlaps it', () => {
    const S = scene(2, 50); S.cam = S.m.x - G.MX; const k = addVeh(S, 'car', 1, S.cam + 300), far = addVeh(S, 'car', 0, S.cam + 330);
    G.spawnCola(S); const cola = S.veh.filter(v => v.cola);
    return S.veh.includes(k) && !S.veh.includes(far) && cola.length >= 4 && cola.every(v => v.x >= k.x + k.L);
  }],
  ['hazards and pickups on screen survive a cola spawn', () => {
    const S = scene(2, 50); S.cam = S.m.x - G.MX; S.haz = [{ kind: 'bache', pos: 1, x: S.cam + 310, w: 10 }]; S.pick = [{ kind: 'empanada', pos: 3, x: S.cam + 312 }];
    G.spawnCola(S); return S.haz.length === 1 && S.pick.length === 1;
  }],
  /* ---------- cola de choque ---------- */
  ['about 40% of colas are choque colas (no vendors), the rest keep the vendors', () => {
    let ch = 0, ok = true; const N = 300, R = Math.random; let q = 7;
    /* newRun reseeds from Math.random, so pin it: the same 300 colas every run (no flaky statistics) */
    Math.random = () => (q = q * 16807 % 2147483647) / 2147483647;
    try { for (let i = 0; i < N; i++) { const S = scene(2, 50); S.cam = S.m.x - G.MX; G.spawnCola(S); if (S.cola.ch) { ch++; ok = ok && S.vnd.length === 0; } else ok = ok && S.vnd.length > 0; } } finally { Math.random = R; }
    return ok && ch / N > .3 && ch / N < .5;
  }],
  ['choque cola: exactly one lane is free across the whole cola, with stopped cars and a wreck in the others', () => [0, 1, 2, 3, 4, 5].every(() => {
    const S = colaOf(true), free = [0, 1, 2].filter(l => laneFree(S, l)), wr = S.veh.filter(v => v.wr);
    return free.length === 1 && wr.length === 2 && wr.every(v => v.lane !== free[0]) && S.veh.filter(v => v.cola).length >= 4;
  })],
  ['choque cola: the free lane stays clear while you ride it to the end', () => [0, 1, 2, 3].every(() => {
    const S = colaOf(true), F = [0, 1, 2].find(l => laneFree(S, l)), m = rideAt(S, F * 2, S.cola.x0 - 80, 100, 1);
    let clear = true; for (let i = 0; i < 60 * 8 && m.x < S.cola.x1 + 30 && !m.crashed; i++) { step(S, 1, () => { G.held.P1_R = true; }); clear = clear && laneFree(S, F); }
    release(); return clear && !m.crashed && m.x >= S.cola.x1 + 30;
  })],
  ['choque cola: riding into a closed lane or canal at the wreck crashes', () => [0, 1, 2].every(() => {
    const S0 = colaOf(true), shut = [...closed(S0)];
    return shut.length >= 4 && shut.every(p => {
      const S = colaOf(true); S.veh = S0.veh.filter(v => v.wr).map(v => Object.assign({}, v)); S.cola = Object.assign({}, S0.cola); S.colaB = true;
      const w = Math.min(...S.veh.map(v => v.x)), m = rideAt(S, p, w - 25, 100, 50); return m.crashed && m.why === 'choque';
    });
  })],
  ['choque cola: the free lane and its open side pass the wreck', () => [0, 1, 2].every(() => {
    const S0 = colaOf(true), shut = closed(S0), open = [0, 1, 2, 3, 4, 5].filter(p => !shut.has(p));
    return open.length >= 1 && open.some(p => p % 2 === 0) && open.every(p => {
      const S = colaOf(true); S.veh = S0.veh.filter(v => v.wr).map(v => Object.assign({}, v)); S.cola = Object.assign({}, S0.cola); S.colaB = true;
      const w = Math.min(...S.veh.map(v => v.x)), m = rideAt(S, p, w - 25, 100, 55); return !m.crashed && m.x > w + 50;
    });
  })],
  ['choque cola: CHOQUE! banner and BUSCA EL CARRIL LIBRE hint', () => {
    const S = colaOf(true); rideAt(S, 2, S.cola.x0 - 75, 50, 30);
    return S.banners.some(b => b.s === 'CHOQUE!') && hasFloat(S, 'BUSCA EL CARRIL LIBRE') && !hasFloat(S, 'FRENA PARA COLARTE');
  }],
  ['vendors cola still says COLA! and FRENA PARA COLARTE', () => {
    const S = colaOf(false); rideAt(S, 2, S.cola.x0 - 75, 50, 30); return S.banners.some(b => b.s === 'COLA!') && hasFloat(S, 'FRENA PARA COLARTE');
  }],
  /* ---------- no autopilot ---------- */
  ['no autopilot is left in game.js (no aiCtl, no S.ai branches)', () => !/aiCtl|\.ai\b|\bai\b/.test(fs.readFileSync(require('path').join(__dirname, '..', 'game.js'), 'utf8'))],
  ['newRun takes (rider, night, score) and always starts with the countdown', () => { const S = G.newRun(1, 2, 500); return S.m.ri === 1 && S.day === 2 && S.score === 500 && S.cd > 2; }],
  /* ---------- no pickups in the air ---------- */
  ['flying over a pickup does not collect it', () => {
    const S = scene(2, 50); S.m.air = true; S.m.h = 30; S.m.vh = 60; S.pick = [{ kind: 'empanada', pos: 2, x: S.m.x }]; const sc = S.score;
    step(S, 3); return !S.pick[0].got && S.score - sc < 300;
  }],
  ['the same pickup is collected on the ground', () => { const S = scene(2, 50); S.pick = [{ kind: 'empanada', pos: 2, x: S.m.x }]; step(S); return S.pick[0].got === true; }],
];
let fail = 0;
for (let [name, fn] of cases) { let ok; try { ok = fn(); } catch (e) { ok = false; name += '  [' + e.message + ']'; } if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name); }
console.log(`\n${cases.length - fail}/${cases.length} passed`); process.exit(fail ? 1 : 0);
