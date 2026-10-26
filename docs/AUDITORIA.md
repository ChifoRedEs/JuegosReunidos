# Auditoría y mejoras (octubre de 2026)

## Errores corregidos
- **Comodín de la baraja española sin conexión**: el service worker no guardaba `00.webp` de las barajas españolas (Chinchón con comodines lo mostraba en blanco). También usaba la extensión equivocada para el comodín francés.
- **Almacenamiento lleno**: si `localStorage` no tenía sitio, la partida dejaba de guardarse sin avisar. Ahora sale un aviso.
- **Nonograma «Cara contenta»**: se descartaba porque obligaba a adivinar. Rediseñado: los 28 dibujos se resuelven por lógica.
- **Calcudoku**: los tableros solo usaban permutaciones del cuadrado cíclico (en 4×4, 432 de las 576 soluciones posibles y nunca las de tipo «Klein»). Ahora los cuadrados latinos son aleatorios de verdad.
- **Estilos de los juegos**: las hojas de estilo se acumulaban en `<head>` y clases genéricas (`.pre`, `.seat`…) podían chocar. Ahora solo está activa la del juego abierto (y las comunes de `/css/`).
- **Listeners `resize`** de Serpiente, Bloques y Rompe-Ladrillos: se registraban a nivel de módulo y nunca se quitaban.
- **Tema «Auto»**: el color de la barra no cambiaba si el sistema pasaba a oscuro con la app abierta.
- **Series al mejor de N**: cada serie sumaba una partida extra en Estadísticas.
- **Documentación**: archivo duplicado `A#U251c#U00e6ADIR-JUEGO.md`, README con 28 juegos y carpetas que no existen, hoja de ruta desfasada.

## Rendimiento
| Medida (Chromium, móvil simulado) | Antes | Después |
|---|---|---|
| Ajedrez difícil: pantalla congelada por jugada de la CPU | 2.006 ms | 0 ms (IA en un Worker) |
| Serpiente: lecturas de `localStorage` en 2 s de juego | 79 | 8 |
| Bloques: cambios en el DOM en 2 s | 121 | 20 |
| Rompe-Ladrillos: cambios en el DOM en 2 s | 236 | 2 |
| Imágenes de los naipes | 5,1 MB | 2,3 MB |
| Descarga de naipes en segundo plano | todas las barajas | solo las elegidas (nada con «Ahorro de datos») |

Además: el minimax poda más cuando no hay ruido; el Inicio lee un índice ligero en vez de todas las partidas guardadas; la rejilla de Bloques, el fondo de la Serpiente y los ladrillos se pintan en capas que se reutilizan; sin `shadowBlur` en cada fotograma; las fuentes ya no bloquean el primer pintado; `arrastrar.js` mide las cartas solo cuando cambian de sitio.

## Código sin uso eliminado
Exports: `$$` (dom.js), `TIPOS` y `marcaDe` (bloques), `colorear` (kenken), `todoArriba` (klondike), `PCOL` y `PINK` (parchís), `sonPares` (sudoku), `tamano` (trivial). Doce imports que no se usaban.

## Mejoras de funcionalidad
- **Toda la app**: 🏅 50 logros, 📅 Reto del día (Sudoku, Nonogram, Bombardeo, Calcudoku, Sopa, Crucigrama), 📤 compartir resultado en todos los juegos, 🏆 podio de los 10 mejores en los arcade, deshacer que se guarda con la partida (Sudoku, Calcudoku, Nonogram). La copia de seguridad incluye logros, retos y podios, y suma las palabras aprendidas de Encadenadas.
- **Sudoku**: nivel Experto; los niveles se califican por las técnicas que exigen.
- **Nonogram**: dibujos de 15×15 y 20×20.
- **Bombardeo**: tableros «sin adivinar» y tablero personalizado.
- **Ajedrez**: reloj con incremento, PGN (exportar e importar, notación inglesa o española) y revisión jugada a jugada.
- **Damas**: variantes brasileña e internacional 10×10.
- **3 en raya, Cuatro en Línea y Ajedrez**: series al mejor de 3 o de 5.
- **Partxis**: modo por parejas.
- **Trivia Quesitos**: 135 preguntas clásicas de tipo test (además de las 450 definiciones).
- **Batalla Naval**: flotas Piratas, Gran armada (12×12) y Relámpago (6×6).
- **Klondike**: repartos siempre con solución y puntuación Vegas con banca.
- **Hold'em**: partida libre y estadísticas de tus manos.
- **BlackJack**: contador de cartas Hi-Lo didáctico.
- **Brisca, Chinchón, Mus, Cinquillo, Continental**: historial de partidas; última baza (Brisca) y tabla mano a mano (los demás).
- **Crucigrama y Sopa**: temas nuevos y más palabras. **El Rosco**: 16 palabras por letra. **Ahorcado**: modo 2 jugadores.
- **Serpiente**: modo Obstáculos. **Bloques**: modo Excavar. **Rompe-Ladrillos**: editor de niveles.

