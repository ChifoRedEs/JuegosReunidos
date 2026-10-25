// Segundo plano: busca soluciones y reparte partidas «con solución garantizada» (baraja hasta que se encuentra cómo ganar).
import { resolver } from './solver.js';
import { nuevo } from './motor.js';
self.onmessage = e => {
  const { id, tipo } = e.data;
  if (tipo === 'repartir') {
    const { ms = 9000, baraja } = e.data, t0 = performance.now(); let intentos = 0;
    while (performance.now() - t0 < ms) {
      intentos++;
      const S = nuevo(baraja), r = resolver(S, { ms: 1500 });
      if (r.r === 'ganable') { self.postMessage({ id, tipo, S, intentos }); return; }
    }
    self.postMessage({ id, tipo, S: null, intentos });
    return;
  }
  const { S, ms } = e.data; self.postMessage({ id, tipo, ...resolver(S, { ms }) });
};
