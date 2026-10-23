// Pruebas de los motores (sin navegador):  node tests/motores.mjs
import assert from 'node:assert/strict';
import * as CY from '../js/games/cifrasletras/motor.js';
import * as BI from '../js/games/billar/motor.js';
import * as SC from '../js/games/scrabble/motor.js';
import { construir as construirSC, aFichas } from '../js/games/scrabble/diccio.js';
import * as CO from '../js/games/corazones/motor.js';
import * as KA from '../js/games/kakuro/generador.js';
import { validar as validarKA } from '../js/games/kakuro/index.js';
import * as SK from '../js/games/sokoban/motor.js';
import { NIVELES as SKN } from '../js/games/sokoban/niveles.js';
import * as AH from '../js/games/airhockey/motor.js';
import * as PC from '../js/games/pokercub/motor.js';
import { readFileSync } from 'node:fs';
import * as DIC from '../js/core/diccionario.js';
import { Partida as MTPartida, validar as validarMT, MAZOS as MTMAZOS } from '../js/games/magnate/motor.js';
import { CASILLAS as MTC, GRUPOS as MTG } from '../js/games/magnate/datos.js';
import { calificar } from '../js/games/sudoku/generador.js';
import { cuadradoLatino } from '../js/games/kenken/generador.js';
import { conSemilla, mulberry32 } from '../js/core/semilla.js';
import { CLASICAS } from '../js/games/trivial/clasicas.js';
import { elegirPorRegla } from '../js/games/damas/ia.js';
import * as PZ from '../js/games/parchis/reglas.js';
import { BANCO as BRosco, LETRAS as LRosco } from '../js/games/rosco/palabras.js';
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
{ // Regresión: all-in corto en la ciega grande y el otro se retira habiendo puesto más → lo no disputado vuelve a su dueño
  const S = HE.crear(2, 'facil'); S.fase = 'preflop'; S.turno = 1; S.apuestaMax = 150; S.ultRaise = 150; S.bb = 150;
  Object.assign(S.jug[0], { stack: 1000, apuesta: 0, inv: 0, fold: true, allin: false });
  Object.assign(S.jug[1], { stack: 3810, apuesta: 75, inv: 75, fold: false, allin: false });
  Object.assign(S.jug[2], { stack: 0, apuesta: 15, inv: 15, fold: false, allin: true });
  const total = S.jug.reduce((t, p) => t + p.stack + p.inv, 0);
  assert.ok(HE.actuar(S, 1, { t: 'fold' })); assert.equal(S.fase, 'fin');
  assert.equal(S.jug.reduce((t, p) => t + p.stack, 0), total);              // no se pierde ninguna ficha
  assert.equal(S.jug[2].stack, 30); assert.equal(S.jug[1].stack, 3810 + 60);  // Marta gana 30; a Ana le vuelven 60
  assert.match(S.resultado.texto, /se devuelven 60/); ok('Hold\'em: las fichas no disputadas se devuelven (sin pérdidas)'); }
