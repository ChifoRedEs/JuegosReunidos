// Motor de la Brisca (sin DOM, probable con Node). Baraja española de 40 cartas (con 3 jugadores se retira el 2 de oros).
// Sin obligación de servir. 2 jugadores individuales, 3 individuales o 4 en parejas (jugadores 0 y 2 contra 1 y 3).
import { barajar, nuevaBarajaEs, paloEs, rangoEs } from '../../core/cartas.js';

export const puntos = id => { const r = rangoEs(id); return r === 1 ? 11 : r === 3 ? 10 : r === 12 ? 4 : r === 11 ? 3 : r === 10 ? 2 : 0; };
const ORDEN = { 1: 10, 3: 9, 12: 8, 11: 7, 10: 6, 7: 5, 6: 4, 5: 3, 4: 2, 2: 1 };
export const fuerza = id => ORDEN[rangoEs(id)];
export const equipoDe = (S, j) => (S.n === 4 ? j % 2 : j);
export const numEquipos = S => (S.n === 4 ? 2 : S.n);

export function nueva(n, nivel = 'medio', cambio = false, lider = null) {
  let mazo = barajar(nuevaBarajaEs()); if (n === 3) mazo = mazo.filter(c => c !== 1);      // 2 de oros fuera
  const manos = Array.from({ length: n }, () => []);
  for (let k = 0; k < 3; k++) for (let j = 0; j < n; j++) manos[j].push(mazo.pop());
  const tri = mazo[0], l = lider == null ? Math.floor(Math.random() * n) : lider;
  return { n, nivel, cambio: !!cambio, mazo, triunfoCarta: tri, triunfo: paloEs(tri), manos, mesa: [], turno: l, lider: l, ganadas: Array.from({ length: n }, () => []), fase: 'jugando', ultimaBaza: null, resultado: null, ronda: 0, cambios: 0 };
}
export const jugadas = (S, j) => (S.fase === 'jugando' && S.turno === j ? S.manos[j].slice() : []);
export function jugar(S, j, c) {
  if (S.fase !== 'jugando' || S.turno !== j || !S.manos[j].includes(c)) return false;
  S.manos[j].splice(S.manos[j].indexOf(c), 1); S.mesa.push({ j, c }); S.ultimaBaza = null;
  if (S.mesa.length === S.n) { S.fase = 'baza'; S.turno = -1; } else S.turno = (j + 1) % S.n;
  return true;
}
export function ganadorMesa(S) {
  let mejor = S.mesa[0];
  for (const m of S.mesa.slice(1)) {
    const a = paloEs(m.c) === S.triunfo, b = paloEs(mejor.c) === S.triunfo;
    if (a && !b) mejor = m; else if (a === b && paloEs(m.c) === paloEs(mejor.c) && fuerza(m.c) > fuerza(mejor.c)) mejor = m;
  }
  return mejor.j;
}
export function cerrarBaza(S) {
  if (S.fase !== 'baza') return false;
  const g = ganadorMesa(S), cartas = S.mesa.map(m => m.c), pts = cartas.reduce((s, c) => s + puntos(c), 0);
  S.ganadas[g].push(...cartas); S.ultimaBaza = { mesa: S.mesa.slice(), ganador: g, puntos: pts }; S.mesa = [];
  for (let k = 0; k < S.n && S.mazo.length; k++) S.manos[(g + k) % S.n].push(S.mazo.pop());            // roba primero el que ganó; el último se lleva el triunfo
  S.ronda++; S.lider = g; S.turno = g; S.fase = 'jugando';
  if (S.manos.every(m => !m.length) && !S.mazo.length) terminar(S);
  return true;
}
export function puedeCambiar(S, j) {
  return S.cambio && S.fase === 'jugando' && S.turno === j && !S.mesa.length && S.mazo.length > 0 && rangoEs(S.triunfoCarta) !== 7 && S.manos[j].includes(S.triunfo * 10 + 6);
}
export function cambiar(S, j) {                        // cambiar el 7 del triunfo por la carta que se ve
  if (!puedeCambiar(S, j)) return false;
  const siete = S.triunfo * 10 + 6, m = S.manos[j]; m[m.indexOf(siete)] = S.triunfoCarta; S.mazo[0] = siete; S.triunfoCarta = siete; S.cambios++; return true;
}
export const puntosEquipo = S => { const e = Array(numEquipos(S)).fill(0); S.ganadas.forEach((g, j) => { e[equipoDe(S, j)] += g.reduce((s, c) => s + puntos(c), 0); }); return e; };
function terminar(S) {
  const pts = puntosEquipo(S), mejor = Math.max(...pts), ganan = pts.map((p, e) => (p === mejor ? e : -1)).filter(e => e >= 0), yo = equipoDe(S, 0);
  S.fase = 'fin';
  S.resultado = { puntos: pts, ganan, humano: ganan.length > 1 ? (ganan.includes(yo) ? 'empate' : 'pierde') : ganan[0] === yo ? 'gana' : 'pierde' };
}

/* ---------- validación del estado guardado ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || ![2, 3, 4].includes(d.n)) return null;
  const n = d.n, ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, carta = v => ent(v, 0, 39), vistos = new Set();
  const lista = (a, max) => Array.isArray(a) && a.length <= max && a.every(v => carta(v) && !vistos.has(v) && vistos.add(v));
  if (!['facil', 'medio', 'dificil'].includes(d.nivel) || !Array.isArray(d.manos) || d.manos.length !== n || !Array.isArray(d.ganadas) || d.ganadas.length !== n) return null;
  if (!d.manos.every(m => lista(m, 3)) || !d.ganadas.every(g => lista(g, 40)) || !lista(d.mazo, 40)) return null;
  const mesa = Array.isArray(d.mesa) && d.mesa.length <= n && d.mesa.every(m => m && ent(m.j, 0, n - 1) && lista([m.c], 1)) ? d.mesa.map(m => ({ j: m.j, c: m.c })) : null; if (!mesa) return null;
  const total = n === 3 ? 39 : 40; if (vistos.size !== total) return null;
  if (!['jugando', 'baza', 'fin'].includes(d.fase) || !ent(d.turno, -1, n - 1) || !ent(d.lider, 0, n - 1) || !carta(d.triunfoCarta)) return null;
  const tc = d.triunfoCarta; if (d.mazo.length && d.mazo[0] !== tc) return null;
  const ub = d.ultimaBaza && Array.isArray(d.ultimaBaza.mesa) && ent(d.ultimaBaza.ganador, 0, n - 1) ? { mesa: d.ultimaBaza.mesa.filter(m => m && ent(m.j, 0, n - 1) && carta(m.c)).map(m => ({ j: m.j, c: m.c })), ganador: d.ultimaBaza.ganador, puntos: ent(d.ultimaBaza.puntos, 0, 120) ? d.ultimaBaza.puntos : 0 } : null;
  const S = { n, nivel: d.nivel, cambio: !!d.cambio, mazo: d.mazo.slice(), triunfoCarta: tc, triunfo: paloEs(tc), manos: d.manos.map(m => m.slice()), mesa, turno: d.turno, lider: d.lider, ganadas: d.ganadas.map(g => g.slice()), fase: d.fase, ultimaBaza: ub, resultado: null, ronda: ent(d.ronda, 0, 100) ? d.ronda : 0, cambios: ent(d.cambios, 0, 20) ? d.cambios : 0 };
  if (S.fase === 'fin') terminar(S);
  return S;
}
