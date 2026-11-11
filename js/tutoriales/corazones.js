import { marcar, fila, cartaFr } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'Corazones',
  pasos: [
    { t: 'La idea', h: `<p>Es un juego de <b>bazas</b> entre 4: gana quien acaba con <b>menos puntos</b>. Cada uno recibe 13 cartas. Hay que <b>servir del palo</b> que se sale; si no tienes, tiras cualquier carta. Se lleva la baza la carta más alta del palo de salida.</p>` },
    { t: 'Ejercicio: ¿qué cartas puntúan?', h: `<p>Marca las que te dan puntos al llevártelas.</p>`, req: true,
      demo(z, ctx) { return marcar(z, [{ h: fila(cartaFr(5, 'corazones')), ok: 1 }, { h: fila(cartaFr(12, 'picas')), ok: 1, por: '' }, { h: fila(cartaFr(13, 'picas')), por: '❌ El rey de picas no cuenta.' }, { h: fila(cartaFr(2, 'treboles')), por: '❌ Los tréboles no puntúan.' }], ctx); } },
    { t: 'Los puntos', h: `<p>Cada <b>corazón</b> vale 1 y la <b>dama de picas</b>, 13. Antes de cada mano <b>pasas 3 cartas</b> a otro jugador. Sale quien tiene el 2 de tréboles.</p><p>🌙 <b>Tirar a la luna</b>: si te llevas los 13 corazones y la dama de picas, en vez de sumarte 26 se los sumas a los demás.</p>` },
  ],
};
