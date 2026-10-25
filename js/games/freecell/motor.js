// Motor de Carta Blanca (FreeCell), sin DOM, probable con Node.
// 52 cartas boca arriba en 8 columnas, 4 casillas libres y 4 bases (por palo, de A a K).
// En las columnas se apila en orden descendente alternando colores. Se mueven grupos si hay casillas libres y columnas vacías suficientes.
// Estado: { tab: [[ids] ×8], cells: [id|null ×4], fund: [[ids] ×4 (por palo)], mov }
import { nuevaBaraja, barajar, paloDe, rangoDe, esRoja, RANGOS, PALOS } from '../../core/cartas.js';

export const COLS = 8, CELDAS = 4;
export function nuevo() {
  const m = barajar(nuevaBaraja(1)), tab = Array.from({ length: COLS }, () => []);
  m.forEach((id, i) => tab[i % COLS].push(id));                    // 7,7,7,7,6,6,6,6
  return { tab, cells: Array(CELDAS).fill(null), fund: [[], [], [], []], mov: 0 };
}
export const copia = S => JSON.parse(JSON.stringify(S));
export const gana = S => S.fund.every(f => f.length === 13);
export const libres = S => S.cells.filter(c => c === null).length;
export const vacias = S => S.tab.filter(c => !c.length).length;
export const encaja = (id, sobre) => esRoja(id) !== esRoja(sobre) && rangoDe(sobre) === rangoDe(id) + 1;
export const cabeFund = (S, id) => S.fund[paloDe(id)].length === rangoDe(id);
// Cuántas cartas se pueden mover de golpe a una columna (con o sin ser vacía)
export const maxGrupo = (S, haciaVacia) => (libres(S) + 1) * 2 ** (vacias(S) - (haciaVacia ? 1 : 0));
export const grupoValido = (S, col, idx) => {
  const t = S.tab[col]; if (idx < 0 || idx >= t.length) return false;
  for (let i = idx; i < t.length - 1; i++) if (!encaja(t[i + 1], t[i])) return false;
  return true;
};
export const cartaDe = (S, o) => o.t === 'cell' ? S.cells[o.i] : S.tab[o.col][o.idx];
export const secuencia = (S, o) => o.t === 'cell' ? [S.cells[o.i]] : S.tab[o.col].slice(o.idx);
const valido = (S, o) => o.t === 'cell' ? S.cells[o.i] !== null && S.cells[o.i] !== undefined : grupoValido(S, o.col, o.idx);

