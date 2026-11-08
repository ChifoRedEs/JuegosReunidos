// Índice de tutoriales: id del juego → módulo con `export const TUTORIAL = { titulo, pasos }`
// Si hay demostración animada en demos.js, se inserta como paso 2 («Así se juega»).
const t = n => async () => {
  const m = await import(`./${n}.js`);
  let d = null;
  try { d = (await import('./demos.js')).DEMOS[n]; } catch (e) { console.warn('Sin demostración animada:', e); }
  if (!d || m.TUTORIAL.pasos.some(p => p.demo && p.demoPase)) return m;
  const { pase } = await import('../core/tutorial.js');
  const paso = { t: d.t || 'Así se juega', h: d.h || '', demoPase: true, demo: (z, ctx) => pase(z, d.marcos.map(([h, c]) => ({ h, c })), ctx) };
  return { TUTORIAL: { ...m.TUTORIAL, pasos: [m.TUTORIAL.pasos[0], paso, ...m.TUTORIAL.pasos.slice(1)] } };
};
export const TUTORIALES = Object.fromEntries(['sudoku', 'nonogram', 'kenken', 'kakuro', 'sokoban', 'klotski', 'mastermind', 'buscaminas', 'hijoputa', 'cinquillo', 'continental', 'chinchon', 'rummy', 'mus', 'magnate', 'hotel', 'bingolive', 'bingomobile', 'ahorcado', 'airhockey', 'ajedrez', 'billar', 'blackjack', 'bloques', 'brisca', 'catapulta', 'cifrasletras', 'conecta4', 'corazones', 'crucigrama', 'damas', 'domino', 'encadenadas', 'flota', 'freecell', 'holdem', 'klondike', 'ladrillos', 'memorama', 'oca', 'parchis', 'pokercub', 'quantix', 'quecara', 'rosco', 'ruleta', 'scrabble', 'serpiente', 'sopa', 'spider', 'tresenraya', 'trivial', 'vuelaalto', 'worms'].map(n => [n, t(n)]));
