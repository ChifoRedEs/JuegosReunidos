import { marcar } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'Rompe-Ladrillos',
  pasos: [
    { t: 'La idea', h: `<p>Mueve la pala para devolver la bola y <b>rompe todos los ladrillos</b>. Si la bola cae por abajo, pierdes una vida. Según dónde golpee en la pala, sale más o menos inclinada: usa los extremos para apuntar.</p><p><b>Controles</b>: arrastra el dedo por el campo y toca para lanzar.</p>` },
    { t: 'Ejercicio: ladrillos', h: `<p>Marca los que <b>se rompen</b> con golpes.</p>`, req: true,
      demo(z, ctx) { return marcar(z, [{ h: '🟥 de color (1 golpe)', ok: 1 }, { h: '🟦 azul (2 golpes)', ok: 1 }, { h: '🟨 dorado (3 golpes)', ok: 1 }, { h: '⬜ de metal', por: '❌ Los de metal no se rompen.' }], ctx); } },
    { t: 'Cápsulas', h: `<p><b>A</b> pala ancha · <b>M</b> multibola · <b>L</b> bola lenta · <b>Z</b> láser · <b>F</b> bola de fuego · <b>+</b> vida extra. Los efectos duran 12 segundos. También puedes diseñar tus propios niveles con el ✏️ editor.</p>` },
  ],
};