## Pruebas
`node tests/motores.mjs`: 79 pruebas (66 anteriores + 13 de las mejoras). Los 30 juegos se abren en el navegador sin errores en consola.

## Integración de los cambios visuales (versión del usuario)
- Menú superior con las 5 categorías, Estadísticas y Ajustes (`#/cat/<categoría>`). Dentro de un juego queda marcada su categoría y el botón ‹ vuelve a ella.
- Fichas de juego con proporción 3:2, iconos y textos que se adaptan a la pantalla y descripciones limitadas (2 líneas en pantallas de menos de 430 px, 4 en las demás).
- Estadísticas por pestañas de categoría, con «Reiniciar estadísticas de la categoría» y «Reiniciar Todas las Estadísticas». Los logros conseguidos se conservan.
- Dorsos «(poker)»: el nombre se ha cambiado también en `img/cartas/dorsos/nombres.json`, que es de donde lo lee `tools/generar_barajas.py` (si no, GitHub Actions lo volvería a poner como «adamascado»).
- Figuras nuevas de la baraja ESP-02 (10, 11 y 12), comprimidas como el resto (240 px, WebP 78).

## Magnate Urbano (juego nuevo, categoría Tablero)
Integrado en `js/games/magnate/` (datos.js · motor.js · index.js · magnate.css) con la API de la app: guardado y validación de partidas, estadísticas, menú ⋯, 🎨 Apariencia (colores del tablero de la app), diálogos en hoja inferior, sonido y vibración globales, y tecla Espacio para tirar.

**Para alejarlo de Monopoly** (ver la nota legal en la conversación): la economía es propia (precios, alquileres, multiplicadores, salario de 220M, fianza de 60M, 30 oficinas y 10 sedes en el banco), las casas y hoteles son «oficinas» y «sede central», y las cartas tienen textos y efectos propios.

**Errores corregidos del código original:**
- La carta «Sales libre de la Auditoría» volvía al mazo aunque el jugador se la quedara: se podían acumular copias infinitas. Ahora sale del mazo y vuelve al usarla (o al quebrar).
- Los bots no negociaban nunca: en partidas de 2 jugadores casi nadie completaba un sector y la partida podía no terminar (en una simulación, 1.500 turnos sin edificar). Ahora proponen tratos para completar sectores; en 200 partidas simuladas terminan el 97 % (mediana: 157 turnos).
- Si todas las personas quebraban, los bots seguían jugando solos indefinidamente. Ahora la partida termina y gana el bot con más patrimonio.
- Los importes de un trato aceptaban números negativos (se podía «dar» dinero negativo).
- La fianza de la Auditoría no iba al bote del Paraíso Fiscal, a diferencia de los demás pagos.
- La tecla Espacio y los diálogos `<dialog>` globales chocaban con el resto de la app; la partida se guardaba en una clave propia (`mt_game`) fuera de la copia de seguridad.

**Mejoras:** límite opcional de 20 o 40 rondas (gana el mayor patrimonio), 3 velocidades, fichas elegibles, carta «avanza hasta la próxima nube y paga el doble», carta de obras (paga por oficina y sede), ficha de cada empresa al tocar su casilla y prueba automática del motor (`tests/motores.mjs`).

