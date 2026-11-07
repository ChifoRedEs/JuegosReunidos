import { elige } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'Encadenadas',
  pasos: [
    { t: 'La cadena', h: `<p>Cada palabra empieza por la <b>última sílaba</b> de la anterior: ca·<b>sa</b> → <b>sa</b>·po → <b>po</b>·llo. Mínimo 3 letras y <b>sin repetir</b> palabras. Las tildes no importan.</p>` },
    { t: 'Ejercicio', h: `<p>La cadena va por <b>sapo</b>. ¿Qué palabra puedes poner ahora?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: 'pollo', ok: 1, por: '✅ sa·<b>po</b> → <b>po</b>·llo.' }, { h: 'sapo', por: '❌ Esa ya está en la cadena: no se repite.' }, { h: 'gato', por: '❌ No empieza por «po».' }], ctx); } },
    { t: 'Detalles', h: `<ul><li>«rro» se enlaza con «ro» (pe·rro → ro·sa).</li><li>Si ninguna palabra empieza por esa sílaba, valen las <b>dos últimas letras</b>.</li><li>Si la app no conoce tu palabra, te pregunta si existe y la aprende.</li><li>Si se acaba el tiempo o pulsas 🏳️ «No sé», pierdes una vida.</li></ul>` },
  ],
};
