// Klotski · motor sin DOM (se prueba con Node).
// Dos modos sobre un tablero de w×h casillas:
//  · «colores»: puzle de bloques deslizantes (Klotski). Hay un bloque grande 2×2 (índice 0) que debe llegar a la salida, abajo.
//    Los bloques se deslizan en línea recta cualquier distancia (eso cuenta como 1 movimiento).
//  · «numeros»: puzle de fichas numeradas con un hueco; se ordenan de 1 a n. Tocar una ficha desliza toda la fila hacia el hueco.
// Estado: { modo, tam, w, h, p: [[x, y, pw, ph], …], ini, hist, movs, t, nivel, opt, done }. En «numeros» la pieza i es la ficha i+1.
export const MODOS = { colores: 'Fichas de colores', numeros: 'Fichas con números' };
export const NIVELES = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil', experto: 'Experto' };
export const TAMANOS = {
  colores: {
    '4x4': { w: 4, h: 4, D: 4, S: 2, nombre: 'Pequeño 4×4' }, '4x5': { w: 4, h: 5, D: 5, S: 4, nombre: 'Clásico 4×5' },
    '5x5': { w: 5, h: 5, B: 1, D: 6, S: 3, nombre: 'Mediano 5×5' }, '5x6': { w: 5, h: 6, B: 1, D: 8, S: 4, nombre: 'Grande 5×6' },
  },
  numeros: {
    '3x3': { w: 3, h: 3, nombre: '3×3 · 8 fichas' }, '3x4': { w: 3, h: 4, nombre: '3×4 · 11 fichas' }, '4x4': { w: 4, h: 4, nombre: '4×4 · 15 fichas' },
    '4x5': { w: 4, h: 5, nombre: '4×5 · 19 fichas' }, '5x5': { w: 5, h: 5, nombre: '5×5 · 24 fichas' },
  },
};
export const DIR = [[0, -1], [1, 0], [0, 1], [-1, 0]];        // 0 arriba, 1 derecha, 2 abajo, 3 izquierda
export const dims = (modo, tam) => (Object.hasOwn(TAMANOS, modo) && Object.hasOwn(TAMANOS[modo], tam) ? TAMANOS[modo][tam] : null);
export const metaX = w => (w - 2) >> 1;                         // columna izquierda del bloque grande al salir

const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const mulberry = a => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const barajar = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = r() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- geometría ---------- */
export function rejilla(P, w, h) {
  const g = new Int16Array(w * h).fill(-1);
  P.forEach(([x, y, pw, ph], i) => { for (let yy = y; yy < y + ph; yy++) for (let xx = x; xx < x + pw; xx++) g[yy * w + xx] = i; });
  return g;
}
// Distancia máxima que puede deslizarse la pieza i en la dirección d
export function maxDist(P, w, h, i, d, g = rejilla(P, w, h)) {
  const [x, y, pw, ph] = P[i], [dx, dy] = DIR[d]; let n = 0;
  for (;;) {
    const k = n + 1; let ok = true;
    if (dx) { const cx = dx > 0 ? x + pw - 1 + k : x - k; if (cx < 0 || cx >= w) ok = false; else for (let yy = y; yy < y + ph; yy++) if (g[yy * w + cx] !== -1) { ok = false; break; } }
    else { const cy = dy > 0 ? y + ph - 1 + k : y - k; if (cy < 0 || cy >= h) ok = false; else for (let xx = x; xx < x + pw; xx++) if (g[cy * w + xx] !== -1) { ok = false; break; } }
    if (!ok) return n; n = k;
  }
}
export const resuelto = S => {
  if (S.modo === 'colores') return S.p[0][0] === metaX(S.w) && S.p[0][1] === S.h - 2;
  return S.p.every((q, i) => q[0] === i % S.w && q[1] === (i / S.w | 0));
};

