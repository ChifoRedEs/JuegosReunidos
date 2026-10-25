// Carta Blanca (FreeCell) · 8 columnas, 4 casillas libres y 4 bases. Reglas en motor.js; solver.js da pistas y repartos con solución.
import { $, fmtTiempo } from '../../core/dom.js';
import { cartaHTML, PALOS } from '../../core/cartas.js';
import { Cronometro } from '../../core/cronometro.js';
import { grupoMesa, grupoDorso, grupoBarajaFr } from '../../core/aspectos.js';
import * as K from './motor.js';

const DY = .3;
let S = null, hist = [], api = null, asp = null, root = null, crono = null, reg = false, pst = null, pstT = null, drag = null, auto = null, repartiendo = false, serie = 0, avisoBloq = false, pensando = false;

/* ---------- validación / resumen ---------- */
export function validar(d) {
  const s = d && K.validar(d.s); if (!s) return null;
  return { s, hist: Array.isArray(d.hist) ? d.hist.slice(-40).map(h => K.validar(h)).filter(Boolean) : [], t: Number.isInteger(d.t) && d.t >= 0 ? d.t : 0, reg: !!d.reg };
}
export const migrarV1 = d => d;
export function resumen(d) {
  const f = d.s.fund.reduce((n, x) => n + x.length, 0);
  return K.gana(d.s) ? { texto: '¡Ganada!', fin: true } : { texto: `${f}/52 en las bases`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; pst = null; drag = null; auto = null; avisoBloq = false; repartiendo = false; pensando = false;
  asp = api.aspecto([grupoMesa(), grupoDorso(), grupoBarajaFr()]);
  await api.css(new URL('../../../css/cartas.css', import.meta.url)); await api.css(new URL('./freecell.css', import.meta.url));
  const g = api.cargar();
  if (g) { S = g.s; hist = g.hist; reg = g.reg; } else { S = K.nuevo(); hist = []; reg = false; }
  root.innerHTML = `
    <div class="info"><span class="mut" id="fcInfo"></span><span id="fcCrono" aria-label="Tiempo">0:00</span></div>
    <div class="mesa fc" id="fcBoard"></div>
    <div class="msg" id="fcMsg" role="status" aria-live="polite"></div>
    <div class="bar"><button class="btn" data-ac="undo" id="fcUndo">↶ Deshacer</button><button class="btn" data-ac="pista" id="fcPista">💡 Pista</button></div>${api.barraHtml()}`;
  root.addEventListener('click', clic);
  const b = $('#fcBoard'); b.addEventListener('pointerdown', pDown); b.addEventListener('pointermove', pMove); b.addEventListener('pointerup', pUp); b.addEventListener('pointercancel', pCancel);
  api.barra({ nueva: () => nueva(),
    salir: () => { location.hash = '#/cat/cartas'; },
    pausar: () => { if (crono) crono.pausar(); },
    reanudar: () => { if (crono && S && !K.gana(S) && S.mov > 0) crono.iniciar(); },
    config: { valores: () => ({ gar: api.pref('garantizada', true), autor: api.pref('autosubir', true) }),
      grupos: () => [{ clave: 'gar', titulo: 'Reparto', opciones: [[true, '✅ Siempre con solución'], [false, '🎲 Al azar']] }, { clave: 'autor', titulo: 'Subir a las bases', opciones: [[true, 'Solas (jugadas seguras)'], [false, 'Solo a mano']], nota: 'Las cartas que ya no hacen falta en las columnas suben solas a las bases.' }],
      aplicar: v => { api.setPref('garantizada', v.gar); api.setPref('autosubir', v.autor); nueva(true); } } });
  api.menu([{ texto: 'Nueva partida', accion: () => nueva() }, { texto: 'Deshacer', accion: deshacer }, { texto: 'Pista', accion: pista }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  crono = new Cronometro(() => { if (S) { $('#fcCrono').textContent = fmtTiempo(crono.s); if (crono.s % 15 === 0) guardar(); } }, g ? g.t : 0);
  if (S.mov > 0 && !K.gana(S)) crono.iniciar();
  pintar(); revisarAuto();
}
export function unmount() {
  if (S && crono) guardar();
  if (crono) crono.detener();
  serie++; repartiendo = false; clearTimeout(pstT); clearInterval(auto); quitarDrag();
  if (root) root.removeEventListener('click', clic);
  S = null; crono = null; asp = null;
}
function guardar() { if (!S) return; const d = { s: S, hist: hist.slice(-40), t: crono ? crono.s : 0, reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- trabajo en segundo plano ---------- */
function trabajo(msg, ms) {
  return new Promise(res => {
    let w; try { w = new Worker(new URL('./solver.worker.js', import.meta.url), { type: 'module' }); } catch { res(null); return; }
    const fin = x => { clearTimeout(t); w.terminate(); res(x); }, t = setTimeout(() => fin(null), ms);
    w.onmessage = e => fin(e.data); w.onerror = () => fin(null); w.postMessage({ id: 1, ...msg });
  });
}

/* ---------- partida ---------- */
const hayProgreso = () => S.mov > 0 && !K.gana(S);
async function nueva(forzar = false) {
  if (repartiendo) return;
  if (!forzar && hayProgreso() && !api.confirmar('¿Empezar una partida nueva? Perderás la actual.')) return;
  asp.sortear(); clearInterval(auto); auto = null; crono.detener(); crono = new Cronometro(crono.alTick, 0);
  let nuevoS = null;
  if (api.pref('garantizada', true)) {
    const tok = ++serie; repartiendo = true; $('#fcMsg').className = 'msg'; $('#fcMsg').textContent = '🔀 Barajando una partida con solución…';
    const r = await trabajo({ tipo: 'repartir', ms: 9000 }, 15000); nuevoS = r && r.S ? K.validar(r.S) : null;
    if (tok !== serie) return; repartiendo = false; if (!S || !crono) return;
    if (!nuevoS) api.aviso('No encontré a tiempo una partida con solución: esta es al azar');
  }
  S = nuevoS || K.nuevo(); hist = []; reg = false; pst = null; avisoBloq = false;
  pintar(); guardar();
}
function antes() { hist.push(K.copia(S)); if (hist.length > 80) hist.shift(); if (S.mov === 0) crono.iniciar(); pst = null; }
function despues(sonido = 'mover') {
  api.sonido(sonido); finJugada();
}
function finJugada() {
  if (K.gana(S) && !reg) {
    reg = true; crono.detener(); api.registrar({ res: 'victoria', tiempo: crono.s }); api.sonido('ganar'); api.vibrar([60, 40, 60, 40, 90]);
  } else if (!K.gana(S) && !K.hayJugadas(S)) { if (!avisoBloq) api.aviso('No quedan jugadas: usa ↶ Deshacer'); avisoBloq = true; } else avisoBloq = false;
  pintar(); guardar(); revisarAuto();
}
function deshacer() {
  if (!hist.length || K.gana(S)) { api.aviso('Nada que deshacer'); return; }
  clearInterval(auto); auto = null; S = hist.pop(); pst = null; avisoBloq = false; pintar(); guardar();
}
// Subida automática de cartas seguras a las bases (forma parte de la misma jugada: un solo Deshacer las revierte)
const autoOn = () => api.pref('autosubir', true);
function revisarAuto() {
  if (!S || auto || drag || !autoOn() || K.gana(S) || !K.autoSiguiente(S)) return;
  auto = setInterval(() => {
    const o = S && !drag && K.autoSiguiente(S);
    if (!o) { clearInterval(auto); auto = null; if (S) finJugada(); return; }
    K.mover(S, o, { t: 'fund' }); api.sonido('click'); pintar();
  }, 130);
}
async function pista() {
  if (K.gana(S) || pensando) return;
  pensando = true; api.aviso('🔍 Buscando la mejor jugada…'); const copiaS = K.copia(S);
  const r = await trabajo({ tipo: 'resolver', S: copiaS, ms: 2500 }, 5000); pensando = false; if (!S || !crono) return;
  let p = r && r.pasos && r.pasos.length ? { o: r.pasos[0].o, a: r.pasos[0].a } : null;
  if (p && !K.puede(S, p.o, p.a)) p = null;
  if (p) p.txt = `${K.nombre(K.cartaDe(S, p.o))} → ${p.a.t === 'fund' ? 'a la base' : p.a.t === 'cell' ? 'casilla libre' : `columna ${p.a.col + 1}`}`; else p = K.pista(S);
  if (!p) { api.aviso('No quedan jugadas: prueba con Deshacer o una partida nueva'); return; }
  pst = p; clearTimeout(pstT); pstT = setTimeout(() => { pst = null; if (S) pintar(); }, 4000); api.aviso(p.txt); pintar();
}

/* ---------- pintado ---------- */
const etiqueta = (html, attrs) => html.replace('<div ', `<div ${attrs} `);
function pintar() {
  if (!S) return;
  const win = K.gana(S), ocu = drag && drag.started ? drag.o : null;
  const esOrig = (t, col, idx) => pst && pst.o.t === t && (t === 'cell' ? pst.o.i === col : (pst.o.col === col && idx >= pst.o.idx));
  let h = '<div class="fcrow fcalto">';
  S.cells.forEach((id, i) => {
    const oc = ocu && ocu.t === 'cell' && ocu.i === i;
    h += `<div class="fcpile cell ${pst && pst.a && pst.a.t === 'cell' && pst.a.i === i ? 'pst' : ''}" data-drop="cell" data-i="${i}">${id === null ? '' : etiqueta(cartaHTML(id, { clase: (esOrig('cell', i) ? 'pst ' : '') + (oc ? 'ocu' : ''), estilo: '--x:0;--y:0' }), `data-t="cell" data-i="${i}"`)}</div>`;
  });
  for (let p = 0; p < 4; p++) {
    const f = S.fund[p], top = f[f.length - 1];
    h += `<div class="fcpile base ${pst && pst.a && pst.a.t === 'fund' && K.cartaDe(S, pst.o) !== undefined && Math.floor(K.cartaDe(S, pst.o) / 13) === p ? 'pst' : ''}" data-drop="fund">${top === undefined ? `<span class="fcp">${PALOS[p].s}</span>` : cartaHTML(top, { estilo: '--x:0;--y:0' })}</div>`;
  }
  h += '</div><div class="fcrow">';
  for (let col = 0; col < K.COLS; col++) {
    const t = S.tab[col]; let cards = '';
    t.forEach((id, idx) => {
      const oc = ocu && ocu.t === 'tab' && ocu.col === col && idx >= ocu.idx;
      cards += etiqueta(cartaHTML(id, { clase: (esOrig('tab', col, idx) ? 'pst ' : '') + (oc ? 'ocu' : ''), estilo: `--x:0;--y:${(idx * DY).toFixed(2)}` }), `data-t="tab" data-col="${col}" data-idx="${idx}"`);
    });
    const alto = 1.4 + Math.max(0, (t.length - 1) * DY);
    h += `<div class="fccol ${pst && pst.a && pst.a.t === 'tab' && pst.a.col === col ? 'pst' : ''}" data-drop="tab" data-col="${col}" style="height:calc(var(--kw) * ${alto.toFixed(2)})"><div class="vacia"></div>${cards}</div>`;
  }
  $('#fcBoard').innerHTML = h + '</div>' + (win ? '<div class="fcwin">🎉 ¡Solitario completado!</div>' : '');
  const f = S.fund.reduce((n, x) => n + x.length, 0);
  $('#fcInfo').textContent = `${S.mov} movimientos · ${f}/52 en las bases`;
  $('#fcCrono').textContent = fmtTiempo(crono.s);
  $('#fcUndo').disabled = !hist.length || win; $('#fcPista').disabled = win;
  if (!repartiendo) { $('#fcMsg').className = 'msg' + (win ? ' win' : ''); $('#fcMsg').textContent = win ? `¡Ganada en ${fmtTiempo(crono.s)} y ${S.mov} movimientos!` : ''; }
}

/* ---------- entrada: arrastrar y tocar (jugada automática) ---------- */
const origenDe = el => el.dataset.t === 'cell' ? { t: 'cell', i: +el.dataset.i } : { t: 'tab', col: +el.dataset.col, idx: +el.dataset.idx };
function pDown(e) {
  if (!S || K.gana(S) || auto || repartiendo || e.button > 0) return;
  const c = e.target.closest('.carta[data-t]'); if (!c) return;
  const o = origenDe(c);
  if (o.t === 'tab' && !K.grupoValido(S, o.col, o.idx)) { api.aviso('Solo se mueven filas ordenadas (colores alternos)'); api.sonido('error'); return; }
  const r = c.getBoundingClientRect();
  drag = { o, x0: e.clientX, y0: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, started: false, el: null };
  try { $('#fcBoard').setPointerCapture(e.pointerId); } catch { /* ignorar */ }
}
function pMove(e) {
  if (!drag) return;
  if (!drag.started) {
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return;
    drag.started = true;
    const cs = K.secuencia(S, drag.o), kw = $('#fcBoard').querySelector('.fcpile').getBoundingClientRect().width;
    const d = document.createElement('div'); d.className = 'fcdrag'; d.style.setProperty('--kw', kw + 'px');
    d.style.height = kw * (1.4 + (cs.length - 1) * DY) + 'px';
    d.innerHTML = cs.map((id, i) => cartaHTML(id, { estilo: `--y:${(i * DY).toFixed(2)}` })).join('');
    root.appendChild(d); drag.el = d; pintar();
  }
  drag.el.style.left = e.clientX - drag.dx + 'px'; drag.el.style.top = e.clientY - drag.dy + 'px';
}
function quitarDrag() { if (drag && drag.el) drag.el.remove(); drag = null; }
function pCancel() { const era = drag && drag.started; quitarDrag(); if (era && S) pintar(); }
function pUp(e) {
  if (!drag) return;
  const d = drag;
  if (d.started) {
    d.el.style.display = 'none';
    const z = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-drop]');
    quitarDrag();
    let ok = false;
    if (z) {
      const a = z.dataset.drop === 'fund' ? { t: 'fund' } : z.dataset.drop === 'cell' ? { t: 'cell', i: +z.dataset.i } : { t: 'tab', col: +z.dataset.col };
      if (K.puede(S, d.o, a)) { antes(); ok = K.mover(S, d.o, a); }
      if (ok) { despues(a.t === 'fund' ? 'ok' : 'mover'); return; }
    }
    api.sonido('error'); pintar(); return;
  }
  drag = null;                                                           // toque: jugada automática
  const a = K.destinoAuto(S, d.o);
  if (a) { antes(); K.mover(S, d.o, a); despues(a.t === 'fund' ? 'ok' : 'mover'); } else api.sonido('error');
}
function clic(e) {
  const b = e.target.closest('button'); if (!b || !S) return;
  const a = b.dataset.ac;
  if (a === 'nueva') nueva(); else if (a === 'undo') deshacer(); else if (a === 'pista') pista(); else if (a === 'aspecto') asp.abrir();
}
function reglas() {
  api.modal('Carta Blanca (FreeCell)', `<ul><li>Lleva las 52 cartas a las <b>4 bases</b> de arriba a la derecha, de la A a la K y por palos. Todas las cartas están boca arriba.</li>
    <li>En las columnas se apila en <b>orden descendente alternando colores</b> (un 6 negro sobre un 7 rojo).</li>
    <li>Las <b>4 casillas libres</b> de arriba a la izquierda guardan <b>una carta cada una</b> de forma temporal.</li>
    <li>Puedes mover una <b>fila ordenada</b> de golpe: cuantas más casillas libres y columnas vacías tengas, más cartas caben ((casillas libres + 1) × 2 por cada columna vacía). Una columna vacía admite cualquier carta o fila.</li>
    <li><b>Arrastra</b> una carta o una fila, o <b>tócala</b> para que se envíe a donde mejor encaje (primero a las bases, luego a una columna y por último a una casilla libre).</li>
    <li>Las cartas que ya no hacen falta suben <b>solas</b> a las bases (se puede desactivar en ⚙️ Configurar partida); un solo ↶ Deshacer revierte la jugada y esa subida.</li>
    <li>✅ <b>Siempre con solución</b> (por defecto): antes de repartir se comprueba que la partida se puede ganar. 💡 <b>Pista</b> calcula la mejor jugada.</li></ul>`);
}
