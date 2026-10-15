// Pruebas de los motores (sin navegador):  node tests/motores.mjs
import assert from 'node:assert/strict';
import { generar, contarSoluciones } from '../js/games/sudoku/generador.js';
import { generarAleatorio, solveGrid } from '../js/games/nonogram/solver.js';
import { REGLAS, tableroInicial, jugadas, aplicar } from '../js/games/damas/reglas.js';
import { elegir } from '../js/games/damas/ia.js';
import { nuevaPartida, tirar, mover, siguiente, mejorJugada } from '../js/games/parchis/reglas.js';

import * as TR from '../js/games/tresenraya/reglas.js';
import * as C4 from '../js/games/conecta4/reglas.js';
import { generar as generarSopa, NIVELES as NSopa } from '../js/games/sopa/generador.js';
import { TEMAS } from '../js/games/sopa/palabras.js';
import * as BM from '../js/games/buscaminas/motor.js';
import { generar as generarCw, NIVELES as NCw, celdasDe } from '../js/games/crucigrama/generador.js';
import { BANCOS as BCw } from '../js/games/crucigrama/pistas.js';
import * as BJ from '../js/games/blackjack/motor.js';
import * as KL from '../js/games/klondike/motor.js';
import * as HE from '../js/games/holdem/motor.js';
import { resolver as resolverKl } from '../js/games/klondike/solver.js';
import { nuevaPartida as nuevaPz, tirar as tirarPz, mover as moverPz, actual as actualPz } from '../js/games/parchis/reglas.js';
import { generar as generarKk, contar as contarKk, TAMANOS as TKk, DIFICULTADES as DKk } from '../js/games/kenken/generador.js';
import * as BR from '../js/games/brisca/motor.js';
import { elegir as elegirBr } from '../js/games/brisca/ia.js';
import * as TV from '../js/games/trivial/motor.js';
import { candidatas as candAh, NIVELES as NAh } from '../js/games/ahorcado/palabras.js';
import { BLOQUES } from '../js/core/definiciones.js';
import * as RL from '../js/games/ruleta/motor.js';
import * as AX from '../js/games/ajedrez/reglas.js';
import * as CH from '../js/games/chinchon/motor.js';
import * as MU from '../js/games/mus/motor.js';
import * as FL from '../js/games/flota/motor.js';
import * as RM from '../js/games/rummy/motor.js';
import * as OC from '../js/games/oca/motor.js';
import * as CQ from '../js/games/cinquillo/motor.js';
import * as CN from '../js/games/continental/motor.js';
import * as RC from '../js/games/rosco/motor.js';
import * as EN from '../js/games/encadenadas/motor.js';
import { silabas } from '../js/games/encadenadas/silabas.js';
import * as SN from '../js/games/serpiente/motor.js';
import * as BL from '../js/games/bloques/motor.js';
import * as LD from '../js/games/ladrillos/motor.js';
import { PANELES as PRL } from '../js/games/ruleta/paneles.js';
let n = 0; const ok = t => { n++; console.log('✓', t); };

for (const nivel of ['facil', 'medio', 'dificil']) {
  for (let i = 0; i < 5; i++) { const { sol, cur } = generar(nivel); assert.equal(contarSoluciones(cur, 2), 1); assert.ok(cur.every((v, k) => !v || v === sol[k])); }
  ok(`Sudoku ${nivel}: solución única`);
}
for (const [t, d] of [[5, 'facil'], [10, 'medio'], [15, 'dificil']]) { const p = await generarAleatorio(t, d); assert.ok(solveGrid(p.rc, p.cc, t).ok); ok(`Nonogram ${t}×${t} ${d}: resoluble por lógica`); }

const b0 = tableroInicial();
assert.equal(jugadas(b0, 'w', REGLAS.espanola).length, 7); assert.equal(jugadas(b0, 'w', REGLAS.inglesa).length, 7); ok('Damas: 7 jugadas iniciales');
const vac = () => Array.from({ length: 8 }, () => Array(8).fill(0));
let b = vac(); b[7][0] = 'W'; b[4][3] = 'b';
assert.equal(jugadas(b, 'w', REGLAS.espanola).length, 4); ok('Damas españolas: dama voladora captura a distancia');
b = vac(); b[5][2] = 'w'; b[4][3] = 'b'; b[7][6] = 'w'; b[6][5] = 'b'; b[4][7] = 'b'; b[5][6] = 'b';
assert.deepEqual(jugadas(b, 'w', REGLAS.espanola).map(m => m.caps.length), [2]); assert.deepEqual(jugadas(b, 'w', REGLAS.inglesa).map(m => m.caps.length), [1, 2]); ok('Damas: ley de la mayoría solo en españolas');
{ let t = 'w', bb = tableroInicial(), plies = 0;
  while (plies < 400) { const js = jugadas(bb, t, REGLAS.espanola); if (!js.length) break; const m = t === 'b' ? elegir(bb, t, REGLAS.espanola, 'medio') : js[Math.random() * js.length | 0]; bb = aplicar(bb, m); t = t === 'w' ? 'b' : 'w'; plies++; }
  assert.ok(plies < 400); ok('Damas: partida completa CPU vs azar'); }

for (const cfg of [{ am: 'c', az: 'c' }, { am: 'c', az: 'c', ro: 'c', ve: 'c' }]) {
  for (let g = 0; g < 20; g++) { const P = nuevaPartida(cfg); let s = 0; while (P.phase !== 'over' && s++ < 20000) { if (P.phase === 'roll') tirar(P, 1 + Math.random() * 6 | 0); else if (P.phase === 'move') mover(P, mejorJugada(P)); else siguiente(P); } assert.equal(P.phase, 'over'); }
  ok(`Parchís ${Object.keys(cfg).length} jugadores: las partidas terminan`);
}

// ---- 3 en raya ----
function jugarDuelo(M, v, niv1, niv2, max = 300) {   // niv = 'azar' | nivel de IA; devuelve ganador (0 = tablas)
  let e = M.estadoInicial(v), t = 0, maxms = 0;
  while (!e.fin && t++ < max) {
    const niv = e.turn === 1 ? niv1 : niv2, js = M.jugadas(e, v);
    const t0 = performance.now();
    const m = niv === 'azar' ? js[Math.random() * js.length | 0] : M.ia(e, v, niv);
    maxms = Math.max(maxms, performance.now() - t0);
    e = M.aplicar(e, m, v);
  }
  return { w: e.fin ? e.fin.w : -1, maxms };
}
{ const V = TR.VARIANTES; let e = TR.estadoInicial('clasico');
  for (const m of [0, 3, 1, 4, 2]) e = TR.aplicar(e, m, 'clasico');
  assert.equal(e.fin.w, 1); assert.deepEqual(e.fin.linea, [0, 1, 2]); ok('3 en raya: detecta línea ganadora'); }
{ let e = TR.estadoInicial('infinito');
  for (const m of [0, 1, 3, 4, 8, 7]) e = TR.aplicar(e, m, 'infinito');     // X: 0,3,8  O: 1,4,7
  e = TR.aplicar(e, 5, 'infinito');                                         // 4.ª ficha de X: desaparece la casilla 0
  assert.equal(e.b[0], 0); assert.equal(e.b.filter(x => x === 1).length, 3); ok('3 en raya infinito: desaparece la ficha más antigua'); }
