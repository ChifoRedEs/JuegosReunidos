// Motor de «Hijoputa» (Mau-Mau con baraja española de 40 cartas). Sin DOM, probable con Node.
// Carta id = palo * 10 + posición (0..9 = 1,2,3,4,5,6,7,sota,caballo,rey), como en core/cartas.js. Palos: 0 oros, 1 copas, 2 espadas, 3 bastos.
// Se juega una carta del mismo palo o número que la de arriba. Sota = comodín (eliges palo). 2 = +2 acumulable (solo se responde con otro 2).
// As = el siguiente roba 1 y pierde el turno. Rey = repites turno. Con una sola carta hay que gritar «¡Hijoputa!»: si no, +5 cartas.
import { shuffle } from '../../core/dom.js';

export const NIVEL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
export const PALOS = ['oros', 'copas', 'espadas', 'bastos'];
export const palo = id => id / 10 | 0, pos = id => id % 10;
export const AS = 0, DOS = 1, SOTA = 7, REY = 9, PENA = 5;
export const esAs = c => pos(c) === AS, esDos = c => pos(c) === DOS, esSota = c => pos(c) === SOTA, esRey = c => pos(c) === REY;
const PROB_GRITO = { facil: .72, medio: .9, dificil: 1 };           // la CPU se acuerda de gritar con esta probabilidad
const PROB_PILLA = { facil: .15, medio: .35, dificil: .6 };          // la CPU pilla a quien no ha gritado (en cada uno de sus turnos)

export function crear({ jugadores, nivel = 'medio' }, rnd) {
  const S = { nivel: NIVEL[nivel] ? nivel : 'medio', jug: jugadores.slice(0, 4).map(j => ({ nombre: String(j.nombre).slice(0, 14), cpu: !!j.cpu, mano: [], gritado: false })),
    mazo: [], desc: [], turno: 0, paloActivo: 0, castigo: 0, fase: 'jugar', robada: -1, ganador: -1, acusable: -1, log: [], t0: Date.now(),
    st: { turnos: 0, jugadas: jugadores.map(() => 0), robadas: jugadores.map(() => 0), penas: jugadores.map(() => 0) } };
  S.mazo = shuffle(Array.from({ length: 40 }, (_, i) => i), rnd);
  S.jug.forEach(J => { for (let k = 0; k < 7; k++) J.mano.push(S.mazo.pop()); });
  let i = S.mazo.findIndex(c => ![AS, DOS, SOTA, REY].includes(pos(c)));      // la primera carta del descarte es una carta normal
  S.desc.push(S.mazo.splice(i, 1)[0]); S.paloActivo = palo(S.desc[0]);
  log(S, `Empieza ${S.jug[0].nombre}. Carta inicial: ${nombre(S.desc[0])}.`); return S;
}
export const nombre = c => { const r = pos(c); return `${r === SOTA ? 'Sota' : r === 8 ? 'Caballo' : r === REY ? 'Rey' : r === AS ? 'As' : r + 1} de ${PALOS[palo(c)]}`; };
const log = (S, t) => { S.log.unshift(t); if (S.log.length > 7) S.log.length = 7; };
export const tope = S => S.desc[S.desc.length - 1];
export const siguiente = (S, i = S.turno) => (i + 1) % S.jug.length;

export function jugable(S, c) {
  if (S.castigo > 0) return esDos(c);                                // con un castigo pendiente solo vale otro 2
  if (esSota(c)) return true;
  return palo(c) === S.paloActivo || pos(c) === pos(tope(S));
}
export const jugables = (S, i) => (S.fase === 'jugar' || S.fase === 'robo') ? S.jug[i].mano.filter(c => (S.fase === 'robo' ? c === S.robada : true) && jugable(S, c)) : [];
export const puedeJugar = (S, i) => jugables(S, i).length > 0;

