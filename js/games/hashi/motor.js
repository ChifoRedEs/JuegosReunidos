// Puentes Hashi: lógica pura (sin DOM). Las islas son [fila, columna, número]; los puentes, aristas entre islas vecinas en línea.
// Reglas: cada isla acaba con tantos puentes como su número (1 o 2 por pareja), los puentes no se cruzan y todas las islas forman una sola red.

export const NIVELES = {
  facil:   { nombre: 'Fácil',   w: 7,  h: 7,  islas: 10, dobles: .35, ciclos: .25, sinAdivinar: true,  ayuda: '7×7. Se resuelve solo por deducción.' },
  normal:  { nombre: 'Normal',  w: 9,  h: 9,  islas: 16, dobles: .40, ciclos: .30, sinAdivinar: true,  ayuda: '9×9. Se resuelve solo por deducción.' },
  dificil: { nombre: 'Difícil', w: 11, h: 11, islas: 25, dobles: .40, ciclos: .30, sinAdivinar: true,  ayuda: '11×11. Se resuelve solo por deducción.' },
  experto: { nombre: 'Experto', w: 13, h: 13, islas: 36, dobles: .42, ciclos: .30, sinAdivinar: false, ayuda: '13×13. Puede pedir probar hipótesis.' },
  maestro: { nombre: 'Maestro', w: 15, h: 15, islas: 48, dobles: .42, ciclos: .30, sinAdivinar: false, ayuda: '15×15. El más grande.' },
};
export const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];

/* ---------- estructura: aristas posibles entre islas vecinas ---------- */
export function construir(isl) {
  const N = isl.length, w = Math.max(...isl.map(i => i[1])) + 1, h = Math.max(...isl.map(i => i[0])) + 1, pos = new Map();
  isl.forEach((x, k) => pos.set(x[0] * 1000 + x[1], k));
  const E = [], inc = isl.map(() => []);
  for (let k = 0; k < N; k++) {
    const [r, c] = isl[k];
    for (const [dr, dc, hor] of [[0, 1, true], [1, 0, false]]) {                          // solo derecha y abajo: cada arista una vez
      let rr = r + dr, cc = c + dc;
      while (rr < h + 1 && cc < w + 1 && !pos.has(rr * 1000 + cc)) { rr += dr; cc += dc; }
      const b = pos.get(rr * 1000 + cc); if (b === undefined) continue;
      E.push({ a: k, b, hor, x: [] }); inc[k].push(E.length - 1); inc[b].push(E.length - 1);
    }
  }
  for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) if (E[i].hor !== E[j].hor && cruzan(isl, E[i], E[j])) { E[i].x.push(j); E[j].x.push(i); }
  return { isl, E, inc, N };
}
function cruzan(isl, p, q) {
  const H = p.hor ? p : q, V = p.hor ? q : p, f = isl[H.a][0], c1 = isl[H.a][1], c2 = isl[H.b][1], c = isl[V.a][1], r1 = isl[V.a][0], r2 = isl[V.b][0];
  return c > c1 && c < c2 && f > r1 && f < r2;
}

