// Motor de «Quantix» (sin DOM, probable con Node). Estilo Qix/Volfied con cuadrados: pulsas junto a una zona ya descubierta y
// deslizas para crecer un rectángulo; si el jefe lo toca mientras crece, pierdes una vida. Al soltar, el rectángulo se descubre.
export const COLS = 36, ROWS = 48, CELDA = 10, W = COLS * CELDA, H = ROWS * CELDA, R = .45, DT = 1 / 90;
export const INTERIOR = (COLS - 2) * (ROWS - 2);
export const IA = { docil: { nombre: 'Dócil', v: .75, caza: 0 }, normal: { nombre: 'Normal', v: 1, caza: .35 }, astuto: { nombre: 'Astuto', v: 1.12, caza: .65 }, maestro: { nombre: 'Maestro', v: 1.25, caza: 1 } };
export const OBJ = { facil: { nombre: 'Fácil', d: -10 }, normal: { nombre: 'Normal', d: 0 }, dificil: { nombre: 'Exigente', d: 5 } };
export const VIDAS = { 3: '3', 5: '5', 7: '7' };
export const TRAZO = { lento: { nombre: 'Lento', v: 14 }, normal: { nombre: 'Normal', v: 22 }, rapido: { nombre: 'Rápido', v: 34 } };
export const CFG_DEF = { nivel: 1, ia: 'normal', obj: 'normal', vidas: 5, trazo: 'normal' };
// 20 niveles = 4 grupos de jefes (1 a 4) × 5 velocidades. Nivel n → jefes = ⌈n/5⌉, velocidad = (n-1) % 5.
export const VELOCIDADES = [['Lenta', 6], ['Moderada', 8.5], ['Media', 11], ['Rápida', 13.5], ['Muy rápida', 16]];
const TIPOS = [['rebote', 'errante', 'rebote', 'errante'], ['errante', 'rebote', 'errante', 'rebote'], ['errante', 'cazador', 'rebote', 'errante'], ['cazador', 'rebote', 'cazador', 'errante'], ['cazador', 'cazador', 'rebote', 'cazador']];
export const NIVELES = Array.from({ length: 20 }, (_, i) => {
  const nj = Math.floor(i / 5) + 1, vi = i % 5, [vn, v] = VELOCIDADES[vi];
  return { n: `${nj} jefe${nj > 1 ? 's' : ''} · ${vn.toLowerCase()}`, obj: 60 + Math.floor(i * .6), j: TIPOS[vi].slice(0, nj).map(t => [t, v]) };
});
export const N_NIVELES = NIVELES.length;
const cl = (v, a, b) => Math.min(b, Math.max(a, v));
export function rnd(S) { S.rs = (S.rs + 0x6D2B79F5) | 0; let t = Math.imul(S.rs ^ (S.rs >>> 15), 1 | S.rs); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
export function cfgValida(c) {
  if (!c || typeof c !== 'object') return null;
  const nivel = Number(c.nivel), vidas = Number(c.vidas);
  if (!Number.isInteger(nivel) || nivel < 1 || nivel > N_NIVELES || !Object.hasOwn(IA, c.ia) || !Object.hasOwn(OBJ, c.obj) || !Object.hasOwn(TRAZO, c.trazo) || !Object.hasOwn(VIDAS, vidas)) return null;
  return { nivel, ia: c.ia, obj: c.obj, vidas, trazo: c.trazo };
}
export const objetivoDe = (nivel, obj) => cl(NIVELES[nivel - 1].obj + OBJ[obj].d, 40, 95);
const idx = (x, y) => y * COLS + x;
export function crear(cfg, seed = Math.floor(Math.random() * 4294967295) + 1) {
  const c = cfgValida(cfg) || { ...CFG_DEF }, def = NIVELES[c.nivel - 1];
  const g = new Uint8Array(COLS * ROWS);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) g[idx(x, y)] = 1;
  const S = { v: 1, nivel: c.nivel, ia: c.ia, objk: c.obj, trazo: c.trazo, obj: objetivoDe(c.nivel, c.obj), vidas: c.vidas, vidas0: c.vidas, perd: 0, g, jefes: [], rect: null, puntos: 0, t: 0, inv: 0, fase: 'listo', est: 0, rs: seed | 0 || 1, rec: 0 };
  const ya = [];
  for (const [tipo, v] of def.j) {
    let x, y, n = 0;
    do { x = 6 + rnd(S) * (COLS - 12); y = 8 + rnd(S) * (ROWS - 16); n++; } while (n < 30 && ya.some(p => Math.hypot(p.x - x, p.y - y) < 12));
    ya.push({ x, y });
    const a = rnd(S) * 6.283; S.jefes.push({ x, y, vx: Math.cos(a), vy: Math.sin(a), t: tipo, v, g: 0.3 + rnd(S) });
    if (tipo === 'rebote') { const b = S.jefes[S.jefes.length - 1]; const d = Math.PI / 4 + (Math.floor(rnd(S) * 4)) * Math.PI / 2 + (rnd(S) - .5) * .3; b.vx = Math.cos(d); b.vy = Math.sin(d); }
  }
  return S;
}
export function pct(S) { let n = 0; for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) if (S.g[idx(x, y)]) n++; return n / INTERIOR * 100; }
export const libres = S => { let n = 0; for (let i = 0; i < S.g.length; i++) if (!S.g[i]) n++; return n; };
const bloq = (g, x, y) => { const a = x - R, b = x + R, c = y - R, d = y + R; return g[idx(Math.floor(a), Math.floor(c))] || g[idx(Math.floor(b), Math.floor(c))] || g[idx(Math.floor(a), Math.floor(d))] || g[idx(Math.floor(b), Math.floor(d))]; };
export const cuadro = S => {                 // límites (en celdas, inclusivos) del rectángulo que crece, o null
  const r = S.rect; if (!r) return null;
  const ex = Math.round(r.dx), ey = Math.round(r.dy);
  return { x0: cl(Math.min(r.ax, r.ax + ex), 1, COLS - 2), x1: cl(Math.max(r.ax, r.ax + ex), 1, COLS - 2), y0: cl(Math.min(r.ay, r.ay + ey), 1, ROWS - 2), y1: cl(Math.max(r.ay, r.ay + ey), 1, ROWS - 2) };
};
// Casilla de arranque válida cerca de (cx,cy): libre y pegada a una zona descubierta
export function anclaje(S, cx, cy) {
  let mejor = null, md = 1e9;
  for (let y = Math.max(1, cy - 2); y <= Math.min(ROWS - 2, cy + 2); y++) for (let x = Math.max(1, cx - 2); x <= Math.min(COLS - 2, cx + 2); x++) {
    if (S.g[idx(x, y)] || !(S.g[idx(x - 1, y)] || S.g[idx(x + 1, y)] || S.g[idx(x, y - 1)] || S.g[idx(x, y + 1)])) continue;
    const d = (x - cx) ** 2 + (y - cy) ** 2; if (d < md) { md = d; mejor = { x, y }; }
  }
  return mejor;
}
export function empezarRect(S, ax, ay) {
  if (S.fase !== 'jugar' || S.rect || S.inv > 0 || ax < 1 || ay < 1 || ax > COLS - 2 || ay > ROWS - 2 || S.g[idx(ax, ay)]) return false;
  S.rect = { ax, ay, tx: ax, ty: ay, dx: 0, dy: 0 }; return true;
}
export function apuntar(S, tx, ty) { if (S.rect) { S.rect.tx = cl(tx, 1, COLS - 2); S.rect.ty = cl(ty, 1, ROWS - 2); } }
export const completo = S => !S.rect || (Math.abs(S.rect.dx - (S.rect.tx - S.rect.ax)) < .5 && Math.abs(S.rect.dy - (S.rect.ty - S.rect.ay)) < .5);

