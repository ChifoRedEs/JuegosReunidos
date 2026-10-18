// Motor de la Ruleta de la Suerte (sin DOM, probable con Node).
// Turno: girar la ruleta → si cae en premio, decir una consonante (cobras el premio por cada vez que aparece).
// También puedes comprar una vocal (250 €) o resolver el panel. Fallar una letra, «Quiebra» o «Pierde turno» pasa el turno.
// Quien resuelve el panel se lleva al marcador el dinero de la ronda; los demás lo pierden.
import { PANELES } from './paneles.js';
import { rnd } from '../../core/dom.js';

export const SEGS = [300, 'Q', 500, 250, 600, 350, 'P', 800, 200, 450, 1000, 150, 400, 700, 'Q', 300, 550, 900, 'P', 200, 650, 500, 350, 250];
export const VOCALES = 'AEIOU', LETRAS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ', PRECIO_VOCAL = 250;
export const FRECUENCIA = 'SRNDLCTMPBGVYQHFZJÑXKW';           // consonantes más frecuentes en español
export const NIVEL = {
  facil: { nombre: 'Fácil', acierto: .45, umbral: .85, resuelve: .75 },
  medio: { nombre: 'Medio', acierto: .65, umbral: .7, resuelve: .9 },
  dificil: { nombre: 'Difícil', acierto: .85, umbral: .55, resuelve: 1 },
};
export const RONDAS = [3, 4, 5];

