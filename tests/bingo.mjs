// Pruebas del motor de Bingo (sin navegador):  node tests/bingo.mjs
import assert from 'node:assert/strict';
import * as B from '../js/core/bingo/motor.js';
import { APODOS } from '../js/core/bingo/apodos.js';
import { validar, resumen } from '../js/games/bingolive/index.js';

let ok = 0; const t = async (n, f) => { try { await f(); ok++; console.log('✓', n); } catch (e) { console.error('✗', n, '\n', e); process.exitCode = 1; } };

await t('bombo: permutación de 1–90', () => {
  const b = B.nuevoBombo(); assert.equal(b.length, 90); assert.deepEqual([...b].sort((x, y) => x - y), Array.from({ length: 90 }, (_, i) => i + 1));
});
await t('cartón 3×9: 2000 cartones válidos', () => {
  for (let k = 0; k < 2000; k++) {
    const c = B.crearCarton(); assert.equal(c.length, 3);
    const todos = [];
    for (const f of c) { assert.equal(f.length, 9); assert.equal(f.filter(Boolean).length, 5); }
    for (let j = 0; j < 9; j++) {
      const col = c.map(f => f[j]).filter(Boolean); assert.ok(col.length >= 1 && col.length <= 3);
      for (const n of col) { assert.equal(B.columna(n), j); todos.push(n); }
      assert.deepEqual(col, [...col].sort((a, b) => a - b));
    }
    assert.equal(new Set(todos).size, 15);
  }
});
await t('palabras/frase para 1–90 y 90 apodos', () => {
  assert.equal(APODOS.length, 90); assert.equal(new Set(APODOS).size, 90);
  for (let n = 1; n <= 90; n++) { assert.ok(B.palabras(n).length > 0); assert.ok(B.frase(n, 'tombola', APODOS[n - 1]).includes(APODOS[n - 1])); assert.ok(B.frase(n, 'numero', '').length > 0); }
});
await t('comprobar: línea, bingo y faltantes', () => {
  const filas = [[1, 12, 23, 34, 45], [2, 13, 24, 35, 46], [3, 14, 25, 36, 47]];
  assert.equal(B.validarFilas(filas), null);
  let r = B.comprobar(filas, new Set([1, 12, 23, 34, 45])); assert.deepEqual(r.lineas, [0]); assert.equal(r.bingo, false); assert.equal(r.faltan.length, 10);
  r = B.comprobar(filas, new Set(filas.flat())); assert.equal(r.bingo, true); assert.equal(r.faltan.length, 0);
  assert.ok(B.validarFilas([[1, 1, 2, 3, 4], filas[1], filas[2]]));
  assert.ok(B.validarFilas([[0, 2, 3, 4, 5], filas[1], filas[2]]));
});
await t('línea (5 números) y bingo (15): validar y comprobar', () => {
  assert.ok(B.validarNumeros([1, 2, 3, 0, 0], 5)); assert.ok(B.validarNumeros([1, 2, 3, 4, 4], 5)); assert.ok(B.validarNumeros([1, 2, 3, 4, 91], 5)); assert.equal(B.validarNumeros([1, 2, 3, 4, 5], 5), null);
  const out = new Set([1, 2, 3, 4]); let r = B.comprobarNumeros([1, 2, 3, 4, 5], out); assert.equal(r.ok, false); assert.deepEqual(r.faltan, [5]);
  out.add(5); assert.equal(B.comprobarNumeros([1, 2, 3, 4, 5], out).ok, true);
  const q = Array.from({ length: 15 }, (_, i) => i + 1); assert.equal(B.validarNumeros(q, 15), null); assert.equal(B.comprobarNumeros(q, new Set(q.slice(1))).faltan.length, 1);
});
await t('partida guardada: validar y resumen', () => {
  const d = { orden: B.nuevoBombo(), n: 5, lineas: 1, bingo: false, reg: false };
  assert.ok(validar(d)); assert.equal(validar({ ...d, orden: [1, 2] }), null); assert.equal(validar({ ...d, n: 99 }), null);
  assert.match(resumen(d).texto, /Bola 5\/90/);
});
console.log(ok + ' pruebas correctas');
