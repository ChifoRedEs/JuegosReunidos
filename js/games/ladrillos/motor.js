// Motor del Rompe-Ladrillos (sin DOM, probable con Node). Campo de 1000 × 1400 unidades, origen arriba a la izquierda.
// Todo el tiempo va dentro de avanzar(S, dt, entrada): física por subpasos para que la bola no atraviese ladrillos.
export const ANCHO = 1000, ALTO = 1400, COLS = 10, LAD_W = 100, LAD_H = 42, TOPE = 150;
export const PALA_Y = 1290, PALA_H = 26, PALA_W = 180, RADIO = 14;
export const MODOS = { campana: 'Campaña', aleatorio: 'Aleatorio' };
export const VIDAS = 3;
// Ladrillos: 1–6 normales (color por número) · D = 2 golpes · T = 3 golpes · M = metal (no se rompe) · ? = sorpresa (suelta premio)
export const NIVELES = [
  ['..........', '..........', '1111111111', '2222222222', '3333333333', '4444444444', '5555555555', '6666666666'],
  ['....??....', '...1111...', '..222222..', '.33333333.', '4444444444', '.55555555.', '..666666..', '...1111...'],
  ['1.2.3.4.5.', '.2.3.4.5.6', '3.4.5.6.1.', '.4.5.6.1.2', '5.6.1.2.3.', '.6.1.2.3.4', 'D.D.D.D.D.', '.?.?.?.?.?'],
  ['DDDDDDDDDD', 'D11111111D', 'D1222222?D', 'D12M33M21D', 'D12333321D', 'D1?222221D', 'D11111111D', 'DDDDDDDDDD'],
  ['M........M', 'MM......MM', '.1111111?.', '.22222222.', '..333333..', 'M..4444..M', 'MM......MM', 'TTT....TTT'],
  ['..T....T..', '..1T..T1..', '..111111..', '.11M11M11.', '1111111111', '1.111111.1', '1.1....1.1', '...?..?...'],
  ['?........?', '6666666666', 'MMMM..MMMM', '5555555555', '4444444444', 'MM..MM..MM', '3333333333', 'DDDDDDDDDD'],
  ['...TTTT...', '..T2222T..', '.T233332T.', 'T23444432T', 'T23444432T', '.T233332T.', '..T2?22T..', '...TTTT...'],
  ['1M2M3M4M5M', '.?.......?', 'M6M5M4M3M2', '..........', '1M2M3M4M5M', 'DDDDDDDDDD', 'TTTTTTTTTT', '..........'],
  ['T.T.T.T.T.', '.D.D.D.D.D', '6.6.6.6.6.', '.5.5?5.5.5', '4.4.4.4.4.', '.3.3.3.3.3', '2.2.2.2.2.', '.1.1.1.1.1'],
  ['MMM.??.MMM', 'M1111111?M', 'M2222222.M', 'MTTTTTTTTM', 'M33333333M', 'M44444444M', 'MDDDDDDDDM', 'MMMM..MMMM'],
  ['TTTTTTTTTT', 'T666??666T', 'T55555555T', 'TDDDDDDDDT', 'T33333333T', 'T22M22M22T', 'T11111111T', 'TTTTTTTTTT'],
];
export const CAPSULAS = { ancha: { letra: 'A', nombre: 'Pala ancha' }, multi: { letra: 'M', nombre: 'Multibola' }, lenta: { letra: 'L', nombre: 'Bola lenta' },
  laser: { letra: 'Z', nombre: 'Láser' }, fuego: { letra: 'F', nombre: 'Bola de fuego' }, vida: { letra: '+', nombre: 'Vida extra' } };
const TIPOS_CAP = ['ancha', 'ancha', 'multi', 'multi', 'lenta', 'laser', 'laser', 'fuego', 'vida'];
const DURACION = 12000;                                       // ms que dura cada efecto temporal

