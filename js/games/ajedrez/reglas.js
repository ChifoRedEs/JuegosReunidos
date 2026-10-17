// Reglas e IA del Ajedrez (sin DOM, probable con Node).
// Casilla sq = fila * 8 + columna; la fila 0 es la 8.ª (arriba, lado de las negras). Columna 0 = a.
// Piezas: 0 vacío · blancas 1 peón, 2 caballo, 3 alfil, 4 torre, 5 dama, 6 rey · negras = lo mismo + 8.
// Jugada (entero): origen | destino << 6 | coronación << 12 | marcas << 15  (marcas: 1 enroque, 2 al paso, 4 peón avanza dos).
// Jugador 1 = blancas (empiezan), 2 = negras. Enroques (bits): 1 corto blancas, 2 largo blancas, 4 corto negras, 8 largo negras.

export const VARIANTES = { clasico: { nombre: 'Ajedrez', corto: 'Clásico' } };
export const LETRA = ['', '', 'C', 'A', 'T', 'D', 'R'];                  // notación española
export const NOMBRE_PIEZA = ['', 'peón', 'caballo', 'alfil', 'torre', 'dama', 'rey'];
const VALOR = [0, 100, 320, 330, 500, 900, 0];
const MATE = 100000;

/* ---------- tablas precalculadas ---------- */
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
const KN = [], KG = [], RAY = [];
for (let sq = 0; sq < 64; sq++) {
  const r = sq >> 3, c = sq & 7, dentro = (a, b) => a >= 0 && a < 8 && b >= 0 && b < 8;
  KN[sq] = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]].filter(([a, b]) => dentro(r + a, c + b)).map(([a, b]) => (r + a) * 8 + c + b);
  KG[sq] = DIRS.filter(([a, b]) => dentro(r + a, c + b)).map(([a, b]) => (r + a) * 8 + c + b);
  RAY[sq] = DIRS.map(([a, b]) => { const l = []; for (let k = 1; dentro(r + a * k, c + b * k); k++) l.push((r + a * k) * 8 + c + b * k); return l; });
}
const CASM = new Array(64).fill(15); CASM[60] = 12; CASM[63] = 14; CASM[56] = 13; CASM[4] = 3; CASM[7] = 11; CASM[0] = 7;
export const nombreCasilla = sq => 'abcdefgh'[sq & 7] + (8 - (sq >> 3));
export const mov = (de, a, cor = 0, fl = 0) => de | a << 6 | cor << 12 | fl << 15;
export const de = m => m & 63, a = m => (m >> 6) & 63, coronacion = m => (m >> 12) & 7, marcas = m => m >> 15;

