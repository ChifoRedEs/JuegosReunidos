# Hoja de ruta

**Hecho (44 juegos):** Sudoku, Nonogram, Buscaminas, KenKen, Kakuro, Sokoban, Klotski, Mastermind, Memorama · Damas, Ajedrez, Hundir la Flota, Rummy de fichas, Juego de la Oca, Parchís, Magnate Tecnológico, Hotel (reglas reales, 3D), 3 en raya, Conecta 4, Trivial · BlackJack, Klondike, Texas Hold'em, Póker cubierto, Corazones, Brisca, Chinchón, Mus, Cinquillo, Continental · Sopa de letras, Crucigramas, El Ahorcado, Ruleta de la Suerte, El Rosco, Encadenadas, Cifras y Letras, Scrabble · Serpiente, Bloques, Rompe-Ladrillos, Air Hockey, Billar y Worms.

Ideas para seguir (cada una = una carpeta nueva en `js/games/` + una línea en `registry.js`, ver `ANADIR-JUEGO.md`):
1. **Lógica:** Takuzu (Binairo), 2048. (Klotski y Mastermind ya están hechos.)
2. **Tablero:** Reversi y Molino (encajan en `core/duelo.js`), Mancala, Dominó, Backgammon.
3. **Cartas:** Tute, Escoba, Siete y media, Solitario Spider.
4. **Palabras:** Wordle en español, Boggle, Colmena. (Scrabble ya está hecho; falta Worms en Arcade para llegar a los 40.)
5. **Arcade:** Invasores espaciales, Comecocos, Asteroides, Cruza la carretera, Pong.

**Vista 3D (Three.js)** ya disponible en Hotel, Ajedrez, Damas, Parchís, Oca, Magnate, Hundir la Flota, Billar y Ruleta (ver `ANADIR-JUEGO.md`). Hecho también en «mejora media»: Sokoban (cajas 3D), Rummy (fichas con relieve), Texas Hold'em y Póker cubierto (mesa de cartas 3D) y efectos de explosión en Worms. Pendiente: Dominó y Mahjong (aún no existen como juegos).

Pendiente técnico: alojar las fuentes (Baloo 2 y Nunito) en el propio repositorio para no depender de Google Fonts.
El multijugador online no es posible con GitHub Pages (solo archivos estáticos).
