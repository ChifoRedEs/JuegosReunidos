// Reglas e IA del Conecta 4 y sus tableros (sin DOM, probable con Node).
// Casilla i = fila * cols + columna; la fila 0 es la de arriba. Jugador 1 = rojo (empieza), 2 = amarillo.
// Un movimiento es el número de columna (0..cols-1).
import { mejorJugada } from '../../core/ia/minimax.js';

export const VARIANTES = {
  mini:    { nombre: 'Mini 6×5',         corto: 'Mini',      cols: 6,  filas: 5, k: 4 },
  clasico: { nombre: 'Clásico 7×6',      corto: 'Clásico',   cols: 7,  filas: 6, k: 4 },
  grande:  { nombre: 'Grande 9×7',       corto: 'Grande',    cols: 9,  filas: 7, k: 4 },
  cinco:   { nombre: 'Conecta 5 · 10×8', corto: 'Conecta 5', cols: 10, filas: 8, k: 5 },
};
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
const CACHE = {};
function geo(V) {
  const key = V.cols + ',' + V.filas + ',' + V.k; if (CACHE[key]) return CACHE[key];
  const w = [];
  for (let r = 0; r < V.filas; r++) for (let c = 0; c < V.cols; c++) for (const [dr, dc] of DIRS) {
    const er = r + (V.k - 1) * dr, ec = c + (V.k - 1) * dc; if (er < 0 || er >= V.filas || ec < 0 || ec >= V.cols) continue;
    w.push(Array.from({ length: V.k }, (_, t) => (r + t * dr) * V.cols + c + t * dc));
  }
  const m = (V.cols - 1) / 2, orden = [...Array(V.cols).keys()].sort((a, b) => Math.abs(a - m) - Math.abs(b - m));
  const W = Array.from({ length: V.k + 1 }, (_, i) => i ? Math.pow(6, i - 1) : 0);
  const cen = Array.from({ length: V.cols * V.filas }, (_, i) => m - Math.abs(i % V.cols - m));
  return CACHE[key] = { w, orden, W, cen };
}
export const estadoInicial = v => ({ b: new Array(VARIANTES[v].cols * VARIANTES[v].filas).fill(0), turn: 1, n: 0, ult: -1, fin: null });
export function jugadas(e, v) {
  if (e.fin) return [];
  return geo(VARIANTES[v]).orden.filter(c => e.b[c] === 0);
}
function lineaDesde(b, i, t, V) {
  const r0 = i / V.cols | 0, c0 = i % V.cols;
  for (const [dr, dc] of DIRS) {
    const cells = [i];
    for (const s of [1, -1]) {
      let r = r0 + s * dr, c = c0 + s * dc;
      while (r >= 0 && r < V.filas && c >= 0 && c < V.cols && b[r * V.cols + c] === t) { cells.push(r * V.cols + c); r += s * dr; c += s * dc; }
    }
    if (cells.length >= V.k) return cells;
  }
  return null;
}
export function aplicar(e, col, v) {
  const V = VARIANTES[v], b = e.b.slice(), t = e.turn;
  let r = V.filas - 1; while (r >= 0 && b[r * V.cols + col]) r--;
  const i = r * V.cols + col; b[i] = t;
  const l = lineaDesde(b, i, t, V);
  const fin = l ? { w: t, linea: l } : e.n + 1 === V.cols * V.filas ? { w: 0, linea: [] } : null;
  return { b, turn: 3 - t, n: e.n + 1, ult: i, fin };
}
export function validarEstado(x, v) {
  const V = VARIANTES[v], N = V.cols * V.filas;
  if (!x || typeof x !== 'object' || !Array.isArray(x.b) || x.b.length !== N || !x.b.every(c => c === 0 || c === 1 || c === 2)) return null;
  if (x.turn !== 1 && x.turn !== 2) return null;
  if (!Number.isInteger(x.n) || x.n < 0 || x.n > N || !Number.isInteger(x.ult) || x.ult < -1 || x.ult >= N) return null;
  for (let c = 0; c < V.cols; c++) { let vacio = false; for (let r = V.filas - 1; r >= 0; r--) { const z = x.b[r * V.cols + c]; if (!z) vacio = true; else if (vacio) return null; } }   // gravedad
  const c1 = x.b.filter(z => z === 1).length, c2 = x.b.filter(z => z === 2).length;
  if (c1 < c2 || c1 - c2 > 1) return null;
  let fin = null;
  if (x.fin) {
    if (typeof x.fin !== 'object' || ![0, 1, 2].includes(x.fin.w) || !Array.isArray(x.fin.linea) || !x.fin.linea.every(i => Number.isInteger(i) && i >= 0 && i < N)) return null;
    fin = { w: x.fin.w, linea: x.fin.linea.slice() };
  }
  return { b: x.b.slice(), turn: x.turn, n: x.n, ult: x.ult, fin };
}

/* ---------- IA ---------- */
function evaluar(e, js, p, v) {
  if (e.fin) return e.fin.w === 0 ? 0 : -10000 - p;
  if (!js.length) return 0;
  const { w, W, cen } = geo(VARIANTES[v]), me = e.turn, b = e.b;
  let s = 0;
  for (const cells of w) {
    let a = 0, c = 0;
    for (const i of cells) { const x = b[i]; if (x === me) a++; else if (x) c++; }
    if (!c && a) s += W[a]; else if (!a && c) s -= W[c];
  }
  for (let i = 0; i < b.length; i++) if (b[i]) s += b[i] === me ? cen[i] * 2 : -cen[i] * 2;
  return s;
}
const NIVELES = {
  facil:   () => ({ prof: 1, ms: 300, ruido: 30 }),
  medio:   () => ({ prof: 4, ms: 700, ruido: 8 }),
  dificil: v => ({ prof: { mini: 9, clasico: 8, grande: 7, cinco: 6 }[v], ms: 1600, ruido: 0.9 }),
};
export function ia(e, v, nivel, rapido = false) {
  const cfg = NIVELES[nivel](v);
  return mejorJugada({
    estado: e, jugadas: s => jugadas(s, v), aplicar: (s, m) => aplicar(s, m, v), evaluar: (s, js, p) => evaluar(s, js, p, v),
    profundidad: rapido ? Math.min(cfg.prof, 6) : cfg.prof, tiempoMs: rapido ? 600 : cfg.ms, ruido: rapido ? 0 : cfg.ruido,
  });
}
export function reglasHTML(v) {
  const V = VARIANTES[v];
  return `<ul><li>Por turnos, cada jugador deja caer una ficha por una columna; cae hasta la casilla libre más baja. Empieza el rojo.</li>
    <li>Gana quien alinee <b>${V.k}</b> fichas seguidas en horizontal, vertical o diagonal (tablero de ${V.cols}×${V.filas}).</li>
    <li>Si se llena el tablero sin ganador, hay tablas.</li>
    <li>Toca (o pulsa Intro sobre) una columna para soltar la ficha. En ordenador verás una ficha fantasma sobre la columna. Con el teclado: ← → para moverte.</li>
    <li>💡 <b>Pista</b> marca la columna que recomienda la IA.</li></ul>`;
}
