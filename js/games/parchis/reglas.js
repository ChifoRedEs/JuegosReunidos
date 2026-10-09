// Motor de reglas del Parchís (sin DOM, probable con Node). Opera sobre el estado P.
import { PC, PNAME, PSTART, PSAFE, absOf, pKey } from './tablero.js';

export const nombre = (P, c) => (P.names && P.names[c]) || PNAME[c];
export const actual = P => P.order[P.turn];
export const esCPU = (P, c) => P.cfg[c] === 'c';
export function log(P, t) { P.log.unshift(t); if (P.log.length > 5) P.log.length = 5; }

export function nuevaPartida(cfg, names = {}) {
  const order = PC.filter(c => cfg[c]);
  const P = { cfg: { ...cfg }, names: { ...names }, order, pieces: Object.fromEntries(order.map(c => [c, [-1, -1, -1, -1]])), turn: Math.floor(Math.random() * order.length),
    phase: 'roll', die: null, step: 0, kind: 'die', pend: [], sixes: 0, again: false, lastMoved: null, winner: null, note: '', log: [], moves: [], ov: null };
  log(P, `Empieza ${nombre(P, actual(P))}.`);
  return P;
}
export function ocupacion(P) {
  const o = {};
  for (const c of P.order) P.pieces[c].forEach((p, i) => { if (p < 0 || p === 71) return; const k = pKey(c, p); (o[k] = o[k] || []).push({ c, i }); });
  return o;
}
export function legales(P, c, step, kind) {
  const o = ocupacion(P), pc = P.pieces[c], res = [];
  // con un 5 es obligatorio sacar ficha si se puede
  if (kind === 'die' && step === 5 && pc.includes(-1)) {
    const here = o['T' + PSTART[c]] || []; let cap = null, ok = true;
    if (here.length >= 2) { cap = here.find(x => x.c !== c) || null; if (!cap) ok = false; }
    if (ok) { pc.forEach((p, i) => { if (p === -1) res.push({ c, i, from: -1, to: 0, cap }); }); return res; }
  }
  pc.forEach((p, i) => {
    if (p < 0 || p === 71) return;
    const t = p + step; if (t > 71) return;                                       // a meta hay que entrar con el número exacto
    for (let x = p + 1; x < t; x++) { const h = o[pKey(c, x)] || []; if (h.length === 2 && h[0].c === h[1].c) return; }   // barrera
    let cap = null;
    if (t < 71) {
      const h = o[pKey(c, t)] || [];
      if (h.length >= 2) return;
      if (h.length === 1 && h[0].c !== c && t <= 63 && !PSAFE.has(absOf(c, t))) cap = h[0];
    }
    res.push({ c, i, from: p, to: t, cap });
  });
  // con un 6 hay que abrir barrera propia si es posible
  if (kind === 'die' && step >= 6) {
    const cells = {}; pc.forEach((p, i) => { if (p >= 0 && p <= 63) (cells[absOf(c, p)] = cells[absOf(c, p)] || []).push(i); });
    const bar = Object.values(cells).filter(a => a.length === 2).flat();
    if (bar.length) { const f = res.filter(m => bar.includes(m.i)); if (f.length) return f; }
  }
  return res;
}
function peligro(P, c, a) {   // cuántas fichas rivales podrían alcanzar la casilla a con una tirada
  let n = 0;
  for (const o of P.order) { if (o === c) continue; P.pieces[o].forEach(p => { if (p < 0 || p > 63) return; const d = (a - absOf(o, p) + 68) % 68; if (d >= 1 && d <= 7 && p + d <= 63) n++; }); }
  return n;
}
export function puntuar(P, m) {
  const c = m.c; let s = Math.random() * 2;
  if (m.from === -1) s += 50;
  if (m.cap) s += 60 + P.pieces[m.cap.c][m.cap.i] * .4;
  if (m.to === 71) s += 90; else if (m.to > 63 && m.from <= 63) s += 35;
  s += (m.to - Math.max(m.from, 0)) * .4;
  if (m.from >= 0 && m.from <= 63 && !PSAFE.has(absOf(c, m.from))) s += peligro(P, c, absOf(c, m.from)) * 15;
  if (m.to <= 63) {
    const a = absOf(c, m.to);
    if (PSAFE.has(a)) s += 12; else s -= peligro(P, c, a) * 18;
    if (P.pieces[c].some((p, j) => j !== m.i && p >= 0 && p <= 63 && absOf(c, p) === a)) s += 6;
  }
  return s;
}
export const mejorJugada = P => { const sc = P.moves.map(m => puntuar(P, m)); return P.moves[sc.indexOf(Math.max(...sc))]; };

