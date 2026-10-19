// Corazones (Hearts) para 4 jugadores con baraja francesa. Sin DOM, probable con Node.
// Cartas: id = palo * 13 + rango (palo 0 ♠, 1 ♥, 2 ♦, 3 ♣ · rango 0 = As … 12 = Rey). El As es la carta más alta.
import { nuevaBaraja, barajar } from '../../core/cartas.js';

export const PICAS = 0, CORAZONES = 1, DIAMANTES = 2, TREBOLES = 3;
export const DAMA_PICAS = 11, DOS_TREBOLES = 3 * 13 + 1;
export const palo = c => (c / 13) | 0;
export const valor = c => { const r = c % 13; return r === 0 ? 14 : r + 1; };      // 2..14
export const puntos = c => (palo(c) === CORAZONES ? 1 : c === DAMA_PICAS ? 13 : 0);
export const PASES = ['izquierda', 'derecha', 'enfrente', 'ninguno'];             // se van alternando mano a mano
export const METAS = [50, 100];
export const NOMBRES = ['Tú', 'Oeste', 'Norte', 'Este'];                         // sentido de juego: Tú → Oeste → Norte → Este
const destino = (j, dir) => (dir === 'izquierda' ? (j + 1) % 4 : dir === 'derecha' ? (j + 3) % 4 : (j + 2) % 4);
const ordenar = m => m.sort((a, b) => palo(a) - palo(b) || valor(a) - valor(b));

export function crear({ nivel = 'medio', meta = 100, luna = 'resto' } = {}) {
  const S = { nivel, meta: METAS.includes(meta) ? meta : 100, luna: luna === 'resta' ? 'resta' : 'resto', total: [0, 0, 0, 0], mano: 0, hist: [], fase: 'pasar' };
  nuevaMano(S); return S;
}
export function nuevaMano(S) {
  const m = barajar(nuevaBaraja(1));
  S.manos = [0, 1, 2, 3].map(j => ordenar(m.slice(j * 13, j * 13 + 13)));
  S.dir = PASES[S.mano % 4]; S.mano++;
  S.pase = [null, null, null, null]; S.recibidas = []; S.baza = []; S.ganadas = [[], [], [], []]; S.rotos = false; S.nbaza = 0; S.previa = null; S.lunaDe = -1;
  S.vistas = []; S.fallos = [0, 0, 0, 0];                                         // cartas ya jugadas y palos de los que cada uno se ha quedado sin cartas (bits)
  if (S.dir === 'ninguno') empezarJuego(S); else { S.fase = 'pasar'; S.turno = -1; }
}
function empezarJuego(S) {
  S.fase = 'jugar'; S.turno = S.manos.findIndex(m => m.includes(DOS_TREBOLES)); S.lider = S.turno;
}
// Pase: cada jugador elige 3 cartas; cuando están las 4 elecciones se intercambian a la vez
export function elegirPase(S, j, cartas) {
  if (S.fase !== 'pasar' || !Array.isArray(cartas) || cartas.length !== 3 || new Set(cartas).size !== 3 || !cartas.every(c => S.manos[j].includes(c))) return false;
  S.pase[j] = cartas.slice();
  if (S.pase.every(Boolean)) {
    for (let k = 0; k < 4; k++) S.manos[k] = S.manos[k].filter(c => !S.pase[k].includes(c));
    for (let k = 0; k < 4; k++) S.manos[destino(k, S.dir)].push(...S.pase[k]);
    S.manos.forEach(ordenar); S.recibidas = S.pase[(S.dir === 'izquierda' ? 3 : S.dir === 'derecha' ? 1 : 2)].slice();   // las que te llegan a ti
    empezarJuego(S);
  }
  return true;
}
// Cartas que puede jugar j ahora mismo
export function jugables(S, j) {
  const m = S.manos[j]; if (S.fase !== 'jugar' || S.turno !== j) return [];
  if (S.nbaza === 0 && !S.baza.length) return m.includes(DOS_TREBOLES) ? [DOS_TREBOLES] : m;
  if (S.baza.length) {
    const p = palo(S.baza[0].c), mismos = m.filter(c => palo(c) === p);
    if (mismos.length) return mismos;
    if (S.nbaza === 0) { const limpias = m.filter(c => !puntos(c)); if (limpias.length) return limpias; }   // en la primera baza no se tiran puntos
    return m;
  }
  if (!S.rotos) { const sin = m.filter(c => palo(c) !== CORAZONES); if (sin.length) return sin; }       // no se sale de corazones sin que estén rotos
  return m;
}
export const ganadorBaza = b => { const p = palo(b[0].c); return b.filter(x => palo(x.c) === p).reduce((a, x) => (valor(x.c) > valor(a.c) ? x : a)).j; };
export function jugar(S, j, c) {
  if (!jugables(S, j).includes(c)) return false;
  S.manos[j] = S.manos[j].filter(x => x !== c);
  if (S.baza.length && palo(c) !== palo(S.baza[0].c)) S.fallos[j] |= 1 << palo(S.baza[0].c);
  S.baza.push({ j, c }); S.vistas.push(c);
  if (palo(c) === CORAZONES) S.rotos = true;                                    // ya se puede salir de corazones
  if (S.baza.length < 4) { S.turno = (j + 1) % 4; return true; }
  S.fase = 'baza'; S.turno = -1; return true;
}
// Se recoge la baza (la interfaz lo hace tras una pausa para que se vea)
export function cerrarBaza(S) {
  if (S.fase !== 'baza') return false;
  const g = ganadorBaza(S.baza), pts = S.baza.reduce((a, x) => a + puntos(x.c), 0);
  S.ganadas[g].push(...S.baza.map(x => x.c)); S.previa = { mesa: S.baza, ganador: g, puntos: pts };
  S.baza = []; S.nbaza++; S.lider = g; S.turno = g;
  if (S.nbaza < 13) { S.fase = 'jugar'; return true; }
  // fin de la mano: puntos (o «tiro a la luna» si alguien se lleva los 26)
  const p = S.ganadas.map(l => l.reduce((a, c) => a + puntos(c), 0)), luna = p.findIndex(x => x === 26);
  let fila = p.slice();
  if (luna >= 0) { S.lunaDe = luna; fila = S.luna === 'resta' ? p.map((_, k) => (k === luna ? -26 : 0)) : p.map((_, k) => (k === luna ? 0 : 26)); }
  S.total = S.total.map((t, k) => t + fila[k]); S.hist.push(fila); S.turno = -1;
  S.fase = S.total.some(t => t >= S.meta) ? 'fin' : 'finMano';
  return true;
}
export const puntosMano = S => S.ganadas.map(l => l.reduce((a, c) => a + puntos(c), 0));
export function ganadores(S) { const m = Math.min(...S.total); return [0, 1, 2, 3].filter(k => S.total[k] === m); }

