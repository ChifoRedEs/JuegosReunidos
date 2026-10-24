import { $, esc } from '../../core/dom.js';
import * as B from './motor.js';
import { grupoFondo, tapeteElegido } from '../../core/aspectos.js';
import { imagenTapete, pintarTapete } from '../../core/cartas.js';

let S = null, api = null, asp = null, root = null, raf = 0, tPrev = 0, reg = false, onKey = null, onKeyUp = null, onVis = null;
let cv = null, ctx = null, cvR = null, cvN = null, dpr = 1, bajando = false, rep = null, gesto = null, flash = null, letrero = null, nuevoRecord = false, onRes = null, hudAnt = '', rejilla = null, podioPos = -1;
let cfg = { modo: 'maraton', nivel: 1, botones: true };
const DAS = 170, ARR = 50;                                     // retardo y ritmo de la repetición al mantener ◀ ▶
const PALETAS = {
  clasica: ['', '#21C7E8', '#F7D51D', '#A24DE0', '#3FCB4E', '#EF3B3B', '#2D5BE3', '#F58A1F', '#7A8199'],
  pastel: ['', '#8EE3F5', '#FFE58A', '#CDB4FF', '#A8EDB0', '#FFAAAA', '#9DB8FF', '#FFC48A', '#7A8199'],
  neon: ['', '#00F0FF', '#FFF000', '#D400FF', '#00FF6A', '#FF2E63', '#2979FF', '#FF9100', '#7A8199'],
};
const FONDOS = { clasica: ['#141A38', '#1A2148'], pastel: ['#F3EFFF', '#E9E3FF'], neon: ['#05060F', '#0A0C1C'] };

