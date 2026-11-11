// Reglas e IA del 3 en raya y sus variantes (sin DOM, probable con Node).
// Casilla i = fila * n + columna. Jugador 1 = X (empieza), jugador 2 = O.
import { mejorJugada } from '../../core/ia/minimax.js';

export const VARIANTES = {
  clasico:  { nombre: 'Clásico 3×3',            corto: '3×3',      n: 3, k: 3, max: 0 },
  infinito: { nombre: 'Infinito 3×3',           corto: 'Infinito', n: 3, k: 3, max: 3 },
  cuatro:   { nombre: '4×4 · cuatro en raya',   corto: '4×4',      n: 4, k: 4, max: 0 },
  cinco:    { nombre: '5×5 · cuatro en raya',   corto: '5×5',      n: 5, k: 4, max: 0 },
};
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
const CACHE = {};
// ventanas de k casillas alineadas, índice por casilla y orden centro-primero
export function geo(n, k) {
  const key = n + ',' + k; if (CACHE[key]) return CACHE[key];
  const w = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) for (const [dr, dc] of DIRS) {
    const er = r + (k - 1) * dr, ec = c + (k - 1) * dc; if (er < 0 || er >= n || ec < 0 || ec >= n) continue;
    w.push(Array.from({ length: k }, (_, t) => (r + t * dr) * n + c + t * dc));
  }
  const pc = Array.from({ length: n * n }, () => []); w.forEach((cells, wi) => cells.forEach(i => pc[i].push(wi)));
  const m = (n - 1) / 2, dist = i => Math.abs((i / n | 0) - m) + Math.abs(i % n - m);
  const orden = [...Array(n * n).keys()].sort((a, b) => dist(a) - dist(b));
  const W = Array.from({ length: k + 1 }, (_, i) => i ? Math.pow(8, i - 1) : 0);
  return CACHE[key] = { w, pc, orden, W };
}

export const estadoInicial = v => ({ b: new Array(VARIANTES[v].n ** 2).fill(0), turn: 1, n: 0, ult: -1, fin: null, q: [[], []] });
export function jugadas(e, v) {
  if (e.fin) return [];
  const { orden } = geo(VARIANTES[v].n, VARIANTES[v].k);
  return orden.filter(i => e.b[i] === 0);
}
export function aplicar(e, i, v) {
  const V = VARIANTES[v], { w, pc } = geo(V.n, V.k), b = e.b.slice(), q = [e.q[0].slice(), e.q[1].slice()], t = e.turn;
  b[i] = t;
  if (V.max) { const qq = q[t - 1]; qq.push(i); if (qq.length > V.max) b[qq.shift()] = 0; }   // la ficha más antigua desaparece
  let fin = null;
  for (const wi of pc[i]) if (w[wi].every(c => b[c] === t)) { fin = { w: t, linea: w[wi].slice() }; break; }
  if (!fin && !V.max && e.n + 1 === V.n * V.n) fin = { w: 0, linea: [] };
  return { b, turn: 3 - t, n: e.n + 1, ult: i, fin, q };
}
export function validarEstado(x, v) {
  const V = VARIANTES[v], N = V.n * V.n;
  if (!x || typeof x !== 'object' || !Array.isArray(x.b) || x.b.length !== N || !x.b.every(c => c === 0 || c === 1 || c === 2)) return null;
  if (x.turn !== 1 && x.turn !== 2) return null;
  if (!Number.isInteger(x.n) || x.n < 0 || x.n > 5000 || !Number.isInteger(x.ult) || x.ult < -1 || x.ult >= N) return null;
  const q = Array.isArray(x.q) && x.q.length === 2 && x.q.every(a => Array.isArray(a) && a.length <= Math.max(V.max, 0) && a.every(i => Number.isInteger(i) && i >= 0 && i < N)) ? x.q.map(a => a.slice()) : [[], []];
  let fin = null;
  if (x.fin) {
    if (typeof x.fin !== 'object' || ![0, 1, 2].includes(x.fin.w) || !Array.isArray(x.fin.linea) || !x.fin.linea.every(i => Number.isInteger(i) && i >= 0 && i < N)) return null;
    fin = { w: x.fin.w, linea: x.fin.linea.slice() };
  }
  const c1 = x.b.filter(c => c === 1).length, c2 = x.b.filter(c => c === 2).length;
  if (!V.max && Math.abs(c1 - c2) > 1) return null;
  return { b: x.b.slice(), turn: x.turn, n: x.n, ult: x.ult, fin, q };
}

/* ---------- IA: minimax con poda alfa-beta (core/ia/minimax.js) ---------- */
function evaluar(e, js, p, v) {
  if (e.fin) return e.fin.w === 0 ? 0 : -10000 - p;       // quien mueve ya perdió (el rival acaba de ganar)
  if (!js.length) return 0;
  const { w, W } = geo(VARIANTES[v].n, VARIANTES[v].k), me = e.turn;
  let s = 0;
  for (const cells of w) {
    let a = 0, c = 0;
    for (const i of cells) { const x = e.b[i]; if (x === me) a++; else if (x) c++; }
    if (!c && a) s += W[a]; else if (!a && c) s -= W[c];
  }
  return s;
}
const NIVELES = {
  facil:   () => ({ prof: 1, ms: 300, ruido: 25 }),
  medio:   () => ({ prof: 3, ms: 600, ruido: 6 }),
  dificil: v => ({ prof: { clasico: 9, infinito: 8, cuatro: 8, cinco: 6 }[v], ms: 1500, ruido: 0.9 }),
};
export function ia(e, v, nivel, rapido = false) {
  const cfg = NIVELES[nivel](v);
  return mejorJugada({
    estado: e, jugadas: s => jugadas(s, v), aplicar: (s, m) => aplicar(s, m, v), evaluar: (s, js, p) => evaluar(s, js, p, v),
    profundidad: cfg.prof, tiempoMs: rapido ? 600 : cfg.ms, ruido: rapido ? 0 : cfg.ruido,
  });
}
export function reglasHTML(v) {
  const V = VARIANTES[v];
  if (V.max) return `<ul><li>Cada jugador coloca una ficha por turno en el tablero de 3×3. Gana quien alinee <b>tres</b> en fila, columna o diagonal.</li>
    <li>Solo puedes tener <b>${V.max} fichas</b> a la vez: al colocar la cuarta, desaparece tu ficha más antigua (la verás atenuada y con borde discontinuo).</li>
    <li>No hay empates: ¡planifica qué ficha va a desaparecer!</li><li>💡 <b>Pista</b> te sugiere la mejor jugada.</li></ul>`;
  return `<ul><li>Cada jugador coloca una ficha por turno. Empieza la X.</li>
    <li>Gana quien alinee <b>${V.k}</b> fichas seguidas en fila, columna o diagonal en el tablero de ${V.n}×${V.n}.</li>
    <li>Si se llena el tablero sin ganador, hay tablas.</li>
    ${V.n === 3 ? '<li>En el 3×3 la CPU en <b>Difícil</b> juega perfecto: lo máximo que puedes conseguir es empatar.</li>' : ''}
    <li>💡 <b>Pista</b> te sugiere la mejor jugada.</li></ul>`;
}
