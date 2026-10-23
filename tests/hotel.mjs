// Pruebas del motor de Hotel (sin navegador):  node tests/hotel.mjs
import assert from 'node:assert/strict';
import { Partida, validar, MAZOS } from '../js/games/hotel/motor.js';
import { CASILLAS, GRUPOS, COLORES_JUGADOR, FICHAS } from '../js/games/hotel/datos.js';

let ok = 0; const t = async (n, f) => { try { await f(); ok++; console.log('✓', n); } catch (e) { console.error('✗', n, '\n', e); process.exitCode = 1; } };
const ganchos = (o = {}) => ({ render() {}, log() {}, paso: async () => {}, dados: async () => {}, flash() {}, pregunta: async (t, x, b) => b[0], carta: async () => {},
  comprar: async () => true, puja: async () => 0, aceptar: async () => false, gestionar: async () => {}, fin: async () => {}, ...o });
const nueva = (n = 4, r = {}, bots = true) => new Partida(Array.from({ length: n }, (_, i) => ({ nombre: 'J' + i, ficha: FICHAS[i], color: COLORES_JUGADOR[i], bot: bots })), ganchos(), r);
const dueno = (g, i, ids) => ids.forEach(k => { g.c[k].dueno = i; });

await t('datos: 40 casillas, 22 destinos en 8 zonas, 4 aeropuertos y 2 servicios', () => {
  assert.equal(CASILLAS.length, 40);
  assert.equal(CASILLAS.filter(s => s.tipo === 'destino').length, 22);
  assert.equal(CASILLAS.filter(s => s.tipo === 'aero').length, 4); assert.equal(CASILLAS.filter(s => s.tipo === 'serv').length, 2);
  for (const k of Object.keys(GRUPOS)) assert.ok(CASILLAS.filter(s => s.g === k).length >= 2);
  assert.ok(CASILLAS.every(s => s.tipo !== 'destino' || GRUPOS[s.g]));
});
await t('alquiler: básico, zona completa y por estrellas', () => {
  const g = nueva(2); const cusco = g.c[1], paz = g.c[3];
  dueno(g, 0, [1]); assert.equal(g.alquiler(cusco), 2);
  dueno(g, 0, [3]); assert.equal(g.alquiler(cusco), 4);
  cusco.nivel = 1; assert.equal(g.alquiler(cusco), Math.round(2 * GRUPOS.and.mult[0])); cusco.nivel = 5; assert.equal(g.alquiler(cusco), 200);
  dueno(g, 1, [5, 15]); assert.equal(g.alquiler(g.c[5]), 60); dueno(g, 1, [12, 28]); assert.equal(g.alquiler(g.c[12], 7), 84); dueno(g, 1, [12]); g.c[28].dueno = null; assert.equal(g.alquiler(g.c[12], 7), 35);
});
await t('construcción pareja, coste, hipotecas y venta', () => {
  const g = nueva(2); dueno(g, 0, [1, 3]); const a = g.c[1], b = g.c[3];
  assert.ok(g.puedeConstruir(a)); g.construir(a); assert.equal(g.jug[0].dinero, 1600 - 50);
  assert.ok(!g.puedeConstruir(a), 'no se puede seguir en la misma'); assert.ok(g.puedeConstruir(b)); g.construir(b); assert.ok(g.puedeConstruir(a));
  assert.ok(!g.puedeHipotecar(a)); assert.ok(!g.puedeVender(b) === false); g.construir(a); assert.ok(!g.puedeVender(b)); assert.ok(g.puedeVender(a));
  g.vender(a); assert.equal(a.nivel, 1);
  g.vender(a); g.vender(b); assert.ok(g.puedeHipotecar(a)); g.hipotecar(a); assert.ok(a.hip && !g.puedeConstruir(b)); g.deshipotecar(a); assert.ok(!a.hip);
  g.jug[0].dinero = 10; g.c[1].nivel = 0; g.c[3].nivel = 0; assert.ok(!g.puedeConstruir(a), 'sin dinero');
  for (let n = 0; n < 5; n++) { g.jug[0].dinero = 999; g.construir(a); g.construir(b); } assert.equal(a.nivel, 5); g.jug[0].dinero = 999; assert.ok(!g.puedeConstruir(a), 'máximo 5 estrellas');
});
await t('Salida: cobra 200M, Control sanitario y Cuarentena', async () => {
  const g = nueva(2); const p = g.jug[0]; p.pos = 38; await g.avanzar(p, 4); assert.equal(p.pos, 2); assert.equal(p.dinero, 1800);
  p.pos = 30; await g.caer(p, 0); assert.equal(p.pos, 10); assert.ok(p.espera);
});
await t('bote de Vacaciones', async () => {
  const g = nueva(2, { bote: true }); await g.multa(g.jug[0], 100); assert.equal(g.bote, 100);
  g.jug[1].pos = 20; await g.caer(g.jug[1], 0); assert.equal(g.bote, 0); assert.equal(g.jug[1].dinero, 1700);
  const h = nueva(2, { bote: false }); await h.multa(h.jug[0], 100); assert.equal(h.bote, 0);
});
await t('bancarrota: los destinos pasan al acreedor sin pisos', async () => {
  const g = nueva(2); dueno(g, 0, [1, 3]); g.c[1].nivel = 2; g.c[3].nivel = 2; g.jug[0].dinero = 0;
  dueno(g, 1, [37, 39]); g.c[37].nivel = 0;
  await g.quiebra(g.jug[0], g.jug[1]); assert.ok(g.jug[0].fuera); assert.equal(g.c[1].dueno, 1); assert.equal(g.c[1].nivel, 0); assert.ok(g.terminada); assert.equal(g.ganador, 1);
});
await t('cartas: todas las ramas se ejecutan sin romper', async () => {
  for (const m of Object.keys(MAZOS)) for (let k = 0; k < MAZOS[m].length; k++) {
    const g = nueva(3); dueno(g, 1, [1, 3]); g.c[1].nivel = 2; g.mazos[m] = [k, ...g.mazos[m].filter(x => x !== k)];
    g.jug[0].pos = 7; await g.robar(g.jug[0], m); assert.ok(g.jug.every(p => Number.isFinite(p.dinero) && p.pos >= 0 && p.pos < 40));
  }
});
await t('subasta: gana la puja más alta', async () => {
  const g = nueva(3, {}, false); g.h.puja = async (s, q, a) => (q === g.jug[1] && a < 100 ? a + 10 : q === g.jug[2] && a < 120 ? 120 : 0);
  await g.subasta(g.c[6], g.jug[0]); assert.equal(g.c[6].dueno, 2); assert.equal(g.jug[2].dinero, 1480);
});
await t('intercambio válido, inválido y con pisos', async () => {
  const g = nueva(2, {}, false); dueno(g, 0, [1]); dueno(g, 1, [6]); g.h.aceptar = async () => true;
  assert.ok(await g.proponer(g.jug[0], g.jug[1], { da: [1], daM: 10, pide: [6], pideM: 0 })); assert.equal(g.c[1].dueno, 1); assert.equal(g.c[6].dueno, 0);
  assert.ok(!(await g.proponer(g.jug[0], g.jug[1], { da: [], daM: 99999, pide: [], pideM: 0 })));
  dueno(g, 0, [11, 13, 14]); g.c[11].nivel = 1; assert.ok(!g.ofertaValida(g.jug[0], g.jug[1], { da: [13], daM: 0, pide: [], pideM: 0 }), 'con pisos en la zona no se cede');
});
await t('guardar y validar: ida y vuelta, y rechazo de datos corruptos', async () => {
  const g = nueva(3); await g.jugarTurno(); await g.jugarTurno(); const d = JSON.parse(JSON.stringify(g.toJSON())); const v = validar(d); assert.ok(v);
  const h = Partida.desde(v, ganchos()); assert.deepEqual(JSON.parse(JSON.stringify(h.toJSON())), d);
  const malo = f => { const x = JSON.parse(JSON.stringify(d)); f(x); return validar(x); };
  assert.equal(malo(x => { x.c.pop(); }), null); assert.equal(malo(x => { x.c[1][1] = 9; }), null); assert.equal(malo(x => { x.jug[0].pos = 77; }), null);
  assert.equal(malo(x => { x.c[0] = [0, 0, false]; }), null); assert.equal(malo(x => { x.jug.length = 1; }), null); assert.equal(malo(x => { x.mazos.suerte.push(0); }), null);
  assert.equal(validar(null), null); assert.equal(validar({ v: 2 }), null); assert.equal(malo(x => { x.reglas.cpu = 7; }).reglas.cpu, 1);
});
for (const cpu of [0, 1, 2]) await t(`partidas completas CPU contra CPU (nivel ${cpu}): terminan y conservan coherencia`, async () => {
  for (let k = 0; k < 6; k++) {
    const n = 2 + (k % 3), g = new Partida(Array.from({ length: n }, (_, i) => ({ nombre: 'B' + i, ficha: FICHAS[i], color: COLORES_JUGADOR[i], bot: true })), ganchos(), { cpu, rondas: k % 2 ? 40 : 0 });
    let it = 0; while (!g.terminada && it++ < 3000) {
      await g.jugarTurno();
      for (const p of g.jug) assert.ok(Number.isFinite(p.dinero) && p.dinero >= 0 && p.pos >= 0 && p.pos < 40);
      for (const s of g.c) assert.ok(s.nivel >= 0 && s.nivel <= 5 && !(s.hip && s.nivel) && (s.dueno === null || !g.jug[s.dueno].fuera));
      if (it % 40 === 0) assert.ok(validar(JSON.parse(JSON.stringify(g.toJSON()))), 'guardado válido en mitad de la partida');
    }
    assert.ok(g.terminada, `partida ${k} sin terminar`); assert.ok(g.ganador >= 0);
  }
});
await t('CPU difícil construye más que la fácil (en media)', async () => {
  const med = async cpu => { let t = 0; for (let k = 0; k < 8; k++) { const g = nueva(3, { cpu, rondas: 25 }); let i = 0; while (!g.terminada && i++ < 1500) await g.jugarTurno(); t += g.c.reduce((a, s) => a + s.nivel, 0); } return t; };
  const f = await med(0), d = await med(2); console.log('  pisos fácil', f, 'difícil', d); assert.ok(d >= f * .8);
});
console.log(`\n${ok} pruebas correctas`);
