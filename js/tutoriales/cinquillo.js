import { cartaEs, fila, marcar, elige } from '../core/tutorial.js';
// Tutorial de Cinquillo
export const TUTORIAL = {
  titulo: 'Cinquillo',
  pasos: [
    { t: 'La idea', h: `<p>Se reparten las 40 cartas entre 3-4 jugadores. Se trata de ir <b>colocando todas tus cartas</b> en la mesa, formando 4 filas (una por palo) que empiezan siempre por el <b>5</b>.</p><p>Empieza quien tiene el <b>5 de oros</b>.</p>${fila([cartaEs(4, 'oros'), cartaEs(5, 'oros'), cartaEs(6, 'oros')].join(''))}` },
    { t: 'Cómo crecen las filas', h: `<p>Una fila crece por los dos lados: hacia abajo (<b>4, 3, 2, 1</b>) y hacia arriba (<b>6, 7, sota, caballo, rey</b>). Para abrir un palo nuevo hace falta su <b>5</b>.</p>` },
    { t: '¿Qué cartas puedo poner?', h: `<p>En la mesa están el <b>5 de oros</b>, el <b>6 de oros</b> y el <b>5 de copas</b>. Marca las que puedes jugar.</p>${fila([cartaEs(5, 'oros'), cartaEs(6, 'oros'), cartaEs(5, 'copas')].join(''))}`, req: true,
      demo(z, ctx) { return marcar(z, [{ h: cartaEs(7, 'oros'), ok: 1 }, { h: cartaEs(4, 'oros'), ok: 1 }, { h: cartaEs(4, 'copas'), ok: 1 }, { h: cartaEs(5, 'espadas'), ok: 1 }, { h: cartaEs(7, 'copas'), por: '❌ El 7 de copas no: falta el 6 de copas.' }, { h: cartaEs(12, 'oros'), por: '❌ El rey de oros no: faltan sota y caballo antes.' }], ctx); } },
    { t: 'Pasar y puntos', h: `<ul><li>Si puedes poner, <b>debes</b> hacerlo. Si no tienes ninguna, <b>pasas</b>.</li><li>Gana la mano el primero que se queda sin cartas. Los demás suman <b>1 punto por carta</b> que les quede.</li><li>Al final de las manas pactadas, <b>gana quien menos puntos tenga</b>.</li></ul><p>Truco: guarda cartas que abran tus propios palos para que el rival no tenga cómo avanzar.</p>` },
  ],
};
