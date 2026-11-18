import { BARAJAS, urlMuestra, urlDorso, urlTapete } from './cartas.js';
import { opcionesPersonajes } from './personajes.js';
// Opciones de apariencia compartidas por varios juegos.
// Cada juego declara sus grupos y llama a api.aspecto(defs, alCambiar); el valor elegido de cada grupo
// se escribe como atributo data-<clave> en el contenedor del juego y se guarda en sus preferencias.
export const PALETAS = [
  { id: 'pasaporte', nombre: 'Pasaporte', sw: ['#C9441C', '#F4EBD9'] },
  { id: 'cielo', nombre: 'Cielo', sw: ['#2F6BFF', '#E4EDFF'] },
  { id: 'menta', nombre: 'Menta', sw: ['#0FA971', '#D9F7EA'] },
  { id: 'atardecer', nombre: 'Atardecer', sw: ['#F0572D', '#FFE3D6'] },
  { id: 'noche', nombre: 'Noche', sw: ['#5CE1FF', '#1A2350'] },
];
export const grupoTablero = (titulo = 'Colores del tablero') => ({ clave: 'tablero', titulo, def: 'pasaporte', opciones: PALETAS });

// Grupos comunes de los juegos de cartas
// Grupos de los juegos de cartas. `ventana: true` = en 🎨 Apariencia salen como un enlace que abre su propia ventana con las imágenes; `forma` = proporción de las miniaturas.
// Dorsos y barajas de imagen (carpeta img/cartas). «Aleatoria» (por defecto) sortea una al abrir el juego y en cada partida nueva;
// si se elige una concreta, se queda fija. Sin imágenes (índice no cargado) el grupo se oculta y se ven las cartas dibujadas de siempre.
const AZAR = { id: 'azar', nombre: '🎲 Aleatoria', azar: true };
export const grupoDorso = () => ({ clave: 'dorso', titulo: 'Dorsos de Cartas', icono: '🂠', ventana: true, forma: 'carta', def: 'azar', opciones: [AZAR, ...BARAJAS.dorsos.map(d => ({ id: d.id, nombre: d.nombre, img: urlDorso(d) }))] });
export const grupoMesa = () => ({ clave: 'mesa', titulo: 'Tapete', icono: '🟩', ventana: true, forma: 'tapete', def: 'azar', opciones: [AZAR, ...BARAJAS.tapetes.map(t => ({ id: t.id, nombre: t.nombre, img: urlTapete(t) }))] });
const grupoBaraja = (tipo, clave, titulo) => ({ clave, titulo, icono: '🃏', ventana: true, forma: 'carta', def: 'azar', opciones: [AZAR, ...BARAJAS[tipo].map(b => ({ id: b.id, nombre: b.nombre, img: urlMuestra(b) }))] });
export const grupoBarajaEs = () => grupoBaraja('espanola', 'barajaes', 'Barajas');
// Solitarios (Klondike, Spider, Carta Blanca): se puede jugar con las barajas francesas (52 cartas) o las españolas (40 cartas). «Aleatoria» solo sortea entre las francesas.
export const grupoBarajaSolitarios = () => ({ clave: 'barajasol', titulo: 'Barajas', icono: '🃏', ventana: true, forma: 'carta', def: 'azar',
  opciones: [{ ...AZAR, nombre: '🎲 Aleatoria (francesas)', solo: BARAJAS.francesa.map(b => b.id) }, ...BARAJAS.francesa.map(b => ({ id: b.id, nombre: b.nombre, img: urlMuestra(b) })), ...BARAJAS.espanola.map(b => ({ id: b.id, nombre: b.nombre, img: urlMuestra(b) }))] });
export const grupoBarajaFr = () => grupoBaraja('francesa', 'barajafr', 'Barajas');

