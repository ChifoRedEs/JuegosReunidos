import { cartaFr, fila, marcar, elige } from '../core/tutorial.js';
// Tutorial de Continental
export const TUTORIAL = {
  titulo: 'Continental',
  pasos: [
    { t: 'Siete rondas, siete contratos', h: `<p>Se juega con dos barajas francesas. Hay <b>7 rondas</b> y en cada una tienes que "bajarte" con un <b>contrato</b>: por ejemplo "dos tríos", luego "un trío y una escalera", y así hasta las tres escaleras. Se reparten 7, 8, 9… 13 cartas.</p>` },
    { t: 'Trío y escalera', h: `<ul><li><b>Trío</b>: 3 o más cartas del <b>mismo número</b>.</li><li><b>Escalera</b>: 4 o más cartas <b>seguidas del mismo palo</b>. El As puede ir al principio o al final.</li><li>El comodín (joker) sustituye a cualquier carta.</li></ul>${fila([cartaFr(9, 'picas'), cartaFr(9, 'corazones'), cartaFr(9, 'treboles'), '<span style="width:14px"></span>', cartaFr(4, 'diamantes'), cartaFr(5, 'diamantes'), cartaFr(6, 'diamantes'), cartaFr(7, 'diamantes')].join(''))}` },
    { t: '¿Cuáles valen?', h: `<p>Marca las que son combinaciones válidas.</p>`, req: true,
      demo(z, ctx) { return marcar(z, [
        { h: fila([cartaFr(8, 'picas'), cartaFr(8, 'corazones'), cartaFr(8, 'diamantes')].join('')), ok: 1 },
        { h: fila([cartaFr(10, 'treboles'), cartaFr(11, 'treboles'), cartaFr(12, 'treboles'), cartaFr(13, 'treboles')].join('')), ok: 1 },
        { h: fila([cartaFr(3, 'picas'), cartaFr(4, 'picas'), cartaFr(5, 'picas')].join('')), por: '❌ Una escalera necesita al menos 4 cartas.' },
        { h: fila([cartaFr(6, 'picas'), cartaFr(6, 'corazones')].join('')), por: '❌ Un trío necesita 3 cartas.' }], ctx); } },
    { t: 'Turno y puntos', h: `<ol><li>Robas del mazo o del descarte.</li><li>Si tienes el contrato, pulsa <b>Bajarse</b>.</li><li>Descartas una carta.</li></ol><p>Una vez bajado, puedes <b>colocar cartas</b> en combinaciones de la mesa a partir del turno siguiente. Gana la ronda quien se queda sin cartas; los demás suman: 2-9 su valor, 10 y figuras 10, As 20, joker 50. <b>Gana quien menos puntos acumule.</b></p>` },
  ],
};
