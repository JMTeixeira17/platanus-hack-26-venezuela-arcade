const fs = require('fs');
const src = fs.readFileSync(require('path').join(__dirname, '..', 'game.js'), 'utf8');
const body = src.slice(src.indexOf('const RO = Math.round'), src.indexOf('/* ---------- audio')); // helpers + sprites
global.document = { createElement: () => { const px = []; return { px, getContext: () => ({ set fillStyle(v){}, fillRect(x, y){ px.push([x, y]); } }) }; } };
const run = new Function(body + `
const ext = c => { let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9; for (const [x,y] of c.px){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);} return {x0,x1,y0,y1}; };
const mo = ext(RIDERS[0].img);
console.log('MOTO  screen x:', mo.x0-12, '..', mo.x1-12, '(vs m.x)  hitbox -10..+10 | y:', mo.y0-19, '..', mo.y1-19, '(vs m.y)');
for (const k of ['car','viejo','suv','bus','gandola','grua']) { const s = vehSpr(k,'#fff'), e = ext(s.img); console.log(k.padEnd(8), 'x:', e.x0, '..', e.x1, ' L=', s.L, '| y:', e.y0 - s.gb, '..', e.y1 - s.gb, '(vs gy)'); }
`);
run();
// Current depth hit band, read from game.js (dy = m.y - v.gy; positive = moto in front of the vehicle).
const band = src.match(/lo = v\.wide \? (-?[\d.]+) : (-?[\d.]+)/), hi = src.match(/dy >= ([\d.]+)\)/);
console.log(band && hi
  ? `hit band: narrow ${band[2]} .. +${hi[1]} | wide (bus/gandola/grua) ${band[1]} .. +${hi[1]}`
  : 'hit band: pattern not found in game.js (collision code changed?)');
