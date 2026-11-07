// Crystalogic — motor puro (sin DOM): se usa en la página, en las pruebas con Node y en el generador de niveles.
//
// Un NIVEL es:
//   n   nodos [[col,fila],…] sobre una cuadrícula de 6×5 (el índice + 1 es el número del lugar)
//   e   caminos [[a,b,color,sentido]]  color 'r' correr · 'g' deslizar · 'b' saltar · sentido 0 = ida y vuelta, 1 = solo de a a b
//   l   caminos de bucle [[nodo,color]] (te devuelven al mismo lugar)
//   c   cristales [[nodo,cantidad]]   t  trolls [[nodo,'o'|'p']]   s  salida   p  portal
//   sc  pergamino (el programa): huecos { k:'a'|'c', x:0..2, y, n, no }  (a = acción → n siguiente; c = condición → n si, no si no; -1 = fin)
//   f   fichas de acción [rojas, verdes, azules]   k  fichas condicionales (número ≥0 = «llevo exactamente N cristales», -1 = troll naranja, -2 = troll morado)
//   sol solución conocida (una ficha por hueco)   par  pasos de la mejor solución
import { mulberry32 } from '../../core/semilla.js';

export const COLS = ['r', 'g', 'b'];
export const CIDX = { r: 0, g: 1, b: 2 };
export const NOMBRE_COL = { r: 'Correr', g: 'Deslizar', b: 'Saltar' };
export const GC = 6, GR = 5, MAX_NODOS = 14, MAX_HUECOS = 16, TOPE = 400, MAX_CRIS = 9;
export const TRAMOS = [
  { id: 'p', nombre: 'Principiante', icono: '🌱' }, { id: 'i', nombre: 'Iniciado', icono: '🌿' }, { id: 'n', nombre: 'Normal', icono: '🔷' },
  { id: 'a', nombre: 'Avanzado', icono: '🔶' }, { id: 'e', nombre: 'Experto', icono: '💎' },
];

/* ---------- tablas del nivel ---------- */
const cache = new WeakMap();
export function info(L) {
  let I = cache.get(L); if (I) return I;
  const m = L.n.map(() => [-1, -1, -1]); let ok = true;
  for (const [a, b, c, d] of L.e) { const ci = CIDX[c]; if (m[a][ci] >= 0) ok = false; m[a][ci] = b; if (!d) { if (m[b][ci] >= 0) ok = false; m[b][ci] = a; } }
  for (const [nn, c] of (L.l || [])) { const ci = CIDX[c]; if (m[nn][ci] >= 0) ok = false; m[nn][ci] = nn; }
  const cr = L.n.map(() => 0); for (const [nn, q] of (L.c || [])) cr[nn] += q;
  const tr = L.n.map(() => 0); for (const [nn, q] of (L.t || [])) tr[nn] = q === 'o' ? 1 : 2;
  I = { m, ok, cr, tr, total: cr.reduce((s, x) => s + x, 0) }; cache.set(L, I); return I;
}
export const olvidar = L => { cache.delete(L); };   // el editor modifica el nivel en sitio: hay que descartar las tablas guardadas
export const totalCristales = L => info(L).total;
export const huecosA = L => L.sc.map((s, i) => s.k === 'a' ? i : -1).filter(i => i >= 0);
export const huecosC = L => L.sc.map((s, i) => s.k === 'c' ? i : -1).filter(i => i >= 0);
export const tokTexto = t => t >= 0 ? `=${t}` : t === -1 ? 'Troll naranja' : 'Troll morado';

