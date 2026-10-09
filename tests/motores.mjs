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
console.log(`\n${n} pruebas correctas`);
