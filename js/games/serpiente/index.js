import { $, esc } from '../../core/dom.js';
import * as M from './motor.js';
import { grupoFondo, grupoPersonaje, emojiPersonaje, tapeteElegido } from '../../core/aspectos.js';
import { imagenTapete, pintarTapete } from '../../core/cartas.js';

let S = null, api = null, asp = null, root = null, cv = null, ctx = null, dpr = 1, raf = 0, acc = 0, tPrev = 0, cola = [], reg = false;
let onKey = null, onVis = null, onRes = null, toque = null, efecto = null, nuevoRecord = false, recordAct = 0, hudAnt = '', fondo = null, podioPos = -1;
let cfg = { modo: 'clasico', vel: 'normal', tam: 'normal', cruceta: true };
const TEMAS = {
  jardin: { a: '#AAD751', b: '#A2D149', muro: '#5B7A2E', marco: '#4A752C', s1: '#4E7CF6', s2: '#2F55D4', ojo: '#FFFFFF', comida: '#E7471D', hoja: '#3E8E2F', txt: '#1B2340', brillo: 0 },
  retro: { a: '#9BBC0F', b: '#93B30E', muro: '#306230', marco: '#0F380F', s1: '#0F380F', s2: '#0F380F', ojo: '#9BBC0F', comida: '#306230', hoja: '#0F380F', txt: '#0F380F', brillo: 0, pixel: true },
  neon: { a: '#0E1330', b: '#11173A', muro: '#7C4DFF', marco: '#2A2F6B', s1: '#00F5D4', s2: '#00A8E8', ojo: '#0E1330', comida: '#FF2E88', hoja: '#7CFF6B', txt: '#E8ECFF', brillo: 14 },
};

