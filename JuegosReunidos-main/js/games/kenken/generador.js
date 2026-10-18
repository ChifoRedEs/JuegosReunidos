// Generador y resolvedor de KenKen (sin DOM, probable con Node).
// Un panel es: { n, sol: [n*n], cages: [{ cells:[idx…], op:'=' | '+' | '-' | 'x' | '/', t:objetivo }] } con solución ÚNICA garantizada.
import { shuffle, rnd } from '../../core/dom.js';

export const TAMANOS = [3, 4, 5, 6, 7];
export const DIFICULTADES = {
  facil:   { nombre: 'Fácil',   ops: ['+', 'x'],           pesos: [[1, .3], [2, .6], [3, .1]],            ayuda: 'Solo sumas y multiplicaciones, jaulas pequeñas y algunas casillas ya dadas.' },
  medio:   { nombre: 'Medio',   ops: ['+', '-', 'x', '/'], pesos: [[1, .12], [2, .5], [3, .3], [4, .08]], ayuda: 'Las cuatro operaciones y jaulas de hasta 4 casillas.' },
  dificil: { nombre: 'Difícil', ops: ['+', '-', 'x', '/'], pesos: [[1, .04], [2, .36], [3, .38], [4, .22]], ayuda: 'Jaulas más grandes y muy pocas casillas dadas.' },
  experto: { nombre: 'Experto', ops: ['+', '-', 'x', '/'], pesos: [[1, .02], [2, .24], [3, .36], [4, .24], [5, .14]], ayuda: 'Jaulas de hasta 5 casillas y casi ninguna pista.' },
};
const vec = (n, i) => { const r = i / n | 0, c = i % n, o = []; if (r > 0) o.push(i - n); if (r < n - 1) o.push(i + n); if (c > 0) o.push(i - 1); if (c < n - 1) o.push(i + 1); return o; };
// Cuadrado latino aleatorio de verdad (rellenado con vuelta atrás en orden al azar). Antes solo salían permutaciones
// del cuadrado cíclico (r + c) mod n, que dejan fuera muchas soluciones posibles (en 4×4, todas las del tipo «Klein»).
export function cuadradoLatino(n) {
  const s = new Array(n * n).fill(0), fila = Array.from({ length: n }, () => 0), col = Array.from({ length: n }, () => 0);
  let pasos = 0;
  const rec = i => {
    if (i === n * n) return true;
    if (++pasos > 20000) return false;                            // tope: se reintenta con otro orden
    const r = i / n | 0, c = i % n;
    for (const v of shuffle([...Array(n).keys()].map(x => x + 1))) {
      const b = 1 << v; if ((fila[r] & b) || (col[c] & b)) continue;
      s[i] = v; fila[r] |= b; col[c] |= b;
      if (rec(i + 1)) return true;
      s[i] = 0; fila[r] &= ~b; col[c] &= ~b;
    }
    return false;
  };
  for (let k = 0; k < 20; k++) { pasos = 0; s.fill(0); fila.fill(0); col.fill(0); if (rec(0)) return s; }
  // respaldo (prácticamente imposible llegar aquí): cuadrado cíclico permutado
  const fs = shuffle([...Array(n).keys()]), cs = shuffle([...Array(n).keys()]), sim = shuffle([...Array(n).keys()].map(x => x + 1)), o = [];
  for (const r of fs) for (const c of cs) o.push(sim[(r + c) % n]);
  return o;
}
export function evaluar(op, vals) {                      // objetivo que produce una jaula con esos valores
  if (op === '=') return vals[0];
  if (op === '+') return vals.reduce((a, b) => a + b, 0);
  if (op === 'x') return vals.reduce((a, b) => a * b, 1);
  if (op === '-') return Math.abs(vals[0] - vals[1]);
  return Math.max(...vals) / Math.min(...vals);
}
export function cumple(cage, vals) {                       // ¿esos valores completos cumplen la jaula?
  if (cage.op === '/') { const a = Math.max(...vals), b = Math.min(...vals); return a % b === 0 && a / b === cage.t; }
  return evaluar(cage.op, vals) === cage.t;
}
function elegirTamano(pesos, restante) { let r = Math.random(), acum = 0; for (const [t, p] of pesos) { acum += p; if (r <= acum && t <= restante) return t; } return 2; }
function particionar(n, dif) {
  const N = n * n, jaula = new Array(N).fill(-1), cages = [], cfg = DIFICULTADES[dif];
  for (const i of shuffle([...Array(N).keys()])) {
    if (jaula[i] >= 0) continue;
    let objetivo = elegirTamano(cfg.pesos, 5); const celdas = [i]; jaula[i] = cages.length;
    while (celdas.length < objetivo) {
      const cand = []; for (const c of celdas) for (const v of vec(n, c)) if (jaula[v] < 0 && !cand.includes(v)) cand.push(v);
      if (!cand.length) break;
      const v = cand[rnd(cand.length)]; jaula[v] = cages.length; celdas.push(v);
    }
    cages.push({ cells: celdas.sort((a, b) => a - b) });
  }
  return cages;
}
function asignarOps(cages, sol, dif) {
  const ops = DIFICULTADES[dif].ops;
  for (const g of cages) {
    const vals = g.cells.map(i => sol[i]);
    if (g.cells.length === 1) { g.op = '='; g.t = vals[0]; continue; }
    let cand = ops.filter(o => g.cells.length === 2 || o === '+' || o === 'x');
    if (g.cells.length === 2) cand = cand.filter(o => o !== '/' || Math.max(...vals) % Math.min(...vals) === 0).filter(o => o !== '-' || vals[0] !== vals[1]);
    g.op = cand[rnd(cand.length)]; g.t = evaluar(g.op, vals);
  }
}
// Cuenta soluciones (hasta `limite`) con vuelta atrás: filas/columnas sin repetir y todas las jaulas cumplidas.
export function contar(n, cages, limite = 2, ms = 1500) {
  const N = n * n, jaulaDe = new Array(N); cages.forEach((g, k) => g.cells.forEach(i => { jaulaDe[i] = k; }));
  const ult = cages.map(g => g.cells[g.cells.length - 1]), val = new Array(N).fill(0), fila = Array.from({ length: n }, () => new Uint8Array(n + 1)), col = Array.from({ length: n }, () => new Uint8Array(n + 1));
  const t0 = performance.now(); let sols = 0, nodos = 0, abort = false;
  const parcialOk = (k, i) => {
    const g = cages[k], vals = []; let pend = 0;
    for (const c of g.cells) { if (c <= i) vals.push(val[c]); else pend++; }
    if (!pend) return cumple(g, vals);
    if (g.op === '+') { const s = vals.reduce((a, b) => a + b, 0); return s + pend <= g.t && s + pend * n >= g.t; }
    if (g.op === 'x') { const p = vals.reduce((a, b) => a * b, 1); return g.t % p === 0; }
    return true;
  };
  (function rec(i) {
    if (abort || sols >= limite) return;
    if ((++nodos & 1023) === 0 && performance.now() - t0 > ms) { abort = true; return; }
    if (i === N) { sols++; return; }
    const r = i / n | 0, c = i % n, k = jaulaDe[i];
    for (let v = 1; v <= n; v++) {
      if (fila[r][v] || col[c][v]) continue;
      val[i] = v; fila[r][v] = col[c][v] = 1;
      // la jaula se evalúa cuando se completa en orden de lectura (todas sus celdas ≤ i) o parcialmente para podar
      if (parcialOk(k, i)) rec(i + 1);
      fila[r][v] = col[c][v] = 0; val[i] = 0;
      if (abort || sols >= limite) return;
    }
  })(0);
  return abort ? -1 : sols;
}
function otraSolucion(n, cages, sol) {                    // busca una solución distinta de `sol` (para reforzar el panel)
  const N = n * n, jaulaDe = new Array(N); cages.forEach((g, k) => g.cells.forEach(i => { jaulaDe[i] = k; }));
  const val = new Array(N).fill(0), fila = Array.from({ length: n }, () => new Uint8Array(n + 1)), col = Array.from({ length: n }, () => new Uint8Array(n + 1));
  const t0 = performance.now(); let res = null, abort = false, nodos = 0;
  const ok = (k, i) => { const g = cages[k], vals = []; let pend = 0; for (const c of g.cells) { if (c <= i) vals.push(val[c]); else pend++; } if (!pend) return cumple(g, vals); if (g.op === '+') { const s = vals.reduce((a, b) => a + b, 0); return s + pend <= g.t && s + pend * n >= g.t; } if (g.op === 'x') return g.t % vals.reduce((a, b) => a * b, 1) === 0; return true; };
  (function rec(i, difiere) {
    if (res || abort) return; if ((++nodos & 1023) === 0 && performance.now() - t0 > 1500) { abort = true; return; }
    if (i === N) { if (difiere) res = val.slice(); return; }
    const r = i / n | 0, c = i % n;
    for (let v = 1; v <= n; v++) {
      if (fila[r][v] || col[c][v]) continue; val[i] = v; fila[r][v] = col[c][v] = 1;
      if (ok(jaulaDe[i], i)) rec(i + 1, difiere || v !== sol[i]);
      fila[r][v] = col[c][v] = 0; val[i] = 0; if (res || abort) return;
    }
  })(0, false);
  return res;
}
function conectada(n, celdas) { const s = new Set(celdas), vis = new Set([celdas[0]]), pila = [celdas[0]]; while (pila.length) { const x = pila.pop(); for (const v of vec(n, x)) if (s.has(v) && !vis.has(v)) { vis.add(v); pila.push(v); } } return vis.size === celdas.length; }
export function generar(n, dif) {
  for (let intento = 0; intento < 60; intento++) {
    const sol = cuadradoLatino(n), cages = particionar(n, dif); asignarOps(cages, sol, dif);
    for (let ronda = 0; ronda < 40; ronda++) {
      const otra = otraSolucion(n, cages, sol);
      if (!otra) return { n, sol, cages: cages.map(g => ({ cells: g.cells, op: g.op, t: g.t })) };
      // reforzar: separar como casilla dada una celda en la que difieren, sin romper la conexión de su jaula
      const dif2 = [...Array(n * n).keys()].filter(i => otra[i] !== sol[i]);
      let hecho = false;
      for (const i of shuffle(dif2)) {
        const k = cages.findIndex(g => g.cells.includes(i)), g = cages[k]; if (g.cells.length < 2) continue;
        const resto = g.cells.filter(x => x !== i); if (!conectada(n, resto)) continue;
        g.cells = resto; cages.push({ cells: [i], op: '=', t: sol[i] });
        if (resto.length === 1) { g.op = '='; g.t = sol[resto[0]]; } else { const vals = resto.map(x => sol[x]); let cand = DIFICULTADES[dif].ops.filter(o => resto.length === 2 || o === '+' || o === 'x'); if (resto.length === 2) cand = cand.filter(o => o !== '/' || Math.max(...vals) % Math.min(...vals) === 0).filter(o => o !== '-' || vals[0] !== vals[1]); g.op = cand[rnd(cand.length)]; g.t = evaluar(g.op, vals); }
        hecho = true; break;
      }
      if (!hecho) break;
    }
  }
  throw new Error('No se pudo generar el KenKen');
}
// colores de jaula: ninguna jaula vecina comparte color
export const simbolo = op => ({ '+': '+', '-': '−', 'x': '×', '/': '÷', '=': '' }[op]);
