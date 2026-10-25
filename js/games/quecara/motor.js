// Reglas de «¿Qué cara tienes?» (Quién es quién): estado, turnos, preguntas, aciertos y la CPU. Sin DOM; se prueba con Node.
import { caraValida, generarCaras, generarSimple } from './avatar.js';
import { CARAS_DEFECTO } from './defecto.js';
import { pregunta, responde, disponibles, vectorDe } from './preguntas.js';

export const MODOS = { cpu: 'Contra CPU', dos: '2 jugadores' };
export const NIVEL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
export const TAMANOS = { 12: '12', 20: '20', 24: '24 (clásico)', 30: '30' };
export const CONJUNTOS = { clasicas: 'Las 30 por defecto', azar: 'Aleatorias' };
export const FALLO = { pierde: 'Pierdes la partida', turno: 'Pierdes el turno' };
export const TUMBAR = { mano: 'Las tumbo yo', auto: 'Automático' };
export const EMPIEZA = { azar: 'Al azar', j1: 'Jugador 1', j2: 'Jugador 2' };
export const empiezaTexto = modo => (modo === 'cpu' ? { azar: 'Al azar', j1: 'Tú', j2: 'La CPU' } : EMPIEZA);
export const CFG_DEF = { modo: 'cpu', nivel: 'medio', n: 30, conjunto: 'clasicas', fallo: 'pierde', tumbar: 'mano', empieza: 'azar' };
const FASES = ['elegir', 'paso', 'turno', 'fin'];

export function cfgValida(c) {
  if (!c || typeof c !== 'object') return null;
  const n = Number(c.n);
  if (!Object.hasOwn(MODOS, c.modo) || !Object.hasOwn(NIVEL, c.nivel) || !Object.hasOwn(TAMANOS, n) || !Object.hasOwn(CONJUNTOS, c.conjunto)
    || !Object.hasOwn(FALLO, c.fallo) || !Object.hasOwn(TUMBAR, c.tumbar) || !Object.hasOwn(EMPIEZA, c.empieza)) return null;
  return { modo: c.modo, nivel: c.nivel, n, conjunto: c.conjunto, fallo: c.fallo, tumbar: c.tumbar, empieza: c.empieza };
}

const barajar = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const nombres = S => (S.modo === 'cpu' ? ['Tú', 'La CPU'] : ['Jugador 1', 'Jugador 2']);

/* ---------- partida ---------- */
export function crear(cfg, rnd = Math.random) {
  const c = cfgValida(cfg) || { ...CFG_DEF }, n = c.n;
  let caras;
  if (c.conjunto === 'azar') { const sem = Math.floor(rnd() * 4294967296); caras = generarCaras(n, sem, vectorDe) || generarSimple(n, sem); }
  else { caras = barajar(CARAS_DEFECTO.map(f => ({ ...f })), rnd).slice(0, n); }
  barajar(caras, rnd);
  const inicio = c.empieza === 'j1' ? 0 : c.empieza === 'j2' ? 1 : (rnd() < .5 ? 0 : 1);
  return {
    v: 1, modo: c.modo, nivel: c.nivel, fallo: c.fallo, tumbar: c.tumbar, n, caras, inicio,
    secreto: [-1, -1], tumba: [Array(n).fill(0), Array(n).fill(0)],
    turno: 0, fase: 'elegir', sig: 'elegir', pregunto: false, hist: [], ganador: -1, ult: null,
    cpu: c.modo === 'cpu' ? { cand: caras.map((_, i) => i), usadas: [] } : null,
  };
}
export const quedan = (S, p) => S.tumba[p].filter(t => !t).length;

// Elige el personaje secreto de p. Contra la CPU ella elige el suyo al azar y empieza la partida.
export function elegirSecreto(S, p, i, rnd = Math.random) {
  if (S.fase !== 'elegir' || S.turno !== p || !Number.isInteger(i) || i < 0 || i >= S.n) return false;
  S.secreto[p] = i;
  if (S.modo === 'cpu') { S.secreto[1] = Math.floor(rnd() * S.n); S.fase = 'turno'; S.turno = S.inicio; S.pregunto = false; return true; }
  if (p === 0) { S.fase = 'paso'; S.turno = 1; S.sig = 'elegir'; } else { S.fase = 'paso'; S.turno = S.inicio; S.sig = 'turno'; S.pregunto = false; }
  return true;
}
// Pantalla de «pasa el móvil»: al confirmar pasa a la fase siguiente.
export function continuar(S) { if (S.fase !== 'paso') return false; S.fase = S.sig; return true; }