/* ---------- validación ---------- */
const ent = (x, a, b) => Number.isInteger(x) && x >= a && x <= b;
export function validar(L) {
  try {
    if (!L || typeof L !== 'object') return null;
    const { n, e, sc } = L; if (!Array.isArray(n) || !Array.isArray(e) || !Array.isArray(sc)) return null;
    if (n.length < 2 || n.length > MAX_NODOS || sc.length < 1 || sc.length > MAX_HUECOS) return null;
    const pos = new Set();
    for (const q of n) { if (!Array.isArray(q) || !ent(q[0], 0, GC - 1) || !ent(q[1], 0, GR - 1)) return null; const k = q[0] + q[1] * GC; if (pos.has(k)) return null; pos.add(k); }
    const par = new Set();
    for (const q of e) {
      if (!Array.isArray(q) || !ent(q[0], 0, n.length - 1) || !ent(q[1], 0, n.length - 1) || q[0] === q[1] || !COLS.includes(q[2]) || (q[3] !== 0 && q[3] !== 1)) return null;
      const k = Math.min(q[0], q[1]) + ',' + Math.max(q[0], q[1]); if (par.has(k)) return null; par.add(k);
    }
    const l = (L.l || []).map(q => { if (!Array.isArray(q) || !ent(q[0], 0, n.length - 1) || !COLS.includes(q[1])) throw 0; return [q[0], q[1]]; });
    const c = (L.c || []).map(q => { if (!Array.isArray(q) || !ent(q[0], 0, n.length - 1) || !ent(q[1], 1, MAX_CRIS)) throw 0; return [q[0], q[1]]; });
    const t = (L.t || []).map(q => { if (!Array.isArray(q) || !ent(q[0], 0, n.length - 1) || (q[1] !== 'o' && q[1] !== 'p')) throw 0; return [q[0], q[1]]; });
    if (!ent(L.s, 0, n.length - 1) || !ent(L.p, 0, n.length - 1)) return null;
    const S = sc.map(s => {
      if (!s || (s.k !== 'a' && s.k !== 'c') || !ent(s.x, 0, 2) || !ent(s.y, 0, 15) || !ent(s.n, -1, sc.length - 1)) throw 0;
      if (s.k === 'c') { if (!ent(s.no, -1, sc.length - 1)) throw 0; return { k: 'c', x: s.x, y: s.y, n: s.n, no: s.no }; }
      return { k: 'a', x: s.x, y: s.y, n: s.n };
    });
    const nA = S.filter(s => s.k === 'a').length, nC = S.length - nA;
    if (!Array.isArray(L.f) || L.f.length !== 3 || !L.f.every(x => ent(x, 0, MAX_HUECOS)) || L.f[0] + L.f[1] + L.f[2] !== nA) return null;
    if (!Array.isArray(L.k) || L.k.length !== nC || !L.k.every(x => ent(x, -2, MAX_CRIS))) return null;
    const R = { n: n.map(q => [q[0], q[1]]), e: e.map(q => [q[0], q[1], q[2], q[3]]), l, c, t, s: L.s, p: L.p, sc: S, f: [...L.f], k: [...L.k] };
    if (typeof L.nombre === 'string') R.nombre = L.nombre.slice(0, 40);
    if (Array.isArray(L.sol) && L.sol.length === S.length) R.sol = L.sol.map(x => (Number.isInteger(x) ? x : null));
    if (ent(L.par, 0, 999)) R.par = L.par;
    if (Array.isArray(L.bl) && L.bl.every(b => Array.isArray(b) && ['s', 'i', 'l'].includes(b[0]) && b.slice(1).every(x => ent(x, 0, 16))) && JSON.stringify(plantilla(L.bl)) === JSON.stringify(S)) R.bl = L.bl.map(b => b.slice());
    if (!info(R).ok) return null;
    return R;
  } catch { return null; }
}

/* ---------- ejecución ---------- */
export function iniciar(L, A) {
  const I = info(L);
  return { L, A, I, nodo: L.s, cr: I.cr.slice(), rec: 0, pc: 0, pasos: 0, ticks: 0, fin: false, res: null };
}
function terminar(S, ok, err, extra) { S.fin = true; S.res = { ok, err: err || null, pasos: S.pasos, rec: S.rec, nodo: S.nodo, ...(extra || {}) }; return S.res; }
function final(S) {
  if (S.nodo !== S.L.p) return terminar(S, false, 'noportal');
  if (S.rec < S.I.total) return terminar(S, false, 'faltan', { faltan: S.I.total - S.rec });
  return terminar(S, true);
}
// Ejecuta UN hueco. Devuelve un evento: { t:'mov', slot, desde, hasta, col, cris } | { t:'cond', slot, si } | { t:'fin', res } | { t:'error', res }
export function paso(S) {
  if (S.fin) return { t: 'fin', res: S.res };
  const s = S.L.sc[S.pc], v = S.A[S.pc];
  if (++S.ticks > TOPE) return { t: 'error', res: terminar(S, false, 'bucle', { slot: S.pc }) };
  if (v == null) return { t: 'error', res: terminar(S, false, 'hueco', { slot: S.pc }) };
  if (s.k === 'a') {
    const to = S.I.m[S.nodo][v];
    if (to < 0) return { t: 'error', res: terminar(S, false, 'camino', { slot: S.pc, col: COLS[v], desde: S.nodo }) };
    const ev = { t: 'mov', slot: S.pc, desde: S.nodo, hasta: to, col: COLS[v], cris: false };
    S.nodo = to; S.pasos++;
    if (S.cr[to] > 0) { S.cr[to]--; S.rec++; ev.cris = true; }
    S.pc = s.n; if (S.pc < 0) { ev.fin = final(S); }
    return ev;
  }
  const si = v >= 0 ? S.rec === v : S.I.tr[S.nodo] === (v === -1 ? 1 : 2);
  const ev = { t: 'cond', slot: S.pc, si };
  S.pc = si ? s.n : s.no; if (S.pc < 0) ev.fin = final(S);
  return ev;
}
export function correr(L, A) { const S = iniciar(L, A); while (!S.fin) paso(S); return S.res; }

