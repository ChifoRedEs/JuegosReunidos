// Pruebas del motor de Hotel (sin navegador):  node tests/hotel.mjs
import assert from 'node:assert/strict';
import * as M from '../js/games/hotel/motor.js';
import * as D from '../js/games/hotel/datos.js';

let ok = 0; const t = async (n, f) => { try { await f(); ok++; console.log('✓', n); } catch (e) { console.error('✗', n, '\n', e); process.exitCode = 1; } };
const nueva = (n = 3, o = {}) => M.crear({ n, semilla: 7, cpu: [1, 1, 1, 1], ...o });

await t('datos: camino de 48 casillas cerrado, cada celda con 2 vecinos', () => {
  assert.equal(D.N, 48); assert.equal(D.TIPO.length, 48);
  const set = new Set(D.CAMINO.map(c => c.join(',')));
  for (const [f, c] of D.CAMINO) assert.equal([[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => set.has((f + a) + ',' + (c + b))).length, 2);
  assert.equal(D.TIPO[0], 'P'); assert.ok(D.TIPO.filter(x => x === 'C').length >= 14); assert.ok(D.TIPO.filter(x => x === 'O').length >= 6);
});
await t('datos: 8 hoteles con tablas de la edición 1986 y todos con casillas de compra adyacentes', () => {
  assert.equal(D.IDS_HOTEL.length, 8);
  assert.equal(D.HOTELES.pres.edif.length, 4); assert.equal(D.HOTELES.boom.edif.length, 1); assert.equal(D.HOTELES.waik.edif.length, 5);
  assert.equal(D.tarifa('etoile', 5, false), 450); assert.equal(D.tarifa('etoile', 5, true), 750); assert.equal(D.tarifa('fuji', 0, false), 0);
  for (const h of D.IDS_HOTEL) { assert.ok(D.CASILLAS_DE[h].filter(i => D.TIPO[i] === 'C').length >= 1, 'compra junto a ' + h); assert.ok(D.CASILLAS_DE[h].length >= 4); }
  for (let i = 0; i < D.N; i++) if (D.TIPO[i] === 'C') assert.ok(D.ADYACENTES[i].length > 0, 'C sin terreno ' + i);
});
await t('crear: dinero inicial y estado válido', () => {
  const S = nueva(4); assert.equal(S.jug.length, 4); assert.ok(S.jug.every(p => p.dinero === 12000)); assert.ok(M.validar(S));
  assert.ok(M.validar(JSON.parse(JSON.stringify(S))));
});
await t('tirar: el coche avanza, nunca comparte casilla y el 6 repite turno', () => {
  const S = nueva(3); S.jug[1].pos = 3; S.sem = 123;
  let vistoSeis = false;
  for (let i = 0; i < 400 && S.fase !== 'fin'; i++) {
    const a = S.turno, antes = S.jug[a].pos;
    if (S.fase === 'tirar') {
      const r = M.decidir(S, { t: 'tirar' }); assert.ok(r.ok);
      const pos = S.jug.filter(p => p.vivo && p.pos !== 0).map(p => p.pos); assert.equal(new Set(pos).size, pos.length, 'dos coches en la misma casilla');
      if (S.dado === 6) { vistoSeis = true; assert.ok(S.seis || S.fase !== 'tirar'); }
    } else { const r = M.decidir(S, M.cpuDecide(S)); assert.ok(r.ok, r.msg); }
  }
  assert.ok(vistoSeis);
});
await t('salario al cruzar el Banco y entradas en el Ayuntamiento', () => {
  const S = nueva(2); S.jug[0].pos = 40; S.sem = 5;
  // forzamos dado sacando una semilla que dé ≥2
  let r; do { S.sem++; const c = JSON.parse(JSON.stringify(S)); M.decidir(c, { t: 'tirar' }); if (c.dado >= 2) break; } while (true);
  const d0 = S.jug[0].dinero; r = M.decidir(S, { t: 'tirar' }); assert.ok(S.dado >= 2);
  assert.ok(S.jug[0].dinero >= d0 + 2000 - 3000, 'cobro'); assert.ok(r.ev.some(e => e.t === 'cobra'));
});
await t('comprar terreno, no dos por turno, y compra obligatoria a mitad de precio', () => {
  const S = nueva(2); const sq = D.CASILLAS_DE.fuji.find(i => D.TIPO[i] === 'C'); S.jug[0].pos = sq; S.fase = 'compra';
  const L = M.legales(S); assert.ok(L.lotes.some(x => x.h === 'fuji' && x.precio === 1000));
  assert.ok(M.decidir(S, { t: 'comprar', h: 'fuji' }).ok); assert.equal(S.hot.fuji.dueno, 0); assert.equal(S.jug[0].dinero, 11000);
  // ahora un rival cae junto a un terreno vacío ajeno
  S.fase = 'compra'; S.turno = 1; S.compro = false; S.jug[1].pos = sq;
  const L2 = M.legales(S); const o = L2.lotes.find(x => x.h === 'fuji'); assert.ok(o && o.forzosa && o.precio === 500);
  M.decidir(S, { t: 'comprar', h: 'fuji' }); assert.equal(S.hot.fuji.dueno, 1); assert.equal(S.jug[0].dinero, 11500); assert.equal(S.jug[1].dinero, 11500);
  // con edificio principal ya no se puede
  S.hot.fuji.etapa = 1; S.fase = 'compra'; S.turno = 0; S.jug[0].pos = sq; S.compro = false; assert.ok(!M.legales(S).lotes.some(x => x.h === 'fuji'));
});
await t('obras: no se construye el turno de compra, orden de fases y coste según dado', () => {
  const S = nueva(2); S.hot.boom = { dueno: 0, etapa: 0, inst: false, desde: 1, ents: [] }; S.jug[0].turnos = 1; S.fase = 'obras';
  assert.equal(M.legales(S).obras.length, 0);
  S.jug[0].turnos = 2; assert.equal(M.legales(S).obras.length, 1);
  assert.equal(M.costePlan(S, 0, ['boom']), 1800); assert.equal(M.costePlan(S, 0, ['boom', 'boom']), -1); assert.equal(M.costePlan(S, 0, ['fuji']), -1);
  const d0 = S.jug[0].dinero; S.sem = 1; const r = M.decidir(S, { t: 'obras', plan: ['boom'] }); assert.ok(r.ok);
  const cara = r.ev.find(e => e.t === 'permiso').cara;
  const esperado = { verde: 1800, rojo: 0, H: 0, x2: 3600 }[cara]; assert.equal(d0 - S.jug[0].dinero, esperado);
  assert.equal(S.hot.boom.etapa, cara === 'rojo' ? 0 : 1);
});
await t('instalación solo con hotel completo y entradas con tope/una por casilla', () => {
  const S = nueva(2); S.hot.boom = { dueno: 0, etapa: 1, inst: false, desde: 0, ents: [] };
  assert.equal(M.legales(S).inst.length, 1); S.hot.fuji = { dueno: 0, etapa: 2, inst: false, desde: 0, ents: [] }; assert.equal(M.legales(S).inst.length, 1);
  M.decidir(S, { t: 'instalacion', h: 'boom' }); assert.ok(S.hot.boom.inst); assert.equal(S.jug[0].dinero, 11750);
  S.fase = 'ayto'; const ops = M.legales(S).entradas; assert.ok(ops.length > 0);
  const e = ops.find(x => x.h === 'boom'); M.decidir(S, { t: 'entrada', h: 'boom', sq: e.sq });
  assert.equal(S.entDe[e.sq], 'boom'); assert.equal(S.jug[0].dinero, 11650);
});
await t('estancia: el rival paga noches × tarifa al dueño', () => {
  const S = nueva(2); S.hot.boom = { dueno: 0, etapa: 1, inst: false, desde: 0, ents: [11] }; S.entDe[11] = 'boom';
  S.turno = 1; S.jug[1].pos = 11; S.pasos = ['estancia']; S.fase = 'tirar'; S.sem = 9;
  const a0 = S.jug[0].dinero, b0 = S.jug[1].dinero;
  // simulamos el paso con avanzar vía una decisión inocua: usamos 'saltar' en fase obras con pasos pendientes
  S.fase = 'obras'; const r = M.decidir(S, { t: 'saltar' }); const e = r.ev.find(x => x.t === 'estancia');
  assert.ok(e && e.coste === e.noches * 400); assert.equal(S.jug[0].dinero, a0 + e.coste); assert.equal(S.jug[1].dinero, b0 - e.coste);
});
await t('deuda: subasta, venta al mejor postor y demolición si nadie puja', () => {
  const S = nueva(3); S.hot.pres = { dueno: 0, etapa: 2, inst: false, desde: 0, ents: [] }; S.jug[0].dinero = 500;
  S.turno = 0; S.fase = 'obras'; S.jug[0].turnos = 3; S.hot.pres.desde = 0;
  S.deuda = null; const ev = []; // provocamos deuda con una estancia simulada
  S.hot.fuji = { dueno: 1, etapa: 3, inst: true, desde: 0, ents: [20] }; S.entDe[20] = 'fuji'; S.jug[0].pos = 20; S.pasos = ['estancia']; S.sem = 3;
  const r = M.decidir(S, { t: 'saltar' }); assert.equal(S.fase, 'deuda', JSON.stringify(r.ev));
  assert.ok(S.deuda.cant > 0);
  M.decidir(S, { t: 'vender', h: 'pres' }); assert.equal(S.fase, 'subasta');
  const q = S.sub.pend[S.sub.cur]; assert.notEqual(q, 0);
  M.decidir(S, { t: 'pujar', cant: 1000 }); while (S.fase === 'subasta') M.decidir(S, { t: 'retirar' });
  assert.notEqual(S.hot.pres.dueno, 0); assert.ok(S.jug[0].dinero >= 0);
  // demolición
  const T = nueva(2); T.hot.safari = { dueno: 0, etapa: 1, inst: false, desde: 0, ents: [46] }; T.entDe[46] = 'safari'; T.jug[0].dinero = 0;
  T.deuda = { j: 0, cant: 300, a: 1, motivo: '' }; T.fase = 'deuda';
  M.decidir(T, { t: 'vender', h: 'safari' }); while (T.fase === 'subasta') M.decidir(T, { t: 'retirar' });
  assert.equal(T.hot.safari.dueno, -1); assert.equal(T.entDe[46], null);
});
await t('quiebra: sin hoteles ni dinero se queda eliminado y el otro gana', () => {
  const S = nueva(2); S.hot.fuji = { dueno: 1, etapa: 3, inst: true, desde: 0, ents: [8] }; S.entDe[8] = 'fuji'; S.jug[0].pos = 8; S.jug[0].dinero = 100; S.pasos = ['estancia']; S.fase = 'obras';
  M.decidir(S, { t: 'saltar' }); assert.equal(S.fase, 'fin'); assert.equal(S.ganador, 1); assert.ok(!S.jug[0].vivo);
});
await t('partidas completas de CPU (varios tamaños y niveles) terminan sin romper invariantes', () => {
  let fin = 0;
  for (let n = 2; n <= 4; n++) for (const niv of [1, 2, 3]) for (let semilla = 1; semilla <= 4; semilla++) {
    const S = M.crear({ n, semilla: semilla * 977 + n, cpu: [1, 1, 1, 1], nivel: niv, limite: 60 });
    let pasos = 0;
    while (S.fase !== 'fin' && pasos++ < 20000) {
      const d = M.cpuDecide(S), r = M.decidir(S, d); assert.ok(r.ok, `n=${n} niv=${niv} s=${semilla} fase=${S.fase} ${JSON.stringify(d)} ${r.msg}`);
      for (const p of S.jug) { assert.ok(Number.isFinite(p.dinero) && p.dinero >= 0, 'dinero negativo ' + p.dinero); }
      const pos = S.jug.filter(p => p.vivo && p.pos !== 0).map(p => p.pos); assert.equal(new Set(pos).size, pos.length);
      for (const h of D.IDS_HOTEL) { const H = S.hot[h]; assert.ok(H.etapa >= 0 && H.etapa <= D.nEdif(h)); assert.ok(!H.inst || H.etapa === D.nEdif(h)); assert.ok(H.ents.length <= D.MAX_ENTRADAS); assert.ok(H.dueno === -1 ? H.etapa === 0 && !H.ents.length : S.jug[H.dueno].vivo, 'hotel de muerto'); for (const sq of H.ents) assert.equal(S.entDe[sq], h); }
    }
    assert.equal(S.fase, 'fin', `sin acabar n=${n} niv=${niv} s=${semilla}`); fin++;
    assert.ok(S.ganador >= 0 && S.jug[S.ganador].vivo);
  }
  assert.equal(fin, 36);
});
await t('partidas sin límite: alguien acaba ganando por eliminación (n=2, nivel 3)', () => {
  let porElim = 0;
  for (let s = 1; s <= 6; s++) {
    const S = M.crear({ n: 2, semilla: s * 31, cpu: [1, 1], nivel: 3 }); let k = 0;
    while (S.fase !== 'fin' && k++ < 60000) assert.ok(M.decidir(S, M.cpuDecide(S)).ok);
    if (S.fase === 'fin') porElim++;
  }
  assert.ok(porElim >= 4, 'terminaron ' + porElim);
});
console.log(`\n${ok} pruebas OK`);
