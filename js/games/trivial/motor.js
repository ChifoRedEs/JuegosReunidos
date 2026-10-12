// Motor del Trivial para 2-4 jugadores (sin DOM, probable con Node).
// Tablero circular de 6 × categorías casillas. Cada 6 casillas: [quesito, normal, normal, tira otra vez, normal, normal].
// Reglas: sacas un dado, eliges sentido, respondes la pregunta de la casilla; si aciertas sigues tirando; en la casilla de quesito
// ganas el quesito de esa categoría; con todos los quesitos vas al centro y juegas la ronda final: una pregunta de cada
// categoría seguidas y sin fallar. Si fallas una, pasa el turno y en tu siguiente turno vuelves a empezar la ronda final.
import { BLOQUES, analizar, claveTexto, enmascarar } from '../../core/definiciones.js';
import { shuffle, rnd } from '../../core/dom.js';

export const NIVEL = { facil: { nombre: 'Fácil', p: .38 }, medio: { nombre: 'Medio', p: .58 }, dificil: { nombre: 'Difícil', p: .78 } };
export const COLORES_J = ['#FF4757', '#2F6BFF', '#12B76A', '#FFB400'];
export const categorias = n => BLOQUES.slice(0, n);
export const tamano = S => S.nCat * 6;
export function casilla(S, i) {
  const r = i % 6, b = i / 6 | 0;
  if (r === 0) return { tipo: 'quesito', cat: b % S.nCat };
  if (r === 3) return { tipo: 'repite', cat: -1 };
  const k = b * 4 + (r === 1 ? 0 : r === 2 ? 1 : r === 4 ? 2 : 3);
  return { tipo: 'normal', cat: k % S.nCat };
}
export function crear(cfg) {
  const js = cfg.jugadores.slice(0, 4), N = cfg.nCat * 6, paso = Math.floor(N / (6 * js.length)) * 6 || 6;
  return { nCat: cfg.nCat, modo: cfg.modo, nivel: cfg.nivel, N,
    jug: js.map((j, k) => ({ nombre: j.nombre, cpu: !!j.cpu, pos: (k * paso + 3) % N, q: Array(cfg.nCat).fill(false), centro: false, final: [], pericia: Array.from({ length: cfg.nCat }, () => Math.max(.08, Math.min(.95, NIVEL[cfg.nivel].p + (Math.random() - .5) * .3))) })),
    turno: 0, fase: 'tirar', dado: 0, destinos: [], pregunta: null, usadas: Object.fromEntries(BLOQUES.slice(0, cfg.nCat).map(b => [b.id, []])), ganador: -1, ronda: 1, log: ['¡Empieza la partida!'], aciertos: js.map(() => 0), fallos: js.map(() => 0) };
}
const log = (S, t) => { S.log.unshift(t); if (S.log.length > 6) S.log.length = 6; };
export const jugador = S => S.jug[S.turno];

