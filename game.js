/* Moto Piruetas: hora pico en la Fajardo.
   Platanus Hack 26 Caracas. Todo dibujado y sonado con codigo.
   Phaser 3 maneja el loop, la escala y el audio; el juego se pinta en un
   CanvasTexture de 320x240 que se escala x2.5 con pixelArt. */

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const W = 320, H = 240, STEP = 1 / 60;
const SKEY = 'moto-piruetas-ranking-v1';

/* DO NOT replace existing keys: they match the physical arcade cabinet wiring. */
const CABINET_KEYS = {
  P1_U: ['w'], P1_D: ['s'], P1_L: ['a'], P1_R: ['d'],
  P1_1: ['u'], P1_2: ['i'], P1_3: ['o'],
  P1_4: ['j'], P1_5: ['k'], P1_6: ['l'],
  P2_U: ['ArrowUp'], P2_D: ['ArrowDown'], P2_L: ['ArrowLeft'], P2_R: ['ArrowRight'],
  P2_1: ['r'], P2_2: ['t'], P2_3: ['y'],
  P2_4: ['f'], P2_5: ['g'], P2_6: ['h'],
  START1: ['Enter'], START2: ['2'],
};

function normalizeIncomingKey(key) {
  if (typeof key !== 'string' || key.length === 0) return '';
  if (key === ' ') return 'space';
  return key.toLowerCase();
}

const KEYBOARD_TO_ARCADE = {};
for (const [code, keys] of Object.entries(CABINET_KEYS)) {
  for (const key of keys) KEYBOARD_TO_ARCADE[normalizeIncomingKey(key)] = code;
}

const held = Object.create(null), pressed = Object.create(null);
window.addEventListener('keydown', e => {
  const c = KEYBOARD_TO_ARCADE[normalizeIncomingKey(e.key)];
  if (!c) return;
  if (!held[c]) pressed[c] = true;
  held[c] = true;
  unlockAudio();
});
window.addEventListener('keyup', e => {
  const c = KEYBOARD_TO_ARCADE[normalizeIncomingKey(e.key)];
  if (c) held[c] = false;
});
const hd = (...c) => c.some(k => held[k]);
const pr = (...c) => c.some(k => pressed[k]);
/* Un solo jugador: cualquiera de los dos joysticks sirve. */
const I = {
  U: () => hd('P1_U', 'P2_U'), D: () => hd('P1_D', 'P2_D'), L: () => hd('P1_L', 'P2_L'), R: () => hd('P1_R', 'P2_R'),
  A: () => hd('P1_1', 'P1_4', 'P2_1', 'P2_4'),
  pU: () => pr('P1_U', 'P2_U'), pD: () => pr('P1_D', 'P2_D'), pL: () => pr('P1_L', 'P2_L'), pR: () => pr('P1_R', 'P2_R'),
  pA: () => pr('P1_1', 'P1_4', 'P2_1', 'P2_4'), pB: () => pr('P1_2', 'P1_5', 'P2_2', 'P2_5'), pS: () => pr('START1', 'START2'),
};

/* Controles tactiles para telefonos: salen con puntero tactil o al primer toque y
   escriben los mismos codigos de la maquina. Mitad izquierda: joystick flotante;
   mitad derecha: boton 1 abajo, boton 2 arriba. Fuera de la partida, arriba a la
   derecha sale START (en la partida esa esquina sigue siendo el boton 2). */
let TUI = null;
const TCH = {};
const setHeld = (c, on) => { if (on && !held[c]) pressed[c] = true; held[c] = on; };
const pressTxt = () => TUI ? 'TOCA START' : 'PRESIONA START';
function touchUI() {
  const d = document, css = 'position:fixed;box-sizing:border-box;pointer-events:none;border-radius:50%;display:flex;align-items:center;justify-content:center;font:bold 8vmin monospace;color:#fff;border:.6vmin solid rgba(255,255,255,.5);background:rgba(255,255,255,.1);';
  const mk = (s, t, p) => { const e = d.createElement('div'); e.style.cssText = css + s; e.textContent = t || ''; (p || d.body).appendChild(e); return e; };
  d.body.style.cssText += ';touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none';
  const st = d.createElement('style'); st.textContent = '@media (orientation:landscape){#mp-rot{display:none!important}}'; d.head.appendChild(st);
  mk('border:0;border-radius:0;background:none;top:2vmin;left:0;right:0;font-size:4vmin;color:#e6ff00', 'GIRA EL TELEFONO PARA VER MEJOR').id = 'mp-rot';
  const base = mk('width:30vmin;height:30vmin;left:5vmin;bottom:6vmin'), knob = mk('position:absolute;width:13vmin;height:13vmin;left:7.9vmin;top:7.9vmin;background:rgba(230,255,0,.4)', '', base);
  const b1 = mk('width:22vmin;height:22vmin;right:6vmin;bottom:7vmin', '1'), b2 = mk('width:16vmin;height:16vmin;right:9vmin;bottom:36vmin', '2');
  const sb = mk('width:26vmin;height:11vmin;right:3vmin;top:9vmin;border-radius:3vmin;font-size:6vmin;color:#e6ff00', 'START');
  const bg = v => v ? 'rgba(230,255,0,.45)' : 'rgba(255,255,255,.1)';
  const f = (jo, dx, dy, vm, on) => {
    const k = Math.min(1, 9 * vm / (Math.hypot(dx, dy) || 1)), bs = base.style;
    bs.left = jo ? jo.ox - 15 * vm + 'px' : '5vmin'; bs.top = jo ? jo.oy - 15 * vm + 'px' : 'auto'; bs.bottom = jo ? 'auto' : '6vmin';
    knob.style.transform = 'translate(' + dx * k + 'px,' + dy * k + 'px)';
    b1.style.background = bg(on.P1_1); b2.style.background = bg(on.P1_2); sb.style.background = bg(on.START1);
  };
  f.show = v => { const d = v ? 'flex' : 'none'; if (sb.style.display !== d) sb.style.display = d; };
  return f;
}
function onTouch(e) {
  if (e.cancelable) e.preventDefault();
  unlockAudio();
  if (!TUI) TUI = touchUI();
  const w = window.innerWidth, h = window.innerHeight, vm = Math.min(w, h) / 100, ts = e.changedTouches, end = e.type === 'touchend' || e.type === 'touchcancel';
  /* Si el navegador pierde un touchend, el boton quedaria apretado para siempre y
     ningun toque nuevo contaria: se sueltan los toques que ya no estan en pantalla. */
  if (e.touches) {
    const live = Array.from(e.touches, t => '' + t.identifier);
    for (const k in TCH) if (!live.includes(k)) { for (const c of TCH[k].j ? ['P1_U', 'P1_D', 'P1_L', 'P1_R'] : [TCH[k].b]) held[c] = false; delete TCH[k]; }
  }
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i], id = t.identifier, x = t.clientX, y = t.clientY;
    if (e.type === 'touchstart') { const L = x < w / 2; if (L && Object.values(TCH).some(o => o.j)) continue; TCH[id] = { j: L, s: !L && MODE !== 'play' && x > w - 30 * vm && y < 21 * vm, ox: x, oy: y }; }
    const o = TCH[id]; if (!o) continue;
    if (end) { delete TCH[id]; continue; }
    o.x = x; o.y = y; o.b = o.s ? 'START1' : y < h - 31 * vm ? 'P1_2' : 'P1_1';
  }
  let jo = null; const on = {};
  for (const k in TCH) { const o = TCH[k]; if (o.j) jo = o; else on[o.b] = 1; }
  const dx = jo ? jo.x - jo.ox : 0, dy = jo ? jo.y - jo.oy : 0, len = Math.hypot(dx, dy), s = len < 5 * vm ? 1e9 : .4 * len;
  setHeld('P1_U', dy < -s); setHeld('P1_D', dy > s); setHeld('P1_L', dx < -s); setHeld('P1_R', dx > s);
  setHeld('P1_1', !!on.P1_1); setHeld('P1_2', !!on.P1_2); setHeld('START1', !!on.START1);
  TUI(jo, dx, dy, vm, on);
}
for (const n of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) window.addEventListener(n, onTouch, { passive: false, capture: true });

/* ---------- utilidades ---------- */
const RO = Math.round, FL = Math.floor, SN = Math.sin, AB = Math.abs, MN = Math.min, MXX = Math.max;
let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = a => a[FL(rnd() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
let X = null;
const F = c => { X.fillStyle = c; }, Q = (a, b, c, d) => X.fillRect(a, b, c, d);

/* fuente 3x5: cada fila es un digito octal */
const FONT = {A:'25755',B:'65656',C:'34443',D:'65556',E:'74647',F:'74644',G:'34553',H:'55755',I:'72227',J:'11152',K:'55655',L:'44447',M:'57755',N:'65555',O:'25552',P:'65644',Q:'25563',R:'65655',S:'34216',T:'72222',U:'55557',V:'55552',W:'55775',X:'55255',Y:'55222',Z:'71247','0':'75557','1':'26227','2':'71747','3':'71717','4':'55711','5':'74717','6':'74757','7':'71222','8':'75757','9':'75717','!':'22202',':':'02020','.':'00002','-':'00700','?':'61202','/':'11244','+':'02720',',':'00024','#':'57575','@':'75747','%':'51245','&':'25253','$':'36236','~':'70755','(':'12221',')':'42224','<':'12421','>':'42124'};
const norm = s => String(s).toUpperCase().replace(/Ñ/g, '~').replace(/[¡¿]/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const tw = (s, sc = 1) => norm(s).length * 4 * sc - sc;
function txt(s, x, y, col, sc = 1, al = 'l', sh = '#000') {
  s = norm(s);
  const w = s.length * 4 * sc - sc;
  const x0 = al === 'c' ? RO(x - w / 2) : al === 'r' ? RO(x - w) : RO(x), y0 = RO(y);
  const pass = (c, ox, oy) => {
    F(c);
    for (let i = 0; i < s.length; i++) {
      const f = FONT[s[i]]; if (!f) continue;
      for (let r = 0; r < 5; r++) { const b = +f[r]; for (let k = 0; k < 3; k++) if ((b >> (2 - k)) & 1) Q(x0 + i * 4 * sc + k * sc + ox, y0 + r * sc + oy, sc, sc); }
    }
  };
  if (sh) pass(sh, sc, sc);
  pass(col, 0, 0);
}
function bubble(x, y, s) {
  const w = tw(s) + 4, x0 = clamp(RO(x - w / 2), 2, W - 2 - w); y = RO(y);
  F('#151515'); Q(x0 - 1, y - 1, w + 2, 11);
  F('#fff'); Q(x0, y, w, 9); Q(clamp(RO(x) - 1, x0, x0 + w - 2), y + 9, 2, 2);
  txt(s, x0 + 2, y + 2, '#151515', 1, 'l', null);
}
function heart(x, y, col) { F(col); Q(x, y, 2, 1); Q(x + 3, y, 2, 1); Q(x, y + 1, 5, 1); Q(x + 1, y + 2, 3, 1); Q(x + 2, y + 3, 1, 1); }

/* ---------- sprites de texto ---------- */
const PAL = {k:'#151515',e:'#151515',s:'#c68a5c',S:'#8f5a36',l:'#edc09a',h:'#2a1a12',w:'#f2f2f2',W:'#bdbdbd',x:'#7a7a7a',X:'#3a3a3a',y:'#e6ff00',r:'#e03a33',b:'#2f6fe0',n:'#1b2a5e',g:'#3fbf4f',o:'#f2c56b',O:'#c98a3a',m:'#8a4a24',c:'#3a2436',q:'#ffd23a',p:'#f28aa0',t:'#b07a44',v:'#8a4fd0',u:'#3fd0e0',T:'#2f6fe0',P:'#1b2a5e',C:'#e6ff00'};
const M = h => h.length === 6 ? h + [...h].reverse().join('') : h;
const BASE = ['...kkk','..khhh','.khhhh','.khsss','.kssss','.ksess','.kpsss','.ksssk','..ksss','...kkS','..kTTT','.kTTTT','kTTTTT','kTkTTT','kskTTT','.kkPPP','..kPPk','..kPPk','.kXXXk'];
function grid(w, h) { const g = []; for (let y = 0; y < h; y++) g.push(Array(w).fill('.')); return g; }
function stamp(g, rows, ox, oy) { rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const k = r[i]; if (k !== '.' && g[y + oy] && i + ox >= 0 && i + ox < g[0].length) g[y + oy][i + ox] = k; } }); }
function px(g, a, b, k) { if (g[b] && a >= 0 && a < g[0].length) g[b][a] = k; }
function rectG(g, a, b, w, h, k) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(g, a + i, b + j, k); }
function toCanvas(g, pal) {
  const h = g.length, w = g[0].length, c = mkc(w, h), x = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) { const k = g[y][i]; if (k !== '.') { x.fillStyle = pal[k] || '#f0f'; x.fillRect(i, y, 1, 1); } }
  return c;
}
function person(o) {
  const w = o.w || 12, ox = o.ox || 0, pal = Object.assign({}, PAL, o.p || {}), g = grid(w, 19), rr = o.r || {};
  stamp(g, BASE.map((h, i) => M(rr[i] != null ? rr[i] : h)), ox, 0);
  if (o.f) o.f(g);
  return { a: toCanvas(g, pal), w, ox };
}
function dS(s, x, y) { X.drawImage(s.a, RO(x) - (s.ox + 6), RO(y) - 19); }
const capR = {1:'..kCCC',2:'.kCCCC',3:'kCCCCC',4:'.kkkkk'};
const SPV = person({w:16,ox:2,p:{T:'#f2f2f2',P:'#3a3a3a',C:'#e03a33',s:'#9a6238',S:'#6b3f22'},r:Object.assign({},capR,{7:'.ksskr'}),f:g=>{const cs='rygbpu';for(let i=1;i<15;i++)px(g,i,12,cs[i%6]);rectG(g,0,13,16,2,'O');rectG(g,0,15,16,1,'k');px(g,0,12,'k');px(g,15,12,'k');}});
const AGUA = person({w:16,ox:2,p:{T:'#3fd0e0',P:'#1b2a5e',s:'#8f5a36',S:'#6b3f22',C:'#e03a33'},r:capR,f:g=>{rectG(g,11,13,5,5,'k');rectG(g,12,14,3,3,'w');rectG(g,12,12,3,1,'x');}});

