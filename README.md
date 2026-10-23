# Juegos Reunidos 3.4

41 juegos (37 fichas, con cuatro parejas agrupadas) en 5 categorías: Sudoku, Nonogram, Buscaminas, KenKen, Kakuro, Sokoban (Lógica) · Damas, Ajedrez, Hundir la Flota, Rummy de fichas, Juego de la Oca, Parchís, Magnate Tecnológico, Hotel (tablero 3D), 3 en raya, Conecta 4, Trivial (Tablero) · BlackJack, Klondike, Texas Hold'em, Póker cubierto, Corazones, Brisca, Chinchón, Mus, Cinquillo, Continental (Cartas) · Sopa de letras, Crucigramas, El Ahorcado, Ruleta de la Suerte, El Rosco, Encadenadas, Cifras y Letras, Scrabble (Palabras) · Serpiente, Bloques, Rompe-Ladrillos, Air Hockey, Billar y Worms (Arcade).

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

**Hotel (reglas del juego de mesa):** `hotel/datos.js` (8 hoteles con precios de 1986, camino de 48 casillas, terrenos, anclajes de edificios), `motor.js` (reglas puras: estado JSON, `decidir(S, decisión)` que devuelve eventos para animar, `legales(S)` y `cpuDecide(S)`), `vista3d.js` (Three.js, 8 estilos de hotel) y `vista2d.js` (SVG de respaldo con la misma API). Las pruebas (`node tests/hotel.mjs`) simulan partidas completas de CPU y comprueban invariantes. Simplificaciones: no se implementa el «robo» de entradas a un hotel opuesto y el trazado del camino es propio.

**Magnate Tecnológico · 🎨 Apariencia:** cada casilla de empresa tiene la banda de color dividida en 4 huecos (2×2) para las oficinas, y la sede central ocupa los 4. Se puede elegir «Tu personaje» (los personajes de Sokoban, comunes en `js/core/personajes.js`) para el jugador 1 y el par de iconos de oficina/sede (casas y hotel, oficinas, obreros, técnicos, astronautas o cajas).

**🎨 Apariencia · Fondo de Tablero y Personajes:** todos los juegos que no son de cartas tienen «Fondo de Tablero» (los 20 tapetes de `img/cartas/tapetes/` (incluidos los 8 escenarios de Worms), o 🎲 aleatorio; por defecto «Sin fondo»). Los juegos de canvas (Air Hockey, Ladrillos, Bloques, Serpiente) pintan el tapete con `imagenTapete` + `pintarTapete` (`js/core/cartas.js`); el resto lo pone una regla CSS detrás del tablero (`grupoFondo('selector')` en `js/core/aspectos.js`). «Personajes» (los de Sokoban, `js/core/personajes.js`) está en Serpiente (cabeza), Rompe-Ladrillos (bola), Air Hockey (tu mazo), Parchís, Oca, Damas, Conecta 4, 3 en raya y Trivial (tus fichas), Sokoban y Magnate.

**Scrabble:** tablero de 15 × 15 y las 100 fichas del Scrabble en español (CH, LL y RR son una ficha; no hay K ni W; 2 comodines). De 2 a 4 jugadores, contra la CPU (3 niveles) o entre personas en el mismo móvil (las fichas se tapan entre turnos). Las palabras se comprueban con el diccionario común en un Worker (`js/games/scrabble/trabajador.js`), que también calcula la jugada de la CPU y la 💡 Pista. 🎨 Apariencia: Fondo de Tablero (todos los tapetes, 🎲 aleatorio por defecto), 6 tableros, 7 colores de fichas y rótulos de las casillas de premio. Motor sin DOM en `motor.js` (con pruebas en `tests/motores.mjs`).

**Billar:** la mesa tiene tamaño fijo y cabe de alto en la pantalla, con margen a los lados para hacer scroll fuera de ella; los controles de tiro (giro fino, fuerza y Tirar) flotan y se arrastran desde su asa a una zona sin bolas (la posición se recuerda); debajo de la mesa está la caja de bolas metidas y, en Pool 8, cada jugador lleva el icono de su grupo (lisas o rayadas) desde la primera bola que entra.

