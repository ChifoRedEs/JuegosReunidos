// Búsqueda minimax (negamax) con poda alfa-beta, profundización iterativa y límite de tiempo.
// Reutilizable por Damas, Conecta 4, 3 en raya, Reversi, etc.
//
//   mejorJugada({ estado, jugadas, aplicar, evaluar, profundidad, tiempoMs, ruido, extender })
//   - jugadas(estado)         -> array de jugadas legales del jugador que mueve
//   - aplicar(estado, jugada) -> NUEVO estado (sin mutar el original), ya con el turno cambiado
//   - evaluar(estado, js, p)  -> puntuación desde el punto de vista de quien mueve en `estado`.
//                                `js` son sus jugadas (si está vacío, el juego decide: derrota, tablas…).
//                                `p` es la profundidad restante (sirve para preferir victorias rápidas).
//   - ruido                   -> aleatoriedad añadida a la puntuación de cada jugada de la raíz (niveles fáciles)
//   - extender(js)            -> true si en profundidad 0 conviene seguir (p. ej. capturas forzadas)
const FIN = Symbol('fin');
export function mejorJugada({ estado, jugadas, aplicar, evaluar, profundidad = 4, tiempoMs = 1000, ruido = 0, extender = null }) {
  const raiz = jugadas(estado);
  if (!raiz.length) return null;
  if (raiz.length === 1) return raiz[0];
  const t0 = performance.now();
  const neg = (e, p, a, b, ext) => {
    if (performance.now() - t0 > tiempoMs) throw FIN;
    const js = jugadas(e);
    if (!js.length) return evaluar(e, js, p);
    if (p <= 0) { if (extender && ext < 6 && extender(js)) p = 1, ext++; else return evaluar(e, js, p); }
    let mejor = -Infinity;
    for (const j of js) {
      const v = -neg(aplicar(e, j), p - 1, -b, -a, ext);
      if (v > mejor) mejor = v;
      if (mejor > a) a = mejor;
      if (a >= b) break;
    }
    return mejor;
  };
  let resultado = { jugada: raiz[0], puntos: new Array(raiz.length).fill(0) };
  let orden = raiz.slice();
  for (let d = 1; d <= profundidad; d++) {
    try {
      const pts = []; let mejorV = -Infinity, mejorJ = orden[0];
      for (const j of orden) {
        const v = -neg(aplicar(estado, j), d - 1, -Infinity, Infinity, 0);
        pts.push([j, v]);
        if (v > mejorV) { mejorV = v; mejorJ = j; }
      }
      pts.sort((x, y) => y[1] - x[1]);
      orden = pts.map(x => x[0]);
      resultado = { jugada: mejorJ, puntos: pts };
    } catch (e) { if (e !== FIN) throw e; break; }
  }
  if (ruido && Array.isArray(resultado.puntos) && resultado.puntos.length && Array.isArray(resultado.puntos[0])) {
    let mj = resultado.jugada, mv = -Infinity;
    for (const [j, v] of resultado.puntos) { const s = v + Math.random() * ruido; if (s > mv) { mv = s; mj = j; } }
    return mj;
  }
  return resultado.jugada;
}
