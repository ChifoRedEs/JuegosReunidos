// Motor de Dale Otra Vez (sin DOM): normalizar, reconocer respuestas, turno de la CPU y marcador.
import { TEMAS } from './temas.js';

export const NIVELES = {
  facil:   { nombre: 'Fácil',   seg: 15, conoce: 0.9,  cola: 0.35, ayuda: 'La CPU conoce pocas respuestas y tarda más. Tienes 15 s.' },
  medio:   { nombre: 'Medio',   seg: 12, conoce: 1.0,  cola: 0.6,  ayuda: 'La CPU conoce bastantes respuestas. Tienes 12 s.' },
  dificil: { nombre: 'Difícil', seg: 9,  conoce: 1.0,  cola: 0.92, ayuda: 'La CPU conoce casi todo y responde rápido. Tienes 9 s.' },
};
export const RONDAS = [3, 5, 7];
export const OTRAVEZ = 2;                       // «Otra vez» por ronda: palabras que no reconocemos no te hacen perder la ronda las 2 primeras veces

export const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
  .replace(/^(el|la|los|las|un|una|unos|unas) /, '');
const quita = w => (w.length > 3 ? [w.replace(/s$/, ''), w.replace(/es$/, '')] : [w, w]);
const sing = p => { const ws = p.split(' '), v = new Set([p, ws.slice(0, -1).concat(quita(ws.at(-1))[0]).join(' '), ws.slice(0, -1).concat(quita(ws.at(-1))[1]).join(' ')]); if (ws.length > 1) { quita(ws[0]).forEach(q => v.add([q, ...ws.slice(1)].join(' '))); } return [...v]; };
export function lev(a, b, tope) {
  if (Math.abs(a.length - b.length) > tope) return tope + 1;
  let p = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { const c = [i]; let m = i; for (let j = 1; j <= b.length; j++) { c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); if (c[j] < m) m = c[j]; } if (m > tope) return tope + 1; p = c; }
  return p[b.length];
}
/** Prepara un tema: [{ formas:[…normalizadas], nombre }] (una entrada por respuesta; sinónimos juntos). */
export function preparar(tema) {
  const vistas = new Set(), ent = [];
  for (const x of tema.r) {
    const f = [...new Set(x.split('|').map(norm).filter(Boolean))].filter(w => !vistas.has(w));
    if (!f.length) continue;                                    // respuesta repetida en la lista: se ignora
    f.forEach(w => vistas.add(w));
    ent.push({ i: ent.length, nombre: x.split('|')[0], formas: f, sing: new Set(f.flatMap(sing)) });
  }
  return ent;
}
/** Busca la respuesta escrita. Devuelve el índice de la entrada o -1. Admite plural y una errata en palabras largas. */
export function buscar(ent, texto) {
  const t = norm(texto); if (!t) return -1; const ts = sing(t);
  for (const e of ent) if (e.formas.includes(t)) return e.i;
  for (const e of ent) if (ts.some(x => e.sing.has(x))) return e.i;
  const tope = t.length >= 10 ? 2 : t.length >= 6 ? 1 : 0;
  if (!tope) return -1;
  let mejor = -1, md = 9;
  for (const e of ent) for (const f of e.formas) { const d = lev(f, t, tope); if (d <= tope && d < md) { md = d; mejor = e.i; } }
  return mejor;
}
/** Conocimiento de la CPU en una ronda: más probable en las respuestas comunes (las primeras de la lista). */
export function conocimiento(n, nivel, rnd = Math.random) {
  const N = NIVELES[nivel] || NIVELES.medio, k = new Set();
  for (let i = 0; i < n; i++) { const p = N.cola + (N.conoce - N.cola) * (1 - i / Math.max(1, n - 1)) * (nivel === 'medio' ? 1 : 1); if (rnd() < p) k.add(i); }
  return k;
}
/** La CPU elige una respuesta que conozca y no se haya dicho. Devuelve índice o -1 (se rinde). */
export function turnoCPU(n, usadas, conoce, rnd = Math.random) {
  const libres = []; for (const i of conoce) if (!usadas.has(i)) libres.push(i);
  if (!libres.length) return -1;
  libres.sort((a, b) => a - b);                  // prefiere las más comunes, con algo de azar
  const k = Math.min(libres.length, 1 + Math.floor(rnd() * Math.min(6, libres.length)));
  return libres[Math.floor(rnd() * k)];
}
export const retardoCPU = (nivel, rnd = Math.random) => (nivel === 'facil' ? 2200 : nivel === 'medio' ? 1500 : 900) + rnd() * 1400;
export function temaAlAzar(vistos, rnd = Math.random) {
  const libres = TEMAS.filter(t => !vistos.includes(t.id)); const lista = libres.length ? libres : TEMAS;
  return lista[Math.floor(rnd() * lista.length)];
}
export const ganaPartida = (pts, rondas) => Math.floor(rondas / 2) + 1 <= pts;
