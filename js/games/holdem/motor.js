// Motor del Texas Hold'em sin límite contra bots (sin DOM, probable con Node).
// Incluye: evaluador de manos (mejor de 5 entre 7), apuestas con subidas mínimas, botes secundarios,
// ciegas crecientes y bots con personalidad que deciden con equidad (Monte Carlo) y probabilidades del bote.
import { nuevaBaraja, barajar, paloDe, rangoDe } from '../../core/cartas.js';

export const CIEGAS = [[10, 20], [15, 30], [25, 50], [50, 100], [75, 150], [100, 200], [150, 300], [200, 400], [300, 600], [500, 1000]];
export const MANOS_POR_NIVEL = 6, STACK = 1000;
export const NOMBRES_BOT = ['Ana', 'Luis', 'Marta', 'Pablo', 'Sofía'];
export const PERFILES = { conservador: { tight: .07, agr: .55, farol: .03 }, equilibrado: { tight: 0, agr: 1, farol: .08 }, agresivo: { tight: -.04, agr: 1.45, farol: .15 }, farolero: { tight: -.02, agr: 1.15, farol: .26 } };
const SIMS = { facil: 100, medio: 280, dificil: 650 };

/* ---------- evaluador ---------- */
const rv = id => { const r = rangoDe(id); return r === 0 ? 14 : r + 1; };
const pack = (cat, a) => { let s = cat; for (let i = 0; i < 5; i++) s = s * 15 + (a[i] || 0); return s; };
const altaStraight = pres => { for (let h = 14; h >= 5; h--) { let ok = true; for (let k = 0; k < 5; k++) { const r = h - k === 1 ? 14 : h - k; if (!pres[r]) { ok = false; break; } } if (ok) return h; } return 0; };
export function valorMano(cs) {
  const cnt = new Array(15).fill(0), palos = [[], [], [], []];
  for (const c of cs) { const r = rv(c); cnt[r]++; palos[paloDe(c)].push(r); }
  let fs = -1; for (let s = 0; s < 4; s++) if (palos[s].length >= 5) fs = s;
  if (fs >= 0) { const pres = new Array(15).fill(false); palos[fs].forEach(r => { pres[r] = true; }); const h = altaStraight(pres); if (h) return pack(8, [h]); }
  const cuatro = [], tres = [], pares = [], sueltas = [];
  for (let r = 14; r >= 2; r--) { if (cnt[r] === 4) cuatro.push(r); else if (cnt[r] === 3) tres.push(r); else if (cnt[r] === 2) pares.push(r); else if (cnt[r] === 1) sueltas.push(r); }
  const resto = ex => { const o = []; for (let r = 14; r >= 2; r--) if (cnt[r] && !ex.includes(r)) o.push(r); return o; };
  if (cuatro.length) return pack(7, [cuatro[0], resto([cuatro[0]])[0]]);
  if (tres.length && (tres.length > 1 || pares.length)) return pack(6, [tres[0], Math.max(tres[1] || 0, pares[0] || 0)]);
  if (fs >= 0) return pack(5, palos[fs].slice().sort((a, b) => b - a).slice(0, 5));
  const pres = cnt.map(x => x > 0), h = altaStraight(pres); if (h) return pack(4, [h]);
  if (tres.length) return pack(3, [tres[0], ...resto([tres[0]]).slice(0, 2)]);
  if (pares.length >= 2) return pack(2, [pares[0], pares[1], resto([pares[0], pares[1]])[0]]);
  if (pares.length) return pack(1, [pares[0], ...resto([pares[0]]).slice(0, 3)]);
  return pack(0, sueltas.slice(0, 5));
}
const P15 = 15 ** 5, NR = { 14: 'ases', 13: 'reyes', 12: 'damas', 11: 'jotas', 10: 'dieces' };
const nr = v => NR[v] || String(v) + 's';
export function nombreMano(s) {
  const cat = Math.floor(s / P15), d1 = Math.floor(s / 15 ** 4) % 15, d2 = Math.floor(s / 15 ** 3) % 15;
  return ['Carta alta', `Pareja de ${nr(d1)}`, `Doble pareja de ${nr(d1)} y ${nr(d2)}`, `Trío de ${nr(d1)}`, 'Escalera', 'Color', `Full de ${nr(d1)}`, `Póker de ${nr(d1)}`, d1 === 14 ? 'Escalera real' : 'Escalera de color'][cat];
}
export function equidad(mano, tablero, rivales, sims) {
  const usadas = new Set([...mano, ...tablero]), mazo = []; for (let i = 0; i < 52; i++) if (!usadas.has(i)) mazo.push(i);
  const faltan = 5 - tablero.length, need = faltan + 2 * rivales; let total = 0;
  for (let s = 0; s < sims; s++) {
    for (let i = 0; i < need; i++) { const j = i + Math.floor(Math.random() * (mazo.length - i)); const t = mazo[i]; mazo[i] = mazo[j]; mazo[j] = t; }
    const board = faltan ? tablero.concat(mazo.slice(0, faltan)) : tablero, mi = valorMano(mano.concat(board)); let idx = faltan, perdi = false, emp = 1;
    for (let r = 0; r < rivales; r++) { const v = valorMano([mazo[idx], mazo[idx + 1], ...board]); idx += 2; if (v > mi) { perdi = true; break; } if (v === mi) emp++; }
    if (!perdi) total += 1 / emp;
  }
  return total / sims;
}

