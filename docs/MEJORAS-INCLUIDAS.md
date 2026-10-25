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

## Actualización 11: ordenar y arrastrar cartas (Chinchón y Mus)
- Nuevo módulo común `core/arrastrar.js`: las cartas de tu mano se pueden **arrastrar** para colocarlas donde quieras (un toque corto sigue eligiendo la carta).
- **Chinchón**: botones Ordenar por *Jugadas* (agrupa tus combinaciones, como antes), *Palo* o *Número*; al ordenar o arrastrar, las cartas que forman jugada llevan una marca verde. Las cartas nuevas se añaden al final en el orden libre.
- **Mus**: Ordenar por *Palo* o *Número* (de mayor a menor) y arrastre libre.
- El orden elegido se guarda con la partida y el modo preferido se recuerda para las siguientes.

## Actualización 12: tipografías sin conexión
- El service worker guarda también las tipografías de Google Fonts (Baloo 2 y Nunito) en una caché propia (`jr-fuentes`) que no se borra al actualizar: sin conexión la app se ve igual que con internet. Si al instalar no hay conexión, la app se instala igual y las fuentes se guardan la próxima vez que se carguen.
- `tools/generar_sw.py` incluye ahora la lógica del propio `sw.js` en la VERSION, para que cualquier cambio en el service worker llegue a los móviles.

## Actualización 13: arreglo del modo sin conexión en GitHub Pages
- **Causa del fallo**: GitHub Pages pasa la web por Jekyll, que no publica las carpetas que empiezan por «_». La plantilla `js/games/_plantilla/` estaba en la lista del service worker; al no existir en la web, la instalación sin conexión fallaba entera y los juegos no abrían sin internet.
- Archivo `.nojekyll` en la raíz: GitHub Pages publica todo tal cual, sin Jekyll.
- `tools/generar_sw.py` deja fuera de la lista las carpetas que empiezan por «_» o «.».
- `sw.js` guarda los archivos uno a uno: si alguno falla, los demás se guardan igual (antes, un solo fallo cancelaba todo).
- **Ajustes → Sin conexión**: indica cuántos juegos están guardados en el dispositivo y permite reintentar la descarga.

## Actualización 14: Hundir la Flota
- **Hundir la Flota** (Tablero): contra la CPU (3 niveles; la difícil calcula la probabilidad de cada casilla) o 2 jugadores en el mismo móvil con pantalla para pasarlo sin ver la flota del otro. Flotas Española (10 barcos), Internacional (5) y Rápida (8×8); barcos que se tocan o no (con agua marcada sola alrededor de los hundidos) y repetir disparo al acertar. Colocación tocando y girando, recolocar tocando un barco, o al azar. Pista sin trampas, barcos restantes de cada bando, efectos de agua/tocado/hundido, revancha, marcador, estadísticas y partida guardada. 🎨 4 colores de mar y 3 de barcos.

## Actualización 15: Rummy de fichas
- **Rummy de fichas** (Tablero, las reglas del clásico de fichas numeradas): 106 fichas con 2 comodines, tú contra 1–3 CPU en 3 niveles. Grupos y escaleras con comodín en cualquier hueco, primera bajada de 30 puntos solo con fichas propias y reorganización libre de la mesa (se valida al terminar el turno; las jugadas incorrectas se marcan en rojo). Mover tocando fichas (varias a la vez) y su destino, deshacer cambios del turno, atril ordenable por color o número y con arrastre, 💡 Sugerir jugada, fichas nuevas de la CPU resaltadas, recuento final, marcador y estadísticas. La CPU difícil parte escaleras y aprovecha fichas sobrantes de la mesa.

## Actualización 16: Juego de la Oca
- **Juego de la Oca** (Tablero): tablero clásico en espiral de 63 casillas, de 2 a 4 jugadores (personas y/o CPU), 1 o 2 dados. Ocas, puentes y dados con sus rimas («de oca a oca y tiro porque me toca»), posada, pozo (hasta que te rescaten o 2 turnos), laberinto, cárcel, muerte, llegada exacta con rebote y la primera tirada 6+3 / 5+4 con dos dados. Fichas que avanzan casilla a casilla, dados animados, sonidos, estadísticas y partida guardada. 🎨 3 tableros.