for (let i = 0; i < 6; i++) assert.equal(jugarDuelo(TR, 'clasico', 'dificil', 'dificil').w, 0); ok('3 en raya 3×3: Difícil vs Difícil = tablas');
{ let perdidas = 0, mx = 0; for (let i = 0; i < 40; i++) { const a = jugarDuelo(TR, 'clasico', 'dificil', 'azar'), b = jugarDuelo(TR, 'clasico', 'azar', 'dificil'); if (a.w === 2) perdidas++; if (b.w === 1) perdidas++; mx = Math.max(mx, a.maxms, b.maxms); }
  assert.equal(perdidas, 0); ok(`3 en raya 3×3: la IA Difícil nunca pierde contra el azar (80 partidas, máx ${mx.toFixed(0)} ms)`); }
for (const v of ['infinito', 'cuatro', 'cinco']) { let mx = 0, gan = 0; for (let i = 0; i < 6; i++) { const r = jugarDuelo(TR, v, 'dificil', 'azar'); mx = Math.max(mx, r.maxms); if (r.w === 1) gan++; assert.notEqual(r.w, 2); }
  assert.ok(mx < 2500); ok(`3 en raya ${v}: Difícil gana ${gan}/6 al azar y nunca pierde (máx ${mx.toFixed(0)} ms/jugada)`); }
{ const r = [jugarDuelo(TR, 'cinco', 'facil', 'azar'), jugarDuelo(TR, 'cinco', 'medio', 'azar')]; assert.ok(r.every(x => x.w >= 0)); ok('3 en raya: niveles Fácil y Medio terminan la partida'); }
// ---- Conecta 4 ----
{ let e = C4.estadoInicial('clasico'); for (const c of [0, 1, 0, 1, 0, 1, 0]) e = C4.aplicar(e, c, 'clasico'); assert.equal(e.fin.w, 1); assert.equal(e.fin.linea.length, 4); ok('Conecta 4: vertical'); }
{ let e = C4.estadoInicial('clasico'); for (const c of [0, 1, 2, 3, 4]) { e = C4.aplicar(e, c, 'clasico'); e = c < 4 ? C4.aplicar(e, c, 'clasico') : e; } assert.ok(e.fin == null || e.fin.w >= 0); ok('Conecta 4: partidas válidas con apilado'); }
{ let e = C4.estadoInicial('clasico'); for (const c of [0, 1, 1, 2, 3, 2, 2, 3, 3, 6, 3]) e = C4.aplicar(e, c, 'clasico'); assert.equal(e.fin && e.fin.w, 1); ok('Conecta 4: diagonal'); }
{ let e = C4.estadoInicial('mini'); for (let i = 0; i < 3; i++) e = C4.aplicar(e, 0, 'mini'); for (let i = 0; i < 2; i++) e = C4.aplicar(e, 0, 'mini'); assert.equal(C4.jugadas(e, 'mini').includes(0), false); ok('Conecta 4: columna llena no es jugable'); }
for (const v of Object.keys(C4.VARIANTES)) { let mx = 0, gan = 0; const N = v === 'clasico' ? 10 : 4; for (let i = 0; i < N; i++) { const r = jugarDuelo(C4, v, 'dificil', 'azar'); mx = Math.max(mx, r.maxms); if (r.w === 1) gan++; }
  assert.ok(gan >= N - 1 && mx < 2600); ok(`Conecta 4 ${v}: Difícil gana ${gan}/${N} al azar (máx ${mx.toFixed(0)} ms/jugada)`); }
{ let g = 0; for (let i = 0; i < 8; i++) if (jugarDuelo(C4, 'clasico', 'dificil', 'medio').w === 1) g++; ok(`Conecta 4 clásico: Difícil gana ${g}/8 a Medio`); assert.ok(g >= 5); }
// ---- Sopa de letras ----
for (const tema of [...Object.keys(TEMAS), 'mezcla']) for (const nv of Object.keys(NSopa)) { const g = generarSopa(tema, nv); assert.equal(g.palabras.length, NSopa[nv].palabras);
  for (const w of g.palabras) { const r0 = w.f / g.n | 0, c0 = w.f % g.n; for (let k = 0; k < w.p.length; k++) assert.equal(g.grid[(r0 + w.d[0] * k) * g.n + c0 + w.d[1] * k], w.p[k]); } }
ok('Sopa de letras: 7 temas × 3 niveles generan tableros con todas las palabras');
// ---- Buscaminas ----
for (const nv of Object.keys(BM.NIVELES)) { let gana = 0; for (let g = 0; g < 60; g++) { const S = BM.nuevo(nv), N = BM.crearCache(), c = (S.h >> 1) * S.w + (S.w >> 1); BM.abrir(S, c, N); assert.notEqual(S.fin, 'pierde');
  assert.ok(!S.minas.includes(c)); let k = 0; while (!S.fin && k++ < 3000) { const p = BM.pista(S, N); if (!p) break; if (p.tipo === 'seguro') BM.abrir(S, p.i, N); else BM.bandera(S, p.i); } if (S.fin === 'gana') gana++; }
  assert.equal(gana, 60); ok(`Buscaminas ${nv}: primer toque seguro y la pista resuelve el tablero (60/60)`); }
// ---- Crucigrama ----
for (const tema of [...Object.keys(BCw), 'mezcla']) for (const nv of Object.keys(NCw)) { const g = generarCw(tema, nv); assert.ok(g.palabras.length >= Math.min(NCw[nv].pal, 20) - 4);
  for (const x of g.palabras) celdasDe(g.w, x).forEach((c, i) => assert.equal(g.sol[c], x.p[i])); const cub = new Set(g.palabras.flatMap(x => celdasDe(g.w, x))); assert.ok(g.sol.every((l, i) => !l || cub.has(i))); }
ok('Crucigrama: 5 niveles × 8 temas, sin letras huérfanas y con palabras consistentes');
// ---- BlackJack ----
assert.deepEqual(BJ.total([0, 12]), { t: 21, suave: true }); assert.equal(BJ.total([0, 0, 9]).t, 12);
{ const S = BJ.nuevoEstado(); S.fichas = 1e9; const f0 = S.fichas; let neto = 0;
  for (let i = 0; i < 20000; i++) { BJ.apostar(S, 0); BJ.apostar(S, 10); BJ.repartir(S); if (S.fase === 'seguro') BJ.seguro(S, false); let g = 0; while (S.fase === 'jugador' && g++ < 60) assert.ok(BJ.accion(S, BJ.consejo(S).accion)); assert.equal(S.fase, 'fin'); neto += S.resultado.neto; BJ.nuevaRonda(S); }
  assert.equal(S.fichas - f0, neto); assert.ok(-neto / 200000 < 0.03); ok(`BlackJack: contabilidad exacta y estrategia básica con ventaja de la casa ${(-neto / 200000 * 100).toFixed(2)} %`); }
