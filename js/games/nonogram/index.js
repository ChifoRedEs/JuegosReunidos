import { $, esc, esperar, fmtTiempo, rnd } from '../../core/dom.js';
import { Pila } from '../../core/undo.js';
import { Cronometro } from '../../core/cronometro.js';
import { SIZES, DENS, runs, colsOf, generarAleatorio } from './solver.js';

const LVL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
const NCELL = { 5: 52, 10: 34, 15: 26, 20: 20 }, NFONT = { 5: 14, 10: 12, 15: 11, 20: 10 };
let N = null, api = null, hist = null, crono = null, modo = 'f', tipo = 'azar', banco = null, ocupado = false, rootEl = null;
let cel = [], rcEl = [], ccEl = [], drag = null, activo = null;
const vacia = n => Array.from({ length: n }, () => Array(n).fill(0));
const copia = g => g.map(r => r.slice());

/* ---------- validación / migración ---------- */
const grid = (g, n, vals) => Array.isArray(g) && g.length === n && g.every(r => Array.isArray(r) && r.length === n && r.every(v => vals.includes(v)));
export function validar(d) {
  if (!d || typeof d !== 'object' || !SIZES.includes(d.n) || !grid(d.sol, d.n, [0, 1]) || !grid(d.cur, d.n, [0, 1, 2])) return null;
  return { n: d.n, diff: Object.hasOwn(LVL, d.diff) ? d.diff : 'medio', sol: copia(d.sol), cur: copia(d.cur), nombre: typeof d.nombre === 'string' ? d.nombre.slice(0, 40) : '',
    t: Number.isInteger(d.t) && d.t >= 0 ? d.t : 0 };
}
export const migrarV1 = d => d;
const completo = d => { const rc = d.sol.map(runs), cc = colsOf(d.sol, d.n).map(runs), cu = d.cur.map(r => r.map(v => v === 1 ? 1 : 0)); return cu.every((r, i) => same(runs(r), rc[i])) && colsOf(cu, d.n).every((c, j) => same(runs(c), cc[j])); };
const same = (a, b) => a.join() === b.join();
export function resumen(d) {
  const ok = completo(d), base = `${d.n}×${d.n}`;
  return { texto: ok ? `Completado · ${base}${d.nombre ? ' · ' + d.nombre : ''}` : `${base} · ${d.nombre ? 'Dibujo' : LVL[d.diff]}`, fin: ok };
}

/* ---------- ciclo de vida ---------- */
export async function mount(root, a) {
  api = a; rootEl = root; hist = new Pila(200); modo = 'f'; ocupado = false; drag = null;
  tipo = api.pref('tipo', 'azar');
  await api.css(new URL('./nonogram.css', import.meta.url));
  const g = api.cargar();
  N = g ? { ...g, rc: g.sol.map(runs), cc: colsOf(g.sol, g.n).map(runs), done: completo(g) } : null;
  root.innerHTML = `
    <div class="bar"><span class="lbl">Tamaño</span>${SIZES.map(s => `<button class="btn" data-size="${s}">${s}×${s}</button>`).join('')}</div>
    <div class="bar"><span class="lbl">Tipo</span><button class="btn" data-tipo="azar">Aleatorio</button><button class="btn" data-tipo="dibujo">Dibujo</button></div>
    <div class="bar" id="ngDifBar"><span class="lbl">Dificultad</span>${Object.entries(LVL).map(([k, l]) => `<button class="btn" data-diff="${k}">${l}</button>`).join('')}</div>
    <div class="bar"><button class="btn" data-m="f">■ Rellenar</button><button class="btn" data-m="x">✕ Marcar vacía</button><button class="btn" data-ac="undo">↶ Deshacer</button></div>
    <div class="info"><span class="mut">Arrastra para pintar · mantén pulsado para el otro modo</span><span id="ngCrono">0:00</span></div>
    <div class="ngwrap"><div class="ng" id="ngTab"></div></div>
    <div class="msg" id="ngMsg" role="status" aria-live="polite"></div>
    <div class="bar"><button class="btn" data-ac="nuevo">Nuevo panel</button><button class="btn" data-ac="borrar">Borrar casillas</button></div>`;
  root.addEventListener('click', clic);
  root.addEventListener('pointerdown', pDown); root.addEventListener('pointermove', pMove);
  root.addEventListener('pointerup', pUp); root.addEventListener('pointercancel', pUp);
  api.menu([
    { texto: 'Nuevo panel', accion: () => nuevo(N.n, N.diff) },
    { texto: 'Borrar casillas', accion: borrar, peligro: true },
    { texto: 'Reglas', accion: reglas },
  ]);
  crono = new Cronometro(() => { if (N) { N.t = crono.s; $('#ngCrono').textContent = fmtTiempo(crono.s); if (crono.s % 15 === 0) guardar(); } });
  if (!N) await nuevo(10, 'medio', true); else { construir(); arrancar(); pintar(); }
}
export function unmount() {
  if (N && crono) { N.t = crono.s; guardar(); }
  if (crono) crono.detener();
  if (rootEl) { rootEl.removeEventListener('click', clic); rootEl.removeEventListener('pointerdown', pDown); rootEl.removeEventListener('pointermove', pMove); rootEl.removeEventListener('pointerup', pUp); rootEl.removeEventListener('pointercancel', pUp); }
  if (drag) clearTimeout(drag.lp);
  N = null; crono = null; cel = []; rcEl = []; ccEl = []; drag = null;
}
function arrancar() { crono.s = N.t; if (!N.done) crono.iniciar(); else crono.detener(); $('#ngCrono').textContent = fmtTiempo(N.t); }

