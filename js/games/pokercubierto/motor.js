// Motor del Póker cubierto (de descarte, 5 cartas) contra bots. Sin DOM, probable con Node.
// Mano: todos ponen la entrada (ante) → 5 cartas tapadas → apuestas → descarte (hasta 3 cartas, o 4 si te quedas con un as)
// → apuestas → se enseñan las cartas. Sin límite, con all-in y botes secundarios. Opción «jotas o mejor»: solo puede abrir
// (hacer la primera apuesta) quien tenga pareja de jotas o algo mejor; si nadie abre, se vuelve a repartir y el bote sigue.
// Reutiliza el evaluador de manos y los perfiles de bots del Texas Hold'em.
import { nuevaBaraja, barajar, rangoDe, paloDe } from '../../core/cartas.js';
import { valorMano, nombreMano, PERFILES, NOMBRES_BOT, STACK } from '../holdem/motor.js';
export { valorMano, nombreMano, STACK };

export const ANTES = [5, 10, 15, 20, 30, 40, 60, 80, 100, 150];   // torneo: la entrada sube cada MANOS_POR_NIVEL manos
export const MANOS_POR_NIVEL = 6;
export const ANTE_LIBRE = { baja: 5, media: 10, alta: 25 };
export const APERTURA = { libre: 'Libre', jotas: 'Jotas o mejor' };
const SIMS = { facil: 120, medio: 300, dificil: 650 };
const FASES_APUESTA = ['apuesta1', 'apuesta2'];
const P15 = 15 ** 5, categoria = v => Math.floor(v / P15), alta = v => Math.floor(v / 15 ** 4) % 15;
const rv = c => { const r = rangoDe(c); return r === 0 ? 14 : r + 1; };      // 2..14 (el as vale 14)
export const puedeAbrir = cartas => { const v = valorMano(cartas); return categoria(v) >= 2 || (categoria(v) === 1 && alta(v) >= 11); };
export const maxDescarte = cartas => (cartas.some(c => rv(c) === 14) ? 4 : 3);   // 4 si se queda con un as (lo comprueba descartar)

/* ---------- estado ---------- */
export function crear(nBots, nivel = 'medio', nombre = 'Tú', modo = 'torneo', ante = 'baja', apertura = 'libre') {
  const perfiles = Object.keys(PERFILES).sort(() => Math.random() - .5);
  const jug = [{ nombre, bot: false, perfil: 'equilibrado' }];
  for (let i = 0; i < nBots; i++) jug.push({ nombre: NOMBRES_BOT[i], bot: true, perfil: perfiles[i % perfiles.length] });
  return { jug: jug.map(j => ({ ...j, stack: STACK, cartas: [], apuesta: 0, inv: 0, fold: false, allin: false, fuera: false, actuo: false, cambio: -1, txt: '' })),
    nivel, boton: Math.floor(Math.random() * jug.length), mano: 0, mazo: [], pila: [], fase: 'fin', turno: -1, apuestaMax: 0, ultRaise: 0, minimo: 10, ante: 5,
    abierta: false, repartos: 0, resultado: null, log: [], reg: false, modo: modo === 'libre' ? 'libre' : 'torneo', anteLibre: ANTE_LIBRE[ante] ? ante : 'baja',
    apertura: APERTURA[apertura] ? apertura : 'libre', compras: jug.map(() => 1) };
}
export const activos = S => S.jug.map((p, i) => i).filter(i => !S.jug[i].fuera);
export const vivos = S => S.jug.map((p, i) => i).filter(i => !S.jug[i].fuera && !S.jug[i].fold);
export const bote = S => S.jug.reduce((s, p) => s + p.inv, 0);
export const neto = (S, i = 0) => S.jug[i].stack - S.compras[i] * STACK;
export const log = (S, t) => { S.log.unshift(t); if (S.log.length > 6) S.log.length = 6; };
const sig = (S, i, f) => { const n = S.jug.length; for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (f(S.jug[j], j)) return j; } return -1; };
const redond = x => Math.round(x / 5) * 5;
function robar(S) { if (!S.mazo.length) { S.mazo = barajar(S.pila); S.pila = []; } return S.mazo.pop(); }   // si se acaba, se barajan los descartes

