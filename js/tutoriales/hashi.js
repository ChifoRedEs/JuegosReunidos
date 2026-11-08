import { tableroMini } from '../games/hashi/mini.js';
const ICONO = new URL('../games/hashi/img/icono.webp', import.meta.url).href;
export const TUTORIAL = {
  titulo: 'Puentes Hashi',
  pasos: [
    { t: 'El objetivo', h: `<p style="text-align:center"><img src="${ICONO}" alt="" width="84" height="84" style="border-radius:18px"></p><p>Cada <b>isla</b> lleva un número: son los <b>puentes</b> que tienen que salir de ella. Los puentes van en <b>línea recta</b> entre islas vecinas, <b>no se cruzan</b> y al final <b>todas las islas</b> quedan unidas en una sola red.</p>` },
    { t: 'Ejercicio: tiende un puente', h: `<p>Cada isla pide <b>1</b> puente. Toca una isla y después la otra.</p>`, req: true,
      demo(z, ctx) { return tableroMini(z, [[0, 0, 1], [0, 2, 1]], ctx, { okMsg: '✅ ¡Primer puente! Las dos islas tienen su número y ya están unidas.' }); } },
    { t: 'Ejercicio: puente doble', h: `<p>Entre dos islas puede haber <b>uno o dos</b> puentes. Estas piden <b>2</b>: toca una isla y la otra, y repite. (Un tercer toque quita el puente.)</p>`, req: true,
      demo(z, ctx) { return tableroMini(z, [[0, 0, 2], [0, 3, 2]], ctx, { okMsg: '✅ ¡Doble! Cada isla tiene sus 2 puentes.' }); } },
    { t: 'Ejercicio: una red', h: `<p>La isla de arriba a la izquierda pide <b>2</b>. Como las otras dos solo piden <b>1</b>, cada una se une a ella. Todo debe quedar conectado.</p>`, req: true,
      demo(z, ctx) { return tableroMini(z, [[0, 0, 2], [0, 3, 1], [2, 0, 1]], ctx, { okMsg: '✅ ¡Una sola red! Las tres islas están unidas.' }); } },
    { t: 'Ejercicio: resuelve el puzle', h: `<p>Piensa por <b>deducción</b>. Un truco: la isla <b>4</b> de la fila de arriba tiene tres vecinas, y 4 puentes repartidos entre tres vecinas obligan a poner al menos <b>uno a cada una</b>. Los puentes no pueden cruzarse. Si te atascas, usa «👀 Muéstrame».</p>`, req: true,
      demo(z, ctx) { return tableroMini(z, [[0, 0, 1], [0, 2, 4], [0, 4, 2], [2, 0, 2], [2, 2, 3], [4, 0, 2], [4, 4, 2]], ctx, { okMsg: '✅ ¡Resuelto! Todas las islas completas y unidas en una red.', pista: 'Recuerda: sin cruces y todo conectado.' }); } },
    { t: 'Trucos y ayudas', h: `<ul><li>Un <b>1</b> en una esquina con una sola vecina: esa vecina es su único camino.</li><li>Un <b>4</b> en un lado o un <b>8</b> en el centro llevan <b>doble</b> puente a todas sus vecinas.</li><li>Dos islas con el mismo número bajo (1 y 1, o 2 y 2 unidas con doble) no pueden unirse solas si hay más islas: quedarían aisladas del resto.</li><li>🛟 <b>Boyas</b>: marca los huecos donde no cabe puente, para no volver a pensarlos.</li><li>💡 <b>Pista</b> tiende un puente correcto y ✔ <b>Comprobar</b> marca en rojo los que sobran.</li><li>Fácil, Normal y Difícil se resuelven sin adivinar; Experto y Maestro pueden pedir probar una hipótesis.</li></ul>` },
  ],
};
