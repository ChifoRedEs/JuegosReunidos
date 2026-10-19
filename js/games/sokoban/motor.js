// Motor del Sokoban (sin DOM: se usa en la página, en un Worker para generar niveles y en las pruebas con Node).
// Formato de nivel estándar: # muro · espacio suelo · . meta · $ caja · * caja en meta · @ jugador · + jugador en meta.
import { mulberry32, hashTexto } from '../../core/semilla.js';

export const DIRS = { arriba: [0, -1], abajo: [0, 1], izquierda: [-1, 0], derecha: [1, 0] };
const D4 = [[0, -1], [0, 1], [-1, 0], [1, 0]];

/* ---------- niveles ---------- */
export function leer(texto) {
  const filas = texto.replace(/\r/g, '').split('\n').filter(f => f.trim().length);
  const h = filas.length, w = Math.max(...filas.map(f => f.length)), muro = [], meta = [], cajas = [];
  let jugador = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = filas[y][x] || ' ', i = y * w + x;
    muro[i] = c === '#'; meta[i] = '.*+'.includes(c);
    if ('$*'.includes(c)) cajas.push(i);
    if ('@+'.includes(c)) jugador = i;
  }
  const L = { w, h, muro, meta, cajas: cajas.sort((a, b) => a - b), jugador };
  // las casillas fuera del recinto (no alcanzables) se tratan como muro: así se dibujan vacías
  const dentro = alcanzable(L, L.jugador, new Set());
  L.fuera = muro.map((m, i) => !m && !dentro.has(i));
  return L;
}
export function escribir(L, cajas = L.cajas, jugador = L.jugador) {
  const cs = new Set(cajas); let s = '';
  for (let y = 0; y < L.h; y++) {
    let f = '';
    for (let x = 0; x < L.w; x++) { const i = y * L.w + x; f += L.muro[i] ? '#' : cs.has(i) ? (L.meta[i] ? '*' : '$') : i === jugador ? (L.meta[i] ? '+' : '@') : L.meta[i] ? '.' : ' '; }
    s += f.replace(/\s+$/, '') + '\n';
  }
  return s;
}
export const resuelto = (L, cajas) => cajas.every(i => L.meta[i]);

/* ---------- movimiento ---------- */
// Devuelve el nuevo estado { cajas, jugador, empuje: índice de la caja empujada o -1 } o null si no se puede
export function mover(L, cajas, jugador, dir) {
  const [dx, dy] = DIRS[dir], x = jugador % L.w, y = (jugador / L.w) | 0, nx = x + dx, ny = y + dy;
  if (nx < 0 || ny < 0 || nx >= L.w || ny >= L.h) return null;
  const n = ny * L.w + nx; if (L.muro[n]) return null;
  const k = cajas.indexOf(n);
  if (k < 0) return { cajas, jugador: n, empuje: -1 };
  const bx = nx + dx, by = ny + dy, b = by * L.w + bx;
  if (bx < 0 || by < 0 || bx >= L.w || by >= L.h || L.muro[b] || cajas.includes(b)) return null;
  const c = cajas.slice(); c[k] = b;
  return { cajas: c, jugador: n, empuje: k };
}
function alcanzable(L, desde, cajas) {
  const vistos = new Set([desde]), cola = [desde];
  while (cola.length) {
    const p = cola.pop(), x = p % L.w, y = (p / L.w) | 0;
    for (const [dx, dy] of D4) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= L.w || ny >= L.h) continue;
      const q = ny * L.w + nx; if (!L.muro[q] && !cajas.has(q) && !vistos.has(q)) { vistos.add(q); cola.push(q); }
    }
  }
  return vistos;
}
// Camino (lista de direcciones) para ir andando hasta una casilla sin empujar nada; null si no se puede
export function camino(L, cajas, desde, hasta) {
  if (desde === hasta) return [];
  const cs = new Set(cajas), prev = new Map([[desde, null]]), cola = [desde];
  for (let k = 0; k < cola.length; k++) {
    const p = cola[k], x = p % L.w, y = (p / L.w) | 0;
    for (const [nombre, [dx, dy]] of Object.entries(DIRS)) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= L.w || ny >= L.h) continue;
      const q = ny * L.w + nx; if (L.muro[q] || cs.has(q) || prev.has(q)) continue;
      prev.set(q, [p, nombre]); if (q === hasta) { const r = []; let c = q; while (prev.get(c)) { r.unshift(prev.get(c)[1]); c = prev.get(c)[0]; } return r; }
      cola.push(q);
    }
  }
  return null;
}

