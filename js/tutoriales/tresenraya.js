import { pincha } from '../core/tutorial.js';
const X = { h: '❌' }, O = { h: '⭕' };
export const TUTORIAL = {
  titulo: '3 en raya',
  pasos: [
    { t: 'El objetivo', h: `<p>Se turnan para poner una ficha. Gana quien consigue <b>tres en línea</b> (fila, columna o diagonal). Empieza la ❌.</p>` },
    { t: 'Ejercicio: gana en una jugada', h: `<p>Juegas con ❌. Toca la casilla con la que ganas ya.</p>`, req: true,
      demo(z, ctx) { return pincha(z, [[X, X, ''], [O, O, ''], ['', '', '']], [[0, 2]], ctx, { tam: 52, okMsg: '✅ ¡Tres en raya! (Y de paso evitas que ⭕ complete la suya.)', malMsg: '❌ Mira la fila de arriba: te falta una casilla.' }); } },
    { t: 'Variantes', h: `<ul><li><b>Infinito</b>: solo puedes tener 3 fichas a la vez; al poner la cuarta desaparece la más antigua. No hay empates.</li><li><b>4×4 y 5×5</b>: hace falta alinear cuatro.</li></ul><p>En el 3×3 la CPU difícil juega perfecto: lo máximo es empatar. 💡 La pista te dice la mejor jugada.</p>` },
  ],
};
