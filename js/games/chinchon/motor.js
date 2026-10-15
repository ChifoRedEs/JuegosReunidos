// Motor del Chinchón con baraja española de 40 cartas (sin DOM, probable con Node).
// Carta id = palo * 10 + posición (0..9 = 1,2,3,4,5,6,7,sota,caballo,rey), como en core/cartas.js.
// Jugadas («ligas»): tríos o cuartetos del mismo número, o escaleras de 3 o más cartas seguidas del mismo palo
// (el 7 enlaza con la sota). Cada turno: robar (del mazo o del descarte) y tirar una carta. Se puede CERRAR al tirar si las
// cartas sueltas que quedan suman como mucho el límite de cierre. Cerrar sin sueltas resta 10. Escalera de 7 = ¡CHINCHÓN!: gana la partida.
// Las demás cartas sueltas suman puntos (figuras 10). Quien pasa del límite de la partida queda eliminado; gana el último que quede.
// COMODINES (opcional): 2 con 2 o 3 jugadores, 3 con 4 jugadores (ids 40, 41, 42). Sustituyen a cualquier carta de una jugada, que debe llevar
// al menos 2 cartas naturales y no más comodines que naturales. Suelto, un comodín suma 25 puntos. Una escalera de 7 con comodines también es chinchón.
import { shuffle } from '../../core/dom.js';

export const esComodin = id => id >= 40;
export const palo = id => (id >= 40 ? 4 : id / 10 | 0), pos = id => (id >= 40 ? 10 : id % 10);
export const valor = id => (id >= 40 ? 25 : pos(id) < 7 ? pos(id) + 1 : 10);
export const numComodines = (nJugadores, con) => (con ? (nJugadores >= 4 ? 3 : 2) : 0);
export const NIVEL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
export const LIMITES = [50, 100], CIERRES = [3, 5];

