// Motor del BlackJack (sin DOM, probable con Node). Zapato de 6 barajas, la banca se planta en 17 blando,
// blackjack paga 3:2, se puede doblar (también tras dividir), dividir (hasta 4 manos), rendirse y tomar seguro.
// Cartas: enteros 0..51 (rango = id % 13: 0 = As … 12 = K). Fichas disponibles: 10, 50, 100, 500.
import { nuevaBaraja, barajar, rangoDe } from '../../core/cartas.js';

export const FICHAS = [10, 50, 100, 500], APUESTA_MIN = 10, INICIAL = 1000, MAZOS = 6;
export const valor = id => { const r = rangoDe(id); return r === 0 ? 11 : r >= 9 ? 10 : r + 1; };
export function total(cartas) {
  let t = 0, ases = 0; for (const c of cartas) { t += valor(c); if (rangoDe(c) === 0) ases++; }
  while (t > 21 && ases > 0) { t -= 10; ases--; }
  return { t, suave: ases > 0 };
}
export const esBJ = cartas => cartas.length === 2 && total(cartas).t === 21;
const mismoValor = (a, b) => valor(a) === valor(b);

export function nuevoEstado() { return { fichas: INICIAL, apuesta: INICIAL >= 50 ? 50 : 10, ultApuesta: 50, zapato: barajar(nuevaBaraja(MAZOS)), fase: 'apuesta', manos: [], act: 0, banca: [], seguro: 0, gastado: 0, resultado: null, ronda: 0, pico: INICIAL, barajado: false }; }
function robar(S) { if (!S.zapato.length) { S.zapato = barajar(nuevaBaraja(MAZOS)); S.barajado = true; } return S.zapato.pop(); }
const mano = (c, ap, extra = {}) => ({ c, ap, dbl: false, fin: false, split: false, res: null, ...extra });

