import { elige } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'Billar',
  pasos: [
    { t: 'Cómo tirar', h: `<p>Toca o arrastra sobre la mesa para <b>apuntar</b>, afina con ↺ ↻, elige la <b>fuerza</b> y pulsa 🎱 <b>Tirar</b>. En la bola de efecto del panel eliges dónde golpeas la blanca: arriba = <i>alto</i> (sigue tras chocar), abajo = <i>bajo</i> (retrocede).</p><p>La <b>línea de ayuda</b> marca hasta dónde va la blanca.</p>` },
    { t: 'Modos', h: `<ul><li><b>Pool 8</b>: te quedas con lisas (1-7) o rayadas (9-15); mete las tuyas y después la 8.</li><li><b>Pool 9</b>: toca siempre primero la más baja; gana quien mete la 9.</li><li><b>Snooker 6 rojas</b>: una roja (1 punto) y luego un color (2-7).</li></ul>` },
    { t: 'Ejercicio: faltas', h: `<p>Metes la bola blanca. ¿Qué ocurre?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: 'Es falta: el rival tiene bola en mano', ok: 1, por: '✅ Coloca la blanca donde quiera (en snooker, dentro de la D).' }, { h: 'Nada, sigo tirando', por: '❌ Meter la blanca es falta.' }], ctx); } },
  ],
};