/* ---------- estado y flujo de la partida ---------- */
export function crear(nBots, nivel = 'medio', nombre = 'Tú') {
  const perfiles = Object.keys(PERFILES).sort(() => Math.random() - .5);
  const jug = [{ nombre, bot: false, perfil: 'equilibrado' }];
  for (let i = 0; i < nBots; i++) jug.push({ nombre: NOMBRES_BOT[i], bot: true, perfil: perfiles[i % perfiles.length] });
  const S = { jug: jug.map(j => ({ ...j, stack: STACK, cartas: [], apuesta: 0, inv: 0, fold: false, allin: false, fuera: false, actuo: false, txt: '' })), nivel, boton: Math.floor(Math.random() * jug.length), mano: 0,
    mazo: [], tablero: [], fase: 'fin', turno: -1, apuestaMax: 0, ultRaise: 0, resultado: null, log: [], reg: false, sb: 0, bb: 0, total: jug.length * STACK };
  return S;
}
export const activos = S => S.jug.map((p, i) => i).filter(i => !S.jug[i].fuera);
export const vivos = S => S.jug.map((p, i) => i).filter(i => !S.jug[i].fuera && !S.jug[i].fold);
export const bote = S => S.jug.reduce((s, p) => s + p.inv, 0);
export const log = (S, t) => { S.log.unshift(t); if (S.log.length > 6) S.log.length = 6; };
const sig = (S, i, f) => { const n = S.jug.length; for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (f(S.jug[j], j)) return j; } return -1; };
const redond = x => Math.round(x / 5) * 5;

