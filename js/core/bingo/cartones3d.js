// Cartones de bingo en 3D (Three.js vía core/escena3d.js): cada cartón es una placa con sus 15 números y las marcas son fichas que saltan encima.
// Se ve en una columna alta (la página hace scroll) y el toque se convierte en (cartón, fila, columna). Sin WebGL se dibuja en canvas 2D con lo mismo.
import { crearEscena, hayWebGL, lienzo, textura, T } from '../escena3d.js';
import { COLORES_FILA } from './vista3d.js';

const WV = 10, CW = 9.6, CH = 3.5, GAP = .45, M = .25, CELDA_W = (CW - 2 * M) / 9, CELDA_H = (CH - 2 * M) / 3;
const alto = n => n * CH + (n + 1) * GAP;

// Dibuja el cartón en un canvas (los números, y las marcas si se pasa el conjunto)
export function dibujarCarton(cv, carton, marcas, colorMarca = '#E5322D') {
  const w = cv.width, h = cv.height, c = cv.getContext('2d'), k = w / CW;
  c.clearRect(0, 0, w, h);
  const rr = (x, y, ww, hh, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, ww, hh, r) : c.rect(x, y, ww, hh); };
  c.fillStyle = '#fff6dc'; rr(0, 0, w, h, .25 * k); c.fill(); c.lineWidth = .1 * k; c.strokeStyle = '#d4a72c'; c.stroke();
  for (let r = 0; r < 3; r++) for (let j = 0; j < 9; j++) {
    const x = (M + j * CELDA_W) * k, y = (M + r * CELDA_H) * k, ww = CELDA_W * k, hh = CELDA_H * k, n = carton[r][j];
    c.fillStyle = n ? '#ffffff' : COLORES_FILA[j] + '55'; rr(x + .03 * k, y + .03 * k, ww - .06 * k, hh - .06 * k, .14 * k); c.fill();
    c.lineWidth = .03 * k; c.strokeStyle = '#e3cf94'; c.stroke();
    if (!n) continue;
    if (marcas && marcas.has(n)) { c.fillStyle = colorMarca; c.globalAlpha = .82; c.beginPath(); c.arc(x + ww / 2, y + hh / 2, .4 * k, 0, 6.2832); c.fill(); c.globalAlpha = 1; }
    c.fillStyle = marcas && marcas.has(n) ? '#fff' : '#1b1f2a'; c.font = `800 ${.52 * k}px "Baloo 2", system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), x + ww / 2, y + hh / 2 + .03 * k);
    if (n === 6 || n === 9) c.fillRect(x + ww / 2 - .18 * k, y + hh / 2 + .3 * k, .36 * k, .05 * k);
  }
}
// Cartones: { poner(lista de matrices), marcas(ci, conjuntoDeNúmeros, animarNúmero?), destruir() }
export async function crearCartones(cont, o = {}) {
  const alTocar = o.alTocar || (() => {}); let cartones = [], marcas = [], vivo = true, colorMarca = o.colorMarca || '#E5322D';
  const celdaDe = (ev, rect) => {
    const ux = (ev.clientX - rect.left) / rect.width * WV, uy = (ev.clientY - rect.top) / rect.height * alto(cartones.length);
    const i = Math.floor((uy - GAP / 2) / (CH + GAP)); if (i < 0 || i >= cartones.length) return;
    const lx = ux - (WV - CW) / 2 - M, ly = uy - (GAP + i * (CH + GAP)) - M;
    const c = Math.floor(lx / CELDA_W), r = Math.floor(ly / CELDA_H); if (c < 0 || c > 8 || r < 0 || r > 2) return;
    alTocar(i, r, c, cartones[i][r][c]);
  };
  const ajustarAlto = () => { cont.style.height = Math.round(cont.clientWidth / WV * alto(Math.max(1, cartones.length))) + 'px'; };
  if (!hayWebGL() || o.calidad === '2d') {
    cont.innerHTML = ''; const cvs = [];
    const dibujar = i => dibujarCarton(cvs[i], cartones[i], marcas[i], colorMarca);
    cont.style.height = '';
    cont.addEventListener('click', ev => { const r = cont.getBoundingClientRect(); celdaDe2(ev, r); });
    const celdaDe2 = (ev, r) => { const k = cvs.findIndex(cv => { const b = cv.getBoundingClientRect(); return ev.clientY >= b.top && ev.clientY <= b.bottom; }); if (k < 0) return; const b = cvs[k].getBoundingClientRect(), ux = (ev.clientX - b.left) / b.width * CW - M, uy = (ev.clientY - b.top) / b.height * CH - M, c = Math.floor(ux / CELDA_W), r2 = Math.floor(uy / CELDA_H); if (c >= 0 && c < 9 && r2 >= 0 && r2 < 3) alTocar(k, r2, c, cartones[k][r2][c]); };
    return {
      es3d: false,
      poner(lista) { cartones = lista; marcas = lista.map(() => new Set()); cont.innerHTML = ''; cvs.length = 0; lista.forEach((_, i) => { const cv = document.createElement('canvas'); cv.width = 960; cv.height = Math.round(960 * CH / CW); cv.className = 'bm2d'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Cartón ' + (i + 1)); cont.append(cv); cvs.push(cv); dibujar(i); }); },
      marcas(i, set) { marcas[i] = new Set(set); dibujar(i); }, color(c) { colorMarca = c; cartones.forEach((_, i) => dibujar(i)); },
      destruir() { vivo = false; cont.innerHTML = ''; },
    };
  }
  const alta = o.calidad !== 'ligera';
  const optsE = { orbita: false, sombras: false, fov: 32, pol: Math.PI / 2, az: 0, dist: 30, distMin: 4, distMax: 200, antialias: alta, hemi: { int: 1.7 }, sol: { pos: [-4, 8, 20], int: 1.6 }, etiqueta: 'Tus cartones de bingo' };
  const E = crearEscena(cont, optsE); E.canvas.style.touchAction = 'pan-y';
  const esc = E.escena, grupos = [], discos = [], texs = [], tan = Math.tan(16 * Math.PI / 180) * 2;
  const matLado = new T.MeshStandardMaterial({ color: 0xd9b14a, roughness: .5, metalness: .3 }), geoD = new T.CylinderGeometry(.4, .4, .1, alta ? 24 : 12);
  const limpiar = () => { grupos.forEach(g => esc.remove(g)); texs.forEach(t => t.dispose()); grupos.length = discos.length = texs.length = 0; };
  function disponer() {
    const w = Math.max(100, cont.clientWidth); ajustarAlto(); const Ht = alto(Math.max(1, cartones.length)), d0 = Ht / tan;
    optsE.dist = d0; E.base = d0; E.C.tx = E.C.ty = 0; E.C.dist = d0 * 1.002; E.camara({ az: 0, pol: Math.PI / 2, dist: d0 }); E.marcar(); return w;
  }
  const ro = new ResizeObserver(() => { if (vivo) disponer(); });
  E.alTocar = ev => { celdaDe(ev, E.canvas.getBoundingClientRect()); };
  E.iniciar();
  function poner(lista) {
    cartones = lista; marcas = lista.map(() => new Set()); limpiar();
    const Ht = alto(lista.length);
    lista.forEach((carton, i) => {
      const cv = lienzo(1152, Math.round(1152 * CH / CW)); dibujarCarton(cv, carton, null); const tx = textura(cv, 4); texs.push(tx);
      const mat = new T.MeshStandardMaterial({ map: tx, roughness: .6 }), m = new T.Mesh(new T.BoxGeometry(CW, CH, .16), [matLado, matLado, matLado, matLado, mat, matLado]);
      const g = new T.Group(); g.position.set(0, Ht / 2 - GAP - CH / 2 - i * (CH + GAP), 0); g.add(m); esc.add(g); grupos.push(g); discos.push(new Map());
    });
    disponer(); ro.observe(cont);
  }
  const centro = (r, c) => ({ x: -CW / 2 + M + (c + .5) * CELDA_W, y: CH / 2 - M - (r + .5) * CELDA_H });
  function marcasDe(i, set, animar) {
    const carton = cartones[i], prev = marcas[i]; marcas[i] = new Set(set);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) {
      const n = carton[r][c]; if (!n) continue; const k = r * 9 + c, d = discos[i].get(k), on = marcas[i].has(n);
      if (on && !d) {
        const m = new T.Mesh(geoD, new T.MeshStandardMaterial({ color: new T.Color(colorMarca), roughness: .35, transparent: true, opacity: .86 })), p = centro(r, c);
        m.rotation.x = Math.PI / 2; m.position.set(p.x, p.y, .13); grupos[i].add(m); discos[i].set(k, m);
        if (animar === n) { m.scale.setScalar(.01); E.tween(380, u => { m.scale.setScalar(Math.min(1, u * 1.4) * (1 + .3 * Math.sin(Math.PI * u))); }); } else m.scale.setScalar(1);
      } else if (!on && d) { grupos[i].remove(d); d.material.dispose(); discos[i].delete(k); }
    }
    E.marcar();
  }
  return {
    es3d: true, poner, marcas: marcasDe,
    color(c) { colorMarca = c; discos.forEach(mp => mp.forEach(d => d.material.color.set(c))); E.marcar(); },
    destruir() { vivo = false; ro.disconnect(); limpiar(); geoD.dispose(); E.destruir(); },
  };
}