const anotar = (S, e) => { S.hist.push(e); if (S.hist.length > 120) S.hist.splice(0, S.hist.length - 120); };

// El jugador p pregunta por un rasgo de la cara secreta del rival: la respuesta sale sola.
export function preguntar(S, p, id) {
  const pr = pregunta(id);
  if (S.fase !== 'turno' || S.turno !== p || S.pregunto || !pr) return null;
  const r = responde(S.caras[S.secreto[1 - p]], id);
  S.pregunto = true; S.ult = { p, q: pr.texto, r, id };
  anotar(S, { p, q: pr.texto, r });
  if (S.tumbar === 'auto') tumbarSegunUltima(S, p);
  return r;
}
// Tumba las caras que ya no pueden ser según la última respuesta (modo automático o botón «Tumbar por mí»).
export function tumbarSegunUltima(S, p) {
  if (!S.ult || S.ult.p !== p || !S.ult.id) return 0;
  let k = 0;
  for (let i = 0; i < S.n; i++) if (!S.tumba[p][i] && responde(S.caras[i], S.ult.id) !== S.ult.r) { S.tumba[p][i] = 1; k++; }
  return k;
}
export function alternar(S, p, i) {
  if (S.fase !== 'turno' || S.turno !== p || !Number.isInteger(i) || i < 0 || i >= S.n) return false;
  S.tumba[p][i] = S.tumba[p][i] ? 0 : 1; return true;
}
// Fin del turno (solo si ya se ha preguntado). Con 2 jugadores aparece la pantalla de «pasa el móvil».
export function terminar(S, p) {
  if (S.fase !== 'turno' || S.turno !== p || !S.pregunto) return false;
  S.turno = 1 - p; S.pregunto = false;
  if (S.modo === 'dos') { S.fase = 'paso'; S.sig = 'turno'; }
  return true;
}
// Arriesgar: en vez de preguntar, el jugador dice quién cree que es. Acertar gana; fallar pierde la partida o el turno.
export function arriesgar(S, p, i) {
  if (S.fase !== 'turno' || S.turno !== p || S.pregunto || !Number.isInteger(i) || i < 0 || i >= S.n) return null;
  const ok = i === S.secreto[1 - p], nm = S.caras[i].nm;
  anotar(S, { p, g: nm, ok });
  S.ult = { p, g: nm, ok };
  if (ok) { S.fase = 'fin'; S.ganador = p; return { ok: true, fin: true }; }
  if (S.fallo === 'pierde') { S.fase = 'fin'; S.ganador = 1 - p; return { ok: false, fin: true }; }
  S.tumba[p][i] = 1; S.pregunto = true; terminar(S, p);
  return { ok: false, fin: false };
}

/* ---------- la CPU ---------- */
// Elige la mejor pregunta para sus candidatos (las caras que aún pueden ser la tuya) según el nivel.
export function elegirPreguntaCpu(S, rnd = Math.random) {
  const cand = S.cpu.cand, usadas = new Set(S.cpu.usadas);
  const lista = disponibles(S.caras).filter(p => !usadas.has(p.id));
  const val = lista.map(p => { const t = cand.filter(i => p.test(S.caras[i])).length; return { p, t, s: Math.min(t, cand.length - t) / cand.length }; });
  const utiles = val.filter(v => v.t > 0 && v.t < cand.length).sort((a, b) => b.s - a.s);
  if (S.nivel === 'facil') { const pool = val.length ? val : []; return pool.length ? pool[Math.floor(rnd() * pool.length)].p : null; }
  if (!utiles.length) return null;
  if (S.nivel === 'dificil') { const mejor = utiles[0].s, mejores = utiles.filter(v => v.s === mejor); return mejores[Math.floor(rnd() * mejores.length)].p; }
  const top = utiles.slice(0, Math.max(2, Math.ceil(utiles.length * .4)));
  return top[Math.floor(rnd() * top.length)].p;
}
// Turno completo de la CPU. Devuelve qué hizo (para contárselo al jugador).
export function turnoCpu(S, rnd = Math.random) {
  if (S.fase !== 'turno' || S.turno !== 1 || S.modo !== 'cpu') return null;
  const c = S.cpu, sec = S.caras[S.secreto[0]];
  const seguro = c.cand.length === 1 && (S.nivel !== 'facil' || rnd() > .25);
  if (seguro) { const r = arriesgar(S, 1, c.cand[0]); return { tipo: 'arriesga', ok: r.ok, nombre: S.caras[c.cand[0]].nm, fin: r.fin }; }
  const p = elegirPreguntaCpu(S, rnd);
  if (!p) {                                             // sin preguntas útiles: arriesga con lo que le queda
    const i = c.cand.length ? c.cand[Math.floor(rnd() * c.cand.length)] : Math.floor(rnd() * S.n);
    const r = arriesgar(S, 1, i); if (!r.ok) c.cand = c.cand.filter(x => x !== i);
    return { tipo: 'arriesga', ok: r.ok, nombre: S.caras[i].nm, fin: r.fin };
  }
  const r = responde(sec, p.id);
  c.usadas.push(p.id); c.cand = c.cand.filter(i => responde(S.caras[i], p.id) === r);
  S.ult = { p: 1, q: p.texto, r, id: p.id }; anotar(S, { p: 1, q: p.texto, r });
  S.turno = 0; S.pregunto = false;
  return { tipo: 'pregunta', texto: p.texto, r };
}

