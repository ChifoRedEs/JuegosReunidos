// Color de las fichas y piezas «neutras» (dibujadas en grises con contorno azul marino): se tiñen en el momento con una paleta corta y elegante.
// Solo cambian los píxeles grises: el contorno, los brillos de color (corona, fruta, ojos…) y la transparencia se conservan.
//   · PALETA: los colores que ofrece la app (pocos, suaves).  · gruposColor(): grupos de 🎨 Apariencia.  · tintar(url, hex) → Promise<url> (con caché)
export const PALETA = [
  { id: 'marfil',    nombre: 'Marfil',          hex: '#EFE6D2' }, { id: 'grafito',   nombre: 'Grafito',        hex: '#6C7686' },
  { id: 'burdeos',   nombre: 'Burdeos suave',   hex: '#B0626F' }, { id: 'denim',     nombre: 'Azul denim',     hex: '#6E92BA' },
  { id: 'rosa',      nombre: 'Rosa empolvado',  hex: '#E8B9C5' }, { id: 'lavanda',   nombre: 'Lavanda',        hex: '#B9A8D8' },
  { id: 'salvia',    nombre: 'Verde salvia',    hex: '#A6C8A0' }, { id: 'mostaza',   nombre: 'Mostaza suave',  hex: '#E3BC62' },
  { id: 'coral',     nombre: 'Coral',           hex: '#EC8A72' }, { id: 'aguamarina', nombre: 'Aguamarina',    hex: '#8FD8C6' },
  { id: 'turquesa',  nombre: 'Turquesa',        hex: '#3FA9A2' },
];
export const hexDe = id => (PALETA.find(c => c.id === id) || PALETA[0]).hex;
// Grupos de 🎨 Apariencia: un grupo de color por bando. def: ids por defecto de cada bando.
export function gruposColor({ clave = 'f', lados = ['Color'], defs = ['marfil'], titulo = 'Color de las fichas', icono = '🎨' } = {}) {
  return lados.map((lado, i) => ({ clave: clave + 'color' + (i ? i + 1 : ''), titulo: lados.length > 1 ? `${titulo} · ${lado}` : titulo, icono, def: defs[i] || defs[0], soloColor: true,
    opciones: PALETA.map(c => ({ id: c.id, nombre: c.nombre, sw: [c.hex] })) }));
}
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const cache = new Map(), imgs = new Map();
const cargar = url => imgs.get(url) || (imgs.set(url, new Promise((ok, ko) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ko(new Error('imagen: ' + url)); im.src = url; })), imgs.get(url));
const LREF = 214, SAT0 = 22, SAT1 = 42;       // gris de referencia del cuerpo · saturación hasta la que un píxel cuenta como «neutro»
export async function tintar(url, hex) {
  const k = url + '|' + hex; if (cache.has(k)) return cache.get(k);
  const p = (async () => {
    const im = await cargar(url), w = im.naturalWidth, h = im.naturalHeight, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(im, 0, 0);
    const d = cx.getImageData(0, 0, w, h), a = d.data, [tr, tg, tb] = rgb(hex), T = [tr, tg, tb], tope = 255 / LREF - 1;
    for (let i = 0; i < a.length; i += 4) {
      if (a[i + 3] === 0) continue;
      const r = a[i], g = a[i + 1], b = a[i + 2], mx = Math.max(r, g, b), sat = mx - Math.min(r, g, b);
      if (sat >= SAT1) continue;
      const wgt = sat <= SAT0 ? 1 : (SAT1 - sat) / (SAT1 - SAT0), f = (r + g + b) / 3 / LREF;
      for (let c = 0; c < 3; c++) {
        const t = T[c], n = f <= 1 ? t * f : t + (255 - t) * Math.min(1, (f - 1) / tope);
        a[i + c] = Math.round(a[i + c] + (n - a[i + c]) * wgt);
      }
    }
    cx.putImageData(d, 0, 0);
    const blob = await new Promise(ok => cv.toBlob(ok, 'image/png'));
    return URL.createObjectURL(blob);
  })();
  cache.set(k, p); return p;
}
// Precarga varias a la vez: devuelve { clave: urlTintada }
export async function tintarTodas(lista, hex) { const out = {}; await Promise.all(lista.map(async ([clave, url]) => { out[clave] = await tintar(url, hex); })); return out; }
// Pone en `raiz` variables CSS --xx: url(...) con la imagen teñida. lista: [[variable, url, hex], …]; sig evita repetir el trabajo cuando nada ha cambiado.
export async function variablesTintadas(raiz, lista, sig) {
  if (!raiz || raiz.dataset.tsig === sig) return; raiz.dataset.tsig = sig;
  try {
    const urls = await Promise.all(lista.map(([, src, hex]) => tintar(src, hex)));
    if (raiz.dataset.tsig !== sig) return;
    lista.forEach(([v], i) => raiz.style.setProperty(v, `url("${urls[i]}")`));
  } catch { delete raiz.dataset.tsig; }
}
export const MATERIALES = [{ id: 'liso', nombre: 'Lisas' }, { id: 'madera', nombre: 'Madera' }, { id: 'piedra', nombre: 'Piedra' }];
export const matDe = id => (['madera', 'piedra'].includes(id) ? id : 'liso');
