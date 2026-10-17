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

## Teclado emergente para juegos de letras
Si tu juego necesita escribir letras en casillas, no pongas un teclado fijo bajo el tablero: usa `core/teclado.js`.
`const tk = crearTeclado({ filas: ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM'], borrar: true, alPulsar: l => …, titulo: '…' })`.
Ábrelo con `tk.abrir()` al tocar una casilla; se arrastra desde su barra y se cierra con ✕. Con `tk.actualizar((letra, boton) => …)` marcas teclas usadas o desactivadas, `tk.titulo(texto)` cambia el rótulo y `tk.destruir()` va en `unmount`. Modelos: Crucigrama, El Ahorcado y Ruleta de la Suerte.

## Juegos de cartas: baraja y dorso de imagen
Si el juego usa `core/cartas.js`, añade a su `api.aspecto([...])` `grupoBarajaEs()` (baraja española, `cartaEsHTML`) o `grupoBarajaFr()` (francesa, `cartaHTML`), junto a `grupoMesa()` y `grupoDorso()` (este ya incluye los dorsos de `img/cartas/dorsos`). No hace falta tocar el HTML de las cartas: cada carta lleva `data-k` y el CSS de imagen se genera desde `img/cartas/barajas.json`.

## Funciones nuevas de la API (versión con logros y retos)
- `api.reto`: Reto del día. `api.reto.generar(fn)` ejecuta tu generador con una semilla fija por día y juego (mismo tablero para todos); `generarAsync(fn)` si el generador es asíncrono. `api.reto.hecho()`, `api.reto.completar()` (cuenta para los 🏅 logros), `api.reto.fecha()` y `api.reto.texto(fecha)`. Guarda `reto: fecha` con la partida. La tarjeta visual usa las clases `.reto` / `.reto.hecho` de base.css.
- `api.podio`: tabla local de los 10 mejores (arcade). `api.podio.entra(variante, valor, menos)`, `await api.podio.anotar(variante, valor, menos)` (pide el nombre) y `api.podio.html(variante)`. `menos = true` cuando gana el tiempo más bajo.
- `api.pedirTexto(titulo, { valor, max, nota, tipo, placeholder })` → Promise con el texto o `null`. `tipo: 'password'` oculta lo que se escribe; `tipo: 'area'` da un cuadro de varias líneas.
- `api.compartir(texto)`: hoja de compartir del sistema o portapapeles. El menú de cada juego ya trae «📤 Compartir resultado» automáticamente.
- `api.modal(titulo, html)` devuelve `{ cuerpo, cerrar }` para añadir eventos al contenido.
- `core/historial.js`: `anotarPartida(api, { res, texto })` + `htmlPartidas(api)` para el historial de partidas; `seguir(H, finDeMano, puntos)` + `htmlTabla(nombres, H.filas)` para la tabla mano a mano.
- `core/ia/remoto.js`: `await enSegundoPlano(urlModulo, 'funcion', [args], funcionLocal)` ejecuta una IA en un Worker (con respaldo en el hilo principal). En `crearDuelo` basta con pasar `iaModulo: new URL('./reglas.js', import.meta.url).href`.
- Hojas de estilo: las de cada juego solo están activas mientras el juego está abierto; las de `/css/` (cartas.css) son comunes.
- Bucles de animación: no leas `api.record()` ni reescribas el HTML del marcador en cada fotograma (léelo una vez y escribe solo si cambia).
