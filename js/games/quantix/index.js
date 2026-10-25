import { $, esc } from '../../core/dom.js';
import * as M from './motor.js';
import { grupoEscenario, grupoPersonaje, emojiPersonaje, ESCENARIOS_WORMS } from '../../core/aspectos.js';
import { imagenTapete } from '../../core/cartas.js';

let S = null, api = null, asp = null, root = null, cv = null, ctx = null, dpr = 1, k = 1, raf = 0, acc = 0, tPrev = 0, reg = false;
let onKey = null, onUp = null, onVis = null, onRes = null, activo = null, efectos = [], hudAnt = '', eraJugando = false, sucio = true, capas = null, tFin = 0, aviso = 0;
let cfg = { ...M.CFG_DEF }, prog = { max: 1, est: {} };
const ESTILOS = { neon: { n: 'Neón', c: '#22E5FF', c2: '#7C4DFF', sw: ['#22E5FF', '#7C4DFF'] }, fuego: { n: 'Fuego', c: '#FF9F1C', c2: '#FF3B6B', sw: ['#FF9F1C', '#FF3B6B'] }, lima: { n: 'Lima', c: '#B6FF3B', c2: '#14C38E', sw: ['#B6FF3B', '#14C38E'] }, rosa: { n: 'Rosa', c: '#FF7AD9', c2: '#9B5CFF', sw: ['#FF7AD9', '#9B5CFF'] } };
const COLJ = { rebote: '#FF4FD8', errante: '#FFB020', cazador: '#FF3B3B' };

