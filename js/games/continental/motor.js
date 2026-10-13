// Motor del Continental (2 barajas francesas + 4 comodines = 108 cartas). Sin DOM, probable con Node.
// id 0..103 → carta id % 52 de core/cartas.js (palo = c / 13 | 0, rango = c % 13: 0 = As … 12 = K); 104..107 = comodines.
// 7 rondas con contrato creciente. TRÍO = 3+ cartas del mismo número. ESCALERA = 4+ cartas seguidas del mismo palo (As abajo o arriba).
// Los comodines rellenan huecos, pero en cada jugada debe haber al menos tantas cartas naturales como comodines (y mínimo 2).
import { shuffle } from '../../core/dom.js';

export const NIVEL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
export const CONTRATOS = [
  { t: 2, e: 0, nombre: 'Dos tríos' }, { t: 1, e: 1, nombre: 'Un trío y una escalera' }, { t: 0, e: 2, nombre: 'Dos escaleras' },
  { t: 3, e: 0, nombre: 'Tres tríos' }, { t: 2, e: 1, nombre: 'Dos tríos y una escalera' }, { t: 1, e: 2, nombre: 'Un trío y dos escaleras' }, { t: 0, e: 3, nombre: 'Tres escaleras' },
];
export const cartasRonda = r => 7 + r;                     // r = 0..6 → 7..13 cartas
export const esComodin = id => id >= 104;
export const carta = id => id % 52;
export const palo = id => carta(id) / 13 | 0;
export const rango = id => carta(id) % 13;                 // 0 = As
export const puntos = id => (esComodin(id) ? 50 : rango(id) === 0 ? 20 : rango(id) >= 9 ? 10 : rango(id) + 1);
export const puntosMano = m => m.reduce((s, x) => s + puntos(x), 0);

/* ---------- jugadas ---------- */
export function analizar(ids, tipo) {
  if (!Array.isArray(ids)) return null;
  const J = ids.filter(esComodin), N = ids.filter(x => !esComodin(x));
  if (N.length < 2 || N.length < J.length) return null;
  if (tipo !== 'escalera' && ids.length >= 3 && N.every(x => rango(x) === rango(N[0]))) return { tipo: 'trio', orden: [...N, ...J], rango: rango(N[0]) };
  if (tipo === 'trio' || ids.length < 4 || !N.every(x => palo(x) === palo(N[0]))) return null;
  for (const asAlto of [false, true]) {
    const val = N.map(x => (rango(x) === 0 && asAlto ? 13 : rango(x)));
    if (new Set(val).size !== val.length) continue;
    const lo = Math.min(...val), hi = Math.max(...val), len = ids.length;
    if (hi - lo + 1 > len) continue;
    const s = Math.max(0, Math.min(lo, 14 - len)); if (s > lo || s + len - 1 < hi || s + len - 1 > 13) continue;
    const porV = new Map(N.map((x, k) => [val[k], x])), jj = J.slice(), orden = [];
    for (let v = s; v < s + len; v++) orden.push(porV.has(v) ? porV.get(v) : jj.pop());
    return { tipo: 'escalera', orden, inicio: s, palo: palo(N[0]) };
  }
  return null;
}
export const valida = ids => !!analizar(ids);

