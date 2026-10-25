// Solitario Spider · 104 cartas, 10 columnas, 1, 2 o 4 palos. Reglas en motor.js. Apariencia como el resto de juegos de Cartas.
import { $, fmtTiempo } from '../../core/dom.js';
import { cartaHTML, PALOS } from '../../core/cartas.js';
import { Cronometro } from '../../core/cronometro.js';
import { grupoMesa, grupoDorso, grupoBarajaFr } from '../../core/aspectos.js';
import * as K from './motor.js';

const DY_ABAJO = .12, DY_ARRIBA = .3;
let S = null, hist = [], api = null, asp = null, root = null, crono = null, reg = false, pst = null, pstT = null, drag = null, avisoBloq = false;

/* ---------- validación / resumen ---------- */
export function validar(d) {
  const s = d && K.validar(d.s); if (!s) return null;
  return { s, hist: Array.isArray(d.hist) ? d.hist.slice(-40).map(h => K.validar(h)).filter(Boolean) : [], t: Number.isInteger(d.t) && d.t >= 0 ? d.t : 0, reg: !!d.reg };
}
export const migrarV1 = d => d;
const txtPalos = n => `${n} ${n === 1 ? 'palo' : 'palos'}`;
export function resumen(d) {
  const b = d.s.base.length;
  return K.gana(d.s) ? { texto: `${txtPalos(d.s.palos)} · ¡Ganada!`, fin: true } : { texto: `${txtPalos(d.s.palos)} · ${b}/8 series`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; pst = null; drag = null; avisoBloq = false;
  asp = api.aspecto([grupoMesa(), grupoDorso(), grupoBarajaFr()]);
  await api.css(new URL('../../../css/cartas.css', import.meta.url)); await api.css(new URL('./spider.css', import.meta.url));
  const g = api.cargar();
  if (g) { S = g.s; hist = g.hist; reg = g.reg; } else { S = K.nuevo(api.pref('palos', 1)); hist = []; reg = false; }
  root.innerHTML = `
    <div class="info"><span class="mut" id="spInfo"></span><span id="spCrono" aria-label="Tiempo">0:00</span></div>
    <div class="mesa sp" id="spBoard"></div>
    <div class="msg" id="spMsg" role="status" aria-live="polite"></div>
    <div class="bar"><button class="btn" data-ac="undo" id="spUndo">↶ Deshacer</button><button class="btn" data-ac="pista">💡 Pista</button><button class="btn" data-ac="repartir" id="spRep">🃏 Repartir</button></div>${api.barraHtml()}`;
  root.addEventListener('click', clic);
  const b = $('#spBoard'); b.addEventListener('pointerdown', pDown); b.addEventListener('pointermove', pMove); b.addEventListener('pointerup', pUp); b.addEventListener('pointercancel', pCancel);
  api.barra({ nueva: () => nueva(S.palos),
    salir: () => { location.hash = '#/cat/cartas'; },
    pausar: () => { if (crono) crono.pausar(); },
    reanudar: () => { if (crono && S && !K.gana(S) && S.mov > 0) crono.iniciar(); },
    config: { valores: () => ({ palos: S.palos }), grupos: () => [{ clave: 'palos', titulo: 'Palos', opciones: [[1, '♠ 1 palo (fácil)'], [2, '♠♥ 2 palos'], [4, '♠♥♦♣ 4 palos (difícil)']] }], aplicar: v => nueva(v.palos, true) } });
  api.menu([{ texto: 'Nueva partida', accion: () => nueva(S.palos) }, { texto: 'Deshacer', accion: deshacer }, { texto: 'Pista', accion: pista }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  crono = new Cronometro(() => { if (S) { $('#spCrono').textContent = fmtTiempo(crono.s); if (crono.s % 15 === 0) guardar(); } }, g ? g.t : 0);
  if (S.mov > 0 && !K.gana(S)) crono.iniciar();
  pintar();
}
export function unmount() {
  if (S && crono) guardar();
  if (crono) crono.detener();
  clearTimeout(pstT); quitarDrag();
  if (root) root.removeEventListener('click', clic);
  S = null; crono = null; asp = null;
}
function guardar() { if (!S) return; const d = { s: S, hist: hist.slice(-40), t: crono ? crono.s : 0, reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- partida ---------- */
const hayProgreso = () => S.mov > 0 && !K.gana(S);
function nueva(palos, forzar = false) {
  if (!forzar && hayProgreso() && !api.confirmar('¿Empezar una partida nueva? Perderás la actual.')) return;
  asp.sortear(); api.setPref('palos', palos);
  crono.detener(); crono = new Cronometro(crono.alTick, 0);
  S = K.nuevo(palos); hist = []; reg = false; pst = null; avisoBloq = false;
  pintar(); guardar();
}
function antes() { hist.push(K.copia(S)); if (hist.length > 60) hist.shift(); if (S.mov === 0) crono.iniciar(); pst = null; }
function despues(sonido = 'mover') {
  api.sonido(sonido);
  if (K.gana(S) && !reg) {
    reg = true; crono.detener(); api.registrar({ res: 'victoria', tiempo: crono.s, variante: txtPalos(S.palos) }); api.sonido('ganar'); api.vibrar([60, 40, 60, 40, 90]);
  } else if (!K.gana(S) && !K.hayJugadas(S)) { if (!avisoBloq) api.aviso('No quedan jugadas: usa ↶ Deshacer o empieza otra partida'); avisoBloq = true; } else avisoBloq = false;
  pintar(); guardar();
}
function deshacer() {
  if (!hist.length || K.gana(S)) { api.aviso('Nada que deshacer'); return; }
  S = hist.pop(); pst = null; avisoBloq = false; pintar(); guardar();
}
function pista() {
  if (K.gana(S)) return;
  const p = K.pista(S); if (!p) { api.aviso('No quedan jugadas: prueba con Deshacer o una partida nueva'); return; }
  pst = p; clearTimeout(pstT); pstT = setTimeout(() => { pst = null; if (S) pintar(); }, 4000); api.aviso(p.txt); pintar();
}
function repartir() {
  if (K.gana(S) || !S.stock.length) { api.sonido('error'); return; }
  if (!K.puedeRepartir(S)) { api.aviso('Para repartir no puede haber columnas vacías'); api.sonido('error'); return; }
  antes(); K.repartir(S); despues('click');
}

/* ---------- pintado ---------- */
const etiqueta = (html, attrs) => html.replace('<div ', `<div ${attrs} `);
function pintar() {
  if (!S) return;
  const win = K.gana(S), ocu = drag && drag.started ? drag : null, pm = pst && pst.tipo === 'mover' ? pst : null;
  let h = '<div class="sprow spalto">';
  const quedan = K.repartosRestantes(S);
  h += `<div class="sppile stock ${quedan ? '' : 'vacio'} ${pst && pst.tipo === 'repartir' ? 'pst' : ''}" data-pile="stock" role="button" aria-label="${quedan ? `Repartir (quedan ${quedan})` : 'Sin cartas para repartir'}">${quedan ? cartaHTML(0, { oculta: true, estilo: '--x:0;--y:0' }) + `<span class="spn">${quedan}</span>` : ''}</div><div></div>`;
  for (let i = 0; i < K.SERIES; i++) { const p = S.base[i]; h += `<div class="sppile base">${p === undefined ? '' : cartaHTML(p * 13 + 12, { estilo: '--x:0;--y:0' })}</div>`; }
  h += '</div><div class="sprow">';
  for (let col = 0; col < K.COLS; col++) {
    const c = S.tab[col]; let y = 0, cards = '';
    c.d.forEach(() => { cards += cartaHTML(0, { oculta: true, estilo: `--x:0;--y:${y.toFixed(2)}` }); y += DY_ABAJO; });
    c.u.forEach((id, idx) => {
      const oc = ocu && ocu.col === col && idx >= ocu.idx, ps = pm && pm.col === col && idx >= pm.idx;
      cards += etiqueta(cartaHTML(id, { clase: (ps ? 'pst ' : '') + (oc ? 'ocu' : ''), estilo: `--x:0;--y:${y.toFixed(2)}` }), `data-col="${col}" data-idx="${idx}"`); y += DY_ARRIBA;
    });
    const alto = 1.4 + Math.max(0, y - (c.u.length ? DY_ARRIBA : 0));
    h += `<div class="spcol ${pm && pm.dest === col ? 'pst' : ''}" data-drop="${col}" style="height:calc(var(--kw) * ${alto.toFixed(2)})"><div class="vacia"></div>${cards}</div>`;
  }
  $('#spBoard').innerHTML = h + '</div>' + (win ? '<div class="spwin">🎉 ¡Solitario completado!</div>' : '');
  $('#spInfo').textContent = `${txtPalos(S.palos)} · ${S.base.length}/8 series · ${K.puntos(S)} pts`;
  $('#spCrono').textContent = fmtTiempo(crono.s);
  $('#spUndo').disabled = !hist.length || win; $('#spRep').disabled = win || !S.stock.length;
  $('#spMsg').className = 'msg' + (win ? ' win' : ''); $('#spMsg').textContent = win ? `¡Ganada en ${fmtTiempo(crono.s)} y ${S.mov} movimientos!` : '';
}

/* ---------- entrada: arrastrar, tocar (jugada automática) y repartir ---------- */
function pDown(e) {
  if (!S || K.gana(S) || e.button > 0) return;
  if (e.target.closest('[data-pile="stock"]')) { drag = { stock: true, x0: e.clientX, y0: e.clientY }; return; }
  const c = e.target.closest('.carta[data-col]'); if (!c) return;
  const col = +c.dataset.col, idx = +c.dataset.idx;
  if (!K.puedeTomar(S, col, idx)) { api.sonido('error'); return; }
  const r = c.getBoundingClientRect();
  drag = { col, idx, x0: e.clientX, y0: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, started: false, el: null };
  try { $('#spBoard').setPointerCapture(e.pointerId); } catch { /* ignorar */ }
}
function pMove(e) {
  if (!drag || drag.stock) return;
  if (!drag.started) {
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return;
    drag.started = true;
    const cs = K.secuencia(S, drag.col, drag.idx), kw = $('#spBoard').querySelector('.sppile').getBoundingClientRect().width;
    const d = document.createElement('div'); d.className = 'spdrag'; d.style.setProperty('--kw', kw + 'px');
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
  if (d.stock) { drag = null; const t = e.target.closest('[data-pile="stock"]'); if (t && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 10) repartir(); return; }
  if (d.started) {
    d.el.style.display = 'none';
    const z = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-drop]');
    quitarDrag();
    let ok = false;
    if (z) { const dest = +z.dataset.drop; if (K.puede(S, d.col, d.idx, dest)) { antes(); ok = K.mover(S, d.col, d.idx, dest); } }
    if (ok) despues(); else { api.sonido('error'); pintar(); }
    return;
  }
  drag = null;                                                           // toque: jugada automática
  const dest = K.destinoAuto(S, d.col, d.idx);
  if (dest >= 0) { antes(); K.mover(S, d.col, d.idx, dest); despues(); } else api.sonido('error');
}
function clic(e) {
  const b = e.target.closest('button'); if (!b || !S) return;
  const a = b.dataset.ac;
  if (a === 'nueva') nueva(S.palos); else if (a === 'undo') deshacer(); else if (a === 'pista') pista(); else if (a === 'repartir') repartir(); else if (a === 'aspecto') asp.abrir();
}
function reglas() {
  api.modal('Solitario Spider', `<ul><li>Forma <b>8 series completas</b> de la K a la A del <b>mismo palo</b> en las columnas: cada serie completa sale sola a las bases de arriba.</li>
    <li>Puedes poner una carta sobre otra <b>de rango inmediatamente superior</b> (un 6 sobre un 7), sea del palo que sea. Una columna vacía admite cualquier carta o grupo.</li>
    <li>Solo se pueden mover <b>grupos del mismo palo y en orden</b> (por ejemplo 9♠ 8♠ 7♠). Si mezclas palos, el grupo queda atascado hasta que lo desmontes.</li>
    <li><b>Arrastra</b> una carta o un grupo, o <b>tócalo</b> para que se envíe a donde mejor encaje.</li>
    <li>Toca el mazo (o 🃏 Repartir) para colocar <b>una carta nueva en cada columna</b>. Hay 5 repartos y <b>no se puede repartir con una columna vacía</b>.</li>
    <li>Dificultad: <b>1 palo</b> (solo ♠), <b>2 palos</b> (♠♥) o <b>4 palos</b> (los cuatro), en ⚙️ Configurar partida.</li>
    <li>Puntos: empiezas con 500, pierdes 1 por movimiento y ganas 100 por cada serie completada.</li>
    <li>💡 <b>Pista</b> y ↶ <b>Deshacer</b> (todos los movimientos que quieras).</li></ul>`);
}
