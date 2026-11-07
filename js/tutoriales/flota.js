import { pincha } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'Batalla Naval',
  pasos: [
    { t: 'La idea', h: `<p>Cada jugador coloca su flota en secreto (horizontal o vertical; con «No se tocan», sin tocarse ni en diagonal). Después se turnan para <b>disparar</b> a una casilla del mar enemigo. Verás <b>agua</b>, <b>tocado</b> 🔥 o <b>hundido</b>. Gana quien hunde antes toda la flota rival.</p>` },
    { t: 'Ejercicio: sigue el rastro', h: `<p>Has tocado 🔥 un barco en el centro y todavía no se hunde. ¿Dónde disparas a continuación? Toca una casilla <b>pegada</b> a la tocada (arriba, abajo, izquierda o derecha).</p>`, req: true,
      demo(z, ctx) { const f = []; for (let r = 0; r < 5; r++) { const fila = []; for (let c = 0; c < 5; c++) fila.push({ h: r === 2 && c === 2 ? '🔥' : '', bg: '#9ed0f0' }); f.push(fila); } return pincha(z, f, [[1, 2], [3, 2], [2, 1], [2, 3]], ctx, { tam: 44, okMsg: '✅ Rastrea las casillas contiguas: el barco continúa en línea recta.', malMsg: '❌ Un barco ocupa casillas pegadas. Prueba al lado del 🔥.' }); } },
    { t: 'Ayudas', h: `<p>Al colocar: elige un barco, decide ↔️/↕️ y toca la casilla de la proa; o usa 🎲 Al azar. 💡 La <b>pista</b> marca la casilla con más probabilidad de esconder un barco. Con «Vuelves a disparar», si aciertas sigues.</p>` },
  ],
};
