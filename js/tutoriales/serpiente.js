import { elige } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'Serpiente',
  pasos: [
    { t: 'Controles', h: `<p>Mueve la serpiente para comer manzanas 🍎: cada una la hace <b>crecer</b> y suma puntos.</p><ul><li><b>Desliza el dedo</b> sobre el tablero en la dirección que quieras (puedes encadenar giros sin levantarlo).</li><li>O usa la cruceta, las flechas o WASD. Espacio o ⏸️ pausa.</li></ul>` },
    { t: 'Ejercicio', h: `<p>Cada 7 manzanas aparece una estrella ⭐. ¿Qué tiene de especial?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: 'Vale 5 veces más pero desaparece pronto', ok: 1, por: '✅ Parpadea cuando está a punto de irse.' }, { h: 'Te hace invencible', por: '❌ No: solo da más puntos.' }], ctx); } },
    { t: 'Cuándo pierdes', h: `<p>Pierdes si chocas contra <b>tu propio cuerpo</b>, un <b>muro</b> o, en el modo Clásico, el <b>borde</b>. En «Sin paredes» atraviesas los bordes. La serpiente acelera a medida que come. Si sales de la app, la partida se pausa.</p>` },
  ],
};
