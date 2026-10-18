// Generador de crucigramas libres (sin DOM, probable con Node).
import { BANCOS } from './pistas.js';
import { shuffle, rnd } from '../../core/dom.js';

export const NIVELES = { mini: { n: 9, pal: 6, max: 6 }, facil: { n: 11, pal: 8, max: 7 }, medio: { n: 13, pal: 12, max: 9 }, dificil: { n: 15, pal: 17, max: 12 }, experto: { n: 17, pal: 24, max: 12 } };

function puede(g, m, n, p, r, c, d) {                    // nº de cruces si cabe, -1 si no
  const dr = d === 'V' ? 1 : 0, dc = d === 'H' ? 1 : 0, len = p.length;
  if (r < 0 || c < 0 || r + dr * (len - 1) >= n || c + dc * (len - 1) >= n) return -1;
  const ri = r - dr, ci = c - dc, rf = r + dr * len, cf = c + dc * len;
  if (ri >= 0 && ci >= 0 && g[ri][ci]) return -1;
  if (rf < n && cf < n && g[rf][cf]) return -1;
  let cruces = 0;
  for (let i = 0; i < len; i++) {
    const rr = r + dr * i, cc = c + dc * i, x = g[rr][cc];
    if (x) { if (x !== p[i] || (m[rr][cc] & (d === 'H' ? 1 : 2))) return -1; cruces++; }
    else {
      const [ar, ac, br, bc] = d === 'H' ? [rr - 1, cc, rr + 1, cc] : [rr, cc - 1, rr, cc + 1];
      if (ar >= 0 && ac >= 0 && g[ar][ac]) return -1;
      if (br < n && bc < n && g[br][bc]) return -1;
    }
  }
  return cruces;
}
function poner(g, m, p, r, c, d) {
  const dr = d === 'V' ? 1 : 0, dc = d === 'H' ? 1 : 0;
  for (let i = 0; i < p.length; i++) { g[r + dr * i][c + dc * i] = p[i]; m[r + dr * i][c + dc * i] |= d === 'H' ? 1 : 2; }
}
export function generar(tema, nivel) {
  const cfg = NIVELES[nivel], n = cfg.n;
  const todas = tema === 'mezcla' ? Object.values(BANCOS).flatMap(b => b.entradas) : BANCOS[tema].entradas;
  const banco = todas.filter(([p]) => p.length >= 4 && p.length <= cfg.max);
  let mejor = null;
  for (let intento = 0; intento < 120; intento++) {
    const g = Array.from({ length: n }, () => Array(n).fill('')), m = Array.from({ length: n }, () => Array(n).fill(0)), col = [];
    const pool = shuffle(banco.slice());
    pool.sort((a, b) => b[0].length - a[0].length + (Math.random() - .5) * 5);       // largas primero, con algo de azar
    const [p0, d0] = pool.shift(), r0 = (n / 2 | 0) + rnd(3) - 1, c0 = Math.max(0, (n - p0.length) / 2 | 0);
    poner(g, m, p0, r0, c0, 'H'); col.push({ p: p0, r: r0, c: c0, d: 'H', def: d0 });
    for (const [p, def] of pool) {
      if (col.length >= cfg.pal) break;
      let top = 0, cands = [];
      for (const d of ['H', 'V']) for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const s = puede(g, m, n, p, r, c, d); if (s < 1) continue; if (s > top) { top = s; cands = []; } if (s === top) cands.push([r, c, d]); }
      if (!cands.length) continue;
      const [r, c, d] = cands[rnd(cands.length)]; poner(g, m, p, r, c, d); col.push({ p, r, c, d, def });
    }
    if (!mejor || col.length > mejor.col.length) mejor = { g, col };
    if (col.length >= cfg.pal) break;
  }
  const { g, col } = mejor;
  let r1 = n, r2 = -1, c1 = n, c2 = -1;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (g[r][c]) { r1 = Math.min(r1, r); r2 = Math.max(r2, r); c1 = Math.min(c1, c); c2 = Math.max(c2, c); }
  const w = c2 - c1 + 1, h = r2 - r1 + 1, sol = new Array(w * h).fill('');
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) sol[(r - r1) * w + c - c1] = g[r][c];
  return { w, h, sol, palabras: col.map(x => ({ p: x.p, f: (x.r - r1) * w + x.c - c1, d: x.d, def: x.def })) };
}
// números de las casillas de inicio (orden de lectura) y lista ordenada de pistas
export function numerar(w, palabras) {
  const starts = [...new Set(palabras.map(x => x.f))].sort((a, b) => a - b), num = new Map(starts.map((f, i) => [f, i + 1]));
  const orden = palabras.map((x, i) => i).sort((a, b) => (palabras[a].d === palabras[b].d ? num.get(palabras[a].f) - num.get(palabras[b].f) : palabras[a].d === 'H' ? -1 : 1));
  return { num, orden };
}
export const celdasDe = (w, x) => Array.from({ length: x.p.length }, (_, i) => x.f + i * (x.d === 'H' ? 1 : w));
