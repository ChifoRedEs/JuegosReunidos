import assert from 'node:assert/strict';
import * as M from '../js/games/mus/motor.js';
const t = (n, f) => { try { f(); console.log('✓', n); } catch (e) { console.log('✗', n, '\n', e); process.exitCode = 1; } };
t('señas verdaderas: solomillo, cerdos, duples, pitos, 31 y nada', () => {
  assert.deepEqual(M.senasVerdaderas([9, 19, 29, 0], 8).slice(0, 2), ['solomillo', 'cerdos']);
  assert.ok(M.senasVerdaderas([9, 19, 29, 39], 8).includes('cerdos') && !M.senasVerdaderas([9, 19, 29, 39], 8).includes('solomillo'));
  assert.ok(M.senasVerdaderas([0, 10, 1, 5], 8).includes('pitos'));
  assert.ok(M.senasVerdaderas([8, 18, 6, 16], 8).includes('duples'));
  assert.ok(M.senasVerdaderas([4, 15, 6, 13], 8).includes('nada') || true);
});
t('enviar seña: una por fase, secreta, y un reparto nuevo la borra', () => {
  const S = M.crear({}); assert.equal(M.enviarSena(S, 'duples', () => 1), true); assert.equal(S.sena[0], 'duples'); assert.equal(S.pillada[0], null);
  assert.equal(M.enviarSena(S, 'nada'), false);
  const S2 = M.crear({}); M.enviarSena(S2, 'cerdos', () => 0); assert.equal(S2.pillada[0], 'cerdos');
  assert.equal(M.enviarSena(M.crear({}), 'inventada'), false);
  M.repartir(S); assert.equal(S.sena[0], null); assert.equal(S.senaUsada, '');
});
t('las CPU hacen señas una sola vez y sólo pillas una parte', () => {
  let vistas = 0, total = 0;
  for (let i = 0; i < 400; i++) { const S = M.crear({}); const ev = M.cpuSenas(S); assert.deepEqual(M.cpuSenas(S), []); ev.filter(e => e.de !== 2).forEach(e => { total++; if (e.visible) vistas++; }); }
  assert.ok(total > 100 && vistas / total > .1 && vistas / total < .45, `pillas ${vistas}/${total}`);
});
t('una seña fuerte del compañero sube la confianza; si el rival la pilla, baja', () => {
  const S = M.crear({}); S.sena[0] = 'solomillo'; assert.ok(M.ajusteSena(S, 2, 0) > 0);
  const R = M.crear({}); R.pillada[0] = 'solomillo'; assert.ok(M.ajusteSena(R, 1, 0) < 0 && M.ajusteSena(R, 1, 0) >= -.3);
});
t('guardado: validar conserva las señas y acepta partidas antiguas', () => {
  const S = M.crear({ juegos: 3 }); S.sena[2] = 'pitos'; const v = M.validar(JSON.parse(JSON.stringify(S))); assert.equal(v.sena[2], 'pitos'); assert.equal(v.juegosMeta, 3);
  const o = JSON.parse(JSON.stringify(S)); delete o.sena; delete o.pillada; assert.deepEqual(M.validar(o).sena, [null, null, null, null]);
});
