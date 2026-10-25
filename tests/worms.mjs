// Pruebas del motor de Guerra de Orugas (sin navegador):  node tests/worms.mjs
import assert from 'node:assert/strict';
import * as M from '../js/games/worms/motor.js';
import { planificar, crearPiloto } from '../js/games/worms/ia.js';

let ok = 0; const t = (n, f) => { try { f(); ok++; console.log('✓', n); } catch (e) { console.error('✗', n, '\n', e); process.exitCode = 1; } };
const cfg = (o = {}) => ({ n: 3, mapa: 'colinas', modo: 'cpu', nivel: 1, tiempo: 30, cajas: true, ...o });
const avanzar = (S, seg, dt = 1 / 60) => { for (let i = 0; i < seg / dt; i++) M.paso(S, dt); };
const hastaTurno = S => { for (let i = 0; i < 60 * 60 && S.turno.fase !== 'turno' && S.turno.fase !== 'fin'; i++) M.paso(S, 1 / 60); };

t('crear 3/6/9/12 por equipo en todos los mapas', () => {
  for (const n of M.TAMANOS) for (const mapa of Object.keys(M.MAPAS)) {
    const S = M.crear(cfg({ n, mapa }));
    assert.equal(S.gus.length, n * 2);
    assert.equal(M.vivos(S, 0).length, n); assert.equal(M.vivos(S, 1).length, n);
    for (const w of S.gus) { assert.ok(M.libre(S, w.x, w.y), 'no enterrado'); assert.ok(!M.libre(S, w.x, w.y + 1), 'apoyado'); assert.ok(w.y < S.agua - 4); }
  }
});
t('terreno destructible + restauración por semilla', () => {
  const S = M.crear(cfg()); const x = Math.round(S.W / 2), y = M.superficie(S, x, 0) + 10;
  assert.ok(M.solido(S, x, y + 1)); M.explosion(S, x, y, M.EXPL.sagrada, 'sagrada'); assert.ok(!M.solido(S, x, y));
  const R = M.restaurar(JSON.parse(JSON.stringify(M.guardable(S))));
  assert.ok(!M.solido(R, x, y)); assert.deepEqual(Array.from(R.mask), Array.from(S.mask));
});
t('caminar, subir cuestas y saltar', () => {
  const S = M.crear(cfg({ modo: 'dos' })); hastaTurno(S); const w = M.activo(S), x0 = w.x;
  for (let i = 0; i < 60; i++) { M.caminar(S, 1, 1 / 60); M.paso(S, 1 / 60); }
  assert.ok(Math.abs(w.x - x0) > 15, 'avanza');
  const y0 = w.y; assert.ok(M.saltar(S, 'alto')); avanzar(S, .25); assert.ok(w.y < y0 - 8, 'sube al saltar'); avanzar(S, 2); assert.ok(!w.vuela);
  let mov = 0; for (const d of [1, -1]) { const x1 = w.x; M.dirigir(S, d); M.saltar(S, 'adelante'); avanzar(S, 2); mov = Math.max(mov, Math.abs(w.x - x1)); }
  assert.ok(mov > 10, 'salto lateral');
});
t('salto alto dirigible: recto, inclinado y control en el aire', () => {
  const S = M.crear(cfg({ modo: 'dos' })); hastaTurno(S); const w = M.activo(S);
  const x0 = w.x; assert.ok(M.saltar(S, 'alto')); assert.equal(w.vx, 0); avanzar(S, 2.5); assert.ok(Math.abs(w.x - x0) < 3, 'recto');
  let mejor = 0; for (const d of [1, -1]) { const x1 = w.x; M.saltar(S, 'alto', d); for (let i = 0; i < 150 && w.vuela; i++) { M.impulsar(S, d, 1 / 60); M.paso(S, 1 / 60); } mejor = Math.max(mejor, Math.abs(w.x - x1)); avanzar(S, 1); }
  assert.ok(mejor > 15, 'inclinado: ' + mejor);
});
t('caída fuerte hace daño; el agua mata; muerte deja tumba destructible', () => {
  const S = M.crear(cfg({ modo: 'dos', cajas: false })); hastaTurno(S);
  const v = S.gus.find(g => g.eq !== S.turno.eq); v.x = 100; v.y = 20; v.vuela = true; v.vx = v.vy = 0; v.est = 'vuelo';
  avanzar(S, 3); assert.ok(v.hp < 100 || !v.vivo);
  const v2 = S.gus.find(g => g.vivo && g.eq !== S.turno.eq && g !== v) || v;
  M.explosion(S, v2.x, v2.y, { ...M.EXPL.sagrada, d: 400 }, 'sagrada'); M.terminarTurno(S); avanzar(S, 8);
  assert.ok(!v2.vivo); const tb = S.tumbas.find(q => q.de === v2.id); assert.ok(tb, 'tumba');
  const n = S.tumbas.length; M.explosion(S, tb.x, tb.y, M.EXPL.sagrada, 'sagrada'); avanzar(S, 2);
  assert.ok(S.tumbas.length <= n);
});
t('armas: misil, escopeta, granadas, dinamita, aéreo', () => {
  for (const arma of ['misil', 'escopeta', 'granada', 'racimo', 'sagrada', 'dinamita', 'aereo']) {
    const S = M.crear(cfg({ modo: 'dos', cajas: false })); S.viento = 0; hastaTurno(S);
    assert.ok(M.elegirArma(S, arma), arma);
    if (arma === 'aereo') { assert.ok(!M.puedeDisparar(S)); M.fijarObjetivo(S, S.W / 2, 100); }
    assert.ok(M.puedeDisparar(S), arma + ' dispara');
    M.disparar(S, .7); assert.ok(S.turno.usado || S.turno.disp > 0 || S.proy.length || S.aviones.length, arma + ' usado');
    avanzar(S, 12); assert.ok(S.proy.length === 0, arma + ' termina'); assert.ok(['cambio', 'turno', 'fin'].includes(S.turno.fase));
  }
});
t('cuerda gancho: engancha y balancea', () => {
  let eng = 0;
  for (const mapa of Object.keys(M.MAPAS)) for (let k = 0; k < 6; k++) {
    const S = M.crear(cfg({ modo: 'dos', mapa })); hastaTurno(S); M.elegirArma(S, 'cuerda'); S.turno.ang = 70; M.disparar(S);
    const w = M.activo(S); if (w.est === 'cuerda') { eng++; M.balancear(S, 1); avanzar(S, 1); M.soltarCuerda(S, w); avanzar(S, 8); assert.ok(!w.vuela || !w.vivo); }
  }
  assert.ok(eng > 0, 'alguna vez engancha');
});
t('teletransporte limitado', () => {
  const S = M.crear(cfg({ modo: 'dos' })); hastaTurno(S); const w = M.activo(S), n0 = M.municion(S, S.turno.eq, 'tele');
  M.elegirArma(S, 'tele'); const x = S.W / 2, y = M.superficie(S, x, 0) - 20; M.fijarObjetivo(S, x, y); assert.ok(M.disparar(S) !== false);
  avanzar(S, 3); assert.ok(Math.abs(w.x - x) < 40); assert.equal(M.municion(S, 0, 'tele') + M.municion(S, 1, 'tele'), n0 * 2 - 1);
});
t('turnos alternan y avanzan', () => {
  const S = M.crear(cfg({ modo: 'dos' })); hastaTurno(S); const e0 = S.turno.eq; M.terminarTurno(S); avanzar(S, 8); hastaTurno(S);
  assert.notEqual(S.turno.eq, e0); assert.equal(S.turnos >= 2, true);
});
t('cajas y subida del agua', () => {
  const S = M.crear(cfg({ modo: 'dos', cajas: true })); const a0 = S.agua; let cajas = 0;
  for (let i = 0; i < 40; i++) { hastaTurno(S); if (S.turno.fase === 'fin') break; M.terminarTurno(S); for (let j = 0; j < 600; j++) { M.paso(S, 1 / 60); cajas = Math.max(cajas, S.cajas.length); if (S.turno.fase === 'turno') break; } }
  assert.ok(S.agua < a0, 'sube el agua'); assert.ok(cajas > 0, 'cae alguna caja');
});
t('guardado: validar rechaza basura y acepta lo guardado', () => {
  const S = M.crear(cfg()); const g = JSON.parse(JSON.stringify(M.guardable(S)));
  assert.ok(M.validar(g)); for (const m of [null, {}, 5, 'x', { v: 1 }, { ...g, gus: 'x' }, { ...g, cfg: null }]) assert.equal(M.validar(m), null);
  const R = M.restaurar(g); assert.equal(R.gus.length, S.gus.length);
});
t('planificador devuelve un plan', () => {
  const S = M.crear(cfg({ modo: 'cpu' })); hastaTurno(S); S.turno.eq = 1; const w = S.gus.find(g => g.eq === 1); S.turno.g = w.id;
  for (const nv of [0, 1, 2]) { const p = planificar(S, nv); assert.ok(p && typeof p.sc === 'number'); }
});
t('CPU contra CPU termina partidas completas (3, 6, 12)', () => {
  for (const n of [3, 6, 12]) {
    const S = M.crear(cfg({ n, nivel: 2, modo: 'cpu' })); S.eq[0].cpu = true; const p0 = crearPiloto(S, 1), p1 = crearPiloto(S, 2);
    const dt = 1 / 30; let it = 0;
    while (S.turno.fase !== 'fin' && it++ < 30 * 60 * 40) { (S.turno.eq === 0 ? p0 : p1).tick(dt); M.paso(S, dt); }
    assert.equal(S.turno.fase, 'fin', `n=${n} termina`); assert.ok(S.ganador !== null);
  }
});
console.log(`\n${ok} pruebas correctas`);
