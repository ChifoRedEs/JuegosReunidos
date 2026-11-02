// Secciones de 🎨 Apariencia «Avatar» y «Enemigos»: las usan Catapulta y Guerra de Orugas.
// `original` añade la opción de conservar el dibujo propio del juego (Guerra de Orugas pinta así sus gusanos de siempre).
import { AVATARES, IDS } from './avatares.js';
import { url } from './imagenes.js';
const ORIGINAL = { id: 'original', nombre: 'Gusano original', icono: '🪱' };
export const grupoAvatar = (original = false) => ({ clave: 'avatar', titulo: 'Avatar', icono: '🎯', ventana: true, forma: 'cuadrada', def: original ? 'original' : 'pajaros',
  opciones: [...(original ? [ORIGINAL] : []), ...IDS.map(id => ({ id, nombre: AVATARES[id].nombre, img: url('mosaico-' + id) }))] });
export const grupoEnemigo = (original = false) => ({ clave: 'enemigo', titulo: 'Enemigos', icono: '🐷', ventana: true, forma: 'cuadrada', def: 'igual',
  opciones: [{ id: 'igual', nombre: 'El del avatar', icono: '🔗' }, ...IDS.map(id => ({ id, nombre: AVATARES[id].enemigo, img: url('en-' + id) }))] });