export function nuevaMano(S) {
  if (S.fase !== 'fin') return false;
  S.jug.forEach(p => { if (p.stack <= 0) p.fuera = true; });
  const vivosJ = activos(S);
  if (vivosJ.length < 2) { S.fase = 'terminado'; S.turno = -1; return true; }
  S.mano++; const nivel = Math.min(Math.floor((S.mano - 1) / MANOS_POR_NIVEL), CIEGAS.length - 1); [S.sb, S.bb] = CIEGAS[nivel];
  S.boton = sig(S, S.boton, p => !p.fuera);
  S.mazo = barajar(nuevaBaraja(1)); S.tablero = []; S.resultado = null;
  for (const p of S.jug) { p.apuesta = 0; p.inv = 0; p.fold = false; p.allin = false; p.actuo = false; p.txt = ''; p.cartas = p.fuera ? [] : [S.mazo.pop(), S.mazo.pop()]; }
  const dos = vivosJ.length === 2, isb = dos ? S.boton : sig(S, S.boton, p => !p.fuera), ibb = sig(S, isb, p => !p.fuera);
  const poner = (i, m) => { const p = S.jug[i], x = Math.min(m, p.stack); p.stack -= x; p.apuesta += x; p.inv += x; if (!p.stack) p.allin = true; };
  poner(isb, S.sb); poner(ibb, S.bb); S.jug[isb].txt = `Ciega ${S.jug[isb].apuesta}`; S.jug[ibb].txt = `Ciega ${S.jug[ibb].apuesta}`;
  S.apuestaMax = S.bb; S.ultRaise = S.bb; S.fase = 'preflop';
  log(S, `Mano ${S.mano} · ciegas ${S.sb}/${S.bb}`);
  const t = sig(S, ibb, (p, j) => !p.fuera && !p.fold && !p.allin);
  if (t < 0 || vivosJ.filter(j => !S.jug[j].allin).length < 2 && S.jug[ibb].apuesta >= S.apuestaMax && S.jug.every(p => p.fuera || p.allin || p.apuesta >= S.apuestaMax)) { S.turno = -1; return cerrarRonda(S), true; }
  S.turno = t; return true;
}
export function legal(S, i) {
  const p = S.jug[i], aPagar = Math.max(0, S.apuestaMax - p.apuesta), puedePasar = aPagar === 0, llamar = Math.min(aPagar, p.stack);
  const tope = p.stack + p.apuesta, minTo = Math.min(tope, S.apuestaMax + Math.max(S.ultRaise, S.bb));
  return { pasar: puedePasar, llamar, aPagar, subir: p.stack > aPagar && vivos(S).filter(j => j !== i && !S.jug[j].allin).length > 0, minTo, maxTo: tope };
}
export function actuar(S, i, a) {
  if (S.turno !== i || !['preflop', 'flop', 'turn', 'river'].includes(S.fase)) return false;
  const p = S.jug[i], L = legal(S, i);
  if (a.t === 'fold') { p.fold = true; p.txt = 'Se retira'; log(S, `${p.nombre} se retira.`); }
  else if (a.t === 'check') { if (!L.pasar) return false; p.txt = 'Pasa'; log(S, `${p.nombre} pasa.`); }
  else if (a.t === 'call') {
    if (L.pasar) return false; const x = L.llamar; p.stack -= x; p.apuesta += x; p.inv += x; if (!p.stack) p.allin = true;
    p.txt = p.allin ? 'All-in' : 'Iguala'; log(S, `${p.nombre} ${p.allin ? 'va all-in con' : 'iguala'} ${p.apuesta}.`);
  } else if (a.t === 'raise') {
    if (!L.subir) return false;
    let to = Math.max(L.minTo, Math.min(L.maxTo, redond(a.a))); if (to >= L.maxTo || L.maxTo - to < S.bb / 2) to = L.maxTo;
    const x = to - p.apuesta; p.stack -= x; p.apuesta += x; p.inv += x; if (!p.stack) p.allin = true;
    const tam = to - S.apuestaMax; if (tam >= S.ultRaise) S.ultRaise = tam;
    const era = S.apuestaMax; S.apuestaMax = Math.max(S.apuestaMax, to);
    for (const q of S.jug) if (q !== p && !q.fuera && !q.fold && !q.allin) q.actuo = false;
    p.txt = p.allin ? 'All-in' : (era === 0 ? 'Apuesta' : 'Sube'); log(S, `${p.nombre} ${p.allin ? 'va all-in con' : era === 0 ? 'apuesta' : 'sube a'} ${to}.`);
  } else return false;
  p.actuo = true;
  const v = vivos(S);
  if (v.length === 1) return terminarSinShowdown(S, v[0]), true;
  const t = sig(S, i, (q, j) => !q.fuera && !q.fold && !q.allin && (!q.actuo || q.apuesta < S.apuestaMax));
  if (t >= 0) { S.turno = t; return true; }
  cerrarRonda(S); return true;
}
function cerrarRonda(S) {
  for (const p of S.jug) { p.apuesta = 0; p.actuo = false; if (!p.fold && !p.fuera && !p.allin) p.txt = ''; }
  S.apuestaMax = 0; S.ultRaise = S.bb;
  if (S.fase === 'river') return showdown(S);
  if (S.fase === 'preflop') { S.tablero.push(S.mazo.pop(), S.mazo.pop(), S.mazo.pop()); S.fase = 'flop'; }
  else if (S.fase === 'flop') { S.tablero.push(S.mazo.pop()); S.fase = 'turn'; }
  else if (S.fase === 'turn') { S.tablero.push(S.mazo.pop()); S.fase = 'river'; }
  const pueden = vivos(S).filter(j => !S.jug[j].allin);
  if (pueden.length < 2) return cerrarRonda(S);                                   // nadie puede apostar más: se reparten las cartas que faltan
  S.turno = sig(S, S.boton, (p, j) => !p.fuera && !p.fold && !p.allin);
}
export function botes(S) {
  const rest = S.jug.map(p => p.inv), out = [];
  for (;;) {
    const el = S.jug.map((p, i) => i).filter(i => !S.jug[i].fold && !S.jug[i].fuera && rest[i] > 0); if (!el.length) break;
    const m = Math.min(...el.map(i => rest[i])); let monto = 0;
    for (let i = 0; i < rest.length; i++) { const t = Math.min(rest[i], m); monto += t; rest[i] -= t; }
    out.push({ monto, el });
  }
  return out;
}
function repartirBotes(S, valores) {
  const ganado = S.jug.map(() => 0), orden = []; for (let k = 1; k <= S.jug.length; k++) orden.push((S.boton + k) % S.jug.length);
  for (const b of botes(S)) {
    let mejor = -1; for (const i of b.el) mejor = Math.max(mejor, valores ? valores[i] : 0);
    const gan = b.el.filter(i => !valores || valores[i] === mejor), parte = Math.floor(b.monto / gan.length); let resto = b.monto - parte * gan.length;
    gan.forEach(i => { ganado[i] += parte; }); for (const i of orden) { if (resto > 0 && gan.includes(i)) { ganado[i]++; resto--; } }
  }
  return ganado;
}
function terminarSinShowdown(S, g) {
  const ganado = repartirBotes(S, null);
  S.jug.forEach((p, i) => { p.stack += ganado[i]; p.apuesta = 0; });
  S.resultado = { ganadores: [{ i: g, monto: ganado[g], mano: '' }], showdown: false, texto: `${S.jug[g].nombre} gana ${ganado[g]} (todos se retiran)` };
  log(S, S.resultado.texto); S.fase = 'fin'; S.turno = -1;
}
function showdown(S) {
  const valores = S.jug.map(p => (p.fold || p.fuera ? -1 : valorMano(p.cartas.concat(S.tablero)))), ganado = repartirBotes(S, valores);
  S.jug.forEach((p, i) => { p.stack += ganado[i]; p.apuesta = 0; });
  const gan = S.jug.map((p, i) => i).filter(i => ganado[i] > 0).map(i => ({ i, monto: ganado[i], mano: nombreMano(valores[i]) }));
  S.resultado = { ganadores: gan, showdown: true, valores, texto: gan.map(g => `${S.jug[g.i].nombre} gana ${g.monto} con ${g.mano}`).join(' · ') };
  log(S, S.resultado.texto); S.fase = 'fin'; S.turno = -1;
}
export function evaluarFin(S) {                // ¿terminó el torneo? (devuelve 'victoria' | 'derrota' | null)
  if (S.fase !== 'fin') return null;
  const quedan = S.jug.filter(p => p.stack > 0);
  if (S.jug[0].stack <= 0) return 'derrota';
  if (quedan.length === 1 && quedan[0] === S.jug[0]) return 'victoria';
  return null;
}

