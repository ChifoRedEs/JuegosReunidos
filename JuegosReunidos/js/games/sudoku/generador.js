// Generador de Sudokus con SOLUCIÓN ÚNICA garantizada.
// Se parte de una solución completa y se van quitando casillas de una en una; cada retirada se
// deshace si el tablero deja de tener una única solución (se comprueba contando soluciones, tope 2).
import { shuffle } from '../../core/dom.js';

const POP = new Uint8Array(1024); for (let i = 1; i < 1024; i++) POP[i] = POP[i >> 1] + (i & 1);
export const PARES = Array.from({ length: 81 }, (_, i) => {
  const r = i / 9 | 0, c = i % 9, out = [];
  for (let j = 0; j < 81; j++) { const r2 = j / 9 | 0, c2 = j % 9; if (j !== i && (r === r2 || c === c2 || ((r / 3 | 0) === (r2 / 3 | 0) && (c / 3 | 0) === (c2 / 3 | 0)))) out.push(j); }
  return out;
});
export const sonPares = (i, j) => PARES[i].includes(j);
const caja = i => ((i / 9 | 0) / 3 | 0) * 3 + ((i % 9) / 3 | 0);

// Máscara de dígitos posibles (bits 1..9) para la casilla i según el tablero actual.
export function candidatos(g, i) { let usado = 0; for (const j of PARES[i]) if (g[j]) usado |= 1 << g[j]; return ~usado & 0x3FE; }

export function contarSoluciones(cur, limite = 2) {
  const f = new Int16Array(9), c = new Int16Array(9), k = new Int16Array(9), g = cur.slice();
  for (let i = 0; i < 81; i++) {
    const v = g[i]; if (!v) continue;
    const b = 1 << v, r = i / 9 | 0, cc = i % 9, kk = caja(i);
    if ((f[r] & b) || (c[cc] & b) || (k[kk] & b)) return 0;
    f[r] |= b; c[cc] |= b; k[kk] |= b;
  }
  let n = 0;
  const rec = () => {
    let mejor = -1, mask = 0, cnt = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const m = ~(f[i / 9 | 0] | c[i % 9] | k[caja(i)]) & 0x3FE, p = POP[m];
      if (p < cnt) { cnt = p; mejor = i; mask = m; if (p <= 1) break; }
    }
    if (mejor < 0) { n++; return n >= limite; }
    if (cnt === 0) return false;
    const r = mejor / 9 | 0, cc = mejor % 9, kk = caja(mejor);
    for (let v = 1; v <= 9; v++) {
      const b = 1 << v; if (!(mask & b)) continue;
      g[mejor] = v; f[r] |= b; c[cc] |= b; k[kk] |= b;
      const fin = rec();
      g[mejor] = 0; f[r] &= ~b; c[cc] &= ~b; k[kk] &= ~b;
      if (fin) return true;
    }
    return false;
  };
  rec();
  return n;
}

export function solucionAleatoria() {
  const g = new Array(81).fill(0);
  const rec = i => {
    if (i === 81) return true;
    const m = candidatos(g, i);
    for (const v of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) if (m & (1 << v)) { g[i] = v; if (rec(i + 1)) return true; g[i] = 0; }
    return false;
  };
  rec(0);
  return g;
}

// ¿Se resuelve usando solo "únicos"? (sin adivinar). conOcultos=false -> solo únicos desnudos (nivel Fácil).
export function resolublePorUnicos(cur, conOcultos = true) {
  const g = cur.slice(), UNIDADES = [];
  for (let a = 0; a < 9; a++) {
    UNIDADES.push(Array.from({ length: 9 }, (_, b) => a * 9 + b), Array.from({ length: 9 }, (_, b) => b * 9 + a),
      Array.from({ length: 9 }, (_, b) => ((a / 3 | 0) * 3 + (b / 3 | 0)) * 9 + (a % 3) * 3 + (b % 3)));
  }
  for (;;) {
    let cambio = false;
    for (let i = 0; i < 81; i++) if (!g[i]) { const m = candidatos(g, i); if (POP[m] === 1) { g[i] = Math.log2(m); cambio = true; } else if (!m) return false; }
    if (!cambio && conOcultos) {
      for (const u of UNIDADES) for (let v = 1; v <= 9; v++) {
        if (u.some(i => g[i] === v)) continue;
        const sitios = u.filter(i => !g[i] && (candidatos(g, i) & (1 << v)));
        if (sitios.length === 1) { g[sitios[0]] = v; cambio = true; }
      }
    }
    if (!cambio) return g.every(Boolean);
  }
}

export const PISTAS = { facil: 38, medio: 31, dificil: 26 };

export function generar(nivel = 'medio') {
  const objetivo = PISTAS[nivel] ?? 31;
  let ultimo = null;
  for (let intento = 0; intento < 10; intento++) {
    const sol = solucionAleatoria(), cur = sol.slice();
    let quedan = 81;
    for (const i of shuffle([...Array(81).keys()])) {
      if (quedan <= objetivo) break;
      const v = cur[i]; cur[i] = 0;
      if (contarSoluciones(cur, 2) !== 1) cur[i] = v; else quedan--;
    }
    ultimo = { sol, cur };
    const ok = nivel === 'facil' ? resolublePorUnicos(cur, false)
      : nivel === 'medio' ? resolublePorUnicos(cur, true)
      : !resolublePorUnicos(cur, true);          // Difícil: exige algo más que únicos
    if (ok) break;
  }
  return ultimo;
}