## Diccionario español para los juegos de palabras
- Origen: diccionario ortográfico de LibreOffice (RLA-ES, `es_ANY` 2.1, Santiago Bosio; GPL 3 / LGPL 3 / MPL 1.1). Originales en `tools/diccionario/`.
- `tools/generar_diccionario.py` expande las reglas de afijos (plurales, femeninos, conjugaciones y pronombres pegados: «dámelo»), quita nombres propios, tildes y diéresis y deja 592.289 palabras de 2 a 15 letras en `data/diccionario/es-<hash>.txt` (6 MB; 1,5 MB comprimido al servirlo).
- 42 palabras que faltaban (pingüino, quirófano, champiñón, tucán, ñu, eñe…) se añaden desde `tools/diccionario/extra.txt`.
- `js/core/diccionario.js` lo carga bajo demanda (0,16 s la primera vez, 0,06 s desde la caché) y busca sin trocear el texto: 100.000 búsquedas en 70 ms.
- El service worker no lo instala con la app: lo guarda en la caché `jr-diccionario` la primera vez que un juego lo pide y lo conserva entre actualizaciones.
- Palabras base para los demás juegos (`lemas-<hash>.txt`, 0,45 MB): 36.895 sustantivos y adjetivos y 10.480 verbos en infinitivo, con tildes. Las usan **Encadenadas** (valida cualquier palabra real, conjugaciones incluidas, y la CPU elige entre 47.000 palabras), la **Sopa de letras** (tema 📚 Diccionario) y el **Ahorcado** (tema 📚 Diccionario, con pista de tipo de palabra y primera letra). Crucigramas, Rosco, Trivia Quesitos y Ruleta necesitan definiciones o frases, que el diccionario no trae.

## Póker cubierto (juego nuevo, categoría Cartas)
`js/games/pokercub/` (motor.js · index.js · pokercub.css). Póker de descarte de 5 cartas contra 1-5 bots: entrada (ante), primera ronda de apuestas, descarte de hasta 3 cartas (4 si te quedas con un as), segunda ronda y enfrentamiento. Sin límite, con all-in y botes secundarios. Torneo (la entrada sube cada 6 manos) o partida libre con recompras. Opción «jotas o mejor» para abrir: si nadie abre, se reparte de nuevo y el bote se acumula.
Reutiliza el evaluador de manos y los perfiles de bots del Texas Hold'em. Los bots calculan su probabilidad simulando también el cambio de cartas (el suyo y el de los rivales) y tienen en cuenta quién se sirve. Consejo de descarte y probabilidad de ganar (menú ⋯), estadísticas propias y la misma mesa y barajas de la app.

## Air Hockey (juego nuevo, categoría Arcade)
`js/games/airhockey/` (motor.js · index.js · airhockey.css). Mesa vertical en canvas: contra la CPU (Fácil, Medio, Difícil) o 2 jugadores en el mismo móvil con multitáctil (cada uno mueve su mazo desde su mitad, a la vez). Partidos a 5, 7 o 10 goles; ratón y flechas también sirven.
Física con subpasos (240 por segundo) para que el disco no atraviese mazos ni bandas, rebotes con la velocidad del mazo, roce suave y «colchón de aire» que evita que el disco se quede parado junto a un fondo. La CPU defiende prediciendo los rebotes, se coloca detrás del disco (rodeándolo si hace falta) y lo golpea hacia tu portería; cada nivel cambia su velocidad, puntería y tiempo de reacción. Pausa automática al salir de la app, partida guardada y tres mesas en 🎨 Apariencia.

## Encajados (juego nuevo, categoría Lógica)
`js/games/sokoban/` (motor.js · niveles.js · index.js · sokoban.css). Campaña de 20 niveles originales (8 diseñados a mano y 12 creados con el generador del juego con semillas fijas y elegidos por dificultad; ninguno copiado de colecciones publicadas), niveles generados sin fin en 3 tamaños (2, 3 o 4 cajas) y reto del día.
El generador juega «al revés» (tira de las cajas desde las metas), así que todo nivel tiene solución; además lo confirma un resolvedor por anchura que busca la solución con menos empujes y descarta casillas muertas. El generador y la pista se ejecutan en un Worker. Controles: deslizar, tocar una casilla (camina hasta ella), flechas en pantalla, teclado (flechas o WASD, Z deshacer, R reiniciar). Deshacer sin límite y guardado, aviso de caja atascada, récord de movimientos por nivel, 3 escenarios y 4 personajes.
- Apariencia del Encajados: 8 escenarios (muros, suelo y color de las metas), 8 tipos de caja (madera, colores, metálicas, regalos, cartón…) y 92 personajes en 6 secciones (hombres, mujeres, oficios, fantasía, animales y vehículos); los animales y vehículos se giran al caminar hacia la derecha. La hoja de 🎨 Apariencia de la app admite ahora rejillas de iconos con secciones (opciones con `emoji` y `sec`), que podrán usar otros juegos.

