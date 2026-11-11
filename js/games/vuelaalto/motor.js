// Motor de «Vuela Alto» (sin DOM, probable con Node). Un personaje vuela hacia la derecha: SUBE mientras se mantiene pulsado y BAJA al soltar.
// Mundo: ancho 360, alto 480 (el suelo está en SUELO). El personaje está siempre en x = S.x (la cámara lo sigue); y crece hacia abajo.
export const W = 360, H = 480, SUELO = 432, PX = 96, R = 13, PW = 58, X0 = 380, DT = 1 / 120;
export const MODOS = { niveles: 'Niveles', infinito: 'Infinito' };
export const DIF = { facil: { nombre: 'Fácil', hueco: 1.25, vel: .86 }, normal: { nombre: 'Normal', hueco: 1, vel: 1 }, dificil: { nombre: 'Difícil', hueco: .93, vel: 1.06 }, experto: { nombre: 'Experto', hueco: .84, vel: 1.15 } };
export const AFL = { baja: { nombre: 'Baja', sep: 1.35 }, media: { nombre: 'Media', sep: 1 }, alta: { nombre: 'Alta', sep: .82 }, muy: { nombre: 'Muy alta', sep: .68 } };
export const VEL = { lenta: { nombre: 'Lenta', k: .8 }, normal: { nombre: 'Normal', k: 1 }, rapida: { nombre: 'Rápida', k: 1.25 } };
// Control: aceleración al soltar (G) y al mantener (T), y velocidades máximas de subida y bajada (unidades por segundo)
export const CTL = { suave: { nombre: 'Suave', G: 820, T: 1150, up: 210, down: 300 }, normal: { nombre: 'Normal', G: 1000, T: 1400, up: 240, down: 340 }, agil: { nombre: 'Ágil', G: 1200, T: 1700, up: 280, down: 400 } };
export const EXT = { solo: 'Solo tubos', nivel: 'Los del nivel', mas: 'Más peligros' };
export const CFG_DEF = { modo: 'niveles', nivel: 1, dif: 'normal', afl: 'media', vel: 'normal', ctl: 'normal', ext: 'nivel' };

/* ---------- los 24 niveles ---------- */
export const NOMBRES = ['Primer vuelo', 'Brisa suave', 'Entre nubes', 'Viento del oeste', 'Hora dorada', 'Aves curiosas', 'Luna llena', 'Luciérnagas', 'Noche de estrellas', 'Primera nevada', 'Ventisca', 'Cumbre helada',
  'Dunas', 'Espejismo', 'Tormenta de arena', 'Selva profunda', 'Lianas', 'Cascadas', 'Cenizas', 'Río de lava', 'Volcán furioso', 'Órbita', 'Lluvia de meteoritos', 'Más allá de las estrellas'];
export const TEMAS = ['dia', 'atardecer', 'noche', 'nieve', 'desierto', 'selva', 'volcan', 'espacio'];   // uno por cada 3 niveles
export const N_NIVELES = NOMBRES.length;
export const temaDe = n => TEMAS[Math.min(TEMAS.length - 1, Math.floor((n - 1) / 3))];
const cl = (v, a, b) => Math.min(b, Math.max(a, v));
// Parámetros «de diseño» de un nivel (n puede ser fraccionario: lo usa el modo Infinito para subir poco a poco).
export function paramsNivel(n) {
  const t = Math.min(1.15, (n - 1) / 23);
  return {
    vel: 118 + 62 * t, hueco: 178 - 62 * t, sep: 232 - 62 * t, dist: 700 + 90 * (n - 1),          // dist en metros (10 unidades = 1 m)
    mov: n < 4 ? 0 : cl(.08 + (n - 4) * .03, 0, .65), amp: 30 + 40 * t,
    doble: n < 9 ? 0 : cl(.08 + (n - 9) * .015, 0, .35),
    pajaros: n < 6 ? 0 : cl(.1 + (n - 6) * .013, 0, .38),
    rotores: n < 12 ? 0 : cl(.06 + (n - 12) * .02, 0, .32),
    monedas: .6,
  };
}
export const distanciaNivel = n => Math.round(paramsNivel(n).dist);