export function apostar(S, delta) {          // delta positivo suma, 0 borra, negativo resta
  if (S.fase !== 'apuesta') return;
  S.apuesta = delta === 0 ? 0 : Math.max(0, Math.min(S.fichas, S.apuesta + delta));
}
export function repartir(S) {
  if (S.fase !== 'apuesta' || S.apuesta < APUESTA_MIN || S.apuesta > S.fichas) return false;
  if (S.zapato.length < 78) { S.zapato = barajar(nuevaBaraja(MAZOS)); S.barajado = true; } else S.barajado = false;
  S.fichas -= S.apuesta; S.gastado = S.apuesta; S.ultApuesta = S.apuesta; S.ronda++; S.seguro = 0; S.resultado = null;
  const p = robar(S), b1 = robar(S), p2 = robar(S), b2 = robar(S);
  S.manos = [mano([p, p2], S.apuesta)]; S.banca = [b1, b2]; S.act = 0;
  if (valor(b1) === 11) { S.fase = 'seguro'; return true; }
  comprobarNaturales(S); return true;
}
function comprobarNaturales(S) {
  const bj = esBJ(S.banca), pbj = esBJ(S.manos[0].c);
  if (valor(S.banca[0]) === 10 || valor(S.banca[0]) === 11) { if (bj) { S.fase = 'banca'; return liquidar(S); } }
  if (pbj) { S.fase = 'banca'; return liquidar(S); }
  S.fase = 'jugador';
}
export function seguro(S, tomar) {
  if (S.fase !== 'seguro') return;
  const coste = Math.floor(S.manos[0].ap / 2);
  if (tomar && S.fichas >= coste) { S.fichas -= coste; S.seguro = coste; S.gastado += coste; }
  comprobarNaturales(S);
}
export const manoAct = S => S.manos[S.act];
export function acciones(S) {
  if (S.fase !== 'jugador') return {};
  const h = manoAct(S), t = total(h.c).t, dos = h.c.length === 2;
  return {
    pedir: !h.fin && t < 21 && !(h.aceSplit),
    plantarse: !h.fin,
    doblar: dos && !h.fin && S.fichas >= h.ap && !h.aceSplit,
    dividir: dos && !h.fin && S.manos.length < 4 && S.fichas >= h.ap && mismoValor(h.c[0], h.c[1]) && !h.aceSplit,
    rendirse: dos && !h.fin && S.manos.length === 1 && !h.split,
  };
}
export function accion(S, a) {
  const ok = acciones(S); if (!ok[a]) return false;
  const h = manoAct(S);
  if (a === 'pedir') { h.c.push(robar(S)); const t = total(h.c).t; if (t >= 21) { h.fin = true; if (t > 21) h.res = 'pasa'; } }
  else if (a === 'plantarse') h.fin = true;
  else if (a === 'doblar') { S.fichas -= h.ap; S.gastado += h.ap; h.ap *= 2; h.dbl = true; h.c.push(robar(S)); h.fin = true; if (total(h.c).t > 21) h.res = 'pasa'; }
  else if (a === 'dividir') {
    S.fichas -= h.ap; S.gastado += h.ap;
    const [c0, c1] = h.c, ases = rangoDe(c0) === 0;
    h.c = [c0, robar(S)]; h.split = true; if (ases) { h.aceSplit = true; h.fin = true; }
    const n = mano([c1, robar(S)], h.ap, { split: true }); if (ases) { n.aceSplit = true; n.fin = true; }
    S.manos.splice(S.act + 1, 0, n);
    for (const x of [h, n]) if (total(x.c).t >= 21) x.fin = true;
  } else if (a === 'rendirse') { h.fin = true; h.res = 'rend'; }
  avanzar(S); return true;
}
function avanzar(S) {
  while (S.act < S.manos.length && S.manos[S.act].fin) S.act++;
  if (S.act >= S.manos.length) { S.act = Math.max(0, S.manos.length - 1); jugarBanca(S); }
}
function jugarBanca(S) {
  S.fase = 'banca';
  const vivas = S.manos.some(h => h.res !== 'pasa' && h.res !== 'rend');
  if (vivas) for (;;) { const { t } = total(S.banca); if (t >= 17) break; S.banca.push(robar(S)); }
  liquidar(S);
}
function liquidar(S) {
  const tb = total(S.banca).t, bjB = esBJ(S.banca); let devuelto = 0;
  if (S.seguro && bjB) devuelto += S.seguro * 3;
  for (const h of S.manos) {
    const t = total(h.c).t, nat = esBJ(h.c) && !h.split;
    if (h.res === 'pasa') h.res = 'pierde';
    else if (h.res === 'rend') devuelto += h.ap / 2;
    else if (nat && bjB) { h.res = 'empate'; devuelto += h.ap; }
    else if (nat) { h.res = 'bj'; devuelto += h.ap * 2.5; }
    else if (bjB) h.res = 'pierde';
    else if (tb > 21 || t > tb) { h.res = 'gana'; devuelto += h.ap * 2; }
    else if (t === tb) { h.res = 'empate'; devuelto += h.ap; }
    else h.res = 'pierde';
  }
  S.fichas += devuelto; S.pico = Math.max(S.pico, S.fichas);
  const neto = devuelto - S.gastado;
  S.resultado = { neto, texto: neto > 0 ? 'victoria' : neto < 0 ? 'derrota' : 'empate' };
  S.fase = 'fin';
}
export function nuevaRonda(S) {
  if (S.fase !== 'fin') return;
  S.fase = 'apuesta'; S.manos = []; S.banca = []; S.act = 0; S.seguro = 0; S.gastado = 0;
  S.apuesta = Math.min(S.ultApuesta, S.fichas); if (S.apuesta < APUESTA_MIN) S.apuesta = 0;
}
export function recargar(S) { if (S.fase === 'apuesta' && S.fichas < APUESTA_MIN) { S.fichas = INICIAL; S.apuesta = 50; S.pico = Math.max(S.pico, INICIAL); } }

