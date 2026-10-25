// Caras de «¿Qué cara tienes?»: composición SVG y generador aleatorio (sin DOM; se prueba con Node).
// Las piezas de rostro son de «Vue Color Avatar» de LeoKu (MIT, ver LICENSE-vue-color-avatar.txt) más piezas nuevas en el mismo estilo (js/games/quecara/piezas.js).
import { PIEZAS } from './piezas.js';

/* ---------- catálogos ---------- */
export const PIEL = ['#F8D9CE', '#F9C9B6', '#DEB3A3', '#C89583', '#9C6458'];
export const PELO = { negro: '#1F1F24', castano: '#5A3A22', rubio: '#E8C36A', pelirrojo: '#B0302A', canoso: '#C9C9C9', azul: '#3E8CF0', rosa: '#FC909F', morado: '#B48CF5' };
export const TELA = { azul: '#506AF4', rojo: '#FD6F5D', amarillo: '#F4D150', verde: '#48A99A', morado: '#C09FFF', rosa: '#FC909F', negro: '#2B2B33', marron: '#9B6B3C' };
export const OJOS = { marron: '#6B3F1D', azul: '#2F7DE1', verde: '#2EA84F' };
export const FONDOS = ['#E0DDFF', '#D2EFF3', '#FFEDEF', '#FFEBA4', '#DDF5E4', '#FFE3CF'];
export const ROPA = ['azul', 'rojo', 'amarillo', 'verde', 'morado', 'rosa'];
// peinados y sombreros (todos son «tops»; los sombreros tapan el pelo)
export const SOMBREROS = { beanie: 'gorro', cap: 'gorra', brim: 'sombrero de ala', tophat: 'sombrero de copa', turban: 'turbante' };
export const PEINADOS_H = ['fonze', 'funny', 'clean', 'punk', 'curly', 'receding'];
export const PEINADOS_M = ['danny', 'wave', 'pixie', 'curly', 'funny', 'punk'];
export const BARBAS = ['none', 'scruff', 'mustache', 'goatee', 'full'];
export const GAFAS = ['none', 'round', 'square', 'sun'];
export const ADORNOS = ['none', 'bow', 'band'];
const OJOS_FORMAS = ['ellipse', 'round', 'eyeshadow'];     // «smiling» (ojos cerrados) no deja ver el color de ojos
const CEJAS = ['up', 'down', 'eyelashesup', 'eyelashesdown'];
const NARICES = ['curve', 'pointed', 'round'];
const BOCAS = ['frown', 'laughing', 'nervous', 'pucker', 'sad', 'smile', 'smirk', 'surprised'];
const ROPAS = ['crew', 'collared', 'open'];
const ORELLAS = ['attached', 'detached'];
const PENDIENTES = ['none', 'hoop', 'stud'];

export const NOMBRES_H = ['Luis', 'Pedro', 'Carlos', 'Javier', 'Miguel', 'Andrés', 'Diego', 'Raúl', 'Pablo', 'Sergio', 'Álvaro', 'Hugo', 'Iván', 'Marcos', 'Tomás', 'Óscar', 'Rubén', 'Adrián', 'Mario', 'Néstor', 'Gonzalo', 'Samuel', 'Víctor', 'Jaime', 'Enrique', 'Bruno', 'Daniel', 'Julián', 'Ramón', 'Fran', 'Jorge', 'Álex', 'Nacho', 'Lucas', 'Leo', 'Rafa', 'Isaac', 'Joan', 'Íñigo', 'Santi'];
export const NOMBRES_M = ['Ana', 'Lucía', 'Marta', 'Elena', 'Carmen', 'Laura', 'Sara', 'Paula', 'Irene', 'Julia', 'Clara', 'Nuria', 'Rosa', 'Alba', 'Eva', 'Inés', 'Silvia', 'Marina', 'Pilar', 'Noelia', 'Beatriz', 'Lola', 'Teresa', 'Mónica', 'Sofía', 'Olga', 'Raquel', 'Celia', 'Yolanda', 'Rocío', 'Aitana', 'Berta', 'Daniela', 'Emma', 'Gloria', 'Lidia', 'Mireia', 'Nora', 'Vera', 'Zoe'];

