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

## Global
Inicio por categorías con estado de la partida en curso («Continuar · Medio · 32/81»), cabecera con atrás y menú ⋯, rutas por hash (el botón atrás de Android funciona), estadísticas por juego, ajustes (tema, sonidos Web Audio, vibración), copia de seguridad v2 compatible con v1, PWA instalable sin conexión.