function outline(g) {
  const h = g.length, w = g[0].length, o = g.map(r => r.slice());
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (g[y][x] !== '.') continue;
    if ([[1,0],[-1,0],[0,1],[0,-1]].some(q => { const r = g[y + q[1]]; const c = r && r[x + q[0]]; return c && c !== '.' && c !== 'k'; })) o[y][x] = 'k';
  }
  return o;
}
function circ(g, cx, cy, r) { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const d = dx * dx + dy * dy; if (d <= r * r + .5) px(g, cx + dx, cy + dy, d > (r - 1) * (r - 1) + .5 ? 'k' : d < 1 ? 'x' : 'X'); } }
function lineG(g, x0, y0, x1, y1, k) { const n = MXX(AB(x1 - x0), AB(y1 - y0)) || 1; for (let i = 0; i <= n; i++) px(g, RO(x0 + (x1 - x0) * i / n), RO(y0 + (y1 - y0) * i / n), k); }
function motoSpr(o, empty) {
  const g = grid(26, 21), P2 = (x, y, k) => px(g, x + 1, y + 3, k), R2 = (x, y, w, h, k) => rectG(g, x + 1, y + 3, w, h, k), L2 = (a, b, c, d, k) => lineG(g, a + 1, b + 3, c + 1, d + 3, k);
  if (o.box && !empty) { R2(3,2,5,6,'B'); P2(4,3,'y'); P2(5,3,'y'); P2(6,3,'y'); for (const x of [4,6]) for (let y = 4; y < 7; y++) P2(x,y,'y'); P2(5,5,'y'); }
  if (o.stick && !empty) { L2(9,4,5,-2,'x'); R2(3,-3,3,2,'k'); }
  R2(3,9,4,1,'C'); R2(2,11,4,1,'W'); R2(6,10,10,2,'C'); R2(11,8,4,2,'C'); R2(15,7,3,3,'C'); P2(18,8,'y'); R2(6,9,5,1,'k');
  L2(17,13,15,6,'x'); P2(14,5,'k'); P2(15,5,'k');
  if (!empty) {
    R2(9,8,3,2,'P'); R2(11,10,2,2,'P'); P2(12,12,'k'); P2(13,12,'k'); R2(8,3,3,5,'T'); if (o.vest) R2(8,5,3,1,'W');
    L2(10,4,14,5,'T'); P2(14,5,'s'); R2(8,0,4,3,'H');
    if (o.beret) { P2(11,1,'u'); P2(11,3,'W'); P2(12,3,'W'); } else { P2(11,1,'n'); P2(11,2,'n'); P2(10,3,'s'); }
    if (o.band) P2(7,1,'r');
  }
  circ(g, 6, 16, 3); circ(g, 18, 16, 3);
  return toCanvas(outline(g), Object.assign({}, PAL, { B: '#ff3d8b' }, o.p || {}));
}
function riderSpr(o) { const g = grid(11, 12); if (o.box) rectG(g,1,3,2,4,'B'); rectG(g,3,0,4,3,'H'); px(g,6,1,'n'); rectG(g,3,3,3,4,'T'); rectG(g,6,4,2,1,'T'); px(g,8,4,'s'); rectG(g,3,7,2,3,'P'); rectG(g,6,7,2,3,'P'); return toCanvas(outline(g), Object.assign({}, PAL, { B: '#ff3d8b' }, o.p || {})); }
const RIDERS = [
  {name:'DELIVERY ÑOMI',st:[5,3,2],sp:'PEDIDO CALIENTE: MAS PUNTOS POR DISTANCIA',o:{box:1,p:{C:'#3a3a3a',H:'#ff3d8b',T:'#ff3d8b',P:'#1b2a5e',s:'#b8794c'}}},
  {name:'LA MOTOTAXISTA',st:[3,5,3],sp:'CAMBIA DE CARRIL MAS RAPIDO',o:{vest:1,p:{C:'#2f6fe0',H:'#e6ff00',T:'#c8e000',P:'#3a3a3a',s:'#8f5a36'}}},
  {name:'REY DEL CABALLITO',st:[2,3,5],sp:'AGUANTA EL CABALLITO ETERNO',o:{band:1,p:{C:'#e03a33',H:'#151515',T:'#f2f2f2',P:'#2f6fe0',s:'#c68a5c'}}},
  {name:'LA INFLUENCER',st:[3,2,3],sp:'EN VIVO: LAS PIRUETAS VALEN DOBLE',o:{stick:1,p:{C:'#8a4fd0',H:'#f28aa0',T:'#f28aa0',P:'#f2f2f2',s:'#e8b48a'}}},
  {name:'EL ABUELO',st:[2,4,4],sp:'LOS FISCALES LE TIENEN PACIENCIA',o:{beret:1,p:{C:'#9c1f1c',H:'#8a5530',T:'#7a7a7a',P:'#5a3a2a',s:'#c68a5c'}}},
];
RIDERS.forEach(r => { r.img = motoSpr(r.o); r.empty = motoSpr(r.o, true); r.rider = riderSpr(r.o); });
const COP = motoSpr({p:{C:'#f2f2f2',H:'#f2f2f2',T:'#1b4fa0',P:'#1b2a5e',s:'#8f5a36'}});
const RIVALS = [['#e03a33','#151515','#3a3a3a'],['#2f6fe0','#f2f2f2','#e03a33'],['#3fbf4f','#ffd23a','#1b2a5e']].map(q => motoSpr({p:{C:q[0],H:q[1],T:q[2],P:'#3a3a3a',s:'#8f5a36'}}));
const VCOL = ['#e03a33','#2f6fe0','#f2f2f2','#7a7a7a','#3fbf4f','#ffd23a','#8a4fd0','#3fd0e0'];
function vehSpr(kind, col) {
  let L, Hh, gb, g; const pal = Object.assign({}, PAL, { C: col, G: '#9ad0e8', D: '#151515' });
  if (kind === 'car' || kind === 'viejo') { L=36;Hh=18;gb=16;g=grid(L,Hh);rectG(g,1,7,L-2,6,'C');rectG(g,9,2,17,6,'C');rectG(g,11,3,6,4,'G');rectG(g,18,3,6,4,'G');rectG(g,1,11,L-2,1,'D');px(g,L-2,8,'y');px(g,1,8,'r');if(kind==='viejo'){px(g,5,9,'O');px(g,6,10,'O');px(g,24,9,'O');px(g,27,8,'O');rectG(g,0,10,2,1,'W');rectG(g,L-2,10,2,1,'W');}circ(g,8,13,3);circ(g,L-9,13,3); }
  else if (kind === 'suv') { L=44;Hh=22;gb=20;pal.G='#23262e';g=grid(L,Hh);rectG(g,1,6,L-2,10,'C');rectG(g,6,1,31,6,'C');rectG(g,8,2,10,5,'G');rectG(g,19,2,10,5,'G');rectG(g,30,2,6,5,'G');rectG(g,1,14,L-2,1,'D');px(g,L-2,8,'y');px(g,1,8,'r');circ(g,9,17,3);circ(g,L-10,17,3); }
  else if (kind === 'bus') { L=60;Hh=28;gb=26;g=grid(L,Hh);rectG(g,1,1,L-2,21,'C');for(let x=5;x<L-14;x+=9)rectG(g,x,4,7,6,'G');rectG(g,L-11,4,9,9,'G');rectG(g,1,13,L-2,2,'y');rectG(g,1,15,L-2,1,'r');rectG(g,L-19,11,5,10,'D');px(g,L-2,18,'y');px(g,1,18,'r');circ(g,10,23,3);circ(g,L-12,23,3); }
  else if (kind === 'gandola') { L=96;Hh=32;gb=30;g=grid(L,Hh);rectG(g,1,1,70,24,'w');rectG(g,4,8,64,9,'y');rectG(g,1,24,70,1,'x');rectG(g,72,8,22,17,'C');rectG(g,84,10,8,6,'G');rectG(g,70,20,4,2,'X');px(g,L-2,20,'y');for(const x of [10,18,56,78,88])circ(g,x,27,3); }
  else { L=78;Hh=26;gb=24;g=grid(L,Hh);rectG(g,4,17,54,3,'X');for(let x=0;x<56;x++){const t=RO(22-x*12/55);rectG(g,x,t,1,3,'W');if(x%6===0)px(g,x,t,'y');}rectG(g,56,6,20,14,'C');rectG(g,66,8,8,5,'G');for(const x of [14,48,66])circ(g,x,21,3); }
  return { img: toCanvas(outline(g), pal), L, gb };
}

