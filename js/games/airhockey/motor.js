// Motor del Air Hockey (sin DOM, probable con Node). Mesa vertical: el jugador 0 defiende la portería de abajo y el 1 (CPU o
// segunda persona) la de arriba. Física con subpasos para que el disco no atraviese mazos ni bandas a gran velocidad.
export const ANCHO = 600, ALTO = 1000, PORTERIA = 260, R_DISCO = 26, R_MAZO = 44;
export const NIVELES = { facil: { nombre: 'Fácil', vel: 850, error: 95, reaccion: .36 }, medio: { nombre: 'Medio', vel: 1350, error: 50, reaccion: .2 }, dificil: { nombre: 'Difícil', vel: 2000, error: 16, reaccion: .08 } };
export const METAS = [5, 7, 10];
export const MODOS = { cpu: 'Contra la CPU', dos: '2 jugadores' };
const V_MAX = 2300, V_MAZO_HUMANO = 4200, REBOTE_BANDA = .9, REBOTE_MAZO = .92, ROCE = .72;   // ROCE: velocidad que queda tras 1 s
const PAUSA_GOL = 1.1;

export function crear({ modo = 'cpu', nivel = 'medio', meta = 7 } = {}) {
  const S = { modo: MODOS[modo] ? modo : 'cpu', nivel: NIVELES[nivel] ? nivel : 'medio', meta: METAS.includes(meta) ? meta : 7, goles: [0, 0],
    disco: { x: ANCHO / 2, y: ALTO / 2, vx: 0, vy: 0 }, m: [{ x: ANCHO / 2, y: ALTO - 110, vx: 0, vy: 0 }, { x: ANCHO / 2, y: 110, vx: 0, vy: 0 }],
    fase: 'listo', espera: 0, saca: Math.random() < .5 ? 0 : 1, golDe: -1, golpes: 0, maxVel: 0, tiempo: 0, cpu: { x: ANCHO / 2, y: 110, t: 0 } };
  colocarSaque(S);
  return S;
}
// El disco se pone parado en el campo de quien saca (el que ha recibido el último gol)
function colocarSaque(S) {
  S.disco = { x: ANCHO / 2, y: S.saca === 0 ? ALTO * .68 : ALTO * .32, vx: 0, vy: 0 };
}
const dentro = (v, a, b) => Math.max(a, Math.min(b, v));
// Límites de cada mazo: su mitad de la mesa
const limites = j => ({ x0: R_MAZO, x1: ANCHO - R_MAZO, y0: j === 0 ? ALTO / 2 + R_MAZO : R_MAZO, y1: j === 0 ? ALTO - R_MAZO : ALTO / 2 - R_MAZO });

// Mueve el mazo j hacia el objetivo con una velocidad máxima (el dedo puede ir más rápido de lo que se permite)
function moverMazo(S, j, obj, vmax, dt) {
  const m = S.m[j], L = limites(j);
  if (!obj) { m.vx = 0; m.vy = 0; return; }
  const tx = dentro(obj.x, L.x0, L.x1), ty = dentro(obj.y, L.y0, L.y1), dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy), paso = vmax * dt;
  const k = d > paso ? paso / d : 1, nx = m.x + dx * k, ny = m.y + dy * k;
  m.vx = (nx - m.x) / dt; m.vy = (ny - m.y) / dt; m.x = nx; m.y = ny;
}