export function tirar(S, v = 1 + rnd(6)) {
  if (S.fase !== 'tirar') return false;
  const p = jugador(S);
  if (p.centro) { p.final = []; log(S, `${p.nombre} empieza la ronda final en el centro.`); preguntar(S, siguienteFinal(S, p), true); return true; }
  S.dado = v; S.destinos = [(p.pos + v) % S.N, (p.pos - v + S.N * 6) % S.N]; S.fase = 'mover'; log(S, `${p.nombre} saca un ${v}.`); return true;
}
export function mover(S, sentido) {                       // 'h' (horario) o 'a' (antihorario)
  if (S.fase !== 'mover') return false;
  const p = jugador(S); p.pos = S.destinos[sentido === 'h' ? 0 : 1]; S.destinos = [];
  const c = casilla(S, p.pos);
  if (c.tipo === 'repite') { S.fase = 'tirar'; log(S, `${p.nombre} cae en «tira otra vez».`); return true; }
  preguntar(S, c.cat, false); return true;
}
// Ronda final: categorías que aún le faltan por acertar en este intento (en orden aleatorio)
export const faltanFinal = (S, p = jugador(S)) => Array.from({ length: S.nCat }, (_, k) => k).filter(k => !p.final.includes(k));
function siguienteFinal(S, p) { const f = faltanFinal(S, p); return f[rnd(f.length)]; }
export function preguntar(S, cat, final) {
  const bl = BLOQUES[cat], usadas = S.usadas[bl.id];
  let libres = bl.fichas.map((_, i) => i).filter(i => !usadas.includes(i)); if (!libres.length) { usadas.length = 0; libres = bl.fichas.map((_, i) => i); }
  const idx = libres[rnd(libres.length)]; usadas.push(idx);
  const [tema, def, resp] = bl.fichas[idx], { principal } = analizar(resp);
  let opciones = null, correcta = -1;
  if (S.modo === 'opciones') {
    const claves = new Set([claveTexto(principal)]), pool = bl.fichas.filter((f, i) => i !== idx).map(f => ({ tema: f[0], t: analizar(f[2]).principal }));
    const mismas = shuffle(pool.filter(x => x.tema === tema)), otras = shuffle(pool.filter(x => x.tema !== tema)), elegidas = [];
    for (const x of [...mismas, ...otras]) { const k = claveTexto(x.t); if (!claves.has(k) && x.t.length <= 42) { claves.add(k); elegidas.push(x.t); } if (elegidas.length === 3) break; }
    opciones = shuffle([principal, ...elegidas]); correcta = opciones.indexOf(principal);
  }
  S.pregunta = { cat, idx, tema, def: enmascarar(def, resp), resp, principal, opciones, correcta, final: !!final, respuesta: null, acierto: null };
  S.fase = 'pregunta';
}
const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
export function coincide(texto, resp) {
  const t = claveTexto(texto); if (!t) return false;
  return analizar(resp).variantes.some(v => { const k = claveTexto(v); if (!k) return false; if (k === t) return true; const tol = k.length >= 12 ? 2 : k.length >= 5 ? 1 : 0; return tol > 0 && lev(t, k) <= tol; });
}
export function responder(S, r) {                         // r: índice de opción (número), texto, o null = «no sé»
  if (S.fase !== 'pregunta') return false;
  const q = S.pregunta, p = jugador(S);
  q.respuesta = r; q.acierto = r == null ? false : S.modo === 'opciones' ? r === q.correcta : coincide(String(r), q.resp);
  S.fase = 'resultado';
  if (q.acierto) { S.aciertos[S.turno]++; log(S, `${p.nombre} acierta: ${q.principal}.`); } else { S.fallos[S.turno]++; log(S, `${p.nombre} falla. Era: ${q.principal}.`); }
  return true;
}
export function continuar(S) {
  if (S.fase !== 'resultado') return false;
  const q = S.pregunta, p = jugador(S);
  if (q.acierto) {
    if (q.final) {
      if (!p.final.includes(q.cat)) p.final.push(q.cat);
      if (p.final.length >= S.nCat) { S.ganador = S.turno; S.fase = 'fin'; log(S, `¡${p.nombre} acierta las ${S.nCat} preguntas finales y gana la partida!`); return true; }
      log(S, `${p.nombre} lleva ${p.final.length}/${S.nCat} en la ronda final.`);
      preguntar(S, siguienteFinal(S, p), true); return true;          // sigue sin tirar el dado: la siguiente categoría
    }
    const c = casilla(S, p.pos);
    if (c.tipo === 'quesito' && !p.q[c.cat]) { p.q[c.cat] = true; log(S, `${p.nombre} gana el quesito de ${BLOQUES[c.cat].nombre}.`); if (p.q.every(Boolean)) { p.centro = true; log(S, `${p.nombre} tiene todos los quesitos: ¡va al centro!`); } }
    S.fase = 'tirar'; S.pregunta = null;
  } else {
    if (q.final) { p.final = []; log(S, `${p.nombre} falla en la ronda final: lo intentará de nuevo en su próximo turno.`); }
    S.pregunta = null; S.turno = (S.turno + 1) % S.jug.length; if (S.turno === 0) S.ronda++; S.fase = 'tirar';
  }
  return true;
}
/* ---------- CPU ---------- */
export function cpuSentido(S) {
  const p = jugador(S);
  const val = pos => { const c = casilla(S, pos); return c.tipo === 'quesito' ? (p.q[c.cat] ? 1 + p.pericia[c.cat] : 5 + p.pericia[c.cat]) : c.tipo === 'repite' ? 2.4 : 1 + p.pericia[c.cat]; };
  const a = val(S.destinos[0]) + Math.random() * .4, b = val(S.destinos[1]) + Math.random() * .4; return a >= b ? 'h' : 'a';
}
export function cpuRespuesta(S) {
  const p = jugador(S), q = S.pregunta, sabe = Math.random() < p.pericia[q.cat];
  if (S.modo === 'opciones') { if (sabe) return q.correcta; const o = q.opciones.map((_, i) => i).filter(i => i !== q.correcta); return o[rnd(o.length)]; }
  return sabe ? q.principal : null;
}
/* ---------- validación del estado guardado ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || ![6, 9].includes(d.nCat) || !['opciones', 'escribir'].includes(d.modo) || !NIVEL[d.nivel] || !Array.isArray(d.jug) || d.jug.length < 2 || d.jug.length > 4) return null;
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, N = d.nCat * 6;
  const jug = []; for (const p of d.jug) {
    if (!p || typeof p.nombre !== 'string' || !ent(p.pos, 0, N - 1) || !Array.isArray(p.q) || p.q.length !== d.nCat || !Array.isArray(p.pericia) || p.pericia.length !== d.nCat || !p.pericia.every(v => Number.isFinite(v) && v >= 0 && v <= 1)) return null;
    const fin = Array.isArray(p.final) ? [...new Set(p.final.filter(v => ent(v, 0, d.nCat - 1)))].slice(0, d.nCat - 1) : [];
    jug.push({ nombre: p.nombre.slice(0, 14), cpu: !!p.cpu, pos: p.pos, q: p.q.map(Boolean), centro: !!p.centro, final: p.centro ? fin : [], pericia: p.pericia.slice() });
  }
  if (!['tirar', 'mover', 'pregunta', 'resultado', 'fin'].includes(d.fase) || !ent(d.turno, 0, jug.length - 1) || !ent(d.dado, 0, 6) || !ent(d.ganador, -1, jug.length - 1)) return null;
  const destinos = Array.isArray(d.destinos) && d.destinos.every(v => ent(v, 0, N - 1)) ? d.destinos.slice() : [];
  if (d.fase === 'mover' && destinos.length !== 2) return null;
  let pregunta = null;
  if (d.fase === 'pregunta' || d.fase === 'resultado') {
    const q = d.pregunta; if (!q || !ent(q.cat, 0, d.nCat - 1) || !ent(q.idx, 0, 49)) return null;
    const f = BLOQUES[q.cat].fichas[q.idx]; if (!f) return null;
    const opc = Array.isArray(q.opciones) && q.opciones.length === 4 && q.opciones.every(x => typeof x === 'string' && x.length < 80) ? q.opciones.slice() : null;
    if (d.modo === 'opciones' && (!opc || !ent(q.correcta, 0, 3))) return null;
    pregunta = { cat: q.cat, idx: q.idx, tema: f[0], def: enmascarar(f[1], f[2]), resp: f[2], principal: analizar(f[2]).principal, opciones: opc, correcta: opc ? q.correcta : -1, final: !!q.final, respuesta: q.respuesta == null || ent(q.respuesta, 0, 3) || typeof q.respuesta === 'string' ? (typeof q.respuesta === 'string' ? q.respuesta.slice(0, 60) : q.respuesta) : null, acierto: q.acierto == null ? null : !!q.acierto };
  }
  const usadas = {}; for (const b of BLOQUES.slice(0, d.nCat)) usadas[b.id] = d.usadas && Array.isArray(d.usadas[b.id]) ? d.usadas[b.id].filter(v => ent(v, 0, 49)) : [];
  const nums = a => (Array.isArray(a) && a.length === jug.length ? a.map(v => (ent(v, 0, 9999) ? v : 0)) : jug.map(() => 0));
  return { nCat: d.nCat, modo: d.modo, nivel: d.nivel, N, jug, turno: d.turno, fase: d.fase, dado: d.dado, destinos, pregunta, usadas, ganador: d.ganador, ronda: ent(d.ronda, 1, 9999) ? d.ronda : 1, log: Array.isArray(d.log) ? d.log.filter(x => typeof x === 'string').slice(0, 6).map(x => x.slice(0, 160)) : [], aciertos: nums(d.aciertos), fallos: nums(d.fallos) };
}