/* ---------- validación / resumen ---------- */
export function validar(d) { const s = d && M.validar(d.s); return s ? { s, reg: !!d.reg } : null; }
export const migrarV1 = d => d;
export const resumen = d => M.resumen(d.s);

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; efectos = []; activo = null; capas = null;
  asp = api.aspecto([grupoEscenario('', 'Imagen oculta'), grupoPersonaje('Jefe'),
    { clave: 'est', titulo: 'Color del trazo', def: 'neon', opciones: Object.entries(ESTILOS).map(([id, e]) => ({ id, nombre: e.n, sw: e.sw })) },
    { clave: 'panel', titulo: 'Panel sin descubrir', def: 'oscuro', opciones: [{ id: 'oscuro', nombre: 'Oscuro', sw: ['#0B1030', '#1B2358'] }, { id: 'cristal', nombre: 'Cristal', sw: ['#5B6AA8', '#A9B6F0'] }, { id: 'borroso', nombre: 'Pista (se intuye la imagen)', sw: ['#2A3270', '#8A96D8'] }] }], () => { sucio = true; if (S) dibujar(); });
  await api.css(new URL('./quantix.css', import.meta.url));
  const c0 = M.cfgValida({ ...M.CFG_DEF, ...api.pref('cfg', null) }); if (c0) cfg = c0;
  const p0 = api.pref('prog', null); if (p0 && Number.isInteger(p0.max)) prog = { max: Math.min(M.N_NIVELES, Math.max(1, p0.max)), est: p0.est && typeof p0.est === 'object' ? p0.est : {} };
  if (cfg.nivel > prog.max) cfg.nivel = prog.max;
  const g = api.cargar(); S = g ? g.s : null; reg = g ? g.reg : false;
  root.addEventListener('click', clic); onKey = teclado; document.addEventListener('keydown', onKey);
  onUp = e => soltarDedo(e); addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
  onRes = () => { if (cv && S) { encajar(); ajustarTamano(); dibujar(); } }; addEventListener('resize', onRes);
  onVis = () => { if (document.hidden) pausar(); }; document.addEventListener('visibilitychange', onVis);
  api.barra({ nueva: () => empezar(),
    salir: () => { pausar(); setup(); },
    pausar: () => { eraJugando = !!S && S.fase === 'jugar'; pausar(); },
    reanudar: o => { if (o === 'salir' && eraJugando) jugarYa(); },
    config: { valores: () => ({ ...cfg }), grupos: () => [
      { clave: 'nivel', titulo: 'Nivel', visible: prog.max > 1, opciones: Array.from({ length: prog.max }, (_, i) => [i + 1, `${i + 1}`]) },
      { clave: 'ia', titulo: 'IA del jefe', opciones: Object.entries(M.IA).map(([x, v]) => [x, v.nombre]) },
      { clave: 'obj', titulo: 'Objetivo', opciones: Object.entries(M.OBJ).map(([x, v]) => [x, v.nombre]) },
      { clave: 'vel', titulo: 'Velocidad', opciones: Object.entries(M.VEL).map(([x, v]) => [x, v.nombre]) },
      { clave: 'vidas', titulo: 'Vidas', opciones: [[3, '3'], [5, '5'], [7, '7']] },
      { clave: 'trazo', titulo: 'Crecimiento del cuadrado', opciones: Object.entries(M.TRAZO).map(([x, v]) => [x, v.nombre]) }], aplicar: v => { Object.assign(cfg, v); empezar(); } } });
  api.menu([{ texto: 'Nueva partida', accion: () => { pausar(); setup(); } }, { texto: '⏸️ Pausa', accion: pausar }, { texto: '🎨 Apariencia', accion: () => { pausar(); asp.abrir(); } }, { texto: 'Cómo se juega', accion: () => { pausar(); reglas(); } }]);
  if (S && S.fase !== 'fin' && S.fase !== 'meta') { armar(); dibujar(); } else setup();
}
export function unmount() {
  pausar(); cancelAnimationFrame(raf); raf = 0;
  document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis);
  removeEventListener('resize', onRes); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp);
  if (root) root.removeEventListener('click', clic); S = null; cv = null; asp = null; capas = null;
}
function guardar() { if (!S) return; const d = { s: M.serializar(S), reg }; const r = resumen({ s: S }); api.guardar(d, r.texto, r.fin); }
const libre = n => n <= prog.max;
const estrellasDe = n => '★'.repeat(prog.est[n] || 0) + '☆'.repeat(3 - (prog.est[n] || 0));
const imgDe = n => { const e = asp && asp.valores.esc; return ESCENARIOS_WORMS.includes(e) ? e : ESCENARIOS_WORMS[(n - 1) % ESCENARIOS_WORMS.length]; };
const nombreImg = id => ({ 't-bosque': 'Bosque', 't-ciudad': 'Ciudad', 't-deportivo': 'Deportivo', 't-desierto': 'Desierto', 't-espacio': 'Espacio', 't-infierno': 'Infierno', 't-lago': 'Lago', 't-medieval': 'Medieval' })[id] || '';

