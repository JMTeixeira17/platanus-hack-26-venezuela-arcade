// Behavioral tests for gameplay rules in game.js: cop (fiscal), squeezing through a jam, pickups.
const fs = require('fs');
let src = fs.readFileSync(require('path').join(__dirname, '..', 'game.js'), 'utf8');
src = src.slice(0, src.indexOf('new Phaser.Game('));
global.window = { addEventListener() {} };
global.document = { createElement: () => ({ getContext: () => ({ set fillStyle(v) {}, fillRect() {} }) }) };
const G = new Function(src + '\nreturn { newRun, simStep, drawRun, GY, STEP, vehSpr, held, pressed, tw, W, MX, FONT, setAC: a => { AC = a; }, setX: c => { X = c; }, tick, render, getMode: () => MODE, setMode: md => { MODE = md; MT = 0; } };')();

function release() { for (const k in G.held) G.held[k] = false; for (const k in G.pressed) G.pressed[k] = false; }
function scene(pos, v = 0, ai = false) {
  release();
  const S = G.newRun(0, ai, 1, 0);
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
function grab(kind, ai) { const S = scene(2, 50, ai); S.pick = [{ kind, pos: 2, x: S.m.x }]; step(S); return S; }
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

/* ---------- fiscal ---------- */
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

const cases = [
  ['fiscal spawns with +21 over the player speed', () => { const S = scene(2, 112); S.siren = 1; step(S); return !!S.cop && Math.abs(S.cop.v - (S.m.v + 21)) < 1e-6; }],
  ['fiscal far chase target is player speed +21', () => {
    const S = scene(2, 112); S.siren = 1; step(S); const c = S.cop; c.x = S.m.x - 120; c.v = S.m.v;
    step(S, 30); return c.x < S.m.x - 40 && Math.abs(c.v - (S.m.v + 21)) < .5;
  }],
  ['fiscal gives up at 9 s, not before 8.9 s', () => { const t = copGiveUpTime(); return t > 8.9 && t < 9.05; }],
  ['fiscal gives up with EL FISCAL SE CANSO', () => { const S = scene(2, 112); S.siren = 1; step(S); const c = S.cop; c.t = 8.995; step(S); return c.lost && hasFloat(S, 'EL FISCAL SE CANSO'); }],
  ['catch progress resets when a vehicle blocks the fiscal lane step', () => {
    const { S, c } = copScene(2, 4, 1); addVeh(S, 'bus', 2, S.m.x - 80); step(S); return c.catchT === 0;
  }],
  ['catch progress only decays when the lane step is free', () => {
    const { S, c } = copScene(2, 4, 1); step(S); return c.catchT > .9 && c.catchT < 1 && c.tpos === 3;
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
  ['estampita: the amen stays silent in the AI demo', () => listen(() => grab('estampita', true)).length === 0],
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
];
let fail = 0;
for (let [name, fn] of cases) { let ok; try { ok = fn(); } catch (e) { ok = false; name += '  [' + e.message + ']'; } if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name); }
console.log(`\n${cases.length - fail}/${cases.length} passed`); process.exit(fail ? 1 : 0);