/* ---------- movimientos ---------- */
const apunta = (S, ids) => { S.hist.push(ids.map(i => [i, S.p[i][0], S.p[i][1]])); if (S.hist.length > 600) S.hist.shift(); };
export function deslizar(S, i, d, dist) {                        // modo colores
  if (S.modo !== 'colores' || !S.p[i] || dist < 1 || dist > maxDist(S.p, S.w, S.h, i, d)) return false;
  apunta(S, [i]); S.p[i][0] += DIR[d][0] * dist; S.p[i][1] += DIR[d][1] * dist; S.movs++; return true;
}
export function hueco(S) {                                       // modo números: casilla vacía
  const g = rejilla(S.p, S.w, S.h); const k = g.indexOf(-1); return [k % S.w, k / S.w | 0];
}
// Dirección en la que se mueve la ficha i hacia el hueco (o -1 si no está en su fila/columna) y cuántas fichas se mueven
export function haciaHueco(S, i) {
  const [bx, by] = hueco(S), [x, y] = S.p[i];
  if (x === bx && y !== by) return { d: by < y ? 0 : 2, n: Math.abs(by - y) };
  if (y === by && x !== bx) return { d: bx < x ? 3 : 1, n: Math.abs(bx - x) };
  return null;
}
export function empujar(S, i) {                                  // modo números: desliza la fila entera
  if (S.modo !== 'numeros' || !S.p[i]) return false;
  const m = haciaHueco(S, i); if (!m) return false;
  const g = rejilla(S.p, S.w, S.h), [x, y] = S.p[i], [dx, dy] = DIR[m.d], ids = [];
  for (let k = 0; k < m.n; k++) ids.push(g[(y + dy * k) * S.w + x + dx * k]);
  apunta(S, ids); for (const j of ids) { S.p[j][0] += dx; S.p[j][1] += dy; } S.movs++; return true;
}
export function deshacer(S) {
  const h = S.hist.pop(); if (!h) return false;
  for (const [i, x, y] of h) { S.p[i][0] = x; S.p[i][1] = y; } S.movs = Math.max(0, S.movs - 1); S.done = false; return true;
}
// Destinos posibles del bloque i (modo colores): [{ d, dist }]
export function opciones(S, i) {
  const g = rejilla(S.p, S.w, S.h), r = [];
  for (let d = 0; d < 4; d++) { const m = maxDist(S.p, S.w, S.h, i, d, g); for (let k = 1; k <= m; k++) r.push({ d, dist: k }); }
  return r;
}
// Casillas libres que cubre al avanzar `dist` en la dirección d (para marcar destinos y para tocarlos)
export function franja(S, i, d, dist) {
  const [x, y, pw, ph] = S.p[i], [dx, dy] = DIR[d], r = [];
  if (dx) { const cx = dx > 0 ? x + pw - 1 + dist : x - dist; for (let yy = y; yy < y + ph; yy++) r.push([cx, yy]); }
  else { const cy = dy > 0 ? y + ph - 1 + dist : y - dist; for (let xx = x; xx < x + pw; xx++) r.push([xx, cy]); }
  return r;
}
export function destinoEn(S, i, cx, cy) {
  for (const o of opciones(S, i)) if (franja(S, i, o.d, o.dist).some(([a, b]) => a === cx && b === cy)) return o;
  return null;
}

