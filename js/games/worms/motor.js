// Worms (Arcade) · motor sin DOM (se prueba con Node: tests/worms.mjs).
// Mundo en «píxeles de mundo»; y crece hacia abajo. El terreno es una máscara (1 = tierra) que las explosiones agujerean.
// El estado guardable NO incluye la máscara: se regenera con la semilla y la lista de cráteres.

export const GRAV = 820;
export const ALTO = 780;
export const ANCHOS = { 3: 1500, 6: 1900, 9: 2300, 12: 2700 };
export const TAMANOS = [3, 6, 9, 12];
export const MAPAS = { colinas: 'Colinas', montanas: 'Montañas', cuevas: 'Cuevas', islas: 'Islas' };
export const NIVELES = ['Fácil', 'Medio', 'Difícil'];
export const TIEMPOS = [20, 30, 45, 60];
export const HP = 100;
export const COLORES = ['#E5484D', '#3E7BFA'];
export const EQUIPOS = ['Rojo', 'Azul'];

export const ARMAS = {
  misil:    { id: 'misil',    nombre: 'Lanzamisiles',      icono: 'lanzamisiles',      tipo: 'carga',    desc: 'Misil con viento. Mantén FUEGO para dar potencia.' },
  escopeta: { id: 'escopeta', nombre: 'Escopeta',          icono: 'escopeta',          tipo: 'rafaga',   desc: 'Dos disparos directos por turno.' },
  granada:  { id: 'granada',  nombre: 'Granada Explosiva', icono: 'granada-explosiva', tipo: 'carga',    temp: true, desc: 'Rebota y explota a los 1–5 s que elijas.' },
  racimo:   { id: 'racimo',   nombre: 'Granada de Racimo', icono: 'granada-racimo',    tipo: 'carga',    temp: true, desc: 'Al explotar suelta 5 bombitas.' },
  sagrada:  { id: 'sagrada',  nombre: 'Granada Sagrada',   icono: 'granada-sagrada',   tipo: 'carga',    temp: true, desc: 'Explosión enorme. ¡Aleluya!' },
  dinamita: { id: 'dinamita', nombre: 'Dinamita',          icono: 'dinamita',          tipo: 'suelta',   desc: 'Se deja a tus pies y explota a los 5 s.' },
  aereo:    { id: 'aereo',    nombre: 'Ataque Aéreo',      icono: 'ataque-aereo',      tipo: 'objetivo', desc: 'Toca el mapa: un avión lanza 5 bombas.' },
  cuerda:   { id: 'cuerda',   nombre: 'Cuerda Ninja',      icono: 'cuerda',            tipo: 'cuerda',   desc: 'Cuélgate, balancéate y sube. ▲▼ acorta y alarga.' },
  tele:     { id: 'tele',     nombre: 'Teletransporte',    icono: 'teletransporte',    tipo: 'objetivo', desc: 'Toca el mapa y el gusano aparece allí.' },
};
export const ORDEN = ['misil', 'escopeta', 'granada', 'racimo', 'sagrada', 'dinamita', 'aereo', 'cuerda', 'tele'];
export const municionInicial = n => ({ misil: null, escopeta: null, granada: null, cuerda: null, racimo: 2 + (n / 3 | 0), sagrada: 1 + (n / 6 | 0), dinamita: 1 + (n / 3 | 0), aereo: 1 + (n / 4 | 0), tele: 1 + (n / 4 | 0) });

// r = radio del cráter · d = daño máximo · e = empuje (px/s)
export const EXPL = {
  misil: { r: 32, d: 48, e: 380 }, granada: { r: 34, d: 50, e: 350 }, racimo: { r: 24, d: 30, e: 270 }, minibomba: { r: 17, d: 18, e: 210 },
  sagrada: { r: 62, d: 75, e: 520 }, dinamita: { r: 58, d: 75, e: 500 }, bomba: { r: 25, d: 28, e: 300 }, ultimo: { r: 18, d: 8, e: 210 }, escopeta: { r: 10, d: 25, e: 150 },
};
const NOMBRES = ['Lombriz Lola', 'Gusi', 'Don Gusano', 'Anélido', 'Reptín', 'Moco', 'Sir Worm', 'Tragón', 'Pepe Pelusa', 'Culebrón', 'Wormy', 'Gusarapo', 'Zigzag', 'Fideo', 'Chicle', 'Barrenita',
  'Mini Boa', 'Tubérculo', 'Pachón', 'Guzmán', 'Rizos', 'Bichejo', 'Gelatina', 'Orugo', 'Sargento Tierra', 'Cabo Barro', 'Capitán Fango', 'Teniente Raíz', 'Mayor Lodo', 'Coronel Humus', 'Comandante Gusi', 'General Fideo',
  'Cadete Moco', 'Soldado Pelusa', 'Doña Lombriz', 'Perico', 'Nacho Gusano', 'Pili', 'Bartolo', 'Kiko'];

