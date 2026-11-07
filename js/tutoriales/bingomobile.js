import { elige } from '../core/tutorial.js';
// Tutorial de Bingo móvil
export const TUTORIAL = {
  titulo: 'Bingo móvil',
  pasos: [
    { t: 'Tu cartón', h: `<p>Cada cartón tiene <b>3 filas × 9 columnas</b> y 15 números. Se van cantando bolas y tú marcas las que tengas (o lo hace la app si activas el modo automático).</p>` },
    { t: 'Línea y bingo', h: `<ul><li><b>Línea</b>: completar las 5 casillas de una fila. Pulsa 🙋 <b>¡Línea!</b>.</li><li><b>Bingo</b>: completar los 15 números. Pulsa 🏆 <b>¡Bingo!</b>.</li></ul><p>Los rivales de la mesa también cantan, a veces segundos después. Si cantas tarde, te lo pueden quitar.</p>` },
    { t: 'Prueba', h: `<p>Tienes las 5 casillas de la fila superior marcadas. ¿Qué pulsas?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: '🙋 ¡Línea!', ok: 1, por: '✅ ¡Ya puedes cantar línea!' }, { h: '🏆 ¡Bingo!', por: '❌ Para bingo hacen falta los 15 números.' }], ctx); } },
    { t: 'Premios', h: `<p>El <b>bote</b> sale de las apuestas de todos. Si solo hay premio de bingo, se lo lleva entero. Con línea: 20% la línea y 80% el bingo. Si te quedas sin fichas, el banco te presta <b>500</b>.</p>` },
  ],
};