/* ---------- validación y resumen ---------- */
const bit = a => a === 1 || a === true ? 1 : 0;
export function validar(d) {
  if (!d || typeof d !== 'object' || d.v !== 1 || !Object.hasOwn(MODOS, d.modo) || !Object.hasOwn(NIVEL, d.nivel) || !Object.hasOwn(FALLO, d.fallo) || !Object.hasOwn(TUMBAR, d.tumbar)) return null;
  const n = d.n;
  if (!Number.isInteger(n) || n < 6 || n > 30 || !Array.isArray(d.caras) || d.caras.length !== n) return null;
  const caras = d.caras.map(caraValida); if (caras.some(x => !x)) return null;
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  if (!Array.isArray(d.secreto) || d.secreto.length !== 2 || !d.secreto.every(v => ent(v, -1, n - 1))) return null;
  if (!Array.isArray(d.tumba) || d.tumba.length !== 2 || !d.tumba.every(a => Array.isArray(a) && a.length === n)) return null;
  if (!FASES.includes(d.fase) || !ent(d.turno, 0, 1) || !ent(d.inicio, 0, 1) || !ent(d.ganador, -1, 1) || !['elegir', 'turno'].includes(d.sig)) return null;
  if (d.fase === 'fin' ? d.ganador < 0 : d.ganador !== -1) return null;
  if ((d.fase === 'turno' || d.fase === 'fin') && d.secreto.some(v => v < 0)) return null;
  const hist = (Array.isArray(d.hist) ? d.hist : []).slice(-120).map(e => {
    if (!e || !ent(e.p, 0, 1)) return null;
    if (typeof e.g === 'string') return { p: e.p, g: e.g.slice(0, 12), ok: !!e.ok };
    if (typeof e.q === 'string') return { p: e.p, q: e.q.slice(0, 90), r: !!e.r };
    return null;
  }).filter(Boolean);
  let ult = null;
  if (d.ult && typeof d.ult === 'object' && ent(d.ult.p, 0, 1)) {
    if (typeof d.ult.g === 'string') ult = { p: d.ult.p, g: d.ult.g.slice(0, 12), ok: !!d.ult.ok };
    else if (typeof d.ult.q === 'string') ult = { p: d.ult.p, q: d.ult.q.slice(0, 90), r: !!d.ult.r, id: pregunta(d.ult.id) ? d.ult.id : null };
  }
  let cpu = null;
  if (d.modo === 'cpu') {
    const k = d.cpu && typeof d.cpu === 'object' ? d.cpu : {};
    const cand = (Array.isArray(k.cand) ? k.cand : []).filter(v => ent(v, 0, n - 1)), uniq = [...new Set(cand)];
    cpu = { cand: uniq.length ? uniq : caras.map((_, i) => i), usadas: (Array.isArray(k.usadas) ? k.usadas : []).filter(id => pregunta(id)).slice(0, 80) };
  }
  return {
    v: 1, modo: d.modo, nivel: d.nivel, fallo: d.fallo, tumbar: d.tumbar, n, caras, inicio: d.inicio,
    secreto: d.secreto.slice(), tumba: d.tumba.map(a => a.map(bit)), turno: d.turno, fase: d.fase, sig: d.sig, pregunto: !!d.pregunto, hist, ganador: d.ganador, ult, cpu,
  };
}
export function resumen(S) {
  const nom = nombres(S);
  if (S.fase === 'fin') return { texto: S.modo === 'cpu' ? (S.ganador === 0 ? '¡Ganaste!' : 'Ganó la CPU') : `Ganó ${nom[S.ganador]}`, fin: true };
  if (S.fase === 'elegir' || (S.fase === 'paso' && S.sig === 'elegir')) return { texto: `${S.n} caras · eligiendo personajes`, fin: false };
  return { texto: `${S.n} caras · ${S.hist.filter(h => h.q).length} preguntas`, fin: false };
}