## Actualización 17: Cinquillo
- **Cinquillo** (Cartas): baraja española de 40 cartas, tú contra 2 o 3 CPU en 3 niveles, partidas a 1, 3 o 5 manos. Empieza el 5 de oros; cada palo se abre con un 5 y crece por arriba y por abajo (7 → sota); si puedes jugar, debes hacerlo. Mesa con las cuatro filas y los huecos donde encajan tus cartas iluminados, cartas jugables marcadas en la mano, mano ordenable por palo/número y con arrastre, recuento de cada mano, marcador y estadísticas. La CPU difícil evita abrir camino a los rivales.
- `core/arrastrar.js`: el orden libre guarda hasta 40 cartas (antes 10).

## Actualización 18: Continental
- **Continental** (Cartas): 2 barajas francesas + 4 comodines, tú contra 1–3 CPU en 3 niveles. 7 rondas de 7 a 13 cartas con los contratos clásicos (dos tríos → tres escaleras). Tríos de 3+, escaleras de 4+ con As abajo o arriba, comodines (nunca más que cartas normales). Botón ⬇️ Bajarse que elige la mejor combinación (cartas del contrato marcadas en verde), colocar cartas en cualquier jugada de la mesa desde el turno siguiente (o ✨ Colocar lo posible), no se puede tirar la carta recién cogida del descarte. Puntuación (2–9 su valor, 10 y figuras 10, As 20, comodín 50), tabla de las 7 rondas, mano ordenable y con arrastre. Si el mazo se agota dos veces, la ronda termina y todos suman.

## Actualización 19: El Rosco
- **El Rosco** (Palabras, la prueba final de los concursos de definiciones): rosco de 25 letras con «empieza por» o «contiene la», banco propio de 250 palabras con definiciones (más las del Crucigrama y, en Difícil, las del Trivial) y sin repetir palabras de roscos recientes. Contrarreloj (2:30, 3:20 o 5:00) o duelo contra la CPU con dos roscos y dos relojes: al fallar o decir pasapalabra le toca al rival. Respuesta con el teclado emergente (con teclas ✔ y ⏩), sin importar las tildes; el reloj se pausa al salir de la app. Soluciones al final, mejor marca, estadísticas y partida guardada.

## Actualización 20: Encadenadas
- **Encadenadas** (Palabras): cada palabra empieza por la última sílaba de la anterior (o la última letra / las dos últimas). Separador de sílabas del español (diptongos, hiatos, grupos consonánticos), diccionario propio de unas 2.500 palabras más las de los demás bancos, «rr» enlaza con «r» y las sílabas sin continuación se relajan a sus dos últimas letras (con aviso). Contra la CPU (la difícil busca dejarte sílabas complicadas), solo (récord de cadena) o en grupo de 2–4 personas. Tiempo por turno (15/30/60 s o sin límite), 3 vidas, teclado emergente, cadena visible con las sílabas de enlace resaltadas. Si una palabra válida no está en el diccionario, la app pregunta y la aprende.

## Actualización 21: categoría Arcade y Serpiente
- Nueva categoría **Arcade** 🕹️ en el Inicio.
- Las estadísticas guardan **récords de puntuación** por modalidad (`api.registrar({ puntos })`, `api.record(variante)`), se muestran en 📊 Estadísticas y viajan en la copia de seguridad.
- **Serpiente**: modos Clásico, Sin paredes y Laberinto; 3 velocidades (puntúan distinto) que se aceleran al comer; 3 tamaños de tablero; manzanas y estrella dorada temporal. Control deslizando el dedo (con giros encadenados), cruceta en pantalla o teclado (flechas/WASD, espacio = pausa) con cola de giros. Pausa automática al salir y partida guardada. Dibujo en canvas con 3 estilos (Jardín, Retro, Neón), ojos que miran hacia donde va, destellos y temblor al chocar.

