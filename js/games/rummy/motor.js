// Motor del Rummy Tile (las reglas del clásico juego de fichas numeradas). Sin DOM, probable con Node.
// 106 fichas: id 0..103 = números 1..13 en 4 colores, dos copias; 104 y 105 = comodines.
// Jugadas válidas: GRUPO (3–4 fichas del mismo número y colores distintos) o ESCALERA (3+ números seguidos del mismo color, del 1 al 13).
// En tu turno juegas fichas (y puedes reorganizar la mesa) o robas una. La primera bajada debe sumar ≥ 30 con fichas propias.
import { shuffle } from '../../core/dom.js';

export const COLORES = ['rojo', 'azul', 'naranja', 'negro'];
export const NIVEL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
export const esComodin = id => id >= 104;
export const color = id => (id % 52) / 13 | 0;
export const numero = id => (id % 52) % 13 + 1;
export const COMODIN_PUNTOS = 30, BAJADA = 30;

/* ---------- jugadas ---------- */
// Devuelve { tipo, orden, valor } si `ids` es una jugada válida (orden = cómo se colocan, con los comodines en su sitio), o null.
export function analizar(ids) {
  if (!Array.isArray(ids) || ids.length < 3) return null;
  const J = ids.filter(esComodin), N = ids.filter(x => !esComodin(x));
  if (!N.length) return ids.length <= 13 ? { tipo: 'escalera', orden: ids.slice(), valor: 0 } : null;
  const nums = N.map(numero), cols = N.map(color);
  // grupo
  if (ids.length <= 4 && nums.every(v => v === nums[0]) && new Set(cols).size === cols.length) {
    return { tipo: 'grupo', orden: [...N.slice().sort((a, b) => color(a) - color(b)), ...J], valor: nums[0] * ids.length };
  }
  // escalera
  if (ids.length <= 13 && cols.every(c => c === cols[0]) && new Set(nums).size === nums.length) {
    const lo = Math.min(...nums), hi = Math.max(...nums), len = ids.length;
    if (hi - lo + 1 > len) return null;
    const s = Math.min(lo, 14 - len); if (s < Math.max(1, hi - len + 1)) return null;
    const porNum = new Map(N.map(x => [numero(x), x])), jj = J.slice(), orden = [];
    for (let v = s; v < s + len; v++) orden.push(porNum.has(v) ? porNum.get(v) : jj.pop());
    return { tipo: 'escalera', orden, valor: (s + s + len - 1) * len / 2, inicio: s };
  }
  return null;
}
export const valida = ids => !!analizar(ids);
export const puntosFicha = id => (esComodin(id) ? COMODIN_PUNTOS : numero(id));
export const puntosMano = m => m.reduce((s, x) => s + puntosFicha(x), 0);
// Ordena una jugada para mostrarla (aunque aún no sea válida: por número o por color de forma razonable)
export function ordenarJugada(ids) {
  const a = analizar(ids); if (a) return a.orden;
  const N = ids.filter(x => !esComodin(x)), J = ids.filter(esComodin);
  const mismoColor = N.length && N.every(x => color(x) === color(N[0]));
  return [...N.sort((x, y) => (mismoColor ? numero(x) - numero(y) : numero(x) - numero(y) || color(x) - color(y))), ...J];
}

