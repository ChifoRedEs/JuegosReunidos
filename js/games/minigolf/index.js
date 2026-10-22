// Minigolf: recorrido de 9 hoyos para 1 a 4 jugadores por turnos. Arrastra hacia atrás desde la bola y suelta.
import { $, esc } from '../../core/dom.js';
import * as M from './motor.js';
import { HOYOS, PAR_TOTAL } from './hoyos.js';
import { grupoFondo, grupoPersonaje, emojiPersonaje, tapeteElegido } from '../../core/aspectos.js';
import { imagenTapete, pintarTapete } from '../../core/cartas.js';

const CAMPOS = {
  clasico: { nombre: 'Clásico', cesped: '#3DBE5A', raya: '#36AE51', borde: '#8B5A2B', muro: '#A86E3A', sw: ['#3DBE5A', '#8B5A2B'] },
  noche: { nombre: 'Noche', cesped: '#1F5C3A', raya: '#1B5233', borde: '#2F6BFF', muro: '#3E7BFF', sw: ['#1F5C3A', '#2F6BFF'] },
  desierto: { nombre: 'Desierto', cesped: '#8DBF4A', raya: '#84B444', borde: '#C9733A', muro: '#D98848', sw: ['#8DBF4A', '#C9733A'] },
  hielo: { nombre: 'Hielo', cesped: '#BFE6FF', raya: '#B2DDF8', borde: '#5A7FB8', muro: '#7092C8', sw: ['#BFE6FF', '#5A7FB8'] },
};
const COLORES = ['#FF4757', '#2F6BFF', '#FFC21A', '#9B5DE5'];
const NOMBRE_RES = d => (d <= -3 ? '¡Albatros!' : d === -2 ? '¡Eagle!' : d === -1 ? '¡Birdie!' : d === 0 ? 'Par' : d === 1 ? 'Bogey' : d === 2 ? 'Doble bogey' : `+${d}`);
let S = null, H = null, api = null, asp = null, root = null, cv = null, ctx = null, dpr = 1, esc2 = 1, raf = 0, tPrev = 0, reg = false;
let arrastre = null, cartel = null, espera = null, onVis = null, onRes = null, cfg = { jug: ['Tú', 'Jugador 2', 'Jugador 3', 'Jugador 4'], n: 1 };