export function nuevaMano(S) {
  if (S.fase !== 'fin') return false;
  if (S.modo === 'libre') S.jug.forEach((p, i) => { if (p.stack <= 0) { p.stack = STACK; S.compras[i]++; log(S, `${p.nombre} recompra ${STACK} fichas.`); } });
  else S.jug.forEach(p => { if (p.stack <= 0) p.fuera = true; });
  if (activos(S).length < 2) { S.fase = 'terminado'; S.turno = -1; return true; }
  S.mano++; S.repartos = 0;
  S.ante = S.modo === 'libre' ? ANTE_LIBRE[S.anteLibre] : ANTES[Math.min(Math.floor((S.mano - 1) / MANOS_POR_NIVEL), ANTES.length - 1)];
  S.minimo = S.ante * 2; S.boton = sig(S, S.boton, p => !p.fuera); S.resultado = null;
  for (const p of S.jug) { p.inv = 0; p.fold = false; p.allin = false; p.txt = ''; }
  for (const p of S.jug) if (!p.fuera) { const x = Math.min(S.ante, p.stack); p.stack -= x; p.inv += x; if (!p.stack) p.allin = true; }
  log(S, `Mano ${S.mano} · entrada ${S.ante}${S.apertura === 'jotas' ? ' · abre con jotas o mejor' : ''}`);
  repartir(S); return true;
}
function repartir(S) {
  S.mazo = barajar(nuevaBaraja(1)); S.pila = []; S.repartos++;
  for (const p of S.jug) { p.apuesta = 0; p.actuo = false; p.cambio = -1; p.cartas = p.fuera ? [] : [robar(S), robar(S), robar(S), robar(S), robar(S)]; if (!p.fold && !p.fuera && !p.allin) p.txt = ''; }
  S.fase = 'apuesta1'; S.apuestaMax = 0; S.ultRaise = S.minimo; S.abierta = false;
  empezarApuestas(S);
}
function empezarApuestas(S) {
  const pueden = vivos(S).filter(j => !S.jug[j].allin);
  if (pueden.length < 2 && S.jug.every(p => p.fuera || p.fold || p.allin || p.apuesta >= S.apuestaMax)) { S.turno = -1; return cerrarRonda(S); }
  S.turno = sig(S, S.boton, p => !p.fuera && !p.fold && !p.allin);
}