/* ---------- partida ---------- */
const hayProgreso = () => N && !N.done && N.cur.some(r => r.some(v => v));
async function cargarBanco() {
  if (banco) return banco;
  try { const r = await fetch(new URL('../../../data/nonogramas/pixelart.json', import.meta.url)); banco = await r.json(); } catch { banco = {}; }
  return banco;
}
async function nuevo(n, diff, forzar = false, nuevoTipo = tipo) {
  if (ocupado) return;
  if (!forzar && hayProgreso() && !api.confirmar('¿Empezar un panel nuevo? Perderás el progreso actual.')) return;
  ocupado = true; if (crono) crono.detener();
  const m = $('#ngMsg'); m.className = 'msg'; m.textContent = 'Generando panel…';
  await esperar(20);
  let p = null, nombre = '';
  if (nuevoTipo === 'dibujo') {
    const b = await cargarBanco(), lista = b[n] || [];
    if (lista.length) {
      const otros = lista.filter(x => !N || x.nombre !== N.nombre), d = (otros.length ? otros : lista)[rnd((otros.length ? otros : lista).length)];
      const sol = d.filas.map(f => [...f].map(c => c === '#' ? 1 : 0)); p = { sol, rc: sol.map(runs), cc: colsOf(sol, n).map(runs) }; nombre = d.nombre;
    } else api.aviso(`No hay dibujos de ${n}×${n}: panel aleatorio.`);
  }
  if (!p) p = await generarAleatorio(n, diff);
  N = { n, diff, sol: p.sol, rc: p.rc, cc: p.cc, cur: vacia(n), nombre, t: 0, done: false };
  tipo = nombre ? 'dibujo' : 'azar'; api.setPref('tipo', tipo);
  hist.vaciar(); ocupado = false;
  crono = new Cronometro(crono ? crono.alTick : () => {}, 0);
  construir(); arrancar(); pintar(); guardar();
}
function borrar() {
  if (!N || N.done || !hayProgreso() || !api.confirmar('¿Borrar todas las casillas?')) return;
  hist.push(copia(N.cur)); N.cur = vacia(N.n); pintar(); guardar();
}
function deshacer() {
  if (!N || N.done) return;
  const h = hist.pop(); if (!h) { api.aviso('Nada que deshacer'); return; }
  N.cur = h; pintar(); guardar();
}
function guardar() {
  if (!N) return;
  const d = { n: N.n, diff: N.diff, sol: N.sol, cur: N.cur, nombre: N.nombre, t: N.t };
  const r = resumen(d); api.guardar(d, r.texto, r.fin);
}

