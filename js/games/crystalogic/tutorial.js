// Tutorial de Crystalogic: 4 niveles hechos a mano que enseñan una idea cada uno. (sol y par se calculan al cargar)
import * as M from './motor.js';

const hacer = (titulo, texto, L) => { const V = M.validar(L); const S = M.resolver(V); V.sol = S.mejor; V.par = S.min; return { titulo, texto, L: V }; };
export const TUTO = [
  hacer('Tu primer programa',
    'Tu <b>objetivo</b>: llevar al mago 🧙 hasta el <b>portal</b> 🌀. Los lugares (círculos con número) están unidos por <b>caminos de colores</b>. Cada <b>ficha</b> mueve al mago por el camino de <b>su color</b>. <br><b>1)</b> Toca la ficha roja de abajo. <b>2)</b> Toca el hueco ① del programa. <b>3)</b> Pulsa ▶️ Ejecutar.',
    { n: [[1, 2], [4, 2]], e: [[0, 1, 'r', 0]], l: [], c: [], t: [], s: 0, p: 1, sc: M.plantilla([['s', 1]]), f: [1, 0, 0], k: [], bl: [['s', 1]] }),
  hacer('Cristales',
    'Ahora hay un <b>cristal</b> 💎. El mago lo recoge al pasar por ese lugar. Para ganar tienes que <b>recoger todos los cristales y terminar en el portal</b>. El programa se lee <b>de arriba abajo</b>: primero el hueco ①, luego el ②.',
    { n: [[0, 2], [2, 2], [4, 2]], e: [[0, 1, 'r', 0], [1, 2, 'g', 0]], l: [], c: [[1, 1]], t: [], s: 0, p: 2, sc: M.plantilla([['s', 2]]), f: [1, 1, 0], k: [], bl: [['s', 2]] }),
  hacer('Piensa el orden',
    'Cada ficha se usa <b>una sola vez</b>, así que importa el orden. Si una ficha no tiene camino de ese color desde donde está el mago, el programa falla: <b>no pasa nada</b>, lee el mensaje, cambia las fichas y vuelve a probar. Puedes usar ⏭ Paso para verlo paso a paso.',
    { n: [[0, 3], [2, 3], [4, 3], [4, 1], [0, 1]], e: [[0, 1, 'b', 0], [1, 2, 'r', 0], [2, 3, 'g', 0], [0, 4, 'r', 0]], l: [], c: [[2, 1]], t: [], s: 0, p: 3, sc: M.plantilla([['s', 3]]), f: [1, 1, 1], k: [], bl: [['s', 3]] }),
  hacer('Preguntas',
    'El <b>hexágono</b> es una <b>pregunta</b>: aquí «¿llevo exactamente 1 cristal?». Si la respuesta es <b>sí ✔</b> el programa sigue por una flecha, y si es <b>no ✘</b>, por la otra. Pon la ficha «=1» en el hexágono y las tres de color en las ramas: ¡pensando qué pasará, acertarás! A partir de aquí empieza la campaña.',
    { n: [[0, 2], [2, 2], [4, 2], [2, 0]], e: [[0, 1, 'r', 0], [1, 2, 'g', 0], [1, 3, 'b', 0]], l: [], c: [[1, 1]], t: [], s: 0, p: 2, sc: M.plantilla([['s', 1], ['i', 1, 1]]), f: [1, 1, 1], k: [1], bl: [['s', 1], ['i', 1, 1]] }),
];
