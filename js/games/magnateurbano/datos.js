// Aeropuerto (antes «Magnate Urbano») · datos del tablero. Fijos: no cambian durante la partida.
// Se compran billetes de Destino (agrupados por zona del mundo), Terminales y servicios del aeropuerto. Con todos los destinos de una zona se pueden
// mejorar los vuelos: Clase Turista, Premium, Ejecutiva, Primera Clase y, por último, Jet Privado (el «hotel»).
// Nombres inventados o de lugares públicos; economía propia (no copia los importes de ningún otro juego).

export const IMG = n => `img/aeropuerto/${n}.webp`;

// Zonas: color de la franja (con su color de texto), coste de cada mejora de vuelo y multiplicadores del alquiler base.
// Alquiler base = precio / 12 (redondeado a 5). Con todas las casillas de la zona el básico se duplica; después sube con cada categoría.
export const ZONAS = {
  esp:  { nombre: 'España',           color: '#7FD6C2', tinta: '#17214A', mejora: 50 },
  eur:  { nombre: 'Europa',           color: '#2E9BF0', tinta: '#FFFFFF', mejora: 50 },
  afr:  { nombre: 'África',           color: '#C8742B', tinta: '#FFFFFF', mejora: 100 },
  nam:  { nombre: 'América del Norte', color: '#C2143A', tinta: '#FFFFFF', mejora: 100 },
  sam:  { nombre: 'Latinoamérica',    color: '#0B9E5A', tinta: '#FFFFFF', mejora: 150 },
  asia: { nombre: 'Asia',             color: '#F5C518', tinta: '#17214A', mejora: 150 },
  oce:  { nombre: 'Oceanía',          color: '#14306B', tinta: '#FFFFFF', mejora: 200 },
};
// Colores de franja de las demás casillas
export const TIPOS = {
  terminal: { color: '#3B4A6B', tinta: '#FFFFFF' }, servicio: { color: '#12B5B0', tinta: '#FFFFFF' }, impuesto: { color: '#6B3A22', tinta: '#FFFFFF' },
  esquina: { color: '#2B2F45', tinta: '#FFFFFF' }, souvenirs: { color: '#7A3FC8', tinta: '#FFFFFF' }, retrasos: { color: '#E0319B', tinta: '#FFFFFF' },
};
// Categorías de vuelo (nivel 1-4) y Jet Privado (5). El nivel 0 es el billete básico.
export const NIVELES = [
  { id: '', nombre: 'Billete' }, { id: 'm-turista', nombre: 'Clase Turista' }, { id: 'm-premium', nombre: 'Clase Premium' },
  { id: 'm-ejecutiva', nombre: 'Clase Ejecutiva' }, { id: 'm-primera', nombre: 'Primera Clase' }, { id: 'm-jet', nombre: 'Jet Privado' },
];
export const MULT = [1, 4, 11, 28, 42, 56];                // × alquiler base (nivel 0..5)
export const PREMIO_UNOS = 1000;                           // opción «dos unos»
export const SALARIO = 200;                                // al pasar por Embarque
export const FIANZA = 50;                                  // para salir de la Prisión Aduanera
export const MEJORAS = 32, JETS = 12;                      // límite del banco
export const TERMINAL = { precio: 200, alquiler: [25, 50, 100, 200] };   // según cuántas terminales tenga el dueño
export const SERVICIO = { precio: 150, veces: [4, 10] };                 // alquiler = dados × 4 (× 10 con los dos servicios)
export const EMBARQUE = 0, PRISION = 6, PARAISO = 18, CONTROL = 24, TOTAL = 36;
export const VENECIA = 8;

const r5 = x => Math.max(5, Math.round(x / 5) * 5);
const D = (img, nombre, corto, sub, g, precio) => ({ tipo: 'destino', img, nombre, corto, sub, g, precio, alquiler: r5(precio / 12) });
const T = (img, nombre, corto) => ({ tipo: 'terminal', img, nombre, corto, sub: 'Terminal · Aeropuerto', precio: TERMINAL.precio });
const S = (img, nombre, corto, sub) => ({ tipo: 'servicio', img, nombre, corto, sub, precio: SERVICIO.precio });
const I = (img, nombre, corto, sub, importe) => ({ tipo: 'impuesto', img, nombre, corto, sub, importe });
const E = (img, nombre, corto, sub, clave) => ({ tipo: 'esquina', img, nombre, corto, sub, clave });
const C = (mazo, nombre) => ({ tipo: 'carta', mazo, img: mazo === 'souvenirs' ? 'c-souvenirs' : 'c-retrasos', nombre, corto: nombre, sub: mazo === 'souvenirs' ? 'Carta Souvenir' : 'Carta Retrasos' });

