import { ciclo } from '../core/tutorial.js';
// Tutorial de Calcudoku
const COLS = { a: '#FDE2E4', b: '#DDEBFF', c: '#DFF5DC', d: '#FFF3C4', e: '#EBDDFF' };
// 3x3: jaulas
const J = ['aab', 'cdb', 'cee'], ETQ = { '0,0': '3+', '0,2': '2−', '1,0': '6×', '1,1': '3', '2,1': '2÷' };
// solución válida: 1 2 3 / 2 3 1 / 3 1 2 ; comprobamos con jaulas
const SOL = [[1, 2, 3], [2, 3, 1], [3, 1, 2]];
export const TUTORIAL = {
  titulo: 'Calcudoku',
  pasos: [
    { t: 'Las reglas básicas', h: `<p>Es como un sudoku pero con cálculos. En un tablero de <b>N×N</b> se escriben los números del <b>1 al N</b>, sin repetir en ninguna fila ni columna.</p><p>Además, el tablero está dividido en <b>jaulas</b> (zonas de color) con un objetivo y una operación: <b>+</b> suma, <b>−</b> resta, <b>×</b> multiplicación y <b>÷</b> división.</p><p>Por ejemplo, "<b>6×</b>" en una jaula de 2 casillas significa que sus números se multiplican y dan 6 (2 y 3, o 1 y 6).</p>` },
    { t: 'Restas y divisiones', h: `<p>En la resta y la división <b>el orden no importa</b>: "2−" vale 1 y 3 (3−1) y "2÷" vale 1 y 2 (o 2 y 4…).</p><p>Las jaulas de <b>una sola casilla</b> son regalos: el número es el que pone.</p><p>En una jaula, un número <b>sí se puede repetir</b> si las casillas no comparten fila ni columna.</p>` },
    { t: 'Resuélvelo (3×3)', h: `<p>Toca cada casilla para cambiar su número (1, 2, 3). Sin repetir en filas y columnas y cumpliendo las jaulas.</p>`, req: true,
      demo(z, ctx) {
        let html = '<div class="tt-g" style="grid-template-columns:repeat(3,56px)">';
        for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) html += `<button class="tt-k" type="button" data-p="${y}${x}" style="background:${COLS[J[y][x]]};position:relative">${ETQ[y + ',' + x] ? `<i class="d" style="left:3px;right:auto;top:1px;font-size:11px">${ETQ[y + ',' + x]}</i>` : ''}<span class="v"></span></button>`;
        z.innerHTML = html + '</div>';
        const v = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], cs = [];
        z.querySelectorAll('button').forEach(b => { const y = +b.dataset.p[0], x = +b.dataset.p[1], sp = b.querySelector('.v'); b.onclick = () => { v[y][x] = (v[y][x] + 1) % 4; sp.textContent = v[y][x] || ''; chk(); }; cs.push([y, x, sp]); });
        function chk() {
          if (v.flat().some(n => !n)) { ctx.info(''); return; }
          for (let i = 0; i < 3; i++) { if (new Set(v[i]).size < 3) { ctx.mal('❌ Hay un número repetido en la fila ' + (i + 1) + '.'); return; } if (new Set(v.map(r => r[i])).size < 3) { ctx.mal('❌ Hay un número repetido en la columna ' + (i + 1) + '.'); return; } }
          const g = k => { const r = []; for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) if (J[y][x] === k) r.push(v[y][x]); return r; };
          const a = g('a'), b = g('b'), c = g('c'), d = g('d'), e = g('e');
          const mal = [];
          if (a[0] + a[1] !== 3) mal.push('3+'); if (Math.abs(b[0] - b[1]) !== 2) mal.push('2−'); if (c[0] * c[1] !== 6) mal.push('6×'); if (d[0] !== 3) mal.push('el 3'); if (Math.max(...e) / Math.min(...e) !== 2 && e.length) mal.push('2÷');
          if (!mal.length) ctx.ok('✅ ¡Resuelto!'); else ctx.mal('❌ Fallan estas jaulas: ' + mal.join(', ') + '.');
        }
        return { ver: () => { cs.forEach(([y, x, sp]) => { v[y][x] = SOL[y][x]; sp.textContent = SOL[y][x]; }); chk(); } };
      } },
    { t: 'Truco para empezar', h: `<p>Empieza por las jaulas de una casilla, y por las que solo tienen una combinación posible (como <b>6×</b> en 2 casillas con números del 1 al 3: ha de ser 2 y 3).</p><p>Con ✏️ <b>notas</b> puedes apuntar los candidatos; ✔ <b>Comprobar</b> y 💡 <b>Pista</b> te ayudan si te atascas.</p>` },
  ],
};
