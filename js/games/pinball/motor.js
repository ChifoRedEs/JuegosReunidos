// Motor de Pinball (sin DOM). Mesa de 572×1024 unidades; y crece hacia abajo. Física de bola (círculo) contra segmentos, círculos y aletas giratorias.
export const W = 572, H = 1024, R = 12, DT = 1 / 240;
export const G = 1350, FRICCION = 0.12, VMAX = 2100;
export const BOLAS = { 3: '3 bolas', 5: '5 bolas' };
export const LANZA = { x: 523, y: 936 };

const mir = (x) => 540 - x;                       // simetría respecto al eje de las aletas (x = 270)
const arco = (cx, cy, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
// pared izquierda del campo (con el «talle» de la mesa); la derecha es su reflejo y forma parte del separador del carril de lanzamiento
const IZQ = [[41, 285], [41, 340], [70, 385], [112, 420], [118, 450], [95, 520], [62, 590], [42, 650], [42, 815]];
const poli = pts => pts.slice(1).map((p, i) => [pts[i][0], pts[i][1], p[0], p[1]]);

export function crearMesa() {
  const seg = [];                                                     // [x1,y1,x2,y2,restitución]
  const add = (pts, e = 0.45) => poli(pts).forEach(s => seg.push([...s, e]));
  add(arco(295, 285, 254, Math.PI, 2 * Math.PI, 56), 0.35);           // arco superior (también guía la bola del carril hacia el campo)
  add(IZQ); add([[42, 815], [162, 866]]);                              // pared izquierda y rampa hacia el desagüe
  const der = IZQ.map(([x, y]) => [mir(x), y]); der.push([498, 955]);
  add([[445, 135], [472, 160], [492, 205], [499, 260], ...der]);       // separador del carril + pared derecha
  add([[498, 815], [378, 866]]);                                       // rampa derecha
  seg.push([445, 70, 445, 135, 0.3, null, 'puerta']);                  // puerta de una vía: deja salir la bola del carril pero no volver
  add([[498, 955], [549, 955]], 0.1);                                  // muelle del lanzador (suelo del carril)
  add([[549, 955], [549, 285]]);                                       // pared exterior del carril
  const resorte = [];
  // «gomas» (tirachinas): triángulo; la arista activa (índice 0) impulsa la bola
  const goma = (p) => ({ pts: p, kick: 520, pts100: 10 });
  const tiras = [goma([[110, 680], [160, 790], [108, 772]]), goma([[mir(110), 680], [mir(160), 790], [mir(108), 772]])];
  tiras.forEach(t => { for (let i = 0; i < 3; i++) { const a = t.pts[i], b = t.pts[(i + 1) % 3]; seg.push([a[0], a[1], b[0], b[1], i === 0 ? 0.2 : 0.4, i === 0 ? t : null]); } });
  const bumpers = [
    { x: 383, y: 298, r: 32, p: 100, tipo: 'estrella' }, { x: 222, y: 353, r: 27, p: 100, tipo: 'bola' }, { x: 305, y: 470, r: 25, p: 100, tipo: 'seta' },
    { x: 300, y: 182, r: 25, p: 100, tipo: 'bola' }, { x: 170, y: 255, r: 25, p: 100, tipo: 'seta' }];
  const aletas = [
    { x: 170, y: 873, L: 70, reposo: 0.40, activo: -0.45, lado: 1, a: 0.40, w: 0, on: false },
    { x: 370, y: 873, L: 70, reposo: Math.PI - 0.40, activo: Math.PI + 0.45, lado: -1, a: Math.PI - 0.40, w: 0, on: false }];
  return { seg, bumpers, aletas, resorte };
}

export function crear({ bolas = 3 } = {}) {
  const m = crearMesa();
  const S = { m, bolas, bolaN: 1, pts: 0, mult: 1, luces: m.bumpers.map(() => false), bola: null, fase: 'lanzar', carga: 0, t: 0, tLanz: 0, salva: false, quieto: 0, ev: [], tilt: 0, max: 0, ultimoPunto: 0, salvaUsada: false };
  poner(S); return S;
}
function poner(S) { S.bola = { x: LANZA.x, y: LANZA.y, vx: 0, vy: 0 }; S.fase = 'lanzar'; S.carga = 0; S.quieto = 0; S.salva = false; }
const emit = (S, tipo, d) => S.ev.push({ tipo, ...d });

export function lanzar(S, fuerza) {                          // fuerza 0..1
  if (S.fase !== 'lanzar') return false;
  const f = Math.max(0.25, Math.min(1, fuerza));
  S.bola.vy = -(1350 + 800 * f); S.bola.vx = 0; S.fase = 'juego'; S.tLanz = S.t; S.salva = true; emit(S, 'lanzar', { f }); return true;
}
export function aleta(S, lado, on) { const a = S.m.aletas[lado]; if (a.on !== on) { a.on = on; if (on) emit(S, 'aleta', { lado }); } }

function choqueSegmento(S, b, s) {
  const [x1, y1, x2, y2, e, extra, tipo] = s, dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  let t = ((b.x - x1) * dx + (b.y - y1) * dy) / l2; t = Math.max(0, Math.min(1, t));
  const px = x1 + t * dx, py = y1 + t * dy; let nx = b.x - px, ny = b.y - py; const d2 = nx * nx + ny * ny;
  if (d2 >= R * R) return false; const d = Math.sqrt(d2) || 1e-6; nx /= d; ny /= d;
  if (tipo === 'puerta' && nx > 0) return false;
  b.x = px + nx * R; b.y = py + ny * R;
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
    if (extra) { const v = b.vx * nx + b.vy * ny; if (v < extra.kick) { b.vx += (extra.kick - v) * nx; b.vy += (extra.kick - v) * ny; } puntos(S, extra.pts100, 'goma'); }
  }
  return true;
}
function choqueBumper(S, b, k, i) {
  const dx = b.x - k.x, dy = b.y - k.y, d = Math.hypot(dx, dy), rr = R + k.r; if (d >= rr || d === 0) return;
  const nx = dx / d, ny = dy / d; b.x = k.x + nx * rr; b.y = k.y + ny * rr;
  const vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny; }
  const v = Math.hypot(b.vx, b.vy), nv = Math.max(560, v * 0.9 + 140);
  b.vx = nx * nv; b.vy = ny * nv; puntos(S, k.p, 'bumper', { i });
  if (!S.luces[i]) { S.luces[i] = true; if (S.luces.every(Boolean)) { S.luces.fill(false); S.mult = Math.min(5, S.mult + 1); S.ganado = true; puntos(S, 1000, 'bonus'); emit(S, 'mult', { mult: S.mult }); } }
}
function puntos(S, p, tipo, d = {}) { S.pts += p * S.mult; S.ultimoPunto = S.t; emit(S, tipo, { p: p * S.mult, ...d }); }