// ---- Klondike ----
{ const cuenta = S => S.tab.reduce((s, c) => s + c.d.length + c.u.length, 0) + S.fund.reduce((s, f) => s + f.length, 0) + S.stock.length + S.waste.length; let g = 0;
  for (let k = 0; k < 120; k++) { const S = KL.nuevo(k % 2 ? 3 : 1); assert.ok(KL.validar(S)); let p = 0, sin = 0; while (p++ < 1500 && !KL.gana(S)) { const h = KL.pista(S); if (!h) break; if (h.o.t === 'stock') { KL.robarStock(S); if (++sin > 60) break; } else { KL.mover(S, h.o, h.a); sin = 0; } assert.equal(cuenta(S), 52); } if (KL.gana(S)) g++; }
  assert.ok(g > 0); ok(`Klondike: se conservan las 52 cartas y la pista automática gana ${g}/120 partidas`); }
// ---- Texas Hold'em ----
{ const c = (r, p) => p * 13 + (r === 14 ? 0 : r - 1), v = (...x) => HE.valorMano(x);
  assert.ok(v(c(14, 0), c(13, 0), c(12, 0), c(11, 0), c(10, 0), c(2, 1), c(3, 2)) > v(c(9, 0), c(9, 1), c(9, 2), c(9, 3), c(2, 0), c(3, 1), c(4, 2)));
  assert.equal(HE.nombreMano(v(c(14, 0), c(2, 1), c(3, 2), c(4, 3), c(5, 0), c(9, 1), c(11, 2))), 'Escalera'); ok('Hold\'em: evaluador de manos (escalera real, póker, rueda A-5)'); }
{ const S = HE.crear(2, 'facil'); S.jug.forEach(p => { p.stack = 0; p.fold = false; p.fuera = false; }); S.jug[0].inv = 100; S.jug[1].inv = 300; S.jug[2].inv = 300; assert.deepEqual(HE.botes(S).map(x => x.monto), [300, 400]); ok('Hold\'em: botes secundarios'); }
for (let g = 0; g < 2; g++) { const S = HE.crear(2 + g, 'facil'); S.jug.forEach(p => { p.bot = true; }); let guardia = 0;
  while (S.fase !== 'terminado' && guardia++ < 4000) { if (S.fase === 'fin') { HE.nuevaMano(S); continue; } const i = S.turno; assert.ok(i >= 0); let a = HE.decidir(S, i); if (!HE.actuar(S, i, a)) assert.ok(HE.actuar(S, i, HE.legal(S, i).pasar ? { t: 'check' } : { t: 'call' })); if (S.fase === 'fin') assert.equal(S.jug.reduce((s, p) => s + p.stack, 0), S.total); }
  assert.equal(S.fase, 'terminado'); }
ok('Hold\'em: torneos completos solo de bots, con conservación de fichas');
// ---- Parchís: salida libre ----
{ const P = nuevaPz({ am: 'c', az: 'c' }, {}); P.turn = 0; tirarPz(P, 3); assert.equal(P.phase, 'pass'); }
for (const v of [1, 2, 3, 4, 6]) { const P = nuevaPz({ am: 'c', az: 'c' }, {}, { salidaLibre: true }); P.turn = 0; tirarPz(P, v); assert.equal(P.kind, 'libre'); moverPz(P, P.moves[0]); assert.equal(P.pieces.am.filter(p => p === 0).length, 1); }
{ const P = nuevaPz({ am: 'c', az: 'c' }, {}, { salidaLibre: true }); P.turn = 0; tirarPz(P, 5); moverPz(P, P.moves[0]); assert.equal(P.kind, 'libre'); moverPz(P, P.moves[0]); assert.equal(P.pieces.am.filter(p => p === 0).length, 2); assert.equal(actualPz(P), 'az'); }
ok('Parchís salida libre: cualquier número saca ficha sin fichas en juego y un 5 en la primera tirada saca dos');
// ---- BlackJack: pago del blackjack (+150 %) frente a victoria normal (+100 %) ----
{ const mesa = (cartas, ap = 100) => { const S = BJ.nuevoEstado(); S.fichas = 1000; S.apuesta = ap; S.zapato = [...Array(100).fill(20), ...cartas.slice().reverse()]; BJ.repartir(S); return S; };
  let S = mesa([0, 4, 12, 5]); assert.equal(S.manos[0].res, 'bj'); assert.equal(S.resultado.neto, 150);
  S = mesa([9, 9, 12, 7]); BJ.accion(S, 'plantarse'); assert.equal(S.resultado.neto, 100); ok('BlackJack: blackjack paga +150 % y la victoria normal +100 %'); }
// ---- Klondike: casilla extra y analizador ----
{ const S = KL.nuevo(1, true); assert.equal(S.tab.length, 8); assert.ok(KL.puede(S, { t: 'tab', col: 7, idx: 0 }, { t: 'tab', col: 0 })); const S2 = KL.nuevo(1, false); assert.ok(!KL.puede(S2, { t: 'tab', col: 7, idx: 0 }, { t: 'tab', col: 0 }));
  const viejo = JSON.parse(JSON.stringify(S)); viejo.tab.shift(); delete viejo.extra; const v = KL.validar(viejo); assert.ok(v && v.tab.length === 8 && v.extra === false);
  let g = 0; for (let i = 0; i < 6; i++) if (resolverKl(KL.nuevo(1, true), { ms: 1200 }).r === 'ganable') g++; assert.ok(g >= 3); ok(`Klondike: casilla extra, migración de partidas antiguas y analizador (${g}/6 repartos resueltos)`); }
// ---- Klondike: auto-relleno (sin cartas boca abajo, el resto sube solo a las bases) ----
{ let n = 0; for (let i = 0; i < 200 && n < 25; i++) { const S = KL.nuevo(1, true); let p = 0, sin = 0;
    while (p++ < 1500 && !KL.gana(S) && !KL.sinOcultas(S)) { const h = KL.pista(S); if (!h) break; if (h.o.t === 'stock') { KL.robarStock(S); if (++sin > 60) break; } else { KL.mover(S, h.o, h.a); sin = 0; } }
    if (!KL.sinOcultas(S) || KL.gana(S)) continue; n++; assert.ok(KL.autoResoluble(S));
    let s2 = 0; for (let g = 0; g < 2000 && !KL.gana(S); g++) { const q = KL.pasoAuto(S, s2); assert.ok(q); if (q.o) { assert.ok(KL.mover(S, q.o, q.a)); s2 = 0; } else { KL.robarStock(S); s2++; } }
    assert.ok(KL.gana(S)); }
  assert.ok(n >= 10); ok(`Klondike: auto-relleno completa las partidas sin cartas ocultas (${n}/${n})`); }
