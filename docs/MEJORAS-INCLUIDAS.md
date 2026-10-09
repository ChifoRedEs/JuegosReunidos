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

## Global
Inicio por categorías con estado de la partida en curso («Continuar · Medio · 32/81»), cabecera con atrás y menú ⋯, rutas por hash (el botón atrás de Android funciona), estadísticas por juego, ajustes (tema, sonidos Web Audio, vibración), copia de seguridad v2 compatible con v1, PWA instalable sin conexión.
