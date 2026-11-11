import { elige } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'Air Hockey',
  pasos: [
    { t: 'La idea', h: `<p>Arrastra tu mazo (el rojo, abajo) para golpear el disco y meterlo en la portería de arriba. Solo puedes moverte por <b>tu mitad</b>. Gana quien llegue antes a los goles elegidos (5, 7 o 10).</p>` },
    { t: 'Ejercicio', h: `<p>Quieres un golpe fuerte. ¿Qué haces?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: 'Muevo el mazo más rápido al golpear', ok: 1, por: '✅ Cuanto más rápido, más fuerte sale el disco.' }, { h: 'Dejo el mazo quieto sobre el disco', por: '❌ Sin movimiento no hay golpe.' }], ctx); } },
    { t: 'Dos jugadores', h: `<p>Pon el móvil plano sobre la mesa; cada uno juega con un dedo en su mitad, a la vez. Tras cada gol saca quien lo ha recibido. También vale ratón o flechas; Espacio o P para pausar.</p>` },
  ],
};