const has = (cat, k) => Object.hasOwn(PIEZAS, cat) && Object.hasOwn(PIEZAS[cat], k);
const entre = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;

/* ---------- validación de una cara ---------- */
// Cara = { nm, sx:'h'|'m', pi, pe, pc, or, ar, ce, oj, oc, nz, bc, bd, ga, pk, ad, ac, ro, rc, fo }
export function caraValida(f) {
  if (!f || typeof f !== 'object') return null;
  const nm = typeof f.nm === 'string' ? f.nm.slice(0, 12) : '';
  if (!nm || (f.sx !== 'h' && f.sx !== 'm') || !entre(f.pi, 0, PIEL.length - 1) || !entre(f.fo, 0, FONDOS.length - 1)) return null;
  const sombrero = Object.hasOwn(SOMBREROS, f.pe);
  if (!(has('tops', f.pe) || f.pe === 'none') || !has('ear', f.or) || !has('eyebrows', f.ce) || !has('eyes', f.oj) || !has('nose', f.nz) || !has('mouth', f.bc) || !has('clothes', f.ro)) return null;
  if (!OJOS_FORMAS.includes(f.oj) || !Object.hasOwn(OJOS, f.oc) || !Object.hasOwn(TELA, f.rc) || !ROPA.includes(f.rc)) return null;
  if (!PENDIENTES.includes(f.ar) || !BARBAS.includes(f.bd) || !GAFAS.includes(f.ga) || !ADORNOS.includes(f.ad)) return null;
  if (sombrero ? !Object.hasOwn(TELA, f.pc) : !Object.hasOwn(PELO, f.pc)) return null;
  if (f.ad !== 'none' && !Object.hasOwn(TELA, f.ac)) return null;
  return { nm, sx: f.sx, pi: f.pi, pe: f.pe, pc: f.pc, or: f.or, ar: f.ar, ce: f.ce, oj: f.oj, oc: f.oc, nz: f.nz, bc: f.bc, bd: f.bd, ga: f.ga, pk: f.pk ? 1 : 0, ad: f.ad, ac: f.ad === 'none' ? 'rosa' : f.ac, ro: f.ro, rc: f.rc, fo: f.fo };
}

