# Cómo añadir un juego

1. Copia `js/games/_plantilla` a `js/games/<id>` (por ejemplo `conecta4`).
2. En `index.js` exporta `mount`, `unmount`, `validar`, `migrarV1`, `resumen` (la plantilla explica cada una y la `api` que recibes).
3. Da de alta el juego en `js/registry.js` (id, nombre, icono, color, categoría, descripción y el `import()`), y quítalo de `PROXIMAMENTE`.
4. Pon la lógica sin DOM en `reglas.js` (o `generador.js`, `ia.js`) para poder probarla con Node; añade pruebas en `tests/motores.mjs`.
5. Estilos del juego en `<id>.css`, cargados con `await api.css(new URL('./<id>.css', import.meta.url))`. Usa las variables de `base.css` (`--ink`, `--card`, `--blue`…) para que funcione el tema oscuro.
6. Ejecuta `node tests/motores.mjs` y `python tools/generar_sw.py`.

## Buenas prácticas del proyecto
- Guarda tras cada cambio con `api.guardar(...)`; `validar` debe rechazar cualquier dato raro (usa `Object.hasOwn`, comprueba tipos y rangos).
- No reescribas todo el `innerHTML` en cada acción: reutiliza los elementos para conservar el foco del teclado.
- Confirma (`api.confirmar`) antes de descartar una partida con progreso.
- Casillas tocables ≥ 44 px cuando sea posible, `aria-label` en los controles y `touch-action: manipulation`.
- Limpia temporizadores y listeners en `unmount`.
- Para IA de tablero usa `core/ia/minimax.js`; para cartas, `core/cartas.js` + `css/cartas.css`.

## Juegos de dos jugadores por turnos (CPU o persona)
Si tu juego es de tablero y por turnos (Reversi, Cuatro en línea, Hundir la flota con dos jugadores…), no escribas el controlador: usa `core/duelo.js`.
Mira `js/games/tresenraya/` y `js/games/conecta4/` como modelo. Solo aportas:
- `reglas.js`: `VARIANTES`, `estadoInicial`, `jugadas`, `aplicar`, `validarEstado`, `ia` (con `core/ia/minimax.js`) y `reglasHTML`. Sin DOM, así se prueba con Node.
- `index.js`: la vista (`montar` / `pintar`) y la llamada `crearDuelo({...})`.
Con eso tienes gratis: varios tableros, contra CPU (3 niveles) o 2 jugadores, quién empieza, marcador, deshacer, pista, estadísticas y guardado.

## Apariencia personalizable
Cualquier juego puede ofrecer 🎨 Apariencia con una línea: `asp = api.aspecto(defs, alCambiar)`.
- `defs` = grupos `{ clave, titulo, def, opciones:[{ id, nombre, sw? }] }`. `core/aspectos.js` trae `grupoTablero()` con 4 paletas comunes.
- El valor elegido de cada grupo se escribe como `data-<clave>` en el contenedor del juego (`.juego-<id>`), así que el estilo se hace en CSS: `.juego-miJuego[data-forma="estrella"] ...`. En JS lees `asp.valores.<clave>`.
- Añade en tu menú `{ texto: '🎨 Apariencia', accion: () => asp.abrir() }`. En juegos hechos con `core/duelo.js` basta con pasar `aspecto: [...]` en la definición.
