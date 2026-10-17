// Motor de Bloques (el clásico de piezas que caen). Sin DOM, probable con Node.
// Tablero de 10 columnas × 22 filas (las 2 de arriba están ocultas). Celda = 0 vacía o 1..7 (tipo de pieza).
// Giros con el sistema SRS y sus «empujones» (wall kicks), bolsa de 7 piezas, reserva, pieza fantasma y tiempo de gracia.
export const W = 10, H = 22, VISIBLES = 20;
export const MODOS = { maraton: 'Maratón', sprint: 'Sprint 40 líneas', ultra: 'Ultra 2 minutos', excavar: 'Excavar 10 filas' };
export const BASURA = 8;                                       // celda de basura (modo Excavar)
export const FILAS_BASURA = 10;
export const porTiempo = modo => modo === 'sprint' || modo === 'excavar';   // modos en los que gana el menor tiempo
// Forma de cada pieza en su estado 0 (celdas [x, y] dentro de su caja)
const FORMAS = {
  1: { n: 4, c: [[0, 1], [1, 1], [2, 1], [3, 1]] }, 2: { n: 2, c: [[0, 0], [1, 0], [0, 1], [1, 1]] }, 3: { n: 3, c: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  4: { n: 3, c: [[1, 0], [2, 0], [0, 1], [1, 1]] }, 5: { n: 3, c: [[0, 0], [1, 0], [1, 1], [2, 1]] }, 6: { n: 3, c: [[0, 0], [0, 1], [1, 1], [2, 1]] }, 7: { n: 3, c: [[2, 0], [0, 1], [1, 1], [2, 1]] },
};
const giro = (n, [x, y], r) => { for (let k = 0; k < r; k++) [x, y] = [n - 1 - y, x]; return [x, y]; };
export const celdas = (t, r) => FORMAS[t].c.map(p => giro(FORMAS[t].n, p, r));
// Tablas de empujones SRS (y hacia arriba = negativo aquí, porque la fila 0 está arriba)
const K_JLSTZ = { '0>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], '1>0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], '1>2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], '2>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '2>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], '3>2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], '3>0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], '0>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]] };
const K_I = { '0>1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]], '1>0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]], '1>2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]], '2>1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]], '3>2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]], '3>0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]], '0>3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]] };
export const PUNTOS_LINEAS = [0, 100, 300, 500, 800];
export const NOMBRE_LINEAS = ['', 'Sencilla', 'Doble', 'Triple', '¡CUÁDRUPLE!'];
const GRACIA = 500, MAX_RESETS = 15, SPRINT = 40, ULTRA_MS = 120000;

