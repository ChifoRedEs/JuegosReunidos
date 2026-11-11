import { pincha } from '../core/tutorial.js';
const R = { h: '🔴' }, Y = { h: '🟡' };
export const TUTORIAL = {
  titulo: 'Cuatro en Línea',
  pasos: [
    { t: 'Soltar fichas', h: `<p>Por turnos dejas caer una ficha por una columna: cae hasta la casilla libre más baja. Gana quien alinea <b>cuatro</b> (horizontal, vertical o diagonal).</p>` },
    { t: 'Ejercicio', h: `<p>Eres 🔴. Toca la columna donde dejas caer tu ficha para ganar. (Toca cualquier casilla de esa columna.)</p>`, req: true,
      demo(z, ctx) { const e = ''; const f = [[e, e, e, e, e], [e, e, e, e, e], [e, e, e, e, e], [Y, R, R, R, e]]; return pincha(z, f, [[0, 4], [1, 4], [2, 4], [3, 4]], ctx, { tam: 46, okMsg: '✅ ¡Cuatro en línea! La ficha cae al fondo de la columna y completa la fila.', malMsg: '❌ Esa columna no completa los cuatro. Mira dónde falta una ficha roja.' }); } },
    { t: 'Consejos', h: `<ul><li>Defiende: si el rival tiene tres seguidos con hueco, bloquéalo.</li><li>Mira también las <b>diagonales</b>, que son fáciles de olvidar.</li><li>Hay tableros mini, clásico, grande y <b>Cinco en Línea</b>. 💡 La pista marca la columna recomendada.</li></ul>` },
  ],
};