/* ---------- dibujo ---------- */
const Z = { face: 10, freckles: 45, eyes: 50, nose: 60, eyebrows: 70, tops: 80, adorno: 85, glasses: 90, beard: 99, mouth: 100, ear: 102, earrings: 103, clothes: 110 };
const VIEWBOX = '76 24 248 361';       // encuadre de cabeza y hombros (proporción 248:361)
let contador = 0;
// Los identificadores internos (máscaras, recortes) se renombran para que dos caras en la misma página no choquen.
function unico(txt, u) {
  const ids = [...txt.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  for (const id of ids) txt = txt.replaceAll(`id="${id}"`, `id="${id}-${u}"`).replaceAll(`url(#${id})`, `url(#${id}-${u})`);
  return txt;
}
export function svgDe(f, { fondo = true } = {}) {
  const u = 'q' + (++contador).toString(36);
  const capas = [];
  const piel = PIEL[f.pi];
  const poner = (cat, forma, z, color) => {
    if (!forma || forma === 'none' || !has(cat, forma)) return;
    let s = PIEZAS[cat][forma].replaceAll('$fillColor', color || 'transparent');
    if (cat === 'eyes') s = s.replaceAll('fill="black"', `fill="${OJOS[f.oc]}"`);
    capas.push([z, unico(s, u)]);
  };
  poner('face', 'base', Z.face, piel);
  if (f.pk) poner('face', 'freckles', Z.freckles);
  poner('eyes', f.oj, Z.eyes);
  poner('nose', f.nz, Z.nose);
  poner('eyebrows', f.ce, Z.eyebrows);
  poner('tops', f.pe, Z.tops, Object.hasOwn(SOMBREROS, f.pe) ? TELA[f.pc] : PELO[f.pc]);
  poner('adorno', f.ad, Z.adorno, TELA[f.ac]);
  poner('glasses', f.ga, Z.glasses);
  poner('beard', f.bd, Z.beard, PELO[Object.hasOwn(SOMBREROS, f.pe) || f.pe === 'clean' ? 'castano' : f.pc] || PELO.castano);
  poner('mouth', f.bc, Z.mouth);
  poner('ear', f.or, Z.ear, piel);
  poner('earrings', f.ar, Z.earrings);
  poner('clothes', f.ro, Z.clothes, TELA[f.rc]);
  capas.sort((a, b) => a[0] - b[0]);
  const bg = fondo ? `<rect x="0" y="0" width="400" height="400" fill="${FONDOS[f.fo]}"/>` : '';
  return `<svg class="qcsvg" viewBox="${VIEWBOX}" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${bg}<g transform="translate(100,65)">${capas.map(c => `<g>${c[1]}</g>`).join('')}</g></svg>`;
}

/* ---------- generador aleatorio ---------- */
export function crearRng(semilla) {                    // mulberry32: reproducible a partir de un entero
  let a = (semilla >>> 0) || 1;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const elige = (rng, a) => a[Math.floor(rng() * a.length)];
const pesos = (rng, pares) => { let t = 0; for (const [, p] of pares) t += p; let x = rng() * t; for (const [v, p] of pares) { x -= p; if (x < 0) return v; } return pares[pares.length - 1][0]; };

export function caraAlAzar(rng, sx, nombre) {
  const h = sx === 'h', k = Object.keys(PELO);
  const sombrero = rng() < .24;
  let pe, pc;
  if (sombrero) { pe = pesos(rng, [['beanie', 3], ['cap', 3], ['brim', 2], ['tophat', h ? 1 : .6], ['turban', 2]]); pc = elige(rng, Object.keys(TELA)); }
  else {
    pe = elige(rng, h ? PEINADOS_H : PEINADOS_M);
    pc = pesos(rng, [['negro', 4], ['castano', 4], ['rubio', 3], ['pelirrojo', 2], ['canoso', 2], ['azul', .6], ['rosa', .6], ['morado', .6]]);
    if (!PELO[pc]) pc = elige(rng, k);
  }
  const adorno = !sombrero && pe !== 'clean' && rng() < (h ? 0 : .2) ? elige(rng, ['bow', 'band']) : 'none';
  const bd = h ? pesos(rng, [['none', 6], ['scruff', 1.4], ['mustache', 1.2], ['goatee', 1.2], ['full', 1.4]]) : 'none';
  return {
    nm: nombre, sx, pi: Math.floor(rng() * PIEL.length), pe, pc, or: elige(rng, ORELLAS),
    ar: pesos(rng, [['none', h ? 8 : 5], ['hoop', 1.5], ['stud', 1.5]]), ce: elige(rng, CEJAS),
    oj: pesos(rng, [['ellipse', 4], ['round', 4], ['eyeshadow', h ? .4 : 2]]), oc: pesos(rng, [['marron', 5], ['azul', 2.5], ['verde', 2]]),
    nz: elige(rng, NARICES), bc: elige(rng, BOCAS), bd, ga: pesos(rng, [['none', 7], ['round', 1.2], ['square', 1.2], ['sun', .8]]),
    pk: rng() < .17 ? 1 : 0, ad: adorno, ac: elige(rng, Object.keys(TELA)), ro: elige(rng, ROPAS), rc: elige(rng, ROPA), fo: Math.floor(rng() * FONDOS.length),
  };
}

// Reparto razonable: así cada pregunta del juego divide el tablero en trozos útiles.
export function equilibrado(c) {
  const n = c.length, cuenta = fn => c.filter(fn).length;
  const rango = (v, a, b) => v >= Math.max(0, Math.round(n * a)) && v <= Math.max(1, Math.round(n * b));
  const hijos = cuenta(f => f.sx === 'h');
  return Math.abs(hijos - n / 2) <= 1
    && rango(cuenta(f => f.ga !== 'none'), .14, .3)
    && rango(cuenta(f => Object.hasOwn(SOMBREROS, f.pe)), .14, .3)
    && rango(cuenta(f => f.bd !== 'none'), .1, .22)
    && rango(cuenta(f => f.pk), .1, .22)
    && rango(cuenta(f => f.ar !== 'none'), .1, .26)
    && rango(cuenta(f => f.ad !== 'none'), .04, .14)
    && rango(cuenta(f => f.oc === 'azul'), .14, .34)
    && rango(cuenta(f => f.oc === 'verde'), .1, .26)
    && rango(cuenta(f => f.pi <= 1), .25, .5)
    && rango(cuenta(f => f.pi === 4), .1, .26)
    && rango(cuenta(f => !Object.hasOwn(SOMBREROS, f.pe) && ['rubio'].includes(f.pc)), .08, .24)
    && rango(cuenta(f => !Object.hasOwn(SOMBREROS, f.pe) && f.pc === 'pelirrojo'), .04, .16)
    && rango(cuenta(f => !Object.hasOwn(SOMBREROS, f.pe) && ['azul', 'rosa', 'morado'].includes(f.pc)), .03, .16)
    && rango(cuenta(f => f.pe === 'clean' || f.pe === 'funny' || f.pe === 'receding'), .08, .24);
}

// Genera `n` caras distintas (nunca dos casi iguales) y bien repartidas. `semilla` hace el reparto repetible.
export function generarCaras(n, semilla = (Math.random() * 4294967296) >>> 0, vector = null) {
  const rng = crearRng(semilla);
  for (let intento = 0; intento < 400; intento++) {
    const nh = Math.floor(n / 2), sexos = [...Array(nh).fill('h'), ...Array(n - nh).fill('m')];
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [sexos[i], sexos[j]] = [sexos[j], sexos[i]]; }
    const pool = { h: [...NOMBRES_H], m: [...NOMBRES_M] }, out = [];
    for (const sx of sexos) { const p = pool[sx], k = Math.floor(rng() * p.length); out.push(caraAlAzar(rng, sx, p.splice(k, 1)[0])); }
    if (!equilibrado(out)) continue;
    if (vector) {                                         // al menos 2 preguntas distinguen a cada pareja
      const v = out.map(vector); let ok = true;
      for (let i = 0; i < n && ok; i++) for (let j = i + 1; j < n; j++) { let d = 0; for (let q = 0; q < v[i].length; q++) if (v[i][q] !== v[j][q]) d++; if (d < 2) { ok = false; break; } }
      if (!ok) continue;
    }
    return out;
  }
  return null;                                           // (con n pequeño el reparto exacto puede no salir: el llamador usa generarSimple)
}
// Sin exigencias de reparto: solo caras distintas. Respaldo para tableros pequeños.
export function generarSimple(n, semilla = (Math.random() * 4294967296) >>> 0) {
  const rng = crearRng(semilla), nh = Math.floor(n / 2), sexos = [...Array(nh).fill('h'), ...Array(n - nh).fill('m')];
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [sexos[i], sexos[j]] = [sexos[j], sexos[i]]; }
  const pool = { h: [...NOMBRES_H], m: [...NOMBRES_M] };
  return sexos.map(sx => { const p = pool[sx]; return caraAlAzar(rng, sx, p.splice(Math.floor(rng() * p.length), 1)[0]); });
}