## CruciSumas (juego nuevo, categoría Lógica)
`js/games/kakuro/` (generador.js · index.js · kakuro.css), con el mismo formato que Calcudoku y Sudoku: tamaño (6×6, 8×8, 10×10) y nivel, notas, deshacer guardado, pista, comprobar, errores automáticos, reto del día (8×8 medio) y 🎨 Apariencia (paleta del tablero, color de las casillas de las sumas y tipo de número). Ayuda propia: al elegir una casilla se muestran las combinaciones posibles de sus dos sumas y se tachan las que ya no encajan.
Generador: dibujo con simetría central sin tiras de una casilla (y de 7 como mucho, 5 en 10×10), relleno que favorece 1, 2, 8 y 9 y, si hay dos soluciones, cambia una cifra donde difieren hasta que la solución es única; lo confirma un resolvedor por combinaciones con comprobación exacta de las tiras cortas. El nivel depende de si el resolvedor necesita probar valores. Se genera en un Worker (1-3 s en 10×10). El 12×12 se descartó: tardaba 10-20 s.

**Error corregido en Calcudoku** (encontrado al pasar las pruebas): si la comprobación de «¿hay otra solución?» se quedaba sin tiempo (1,5 s), el generador daba el panel por bueno sin saber si era único. En móviles lentos un 7×7 podía salir con dos soluciones. Ahora ese panel se descarta y se genera otro.

## Corazones (juego nuevo, categoría Cartas)
`js/games/corazones/` (motor.js · index.js · corazones.css). Contra tres CPU (Oeste, Norte y Este) con baraja francesa: pase de 3 cartas (izquierda, derecha, enfrente y sin pase, por turnos), salida con el 2 de tréboles, obligación de servir, sin puntos en la primera baza, corazones rotos, dama de picas = 13 y tiro a la luna (los rivales +26 o tú −26). Partidas a 50 o 100 puntos; gana quien menos tenga.
Bots: pasan la dama de picas si no tienen picas para protegerla, As y Rey de picas, corazones altos y cartas altas de palos cortos; al jugar, se agachan con la carta más alta que no gana, se llevan las bazas limpias cuando son los últimos, cuelan la dama sobre un As o Rey de picas y, si no tienen del palo, se deshacen primero de la dama y de los corazones. En Difícil, además, salen de los palos con más cartas por salir.
Ayudas: 💡 sugerencia de pase, cartas recibidas marcadas con ★, cartas que no puedes jugar en gris (y un aviso que explica por qué), 👀 última baza, 📜 historial mano a mano y partidas anteriores, misma mesa, dorsos y barajas de la app.

## Minigolf (juego nuevo, categoría Arcade)
`js/games/minigolf/` (hoyos.js · motor.js · index.js · minigolf.css). Recorrido propio de 9 hoyos (par 25) con curvas, rampas, arena, agua (+1 golpe y la bola vuelve), topes y un molino con aspas que giran. Golpe tipo tirachinas: se arrastra hacia atrás y se suelta; la línea marca la dirección y el color, la fuerza. De 1 a 4 jugadores por turnos (cada uno completa el hoyo), tarjeta con birdies y bogeys, máximo de golpes por hoyo (par + 4), podio de los 10 mejores (un jugador) y 4 campos en 🎨 Apariencia.
Física con 400 subpasos por segundo, rozamiento del césped y de la arena, rebotes en bordes, muros, topes y aspas (que empujan la bola con su giro), y hoyo que solo atrapa la bola si llega despacio. Una prueba comprueba que cada hoyo se puede completar sin que la bola salga del campo.