/* ---------- combinaciones ---------- */
function ligasPosibles(cs) {
  if (cs.some(esComodin)) return ligasConComodines(cs);
  const res = [], porPos = {}, porPalo = {};
  for (const c of cs) { (porPos[pos(c)] = porPos[pos(c)] || []).push(c); (porPalo[palo(c)] = porPalo[palo(c)] || []).push(c); }
  for (const g of Object.values(porPos)) {
    if (g.length === 4) res.push(g.slice());
    if (g.length >= 3) for (let i = 0; i < g.length; i++) { const t = g.filter((_, k) => k !== i); if (g.length === 4) res.push(t); else { res.push(g.slice()); break; } }
  }
  for (const p of Object.values(porPalo)) {
    p.sort((x, y) => pos(x) - pos(y));
    for (let i = 0; i < p.length; i++) {
      let j = i; while (j + 1 < p.length && pos(p[j + 1]) === pos(p[j]) + 1) j++;
      for (let a = i; a <= j; a++) for (let b = a + 2; b <= j; b++) res.push(p.slice(a, b + 1));
      i = j;
    }
  }
  return res;
}
// Con comodines: cada candidata es una lista con las cartas naturales y -1 en el hueco de cada comodín (en las escaleras, en su posición).
function ligasConComodines(cs) {
  const nat = cs.filter(c => !esComodin(c)), J = cs.length - nat.length, res = [];
  const comb = (a, n) => (n === 0 ? [[]] : a.flatMap((x, i) => comb(a.slice(i + 1), n - 1).map(r => [x, ...r])));
  const porPos = {}, porPalo = {};
  for (const c of nat) { (porPos[pos(c)] = porPos[pos(c)] || []).push(c); (porPalo[palo(c)] = porPalo[palo(c)] || []).push(c); }
  for (const g of Object.values(porPos)) {
    g.sort((x, y) => palo(x) - palo(y));
    for (let n = 2; n <= g.length; n++) for (const cb of comb(g, n)) for (let j = 0; j <= J && j <= n; j++) if (n + j >= 3 && n + j <= 4) res.push([...cb, ...Array(j).fill(-1)]);
  }
  for (const p of Object.values(porPalo)) {
    const en = new Map(p.map(c => [pos(c), c]));
    for (let lo = 0; lo <= 9; lo++) for (let hi = lo + 2; hi <= 9; hi++) {
      const l = []; let n = 0;
      for (let q = lo; q <= hi; q++) { if (en.has(q)) { l.push(en.get(q)); n++; } else l.push(-1); }
      const j = l.length - n; if (n >= 2 && j <= J && j <= n) res.push(l);
    }
  }
  return res;
}
// Mejor reparto de una mano: ligas disjuntas que dejan menos puntos sueltos.
export function mejor(cs) {
  const ls = ligasPosibles(cs), jokers = cs.filter(esComodin), J = jokers.length, naturales = cs.filter(c => !esComodin(c));
  let best = { ligas: [], sueltas: cs.slice(), puntos: cs.reduce((s, c) => s + valor(c), 0) };
  const rec = (i, usadas, elegidas, jUs) => {
    if (i === ls.length) {
      const sueltas = naturales.filter(c => !usadas.has(c)), puntos = sueltas.reduce((s, c) => s + valor(c), 0) + (J - jUs) * 25;
      if (puntos < best.puntos || (puntos === best.puntos && elegidas.length < best.ligas.length)) best = { ligas: elegidas.map(l => l.slice()), sueltas: [...sueltas, ...jokers.slice(jUs)], puntos };
      return;
    }
    rec(i + 1, usadas, elegidas, jUs);
    const l = ls[i], nj = l.filter(x => x < 0).length; if (jUs + nj > J || l.some(c => c >= 0 && usadas.has(c))) return;
    l.forEach(c => c >= 0 && usadas.add(c)); elegidas.push(l); rec(i + 1, usadas, elegidas, jUs + nj); elegidas.pop(); l.forEach(c => c >= 0 && usadas.delete(c));
  };
  rec(0, new Set(), [], 0);
  let k = 0;                                               // reparte los comodines reales por los huecos
  best.ligas = best.ligas.map(l => { const sinJ = !l.some(x => x < 0 || esComodin(x)); const r = l.map(x => (x < 0 ? jokers[k++] : x)); return sinJ ? r.sort((x, y) => pos(x) - pos(y) || palo(x) - palo(y)) : r; });
  best.ligas.sort((x, y) => y.length - x.length); best.sueltas.sort((x, y) => palo(x) - palo(y) || pos(x) - pos(y));
  return best;
}
export const esChinchon = cs => {
  if (cs.length !== 7) return false;
  const nat = cs.filter(c => !esComodin(c)), J = 7 - nat.length;
  if (J > nat.length || nat.length < 2 || new Set(nat.map(palo)).size !== 1 || new Set(nat.map(pos)).size !== nat.length) return false;
  const ps = nat.map(pos); return Math.max(...ps) - Math.min(...ps) <= 6;     // caben en una escalera de 7 (los huecos los llenan los comodines)
};
// Con 8 cartas en la mano: ¿qué cartas puedo tirar para cerrar? → [{ c, puntos, chinchon }]
export function cierres(S, j = S.turno) {
  if (S.fase !== 'descartar') return [];
  const m = S.manos[j], out = [];
  for (const c of new Set(m)) {
    if (c === S.cogida) continue;
    const resto = m.filter(x => x !== c), r = mejor(resto), chin = esChinchon(resto);
    if (chin || r.puntos <= S.cierre) out.push({ c, puntos: chin ? 0 : r.puntos, chinchon: chin });
  }
  return out.sort((x, y) => (y.chinchon - x.chinchon) || x.puntos - y.puntos);
}
// ¿Puede colocar una carta suelta en las ligas del que cierra? (en las escaleras con comodín, los comodines ocupan su posición)
const infoLiga = liga => {
  const nat = liga.filter(x => !esComodin(x)), grupo = nat.length >= 2 && nat.every(x => pos(x) === pos(nat[0]));
  const i0 = liga.findIndex(x => !esComodin(x)), lo = grupo || i0 < 0 ? 0 : pos(liga[i0]) - i0;
  return { nat, grupo, lo, hi: lo + liga.length - 1 };
};
export const esGrupo = liga => infoLiga(liga).grupo;
function encaja(c, liga) {
  const { nat, grupo, lo, hi } = infoLiga(liga);
  if (esComodin(c)) return liga.filter(esComodin).length + 1 <= nat.length && (grupo ? liga.length < 4 : lo > 0 || hi < 9);
  if (grupo) return liga.length < 4 && pos(c) === pos(nat[0]);
  if (!nat.every(x => palo(x) === palo(c))) return false;
  return pos(c) === lo - 1 || pos(c) === hi + 1;
}
function ponerEn(c, liga) {
  const { grupo, lo, hi } = infoLiga(liga);
  if (grupo || (esComodin(c) ? hi < 9 : pos(c) === hi + 1)) liga.push(c); else liga.unshift(c);
}

