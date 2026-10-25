// Logros: se calculan a partir de las estadísticas (core/stats.js) y de los retos del día completados.
// Se guardan como { id: fecha } en jr2:logros. revisar() devuelve los recién conseguidos para avisar al jugador.
import { leer, escribir } from './storage.js';
import { todas } from './stats.js';

const sum = (T, k) => Object.values(T).reduce((a, s) => a + (s[k] || 0), 0);
const jugados = T => Object.values(T).filter(s => s.partidas > 0).length;
const ganadosEn = (T, ids) => ids.some(id => T[id] && T[id].victorias > 0);
const maxRecord = (T, ids) => Math.max(0, ...ids.map(id => Math.max(0, ...Object.values((T[id] && T[id].records) || {}))));
const ganadosDistintos = T => Object.values(T).filter(s => s.victorias > 0).length;
const sumCat = (T, ids, k) => (ids || []).reduce((a, id) => a + ((T[id] && T[id][k]) || 0), 0);
const todosJugados = (T, ids) => !!ids && ids.length > 0 && ids.every(id => T[id] && T[id].partidas > 0);
const algun = (T, f) => Object.values(T).some(s => { try { return f(s); } catch { return false; } });
const mejorTiempo = T => Math.min(Infinity, ...Object.values(T).flatMap(s => Object.values(s.tiempos || {})).filter(v => v > 0));
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
    // — Más difíciles —
    ['p500', '🚀', 'Incansable', 'Termina 500 partidas.', T => sum(T, 'partidas') >= 500],
    ['p1000', '🌌', 'Mil y una partidas', 'Termina 1.000 partidas.', T => sum(T, 'partidas') >= 1000],
    ['v100', '💯', 'Centenario', 'Gana 100 partidas.', T => sum(T, 'victorias') >= 100],
    ['v250', '👑', 'Campeón', 'Gana 250 partidas.', T => sum(T, 'victorias') >= 250],
    ['v500', '🐉', 'Invencible', 'Gana 500 partidas.', T => sum(T, 'victorias') >= 500],
    ['racha20', '☄️', 'Racha legendaria', 'Gana 20 partidas seguidas a un mismo juego.', T => Object.values(T).some(s => s.mejorRacha >= 20)],
    ['explor40', '🔭', 'Casi completo', 'Termina partidas en 40 juegos distintos.', T => jugados(T) >= 40],
    ['todos50', '🎖️', 'Completista', 'Termina partidas en los 50 juegos.', T => jugados(T) >= 50],
    ['gana10', '🎭', 'Polivalente', 'Gana al menos una vez en 10 juegos distintos.', T => ganadosDistintos(T) >= 10],
    ['gana25', '🦸', 'Campeón de campeones', 'Gana al menos una vez en 25 juegos distintos.', T => ganadosDistintos(T) >= 25],
    ['logica25', '💡', 'Mente brillante', 'Gana 25 partidas en juegos de Lógica.', T => sumCat(T, cat.logica, 'victorias') >= 25],
    ['tablero25', '♟️', 'Gran maestro', 'Gana 25 partidas en juegos de Tablero.', T => sumCat(T, cat.tablero, 'victorias') >= 25],
    ['cartas25', '♠️', 'Rey de la baraja', 'Gana 25 partidas en juegos de Cartas.', T => sumCat(T, cat.cartas, 'victorias') >= 25],
    ['palabras25', '📚', 'Erudito', 'Gana 25 partidas en juegos de Palabras.', T => sumCat(T, cat.palabras, 'victorias') >= 25],
    ['arcade30k', '🚁', 'Leyenda arcade', 'Consigue 30.000 puntos en un juego Arcade.', T => maxRecord(T, cat.arcade || []) >= 30000],
    ['todologica', '🧩', 'Lógica completa', 'Termina partidas en todos los juegos de Lógica.', T => todosJugados(T, cat.logica)],
    ['todotablero', '🏰', 'Tablero completo', 'Termina partidas en todos los juegos de Tablero.', T => todosJugados(T, cat.tablero)],
    ['todocartas', '🂡', 'Baraja completa', 'Termina partidas en todos los juegos de Cartas.', T => todosJugados(T, cat.cartas)],
    ['todopalabras', '🔠', 'Diccionario vivo', 'Termina partidas en todos los juegos de Palabras.', T => todosJugados(T, cat.palabras)],
    ['todoarcade', '🎰', 'Salón recreativo', 'Termina partidas en todos los juegos Arcade.', T => todosJugados(T, cat.arcade)],
    ['esp25', '🎓', 'Especialista', 'Gana 25 partidas a un mismo juego.', T => algun(T, s => s.victorias >= 25)],
    ['esp100', '🏛️', 'Maestro de un juego', 'Gana 100 partidas a un mismo juego.', T => algun(T, s => s.victorias >= 100)],
    ['fiel50', '❤️', 'Fiel', 'Termina 50 partidas a un mismo juego.', T => algun(T, s => s.partidas >= 50)],
    ['punteria', '🎯', 'Puntería', 'Gana el 70 % de tus partidas a un juego (mínimo 20 partidas).', T => algun(T, s => s.partidas >= 20 && s.victorias / s.partidas >= .7)],
    ['imbatible', '🛡️', 'Imbatible', 'Gana el 75 % de tus partidas a un juego (mínimo 50 partidas).', T => algun(T, s => s.partidas >= 50 && s.victorias / s.partidas >= .75)],
    ['rayo', '⏱️', 'Rayo', 'Gana una partida con tiempo inferior a 15 segundos.', T => mejorTiempo(T) < 15],
    ['tablas10', '🤝', 'Diplomático', 'Empata (tablas) 10 partidas.', T => sum(T, 'tablas') >= 10],
    ['reto60', '📆', 'Dos meses de retos', 'Completa retos del día en 60 días distintos.', () => diasReto() >= 60],
    ['reto100', '🔟', 'Retador', 'Completa 100 retos del día en total.', () => retos() >= 100],
    ['niveles5', '🪜', 'Todas las dificultades', 'Consigue tu mejor tiempo en 5 variantes distintas de un mismo juego.', T => algun(T, s => Object.keys(s.tiempos || {}).length >= 5)],
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