// ---- Banco de definiciones del PDF ----
assert.equal(BLOQUES.length, 9); assert.ok(BLOQUES.every(b => b.fichas.length === 50)); ok('Banco de definiciones: 9 bloques × 50 fichas = 450');
// ---- KenKen ----
for (const dif of Object.keys(DKk)) for (const t of [3, 4, 5, 6]) { const p = generarKk(t, dif); assert.equal(contarKk(t, p.cages, 2, 4000), 1); }
ok('KenKen: paneles de 3×3 a 6×6 en 4 dificultades con solución única');
// ---- Brisca ----
for (const nj of [2, 3, 4]) for (let i = 0; i < 25; i++) { const S = BR.nueva(nj, 'medio', i % 2 === 0); let g = 0; while (S.fase !== 'fin' && g++ < 500) { if (S.fase === 'baza') { BR.cerrarBaza(S); continue; } const j = S.turno; if (S.cambio && BR.puedeCambiar(S, j) && Math.random() < .5) BR.cambiar(S, j); assert.ok(BR.jugar(S, j, j === 0 ? S.manos[0][0] : elegirBr(S, j, i % 3 === 0 ? 'dificil' : 'medio'))); }
  assert.equal(S.fase, 'fin'); assert.equal(BR.puntosEquipo(S).reduce((a, b) => a + b, 0), 120); }
ok('Brisca: partidas de 2, 3 y 4 jugadores (con cambio del 7 y las tres IA) suman siempre 120 puntos');
// ---- Trivial ----
for (const [nj, nc, modo] of [[4, 6, 'opciones'], [3, 9, 'escribir']]) { const S = TV.crear({ nCat: nc, modo, nivel: 'dificil', jugadores: Array.from({ length: nj }, (_, k) => ({ nombre: 'J' + k, cpu: true })) }); let g = 0;
  while (S.fase !== 'fin' && g++ < 20000) { if (S.fase === 'tirar') TV.tirar(S); else if (S.fase === 'mover') TV.mover(S, TV.cpuSentido(S)); else if (S.fase === 'pregunta') TV.responder(S, TV.cpuRespuesta(S)); else TV.continuar(S); } assert.equal(S.fase, 'fin'); }
assert.ok(TV.coincide('talweg', 'Talweg (o Vaguada)')); ok('Trivial: partidas completas de 3 y 4 jugadores y respuestas escritas tolerantes');
// ---- Trivial: ronda final (una pregunta de cada categoría seguidas; si falla, empieza de nuevo en su siguiente turno) ----
{ const S = TV.crear({ nCat: 6, modo: 'opciones', nivel: 'medio', jugadores: [{ nombre: 'A' }, { nombre: 'B' }] }); const p = S.jug[0]; p.q.fill(true); p.centro = true;
  TV.tirar(S); assert.equal(S.fase, 'pregunta'); assert.ok(S.pregunta.final);
  const vistas = new Set();
  for (let k = 0; k < 5; k++) { vistas.add(S.pregunta.cat); TV.responder(S, S.pregunta.correcta); TV.continuar(S); assert.equal(S.fase, 'pregunta'); assert.equal(S.turno, 0); assert.equal(p.final.length, k + 1); assert.ok(!vistas.has(S.pregunta.cat)); }
  TV.responder(S, (S.pregunta.correcta + 1) % 4); TV.continuar(S); assert.equal(S.turno, 1); assert.equal(p.final.length, 0); assert.equal(S.ganador, -1);
  S.turno = 0; S.fase = 'tirar'; TV.tirar(S); for (let k = 0; k < 6; k++) { TV.responder(S, S.pregunta.correcta); TV.continuar(S); } assert.equal(S.fase, 'fin'); assert.equal(S.ganador, 0);
  assert.ok(TV.validar(JSON.parse(JSON.stringify(S)))); ok('Trivial: ronda final de 6 preguntas sin fallar y reintento en el siguiente turno'); }
// ---- Ruleta de la Suerte ----
{ assert.ok(PRL.length >= 100); assert.ok(PRL.every(p => /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ,.¡!¿?]{2,48}$/.test(p.t)));
  for (let i = 0; i < 300; i++) { const S = RL.crear({ jugadores: [{ nombre: 'A', cpu: true }, { nombre: 'B', cpu: true }, { nombre: 'C', cpu: true }], rondas: 3, nivel: ['facil', 'medio', 'dificil'][i % 3] }); let g = 0;
    while (S.fase !== 'fin' && g++ < 5000) {
      if (S.fase === 'ronda') RL.siguienteRonda(S);
      else if (S.fase === 'girar') { const d = RL.cpuDecidir(S); if (d === 'girar') RL.caer(S, Math.floor(Math.random() * RL.SEGS.length)); else if (d === 'vocal') assert.ok(RL.comprarVocal(S)); else RL.resolver(S, RL.cpuAcierta(S) ? RL.panel(S).t : ''); }
      else assert.ok(RL.pedir(S, RL.cpuLetra(S)) >= 0);
      assert.ok(S.jug.every(j => j.banco >= 0)); }
    assert.equal(S.fase, 'fin'); assert.ok(RL.validar(JSON.parse(JSON.stringify(S)))); }
  const S = RL.crear({ jugadores: [{ nombre: 'Yo' }] }); S.panel = PRL.findIndex(p => p.t === 'Pez payaso'); S.usadas = '';
  assert.equal(RL.caer(S, 0), 300); assert.equal(RL.pedir(S, 'Z'), 1); assert.equal(S.jug[0].banco, 300); assert.equal(RL.pedir(S, 'P'), -1);
  assert.ok(RL.resolver(S, 'pez PAYASO')); assert.equal(S.jug[0].total, 300); assert.equal(S.fase, 'ronda');
  ok('Ruleta: 300 partidas completas de CPU, premios, vocales, resolver y validación'); }
// ---- Ajedrez ----
{ const casos = [[null, 4, 197281], ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 3, 97862], ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 4, 43238],
    ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', 3, 9467], ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', 3, 62379]];
  for (const [fen, d, n] of casos) assert.equal(AX.perft(fen ? AX.desdeFEN(fen) : AX.estadoInicial(), d), n);
  let e = AX.estadoInicial(); for (const s of ['f3', 'e5', 'g4', 'Dh4#']) { const m = AX.jugadas(e).find(x => AX.aplicar(e, x).san.at(-1) === s); assert.ok(m != null, s); e = AX.aplicar(e, m); }
  assert.deepEqual(e.fin, { w: 2, motivo: 'Jaque mate' }); assert.ok(AX.validarEstado(JSON.parse(JSON.stringify(e))));
  { const p = AX.desdeFEN('k7/8/8/2Q5/8/8/8/7K w - - 0 1'), ah = AX.aplicar(p, AX.jugadas(p).find(m => AX.de(m) === 26 && AX.a(m) === 10)); assert.equal(ah.fin.motivo, 'Rey ahogado'); assert.equal(ah.fin.w, 0); }
  assert.equal(AX.aplicar(AX.desdeFEN('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1'), AX.ia(AX.desdeFEN('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1'), 'clasico', 'medio')).fin.motivo, 'Jaque mate');
  assert.ok(AX.materialInsuficiente(AX.desdeFEN('8/8/4k3/8/8/2B5/4K3/8 w - - 0 1').b));
  for (let i = 0; i < 4; i++) { let g = AX.estadoInicial(), k = 0; while (!g.fin && k++ < 400) g = AX.aplicar(g, AX.ia(g, 'clasico', 'facil')); assert.ok(AX.validarEstado(JSON.parse(JSON.stringify(g)))); }
  ok('Ajedrez: perft en 5 posiciones de referencia, mate, ahogado, material insuficiente, IA y partidas completas'); }
