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
export const TUTORIALES = Object.fromEntries(['sudoku', 'nonogram', 'calcudoku', 'puenteshashi', 'crucisumas', 'encajados', 'deslizadas', 'codigocifrado', 'bombardeo', 'hijoputa', 'cinquillo', 'continental', 'chinchon', 'rummy', 'mus', 'magnateurbano', 'hotel', 'bingolive', 'bingomobile', 'elahorcado', 'airhockey', 'ajedrez', 'billar', 'blackjack', 'bloques', 'brisca', 'catapulta', 'numerosyletras', 'cuatroenlinea', 'corazones', 'crucigramas', 'damas', 'domino', 'encadenadas', 'batallanaval', 'cartablanca', 'holdem', 'klondike', 'rompeladrillos', 'matchup', 'juegodelaoca', 'partxis', 'pokercubierto', 'quantix', 'quecaratienes', 'elrosco', 'ruletamillonaria', 'palabrascruzadas', 'serpiente', 'sopaletras', 'spider', 'tresenraya', 'triviaquesitos', 'vuelaalto', 'guerraorugas'].map(n => [n, t(n)]));
