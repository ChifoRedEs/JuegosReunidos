import { $, esc } from '../../core/dom.js';
import * as M from './motor.js';

const IMG = new URL('../../../img/pinball/', import.meta.url).href;
const SPR = ['aleta', 'bumper', 'estrella', 'seta', 'bola', 'bolaoro', 'resorte', 'luz', 'mesa-mundo', 'mesa-espacio'];
const MESAS = [{ id: 'mundo', nombre: 'Mapamundi' }, { id: 'espacio', nombre: 'Espacio' }];
let S = null, api = null, asp = null, root = null, cv = null, cx = null, raf = 0, tPrev = 0, acc = 0, pausado = false, dpr = 1, esc_ = 1;
let img = {}, pulso = [], teclas = {}, carga = 0, cargando = false, reg = false, podioPos = -1, nuevoRecord = false, record = 0, onKey = null, onKeyUp = null, onVis = null, onRes = null, sonT = {}, flash = 0, hudAnt = '';
const variante = n => `Pinball · ${n} bolas`;

/* ---------- validación / resumen ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || !Object.hasOwn(M.BOLAS, d.bolas)) return null;
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  if (!ent(d.bolaN, 1, d.bolas) || !ent(d.pts, 0, 1e9) || !ent(d.mult, 1, 5) || !Array.isArray(d.luces) || d.luces.length !== 5 || !d.luces.every(v => typeof v === 'boolean')) return null;
  return { bolas: d.bolas, bolaN: d.bolaN, pts: d.pts, mult: d.mult, luces: d.luces.slice(), fin: !!d.fin, reg: !!d.reg };
}
export const migrarV1 = d => d;
export function resumen(d) { return d.fin ? { texto: `${d.bolas} bolas · ${d.pts.toLocaleString('es-ES')} puntos`, fin: true } : { texto: `${d.bolas} bolas · bola ${d.bolaN}/${d.bolas} · ${d.pts.toLocaleString('es-ES')} puntos`, fin: false }; }

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; pausado = false; reg = false; podioPos = -1; nuevoRecord = false; pulso = []; teclas = {}; hudAnt = '';
  asp = api.aspecto([
    { clave: 'mesa', titulo: 'Mesa', icono: '🎯', def: 'mundo', ventana: true, forma: 'tapete', opciones: MESAS.map(m => ({ id: m.id, nombre: m.nombre, img: `${IMG}mesa-${m.id}.webp` })) },
    { clave: 'bola', titulo: 'Bola', icono: '⚪', def: 'acero', ventana: true, forma: 'carta', opciones: [{ id: 'acero', nombre: 'Acero', img: IMG + 'bola.webp' }, { id: 'oro', nombre: 'Oro', img: IMG + 'bolaoro.webp' }] },
  ], () => { if (cv) dibujar(); });
  await api.css(new URL('./pinball.css', import.meta.url));
  const g = api.cargar();
  root.innerHTML = `<div class="pbhud"><span>Bola <b id="pbBola">1</b>/<b id="pbDe">3</b></span><span class="pts"><b id="pbPts">0</b> pts</span><span id="pbMult" class="mult" title="Multiplicador">×1</span><span>🏆 <b id="pbRec">0</b></span></div>
    <div class="pbzona" id="pbZona"><canvas id="pbCv" aria-label="Mesa de pinball"></canvas><div class="pbover" id="pbOver" hidden></div></div>
    <div class="pbctl"><button class="btn pbfl" data-f="0" aria-label="Aleta izquierda">◀</button><button class="btn on pblan" id="pbLan" aria-label="Lanzar (mantén y suelta)">⬆ Lanzar</button><button class="btn pbfl" data-f="1" aria-label="Aleta derecha">▶</button></div>
    <p class="note pbayuda">Mantén <b>Lanzar</b> para cargar el muelle y suéltalo. ◀ ▶ (o las flechas / Z y M del teclado; Espacio lanza) mueven las aletas.</p>${api.barraHtml()}`;
  cv = $('#pbCv'); cx = cv.getContext('2d');
  const n = g && !g.fin ? g.bolas : api.pref('bolas', 3);
  img = {}; await Promise.all(SPR.map(k => new Promise(ok => { const i = new Image(); i.onload = i.onerror = ok; i.src = `${IMG}${k}.webp`; img[k] = i; })));
  if (!root) return;
  iniciar(n, g && !g.fin ? g : null);
  root.addEventListener('pointerdown', puls); root.addEventListener('pointerup', puls); root.addEventListener('pointercancel', puls); root.addEventListener('click', clic);
  onKey = e => tecla(e, true); onKeyUp = e => tecla(e, false);
  document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKeyUp);
  onVis = () => { if (document.hidden) pausar(); }; document.addEventListener('visibilitychange', onVis);
  onRes = () => { medir(); dibujar(); }; window.addEventListener('resize', onRes);
  api.barra({ nueva: () => nueva(false), etiqueta: 'Nueva partida', salir: () => { location.hash = '#/cat/arcade'; }, pausar, reanudar: () => { pausado = false; tPrev = 0; bucle0(); },
    config: { valores: () => ({ bolas: S.bolas }), grupos: () => [{ clave: 'bolas', titulo: 'Bolas', opciones: Object.entries(M.BOLAS).map(([k, v]) => [Number(k), v]) }], aplicar: v => { api.setPref('bolas', v.bolas); nueva(true, v.bolas); } } });
  api.menu([{ texto: 'Nueva partida', accion: () => nueva(false) }, { texto: '🏆 Podio', accion: verPodio }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: '📖 Reglas', accion: reglas }]);
  medir(); dibujar(); bucle0();
}
export function unmount() {
  cancelAnimationFrame(raf); raf = 0; if (S && S.fase !== 'fin') guardar();
  document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKeyUp); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('resize', onRes);
  if (root) { root.removeEventListener('pointerdown', puls); root.removeEventListener('pointerup', puls); root.removeEventListener('pointercancel', puls); root.removeEventListener('click', clic); }
  S = null; api = null; asp = null; root = null; cv = null; cx = null; img = {};
}
function guardar() { if (!S) return; const d = { bolas: S.bolas, bolaN: S.bolaN, pts: S.pts, mult: S.mult, luces: S.luces.slice(), fin: S.fase === 'fin', reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }
function iniciar(n, g) {
  S = M.crear({ bolas: n }); reg = false; podioPos = -1; nuevoRecord = false;
  if (g) { S.bolaN = g.bolaN; S.pts = g.pts; S.mult = g.mult; S.luces = g.luces.slice(); }
  record = api.record(variante(n)) || 0; $('#pbOver').hidden = true; hudAnt = ''; hud();
}
async function nueva(forzar, n) {
  if (!forzar && S && S.fase !== 'fin' && S.pts > 0 && !await api.confirmar('¿Empezar una partida nueva? Perderás la actual.')) return;
  iniciar(n || S.bolas, null); guardar(); pausado = false; if (!raf) bucle0();
}
function pausar() { pausado = true; cargando = false; carga = 0; if (S) S.carga = 0; M.aleta(S, 0, false); M.aleta(S, 1, false); }

/* ---------- entrada ---------- */
function puls(e) {
  const bt = e.target.closest('button'); if (!bt || !root.contains(bt)) return; const abajo = e.type === 'pointerdown';
  if (bt.dataset.f != null) { e.preventDefault(); if (S) M.aleta(S, Number(bt.dataset.f), abajo); }
  else if (bt.id === 'pbLan') { e.preventDefault(); lanza(abajo); }
}
function lanza(abajo) {
  if (!S || S.fase === 'fin') return;
  if (abajo) { if (S.fase === 'lanzar') { cargando = true; carga = 0; } }
  else if (cargando) { cargando = false; if (M.lanzar(S, 0.25 + 0.75 * carga)) sonar('mover'); carga = 0; S.carga = 0; }
}
function tecla(e, abajo) {
  if (!S || !root || e.repeat || /INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) return;
  const k = e.key.toLowerCase();
  if (k === 'arrowleft' || k === 'z' || k === 'a') { e.preventDefault(); M.aleta(S, 0, abajo); }
  else if (k === 'arrowright' || k === 'm' || k === 'd' || k === '/') { e.preventDefault(); M.aleta(S, 1, abajo); }
  else if (k === ' ' || k === 'arrowdown') { e.preventDefault(); lanza(abajo); }
}
function clic(e) {
  const b = e.target.closest('[data-ac]'); if (!b) return;
  if (b.dataset.ac === 'nueva') nueva(true, S.bolas); else if (b.dataset.ac === 'podio') verPodio();
}
function sonar(n, ms = 90) { const t = performance.now(); if (t - (sonT[n] || 0) < ms) return; sonT[n] = t; api.sonido(n); }

