# Marca · Juegos Reunidos

Una sola identidad visual para los 41 juegos. Vive en `css/marca.css` (se carga después de `css/base.css`).

## Identidad
- **Colores:** degradado de marca morado → azul (`--grad-marca`), acento amarillo para el foco, rojo para peligro, verde para éxito. Los colores de cada juego (`color` en `registry.js`) solo se usan en su ficha de Inicio.
- **Tipografías:** títulos y botones principales en *Baloo 2* (`--f-titulo`); texto en *Nunito* (`--f-texto`).
- **Formas:** esquinas redondeadas `--r-s` 10 · `--r-m` 14 · `--r-l` 20 · `--r-xl` 24; sombras suaves `--sombra-s/m` y sombra de marca `--sombra-marca` para el botón principal.
- **Tema:** claro y oscuro automáticos con las variables de `base.css` (`--bg`, `--ink`, `--card`, `--line`…).

## Botones
| Clase | Uso |
|---|---|
| `.btn` | Botón normal (borde, fondo de tarjeta). 44 px de alto mínimo. |
| `.btn.on` | Opción elegida o acción principal (degradado de marca). |
| `.btn.grande` | Acción principal destacada (54 px). |
| `.btn.danger` | Acción destructiva (texto rojo). |

## Menú de partida (igual en todos los juegos)
Estructura que deben seguir las pantallas de «nueva partida»:

```html
<p class="note">Una o dos frases explicando el juego.</p>
<div class="bar"><span class="lbl">Nivel</span><div class="seg"><button class="btn on">Fácil</button>…</div></div>   <!-- fila de opciones -->
<label class="chk"><input type="checkbox"><span><b>Opción</b>: explicación</span></label>                          <!-- sí / no -->
<div class="bar"><button class="btn on" data-ac="start">Empezar</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>
```
- Una fila `.bar > .lbl + .seg` se pinta con la etiqueta encima en mayúsculas pequeñas y las opciones repartidas en todo el ancho.
- La barra que contiene el botón `data-ac="aspecto"` es la **barra de acciones**: el primer botón `.btn.on` ocupa todo el ancho y el resto se reparte debajo.
- Filas de jugadores (Persona / CPU / Nadie): `.jugfila` con `--c` (color), `.jf-dot`, `input.nom` y `.seg`.
- Ajustes plegables: `<details class="ops"><summary>…</summary>…</details>`.
- Los menús **no llevan imagen de fondo** (el «Fondo de Tablero» solo se aplica al tablero).

## Ventanas y fichas de Inicio
- `.hoja` (ventana inferior) con título `h2` y botón «Cerrar» o «Cancelar».
- Juegos agrupados (`GRUPOS` en `registry.js`): una sola ficha en Inicio y, al pulsarla, una ventana `.elegir` con una tarjeta `.eleg` por juego.

## Vistas 3D
Los juegos con Three.js usan el contenedor `.e3d` (cuadrado, con fondo degradado que sigue los colores de tablero y el modo oscuro) y los botones flotantes `.e3d-cam` (⟳ ⤒ ⌖), definidos en `css/marca.css`. El grupo de Apariencia «Vista del tablero» (3D / 2D) va siempre el primero. Detalles técnicos en `ANADIR-JUEGO.md` («Juegos en 3D»).
