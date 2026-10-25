// Motor del Solitario Spider (sin DOM, probable con Node).
// Dos mazos (104 cartas) según los palos elegidos (1, 2 o 4). 10 columnas; el resto (50 cartas) se reparte de 10 en 10.
// Una carta se apila sobre otra de rango inmediatamente superior (de cualquier palo); solo se mueven grupos del mismo palo en orden.
// Al formar K…A del mismo palo en una columna, la serie sale a las bases. Se gana con las 8 series.
// Estado: { tab: [{d:[ids boca abajo], u:[ids boca arriba]} ×10], stock: [ids], base: [palo ×series completadas], palos: 1|2|4, mov, rep }
// id de carta = palo*n + rango (francesa n=13, española n=10: ver core/barajasol.js); puede repetirse (hay dos mazos).
// Con la baraja española (40 cartas por mazo, 80 en total) hay 8 series de 10 cartas y 4 repartos.
import { barajar } from '../../core/cartas.js';
import { de, claveValida } from '../../core/barajasol.js';

export const COLS = 10, SERIES = 8;
const enMesa = B => (B.n === 13 ? [6, 6, 6, 6, 5, 5, 5, 5, 5, 5] : Array(10).fill(4));       // cartas iniciales por columna
export const PALOS_OPC = [1, 2, 4];
// Mazo según el número de palos: 1 → solo picas; 2 → picas y corazones; 4 → los cuatro
export function mazo(palos, baraja = 'fr') {
  const B = de({ baraja }), ps = palos === 1 ? [0] : palos === 2 ? [0, 1] : [0, 1, 2, 3], rep = 8 / ps.length, m = [];
  for (let r = 0; r < rep; r++) for (const p of ps) for (let k = 0; k < B.n; k++) m.push(p * B.n + k);
  return m;
}
export function nuevo(palos = 1, baraja = 'fr') {
  palos = PALOS_OPC.includes(palos) ? palos : 1; baraja = claveValida(baraja);
  const B = de({ baraja }), m = barajar(mazo(palos, baraja)), tab = [], ini = enMesa(B);
  for (let i = 0; i < COLS; i++) { const n = ini[i], cs = m.splice(0, n); tab.push({ d: cs.slice(0, n - 1), u: [cs[n - 1]] }); }
  return { tab, stock: m, base: [], palos, mov: 0, rep: 0, baraja };
}
export const copia = S => JSON.parse(JSON.stringify(S));
export const gana = S => S.base.length === SERIES;
export const puntos = S => Math.max(0, 500 - S.mov + 100 * S.base.length);
export const repartosRestantes = S => S.stock.length / COLS;

