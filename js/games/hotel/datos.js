// Hotel · datos del tablero y de los 8 hoteles (sin DOM).
// Basado en el juego de mesa «Hotel» (Milton Bradley, 1986): precios y tarifas de la edición 1986-1992.
// El trazado del camino y la posición de las casillas es propio (el tablero real no se publica con coordenadas).

export const COLORES_JUGADOR = ['#E0243A', '#2F6BFF', '#12A05C', '#F2B600'];
export const NOMBRES_COLOR = ['Rojo', 'Azul', 'Verde', 'Amarillo'];
export const COCHES = ['🚗', '🚕', '🚙', '🏎️'];

// ---------- reglas generales ----------
export const DINERO_INICIAL = 12000;
export const SALARIO = 2000;           // al pasar por el Banco
export const PRECIO_MIN_PUJA = 100;
export const MAX_ENTRADAS = 8;         // tope de entradas por hotel
// Dado de permiso de obras (6 caras): 3 verdes (concedido), 1 rojo (denegado), 1 «H» (gratis), 1 «×2» (doble coste)
export const DADO_PERMISO = ['verde', 'verde', 'verde', 'rojo', 'H', 'x2'];

// ---------- hoteles ----------
// edif: [{ c: coste, r: tarifa por noche una vez construido }] en orden (el primero es el edificio principal)
// inst: instalación de ocio (jardín / piscina), solo cuando el hotel está completo. Sin permiso de obras.
export const HOTELES = {
  fuji: { nombre: 'Fujiyama', tierra: 1000, entrada: 100, edif: [{ c: 2200, r: 100 }, { c: 1400, r: 100 }, { c: 1400, r: 200 }], inst: { c: 500, r: 400 }, color: '#E4573D', estilo: 'pagoda' },
  boom: { nombre: 'Boomerang', tierra: 500, entrada: 100, edif: [{ c: 1800, r: 400 }], inst: { c: 250, r: 600 }, color: '#1FA2A6', estilo: 'boomerang' },
  etoile: { nombre: "L'Etoile", tierra: 3000, entrada: 250, edif: [{ c: 3300, r: 150 }, { c: 2200, r: 300 }, { c: 1800, r: 300 }, { c: 1800, r: 300 }, { c: 1800, r: 450 }], inst: { c: 4000, r: 750 }, color: '#B8564B', estilo: 'clasico' },
  pres: { nombre: 'President', tierra: 3500, entrada: 250, edif: [{ c: 5000, r: 200 }, { c: 3000, r: 400 }, { c: 2250, r: 600 }, { c: 1750, r: 800 }], inst: { c: 5000, r: 1200 }, color: '#3B7DD8', estilo: 'torre' },
  royal: { nombre: 'Royal', tierra: 2500, entrada: 200, edif: [{ c: 3600, r: 150 }, { c: 2600, r: 300 }, { c: 1800, r: 300 }, { c: 1800, r: 450 }], inst: { c: 3000, r: 600 }, color: '#6C4DB8', estilo: 'hexagono' },
  waik: { nombre: 'Waikiki', tierra: 2500, entrada: 200, edif: [{ c: 3500, r: 200 }, { c: 2500, r: 350 }, { c: 2500, r: 500 }, { c: 1750, r: 500 }, { c: 1750, r: 650 }], inst: { c: 2500, r: 1000 }, color: '#F08A24', estilo: 'playa' },
  taj: { nombre: 'Taj Mahal', tierra: 1500, entrada: 100, edif: [{ c: 2400, r: 100 }, { c: 1000, r: 100 }, { c: 500, r: 200 }], inst: { c: 1000, r: 300 }, color: '#E0B84A', estilo: 'cupula' },
  safari: { nombre: 'Safari', tierra: 2000, entrada: 150, edif: [{ c: 2600, r: 100 }, { c: 1200, r: 100 }, { c: 1200, r: 250 }], inst: { c: 2000, r: 500 }, color: '#7A8F3A', estilo: 'cabana' },
};
export const IDS_HOTEL = Object.keys(HOTELES);
export const nEdif = id => HOTELES[id].edif.length;
// Tarifa por noche del hotel según lo construido (etapa = nº de edificios; inst = instalación hecha)
export const tarifa = (id, etapa, inst) => (etapa <= 0 ? 0 : inst ? HOTELES[id].inst.r : HOTELES[id].edif[Math.min(etapa, nEdif(id)) - 1].r);
// Coste total de dejar un hotel completo (terreno + edificios + instalación), sin entradas
export const costeTotal = id => { const h = HOTELES[id]; return h.tierra + h.edif.reduce((a, e) => a + e.c, 0) + h.inst.c; };