/* ---------- colores: claves canónicas, búsqueda y generación ---------- */
const tipo = (pw, ph) => (pw === 2 && ph === 2 ? 'K' : pw === 2 ? 'H' : ph === 2 ? 'V' : 'S');
const claveDe = (P, w, h) => { const a = new Array(w * h).fill('.'); P.forEach(([x, y, pw, ph], i) => { a[y * w + x] = i === 0 ? 'G' : tipo(pw, ph); }); return a.join(''); };   // G = bloque especial (índice 0), K = otro 2×2
function deClave(k, w) {
  const P = []; for (let p = 0; p < k.length; p++) { const c = k[p]; if (c === '.') continue; const x = p % w, y = p / w | 0, q = c === 'G' || c === 'K' ? [x, y, 2, 2] : c === 'H' ? [x, y, 2, 1] : c === 'V' ? [x, y, 1, 2] : [x, y, 1, 1]; if (c === 'G') P.unshift(q); else P.push(q); }
  return P;
}
const esMeta = (k, w, h) => k[(h - 2) * w + metaX(w)] === 'G';
function vecinos(P, w, h, f) {
  const g = rejilla(P, w, h);
  for (let i = 0; i < P.length; i++) for (let d = 0; d < 4; d++) {
    const m = maxDist(P, w, h, i, d, g); if (!m) continue;
    for (let k = 1; k <= m; k++) { const Q = P.map(q => q.slice()); Q[i][0] += DIR[d][0] * k; Q[i][1] += DIR[d][1] * k; f(Q, i, d, k); }
  }
}
// Camino más corto hasta que el bloque grande esté en la salida: [{ i, d, dist }] sobre las piezas de P (o null si pasa del límite)
export function solucionColores(P0, w, h, limite = 400000) {
  const k0 = claveDe(P0, w, h); if (esMeta(k0, w, h)) return [];
  const padre = new Map([[k0, null]]); let cola = [k0], fin = null;
  while (cola.length && !fin && padre.size < limite) {
    const sig = [];
    for (const k of cola) {
      vecinos(deClave(k, w), w, h, (Q, i, d, dist) => {
        if (fin) return; const kk = claveDe(Q, w, h); if (padre.has(kk)) return;
        padre.set(kk, [k, i, d, dist]); if (esMeta(kk, w, h)) fin = kk; else sig.push(kk);
      });
      if (fin) break;
    }
    cola = sig;
  }
  if (!fin) return null;
  // reconstruir: en cada paso hay que localizar el bloque original por su ancla anterior
  const pasos = []; let k = fin;
  while (padre.get(k)) { const [pk, i, d, dist] = padre.get(k); const Pp = deClave(pk, w); pasos.push({ ancla: [Pp[i][0], Pp[i][1], Pp[i][2], Pp[i][3]], d, dist }); k = pk; }
  pasos.reverse();
  // traducir anclas a índices de P0 siguiendo la partida
  const P = P0.map(q => q.slice()), r = [];
  for (const s of pasos) {
    const i = P.findIndex(q => q[0] === s.ancla[0] && q[1] === s.ancla[1] && q[2] === s.ancla[2] && q[3] === s.ancla[3]);
    r.push({ i, d: s.d, dist: s.dist }); P[i][0] += DIR[s.d][0] * s.dist; P[i][1] += DIR[s.d][1] * s.dist;
  }
  return r;
}
function llenar(w, h, cnt, r) {
  const g = new Uint8Array(w * h), gx = metaX(w), P = [[gx, h - 2, 2, 2]];
  for (const [xx, yy] of [[gx, h - 2], [gx + 1, h - 2], [gx, h - 1], [gx + 1, h - 1]]) g[yy * w + xx] = 1;
  let vac = 2, B = cnt.B || 0, D = cnt.D, S = cnt.S, pasos = 0;
  const rec = pos => {
    if (++pasos > 200000) return false;
    while (pos < w * h && g[pos]) pos++;
    if (pos === w * h) return D === 0 && S === 0 && B === 0 && vac === 0;
    const x = pos % w, y = pos / w | 0, op = [];
    if (vac > 0) op.push('E'); if (S > 0) op.push('S');
    if (B > 0 && x + 1 < w && y + 1 < h && !g[pos + 1] && !g[pos + w] && !g[pos + w + 1]) op.push('K');
    if (D > 0 && x + 1 < w && !g[pos + 1]) op.push('H'); if (D > 0 && y + 1 < h && !g[pos + w]) op.push('V');
    barajar(op, r);
    for (const o of op) {
      if (o === 'E') { vac--; g[pos] = 1; if (rec(pos + 1)) return true; g[pos] = 0; vac++; }
      else if (o === 'S') { S--; g[pos] = 1; P.push([x, y, 1, 1]); if (rec(pos + 1)) return true; P.pop(); g[pos] = 0; S++; }
      else if (o === 'K') { B--; g[pos] = g[pos + 1] = g[pos + w] = g[pos + w + 1] = 1; P.push([x, y, 2, 2]); if (rec(pos + 1)) return true; P.pop(); g[pos] = g[pos + 1] = g[pos + w] = g[pos + w + 1] = 0; B++; }
      else if (o === 'H') { D--; g[pos] = g[pos + 1] = 1; P.push([x, y, 2, 1]); if (rec(pos + 1)) return true; P.pop(); g[pos] = g[pos + 1] = 0; D++; }
      else { D--; g[pos] = g[pos + w] = 1; P.push([x, y, 1, 2]); if (rec(pos + 1)) return true; P.pop(); g[pos] = g[pos + w] = 0; D++; }
    }
    return false;
  };
  return rec(0) ? P : null;
}
const FRAC = { facil: .25, medio: .5, dificil: .75, experto: 1 };
// Explora los estados alcanzables desde el diseño P0 y mide la distancia real hasta la salida (búsqueda desde todas las metas a la vez)
function analizar(P0, w, h, cap) {
  const k0 = claveDe(P0, w, h), vistos = new Set([k0]); let cola = [k0];
  while (cola.length && vistos.size < cap) {
    const sig = [];
    for (const k of cola) vecinos(deClave(k, w), w, h, Q => { const kk = claveDe(Q, w, h); if (!vistos.has(kk)) { vistos.add(kk); sig.push(kk); } });
    cola = sig;
  }
  const dist = new Map(); cola = [];
  for (const k of vistos) if (esMeta(k, w, h)) { dist.set(k, 0); cola.push(k); }
  const niveles = [cola.slice()];
  while (cola.length) {
    const sig = [], dd = niveles.length;
    for (const k of cola) vecinos(deClave(k, w), w, h, Q => { const kk = claveDe(Q, w, h); if (vistos.has(kk) && !dist.has(kk)) { dist.set(kk, dd); sig.push(kk); } });
    if (sig.length) niveles.push(sig); cola = sig;
  }
  return niveles;                                              // niveles[d] = estados a d movimientos de la salida
}
function generarColores(tam, nivel, r) {
  const T = TAMANOS.colores[tam], { w, h } = T, grande = w * h > 20, cap = grande ? 40000 : 150000;
  let mejor = null;
  for (let intento = 0; intento < (grande ? 3 : 10); intento++) {
    const P0 = llenar(w, h, T, r); if (!P0) continue;
    const niveles = analizar(P0, w, h, cap), max = niveles.length - 1;
    if (!mejor || max > mejor.max) mejor = { niveles, max };
    if (max >= 50 && intento >= 3) break;
  }
  if (!mejor || mejor.max < 4) return null;
  const { niveles, max } = mejor, meta = Math.max(2, Math.round(max * FRAC[nivel]));
  for (let intento = 0; intento < 6; intento++) {
    let d = Math.min(max, meta), cand = []; for (; d >= 1 && !cand.length; d--) cand = niveles[d];
    if (!cand.length) return null;
    const P = deClave(cand[r() * cand.length | 0], w);
    const Pf = [P[0], ...barajar(P.slice(1), r)], sol = solucionColores(Pf, w, h);
    if (sol && sol.length) return { p: Pf, opt: sol.length };
  }
  return null;
}

