// Estadísticas por juego: partidas, victorias, derrotas, tablas, rachas y mejores tiempos por variante.
import { leer, escribir } from './storage.js';
const K = 'stats';
export const todas = () => leer(K, {}) || {};
const num = v => Number.isFinite(v) && v >= 0 ? v : 0;

// res: 'victoria' | 'derrota' | 'tablas' | 'partida' (terminada sin ganador claro)
export function registrar(id, { res, tiempo = null, variante = '', limpio = true }) {
  const T = todas();
  const s = T[id] = T[id] || { partidas: 0, victorias: 0, derrotas: 0, tablas: 0, racha: 0, mejorRacha: 0, tiempos: {}, ultima: 0 };
  s.partidas++;
  if (res === 'victoria') { s.victorias++; s.racha++; s.mejorRacha = Math.max(s.mejorRacha, s.racha); }
  else if (res === 'derrota') { s.derrotas++; s.racha = 0; }
  else if (res === 'tablas') s.tablas++;
  if (res === 'victoria' && tiempo != null && limpio && variante) {
    const b = s.tiempos[variante]; if (b == null || tiempo < b) s.tiempos[variante] = Math.round(tiempo);
  }
  s.ultima = Date.now();
  escribir(K, T);
}
export const reiniciar = () => escribir(K, {});
export function importar(o) {
  if (!o || typeof o !== 'object') return;
  const T = {};
  for (const [id, s] of Object.entries(o)) {
    if (!s || typeof s !== 'object') continue;
    const tiempos = {};
    if (s.tiempos && typeof s.tiempos === 'object') for (const [k, v] of Object.entries(s.tiempos)) if (Number.isFinite(v) && v >= 0) tiempos[k] = v;
    T[id] = { partidas: num(s.partidas), victorias: num(s.victorias), derrotas: num(s.derrotas), tablas: num(s.tablas), racha: num(s.racha), mejorRacha: num(s.mejorRacha), tiempos, ultima: num(s.ultima) };
  }
  escribir(K, T);
}