// IA (también sirve para simular partidas CPU contra CPU en las pruebas). Se calcula en el «marco» del jugador j:
// su portería siempre arriba (y pequeña). Defiende alineada con el disco; si el disco está en su campo, se coloca detrás
// (entre el disco y su portería, rodeándolo por un lado si hace falta) y lo golpea pasando a través hacia la portería rival.
export function objetivoIA(S, j, dt, nivel = S.nivel, mem = S.cpu) {
  const N = NIVELES[nivel], c = mem, voltea = j === 0, Y = y => (voltea ? ALTO - y : y);
  const d = { x: S.disco.x, y: Y(S.disco.y), vx: S.disco.vx, vy: voltea ? -S.disco.vy : S.disco.vy }, m = { x: S.m[j].x, y: Y(S.m[j].y) };
  c.t -= dt;
  if (c.t > 0) return { x: c.x, y: Y(c.y) };                     // tiempo de reacción: mantiene el último objetivo un rato
  c.t = N.reaccion * (.6 + Math.random() * .8);
  const err = (Math.random() - .5) * 2 * N.error, dist = R_DISCO + R_MAZO;
  const enSuCampo = d.y < ALTO / 2, viene = d.vy < -40;
  let x, y;
  if (d.y < dist + 14) {                                       // disco pegado a su fondo: se aparta a un lado y lo deja salir
    x = d.x + (d.x < ANCHO / 2 ? 1 : -1) * (dist + 10); y = R_MAZO;
  } else if (enSuCampo && (Math.abs(d.vy) < 520 || d.y < m.y + 30)) {
    const gx = ANCHO / 2 + err * 2, dir = Math.atan2(ALTO - d.y, gx - d.x), ux = Math.cos(dir), uy = Math.sin(dir);
    const rx = d.x - m.x, ry = d.y - m.y, delante = rx * ux + ry * uy, lado = Math.abs(rx * uy - ry * ux);
    if (delante > 0 && lado < 24 && m.y < d.y - 8) { x = d.x + ux * 160; y = d.y + uy * 160; c.t = .04; }          // ¡golpe!
    else if (m.y > d.y - dist * .9) { x = d.x + (m.x < d.x ? -1 : 1) * (dist + 34); y = d.y - dist * 1.3; c.t = .04; }  // rodearlo por un lado
    else { x = d.x - ux * (dist + 16); y = d.y - uy * (dist + 16); c.t = Math.min(c.t, .06); }                    // colocarse detrás
  } else if (viene) {
    // defensa: predice dónde cruzará el disco su línea (con rebotes en las bandas) y se pone delante
    const yDef = 175, t = (d.y - yDef) / -d.vy;
    let px = d.x + d.vx * t; const ancho = ANCHO - 2 * R_DISCO;
    px -= R_DISCO; px = ((px % (2 * ancho)) + 2 * ancho) % (2 * ancho); if (px > ancho) px = 2 * ancho - px; px += R_DISCO;
    x = ANCHO / 2 + (px - ANCHO / 2) * .9 + err; y = yDef;
  } else { x = ANCHO / 2 + (d.x - ANCHO / 2) * .45 + err; y = 130; }   // espera delante de su portería
  c.x = x; c.y = y;
  return { x, y: Y(y) };
}
export const objetivoCPU = (S, dt) => objetivoIA(S, 1, dt);

