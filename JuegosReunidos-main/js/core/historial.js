// Historiales para los juegos de cartas: partidas terminadas (en las preferencias del juego)
// y tabla de puntos mano a mano (guardada con la partida en curso).
import { esc } from './dom.js';

// ---- partidas terminadas (las 20 últimas) ----
export function anotarPartida(api, { res, texto }) {
  const l = api.pref('historial', []), lista = Array.isArray(l) ? l : [];
  lista.unshift({ f: Date.now(), res: ['g', 'p', 'e'].includes(res) ? res : 'e', t: String(texto).slice(0, 90) });
  api.setPref('historial', lista.slice(0, 20));
}
export function htmlPartidas(api) {
  const l = api.pref('historial', []); if (!Array.isArray(l) || !l.length) return '<p class="note">Aún no has terminado ninguna partida.</p>';
  const ic = { g: '✔', p: '✘', e: '＝' };
  return `<table class="tabla hstab">${l.map(x => `<tr><td class="${x.res}">${ic[x.res] || ''}</td><td>${esc(x.t)}</td><td>${new Date(x.f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</td></tr>`).join('')}</table>`;
}

// ---- tabla mano a mano ----
// H = { filas: [[puntos de cada jugador en esa mano]], marcada: bool }. Se apunta una fila al terminar cada mano.
export const historialVacio = () => ({ filas: [], marcada: false });
export function validarHistorial(h, n) {
  if (!h || typeof h !== 'object' || !Array.isArray(h.filas)) return historialVacio();
  const filas = h.filas.filter(f => Array.isArray(f) && f.length === n && f.every(v => Number.isInteger(v) && Math.abs(v) < 1e5)).slice(-60);
  return { filas, marcada: !!h.marcada };
}
// Apunta la mano si el juego está en su fase de fin de mano y aún no se ha apuntado; la marca se quita al empezar otra.
export function seguir(H, enFinDeMano, puntos) {
  if (enFinDeMano && !H.marcada) { H.filas.push(puntos.map(v => Math.round(v))); H.marcada = true; return true; }
  if (!enFinDeMano) H.marcada = false;
  return false;
}
// Tabla HTML: una fila por mano y el total al final
export function htmlTabla(nombres, filas, { titulo = 'Mano', menosEsMejor = false, totales = null } = {}) {
  if (!filas.length) return '<p class="note">Todavía no ha terminado ninguna mano.</p>';
  const tot = totales || nombres.map((_, k) => filas.reduce((s, f) => s + f[k], 0));
  const mejor = menosEsMejor ? Math.min(...tot) : Math.max(...tot);
  return `<div class="hsscroll"><table class="tabla hsmanos"><thead><tr><th>${esc(titulo)}</th>${nombres.map(n => `<th>${esc(n)}</th>`).join('')}</tr></thead><tbody>
    ${filas.map((f, i) => `<tr><td>${i + 1}</td>${f.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody>
    <tfoot><tr><td>Total</td>${tot.map(v => `<td class="${v === mejor ? 'lider' : ''}">${v}</td>`).join('')}</tr></tfoot></table></div>`;
}
