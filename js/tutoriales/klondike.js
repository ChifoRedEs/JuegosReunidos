import { marcar, fila, cartaFr } from '../core/tutorial.js';
const par = (a, b) => fila(cartaFr(...a) + '<span>sobre</span>' + cartaFr(...b));
export const TUTORIAL = {
  titulo: 'Klondike',
  pasos: [
    { t: 'El objetivo', h: `<p>Lleva todas las cartas a las <b>4 bases</b> de arriba, de la A a la K y por palos.</p><p>En las columnas se apila en <b>orden descendente alternando colores</b>: un 6 negro sobre un 7 rojo. Solo un <b>rey</b> puede ocupar una columna vacía.</p>` },
    { t: 'Ejercicio: ¿cuáles se pueden apilar?', h: `<p>Marca las jugadas válidas (carta que se mueve <b>sobre</b> otra).</p>`, req: true,
      demo(z, ctx) { return marcar(z, [
        { h: par([6, 'picas'], [7, 'corazones']), ok: 1 },
        { h: par([5, 'diamantes'], [6, 'treboles']), ok: 1 },
        { h: par([6, 'picas'], [7, 'treboles']), por: '❌ Los dos son negros: hay que alternar colores.' },
        { h: par([6, 'corazones'], [8, 'picas']), por: '❌ Tiene que ser el número inmediatamente superior.' }], ctx); } },
    { t: 'Mover y robar', h: `<ul><li><b>Arrastra</b> una carta o un grupo; <b>tócala</b> y se envía sola a donde mejor encaje.</li><li>Toca el mazo para robar (de 1 en 1 o de 3 en 3).</li><li>La casilla extra <b>Libre</b> admite cualquier carta para desatascar columnas.</li><li>El <b>analizador</b> te dice si la partida sigue teniendo solución. 💡 Pista y ↶ Deshacer.</li></ul>` },
  ],
};