// Avanza dt segundos. objetivos[j] = { x, y } (dedo o ratón) o null. Devuelve eventos: ['golpe', 'banda', 'gol0', 'gol1', 'fin']
export function avanzar(S, dt, objetivos = []) {
  const ev = [];
  if (S.fase === 'fin' || S.fase === 'pausa') return ev;
  S.tiempo += dt;
  if (S.fase === 'gol') {                                       // pausa tras un gol: los mazos se pueden mover, el disco espera
    S.espera -= dt;
    for (let j = 0; j < 2; j++) moverMazo(S, j, objetivos[j] || (j === 1 && S.modo === 'cpu' ? { x: ANCHO / 2, y: 110 } : null), V_MAZO_HUMANO, dt);
    if (S.espera <= 0) { S.fase = 'juego'; colocarSaque(S); }
    return ev;
  }
  const pasos = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / pasos;
  const obj1 = S.modo === 'cpu' ? objetivoCPU(S, dt) : objetivos[1];
  const v1 = S.modo === 'cpu' ? NIVELES[S.nivel].vel : V_MAZO_HUMANO;
  for (let k = 0; k < pasos; k++) {
    moverMazo(S, 0, objetivos[0], V_MAZO_HUMANO, h);
    moverMazo(S, 1, obj1, v1, h);
    const d = S.disco, f = Math.pow(ROCE, h);
    d.vx *= f; d.vy *= f; d.x += d.vx * h; d.y += d.vy * h;
    // choques con los mazos (el mazo no se mueve: masa «infinita»). Van antes que las bandas para que un mazo nunca
    // pueda sacar el disco de la mesa al empujarlo contra una esquina
    for (const m of S.m) {
      const dx = d.x - m.x, dy = d.y - m.y, dist = Math.hypot(dx, dy), min = R_DISCO + R_MAZO;
      if (dist < min && dist > 0) {
        const nx = dx / dist, ny = dy / dist;
        d.x = m.x + nx * min; d.y = m.y + ny * min;
        const rv = (d.vx - m.vx) * nx + (d.vy - m.vy) * ny;
        if (rv < 0) { d.vx -= (1 + REBOTE_MAZO) * rv * nx; d.vy -= (1 + REBOTE_MAZO) * rv * ny; S.golpes++; ev.push('golpe'); }
        const v = Math.hypot(d.vx, d.vy); if (v > V_MAX) { d.vx *= V_MAX / v; d.vy *= V_MAX / v; }
        S.maxVel = Math.max(S.maxVel, Math.min(v, V_MAX));
      }
    }
    // bandas laterales
    if (d.x < R_DISCO) { d.x = R_DISCO; d.vx = Math.abs(d.vx) * REBOTE_BANDA; ev.push('banda'); }
    if (d.x > ANCHO - R_DISCO) { d.x = ANCHO - R_DISCO; d.vx = -Math.abs(d.vx) * REBOTE_BANDA; ev.push('banda'); }
    // fondos (salvo la boca de la portería)
    const enBoca = Math.abs(d.x - ANCHO / 2) < PORTERIA / 2 - R_DISCO * .4;
    if (!enBoca) {
      if (d.y < R_DISCO) { d.y = R_DISCO; d.vy = Math.abs(d.vy) * REBOTE_BANDA; ev.push('banda'); }
      if (d.y > ALTO - R_DISCO) { d.y = ALTO - R_DISCO; d.vy = -Math.abs(d.vy) * REBOTE_BANDA; ev.push('banda'); }
    } else if (d.y < -R_DISCO || d.y > ALTO + R_DISCO) {
      const marca = d.y < 0 ? 0 : 1; S.goles[marca]++; S.golDe = marca; S.saca = 1 - marca; ev.push('gol' + marca);
      if (S.goles[marca] >= S.meta) { S.fase = 'fin'; ev.push('fin'); }
      else { S.fase = 'gol'; S.espera = PAUSA_GOL; }
      d.vx = d.vy = 0; d.y = d.y < 0 ? -R_DISCO * 2 : ALTO + R_DISCO * 2;
      return ev;
    }
    // «colchón de aire»: un disco casi parado junto a un fondo se desliza despacio hacia el centro (así nunca se queda atascado)
    if (Math.hypot(d.vx, d.vy) < 70 && (d.y < 110 || d.y > ALTO - 110)) d.vy += (d.y < ALTO / 2 ? 1 : -1) * 420 * h;
  }
  return ev;
}
export const ganador = S => (S.fase !== 'fin' ? -1 : S.goles[0] >= S.meta ? 0 : 1);

// ---------- validación ----------
export function validar(d) {
  const num = (v, a, b) => Number.isFinite(v) && v >= a && v <= b, ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  if (!d || typeof d !== 'object' || !MODOS[d.modo] || !NIVELES[d.nivel] || !METAS.includes(d.meta)) return null;
  if (!Array.isArray(d.goles) || d.goles.length !== 2 || !d.goles.every(g => ent(g, 0, d.meta))) return null;
  if (!['listo', 'juego', 'gol', 'pausa', 'fin'].includes(d.fase)) return null;
  const pos = p => p && num(p.x, -100, ANCHO + 100) && num(p.y, -200, ALTO + 200) && num(p.vx, -1e4, 1e4) && num(p.vy, -1e4, 1e4);
  if (!pos(d.disco) || !Array.isArray(d.m) || d.m.length !== 2 || !d.m.every(pos)) return null;
  const fin = d.goles.some(g => g >= d.meta);
  if (fin !== (d.fase === 'fin')) return null;
  return { modo: d.modo, nivel: d.nivel, meta: d.meta, goles: d.goles.slice(), disco: { ...d.disco }, m: d.m.map(x => ({ ...x })), fase: d.fase, espera: num(d.espera, 0, 5) ? d.espera : 0,
    saca: d.saca === 1 ? 1 : 0, golDe: ent(d.golDe, -1, 1) ? d.golDe : -1, golpes: ent(d.golpes, 0, 1e7) ? d.golpes : 0, maxVel: num(d.maxVel, 0, V_MAX) ? d.maxVel : 0,
    tiempo: num(d.tiempo, 0, 1e6) ? d.tiempo : 0, cpu: { x: ANCHO / 2, y: 110, t: 0 } };
}