/* ---------- solucionador (fuerza bruta sobre las fichas disponibles) ---------- */
function permsMulti(cont, len, out, cur) {
  if (cur.length === len) { out.push(cur.slice()); return; }
  for (let c = 0; c < cont.length; c++) if (cont[c] > 0) { cont[c]--; cur.push(c); permsMulti(cont, len, out, cur); cur.pop(); cont[c]++; }
}
function permsTok(lista) {
  const out = [], usado = new Array(lista.length).fill(false), cur = [];
  (function rec() {
    if (cur.length === lista.length) { out.push(cur.slice()); return; }
    const vistos = new Set();
    for (let i = 0; i < lista.length; i++) if (!usado[i] && !vistos.has(lista[i])) { vistos.add(lista[i]); usado[i] = true; cur.push(lista[i]); rec(); cur.pop(); usado[i] = false; }
  })();
  return out;
}
export function resolver(L, { max = 400000, guardar = 40 } = {}) {
  const ia = huecosA(L), ic = huecosC(L), A = new Array(L.sc.length).fill(null);
  const cp = []; permsMulti([...L.f], ia.length, cp, []);
  const tp = permsTok(L.k);
  const out = { n: 0, sols: [], min: Infinity, mejor: null, probadas: 0, completo: true };
  for (const cc of cp) {
    for (let j = 0; j < ia.length; j++) A[ia[j]] = cc[j];
    for (const tt of tp) {
      if (out.probadas >= max) { out.completo = false; return out; }
      for (let j = 0; j < ic.length; j++) A[ic[j]] = tt[j];
      out.probadas++;
      const r = correr(L, A);
      if (r.ok) { out.n++; if (out.sols.length < guardar) out.sols.push(A.slice()); if (r.pasos < out.min) { out.min = r.pasos; out.mejor = A.slice(); } }
    }
  }
  return out;
}
export const espacio = L => {
  const ia = huecosA(L).length, f = L.f.reduce((p, x) => p * fact(x), 1); let s = fact(ia) / f;
  const cnt = new Map(); L.k.forEach(x => cnt.set(x, (cnt.get(x) || 0) + 1)); let d = 1; cnt.forEach(q => { d *= fact(q); });
  return s * fact(L.k.length) / d;
};
const fact = n => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };

/* ---------- pergamino: construcción por bloques ---------- */
// bloques: ['s', m] m acciones en fila · ['i', a, b] condición con rama «sí» de a acciones y rama «no» de b · ['l', m] bucle: m acciones y una condición que, si es «no», vuelve a empezar
export function plantilla(bloques) {
  const sc = []; let pend = [], fila = 0;
  const poner = s => { const i = sc.push(s) - 1; for (const p of pend) sc[p.i][p.f] = i; pend = []; return i; };
  for (const b of bloques) {
    if (b[0] === 's') { for (let j = 0; j < b[1]; j++) { const i = poner({ k: 'a', x: 1, y: fila++, n: -1 }); pend = [{ i, f: 'n' }]; } }
    else if (b[0] === 'i') {
      const [, a, c] = b, ci = poner({ k: 'c', x: 1, y: fila++, n: -1, no: -1 }), f0 = fila, nuevos = [];
      let prev = -1;
      for (let j = 0; j < a; j++) { const i = sc.push({ k: 'a', x: 0, y: f0 + j, n: -1 }) - 1; if (j === 0) sc[ci].n = i; else sc[prev].n = i; prev = i; }
      nuevos.push(a > 0 ? { i: prev, f: 'n' } : { i: ci, f: 'n' });
      prev = -1;
      for (let j = 0; j < c; j++) { const i = sc.push({ k: 'a', x: 2, y: f0 + j, n: -1 }) - 1; if (j === 0) sc[ci].no = i; else sc[prev].n = i; prev = i; }
      nuevos.push(c > 0 ? { i: prev, f: 'n' } : { i: ci, f: 'no' });
      fila = f0 + Math.max(a, c, 1); pend = nuevos;
    } else if (b[0] === 'l') {
      let ini = -1;
      for (let j = 0; j < b[1]; j++) { const i = poner({ k: 'a', x: 1, y: fila++, n: -1 }); if (j === 0) ini = i; pend = [{ i, f: 'n' }]; }
      const ci = poner({ k: 'c', x: 1, y: fila++, n: -1, no: ini }); pend = [{ i: ci, f: 'n' }];
    }
  }
  return sc;
}

