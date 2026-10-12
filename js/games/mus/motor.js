// Motor del Mus (sin DOM, probable con Node). Baraja española de 40 cartas, 4 jugadores en 2 parejas.
// Asientos: 0 tú (abajo), 1 rival de la derecha, 2 tu compañero (enfrente), 3 rival de la izquierda. Pareja = asiento % 2.
// Se habla y se reparte en el orden 0 → 1 → 2 → 3. «Mano» es quien habla primero y gana los empates.
// Carta id = palo * 10 + posición (0..9 = 1,2,3,4,5,6,7,sota,caballo,rey), como en core/cartas.js.
// Con 8 reyes, los treses son reyes y los doses son ases.
// Fases: mus (cada uno dice mus / no hay mus) → descarte (si los 4 quieren mus) → lances: Grande, Chica, Pares y Juego (o Punto) → recuento.
import { shuffle } from '../../core/dom.js';

export const NIVEL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
export const METAS = [30, 40], JUEGOS = [1, 2], REYES = [8, 4];
export const LANCES = ['Grande', 'Chica', 'Pares', 'Juego'];
export const pareja = s => s % 2;
const pos = id => id % 10;

/* ---------- valor de las cartas ---------- */
export function fuerza(id, reyes) { const p = pos(id); if (reyes === 8) { if (p === 2) return 9; if (p === 1) return 0; } return p; }   // 0 as … 9 rey
export function valorJ(id, reyes) { const f = fuerza(id, reyes); return f >= 7 ? 10 : f + 1; }
const ordenados = (h, r, asc) => h.map(c => fuerza(c, r)).sort((a, b) => (asc ? a - b : b - a));
const lex = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
export const cmpGrande = (a, b, r) => lex(ordenados(a, r, false), ordenados(b, r, false));
export const cmpChica = (a, b, r) => -lex(ordenados(a, r, true), ordenados(b, r, true));
export function pares(h, r) {                       // { tipo: 0 nada · 1 par · 2 medias · 3 duples, clave: [...] }
  const n = {}; h.forEach(c => { const f = fuerza(c, r); n[f] = (n[f] || 0) + 1; });
  const g = Object.entries(n).map(([f, k]) => [+f, k]).filter(([, k]) => k >= 2).sort((x, y) => y[1] - x[1] || y[0] - x[0]);
  if (!g.length) return { tipo: 0, clave: [] };
  if (g[0][1] === 4) return { tipo: 3, clave: [g[0][0], g[0][0]] };
  if (g.length === 2) return { tipo: 3, clave: [Math.max(g[0][0], g[1][0]), Math.min(g[0][0], g[1][0])] };
  if (g[0][1] === 3) return { tipo: 2, clave: [g[0][0]] };
  return { tipo: 1, clave: [g[0][0]] };
}
export const cmpPares = (a, b, r) => { const x = pares(a, r), y = pares(b, r); return x.tipo - y.tipo || lex(x.clave, y.clave); };
export const suma = (h, r) => h.reduce((s, c) => s + valorJ(c, r), 0);
const ORDEN_J = [31, 32, 40, 37, 36, 35, 34, 33];
const rangoJ = s => (s >= 31 ? 8 - ORDEN_J.indexOf(s) : 0);
export const cmpJuego = (a, b, r) => rangoJ(suma(a, r)) - rangoJ(suma(b, r));
export const cmpPunto = (a, b, r) => suma(a, r) - suma(b, r);
export const tienePares = (h, r) => pares(h, r).tipo > 0;
export const tieneJuego = (h, r) => suma(h, r) >= 31;
export const bonoPares = (h, r) => [0, 1, 2, 3][pares(h, r).tipo];
export const bonoJuego = (h, r) => (suma(h, r) === 31 ? 3 : 2);
export const nombrePares = (h, r) => ['sin pares', 'par', 'medias', 'duples'][pares(h, r).tipo];
const CMP = [cmpGrande, cmpChica, cmpPares, cmpJuego];
const cmpDe = (S, L) => (L === 3 && S.punto ? cmpPunto : CMP[L]);