/* ---------- validación / resumen ---------- */
export function validar(d) { const s = d && M.validar(d.s); return s ? { s, reg: !!d.reg } : null; }
export const migrarV1 = d => d;
export function resumen(d) {
  const s = d.s, j0 = M.total(s, 0), dif = j0 - M.parHasta(s, 0), rel = dif === 0 ? 'par' : dif > 0 ? `+${dif}` : `${dif}`;
  if (s.fase === 'fin') return { texto: s.nombres.length > 1 ? `Ganó ${ganadores(s).map(k => s.nombres[k]).join(' y ')}` : `${j0} golpes (${rel})`, fin: true };
  return { texto: `Hoyo ${s.hoyo + 1}/9 · ${s.nombres.length > 1 ? `${s.nombres.length} jugadores` : `${j0} golpes (${rel})`}`, fin: false };
}
const ganadores = s => { const t = s.nombres.map((_, k) => M.total(s, k)), m = Math.min(...t); return t.map((v, k) => (v === m ? k : -1)).filter(k => k >= 0); };

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; arrastre = null; cartel = null;
  asp = api.aspecto([grupoFondo(''), grupoPersonaje('Personajes (tu bola)'), { clave: 'campo', titulo: 'Campo', def: 'clasico', opciones: Object.entries(CAMPOS).map(([id, c]) => ({ id, nombre: c.nombre, sw: c.sw })) }], () => dibujar());
  await api.css(new URL('./minigolf.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && Array.isArray(c0.jug) && c0.jug.length === 4 && c0.n >= 1 && c0.n <= 4) cfg = { jug: c0.jug.map(x => String(x).slice(0, 14)), n: c0.n };
  const g = api.cargar(); S = g ? g.s : null; reg = g ? g.reg : false;
  root.addEventListener('click', clic); root.addEventListener('input', alEscribir);
  onVis = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; guardar(); } else if (cv && !raf) { tPrev = performance.now(); raf = requestAnimationFrame(bucle); } };
  document.addEventListener('visibilitychange', onVis);
  onRes = () => { if (cv) { ajustar(); dibujar(); } }; addEventListener('resize', onRes);
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '📋 Tarjeta', accion: verTarjeta }, { texto: '🏆 Podio (10 mejores)', accion: verPodio }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Cómo se juega', accion: reglas }]);
  if (S && S.fase !== 'fin') armar(); else setup();
}
export function unmount() {
  cancelAnimationFrame(raf); raf = 0;
  if (espera) { clearTimeout(espera); espera = null; if (S && S.fase === 'espera') M.apuntar(S, pendiente); }   // se apunta el hoyo aunque se salga en plena celebración
  guardar();
  document.removeEventListener('visibilitychange', onVis); removeEventListener('resize', onRes);
  if (root) { root.removeEventListener('click', clic); root.removeEventListener('input', alEscribir); }
  S = null; cv = null; asp = null;
}
function guardar() { if (!S || S.fase === 'espera') return; const d = { s: S, reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- pantallas ---------- */
function setup() {
  cancelAnimationFrame(raf); raf = 0; cv = null;
  root.innerHTML = `<p class="note">Recorrido de 9 hoyos (par ${PAR_TOTAL}). <b>Arrastra hacia atrás</b> desde la bola, como un tirachinas, y suelta para golpear: cuanto más lejos, más fuerte. Con varios jugadores, cada uno completa el hoyo por turnos.</p>
    <div class="bar"><span class="lbl">Jugadores</span><div class="seg">${[1, 2, 3, 4].map(n => `<button class="btn ${cfg.n === n ? 'on' : ''}" data-njug="${n}">${n}</button>`).join('')}</div></div>
    ${cfg.jug.slice(0, cfg.n).map((nom, i) => `<div class="mgrow" style="--c:${COLORES[i]}"><i></i><input class="nom" data-name="${i}" maxlength="14" value="${esc(nom)}" aria-label="Nombre del jugador ${i + 1}"></div>`).join('')}
    <div class="bar"><button class="btn on" data-ac="start">⛳ Empezar</button><button class="btn" data-ac="podio">🏆 Podio</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button></div>`;
}
function nuevaSetup() { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; api.borrar(); S = null; setup(); }
function empezar() {
  api.setPref('cfg', cfg);
  S = M.crear(cfg.jug.slice(0, cfg.n).map((n, i) => n.trim() || `Jugador ${i + 1}`)); reg = false; api.borrar();
  armar(); guardar();
}
function armar() {
  root.innerHTML = `<div class="mghud" id="mgHud"></div>
    <div class="mgzona" id="mgZona"><canvas id="mgCv" aria-label="Hoyo de minigolf: arrastra hacia atrás desde la bola y suelta"></canvas></div>
    <div class="msg" id="mgMsg" role="status" aria-live="polite"></div>
    <div class="mgtarj" id="mgTarj"></div>
    <div class="bar" style="justify-content:center"><button class="btn" data-ac="tarjeta">📋 Tarjeta</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="nueva">Nueva partida</button></div>`;
  cv = $('#mgCv'); ctx = cv.getContext('2d'); dpr = Math.min(window.devicePixelRatio || 1, 3);
  cv.addEventListener('pointerdown', abajo); cv.addEventListener('pointermove', mueve);
  for (const t of ['pointerup', 'pointercancel']) cv.addEventListener(t, arriba);
  cargarHoyo(); ajustar(); pintarHud(); tPrev = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(bucle);
}
function cargarHoyo() { if (S && S.fase !== 'fin') H = M.preparar(HOYOS[S.hoyo]); }
function ajustar() {
  if (!cv) return;
  const zona = $('#mgZona'), ancho0 = zona.parentElement.getBoundingClientRect().width, altoDisp = Math.max(380, innerHeight - zona.getBoundingClientRect().top - 120);
  const ancho = Math.floor(Math.min(ancho0, 440, altoDisp * 400 / 700)), alto = Math.round(ancho * 700 / 400);
  zona.style.width = ancho + 'px'; cv.width = ancho * dpr; cv.height = alto * dpr; cv.style.height = alto + 'px'; esc2 = ancho / 400;
}

/* ---------- apuntar y golpear ---------- */
const aMesa = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 400, (e.clientY - r.top) / r.height * 700]; };
const MAX_TIRON = 190;
function abajo(e) { if (!S || S.fase !== 'apuntar' || espera) return; arrastre = { p: aMesa(e), id: e.pointerId }; try { cv.setPointerCapture(e.pointerId); } catch { /* */ } e.preventDefault(); }
function mueve(e) { if (arrastre && e.pointerId === arrastre.id) arrastre.p = aMesa(e); }
function arriba(e) {
  if (!arrastre || e.pointerId !== arrastre.id) return;
  const t = tiro(); arrastre = null;
  if (!t || t.f < .04) return;
  S.anterior = { x: S.bola.x, y: S.bola.y }; S.golpes++;
  M.golpear(S.bola, t.ang, t.f); S.fase = 'rodando'; api.sonido('click'); api.vibrar(15); pintarHud();
}
function tiro() {                                        // de la bola al dedo, al revés: como un tirachinas
  if (!arrastre) return null;
  const dx = S.bola.x - arrastre.p[0], dy = S.bola.y - arrastre.p[1], d = Math.hypot(dx, dy);
  return d < 4 ? null : { ang: Math.atan2(dy, dx), f: Math.min(1, d / MAX_TIRON) };
}