/* ---------- partida ---------- */
export function crear({ jugadores, nivel = 'medio' }) {
  const bolsa = shuffle(Array.from({ length: 106 }, (_, i) => i));
  const S = { nivel: NIVEL[nivel] ? nivel : 'medio', mesa: [], bolsa, turno: 0, fase: 'jugar', ganador: -1, pases: 0, nTurno: 1, log: [],
    jug: jugadores.slice(0, 4).map(j => ({ nombre: String(j.nombre).slice(0, 14), cpu: !!j.cpu, fichas: bolsa.splice(0, 14), bajado: false, puntos: 0 })) };
  S.turno = Math.floor(Math.random() * S.jug.length); log(S, S.jug[S.turno].nombre === 'Tú' ? 'Empiezas tú.' : `Empieza ${S.jug[S.turno].nombre}.`, S.turno);
  return S;
}
const v = (J, el, tu) => (J.nombre === 'Tú' ? tu : el);          // «CPU juega» / «Tú juegas»
// El registro guarda «n|texto» (n = jugador que actúa, -1 = general): la pantalla separa lo tuyo (0) de lo de las CPU
const log = (S, t, j = -1) => { S.log.unshift(`${j}|${t}`); if (S.log.length > 24) S.log.length = 24; };
const claveSet = s => s.slice().sort((a, b) => a - b).join(',');
// Comprueba una jugada completa del turno: nuevaMesa (lista de jugadas) y nuevaMano. Devuelve '' si es válida o el motivo.
export function comprobar(S, p, nuevaMesa, nuevaMano) {
  const J = S.jug[p], antesMesa = S.mesa.flat(), todasAntes = [...antesMesa, ...J.fichas].sort((a, b) => a - b), todasDespues = [...nuevaMesa.flat(), ...nuevaMano].sort((a, b) => a - b);
  if (todasAntes.join() !== todasDespues.join()) return 'Las fichas no cuadran.';
  const enMesa = new Set(nuevaMesa.flat());
  if (antesMesa.some(x => !enMesa.has(x))) return 'Las fichas de la mesa no pueden volver a tu atril.';
  const jugadas = J.fichas.filter(x => enMesa.has(x));
  if (!jugadas.length) return 'No has jugado ninguna ficha.';
  const mala = nuevaMesa.findIndex(s => !valida(s));
  if (mala >= 0) return 'Hay jugadas no válidas en la mesa (marcadas en rojo).';
  if (!J.bajado) {
    const antes = new Map(); S.mesa.forEach(s => { const k = claveSet(s); antes.set(k, (antes.get(k) || 0) + 1); });
    let nuevos = 0;
    for (const s of nuevaMesa) { const k = claveSet(s); if (antes.get(k)) antes.set(k, antes.get(k) - 1); else { if (s.some(x => !J.fichas.includes(x))) return 'En tu primera bajada no puedes tocar las jugadas de la mesa.'; nuevos += analizar(s).valor; } }
    if ([...antes.values()].some(v => v > 0)) return 'En tu primera bajada no puedes tocar las jugadas de la mesa.';
    if (nuevos < BAJADA) return `La primera bajada debe sumar al menos ${BAJADA} puntos (llevas ${nuevos}).`;
  }
  return '';
}
export function jugar(S, p, nuevaMesa, nuevaMano) {
  if (S.fase !== 'jugar' || S.turno !== p) return 'No es tu turno.';
  const err = comprobar(S, p, nuevaMesa, nuevaMano); if (err) return err;
  const J = S.jug[p], n = J.fichas.length - nuevaMano.length;
  S.mesa = nuevaMesa.map(s => analizar(s).orden); J.fichas = nuevaMano.slice();
  log(S, `${J.nombre} ${J.bajado ? v(J, 'juega', 'juegas') : v(J, 'se baja con', 'te bajas con')} ${n} ficha${n === 1 ? '' : 's'}.`, S.jug.indexOf(J)); J.bajado = true; S.pases = 0;
  if (!J.fichas.length) return terminar(S, p), '';
  siguiente(S); return '';
}
export function robar(S, p) {
  if (S.fase !== 'jugar' || S.turno !== p) return false;
  const J = S.jug[p];
  if (S.bolsa.length) { J.fichas.push(S.bolsa.pop()); S.pases = 0; log(S, `${J.nombre} ${v(J, 'roba', 'robas')}.`, S.jug.indexOf(J)); }
  else { S.pases++; log(S, `${J.nombre} ${v(J, 'pasa', 'pasas')} (no quedan fichas en la bolsa).`, S.jug.indexOf(J)); if (S.pases >= S.jug.length) { let g = 0; S.jug.forEach((x, k) => { if (puntosMano(x.fichas) < puntosMano(S.jug[g].fichas)) g = k; }); return terminar(S, g), true; } }
  siguiente(S); return true;
}
function siguiente(S) { S.turno = (S.turno + 1) % S.jug.length; S.nTurno++; }
function terminar(S, g) {
  S.fase = 'fin'; S.ganador = g; let total = 0;
  S.jug.forEach((x, k) => { if (k === g) return; const pts = puntosMano(x.fichas); x.puntos = -pts; total += pts; });
  S.jug[g].puntos = total - (S.jug[g].fichas.length ? puntosMano(S.jug[g].fichas) : 0);
  log(S, `¡${S.jug[g].nombre} ${v(S.jug[g], 'gana', 'ganas')} la partida${S.jug[g].fichas.length ? ' (bolsa agotada: menos puntos en el atril)' : ''}!`, g);
}

