import { elige } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'Juego de la Oca',
  pasos: [
    { t: 'El camino', h: `<p>Tira el dado y avanza. Gana quien llegue <b>exactamente</b> a la casilla <b>63</b>; si te pasas, rebotas hacia atrás lo que sobre.</p>` },
    { t: 'Casillas especiales', h: `<ul><li>🦢 <b>Oca</b>: saltas a la siguiente oca y vuelves a tirar.</li><li>🌉 <b>Puente</b> (6 y 12) y 🎲 <b>Dados</b> (26 y 53): saltas y tiras de nuevo.</li><li>🏨 <b>Posada</b> (19): 1 turno sin jugar. ⛓️ <b>Cárcel</b> (56): 2 turnos.</li><li>🕳️ <b>Pozo</b> (31): hasta que te rescaten.</li><li>🌀 <b>Laberinto</b> (42): vuelves a la 30. 💀 <b>Muerte</b> (58): vuelves a la 1.</li></ul>` },
    { t: 'Ejercicio', h: `<p>Caes en la <b>oca de la casilla 5</b>. ¿Qué pasa?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: 'Salto a la siguiente oca (la 9) y vuelvo a tirar', ok: 1, por: '✅ «De oca a oca y tiro porque me toca».' }, { h: 'Pierdo el turno', por: '❌ Ese es el castigo de la posada.' }, { h: 'Vuelvo a la casilla 1', por: '❌ Eso es la muerte (casilla 58).' }], ctx); } },
  ],
};
