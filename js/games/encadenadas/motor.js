// Motor de las Encadenadas: cada palabra empieza por la última sílaba (o letras) de la anterior. Sin DOM, probable con Node.
// Reglas: palabras de 3+ letras, sin repetir; «rr» al principio cuenta como «r» (perro → ro…); si ninguna palabra del diccionario
// empieza por esa sílaba, vale con sus dos últimas letras (mueble → le…), y si tampoco, con la última.
// Modos: 'solo' (encadena tus propias palabras), 'cpu' (contra la CPU) y 'grupo' (2–4 personas en el mismo móvil).
import { PALABRAS } from './diccionario.js';
import { ultimaSilaba } from './silabas.js';
import { BANCO } from '../rosco/palabras.js';
import { BANCOS } from '../crucigrama/pistas.js';

export const NIVEL = { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' };
export const ENLACES = { silaba: 'Última sílaba', dos: 'Dos últimas letras', letra: 'Última letra' };
export const TIEMPOS = [15, 30, 60, 0];                      // segundos por turno (0 = sin límite)
export const VIDAS = 3;
export const norm = s => String(s).toLowerCase().trim().replace(/ñ/g, '\u0001').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0001/g, 'ñ');

/* ---------- diccionario ---------- */
let DIC = null, porInicio = null;
export function diccionario(extra = []) {
  if (!DIC) {
    const todas = new Map();                                   // forma normalizada → forma bonita (con tildes)
    const meter = w => { const b = String(w).toLowerCase(); if (/^[a-záéíóúüñ]{3,}$/.test(b) && !todas.has(norm(b))) todas.set(norm(b), b); };
    PALABRAS.forEach(meter);
    Object.values(BANCO).flat().forEach(e => e.resp.forEach(meter));
    Object.values(BANCOS).forEach(b => b.entradas.forEach(([p]) => meter(p)));
    DIC = todas; porInicio = null;
  }
  extra.forEach(w => { const b = String(w).toLowerCase(); if (/^[a-záéíóúüñ]{3,}$/.test(b) && !DIC.has(norm(b))) { DIC.set(norm(b), b); porInicio = null; } });
  return DIC;
}
export const existe = w => diccionario().has(norm(w));
export const bonita = w => diccionario().get(norm(w)) || String(w).toLowerCase();
function indice() {
  if (porInicio) return porInicio;
  const D = diccionario();                                   // primero el diccionario (si se crea ahora, reinicia el índice)
  porInicio = new Map();
  for (const k of D.keys()) for (let n = 1; n <= Math.min(5, k.length); n++) { const p = k.slice(0, n); (porInicio.get(p) || porInicio.set(p, []).get(p)).push(k); }
  return porInicio;
}
export const empiezanPor = pref => indice().get(pref) || [];

// Con qué tiene que empezar la siguiente palabra. Devuelve { req, ajuste } (ajuste: explicación si se ha relajado la regla)
export function requisito(palabra, enlace = 'silaba') {
  const w = norm(palabra);
  if (enlace === 'letra') return { req: w.slice(-1), ajuste: '' };
  if (enlace === 'dos') return { req: w.slice(-2), ajuste: '' };
  let s = norm(ultimaSilaba(palabra)), ajuste = '';
  if (s.startsWith('rr')) s = s.slice(1);
  if (s.length > 1 && !empiezanPor(s).length) { const s2 = s.slice(-2); ajuste = `No hay palabras que empiecen por «${s}»: vale con «${s2}»`; s = s2; if (!empiezanPor(s).length) { ajuste = `No hay palabras que empiecen por «${s}»: vale con «${s.slice(-1)}»`; s = s.slice(-1); } }
  return { req: s, ajuste };
}

