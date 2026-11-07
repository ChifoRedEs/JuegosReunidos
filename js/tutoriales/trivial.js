import { elige } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'Trivia Quesitos',
  pasos: [
    { t: 'Tu turno', h: `<p>Tira el dado y mueve tu ficha esa cantidad de casillas, en el sentido que prefieras. El color de la casilla decide la <b>categoría</b>. Te dan una <b>definición</b> y tienes que decir de qué término se trata (4 opciones o escribiéndolo).</p><p>Si <b>aciertas</b>, vuelves a tirar; si fallas, pasa el turno.</p>` },
    { t: 'Ejercicio', h: `<p>Caes en una casilla de <b>quesito</b> (círculo blanco) y aciertas la pregunta. ¿Qué ganas?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: 'El quesito de esa categoría', ok: 1, por: '✅ Y vuelves a tirar.' }, { h: 'La partida', por: '❌ Para ganar hacen falta todos los quesitos.' }], ctx); } },
    { t: 'La ronda final', h: `<p>Con <b>todos los quesitos</b> vas al centro: una pregunta de <b>cada categoría</b>, seguidas y sin fallar. Si fallas una, pasa el turno y en el siguiente vuelves a intentarlo desde el principio. Las casillas 🎲 te dejan tirar otra vez sin pregunta.</p>` },
  ],
};