function sacar(S, i, n) {                                            // roba n cartas (rebarajando el descarte si hace falta)
  let r = 0;
  for (let k = 0; k < n; k++) {
    if (!S.mazo.length) { if (S.desc.length <= 1) break; const t = S.desc.pop(); S.mazo = shuffle(S.desc); S.desc = [t]; }
    S.jug[i].mano.push(S.mazo.pop()); r++;
  }
  S.st.robadas[i] += r; S.jug[i].gritado = false; if (S.acusable === i) S.acusable = -1; return r;
}
function avanzar(S) {
  S.turno = siguiente(S); S.fase = 'jugar'; S.robada = -1; S.st.turnos++;
  if (S.acusable === S.turno) S.acusable = -1;                      // el que se quedó a una carta ya tuvo su vuelta completa
}
const quien = (S, i) => S.jug[i].nombre;

// Juega la carta c (con paloElegido si es una sota). Devuelve { ok, ganador, castigoGrito, victima, cartasVictima, extra }.
export function jugar(S, i, c, paloElegido) {
  if (S.fase === 'fin' || S.turno !== i || !S.jug[i].mano.includes(c) || !jugables(S, i).includes(c)) return { ok: false };
  const J = S.jug[i], r = { ok: true, carta: c };
  J.mano.splice(J.mano.indexOf(c), 1); S.desc.push(c); S.st.jugadas[i]++; S.fase = 'jugar'; S.robada = -1;
  S.paloActivo = esSota(c) && paloElegido >= 0 && paloElegido < 4 ? paloElegido : palo(c);
  log(S, `${quien(S, i)} juega ${nombre(c)}${esSota(c) ? ` y elige ${PALOS[S.paloActivo]}` : ''}.`);
  if (J.mano.length === 0) {
    if (!J.gritado) { r.castigoGrito = true; sacar(S, i, PENA); S.st.penas[i]++; log(S, `¡${quien(S, i)} no gritó Hijoputa! Roba ${PENA}.`); }
    else { S.ganador = i; S.fase = 'fin'; r.ganador = i; return r; }
  }
  if (J.mano.length === 1 && !J.gritado) S.acusable = i; else if (S.acusable === i) S.acusable = -1;
  if (esDos(c)) { S.castigo += 2; log(S, `Castigo acumulado: +${S.castigo}.`); avanzar(S); }
  else if (esAs(c)) {
    const v = siguiente(S); r.victima = v; r.cartasVictima = sacar(S, v, 1); log(S, `${quien(S, v)} roba 1 y pierde el turno.`);
    S.turno = v; avanzar(S);
  } else if (esRey(c)) { r.extra = true; S.st.turnos++; log(S, `¡${quien(S, i)} repite turno!`); }
  else avanzar(S);
  return r;
}
// Robar. Con castigo pendiente se roban todas las cartas y se pierde el turno; si no, una sola carta (puedes jugarla si encaja).
export function robar(S, i) {
  if (S.fase !== 'jugar' || S.turno !== i) return { ok: false };
  if (S.castigo > 0) { const n = S.castigo; S.castigo = 0; const r = sacar(S, i, n); log(S, `${quien(S, i)} roba ${r} por el castigo.`); avanzar(S); return { ok: true, cartas: r, castigo: true }; }
  const antes = S.jug[i].mano.length; if (!sacar(S, i, 1) && S.jug[i].mano.length === antes) { avanzar(S); return { ok: true, cartas: 0, pasa: true }; }
  const c = S.jug[i].mano[S.jug[i].mano.length - 1]; log(S, `${quien(S, i)} roba una carta.`);
  if (jugable(S, c)) { S.fase = 'robo'; S.robada = c; return { ok: true, cartas: 1, carta: c, jugable: true }; }
  avanzar(S); return { ok: true, cartas: 1, carta: c, pasa: true };
}
export function pasar(S, i) {                                          // guarda la carta robada y pasa el turno
  if (S.fase !== 'robo' || S.turno !== i) return false; log(S, `${quien(S, i)} guarda la carta y pasa.`); avanzar(S); return true;
}
// Gritar «¡Hijoputa!» (solo vale con exactamente una carta)
export function gritar(S, i) { const J = S.jug[i]; if (J.mano.length !== 1 || J.gritado) return false; J.gritado = true; if (S.acusable === i) S.acusable = -1; log(S, `¡${quien(S, i)} grita HIJOPUTA!`); return true; }
// Acusar a k de no haber gritado: roba 5 si es cierto
export function acusar(S, k) {
  const J = S.jug[k]; if (!J || S.acusable !== k || J.mano.length !== 1 || J.gritado) return false;
  sacar(S, k, PENA); S.st.penas[k]++; S.acusable = -1; log(S, `¡${quien(S, k)} no gritó Hijoputa! Roba ${PENA}.`); return true;
}
// Una CPU, al empezar su turno, puede pillar a quien se quedó a una carta sin gritar
export function pillar(S, i, rnd = Math.random) { const k = S.acusable; if (k < 0 || k === i || !S.jug[i].cpu) return -1; return rnd() < PROB_PILLA[S.nivel] && acusar(S, k) ? k : -1; }
export const cpuGrita = (S, i, rnd = Math.random) => S.jug[i].cpu && S.jug[i].mano.length === 1 && rnd() < PROB_GRITO[S.nivel] && gritar(S, i);