function moverJefes(S, dt) {
  const ia = IA[S.ia], c = cuadro(S);
  for (const b of S.jefes) {
    const sp = b.v * ia.v;
    if (b.t !== 'rebote') {                                    // errante / cazador: giran de vez en cuando
      b.g -= dt;
      if (b.g <= 0) { b.g = .35 + rnd(S) * .9; const a = Math.atan2(b.vy, b.vx) + (rnd(S) - .5) * 2.2; b.vx = Math.cos(a); b.vy = Math.sin(a); }
      const caza = b.t === 'cazador' ? ia.caza : ia.caza * .25;
      if (c && caza > 0) {                                     // se orientan hacia el rectángulo que está creciendo
        const tx = (c.x0 + c.x1 + 1) / 2 - b.x, ty = (c.y0 + c.y1 + 1) / 2 - b.y, l = Math.hypot(tx, ty) || 1, k = Math.min(1, caza * dt * 3);
        b.vx += (tx / l - b.vx) * k; b.vy += (ty / l - b.vy) * k;
      }
    }
    const l = Math.hypot(b.vx, b.vy) || 1; b.vx /= l; b.vy /= l;
    const nx = b.x + b.vx * sp * dt; let rebote = false;
    if (bloq(S.g, nx, b.y)) { b.vx = -b.vx; rebote = true; } else b.x = nx;
    const ny = b.y + b.vy * sp * dt;
    if (bloq(S.g, b.x, ny)) { b.vy = -b.vy; rebote = true; } else b.y = ny;
    if (rebote && b.t === 'rebote') { const a = Math.atan2(b.vy, b.vx) + (rnd(S) - .5) * .22; b.vx = Math.cos(a); b.vy = Math.sin(a); }
    if (!Number.isFinite(b.x + b.y + b.vx + b.vy)) { b.x = COLS / 2; b.y = ROWS / 2; b.vx = 1; b.vy = .7; }
    if (bloq(S.g, b.x, b.y)) { b.x = Math.floor(b.x) + .5; b.y = Math.floor(b.y) + .5; if (S.g[idx(Math.floor(b.x), Math.floor(b.y))]) recolocar(S, b); }
  }
}
function recolocar(S, b) {                     // por seguridad: si un jefe quedara dentro de lo descubierto, vuelve a la casilla libre más cercana
  let m = 1e9, bx = 0, by = 0;
  for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) if (!S.g[idx(x, y)]) { const d = (x + .5 - b.x) ** 2 + (y + .5 - b.y) ** 2; if (d < m) { m = d; bx = x + .5; by = y + .5; } }
  if (m < 1e9) { b.x = bx; b.y = by; }
}
function toca(S) {
  const c = cuadro(S); if (!c) return false;
  const m = R + .12;
  return S.jefes.some(b => b.x > c.x0 - m && b.x < c.x1 + 1 + m && b.y > c.y0 - m && b.y < c.y1 + 1 + m);
}
// Un paso de la partida. Devuelve la lista de sucesos: 'golpe' | 'fin' | 'reclamo' | 'meta'
export function paso(S, dt = DT) {
  const ev = [];
  if (S.fase !== 'jugar') return ev;
  S.t += dt; if (S.inv > 0) S.inv = Math.max(0, S.inv - dt);
  moverJefes(S, dt);
  const r = S.rect;
  if (r) {
    const v = TRAZO[S.trazo].v * dt, ox = r.tx - r.ax - r.dx, oy = r.ty - r.ay - r.dy;
    r.dx += Math.abs(ox) <= v ? ox : Math.sign(ox) * v; r.dy += Math.abs(oy) <= v ? oy : Math.sign(oy) * v;
    if (toca(S)) {
      S.rect = null; S.vidas--; S.perd++; S.inv = .6; ev.push('golpe');
      if (S.vidas <= 0) { S.fase = 'fin'; ev.push('fin'); }
    }
  }
  return ev;
}
// Suelta el dedo: el rectángulo (tal como haya crecido) se descubre. Devuelve {celdas, pts} o null
export function soltar(S) {
  const c = cuadro(S); S.rect = null;
  if (!c || S.fase !== 'jugar') return null;
  let n = 0;
  for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) if (!S.g[idx(x, y)]) { S.g[idx(x, y)] = 1; n++; }
  if (!n) return null;
  // lo que ya no se puede alcanzar desde ningún jefe queda descubierto
  const vis = new Uint8Array(COLS * ROWS), pila = [];
  for (const b of S.jefes) { const i = idx(Math.floor(b.x), Math.floor(b.y)); if (!S.g[i] && !vis[i]) { vis[i] = 1; pila.push(i); } }
  while (pila.length) { const i = pila.pop(), x = i % COLS, y = (i / COLS) | 0; for (const j of [i - 1, i + 1, i - COLS, i + COLS]) if (!S.g[j] && !vis[j] && j >= 0 && j < S.g.length) { vis[j] = 1; pila.push(j); } }
  for (let i = 0; i < S.g.length; i++) if (!S.g[i] && !vis[i]) { S.g[i] = 1; n++; }
  const pts = Math.round(n * 10 * (1 + Math.min(1, n / 300)));
  S.puntos += pts; S.rec = c;
  const res = { celdas: n, pts, x: (c.x0 + c.x1 + 1) / 2, y: (c.y0 + c.y1 + 1) / 2, ev: ['reclamo'] };
  if (pct(S) >= S.obj) { S.est = S.perd === 0 ? 3 : S.perd <= 1 ? 2 : 1; S.puntos += S.vidas * 300 + S.est * 200; S.fase = 'meta'; res.ev.push('meta'); }
  return res;
}
export function clonar(S) { return { ...S, g: S.g.slice(), jefes: S.jefes.map(b => ({ ...b })), rect: S.rect ? { ...S.rect } : null }; }

