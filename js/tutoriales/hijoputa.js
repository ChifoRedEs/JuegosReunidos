import { cartaEs, fila, marcar, elige } from '../core/tutorial.js';
// Tutorial de Hijoputa
export const TUTORIAL = {
  titulo: 'Hijoputa',
  pasos: [
    { t: 'El objetivo', h: `<p>Baraja española de 40 cartas, <b>7 cartas</b> para cada jugador. Gana el primero que <b>se quede sin cartas</b>.</p><p>En tu turno juegas una carta del <b>mismo palo</b> o del <b>mismo número</b> que la última del montón. Si no puedes, <b>robas una</b>.</p>` },
    { t: '¿Cuáles puedo jugar?', h: `<p>En la mesa hay un <b>4 de copas</b>. Marca las cartas de tu mano que puedes tirar.</p>${fila(cartaEs(4, 'copas'))}`, req: true,
      demo(z, ctx) { return marcar(z, [{ h: cartaEs(7, 'copas'), ok: 1 }, { h: cartaEs(4, 'bastos'), ok: 1 }, { h: cartaEs(6, 'oros'), por: '❌ El 6 de oros no coincide ni en palo ni en número.' }, { h: cartaEs(1, 'espadas'), por: '❌ El As de espadas no coincide.' }], ctx); } },
    { t: 'Cartas especiales', h: `<ul><li><b>Sota</b> 🃏: comodín. La puedes tirar siempre y eliges el palo que sigue.</li><li><b>2</b>: el siguiente <b>roba 2 y pierde el turno</b>. Si tiene otro 2, se lo pasa y se suma: +2, +4, +6…</li><li><b>As</b>: el siguiente roba 1 y pierde el turno.</li><li><b>Rey</b>: juegas otra vez.</li></ul>` },
    { t: 'Prueba', h: `<p>Te acaban de tirar un <b>2 de oros</b> y tú tienes estas cartas. ¿Qué haces?</p>${fila(cartaEs(2, 'oros'))}${fila([cartaEs(2, 'bastos'), cartaEs(5, 'oros'), cartaEs(10, 'copas')].join(''))}`, req: true,
      demo(z, ctx) { return elige(z, [{ h: 'Tiro el 2 de bastos: pasa +4 al siguiente', ok: 1, por: '✅ Correcto: encadenas el castigo y el siguiente roba 4.' }, { h: 'Tiro el 5 de oros', por: '❌ Con un 2 en juego solo puedes responder con otro 2 (o robar).' }, { h: 'Tiro la sota para cambiar de palo', por: '❌ Contra un 2 no sirve la sota: solo otro 2.' }], ctx); } },
    { t: '¡Hijoputa!', h: `<p>Cuando te quede <b>una sola carta</b>, tienes que pulsar el botón <b>¡Hijoputa!</b>. Si se te olvida y otro jugador te pilla, <b>robas 5 cartas</b>.</p><p>Tú también puedes acusar a los rivales si se les olvida decirlo. ¡Atento!</p>` },
  ],
};