/* ---------- solucionador (propagación + búsqueda) ---------- */
function propagar(P, lo, hi) {
  const { isl, E, inc, N } = P; let cambio = true;
  while (cambio) {
    cambio = false;
    for (let e = 0; e < E.length; e++) if (lo[e] > 0) for (const x of E[e].x) if (hi[x] > 0) { if (lo[x] > 0) return false; hi[x] = 0; cambio = true; }
    for (let i = 0; i < N; i++) {
      let sl = 0, sh = 0; for (const e of inc[i]) { sl += lo[e]; sh += hi[e]; }
      const n = isl[i][2]; if (sl > n || sh < n) return false;
      for (const e of inc[i]) {
        const nl = Math.max(lo[e], n - (sh - hi[e])), nh = Math.min(hi[e], n - (sl - lo[e]));
        if (nl > nh) return false;
        if (nl !== lo[e] || nh !== hi[e]) { lo[e] = nl; hi[e] = nh; cambio = true; }
      }
    }
    if (N > 2) for (let e = 0; e < E.length; e++) {                                 // dos islas que se cerrarían entre sí, aisladas del resto
      const a = isl[E[e].a][2], b = isl[E[e].b][2];
      if (a === 1 && b === 1 && hi[e] > 0) { if (lo[e] > 0) return false; hi[e] = 0; cambio = true; }
      else if (a === 2 && b === 2 && hi[e] === 2) { if (lo[e] === 2) return false; hi[e] = 1; cambio = true; }
    }
  }
  return true;
}
function conexo(P, v) {
  const { E, N } = P, p = Array.from({ length: N }, (_, i) => i), f = i => { while (p[i] !== i) i = p[i] = p[p[i]]; return i; };
  let comp = N;
  for (let e = 0; e < E.length; e++) if (v[e] > 0) { const a = f(E[e].a), b = f(E[e].b); if (a !== b) { p[a] = b; comp--; } }
  return comp === 1;
}
export function inicial(P) {
  const lo = new Array(P.E.length).fill(0), hi = P.E.map(e => Math.min(2, P.isl[e.a][2], P.isl[e.b][2]));
  return { lo, hi };
}
// Devuelve { n (soluciones, hasta max), sol, adivina (hubo que probar hipótesis), nodos }
export function resolver(P, max = 2, tope = 200000) {
  const ctx = { n: 0, sol: null, adivina: false, nodos: 0, tope };
  const { lo, hi } = inicial(P);
  buscar(P, lo, hi, ctx, max, 0);
  return ctx;
}
function buscar(P, lo, hi, ctx, max, prof) {
  if (ctx.n >= max || ++ctx.nodos > ctx.tope) return;
  if (!propagar(P, lo, hi) || !conexo(P, hi)) return;
  let e = -1, mejor = 1e9;
  for (let k = 0; k < P.E.length; k++) if (lo[k] < hi[k]) {
    const q = Math.min(P.inc[P.E[k].a].filter(x => lo[x] < hi[x]).length, P.inc[P.E[k].b].filter(x => lo[x] < hi[x]).length);
    if (q < mejor) { mejor = q; e = k; }
  }
  if (e < 0) { if (conexo(P, lo)) { ctx.n++; if (!ctx.sol) ctx.sol = lo.slice(); } return; }
  const vivos = [];
  for (let v = hi[e]; v >= lo[e]; v--) { const l = lo.slice(), h = hi.slice(); l[e] = h[e] = v; if (propagar(P, l, h) && conexo(P, h)) vivos.push(v); }
  if (vivos.length > 1) ctx.adivina = true;
  for (const v of vivos) { const l = lo.slice(), h = hi.slice(); l[e] = h[e] = v; buscar(P, l, h, ctx, max, prof + 1); if (ctx.n >= max) return; }
}
// Valores que se deducen sin adivinar (para las pistas)
export function deducibles(P) { const { lo, hi } = inicial(P); if (!propagar(P, lo, hi)) return []; return lo.map((v, e) => (v === hi[e] ? v : -1)); }

/* ---------- estado de una partida ---------- */
export function grados(P, cur) { const g = new Array(P.N).fill(0); P.E.forEach((e, k) => { g[e.a] += cur[k]; g[e.b] += cur[k]; }); return g; }
export function resuelto(P, cur) { const g = grados(P, cur); return P.isl.every((x, i) => g[i] === x[2]) && conexo(P, cur) && cruces(P, cur) === 0; }
export function cruces(P, cur) { let n = 0; P.E.forEach((e, k) => { if (cur[k]) for (const x of e.x) if (x > k && cur[x]) n++; }); return n; }
// ¿Se puede aumentar la arista e? (no si cruza un puente puesto)
export const bloqueada = (P, cur, e) => P.E[e].x.some(x => cur[x] > 0);
// Componentes conectadas con lo puesto: devuelve array con el nº de componente de cada isla
export function componentes(P, cur) {
  const p = Array.from({ length: P.N }, (_, i) => i), f = i => { while (p[i] !== i) i = p[i] = p[p[i]]; return i; };
  P.E.forEach((e, k) => { if (cur[k] > 0) p[f(e.a)] = f(e.b); });
  return P.isl.map((_, i) => f(i));
}
// Pista: una arista cuyo valor es erróneo; prefiere las que se deducen por lógica
export function pista(P, cur, sol) {
  const ded = deducibles(P), mal = []; P.E.forEach((_, k) => { if (cur[k] !== sol[k]) mal.push(k); });
  if (!mal.length) return null;
  const logicas = mal.filter(k => ded[k] === sol[k]), lista = logicas.length ? logicas : mal;
  const k = lista[Math.random() * lista.length | 0]; return { e: k, v: sol[k], logica: logicas.length > 0 };
}