/* ---------- bucle ---------- */
function bucle(t) {
  if (!S || !cv) return;
  const dt = Math.min((t - tPrev) / 1000, 1 / 20); tPrev = t; S.t += dt;
  if (S.fase === 'rodando') {
    const ev = M.avanzar(H, S.bola, dt, S.t - dt);
    if (ev.has('rebote') || ev.has('tope')) api.sonido('click');
    if (ev.has('agua')) { S.golpes++; S.bola = { ...S.anterior, vx: 0, vy: 0 }; S.fase = 'apuntar'; cartel = { t: 1.2, txt: '💦 ¡Al agua! +1 golpe' }; api.sonido('error'); comprobarMaximo(); guardar(); }
    else if (ev.has('dentro')) { const dif = S.golpes - HOYOS[S.hoyo].par; cartel = { t: 1.6, txt: S.golpes === 1 ? '🎉 ¡HOYO EN UNO!' : `⛳ ${NOMBRE_RES(dif)}` }; api.sonido(dif <= 0 ? 'ganar' : 'ok'); api.vibrar([40, 30, 40]); siguiente(S.golpes); }
    else if (ev.has('parada')) { S.fase = 'apuntar'; comprobarMaximo(); guardar(); }
    pintarHud();
  }
  if (cartel) { cartel.t -= dt; if (cartel.t <= 0) cartel = null; }
  dibujar();
  raf = requestAnimationFrame(bucle);
}
function comprobarMaximo() {
  const max = M.golpesMax(HOYOS[S.hoyo]);
  if (S.golpes >= max) { cartel = { t: 1.6, txt: `Máximo de golpes (${max})` }; siguiente(max); }
}
let pendiente = 0;
function siguiente(golpes) {
  S.fase = 'espera'; clearTimeout(espera); pendiente = golpes;
  espera = setTimeout(() => {
    espera = null; if (!S) return;
    const nombre = S.nombres[S.jugador], fin = M.apuntar(S, golpes);
    if (fin) return terminar();
    cargarHoyo();
    if (S.nombres.length > 1) cartel = { t: 1.4, txt: `Turno de ${S.nombres[S.jugador]}` };
    else if (S.jugador === 0) cartel = { t: 1.4, txt: `Hoyo ${S.hoyo + 1}: ${HOYOS[S.hoyo].nombre}` };
    void nombre; pintarHud(); guardar();
  }, 1500);
}
async function terminar() {
  pintarHud(); guardar();
  if (!reg) {
    reg = true;
    if (S.nombres.length === 1) {
      const t = M.total(S, 0); api.registrar({ res: t <= PAR_TOTAL ? 'victoria' : 'derrota', variante: '9 hoyos', tiempo: null });
      const pos = await api.podio.anotar('9 hoyos', t, true);
      if (pos >= 0) api.aviso(`🏆 Puesto ${pos + 1} del podio`);
    } else api.registrar({ res: ganadores(S).includes(0) ? 'victoria' : 'derrota', variante: `${S.nombres.length} jugadores` });
    api.sonido('ganar'); guardar();
  }
  verTarjeta(true);
}

