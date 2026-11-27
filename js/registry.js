// Registro de juegos. Para añadir uno: crea js/games/<id>/index.js y añade una línea aquí.
// Los módulos se cargan solo al abrir el juego (import dinámico).
export const CATEGORIAS = { logica: 'Lógica', tablero: 'Estrategia', cartas: 'Cartas', palabras: 'Palabras', arcade: 'Arcade' };

export const JUEGOS = [
  { id: 'sudoku',   v1: 'sudoku',   nombre: 'Sudoku',   icono: '🔢', color: '#2B6CB0', categoria: 'logica',  descripcion: '4 niveles por técnica, notas y reto del día.', cargar: () => import('./games/sudoku/index.js') },
  { id: 'nonogram', v1: 'nonogram', nombre: 'Nonogram', icono: '🖼️', color: '#F2B84B', categoria: 'logica',  descripcion: 'Pinta y descubre el dibujo. Reto del día.',       cargar: () => import('./games/nonogram/index.js') },
  { id: 'damas',    v1: 'damas',    nombre: 'Damas',    icono: '👑', color: '#D6453D', categoria: 'tablero', descripcion: '4 reglamentos, hasta el internacional 10×10.',    cargar: () => import('./games/damas/index.js') },
  { id: 'domino', nombre: 'Dominó', icono: '🁣', color: '#2F7D5B', categoria: 'tablero', descripcion: 'Clásico, bloqueo, de a cinco y por parejas. 2–4 jugadores, doble 6 o 9.', cargar: () => import('./games/domino/index.js') },
  { id: 'tresenraya', nombre: '3 en raya', icono: '⭕', color: '#7A5BC7', categoria: 'tablero', descripcion: '4 tableros y series al mejor de 3 o 5.', cargar: () => import('./games/tresenraya/index.js') },
  { id: 'cuatroenlinea', nombre: 'Cuatro en Línea', icono: '🔴', color: '#E5622B', categoria: 'tablero', descripcion: '4 tableros, hasta Cinco en Línea. Pista y marcador.', cargar: () => import('./games/cuatroenlinea/index.js') },
  { id: 'sopaletras', nombre: 'Sopa de letras', icono: '🔤', color: '#0FB3C9', categoria: 'palabras', descripcion: '11 temas, 3 niveles y reto del día.', cargar: () => import('./games/sopaletras/index.js') },
  { id: 'bombardeo', nombre: 'Bombardeo', icono: '💣', color: '#E0356E', categoria: 'logica', descripcion: 'Sin adivinar, personalizado y reto del día.', cargar: () => import('./games/bombardeo/index.js') },
  { id: 'crucigramas', nombre: 'Crucigramas', icono: '🧩', color: '#8B5CF6', categoria: 'palabras', descripcion: '10 temas con definiciones y reto del día.', cargar: () => import('./games/crucigramas/index.js') },
  { id: 'blackjack', nombre: 'BlackJack', icono: '🃏', color: '#12A05C', categoria: 'cartas', descripcion: 'Consejo de estrategia y contador Hi-Lo.', cargar: () => import('./games/blackjack/index.js') },
  { id: 'mahjong', nombre: 'Mahjong', icono: '🀄', color: '#1F8A6B', categoria: 'cartas', descripcion: 'Quita parejas de fichas libres hasta despejar el tablero. Con solución.', cargar: () => import('./games/mahjong/index.js') },
  { id: 'klondike', nombre: 'Klondike', icono: '♠️', color: '#1F8A5B', categoria: 'cartas', descripcion: 'Siempre con solución y modo Vegas.', cargar: () => import('./games/klondike/index.js') },
  { id: 'spider', nombre: 'Spider', icono: '🕷️', color: '#7A3FB0', categoria: 'cartas', descripcion: 'Solitario de 104 cartas: forma 8 series de K a A. Con 1, 2 o 4 palos.', cargar: () => import('./games/spider/index.js') },
  { id: 'cartablanca', nombre: 'Carta Blanca', icono: '🃏', color: '#2B7A9B', categoria: 'cartas', descripcion: 'FreeCell: 4 casillas libres, todas las cartas a la vista y siempre con solución.', cargar: () => import('./games/cartablanca/index.js') },
  { id: 'holdem', nombre: "Texas Hold'em", icono: '♦️', color: '#B02A47', categoria: 'cartas', descripcion: 'Torneo o partida libre contra bots.', cargar: () => import('./games/holdem/index.js') },
  { id: 'pokercubierto', nombre: 'Póker cubierto', icono: '♣️', color: '#7B3FC4', categoria: 'cartas', descripcion: 'Cinco cartas tapadas, descarte y dos rondas de apuestas.', cargar: () => import('./games/pokercubierto/index.js') },
  { id: 'corazones', nombre: 'Corazones', icono: '❤️', color: '#D63A5E', categoria: 'cartas', descripcion: 'Evita los corazones y la dama de picas… o llévatelos todos.', cargar: () => import('./games/corazones/index.js') },
  { id: 'calcudoku', nombre: 'Calcudoku', icono: '➗', color: '#7A4DFF', categoria: 'logica', descripcion: 'Sudoku con operaciones. Reto del día.', cargar: () => import('./games/calcudoku/index.js') },
  { id: 'akari', nombre: 'Akari', icono: '💡', color: '#E8A317', categoria: 'logica', descripcion: 'Ilumina todo el tablero con bombillas sin que se vean entre sí. 3 niveles.', cargar: () => import('./games/akari/index.js') },
  { id: 'futoshiki', nombre: 'Futoshiki', icono: '🔢', color: '#C98A1B', categoria: 'logica', descripcion: 'Sudoku con flechas de desigualdad. 3 niveles, 5 tamaños y reto del día.', cargar: () => import('./games/futoshiki/index.js') },
  { id: 'crucisumas', nombre: 'CruciSumas', icono: '➕', color: '#3A7BD5', categoria: 'logica', descripcion: 'Crucigrama de sumas. 3 tamaños, 3 niveles y reto del día.', cargar: () => import('./games/crucisumas/index.js') },
  { id: 'encajados', nombre: 'Encajados', icono: '📦', color: '#C47A2C', categoria: 'logica', descripcion: 'Empuja las cajas a su sitio. 20 niveles y generados.', cargar: () => import('./games/encajados/index.js') },
  { id: 'deslizadas', nombre: 'Deslizadas', icono: '🧩', color: '#E0553D', categoria: 'logica', descripcion: 'Bloques deslizantes o fichas con números. Varios tableros y 4 niveles.', cargar: () => import('./games/deslizadas/index.js') },
  { id: 'codigocifrado', nombre: 'Código Cifrado', icono: '🔴', color: '#7B4DD8', categoria: 'logica', descripcion: 'Descifra el código de colores con pistas negras y blancas. 4 niveles.', cargar: () => import('./games/codigocifrado/index.js') },
  { id: 'puenteshashi', nombre: 'Puentes Hashi', icono: '🌉', color: '#1FA7B8', categoria: 'logica', descripcion: 'Une las islas con puentes sin cruzarlos. 5 niveles y reto del día.', cargar: () => import('./games/puenteshashi/index.js') },
  { id: 'matchup', nombre: 'Match-Up', icono: '🃏', color: '#E8604C', categoria: 'logica', descripcion: 'Encuentra las parejas: solo, 2 jugadores o contra la máquina.', cargar: () => import('./games/matchup/index.js') },
  { id: 'ruletamillonaria', nombre: 'Ruleta Millonaria', icono: '🎡', color: '#F59E0B', categoria: 'palabras', descripcion: 'Gira, di consonantes, compra vocales y resuelve.', cargar: () => import('./games/ruletamillonaria/index.js') },
  { id: 'elahorcado', nombre: 'El Ahorcado', icono: '🪢', color: '#E5622B', categoria: 'palabras', descripcion: '4 niveles, pistas y modo 2 jugadores.', cargar: () => import('./games/elahorcado/index.js') },
  { id: 'daleotravez', nombre: 'Dale Otra Vez', icono: '🎤', color: '#D94F70', categoria: 'palabras', descripcion: 'Di respuestas de un tema sin repetir antes de que se acabe el tiempo.', cargar: () => import('./games/daleotravez/index.js') },
  { id: 'brisca', nombre: 'Brisca', icono: '🂡', color: '#C2410C', categoria: 'cartas', descripcion: 'Baraja española: 2, 3 o 4 jugadores en parejas.', cargar: () => import('./games/brisca/index.js') },
  { id: 'ajedrez', nombre: 'Ajedrez', icono: '♟️', color: '#6B4426', categoria: 'tablero', descripcion: 'Reloj, PGN, revisión y CPU de 3 niveles.', cargar: () => import('./games/ajedrez/index.js') },
  { id: 'chinchon', nombre: 'Chinchón', icono: '🀄', color: '#0E7C66', categoria: 'cartas', descripcion: 'Baraja española: liga, cierra y busca el chinchón.', cargar: () => import('./games/chinchon/index.js') },
  { id: 'mus', nombre: 'Mus', icono: '🤝', color: '#B3182B', categoria: 'cartas', descripcion: 'Por parejas: grande, chica, pares, juego y órdago.', cargar: () => import('./games/mus/index.js') },
  { id: 'quecaratienes', nombre: '¿Qué Cara Tienes?', icono: '🧐', color: '#E0553D', categoria: 'tablero', descripcion: 'Adivina la cara del rival. 30 caras, CPU o 2 jugadores.', cargar: () => import('./games/quecaratienes/index.js') },
  { id: 'batallanaval', nombre: 'Batalla Naval', icono: '🚢', color: '#1B4FA8', categoria: 'tablero', descripcion: '6 flotas, de Relámpago 6×6 a Gran armada 12×12.', cargar: () => import('./games/batallanaval/index.js') },
  { id: 'rummy', nombre: 'Rummy', icono: '🀄', color: '#E0243A', categoria: 'tablero', descripcion: 'Grupos y escaleras de fichas: reorganiza la mesa y quédate sin fichas.', cargar: () => import('./games/rummy/index.js') },
  { id: 'juegodelaoca', nombre: 'Juego de la Oca', icono: '🦢', color: '#7CA83A', categoria: 'tablero', descripcion: 'De oca a oca y tiro porque me toca. De 2 a 4 jugadores.', cargar: () => import('./games/juegodelaoca/index.js') },
  { id: 'hijoputa', nombre: 'Hijoputa', icono: '🃏', color: '#C0392B', categoria: 'cartas', descripcion: 'Mau-Mau con baraja española: sota comodín, 2 acumulable y grito final.', cargar: () => import('./games/hijoputa/index.js') },
  { id: 'cinquillo', nombre: 'Cinquillo', icono: '5️⃣', color: '#C0392B', categoria: 'cartas', descripcion: 'Empieza el 5 de oros: abre palos y quédate sin cartas.', cargar: () => import('./games/cinquillo/index.js') },
  { id: 'continental', nombre: 'Continental', icono: '🎴', color: '#6A3DF0', categoria: 'cartas', descripcion: '7 rondas con contratos de tríos y escaleras.', cargar: () => import('./games/continental/index.js') },
  { id: 'elrosco', nombre: 'El Rosco', icono: '🔵', color: '#1E4FD8', categoria: 'palabras', descripcion: 'Una definición por letra contra el reloj. ¡Paso la cabra!', cargar: () => import('./games/elrosco/index.js') },
  { id: 'encadenadas', nombre: 'Encadenadas', icono: '🔗', color: '#12B76A', categoria: 'palabras', descripcion: 'Cada palabra empieza por la última sílaba de la anterior.', cargar: () => import('./games/encadenadas/index.js') },
  { id: 'numerosyletras', nombre: 'Números y Letras', icono: '🔠', color: '#1D3A8A', categoria: 'palabras', descripcion: 'La palabra más larga y el número exacto, contra el reloj.', cargar: () => import('./games/numerosyletras/index.js') },
  { id: 'palabrascruzadas', nombre: 'Palabras Cruzadas', icono: '🔡', color: '#B4532A', categoria: 'palabras', descripcion: 'Cruza palabras en el tablero de 15×15 con CH, LL y RR.', cargar: () => import('./games/palabrascruzadas/index.js') },
  { id: 'serpiente', nombre: 'Serpiente', icono: '🐍', color: '#4E7CF6', categoria: 'arcade', descripcion: 'Come y crece. 4 modos, récords y podio.', cargar: () => import('./games/serpiente/index.js') },
  { id: 'vuelaalto', nombre: 'Vuela Alto', icono: '🐦', color: '#2CB5E8', categoria: 'arcade', descripcion: 'Mantén pulsado para subir. Niveles e Infinito.', cargar: () => import('./games/vuelaalto/index.js') },
  { id: 'pinball', nombre: 'Pinball', icono: '🎱', color: '#1F7A8C', categoria: 'arcade', descripcion: 'Lanza la bola, golpea con las aletas y enciende los 5 bumpers. 3 o 5 bolas.', cargar: () => import('./games/pinball/index.js') },
  { id: 'quantix', nombre: 'Quantix', icono: '💠', color: '#7C4DFF', categoria: 'arcade', descripcion: 'Desliza cuadrados y descubre la imagen.', cargar: () => import('./games/quantix/index.js') },
  { id: 'bloques', nombre: 'Bloques', icono: '🧱', color: '#A24DE0', categoria: 'arcade', descripcion: '4 modos de juego y podio de récords.', cargar: () => import('./games/bloques/index.js') },
  { id: 'catapulta', nombre: 'Catapulta', icono: '🪃', color: '#E8453C', categoria: 'arcade', descripcion: 'Derriba fortalezas con 6 avatares, 4 materiales y 50 niveles.', cargar: () => import('./games/catapulta/index.js') },
  { id: 'rompeladrillos', nombre: 'Rompe-Ladrillos', icono: '🏓', color: '#FF4757', categoria: 'arcade', descripcion: '12 niveles, premios y editor de niveles propios.', cargar: () => import('./games/rompeladrillos/index.js') },
  { id: 'airhockey', nombre: 'Air Hockey', icono: '🏒', color: '#1E9BD7', categoria: 'arcade', descripcion: 'Contra la CPU o 2 jugadores en el mismo móvil.', cargar: () => import('./games/airhockey/index.js') },
  { id: 'billar', nombre: 'Billar', icono: '🎱', color: '#1F8A4C', categoria: 'arcade', descripcion: 'Pool 8, Pool 9 y Snooker contra la CPU o entre dos.', cargar: () => import('./games/billar/index.js') },
  { id: 'guerraorugas', nombre: 'Guerra de Orugas', icono: '🪱', color: '#E0457B', categoria: 'arcade', descripcion: 'Dos ejércitos de gusanos: bazukas, granadas y cuerda gancho. De 3 a 12.', cargar: () => import('./games/guerraorugas/index.js') },
  { id: 'triviaquesitos', nombre: 'Trivia Quesitos', icono: '🧠', color: '#0FB3C9', categoria: 'palabras', descripcion: 'Preguntas tipo test y definiciones.', cargar: () => import('./games/triviaquesitos/index.js') },
  { id: 'partxis',  v1: 'parchis',  nombre: 'Partxis',  icono: '🎲', color: '#2E9E5B', categoria: 'tablero', descripcion: '2 a 4 jugadores o por parejas, personas o CPU.',               cargar: () => import('./games/partxis/index.js') },
  { id: 'magnateurbano', nombre: 'Aeropuerto', icono: '✈️', color: '#2E9BF0', categoria: 'tablero', descripcion: 'Compra destinos de todo el mundo, mejora tus vuelos y arruina a tus rivales.', cargar: () => import('./games/magnateurbano/index.js') },
  { id: 'bingolive', nombre: 'Bingo Live', icono: '🎱', color: '#E8453C', categoria: 'arcade', descripcion: 'Bingo de 90 bolas para sala, con bombo en 3D y bolas cantadas con voz.', cargar: () => import('./games/bingolive/index.js') },
  { id: 'bingomobile', nombre: 'Bingo Mobile', icono: '📱', color: '#E8453C', categoria: 'arcade', descripcion: 'Bingo de 90 bolas en el móvil: tus cartones en 3D, CPU, fichas y apuestas.', cargar: () => import('./games/bingomobile/index.js') },
  { id: 'hotel', nombre: 'Hotel', icono: '🏨', color: '#E0457B', categoria: 'tablero', descripcion: 'Compra terrenos, levanta hoteles por fases y cobra las noches. Tablero 3D.', cargar: () => import('./games/hotel/index.js') },
];

// Juegos agrupados: en Inicio salen como UNA ficha y, al pulsarla, una ventana pregunta a cuál se quiere jugar.
// Cada juego conserva su propio id, su partida guardada y sus estadísticas (no se mezclan).
// Ya no hay fichas compartidas: cada juego tiene la suya. (Se conserva el mecanismo por si se vuelve a agrupar.)
export const GRUPOS = [
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
