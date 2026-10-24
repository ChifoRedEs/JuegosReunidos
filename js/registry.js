// Registro de juegos. Para añadir uno: crea js/games/<id>/index.js y añade una línea aquí.
// Los módulos se cargan solo al abrir el juego (import dinámico).
export const CATEGORIAS = { logica: 'Lógica', tablero: 'Tablero', cartas: 'Cartas', palabras: 'Palabras', arcade: 'Arcade' };

export const JUEGOS = [
  { id: 'sudoku',   v1: 'sudoku',   nombre: 'Sudoku',   icono: '🔢', color: '#2B6CB0', categoria: 'logica',  descripcion: '4 niveles por técnica, notas y reto del día.', cargar: () => import('./games/sudoku/index.js') },
  { id: 'nonogram', v1: 'nonogram', nombre: 'Nonogram', icono: '🖼️', color: '#F2B84B', categoria: 'logica',  descripcion: 'Pinta y descubre el dibujo. Reto del día.',       cargar: () => import('./games/nonogram/index.js') },
  { id: 'damas',    v1: 'damas',    nombre: 'Damas',    icono: '👑', color: '#D6453D', categoria: 'tablero', descripcion: '4 reglamentos, hasta el internacional 10×10.',    cargar: () => import('./games/damas/index.js') },
  { id: 'tresenraya', nombre: '3 en raya', icono: '⭕', color: '#7A5BC7', categoria: 'tablero', descripcion: '4 tableros y series al mejor de 3 o 5.', cargar: () => import('./games/tresenraya/index.js') },
  { id: 'conecta4', nombre: 'Conecta 4', icono: '🔴', color: '#E5622B', categoria: 'tablero', descripcion: '4 tableros, hasta Conecta 5. Pista y marcador.', cargar: () => import('./games/conecta4/index.js') },
  { id: 'sopa', nombre: 'Sopa de letras', icono: '🔤', color: '#0FB3C9', categoria: 'palabras', descripcion: '11 temas, 3 niveles y reto del día.', cargar: () => import('./games/sopa/index.js') },
  { id: 'buscaminas', nombre: 'Buscaminas', icono: '💣', color: '#E0356E', categoria: 'logica', descripcion: 'Sin adivinar, personalizado y reto del día.', cargar: () => import('./games/buscaminas/index.js') },
  { id: 'crucigrama', nombre: 'Crucigramas', icono: '🧩', color: '#8B5CF6', categoria: 'palabras', descripcion: '10 temas con definiciones y reto del día.', cargar: () => import('./games/crucigrama/index.js') },
  { id: 'blackjack', nombre: 'BlackJack', icono: '🃏', color: '#12A05C', categoria: 'cartas', descripcion: 'Consejo de estrategia y contador Hi-Lo.', cargar: () => import('./games/blackjack/index.js') },
  { id: 'klondike', nombre: 'Klondike', icono: '♠️', color: '#1F8A5B', categoria: 'cartas', descripcion: 'Siempre con solución y modo Vegas.', cargar: () => import('./games/klondike/index.js') },
  { id: 'holdem', nombre: "Texas Hold'em", icono: '♦️', color: '#B02A47', categoria: 'cartas', descripcion: 'Torneo o partida libre contra bots.', cargar: () => import('./games/holdem/index.js') },
  { id: 'pokercub', nombre: 'Póker cubierto', icono: '♣️', color: '#7B3FC4', categoria: 'cartas', descripcion: 'Cinco cartas tapadas, descarte y dos rondas de apuestas.', cargar: () => import('./games/pokercub/index.js') },
  { id: 'corazones', nombre: 'Corazones', icono: '❤️', color: '#D63A5E', categoria: 'cartas', descripcion: 'Evita los corazones y la dama de picas… o llévatelos todos.', cargar: () => import('./games/corazones/index.js') },
  { id: 'kenken', nombre: 'KenKen', icono: '➗', color: '#7A4DFF', categoria: 'logica', descripcion: 'Sudoku con operaciones. Reto del día.', cargar: () => import('./games/kenken/index.js') },
  { id: 'kakuro', nombre: 'Kakuro', icono: '➕', color: '#3A7BD5', categoria: 'logica', descripcion: 'Crucigrama de sumas. 3 tamaños, 3 niveles y reto del día.', cargar: () => import('./games/kakuro/index.js') },
  { id: 'sokoban', nombre: 'Sokoban', icono: '📦', color: '#C47A2C', categoria: 'logica', descripcion: 'Empuja las cajas a su sitio. 20 niveles y generados.', cargar: () => import('./games/sokoban/index.js') },
  { id: 'klotski', nombre: 'Klotski', icono: '🧩', color: '#E0553D', categoria: 'logica', descripcion: 'Bloques deslizantes o fichas con números. Varios tableros y 4 niveles.', cargar: () => import('./games/klotski/index.js') },
  { id: 'mastermind', nombre: 'Mastermind', icono: '🔴', color: '#7B4DD8', categoria: 'logica', descripcion: 'Descifra el código de colores con pistas negras y blancas, o pon tú el código. 4 niveles.', cargar: () => import('./games/mastermind/index.js') },
  { id: 'ruleta', nombre: 'Ruleta de la Suerte', icono: '🎡', color: '#F59E0B', categoria: 'palabras', descripcion: 'Gira, di consonantes, compra vocales y resuelve.', cargar: () => import('./games/ruleta/index.js') },
  { id: 'ahorcado', nombre: 'El Ahorcado', icono: '🪢', color: '#E5622B', categoria: 'palabras', descripcion: '4 niveles, pistas y modo 2 jugadores.', cargar: () => import('./games/ahorcado/index.js') },
  { id: 'brisca', nombre: 'Brisca', icono: '🂡', color: '#C2410C', categoria: 'cartas', descripcion: 'Baraja española: 2, 3 o 4 jugadores en parejas.', cargar: () => import('./games/brisca/index.js') },
  { id: 'ajedrez', nombre: 'Ajedrez', icono: '♟️', color: '#6B4426', categoria: 'tablero', descripcion: 'Reloj, PGN, revisión y CPU de 3 niveles.', cargar: () => import('./games/ajedrez/index.js') },
  { id: 'chinchon', nombre: 'Chinchón', icono: '🀄', color: '#0E7C66', categoria: 'cartas', descripcion: 'Baraja española: liga, cierra y busca el chinchón.', cargar: () => import('./games/chinchon/index.js') },
  { id: 'mus', nombre: 'Mus', icono: '🤝', color: '#B3182B', categoria: 'cartas', descripcion: 'Por parejas: grande, chica, pares, juego y órdago.', cargar: () => import('./games/mus/index.js') },
  { id: 'flota', nombre: 'Hundir la Flota', icono: '🚢', color: '#1B4FA8', categoria: 'tablero', descripcion: '6 flotas, de Relámpago 6×6 a Gran armada 12×12.', cargar: () => import('./games/flota/index.js') },
  { id: 'rummy', nombre: 'Rummy de fichas', icono: '🀄', color: '#E0243A', categoria: 'tablero', descripcion: 'Grupos y escaleras de fichas: reorganiza la mesa y quédate sin fichas.', cargar: () => import('./games/rummy/index.js') },
  { id: 'oca', nombre: 'Juego de la Oca', icono: '🦢', color: '#7CA83A', categoria: 'tablero', descripcion: 'De oca a oca y tiro porque me toca. De 2 a 4 jugadores.', cargar: () => import('./games/oca/index.js') },
  { id: 'cinquillo', nombre: 'Cinquillo', icono: '5️⃣', color: '#C0392B', categoria: 'cartas', descripcion: 'Empieza el 5 de oros: abre palos y quédate sin cartas.', cargar: () => import('./games/cinquillo/index.js') },
  { id: 'continental', nombre: 'Continental', icono: '🎴', color: '#6A3DF0', categoria: 'cartas', descripcion: '7 rondas con contratos de tríos y escaleras.', cargar: () => import('./games/continental/index.js') },
  { id: 'rosco', nombre: 'El Rosco', icono: '🔵', color: '#1E4FD8', categoria: 'palabras', descripcion: 'Una definición por letra contra el reloj. ¡Pasapalabra!', cargar: () => import('./games/rosco/index.js') },
  { id: 'encadenadas', nombre: 'Encadenadas', icono: '🔗', color: '#12B76A', categoria: 'palabras', descripcion: 'Cada palabra empieza por la última sílaba de la anterior.', cargar: () => import('./games/encadenadas/index.js') },
  { id: 'cifrasletras', nombre: 'Cifras y Letras', icono: '🔠', color: '#1D3A8A', categoria: 'palabras', descripcion: 'La palabra más larga y el número exacto, contra el reloj.', cargar: () => import('./games/cifrasletras/index.js') },
  { id: 'scrabble', nombre: 'Scrabble', icono: '🔡', color: '#B4532A', categoria: 'palabras', descripcion: 'Cruza palabras en el tablero de 15×15 con CH, LL y RR.', cargar: () => import('./games/scrabble/index.js') },
  { id: 'serpiente', nombre: 'Serpiente', icono: '🐍', color: '#4E7CF6', categoria: 'arcade', descripcion: 'Come y crece. 4 modos, récords y podio.', cargar: () => import('./games/serpiente/index.js') },
  { id: 'bloques', nombre: 'Bloques', icono: '🧱', color: '#A24DE0', categoria: 'arcade', descripcion: '4 modos de juego y podio de récords.', cargar: () => import('./games/bloques/index.js') },
  { id: 'ladrillos', nombre: 'Rompe-Ladrillos', icono: '🏓', color: '#FF4757', categoria: 'arcade', descripcion: '12 niveles, premios y editor de niveles propios.', cargar: () => import('./games/ladrillos/index.js') },
  { id: 'airhockey', nombre: 'Air Hockey', icono: '🏒', color: '#1E9BD7', categoria: 'arcade', descripcion: 'Contra la CPU o 2 jugadores en el mismo móvil.', cargar: () => import('./games/airhockey/index.js') },
  { id: 'billar', nombre: 'Billar', icono: '🎱', color: '#1F8A4C', categoria: 'arcade', descripcion: 'Pool 8, Pool 9 y Snooker contra la CPU o entre dos.', cargar: () => import('./games/billar/index.js') },
  { id: 'worms', nombre: 'Worms', icono: '🪱', color: '#E0457B', categoria: 'arcade', descripcion: 'Dos ejércitos de gusanos: bazukas, granadas, cuerda ninja y tumbas. De 3 a 12 por equipo.', cargar: () => import('./games/worms/index.js') },
  { id: 'trivial', nombre: 'Trivial', icono: '🧠', color: '#0FB3C9', categoria: 'palabras', descripcion: 'Preguntas tipo test y definiciones.', cargar: () => import('./games/trivial/index.js') },
  { id: 'parchis',  v1: 'parchis',  nombre: 'Parchís',  icono: '🎲', color: '#2E9E5B', categoria: 'tablero', descripcion: '2 a 4 jugadores o por parejas, personas o CPU.',               cargar: () => import('./games/parchis/index.js') },
  { id: 'magnate', nombre: 'Magnate Tecnológico', icono: '💼', color: '#0E9F8E', categoria: 'tablero', descripcion: 'Compra empresas tecnológicas y arruina a tus rivales.', cargar: () => import('./games/magnate/index.js') },
  { id: 'hotel', nombre: 'Hotel', icono: '🏨', color: '#E0457B', categoria: 'tablero', descripcion: 'El clásico de Milton Bradley: compra terrenos, levanta hoteles por fases, abre entradas y cobra las noches. Tablero 3D.', cargar: () => import('./games/hotel/index.js') },
];

