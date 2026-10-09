// IA de las Damas: minimax con poda alfa-beta y profundización iterativa (core/ia/minimax.js).
import { mejorJugada } from '../../core/ia/minimax.js';
import { jugadas, aplicar, esRey, dueno } from './reglas.js';

export const NIVELES = { facil: { prof: 2, ms: 300, ruido: 70 }, medio: { prof: 5, ms: 800, ruido: 6 }, dificil: { prof: 9, ms: 1800, ruido: 0 } };

function evaluar(e, js, p, R) {
  if (!js.length) return -100000 - p;                    // quien no puede mover, pierde (cuanto antes, peor)
  let s = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const x = e.b[r][c]; if (!x) continue;
    const mio = dueno(x) === e.turn;
    let v;
    if (esRey(x)) v = (R.voladora ? 330 : 190) + (3.5 - Math.abs(3.5 - c)) + (3.5 - Math.abs(3.5 - r));
    else {
      const avance = dueno(x) === 'w' ? 7 - r : r;
      v = 100 + avance * 3.5 + (c === 0 || c === 7 ? -1.5 : 0.8 * (3.5 - Math.abs(3.5 - c)) / 3.5);
      if (avance === 0) v += 7;                          // defensa de la fila de salida
    }
    s += mio ? v : -v;
  }
  return s;
}
export function elegir(b, turno, R, nivel) {
  const cfg = NIVELES[nivel] || NIVELES.medio;
  return mejorJugada({
    estado: { b, turn: turno },
    jugadas: e => jugadas(e.b, e.turn, R),
    aplicar: (e, m) => ({ b: aplicar(e.b, m), turn: e.turn === 'w' ? 'b' : 'w' }),
    evaluar: (e, js, p) => evaluar(e, js, p, R),
    profundidad: cfg.prof, tiempoMs: cfg.ms, ruido: cfg.ruido,
    extender: js => js[0].caps.length > 0,
  });
}
