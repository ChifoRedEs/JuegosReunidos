import { ciclo } from '../core/tutorial.js';
// Tutorial de CruciSumas
const neg = (d = '', b = '') => `<div class="tt-k neg">${d !== '' ? `<i class="d">${d}</i>` : ''}${b !== '' ? `<i class="b">${b}</i>` : ''}</div>`;
export const TUTORIAL = {
  titulo: 'CruciSumas',
  pasos: [
    { t: '¿De qué va?', h: `<p>Es un <b>crucigrama de sumas</b>: en las casillas blancas se escriben <b>cifras del 1 al 9</b>.</p>
      <p>Las casillas oscuras traen números que son <b>sumas</b>:</p>
      <div class="tt-g" style="grid-template-columns:repeat(3,44px)">${neg()}${neg('', 4)}${neg()}${neg(3, '')}<div class="tt-k fijo">?</div><div class="tt-k fijo">?</div>${neg()}<div class="tt-k fijo">?</div>${neg()}</div>
      <ul><li>El número de <b>arriba a la derecha</b> es la suma de las casillas que tiene <b>a su derecha</b> (aquí 3 = ? + ?).</li><li>El de <b>abajo a la izquierda</b> es la suma de las que tiene <b>debajo</b> (aquí 4 = ? + ?).</li></ul>` },
    { t: 'Primer ejercicio: sin repetir', h: `<p>En una misma suma <b>no se repite ninguna cifra</b>. Completa las dos casillas para que sumen <b>4</b>. ¡Ojo: 2 + 2 no vale!</p>`, req: true,
      demo(z, ctx) {
        z.innerHTML = `<div class="tt-g" style="grid-template-columns:repeat(3,44px)">${neg(4, '')}<button class="tt-k" type="button"></button><button class="tt-k" type="button"></button></div>`;
        const b = [...z.querySelectorAll('button')], c = b.map(x => ciclo(x, 9, ver));
        function ver() { const [x, y] = c.map(k => k.get()); if (!x || !y) { ctx.info(''); return; } if (x === y) ctx.mal('❌ No se puede repetir cifra en la misma suma.'); else if (x + y === 4) ctx.ok('✅ 1 + 3 = 4. ¡Esa es la única forma con dos cifras distintas!'); else ctx.mal(`❌ ${x} + ${y} = ${x + y}. Tiene que dar 4.`); }
        return { ver: () => { c[0].set(1); c[1].set(3); } };
      } },
    { t: 'Combinaciones que conviene conocer', h: `<p>Algunas sumas solo se pueden hacer de <b>una manera</b>. Aprenderlas es el truco del juego:</p>
      <div class="tt-box"><b>Con 2 casillas:</b> 3 = 1+2 · 4 = 1+3 · 16 = 7+9 · 17 = 8+9<br><b>Con 3 casillas:</b> 6 = 1+2+3 · 7 = 1+2+4 · 23 = 6+8+9 · 24 = 7+8+9</div>
      <p>Y no hace falta que las memorices: la app te muestra debajo del tablero las <b>combinaciones posibles</b> 🧮 de la casilla que eliges.</p>` },
    { t: 'Segundo ejercicio: cruzar sumas', h: `<p>Ahora cada casilla pertenece a <b>dos</b> sumas (una en horizontal y otra en vertical). Rellena las cuatro casillas para que se cumplan <b>las cuatro sumas</b>:</p><p class="tt-nota">Filas: 3 y 7 · Columnas: 4 y 6. Sin repetir cifras dentro de una suma.</p>`, req: true,
      demo(z, ctx) {
        z.innerHTML = `<div class="tt-g" style="grid-template-columns:repeat(3,44px)">${neg()}${neg('', 4)}${neg('', 6)}${neg(3, '')}<button class="tt-k" type="button"></button><button class="tt-k" type="button"></button>${neg(7, '')}<button class="tt-k" type="button"></button><button class="tt-k" type="button"></button></div>`;
        const c = [...z.querySelectorAll('button')].map(x => ciclo(x, 9, ver));
        function ver() {
          const [a, b, cc, d] = c.map(k => k.get()); if (!a || !b || !cc || !d) { ctx.info(''); return; }
          if (a === b || cc === d || a === cc || b === d) { ctx.mal('❌ Hay una cifra repetida dentro de una suma.'); return; }
          const fallos = []; if (a + b !== 3) fallos.push('la fila de 3'); if (cc + d !== 7) fallos.push('la fila de 7'); if (a + cc !== 4) fallos.push('la columna de 4'); if (b + d !== 6) fallos.push('la columna de 6');
          if (!fallos.length) ctx.ok('✅ ¡Resuelto! En un panel de verdad solo hay una solución; aquí valen las que cumplen todo.'); else ctx.mal('❌ No cuadra ' + fallos.join(' ni ') + '.');
        }
        return { ver: () => { [1, 2, 3, 4].forEach((v, k) => c[k].set(v)); } };
      } },
    { t: 'Ayudas de la app', h: `<ul><li>🧮 <b>Combinaciones</b>: se tachan las que ya no encajan con lo que has puesto.</li><li>✏️ <b>Notas</b>: apunta candidatos a lápiz.</li><li>✔ <b>Comprobar</b> marca los errores y 💡 <b>Pista</b> rellena una casilla (con pistas no cuenta el récord).</li><li>↶ <b>Deshacer</b> no tiene límite.</li></ul><p>Empieza por las sumas de <b>2 casillas con valores extremos</b> (3, 4, 16, 17) y por las que se cruzan: ¡te dan las primeras cifras!</p>` },
  ],
};