/* ---------- bots ---------- */
export function decidir(S, i) {
  const p = S.jug[i], L = legal(S, i), perf = PERFILES[p.perfil], riv = vivos(S).filter(j => j !== i).length, calle = S.tablero.length, B = bote(S);
  const eq = Math.max(0, Math.min(1, equidad(p.cartas, S.tablero, riv, SIMS[S.nivel] || 280) + (Math.random() - .5) * .06)), fair = 1 / (riv + 1);
  const aleatorio = S.nivel === 'facil' && Math.random() < .12;
  const subirA = (frac) => ({ t: 'raise', a: S.apuestaMax + Math.max(S.ultRaise, redond(B * frac)) });
  if (L.pasar) {
    if (aleatorio) return Math.random() < .5 ? { t: 'check' } : (L.subir ? subirA(.5) : { t: 'check' });
    const fuerte = eq > Math.min(.74, fair * 1.9 - perf.tight * .3);
    if (L.subir && fuerte && Math.random() < .78 * perf.agr) return subirA(.5 + Math.random() * .35);
    if (L.subir && riv <= 2 && Math.random() < perf.farol * (calle >= 3 ? 1 : .5)) return subirA(.4 + Math.random() * .2);
    return { t: 'check' };
  }
  const odds = L.aPagar / (B + L.aPagar), req = odds * (calle === 0 ? .72 : 1) + perf.tight;
  if (aleatorio) return Math.random() < .4 ? { t: 'fold' } : { t: 'call' };
  if (L.subir && eq > req + .2 && eq > fair * 1.7 && Math.random() < .6 * perf.agr) return subirA(.6 + Math.random() * .4);
  if (eq > req) { if (L.aPagar > p.stack * .6 && eq < Math.max(.42, fair * 1.5)) return { t: 'fold' }; return { t: 'call' }; }
  if (L.subir && riv <= 2 && L.aPagar < B * .8 && Math.random() < perf.farol * .3) return subirA(.7);
  return { t: 'fold' };
}

