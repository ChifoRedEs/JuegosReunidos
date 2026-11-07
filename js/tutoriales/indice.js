// Índice de tutoriales: id del juego → módulo con `export const TUTORIAL = { titulo, pasos }`
const t = n => () => import(`./${n}.js`);
export const TUTORIALES = Object.fromEntries(['sudoku', 'nonogram', 'kenken', 'kakuro', 'sokoban', 'klotski', 'mastermind', 'buscaminas', 'hijoputa', 'cinquillo', 'continental', 'chinchon', 'rummy', 'mus', 'magnate', 'hotel', 'bingolive', 'bingomobile'].map(n => [n, t(n)]));
