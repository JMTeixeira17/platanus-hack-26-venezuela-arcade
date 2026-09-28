const fs = require('fs');
global.window = { addEventListener() {} };
global.document = { createElement: () => ({ getContext: () => ({ set fillStyle(v) {}, fillRect() {} }) }) };
function load(p) { let s = fs.readFileSync(p, 'utf8'); s = s.slice(0, s.indexOf('new Phaser.Game(')); return new Function(s + '\nreturn { newRun, simStep, STEP };')(); }
const paths = process.argv.length > 2 ? process.argv.slice(2) : [require('path').join(__dirname, '..', 'game.js')];
for (const p of paths) { const label = require('path').basename(p);
  const G = load(p); const origRandom = Math.random; let r = 7; Math.random = () => { r = (r * 16807) % 2147483647; return (r - 1) / 2147483646; };
  const why = {}; let dist = 0, arrived = 0; const N = 200;
  for (let i = 0; i < N; i++) {
    const S = G.newRun(i % 5, true, 1, 0);
    for (let k = 0; k < 60 * 90 && !S.m.crashed && !S.arrived; k++) G.simStep(S, G.STEP);
    dist += S.m.x; if (S.arrived) arrived++; else why[S.m.why || 'timeout'] = (why[S.m.why || 'timeout'] || 0) + 1;
  }
  Math.random = origRandom;
  console.log(label.padEnd(20), 'distancia media:', Math.round(dist / N), '| llegan:', arrived + '/' + N, '| fin por:', JSON.stringify(why));
}
