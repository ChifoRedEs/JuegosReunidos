// Ejecuta el analizador en segundo plano para no bloquear la pantalla.
// También reparte partidas «con solución garantizada»: baraja hasta que el analizador encuentra una forma de ganar.
import { resolver } from './solver.js';
import { nuevo } from './motor.js';
self.onmessage = e => {
  const { id, tipo } = e.data;
  if (tipo === 'repartir') {
    const { robar, extra, vegas, ms = 9000 } = e.data, t0 = performance.now(); let intentos = 0;
    while (performance.now() - t0 < ms) {
      intentos++;
      const S = nuevo(robar, extra, vegas), r = resolver(S, { ms: 1200 });
      if (r.r === 'ganable') { self.postMessage({ id, tipo, S, intentos }); return; }
    }
    self.postMessage({ id, tipo, S: null, intentos });
    return;
  }
  const { S, ms } = e.data; self.postMessage({ id, ...resolver(S, { ms }) });
};
