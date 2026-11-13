// Magnate Urbano · datos del tablero (fijos: no cambian durante la partida).
// Los NOMBRES de las casillas están en CASILLAS (más abajo); los textos de las cartas, en NOTICIAS y TENDENCIAS.
// Las calles se agrupan por temas (insectos, animales acuáticos, aves…): nombres inventados, sin marcas reales.
// Economía propia: precios, alquileres, costes de oficina e importes de cartas no copian los de ningún otro juego.

// Grupos de empresas: color (paleta de los juegos), sector, coste de cada oficina y
// multiplicadores del alquiler básico con 1, 2, 3 y 4 oficinas y con la sede central (5).
export const GRUPOS = {
  red: { color: '#8B5E3C', sector: 'Insectos', oficina: 60, mult: [5, 14, 40, 70, 100] },
  mus: { color: '#0FB3C9', sector: 'Animales acuáticos', oficina: 60, mult: [5, 14, 40, 62, 85] },
  mov: { color: '#FF4FA3', sector: 'Aves', oficina: 110, mult: [5, 14, 40, 56, 70] },
  for: { color: '#FF7A1A', sector: 'Animales terrestres', oficina: 110, mult: [5, 13, 36, 47, 56] },
  vid: { color: '#FF4757', sector: 'Dinosaurios', oficina: 160, mult: [5, 13, 36, 46, 55] },
  ele: { color: '#FFC21A', sector: 'Gemas y minerales', oficina: 160, mult: [5, 14, 34, 42, 50] },
  chi: { color: '#0FB56A', sector: 'Plantas y árboles', oficina: 210, mult: [5, 14, 33, 40, 47] },
  gig: { color: '#2F6BFF', sector: 'Planetas', oficina: 210, mult: [5, 13, 30, 36, 42] },
};
export const SALARIO = 220;            // al pasar por la Ronda de Inversión
export const FIANZA = 60;              // para salir de la Auditoría
export const OFICINAS = 30, SEDES = 10; // límite del banco
export const NUBE = { precio: 180, alquiler: [30, 60, 110, 180] };   // alquiler según cuántas nubes tiene el dueño
export const RED = { precio: 140, veces: [5, 12] };                  // alquiler = dados × 5 (o × 12 con las dos redes)

const E = (nombre, g, precio, alquiler) => ({ nombre, tipo: 'empresa', g, precio, alquiler });
const N = nombre => ({ nombre, tipo: 'nube', precio: NUBE.precio });
const R = (nombre, ico) => ({ nombre, tipo: 'red', precio: RED.precio, ico });
const ESQ = (nombre, ico, corto) => ({ nombre, tipo: 'esquina', ico, corto });
const NOT = () => ({ nombre: 'Noticias', tipo: 'noticias' }), TEN = () => ({ nombre: 'Tendencias', tipo: 'tendencias' });
const IMP = (nombre, importe) => ({ nombre, tipo: 'impuesto', importe });

export const SALIDA = 0, ESPERA = 10, PARAISO = 20, AUDITORIA = 30;
export const CASILLAS = [
  ESQ('Ronda de Inversión', '🚀', 'Salida'), E('Calle de la Hormiga', 'red', 70, 3), TEN(), E('Calle de la Abeja', 'red', 70, 5), IMP('Impuesto Digital', 180), N('Nube Cirro'), E('Calle de la Medusa', 'mus', 110, 7), NOT(), E('Calle del Delfín', 'mus', 110, 7), E('Calle de la Ballena', 'mus', 130, 9),
  ESQ('Sala de Espera', '⏳', 'Espera'), E('Calle del Colibrí', 'mov', 150, 11), R('Red 5G', '📡'), E('Calle del Flamenco', 'mov', 150, 11), E('Calle del Águila', 'mov', 170, 13), N('Nube Cúmulo'), E('Calle del Zorro', 'for', 190, 15), TEN(), E('Calle del Lobo', 'for', 190, 15), E('Calle del Oso', 'for', 210, 17),
  ESQ('Paraíso Fiscal', '🏝️', 'Paraíso'), E('Calle del Raptor', 'vid', 230, 19), NOT(), E('Calle del Triceratops', 'vid', 230, 19), E('Calle del T-Rex', 'vid', 250, 21), N('Nube Estrato'), E('Calle del Topacio', 'ele', 270, 23), E('Calle del Rubí', 'ele', 270, 23), R('Red Satélite', '🛰️'), E('Calle del Jade', 'ele', 290, 25),
  ESQ('Auditoría Fiscal', '🕵️', 'Auditoría'), E('Calle del Roble', 'chi', 310, 27), E('Calle del Olivo', 'chi', 310, 27), TEN(), E('Calle de la Secuoya', 'chi', 330, 29), N('Nube Nimbo'), NOT(), E('Avenida de Saturno', 'gig', 360, 34), IMP('Sanción de Privacidad', 120), E('Avenida de Júpiter', 'gig', 420, 46),
];