/* ---------- partida ---------- */
const orden = S => [0, 1, 2, 3].map(k => (S.mano + k) % 4);
const log = (S, t) => { S.log.unshift(t); if (S.log.length > 8) S.log.length = 8; };
export const NOMBRES = ['Tú', 'Rival dcha.', 'Compañero', 'Rival izda.'];
export function crear({ nivel = 'medio', meta = 40, juegos = 1, reyes = 8 } = {}) {
  const S = { nivel: NIVEL[nivel] ? nivel : 'medio', meta: METAS.includes(meta) ? meta : 40, juegosMeta: JUEGOS.includes(juegos) ? juegos : 1, reyes: REYES.includes(reyes) ? reyes : 8,
    pts: [0, 0], juegos: [0, 0], mano: 3, nMano: 0, manos: [], mazo: [], descartes: [], fase: 'mus', turno: 0, musDichos: 0, descSel: [null, null, null, null],
    lance: 0, punto: false, decl: { pares: [false, false, false, false], juego: [false, false, false, false] }, apuestas: [], B: null, cobros: [], recuento: null, ganador: -1, log: [] };
  repartir(S); return S;
}
export function repartir(S) {
  S.mano = (S.mano + 1) % 4; S.nMano++;
  const m = shuffle(Array.from({ length: 40 }, (_, i) => i));
  S.manos = [0, 1, 2, 3].map(() => m.splice(0, 4)); S.mazo = m; S.descartes = [];
  S.fase = 'mus'; S.turno = S.mano; S.musDichos = 0; S.descSel = [null, null, null, null];
  S.lance = 0; S.punto = false; S.decl = { pares: [false, false, false, false], juego: [false, false, false, false] };
  S.apuestas = [null, null, null, null]; S.B = null; S.cobros = []; S.recuento = null;
  log(S, `Mano ${S.nMano}: es mano ${NOMBRES[S.mano].toLowerCase()}.`);
}

/* ---------- mus y descarte ---------- */
export function decirMus(S, s, quiere) {
  if (S.fase !== 'mus' || S.turno !== s) return false;
  if (!quiere) { log(S, `${NOMBRES[s]}: no hay mus.`); empezarLances(S); return true; }
  log(S, `${NOMBRES[s]}: mus.`); S.musDichos++;
  if (S.musDichos >= 4) { S.fase = 'descarte'; S.descSel = [null, null, null, null]; } else S.turno = (s + 1) % 4;
  return true;
}
export function elegirDescarte(S, s, cs) {
  if (S.fase !== 'descarte' || !Array.isArray(cs) || cs.length < 1 || cs.length > 4 || new Set(cs).size !== cs.length || !cs.every(c => S.manos[s].includes(c))) return false;
  S.descSel[s] = cs.slice();
  if (S.descSel.every(Boolean)) {
    const tiradas = [];
    for (let k = 0; k < 4; k++) { const d = S.descSel[k]; S.manos[k] = S.manos[k].filter(c => !d.includes(c)); tiradas.push(...d); }
    const falta = tiradas.length;
    if (S.mazo.length < falta) { S.mazo = shuffle([...S.mazo, ...S.descartes]); S.descartes = []; }
    if (S.mazo.length < falta) { S.mazo = shuffle([...S.mazo, ...tiradas]); tiradas.length = 0; }
    for (const k of orden(S)) while (S.manos[k].length < 4) S.manos[k].push(S.mazo.pop());
    S.descartes.push(...tiradas);
    log(S, `Descartes: ${orden(S).map(k => `${NOMBRES[k]} ${S.descSel[k].length}`).join(', ')}.`);
    S.fase = 'mus'; S.turno = S.mano; S.musDichos = 0; S.descSel = [null, null, null, null];
  }
  return true;
}