/* ---------- apuestas ---------- */
export function legal(S, i) {
  const p = S.jug[i], aPagar = Math.max(0, S.apuestaMax - p.apuesta), puedePasar = aPagar === 0, llamar = Math.min(aPagar, p.stack);
  const tope = p.stack + p.apuesta, minTo = Math.min(tope, S.apuestaMax + Math.max(S.ultRaise, S.minimo));
  const cerrada = S.fase === 'apuesta1' && S.apertura === 'jotas' && !S.abierta && !puedeAbrir(p.cartas);   // jotas o mejor: no puede abrir
  return { pasar: puedePasar, llamar, aPagar, subir: !cerrada && p.stack > aPagar && vivos(S).filter(j => j !== i && !S.jug[j].allin).length > 0, minTo, maxTo: tope, cerrada };
}
export function actuar(S, i, a) {
  if (S.turno !== i || !FASES_APUESTA.includes(S.fase)) return false;
  const p = S.jug[i], L = legal(S, i);
  if (a.t === 'fold') { p.fold = true; p.txt = 'Se retira'; log(S, `${p.nombre} se retira.`); S.pila.push(...p.cartas); p.cartas = []; }   // sus cartas van a los descartes
  else if (a.t === 'check') { if (!L.pasar) return false; p.txt = 'Pasa'; log(S, `${p.nombre} pasa.`); }
  else if (a.t === 'call') {
    if (L.pasar) return false; const x = L.llamar; p.stack -= x; p.apuesta += x; p.inv += x; if (!p.stack) p.allin = true;
    p.txt = p.allin ? 'All-in' : 'Iguala'; log(S, `${p.nombre} ${p.allin ? 'va all-in con' : 'iguala'} ${p.apuesta}.`);
  } else if (a.t === 'raise') {
    if (!L.subir) return false;
    let to = Math.max(L.minTo, Math.min(L.maxTo, redond(a.a))); if (to >= L.maxTo || L.maxTo - to < S.minimo / 2) to = L.maxTo;
    const x = to - p.apuesta; p.stack -= x; p.apuesta += x; p.inv += x; if (!p.stack) p.allin = true;
    const tam = to - S.apuestaMax; if (tam >= S.ultRaise) S.ultRaise = tam;
    const era = S.apuestaMax; S.apuestaMax = Math.max(S.apuestaMax, to); S.abierta = true;
    for (const q of S.jug) if (q !== p && !q.fuera && !q.fold && !q.allin) q.actuo = false;
    p.txt = p.allin ? 'All-in' : (era === 0 ? (S.fase === 'apuesta1' ? 'Abre' : 'Apuesta') : 'Sube');
    log(S, `${p.nombre} ${p.allin ? 'va all-in con' : era === 0 ? (S.fase === 'apuesta1' ? 'abre con' : 'apuesta') : 'sube a'} ${to}.`);
  } else return false;
  p.actuo = true;
  const v = vivos(S);
  if (v.length === 1) return terminarSinShowdown(S, v[0]), true;
  const t = sig(S, i, q => !q.fuera && !q.fold && !q.allin && (!q.actuo || q.apuesta < S.apuestaMax));
  if (t >= 0) { S.turno = t; return true; }
  cerrarRonda(S); return true;
}
function cerrarRonda(S) {
  for (const p of S.jug) { p.apuesta = 0; p.actuo = false; if (!p.fold && !p.fuera && !p.allin) p.txt = ''; }
  if (S.fase === 'apuesta1' && S.apertura === 'jotas' && !S.abierta && S.repartos < 6) {          // nadie ha abierto
    log(S, 'Nadie abre: se vuelven a repartir las cartas (el bote se queda).');
    for (const p of S.jug) p.txt = '';
    return repartir(S);
  }
  S.apuestaMax = 0; S.ultRaise = S.minimo;
  if (S.fase === 'apuesta2') return showdown(S);
  S.fase = 'descarte';
  S.turno = sig(S, S.boton, p => !p.fuera && !p.fold);       // también descartan los que están all-in
}

/* ---------- descarte ---------- */
// idx: posiciones (0-4) de las cartas que se cambian. Máximo 3, o 4 si la carta que te quedas es un as.
export function descarteValido(cartas, idx) {
  if (!Array.isArray(idx) || new Set(idx).size !== idx.length || !idx.every(k => Number.isInteger(k) && k >= 0 && k < cartas.length)) return false;
  if (idx.length <= 3) return true;
  if (idx.length > 4) return false;
  return cartas.some((c, k) => !idx.includes(k) && rv(c) === 14);
}
export function descartar(S, i, idx) {
  if (S.fase !== 'descarte' || S.turno !== i) return false;
  const p = S.jug[i]; if (!descarteValido(p.cartas, idx)) return false;
  const orden = idx.slice().sort((a, b) => b - a);
  for (const k of orden) S.pila.push(p.cartas[k]);
  const quedan = p.cartas.filter((_, k) => !idx.includes(k));
  p.cartas = quedan.concat(idx.map(() => robar(S)));
  p.cambio = idx.length; p.txt = idx.length ? `Cambia ${idx.length}` : 'Servido';
  log(S, `${p.nombre} ${idx.length ? `cambia ${idx.length} carta${idx.length > 1 ? 's' : ''}` : 'está servido'}.`);
  const t = sig(S, i, q => !q.fuera && !q.fold && q.cambio < 0);
  if (t >= 0) { S.turno = t; return true; }
  S.fase = 'apuesta2'; S.apuestaMax = 0; S.ultRaise = S.minimo;
  for (const q of S.jug) if (!q.fold && !q.fuera && !q.allin) q.actuo = false;
  empezarApuestas(S); return true;
}
// Estrategia de descarte (la usan los bots y el 💡 consejo): quédate con lo que ya liga y busca color o escalera
export function sugerirDescarte(cartas) {
  const v = valorMano(cartas), cat = categoria(v), r = cartas.map(rv), cnt = {};
  r.forEach(x => { cnt[x] = (cnt[x] || 0) + 1; });
  const fuera = k => cartas.map((_, j) => j).filter(j => !k.includes(j));
  if (cat >= 4 && cat !== 7) return [];                                                  // escalera, color, full: servido
  if (cat === 7 || cat === 3 || cat === 2 || cat === 1) {                               // póker, trío, dobles, pareja: guarda lo que repite
    const guardar = cartas.map((_, j) => j).filter(j => cnt[r[j]] >= 2);
    if (cat === 7) return [];
    return fuera(guardar);
  }
  const palos = [0, 0, 0, 0]; cartas.forEach(c => palos[paloDe(c)]++);
  const pc = palos.findIndex(x => x === 4);
  if (pc >= 0) return cartas.map((c, j) => j).filter(j => paloDe(cartas[j]) !== pc);    // proyecto de color
  const orden = cartas.map((_, j) => j).sort((a, b) => r[a] - r[b]);
  for (const quitar of orden) {                                                          // proyecto de escalera abierta (4 seguidas)
    const resto = orden.filter(j => j !== quitar).map(j => r[j]).sort((a, b) => a - b);
    if (resto[3] - resto[0] === 3 && new Set(resto).size === 4 && resto[3] < 14 && resto[0] > 2) return [quitar];
  }
  const altas = orden.slice().reverse().filter(j => r[j] >= 11).slice(0, 2);              // si no, guarda las figuras (o el as)
  const guardar = altas.length ? altas : [orden[4]];
  let d = fuera(guardar);
  if (!descarteValido(cartas, d)) d = fuera([orden[4], orden[3]]);
  return d;
}

