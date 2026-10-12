import { crearDuelo } from '../../core/duelo.js';
import { esc } from '../../core/dom.js';
import { VARIANTES, estadoInicial, jugadas, aplicar, validarEstado, ia, reglasHTML, rendirse, jaque, de, a, coronacion, NOMBRE_PIEZA } from './reglas.js';

const GLIFO = ['', '♟', '♞', '♝', '♜', '♛', '♚'].map(g => g && g + '\uFE0E');   // \uFE0E: forzar el dibujo de texto (no emoji)
const INICIALES = [0, 8, 2, 2, 2, 1, 0], VALOR = [0, 1, 3, 3, 5, 9, 0];
let cont = null, celdas = [], ctxR = null, eAct = null, sel = null, legal = [], flip = false, prom = null, arr = null, cuentaAnt = -1;

const casillaDe = d => (flip ? 63 - d : d);
const color = p => (p >> 3) + 1;                    // 1 blancas · 2 negras
const piezaHTML = p => `<span class="pz ${p >> 3 ? 'n' : 'b'}">${GLIFO[p & 7]}</span>`;

function montar(c, ctx) {
  cont = c; ctxR = ctx; eAct = null; sel = null; prom = null; arr = null; cuentaAnt = -1;
  c.innerHTML = `<div class="axw">
    <div class="axcap" id="axCapA"></div>
    <div class="axtw"><div class="axtab" id="axTab" role="grid" aria-label="Tablero de ajedrez">${Array.from({ length: 64 }, (_, d) => `<button type="button" class="sq" data-d="${d}"><span class="cr"></span><span class="cf"></span><span class="pc"></span></button>`).join('')}</div>
      <div class="axprom" id="axProm" hidden></div></div>
    <div class="axcap" id="axCapB"></div>
    <div class="axest" id="axEst" aria-live="polite"></div>
    <details class="axjug" open><summary>📜 Jugadas</summary><ol class="axlista" id="axLista"></ol></details></div>`;
  celdas = [...c.querySelectorAll('.sq')];
  const tab = c.querySelector('#axTab');
  tab.addEventListener('pointerdown', pDown); tab.addEventListener('pointermove', pMove);
  tab.addEventListener('pointerup', pUp); tab.addEventListener('pointercancel', pCancel);
  tab.addEventListener('click', e => { if (e.detail === 0) { const b = e.target.closest('.sq'); if (b) tocar(casillaDe(+b.dataset.d)); } });   // teclado (Intro)
  c.querySelector('#axProm').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const m = b.dataset.m; ocultarProm(); if (m) ctxR.jugar(+m); else repintar();
  });
}

