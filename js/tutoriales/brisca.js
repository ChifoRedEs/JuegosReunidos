import { elige, fila, cartaEs } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'Brisca',
  pasos: [
    { t: 'Triunfo y bazas', h: `<p>Baraja española de 40 cartas, <b>3 cartas</b> cada jugador. La carta que se ve bajo el mazo marca el <b>triunfo</b>. En cada baza todos juegan una carta: <b>no hay obligación de servir ni de matar</b>. Gana el triunfo más alto; si no hay triunfos, la carta más alta del palo con el que se salió.</p>` },
    { t: 'Orden y valores', h: `<p>Orden: <b>As, 3, Rey, Caballo, Sota, 7, 6, 5, 4, 2</b>.</p><p>Valen: <b>As 11, 3 → 10, Rey 4, Caballo 3, Sota 2</b>; el resto, 0. Hay 120 puntos en total; con 2 jugadores gana quien pase de 60.</p>` },
    { t: 'Ejercicio: ¿quién gana?', h: `<p>El triunfo es <b>copas</b>. Sale el As de bastos; después juegan el Rey de bastos y el 2 de copas.</p>${fila([cartaEs(1, 'bastos'), cartaEs(12, 'bastos'), cartaEs(2, 'copas')].join(''))}`, req: true,
      demo(z, ctx) { return elige(z, [{ h: 'El As de bastos (la más alta)', por: '❌ Hay un triunfo: gana aunque sea el 2.' }, { h: 'El 2 de copas (triunfo)', ok: 1, por: '✅ Cualquier triunfo gana a las cartas de otro palo. Se lleva 11 + 4 + 0 = 15 puntos.' }, { h: 'El Rey de bastos', por: '❌ No es el más fuerte aquí.' }], ctx); } },
    { t: 'Detalles', h: `<p>El ganador se lleva las cartas, roba primero y sale. Con 3 jugadores se retira el 2 de oros; con 4, juegas en pareja. Opcional: <b>cambiar el 7</b> del triunfo por la carta visible.</p>` },
  ],
};
