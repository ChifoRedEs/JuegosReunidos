import { elige, marcar } from '../core/tutorial.js';
const T = s => `<span class="tt-ficha">${s}</span>`;
export const TUTORIAL = {
  titulo: 'Números y Letras',
  pasos: [
    { t: 'Dos tipos de ronda', h: `<p>La partida alterna rondas de <b>Letras</b> y de <b>Cifras</b>.</p><ul><li>🔤 <b>Letras</b>: con 9 letras formas la palabra más larga posible, usando cada letra una vez. Cada letra es un punto.</li><li>🔢 <b>Cifras</b>: con seis números y + − × ÷ te acercas al objetivo. Cada número se usa una vez como mucho, las divisiones tienen que ser exactas y no valen negativos.</li></ul>` },
    { t: 'Ejercicio: Letras', h: `<p>Tus letras: ${T('C')}${T('A')}${T('S')}${T('A')}${T('R')}${T('T')}${T('O')}${T('L')}${T('E')}. Marca las palabras que <b>sí</b> puedes formar.</p>`, req: true,
      demo(z, ctx) { return marcar(z, [{ h: 'SOLAR', ok: 1 }, { h: 'CARTA', ok: 1 }, { h: 'CALLE', por: '❌ Solo tienes una L.' }, { h: 'PLATO', por: '❌ No tienes P.' }], ctx); } },
    { t: 'Ejercicio: Cifras', h: `<p>Con los números <b>3, 4 y 10</b>, ¿qué cuenta da <b>exactamente 22</b>?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: '3 × 4 + 10', ok: 1, por: '✅ 12 + 10 = 22: ¡exacto, 10 puntos!' }, { h: '3 + 4 + 10', por: '❌ Eso da 17.' }, { h: '10 × 4 − 3', por: '❌ Eso da 37.' }], ctx); } },
    { t: 'Puntos', h: `<p>Cifras: exacto 10 puntos, a 5 o menos 7, a 10 o menos 5. Una palabra de 9 letras vale 18. Hay también un 📅 <b>Reto del día</b> con las mismas letras y cifras para todos.</p>` },
  ],
};
