import { elige, fila, cartaFr } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'BlackJack',
  pasos: [
    { t: 'El objetivo', h: `<p>Suma más que la banca <b>sin pasarte de 21</b>. Las figuras valen 10 y el As vale <b>1 u 11</b> (lo que más te convenga).</p><p>Un <b>blackjack</b> (As + una carta de valor 10 con tus dos primeras cartas) paga <b>3 a 2</b>.</p>${fila(cartaFr(1, 'picas') + cartaFr(13, 'corazones'))}` },
    { t: 'Ejercicio: cuenta tu mano', h: `<p>Tienes As, 7 y 5. ¿Cuánto vale tu mano?</p>${fila([cartaFr(1, 'picas'), cartaFr(7, 'corazones'), cartaFr(5, 'treboles')].join(''))}`, req: true,
      demo(z, ctx) { return elige(z, [{ h: '23, te pasas', por: '❌ El As cuenta 1 cuando 11 te hace pasar.' }, { h: '13', ok: 1, por: '✅ 1 + 7 + 5 = 13: el As pasa a valer 1 para no pasarte.' }, { h: '25', por: '❌ Eso sería 11 + 7 + 5 → te pasas. El As se ajusta a 1.' }], ctx); } },
    { t: 'Tus opciones', h: `<ul><li><b>Pedir</b> otra carta o <b>plantarte</b>.</li><li><b>Doblar</b>: duplicas la apuesta y recibes una sola carta.</li><li><b>Dividir</b>: con dos cartas iguales haces dos manos.</li><li><b>Rendirte</b>: recuperas la mitad.</li><li><b>Seguro</b>: si la banca enseña un As.</li></ul><p>La banca se planta con 17. El 💡 <b>consejo</b> te dice la jugada de la estrategia básica. Las fichas son ficticias.</p>` },
  ],
};