/* ---------- números ---------- */
const PASOS = { facil: 4, medio: 10, dificil: 30, experto: 120 };
function generarNumeros(tam, nivel, r) {
  const { w, h } = TAMANOS.numeros[tam], n = w * h, b = Array.from({ length: n }, (_, i) => (i + 1) % n);   // b[celda] = ficha (0 = hueco)
  let hz = n - 1, prev = -1; const pasos = Math.max(8, n * PASOS[nivel]);
  for (let s = 0; s < pasos || b.every((v, i) => v === (i + 1) % n); s++) {
    const x = hz % w, y = hz / w | 0, op = [];
    for (let d = 0; d < 4; d++) { const nx = x + DIR[d][0], ny = y + DIR[d][1]; if (nx >= 0 && nx < w && ny >= 0 && ny < h && (d + 2) % 4 !== prev) op.push(d); }
    const d = op[r() * op.length | 0], c = (y + DIR[d][1]) * w + x + DIR[d][0];
    b[hz] = b[c]; b[c] = 0; hz = c; prev = d;
  }
  const p = Array.from({ length: n - 1 }, () => [0, 0, 1, 1]);
  b.forEach((v, c) => { if (v) { p[v - 1][0] = c % w; p[v - 1][1] = c / w | 0; } });
  return { p, opt: 0 };
}
export function generar(modo, tam, nivel, semilla = Math.random()) {
  if (!dims(modo, tam) || !Object.hasOwn(NIVELES, nivel)) return null;
  const r = mulberry(hash(semilla));
  return modo === 'colores' ? generarColores(tam, nivel, r) : generarNumeros(tam, nivel, r);
}