/* ---------- validación / resumen ---------- */
export function validar(d) { const s = d && B.validar(d.s); return s ? { s, reg: !!d.reg } : null; }
export const migrarV1 = d => d;
export function resumen(d) {
  const s = d.s;
  if (s.fase === 'fin') return { texto: s.modo === 'sprint' ? (s.motivo === 'meta' ? `Sprint en ${reloj(s.tiempo)}` : `Sprint: ${s.lineas}/40 líneas`) : s.modo === 'excavar' ? (s.motivo === 'meta' ? `Excavado en ${reloj(s.tiempo)}` : `Excavar: quedaban ${B.basuraRestante(s)} filas`) : `${B.MODOS[s.modo]} · ${s.puntos.toLocaleString('es-ES')} puntos`, fin: true };
  return { texto: `En pausa · ${B.MODOS[s.modo]} · ${s.lineas} líneas`, fin: false };
}
const reloj = ms => { const s = Math.max(0, ms) / 1000; return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; };

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; bajando = false; flash = null; letrero = null; nuevoRecord = false;
  asp = api.aspecto([grupoFondo('', true), { clave: 'paleta', titulo: 'Colores de las piezas', def: 'clasica', opciones: Object.entries(PALETAS).map(([id, c]) => ({ id, nombre: { clasica: 'Clásica', pastel: 'Pastel', neon: 'Neón' }[id], sw: c.slice(1, 5) })) },
    { clave: 'fantasma', titulo: 'Pieza fantasma', def: 'si', opciones: [{ id: 'si', nombre: 'Mostrar' }, { id: 'no', nombre: 'Ocultar' }] }], () => { if (S) dibujar(); });
  await api.css(new URL('./bloques.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && B.MODOS[c0.modo] && Number.isInteger(c0.nivel) && c0.nivel >= 1 && c0.nivel <= 15) cfg = { ...cfg, ...c0, botones: c0.botones !== false };
  const g = api.cargar(); S = g ? g.s : null; reg = g ? g.reg : false;
  root.addEventListener('click', clic);
  onKey = teclaAbajo; onKeyUp = teclaArriba; document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKeyUp);
  onVis = () => { if (document.hidden) pausar(); }; document.addEventListener('visibilitychange', onVis);
  onRes = () => { if (cv && S) { ajustar(); dibujar(); } }; addEventListener('resize', onRes);
  api.menu([{ texto: 'Nueva partida', accion: () => { pausar(); setup(); } }, { texto: '🏆 Podio (10 mejores)', accion: () => { pausar(); verPodio(); } }, { texto: '⏸️ Pausa', accion: pausar }, { texto: '🎨 Apariencia', accion: () => { pausar(); asp.abrir(); } }, { texto: 'Cómo se juega', accion: () => { pausar(); reglas(); } }]);
  if (S && S.fase !== 'fin') { armar(); dibujar(); } else setup();
}
export function unmount() {
  pausar(); cancelAnimationFrame(raf); raf = 0; pararRep();
  document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKeyUp); document.removeEventListener('visibilitychange', onVis); removeEventListener('resize', onRes);
  if (root) root.removeEventListener('click', clic); S = null; cv = null; asp = null;
}
function guardar() { if (!S) return; const d = { s: S, reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- pantallas ---------- */
function setup() {
  cancelAnimationFrame(raf); raf = 0; if (S && S.fase !== 'fin') guardar();
  const seg = (k, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${cfg[k] === v ? 'on' : ''}" data-cfg="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const mejorS = api.pref('mejorSprint', 0), mejorE = api.pref('mejorExcavar', 0), rM = api.record(B.MODOS.maraton), rU = api.record(B.MODOS.ultra);
  root.innerHTML = `<p class="note">Encaja las piezas que caen para completar líneas horizontales: cada línea completa desaparece. Si las piezas llegan arriba, se acabó.</p>
    <div class="bar"><span class="lbl">Modo</span>${seg('modo', Object.entries(B.MODOS))}</div>
    <p class="note">${{ maraton: 'Sin fin: el nivel (y la velocidad) sube cada 10 líneas.', sprint: 'Haz 40 líneas lo más rápido que puedas.', ultra: 'Consigue la máxima puntuación en 2 minutos.', excavar: `Empiezas con ${B.FILAS_BASURA} filas de basura gris con un hueco cada una: límpialas todas lo más rápido que puedas.` }[cfg.modo]}</p>
    ${!B.porTiempo(cfg.modo) ? `<div class="bar"><span class="lbl">Nivel inicial</span>${seg('nivel', [[1, '1'], [5, '5'], [8, '8'], [10, '10'], [13, '13']])}</div>` : ''}
    <div class="bar"><span class="lbl">Botones</span>${seg('botones', [[true, 'Mostrar'], [false, 'Solo gestos']])}</div>
    ${rM || rU || mejorS || mejorE ? `<div class="blrecs"><b>🏆 Tus récords</b>${rM ? `<span>Maratón: <b>${rM.toLocaleString('es-ES')}</b></span>` : ''}${rU ? `<span>Ultra: <b>${rU.toLocaleString('es-ES')}</b></span>` : ''}${mejorS ? `<span>Sprint: <b>${reloj(mejorS)}</b></span>` : ''}${mejorE ? `<span>Excavar: <b>${reloj(mejorE)}</b></span>` : ''}</div>` : ''}
    <div class="bar">${S && S.fase === 'pausa' ? '<button class="btn on" data-ac="seguir">▶️ Continuar partida</button>' : ''}<button class="btn ${S && S.fase === 'pausa' ? '' : 'on'}" data-ac="start">🧱 Nueva partida</button><button class="btn" data-ac="podio">🏆 Podio</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Cómo se juega</button></div>`;
}
function armar() {
  root.innerHTML = `<div class="blhud" id="blHud"></div>
    <div class="blzona">
      <div class="bllado"><small>Reserva</small><canvas id="blRes" class="blmini"></canvas><button class="btn blres" data-ac="reservar" aria-label="Reservar pieza">⇄</button></div>
      <div class="bltab" id="blTab"><canvas id="blCv" aria-label="Tablero de bloques"></canvas><div class="blover" id="blOver" data-ac="tocar"></div><div class="bllet" id="blLet"></div></div>
      <div class="bllado"><small>Siguientes</small><canvas id="blSig" class="blmini sig"></canvas><button class="btn blpausa" data-ac="pausa" aria-label="Pausa">⏸️</button></div>
    </div>
    <div class="blbots" id="blBots" ${cfg.botones ? '' : 'hidden'}>
      <button class="btn" data-k="ccw" aria-label="Girar a la izquierda">⟲</button><button class="btn" data-k="izq" aria-label="Mover a la izquierda">◀</button><button class="btn" data-k="abajo" aria-label="Bajar">▼</button><button class="btn" data-k="der" aria-label="Mover a la derecha">▶</button><button class="btn" data-k="cw" aria-label="Girar a la derecha">⟳</button>
      <button class="btn bltodo" data-k="soltar" aria-label="Dejar caer">⤓ Dejar caer</button>
    </div>
    <p class="note blayuda">Toca el tablero para girar · arrastra a los lados para mover · desliza abajo para bajar · golpe rápido abajo: dejar caer · golpe arriba: reservar.</p>`;
  cv = $('#blCv'); ctx = cv.getContext('2d'); cvR = $('#blRes'); cvN = $('#blSig'); dpr = Math.min(window.devicePixelRatio || 1, 3); hudAnt = ''; rejilla = null;
  ajustar();
  const zona = $('#blTab');
  zona.addEventListener('pointerdown', gestoIni); zona.addEventListener('pointermove', gestoMov); zona.addEventListener('pointerup', gestoFin); zona.addEventListener('pointercancel', () => { gesto = null; bajando = false; });
  for (const b of root.querySelectorAll('[data-k]')) {
    b.addEventListener('pointerdown', e => { e.preventDefault(); boton(b.dataset.k, true); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => boton(b.dataset.k, false));
  }
  pintarHud(); pintarOver();
}
function ajustar() {
  if (!cv) return;
  const ancho = Math.floor(cv.parentElement.getBoundingClientRect().width), alto = ancho * 2;
  cv.width = ancho * dpr; cv.height = alto * dpr; cv.style.width = ancho + 'px'; cv.style.height = alto + 'px';
  const m = Math.max(30, Math.floor(cvR.parentElement.getBoundingClientRect().width - 10));   // ancho de la columna lateral
  cvR.width = m * dpr; cvR.height = m * .7 * dpr; cvR.style.width = m + 'px'; cvR.style.height = m * .7 + 'px';
  cvR.dataset.k = cvN.dataset.k = ''; rejilla = null;
  cvN.width = m * dpr; cvN.height = m * 2.1 * dpr; cvN.style.width = m + 'px'; cvN.style.height = m * 2.1 + 'px';
}
function empezar(seguir = false) {
  api.setPref('cfg', cfg);
  if (!seguir || !S || S.fase === 'fin') { S = B.crear({ modo: cfg.modo, nivel: B.porTiempo(cfg.modo) ? 1 : cfg.nivel }); S.fase = 'pausa'; reg = false; nuevoRecord = false; podioPos = -1; api.borrar(); }
  armar(); dibujar();
}

/* ---------- bucle ---------- */
function jugarYa() {
  if (!S || S.fase === 'fin') return;
  S.fase = 'jugar'; tPrev = performance.now(); pintarOver();
  cancelAnimationFrame(raf); raf = requestAnimationFrame(bucle);
}
function bucle(t) {
  if (!S || S.fase !== 'jugar') return;
  const dt = Math.min(t - tPrev, 100); tPrev = t;
  const ev = B.avanzar(S, dt, bajando);
  if (ev) tras(ev);
  if (rep && t >= rep.siguiente) { mover(rep.dx); rep.siguiente = t + ARR; }
  if (S.fase === 'fin') return terminar();
  dibujar(); pintarHud();
  raf = requestAnimationFrame(bucle);
}
function pausar() { if (!S || S.fase !== 'jugar') return; S.fase = 'pausa'; cancelAnimationFrame(raf); raf = 0; bajando = false; pararRep(); guardar(); pintarOver(); dibujar(); }
// Efectos al fijar una pieza
function tras(ev) {
  if (!ev) return;
  if (ev.lineas) {
    flash = { filas: ev.filas, t: performance.now() };
    api.sonido(ev.lineas === 4 ? 'ganar' : 'ok'); api.vibrar(ev.lineas === 4 ? [40, 30, 80] : 25);
    const extra = [ev.b2b && ev.lineas ? '¡Seguido!' : '', ev.combo > 0 ? `Combo ×${ev.combo}` : ''].filter(Boolean).join(' · ');
    letrero = { txt: ev.nombre, sub: `+${ev.puntos.toLocaleString('es-ES')}${extra ? ' · ' + extra : ''}`, t: performance.now() }; pintarLetrero();
  } else api.sonido('click');
  if (S.fase === 'fin') terminar();
}
function terminar() {
  cancelAnimationFrame(raf); raf = 0; bajando = false; pararRep();
  if (!reg) {
    reg = true;
    if (B.porTiempo(S.modo)) {
      const k = S.modo === 'sprint' ? 'mejorSprint' : 'mejorExcavar', ok = S.motivo === 'meta', mejor = api.pref(k, 0);
      if (ok && (!mejor || S.tiempo < mejor)) { api.setPref(k, Math.round(S.tiempo)); nuevoRecord = true; }
      api.registrar({ res: ok ? 'victoria' : 'derrota', variante: B.MODOS[S.modo], tiempo: ok ? S.tiempo / 1000 : null });
    } else {
      const antes = api.record(B.MODOS[S.modo]); nuevoRecord = S.puntos > antes && S.puntos > 0;
      api.registrar({ res: 'partida', variante: B.MODOS[S.modo], puntos: S.puntos });
    }
    api.sonido(S.motivo === 'meta' || nuevoRecord ? 'ganar' : 'perder'); api.vibrar([80, 40, 120]);
  }
  guardar(); dibujar(); pintarHud(); pintarOver(); anotarPodio();
}
// Podio local: puntos (Maratón, Ultra) o tiempo (Sprint, Excavar; solo si se completa)
async function anotarPodio() {
  if (!S || S.fase !== 'fin' || podioPos >= 0) return;
  const tiempo = B.porTiempo(S.modo), v = B.MODOS[S.modo], valor = tiempo ? (S.motivo === 'meta' ? Math.round(S.tiempo) : 0) : S.puntos;
  if (!api.podio.entra(v, valor, tiempo)) return;
  podioPos = await api.podio.anotar(v, valor, tiempo);
  if (S && S.fase === 'fin') pintarOver();
}
function verPodio() {
  const vs = Object.values(B.MODOS).filter(v => api.podio.lista(v).length);
  api.modal('🏆 Podio', vs.length ? vs.map(v => `<h3>${esc(v)}</h3>${api.podio.html(v, /sprint|excavar/i.test(v) ? { formato: reloj } : {})}`).join('') : '<p>Juega una partida y entra en la tabla de los 10 mejores.</p>');
}

/* ---------- acciones ---------- */
const enJuego = () => S && S.fase === 'jugar';
function mover(dx) { if (enJuego() && B.mover(S, dx)) dibujar(); }
function rotar(s) { if (enJuego() && B.rotar(S, s)) { api.sonido('click'); dibujar(); } }
function soltar() { if (!enJuego()) return; const ev = B.soltar(S); tras(ev); api.vibrar(15); dibujar(); pintarHud(); if (S.fase === 'fin') terminar(); }
function reservar() { if (enJuego() && B.reservar(S)) { api.sonido('click'); dibujar(); if (S.fase === 'fin') terminar(); } }
function pararRep() { rep = null; }
function boton(k, pulsado) {
  if (!S) return;
  if (pulsado && S.fase === 'pausa') jugarYa();
  if (k === 'izq' || k === 'der') { if (pulsado) { mover(k === 'izq' ? -1 : 1); rep = { dx: k === 'izq' ? -1 : 1, siguiente: performance.now() + DAS }; } else if (rep && rep.dx === (k === 'izq' ? -1 : 1)) pararRep(); }
  else if (k === 'abajo') bajando = pulsado && enJuego();
  else if (pulsado) { if (k === 'cw') rotar(1); else if (k === 'ccw') rotar(-1); else if (k === 'soltar') soltar(); }
}
// Gestos sobre el tablero: tocar = girar, arrastrar = mover/bajar, golpe rápido abajo = dejar caer, golpe arriba = reservar
function gestoIni(e) { if (!S) return; gesto = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t: performance.now(), movio: false, id: e.pointerId }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* nada */ } }
function gestoMov(e) {
  if (!gesto || e.pointerId !== gesto.id || !enJuego()) return;
  const celda = cv.getBoundingClientRect().width / B.W, dx = e.clientX - gesto.x, dy = e.clientY - gesto.y;
  if (Math.abs(dx) >= celda * .9) { const p = Math.trunc(dx / (celda * .9)); for (let k = 0; k < Math.abs(p); k++) mover(Math.sign(p)); gesto.x += p * celda * .9; gesto.movio = true; }
  if (dy >= celda) { const p = Math.floor(dy / celda); for (let k = 0; k < p; k++) B.bajar(S); gesto.y += p * celda; gesto.movio = true; dibujar(); }
}
function gestoFin(e) {
  if (!gesto || e.pointerId !== gesto.id) return;
  const g = gesto; gesto = null;
  const dt = performance.now() - g.t, dX = e.clientX - g.x0, dY = e.clientY - g.y0, vy = dY / Math.max(dt, 1);
  if (S.fase === 'pausa') { if (Math.hypot(dX, dY) < 12) jugarYa(); return; }
  if (!enJuego()) return;
  if (vy > 1.1 && dY > 50 && dt < 260) return soltar();                              // golpe rápido hacia abajo
  if (vy < -0.9 && dY < -50 && dt < 300) return reservar();                          // golpe rápido hacia arriba
  if (!g.movio && Math.hypot(dX, dY) < 14 && dt < 300) rotar(e.clientX < cv.getBoundingClientRect().left + cv.getBoundingClientRect().width * .3 ? -1 : 1);   // toque (en el borde izquierdo gira al revés)
}

/* ---------- dibujo ---------- */
function bloque(c, x, y, s, color, alfa = 1) {
  c.globalAlpha = alfa;
  const g = c.createLinearGradient(x, y, x + s, y + s); g.addColorStop(0, aclarar(color, .25)); g.addColorStop(1, color);
  c.fillStyle = g; c.fillRect(x + 1, y + 1, s - 2, s - 2);
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x + 1, y + 1, s - 2, Math.max(2, s * .14));
  c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(x + 1, y + s - 1 - Math.max(2, s * .12), s - 2, Math.max(2, s * .12));
  c.globalAlpha = 1;
}
function aclarar(hex, f) { const n = [1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16)); return `rgb(${n.map(v => Math.round(v + (255 - v) * f)).join(',')})`; }
function dibujar() {
  if (!S || !cv || !ctx) return;
  const P = PALETAS[asp.valores.paleta] || PALETAS.clasica, F = FONDOS[asp.valores.paleta] || FONDOS.clasica, L = cv.width / B.W, oculto = B.H - B.VISIBLES, ahora = performance.now();
  ctx.drawImage(fondoRejilla(F, L), 0, 0);                        // fondo y rejilla: se pintan una sola vez
  for (let y = oculto; y < B.H; y++) for (let x = 0; x < B.W; x++) { const v = S.tab[y * B.W + x]; if (v) bloque(ctx, x * L, (y - oculto) * L, L, S.fase === 'fin' && S.motivo === 'arriba' ? '#6B7280' : P[v]); }
  if (S.fase !== 'fin' && S.p) {
    if (asp.valores.fantasma !== 'no') {
      const gy = B.fantasma(S);
      for (const [cx, cy] of B.celdas(S.p.t, S.p.r)) { const y = gy + cy - oculto; if (y >= 0) { ctx.strokeStyle = P[S.p.t]; ctx.globalAlpha = .55; ctx.lineWidth = Math.max(2, L * .08); ctx.strokeRect((S.p.x + cx) * L + 2, y * L + 2, L - 4, L - 4); ctx.globalAlpha = 1; } }
    }
    for (const [cx, cy] of B.celdas(S.p.t, S.p.r)) { const y = S.p.y + cy - oculto; if (y >= 0) bloque(ctx, (S.p.x + cx) * L, y * L, L, P[S.p.t]); }
  }
  if (flash && ahora - flash.t < 260) { ctx.fillStyle = `rgba(255,255,255,${.75 * (1 - (ahora - flash.t) / 260)})`; for (const f of flash.filas) ctx.fillRect(0, (f - oculto) * L, cv.width, L); if (S.fase !== 'jugar') requestAnimationFrame(dibujar); }
  mini(cvR, S.reserva ? [S.reserva] : [], P, F, !S.puedeReservar);
  mini(cvN, S.cola.slice(0, 3), P, F, false);
}
function fondoRejilla(F, L) {
  const tap = tapeteElegido(asp), im = tap ? imagenTapete(tap, () => { rejilla = null; dibujar(); }) : null;      // «Fondo de Tablero»
  const clave = F[0] + cv.width + 'x' + cv.height + (im ? tap : '');
  if (rejilla && rejilla.clave === clave) return rejilla.cv;
  const f = document.createElement('canvas'); f.width = cv.width; f.height = cv.height; const g = f.getContext('2d');
  if (im) pintarTapete(g, im, f.width, f.height, .42); else { g.fillStyle = F[0]; g.fillRect(0, 0, f.width, f.height); }
  g.strokeStyle = im ? 'rgba(255,255,255,.16)' : F[1]; g.lineWidth = 1; g.beginPath();
  for (let x = 1; x < B.W; x++) { g.moveTo(x * L, 0); g.lineTo(x * L, f.height); }
  for (let y = 1; y < B.VISIBLES; y++) { g.moveTo(0, y * L); g.lineTo(f.width, y * L); }
  g.stroke(); rejilla = { clave, cv: f };
  return f;
}
function mini(c, piezas, P, F, apagada) {
  const clave = c.id + piezas.join() + apagada + P[1] + c.width; if (c.dataset.k === clave) return; c.dataset.k = clave;   // solo si cambia
  const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
  const hueco = c.width * .7, s = c.width / 5.2;
  piezas.forEach((t, k) => {
    const cs = B.celdas(t, 0), xs = cs.map(p => p[0]), ys = cs.map(p => p[1]), w = (Math.max(...xs) - Math.min(...xs) + 1) * s, h = (Math.max(...ys) - Math.min(...ys) + 1) * s;
    const ox = (c.width - w) / 2 - Math.min(...xs) * s, oy = k * hueco + (hueco - h) / 2 - Math.min(...ys) * s;
    for (const [x, y] of cs) bloque(g, ox + x * s, oy + y * s, s, apagada ? '#8A90A6' : P[t], apagada ? .5 : 1);
  });
}
function pintarHud() {
  const h = $('#blHud'); if (!h || !S) return;
  const t = S.modo === 'ultra' ? reloj(B.restante(S)) : reloj(S.tiempo);
  const html = `<span><small>Puntos</small><b>${S.puntos.toLocaleString('es-ES')}</b></span>${S.modo === 'excavar' ? `<span><small>Basura</small><b>${B.basuraRestante(S)}<i>/${B.FILAS_BASURA}</i></b></span>` : `<span><small>Líneas</small><b>${S.lineas}${S.modo === 'sprint' ? `<i>/${B.META_SPRINT}</i>` : ''}</b></span>`}${!B.porTiempo(S.modo) ? `<span><small>Nivel</small><b>${S.nivel}</b></span>` : ''}<span><small>${S.modo === 'ultra' ? 'Quedan' : 'Tiempo'}</small><b class="${S.modo === 'ultra' && B.restante(S) < 15000 ? 'poco' : ''}">${t}</b></span>`;
  if (html !== hudAnt) { hudAnt = html; h.innerHTML = html; }          // el reloj cambia cada décima: no se reescribe en cada fotograma
}
function pintarLetrero() {
  const el = $('#blLet'); if (!el || !letrero) return;
  el.innerHTML = `<b>${esc(letrero.txt)}</b><span>${esc(letrero.sub)}</span>`; el.classList.remove('ver'); void el.offsetWidth; el.classList.add('ver');
}
function pintarOver() {
  const o = $('#blOver'); if (!o || !S) return;
  o.hidden = S.fase === 'jugar';
  if (S.fase === 'pausa') o.innerHTML = S.piezas ? '<div><b>⏸️ Pausa</b><span>Toca para seguir</span></div>' : `<div><b>🧱 ${esc(B.MODOS[S.modo])}</b><span>Toca para empezar</span></div>`;
  else if (S.fase === 'fin') {
    const tit = S.modo === 'sprint' ? (S.motivo === 'meta' ? `🏁 ¡40 líneas en ${reloj(S.tiempo)}!` : '💥 ¡Se acabó!') : S.modo === 'excavar' ? (S.motivo === 'meta' ? `⛏️ ¡Excavado en ${reloj(S.tiempo)}!` : '💥 ¡Se acabó!') : S.modo === 'ultra' && S.motivo === 'tiempo' ? '⏱️ ¡Tiempo!' : '💥 ¡Se acabó!';
    o.innerHTML = `<div class="fin"><b>${tit}</b><span class="g">${S.puntos.toLocaleString('es-ES')} puntos</span><span>${S.lineas} líneas · nivel ${S.nivel}</span>${nuevoRecord ? '<span class="rec">🎉 ¡Nuevo récord!</span>' : ''}${podioPos >= 0 ? `<span>🏆 Puesto ${podioPos + 1} del podio</span>` : ''}<span class="bts"><button class="btn on" data-ac="otra">🔁 Otra</button><button class="btn" data-ac="opciones">⚙️</button></span></div>`;
  }
}

