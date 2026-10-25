// Apariencia de las fichas, cajas, bloques… común a varios juegos: color (más de 45), textura, forma y tamaño.
// Cada juego añade a su api.aspecto(...) los grupos de gruposFichas() y lee la elección con estilo(asp.valores).
// Todo es «Original» por defecto, así que el aspecto de cada juego no cambia hasta que el jugador elige algo.
//   · DOM/CSS: aplicarVars(elemento, est) + css/fichas.css (clase .fx en la pieza; atributos data-ftex, data-fforma en .juego-<id>)
//   · Canvas 2D: spriteFicha(hex, est, w, h, r) devuelve un lienzo con color, textura y forma ya pintados (con caché)
//   · Three.js: geoCaja(T, w, h, d, forma) y lienzoTextura(hex, est, tam) (para CanvasTexture)
const hsl = (h, s, l) => { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase(); };
const NEUTROS = [['marfil', 'Marfil', '#F4EEDC'], ['blanco', 'Blanco', '#FFFFFF'], ['plata', 'Plata', '#C3C7CF'], ['gris', 'Gris', '#8A8F98'], ['grafito', 'Grafito', '#3A3D45'], ['negro', 'Negro', '#17181C'],
  ['dorado', 'Dorado', '#D4AF37'], ['bronce', 'Bronce', '#A5682A'], ['crema', 'Crema', '#EBD9A8'], ['hueso', 'Hueso', '#E6DCC3']];
const TONOS = [['Rojo', 0], ['Naranja', 26], ['Amarillo', 48], ['Lima', 78], ['Verde', 128], ['Esmeralda', 158], ['Turquesa', 178], ['Cian', 195], ['Azul', 215], ['Índigo', 238], ['Violeta', 268], ['Magenta', 305], ['Rosa', 338]];
export const COLORES = [...NEUTROS.map(([id, nombre, hex]) => ({ id, nombre, hex })),
  ...TONOS.flatMap(([n, h]) => [['c', 'claro', 75, 72], ['m', '', 72, 48], ['o', 'oscuro', 68, 28]].map(([k, suf, s, l]) => ({ id: `${n.toLowerCase().replace('í', 'i')}-${k}`, nombre: `${n} ${suf}`.trim(), hex: hsl(h, s, l) })))];
export const TEXTURAS = { original: ['Original', ['#C9CDD6', '#8E94A3']], liso: ['Liso', ['#EDE6D2', '#CFC5A6']], brillante: ['Brillante', ['#FFFFFF', '#9EA6B5']], marmol: ['Mármol', ['#F4F1EA', '#8F8C86']], madera: ['Madera', ['#B07A45', '#6B4423']],
  granito: ['Granito', ['#9AA0A8', '#3C3F45']], carbono: ['Fibra de carbono', ['#3B3F47', '#15161A']], metal: ['Metal cepillado', ['#D9DDE3', '#7C838E']], cristal: ['Cristal', ['#D6F1FF', '#7BC3EA']] };
export const FORMAS = { original: 'Original', redonda: 'Esquinas redondeadas', cuadrada: 'Esquinas cuadradas', pildora: 'Píldora', biselada: 'Biselada', marcada: 'Con marco grueso' };
export const TAMANOS = { pequeno: ['Pequeño', .82], normal: ['Normal', 1], grande: ['Grande', 1.14] };

