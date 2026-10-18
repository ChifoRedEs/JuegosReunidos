import { $, fmtTiempo } from '../../core/dom.js';
import { cartaHTML, PALOS } from '../../core/cartas.js';
import { Cronometro } from '../../core/cronometro.js';
import { grupoMesa, grupoDorso, grupoPalos, grupoBarajaFr } from '../../core/aspectos.js';
import * as K from './motor.js';

const DY_ABAJO = .2, DY_ARRIBA = .38;
let S = null, hist = [], api = null, asp = null, root = null, crono = null, reg = false, pst = null, pstT = null, drag = null, auto = null;
let worker = null, jobId = 0, estadoAn = 'calc', pendiente = false, estadoAntes = null, ac = { b: 0, m: 0 }, feedback = '', tAn = null, sinWorker = false;
let popAn = null, tAuto = null;

/* ---------- validación / resumen ---------- */
export function validar(d) {
  const s = d && K.validar(d.s); if (!s) return null;
  const a = d.ac && Number.isInteger(d.ac.b) && Number.isInteger(d.ac.m) && d.ac.b >= 0 && d.ac.m >= 0 ? { b: d.ac.b, m: d.ac.m } : { b: 0, m: 0 };
  return { s, hist: Array.isArray(d.hist) ? d.hist.slice(-40).map(h => K.validar(h)).filter(Boolean) : [], t: Number.isInteger(d.t) && d.t >= 0 ? d.t : 0, reg: !!d.reg, ac: a };
}
export const migrarV1 = d => d;
export function resumen(d) {
  const f = d.s.fund.reduce((n, x) => n + x.length, 0);
  const v = d.s.vegas ? ` · Vegas ${dolares(K.puntosVegas(d.s))}` : '';
  return K.gana(d.s) ? { texto: `Robar ${d.s.robar} · ¡Ganada!${v}`, fin: true } : { texto: `Robar ${d.s.robar} · ${f}/52 en las bases${v}`, fin: false };
}

