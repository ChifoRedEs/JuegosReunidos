# Hoja de ruta (un juego por sesión)

Cada paso = una carpeta nueva en `js/games/` + una línea en `registry.js`. Ver `AÑADIR-JUEGO.md`.

**Hecho:** Sudoku, Nonogram, Damas, Parchís, 3 en raya (4 tableros), Conecta 4 (4 tableros).

1. **Sopa de letras** (listas en `data/palabras/*.json`; selección arrastrando) y **Buscaminas**.
2. **BlackJack** (estrena `core/cartas.js` + `css/cartas.css`).
3. **Klondike** (arrastrar cartas con pointer events).
4. **Crucigramas libres** desde bancos palabra + definición en `data/crucigramas/*.json`.
5. **Texas Hold'em** contra bots (evaluador, apuestas con botes secundarios, bots en Web Worker).
6. Extras: Wordle en español, Mastermind, Hundir la flota, 2048, Oca, Dominó, Reversi (usa `core/duelo.js`).

El multijugador online no es posible con GitHub Pages (solo archivos estáticos).