**Worms (Arcade, juego 40):** dos ejércitos de gusanos por turnos, de 3, 6, 9 o 12 por equipo, contra la CPU (3 niveles) o 2 jugadores en el mismo dispositivo. Terreno 100 % destructible (cuatro mapas: Colinas, Montañas, Cuevas e Islas), viento, agua que sube a partir de la ronda 9 y cajas de suministros con paracaídas (vida o armas). Se anda por relieve, se salta hacia delante y hacia arriba, y hay **Cuerda Ninja** (colgarse, balancearse, subir y bajar) y **Teletransporte** (limitado). Armas: Lanzamisiles, Escopeta, Granadas (Explosiva, de Racimo y Sagrada), Dinamita, Ataque Aéreo. Al morir un gusano deja una **tumba** en su sitio que también se destruye. Cámara con zoom y arrastre, controles táctiles y de teclado, guardado de partida (solo la semilla del mapa y la lista de cráteres). 🎨 Apariencia: **Escenario** (los 8 tapetes de Worms, que además colorean el terreno) y **Personajes** para cada equipo. Motor en `motor.js` y CPU en `ia.js` (sin DOM, probados con `node tests/worms.mjs`).

**Billar · 🎨 Apariencia:** color del tapete, tapete de imagen (los de `img/cartas/tapetes/`, encima del color), bandas de madera, colores de las bolas (en Pool; en Snooker los colores son los del reglamento) y 4 tacos.

## Versión
La versión está en `js/version.js` y se ve al pie de ⚙️ Ajustes. Al publicar cambios, sube el número allí y añade una línea aquí.
Formato MAYOR.MENOR.PARCHE: MAYOR = cambios grandes en toda la app · MENOR = juegos o funciones nuevas · PARCHE = arreglos.

