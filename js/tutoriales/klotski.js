import { ciclo } from '../core/tutorial.js';
// Tutorial de Deslizadas (klotski)
export const TUTORIAL = {
  titulo: 'Deslizadas',
  pasos: [
    { t: 'Dos modos de juego', h: `<p><b>🎨 Colores</b>: piezas de distintos tamaños en un tablero con poco hueco. Hay que llevar la pieza grande ★ hasta la salida de abajo. Cada pieza que deslizas, aunque sean varias casillas seguidas, cuenta como <b>un movimiento</b>.</p><p><b>🔢 Números</b>: un tablero con un hueco abajo a la derecha. Hay que ordenar los números de 1 en adelante.</p>` },
    { t: 'Modo números: pruébalo', h: `<p>Ordena del 1 al 8 tocando una ficha: <b>se desliza hacia el hueco</b> y arrastra a las demás de su fila o columna. Hazlo en pocos toques.</p>`, req: true,
      demo(z, ctx) {
        const N = 3; let t = [1, 2, 3, 4, 5, 6, 0, 7, 8], mov = 0;
        const dib = () => {
          z.innerHTML = `<div class="tt-g" style="grid-template-columns:repeat(3,48px)">${t.map((v, i) => `<button class="tt-k ${v ? '' : 'hueco'}" data-i="${i}" type="button">${v || ''}</button>`).join('')}</div><p class="tt-nota">Movimientos: ${mov}</p>`;
          z.querySelectorAll('button').forEach(b => b.onclick = () => toca(+b.dataset.i));
          if (t.join() === '1,2,3,4,5,6,7,8,0') ctx.ok(`✅ ¡Ordenado en ${mov} toque${mov === 1 ? '' : 's'}!`);
        };
        function toca(i) {
          const h = t.indexOf(0), fx = i % N, fy = (i / N) | 0, hx = h % N, hy = (h / N) | 0;
          if (fx !== hx && fy !== hy) { ctx.mal('Solo se mueven las fichas que están en la misma fila o columna que el hueco.'); return; }
          if (i === h) return;
          const dx = Math.sign(hx - fx), dy = Math.sign(hy - fy); let c = h;
          while (c !== i) { const p = c - dx - dy * N; t[c] = t[p]; c = p; } t[i] = 0; mov++; ctx.info(''); dib();
        }
        dib(); return { ver: () => { t = [1, 2, 3, 4, 5, 6, 7, 0, 8]; mov = 1; dib(); setTimeout(() => { toca(8); }, 400); } };
      } },
    { t: 'Modo colores', h: `<p>Imagina el tablero: la pieza ★ (2×2) tiene que llegar abajo, al centro. Las demás piezas se apartan para hacerle sitio.</p>
      <div class="tt-g" style="grid-template-columns:repeat(4,38px);grid-template-rows:repeat(5,38px)">
      <div class="tt-k" style="grid-area:1/1/2/2;background:#8B5CF6"></div><div class="tt-k" style="grid-area:1/2/3/4;background:#E5383B;color:#fff;font-size:22px">★</div><div class="tt-k" style="grid-area:1/4/2/5;background:#8B5CF6"></div>
      <div class="tt-k" style="grid-area:2/1/4/2;background:#2F6BFF"></div><div class="tt-k" style="grid-area:2/4/4/5;background:#2F6BFF"></div>
      <div class="tt-k" style="grid-area:3/2/4/4;background:#25B35A"></div>
      <div class="tt-k" style="grid-area:4/1/5/2;background:#F2C94C"></div><div class="tt-k" style="grid-area:4/4/5/5;background:#F2C94C"></div>
      <div class="tt-k" style="grid-area:5/2/6/4;background:none;border:2px dashed var(--ok)">🚪</div></div>
      <p>Arrastra o toca una pieza y luego la dirección. Piensa en <b>abrir hueco</b> antes de mover la grande. Cuantos menos movimientos, más ★.</p>` },
    { t: '¿Y si me atasco?', h: `<ul><li>↶ <b>Deshacer</b> y ⟲ <b>Reiniciar</b> no cuestan nada.</li><li>💡 <b>Pista</b> te dice el siguiente movimiento de la mejor solución.</li><li>Los niveles van de fáciles a difíciles: ¡el clásico "Asno" es de los duros!</li></ul>` },
  ],
};