// Orden del anillo (sentido horario desde Embarque, abajo a la derecha). Las 4 esquinas: 0, 6, 18 y 24.
export const CASILLAS = [
  E('e-embarque', 'Embarque', 'Embarque', 'Salida · cobras 200 M', 'embarque'),
  D('d-lamanga', 'La Manga', 'La Manga', 'Mar Menor · España', 'esp', 60),
  C('souvenirs', 'Souvenir'),
  T('t-sur', 'Terminal Sur', 'Terminal|Sur'),
  D('d-ibiza', 'Ibiza', 'Ibiza', 'Islas Baleares · España', 'esp', 60),
  D('d-tenerife', 'Tenerife', 'Tenerife', 'Islas Canarias · España', 'esp', 80),
  E('e-prision', 'Prisión Aduanera', 'Prisión', 'Solo de visita · o retenido', 'prision'),
  D('d-paris', 'París', 'París', 'Francia · Europa', 'eur', 100),
  D('d-venecia', 'Venecia', 'Venecia', 'Italia · Europa', 'eur', 100),
  S('s-agencia', 'Agencia de Viajes', 'Agencia', 'Servicio · Viajes'),
  D('d-viena', 'Viena', 'Viena', 'Austria · Europa', 'eur', 120),
  D('d-elcairo', 'El Cairo', 'El Cairo', 'Egipto · África', 'afr', 140),
  T('t-oeste', 'Terminal Oeste', 'Terminal|Oeste'),
  D('d-ciudaddelcabo', 'Ciudad del Cabo', 'Ciudad|del Cabo', 'Sudáfrica · África', 'afr', 140),
  D('d-saintdenis', 'Saint Denis', 'Saint Denis', 'Isla Reunión · Mascareñas', 'afr', 160),
  C('retrasos', 'Retrasos'),
  D('d-quebec', 'Quebec', 'Quebec', 'Canadá · América del Norte', 'nam', 180),
  D('d-ciudaddemexico', 'Ciudad de México', 'Ciudad de|México', 'México · América del Norte', 'nam', 180),
  E('e-paraiso', 'Paraíso Fiscal', 'Paraíso', 'Te llevas el bote', 'paraiso'),
  D('d-nuevayork', 'Nueva York', 'Nueva York', 'EE. UU. · América del Norte', 'nam', 200),
  C('souvenirs', 'Souvenir'),
  T('t-norte', 'Terminal Norte', 'Terminal|Norte'),
  I('i-exceso', 'Exceso de Equipaje', 'Exceso', 'Impuesto', 100),
  D('d-antigua', 'Antigua', 'Antigua', 'Guatemala · Latinoamérica', 'sam', 220),
  E('e-control', 'Control de Seguridad', 'Control', 'Te mandan a la Prisión', 'control'),
  D('d-lahabana', 'La Habana', 'La Habana', 'Cuba · Latinoamérica', 'sam', 220),
  D('d-rio', 'Río de Janeiro', 'Río de|Janeiro', 'Brasil · Latinoamérica', 'sam', 240),
  S('s-dutyfree', 'Duty Free', 'Duty Free', 'Servicio · Tienda'),
  D('d-goa', 'Goa', 'Goa', 'India · Asia', 'asia', 260),
  D('d-kandy', 'Kandy', 'Kandy', 'Sri Lanka · Asia', 'asia', 260),
  T('t-este', 'Terminal Este', 'Terminal|Este'),
  D('d-pekin', 'Pekín', 'Pekín', 'China · Asia', 'asia', 280),
  C('retrasos', 'Retrasos'),
  I('i-tasa', 'Tasa Turística', 'Tasa', 'Impuesto', 150),
  D('d-queenstown', 'Queenstown', 'Queenstown', 'Nueva Zelanda · Oceanía', 'oce', 350),
  D('d-sidney', 'Sídney', 'Sídney', 'Australia · Oceanía', 'oce', 400),
];

