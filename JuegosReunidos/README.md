# Juegos Reunidos 2.0

Sudoku, Nonogram, Damas, Parchís, 3 en raya, Conecta 4, Sopa de letras, Buscaminas, Crucigramas, BlackJack, Klondike y Texas Hold'em, con estadísticas, ajustes, sonido, tema claro/oscuro, copia de seguridad y modo sin conexión (PWA). Sin compilación: JavaScript con módulos nativos.

## Probarla en local
Los módulos JS **no funcionan con doble clic** (`file://`). En esta carpeta:

    python -m http.server 8000

y abre http://localhost:8000. (Cualquier otro servidor estático vale.)

## Publicarla en GitHub Pages
1. Crea un repositorio y sube **el contenido** de esta carpeta a la raíz.
2. Settings → Pages → Deploy from a branch → `main` / `/ (root)`.
3. Antes de cada publicación ejecuta `python tools/generar_sw.py` (actualiza la caché sin conexión).

## Estructura
    index.html · manifest.webmanifest · sw.js
    css/        base.css (global) · cartas.css (para juegos de cartas)
    icons/      iconos de la app (tools/generar_iconos.py los regenera)
    js/app.js        rutas (#/juego/<id>), inicio, estadísticas, ajustes, importar/exportar
    js/registry.js   LISTA DE JUEGOS: aquí se da de alta cada juego nuevo
    js/core/         aspectos (apariencia), dom, storage, ajustes, stats, sonido, undo, cronometro, cartas, ia/minimax,
                     duelo (controlador de juegos de 2 jugadores: marcador, CPU, deshacer, pista, guardado)
    js/games/<id>/   index.js + (reglas/generador/ia) + <id>.css de cada juego
    js/games/_plantilla/   punto de partida para un juego nuevo
    data/            palabras/ · crucigramas/ · nonogramas/ (contenido de los juegos)
    tools/           generar_sw.py · generar_iconos.py · verificar_nonogramas.mjs
    tests/motores.mjs   pruebas de los motores:  node tests/motores.mjs
    docs/            AÑADIR-JUEGO.md · MEJORAS-INCLUIDAS.md · HOJA-DE-RUTA.md

## Guardado
Una clave de localStorage por juego (`jr2:juego:<id>`, versión 2). Tus partidas de la versión 1 (`juegos-reunidos-save`) se migran solas la primera vez; la clave antigua no se borra. Los archivos .json exportados de la versión 1 también se pueden importar.
