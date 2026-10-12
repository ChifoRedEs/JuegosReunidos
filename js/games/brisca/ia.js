// IA de la Brisca: Fácil (casi al azar), Medio (reglas de experto) y Difícil (simulación de Monte Carlo con las cartas desconocidas).
import { puntos, fuerza, jugar, cerrarBaza, ganadorMesa, equipoDe, puntosEquipo, numEquipos } from './motor.js';
import { paloEs } from '../../core/cartas.js';

const copia = S => ({ ...S, mazo: S.mazo.slice(), manos: S.manos.map(m => m.slice()), mesa: S.mesa.map(m => ({ ...m })), ganadas: S.ganadas.map(g => g.slice()), ultimaBaza: null, resultado: null });
const esT = (S, c) => paloEs(c) === S.triunfo;
const valor = (S, c) => puntos(c) * 10 + fuerza(c) + (esT(S, c) ? 100 : 0);          // «coste» de gastar una carta

// Medio: heurística para elegir una carta de la mano del jugador j
export function heuristica(S, j) {
  const mano = S.manos[j];
  if (mano.length === 1) return mano[0];
  const barata = lista => lista.slice().sort((a, b) => valor(S, a) - valor(S, b))[0];
  const sinStock = !S.mazo.length;
  if (!S.mesa.length) {                                                                   // salgo yo
    const noT = mano.filter(c => !esT(S, c) && puntos(c) === 0);
    if (noT.length) return barata(noT);
    const pocos = mano.filter(c => !esT(S, c) && puntos(c) < 10);
    if (pocos.length && !sinStock) return barata(pocos);
    return sinStock ? mano.slice().sort((a, b) => valor(S, b) - valor(S, a))[0] : barata(mano);
  }
  const g = ganadorMesa(S), cg = S.mesa.find(m => m.j === g).c, ptsMesa = S.mesa.reduce((s, m) => s + puntos(m.c), 0);
  const companero = S.n === 4 && equipoDe(S, g) === equipoDe(S, j), ultimo = S.mesa.length === S.n - 1;
  const gana = c => { const mt = S.mesa.concat([{ j, c }]), a = esT(S, c), b = esT(S, cg); return (a && !b) || (a === b && paloEs(c) === paloEs(cg) && fuerza(c) > fuerza(cg)); };
  const ganadoras = mano.filter(gana);
  if (companero) {
    if (ultimo || fuerza(cg) >= 9 || esT(S, cg)) { const carga = mano.filter(c => !esT(S, c)).sort((a, b) => puntos(b) - puntos(a))[0]; if (carga && puntos(carga) > 0) return carga; }
    return barata(mano);
  }
  if (ganadoras.length && (ptsMesa >= 4 || esT(S, cg) || sinStock || ultimo)) {
    const sinT = ganadoras.filter(c => !esT(S, c)), c = barata(sinT.length ? sinT : ganadoras);
    if (ptsMesa + puntos(c) >= 8 || ptsMesa >= 4 || sinStock || (ultimo && ptsMesa > 0)) return c;
  }
  const descarte = mano.filter(c => !esT(S, c) && puntos(c) === 0); if (descarte.length) return barata(descarte);
  return barata(mano.filter(c => puntos(c) < 10).length ? mano.filter(c => puntos(c) < 10) : mano);
}

function repartirDesconocidas(S, j) {                                                     // reparte al azar las cartas que j no ve
  const vistas = new Set([...S.manos[j], ...S.mesa.map(m => m.c), ...S.ganadas.flat(), S.triunfoCarta]), todas = [];
  for (let c = 0; c < 40; c++) if (!vistas.has(c) && !(S.n === 3 && c === 1)) todas.push(c);
  for (let i = todas.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [todas[i], todas[k]] = [todas[k], todas[i]]; }
  const T = copia(S), resto = todas.slice();
  for (let k = 0; k < S.n; k++) if (k !== j) { T.manos[k] = []; const faltan = S.manos[k].length; for (let q = 0; q < faltan; q++) T.manos[k].push(resto.pop()); }
  const nStock = S.mazo.length - (S.mazo.length ? 1 : 0); T.mazo = S.mazo.length ? [S.triunfoCarta, ...resto.slice(0, nStock)] : [];
  return T;
}
function simular(T) {                                                                     // juega la partida con la heurística hasta el final
  let guardia = 0;
  while (T.fase !== 'fin' && guardia++ < 400) {
    if (T.fase === 'baza') { cerrarBaza(T); continue; }
    jugar(T, T.turno, heuristica(T, T.turno));
  }
}
export function elegir(S, j, nivel) {
  const mano = S.manos[j]; if (mano.length === 1) return mano[0];
  if (nivel === 'facil') { if (Math.random() < .55) return mano[Math.floor(Math.random() * mano.length)]; return heuristica(S, j); }
  if (nivel === 'medio') return heuristica(S, j);
  const yo = equipoDe(S, j), sims = S.mazo.length > 20 ? 90 : 140; let mejor = mano[0], mejorV = -1e9;
  for (const c of mano) {
    let tot = 0;
    for (let k = 0; k < sims; k++) {
      const T = repartirDesconocidas(S, j); jugar(T, j, c); simular(T);
      const pts = puntosEquipo(T), contra = Math.max(...pts.filter((_, e) => e !== yo)); tot += pts[yo] - contra;
    }
    if (tot > mejorV) { mejorV = tot; mejor = c; }
  }
  return mejor;
}