for (let g = 0; g < 4; g++) { const S = HE.crear(2 + g % 4, 'facil'); S.jug.forEach(p => { p.bot = true; }); let guardia = 0;
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
// ---- Chinchón con comodines ----
{ const id = (p, r) => p * 10 + [1, 2, 3, 4, 5, 6, 7, 10, 11, 12].indexOf(r);
  assert.deepEqual([2, 3, 4].map(n => CH.numComodines(n, true)), [2, 2, 3]); assert.equal(CH.numComodines(3, false), 0);
  const m1 = CH.mejor([id(0, 5), id(0, 6), 40, id(1, 12), id(2, 12), id(3, 1), id(3, 2)]);   // el comodín rinde más con los dos reyes (suelto, 14 puntos) que con 5-6 de oros
  assert.equal(m1.puntos, 14); assert.ok(m1.ligas.some(l => l.includes(40) && l.filter(c => !CH.esComodin(c)).every(c => CH.pos(c) === CH.pos(id(1, 12)))));
  assert.equal(CH.mejor([id(0, 5), id(1, 5), 41, id(2, 12), id(3, 12), 40, id(0, 1)]).puntos, 1);   // trío de 5 con comodín + dos reyes con comodín
  assert.equal(CH.mejor([id(0, 1), 40, 41, id(1, 3), id(2, 7), id(3, 7), id(0, 12)]).puntos, 14);    // 7-7 con los dos comodines (cuarteto)
  assert.equal(CH.mejor([id(0, 1), 40, id(1, 3), id(2, 7), id(3, 12), id(0, 12), id(1, 10)]).puntos, 21);   // reyes + comodín; sueltas 1+3+7+10
  assert.equal(CH.valor(40), 25); assert.equal(CH.mejor([id(0, 1), id(1, 2), id(2, 3), 40, 41, id(0, 5), id(0, 6)]).puntos, 6);   // 5-6 de oros con los dos comodines
  assert.ok(CH.esChinchon([id(1, 1), id(1, 2), 40, id(1, 4), id(1, 5), id(1, 6), id(1, 7)])); assert.ok(!CH.esChinchon([id(1, 1), id(1, 2), 40, id(1, 4), id(1, 5), id(1, 6), id(2, 7)]));
  assert.ok(CH.esChinchon([id(1, 3), id(1, 4), id(1, 5), 40, id(1, 7), id(1, 10), id(1, 11)]));          // el comodín hace de 6
  assert.ok(CH.esChinchon([id(1, 1), 40, 41, 42, id(1, 5), id(1, 6), id(1, 7)]));                        // tres comodines en el hueco
  assert.ok(!CH.esChinchon([id(1, 1), id(1, 12), 40, 41, 42, id(1, 5), id(1, 6)]));                      // el 1 y el rey no caben en 7 cartas
  assert.equal(CH.mejor([40, 41, id(0, 1), id(1, 2), id(2, 3), id(3, 4), id(0, 12)]).puntos >= 0, true);
  const t0 = Date.now(), tot = [0, 0, 0];
  for (let i = 0; i < 90; i++) { const n = 2 + i % 3, S = CH.crear({ jugadores: Array.from({ length: n }, (_, k) => ({ nombre: 'J' + k, cpu: true })), nivel: ['facil', 'medio', 'dificil'][i % 3], limite: [50, 100][i % 2], cierre: [3, 5][i % 2], comodines: true });
    assert.equal(S.nCom, n === 4 ? 3 : 2); assert.equal(S.mazo.length + S.descarte.length + S.manos.flat().length, 40 + S.nCom); let g = 0;
    while (S.fase !== 'fin' && g++ < 20000) {
      if (S.fase === 'recuento') { CH.siguienteMano(S); continue; }
      if (S.fase === 'robar') assert.notEqual(CH.robar(S, CH.cpuRobar(S)), false); else { const t = CH.cpuTirar(S); assert.ok(t.cerrar ? CH.cerrar(S, t.c) : CH.tirar(S, t.c)); }
      if (S.fase !== 'fin') assert.ok(CH.validar(JSON.parse(JSON.stringify(S)))); }
    assert.equal(S.fase, 'fin'); const v = CH.validar(JSON.parse(JSON.stringify(S))); assert.ok(v && v.nCom === S.nCom); tot[0]++; }
  assert.equal(CH.crear({ jugadores: [{ nombre: 'A' }, { nombre: 'B' }] }).nCom, 0);
  assert.ok(CH.validar(JSON.parse(JSON.stringify((() => { const S = CH.crear({ jugadores: [{ nombre: 'A' }, { nombre: 'B' }] }); delete S.nCom; return S; })()))));   // partidas guardadas antes: sin comodines
  assert.ok(Date.now() - t0 < 60000, 'demasiado lento');
  ok('Chinchón con comodines: reparto de 2/3 comodines, jugadas con comodín, chinchón con comodín, 90 partidas completas válidas y compatibilidad con partidas guardadas'); }
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
{ assert.deepEqual([2, 3, 4].map(n => CN.numComodines(n, true)), [3, 3, 4]); assert.equal(CN.numComodines(4, false), 0);
  for (let g = 0; g < 18; g++) { const n = 2 + g % 3, con = g % 6 < 4, S = CN.crear({ jugadores: Array.from({ length: n }, (_, k) => ({ nombre: 'J' + k, cpu: true })), nivel: ['facil', 'medio', 'dificil'][g % 3], comodines: con });
    const esp = con ? (n === 4 ? 4 : 3) : 0; assert.equal(S.nCom, esp);
    const cuenta = () => S.mazo.length + S.descarte.length + S.mesa.flatMap(x => x.cartas).length + S.jug.flatMap(J => J.cartas).length; assert.equal(cuenta(), 104 + esp);
    assert.equal([...S.mazo, ...S.descarte, ...S.jug.flatMap(J => J.cartas)].filter(CN.esComodin).length, esp); let k = 0;
    while (S.fase !== 'fin' && k++ < 20000) { if (S.fase === 'finRonda') { CN.siguienteRonda(S); assert.equal(cuenta(), 104 + esp); continue; } CN.cpuTurno(S, S.turno); const v = CN.validar(JSON.parse(JSON.stringify(S))); assert.ok(v && v.nCom === esp); }
    assert.equal(S.fase, 'fin'); }
  const viejo = CN.crear({ jugadores: Array.from({ length: 4 }, (_, k) => ({ nombre: 'J' + k })) }); assert.equal(viejo.nCom, 4); delete viejo.nCom;
  assert.equal(CN.validar(JSON.parse(JSON.stringify(viejo))).nCom, 4);   // partidas guardadas antes de la opción: 4 comodines
  ok('Continental con y sin comodines: 3 con 2-3 jugadores, 4 con 4, ninguno si se desactiva, y 18 partidas completas válidas'); }
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
  { const S = LD.crear(); LD.sacar(S); for (let k = 0; k < 20000 && S.vidas === LD.VIDAS; k++) { if (S.fase === 'listo') LD.sacar(S); LD.avanzar(S, 16, { x: 50 }); } assert.ok(S.vidas < LD.VIDAS); }      // sin mover la pala, acaba perdiéndose una vida
  { let n = 0; for (let g = 0; g < 4; g++) { const S = LD.crear({ nivel: 1 + g * 3 }); let t = 0, off = 0; while (S.fase !== 'nivel' && S.fase !== 'fin' && t < 900000) { if (S.fase === 'listo') LD.sacar(S); const b = S.bolas.filter(x => !x.pegada).sort((a, c) => c.y - a.y)[0]; if (b && b.vy < 0) off = (Math.random() - .5) * S.pala.w * .75; LD.avanzar(S, 16, { x: b ? b.x + off : S.pala.x }); t += 16; for (const x of S.bolas) assert.ok(x.x >= 0 && x.x <= LD.ANCHO && x.y >= -1); } if (S.fase === 'nivel') n++; } assert.ok(n >= 3, 'niveles completados: ' + n); }
  ok('Rompe-Ladrillos: niveles, rebote en la pala, ladrillos duros, bola de fuego, vidas y niveles completables'); }
// ---- Ahorcado ----
for (const nv of Object.keys(NAh)) assert.ok(candAh(nv, 'mezcla').length > 100); ok('Ahorcado: bancos de palabras para los 4 niveles');

// ==================== Pruebas de las mejoras ====================
// ---- Reto del día: con la misma semilla sale el mismo tablero ----
{ const a = conSemilla('2026-10-17:sudoku', () => generar('medio')), b = conSemilla('2026-10-17:sudoku', () => generar('medio')), c = conSemilla('2026-10-18:sudoku', () => generar('medio'));
  assert.deepEqual(a.cur, b.cur); assert.notDeepEqual(a.cur, c.cur);
  const r = mulberry32(1); assert.ok([0, 0, 0].map(() => r()).every(x => x >= 0 && x < 1));
  ok('Reto del día: misma semilla → mismo tablero; otro día → otro tablero'); }
