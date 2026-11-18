// Motor de Mahjong solitario (sin DOM, probable con Node).
// Coordenadas en medias fichas: una ficha ocupa [x, x+2) × [y, y+2) en su altura z.
import { shuffle } from '../../core/dom.js';

/* ---------- fichas ---------- */
export const PALOS = ['cir', 'bam', 'car'];
const CARAS = [...PALOS.flatMap(p => Array.from({ length: 9 }, (_, k) => `${p}-${k + 1}`)), 'vie-n', 'vie-e', 'vie-s', 'vie-o', 'dra-r', 'dra-v', 'dra-b'];   // 34 caras ×4
const FLORES = ['flo-1', 'flo-2', 'flo-3', 'flo-4'], ESTACIONES = ['est-1', 'est-2', 'est-3', 'est-4'];
export const TODAS_LAS_CARAS = [...CARAS, ...FLORES, ...ESTACIONES];
export const valida = f => TODAS_LAS_CARAS.includes(f);
export const grupo = f => (f.startsWith('flo-') ? 'flo' : f.startsWith('est-') ? 'est' : f);
export const casan = (a, b) => grupo(a) === grupo(b);

/* ---------- distribuciones ---------- */
const bloque = (z, x0, x1, y0, y1) => { const l = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) l.push([x * 2, y * 2, z]); return l; };
const fila = (z, x0, x1, y) => bloque(z, x0, x1, y, y);
export const DISTRIBUCIONES = {
  tortuga: { nombre: 'Tortuga', ayuda: 'La clásica: 144 fichas en 5 alturas.', pos: () => [
    ...fila(0, 1, 12, 0), ...fila(0, 3, 10, 1), ...fila(0, 2, 11, 2), ...fila(0, 1, 12, 3), ...fila(0, 1, 12, 4), ...fila(0, 2, 11, 5), ...fila(0, 3, 10, 6), ...fila(0, 1, 12, 7),
    [0, 7, 0], [26, 7, 0], [28, 7, 0], ...bloque(1, 4, 9, 1, 6), ...bloque(2, 5, 8, 2, 5), ...bloque(3, 6, 7, 3, 4), [13, 7, 4]] },
  piramide: { nombre: 'Pirámide', ayuda: '104 fichas en 3 alturas.', pos: () => [...bloque(0, 0, 9, 0, 5), ...bloque(1, 1, 8, 1, 4), ...bloque(2, 2, 7, 2, 3)] },
  mini: { nombre: 'Mini', ayuda: '44 fichas: una partida rápida.', pos: () => [...bloque(0, 0, 7, 0, 3), ...bloque(1, 1, 6, 1, 2)] },
};
export const posiciones = id => DISTRIBUCIONES[id].pos().map(([x, y, z]) => ({ x, y, z }));

/* ---------- reglas ---------- */
// ¿Está libre la ficha i? (sin ficha encima y con el lado izquierdo o el derecho despejado). pos: [{x,y,z}], vivo: [bool]
export function libre(pos, vivo, i) {
  const a = pos[i]; let izq = false, der = false;
  for (let j = 0; j < pos.length; j++) {
    if (j === i || !vivo[j]) continue; const b = pos[j];
    if (Math.abs(b.y - a.y) >= 2) continue;
    if (b.z === a.z + 1 && Math.abs(b.x - a.x) < 2) return false;
    if (b.z === a.z) { if (b.x === a.x - 2) izq = true; else if (b.x === a.x + 2) der = true; }
  }
  return !(izq && der);
}
export const libres = (pos, vivo) => { const l = []; for (let i = 0; i < pos.length; i++) if (vivo[i] && libre(pos, vivo, i)) l.push(i); return l; };
export function jugadas(pos, vivo, caras) {
  const L = libres(pos, vivo), r = [];
  for (let a = 0; a < L.length; a++) for (let b = a + 1; b < L.length; b++) if (casan(caras[L[a]], caras[L[b]])) r.push([L[a], L[b]]);
  return r;
}

/* ---------- reparto resoluble ---------- */
// Pares a partir de una lista de caras (cada cara regular aparece un número par de veces; flores y estaciones, también en total).
export function paresDe(caras) {
  const por = new Map(); for (const f of caras) { const g = grupo(f); (por.get(g) || por.set(g, []).get(g)).push(f); }
  const pares = []; for (const l of por.values()) { shuffle(l); for (let k = 0; k + 1 < l.length; k += 2) pares.push([l[k], l[k + 1]]); }
  return pares;
}
// Asigna caras a las posiciones «jugando hacia atrás»: se quitan parejas de fichas libres y se les da una pareja de caras.
// vivo: qué posiciones se reparten (el resto ya no está). Devuelve [caras] (undefined en las no vivas) o null si se atasca.
function repartir(pos, vivo0, pares) {
  const vivo = vivo0.slice(), caras = new Array(pos.length).fill(null); let n = vivo.filter(Boolean).length, k = 0;
  if (pares.length * 2 !== n) return null;
  while (n > 0) {
    const L = libres(pos, vivo); if (L.length < 2) return null;
    const a = L.splice(Math.random() * L.length | 0, 1)[0], b = L[Math.random() * L.length | 0];
    caras[a] = pares[k][0]; caras[b] = pares[k][1]; k++; vivo[a] = vivo[b] = false; n -= 2;
  }
  return caras;
}
export function generar(id = 'tortuga') {
  const pos = posiciones(id), N = pos.length;
  const regulares = []; for (const f of CARAS) for (let k = 0; k < 2; k++) regulares.push([f, f]);
  const grupos = [...paresDe(FLORES), ...paresDe(ESTACIONES)];
  for (let intento = 0; intento < 400; intento++) {
    const todos = shuffle([...regulares, ...grupos].map(p => p.slice())), pares = todos.slice(0, N / 2);
    // se mezclan los lados de cada pareja para que flores y estaciones no vayan siempre juntas por orden
    const caras = repartir(pos, new Array(N).fill(true), shuffle(pares));
    if (caras) return { id, caras };
  }
  throw new Error('Mahjong: no se pudo repartir');
}
// Baraja de nuevo las fichas que quedan (resoluble). vivo: [bool]. Devuelve [caras] completo (las quitadas conservan la suya).
export function mezclar(pos, vivo, caras) {
  const restantes = caras.filter((_, i) => vivo[i]);
  for (let intento = 0; intento < 400; intento++) {
    const nuevo = repartir(pos, vivo, shuffle(paresDe(restantes)));
    if (nuevo) return caras.map((f, i) => (vivo[i] ? nuevo[i] : f));
  }
  return null;
}
// ¿Pueden emparejarse todas las fichas que quedan? (cuentas pares)
export function emparejable(caras, vivo) {
  const c = new Map(); caras.forEach((f, i) => { if (vivo[i]) c.set(grupo(f), (c.get(grupo(f)) || 0) + 1); });
  return [...c.values()].every(v => v % 2 === 0);
}