/* ---------- interacción ---------- */
function tocar(sq) {
  if (!eAct || !ctxR.puedeJugar() || prom) return;
  if (sel != null) {
    const cands = legal.filter(m => de(m) === sel && a(m) === sq);
    if (cands.length > 1) return mostrarProm(cands);
    if (cands.length === 1) { sel = null; ctxR.jugar(cands[0]); return; }
  }
  const p = eAct.b[sq];
  if (p && color(p) === eAct.turn && legal.some(m => de(m) === sq)) { sel = sel === sq ? null : sq; ctxR.sonido('click'); }
  else { if (p && color(p) === eAct.turn) ctxR.sonido('error'); sel = null; }
  repintar();
}
function pDown(e) {
  if (e.button > 0) return;
  const b = e.target.closest('.sq'); if (!b) return;
  arr = { sq: casillaDe(+b.dataset.d), x: e.clientX, y: e.clientY, ghost: null, id: e.pointerId };
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignorar */ }
}
function pMove(e) {
  if (!arr || e.pointerId !== arr.id) return;
  if (!arr.ghost) {
    if (Math.hypot(e.clientX - arr.x, e.clientY - arr.y) < 8) return;
    const p = eAct && eAct.b[arr.sq];
    if (!p || color(p) !== eAct.turn || !ctxR.puedeJugar() || prom || !legal.some(m => de(m) === arr.sq)) { arr = null; return; }
    sel = arr.sq; repintar();
    const g = document.createElement('div'); g.className = 'axghost';                    // dentro del juego: hereda los colores de 🎨 Apariencia
    g.style.setProperty('--tam', celdas[0].getBoundingClientRect().width + 'px'); g.innerHTML = piezaHTML(p);
    cont.append(g); arr.ghost = g;
    celdas.forEach(c => c.classList.toggle('orig', casillaDe(+c.dataset.d) === arr.sq));
  }
  arr.ghost.style.left = e.clientX + 'px'; arr.ghost.style.top = e.clientY + 'px';
  const bajo = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.sq');
  celdas.forEach(c => c.classList.toggle('sobre', c === bajo));
}
function pUp(e) {
  if (!arr || e.pointerId !== arr.id) return;
  const d = arr; arr = null;
  if (!d.ghost) { tocar(d.sq); return; }
  d.ghost.remove(); celdas.forEach(c => c.classList.remove('sobre', 'orig'));
  const bajo = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.sq');
  if (bajo) { const sq = casillaDe(+bajo.dataset.d); if (sq !== d.sq) { tocar(sq); return; } }
  repintar();
}
function pCancel() { if (arr && arr.ghost) arr.ghost.remove(); arr = null; celdas.forEach(c => c.classList.remove('sobre', 'orig')); }
function mostrarProm(cands) {
  prom = cands; const s = eAct.turn === 2 ? 8 : 0;
  const el = cont.querySelector('#axProm');
  el.innerHTML = `<div class="axpc"><b>Coronar el peón</b><div class="axpo">${cands.slice().sort((x, y) => coronacion(y) - coronacion(x)).map(m => `<button type="button" data-m="${m}" aria-label="${NOMBRE_PIEZA[coronacion(m)]}">${piezaHTML(coronacion(m) | s)}<small>${NOMBRE_PIEZA[coronacion(m)]}</small></button>`).join('')}</div><button type="button" class="btn" data-cancel>Cancelar</button></div>`;
  el.hidden = false; ctxR.sonido('click');
  el.querySelector('button').focus({ preventScroll: true });
}
function ocultarProm() { prom = null; sel = null; const el = cont && cont.querySelector('#axProm'); if (el) { el.hidden = true; el.innerHTML = ''; } }

/* ---------- pintado ---------- */
const repintar = () => { if (eAct && ctxR) pintar(eAct, ctxR); };
function pintar(e, ctx) {
  if (!cont || !celdas.length) return;
  ctxR = ctx;
  if (e !== eAct) {
    eAct = e; sel = null; if (prom) ocultarProm();
    legal = e.fin ? [] : jugadas(e);
    const piezas = e.b.filter(Boolean).length;
    if (cuentaAnt >= 0 && piezas < cuentaAnt && e.n > 0) ctx.sonido('captura');
    cuentaAnt = piezas;
  }
  flip = ctx.modo() === 'cpu' && ctx.yo() === 2;
  const jq = e.fin && e.fin.motivo !== 'Jaque mate' ? -1 : jaque(e), marcas = (ctx.valores().marcas || 'si') === 'si';
  const destinos = new Map(); if (sel != null) legal.filter(m => de(m) === sel).forEach(m => destinos.set(a(m), true));
  const pd = ctx.pista != null ? de(ctx.pista) : -1, pa = ctx.pista != null ? a(ctx.pista) : -1, ult = e.ult || [];
  const puede = ctx.puedeJugar();
  celdas.forEach((c, d) => {
    const sq = casillaDe(d), r = sq >> 3, f = sq & 7, p = e.b[sq];
    const cls = 'sq ' + ((r + f) & 1 ? 'osc' : 'cla') + (ult.includes(sq) ? ' ult' : '') + (sel === sq ? ' sel' : '') + (destinos.has(sq) && marcas ? (p || (e.ep === sq && (e.b[sel] & 7) === 1) ? ' dcap' : ' dest') : '')
      + (destinos.has(sq) && !marcas ? ' dsin' : '') + (jq === sq ? ' jaque' : '') + (sq === pd || sq === pa ? ' pista' : '') + (puede && p && color(p) === e.turn ? ' mia' : '');
    if (c.className !== cls) c.className = cls;
    const pc = c.lastElementChild, k = String(p);
    if (pc.dataset.p !== k) { pc.innerHTML = p ? piezaHTML(p) : ''; pc.dataset.p = k; }
    c.children[0].textContent = (d & 7) === 0 ? String(8 - r) : '';
    c.children[1].textContent = (d >> 3) === 7 ? 'abcdefgh'[f] : '';
    c.setAttribute('aria-label', `${'abcdefgh'[f]}${8 - r}${p ? ', ' + NOMBRE_PIEZA[p & 7] + (p >> 3 ? ' negro' : ' blanco') : ''}${sq === jq ? ', en jaque' : ''}`);
  });
  cont.querySelector('#axTab').classList.toggle('on', puede);
  // piezas capturadas y ventaja de material
  const cuenta = [[0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0]], mat = [0, 0];
  e.b.forEach(p => { if (p) { cuenta[p >> 3][p & 7]++; mat[p >> 3] += VALOR[p & 7]; } });
  const comidas = s => [5, 4, 3, 2, 1].map(t => (GLIFO[t] ? `<span class="pz ${s ? 'n' : 'b'}">${GLIFO[t]}</span>`.repeat(Math.max(0, INICIALES[t] - cuenta[s][t])) : '')).join('');
  const abajo = flip ? 1 : 0, arriba = abajo ^ 1, dif = mat[abajo] - mat[arriba];
  cont.querySelector('#axCapA').innerHTML = comidas(abajo) + (dif < 0 ? `<b>+${-dif}</b>` : '');
  cont.querySelector('#axCapB').innerHTML = comidas(arriba) + (dif > 0 ? `<b>+${dif}</b>` : '');
  // estado
  const est = cont.querySelector('#axEst');
  est.className = 'axest' + (e.fin ? ' fin' : jq >= 0 ? ' jq' : '');
  est.textContent = e.fin ? `${e.fin.motivo}${e.fin.w ? ` · ganan las ${e.fin.w === 1 ? 'blancas' : 'negras'}` : ' · tablas'}` : jq >= 0 ? '¡Jaque!' : e.n ? '' : 'Mueven las blancas';
  // lista de jugadas
  const lista = cont.querySelector('#axLista'), base = e.n - e.san.length;
  const html = [];
  for (let i = 0; i < e.san.length; i++) {
    const nj = base + i;
    if (nj % 2 === 0 || i === 0) html.push(`<li value="${(nj >> 1) + 1}">${nj % 2 ? '<span class="vac">…</span>' : ''}`);
    html.push(`<span class="${i === e.san.length - 1 ? 'ultj' : ''}">${esc(e.san[i])}</span>`);
    if (nj % 2 === 1 || i === e.san.length - 1) html.push('</li>');
  }
  const nuevo = html.join('') || '<li class="vacio">Aún no hay jugadas.</li>';
  if (lista.dataset.k !== String(e.san.length)) { lista.innerHTML = nuevo; lista.dataset.k = e.san.length; lista.scrollTop = lista.scrollHeight; }
}