// ---- Sudoku: niveles calificados por técnica ----
{ for (const [nv, t] of [['medio', 1], ['dificil', 2], ['experto', 3]]) { let bien = 0; for (let k = 0; k < 4; k++) { const g = generar(nv); assert.equal(contarSoluciones(g.cur, 2), 1); if (calificar(g.cur) === t) bien++; } assert.ok(bien >= 3, `${nv}: ${bien}/4`); }
  ok('Sudoku: Medio se resuelve con únicos, Difícil pide técnicas intermedias y Experto avanzadas'); }
// ---- KenKen: cuadrados latinos variados y 7×7 ----
{ const vistos = new Set(); for (let k = 0; k < 2500; k++) { const q = cuadradoLatino(4); for (let i = 0; i < 4; i++) { assert.equal(new Set(q.slice(i * 4, i * 4 + 4)).size, 4); assert.equal(new Set([0, 1, 2, 3].map(f => q[f * 4 + i])).size, 4); } vistos.add(q.join('')); }
  assert.ok(vistos.size > 432, 'cuadrados 4×4 distintos: ' + vistos.size);      // el generador anterior nunca pasaba de 432
  for (const d of Object.keys(DKk)) { const p = generarKk(7, d); assert.equal(contarKk(7, p.cages, 2, 20000), 1); }
  ok('KenKen: cuadrados latinos realmente aleatorios (más de los 432 a los que llegaba el anterior en 4×4) y 7×7 con solución única'); }
// ---- Buscaminas: tableros sin adivinar y personalizado ----
{ for (const nv of Object.keys(BM.NIVELES)) { const c = BM.NIVELES[nv], ini = (c.h >> 1) * c.w + (c.w >> 1); const r = BM.crearMinasLogicas(c.w, c.h, c.m, ini, 5000); assert.ok(r.ok); assert.ok(BM.resolublePorLogica(c.w, c.h, r.minas, ini)); }
  const S = BM.nuevo('personal', { w: 7, h: 9, m: 12 }); assert.equal(S.rev.length, 63); assert.equal(S.m, 12);
  assert.equal(BM.medidas('personal', { w: 99, h: 9, m: 999 }).w, 10);
  ok('Buscaminas: generador sin adivinar en los 3 niveles y tablero personalizado'); }
// ---- Damas: brasileñas e internacionales 10×10 ----
{ const R = REGLAS.internacional, b = tableroInicial(R); assert.equal(b.length, 10); assert.equal(b.flat().filter(x => x === 'w').length, 20);
  const t = Array.from({ length: 8 }, () => Array(8).fill(0)); t[4][3] = 'w'; t[5][4] = 'b';           // peón que captura hacia atrás
  assert.ok(jugadas(t, 'w', REGLAS.brasilena).some(m => m.caps.length)); assert.ok(!jugadas(t, 'w', REGLAS.espanola).some(m => m.caps.length));
  for (const regla of ['brasilena', 'internacional']) { let e = { b: tableroInicial(REGLAS[regla]), t: 'w' }, k = 0;
    while (k++ < 300) { const js = jugadas(e.b, e.t, REGLAS[regla]); if (!js.length) break; const m = e.t === 'w' ? elegirPorRegla(e.b, 'w', regla, 'facil') : js[Math.floor(Math.random() * js.length)]; assert.ok(js.some(x => JSON.stringify(x.path) === JSON.stringify(m.path))); e = { b: aplicar(e.b, m), t: e.t === 'w' ? 'b' : 'w' }; } }
  ok('Damas: brasileñas e internacionales 10×10 (captura hacia atrás, partidas completas con la IA)'); }
// ---- Parchís por parejas ----
{ for (let g = 0; g < 10; g++) { const P = PZ.nuevaPartida({ am: 'c', az: 'c', ro: 'c', ve: 'c' }, {}, { parejas: true }); let t = 0;
    while (P.phase !== 'over' && t++ < 30000) { if (P.phase === 'roll') PZ.tirar(P, 1 + Math.floor(Math.random() * 6)); else if (P.phase === 'move') { const m = PZ.mejorJugada(P); assert.ok(!m.cap || !PZ.amigos(P, m.cap.c, m.c)); PZ.mover(P, m); } else PZ.siguiente(P); }
    assert.equal(P.phase, 'over'); assert.ok(P.pieces[P.winner].every(p => p === 71) && P.pieces[PZ.COMPANERO[P.winner]].every(p => p === 71)); }
  ok('Parchís por parejas: nunca se come al compañero y gana la pareja con sus 8 fichas en meta'); }
// ---- Trivial: preguntas clásicas ----
{ for (const b of BLOQUES) { const l = CLASICAS[b.id]; assert.ok(l && l.length >= 15); for (const q of l) assert.ok(q.length === 5 && new Set(q.slice(1)).size === 4); }
  for (const banco of ['cla', 'mix']) for (const modo of ['opciones', 'escribir']) { const S = TV.crear({ nCat: 9, modo, nivel: 'medio', banco, jugadores: [{ nombre: 'A', cpu: true }, { nombre: 'B', cpu: true }] }); let k = 0;
    while (S.fase !== 'fin' && k++ < 6000) { if (S.fase === 'tirar') TV.tirar(S); else if (S.fase === 'mover') TV.mover(S, TV.cpuSentido(S)); else if (S.fase === 'pregunta') { TV.responder(S, TV.cpuRespuesta(S)); assert.ok(TV.validar(JSON.parse(JSON.stringify(S)))); } else TV.continuar(S); }
    assert.equal(S.fase, 'fin'); }
  ok('Trivial: 15 preguntas clásicas por categoría y partidas completas con clásicas y mezcla'); }
