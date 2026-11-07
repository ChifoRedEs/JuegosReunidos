import { elige, fila, cartaFr } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: "Texas Hold'em",
  pasos: [
    { t: 'Cómo se juega', h: `<p>Cada jugador recibe <b>2 cartas</b> propias y hay <b>5 comunes</b> en la mesa (flop de 3, turn y river). Tu mano es la <b>mejor combinación de 5</b> con tus cartas y las comunes.</p><p>Hay rondas de apuestas: <b>pasar</b>, <b>igualar</b>, <b>subir</b>, <b>retirarte</b> o ir <b>all-in</b>.</p>` },
    { t: 'Ranking de manos', h: `<p>De menor a mayor: carta alta · pareja · doble pareja · trío · escalera · color · <b>full</b> (trío + pareja) · póker · escalera de color.</p>` },
    { t: 'Ejercicio: ¿qué mano tienes?', h: `<p>Tus cartas: ${fila(cartaFr(1, 'corazones') + cartaFr(1, 'diamantes'))}Mesa: ${fila([cartaFr(1, 'picas'), cartaFr(7, 'treboles'), cartaFr(7, 'diamantes'), cartaFr(2, 'corazones'), cartaFr(9, 'picas')].join(''))}`, req: true,
      demo(z, ctx) { return elige(z, [{ h: 'Doble pareja', por: '❌ Tienes algo mejor.' }, { h: 'Trío', por: '❌ Es más que un trío: hay también pareja.' }, { h: 'Full (tres ases y dos sietes)', ok: 1, por: '✅ ¡Full de ases y sietes!' }], ctx); } },
    { t: 'Ciegas y torneo', h: `<p>El botón <b>D</b> marca al repartidor; los dos siguientes ponen las <b>ciegas</b>, que suben cada pocas manos. En torneo ganas eliminando a todos; en <b>partida libre</b> nadie queda eliminado. En ⋯ puedes ver tus probabilidades.</p>` },
  ],
};
