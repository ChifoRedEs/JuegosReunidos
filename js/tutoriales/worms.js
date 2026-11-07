import { elige } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'Guerra de Orugas',
  pasos: [
    { t: 'La idea', h: `<p>Dos equipos de gusanos se turnan. En cada turno juega un gusano: <b>muévelo, apunta y dispara</b>. Gana el equipo que deja sin gusanos al otro.</p><ul><li>◀ ▶ andar, ⤴️ salto, ⤒ salto alto.</li><li>▲ ▼ mueven la mira. En lanzamisiles y granadas, mantén FUEGO para dar potencia y suelta.</li></ul>` },
    { t: 'Ejercicio', h: `<p>Después de disparar, ¿qué haces?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: 'Aprovecho los segundos que quedan para ponerme a salvo', ok: 1, por: '✅ Tras atacar tienes unos segundos para moverte.' }, { h: 'Nada: el turno ya se acabó', por: '❌ Todavía puedes moverte un momento.' }], ctx); } },
    { t: 'Extras', h: `<ul><li>🪢 <b>Cuerda Gancho</b> para balancearte.</li><li>Las <b>cajas</b> con paracaídas dan vida o armas.</li><li>El viento empuja los misiles; tras unas rondas <b>sube el agua</b>.</li><li>Arrastra el mapa para mirar; dos dedos para zoom; 🎯 vuelve a tu gusano.</li></ul>` },
  ],
};
