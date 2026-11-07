import { elige } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'Ruleta Millonaria',
  pasos: [
    { t: 'La idea', h: `<p>Hay que descubrir la <b>frase oculta</b> del panel; la pista dice de qué trata. En tu turno <b>giras la ruleta</b>: si cae en un premio, dices una <b>consonante</b> y ganas ese premio por cada vez que aparece. Si aciertas, sigues.</p>` },
    { t: 'Ejercicio', h: `<p>La ruleta cae en <b>300</b> y dices la <b>T</b>, que aparece <b>2 veces</b>. ¿Cuánto ganas en esta ronda?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: '300', por: '❌ El premio se multiplica por las veces que aparece.' }, { h: '600', ok: 1, por: '✅ 300 × 2 apariciones = 600.' }, { h: '900', por: '❌ Solo hay dos T.' }], ctx); } },
    { t: 'Trampas del juego', h: `<ul><li><b>Quiebra</b>: pierdes el dinero de la ronda. <b>Pierde turno</b>: pasa al siguiente.</li><li>Si dices una letra que no está, también pasa el turno.</li><li>Las <b>vocales</b> se compran con el dinero de la ronda.</li><li>🧩 <b>Resolver</b>: escribe la frase; si aciertas te llevas el dinero de la ronda.</li></ul>` },
  ],
};