/* ---------- partida ---------- */
export function crear({ jugadores, nivel = 'medio', limite = 100, cierre = 5, comodines = false }) {
  const S = { nivel: NIVEL[nivel] ? nivel : 'medio', limite: LIMITES.includes(limite) ? limite : 100, cierre: CIERRES.includes(cierre) ? cierre : 5,
    nCom: 0, jug: jugadores.slice(0, 4).map(j => ({ nombre: String(j.nombre).slice(0, 14) || 'Jugador', cpu: !!j.cpu, total: 0, fuera: false })),
    manos: [], mazo: [], descarte: [], turno: 0, fase: 'robar', mano: 0, inicia: -1, cogida: -1, rebarajes: 0, recuento: null, ganador: -1, log: [] };
  S.nCom = numComodines(S.jug.length, comodines); repartir(S); return S;
}
const log = (S, t) => { S.log.unshift(t); if (S.log.length > 6) S.log.length = 6; };
export const activos = S => S.jug.map((j, k) => k).filter(k => !S.jug[k].fuera);
const siguienteActivo = (S, j) => { for (let k = 1; k <= S.jug.length; k++) { const x = (j + k) % S.jug.length; if (!S.jug[x].fuera) return x; } return j; };
export function repartir(S) {
  const m = shuffle(Array.from({ length: 40 + S.nCom }, (_, i) => i));
  S.manos = S.jug.map(j => (j.fuera ? [] : m.splice(0, 7)));
  S.descarte = [m.pop()]; S.mazo = m; S.mano++; S.cogida = -1; S.recuento = null; S.rebarajes = 0;
  S.inicia = S.inicia < 0 ? 0 : siguienteActivo(S, S.inicia);
  S.turno = S.inicia; S.fase = 'robar';
  log(S, `Mano ${S.mano}: empieza ${S.jug[S.turno].nombre}${S.nCom ? ` (con ${S.nCom} comodines)` : ''}.`);
}
export function robar(S, desdeDescarte) {
  if (S.fase !== 'robar') return false;
  if (desdeDescarte && !S.descarte.length) return false;
  if (!desdeDescarte && !S.mazo.length) {                     // mazo agotado: se baraja el descarte (menos la de arriba)
    if (S.descarte.length < 2 || S.rebarajes >= 1) {          // segunda vez sin mazo: la mano se anula y se vuelve a repartir
      S.recuento = { cierra: -1, chinchon: false, nula: true, filas: [] }; S.fase = 'recuento';
      log(S, 'El mazo se ha agotado dos veces: mano nula, se reparte de nuevo.'); return 'nula';
    }
    S.rebarajes++;
    const top = S.descarte.pop(); S.mazo = shuffle(S.descarte); S.descarte = [top]; log(S, 'Se baraja el descarte para formar un mazo nuevo.');
  }
  const c = desdeDescarte ? S.descarte.pop() : S.mazo.pop();
  S.manos[S.turno].push(c); S.cogida = desdeDescarte ? c : -1; S.fase = 'descartar';
  return c;
}
export function tirar(S, c) {
  const m = S.manos[S.turno];
  if (S.fase !== 'descartar' || !m.includes(c) || c === S.cogida) return false;
  m.splice(m.indexOf(c), 1); S.descarte.push(c); S.cogida = -1;
  S.turno = siguienteActivo(S, S.turno); S.fase = 'robar'; return true;
}
export function cerrar(S, c) {
  const op = cierres(S).find(x => x.c === c); if (!op) return false;
  const j = S.turno, m = S.manos[j]; m.splice(m.indexOf(c), 1); S.descarte.push(c); S.cogida = -1;
  if (op.chinchon) {
    S.recuento = { cierra: j, chinchon: true, filas: activos(S).map(k => ({ j: k, ...(k === j ? { ligas: m.some(esComodin) ? mejor(m).ligas : [m.slice().sort((x, y) => pos(x) - pos(y))], sueltas: [] } : mejor(S.manos[k])), coloca: [], puntos: 0 })) };
    S.ganador = j; S.fase = 'fin'; log(S, `¡${S.jug[j].nombre} hace CHINCHÓN y gana la partida!`); return true;
  }
  const rc = mejor(m), filas = [];
  filas.push({ j, ligas: rc.ligas, sueltas: rc.sueltas, coloca: [], puntos: rc.puntos === 0 ? -10 : rc.puntos });
  for (const k of activos(S)) {
    if (k === j) continue;
    const r = mejor(S.manos[k]), ligasC = rc.ligas.map(l => l.slice()), coloca = [];
    let sueltas = r.sueltas.slice(), hecho = true;
    while (hecho) { hecho = false; for (const s of sueltas) { const l = ligasC.find(x => encaja(s, x)); if (l) { ponerEn(s, l); coloca.push(s); sueltas = sueltas.filter(x => x !== s); hecho = true; break; } } }
    filas.push({ j: k, ligas: r.ligas, sueltas, coloca, puntos: sueltas.reduce((s, c2) => s + valor(c2), 0) });
  }
  filas.forEach(f => { S.jug[f.j].total += f.puntos; });
  S.recuento = { cierra: j, chinchon: false, filas };
  log(S, `${S.jug[j].nombre} cierra${rc.puntos === 0 ? ' sin cartas sueltas (−10)' : ` con ${rc.puntos}`}.`);
  for (const f of filas) if (S.jug[f.j].total > S.limite && !S.jug[f.j].fuera) { S.jug[f.j].fuera = true; log(S, `${S.jug[f.j].nombre} pasa de ${S.limite} y queda eliminado.`); }
  let quedan = activos(S);
  if (!quedan.length) {                                   // todos eliminados a la vez: gana el que menos tiene
    const js = filas.map(f => f.j); let g = js[0]; js.forEach(k => { if (S.jug[k].total < S.jug[g].total) g = k; }); S.jug[g].fuera = false; quedan = [g];
  }
  if (quedan.length === 1) { S.ganador = quedan[0]; S.fase = 'fin'; log(S, `¡${S.jug[quedan[0]].nombre} gana la partida!`); }
  else S.fase = 'recuento';
  return true;
}
export function siguienteMano(S) { if (S.fase !== 'recuento') return false; repartir(S); return true; }