const dolares = n => `${n < 0 ? '−' : '+'}${Math.abs(n)} $`;
let repartiendo = false, serieReparto = 0;
// Reparto con solución garantizada: un Worker baraja hasta que el analizador encuentra cómo ganar
function repartirGanable(robar, extra, vegas) {
  return new Promise(res => {
    let w; try { w = new Worker(new URL('./solver.worker.js', import.meta.url), { type: 'module' }); } catch { res(null); return; }
    const fin = S => { clearTimeout(t); w.terminate(); res(S); }, t = setTimeout(() => fin(null), 15000);
    w.onmessage = e => fin(e.data && e.data.S ? K.validar(e.data.S) : null);
    w.onerror = () => fin(null);
    w.postMessage({ id: 1, tipo: 'repartir', robar, extra, vegas, ms: 9000 });
  });
}
// Vegas: lo ganado o perdido en cada partida se suma a una banca acumulada (una sola vez por partida)
function cobrarVegas() {
  if (!S || !S.vegas || S.cobrado || (!S.mov && !K.gana(S))) return;
  S.cobrado = true; api.setPref('banca', (api.pref('banca', 0) | 0) + K.puntosVegas(S));
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; pst = null; drag = null; auto = null; popAn = null; tAuto = null; estadoBurb = null; worker = null; jobId = 0; estadoAn = 'calc'; pendiente = false; feedback = ''; sinWorker = false;
  asp = api.aspecto([grupoMesa(), grupoDorso(), grupoPalos(), grupoBarajaFr()]);
  await api.css(new URL('../../../css/cartas.css', import.meta.url)); await api.css(new URL('./klondike.css', import.meta.url));
  const g = api.cargar();
  if (g) { S = g.s; hist = g.hist; reg = g.reg; ac = g.ac; } else { S = K.nuevo(api.pref('robar', 1), api.pref('extra', true), api.pref('vegas', false)); hist = []; reg = false; ac = { b: 0, m: 0 }; }
  root.innerHTML = `
    <details class="ops" id="klOps"><summary id="klSum"></summary>
      <div class="bar"><span class="lbl">Robar</span><div class="seg"><button class="btn" data-robar="1">1 carta</button><button class="btn" data-robar="3">3 cartas</button></div></div>
      <div class="bar"><span class="lbl">Casilla extra</span><div class="seg"><button class="btn" data-extra="1">Con casilla libre</button><button class="btn" data-extra="0">Sin ella</button></div></div>
      <div class="bar"><span class="lbl">Reparto</span><div class="seg"><button class="btn" data-gar="1">✅ Siempre con solución</button><button class="btn" data-gar="0">🎲 Al azar</button></div></div>
      <div class="bar"><span class="lbl">Puntuación</span><div class="seg"><button class="btn" data-vegas="0">Normal</button><button class="btn" data-vegas="1">💰 Vegas</button></div></div>
      <p class="note" id="klVegasNota"></p>
      <div class="bar"><span class="lbl">Auto-relleno</span><div class="seg"><button class="btn" data-autor="1">Automático</button><button class="btn" data-autor="0">Solo con botón</button></div></div>
      <p class="note">Auto-relleno: cuando no quedan cartas boca abajo y el resto puede subir solo a las bases, las cartas se colocan solas y la partida termina.</p></details>
    <div class="info"><span class="mut" id="klInfo"></span><span id="klCrono" aria-label="Tiempo">0:00</span></div>
    <button type="button" class="klburb calc" id="klBurb" data-ac="analizador" aria-label="Abrir el analizador de la partida"></button>
    <div class="mesa kl" id="klBoard"></div>
    <div class="msg" id="klMsg" role="status" aria-live="polite"></div>
    <div class="bar"><button class="btn on" data-ac="nueva">Nueva</button><button class="btn" data-ac="undo" id="klUndo">↶ Deshacer</button><button class="btn" data-ac="pista">💡 Pista</button><button class="btn" data-ac="auto" id="klAuto" hidden>⚡ Auto-relleno</button><button class="btn" data-ac="aspecto">🎨</button></div>`;
  root.addEventListener('click', clic);
  const b = $('#klBoard'); b.addEventListener('pointerdown', pDown); b.addEventListener('pointermove', pMove); b.addEventListener('pointerup', pUp); b.addEventListener('pointercancel', pCancel);
  api.menu([{ texto: 'Nueva partida', accion: () => nueva(S.robar, S.extra) }, { texto: '💰 Poner a cero la banca Vegas', accion: () => { if (api.confirmar('¿Poner la banca de Vegas a 0 $?')) { api.setPref('banca', 0); pintar(); } }, peligro: true }, { texto: 'Deshacer', accion: deshacer }, { texto: 'Pista', accion: pista }, { texto: '🔍 Analizador', accion: abrirAnalizador }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  crono = new Cronometro(() => { if (S) { $('#klCrono').textContent = fmtTiempo(crono.s); if (crono.s % 15 === 0) guardar(); } }, g ? g.t : 0);
  if (S.mov > 0 && !K.gana(S)) crono.iniciar();
  pintar(); analizar(); revisarAuto();
}
export function unmount() {
  if (S && crono) guardar();
  if (crono) crono.detener();
  repartiendo = false; serieReparto++; clearTimeout(pstT); clearTimeout(tAn); clearTimeout(tAuto); clearInterval(auto); cerrarAnalizador(); quitarDrag(); if (worker) { worker.terminate(); worker = null; }
  if (root) root.removeEventListener('click', clic);
  S = null; crono = null; asp = null;
}
function guardar() { if (!S) return; const d = { s: S, hist: hist.slice(-40), t: crono ? crono.s : 0, reg, ac }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- analizador: ¿sigue abierto el camino hacia la victoria? ---------- */
function analizar() {
  clearTimeout(tAn); jobId++;
  if (!S || K.gana(S)) { estadoAn = 'gana'; pintarProb(); return; }
  estadoAn = 'calc'; pintarProb();
  const id = jobId;
  tAn = setTimeout(() => {
    if (id !== jobId || !S) return;
    try {
      if (worker) worker.terminate();
      worker = new Worker(new URL('./solver.worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = e => alResultado(e.data);
      worker.onerror = () => { sinWorker = true; estadoAn = 'nd'; pintarProb(); };
      worker.postMessage({ id, S, ms: 3500 });
    } catch { sinWorker = true; estadoAn = 'nd'; pintarProb(); }
  }, 300);
}
function alResultado(r) {
  if (!S || r.id !== jobId) return;
  estadoAn = r.r;
  if (pendiente) {                                           // ¿la última jugada mantuvo abierto el camino?
    if (estadoAntes === 'ganable' && r.r === 'ganable') { ac.b++; feedback = '👍 Jugada acertada: el camino sigue abierto.'; }
    else if (estadoAntes === 'ganable' && r.r === 'cerrado') { ac.m++; feedback = '⚠️ Esa jugada cerró el camino. Prueba con ↶ Deshacer.'; if (!popAn) api.aviso(feedback); }
    else if (estadoAntes === 'ganable' && r.r === 'incierto') feedback = '🤔 Ya no está tan claro que haya solución.';
    else feedback = '';
    pendiente = false; guardar();
  }
  pintarProb();
}
const ESTADOS = { calc: ['🔍', 'Analizando la partida…', 50, 'calc', '…'], ganable: ['🟢', 'Camino abierto · se puede ganar', 100, 'ok', '100 %'], cerrado: ['🔴', 'Camino cerrado · ya no se puede ganar', 0, 'mal', '0 %'], incierto: ['🟡', 'Análisis no concluyente (hay muchas opciones)', 50, 'dud', '?'], nd: ['⚪', 'Análisis no disponible en este navegador', 50, 'calc', '–'], gana: ['🏆', '¡Partida ganada!', 100, 'ok', '100 %'] };
let estadoBurb = null;
function pintarProb() {
  if (!S) return;
  const E = ESTADOS[estadoAn], b = $('#klBurb');
  if (b) {
    b.className = 'klburb ' + E[3] + (estadoBurb && estadoBurb !== estadoAn && estadoAn !== 'calc' ? ' cambio' : '');
    b.innerHTML = `<span aria-hidden="true">${E[0]}</span><b>${E[4]}</b>`;
    b.setAttribute('aria-label', `Analizador: ${E[1]}. Toca para ver el detalle.`);
    if (estadoAn !== 'calc') estadoBurb = estadoAn;
  }
  const el = popAn && popAn.querySelector('.klprob'); if (!el) return;
  const total = ac.b + ac.m, ok = total ? Math.round(ac.b / total * 100) : null;
  el.className = 'klprob ' + E[3];
  el.innerHTML = `<div class="kt"><b>${E[0]} ${E[1]}</b>${estadoAn === 'ganable' || estadoAn === 'cerrado' || estadoAn === 'gana' ? `<span class="kp">${E[2]} %</span>` : ''}</div>
    <div class="kbar"><i style="width:${E[2]}%"></i></div>
    <div class="ks">${ok === null ? 'Acierto de tus jugadas: aún sin datos' : `Acierto de tus jugadas: <b>${ok} %</b> (${ac.b} de ${total} evaluadas)`}${feedback ? ` · ${feedback}` : ''}</div>`;
}
function abrirAnalizador() {
  if (popAn) return;
  popAn = document.createElement('div'); popAn.className = 'modal klpop'; popAn.setAttribute('role', 'dialog'); popAn.setAttribute('aria-modal', 'true');
  popAn.innerHTML = `<div class="hoja"><h2>🔍 Analizador</h2><div class="klprob calc" role="status" aria-live="polite"></div>
    <p class="note">Tras cada jugada se analiza si la partida todavía se puede ganar. Verde = hay solución; rojo = ya no se puede (prueba con ↶ Deshacer). «Acierto de tus jugadas» es el porcentaje de jugadas que mantuvieron el camino abierto.</p>
    <button class="btn on" data-cerrar style="margin-top:12px">Cerrar</button></div>`;
  popAn.addEventListener('click', e => { if (e.target === popAn || e.target.closest('[data-cerrar]')) cerrarAnalizador(); });
  document.addEventListener('keydown', escAnalizador);
  document.body.append(popAn); pintarProb();
}
function cerrarAnalizador() { if (!popAn) return; popAn.remove(); popAn = null; document.removeEventListener('keydown', escAnalizador); }
function escAnalizador(e) { if (e.key === 'Escape') cerrarAnalizador(); }

/* ---------- partida ---------- */
const hayProgreso = () => S.mov > 0 && !K.gana(S);
async function nueva(robar, extra, forzar = false, vegas = S ? S.vegas : api.pref('vegas', false)) {
  if (repartiendo) return;
  if (!forzar && hayProgreso() && !api.confirmar('¿Empezar una partida nueva? Perderás la actual.')) return;
  cobrarVegas();
  clearInterval(auto); auto = null; clearTimeout(tAuto); crono.detener(); crono = new Cronometro(crono.alTick, 0);
  api.setPref('robar', robar); api.setPref('extra', extra); api.setPref('vegas', !!vegas);
  let nuevoS = null;
  if (api.pref('garantizada', true) && !sinWorker) {
    const tok = ++serieReparto; repartiendo = true; $('#klMsg').className = 'msg'; $('#klMsg').textContent = '🔀 Barajando una partida con solución…';
    nuevoS = await repartirGanable(robar, extra, !!vegas);
    if (tok !== serieReparto) return; repartiendo = false; if (!S || !crono) return;
    if (!nuevoS) api.aviso('No encontré a tiempo una partida con solución: esta es al azar');
  }
  S = nuevoS || K.nuevo(robar, extra, vegas); hist = []; reg = false; pst = null; ac = { b: 0, m: 0 }; feedback = ''; pendiente = false; estadoAntes = null;
  pintar(); guardar(); analizar();
}
function antes() { hist.push(K.copia(S)); if (hist.length > 60) hist.shift(); if (S.mov === 0) crono.iniciar(); pst = null; estadoAntes = estadoAn; pendiente = true; feedback = ''; }
function despues(sonido = 'mover') {
  api.sonido(sonido);
  if (K.gana(S) && !reg) {
    reg = true; crono.detener(); cobrarVegas(); api.registrar({ res: 'victoria', tiempo: crono.s, variante: `Robar ${S.robar}${S.extra ? '' : ' · sin casilla extra'}${S.vegas ? ' · Vegas' : ''}` }); api.sonido('ganar'); api.vibrar([60, 40, 60, 40, 90]);
  }
  pintar(); guardar(); analizar(); revisarAuto();
}
function deshacer() {
  if (!hist.length || K.gana(S)) { api.aviso('Nada que deshacer'); return; }
  clearInterval(auto); auto = null; clearTimeout(tAuto); S = hist.pop(); pst = null; pendiente = false; feedback = ''; pintar(); guardar(); analizar();
}
function pista() {
  if (K.gana(S)) return;
  const p = K.pista(S); if (!p) { api.aviso('No quedan jugadas: prueba con Deshacer o una partida nueva'); return; }
  pst = p; clearTimeout(pstT); pstT = setTimeout(() => { pst = null; if (S) pintar(); }, 4000); api.aviso(p.txt); pintar();
}
// Auto-relleno: sin cartas boca abajo, las cartas restantes suben solas a las bases y la partida termina.
const autoAuto = () => api.pref('autorrelleno', true);
function revisarAuto() {
  clearTimeout(tAuto);
  if (!S || auto || !autoAuto() || drag || !K.autoResoluble(S)) return;
  tAuto = setTimeout(() => { if (S && !auto && !drag && K.autoResoluble(S)) { api.aviso('⚡ Auto-relleno: completando la partida…'); autocompletar(); } }, 450);
}
function autocompletar() {
  if (!S || K.gana(S) || auto || !K.autoResoluble(S)) return;
  clearTimeout(tAuto); hist.push(K.copia(S)); if (S.mov === 0) crono.iniciar(); pst = null; pendiente = false;
  let sin = 0;
  auto = setInterval(() => {
    const p = S && K.pasoAuto(S, sin);
    if (!p) { clearInterval(auto); auto = null; despues('ok'); return; }
    if (p.o) { K.mover(S, p.o, p.a); sin = 0; api.sonido('click'); } else { K.robarStock(S); sin++; }
    pintar();
    if (K.gana(S)) { clearInterval(auto); auto = null; despues('ok'); }
  }, 110);
}

/* ---------- pintado ---------- */
const etiqueta = (html, attrs) => html.replace('<div ', `<div ${attrs} `);
function pintar() {
  if (!S) return;
  const win = K.gana(S), ocu = drag && drag.started ? drag : null, nc = S.extra ? 8 : 7, ini = S.extra ? 0 : 1;
  const esPst = (t, col, idx) => pst && pst.o.t === t && (t !== 'tab' || (pst.o.col === col && idx >= pst.o.idx)) && (t !== 'fund');
  $('#klBoard').style.setProperty('--nc', nc);
  let h = '<div class="klrow">';
  h += `<div class="kpile stock ${S.stock.length ? '' : 'vacio'} ${pst && pst.o.t === 'stock' ? 'pst' : ''}" data-pile="stock" role="button" aria-label="${S.stock.length ? 'Robar carta' : 'Volver a pasar el mazo'}">${S.stock.length ? cartaHTML(0, { oculta: true, estilo: '--x:0;--y:0' }) : ''}</div>`;
  const vis = S.waste.slice(-(S.robar === 3 ? 3 : 1));
  h += `<div class="kpile waste">${vis.map((id, i) => etiqueta(cartaHTML(id, { clase: (i === vis.length - 1 && esPst('waste') ? 'pst ' : '') + (ocu && ocu.o.t === 'waste' && i === vis.length - 1 ? 'ocu' : ''), estilo: `--x:${S.robar === 3 ? i * .34 : 0};--y:0` }), i === vis.length - 1 ? 'data-t="waste"' : '')).join('')}</div>`;
  if (S.extra) h += '<div></div>';
  for (let p = 0; p < 4; p++) {
    const f = S.fund[p], top = f[f.length - 1];
    h += `<div class="kpile ${pst && pst.a && pst.a.t === 'fund' && K.cartaDe(S, pst.o) !== undefined && Math.floor(K.cartaDe(S, pst.o) / 13) === p ? 'pst' : ''}" data-drop="fund" data-p="${p}">${top === undefined ? PALOS[p].s : etiqueta(cartaHTML(top, { clase: ocu && ocu.o.t === 'fund' && ocu.o.p === p ? 'ocu' : '', estilo: '--x:0;--y:0' }), `data-t="fund" data-p="${p}"`)}</div>`;
  }
  h += '</div><div class="klrow">';
  for (let col = ini; col < 8; col++) {
    const c = S.tab[col]; let y = 0, cards = '';
    c.d.forEach(() => { cards += cartaHTML(0, { oculta: true, estilo: `--x:0;--y:${y.toFixed(2)}` }); y += DY_ABAJO; });
    c.u.forEach((id, idx) => {
      const oc = ocu && ocu.o.t === 'tab' && ocu.o.col === col && idx >= ocu.o.idx;
      cards += etiqueta(cartaHTML(id, { clase: (esPst('tab', col, idx) ? 'pst ' : '') + (oc ? 'ocu' : ''), estilo: `--x:0;--y:${y.toFixed(2)}` }), `data-t="tab" data-col="${col}" data-idx="${idx}"`); y += DY_ARRIBA;
    });
    const alto = 1.4 + Math.max(0, y - (c.u.length ? DY_ARRIBA : 0));
    h += `<div class="kcol ${col === 0 ? 'libre' : ''} ${pst && pst.a && pst.a.t === 'tab' && pst.a.col === col ? 'pst' : ''}" data-drop="tab" data-col="${col}" style="height:calc(var(--kw) * ${alto.toFixed(2)})"><div class="vacia"></div>${cards}</div>`;
  }
  $('#klBoard').innerHTML = h + '</div>' + (win ? '<div class="kwin">🎉 ¡Solitario completado!</div>' : '');
  const f = S.fund.reduce((n, x) => n + x.length, 0);
  $('#klSum').textContent = `⚙️ Robar ${S.robar} carta${S.robar > 1 ? 's' : ''} · ${S.extra ? 'con' : 'sin'} casilla extra${S.vegas ? ' · Vegas' : ''}${api.pref('garantizada', true) ? ' · con solución' : ''}`;
  const banca = (api.pref('banca', 0) | 0) + (S.vegas && !S.cobrado && (S.mov || K.gana(S)) ? K.puntosVegas(S) : 0);
  $('#klInfo').textContent = S.vegas ? `💰 ${dolares(K.puntosVegas(S))} · banca ${dolares(banca)} · pasada ${S.pasada || 1}/${K.PASADAS_VEGAS[S.robar]}` : `${S.mov} movimientos · ${f}/52 en las bases`;
  root.querySelectorAll('[data-vegas]').forEach(b => b.classList.toggle('on', (b.dataset.vegas === '1') === !!S.vegas));
  root.querySelectorAll('[data-gar]').forEach(b => b.classList.toggle('on', (b.dataset.gar === '1') === api.pref('garantizada', true)));
  $('#klVegasNota').textContent = `Vegas: cada partida cuesta 52 $ y cada carta que subes a las bases te da 5 $. Solo puedes pasar el mazo ${K.PASADAS_VEGAS[S.robar] === 1 ? 'una vez' : `${K.PASADAS_VEGAS[S.robar]} veces`} (${S.robar === 1 ? 'robando de 1 en 1' : 'robando de 3 en 3'}). Con solución: el reparto siempre se puede ganar (lo comprueba el analizador).`;
  $('#klCrono').textContent = fmtTiempo(crono.s);
  root.querySelectorAll('[data-robar]').forEach(b => b.classList.toggle('on', +b.dataset.robar === S.robar));
  root.querySelectorAll('[data-extra]').forEach(b => b.classList.toggle('on', (b.dataset.extra === '1') === S.extra));
  $('#klUndo').disabled = !hist.length || win; $('#klAuto').hidden = win || !!auto || !K.autoResoluble(S);
  root.querySelectorAll('[data-autor]').forEach(b => b.classList.toggle('on', (b.dataset.autor === '1') === autoAuto()));
  $('#klMsg').className = 'msg' + (win ? ' win' : ''); $('#klMsg').textContent = win ? `¡Ganada en ${fmtTiempo(crono.s)} y ${S.mov} movimientos!` : '';
}

/* ---------- entrada: arrastrar, tocar (jugada automática) y robar ---------- */
const origenDe = el => { const t = el.dataset.t; return t === 'waste' ? { t } : t === 'fund' ? { t, p: +el.dataset.p } : { t, col: +el.dataset.col, idx: +el.dataset.idx }; };
function pDown(e) {
  if (!S || K.gana(S) || auto || e.button > 0) return;
  const st = e.target.closest('[data-pile="stock"]');
  if (st) { drag = { stock: true, x0: e.clientX, y0: e.clientY }; return; }
  const c = e.target.closest('.carta[data-t]'); if (!c) return;
  const o = origenDe(c), r = c.getBoundingClientRect();
  drag = { o, x0: e.clientX, y0: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, started: false, el: null };
  try { $('#klBoard').setPointerCapture(e.pointerId); } catch { /* ignorar */ }
}
function pMove(e) {
  if (!drag || drag.stock) return;
  if (!drag.started) {
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return;
    drag.started = true;
    const cs = K.secuencia(S, drag.o), kw = $('#klBoard').querySelector('.kpile').getBoundingClientRect().width;
    const d = document.createElement('div'); d.className = 'kdrag'; d.style.setProperty('--kw', kw + 'px');
    d.style.height = kw * (1.4 + (cs.length - 1) * DY_ARRIBA) + 'px';
    d.innerHTML = cs.map((id, i) => cartaHTML(id, { estilo: `--y:${(i * DY_ARRIBA).toFixed(2)}` })).join('');
    root.appendChild(d); drag.el = d; pintar();
  }
  drag.el.style.left = e.clientX - drag.dx + 'px'; drag.el.style.top = e.clientY - drag.dy + 'px';
}
function quitarDrag() { if (drag && drag.el) drag.el.remove(); drag = null; }
function pCancel() { const era = drag && drag.started; quitarDrag(); if (era && S) pintar(); }
function pUp(e) {
  if (!drag) return;
  const d = drag;
  if (d.stock) { drag = null; const t = e.target.closest('[data-pile="stock"]'); if (t && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 10) { antes(); if (!K.robarStock(S)) { hist.pop(); pendiente = false; api.sonido('error'); } else despues('click'); } return; }
  if (d.started) {
    d.el.style.display = 'none';
    const z = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-drop]');
    quitarDrag();
    let ok = false;
    if (z) { const a = z.dataset.drop === 'fund' ? { t: 'fund' } : { t: 'tab', col: +z.dataset.col }; if (K.puede(S, d.o, a)) { antes(); ok = K.mover(S, d.o, a); } }
    if (ok) despues(z.dataset.drop === 'fund' ? 'ok' : 'mover'); else { api.sonido('error'); pintar(); }
    return;
  }
  drag = null;                                                           // toque: jugada automática
  const a = K.destinoAuto(S, d.o);
  if (a) { antes(); K.mover(S, d.o, a); despues(a.t === 'fund' ? 'ok' : 'mover'); } else api.sonido('error');
}
function clic(e) {
  const b = e.target.closest('button'); if (!b || !S) return;
  const d = b.dataset;
  if (d.robar) { const n = +d.robar; if (n !== S.robar) nueva(n, S.extra); return; }
  if (d.extra) { const x = d.extra === '1'; if (x !== S.extra) nueva(S.robar, x); return; }
  if (d.vegas) { const x = d.vegas === '1'; if (x !== !!S.vegas) nueva(S.robar, S.extra, false, x); return; }
  if (d.gar) { api.setPref('garantizada', d.gar === '1'); pintar(); api.aviso(d.gar === '1' ? 'Las próximas partidas siempre tendrán solución' : 'Repartos al azar: algunas partidas no se pueden ganar'); return; }
  if (d.autor) { api.setPref('autorrelleno', d.autor === '1'); pintar(); revisarAuto(); return; }
  const a = d.ac;
  if (a === 'nueva') nueva(S.robar, S.extra); else if (a === 'undo') deshacer(); else if (a === 'pista') pista(); else if (a === 'auto') autocompletar(); else if (a === 'analizador') abrirAnalizador(); else if (a === 'aspecto') asp.abrir();
}
function reglas() {
  api.modal('Solitario Klondike', `<ul><li>Lleva las 52 cartas a las <b>4 bases</b> de arriba, de la A a la K y por palos.</li>
    <li>En las columnas se apila en <b>orden descendente alternando colores</b> (un 6 negro sobre un 7 rojo). Solo un rey puede ocupar una columna vacía.</li>
    <li><b>Casilla extra «Libre»</b> (a la izquierda): empieza vacía y admite <b>cualquier carta o grupo</b>; después sigue las reglas normales. Úsala para desatascar columnas. Se puede desactivar en las opciones.</li>
    <li><b>Arrastra</b> una carta (o un grupo) para moverla. <b>Toca</b> una carta y se envía sola a donde mejor encaje (primero a las bases; la casilla Libre solo se usa arrastrando).</li>
    <li>Toca el mazo para robar; cuando se acaba, tócalo de nuevo. Puedes robar de 1 en 1 o de 3 en 3.</li>
    <li><b>Analizador</b>: la burbuja de la esquina muestra si el camino sigue abierto (🟢 100 %) o cerrado (🔴 0 %). Tócala para ver el detalle y el <b>acierto de tus jugadas</b> (porcentaje de jugadas que mantuvieron el camino abierto). Si una jugada cierra el camino, te avisa.</li>
    <li>⚡ <b>Auto-relleno</b>: cuando no quedan cartas boca abajo y el resto puede subir solo, las cartas van solas a las bases y la partida se termina. Puedes dejarlo automático o usar el botón (en las opciones ⚙️).</li>
    <li>💡 <b>Pista</b> y ↶ <b>Deshacer</b>.</li>
    <li>✅ <b>Siempre con solución</b> (por defecto): antes de repartir, el analizador comprueba que la partida se puede ganar.</li>
    <li>💰 <b>Vegas</b>: cada partida cuesta 52 $ y cada carta en las bases paga 5 $; el mazo solo se pasa una vez robando de 1 (tres veces robando de 3). Lo que ganas o pierdes se acumula en tu banca.</li></ul>`);
}
