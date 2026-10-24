import * as M from '../js/games/mastermind/motor.js';
let ok = 0; const t = (n, f) => { try { f(); ok++; console.log('✓', n); } catch (e) { console.log('✗', n, e.message); process.exitCode = 1; } };
const aser = (c, m) => { if (!c) throw new Error(m); };
t('valorar casos clásicos', () => {
  const eq = (a, b) => a[0] === b[0] && a[1] === b[1];
  aser(eq(M.valorar([0, 1, 2, 3], [0, 1, 2, 3]), [4, 0]), 'idéntico'); aser(eq(M.valorar([0, 1, 2, 3], [3, 2, 1, 0]), [0, 4]), 'invertido');
  aser(eq(M.valorar([0, 0, 1, 1], [0, 1, 0, 1]), [2, 2]), 'mixto'); aser(eq(M.valorar([0, 0, 0, 1], [0, 1, 1, 1]), [2, 0]), 'repetidos'); aser(eq(M.valorar([1, 2, 3, 4], [5, 5, 5, 5]), [0, 0]), 'nada');
  aser(eq(M.valorar([0, 1, 1, 2], [1, 0, 0, 1]), [0, 3]), 'conteo blancas');
});
for (const [k, p] of Object.entries(M.PRESETS)) t(`IA resuelve en «${k}»`, () => {
  let total = 0, peor = 0; const N = k === 'experto' ? 4 : 12;
  for (let i = 0; i < N; i++) {
    const S = M.nueva('codigo', p, 'x' + i); S.sec = M.secretoAzar(p, () => ((i * 7919 + 13) % 997) / 997);
    let g = 0; while (!S.done && g < 30) { const c = M.jugadaIA(S, 's' + g); aser(c, 'sin jugada'); aser(M.intentar(S, c), 'intento inválido'); g++; }
    aser(S.done && S.gano, `no lo resuelve (${S.jug.length}/${S.max})`); total += g; peor = Math.max(peor, g);
  }
  console.log('   media', (total / N).toFixed(2), 'peor', peor);
});
t('sin repetidos: secreto y candidatos', () => { const S = M.nueva('adivinar', M.PRESETS.facil, 'a'); aser(new Set(S.sec).size === 4, 'repetidos'); const c = M.candidatos(S); aser(c.n === 5 * 4 * 3 * 2, 'candidatos ' + c.n); });
t('pista es compatible', () => { const S = M.nueva('adivinar', M.PRESETS.clasico, 'b'); M.intentar(S, [0, 1, 2, 3]); const p = M.pista(S); aser(p && p.n > 0, 'pista'); const f = M.valorar(p.cod, S.jug[0]); aser(f[0] === S.fb[0][0] && f[1] === S.fb[0][1], 'incompatible'); });
t('fin por intentos y por acierto', () => { const S = M.nueva('adivinar', { ...M.PRESETS.clasico, max: 6 }, 'c'); for (let i = 0; i < 6; i++) { const g = [0, 0, 0, 0]; if (M.valorar(S.sec, g)[0] === 4) break; M.intentar(S, g); } aser(S.done || S.jug.length < 6, 'x'); const S2 = M.nueva('adivinar', M.PRESETS.clasico, 'd'); M.intentar(S2, S2.sec); aser(S2.done && S2.gano, 'gana'); aser(M.intentar(S2, S2.sec) === null, 'sigue jugando'); });
t('validar rechaza basura y acepta lo bueno', () => {
  const S = M.nueva('adivinar', M.PRESETS.super, 'e'); M.intentar(S, [0, 1, 2, 3, 4]); aser(M.validar(JSON.parse(JSON.stringify(S))), 'bueno');
  for (const x of [null, {}, { modo: 'adivinar' }, { ...S, sec: [9, 9, 9, 9, 9] }, { ...S, fb: [[0, 0]] }, { ...S, pos: 9 }, { ...S, modo: '__proto__' }, { ...S, jug: Array(40).fill([0, 0, 0, 0, 0]), fb: Array(40).fill([1, 1]) }]) aser(M.validar(x) === null, 'acepta ' + JSON.stringify(x).slice(0, 60));
  aser(M.validar({ ...S, done: true, gano: true }).done === false, 'done falso aceptado');
});
console.log(ok, 'pruebas correctas');