/* ---------- CPU ---------- */
// Valor de una mano de 7 para la CPU: puntos sueltos menos un pequeño premio por cartas «a punto» de ligar.
function peso(cs, nivel) {
  const r = mejor(cs); if (nivel === 'facil') return r.puntos;
  let pot = 0; const s = r.sueltas;
  for (let i = 0; i < s.length; i++) for (let k = i + 1; k < s.length; k++) {
    const a = s[i], b = s[k]; if (esComodin(a) || esComodin(b)) continue;
    if (pos(a) === pos(b)) pot += 2.5;
    else if (palo(a) === palo(b) && Math.abs(pos(a) - pos(b)) <= 2) pot += Math.abs(pos(a) - pos(b)) === 1 ? 2.5 : 1.2;
  }
  return r.puntos - pot * (nivel === 'dificil' ? 1 : .6);
}
function mejorTirada(S, m, prohibida, nivel) {
  let best = null;
  for (const c of new Set(m)) { if (c === prohibida) continue; const v = peso(m.filter(x => x !== c), nivel) - valor(c) * .01; if (!best || v < best.v) best = { c, v }; }
  return best;
}
export function cpuRobar(S) {                               // true = del descarte
  const m = S.manos[S.turno], top = S.descarte[S.descarte.length - 1]; if (top == null) return false;
  if (S.nivel === 'facil' && Math.random() < .5) return false;
  const ahora = peso(m, S.nivel), con = mejorTirada(S, [...m, top], top, S.nivel);
  return con.v < ahora - (S.nivel === 'dificil' ? 1.5 : 3);
}
export function cpuTirar(S) {                               // → { c, cerrar }
  const cs = cierres(S); if (cs.length) return { c: cs[0].c, cerrar: true };
  const m = S.manos[S.turno];
  if (S.nivel === 'facil' && Math.random() < .3) { const ops = m.filter(c => c !== S.cogida); return { c: ops[Math.floor(Math.random() * ops.length)], cerrar: false }; }
  return { c: mejorTirada(S, m, S.cogida, S.nivel).c, cerrar: false };
}