/* ---------- IA ---------- */
// Pase: la Dama de picas (si no hay muchas picas para protegerla), As y Rey de picas sin la dama, corazones altos y
// cartas altas de palos cortos (para quedarse sin ese palo y poder descartar puntos)
export function sugerirPase(S, j) {
  const m = S.manos[j], np = m.filter(c => palo(c) === PICAS).length, tieneQ = m.includes(DAMA_PICAS);
  const peligro = c => {
    let v = valor(c);
    if (c === DAMA_PICAS) return np >= 5 ? 0 : 100;
    if (palo(c) === PICAS && v > 12) return tieneQ || np >= 5 ? 5 : 60;           // As y Rey de picas: atraen a la dama
    if (palo(c) === PICAS) return 0;                                              // picas bajas protegen
    const largo = m.filter(x => palo(x) === palo(c)).length;
    if (palo(c) === CORAZONES) v += 6;
    return v * 3 + (6 - Math.min(largo, 6)) * 4;
  };
  return m.slice().sort((a, b) => peligro(b) - peligro(a)).slice(0, 3);
}
export function elegir(S, j) {
  const ops = jugables(S, j); if (ops.length === 1) return ops[0];
  if (S.nivel === 'facil' && Math.random() < .3) return ops[Math.floor(Math.random() * ops.length)];
  const qJugada = S.vistas.includes(DAMA_PICAS), m = S.manos[j];
  const bajo = l => l.reduce((a, c) => (valor(c) < valor(a) ? c : a)), alto = l => l.reduce((a, c) => (valor(c) > valor(a) ? c : a));
  if (!S.baza.length) {                                                          // salgo yo
    let l = ops.slice();
    // con la dama de picas en mano, no salir de picas altas; sin ella, salir de picas bajas para «cazarla»
    if (m.includes(DAMA_PICAS) || (!qJugada && S.nivel === 'dificil')) l = l.filter(c => !(palo(c) === PICAS && valor(c) >= 12)) .length ? l.filter(c => !(palo(c) === PICAS && valor(c) >= 12)) : l;
    // preferir palos en los que quedan muchas cartas fuera (es menos probable que un rival falle y me cuele puntos)
    const pend = p => 13 - S.vistas.filter(c => palo(c) === p).length - m.filter(c => palo(c) === p).length;
    return l.slice().sort((a, b) => valor(a) - valor(b) - (S.nivel === 'dificil' ? (pend(palo(a)) - pend(palo(b))) * .4 : 0))[0];
  }
  const p = palo(S.baza[0].c), sirvo = palo(ops[0]) === p;
  const actual = S.baza.filter(x => palo(x.c) === p).reduce((a, x) => (valor(x.c) > valor(a.c) ? x : a)).c;
  const ptsMesa = S.baza.reduce((a, x) => a + puntos(x.c), 0), ultimo = S.baza.length === 3;
  if (sirvo) {
    const debajo = ops.filter(c => valor(c) < valor(actual));
    if (p === PICAS && ops.includes(DAMA_PICAS) && valor(actual) > 12) return DAMA_PICAS;   // alguien ya ha puesto As o Rey: le cuelo la dama
    if (ultimo && !ptsMesa) { const sinQ = ops.filter(c => c !== DAMA_PICAS); return alto(sinQ.length ? sinQ : ops); }   // baza limpia: me la llevo con la más alta
    if (debajo.length) return alto(debajo);                                       // la más alta que no gane la baza
    const sinQ = ops.filter(c => c !== DAMA_PICAS);
    return ultimo ? alto(sinQ.length ? sinQ : ops) : bajo(sinQ.length ? sinQ : ops);
  }
  // no tengo del palo: me deshago de lo peor (dama de picas, corazones altos, picas altas, cartas altas)
  if (ops.includes(DAMA_PICAS)) return DAMA_PICAS;
  const malo = c => (palo(c) === CORAZONES ? 20 : 0) + (palo(c) === PICAS && valor(c) > 12 && !qJugada ? 30 : 0) + valor(c);
  return ops.slice().sort((a, b) => malo(b) - malo(a))[0];
}

