// Motor del Bombardeo (sin DOM, probable con Node).
// Estado: { w, h, m, minas: null | [índices], rev: [0 oculta | 1 abierta | 2 bandera], fin: null | 'gana' | 'pierde', boom: índice }
import { shuffle } from '../../core/dom.js';

export const NIVELES = { facil: { w: 9, h: 9, m: 10 }, medio: { w: 12, h: 16, m: 34 }, dificil: { w: 14, h: 20, m: 60 } };
export const vecinos = (w, h, i) => {
  const r = i / w | 0, c = i % w, o = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < h && cc >= 0 && cc < w) o.push(rr * w + cc); }
  return o;
};
// minas colocadas tras el primer toque: nunca en la casilla pulsada ni a su alrededor (si hay sitio)
export function crearMinas(w, h, m, seguro) {
  const N = w * h; let prohibidas = new Set([seguro, ...vecinos(w, h, seguro)]);
  if (N - prohibidas.size < m) prohibidas = new Set([seguro]);
  const libres = []; for (let i = 0; i < N; i++) if (!prohibidas.has(i)) libres.push(i);
  return shuffle(libres).slice(0, m).sort((a, b) => a - b);
}
export function numeros(S) {
  const N = S.w * S.h, esM = new Uint8Array(N); S.minas.forEach(i => { esM[i] = 1; });
  const num = new Array(N).fill(0);
  for (let i = 0; i < N; i++) if (!esM[i]) num[i] = vecinos(S.w, S.h, i).reduce((s, j) => s + esM[j], 0);
  return { esM, num };
}
// Tablero personalizado: límites razonables para pantallas de móvil
export const LIMITES = { w: [5, 20], h: [5, 24] };
export const maxMinas = (w, h) => Math.max(1, Math.floor(w * h * 0.3));
export function medidas(nivel, dims) {
  if (nivel !== 'personal') return NIVELES[nivel];
  const ent = (v, a, b, d) => Number.isInteger(v) && v >= a && v <= b ? v : d;
  const w = ent(dims && dims.w, ...LIMITES.w, 10), h = ent(dims && dims.h, ...LIMITES.h, 12);
  return { w, h, m: ent(dims && dims.m, 1, maxMinas(w, h), Math.round(w * h * 0.15)) };
}
export const nuevo = (nivel, dims = null) => { const c = medidas(nivel, dims); return { w: c.w, h: c.h, m: c.m, minas: null, rev: new Array(c.w * c.h).fill(0), fin: null, boom: -1 }; };

// ---------- «Sin adivinar»: tableros que se resuelven por pura lógica desde el primer toque ----------
// Resolvedor con las deducciones que haría una persona: reglas de un número (todas minas / todas seguras),
// comparación de pares de números (subconjuntos) y el recuento total de minas.
export function resolublePorLogica(w, h, minas, inicio) {
  const N = w * h, esM = new Uint8Array(N); minas.forEach(i => { esM[i] = 1; });
  if (esM[inicio]) return false;
  const num = new Uint8Array(N), V = Array.from({ length: N }, (_, i) => vecinos(w, h, i));
  for (let i = 0; i < N; i++) if (!esM[i]) num[i] = V[i].reduce((s, j) => s + esM[j], 0);
  const est = new Uint8Array(N);                                   // 0 desconocida · 1 abierta · 2 mina deducida
  let abiertas = 0, minasMarcadas = 0;
  const abrir = i => { const pila = [i]; while (pila.length) { const k = pila.pop(); if (est[k]) continue; if (esM[k]) return false; est[k] = 1; abiertas++; if (!num[k]) for (const j of V[k]) if (!est[j]) pila.push(j); } return true; };
  const marcar = i => { if (!est[i]) { est[i] = 2; minasMarcadas++; } };
  if (!abrir(inicio)) return false;
  const objetivo = N - minas.length;
  for (let vuelta = 0; vuelta < 4 * N && abiertas < objetivo; vuelta++) {
    let hizo = false; const res = [];
    for (let i = 0; i < N; i++) {
      if (est[i] !== 1 || !num[i]) continue;
      const U = V[i].filter(j => !est[j]); if (!U.length) continue;
      const r = num[i] - V[i].filter(j => est[j] === 2).length;
      if (r === 0) { for (const j of U) if (!abrir(j)) return false; hizo = true; }
      else if (r === U.length) { U.forEach(marcar); hizo = true; }
      else res.push({ U, r });
    }
    if (hizo) continue;
    for (let a = 0; a < res.length && !hizo; a++) for (let b = 0; b < res.length && !hizo; b++) {   // A ⊂ B
      if (a === b) continue; const A = res[a], B = res[b];
      if (A.U.length >= B.U.length || !A.U.every(j => B.U.includes(j))) continue;
      const D = B.U.filter(j => !A.U.includes(j)), r = B.r - A.r;
      if (r === 0) { for (const j of D) if (!abrir(j)) return false; hizo = true; }
      else if (r === D.length) { D.forEach(marcar); hizo = true; }
    }
    if (hizo) continue;
    const desc = []; for (let i = 0; i < N; i++) if (!est[i]) desc.push(i);       // recuento global
    const quedan = minas.length - minasMarcadas;
    if (quedan === 0) { for (const j of desc) if (!abrir(j)) return false; continue; }
    if (quedan === desc.length) { desc.forEach(marcar); continue; }
    return false;
  }
  return abiertas === objetivo;
}
// Coloca las minas hasta dar con un tablero resoluble por lógica (con tope de tiempo; si no, uno normal)
export function crearMinasLogicas(w, h, m, seguro, ms = 1500) {
  const t0 = Date.now(); let ult = null;
  for (let k = 0; k < 4000 && Date.now() - t0 < ms; k++) {
    ult = crearMinas(w, h, m, seguro);
    if (resolublePorLogica(w, h, ult, seguro)) return { minas: ult, ok: true };
  }
  return { minas: ult || crearMinas(w, h, m, seguro), ok: false };
}
export const banderas = S => S.rev.filter(x => x === 2).length;
const abiertas = S => S.rev.filter(x => x === 1).length;

