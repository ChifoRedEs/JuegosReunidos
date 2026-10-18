# Diccionario español de Juegos Reunidos

`lemas-<hash>.txt` contiene las ~47.000 palabras base (sin conjugar), con tildes: sustantivos y adjetivos (línea `n:`) y
verbos en infinitivo (línea `v:`). La usan Encadenadas, la Sopa de letras y el Ahorcado. No están ordenadas por frecuencia.

`es-<hash>.txt` contiene unas 592.000 palabras de 2 a 15 letras (con plurales, femeninos y conjugaciones), en minúsculas
y sin tildes, agrupadas por longitud. Lo usa `js/core/diccionario.js` en los juegos de palabras. **No se edita a mano**:
se genera con `python tools/generar_diccionario.py`.

## Origen y licencia
Se obtiene del **diccionario español para corrección ortográfica de LibreOffice / Apache OpenOffice** (proyecto RLA-ES),
versión genérica `es_ANY` 2.1, de **Santiago Bosio**. Ese diccionario se distribuye bajo un triple esquema de licencias
a elegir: **GNU GPL 3** o posterior, **GNU LGPL 3** o posterior, o **MPL 1.1** o posterior. Juegos Reunidos usa la lista de
palabras bajo la **MPL 1.1**.

Los archivos originales (`es_ANY.aff`, `es_ANY.dic` y su `README_es_ANY.txt`) están sin modificar en `tools/diccionario/`.
Cambios hechos al generar la lista: se expanden todas las formas con las reglas de afijos, se quitan nombres propios, tildes
y diéresis, se dejan solo las palabras de 2 a 15 letras y se añaden las de `tools/diccionario/extra.txt` (palabras que
faltaban, como «pingüino», «quirófano» o «ñu»).

Proyecto original: https://github.com/sbosio/rla-es · Diccionarios de LibreOffice: https://github.com/LibreOffice/dictionaries