/* ---------- partida ---------- */
const v = (J, el, tu) => (J.nombre === 'Tú' ? tu : el);
const log = (S, t) => { S.log.unshift(t); if (S.log.length > 7) S.log.length = 7; };
export function crear({ jugadores, nivel = 'medio' }) {
  const S = { nivel: NIVEL[nivel] ? nivel : 'medio', ronda: -1, turno: 0, mano: 0, fase: 'robar', mazo: [], descarte: [], mesa: [], cogida: -1, ganadorRonda: -1, ganador: -1, log: [],
    jug: jugadores.slice(0, 4).map(j => ({ nombre: String(j.nombre).slice(0, 14), cpu: !!j.cpu, cartas: [], bajado: false, bajadoEn: -1, total: 0, rondas: [] })) };
  S.mano = Math.floor(Math.random() * S.jug.length) - 1; if (S.mano < 0) S.mano = S.jug.length - 1;
  siguienteRonda(S, true); return S;
}
export function siguienteRonda(S, inicio = false) {
  if (!inicio && S.fase !== 'finRonda') return false;
  S.ronda++; S.mano = (S.mano + 1) % S.jug.length;
  const m = shuffle(Array.from({ length: 108 }, (_, i) => i)), n = cartasRonda(S.ronda);
  S.jug.forEach(J => { J.cartas = m.splice(0, n); J.bajado = false; J.bajadoEn = -1; });
  S.descarte = [m.pop()]; S.mazo = m; S.mesa = []; S.turno = S.mano; S.fase = 'robar'; S.cogida = -1; S.ganadorRonda = -1; S.nTurno = 0; S.rebarajes = 0;
  log(S, `Ronda ${S.ronda + 1} de 7: ${CONTRATOS[S.ronda].nombre.toLowerCase()} (${n} cartas). ${S.jug[S.turno].nombre === 'Tú' ? 'Empiezas tú' : 'Empieza ' + S.jug[S.turno].nombre}.`);
  return true;
}
export const contrato = S => CONTRATOS[S.ronda];
export function robar(S, j, delDescarte) {
  if (S.fase !== 'robar' || S.turno !== j) return false;
  if (delDescarte && !S.descarte.length) return false;
  if (!delDescarte && !S.mazo.length) {
    if (S.rebarajes >= 1 || S.descarte.length < 2) { log(S, 'El mazo se ha acabado otra vez: termina la ronda y todos suman sus cartas.'); finRonda(S, -1); return 'fin'; }
    S.rebarajes++; const top = S.descarte.pop(); S.mazo = shuffle(S.descarte); S.descarte = [top]; log(S, 'Se baraja el descarte para formar un mazo nuevo.'); }
  const c = delDescarte ? S.descarte.pop() : S.mazo.pop();
  S.jug[j].cartas.push(c); S.cogida = delDescarte ? c : -1; S.fase = 'descartar';
  if (delDescarte) log(S, `${S.jug[j].nombre} ${v(S.jug[j], 'coge', 'coges')} del descarte.`);
  return c;
}
// Bajarse: `jugadas` = lista de grupos de ids que cumplen el contrato exacto (t tríos y e escaleras).
export function bajar(S, j, jugadas) {
  const J = S.jug[j], K = contrato(S);
  if (S.fase !== 'descartar' || S.turno !== j || J.bajado || !Array.isArray(jugadas)) return 'No puedes bajarte ahora.';
  const ids = jugadas.flat(); if (new Set(ids).size !== ids.length || !ids.every(x => J.cartas.includes(x))) return 'Esas cartas no son tuyas.';
  if (J.cartas.length - ids.length < 1) return 'Tienes que quedarte al menos con una carta para tirar.';
  let t = 0, e = 0; const sets = [];
  for (const g of jugadas) {
    const a = (t < K.t && analizar(g, 'trio')) || (e < K.e && analizar(g, 'escalera'));
    if (!a) return 'Alguna jugada no es válida para el contrato.';
    if (a.tipo === 'trio') t++; else e++; sets.push({ ...a, dueno: j });
  }
  if (t !== K.t || e !== K.e) return `El contrato es: ${K.nombre.toLowerCase()}.`;
  J.cartas = J.cartas.filter(x => !ids.includes(x)); J.bajado = true; J.bajadoEn = S.nTurno;
  S.mesa.push(...sets.map(s => ({ tipo: s.tipo, cartas: s.orden, dueno: j })));
  log(S, `${J.nombre} ${v(J, 'se baja', 'te bajas')}: ${K.nombre.toLowerCase()}.`);
  return '';
}
// Colocar una carta en una jugada de la mesa (solo si ya te bajaste en un turno anterior)
export const puedeColocar = (S, j) => S.jug[j].bajado && S.jug[j].bajadoEn < S.nTurno;
export function encaja(S, k, c) { const s = S.mesa[k]; return !!s && !!analizar([...s.cartas, c], s.tipo); }
export function colocar(S, j, c, k) {
  const J = S.jug[j];
  if (S.fase !== 'descartar' || S.turno !== j || !puedeColocar(S, j) || !J.cartas.includes(c) || J.cartas.length < 2 || !encaja(S, k, c)) return false;
  S.mesa[k].cartas = analizar([...S.mesa[k].cartas, c], S.mesa[k].tipo).orden;
  J.cartas.splice(J.cartas.indexOf(c), 1); return true;
}
export function tirar(S, j, c) {
  const J = S.jug[j];
  if (S.fase !== 'descartar' || S.turno !== j || !J.cartas.includes(c)) return false;
  if (c === S.cogida && J.cartas.length > 1) return false;           // no se puede tirar la carta que acabas de coger del descarte
  J.cartas.splice(J.cartas.indexOf(c), 1); S.descarte.push(c); S.cogida = -1;
  if (!J.cartas.length) { finRonda(S, j); return true; }
  S.turno = (j + 1) % S.jug.length; S.fase = 'robar'; S.nTurno++; return true;
}
function finRonda(S, g) {                                   // g = -1: nadie cierra (mazo agotado), todos suman
  S.ganadorRonda = g;
  S.jug.forEach((J, k) => { const p = k === g ? 0 : puntosMano(J.cartas); J.total += p; J.rondas.push(p); });
  if (g >= 0) log(S, `¡${S.jug[g].nombre} ${v(S.jug[g], 'cierra', 'cierras')} la ronda ${S.ronda + 1}!`);
  if (S.ronda >= 6) { let b = 0; S.jug.forEach((J, k) => { if (J.total < S.jug[b].total) b = k; }); S.ganador = b; S.fase = 'fin'; log(S, `Fin de la partida: ${v(S.jug[b], 'gana', 'ganas')} ${S.jug[b].nombre === 'Tú' ? 'tú' : S.jug[b].nombre} con ${S.jug[b].total} puntos.`); }
  else S.fase = 'finRonda';
}