// ---- Klondike: Vegas y repartos con solución ----
{ const S = KL.nuevo(1, true, true); assert.equal(KL.puntosVegas(S), -52); while (S.stock.length) KL.robarStock(S); assert.ok(!KL.robarStock(S), 'Vegas robando de 1: una sola pasada');
  const T = KL.nuevo(3, true, true); for (let k = 0; k < 3; k++) { while (T.stock.length) KL.robarStock(T); if (k < 2) assert.ok(KL.robarStock(T)); } assert.ok(!KL.robarStock(T), 'Vegas robando de 3: tres pasadas');
  let gan = 0; for (let k = 0; k < 6 && !gan; k++) if (resolverKl(KL.nuevo(1, true), { ms: 1500 }).r === 'ganable') gan++; assert.ok(gan);
  ok('Klondike: puntuación y pasadas de Vegas, y el analizador encuentra repartos ganables'); }
// ---- Hold'em: partida libre ----
{ const S = HE.crear(3, 'facil', 'Tú', 'libre', 'alta');
  for (let m = 0; m < 60; m++) { HE.nuevaMano(S); let k = 0; while (['preflop', 'flop', 'turn', 'river'].includes(S.fase) && k++ < 500) { const i = S.turno; if (!HE.actuar(S, i, HE.decidir(S, i))) HE.actuar(S, i, HE.legal(S, i).pasar ? { t: 'check' } : { t: 'call' }); } assert.equal(S.fase, 'fin'); assert.equal(S.bb, 100); }
  assert.equal(S.jug.reduce((a, p) => a + p.stack, 0), S.compras.reduce((a, b) => a + b, 0) * HE.STACK); assert.equal(HE.evaluarFin(S), null); assert.ok(HE.validar(JSON.parse(JSON.stringify(S))));
  ok("Hold'em: partida libre con ciegas fijas, recompras y fichas conservadas"); }
// ---- BlackJack: contador Hi-Lo ----
{ const S = BJ.nuevoEstado(); assert.equal(BJ.cuenta(S).rc, 0); const vistas = S.zapato.splice(-20); assert.equal(BJ.cuenta(S).rc, vistas.reduce((s, c) => s + BJ.hiLo(c), 0));
  ok('BlackJack: la cuenta Hi-Lo coincide con las cartas que han salido'); }
// ---- Ajedrez: PGN, lista de jugadas y reloj ----
{ const r = AX.dePGN('[Event "x"]\n1. e4 e5 2. Nf3 {comentario} Nc6 3. Bb5 a6 (3... Nf6) 4. Ba4 Nf6 5. O-O Be7 1/2-1/2'); assert.ok(r.e && r.e.n === 10);
  const r2 = AX.dePGN(AX.aPGN(r.e)); assert.equal(r2.e.b.join(), r.e.b.join());
  assert.equal(AX.dePGN('1. e4 e5 2. Cf3 Cc6 3. Ab5').e.san.at(-1), 'Ab5'); assert.ok(AX.dePGN('1. e4 e5 2. Ke3 Kz9').error);
  const v = AX.validarEstado(JSON.parse(JSON.stringify(r.e))); assert.equal(v.movs.length, 10); assert.equal(AX.rejugar(v.movs).b.join(), r.e.b.join());
  const e0 = AX.estadoInicial({ base: 60000, inc: 2000 }), e1 = AX.aplicar(e0, AX.jugadas(e0)[0]); assert.deepEqual(e1.reloj.ms, [62000, 60000]);
  ok('Ajedrez: PGN de ida y vuelta (inglés y español), lista de jugadas para revisar y reloj con incremento'); }
// ---- Arcade: Excavar, Obstáculos y niveles propios ----
{ const S = BL.crear({ modo: 'excavar' }); assert.equal(BL.basuraRestante(S), BL.FILAS_BASURA); assert.ok(BL.validar(JSON.parse(JSON.stringify(S))));
  const T = SN.crear({ modo: 'obstaculos', vel: 'normal', tam: 'normal' }); for (let k = 0; k < 8; k++) { T.comida = T.serp[0] + 1; SN.paso(T, 1); if (T.fase !== 'jugar') break; } assert.ok(T.muros.length >= 1); assert.ok(SN.validar(JSON.parse(JSON.stringify(T))));
  const plano = ['..........', '..........', '1111111111', '..........', '..........', '..........', '..........', '..........'];
  assert.ok(LD.validarPlano(plano)); assert.ok(!LD.validarPlano(['MMMMMMMMMM', ...plano.slice(1).map(() => '..........')]));
  const U = LD.crear({ modo: 'propio', plano, nombre: 'Prueba' }); assert.equal(U.ladrillos.length, 10); assert.ok(LD.validar(JSON.parse(JSON.stringify(U))));
  ok('Arcade: modo Excavar de Bloques, Obstáculos de la Serpiente y niveles propios del Rompe-Ladrillos'); }
// ---- Flota y Rosco: contenido nuevo ----
{ assert.ok(Object.keys(FL.FLOTAS).length >= 6); for (const L of LRosco) assert.ok(BRosco[L].length >= 16, L);
  ok('Hundir la Flota: 6 flotas · El Rosco: 16 palabras por letra'); }

