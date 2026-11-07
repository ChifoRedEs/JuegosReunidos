import { elige } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'Crucigramas',
  pasos: [
    { t: 'Cómo se rellena', h: `<p>Cada casilla numerada marca el inicio de una palabra. Lee la pista del número y escribe la respuesta, letra a letra. Las palabras se <b>cruzan</b>, así que cada acierto te ayuda con otras.</p><p>Toca una casilla y se abre el <b>teclado emergente</b>: puedes moverlo arrastrándolo y cerrarlo con ✕.</p>` },
    { t: 'Ejercicio', h: `<p>Una casilla pertenece a una palabra horizontal y a una vertical. ¿Cómo cambias entre ellas?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: 'Tocando la casilla otra vez', ok: 1, por: '✅ Un segundo toque cambia de horizontal a vertical. Con ‹ › saltas de pista en pista.' }, { h: 'Hay que borrarla', por: '❌ No hace falta borrar nada.' }], ctx); } },
    { t: 'Ayudas', h: `<ul><li>✔ <b>Comprobar</b> marca en rojo lo incorrecto.</li><li>💡 <b>Letra / Palabra</b> revelan ayuda (con ayudas no cuenta el récord).</li><li>En ⋯ puedes activar «Marcar errores al instante».</li></ul>` },
  ],
};
