import { ciclo } from '../core/tutorial.js';
// Tutorial de Sudoku
const P = [[1, 0, 0, 4], [0, 4, 1, 0], [0, 1, 4, 0], [4, 0, 0, 1]], S = [[1, 2, 3, 4], [3, 4, 1, 2], [2, 1, 4, 3], [4, 3, 2, 1]];
export const TUTORIAL = {
  titulo: 'Sudoku',
  pasos: [
    { t: 'Las tres reglas', h: `<p>Hay que rellenar la cuadrícula de 9×9 con cifras del 1 al 9 de modo que <b>cada cifra aparezca una sola vez</b> en:</p><ul><li>cada <b>fila</b>,</li><li>cada <b>columna</b>,</li><li>cada uno de los 9 <b>cuadrados de 3×3</b>.</li></ul><p>Todos los sudokus del juego tienen <b>una única solución</b>, que se encuentra razonando, sin adivinar.</p>` },
    { t: 'Ejercicio: un mini-sudoku 4×4', h: `<p>Para practicar, uno pequeño: cifras del 1 al 4, sin repetir en filas, columnas ni los cuadrados de 2×2. Toca las casillas vacías para cambiar su número.</p>`, req: true,
      demo(z, ctx) {
        let h = '<div class="tt-g" style="grid-template-columns:repeat(4,46px);gap:2px">'; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) h += P[y][x] ? `<div class="tt-k fijo" style="${x === 1 ? 'margin-right:4px;' : ''}">${P[y][x]}</div>` : `<button class="tt-k" type="button" data-p="${y}${x}"></button>`;
        z.innerHTML = h + '</div>';
        const v = P.map(r => [...r]), cs = {};
        z.querySelectorAll('button').forEach(b => { const y = +b.dataset.p[0], x = +b.dataset.p[1]; cs[y + '' + x] = ciclo(b, 4, n => { v[y][x] = n; chk(); }); });
        function chk() {
          if (v.flat().some(n => !n)) { ctx.info(''); return; }
          const ok = a => new Set(a).size === 4;
          for (let i = 0; i < 4; i++) if (!ok(v[i]) || !ok(v.map(r => r[i]))) { ctx.mal('❌ Hay una cifra repetida en alguna fila o columna.'); return; }
          for (let by = 0; by < 4; by += 2) for (let bx = 0; bx < 4; bx += 2) if (!ok([v[by][bx], v[by][bx + 1], v[by + 1][bx], v[by + 1][bx + 1]])) { ctx.mal('❌ Hay una cifra repetida en un cuadrado de 2×2.'); return; }
          ctx.ok('✅ ¡Sudoku resuelto!');
        }
        return { ver: () => { for (const k in cs) cs[k].set(S[+k[0]][+k[1]]); } };
      } },
    { t: 'Cómo razonar', h: `<ul><li><b>Única opción</b>: si en una fila faltan solo 2 cifras, mira qué columnas las descartan.</li><li><b>Casilla obligada</b>: si un 5 solo cabe en un sitio de un cuadrado, ese es su sitio.</li><li>✏️ <b>Notas</b>: apunta a lápiz los candidatos de cada casilla y ve tachando.</li></ul><p>✔ <b>Comprobar</b> marca los errores y 💡 <b>Pista</b> rellena una casilla (las pistas no cuentan para el récord).</p>` },
  ],
};