/* ---------- consejo de estrategia básica (6 barajas, banca se planta en 17 blando, doblar tras dividir) ---------- */
export function consejo(S) {
  if (S.fase !== 'jugador') return null;
  const ok = acciones(S), h = manoAct(S), up = valor(S.banca[0]), { t, suave } = total(h.c), par = h.c.length === 2 && mismoValor(h.c[0], h.c[1]);
  const R = (a, b, txt) => ({ accion: ok[a] ? a : b, texto: txt });
  if (par && ok.dividir) {
    const v = valor(h.c[0]);
    if (v === 11 || v === 8) return R('dividir', 'pedir', 'Divide siempre los ases y los ochos.');
    if (v === 9 && ![7, 10, 11].includes(up)) return R('dividir', 'plantarse', 'Divide los nueves salvo contra 7, 10 o as.');
    if (v === 7 && up <= 7) return R('dividir', 'pedir', 'Divide los sietes contra 2-7.');
    if (v === 6 && up <= 6) return R('dividir', 'pedir', 'Divide los seises contra 2-6.');
    if (v === 4 && (up === 5 || up === 6)) return R('dividir', 'pedir', 'Divide los cuatros contra 5-6.');
    if ((v === 3 || v === 2) && up <= 7) return R('dividir', 'pedir', 'Divide los doses y treses contra 2-7.');
  }
  if (ok.rendirse && !suave && ((t === 16 && up >= 9) || (t === 15 && up === 10))) return R('rendirse', 'pedir', `Con ${t} contra ${up === 11 ? 'un as' : up}, lo mejor es rendirse.`);
  if (suave) {
    if (t >= 19) return R('plantarse', 'plantarse', `Con ${t} blando, plántate.`);
    if (t === 18) return up >= 3 && up <= 6 ? R('doblar', 'plantarse', 'As + 7: dobla contra 3-6 (si no puedes, plántate).') : up <= 8 ? R('plantarse', 'plantarse', 'As + 7: plántate contra 2, 7 u 8.') : R('pedir', 'pedir', 'As + 7: pide contra 9, 10 o as.');
    if (t === 17) return up >= 3 && up <= 6 ? R('doblar', 'pedir', 'Mano blanda de 17: dobla contra 3-6.') : R('pedir', 'pedir', 'Mano blanda de 17: pide.');
    if (t >= 15) return up >= 4 && up <= 6 ? R('doblar', 'pedir', `Mano blanda de ${t}: dobla contra 4-6.`) : R('pedir', 'pedir', `Mano blanda de ${t}: pide.`);
    return up >= 5 && up <= 6 ? R('doblar', 'pedir', `Mano blanda de ${t}: dobla contra 5-6.`) : R('pedir', 'pedir', `Mano blanda de ${t}: pide.`);
  }
  if (t >= 17) return R('plantarse', 'plantarse', `Con ${t}, plántate.`);
  if (t >= 13) return up <= 6 ? R('plantarse', 'plantarse', `Con ${t} contra ${up}, la banca puede pasarse: plántate.`) : R('pedir', 'pedir', `Con ${t} contra ${up === 11 ? 'un as' : up}, pide.`);
  if (t === 12) return up >= 4 && up <= 6 ? R('plantarse', 'plantarse', 'Con 12 contra 4-6, plántate.') : R('pedir', 'pedir', 'Con 12, pide.');
  if (t === 11) return up === 11 ? R('pedir', 'pedir', 'Con 11 contra as, pide.') : R('doblar', 'pedir', 'Con 11, dobla.');
  if (t === 10) return up <= 9 ? R('doblar', 'pedir', 'Con 10, dobla contra 2-9.') : R('pedir', 'pedir', 'Con 10 contra 10 o as, pide.');
  if (t === 9) return up >= 3 && up <= 6 ? R('doblar', 'pedir', 'Con 9, dobla contra 3-6.') : R('pedir', 'pedir', 'Con 9, pide.');
  return R('pedir', 'pedir', `Con ${t}, pide.`);
}
export const consejoSeguro = () => 'Mejor no tomes el seguro: a la larga pierde dinero.';
export function validarEstado(d) {
  if (!d || typeof d !== 'object') return null;
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, carta = v => ent(v, 0, 51), arr = (a, f, max) => Array.isArray(a) && a.length <= max && a.every(f);
  if (!ent(d.fichas, 0, 1e7) || !ent(d.apuesta, 0, 1e7) || !ent(d.ultApuesta, 0, 1e7) || !arr(d.zapato, carta, 312) || !['apuesta', 'seguro', 'jugador', 'banca', 'fin'].includes(d.fase)) return null;
  if (!arr(d.banca, carta, 12) || !Array.isArray(d.manos) || d.manos.length > 4) return null;
  const manos = [];
  for (const h of d.manos) {
    if (!h || !arr(h.c, carta, 12) || !ent(h.ap, 0, 1e7) || ![null, 'gana', 'pierde', 'empate', 'bj', 'rend', 'pasa'].includes(h.res)) return null;
    manos.push({ c: h.c.slice(), ap: h.ap, dbl: !!h.dbl, fin: !!h.fin, split: !!h.split, aceSplit: !!h.aceSplit, res: h.res });
  }
  if ((d.fase !== 'apuesta') && (!manos.length || d.banca.length < 2)) return null;
  const r = d.resultado && typeof d.resultado === 'object' && Number.isFinite(d.resultado.neto) ? { neto: d.resultado.neto, texto: ['victoria', 'derrota', 'empate'].includes(d.resultado.texto) ? d.resultado.texto : 'empate' } : null;
  return { fichas: d.fichas, apuesta: d.apuesta, ultApuesta: d.ultApuesta, zapato: d.zapato.slice(), fase: d.fase, manos, act: ent(d.act, 0, 3) ? d.act : 0, banca: d.banca.slice(), seguro: ent(d.seguro, 0, 1e7) ? d.seguro : 0,
    gastado: ent(d.gastado, 0, 1e8) ? d.gastado : 0, resultado: r, ronda: ent(d.ronda, 0, 1e7) ? d.ronda : 0, pico: ent(d.pico, 0, 1e8) ? d.pico : d.fichas, barajado: !!d.barajado };
}