/* ---------- partida ---------- */
export function crear({ modo = 'maraton', nivel = 1 } = {}) {
  const S = { modo: MODOS[modo] ? modo : 'maraton', tab: new Array(W * H).fill(0), bolsa: [], cola: [], p: null, reserva: 0, puedeReservar: true,
    nivel: Math.max(1, Math.min(15, nivel | 0)), nivelIni: Math.max(1, Math.min(15, nivel | 0)), lineas: 0, puntos: 0, combo: -1, b2b: false, piezas: 0,
    tiempo: 0, caida: 0, gracia: 0, resets: 0, fase: 'jugar', motivo: '', ultimo: null };
  if (S.modo === 'excavar') ponerBasura(S, FILAS_BASURA);
  rellenarCola(S); sacarPieza(S); return S;
}
// Modo Excavar: filas grises abajo, cada una con un hueco (nunca en la misma columna que la de debajo)
function ponerBasura(S, n) {
  let ant = -1;
  for (let k = 0; k < n; k++) {
    let h; do h = Math.floor(Math.random() * W); while (h === ant);
    ant = h; const y = H - 1 - k;
    for (let x = 0; x < W; x++) S.tab[y * W + x] = x === h ? 0 : BASURA;
  }
}
export const basuraRestante = S => { let n = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (S.tab[y * W + x] === BASURA) { n++; break; } return n; };
function rellenarCola(S) { while (S.cola.length < 5) { if (!S.bolsa.length) { S.bolsa = [1, 2, 3, 4, 5, 6, 7]; for (let i = 6; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [S.bolsa[i], S.bolsa[j]] = [S.bolsa[j], S.bolsa[i]]; } } S.cola.push(S.bolsa.shift()); } }
function nuevaPieza(t) { const n = FORMAS[t].n; return { t, r: 0, x: Math.floor((W - n) / 2), y: t === 1 ? 1 : 2 }; }   // aparece ya en la primera fila visible
function sacarPieza(S, t = null) {
  if (t == null) { t = S.cola.shift(); rellenarCola(S); }
  S.p = nuevaPieza(t); S.caida = 0; S.gracia = 0; S.resets = 0;
  if (choca(S, S.p)) { S.fase = 'fin'; S.motivo = 'arriba'; return false; }
  return true;
}
export function choca(S, p, dx = 0, dy = 0, r = p.r) {
  for (const [cx, cy] of celdas(p.t, r)) { const x = p.x + cx + dx, y = p.y + cy + dy; if (x < 0 || x >= W || y >= H || (y >= 0 && S.tab[y * W + x])) return true; }
  return false;
}
const enSuelo = S => choca(S, S.p, 0, 1);
function tocarGracia(S) { if (enSuelo(S) && S.resets < MAX_RESETS) { S.gracia = 0; S.resets++; } }   // mover o girar en el suelo reinicia el tiempo de gracia (con límite)
export function mover(S, dx) { if (S.fase !== 'jugar' || choca(S, S.p, dx, 0)) return false; S.p.x += dx; tocarGracia(S); S.ultimo = null; return true; }
export function rotar(S, sentido = 1) {
  if (S.fase !== 'jugar' || S.p.t === 2) return false;
  const de = S.p.r, a = (de + (sentido > 0 ? 1 : 3)) % 4, tabla = S.p.t === 1 ? K_I : K_JLSTZ;
  for (const [kx, ky] of tabla[`${de}>${a}`]) if (!choca(S, S.p, kx, -ky, a)) { S.p.x += kx; S.p.y -= ky; S.p.r = a; tocarGracia(S); S.ultimo = 'giro'; return true; }
  return false;
}
export function bajar(S) {                                    // bajada suave de una fila (1 punto)
  if (S.fase !== 'jugar' || choca(S, S.p, 0, 1)) return false;
  S.p.y++; S.puntos++; S.caida = 0; return true;
}
export function soltar(S) {                                   // caída instantánea (2 puntos por fila) y se fija
  if (S.fase !== 'jugar') return null;
  let n = 0; while (!choca(S, S.p, 0, 1)) { S.p.y++; n++; }
  S.puntos += 2 * n; return fijar(S);
}
export function reservar(S) {
  if (S.fase !== 'jugar' || !S.puedeReservar) return false;
  const t = S.p.t; S.puedeReservar = false;
  if (S.reserva) { const r = S.reserva; S.reserva = t; sacarPieza(S, r); } else { S.reserva = t; sacarPieza(S); }
  return true;
}
export const fantasma = S => { let d = 0; while (!choca(S, S.p, 0, d + 1)) d++; return S.p.y + d; };
// Fija la pieza, borra líneas y saca la siguiente. Devuelve { lineas, filas, nombre, puntos, tspin }
function fijar(S) {
  const p = S.p; let fuera = true;
  for (const [cx, cy] of celdas(p.t, p.r)) { const x = p.x + cx, y = p.y + cy; if (y >= 0) S.tab[y * W + x] = p.t; if (y >= H - VISIBLES) fuera = false; }
  S.piezas++;
  const tspin = p.t === 3 && S.ultimo === 'giro' && [[0, 0], [2, 0], [0, 2], [2, 2]].filter(([a, b]) => { const x = p.x + a, y = p.y + b; return x < 0 || x >= W || y >= H || S.tab[y * W + x]; }).length >= 3;
  const filas = [];
  for (let y = 0; y < H; y++) { let llena = true; for (let x = 0; x < W; x++) if (!S.tab[y * W + x]) { llena = false; break; } if (llena) filas.push(y); }
  for (const y of filas) { S.tab.splice(y * W, W); S.tab.unshift(...new Array(W).fill(0)); }
  const n = filas.length; let pts = 0, seguido = false;
  if (n) {
    S.combo++;
    const dificil = n === 4 || tspin;
    pts = (tspin ? [400, 800, 1200, 1600][n] : PUNTOS_LINEAS[n]) * S.nivel;
    seguido = dificil && S.b2b;                                // cuádruple (o T-giro) justo después de otro
    if (seguido) pts = Math.floor(pts * 1.5);
    pts += 50 * S.combo * S.nivel; S.b2b = dificil;
    S.lineas += n;
    if (!porTiempo(S.modo)) S.nivel = Math.max(S.nivelIni, Math.min(20, S.nivelIni + Math.floor(S.lineas / 10)));
  } else { S.combo = -1; if (tspin) pts = 400 * S.nivel; }
  S.puntos += pts;
  const ev = { lineas: n, filas, nombre: (tspin ? 'T-giro ' : '') + (n ? NOMBRE_LINEAS[n] : ''), puntos: pts, combo: S.combo, b2b: seguido };
  S.puedeReservar = true; S.ultimo = null;
  if (S.modo === 'sprint' && S.lineas >= SPRINT) { S.fase = 'fin'; S.motivo = 'meta'; return ev; }
  if (S.modo === 'excavar' && n && !basuraRestante(S)) { S.fase = 'fin'; S.motivo = 'meta'; return ev; }
  if (fuera) { S.fase = 'fin'; S.motivo = 'arriba'; return ev; }
  sacarPieza(S);
  return ev;
}
// Segundos por fila según el nivel (curva estándar)
export const gravedad = nivel => Math.pow(0.8 - (Math.min(nivel, 20) - 1) * 0.007, Math.min(nivel, 20) - 1) * 1000;
// Avanza el tiempo dt (ms): gravedad, tiempo de gracia en el suelo y reloj del modo. Devuelve el evento de fijar si lo hay.
export function avanzar(S, dt, bajando = false) {
  if (S.fase !== 'jugar') return null;
  S.tiempo += dt;
  if (S.modo === 'ultra' && S.tiempo >= ULTRA_MS) { S.tiempo = ULTRA_MS; S.fase = 'fin'; S.motivo = 'tiempo'; return null; }
  if (enSuelo(S)) {
    S.gracia += dt;
    if (S.gracia >= GRACIA || S.resets >= MAX_RESETS && S.gracia >= 60) return fijar(S);
    return null;
  }
  S.gracia = 0;
  const g = bajando ? Math.min(gravedad(S.nivel), 50) : gravedad(S.nivel);
  S.caida += dt;
  while (S.caida >= g && !enSuelo(S)) { S.caida -= g; S.p.y++; if (bajando) S.puntos++; S.ultimo = null; }
  return null;
}
export const restante = S => (S.modo === 'ultra' ? Math.max(0, ULTRA_MS - S.tiempo) : null);
export const META_SPRINT = SPRINT;
export const variante = S => MODOS[S.modo];