## Billar sustituye al Minigolf (versión 3.1.0)
**Por qué se quitó el Minigolf:** una bola podía quedarse parada para siempre dentro de una rampa apoyada contra un muro. La rampa la seguía empujando contra la pared, así que nunca llegaba a «pararse» y el juego esperaba sin fin a que terminara el golpe. (No era que la rampa se dibujara encima de la bola.)

`js/games/billar/` (motor.js · index.js · billar.css). Mesa vertical en canvas para el móvil, con física por pasos (480 por segundo): choques entre bolas, bandas, troneras y rozamiento del paño.
- **Pool 8:** grupos de lisas y rayadas (la mesa queda abierta hasta que alguien mete una bola tras el saque) y la 8 al final; meterla antes de tiempo o con falta hace perder.
- **Pool 9:** siempre hay que tocar primero la bola más baja; gana quien mete la 9.
- **Snooker de 6 rojas:** roja y color alternos (los colores vuelven a su sitio), color libre tras la última roja, colores en orden al final, faltas de al menos 4 puntos y bola en mano dentro de la D.
- **Faltas comunes:** meter la blanca, no tocar ninguna bola, tocar primero una que no toca y, en Pool, que ninguna bola toque banda. Tras una falta, el rival tiene bola en mano.
- **Controles:** tocar o arrastrar sobre la mesa para apuntar, ↺ ↻ para afinar, fuerza y Tirar (o teclado). Línea de ayuda larga, corta o desactivada, con «bola fantasma», trayectoria de la bola tocada y una ✕ si es una bola que no puedes tocar primero.
- **CPU (3 niveles):** en un Worker calcula el golpe fantasma hacia cada tronera para cada bola legal, simula varias fuerzas y elige el mejor; el nivel cambia cuántos tiros prueba y lo que se desvía al tirar. Con bola en mano, prueba varios sitios.
- **🎨 Apariencia:** color del tapete, tapete de imagen, bandas, bolas y taco.

## Números y Letras (juego nuevo, categoría Palabras · versión 3.2.0)
`js/games/cifrasletras/` (motor.js · index.js · cifrasletras.css). Partidas de 4, 6 o 10 rondas que alternan Letras y Cifras, con 30, 45 o 60 segundos (o sin límite), contra la CPU (3 niveles) o en solitario.
- **Letras:** se piden 9 letras (vocal o consonante, al menos 3 de cada; o 🎲 al azar) con frecuencias del español y la Ñ. La palabra se forma tocando las fichas o con el teclado y se comprueba con el diccionario completo (`core/diccionario.js`: plurales, femeninos y conjugaciones; sin importar las tildes). Cada letra vale un punto y 9 letras, 18. Al final de la ronda se ven las palabras más largas posibles.
- **Cifras:** 6 números (1-10 dos veces, 25, 50, 75 y 100) y un objetivo de 101 a 999. Se toca un número, una operación y otro número; el resultado pasa a ser una ficha nueva. Divisiones exactas y sin negativos. Exacto 10 puntos, a 5 o menos 7, a 10 o menos 5. Un resolvedor exhaustivo enseña una solución (exacta en ~97 % de los casos) en unos milisegundos.
- **Contra la CPU** solo puntúa la mejor respuesta de cada ronda (si empatan, los dos), como en el concurso. La CPU busca entre todas las palabras posibles (más cortas cuanto más fácil) y en cifras usa como mucho 3, 4 o 6 números según el nivel.
- **Reto del día:** 4 rondas con las mismas letras y cifras para todo el mundo.
- **🎨 Apariencia:** Fondo de Tablero con los tapetes de imagen (🎲 aleatorio por defecto en este juego), paleta del tablero y 4 estilos de fichas (Concurso, Madera, Pizarra y Del tablero).

## Guerra de Orugas (versión 3.5.0)
`js/games/worms/` (motor.js · ia.js · index.js · worms.css), pruebas en `tests/worms.mjs`. El motor no toca el DOM; el terreno es una máscara de bits generada desde una semilla y la partida guardada solo lleva la semilla y la lista de cráteres. Comprobado: 3/6/9/12 gusanos en los 4 mapas sin gusanos enterrados ni flotando, CPU contra CPU termina partidas completas, cuerda que engancha y suelta sin dejar gusanos en el aire, tumbas que se destruyen y guardado/carga validado.