/* ---------- audio con osciladores ---------- */
let AC = null, SCN = null, ENG = null;
function unlockAudio() { try { if (!AC && SCN && SCN.sound && SCN.sound.context) AC = SCN.sound.context; if (AC && AC.state === 'suspended') AC.resume(); } catch (e) {} }
function tone(f, d, type, v, f2, dl) {
  if (!AC) return;
  try {
    const t = AC.currentTime + (dl || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v || .06, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + .02);
  } catch (e) {}
}
function noise(d, v) {
  if (!AC) return;
  try {
    const b = AC.createBuffer(1, FL(AC.sampleRate * d), AC.sampleRate), a = b.getChannelData(0);
    for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / a.length);
    const s = AC.createBufferSource(), g = AC.createGain(); s.buffer = b; g.gain.value = v || .2; s.connect(g); g.connect(AC.destination); s.start();
  } catch (e) {}
}
const SFX = {
  honk() { tone(392,.22,'square',.06); tone(494,.22,'square',.05); },
  horn() { tone(660,.1,'square',.04); tone(830,.12,'square',.04,0,.12); },
  ras() { tone(880,.06,'square',.035,1320); },
  pick() { [523,659,784,1047].forEach((f,i) => tone(f,.09,'square',.045,0,i*.06)); },
  crash() { noise(.5,.25); tone(220,.5,'sawtooth',.07,40); },
  splash() { noise(.8,.2); tone(300,.4,'sine',.05,80); },
  jump() { tone(260,.3,'square',.045,900); },
  land() { tone(660,.08,'square',.045); tone(990,.14,'square',.045,0,.08); },
  bump() { tone(130,.14,'square',.07,60); },
  blip() { tone(700,.05,'square',.035); },
  cop() { tone(740,.2,'sine',.03); tone(980,.2,'sine',.03,0,.24); },
  go() { tone(523,.12,'square',.05); tone(784,.25,'square',.05,0,.12); },
};
function sfx(S, n) { if (!S.ai && SFX[n]) SFX[n](); }
function startEngine() {
  stopEngine(); if (!AC) return;
  try { const o = AC.createOscillator(), f = AC.createBiquadFilter(), g = AC.createGain(); o.type = 'sawtooth'; o.frequency.value = 50; f.type = 'lowpass'; f.frequency.value = 400; g.gain.value = .025; o.connect(f); f.connect(g); g.connect(AC.destination); o.start(); ENG = { o, g }; } catch (e) { ENG = null; }
}
function stopEngine() { if (ENG) { try { ENG.o.stop(); } catch (e) {} ENG = null; } }
const BASSN = [45,0,45,52,0,52,45,0,43,0,43,50,0,50,43,48], LEADN = [69,0,72,0,76,0,74,72,67,0,71,0,74,0,72,71];
const mtof = n => 440 * Math.pow(2, (n - 69) / 12);

/* ---------- mundo ---------- */
const GY = [116,130,145,160,175,196], MX = 84, TRIP = 7200;
const nearestPos = y => { let b = 0; for (let i = 1; i < 6; i++) if (AB(GY[i] - y) < AB(GY[b] - y)) b = i; return b; };
const INSULTS = ['#@%!','&$#%!','ANIMAL!','BRUTO!','TE VAS A MATAR!','MOTORIZAO TENIAS QUE SER!','LOCO!','#@%&!'];
const TRAMOS = ['PETARE','LOS RUICES','PARQUE DEL ESTE','LA CARLOTA','EL PULPO','LA OFICINA'];
const ENDS = {
  espaldas: ['TE FUISTE DE ESPALDAS','SUELTA EL CABALLITO ANTES DEL ROJO'],
  choque: ['TE COMISTE UN CARRO','USA LOS CANALITOS'],
  bus: ['TE COMISTE LA CAMIONETICA','OJO CON EL AVISO DE PARADA'],
  gandola: ['TE COMISTE LA GANDOLA','LAS GANDOLAS NO FRENAN'],
  hueco: ['TE TRAGO LA ALCANTARILLA','LAS RAMAS AVISAN: PASA EN CABALLITO'],
  pirueta: ['ATERRIZASTE DE CARA','CAE CON LA MOTO DERECHA'],
  guaire: ['CAISTE EN EL GUAIRE','NO TE PEGUES AL BORDE'],
  vendedor: ['TUMBASTE AL DE LAS COTUFAS','TOCA CORNETA Y ESPERA'],
  preso: ['PRESO!','TE AGARRO EL FISCAL'],
  tarde: ['TE BOTARON','LLEGASTE TARDE AL TRABAJO'],
};
const occ = v => v.wide ? [v.lane * 2 - 1, v.lane * 2, v.lane * 2 + 1] : [...new Set([v.lane * 2, nearestPos(v.gy)])];
function fl(S, x, y, s, col) { S.floats.push({ x, y, s, col, t: 0 }); }
function banner(S, s, col, dur) { S.banners = [{ s, col, t: 0, dur: dur || 2 }]; }