/* ---------- pantallas ---------- */
function setup() {
  cancelAnimationFrame(raf); raf = 0;
  if (S && S.fase === 'pausa') guardar();
  const seg = (c, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${cfg[c] === v ? 'on' : ''}" data-cfg="${c}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const grid = Array.from({ length: prog.max }, (_, i) => { const n = i + 1; return `<button class="btn qxnv ${cfg.nivel === n ? 'on' : ''}" data-niv="${n}" aria-label="Nivel ${n}"><b>${n}</b><small>${estrellasDe(n)}</small></button>`; }).join('');
  const d = M.NIVELES[cfg.nivel - 1], n = d.j.length;
  root.innerHTML = `<p class="note">Pulsa junto a una zona ya descubierta y <b>desliza</b> para crear un cuadrado. Mientras crece, ¡que el jefe no lo toque! Descubre el objetivo de la imagen para ganar.</p>
    <div class="bar"><span class="lbl">Nivel</span></div><div class="qxgrid">${grid}</div>
    <p class="note"><b>${cfg.nivel}. ${d.n}</b> · ${n} jefe${n > 1 ? 's' : ''} · objetivo ${M.objetivoDe(cfg.nivel, cfg.obj)} % · imagen: ${nombreImg(imgDe(cfg.nivel))}</p>
    <div class="bar"><span class="lbl">IA del jefe</span>${seg('ia', Object.entries(M.IA).map(([x, v]) => [x, v.nombre]))}</div>
    <div class="bar"><span class="lbl">Objetivo</span>${seg('obj', Object.entries(M.OBJ).map(([x, v]) => [x, v.nombre]))}</div>
    <div class="bar"><span class="lbl">Velocidad</span>${seg('vel', Object.entries(M.VEL).map(([x, v]) => [x, v.nombre]))}</div>
    <div class="bar"><span class="lbl">Vidas</span>${seg('vidas', [[3, '3'], [5, '5'], [7, '7']])}</div>
    <div class="bar"><span class="lbl">Crecimiento del cuadrado</span>${seg('trazo', Object.entries(M.TRAZO).map(([x, v]) => [x, v.nombre]))}</div>
    <p class="note"><b>IA ${M.IA[cfg.ia].nombre}</b>: ${M.IA[cfg.ia].desc}. Velocidad: lo rápido que se mueven los jefes. Crecimiento: Pequeño crece despacio (más tiempo expuesto) y Grande crece deprisa.</p>
    <div class="bar">${S && S.fase === 'pausa' ? '<button class="btn on" data-ac="seguir">▶️ Continuar partida</button>' : ''}<button class="btn ${S && S.fase === 'pausa' ? '' : 'on'}" data-ac="start">💠 Jugar</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button></div>`;
}
function armar() {
  root.innerHTML = `<div class="qxhud"><span class="vi" id="qxVid"></span><span class="pts"><b id="qxPts">0</b> puntos</span><span id="qxNiv"></span><button class="btn qxpausa" data-ac="pausa" aria-label="Pausa">⏸️</button></div>
    <div class="qxprog"><i id="qxBar"></i><u id="qxObj"></u><span id="qxPct">0 %</span></div>
    <div class="qxzona" id="qxZona"><canvas id="qxCv" aria-label="Panel de juego"></canvas><div class="qxover" id="qxOver"></div></div>
    ${api.barraHtml()}`;
  cv = $('#qxCv'); ctx = cv.getContext('2d'); dpr = Math.min(window.devicePixelRatio || 1, 3); hudAnt = ''; sucio = true; capas = null;
  const zona = $('#qxZona');
  zona.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return; e.preventDefault();
    if (S && (S.fase === 'listo' || S.fase === 'pausa')) { jugarYa(); return; }
    if (!S || S.fase !== 'jugar') return;
    const [cx, cy] = celda(e), a = M.anclaje(S, cx, cy);
    M.mirar(S, cx + .5, cy + .5);
    if (a && M.empezarRect(S, a.x, a.y)) { activo = e.pointerId; try { zona.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } M.apuntar(S, cx, cy); api.vibrar(6); }
    else aviso = performance.now();
  });
  zona.addEventListener('pointermove', e => {
    if (!S || S.fase !== 'jugar' || !(e.buttons || activo === e.pointerId)) return;
    const [cx, cy] = celda(e); M.mirar(S, cx + .5, cy + .5); if (activo === e.pointerId && S.rect) M.apuntar(S, cx, cy);
  });
  zona.addEventListener('contextmenu', e => e.preventDefault());
  zona.addEventListener('gesturestart', e => e.preventDefault()); zona.addEventListener('dblclick', e => e.preventDefault());
  encajar(); ajustarTamano(); pintarOver(); pintarHud();
}
function celda(e) { const r = cv.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * M.COLS), Math.floor((e.clientY - r.top) / r.height * M.ROWS)]; }
function encajar() {            // tablero fijo: ocupa todo el ancho y todo el alto que quede libre (sin hacer scroll)
  const z = $('#qxZona'); if (!z) return;
  z.style.width = '100%'; const pw = z.parentElement.getBoundingClientRect().width, zr = z.getBoundingClientRect(), ult = (root.closest('main') || root).getBoundingClientRect();
  const top = zr.top + scrollY, extra = ult.bottom - zr.bottom, h = innerHeight - top - extra - 2;
  z.style.width = Math.floor(Math.max(220, Math.min(pw, h * M.W / M.H))) + 'px';
}
function ajustarTamano() {
  if (!cv) return;
  const w = Math.floor(cv.parentElement.getBoundingClientRect().width);
  if (cv.width === w * dpr) return;
  cv.width = w * dpr; cv.height = Math.round(w * dpr * M.H / M.W); cv.style.width = w + 'px'; cv.style.height = Math.round(w * M.H / M.W) + 'px'; k = cv.width / M.W; sucio = true; capas = null;
}
function nivelSeguro() { if (!libre(cfg.nivel)) cfg.nivel = prog.max; }
function empezar(seguir = false) {
  nivelSeguro(); api.setPref('cfg', cfg);
  if (!seguir || !S || S.fase === 'fin' || S.fase === 'meta') { S = M.crear(cfg); reg = false; efectos = []; activo = null; api.borrar(); }
  armar(); dibujar();
}