// ---- Chinchón ----
{ const id = (p, r) => p * 10 + [1, 2, 3, 4, 5, 6, 7, 10, 11, 12].indexOf(r);
  assert.equal(CH.mejor([id(0, 5), id(1, 5), id(2, 5), id(3, 6), id(3, 7), id(3, 10), id(0, 12)]).puntos, 10);   // trío de 5 + escalera 6-7-sota
  assert.ok(CH.esChinchon([5, 6, 7, 10, 11, 12, 4].map(x => id(1, x)))); assert.ok(!CH.esChinchon([1, 2, 3, 4, 5, 6, 10].map(x => id(1, x))));
  for (let i = 0; i < 150; i++) { const S = CH.crear({ jugadores: Array.from({ length: 2 + i % 3 }, (_, k) => ({ nombre: 'J' + k, cpu: true })), nivel: ['facil', 'medio', 'dificil'][i % 3], limite: [50, 100][i % 2], cierre: [3, 5][i % 2] }); let g = 0;
    while (S.fase !== 'fin' && g++ < 20000) {
      if (S.fase === 'recuento') { CH.siguienteMano(S); continue; }
      if (S.fase === 'robar') assert.notEqual(CH.robar(S, CH.cpuRobar(S)), false); else { const t = CH.cpuTirar(S); assert.ok(t.cerrar ? CH.cerrar(S, t.c) : CH.tirar(S, t.c)); }
      if (S.fase !== 'fin') assert.ok(CH.validar(JSON.parse(JSON.stringify(S)))); }
    assert.equal(S.fase, 'fin'); assert.ok(CH.validar(JSON.parse(JSON.stringify(S)))); }
  ok('Chinchón: mejores jugadas, chinchón y 150 partidas completas de 2 a 4 jugadores con estados válidos'); }
// ---- Mus ----
{ const id = (p, r) => p * 10 + [1, 2, 3, 4, 5, 6, 7, 10, 11, 12].indexOf(r);
  assert.equal(MU.cmpGrande([id(0, 3), id(0, 5), id(0, 1), id(0, 4)], [id(1, 12), id(1, 5), id(1, 1), id(1, 4)], 8), 0);   // con 8 reyes el 3 es rey
  assert.equal(MU.pares([id(0, 12), id(1, 3), id(2, 12), id(3, 12)], 8).tipo, 3);
  assert.ok(MU.cmpJuego([id(0, 12), id(1, 11), id(2, 10), id(3, 1)], [id(0, 11), id(1, 12), id(2, 10), id(3, 10)], 8) > 0);   // 31 gana a 40
  const prep = () => { const S = MU.crear({ reyes: 8 }); S.manos = [[id(0, 12), id(1, 12), id(0, 11), id(0, 1)], [id(0, 4), id(1, 5), id(2, 6), id(3, 7)], [id(1, 1), id(2, 1), id(1, 4), id(2, 5)], [id(0, 10), id(1, 10), id(2, 11), id(1, 7)]]; MU.decirMus(S, 0, false); return S; };
  let S = prep(); while (S.fase === 'lance') MU.hablar(S, MU.quienHabla(S), 'paso'); assert.deepEqual(S.pts, [7, 0]);         // grande 1 + chica 1 + pares 2 + juego 3
  S = prep(); MU.hablar(S, 0, 'paso'); MU.hablar(S, 1, 'envido', 2); MU.hablar(S, 0, 'envido', 3); MU.hablar(S, MU.quienHabla(S), 'noquiero'); assert.deepEqual(S.pts, [2, 0]);
  S = prep(); MU.hablar(S, 0, 'ordago'); MU.hablar(S, MU.quienHabla(S), 'quiero'); assert.equal(S.ganador, 0);
  for (let i = 0; i < 60; i++) { const T = MU.crear({ nivel: ['facil', 'medio', 'dificil'][i % 3], meta: [30, 40][i % 2], juegos: [1, 2][i % 2], reyes: [8, 4][(i >> 1) % 2] }); let g = 0;
    while (T.fase !== 'fin' && g++ < 5000) {
      if (T.fase === 'recuento') assert.ok(MU.siguienteMano(T));
      else if (T.fase === 'mus') assert.ok(MU.decirMus(T, T.turno, MU.cpuMus(T)));
      else if (T.fase === 'descarte') { for (let k = 0; k < 4; k++) if (!T.descSel[k]) assert.ok(MU.elegirDescarte(T, k, MU.cpuDescarte(T, k))); }
      else { const s = MU.quienHabla(T), d = MU.cpuHablar(T); assert.ok(MU.hablar(T, s, d.tipo, d.n)); }
      assert.ok(MU.validar(JSON.parse(JSON.stringify(T)))); }
    assert.equal(T.fase, 'fin'); }
  ok('Mus: lances, 8 reyes, recuento de tantos, envites, órdago y 60 partidas completas'); }
// ---- Hundir la Flota ----
{ const S = FL.crear({ flota: 'espanola', tocar: false });
  assert.ok(FL.colocar(S, 0, 0, 0, false)); assert.ok(!FL.colocar(S, 0, 6, 4, false)); assert.ok(!FL.colocar(S, 0, 6, 12, false)); assert.ok(FL.colocar(S, 0, 6, 15, false)); assert.ok(!FL.colocar(S, 0, 1, 8, false));
  for (const flota of Object.keys(FL.FLOTAS)) for (const tocar of [false, true]) for (let g = 0; g < 12; g++) {
    const T = FL.crear({ flota, modo: 'cpu', nivel: ['facil', 'medio', 'dificil'][g % 3], tocar, repetir: g % 2 === 0 }); assert.ok(FL.alAzar(T, 0)); assert.ok(FL.listo(T, 0));
    let k = 0; while (T.fase === 'jugar' && k++ < 600) { const p = T.turno, i = FL.sugerencia(T, p, ['facil', 'medio', 'dificil'][(g + p) % 3]); assert.ok(FL.disparar(T, p, i)); assert.ok(FL.validar(JSON.parse(JSON.stringify(T)))); }
    assert.equal(T.fase, 'fin'); assert.ok(FL.quedan(T, 1 - T.ganador).length === 0); }
  const D = FL.crear({ modo: 'dos', flota: 'rapida' }); FL.alAzar(D, 0); FL.listo(D, 0); assert.equal(D.fase, 'pasar'); FL.continuar(D); assert.equal(D.colocando, 1); FL.alAzar(D, 1); FL.listo(D, 1); FL.continuar(D); assert.equal(D.fase, 'jugar');
  ok('Hundir la Flota: colocación sin tocarse, 3 flotas, IA, pasar el móvil y partidas completas'); }
