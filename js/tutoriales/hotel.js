import { elige } from '../core/tutorial.js';
// Tutorial de Hotel
export const TUTORIAL = {
  titulo: 'Hotel',
  pasos: [
    { t: 'El objetivo', h: `<p>Eres un promotor hotelero. Empiezas con <b>18.000</b> de dinero, compras solares, construyes hoteles y cobras estancias a quien se aloje en ellos. Gana el último jugador con dinero.</p>` },
    { t: 'Tu turno', h: `<ul><li>🎲 Tira y avanza.</li><li>🏷️ En un <b>solar en venta</b> puedes comprarlo; si no, se subasta.</li><li>📋 Para construir hace falta una <b>licencia de obras</b> (se tira el dado de permiso).</li><li>🏊 Las <b>instalaciones</b> (piscina, etc.) suben lo que cobras.</li><li>🏛️ El <b>Ayuntamiento</b> cobra entradas.</li></ul><p>Al pasar por Caja cobras <b>3.000</b>.</p>` },
    { t: 'Prueba', h: `<p>Caes en el hotel de un rival. ¿Qué pasa?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: 'Pago la estancia al dueño', ok: 1, por: '✅ Las estancias se pagan según el edificio y las instalaciones.' }, { h: 'No pasa nada', por: '❌ Pagas estancia al propietario.' }], ctx); } },
    { t: 'Deudas', h: `<p>Si no puedes pagar, vende o hipoteca lo que tengas. Si aun así no llegas, tus propiedades se <b>subastan</b> y quedas fuera.</p>` },
  ],
};
