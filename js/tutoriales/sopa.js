import { pincha } from '../core/tutorial.js';
export const TUTORIAL = {
  titulo: 'Sopa de letras',
  pasos: [
    { t: 'Qué hay que hacer', h: `<p>Entre las letras hay escondidas todas las palabras de la lista. Las debes encontrar y marcar.</p><ul><li><b>Fácil</b>: horizontal y vertical.</li><li><b>Medio</b>: también en diagonal.</li><li><b>Difícil</b>: las 8 direcciones, ¡incluso al revés!</li></ul>` },
    { t: 'Ejercicio: encuentra "LUZ"', h: `<p>La palabra <b>LUZ</b> está en horizontal. Toca su <b>primera</b> y su <b>última</b> letra.</p>`, req: true,
      demo(z, ctx) { const g = ['MAPAS', 'COLUZ', 'RTENO', 'PISOD']; return pincha(z, g.map(r => [...r]), [[1, 2], [1, 4]], ctx, { multi: true, tam: 44, okMsg: '✅ ¡LUZ! En el juego también puedes arrastrar el dedo de la primera a la última.' }); } },
    { t: 'Ayudas', h: `<p>💡 <b>Pista</b> señala la primera letra de una palabra pendiente (con pistas no cuenta el récord de tiempo). También hay modo 📚 <b>Diccionario</b> con palabras poco corrientes.</p>` },
  ],
};