/* ---------- niveles ---------- */
function aleatorio(n) {                                      // nivel generado con simetría izquierda-derecha
  const filas = []; const dens = .55 + Math.min(n, 10) * .03;
  for (let f = 0; f < 8; f++) {
    const mitad = []; for (let c = 0; c < 5; c++) { const r = Math.random(); mitad.push(r > dens ? '.' : r < .06 + n * .006 ? 'M' : r < .16 + n * .01 ? (Math.random() < .5 ? 'D' : 'T') : r < .2 ? '?' : String(1 + ((f + c) % 6))); }
    filas.push([...mitad, ...mitad.slice().reverse()].join(''));
  }
  if (!filas.join('').replace(/[.M]/g, '')) filas[3] = '1111111111';
  return filas;
}
export function cargarNivel(S) {
  const plano = S.modo === 'aleatorio' ? aleatorio(S.nivel) : NIVELES[(S.nivel - 1) % NIVELES.length];
  S.ladrillos = [];
  plano.forEach((fila, f) => [...fila].forEach((ch, c) => {
    if (ch === '.') return;
    const tipo = ch === 'D' ? 'd' : ch === 'T' ? 't' : ch === 'M' ? 'm' : ch === '?' ? 's' : 'n';
    S.ladrillos.push({ c, f, tipo, color: /[1-6]/.test(ch) ? +ch : 0, golpes: tipo === 'd' ? 2 : tipo === 't' ? 3 : tipo === 'm' ? 99 : 1 });
  }));
  S.bolas = []; S.capsulas = []; S.disparos = []; S.efectos = {}; S.combo = 0; S.sinRomper = 0;
  S.pala.w = PALA_W; prepararSaque(S);
}
export const rectLadrillo = l => ({ x: l.c * LAD_W, y: TOPE + l.f * LAD_H, w: LAD_W, h: LAD_H });
export const quedan = S => S.ladrillos.filter(l => l.tipo !== 'm').length;
// La velocidad crece con el nivel y con el tiempo de juego del nivel
const velBase = S => Math.min(1.05, .52 + (S.nivel - 1) * .03 + (S.vuelta || 0) * .08);