/* ---------- validación del estado guardado ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.jug) || d.jug.length < 3 || d.jug.length > 6) return null;
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, carta = v => ent(v, 0, 51);
  const jug = [];
  for (const p of d.jug) {
    if (!p || typeof p.nombre !== 'string' || !ent(p.stack, 0, 1e7) || !ent(p.apuesta, 0, 1e7) || !ent(p.inv, 0, 1e7) || !Array.isArray(p.cartas) || p.cartas.length > 2 || !p.cartas.every(carta) || !Object.hasOwn(PERFILES, p.perfil)) return null;
    jug.push({ nombre: p.nombre.slice(0, 14), bot: !!p.bot, perfil: p.perfil, stack: p.stack, cartas: p.cartas.slice(), apuesta: p.apuesta, inv: p.inv, fold: !!p.fold, allin: !!p.allin, fuera: !!p.fuera, actuo: !!p.actuo, txt: typeof p.txt === 'string' ? p.txt.slice(0, 20) : '' });
  }
  if (!Array.isArray(d.mazo) || !d.mazo.every(carta) || d.mazo.length > 52 || !Array.isArray(d.tablero) || d.tablero.length > 5 || !d.tablero.every(carta)) return null;
  if (!['preflop', 'flop', 'turn', 'river', 'fin', 'terminado'].includes(d.fase) || !Object.hasOwn(SIMS, d.nivel) || !ent(d.boton, 0, jug.length - 1) || !ent(d.turno, -1, jug.length - 1)) return null;
  if (new Set([...d.mazo, ...d.tablero, ...jug.flatMap(p => p.cartas)]).size !== d.mazo.length + d.tablero.length + jug.reduce((s, p) => s + p.cartas.length, 0)) return null;
  const res = d.resultado && typeof d.resultado === 'object' && Array.isArray(d.resultado.ganadores) && typeof d.resultado.texto === 'string'
    ? { ganadores: d.resultado.ganadores.filter(g => g && ent(g.i, 0, jug.length - 1) && ent(g.monto, 0, 1e7)).map(g => ({ i: g.i, monto: g.monto, mano: String(g.mano || '').slice(0, 40) })), showdown: !!d.resultado.showdown, valores: Array.isArray(d.resultado.valores) ? d.resultado.valores.filter(Number.isFinite) : undefined, texto: d.resultado.texto.slice(0, 200) } : null;
  return { jug, nivel: d.nivel, boton: d.boton, mano: ent(d.mano, 0, 1e5) ? d.mano : 0, mazo: d.mazo.slice(), tablero: d.tablero.slice(), fase: d.fase, turno: d.turno, apuestaMax: ent(d.apuestaMax, 0, 1e7) ? d.apuestaMax : 0, ultRaise: ent(d.ultRaise, 0, 1e7) ? d.ultRaise : 0,
    resultado: res, log: Array.isArray(d.log) ? d.log.filter(x => typeof x === 'string').slice(0, 6).map(x => x.slice(0, 120)) : [], reg: !!d.reg, sb: ent(d.sb, 0, 1e6) ? d.sb : 10, bb: ent(d.bb, 0, 1e6) ? d.bb : 20, total: ent(d.total, 0, 1e8) ? d.total : jug.length * STACK };
}