/* ---------- pista para números (A* ponderado) ---------- */
export function pistaNumeros(S, limite = 120000) {
  const { w, h } = S, n = w * h, b = new Array(n).fill(0);
  S.p.forEach(([x, y], i) => { b[y * w + x] = i + 1; });
  const W = n <= 9 ? 1 : n <= 12 ? 2 : n <= 16 ? 3 : n <= 20 ? 6 : 9;
  const man = (v, c) => (v ? Math.abs((v - 1) % w - c % w) + Math.abs(((v - 1) / w | 0) - (c / w | 0)) : 0);
  let h0 = 0; b.forEach((v, c) => { h0 += man(v, c); });
  const abierta = [[h0 * W, 0, b.join(',')]], mejor = new Map([[b.join(','), [0, null, -1]]]);
  const sube = i => { while (i > 0) { const p = (i - 1) >> 1; if (abierta[p][0] <= abierta[i][0]) break; [abierta[p], abierta[i]] = [abierta[i], abierta[p]]; i = p; } };
  const baja = i => { for (;;) { let m = i; const a = 2 * i + 1, c = a + 1; if (a < abierta.length && abierta[a][0] < abierta[m][0]) m = a; if (c < abierta.length && abierta[c][0] < abierta[m][0]) m = c; if (m === i) break; [abierta[m], abierta[i]] = [abierta[i], abierta[m]]; i = m; } };
  let fin = null, visitados = 0;
  while (abierta.length && visitados < limite) {
    const top = abierta[0], last = abierta.pop(); if (abierta.length) { abierta[0] = last; baja(0); }
    const [, g, k] = top; if (g > mejor.get(k)[0]) continue; visitados++;
    const a = k.split(',').map(Number); let hh = 0; a.forEach((v, c) => { hh += man(v, c); }); if (hh === 0) { fin = k; break; }
    const hz = a.indexOf(0), x = hz % w, y = hz / w | 0;
    for (let d = 0; d < 4; d++) {
      const nx = x + DIR[d][0], ny = y + DIR[d][1]; if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const c = ny * w + nx, v = a[c], hn = hh - man(v, c) + man(v, hz); a[hz] = v; a[c] = 0; const kk = a.join(','); a[c] = v; a[hz] = 0;
      if (!mejor.has(kk) || mejor.get(kk)[0] > g + 1) { mejor.set(kk, [g + 1, k, v]); abierta.push([g + 1 + W * hn, g + 1, kk]); sube(abierta.length - 1); }
    }
  }
  if (!fin) return null;
  let k = fin, ficha = -1; while (mejor.get(k)[1] !== null) { const [, pk, v] = mejor.get(k); ficha = v; k = pk; }
  return ficha > 0 ? { i: ficha - 1 } : null;
}
export function pista(S) {
  if (S.modo === 'colores') { const s = solucionColores(S.p, S.w, S.h); return s && s.length ? s[0] : null; }
  const m = pistaNumeros(S); if (m) return m;
  const mm = S.p.findIndex((q, i) => { const t = haciaHueco(S, i); return t && t.n === 1; }); return mm >= 0 ? { i: mm } : null;
}