// Cartas. d = dinero (+ cobras / − pagas) · ir = avanzar hasta la casilla · atras = retroceder ·
// auditoria = ir a la Auditoría · libre = pase para salir de la Auditoría · todos = cada jugador (+ te paga / − les pagas) ·
// obras = pagar por cada oficina y sede · nube = avanzar hasta la próxima nube (pagando el doble si tiene dueño)
export const NOTICIAS = [
  { t: 'Tu app arrasa en las tiendas: cobra 160M.', d: 160 },
  { t: 'Una brecha de seguridad te cuesta 90M.', d: -90 },
  { t: 'Te invitan a la Avenida de Júpiter: avanza hasta allí.', ir: 39 },
  { t: 'Nueva ronda de financiación: avanza hasta la Ronda de Inversión.', ir: 0 },
  { t: 'Un error en producción te obliga a dar marcha atrás: retrocede 3 casillas.', atras: 3 },
  { t: 'Hacienda revisa tus cuentas: ve directamente a la Auditoría Fiscal.', auditoria: true },
  { t: 'Contratas a un buen asesor: pase para salir de la Auditoría (guárdalo).', libre: true },
  { t: 'Tu lanzamiento sale mal: paga 30M a cada jugador.', todos: -30 },
  { t: 'Te interesa la Calle de la Secuoya: avanza hasta allí.', ir: 34 },
  { t: 'Migración urgente: avanza hasta la próxima nube. Si tiene dueño, pagas el doble.', nube: true },
  { t: 'Renuevas los equipos: paga 30M por oficina y 110M por sede.', obras: [30, 110] },
  { t: 'Reparto de beneficios: cobra 60M.', d: 60 },
];
export const TENDENCIAS = [
  { t: 'Te llega capital semilla: cobra 180M.', d: 180 },
  { t: 'Factura de servidores: paga 60M.', d: -60 },
  { t: 'Licencias una de tus patentes: cobra 110M.', d: 110 },
  { t: 'Tu empresa cumple años: cada jugador te regala 15M.', todos: 15 },
  { t: 'Ganas un concurso de programación: cobra 40M.', d: 40 },
  { t: 'Un inspector encuentra irregularidades: ve directamente a la Auditoría Fiscal.', auditoria: true },
  { t: 'Un contacto te echa una mano: pase para salir de la Auditoría (guárdalo).', libre: true },
  { t: 'Te devuelven el IVA: cobra 30M.', d: 30 },
  { t: 'Pleito por una patente: paga 80M.', d: -80 },
  { t: 'Te invitan a la Ronda de Inversión: avanza hasta allí.', ir: 0 },
  { t: 'Mantenimiento de las oficinas: paga 25M por oficina y 90M por sede.', obras: [25, 90] },
  { t: 'Vendes tu viejo dominio web: cobra 50M.', d: 50 },
];
export const COLORES_JUGADOR = ['#FF4757', '#2F6BFF', '#0FB56A', '#FFC21A'];
export const FICHAS = ['🦊', '🤖', '🦄', '🐙', '🚀', '👾', '🐧', '🦉'];