const duelo = crearDuelo({
  id: 'ajedrez', css: new URL('./ajedrez.css', import.meta.url), variantes: VARIANTES, nombres: ['Blancas', 'Negras'],
  chip: n => `<i class="ch axch${n}">${GLIFO[6]}</i>`,
  aspecto: [
    { clave: 'tablero', titulo: 'Colores del tablero', def: 'madera', opciones: [{ id: 'madera', nombre: 'Madera', sw: ['#F0D9B5', '#B58863'] }, { id: 'torneo', nombre: 'Torneo', sw: ['#EEEED2', '#769656'] }, { id: 'oceano', nombre: 'Océano', sw: ['#E4EDFF', '#5B7FD6'] }, { id: 'uva', nombre: 'Uva', sw: ['#F3E8FF', '#8B5CF6'] }, { id: 'noche', nombre: 'Noche', sw: ['#4A5486', '#232A55'] }] },
    { clave: 'piezas', titulo: 'Colores de las piezas', def: 'clasicas', opciones: [{ id: 'clasicas', nombre: 'Blancas y negras', sw: ['#FFFFFF', '#1E1E24'] }, { id: 'marfil', nombre: 'Marfil y ébano', sw: ['#FFF4DC', '#4A2E17'] }, { id: 'colores', nombre: 'Oro y morado', sw: ['#FFD43B', '#5B2DD4'] }] },
    { clave: 'marcas', titulo: 'Marcar las casillas posibles', def: 'si', opciones: [{ id: 'si', nombre: 'Sí' }, { id: 'no', nombre: 'No' }] },
  ],
  estadoInicial, jugadas, aplicar, validarEstado, ia, reglasHTML, rendirse, vista: { montar, pintar },
});
export const { mount, validar, resumen } = duelo;
export function unmount() { pCancel(); cont = null; celdas = []; eAct = null; ctxR = null; return duelo.unmount(); }
export const migrarV1 = d => d;
