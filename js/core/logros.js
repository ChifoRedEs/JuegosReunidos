// Logros: se calculan a partir de las estadísticas (core/stats.js) y de los retos del día completados.
// Se guardan como { id: fecha } en jr2:logros. revisar() devuelve los recién conseguidos para avisar al jugador.
import { leer, escribir } from './storage.js';
import { todas } from './stats.js';

const sum = (T, k) => Object.values(T).reduce((a, s) => a + (s[k] || 0), 0);
const jugados = T => Object.values(T).filter(s => s.partidas > 0).length;
const ganadosEn = (T, ids) => ids.some(id => T[id] && T[id].victorias > 0);
const maxRecord = (T, ids) => Math.max(0, ...ids.map(id => Math.max(0, ...Object.values((T[id] && T[id].records) || {}))));
const retos = () => { const r = leer('retos', {}); return r && typeof r === 'object' ? Object.values(r).reduce((a, l) => a + (Array.isArray(l) ? l.length : 0), 0) : 0; };
const diasReto = () => { const r = leer('retos', {}); return r && typeof r === 'object' ? Object.keys(r).filter(k => Array.isArray(r[k]) && r[k].length).length : 0; };

// cat: ids de cada categoría (los pasa app.js desde registry.js)
export function definiciones(cat) {
  const L = [
    ['primera', '🎉', 'Primera partida', 'Termina tu primera partida.', T => sum(T, 'partidas') >= 1],
    ['victoria', '🏆', 'Primera victoria', 'Gana una partida a cualquier juego.', T => sum(T, 'victorias') >= 1],
    ['p10', '🎮', 'Calentando', 'Termina 10 partidas.', T => sum(T, 'partidas') >= 10],
    ['p50', '🔥', 'Jugón', 'Termina 50 partidas.', T => sum(T, 'partidas') >= 50],
    ['p200', '💎', 'Leyenda de la mesa', 'Termina 200 partidas.', T => sum(T, 'partidas') >= 200],
    ['v25', '🥇', 'Ganador nato', 'Gana 25 partidas.', T => sum(T, 'victorias') >= 25],
    ['racha5', '⚡', 'En racha', 'Gana 5 partidas seguidas a un mismo juego.', T => Object.values(T).some(s => s.mejorRacha >= 5)],
    ['racha10', '🌟', 'Imparable', 'Gana 10 partidas seguidas a un mismo juego.', T => Object.values(T).some(s => s.mejorRacha >= 10)],
    ['explorador', '🧭', 'Explorador', 'Termina partidas en 10 juegos distintos.', T => jugados(T) >= 10],
    ['coleccion', '🗺️', 'Lo he probado todo', 'Termina partidas en 25 juegos distintos.', T => jugados(T) >= 25],
    ['logica', '🧠', 'Cerebrito', 'Gana a un juego de Lógica.', T => ganadosEn(T, cat.logica || [])],
    ['tablero', '🎲', 'Rey del tablero', 'Gana a un juego de Tablero.', T => ganadosEn(T, cat.tablero || [])],
    ['cartas', '🃏', 'Tahúr', 'Gana a un juego de Cartas.', T => ganadosEn(T, cat.cartas || [])],
    ['palabras', '🔤', 'Pico de oro', 'Gana a un juego de Palabras.', T => ganadosEn(T, cat.palabras || [])],
    ['todoterreno', '🎯', 'Todoterreno', 'Gana en Lógica, Tablero, Cartas y Palabras.', T => ['logica', 'tablero', 'cartas', 'palabras'].every(k => ganadosEn(T, cat[k] || []))],
    ['arcade1k', '🕹️', 'Mil puntos', 'Consigue 1.000 puntos en un juego Arcade.', T => maxRecord(T, cat.arcade || []) >= 1000],
    ['arcade10k', '👾', 'Maestro arcade', 'Consigue 10.000 puntos en un juego Arcade.', T => maxRecord(T, cat.arcade || []) >= 10000],
    ['reto1', '📅', 'Reto cumplido', 'Completa un Reto del día.', () => retos() >= 1],
    ['reto7', '🗓️', 'Constante', 'Completa retos del día en 7 días distintos.', () => diasReto() >= 7],
    ['reto30', '🏅', 'Un mes de retos', 'Completa retos del día en 30 días distintos.', () => diasReto() >= 30],
  ];
  return L.map(([id, icono, nombre, desc, cumple]) => ({ id, icono, nombre, desc, cumple }));
}
export const conseguidos = () => { const g = leer('logros', {}); return g && typeof g === 'object' ? g : {}; };
export function revisar(cat) {
  const T = todas(), G = conseguidos(), nuevos = [];
  for (const d of definiciones(cat)) if (!G[d.id]) { try { if (d.cumple(T)) { G[d.id] = Date.now(); nuevos.push(d); } } catch { /* ignorar */ } }
  if (nuevos.length) escribir('logros', G);
  return nuevos;
}
export function importar(o) {
  if (!o || typeof o !== 'object') return;
  const G = conseguidos();
  for (const [k, v] of Object.entries(o)) if (/^[a-z0-9]{1,20}$/.test(k) && Number.isFinite(v) && !G[k]) G[k] = v;
  escribir('logros', G);
}
// Retos del día completados: { 'AAAA-MM-DD': ['sudoku', …] }
export function marcarReto(fecha, id) {
  const r = leer('retos', {}) || {};
  const l = Array.isArray(r[fecha]) ? r[fecha] : [];
  if (!l.includes(id)) l.push(id);
  r[fecha] = l; escribir('retos', r);
}
export const retoHecho = (fecha, id) => { const r = leer('retos', {}) || {}; return Array.isArray(r[fecha]) && r[fecha].includes(id); };
export function importarRetos(o) {
  if (!o || typeof o !== 'object') return;
  const r = leer('retos', {}) || {};
  for (const [f, l] of Object.entries(o)) if (/^\d{4}-\d{2}-\d{2}$/.test(f) && Array.isArray(l)) r[f] = [...new Set([...(r[f] || []), ...l.filter(x => typeof x === 'string' && /^[a-z0-9]{1,20}$/.test(x))])];
  escribir('retos', r);
}
export const todosRetos = () => leer('retos', {}) || {};
