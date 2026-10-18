// Motor del Cinquillo (baraja española de 40 cartas). Sin DOM, probable con Node.
// Carta id = palo * 10 + posición (0..9 = 1,2,3,4,5,6,7,sota,caballo,rey), como en core/cartas.js. El 5 es la posición 4.
// Mesa: por palo, null (sin abrir) o { lo, hi } = posiciones jugadas. Se juega un 5 para abrir un palo, o la carta contigua
// por abajo (lo − 1) o por arriba (hi + 1). La primera carta de cada mano es el 5 de oros. Si puedes jugar, debes hacerlo.
import { shuffle } from '../../core/dom.js';

export const NIVEL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
export const RONDAS = [1, 3, 5];
export const CINCO_OROS = 4;
export const palo = id => id / 10 | 0, pos = id => id % 10;

export function crear({ jugadores, nivel = 'medio', rondas = 3 }) {
  const S = { nivel: NIVEL[nivel] ? nivel : 'medio', rondas: RONDAS.includes(rondas) ? rondas : 3, ronda: 0, turno: 0, fase: 'jugar', ganadorRonda: -1, ganador: -1, ult: null, log: [], mesa: [null, null, null, null],
    jug: jugadores.slice(0, 4).map(j => ({ nombre: String(j.nombre).slice(0, 14), cpu: !!j.cpu, mano: [], puntos: 0, pases: 0 })) };
  repartir(S); return S;
}
const v = (J, el, tu) => (J.nombre === 'Tú' ? tu : el);
const log = (S, t) => { S.log.unshift(t); if (S.log.length > 6) S.log.length = 6; };
export function repartir(S) {
  const m = shuffle(Array.from({ length: 40 }, (_, i) => i)), n = S.jug.length;
  S.jug.forEach(J => { J.mano = []; J.pases = 0; });
  m.forEach((c, i) => S.jug[i % n].mano.push(c));
  S.mesa = [null, null, null, null]; S.ronda++; S.ganadorRonda = -1; S.ult = null; S.fase = 'jugar';
  S.turno = S.jug.findIndex(J => J.mano.includes(CINCO_OROS));
  log(S, `Mano ${S.ronda}: ${S.jug[S.turno].nombre} ${v(S.jug[S.turno], 'tiene', 'tienes')} el 5 de oros y ${v(S.jug[S.turno], 'empieza', 'empiezas')}.`);
}
export function cabe(S, c) {
  if (!S.mesa[0] && c !== CINCO_OROS) return false;                 // la primera carta es el 5 de oros
  const m = S.mesa[palo(c)], k = pos(c);
  return m ? k === m.lo - 1 || k === m.hi + 1 : k === 4;
}
export const jugables = (S, j = S.turno) => S.jug[j].mano.filter(c => cabe(S, c));
export function jugar(S, j, c) {
  if (S.fase !== 'jugar' || S.turno !== j || !S.jug[j].mano.includes(c) || !cabe(S, c)) return false;
  const J = S.jug[j], p = palo(c), k = pos(c);
  J.mano.splice(J.mano.indexOf(c), 1);
  S.mesa[p] = S.mesa[p] ? { lo: Math.min(S.mesa[p].lo, k), hi: Math.max(S.mesa[p].hi, k) } : { lo: k, hi: k };
  S.ult = { j, c };
  if (!J.mano.length) { finRonda(S, j); return true; }
  S.turno = (j + 1) % S.jug.length; return true;
}
export function pasar(S, j) {
  if (S.fase !== 'jugar' || S.turno !== j || jugables(S, j).length) return false;    // solo se pasa si no se puede jugar
  S.jug[j].pases++; S.ult = { j, c: -1 }; log(S, `${S.jug[j].nombre} ${v(S.jug[j], 'pasa', 'pasas')}.`);
  S.turno = (j + 1) % S.jug.length; return true;
}
function finRonda(S, g) {
  S.ganadorRonda = g;
  S.jug.forEach((J, k) => { if (k !== g) J.puntos += J.mano.length; });
  log(S, `¡${S.jug[g].nombre} ${v(S.jug[g], 'se queda', 'te quedas')} sin cartas y ${v(S.jug[g], 'gana', 'ganas')} la mano ${S.ronda}!`);
  if (S.ronda >= S.rondas) {
    let best = 0; S.jug.forEach((J, k) => { if (J.puntos < S.jug[best].puntos || (J.puntos === S.jug[best].puntos && k === g)) best = k; });
    S.ganador = best; S.fase = 'fin'; log(S, `Fin de la partida: ${v(S.jug[best], 'gana', 'ganas')} ${S.jug[best].nombre === 'Tú' ? 'tú' : S.jug[best].nombre} con ${S.jug[best].puntos} puntos.`);
  } else S.fase = 'finRonda';
}
export function siguienteRonda(S) { if (S.fase !== 'finRonda') return false; repartir(S); return true; }

