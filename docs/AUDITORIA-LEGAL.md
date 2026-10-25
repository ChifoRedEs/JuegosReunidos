# Auditoría de propiedad intelectual (para Google Play) · 25/10/2026

Revisión técnica de riesgos; **no es asesoramiento jurídico**. Antes de publicar conviene que un abogado de PI lo confirme y, si puede ser, una búsqueda de marcas en OEPM/EUIPO/USPTO.

## 🔴 Riesgo ALTO (conviene resolver antes de subir)
| Elemento | Problema | Solución propuesta |
|---|---|---|
| **Memorama · banco «Pokémon»** (`img/memorama/pokemon/`, 55 imágenes + `bancos.js`) | Personajes y nombres protegidos (Nintendo/Game Freak/The Pokémon Company). Es de los motivos más habituales de retirada en Play (política de Propiedad Intelectual). | Eliminar el banco (carpeta + entrada en `bancos.js`) o sustituirlo por criaturas propias. |
| **Magnate Urbano** | Las casillas usan marcas reales (Uber, Lyft, Airbnb, Spotify, Netflix, Disney+, Hulu, Apple, Microsoft, Nvidia, Intel, AMD, Samsung, Sony, LG, Reddit, X, Pinterest, Twitch, SoundCloud, Mastodon, Bluesky). Un aviso en comentarios no sirve: Play puede considerarlo uso de marcas ajenas / suplantación. | Cambiar por empresas **ficticias** (p. ej. «Ridely», «Streamio», «Chipton»). |
| **Worms** (nombre, armas y fondos) | «Worms» es marca de Team17; «Granada Sagrada» y «Cuerda Ninja» reproducen armas icónicas de la saga; Quantix y los fondos usan «escenarios de Worms» (`img/cartas/fondos/`, imágenes que aportaste: si son capturas/arte del juego original, son suyas). | Renombrar (p. ej. «Gusanos de Guerra» o «Batalla de Gusanos»), renombrar armas («Granada Divina», «Cuerda»), y usar solo fondos propios o con licencia. |
| **Hotel** | Juego de Milton Bradley/Hasbro: la app copia sus **reglas, precios y tarifas de la edición 1986-1992** y el nombre «Hotel» (marca en España) y «el clásico de Milton Bradley» aparece en la descripción. Las reglas en sí no se protegen, pero los datos tan específicos + el nombre + la mención sí te exponen. | Renombrar («Gran Hotelero»), quitar toda mención a Milton Bradley, y cambiar precios, nombres de hoteles y casillas por otros propios. |
| **Imágenes sin origen acreditado**: barajas ESP-01/02, FR-01/02, dorsos, tapetes, fondos, coches de Memorama | Si no las has creado tú o no tienen licencia que permita uso comercial, hay riesgo (la baraja española de Fournier, por ejemplo, tiene derechos). Los coches (Audi, BMW, Alfa Romeo, DS, Citroën…) son además fotos/logotipos de marcas. | Confirmar autoría/licencia de cada una (guárdala). Memorama «coches»: sustituir por vehículos genéricos o ilustraciones propias. |