// ---- Rummy de fichas ----
{ const f = (c, n, k = 0) => k * 52 + c * 13 + n - 1;
  assert.equal(RM.analizar([f(0, 5), f(1, 5), f(2, 5)]).tipo, 'grupo'); assert.ok(!RM.valida([f(0, 5), f(0, 5, 1), f(2, 5)]));
  assert.deepEqual(RM.analizar([f(3, 12), f(3, 13), 104]).orden, [104, f(3, 12), f(3, 13)]); assert.ok(!RM.valida([f(3, 13), f(3, 1), f(3, 2)]));
  const S = RM.crear({ jugadores: [{ nombre: 'A' }, { nombre: 'B' }] }); S.turno = 0; S.mesa = [];
  S.jug[0].fichas = [f(0, 1), f(0, 2), f(0, 3), f(1, 10), f(2, 10), f(3, 10), f(0, 7)];
  assert.match(RM.comprobar(S, 0, [[f(0, 1), f(0, 2), f(0, 3)]], [f(1, 10), f(2, 10), f(3, 10), f(0, 7)]), /30/);            // 6 puntos: no llega
  assert.equal(RM.comprobar(S, 0, [[f(0, 1), f(0, 2), f(0, 3)], [f(1, 10), f(2, 10), f(3, 10)]], [f(0, 7)]), '');            // 6 + 30 = 36: vale
  assert.match(RM.comprobar(S, 0, [[f(0, 1), f(0, 2)], [f(1, 10), f(2, 10), f(3, 10)]], [f(0, 3), f(0, 7)]), /no válidas/);   // jugada de 2 fichas
  for (let g = 0; g < 30; g++) { const T = RM.crear({ jugadores: Array.from({ length: 2 + g % 3 }, (_, k) => ({ nombre: 'J' + k, cpu: true })), nivel: ['facil', 'medio', 'dificil'][g % 3] }); let k = 0;
    while (T.fase === 'jugar' && k++ < 3000) { const p = T.turno, s = RM.sugerir(T, p); if (s) assert.equal(RM.jugar(T, p, s.mesa, s.mano), ''); else assert.ok(RM.robar(T, p)); assert.ok(RM.validar(JSON.parse(JSON.stringify(T)))); }
    assert.equal(T.fase, 'fin'); }
  ok('Rummy de fichas: grupos, escaleras con comodín, bajada de 30 y partidas completas de 2 a 4 jugadores'); }
// ---- Juego de la Oca ----
{ const nuevo = (o = {}) => OC.crear({ jugadores: [{ nombre: 'A' }, { nombre: 'B' }, { nombre: 'C' }], ...o });
  let S = nuevo(); assert.ok(OC.tirar(S, [5]).otra); assert.equal(S.jug[0].pos, 9); OC.tirar(S, [3]); assert.equal(S.jug[0].pos, 6);   // oca → 9; 12 puente → 6
  S = nuevo(); S.jug[0].pos = 40; OC.tirar(S, [2]); assert.equal(S.jug[0].pos, 30);
  S = nuevo(); S.jug[0].pos = 55; OC.tirar(S, [3]); assert.equal(S.jug[0].pos, 1);
  S = nuevo(); S.jug[0].pos = 60; OC.tirar(S, [6]); assert.equal(S.jug[0].pos, 60);
  S = nuevo(); S.jug[0].pos = 57; OC.tirar(S, [2]); assert.equal(S.fase, 'fin');
  S = nuevo(); S.jug[0].pos = 13; OC.tirar(S, [6]); OC.tirar(S, [1]); OC.tirar(S, [1]); assert.equal(S.turno, 1);
  S = nuevo(); S.jug[0].pos = 28; OC.tirar(S, [3]); assert.ok(S.jug[0].pozo); S.jug[1].pos = 29; OC.tirar(S, [2]); assert.ok(!S.jug[0].pozo && S.jug[1].pozo);
  S = nuevo({ dados: 2 }); OC.tirar(S, [6, 3]); assert.equal(S.jug[0].pos, 26);
  assert.equal(new Set(OC.ESPIRAL.map(([f, c]) => f * 8 + c)).size, 64);
  for (let g = 0; g < 300; g++) { const T = OC.crear({ jugadores: Array.from({ length: 2 + g % 3 }, (_, k) => ({ nombre: 'J' + k, cpu: true })), dados: 1 + g % 2, pozo: g % 2 ? 'turnos' : 'rescate' }); let k = 0; while (T.fase === 'tirar' && k++ < 5000) { assert.ok(OC.tirar(T)); assert.ok(OC.validar(JSON.parse(JSON.stringify(T)))); } assert.equal(T.fase, 'fin'); }
  ok('Juego de la Oca: ocas, puentes, dados, laberinto, muerte, rebote, posada, pozo y 300 partidas completas'); }
// ---- Cinquillo ----
{ const S = CQ.crear({ jugadores: [{ nombre: 'A' }, { nombre: 'B' }, { nombre: 'C' }, { nombre: 'D' }] }), j = S.turno;
  assert.deepEqual(CQ.jugables(S), [4]); assert.ok(!CQ.pasar(S, j)); assert.ok(CQ.jugar(S, j, 4));
  assert.ok(CQ.cabe(S, 3) && CQ.cabe(S, 5) && CQ.cabe(S, 14) && !CQ.cabe(S, 13) && !CQ.cabe(S, 6));
  S.mesa[0] = { lo: 2, hi: 6 }; assert.ok(CQ.cabe(S, 7) && CQ.cabe(S, 1));                 // el 7 enlaza con la sota
  for (let g = 0; g < 200; g++) { const T = CQ.crear({ jugadores: Array.from({ length: 3 + g % 2 }, (_, k) => ({ nombre: 'J' + k, cpu: true })), nivel: ['facil', 'medio', 'dificil'][g % 3], rondas: [1, 3, 5][g % 3] }); let k = 0;
    while (T.fase !== 'fin' && k++ < 5000) { if (T.fase === 'finRonda') { CQ.siguienteRonda(T); continue; } const c = CQ.cpuCarta(T); if (c < 0) assert.ok(CQ.pasar(T, T.turno)); else assert.ok(CQ.jugar(T, T.turno, c)); assert.ok(CQ.validar(JSON.parse(JSON.stringify(T)))); }
    assert.equal(T.fase, 'fin'); }
  ok('Cinquillo: 5 de oros obligatorio, cartas contiguas, pasar solo sin jugada y 200 partidas completas'); }