/* ---------- búsqueda del contrato ---------- */
function candidatas(mano) {
  const nj = mano.filter(esComodin).length, N = mano.filter(x => !esComodin(x)), res = [];
  const porR = new Map(); N.forEach(x => { const r = rango(x); (porR.get(r) || porR.set(r, []).get(r)).push(x); });
  for (const [, g] of porR) {
    if (g.length >= 3) res.push({ tipo: 'trio', nat: g.slice(), j: 0 });                       // todas las cartas de ese número
    if (g.length >= 4) for (let k = 0; k < g.length && k < 6; k++) res.push({ tipo: 'trio', nat: g.filter((_, i) => i !== k), j: 0 });   // dejando una libre
    if (g.length >= 2 && nj) res.push({ tipo: 'trio', nat: g.slice(0, 2), j: 1 });                 // pareja + comodín
  }
  for (let p = 0; p < 4; p++) {
    const por = new Map(); N.forEach(x => { if (palo(x) !== p) return; const r = rango(x); if (!por.has(r)) por.set(r, x); if (r === 0 && !por.has(13)) por.set(13, x); });
    for (let s = 0; s <= 10; s++) for (let len = 4; s + len - 1 <= 13; len++) {
      const nat = [], usados = new Set(); let falta = 0;
      for (let k = s; k < s + len; k++) { const x = por.get(k); if (x != null && !usados.has(x)) { nat.push(x); usados.add(x); } else falta++; }
      if (falta > nj || nat.length < 2 || nat.length < falta) { if (falta > nj) break; continue; }
      res.push({ tipo: 'escalera', nat, j: falta });
    }
  }
  return res.filter(c => c.nat.length >= 2 && (c.tipo === 'trio' ? c.nat.length + c.j >= 3 : c.nat.length + c.j >= 4));
}
// Mejor forma de cumplir el contrato K con la mano (deja menos puntos en la mano). Devuelve { jugadas, resto } o null.
export function mejorBajada(mano, K) {
  const cs = candidatas(mano), comodines = mano.filter(esComodin);
  let best = null, nodos = 0;
  const rec = (i, t, e, usadas, jUsados, elegidas) => {
    if (++nodos > 60000) return;
    if (t === K.t && e === K.e) {
      if (mano.length - usadas.size - jUsados < 1) return;
      const restoPts = puntosMano(mano.filter(x => !usadas.has(x))) - jUsados * 50;
      if (!best || restoPts < best.pts) best = { pts: restoPts, elegidas: elegidas.slice() };
      return;
    }
    for (let k = i; k < cs.length; k++) {
      const c = cs[k]; if (c.tipo === 'trio' ? t >= K.t : e >= K.e) continue;
      if (jUsados + c.j > comodines.length || c.nat.some(x => usadas.has(x))) continue;
      c.nat.forEach(x => usadas.add(x)); elegidas.push(c);
      rec(k + 1, t + (c.tipo === 'trio'), e + (c.tipo === 'escalera'), usadas, jUsados + c.j, elegidas);
      elegidas.pop(); c.nat.forEach(x => usadas.delete(x));
    }
  };
  rec(0, 0, 0, new Set(), 0, []);
  if (!best) return null;
  let jj = comodines.slice();
  const jugadas = best.elegidas.map(c => { const g = [...c.nat, ...jj.slice(0, c.j)]; jj = jj.slice(c.j); return analizar(g, c.tipo).orden; });
  const usadas = new Set(jugadas.flat());
  return { jugadas, resto: mano.filter(x => !usadas.has(x)) };
}