// «Tapete» (todos los juegos que no son de cartas): una imagen de tapete detrás del tablero. `sel` = elemento del tablero (CSS);
// los juegos de canvas pasan sel = '' y pintan el tapete ellos mismos (core/cartas.js: imagenTapete + pintarTapete) cuando asp.valores.tapete empieza por «t-».
export const grupoFondo = sel => ({ clave: 'tapete', titulo: 'Tapete', icono: '🖼️', ventana: true, forma: 'tapete', def: 'ninguno', sel,
  opciones: [{ id: 'ninguno', nombre: 'Sin tapete', icono: '🚫', nada: true }, AZAR, ...BARAJAS.tapetes.map(t => ({ id: t.id, nombre: t.nombre, img: urlTapete(t) }))] });
// «Fondo de Pantalla» (solo juegos de Arcade y el Ahorcado): escenarios ambientados (img/cartas/fondos). Pasa por delante del Tapete si se elige.
export const grupoPantalla = sel => ({ clave: 'pantalla', titulo: 'Fondo de Pantalla', icono: '🏞️', ventana: true, forma: 'tapete', def: 'ninguno', sel,
  opciones: [{ id: 'ninguno', nombre: 'Sin fondo', icono: '🚫', nada: true }, AZAR, ...BARAJAS.fondos.map(t => ({ id: t.id, nombre: t.nombre, img: urlTapete(t) }))] });
// «Personajes»: tu personaje (los de Encajados) sustituye a la ficha, bola o cabeza del jugador. Valor 'auto' = el diseño de siempre.
export const grupoPersonaje = (titulo = 'Personajes') => ({ clave: 'pj', titulo, icono: '🧑', def: 'auto', opciones: [{ id: 'auto', nombre: 'El de siempre', sec: 'Por defecto' }, ...opcionesPersonajes()] });
// Emoji del personaje elegido (o null)
import { FICHAS as _PJ } from './personajes.js';
export const emojiDeValores = v => (_PJ[v && v.pj] || {}).e || null;
export const emojiPersonaje = asp => (_PJ[asp && asp.valores && asp.valores.pj] || {}).e || null;
// ¿Hay un tapete elegido? → id 't-…' o null
export const tapeteElegido = asp => { const V = (asp && asp.valores) || {}; for (const v of [V.pantalla, V.tapete]) if (v && v.startsWith('t-')) return v; return null; };   // el fondo de pantalla pasa por delante del tapete

// «Escenario» de Guerra de Orugas: solo los tapetes con ambientación de campo de batalla (el juego los pinta de fondo y colorea el terreno a juego).
export const ESCENARIOS_WORMS = ['t-bosque', 't-ciudad', 't-deportivo', 't-desierto', 't-espacio', 't-infierno', 't-lago', 't-medieval'];
// Escenarios que se añadieron después (pensados para Catapulta): Guerra de Orugas también los ofrece. Quantix sigue con los ocho de siempre (su lista decide qué imagen sale en cada nivel).
export const ESCENARIOS_GUERRA = [...ESCENARIOS_WORMS, 't-pradera', 't-huerto', 't-isla', 't-cueva', 't-mar', 't-pajaros'];
export const grupoEscenario = (sel, titulo = 'Fondo de Pantalla', lista = ESCENARIOS_WORMS) => ({ clave: 'esc', titulo, icono: '🏞️', ventana: true, forma: 'tapete', def: 'azar', sel,
  opciones: [AZAR, ...BARAJAS.fondos.filter(t => lista.includes(t.id)).map(t => ({ id: t.id, nombre: t.nombre, img: urlTapete(t) }))] });

