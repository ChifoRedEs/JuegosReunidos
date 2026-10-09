#!/usr/bin/env node
// Lee data/nonogramas/fuentes.txt, comprueba con el resolvedor del juego que cada dibujo se
// resuelve solo con lógica y escribe data/nonogramas/pixelart.json con los válidos.
//   Uso:  node tools/verificar_nonogramas.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runs, colsOf, solveGrid } from '../js/games/nonogram/solver.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const txt = readFileSync(join(raiz, 'data/nonogramas/fuentes.txt'), 'utf8').split(/\r?\n/);
const dibujos = []; let actual = null;
for (const l of txt) {
  if (l.startsWith('# ') && !/^# (Dibujos|Separa|Luego|Solo)/.test(l)) { actual = { nombre: l.slice(2).trim(), filas: [] }; dibujos.push(actual); }
  else if (/^[#.]+$/.test(l.trim()) && actual) actual.filas.push(l.trim());
}
const salida = {}; let malos = 0;
for (const d of dibujos) {
  const n = d.filas.length;
  if (!d.filas.every(f => f.length === n)) { console.log(`✗ ${d.nombre}: no es cuadrado`); malos++; continue; }
  const sol = d.filas.map(f => [...f].map(c => c === '#' ? 1 : 0));
  const r = solveGrid(sol.map(runs), colsOf(sol, n).map(runs), n);
  if (!r.ok) { console.log(`✗ ${d.nombre} (${n}×${n}): hace falta adivinar, se descarta`); malos++; continue; }
  (salida[n] = salida[n] || []).push({ nombre: d.nombre, filas: d.filas });
  console.log(`✓ ${d.nombre} (${n}×${n}) · ${r.passes} pasadas`);
}
writeFileSync(join(raiz, 'data/nonogramas/pixelart.json'), JSON.stringify(salida, null, 1));
console.log(`\n${dibujos.length - malos} válidos de ${dibujos.length}. Escrito data/nonogramas/pixelart.json`);
