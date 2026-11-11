import { elige } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'Póker cubierto',
  pasos: [
    { t: 'El desarrollo', h: `<ol><li>Todos ponen la <b>entrada</b> y reciben <b>5 cartas tapadas</b>.</li><li><b>Primera ronda de apuestas</b>.</li><li><b>Descarte</b>: cada uno cambia de 0 a 3 cartas (4 si guardas un as).</li><li><b>Segunda ronda</b> y, si quedan dos o más, se enseñan las cartas: gana la mejor mano de 5.</li></ol>` },
    { t: 'Jotas o mejor', h: `<p>Con la opción <b>jotas o mejor</b>, solo puede abrir la apuesta quien tenga al menos <b>pareja de jotas</b>. Si nadie abre, se reparte de nuevo y el bote se queda.</p><p>Tienes pareja de <b>10</b>. ¿Puedes abrir?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: 'No: son menos que jotas', ok: 1, por: '✅ Hace falta pareja de jotas o mejor.' }, { h: 'Sí, una pareja siempre vale', por: '❌ Con esta opción tiene que ser de jotas o superior.' }], ctx); } },
    { t: 'Fíjate en los cambios', h: `<p>Cuántas cartas cambia un rival te da pistas: <b>servido</b> (0 cartas) suele ser mano hecha; cambiar 3, que tiene pareja. Con los consejos (menú ⋯) ves tu probabilidad de ganar y qué cartas conviene cambiar.</p>` },
  ],
};
