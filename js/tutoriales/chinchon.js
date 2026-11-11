import { cartaEs, fila, marcar, elige } from '../core/tutorial.js';
// Tutorial de Chinchón
export const TUTORIAL = {
  titulo: 'Chinchón',
  pasos: [
    { t: 'El objetivo', h: `<p>Con la baraja española de 40 cartas, recibes <b>7</b>. El objetivo es agrupar tus cartas en <b>combinaciones</b> y cerrar la mano con pocos puntos sueltos.</p>${fila([cartaEs(6, 'oros'), cartaEs(6, 'copas'), cartaEs(6, 'espadas'), '<span style="width:14px"></span>', cartaEs(3, 'bastos'), cartaEs(4, 'bastos'), cartaEs(5, 'bastos')].join(''))}<ul><li><b>Trío o cuarteto</b>: 3 ó 4 cartas del <b>mismo número</b>.</li><li><b>Escalera</b>: 3 o más cartas <b>seguidas del mismo palo</b> (el 7 va seguido de la sota).</li></ul>` },
    { t: 'En tu turno', h: `<p>Robas una carta (del mazo o la última descartada) y <b>tiras una</b>. Así vas mejorando tu mano.</p>` },
    { t: '¿Combinaciones válidas?', h: `<p>Marca los grupos que <b>sí son combinación</b> válida.</p>`, req: true,
      demo(z, ctx) { return marcar(z, [
        { h: fila([cartaEs(5, 'oros'), cartaEs(5, 'copas'), cartaEs(5, 'bastos')].join('')), ok: 1 },
        { h: fila([cartaEs(2, 'copas'), cartaEs(3, 'copas'), cartaEs(4, 'copas')].join('')), ok: 1 },
        { h: fila([cartaEs(7, 'espadas'), cartaEs(10, 'espadas'), cartaEs(11, 'espadas')].join('')), ok: 1, por: '' },
        { h: fila([cartaEs(2, 'copas'), cartaEs(3, 'oros'), cartaEs(4, 'copas')].join('')), por: '❌ Una escalera tiene que ser del mismo palo.' },
        { h: fila([cartaEs(5, 'oros'), cartaEs(5, 'copas')].join('')), por: '❌ Hacen falta al menos 3 cartas.' }], ctx); } },
    { t: 'Cerrar la mano', h: `<p>Puedes <b>cerrar</b> cuando las cartas que te quedan sueltas suman poco (hasta el valor de cierre). Los rivales suman los puntos de sus cartas sin combinar.</p><ul><li>Cerrar con <b>todas</b> las cartas combinadas: <b>−10</b> puntos.</li><li><b>Chinchón</b>: 7 cartas seguidas del mismo palo. Ganas la partida al instante.</li><li>Quien pasa del límite (50 ó 100) queda eliminado.</li></ul>` },
  ],
};
