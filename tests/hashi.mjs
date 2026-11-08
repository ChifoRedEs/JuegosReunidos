// Pruebas de Puentes Hashi: node tests/hashi.mjs
import * as M from '../js/games/hashi/motor.js';
let fallos = 0; const ok = (c, m) => { if (!c) { fallos++; console.log('✗', m); } };
// fuerza bruta independiente del solucionador (solo puzles pequeños)
function bruta(P) { const n = P.E.length, cur = new Array(n).fill(0); let c = 0;
  (function rec(k) { if (k === n) { if (M.resuelto(P, cur)) c++; return; } for (let v = 0; v <= 2; v++) { cur[k] = 0; if (v && M.bloqueada(P, cur, k)) continue; cur[k] = v; rec(k + 1); } cur[k] = 0; })(0); return c; }
// casos conocidos
let P = M.construir([[0, 0, 1], [0, 2, 1]]); ok(M.resolver(P, 2).n === 1, 'dos islas de 1: una solución');
P = M.construir([[0, 0, 2], [0, 3, 1], [2, 0, 1]]); ok(M.resolver(P, 2).n === 1 && bruta(P) === 1, 'L de 3 islas');
P = M.construir([[0, 0, 1], [0, 2, 4], [0, 4, 2], [2, 0, 2], [2, 2, 3], [4, 0, 2], [4, 4, 2]]); ok(M.resolver(P, 2).n === 1, 'puzle del tutorial: solución única');
P = M.construir([[0, 0, 1], [0, 2, 1], [2, 0, 1], [2, 2, 1]]); ok(M.resolver(P, 2).n === 0, 'islas 1-1-1-1 forman dos parejas aisladas: sin solución');
// cruces: una arista horizontal y otra vertical que se cortan
P = M.construir([[1, 0, 1], [1, 2, 1], [0, 1, 1], [2, 1, 1]]); const h = P.E.findIndex(e => e.hor && P.isl[e.a][0] === 1), v = P.E.findIndex(e => !e.hor);
ok(P.E[h].x.includes(v) && P.E[v].x.includes(h), 'detecta el cruce'); const cur = new Array(P.E.length).fill(0); cur[h] = 1; ok(M.bloqueada(P, cur, v), 'no se puede cruzar un puente ya puesto');
// generador: todos los niveles, solución única y válida
for (const d of Object.keys(M.NIVELES)) {
  const T = d === 'maestro' || d === 'experto' ? 6 : 25;
  for (let i = 0; i < T; i++) {
    const g = M.generar(d), Q = M.construir(g.isl), r = M.resolver(Q, 2);
    ok(r.n === 1, `${d}: solución única`); ok(M.resuelto(Q, g.sol), `${d}: la solución guardada resuelve`); ok(g.isl.every(x => x[2] >= 1 && x[2] <= 8), `${d}: números de 1 a 8`);
    ok(g.isl.length >= 4, `${d}: islas suficientes`);
    if (['facil', 'normal', 'dificil'].includes(d)) ok(!r.adivina, `${d}: se resuelve sin adivinar`);
    if (d === 'facil' && Q.E.length <= 13) ok(bruta(Q) === 1, 'facil: fuerza bruta confirma la unicidad');
    const p = M.pista(Q, new Array(Q.E.length).fill(0), g.sol); ok(p && p.v === g.sol[p.e], `${d}: pista correcta`);
  }
}
console.log(fallos ? `✗ ${fallos} fallos` : '✓ Puentes Hashi: todo correcto');
process.exit(fallos ? 1 : 0);
