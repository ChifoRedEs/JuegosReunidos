# Imágenes de cartas

Todo lo que pongas aquí aparece en **🎨 Apariencia** de los juegos de cartas. Por defecto el tapete, la baraja y el dorso son **🎲 Aleatorios**: se sortea una al abrir el juego y en cada partida nueva (se puede fijar una concreta).

| Carpeta | Qué va dentro | Juegos que la usan |
|---|---|---|
| `espanola/<MAZO>/` | una baraja española por carpeta | Brisca, Chinchón, Mus, Cinquillo |
| `francesa/<MAZO>/` | una baraja francesa por carpeta | BlackJack, Klondike, Texas Hold'em, Continental |
| `dorsos/` | imágenes de dorso (valen para las dos barajas) | todos los de cartas |
| `tapetes/` | fondos de mesa (webp de ~1280 px de ancho, 50–170 KB). `nombres.json` permite poner tildes | todos los de cartas, Rummy y los tableros |
| `fondos/` | fondos de pantalla ambientados (escenarios). **Solo** se ofrecen en juegos de Arcade (Worms, Serpiente, Bloques, Rompe-Ladrillos, Air Hockey); nunca en cartas ni tableros, donde distraen | Arcade |

## Nombres de archivo (respeta mayúsculas)
- **Española** (`NN-X`): `01-O.webp` … `12-O.webp`. NN = 01–07, 10, 11, 12 (los 08 y 09 se permiten pero no se usan). X = **O** oros · **C** copas · **E** espadas · **B** bastos.
- **Francesa** (`NN-X`): `01-P.webp` … `13-P.webp`. NN = 01 (As) … 11 (J), 12 (Q), 13 (K). X = **P** picas · **C** corazones · **D** diamantes · **T** tréboles.
- `00.webp` dentro de un mazo = comodín (opcional). Lo usan Continental (francesas) y Chinchón (españolas) cuando se juega con comodines; si falta, se dibuja uno.
- `info.json` dentro de un mazo (opcional): `{"nombre": "Mi baraja"}` cambia el nombre que se ve en la app.
- Dorsos: cualquier nombre (`azul.webp`, `rojo.webp`…). El nombre del archivo es el que se ve; `dorsos/nombres.json` permite poner tildes.

## Formato recomendado
WebP (también valen PNG y JPG), unos **360 px de ancho**, 25–30 KB por carta. Proporción: española ≈ 1 : 1,55 · francesa ≈ 1 : 1,4.
Para reducir tus originales: `python tools/optimizar_imagenes.py ORIGEN DESTINO`.

## No toques `barajas.json`
Lo genera GitHub solo (`tools/generar_barajas.py`) cada vez que subes imágenes aquí; es el índice que lee la app.
Un mazo incompleto no se publica: el resultado (y las cartas que faltan) aparece en la pestaña **Actions** del repositorio.