// ---- Magnate Tecnológico ----
{ assert.equal(MTC.length, 40); for (const s of MTC) if (s.g) assert.ok(MTG[s.g]);
  const mudo = { render() {}, log() {}, async paso() {}, async dados() {}, flash() {}, async pregunta(t, x, b) { return b[0]; }, async carta() {}, async comprar() { return true; }, async puja() { return 0; }, async aceptar() { return false; }, async gestionar() {}, async fin() {} };
  let terminadas = 0;
  for (let k = 0; k < 40; k++) {
    const n = 2 + k % 3, g = new MTPartida(Array.from({ length: n }, (_, i) => ({ nombre: 'CPU ' + i, ficha: '🤖', color: '#2F6BFF', bot: true })), mudo, { rondas: k % 2 ? 60 : 0 });
    let t = 0;
    while (!g.terminada && t++ < 3000) {
      await g.jugarTurno();
      assert.ok(g.oficinas >= 0 && g.sedes >= 0 && g.jug.every(p => p.dinero >= 0));
      for (const m of Object.keys(MTMAZOS)) assert.equal(g.mazos[m].length + g.jug.reduce((a, p) => a + p.pases.filter(x => x === m).length, 0), MTMAZOS[m].length);   // los pases no se duplican
      if (t % 40 === 0) { const v = validarMT(JSON.parse(JSON.stringify(g))); assert.ok(v); assert.equal(JSON.stringify(MTPartida.desde(v, mudo)), JSON.stringify(g)); }
    }
    if (g.terminada) { terminadas++; assert.ok(g.ganador >= 0 && !g.jug[g.ganador].fuera); }
  }
  assert.ok(terminadas >= 38, 'partidas terminadas: ' + terminadas);
  const g = new MTPartida([{ nombre: 'A', ficha: '🦊', color: '#FF4757' }, { nombre: 'B', ficha: '🤖', color: '#2F6BFF', bot: true }], mudo);
  g.c[1].dueno = 0;
  assert.ok(!g.ofertaValida(g.jug[0], g.jug[1], { da: [1], daM: -50, pide: [], pideM: 0 }), 'dinero negativo');
  assert.ok(!g.ofertaValida(g.jug[0], g.jug[1], { da: [3], daM: 0, pide: [], pideM: 0 }), 'empresa ajena');
  assert.ok(g.ofertaValida(g.jug[0], g.jug[1], { da: [1], daM: 10, pide: [], pideM: 0 }));
  assert.equal(validarMT({ ...JSON.parse(JSON.stringify(g)), oficinas: 3 }), null);
  ok('Magnate Tecnológico: 40 partidas entre CPU (con y sin límite de rondas), guardado de ida y vuelta, pases sin duplicar y tratos validados'); }

// ---- Diccionario español (juegos de palabras) ----
{ const info = JSON.parse(readFileSync(new URL('../data/diccionario/indice.json', import.meta.url), 'utf8'));
  DIC.desdeTexto(readFileSync(new URL('../data/diccionario/' + info.archivo, import.meta.url), 'utf8'));
  assert.ok(info.palabras > 500000);
  for (const w of ['casa', 'Pingüino', 'CAMIÓN', 'cantábamos', 'dámelo', 'ñu', 'quirófanos', 'eñe', 'desarrolladores']) assert.ok(DIC.existe(w), w);
  for (const w of ['qwerty', 'casaz', 'Madrid', 'a', 'pingüinoss']) assert.ok(!DIC.existe(w), w);
  for (let n = 2; n <= 15; n++) { const l = [...DIC.palabras(n)]; assert.equal(l.length, info.longitudes[n]); for (let k = 1; k < l.length; k += 997) assert.ok(l[k - 1] < l[k]); }
  const f = DIC.formables('aeirstcon', { min: 4 }); assert.ok(f.length > 100 && f.every(w => DIC.existe(w)) && f[0].length >= f[f.length - 1].length);
  DIC.lemasDesdeTexto(readFileSync(new URL('../data/diccionario/' + info.lemas, import.meta.url), 'utf8'));
  const ln = DIC.lemas('n'), lv = DIC.lemas('v');
  assert.equal(ln.length, info.lemasPorTipo.n); assert.equal(lv.length, info.lemasPorTipo.v); assert.ok(ln.length + lv.length > 45000);
  assert.ok(ln.includes('pingüino') && ln.includes('camión') && lv.includes('cantar') && !ln.includes('cantábamos'));
  assert.ok(DIC.lemas('n', { min: 4, max: 6 }).every(w => w.length >= 4 && w.length <= 6));
  assert.ok(ln.slice(0, 2000).every(w => DIC.existe(w)), 'las palabras base están en el diccionario completo');
  ok('Diccionario: ~590.000 formas de LibreOffice, búsqueda sin tildes, palabras añadidas y formables para Letras; ~47.000 palabras base para los demás juegos'); }

// ---- Póker cubierto ----
{ const A = [0, 13, 26];                                             // en core/cartas: rango = id % 13 (0 = as, 10 = jota)
  assert.ok(PC.puedeAbrir([10, 23, 1, 2, 3])); assert.ok(!PC.puedeAbrir([9, 22, 1, 2, 3]));
  assert.deepEqual(PC.sugerirDescarte([...A, 5, 7]), [3, 4]);         // trío de ases: cambia las 2 sueltas
  assert.ok(PC.descarteValido([0, 2, 3, 4, 5], [1, 2, 3, 4]));         // 4 cartas si se queda con un as
  assert.ok(!PC.descarteValido([1, 2, 3, 4, 5], [1, 2, 3, 4])); assert.ok(!PC.descarteValido([1, 2, 3, 4, 5], [0, 0]));
  for (const [ap, n, modo] of [['libre', 3, 'torneo'], ['jotas', 5, 'torneo'], ['jotas', 2, 'libre']]) {
    const S = PC.crear(n, 'facil', 'Tú', modo, 'media', ap); S.jug[0].bot = true; let manos = 0;
    while (manos < 40 && S.fase !== 'terminado') {
      if (S.fase === 'fin') { if (PC.evaluarFin(S)) break; PC.nuevaMano(S); manos++; continue; }
      const i = S.turno;
      if (S.fase === 'descarte') assert.ok(PC.descartar(S, i, PC.descarteBot(S, i)));
      else { const a = PC.decidir(S, i); if (!PC.actuar(S, i, a)) assert.ok(PC.actuar(S, i, PC.legal(S, i).pasar ? { t: 'check' } : { t: 'call' })); }
      const cartas = [...S.mazo, ...S.pila, ...S.jug.flatMap(p => p.cartas)]; assert.equal(new Set(cartas).size, cartas.length);
      if (S.fase !== 'fin') assert.equal(S.jug.reduce((s, p) => s + p.stack + p.inv, 0), S.compras.reduce((a, b) => a + b, 0) * PC.STACK);
      assert.ok(PC.validar(JSON.parse(JSON.stringify(S))));
    }
    assert.ok(manos > 0);
  }
  ok('Póker cubierto: apertura con jotas, descarte (3 o 4 con as), fichas y cartas sin duplicar, guardado válido'); }