/* ---------- aleatorio repetible ---------- */
export function crearRng(s) { let a = (s >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---------- partida ---------- */
export function cfgValida(c) {
  if (!c || typeof c !== 'object') return null;
  const nivel = Number(c.nivel);
  if (!Object.hasOwn(MODOS, c.modo) || !Object.hasOwn(DIF, c.dif) || !Object.hasOwn(AFL, c.afl) || !Object.hasOwn(VEL, c.vel) || !Object.hasOwn(CTL, c.ctl) || !Object.hasOwn(EXT, c.ext) || !Number.isInteger(nivel) || nivel < 1 || nivel > N_NIVELES) return null;
  return { modo: c.modo, nivel, dif: c.dif, afl: c.afl, vel: c.vel, ctl: c.ctl, ext: c.ext };
}
export function crear(cfg, rnd = Math.random) {
  const c = cfgValida(cfg) || { ...CFG_DEF };
  return {
    v: 1, modo: c.modo, nivel: c.modo === 'niveles' ? c.nivel : 0, dif: c.dif, afl: c.afl, vel: c.vel, ctl: c.ctl, ext: c.ext,
    seed: c.modo === 'niveles' ? c.nivel * 7919 + 13 : Math.floor(rnd() * 4294967295) + 1,
    x: 0, y: H / 2 - 30, vy: 0, t: 0, pas: 0, mon: 0, cogidas: [], puntos: 0, fase: 'listo', motivo: '', est: 0,
  };
}
export const metros = S => Math.floor(S.x / 10);
const finito = v => typeof v === 'number' && Number.isFinite(v);
export function validar(d) {
  if (!d || typeof d !== 'object' || d.v !== 1 || !Object.hasOwn(MODOS, d.modo) || !Object.hasOwn(DIF, d.dif) || !Object.hasOwn(AFL, d.afl) || !Object.hasOwn(VEL, d.vel) || !Object.hasOwn(CTL, d.ctl) || !Object.hasOwn(EXT, d.ext)) return null;
  if (d.modo === 'niveles' ? !Number.isInteger(d.nivel) || d.nivel < 1 || d.nivel > N_NIVELES : d.nivel !== 0) return null;
  if (!['listo', 'jugar', 'pausa', 'fin', 'meta'].includes(d.fase)) return null;
  if (!finito(d.x) || d.x < 0 || d.x > 1e6 || !finito(d.y) || d.y < 0 || d.y > H || !finito(d.vy) || Math.abs(d.vy) > 1000 || !finito(d.t) || d.t < 0 || d.t > 1e5) return null;
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  if (!ent(d.pas, 0, 1e5) || !ent(d.mon, 0, 1e5) || !ent(d.puntos, 0, 1e9) || !ent(d.seed, 1, 4294967295) || !ent(d.est || 0, 0, 3)) return null;
  const cog = (Array.isArray(d.cogidas) ? d.cogidas : []).filter(v => ent(v, 0, 1e5)).slice(0, 4000);
  return { v: 1, modo: d.modo, nivel: d.nivel, dif: d.dif, afl: d.afl, vel: d.vel, ctl: d.ctl, ext: d.ext, seed: d.seed, x: d.x, y: d.y, vy: d.vy, t: d.t, pas: d.pas, mon: cog.length, cogidas: cog, puntos: d.puntos,
    fase: d.fase === 'jugar' ? 'pausa' : d.fase, motivo: typeof d.motivo === 'string' ? d.motivo.slice(0, 20) : '', est: d.est || 0 };
}
export function resumen(S) {
  const quien = S.modo === 'niveles' ? `Nivel ${S.nivel}` : 'Infinito';
  if (S.fase === 'meta') return { texto: `${quien} superado · ${S.puntos} puntos`, fin: true };
  if (S.fase === 'fin') return { texto: `${quien} · ${S.modo === 'infinito' ? metros(S) + ' m · ' : ''}${S.puntos} puntos`, fin: true };
  return { texto: `En pausa · ${quien} · ${metros(S)} m`, fin: false };
}
export const variante = S => (S.modo === 'niveles' ? 'Niveles' : `Infinito · ${DIF[S.dif].nombre}`);

/* ---------- el mundo (obstáculos generados de forma repetible) ---------- */
export class Mundo {
  constructor(S) {
    this.S = S; this.rng = crearRng(S.seed); this.obst = []; this.aves = []; this.mon = []; this.idm = 0;
    this.x = X0; this.cy = H / 2 - 30; this.ta = X0 / this.velEn(0) * 0;   // ta: tiempo acumulado en el que el jugador llega a this.x
    this.ta = this.tiempoHasta(X0); this.previa = null; this.cog = new Set(S.cogidas);
    this.base = S.modo === 'niveles' ? this.ajustar(paramsNivel(S.nivel)) : null;
    this.fin = S.modo === 'niveles' ? X0 + this.base.dist * 10 : Infinity; this.total = 0;
    if (S.modo === 'niveles') { this.hasta(this.fin); this.total = this.mon.length; }
  }
  nEq(x) { return 1 + Math.min(27, x / 10 / 260); }                       // Infinito: «nivel equivalente» según la distancia
  ajustar(P) {
    const S = this.S, d = DIF[S.dif], a = AFL[S.afl], v = VEL[S.vel];
    const p = { ...P, vel: P.vel * d.vel * v.k, hueco: P.hueco * d.hueco, sep: P.sep * a.sep };
    if (S.ext === 'solo') { p.mov = p.doble = p.pajaros = p.rotores = 0; }
    else if (S.ext === 'mas') { p.mov = Math.max(p.mov * 1.6, .2); p.doble = Math.max(p.doble * 1.6, .12); p.pajaros = Math.max(p.pajaros * 1.8, .2); p.rotores = Math.max(p.rotores * 1.8, .12); }
    return p;
  }
  params(x) { return this.base || this.ajustar(paramsNivel(this.nEq(x))); }
  velEn(x) { return this.base ? this.base.vel : this.ajustar(paramsNivel(this.nEq(x))).vel; }
  tiempoHasta(x) { let t = 0, a = 0; while (a < x) { const b = Math.min(x, a + 40); t += (b - a) / this.velEn((a + b) / 2); a = b; } return t; }
  hasta(xmax) { const lim = Math.min(xmax, this.fin); while (this.x < lim && this.x < this.fin - 40) this.siguiente(); }
  siguiente() {
    const r = this.rng, P = this.params(this.x), S = this.S, c = CTL[S.ctl];
    const gh = P.hueco, minC = gh / 2 + 24, maxC = SUELO - gh / 2 - 24;
    const libre = Math.max(.2, (P.sep - PW) / P.vel), pa = this.pa || 0;
    const base = .36 * Math.min(c.up, c.down) * libre;                         // lo que se puede subir/bajar entre dos puertas con margen
    const paso = cl(base - pa, 24, 190);
    const u = r(), x = this.x;
    let o;
    if (u < P.rotores && base >= 100) {
      const cy = cl(this.cy + (r() * 2 - 1) * paso, 120, 330), L = 56;
      o = { k: 'rotor', x0: x, x1: x + 2 * L, cx: x + L, cy, L, w: (r() < .5 ? -1 : 1) * (1.1 + r() * .6), ph: r() * 6.283, lado: cy < 225 ? 1 : -1 };
      this.cy = cl(cy + o.lado * (L + 32), minC, maxC); this.pa = 0;
      o.x1 = x + 2 * L; this.avance(x, 2 * L, P);
    } else if (u < P.rotores + P.doble) {
      const hh = Math.max(84, gh * .62), bloque = 58, sal = hh + bloque, a0 = r() < P.mov * .6 ? Math.min(P.amp * .5, 28) : 0;
      const gc = cl(this.cy + (r() * 2 - 1) * Math.max(20, paso - a0), 24 + hh / 2 + a0, SUELO - 24 - hh / 2 - a0);
      const arriba = gc + sal + hh / 2 + a0 <= SUELO - 24 ? (gc - sal - hh / 2 - a0 >= 24 ? r() < .5 : true) : false;
      const c1 = arriba ? gc : gc - sal, c2 = arriba ? gc + sal : gc, cerca = gc;
      o = { k: 'doble', x0: x, x1: x + PW, cy: c1, c2, h: hh };
      this.pa = 0;
      if (a0 >= 16) { o.mov = { a: a0, w: cl(55 / a0, .8, 2), ph: r() * 6.283 }; this.pa = a0; }
      this.cy = cerca; this.avance(x, PW, P);
    } else {
      const mv = r() < P.mov, a0 = mv ? P.amp * (.55 + r() * .45) : 0;
      const cy = cl(this.cy + (r() * 2 - 1) * Math.max(20, paso - a0), minC + a0, maxC - a0);
      o = { k: 'tubo', x0: x, x1: x + PW, cy, h: gh };
      if (mv && a0 >= 16) o.mov = { a: a0, w: cl(55 / a0, .8, 2), ph: r() * 6.283 };
      this.cy = cy; this.pa = o.mov ? a0 : 0; this.avance(x, PW, P);
    }
    o.tm = this.ta; o.id = this.obst.length;
    if (this.previa && this.previa.k !== 'doble' && o.k !== 'doble' && r() < P.pajaros) {                                      // un pájaro entre la puerta anterior y esta
      const xm = (this.previa.x1 + o.x0) / 2, ym = (this.previa.yc + this.cy) / 2, am = 14 + r() * 22, lado = ym > 230 ? -1 : 1, sep = 62 + am + r() * 30;
      this.aves.push({ k: 'pajaro', xm, y0: cl(ym + lado * sep + Math.abs(this.cy - this.previa.yc) * .0, 50, SUELO - 40), a: am, w: 1.5 + r() * 1.5, ph: r() * 6.283, vb: 35 + r() * 35, tm: this.tiempoHasta(xm) });
    }
    this.obst.push(o);
    if (r() < P.monedas) { const yc = o.k === 'rotor' ? this.cy : (o.k === 'doble' ? (Math.abs(o.cy - this.cy) < Math.abs(o.c2 - this.cy) ? o.cy : o.c2) : o.cy); this.mon.push({ id: this.idm++, x: (o.x0 + o.x1) / 2, y: yc }); }
    this.previa = { x1: o.x1, yc: this.cy, k: o.k };
  }
  avance(x, ancho, P) { this.x = x + P.sep + (ancho - PW); this.ta = this.tiempoHasta(this.x); }
}

// Posición vertical del hueco principal de un obstáculo en el instante t
const off = (o, t) => (o.mov ? o.mov.a * Math.sin(o.mov.w * t + o.mov.ph) : 0);
export const centroEn = (o, t) => o.cy + off(o, t);
export const posAve = (a, t, m) => ({ x: a.xm - a.vb * (t - a.tm), y: a.y0 + a.a * Math.sin(a.w * t + a.ph) });
function desde(arr, x, clave) { let a = 0, b = arr.length; while (a < b) { const m = (a + b) >> 1; if (arr[m][clave] < x) a = m + 1; else b = m; } return a; }

export function visibles(m, x0, x1) { m.hasta(x1 + 100); const r = []; for (let i = desde(m.obst, x0 - 70, 'x1'); i < m.obst.length; i++) { if (m.obst[i].x0 > x1) break; r.push(m.obst[i]); } return r; }
export function monedasVis(m, x0, x1) { const r = []; for (let i = desde(m.mon, x0 - 20, 'x'); i < m.mon.length; i++) { if (m.mon[i].x > x1 + 20) break; if (!m.cog.has(m.mon[i].id)) r.push(m.mon[i]); } return r; }
export function avesVis(m, x0, x1) { const r = []; for (let i = desde(m.aves, x0 - 200, 'xm'); i < m.aves.length; i++) { if (m.aves[i].xm > x1 + 800) break; r.push(m.aves[i]); } return r; }
// ¿Choca el personaje con algo? (caja ajustada: el choque es algo más permisivo que el dibujo)
export function choca(S, m) {
  const rb = R * .86, x = S.x, y = S.y, t = S.t;
  m.hasta(x + W + 200);
  for (let i = desde(m.obst, x - 150, 'x1'); i < m.obst.length; i++) {
    const o = m.obst[i]; if (o.x0 > x + R + 2) break;
    if (o.k === 'rotor') {
      const a = o.ph + o.w * t, dx = Math.cos(a) * o.L, dy = Math.sin(a) * o.L, px = x - o.cx, py = y - o.cy;
      const l2 = dx * dx * 4 + dy * dy * 4, u = cl(((px + dx) * dx * 2 + (py + dy) * dy * 2) / l2, 0, 1), qx = -dx + u * dx * 2, qy = -dy + u * dy * 2;
      if (Math.hypot(px - qx, py - qy) < rb + 5) return true;
    } else if (x + rb > o.x0 && x - rb < o.x1) {
      const d = off(o, t);
      if (o.k === 'tubo') { if (!(y - rb >= o.cy + d - o.h / 2 && y + rb <= o.cy + d + o.h / 2)) return true; }
      else if (!((y - rb >= o.cy + d - o.h / 2 && y + rb <= o.cy + d + o.h / 2) || (y - rb >= o.c2 + d - o.h / 2 && y + rb <= o.c2 + d + o.h / 2))) return true;
    }
  }
  for (let i = desde(m.aves, x - 500, 'xm'); i < m.aves.length; i++) {
    const a = m.aves[i]; if (a.xm > x + 700) break;
    const p = posAve(a, t, m); if (Math.hypot(p.x - x, p.y - y) < rb + 9) return true;
  }
  return false;
}
// Un paso de física. Devuelve 'suelo' | 'choque' | null (sin tocar puntos ni monedas: sirve para «mirar hacia delante»)
export function fisica(S, m, hold, dt) {
  const c = CTL[S.ctl];
  S.vy = cl(S.vy + (hold ? -c.T : c.G) * dt, -c.up, c.down);
  S.y += S.vy * dt;
  if (S.y < R) { S.y = R; if (S.vy < 0) S.vy = 0; }
  S.x += m.velEn(S.x) * dt; S.t += dt;
  if (S.y + R >= SUELO) { S.y = SUELO - R; return 'suelo'; }
  return choca(S, m) ? 'choque' : null;
}
export const estrellas = (S, m) => { const f = m.total ? S.mon / m.total : 1; return f >= .9 ? 3 : f >= .5 ? 2 : 1; };
// Paso completo de la partida. Evento: 'suelo' | 'choque' | 'meta' | 'moneda' | 'puerta' | null
export function paso(S, m, hold, dt = DT) {
  if (S.fase !== 'jugar') return null;
  const ev = fisica(S, m, hold, dt);
  if (ev) { S.fase = 'fin'; S.motivo = ev; return ev; }
  let res = null;
  while (S.pas < m.obst.length && m.obst[S.pas].x1 < S.x - R) { S.pas++; S.puntos += 10; res = 'puerta'; }
  for (let i = desde(m.mon, S.x - 40, 'x'); i < m.mon.length; i++) {
    const k = m.mon[i]; if (k.x > S.x + 40) break;
    if (!m.cog.has(k.id) && Math.hypot(k.x - S.x, k.y - S.y) < R + 11) { m.cog.add(k.id); S.cogidas.push(k.id); S.mon++; S.puntos += 25; res = 'moneda'; }
  }
  if (S.modo === 'niveles' && S.x >= m.fin) { S.est = estrellas(S, m); S.puntos += 100 * S.est; S.fase = 'meta'; return 'meta'; }
  return res;
}
// Altura a la que conviene pasar la siguiente puerta (para el «piloto automático» de las pruebas)
export function objetivo(S, m) {
  m.hasta(S.x + W + 300);
  const t = S.t;
  for (let i = Math.max(0, S.pas - 1); i < m.obst.length; i++) {
    const o = m.obst[i]; if (o.x1 < S.x - R) continue;
    if (o.k === 'rotor') return o.cy + o.lado * (o.L + 32);
    const ta = t + Math.max(0, (o.x0 + PW / 2 - S.x)) / m.velEn(S.x);                    // instante en que se llegará a la puerta
    if (o.k === 'doble') return Math.abs(centroEn(o, ta) - S.y) < Math.abs(o.c2 + off(o, ta) - S.y) ? centroEn(o, ta) : o.c2 + off(o, ta);
    return centroEn(o, ta);
  }
  return S.y;
}