/* ---------- IA ---------- */
// Todas las jugadas que se pueden formar con las fichas de `mano` (con hasta los comodines que haya).
function candidatas(mano) {
  const J = mano.filter(esComodin), N = mano.filter(x => !esComodin(x)), nj = J.length, res = [];
  const por = new Map(); N.forEach(x => { const k = color(x) * 13 + numero(x) - 1; if (!por.has(k)) por.set(k, x); });
  const ficha = (c, v) => por.get(c * 13 + v - 1);
  for (let c = 0; c < 4; c++) for (let s = 1; s <= 11; s++) for (let len = 3; s + len - 1 <= 13; len++) {
    const ids = [], faltan = []; for (let v = s; v < s + len; v++) { const f = ficha(c, v); if (f != null) ids.push(f); else faltan.push(v); }
    if (faltan.length > nj || ids.length < 2) { if (faltan.length > nj) break; continue; }
    res.push([...ids, ...J.slice(0, faltan.length)]);
  }
  for (let v = 1; v <= 13; v++) {
    const hay = [0, 1, 2, 3].map(c => ficha(c, v)).filter(x => x != null);
    for (let mask = 1; mask < 1 << hay.length; mask++) {
      const sel = hay.filter((_, k) => mask >> k & 1); if (sel.length < 2) continue;
      for (let size = Math.max(3, sel.length); size <= 4; size++) { const f = size - sel.length; if (f <= nj) res.push([...sel, ...J.slice(0, f)]); }
    }
  }
  return res.filter(valida);
}
// Mejor conjunto de jugadas disjuntas con las fichas de la mano (máximo de puntos o de fichas).
function mejorCombinacion(mano, criterio) {
  const cs = candidatas(mano).map(s => ({ s, v: criterio === 'puntos' ? analizar(s).valor : s.length - .4 * s.filter(esComodin).length })).sort((a, b) => b.v - a.v).slice(0, 160);
  let best = { sets: [], v: 0 }, nodos = 0;
  const rec = (i, usadas, sets, v) => {
    if (++nodos > 40000) return;
    if (v > best.v) best = { sets: sets.slice(), v };
    for (let k = i; k < cs.length; k++) {
      const c = cs[k];
      if (c.s.some(x => usadas.has(x))) continue;
      c.s.forEach(x => usadas.add(x)); sets.push(c.s); rec(k + 1, usadas, sets, v + c.v); sets.pop(); c.s.forEach(x => usadas.delete(x));
    }
  };
  rec(0, new Set(), [], 0);
  return best;
}
// Busca la jugada de la CPU (también sirve de pista). Devuelve { mesa, mano } o null si debe robar.
export function sugerir(S, p, nivel = S.nivel) {
  const J = S.jug[p]; let mano = J.fichas.slice(), mesa = S.mesa.map(s => s.slice());
  if (!J.bajado) {
    const b = mejorCombinacion(mano, 'puntos');
    if (b.v < BAJADA) return null;
    const usadas = new Set(b.sets.flat());
    return { mesa: [...mesa, ...b.sets], mano: mano.filter(x => !usadas.has(x)) };
  }
  // 1) jugadas nuevas con la mano
  const b = mejorCombinacion(mano, 'fichas');
  if (b.sets.length && !(nivel === 'facil' && Math.random() < .25)) { const us = new Set(b.sets.flat()); mesa.push(...b.sets); mano = mano.filter(x => !us.has(x)); }
  if (nivel !== 'facil' || Math.random() < .5) {
    // 2) añadir fichas sueltas a las jugadas de la mesa (y 3, en difícil: partir escaleras y robar fichas de la mesa)
    let cambio = true, vueltas = 0;
    while (cambio && vueltas++ < 30) {
      cambio = false;
      for (const x of mano.slice().sort((a, b2) => esComodin(a) - esComodin(b2))) {
        if (esComodin(x) && mano.length > 1 && nivel !== 'dificil') continue;
        const k = mesa.findIndex(s => valida([...s, x]));
        if (k >= 0) { mesa[k] = analizar([...mesa[k], x]).orden; mano = mano.filter(y => y !== x); cambio = true; break; }
      }
      if (cambio || nivel !== 'dificil') continue;
      cambio = partirEscalera(mesa, mano) || completarConMesa(mesa, mano);
      if (cambio) { const us = new Set(mesa.flat()); mano = mano.filter(x => !us.has(x)); }
    }
  }
  if (mano.length === J.fichas.length) return null;
  return comprobar(S, p, mesa, mano) ? null : { mesa, mano };
}
// Escalera 3-4-5-6-7 + un 5 del mismo color en la mano → 3-4-5 y 5-6-7
function partirEscalera(mesa, mano) {
  for (let k = 0; k < mesa.length; k++) {
    const a = analizar(mesa[k]); if (!a || a.tipo !== 'escalera' || a.orden.length < 5) continue;
    for (const x of mano) {
      if (esComodin(x)) continue;
      const pos = numero(x) - a.inicio; if (pos < 2 || pos > a.orden.length - 3) continue;
      const izq = [...a.orden.slice(0, pos), x], der = a.orden.slice(pos);
      if (valida(izq) && valida(der)) { mesa.splice(k, 1, izq, der); return true; }
    }
  }
  return false;
}
// Dos fichas de la mano + una ficha «sobrante» de la mesa (extremo de una escalera de 4+ o una del grupo de 4)
function completarConMesa(mesa, mano) {
  const N = mano.filter(x => !esComodin(x));
  for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
    for (let k = 0; k < mesa.length; k++) {
      const s = mesa[k], a = analizar(s); if (!a || s.length < 4) continue;
      const libres = a.tipo === 'grupo' ? s.filter(x => !esComodin(x)) : [a.orden[0], a.orden[a.orden.length - 1]].filter(x => !esComodin(x));
      for (const t of libres) {
        const nuevo = [N[i], N[j], t], resto = s.filter(x => x !== t);
        if (valida(nuevo) && valida(resto)) { mesa.splice(k, 1, analizar(resto).orden, analizar(nuevo).orden); return true; }
      }
    }
  }
  return false;
}