/* ---------- partida ---------- */
export function crear({ modo = 'cpu', nivel = 'normal', enlace = 'silaba', tiempo = 30, jugadores = null, aprendidas = [] } = {}) {
  diccionario(aprendidas);
  const m = ['solo', 'cpu', 'grupo'].includes(modo) ? modo : 'cpu';
  const jug = m === 'solo' ? [{ nombre: 'Tú', cpu: false }] : m === 'cpu' ? [{ nombre: 'Tú', cpu: false }, { nombre: 'CPU', cpu: true }] : (jugadores || [{ nombre: 'Jugador 1' }, { nombre: 'Jugador 2' }]).slice(0, 4).map(j => ({ nombre: String(j.nombre).slice(0, 14), cpu: false }));
  const S = { modo: m, nivel: NIVEL[nivel] ? nivel : 'normal', enlace: ENLACES[enlace] ? enlace : 'silaba', tiempo: TIEMPOS.includes(tiempo) ? tiempo : 30,
    jug: jug.map(j => ({ ...j, vidas: VIDAS, palabras: 0 })), turno: 0, fase: 'jugar', ganador: -1, cadena: [], usadas: [], req: '', ajuste: '', mejorCadena: 0, log: [] };
  nuevaCadena(S); return S;
}
const log = (S, t) => { S.log.unshift(t); if (S.log.length > 6) S.log.length = 6; };
// Empieza una cadena nueva con una palabra al azar que tenga buenas continuaciones
function nuevaCadena(S) {
  const usadas = new Set(S.usadas), claves = [...diccionario().keys()].filter(k => !usadas.has(k) && k.length >= 4 && k.length <= 8);
  let w = null;
  for (let t = 0; t < 200; t++) { const k = claves[Math.floor(Math.random() * claves.length)]; const r = requisito(k, S.enlace); if (!r.ajuste && empiezanPor(r.req).filter(x => !usadas.has(x)).length >= 8) { w = k; break; } }
  w = w || claves[0];
  S.mejorCadena = Math.max(S.mejorCadena, S.cadena.filter(c => !c.inicio).length);
  S.cadena = [{ w, j: -1, inicio: true }]; S.usadas.push(w);
  const r = requisito(w, S.enlace); S.req = r.req; S.ajuste = r.ajuste;
}
export const ultima = S => S.cadena[S.cadena.length - 1];
// Comprueba una palabra para el jugador en turno: '' si vale, o el motivo. `confirmada` = el jugador asegura que existe.
export function comprobar(S, palabra, confirmada = false) {
  const k = norm(palabra);
  if (!/^[a-zñ]{3,}$/.test(k)) return k.length < 3 ? 'Tiene que tener al menos 3 letras.' : 'Solo letras, sin espacios.';
  if (!k.startsWith(S.req)) return `Tiene que empezar por «${S.req.toUpperCase()}».`;
  if (S.usadas.includes(k)) return 'Esa palabra ya ha salido.';
  if (!confirmada && !existe(k)) return 'NO_DIC';
  return '';
}
export function jugar(S, palabra, confirmada = false) {
  if (S.fase !== 'jugar') return 'La partida ha terminado.';
  const err = comprobar(S, palabra, confirmada); if (err) return err;
  const k = norm(palabra), J = S.jug[S.turno];
  if (confirmada && !existe(k)) diccionario([palabra]);
  S.cadena.push({ w: k, j: S.turno }); if (S.cadena.length > 40) S.cadena.splice(1, 1);
  S.usadas.push(k); J.palabras++;
  const r = requisito(k, S.enlace); S.req = r.req; S.ajuste = r.ajuste;
  if (S.modo !== 'solo') siguiente(S);
  return '';
}
// El jugador en turno no encuentra palabra (o se le acaba el tiempo): pierde una vida y empieza una cadena nueva
export function fallar(S, motivo = 'no encuentra palabra') {
  if (S.fase !== 'jugar') return false;
  const J = S.jug[S.turno]; J.vidas--;
  log(S, `${J.nombre} ${motivo === 'tiempo' ? (J.nombre === 'Tú' ? 'te quedas sin tiempo' : 'se queda sin tiempo') : (J.nombre === 'Tú' ? 'no encuentras palabra' : 'no encuentra palabra')} con «${S.req.toUpperCase()}» y ${J.nombre === 'Tú' ? 'pierdes' : 'pierde'} una vida.`);
  const vivos = S.jug.filter(x => x.vidas > 0);
  if (S.modo === 'solo' ? J.vidas <= 0 : vivos.length <= 1) {
    S.mejorCadena = Math.max(S.mejorCadena, S.cadena.filter(c => !c.inicio).length);
    S.fase = 'fin'; S.ganador = S.modo === 'solo' ? 0 : S.jug.findIndex(x => x.vidas > 0); return true;
  }
  nuevaCadena(S);
  if (S.modo !== 'solo') siguiente(S);
  return true;
}
function siguiente(S) { for (let k = 1; k <= S.jug.length; k++) { const i = (S.turno + k) % S.jug.length; if (S.jug[i].vidas > 0) { S.turno = i; return; } } }

