// Behavioral tests for the touch control layer in game.js (fake DOM, real game code).
const fs = require('fs');
const SRC = (() => { const s = fs.readFileSync(require('path').join(__dirname, '..', 'game.js'), 'utf8'); return s.slice(0, s.indexOf('new Phaser.Game(')); })();

function boot({ coarse = false, w = 844, h = 390 } = {}) {
  const ctx = { set fillStyle(v) {}, fillRect() {}, drawImage() {}, save() {}, restore() {}, translate() {}, rotate() {}, set globalAlpha(v) {}, set imageSmoothingEnabled(v) {} };
  const el = tag => ({ tag, style: { cssText: '' }, children: [], textContent: '', appendChild(c) { this.children.push(c); return c; }, getContext: () => ctx });
  const listeners = {};
  global.window = { innerWidth: w, innerHeight: h, addEventListener(n, f) { (listeners[n] = listeners[n] || []).push(f); }, matchMedia: () => ({ matches: coarse }) };
  global.document = { createElement: el, body: el('body'), head: el('head') };
  global.innerWidth = w; global.innerHeight = h; global.matchMedia = window.matchMedia;
  const G = new Function(SRC + '\nreturn { held, pressed, create, pressTxt, getTUI: () => TUI };')();
  const fire = (type, touches) => { const e = { type, cancelable: true, prevented: false, changedTouches: touches, preventDefault() { this.prevented = true; } }; for (const f of listeners[type] || []) f(e); return e; };
  const scene = { textures: { createCanvas: () => ({ getContext: () => ctx }) }, add: { image: () => ({ setOrigin: () => ({ setScale() {} }) }) } };
  return { G, fire, t: (identifier, clientX, clientY) => ({ identifier, clientX, clientY }), boot: () => G.create.call(scene), domCount: () => document.body.children.length };
}
const H = (G, ...codes) => codes.every(c => !!G.held[c]);
const none = (G, ...codes) => codes.every(c => !G.held[c]);

const cases = [
  ['desktop/cabinet: create() adds no touch overlay', () => { const k = boot(); k.boot(); return k.domCount() === 0 && k.G.getTUI() == null; }],
  ['desktop/cabinet: start prompt stays PRESIONA START', () => { const k = boot(); k.boot(); return k.G.pressTxt() === 'PRESIONA START'; }],
  ['phone (coarse pointer): create() shows overlay', () => { const k = boot({ coarse: true }); k.boot(); return k.domCount() > 0 && k.G.getTUI() != null; }],
  ['phone: start prompt tells to tap button 1', () => { const k = boot({ coarse: true }); k.boot(); return k.G.pressTxt() === 'TOCA EL BOTON 1'; }],
  ['first touch creates overlay lazily and blocks scrolling', () => { const k = boot(); const e = k.fire('touchstart', [k.t(1, 800, 350)]); return e.prevented && k.domCount() > 0; }],
  ['tap lower right = button 1 held + pressed', () => { const k = boot(); k.fire('touchstart', [k.t(1, 800, 350)]); return H(k.G, 'P1_1') && k.G.pressed.P1_1 === true && none(k.G, 'P1_2'); }],
  ['release button 1', () => { const k = boot(); k.fire('touchstart', [k.t(1, 800, 350)]); k.fire('touchend', [k.t(1, 800, 350)]); return none(k.G, 'P1_1'); }],
  ['tap upper right = button 2', () => { const k = boot(); k.fire('touchstart', [k.t(1, 800, 150)]); return H(k.G, 'P1_2') && none(k.G, 'P1_1'); }],
  ['joystick drag right = P1_R', () => { const k = boot(); k.fire('touchstart', [k.t(2, 150, 250)]); k.fire('touchmove', [k.t(2, 200, 250)]); return H(k.G, 'P1_R') && none(k.G, 'P1_U', 'P1_D', 'P1_L') && k.G.pressed.P1_R === true; }],
  ['joystick drag up = P1_U only', () => { const k = boot(); k.fire('touchstart', [k.t(2, 150, 250)]); k.fire('touchmove', [k.t(2, 200, 250)]); k.fire('touchmove', [k.t(2, 150, 200)]); return H(k.G, 'P1_U') && none(k.G, 'P1_R', 'P1_D', 'P1_L'); }],
  ['joystick drag down-left = P1_D + P1_L', () => { const k = boot(); k.fire('touchstart', [k.t(2, 150, 250)]); k.fire('touchmove', [k.t(2, 115, 285)]); return H(k.G, 'P1_D', 'P1_L') && none(k.G, 'P1_U', 'P1_R'); }],
  ['joystick dead zone = nothing', () => { const k = boot(); k.fire('touchstart', [k.t(2, 150, 250)]); k.fire('touchmove', [k.t(2, 156, 253)]); return none(k.G, 'P1_U', 'P1_D', 'P1_L', 'P1_R'); }],
  ['multitouch: accelerate + wheelie, then release wheelie', () => { const k = boot(); k.fire('touchstart', [k.t(2, 150, 250)]); k.fire('touchmove', [k.t(2, 200, 250)]); k.fire('touchstart', [k.t(3, 800, 350)]); const both = H(k.G, 'P1_R', 'P1_1'); k.fire('touchend', [k.t(3, 800, 350)]); return both && H(k.G, 'P1_R') && none(k.G, 'P1_1'); }],
  ['touchcancel releases joystick', () => { const k = boot(); k.fire('touchstart', [k.t(2, 150, 250)]); k.fire('touchmove', [k.t(2, 200, 250)]); k.fire('touchcancel', [k.t(2, 200, 250)]); return none(k.G, 'P1_R'); }],
  ['second left touch does not hijack the joystick', () => { const k = boot(); k.fire('touchstart', [k.t(2, 150, 250)]); k.fire('touchmove', [k.t(2, 200, 250)]); k.fire('touchstart', [k.t(4, 100, 100)]); k.fire('touchmove', [k.t(4, 100, 30)]); return H(k.G, 'P1_R') && none(k.G, 'P1_U'); }],
  ['portrait phone: buttons still map by position', () => { const k = boot({ w: 390, h: 844 }); k.fire('touchstart', [k.t(1, 330, 800)]); return H(k.G, 'P1_1'); }],
];
let fail = 0;
for (let [name, fn] of cases) { let ok; try { ok = fn(); } catch (e) { ok = false; name += '  [' + e.message + ']'; } if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name); }
console.log(`\n${cases.length - fail}/${cases.length} passed`); process.exit(fail ? 1 : 0);
