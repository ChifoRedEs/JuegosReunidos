import { pincha } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'Ajedrez',
  pasos: [
    { t: 'El objetivo', h: `<p>Gana quien da <b>jaque mate</b>: el rey rival está atacado y no puede escapar. Empiezan las blancas. Toca una pieza tuya y verás sus casillas posibles; toca el destino para mover.</p><p>No puedes hacer una jugada que deje a tu rey en jaque. Hay reglas especiales: <b>enroque</b>, <b>captura al paso</b> y <b>coronación</b>.</p>` },
    { t: 'Ejercicio: mate en una', h: `<p>Juegas con blancas ♖ (torre en a1, rey en g1). El rey negro ♚ está encerrado por sus propios peones. <b>Toca la casilla a la que debe ir la torre</b> para dar jaque mate.</p>`, req: true,
      demo(z, ctx) {
        const N = (c, r) => ((c + r) % 2 ? '#b58863' : '#f0d9b5');
        const P = { '0,6': '♚', '1,5': '♟', '1,6': '♟', '1,7': '♟', '7,0': '♖', '7,6': '♔' }; const f = [];
        for (let r = 0; r < 8; r++) { const fila = []; for (let c = 0; c < 8; c++) fila.push({ h: P[r + ',' + c] || '', bg: N(c, r), col: '#111' }); f.push(fila); }
        return pincha(z, f, [[0, 0]], ctx, { tam: 34, okMsg: '✅ ¡Torre a a8! Da jaque y el rey no puede huir porque sus peones le tapan.', malMsg: '❌ La torre debe llegar a la fila del rey negro (la de arriba), sin nada en medio.' });
      } },
    { t: 'Tablas y ayudas', h: `<ul><li><b>Tablas</b>: rey ahogado, triple repetición, 50 jugadas sin captura, o material insuficiente.</li><li>⏱️ <b>Reloj</b> opcional; 🔍 <b>Revisar</b> la partida jugada a jugada; 💡 <b>Pista</b>.</li><li>Notación española: R rey, D dama, T torre, A alfil, C caballo.</li></ul>` },
  ],
};