function fijarPaso(P, step, kind) {
  P.step = step; P.kind = kind; P.moves = legales(P, actual(P), step, kind);
  if (P.moves.length) P.phase = 'move';
  else { P.phase = 'pass'; P.note = kind === 'bonus' ? `Ninguna ficha puede contar ${step}: se pierde el premio.` : `${nombre(P, actual(P))} no puede mover.`; }
}
// Aplica una tirada v (1..6)
export function tirar(P, v) {
  if (P.phase !== 'roll') return;
  const c = actual(P); P.die = v; P.again = false; P.note = '';
  if (v === 6) {
    P.sixes++;
    if (P.sixes === 3) {
      P.sixes = 0; const i = P.lastMoved, p = i == null ? -1 : P.pieces[c][i];
      if (p >= 0 && p <= 63) { P.pieces[c][i] = -1; P.note = 'Tercer 6 seguido: la última ficha movida vuelve a casa.'; }
      else P.note = 'Tercer 6 seguido: se acaba el turno.';
      log(P, `${nombre(P, c)} saca el tercer 6 seguido.`); P.phase = 'pass'; return;
    }
    P.again = true;
  } else P.sixes = 0;
  const step = v === 6 && !P.pieces[c].includes(-1) ? 7 : v;
  log(P, `${nombre(P, c)} saca ${v}${step === 7 ? ' (cuenta 7)' : ''}.`);
  fijarPaso(P, step, 'die');
}
// Mueve una ficha. Devuelve datos para animar la jugada.
export function mover(P, m) {
  if (P.phase !== 'move') return null;
  const c = m.c, info = { c, i: m.i, from: m.from, to: m.to, cap: null };
  P.pieces[c][m.i] = m.to;
  if (m.from === -1) log(P, `${nombre(P, c)} saca una ficha de casa.`);
  if (m.cap) { info.cap = { c: m.cap.c, i: m.cap.i, p: P.pieces[m.cap.c][m.cap.i] }; P.pieces[m.cap.c][m.cap.i] = -1; P.pend.push(20); log(P, `${nombre(P, c)} se come una ficha de ${nombre(P, m.cap.c)} y cuenta 20.`); }
  if (m.to === 71) { P.pend.push(10); log(P, `${nombre(P, c)} mete una ficha en meta y cuenta 10.`); }
  if (P.kind === 'die') P.lastMoved = m.i;
  if (P.pieces[c].every(p => p === 71)) { P.phase = 'over'; P.winner = c; P.pend = []; P.moves = []; log(P, `¡${nombre(P, c)} gana la partida!`); return info; }
  siguiente(P);
  return info;
}
// Pasa al siguiente paso: premio pendiente, repetir tirada o cambio de turno
export function siguiente(P) {
  if (P.phase === 'over') return;
  P.note = '';
  if (P.pend.length) fijarPaso(P, P.pend.shift(), 'bonus');
  else if (P.again) { P.again = false; P.phase = 'roll'; P.moves = []; log(P, `${nombre(P, actual(P))} vuelve a tirar.`); }
  else { P.turn = (P.turn + 1) % P.order.length; P.sixes = 0; P.lastMoved = null; P.phase = 'roll'; P.die = null; P.moves = []; }
}