/* ---------- generador ---------- */
function azar(n) { return Math.random() * n | 0; }
function disponer(niv) {
  const { w, h } = niv, occ = Array.from({ length: h }, () => new Array(w).fill(0));            // 0 libre · 1 isla · 2 puente
  const isl = [], ar = [];                                                                       // ar: [a, b, k]
  const poner = (r, c) => { occ[r][c] = 1; isl.push([r, c]); return isl.length - 1; };
  poner(azar(h), azar(w));
  let fallos = 0;
  while (isl.length < niv.islas && fallos < 400) {
    const a = azar(isl.length), [r, c] = isl[a], [dr, dc] = DIRS[azar(4)], ln = 2 + azar(Math.max(1, Math.min(5, Math.max(w, h) - 2)));
    const rr = r + dr * ln, cc = c + dc * ln;
    if (rr < 0 || cc < 0 || rr >= h || cc >= w || occ[rr][cc] !== 0) { fallos++; continue; }
    let libre = true; for (let s = 1; s < ln; s++) if (occ[r + dr * s][c + dc * s] !== 0) { libre = false; break; }
    if (!libre) { fallos++; continue; }
    if (DIRS.some(([er, ec]) => { const yr = rr + er, yc = cc + ec; return yr >= 0 && yc >= 0 && yr < h && yc < w && occ[yr][yc] === 1; })) { fallos++; continue; }
    const b = poner(rr, cc); for (let s = 1; s < ln; s++) occ[r + dr * s][c + dc * s] = 2;
    ar.push([a, b, Math.random() < niv.dobles ? 2 : 1]);
  }
  // ciclos: puentes extra entre islas vecinas en línea con el camino libre
  const P = construir(isl.map(x => [x[0], x[1], 0]));
  const ya = new Set(ar.map(x => Math.min(x[0], x[1]) * 1000 + Math.max(x[0], x[1])));
  for (const e of P.E) {
    if (ya.has(Math.min(e.a, e.b) * 1000 + Math.max(e.a, e.b)) || Math.random() >= niv.ciclos) continue;
    const [r1, c1] = isl[e.a], [r2, c2] = isl[e.b]; let libre = true;
    for (let r = r1, c = c1; (r !== r2 || c !== c2) && libre; r += Math.sign(r2 - r1), c += Math.sign(c2 - c1)) if ((r !== r1 || c !== c1) && occ[r][c] !== 0) libre = false;
    if (!libre) continue;
    for (let r = r1 + Math.sign(r2 - r1), c = c1 + Math.sign(c2 - c1); r !== r2 || c !== c2; r += Math.sign(r2 - r1), c += Math.sign(c2 - c1)) occ[r][c] = 2;
    ar.push([e.a, e.b, Math.random() < niv.dobles ? 2 : 1]);
  }
  const deg = new Array(isl.length).fill(0); ar.forEach(([a, b, k]) => { deg[a] += k; deg[b] += k; });
  return isl.map((x, i) => [x[0], x[1], deg[i]]);
}
// Compacta: quita filas y columnas vacías de los bordes
function compactar(isl) {
  const r0 = Math.min(...isl.map(x => x[0])), c0 = Math.min(...isl.map(x => x[1]));
  return isl.map(x => [x[0] - r0, x[1] - c0, x[2]]);
}
export function generar(dif, intentos = 4000) {
  const niv = NIVELES[dif]; let mejor = null;
  for (let t = 0; t < intentos; t++) {
    let isl = disponer(niv); if (isl.length < Math.max(4, niv.islas - 3) || isl.some(x => x[2] < 1 || x[2] > 8)) continue;
    isl = compactar(isl).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const P = construir(isl), r = resolver(P, 2, 60000);
    if (r.n !== 1) continue;
    const w = Math.max(...isl.map(x => x[1])) + 1, h = Math.max(...isl.map(x => x[0])) + 1;
    const lleno = { w: Math.max(w, niv.w - 3), h: Math.max(h, niv.h - 3) };
    if (w < lleno.w || h < lleno.h) continue;                                                    // que aproveche el tablero
    if (niv.sinAdivinar && r.adivina) { mejor = mejor || { isl, w, h, sol: r.sol }; continue; }
    if (!niv.sinAdivinar && !r.adivina && t < intentos / 2) continue;                            // los difíciles piden alguna hipótesis
    return { isl, w, h, sol: r.sol };
  }
  if (mejor) return mejor;
  throw new Error('No se pudo generar el puzle');
}