/* ---------- utilidades ---------- */
export function rng(semilla) { let a = semilla >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const lerp = (a, b, t) => a + (b - a) * t, suave = t => t * t * (3 - 2 * t), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), num = (v, d = 0) => (Number.isFinite(v) ? v : d);
const R = S => S._r;
const mezclar = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = r() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- terreno ---------- */
function alturas(W, tipo, r) {
  const H = ALTO, h = new Float32Array(W);
  const oct = { colinas: [[620, 85], [300, 42], [140, 15], [62, 6]], montanas: [[440, 150], [220, 92], [105, 42], [50, 18], [24, 7]], cuevas: [[720, 62], [320, 32], [120, 9]], islas: [[520, 86], [230, 40], [100, 12]] }[tipo];
  const base = tipo === 'cuevas' ? H * 0.40 : H * 0.54;
  for (const [wl, amp] of oct) {
    const n = Math.ceil(W / wl) + 3, p = Array.from({ length: n }, () => r() * 2 - 1);
    for (let x = 0; x < W; x++) { const u = x / wl, i = u | 0, f = suave(u - i); h[x] += lerp(p[i], p[i + 1], f) * amp; }
  }
  for (let x = 0; x < W; x++) h[x] = clamp(base + h[x], H * 0.27, H * 0.78);
  if (tipo === 'islas') {
    const n = Math.max(2, Math.round(W / 560)), paso = W / (n + 1);
    for (let g = 1; g <= n; g++) {
      const cx = g * paso + (r() - .5) * paso * .35, gw = 38 + r() * 20, rampa = 80;
      for (let x = Math.max(0, cx - gw - rampa | 0); x < Math.min(W, cx + gw + rampa); x++) { const d = clamp((gw + rampa - Math.abs(x - cx)) / rampa, 0, 1); h[x] = lerp(h[x], H + 80, suave(d)); }
    }
  }
  return h;
}
export function generarMascara(W, tipo, semilla) {
  const r = rng(semilla), H = ALTO, h = alturas(W, tipo, r), mask = new Uint8Array(W * H);
  for (let x = 0; x < W; x++) for (let y = Math.max(0, Math.floor(h[x])); y < H; y++) mask[y * W + x] = 1;
  // plataformas de roca flotantes: relieve extra y sitios donde engancharse con la cuerda para subir
  const nP = Math.round(W / (tipo === 'cuevas' ? 520 : 330));
  for (let k = 0; k < nP; k++) {
    const cx = 140 + r() * (W - 280), ancho = 90 + r() * 110, grosor = 15 + r() * 13, y = Math.max(80, h[cx | 0] - (130 + r() * 130)), onda = r() * 6;
    if (y > H * 0.62) continue;
    for (let t = -ancho / 2; t <= ancho / 2; t += 6) { const f = Math.cos(t / (ancho / 2) * Math.PI / 2); rellenar(mask, W, H, cx + t, y + Math.sin(t * .05 + onda) * 4, grosor * (.45 + .55 * f)); }
  }
  if (tipo === 'cuevas') {
    const n = Math.max(4, W / 230 | 0);
    for (let k = 0; k < n; k++) {
      let x = r() * W, y = h[x | 0] + 70 + r() * (H - h[x | 0] - 190), a = r() * Math.PI * 2;
      for (let s = 0, L = 18 + r() * 24 | 0; s < L; s++) {
        carvar(mask, W, H, x, y, 13 + r() * 9);
        a += (r() - .5) * .9; x = clamp(x + Math.cos(a) * 14, 20, W - 20); y = clamp(y + Math.sin(a) * 10, h[x | 0] + 55, H - 60);
      }
      carvar(mask, W, H, x, y, 30 + r() * 12);
    }
  }
  return { mask, h };
}
export function rellenar(mask, W, H, cx, cy, rad) {
  const r2 = rad * rad, x0 = Math.max(0, Math.floor(cx - rad)), x1 = Math.min(W - 1, Math.ceil(cx + rad)), y0 = Math.max(0, Math.floor(cy - rad)), y1 = Math.min(H - 1, Math.ceil(cy + rad));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy <= r2) mask[y * W + x] = 1; }
}
export function carvar(mask, W, H, cx, cy, rad) {
  const r2 = rad * rad, x0 = Math.max(0, Math.floor(cx - rad)), x1 = Math.min(W - 1, Math.ceil(cx + rad)), y0 = Math.max(0, Math.floor(cy - rad)), y1 = Math.min(H - 1, Math.ceil(cy + rad));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy <= r2) mask[y * W + x] = 0; }
}
export const solido = (S, x, y) => { x = Math.floor(x); y = Math.floor(y); if (x < 0 || x >= S.W) return false; if (y >= S.H) return true; if (y < 0) return false; return S.mask[y * S.W + x] === 1; };
// ¿cabe el cuerpo del gusano con los pies en (x, y)? (y = fila del suelo; el cuerpo ocupa de y-1 a y-17)
export function libre(S, x, y) {
  for (let dy = 1; dy <= 17; dy += 2) for (const dx of [-5, 0, 5]) if (solido(S, x + dx, y - dy)) return false;
  return true;
}
// Apoyado = no cabe un píxel más abajo (misma prueba que la caída, así nunca se «parpadea» entre caer y estar quieto)
const enSuelo = (S, w) => !libre(S, w.x, w.y + 1);
const apoyo = (S, x, y, hw) => solido(S, x, y + 1) || solido(S, x - hw, y + 1) || solido(S, x + hw, y + 1);
export function superficie(S, x, desde = 0) { x = Math.floor(x); for (let y = Math.max(0, desde | 0); y < S.H - 2; y++) if (S.mask[y * S.W + x] === 1) return y; return S.H; }
// Primer sitio apoyable bajo (x, y0): suelo con 26 px libres encima
function suelo(S, x, y0 = 0) { for (let y = Math.max(20, y0 | 0); y < S.H - 30; y++) { if (solido(S, x, y) && !solido(S, x, y - 1)) { let ok = true; for (let k = 2; k <= 26 && ok; k++) if (solido(S, x - 4, y - k) || solido(S, x, y - k) || solido(S, x + 4, y - k)) ok = false; if (ok) return y; } } return -1; }
// Coloca un gusano en una cuesta: sube hasta que cabe el cuerpo y baja hasta apoyarse (-1 si es demasiado empinado)
function asentar(S, x, y) { let k = 0; while (!libre(S, x, y) && k++ < 14) y--; if (!libre(S, x, y)) return -1; while (libre(S, x, y + 1) && y < S.H - 2) y++; return y; }

/* ---------- creación ---------- */
export function crear(cfg0 = {}) {
  const cfg = {
    n: TAMANOS.includes(cfg0.n) ? cfg0.n : 3, mapa: MAPAS[cfg0.mapa] ? cfg0.mapa : 'colinas', modo: cfg0.modo === 'dos' ? 'dos' : 'cpu',
    nivel: clamp(Math.trunc(num(cfg0.nivel, 1)), 0, 2), tiempo: TIEMPOS.includes(cfg0.tiempo) ? cfg0.tiempo : 30, cajas: cfg0.cajas !== false,
    semilla: Number.isInteger(cfg0.semilla) ? cfg0.semilla >>> 0 : (Math.random() * 4294967296) >>> 0,
  };
  const S = base(cfg);
  const g = generarMascara(S.W, cfg.mapa, cfg.semilla); S.mask = g.mask;
  const r = rng(cfg.semilla ^ 0x9E3779B9), total = cfg.n * 2, nom = mezclar(NOMBRES.slice(), r);
  const orden = mezclar(Array.from({ length: total }, (_, i) => i % 2), r), margen = 110, paso = (S.W - margen * 2) / total, xs = mezclar(Array.from({ length: total }, (_, i) => i), r);
  const cont = [0, 0];
  for (let k = 0; k < total; k++) {
    const x0 = margen + (xs[k] + .5) * paso + (r() - .5) * paso * .5; let x = x0, y = -1;
    for (let d = 0; d < S.W && y < 0; d += 6) for (const sg of d ? [1, -1] : [1]) {   // el sitio válido más cercano (las islas y los huecos no valen)
      const xx = clamp(x0 + sg * d, 60, S.W - 60); if (S.gus.some(o => Math.abs(o.x - xx) < 16)) continue;
      let yy = suelo(S, xx, g.h[xx | 0] - 3); if (yy >= 0) yy = asentar(S, xx, yy);
      if (yy >= 0 && yy < S.agua - 30) { x = xx; y = yy; break; }
    }
    if (y < 0) { x = S.W / 2 + k * 18; y = Math.max(40, superficie(S, x, 0) - 2); carvar(S.mask, S.W, S.H, x, y - 9, 22); y = asentar(S, x, y); if (y < 0) y = 60; }
    const e = orden[k];
    S.gus.push({ id: k, eq: e, nombre: nom[k % nom.length] + (k >= nom.length ? ' II' : ''), x, y, vx: 0, vy: 0, hp: HP, vivo: true, muriendo: false, dir: x < S.W / 2 ? 1 : -1, ang: 30, vuela: false, est: 'quieto', cuerda: null, acc: 0, rebote: 0, orden: cont[e]++ });
  }
  for (const w of S.gus) w.dir = r() < .5 ? 1 : -1;
  S.viento = Math.round((r() * 2 - 1) * 8);
  S.turno.eq = r() < .5 ? 0 : 1;
  proximoTurno(S, true);
  return S;
}
function base(cfg) {
  const W = ANCHOS[cfg.n], eq = [0, 1].map(i => ({ nombre: cfg.modo === 'cpu' && i === 1 ? 'CPU' : EQUIPOS[i], color: COLORES[i], cpu: cfg.modo === 'cpu' && i === 1, mun: municionInicial(cfg.n), arma: 'misil', temp: 3, sig: -1 }));
  return {
    v: 1, cfg, W, H: ALTO, mask: null, crateres: [], agua: ALTO - 40, viento: 0, ronda: 1, turnos: 0, gus: [], eq, tumbas: [], cajas: [], proy: [], aviones: [], fx: [], snd: [], reloj: 0,
    turno: { eq: 0, g: -1, fase: 'cambio', t: 1.2, ang: 30, pot: 0, arma: 'misil', temp: 3, disp: 0, usado: false, obj: null, espera: 0, bal: 0, reel: 0, primero: 0 },
    ganador: null, nTumbas: 0, _r: Math.random, subeAgua: false,
  };
}

