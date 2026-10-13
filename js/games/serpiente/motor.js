// Motor de la Serpiente (sin DOM, probable con Node). Tablero n×n, casilla i = fila * n + columna.
// Direcciones: 0 arriba, 1 derecha, 2 abajo, 3 izquierda. La serpiente avanza una casilla por «paso».
export const MODOS = { clasico: 'Clásico', libre: 'Sin paredes', laberinto: 'Laberinto' };
export const VELOCIDADES = { lenta: { nombre: 'Lenta', ms: 175, mult: 1 }, normal: { nombre: 'Normal', ms: 125, mult: 2 }, rapida: { nombre: 'Rápida', ms: 88, mult: 3 } };
export const TAMANOS = { pequeno: { nombre: 'Pequeño', n: 14 }, normal: { nombre: 'Normal', n: 18 }, grande: { nombre: 'Grande', n: 24 } };
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
export const opuesta = (a, b) => (a + 2) % 4 === b;
const ESTRELLA_PASOS = 45;                                   // la estrella dorada desaparece tras estos pasos

export function muros(n, modo) {
  if (modo !== 'laberinto') return [];
  const m = new Set(), a = Math.round(n / 4), b = n - 1 - a, medio = Math.floor(n / 2);
  for (let c = a; c <= b; c++) { if (Math.abs(c - medio) <= 1) continue; m.add(a * n + c); m.add(b * n + c); }      // dos barras horizontales con hueco en el centro
  for (let f = a + 2; f <= b - 2; f++) { if (Math.abs(f - medio) <= 1) continue; m.add(f * n + 1); m.add(f * n + n - 2); }   // dos barras verticales junto a los lados
  return [...m];
}
export function crear({ modo = 'clasico', vel = 'normal', tam = 'normal' } = {}) {
  const n = (TAMANOS[tam] || TAMANOS.normal).n, f = Math.floor(n / 2), c = Math.floor(n / 2) - 1;
  const S = { modo: MODOS[modo] ? modo : 'clasico', vel: VELOCIDADES[vel] ? vel : 'normal', tam: TAMANOS[tam] ? tam : 'normal', n,
    serp: [f * n + c, f * n + c - 1, f * n + c - 2], dir: 1, crecer: 0, comida: -1, estrella: null, muros: muros(n, modo), puntos: 0, comidas: 0, pasos: 0, fase: 'jugar', motivo: '' };
  S.comida = libre(S); return S;
}
// Casilla libre al azar (sin serpiente, muros ni comida). -1 si el tablero está lleno.
export function libre(S, evitar = []) {
  const ocup = new Set([...S.serp, ...S.muros, S.comida, ...(S.estrella ? [S.estrella.i] : []), ...evitar]), libres = [];
  for (let i = 0; i < S.n * S.n; i++) if (!ocup.has(i)) libres.push(i);
  return libres.length ? libres[Math.floor(Math.random() * libres.length)] : -1;
}
// Milisegundos entre pasos: empieza según la velocidad y se acelera al comer (hasta un mínimo)
export const intervalo = S => Math.max(52, VELOCIDADES[S.vel].ms - Math.min(S.comidas * 1.6, 60));
// Un paso del juego. Devuelve el evento: 'mover' | 'comer' | 'estrella' | 'muerte' | 'lleno'
export function paso(S, dir = S.dir) {
  if (S.fase !== 'jugar') return null;
  if (dir !== S.dir && !opuesta(S.dir, dir)) S.dir = dir;
  const n = S.n, cab = S.serp[0], x = cab % n, y = Math.floor(cab / n);
  let nx = x + DX[S.dir], ny = y + DY[S.dir];
  if (nx < 0 || ny < 0 || nx >= n || ny >= n) {
    if (S.modo === 'libre') { nx = (nx + n) % n; ny = (ny + n) % n; }
    else return morir(S, 'pared');
  }
  const ni = ny * n + nx, cola = S.serp[S.serp.length - 1];
  if (S.muros.includes(ni)) return morir(S, 'muro');
  if (S.serp.includes(ni) && !(ni === cola && S.crecer === 0)) return morir(S, 'cuerpo');
  S.serp.unshift(ni); S.pasos++;
  let ev = 'mover';
  if (ni === S.comida) {
    S.crecer += 1; S.comidas++; S.puntos += 10 * VELOCIDADES[S.vel].mult; ev = 'comer';
    S.comida = libre(S);
    if (S.comidas % 7 === 0 && !S.estrella) { const e = libre(S); if (e >= 0) S.estrella = { i: e, t: ESTRELLA_PASOS }; }
  } else if (S.estrella && ni === S.estrella.i) {
    S.crecer += 2; S.puntos += 50 * VELOCIDADES[S.vel].mult; S.estrella = null; ev = 'estrella';
  }
  if (S.crecer > 0) S.crecer--; else S.serp.pop();
  if (S.estrella && --S.estrella.t <= 0) S.estrella = null;
  if (S.comida < 0) { S.fase = 'fin'; S.motivo = 'lleno'; return 'lleno'; }
  return ev;
}
function morir(S, motivo) { S.fase = 'fin'; S.motivo = motivo; return 'muerte'; }
export const variante = S => `${MODOS[S.modo]} · ${VELOCIDADES[S.vel].nombre}`;

export function validar(d) {
  if (!d || typeof d !== 'object' || !MODOS[d.modo] || !VELOCIDADES[d.vel] || !TAMANOS[d.tam] || d.n !== TAMANOS[d.tam].n) return null;
  const n = d.n, ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, celda = v => ent(v, 0, n * n - 1);
  if (!Array.isArray(d.serp) || d.serp.length < 2 || !d.serp.every(celda) || new Set(d.serp).size !== d.serp.length) return null;
  for (let k = 1; k < d.serp.length; k++) {                    // cada trozo debe tocar al anterior (o al otro lado, sin paredes)
    const a = d.serp[k - 1], b = d.serp[k], dx = Math.abs(a % n - b % n), dy = Math.abs(Math.floor(a / n) - Math.floor(b / n));
    const ok = (dx + dy === 1) || (d.modo === 'libre' && ((dx === n - 1 && dy === 0) || (dy === n - 1 && dx === 0)));
    if (!ok) return null;
  }
  const mu = muros(n, d.modo);
  if (d.serp.some(i => mu.includes(i)) || !ent(d.dir, 0, 3) || !ent(d.crecer, 0, 50) || !(d.comida === -1 || celda(d.comida)) || !ent(d.puntos, 0, 1e7) || !ent(d.comidas, 0, 1e5) || !ent(d.pasos, 0, 1e8)) return null;
  if (!['jugar', 'pausa', 'fin'].includes(d.fase)) return null;
  const estrella = d.estrella && celda(d.estrella.i) && ent(d.estrella.t, 1, ESTRELLA_PASOS) ? { i: d.estrella.i, t: d.estrella.t } : null;
  return { modo: d.modo, vel: d.vel, tam: d.tam, n, serp: d.serp.slice(), dir: d.dir, crecer: d.crecer, comida: d.comida, estrella, muros: mu, puntos: d.puntos, comidas: d.comidas, pasos: d.pasos,
    fase: d.fase === 'jugar' ? 'pausa' : d.fase, motivo: typeof d.motivo === 'string' ? d.motivo.slice(0, 10) : '' };   // al volver, siempre en pausa
}
