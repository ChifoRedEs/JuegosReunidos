// Pruebas de la lógica de Bingo Mobile (sin navegador):  node tests/bingomobile.mjs
import assert from 'node:assert/strict';
import * as P from '../js/core/bingo/partida.js';
let ok = 0; const t = async (n, f) => { try { await f(); ok++; console.log('✓', n); } catch (e) { console.error('✗', n, '\n', e); process.exitCode = 1; } };

await t('crear: jugadores, cartones, bote y premios', () => {
  const g = P.crear({ cpus: 8, cartones: 3, apuesta: 10, premios: 'llb' });
  assert.equal(g.jug.length, 9); assert.equal(g.jug[0].cartones.length, 3); assert.equal(g.bote, 10 * (3 + 8)); assert.deepEqual(g.premios.map(p => p.id), ['l1', 'l2', 'b']);
  assert.ok(P.validar(JSON.parse(JSON.stringify(g)))); assert.equal(P.validar({ ...g, n: 99 }), null);
});
await t('marcado manual: solo lo que ha salido y está en el cartón', () => {
  const g = P.crear({ cpus: 0, cartones: 1, apuesta: 5, premios: 'b' }), nums = g.jug[0].cartones[0].flat().filter(Boolean);
  assert.equal(P.marcar(g, 0, nums[0]), 'no-salio');
  g.orden = [nums[0], ...g.orden.filter(x => x !== nums[0])]; P.sacarBola(g, false);
  assert.equal(P.marcar(g, 0, nums[0]), 'ok'); assert.equal(P.marcar(g, 0, nums[0]), 'ya');
  const fuera = Array.from({ length: 90 }, (_, i) => i + 1).find(n => !nums.includes(n)); assert.equal(P.marcar(g, 0, fuera), 'no-esta');
});
await t('partidas completas: siempre acaba con bingo y el reparto suma el bote', () => {
  for (const prem of ['b', 'lb', 'llb']) for (let k = 0; k < 40; k++) {
    const g = P.crear({ cpus: 4, cartones: 2, apuesta: 10, premios: prem });
    while (!g.fin && g.n < 90) {
      P.sacarBola(g, true);
      for (let guard = 0; guard < 4; guard++) { const id = P.pendiente(g), c = P.candidatosCPU(g), yo = id && P.cumple(g.jug[0], id); if (!id) break; const gan = [...c.map(j => j.id), ...(yo ? [0] : [])]; if (!gan.length) break; P.adjudicar(g, id, gan); }
    }
    assert.ok(g.fin); const pagado = g.jug.reduce((s, j) => s + j.ganado, 0); assert.ok(pagado <= g.bote && pagado > g.bote - 20, `${pagado}/${g.bote}`);
    assert.ok(g.premios.every(p => p.g.length)); assert.ok(g.n <= 90);
  }
});
await t('línea y segunda línea', () => {
  const g = P.crear({ cpus: 0, cartones: 1, apuesta: 5, premios: 'llb' }), c = g.jug[0].cartones[0], f0 = c[0].filter(Boolean), f1 = c[1].filter(Boolean);
  g.jug[0].marcas[0] = f0.slice(); assert.equal(P.cumple(g.jug[0], 'l1'), true); assert.equal(P.cumple(g.jug[0], 'l2'), false);
  g.jug[0].marcas[0] = [...f0, ...f1]; assert.equal(P.cumple(g.jug[0], 'l2'), true); assert.equal(P.cumple(g.jug[0], 'b'), false);
  assert.equal(P.faltanLinea(g.jug[0]), 0);
});
console.log(ok + ' pruebas correctas');
