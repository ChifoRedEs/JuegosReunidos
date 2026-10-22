# Juegos Reunidos 2.0

37 juegos en 5 categorías: Sudoku, Nonogram, Buscaminas, KenKen, Kakuro, Sokoban (Lógica) · Damas, Ajedrez, Hundir la Flota, Rummy de fichas, Juego de la Oca, Parchís, Magnate Tecnológico, 3 en raya, Conecta 4, Trivial (Tablero) · BlackJack, Klondike, Texas Hold'em, Póker cubierto, Corazones, Brisca, Chinchón, Mus, Cinquillo, Continental (Cartas) · Sopa de letras, Crucigramas, El Ahorcado, Ruleta de la Suerte, El Rosco, Encadenadas (Palabras) · Serpiente, Bloques, Rompe-Ladrillos, Air Hockey y Minigolf (Arcade).

Con estadísticas, 🏅 logros, 📅 reto del día, 🏆 podio de los 10 mejores en los arcade, compartir resultado, ajustes, sonido, tema claro/oscuro, copia de seguridad y modo sin conexión (PWA). Sin compilación: JavaScript con módulos nativos.

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
    img/cartas/ imágenes de barajas (espanola/ · francesa/) y dorsos (dorsos/) para 🎨 Apariencia; ver img/cartas/LEEME.md
    icons/      iconos de la app (tools/generar_iconos.py los regenera)
    js/app.js        rutas (#/cat/<categoría>, #/juego/<id>, #/stats, #/ajustes), menú superior, estadísticas por categoría, logros, ajustes, importar/exportar
    js/registry.js   LISTA DE JUEGOS: aquí se da de alta cada juego nuevo
    js/core/         aspectos (apariencia), dom, storage, ajustes, stats, sonido, undo, cronometro, cartas, teclado (teclado emergente arrastrable),
                     duelo (controlador de juegos de 2 jugadores: marcador, series, CPU, deshacer, pista, guardado),
                     ia/minimax + ia/remoto + ia/trabajador (la IA piensa en un Worker sin congelar la pantalla),
                     logros, semilla (reto del día con el mismo tablero para todos), historial (manos y partidas de los juegos de cartas), arrastrar
    js/games/<id>/   index.js + (reglas/generador/ia) + <id>.css de cada juego
    js/games/_plantilla/   punto de partida para un juego nuevo
    data/diccionario/ diccionario español para los juegos de palabras (lo genera tools/generar_diccionario.py; ver su LEEME.md)
    data/nonogramas/ fuentes.txt (dibujos hechos a mano) → pixelart.json (lo genera tools/verificar_nonogramas.mjs)
    tools/           generar_sw.py · generar_barajas.py · optimizar_imagenes.py · generar_iconos.py · verificar_nonogramas.mjs
    tests/motores.mjs   pruebas de los motores:  node tests/motores.mjs
    docs/            AÑADIR-JUEGO.md · MEJORAS-INCLUIDAS.md · HOJA-DE-RUTA.md · AUDITORIA.md

## Guardado
Una clave de localStorage por juego (`jr2:juego:<id>`, versión 2), más `jr2:indice` (resumen ligero de cada partida para el Inicio), `jr2:stats`, `jr2:ajustes`, `jr2:logros`, `jr2:retos` y `jr2:podio:<id>`. Todo entra en la copia de seguridad. Si el almacenamiento se llena, la app avisa. Tus partidas de la versión 1 (`juegos-reunidos-save`) se migran solas la primera vez; la clave antigua no se borra. Los archivos .json exportados de la versión 1 también se pueden importar.

## Barajas e imágenes de cartas
En 🎨 Apariencia de los juegos de cartas se puede elegir una baraja de imágenes (española: Brisca, Chinchón, Mus, Cinquillo · francesa: BlackJack, Klondike, Hold'em, Continental) un dorso de imagen y un tapete (fondo de mesa). En 🎨 Apariencia de todos los juegos cada categoría (Tapetes, Dorsos, Escenario, Cajas, Personaje…) es un enlace que abre su propia ventana con las opciones; solo los ajustes de dos opciones (sí/no) se quedan a la vista. Por defecto los tres son aleatorios (🎲): cambian al abrir el juego y en cada partida nueva.
Sube las imágenes a `img/cartas/espanola/<MAZO>/`, `img/cartas/francesa/<MAZO>/` o `img/cartas/dorsos/` (nombres y formato en `img/cartas/LEEME.md`).
GitHub Actions regenera solo `img/cartas/barajas.json` y `sw.js`; en local: `python tools/generar_barajas.py && python tools/generar_sw.py`.
Las imágenes van a 240 px de ancho en WebP calidad 78 (`tools/optimizar_imagenes.py`). En segundo plano solo se guardan sin conexión las barajas y el dorso elegidos (y nunca con «Ahorro de datos»); el resto se guarda al usarlo.

## Comodines (Continental y Chinchón)
Al repartir hay un check «Jugar con comodines». Continental: 3 comodines con 2 o 3 jugadores, 4 con 4 (activado por defecto). Chinchón: 2 con 2 o 3 jugadores, 3 con 4 (desactivado por defecto).
El comodín usa la imagen `00` de la baraja elegida (si existe en `img/cartas/...`) y, si no, se dibuja.