/* ---------- grupos de 🎨 Apariencia ---------- */
// Paleta reducida (se muestra solo con el color, sin nombre): para juegos donde el color de la pieza no condiciona el juego (Dominó, Guerra de Orugas)
export const IDS_POCOS = ['marfil', 'blanco', 'plata', 'gris', 'negro', 'dorado', 'rojo-m', 'naranja-m', 'amarillo-m', 'lima-m', 'verde-m', 'turquesa-m', 'azul-m', 'violeta-m', 'rosa-m', 'azul-o', 'verde-o', 'rojo-o'];
// o: { clave:'f', titulo:'Cajas', icono:'📦', lados:['Rojo','Amarillo'] (un grupo de color por bando: fcolor, fcolor2…), formas:true|false|[ids], tamano:true|false|[ids], textura:true|false, color:true|false, pocos:true (paleta reducida, solo color sin nombre) }
export function gruposFichas(o = {}) {
  const k = o.clave || 'f', t = o.titulo || 'Fichas', out = [];
  if (o.color !== false) (o.lados || [null]).forEach((lado, i) => out.push({ clave: k + 'color' + (i ? i + 1 : ''), titulo: `${t} · Color${lado ? ` (${lado})` : ''}`, icono: o.icono || '🎨', def: 'original', soloColor: !!o.pocos, opciones: [{ id: 'original', nombre: 'Original', emoji: '↩️' }, ...COLORES.filter(c => !o.pocos || IDS_POCOS.includes(c.id)).map(c => ({ id: c.id, nombre: c.nombre, sw: [c.hex] }))] }));
  if (o.textura !== false) out.push({ clave: k + 'tex', titulo: `${t} · Textura`, icono: '✨', def: 'original', opciones: Object.entries(TEXTURAS).map(([id, [nombre, sw]]) => ({ id, nombre, sw })) });
  if (o.formas !== false) { const ids = Array.isArray(o.formas) ? o.formas : Object.keys(FORMAS); out.push({ clave: k + 'forma', titulo: `${t} · Forma`, icono: '📐', def: 'original', opciones: ids.map(id => ({ id, nombre: FORMAS[id] })) }); }
  if (o.tamano !== false) out.push({ clave: k + 'tam', titulo: `${t} · Tamaño`, icono: '🔎', def: 'normal', opciones: Object.entries(TAMANOS).filter(([id]) => !Array.isArray(o.tamano) || o.tamano.includes(id)).map(([id, [nombre]]) => ({ id, nombre })) });
  return out;
}
// Lee la elección. hex = null → conservar el color original del juego.
export function estilo(v = {}, k = 'f') {
  const c = COLORES.find(x => x.id === v[k + 'color']), tex = TEXTURAS[v[k + 'tex']] && v[k + 'tex'] !== 'original' ? v[k + 'tex'] : null,
    forma = FORMAS[v[k + 'forma']] && v[k + 'forma'] !== 'original' ? v[k + 'forma'] : null, esc = (TAMANOS[v[k + 'tam']] || TAMANOS.normal)[1];
  const c2 = COLORES.find(x => x.id === v[k + 'color2']), c3 = COLORES.find(x => x.id === v[k + 'color3']), c4 = COLORES.find(x => x.id === v[k + 'color4']);
  return { hex: c ? c.hex : null, hex2: c2 ? c2.hex : null, hex3: c3 ? c3.hex : null, hex4: c4 ? c4.hex : null, tex, forma, esc, hay: !!(c || c2 || c3 || c4 || tex || forma || esc !== 1), clave: [c && c.id, c2 && c2.id, c3 && c3.id, c4 && c4.id, tex, forma, esc].join('|') };
}

/* ---------- color ---------- */
export const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const aHex = a => '#' + a.map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
export const mezcla = (a, b, t) => { const x = rgb(a), y = rgb(b); return aHex(x.map((v, i) => v + (y[i] - v) * t)); };
export const oscuro = (h, t = .32) => mezcla(h, '#000000', t);
export const claro = (h, t = .3) => mezcla(h, '#FFFFFF', t);
export const luz = h => { const [r, g, b] = rgb(h); return (.299 * r + .587 * g + .114 * b) / 255; };
// n variantes del mismo color (más claras y oscuras) para juegos donde cada pieza debe distinguirse (Klotski…)
export const variantes = (h, n) => Array.from({ length: n }, (_, i) => { const t = n < 2 ? 0 : i / (n - 1) * 2 - 1; return t < 0 ? claro(h, -t * .42) : oscuro(h, t * .38); });

/* ---------- DOM ---------- */
// Variables CSS que usa css/fichas.css y que cada juego puede leer: --fx-c (color), --fx-c2 (borde/sombra), --fx-esc (tamaño)
export function aplicarVars(el, est) {
  if (!el) return;
  if (est.hex) { el.style.setProperty('--fx-c', est.hex); el.style.setProperty('--fx-c2', oscuro(est.hex)); } else { el.style.removeProperty('--fx-c'); el.style.removeProperty('--fx-c2'); }
  el.style.setProperty('--fx-esc', est.esc);
}

