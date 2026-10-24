// Memorama · motor sin DOM (se prueba con Node).
// Un tablero de cartas boca abajo con parejas de imágenes: se destapan de dos en dos; si son iguales se quedan a la vista y repites turno.
// Estado: { v:1, modo:'solo'|'dos'|'cpu', tema, tam, cols, filas, nivel (CPU), deck:['tema/id',…], ok:[0|1,…], ab:[índices destapados], movs, t, turno:0|1,
//           pts:[a,b], vz (vistazos usados), mem:{índice:'tema/id'} (lo que recuerda la CPU), done, ganador (null | -1 empate | 0 | 1) }
import { BANCOS } from './bancos.js';

export const MODOS = { solo: 'Un jugador', dos: '2 jugadores', cpu: 'Contra la máquina' };
export const NIVELES = { facil: 'Fácil', medio: 'Normal', dificil: 'Difícil' };
// Probabilidad de que la CPU se fije en una carta que se destapa (su «memoria»)
export const MEMORIA = { facil: .25, medio: .55, dificil: .9 };
export const TAMANOS = {
  '3x4': { cols: 3, filas: 4, nombre: 'Mini' }, '4x4': { cols: 4, filas: 4, nombre: 'Pequeño' }, '4x5': { cols: 4, filas: 5, nombre: 'Medio' },
  '5x6': { cols: 5, filas: 6, nombre: 'Grande' }, '6x6': { cols: 6, filas: 6, nombre: 'Enorme' }, '6x8': { cols: 6, filas: 8, nombre: 'Gigante' },
};
export const pares = tam => TAMANOS[tam].cols * TAMANOS[tam].filas / 2;
export const TEMAS = { ...Object.fromEntries(Object.entries(BANCOS).map(([k, b]) => [k, b.nombre])), mezcla: 'Todo mezclado' };
export const MAX_VISTAZOS = 3;

const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const mulberry = a => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const barajar = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = r() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

export const existe = id => { if (typeof id !== 'string') return false; const [t, i, ...x] = id.split('/'); return !x.length && Object.hasOwn(BANCOS, t) && Object.hasOwn(BANCOS[t].items, i); };
export const nombreDe = id => { const [t, i] = id.split('/'); return BANCOS[t].items[i]; };
export const urlDe = id => `img/memorama/${id}.webp`;
export const bolsa = tema => (tema === 'mezcla' ? Object.keys(BANCOS) : [tema]).flatMap(t => Object.keys(BANCOS[t].items).map(i => `${t}/${i}`));

export function cfgOk(c) { return !!c && Object.hasOwn(MODOS, c.modo) && Object.hasOwn(TEMAS, c.tema) && Object.hasOwn(TAMANOS, c.tam) && Object.hasOwn(NIVELES, c.nivel); }

export function crear(cfg, semilla) {
  const { cols, filas } = TAMANOS[cfg.tam], r = mulberry(hash(semilla == null ? Math.random() + ':' + Date.now() : semilla));
  const elegidas = barajar(bolsa(cfg.tema), r).slice(0, cols * filas / 2);
  const deck = barajar([...elegidas, ...elegidas], r);
  return { v: 1, modo: cfg.modo, tema: cfg.tema, tam: cfg.tam, cols, filas, nivel: cfg.nivel, deck, ok: deck.map(() => 0), ab: [], movs: 0, t: 0, turno: 0, pts: [0, 0], vz: 0, mem: {}, done: false, ganador: null };
}
const quedan = S => S.ok.reduce((n, x) => n + (x ? 0 : 1), 0);

// Destapa la carta i. Devuelve null (jugada no válida) o { tipo: 'primera' | 'par' | 'fallo', a, b }.
// Si es un fallo, las dos cartas quedan a la vista hasta que se llame a ocultar().
export function voltear(S, i, r = Math.random) {
  if (S.done || !Number.isInteger(i) || i < 0 || i >= S.deck.length || S.ok[i] || S.ab.includes(i) || S.ab.length >= 2) return null;
  S.ab.push(i);
  if (S.modo === 'cpu' && r() < MEMORIA[S.nivel]) S.mem[i] = S.deck[i];
  if (S.ab.length === 1) return { tipo: 'primera' };
  const [a, b] = S.ab; S.movs++;
  if (S.deck[a] === S.deck[b]) {
    S.ok[a] = S.ok[b] = 1; S.pts[S.turno]++; S.ab = []; delete S.mem[a]; delete S.mem[b];
    if (!quedan(S)) fin(S);
    return { tipo: 'par', a, b };
  }
  return { tipo: 'fallo', a, b };
}
// Tapa de nuevo las dos cartas de un fallo y pasa el turno (si hay más de un jugador)
export function ocultar(S) {
  if (S.ab.length !== 2) return false;
  S.ab = []; if (S.modo !== 'solo') S.turno = 1 - S.turno; return true;
}
function fin(S) {
  S.done = true;
  S.ganador = S.modo === 'solo' ? 0 : S.pts[0] === S.pts[1] ? -1 : S.pts[0] > S.pts[1] ? 0 : 1;
}
// Un vistazo: devuelve true si se puede usar (las cartas se enseñan un momento desde la vista; no cambia el tablero)
export function vistazo(S) { if (S.done || S.vz >= MAX_VISTAZOS || S.ab.length) return false; S.vz++; return true; }

