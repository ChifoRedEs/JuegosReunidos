// Motor de Futoshiki (sin DOM, probable con Node).
// Un panel es { n, dado: [n*n] 0 o valor fijo, h: [n*n] desigualdad con la casilla de la DERECHA (0 ninguna, 1 «<», 2 «>»),
//               v: [n*n] desigualdad con la casilla de ABAJO (0 ninguna, 1 «<», 2 «>»), sol: [n*n] } con solución ÚNICA.
import { shuffle } from '../../core/dom.js';
import { cuadradoLatino } from '../calcudoku/generador.js';

export const TAMANOS = [4, 5, 6, 7, 8];
export const DIFICULTADES = {
  facil:   { nombre: 'Fácil',   ayuda: 'Muchas pistas y se resuelve sin adivinar.', quedan: .7,  sinRamas: true },
  medio:   { nombre: 'Medio',   ayuda: 'Menos números dados: hay que razonar con las desigualdades.', quedan: .35, sinRamas: false },
  dificil: { nombre: 'Difícil', ayuda: 'Casi nada dado; puede pedirte probar y descartar.', quedan: 0,   sinRamas: false },
};

/* ---------- resolutor (máscaras de candidatos) ---------- */
const bits = m => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
const bajo = m => 31 - Math.clz32(m & -m);            // menor valor presente (bit v = valor v)
const alto = m => 31 - Math.clz32(m);                  // mayor valor presente
export function resolver(p, { tope = 2, sinRamas = false } = {}) {
  const { n, dado, h, v } = p, N = n * n, TODO = ((1 << (n + 1)) - 2);
  const pares = [];                                    // [menor, mayor]
  for (let i = 0; i < N; i++) {
    if (i % n < n - 1 && h[i]) pares.push(h[i] === 1 ? [i, i + 1] : [i + 1, i]);
    if (i < N - n && v[i]) pares.push(v[i] === 1 ? [i, i + n] : [i + n, i]);
  }
  let cuenta = 0, sol = null, ramas = 0, abortado = false;
  const filas = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => r * n + c)), cols = Array.from({ length: n }, (_, c) => Array.from({ length: n }, (_, r) => r * n + c));
  const grupos = [...filas, ...cols];
  const propagar = c => {
    let cambio = true;
    while (cambio) {
      cambio = false;
      for (let i = 0; i < N; i++) {
        if (!c[i]) return false;
        if (bits(c[i]) === 1) {
          const r = i / n | 0, k = i % n, m = ~c[i];
          for (let j = 0; j < n; j++) {
            const a = r * n + j, b = j * n + k;
            if (a !== i && (c[a] & c[i])) { c[a] &= m; cambio = true; if (!c[a]) return false; }
            if (b !== i && (c[b] & c[i])) { c[b] &= m; cambio = true; if (!c[b]) return false; }
          }
        }
      }
      for (const [a, b] of pares) {                    // c[a] < c[b]
        const topeA = alto(c[b]) - 1, piso = bajo(c[a]) + 1;
        const ma = c[a] & ((1 << (topeA + 1)) - 1), mb = c[b] & ~((1 << piso) - 1);
        if (ma !== c[a]) { c[a] = ma; cambio = true; } if (mb !== c[b]) { c[b] = mb; cambio = true; }
        if (!c[a] || !c[b]) return false;
      }
      for (const g of grupos) {                        // únicos ocultos
        for (let val = 1; val <= n; val++) {
          const b = 1 << val; let cnt = 0, pos = -1;
          for (const i of g) if (c[i] & b) { cnt++; pos = i; }
          if (cnt === 0) return false;
          if (cnt === 1 && c[pos] !== b) { c[pos] = b; cambio = true; }
        }
      }
    }
    return true;
  };
  const rec = c => {
    if (cuenta >= tope || abortado) return;
    if (!propagar(c)) return;
    let mejor = -1, mc = 99;
    for (let i = 0; i < N; i++) { const k = bits(c[i]); if (k > 1 && k < mc) { mc = k; mejor = i; } }
    if (mejor < 0) { cuenta++; if (!sol) sol = c.map(bajo); return; }
    if (sinRamas) { abortado = true; return; }
    ramas++;
    for (let val = 1; val <= n; val++) { if (!(c[mejor] & (1 << val))) continue; const d = c.slice(); d[mejor] = 1 << val; rec(d); if (cuenta >= tope) return; }
  };
  const c0 = Array.from({ length: N }, (_, i) => (dado[i] ? 1 << dado[i] : TODO));
  rec(c0);
  return { n: cuenta, sol, ramas, atascado: abortado };
}
export const unica = (p, sinRamas = false) => resolver(p, { tope: 2, sinRamas }).n === 1;

