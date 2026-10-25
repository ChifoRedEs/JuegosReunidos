// Motor de El Rosco (prueba final de los concursos de palabras: una definición por cada letra). Sin DOM, probable con Node.
// Modos: 'solo' (contra el reloj) y 'cpu' (duelo: dos roscos y dos relojes; al fallar o decir «paso la cabra» le toca al rival).
import { LETRAS, BANCO } from './palabras.js';
import { BANCOS } from '../crucigrama/pistas.js';
import { BLOQUES, analizar, claveTexto } from '../../core/definiciones.js';

export const NIVEL = { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' };
export const TIEMPOS = [150, 200, 300];                       // segundos por rosco
export const ACIERTO_CPU = { facil: .55, normal: .7, dificil: .82 };
export { LETRAS };
// Mayúsculas sin tildes pero conservando la Ñ (para saber por qué letra empieza o qué letra contiene)
export const base = s => s.toUpperCase().replace(/Ñ/g, '\u0001').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0001/g, 'Ñ');
export const correcta = (respuesta, validas) => { const k = claveTexto(respuesta || ''); return !!k && validas.some(v => claveTexto(v) === k); };

/* ---------- fuentes de palabras ---------- */
let extra = null;
function fuentes() {                                         // palabras de otros bancos de la app, clasificadas por letra
  if (extra) return extra;
  extra = { c: {}, d: {} };
  const meter = (dest, palabra, def, resp) => {
    const w = base(palabra); if (!/^[A-ZÑ]+$/.test(w) || w.length < 3) return;
    for (const L of LETRAS) {
      const tipo = w[0] === L ? 'empieza' : w.includes(L) ? 'contiene' : null; if (!tipo) continue;
      (dest[L] = dest[L] || []).push({ tipo, resp, def });
    }
  };
  for (const b of Object.values(BANCOS)) for (const [p, d] of b.entradas) meter(extra.c, p, d, [p]);
  for (const b of BLOQUES) for (const [, d, r] of b.fichas) { const a = analizar(r); if (!/\s/.test(a.principal)) meter(extra.d, a.principal, d, a.variantes); }
  return extra;
}
function elegir(L, nivel, vistas) {
  const F = fuentes(), azar = a => a[Math.floor(Math.random() * a.length)];
  const propias = BANCO[L] || [], cruci = F.c[L] || [], defi = F.d[L] || [];
  const preferir = (lista, empiezaPrimero = true) => {
    const nuevas = lista.filter(x => !vistas.has(base(x.resp[0])));
    const pool = nuevas.length ? nuevas : lista;
    const emp = pool.filter(x => x.tipo === 'empieza');
    // con bastantes palabras que empiezan por la letra, casi siempre «empieza por»; si hay pocas (Ñ, X, Y…), se mezclan con «contiene»
    const usarEmp = empiezaPrimero && (emp.length >= 4 ? Math.random() < .88 : emp.length > 0 && Math.random() < .3);
    return usarEmp ? azar(emp) : pool.length ? azar(pool) : null;
  };
  let pool;
  if (nivel === 'facil') pool = Math.random() < .7 ? propias : [...propias, ...cruci];
  else if (nivel === 'normal') pool = Math.random() < .6 ? [...propias, ...cruci] : [...propias, ...cruci, ...defi];
  else pool = defi.filter(x => x.tipo === 'empieza').length >= 2 && Math.random() < .7 ? defi : [...propias, ...defi];
  return preferir(pool) || preferir(propias, false);
}
export function nuevoRosco(nivel, vistas = new Set()) {
  return LETRAS.map(L => { const e = elegir(L, nivel, vistas); vistas.add(base(e.resp[0])); return { L, tipo: e.tipo, def: e.def, resp: e.resp.slice(), estado: 0, dada: '' }; });
}

