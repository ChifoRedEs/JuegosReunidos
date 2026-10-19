// Física del Minigolf (sin DOM, probable con Node). La bola rueda por el césped con rozamiento, rebota en bordes,
// muros, topes y aspas del molino, se frena en la arena, cae al agua (+1 golpe) y entra en el hoyo si llega despacio.
import { HOYOS } from './hoyos.js';
export const RB = 8, RH = 11;                                // radio de la bola y del hoyo
const ROCE = 210, ROCE_ARENA = 950, REBOTE = .78, V_MAX = 1050, V_PARADA = 7, V_ENTRA = 230;

export function dentro(p, [x, y]) {                          // punto en polígono (par/impar)
  let s = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) s = !s; }
  return s;
}
const segmentos = p => p.map((a, i) => [a, p[(i + 1) % p.length]]);
// Molino: aspas como segmentos que giran con el tiempo
export function aspas(m, t) { const out = []; for (let k = 0; k < m.aspas; k++) { const a = t * m.w * Math.PI * 2 + k * Math.PI * 2 / m.aspas; out.push([[m.x, m.y], [m.x + Math.cos(a) * m.l, m.y + Math.sin(a) * m.l]]); } return out; }

export function preparar(h) { return { ...h, segs: [...segmentos(h.borde), ...(h.muros || []).flatMap(segmentos)] }; }

function chocarSegmento(b, [a, c], vSeg = null) {
  const dx = c[0] - a[0], dy = c[1] - a[1], L2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((b.x - a[0]) * dx + (b.y - a[1]) * dy) / L2)), px = a[0] + t * dx, py = a[1] + t * dy;
  const ex = b.x - px, ey = b.y - py, d = Math.hypot(ex, ey);
  if (d >= RB || d === 0) return false;
  const nx = ex / d, ny = ey / d; b.x = px + nx * RB; b.y = py + ny * RB;
  const vx = b.vx - (vSeg ? vSeg[0] * t : 0), vy = b.vy - (vSeg ? vSeg[1] * t : 0), vn = vx * nx + vy * ny;
  if (vn < 0) { b.vx -= (1 + REBOTE) * vn * nx; b.vy -= (1 + REBOTE) * vn * ny; }
  if (vSeg) { b.vx += vSeg[0] * t * .6; b.vy += vSeg[1] * t * .6; }
  return true;
}
// Avanza dt segundos. Devuelve eventos: 'rebote', 'tope', 'arena', 'agua', 'dentro', 'parada', 'labio'
export function avanzar(H, b, dt, t0) {
  const ev = new Set(), pasos = Math.max(1, Math.ceil(dt / (1 / 400))), h = dt / pasos;
  for (let k = 0; k < pasos; k++) {
    const t = t0 + k * h, v = Math.hypot(b.vx, b.vy);
    if (v === 0) break;
    const enArena = (H.arena || []).some(p => dentro(p, [b.x, b.y]));
    if (enArena) ev.add('arena');
    const f = Math.min(v, (enArena ? ROCE_ARENA : ROCE) * h); b.vx -= b.vx / v * f; b.vy -= b.vy / v * f;
    for (const r of H.rampas || []) if (dentro(r.p, [b.x, b.y])) { b.vx += r.ax * h; b.vy += r.ay * h; }
    b.x += b.vx * h; b.y += b.vy * h;
    for (const s of H.segs) if (chocarSegmento(b, s)) ev.add('rebote');
    for (const m of H.molinos || []) {
      const giro = m.w * Math.PI * 2;
      for (const s of aspas(m, t)) { const ang = Math.atan2(s[1][1] - m.y, s[1][0] - m.x), vt = [-Math.sin(ang) * giro * m.l, Math.cos(ang) * giro * m.l]; if (chocarSegmento(b, s, vt)) ev.add('rebote'); }
    }
    for (const c of H.topes || []) {
      const dx = b.x - c.x, dy = b.y - c.y, d = Math.hypot(dx, dy);
      if (d < c.r + RB && d > 0) { const nx = dx / d, ny = dy / d; b.x = c.x + nx * (c.r + RB); b.y = c.y + ny * (c.r + RB); const vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= 2.15 * vn * nx; b.vy -= 2.15 * vn * ny; } ev.add('tope'); }
    }
    const sp = Math.hypot(b.vx, b.vy); if (sp > V_MAX) { b.vx *= V_MAX / sp; b.vy *= V_MAX / sp; }
    if ((H.agua || []).some(p => dentro(p, [b.x, b.y]))) { b.vx = b.vy = 0; ev.add('agua'); return ev; }
    // hoyo: entra si pasa por encima despacio; si va rápida, el borde la desvía un poco («labio»)
    const hx = b.x - H.hoyo[0], hy = b.y - H.hoyo[1], dh = Math.hypot(hx, hy);
    if (dh < RH) {
      if (Math.hypot(b.vx, b.vy) < V_ENTRA) { b.x = H.hoyo[0]; b.y = H.hoyo[1]; b.vx = b.vy = 0; ev.add('dentro'); return ev; }
      if (dh > RH * .4) { const g = 900 * h; b.vx -= hx / dh * g; b.vy -= hy / dh * g; ev.add('labio'); }
    }
    if (Math.hypot(b.vx, b.vy) < V_PARADA && !(H.rampas || []).some(r => dentro(r.p, [b.x, b.y]))) { b.vx = b.vy = 0; ev.add('parada'); return ev; }
  }
  return ev;
}
// Golpe: dirección (en radianes) y fuerza 0..1
export function golpear(b, angulo, fuerza) { const v = Math.max(0, Math.min(1, fuerza)) * V_MAX; b.vx = Math.cos(angulo) * v; b.vy = Math.sin(angulo) * v; }
// Simula un golpe completo (para las pruebas y la ayuda): devuelve la bola final y si ha entrado o caído al agua
export function simular(H, b0, angulo, fuerza, t0 = 0) {
  const b = { ...b0 }; golpear(b, angulo, fuerza); let t = t0;
  for (let k = 0; k < 2400; k++) { const ev = avanzar(H, b, 1 / 60, t); t += 1 / 60; if (ev.has('dentro')) return { b, dentro: true, t }; if (ev.has('agua')) return { b: { ...b0 }, agua: true, t }; if (ev.has('parada')) return { b, t }; }
  b.vx = b.vy = 0; return { b, t };
}
export const golpesMax = h => h.par + 4;

