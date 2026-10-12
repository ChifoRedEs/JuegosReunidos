# Mejoras incluidas en esta versión

## Arreglos de la auditoría
- **Sudoku**: tableros con solución única garantizada (comprobado en los tres niveles); la pista ya no puede contradecir al jugador.
- **Confirmaciones** al cambiar de nivel, tamaño, reglas o empezar partida con progreso.
- **Damas**: recorrido de capturas paso a paso (sin ambigüedad), última jugada resaltada, animación, contador de capturas, deshacer, tablas (20 jugadas sin capturas ni peones / triple repetición).
- `touch-action: manipulation` global, `:focus-visible`, `aria-label` en casillas, validación estricta con `Object.hasOwn` en todos los juegos.
- El foco del teclado ya no se pierde (se actualizan elementos en vez de reescribir el HTML).

## Por juego
- **Sudoku**: notas, deshacer, cronómetro (se pausa solo), contador de cuántos quedan por número, resaltado distinto para «mismo número», marcar errores al instante (menú ⋯), pista inteligente sin casilla seleccionada, teclado completo (N notas, Z deshacer), niveles por técnica requerida.
- **Nonogram**: pintar arrastrando por fila/columna, ✕ con pulsación larga, resaltado de fila y columna activas, deshacer, pistas tachadas, cronómetro, modo **Dibujo** con pixel-art hecho a mano verificado con el resolvedor (5×5 y 10×10; añade más en `data/nonogramas/fuentes.txt` y ejecuta `node tools/verificar_nonogramas.mjs`), generación sin congelar la interfaz.
- **Damas**: reglas **españolas** (dama voladora + ley de la mayoría) o **inglesas**; IA minimax con poda alfa-beta y 3 niveles reales (profundidad 2 / 5 / 9 con límite de tiempo).
- **Parchís**: fichas animadas casilla a casilla, dado animado, tocar la casilla de destino además de la ficha, nombres de jugador, velocidad de CPU, motor de reglas separado y probado (partidas de 2 a 4 CPU simuladas hasta el final).

## Juegos nuevos (actualización 1)
- **3 en raya**, 4 tableros: Clásico 3×3, **Infinito** 3×3 (solo 3 fichas a la vez; la más antigua se atenúa y desaparece), 4×4 (cuatro en raya) y 5×5 (cuatro en raya).
- **Conecta 4**, 4 tableros: Mini 6×5, Clásico 7×6, Grande 9×7 y **Conecta 5** en 10×8. Fichas que caen con animación y rebote, ficha fantasma sobre la columna, última ficha marcada y línea ganadora resaltada.
- Comunes: contra CPU (Fácil / Medio / Difícil) o 2 jugadores en el mismo móvil, elegir quién empieza (o alternar), marcador de sesión, deshacer (tu jugada y la respuesta de la CPU), 💡 Pista, estadísticas, partida guardada, accesibilidad por teclado y opciones plegables para dejar más sitio al tablero.
- La IA es minimax con poda alfa-beta: en 3×3 clásico en Difícil juega perfecto (comprobado: nunca pierde y empata contra sí misma).

## Actualización 2: diseño vivo, apariencia por juego y juegos nuevos
- **Diseño a todo color**: cabecera con degradado, fichas de inicio brillantes, botones y paneles redondeados, tablero con sombras y colores intensos en todos los juegos.
- **🎨 Apariencia en cada juego** (botón y menú ⋯): colores del tablero, y según el juego color, forma y diseño de las fichas. Se guarda por juego y se puede restablecer.
  - Sudoku: 4 paletas + números redondos / clásicos / de colores. Nonogram: paletas, color del relleno y forma (cuadrado, círculo, estrella, corazón…).
  - Damas: 5 tableros, 4 pares de colores y 4 formas de ficha. 3 en raya: paletas y fichas ✕○ o emojis (animales, espacio, comida, deporte). Conecta 4: 5 tableros, 4 pares de colores y formas (redonda, estrella, diamante, corazón).