function choqueAleta(S, b, f, dt) {
  const ca = Math.cos(f.a), sa = Math.sin(f.a), x2 = f.x + f.L * ca, y2 = f.y + f.L * sa;
  const dx = x2 - f.x, dy = y2 - f.y, l2 = dx * dx + dy * dy; let t = ((b.x - f.x) * dx + (b.y - f.y) * dy) / l2; t = Math.max(0, Math.min(1, t));
  const px = f.x + t * dx, py = f.y + t * dy, rad = 11 - 4 * t;       // la aleta se afina hacia la punta
  let nx = b.x - px, ny = b.y - py; const d = Math.hypot(nx, ny), lim = R + rad; if (d >= lim || d === 0) return;
  nx /= d; ny /= d; b.x = px + nx * lim; b.y = py + ny * lim;
  const rx = px - f.x, ry = py - f.y, sx = -f.w * ry, sy = f.w * rx;  // velocidad de la superficie en el punto de contacto
  const rvx = b.vx - sx, rvy = b.vy - sy, vn = rvx * nx + rvy * ny;
  if (vn < 0) { const e = 0.35; b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; if (Math.abs(f.w) > 4) emit(S, 'golpe', {}); }
}

export function paso(S, dt = DT) {
  if (S.fase === 'fin') return;
  S.t += dt;
  const m = S.m;
  for (const f of m.aletas) {                                         // mover aletas
    const objetivo = f.on ? f.activo : f.reposo, v = f.on ? 22 : 12, dir = Math.sign(objetivo - f.a), mov = Math.min(Math.abs(objetivo - f.a), v * dt);
    f.w = dir * (mov / dt); f.a += dir * mov; if (mov === 0) f.w = 0;
  }
  const b = S.bola;
  if (S.fase === 'lanzar') { b.x = LANZA.x; b.y = LANZA.y + S.carga * 14; b.vx = b.vy = 0; return; }
  b.vy += G * dt; const f = 1 - FRICCION * dt; b.vx *= f; b.vy *= f;
  const v = Math.hypot(b.vx, b.vy); if (v > VMAX) { b.vx *= VMAX / v; b.vy *= VMAX / v; }
  b.x += b.vx * dt; b.y += b.vy * dt;
  for (let it = 0; it < 2; it++) {
    for (const s of m.seg) choqueSegmento(S, b, s);
    m.bumpers.forEach((k, i) => choqueBumper(S, b, k, i));
    for (const a of m.aletas) choqueAleta(S, b, a, dt);
  }
  if (b.y < S.max || !S.max) S.max = Math.min(S.max || 9999, b.y);
  // la bola vuelve al carril: se queda en el muelle y se vuelve a lanzar
  if (b.x > 505 && b.y > 930 && Math.hypot(b.vx, b.vy) < 60) { S.fase = 'lanzar'; S.carga = 0; b.vx = b.vy = 0; return; }
  // bola parada demasiado tiempo en un sitio muerto: pequeño empujón
  if (Math.hypot(b.vx, b.vy) < 12) S.quieto += dt; else S.quieto = 0;
  if (S.quieto > 3.5) { b.vx += (b.x < 270 ? 1 : -1) * 260; b.vy -= 160; S.quieto = 0; emit(S, 'empujon', {}); }
  if (b.y > H + 30 || b.y < -50 || b.x < -50 || b.x > W + 50) perder(S);
}
function perder(S) {
  if (S.salva && !S.salvaUsada && S.t - S.tLanz < 9) { S.salvaUsada = true; emit(S, 'salvada', {}); poner(S); return; }   // bola salvada: se repite sin gastar bola
  emit(S, 'perdida', { n: S.bolaN });
  if (S.bolaN >= S.bolas) { S.fase = 'fin'; S.bola.y = H + 50; emit(S, 'fin', { pts: S.pts }); return; }
  S.bolaN++; S.mult = 1; S.luces.fill(false); S.salvaUsada = false; poner(S);
}
export function avanzar(S, seg) { let n = Math.min(Math.round(seg / DT), 60); while (n-- > 0) paso(S); }