/* ---------- CPU ---------- */
function utilidad(S, mano, c) {                              // cuánto aporta c a la mano para el contrato (mayor = guardar)
  if (esComodin(c)) return 100;
  const K = contrato(S); let u = 0;
  for (const x of mano) {
    if (x === c || esComodin(x)) continue;
    if (K.t && rango(x) === rango(c)) u += 3;
    if (K.e && palo(x) === palo(c)) { const d = Math.abs(rango(x) - rango(c)); if (d && d <= 3) u += 3 - d * .7; }
  }
  return u;
}
export function cpuTurno(S, j) {                             // juega el turno completo de la CPU (robar, bajar/colocar, tirar)
  const J = S.jug[j], K = contrato(S), top = S.descarte[S.descarte.length - 1], nv = S.nivel;
  // 1) robar
  let delDesc = false;
  if (top != null && nv !== 'facil') {
    if (esComodin(top)) delDesc = true;
    else if (!J.bajado) delDesc = !!mejorBajada([...J.cartas, top], K) && !mejorBajada(J.cartas, K) || utilidad(S, J.cartas, top) >= (nv === 'dificil' ? 4 : 6);
    else delDesc = puedeColocar(S, j) && S.mesa.some((_, k) => encaja(S, k, top));
  }
  let r = robar(S, j, delDesc); if (r === false) r = robar(S, j, !delDesc);
  if (r === 'fin' || S.fase !== 'descartar') return;
  // 2) bajarse
  if (!J.bajado) { const b = mejorBajada(J.cartas, K); if (b && !(nv === 'facil' && Math.random() < .2)) bajar(S, j, b.jugadas); }
  // 3) colocar cartas en la mesa
  if (puedeColocar(S, j)) {
    let hecho = true;
    while (hecho && J.cartas.length > 1) { hecho = false; for (const c of J.cartas.slice().sort((a, b) => puntos(b) - puntos(a))) { const k = S.mesa.findIndex((_, i) => encaja(S, i, c)); if (k >= 0 && J.cartas.length > 1) { colocar(S, j, c, k); hecho = true; break; } } }
  }
  // 4) tirar
  const ops = J.cartas.filter(c => c !== S.cogida || J.cartas.length === 1);
  let t;
  if (nv === 'facil' && Math.random() < .35) t = ops[Math.floor(Math.random() * ops.length)];
  else if (J.bajado) t = ops.filter(c => !esComodin(c)).sort((a, b) => puntos(b) - puntos(a))[0] ?? ops[0];
  else t = ops.slice().sort((a, b) => utilidad(S, J.cartas, a) - utilidad(S, J.cartas, b) || puntos(b) - puntos(a))[0];
  tirar(S, j, t);
}

/* ---------- validación ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || !NIVEL[d.nivel] || !Array.isArray(d.jug) || d.jug.length < 2 || d.jug.length > 4) return null;
  const ent = (x, a, b) => Number.isInteger(x) && x >= a && x <= b, lista = a => Array.isArray(a) && a.every(x => ent(x, 0, 107));
  const jug = [];
  for (const J of d.jug) { if (!J || typeof J.nombre !== 'string' || !lista(J.cartas) || !ent(J.total, 0, 99999) || !Array.isArray(J.rondas) || !J.rondas.every(x => ent(x, 0, 9999))) return null; jug.push({ nombre: J.nombre.slice(0, 14), cpu: !!J.cpu, cartas: J.cartas.slice(), bajado: !!J.bajado, bajadoEn: ent(J.bajadoEn, -1, 99999) ? J.bajadoEn : -1, total: J.total, rondas: J.rondas.slice(0, 7) }); }
  if (!ent(d.ronda, 0, 6) || !['robar', 'descartar', 'finRonda', 'fin'].includes(d.fase) || !ent(d.turno, 0, jug.length - 1) || !ent(d.mano, 0, jug.length - 1)) return null;
  if (!lista(d.mazo) || !lista(d.descarte) || !Array.isArray(d.mesa)) return null;
  const mesa = [];
  for (const s of d.mesa) { if (!s || !lista(s.cartas) || !['trio', 'escalera'].includes(s.tipo) || !ent(s.dueno, 0, jug.length - 1)) return null; const a = analizar(s.cartas, s.tipo); if (!a) return null; mesa.push({ tipo: s.tipo, cartas: a.orden, dueno: s.dueno }); }
  const todas = [...d.mazo, ...d.descarte, ...mesa.flatMap(s => s.cartas), ...jug.flatMap(J => J.cartas)];
  if (todas.length !== 108 || new Set(todas).size !== 108) return null;
  return { nivel: d.nivel, ronda: d.ronda, turno: d.turno, mano: d.mano, fase: d.fase, mazo: d.mazo.slice(), descarte: d.descarte.slice(), mesa, jug,
    cogida: ent(d.cogida, -1, 107) ? d.cogida : -1, nTurno: ent(d.nTurno, 0, 99999) ? d.nTurno : 0, rebarajes: ent(d.rebarajes, 0, 5) ? d.rebarajes : 0,
    ganadorRonda: ent(d.ganadorRonda, -1, jug.length - 1) ? d.ganadorRonda : -1, ganador: ent(d.ganador, -1, jug.length - 1) ? d.ganador : -1,
    log: Array.isArray(d.log) ? d.log.filter(x => typeof x === 'string').slice(0, 7).map(x => x.slice(0, 160)) : [] };
}
