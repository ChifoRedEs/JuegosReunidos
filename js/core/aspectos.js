import { BARAJAS, urlMuestra, urlDorso } from './cartas.js';
// Opciones de apariencia compartidas por varios juegos.
// Cada juego declara sus grupos y llama a api.aspecto(defs, alCambiar); el valor elegido de cada grupo
// se escribe como atributo data-<clave> en el contenedor del juego y se guarda en sus preferencias.
export const PALETAS = [
  { id: 'cielo', nombre: 'Cielo', sw: ['#2F6BFF', '#E4EDFF'] },
  { id: 'menta', nombre: 'Menta', sw: ['#0FA971', '#D9F7EA'] },
  { id: 'atardecer', nombre: 'Atardecer', sw: ['#F0572D', '#FFE3D6'] },
  { id: 'noche', nombre: 'Noche', sw: ['#5CE1FF', '#1A2350'] },
];
export const grupoTablero = (titulo = 'Colores del tablero') => ({ clave: 'tablero', titulo, def: 'cielo', opciones: PALETAS });

// Grupos comunes de los juegos de cartas
export const grupoMesa = () => ({ clave: 'mesa', titulo: 'Color de la mesa', def: 'verde', opciones: [{ id: 'verde', nombre: 'Verde', sw: ['#12A05C'] }, { id: 'azul', nombre: 'Azul', sw: ['#2E6BE8'] }, { id: 'burdeos', nombre: 'Burdeos', sw: ['#B02A47'] }, { id: 'noche', nombre: 'Noche', sw: ['#3B4468'] }] });
// Dorsos y barajas de imagen (carpeta img/cartas). «Aleatoria» (por defecto) sortea una al abrir el juego y en cada partida nueva;
// si se elige una concreta, se queda fija. Sin imágenes (índice no cargado) el grupo se oculta y se ven las cartas dibujadas de siempre.
const AZAR = { id: 'azar', nombre: '🎲 Aleatoria', azar: true };
export const grupoDorso = () => ({ clave: 'dorso', titulo: 'Dorso de las cartas', def: 'azar', opciones: [AZAR, ...BARAJAS.dorsos.map(d => ({ id: d.id, nombre: d.nombre, img: urlDorso(d) }))] });
const grupoBaraja = (tipo, clave, titulo) => ({ clave, titulo, def: 'azar', opciones: [AZAR, ...BARAJAS[tipo].map(b => ({ id: b.id, nombre: b.nombre, img: urlMuestra(b) }))] });
export const grupoBarajaEs = () => grupoBaraja('espanola', 'barajaes', 'Baraja española');
export const grupoBarajaFr = () => grupoBaraja('francesa', 'barajafr', 'Baraja francesa');
