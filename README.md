# Juegos Reunidos 3.4

39 juegos en 5 categorías: Sudoku, Nonogram, Buscaminas, KenKen, Kakuro, Sokoban (Lógica) · Damas, Ajedrez, Hundir la Flota, Rummy de fichas, Juego de la Oca, Parchís, Magnate Tecnológico, 3 en raya, Conecta 4, Trivial (Tablero) · BlackJack, Klondike, Texas Hold'em, Póker cubierto, Corazones, Brisca, Chinchón, Mus, Cinquillo, Continental (Cartas) · Sopa de letras, Crucigramas, El Ahorcado, Ruleta de la Suerte, El Rosco, Encadenadas, Cifras y Letras, Scrabble (Palabras) · Serpiente, Bloques, Rompe-Ladrillos, Air Hockey y Billar (Arcade).

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
    docs/            ANADIR-JUEGO.md · MEJORAS-INCLUIDAS.md · HOJA-DE-RUTA.md · AUDITORIA.md

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

**Magnate Tecnológico · 🎨 Apariencia:** cada casilla de empresa tiene la banda de color dividida en 4 huecos (2×2) para las oficinas, y la sede central ocupa los 4. Se puede elegir «Tu personaje» (los personajes de Sokoban, comunes en `js/core/personajes.js`) para el jugador 1 y el par de iconos de oficina/sede (casas y hotel, oficinas, obreros, técnicos, astronautas o cajas).

**🎨 Apariencia · Fondo de Tablero y Personajes:** todos los juegos que no son de cartas tienen «Fondo de Tablero» (los 12 tapetes de `img/cartas/tapetes/`, o 🎲 aleatorio; por defecto «Sin fondo»). Los juegos de canvas (Air Hockey, Ladrillos, Bloques, Serpiente) pintan el tapete con `imagenTapete` + `pintarTapete` (`js/core/cartas.js`); el resto lo pone una regla CSS detrás del tablero (`grupoFondo('selector')` en `js/core/aspectos.js`). «Personajes» (los de Sokoban, `js/core/personajes.js`) está en Serpiente (cabeza), Rompe-Ladrillos (bola), Air Hockey (tu mazo), Parchís, Oca, Damas, Conecta 4, 3 en raya y Trivial (tus fichas), Sokoban y Magnate.

**Scrabble:** tablero de 15 × 15 y las 100 fichas del Scrabble en español (CH, LL y RR son una ficha; no hay K ni W; 2 comodines). De 2 a 4 jugadores, contra la CPU (3 niveles) o entre personas en el mismo móvil (las fichas se tapan entre turnos). Las palabras se comprueban con el diccionario común en un Worker (`js/games/scrabble/trabajador.js`), que también calcula la jugada de la CPU y la 💡 Pista. 🎨 Apariencia: Fondo de Tablero (todos los tapetes, 🎲 aleatorio por defecto), 6 tableros, 7 colores de fichas y rótulos de las casillas de premio. Motor sin DOM en `motor.js` (con pruebas en `tests/motores.mjs`).

**Billar:** la mesa tiene tamaño fijo y cabe de alto en la pantalla, con margen a los lados para hacer scroll fuera de ella; los controles de tiro (giro fino, fuerza y Tirar) flotan y se arrastran desde su asa a una zona sin bolas (la posición se recuerda); debajo de la mesa está la caja de bolas metidas y, en Pool 8, cada jugador lleva el icono de su grupo (lisas o rayadas) desde la primera bola que entra.

**Billar · 🎨 Apariencia:** color del tapete, tapete de imagen (los de `img/cartas/tapetes/`, encima del color), bandas de madera, colores de las bolas (en Pool; en Snooker los colores son los del reglamento) y 4 tacos.

## Versión
La versión está en `js/version.js` y se ve al pie de ⚙️ Ajustes. Al publicar cambios, sube el número allí y añade una línea aquí.
Formato MAYOR.MENOR.PARCHE: MAYOR = cambios grandes en toda la app · MENOR = juegos o funciones nuevas · PARCHE = arreglos.

## Historial de versiones
| Versión | Fecha | Cambios |
|---|---|---|
| **3.4.0** | 23/10/2026 | 🔡 **Scrabble** (Palabras, juego 39): tablero clásico de premios, 100 fichas en español con CH/LL/RR y comodines, de 2 a 4 jugadores contra la CPU (Fácil, Medio, Difícil) o entre personas, vista previa de palabras y puntos antes de jugar, pista, cambiar fichas, historial de jugadas y 🎨 Apariencia (fondo con todos los tapetes, tablero, fichas y rótulos). |
| 3.3.1 | 23/10/2026 | 🎱 Billar: la mesa se ajusta al alto de la pantalla (debajo de la barra superior) en vez de al ancho, y deja margen a los lados para hacer scroll con el dedo fuera de la mesa. Al empezar, la página se coloca sola con la mesa entera a la vista. |
| 3.3.0 | 23/10/2026 | 🎱 **Billar**: mesa más grande y de tamaño fijo (casi todo el ancho de la pantalla; ya no encoge al hacer scroll en el móvil), bolas más grandes con números y rayas más claros, controles de tiro flotantes que se arrastran a cualquier sitio (📍 Recolocar controles), caja de 🧺 bolas metidas bajo la mesa e icono de lisas/rayadas junto a cada jugador en cuanto entra la primera bola (también en el saque). Arreglo: al acabar la partida no se apuntaba en estadísticas y «Otra partida» salía desactivado. Limpieza: fuera la carpeta del antiguo Minigolf y las copias de la guía con «Ñ» mal codificada. |
| 3.2.0 | 22/10/2026 | 🔠 **Cifras y Letras** (Palabras): rondas de letras con el diccionario de LibreOffice y de cifras con solución calculada, contra la CPU (3 niveles) o en solitario, reto del día y tapetes de fondo (🎲 aleatorio por defecto). |
| 3.1.0 | 19/10/2026 | 🎱 **Billar** (Pool 8, Pool 9 y Snooker de 6 rojas, contra la CPU o 2 jugadores) sustituye al Minigolf. Número de versión al pie de Ajustes. Guía `docs/ANADIR-JUEGO.md` sin «Ñ» en el nombre. |
| 3.0.0 | 10/2026 | Nueva 🎨 Apariencia: cada categoría en su propia ventana, tapetes de imagen, dorsos y barajas aleatorios, «Fondo de Tablero» y «Personajes» en todos los juegos; iconos de oficinas/sede elegibles en Magnate. |
| 2.6.0 | 10/2026 | Corazones, Kakuro, Sokoban, Póker cubierto y Air Hockey. Diccionario español (LibreOffice). |
| 2.5.0 | 10/2026 | Magnate Tecnológico. Menú superior por categorías, fichas 3:2 y estadísticas por categoría. |
| 2.0.0 | 10/2026 | Auditoría completa: logros, reto del día, podio, compartir, IA en segundo plano, mejoras en todos los juegos. |