function newRun(ri, ai, day, score) {
  seed = 1 + FL(Math.random() * 2147483000);
  const R = RIDERS[ri];
  const S = {
    ai, day, t: 0, floats: [], banners: [], shake: 0, parts: [], veh: [], haz: [], pick: [], riv: [], vnd: [], signs: [],
    cola: null, colaDone: true, cop: null, time: day > 1 ? 30 : 34, score: score || 0, combo: 0, lastRas: -9, siren: 0, spawnT: 0,
    dens: 1 + (day - 1) * .25, cam: -MX, edgeT: 0, honk: 0, cd: ai ? 0 : 2.4, lastN: 0, arrived: 0, crashAt: null, rider: null,
    wAcc: 0, dAcc: 0, fct: 0, mt: 0, mi: 0, sirT: 0, fish: 3, end: null,
    m: { x: 0, v: 0, pos: 2, tpos: 2, y: GY[2], a: 0, rot: 0, wheelie: false, bal: 0, air: false, h: 0, vh: 0, airT: 0, inv: 0, turbo: 0, casco: false,
         crashed: false, honkCd: 0, brake: false, acc: 0, R, ri, moveCd: 0, drunkT: 0, why: '' },
  };
  S.nx = { evt: 450, pick: 350, grua: 1100 + rnd() * 500, riv: 800 + rnd() * 500, cola: 1900 + rnd() * 600 };
  TRAMOS.forEach((n, i) => S.signs.push({ x: i === 0 ? 150 : i * TRIP / 5, text: n, done: i === 0, last: i === 5 }));
  S.av = []; for (let i = 0; i < 640; i++) S.av.push(MXX(10, 24 + RO(10 * SN(i / 41) + 6 * SN(i / 17 + 1) + 3 * SN(i / 7 + 2))));
  S.bld = []; for (let x = 0; x < 800;) { const w = 12 + FL(rnd() * 20), h = 14 + FL(rnd() * 30); S.bld.push([x, w, h, pick(['#d9cbb4','#c9b8a0','#e8e0d0','#b8a890','#d0d4dc'])]); x += w + 2; }
  S.ran = []; for (let i = 0; i < 80; i++) S.ran.push([FL(rnd() * 640), FL(rnd() * 10), pick(['#e03a33','#ffd23a','#3fd0e0','#f28aa0','#f2f2f2','#c98a3a'])]);
  for (let i = 0; i < 5; i++) spawnVeh(S, 90 + i * 62);
  if (!ai) banner(S, 'DIA ' + day, '#e6ff00', .8);
  return S;
}
function spawnVeh(S, x, forceLane, forceKind) {
  const r = rnd() * (S.cola && !S.colaDone ? .76 : 1), kind = forceKind || (r < .48 ? 'car' : r < .62 ? 'suv' : r < .76 ? 'viejo' : r < .88 ? 'bus' : 'gandola');
  const lane = forceLane != null ? forceLane : FL(rnd() * 3);
  const col = kind === 'car' ? pick(VCOL) : kind === 'viejo' ? '#d8c28a' : kind === 'suv' ? '#26282e' : kind === 'bus' ? pick(['#f2f2f2','#3fd0e0','#f28aa0','#ffd23a']) : kind === 'gandola' ? '#c62828' : '#f2c200';
  const sp = vehSpr(kind, col);
  const v = { kind, img: sp.img, L: sp.L, gb: sp.gb, lane, gy: GY[lane * 2], x, wide: kind === 'bus' || kind === 'gandola' || kind === 'grua', bubble: null, bubbleT: 0,
    v: kind === 'car' ? 45 + rnd() * 20 : kind === 'suv' ? 50 + rnd() * 20 : kind === 'viejo' ? 30 + rnd() * 10 : kind === 'bus' ? 38 + rnd() * 10 : kind === 'grua' ? 42 : 32 + rnd() * 8 };
  v.base = v.v; const oc = occ(v);
  for (const o of S.veh) if (occ(o).some(p => oc.includes(p)) && x < o.x + o.L + 24 && x + v.L + 24 > o.x) return null;
  const bl = new Set(); for (const o of S.veh.concat([v])) if (x - 50 < o.x + o.L && x + v.L + 50 > o.x) occ(o).forEach(p => bl.add(p));
  if (bl.size >= 5) return null;
  const m = S.m; if (oc.includes(nearestPos(m.y)) && x < m.x + 30 && x + v.L > m.x - 30) return null;
  S.veh.push(v); return v;
}
function aheadDist(S, p) {
  const m = S.m, front = m.x + 10, back = m.x - 10; let d = 999;
  for (const v of S.veh) { if (!occ(v).includes(p) || v.x + v.L < back || (v.kind === 'grua' && !v.used)) continue; if (v.x < front + 2) return -1; d = MN(d, v.x - front); }
  for (const h of S.haz) { if (h.pos !== p || h.x + h.w < back || h.x < front) continue; d = MN(d, h.x - front + (h.kind === 'bache' ? 30 : 0)); }
  for (const q of S.vnd) { if (nearestPos(q.y) !== p || q.x + 6 < back) continue; d = MN(d, q.x - 6 - front); }
  return d;
}
const sideBlocked = (S, p) => S.veh.some(v => occ(v).includes(p) && !(v.kind === 'grua' && !v.used && v.x > S.m.x) && v.x < S.m.x + 12 && v.x + v.L > S.m.x - 13);
function nearestAhead(S, p) { let b = null; for (const v of S.veh) if (occ(v).includes(p) && v.x + v.L > S.m.x - 10 && (!b || v.x < b.x)) b = v; return b; }
function vendAhead(S, p) { let d = 999; for (const q of S.vnd) { if (nearestPos(q.y) !== p || q.x < S.m.x - 8) continue; d = MN(d, q.x - 6 - (S.m.x + 10)); } return d; }
function spawnRival(S, p) { const q = { x: S.m.x - 130, y: GY[p], tpos: p, v: S.m.v + 48, spr: RIVALS[S.riv.length % 3], honkT: 0, say: null, bumped: false }; S.riv.push(q); return q; }
function spawnCola(S) {
  const X0 = S.cam + 345, LEN = 260 + FL(rnd() * 120), n = rnd() < .5 ? 1 : 2, V = [];
  for (let i = 0; i < n; i++) { const p = rnd() < .5 ? 1 : 3; V.push({ x: X0 + 70 + i * (LEN - 110) + rnd() * 30, pos: p, lane: p === 1 ? 0 : 2 }); }
  S.cola = { x0: X0, x1: X0 + LEN }; S.colaDone = false; S.colaB = false;
  S.veh = S.veh.filter(v => v.x + v.L < X0 - 20); S.haz = S.haz.filter(h => h.x < X0 - 20); S.pick = S.pick.filter(p => p.x < X0 - 20);
  for (let lane = 0; lane < 3; lane++) {
    let x = X0 + rnd() * 8; const gaps = V.filter(q => q.lane === lane).map(q => q.x);
    while (x < X0 + LEN) {
      const k = rnd() < .6 ? 'car' : rnd() < .5 ? 'suv' : 'viejo', sp = vehSpr(k, k === 'car' ? pick(VCOL) : k === 'viejo' ? '#d8c28a' : '#26282e');
      const gp = gaps.find(gx => x < gx + 16 && x + sp.L > gx - 16);
      if (gp != null) { x = gp + 16; continue; }
      S.veh.push({ kind: k, img: sp.img, L: sp.L, gb: sp.gb, lane, gy: GY[lane * 2], x, v: 0, base: 0, wide: false, bubble: null, bubbleT: 0, cola: true });
      x += sp.L + 6 + rnd() * 5;
    }
  }
  const says = ['AGUA, AGUA, AGUA!','COTUFAS, TOSTONES!','CARAMELO, CHUPETA!','CARGADOR, CARGADOR!'];
  for (const q of V) S.vnd.push({ x: q.x, y: GY[q.pos], ty: GY[q.pos], aside: q.lane * 2, spr: rnd() < .5 ? AGUA : SPV, say: pick(says), sayT: 0, st: 0, ph: rnd() * 6 });
}
function crash(S, why, veh) {
  const m = S.m; if (m.crashed || S.arrived) return;
  if (m.casco && ['choque','hueco','pirueta','vendedor'].includes(why)) { m.casco = false; m.inv = 1.6; S.shake = .4; fl(S, MX, m.y - 40, 'SE PARTIO EL CASCO!', '#f2f2f2'); sfx(S, 'bump'); if (veh) veh.ghosted = true; return; }
  m.crashed = true; m.why = why; m.wheelie = false; m.air = false; m.h = 0; S.crashAt = S.t;
  S.end = ENDS[why === 'choque' && veh && (veh.kind === 'bus' || veh.kind === 'gandola') ? veh.kind : why];
  if (why !== 'preso' && why !== 'tarde') { S.rider = { x: m.x, y: m.y - 12, vx: m.v + (why === 'espaldas' ? -70 : why === 'guaire' ? -10 : 45), vy: why === 'guaire' ? -40 : -80, rot: 0 }; S.shake = .6; sfx(S, why === 'guaire' ? 'splash' : 'crash'); }
  else { S.rider = null; sfx(S, 'cop'); }
  if (!S.ai) stopEngine();
}
function launch(S, v) {
  const m = S.m; v.used = true; m.air = true; m.airT = 0; m.vh = 110; m.h = 0; m.rot = 0; m.wheelie = false; m.v += 15;
  fl(S, MX, m.y - 42, 'A VOLAR!', '#f2f2f2'); sfx(S, 'jump');
  if (S.cop) S.cop.lost = true;
}
function honk(S) {
  const m = S.m; if (m.honkCd > 0 || m.crashed) return;
  m.honkCd = .5; S.honk = .9; sfx(S, 'honk'); S.siren = MN(1, S.siren + .02);
  const p = nearestPos(m.y);
  const v = S.veh.filter(o => occ(o).includes(p) && o.x > m.x && o.x - m.x < 110 && !o.cola).sort((a, b) => a.x - b.x)[0];
  if (v) {
    v.bubble = pick(INSULTS); v.bubbleT = 1.3;
    if (!v.wide && rnd() < .6) {
      const opts = [v.lane - 1, v.lane + 1].filter(l => l >= 0 && l <= 2 && !S.veh.some(o => o !== v && occ(o).some(q => AB(q - l * 2) < 1) && o.x < v.x + v.L + 20 && o.x + o.L > v.x - 20) && !(AB(nearestPos(m.y) - l * 2) < 1 && AB(m.x - v.x) < 70));
      if (opts.length) v.lane = pick(opts);
    }
  }
  for (const q of S.vnd) if (q.x > m.x && q.x - m.x < 90 && nearestPos(q.y) === p && !q.st) q.st = S.t;
}
function aiCtl(S) {
  const m = S.m; m.brake = false; m.acc = 0;
  const cp = nearestPos(m.y);
  const hz = S.haz.find(h => h.kind === 'hueco' && h.pos === cp && h.x + h.w > m.x - 12 && h.x - (m.x + 10) < 44);
  m.wheelie = !!hz || (m.wheelie && m.bal < .5 && rnd() < .995) || (!m.wheelie && rnd() < .002);
  if (m.bal > .8 && !hz) m.wheelie = false;
  if (AB(m.y - GY[m.tpos]) > .8) return;
  if (m.air || m.inv > 0) return;
  if (cp === 5) { if (!sideBlocked(S, 4)) m.tpos = 4; return; }
  const rb = S.riv.find(q => !q.bumped && AB(q.y - m.y) < 6 && q.x < m.x && m.x - q.x < 80);
  if (rb) { for (const n of [cp - 1, cp + 1]) { if (n < 0 || n > 4 || sideBlocked(S, n) || aheadDist(S, n) < 40) continue; m.tpos = n; return; } }
  const dc = aheadDist(S, cp); let best = cp, bd = dc;
  for (const dir of [-1, 1]) {
    const n = cp + dir; if (n < 0 || n > 4 || sideBlocked(S, n) || aheadDist(S, n) < 18) continue;
    let dn = aheadDist(S, n); if (n % 2) dn += 12;
    const n2 = n + dir; if (dn > 14 && n2 >= 0 && n2 <= 4) dn = MXX(dn, aheadDist(S, n2) - 10);
    if (dn > bd + 14) { bd = dn; best = n; }
  }
  if (dc < 100 && best !== cp) m.tpos = best;
  if (dc < 44 && m.tpos === cp) { m.brake = true; if (m.honkCd <= 0 && rnd() < .05) honk(S); }
  if (vendAhead(S, cp) < 60 && m.honkCd <= 0) honk(S);
}
function playerCtl(S, dt) {
  const m = S.m; m.moveCd -= dt;
  if (AB(m.y - GY[m.tpos]) < 4) {
    if ((I.pU() || (I.U() && m.moveCd <= 0)) && m.tpos > 0) { m.tpos--; m.moveCd = .2; }
    else if ((I.pD() || (I.D() && m.moveCd <= 0)) && m.tpos < 5) { m.tpos++; m.moveCd = .2; }
  }
  if (m.air) { if (I.L()) m.rot -= 7 * dt; if (I.R()) m.rot += 7 * dt; m.acc = 0; }
  else { m.wheelie = I.A(); m.acc = I.R() ? 1 : I.L() ? -1 : 0; }
  if (I.pB()) honk(S);
}
function director(S) {
  const m = S.m, ax = S.cam + 345, inCola = S.cola && !S.colaDone;
  if (m.x > TRIP - 450 || inCola) return;
  if (m.x > S.nx.evt) {
    S.nx.evt = m.x + (380 + rnd() * 380) / S.dens; const r = rnd();
    if (r < .4) { const ps = [0, 2, 4].filter(p => !S.veh.some(v => occ(v).includes(p) && v.x < ax + 30 && v.x + v.L > ax - 30)); if (ps.length) S.haz.push({ kind: 'hueco', pos: pick(ps), x: ax, w: 12 }); }
    else if (r < .7) { const v = spawnVeh(S, ax, FL(rnd() * 3), 'bus'); if (v) v.willStop = true; }
    else for (let i = 0; i < 3; i++) { const p = FL(rnd() * 5), x = ax + i * 40; if (!S.veh.some(v => occ(v).includes(p) && v.x < x + 20 && v.x + v.L > x - 20)) S.haz.push({ kind: 'bache', pos: p, x, w: 10 }); }
  }
  if (m.x > S.nx.pick) {
    S.nx.pick = m.x + 450 + rnd() * 450; const p = FL(rnd() * 5);
    if (!S.veh.some(v => occ(v).includes(p) && v.x < ax + 20 && v.x + v.L > ax - 20)) { const r = rnd(); S.pick.push({ kind: r < .3 ? 'empanada' : r < .48 ? 'guayoyo' : r < .63 ? 'casco' : r < .8 ? 'estampita' : 'anis', pos: p, x: ax }); }
  }
  if (m.x > S.nx.grua) { S.nx.grua = m.x + 1300 + rnd() * 900; for (const l of [1, 0, 2].sort(() => rnd() - .5)) if (spawnVeh(S, ax, l, 'grua')) break; }
  if (m.x > S.nx.riv) { S.nx.riv = m.x + (900 + rnd() * 800) / S.dens; spawnRival(S, MN(4, nearestPos(m.y))); }
  if (m.x > S.nx.cola) { S.nx.cola = m.x + 2300 + rnd() * 900; spawnCola(S); }
}