/* ---------- validación ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || !NIVEL[d.nivel] || !LIMITES.includes(d.limite) || !CIERRES.includes(d.cierre) || !Array.isArray(d.jug) || d.jug.length < 2 || d.jug.length > 4) return null;
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, n = d.jug.length;
  const jug = []; for (const j of d.jug) { if (!j || typeof j.nombre !== 'string' || !ent(j.total, -2000, 2000)) return null; jug.push({ nombre: j.nombre.slice(0, 14), cpu: !!j.cpu, total: j.total, fuera: !!j.fuera }); }
  if (!['robar', 'descartar', 'recuento', 'fin'].includes(d.fase) || !ent(d.turno, 0, n - 1) || !ent(d.mano, 1, 9999) || !ent(d.inicia, 0, n - 1) || !ent(d.ganador, -1, n - 1)) return null;
  const nCom = d.nCom === undefined ? 0 : d.nCom, tam = 40 + nCom;
  if (!ent(nCom, 0, 3)) return null;
  const lista = a => Array.isArray(a) && a.every(c => ent(c, 0, tam - 1));
  if (!Array.isArray(d.manos) || d.manos.length !== n || !d.manos.every(lista) || !lista(d.mazo) || !lista(d.descarte)) return null;
  const todas = [...d.manos.flat(), ...d.mazo, ...d.descarte];
  if (todas.length !== tam || new Set(todas).size !== tam) return null;
  if (d.manos.some((m, k) => !jug[k].fuera && (m.length < 6 || m.length > 8))) return null;
  if ((d.fase === 'robar' || d.fase === 'descartar') && jug[d.turno].fuera) return null;
  if (d.fase === 'descartar' && d.manos[d.turno].length !== 8) return null;
  if ((d.fase === 'robar' || d.fase === 'descartar') && d.manos.some((m, k) => !jug[k].fuera && k !== d.turno && m.length !== 7)) return null;
  const cogida = ent(d.cogida, -1, tam - 1) && (d.cogida < 0 || d.manos[d.turno].includes(d.cogida)) ? d.cogida : -1;
  let recuento = null;
  if (d.fase === 'recuento' || d.fase === 'fin') {
    const r = d.recuento;
    if (r && typeof r === 'object' && ent(r.cierra, -1, n - 1) && Array.isArray(r.filas)) {
      const filas = r.filas.filter(f => f && ent(f.j, 0, n - 1) && Array.isArray(f.ligas) && f.ligas.every(lista) && lista(f.sueltas) && lista(f.coloca) && ent(f.puntos, -10, 400))
        .map(f => ({ j: f.j, ligas: f.ligas.map(l => l.slice()), sueltas: f.sueltas.slice(), coloca: f.coloca.slice(), puntos: f.puntos }));
      recuento = { cierra: r.cierra, chinchon: !!r.chinchon, nula: !!r.nula, filas };
    }
  }
  return { nivel: d.nivel, limite: d.limite, cierre: d.cierre, nCom, jug, manos: d.manos.map(m => m.slice()), mazo: d.mazo.slice(), descarte: d.descarte.slice(), turno: d.turno, fase: d.fase, mano: d.mano, inicia: d.inicia, cogida, rebarajes: ent(d.rebarajes, 0, 5) ? d.rebarajes : 0, recuento, ganador: d.ganador,
    log: Array.isArray(d.log) ? d.log.filter(x => typeof x === 'string').slice(0, 6).map(x => x.slice(0, 160)) : [] };
}