/* ---------- teclado ---------- */
function teclaAbajo(e) {
  if (!S || !cv || document.querySelector('.modal') || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const k = e.key;
  if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(k)) e.preventDefault();
  if (k === 'p' || k === 'P' || k === 'Escape') { if (S.fase === 'jugar') pausar(); else if (S.fase === 'pausa') jugarYa(); return; }
  if (S.fase === 'pausa' && !e.repeat) jugarYa();
  if (e.repeat) return;
  if (k === 'ArrowLeft' || k === 'a') boton('izq', true); else if (k === 'ArrowRight' || k === 'd') boton('der', true);
  else if (k === 'ArrowDown' || k === 's') bajando = enJuego();
  else if (k === 'ArrowUp' || k === 'x' || k === 'X' || k === 'w') rotar(1); else if (k === 'z' || k === 'Z' || k === 'Control') rotar(-1);
  else if (k === ' ') soltar(); else if (k === 'c' || k === 'C' || k === 'Shift') reservar();
  else if (k === 'Enter' && S.fase === 'fin') empezar();
}
function teclaArriba(e) {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a') boton('izq', false); else if (k === 'ArrowRight' || k === 'd') boton('der', false); else if (k === 'ArrowDown' || k === 's') bajando = false;
}

/* ---------- clics ---------- */
function clic(e) {
  const b = e.target.closest('button,[data-ac]'); if (!b || b.dataset.k) return; const d = b.dataset;
  if (d.cfg) { cfg[d.cfg] = d.v === 'true' ? true : d.v === 'false' ? false : d.cfg === 'nivel' ? +d.v : d.v; api.setPref('cfg', cfg); return setup(); }
  const a = d.ac;
  if (a === 'start') empezar(); else if (a === 'seguir') empezar(true); else if (a === 'otra') empezar();
  else if (a === 'opciones') { pausar(); setup(); } else if (a === 'podio') verPodio(); else if (a === 'aspecto') { pausar(); asp.abrir(); } else if (a === 'reglas') reglas();
  else if (a === 'pausa') { if (S && S.fase === 'jugar') pausar(); else jugarYa(); }
  else if (a === 'reservar') { if (S && S.fase === 'pausa') jugarYa(); reservar(); }
}
function reglas() {
  api.modal('Bloques', `<ul><li>Caen piezas de 4 cuadrados. Muévelas y gíralas para formar <b>líneas horizontales completas</b>: desaparecen y suman puntos (1 línea 100, 2 líneas 300, 3 líneas 500 y 4 a la vez —¡cuádruple!— 800, multiplicado por el nivel).</li>
    <li><b>Combos</b> (borrar líneas con piezas seguidas) y cuádruples <b>seguidos</b> dan puntos extra. Bajar rápido también suma.</li>
    <li>La <b>pieza fantasma</b> muestra dónde caerá. A la derecha ves las 3 siguientes; a la izquierda, la <b>reserva</b>: puedes guardar la pieza actual y sacarla después (una vez por pieza).</li>
    <li>Al tocar el suelo tienes medio segundo para deslizarla o girarla antes de que se fije.</li>
    <li><b>Táctil</b>: toca el tablero para girar (en el borde izquierdo gira al revés), arrastra a los lados para mover, desliza hacia abajo para bajar, un golpe rápido hacia abajo la deja caer y uno hacia arriba la reserva. También tienes los botones.</li>
    <li><b>Teclado</b>: ← → mover · ↓ bajar · ↑ o X girar · Z girar al revés · espacio dejar caer · C reservar · P pausa.</li>
    <li>Modos: <b>Maratón</b> (sin fin, el nivel sube cada 10 líneas), <b>Sprint</b> (40 líneas lo más rápido posible), <b>Ultra</b> (máxima puntuación en 2 minutos) y <b>Excavar</b> (limpia 10 filas de basura gris lo antes posible). Tus récords quedan en 📊 Estadísticas y en el 🏆 Podio.</li></ul>`);
}