export function base(ch) { const u = ch.toUpperCase(); return u === 'Ñ' ? 'Ñ' : u.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
export const esLetra = ch => ch.length === 1 && LETRAS.includes(base(ch));
export const clave = t => [...t].filter(esLetra).map(base).join('');
export const jugador = S => S.jug[S.turno];
export const panel = S => PANELES[S.panel];
export const letrasPanel = S => new Set(clave(panel(S).t));
export const cuenta = (S, L) => [...clave(panel(S).t)].filter(x => x === L).length;
export const quedan = (S, vocales) => [...letrasPanel(S)].filter(L => VOCALES.includes(L) === vocales && !S.usadas.includes(L));
export const revelado = S => { const t = clave(panel(S).t); return t.length ? [...t].filter(L => S.usadas.includes(L)).length / t.length : 1; };
const log = (S, t) => { S.log.unshift(t); if (S.log.length > 5) S.log.length = 5; };
export const dinero = n => n.toLocaleString('es-ES') + ' €';

export function crear({ jugadores, rondas = 4, nivel = 'medio' }) {
  const S = { rondas: RONDAS.includes(rondas) ? rondas : 4, nivel: NIVEL[nivel] ? nivel : 'medio', ronda: 0, turno: 0, fase: 'girar', valor: 0, panel: 0, usadas: '', vistos: [], ganadorRonda: -1, ganador: -1, log: [], rot: 0,
    jug: jugadores.slice(0, 3).map(j => ({ nombre: String(j.nombre).slice(0, 14) || 'Jugador', cpu: !!j.cpu, banco: 0, total: 0 })) };
  nuevaRonda(S); return S;
}
export function nuevaRonda(S) {
  let libres = PANELES.map((_, i) => i).filter(i => !S.vistos.includes(i));
  if (!libres.length) { S.vistos = []; libres = PANELES.map((_, i) => i); }
  S.panel = libres[rnd(libres.length)]; S.vistos.push(S.panel); if (S.vistos.length > PANELES.length) S.vistos = S.vistos.slice(-PANELES.length);
  S.ronda++; S.usadas = ''; S.valor = 0; S.ganadorRonda = -1; S.fase = 'girar';
  S.jug.forEach(j => { j.banco = 0; });
  S.turno = (S.ronda - 1) % S.jug.length;
  log(S, `Ronda ${S.ronda} de ${S.rondas}. Empieza ${jugador(S).nombre}.`);
}
function pasar(S) { S.turno = (S.turno + 1) % S.jug.length; S.fase = 'girar'; S.valor = 0; }

// Resultado de la tirada (índice de la casilla de la ruleta en la que se ha parado)
export function caer(S, idx) {
  if (S.fase !== 'girar') return null;
  const v = SEGS[idx], p = jugador(S);
  if (v === 'Q') { p.banco = 0; log(S, `¡Quiebra! ${p.nombre} pierde el dinero de la ronda.`); pasar(S); return 'Q'; }
  if (v === 'P') { log(S, `${p.nombre} pierde el turno.`); pasar(S); return 'P'; }
  S.valor = v; S.fase = 'consonante'; return v;
}
export function comprarVocal(S) {
  const p = jugador(S);
  if (S.fase !== 'girar' || p.banco < PRECIO_VOCAL || !quedan(S, true).length) return false;
  p.banco -= PRECIO_VOCAL; S.fase = 'vocal'; return true;
}
// Pedir una letra (consonante tras girar, o la vocal comprada). Devuelve cuántas hay, o -1 si no es válida.
export function pedir(S, L) {
  L = base(L);
  if (!LETRAS.includes(L) || S.usadas.includes(L)) return -1;
  const vocal = VOCALES.includes(L);
  if ((S.fase === 'consonante' && vocal) || (S.fase === 'vocal' && !vocal) || (S.fase !== 'consonante' && S.fase !== 'vocal')) return -1;
  S.usadas += L;
  const n = cuenta(S, L), p = jugador(S);
  if (n > 0) {
    if (!vocal) p.banco += S.valor * n;
    log(S, `${p.nombre}: ${n} ${L}${!vocal ? ` (+${dinero(S.valor * n)})` : ''}.`);
    S.fase = 'girar'; S.valor = 0;
    if ([...letrasPanel(S)].every(x => S.usadas.includes(x))) ganarRonda(S);
  } else { log(S, `${p.nombre}: no hay ninguna ${L}.`); pasar(S); }
  return n;
}
export function resolver(S, texto) {
  if (S.fase !== 'girar') return false;
  const ok = clave(texto) === clave(panel(S).t) && clave(texto).length > 0;
  if (ok) ganarRonda(S); else { log(S, `${jugador(S).nombre} falla al resolver.`); pasar(S); }
  return ok;
}
function ganarRonda(S) {
  const p = jugador(S);
  for (const L of letrasPanel(S)) if (!S.usadas.includes(L)) S.usadas += L;
  p.total += p.banco; S.ganadorRonda = S.turno; S.valor = 0;
  log(S, `¡${p.nombre} resuelve el panel y se lleva ${dinero(p.banco)}!`);
  if (S.ronda >= S.rondas) {
    let g = 0; S.jug.forEach((j, k) => { if (j.total > S.jug[g].total) g = k; });
    S.ganador = g; S.fase = 'fin'; log(S, `Fin de la partida: gana ${S.jug[g].nombre}.`);
  } else S.fase = 'ronda';
}
export function siguienteRonda(S) { if (S.fase !== 'ronda') return false; nuevaRonda(S); return true; }

/* ---------- CPU ---------- */
export function cpuDecidir(S) {                                // 'girar' | 'vocal' | 'resolver'
  const p = jugador(S), cfg = NIVEL[S.nivel], cons = quedan(S, false).length, voc = quedan(S, true).length;
  if (revelado(S) >= cfg.umbral || (!cons && (p.banco < PRECIO_VOCAL || !voc))) return 'resolver';
  if (voc && p.banco >= PRECIO_VOCAL && (!cons || Math.random() < .3)) return 'vocal';
  return cons ? 'girar' : 'resolver';
}
export function cpuLetra(S) {
  const vocal = S.fase === 'vocal', cfg = NIVEL[S.nivel];
  const buenas = quedan(S, vocal), libres = [...(vocal ? VOCALES : FRECUENCIA)].filter(L => !S.usadas.includes(L));
  if (buenas.length && Math.random() < cfg.acierto) return buenas.sort((a, b) => cuenta(S, b) - cuenta(S, a))[0];
  const malas = libres.filter(L => !buenas.includes(L)), pool = (malas.length ? malas : libres).slice(0, 6);
  return pool[rnd(pool.length)];
}
export const cpuAcierta = S => Math.random() < NIVEL[S.nivel].resuelve * (.55 + .45 * revelado(S));

/* ---------- validación del estado guardado ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || !RONDAS.includes(d.rondas) || !NIVEL[d.nivel] || !Array.isArray(d.jug) || d.jug.length < 1 || d.jug.length > 3) return null;
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  const jug = [];
  for (const j of d.jug) {
    if (!j || typeof j.nombre !== 'string' || !ent(j.banco, 0, 1e7) || !ent(j.total, 0, 1e8)) return null;
    jug.push({ nombre: j.nombre.slice(0, 14), cpu: !!j.cpu, banco: j.banco, total: j.total });
  }
  if (!ent(d.ronda, 1, d.rondas) || !ent(d.turno, 0, jug.length - 1) || !ent(d.panel, 0, PANELES.length - 1)) return null;
  if (!['girar', 'consonante', 'vocal', 'ronda', 'fin'].includes(d.fase)) return null;
  if (typeof d.usadas !== 'string' || ![...d.usadas].every(L => LETRAS.includes(L)) || new Set(d.usadas).size !== d.usadas.length) return null;
  const valor = d.fase === 'consonante' ? (SEGS.includes(d.valor) && typeof d.valor === 'number' ? d.valor : null) : 0;
  if (valor === null) return null;
  return { rondas: d.rondas, nivel: d.nivel, ronda: d.ronda, turno: d.turno, fase: d.fase, valor, panel: d.panel, usadas: d.usadas,
    vistos: Array.isArray(d.vistos) ? d.vistos.filter(v => ent(v, 0, PANELES.length - 1)).slice(-PANELES.length) : [d.panel],
    ganadorRonda: ent(d.ganadorRonda, -1, jug.length - 1) ? d.ganadorRonda : -1, ganador: ent(d.ganador, -1, jug.length - 1) ? d.ganador : -1,
    log: Array.isArray(d.log) ? d.log.filter(x => typeof x === 'string').slice(0, 5).map(x => x.slice(0, 160)) : [],
    rot: Number.isFinite(d.rot) ? d.rot % (2 * Math.PI) : 0, jug };
}
