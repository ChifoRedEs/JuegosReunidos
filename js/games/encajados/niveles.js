// Niveles de la campaña del Encajados: originales de JugamiGO (unos diseñados a mano y otros creados con el
// generador del juego con semillas fijas y elegidos por dificultad). No son copia de ninguna colección publicada.
// 60 niveles en 3 tramos de 20 (dif: facil = 2-3 cajas · medio = 3-4 cajas · dificil = 4-5 cajas), de menos a más
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
  { dif: 'facil', nombre: 'Taller', mapa: `
########
### @ ##
#  $$$ #
#      #
#. #   #
#.. ## #
#  ##  #
########
` },
  { dif: 'facil', nombre: 'Cámara fría', mapa: `
########
#+#.   #
#$ # $ #
# $    #
#. ##  #
#  ##  #
## ## ##
########
` },
  { dif: 'facil', nombre: 'Trastienda', mapa: `
########
#    ..#
# $   .#
####   #
#  # ###
# ##$$ #
#   @  #
########
` },
  { dif: 'facil', nombre: 'Depósito', mapa: `
########
# ###@##
#  .#$ #
#    . #
#   $# #
## $ # #
#    #.#
########
` },
  { dif: 'facil', nombre: 'Granero', mapa: `
########
#     ##
#      #
##    $#
## $# .#
# $ #. #
# @# .##
########
` },
  { dif: 'facil', nombre: 'Aduana', mapa: `
########
#    # #
# #$#  #
#@$    #
# $ # .#
# #  . #
#### . #
########
` },
  { dif: 'facil', nombre: 'Esclusa', mapa: `
########
# ..####
#  ##  #
# . #  #
#  $   #
#  #$$##
#  # @##
########
` },
  { dif: 'facil', nombre: 'Rellano', mapa: `
########
##  #  #
#  # $ #
#.   $@#
# #  ###
# #$ # #
#.#   .#
########
` },
  { dif: 'facil', nombre: 'Zócalo', mapa: `
########
###   .#
# #  # #
#@$   .#
# $  # #
# $  #.#
# #    #
########
` },
  { dif: 'facil', nombre: 'Vagón', mapa: `
########
#. ## .#
#  ##$ #
#   # .#
#    $@#
##  #$ #
## ##  #
########
` },
  { dif: 'medio', nombre: 'Dársena', mapa: `
#########
#    # ##
## # # .#
##  $#  #
###$    #
### #   #
#@$ #.# #
#     #.#
#########
` },
  { dif: 'medio', nombre: 'Faro', mapa: `
#########
## .. @.#
## #    #
#   #   #
# #    ##
# $$##  #
#   $  ##
# ###   #
#########
` },
  { dif: 'medio', nombre: 'Atalaya', mapa: `
#########
# .   ###
#    #  #
##. # $ #
# @ #$  #
#.  #   #
###  $  #
#       #
#########
` },
  { dif: 'medio', nombre: 'Cantera', mapa: `
#########
#  .### #
##      #
#   ##  #
#  #   ##
#..@#$  #
#    $$ #
# #     #
#########
` },
  { dif: 'medio', nombre: 'Bóveda', mapa: `
#########
# @     #
##$ $ $ #
#  #### #
#    #.##
#   #   #
#      .#
### #. ##
#########
` },
  { dif: 'medio', nombre: 'Galería', mapa: `
#########
## ###  #
#  ###  #
# $     #
# @$##  #
#  $ #  #
#  #. ..#
#  # #  #
#########
` },
  { dif: 'medio', nombre: 'Mirador', mapa: `
#########
##  ##  #
#     $ #
#. #    #
#  # #$ #
#    #  #
#.  # $ #
##   + ##
#########
` },
  { dif: 'medio', nombre: 'Claustro', mapa: `
#########
# @ #   #
#.  # $ #
##  #$  #
##    $ #
##  ## ##
##   ####
##   ..##
#########
` },
  { dif: 'medio', nombre: 'Cripta', mapa: `
#########
#@# .. ##
#   .#$ #
#  #  $ #
## ###$ #
#       #
#   ##  #
##    ###
#########
` },
  { dif: 'medio', nombre: 'Foso', mapa: `
#########
###    ##
#. #$   #
# #  $ ##
#.#  $  #
# ####  #
#     @ #
#   ###.#
#########
` },
  { dif: 'medio', nombre: 'Garita', mapa: `
#########
#####   #
####@$  #
#  #$#  #
#..  .$##
#   $#  #
# .#    #
#     ###
#########
` },
  { dif: 'medio', nombre: 'Pantano', mapa: `
#########
#.. #   #
#   ##$@#
## #    #
# .##$  #
##    $ #
#     $ #
# .## ###
#########
` },
  { dif: 'medio', nombre: 'Ribera', mapa: `
#########
#   #  .#
##    .##
# $#  . #
##@#.#$ #
# $ #  ##
#   $   #
## #   ##
#########
` },
  { dif: 'medio', nombre: 'Sótano', mapa: `
#########
# ##   ##
# $ $#  #
# $   # #
#  $#   #
##     ##
##@#  ..#
##  #.. #
#########
` },
  { dif: 'medio', nombre: 'Terraza', mapa: `
#########
#. #   ##
#.    $ #
#.. ##  #
#   #   #
# #  #  #
# $$##$ #
#@#     #
#########
` },
  { dif: 'medio', nombre: 'Umbral', mapa: `
#########
#. @  . #
# ## ####
#.##  $ #
# # $ # #
#  .#$$ #
#       #
#  #    #
#########
` },
  { dif: 'medio', nombre: 'Vestíbulo', mapa: `
#########
#   #  ##
##      #
#   ##$ #
#  @ #  #
#*. ##$ #
#. # $ ##
# .    ##
#########
` },
  { dif: 'medio', nombre: 'Yacimiento', mapa: `
#########
#...    #
# ##   ##
##.## $ #
#  ##  ##
##    $ #
# $#  $@#
##   ## #
#########
` },
  { dif: 'medio', nombre: 'Almacenillo', mapa: `
#########
#.  #  ##
#.    $ #
#+  ##  #
#   #   #
#.# ##  #
# $$# $ #
# #     #
#########
` },
  { dif: 'medio', nombre: 'Cuartel', mapa: `
#########
#  #.   #
#  # .  #
# $ ##. #
# $@ # .#
#    $ ##
# $ #   #
#  #   ##
#########
` },
  { dif: 'dificil', nombre: 'Mercado', mapa: `
#########
## @## ##
# $  $  #
#  $#  ##
#   ##  #
# $#..# #
#      .#
##  . # #
#########
` },
  { dif: 'dificil', nombre: 'Lonja', mapa: `
#########
#   # # #
# $ #   #
# $     #
# $ # ###
#@ #. . #
####$   #
#.  .   #
#########
` },
  { dif: 'dificil', nombre: 'Barraca', mapa: `
#########
##   # ##
# $  $ ##
#  $# @ #
#   #  .#
# $#   ##
#     ..#
##  . # #
#########
` },
  { dif: 'dificil', nombre: 'Convoy', mapa: `
#########
#...    #
#####  ##
##.#  $ #
#   #  ##
#     $ #
## #$ $@#
##   # ##
#########
` },
  { dif: 'dificil', nombre: 'Nudo', mapa: `
#########
#  # . ##
# $ #   #
#@$     #
# $ #$###
#  #    #
####   ##
#. ..  ##
#########
` },
  { dif: 'dificil', nombre: 'Telar', mapa: `
#########
#   ##  #
#  $##$ #
## $  $ #
#   # # #
##    # #
####    #
##.+..###
#########
` },
  { dif: 'dificil', nombre: 'Desvío', mapa: `
#########
#@  ##  #
#  $##$ #
##$$    #
#   # # #
##    # #
####    #
# ....###
#########
` },
  { dif: 'dificil', nombre: 'Meandro', mapa: `
#########
#  #.@. #
#  #    #
# $ ##. #
# $ ## .#
#  $   ##
#   #$ ##
# ##    #
#########
` },
  { dif: 'dificil', nombre: 'Trinchera', mapa: `
#########
#   # # #
#   $   #
## ## $ #
#   #   #
#  @##$##
# .# $ ##
# ...  ##
#########
` },
  { dif: 'dificil', nombre: 'Pórtico', mapa: `
#########
#.      #
#.##$####
#.## @$ #
# # $   #
#  .##$ #
#       #
#  #  # #
#########
` },
  { dif: 'dificil', nombre: 'Celosía', mapa: `
#########
#   . # #
# . #   #
# $# # ##
#.    $@#
##  $ #$#
##$.  # #
#    ##.#
#########
` },
  { dif: 'dificil', nombre: 'Arcada', mapa: `
#########
#      ##
# #  #$##
# $ ##  #
# ##. $@#
#  #  #.#
# $#  $.#
#.     .#
#########
` },
  { dif: 'dificil', nombre: 'Entresuelo', mapa: `
#########
# @##  ##
# $    ##
## $    #
# *#  # #
#$ #  . #
#. # $###
#.  .   #
#########
` },
  { dif: 'dificil', nombre: 'Buhardilla', mapa: `
#########
#    ## #
##$   $ #
#  $$.$@#
##   .# #
## #  # #
##.  . ##
### .#  #
#########
` },
  { dif: 'dificil', nombre: 'Patio interior', mapa: `
#########
#      ##
#  #$ $@#
####   ##
# $     #
#  #   .#
#* $ #  #
#  . .. #
#########
` },
  { dif: 'dificil', nombre: 'Canal', mapa: `
#########
#  #    #
#  $ #$ #
##  $@$ #
#..#### #
# $##  .#
#    .#.#
#     # #
#########
` },
  { dif: 'dificil', nombre: 'Presa', mapa: `
#########
#  #.#* #
#  # . ##
#   @ $##
# $ .   #
##  ##  #
# $ ##$ #
## .#   #
#########
` },
  { dif: 'dificil', nombre: 'Muralla', mapa: `
#########
###   ###
# # $ # #
# $  # @#
# $ #.$ #
#    .. #
# # $##.#
# #  . ##
#########
` },
  { dif: 'dificil', nombre: 'Torreón', mapa: `
#########
### #.  #
# #  $ ##
# # #$ ##
# .   $ #
#.  .#  #
# $ # $ #
#.####@##
#########
` },
  { dif: 'dificil', nombre: 'Escollera', mapa: `
#########
# @#   ##
##$$ $$.#
##      #
## # ####
## # # .#
# . # $ #
#.     .#
#########
` },
];