function simStep(S, dt) {
  S.t += dt; const m = S.m, t = S.t;
  for (const f of S.floats) f.t += dt; S.floats = S.floats.filter(f => f.t < 1.3);
  for (const b of S.banners) b.t += dt; S.banners = S.banners.filter(b => b.t < b.dur);
  if (S.shake > 0) S.shake -= dt;
  if (S.cd > 0) {
    S.cd -= dt; const n = Math.ceil(S.cd / .8);
    if (S.cd <= 0) { banner(S, 'ARRANCA!', '#e6ff00', 1.2); sfx(S, 'go'); }
    else if (n !== S.lastN && S.t > .8) { S.lastN = n; banner(S, String(n), '#f2f2f2', .7); sfx(S, 'blip'); }
    return;
  }
  if (!m.crashed && !S.arrived) { S.time = MXX(0, S.time - dt); if (S.time <= 0) crash(S, 'tarde'); }
  director(S);
  const inCola = S.cola && !S.colaDone;
  if (inCola && !S.colaB && m.x + 10 > S.cola.x0 - 60) { S.colaB = true; banner(S, 'COLA!', '#ff9a2a', 1.4); }
  if (inCola && m.x - 10 > S.cola.x1) { S.colaDone = true; for (const v of S.veh) if (v.cola) v.base = 35 + rnd() * 20; }
  S.spawnT -= dt;
  if (S.spawnT <= 0 && !(S.cola && !S.colaDone)) {
    S.spawnT = (.55 + rnd() * .5) / S.dens;
    if (S.veh.filter(v => v.x > S.cam + 300).length < 1 + (S.dens > 1.3 ? 1 : 0)) spawnVeh(S, S.cam + 335 + rnd() * 50);
    if (rnd() < .06) { const p = FL(rnd() * 5), x = S.cam + 340; if (!S.veh.some(v => occ(v).includes(p) && v.x < x + 20 && v.x + v.L > x - 20)) S.haz.push({ kind: 'bache', pos: p, x, w: 10 }); }
  }
  S.veh.sort((a, b) => a.x - b.x);
  for (const v of S.veh) {
    if (v.willStop && !v.stopped && v.x - S.cam < 235 && v.x - S.cam > 110) { v.stopped = true; v.stop = 2.6; v.bubble = 'PARADA!'; v.bubbleT = 2.4; }
    if (v.stop > 0) v.stop -= dt;
    let tv = v.stop > 0 ? 0 : v.base;
    for (const o of S.veh) { if (o === v || o.x <= v.x || !occ(o).some(p => occ(v).includes(p))) continue; const gap = o.x - (v.x + v.L); if (gap < 18) tv = MN(tv, o.v * (gap < 8 ? .5 : 1)); }
    v.v += clamp(tv - v.v, -90 * dt, 40 * dt); v.x += v.v * dt;
    v.gy += clamp(GY[v.lane * 2] - v.gy, -40 * dt, 40 * dt);
    if (v.bubbleT > 0) v.bubbleT -= dt;
  }
  S.veh = S.veh.filter(v => v.x + v.L > S.cam - 120); S.haz = S.haz.filter(h => h.x > S.cam - 60); S.pick = S.pick.filter(p => p.x > S.cam - 60); S.vnd = S.vnd.filter(q => q.x > S.cam - 60);
  if (inCola && rnd() < .02) { const cv = S.veh.filter(v => v.cola && v.x - S.cam > 20 && v.x - S.cam < 300); if (cv.length) { const v = pick(cv); if (v.bubbleT <= 0) { v.bubble = pick(['PIIII!','MUEVETE!','#@%!']); v.bubbleT = 1.2; } } }
  m.honkCd -= dt; if (S.honk > 0) S.honk -= dt;
  if (!m.crashed && !S.arrived) { if (S.ai) aiCtl(S); else playerCtl(S, dt); }
  if (m.turbo > 0 && !m.crashed && !m.air) { m.drunkT -= dt; if (m.drunkT <= 0) { m.drunkT = .7 + rnd() * .5; const n = m.tpos + (rnd() < .5 ? -1 : 1); if (n >= 0 && n <= 5 && AB(m.y - GY[m.tpos]) < 2) m.tpos = n; } }
  const top = 100 + m.R.st[0] * 8;
  let tv = S.ai ? top * .95 : (m.acc > 0 ? top : m.acc < 0 ? 40 : top * .8);
  tv += (m.turbo > 0 ? 55 : 0) + (m.wheelie ? 12 : 0);
  if (m.brake) { const v = nearestAhead(S, nearestPos(m.y)), d = aheadDist(S, nearestPos(m.y)); tv = v ? (d < 26 ? v.v * .4 : v.v) : 60; }
  if (inCola && m.x + 10 > S.cola.x0 - 30 && m.x < S.cola.x1) tv = MN(tv, 55);
  if (S.ai) { const vd = vendAhead(S, nearestPos(m.y)); if (vd < 60) tv = MN(tv, MXX(0, (vd - 8) * 1.6)); }
  if (S.arrived) tv = 60;
  if (m.crashed) m.v *= Math.exp(-(m.why === 'preso' ? 4 : 1.8) * dt); else m.v += clamp(tv - m.v, -260 * dt, 90 * dt);
  m.x += m.v * dt;
  const man = 70 + m.R.st[1] * 12;
  if (!m.crashed || m.why !== 'guaire') m.y += clamp(GY[m.tpos] - m.y, -man * dt, man * dt);
  const ep = nearestPos(m.y);
  if (!m.crashed) {
    S.dAcc += m.v * dt * (m.ri === 0 ? 1.5 : 1) / 10; while (S.dAcc >= 1) { S.dAcc--; S.score++; }
    if (!m.air) for (const v of S.veh) {
      if (v.x >= m.x + 10 || v.x + v.L <= m.x - 10) continue;
      /* El choque sigue al dibujo (v.gy): los anchos tapan el canalito de atras, nunca el de adelante. */
      const dy = m.y - v.gy, lo = v.wide ? -22 : -7.5;
      if (v.kind === 'grua' && !v.used && v.x > m.x - 4 && AB(dy) < 22) { launch(S, v); break; }
      if (dy <= lo || dy >= 7.5) { if (dy > lo - 16 && dy < 23.5) v.adj = true; continue; }
      if (m.inv > 0 || v.ghosted) { if (!v.ghosted) { v.ghosted = true; if (m.inv > 2) { fl(S, MX, m.y - 36, 'NADA TE TOCA!', '#e6ff00'); S.siren = MN(1, S.siren + .15); } v.bubble = '#@%!'; v.bubbleT = 1.4; } }
      else { crash(S, 'choque', v); break; }
    }
    for (const v of S.veh) if (!v.passed && v.x + v.L < m.x - 10) {
      v.passed = true;
      if (v.adj && !m.crashed) { S.combo++; S.lastRas = t; const pts = 50 * MN(S.combo, 8); S.score += pts; fl(S, MX, m.y - 38 - (S.fct++ % 2) * 7, 'RASANTE +' + pts, '#e6ff00'); sfx(S, 'ras'); S.siren = MN(1, S.siren + .03 * (m.ri === 4 ? .5 : 1)); if (rnd() < .55) { v.bubble = pick(INSULTS); v.bubbleT = 1.5; } }
    }
    if (!m.air && !m.crashed) for (const h of S.haz) {
      if (h.hit || h.pos !== ep || !(h.x < m.x + 10 && h.x + h.w > m.x - 10)) continue; h.hit = true;
      if (h.kind === 'hueco') { if (m.wheelie) { S.score += 200; fl(S, MX, m.y - 44, 'ALCANTARILLA! +200', '#e6ff00'); sfx(S, 'land'); } else crash(S, 'hueco'); }
      else { m.v *= .78; S.shake = .25; fl(S, MX, m.y - 30, 'BACHE!', '#f2f2f2'); sfx(S, 'bump'); }
    }
    for (const pk of S.pick) {
      if (pk.got || pk.pos !== ep || !(pk.x - 4 < m.x + 10 && pk.x + 5 > m.x - 10)) continue; pk.got = true; sfx(S, 'pick');
      if (pk.kind === 'estampita') { m.inv = 5.5; banner(S, 'ESTAMPITA!', '#e6ff00', 1.5); fl(S, MX, m.y - 40, 'JOSE GREGORIO TE CUIDA', '#e6ff00'); }
      else if (pk.kind === 'anis') { m.turbo = 4; m.drunkT = .6; banner(S, 'ANIS!', '#f2f2f2', 1.4); fl(S, MX, m.y - 40, 'TURBO... PERO CURDO', '#f2c56b'); }
      else if (pk.kind === 'guayoyo') { S.time += 5; banner(S, 'GUAYOYO!', '#f2c56b', 1.2); fl(S, MX, m.y - 40, '+5 SEG', '#3fd0e0'); }
      else if (pk.kind === 'casco') { m.casco = true; fl(S, MX, m.y - 40, 'CASCO! AGUANTA UN CHOQUE', '#f2f2f2'); }
      else { S.score += 300; fl(S, MX, m.y - 40, 'EMPANADA +300', '#f2c56b'); }
    }
  }
  if (S.combo && t - S.lastRas > 3) S.combo = 0;
  for (const q of S.vnd) {
    q.ph += dt; if (q.sayT > 0) q.sayT -= dt; const dd = q.x - (m.x + 10);
    if (!q.greet && dd < 150) { q.greet = 1; q.sayT = 1.8; }
    if (!q.st && dd < 34 && dd > -10 && m.v < 12) q.st = t;
    if (q.st && t - q.st > .55 && q.ty !== GY[q.aside]) { q.ty = GY[q.aside]; q.say = 'YA VA, YA VA!'; q.sayT = 1.3; }
    q.y += clamp(q.ty - q.y, -28 * dt, 28 * dt);
    if (!m.crashed && !m.air && nearestPos(q.y) === ep && q.x - 6 < m.x + 10 && q.x + 6 > m.x - 10) crash(S, 'vendedor');
  }
  for (const q of S.riv) {
    const ahead = S.veh.find(v => occ(v).includes(q.tpos) && v.x > q.x && v.x - (q.x + 10) < 40);
    let qv = q.x < m.x ? m.v + 48 : 150;
    if (ahead && (q.x > m.x || q.bumped)) { const n = [q.tpos - 1, q.tpos + 1].find(n => n >= 0 && n <= 4 && !S.veh.some(v => occ(v).includes(n) && v.x < q.x + 50 && v.x + v.L > q.x - 12)); if (n != null) q.tpos = n; else qv = MN(qv, ahead.v); }
    q.v += clamp(qv - q.v, -200 * dt, 120 * dt); q.x += q.v * dt; q.y += clamp(GY[q.tpos] - q.y, -100 * dt, 100 * dt);
    if (q.honkT > 0) q.honkT -= dt;
    if (!q.bumped && q.x < m.x && m.x - q.x < 70 && AB(q.y - m.y) < 6 && q.honkT <= 0) { q.honkT = 1.3; q.say = 'PIPIIII!'; sfx(S, 'horn'); }
    if (!q.bumped && !m.crashed && !m.air && AB(q.y - m.y) < 6 && q.x + 12 > m.x - 10 && q.x < m.x) {
      q.bumped = true; q.say = '#@%!'; q.honkT = 1.2;
      if (m.inv <= 0) { m.tpos = m.tpos < 5 ? m.tpos + 1 : m.tpos - 1; S.shake = .4; fl(S, MX, m.y - 38, 'EPA!', '#f2f2f2'); sfx(S, 'bump'); }
    }
  }
  S.riv = S.riv.filter(q => q.x < S.cam + 380 && q.x > S.cam - 200);
  if (!m.crashed && !m.air && ep === 5) { S.edgeT += dt; if (S.edgeT > 1.1) crash(S, 'guaire'); } else S.edgeT = MXX(0, S.edgeT - dt);
  const rate = (.12 + (5 - m.R.st[2]) * .07) * (m.ri === 2 ? .6 : 1);
  if (!m.crashed && !m.air) {
    if (m.wheelie) { m.a += clamp(-.42 - m.a, -3 * dt, 3 * dt); m.bal += rate * dt; S.wAcc += dt; while (S.wAcc >= .1) { S.wAcc -= .1; S.score += 10; } S.siren = MN(1, S.siren + .1 * dt * (m.ri === 4 ? .5 : 1)); if (m.bal >= 1) crash(S, 'espaldas'); }
    else { m.a += clamp(-m.a, -3 * dt, 3 * dt); m.bal = MXX(0, m.bal - .5 * dt); }
  }
  if (m.air) {
    m.airT += dt; m.h += m.vh * dt; m.vh -= 115 * dt; m.a = m.rot;
    if (m.h <= 0 && m.vh < 0) {
      m.h = 0; m.air = false; const T = 2 * Math.PI, aa = ((m.rot % T) + T) % T, ok = aa < .45 || aa > T - .45, spins = RO(AB(m.rot) / T); m.a = 0;
      if (ok) {
        const pts = (300 + spins * 500) * (m.ri === 3 ? 2 : 1); S.score += pts; sfx(S, 'land');
        banner(S, spins ? (spins > 1 ? 'MORTAL X' + spins + '!' : 'PIRUETA 360!') : 'VOLADO!', '#e6ff00', 1.5); fl(S, MX, m.y - 40, '+' + pts, '#e6ff00');
        if (S.cop) { S.siren = 0; fl(S, MX, m.y - 50, 'LO PERDISTE!', '#5a9bff'); }
      } else crash(S, 'pirueta');
    }
  }
  if (m.crashed) {
    const gw = m.why === 'guaire', ta = m.why === 'espaldas' ? -1.9 : gw ? .9 : m.why === 'preso' || m.why === 'tarde' ? 0 : 1.3; m.a += clamp(ta - m.a, -5 * dt, 5 * dt);
    if (gw) { m.v *= Math.exp(-2 * dt); if (m.y < 226) m.y += 40 * dt; if (m.y > 204 && !S.splash) { S.splash = 1; for (let i = 0; i < 30; i++) S.parts.push({ x: m.x - 10 + rnd() * 20, y: 206, vx: -30 + rnd() * 60, vy: -40 - rnd() * 60, l: .7, c: pick(['#8a7e5a','#c9bf98','#f2f2f2']) }); } }
    const r = S.rider;
    if (r) { const rf = gw ? 214 : m.y - 3; r.x += r.vx * dt; r.vx *= Math.exp(-1.6 * dt); r.y += r.vy * dt; r.vy += 220 * dt; if (r.y > rf) { r.y = rf; r.vy *= gw ? 0 : -.35; if (AB(r.vy) < 15) r.vy = 0; } if (r.vy !== 0) r.rot += (m.why === 'espaldas' ? -9 : 9) * dt; }
    if (m.v > 20 && r && !gw && rnd() < .6) S.parts.push({ x: m.x - 8, y: m.y - 1, vx: -30 - rnd() * 40, vy: -20 - rnd() * 30, l: .4, c: pick(['#ffd23a','#ff9a2a','#fff']) });
    if (!S.endB && t > S.crashAt + .5) { S.endB = 1; banner(S, S.end[0], '#ff5a3a', 1.6); }
  }
  if (m.turbo > 0 && !m.crashed && rnd() < .5) S.parts.push({ x: m.x - 14, y: m.y - 4 - m.h, vx: -60, vy: 0, l: .25, c: pick(['#ff9a2a','#ffd23a']) });
  for (const q of S.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 120 * dt; q.l -= dt; } S.parts = S.parts.filter(q => q.l > 0);
  if (m.inv > 0) m.inv -= dt; if (m.turbo > 0) m.turbo -= dt;
  if (!S.cop && S.siren >= 1 && !m.crashed && !S.arrived) { S.cop = { x: m.x - 160, y: m.y, tpos: nearestPos(m.y), v: m.v + 40, lost: false, t: 0, catchT: 0, say: -9, bubbleT: 0 }; banner(S, 'EL FISCAL!', '#5a9bff', 1.6); }
  const c = S.cop;
  if (c) {
    c.t += dt;
    if (!c.lost && c.t > 15) { c.lost = true; S.siren = 0; fl(S, MX, m.y - 50, 'EL FISCAL SE CANSO', '#5a9bff'); }
    const mp = nearestPos(m.y);
    if (!c.lost && AB(c.y - GY[c.tpos]) < 1 && c.tpos !== mp) { const n = c.tpos + Math.sign(mp - c.tpos); if (!S.veh.some(v => occ(v).includes(n) && v.x < c.x + 14 && v.x + v.L > c.x - 14)) c.tpos = n; }
    c.y += clamp(GY[c.tpos] - c.y, -90 * dt, 90 * dt);
    let cv = c.lost ? 50 : c.x < m.x - 40 ? m.v + 40 : m.v + 4; if (c.x > m.x - 16) cv = MN(cv, m.v);
    const bl = S.veh.find(v => occ(v).includes(c.tpos) && v.x > c.x && v.x - (c.x + 10) < 26); if (bl) cv = MN(cv, bl.v);
    c.v += clamp(cv - c.v, -200 * dt, 120 * dt); c.x += c.v * dt;
    if (!c.lost && !m.crashed && !m.air && nearestPos(c.y) === mp && m.x - c.x < 30 && m.x - c.x > 0) { c.catchT += dt; if (c.catchT > 1.2) crash(S, 'preso'); } else c.catchT = MXX(0, c.catchT - dt);
    if (!c.lost && t - c.say > 2.6) { c.say = t; c.bubbleT = 1.4; }
    if (c.bubbleT > 0) c.bubbleT -= dt;
    if (!c.lost && !S.ai) { S.sirT -= dt; if (S.sirT <= 0) { S.sirT = .5; SFX.cop(); } }
    if (c.lost && c.x < S.cam - 60) S.cop = null;
  }
  for (const s of S.signs) if (!s.done && s.x < m.x && !m.crashed) {
    s.done = true;
    if (s.last) { S.arrived = t; m.inv = 99; const b = Math.ceil(S.time) * 50; S.score += b; banner(S, 'LLEGASTE A TIEMPO!', '#e6ff00', 3); fl(S, MX, m.y - 44, 'BONO DE TIEMPO +' + b, '#3fd0e0'); sfx(S, 'pick'); }
    else { S.time += 12; fl(S, MX, m.y - 48, s.text + ' +12 SEG', '#3fd0e0'); sfx(S, 'blip'); }
  }
  S.fish -= dt; if (S.fish < -1.2) S.fish = 5 + rnd() * 5;
  if (!S.ai && !m.crashed) {
    if (ENG) try { ENG.o.frequency.value = 45 + m.v * .5 + (m.wheelie ? 25 : 0); } catch (e) {}
    S.mt += dt;
    if (S.mt >= .14) { S.mt -= .14; const i = S.mi++ % 16; if (BASSN[i]) tone(mtof(BASSN[i]), .12, 'triangle', .06); if (LEADN[i] && S.mi % 64 >= 32) tone(mtof(LEADN[i] + 12), .09, 'square', .018); }
  }
  S.cam = m.x - MX;
}

