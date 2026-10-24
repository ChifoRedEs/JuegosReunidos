import * as K from '../js/games/klotski/motor.js';
let ok = 0; const t = (n, f) => { try { f(); ok++; console.log('✓', n); } catch (e) { console.log('✗', n, e.message); process.exitCode = 1; } };
const aser = (c, m) => { if (!c) throw new Error(m); };
for (const tam of Object.keys(K.TAMANOS.colores)) for (const nivel of ['facil', 'medio', 'dificil', 'experto']) t(`colores ${tam} ${nivel}: generado y resoluble`, () => {
  const t0 = Date.now(), S = K.nueva('colores', tam, nivel, 'sem-' + tam); aser(S, 'sin partida'); aser(K.validar(JSON.parse(JSON.stringify(S))), 'validar');
  aser(!K.resuelto(S), 'ya resuelto'); const sol = K.solucionColores(S.p, S.w, S.h); aser(sol && sol.length === S.opt, 'óptimo ' + (sol && sol.length) + ' vs ' + S.opt);
  for (const m of sol) aser(K.deslizar(S, m.i, m.d, m.dist), 'movimiento ilegal'); aser(K.resuelto(S), 'no llega a la meta');
  while (K.deshacer(S)); aser(S.movs === 0 && !K.resuelto(S), 'deshacer'); console.log('   ', S.opt, 'movs,', Date.now() - t0, 'ms');
});
for (const tam of Object.keys(K.TAMANOS.numeros)) t(`números ${tam}: mezcla, pista y empujar`, () => {
  const S = K.nueva('numeros', tam, 'medio', 'x' + tam); aser(S && !K.resuelto(S), 'mezcla'); aser(K.validar(JSON.parse(JSON.stringify(S))), 'validar');
  let n = 0; const t0 = Date.now(); while (!K.resuelto(S) && n < 400) { const p = K.pista(S); aser(p, 'sin pista'); aser(K.empujar(S, p.i), 'pista no empuja'); n++; }
  aser(K.resuelto(S), 'no se resuelve con pistas (' + n + ')'); console.log('   ', n, 'pistas,', Date.now() - t0, 'ms');
});
t('validar rechaza basura', () => { for (const x of [null, {}, { modo: 'colores', tam: '9x9' }, { modo: 'numeros', tam: '3x3', nivel: 'facil', p: [], ini: [] }, { modo: '__proto__', tam: 'x' }]) aser(K.validar(x) === null, 'acepta ' + JSON.stringify(x)); });
console.log(ok, 'pruebas correctas');