## Actualización 22: Bloques y naipes sin conexión
- **Bloques** (Arcade, el clásico de piezas que caen): tablero 10×20, bolsa de 7 piezas, giros SRS con empujones en paredes, pieza fantasma, reserva, 3 piezas siguientes y medio segundo de gracia al tocar el suelo. Puntuación por líneas (sencilla → cuádruple), combos, cuádruples seguidos y T-giros; nivel y velocidad cada 10 líneas. Modos Maratón (nivel inicial a elegir), Sprint 40 líneas (récord de tiempo) y Ultra 2 minutos. Gestos táctiles (tocar = girar, arrastrar = mover, golpe abajo = dejar caer, golpe arriba = reservar), botones con repetición y teclado. 3 paletas, letreros de líneas y destellos, pausa automática y partida guardada.
- **Naipes de imagen sin conexión**: las imágenes de `img/cartas` se guardan en su propia caché (`jr-cartas`), que no se borra al actualizar. La app las descarga en segundo plano (solo las que falten) leyendo `barajas.json`, y quita las de barajas que ya no estén.

## Actualización 23: Rompe-Ladrillos
- **Rompe-Ladrillos** (Arcade): 12 niveles diseñados (más un modo de niveles aleatorios simétricos), que vuelven a empezar más rápidos tras el último; los niveles alcanzados se desbloquean para empezar desde ellos. Ladrillos de colores, resistentes de 2 y 3 golpes (con grietas), de metal y sorpresa. 6 cápsulas: pala ancha, multibola, bola lenta, láser, bola de fuego y vida extra. Ángulo según el punto de la pala, aceleración progresiva, física por subpasos (la bola nunca atraviesa un ladrillo) y desvío automático si la bola queda atrapada en un circuito sin romper nada. Control con el dedo en movimiento relativo (no tapa la pala), ratón o teclado. Partículas, avisos de cápsula, combos, bonus por vidas, récords, pausa automática y partida guardada. 🎨 3 fondos.

## Actualización 24: arreglo de fichas perdidas en Texas Hold'em
- **Fallo**: cuando un jugador quedaba all-in con menos de lo apostado (por ejemplo, una ciega grande corta) y otro se retiraba habiendo puesto más de lo que ese all-in podía cubrir, el exceso no se repartía a nadie y esas fichas desaparecían de la partida.
- **Arreglo**: el dinero que ningún jugador en la mano puede disputar se devuelve a quien lo apostó, como en el póker real; el resultado lo indica («se devuelven 60 a Ana»). Comprobado en más de 100.000 manos simuladas sin perder ninguna ficha.
- Pruebas: regresión del Hold'em con el caso exacto, pruebas de Bloques y Rompe-Ladrillos añadidas a la batería, y la de «perder vida en el Rompe-Ladrillos» ya no depende del azar.

## Global
Inicio por categorías con estado de la partida en curso («Continuar · Medio · 32/81»), cabecera con atrás y menú ⋯, rutas por hash (el botón atrás de Android funciona), estadísticas por juego, ajustes (tema, sonidos Web Audio, vibración), copia de seguridad v2 compatible con v1, PWA instalable sin conexión.

## Actualización 3.26: Vuela Alto (Arcade)
- Juego estilo Flappy Bird: mantener pulsado = subir, soltar = bajar. 24 niveles de 700 a ~2.800 m, 8 escenarios, tubos móviles, pájaros, dobles huecos y hélices; estrellas por monedas, desbloqueo progresivo y modo Infinito con podio.
- Opciones: dificultad, afluencia de obstáculos, velocidad, control (suave/normal/ágil) y peligros. Apariencia: Personaje (de Sokoban), Escenario, Fondo y Fondo de pantalla.
- Motor sin DOM (`motor.js`) con mundo generado de forma repetible; `tests/vuelaalto.mjs` comprueba los 24 niveles con un piloto automático.

## Actualización 3.27: Quantix (Arcade)
- Estilo Qix/Volfied con cuadrados que se arrastran desde una zona ya descubierta; 12 niveles, 3 tipos de jefe (rebotador, errante, cazador) y 4 niveles de IA. Imágenes: escenarios de Worms.
- Motor sin DOM (`motor.js`); `tests/quantix.mjs` comprueba reglas, guardado y que los 12 niveles se superan con un piloto con mirada hacia delante.

## Actualización 3.28: ajustes de Vuela Alto y Quantix
- Niveles siempre progresivos y ocultos hasta desbloquearlos; tablero encajado al espacio disponible (`encajar()`), fijo y sin zoom.
- Quantix: 20 niveles = 4 grupos de jefes × 5 velocidades (6 a 16 celdas/s antes de la IA).