- **Parchís rediseñado**: casillas redondeadas y llamativas, fichas bastante más grandes, casas discretas, 4 tableros, 4 paletas (incluida una para daltonismo), 4 formas de ficha (canica, peón, estrella, diamante) y zoom con desplazamiento automático hacia la acción. Se mantiene el indicador de destino y ahora muestra una ficha fantasma y 💥 si se come.
- **Sopa de letras**: 7 temas, 3 niveles (8×8 a 12×12, hasta 8 direcciones), arrastrar o tocar inicio y fin, pistas, subrayado de colores y apariencia.
- **Buscaminas**: 3 niveles, primer toque seguro, banderas con pulsación larga o modo bandera, abrir con un toque sobre un número (acorde), pistas por deducción, cara y contadores, minas y banderas personalizables.

## Actualización 3: los cuatro juegos que faltaban
- **Crucigramas** (libres, generados al momento): 5 niveles y tamaños (Mini 9×9, Fácil 11×11, Medio 13×13, Difícil 15×15, Experto 17×17), 7 temas más Mezcla con unas 220 palabras y definiciones propias. Teclado propio en pantalla, toque para cambiar horizontal/vertical, ‹ › entre pistas, comprobar, revelar letra o palabra y marcado de errores al instante. Para ampliar los temas edita `js/games/crucigrama/pistas.js`.
- **BlackJack**: zapato de 6 barajas, pedir, plantarse, doblar, dividir (hasta 4 manos), rendirse y seguro; blackjack 3:2; banca persistente de fichas y consejo de estrategia básica (ventaja de la casa comprobada en torno al 0,4 %).
- **Klondike**: robar de 1 o de 3, arrastrar cartas o tocar para jugada automática, pista, deshacer, autocompletar y cartas/mesa/dorso personalizables.
- **Texas Hold'em**: torneo contra 2-5 bots con personalidad (conservador, equilibrado, agresivo y farolero), ciegas crecientes, all-in y botes secundarios, probabilidad de ganar en tiempo real y ranking de manos. Los bots deciden con simulación de Monte Carlo y las probabilidades del bote.
- Módulo común de cartas (`core/cartas.js`, `css/cartas.css`) con mesa, dorso y colores de palo configurables.

## Actualización 4: mejoras pedidas
- **Parchís · Salida libre** (casilla en la pantalla de nueva partida): si no tienes fichas en juego, sales con una ficha con cualquier número; con un 5 en tu primera tirada sacas dos fichas de casa.
- **BlackJack**: el blackjack paga 3 a 2 (+150 %) y la victoria normal +100 %; ahora se ve en pantalla (importe en cada mano, brillo dorado y aviso de pago) y en las reglas.
- **Klondike**: casilla extra «Libre» a la izquierda de las columnas (admite cualquier carta o grupo cuando está vacía; opcional), analizador que indica si el camino sigue abierto o cerrado y porcentaje de acierto de tus jugadas.

## Actualización 6: cuatro juegos nuevos
- **KenKen** (Lógica): paneles de 3×3 a 7×7 en 4 dificultades (Fácil, Medio, Difícil, Experto) con solución única garantizada; notas, deshacer, comprobar, pistas, jaulas con bordes o de colores y errores al instante opcionales.
- **Brisca** (Cartas): baraja española dibujada con SVG; 2 jugadores, 3 jugadores o 4 en parejas contra la CPU; 3 niveles (Fácil, Medio y Difícil, que simula el resto de la partida con las cartas aún no vistas); cambio opcional del 7 del triunfo; marcador de manos.
- **El Ahorcado** (Palabras): 4 niveles con distinto número de fallos, palabras cotidianas (Fácil y Medio) o vocabulario culto del PDF (Difícil y Experto) con la definición como pista, 4 dibujos (clásico, robot, globos y flor) y 7 + 9 temas.
- **Trivial** (Tablero): 2 a 4 jugadores (personas o CPU), tablero circular con casillas de quesito y «tira otra vez», 6 o 9 categorías, respuestas con 4 opciones o escritas (tolerantes con tildes y erratas), pregunta final en el centro. Las 450 preguntas salen de las definiciones del PDF aportado (`js/core/definiciones.js`).