/* ---------- validación ---------- */
export function validar(d) {
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, carta = v => ent(v, 0, 51);
  if (!d || typeof d !== 'object' || !['facil', 'medio', 'dificil'].includes(d.nivel) || !METAS.includes(d.meta)) return null;
  if (!['pasar', 'jugar', 'baza', 'finMano', 'fin'].includes(d.fase) || !PASES.includes(d.dir)) return null;
  if (!Array.isArray(d.manos) || d.manos.length !== 4 || !d.manos.every(m => Array.isArray(m) && m.every(carta))) return null;
  if (!Array.isArray(d.baza) || !d.baza.every(x => x && ent(x.j, 0, 3) && carta(x.c)) || !Array.isArray(d.ganadas) || d.ganadas.length !== 4 || !d.ganadas.every(l => Array.isArray(l) && l.every(carta))) return null;
  const todas = [...d.manos.flat(), ...d.baza.map(x => x.c), ...d.ganadas.flat()];
  if (todas.length !== 52 || new Set(todas).size !== 52) return null;
  if (!Array.isArray(d.total) || d.total.length !== 4 || !d.total.every(t => ent(t, -1e4, 1e4))) return null;
  const hist = Array.isArray(d.hist) ? d.hist.filter(f => Array.isArray(f) && f.length === 4 && f.every(v => ent(v, -26, 26))).slice(-60) : [];
  const pase = Array.isArray(d.pase) && d.pase.length === 4 ? d.pase.map((p, k) => (Array.isArray(p) && p.length === 3 && p.every(c => d.manos[k].includes(c)) ? p.slice() : null)) : [null, null, null, null];
  const pv = d.previa && Array.isArray(d.previa.mesa) && ent(d.previa.ganador, 0, 3) ? { mesa: d.previa.mesa.filter(x => x && ent(x.j, 0, 3) && carta(x.c)), ganador: d.previa.ganador, puntos: ent(d.previa.puntos, 0, 26) ? d.previa.puntos : 0 } : null;
  return { nivel: d.nivel, meta: d.meta, luna: d.luna === 'resta' ? 'resta' : 'resto', total: d.total.slice(), mano: ent(d.mano, 1, 1e4) ? d.mano : 1, hist, fase: d.fase, dir: d.dir,
    manos: d.manos.map(m => ordenar(m.slice())), pase: d.fase === 'pasar' ? pase : [null, null, null, null], recibidas: Array.isArray(d.recibidas) ? d.recibidas.filter(carta).slice(0, 3) : [],
    baza: d.baza.map(x => ({ j: x.j, c: x.c })), ganadas: d.ganadas.map(l => l.slice()), rotos: !!d.rotos, nbaza: ent(d.nbaza, 0, 13) ? d.nbaza : 0, previa: pv, lunaDe: ent(d.lunaDe, -1, 3) ? d.lunaDe : -1,
    vistas: Array.isArray(d.vistas) ? d.vistas.filter(carta) : [], fallos: Array.isArray(d.fallos) && d.fallos.length === 4 ? d.fallos.map(f => (ent(f, 0, 15) ? f : 0)) : [0, 0, 0, 0],
    turno: ent(d.turno, -1, 3) ? d.turno : -1, lider: ent(d.lider, 0, 3) ? d.lider : 0 };
}