/* ---------- partida ---------- */
export function crear({ modo = 'campana', nivel = 1 } = {}) {
  const S = { modo: MODOS[modo] ? modo : 'campana', nivel: Math.max(1, nivel | 0), vidas: VIDAS, puntos: 0, pala: { x: ANCHO / 2, w: PALA_W }, bolas: [], ladrillos: [], capsulas: [], disparos: [],
    efectos: {}, combo: 0, fase: 'listo', tiempoNivel: 0, cadencia: 0, vuelta: 0, motivo: '' };
  cargarNivel(S); return S;
}
function prepararSaque(S) { S.bolas = [{ x: S.pala.x, y: PALA_Y - RADIO - 1, vx: 0, vy: 0, pegada: true, dx: 0 }]; S.fase = 'listo'; S.tiempoNivel = 0; }
export function sacar(S) {
  if (S.fase !== 'listo' && S.fase !== 'jugar') return false;
  let ok = false;
  for (const b of S.bolas) if (b.pegada) { const v = velBase(S), a = (Math.random() - .5) * .6; b.vx = Math.sin(a) * v; b.vy = -Math.cos(a) * v; b.pegada = false; ok = true; }
  if (ok) S.fase = 'jugar';
  return ok;
}
export function moverPala(S, x) { const m = S.pala.w / 2; S.pala.x = Math.max(m, Math.min(ANCHO - m, x)); for (const b of S.bolas) if (b.pegada) b.x = S.pala.x + b.dx; }
// Rebote circulo–rectángulo: devuelve el eje del choque ('x' o 'y') o null
function choque(b, r) {
  const cx = Math.max(r.x, Math.min(b.x, r.x + r.w)), cy = Math.max(r.y, Math.min(b.y, r.y + r.h)), dx = b.x - cx, dy = b.y - cy;
  if (dx * dx + dy * dy > RADIO * RADIO) return null;
  const pX = Math.min(b.x + RADIO - r.x, r.x + r.w - (b.x - RADIO)), pY = Math.min(b.y + RADIO - r.y, r.y + r.h - (b.y - RADIO));
  return pX < pY ? 'x' : 'y';
}
// entrada: { x: posición de la pala (opcional) }. Devuelve una lista de eventos para sonidos y efectos.
export function avanzar(S, dt, entrada = {}) {
  const ev = [];
  if (entrada.x != null) moverPala(S, entrada.x);
  if (S.fase !== 'jugar' && S.fase !== 'listo') return ev;
  for (const k of Object.keys(S.efectos)) { S.efectos[k] -= dt; if (S.efectos[k] <= 0) { delete S.efectos[k]; if (k === 'ancha') S.pala.w = PALA_W; } }
  if (S.fase === 'listo') return ev;
  S.tiempoNivel += dt; S.sinRomper = (S.sinRomper || 0) + dt;
  const lenta = S.efectos.lenta ? .65 : 1, acel = 1 + Math.min(S.tiempoNivel / 90000, .35);   // la bola acelera poco a poco en cada nivel
  // láser
  if (S.efectos.laser) { S.cadencia -= dt; if (S.cadencia <= 0) { S.cadencia = 330; S.disparos.push({ x: S.pala.x - S.pala.w / 2 + 14, y: PALA_Y }, { x: S.pala.x + S.pala.w / 2 - 14, y: PALA_Y }); ev.push('laser'); } }
  for (const d of S.disparos) d.y -= 1.4 * dt;
  S.disparos = S.disparos.filter(d => {
    if (d.y < 0) return false;
    const l = S.ladrillos.find(l => { const r = rectLadrillo(l); return d.x >= r.x && d.x <= r.x + r.w && d.y >= r.y && d.y <= r.y + r.h; });
    if (l) { golpear(S, l, ev, false); return false; }
    return true;
  });
  // bolas, por subpasos
  for (const b of S.bolas) {
    if (b.pegada) continue;
    const vel = Math.hypot(b.vx, b.vy) * lenta * acel, pasos = Math.max(1, Math.ceil(vel * dt / (RADIO * .5)));
    for (let k = 0; k < pasos; k++) {
      const f = dt / pasos * lenta * acel; b.x += b.vx * f; b.y += b.vy * f;
      let pared = false;
      if (b.x < RADIO) { b.x = RADIO; b.vx = Math.abs(b.vx); pared = true; }
      if (b.x > ANCHO - RADIO) { b.x = ANCHO - RADIO; b.vx = -Math.abs(b.vx); pared = true; }
      if (b.y < RADIO) { b.y = RADIO; b.vy = Math.abs(b.vy); pared = true; }
      if (pared) { ev.push('pared'); if (S.sinRomper > 12000) desviar(b, .35); }        // bola en un circuito sin romper nada: se desvía
      // pala
      const p = { x: S.pala.x - S.pala.w / 2, y: PALA_Y, w: S.pala.w, h: PALA_H };
      if (b.vy > 0 && choque(b, p)) {
        const rel = Math.max(-1, Math.min(1, (b.x - S.pala.x) / (S.pala.w / 2))), v = Math.max(Math.hypot(b.vx, b.vy), velBase(S)), ang = rel * 1.05 + (Math.random() - .5) * .07;   // hasta ~60°, con una pizca de azar
        b.vx = Math.sin(ang) * v; b.vy = -Math.cos(ang) * v; b.y = PALA_Y - RADIO - .5; S.combo = 0; ev.push('pala');
      }
      // ladrillos
      for (const l of S.ladrillos) {
        const eje = choque(b, rectLadrillo(l)); if (!eje) continue;
        const fuego = S.efectos.fuego && l.tipo !== 'm';
        if (!fuego) { if (eje === 'x') b.vx = -b.vx; else b.vy = -b.vy; }
        golpear(S, l, ev, true);
        if (!fuego) break;
      }
      if (b.y > ALTO + RADIO) { b.perdida = true; break; }
    }
    // evita trayectorias casi horizontales (bola atrapada rebotando de lado a lado)
    const v = Math.hypot(b.vx, b.vy); if (Math.abs(b.vy) < v * .22) { b.vy = Math.sign(b.vy || -1) * v * .22; b.vx = Math.sign(b.vx) * Math.sqrt(v * v - b.vy * b.vy); }
  }
  S.ladrillos = S.ladrillos.filter(l => l.golpes > 0);
  S.bolas = S.bolas.filter(b => !b.perdida);
  // cápsulas que caen
  for (const c of S.capsulas) c.y += .32 * dt;
  S.capsulas = S.capsulas.filter(c => {
    if (c.y > ALTO) return false;
    if (c.y + 20 >= PALA_Y && c.y - 20 <= PALA_Y + PALA_H && Math.abs(c.x - S.pala.x) <= S.pala.w / 2 + 30) { aplicar(S, c.tipo); ev.push('capsula:' + c.tipo); return false; }
    return true;
  });
  if (!quedan(S)) { S.fase = 'nivel'; S.puntos += 500 + S.vidas * 100; ev.push('nivel'); return ev; }
  if (!S.bolas.length) {
    S.vidas--; ev.push('vida');
    if (S.vidas <= 0) { S.fase = 'fin'; S.motivo = 'vidas'; ev.push('fin'); }
    else { S.efectos = {}; S.pala.w = PALA_W; S.capsulas = []; S.disparos = []; prepararSaque(S); }
  }
  return ev;
}
function desviar(b, max) {
  const v = Math.hypot(b.vx, b.vy), a = Math.atan2(b.vx, -b.vy) + (Math.random() - .5) * 2 * max;
  const vy = -Math.cos(a) * v; b.vx = Math.sin(a) * v; b.vy = Math.sign(b.vy) === Math.sign(vy) || !vy ? vy : -vy;
}
function golpear(S, l, ev, conBola) {
  if (l.tipo === 'm') { ev.push('metal'); return; }
  S.sinRomper = 0;
  l.golpes--;
  if (l.golpes > 0) { ev.push('duro'); S.puntos += 10; return; }
  S.combo++;
  S.puntos += ({ n: 50, d: 100, t: 150, s: 80 })[l.tipo] + Math.min(S.combo, 10) * 10;
  ev.push('rompe');
  const r = rectLadrillo(l);
  if (l.tipo === 's' || Math.random() < .1) S.capsulas.push({ x: r.x + r.w / 2, y: r.y + r.h / 2, tipo: TIPOS_CAP[Math.floor(Math.random() * TIPOS_CAP.length)] });
}
function aplicar(S, tipo) {
  S.puntos += 100;
  if (tipo === 'vida') { S.vidas = Math.min(S.vidas + 1, 6); return; }
  if (tipo === 'multi') {
    const base = S.bolas.find(b => !b.pegada) || S.bolas[0]; if (!base) return;
    if (base.pegada) sacar(S);
    const v = Math.max(Math.hypot(base.vx, base.vy), velBase(S));
    for (const a of [-.5, .5]) if (S.bolas.length < 9) { const ang = Math.atan2(base.vx, -base.vy) + a; S.bolas.push({ x: base.x, y: base.y, vx: Math.sin(ang) * v, vy: -Math.abs(Math.cos(ang) * v), pegada: false, dx: 0 }); }
    return;
  }
  S.efectos[tipo] = DURACION;
  if (tipo === 'ancha') { S.pala.w = PALA_W * 1.55; moverPala(S, S.pala.x); }
}
export function siguienteNivel(S) {
  if (S.fase !== 'nivel') return false;
  S.nivel++; if (S.modo === 'campana' && (S.nivel - 1) % NIVELES.length === 0) S.vuelta = (S.vuelta || 0) + 1;
  cargarNivel(S); return true;
}
export const variante = S => MODOS[S.modo];

