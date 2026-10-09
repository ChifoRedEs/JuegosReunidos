// Acceso a localStorage con prefijo propio. Un juego = una clave: jr2:juego:<id>
const PRE = 'jr2:';
export function leer(k, def = null) { try { const v = localStorage.getItem(PRE + k); return v == null ? def : JSON.parse(v); } catch { return def; } }
export function escribir(k, v) { try { localStorage.setItem(PRE + k, JSON.stringify(v)); return true; } catch { return false; } }
export function borrar(k) { try { localStorage.removeItem(PRE + k); } catch { /* sin acceso */ } }

// Entrada de un juego: { v:2, t:<ms>, resumen:'Medio · 32/81', fin:false, datos:{...} }
export function getJuego(id) { const e = leer('juego:' + id); return e && e.v === 2 && e.datos && typeof e.datos === 'object' ? e : null; }
export function setJuego(id, datos, resumen = null, fin = false) { return escribir('juego:' + id, { v: 2, t: Date.now(), resumen, fin: !!fin, datos }); }
export function borrarJuego(id) { borrar('juego:' + id); }
