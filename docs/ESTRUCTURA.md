# Estructura común de las pantallas de juego

Todos los juegos comparten el mismo esqueleto; solo cambia el **espacio de juego** (tablero, mesa, canvas…).

## Lo que pone la aplicación (no lo toca cada juego)
- Cabecera con el banner y el nombre del juego, y la navegación por rutas (sellos).
- Estilos comunes de botones, selectores (`.seg`), tarjetas y paletas de tablero (`grupoTablero`).
- Barra inferior de partida (`api.barraHtml()`): Nueva partida · Configurar · Apariencia · Reglas · Pausa / Salir.
- Diálogo de victoria con sello (`api.registrar({ res: 'victoria' })`), estadísticas, logros y compartir.

## Pantalla de menú de un juego (antes de jugar)
1. `<p class="note">` con la presentación del juego → se ve como un **billete** con filete coral.
2. Filas `<div class="bar"><span class="lbl">Modo</span>…</div>` → etiqueta en versalitas con línea discontinua, selector `.seg` debajo.
3. Botón principal («Jugar», «Nueva partida»…) y, debajo, «Apariencia» / «Reglas».

## Pantalla de partida
1. **Marcador**: `.info` (una línea con estado + tiempo) o las tarjetas de marcador `.duM` de los juegos a dos → cartas de papel con borde de tinta.
2. **Mensaje**: `.msg` (turno, avisos) → tira discontinua centrada; vacío = invisible.
3. **Espacio de juego**: propio de cada juego, con colores `--tb-*`.
4. Controles propios del juego (teclado numérico, Deshacer, Pista…).
5. Barra inferior `api.barraHtml()`.

## Al hacer un juego nuevo
Usa estas clases y no inventes otras para marcador, mensaje, filas de menú o botones. Los colores del espacio de juego salen de `--tb-*` (claro y oscuro ya resueltos).
