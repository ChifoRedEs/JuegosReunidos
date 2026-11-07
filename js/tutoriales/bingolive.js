import { elige } from '../core/tutorial.js';
// Tutorial de Bingo Live
export const TUTORIAL = {
  titulo: 'Bingo en directo',
  pasos: [
    { t: 'Para qué sirve', h: `<p>Este modo es el <b>bombo</b> para jugar con cartones de papel en una sala, con amigos o en familia. Tú cantas las bolas (90) y los demás las marcan en sus cartones.</p>` },
    { t: 'Sacar bolas', h: `<p>Pulsa 🎱 <b>Sacar bola</b>. La bola sale, se anuncia (si la voz está activa) y se anota en el panel.</p><p>En ⚙️ <b>Configurar partida</b> pones apodos, voz, modo automático y premios.</p>` },
    { t: 'Prueba', h: `<p>Alguien grita ¡línea! ¿Qué haces?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: 'Compruebo su cartón con 🔍 Comprobar cartón', ok: 1, por: '✅ Marcas los números del cartón y la app dice si es línea (5 números) o bingo (15).' }, { h: 'Sigo sacando bolas', por: '❌ Primero hay que comprobarlo.' }], ctx); } },
    { t: 'Apariencia', h: `<p>🎨 <b>Apariencia</b> cambia colores y estilo de las bolas. Todo se guarda para la próxima partida.</p>` },
  ],
};
