// Diccionario español para los juegos de palabras (Letras, Scrabble…): ~590.000 formas de 2 a 15 letras
// (plurales, femeninos y conjugaciones), en minúsculas y sin tildes. Lo genera tools/generar_diccionario.py
// a partir del diccionario de LibreOffice. Pesa ~1,5 MB comprimido: solo se descarga cuando un juego lo pide
// y el service worker lo guarda en su propia caché (no se vuelve a bajar en cada actualización de la app).
//
//   await cargar();                 // una vez, antes de usar lo demás (devuelve false si no hay conexión ni copia)
//   existe('Pingüino')              // → true (normaliza: mayúsculas, tildes y diéresis dan igual)
//   formables('aeirstcon', { min: 4, max: 9 })   // palabras que se pueden formar con esas letras (más largas primero)
//   palabras(5)                     // iterador de todas las palabras de 5 letras
//
// Para los demás juegos de palabras hay una lista más ligera (~0,45 MB): las ~47.000 palabras BASE (sin conjugar),
// con tildes, separadas en sustantivos/adjetivos y verbos en infinitivo. No están ordenadas por frecuencia de uso.
//   await cargarLemas();  lemas('n', { min: 4, max: 10 })  // array de sustantivos y adjetivos de 4 a 10 letras
const BASE = new URL('../../data/diccionario/', import.meta.url);
const CACHE = 'jr-diccionario';
let G = null, promesa = null, info = null;      // G[n] = texto con todas las palabras de n letras pegadas
let L = null, promesaL = null;                   // L = { n: [...], v: [...] } palabras base

export function normalizar(p) {
  return String(p).toLowerCase().replace(/ñ/g, '\0').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\0/g, 'ñ');
}
export const cargado = () => !!G;
export const indice = () => info;
async function leerIndice() { if (!info) info = await (await fetch(new URL('indice.json', BASE), { cache: 'no-cache' })).json(); return info; }
export function cargar() {
  if (G) return Promise.resolve(true);
  if (!promesa) promesa = (async () => {
    await leerIndice();
    const url = new URL(info.archivo, BASE), r = await fetch(url);
    if (!r.ok) throw new Error('No se pudo descargar el diccionario');
    desdeTexto(await r.text());
    limpiarVersiones();
    return true;
  })().catch(e => { promesa = null; console.warn(e); return false; });
  return promesa;
}
export function cargarLemas() {
  if (L) return Promise.resolve(true);
  if (!promesaL) promesaL = (async () => {
    await leerIndice();
    const r = await fetch(new URL(info.lemas, BASE)); if (!r.ok) throw new Error('No se pudo descargar la lista de palabras');
    lemasDesdeTexto(await r.text()); limpiarVersiones(); return true;
  })().catch(e => { promesaL = null; console.warn(e); return false; });
  return promesaL;
}
export function lemasDesdeTexto(t) { L = { n: [], v: [] }; for (const linea of t.split('\n')) { const k = linea.indexOf(':'); if (k > 0) L[linea.slice(0, k)] = linea.slice(k + 1).split(' '); } }
export const lemasCargados = () => !!L;
// tipo: 'n' (sustantivos y adjetivos), 'v' (verbos en infinitivo) o 'todos'
export function lemas(tipo = 'n', { min = 3, max = 15 } = {}) {
  if (!L) throw new Error('Llama antes a cargarLemas()');
  const l = tipo === 'todos' ? [...L.n, ...L.v] : L[tipo] || [];
  return min <= 3 && max >= 15 ? l : l.filter(w => w.length >= min && w.length <= max);
}
// Carga el diccionario a partir del texto del archivo (también lo usan las pruebas, que leen el archivo del disco)
export function desdeTexto(t) {
  const g = []; for (const linea of t.split('\n')) { const k = linea.indexOf(':'); if (k > 0) g[+linea.slice(0, k)] = linea.slice(k + 1); }
  G = g;
}
// Borra de la caché las versiones anteriores (cada versión del diccionario tiene su propio nombre de archivo)
async function limpiarVersiones() {
  if (!info) return;
  const actuales = new Set([info.archivo, info.lemas].map(a => new URL(a, BASE).href));
  try { const c = await caches.open(CACHE); for (const req of await c.keys()) if (!actuales.has(req.url)) await c.delete(req); } catch { /* sin Cache API */ }
}
// Búsqueda binaria directamente en el texto (sin crear 590.000 cadenas en memoria)
export function existe(p) {
  if (!G) throw new Error('Llama antes a cargar()');
  const w = normalizar(p), n = w.length, t = G[n];
  if (!t || !/^[a-zñ]+$/.test(w)) return false;
  let lo = 0, hi = t.length / n - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1, x = t.substr(m * n, n);
    if (x === w) return true;
    if (x < w) lo = m + 1; else hi = m - 1;
  }
  return false;
}
export function* palabras(n) { const t = G && G[n]; if (!t) return; for (let i = 0; i < t.length; i += n) yield t.substr(i, n); }
export const total = n => (G && G[n] ? G[n].length / n : 0);
// Palabras que se pueden formar con las letras dadas (cada letra se usa como mucho las veces que aparece)
export function formables(letras, { min = 2, max = 15, limite = Infinity } = {}) {
  const cuenta = new Map(); for (const c of normalizar(letras)) cuenta.set(c, (cuenta.get(c) || 0) + 1);
  const out = [];
  for (let n = Math.min(max, normalizar(letras).length); n >= min && out.length < limite; n--) {
    const t = G[n]; if (!t) continue;
    for (let i = 0; i < t.length && out.length < limite; i += n) {
      const usado = new Map(); let ok = true;
      for (let k = 0; k < n; k++) { const c = t[i + k], u = (usado.get(c) || 0) + 1; if (u > (cuenta.get(c) || 0)) { ok = false; break; } usado.set(c, u); }
      if (ok) out.push(t.substr(i, n));
    }
  }
  return out;
}
