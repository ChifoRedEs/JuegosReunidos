import { cartaEs, fila, marcar, elige } from '../core/tutorial.js';
// Tutorial de Mus
const V = n => n >= 10 ? 10 : n;
export const TUTORIAL = {
  titulo: 'Mus',
  pasos: [
    { t: 'Parejas y 4 cartas', h: `<p>Se juega por <b>parejas</b> (tú y tu compañero contra los rivales). Cada uno recibe <b>4 cartas</b> de la baraja española. Quien está a la derecha del repartidor es <b>mano</b> y gana los empates.</p><p>Primero se decide si hay <b>mus</b> (descartar cartas y robar otras) o si se corta y se juega ya.</p>` },
    { t: 'Los cuatro lances', h: `<ol><li><b>Grande</b>: gana quien tiene las cartas más altas (rey, caballo, sota, 7…).</li><li><b>Chica</b>: lo contrario, gana quien tiene las más bajas (el as).</li><li><b>Pares</b>: vale tener 2 cartas iguales. <b>Pares</b> (1 punto), <b>medias</b> (tres iguales, 2) y <b>duples</b> (dos parejas o cuatro iguales, 3).</li><li><b>Juego</b>: suman las cartas (figuras = 10) y hay juego si llegas a 31 o más. Si nadie tiene, se juega al <b>punto</b>: el más cercano a 30.</li></ol>` },
    { t: 'Ejercicio: ¿qué tengo en Pares?', h: `<p>Tu mano es: ${fila([cartaEs(12, 'oros'), cartaEs(12, 'copas'), cartaEs(4, 'bastos'), cartaEs(4, 'espadas')].join(''))}<br>¿Qué tienes en el lance de Pares?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: 'Pares (1 punto)', por: '❌ Tienes dos parejas, que valen más.' }, { h: 'Medias (2 puntos)', por: '❌ Medias son tres cartas iguales.' }, { h: 'Duples (3 puntos)', ok: 1, por: '✅ Dos reyes y dos cuatros = duples.' }], ctx); } },
    { t: 'Ejercicio: ¿tengo juego?', h: `<p>Tu mano: ${fila([cartaEs(11, 'oros'), cartaEs(7, 'copas'), cartaEs(10, 'bastos'), cartaEs(4, 'espadas')].join(''))}<br>Las figuras (sota, caballo, rey) valen 10. ¿Cuánto suman?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: '21 — no hay juego', por: '❌ Cuéntalas otra vez.' }, { h: '31 — la mejor jugada', ok: 1, por: '✅ 10 + 7 + 10 + 4 = 31.' }, { h: '40', por: '❌ Esa suma no sale.' }], ctx); } },
    { t: 'Apostar', h: `<p>En cada lance se puede: <b>pasar</b>, <b>envidar</b> (apostar piedras), <b>ver/quiero</b>, <b>no quiero</b> o <b>subir</b>. Si la apuesta no se acepta, la pareja que envidó se lleva 1 tanto. El <b>órdago</b> es apostar todo el marcador.</p><p>El juego termina cuando una pareja llega a los tantos pactados.</p>` },
  ],
};
