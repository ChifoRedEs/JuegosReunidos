// Niveles de la campaña del Encajados: originales de JugamiGO (unos diseñados a mano y otros creados con el
// generador del juego con semillas fijas y elegidos por dificultad). No son copia de ninguna colección publicada.
// 60 niveles en 3 tramos de 20 (dif: facil = pequeño, 2 cajas · medio = mediano, 3 cajas · dificil = grande, 4-5 cajas), de menos a más
// empujes dentro de cada tramo. Los 20 primeros de siempre se han reubicado según su tamaño; el resto salen del generador con semilla fija
// y se han comprobado con el resolvedor del juego.
// Para añadir uno: copia el formato (# muro · . meta · $ caja · * caja en meta · @ jugador · + jugador en meta)
// y comprueba con `node tests/motores.mjs` que tiene solución.
export const NIVELES = [
  { dif: 'facil', nombre: 'Primer empujón', mapa: `
#######
#@ $ .#
#######
` },
  { dif: 'facil', nombre: 'Pasillo', mapa: `
########
#  .   #
# #$## #
# @  $.#
########
` },
  { dif: 'facil', nombre: 'La esquina', mapa: `
######
#.   #
# $# #
# $@ #
#.   #
######
` },
  { dif: 'facil', nombre: 'Estantería', mapa: `
#######
###@###
#  $  #
#.$  ##
##   ##
##  .##
#######
` },
  { dif: 'facil', nombre: 'Carretilla', mapa: `
######
#  ###
#  . #
#   .#
##$$##
##@ ##
######
` },
  { dif: 'facil', nombre: 'Palé', mapa: `
######
###  #
###  #
#@$  #
## $ #
##.. #
######
` },
  { dif: 'facil', nombre: 'Montacargas', mapa: `
#######
#     #
#.   ##
#.$ $@#
#   ###
#######
` },
  { dif: 'facil', nombre: 'Dos cajas', mapa: `
#######
#.  $ #
#  @  #
# $  .#
#######
` },
  { dif: 'facil', nombre: 'Andén', mapa: `
#######
###@  #
###$$##
###  ##
###  ##
#  .. #
#######
` },
  { dif: 'facil', nombre: 'Pasarela', mapa: `
#######
#### ##
###. ##
###   #
#@$   #
# $.  #
#######
` },
  { dif: 'facil', nombre: 'Silo', mapa: `
######
##@  #
##$ .#
#  $ #
#   .#
######
` },
  { dif: 'facil', nombre: 'Cruce', mapa: `
  ####
###  ##
# $ $ #
#. @ .#
##   ##
 #####
` },
  { dif: 'facil', nombre: 'Rampa', mapa: `
#######
#     #
#   $ #
## $+##
## .###
#######
` },
  { dif: 'facil', nombre: 'Compuerta', mapa: `
######
## . #
##$ .#
#  $ #
#  @ #
######
` },
  { dif: 'facil', nombre: 'Embudo', mapa: `
######
## @##
##$$##
#    #
#   .#
#.   #
######
` },
  { dif: 'facil', nombre: 'Cobertizo', mapa: `
#######
####. #
#@$  .#
# $   #
###   #
#######
` },
  { dif: 'facil', nombre: 'Torre', mapa: `
#######
##### #
### ..#
#@$   #
## $  #
##  ###
#######
` },
  { dif: 'facil', nombre: 'Escalón', mapa: `
######
##. ##
#@$ ##
##.  #
## $ #
##   #
######
` },
  { dif: 'facil', nombre: 'Rincón', mapa: `
#######
###@  #
# $$ ##
#    ##
#.  .##
#######
` },
  { dif: 'facil', nombre: 'Hangar', mapa: `
######
# .@##
#. $##
#    #
## $ #
##   #
######
` },
  { dif: 'medio', nombre: 'Almacén', mapa: `
#######
#.  # #
# $   #
#.$# @#
#  $ .#
#######
` },
  { dif: 'medio', nombre: 'Taller', mapa: `
#######
#. @###
# $$###
# $  ##
##   ##
# . .##
#     #
#######
` },
  { dif: 'medio', nombre: 'Cámara fría', mapa: `
#######
#  ####
#   ###
#   $@#
#  $ ##
#..$.##
###  ##
#######
` },
  { dif: 'medio', nombre: 'Trastienda', mapa: `
#######
#  . .#
##  $ #
#@$   #
## $  #
#### .#
##### #
#######
` },
  { dif: 'medio', nombre: 'Depósito', mapa: `
########
####  .#
#@$  $ #
###..  #
#### $ #
###    #
###### #
########
` },
  { dif: 'medio', nombre: 'Granero', mapa: `
########
#..    #
#@$  $ #
#  # ###
# $  ###
#  . ###
########
` },
  { dif: 'medio', nombre: 'Aduana', mapa: `
#######
# .####
# $ ..#
# $   #
#@$   #
###  ##
#######
` },
  { dif: 'medio', nombre: 'Esclusa', mapa: `
#######
###@# #
#. $  #
#     #
# $ $ #
#..   #
#######
` },
  { dif: 'medio', nombre: 'La U', mapa: `
#########
#.  #   #
# $ # $ #
#   @   #
# $   ..#
###   ###
  #####
` },
  { dif: 'medio', nombre: 'Rellano', mapa: `
########
#  $.  #
#   $. #
####   #
####$. #
####@# #
###### #
########
` },
  { dif: 'medio', nombre: 'Tres en fila', mapa: `
########
#      #
# $$$  #
# #  # #
#  ...@#
########
` },
  { dif: 'medio', nombre: 'Zócalo', mapa: `
########
#.  ####
#      #
# $$ $ #
#.+    #
########
` },
  { dif: 'medio', nombre: 'Vagón', mapa: `
########
#  @   #
# $$$  #
## .#  #
### .. #
###### #
########
` },
  { dif: 'medio', nombre: 'Laberinto', mapa: `
######
##   #
## $ #
# $  #
#    #
# .$ #
#. @.#
######
` },
  { dif: 'medio', nombre: 'Dársena', mapa: `
########
## $  .#
#@$ .. #
##  $# #
####  ##
##    ##
####  ##
########
` },
  { dif: 'medio', nombre: 'Patio', mapa: `
########
##     #
#@$ $$ #
###.  ##
#. .  ##
#  #####
########
` },
  { dif: 'medio', nombre: 'Faro', mapa: `
#######
#  ## #
# $.  #
#@$  .#
##$  .#
#     #
#######
` },
  { dif: 'medio', nombre: 'Muelle', mapa: `
########
#      #
#  $ $ #
# $#####
# +.. ##
# ##  ##
########
` },
  { dif: 'medio', nombre: 'Bodega', mapa: `
#######
####@##
### $ #
###   #
#  $$ #
#     #
#..  .#
#######
` },
  { dif: 'medio', nombre: 'Atalaya', mapa: `
########
#####  #
#  ##$ #
#. ##  #
#..  $@#
#  # $ #
####  ##
########
` },
  { dif: 'dificil', nombre: 'Cantera', mapa: `
########
### @###
#  $$ ##
#    $##
#   $.##
# .  . #
#  .   #
########
` },
  { dif: 'dificil', nombre: 'Bóveda', mapa: `
#########
###     #
##@$ $$.#
##$   . #
#     . #
#   . ###
#########
` },
  { dif: 'dificil', nombre: 'Galería', mapa: `
#########
### . ###
#.    # #
# $$  $+#
# . $ # #
#     ###
#  ######
#########
` },
  { dif: 'dificil', nombre: 'Mirador', mapa: `
#######
## @ ##
###$$##
##  . #
# $   #
# .$$ #
# . . #
#.    #
#######
` },
  { dif: 'dificil', nombre: 'Claustro', mapa: `
########
###@  ##
###$$$##
#   .  #
#  .$  #
#      #
# .   .#
########
` },
  { dif: 'dificil', nombre: 'Cripta', mapa: `
#########
#    .  #
# $     #
# $$ .  #
# #. $ .#
# ###@###
# #######
#########
` },
  { dif: 'dificil', nombre: 'Foso', mapa: `
#######
#     #
# $ $ #
#  . .#
##    #
##  # #
## $#.#
#@$ . #
#######
` },
  { dif: 'dificil', nombre: 'Garita', mapa: `
#########
##   ####
# $  ## #
#    .$.#
# $   $+#
#  .  # #
#########
` },
  { dif: 'dificil', nombre: 'Pantano', mapa: `
#########
###     #
#### $ ##
#     .##
#  $ ####
# .  $@##
#   $ ###
#..######
#########
` },
  { dif: 'dificil', nombre: 'Ribera', mapa: `
#########
#    .  #
# .# .  #
#     ###
##  $$###
##$$ .###
## @#####
#########
` },
  { dif: 'dificil', nombre: 'Puerto', mapa: `
########
##   ###
#   $ ##
# $. $@#
#  $  ##
#    .##
# .#####
# .#####
########
` },
  { dif: 'dificil', nombre: 'Sótano', mapa: `
#########
# #   ###
#   $   #
#  $@$ .#
# $## . #
#   ..  #
#########
` },
  { dif: 'dificil', nombre: 'Terraza', mapa: `
#########
###   . #
##  $ $ #
# $     #
#@$     #
####. # #
####..###
#########
` },
  { dif: 'dificil', nombre: 'Umbral', mapa: `
#########
# ..   .#
####  $ #
## $ $  #
##@$   .#
######  #
####    #
#########
` },
  { dif: 'dificil', nombre: 'Gran almacén', mapa: `
#######
## @ ##
##$$$ #
##    #
#     #
# .$ .#
# .  .#
#######
` },
  { dif: 'dificil', nombre: 'Fábrica', mapa: `
#######
# @  ##
##$$ ##
##  ###
#  $  #
# $   #
# ... #
# .   #
#######
` },
  { dif: 'dificil', nombre: 'Ciudadela', mapa: `
#######
#   ###
# $ ###
#   ###
#   $+#
#  .$ #
#.  $##
#.   ##
#######
` },
  { dif: 'dificil', nombre: 'Vestíbulo', mapa: `
#########
#  ######
# $     #
#@$   $ #
###   . #
###  .. #
### $  .#
#########
` },
  { dif: 'dificil', nombre: 'Yacimiento', mapa: `
#########
#..   ###
#     $@#
#  #  $ #
# .$ $ ##
# .    ##
#########
` },
  { dif: 'dificil', nombre: 'Almacenillo', mapa: `
#########
#  .  $.#
#.  . $ #
#$ ###  #
#  # $$ #
#. #  @ #
#########
` },
];
