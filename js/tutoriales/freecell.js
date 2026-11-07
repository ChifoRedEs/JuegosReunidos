import { elige } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'Carta Blanca',
  pasos: [
    { t: 'El objetivo', h: `<p>Todas las cartas están boca arriba. Llévalas a las <b>4 bases</b> (de la A a la K, por palos). En las columnas se apila en <b>orden descendente alternando colores</b>.</p><p>Las <b>4 casillas libres</b> guardan <b>una carta cada una</b>, de forma temporal.</p>` },
    { t: 'Mover filas', h: `<p>Puedes mover una fila ordenada de golpe: caben <b>(casillas libres + 1)</b> cartas (y ×2 por cada columna vacía). Tienes <b>3 casillas libres vacías</b> y ninguna columna vacía: ¿cuántas cartas puedes mover?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: '3', por: '❌ Cuenta la carta que mueves además de las 3 libres.' }, { h: '4', ok: 1, por: '✅ 3 casillas libres + 1 = 4 cartas.' }, { h: '8', por: '❌ Eso solo con columnas vacías.' }], ctx); } },
    { t: 'Consejos', h: `<ul><li>Intenta vaciar columnas: son oro.</li><li>No llenes las casillas libres sin necesidad.</li><li>Las cartas que ya no hacen falta suben solas a las bases.</li><li>Casi todas las partidas se pueden ganar: ✅ «siempre con solución». 💡 Pista y ↶ Deshacer.</li></ul>` },
  ],
};