// ---- Air Hockey ----
{ // CPU difícil contra CPU fácil (en los dos lados): gana siempre la difícil; el disco nunca sale de la mesa salvo por las porterías
  const partido = (nAbajo, nArriba) => {
    const S = AH.crear({ nivel: nArriba, meta: 3 }), mem = { x: 300, y: 880, t: 0 }; S.fase = 'juego'; let t = 0;
    while (S.fase !== 'fin' && t < 400) {
      AH.avanzar(S, 1 / 60, [AH.objetivoIA(S, 0, 1 / 60, nAbajo, mem)]); t += 1 / 60;
      const d = S.disco, enBoca = Math.abs(d.x - AH.ANCHO / 2) < AH.PORTERIA / 2;
      assert.ok(d.x >= 0 && d.x <= AH.ANCHO && (enBoca || (d.y >= 0 && d.y <= AH.ALTO)), 'el disco se ha salido de la mesa');
      assert.ok(S.m[0].y >= AH.ALTO / 2 && S.m[1].y <= AH.ALTO / 2, 'cada mazo en su mitad');
      if (Math.round(t * 60) % 300 === 0) assert.ok(AH.validar(JSON.parse(JSON.stringify(S))));
    }
    return AH.ganador(S);
  };
  for (let k = 0; k < 4; k++) { assert.equal(partido('dificil', 'facil'), 0); assert.equal(partido('facil', 'dificil'), 1); }
  const S = AH.crear({ modo: 'dos', meta: 5 }); S.goles = [5, 2]; S.fase = 'fin'; assert.equal(AH.ganador(AH.validar(JSON.parse(JSON.stringify(S)))), 0);
  S.fase = 'juego'; assert.equal(AH.validar(JSON.parse(JSON.stringify(S))), null, 'marcador terminado pero partido en juego');
  ok('Air Hockey: física sin escapes, cada mazo en su mitad, la CPU difícil gana a la fácil y guardado válido'); }

// ---- Sokoban ----
{ for (const n of SKN) { const L = SK.leer(n.mapa); assert.equal(L.cajas.length, L.meta.filter(Boolean).length, n.nombre); const s = SK.resolver(L, L.cajas, L.jugador, 400000); assert.ok(s, 'sin solución: ' + n.nombre);
    let cs = L.cajas, j = L.jugador; for (const d of s.pasos) { const r = SK.mover(L, cs, j, d); assert.ok(r); cs = r.cajas; j = r.jugador; } assert.ok(SK.resuelto(L, cs), 'la solución no resuelve ' + n.nombre); }
  const L = SK.leer('#######\n#@$$ .#\n#######');
  assert.equal(SK.mover(L, L.cajas, L.jugador, 'derecha'), null, 'dos cajas seguidas no se mueven');
  assert.equal(SK.mover(L, L.cajas, L.jugador, 'arriba'), null, 'muro');
  const a = SK.generar('pequeno', 'prueba-1'), b = SK.generar('pequeno', 'prueba-1');
  assert.ok(a && a.texto === b.texto, 'la misma semilla da el mismo nivel (reto del día)');
  for (const t of ['pequeno', 'mediano']) { const g = SK.generar(t, 'prueba-' + t); const G = SK.leer(g.texto); assert.equal(G.cajas.length, SK.TAMANOS[t].cajas); assert.ok(SK.resolver(G, G.cajas, G.jugador, 200000)); assert.ok(G.cajas.every(c => !G.meta[c])); }
  ok(`Sokoban: los ${SKN.length} niveles de la campaña tienen solución, reglas de empuje y niveles generados (y repetibles con semilla) resolubles`); }

// ---- Kakuro ----
{ assert.deepEqual(KA.combinaciones(4, 2).map(KA.cifras), [[1, 3]]); assert.deepEqual(KA.combinaciones(45, 9).map(KA.cifras), [[1, 2, 3, 4, 5, 6, 7, 8, 9]]);
  for (const [n, d] of [[6, 'facil'], [8, 'medio'], [8, 'dificil'], [10, 'medio']]) {
    const p = KA.generar(n, d), ts = KA.tiras(n, p.negra), sumas = ts.map(t => t.celdas.reduce((a, i) => a + p.sol[i], 0));
    assert.ok(ts.every(t => t.celdas.length >= 2 && t.celdas.length <= 9 && new Set(t.celdas.map(i => p.sol[i])).size === t.celdas.length), 'tiras válidas');
    const r = KA.resolver(n, p.negra, ts, sumas, 2); assert.equal(r.n, 1, `solución única ${n} ${d}`); assert.deepEqual(r.sol, p.sol);
    const guardado = { n, dif: d, negra: p.negra, pista: p.pista, sol: p.sol, cur: p.sol.map(() => 0), notas: p.sol.map(() => 0), t: 0, pistas: 0 };
    assert.ok(validarKA(JSON.parse(JSON.stringify(guardado))));
    const malo = JSON.parse(JSON.stringify(guardado)); const k = p.negra.findIndex(b => !b); malo.sol[k] = malo.sol[k] % 9 + 1; assert.equal(validarKA(malo), null, 'una solución que no suma lo que dicen las pistas');
  }
  const a = KA.generarTrabajo(6, 'medio', 0, '2026-10-19:kakuro'), b = KA.generarTrabajo(6, 'medio', 0, '2026-10-19:kakuro');
  assert.deepEqual(a.sol, b.sol, 'reto del día: misma semilla, mismo panel');
  ok('Kakuro: combinaciones, paneles de 6, 8 y 10 con solución única, guardado validado y reto del día repetible'); }