/* ---------- dibujo ---------- */
function dibujar() {
  if (!cv || !S || S.fase === 'fin' || !H) return;
  const C = CAMPOS[asp.valores.campo] || CAMPOS.clasico, k = esc2 * dpr;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  const tap = tapeteElegido(asp), im = tap ? imagenTapete(tap, () => dibujar()) : null;      // «Fondo de Tablero»: rodea el recorrido
  if (im) pintarTapete(ctx, im, 400, 700, .3); else { ctx.fillStyle = '#1A2B1F'; ctx.fillRect(0, 0, 400, 700); }
  const camino = p => { ctx.beginPath(); p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
  // césped a rayas
  ctx.save(); camino(H.borde); ctx.clip();
  for (let y = 0; y < 700; y += 40) { ctx.fillStyle = (y / 40) % 2 ? C.raya : C.cesped; ctx.fillRect(0, y, 400, 40); }
  for (const r of H.rampas || []) { camino(r.p); ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.55)'; const [xs, ys] = [r.p.map(p => p[0]), r.p.map(p => p[1])], ang = Math.atan2(r.ay, r.ax); for (let y = Math.min(...ys) + 20; y < Math.max(...ys); y += 40) for (let x = Math.min(...xs) + 20; x < Math.max(...xs); x += 40) flecha(x, y, ang); }
  for (const p of H.arena || []) { camino(p); ctx.fillStyle = '#E8CF8E'; ctx.fill(); ctx.fillStyle = 'rgba(160,120,60,.35)'; for (let i = 0; i < 40; i++) { const [x, y] = p[0]; ctx.fillRect(x + (i * 37) % 120, y + (i * 13) % 40, 2, 2); } }
  for (const p of H.agua || []) { camino(p); ctx.fillStyle = '#3FA7F0'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2; const ys = p.map(q => q[1]), xs = p.map(q => q[0]); for (let y = Math.min(...ys) + 14; y < Math.max(...ys); y += 18) { ctx.beginPath(); for (let x = Math.min(...xs); x < Math.max(...xs); x += 8) ctx.lineTo(x, y + Math.sin(x / 9 + S.t * 3) * 2); ctx.stroke(); } }
  ctx.restore();
  // bordes y muros
  ctx.lineJoin = 'round'; camino(H.borde); ctx.strokeStyle = C.borde; ctx.lineWidth = 10; ctx.stroke();
  for (const p of H.muros || []) { camino(p); ctx.fillStyle = C.muro; ctx.fill(); ctx.strokeStyle = C.borde; ctx.lineWidth = 3; ctx.stroke(); }
  for (const c of H.topes || []) { ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fillStyle = '#FF4757'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#FFD23F'; ctx.stroke(); }
  // hoyo con bandera
  const [hx, hy] = H.hoyo;
  ctx.beginPath(); ctx.arc(hx, hy, M.RH, 0, Math.PI * 2); ctx.fillStyle = '#10261A'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = '#EEE'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, hy - 46); ctx.stroke();
  ctx.fillStyle = '#FF4757'; ctx.beginPath(); ctx.moveTo(hx, hy - 46); ctx.lineTo(hx + 24 + Math.sin(S.t * 4) * 2, hy - 39); ctx.lineTo(hx, hy - 32); ctx.fill();
  // molino
  for (const m of H.molinos || []) {
    ctx.lineCap = 'round'; ctx.strokeStyle = '#F5F1E6'; ctx.lineWidth = 9;
    for (const [a, b] of M.aspas(m, S.t)) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    ctx.fillStyle = '#C0392B'; ctx.beginPath(); ctx.arc(m.x, m.y, 9, 0, Math.PI * 2); ctx.fill();
  }
  // salida
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.arc(H.salida[0], H.salida[1], 13, 0, Math.PI * 2); ctx.fill();
  // apuntado: línea de tiro y fuerza
  const b = S.bola, t = tiro();
  if (t && S.fase === 'apuntar') {
    const L = 30 + t.f * 150, ex = b.x + Math.cos(t.ang) * L, ey = b.y + Math.sin(t.ang) * L;
    ctx.setLineDash([8, 7]); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = `hsl(${120 - t.f * 120},90%,50%)`; ctx.beginPath(); ctx.arc(ex, ey, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `hsl(${120 - t.f * 120},90%,50%)`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(b.x, b.y, 18, -Math.PI / 2, -Math.PI / 2 + t.f * Math.PI * 2); ctx.stroke();
  }
  // bola del jugador
  if (S.fase !== 'espera' || Math.hypot(b.x - hx, b.y - hy) > 1) {
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(b.x + 2, b.y + 3, M.RB, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, M.RB, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = COLORES[S.jugador]; ctx.lineWidth = 3; ctx.stroke();
    const emo = emojiPersonaje(asp);      // «Personajes»: tu bola es tu personaje (sobre la bola, que sigue marcando el punto de golpeo)
    if (emo) { ctx.font = `${Math.round(M.RB * 2.7)}px system-ui,'Apple Color Emoji','Segoe UI Emoji',sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(emo, b.x, b.y + M.RB * .1); }
    if (S.fase === 'apuntar' && !arrastre) { ctx.strokeStyle = `rgba(255,255,255,${.4 + Math.sin(S.t * 5) * .3})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, M.RB + 8, 0, Math.PI * 2); ctx.stroke(); }
  }
  if (cartel) {
    ctx.globalAlpha = Math.min(1, cartel.t * 2); ctx.font = "800 40px 'Baloo 2', system-ui, sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.strokeText(cartel.txt, 200, 350); ctx.fillStyle = '#fff'; ctx.fillText(cartel.txt, 200, 350); ctx.globalAlpha = 1;
  }
}
function flecha(x, y, ang) { ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, -7); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill(); ctx.restore(); }
function pintarHud() {
  if (!S || !$('#mgHud')) return;
  if (S.fase === 'fin') { $('#mgHud').innerHTML = '<b>Recorrido terminado</b>'; $('#mgMsg').textContent = ''; tarjetaMini(); return; }
  const h = HOYOS[S.hoyo];
  $('#mgHud').innerHTML = `<span><small>Hoyo ${S.hoyo + 1}/9</small><b>${esc(h.nombre)}</b></span><span><small>Par</small><b>${h.par}</b></span><span style="--c:${COLORES[S.jugador]}" class="jug"><small>${esc(S.nombres[S.jugador])}</small><b>${S.golpes} golpe${S.golpes === 1 ? '' : 's'}</b></span>`;
  $('#mgMsg').textContent = S.fase === 'apuntar' ? 'Arrastra hacia atrás y suelta para golpear' : '';
  tarjetaMini();
}
function tarjetaMini() {
  const t = $('#mgTarj'); if (!t) return;
  t.innerHTML = S.nombres.map((n, k) => { const tot = M.total(S, k), dif = tot - M.parHasta(S, k); return `<span style="--c:${COLORES[k]}"><i></i>${esc(n)} <b>${tot}</b> <small>${M.parHasta(S, k) ? (dif === 0 ? 'par' : dif > 0 ? '+' + dif : dif) : ''}</small></span>`; }).join('');
}
function verTarjeta(final = false) {
  if (!S) return;
  const cab = `<tr><th>Hoyo</th>${HOYOS.map((_, i) => `<th>${i + 1}</th>`).join('')}<th>Total</th></tr><tr class="par"><td>Par</td>${HOYOS.map(h => `<td>${h.par}</td>`).join('')}<td>${PAR_TOTAL}</td></tr>`;
  const filas = S.nombres.map((n, k) => `<tr><td style="color:${COLORES[k]}"><b>${esc(n)}</b></td>${S.tarjeta[k].map((v, i) => `<td class="${v == null ? '' : v < HOYOS[i].par ? 'bajo' : v > HOYOS[i].par ? 'alto' : ''}">${v ?? '·'}</td>`).join('')}<td><b>${M.total(S, k)}</b></td></tr>`).join('');
  const g = S.fase === 'fin' ? ganadores(S) : [];
  const m = api.modal(final ? '⛳ ¡Recorrido terminado!' : '📋 Tarjeta', `${final ? `<p style="text-align:center">${S.nombres.length > 1 ? `🏆 Gana <b>${g.map(k => esc(S.nombres[k])).join(' y ')}</b> con ${M.total(S, g[0])} golpes` : `Has hecho <b>${M.total(S, 0)}</b> golpes (par ${PAR_TOTAL})`}</p>` : ''}<div class="hsscroll"><table class="tabla mgtabla">${cab}${filas}</table></div>${final ? '<div class="bar" style="justify-content:center"><button class="btn on" data-otra>🔁 Otra partida</button></div>' : ''}`);
  const b = m && m.cuerpo.querySelector('[data-otra]'); if (b) b.addEventListener('click', () => { m.cerrar(); empezar(); });
}
function verPodio() { api.modal('🏆 Podio · 9 hoyos', api.podio.html('9 hoyos', { formato: v => `${v} golpes` }) + '<p class="note">Solo cuentan las partidas de un jugador.</p>'); }

/* ---------- botones ---------- */
function alEscribir(e) { const i = e.target.dataset.name; if (i != null) { cfg.jug[+i] = e.target.value; api.setPref('cfg', cfg); } }
function clic(e) {
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.njug) { cfg.n = +d.njug; api.setPref('cfg', cfg); return setup(); }
  const a = d.ac;
  if (a === 'start') empezar(); else if (a === 'aspecto') asp.abrir(); else if (a === 'podio') verPodio();
  else if (a === 'tarjeta') verTarjeta(); else if (a === 'nueva') nuevaSetup();
}
function reglas() {
  api.modal('Minigolf', `<ul><li>Mete la bola en el hoyo con el menor número de golpes. Cada hoyo tiene su <b>par</b> (los golpes que se esperan).</li>
    <li><b>Para golpear</b>: pon el dedo en la mesa y arrastra <b>hacia atrás</b>, alejándote del sitio al que quieres tirar (como un tirachinas). La línea discontinua marca la dirección y el círculo de color, la fuerza. Suelta para golpear.</li>
    <li>La bola rebota en los bordes, muros y topes rojos; se frena en la <b>arena</b>; las <b>rampas</b> (flechas blancas) la empujan; y si cae al <b>agua</b> cuenta un golpe más y vuelve a donde estaba.</li>
    <li>Ojo con el <b>molino</b>: sus aspas giran y pueden devolverte la bola.</li>
    <li>Si la bola va muy rápida, puede saltar por encima del hoyo. Hay un máximo de golpes por hoyo (el par + 4).</li>
    <li>De 1 a 4 jugadores por turnos en el mismo móvil. Con un jugador, tu resultado entra en el 🏆 podio de los 10 mejores.</li></ul>`);
}
