// Tableros pequeños de Puentes Hashi para el tutorial: escenas fijas (demostración) y ejercicios interactivos.
import { construir, resuelto, grados, bloqueada, resolver } from './motor.js';

const U = 100, PH = 99;
const IMG = n => new URL(`./img/${n}.webp`, import.meta.url).href;
const PAT = `<defs><pattern id="mhPat" patternUnits="userSpaceOnUse" width="768" height="${PH}"><image href="${IMG('puente')}" width="768" height="${PH}" preserveAspectRatio="none"/></pattern></defs>`;

function puente(P, k, v) {
  const e = P.E[k], A = P.isl[e.a], B = P.isl[e.b], x1 = A[1] * U + U / 2, y1 = A[0] * U + U / 2, len = Math.abs(B[1] - A[1]) * U + Math.abs(B[0] - A[0]) * U;
  const t = v === 1 ? 30 : 21, sc = t / PH, offs = v === 1 ? [0] : [-13, 13];
  return offs.map(o => e.hor
    ? `<g transform="translate(${x1},${y1 + o - t / 2}) scale(${sc})"><rect width="${len / sc}" height="${PH}" fill="url(#mhPat)"/></g>`
    : `<g transform="translate(${x1 + o + t / 2},${y1}) rotate(90) scale(${sc})"><rect width="${len / sc}" height="${PH}" fill="url(#mhPat)"/></g>`).join('');
}
// SVG de un tablero. cur: valor de cada arista; opciones: sel (isla elegida), mal (aristas en rojo), boyas (aristas marcadas), zonas (huecos pulsables)
export function svgTablero(isl, cur = [], { sel = -1, mal = [], boyas = [], zonas = false, mostrarOk = true } = {}) {
  const P = construir(isl), g = grados(P, cur.length ? cur : new Array(P.E.length).fill(0)), w = Math.max(...isl.map(x => x[1])) + 1, h = Math.max(...isl.map(x => x[0])) + 1;
  let pb = '', hit = '', bo = '', ii = '';
  P.E.forEach((e, k) => {
    const A = isl[e.a], B = isl[e.b], x1 = A[1] * U + U / 2, y1 = A[0] * U + U / 2, x2 = B[1] * U + U / 2, y2 = B[0] * U + U / 2;
    if (cur[k]) pb += `<g class="mh-p${mal.includes(k) ? ' mal' : ''}">${puente(P, k, cur[k])}</g>`;
    if (boyas.includes(k) && !cur[k]) bo += `<image href="${IMG('boya')}" x="${(x1 + x2) / 2 - 24}" y="${(y1 + y2) / 2 - 24}" width="48" height="48"/>`;
    if (zonas) hit += e.hor ? `<rect class="mh-hit" data-e="${k}" x="${x1 + 40}" y="${y1 - 34}" width="${Math.max(10, x2 - x1 - 80)}" height="68"/>` : `<rect class="mh-hit" data-e="${k}" x="${x1 - 34}" y="${y1 + 40}" width="68" height="${Math.max(10, y2 - y1 - 80)}"/>`;
  });
  isl.forEach(([r, c, n], i) => {
    const cx = c * U + U / 2, cy = r * U + U / 2, ok = mostrarOk && g[i] === n, bad = g[i] > n;
    ii += `<g class="mh-i${ok ? ' ok' : ''}${bad ? ' mal' : ''}${i === sel ? ' sel' : ''}" data-i="${i}"><circle class="mh-halo" cx="${cx}" cy="${cy}" r="52"/><image href="${IMG('isla' + ((r * 7 + c * 13 + n) % 3 + 1))}" x="${cx - 46}" y="${cy - 46}" width="92" height="92"/><text class="mh-n" x="${cx}" y="${cy + 3}" text-anchor="middle" dominant-baseline="central">${n}</text><circle cx="${cx}" cy="${cy}" r="48" fill="transparent"/></g>`;
  });
  return `<svg class="mh" viewBox="0 0 ${w * U} ${h * U}" style="aspect-ratio:${w}/${h};width:${Math.min(300, w * 74)}px" xmlns="http://www.w3.org/2000/svg">${PAT}<g>${pb}</g><g>${bo}</g><g>${hit}</g><g>${ii}</g></svg>`;
}
// Escena fija para «Así se juega»: puentes dados como [[isla a, isla b, valor], …]
export function escena(isl, puentes = [], op = {}) {
  const P = construir(isl), cur = new Array(P.E.length).fill(0);
  puentes.forEach(([a, b, v]) => { const k = P.E.findIndex(e => (e.a === a && e.b === b) || (e.a === b && e.b === a)); if (k >= 0) cur[k] = v; });
  const mal = (op.mal || []).map(([a, b]) => P.E.findIndex(e => (e.a === a && e.b === b) || (e.a === b && e.b === a))), bo = (op.boyas || []).map(([a, b]) => P.E.findIndex(e => (e.a === a && e.b === b) || (e.a === b && e.b === a)));
  return `<div class="mh-esc">${svgTablero(isl, cur, { sel: op.sel ?? -1, mal, boyas: bo })}</div>`;
}
// Ejercicio interactivo: el jugador tiende los puentes; al resolverlo se llama a ctx.ok
export function tableroMini(zona, isl, ctx, { okMsg = '✅ ¡Resuelto!', pista = '' } = {}) {
  const P = construir(isl), par = new Map(); P.E.forEach((e, k) => { par.set(e.a * 1000 + e.b, k); par.set(e.b * 1000 + e.a, k); });
  const sol = resolver(P, 1).sol; let cur = new Array(P.E.length).fill(0), sel = -1, hecho = false;
  const pintar = () => {
    zona.innerHTML = `<div class="mh-esc">${svgTablero(isl, cur, { sel, zonas: true })}</div>`;
    const svg = zona.querySelector('svg');
    svg.querySelectorAll('[data-i]').forEach(n => n.addEventListener('click', () => tocaIsla(+n.dataset.i)));
    svg.querySelectorAll('[data-e]').forEach(n => n.addEventListener('click', () => alterna(+n.dataset.e)));
  };
  const alterna = e => {
    if (hecho) return;
    const v = cur[e], sig = (v + 1) % 3;
    if (sig > 0 && v === 0 && bloqueada(P, cur, e)) { ctx.mal('❌ Ese puente cruzaría otro.'); return; }
    cur[e] = sig; sel = -1; pintar();
    if (resuelto(P, cur)) { hecho = true; pintar(); ctx.ok(okMsg); } else ctx.info(pista);
  };
  const tocaIsla = i => {
    if (hecho) return;
    if (sel < 0) { sel = i; pintar(); ctx.info('Ahora toca otra isla en línea recta.'); return; }
    if (sel === i) { sel = -1; pintar(); return; }
    const e = par.get(sel * 1000 + i); if (e === undefined) { sel = i; pintar(); ctx.mal('❌ Esas dos islas no se pueden unir en línea recta.'); return; }
    alterna(e);
  };
  pintar();
  return { ver: () => { cur = sol.slice(); sel = -1; hecho = true; pintar(); ctx.ok(okMsg); } };
}