/* ---------- partida: creación y validación ---------- */
export function nueva(modo, tam, nivel, semilla) {
  const g = generar(modo, tam, nivel, semilla); if (!g) return null; const { w, h } = dims(modo, tam);
  return { modo, tam, nivel, w, h, p: g.p.map(q => q.slice()), ini: g.p.map(q => q.slice()), hist: [], movs: 0, t: 0, opt: g.opt, done: false };
}
export function reiniciar(S) { S.p = S.ini.map(q => q.slice()); S.hist = []; S.movs = 0; S.done = false; }
const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
function piezasOk(modo, T, P) {
  if (!Array.isArray(P)) return false;
  const { w, h } = T, g = new Int16Array(w * h).fill(-1); let G = 0, D = 0, S = 0;
  if (modo === 'numeros' && P.length !== w * h - 1) return false;
  if (modo === 'colores' && P.length > 40) return false;
  for (let i = 0; i < P.length; i++) {
    const q = P[i]; if (!Array.isArray(q) || q.length !== 4 || !q.every(Number.isInteger)) return false;
    const [x, y, pw, ph] = q;
    if (modo === 'numeros' ? (pw !== 1 || ph !== 1) : !((pw === 2 && ph === 2) || (pw === 2 && ph === 1) || (pw === 1 && ph === 2) || (pw === 1 && ph === 1))) return false;
    if (x < 0 || y < 0 || x + pw > w || y + ph > h) return false;
    for (let yy = y; yy < y + ph; yy++) for (let xx = x; xx < x + pw; xx++) { if (g[yy * w + xx] !== -1) return false; g[yy * w + xx] = i; }
    if (pw === 2 && ph === 2) G++; else if (pw === 1 && ph === 1) S++; else D++;
  }
  if (modo === 'colores') { if (G !== 1 + (T.B || 0) || D !== T.D || S !== T.S || !(P[0][2] === 2 && P[0][3] === 2)) return false; }
  return true;
}
export function validar(d) {
  if (!d || typeof d !== 'object') return null;
  const T = dims(d.modo, d.tam); if (!T || !Object.hasOwn(NIVELES, d.nivel)) return null;
  if (!piezasOk(d.modo, T, d.p) || !piezasOk(d.modo, T, d.ini)) return null;
  if (d.p.length !== d.ini.length) return null;
  const hist = Array.isArray(d.hist) ? d.hist.filter(l => Array.isArray(l) && l.length > 0 && l.length <= 6 && l.every(e => Array.isArray(e) && e.length === 3 && ent(e[0], 0, d.p.length - 1) && ent(e[1], 0, T.w - 1) && ent(e[2], 0, T.h - 1))).slice(-600) : [];
  const S = { modo: d.modo, tam: d.tam, nivel: d.nivel, w: T.w, h: T.h, p: d.p.map(q => q.slice()), ini: d.ini.map(q => q.slice()), hist,
    movs: ent(d.movs, 0, 1e6) ? d.movs : 0, t: ent(d.t, 0, 1e7) ? d.t : 0, opt: ent(d.opt, 0, 1e4) ? d.opt : 0, done: !!d.done, pistas: ent(d.pistas, 0, 1e4) ? d.pistas : 0 };
  return S;
}