/* ---------- consultas ---------- */
export const vivos = (S, e) => S.gus.filter(w => w.vivo && (e == null || w.eq === e));
export const activo = S => S.gus[S.turno.g] || null;
export const hpEquipo = (S, e) => S.gus.reduce((a, w) => a + (w.eq === e && w.vivo ? Math.max(0, w.hp) : 0), 0);
export const centro = w => ({ x: w.x, y: w.y - 9 });
export const dirApunte = (w, ang) => { const a = ang * Math.PI / 180; return { x: w.dir * Math.cos(a), y: -Math.sin(a) }; };
export function municion(S, e, id) { const m = S.eq[e].mun[id]; return m === null ? Infinity : (m || 0); }
const sonar = (S, s) => { if (S.snd.length < 60) S.snd.push(s); };
const efecto = (S, f) => { S.fx.push(f); if (S.fx.length > 500) S.fx.splice(0, 250); };

/* ---------- daño y muerte ---------- */
export function herir(S, w, d, causa) {
  if (!w.vivo || d <= 0) return;
  w.hp = Math.max(0, w.hp - d); efecto(S, { t: 'dano', x: w.x, y: w.y - 26, n: Math.round(d), eq: w.eq });
  if (w.hp <= 0) w.muriendo = true;
}
function matar(S, w, ahogado = false) {
  if (!w.vivo) return;
  w.vivo = false; w.muriendo = false; w.hp = 0; w.est = 'muerto'; w.cuerda = null;
  if (ahogado) { efecto(S, { t: 'splash', x: w.x, y: S.agua }); sonar(S, 'splash'); return; }
  efecto(S, { t: 'humo', x: w.x, y: w.y - 8, n: 8 });
  explosion(S, w.x, w.y - 8, EXPL.ultimo, 'ultimo', w.id, true);   // último suspiro (antes de poner la tumba, para no llevársela por delante)
  S.tumbas.push({ x: w.x, y: w.y, vy: 0, tipo: S.nTumbas++ % 3, de: w.id, cae: true, nombre: w.nombre, eq: w.eq });
}

/* ---------- explosiones ---------- */
export function explosion(S, x, y, E, clave, dueno = -1, silencio = false) {
  const r = E.r, rd = r * 1.9;
  carvar(S.mask, S.W, S.H, x, y, r);
  if (S.crateres.length < 900) S.crateres.push([Math.round(x), Math.round(y), r]);
  efecto(S, { t: 'expl', x, y, r, k: clave }); if (!silencio) sonar(S, 'explosion');
  for (const w of S.gus) {
    if (!w.vivo) continue;
    const c = centro(w), dx = c.x - x, dy = c.y - y, d = Math.hypot(dx, dy) - 6;
    if (d >= rd) continue;
    const f = clamp(1 - Math.max(0, d) / rd, 0, 1);
    herir(S, w, Math.max(1, Math.round(E.d * f)), 'expl');
    const m = Math.hypot(dx, dy) || 1, imp = E.e * Math.pow(f, .75);
    if (w.est === 'cuerda') soltarCuerda(S, w);
    w.vx += dx / m * imp; w.vy += (dy / m * imp) - (imp > 120 ? 140 * f : 0); w.vuela = true; w.est = 'vuelo'; w.rebote = 0; w.sinCaida = true;
  }
  S.tumbas = S.tumbas.filter(t => { if (Math.hypot(t.x - x, t.y - 8 - y) < rd * .75) { efecto(S, { t: 'humo', x: t.x, y: t.y - 8, n: 6 }); return false; } return true; });
  for (const c of S.cajas) c.cae = true;
  for (const t of S.tumbas) t.cae = true;
  for (const p of S.proy) if (p.k === 'dinamita' || p.k === 'granada' || p.k === 'racimo' || p.k === 'sagrada') { const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy); if (d < rd && d > 0) { p.vx += dx / d * 160 * (1 - d / rd); p.vy += dy / d * 160 * (1 - d / rd) - 40; } }
}

