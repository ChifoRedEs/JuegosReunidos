import { $, fmtTiempo } from '../../core/dom.js';
import { cartaHTML, PALOS } from '../../core/cartas.js';
import { Cronometro } from '../../core/cronometro.js';
import { grupoMesa, grupoDorso, grupoPalos } from '../../core/aspectos.js';
import * as K from './motor.js';

const DY_ABAJO = .2, DY_ARRIBA = .38;
let S = null, hist = [], api = null, asp = null, root = null, crono = null, reg = false, pst = null, pstT = null, drag = null, auto = null;

/* ---------- validación / resumen ---------- */
export function validar(d) {
  const s = d && K.validar(d.s); if (!s) return null;
  return { s, hist: Array.isArray(d.hist) ? d.hist.slice(-40).map(h => K.validar(h)).filter(Boolean) : [], t: Number.isInteger(d.t) && d.t >= 0 ? d.t : 0, reg: !!d.reg };
}
export const migrarV1 = d => d;
export function resumen(d) {
  const f = d.s.fund.reduce((n, x) => n + x.length, 0);
  return K.gana(d.s) ? { texto: `Robar ${d.s.robar} · ¡Ganada!`, fin: true } : { texto: `Robar ${d.s.robar} · ${f}/52 en las bases`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; pst = null; drag = null; auto = null;
  asp = api.aspecto([grupoMesa(), grupoDorso(), grupoPalos()]);
  await api.css(new URL('../../../css/cartas.css', import.meta.url)); await api.css(new URL('./klondike.css', import.meta.url));
  const g = api.cargar();
  if (g) { S = g.s; hist = g.hist; reg = g.reg; } else { S = K.nuevo(api.pref('robar', 1)); hist = []; reg = false; }
  root.innerHTML = `
    <details class="ops" id="klOps"><summary id="klSum"></summary><div class="bar"><span class="lbl">Robar</span><div class="seg"><button class="btn" data-robar="1">1 carta</button><button class="btn" data-robar="3">3 cartas</button></div></div></details>
    <div class="info"><span class="mut" id="klInfo"></span><span id="klCrono" aria-label="Tiempo">0:00</span></div>
    <div class="mesa kl" id="klBoard"></div>
    <div class="msg" id="klMsg" role="status" aria-live="polite"></div>
    <div class="bar"><button class="btn on" data-ac="nueva">Nueva</button><button class="btn" data-ac="undo" id="klUndo">↶ Deshacer</button><button class="btn" data-ac="pista">💡 Pista</button><button class="btn" data-ac="auto" id="klAuto" hidden>⚡ Autocompletar</button><button class="btn" data-ac="aspecto">🎨</button></div>`;
  root.addEventListener('click', clic);
  const b = $('#klBoard'); b.addEventListener('pointerdown', pDown); b.addEventListener('pointermove', pMove); b.addEventListener('pointerup', pUp); b.addEventListener('pointercancel', pCancel);
  api.menu([{ texto: 'Nueva partida', accion: () => nueva(S.robar) }, { texto: 'Deshacer', accion: deshacer }, { texto: 'Pista', accion: pista }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  crono = new Cronometro(() => { if (S) { $('#klCrono').textContent = fmtTiempo(crono.s); if (crono.s % 15 === 0) guardar(); } }, g ? g.t : 0);
  if (S.mov > 0 && !K.gana(S)) crono.iniciar();
  pintar();
}
export function unmount() {
  if (S && crono) guardar();
  if (crono) crono.detener();
  clearTimeout(pstT); clearInterval(auto); quitarDrag();
  if (root) root.removeEventListener('click', clic);
  S = null; crono = null; asp = null;
}
function guardar() { if (!S) return; const d = { s: S, hist: hist.slice(-40), t: crono ? crono.s : 0, reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- partida ---------- */
const hayProgreso = () => S.mov > 0 && !K.gana(S);
function nueva(robar, forzar = false) {
  if (!forzar && hayProgreso() && !api.confirmar('¿Empezar una partida nueva? Perderás la actual.')) return;
  clearInterval(auto); crono.detener(); crono = new Cronometro(crono.alTick, 0);
  S = K.nuevo(robar); hist = []; reg = false; pst = null; api.setPref('robar', robar); pintar(); guardar();
}
function antes() { hist.push(K.copia(S)); if (hist.length > 60) hist.shift(); if (S.mov === 0) crono.iniciar(); pst = null; }
function despues(sonido = 'mover') {
  api.sonido(sonido);
  if (K.gana(S) && !reg) {
    reg = true; crono.detener(); api.registrar({ res: 'victoria', tiempo: crono.s, variante: `Robar ${S.robar}` }); api.sonido('ganar'); api.vibrar([60, 40, 60, 40, 90]);
  }
  pintar(); guardar();
}
function deshacer() {
  if (!hist.length || K.gana(S)) { api.aviso('Nada que deshacer'); return; }
  clearInterval(auto); S = hist.pop(); pst = null; pintar(); guardar();
}
function pista() {
  if (K.gana(S)) return;
  const p = K.pista(S); if (!p) { api.aviso('No quedan jugadas: prueba con Deshacer o una partida nueva'); return; }
  pst = p; clearTimeout(pstT); pstT = setTimeout(() => { pst = null; if (S) pintar(); }, 4000); api.aviso(p.txt); pintar();
}
function autocompletar() {
  if (!K.todoArriba(S) || K.gana(S) || auto) return;
  antes(); hist.pop(); hist.push(K.copia(S));
  auto = setInterval(() => {
    const o = S && K.autoSiguiente(S);
    if (!o) { clearInterval(auto); auto = null; despues('ok'); return; }
    K.mover(S, o, { t: 'fund' }); api.sonido('click'); pintar();
    if (K.gana(S)) { clearInterval(auto); auto = null; despues('ok'); }
  }, 130);
}

/* ---------- pintado ---------- */
const etiqueta = (html, attrs) => html.replace('<div ', `<div ${attrs} `);
function pintar() {
  if (!S) return;
  const win = K.gana(S), ocu = drag && drag.started ? drag : null;
  const esPst = (t, col, idx) => pst && pst.o.t === t && (t !== 'tab' || (pst.o.col === col && idx >= pst.o.idx)) && (t !== 'fund');
  let h = '<div class="klrow">';
  h += `<div class="kpile stock ${S.stock.length ? '' : 'vacio'} ${pst && pst.o.t === 'stock' ? 'pst' : ''}" data-pile="stock" role="button" aria-label="${S.stock.length ? 'Robar carta' : 'Volver a pasar el mazo'}">${S.stock.length ? cartaHTML(0, { oculta: true, estilo: '--x:0;--y:0' }) : ''}</div>`;
  const vis = S.waste.slice(-(S.robar === 3 ? 3 : 1));
  h += `<div class="kpile waste">${vis.map((id, i) => etiqueta(cartaHTML(id, { clase: (i === vis.length - 1 && esPst('waste') ? 'pst ' : '') + (ocu && ocu.o.t === 'waste' && i === vis.length - 1 ? 'ocu' : ''), estilo: `--x:${S.robar === 3 ? i * .34 : 0};--y:0` }), i === vis.length - 1 ? 'data-t="waste"' : '')).join('')}</div>`;
  for (let p = 0; p < 4; p++) {
    const f = S.fund[p], top = f[f.length - 1];
    h += `<div class="kpile ${pst && pst.a && pst.a.t === 'fund' && K.cartaDe(S, pst.o) !== undefined && Math.floor(K.cartaDe(S, pst.o) / 13) === p ? 'pst' : ''}" data-drop="fund" data-p="${p}">${top === undefined ? PALOS[p].s : etiqueta(cartaHTML(top, { clase: ocu && ocu.o.t === 'fund' && ocu.o.p === p ? 'ocu' : '', estilo: '--x:0;--y:0' }), `data-t="fund" data-p="${p}"`)}</div>`;
  }
  h += '</div><div class="klrow">';
  S.tab.forEach((c, col) => {
    let y = 0, cards = '';
    c.d.forEach(() => { cards += cartaHTML(0, { oculta: true, estilo: `--x:0;--y:${y.toFixed(2)}` }); y += DY_ABAJO; });
    c.u.forEach((id, idx) => {
      const oc = ocu && ocu.o.t === 'tab' && ocu.o.col === col && idx >= ocu.o.idx;
      cards += etiqueta(cartaHTML(id, { clase: (esPst('tab', col, idx) ? 'pst ' : '') + (oc ? 'ocu' : ''), estilo: `--x:0;--y:${y.toFixed(2)}` }), `data-t="tab" data-col="${col}" data-idx="${idx}"`); y += DY_ARRIBA;
    });
    const alto = 1.4 + Math.max(0, y - (c.u.length ? DY_ARRIBA : 0));
    h += `<div class="kcol ${pst && pst.a && pst.a.t === 'tab' && pst.a.col === col ? 'pst' : ''}" data-drop="tab" data-col="${col}" style="height:calc(var(--kw) * ${alto.toFixed(2)})"><div class="vacia"></div>${cards}</div>`;
  });
  $('#klBoard').innerHTML = h + '</div>' + (win ? '<div class="kwin">🎉 ¡Solitario completado!</div>' : '');
  const f = S.fund.reduce((n, x) => n + x.length, 0);
  $('#klSum').textContent = `⚙️ Robar ${S.robar} carta${S.robar > 1 ? 's' : ''}`;
  $('#klInfo').textContent = `${S.mov} movimientos · ${f}/52 en las bases`;
  $('#klCrono').textContent = fmtTiempo(crono.s);
  root.querySelectorAll('[data-robar]').forEach(b => b.classList.toggle('on', +b.dataset.robar === S.robar));
  $('#klUndo').disabled = !hist.length || win; $('#klAuto').hidden = !K.todoArriba(S) || win;
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
    d.style.height = kw * (1.4 + (cs.length - 1) * DY_ARRIBA) + 'px'; d.dataset.mesa = '';
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
  if (d.stock) { drag = null; const t = e.target.closest('[data-pile="stock"]'); if (t && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 10) { antes(); if (!K.robarStock(S)) { hist.pop(); api.sonido('error'); } else despues('click'); } return; }
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
  if (d.robar) { const n = +d.robar; if (n !== S.robar) nueva(n); return; }
  const ac = d.ac;
  if (ac === 'nueva') nueva(S.robar); else if (ac === 'undo') deshacer(); else if (ac === 'pista') pista(); else if (ac === 'auto') autocompletar(); else if (ac === 'aspecto') asp.abrir();
}
function reglas() {
  api.modal('Solitario Klondike', `<ul><li>Lleva las 52 cartas a las <b>4 bases</b> de arriba, de la A a la K y por palos.</li>
    <li>En las 7 columnas se apila en <b>orden descendente alternando colores</b> (un 6 negro sobre un 7 rojo). Solo un rey puede ocupar una columna vacía.</li>
    <li><b>Arrastra</b> una carta (o un grupo) para moverla. <b>Toca</b> una carta y se envía sola a donde mejor encaje (primero a las bases).</li>
    <li>Toca el mazo para robar; cuando se acaba, tócalo de nuevo para volver a pasarlo. Puedes robar de 1 en 1 (más fácil) o de 3 en 3.</li>
    <li>💡 <b>Pista</b> señala una jugada útil; ↶ <b>Deshacer</b> no tiene límite práctico. Cuando todas las cartas están boca arriba aparece <b>⚡ Autocompletar</b>.</li></ul>`);
}