/* ---------- lances y envites ---------- */
function participantes(S, L) {
  if (L === 2) return orden(S).filter(k => S.decl.pares[k]);
  if (L === 3 && !S.punto) return orden(S).filter(k => S.decl.juego[k]);
  return orden(S);
}
function empezarLances(S) { S.fase = 'lance'; S.lance = -1; siguienteLance(S); }
function siguienteLance(S) {
  S.B = null;
  while (++S.lance <= 3) {
    const L = S.lance;
    if (L === 2) { S.decl.pares = S.manos.map(h => tienePares(h, S.reyes)); log(S, `Pares: ${orden(S).map(k => `${NOMBRES[k]} ${S.decl.pares[k] ? 'sí' : 'no'}`).join(', ')}.`); }
    if (L === 3) {
      S.decl.juego = S.manos.map(h => tieneJuego(h, S.reyes)); S.punto = !S.decl.juego.some(Boolean);
      log(S, S.punto ? 'Nadie tiene juego: se juega al punto.' : `Juego: ${orden(S).map(k => `${NOMBRES[k]} ${S.decl.juego[k] ? 'sí' : 'no'}`).join(', ')}.`);
    }
    const ps = participantes(S, L);
    if (new Set(ps.map(pareja)).size < 2) { S.apuestas[L] = { estado: ps.length ? 'sin' : 'nadie', valor: 0 }; continue; }
    S.B = { orden: ps, i: 0, apuesta: 0, previo: 0, envida: -1, responde: -1, ordago: false };
    S.turno = ps[0]; return;
  }
  hacerRecuento(S);
}
export const quienHabla = S => (S.fase === 'lance' && S.B ? (S.B.responde >= 0 ? S.B.responde : S.B.orden[S.B.i]) : S.fase === 'mus' ? S.turno : -1);
function responsable(S, equipo, desde) {
  const ps = S.B.orden.filter(k => pareja(k) === equipo);
  if (equipo === 0 && ps.includes(0)) return 0;                // en tu pareja decides tú
  const ord = [0, 1, 2, 3].map(k => (desde + 1 + k) % 4);
  return ord.find(k => ps.includes(k));
}
// tipo: 'paso' | 'envido' (n) | 'ordago' | 'quiero' | 'noquiero'
export function hablar(S, s, tipo, n = 2) {
  if (S.fase !== 'lance' || !S.B || quienHabla(S) !== s) return false;
  const B = S.B, L = S.lance, nom = NOMBRES[s];
  if (B.responde < 0) {
    if (tipo === 'paso') { log(S, `${nombreLance(S, L)}: ${nom} pasa.`); B.i++; if (B.i >= B.orden.length) { S.apuestas[L] = { estado: 'paso', valor: 0 }; log(S, `${nombreLance(S, L)}: en paso.`); siguienteLance(S); } else S.turno = B.orden[B.i]; return true; }
    if (tipo === 'envido' || tipo === 'ordago') {
      B.previo = 1; B.envida = pareja(s);
      if (tipo === 'ordago') { B.ordago = true; log(S, `${nombreLance(S, L)}: ¡${nom} echa un órdago!`); } else { B.apuesta = Math.max(2, Math.min(30, n | 0)); log(S, `${nombreLance(S, L)}: ${nom} envida ${B.apuesta}.`); }
      B.responde = responsable(S, 1 - B.envida, s); S.turno = B.responde; return true;
    }
    return false;
  }
  if (tipo === 'quiero') {
    log(S, `${nombreLance(S, L)}: ${nom} quiere${B.ordago ? ' el órdago' : ''}.`);
    if (B.ordago) return resolverOrdago(S);
    S.apuestas[L] = { estado: 'querido', valor: B.apuesta }; siguienteLance(S); return true;
  }
  if (tipo === 'noquiero') {
    const pts = B.previo, eq = B.envida;
    S.apuestas[L] = { estado: 'noquiero', valor: pts, equipo: eq };
    log(S, `${nombreLance(S, L)}: ${nom} no quiere. ${eq === 0 ? 'Vosotros' : 'Ellos'} +${pts}.`);
    S.cobros.push({ L, equipo: eq, puntos: pts, texto: 'No quiso el envite' });
    if (sumar(S, eq, pts)) return true;
    siguienteLance(S); return true;
  }
  if (tipo === 'envido' || tipo === 'ordago') {
    if (B.ordago) return false;
    B.previo = Math.max(B.apuesta, 1); B.envida = pareja(s);
    if (tipo === 'ordago') { B.ordago = true; log(S, `${nombreLance(S, L)}: ¡${nom} echa un órdago!`); }
    else { const sube = Math.max(2, Math.min(30, n | 0)); B.apuesta += sube; log(S, `${nombreLance(S, L)}: ${nom} sube ${sube} (van ${B.apuesta}).`); }
    B.responde = responsable(S, 1 - B.envida, s); S.turno = B.responde; return true;
  }
  return false;
}
export const nombreLance = (S, L) => (L === 3 && S.punto ? 'Punto' : LANCES[L]);
function mejorAsiento(S, L, ps) {
  const c = cmpDe(S, L); let best = ps[0];
  for (const k of ps.slice(1)) if (c(S.manos[k], S.manos[best], S.reyes) > 0) best = k;   // empate: gana el más cercano a la mano (va antes)
  return best;
}
function resolverOrdago(S) {
  const L = S.lance, ps = participantes(S, L), g = mejorAsiento(S, L, ps), eq = pareja(g);
  S.apuestas[L] = { estado: 'ordago', valor: 0, equipo: eq };
  log(S, `Órdago a ${nombreLance(S, L).toLowerCase()}: gana ${NOMBRES[g].toLowerCase()} → ${eq === 0 ? 'ganáis' : 'ganan'} el juego.`);
  S.recuento = { lineas: [{ L, equipo: eq, puntos: S.meta - S.pts[eq], texto: `Órdago querido · mejor jugada: ${NOMBRES[g]}` }], ordago: true };
  S.pts[eq] = S.meta; ganarJuego(S, eq); return true;
}
function sumar(S, eq, pts) {                  // true si con esto se gana el juego (y se termina la mano)
  S.pts[eq] += pts;
  if (S.pts[eq] >= S.meta) { S.pts[eq] = S.meta; S.recuento = { lineas: S.cobros.map(x => ({ ...x })), ordago: false, corte: true }; ganarJuego(S, eq); return true; }
  return false;
}
function ganarJuego(S, eq) {
  S.juegos[eq]++; S.B = null;
  log(S, `${eq === 0 ? '¡Ganáis' : 'Ganan'} el juego (${S.juegos[0]}–${S.juegos[1]}).`);
  if (S.juegos[eq] >= S.juegosMeta) { S.ganador = eq; S.fase = 'fin'; } else { S.fase = 'recuento'; S.recuento.finJuego = eq; }
}
function hacerRecuento(S) {
  S.B = null; const r = S.reyes, lineas = S.cobros.map(x => ({ ...x }));
  for (let L = 0; L <= 3; L++) {
    const a = S.apuestas[L]; if (!a || a.estado === 'nadie') continue;
    const ps = participantes(S, L); let eq, pts = 0, txt;
    if (a.estado === 'noquiero') { eq = a.equipo; txt = 'Se lleva el lance (no quisieron)'; }
    else { const g = mejorAsiento(S, L, ps); eq = pareja(g); txt = `Mejor jugada: ${NOMBRES[g]}`; pts = a.estado === 'querido' ? a.valor : 0; if (a.estado === 'querido') txt += ` · envite de ${a.valor}`; }
    if (L <= 1) { if (a.estado === 'paso') { pts = 1; txt += ' · en paso'; } }
    else if (L === 2) { const b = ps.filter(k => pareja(k) === eq).reduce((s, k) => s + bonoPares(S.manos[k], r), 0); pts += b; txt += ` · pares +${b}`; }
    else if (S.punto) { pts += 1; txt += ' · punto +1'; }
    else { const b = ps.filter(k => pareja(k) === eq).reduce((s, k) => s + bonoJuego(S.manos[k], r), 0); pts += b; txt += ` · juego +${b}`; }
    if (a.estado === 'noquiero' && L <= 1) continue;          // lo apostado ya se cobró
    if (!pts) continue;
    lineas.push({ L, equipo: eq, puntos: pts, texto: txt });
    S.pts[eq] += pts;
    if (S.pts[eq] >= S.meta) { S.pts[eq] = S.meta; S.recuento = { lineas, ordago: false }; ganarJuego(S, eq); return; }
  }
  S.recuento = { lineas, ordago: false }; S.fase = 'recuento';
}
export function siguienteMano(S) {
  if (S.fase !== 'recuento') return false;
  if (S.recuento && S.recuento.finJuego != null) { S.pts = [0, 0]; log(S, 'Empieza un juego nuevo.'); }
  repartir(S); return true;
}

