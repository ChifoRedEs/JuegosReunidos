import { elige } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'Catapulta',
  pasos: [
    { t: 'Apuntar', h: `<p>Mueve el punto del <b>cuarto de círculo</b> del menú flotante: hacia dónde lo muevas es la dirección del disparo, y <b>cuanto más lejos de la esquina, más fuerza</b>. Con teclado: ↑ ↓ cambian el ángulo, ← → la fuerza.</p><p>Pulsa <b>🚀 Lanzar</b>. La línea de puntos te enseña cómo empieza la trayectoria.</p>` },
    { t: 'Ejercicio', h: `<p>Tu disparo se queda corto. ¿Qué cambias?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: 'Aumento la fuerza (punto más lejos de la esquina)', ok: 1, por: '✅ Más fuerza = más alcance.' }, { h: 'Nada: repito el disparo', por: '❌ Saldrá igual de corto.' }], ctx); } },
    { t: 'Habilidades y materiales', h: `<p>Con <b>✨ Habilidad</b> (o tocando el campo) en pleno vuelo, cada proyectil hace algo distinto. La <b>madera</b> se parte con un golpe fuerte, el <b>hielo</b> se rompe casi con cualquier cosa, la <b>piedra</b> aguanta mucho y el <b>hierro</b> es el más duro. Cada proyectil que te sobra vale 10.000 puntos.</p>` },
  ],
};
