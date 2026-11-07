// Genera js/games/crystalogic/niveles.js: 10 niveles por tramo, todos con solución comprobada por el solucionador.
// Uso: node tools/generar_crystalogic.mjs
import { writeFileSync } from 'node:fs';
import * as M from '../js/games/crystalogic/motor.js';
import { mulberry32 } from '../js/core/semilla.js';

const TOPE_SOL = { p: 6, i: 5, n: 5, a: 6, e: 8 }, QUIERO = 320;
const puntos = (L, R) => {
  const nA = M.huecosA(L).length, nC = M.huecosC(L).length, bucle = L.sc.some((s, i) => s.k === 'c' && s.no >= 0 && L.sc[s.no].y <= s.y && s.no <= i) ? 1 : 0;
  return Math.log10(M.espacio(L) / R.n) * 2 + nA * .5 + nC * 1.4 + bucle * 2 + L.n.length * .25 + M.totalCristales(L) * .35 + (L.e.filter(q => q[3]).length + L.l.length) * .3;
};
const out = {};
for (const [ti, t] of M.TRAMOS.map((x, i) => [i, x.id])) {
  const r = mulberry32(777 + ti * 101), cand = [], vistos = new Set(); let intentos = 0;
  while (cand.length < QUIERO && intentos++ < 400000) {
    const L0 = M.generarNivel(r, t); if (!L0) continue;
    const L = M.validar(L0); if (!L || M.espacio(L) > 400000) continue;
    const R = M.resolver(L, { max: 400000 }); if (!R.n || R.n > TOPE_SOL[t]) continue;
    const firma = JSON.stringify([L.n, L.e, L.l, L.c, L.t, L.s, L.p, L.f, L.k, L.sc.length]); if (vistos.has(firma)) continue; vistos.add(firma);
    L.sol = R.mejor; L.par = R.min; cand.push({ L, R, s: puntos(L, R) });
  }
  cand.sort((a, b) => a.s - b.s);
  const lo = Math.floor(cand.length * .04), hi = Math.floor(cand.length * .97), pick = [];
  for (let k = 0; k < 10; k++) pick.push(cand[Math.min(cand.length - 1, lo + Math.round((hi - lo) * k / 9))]);
  out[t] = pick.map(c => c.L);
  console.log(t, 'candidatos', cand.length, 'intentos', intentos, 'puntos', pick.map(c => c.s.toFixed(1)).join(' '), 'sols', pick.map(c => c.R.n).join(','));
}
const s = '// Niveles de Crystalogic (generados con tools/generar_crystalogic.mjs; cada uno tiene solución comprobada).\n// Formato y significado de los campos: ver js/games/crystalogic/motor.js\nexport const NIVELES = ' + JSON.stringify(out) + ';\n';
writeFileSync(new URL('../js/games/crystalogic/niveles.js', import.meta.url), s);
console.log('niveles.js', s.length, 'bytes');
