// Worker del Scrabble: carga el diccionario (core/diccionario.js), lo pasa a fichas (diccio.js) y responde a la página
// sin congelar la pantalla: comprobar palabras, la jugada de la CPU y la 💡 pista. El diccionario se prepara una vez y se queda.
import * as D from '../../core/diccionario.js';
import { construir } from './diccio.js';
import * as M from './motor.js';
import { atender } from './servicio.js';

let dic = null, listo = null;
const preparar = () => listo || (listo = D.cargar().then(ok => { if (!ok) { listo = null; throw new Error('sin-diccionario'); } dic = construir(D); return dic; }));
self.onmessage = async e => {
  const { id, tipo, a } = e.data;
  try { await preparar(); self.postMessage({ id, r: atender(M, dic, tipo, a) }); }
  catch (err) { self.postMessage({ id, error: String(err && err.message || err) }); }
};