/* ---------- validación / resumen ---------- */
export function validar(d) { const s = d && M.validar(d.s); return s ? { s, reg: !!d.reg } : null; }
export const migrarV1 = d => d;
export function resumen(d) { const s = d.s; return s.fase === 'fin' ? { texto: `${M.variante(s)} · ${s.puntos} puntos`, fin: true } : { texto: `En pausa · ${s.puntos} puntos · ${M.MODOS[s.modo]}`, fin: false }; }

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; cola = []; efecto = null; nuevoRecord = false;
  asp = api.aspecto([grupoFondo('', true), grupoPersonaje('Personajes (cabeza)'), { clave: 'tema', titulo: 'Estilo', def: 'jardin', opciones: [{ id: 'jardin', nombre: 'Jardín', sw: ['#AAD751', '#4E7CF6'] }, { id: 'retro', nombre: 'Retro', sw: ['#9BBC0F', '#0F380F'] }, { id: 'neon', nombre: 'Neón', sw: ['#0E1330', '#00F5D4'] }] }], () => { if (S) dibujar(); });
  await api.css(new URL('./serpiente.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && M.MODOS[c0.modo] && M.VELOCIDADES[c0.vel] && M.TAMANOS[c0.tam]) cfg = { ...cfg, ...c0, cruceta: c0.cruceta !== false };
  const g = api.cargar(); S = g ? g.s : null; reg = g ? g.reg : false;
  root.addEventListener('click', clic); onKey = teclado; document.addEventListener('keydown', onKey);
  onRes = () => { if (cv && S) { ajustarTamano(); dibujar(); } }; addEventListener('resize', onRes);
  onVis = () => { if (document.hidden) pausar(); }; document.addEventListener('visibilitychange', onVis);
  api.menu([{ texto: 'Nueva partida', accion: () => { pausar(); setup(); } }, { texto: '🏆 Podio (10 mejores)', accion: () => { pausar(); verPodio(); } }, { texto: '⏸️ Pausa', accion: pausar }, { texto: '🎨 Apariencia', accion: () => { pausar(); asp.abrir(); } }, { texto: 'Cómo se juega', accion: () => { pausar(); reglas(); } }]);
  if (S && S.fase !== 'fin') { armar(); dibujar(); } else setup();
}
export function unmount() {
  pausar(); cancelAnimationFrame(raf); raf = 0;
  document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis); removeEventListener('resize', onRes);
  if (root) root.removeEventListener('click', clic); S = null; cv = null; asp = null;
}
function guardar() { if (!S) return; const d = { s: { ...S }, reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- pantallas ---------- */
function setup() {
  cancelAnimationFrame(raf); raf = 0;
  if (S && S.fase !== 'fin') guardar();
  const seg = (k, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${cfg[k] === v ? 'on' : ''}" data-cfg="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const recs = Object.keys(M.MODOS).flatMap(m => Object.keys(M.VELOCIDADES).map(v => [M.variante({ modo: m, vel: v }), api.record(M.variante({ modo: m, vel: v }))])).filter(([, p]) => p);
  root.innerHTML = `<p class="note">Guía a la serpiente para que coma 🍎 y crezca sin chocar contra las paredes ni contra sí misma. De vez en cuando aparece una ⭐ que vale más… ¡pero se esfuma!</p>
    <div class="bar"><span class="lbl">Modo</span>${seg('modo', Object.entries(M.MODOS))}</div>
    <div class="bar"><span class="lbl">Velocidad</span>${seg('vel', Object.entries(M.VELOCIDADES).map(([k, v]) => [k, v.nombre]))}</div>
    <div class="bar"><span class="lbl">Tablero</span>${seg('tam', Object.entries(M.TAMANOS).map(([k, v]) => [k, v.nombre]))}</div>
    <div class="bar"><span class="lbl">Cruceta</span>${seg('cruceta', [[true, 'Mostrar'], [false, 'Solo deslizar']])}</div>
    <p class="note">${{ clasico: 'Las paredes del borde te eliminan.', libre: 'Sin paredes: si sales por un lado, entras por el contrario.', laberinto: 'Con muros dentro del tablero: ¡cuidado al girar!', obstaculos: `Cada ${M.CADA_ROCA} manzanas aparece una roca nueva en el tablero (nunca justo delante de ti).` }[cfg.modo]} La velocidad sube a medida que comes; las velocidades altas puntúan más.</p>
    ${recs.length ? `<div class="snrecs"><b>🏆 Tus récords</b>${recs.map(([k, p]) => `<span>${esc(k)}: <b>${p}</b></span>`).join('')}</div>` : ''}
    <div class="bar">${S && S.fase === 'pausa' ? '<button class="btn on" data-ac="seguir">▶️ Continuar partida</button>' : ''}<button class="btn ${S && S.fase === 'pausa' ? '' : 'on'}" data-ac="start">🐍 Nueva partida</button><button class="btn" data-ac="podio">🏆 Podio</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button></div>`;
}
function armar() {
  root.innerHTML = `<div class="snhud"><span>🍎 <b id="snCom">0</b></span><span class="pts"><b id="snPts">0</b> puntos</span><span>🏆 <b id="snRec">0</b></span><button class="btn snpausa" data-ac="pausa" aria-label="Pausa">⏸️</button></div>
    <div class="snzona" id="snZona"><canvas id="snCv" aria-label="Tablero de la serpiente"></canvas><div class="snover" id="snOver" data-ac="tocar"></div></div>
    <div class="sncruz" id="snCruz" ${cfg.cruceta ? '' : 'hidden'}><button class="btn" data-dir="0" aria-label="Arriba">▲</button><button class="btn" data-dir="3" aria-label="Izquierda">◀</button><button class="btn" data-dir="2" aria-label="Abajo">▼</button><button class="btn" data-dir="1" aria-label="Derecha">▶</button></div>
    <p class="note snayuda">Desliza el dedo sobre el tablero (o usa la cruceta o las flechas del teclado). Espacio = pausa.</p>
    <div class="bar"><button class="btn" data-ac="opciones">⚙️ Opciones</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button></div>`;
  cv = $('#snCv'); ctx = cv.getContext('2d'); dpr = Math.min(window.devicePixelRatio || 1, 3); hudAnt = ''; fondo = null;
  recordAct = S ? api.record(M.variante(S)) : 0;                 // se lee una vez, no en cada fotograma
  const zona = $('#snZona');
  zona.addEventListener('pointerdown', e => { toque = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
  zona.addEventListener('pointermove', e => {
    if (!toque || e.pointerId !== toque.id) return;
    const dx = e.clientX - toque.x, dy = e.clientY - toque.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    girar(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
    toque = { ...toque, x: e.clientX, y: e.clientY };            // permite encadenar giros sin levantar el dedo
  });
  zona.addEventListener('pointerup', () => { toque = null; }); zona.addEventListener('pointercancel', () => { toque = null; });
  ajustarTamano(); pintarHud(); pintarOver();
}
function ajustarTamano() {
  if (!cv) return;
  const lado = Math.floor(cv.parentElement.getBoundingClientRect().width);
  if (cv.width === lado * dpr) return;
  cv.width = lado * dpr; cv.height = lado * dpr; cv.style.width = cv.style.height = lado + 'px'; fondo = null;
}
function empezar(seguir = false) {
  api.setPref('cfg', cfg);
  if (!seguir || !S || S.fase === 'fin') { S = M.crear({ modo: cfg.modo, vel: cfg.vel, tam: cfg.tam }); S.fase = 'pausa'; reg = false; nuevoRecord = false; podioPos = -1; api.borrar(); }
  cola = []; armar(); dibujar();
}

/* ---------- bucle ---------- */
function jugarYa() {
  if (!S || S.fase === 'fin') return;
  S.fase = 'jugar'; tPrev = performance.now(); acc = 0; pintarOver();
  cancelAnimationFrame(raf); raf = requestAnimationFrame(bucle);
}
function bucle(t) {
  if (!S || S.fase !== 'jugar') return;
  acc += Math.min(t - tPrev, 250); tPrev = t;
  const iv = M.intervalo(S);
  while (acc >= iv && S.fase === 'jugar') {
    acc -= iv;
    const ev = M.paso(S, cola.length ? cola.shift() : S.dir);
    if (ev === 'comer') { api.sonido('click'); efecto = { tipo: 'comer', t: performance.now() }; }
    else if (ev === 'estrella') { api.sonido('ok'); api.vibrar(30); efecto = { tipo: 'estrella', t: performance.now() }; }
    else if (ev === 'muerte' || ev === 'lleno') { finPartida(ev); break; }
  }
  dibujar(); pintarHud();
  if (S && S.fase === 'jugar') raf = requestAnimationFrame(bucle);
}
function pausar() {
  if (!S || S.fase !== 'jugar') return;
  S.fase = 'pausa'; cancelAnimationFrame(raf); raf = 0; guardar(); pintarOver(); dibujar();
}
function girar(d) {
  if (!S || S.fase === 'fin') return;
  const ult = cola.length ? cola[cola.length - 1] : S.dir;
  if (d === ult || M.opuesta(ult, d)) { if (S.fase === 'pausa' && !M.opuesta(S.dir, d)) jugarYa(); return; }
  if (cola.length < 3) cola.push(d);
  if (S.fase === 'pausa') jugarYa();
}
function finPartida(ev) {
  cancelAnimationFrame(raf); raf = 0;
  efecto = { tipo: 'muerte', t: performance.now() };
  const v = M.variante(S), antes = api.record(v);
  if (!reg) { reg = true; api.registrar({ res: 'partida', variante: v, puntos: S.puntos }); }
  nuevoRecord = S.puntos > antes && S.puntos > 0;
  if (ev === 'lleno') { api.sonido('ganar'); api.vibrar([60, 40, 60, 40, 120]); } else { api.sonido('perder'); api.vibrar([80, 40, 120]); }
  guardar(); pintarHud();
  const t0 = performance.now(), anima = t => { dibujar(); if (t - t0 < 600 && S && cv) requestAnimationFrame(anima); else { pintarOver(); anotarPodio(); } };
  requestAnimationFrame(anima);
}
async function anotarPodio() {
  if (!S || S.fase !== 'fin' || podioPos >= 0) return;
  const v = M.variante(S), p = S.puntos;
  if (!api.podio.entra(v, p)) return;
  podioPos = await api.podio.anotar(v, p);
  if (S && S.fase === 'fin') pintarOver();
}
function verPodio() {
  const vs = Object.keys(M.MODOS).flatMap(m => Object.keys(M.VELOCIDADES).map(v => M.variante({ modo: m, vel: v }))).filter(v => api.podio.lista(v).length);
  api.modal('🏆 Podio', vs.length ? vs.map(v => `<h3>${esc(v)}</h3>${api.podio.html(v)}`).join('') : '<p>Juega una partida y entra en la tabla de los 10 mejores.</p>');
}

/* ---------- dibujo ---------- */
function dibujar() {
  if (!S || !cv || !ctx) return;
  const T = TEMAS[asp.valores.tema] || TEMAS.jardin, n = S.n, L = cv.width, c = L / n, ahora = performance.now();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  let sx = 0, sy = 0;
  if (efecto && efecto.tipo === 'muerte' && ahora - efecto.t < 400) { const f = (1 - (ahora - efecto.t) / 400) * c * .25; sx = (Math.random() - .5) * f; sy = (Math.random() - .5) * f; }
  ctx.translate(sx, sy);
  ctx.drawImage(fondoDe(T, n, L, c), 0, 0);                      // cuadros y marco: se pintan una vez en un lienzo aparte
  // muros
  ctx.fillStyle = T.muro; for (const i of S.muros) redondo(i % n * c + c * .06, Math.floor(i / n) * c + c * .06, c * .88, c * .88, T.pixel ? 0 : c * .18);
  // comida y estrella
  if (S.comida >= 0) manzana(S.comida % n * c, Math.floor(S.comida / n) * c, c, T, ahora);
  if (S.estrella) estrella(S.estrella.i % n * c + c / 2, Math.floor(S.estrella.i / n) * c + c / 2, c, S.estrella.t, ahora);
  // serpiente: de la cola a la cabeza, con degradado y uniones entre trozos
  const N = S.serp.length;
  for (let k = N - 1; k >= 0; k--) {
    if (k === 0 && T.brillo) { ctx.shadowColor = T.s1; ctx.shadowBlur = T.brillo; }   // brillo solo en la cabeza (el desenfoque es caro en móvil)
    const i = S.serp[k], x = i % n * c, y = Math.floor(i / n) * c, f = N > 1 ? k / (N - 1) : 0;
    ctx.fillStyle = mezcla(T.s1, T.s2, f);
    const m = T.pixel ? c * .06 : c * .1;
    redondo(x + m, y + m, c - 2 * m, c - 2 * m, T.pixel ? 0 : c * .35);
    if (k > 0) {                                              // puente hacia el trozo anterior (si son vecinos de verdad)
      const j = S.serp[k - 1], dx = j % n - i % n, dy = Math.floor(j / n) - Math.floor(i / n);
      if (Math.abs(dx) + Math.abs(dy) === 1) ctx.fillRect(x + m + (dx > 0 ? c / 2 : dx < 0 ? -c / 2 : 0), y + m + (dy > 0 ? c / 2 : dy < 0 ? -c / 2 : 0), c - 2 * m, c - 2 * m);
    }
  }
  ctx.shadowBlur = 0;
  // ojos
  const cab = S.serp[0], hx = cab % n * c + c / 2, hy = Math.floor(cab / n) * c + c / 2, d = S.dir, px = [0, 1, 0, -1][d], py = [-1, 0, 1, 0][d];
  const emo = emojiPersonaje(asp);      // «Personajes»: tu personaje es la cabeza de la serpiente
  if (emo) { ctx.font = `${Math.round(c * .95)}px system-ui,'Apple Color Emoji','Segoe UI Emoji',sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(emo, hx, hy + c * .04); }
  else for (const s of [-1, 1]) {
    const ex = hx + px * c * .12 + (-py) * s * c * .2, ey = hy + py * c * .12 + px * s * c * .2;
    ctx.fillStyle = T.ojo; ctx.beginPath(); ctx.arc(ex, ey, c * .14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = S.fase === 'fin' && S.motivo !== 'lleno' ? T.comida : T.txt; ctx.beginPath();
    if (S.fase === 'fin' && S.motivo !== 'lleno') { ctx.lineWidth = c * .05; ctx.strokeStyle = T.txt; ctx.moveTo(ex - c * .07, ey - c * .07); ctx.lineTo(ex + c * .07, ey + c * .07); ctx.moveTo(ex + c * .07, ey - c * .07); ctx.lineTo(ex - c * .07, ey + c * .07); ctx.stroke(); }
    else { ctx.arc(ex + px * c * .04, ey + py * c * .04, c * .07, 0, Math.PI * 2); ctx.fill(); }
  }
  // destello al comer
  if (efecto && (efecto.tipo === 'comer' || efecto.tipo === 'estrella') && ahora - efecto.t < 300) {
    ctx.globalAlpha = 1 - (ahora - efecto.t) / 300; ctx.strokeStyle = efecto.tipo === 'estrella' ? '#FFD43B' : '#FFFFFF'; ctx.lineWidth = c * .12;
    ctx.beginPath(); ctx.arc(hx, hy, c * (.6 + (ahora - efecto.t) / 300), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  }
}
function fondoDe(T, n, L, c) {
  const tap = tapeteElegido(asp), im = tap ? imagenTapete(tap, () => { fondo = null; dibujar(); }) : null;      // «Fondo de Tablero»
  const clave = `${asp.valores.tema}|${n}|${L}|${S.modo}|${im ? tap : ''}`;
  if (fondo && fondo.clave === clave) return fondo.cv;
  const f = document.createElement('canvas'); f.width = f.height = L; const g = f.getContext('2d');
  if (im) pintarTapete(g, im, L, L, .3);
  else for (let y = 0; y < n; y++) for (let k = 0; k < n; k++) { g.fillStyle = (y + k) % 2 ? T.b : T.a; g.fillRect(k * c, y * c, c + 1, c + 1); }
  g.strokeStyle = T.marco; g.lineWidth = Math.max(2, c * .12); g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, L - g.lineWidth, L - g.lineWidth);
  if (S.modo === 'libre') { g.setLineDash([c * .3, c * .3]); g.strokeStyle = T.s1; g.globalAlpha = .35; g.strokeRect(1, 1, L - 2, L - 2); }
  fondo = { clave, cv: f };
  return f;
}
function redondo(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect && r) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); ctx.fill(); }
function manzana(x, y, c, T, t) {
  const r = c * .36 * (1 + Math.sin(t / 220) * .05), cx = x + c / 2, cy = y + c / 2 + c * .04;
  if (T.pixel) { ctx.fillStyle = T.comida; ctx.fillRect(x + c * .2, y + c * .2, c * .6, c * .6); return; }
  ctx.fillStyle = T.comida; ctx.beginPath(); ctx.arc(cx - r * .35, cy, r * .75, 0, Math.PI * 2); ctx.arc(cx + r * .35, cy, r * .75, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc(cx - r * .45, cy - r * .3, r * .2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = T.hoja; ctx.beginPath(); ctx.ellipse(cx + r * .3, cy - r * .95, r * .32, r * .16, -.6, 0, Math.PI * 2); ctx.fill();
}
function estrella(cx, cy, c, quedan, t) {
  const r = c * .48 * (1 + Math.sin(t / 120) * .08); ctx.fillStyle = quedan < 12 && Math.floor(t / 150) % 2 ? 'rgba(255,212,59,.45)' : '#FFD43B';
  ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .45 : r; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#C58A00'; ctx.lineWidth = c * .05; ctx.stroke();
}
function mezcla(a, b, f) { const h = s => [1, 3, 5].map(k => parseInt(s.slice(k, k + 2), 16)), A = h(a), B = h(b); return `rgb(${A.map((v, k) => Math.round(v + (B[k] - v) * f)).join(',')})`; }
function pintarHud() {
  if (!S || !$('#snPts')) return;
  const clave = S.puntos + '|' + S.comidas; if (clave === hudAnt) return; hudAnt = clave;   // solo si ha cambiado algo
  $('#snPts').textContent = S.puntos.toLocaleString('es-ES'); $('#snCom').textContent = S.comidas;
  $('#snRec').textContent = Math.max(recordAct, S.puntos).toLocaleString('es-ES');
}
function pintarOver() {
  const o = $('#snOver'); if (!o || !S) return;
  o.hidden = S.fase === 'jugar';
  if (S.fase === 'pausa') o.innerHTML = S.pasos ? '<div><b>⏸️ Pausa</b><span>Toca o desliza para seguir</span></div>' : '<div><b>🐍 ¡Preparado!</b><span>Toca o desliza para empezar</span></div>';
  else if (S.fase === 'fin') o.innerHTML = `<div class="fin"><b>${S.motivo === 'lleno' ? '🏆 ¡Has llenado el tablero!' : '💥 ¡Fin de la partida!'}</b><span class="g">${S.puntos.toLocaleString('es-ES')} puntos · ${S.comidas} 🍎</span>${nuevoRecord ? '<span class="rec">🎉 ¡Nuevo récord!</span>' : ''}${podioPos >= 0 ? `<span>🏆 Puesto ${podioPos + 1} del podio</span>` : ''}<span class="bts"><button class="btn on" data-ac="otra">🔁 Otra vez</button><button class="btn" data-ac="opciones">⚙️ Opciones</button></span></div>`;
}

/* ---------- entrada ---------- */
function teclado(e) {
  if (!S || !cv || document.querySelector('.modal') || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const k = e.key.toLowerCase(), m = { arrowup: 0, w: 0, arrowright: 1, d: 1, arrowdown: 2, s: 2, arrowleft: 3, a: 3 };
  if (k in m) { e.preventDefault(); girar(m[k]); }
  else if (k === ' ' || k === 'p') { e.preventDefault(); if (S.fase === 'jugar') pausar(); else if (S.fase === 'pausa') jugarYa(); }
  else if (k === 'enter' && S.fase === 'fin') empezar();
}
function clic(e) {
  const b = e.target.closest('button,[data-ac]'); if (!b) return; const d = b.dataset;
  if (d.cfg) { cfg[d.cfg] = d.v === 'true' ? true : d.v === 'false' ? false : d.v; api.setPref('cfg', cfg); return setup(); }
  if (d.dir != null) { api.vibrar(8); return girar(+d.dir); }
  const a = d.ac;
  if (a === 'start') empezar(); else if (a === 'seguir') empezar(true); else if (a === 'otra') empezar();
  else if (a === 'opciones') { pausar(); setup(); } else if (a === 'podio') verPodio(); else if (a === 'aspecto') { pausar(); asp.abrir(); }
  else if (a === 'pausa') { if (S && S.fase === 'jugar') pausar(); else jugarYa(); }
  else if (a === 'tocar' && S && S.fase === 'pausa') jugarYa();
}
function reglas() {
  api.modal('Serpiente', `<ul><li>Mueve la serpiente para comer las manzanas 🍎: cada una la hace crecer y suma puntos (más cuanto mayor sea la velocidad elegida).</li>
    <li>Cada 7 manzanas aparece una <b>estrella</b> ⭐ que vale 5 veces más, pero desaparece al poco tiempo (parpadea cuando está a punto de irse).</li>
    <li>Pierdes si chocas contra tu propio cuerpo, contra un muro o, en el modo Clásico, contra el borde. En «Sin paredes» atraviesas los bordes.</li>
    <li><b>Controles</b>: desliza el dedo sobre el tablero en la dirección que quieras (puedes encadenar giros sin levantarlo), usa la cruceta o las flechas / WASD. Espacio o ⏸️ para pausar.</li>
    <li>La serpiente acelera a medida que come. Tus mejores puntuaciones se guardan en 📊 Estadísticas.</li>
    <li>Si sales de la app, la partida se pausa y se guarda para continuarla luego.</li></ul>`);
}