/* ---------- bucle ---------- */
function bucle0() { if (raf) return; tPrev = 0; raf = requestAnimationFrame(bucle); }
function bucle(t) {
  raf = 0; if (!S || !root) return;
  if (pausado) { raf = 0; return; }
  if (!tPrev) tPrev = t; const dt = Math.min(0.05, (t - tPrev) / 1000); tPrev = t; acc += dt;
  if (cargando && S.fase === 'lanzar') { carga = Math.min(1, carga + dt / 1.1); S.carga = carga; }
  while (acc >= M.DT) { M.paso(S); acc -= M.DT; }
  eventos(); dibujar(); hud();
  raf = requestAnimationFrame(bucle);
}
function eventos() {
  for (const e of S.ev) {
    if (e.tipo === 'bumper') { pulso[e.i] = performance.now(); sonar('ok', 60); flash = performance.now(); api.vibrar && api.vibrar(8); }
    else if (e.tipo === 'goma') sonar('click', 80);
    else if (e.tipo === 'aleta') sonar('click', 50);
    else if (e.tipo === 'bonus' || e.tipo === 'mult') sonar('ganar', 400);
    else if (e.tipo === 'perdida') { sonar('error', 300); guardar(); }
    else if (e.tipo === 'salvada') sonar('dado', 300);
    else if (e.tipo === 'fin') terminar();
  }
  S.ev.length = 0;
}
async function terminar() {
  if (reg) return; reg = true; nuevoRecord = S.pts > record; guardar();
  api.registrar({ res: S.mult >= 2 || S.ganado ? 'victoria' : 'derrota', variante: variante(S.bolas), puntos: S.pts });   // ganas si enciendes las 5 luces (multiplicador ×2 o más)
  const o = $('#pbOver'); fin(o);
  const v = variante(S.bolas); if (api.podio.entra(v, S.pts)) { podioPos = await api.podio.anotar(v, S.pts); if (root) fin($('#pbOver')); }
}
function fin(o) {
  if (!o) return; o.hidden = false;
  o.innerHTML = `<div class="fin"><b>🎱 ¡Fin de la partida!</b><span class="g">${S.pts.toLocaleString('es-ES')} puntos</span>${nuevoRecord ? '<span class="rec">🎉 ¡Nuevo récord!</span>' : ''}${podioPos >= 0 ? `<span class="rec">🏆 Puesto ${podioPos + 1} del podio</span>` : ''}<button class="btn on" data-ac="nueva">Otra partida</button></div>`;
}
function verPodio() { api.modal('🏆 Podio', Object.keys(M.BOLAS).map(n => `<h3>${esc(variante(n))}</h3>${api.podio.html(variante(n))}`).join('')); }
function reglas() {
  api.modal('Pinball', `<ul><li>Mantén <b>Lanzar</b> para tensar el muelle y suéltalo para lanzar la bola. Más tiempo = más fuerza.</li>
    <li>Con ◀ y ▶ (o las flechas) mueves las <b>aletas</b>: golpea la bola antes de que caiga por el hueco de abajo.</li>
    <li>Los <b>bumpers</b> dan 100 puntos y las gomas laterales 10. Cuando enciendas las 5 luces con los 5 bumpers, ganas <b>1.000 puntos</b> y sube el multiplicador (hasta ×5).</li>
    <li>Tienes ${Object.keys(M.BOLAS).join(' o ')} bolas. Si pierdes la bola justo tras lanzarla, ¡te la devolvemos gratis!</li></ul>`);
}

