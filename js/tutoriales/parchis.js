import { elige } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'Partxis',
  pasos: [
    { t: 'Salir de casa', h: `<p>Sacas ficha de casa con un <b>5</b>. Si puedes sacar, es obligatorio. Con un <b>6</b> vuelves a tirar; tres 6 seguidos devuelven a casa tu última ficha. A meta se entra con el <b>número exacto</b>. Gana quien mete antes sus 4 fichas.</p>` },
    { t: 'Ejercicio', h: `<p>Quieres comer una ficha rival que está en una casilla con <b>estrella</b> (seguro). ¿Puedes?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: 'No: en los seguros no se come', ok: 1, por: '✅ Tampoco en las salidas.' }, { h: 'Sí, siempre', por: '❌ Los seguros protegen.' }], ctx); } },
    { t: 'Bonus y barreras', h: `<ul><li>Comer una ficha te da <b>20</b> casillas extra; meter una en meta, <b>10</b>.</li><li>Dos fichas del mismo color forman <b>barrera</b>: nadie pasa. Con un 6 debes abrirla.</li><li><b>Por parejas</b> (4 jugadores): al compañero no se le come.</li><li>Para mover, toca una ficha resaltada o la casilla de destino.</li></ul>` },
  ],
};
