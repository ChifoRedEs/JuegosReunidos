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
export const grupoDorso = () => ({ clave: 'dorso', titulo: 'Dorso de las cartas', def: 'azul', opciones: [{ id: 'azul', nombre: 'Azul', sw: ['#2F6BFF'] }, { id: 'rojo', nombre: 'Rojo', sw: ['#FF4757'] }, { id: 'verde', nombre: 'Verde', sw: ['#1FBF73'] }, { id: 'morado', nombre: 'Morado', sw: ['#8B5CF6'] }] });
export const grupoPalos = () => ({ clave: 'palos', titulo: 'Colores de los palos', def: 'clasico', opciones: [{ id: 'clasico', nombre: 'Clásicos (rojo y negro)', sw: ['#E0243A', '#1B2340'] }, { id: 'cuatro', nombre: 'Cuatro colores', sw: ['#1B2340', '#E0243A', '#1F6BFF', '#12984F'] }] });
