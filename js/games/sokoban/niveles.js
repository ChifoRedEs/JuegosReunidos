// Niveles de la campaña del Encajados: originales de Juegos Reunidos (unos diseñados a mano y otros creados con el
// generador del juego con semillas fijas y elegidos por dificultad). No son copia de ninguna colección publicada.
// Van de menos a más: los primeros enseñan las reglas y los últimos piden planear varios empujes por delante.
// Para añadir uno: copia el formato (# muro · . meta · $ caja · * caja en meta · @ jugador · + jugador en meta)
// y comprueba con `node tests/motores.mjs` que tiene solución.
export const NIVELES = [
  { nombre: 'Primer empujón', mapa: `
#######
#@ $ .#
#######` },
  { nombre: 'Pasillo', mapa: `
########
#  .   #
# #$## #
# @  $.#
########` },
  { nombre: 'La esquina', mapa: `
######
#.   #
# $# #
# $@ #
#.   #
######` },
  { nombre: 'Dos cajas', mapa: `
#######
#.  $ #
#  @  #
# $  .#
#######` },
  { nombre: 'Torre', mapa: `
#######
##### #
### ..#
#@$   #
## $  #
##  ###
#######` },
  { nombre: 'Escalón', mapa: `
######
##. ##
#@$ ##
##.  #
## $ #
##   #
######` },
  { nombre: 'Cruce', mapa: `
  ####
###  ##
# $ $ #
#. @ .#
##   ##
 #####` },
  { nombre: 'Almacén', mapa: `
#######
#.  # #
# $   #
#.$# @#
#  $ .#
#######` },
  { nombre: 'Rincón', mapa: `
#######
###@  #
# $$ ##
#    ##
#.  .##
#######` },
  { nombre: 'Embudo', mapa: `
######
## @##
##$$##
#    #
#   .#
#.   #
######` },
  { nombre: 'Tres en fila', mapa: `
########
#      #
# $$$  #
# #  # #
#  ...@#
########` },
  { nombre: 'La U', mapa: `
#########
#.  #   #
# $ # $ #
#   @   #
# $   ..#
###   ###
  #####` },
  { nombre: 'Laberinto', mapa: `
######
##   #
## $ #
# $  #
#    #
# .$ #
#. @.#
######` },
  { nombre: 'Patio', mapa: `
########
##     #
#@$ $$ #
###.  ##
#. .  ##
#  #####
########` },
  { nombre: 'Muelle', mapa: `
########
#      #
#  $ $ #
# $#####
# +.. ##
# ##  ##
########` },
  { nombre: 'Bodega', mapa: `
#######
####@##
### $ #
###   #
#  $$ #
#     #
#..  .#
#######` },
  { nombre: 'Fábrica', mapa: `
#######
# @  ##
##$$ ##
##  ###
#  $  #
# $   #
# ... #
# .   #
#######` },
  { nombre: 'Puerto', mapa: `
########
##   ###
#   $ ##
# $. $@#
#  $  ##
#    .##
# .#####
# .#####
########` },
  { nombre: 'Ciudadela', mapa: `
#######
#   ###
# $ ###
#   ###
#   $+#
#  .$ #
#.  $##
#.   ##
#######` },
  { nombre: 'Gran almacén', mapa: `
#######
## @ ##
##$$$ #
##    #
#     #
# .$ .#
# .  .#
#######` },
];