## Actualización 7: Ruleta de la Suerte y mejoras de juego
- **Ruleta de la Suerte** (Palabras): de 1 a 3 jugadores (personas o CPU con 3 niveles), 3, 4 o 5 rondas y 116 paneles en 10 categorías. Ruleta animada con Quiebra y Pierde turno, consonantes con premio, vocales a 250 €, y para resolver se escriben las letras que faltan directamente en las casillas del panel. Partida guardada, estadísticas y 🎨 Apariencia (colores del panel y de la ruleta).
- **Teclado emergente** (`core/teclado.js`) en Crucigramas, El Ahorcado y Ruleta: ya no hay teclado fijo bajo el tablero. Aparece al tocar las casillas, se arrastra por la pantalla desde su barra, se cierra con ✕ y recuerda su posición.
- **Trivial · ronda final**: con todos los quesitos, en el centro hay que acertar una pregunta de cada categoría seguidas y sin fallar (con indicador de progreso). Si fallas una, pasa el turno y en tu siguiente turno empiezas de nuevo.
- **Klondike · analizador plegado**: el analizador «Camino abierto» pasa a una burbuja en la esquina con el porcentaje; al tocarla se abre a tamaño normal. Si una jugada cierra el camino, avisa.
- **Klondike · auto-relleno**: cuando no quedan cartas boca abajo y el resto puede subir solo, las cartas van a las bases y la partida termina sola (automático o con botón, en ⚙️).

## Actualización 8: Inicio por categorías y Ajedrez
- **Inicio con categorías plegables**: cada categoría es una pestaña; al abrir una se cierran las demás, se recuerda la última abierta y se avisa de las partidas en curso.
- **Actualizaciones fiables**: el service worker descarga los archivos nuevos sin pasar por la caché del navegador y la app se recarga sola una vez al detectar una versión nueva.
- **Ajedrez** (Tablero): todas las reglas (enroques, captura al paso, coronación a elección, jaque, mate, ahogado, triple repetición, 50 movimientos y material insuficiente), comprobadas con pruebas *perft* de referencia. Contra CPU en 3 niveles (alfa-beta con búsqueda de capturas) o 2 jugadores; tocar o arrastrar piezas, casillas posibles marcadas, rey en jaque en rojo, piezas capturadas con ventaja de material, lista de jugadas en notación española, abandonar, deshacer, pista y tablero girado al jugar con negras. 🎨 5 tableros y 3 juegos de colores de piezas.

## Actualización 9: Chinchón
- **Chinchón** (Cartas): baraja española de 40 cartas, tú contra 1, 2 o 3 CPU en 3 niveles. Tríos, cuartetos y escaleras (el 7 enlaza con la sota); la mano se ordena sola en jugadas y muestra los puntos sueltos. Robar del mazo o del descarte (sin poder tirar la carta recién cogida), cerrar con 3 o 5 puntos sueltos como máximo (−10 si cierras sin sueltas), las cartas de los demás se colocan solas en las jugadas de quien cierra, ¡chinchón! (escalera de 7) gana la partida, eliminación al pasar de 50 o 100 puntos y mano nula si el mazo se agota dos veces. Recuento visual de cada mano, marcador, estadísticas y partida guardada.

## Actualización 10: Mus
- **Mus** (Cartas): por parejas, tú y tu compañero CPU contra dos CPU (3 niveles). Fase de mus con descartes, lances de Grande, Chica, Pares (par, medias, duples) y Juego (31, 32, 40, 37…) o Punto, envites con paso, envido, subir, quiero, no quiero y órdago. Los tantos se cuentan en orden y el juego acaba en cuanto una pareja llega a la meta. Opciones: a 30 o 40 tantos, un juego o al mejor de 3, 8 o 4 reyes. La CPU estima sus opciones simulando manos posibles y respeta lo que cada uno ha declarado en pares y juego. Recuento con las cartas de todos, marcador, estadísticas y partida guardada.

## Global
Inicio por categorías con estado de la partida en curso («Continuar · Medio · 32/81»), cabecera con atrás y menú ⋯, rutas por hash (el botón atrás de Android funciona), estadísticas por juego, ajustes (tema, sonidos Web Audio, vibración), copia de seguridad v2 compatible con v1, PWA instalable sin conexión.