// Abre una casilla (con expansión de ceros). Devuelve true si hizo algo.
export function abrir(S, i, N) {
  if (S.fin || S.rev[i] !== 0) return false;
  if (!S.minas) {
    if (S.sa) { const r = crearMinasLogicas(S.w, S.h, S.m, i); S.minas = r.minas; S.saOk = r.ok; }
    else S.minas = crearMinas(S.w, S.h, S.m, i);
  }
  const { esM, num } = N.get(S);
  if (esM[i]) { S.rev[i] = 1; S.fin = 'pierde'; S.boom = i; return true; }
  const pila = [i];
  while (pila.length) {
    const k = pila.pop(); if (S.rev[k] !== 0) continue;
    S.rev[k] = 1;
    if (num[k] === 0) for (const j of vecinos(S.w, S.h, k)) if (S.rev[j] === 0) pila.push(j);
  }
  if (abiertas(S) === S.w * S.h - S.m) { S.fin = 'gana'; S.minas.forEach(j => { S.rev[j] = 2; }); }
  return true;
}
export function acorde(S, i, N) {                    // toque sobre un número con tantas banderas como indica: abre el resto
  if (S.fin || S.rev[i] !== 1 || !S.minas) return false;
  const { num } = N.get(S), vec = vecinos(S.w, S.h, i);
  if (!num[i] || vec.filter(j => S.rev[j] === 2).length !== num[i]) return false;
  let hizo = false; for (const j of vec) if (S.rev[j] === 0 && abrir(S, j, N)) hizo = true;
  return hizo;
}
export function bandera(S, i) { if (S.fin || S.rev[i] === 1) return false; S.rev[i] = S.rev[i] === 2 ? 0 : 2; return true; }
// Pista: primero deducción con lo que ya ves; si no hay, una casilla segura cualquiera
export function pista(S, N) {
  if (S.fin) return null;
  if (!S.minas) return { tipo: 'seguro', i: (S.h >> 1) * S.w + (S.w >> 1) };
  const { esM, num } = N.get(S);
  for (let i = 0; i < S.w * S.h; i++) {
    if (S.rev[i] !== 1 || !num[i]) continue;
    const vec = vecinos(S.w, S.h, i), oc = vec.filter(j => S.rev[j] === 0), fl = vec.filter(j => S.rev[j] === 2).length;
    if (!oc.length) continue;
    if (fl === num[i] && oc.every(j => !esM[j])) return { tipo: 'seguro', i: oc[0] };
    if (oc.length === num[i] - fl && oc.every(j => esM[j])) return { tipo: 'mina', i: oc[0] };
  }
  const seguras = []; for (let i = 0; i < S.w * S.h; i++) if (S.rev[i] === 0 && !esM[i]) seguras.push(i);
  return seguras.length ? { tipo: 'seguro', i: seguras[Math.random() * seguras.length | 0] } : null;
}
// caché de números por estado de minas
export function crearCache() { let k = null, v = null; return { get(S) { const key = S.minas; if (k !== key) { k = key; v = numeros(S); } return v; } }; }
