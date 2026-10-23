// Vista 2D (SVG) de Hotel: respaldo cuando no hay WebGL o si el jugador elige «2D clásica». Misma API que vista3d.js.
import { INFO_TIPO, CAJA, MAPA, CAMINO, N, TIPO, HOTELES, IDS_HOTEL, TERRENOS, ANCLAS, LADOS, BANCO, AYUNTAMIENTO, LAGO, LINEA_BANCO, LINEA_AYTO, nEdif } from './datos.js';

const U = 40, W = MAPA.W, H = MAPA.H, NS = 'http://www.w3.org/2000/svg';
const el = (tag, at = {}, txt) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; return e; };

export function crearHotel2D(cont) {
  const V = { alTocar: null }, svg = el('svg', { viewBox: `${CAJA.c0 * U - 14} ${CAJA.r0 * U - 14} ${(CAJA.c1 - CAJA.c0 + 1) * U + 28} ${(CAJA.r1 - CAJA.r0 + 1) * U + 28}`, class: 'ht2d', role: 'img', 'aria-label': 'Tablero de Hotel en 2D' });
  svg.style.cssText = 'width:100%;height:100%;display:block;touch-action:manipulation';
  cont.append(svg);
  const px = (r, c) => [c * U, r * U];
  svg.append(el('rect', { x: CAJA.c0 * U - 14, y: CAJA.r0 * U - 14, width: (CAJA.c1 - CAJA.c0 + 1) * U + 28, height: (CAJA.r1 - CAJA.r0 + 1) * U + 28, rx: 14, class: 'h2-hierba', fill: '#8CCB6A' }));
  const capaLote = el('g'), capaEdif = el('g'), capaCam = el('g'), capaEnt = el('g'), capaCoche = el('g'), capaRes = el('g'), capaTxt = el('g');
  svg.append(capaLote, capaCam, capaEdif, capaEnt, capaRes, capaCoche, capaTxt);
  // lago, banco y ayuntamiento
  svg.insertBefore(el('rect', { x: LAGO.c0 * U, y: LAGO.f0 * U, width: (LAGO.c1 - LAGO.c0 + 1) * U, height: (LAGO.f1 - LAGO.f0 + 1) * U, rx: 18, fill: '#4DB7E8' }), capaLote);
  const publico = (R, fill, emoji, nombre) => {
    svg.insertBefore(el('rect', { x: R.c0 * U + 3, y: R.f0 * U + 3, width: (R.c1 - R.c0 + 1) * U - 6, height: (R.f1 - R.f0 + 1) * U - 6, rx: 8, fill, stroke: '#0003' }), capaLote);
    capaTxt.append(el('text', { x: (R.c0 + R.c1 + 1) * U / 2, y: (R.f0 + R.f1 + 1) * U / 2 - 2, 'text-anchor': 'middle', 'font-size': 26 }, emoji), el('text', { x: (R.c0 + R.c1 + 1) * U / 2, y: (R.f0 + R.f1 + 1) * U / 2 + 16, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 800, fill: '#fff' }, nombre));
  };
  publico(BANCO, '#B8902B', '🏦', 'BANCO'); publico(AYUNTAMIENTO, '#3A4F8F', '🏛️', 'AYUNTAMIENTO');
  // terrenos
  const celdas = {};
  for (const id of IDS_HOTEL) {
    celdas[id] = [];
    for (const [r, c] of TERRENOS[id]) { const [x, y] = px(r, c), e = el('rect', { x, y, width: U, height: U, fill: HOTELES[id].color, 'fill-opacity': .32, stroke: HOTELES[id].color, 'stroke-opacity': .5, 'data-lote': id }); capaLote.append(e); celdas[id].push(e); }
  }
  // camino
  const tiles = CAMINO.map(([r, c], i) => {
    const [x, y] = px(r, c), g = el('g', { 'data-sq': i }), I = INFO_TIPO[TIPO[i]];
    g.append(el('rect', { x: x + 1.5, y: y + 1.5, width: U - 3, height: U - 3, rx: 6, fill: I.color, stroke: '#fff', 'stroke-width': 2 }));
    if (TIPO[i] === 'P') g.append(el('text', { x: x + U / 2, y: y + 22, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 900, fill: '#fff' }, 'P'));
    else if (I.ico) g.append(el('text', { x: x + U / 2, y: y + 22, 'text-anchor': 'middle', 'font-size': 18 }, I.ico));
    if (I.corto) g.append(el('text', { x: x + U / 2, y: y + 35, 'text-anchor': 'middle', 'font-size': 8, 'font-weight': 900, fill: '#fff', 'pointer-events': 'none' }, I.corto));
    capaCam.append(g); return g;
  });
  // líneas del Banco y del Ayuntamiento
  const linea = (i, color) => {
    const [r1, c1] = CAMINO[i], [r2, c2] = CAMINO[(i + 1) % N], mx = (c1 + c2 + 1) * U / 2, my = (r1 + r2 + 1) * U / 2, h = Math.abs(c2 - c1) > 0;
    capaCam.append(el('rect', { x: h ? mx - 3 : mx - U / 2, y: h ? my - U / 2 : my - 3, width: h ? 6 : U, height: h ? U : 6, fill: color }));
  };
  linea(LINEA_BANCO, '#F2B600'); linea(LINEA_AYTO, '#2F9BFF');
  // etiquetas de hotel
  const rotulos = {};
  for (const id of IDS_HOTEL) {
    const ts = TERRENOS[id], r0 = Math.min(...ts.map(t => t[0])), r1 = Math.max(...ts.map(t => t[0])), c0 = Math.min(...ts.map(t => t[1])), c1 = Math.max(...ts.map(t => t[1]));
    const t = el('text', { x: (c0 + c1 + 1) * U / 2, y: (r0 + r1 + 1) * U / 2 + 4, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 800, fill: '#2a2a2a', 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': 3, 'pointer-events': 'none' }, HOTELES[id].nombre);
    capaTxt.append(t); rotulos[id] = t;
  }
  const cargados = new Map();
  const rectAncla = ([r0, c0, r1, c1], m = 4) => ({ x: c0 * U + m, y: r0 * U + m, width: (c1 - c0 + 1) * U - 2 * m, height: (r1 - r0 + 1) * U - 2 * m });
  const coches = [];
  const posCoche = (j, pos) => { const [r, c] = CAMINO[pos]; return [c * U + U / 2 + (pos === 0 ? (j - 1.5) * 9 : 0), r * U + U / 2 + (pos === 0 ? 0 : 0)]; };
  const ponCoche = (j, x, y) => { const g = coches[j]; if (g) g.setAttribute('transform', `translate(${x},${y})`); };
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  V.mover = async (j, camino, ms = 190) => {
    const g = coches[j]; if (!g) return; g.dataset.anim = '1';
    for (let k = 1; k < camino.length; k++) { const [x, y] = posCoche(j, camino[k]); ponCoche(j, x, y); await esperar(Math.min(ms, 140)); }
    g.dataset.anim = '';
  };
  V.dado = () => Promise.resolve(); V.quitarDado = () => {};
  V.pintar = S => {
    S.jug.forEach((p, j) => {
      if (!coches[j]) { const g = el('g'); g.append(el('circle', { r: 11, fill: p.color, stroke: '#fff', 'stroke-width': 2.5 }), el('text', { y: 5, 'text-anchor': 'middle', 'font-size': 13 }, p.coche)); capaCoche.append(g); coches[j] = g; }
      const g = coches[j]; g.style.display = p.vivo ? '' : 'none'; if (!g.dataset.anim) { const [x, y] = posCoche(j, p.pos); ponCoche(j, x, y); }
    });
    for (const id of IDS_HOTEL) {
      const Hh = S.hot[id], D = HOTELES[id], sig = Hh.dueno + '|' + Hh.etapa + '|' + Hh.inst;
      if (cargados.get(id) !== sig) {
        cargados.set(id, sig);
        for (const e of [...capaEdif.querySelectorAll(`[data-h="${id}"]`)]) e.remove();
        for (let k = 0; k < Hh.etapa; k++) { const g = el('g', { 'data-h': id, 'data-lote': id }), a = rectAncla(ANCLAS[id][k]); g.append(el('rect', { ...a, rx: 6, fill: D.color, stroke: '#0006', 'stroke-width': 1.5, 'data-lote': id }), el('text', { x: a.x + a.width / 2, y: a.y + a.height / 2 + 5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 900, fill: '#fff', 'pointer-events': 'none' }, k === 0 ? '🏨' : '+' + k)); capaEdif.append(g); }
        if (Hh.inst) { const g = el('g', { 'data-h': id, 'data-lote': id }), a = rectAncla(ANCLAS[id][nEdif(id)]); g.append(el('rect', { ...a, rx: 8, fill: '#3EC1EA', stroke: '#fff', 'stroke-width': 3, 'data-lote': id }), el('text', { x: a.x + a.width / 2, y: a.y + a.height / 2 + 6, 'text-anchor': 'middle', 'font-size': 16, 'pointer-events': 'none' }, '🏊')); capaEdif.append(g); }
        const dueno = Hh.dueno >= 0 ? S.jug[Hh.dueno] : null;
        for (const e of celdas[id]) { e.setAttribute('stroke', dueno ? dueno.color : D.color); e.setAttribute('stroke-width', dueno ? 3 : 1); e.setAttribute('stroke-opacity', dueno ? 1 : .5); }
        rotulos[id].textContent = D.nombre + (Hh.etapa ? ' ' + '★'.repeat(Math.min(5, Hh.etapa)) : '');
      }
    }
    capaEnt.replaceChildren();
    for (let sq = 0; sq < N; sq++) {
      const h = S.entDe[sq]; if (!h) continue; const l = LADOS[sq].find(x => x.h === h), d = l ? l.d : [-1, 0], [x, y] = [CAMINO[sq][1] * U + U / 2, CAMINO[sq][0] * U + U / 2];
      capaEnt.append(el('rect', { x: x + d[1] * 14 - 9 + (d[1] ? 0 : 0), y: y + d[0] * 14 - 4, width: d[1] ? 8 : 18, height: d[1] ? 18 : 8, rx: 2, fill: HOTELES[h].color, stroke: '#fff', 'stroke-width': 1.5, transform: d[1] ? `translate(${d[1] > 0 ? 9 : 1},-5)` : `translate(0,${d[0] > 0 ? 0 : 0})` }));
    }
  };
  V.resaltar = (cfg = {}) => {
    capaRes.replaceChildren();
    for (const sq of cfg.casillas || []) { const [r, c] = CAMINO[sq]; capaRes.append(el('rect', { x: c * U + 2, y: r * U + 2, width: U - 4, height: U - 4, rx: 7, fill: 'none', stroke: '#FFC21A', 'stroke-width': 4, class: 'h2-pulso', 'data-sq': sq })); }
    for (const h of cfg.lotes || []) for (const [r, c] of TERRENOS[h]) capaRes.append(el('rect', { x: c * U + 1, y: r * U + 1, width: U - 2, height: U - 2, fill: '#FFC21A', 'fill-opacity': .3, stroke: '#FFC21A', 'stroke-width': 2, class: 'h2-pulso', 'data-lote': h }));
  };
  svg.addEventListener('click', e => {
    if (!V.alTocar) return; const a = e.target.closest('[data-sq]'); if (a) return V.alTocar({ tipo: 'casilla', id: +a.dataset.sq });
    const b = e.target.closest('[data-lote]'); if (b) V.alTocar({ tipo: 'lote', id: b.dataset.lote });
  });
  V.recolor = () => { const v = getComputedStyle(cont).getPropertyValue('--ht-hierba').trim(); if (v) svg.querySelector('.h2-hierba').setAttribute('fill', v); };
  V.camara = () => {}; V.destruir = () => svg.remove();
  V.recolor();
  return V;
}
