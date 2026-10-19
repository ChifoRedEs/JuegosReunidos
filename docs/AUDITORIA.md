# Auditoría y mejoras (octubre de 2026)

## Errores corregidos
- **Comodín de la baraja española sin conexión**: el service worker no guardaba `00.webp` de las barajas españolas (Chinchón con comodines lo mostraba en blanco). También usaba la extensión equivocada para el comodín francés.
- **Almacenamiento lleno**: si `localStorage` no tenía sitio, la partida dejaba de guardarse sin avisar. Ahora sale un aviso.
- **Nonograma «Cara contenta»**: se descartaba porque obligaba a adivinar. Rediseñado: los 28 dibujos se resuelven por lógica.
- **KenKen**: los tableros solo usaban permutaciones del cuadrado cíclico (en 4×4, 432 de las 576 soluciones posibles y nunca las de tipo «Klein»). Ahora los cuadrados latinos son aleatorios de verdad.
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
- **Toda la app**: 🏅 20 logros, 📅 Reto del día (Sudoku, Nonogram, Buscaminas, KenKen, Sopa, Crucigrama), 📤 compartir resultado en todos los juegos, 🏆 podio de los 10 mejores en los arcade, deshacer que se guarda con la partida (Sudoku, KenKen, Nonogram). La copia de seguridad incluye logros, retos y podios, y suma las palabras aprendidas de Encadenadas.
- **Sudoku**: nivel Experto; los niveles se califican por las técnicas que exigen.
- **Nonogram**: dibujos de 15×15 y 20×20.
- **Buscaminas**: tableros «sin adivinar» y tablero personalizado.
- **Ajedrez**: reloj con incremento, PGN (exportar e importar, notación inglesa o española) y revisión jugada a jugada.
- **Damas**: variantes brasileña e internacional 10×10.
- **3 en raya, Conecta 4 y Ajedrez**: series al mejor de 3 o de 5.
- **Parchís**: modo por parejas.
- **Trivial**: 135 preguntas clásicas de tipo test (además de las 450 definiciones).
- **Hundir la Flota**: flotas Piratas, Gran armada (12×12) y Relámpago (6×6).
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

## Magnate Tecnológico (juego nuevo, categoría Tablero)
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
- Palabras base para los demás juegos (`lemas-<hash>.txt`, 0,45 MB): 36.895 sustantivos y adjetivos y 10.480 verbos en infinitivo, con tildes. Las usan **Encadenadas** (valida cualquier palabra real, conjugaciones incluidas, y la CPU elige entre 47.000 palabras), la **Sopa de letras** (tema 📚 Diccionario) y el **Ahorcado** (tema 📚 Diccionario, con pista de tipo de palabra y primera letra). Crucigramas, Rosco, Trivial y Ruleta necesitan definiciones o frases, que el diccionario no trae.

## Póker cubierto (juego nuevo, categoría Cartas)
`js/games/pokercub/` (motor.js · index.js · pokercub.css). Póker de descarte de 5 cartas contra 1-5 bots: entrada (ante), primera ronda de apuestas, descarte de hasta 3 cartas (4 si te quedas con un as), segunda ronda y enfrentamiento. Sin límite, con all-in y botes secundarios. Torneo (la entrada sube cada 6 manos) o partida libre con recompras. Opción «jotas o mejor» para abrir: si nadie abre, se reparte de nuevo y el bote se acumula.
Reutiliza el evaluador de manos y los perfiles de bots del Texas Hold'em. Los bots calculan su probabilidad simulando también el cambio de cartas (el suyo y el de los rivales) y tienen en cuenta quién se sirve. Consejo de descarte y probabilidad de ganar (menú ⋯), estadísticas propias y la misma mesa y barajas de la app.

## Air Hockey (juego nuevo, categoría Arcade)
`js/games/airhockey/` (motor.js · index.js · airhockey.css). Mesa vertical en canvas: contra la CPU (Fácil, Medio, Difícil) o 2 jugadores en el mismo móvil con multitáctil (cada uno mueve su mazo desde su mitad, a la vez). Partidos a 5, 7 o 10 goles; ratón y flechas también sirven.
Física con subpasos (240 por segundo) para que el disco no atraviese mazos ni bandas, rebotes con la velocidad del mazo, roce suave y «colchón de aire» que evita que el disco se quede parado junto a un fondo. La CPU defiende prediciendo los rebotes, se coloca detrás del disco (rodeándolo si hace falta) y lo golpea hacia tu portería; cada nivel cambia su velocidad, puntería y tiempo de reacción. Pausa automática al salir de la app, partida guardada y tres mesas en 🎨 Apariencia.
