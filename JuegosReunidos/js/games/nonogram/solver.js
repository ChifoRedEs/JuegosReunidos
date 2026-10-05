// Utilidades y resolvedor lógico de Nonogramas (sin DOM: se puede probar con Node).
export const SIZES = [5, 10, 15, 20];
export const DENS = { facil: 0.66, medio: 0.57, dificil: 0.48 };      // menos casillas rellenas = pistas menos evidentes
export const runs = l => { const r = []; let k = 0; l.forEach(v => { if (v === 1) k++; else if (k) { r.push(k); k = 0; } }); if (k) r.push(k); return r.length ? r : [0]; };
export const colsOf = (g, n) => [...Array(n).keys()].map(j => g.map(r => r[j]));

// Resuelve una línea: devuelve por casilla 1 (seguro lleno), 0 (seguro vacío), -1 (desconocido) o null si es imposible
export function lineSolve(line, clues) {
  const n = line.length, k = (clues.length === 1 && clues[0] === 0) ? 0 : clues.length, memo = new Map();
  const canPlace = (i, j) => { const L = clues[j]; if (i + L > n) return false; for (let x = i; x < i + L; x++) if (line[x] === 0) return false; return !(i + L < n && line[i + L] === 1); };
  const f = (i, j) => {
    if (i >= n) return j === k;
    const key = i * 64 + j; if (memo.has(key)) return memo.get(key);
    let r = false;
    if (j === k) { r = true; for (let x = i; x < n; x++) if (line[x] === 1) { r = false; break; } }
    else {
      if (line[i] !== 1 && f(i + 1, j)) r = true;
      if (!r && canPlace(i, j) && f(Math.min(i + clues[j] + 1, n), j + 1)) r = true;
    }
    memo.set(key, r); return r;
  };
  if (!f(0, 0)) return null;
  const cF = Array(n).fill(0), cE = Array(n).fill(0), seen = new Set();
  const walk = (i, j) => {
    const key = i * 64 + j; if (seen.has(key) || i >= n) return; seen.add(key);
    if (j === k) { for (let x = i; x < n; x++) cE[x] = 1; return; }
    if (line[i] !== 1 && f(i + 1, j)) { cE[i] = 1; walk(i + 1, j); }
    if (canPlace(i, j)) { const L = clues[j], nx = Math.min(i + L + 1, n); if (f(nx, j + 1)) { for (let x = i; x < i + L; x++) cF[x] = 1; if (i + L < n) cE[i + L] = 1; walk(nx, j + 1); } }
  };
  walk(0, 0);
  return line.map((v, x) => cF[x] && cE[x] ? -1 : cF[x] ? 1 : 0);
}
// ¿Se resuelve solo con lógica (solución única, sin adivinar)? y cuántas pasadas necesita
export function solveGrid(rc, cc, n) {
  const g = Array.from({ length: n }, () => Array(n).fill(-1)); let passes = 0, changed = true;
  while (changed) {
    changed = false; passes++;
    for (let i = 0; i < n; i++) { const r = lineSolve(g[i], rc[i]); if (!r) return { ok: false }; r.forEach((v, j) => { if (v !== -1 && g[i][j] === -1) { g[i][j] = v; changed = true; } }); }
    for (let j = 0; j < n; j++) { const r = lineSolve(g.map(x => x[j]), cc[j]); if (!r) return { ok: false }; r.forEach((v, i) => { if (v !== -1 && g[i][j] === -1) { g[i][j] = v; changed = true; } }); }
  }
  return { ok: g.every(r => r.every(v => v !== -1)), passes };
}
// Genera un panel aleatorio resoluble por lógica. Cede el hilo entre intentos para no congelar la interfaz.
export async function generarAleatorio(n, diff) {
  const d = DENS[diff] ?? DENS.medio, t0 = performance.now(), cands = []; let last = null;
  for (let a = 0; a < 300 && cands.length < 5 && performance.now() - t0 < 900; a++) {
    const sol = Array.from({ length: n }, () => Array.from({ length: n }, () => Math.random() < d ? 1 : 0));
    const rc = sol.map(runs), cc = colsOf(sol, n).map(runs); last = { sol, rc, cc };
    const r = solveGrid(rc, cc, n); if (r.ok) cands.push({ sol, rc, cc, passes: r.passes });
    await new Promise(res => setTimeout(res, 0));
  }
  if (cands.length) { cands.sort((a, b) => a.passes - b.passes); return diff === 'facil' ? cands[0] : diff === 'dificil' ? cands[cands.length - 1] : cands[cands.length >> 1]; }
  return last;
}
