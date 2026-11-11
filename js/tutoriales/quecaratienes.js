import { elige } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: '¿Qué Cara Tienes?',
  pasos: [
    { t: 'El objetivo', h: `<p>Cada jugador elige en secreto una cara. Gana quien adivina antes la del rival. En tu turno haces <b>una</b> de dos cosas: <b>❓ preguntar</b> por un rasgo (¿lleva gafas?, ¿tiene barba?…) o <b>🎯 arriesgar</b> diciendo quién crees que es.</p><p>La respuesta es sí o no y la da la propia app. Con ella, <b>tumbas</b> las caras que ya no pueden ser.</p>` },
    { t: 'Ejercicio: la mejor pregunta', h: `<p>Quedan 12 caras. La mitad lleva gafas. ¿Qué pregunta te sirve más?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: '¿Lleva gafas? (la mitad)', ok: 1, por: '✅ Una pregunta que parte las caras por la mitad elimina 6 de golpe sea cual sea la respuesta.' }, { h: '¿Es una persona? (todas)', por: '❌ La respuesta siempre es sí: no elimina a nadie.' }, { h: '¿Tiene perilla? (solo 1)', por: '❌ Casi seguro te dirán que no y solo tumbas una cara.' }], ctx); } },
    { t: 'Arriesgar', h: `<p>Si arriesgas y aciertas, <b>ganas</b>. Si fallas, según la regla elegida pierdes la partida o solo el turno. Mejor arriesgar cuando quedan pocas caras. Puedes usar «🪄 Tumbar por mí».</p>` },
  ],
};
