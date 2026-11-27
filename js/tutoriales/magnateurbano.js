import { elige } from '../core/tutorial.js';
// Tutorial de Aeropuerto
export const TUTORIAL = {
  titulo: 'Aeropuerto',
  pasos: [
    { t: 'El objetivo', h: `<p>Compra billetes de <b>destinos de todo el mundo</b>, mejora tus vuelos y cobra alquileres hasta que <b>todos los demás quiebren</b>.</p><p>En tu turno: tiras los dados 🎲, avanzas y actúas según la casilla. Al caer aparece su <b>ficha</b> en una ventana.</p>` },
    { t: 'Comprar o subastar', h: `<p>Si caes en un <b>destino</b>, una <b>terminal</b> o un <b>servicio</b> libre, puedes <b>comprarlo</b>. Si no lo compras, sale a <b>subasta</b> y lo puede comprar cualquiera. Si ya es de otro, le pagas el <b>alquiler</b>.</p>` },
    { t: 'Prueba: ¿qué hago?', h: `<p>Caes en un destino libre que cuesta 160 M y tienes 500 M. ¿Qué es lo más razonable?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: 'Comprarlo: así cobraré alquiler a los demás', ok: 1, por: '✅ Tienes dinero de sobra: comprar te da alquileres futuros.' }, { h: 'Dejar que se subaste siempre', por: '❌ Es una opción, pero pierdes la ventaja de elegir.' }], ctx); } },
    { t: 'Zonas y vuelos', h: `<p>Si juntas <b>todos los destinos de una zona</b> (mismo color), el billete cobra el doble y puedes <b>mejorar los vuelos</b>: Clase Turista, Premium, Ejecutiva, Primera Clase y, por último, el ✈️ <b>Jet Privado</b>. Cada mejora sube mucho el alquiler.</p>` },
    { t: 'Prisión y tarjetas', h: `<ul><li>Solo el <b>Control de Seguridad</b> te manda a la <b>Prisión Aduanera</b>; si caes en la Prisión de paso, es una visita y no pasa nada.</li><li>Sales pagando <b>50 M</b>, con una <b>tarjeta «sal de la Prisión»</b> o sacando dobles.</li><li>Esas tarjetas (hay dos en juego) se pueden <b>vender o cambiar</b> en 🤝 Negociar.</li></ul>` },
    { t: 'Dinero y trucos', h: `<ul><li>Cada vez que pasas por <b>Embarque</b> cobras <b>200 M</b>.</li><li>Las cartas <b>Souvenir</b> son casi siempre buenas; las de <b>Retrasos</b> traen imprevistos.</li><li>Los impuestos y multas van al bote del <b>Paraíso Fiscal</b>.</li><li>Los <b>dobles</b> repiten turno.</li><li>Puedes <b>hipotecar</b> destinos para conseguir efectivo o negociar 🤝 con otros jugadores.</li></ul>` },
  ],
};
