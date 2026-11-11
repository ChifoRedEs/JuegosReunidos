import { elige } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'Palabras Cruzadas',
  pasos: [
    { t: 'La idea', h: `<p>Suma más puntos que tus rivales formando <b>palabras que se cruzan</b> en el tablero. Arrastra tus fichas, o toca una ficha y después una casilla.</p><ul><li>Las fichas de un turno van en <b>una sola fila o columna</b>, seguidas y tocando alguna ficha del tablero.</li><li>La primera palabra pasa por la <b>★</b>.</li></ul>` },
    { t: 'Premios', h: `<p><b>2L</b>/<b>3L</b> doblan o triplican la letra; <b>2P</b>/<b>3P</b> la palabra entera, solo la primera vez que se cubren. Usar tus 7 fichas de golpe vale <b>+50</b>.</p>` },
    { t: 'Ejercicio: fichas especiales', h: `<p><b>CH</b>, <b>LL</b> y <b>RR</b> son <b>una sola ficha</b>. ¿Cuántas fichas gastas al poner CALLE?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: '5', por: '❌ La LL cuenta como una ficha.' }, { h: '4 (C, A, LL, E)', ok: 1, por: '✅ ¡Correcto!' }], ctx); } },
    { t: 'Turnos', h: `<p><b>Cambiar</b> fichas o <b>pasar</b> gasta el turno. 💡 La pista pone la jugada que más puntos da. Los 2 <b>comodines</b> valen 0 y hacen de cualquier letra. No hay K ni W.</p>` },
  ],
};