/* ---------- guardado ---------- */
const finito = v => typeof v === 'number' && Number.isFinite(v);
export function serializar(S) { const o = { ...S, g: Array.from({ length: ROWS }, (_, y) => Array.from(S.g.subarray(y * COLS, y * COLS + COLS)).join('')), rect: null, rec: 0 }; if (o.fase === 'jugar') o.fase = 'pausa'; return o; }
export function validar(d) {
  if (!d || typeof d !== 'object' || d.v !== 1 || !Array.isArray(d.g) || d.g.length !== ROWS || !Object.hasOwn(IA, d.ia) || !Object.hasOwn(OBJ, d.objk) || !Object.hasOwn(TRAZO, d.trazo)) return null;
  if (!Number.isInteger(d.nivel) || d.nivel < 1 || d.nivel > N_NIVELES || !['listo', 'jugar', 'pausa', 'fin', 'meta'].includes(d.fase)) return null;
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  if (!ent(d.vidas, 0, 7) || !ent(d.vidas0, 3, 7) || !ent(d.perd, 0, 1e4) || !ent(d.puntos, 0, 1e9) || !ent(d.est || 0, 0, 3) || !ent(d.rs, -2147483648, 2147483647) || !finito(d.t) || !finito(d.inv)) return null;
  const g = new Uint8Array(COLS * ROWS);
  for (let y = 0; y < ROWS; y++) { const f = d.g[y]; if (typeof f !== 'string' || f.length !== COLS || /[^01]/.test(f)) return null; for (let x = 0; x < COLS; x++) { g[idx(x, y)] = f[x] === '1' ? 1 : 0; if ((x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) && f[x] !== '1') return null; } }
  const def = NIVELES[d.nivel - 1];
  if (!Array.isArray(d.jefes) || d.jefes.length !== def.j.length) return null;
  const jefes = [];
  for (const b of d.jefes) { if (!b || !finito(b.x) || !finito(b.y) || !finito(b.vx) || !finito(b.vy) || !finito(b.v) || !finito(b.g) || !['rebote', 'errante', 'cazador'].includes(b.t) || b.x < 1 || b.y < 1 || b.x > COLS - 1 || b.y > ROWS - 1 || g[idx(Math.floor(b.x), Math.floor(b.y))]) return null; jefes.push({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, t: b.t, v: b.v, g: b.g }); }
  return { v: 1, nivel: d.nivel, ia: d.ia, objk: d.objk, trazo: d.trazo, obj: objetivoDe(d.nivel, d.objk), vidas: d.vidas, vidas0: d.vidas0, perd: d.perd, g, jefes, rect: null, puntos: d.puntos, t: d.t, inv: 0, fase: d.fase === 'jugar' ? 'pausa' : d.fase, est: d.est || 0, rs: d.rs, rec: 0 };
}
export function resumen(S) {
  const q = `Nivel ${S.nivel}`, p = Math.round(pct(S));
  if (S.fase === 'meta') return { texto: `${q} superado · ${S.puntos} puntos`, fin: true };
  if (S.fase === 'fin') return { texto: `${q} · ${p}% descubierto · ${S.puntos} puntos`, fin: true };
  return { texto: `En pausa · ${q} · ${p}%`, fin: false };
}
export const variante = S => `Nivel ${S.nivel}`;
