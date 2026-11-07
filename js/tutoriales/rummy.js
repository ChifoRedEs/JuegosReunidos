import { ficha, fila, marcar, elige } from '../core/tutorial.js';
// Tutorial de Rummy (fichas)
export const TUTORIAL = {
  titulo: 'Rummy',
  pasos: [
    { t: 'El objetivo', h: `<p>Tienes 14 fichas numeradas (1-13) de cuatro colores. Gana el primero que <b>se queda sin fichas</b>, formando combinaciones sobre la mesa.</p>` },
    { t: 'Grupos y escaleras', h: `<ul><li><b>Grupo</b>: 3 ó 4 fichas del <b>mismo número y distinto color</b>.</li><li><b>Escalera</b>: 3 o más fichas <b>consecutivas del mismo color</b> (el 13 no vuelve al 1).</li></ul>${fila([ficha(7, 'rojo'), ficha(7, 'azul'), ficha(7, 'negro'), '<span style="width:14px"></span>', ficha(4, 'azul'), ficha(5, 'azul'), ficha(6, 'azul')].join(''))}` },
    { t: '¿Cuáles valen?', h: `<p>Marca las combinaciones válidas.</p>`, req: true,
      demo(z, ctx) { return marcar(z, [
        { h: fila([ficha(9, 'rojo'), ficha(9, 'azul'), ficha(9, 'negro')].join('')), ok: 1 },
        { h: fila([ficha(10, 'naranja'), ficha(11, 'naranja'), ficha(12, 'naranja')].join('')), ok: 1 },
        { h: fila([ficha(5, 'rojo'), ficha(5, 'rojo'), ficha(5, 'azul')].join('')), por: '❌ En un grupo los colores no se repiten.' },
        { h: fila([ficha(12, 'azul'), ficha(13, 'azul'), ficha(1, 'azul')].join('')), por: '❌ El 13 no enlaza con el 1.' }], ctx); } },
    { t: 'Primera bajada y comodines', h: `<ul><li>Tu primera bajada debe sumar <b>30 puntos o más</b>, solo con fichas de tu mano.</li><li>Después puedes <b>reorganizar</b> las combinaciones de la mesa para encajar tus fichas.</li><li>El comodín ★ vale lo que necesites, pero cuesta 30 puntos si te lo quedas.</li><li>Si no puedes jugar, robas una ficha.</li></ul>` },
  ],
};
