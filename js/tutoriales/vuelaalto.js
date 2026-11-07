import { elige } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'Vuela Alto',
  pasos: [
    { t: 'Cómo se vuela', h: `<p><b>Mantén pulsada</b> la pantalla (o Espacio / ↑) para <b>subir</b>; <b>suelta</b> para bajar. No hace falta pulsar repetidamente.</p><p>Cruza los huecos entre obstáculos sin tocarlos ni caer. Cada puerta suma 10 puntos y cada 🪙, 25.</p>` },
    { t: 'Ejercicio', h: `<p>Quieres bajar un poco para entrar en un hueco más bajo. ¿Qué haces?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: 'Suelto la pantalla', ok: 1, por: '✅ Al soltar, el personaje baja. Pulsa y suelta con suavidad.' }, { h: 'Pulso más fuerte', por: '❌ Pulsar sube; para bajar hay que soltar.' }], ctx); } },
    { t: 'Modos', h: `<ul><li><b>Niveles</b>: más largos y difíciles; hasta 3 ★ según las monedas recogidas.</li><li><b>Infinito</b>: sin meta, cada vez más duro, con podio.</li><li>Peligros: tubos que se mueven, pájaros 🦅, hélices…</li></ul>` },
  ],
};