// Cartas. Cada una: img, t (título), x (explicación), e (efecto en una línea) y la mecánica:
//  d = dinero (+ cobras / − pagas, al bote si está activo) · todos = cada jugador (+ te paga / − les pagas) · porDestino / porTerminal = cobras por cada uno que tengas ·
//  ir = viaja hasta esa casilla (cobras Embarque si pasas) · avanza / atras = casillas · otra = tiras otra vez · mejora = una categoría gratis · elige = viaja a donde quieras ·
//  pierdeTurno · huelga = no cobras alquileres hasta tu próximo turno · terminal = retrocedes a la terminal más cercana · averia = [por mejora, por jet] · pierdeMejora = [por si no tiene] ·
//  embarque = vuelves a Embarque (sin cobrar, salvo `cobra`) · prision = vas a la Prisión · libre = tarjeta para salir de la Prisión (se guarda)
export const SOUVENIRS = [
  { img: 'sv-01', t: 'Bola de nieve', x: 'Un viajero se enamora de tu bola de nieve y te la compra.', e: '+80 M', d: 80 },
  { img: 'sv-02', t: 'Postales con sello', x: 'Tus postales llegan a casa y todos quieren más.', e: '+20 M de cada jugador', todos: 20 },
  { img: 'sv-03', t: 'Imanes de nevera', x: 'Tu colección de imanes crece sin parar.', e: '+10 M por cada destino que tengas', porDestino: 10 },
  { img: 'sv-04', t: 'Máscara veneciana', x: 'Te invitan al carnaval: viaja hasta Venecia.', e: 'Ve a Venecia · cobras 200 M si pasas por Embarque', ir: VENECIA },
  { img: 'sv-05', t: 'Gato de la suerte', x: 'La suerte te sonríe.', e: 'Tira otra vez los dados', otra: true },
  { img: 'sv-06', t: 'Mini monumentos', x: 'Tu colección de recuerdos vale su peso en oro.', e: '+25 M por cada terminal que tengas', porTerminal: 25 },
  { img: 'sv-07', t: 'Álbum de fotos', x: 'Una foto perfecta te lleva más lejos.', e: 'Avanza 3 casillas', avanza: 3 },
  { img: 'sv-08', t: 'Cesta gourmet', x: 'Premio sorpresa de la tienda del aeropuerto.', e: '+100 M', d: 100 },
  { img: 'sv-09', t: 'Bufanda artesanal', x: 'Un artesano te regala una mejora de vuelo.', e: 'Te guardas una mejora de vuelo gratis (la próxima que hagas)', mejora: true },
  { img: 'sv-10', t: 'Elefante de madera', x: 'Un amuleto que atrae a los clientes.', e: '+120 M', d: 120 },
  { img: 'sv-11', t: 'Pasaporte sellado', x: 'Tu pasaporte vale oro.', e: 'Ve a Embarque · +200 M', embarque: true, cobra: true },
  { img: 'sv-12', t: 'Billete dorado', x: 'Un billete dorado te lleva donde quieras.', e: 'Viaja a la casilla que elijas', elige: true },
  { img: 'sv-13', t: 'Acreditación VIP', x: 'Tu acreditación abre todas las puertas, hasta las de la Prisión Aduanera.', e: 'Tarjeta: sal gratis de la Prisión Aduanera', libre: true },
];
export const RETRASOS = [
  { img: 'rt-01', t: 'Vuelo retrasado', x: 'Tu vuelo sale con horas de retraso.', e: 'Pierdes el próximo turno', pierdeTurno: true },
  { img: 'rt-02', t: 'Maleta perdida', x: 'Tu equipaje no aparece: compras de urgencia.', e: '−60 M (al bote del Paraíso Fiscal)', d: -60 },
  { img: 'rt-03', t: 'Tormenta', x: 'Los vuelos se quedan en tierra: paga el hotel.', e: '−50 M', d: -50 },
  { img: 'rt-04', t: 'Sobreventa', x: 'Han vendido tu asiento: compensa a los demás.', e: '−20 M a cada jugador', todos: -20 },
  { img: 'rt-05', t: 'Pasaporte perdido', x: 'Gestiones urgentes en el consulado.', e: '−100 M', d: -100 },
  { img: 'rt-06', t: 'Huelga aérea', x: 'Los controladores aéreos paran el trabajo.', e: 'No cobras alquileres hasta tu próximo turno', huelga: true },
  { img: 'rt-07', t: 'Niebla', x: 'Visibilidad cero en la pista.', e: 'Retrocede 3 casillas', atras: 3 },
  { img: 'rt-08', t: 'Conexión perdida', x: 'Llegas tarde al enlace.', e: 'Retrocede hasta la terminal más cercana', terminal: true },
  { img: 'rt-09', t: 'Avería técnica', x: 'Reparaciones urgentes en la flota.', e: '−20 M por mejora de vuelo y −50 M por Jet Privado', averia: [20, 50] },
  { img: 'rt-10', t: 'Choque con aves', x: 'Daños en el motor del avión.', e: 'Pierdes 1 mejora de vuelo (si no tienes, −30 M)', pierdeMejora: 30 },
  { img: 'rt-11', t: 'Vuelo cancelado', x: 'Cancelan tu vuelo.', e: 'Vuelve a Embarque sin cobrar', embarque: true },
  { img: 'rt-12', t: 'Cola interminable', x: 'Te quedas atrapado en el control.', e: 'Ve a la Prisión Aduanera sin cobrar', prision: true },
  { img: 'rt-13', t: 'Seguro de viaje', x: 'Tu seguro cubre hasta los líos con la aduana.', e: 'Tarjeta: sal gratis de la Prisión Aduanera', libre: true },
];
export const MAZOS = { souvenirs: SOUVENIRS, retrasos: RETRASOS };
export const MAZO_NOMBRE = { souvenirs: 'Souvenir', retrasos: 'Retrasos' };
export const LIBRE = { souvenirs: SOUVENIRS.findIndex(c => c.libre), retrasos: RETRASOS.findIndex(c => c.libre) };   // índice de la tarjeta «sal de la Prisión» de cada mazo

export const COLORES_JUGADOR = ['#E5383B', '#2F6BFF', '#0FB56A', '#F5A60B'];   // por defecto (la Apariencia permite cambiarlos)
export const NOMBRES_BOT = ['CPU 1', 'CPU 2', 'CPU 3'];