/* ---------- partida ---------- */
export function crear({ modo = 'solo', nivel = 'normal', tiempo = 200, vistas = [] } = {}) {
  const v = new Set(vistas), m = modo === 'cpu' ? 'cpu' : 'solo', t = TIEMPOS.includes(tiempo) ? tiempo : 200;
  const jug = [{ nombre: 'Tú', cpu: false, letras: nuevoRosco(nivel, v), idx: 0, tiempo: t * 1000, fin: false }];
  if (m === 'cpu') jug.push({ nombre: 'CPU', cpu: true, letras: nuevoRosco(nivel, v), idx: 0, tiempo: t * 1000, fin: false });
  return { modo: m, nivel: NIVEL[nivel] ? nivel : 'normal', tiempoTotal: t, jug, turno: 0, fase: 'jugar', ganador: -1, log: [] };
}
const log = (S, t) => { S.log.unshift(t); if (S.log.length > 6) S.log.length = 6; };
export const actual = (S, j = S.turno) => S.jug[j].letras[S.jug[j].idx];
export const aciertos = J => J.letras.filter(l => l.estado === 1).length;
export const fallos = J => J.letras.filter(l => l.estado === 2).length;
export const pendientes = J => J.letras.filter(l => l.estado === 0).length;
// Siguiente letra pendiente después de la actual (dando la vuelta al rosco)
function avanzar(J) { const n = J.letras.length; for (let k = 1; k <= n; k++) { const i = (J.idx + k) % n; if (J.letras[i].estado === 0) { J.idx = i; return true; } } return false; }
function cambiarTurno(S) {
  const otro = 1 - S.turno;
  if (S.modo === 'cpu' && !S.jug[otro].fin) S.turno = otro;
  comprobarFin(S);
}
function comprobarFin(S) {
  S.jug.forEach(J => { if (!J.fin && (!pendientes(J) || J.tiempo <= 0)) { J.fin = true; if (J.tiempo < 0) J.tiempo = 0; } });
  if (S.jug.every(J => J.fin)) {
    S.fase = 'fin';
    if (S.modo === 'cpu') { const [a, b] = S.jug, d = aciertos(a) - aciertos(b) || fallos(b) - fallos(a); S.ganador = d > 0 ? 0 : d < 0 ? 1 : -2; }   // -2 = empate
    else S.ganador = 0;
  } else if (S.jug[S.turno].fin) S.turno = 1 - S.turno;
}
// Responder la letra actual del jugador en turno. Devuelve 'ok' | 'mal' | null
export function responder(S, texto) {
  if (S.fase !== 'jugar') return null;
  const J = S.jug[S.turno], l = actual(S); if (!l || l.estado) return null;
  l.dada = String(texto || '').slice(0, 30);
  if (correcta(texto, l.resp)) { l.estado = 1; if (!avanzar(J)) comprobarFin(S); return 'ok'; }
  l.estado = 2; log(S, `${J.nombre}: ${l.L} → ${l.resp[0]}`);
  if (!avanzar(J)) J.fin = true;
  cambiarTurno(S); return 'mal';
}
export function pasapalabra(S) {
  if (S.fase !== 'jugar') return false;
  const J = S.jug[S.turno];
  if (!avanzar(J)) return false;                              // era la única que quedaba: se queda en ella
  cambiarTurno(S); return true;
}
export function plantarse(S) {                                // termina tu rosco (las pendientes se quedan sin contestar)
  if (S.fase !== 'jugar') return false;
  S.jug[S.turno].fin = true; comprobarFin(S); if (S.fase !== 'fin') S.turno = S.jug.findIndex(J => !J.fin); return true;
}
export function descontar(S, ms) {                           // pasa el tiempo del jugador en turno
  if (S.fase !== 'jugar') return false;
  const J = S.jug[S.turno]; J.tiempo -= ms;
  if (J.tiempo <= 0) { J.tiempo = 0; J.fin = true; log(S, `${J.nombre}: ¡se acabó el tiempo!`); comprobarFin(S); return true; }
  return false;
}
// CPU: decide su respuesta a la letra actual → { tipo: 'ok' | 'mal' | 'pasa', texto, ms }
export function cpuPiensa(S) {
  const l = actual(S), p = ACIERTO_CPU[S.nivel], r = Math.random(), ms = 1300 + Math.random() * 1700;
  if (r < p) return { tipo: 'ok', texto: l.resp[0], ms };
  if (r < p + (1 - p) * .55) return { tipo: 'pasa', texto: '', ms: ms * .6 };
  return { tipo: 'mal', texto: '???', ms };
}

/* ---------- validación ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || !['solo', 'cpu'].includes(d.modo) || !NIVEL[d.nivel] || !TIEMPOS.includes(d.tiempoTotal) || !Array.isArray(d.jug) || d.jug.length !== (d.modo === 'cpu' ? 2 : 1)) return null;
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, jug = [];
  for (const J of d.jug) {
    if (!J || !Array.isArray(J.letras) || J.letras.length !== LETRAS.length || !ent(J.idx, 0, LETRAS.length - 1) || !Number.isFinite(J.tiempo)) return null;
    const letras = J.letras.map((l, i) => (l && l.L === LETRAS[i] && ['empieza', 'contiene'].includes(l.tipo) && typeof l.def === 'string' && Array.isArray(l.resp) && l.resp.length && l.resp.every(x => typeof x === 'string') && ent(l.estado, 0, 2)
      ? { L: l.L, tipo: l.tipo, def: l.def.slice(0, 400), resp: l.resp.slice(0, 4).map(x => x.slice(0, 40)), estado: l.estado, dada: typeof l.dada === 'string' ? l.dada.slice(0, 30) : '' } : null));
    if (letras.some(x => !x)) return null;
    jug.push({ nombre: J.cpu ? 'CPU' : 'Tú', cpu: !!J.cpu, letras, idx: J.idx, tiempo: Math.max(0, Math.min(d.tiempoTotal * 1000, Math.round(J.tiempo))), fin: !!J.fin });
  }
  if (!['jugar', 'fin'].includes(d.fase) || !ent(d.turno, 0, jug.length - 1) || !ent(d.ganador, -2, 1)) return null;
  return { modo: d.modo, nivel: d.nivel, tiempoTotal: d.tiempoTotal, jug, turno: d.turno, fase: d.fase, ganador: d.ganador, log: Array.isArray(d.log) ? d.log.filter(x => typeof x === 'string').slice(0, 6).map(x => x.slice(0, 120)) : [] };
}
