import { marcar } from '../core/tutorial.js';
const T = (a, b) => `<span class="tt-ficha">${a} │ ${b}</span>`;
export const TUTORIAL = {
  titulo: 'Dominó',
  pasos: [
    { t: 'Lo básico', h: `<p>Cada jugador tiene sus fichas. Sale quien tiene el <b>doble más alto</b>. Después, por turnos, pones una ficha cuyo número <b>coincida con uno de los dos extremos</b> de la cadena.</p><p>Si no tienes ficha, en el modo clásico <b>robas del pozo</b> hasta poder jugar; si no queda pozo, pasas.</p>` },
    { t: 'Ejercicio: ¿cuáles encajan?', h: `<p>Los extremos de la cadena son un <b>3</b> y un <b>5</b>. Marca las fichas que puedes poner.</p>`, req: true,
      demo(z, ctx) { return marcar(z, [{ h: T(3, 6), ok: 1 }, { h: T(5, 5), ok: 1 }, { h: T(0, 3), ok: 1 }, { h: T(2, 4), por: '❌ La 2│4 no tiene ni un 3 ni un 5.' }, { h: T(6, 1), por: '❌ La 6│1 no encaja en ningún extremo.' }], ctx); } },
    { t: 'Ganar la mano', h: `<p>Gana quien se queda sin fichas y suma los puntos de las de sus rivales. Si nadie puede mover, el juego se <b>cierra</b> y gana quien menos puntos tenga.</p><ul><li><b>De a cinco</b>: puntúas cuando los extremos suman un múltiplo de 5.</li><li><b>Por parejas</b>: juegas con el de enfrente.</li></ul><p>💡 La pista te señala una buena jugada.</p>` },
  ],
};
