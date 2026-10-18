// Motor del Solitario Klondike (sin DOM, probable con Node).
// Estado: { tab: [{d:[ids boca abajo], u:[ids boca arriba]} ×8 (la 0 es la casilla extra, solo si extra)], extra: bool, fund: [[ids] ×4 (por palo)], stock: [ids] (el siguiente se saca con pop), waste: [ids], robar: 1|3, mov }
import { nuevaBaraja, barajar, paloDe, rangoDe, esRoja, RANGOS, PALOS } from '../../core/cartas.js';

// vegas: puntuación de Las Vegas (se paga 52 $ por partida, cada carta en las bases vale 5 $) y pasadas limitadas por el mazo
export const PASADAS_VEGAS = { 1: 1, 3: 3 };
export const puntosVegas = S => -52 + 5 * S.fund.reduce((n, f) => n + f.length, 0);
export function nuevo(robar = 1, extra = true, vegas = false) {
  const m = barajar(nuevaBaraja(1)), tab = [{ d: [], u: [] }];           // columna 0: la casilla extra «libre» (admite cualquier carta cuando está vacía)
  for (let i = 0; i < 7; i++) { const cs = m.splice(0, i + 1); tab.push({ d: cs.slice(0, i), u: [cs[i]] }); }
  return { tab, fund: [[], [], [], []], stock: m, waste: [], robar: robar === 3 ? 3 : 1, mov: 0, extra: !!extra, vegas: !!vegas, pasada: 1 };
}
export const copia = S => JSON.parse(JSON.stringify(S));
export const gana = S => S.fund.every(f => f.length === 13);
export const cabeTab = (S, id, col) => {
  if (col === 0 && !S.extra) return false;
  const c = S.tab[col], top = c.u[c.u.length - 1];
  if (top === undefined) return col === 0 ? true : !c.d.length && rangoDe(id) === 12;
  return esRoja(top) !== esRoja(id) && rangoDe(top) === rangoDe(id) + 1;
};
export const cabeFund = (S, id) => S.fund[paloDe(id)].length === rangoDe(id);
export const cartaDe = (S, o) => o.t === 'waste' ? S.waste[S.waste.length - 1] : o.t === 'tab' ? S.tab[o.col].u[o.idx] : S.fund[o.p][S.fund[o.p].length - 1];
export const secuencia = (S, o) => o.t === 'tab' ? S.tab[o.col].u.slice(o.idx) : [cartaDe(S, o)];

function quitar(S, o) {
  if (o.t === 'waste') return [S.waste.pop()];
  if (o.t === 'fund') return [S.fund[o.p].pop()];
  const c = S.tab[o.col], cs = c.u.splice(o.idx);
  if (!c.u.length && c.d.length) c.u.push(c.d.pop());                 // al descubrir, se da la vuelta a la carta
  return cs;
}
export function puede(S, o, a) {                                        // a: {t:'tab',col} | {t:'fund'}
  const cs = secuencia(S, o); if (!cs.length || cs[0] === undefined) return false;
  if (a.t === 'fund') return cs.length === 1 && o.t !== 'fund' && cabeFund(S, cs[0]);
  if (o.t === 'tab' && o.col === a.col) return false;
  return cabeTab(S, cs[0], a.col);
}
export function mover(S, o, a) {
  if (!puede(S, o, a)) return false;
  const cs = quitar(S, o);
  if (a.t === 'fund') S.fund[paloDe(cs[0])].push(cs[0]); else S.tab[a.col].u.push(...cs);
  S.mov++; return true;
}
export function robarStock(S) {
  if (!S.stock.length) {
    if (!S.waste.length) return false;
    if (S.vegas && (S.pasada || 1) >= PASADAS_VEGAS[S.robar]) return false;        // Vegas: el mazo no se puede volver a pasar
    S.stock = S.waste.reverse(); S.waste = []; S.mov++; S.pasada = (S.pasada || 1) + 1; return true;
  }
  for (let i = 0; i < S.robar && S.stock.length; i++) S.waste.push(S.stock.pop());
  S.mov++; return true;
}
// Destino automático para un toque: primero a las bases, luego a una columna donde encaje
export function destinoAuto(S, o) {
  const cs = secuencia(S, o); if (!cs.length || cs[0] === undefined) return null;
  if (puede(S, o, { t: 'fund' })) return { t: 'fund' };
  let mejor = null;
  for (let col = 1; col < 8; col++) {
    if (!puede(S, o, { t: 'tab', col })) continue;
    const vacia = !S.tab[col].u.length;
    if (vacia && o.t === 'tab' && o.idx === 0 && !S.tab[o.col].d.length) continue;   // rey que ya está al fondo: no tiene sentido moverlo
    if (!mejor || (!vacia && mejor.vacia)) mejor = { t: 'tab', col, vacia };
  }
  return mejor ? { t: 'tab', col: mejor.col } : null;
}
export function autoSiguiente(S) {                                    // siguiente jugada a las bases (para autocompletar)
  const orig = [{ t: 'waste' }, ...S.tab.map((c, col) => ({ t: 'tab', col, idx: c.u.length - 1 }))];
  for (const o of orig) { if (o.t === 'tab' && o.idx < 0) continue; if (o.t === 'waste' && !S.waste.length) continue; if (puede(S, o, { t: 'fund' })) return o; }
  return null;
}
// Auto-relleno: sin cartas boca abajo en las columnas, las que quedan (columnas, mazo y descartes) se pueden subir solas.
export const sinOcultas = S => S.tab.every(c => !c.d.length);
// Siguiente paso del auto-relleno: una carta a la base; si ninguna sube, la del descarte a una columna donde encaje; si no, pasar el mazo. null si no queda nada útil.
export function pasoAuto(S, sinAvance = 0) {
  const o = autoSiguiente(S); if (o) return { o, a: { t: 'fund' } };
  if (S.waste.length) for (let col = 1; col < 8; col++) if (S.tab[col].u.length && puede(S, { t: 'waste' }, { t: 'tab', col })) return { o: { t: 'waste' }, a: { t: 'tab', col } };   // desatasca el robo de 3 en 3
  const resto = S.stock.length + S.waste.length;
  if (resto && sinAvance <= 2 * resto + 2) return { robar: true };
  return null;
}
// ¿Se completa la partida subiendo cartas a las bases (y pasando el mazo) sin ninguna otra jugada? Se simula sobre una copia.
export function autoResoluble(S) {
  if (gana(S) || !sinOcultas(S)) return false;
  const T = copia(S); let sin = 0;
  for (let g = 0; g < 2000; g++) {
    const p = pasoAuto(T, sin); if (!p) return false;
    if (p.o) { mover(T, p.o, p.a); sin = 0; if (gana(T)) return true; } else { robarStock(T); sin++; }
  }
  return false;
}