/* ---------- botes y final ---------- */
export function botes(S) {
  const rest = S.jug.map(p => p.inv), out = [];
  for (;;) {
    const el = S.jug.map((p, i) => i).filter(i => !S.jug[i].fold && !S.jug[i].fuera && rest[i] > 0); if (!el.length) break;
    const m = Math.min(...el.map(i => rest[i])); let monto = 0;
    for (let i = 0; i < rest.length; i++) { const t = Math.min(rest[i], m); monto += t; rest[i] -= t; }
    out.push({ monto, el });
  }
  out.devolver = rest; return out;
}
function repartirBotes(S, valores) {
  const ganado = S.jug.map(() => 0), orden = []; for (let k = 1; k <= S.jug.length; k++) orden.push((S.boton + k) % S.jug.length);
  const lista = botes(S); lista.devolver.forEach((x, i) => { ganado[i] += x; });
  for (const b of lista) {
    let mejor = -1; for (const i of b.el) mejor = Math.max(mejor, valores ? valores[i] : 0);
    const gan = b.el.filter(i => !valores || valores[i] === mejor), parte = Math.floor(b.monto / gan.length); let resto = b.monto - parte * gan.length;
    gan.forEach(i => { ganado[i] += parte; }); for (const i of orden) { if (resto > 0 && gan.includes(i)) { ganado[i]++; resto--; } }
  }
  return ganado;
}
function terminarSinShowdown(S, g) {
  const dev = botes(S).devolver, ganado = repartirBotes(S, null);
  S.jug.forEach((p, i) => { p.stack += ganado[i]; p.apuesta = 0; });
  const n = ganado[g] - dev[g];
  S.resultado = { ganadores: [{ i: g, monto: n, mano: '' }], showdown: false, texto: `${S.jug[g].nombre} gana ${n} (todos se retiran)` };
  log(S, S.resultado.texto); S.fase = 'fin'; S.turno = -1;
}
function showdown(S) {
  const dev = botes(S).devolver, valores = S.jug.map(p => (p.fold || p.fuera ? -1 : valorMano(p.cartas))), ganado = repartirBotes(S, valores).map((x, i) => x - dev[i]);
  S.jug.forEach((p, i) => { p.stack += dev[i] + ganado[i]; p.apuesta = 0; });
  const gan = S.jug.map((p, i) => i).filter(i => ganado[i] > 0).map(i => ({ i, monto: ganado[i], mano: nombreMano(valores[i]) }));
  S.resultado = { ganadores: gan, showdown: true, valores, texto: gan.map(g => `${S.jug[g.i].nombre} gana ${g.monto} con ${g.mano}`).join(' · ') };
  log(S, S.resultado.texto); S.fase = 'fin'; S.turno = -1;
}
export function evaluarFin(S) {
  if (S.fase !== 'fin' || S.modo === 'libre') return null;
  const quedan = S.jug.filter(p => p.stack > 0);
  if (S.jug[0].stack <= 0) return 'derrota';
  if (quedan.length === 1 && quedan[0] === S.jug[0]) return 'victoria';
  return null;
}

