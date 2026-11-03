// Bingo de 90 bolas (sin DOM, para probarlo con Node): bombo, cartones de 3×9, líneas y bingo, frases para cantar.
export const N = 90;
export const mezclar = (a, rnd = Math.random) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
export const nuevoBombo = rnd => mezclar(Array.from({ length: N }, (_, i) => i + 1), rnd);
export const columna = n => (n >= 90 ? 8 : Math.floor(n / 10));                       // 1–9 → 0, 10–19 → 1 … 80–90 → 8
export const decena = n => Math.floor((n - 1) / 10);                                    // fila del tablero: 1–10 → 0, 11–20 → 1 …

/* ---------- cartones ---------- */
// Un cartón: 3 filas × 9 columnas con 15 números (5 por fila, entre 1 y 3 por columna) ordenados de menor a mayor en cada columna.
export function crearCarton(rnd = Math.random) {
  for (let intento = 0; intento < 200; intento++) {
    const cuenta = Array(9).fill(1); let resto = 6;
    while (resto > 0) { const c = Math.floor(rnd() * 9); if (cuenta[c] < 3) { cuenta[c]++; resto--; } }
    const filas = [0, 0, 0], sel = Array.from({ length: 9 }, () => []);
    const subconjuntos = k => (k === 1 ? [[0], [1], [2]] : k === 2 ? [[0, 1], [0, 2], [1, 2]] : [[0, 1, 2]]);
    const orden = mezclar([...Array(9).keys()], rnd);
    const rec = i => {
      if (i === 9) return filas.every(f => f === 5);
      const c = orden[i];
      for (const s of mezclar(subconjuntos(cuenta[c]), rnd)) {
        if (s.some(f => filas[f] >= 5)) continue;
        s.forEach(f => filas[f]++); sel[c] = s;
        if (rec(i + 1)) return true;
        s.forEach(f => filas[f]--);
      }
      return false;
    };
    if (!rec(0)) continue;
    const m = [[], [], []].map(() => Array(9).fill(0));
    for (let c = 0; c < 9; c++) {
      const lo = c === 0 ? 1 : c * 10, hi = c === 8 ? 90 : c * 10 + 9;
      const nums = mezclar(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i), rnd).slice(0, sel[c].length).sort((a, b) => a - b);
      sel[c].sort((a, b) => a - b).forEach((f, k) => { m[f][c] = nums[k]; });
    }
    return m;
  }
  throw new Error('no se pudo crear el cartón');
}
export const numerosDe = carton => carton.flat().filter(Boolean);
export const numerosFila = fila => fila.filter(Boolean);
// Líneas completas de un cartón dados los números que han salido (Set) → número de filas con sus 5 números fuera
export const lineasCompletas = (carton, salidos) => carton.filter(f => numerosFila(f).every(n => salidos.has(n))).length;
export const hayBingo = (carton, salidos) => numerosDe(carton).every(n => salidos.has(n));
// ¿Es un cartón válido? (para el que se teclea a mano: 3 filas de 5 números distintos entre 1 y 90)
export function validarFilas(filas) {
  if (!Array.isArray(filas) || filas.length !== 3) return 'Hacen falta 3 filas.';
  const vistos = new Set();
  for (const f of filas) {
    if (!Array.isArray(f) || f.length !== 5) return 'Cada fila lleva 5 números.';
    for (const n of f) {
      if (!Number.isInteger(n) || n < 1 || n > 90) return 'Los números van del 1 al 90.';
      if (vistos.has(n)) return `El ${n} está repetido.`;
      vistos.add(n);
    }
  }
  return null;
}
// Comprobación de un cartón tecleado: { lineas: [índices de fila completos], bingo, faltan: [números que no han salido] }
export function comprobar(filas, salidos) {
  const lineas = [], faltan = [];
  filas.forEach((f, i) => { if (f.every(n => salidos.has(n))) lineas.push(i); f.forEach(n => { if (!salidos.has(n)) faltan.push(n); }); });
  return { lineas, bingo: faltan.length === 0, faltan: faltan.sort((a, b) => a - b) };
}

/* ---------- cantar las bolas ---------- */
const U = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
  'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const D = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
export const palabras = n => (n < 30 ? U[n] : n % 10 === 0 ? D[n / 10] : `${D[Math.floor(n / 10)]} y ${U[n % 10]}`);
// Para que la voz no se confunda entre 6 y 9 (y entre números parecidos) se dicen las dos cifras: «el 69: seis, nueve».
export const cifras = n => String(n).split('').map(c => U[+c]).join(', ');
export function frase(n, apodos, apodo = '') {
  const base = palabras(n);
  if (apodos === 'tombola' && apodo) return `${base}. ${apodo}`;
  return n > 9 ? `${base}. ${cifras(n)}` : base;
}

// Comprobación con una lista de números (5 de una línea o los 15 del cartón): todos tienen que haber salido.
export function validarNumeros(nums, cuantos) {
  const vacios = nums.filter(n => !n).length;
  if (nums.length !== cuantos || vacios) return `Faltan ${vacios || cuantos} números por elegir (hacen falta ${cuantos}).`;
  if (nums.some(n => !Number.isInteger(n))) return 'Número no válido.';
  if (nums.some(n => n < 1 || n > N)) return 'Los números van del 1 al 90.';
  if (new Set(nums).size !== nums.length) return 'Hay números repetidos.';
  return null;
}
export function comprobarNumeros(nums, salidos) { const faltan = nums.filter(n => !salidos.has(n)).sort((a, b) => a - b); return { ok: faltan.length === 0, faltan }; }
