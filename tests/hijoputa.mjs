// Pruebas del motor de Hijoputa (sin navegador):  node tests/hijoputa.mjs
import assert from 'node:assert/strict';
import * as H from '../js/games/hijoputa/motor.js';
let ok = 0; const t = async (n, f) => { try { await f(); ok++; console.log('✓', n); } catch (e) { console.error('✗', n, '\n', e); process.exitCode = 1; } };
const nueva = (n = 3, nivel = 'medio') => H.crear({ jugadores: Array.from({ length: n }, (_, k) => ({ nombre: k ? 'CPU' + k : 'Tú', cpu: k > 0 })), nivel });
// Reparte una situación concreta: carta de arriba `top`, el jugador i con `mano`, el resto 6 cartas y lo demás al mazo
const poner = (S, i, mano, top = S.desc[S.desc.length - 1], robables = []) => {
  const libres = Array.from({ length: 40 }, (_, c) => c).filter(c => c !== top && !mano.includes(c) && !robables.includes(c));
  S.desc = [top]; S.paloActivo = top / 10 | 0; S.castigo = 0; S.fase = 'jugar'; S.robada = -1; S.acusable = -1;
  S.jug.forEach((J, k) => { J.gritado = false; J.mano = k === i ? mano.slice() : libres.splice(0, 6); });
  S.mazo = libres.concat(robables.slice().reverse());                  // robables: las siguientes cartas del mazo, en ese orden
};
const completa = S => { const t = [...S.mazo, ...S.desc, ...S.jug.flatMap(J => J.mano)]; assert.equal(t.length, 40); assert.equal(new Set(t).size, 40); };

await t('crear: 7 cartas, 40 en total y primera carta normal', () => { for (let k = 0; k < 100; k++) { const S = nueva(1 + (k % 3) + 1); S.jug.forEach(J => assert.equal(J.mano.length, 7)); completa(S); assert.ok(![0, 1, 7, 9].includes(H.pos(S.desc[0]))); assert.ok(H.validar(JSON.parse(JSON.stringify(S)))); } });
await t('jugable: palo, número, sota y castigo', () => {
  const S = nueva(); S.desc = [4]; S.paloActivo = 0;                    // 5 de oros
  assert.ok(H.jugable(S, 0)); assert.ok(H.jugable(S, 14)); assert.ok(!H.jugable(S, 12)); assert.ok(H.jugable(S, 37));
  S.castigo = 2; assert.ok(!H.jugable(S, 14)); assert.ok(H.jugable(S, 21)); assert.ok(!H.jugable(S, 37));
});
await t('2: castigo acumulado y robo de todo', () => {
  const S = nueva(3); poner(S, 0, [1, 5, 12], 4); S.turno = 0;
  assert.ok(H.jugar(S, 0, 1).ok); assert.equal(S.castigo, 2); assert.equal(S.turno, 1);
  S.mazo = S.mazo.filter(c => c !== 11); S.jug.forEach(J => { J.mano = J.mano.filter(c => c !== 11); }); S.jug[1].mano.push(11); assert.ok(H.jugar(S, 1, 11).ok); assert.equal(S.castigo, 4);   // 2 de copas encadenado
  const n = S.jug[2].mano.length; const r = H.robar(S, 2); assert.equal(r.cartas, 4); assert.equal(S.jug[2].mano.length, n + 4); assert.equal(S.castigo, 0); assert.equal(S.turno, 0); completa(S);
});
await t('As: el siguiente roba 1 y pierde el turno', () => {
  const S = nueva(3); poner(S, 0, [0, 5, 12], 4); S.turno = 0; const n = S.jug[1].mano.length;
  const r = H.jugar(S, 0, 0); assert.ok(r.ok); assert.equal(S.jug[1].mano.length, n + 1); assert.equal(S.turno, 2); completa(S);
});
await t('Rey: repite turno. Sota: cambia el palo', () => {
  const S = nueva(2); poner(S, 0, [9, 37, 12], 4); S.turno = 0;
  assert.ok(H.jugar(S, 0, 9).extra); assert.equal(S.turno, 0);
  assert.ok(H.jugar(S, 0, 37, 2).ok); assert.equal(S.paloActivo, 2); assert.equal(S.turno, 1);
});
await t('robar: una carta; si encaja se puede jugar o guardar', () => {
  const S = nueva(2); poner(S, 0, [12, 13], 4, [6]); S.turno = 0;      // el 7 de oros encaja
  const r = H.robar(S, 0); assert.ok(r.jugable); assert.equal(S.fase, 'robo'); assert.ok(H.jugables(S, 0).every(c => c === 6)); assert.ok(H.pasar(S, 0)); assert.equal(S.turno, 1); assert.equal(S.jug[0].mano.length, 3);
  const S2 = nueva(2); poner(S2, 0, [12, 13], 4, [25]); S2.turno = 0; const r2 = H.robar(S2, 0); assert.ok(r2.pasa); assert.equal(S2.turno, 1);
});
await t('grito: sin gritar al quedar a una carta se puede acusar (+5); al tirar la última sin gritar, +5', () => {
  const S = nueva(3); poner(S, 0, [3, 14], 4); S.turno = 0;
  H.jugar(S, 0, 3); assert.equal(S.acusable, 0); assert.ok(H.acusar(S, 0)); assert.equal(S.jug[0].mano.length, 6); completa(S);
  const S2 = nueva(3); poner(S2, 0, [3, 14], 4); S2.turno = 0; H.jugar(S2, 0, 3); assert.ok(H.gritar(S2, 0)); assert.ok(!H.acusar(S2, 0));
  S2.turno = 0; S2.paloActivo = 1; S2.desc.push(10); S2.mazo = S2.mazo.filter(c => c !== 10); const r = H.jugar(S2, 0, 14); assert.equal(r.ganador, 0); assert.equal(S2.fase, 'fin');
  const S3 = nueva(2); poner(S3, 0, [3], 4); S3.turno = 0; const r3 = H.jugar(S3, 0, 3); assert.ok(r3.castigoGrito); assert.equal(S3.jug[0].mano.length, 5); assert.equal(S3.fase, 'jugar');
});
await t('mazo vacío: se rebaraja el descarte', () => {
  const S = nueva(2); poner(S, 0, [12], 4); S.turno = 0; S.desc = S.mazo.splice(0, 12).concat([4]); const r = H.robar(S, 0); assert.ok(r.ok); completa(S);
});
await t('partidas completas CPU contra CPU terminan sin romper la baraja', () => {
  for (const nivel of ['facil', 'medio', 'dificil']) for (let k = 0; k < 60; k++) {
    const S = nueva(2 + (k % 3), nivel); S.jug.forEach(J => { J.cpu = true; }); let g = 0;
    while (S.fase !== 'fin' && g++ < 3000) {
      const i = S.turno; H.pillar(S, i);
      for (let paso = 0; paso < 3 && S.turno === i && S.fase !== 'fin'; paso++) {
        const d = H.decidir(S, i);
        if (d.tipo === 'jugar') { const r = H.jugar(S, i, d.carta, d.palo); assert.ok(r.ok); if (S.fase !== 'fin') H.cpuGrita(S, i); if (r.extra) paso--; }
        else if (d.tipo === 'robar') H.robar(S, i); else H.pasar(S, i);
      }
      completa(S);
    }
    assert.equal(S.fase, 'fin', nivel + ' no termina');
  }
});
console.log(ok + ' pruebas correctas');
