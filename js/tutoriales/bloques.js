import { elige } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'Bloques',
  pasos: [
    { t: 'La idea', h: `<p>Caen piezas de 4 cuadrados. Muévelas y gíralas para formar <b>líneas horizontales completas</b>: desaparecen y suman puntos.</p><p>La <b>pieza fantasma</b> muestra dónde caerá, y la <b>reserva</b> (izquierda) guarda la pieza actual una vez por pieza.</p>` },
    { t: 'Controles', h: `<ul><li><b>Táctil</b>: toca para girar, arrastra para mover, desliza hacia abajo para bajar, golpe rápido abajo = caída, golpe hacia arriba = reserva.</li><li><b>Teclado</b>: ← → mover · ↓ bajar · ↑ girar · espacio caída · C reservar · P pausa.</li></ul>` },
    { t: 'Ejercicio: puntos', h: `<p>¿Qué da más puntos?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: 'Una línea (100)', por: '❌ Vale menos.' }, { h: 'Cuatro líneas a la vez (800)', ok: 1, por: '✅ ¡El cuádruple! 1 línea 100, 2 líneas 300, 3 líneas 500, 4 líneas 800 (× nivel).' }, { h: 'Dos líneas (300)', por: '❌ Vale menos que 4 a la vez.' }], ctx); } },
    { t: 'Modos', h: `<p><b>Maratón</b> (sin fin), <b>Sprint</b> (40 líneas lo más rápido posible), <b>Ultra</b> (máxima puntuación en 2 minutos) y <b>Excavar</b> (limpia 10 filas de basura).</p>` },
  ],
};