// ¿Cuántas estrellas? Solo para un jugador: cuanto más cerca de un movimiento por pareja, mejor.
export function estrellas(S) { const n = S.deck.length / 2, q = S.movs / n; return q <= 1.7 ? 3 : q <= 2.6 ? 2 : 1; }

// La CPU: elige la próxima carta a destapar según lo que «recuerda» (S.mem). No mira el tablero.
export function jugadaCPU(S, r = Math.random) {
  const libres = []; for (let i = 0; i < S.deck.length; i++) if (!S.ok[i] && !S.ab.includes(i)) libres.push(i);
  if (!libres.length) return -1;
  const pick = l => l[r() * l.length | 0];
  if (S.ab.length === 1) {
    const a = S.ab[0], j = libres.filter(i => S.mem[i] !== undefined && S.mem[i] === S.deck[a]);      // ¿recuerda la pareja de la que acaba de destapar?
    if (j.length) return j[0];
    const nuevas = libres.filter(i => S.mem[i] === undefined); return pick(nuevas.length ? nuevas : libres);
  }
  const vistos = {};
  for (const i of libres) if (S.mem[i] !== undefined) (vistos[S.mem[i]] = vistos[S.mem[i]] || []).push(i);
  const par = Object.values(vistos).find(l => l.length >= 2);
  if (par) return par[0];
  const nuevas = libres.filter(i => S.mem[i] === undefined); return pick(nuevas.length ? nuevas : libres);
}

// Valida datos guardados / importados: devuelve el estado limpio o null
export function validar(d) {
  try {
    if (!d || typeof d !== 'object' || d.v !== 1 || !cfgOk(d)) return null;
    const T = TAMANOS[d.tam], n = T.cols * T.filas;
    if (d.cols !== T.cols || d.filas !== T.filas || !Array.isArray(d.deck) || d.deck.length !== n || !d.deck.every(existe)) return null;
    const cuenta = {}; for (const id of d.deck) cuenta[id] = (cuenta[id] || 0) + 1;
    if (Object.keys(cuenta).length !== n / 2 || Object.values(cuenta).some(c => c !== 2)) return null;
    if (!Array.isArray(d.ok) || d.ok.length !== n || !d.ok.every(x => x === 0 || x === 1)) return null;
    for (let i = 0; i < n; i++) if (d.ok[i] && !d.deck.some((id, j) => j !== i && id === d.deck[i] && d.ok[j])) return null;     // una carta resuelta sin su pareja
    const ent = (v, max) => Number.isInteger(v) && v >= 0 && v <= max;
    if (!ent(d.movs, 99999) || !ent(d.t, 99999 * 60) || !ent(d.vz, MAX_VISTAZOS) || !Array.isArray(d.pts) || d.pts.length !== 2 || !d.pts.every(p => ent(p, n)) || (d.turno !== 0 && d.turno !== 1)) return null;
    const mem = {};
    if (d.mem && typeof d.mem === 'object') for (const [k, v] of Object.entries(d.mem)) { const i = +k; if (Number.isInteger(i) && i >= 0 && i < n && !d.ok[i] && d.deck[i] === v) mem[i] = v; }
    const ab = Array.isArray(d.ab) ? d.ab.filter(i => Number.isInteger(i) && i >= 0 && i < n && !d.ok[i]) : [];
    const S = { v: 1, modo: d.modo, tema: d.tema, tam: d.tam, cols: T.cols, filas: T.filas, nivel: d.nivel, deck: d.deck.slice(), ok: d.ok.slice(), ab: ab.length === 1 ? [ab[0]] : [], movs: d.movs, t: d.t, turno: d.modo === 'solo' ? 0 : ab.length === 2 ? 1 - d.turno : d.turno, pts: d.pts.slice(), vz: d.vz, mem, done: false, ganador: null };
    if (!quedan(S)) fin(S);
    return S;
  } catch { return null; }
}
