// Secciones de 🎨 Apariencia «Avatar» y «Enemigos»: las usan Catapulta y Guerra de Orugas.
import { AVATARES, IDS, CLASES } from './avatares.js';
import { url } from './imagenes.js';
export const grupoAvatar = () => ({ clave: 'avatar', titulo: 'Avatar', icono: '🎯', ventana: true, forma: 'cuadrada', def: 'pajaros',
  opciones: IDS.map(id => ({ id, nombre: AVATARES[id].nombre, img: url('mosaico-' + id) })) });
export const grupoEnemigo = () => ({ clave: 'enemigo', titulo: 'Enemigos', icono: '🐷', ventana: true, forma: 'cuadrada', def: 'igual',
  opciones: [{ id: 'igual', nombre: 'El del avatar', icono: '🔗' }, ...IDS.map(id => ({ id, nombre: AVATARES[id].enemigo, img: url('en-' + id) }))] });
// Guerra de Orugas: cada imagen se elige por separado (sin categorías) y el gusano de siempre es una más, la predeterminada.
export const AVATARES_GUSANO = ['original', ...IDS.flatMap(id => CLASES.map((c, i) => `av-${id}-${i + 1}`))];
export const grupoAvatarGusano = () => ({ clave: 'avatar', titulo: 'Avatar', icono: '🎯', ventana: true, forma: 'cuadrada', def: 'original',
  opciones: [{ id: 'original', nombre: 'Gusano', img: url('av-gusano') },
    ...IDS.flatMap(id => CLASES.map((c, i) => ({ id: `av-${id}-${i + 1}`, nombre: AVATARES[id].aves[i], img: url(`av-${id}-${i + 1}`) })))] });
export const grupoEnemigoGusano = () => ({ clave: 'enemigo', titulo: 'Enemigos', icono: '🐷', ventana: true, forma: 'cuadrada', def: 'original',
  opciones: [{ id: 'original', nombre: 'Gusano', img: url('en-gusano') }, ...IDS.map(id => ({ id, nombre: AVATARES[id].enemigo, img: url('en-' + id) }))] });
