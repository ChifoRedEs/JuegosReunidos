// Caras de «¿Qué cara tienes?»: validación, imagen y reparto del tablero. Sin DOM.
import { CARAS } from './caras.js';

export const SOMBREROS = { beanie: 1, cap: 1, brim: 1, tophat: 1, turban: 1 };
const POR_ID = new Map(CARAS.map(f => [f.id, f]));
export const ruta = f => `img/quecaratienes/${String(f.id).padStart(2, '0')}.webp`;
export const imgDe = f => `<img src="${ruta(f)}" alt="${f.nm}" draggable="false" decoding="async">`;

// Una cara guardada se valida por su id: los rasgos siempre salen de la tabla actual.
export function caraValida(f) {
  if (!f || typeof f !== 'object' || !Number.isInteger(f.id)) return null;
  const c = POR_ID.get(f.id);
  return c ? { ...c } : null;
}

export function crearRng(semilla) {
  let a = semilla >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const barajar = (a, rng) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const grupo = sx => CARAS.filter(f => f.sx === sx);

// Elige n caras (mitad chicos, mitad chicas) de las 60. Si se da `vector`, cada pareja se distingue por ≥ 2 preguntas.
export function generarCaras(n, semilla = (Math.random() * 4294967296) >>> 0, vector = null) {
  const rng = crearRng(semilla), nh = Math.floor(n / 2);
  for (let intento = 0; intento < 200; intento++) {
    const out = [...barajar(grupo('h'), rng).slice(0, nh), ...barajar(grupo('m'), rng).slice(0, n - nh)].map(f => ({ ...f }));
    if (vector) {
      const v = out.map(vector); let ok = true;
      for (let i = 0; i < n && ok; i++) for (let j = i + 1; j < n; j++) { let d = 0; for (let q = 0; q < v[i].length; q++) if (v[i][q] !== v[j][q]) d++; if (d < 2) { ok = false; break; } }
      if (!ok) continue;
    }
    return barajar(out, rng);
  }
  return null;
}
export const generarSimple = (n, semilla) => generarCaras(n, semilla, null);
