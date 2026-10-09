// Registro de juegos. Para añadir uno: crea js/games/<id>/index.js y añade una línea aquí.
// Los módulos se cargan solo al abrir el juego (import dinámico).
export const CATEGORIAS = { logica: 'Lógica', tablero: 'Tablero', cartas: 'Cartas', palabras: 'Palabras' };

export const JUEGOS = [
  { id: 'sudoku',   v1: 'sudoku',   nombre: 'Sudoku',   icono: '🔢', color: '#2B6CB0', categoria: 'logica',  descripcion: 'Notas, deshacer y tableros con solución única.', cargar: () => import('./games/sudoku/index.js') },
  { id: 'nonogram', v1: 'nonogram', nombre: 'Nonogram', icono: '🖼️', color: '#F2B84B', categoria: 'logica',  descripcion: 'Pinta arrastrando y descubre el dibujo.',       cargar: () => import('./games/nonogram/index.js') },
  { id: 'damas',    v1: 'damas',    nombre: 'Damas',    icono: '⚫', color: '#D6453D', categoria: 'tablero', descripcion: 'Reglas española o inglesa, 3 niveles de IA.',    cargar: () => import('./games/damas/index.js') },
  { id: 'tresenraya', nombre: '3 en raya', icono: '⭕', color: '#7A5BC7', categoria: 'tablero', descripcion: '4 tableros: clásico, infinito, 4×4 y 5×5.', cargar: () => import('./games/tresenraya/index.js') },
  { id: 'conecta4', nombre: 'Conecta 4', icono: '🔴', color: '#E5622B', categoria: 'tablero', descripcion: '4 tableros, hasta Conecta 5. Pista y marcador.', cargar: () => import('./games/conecta4/index.js') },
  { id: 'parchis',  v1: 'parchis',  nombre: 'Parchís',  icono: '🎲', color: '#2E9E5B', categoria: 'tablero', descripcion: '2 a 4 jugadores, personas o CPU.',               cargar: () => import('./games/parchis/index.js') },
];

// Juegos planificados (solo se muestran como aviso en Inicio hasta que existan).
export const PROXIMAMENTE = ['Sopa de letras', 'Buscaminas', 'BlackJack', 'Klondike', 'Crucigramas', 'Texas Hold\'em'];
