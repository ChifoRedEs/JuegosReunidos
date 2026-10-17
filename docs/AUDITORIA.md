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