/* ---------- CPU ---------- */
function probGanar(S, s, L, muestras = 90) {   // estima la probabilidad de que la pareja de s gane el lance L, viendo solo su mano
  const r = S.reyes, mia = S.manos[s], resto = Array.from({ length: 40 }, (_, i) => i).filter(c => !mia.includes(c));
  const cmp = cmpDe(S, L), eq = pareja(s); let gana = 0, ok = 0;
  for (let t = 0; t < muestras * 4 && ok < muestras; t++) {
    const b = shuffle(resto.slice()), H = [0, 1, 2, 3].map(k => (k === s ? mia : b.splice(0, 4)));
    if (S.fase === 'lance' && S.lance >= 2) {                          // respetar lo que cada uno ha declarado
      if (S.lance >= 2 && H.some((h, k) => k !== s && tienePares(h, r) !== S.decl.pares[k])) continue;
      if (S.lance >= 3 && H.some((h, k) => k !== s && tieneJuego(h, r) !== S.decl.juego[k])) continue;
    }
    ok++;
    const ps = orden(S).filter(k => (L === 2 ? tienePares(H[k], r) : L === 3 && !S.punto ? tieneJuego(H[k], r) : true));
    if (!ps.length) continue;
    let best = ps[0]; for (const k of ps.slice(1)) if (cmp(H[k], H[best], r) > 0) best = k;
    if (pareja(best) === eq) gana++;
  }
  return ok ? gana / ok : .5;
}
export function cpuMus(S) {
  const s = S.turno, h = S.manos[s], r = S.reyes;
  if (S.nivel === 'facil') return Math.random() < .55;
  const p = pares(h, r), j = suma(h, r), reyes = h.filter(c => fuerza(c, r) === 9).length;
  const buena = p.tipo >= 2 || j === 31 || (j === 32 && p.tipo >= 1) || (p.tipo === 1 && p.clave[0] >= 7 && reyes >= 2) || (reyes >= 3);
  return !buena && Math.random() < (S.nivel === 'dificil' ? .92 : .8);
}
export function cpuDescarte(S, s) {
  const h = S.manos[s], r = S.reyes, n = {};
  h.forEach(c => { const f = fuerza(c, r); n[f] = (n[f] || 0) + 1; });
  let fuera = h.filter(c => { const f = fuerza(c, r); return n[f] < 2 && f !== 9 && f !== 0; });
  if (!fuera.length) fuera = [h.slice().sort((a, b) => Math.abs(fuerza(a, r) - 4.5) - Math.abs(fuerza(b, r) - 4.5))[0]];
  return fuera.slice(0, 4);
}
export function cpuHablar(S) {                // → { tipo, n }
  const s = quienHabla(S), B = S.B, L = S.lance, nv = S.nivel;
  const p = nv === 'facil' ? Math.min(1, Math.max(0, probGanar(S, s, L, 40) + (Math.random() - .5) * .5)) : probGanar(S, s, L, nv === 'dificil' ? 140 : 80);
  const cerca = S.pts[1 - pareja(s)] >= S.meta - 6;               // si los rivales están a punto de ganar, se arriesga más
  if (B.responde < 0) {
    if (p > .93 && (nv === 'dificil' || cerca) && Math.random() < .5) return { tipo: 'ordago' };
    if (p > .78) return { tipo: 'envido', n: p > .88 ? 4 : 2 };
    if (p > .62 && Math.random() < .4) return { tipo: 'envido', n: 2 };
    if (nv !== 'facil' && p < .25 && Math.random() < .07) return { tipo: 'envido', n: 2 };   // algún farol
    return { tipo: 'paso' };
  }
  const umbral = B.ordago ? (cerca ? .55 : .74) : Math.min(.8, .42 + .035 * B.apuesta);
  if (!B.ordago && p > .9 && Math.random() < .5) return { tipo: p > .96 && nv === 'dificil' ? 'ordago' : 'envido', n: 2 };
  return { tipo: p >= umbral ? 'quiero' : 'noquiero' };
}

