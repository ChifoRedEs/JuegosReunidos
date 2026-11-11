import { elige } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'El Rosco',
  pasos: [
    { t: 'La idea', h: `<p>Hay una definición por cada letra del abecedario. Fíjate si la palabra <b>empieza por</b> la letra o la <b>contiene</b>. Escribes con el teclado emergente y pulsas ✔. Las tildes no importan.</p><p>El reloj solo corre en tu turno.</p>` },
    { t: 'Ejercicio', h: `<p>Llegas a una letra y no sabes la respuesta. ¿Qué haces?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: '⏩ Paso la Cabra', ok: 1, por: '✅ Volverás a esa letra en la siguiente vuelta, sin perder nada.' }, { h: 'Escribo cualquier cosa', por: '❌ Si fallas cuenta como error. Mejor pasar.' }], ctx); } },
    { t: 'Duelo', h: `<p>En el <b>duelo contra la CPU</b>, cada uno tiene su rosco y su reloj: mientras aciertes sigues; si fallas o pasas, le toca al rival. Gana quien más acierte. Al final verás las soluciones de las que fallaste.</p>` },
  ],
};
