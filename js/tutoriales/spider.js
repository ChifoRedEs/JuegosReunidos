import { marcar, elige, fila, cartaFr } from '../core/tutorial.js';
const par = (a, b) => fila(cartaFr(...a) + '<span>sobre</span>' + cartaFr(...b));
export const TUTORIAL = {
  titulo: 'Spider',
  pasos: [
    { t: 'El objetivo', h: `<p>Forma <b>8 series completas</b> de la K a la A <b>del mismo palo</b>. Cada serie completa sale sola de la mesa.</p><p>Puedes poner una carta sobre otra <b>de rango inmediatamente superior</b>, sea del palo que sea. Pero solo puedes <b>mover grupos del mismo palo y en orden</b>.</p>` },
    { t: 'Ejercicio: ¿se puede poner?', h: `<p>Marca las jugadas válidas.</p>`, req: true,
      demo(z, ctx) { return marcar(z, [
        { h: par([6, 'corazones'], [7, 'picas']), ok: 1 },
        { h: par([9, 'diamantes'], [10, 'diamantes']), ok: 1 },
        { h: par([6, 'picas'], [8, 'picas']), por: '❌ Falta el 7: tiene que ser el rango inmediatamente superior.' }], ctx); } },
    { t: 'Repartir', h: `<p>Toca el mazo para colocar <b>una carta nueva en cada columna</b>. Hay 5 repartos y <b>no se puede repartir con una columna vacía</b>: rellénala antes.</p><p>Dificultad: 1, 2 o 4 palos. Empiezas con 500 puntos, pierdes 1 por movimiento y ganas 100 por serie.</p>` },
  ],
};