/* ---------- pintado: la cuadrícula se construye una vez por panel y luego se parchea ---------- */
function construir() {
  const n = N.n, fs = NFONT[n];
  const clueW = Math.max(...N.rc.map(r => r.reduce((s, x) => s + String(x).length * fs * .62 + 4, 0))) + 8;
  const tab = $('#ngTab');
  tab.style.cssText = `--n:${n};--fs:${fs}px;--cs:max(14px,min(calc((min(100vw,520px) - 28px - ${Math.round(clueW)}px) / ${n}),${NCELL[n]}px))`;
  let h = '<div></div>' + N.cc.map(c => `<div class="cc">${c.map(x => `<span>${x}</span>`).join('')}</div>`).join('');
  for (let i = 0; i < n; i++) {
    h += `<div class="rc">${N.rc[i].map(x => `<span>${x}</span>`).join('')}</div>`;
    for (let j = 0; j < n; j++) h += `<button type="button" class="c ${j % 5 === 4 && j < n - 1 ? 'm5' : ''} ${i % 5 === 4 && i < n - 1 ? 'b5' : ''}" data-i="${i}" data-j="${j}" aria-label="Fila ${i + 1}, columna ${j + 1}"></button>`;
  }
  tab.innerHTML = h;
  ccEl = [...tab.querySelectorAll('.cc')]; rcEl = [...tab.querySelectorAll('.rc')];
  const bs = [...tab.querySelectorAll('.c')]; cel = Array.from({ length: n }, (_, i) => bs.slice(i * n, i * n + n));
  document.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('on', +b.dataset.size === n));
  document.querySelectorAll('[data-diff]').forEach(b => b.classList.toggle('on', b.dataset.diff === N.diff));
}
function pintarCelda(i, j) {
  const v = N.cur[i][j], b = cel[i][j];
  b.classList.toggle('f', v === 1);
  const t = v === 2 ? '✕' : ''; if (b.textContent !== t) b.textContent = t;
  b.setAttribute('aria-label', `Fila ${i + 1}, columna ${j + 1}, ${v === 1 ? 'rellena' : v === 2 ? 'marcada vacía' : 'sin marcar'}`);
}
function pintar() {
  if (!N) return;
  const n = N.n, cu = N.cur.map(r => r.map(v => v === 1 ? 1 : 0));
  for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) pintarCelda(i, j); rcEl[i].classList.toggle('ok', same(runs(cu[i]), N.rc[i])); }
  const cols = colsOf(cu, n); ccEl.forEach((e, j) => e.classList.toggle('ok', same(runs(cols[j]), N.cc[j])));
  const ok = completo(N);
  if (ok && !N.done) {
    N.done = true; crono.detener(); N.t = crono.s;
    api.registrar({ res: 'victoria', tiempo: N.t, variante: `${n}×${n}` });
    api.sonido('ganar'); api.vibrar([60, 40, 60]); guardar();
  }
  $('#ngTab').classList.toggle('ganado', N.done);
  document.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === modo));
  document.querySelectorAll('[data-tipo]').forEach(b => { b.classList.toggle('on', b.dataset.tipo === tipo); });
  $('#ngDifBar').style.opacity = tipo === 'dibujo' && N.nombre ? .45 : 1;
  const m = $('#ngMsg'); m.className = 'msg' + (N.done ? ' win' : '');
  m.textContent = N.done ? `¡Completado en ${fmtTiempo(N.t)}!${N.nombre ? ` Era: ${N.nombre}.` : ''}` : 'Las pistas tachadas ya están cumplidas.';
  $('#ngCrono').textContent = fmtTiempo(N.t);
}