/* ---------- validación ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || !NIVEL[d.nivel] || !METAS.includes(d.meta) || !JUEGOS.includes(d.juegosMeta) || !REYES.includes(d.reyes)) return null;
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, lista = a => Array.isArray(a) && a.every(c => ent(c, 0, 39));
  if (!Array.isArray(d.pts) || d.pts.length !== 2 || !d.pts.every(v => ent(v, 0, d.meta)) || !Array.isArray(d.juegos) || d.juegos.length !== 2 || !d.juegos.every(v => ent(v, 0, 3))) return null;
  if (!['mus', 'descarte', 'lance', 'recuento', 'fin'].includes(d.fase) || !ent(d.mano, 0, 3) || !ent(d.turno, 0, 3) || !ent(d.nMano, 1, 99999) || !ent(d.lance, -1, 4) || !ent(d.musDichos, 0, 4)) return null;
  if (!Array.isArray(d.manos) || d.manos.length !== 4 || !d.manos.every(h => lista(h) && h.length === 4) || !lista(d.mazo) || !lista(d.descartes)) return null;
  const todas = [...d.manos.flat(), ...d.mazo, ...d.descartes]; if (todas.length !== 40 || new Set(todas).size !== 40) return null;
  const bools = a => Array.isArray(a) && a.length === 4 ? a.map(Boolean) : [false, false, false, false];
  const descSel = Array.isArray(d.descSel) && d.descSel.length === 4 ? d.descSel.map((x, k) => (lista(x) && x.length >= 1 && x.length <= 4 && x.every(c => d.manos[k].includes(c)) ? x.slice() : null)) : [null, null, null, null];
  const apuestas = Array.isArray(d.apuestas) ? [0, 1, 2, 3].map(k => { const a = d.apuestas[k]; return a && ['paso', 'querido', 'noquiero', 'sin', 'nadie', 'ordago'].includes(a.estado) && ent(a.valor, 0, 60) ? { estado: a.estado, valor: a.valor, ...(ent(a.equipo, 0, 1) ? { equipo: a.equipo } : {}) } : null; }) : [null, null, null, null];
  let B = null;
  if (d.fase === 'lance') {
    const b = d.B; if (!b || !Array.isArray(b.orden) || !b.orden.length || !b.orden.every(k => ent(k, 0, 3)) || !ent(b.i, 0, b.orden.length - 1) || !ent(b.apuesta, 0, 60) || !ent(b.previo, 0, 60) || !ent(b.envida, -1, 1) || !ent(b.responde, -1, 3)) return null;
    B = { orden: b.orden.slice(), i: b.i, apuesta: b.apuesta, previo: b.previo, envida: b.envida, responde: b.responde, ordago: !!b.ordago };
  }
  const linea = x => x && ent(x.L, 0, 3) && ent(x.equipo, 0, 1) && ent(x.puntos, 0, 60) && typeof x.texto === 'string';
  const cobros = Array.isArray(d.cobros) ? d.cobros.filter(linea).map(x => ({ L: x.L, equipo: x.equipo, puntos: x.puntos, texto: x.texto.slice(0, 80) })) : [];
  let recuento = null;
  if (d.recuento && Array.isArray(d.recuento.lineas)) recuento = { lineas: d.recuento.lineas.filter(linea).map(x => ({ L: x.L, equipo: x.equipo, puntos: x.puntos, texto: x.texto.slice(0, 80) })), ordago: !!d.recuento.ordago, corte: !!d.recuento.corte, ...(ent(d.recuento.finJuego, 0, 1) ? { finJuego: d.recuento.finJuego } : {}) };
  if ((d.fase === 'recuento' || d.fase === 'fin') && !recuento) return null;
  return { nivel: d.nivel, meta: d.meta, juegosMeta: d.juegosMeta, reyes: d.reyes, pts: d.pts.slice(), juegos: d.juegos.slice(), mano: d.mano, nMano: d.nMano, manos: d.manos.map(h => h.slice()), mazo: d.mazo.slice(), descartes: d.descartes.slice(),
    fase: d.fase, turno: d.turno, musDichos: d.musDichos, descSel, lance: d.lance, punto: !!d.punto, decl: { pares: bools(d.decl && d.decl.pares), juego: bools(d.decl && d.decl.juego) }, apuestas, B, cobros, recuento,
    ganador: ent(d.ganador, -1, 1) ? d.ganador : -1, log: Array.isArray(d.log) ? d.log.filter(x => typeof x === 'string').slice(0, 8).map(x => x.slice(0, 160)) : [] };
}