// ---------- partida ----------
// Juegan de 1 a 4 personas por turnos: cada una completa el hoyo y luego juega la siguiente
export function crear(nombres) {
  return { nombres: nombres.slice(0, 4), hoyo: 0, jugador: 0, tarjeta: nombres.map(() => HOYOS.map(() => null)), golpes: 0, bola: bolaSalida(0), anterior: null, t: 0, fase: 'apuntar' };
}
export const bolaSalida = i => ({ x: HOYOS[i].salida[0], y: HOYOS[i].salida[1], vx: 0, vy: 0 });
export const total = (S, j) => S.tarjeta[j].reduce((a, v) => a + (v || 0), 0);
export const parHasta = (S, j) => S.tarjeta[j].reduce((a, v, i) => a + (v != null ? HOYOS[i].par : 0), 0);
// Termina el hoyo del jugador actual y pasa al siguiente (jugador u hoyo). Devuelve true si se acaba la partida.
export function apuntar(S, golpes) {
  S.tarjeta[S.jugador][S.hoyo] = golpes;
  if (S.jugador < S.nombres.length - 1) S.jugador++;
  else { S.jugador = 0; S.hoyo++; }
  if (S.hoyo >= HOYOS.length) { S.fase = 'fin'; return true; }
  S.golpes = 0; S.bola = bolaSalida(S.hoyo); S.anterior = null; S.fase = 'apuntar';
  return false;
}
export function validar(d) {
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, num = (v, a, b) => Number.isFinite(v) && v >= a && v <= b;
  if (!d || !Array.isArray(d.nombres) || d.nombres.length < 1 || d.nombres.length > 4 || !d.nombres.every(n => typeof n === 'string')) return null;
  if (!ent(d.hoyo, 0, HOYOS.length) || !ent(d.jugador, 0, d.nombres.length - 1) || !['apuntar', 'rodando', 'fin'].includes(d.fase)) return null;
  if (!Array.isArray(d.tarjeta) || d.tarjeta.length !== d.nombres.length || !d.tarjeta.every(f => Array.isArray(f) && f.length === HOYOS.length && f.every((v, i) => v === null || ent(v, 1, golpesMax(HOYOS[i]))))) return null;
  const bola = d.bola && num(d.bola.x, 0, 400) && num(d.bola.y, 0, 700) ? { x: d.bola.x, y: d.bola.y, vx: 0, vy: 0 } : null;
  if (d.fase !== 'fin' && (!bola || !dentro(HOYOS[d.hoyo].borde, [bola.x, bola.y]))) return null;
  return { nombres: d.nombres.map(n => n.slice(0, 14)), hoyo: d.hoyo, jugador: d.jugador, tarjeta: d.tarjeta.map(f => f.slice()), golpes: ent(d.golpes, 0, 20) ? d.golpes : 0,
    bola: bola || bolaSalida(0), anterior: null, t: num(d.t, 0, 1e7) ? d.t : 0, fase: d.fase === 'rodando' ? 'apuntar' : d.fase };
}
