// Acceso a localStorage con prefijo propio. Un juego = una clave: jr2:juego:<id>
const PRE = 'jr2:';
let alFallar = null;                       // app.js avisa al usuario si el almacenamiento está lleno
export const siFalla = fn => { alFallar = fn; };
export function leer(k, def = null) { try { const v = localStorage.getItem(PRE + k); return v == null ? def : JSON.parse(v); } catch { return def; } }
export function escribir(k, v) {
  try { localStorage.setItem(PRE + k, JSON.stringify(v)); return true; }
  catch (e) { if (alFallar) alFallar(k, e); return false; }
}
export function borrar(k) { try { localStorage.removeItem(PRE + k); } catch { /* sin acceso */ } }

// Entrada de un juego: { v:2, t:<ms>, resumen:'Medio · 32/81', fin:false, datos:{...} }
export function getJuego(id) { const e = leer('juego:' + id); return e && e.v === 2 && e.datos && typeof e.datos === 'object' ? e : null; }
export function setJuego(id, datos, resumen = null, fin = false) {
  const t = Date.now(), ok = escribir('juego:' + id, { v: 2, t, resumen, fin: !!fin, datos });
  if (ok) { const ix = indice(); ix[id] = { resumen, fin: !!fin, t }; escribir('indice', ix); }
  return ok;
}
export function borrarJuego(id) { borrar('juego:' + id); const ix = indice(); if (ix[id]) { delete ix[id]; escribir('indice', ix); } }

// Índice ligero con el resumen de cada partida guardada: el Inicio lo usa para no leer (y parsear) las partidas enteras.
let IX = null;
function indice() {
  if (IX) return IX;
  const g = leer('indice', null);
  if (g && typeof g === 'object') return (IX = g);
  IX = {};                                                       // primera vez: se construye a partir de las partidas
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i); if (!k || !k.startsWith(PRE + 'juego:')) continue;
      const id = k.slice((PRE + 'juego:').length), e = getJuego(id);
      if (e) IX[id] = { resumen: e.resumen, fin: e.fin, t: e.t };
    }
  } catch { /* sin acceso */ }
  escribir('indice', IX);
  return IX;
}
export const getResumen = id => indice()[id] || null;
