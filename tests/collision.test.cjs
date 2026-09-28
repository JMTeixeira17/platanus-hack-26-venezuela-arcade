// Behavioral tests for player-vehicle collision in game.js (runs the real simStep).
const fs = require('fs');
let src = fs.readFileSync(require('path').join(__dirname, '..', 'game.js'), 'utf8');
src = src.slice(0, src.indexOf('new Phaser.Game('));
global.window = { addEventListener() {} };
global.document = { createElement: () => ({ getContext: () => ({ set fillStyle(v) {}, fillRect() {} }) }) };
const G = new Function(src + '\nreturn { newRun, simStep, GY, STEP, vehSpr };')();

function scene(kind, lane, pos, opts = {}) {
  const S = G.newRun(0, false, 1, 0);
  S.cd = 0; S.spawnT = 1e9; S.haz = []; S.pick = []; S.riv = []; S.vnd = []; S.cop = null;
  for (const k in S.nx) S.nx[k] = 1e9;
  const m = S.m; m.x = 1000; m.v = 0; m.tpos = pos; m.y = G.GY[pos];
  const sp = G.vehSpr(kind, '#fff');
  const v = { kind, img: sp.img, L: sp.L, gb: sp.gb, lane, gy: opts.gy != null ? opts.gy : G.GY[lane * 2], x: m.x + (opts.dx != null ? opts.dx : -5),
    v: 0, base: 0, wide: kind === 'bus' || kind === 'gandola' || kind === 'grua', bubble: null, bubbleT: 0 };
  S.veh = [v];
  G.simStep(S, G.STEP);
  return { crashed: m.crashed, air: m.air, adj: !!v.adj };
}

const cases = [
  ['car in lane 1, moto in same lane -> crash',              () => scene('car', 1, 2).crashed === true],
  ['car in lane 1, moto in canalito above -> no crash',     () => scene('car', 1, 1).crashed === false],
  ['car in lane 1, moto in canalito below -> no crash',     () => scene('car', 1, 3).crashed === false],
  ['car in lane 1, moto in canalito below -> rasante',      () => scene('car', 1, 3).adj === true],
  ['bus in lane 1, moto in same lane -> crash',             () => scene('bus', 1, 2).crashed === true],
  ['bus in lane 1, moto in canalito above (hidden) -> crash', () => scene('bus', 1, 1).crashed === true],
  ['bus in lane 1, moto in canalito below (visible) -> no crash', () => scene('bus', 1, 3).crashed === false],
  ['bus in lane 1, moto in canalito below -> rasante',      () => scene('bus', 1, 3).adj === true],
  ['gandola in lane 2, moto on hombrillo -> no crash',      () => scene('gandola', 2, 5).crashed === false],
  ['gandola in lane 0, moto in canalito below -> no crash', () => scene('gandola', 0, 1).crashed === false],
  ['car sliding lane 1->0, sprite still in lane 1, moto in lane 1 -> crash', () => scene('car', 0, 2, { gy: 145 }).crashed === true],
  ['car sliding lane 1->0, sprite still in lane 1, moto in lane 0 -> no crash', () => scene('car', 0, 0, { gy: 145 }).crashed === false],
  ['grua in lane 1, moto in canalito below hits ramp -> launch', () => scene('grua', 1, 3, { dx: 5 }).air === true],
  ['grua in lane 1, moto in same lane hits ramp -> launch', () => scene('grua', 1, 2, { dx: 5 }).air === true],
];
let fail = 0;
for (const [name, fn] of cases) { const ok = fn(); if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name); }
console.log(`\n${cases.length - fail}/${cases.length} passed`); process.exit(fail ? 1 : 0);
