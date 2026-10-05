// Pruebas de los motores (sin navegador):  node tests/motores.mjs
import assert from 'node:assert/strict';
import { generar, contarSoluciones } from '../js/games/sudoku/generador.js';
import { generarAleatorio, solveGrid } from '../js/games/nonogram/solver.js';
import { REGLAS, tableroInicial, jugadas, aplicar } from '../js/games/damas/reglas.js';
import { elegir } from '../js/games/damas/ia.js';
import { nuevaPartida, tirar, mover, siguiente, mejorJugada } from '../js/games/parchis/reglas.js';

import * as TR from '../js/games/tresenraya/reglas.js';
import * as C4 from '../js/games/conecta4/reglas.js';
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
console.log(`\n${n} pruebas correctas`);