/* ---------- dibujo ---------- */
function drawMotoAt(img, x, y, a, pivot, alpha) {
  X.save(); if (alpha != null) X.globalAlpha = clamp(alpha, 0, 1);
  if (pivot === 'c') { X.translate(RO(x), RO(y - 8)); X.rotate(a); X.drawImage(img, -12, -11); }
  else { X.translate(RO(x) - 6, RO(y)); X.rotate(a); X.drawImage(img, -6, -19); }
  X.restore();
}
function drawPickup(k, x, y) {
  x = RO(x); y = RO(y); F('#151515');
  if (k === 'estampita') { Q(x-5,y-13,11,14);F('#e6c200');Q(x-4,y-12,9,12);F('#f2e6c8');Q(x-3,y-11,7,10);F('#151515');Q(x-2,y-10,5,1);Q(x-1,y-11,3,1);F('#c68a5c');Q(x-1,y-9,3,2);F('#151515');Q(x-1,y-8,3,1);Q(x-2,y-6,5,5);F('#f2f2f2');Q(x,y-6,1,2); }
  else if (k === 'anis') { Q(x-3,y-13,7,14);F('#d8f0f0');Q(x-2,y-9,5,9);Q(x-1,y-12,3,3);F('#f2f2f2');Q(x-2,y-6,5,3);F('#c62828');Q(x-1,y-5,3,1);F('#8a4a24');Q(x-1,y-13,3,1); }
  else if (k === 'guayoyo') { Q(x-4,y-8,10,9);F('#f2f2f2');Q(x-3,y-7,6,7);Q(x+3,y-5,2,2);F('#8a4a24');Q(x-2,y-6,4,2); }
  else if (k === 'casco') { Q(x-5,y-9,11,10);F('#e03a33');Q(x-4,y-8,9,7);F('#1b2a5e');Q(x+1,y-6,4,3);F('#f2f2f2');Q(x-3,y-8,3,1); }
  else { Q(x-6,y-6,13,7);F('#c98a3a');Q(x-5,y-4,11,4);F('#f2c56b');Q(x-4,y-5,9,2);F('#8a5530');for(let i=-4;i<5;i+=2)Q(x+i,y-1,1,1); }
}
function drawBoards(S) {
  const c = S.cam, o = 20;
  for (const it of [[40,'efe'],[200,'peje'],[360,'nomi'],[640,'hielo']]) {
    const bx = RO(((it[0] - c * .5) % 900 + 900) % 900 - 110); if (bx < -110 || bx > 330) continue;
    if (it[1] === 'peje') {
      F('#d4c6a6');Q(bx+10,34+o,48,38);F('#bfb190');Q(bx+10,34+o,48,2);
      F('#8aa0b8');for(let yy=40+o;yy<68+o;yy+=9)for(let xx=bx+14;xx<bx+56;xx+=10)if(!(yy===40+o&&xx===bx+34))Q(xx,yy,6,6);
      F('#3a2a24');Q(bx+34,40+o,6,6);F('#8f5a36');Q(bx+35,41+o,4,4);F('#1a0f08');Q(bx+35,40+o,4,2);F('#f28aa0');Q(bx+33,45+o,8,2);
      if (bx > -40 && bx < 260) { bubble(clamp(bx + 37, 70, 250), 18 + o, 'MAMA, SE METIO OTRO PEJELAGARTO!'); F('#fff');Q(bx+36,29+o,2,9);F('#151515');Q(bx+35,29+o,1,9);Q(bx+38,29+o,1,9); }
      continue;
    }
    if (it[1] === 'hielo') { F('#e8d9b0');Q(bx,40+o,60,32);F('#c9b88c');Q(bx,40+o,60,2);F('#6b8aa8');Q(bx+44,48+o,10,10);F('#8a5530');Q(bx+45,60+o,8,12);txt('SE VENDE',bx+22,46+o,'#c62828',1,'c',null);txt('HIELO',bx+22,54+o,'#2f6fe0',2,'c',null); continue; }
    F('#5a6068');Q(bx+18,59+o,2,14);Q(bx+72,59+o,2,14);
    if (it[1] === 'efe') {
      F('#f2f2f2');Q(bx,31+o,96,28);F('#151515');Q(bx+1,32+o,94,26);F('#ffd200');Q(bx+4,35+o,20,20);F('#151515');
      ['.xx.','x..x','xxxx','x...','.xxx'].forEach((row, j) => { for (let i = 0; i < 4; i++) if (row[i] === 'x') Q(bx + 8 + i * 3, 37 + o + j * 3, 3, 3); });
      txt('EFECTEA',bx+28,35+o,'#f2f2f2',2,'l',null);txt('PAGA AHORA',bx+28,47+o,'#ffd200',1,'l',null);txt('Y LLEVA DESPUES',bx+28,53+o,'#ffd200',1,'l',null);
    } else { F('#f2f2f2');Q(bx,31+o,90,28);F('#22a34a');Q(bx+1,32+o,88,26);txt('ÑOMI RAID',bx+45,36+o,'#f2f2f2',2,'c',null);txt('PIDE TU MOTO',bx+45,50+o,'#e6ff00',1,'c',null); }
  }
}
function drawScenery(S) {
  const c = S.cam, m = S.m;
  F('#8fcaff');Q(0,12,W,30);F('#b4dcff');Q(0,42,W,24);F('#d2ecff');Q(0,66,W,26);
  F('#f4f9ff');for(let i=0;i<6;i++){const x=RO(((i*83-c*.04)%400+400)%400-40);Q(x,18+(i%3)*6,18,3);Q(x+4,16+(i%3)*6,10,2);}
  const pk = (m.x - (3 * TRIP / 5 - 800)) / 1000;
  if (pk > 0 && pk < 1) { const p0 = RO(340 - pk * 400), py = RO(20 + pk * 14); F('#f2f2f2');Q(p0,py,24,4);Q(p0+9,py-3,6,10);Q(p0+19,py-4,3,4);F('#2f6fe0');Q(p0+2,py+1,17,1); }
  for (let x = 0; x < W; x++) { const i = ((x + FL(c * .08)) % 640 + 640) % 640, h = S.av[i]; F('#4f8a5a');Q(x,84-h,1,h);F('#3f7a4a');Q(x,84-FL(h*.5),1,FL(h*.5)); }
  for (const q of S.ran) { const x = RO(((q[0] - c * .08) % 640 + 640) % 640); if (x < W) { F(q[2]); Q(x, 74 + q[1] % 8, 3, 2); } }
  const off = c * .3;
  for (const b of S.bld) { const x = RO(((b[0] - off) % 800 + 800) % 800); if (x > W) continue; F(b[3]); Q(x, 92 - b[2], b[1], b[2]); F('#8aa0b8'); for (let yy = 95 - b[2]; yy < 89; yy += 4) for (let xx = 2; xx < b[1] - 2; xx += 4) Q(x + xx, yy, 2, 2); }
  drawBoards(S);
  F('#b9b5aa');Q(0,92,W,8);F('#d6d2c6');Q(0,92,W,1);F('#8f8b80');for(let x=-((c%32+32)%32);x<W;x+=32)Q(RO(x),93,1,7);
  F('#3b3f46');Q(0,100,W,90);F('#4a4d52');Q(0,190,W,10);
  F('#454951');for(let i=0;i<44;i++){const x=RO(((i*53-c)%330+330)%330-5);Q(x,102+(i*37)%86,2,1);}
  F('#5a5d62');for(let i=0;i<24;i++){const x=RO(((i*41-c)%330+330)%330-5);Q(x,191+(i*5)%8,1,1);}
  F('#ffd23a');Q(0,101,W,1);F('#e8e8e8');Q(0,189,W,1);
  const d = ((c % 24) + 24) % 24; for (let x = -d; x < W; x += 24) { Q(RO(x), 130, 12, 1); Q(RO(x), 160, 12, 1); }
  F('#7a7466');Q(0,200,W,2);
  F('#6e6446');Q(0,202,W,12);F('#645a3c');Q(0,214,W,12);F('#5a5034');Q(0,226,W,14);
  F('#8a7e5a');for(let i=0;i<30;i++){const x=RO(((i*37-c*.9+S.t*6)%340+340)%340-10);Q(x,204+(i%6)*6,5,1);}
  for (let i = 0; i < 8; i++) { const x = RO(((i * 113 - c * .9 + S.t * 4) % 360 + 360) % 360 - 20), y = 207 + (i * 7) % 26, k = i % 4;
    if (k === 0) { F('#f2f2f2');Q(x,y,4,2); } else if (k === 1) { F('#3fbf4f');Q(x,y,3,3); } else if (k === 2) { F('#151515');Q(x,y,7,3);F('#6e6446');Q(x+2,y+1,3,1); } else { F('#8a5530');Q(x,y,8,1);Q(x+5,y-1,1,1); } }
  if (S.fish < 0) { const k = -S.fish / 1.2, fx = 250 - RO(k * 60), fy = RO(214 - SN(k * Math.PI) * 16); F('#2f7a3a');Q(fx,fy,12,3);Q(fx-4,fy+1,4,1);Q(fx+12,fy-1,2,2);Q(fx+12,fy+2,2,2);F('#e6ff00');Q(fx+2,fy,1,1); }
  if (S.edgeT > 0 && !m.crashed && FL(S.t * 8) % 2 === 0) { F('rgba(255,90,58,.4)'); Q(0, 200, W, 2); }
}
function drawRun(S, attract) {
  const m = S.m, c = S.cam;
  X.save();
  if (S.shake > 0) X.translate(RO((Math.random() - .5) * 3), RO((Math.random() - .5) * 2));
  if (m.turbo > 0 && !m.crashed) X.translate(RO(SN(S.t * 3.5) * 2), 0);
  drawScenery(S);
  for (const s of S.signs) { const sx = RO(s.x - c); if (sx < -100 || sx > 340) continue; F('#7d848e');Q(sx,54,2,46);Q(sx+86,54,2,46);F('#f2f2f2');Q(sx,40,88,15);F(s.last?'#1b4fa0':'#1f6f3a');Q(sx+1,41,86,13);txt(s.text,sx+44,45,'#f2f2f2',1,'c',null); }
  for (const h of S.haz) {
    const hx = RO(h.x - c), gy = GY[h.pos]; if (hx < -20 || hx > 330) continue;
    if (h.kind === 'hueco') { F('#2a2d33');Q(hx,gy-3,12,6);F('#0c0d10');Q(hx+1,gy-2,10,4);F('#6b3f22');Q(hx+6,gy-16,1,14);Q(hx+7,gy-12,2,1);F('#3fbf4f');Q(hx+4,gy-19,5,3);Q(hx+8,gy-14,3,2); }
    else { F('#2a2d33');Q(hx,gy-1,10,3);Q(hx+2,gy-2,5,1); }
  }
  const ents = [];
  for (const v of S.veh) ents.push({ y: v.gy, f: () => { const vx = RO(v.x - c), top = RO(v.gy - v.gb); if (vx > 340 || vx + v.L < -20) return; X.drawImage(v.img, vx, top); if (v.kind === 'gandola') txt('PLATANUS HACK', vx + 36, top + 10, '#151515', 1, 'c', null); if (v.kind === 'grua' && FL(S.t * 6) % 2) { F('#ff9a2a'); Q(vx + 62, top + 4, 3, 2); } } });
  for (const pk of S.pick) if (!pk.got) ents.push({ y: GY[pk.pos], f: () => drawPickup(pk.kind, pk.x - c, GY[pk.pos] - 4 - RO(SN(S.t * 5) * 1.5)) });
  for (const q of S.vnd) ents.push({ y: q.y, f: () => { const vx = q.x - c; if (vx < -20 || vx > 340) return; F('rgba(0,0,0,.3)'); Q(RO(vx) - 5, RO(q.y) - 1, 10, 2); dS(q.spr, vx, q.y - (FL(q.ph * 3) % 2)); } });
  for (const q of S.riv) ents.push({ y: q.y, f: () => { const qx = q.x - c; if (qx < -30 || qx > 340) return; F('rgba(0,0,0,.35)'); Q(RO(qx) - 10, RO(q.y) - 1, 22, 2); drawMotoAt(q.spr, qx, q.y, 0, 'r'); } });
  if (S.cop) ents.push({ y: S.cop.y, f: () => { const cx = S.cop.x - c; F('rgba(0,0,0,.35)'); Q(RO(cx) - 10, RO(S.cop.y) - 1, 22, 2); drawMotoAt(COP, cx, S.cop.y, 0, 'r'); F(FL(S.t * 8) % 2 ? '#e03a33' : '#2f6fe0'); Q(RO(cx) - 8, RO(S.cop.y) - 19, 3, 2); } });
  ents.push({ y: m.y, f: () => {
    const sx = m.x - c, yy = m.y - m.h + (m.turbo > 0 && !m.air && !m.crashed ? RO(SN(S.t * 9) * 2) : 0);
    F('rgba(0,0,0,.35)'); Q(RO(sx) - 10, RO(MN(m.y, 198)) - 1, 22, 2);
    if (m.crashed && S.rider) { drawMotoAt(m.R.empty, sx, m.y, m.a, 'r', m.why === 'guaire' ? 1 - (m.y - 202) / 20 : null); const r = S.rider; X.save(); X.translate(RO(r.x - c), RO(r.y)); X.rotate(r.rot); X.drawImage(m.R.rider, -5, -6); X.restore(); return; }
    if (m.inv > 0 && m.inv < 90 && FL(S.t * 10) % 2 === 0) { F('#e6ff00'); for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; Q(RO(sx + Math.cos(a) * 15), RO(yy - 9 + SN(a) * 12), 1, 1); } }
    drawMotoAt(m.R.img, sx, yy, m.a + (m.turbo > 0 && !m.air ? SN(S.t * 7) * .12 : 0), m.air ? 'c' : 'r', m.inv > 0 && m.inv < 90 ? .85 : null);
    if (m.casco && !m.crashed) { F('#e03a33'); Q(RO(sx) + 8, RO(yy) - 24, 3, 2); }
    if (!m.crashed && (m.wheelie || m.bal > .05)) { const bx = RO(sx) - 9, by = RO(yy) - 33; F('#151515'); Q(bx, by, 19, 4); F(m.bal < .5 ? '#3fbf4f' : m.bal < .8 ? '#ffd23a' : (FL(S.t * 8) % 2 ? '#e03a33' : '#7a1414')); Q(bx + 1, by + 1, RO(17 * clamp(m.bal, 0, 1)), 2); }
    if (S.edgeT > 0 && !m.crashed) { if (FL(S.t * 8) % 2 === 0) txt('!', sx, yy - 44, '#ff5a3a', 2, 'c'); F('#151515'); Q(RO(sx) - 9, RO(yy) - 28, 19, 3); F('#ff5a3a'); Q(RO(sx) - 8, RO(yy) - 27, RO(17 * clamp(S.edgeT / 1.1, 0, 1)), 1); }
    if (m.air && !S.ai) { const T = 2 * Math.PI, aa = ((m.rot % T) + T) % T, ok = aa < .45 || aa > T - .45; txt(ok ? 'DERECHO' : 'GIRA!', sx, yy - 40, ok ? '#3fbf4f' : '#ff9a2a', 1, 'c'); }
  } });
  ents.sort((a, b) => a.y - b.y); for (const e of ents) e.f();
  for (const q of S.parts) { F(q.c); Q(RO(q.x - c), RO(q.y), 1, 1); }
  if (m.turbo > 0 && !m.crashed) { F('rgba(255,255,255,.55)'); for (let i = 0; i < 8; i++) Q(FL(Math.random() * W), 102 + FL(Math.random() * 86), 18, 1); }
  for (const v of S.veh) if (v.bubble && v.bubbleT > 0) { const vx = v.x - c; if (vx > -20 && vx < 330) bubble(vx + v.L / 2, v.gy - v.gb - 12, v.bubble); }
  for (const q of S.riv) if (q.honkT > 0 && q.say) bubble(q.x - c, q.y - 32, q.say);
  for (const q of S.vnd) if (q.sayT > 0) { const vx = q.x - c; if (vx > -20 && vx < 340) bubble(vx, q.y - 32, q.say); }
  if (S.cop && S.cop.bubbleT > 0) bubble(S.cop.x - c, S.cop.y - 34, 'PARATE AHI!');
  if (S.honk > 0 && !m.crashed) bubble(m.x - c + 4, m.y - m.h - 46, 'PI PI!');
  for (const f of S.floats) { X.globalAlpha = f.t > 1 ? clamp(1 - (f.t - 1) / .3, 0, 1) : 1; txt(f.s, f.x, f.y - f.t * 14, f.col, 1, 'c'); X.globalAlpha = 1; }
  for (const b of S.banners) { const w = tw(b.s, 2) + 16, x0 = RO(160 - w / 2); F('rgba(0,0,0,.8)'); Q(x0, 104, w, 20); F(b.col); Q(x0, 104, w, 1); Q(x0, 123, w, 1); if (b.t > .45 || FL(b.t * 10) % 2 === 0) txt(b.s, 160, 109, b.col, 2, 'c'); }
  X.restore();
  F('#000'); Q(0, 0, W, 12);
  txt('TIEMPO', 4, 4, '#8e8e88', 1, 'l', null); txt(String(Math.ceil(S.time)).padStart(2, '0'), 31, 4, S.time < 10 && FL(S.t * 4) % 2 ? '#ff5a3a' : '#e6ff00', 1, 'l', null);
  txt('PUNTOS', 44, 4, '#8e8e88', 1, 'l', null); txt(String(S.score).padStart(6, '0'), 70, 4, '#f2f2f2', 1, 'l', null);
  if (S.combo >= 2) txt('X' + MN(S.combo, 8), 97, 4, '#ff9a2a', 1, 'l', null);
  F('#333'); Q(112, 6, 84, 1); for (let i = 0; i <= 5; i++) { F('#8e8e88'); Q(112 + RO(i / 5 * 83), 4, 1, 5); }
  F('#e6ff00'); Q(111 + RO(clamp(m.x / TRIP, 0, 1) * 83), 4, 3, 5);
  txt('SIRENA', 202, 4, '#8e8e88', 1, 'l', null);
  for (let i = 0; i < 8; i++) { const on = S.siren > i / 8 + .01; F(on ? ((i + (S.cop && !S.cop.lost ? FL(S.t * 8) : 0)) % 2 ? '#2f6fe0' : '#e03a33') : '#333'); Q(229 + i * 5, 4, 4, 5); }
  if (m.casco) drawPickup('casco', 276, 12);
  if (m.inv > 0 && m.inv < 90) { drawPickup('estampita', 290, 12); F('#e6ff00'); Q(297, 6, RO(20 * m.inv / 5.5), 2); }
  else if (m.turbo > 0) { drawPickup('anis', 290, 12); F('#f2c56b'); Q(297, 6, RO(20 * m.turbo / 4), 2); }
  else if (!attract) txt('DIA ' + S.day, 316, 4, '#8e8e88', 1, 'r', null);
}