/* ---------- posición mutable (motor y búsqueda) ---------- */
function posDe(e) {
  const b = new Int8Array(64); e.b.forEach((p, i) => { b[i] = p; });
  const k = [b.indexOf(6), b.indexOf(14)];
  return { b, side: e.turn - 1, cas: e.cas, ep: e.ep, half: e.half, k };
}
export function atacada(b, sq, por) {
  const r = sq >> 3, c = sq & 7, o = por << 3;
  if (por === 0) { if (r < 7) { if (c > 0 && b[sq + 7] === 1) return true; if (c < 7 && b[sq + 9] === 1) return true; } }
  else if (r > 0) { if (c > 0 && b[sq - 9] === 9) return true; if (c < 7 && b[sq - 7] === 9) return true; }
  for (const t of KN[sq]) if (b[t] === 2 + o) return true;
  for (const t of KG[sq]) if (b[t] === 6 + o) return true;
  const R = RAY[sq];
  for (let d = 0; d < 8; d++) {
    const l = R[d], p1 = d < 4 ? 4 + o : 3 + o, p2 = 5 + o;
    for (let i = 0; i < l.length; i++) { const p = b[l[i]]; if (p) { if (p === p1 || p === p2) return true; break; } }
  }
  return false;
}
const enJaque = (P, s) => atacada(P.b, P.k[s], s ^ 1);
function pseudo(P, soloCapturas) {
  const b = P.b, s = P.side, out = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = b[sq]; if (!p || (p >> 3) !== s) continue;
    const t = p & 7;
    if (t === 1) {
      const dir = s ? 8 : -8, r = sq >> 3, corona = r === (s ? 6 : 1), uno = sq + dir;
      if (b[uno] === 0 && (!soloCapturas || corona)) {
        if (corona) for (let q = 5; q >= 2; q--) out.push(mov(sq, uno, q));
        else { out.push(mov(sq, uno)); if (r === (s ? 1 : 6) && b[uno + dir] === 0) out.push(mov(sq, uno + dir, 0, 4)); }
      }
      for (const dc of [-1, 1]) {
        const c = (sq & 7) + dc; if (c < 0 || c > 7) continue;
        const t2 = uno + dc, v = b[t2];
        if (v && (v >> 3) !== s) { if (corona) for (let q = 5; q >= 2; q--) out.push(mov(sq, t2, q)); else out.push(mov(sq, t2)); }
        else if (t2 === P.ep && !v) out.push(mov(sq, t2, 0, 2));
      }
    } else if (t === 2 || t === 6) {
      for (const t2 of (t === 2 ? KN : KG)[sq]) { const v = b[t2]; if (!v) { if (!soloCapturas) out.push(mov(sq, t2)); } else if ((v >> 3) !== s) out.push(mov(sq, t2)); }
      if (t === 6 && !soloCapturas) {
        const base = s ? 4 : 60, enemigo = s ^ 1;
        if (sq === base && (P.cas & (s ? 4 : 1)) && !b[base + 1] && !b[base + 2] && b[base + 3] === (s ? 12 : 4) && !atacada(b, base, enemigo) && !atacada(b, base + 1, enemigo) && !atacada(b, base + 2, enemigo)) out.push(mov(base, base + 2, 0, 1));
        if (sq === base && (P.cas & (s ? 8 : 2)) && !b[base - 1] && !b[base - 2] && !b[base - 3] && b[base - 4] === (s ? 12 : 4) && !atacada(b, base, enemigo) && !atacada(b, base - 1, enemigo) && !atacada(b, base - 2, enemigo)) out.push(mov(base, base - 2, 0, 1));
      }
    } else {
      const d0 = t === 3 ? 4 : 0, d1 = t === 4 ? 4 : 8, R = RAY[sq];
      for (let d = d0; d < d1; d++) for (const t2 of R[d]) { const v = b[t2]; if (!v) { if (!soloCapturas) out.push(mov(sq, t2)); } else { if ((v >> 3) !== s) out.push(mov(sq, t2)); break; } }
    }
  }
  return out;
}
function hacer(P, m) {
  const b = P.b, f = m & 63, t = (m >> 6) & 63, q = (m >> 12) & 7, fl = m >> 15, p = b[f], s = P.side;
  const u = { cap: b[t], capSq: t, cas: P.cas, ep: P.ep, half: P.half };
  if (fl & 2) { u.capSq = t + (s ? -8 : 8); u.cap = b[u.capSq]; b[u.capSq] = 0; }
  b[t] = q ? q | s << 3 : p; b[f] = 0;
  if (fl & 1) { if (t === f + 2) { b[f + 1] = b[f + 3]; b[f + 3] = 0; } else { b[f - 1] = b[f - 4]; b[f - 4] = 0; } }
  if ((p & 7) === 6) P.k[s] = t;
  P.ep = fl & 4 ? (f + t) >> 1 : -1;
  P.half = (p & 7) === 1 || u.cap ? 0 : P.half + 1;
  P.cas &= CASM[f] & CASM[t];
  P.side = s ^ 1;
  return u;
}
function deshacer(P, m, u) {
  const b = P.b, f = m & 63, t = (m >> 6) & 63, q = (m >> 12) & 7, fl = m >> 15;
  P.side ^= 1; const s = P.side;
  const p = q ? 1 | s << 3 : b[t];
  b[f] = p; b[t] = 0; b[u.capSq] = u.cap;
  if (fl & 1) { if (t === f + 2) { b[f + 3] = b[f + 1]; b[f + 1] = 0; } else { b[f - 4] = b[f - 1]; b[f - 1] = 0; } }
  if ((p & 7) === 6) P.k[s] = f;
  P.cas = u.cas; P.ep = u.ep; P.half = u.half;
}
function legales(P) {
  const s = P.side;
  return pseudo(P, false).filter(m => { const u = hacer(P, m), ok = !atacada(P.b, P.k[s], s ^ 1); deshacer(P, m, u); return ok; });
}

