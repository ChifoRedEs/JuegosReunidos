import { elige } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'Quantix',
  pasos: [
    { t: 'El objetivo', h: `<p>Bajo un panel oscuro hay una imagen. Debes <b>descubrir</b> el porcentaje que marca el objetivo (60, 75 o 90 %).</p><p><b>Pulsa junto a una zona ya descubierta</b> y <b>desliza</b>: se forma un cuadrado que crece hacia donde apuntas. Suelta para descubrirlo.</p>` },
    { t: 'El peligro', h: `<p>Mientras el cuadrado crece está <b>en peligro</b>: si un jefe lo toca, pierdes una vida y se cancela. ¿Qué es más seguro?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: 'Cuadrados pequeños y rápidos', ok: 1, por: '✅ Cuanto más grande y lento, más riesgo.' }, { h: 'Un cuadrado enorme y lento', por: '❌ Da mucho tiempo a que un jefe lo toque.' }], ctx); } },
    { t: 'Los jefes', h: `<ul><li><b>Rebotadores</b>: en línea recta.</li><li><b>Errantes</b>: giran al azar.</li><li><b>Cazadores</b>: persiguen tu cuadrado.</li></ul><p>Si tus cuadrados encierran una zona sin jefes, se descubre sola. 3 ★ si no pierdes vidas.</p>` },
  ],
};
