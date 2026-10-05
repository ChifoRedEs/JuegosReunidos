// Geometría y constantes del tablero de Parchís (sin DOM).
// Posición de cada ficha (relativa a su color): -1 casa · 0 salida · 0..63 vuelta de 68 casillas · 64..70 pasillo · 71 meta
export const PC = ['am', 'az', 'ro', 've'];
export const PNAME = { am: 'Amarillo', az: 'Azul', ro: 'Rojo', ve: 'Verde' };
export const PCOL = { am: '#F2B84B', az: '#2B6CB0', ro: '#D6453D', ve: '#2E9E5B' };
export const PINK = { am: '#1B2A3A', az: '#fff', ro: '#fff', ve: '#fff' };
export const PSTART = { am: 5, az: 22, ro: 39, ve: 56 };
export const PSAFE = new Set([5, 12, 17, 22, 29, 34, 39, 46, 51, 56, 63, 68]);
export const PHOUSE = { am: [110, 110], az: [110, 0], ro: [0, 0], ve: [0, 110] };
export const PMETA = { am: [95, 104, 1, 0], az: [104, 95, 0, 1], ro: [95, 86, 1, 0], ve: [86, 95, 0, 1] };
export const PTRI = { am: '80,110 110,110 95,95', az: '110,80 110,110 95,95', ro: '80,80 110,80 95,95', ve: '80,80 80,110 95,95' };
export const PCORR = (c, k) => ({ am: [18 - k, 9], az: [9, 18 - k], ro: [k, 9], ve: [9, k] })[c];
export const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
export const PTRACK = [null];   // casilla 1..68 -> [fila, columna] en una rejilla de 19×19
for (let n = 1; n <= 68; n++) {
  let r, c;
  if (n <= 8) { r = 19 - n; c = 10; } else if (n <= 16) { r = 10; c = n + 2; } else if (n === 17) { r = 9; c = 18; }
  else if (n <= 25) { r = 8; c = 36 - n; } else if (n <= 33) { r = 33 - n; c = 10; } else if (n === 34) { r = 0; c = 9; }
  else if (n <= 42) { r = n - 35; c = 8; } else if (n <= 50) { r = 8; c = 50 - n; } else if (n === 51) { r = 9; c = 0; }
  else if (n <= 59) { r = 10; c = n - 52; } else if (n <= 67) { r = n - 49; c = 8; } else { r = 18; c = 9; }
  PTRACK.push([r, c]);
}
export const absOf = (c, p) => (PSTART[c] - 1 + p) % 68 + 1;
export const pKey = (c, p) => p <= 63 ? 'T' + absOf(c, p) : c + p;
// Coordenadas SVG (viewBox 190×190) de la ficha i del color c en la posición p
export function pXY(c, p, i) {
  if (p === -1) { const [hx, hy] = PHOUSE[c]; return [hx + 40 + (i % 2 ? 9 : -9), hy + 40 + (i < 2 ? -9 : 9)]; }
  if (p === 71) { const [mx, my, dx, dy] = PMETA[c], o = (i - 1.5) * 4.6; return [mx + dx * o, my + dy * o]; }
  const [r, cc] = p <= 63 ? PTRACK[absOf(c, p)] : PCORR(c, p - 63);
  return [cc * 10 + 5, r * 10 + 5];
}