/* ---------- Tapetes por juego ---------- */
// Cada juego ofrece solo los tapetes de su estilo (familia) y, donde tiene sentido, un desplegable «Clásicos» al final con los 11 tapetes lisos antiguos.
export const CLASICOS = ['t-amarillo', 't-arcoiris', 't-azul-claro', 't-azul-oscuro', 't-ladrillos', 't-madera', 't-marmol', 't-morado', 't-rojo', 't-turquesa', 't-verde'];
const FAMILIAS = {
  casino: /^t-n-casino/, filete: /^t-n-tapete-/, viajero: /^t-0-/, mesajuegos: /^t-n-mesa-juegos/, cuaderno: /^t-n-papel-cuaderno/, maderamarmol: /^t-n-mesa-(madera|marmol)-palabras/,
  plato: /^t-n-plato/, billar: /^t-n-billar/, bingo: /^t-n-sala-bingo/, mahjong: /^t-n-mahjong/, ciudad: /^t-n-ciudad/, hotel: /^t-n-hotel/, almacen: /^t-n-almacen/,
  bombardeo: /^t-n-campo-bombardeo/, escritorio: /^t-n-escritorio/, taberna: /^t-n-taberna/,
};
const CARTAS = { f: ['casino', 'filete', 'viajero'], c: true }, MESA = { f: ['mesajuegos', 'viajero'], c: true }, TABLERO = { f: ['taberna', 'mesajuegos', 'viajero'], c: true };
export const TAPETES_JUEGO = {
  blackjack: CARTAS, brisca: CARTAS, chinchon: CARTAS, cinquillo: CARTAS, continental: CARTAS, corazones: CARTAS, hijoputa: CARTAS, holdem: CARTAS, klondike: CARTAS, spider: CARTAS,
  cartablanca: CARTAS, mus: CARTAS, pokercubierto: CARTAS, rummy: CARTAS,
  tresenraya: MESA, cuatroenlinea: MESA, domino: MESA, partxis: MESA, juegodelaoca: MESA, deslizadas: MESA, batallanaval: MESA,
  ajedrez: TABLERO, damas: TABLERO, matchup: { f: ['mesajuegos', 'casino', 'viajero'], c: true }, quecaratienes: { f: ['mesajuegos', 'casino', 'viajero'], c: true },
  sudoku: { f: ['cuaderno'] }, nonogram: { f: ['cuaderno'] }, calcudoku: { f: ['cuaderno'] }, akari: { f: ['cuaderno'] }, futoshiki: { f: ['cuaderno'] }, crucisumas: { f: ['cuaderno'] },
  crucigramas: { f: ['cuaderno'] }, sopaletras: { f: ['cuaderno', 'maderamarmol'] }, elahorcado: { f: ['cuaderno', 'taberna'] },
  encadenadas: { f: ['maderamarmol'] }, palabrascruzadas: { f: ['maderamarmol'] }, numerosyletras: { f: ['maderamarmol', 'plato'] },
  ruletamillonaria: { f: ['plato'] }, elrosco: { f: ['plato'] }, triviaquesitos: { f: ['plato'] },
  billar: { f: ['billar'] }, bingolive: { f: ['bingo'] }, bingomobile: { f: ['bingo'] }, mahjong: { f: ['mahjong'] }, magnateurbano: { f: ['ciudad'] }, hotel: { f: ['hotel'] },
  encajados: { f: ['almacen'] }, bombardeo: { f: ['bombardeo'] }, codigocifrado: { f: ['escritorio'] },
  serpiente: { f: ['viajero'], c: true }, vuelaalto: { f: ['viajero'], c: true }, bloques: { f: ['viajero'], c: true }, rompeladrillos: { f: ['viajero'], c: true }, airhockey: { f: ['mesajuegos'], c: true },
};
// Filtra las opciones de los grupos «Tapete» según el juego. Sin entrada para el juego (o sin tapetes) no cambia nada.
export function filtrarTapetes(defs, juego) {
  const cfg = TAPETES_JUEGO[juego]; if (!cfg) return defs;
  const res = cfg.f.map(k => FAMILIAS[k]);
  for (const g of defs) {
    if (g.clave !== 'tapete' && g.clave !== 'mesa') continue;
    const base = g.opciones.filter(o => !o.img), pro = g.opciones.filter(o => o.img && res.some(r => r.test(o.id)));
    const cl = cfg.c ? g.opciones.filter(o => CLASICOS.includes(o.id)).map(o => ({ ...o, clasico: true })) : [];
    g.opciones = [...base, ...pro, ...cl];
    if (!g.opciones.some(o => o.id === g.def)) g.def = (base.find(o => o.nada) || base[0] || g.opciones[0]).id;
  }
  return defs;
}
