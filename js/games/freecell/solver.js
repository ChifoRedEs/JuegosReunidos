// Buscador de soluciones de Carta Blanca (mejor primero, mueve de carta en carta). Sin DOM.
// resolver(S, { ms, max }) → { r: 'ganable'|'incierto', pasos: [{o,a}] } (los pasos son jugadas válidas de una sola carta, en orden)
import { paloDe, rangoDe, esRoja } from '../../core/cartas.js';
const COLS = 8;
const encaja = (id, sobre) => esRoja(id) !== esRoja(sobre) && rangoDe(sobre) === rangoDe(id) + 1;
function clave(t, cells, f) {
  const a = t.map(c => c.join(',')).sort().join('|');
  return a + '#' + cells.filter(x => x !== null).sort((x, y) => x - y).join(',') + '#' + f.join(',');
}
function heur(t, cells, f) {
  let h = (52 - (f[0] + f[1] + f[2] + f[3])) * 4;
  h += cells.filter(c => c !== null).length;
  for (const c of t) {
    for (let i = 0; i < c.length; i++) {
      const id = c[i];
      if (i < c.length - 1 && !encaja(c[i + 1], id)) h += 2;                            // fila rota por encima
      for (let j = i + 1; j < c.length; j++) if (rangoDe(c[j]) > rangoDe(id)) { h += 1; }   // una carta menor tapada por una mayor
    }
  }
  return h;
}
export function resolver(S, { ms = 1500, max = 120000 } = {}) {
  const t0 = Date.now();
  const t = S.tab.map(c => c.slice()), cells = S.cells.slice(), f = S.fund.map(x => x.length);
  const ini = { t, cells, f, padre: null, mov: null, h: heur(t, cells, f), g: 0 };
  const visto = new Set([clave(t, cells, f)]), abierta = [ini];                          // montículo mínimo por h
  const push = n => { abierta.push(n); let i = abierta.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (abierta[p].h <= abierta[i].h) break; [abierta[p], abierta[i]] = [abierta[i], abierta[p]]; i = p; } };
  const pop = () => { const top = abierta[0], last = abierta.pop(); if (abierta.length) { abierta[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < abierta.length && abierta[l].h < abierta[m].h) m = l; if (r < abierta.length && abierta[r].h < abierta[m].h) m = r; if (m === i) break; [abierta[m], abierta[i]] = [abierta[i], abierta[m]]; i = m; } } return top; };
  let n = 0, mejor = ini;
  while (abierta.length && n < max) {
    if ((n & 255) === 0 && Date.now() - t0 > ms) break;
    const e = pop(); n++;
    if (e.f[0] + e.f[1] + e.f[2] + e.f[3] === 52) return { r: 'ganable', pasos: reconstruir(e) };
    if (e.h < mejor.h) mejor = e;
    const hijos = [];
    const orig = [];
    e.cells.forEach((id, i) => { if (id !== null) orig.push({ t: 'cell', i, id }); });
    e.t.forEach((c, col) => { if (c.length) orig.push({ t: 'tab', col, idx: c.length - 1, id: c[c.length - 1] }); });
    for (const o of orig) {
      const p = paloDe(o.id), quitar = (T, C) => { if (o.t === 'cell') C[o.i] = null; else T[o.col] = T[o.col].slice(0, -1); };
      if (e.f[p] === rangoDe(o.id)) { const T = e.t.slice(), C = e.cells.slice(), F = e.f.slice(); quitar(T, C); F[p]++; hijos.push([T, C, F, o, { t: 'fund' }]); }
      let vac = false;
      for (let col = 0; col < COLS; col++) {
        if (o.t === 'tab' && o.col === col) continue;
        const d = e.t[col];
        if (d.length ? !encaja(o.id, d[d.length - 1]) : vac) continue;
        if (!d.length) { vac = true; if (o.t === 'tab' && o.idx === 0) continue; }
        const T = e.t.slice(), C = e.cells.slice(); quitar(T, C); T[col] = T[col].concat(o.id); hijos.push([T, C, e.f, o, { t: 'tab', col }]);
      }
      if (o.t === 'tab') { const i = e.cells.indexOf(null); if (i >= 0) { const T = e.t.slice(), C = e.cells.slice(); quitar(T, C); C[i] = o.id; hijos.push([T, C, e.f, o, { t: 'cell', i }]); } }
    }
    for (const [T, C, F, o, a] of hijos) {
      const k = clave(T, C, F); if (visto.has(k)) continue; visto.add(k);
      push({ t: T, cells: C, f: F, padre: e, mov: { o: { t: o.t, ...(o.t === 'cell' ? { i: o.i } : { col: o.col, idx: o.idx }) }, a }, h: heur(T, C, F) + (e.g + 1) * .3, g: e.g + 1 });
    }
  }
  return { r: 'incierto', pasos: [], nodos: n };
}
function reconstruir(e) { const p = []; for (let x = e; x && x.mov; x = x.padre) p.push(x.mov); return p.reverse(); }