/* ---------- casillas muertas: una caja ahí ya no puede llegar a ninguna meta ---------- */
export function muertas(L) {
  const viva = new Array(L.w * L.h).fill(false), cola = [];
  L.meta.forEach((m, i) => { if (m) { viva[i] = true; cola.push(i); } });
  while (cola.length) {                                 // desde cada meta, «tirando» de la caja hacia atrás
    const p = cola.pop(), x = p % L.w, y = (p / L.w) | 0;
    for (const [dx, dy] of D4) {
      const b = (y + dy) * L.w + (x + dx), j = (y + 2 * dy) * L.w + (x + 2 * dx);
      if (y + 2 * dy < 0 || y + 2 * dy >= L.h || x + 2 * dx < 0 || x + 2 * dx >= L.w) continue;
      if (!L.muro[b] && !L.muro[j] && !viva[b]) { viva[b] = true; cola.push(b); }
    }
  }
  return viva.map(v => !v);
}

/* ---------- resolvedor: búsqueda en anchura por empujes (solución con el menor número de empujes) ---------- */
// Devuelve { empujes: [{ caja: índice de casilla, dir }], pasos: [dirs] } o null. limite: nº de estados a explorar.
export function resolver(L, cajas = L.cajas, jugador = L.jugador, limite = 300000) {
  const muerta = muertas(L), w = L.w;
  if (cajas.some(c => muerta[c] && !L.meta[c])) return null;
  const clave = (cs, j) => { const r = alcanzable(L, j, new Set(cs)); let m = j; for (const q of r) if (q < m) m = q; return cs.join(',') + '|' + m; };
  const ini = cajas.slice().sort((a, b) => a - b), vistos = new Map([[clave(ini, jugador), null]]), cola = [[ini, jugador]];
  for (let k = 0; k < cola.length && vistos.size < limite; k++) {
    const [cs, j] = cola[k], set = new Set(cs), zona = alcanzable(L, j, set), kp = clave(cs, j);
    for (const c of cs) {
      const x = c % w, y = (c / w) | 0;
      for (const [nombre, [dx, dy]] of Object.entries(DIRS)) {
        const desde = (y - dy) * w + (x - dx), a = (y + dy) * w + (x + dx);
        if (!zona.has(desde) || L.muro[a] || set.has(a) || muerta[a]) continue;
        if (y + dy < 0 || y + dy >= L.h || x + dx < 0 || x + dx >= w) continue;
        const nc = cs.map(q => (q === c ? a : q)).sort((p, q) => p - q), kn = clave(nc, c);
        if (vistos.has(kn)) continue;
        vistos.set(kn, { prev: kp, caja: c, dir: nombre, j: desde, estado: [cs, j] });
        if (resuelto(L, nc)) return reconstruir(L, vistos, kn, jugador, cajas);
        cola.push([nc, c]);
      }
    }
  }
  return null;
}
function reconstruir(L, vistos, k, jugador, cajasIni) {
  const empujes = [];
  for (let n = vistos.get(k); n; n = vistos.get(n.prev)) empujes.unshift(n);
  // pasos completos: caminar hasta detrás de la caja y empujar
  let cs = cajasIni.slice(), j = jugador; const pasos = [];
  for (const e of empujes) {
    const ida = camino(L, cs, j, e.j); if (!ida) return null;
    pasos.push(...ida); j = e.j;
    const r = mover(L, cs, j, e.dir); cs = r.cajas; j = r.jugador; pasos.push(e.dir);
  }
  return { empujes: empujes.map(e => ({ caja: e.caja, dir: e.dir })), pasos };
}