/* ---------- generador de niveles ---------- */
// Cada tramo fija el tamaño del mapa, la forma del pergamino y los extras (un sentido, bucles, trolls, cristales dobles).
export const CFG = {
  p: { nodos: [4, 6], cris: [1, 2], uno: 0, bucle: 0, multi: 0, trolls: 0, huecos: [3, 5], plan: r => [['s', 3 + (r() * 3 | 0)]] },
  i: { nodos: [5, 8], cris: [2, 3], uno: .35, bucle: .4, multi: 0, trolls: 0, huecos: [5, 7], plan: r => [['s', 5 + (r() * 3 | 0)]] },
  n: { nodos: [6, 9], cris: [2, 4], uno: .3, bucle: .3, multi: .1, trolls: 1, huecos: [6, 8], plan: r => [['s', 1 + (r() * 2 | 0)], ['i', 1 + (r() * 2 | 0), 1 + (r() * 2 | 0)], ['s', r() * 3 | 0]] },
  a: { nodos: [7, 10], cris: [3, 5], uno: .3, bucle: .3, multi: .2, trolls: 1, huecos: [7, 10], plan: r => r() < .5 ? [['s', 1], ['i', 1 + (r() * 2 | 0), 1 + (r() * 2 | 0)], ['l', 2 + (r() * 2 | 0)], ['s', r() * 2 | 0]] : [['i', 1 + (r() * 2 | 0), 1 + (r() * 2 | 0)], ['s', 1 + (r() * 2 | 0)], ['i', 1 + (r() * 2 | 0), 1 + (r() * 2 | 0)]] },
  e: { nodos: [8, 12], cris: [4, 6], uno: .3, bucle: .35, multi: .3, trolls: 1, huecos: [9, 12], plan: r => { const q = r(); return q < .4 ? [['s', 1], ['l', 2 + (r() * 2 | 0)], ['i', 1 + (r() * 2 | 0), 1 + (r() * 2 | 0)], ['i', 1 + (r() * 2 | 0), 1 + (r() * 2 | 0)]] : q < .7 ? [['i', 1 + (r() * 2 | 0), 1 + (r() * 2 | 0)], ['l', 2 + (r() * 2 | 0)], ['i', 1, 1 + (r() * 2 | 0)], ['s', 1]] : [['s', 1], ['i', 1 + (r() * 2 | 0), 2], ['l', 2], ['i', 1, 1 + (r() * 2 | 0)]]; } },
};
const entre = (r, [a, b]) => a + Math.floor(r() * (b - a + 1));
const barajar = (r, a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function mapaAleatorio(r, cfg) {
  const nN = entre(r, cfg.nodos), celdas = [], hay = new Map(), arbol = [];
  const c0 = [Math.floor(r() * GC), Math.floor(r() * GR)]; celdas.push(c0); hay.set(c0[0] + c0[1] * GC, 0);
  const ve = ([c, f]) => [[c + 1, f], [c - 1, f], [c, f + 1], [c, f - 1]].filter(([x, y]) => x >= 0 && y >= 0 && x < GC && y < GR);
  let guarda = 0;
  while (celdas.length < nN && guarda++ < 400) {
    const i = Math.floor(r() * celdas.length), vec = barajar(r, ve(celdas[i])).filter(([x, y]) => !hay.has(x + y * GC));
    if (!vec.length) continue;
    hay.set(vec[0][0] + vec[0][1] * GC, celdas.length); arbol.push([i, celdas.length]); celdas.push(vec[0]);
  }
  if (celdas.length < nN) return null;
  const pares = [];
  for (let a = 0; a < celdas.length; a++) for (let b = a + 1; b < celdas.length; b++) if (Math.abs(celdas[a][0] - celdas[b][0]) + Math.abs(celdas[a][1] - celdas[b][1]) === 1 && !arbol.some(([x, y]) => x === a && y === b)) pares.push([a, b]);
  barajar(r, pares);
  const aristas = [...arbol.map(q => ({ a: q[0], b: q[1], arb: true })), ...pares.filter(() => r() < .5).map(q => ({ a: q[0], b: q[1], arb: false }))];
  const libre = celdas.map(() => [true, true, true]), E = [];
  for (const ar of aristas) {
    let { a, b } = ar; const uno = r() < cfg.uno;
    const cs = barajar(r, [0, 1, 2]);
    let hecho = false;
    if (!uno) { for (const c of cs) if (libre[a][c] && libre[b][c]) { libre[a][c] = libre[b][c] = false; E.push([a, b, COLS[c], 0]); hecho = true; break; } }
    if (!hecho) {
      if (r() < .5) [a, b] = [b, a];
      for (const c of cs) if (libre[a][c]) { libre[a][c] = false; E.push([a, b, COLS[c], 1]); hecho = true; break; }
      if (!hecho) { [a, b] = [b, a]; for (const c of cs) if (libre[a][c]) { libre[a][c] = false; E.push([a, b, COLS[c], 1]); hecho = true; break; } }
    }
    if (!hecho && ar.arb) return null;
  }
  const L = [];
  for (let i = 0; i < celdas.length; i++) if (r() < cfg.bucle * .5 && L.length < 2) { const cs = [0, 1, 2].filter(c => libre[i][c]); if (cs.length > 1) { const c = cs[Math.floor(r() * cs.length)]; libre[i][c] = false; L.push([i, COLS[c]]); } }
  return { n: celdas, e: E, l: L };
}

// Construye un nivel resoluble «hacia delante»: elige un programa al azar y deja el mapa de modo que ese programa sea una solución.
export function generarNivel(r, tramo) {
  const cfg = CFG[tramo], M = mapaAleatorio(r, cfg); if (!M) return null;
  const nN = M.n.length, base = { n: M.n, e: M.e, l: M.l, c: [], t: [], s: Math.floor(r() * nN), p: 0 };
  if (cfg.trolls) { const k = 1 + Math.floor(r() * 3), ns = barajar(r, [...Array(nN).keys()]).slice(0, k); base.t = ns.map(i => [i, r() < .5 ? 'o' : 'p']); }
  const I = info(base); if (!I.ok) return null;
  const blo = cfg.plan(r), sc = plantilla(blo), nA = sc.filter(x => x.k === 'a').length;
  if (nA < cfg.huecos[0] || nA > cfg.huecos[1]) return null;
  const A = new Array(sc.length).fill(null), dec = new Array(nN).fill(-1), cr = new Array(nN).fill(0), cogido = new Array(nN).fill(0);
  dec[base.s] = 0;
  let nodo = base.s, pc = 0, rec = 0, tick = 0;
  const usados = new Set(), alcanzado = new Set();
  while (pc >= 0) {
    if (++tick > 90) return null;
    alcanzado.add(pc);
    const s = sc[pc];
    if (s.k === 'a') {
      if (A[pc] == null) {
        const op = [0, 1, 2].filter(c => I.m[nodo][c] >= 0 && (I.m[nodo][c] !== nodo || r() < .25));
        if (!op.length) return null; A[pc] = op[Math.floor(r() * op.length)];
      }
      const to = I.m[nodo][A[pc]]; if (to < 0) return null;
      nodo = to;
      if (dec[to] < 0) { dec[to] = r() < .62 ? (r() < cfg.multi ? 2 : 1) : 0; cr[to] = dec[to]; }
      if (cr[to] > 0) { cr[to]--; cogido[to]++; rec++; }
      pc = s.n;
    } else {
      if (A[pc] == null) {
        const op = [];
        if (base.t.length) { if (base.t.some(q => q[1] === 'o')) op.push(-1); if (base.t.some(q => q[1] === 'p')) op.push(-2); }
        for (let v = Math.max(0, rec - 1); v <= rec + 2; v++) op.push(v);
        const li = op.filter(x => !usados.has(x)); if (!li.length) return null;
        // los bucles necesitan que alguna vez salga «sí»: se prefiere «llevo N cristales» con N cercano
        A[pc] = li[Math.floor(r() * li.length)]; usados.add(A[pc]);
      }
      const v = A[pc], si = v >= 0 ? rec === v : I.tr[nodo] === (v === -1 ? 1 : 2);
      pc = si ? s.n : s.no;
    }
  }
  const c = []; cogido.forEach((q, i) => { if (q > 0) c.push([i, q]); });
  if (rec < cfg.cris[0] || rec > cfg.cris[1] || nodo === base.s && r() < .8) return null;
  const todasC = sc.map((x, i) => x.k === 'c' ? i : -1).filter(i => i >= 0);
  if (!todasC.every(i => alcanzado.has(i))) return null;
  // huecos no recorridos (rama no tomada): fichas al azar
  for (let i = 0; i < sc.length; i++) if (A[i] == null) {
    if (sc[i].k === 'a') A[i] = Math.floor(r() * 3);
    else { const op = [-1, -2, 0, 1, 2, 3, 4].filter(x => !usados.has(x) && (x >= 0 || base.t.some(q => q[1] === (x === -1 ? 'o' : 'p')))); const v = op[Math.floor(r() * op.length)]; usados.add(v); A[i] = v; }
  }
  const L = { ...base, c, p: nodo, sc, f: [0, 1, 2].map(k => sc.reduce((q, x, i) => q + (x.k === 'a' && A[i] === k ? 1 : 0), 0)), k: sc.map((x, i) => x.k === 'c' ? A[i] : null).filter(x => x !== null) };
  const res = correr(L, A); if (!res.ok) return null;
  L.sol = A.slice(); L.par = res.pasos; L.bl = blo;
  return L;
}
// Limpia lo que no se ve: nodos sueltos sin camino (no debería haberlos) y devuelve el nivel validado
export function nuevoNivel(semilla, tramo, { intentos = 6000, tope = 1500 } = {}) {
  const r = mulberry32(semilla >>> 0 || 1);
  for (let i = 0; i < intentos; i++) {
    const L = generarNivel(r, tramo); if (!L) continue;
    const V = validar(L); if (!V) continue;
    if (espacio(V) > 600000) continue;
    const R = resolver(V, { max: 400000 });
    if (!R.n) continue;
    V.par = R.min; V.sol = R.mejor; V.nsol = R.n; V.comp = R.completo;
    return V;
  }
  return null;
}

/* ---------- pistas ---------- */
// Mejor solución compatible con lo ya colocado (la que más fichas comparte). Devuelve { hueco, valor } del siguiente hueco libre.
export function pista(L, A) {
  const sol = L.sol; if (!sol) return null;
  const libres = L.sc.map((s, i) => A[i] == null ? i : -1).filter(i => i >= 0);
  if (!libres.length) return null;
  let cand = [sol];
  const R = totalSolsCache(L); if (R && R.sols.length) cand = R.sols;
  let mejor = cand[0], mp = -1;
  for (const s of cand) { let p = 0; for (let i = 0; i < s.length; i++) if (A[i] != null && A[i] === s[i]) p++; if (p > mp) { mp = p; mejor = s; } }
  // si hay algo colocado mal se señala primero
  const mal = L.sc.findIndex((x, i) => A[i] != null && A[i] !== mejor[i]);
  if (mal >= 0) return { hueco: mal, valor: mejor[mal], corregir: true };
  const h = libres[0]; return { hueco: h, valor: mejor[h], corregir: false };
}
const csol = new WeakMap();
function totalSolsCache(L) { if (!csol.has(L)) csol.set(L, espacio(L) < 300000 ? resolver(L, { max: 300000, guardar: 200 }) : null); return csol.get(L); }

/* ---------- fecha / reto diario ---------- */
export const semillaDe = txt => { let h = 2166136261; for (const ch of String(txt)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const compartir = L => { const { sol, par, nsol, comp, ...q } = L; return btoa(unescape(encodeURIComponent(JSON.stringify(q)))); };
export function leerCodigo(txt) { try { return validar(JSON.parse(decodeURIComponent(escape(atob(String(txt).trim()))))); } catch { return null; } }