/* ---------- textura sobre un rectángulo (lienzo 2D) ---------- */
const prng = s => () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export function capaTextura(c, x, y, w, h, tex) {
  if (!tex) return;
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  const lin = (x0, y0, x1, y1, paradas) => { const g = c.createLinearGradient(x0, y0, x1, y1); paradas.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  const m = Math.min(w, h), r = prng(7);
  if (tex === 'liso') { c.fillStyle = lin(x, y, x + w, y + h, [[0, 'rgba(255,255,255,.3)'], [.45, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.16)']]); c.fillRect(x, y, w, h); }
  else if (tex === 'brillante') { c.fillStyle = lin(x, y, x, y + h, [[0, 'rgba(255,255,255,.6)'], [.48, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.28)']]); c.fillRect(x, y, w, h); }
  else if (tex === 'marmol') {
    c.lineCap = 'round';
    for (let k = 0; k < 7; k++) { c.strokeStyle = k % 2 ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.2)'; c.lineWidth = Math.max(1, m * (.015 + r() * .02)); c.beginPath();
      let px = x + r() * w, py = y; c.moveTo(px, py); for (let s = 1; s <= 4; s++) { px += (r() - .5) * w * .5; py = y + h * s / 4; c.lineTo(px, py); } c.stroke(); }
    c.fillStyle = lin(x, y, x + w, y + h, [[0, 'rgba(255,255,255,.3)'], [.6, 'rgba(255,255,255,0)']]); c.fillRect(x, y, w, h);
  } else if (tex === 'madera') {
    const paso = Math.max(3, m / 9); for (let k = 0, px = x; px < x + w; k++, px += paso * (.6 + r() * .8)) { c.fillStyle = k % 2 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.16)'; c.fillRect(px, y, Math.max(1, paso * .35), h); }
    c.fillStyle = lin(x, y, x, y + h, [[0, 'rgba(255,255,255,.2)'], [.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.16)']]); c.fillRect(x, y, w, h);
  } else if (tex === 'granito') {
    const n = Math.min(260, Math.max(20, w * h / 36)), t = Math.max(1, m / 28); for (let k = 0; k < n; k++) { c.fillStyle = k % 3 ? 'rgba(0,0,0,.38)' : 'rgba(255,255,255,.5)'; c.fillRect(x + r() * w, y + r() * h, t, t); }
  } else if (tex === 'carbono') {
    const s = Math.max(2, m / 9); c.fillStyle = 'rgba(0,0,0,.34)';
    for (let j = 0, py = y; py < y + h; j++, py += s) for (let i = (j % 2), px = x + i * s; px < x + w; i += 2, px += 2 * s) c.fillRect(px, py, s, s);
    c.fillStyle = lin(x, y, x + w, y + h, [[0, 'rgba(255,255,255,.22)'], [.55, 'rgba(255,255,255,0)']]); c.fillRect(x, y, w, h);
  } else if (tex === 'metal') {
    for (let py = y; py < y + h; py += 2) { c.fillStyle = (py - y) % 4 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.26)'; c.fillRect(x, py, w, 1); }
    c.fillStyle = lin(x, y, x + w, y + h, [[0, 'rgba(255,255,255,0)'], [.45, 'rgba(255,255,255,.55)'], [.62, 'rgba(255,255,255,0)']]); c.fillRect(x, y, w, h);
  } else if (tex === 'cristal') {
    c.fillStyle = lin(x, y, x + w, y + h, [[0, 'rgba(255,255,255,.7)'], [.42, 'rgba(255,255,255,.08)'], [.72, 'rgba(255,255,255,.4)'], [1, 'rgba(255,255,255,.06)']]); c.fillRect(x, y, w, h);
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = Math.max(1, m * .04); c.strokeRect(x + c.lineWidth / 2, y + c.lineWidth / 2, w - c.lineWidth, h - c.lineWidth);
  }
  c.restore();
}
// Contorno de una forma (no pinta): r0 = radio original del juego (para «Original»)
export function trazoForma(c, x, y, w, h, forma, r0 = 0) {
  const m = Math.min(w, h); c.beginPath();
  if (forma === 'biselada') { const b = m * .2; c.moveTo(x + b, y); c.lineTo(x + w - b, y); c.lineTo(x + w, y + b); c.lineTo(x + w, y + h - b); c.lineTo(x + w - b, y + h); c.lineTo(x + b, y + h); c.lineTo(x, y + h - b); c.lineTo(x, y + b); c.closePath(); return; }
  const r = forma === 'cuadrada' ? 0 : forma === 'pildora' ? m / 2 : forma === 'redonda' ? m * .24 : forma === 'marcada' ? m * .1 : r0;
  if (r > 0 && c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h);
}
const cache = new Map();
// Ficha lista para drawImage: color + brillo + textura + forma. base = color que se usa si el jugador no eligió uno (est.hex null).
export function spriteFicha(base, est, w, h, r0 = 0, dpr = 1) {
  const hex = est.hex || base, k = [hex, est.tex, est.forma, Math.round(w), Math.round(h), r0, dpr].join('|');
  let s = cache.get(k); if (s) return s;
  if (cache.size > 400) cache.clear();
  s = document.createElement('canvas'); s.width = Math.ceil(w * dpr); s.height = Math.ceil(h * dpr);
  const c = s.getContext('2d'); c.scale(dpr, dpr); const m = Math.min(w, h);
  trazoForma(c, 0, 0, w, h, est.forma, r0); c.save(); c.clip();
  c.fillStyle = hex; c.fillRect(0, 0, w, h);
  if (est.tex) capaTextura(c, 0, 0, w, h, est.tex);
  else { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,.34)'); g.addColorStop(.18, 'rgba(255,255,255,.1)'); g.addColorStop(1, 'rgba(0,0,0,.22)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }
  c.restore();
  const lw = est.forma === 'marcada' ? Math.max(2, m * .12) : Math.max(1, m * .06);
  trazoForma(c, lw / 2, lw / 2, w - lw, h - lw, est.forma, Math.max(0, r0 - lw / 2)); c.lineWidth = lw; c.strokeStyle = oscuro(hex, est.forma === 'marcada' ? .5 : .38); c.stroke();
  if (est.forma === 'marcada') { trazoForma(c, lw * 1.5, lw * 1.5, w - lw * 3, h - lw * 3, est.forma, 0); c.lineWidth = Math.max(1, lw * .3); c.strokeStyle = 'rgba(255,255,255,.45)'; c.stroke(); }
  cache.set(k, s); return s;
}

/* ---------- Three.js ---------- */
// Lienzo cuadrado para usar de mapa (CanvasTexture): color + textura (+ marco si la forma es «marcada»)
export function lienzoTextura(hex, est, tam = 160) {
  const cv = document.createElement('canvas'); cv.width = cv.height = tam; const c = cv.getContext('2d');
  c.fillStyle = hex; c.fillRect(0, 0, tam, tam); capaTextura(c, 0, 0, tam, tam, est.tex);
  if (est.forma === 'marcada') { c.lineWidth = tam * .09; c.strokeStyle = oscuro(hex, .5); c.strokeRect(c.lineWidth / 2, c.lineWidth / 2, tam - c.lineWidth, tam - c.lineWidth); c.lineWidth = tam * .025; c.strokeStyle = 'rgba(255,255,255,.4)'; c.strokeRect(tam * .12, tam * .12, tam * .76, tam * .76); }
  return cv;
}
// Caja con las esquinas redondeadas/biseladas (conserva las UV del cubo, así que la textura se ve bien). forma null/'cuadrada' = cubo normal.
export function geoCaja(T, w, h, d, forma) {
  const m = Math.min(w, h, d), r = ({ redonda: .16, pildora: .42, biselada: .15, marcada: .06 })[forma] * m;
  if (!r) return new T.BoxGeometry(w, h, d);
  const seg = forma === 'biselada' ? 2 : 8, g = new T.BoxGeometry(w, h, d, seg, seg, seg), p = g.attributes.position, nm = g.attributes.normal;
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r, v = new T.Vector3(), c = new T.Vector3(), q = new T.Vector3();
  const conc = (u, mitad) => { const t = Math.abs(u) / mitad; return Math.sign(u) * Math.pow(t, forma === 'biselada' ? 1 : .55) * mitad; };
  for (let i = 0; i < p.count; i++) {
    v.set(conc(p.getX(i), w / 2), conc(p.getY(i), h / 2), conc(p.getZ(i), d / 2));
    c.set(Math.max(-hx, Math.min(hx, v.x)), Math.max(-hy, Math.min(hy, v.y)), Math.max(-hz, Math.min(hz, v.z)));
    q.copy(v).sub(c);
    if (q.lengthSq() > 1e-9) { q.normalize(); nm.setXYZ(i, q.x, q.y, q.z); v.copy(c).addScaledVector(q, r); }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true; return g;
}

/* ---------- textura por píxel (terrenos pintados píxel a píxel, como el de Guerra de Orugas) ---------- */
// Devuelve un ajuste de brillo (≈ −0,5…+0,5) para el píxel (x, y): color_final = color × (1 + ajuste)
export function pixelTextura(tex, x, y) {
  switch (tex) {
    case 'liso': return Math.sin((x - y) * .02) * .05;
    case 'brillante': return Math.sin((x + y) * .03) * .1 + .06;
    case 'marmol': { const v = Math.sin(x * .045 + y * .03 + 2.2 * Math.sin(y * .02 + x * .011)); return Math.abs(v) < .07 ? .5 : v * .07; }
    case 'madera': return Math.sin(x * .55 + 2 * Math.sin(y * .03)) * .13 - (x % 11 === 0 ? .18 : 0);
    case 'granito': { const h = (Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) >>> 0, f = (h % 1000) / 1000; return f < .1 ? -.5 : f > .92 ? .5 : (f - .5) * .1; }
    case 'carbono': return ((x >> 2) + (y >> 2)) & 1 ? -.28 : .1;
    case 'metal': return ((y & 3) === 0 ? .2 : -.07) + Math.sin(x * .02 + y * .01) * .08;
    case 'cristal': return Math.sin((x + y) * .05) * .2 + .08;
    default: return 0;
  }
}
