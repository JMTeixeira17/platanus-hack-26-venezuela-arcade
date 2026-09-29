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

const cases = [
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
