// Personajes (ilustraciones IA, img/pj y img/objetos) para «Tu personaje» en 🎨 Apariencia: sustituyen a la ficha, bola, cabeza o marca del jugador.
// Cada juego lee la elección con imgPersonaje(asp) (core/aspectos.js) y dibuja la imagen en lugar de su pieza de siempre.
const lista = (pref, nombres, dir = 'img/pj', sec) => nombres.map((n, i) => ({ id: `${pref}${i + 1}`, nombre: n, sec, img: `${dir}/${pref.startsWith('gente') || pref.startsWith('oficio') || pref.startsWith('fant') ? pref + (i + 1) : pref}.webp` }));
const SEC = [];
const a = (sec, items) => items.forEach(([id, nombre, img]) => SEC.push({ id, nombre, sec, img }));
a('Gente', ['Hombre moreno', 'Hombre de piel oscura', 'Mujer castaña', 'Mujer de pelo rizado', 'Chico despeinado', 'Chica con coletas', 'Abuelo con gafas', 'Abuela con moño', 'Barbudo con gorro', 'Mujer con pañuelo', 'Persona 11', 'Persona 12', 'Persona 13', 'Persona 14', 'Persona 15', 'Persona 16', 'Persona 17', 'Persona 18', 'Persona 19', 'Persona 20'].map((n, i) => [`gente-${i + 1}`, n, `img/pj/gente-${i + 1}.webp`]));
a('Oficios', ['Obrero', 'Policía', 'Bombero', 'Cocinero', 'Mecánico', 'Médica', 'Granjero', 'Astronauta', 'Detective', 'Profesora', 'Oficio 11', 'Oficio 12', 'Oficio 13', 'Oficio 14', 'Oficio 15', 'Oficio 16', 'Oficio 17', 'Oficio 18', 'Oficio 19', 'Oficio 20'].map((n, i) => [`oficio-${i + 1}`, n, `img/pj/oficio-${i + 1}.webp`]));
a('Fantasía', ['Mago', 'Elfo', 'Hada', 'Vampiro', 'Zombi', 'Superhéroe', 'Ninja', 'Robot', 'Alienígena', 'Pirata'].map((n, i) => [`fant-${i + 1}`, n, `img/pj/fant-${i + 1}.webp`]));
const AN = [['perro', 'Perro'], ['gato', 'Gato'], ['caballo', 'Caballo'], ['cerdo', 'Cerdo'], ['delfin', 'Delfín'], ['tortuga', 'Tortuga'], ['raya', 'Raya'], ['tiburon', 'Tiburón'], ['leon', 'León'], ['tigre', 'Tigre'], ['jirafa', 'Jirafa'], ['aguila', 'Águila']];
a('Animales (cara)', AN.map(([k, n]) => [`an-${k}`, n, `img/pj/an-${k}.webp`]));
a('Animales (cuerpo entero)', AN.map(([k, n]) => [`ac-${k}`, n, `img/pj/ac-${k}.webp`]));
a('Vehículos', [['bici', 'Bici'], ['coche', 'Coche'], ['moto', 'Moto'], ['deportiva', 'Deportivo'], ['pickup', 'Pickup'], ['quad', 'Quad'], ['camion', 'Camión'], ['lancha', 'Lancha'], ['velero', 'Velero'], ['submarino', 'Submarino'], ['avion', 'Avión'], ['globo', 'Globo']].map(([k, n]) => [`v-${k}`, n, `img/pj/v-${k}.webp`]));
a('Objetos', [['cohete', 'Cohete'], ['pizza', 'Pizza'], ['hamburguesa', 'Hamburguesa'], ['futbol', 'Balón de fútbol'], ['baloncesto', 'Baloncesto'], ['donut', 'Donut'], ['helado', 'Helado'], ['tenis', 'Pelota de tenis'], ['planeta', 'Planeta'], ['luna', 'Luna'], ['estrella-fugaz', 'Estrella fugaz'], ['platillo', 'Platillo volante'],
  ['cofre', 'Cofre'], ['brujula', 'Brújula'], ['llave', 'Llave'], ['dado', 'Dado'], ['lupa', 'Lupa'], ['libro', 'Libro'], ['mochila', 'Mochila'], ['mapa', 'Mapa'], ['camara', 'Cámara'], ['copa', 'Copa'], ['ancla', 'Ancla'], ['tienda', 'Tienda']].map(([k, n]) => [`ob-${k}`, n, `img/objetos/${k}.webp`]));
export const FICHAS = Object.fromEntries(SEC.map(o => [o.id, o]));
export const NOMBRE_SEC = {};
// Opciones listas para api.aspecto (rejilla de imágenes con secciones)
export const opcionesPersonajes = () => SEC.map(o => ({ id: o.id, nombre: o.nombre, sec: o.sec, img: o.img }));