## 🟠 Riesgo MEDIO (nombres con marca registrada)
| Juego | Marca | Propuesta de nombre |
|---|---|---|
| **KenKen** | Marca registrada (Nextoy LLC), la más estricta de la lista | **Calcudoku** (término genérico) |
| **Trivial** | Trivial Pursuit (Hasbro/Horn Abbot) | «Saberes», «Cultura Total» |
| **Scrabble** | Marca de Hasbro/Mattel; el diseño del tablero y las puntuaciones son muy reconocibles | «Palabras Cruzadas» / «Crucipalabras» y distribución de puntos y casillas propia |
| **Cifras y Letras** | Formato de TV (Countdown) y título del programa de TVE | «Números y Letras» |
| **Ruleta de la Suerte** | Wheel of Fortune (Sony) | «Ruleta de Palabras» |
| **El Rosco** / botón «Pasapalabra» | Pasapalabra es marca de formato (ITV/Mediaset) | Mantener «Rosco» como nombre genérico y cambiar el botón a «Paso» / «Seguir» |
| **Mastermind** | Marca registrada (Invicta/Pressman) | «Código Secreto», «Descifra» |
| **Conecta 4** | Connect Four (Hasbro) | «4 en línea» |
| **Sokoban** | Marca en Japón (Falcon/Thinking Rabbit) | «Empuja Cajas» / «Almacén» |
| **Parchís** | Nombre comercial en España (Hasbro/MB, Educa); muy usado como genérico | «Parchís» suele tolerarse como genérico; si quieres cero riesgo, «Parchís Clásico» → «Ludo» |
| **Buscaminas** | Minesweeper (Microsoft) | Nombre genérico en español, riesgo bajo; «Campo Minado» si prefieres evitarlo |
| **Kakuro / Nonogram / Klotski / Memorama / Sudoku** | Genéricos o sin registro relevante | Se pueden mantener |
| **¿Qué cara tienes?** | Parecido de concepto con «¿Quién es quién?» (Hasbro), pero con nombre y arte propios | Sin cambios |
| **Vuela Alto / Quantix** | Mecánica (Flappy Bird, Qix) no protegible; los nombres son propios | Sin cambios (no usar los nombres «Flappy» ni «Qix» en ficha de Play) |
| **Bloques** | Mecánica tipo Tetris: «Tetris» está protegido también por su *aspecto* (trade dress) | Evitar tetrominós con los colores clásicos de Tetris y los nombres «Tetris» en la ficha de la tienda |

## 🟢 Sin riesgo apreciable
Ajedrez, Damas, Dominó, 3 en raya, Sopa de letras, Crucigramas, BlackJack, Klondike, Spider, Carta Blanca, Texas Hold'em, Póker, Corazones, Brisca, Chinchón, Mus, Cinquillo, Continental, Rummy (nombre genérico), Oca, Batalla Naval (nombre nuevo; «Battleship» es de Hasbro, pero el juego y el nombre en español son genéricos), Ahorcado, Encadenadas, Serpiente, Rompe-Ladrillos, Air Hockey, Billar, Magnate Urbano (una vez cambiadas las marcas).

## 🔵 Licencias de terceros (cumplir condiciones)
- **Three.js** (MIT): conservar `js/vendor/three.LICENSE` (ya está).
- **Vue Color Avatar** (MIT): conservar `LICENSE-vue-color-avatar.txt` (ya está) y añadir crédito en la app (Ajustes → Acerca de).
- **Diccionario RLA-ES** (MPL 1.1 / LGPL / GPL): MPL 1.1 exige conservar el aviso y ofrecer el código de esos archivos (ya documentado en `data/diccionario/LEEME.md`); añadir crédito en Acerca de.
- **Fuentes Baloo 2 y Nunito** (SIL OFL): se cargan desde Google Fonts, es lícito, pero la app deja de ser 100 % offline y envía la IP a Google: menciónalo en la política de privacidad o aloja las fuentes tú (también mejora el uso sin conexión).
- **Emojis**: se muestran con la fuente del sistema (Noto Emoji en Android), sin problema.
- **Descripciones de preguntas (Trivial) y definiciones (Rosco/Crucigramas)**: confirma que son de autoría propia o generadas; si se copiaron de un diccionario (p. ej. el de la RAE) hay derechos sobre las definiciones.

## 📋 Requisitos de Google Play (aparte de copyright)
- **Política de privacidad** (URL) obligatoria; declaración de «Seguridad de los datos».
- Juegos de **azar simulado** (Póker, BlackJack, Ruleta, Hold'em): sin dinero real; clasificación por edad adecuada y no usar «casino» en la ficha. 
- No usar en la ficha ni capturas nombres/logos de terceros (Monopoly, Pokémon, Worms, Tetris, etc.).
- Dejar constancia del origen de cada imagen (hoja «Créditos y licencias»).
