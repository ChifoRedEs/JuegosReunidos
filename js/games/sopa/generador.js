// Generador de Sopas de letras (sin DOM, probable con Node).
import { TEMAS } from './palabras.js';
import { shuffle, rnd } from '../../core/dom.js';

export const NIVELES = {
  facil:   { n: 8,  palabras: 6,  dirs: [[0, 1], [1, 0]] },
  medio:   { n: 10, palabras: 8,  dirs: [[0, 1], [1, 0], [1, 1], [-1, 1]] },
  dificil: { n: 12, palabras: 10, dirs: [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]] },
};
export const DIRS8 = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
const RELLENO = 'AAAEEEIIOOOUULNRSTDCMPBGVFHQJZXYKW';

export function generar(tema, nivel) {
  const cfg = NIVELES[nivel], n = cfg.n;
  const banco = tema === 'mezcla' ? [...new Set(Object.values(TEMAS).flatMap(t => t.palabras))] : TEMAS[tema].palabras;
  for (let intento = 0; intento < 60; intento++) {
    const grid = new Array(n * n).fill(''), colocadas = [];
    for (const p of shuffle(banco.filter(w => w.length <= n).slice())) {
      if (colocadas.length >= cfg.palabras) break;
      for (let k = 0; k < 150; k++) {
        const [dr, dc] = cfg.dirs[rnd(cfg.dirs.length)], r0 = rnd(n), c0 = rnd(n), re = r0 + dr * (p.length - 1), ce = c0 + dc * (p.length - 1);
        if (re < 0 || re >= n || ce < 0 || ce >= n) continue;
        let ok = true;
        for (let t = 0; t < p.length && ok; t++) { const x = grid[(r0 + dr * t) * n + c0 + dc * t]; if (x && x !== p[t]) ok = false; }
        if (!ok) continue;
        for (let t = 0; t < p.length; t++) grid[(r0 + dr * t) * n + c0 + dc * t] = p[t];
        colocadas.push({ p, f: r0 * n + c0, d: [dr, dc] }); break;
      }
    }
    if (colocadas.length >= cfg.palabras) {
      for (let i = 0; i < grid.length; i++) if (!grid[i]) grid[i] = RELLENO[rnd(RELLENO.length)];
      return { n, grid, palabras: colocadas };
    }
  }
  throw new Error('No se pudo generar la sopa');
}
// celdas desde a hasta b en línea recta (null si no están alineadas)
export function linea(n, a, b) {
  const ra = a / n | 0, ca = a % n, rb = b / n | 0, cb = b % n, dr = rb - ra, dc = cb - ca;
  if (dr && dc && Math.abs(dr) !== Math.abs(dc)) return null;
  const len = Math.max(Math.abs(dr), Math.abs(dc)), sr = Math.sign(dr), sc = Math.sign(dc);
  return Array.from({ length: len + 1 }, (_, t) => (ra + sr * t) * n + ca + sc * t);
}
// ajusta b a la dirección de 8 vientos más cercana desde a (para arrastrar con el dedo)
export function ajustar(n, a, b) {
  const ra = a / n | 0, ca = a % n, dr = (b / n | 0) - ra, dc = (b % n) - ca;
  if (!dr && !dc) return a;
  const ang = Math.round(Math.atan2(dr, dc) / (Math.PI / 4)), sr = Math.round(Math.sin(ang * Math.PI / 4)), sc = Math.round(Math.cos(ang * Math.PI / 4));
  let len = Math.max(0, Math.round((dr * sr + dc * sc) / (sr * sr + sc * sc)));
  while (len > 0 && (ra + sr * len < 0 || ra + sr * len >= n || ca + sc * len < 0 || ca + sc * len >= n)) len--;
  return (ra + sr * len) * n + ca + sc * len;
}