// ---------- tablero ----------
export const MAPA = { W: 18, H: 14 };
// Camino de 48 casillas, en el sentido de las agujas del reloj. [fila, columna]
const WP = [[10, 2], [3, 2], [3, 6], [5, 6], [5, 8], [3, 8], [3, 13], [6, 13], [6, 11], [8, 11], [8, 13], [10, 13], [10, 8], [8, 8], [8, 6], [10, 6], [10, 2]];
function trazar(wp) {
  const out = [];
  for (let i = 0; i < wp.length - 1; i++) {
    const [a, b] = wp[i], [c, d] = wp[i + 1], dr = Math.sign(c - a), dc = Math.sign(d - b); let r = a, k = b;
    for (;;) { const u = out[out.length - 1]; if (!u || u[0] !== r || u[1] !== k) out.push([r, k]); if (r === c && k === d) break; r += dr; k += dc; }
  }
  const u = out[out.length - 1]; if (u[0] === out[0][0] && u[1] === out[0][1]) out.pop();
  return out;
}
export const CAMINO = trazar(WP);
export const N = CAMINO.length;
// Tipos de casilla: P aparcamiento (salida) · C compra de terreno · O permiso de obras · E entrada libre · F construye una fase libre · N camino
const TIPOS = 'PCOCCECCFCO' + 'CNCCOCCCOCE' + 'CCNCOFNOCNCCOEN' + 'CCOFCNCCOCC';
export const TIPO = TIPOS.slice(0, N).split('');
export const INFO_TIPO = {
  P: { nombre: 'Aparcamiento', ico: '🅿️' }, C: { nombre: 'Compra de terreno', ico: '🏷️' }, O: { nombre: 'Permiso de obras', ico: '📋' },
  E: { nombre: 'Entrada libre', ico: '🚪' }, F: { nombre: 'Construye una fase gratis', ico: '🏗️' }, N: { nombre: 'Camino', ico: '' },
};
// Líneas que se cruzan entre dos casillas consecutivas: el Banco (cobras 2000) y el Ayuntamiento (compras entradas)
export const LINEA_BANCO = 41;          // entre la casilla 41 y la 42
export const LINEA_AYTO = 27;           // entre la 27 y la 28
// Terrenos: celdas [fila, columna] de cada hotel
const rect = (f0, c0, f1, c1) => { const o = []; for (let f = f0; f <= f1; f++) for (let c = c0; c <= c1; c++) o.push([f, c]); return o; };
export const TERRENOS = {
  fuji: rect(0, 2, 2, 5), boom: rect(2, 7, 4, 7), etoile: rect(4, 9, 5, 12), pres: rect(0, 9, 2, 13), royal: rect(4, 3, 9, 5),
  waik: [...rect(7, 12, 7, 13), ...rect(3, 14, 10, 16)], taj: [...rect(9, 7, 10, 7), ...rect(11, 7, 12, 9)], safari: rect(11, 2, 12, 6),
};
// Edificios públicos del centro y adornos
export const BANCO = { f0: 6, c0: 6, f1: 7, c1: 7 };
export const AYUNTAMIENTO = { f0: 6, c0: 9, f1: 7, c1: 10 };
export const LAGO = { f0: 9, c0: 9, f1: 9, c1: 12 };

// ---------- derivados (adyacencias) ----------
const clave = (f, c) => f + ',' + c;
const idxCamino = new Map(CAMINO.map(([f, c], i) => [clave(f, c), i]));
const VEC = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// Para cada casilla: terrenos a los que da y, para cada uno, la dirección [df, dc] hacia el terreno (para colocar la entrada)
export const LADOS = CAMINO.map(() => []);
export const CASILLAS_DE = {};
for (const [id, celdas] of Object.entries(TERRENOS)) {
  CASILLAS_DE[id] = [];
  for (const [f, c] of celdas) for (const [df, dc] of VEC) {
    const i = idxCamino.get(clave(f + df, c + dc)); if (i == null) continue;
    if (!LADOS[i].some(l => l.h === id)) { LADOS[i].push({ h: id, d: [-df, -dc] }); CASILLAS_DE[id].push(i); }
  }
  CASILLAS_DE[id].sort((a, b) => a - b);
}
// Casillas de compra: solo valen si dan a algún terreno
export const ADYACENTES = LADOS.map(l => l.map(x => x.h));
export const casillaCompra = i => TIPO[i] === 'C' && ADYACENTES[i].length > 0;
export const dedicada = (i, h) => ADYACENTES[i].length === 1 && ADYACENTES[i][0] === h;

export const NOMBRE_CASILLA = i => (INFO_TIPO[TIPO[i]].nombre + (ADYACENTES[i].length ? ' · ' + ADYACENTES[i].map(h => HOTELES[h].nombre).join(' / ') : ''));

// Dónde se levanta cada edificio dentro del terreno: [fila0, col0, fila1, col1] (celdas, inclusive). El último rectángulo es la instalación de ocio.
export const ANCLAS = {
  fuji: [[0, 2, 1, 3], [0, 4, 1, 5], [2, 2, 2, 3], [2, 4, 2, 5]],
  boom: [[2, 7, 3, 7], [4, 7, 4, 7]],
  etoile: [[4, 9, 5, 9], [4, 10, 4, 10], [5, 10, 5, 10], [4, 11, 4, 11], [5, 11, 5, 11], [4, 12, 5, 12]],
  pres: [[0, 9, 1, 10], [0, 11, 1, 12], [0, 13, 1, 13], [2, 9, 2, 12], [2, 13, 2, 13]],
  royal: [[4, 3, 5, 5], [6, 3, 6, 5], [7, 3, 7, 5], [8, 3, 8, 5], [9, 3, 9, 5]],
  waik: [[3, 14, 5, 16], [6, 14, 7, 16], [7, 12, 7, 13], [8, 14, 8, 16], [9, 14, 9, 16], [10, 14, 10, 16]],
  taj: [[11, 7, 12, 8], [9, 7, 10, 7], [11, 9, 11, 9], [12, 9, 12, 9]],
  safari: [[11, 2, 12, 3], [11, 4, 11, 4], [12, 4, 12, 4], [11, 5, 12, 6]],
};