// ---- Corazones ----
{ let lunas = 0;
  for (let g = 0; g < 40; g++) {
    const S = CO.crear({ nivel: ['facil', 'medio', 'dificil'][g % 3], meta: 50, luna: g % 2 ? 'resta' : 'resto' });
    while (S.fase !== 'fin') {
      if (S.fase === 'pasar') { for (let j = 0; j < 4; j++) assert.ok(CO.elegirPase(S, j, CO.sugerirPase(S, j))); assert.ok(S.manos.every(m => m.length === 13)); }
      else if (S.fase === 'jugar') {
        const j = S.turno, ops = CO.jugables(S, j);
        if (S.nbaza === 0 && !S.baza.length) assert.deepEqual(ops, [CO.DOS_TREBOLES], 'se sale con el 2 de tréboles');
        if (S.baza.length && S.manos[j].some(c => CO.palo(c) === CO.palo(S.baza[0].c))) assert.ok(ops.every(c => CO.palo(c) === CO.palo(S.baza[0].c)), 'servir del palo');
        if (!S.baza.length && !S.rotos && S.manos[j].some(c => CO.palo(c) !== CO.CORAZONES)) assert.ok(ops.every(c => CO.palo(c) !== CO.CORAZONES), 'corazones sin romper');
        assert.ok(CO.jugar(S, j, CO.elegir(S, j)));
      } else if (S.fase === 'baza') CO.cerrarBaza(S);
      else if (S.fase === 'finMano') { if (S.lunaDe >= 0) lunas++; CO.nuevaMano(S); }
      assert.ok(CO.validar(JSON.parse(JSON.stringify(S))));
    }
    for (const f of S.hist) assert.ok([26, 78, -26].includes(f.reduce((a, b) => a + b, 0)), 'cada mano reparte 26 puntos (o la luna)');
    assert.ok(S.total.some(t => t >= 50));
  }
  const P0 = CO.crear(); if (P0.fase === 'pasar') assert.ok(!CO.jugar(P0, 0, P0.manos[0][0]), 'no se juega antes de pasar');
  ok('Corazones: pases, salida con el 2 de tréboles, servir del palo, corazones rotos, 26 puntos por mano y tiro a la luna'); }


// ---- Billar ----
{ for (const modo of Object.keys(BI.MODOS)) {
    for (let g = 0; g < 4; g++) {
      const S = BI.crear({ modo, nivel: g % 2 ? 'dificil' : 'facil', jugadores: [{ nombre: 'A', cpu: true }, { nombre: 'B', cpu: true }] }), r = BI.radio(modo);
      for (let k = 0; k < 160 && S.fase !== 'fin'; k++) {
        if (S.enMano) { const p = BI.sitioCPU(S); assert.ok(BI.sitioValido(S, p.x, p.y) || (p.x === 250)); Object.assign(BI.blanca(S), { x: p.x, y: p.y }); S.enMano = false; }
        const t = BI.pensar(S); BI.prepararTiro(S); BI.golpear(BI.blanca(S), t.ang, t.fuerza);
        const info = BI.simular(S.bolas, r); BI.resolver(S, info);
        for (const b of S.bolas) if (!b.fuera) assert.ok(b.x >= r - .01 && b.x <= BI.ANCHO - r + .01 && b.y >= r - .01 && b.y <= BI.ALTO - r + .01, 'bola fuera de la mesa');
        if (modo === 'pool8' && S.fase !== 'fin') assert.ok(BI.enMesa(S, 8), 'la 8 no puede desaparecer sin acabar la partida');
        assert.ok(BI.validar(JSON.parse(JSON.stringify(S))));
      }
      assert.equal(S.fase, 'fin', `${modo}: la partida termina`);
    }
  }
  // reglas puntuales
  const S = BI.crear({ modo: 'pool9' }); assert.deepEqual(BI.legales(S), [1]);
  const Q = BI.crear({ modo: 'snooker' }); assert.ok(BI.legales(Q).every(id => id <= 6), 'en snooker se empieza por las rojas');
// ---- Billar: efectos (alto, bajo y lateral) ----
{ const r = BI.radio('pool8'), tiro = (ex, ey) => { const S = BI.crear({ modo: 'pool8' }), bl = BI.blanca(S); S.bolas.forEach(b => { if (b.id) b.fuera = true; });
    const o = S.bolas.find(b => b.id === 1); o.fuera = false; bl.x = 250; bl.y = 800; o.x = 250; o.y = 500; BI.golpear(bl, -Math.PI / 2, .6, ex, ey); BI.simular(S.bolas, r); return bl; };
  const c = tiro(0, 0), alto = tiro(0, .8), bajo = tiro(0, -.8);
  assert.ok(alto.y < c.y - 100, 'alto: sigue'); assert.ok(bajo.y > c.y + 100, 'bajo: retrocede');
  const lat = ex => { const S = BI.crear({ modo: 'pool8' }), bl = BI.blanca(S); S.bolas.forEach(b => { if (b.id) b.fuera = true; }); bl.x = 250; bl.y = 800; BI.golpear(bl, -Math.PI / 2, .7, ex, 0); BI.simular(S.bolas, r); return bl.x; };
  assert.ok(lat(.8) > 300 && lat(-.8) < 200 && Math.abs(lat(0) - 250) < 1, 'efecto lateral en banda');
  const sinEf = tiro(0, 0); assert.equal(sinEf.sp, 0); ok('Billar: efectos de la blanca (alto, bajo y lateral en banda)'); }
  ok('Billar: Pool 8, Pool 9 y Snooker entre CPU hasta el final, sin bolas fuera de la mesa y con guardado válido'); }