/* ---------- pantallas ---------- */
const DEF_RANK = [['ÑOM',9000],['ANI',7000],['CAB',5000],['PEJ',3000],['GUA',1500]].map(a => ({ n: a[0], s: a[1] }));
let RANK = DEF_RANK.slice(), MODE = 'title', ATT = null, RUN = null, SEL = 0, MT = 0, NAME = null, NEWPOS = -1;
const LETTERS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
function getStorage() {
  if (window.platanusArcadeStorage) return window.platanusArcadeStorage;
  return {
    async get(key) { try { const raw = window.localStorage.getItem(key); return raw === null ? { found: false, value: null } : { found: true, value: JSON.parse(raw) }; } catch (e) { return { found: false, value: null }; } },
    async set(key, value) { try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} },
  };
}
function fixRank(list) {
  const v = (Array.isArray(list) ? list : []).filter(e => e && typeof e.n === 'string' && typeof e.s === 'number' && isFinite(e.s)).map(e => ({ n: e.n.slice(0, 3), s: MXX(0, FL(e.s)) }));
  const out = v.sort((a, b) => b.s - a.s).slice(0, 5);
  for (const d of DEF_RANK) if (out.length < 5 && !out.some(e => e.n === d.n && e.s === d.s)) out.push(d);
  return out.sort((a, b) => b.s - a.s);
}
function loadRank() { try { Promise.resolve(getStorage().get(SKEY)).then(r => { if (r && r.found) RANK = fixRank(r.value); }).catch(() => {}); } catch (e) {} }
function saveRank() { try { Promise.resolve(getStorage().set(SKEY, RANK)).catch(() => {}); } catch (e) {} }