/* ---------- bots ---------- */
// Probabilidad de ganar por simulación. Antes del descarte se simula también el cambio de cartas (el propio y el de los
// rivales); después, los rivales que se han servido (0 cartas) se suponen con al menos doble pareja.
export function equidad(cartas, S, i, sims) {
  const rivales = vivos(S).filter(j => j !== i), antes = S.fase === 'apuesta1' || (S.fase === 'descarte' && S.jug[i].cambio < 0);
  const conocidas = new Set(cartas), base = []; for (let c = 0; c < 52; c++) if (!conocidas.has(c)) base.push(c);
  let total = 0;
  for (let s = 0; s < sims; s++) {
    const m = barajar(base.slice()); let k = 0; const toma = () => m[k++];
    let mia = cartas;
    if (antes) { const d = sugerirDescarte(cartas); mia = cartas.filter((_, j) => !d.includes(j)).concat(d.map(toma)); }
    const vm = valorMano(mia); let emp = 1, perdi = false;
    for (const j of rivales) {
      let h = [toma(), toma(), toma(), toma(), toma()];
      if (antes) { const d = sugerirDescarte(h); h = h.filter((_, x) => !d.includes(x)).concat(d.map(toma)); }
      else if (S.jug[j].cambio === 0) for (let t = 0; t < 25 && categoria(valorMano(h)) < 2; t++) h = [toma(), toma(), toma(), toma(), toma()].map(c => c ?? m[(k++) % m.length]);
      if (k > m.length - 10) k = 0;
      const vr = valorMano(h.map(c => c ?? m[0]));
      if (vr > vm) { perdi = true; break; } if (vr === vm) emp++;
    }
    if (!perdi) total += 1 / emp;
  }
  return total / sims;
}
export function decidir(S, i) {
  const p = S.jug[i], L = legal(S, i), perf = PERFILES[p.perfil], riv = vivos(S).filter(j => j !== i).length, B = bote(S);
  const eq = Math.max(0, Math.min(1, equidad(p.cartas, S, i, SIMS[S.nivel] || 300) + (Math.random() - .5) * .06)), fair = 1 / (riv + 1);
  const aleatorio = S.nivel === 'facil' && Math.random() < .12, segunda = S.fase === 'apuesta2';
  const subirA = frac => ({ t: 'raise', a: S.apuestaMax + Math.max(S.ultRaise, redond(B * frac)) });
  if (L.pasar) {
    if (aleatorio) return Math.random() < .5 || !L.subir ? { t: 'check' } : subirA(.5);
    const fuerte = eq > Math.min(.74, fair * 1.9 - perf.tight * .3);
    if (L.subir && fuerte && Math.random() < .78 * perf.agr) return subirA(.5 + Math.random() * .35);
    if (L.subir && riv <= 2 && Math.random() < perf.farol * (segunda ? 1 : .5)) return subirA(.4 + Math.random() * .2);
    return { t: 'check' };
  }
  const odds = L.aPagar / (B + L.aPagar), req = odds * (segunda ? 1 : .8) + perf.tight;
  if (aleatorio) return Math.random() < .4 ? { t: 'fold' } : { t: 'call' };
  if (L.subir && eq > req + .2 && eq > fair * 1.7 && Math.random() < .6 * perf.agr) return subirA(.6 + Math.random() * .4);
  if (eq > req) { if (L.aPagar > p.stack * .6 && eq < Math.max(.42, fair * 1.5)) return { t: 'fold' }; return { t: 'call' }; }
  if (L.subir && riv <= 2 && L.aPagar < B * .8 && Math.random() < perf.farol * .3) return subirA(.7);
  return { t: 'fold' };
}
// Descarte de los bots: la estrategia de siempre; en Fácil a veces se equivocan (cambian una carta de más o de menos)
export function descarteBot(S, i) {
  const p = S.jug[i]; let d = sugerirDescarte(p.cartas);
  if (S.nivel === 'facil' && Math.random() < .2) { const extra = [0, 1, 2, 3, 4].find(k => !d.includes(k)); if (extra !== undefined && descarteValido(p.cartas, [...d, extra])) d = [...d, extra]; }
  if (p.perfil === 'farolero' && d.length === 1 && Math.random() < .25) d = [];      // a veces se sirve para fingir una buena mano
  return d;
}