## Historial de versiones
| Versión | Fecha | Cambios |
|---|---|---|
| **3.9.0** | 24/10/2026 | 🏨 **Hotel rehecho con las reglas del juego de mesa real (Milton Bradley, 1986)**. La versión anterior era en la práctica otro Monopoly; esta es distinta: 8 hoteles (Fujiyama, Boomerang, L'Etoile, President, Royal, Waikiki, Taj Mahal y Safari) con los precios de la edición de 1986; **camino sinuoso de 48 casillas** con aparcamiento, Banco y Ayuntamiento; compra de **terrenos** junto al camino (compra obligatoria a mitad de precio si el terreno rival sigue vacío), **permisos de obras** con dado de permiso (concedido, denegado, gratis, doble precio), edificio principal + ampliaciones + **instalación de ocio**, **entradas** que se compran al pasar por el Ayuntamiento, casillas de entrada libre y de fase libre, **estancias** (noches × tarifa del hotel), **subastas** de hoteles para pagar deudas (o derribo si nadie puja) y quiebra. Gana el último jugador en pie (o el de más patrimonio en partidas de 40/80 rondas). Tablero 3D con los hoteles en 8 estilos, entradas, coches y dado que rueda, con 🎨 «Vista del tablero: 3D / 2D» (respaldo SVG sin WebGL). CPU de 3 niveles. Archivos nuevos: `hotel/{datos,motor,vista3d,vista2d}.js`; se retira el motor antiguo (partidas guardadas de la versión anterior se descartan). |
| **3.8.0** | 23/10/2026 | 🧊 **Vista 3D (Three.js) en 9 juegos clásicos**, con opción «Vista del tablero: 3D / 2D» en 🎨 Apariencia (por defecto 3D; si el dispositivo no tiene WebGL se usa solo la vista 2D de siempre): **Ajedrez** y **Damas** (piezas torneadas, fichas en las 4 formas, casillas y destinos resaltados), **Parchís** (tablero en cruz, fichas con las 4 formas, dado 3D que rueda sobre el tablero, casillas de destino con 💥), **Juego de la Oca** (espiral con casillas en relieve y peones), **Magnate Tecnológico** (anillo de 40 casillas con edificios por nivel y 4 estilos), **Hundir la Flota** (mar con barcos 3D, chapoteos, fuego y barcos hundidos), **Billar** (mesa con bandas, bolas que ruedan con su número, taco 3D y guía de apuntado sobre el tapete; apuntas tocando la mesa) y **Ruleta de la Suerte** (rueda con grosor, clavos y puntero; tócala para girar). Módulos comunes nuevos: `js/core/escena3d.js` (escena, cámara orbital, toques, botones de cámara), `js/core/mesa3d.js` (tableros cuadrados) y `js/core/anillo3d.js` (tableros en anillo; antes `hotel/vista3d.js`). Arreglo: en la Ruleta la barra «Cancelar / Comprobar solución» se veía siempre. |
| **3.7.0** | 23/10/2026 | 🏨 **Hotel** (juego 41, Tablero): compra destinos turísticos y levanta hoteles piso a piso (1 a 5 estrellas) en un **tablero 3D con Three.js** (r160, `js/vendor/`, se carga solo al abrir el juego): cámara orbital (arrastrar, pellizcar, girar, vista cenital), fichas y dados 3D, 4 estilos de hotel, 2 a 4 jugadores, CPU de 3 niveles, subastas, hipotecas y tratos. Motor propio sin DOM (`js/games/hotel/motor.js`) con `tests/hotel.mjs`. |
| **3.6.0** | 23/10/2026 | 🎨 **Marca y menús unificados**: nueva capa `css/marca.css` (botones, tarjetas, tipografías y menú de partida iguales en todos los juegos; guía en `docs/MARCA.md`), logo en Inicio y filas de jugador comunes. 🗂️ **Juegos agrupados**: Parchís + Oca, Ajedrez + Damas, Texas Hold'em + Póker cubierto y Sopa de letras + Crucigramas son una sola ficha en Inicio con ventana para elegir (cada juego conserva su partida y sus estadísticas). Worms con el mismo menú que el resto. |
| 3.5.1 | 23/10/2026 | 🪱 Worms: los avatares de Apariencia se ven sólidos (sobre un disco blanco con el color del equipo), el salto alto se puede dirigir (recto, o inclinado si mantienes ◀ ▶) y en el aire ◀ ▶ empujan al gusano; botones inferiores (Pasar turno, Nueva partida, Apariencia, Salir) y menú de ajustes sin fondo de imagen. 🎱 Billar: nueva **bola de efecto** en el panel de tiro para elegir dónde das a la blanca (alto: sigue tras el choque · bajo: retrocede · izquierda/derecha: efecto lateral que cambia el rebote en banda). |
| 3.5.0 | 23/10/2026 | 🪱 **Worms** (Arcade, juego 40 y último): ver la descripción de arriba. Nuevos tapetes-escenario (Bosque, Ciudad, Estadio, Desierto, Espacio, Infierno, Lago y Medieval; ahora 20 en total) disponibles en «Tapetes» y «Fondo de Tablero» de todos los juegos. Nuevos sonidos (explosión, disparo, chapuzón…). Se retira una carpeta sobrante del Minigolf. |
| 3.4.0 | 23/10/2026 | 🔡 **Scrabble** (Palabras, juego 39): tablero clásico de premios, 100 fichas en español con CH/LL/RR y comodines, de 2 a 4 jugadores contra la CPU (Fácil, Medio, Difícil) o entre personas, vista previa de palabras y puntos antes de jugar, pista, cambiar fichas, historial de jugadas y 🎨 Apariencia (fondo con todos los tapetes, tablero, fichas y rótulos). |
| 3.3.1 | 23/10/2026 | 🎱 Billar: la mesa se ajusta al alto de la pantalla (debajo de la barra superior) en vez de al ancho, y deja margen a los lados para hacer scroll con el dedo fuera de la mesa. Al empezar, la página se coloca sola con la mesa entera a la vista. |
| 3.3.0 | 23/10/2026 | 🎱 **Billar**: mesa más grande y de tamaño fijo (casi todo el ancho de la pantalla; ya no encoge al hacer scroll en el móvil), bolas más grandes con números y rayas más claros, controles de tiro flotantes que se arrastran a cualquier sitio (📍 Recolocar controles), caja de 🧺 bolas metidas bajo la mesa e icono de lisas/rayadas junto a cada jugador en cuanto entra la primera bola (también en el saque). Arreglo: al acabar la partida no se apuntaba en estadísticas y «Otra partida» salía desactivado. Limpieza: fuera la carpeta del antiguo Minigolf y las copias de la guía con «Ñ» mal codificada. |
| 3.2.0 | 22/10/2026 | 🔠 **Cifras y Letras** (Palabras): rondas de letras con el diccionario de LibreOffice y de cifras con solución calculada, contra la CPU (3 niveles) o en solitario, reto del día y tapetes de fondo (🎲 aleatorio por defecto). |
| 3.1.0 | 19/10/2026 | 🎱 **Billar** (Pool 8, Pool 9 y Snooker de 6 rojas, contra la CPU o 2 jugadores) sustituye al Minigolf. Número de versión al pie de Ajustes. Guía `docs/ANADIR-JUEGO.md` sin «Ñ» en el nombre. |
| 3.0.0 | 10/2026 | Nueva 🎨 Apariencia: cada categoría en su propia ventana, tapetes de imagen, dorsos y barajas aleatorios, «Fondo de Tablero» y «Personajes» en todos los juegos; iconos de oficinas/sede elegibles en Magnate. |
| 2.6.0 | 10/2026 | Corazones, Kakuro, Sokoban, Póker cubierto y Air Hockey. Diccionario español (LibreOffice). |
| 2.5.0 | 10/2026 | Magnate Tecnológico. Menú superior por categorías, fichas 3:2 y estadísticas por categoría. |
| 2.0.0 | 10/2026 | Auditoría completa: logros, reto del día, podio, compartir, IA en segundo plano, mejoras en todos los juegos. |