export function validar(d) {
  if (!d || typeof d !== 'object' || !MODOS[d.modo]) return null;
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, num = (v, a, b) => Number.isFinite(v) && v >= a && v <= b;
  if (!ent(d.nivel, 1, 9999) || !ent(d.vidas, 0, 6) || !ent(d.puntos, 0, 1e9) || !Array.isArray(d.ladrillos) || !d.pala || !num(d.pala.x, 0, ANCHO)) return null;
  const ladrillos = [];
  for (const l of d.ladrillos) { if (!l || !ent(l.c, 0, COLS - 1) || !ent(l.f, 0, 11) || !['n', 'd', 't', 'm', 's'].includes(l.tipo) || !ent(l.golpes, 1, 99) || !ent(l.color, 0, 6)) return null; ladrillos.push({ c: l.c, f: l.f, tipo: l.tipo, color: l.color, golpes: l.golpes }); }
  if (!['listo', 'jugar', 'pausa', 'nivel', 'fin'].includes(d.fase)) return null;
  const S = { modo: d.modo, nivel: d.nivel, vidas: d.vidas, puntos: d.puntos, pala: { x: d.pala.x, w: PALA_W }, ladrillos, capsulas: [], disparos: [], efectos: {}, combo: 0,
    fase: d.fase, tiempoNivel: 0, cadencia: 0, vuelta: ent(d.vuelta, 0, 999) ? d.vuelta : 0, motivo: typeof d.motivo === 'string' ? d.motivo.slice(0, 10) : '', bolas: [] };
  // Al volver a una partida guardada, la bola vuelve a la pala (más justo que reanudar a mitad de vuelo)
  if (S.fase === 'jugar' || S.fase === 'pausa' || S.fase === 'listo') { prepararSaque(S); }
  if (S.fase !== 'fin' && S.fase !== 'nivel' && !quedan(S)) return null;
  return S;
}