/* ---------- estado guardable (lo que maneja core/duelo.js) ---------- */
const INICIAL = [12, 10, 11, 13, 14, 11, 10, 12, 9, 9, 9, 9, 9, 9, 9, 9, ...new Array(32).fill(0), 1, 1, 1, 1, 1, 1, 1, 1, 4, 2, 3, 5, 6, 3, 2, 4];
function clave(b, turn, cas, ep) {                // huella de la posición (para la triple repetición)
  let h = 2166136261; const s = b.join(',') + '|' + turn + '|' + cas + '|' + ep;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
// movs: todas las jugadas desde el principio (para revisar la partida y exportar PGN)
// reloj (opcional): { ms: [blancas, negras], base, inc } en milisegundos
export function estadoInicial(reloj = null) {
  return { b: INICIAL.slice(), turn: 1, n: 0, ult: null, cas: 15, ep: -1, half: 0, claves: [clave(INICIAL, 1, 15, -1)], san: [], fin: null, movs: [],
    reloj: reloj ? { ms: [reloj.base, reloj.base], base: reloj.base, inc: reloj.inc } : null };
}
export function jugadas(e) { return e.fin ? [] : legales(posDe(e)); }
export const jaque = e => { const P = posDe(e); return enJaque(P, P.side) ? P.k[P.side] : -1; };
export function materialInsuficiente(b) {
  const otras = []; b.forEach((p, i) => { if (p && (p & 7) !== 6) otras.push([p & 7, i]); });
  if (!otras.length) return true;
  if (otras.some(([t]) => t !== 2 && t !== 3)) return false;
  if (otras.length === 1) return true;
  return otras.every(([t]) => t === 3) && new Set(otras.map(([, i]) => ((i >> 3) + (i & 7)) & 1)).size === 1;
}
function notacion(P, m, todas) {
  const b = P.b, f = de(m), t = a(m), q = coronacion(m), fl = marcas(m), p = b[f], tp = p & 7;
  let s;
  if (fl & 1) s = t > f ? 'O-O' : 'O-O-O';
  else {
    const captura = !!b[t] || !!(fl & 2);
    if (tp === 1) s = (captura ? 'abcdefgh'[f & 7] + 'x' : '') + nombreCasilla(t) + (q ? '=' + LETRA[q] : '');
    else {
      s = LETRA[tp];
      const otras = todas.filter(x => x !== m && a(x) === t && b[de(x)] === p);
      if (otras.length) {
        const misma = x => otras.some(y => x(de(y)) === x(f));
        s += !misma(z => z & 7) ? 'abcdefgh'[f & 7] : !misma(z => z >> 3) ? String(8 - (f >> 3)) : nombreCasilla(f);
      }
      s += (captura ? 'x' : '') + nombreCasilla(t);
    }
  }
  const u = hacer(P, m), j = enJaque(P, P.side), mate = j && !legales(P).length; deshacer(P, m, u);
  return s + (mate ? '#' : j ? '+' : '');
}
export function aplicar(e, m) {
  const P = posDe(e), todas = legales(P);
  const san = notacion(P, m, todas);
  hacer(P, m);
  const b = [...P.b], turn = P.side + 1, k = clave(b, turn, P.cas, P.ep);
  const claves = P.half === 0 ? [k] : [...e.claves, k].slice(-120);
  const n = { b, turn, n: e.n + 1, ult: [de(m), a(m)], cas: P.cas, ep: P.ep, half: P.half, claves, san: [...e.san, san], fin: null,
    movs: Array.isArray(e.movs) && e.movs.length === e.n ? [...e.movs, m] : null, reloj: null };
  if (e.reloj) { const ms = e.reloj.ms.slice(); ms[e.turn - 1] += e.reloj.inc; n.reloj = { ...e.reloj, ms }; }   // incremento por jugada
  if (!legales(P).length) n.fin = enJaque(P, P.side) ? { w: e.turn, motivo: 'Jaque mate' } : { w: 0, motivo: 'Rey ahogado' };
  else if (P.half >= 100) n.fin = { w: 0, motivo: 'Regla de los 50 movimientos' };
  else if (claves.filter(x => x === k).length >= 3) n.fin = { w: 0, motivo: 'Triple repetición' };
  else if (materialInsuficiente(b)) n.fin = { w: 0, motivo: 'Material insuficiente' };
  return n;
}
export function rendirse(e) { return { ...e, fin: { w: 3 - e.turn, motivo: 'Abandono' } }; }

const PIEZAS_OK = new Set([0, 1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 14]);
export function validarEstado(x) {
  if (!x || typeof x !== 'object' || !Array.isArray(x.b) || x.b.length !== 64 || !x.b.every(p => PIEZAS_OK.has(p))) return null;
  if (x.b.filter(p => p === 6).length !== 1 || x.b.filter(p => p === 14).length !== 1) return null;
  if (x.b.some((p, i) => (p & 7) === 1 && (i < 8 || i >= 56))) return null;
  const ent = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
  if (x.turn !== 1 && x.turn !== 2 || !ent(x.n, 0, 100000) || !ent(x.cas, 0, 15) || !ent(x.half, 0, 150)) return null;
  if (!(x.ep === -1 || (ent(x.ep, 16, 47) && [2, 5].includes(x.ep >> 3)))) return null;
  const ult = Array.isArray(x.ult) && x.ult.length === 2 && x.ult.every(v => ent(v, 0, 63)) ? x.ult.slice() : null;
  const claves = Array.isArray(x.claves) ? x.claves.filter(k => typeof k === 'string' && /^[0-9a-f]{8}$/.test(k)).slice(-120) : [];
  const san = Array.isArray(x.san) ? x.san.filter(s => typeof s === 'string' && s.length <= 10).slice(-1000) : [];
  let fin = null;
  if (x.fin) { if (typeof x.fin !== 'object' || ![0, 1, 2].includes(x.fin.w)) return null; fin = { w: x.fin.w, motivo: typeof x.fin.motivo === 'string' ? x.fin.motivo.slice(0, 40) : '' }; }
  const reloj = x.reloj && Array.isArray(x.reloj.ms) && x.reloj.ms.length === 2 && x.reloj.ms.every(v => Number.isFinite(v) && v >= 0 && v <= 4 * 3600e3)
    && ent(x.reloj.base, 1000, 3 * 3600e3) && ent(x.reloj.inc, 0, 60000) ? { ms: x.reloj.ms.slice(), base: x.reloj.base, inc: x.reloj.inc } : null;
  const e = { b: x.b.slice(), turn: x.turn, n: x.n, ult, cas: x.cas, ep: x.ep, half: x.half, claves, san, fin, movs: null, reloj };
  const P = posDe(e); if (enJaque(P, P.side ^ 1)) return null;          // el que acaba de mover no puede seguir en jaque
  // la lista de jugadas solo se acepta si, rejugada desde el principio, lleva exactamente a esta posición
  if (Array.isArray(x.movs) && x.movs.length === x.n && x.n <= 1000 && x.movs.every(m => ent(m, 0, 1 << 18))) {
    const r = rejugar(x.movs); if (r && r.b.join() === e.b.join() && r.turn === e.turn) e.movs = x.movs.slice();
  }
  return e;
}

/* ---------- IA: alfa-beta con profundización iterativa y búsqueda de capturas ---------- */
// Tablas de posición (punto de vista de las blancas, la fila de arriba es la 8.ª)
const PST = [null,
  [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
];
const REY_FINAL = [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50];
function evaluar(P) {
  const b = P.b; let s = 0, mayores = 0;
  for (let i = 0; i < 64; i++) { const p = b[i]; if (p && (p & 7) > 1 && (p & 7) < 6) mayores += VALOR[p & 7]; }
  const final = mayores <= 1400;
  for (let i = 0; i < 64; i++) {
    const p = b[i]; if (!p) continue;
    const t = p & 7, negra = p >> 3, idx = negra ? i ^ 56 : i;
    const v = VALOR[t] + (t === 6 && final ? REY_FINAL[idx] : PST[t][idx]);
    s += negra ? -v : v;
  }
  return P.side ? -s : s;
}
const orden = (P, ms) => {                       // capturas (víctima valiosa / atacante barato) y coronaciones primero
  const b = P.b;
  return ms.map(m => { const v = b[(m >> 6) & 63]; return [m, (v ? 10 * VALOR[v & 7] - VALOR[b[m & 63] & 7] + 10000 : 0) + ((m >> 12) & 7 ? 9000 : 0)]; }).sort((x, y) => y[1] - x[1]).map(x => x[0]);
};
const FIN_T = Symbol('tiempo');
export function buscar(e, { prof = 4, ms = 1500, ruido = 0 } = {}) {
  const P = posDe(e), raiz = orden(P, legales(P));
  if (!raiz.length) return null;
  if (raiz.length === 1) return raiz[0];
  const t0 = Date.now(); let nodos = 0;
  const reloj = () => { if ((++nodos & 1023) === 0 && Date.now() - t0 > ms) throw FIN_T; };
  const quies = (al, be) => {
    reloj();
    const pie = evaluar(P); if (pie >= be) return be; if (pie > al) al = pie;
    const s = P.side;
    for (const m of orden(P, pseudo(P, true))) {
      const u = hacer(P, m);
      if (atacada(P.b, P.k[s], s ^ 1)) { deshacer(P, m, u); continue; }
      const v = -quies(-be, -al); deshacer(P, m, u);
      if (v >= be) return be; if (v > al) al = v;
    }
    return al;
  };
  const nega = (d, al, be, ply) => {
    reloj();
    if (P.half >= 100) return 0;
    const s = P.side, jq = enJaque(P, s);
    if (d <= 0 && !jq) return quies(al, be);
    let legal = 0, mejor = -Infinity;
    for (const m of orden(P, pseudo(P, false))) {
      const u = hacer(P, m);
      if (atacada(P.b, P.k[s], s ^ 1)) { deshacer(P, m, u); continue; }
      legal++;
      const v = -nega(d - 1, -be, -al, ply + 1); deshacer(P, m, u);
      if (v > mejor) mejor = v; if (v > al) al = v; if (al >= be) break;
    }
    if (!legal) return jq ? -MATE + ply : 0;
    return mejor;
  };
  let puntos = raiz.map(m => [m, 0]), lista = raiz;
  for (let d = 1; d <= prof; d++) {
    try {
      const pts = [];
      for (const m of lista) { const u = hacer(P, m), v = -nega(d - 1, -Infinity, Infinity, 1); deshacer(P, m, u); pts.push([m, v]); }
      pts.sort((x, y) => y[1] - x[1]); puntos = pts; lista = pts.map(x => x[0]);
      if (pts[0][1] > MATE - 100) break;                          // mate encontrado
    } catch (err) { if (err !== FIN_T) throw err; break; }
  }
  if (!ruido) return puntos[0][0];
  let mj = puntos[0][0], mv = -Infinity;
  for (const [m, v] of puntos) { const x = v + Math.random() * ruido; if (x > mv) { mv = x; mj = m; } }
  return mj;
}
const NIVELES = { facil: { prof: 2, ms: 500, ruido: 180 }, medio: { prof: 3, ms: 1200, ruido: 30 }, dificil: { prof: 6, ms: 2000, ruido: 0 } };
export function ia(e, v, nivel, rapido = false) {
  const c = NIVELES[nivel] || NIVELES.medio;
  return buscar(e, rapido ? { prof: 5, ms: 1200, ruido: 0 } : c);
}

/* ---------- utilidades para pruebas ---------- */
// Rejuega una lista de jugadas desde la posición inicial; null si alguna no es legal
export function rejugar(movs, hasta = movs.length) {
  let e = estadoInicial();
  for (let i = 0; i < hasta; i++) { if (!jugadas(e).includes(movs[i])) return null; e = aplicar(e, movs[i]); }
  return e;
}
// ---------- PGN (notación inglesa: N B R Q K) ----------
const A_INGLES = { C: 'N', A: 'B', T: 'R', D: 'Q', R: 'K' };
export const sanIngles = s => s.replace(/^[CATDR]/, x => A_INGLES[x]).replace(/=([CATD])/, (_, x) => '=' + A_INGLES[x]);
export function aPGN(e, { blancas = 'Blancas', negras = 'Negras', evento = 'Juegos Reunidos', fecha = new Date() } = {}) {
  const res = !e.fin ? '*' : e.fin.w === 1 ? '1-0' : e.fin.w === 2 ? '0-1' : '1/2-1/2';
  const f = `${fecha.getFullYear()}.${String(fecha.getMonth() + 1).padStart(2, '0')}.${String(fecha.getDate()).padStart(2, '0')}`;
  const cab = [['Event', evento], ['Site', 'Juegos Reunidos'], ['Date', f], ['White', blancas], ['Black', negras], ['Result', res]];
  const base = e.n - e.san.length, partes = [];
  e.san.forEach((s, i) => { const nj = base + i; if (nj % 2 === 0) partes.push(`${(nj >> 1) + 1}.`); else if (i === 0) partes.push(`${(nj >> 1) + 1}...`); partes.push(sanIngles(s)); });
  partes.push(res);
  const lineas = []; let l = '';
  for (const p of partes) { if ((l + ' ' + p).trim().length > 79) { lineas.push(l.trim()); l = ''; } l += ' ' + p; }
  if (l.trim()) lineas.push(l.trim());
  return cab.map(([k, v]) => `[${k} "${String(v).replace(/["\\]/g, '')}"]`).join('\n') + '\n\n' + lineas.join('\n') + '\n';
}
// Lee un PGN (o una lista de jugadas en notación inglesa o española). Devuelve { e } o { error }.
export function dePGN(txt) {
  const cuerpo = String(txt).replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ');
  let sin = cuerpo, prev;
  do { prev = sin; sin = sin.replace(/\([^()]*\)/g, ' '); } while (sin !== prev);           // variantes entre paréntesis
  const fichas = sin.replace(/\$\d+/g, ' ').split(/\s+/).map(t => t.replace(/^\d+\.+/, '').trim()).filter(t => t && !/^(1-0|0-1|1\/2-1\/2|\*|\d+\.+)$/.test(t));
  const limpia = t => t.replace(/[+#!?]+$/g, '').replace(/0-0-0/g, 'O-O-O').replace(/0-0/g, 'O-O').replace(/e\.p\.$/i, '');
  // ¿Inglés (N B Q K) o español (C A D T)? La R significa rey en español y torre en inglés: se decide por el resto de letras
  const ingles = fichas.some(t => /^[NBQK]/.test(t)) || !fichas.some(t => /^[CATD]/.test(t));
  let e = estadoInicial();
  for (const [k, t] of fichas.entries()) {
    if (e.fin) break;
    const quiero = limpia(t).replace('=', ''), P = posDe(e), todas = legales(P);
    const m = todas.find(x => { const s = notacion(P, x, todas).replace(/[+#]$/, ''); return (ingles ? sanIngles(s) : s).replace('=', '') === quiero; });
    if (m == null) return { error: `No entiendo la jugada ${Math.floor((e.n) / 2) + 1}${e.turn === 1 ? '.' : '…'} «${t}» (ficha ${k + 1}).` };
    e = aplicar(e, m);
  }
  if (!e.n) return { error: 'No he encontrado ninguna jugada.' };
  return { e };
}
export function desdeFEN(fen) {
  const [pos, t, cas, ep, half] = fen.trim().split(/\s+/), b = [];
  for (const ch of pos.replace(/\//g, '')) { if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) b.push(0); else { const tp = ' pnbrqk'.indexOf(ch.toLowerCase()); b.push(ch === ch.toLowerCase() ? tp + 8 : tp); } }
  const c = (cas || '-').split('').reduce((s, x) => s | ({ K: 1, Q: 2, k: 4, q: 8 }[x] || 0), 0);
  const epSq = !ep || ep === '-' ? -1 : (8 - +ep[1]) * 8 + 'abcdefgh'.indexOf(ep[0]);
  const turn = t === 'b' ? 2 : 1;
  return { b, turn, n: 0, ult: null, cas: c, ep: epSq, half: +half || 0, claves: [clave(b, turn, c, epSq)], san: [], fin: null };
}
export function perft(e, d) {
  const P = posDe(e);
  const rec = n => { if (!n) return 1; let t = 0; for (const m of legales(P)) { const u = hacer(P, m); t += n === 1 ? 1 : rec(n - 1); deshacer(P, m, u); } return t; };
  return rec(d);
}

export function reglasHTML() {
  return `<ul><li>Gana quien da <b>jaque mate</b>: el rey contrario está atacado y no tiene forma de escapar. Empiezan las blancas.</li>
    <li>Toca una pieza tuya y verás sus casillas posibles; toca el destino para mover. Toca otra pieza para cambiar de elección.</li>
    <li>Se aplican todas las reglas: <b>enroque</b> corto y largo (toca el rey y luego su casilla de destino), <b>captura al paso</b> y <b>coronación</b> (eliges dama, torre, alfil o caballo).</li>
    <li>No se puede hacer una jugada que deje a tu rey en jaque. Si estás en jaque, el rey se marca en rojo.</li>
    <li><b>Tablas</b>: rey ahogado, triple repetición, 50 movimientos sin capturas ni movimientos de peón, o material insuficiente para dar mate. También puedes <b>abandonar</b> desde el menú ⋯.</li>
    <li>Las jugadas se anotan en notación española: R rey, D dama, T torre, A alfil, C caballo (los peones sin letra).</li>
    <li>Contra la CPU: Fácil comete errores, Medio piensa unas jugadas y Difícil busca más profundo. 💡 <b>Pista</b> marca la jugada que recomienda la IA.</li>
    <li>⏱️ <b>Reloj</b>: elige un ritmo (por ejemplo 5+3: cinco minutos por bando y 3 segundos más por jugada). Quien se queda sin tiempo pierde.</li>
    <li>🔍 <b>Revisar</b>: recorre la partida jugada a jugada con ⏮ ◀ ▶ ⏭ o tocando una jugada de la lista.</li>
    <li>📤 <b>PGN</b>: copia o descarga la partida en el formato estándar para analizarla en otros programas. 📥 <b>Importar</b>: pega un PGN y la partida sigue desde esa posición.</li></ul>`;
}