export function validar(d) {
  if (!d || typeof d !== 'object' || !MODOS[d.modo] || !Array.isArray(d.tab) || d.tab.length !== W * H || !d.tab.every(v => Number.isInteger(v) && v >= 0 && v <= BASURA)) return null;
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, pz = v => ent(v, 1, 7);
  if (!d.p || !pz(d.p.t) || !ent(d.p.r, 0, 3) || !ent(d.p.x, -3, W) || !ent(d.p.y, -3, H) || !Array.isArray(d.cola) || d.cola.length < 3 || !d.cola.every(pz) || !Array.isArray(d.bolsa) || !d.bolsa.every(pz)) return null;
  if (!(d.reserva === 0 || pz(d.reserva)) || !ent(d.nivel, 1, 20) || !ent(d.nivelIni, 1, 15) || !ent(d.lineas, 0, 1e6) || !ent(d.puntos, 0, 1e9) || !ent(d.piezas, 0, 1e7) || !Number.isFinite(d.tiempo) || d.tiempo < 0) return null;
  if (!['jugar', 'pausa', 'fin'].includes(d.fase)) return null;
  const S = { modo: d.modo, tab: d.tab.slice(), bolsa: d.bolsa.slice(), cola: d.cola.slice(0, 6), p: { t: d.p.t, r: d.p.r, x: d.p.x, y: d.p.y }, reserva: d.reserva, puedeReservar: !!d.puedeReservar,
    nivel: d.nivel, nivelIni: d.nivelIni, lineas: d.lineas, puntos: d.puntos, combo: ent(d.combo, -1, 999) ? d.combo : -1, b2b: !!d.b2b, piezas: d.piezas, tiempo: Math.min(d.tiempo, 1e8),
    caida: 0, gracia: 0, resets: 0, fase: d.fase === 'jugar' ? 'pausa' : d.fase, motivo: typeof d.motivo === 'string' ? d.motivo.slice(0, 10) : '', ultimo: null };
  if (S.fase !== 'fin' && choca(S, S.p)) return null;
  return S;
}