/* ---------- CPU ---------- */
// Valor de jugar c: abrir camino a cartas propias es bueno; abrir camino a cartas ajenas, malo.
// En difícil, además tiene en cuenta qué palos ha «negado» cada rival al pasar.
export function cpuCarta(S, j = S.turno) {
  const ops = jugables(S, j); if (!ops.length) return -1;
  if (ops.length === 1 || S.nivel === 'facil') return ops[Math.floor(Math.random() * ops.length)];
  const mia = new Set(S.jug[j].mano);
  const puntua = c => {
    const p = palo(c), k = pos(c), m = S.mesa[p];
    const dirs = m ? [k < m.lo ? -1 : 1] : [-1, 1];              // hacia dónde abre esta carta
    let s = 0;
    for (const d of dirs) {
      const sig = p * 10 + k + d;
      if (k + d < 0 || k + d > 9) continue;
      if (mia.has(sig)) s += 3; else s -= 2;                     // la siguiente la tengo yo / la puede tener otro
      let mias = 0; for (let x = k + d; x >= 0 && x <= 9; x += d) if (mia.has(p * 10 + x)) mias++;
      s += mias * (S.nivel === 'dificil' ? 1.2 : .8);            // cartas mías que se van acercando
    }
    if (!m) s -= S.nivel === 'dificil' ? 1.5 : .5;               // abrir un palo da opciones a todos
    return s + Math.random() * .3;
  };
  return ops.map(c => [c, puntua(c)]).sort((a, b) => b[1] - a[1])[0][0];
}

/* ---------- validación ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || !NIVEL[d.nivel] || !RONDAS.includes(d.rondas) || !Array.isArray(d.jug) || d.jug.length < 3 || d.jug.length > 4) return null;
  const ent = (v2, a, b) => Number.isInteger(v2) && v2 >= a && v2 <= b, lista = a => Array.isArray(a) && a.every(c => ent(c, 0, 39));
  const jug = []; for (const J of d.jug) { if (!J || typeof J.nombre !== 'string' || !lista(J.mano) || !ent(J.puntos, 0, 9999)) return null; jug.push({ nombre: J.nombre.slice(0, 14), cpu: !!J.cpu, mano: J.mano.slice(), puntos: J.puntos, pases: ent(J.pases, 0, 999) ? J.pases : 0 }); }
  if (!Array.isArray(d.mesa) || d.mesa.length !== 4) return null;
  const mesa = d.mesa.map(m => (m && ent(m.lo, 0, 4) && ent(m.hi, 4, 9) ? { lo: m.lo, hi: m.hi } : null));
  if (d.mesa.some((m, k) => m && !mesa[k])) return null;
  const enMesa = []; mesa.forEach((m, p) => { if (m) for (let k = m.lo; k <= m.hi; k++) enMesa.push(p * 10 + k); });
  const todas = [...enMesa, ...jug.flatMap(J => J.mano)]; if (todas.length !== 40 || new Set(todas).size !== 40) return null;
  if (!['jugar', 'finRonda', 'fin'].includes(d.fase) || !ent(d.turno, 0, jug.length - 1) || !ent(d.ronda, 1, d.rondas) || !ent(d.ganadorRonda, -1, jug.length - 1) || !ent(d.ganador, -1, jug.length - 1)) return null;
  return { nivel: d.nivel, rondas: d.rondas, ronda: d.ronda, turno: d.turno, fase: d.fase, ganadorRonda: d.ganadorRonda, ganador: d.ganador, mesa, jug,
    ult: d.ult && ent(d.ult.j, 0, jug.length - 1) && ent(d.ult.c, -1, 39) ? { j: d.ult.j, c: d.ult.c } : null,
    log: Array.isArray(d.log) ? d.log.filter(x => typeof x === 'string').slice(0, 6).map(x => x.slice(0, 160)) : [] };
}