// ---- Continental ----
{ const c = (p, r, m = 0) => m * 52 + p * 13 + r;
  assert.equal(CN.analizar([c(0, 4), c(1, 4), c(2, 4, 1)]).tipo, 'trio'); assert.ok(!CN.valida([c(0, 4), 104, 105]));
  assert.equal(CN.analizar([c(1, 10), c(1, 11), c(1, 12), c(1, 0)]).inicio, 10); assert.equal(CN.analizar([c(1, 0), c(1, 1), c(1, 2), c(1, 3)]).inicio, 0); assert.ok(!CN.valida([c(1, 11), c(1, 12), c(1, 0), c(1, 1)]));
  const mano = [c(0, 4), c(1, 4), c(2, 4), c(3, 6), c(3, 7), c(3, 8), c(3, 9), c(0, 12)], b = CN.mejorBajada(mano, CN.CONTRATOS[1]);
  assert.ok(b && b.jugadas.length === 2); assert.deepEqual(b.resto, [c(0, 12)]); assert.equal(CN.mejorBajada(mano.slice(0, 7), CN.CONTRATOS[1]), null);
  assert.ok(CN.mejorBajada([c(0, 1), 104, c(0, 3), c(0, 4), c(1, 6), c(1, 7), 105, c(1, 9), c(2, 9), c(2, 10), c(2, 11), c(2, 12), c(3, 0)], CN.CONTRATOS[6]));
  for (let g = 0; g < 24; g++) { const S = CN.crear({ jugadores: Array.from({ length: 2 + g % 3 }, (_, k) => ({ nombre: 'J' + k, cpu: true })), nivel: ['facil', 'medio', 'dificil'][g % 3] }); let k = 0;
    while (S.fase !== 'fin' && k++ < 20000) { if (S.fase === 'finRonda') { CN.siguienteRonda(S); continue; } CN.cpuTurno(S, S.turno); assert.ok(CN.validar(JSON.parse(JSON.stringify(S)))); }
    assert.equal(S.fase, 'fin'); assert.equal(S.jug[0].rondas.length, 7); }
  ok('Continental: tríos, escaleras con As alto/bajo y comodín, contratos, bajada óptima y partidas completas de 7 rondas'); }
// ---- El Rosco ----
{ assert.ok(RC.correcta('arbol', ['ÁRBOL'])); assert.ok(RC.correcta('nevera', ['FRIGORÍFICO', 'NEVERA'])); assert.ok(!RC.correcta('', ['A']));
  for (const nivel of Object.keys(RC.NIVEL)) for (let i = 0; i < 60; i++) for (const l of RC.nuevoRosco(nivel)) { const w = RC.base(l.resp[0]); assert.ok(l.tipo === 'empieza' ? w[0] === l.L : w.includes(l.L), `${l.L} ${w}`); }
  let S = RC.crear({ modo: 'solo', nivel: 'facil' }); while (S.fase === 'jugar') RC.responder(S, RC.actual(S).resp[0]); assert.equal(RC.aciertos(S.jug[0]), 25);
  S = RC.crear({ modo: 'cpu' }); RC.responder(S, 'mal'); assert.equal(S.turno, 1);
  for (let g = 0; g < 100; g++) { const T = RC.crear({ modo: 'cpu', nivel: ['facil', 'normal', 'dificil'][g % 3], tiempo: 150 }); let k = 0;
    while (T.fase === 'jugar' && k++ < 500) { const c = RC.cpuPiensa(T); RC.descontar(T, c.ms); if (T.fase !== 'jugar' || T.jug[T.turno].fin) continue; if (c.tipo === 'pasa') RC.pasapalabra(T); else RC.responder(T, c.tipo === 'ok' ? c.texto : 'zzz'); assert.ok(RC.validar(JSON.parse(JSON.stringify(T)))); }
    assert.equal(T.fase, 'fin'); }
  ok('El Rosco: 25 letras (empieza/contiene), respuestas sin tildes, pasapalabra, duelo con reloj y CPU'); }
// ---- Encadenadas ----
{ const casos = { casa: 'ca-sa', perro: 'pe-rro', camión: 'ca-mión', león: 'le-ón', día: 'dí-a', cielo: 'cie-lo', obstáculo: 'obs-tá-cu-lo', perspectiva: 'pers-pec-ti-va', rey: 'rey', ayer: 'a-yer', pingüino: 'pin-güi-no', biblioteca: 'bi-blio-te-ca', construir: 'cons-truir', búho: 'bú-ho', ciudad: 'ciu-dad' };
  for (const [w, esp] of Object.entries(casos)) assert.equal(silabas(w).join('-'), esp, w);
  assert.equal(EN.requisito('casa').req, 'sa'); assert.equal(EN.requisito('perro').req, 'ro'); assert.equal(EN.requisito('mueble').req, 'le'); assert.equal(EN.requisito('casa', 'letra').req, 'a');
  const S = EN.crear({ modo: 'cpu' }); S.turno = 0; S.req = 'sa';
  assert.match(EN.comprobar(S, 'perro'), /empezar/); assert.equal(EN.comprobar(S, 'sapo'), ''); assert.equal(EN.comprobar(S, 'saxofonista'), 'NO_DIC'); assert.equal(EN.comprobar(S, 'saxofonista', true), '');
  assert.equal(EN.jugar(S, 'sapo'), ''); assert.equal(S.req, 'po'); assert.equal(S.turno, 1);
  for (let g = 0; g < 90; g++) { const T = EN.crear({ modo: g % 4 ? 'cpu' : 'solo', nivel: ['facil', 'normal', 'dificil'][g % 3], enlace: ['silaba', 'dos', 'letra'][g % 3] }); let k = 0;
    while (T.fase === 'jugar' && k++ < 2000) { const w = EN.cpuPalabra(T); if (w) assert.equal(EN.jugar(T, w), ''); else EN.fallar(T); assert.ok(EN.validar(JSON.parse(JSON.stringify(T)))); }
    assert.equal(T.fase, 'fin'); }
  ok(`Encadenadas: sílabas, enlaces (rr → r, sílabas imposibles), diccionario de ${EN.diccionario().size} palabras y partidas completas`); }