// Juegos agrupados: en Inicio salen como UNA ficha y, al pulsarla, una ventana pregunta a cuál se quiere jugar.
// Cada juego conserva su propio id, su partida guardada y sus estadísticas (no se mezclan).
export const GRUPOS = [
  { id: 'parchis-oca', nombre: 'Parchís y Oca', icono: '🎲', color: '#2E9E5B', categoria: 'tablero', descripcion: 'Dos clásicos de dados: el Parchís y el Juego de la Oca.', juegos: ['parchis', 'oca'] },
  { id: 'ajedrez-damas', nombre: 'Ajedrez y Damas', icono: '♟️', color: '#6B4426', categoria: 'tablero', descripcion: 'Los dos grandes juegos de tablero con fichas.', juegos: ['ajedrez', 'damas'] },
  { id: 'poker', nombre: 'Poker & BlackJack', icono: '♦️', color: '#B02A47', categoria: 'cartas', descripcion: "Texas Hold'em, Póker cubierto o BlackJack contra la banca.", juegos: ['holdem', 'pokercub', 'blackjack'] },
  { id: 'sopa-crucigramas', nombre: 'Sopa y Crucigramas', icono: '🔤', color: '#0FB3C9', categoria: 'palabras', descripcion: 'Sopa de letras o Crucigramas con definiciones.', juegos: ['sopa', 'crucigrama'] },
];
export const grupoDe = id => GRUPOS.find(g => g.juegos.includes(id)) || null;
// Entradas de Inicio de una categoría: fichas sueltas y fichas de grupo (el grupo ocupa el sitio de su primer juego)
export function entradas(cat) {
  const out = [], vistos = new Set();
  for (const j of JUEGOS) {
    if (j.categoria !== cat) continue;
    const g = grupoDe(j.id);
    if (!g) { out.push({ tipo: 'juego', j }); continue; }
    if (vistos.has(g.id)) continue; vistos.add(g.id);
    out.push({ tipo: 'grupo', g, js: g.juegos.map(id => JUEGOS.find(x => x.id === id)) });
  }
  return out;
}

// Juegos planificados (solo se muestran como aviso en Inicio hasta que existan).
export const PROXIMAMENTE = [];