// ---- Cifras y Letras ----
{ let exactas = 0;
  for (let k = 0; k < 60; k++) {
    const { numeros, objetivo } = CY.numerosAlAzar(); assert.equal(numeros.length, 6); assert.ok(objetivo >= 101 && objetivo <= 999);
    const r = CY.resolverCifras(numeros, objetivo); if (r.valor === objetivo) exactas++;
    const pool = numeros.slice();                                       // la solución usa cada número una vez y operaciones válidas
    for (const [a, op, b, z] of r.pasos) { for (const x of [a, b]) { const i = pool.indexOf(x); assert.ok(i >= 0, 'número no disponible'); pool.splice(i, 1); } assert.equal(CY.operar(a, op, b), z); pool.push(z); }
    assert.ok(pool.includes(r.valor) || numeros.includes(r.valor));
    const f = CY.cifrasCPU(numeros, objetivo, 'facil'); assert.ok(Math.abs(f.valor - objetivo) >= Math.abs(r.valor - objetivo));
  }
  assert.ok(exactas > 45, 'la mayoría de los objetivos tienen solución exacta: ' + exactas);
  assert.equal(CY.operar(7, '÷', 2), null); assert.equal(CY.operar(3, '-', 5), null); assert.equal(CY.puntosCifras(500, 500), 10); assert.equal(CY.puntosCifras(495, 500), 7); assert.equal(CY.puntosCifras(489, 500), 0);
  assert.ok(CY.cabe('cámara', ['C', 'A', 'M', 'A', 'R', 'A', 'X', 'Y', 'Z'])); assert.ok(!CY.cabe('casas', ['C', 'A', 'S', 'X', 'Y', 'Z', 'Q', 'W', 'E']));
  for (let k = 0; k < 50; k++) { const l = CY.letrasAlAzar(); assert.equal(l.length, 9); assert.ok(l.filter(CY.esVocal).length >= 3 && l.filter(x => !CY.esVocal(x)).length >= 3); }
  assert.deepEqual(CY.puedePedir(['B', 'C', 'D', 'F', 'G', 'H']), { v: true, c: false }, 'si faltan vocales obligatorias no se pueden pedir más consonantes');
  assert.equal(CY.puntosLetras('ABCDEFGHI'), 18);
  const S = CY.crear({ rival: 'cpu' }); S.objetivo = 500;
  assert.deepEqual(CY.puntuar(S, 'cifras', { valor: 500 }, { valor: 498 }), [10, 0], 'solo puntúa la mejor');
  assert.deepEqual(CY.puntuar(S, 'letras', { palabra: 'CASA', valida: true }, { palabra: 'COSA', valida: true }), [4, 4], 'empate: los dos');
  ok('Cifras y Letras: soluciones de cifras correctas (y casi siempre exactas), letras con 3 vocales y 3 consonantes, puntos como en el concurso'); }

// ---- Scrabble ----
{ // el diccionario (DIC) ya está cargado más arriba
  const dic = construirSC(DIC);
  assert.ok(dic.existe(aFichas('calle')) && dic.existe(aFichas('perro')) && dic.existe(aFichas('chico')) && dic.existe('casa'));
  assert.ok(!dic.existe('calle'), 'LL es una sola ficha: «calle» con dos L no vale');
  assert.equal(Object.values(SC.FICHAS).reduce((a, [n]) => a + n, 0), 100);
  assert.equal([...SC.PREMIO].filter(c => c === 'T').length, 8); assert.equal([...SC.PREMIO].filter(c => c === 'D').length, 17);
  assert.equal([...SC.PREMIO].filter(c => c === 't').length, 12); assert.equal([...SC.PREMIO].filter(c => c === 'd').length, 24);
  // reglas de colocación y puntos
  const vac = '.'.repeat(225), pone = (w, i0, paso = 1) => [...w].map((t, k) => ({ i: i0 + k * paso, t, b: false }));
  assert.equal(SC.evaluar(vac, [], pone('casa', 0)).ok, false, 'la primera pasa por el centro');
  const e1 = SC.evaluar(vac, [], pone('casa', 110), dic); assert.ok(e1.ok); assert.equal(e1.pts, (3 + 1 + 1 + 1) * 2);
  assert.equal(SC.evaluar(vac, [], [{ i: 112, t: 'c', b: false }, { i: 114, t: 'a', b: false }]).ok, false, 'sin huecos');
  assert.equal(SC.evaluar(vac, [], [{ i: 112, t: 'c' }, { i: 128, t: 'a' }]).ok, false, 'en una fila o columna');
  const conBl = SC.evaluar(vac, [], [{ i: 110, t: 'c', b: true }, ...pone('asa', 111)]); assert.equal(conBl.pts, 3 * 2, 'el comodín vale 0');
  assert.ok(!SC.evaluar(vac, [], pone('xqzj', 110), dic).ok, 'palabra inexistente');
  // partidas entre CPU: cada jugada de la CPU es válida y puntúa igual que en evaluar; el guardado se valida
  for (const nivel of ['facil', 'medio', 'dificil']) {
    const S = SC.crear({ jugadores: [{ nombre: 'A', cpu: true }, { nombre: 'B', cpu: true }, ...(nivel === 'medio' ? [{ nombre: 'C', cpu: true }] : [])], nivel });
    for (let k = 0; k < 300 && S.fase !== 'fin'; k++) {
      const d = SC.pensar(S, dic);
      if (d.tipo === 'jugar') { const ev = SC.evaluar(S.tab, S.bl, d.coloc, dic); assert.ok(ev.ok, ev.error); assert.equal(ev.pts, d.pts); SC.jugar(S, d.coloc, ev); }
      else if (d.tipo === 'cambiar') assert.ok(SC.cambiar(S, d.fichas)); else SC.pasar(S);
      assert.ok(SC.validar(JSON.parse(JSON.stringify(S))), 'guardado válido');
    }
    assert.equal(S.fase, 'fin', nivel + ': la partida termina');
  }
  const T = SC.crear(); T.bolsa.pop(); assert.equal(SC.validar(JSON.parse(JSON.stringify(T))), null, 'faltan fichas: no vale');
  ok('Scrabble: 100 fichas con CH/LL/RR, tablero de premios, colocación y puntos, y partidas completas entre CPU de los 3 niveles'); }
console.log(`\n${n} pruebas correctas`);
