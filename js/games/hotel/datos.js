// Hotel · datos del tablero (fijos: no cambian durante la partida).
// Los destinos turísticos son lugares reales usados solo como nombre; los precios y alquileres son propios del juego.

// Zonas de destinos: color (paleta de Juegos Reunidos), nombre, coste de cada piso y multiplicadores del
// alquiler básico con 1, 2, 3, 4 y 5 estrellas (cada estrella = un piso más; la quinta corona el edificio).
export const GRUPOS = {
  and: { color: '#8B5E3C', zona: 'Andes', piso: 50, mult: [5, 14, 40, 70, 100] },
  car: { color: '#0FB3C9', zona: 'Caribe', piso: 50, mult: [5, 14, 40, 62, 85] },
  med: { color: '#FF4FA3', zona: 'Mediterráneo', piso: 90, mult: [5, 14, 40, 56, 70] },
  ita: { color: '#FF7A1A', zona: 'Italia', piso: 90, mult: [5, 13, 36, 47, 56] },
  asi: { color: '#FF4757', zona: 'Asia', piso: 130, mult: [5, 13, 36, 46, 55] },
  cap: { color: '#FFC21A', zona: 'Capitales', piso: 130, mult: [5, 14, 34, 42, 50] },
  exo: { color: '#0FB56A', zona: 'Paraísos', piso: 170, mult: [5, 14, 33, 40, 47] },
  lux: { color: '#2F6BFF', zona: 'Lujo', piso: 200, mult: [5, 13, 30, 36, 42] },
};
export const SALARIO = 200;            // al pasar por la Salida
export const FIANZA = 60;              // para salir de la Cuarentena
export const MAX_NIVEL = 5;            // estrellas
export const AERO = { precio: 180, alquiler: [30, 60, 110, 180] };   // alquiler según cuántos aeropuertos tiene el dueño
export const SERV = { precio: 140, veces: [5, 12] };                  // alquiler = dados × 5 (o × 12 con los dos)

const D = (nombre, g, precio, alquiler) => ({ nombre, tipo: 'destino', g, precio, alquiler });
const A = nombre => ({ nombre, tipo: 'aero', precio: AERO.precio, ico: '✈️' });
const S = (nombre, ico) => ({ nombre, tipo: 'serv', precio: SERV.precio, ico });
const ESQ = (nombre, ico, corto) => ({ nombre, tipo: 'esquina', ico, corto });
const SUE = () => ({ nombre: 'Suerte viajera', tipo: 'suerte' }), IMPR = () => ({ nombre: 'Imprevisto', tipo: 'imprevisto' });
const IMP = (nombre, importe) => ({ nombre, tipo: 'impuesto', importe });

export const SALIDA = 0, CUARENTENA = 10, VACACIONES = 20, CONTROL = 30;
export const CASILLAS = [
  ESQ('Salida', '✈️', 'Salida'), D('Cusco', 'and', 60, 2), SUE(), D('La Paz', 'and', 60, 4), IMP('Tasa turística', 160), A('Aeropuerto Atlántico'), D('Cancún', 'car', 100, 6), IMPR(), D('Punta Cana', 'car', 100, 6), D('La Habana', 'car', 120, 8),
  ESQ('Cuarentena', '😷', 'Cuarentena'), D('Santorini', 'med', 140, 10), S('Crucero', '🚢'), D('Dubrovnik', 'med', 140, 10), D('Mallorca', 'med', 160, 12), A('Aeropuerto Pacífico'), D('Venecia', 'ita', 180, 14), SUE(), D('Florencia', 'ita', 180, 14), D('Roma', 'ita', 200, 16),
  ESQ('Vacaciones', '🏖️', 'Vacaciones'), D('Bali', 'asi', 220, 18), IMPR(), D('Bangkok', 'asi', 220, 18), D('Kioto', 'asi', 240, 20), A('Aeropuerto Índico'), D('Lisboa', 'cap', 260, 22), D('Madrid', 'cap', 260, 22), S('Tren bala', '🚄'), D('París', 'cap', 280, 24),
  ESQ('Control sanitario', '🛃', 'Control'), D('Maldivas', 'exo', 300, 26), D('Seychelles', 'exo', 300, 26), SUE(), D('Bora Bora', 'exo', 320, 28), A('Aeropuerto Ártico'), IMPR(), D('Dubái', 'lux', 350, 33), IMP('Tasa de resort', 120), D('Nueva York', 'lux', 400, 42),
];

// Cartas. d = dinero (+ cobras / − pagas) · ir = viajar hasta la casilla · atras = retroceder · cuarentena = ir a la Cuarentena ·
// libre = pase VIP para salir de la Cuarentena · todos = cada jugador (+ te paga / − les pagas) ·
// obras = reformas: pagar por cada piso y por cada hotel de 5 estrellas · aero = avanzar hasta el próximo aeropuerto (pagando el doble si tiene dueño)
export const SUERTES = [
  { t: 'Tu reseña se hace viral: cobra 150M.', d: 150 },
  { t: 'Pierdes el equipaje: paga 80M en ropa nueva.', d: -80 },
  { t: 'Te regalan un viaje a Nueva York: avanza hasta allí.', ir: 39 },
  { t: 'Vuelo de vuelta a casa: avanza hasta la Salida.', ir: 0 },
  { t: 'Retraso en el aeropuerto: retrocede 3 casillas.', atras: 3 },
  { t: 'Sospechan que traes fiebre: ve directamente a la Cuarentena.', cuarentena: true },
  { t: 'Tu agencia te consigue un pase VIP para salir de la Cuarentena (guárdalo).', libre: true },
  { t: 'Invitas a cenar a todo el mundo: paga 30M a cada jugador.', todos: -30 },
  { t: 'Un amigo te recomienda las Maldivas: avanza hasta allí.', ir: 31 },
  { t: 'Vuelo directo: avanza hasta el próximo aeropuerto. Si tiene dueño, pagas el doble.', aero: true },
  { t: 'Renuevas las habitaciones: paga 30M por piso y 110M por hotel de 5 estrellas.', obras: [30, 110] },
  { t: 'Reparto de beneficios de la temporada: cobra 60M.', d: 60 },
];
export const IMPREVISTOS = [
  { t: 'Ganas un sorteo de viajes: cobra 180M.', d: 180 },
  { t: 'Te multan por exceso de equipaje: paga 60M.', d: -60 },
  { t: 'Vendes unas fotos a una revista: cobra 110M.', d: 110 },
  { t: 'Es tu cumpleaños: cada jugador te regala 15M.', todos: 15 },
  { t: 'Ganas el concurso del mejor guía: cobra 40M.', d: 40 },
  { t: 'Un inspector sanitario te retiene: ve directamente a la Cuarentena.', cuarentena: true },
  { t: 'Un contacto te echa una mano: pase VIP para salir de la Cuarentena (guárdalo).', libre: true },
  { t: 'Te devuelven el IVA de las compras: cobra 30M.', d: 30 },
  { t: 'Una tormenta daña tu coche de alquiler: paga 80M.', d: -80 },
  { t: 'Te invitan a la fiesta de la Salida: avanza hasta allí.', ir: 0 },
  { t: 'Mantenimiento de los hoteles: paga 25M por piso y 90M por hotel de 5 estrellas.', obras: [25, 90] },
  { t: 'Vendes un recuerdo de tu viaje: cobra 50M.', d: 50 },
];
export const COLORES_JUGADOR = ['#FF4757', '#2F6BFF', '#0FB56A', '#FFC21A'];
export const FICHAS = ['🦊', '🤖', '🦄', '🐙', '🚀', '👾', '🐧', '🦉'];