/* ---------- IA ---------- */
const cuenta = (mano, p) => mano.filter(c => palo(c) === p).length;
export function elegirPalo(S, i) { const m = S.jug[i].mano; return [0, 1, 2, 3].sort((a, b) => cuenta(m, b) - cuenta(m, a) || Math.random() - .5)[0]; }
export function decidir(S, i, rnd = Math.random) {
  const J = S.jug[i], op = jugables(S, i);
  if (!op.length) return { tipo: S.fase === 'robo' ? 'pasar' : 'robar' };
  if (S.nivel === 'facil') { const c = op[rnd() * op.length | 0]; return { tipo: 'jugar', carta: c, palo: esSota(c) ? elegirPalo(S, i) : -1 }; }
  const sig = S.jug[siguiente(S, i)], peligro = sig.mano.length <= 2, ultimas = J.mano.length <= 3;
  const nota = c => {
    let s = rnd() * .5; const resto = J.mano.length - 1;
    if (esSota(c)) s += ultimas || op.length === 1 ? 6 : -4;           // la sota se guarda para cuando haga falta
    else if (esDos(c)) s += peligro ? 8 : S.castigo > 0 ? 6 : 2;
    else if (esAs(c)) s += peligro ? 7 : 2.5;
    else if (esRey(c)) s += resto > 1 ? 3.5 : 1;                       // repetir turno
    else s += 1 + cuenta(J.mano, palo(c)) * .3;                        // soltar el palo del que más tengo
    if (S.nivel === 'dificil' && resto === 1) s += 2;                  // dejarse una carta que luego pueda jugar
    return s;
  };
  const c = op.slice().sort((a, b) => nota(b) - nota(a))[0];
  const pal = esSota(c) ? elegirPalo({ ...S, jug: S.jug.map((j, k) => k === i ? { ...j, mano: j.mano.filter(x => x !== c) } : j) }, i) : -1;
  return { tipo: 'jugar', carta: c, palo: pal };
}
export function validar(S) {
  try {
    if (!S || !Array.isArray(S.jug) || S.jug.length < 2 || S.jug.length > 4 || !Array.isArray(S.mazo) || !Array.isArray(S.desc) || !S.desc.length) return null;
    const todas = [...S.mazo, ...S.desc, ...S.jug.flatMap(J => J.mano)]; if (todas.length !== 40 || new Set(todas).size !== 40 || todas.some(c => !(c >= 0 && c < 40))) return null;
    if (!(S.turno >= 0 && S.turno < S.jug.length) || !(S.paloActivo >= 0 && S.paloActivo < 4) || !Number.isInteger(S.castigo) || S.castigo < 0) return null;
    return S;
  } catch { return null; }
}