function drawTitle() {
  F('rgba(12,7,20,.7)'); Q(0, 12, W, H - 12);
  txt('MOTO', 160, 22, '#e6ff00', 4, 'c'); txt('PIRUETAS', 160, 44, '#e6ff00', 4, 'c');
  txt('HORA PICO EN LA FAJARDO', 160, 70, '#f28aa0', 1, 'c');
  F('rgba(0,0,0,.7)'); Q(40, 84, 240, 108); F('#e6ff00'); Q(40, 84, 240, 1); Q(40, 191, 240, 1);
  if (FL(MT / 6) % 2 === 0) {
    txt('LOS MAS PIRUETEROS', 160, 92, '#e6ff00', 1, 'c', null);
    RANK.forEach((e, i) => { const y = 108 + i * 15; txt((i + 1) + '.', 92, y, '#8e8e88', 2, 'l', null); txt(e.n, 116, y, '#f2f2f2', 2, 'l', null); txt(String(e.s).padStart(6, '0'), 228, y, '#e6ff00', 2, 'r', null); });
  } else {
    txt('CONTROLES', 160, 92, '#e6ff00', 1, 'c', null);
    ['JOYSTICK ARRIBA / ABAJO: CARRIL', 'DERECHA: ACELERA   IZQUIERDA: FRENA', 'BOTON 1 (MANTENER): CABALLITO', 'BOTON 2: CORNETA', 'EN EL AIRE: IZQ / DER PARA GIRAR', 'CAE DERECHO O TE MATAS', 'OJO: EL GUAIRE, LOS HUECOS', 'Y LOS VENDEDORES DE LA COLA'].forEach((s, i) => txt(s, 160, 104 + i * 10, i > 5 ? '#f28aa0' : '#f2f2f2', 1, 'c', null));
  }
  if (FL(MT * 2.5) % 2 === 0) txt(pressTxt(), 160, 204, '#f2f2f2', 2, 'c');
  txt('PLATANUS HACK 26 CARACAS', 160, 228, '#8e8e88', 1, 'c', null);
}
function drawSelect() {
  F('#140c22'); Q(0, 0, W, H); F('#211833'); for (let y = 0; y < H; y += 6) Q(0, y, W, 1);
  txt('ELIGE TU MOTORIZADO', 160, 14, '#e6ff00', 2, 'c');
  RIDERS.forEach((r, i) => { const x = 12 + i * 60, y = 40, on = i === SEL; F(on ? '#e6ff00' : '#2b2140'); Q(x, y, 56, 54); F('#1b1230'); Q(x + 2, y + 2, 52, 50); X.drawImage(r.img, x + 2, y + 6 - (on ? FL(MT * 4) % 2 : 0), 52, 42); });
  const r = RIDERS[SEL]; txt(r.name, 160, 106, '#f2f2f2', 2, 'c');
  ['VELOCIDAD', 'MANEJO', 'EQUILIBRIO'].forEach((l, i) => { txt(l, 96, 126 + i * 10, '#8e8e88', 1, 'l', null); for (let k = 0; k < 5; k++) { F(k < r.st[i] ? '#e6ff00' : '#333'); Q(150 + k * 14, 126 + i * 10, 12, 6); } });
  txt(r.sp, 160, 164, '#f28aa0', 1, 'c', null);
  txt('< >  ELIGE', 110, 190, '#f2f2f2', 1, 'c', null); txt('BOTON 1: ARRANCA', 214, 190, '#e6ff00', 1, 'c', null);
  txt('LLEGA A LA OFICINA ANTES DE QUE SE ACABE EL TIEMPO', 160, 214, '#8e8e88', 1, 'c', null);
}
function drawOver(S) {
  if (MT < .01) return;
  F('rgba(12,7,20,.88)'); Q(0, 12, W, H - 12);
  txt(S.end[0], 160, 34, '#ff5a3a', 2, 'c'); txt(S.end[1], 160, 54, '#f28aa0', 1, 'c', null);
  const row = (l, v, y, col) => { txt(l, 90, y, '#8e8e88', 1, 'l', null); txt(v, 230, y, col, 1, 'r', null); };
  row('PUNTOS', String(S.score).padStart(6, '0'), 80, '#e6ff00'); row('RECORRIDO', RO(clamp(S.m.x / TRIP, 0, 1) * 100) + '%', 92, '#f2f2f2'); row('DIA', String(S.day), 104, '#f2f2f2'); row('RECORD', String(RANK[0].s).padStart(6, '0'), 116, '#f2f2f2');
  X.drawImage(S.m.R.img, 134, 132, 52, 42);
  if (MT > 1 && FL(MT * 2.5) % 2 === 0) txt(pressTxt(), 160, 196, '#e6ff00', 2, 'c');
}
function drawName() {
  F('rgba(12,7,20,.92)'); Q(0, 12, W, H - 12);
  txt('NUEVO RECORD!', 160, 36, '#e6ff00', 3, 'c'); txt(String(RUN.score).padStart(6, '0'), 160, 66, '#f2f2f2', 2, 'c');
  txt('ESCRIBE TUS INICIALES', 160, 90, '#f28aa0', 1, 'c', null);
  for (let i = 0; i < 3; i++) { const x = 118 + i * 34, on = i === NAME.i; F(on ? '#e6ff00' : '#2b2140'); Q(x - 2, 104, 26, 34); F('#1b1230'); Q(x, 106, 22, 30); txt(LETTERS[NAME.l[i]], x + 11, 111, on ? '#e6ff00' : '#f2f2f2', 4, 'c', null); }
  txt('ARRIBA / ABAJO: LETRA', 160, 156, '#f2f2f2', 1, 'c', null); txt('BOTON 1: SIGUIENTE', 160, 168, '#e6ff00', 1, 'c', null);
}
function drawRank() {
  F('rgba(12,7,20,.92)'); Q(0, 12, W, H - 12);
  txt('LOS MAS PIRUETEROS', 160, 30, '#e6ff00', 2, 'c');
  RANK.forEach((e, i) => { const y = 64 + i * 22, c = i === NEWPOS && FL(MT * 4) % 2 ? '#ff9a2a' : '#f2f2f2'; txt((i + 1) + '.', 84, y, '#8e8e88', 3, 'l', null); txt(e.n, 116, y, c, 3, 'l', null); txt(String(e.s).padStart(6, '0'), 244, y, '#e6ff00', 3, 'r', null); });
}

function tick(dt) {
  MT += dt;
  if (MODE === 'title') {
    if (!ATT || (ATT.crashAt != null && ATT.t > ATT.crashAt + 2.5) || (ATT.arrived && ATT.t > ATT.arrived + 3) || ATT.t > 90) ATT = newRun(FL(Math.random() * 5), true, 1, 0);
    simStep(ATT, dt);
    if (I.pS() || I.pA()) { MODE = 'select'; MT = 0; unlockAudio(); SFX.pick(); }
  } else if (MODE === 'select') {
    if (I.pL()) { SEL = (SEL + 4) % 5; SFX.blip(); }
    if (I.pR()) { SEL = (SEL + 1) % 5; SFX.blip(); }
    if ((I.pA() || I.pS()) && MT > .2) { RUN = newRun(SEL, false, 1, 0); MODE = 'play'; MT = 0; startEngine(); }
  } else if (MODE === 'play') {
    simStep(RUN, dt);
    if (RUN.arrived && RUN.t > RUN.arrived + 3.2) { RUN = newRun(RUN.m.ri, false, RUN.day + 1, RUN.score); startEngine(); }
    else if (RUN.crashAt != null && RUN.t > RUN.crashAt + 2.2) { MODE = 'over'; MT = 0; }
  } else if (MODE === 'over') {
    simStep(RUN, dt);
    if (MT > 1 && (I.pS() || I.pA())) {
      if (RUN.score > RANK[4].s) { NAME = { l: [0, 0, 0], i: 0 }; MODE = 'name'; } else { NEWPOS = -1; MODE = 'rank'; }
      MT = 0; SFX.blip();
    }
  } else if (MODE === 'name') {
    const L = LETTERS.length;
    if (I.pU()) { NAME.l[NAME.i] = (NAME.l[NAME.i] + L - 1) % L; SFX.blip(); }
    if (I.pD()) { NAME.l[NAME.i] = (NAME.l[NAME.i] + 1) % L; SFX.blip(); }
    if (I.pL() && NAME.i > 0) NAME.i--;
    if ((I.pA() || I.pR() || I.pS()) && MT > .2) {
      if (NAME.i < 2) { NAME.i++; SFX.blip(); }
      else { const n = NAME.l.map(k => LETTERS[k]).join(''), e = { n, s: RUN.score }; RANK = fixRank(RANK.concat([e])); NEWPOS = RANK.indexOf(RANK.find(r => r.n === n && r.s === RUN.score)); saveRank(); MODE = 'rank'; MT = 0; SFX.pick(); }
    }
  } else if (MODE === 'rank') {
    /* La demo del titulo se crea ya: render() la dibuja en este mismo cuadro y con null el juego se congelaba. */
    if (MT > 7 || ((I.pS() || I.pA()) && MT > .6)) { MODE = 'title'; MT = 0; ATT = newRun(FL(Math.random() * 5), true, 1, 0); }
  }
}
function render() {
  X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; F('#000'); Q(0, 0, W, H);
  if (MODE === 'title') { drawRun(ATT, true); drawTitle(); }
  else if (MODE === 'select') drawSelect();
  else { drawRun(RUN, false); if (MODE === 'over') drawOver(RUN); else if (MODE === 'name') drawName(); else if (MODE === 'rank') drawRank(); }
}

/* ---------- Phaser ---------- */
let TEX = null, ACC = 0;
function create() {
  SCN = this;
  TEX = this.textures.createCanvas('scr', W, H);
  X = TEX.getContext(); X.imageSmoothingEnabled = false;
  this.add.image(0, 0, 'scr').setOrigin(0, 0).setScale(GAME_WIDTH / W);
  loadRank();
  ATT = newRun(0, true, 1, 0);
  if (!TUI && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) TUI = touchUI();
}
function syncTUI() { if (TUI) TUI.show(MODE !== 'play'); }
function update(time, delta) {
  ACC += MN(.1, (delta || 16) / 1000);
  let n = 0;
  while (ACC >= STEP && n < 6) { tick(STEP); ACC -= STEP; n++; for (const k in pressed) pressed[k] = false; }
  render();
  syncTUI();
  TEX.refresh();
}
new Phaser.Game({
  type: Phaser.AUTO, width: GAME_WIDTH, height: GAME_HEIGHT, parent: 'game-root', backgroundColor: '#000000', pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: GAME_WIDTH, height: GAME_HEIGHT },
  scene: { create, update },
});