/* ---------- entrada: tocar, arrastrar y mantener pulsado ---------- */
function setCelda(i, j, v) { if (N.cur[i][j] === v) return false; N.cur[i][j] = v; pintarCelda(i, j); return true; }
function activar(i, j) {
  if (activo) { rcEl[activo[0]].classList.remove('act'); ccEl[activo[1]].classList.remove('act'); cel[activo[0]].forEach(b => b.classList.remove('ha')); cel.forEach(r => r[activo[1]].classList.remove('ha')); activo = null; }
  if (i == null) return;
  activo = [i, j]; rcEl[i].classList.add('act'); ccEl[j].classList.add('act'); cel[i].forEach(b => b.classList.add('ha')); cel.forEach(r => r[j].classList.add('ha'));
}
const celdaEn = (x, y) => { const b = document.elementFromPoint(x, y)?.closest?.('.c'); return b && $('#ngTab').contains(b) ? [+b.dataset.i, +b.dataset.j] : null; };
function pDown(e) {
  const b = e.target.closest?.('.c'); if (!b || !N || N.done || e.button > 0) return;
  e.preventDefault(); try { b.setPointerCapture?.(e.pointerId); } catch { /* ignorar */ }
  const i = +b.dataset.i, j = +b.dataset.j, objetivo = modo === 'f' ? 1 : 2, alterno = modo === 'f' ? 2 : 1, prev = N.cur[i][j];
  hist.push(copia(N.cur));
  drag = { i0: i, j0: j, val: prev === objetivo ? 0 : objetivo, eje: null, mov: false, bloqueado: false, cambio: false, snap: hist.length };
  drag.cambio = setCelda(i, j, drag.val); activar(i, j);
  drag.lp = setTimeout(() => {          // pulsación larga: el valor "alterno" (✕ en modo rellenar, ■ en modo ✕)
    if (!drag || drag.mov) return;
    drag.bloqueado = true; setCelda(i, j, prev === alterno ? 0 : alterno); drag.cambio = true; api.vibrar(25); pintarEstado();
  }, 380);
}
function pMove(e) {
  if (!drag || drag.bloqueado || !N) return;
  const c = celdaEn(e.clientX, e.clientY); if (!c) return;
  const [i, j] = c;
  if (!drag.eje) {
    if (i === drag.i0 && j === drag.j0) return;
    drag.eje = i === drag.i0 ? 'fila' : j === drag.j0 ? 'col' : null; if (!drag.eje) return;
    drag.mov = true; clearTimeout(drag.lp);
  }
  if ((drag.eje === 'fila' && i !== drag.i0) || (drag.eje === 'col' && j !== drag.j0)) return;
  if (setCelda(i, j, drag.val)) drag.cambio = true;
  activar(i, j);
}
function pUp() {
  if (!drag) return;
  clearTimeout(drag.lp);
  const d = drag; drag = null; activar(null);
  if (!d.cambio) hist.pop();                    // gesto sin efecto: no ensucia el historial
  else { api.sonido('click'); pintarEstado(); }
}
function pintarEstado() { pintar(); guardar(); }
function clic(e) {
  const b = e.target.closest('button'); if (!b || !N) return;
  if (b.classList.contains('c')) {              // teclado (Enter/Espacio): detail === 0
    if (e.detail !== 0 || N.done) return;
    const i = +b.dataset.i, j = +b.dataset.j, t = modo === 'f' ? 1 : 2;
    hist.push(copia(N.cur)); N.cur[i][j] = N.cur[i][j] === t ? 0 : t; pintarCelda(i, j); pintarEstado(); return;
  }
  if (b.dataset.size) return nuevo(+b.dataset.size, N.diff);
  if (b.dataset.diff) return nuevo(N.n, b.dataset.diff, false, 'azar');
  if (b.dataset.tipo) { if (b.dataset.tipo === tipo) return; return nuevo(N.n, N.diff, false, b.dataset.tipo); }
  if (b.dataset.m) { modo = b.dataset.m; return pintar(); }
  const ac = b.dataset.ac;
  if (ac === 'undo') deshacer(); else if (ac === 'nuevo') nuevo(N.n, N.diff); else if (ac === 'borrar') borrar();
}
function reglas() {
  api.modal('Nonogram', `<ul>
    <li>Los números de cada fila y columna indican cuántas casillas rellenas seguidas hay y en qué orden.</li>
    <li>Entre dos grupos hay al menos una casilla vacía.</li>
    <li><b>Arrastra</b> el dedo por una fila o columna para pintar de golpe. <b>Mantén pulsado</b> una casilla para poner ✕ (o ■ si estás en modo ✕).</li>
    <li>Las pistas se <b>tachan</b> cuando esa línea ya está bien.</li>
    <li>Los paneles aleatorios se resuelven siempre por lógica; el modo <b>Dibujo</b> usa imágenes hechas a mano (5×5 y 10×10).</li></ul>`);
}
