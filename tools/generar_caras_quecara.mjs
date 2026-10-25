// Genera js/games/quecara/defecto.js: las 30 caras por defecto de «¿Qué cara tienes?».
// Busca entre muchas semillas el reparto con más preguntas útiles y las guarda tal cual (así el tablero clásico no cambia aunque cambie el generador).
// Uso: node tools/generar_caras_quecara.mjs
import { writeFileSync } from 'node:fs';
import { generarCaras, caraValida } from '../js/games/quecara/avatar.js';
import { PREGUNTAS, vectorDe, disponibles } from '../js/games/quecara/preguntas.js';

let mejor = null;
for (let semilla = 1; semilla <= 3000; semilla++) {
  const c = generarCaras(30, semilla, vectorDe); if (!c) continue;
  const disp = disponibles(c);
  // puntuación: muchas preguntas útiles y que ninguna deje a casi todos de un lado
  let desequilibrio = 0; for (const p of disp) { const t = c.filter(p.test).length; desequilibrio += Math.abs(t - 15) > 11 ? 1 : 0; }
  const nota = disp.length * 10 - desequilibrio * 3;
  if (!mejor || nota > mejor.nota) mejor = { semilla, nota, c, util: disp.length };
}
console.log('semilla', mejor.semilla, 'preguntas útiles', mejor.util, '/', PREGUNTAS.length);
for (const f of mejor.c) if (!caraValida(f)) throw new Error('cara inválida ' + f.nm);
const lineas = mejor.c.map(f => '  ' + JSON.stringify(f)).join(',\n');
writeFileSync(new URL('../js/games/quecara/defecto.js', import.meta.url), `// GENERADO por tools/generar_caras_quecara.mjs (semilla ${mejor.semilla}) — las 30 caras por defecto de «¿Qué cara tienes?».\n// Caras: dibujos de Vue Color Avatar (LeoKu, MIT) y piezas nuevas en el mismo estilo.\nexport const CARAS_DEFECTO = [\n${lineas},\n];\n`);