/* ---------- validación ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || !NIVEL[d.nivel] || !Array.isArray(d.jug) || d.jug.length < 2 || d.jug.length > 4 || !Array.isArray(d.mesa) || !Array.isArray(d.bolsa)) return null;
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, lista = a => Array.isArray(a) && a.every(x => ent(x, 0, 105));
  const jug = []; for (const j of d.jug) { if (!j || typeof j.nombre !== 'string' || !lista(j.fichas) || !ent(j.puntos, -2000, 2000)) return null; jug.push({ nombre: j.nombre.slice(0, 14), cpu: !!j.cpu, fichas: j.fichas.slice(), bajado: !!j.bajado, puntos: j.puntos }); }
  if (!d.mesa.every(lista) || !lista(d.bolsa)) return null;
  const todas = [...d.mesa.flat(), ...d.bolsa, ...jug.flatMap(j => j.fichas)];
  if (todas.length !== 106 || new Set(todas).size !== 106) return null;
  if (!d.mesa.every(valida)) return null;
  if (!['jugar', 'fin'].includes(d.fase) || !ent(d.turno, 0, jug.length - 1) || !ent(d.ganador, -1, jug.length - 1) || !ent(d.pases, 0, 8)) return null;
  return { nivel: d.nivel, mesa: d.mesa.map(s => analizar(s).orden), bolsa: d.bolsa.slice(), turno: d.turno, fase: d.fase, ganador: d.ganador, pases: d.pases, nTurno: ent(d.nTurno, 1, 99999) ? d.nTurno : 1, jug,
    log: Array.isArray(d.log) ? d.log.filter(x => typeof x === 'string').slice(0, 24).map(x => (/^-?\d\|/.test(x) ? x : '-1|' + x).slice(0, 124)) : [] };
}