/* ---------- validación del estado guardado ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.jug) || d.jug.length < 2 || d.jug.length > 6) return null;
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, carta = v => ent(v, 0, 51);
  const jug = [];
  for (const p of d.jug) {
    if (!p || typeof p.nombre !== 'string' || !ent(p.stack, 0, 1e7) || !ent(p.apuesta, 0, 1e7) || !ent(p.inv, 0, 1e7) || !Array.isArray(p.cartas) || p.cartas.length > 5 || !p.cartas.every(carta) || !Object.hasOwn(PERFILES, p.perfil) || !ent(p.cambio, -1, 4)) return null;
    jug.push({ nombre: p.nombre.slice(0, 14), bot: !!p.bot, perfil: p.perfil, stack: p.stack, cartas: p.cartas.slice(), apuesta: p.apuesta, inv: p.inv, fold: !!p.fold, allin: !!p.allin, fuera: !!p.fuera, actuo: !!p.actuo, cambio: p.cambio, txt: typeof p.txt === 'string' ? p.txt.slice(0, 20) : '' });
  }
  if (!Array.isArray(d.mazo) || !d.mazo.every(carta) || !Array.isArray(d.pila) || !d.pila.every(carta)) return null;
  if (!['apuesta1', 'descarte', 'apuesta2', 'fin', 'terminado'].includes(d.fase) || !Object.hasOwn(SIMS, d.nivel) || !ent(d.boton, 0, jug.length - 1) || !ent(d.turno, -1, jug.length - 1)) return null;
  const todas = [...d.mazo, ...d.pila, ...jug.flatMap(p => p.cartas)];
  if (new Set(todas).size !== todas.length) return null;
  const res = d.resultado && typeof d.resultado === 'object' && Array.isArray(d.resultado.ganadores) && typeof d.resultado.texto === 'string'
    ? { ganadores: d.resultado.ganadores.filter(g => g && ent(g.i, 0, jug.length - 1) && ent(g.monto, 0, 1e7)).map(g => ({ i: g.i, monto: g.monto, mano: String(g.mano || '').slice(0, 40) })), showdown: !!d.resultado.showdown, valores: Array.isArray(d.resultado.valores) ? d.resultado.valores.filter(Number.isFinite) : undefined, texto: d.resultado.texto.slice(0, 200) } : null;
  return { jug, nivel: d.nivel, boton: d.boton, mano: ent(d.mano, 0, 1e5) ? d.mano : 0, mazo: d.mazo.slice(), pila: d.pila.slice(), fase: d.fase, turno: d.turno,
    apuestaMax: ent(d.apuestaMax, 0, 1e7) ? d.apuestaMax : 0, ultRaise: ent(d.ultRaise, 0, 1e7) ? d.ultRaise : 0, minimo: ent(d.minimo, 1, 1e6) ? d.minimo : 10, ante: ent(d.ante, 1, 1e6) ? d.ante : 5,
    abierta: !!d.abierta, repartos: ent(d.repartos, 0, 100) ? d.repartos : 1, resultado: res, log: Array.isArray(d.log) ? d.log.filter(x => typeof x === 'string').slice(0, 6).map(x => x.slice(0, 120)) : [], reg: !!d.reg,
    modo: d.modo === 'libre' ? 'libre' : 'torneo', anteLibre: ANTE_LIBRE[d.anteLibre] ? d.anteLibre : 'baja', apertura: APERTURA[d.apertura] ? d.apertura : 'libre',
    compras: Array.isArray(d.compras) && d.compras.length === jug.length && d.compras.every(v => ent(v, 1, 1e5)) ? d.compras.slice() : jug.map(() => 1),
    cuenta: ent(d.cuenta, 0, 1e5) ? d.cuenta : 0, mio: d.mio && typeof d.mio === 'object' ? { vpip: !!d.mio.vpip } : { vpip: false } };
}