/* ---------- bucle ---------- */
function jugarYa() {
  if (!S || S.fase === 'fin' || S.fase === 'meta') return;
  S.fase = 'jugar'; tPrev = performance.now(); acc = 0; pintarOver();
  cancelAnimationFrame(raf); raf = requestAnimationFrame(bucle);
}
function procesar(ev, res) {
  for (const e of ev) {
    if (e === 'golpe') { api.sonido('error'); api.vibrar([60, 40, 90]); efectos.push({ t: performance.now(), tipo: 'golpe' }); activo = null; }
    else if (e === 'reclamo' && res) { api.sonido('ok'); api.vibrar(15); sucio = true; efectos.push({ t: performance.now(), tipo: 'reclamo', c: S.rec, txt: '+' + res.pts.toLocaleString('es-ES'), x: res.x, y: res.y }); }
    else if (e === 'meta') finPartida(true);
    else if (e === 'fin') finPartida(false);
  }
}
function bucle(t) {
  if (!S || S.fase !== 'jugar') return;
  acc += Math.min(t - tPrev, 100) / 1000; tPrev = t;
  while (acc >= M.DT && S.fase === 'jugar') { acc -= M.DT; const ev = M.paso(S, M.DT); if (ev.length) procesar(ev); }
  dibujar(); pintarHud();
  if (S && S.fase === 'jugar') raf = requestAnimationFrame(bucle);
}
function soltarDedo(e) {
  if (activo == null || (e && e.pointerId != null && e.pointerId !== activo)) return; activo = null;
  if (!S || S.fase !== 'jugar') return;
  const res = M.soltar(S); if (res) procesar(res.ev, res);
}
function pausar() {
  if (!S || S.fase !== 'jugar') return;
  S.rect = null; activo = null; S.fase = 'pausa'; cancelAnimationFrame(raf); raf = 0; guardar(); pintarOver(); dibujar();
}
function finPartida(gana) {
  cancelAnimationFrame(raf); raf = 0; activo = null; tFin = performance.now(); sucio = true;
  const v = M.variante(S);
  if (gana) {
    const e = prog.est[S.nivel] || 0; if (S.est > e) prog.est[S.nivel] = S.est;
    if (S.nivel < M.N_NIVELES && S.nivel >= prog.max) prog.max = S.nivel + 1;
    api.setPref('prog', prog); api.sonido('ganar'); api.vibrar([60, 40, 60, 40, 120]);
  } else { api.sonido('perder'); }
  if (!reg) { reg = true; api.registrar({ res: gana ? 'victoria' : 'partida', variante: v, puntos: S.puntos }); }
  guardar(); pintarHud();
  const t0 = performance.now(), anima = t => { dibujar(); if (t - t0 < 1400 && S && cv) requestAnimationFrame(anima); else pintarOver(); };
  requestAnimationFrame(anima); setTimeout(pintarOver, 1450);
}

