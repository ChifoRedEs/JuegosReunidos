// Azar con semilla para el «Reto del día»: el mismo día, todo el mundo recibe el mismo tablero.
// conSemilla(texto, fn) ejecuta fn con Math.random sustituido por un generador determinista (mulberry32).
// Los generadores de los juegos usan Math.random (directamente o con rnd/shuffle de core/dom.js), así que no hay que tocarlos.
export function hashTexto(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function conSemilla(semilla, fn) {
  const orig = Math.random; Math.random = mulberry32(hashTexto(String(semilla)));
  try { return fn(); } finally { Math.random = orig; }
}
// Fecha local AAAA-MM-DD (el reto cambia a medianoche de cada usuario).
export const hoy = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fechaLarga = f => { const [a, m, d] = f.split('-').map(Number); return new Date(a, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }); };
// Igual que conSemilla pero para generadores asíncronos (que ceden el hilo entre intentos): la semilla dura toda la promesa.
export async function conSemillaAsync(semilla, fn) {
  const orig = Math.random; Math.random = mulberry32(hashTexto(String(semilla)));
  try { return await fn(); } finally { Math.random = orig; }
}