// Pista: la mejor jugada razonable
export function pista(S) {
  const c = [], orig = [];
  if (S.waste.length) orig.push({ t: 'waste' });
  S.tab.forEach((col, i) => col.u.forEach((_, idx) => orig.push({ t: 'tab', col: i, idx })));
  for (const o of orig) {
    if (puede(S, o, { t: 'fund' })) c.push({ o, a: { t: 'fund' }, p: 100 });
    for (let col = 0; col < 8; col++) {
      if (!puede(S, o, { t: 'tab', col })) continue;
      const vacia = !S.tab[col].u.length;
      if (col === 0) { if (o.t === 'tab' && o.idx === 0 && S.tab[o.col].d.length) { c.push({ o, a: { t: 'tab', col }, p: 55 }); } continue; }
      let p = o.t === 'waste' ? 70 : 40;
      if (o.t === 'tab') { const origen = S.tab[o.col]; if (o.idx === 0 && origen.d.length) p = 85; else if (o.idx === 0) { if (vacia) continue; p = 60; } else continue; }
      if (vacia && o.t === 'waste') p = 65;
      c.push({ o, a: { t: 'tab', col }, p });
    }
  }
  c.sort((x, y) => y.p - x.p);
  if (c.length) return { ...c[0], txt: `${nombre(cartaDe(S, c[0].o))} → ${c[0].a.t === 'fund' ? 'a la base' : `columna ${c[0].a.col + 1}`}` };
  if (S.stock.length || (S.waste.length && !(S.vegas && (S.pasada || 1) >= PASADAS_VEGAS[S.robar]))) return { o: { t: 'stock' }, a: null, txt: S.stock.length ? 'Roba del mazo' : 'Vuelve a pasar el mazo' };
  return null;
}
const nombre = id => RANGOS[rangoDe(id)] + PALOS[paloDe(id)].s;
export function validar(d) {
  if (!d || typeof d !== 'object') return null;
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, vistos = new Set();
  const lista = (a, max) => Array.isArray(a) && a.length <= max && a.every(v => ent(v, 0, 51) && !vistos.has(v) && vistos.add(v));
  if (!Array.isArray(d.tab) || (d.tab.length !== 7 && d.tab.length !== 8) || !Array.isArray(d.fund) || d.fund.length !== 4) return null;
  const antigua = d.tab.length === 7, tab = [];       // partidas guardadas de la versión anterior: se añade la casilla extra apagada
  if (antigua) tab.push({ d: [], u: [] });
  for (const c of d.tab) { if (!c || !lista(c.d, 6) || !lista(c.u, 19)) return null; if (c.d.length && !c.u.length) return null; tab.push({ d: c.d.slice(), u: c.u.slice() }); }
  if (tab[0].d.length) return null;
  const fund = [];
  for (let p = 0; p < 4; p++) { const f = d.fund[p]; if (!lista(f, 13) || f.some((id, i) => id !== p * 13 + i)) return null; fund.push(f.slice()); }
  if (!lista(d.stock, 24) || !lista(d.waste, 24) || vistos.size !== 52) return null;
  return { tab, fund, stock: d.stock.slice(), waste: d.waste.slice(), robar: d.robar === 3 ? 3 : 1, mov: ent(d.mov, 0, 1e6) ? d.mov : 0, extra: antigua ? false : !!d.extra,
    vegas: !!d.vegas, pasada: ent(d.pasada, 1, 999) ? d.pasada : 1, cobrado: !!d.cobrado };
}