/* ---------- dibujo ---------- */
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
function imagenNivel() { const id = imgDe(S.nivel); return imagenTapete(id, () => { sucio = true; if (S) dibujar(); }); }
function cubrir(g, im, w, h, espejo) {
  if (!im) { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#3B6BFF'); gr.addColorStop(1, '#C04DFF'); g.fillStyle = gr; g.fillRect(0, 0, w, h); return; }
  const z = Math.max(w / im.naturalWidth, h / im.naturalHeight), iw = im.naturalWidth * z, ih = im.naturalHeight * z;
  g.save(); if (espejo) { g.translate(w, 0); g.scale(-1, 1); } g.drawImage(im, (w - iw) / 2, (h - ih) / 2, iw, ih); g.restore();
}
function lienzo(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function reconstruir() {
  const w = cv.width, h = cv.height, c = k * M.CELDA, im = imagenNivel(), esp = Math.floor((S.nivel - 1) / 8) % 2 === 1, E = ESTILOS[asp.valores.est] || ESTILOS.neon;
  // 1) imagen descubierta (solo donde hay celdas descubiertas)
  const img = lienzo(w, h), gi = img.getContext('2d');
  cubrir(gi, im, w, h, esp); gi.globalCompositeOperation = 'destination-in';
  const mk = lienzo(w, h), gm = mk.getContext('2d'); gm.fillStyle = '#fff';
  for (let y = 0; y < M.ROWS; y++) { let x = 0; while (x < M.COLS) { if (!S.g[y * M.COLS + x]) { x++; continue; } let x2 = x; while (x2 < M.COLS && S.g[y * M.COLS + x2]) x2++; gm.fillRect(x * c, y * c, (x2 - x) * c + 1, c + 1); x = x2; } }
  gi.drawImage(mk, 0, 0);
  // 2) borde luminoso entre lo descubierto y lo oculto
  const ne = lienzo(w, h), gn = ne.getContext('2d'), seg = [];
  for (let y = 0; y < M.ROWS; y++) for (let x = 0; x < M.COLS; x++) {
    if (S.g[y * M.COLS + x]) continue;
    if (x > 0 && S.g[y * M.COLS + x - 1]) seg.push([x * c, y * c, x * c, (y + 1) * c]);
    if (x < M.COLS - 1 && S.g[y * M.COLS + x + 1]) seg.push([(x + 1) * c, y * c, (x + 1) * c, (y + 1) * c]);
    if (y > 0 && S.g[(y - 1) * M.COLS + x]) seg.push([x * c, y * c, (x + 1) * c, y * c]);
    if (y < M.ROWS - 1 && S.g[(y + 1) * M.COLS + x]) seg.push([x * c, (y + 1) * c, (x + 1) * c, (y + 1) * c]);
  }
  gn.lineCap = 'round'; gn.strokeStyle = E.c; gn.lineWidth = Math.max(2, k * 2.2); gn.shadowColor = E.c; gn.shadowBlur = 10 * k;
  gn.beginPath(); for (const s of seg) { gn.moveTo(s[0], s[1]); gn.lineTo(s[2], s[3]); } gn.stroke();
  // 3) panel sin descubrir
  const pa = lienzo(w, h), gp = pa.getContext('2d'), tp = asp.valores.panel || 'oscuro';
  const gr = gp.createLinearGradient(0, 0, w, h);
  if (tp === 'cristal') { gr.addColorStop(0, '#4A5799'); gr.addColorStop(1, '#8E9BE0'); } else { gr.addColorStop(0, '#080C28'); gr.addColorStop(1, '#1A2260'); }
  gp.fillStyle = gr; gp.fillRect(0, 0, w, h);
  if (tp === 'borroso' && im) { gp.globalAlpha = .3; cubrir(gp, im, w, h, esp); gp.globalAlpha = 1; gp.fillStyle = 'rgba(8,12,40,.55)'; gp.fillRect(0, 0, w, h); }
  gp.fillStyle = tp === 'cristal' ? 'rgba(255,255,255,.16)' : 'rgba(120,140,255,.14)';
  for (let y = 1; y < M.ROWS; y++) for (let x = 1; x < M.COLS; x++) gp.fillRect(x * c - 1, y * c - 1, 2 * k, 2 * k);
  capas = { img, ne, pa, im };
}
function dibujar() {
  if (!S || !cv || !ctx) return;
  const ahora = performance.now(), E = ESTILOS[asp.valores.est] || ESTILOS.neon, c = M.CELDA;
  if (sucio || !capas || capas.im !== (imagenNivel())) { reconstruir(); sucio = false; }
  ctx.setTransform(k, 0, 0, k, 0, 0);
  const gl = efectos.find(e => e.tipo === 'golpe' && ahora - e.t < 400); if (gl) { const f = (1 - (ahora - gl.t) / 400) * 5; ctx.translate((Math.random() - .5) * f, (Math.random() - .5) * f); }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(capas.pa, 0, 0); ctx.drawImage(capas.img, 0, 0);
  if (S.fase === 'meta') {                       // victoria: se desvela toda la imagen
    const f = Math.min(1, (ahora - tFin) / 800), e = Math.min(1, f); ctx.globalAlpha = e; const t2 = lienzo(cv.width, cv.height); cubrir(t2.getContext('2d'), capas.im, cv.width, cv.height, Math.floor((S.nivel - 1) / 8) % 2 === 1); ctx.drawImage(t2, 0, 0); ctx.globalAlpha = 1;
  } else ctx.drawImage(capas.ne, 0, 0);
  ctx.restore();
  // destello de lo recién descubierto
  efectos = efectos.filter(e => ahora - e.t < 900);
  for (const e of efectos) if (e.tipo === 'reclamo') {
    const f = (ahora - e.t) / 900, cc = e.c; if (cc && f < .5) { ctx.fillStyle = `rgba(255,255,255,${(1 - f * 2) * .6})`; ctx.fillRect(cc.x0 * c, cc.y0 * c, (cc.x1 - cc.x0 + 1) * c, (cc.y1 - cc.y0 + 1) * c); }
    ctx.globalAlpha = 1 - f; ctx.fillStyle = '#fff'; ctx.font = '800 18px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3;
    ctx.strokeText(e.txt, e.x * c, e.y * c - f * 30); ctx.fillText(e.txt, e.x * c, e.y * c - f * 30); ctx.globalAlpha = 1;
  }
  // rectángulo que crece
  const q = M.cuadro(S);
  if (q) {
    const r = S.rect, tx0 = Math.min(r.ax, r.tx), tx1 = Math.max(r.ax, r.tx), ty0 = Math.min(r.ay, r.ty), ty1 = Math.max(r.ay, r.ty);
    ctx.setLineDash([6, 5]); ctx.lineDashOffset = -ahora / 60; ctx.strokeStyle = rgba(E.c, .55); ctx.lineWidth = 1.5; ctx.strokeRect(tx0 * c + .5, ty0 * c + .5, (tx1 - tx0 + 1) * c - 1, (ty1 - ty0 + 1) * c - 1); ctx.setLineDash([]);
    const x = q.x0 * c, y = q.y0 * c, w = (q.x1 - q.x0 + 1) * c, h = (q.y1 - q.y0 + 1) * c;
    ctx.fillStyle = rgba(E.c, .28); ctx.fillRect(x, y, w, h);
    ctx.shadowColor = E.c; ctx.shadowBlur = 12; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.strokeRect(x, y, w, h); ctx.shadowBlur = 0;
  }
  // jefes
  const emo = emojiPersonaje(asp);
  for (const b of S.jefes) jefe(b, ahora, emo);
  // aviso: pulsa junto a una zona descubierta
  if (aviso && ahora - aviso < 900 && S.fase === 'jugar') { ctx.globalAlpha = 1 - (ahora - aviso) / 900; ctx.fillStyle = 'rgba(10,15,40,.8)'; ctx.fillRect(40, M.H - 62, M.W - 80, 32); ctx.fillStyle = '#fff'; ctx.font = '700 13px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Empieza junto a una zona descubierta', M.W / 2, M.H - 41); ctx.globalAlpha = 1; }
  if (S.inv > 0 && S.fase === 'jugar') { ctx.fillStyle = `rgba(255,40,60,${S.inv / .6 * .25})`; ctx.fillRect(0, 0, M.W, M.H); }
}
function jefe(b, t, emo) {
  const c = M.CELDA, x = b.x * c, y = b.y * c, col = COLJ[b.t], rr = 10 + Math.sin(t / 160 + b.x) * 1.2;
  if (emo) { ctx.font = `${Math.round(c * 2.6)}px system-ui,'Apple Color Emoji','Segoe UI Emoji',sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.fillText(emo, x, y + 1); ctx.shadowBlur = 0; return; }
  const g = ctx.createRadialGradient(x, y, 1, x, y, rr * 2.2); g.addColorStop(0, rgba(col, .55)); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr * 2.2, 0, 6.283); ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.rotate(t / 400 * (b.t === 'rebote' ? 1 : -1));
  ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.shadowColor = col; ctx.shadowBlur = 10;
  ctx.beginPath(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, rr * .75, 0, 6.283); ctx.stroke(); ctx.restore(); ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 6.283); ctx.fill();
}
function pintarHud() {
  if (!S || !$('#qxPts')) return;
  const p = M.pct(S), clave = S.puntos + '|' + S.vidas + '|' + Math.round(p * 10); if (clave === hudAnt) return; hudAnt = clave;
  $('#qxPts').textContent = S.puntos.toLocaleString('es-ES'); $('#qxVid').textContent = '❤️'.repeat(Math.max(0, S.vidas)) + '🖤'.repeat(Math.max(0, S.vidas0 - S.vidas));
  $('#qxNiv').textContent = `Nivel ${S.nivel}`; $('#qxBar').style.width = Math.min(100, p) + '%'; $('#qxObj').style.left = S.obj + '%'; $('#qxPct').textContent = `${Math.floor(p)} % / ${S.obj} %`;
}
function pintarOver() {
  const o = $('#qxOver'); if (!o || !S) return;
  o.hidden = S.fase === 'jugar'; const def = M.NIVELES[S.nivel - 1], nom = `Nivel ${S.nivel}: ${def.n}`;
  if (S.fase === 'listo') o.innerHTML = `<div><b>💠 ¡Preparado!</b><span>${esc(nom)}</span><span>Descubre el ${S.obj} % de la imagen</span><span>Pulsa junto a lo descubierto y desliza</span><span>Toca para empezar</span></div>`;
  else if (S.fase === 'pausa') o.innerHTML = `<div><b>⏸️ Pausa</b><span>${esc(nom)} · ${Math.floor(M.pct(S))} %</span><span>Toca para seguir</span></div>`;
  else if (S.fase === 'meta') {
    const sig = S.nivel < M.N_NIVELES;
    o.innerHTML = `<div class="fin"><b>🏁 ¡Nivel superado!</b><span class="est">${'★'.repeat(S.est)}${'☆'.repeat(3 - S.est)}</span><span class="g">${S.puntos.toLocaleString('es-ES')} puntos</span><span class="bts">${sig ? '<button class="btn on" data-ac="siguiente">➡️ Siguiente</button>' : ''}<button class="btn ${sig ? '' : 'on'}" data-ac="otra">🔁 Repetir</button><button class="btn" data-ac="opciones">⚙️ Niveles</button></span></div>`;
  } else if (S.fase === 'fin') o.innerHTML = `<div class="fin"><b>💥 ¡Sin vidas!</b><span class="g">${Math.floor(M.pct(S))} % de ${S.obj} % · ${S.puntos.toLocaleString('es-ES')} puntos</span><span class="bts"><button class="btn on" data-ac="otra">🔁 Otra vez</button><button class="btn" data-ac="opciones">⚙️ Opciones</button></span></div>`;
}

/* ---------- entrada ---------- */
function teclado(e) {
  if (!S || !cv || document.querySelector('.modal') || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const key = e.key.toLowerCase();
  if (key === 'p' || key === ' ') { e.preventDefault(); if (S.fase === 'jugar') pausar(); else if (S.fase === 'pausa' || S.fase === 'listo') jugarYa(); }
  else if (key === 'enter' && (S.fase === 'fin' || S.fase === 'meta')) empezar();
}
function clic(e) {
  const b = e.target.closest('button,[data-ac]'); if (!b) return; const d = b.dataset;
  if (d.cfg) { cfg[d.cfg] = d.v === 'true' ? true : d.v === 'false' ? false : (d.cfg === 'vidas' ? +d.v : d.v); api.setPref('cfg', cfg); return setup(); }
  if (d.niv) { cfg.nivel = +d.niv; api.setPref('cfg', cfg); return setup(); }
  const a = d.ac;
  if (a === 'start' || a === 'otra') empezar(); else if (a === 'seguir') empezar(true);
  else if (a === 'siguiente') { cfg.nivel = Math.min(M.N_NIVELES, S.nivel + 1); empezar(); }
  else if (a === 'opciones') { pausar(); setup(); } else if (a === 'aspecto') { pausar(); asp.abrir(); }
  else if (a === 'pausa') { if (S && S.fase === 'jugar') pausar(); else if (S && S.fase === 'pausa') jugarYa(); }
}
function reglas() {
  api.modal('Quantix', `<ul><li>Hay una imagen oculta bajo un panel oscuro. Tu misión es <b>descubrir</b> el porcentaje que marca el objetivo.</li>
    <li><b>Pulsa junto a una zona ya descubierta</b> (al principio, el borde) y <b>desliza</b> el dedo: se forma un cuadrado que crece hacia donde apuntas. Suelta para descubrirlo.</li>
    <li>Mientras el cuadrado crece está <b>en peligro</b>: si un jefe lo toca, pierdes una vida y el cuadrado se cancela. Cuanto más grande y más lento, más riesgo.</li>
    <li>Si tus cuadrados encierran una zona sin jefes, esa zona se descubre sola.</li>
    <li><b>Jefes</b>: <span style="color:#FF4FD8">rebotadores</span> (en línea recta), <span style="color:#FFB020">errantes</span> (giran al azar) y <span style="color:#FF3B3B">cazadores</span> (persiguen tu cuadrado).</li>
    <li><b>IA del jefe</b>: Dócil (rebota al azar), Normal (rebota y empieza a perseguir tu cuadrado), Astuto (te persigue bastante) y Maestro (sabe con precisión dónde estás y te persigue sin descanso). <b>Velocidad</b>: Lenta, Media (+20 %), Rápida (+40 %) o Supersónica (+60 %). <b>Objetivo</b>: 60, 75 o 90 %. <b>Crecimiento del cuadrado</b>: Pequeño, Mediano o Grande.</li>
    <li>Niveles cada vez más difíciles (más jefes y más rápidos), con imágenes de los escenarios de Guerra de Orugas. Puntos por celdas (más si el cuadrado es grande), vidas sobrantes y estrellas (3 ★ sin perder vidas).</li></ul>`);
}