/* ---------- CPU ---------- */
const PROB_FALLO = { facil: .16, normal: .07, dificil: .02 };
// Elige la palabra de la CPU (o null si «no encuentra»). En difícil busca dejarte sílabas complicadas.
export function cpuPalabra(S) {
  const usadas = new Set(S.usadas), ops = empiezanPor(S.req).filter(k => !usadas.has(k));
  if (!ops.length || Math.random() < PROB_FALLO[S.nivel] * (ops.length < 4 ? 3 : 1)) return null;
  if (S.nivel === 'facil') { const comunes = ops.filter(k => PALABRAS.includes(bonita(k))); return (comunes.length ? comunes : ops)[Math.floor(Math.random() * (comunes.length || ops.length))]; }
  const salidas = k => { const r = requisito(k, S.enlace); return empiezanPor(r.req).filter(x => !usadas.has(x) && x !== k).length + (r.ajuste ? 0 : 0); };
  if (S.nivel === 'normal') return ops[Math.floor(Math.random() * ops.length)];
  const puntuadas = ops.slice(0, 120).map(k => [k, salidas(k) + Math.random() * 1.5]).sort((a, b) => a[1] - b[1]);
  return puntuadas[0][0];
}

/* ---------- validación ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || !['solo', 'cpu', 'grupo'].includes(d.modo) || !NIVEL[d.nivel] || !ENLACES[d.enlace] || !TIEMPOS.includes(d.tiempo) || !Array.isArray(d.jug) || !d.jug.length || d.jug.length > 4) return null;
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, pal = w => typeof w === 'string' && /^[a-zñ]{1,30}$/.test(w);
  const jug = []; for (const J of d.jug) { if (!J || typeof J.nombre !== 'string' || !ent(J.vidas, 0, VIDAS) || !ent(J.palabras, 0, 99999)) return null; jug.push({ nombre: J.nombre.slice(0, 14), cpu: !!J.cpu, vidas: J.vidas, palabras: J.palabras }); }
  if (!Array.isArray(d.cadena) || !d.cadena.length || !d.cadena.every(c => c && pal(c.w) && ent(c.j, -1, jug.length - 1)) || !Array.isArray(d.usadas) || !d.usadas.every(pal)) return null;
  if (!['jugar', 'fin'].includes(d.fase) || !ent(d.turno, 0, jug.length - 1) || !ent(d.ganador, -1, jug.length - 1) || typeof d.req !== 'string' || !/^[a-zñ]{1,5}$/.test(d.req)) return null;
  return { modo: d.modo, nivel: d.nivel, enlace: d.enlace, tiempo: d.tiempo, jug, turno: d.turno, fase: d.fase, ganador: d.ganador,
    cadena: d.cadena.slice(-40).map(c => ({ w: c.w, j: c.j, ...(c.inicio ? { inicio: true } : {}) })), usadas: d.usadas.slice(-3000), req: d.req, ajuste: typeof d.ajuste === 'string' ? d.ajuste.slice(0, 120) : '',
    mejorCadena: ent(d.mejorCadena, 0, 99999) ? d.mejorCadena : 0, log: Array.isArray(d.log) ? d.log.filter(x => typeof x === 'string').slice(0, 6).map(x => x.slice(0, 160)) : [] };
}