/* ---------- generador (jugando «al revés»: tirando de las cajas desde las metas) ---------- */
// intentos fijos (no por tiempo) para que la misma semilla dé siempre el mismo nivel en cualquier dispositivo (reto del día)
export const TAMANOS = { pequeno: { nombre: 'Pequeño', w: 7, h: 7, cajas: 2, intentos: 70 }, mediano: { nombre: 'Mediano', w: 8, h: 8, cajas: 3, intentos: 70 }, grande: { nombre: 'Grande', w: 9, h: 9, cajas: 4, intentos: 45 } };
export function generar(tam = 'mediano', semilla = Math.random() * 1e9, intentos = 0) {
  const T = { ...(TAMANOS[tam] || TAMANOS.mediano), ...(intentos ? { intentos } : {}) }, rnd = mulberry32(typeof semilla === 'string' ? hashTexto(semilla) : semilla >>> 0);
  const r = n => Math.floor(rnd() * n);
  let mejor = null;
  for (let intento = 0; intento < T.intentos; intento++) {
    const L = sala(T.w, T.h, r); if (!L) continue;
    const suelo = L.muro.map((m, i) => (m ? -1 : i)).filter(i => i >= 0);
    if (suelo.length < T.cajas * 4 + 6) continue;
    const muerta = muertas({ ...L, meta: L.muro.map(() => true) });
    const libres = suelo.filter(i => vecinosLibres(L, i) >= 2 && !muerta[i]);
    const metas = []; while (metas.length < T.cajas && libres.length) metas.push(libres.splice(r(libres.length), 1)[0]);
    if (metas.length < T.cajas) continue;
    L.meta = L.muro.map(() => false); metas.forEach(i => { L.meta[i] = true; });
    let cajas = metas.slice(), opciones = suelo.filter(i => !cajas.includes(i)), j = opciones[r(opciones.length)];
    // tirones al azar: el jugador se coloca junto a una caja y retrocede arrastrándola
    for (let k = 0; k < 60 + T.cajas * 40; k++) {
      const zona = alcanzable(L, j, new Set(cajas)), ops = [];
      cajas.forEach((c, ci) => { const x = c % L.w, y = (c / L.w) | 0; for (const [dx, dy] of D4) {
        const p = (y + dy) * L.w + x + dx, q = (y + 2 * dy) * L.w + x + 2 * dx;
        if (zona.has(p) && !L.muro[q] && !cajas.includes(q) && y + 2 * dy >= 0 && y + 2 * dy < L.h && x + 2 * dx >= 0 && x + 2 * dx < L.w) ops.push([ci, p, q]); } });
      if (!ops.length) break;
      const [ci, p, q] = ops[r(ops.length)]; cajas = cajas.slice(); cajas[ci] = p; j = q;
    }
    if (cajas.some(c => L.meta[c])) continue;                     // todas las cajas fuera de su meta al empezar
    L.cajas = cajas.sort((a, b) => a - b); L.jugador = j;
    const sol = resolver(L, L.cajas, L.jugador, 25000);
    if (!sol) continue;
    const giros = sol.empujes.filter((e, i, a) => i && (a[i - 1].caja !== e.caja - (DIRS[a[i - 1].dir][0] + DIRS[a[i - 1].dir][1] * L.w) || a[i - 1].dir !== e.dir)).length;
    const nota = sol.empujes.length + giros * 2;                 // más empujes y más cambios de caja o dirección = más difícil
    if (!mejor || nota > mejor.nota) mejor = { texto: recortar(escribir(L)), nota, empujes: sol.empujes.length };
  }
  return mejor;
}
// Quita las filas y columnas sobrantes de muro (deja un muro de borde alrededor del recinto)
export function recortar(t) {
  const f = t.split('\n').filter(x => x.length).map(x => x.padEnd(30));
  let y0 = 99, y1 = -1, x0 = 99, x1 = -1;
  f.forEach((fila, y) => [...fila].forEach((c, x) => { if (c !== '#' && c !== ' ' || (c === ' ' && dentroDe(f, y, x))) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); } }));
  if (y1 < 0) return t;
  return f.slice(y0 - 1, y1 + 2).map(fila => fila.slice(x0 - 1, x1 + 2).replace(/\s+$/, '')).join('\n') + '\n';
}
const dentroDe = (f, y, x) => /[#]/.test(f[y].slice(0, x)) && /[#]/.test(f[y].slice(x + 1));
const vecinosLibres = (L, i) => D4.reduce((n, [dx, dy]) => { const x = i % L.w + dx, y = ((i / L.w) | 0) + dy; return n + (x >= 0 && y >= 0 && x < L.w && y < L.h && !L.muro[y * L.w + x] ? 1 : 0); }, 0);
// Sala al azar: se excavan bloques de 2×2 y 3×1 desde el centro hasta tener ~55 % de suelo, todo conectado
function sala(w, h, r) {
  const muro = new Array(w * h).fill(true), interior = (x, y) => x > 0 && y > 0 && x < w - 1 && y < h - 1;
  let x = (w / 2) | 0, y = (h / 2) | 0, abiertos = 0;
  const abrir = (a, b) => { if (interior(a, b) && muro[b * w + a]) { muro[b * w + a] = false; abiertos++; } };
  const objetivo = Math.round((w - 2) * (h - 2) * (.5 + r(12) / 100));
  for (let k = 0; k < 400 && abiertos < objetivo; k++) {
    const forma = r(3);
    if (forma === 0) { abrir(x, y); abrir(x + 1, y); abrir(x, y + 1); abrir(x + 1, y + 1); }
    else if (forma === 1) { abrir(x - 1, y); abrir(x, y); abrir(x + 1, y); }
    else { abrir(x, y - 1); abrir(x, y); abrir(x, y + 1); }
    const [dx, dy] = D4[r(4)]; x = Math.max(1, Math.min(w - 2, x + dx * (1 + r(2)))); y = Math.max(1, Math.min(h - 2, y + dy * (1 + r(2))));
  }
  return { w, h, muro, meta: [], cajas: [], jugador: -1 };
}

/* ---------- validación de una partida guardada ---------- */
export function validarEstado(L, d) {
  const N = L.w * L.h, ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  if (!d || !Array.isArray(d.cajas) || d.cajas.length !== L.cajas.length || !ent(d.jugador, 0, N - 1)) return null;
  if (!d.cajas.every(c => ent(c, 0, N - 1) && !L.muro[c]) || new Set(d.cajas).size !== d.cajas.length || L.muro[d.jugador] || d.cajas.includes(d.jugador)) return null;
  return { cajas: d.cajas.slice(), jugador: d.jugador };
}
