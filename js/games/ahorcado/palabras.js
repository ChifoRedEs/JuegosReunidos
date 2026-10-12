// Fuentes de palabras del Ahorcado: crucigrama (fácil / medio) y las 450 definiciones del PDF (difícil / experto).
import { BANCOS } from '../crucigrama/pistas.js';
import { BLOQUES, analizar, enmascarar, sinTildes } from '../../core/definiciones.js';

export const NIVELES = {
  facil:   { nombre: 'Fácil',   fallos: 8, pista: 'visible', letra: 'gratis', fuente: 'c', ayuda: 'Palabras cortas y cotidianas, con la pista a la vista y una letra gratis.' },
  medio:   { nombre: 'Medio',   fallos: 7, pista: 'visible', letra: 'cuesta', fuente: 'c', ayuda: 'Palabras más largas y algunos términos del banco de definiciones.' },
  dificil: { nombre: 'Difícil', fallos: 6, pista: 'oculta',  letra: 'cuesta', fuente: 'p', ayuda: 'Vocabulario culto. La pista está oculta: verla cuesta un fallo.' },
  experto: { nombre: 'Experto', fallos: 5, pista: 'oculta',  letra: 'cuesta', fuente: 'p', ayuda: 'Términos largos y expresiones. Pocos fallos y pista oculta.' },
};
export const TEMAS_C = Object.entries(BANCOS).map(([id, b]) => ({ id: 'c:' + id, nombre: b.nombre, icono: b.icono }));
export const TEMAS_P = BLOQUES.map(b => ({ id: 'p:' + b.id, nombre: b.nombre, icono: b.icono }));
export const temasDe = nivel => [{ id: 'mezcla', nombre: 'Mezcla', icono: '🎲' }, ...(NIVELES[nivel].fuente === 'c' ? TEMAS_C : TEMAS_P)];
export const base = ch => (ch === 'ñ' || ch === 'Ñ' ? 'Ñ' : sinTildes(ch).toUpperCase());
export const mayus = s => s.toLocaleUpperCase('es');
const OK = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ -]+$/;

function deCrucigrama(tema) {
  const ids = tema === 'mezcla' || !tema.startsWith('c:') ? Object.keys(BANCOS) : [tema.slice(2)];
  return ids.flatMap(id => BANCOS[id].entradas.map(([p, d]) => ({ palabra: p, pista: d, tema: 'c:' + id })));
}
function dePdf(tema) {
  const bl = tema === 'mezcla' || !tema.startsWith('p:') ? BLOQUES : BLOQUES.filter(b => 'p:' + b.id === tema);
  return bl.flatMap(b => b.fichas.map(([sub, def, resp]) => ({ palabra: analizar(resp).principal, pista: enmascarar(def, resp), tema: 'p:' + b.id, sub })).filter(x => OK.test(x.palabra)));
}
export function candidatas(nivel, tema) {
  const nPal = w => w.replace(/[ -]/g, '').length, palabras = w => w.trim().split(/\s+/).length;
  if (nivel === 'facil') return deCrucigrama(tema).filter(x => nPal(x.palabra) >= 4 && nPal(x.palabra) <= 8);
  if (nivel === 'medio') return [...deCrucigrama(tema).filter(x => nPal(x.palabra) >= 6), ...(tema.startsWith('c:') ? [] : dePdf('mezcla').filter(x => palabras(x.palabra) === 1 && nPal(x.palabra) <= 9))];
  if (nivel === 'dificil') return dePdf(tema).filter(x => nPal(x.palabra) >= 5 && nPal(x.palabra) <= 14);
  return dePdf(tema).filter(x => nPal(x.palabra) >= 8 || palabras(x.palabra) >= 2);
}
export function elegir(nivel, tema, evitar = []) {
  let c = candidatas(nivel, tema); if (!c.length) c = candidatas(nivel, 'mezcla');
  const libres = c.filter(x => !evitar.includes(x.palabra)); const pool = libres.length ? libres : c;
  return pool[Math.random() * pool.length | 0];
}