/* ---------- comprobación ---------- */
// cur: [n*n] valores (0 vacío). Devuelve { dup:Set, mala:Set (desigualdades incumplidas: 'h12' / 'v12'), completo }.
export function evaluar(p, cur) {
  const { n, h, v } = p, N = n * n, dup = new Set(), mala = new Set();
  for (let i = 0; i < N; i++) { const x = cur[i]; if (!x) continue; for (let j = i + 1; j < N; j++) if (cur[j] === x && ((i / n | 0) === (j / n | 0) || i % n === j % n)) { dup.add(i); dup.add(j); } }
  for (let i = 0; i < N; i++) {
    if (i % n < n - 1 && h[i] && cur[i] && cur[i + 1] && (h[i] === 1 ? cur[i] > cur[i + 1] : cur[i] < cur[i + 1])) mala.add('h' + i);
    if (i < N - n && v[i] && cur[i] && cur[i + n] && (v[i] === 1 ? cur[i] > cur[i + n] : cur[i] < cur[i + n])) mala.add('v' + i);
  }
  return { dup, mala, completo: cur.every(Boolean) && !dup.size && !mala.size };
}

/* ---------- generador ---------- */
export function generar(n, nivel = 'medio') {
  const D = DIFICULTADES[nivel] || DIFICULTADES.medio, N = n * n;
  for (let intento = 0; intento < 40; intento++) {
    const sol = cuadradoLatino(n);
    const h = new Array(N).fill(0), v = new Array(N).fill(0), dado = sol.slice();
    for (let i = 0; i < N; i++) {
      if (i % n < n - 1) h[i] = sol[i] < sol[i + 1] ? 1 : 2;
      if (i < N - n) v[i] = sol[i] < sol[i + n] ? 1 : 2;
    }
    const p = { n, dado, h, v };
    const des = shuffle([...Array(N).keys()].flatMap(i => [['h', i], ['v', i]]).filter(([t, i]) => (t === 'h' ? i % n < n - 1 : i < N - n)));
    const num = shuffle([...Array(N).keys()].map(i => ['d', i]));
    const quitar = (lista, hasta) => { let restan = lista.length; for (const [t, i] of lista) { if (restan <= hasta) break; const X = t === 'd' ? p.dado : p[t], a = X[i]; X[i] = 0; if (!unica(p)) X[i] = a; else restan--; } };
    // los números se quitan casi todos (los que queden dependen del nivel); las desigualdades sostienen el resto
    quitar(num, Math.round(N * (nivel === 'facil' ? .3 : nivel === 'medio' ? .12 : 0)));
    quitar(des, Math.round(des.length * (nivel === 'facil' ? .75 : 0)));
    if (nivel !== 'facil') quitar(num, 0);
    const r = resolver(p, { tope: 2 });
    if (r.n !== 1) continue;
    if (D.sinRamas && resolver(p, { tope: 2, sinRamas: true }).atascado) continue;
    if (nivel === 'dificil' && (r.ramas < 2 && intento < 20)) continue;
    return { n, dado: dado.slice(), h: h.slice(), v: v.slice(), sol: sol.slice(), ramas: r.ramas };
  }
  // último recurso: todas las desigualdades y los números necesarios
  const sol = cuadradoLatino(n), h = new Array(N).fill(0), v = new Array(N).fill(0), dado = new Array(N).fill(0);
  for (let i = 0; i < N; i++) { if (i % n < n - 1) h[i] = sol[i] < sol[i + 1] ? 1 : 2; if (i < N - n) v[i] = sol[i] < sol[i + n] ? 1 : 2; }
  const p = { n, dado, h, v }; for (const i of shuffle([...Array(N).keys()])) { if (unica(p)) break; dado[i] = sol[i]; }
  return { n, dado, h, v, sol, ramas: 0 };
}
