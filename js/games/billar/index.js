// Billar: Pool 8, Pool 9 y Snooker de 6 rojas, contra la CPU o entre 2 personas en el mismo móvil.
import { $, esc } from '../../core/dom.js';
import { enSegundoPlano } from '../../core/ia/remoto.js';
import { anotarPartida, htmlPartidas } from '../../core/historial.js';
import * as B from './motor.js';
import { BARAJAS, cargarBarajas, urlTapete, imagenTapete, pintarTapete } from '../../core/cartas.js';

const MOTOR = new URL('./motor.js', import.meta.url).href, M = 34;              // M: ancho de la banda de madera alrededor
const NIVEL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
const GUIA = { larga: 'Larga', corta: 'Corta', no: 'Sin línea' };
const TAPETES = { verde: ['Verde', '#1F8A4C'], azul: ['Azul', '#1E5FA8'], rojo: ['Rojo', '#A42A3A'], gris: ['Gris', '#5D6675'], morado: ['Morado', '#5B3A9B'], negro: ['Negro', '#22262E'] };
const MADERAS = { nogal: ['Nogal', '#5A3A22', '#7A5232'], roble: ['Roble', '#9A6B3D', '#B98654'], negro: ['Negro', '#16181D', '#2B2E36'], blanco: ['Blanco', '#D9D4C8', '#F1ECE1'] };
const BOLAS = {
  clasicas: ['Clásicas', ['#F5C518', '#1D4ED8', '#DC2626', '#6D28D9', '#F97316', '#15803D', '#7F1D1D', '#111']],
  pastel: ['Pastel', ['#FFE08A', '#8EC5FF', '#FF9AA2', '#C3A6FF', '#FFC48A', '#9FE0B3', '#D7A1A1', '#333']],
  neon: ['Neón', ['#FFF000', '#00B3FF', '#FF2E63', '#B14CFF', '#FF8A00', '#00E676', '#FF4FD8', '#111']],
};
const TACOS = { clasico: ['Clásico', '#C8A16B', '#5A3A22'], oro: ['Negro y oro', '#1A1A1A', '#D4AF37'], rojo: ['Carbono rojo', '#2A2A2A', '#E53935'], hielo: ['Azul hielo', '#CFE8FF', '#2F6BFF'], rosa: ['Rosa', '#FFC1DA', '#E84A8A'] };
const SNC = { 7: '#F5C518', 8: '#15803D', 9: '#7A4A1E', 10: '#1D4ED8', 11: '#F48FB1', 12: '#111' };

let S = null, api = null, asp = null, root = null, cv = null, ctx = null, dpr = 1, k = 1, raf = 0, tPrev = 0, reg = false;
let ang = -Math.PI / 2, fuerza = .6, anim = null, arrastre = null, pensando = false, serie = 0, onKey = null, onVis = null, onRes = null, ultChoque = 0;
let cfg = { modo: 'pool8', rival: 'cpu', nivel: 'medio', guia: 'larga' };