// ---- Serpiente ----
{ let S = SN.crear({ modo: 'clasico', tam: 'pequeno' }); const n = S.n;
  assert.equal(SN.paso(S, 3), 'mover'); assert.equal(S.dir, 1);                                       // no gira 180°
  S = SN.crear({ tam: 'pequeno' }); S.comida = S.serp[0] + 1; assert.equal(SN.paso(S), 'comer'); SN.paso(S); assert.equal(S.serp.length, 4);
  S = SN.crear({ tam: 'pequeno' }); let ev; for (let k = 0; k < 20 && S.fase === 'jugar'; k++) { S.comida = 0; ev = SN.paso(S, 1); } assert.equal(S.motivo, 'pared');
  S = SN.crear({ modo: 'libre', tam: 'pequeno' }); for (let k = 0; k < n + 2; k++) { S.comida = 0; assert.notEqual(SN.paso(S, 1), 'muerte'); }
  S = SN.crear(); { const m = S.n; S.serp = [5 * m + 5, 5 * m + 6, 6 * m + 6, 6 * m + 5, 6 * m + 4]; S.dir = 3; S.comida = 0; assert.equal(SN.paso(S, 2), 'muerte'); assert.equal(S.motivo, 'cuerpo'); }
  for (const modo of Object.keys(SN.MODOS)) { const T = SN.crear({ modo, tam: 'grande' }); assert.ok(!T.muros.includes(T.serp[0]) && SN.validar(JSON.parse(JSON.stringify(T)))); }
  ok('Serpiente: giros, crecer, paredes, sin paredes, choque con el cuerpo y laberinto'); }
// ---- Bloques ----
{ const W = BL.W, H = BL.H;
  { const S = BL.crear(); assert.equal(new Set([S.p.t, ...S.cola, ...S.bolsa].slice(0, 7)).size, 7); }
  { const S = BL.crear(); S.p = { t: 1, r: 0, x: 0, y: 0 }; for (let x = 4; x < W; x++) S.tab[(H - 1) * W + x] = 2; const ev = BL.soltar(S); assert.equal(ev.lineas, 1); assert.equal(ev.puntos, 100); }
  { const S = BL.crear(); for (let y = H - 4; y < H; y++) for (let x = 0; x < 9; x++) S.tab[y * W + x] = 3; S.p = { t: 1, r: 1, x: 7, y: 0 }; const ev = BL.soltar(S); assert.equal(ev.lineas, 4); assert.ok(ev.puntos >= 800); }
  { const S = BL.crear(), cuad = () => { S.tab.fill(0); for (let y = H - 4; y < H; y++) for (let x = 0; x < 9; x++) S.tab[y * W + x] = 3; S.p = { t: 1, r: 1, x: 7, y: 2 }; return BL.soltar(S); };
    const a = cuad(); assert.equal(a.b2b, false); assert.equal(a.puntos, 800);                        // el primero no es «seguido»
    const b = cuad(); assert.equal(b.b2b, true); assert.equal(b.puntos, 1200 + 50 * 1); }              // el segundo sí: ×1,5 y combo
  { const S = BL.crear(); S.p = { t: 1, r: 1, x: -2, y: 5 }; assert.ok(BL.choca(S, S.p, 0, 0, 2)); assert.ok(BL.rotar(S, 1)); assert.ok(!BL.choca(S, S.p)); }
  { const S = BL.crear(); const t = S.p.t; assert.ok(BL.reservar(S)); assert.equal(S.reserva, t); assert.ok(!BL.reservar(S)); }
  { const S = BL.crear(); const n0 = S.piezas; for (let k = 0; k < 700; k++) BL.avanzar(S, 50); assert.ok(S.piezas > n0); }
  { const S = BL.crear(); let k = 0; while (S.fase === 'jugar' && k++ < 200) BL.soltar(S); assert.equal(S.motivo, 'arriba'); }
  { const S = BL.crear({ modo: 'ultra' }); for (let k = 0; k < 200 && S.fase === 'jugar'; k++) BL.avanzar(S, 1000); assert.equal(S.fase, 'fin'); }
  { const S = BL.crear(); assert.ok(BL.validar(JSON.parse(JSON.stringify(S)))); }
  ok('Bloques: bolsa de 7, líneas y cuádruple, giros con empujón, reserva, gravedad, fin y modo Ultra'); }
// ---- Rompe-Ladrillos ----
{ for (const n of LD.NIVELES) for (const f of n) assert.ok(f.length === 10 && !/[^.1-6DTM?]/.test(f));
  { const S = LD.crear(); LD.sacar(S); const b = S.bolas[0]; b.x = S.pala.x + S.pala.w / 2 - 2; b.y = LD.PALA_Y - 30; b.vx = 0; b.vy = .5; LD.avanzar(S, 60); assert.ok(b.vx > 0 && b.vy < 0); }
  { const S = LD.crear(); S.ladrillos = [{ c: 4, f: 5, tipo: 'd', color: 0, golpes: 2 }, { c: 0, f: 0, tipo: 'n', color: 1, golpes: 1 }]; LD.sacar(S); const b = S.bolas[0], r = LD.rectLadrillo(S.ladrillos[0]);
    b.x = r.x + 50; b.y = r.y + r.h + 40; b.vx = 0; b.vy = -.5; for (let k = 0; k < 10; k++) LD.avanzar(S, 16); assert.equal(S.ladrillos.find(l => l.tipo === 'd').golpes, 1); }
  { const S = LD.crear(); S.ladrillos = [{ c: 4, f: 5, tipo: 'n', color: 1, golpes: 1 }, { c: 4, f: 4, tipo: 'n', color: 1, golpes: 1 }, { c: 0, f: 0, tipo: 'n', color: 1, golpes: 1 }]; LD.sacar(S); S.efectos.fuego = 5000;
    const b = S.bolas[0], r = LD.rectLadrillo(S.ladrillos[0]); b.x = r.x + 50; b.y = r.y + r.h + 40; b.vx = 0; b.vy = -.5; for (let k = 0; k < 20; k++) LD.avanzar(S, 16); assert.equal(S.ladrillos.length, 1); }
  { const S = LD.crear(); LD.sacar(S); for (let k = 0; k < 400 && S.fase !== 'fin'; k++) LD.avanzar(S, 16, { x: 50 }); assert.ok(S.vidas < LD.VIDAS); }      // sin mover la pala, se pierden vidas
  { let n = 0; for (let g = 0; g < 4; g++) { const S = LD.crear({ nivel: 1 + g * 3 }); let t = 0, off = 0; while (S.fase !== 'nivel' && S.fase !== 'fin' && t < 900000) { if (S.fase === 'listo') LD.sacar(S); const b = S.bolas.filter(x => !x.pegada).sort((a, c) => c.y - a.y)[0]; if (b && b.vy < 0) off = (Math.random() - .5) * S.pala.w * .75; LD.avanzar(S, 16, { x: b ? b.x + off : S.pala.x }); t += 16; for (const x of S.bolas) assert.ok(x.x >= 0 && x.x <= LD.ANCHO && x.y >= -1); } if (S.fase === 'nivel') n++; } assert.ok(n >= 3, 'niveles completados: ' + n); }
  ok('Rompe-Ladrillos: niveles, rebote en la pala, ladrillos duros, bola de fuego, vidas y niveles completables'); }
// ---- Ahorcado ----
for (const nv of Object.keys(NAh)) assert.ok(candAh(nv, 'mezcla').length > 100); ok('Ahorcado: bancos de palabras para los 4 niveles');
console.log(`\n${n} pruebas correctas`);