// o: {t:'tab',col,idx} | {t:'cell',i};  a: {t:'tab',col} | {t:'cell',i} | {t:'fund'}
export function puede(S, o, a) {
  if (!valido(S, o)) return false;
  const cs = secuencia(S, o), id = cs[0];
  if (a.t === 'fund') return cs.length === 1 && cabeFund(S, id);
  if (a.t === 'cell') return cs.length === 1 && S.cells[a.i] === null && !(o.t === 'cell' && o.i === a.i);
  if (o.t === 'tab' && o.col === a.col) return false;
  const d = S.tab[a.col];
  if (!d.length) return cs.length <= maxGrupo(S, true);
  return encaja(id, d[d.length - 1]) && cs.length <= maxGrupo(S, false);
}
export function mover(S, o, a) {
  if (!puede(S, o, a)) return false;
  let cs;
  if (o.t === 'cell') { cs = [S.cells[o.i]]; S.cells[o.i] = null; } else cs = S.tab[o.col].splice(o.idx);
  if (a.t === 'fund') S.fund[paloDe(cs[0])].push(cs[0]); else if (a.t === 'cell') S.cells[a.i] = cs[0]; else S.tab[a.col].push(...cs);
  S.mov++; return true;
}
// Destino para un toque: base > columna donde encaje (la que deja más larga la fila, antes que una vacía) > casilla libre
export function destinoAuto(S, o) {
  if (!valido(S, o)) return null;
  if (puede(S, o, { t: 'fund' })) return { t: 'fund' };
  let mejor = null, pm = -1;
  const id = cartaDe(S, o);
  for (let col = 0; col < COLS; col++) {
    if (!puede(S, o, { t: 'tab', col })) continue;
    const d = S.tab[col]; let p;
    if (!d.length) { if (o.t === 'tab' && o.idx === 0) continue; p = 1; } else p = 10 + d.length;
    if (p > pm) { pm = p; mejor = { t: 'tab', col }; }
  }
  if (mejor) return mejor;
  if (o.t === 'tab') { const i = S.cells.indexOf(null); if (i >= 0 && puede(S, o, { t: 'cell', i })) return { t: 'cell', i }; }
  return null;
}
// Subida segura a las bases: una carta sube sola si ya no hará falta para apilar (las de color contrario inferiores ya están arriba)
export function seguraParaSubir(S, id) {
  if (!cabeFund(S, id)) return false;
  const r = rangoDe(id); if (r <= 1) return true;
  const rojo = esRoja(id), ps = [0, 1, 2, 3].filter(p => (p === 1 || p === 2) !== rojo);
  return ps.every(p => S.fund[p].length >= r - 1);
}
export function autoSiguiente(S) {
  for (let i = 0; i < CELDAS; i++) { const id = S.cells[i]; if (id !== null && seguraParaSubir(S, id)) return { t: 'cell', i }; }
  for (let col = 0; col < COLS; col++) { const t = S.tab[col]; if (t.length && seguraParaSubir(S, t[t.length - 1])) return { t: 'tab', col, idx: t.length - 1 }; }
  return null;
}
// Pista
export function pista(S) {
  const c = [], orig = [];
  S.cells.forEach((id, i) => { if (id !== null) orig.push({ t: 'cell', i }); });
  S.tab.forEach((t, col) => { for (let idx = 0; idx < t.length; idx++) if (grupoValido(S, col, idx)) orig.push({ t: 'tab', col, idx }); });
  for (const o of orig) {
    if (puede(S, o, { t: 'fund' })) c.push({ o, a: { t: 'fund' }, p: 100 });
    for (let col = 0; col < COLS; col++) {
      if (!puede(S, o, { t: 'tab', col })) continue;
      const d = S.tab[col]; let p = d.length ? 60 : 25;
      if (!d.length && o.t === 'tab' && o.idx === 0) continue;
      if (o.t === 'tab' && o.idx > 0 && encaja(S.tab[o.col][o.idx], S.tab[o.col][o.idx - 1])) continue;       // rompería una fila ya ordenada
      if (o.t === 'cell') p += 20;
      if (o.t === 'tab' && o.idx === 0 && !d.length) continue;
      if (o.t === 'tab') p += Math.min(15, S.tab[o.col].length - o.idx);
      c.push({ o, a: { t: 'tab', col }, p });
    }
  }
  c.sort((x, y) => y.p - x.p);
  if (c.length) { const m = c[0]; return { ...m, txt: `${nombre(cartaDe(S, m.o))} → ${m.a.t === 'fund' ? 'a la base' : `columna ${m.a.col + 1}`}` }; }
  const i = S.cells.indexOf(null);
  if (i >= 0) {                                                          // nada mejor: aparcar la última carta de la columna más corta en una casilla libre
    let mejor = null; S.tab.forEach((t, col) => { if (t.length && (!mejor || t.length < S.tab[mejor.col].length)) mejor = { col, idx: t.length - 1 }; });
    if (mejor) return { o: { t: 'tab', ...mejor }, a: { t: 'cell', i }, p: 0, txt: `${nombre(S.tab[mejor.col][mejor.idx])} → casilla libre` };
  }
  return null;
}
export const nombre = id => RANGOS[rangoDe(id)] + PALOS[paloDe(id)].s;
// ¿Hay alguna jugada que no sea solo mover cartas de sitio? (para avisar del bloqueo)
export function hayJugadas(S) {
  if (libres(S) > 0) return true;
  const orig = [];
  S.cells.forEach((id, i) => { if (id !== null) orig.push({ t: 'cell', i }); });
  S.tab.forEach((t, col) => { for (let idx = 0; idx < t.length; idx++) if (grupoValido(S, col, idx)) orig.push({ t: 'tab', col, idx }); });
  for (const o of orig) { if (puede(S, o, { t: 'fund' })) return true; for (let col = 0; col < COLS; col++) if (puede(S, o, { t: 'tab', col })) return true; }
  return false;
}
export function validar(d) {
  if (!d || typeof d !== 'object') return null;
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, vistos = new Set();
  const carta = v => ent(v, 0, 51) && !vistos.has(v) && vistos.add(v);
  if (!Array.isArray(d.tab) || d.tab.length !== COLS || !Array.isArray(d.cells) || d.cells.length !== CELDAS || !Array.isArray(d.fund) || d.fund.length !== 4) return null;
  const tab = []; for (const t of d.tab) { if (!Array.isArray(t) || t.length > 52 || !t.every(carta)) return null; tab.push(t.slice()); }
  const cells = []; for (const c of d.cells) { if (c === null) cells.push(null); else if (carta(c)) cells.push(c); else return null; }
  const fund = []; for (let p = 0; p < 4; p++) { const f = d.fund[p]; if (!Array.isArray(f) || f.length > 13 || f.some((id, i) => id !== p * 13 + i || !carta(id))) return null; fund.push(f.slice()); }
  if (vistos.size !== 52) return null;
  return { tab, cells, fund, mov: ent(d.mov, 0, 1e6) ? d.mov : 0 };
}
