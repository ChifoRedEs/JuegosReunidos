import { pincha } from '../core/tutorial.js';
// Tutorial de Damas
const B = (r, c, h = '') => ({ h, bg: (r + c) % 2 ? '#f0d9b5' : '#8a5a2b' });
export const TUTORIAL = {
  titulo: 'Damas',
  pasos: [
    { t: 'Cómo se mueven', h: `<p>Las fichas se mueven <b>en diagonal</b>, solo por las casillas oscuras. Los peones avanzan <b>hacia delante</b>, de una en una.</p><p>Si llegas a la <b>última fila</b> tu peón se corona y se convierte en <b>dama</b>, mucho más poderosa.</p>` },
    { t: 'Capturar', h: `<p>Si una ficha rival está en diagonal y <b>detrás hay una casilla libre</b>, la puedes saltar y se la comes. <b>Capturar es obligatorio.</b></p><p>Tu ficha blanca ⚪ avanza hacia arriba. Toca la casilla donde caería al comerse la ficha negra ⚫.</p>`, req: true,
      demo(z, ctx) { const f = []; for (let r = 0; r < 5; r++) { const fila = []; for (let c = 0; c < 5; c++) fila.push(B(r, c, r === 3 && c === 1 ? '⚪' : r === 2 && c === 2 ? '⚫' : '')); f.push(fila); } return pincha(z, f, [[1, 3]], ctx, { okMsg: '✅ ¡Eso es! Saltas por encima y te comes la ficha negra.', malMsg: '❌ Hay que saltar la ficha negra y caer justo detrás, en la misma diagonal.' }); } },
    { t: 'La dama y las variantes', h: `<ul><li>En <b>Españolas</b> la dama es <b>voladora</b>: recorre cualquier distancia en diagonal, y rige la ley de la mayoría (si hay varias capturas, elige la que más piezas se lleve).</li><li>En <b>Inglesas</b> la dama va casilla a casilla.</li><li>Brasileñas e Internacionales (10×10) permiten a los peones capturar también hacia atrás.</li></ul><p>Gana quien deja al rival <b>sin fichas o sin movimientos</b>. 💡 La pista te sugiere una jugada.</p>` },
  ],
};
