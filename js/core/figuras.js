// Figuras de ficha (imágenes IA en gris, img/fichas/p·a·v): 12 neutras, 12 animales y 12 vehículos. Se tiñen con el color del jugador (core/tinte.js).
//   · grupoFigura(): grupo de 🎨 Apariencia (rejilla de miniaturas).  · figuraTintada(id, hex, alListo): URL ya teñida o null (y avisa cuando esté lista).
import { tintar } from './tinte.js';
const NEUTRAS = [['canica', 'Canica'], ['peon', 'Peón'], ['estrella', 'Estrella'], ['diamante', 'Diamante'], ['muneco', 'Muñeco'], ['cono', 'Cono'], ['corazon', 'Corazón'], ['hexagono', 'Hexágono'], ['torre', 'Torre'], ['cohete', 'Cohete'], ['huella', 'Huella'], ['corona', 'Corona']];
const ANIMALES = [['perro', 'Perro'], ['gato', 'Gato'], ['caballo', 'Caballo'], ['cerdo', 'Cerdo'], ['delfin', 'Delfín'], ['tortuga', 'Tortuga'], ['raya', 'Raya'], ['tiburon', 'Tiburón'], ['leon', 'León'], ['tigre', 'Tigre'], ['jirafa', 'Jirafa'], ['aguila', 'Águila']];
const VEHICULOS = [['bici', 'Bicicleta'], ['coche', 'Coche'], ['moto', 'Moto'], ['deportiva', 'Deportiva'], ['pickup', 'Pick-up'], ['quad', 'Quad'], ['camion', 'Camión'], ['lancha', 'Lancha'], ['velero', 'Velero'], ['submarino', 'Submarino'], ['avion', 'Avión'], ['globo', 'Globo']];
export const FIGURAS = [...NEUTRAS.map(([id, nombre]) => ({ id, nombre, dir: 'p' })), ...ANIMALES.map(([id, nombre]) => ({ id, nombre, dir: 'a' })), ...VEHICULOS.map(([id, nombre]) => ({ id, nombre, dir: 'v' }))];
export const urlFigura = id => { const f = FIGURAS.find(x => x.id === id) || FIGURAS[0]; return `img/fichas/${f.dir}/${f.id}.webp`; };
export const nombreFigura = id => (FIGURAS.find(x => x.id === id) || FIGURAS[0]).nombre;
export const grupoFigura = ({ clave = 'fichas', titulo = 'Figura de las fichas', def = 'canica' } = {}) => ({ clave, titulo, icono: '🧩', ventana: true, forma: 'figura', def,
  opciones: FIGURAS.map(f => ({ id: f.id, nombre: f.nombre, img: `img/fichas/${f.dir}/${f.id}.webp` })) });
const listas = new Map(), hechas = new Map();
// Devuelve la URL de la figura teñida si ya está lista; si no, la prepara y llama a alListo() al terminar.
export function figuraTintada(id, hex, alListo) {
  const k = id + '|' + hex; if (hechas.has(k)) return hechas.get(k);
  if (!listas.has(k)) listas.set(k, tintar(urlFigura(id), hex).then(u => { hechas.set(k, u); return u; }).catch(() => null));
  if (alListo) listas.get(k).then(u => { if (u) alListo(); });
  return null;
}
// Pone la figura teñida como fondo de un elemento DOM (clase .fig). Mientras se tiñe, el elemento conserva su aspecto normal.
export function fondoFigura(el, id, hex, alListo) {
  const u = figuraTintada(id, hex, alListo);
  if (u) { el.style.backgroundImage = `url("${u}")`; el.classList.add('fig'); } else { el.style.backgroundImage = ''; el.classList.remove('fig'); }
  return !!u;
}
// Fichas en HTML: <i class="figp" data-c="#hex"></i>. observarFiguras(raíz, () => id) las pinta solas (también las que se añadan después).
export function observarFiguras(raiz, dame) {
  let tarea = 0;
  const pintar = () => { tarea = 0; const id = dame(); raiz.querySelectorAll('.figp').forEach(e => { const k = id + '|' + e.dataset.c; if (e.dataset.k !== k) { e.dataset.k = k; fondoFigura(e, id, e.dataset.c, pintar); } else if (!e.classList.contains('fig')) fondoFigura(e, id, e.dataset.c, pintar); }); };
  const mo = new MutationObserver(() => { if (!tarea) tarea = requestAnimationFrame(pintar); });
  mo.observe(raiz, { childList: true, subtree: true });
  pintar();
  return { repintar: pintar, parar: () => mo.disconnect() };
}
