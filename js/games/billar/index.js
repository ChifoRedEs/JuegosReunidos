// Billar: Pool 8, Pool 9 y Snooker de 6 rojas, contra la CPU o entre 2 personas en el mismo móvil.
import { $, esc } from '../../core/dom.js';
import { enSegundoPlano } from '../../core/ia/remoto.js';
import { anotarPartida, htmlPartidas } from '../../core/historial.js';
import * as B from './motor.js';
import { BARAJAS, cargarBarajas, urlTapete, imagenTapete, pintarTapete } from '../../core/cartas.js';

const MOTOR = new URL('./motor.js', import.meta.url).href, M = 26;              // M: ancho de la banda de madera alrededor
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
let efx = 0, efy = 0;     // punto de la bola blanca donde se da con el taco (−1…1): x = izquierda/derecha, y = abajo(−)/arriba(+)
let ang = -Math.PI / 2, fuerza = .6, anim = null, arrastre = null, pensando = false, serie = 0, onKey = null, onVis = null, onRes = null, ultChoque = 0;
let panel = null, posPanel = null, arrP = null, anchoPrev = 0, gruposVistos = '', popHasta = 0, hudPrev = '';     // panel flotante de tiro · ancho de pantalla con el que se midió la mesa
// Vista 3D (Three.js): opcional, con vuelta automática a la mesa 2D si no hay WebGL
let V3 = null, modo3d = false, hay3d = false, forzar2d = false, tok3 = 0, claveMesa = '', supKey = '', LW = 1;
const quiere3D = () => hay3d && !forzar2d && !!asp && (asp.valores.vista || '3d') === '3d';
function cerrar3D() { tok3++; if (V3) { try { V3.destruir(); } catch { /* nada */ } V3 = null; } modo3d = false; claveMesa = supKey = ''; }
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
  api = a; root = r; anim = null; pensando = false; arrastre = null; forzar2d = false; modo3d = false;
  try { hay3d = (await import('../../core/escena3d.js')).hayWebGL(); } catch { hay3d = false; }
  await cargarBarajas();
  asp = api.aspecto([
    { clave: 'vista', titulo: 'Vista de la mesa', icono: '🧊', def: '3d', opciones: [{ id: '3d', nombre: '🧊 3D (Three.js)' }, { id: '2d', nombre: '🔲 2D clásica' }] },
    // tapete: un color liso o, encima, uno de los tapetes de imagen de la app (img/cartas/tapetes)
    { clave: 'pano', titulo: 'Color del tapete', def: 'verde', opciones: Object.entries(TAPETES).map(([id, [n, c]]) => ({ id, nombre: n, sw: [c] })) },
    { clave: 'panoimg', titulo: 'Tapete de imagen', icono: '🟩', ventana: true, forma: 'tapete', def: 'ninguno',
      opciones: [{ id: 'ninguno', nombre: 'Sin imagen (color liso)', icono: '🚫', nada: true }, { id: 'azar', nombre: '🎲 Aleatoria', azar: true }, ...(BARAJAS.tapetes || []).map(t => ({ id: t.id, nombre: t.nombre, img: urlTapete(t) }))] },
    { clave: 'madera', titulo: 'Bandas', icono: '🪵', def: 'nogal', opciones: Object.entries(MADERAS).map(([id, [n, c, c2]]) => ({ id, nombre: n, sw: [c, c2] })) },
    { clave: 'bolas', titulo: 'Bolas (pool)', icono: '🎱', def: 'clasicas', opciones: Object.entries(BOLAS).map(([id, [n, cs]]) => ({ id, nombre: n, sw: cs.slice(0, 3) })) },
    { clave: 'taco', titulo: 'Taco', icono: '🏒', def: 'clasico', opciones: Object.entries(TACOS).map(([id, [n, c, c2]]) => ({ id, nombre: n, sw: [c, c2] })) },
  ], () => { if (cv && S && modo3d !== quiere3D()) armar(); else dibujar(); });
  await api.css(new URL('./billar.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && B.MODOS[c0.modo] && NIVEL[c0.nivel] && GUIA[c0.guia]) cfg = { ...c0 };
  const g = api.cargar(); S = g ? g.s : null; reg = g ? g.reg : false;
  root.addEventListener('click', clic); root.addEventListener('input', alMover);
  onKey = tecla; document.addEventListener('keydown', onKey);
  onVis = () => { if (document.hidden) guardar(); }; document.addEventListener('visibilitychange', onVis);
  onRes = () => { if (cv && ajustar()) dibujar(); limitarPanel(); }; addEventListener('resize', onRes);
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '🗂️ Partidas anteriores', accion: () => api.modal('🗂️ Partidas anteriores', htmlPartidas(api)) }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  if (S && S.fase !== 'fin') armar(); else setup();
}
export function unmount() {
  serie++; cancelAnimationFrame(raf); raf = 0;
  if (anim && S) { while (B.pasoFisica(S.bolas, B.radio(S.modo), 1 / 480, anim.info)); B.resolver(S, anim.info); anim = null; }   // termina el tiro en curso
  guardar();
  document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis); removeEventListener('resize', onRes);
  if (root) { root.removeEventListener('click', clic); root.removeEventListener('input', alMover); }
  quitarPanel(); cerrar3D(); S = null; cv = null; asp = null;
}
function guardar() { if (!S || anim) return; const d = { s: S, reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- pantallas ---------- */
function setup() {
  cancelAnimationFrame(raf); raf = 0; cv = null; quitarPanel(); cerrar3D();
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
  cerrar3D(); modo3d = quiere3D();
  root.innerHTML = `<div class="bihud" id="biHud"></div>
    <div class="msg bimsg" id="biMsg" role="status" aria-live="polite"></div>
    <div class="bizona" id="biZona"><canvas id="biCv" aria-label="Mesa de billar: toca o arrastra para apuntar"${modo3d ? ' style="display:none"' : ''}></canvas>${modo3d ? '<div class="e3d bi3d" id="bi3d"></div>' : ''}</div>
    <div class="bicesto" id="biCesto" aria-label="Bolas metidas"></div>
    <div class="bar" style="justify-content:center"><button class="btn" data-ac="panel">📍 Recolocar controles</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button><button class="btn" data-ac="nueva">Nueva partida</button></div>`;
  cv = $('#biCv'); ctx = cv.getContext('2d'); dpr = Math.min(window.devicePixelRatio || 1, 3);
  cv.addEventListener('pointerdown', abajo); cv.addEventListener('pointermove', mueve);
  for (const t of ['pointerup', 'pointercancel']) cv.addEventListener(t, () => { arrastre = null; });
  gruposVistos = S.jug.map(j => j.grupo || '').join(); popHasta = 0; hudPrev = '';
  ajustar(true); crearPanel(); pintarHud(); requestAnimationFrame(verMesa); cancelAnimationFrame(raf); tPrev = performance.now(); raf = requestAnimationFrame(bucle);
  if (modo3d) iniciar3D();
  turnoCPU();
}
// Tamaño fijo de la mesa: cabe de alto en la pantalla (debajo de la barra superior, que se queda fija) y deja
// un margen a los lados para poder hacer scroll con el dedo fuera de la mesa (dentro, el dedo apunta).
// El alto se mide con 100svh (la pantalla con la barra del navegador a la vista), así la mesa no cambia de tamaño
// al hacer scroll en el móvil. Solo se vuelve a medir si cambia el ANCHO (p. ej. al girar el móvil). Devuelve true si cambia.
function altoPantalla() {
  const p = document.createElement('div'); p.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
  document.body.append(p); const h = p.offsetHeight || innerHeight; p.remove(); return h;
}
function ajustar(forzar = false) {
  if (!cv) return false;
  const vw = document.documentElement.clientWidth || innerWidth;
  if (!forzar && vw === anchoPrev) return false;
  anchoPrev = vw;
  const W = B.ANCHO + 2 * M, H = B.ALTO + 2 * M, cab = ($('.top') || { offsetHeight: 0 }).offsetHeight;
  const altoDisp = Math.max(320, altoPantalla() - cab - 12);
  const ancho = Math.floor(Math.max(200, Math.min(altoDisp * W / H, vw - 56, 640))), alto = Math.round(ancho * H / W);   // vw - 56: 28 px libres a cada lado
  const zona = $('#biZona'); zona.style.width = ancho + 'px'; zona.style.marginLeft = 'auto';
  cv.width = ancho * dpr; cv.height = alto * dpr; cv.style.height = alto + 'px'; k = ancho / W; const h3 = $('#bi3d'); if (h3) h3.style.height = alto + 'px';
  return true;
}
// Deja la mesa entera a la vista justo debajo de la barra superior
function verMesa() {
  const z = $('#biZona'); if (!z) return;
  const cab = ($('.top') || { offsetHeight: 0 }).offsetHeight, y = z.getBoundingClientRect().top + scrollY - cab - 6;
  scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
}

/* ---------- panel de tiro flotante (se arrastra desde el asa a cualquier sitio de la pantalla) ---------- */
function crearPanel() {
  quitarPanel();
  panel = document.createElement('div'); panel.className = 'bipanel'; panel.id = 'biCtl';
  panel.setAttribute('role', 'group'); panel.setAttribute('aria-label', 'Controles de tiro');
  panel.innerHTML = `<div class="biasa" title="Arrastra para mover los controles"><span aria-hidden="true"></span><small>Mover</small></div>
    <div class="bicuerpo">
      <div class="biefecto" id="biEfecto"><div class="biesf" id="biEsf" role="slider" aria-label="Punto de la bola donde das con el taco (efecto)" tabindex="0"><i id="biPunto"></i></div><button type="button" class="biefl" id="biEfL" data-ac="efcentro" title="Volver al centro">Centro</button></div>
      <div class="bictl" id="biCtlIn">
        <button class="btn" data-fino="-1" aria-label="Girar a la izquierda">↺</button>
        <label class="bifza"><span>Fuerza <b id="biFza"></b></span><input type="range" id="biRango" min="5" max="100" value="60" aria-label="Fuerza del golpe"></label>
        <button class="btn" data-fino="1" aria-label="Girar a la derecha">↻</button>
        <button class="btn on bitirar" data-ac="tirar">🎱 Tirar</button>
      </div>
    </div>`;
  document.body.append(panel);
  panel.addEventListener('click', clic); panel.addEventListener('input', alMover);
  const esf = panel.querySelector('#biEsf');
  const ponEf = e => { const r = esf.getBoundingClientRect(), R = r.width / 2; let x = (e.clientX - r.left - R) / R, y = -(e.clientY - r.top - R) / R; const m = Math.hypot(x, y); if (m > .9) { x *= .9 / m; y *= .9 / m; } fijarEfecto(Math.abs(x) < .07 ? 0 : x, Math.abs(y) < .07 ? 0 : y); };
  let efId = null;
  esf.addEventListener('pointerdown', e => { if (!humanoJuega() || e.button > 0) return; e.preventDefault(); efId = e.pointerId; try { esf.setPointerCapture(e.pointerId); } catch { /* */ } ponEf(e); });
  esf.addEventListener('pointermove', e => { if (efId === e.pointerId) ponEf(e); });
  const finEf = e => { if (efId === e.pointerId) efId = null; };
  esf.addEventListener('pointerup', finEf); esf.addEventListener('pointercancel', finEf);
  esf.addEventListener('dblclick', () => fijarEfecto(0, 0));
  esf.addEventListener('keydown', e => { const d = { ArrowLeft: [-.15, 0], ArrowRight: [.15, 0], ArrowUp: [0, .15], ArrowDown: [0, -.15] }[e.key]; if (!d) return; e.preventDefault(); e.stopPropagation(); fijarEfecto(Math.max(-.9, Math.min(.9, efx + d[0])), Math.max(-.9, Math.min(.9, efy + d[1]))); });
  fijarEfecto(efx, efy);
  const asa = panel.querySelector('.biasa');
  asa.addEventListener('pointerdown', e => {
    if (e.button > 0) return; e.preventDefault();
    const r = panel.getBoundingClientRect(); arrP = { dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId };
    try { asa.setPointerCapture(e.pointerId); } catch { /* */ }
    panel.classList.add('mov');
  });
  asa.addEventListener('pointermove', e => { if (!arrP || e.pointerId !== arrP.id) return; posPanel = { x: e.clientX - arrP.dx, y: e.clientY - arrP.dy }; limitarPanel(); });
  const suelta = e => { if (!arrP || e.pointerId !== arrP.id) return; arrP = null; panel.classList.remove('mov'); api.setPref('panel', posPanel); };
  asa.addEventListener('pointerup', suelta); asa.addEventListener('pointercancel', suelta);
  const p = api.pref('panel', null); posPanel = p && Number.isFinite(p.x) && Number.isFinite(p.y) ? { ...p } : null;
  limitarPanel();
}
function limitarPanel() {
  if (!panel) return;
  const w = panel.offsetWidth, h = panel.offsetHeight, vw = document.documentElement.clientWidth || innerWidth, vh = innerHeight, mg = 6;
  if (!posPanel) {                                                     // al principio: abajo y centrado (o a la derecha de la mesa si cabe)
    const z = $('#biZona') && $('#biZona').getBoundingClientRect();
    posPanel = z && z.right + w + 16 <= vw ? { x: z.right + 16, y: (vh - h) / 2 } : { x: (vw - w) / 2, y: vh - h - 14 };
  }
  const x = Math.min(Math.max(mg, posPanel.x), Math.max(mg, vw - w - mg)), y = Math.min(Math.max(mg, posPanel.y), Math.max(mg, vh - h - mg));
  panel.style.left = x + 'px'; panel.style.top = y + 'px';
}
function recolocarPanel() { posPanel = null; api.setPref('panel', null); limitarPanel(); }
function quitarPanel() { if (panel) { panel.remove(); panel = null; } arrP = null; }

/* ---------- apuntar, bola en mano y tiro ---------- */
const humanoJuega = () => S && S.fase === 'apuntar' && !anim && !S.jug[S.turno].cpu && !pensando;
const aMesa = e => { if (V3) return V3.aMesa(e); const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * (B.ANCHO + 2 * M) - M, (e.clientY - r.top) / r.height * (B.ALTO + 2 * M) - M]; };
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
function tirar(a = ang, f = fuerza, ex = efx, ey = efy) {
  if (!S || anim || S.fase !== 'apuntar') return;
  B.prepararTiro(S); S.enMano = false; B.golpear(B.blanca(S), a, f, ex, ey); fijarEfecto(0, 0);
  anim = { info: B.nuevaInfo() }; api.sonido('click'); api.vibrar(15); pintarHud();
}
function nombreEfecto() {
  if (!efx && !efy) return 'Centro';
  const v = efy > .15 ? 'Alto' : efy < -.15 ? 'Bajo' : '', l = efx > .15 ? 'der.' : efx < -.15 ? 'izq.' : '';
  return [v, l].filter(Boolean).join(' · ') || 'Centro';
}
function fijarEfecto(x, y) {
  efx = x; efy = y;
  const pt = $('#biPunto'), lb = $('#biEfL'); if (pt) { pt.style.left = 50 + x * 50 + '%'; pt.style.top = 50 - y * 50 + '%'; }
  if (lb) lb.textContent = nombreEfecto();
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
  pensando = false; if (tok === serie && S) tirar(tiro.ang, tiro.fuerza, 0, 0);
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
  if (modo3d) { if (V3) dibujar3D(); return; }
  const W = B.ANCHO, H = B.ALTO, r = B.radio(S.modo), pano = asp.valores.pano, tap = (TAPETES[pano] || TAPETES.verde)[1], mad = MADERAS[asp.valores.madera] || MADERAS.nogal;
  const pi = asp.valores.panoimg, imPano = pi && pi.startsWith('t-') ? imagenTapete(pi, () => dibujar()) : null;
  ctx.setTransform(k * dpr, 0, 0, k * dpr, M * k * dpr, M * k * dpr);
  pintarMesa(W, H, r, tap, mad, imPano);
  // guía y taco
  const bb = B.blanca(S), apuntando = S.fase === 'apuntar' && !anim && !bb.fuera;
  if (apuntando && cfg.guia !== 'no' && !S.jug[S.turno].cpu) guia(bb, r);
  // bolas
  for (const b of S.bolas) if (!b.fuera) bola(b, r);
  if (apuntando) taco(bb, r);
  if (S.enMano && apuntando && !S.jug[S.turno].cpu) anilloMano(bb, r);
}
function pintarMesa(W, H, r, tap, mad, imPano) {
  ctx.fillStyle = mad[1]; redondo(-M, -M, W + 2 * M, H + 2 * M, 18); ctx.fill();
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
}
function anilloMano(bb, r) { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2 * LW; ctx.beginPath(); ctx.arc(bb.x, bb.y, r + 9, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
async function iniciar3D() {
  const t = ++tok3;
  try {
    const b3 = await import('../../core/escena3d.js'), { crearBillar3D } = await import('./vista3d.js'); if (t !== tok3 || !cv) return;
    const host = $('#bi3d'); if (!host) return;
    const v = await crearBillar3D(host, { ancho: B.ANCHO, alto: B.ALTO, M, alApuntar: (ev, fase) => {
      if (fase === 'ini') { if (!humanoJuega()) return false; abajo(ev); return true; }
      if (fase === 'mov') mueve(ev); else arrastre = null; return true;
    } });
    if (t !== tok3 || !cv) { v.destruir(); return; }
    b3.botonesCamara(host, v.E); V3 = v; claveMesa = ''; supKey = '#'; dibujar();
  } catch (e) { console.error(e); if (t === tok3 && cv) { forzar2d = true; armar(); } }
}
function texMesa3D(r) {
  const W = B.ANCHO, H = B.ALTO, tap = (TAPETES[asp.valores.pano] || TAPETES.verde)[1], mad = MADERAS[asp.valores.madera] || MADERAS.nogal;
  const pi = asp.valores.panoimg, imPano = pi && pi.startsWith('t-') ? imagenTapete(pi, () => { claveMesa = ''; dibujar(); }) : null;
  const c = document.createElement('canvas'); c.width = W + 2 * M; c.height = H + 2 * M;
  const c0 = ctx; ctx = c.getContext('2d'); ctx.setTransform(1, 0, 0, 1, M, M); pintarMesa(W, H, r, tap, mad, imPano); ctx = c0;
  V3.mesa(c); V3.madera(mad[1], tap);
}
function dibujar3D() {
  const r = B.radio(S.modo), clave = [asp.valores.pano, asp.valores.madera, asp.valores.panoimg, S.modo].join();
  if (clave !== claveMesa) { claveMesa = clave; texMesa3D(r); }
  const bb = B.blanca(S), apuntando = S.fase === 'apuntar' && !anim && !bb.fuera, snk = S.modo === 'snooker', Tc = TACOS[asp.valores.taco] || TACOS.clasico;
  V3.pintar({ bolas: S.bolas.map(b => ({ id: b.id, x: b.x, y: b.y, fuera: !!b.fuera, color: colorBola(b.id), raya: !snk && b.id >= 9, num: !snk })), r,
    taco: apuntando ? { x: bb.x, y: bb.y, ang, sep: r + 6 + fuerza * 40, c1: Tc[1], c2: Tc[2] } : null });
  const humano = !S.jug[S.turno].cpu, guiaOn = apuntando && cfg.guia !== 'no' && humano, anillo = apuntando && S.enMano && humano;
  const key = guiaOn || anillo ? [ang.toFixed(4), cfg.guia, anillo ? 1 : 0, ...S.bolas.map(b => (b.fuera ? 'x' : (b.x | 0) + ',' + (b.y | 0)))].join('|') : '';
  if (key !== supKey) {
    supKey = key; const c0 = ctx, ps = V3.supEsc, cs = V3.supCanvas; ctx = V3.sup; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cs.width, cs.height); ctx.setTransform(ps, 0, 0, ps, M * ps, M * ps);
    LW = 2.2; if (guiaOn) guia(bb, r); if (anillo) anilloMano(bb, r); LW = 1; ctx = c0; V3.supListo();
  }
}
function bola(b, r) {
  const c = colorBola(b.id), raya = S.modo !== 'snooker' && b.id >= 9;
  ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.arc(b.x + 2, b.y + 3, r, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, 7); ctx.clip();
  ctx.fillStyle = raya ? '#FBFAF5' : c; ctx.fillRect(b.x - r, b.y - r, 2 * r, 2 * r);
  if (raya) { ctx.fillStyle = c; ctx.fillRect(b.x - r, b.y - r * .5, 2 * r, r); }          // rayada: franja de color y casquetes blancos bien visibles
  // sombreado del borde y un brillo pequeño (un brillo grande hacía que las lisas parecieran rayadas)
  const g = ctx.createRadialGradient(b.x, b.y, r * .55, b.x, b.y, r * 1.05); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.3)');
  ctx.fillStyle = g; ctx.fillRect(b.x - r, b.y - r, 2 * r, 2 * r); ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(b.x, b.y, r - .6, 0, 7); ctx.stroke();
  if (S.modo !== 'snooker' && b.id) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, r * .54, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#111'; ctx.font = `900 ${r * (b.id > 9 ? .66 : .8)}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.id, b.x, b.y + r * .04);
  }
  const s2 = ctx.createRadialGradient(b.x - r * .38, b.y - r * .42, 0, b.x - r * .38, b.y - r * .42, r * .32);
  s2.addColorStop(0, 'rgba(255,255,255,.75)'); s2.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = s2; ctx.beginPath(); ctx.arc(b.x - r * .38, b.y - r * .42, r * .32, 0, 7); ctx.fill();
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
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2 * LW; ctx.setLineDash([7, 6]); ctx.beginPath(); ctx.moveTo(bb.x, bb.y); ctx.lineTo(gx, gy); ctx.stroke(); ctx.setLineDash([]);
  if (choque && t === tMin) {
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(gx, gy, r, 0, 7); ctx.stroke();
    if (cfg.guia === 'larga') { const nx = (choque.x - gx) / (2 * r), ny = (choque.y - gy) / (2 * r); ctx.strokeStyle = 'rgba(255,230,120,.9)'; ctx.lineWidth = 3 * LW; ctx.beginPath(); ctx.moveTo(choque.x, choque.y); ctx.lineTo(choque.x + nx * 90, choque.y + ny * 90); ctx.stroke(); }
    const leg = B.legales(S); if (!leg.includes(choque.id)) { ctx.strokeStyle = '#FF4757'; ctx.lineWidth = 3 * LW; ctx.beginPath(); ctx.moveTo(gx - 7, gy - 7); ctx.lineTo(gx + 7, gy + 7); ctx.moveTo(gx + 7, gy - 7); ctx.lineTo(gx - 7, gy + 7); ctx.stroke(); }
  }
}
function taco(bb, r) {
  const T = TACOS[asp.valores.taco] || TACOS.clasico, dx = Math.cos(ang), dy = Math.sin(ang), sep = r + 6 + fuerza * 40, L = 330;
  const x0 = bb.x - dx * sep, y0 = bb.y - dy * sep, x1 = x0 - dx * L, y1 = y0 - dy * L;
  if (efx || efy) { const px = bb.x + (-dy * efx + dx * efy) * r * .6, py = bb.y + (dx * efx + dy * efy) * r * .6; ctx.fillStyle = '#E5252A'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px, py, r * .24, 0, 7); ctx.fill(); ctx.stroke(); }   // dónde das a la blanca (efecto)
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x0 + 4, y0 + 5); ctx.lineTo(x1 + 4, y1 + 5); ctx.stroke();
  const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, '#F1ECE1'); g.addColorStop(.03, '#F1ECE1'); g.addColorStop(.035, T[1]); g.addColorStop(.6, T[1]); g.addColorStop(.62, T[2]); g.addColorStop(1, T[2]);
  ctx.strokeStyle = g; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = '#3A6FD8'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 - dx * 3, y0 - dy * 3); ctx.stroke();   // tiza en la punta
}
function redondo(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
const sombra = (c, f) => { const n = parseInt(c.slice(1), 16); return `rgb(${(n >> 16) * f | 0},${(n >> 8 & 255) * f | 0},${(n & 255) * f | 0})`; };

/* ---------- marcador, bolas metidas y panel ---------- */
// Bola pequeña en HTML (marcador y caja de bolas metidas). vacia: hueco de una bola que sigue en la mesa
function mini(id, { vacia = false, num = true } = {}) {
  const raya = S.modo !== 'snooker' && id >= 9, n = S.modo !== 'snooker' && num ? `<b>${id}</b>` : '';
  return `<span class="bimini${raya ? ' raya' : ''}${vacia ? ' vacia' : ''}" style="--c:${colorBola(id)}" title="${nombreBola(id)}${vacia ? ' (en la mesa)' : ' (metida)'}">${n}</span>`;
}
const nombreBola = id => (S.modo === 'snooker' ? (id <= 6 ? 'Roja' : B.SN[id].n[0].toUpperCase() + B.SN[id].n.slice(1)) : `Bola ${id}${id === 8 ? '' : id > 8 ? ' (rayada)' : ' (lisa)'}`);
// Icono del grupo de cada jugador en Pool 8: una lisa o una rayada (la 1 y la 9 tienen el mismo color: solo cambia la raya)
const iconoGrupo = g => `<span class="bigrupo ${g}">${mini(g === 'lisas' ? 1 : 9, { num: false })}<i>${g === 'lisas' ? 'Lisas' : 'Rayadas'}</i></span>`;
function pintarHud() {
  if (!S || !$('#biHud')) return;
  const ahora = S.jug.map(j => j.grupo || '').join();
  if (S.modo === 'pool8' && ahora !== gruposVistos && S.jug.some(j => j.grupo)) popHasta = performance.now() + 1600;   // se acaban de repartir lisas/rayadas
  gruposVistos = ahora; const nuevo = performance.now() < popHasta;
  const info = j => {
    if (S.modo === 'snooker') return `<b>${S.jug[j].puntos}</b> puntos`;
    if (S.modo === 'pool9') return j === S.turno ? `Toca la <b>${B.menor(S)}</b>` : '';
    const gr = S.jug[j].grupo;
    return gr ? `${iconoGrupo(gr)}<span class="biquedan">${B.quedanDelGrupo(S, gr) ? `quedan <b>${B.quedanDelGrupo(S, gr)}</b>` : 'a por la <b>8</b>'}</span>` : '<span class="biabierta">Mesa abierta</span>';
  };
  const hud = S.jug.map((p, j) => `<span class="${j === S.turno && S.fase !== 'fin' ? 'turno' : ''} ${S.ganador === j ? 'gana' : ''} ${nuevo ? 'nuevo' : ''}"><small>${esc(p.nombre)}${p.cpu ? ' 🤖' : ''}</small><em>${info(j)}</em></span>`).join('');
  if (hud !== hudPrev) { $('#biHud').innerHTML = hud; hudPrev = hud; }          // solo se repinta si cambia (no corta la animación del icono)
  const turnoHumano = humanoJuega();
  $('#biMsg').textContent = S.fase === 'fin' ? S.msg : anim ? '' : pensando ? 'La CPU está pensando…' : S.msg + (turnoHumano && S.enMano ? ' Arrastra la blanca para colocarla.' : '');
  pintarCesto();
  const ctl = $('#biCtlIn'); if (!ctl || !panel) return;
  panel.classList.toggle('sinefecto', S.fase === 'fin');
  if (S.fase === 'fin') {                                             // fin: el panel ofrece otra partida (solo se pinta una vez)
    panel.classList.remove('apagado');
    if (!ctl.classList.contains('fin')) { ctl.classList.add('fin'); ctl.innerHTML = '<button class="btn on" data-ac="start">🔁 Otra partida</button><button class="btn" data-ac="opciones">Opciones</button>'; limitarPanel(); }
    return;
  }
  panel.classList.toggle('apagado', !turnoHumano);
  ctl.querySelectorAll('button').forEach(b => { b.disabled = !turnoHumano; });
  const esf = $('#biEsf'); if (esf) esf.classList.toggle('off', !turnoHumano);
  const rg = $('#biRango'); if (rg) { rg.disabled = !turnoHumano; rg.value = Math.round(fuerza * 100); }
  const fz = $('#biFza'); if (fz) fz.textContent = Math.round(fuerza * 100) + '%';
}
// Caja de bolas metidas, debajo de la mesa: cada grupo con sus huecos (llenos = metidas)
function pintarCesto() {
  const caja = $('#biCesto'); if (!caja || !S) return;
  const fuera = id => S.bolas.some(b => b.id === id && b.fuera);
  const fila = (titulo, ids, extra = '') => { const n = ids.filter(fuera).length;
    return `<div class="bifila"><span class="bititulo">${titulo}${extra}</span><span class="bibolas">${ids.map(id => mini(id, { vacia: !fuera(id) })).join('')}</span><span class="binum"><b>${n}</b>/${ids.length}</span></div>`; };
  const de = g => { const j = S.jug.findIndex(p => p.grupo === g); return j < 0 ? '' : ` <small>${esc(S.jug[j].nombre)}</small>`; };
  const total = S.bolas.filter(b => b.id && b.fuera).length;
  let html = `<div class="bicab">🧺 Bolas metidas <b>${total}</b></div>`;
  if (S.modo === 'pool8') html += fila('Lisas', [1, 2, 3, 4, 5, 6, 7], de('lisas')) + fila('Rayadas', [9, 10, 11, 12, 13, 14, 15], de('rayadas')) + fila('Negra', [8]);
  else if (S.modo === 'pool9') html += fila('Bolas', [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  else html += fila('Rojas', [1, 2, 3, 4, 5, 6]) + fila('Colores', [7, 8, 9, 10, 11, 12]);
  caja.innerHTML = html;
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
  if (a === 'efcentro') fijarEfecto(0, 0); else if (a === 'start') empezar(); else if (a === 'tirar') { if (humanoJuega()) tirar(); }
  else if (a === 'aspecto') asp.abrir(); else if (a === 'panel') recolocarPanel(); else if (a === 'reglas') reglas(); else if (a === 'nueva') nuevaSetup();
  else if (a === 'opciones') { api.borrar(); S = null; setup(); }
}
function reglas() {
  api.modal('Billar', `<ul><li><b>Cómo tirar</b>: toca o arrastra sobre la mesa para apuntar (la blanca irá hacia tu dedo), afina con ↺ ↻, elige la fuerza y pulsa 🎱 <b>Tirar</b>. En la <b>bola de efecto</b> del panel toca o arrastra el punto donde das a la blanca: arriba = <i>alto</i> (la blanca sigue tras chocar), abajo = <i>bajo</i> (retrocede), izquierda/derecha = efecto lateral (cambia el rebote en banda). «Centro» (o doble toque) lo anula; tras cada tiro vuelve al centro. Los controles flotan: arrástralos desde su asa a una zona sin bolas (📍 <b>Recolocar controles</b> los devuelve abajo). Debajo de la mesa ves las bolas ya metidas. Con teclado: flechas para apuntar (Mayús = fino), arriba/abajo para la fuerza y Espacio para tirar.</li>
    <li>La <b>línea de ayuda</b> marca hasta dónde va la blanca, la «bola fantasma» donde tocará y hacia dónde saldrá la otra bola; una ✕ roja avisa si es una bola que no puedes tocar primero.</li>
    <li><b>Pool 8</b>: el primero que mete una bola (también en el saque) se queda con ese grupo; arriba, junto a cada jugador, sale su icono de lisas o rayadas (lisas 1-7 o rayadas 9-15). Mete todas las tuyas y después la 8. Si metes la 8 antes de tiempo (o con falta), pierdes.</li>
    <li><b>Pool 9</b>: toca siempre primero la bola más baja que quede. Gana quien mete la 9, aunque sea de rebote.</li>
    <li><b>Snooker de 6 rojas</b>: mete una roja (1 punto) y después un color (amarilla 2, verde 3, marrón 4, azul 5, rosa 6, negra 7), que vuelve a su sitio. Sin rojas, los colores van en orden. Las faltas dan al rival al menos 4 puntos.</li>
    <li><b>Faltas</b>: meter la blanca, no tocar ninguna bola, tocar primero una que no toca o (en pool) que ninguna bola toque banda. Tras una falta, el rival tiene <b>bola en mano</b>: coloca la blanca donde quiera (en snooker, dentro de la D).</li>
    <li>Si metes una bola tuya, sigues tirando. En 🎨 Apariencia cambias el tapete, las bandas, las bolas y el taco.</li></ul>`);
}