/* ---------- dibujo ---------- */
function medir() {
  const z = $('#pbZona'); if (!z || !cv) return; const w = z.clientWidth || 340; dpr = Math.min(window.devicePixelRatio || 1, 3); esc_ = w / M.W;
  cv.width = Math.round(w * dpr); cv.height = Math.round(w * M.H / M.W * dpr); cv.style.width = w + 'px'; cv.style.height = (w * M.H / M.W) + 'px';
}
function dibujar() {
  if (!cx || !S) return; if (!cv.width) medir();
  const k = cv.width / M.W, c = cx; c.setTransform(k, 0, 0, k, 0, 0); c.clearRect(0, 0, M.W, M.H);
  const mesa = img['mesa-' + (asp.valores.mesa === 'espacio' ? 'espacio' : 'mundo')]; if (mesa && mesa.naturalWidth) c.drawImage(mesa, 0, 0, M.W, M.H);
  const ahora = performance.now();
  // muelle del lanzador
  const rs = img.resorte; if (rs && rs.naturalWidth) { c.save(); c.translate(M.LANZA.x, 962 + S.carga * 14); c.rotate(-Math.PI / 2); c.drawImage(rs, -4, -14, 66 - S.carga * 12, 28); c.restore(); }
  // bumpers
  S.m.bumpers.forEach((b, i) => {
    const im = img[b.tipo === 'estrella' ? 'estrella' : b.tipo === 'seta' ? 'seta' : 'bumper']; const p = Math.max(0, 1 - (ahora - (pulso[i] || -1e9)) / 160), s = (b.r * 2 + 12) * (1 + 0.16 * p);
    if (S.luces[i]) { c.beginPath(); c.arc(b.x, b.y, b.r + 8 + 4 * p, 0, 6.3); c.fillStyle = 'rgba(255,224,120,.55)'; c.fill(); }
    if (im && im.naturalWidth) { const h = s * im.naturalHeight / im.naturalWidth; c.drawImage(im, b.x - s / 2, b.y - h / 2, s, h); }
  });
  // aletas (el sprite apunta a la derecha con el pivote a la izquierda)
  const al = img.aleta; if (al && al.naturalWidth) for (const f of S.m.aletas) {
    c.save(); c.translate(f.x, f.y); c.rotate(f.a); if (f.lado < 0) c.scale(1, -1); const sc = 0.36; c.drawImage(al, -38 * sc - 4, -al.naturalHeight * sc / 2, al.naturalWidth * sc, al.naturalHeight * sc); c.restore();
  }
  // bola
  const bi = img[asp.valores.bola === 'oro' ? 'bolaoro' : 'bola']; const b = S.bola;
  if (S.fase !== 'fin' && bi && bi.naturalWidth) { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(b.x + 3, b.y + 5, M.R, M.R * .8, 0, 0, 6.3); c.fill(); c.drawImage(bi, b.x - M.R - 2, b.y - M.R - 2, 2 * M.R + 4, 2 * M.R + 4); }
  // barra de potencia del lanzador
  if (S.fase === 'lanzar' && (cargando || S.carga > 0)) { c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(556, 760, 10, 170); c.fillStyle = S.carga > .8 ? '#E5484D' : '#F5C542'; c.fillRect(557, 930 - 168 * S.carga, 8, 168 * S.carga); }
}
function hud() {
  const t = `${S.bolaN}|${S.bolas}|${S.pts}|${S.mult}|${Math.max(record, S.pts)}`; if (t === hudAnt) return; hudAnt = t;
  $('#pbBola').textContent = S.bolaN; $('#pbDe').textContent = S.bolas; $('#pbPts').textContent = S.pts.toLocaleString('es-ES'); $('#pbMult').textContent = '×' + S.mult; $('#pbRec').textContent = Math.max(record, S.pts).toLocaleString('es-ES');
}