/* ---------- proyectiles ---------- */
function normalEn(S, x, y) {
  let nx = 0, ny = 0;
  for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, px = x + Math.cos(a) * 4, py = y + Math.sin(a) * 4; if (solido(S, px, py)) { nx -= Math.cos(a); ny -= Math.sin(a); } }
  const m = Math.hypot(nx, ny); return m < .01 ? { x: 0, y: -1 } : { x: nx / m, y: ny / m };
}
const ACEL_V = 6;
export function nuevoProy(k, x, y, vx, vy, extra = {}) {
  const base = { k, x, y, vx, vy, edad: 0, t: 0, rebota: false, e: .45, ang: Math.atan2(vy, vx), dueno: -1, impacto: false, giro: 0 };
  if (k === 'misil') Object.assign(base, { impacto: true, gv: .55, viento: 1 });
  else if (k === 'granada' || k === 'racimo' || k === 'sagrada') Object.assign(base, { rebota: true, gv: 1, e: k === 'sagrada' ? .4 : .5, giro: vx >= 0 ? 6 : -6 });
  else if (k === 'dinamita') Object.assign(base, { rebota: true, gv: 1, e: .08, t: 5 });
  else if (k === 'bomba') Object.assign(base, { impacto: true, gv: 1 });
  else if (k === 'minibomba') Object.assign(base, { impacto: true, rebota: false, gv: 1, viento: .3, t: 2.6 });
  return Object.assign(base, extra);
}
// Avanza un proyectil dt segundos. Devuelve { x, y } si explota (null si sigue).
export function avanzarProy(S, p, dt) {
  p.edad += dt;
  if (p.k === 'granada' || p.k === 'racimo' || p.k === 'sagrada' || p.k === 'dinamita' || p.k === 'minibomba') { p.t -= dt; if (p.t <= 0) return { x: p.x, y: p.y }; }
  p.vy += GRAV * (p.gv || 0) * dt; if (p.viento) p.vx += S.viento * ACEL_V * p.viento * dt;
  const dx = p.vx * dt, dy = p.vy * dt, n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 2.5));
  for (let i = 0; i < n; i++) {
    const nx = p.x + dx / n, ny = p.y + dy / n;
    if (p.impacto) for (const w of S.gus) if (w.vivo && !(w.id === p.dueno && p.edad < .35)) { const c = centro(w); if (Math.abs(c.x - nx) < 9 && Math.abs(c.y - ny) < 12) return { x: nx, y: ny }; }
    if (solido(S, nx, ny)) {
      if (!p.rebota) return { x: nx, y: ny };
      const N = normalEn(S, p.x, p.y), vn = p.vx * N.x + p.vy * N.y;
      if (vn < 0) {
        const e = p.e, tx = p.vx - vn * N.x, ty = p.vy - vn * N.y, fr = N.y < -.6 ? .72 : .9;
        p.vx = tx * fr - e * vn * N.x; p.vy = ty * fr - e * vn * N.y;
        if (Math.hypot(p.vx, p.vy) < 28 && N.y < -.5) { p.vx *= .5; p.vy = 0; }
        p.giro *= .6; if (Math.hypot(p.vx, p.vy) > 60) sonar(S, 'rebote');
      }
      const m = Math.hypot(p.vx, p.vy); if (m < 1) p.vy = 0;
      break;   // se queda donde estaba
    }
    p.x = nx; p.y = ny;
  }
  if (p.rebota && Math.abs(p.vy) < 6 && Math.abs(p.vx) < 14 && solido(S, p.x, p.y + 2)) { p.vx = 0; p.vy = 0; }
  p.ang = p.vx || p.vy ? Math.atan2(p.vy, p.vx) : p.ang; p.rot = (p.rot || 0) + p.giro * dt;
  if (p.x < -400 || p.x > S.W + 400 || p.y > S.H + 60 || p.y < -2500) { p.fuera = true; if (p.y > S.H + 60 && p.y < S.agua + 400) efecto(S, { t: 'splash', x: p.x, y: S.agua }); return { x: p.x, y: p.y, fuera: true }; }
  if (p.agua && p.y > S.agua + 40) return { x: p.x, y: p.y, fuera: true };
  if (p.y > S.agua && !p.agua) { p.agua = true; efecto(S, { t: 'splash', x: p.x, y: S.agua }); sonar(S, 'splash'); if (p.k !== 'misil' && p.k !== 'bomba' && p.k !== 'minibomba') { p.vx *= .3; p.vy = Math.min(p.vy, 60); } else return { x: p.x, y: p.y, fuera: true }; }
  return null;
}
function estallar(S, p, pt) {
  if (pt.fuera) return;
  const k = p.k;
  if (k === 'racimo') {
    explosion(S, pt.x, pt.y, EXPL.racimo, 'racimo', p.dueno);
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * .42 + (R(S)() - .5) * .2, v = 150 + R(S)() * 130; S.proy.push(nuevoProy('minibomba', pt.x, pt.y - 6, Math.cos(a) * v, Math.sin(a) * v, { dueno: p.dueno })); }
  } else explosion(S, pt.x, pt.y, EXPL[k], k, p.dueno);
}

/* ---------- gusanos: física ---------- */
function aterrizar(S, w, vyImp) {
  const h = vyImp * vyImp / (2 * GRAV), umbral = w.sinCaida ? 130 : 88;
  if (!w.inmune && h > umbral) herir(S, w, clamp(Math.round((h - umbral) * .22), 1, 40), 'caida');
  if (vyImp > 230 && w.rebote < 2 && (w.sinCaida || vyImp > 420) && !w.inmune) { w.vy = -vyImp * .3; w.vx *= .65; w.rebote++; return false; }
  w.vuela = false; w.vx = 0; w.vy = 0; w.est = 'quieto'; w.rebote = 0; w.sinCaida = false; w.inmune = false; return true;
}
function fisicaGusano(S, w, dt) {
  if (!w.vivo) return;
  if (w.x < -40 || w.x > S.W + 40) { matar(S, w, true); return; }
  if (w.y - 9 > S.agua) { matar(S, w, true); return; }
  if (w.est === 'cuerda') { fisicaCuerda(S, w, dt); return; }
  if (!w.vuela) { if (!enSuelo(S, w)) { w.vuela = true; w.vx = 0; w.vy = 0; w.est = 'cae'; w.rebote = 0; } else return; }
  w.vy += GRAV * dt;
  const dx = w.vx * dt, dy = w.vy * dt, n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 1.6));
  let bloqX = false;
  for (let i = 0; i < n; i++) {
    if (!bloqX) { const nx = w.x + dx / n; if (libre(S, nx, w.y)) w.x = nx; else { bloqX = true; w.vx *= -.3; } }
    const ny = w.y + dy / n;
    if (libre(S, w.x, ny)) w.y = ny;
    else if (dy > 0) { while (libre(S, w.x, w.y + 1) && w.y < S.H) w.y++; aterrizar(S, w, w.vy); break; }
    else { w.vy = Math.abs(w.vy) * .1; break; }
  }
  if (w.vuela && w.y > S.H + 20) matar(S, w, true);
}
// rebusca si un gusano ha quedado dentro de la tierra (teletransporte, derrumbe)
function desatascar(S, w) { for (let k = 0; k < 80 && !libre(S, w.x, w.y); k++) w.y -= 1; }

export function caminar(S, dir, dt) {
  const w = activo(S), T = S.turno; if (!w || !w.vivo || (T.fase !== 'turno' && T.fase !== 'retirada') || w.est === 'cuerda' || w.vuela) return false;
  w.dir = dir < 0 ? -1 : 1; w.acc += 66 * dt; w.est = 'camina'; let movido = false;
  while (w.acc >= 1) {
    w.acc -= 1; let ok = false;
    for (const sube of [0, 1, 2, 3]) if (libre(S, w.x + w.dir, w.y - sube)) { w.x += w.dir; w.y -= sube; ok = true; break; }
    if (!ok) { w.acc = 0; break; }
    movido = true;
    let b = 0; while (b < 4 && libre(S, w.x, w.y + 1)) { w.y++; b++; }
    if (!enSuelo(S, w)) { w.vuela = true; w.vx = 0; w.vy = 0; w.est = 'cae'; break; }
  }
  recogerCajas(S, w); return movido;
}
// Control en el aire tras un salto: ◀ ▶ empujan al gusano hacia un lado (sin pasar de cierta velocidad)
export function impulsar(S, dir, dt) {
  const w = activo(S), T = S.turno; if (!w || !w.vivo || !w.vuela || w.est !== 'salto' || (T.fase !== 'turno' && T.fase !== 'retirada') || !dir) return false;
  dir = dir < 0 ? -1 : 1; w.dir = dir; if (dir * w.vx < 110) w.vx += dir * 340 * dt; return true;
}
export function saltar(S, tipo = 'adelante', dir = 0) {
  const w = activo(S), T = S.turno; if (!w || !w.vivo || (T.fase !== 'turno' && T.fase !== 'retirada')) return false;
  if (w.est === 'cuerda') { soltarCuerda(S, w); w.vy -= 120; return true; }
  if (w.vuela) return false;
  if (dir) w.dir = dir < 0 ? -1 : 1;
  if (tipo === 'alto') { w.vx = dir ? w.dir * 70 : 0; w.vy = -430; } else { w.vx = w.dir * 138; w.vy = -300; }   // alto: recto hacia arriba, o inclinado si se pulsa ◀ ▶
  w.vuela = true; w.est = 'salto'; w.rebote = 0; w.sinCaida = false; sonar(S, 'salto'); return true;
}
export function apuntar(S, delta) { const T = S.turno; T.ang = clamp(T.ang + delta, -80, 88); const w = activo(S); if (w) w.ang = T.ang; }
export function dirigir(S, dir) { const w = activo(S); if (w && w.vivo && !w.vuela) w.dir = dir < 0 ? -1 : 1; else if (w && w.est === 'cuerda') w.dir = dir < 0 ? -1 : 1; }