// ¿Se puede coger la carta idx de la columna col? (ella y las de debajo forman una serie del mismo palo en orden descendente)
export function puedeTomar(S, col, idx) {
  const { palo: paloDe, rango: rangoDe } = de(S), u = S.tab[col].u; if (idx < 0 || idx >= u.length) return false;
  for (let i = idx; i < u.length - 1; i++) if (paloDe(u[i]) !== paloDe(u[i + 1]) || rangoDe(u[i]) !== rangoDe(u[i + 1]) + 1) return false;
  return true;
}
export const secuencia = (S, col, idx) => S.tab[col].u.slice(idx);
export function cabe(S, id, col) {
  const rangoDe = de(S).rango, u = S.tab[col].u; if (!u.length) return true;
  return rangoDe(u[u.length - 1]) === rangoDe(id) + 1;
}
export function puede(S, col, idx, dest) {
  if (col === dest || !puedeTomar(S, col, idx)) return false;
  return cabe(S, S.tab[col].u[idx], dest);
}
// Si la columna acaba en K…A del mismo palo, la serie sale a las bases. Devuelve cuántas series salieron.
function completar(S, col) {
  const B = de(S), paloDe = B.palo, rangoDe = B.rango, c = S.tab[col], u = c.u; let n = 0;
  while (u.length >= B.n) {
    const t = u.slice(-B.n); let ok = rangoDe(t[0]) === B.rey;
    for (let i = 0; ok && i < B.n - 1; i++) ok = paloDe(t[i]) === paloDe(t[i + 1]) && rangoDe(t[i]) === rangoDe(t[i + 1]) + 1;
    if (!ok) break;
    u.splice(-B.n, B.n); S.base.push(paloDe(t[0])); n++;
  }
  if (!u.length && c.d.length) u.push(c.d.pop());
  return n;
}
export function mover(S, col, idx, dest) {
  if (!puede(S, col, idx, dest)) return false;
  const o = S.tab[col], cs = o.u.splice(idx);
  if (!o.u.length && o.d.length) o.u.push(o.d.pop());                 // al descubrir, se da la vuelta a la carta
  S.tab[dest].u.push(...cs); S.mov++;
  completar(S, dest);
  return true;
}
// Repartir: una carta boca arriba en cada columna (no se puede con una columna vacía)
export const puedeRepartir = S => S.stock.length >= COLS && S.tab.every(c => c.u.length > 0);
export function repartir(S) {
  if (!puedeRepartir(S)) return false;
  for (let i = 0; i < COLS; i++) S.tab[i].u.push(S.stock.pop());
  S.mov++; S.rep++;
  for (let i = 0; i < COLS; i++) completar(S, i);
  return true;
}
// Mejor destino para un toque: columna con carta que continúe del mismo palo > otra con carta > columna vacía (solo si sirve de algo)
export function destinoAuto(S, col, idx) {
  if (!puedeTomar(S, col, idx)) return -1;
  const { palo: paloDe } = de(S), id = S.tab[col].u[idx], c = S.tab[col];
  let mejor = -1, pm = -1;
  for (let d = 0; d < COLS; d++) {
    if (!puede(S, col, idx, d)) continue;
    const u = S.tab[d].u; let p;
    if (!u.length) { if (idx === 0 && !c.d.length) continue; p = 1; }            // columna vacía: no mover una serie que ya está al fondo
    else { p = paloDe(u[u.length - 1]) === paloDe(id) ? 100 : 50; if (idx === 0 && !c.d.length && p < 100) p = 5; }
    // preferir la que deja más larga la serie del mismo palo
    if (u.length && p >= 50) p += Math.min(30, longitudSerie(S, d));
    if (p > pm) { pm = p; mejor = d; }
  }
  return mejor;
}
// longitud de la serie del mismo palo que acaba al final de la columna
export function longitudSerie(S, col) {
  const { palo: paloDe, rango: rangoDe } = de(S), u = S.tab[col].u; let n = u.length ? 1 : 0;
  for (let i = u.length - 2; i >= 0; i--) { if (paloDe(u[i]) === paloDe(u[i + 1]) && rangoDe(u[i]) === rangoDe(u[i + 1]) + 1) n++; else break; }
  return n;
}
// Pista: prioriza juntar cartas del mismo palo y descubrir cartas; evita deshacer series
export function pista(S) {
  const { palo: paloDe, rango: rangoDe } = de(S), c = [];
  for (let col = 0; col < COLS; col++) {
    const u = S.tab[col].u;
    for (let idx = 0; idx < u.length; idx++) {
      if (!puedeTomar(S, col, idx)) continue;
      for (let d = 0; d < COLS; d++) {
        if (!puede(S, col, idx, d)) continue;
        const vacia = !S.tab[d].u.length, id = u[idx], du = S.tab[d].u;
        let p = 0;
        if (!vacia) { p = paloDe(du[du.length - 1]) === paloDe(id) ? 80 : 30; }
        else { if (idx === 0 && !S.tab[col].d.length) continue; p = 20; }
        if (idx === 0 && S.tab[col].d.length) p += 40;                                   // descubre una carta
        if (idx > 0 && paloDe(u[idx - 1]) === paloDe(id) && rangoDe(u[idx - 1]) === rangoDe(id) + 1) continue;   // rompería una serie ya hecha
        if (!vacia && idx === 0 && !S.tab[col].d.length && p < 80) continue;           // mover una serie entera sin ganar nada
        c.push({ col, idx, dest: d, p });
      }
    }
  }
  c.sort((a, b) => b.p - a.p);
  if (c.length) { const m = c[0]; return { tipo: 'mover', ...m, txt: `${de(S).nombre(S.tab[m.col].u[m.idx])} → columna ${m.dest + 1}` }; }
  if (puedeRepartir(S)) return { tipo: 'repartir', txt: 'Reparte una carta nueva a cada columna' };
  if (S.stock.length && S.tab.some(x => !x.u.length)) return { tipo: 'vacia', txt: 'Para repartir hay que llenar antes las columnas vacías' };
  return null;
}
// ¿quedan jugadas? (para avisar de bloqueo)
export function hayJugadas(S) {
  if (puedeRepartir(S)) return true;
  for (let col = 0; col < COLS; col++) for (let idx = 0; idx < S.tab[col].u.length; idx++) {
    if (!puedeTomar(S, col, idx)) continue;
    for (let d = 0; d < COLS; d++) if (puede(S, col, idx, d) && !(S.tab[d].u.length === 0 && idx === 0 && !S.tab[col].d.length)) return true;
  }
  return false;
}
export function validar(d) {
  if (!d || typeof d !== 'object') return null;
  const B = de({ baraja: claveValida(d.baraja) }), ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  if (!PALOS_OPC.includes(d.palos) || !Array.isArray(d.tab) || d.tab.length !== COLS || !Array.isArray(d.stock) || !Array.isArray(d.base)) return null;
  const permitidos = new Set(mazo(d.palos, B.clave).map(c => B.palo(c)));
  const carta = v => ent(v, 0, B.total - 1) && permitidos.has(B.palo(v));
  const cuenta = new Map(); let total = 0;
  const lista = (a, max) => Array.isArray(a) && a.length <= max && a.every(v => { if (!carta(v)) return false; cuenta.set(v, (cuenta.get(v) || 0) + 1); total++; return true; });
  const tab = [];
  for (const c of d.tab) { if (!c || !lista(c.d, 60) || !lista(c.u, 104)) return null; if (c.d.length && !c.u.length) return null; tab.push({ d: c.d.slice(), u: c.u.slice() }); }
  if (!lista(d.stock, 50) || d.stock.length % COLS) return null;
  if (d.base.length > SERIES || !d.base.every(p => ent(p, 0, 3) && permitidos.has(p))) return null;
  total += d.base.length * B.n; for (const p of d.base) for (let k = 0; k < B.n; k++) cuenta.set(p * B.n + k, (cuenta.get(p * B.n + k) || 0) + 1);
  if (total !== 8 * B.n) return null;
  const esperado = new Map(); for (const v of mazo(d.palos, B.clave)) esperado.set(v, (esperado.get(v) || 0) + 1);
  for (const [k, n] of esperado) if (cuenta.get(k) !== n) return null;
  return { tab, stock: d.stock.slice(), base: d.base.slice(), palos: d.palos, baraja: B.clave, mov: ent(d.mov, 0, 1e6) ? d.mov : 0, rep: ent(d.rep, 0, 5) ? d.rep : 0 };
}
