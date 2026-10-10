// Ejecuta el analizador en segundo plano para no bloquear la pantalla.
import { resolver } from './solver.js';
self.onmessage = e => { const { id, S, ms } = e.data; self.postMessage({ id, ...resolver(S, { ms }) }); };