/* ---------- cuerda ninja ---------- */
export function soltarCuerda(S, w) {
  if (w.est !== 'cuerda') return; w.cuerda = null; w.est = 'vuelo'; w.vuela = true; w.sinCaida = false; w.rebote = 0;
  const v = Math.hypot(w.vx, w.vy); if (v > 760) { w.vx *= 760 / v; w.vy *= 760 / v; }
}
function lanzarCuerda(S, w) {
  const c = { x: w.x, y: w.y - 12 }, d = dirApunte(w, S.turno.ang);
  for (let s = 6; s <= 520; s += 2) {
    const px = c.x + d.x * s, py = c.y + d.y * s;
    if (solido(S, px, py)) {
      const ax = c.x + d.x * (s - 2), ay = c.y + d.y * (s - 2), L = Math.hypot(ax - c.x, ay - c.y);
      if (L < 14) break;
      w.est = 'cuerda'; w.vuela = false; w.cuerda = { ax, ay, L };
      efecto(S, { t: 'gancho', x: c.x, y: c.y, ax, ay }); sonar(S, 'cuerda'); return true;
    }
    if (py > S.agua + 30 || px < -100 || px > S.W + 100) break;
  }
  efecto(S, { t: 'gancho', x: c.x, y: c.y, ax: c.x + d.x * 520, ay: c.y + d.y * 520, fallo: true }); sonar(S, 'error'); return false;
}
function segmentoLibre(S, x0, y0, x1, y1, saltoFinal = 5) {
  const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.floor((L - saltoFinal) / 3));
  for (let i = 1; i <= n; i++) { const t = i / n * (L - saltoFinal) / L; if (solido(S, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; }
  return true;
}
function fisicaCuerda(S, w, dt) {
  const K = w.cuerda, T = S.turno, esActivo = activo(S) === w; if (!K) { soltarCuerda(S, w); return; }
  const bal = esActivo ? T.bal : 0, reel = esActivo ? T.reel : 0;
  K.L = clamp(K.L + reel * 125 * dt, 22, 430);
  const cx = w.x, cy = w.y - 9;
  w.vy += GRAV * dt * .95; w.vx += bal * 420 * dt; w.vx *= Math.pow(.9996, dt * 120); w.vy *= Math.pow(.9996, dt * 120);
  let nx = cx + w.vx * dt, ny = cy + w.vy * dt;
  const d = Math.hypot(nx - K.ax, ny - K.ay);
  if (d > K.L) { nx = K.ax + (nx - K.ax) * K.L / d; ny = K.ay + (ny - K.ay) * K.L / d; }
  if (!libre(S, nx, ny + 9)) {
    if (libre(S, nx, cy + 9)) { ny = cy; w.vy *= -.2; }
    else if (libre(S, cx, ny + 9)) { nx = cx; w.vx *= -.2; }
    else { nx = cx; ny = cy; w.vx *= .3; w.vy *= .3; }
  }
  w.vx = (nx - cx) / dt; w.vy = (ny - cy) / dt; w.x = nx; w.y = ny + 9;
  if (Math.abs(w.vx) > 12) w.dir = w.vx > 0 ? 1 : -1;
  if (!segmentoLibre(S, nx, ny, K.ax, K.ay)) { soltarCuerda(S, w); return; }   // la cuerda se corta si la tierra se interpone
  if (w.y - 9 > S.agua) { matar(S, w, true); return; }
  if (esActivo) recogerCajas(S, w);
}
export function balancear(S, b) { S.turno.bal = clamp(b, -1, 1); }
export function recoger(S, r) { S.turno.reel = clamp(r, -1, 1); }

/* ---------- cajas y tumbas ---------- */
function recogerCajas(S, w) {
  for (let i = S.cajas.length - 1; i >= 0; i--) {
    const c = S.cajas[i]; if (c.cae || Math.abs(c.x - w.x) > 15 || Math.abs((c.y - 8) - (w.y - 9)) > 18) continue;
    S.cajas.splice(i, 1); const e = S.eq[w.eq];
    if (c.tipo === 'salud') { const a = Math.min(HP - w.hp, c.n); w.hp += a; efecto(S, { t: 'texto', x: w.x, y: w.y - 30, txt: `+${a} ❤️`, c: '#2ECC71' }); }
    else { e.mun[c.arma] = (e.mun[c.arma] || 0) + c.n; efecto(S, { t: 'texto', x: w.x, y: w.y - 30, txt: `+${c.n} ${ARMAS[c.arma].nombre}`, c: '#F1C40F' }); }
    sonar(S, 'caja');
  }
}
function soltarCaja(S) {
  const r = R(S); if (S.cajas.length >= 2) return;
  for (let t = 0; t < 30; t++) {
    const x = 80 + r() * (S.W - 160), y = suelo(S, x, 0); if (y < 0 || y > S.agua - 20) continue;
    const q = r(), c = q < .4 ? { tipo: 'salud', n: 25 } : { tipo: 'arma', arma: ['racimo', 'sagrada', 'dinamita', 'aereo', 'tele'][r() * 5 | 0], n: 1 + (r() < .35 ? 1 : 0) };
    S.cajas.push({ x, y: -30, vy: 0, cae: true, ...c }); return;
  }
}
function fisicaObjetos(S, dt) {
  for (const o of S.cajas) {
    if (!o.cae) { if (!apoyo(S, o.x, o.y, 6)) { o.cae = true; o.vy = 0; } continue; }
    o.vy = o.paracaidas === false ? o.vy + GRAV * dt : Math.min(o.vy + 300 * dt, 95);
    let ny = o.y + o.vy * dt; if (o.y < 0 && ny < 0) { o.y = ny; continue; }
    if (apoyo(S, o.x, ny, 6)) { while (!apoyo(S, o.x, o.y, 6) && o.y < S.H) o.y += .5; o.cae = false; o.vy = 0; o.paracaidas = undefined; } else o.y = ny;
    if (o.y > S.agua) o.hundida = true;
  }
  S.cajas = S.cajas.filter(c => !c.hundida);
  for (const t of S.tumbas) {
    if (!t.cae) { if (!apoyo(S, t.x, t.y, 5)) { t.cae = true; t.vy = 0; } continue; }
    t.vy += GRAV * dt; const ny = t.y + t.vy * dt;
    if (apoyo(S, t.x, ny, 5)) { while (!apoyo(S, t.x, t.y, 5) && t.y < S.H) t.y += .5; t.cae = false; t.vy = 0; } else t.y = ny;
    if (t.y > S.agua + 10) t.hundida = true;
  }
  const antes = S.tumbas.length; S.tumbas = S.tumbas.filter(t => !t.hundida); if (S.tumbas.length < antes) sonar(S, 'splash');
}

/* ---------- aviones ---------- */
function fisicaAviones(S, dt) {
  for (const a of S.aviones) {
    a.x += a.dir * 430 * dt;
    while (a.sig < 5 && (a.dir > 0 ? a.x >= a.tx + (a.sig - 2) * 42 - 34 : a.x <= a.tx - (a.sig - 2) * 42 + 34)) {
      S.proy.push(nuevoProy('bomba', a.x, a.y + 14, a.dir * 70, 20, { dueno: a.dueno })); a.sig++; sonar(S, 'bomba');
    }
    if (a.x < -900 || a.x > S.W + 900) a.fin = true;
  }
  S.aviones = S.aviones.filter(a => !a.fin);
}

/* ---------- armas ---------- */
export function elegirArma(S, id) {
  const T = S.turno; if (!ARMAS[id] || (T.fase !== 'turno' && T.fase !== 'retirada')) return false;
  if (municion(S, T.eq, id) <= 0) return false;
  if (T.usado && ARMAS[id].tipo !== 'cuerda') return false;
  T.arma = id; T.obj = null; T.pot = 0; S.eq[T.eq].arma = id; return true;
}
export function ajustarTemp(S, t) { const T = S.turno; T.temp = clamp(Math.round(t), 1, 5); S.eq[T.eq].temp = T.temp; }
export function fijarObjetivo(S, x, y) { const T = S.turno; if (ARMAS[T.arma].tipo !== 'objetivo' || T.usado) return false; T.obj = { x: clamp(x, 0, S.W), y: clamp(y, 0, S.H) }; return true; }
export function puedeDisparar(S) {
  const T = S.turno, w = activo(S); if (!w || !w.vivo || w.muriendo) return false;
  if (T.fase !== 'turno' && T.fase !== 'retirada') return false;
  const A = ARMAS[T.arma]; if (T.usado && A.tipo !== 'cuerda') return false;
  if (municion(S, T.eq, T.arma) <= 0) return false;
  if (A.tipo === 'objetivo' && !T.obj) return false;
  if (w.vuela && w.est !== 'cuerda' && A.tipo !== 'cuerda') return false;
  return true;
}
// Proyectil de un lanzamiento (lo usa también la CPU para simular antes de disparar)
export function crearLanzamiento(w, id, ang, pot, temp = 3) {
  const d = dirApunte(w, ang), c = { x: w.x, y: w.y - 10 };
  if (id === 'misil') { const v = 220 + 660 * pot; return nuevoProy('misil', c.x + d.x * 12, c.y + d.y * 12, d.x * v, d.y * v, { dueno: w.id }); }
  const v = 110 + 600 * pot; return nuevoProy(id, c.x + d.x * 10, c.y + d.y * 10, d.x * v, d.y * v, { dueno: w.id, t: temp });
}
function gastar(S, id) { const e = S.eq[S.turno.eq]; if (e.mun[id] !== null) e.mun[id] = Math.max(0, e.mun[id] - 1); }
function aRetirada(S, seg = 3.5) { const T = S.turno; T.usado = true; T.fase = 'retirada'; T.t = seg; T.pot = 0; }
// Dispara el arma elegida. `pot` 0..1 para armas de carga.
export function disparar(S, pot = S.turno.pot) {
  const T = S.turno, w = activo(S); if (!puedeDisparar(S)) return false;
  const A = ARMAS[T.arma], d = dirApunte(w, T.ang), c = { x: w.x, y: w.y - 10 }, id = T.arma;
  if (A.tipo === 'cuerda') { T.pot = 0; return lanzarCuerda(S, w); }
  if (w.est === 'cuerda') soltarCuerda(S, w);
  pot = clamp(pot, 0.04, 1);
  if (id === 'misil') {
    S.proy.push(crearLanzamiento(w, id, T.ang, pot, T.temp)); sonar(S, 'misil'); gastar(S, id); aRetirada(S);
  } else if (id === 'granada' || id === 'racimo' || id === 'sagrada') {
    S.proy.push(crearLanzamiento(w, id, T.ang, pot, T.temp)); sonar(S, 'lanzar'); gastar(S, id); aRetirada(S);
  } else if (id === 'dinamita') {
    S.proy.push(nuevoProy('dinamita', w.x + w.dir * 7, w.y - 9, w.dir * 26, -40, { dueno: w.id })); sonar(S, 'lanzar'); gastar(S, id); aRetirada(S, 5.2);
  } else if (id === 'escopeta') {
    disparoEscopeta(S, w, c, d); T.disp++; sonar(S, 'disparo'); if (T.disp >= 2) aRetirada(S, 3.2);
  } else if (id === 'aereo') {
    const tx = T.obj.x, dir = tx < S.W / 2 ? 1 : -1;
    S.aviones.push({ x: tx - dir * 900, y: 36, dir, tx, sig: 0, dueno: w.id }); sonar(S, 'avion'); gastar(S, id); aRetirada(S, 4);
  } else if (id === 'tele') {
    teletransportar(S, w, T.obj.x, T.obj.y); gastar(S, id); aRetirada(S, 3);
  }
  T.obj = (id === 'aereo' || id === 'tele') ? null : T.obj; T.pot = 0;
  if (municion(S, T.eq, id) <= 0) { S.eq[T.eq].arma = 'misil'; T.arma = 'misil'; }
  return true;
}
function disparoEscopeta(S, w, c, d) {
  efecto(S, { t: 'fogonazo', x: c.x + d.x * 14, y: c.y + d.y * 14 });
  for (let s = 12; s <= 340; s += 2) {
    const px = c.x + d.x * s, py = c.y + d.y * s;
    for (const o of S.gus) { if (!o.vivo || o.id === w.id) continue; const oc = centro(o); if (Math.abs(oc.x - px) < 8 && Math.abs(oc.y - py) < 10) { herir(S, o, 25, 'bala'); if (o.est === 'cuerda') soltarCuerda(S, o); o.vx += d.x * 150; o.vy += d.y * 150 - 90; o.vuela = true; o.est = 'vuelo'; o.sinCaida = true; efecto(S, { t: 'traza', x: c.x, y: c.y, x2: px, y2: py }); efecto(S, { t: 'chispa', x: px, y: py, n: 6, c: '#c0392b' }); return; } }
    if (solido(S, px, py)) { carvar(S.mask, S.W, S.H, px, py, EXPL.escopeta.r); if (S.crateres.length < 900) S.crateres.push([Math.round(px), Math.round(py), EXPL.escopeta.r]); efecto(S, { t: 'traza', x: c.x, y: c.y, x2: px, y2: py }); efecto(S, { t: 'expl', x: px, y: py, r: EXPL.escopeta.r, k: 'escopeta' }); for (const t of S.tumbas) t.cae = true; for (const k of S.cajas) k.cae = true; return; }
  }
  efecto(S, { t: 'traza', x: c.x, y: c.y, x2: c.x + d.x * 340, y2: c.y + d.y * 340 });
}
export function teletransportar(S, w, x, y) {
  efecto(S, { t: 'tele', x: w.x, y: w.y - 9 });
  if (w.est === 'cuerda') soltarCuerda(S, w);
  x = clamp(x, 14, S.W - 14); y = clamp(y, 20, S.H - 10);
  w.x = x; w.y = y; w.vx = 0; w.vy = 0; w.vuela = true; w.est = 'cae'; w.sinCaida = false; w.inmune = true; w.rebote = 0;
  // si cae dentro de tierra, sube hasta un hueco; después cae por su propio peso (sin daño)
  if (!libre(S, w.x, w.y)) { let k = 0; while (!libre(S, w.x, w.y) && k++ < 400) w.y -= 1; }
  efecto(S, { t: 'tele', x: w.x, y: w.y - 9 }); sonar(S, 'tele');
}
export function terminarTurno(S) {
  const T = S.turno; if (T.fase !== 'turno' && T.fase !== 'retirada') return false;
  T.fase = 'resolver'; T.espera = 0; T.pot = 0; T.bal = 0; T.reel = 0; return true;
}

/* ---------- turnos ---------- */
function proximoVivo(S, e) {
  const l = S.gus.filter(w => w.eq === e && w.vivo).sort((a, b) => a.orden - b.orden); if (!l.length) return null;
  const q = S.eq[e], sig = l.find(w => w.orden > q.sig) || l[0]; q.sig = sig.orden; return sig;
}
export function proximoTurno(S, primero = false) {
  const T = S.turno;
  if (!primero) T.eq = 1 - T.eq;
  let w = proximoVivo(S, T.eq); if (!w) { T.eq = 1 - T.eq; w = proximoVivo(S, T.eq); }
  if (!w) { S.ganador = -1; T.fase = 'fin'; return; }
  S.turnos++;
  if (primero) T.primero = T.eq; else if (T.eq === T.primero) S.ronda++;
  Object.assign(T, { g: w.id, fase: 'cambio', t: 1.5, disp: 0, usado: false, obj: null, espera: 0, bal: 0, reel: 0, pot: 0, ang: w.ang, temp: S.eq[T.eq].temp });
  T.arma = municion(S, T.eq, S.eq[T.eq].arma) > 0 ? S.eq[T.eq].arma : 'misil';
  S.guardarPendiente = true;
}
function ganadorActual(S) { const a = vivos(S, 0).length, b = vivos(S, 1).length; return a && b ? null : a ? 0 : b ? 1 : -1; }
function actividad(S) {
  if (S.proy.length || S.aviones.length) return true;
  for (const w of S.gus) if (w.vivo && (w.vuela || w.est === 'cuerda')) return true;
  for (const t of S.tumbas) if (t.cae) return true;
  for (const c of S.cajas) if (c.cae) return true;
  return false;
}
function finDeTurno(S) {
  const g = ganadorActual(S); if (g !== null) { S.ganador = g; S.turno.fase = 'fin'; S.guardarPendiente = true; return; }
  // muerte súbita: tras la ronda 9 el agua sube un poco en cada turno
  if (S.ronda >= 9 && S.turnos % 2 === 0) { S.agua = Math.max(260, S.agua - 14); S.subeAgua = true; efecto(S, { t: 'aviso', txt: '🌊 ¡Sube el agua!' }); } else S.subeAgua = false;
  if (S.cfg.cajas && R(S)() < .42) soltarCaja(S);
  const v = S.viento + Math.round((R(S)() * 2 - 1) * 5); S.viento = clamp(v, -10, 10);
  proximoTurno(S);
}

/* ---------- bucle ---------- */
export function paso(S, dtReal) {
  if (S.turno.fase === 'fin') { S.reloj += dtReal; fisicaMundo(S, Math.min(dtReal, .05)); return; }
  const dt = Math.min(dtReal, .06), n = Math.max(1, Math.ceil(dt / (1 / 80)));
  for (let i = 0; i < n; i++) sub(S, dt / n);
}
function fisicaMundo(S, dt) {
  for (const w of S.gus) fisicaGusano(S, w, dt);
  fisicaProyectiles(S, dt); fisicaAviones(S, dt); fisicaObjetos(S, dt);
}
function fisicaProyectiles(S, dt) {
  for (let i = 0; i < S.proy.length; i++) {
    const p = S.proy[i], pt = avanzarProy(S, p, dt);
    if (pt) { p.fin = true; estallar(S, p, pt); }
  }
  if (S.proy.some(p => p.fin)) S.proy = S.proy.filter(p => !p.fin);
}
function sub(S, dt) {
  S.reloj += dt; const T = S.turno, w = activo(S);
  fisicaMundo(S, dt);
  if (w && w.vivo && (T.fase === 'turno' || T.fase === 'retirada')) recogerCajas(S, w);
  if (T.fase === 'cambio') { T.t -= dt; if (T.t <= 0) { T.fase = 'turno'; T.t = S.cfg.tiempo; const a = activo(S); if (a) { a.acc = 0; T.ang = a.ang; } } return; }
  if (T.fase === 'turno' || T.fase === 'retirada') {
    if (!w || !w.vivo || w.muriendo) { terminarTurno(S); return; }
    T.t -= dt; if (T.t <= 0) terminarTurno(S);
    return;
  }
  if (T.fase === 'resolver') {
    if (w && w.est === 'cuerda') soltarCuerda(S, w);
    if (actividad(S)) { T.espera = 0; return; }
    T.espera += dt; if (T.espera < .7) return;
    const m = S.gus.find(g => g.vivo && g.hp <= 0);
    if (m) { matar(S, m); T.espera = 0; return; }
    finDeTurno(S);
  }
}

/* ---------- guardado ---------- */
export function guardable(S) {
  return {
    v: 1, cfg: { ...S.cfg }, crateres: S.crateres.slice(0, 900), agua: S.agua, viento: S.viento, ronda: S.ronda, turnos: S.turnos, nTumbas: S.nTumbas,
    gus: S.gus.map(w => ({ id: w.id, eq: w.eq, nombre: w.nombre, x: Math.round(w.x * 10) / 10, y: Math.round(w.y * 10) / 10, hp: Math.round(w.hp), vivo: w.vivo, dir: w.dir, ang: Math.round(w.ang), orden: w.orden })),
    eq: S.eq.map(e => ({ mun: { ...e.mun }, arma: e.arma, temp: e.temp, sig: e.sig })),
    tumbas: S.tumbas.map(t => ({ x: Math.round(t.x), y: Math.round(t.y), tipo: t.tipo, de: t.de, nombre: t.nombre, eq: t.eq })),
    cajas: S.cajas.filter(c => !c.cae).map(c => ({ x: Math.round(c.x), y: Math.round(c.y), tipo: c.tipo, n: c.n, arma: c.arma })),
    turno: { eq: S.turno.eq, g: S.turno.g, primero: S.turno.primero }, ganador: S.ganador,
  };
}
export function validar(d) {
  if (!d || typeof d !== 'object' || d.v !== 1 || !d.cfg || typeof d.cfg !== 'object') return null;
  const c = d.cfg;
  if (!TAMANOS.includes(c.n) || !Object.hasOwn(MAPAS, c.mapa) || !Number.isInteger(c.semilla) || c.semilla < 0 || c.semilla > 4294967295) return null;
  if (!Array.isArray(d.gus) || d.gus.length !== c.n * 2 || !Array.isArray(d.eq) || d.eq.length !== 2) return null;
  const cfg = { n: c.n, mapa: c.mapa, modo: c.modo === 'dos' ? 'dos' : 'cpu', nivel: clamp(Math.trunc(num(c.nivel, 1)), 0, 2), tiempo: TIEMPOS.includes(c.tiempo) ? c.tiempo : 30, cajas: c.cajas !== false, semilla: c.semilla };
  const W = ANCHOS[cfg.n], gus = [];
  for (let i = 0; i < d.gus.length; i++) {
    const w = d.gus[i]; if (!w || typeof w !== 'object' || w.id !== i || (w.eq !== 0 && w.eq !== 1) || typeof w.nombre !== 'string') return null;
    if (!Number.isFinite(w.x) || !Number.isFinite(w.y) || !Number.isFinite(w.hp) || typeof w.vivo !== 'boolean') return null;
    gus.push({ id: i, eq: w.eq, nombre: w.nombre.slice(0, 30), x: clamp(w.x, -30, W + 30), y: clamp(w.y, -200, ALTO + 40), hp: clamp(Math.round(w.hp), 0, HP), vivo: w.vivo && w.hp > 0, dir: w.dir < 0 ? -1 : 1, ang: clamp(Math.round(num(w.ang, 30)), -80, 88), orden: Math.max(0, Math.trunc(num(w.orden))) });
  }
  if ((gus.filter(w => w.eq === 0).length !== cfg.n) || (gus.filter(w => w.eq === 1).length !== cfg.n)) return null;
  const eq = d.eq.map(e => {
    if (!e || typeof e !== 'object' || !e.mun || typeof e.mun !== 'object') return null;
    const mun = {}; for (const k of ORDEN) { const v = Object.hasOwn(e.mun, k) ? e.mun[k] : undefined; mun[k] = v === null ? null : clamp(Math.trunc(num(v)), 0, 99); }
    for (const k of ['misil', 'escopeta', 'granada', 'cuerda']) mun[k] = null;
    return { mun, arma: Object.hasOwn(ARMAS, e.arma) ? e.arma : 'misil', temp: clamp(Math.trunc(num(e.temp, 3)), 1, 5), sig: Math.trunc(num(e.sig, -1)) };
  });
  if (eq.some(e => !e)) return null;
  const crateres = (Array.isArray(d.crateres) ? d.crateres : []).slice(0, 900).filter(a => Array.isArray(a) && a.length === 3 && a.every(Number.isFinite)).map(a => [clamp(a[0], -100, W + 100), clamp(a[1], -100, ALTO + 100), clamp(a[2], 4, 120)]);
  const tumbas = (Array.isArray(d.tumbas) ? d.tumbas : []).slice(0, 60).filter(t => t && Number.isFinite(t.x) && Number.isFinite(t.y)).map(t => ({ x: clamp(t.x, 0, W), y: clamp(t.y, 0, ALTO), tipo: clamp(Math.trunc(num(t.tipo)), 0, 2), de: Math.trunc(num(t.de, -1)), nombre: typeof t.nombre === 'string' ? t.nombre.slice(0, 30) : '', eq: t.eq === 1 ? 1 : 0 }));
  const cajas = (Array.isArray(d.cajas) ? d.cajas : []).slice(0, 4).filter(k => k && Number.isFinite(k.x) && Number.isFinite(k.y) && (k.tipo === 'salud' || (k.tipo === 'arma' && Object.hasOwn(ARMAS, k.arma)))).map(k => ({ x: clamp(k.x, 0, W), y: clamp(k.y, 0, ALTO), tipo: k.tipo, n: clamp(Math.trunc(num(k.n, 1)), 1, 99), arma: k.tipo === 'arma' ? k.arma : undefined }));
  const t = d.turno && typeof d.turno === 'object' ? d.turno : {};
  const gt = Number.isInteger(t.g) && t.g >= 0 && t.g < gus.length ? t.g : -1;
  return { v: 1, cfg, crateres, agua: clamp(num(d.agua, ALTO - 40), 200, ALTO - 40), viento: clamp(Math.round(num(d.viento)), -10, 10), ronda: clamp(Math.trunc(num(d.ronda, 1)), 1, 999), turnos: Math.max(0, Math.trunc(num(d.turnos))), nTumbas: Math.max(0, Math.trunc(num(d.nTumbas))),
    gus, eq, tumbas, cajas, turno: { eq: t.eq === 1 ? 1 : 0, g: gt, primero: t.primero === 1 ? 1 : 0 }, ganador: d.ganador === 0 || d.ganador === 1 || d.ganador === -1 ? d.ganador : null };
}
// Reconstruye el estado completo (máscara incluida) desde lo guardado. Empieza el turno guardado de nuevo.
export function restaurar(d) {
  const S = base(d.cfg), g = generarMascara(S.W, d.cfg.mapa, d.cfg.semilla); S.mask = g.mask;
  for (const [x, y, r] of d.crateres) { carvar(S.mask, S.W, S.H, x, y, r); S.crateres.push([x, y, r]); }
  S.agua = d.agua; S.viento = d.viento; S.ronda = d.ronda; S.turnos = d.turnos; S.nTumbas = d.nTumbas; S.ganador = d.ganador;
  S.gus = d.gus.map(w => ({ ...w, vx: 0, vy: 0, muriendo: false, vuela: false, est: w.vivo ? 'quieto' : 'muerto', cuerda: null, acc: 0, rebote: 0 }));
  S.eq.forEach((e, i) => Object.assign(e, d.eq[i]));
  S.tumbas = d.tumbas.map(t => ({ ...t, vy: 0, cae: true })); S.cajas = d.cajas.map(c => ({ ...c, vy: 0, cae: true, paracaidas: false }));
  S.turno.eq = d.turno.eq; S.turno.primero = d.turno.primero;
  for (const w of S.gus) if (w.vivo) { desatascar(S, w); w.vuela = !enSuelo(S, w); if (w.vuela) w.est = 'cae'; }
  if (S.ganador !== null) { S.turno.fase = 'fin'; return S; }
  const act = d.turno.g >= 0 && S.gus[d.turno.g] && S.gus[d.turno.g].vivo ? S.gus[d.turno.g] : null;
  if (act) { const q = S.eq[act.eq]; q.sig = act.orden; S.turno.eq = act.eq; Object.assign(S.turno, { g: act.id, fase: 'cambio', t: 1.2, disp: 0, usado: false, obj: null, espera: 0, pot: 0, ang: act.ang, temp: q.temp, arma: municion(S, act.eq, q.arma) > 0 ? q.arma : 'misil' }); }
  else { proximoTurno(S, true); }
  S.guardarPendiente = false; return S;
}
export const resultado = S => S.ganador;