/* ---------- validación / resumen ---------- */
export function validar(d) { const s = d && B.validar(d.s); return s ? { s, reg: !!d.reg } : null; }
export const migrarV1 = d => d;
export function resumen(d) {
  const s = d.s, m = B.MODOS[s.modo];
  if (s.fase === 'fin') return { texto: `${m} · ${s.ganador < 0 ? 'empate' : `ganó ${s.jug[s.ganador].nombre}`}`, fin: true };
  return { texto: `${m} · ${s.modo === 'snooker' ? `${s.jug[0].puntos}-${s.jug[1].puntos}` : `turno de ${s.jug[s.turno].nombre}`}`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; anim = null; pensando = false; arrastre = null;
  await cargarBarajas();
  asp = api.aspecto([
    // tapete: un color liso o, encima, uno de los tapetes de imagen de la app (img/cartas/tapetes)
    { clave: 'pano', titulo: 'Color del tapete', def: 'verde', opciones: Object.entries(TAPETES).map(([id, [n, c]]) => ({ id, nombre: n, sw: [c] })) },
    { clave: 'panoimg', titulo: 'Tapete de imagen', icono: '🟩', ventana: true, forma: 'tapete', def: 'ninguno',
      opciones: [{ id: 'ninguno', nombre: 'Sin imagen (color liso)', icono: '🚫', nada: true }, { id: 'azar', nombre: '🎲 Aleatoria', azar: true }, ...(BARAJAS.tapetes || []).map(t => ({ id: t.id, nombre: t.nombre, img: urlTapete(t) }))] },
    { clave: 'madera', titulo: 'Bandas', icono: '🪵', def: 'nogal', opciones: Object.entries(MADERAS).map(([id, [n, c, c2]]) => ({ id, nombre: n, sw: [c, c2] })) },
    { clave: 'bolas', titulo: 'Bolas (pool)', icono: '🎱', def: 'clasicas', opciones: Object.entries(BOLAS).map(([id, [n, cs]]) => ({ id, nombre: n, sw: cs.slice(0, 3) })) },
    { clave: 'taco', titulo: 'Taco', icono: '🏒', def: 'clasico', opciones: Object.entries(TACOS).map(([id, [n, c, c2]]) => ({ id, nombre: n, sw: [c, c2] })) },
  ], () => dibujar());
  await api.css(new URL('./billar.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && B.MODOS[c0.modo] && NIVEL[c0.nivel] && GUIA[c0.guia]) cfg = { ...c0 };
  const g = api.cargar(); S = g ? g.s : null; reg = g ? g.reg : false;
  root.addEventListener('click', clic); root.addEventListener('input', alMover);
  onKey = tecla; document.addEventListener('keydown', onKey);
  onVis = () => { if (document.hidden) guardar(); }; document.addEventListener('visibilitychange', onVis);
  onRes = () => { if (cv) { ajustar(); dibujar(); } }; addEventListener('resize', onRes);
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '🗂️ Partidas anteriores', accion: () => api.modal('🗂️ Partidas anteriores', htmlPartidas(api)) }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  if (S && S.fase !== 'fin') armar(); else setup();
}
export function unmount() {
  serie++; cancelAnimationFrame(raf); raf = 0;
  if (anim && S) { while (B.pasoFisica(S.bolas, B.radio(S.modo), 1 / 480, anim.info)); B.resolver(S, anim.info); anim = null; }   // termina el tiro en curso
  guardar();
  document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis); removeEventListener('resize', onRes);
  if (root) { root.removeEventListener('click', clic); root.removeEventListener('input', alMover); }
  S = null; cv = null; asp = null;
}
function guardar() { if (!S || anim) return; const d = { s: S, reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- pantallas ---------- */
function setup() {
  cancelAnimationFrame(raf); raf = 0; cv = null;
  const seg = (k2, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${cfg[k2] === v ? 'on' : ''}" data-cfg="${k2}" data-v="${v}">${l}</button>`).join('')}</div>`;
  root.innerHTML = `<p class="note">Apunta tocando o arrastrando sobre la mesa, ajusta la fuerza y pulsa <b>Tirar</b>. ${cfg.modo === 'pool8' ? 'Pool 8: mete tus bolas (lisas o rayadas) y después la 8.' : cfg.modo === 'pool9' ? 'Pool 9: toca siempre primero la bola más baja; gana quien mete la 9.' : 'Snooker: roja y color, roja y color… y al final los colores en orden. Gana quien más puntos sume.'}</p>
    <div class="bar"><span class="lbl">Juego</span>${seg('modo', Object.entries(B.MODOS))}</div>
    <div class="bar"><span class="lbl">Rival</span>${seg('rival', [['cpu', '🤖 CPU'], ['dos', '👥 2 jugadores']])}</div>
    ${cfg.rival === 'cpu' ? `<div class="bar"><span class="lbl">Nivel</span>${seg('nivel', Object.entries(NIVEL))}</div>` : ''}
    <div class="bar"><span class="lbl">Ayuda</span>${seg('guia', Object.entries(GUIA))}</div>
    <div class="bar"><button class="btn on" data-ac="start">🎱 Empezar</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>`;
}
function nuevaSetup() { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; serie++; anim = null; api.borrar(); S = null; setup(); }
function empezar() {
  api.setPref('cfg', cfg); serie++; anim = null;
  S = B.crear({ modo: cfg.modo, nivel: cfg.nivel, jugadores: cfg.rival === 'cpu' ? [{ nombre: 'Tú', cpu: false }, { nombre: 'CPU', cpu: true }] : [{ nombre: 'Jugador 1' }, { nombre: 'Jugador 2' }] });
  reg = false; ang = -Math.PI / 2; fuerza = .85; api.borrar(); armar(); guardar();
}
function armar() {
  root.innerHTML = `<div class="bihud" id="biHud"></div>
    <div class="bizona" id="biZona"><canvas id="biCv" aria-label="Mesa de billar: toca o arrastra para apuntar"></canvas></div>
    <div class="msg bimsg" id="biMsg" role="status" aria-live="polite"></div>
    <div class="bictl" id="biCtl">
      <button class="btn" data-fino="-1" aria-label="Girar a la izquierda">↺</button>
      <label class="bifza"><span>Fuerza <b id="biFza"></b></span><input type="range" id="biRango" min="5" max="100" value="60" aria-label="Fuerza del golpe"></label>
      <button class="btn" data-fino="1" aria-label="Girar a la derecha">↻</button>
      <button class="btn on bitirar" data-ac="tirar">🎱 Tirar</button>
    </div>
    <div class="bar" style="justify-content:center"><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button><button class="btn" data-ac="nueva">Nueva partida</button></div>`;
  cv = $('#biCv'); ctx = cv.getContext('2d'); dpr = Math.min(window.devicePixelRatio || 1, 3);
  cv.addEventListener('pointerdown', abajo); cv.addEventListener('pointermove', mueve);
  for (const t of ['pointerup', 'pointercancel']) cv.addEventListener(t, () => { arrastre = null; });
  ajustar(); pintarHud(); cancelAnimationFrame(raf); tPrev = performance.now(); raf = requestAnimationFrame(bucle);
  turnoCPU();
}
function ajustar() {
  if (!cv) return;
  const zona = $('#biZona'), w0 = zona.parentElement.getBoundingClientRect().width, hDisp = Math.max(400, innerHeight - zona.getBoundingClientRect().top - 150);
  const W = B.ANCHO + 2 * M, H = B.ALTO + 2 * M, ancho = Math.floor(Math.min(w0, 440, hDisp * W / H)), alto = Math.round(ancho * H / W);
  zona.style.width = ancho + 'px'; cv.width = ancho * dpr; cv.height = alto * dpr; cv.style.height = alto + 'px'; k = ancho / W;
}

/* ---------- apuntar, bola en mano y tiro ---------- */
const humanoJuega = () => S && S.fase === 'apuntar' && !anim && !S.jug[S.turno].cpu && !pensando;
const aMesa = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * (B.ANCHO + 2 * M) - M, (e.clientY - r.top) / r.height * (B.ALTO + 2 * M) - M]; };
function abajo(e) {
  if (!humanoJuega()) return;
  const [x, y] = aMesa(e), bb = B.blanca(S);
  arrastre = { mover: S.enMano && Math.hypot(x - bb.x, y - bb.y) < 40 };
  try { cv.setPointerCapture(e.pointerId); } catch { /* */ }
  mueve(e);
}
function mueve(e) {
  if (!arrastre || !humanoJuega()) return;
  const [x, y] = aMesa(e), bb = B.blanca(S);
  if (arrastre.mover) { if (B.sitioValido(S, x, y)) { bb.x = x; bb.y = y; } return; }
  if (Math.hypot(x - bb.x, y - bb.y) > 6) ang = Math.atan2(y - bb.y, x - bb.x);
}
function tirar(a = ang, f = fuerza) {
  if (!S || anim || S.fase !== 'apuntar') return;
  B.prepararTiro(S); S.enMano = false; B.golpear(B.blanca(S), a, f);
  anim = { info: B.nuevaInfo() }; api.sonido('click'); api.vibrar(15); pintarHud();
}
function alMover(e) { if (e.target.id === 'biRango') { fuerza = +e.target.value / 100; $('#biFza').textContent = Math.round(fuerza * 100) + '%'; } }

/* ---------- bucle ---------- */
function bucle(t) {
  if (!S || !cv) return;
  const dt = Math.min((t - tPrev) / 1000, 1 / 20); tPrev = t;
  if (anim) {
    const r = B.radio(S.modo); let mov = false;
    const antes = anim.info.choques, metAntes = anim.info.metidas.length;
    for (let i = 0; i < Math.round(dt * 480); i++) mov = B.pasoFisica(S.bolas, r, 1 / 480, anim.info) || mov;
    if (anim.info.choques > antes && t - ultChoque > 60) { ultChoque = t; api.sonido('click'); }
    if (anim.info.metidas.length > metAntes) { api.sonido('ok'); api.vibrar(20); }
    if (!mov) {
      const info = anim.info; anim = null; for (const b of S.bolas) { b.vx = b.vy = 0; }
      B.resolver(S, info); pintarHud(); guardar();
      if (S.fase === 'fin') terminar(); else turnoCPU();
    }
  }
  dibujar();
  raf = requestAnimationFrame(bucle);
}
async function turnoCPU() {
  if (!S || S.fase !== 'apuntar' || !S.jug[S.turno].cpu || pensando) return;
  pensando = true; const tok = ++serie; pintarHud();
  await new Promise(r => setTimeout(r, 500));
  if (tok !== serie || !S) return;
  if (S.enMano) { const p = await enSegundoPlano(MOTOR, 'sitioCPU', [S], B.sitioCPU); if (tok !== serie || !S) return; const bb = B.blanca(S); if (B.sitioValido(S, p.x, p.y)) { bb.x = p.x; bb.y = p.y; } }
  const tiro = await enSegundoPlano(MOTOR, 'pensar', [S], B.pensar);
  if (tok !== serie || !S) return;
  // gira el taco hasta la dirección elegida y tira
  const a0 = ang, d = Math.atan2(Math.sin(tiro.ang - a0), Math.cos(tiro.ang - a0)), t0 = performance.now();
  fuerza = tiro.fuerza;
  await new Promise(res => { const paso = () => { if (tok !== serie || !S) return res(); const p = Math.min(1, (performance.now() - t0) / 700); ang = a0 + d * (1 - (1 - p) ** 3); if (p < 1) requestAnimationFrame(paso); else res(); }; paso(); });
  if (tok !== serie || !S) return;
  await new Promise(r => setTimeout(r, 250));
  pensando = false; if (tok === serie && S) tirar(tiro.ang, tiro.fuerza);
}
function terminar() {
  pintarHud();
  if (reg) return; reg = true;
  const cpu = S.jug[1].cpu, g = S.ganador, res = !cpu ? 'partida' : g < 0 ? 'tablas' : g === 0 ? 'victoria' : 'derrota';
  api.registrar({ res, variante: `${B.MODOS[S.modo]}${cpu ? ' · ' + NIVEL[S.nivel] : ' · 2 jugadores'}` });
  anotarPartida(api, { res: res === 'victoria' ? 'g' : res === 'derrota' ? 'p' : 'e', texto: `${B.MODOS[S.modo]} · ${cpu ? NIVEL[S.nivel] : '2 jugadores'} · ${S.msg.replace(/^🏆 /, '')}` });
  api.sonido(res === 'derrota' ? 'perder' : 'ganar'); if (res === 'victoria') api.vibrar([60, 40, 60]); guardar();
}

/* ---------- dibujo ---------- */
function colorBola(id) {
  if (S.modo === 'snooker') return id === 0 ? '#F7F5EE' : id <= 6 ? '#C8102E' : SNC[id];
  if (id === 0) return '#F7F5EE';
  const cs = BOLAS[asp.valores.bolas] ? BOLAS[asp.valores.bolas][1] : BOLAS.clasicas[1];
  return id === 8 ? cs[7] : cs[id > 8 ? id - 9 : id - 1];                  // la 9 es como la 1 (amarilla), la 10 como la 2…
}
function dibujar() {
  if (!cv || !S) return;
  const W = B.ANCHO, H = B.ALTO, r = B.radio(S.modo), pano = asp.valores.pano, tap = (TAPETES[pano] || TAPETES.verde)[1], mad = MADERAS[asp.valores.madera] || MADERAS.nogal;
  const pi = asp.valores.panoimg, imPano = pi && pi.startsWith('t-') ? imagenTapete(pi, () => dibujar()) : null;
  ctx.setTransform(k * dpr, 0, 0, k * dpr, M * k * dpr, M * k * dpr);
  // madera y tapete
  ctx.fillStyle = mad[1]; redondo(-M, -M, W + 2 * M, H + 2 * M, 22); ctx.fill();
  ctx.fillStyle = mad[2]; for (const [x, y] of [[0.25, 0], [.5, 0], [.75, 0], [0.25, 1], [.5, 1], [.75, 1]]) { ctx.beginPath(); ctx.arc(W * x, y ? H + M / 2 : -M / 2, 3, 0, 7); ctx.fill(); }
  for (const y of [.125, .25, .375, .625, .75, .875]) for (const x of [-M / 2, W + M / 2]) { ctx.beginPath(); ctx.arc(x, H * y, 3, 0, 7); ctx.fill(); }
  const g = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, H * .7); g.addColorStop(0, tap); g.addColorStop(1, sombra(tap, .78));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (imPano) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); pintarTapete(ctx, imPano, W, H, .12); ctx.restore(); }
  ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2;
  if (S.modo === 'snooker') { ctx.beginPath(); ctx.moveTo(0, B.D.y); ctx.lineTo(W, B.D.y); ctx.stroke(); ctx.beginPath(); ctx.arc(B.D.x, B.D.y, B.D.r, 0, Math.PI); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(0, 750); ctx.lineTo(W, 750); ctx.stroke(); ctx.beginPath(); ctx.arc(250, 250, 3, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fill(); }
  // troneras
  B.TRONERAS.forEach(([x, y], i) => { ctx.fillStyle = '#0B0B0D'; ctx.beginPath(); ctx.arc(x, y, i === 2 || i === 3 ? r * 1.9 : r * 2.25, 0, 7); ctx.fill(); });
  // guía y taco
  const bb = B.blanca(S), apuntando = S.fase === 'apuntar' && !anim && !bb.fuera;
  if (apuntando && cfg.guia !== 'no' && !S.jug[S.turno].cpu) guia(bb, r);
  // bolas
  for (const b of S.bolas) if (!b.fuera) bola(b, r);
  if (apuntando) taco(bb, r);
  if (S.enMano && apuntando && !S.jug[S.turno].cpu) { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bb.x, bb.y, r + 9, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
}
function bola(b, r) {
  const c = colorBola(b.id), raya = S.modo !== 'snooker' && b.id >= 9;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(b.x + 2, b.y + 3, r, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, 7); ctx.clip();
  ctx.fillStyle = raya ? '#F7F5EE' : c; ctx.fillRect(b.x - r, b.y - r, 2 * r, 2 * r);
  if (raya) { ctx.fillStyle = c; ctx.fillRect(b.x - r, b.y - r * .55, 2 * r, r * 1.1); }
  const g = ctx.createRadialGradient(b.x - r * .4, b.y - r * .45, r * .1, b.x, b.y, r * 1.1); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.35, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.35)');
  ctx.fillStyle = g; ctx.fillRect(b.x - r, b.y - r, 2 * r, 2 * r); ctx.restore();
  if (S.modo !== 'snooker' && b.id) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, r * .48, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = `800 ${r * .72}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.id, b.x, b.y + .5);
  }
}
// Línea de ayuda: hasta la primera bola (con la «bola fantasma» y hacia dónde saldría) o hasta la banda
function guia(bb, r) {
  const dx = Math.cos(ang), dy = Math.sin(ang); let tMin = Infinity, choque = null;
  for (const b of S.bolas) {
    if (b.fuera || b.id === 0) continue;
    const fx = b.x - bb.x, fy = b.y - bb.y, proy = fx * dx + fy * dy; if (proy <= 0) continue;
    const perp2 = fx * fx + fy * fy - proy * proy, R = 2 * r; if (perp2 > R * R) continue;
    const t = proy - Math.sqrt(R * R - perp2); if (t < tMin) { tMin = t; choque = b; }
  }
  const tb = Math.min(dx > 0 ? (B.ANCHO - r - bb.x) / dx : dx < 0 ? (r - bb.x) / dx : Infinity, dy > 0 ? (B.ALTO - r - bb.y) / dy : dy < 0 ? (r - bb.y) / dy : Infinity);
  let t = Math.min(tMin, tb); if (cfg.guia === 'corta') t = Math.min(t, 160);
  const gx = bb.x + dx * t, gy = bb.y + dy * t;
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; ctx.setLineDash([7, 6]); ctx.beginPath(); ctx.moveTo(bb.x, bb.y); ctx.lineTo(gx, gy); ctx.stroke(); ctx.setLineDash([]);
  if (choque && t === tMin) {
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(gx, gy, r, 0, 7); ctx.stroke();
    if (cfg.guia === 'larga') { const nx = (choque.x - gx) / (2 * r), ny = (choque.y - gy) / (2 * r); ctx.strokeStyle = 'rgba(255,230,120,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(choque.x, choque.y); ctx.lineTo(choque.x + nx * 90, choque.y + ny * 90); ctx.stroke(); }
    const leg = B.legales(S); if (!leg.includes(choque.id)) { ctx.strokeStyle = '#FF4757'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx - 7, gy - 7); ctx.lineTo(gx + 7, gy + 7); ctx.moveTo(gx + 7, gy - 7); ctx.lineTo(gx - 7, gy + 7); ctx.stroke(); }
  }
}
function taco(bb, r) {
  const T = TACOS[asp.valores.taco] || TACOS.clasico, dx = Math.cos(ang), dy = Math.sin(ang), sep = r + 6 + fuerza * 40, L = 330;
  const x0 = bb.x - dx * sep, y0 = bb.y - dy * sep, x1 = x0 - dx * L, y1 = y0 - dy * L;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x0 + 4, y0 + 5); ctx.lineTo(x1 + 4, y1 + 5); ctx.stroke();
  const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, '#F1ECE1'); g.addColorStop(.03, '#F1ECE1'); g.addColorStop(.035, T[1]); g.addColorStop(.6, T[1]); g.addColorStop(.62, T[2]); g.addColorStop(1, T[2]);
  ctx.strokeStyle = g; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = '#3A6FD8'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 - dx * 3, y0 - dy * 3); ctx.stroke();   // tiza en la punta
}
function redondo(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
const sombra = (c, f) => { const n = parseInt(c.slice(1), 16); return `rgb(${(n >> 16) * f | 0},${(n >> 8 & 255) * f | 0},${(n & 255) * f | 0})`; };

/* ---------- marcador ---------- */
function pintarHud() {
  if (!S || !$('#biHud')) return;
  const info = j => {
    if (S.modo === 'snooker') return `<b>${S.jug[j].puntos}</b> puntos`;
    if (S.modo === 'pool9') return j === S.turno ? `Toca la <b>${B.menor(S)}</b>` : '';
    const gr = S.jug[j].grupo; return gr ? `${gr === 'lisas' ? '● Lisas' : '◐ Rayadas'} · quedan <b>${B.quedanDelGrupo(S, gr)}</b>` : 'Mesa abierta';
  };
  $('#biHud').innerHTML = S.jug.map((p, j) => `<span class="${j === S.turno && S.fase !== 'fin' ? 'turno' : ''} ${S.ganador === j ? 'gana' : ''}"><small>${esc(p.nombre)}${p.cpu ? ' 🤖' : ''}</small><em>${info(j)}</em></span>`).join('');
  const turnoHumano = humanoJuega();
  $('#biMsg').textContent = S.fase === 'fin' ? S.msg : anim ? '' : pensando ? 'La CPU está pensando…' : S.msg + (turnoHumano && S.enMano ? ' Arrastra la blanca para colocarla.' : '');
  $('#biCtl').classList.toggle('apagado', !turnoHumano);
  root.querySelectorAll('#biCtl button').forEach(b => { b.disabled = !turnoHumano; });
  const rg = $('#biRango'); rg.disabled = !turnoHumano; rg.value = Math.round(fuerza * 100); $('#biFza').textContent = Math.round(fuerza * 100) + '%';
  if (S.fase === 'fin') $('#biCtl').innerHTML = '<button class="btn on" data-ac="start">🔁 Otra partida</button><button class="btn" data-ac="opciones">Opciones</button>';
}

/* ---------- entrada ---------- */
function tecla(e) {
  if (!humanoJuega() || document.querySelector('.modal') || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); ang += (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? .002 : .02); }
  else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); fuerza = Math.max(.05, Math.min(1, fuerza + (e.key === 'ArrowUp' ? .05 : -.05))); pintarHud(); }
  else if (e.key === ' ') { e.preventDefault(); tirar(); }
}
function clic(e) {
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.cfg) { cfg[d.cfg] = d.v; api.setPref('cfg', cfg); return setup(); }
  if (d.fino) { ang += +d.fino * .006; return; }
  const a = d.ac;
  if (a === 'start') empezar(); else if (a === 'tirar') { if (humanoJuega()) tirar(); }
  else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas(); else if (a === 'nueva') nuevaSetup();
  else if (a === 'opciones') { api.borrar(); S = null; setup(); }
}
function reglas() {
  api.modal('Billar', `<ul><li><b>Cómo tirar</b>: toca o arrastra sobre la mesa para apuntar (la blanca irá hacia tu dedo), afina con ↺ ↻, elige la fuerza y pulsa 🎱 <b>Tirar</b>. Con teclado: flechas para apuntar (Mayús = fino), arriba/abajo para la fuerza y Espacio para tirar.</li>
    <li>La <b>línea de ayuda</b> marca hasta dónde va la blanca, la «bola fantasma» donde tocará y hacia dónde saldrá la otra bola; una ✕ roja avisa si es una bola que no puedes tocar primero.</li>
    <li><b>Pool 8</b>: el primero que mete una bola tras el saque se queda con ese grupo (lisas 1-7 o rayadas 9-15). Mete todas las tuyas y después la 8. Si metes la 8 antes de tiempo (o con falta), pierdes.</li>
    <li><b>Pool 9</b>: toca siempre primero la bola más baja que quede. Gana quien mete la 9, aunque sea de rebote.</li>
    <li><b>Snooker de 6 rojas</b>: mete una roja (1 punto) y después un color (amarilla 2, verde 3, marrón 4, azul 5, rosa 6, negra 7), que vuelve a su sitio. Sin rojas, los colores van en orden. Las faltas dan al rival al menos 4 puntos.</li>
    <li><b>Faltas</b>: meter la blanca, no tocar ninguna bola, tocar primero una que no toca o (en pool) que ninguna bola toque banda. Tras una falta, el rival tiene <b>bola en mano</b>: coloca la blanca donde quiera (en snooker, dentro de la D).</li>
    <li>Si metes una bola tuya, sigues tirando. En 🎨 Apariencia cambias el tapete, las bandas, las bolas y el taco.</li></ul>`);
}
