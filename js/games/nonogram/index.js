import { $, esperar, fmtTiempo, rnd } from '../../core/dom.js';
import { Pila } from '../../core/undo.js';
import { Cronometro } from '../../core/cronometro.js';
import { grupoTableroDN } from '../../core/aspectos.js';
import { variablesTintadas } from '../../core/tinte.js';
import { SIZES, panelDe, pistasMax, runs, colsOf, generarAleatorio } from './solver.js';

const COLORES = [['azul', 'Azul', '#2F6BFF'], ['rojo', 'Rojo', '#E5383B'], ['naranja', 'Naranja', '#FF7A1A'], ['amarillo', 'Amarillo', '#F2B600'], ['verde', 'Verde', '#0FB56A'], ['turquesa', 'Turquesa', '#0FA3B1'], ['violeta', 'Violeta', '#7A4DFF'], ['rosa', 'Rosa', '#FF3FA4'], ['marron', 'Marrón', '#8B5A2B'], ['grafito', 'Grafito', '#4A5568']];
const LVL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
const MAX_DESHACER = 40, RETO = { n: 10, diff: 'medio' };
let malas = new Set(), asp = null, N = null, api = null, hist = null, crono = null, modo = 'f', tipo = 'azar', banco = null, ocupado = false, rootEl = null;
let cel = [], rcEl = [], ccEl = [], drag = null, activo = null;
const vacia = n => Array.from({ length: n }, () => Array(n).fill(0));
const copia = g => g.map(r => r.slice());

/* ---------- validación / migración ---------- */
const grid = (g, n, vals) => Array.isArray(g) && g.length === n && g.every(r => Array.isArray(r) && r.length === n && r.every(v => vals.includes(v)));
export function validar(d) {
  if (!d || typeof d !== 'object' || !SIZES.includes(d.n) || !grid(d.sol, d.n, [0, 1]) || !grid(d.cur, d.n, [0, 1, 2])) return null;
  return { n: d.n, diff: Object.hasOwn(LVL, d.diff) ? d.diff : 'medio', sol: copia(d.sol), cur: copia(d.cur), nombre: typeof d.nombre === 'string' ? d.nombre.slice(0, 40) : '',
    t: Number.isInteger(d.t) && d.t >= 0 ? d.t : 0, pistas: Number.isInteger(d.pistas) && d.pistas >= 0 ? d.pistas : 0,
    hist: Array.isArray(d.hist) ? d.hist.filter(h => grid(h, d.n, [0, 1, 2])).slice(-MAX_DESHACER).map(copia) : [],
    reto: typeof d.reto === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.reto) ? d.reto : null };
}
export const migrarV1 = d => d;
const completo = d => { const rc = d.sol.map(runs), cc = colsOf(d.sol, d.n).map(runs), cu = d.cur.map(r => r.map(v => v === 1 ? 1 : 0)); return cu.every((r, i) => same(runs(r), rc[i])) && colsOf(cu, d.n).every((c, j) => same(runs(c), cc[j])); };
const same = (a, b) => a.join() === b.join();
export function resumen(d) {
  const ok = completo(d), base = `${d.n}×${d.n}`;
  const pre = d.reto ? '📅 Reto · ' : '';
  return { texto: pre + (ok ? `Completado · ${base}${d.nombre ? ' · ' + d.nombre : ''}` : `${base} · ${d.nombre ? 'Dibujo' : LVL[d.diff]}`), fin: ok };
}

/* ---------- ciclo de vida ---------- */
export async function mount(root, a) {
  api = a; rootEl = root;
  const tintar = () => { const hex = (COLORES.find(c => c[0] === (asp && asp.valores.relleno)) || COLORES[0])[2]; variablesTintadas(root, [['--ng-img', 'img/celdas/c-bisel.webp', hex], ['--ng-img-ok', 'img/celdas/c-bisel.webp', '#0FB56A']], 'ng' + hex); };
  asp = api.aspecto([grupoTableroDN(),
    { clave: 'relleno', titulo: 'Colores', desplegable: true, def: 'azul', opciones: COLORES.map(([id, nombre, hex]) => ({ id, nombre, sw: [hex] })) },
    { clave: 'forma', titulo: 'Forma de las casillas rellenas', def: 'redondeado', opciones: [{ id: 'redondeado', nombre: '▢ Redondeada' }, { id: 'cuadrado', nombre: '■ Cuadrada' }, { id: 'circulo', nombre: '● Círculo' }, { id: 'estrella', nombre: '★ Estrella' }, { id: 'corazon', nombre: '♥ Corazón' }] }], tintar);
  tintar();
  modo = 'f'; ocupado = false; drag = null;
  tipo = api.pref('tipo', 'azar');
  await api.css(new URL('./nonogram.css', import.meta.url));
  const g = api.cargar();
  N = g ? { ...g, rc: g.sol.map(runs), cc: colsOf(g.sol, g.n).map(runs), done: completo(g) } : null;
  hist = new Pila(MAX_DESHACER, g ? g.hist : []);
  root.innerHTML = `<div id="ngReto"></div>
    <div class="info"><span class="mut">Toca: rellenar → ✕ → limpiar · arrastra para pintar una línea</span><span id="ngCrono">0:00</span></div>
    <div class="ngwrap"><div class="ng" id="ngTab"></div></div>
    <div class="msg" id="ngMsg" role="status" aria-live="polite"></div>
    <div class="pad pad4" id="ngAcc"><button type="button" class="acc" data-ac="m" aria-pressed="false">⬛ Rellenar</button><button type="button" class="acc" data-ac="undo">↶ Deshacer</button><button type="button" class="acc" data-ac="pista">💡 Pista</button><button type="button" class="acc" data-ac="comprobar">✔ Comprobar</button></div>${api.barraHtml()}`;
  $('#ngAcc').addEventListener('click', e => { const b = e.target.closest('[data-ac]'); if (!b) return; e.stopPropagation(); if (b.disabled) return; const id = b.dataset.ac;
    if (id === 'm') { modo = modo === 'f' ? 'x' : 'f'; pintar(); } else if (id === 'undo') deshacer(); else if (id === 'pista') pista(); else if (id === 'comprobar') comprobar(); });
  root.addEventListener('click', clic);
  root.addEventListener('pointerdown', pDown); root.addEventListener('pointermove', pMove);
  root.addEventListener('pointerup', pUp); root.addEventListener('pointercancel', pUp);
  api.barra({ nueva: () => nuevo(N.n, N.diff),
    salir: () => { location.hash = '#/cat/logica'; },
    crono: () => crono,
    config: { valores: () => ({ n: N.n, diff: N.diff, tipo }), grupos: v => [{ clave: 'n', titulo: 'Tamaño', opciones: SIZES.map(x => [x, `${x}×${x}`]) }, { clave: 'tipo', titulo: 'Tipo', opciones: [['azar', 'Aleatorio'], ['dibujo', 'Dibujo']] }, { clave: 'diff', titulo: 'Dificultad', visible: v.tipo !== 'dibujo', opciones: Object.entries(LVL) }], aplicar: v => nuevo(v.n, v.diff, true, v.tipo) } });
  api.menu([
    { texto: 'Nuevo panel', accion: () => nuevo(N.n, N.diff) },
    { texto: '📅 Reto del día', accion: () => nuevo(RETO.n, RETO.diff, false, 'azar', true) },
    { texto: 'Borrar casillas', accion: borrar, peligro: true },
    { texto: '🎨 Apariencia', accion: () => asp.abrir() },
    { texto: '📖 Reglas', accion: reglas },
  ]);
  crono = new Cronometro(() => { if (N) { N.t = crono.s; $('#ngCrono').textContent = fmtTiempo(crono.s); if (crono.s % 15 === 0) guardar(); } });
  if (!N) await nuevo(10, 'medio', true); else { construir(); arrancar(); pintar(); }
}
export function unmount() {
  if (N && crono) { N.t = crono.s; guardar(); }
  if (crono) crono.detener();
  if (rootEl) { rootEl.removeEventListener('click', clic); rootEl.removeEventListener('pointerdown', pDown); rootEl.removeEventListener('pointermove', pMove); rootEl.removeEventListener('pointerup', pUp); rootEl.removeEventListener('pointercancel', pUp); }
  if (ro) { ro.disconnect(); ro = null; }
  malas = new Set(); N = null; crono = null; cel = []; rcEl = []; ccEl = []; drag = null;
}
function arrancar() { crono.s = N.t; if (!N.done) crono.iniciar(); else crono.detener(); $('#ngCrono').textContent = fmtTiempo(N.t); }

/* ---------- partida ---------- */
const hayProgreso = () => N && !N.done && N.cur.some(r => r.some(v => v));
async function cargarBanco() {
  if (banco) return banco;
  try { const r = await fetch(new URL('../../../data/nonogramas/pixelart.json', import.meta.url)); banco = await r.json(); } catch { banco = {}; }
  return banco;
}
async function nuevo(n, diff, forzar = false, nuevoTipo = tipo, reto = false) {
  if (ocupado) return;
  if (reto && N && N.reto === api.reto.fecha()) { api.aviso(N.done ? 'Ya has completado el reto de hoy' : 'Ya estás jugando el reto de hoy'); return; }
  if (reto) nuevoTipo = 'azar';
  if (!forzar && hayProgreso() && !await api.confirmar('¿Empezar un panel nuevo? Perderás el progreso actual.')) return;
  ocupado = true; if (crono) crono.detener();
  const m = $('#ngMsg'); m.className = 'msg'; m.textContent = 'Generando panel…';
  await esperar(20);
  let p = null, nombre = '';
  if (nuevoTipo === 'dibujo') {
    const b = await cargarBanco(), lista = (b[n] || []).filter(x => { const f = x.filas.map(r => [...r].map(c => c === '#' ? 1 : 0)); return pistasMax(f.map(runs), colsOf(f, n).map(runs)) <= panelDe(n, diff); });
    if (lista.length) {
      const otros = lista.filter(x => !N || x.nombre !== N.nombre), d = (otros.length ? otros : lista)[rnd((otros.length ? otros : lista).length)];
      const sol = d.filas.map(f => [...f].map(c => c === '#' ? 1 : 0)); p = { sol, rc: sol.map(runs), cc: colsOf(sol, n).map(runs) }; nombre = d.nombre;
    } else api.aviso(`No hay dibujos de ${n}×${n}: panel aleatorio.`);
  }
  if (!p) p = reto ? await api.reto.generarAsync(() => generarAleatorio(n, diff)) : await generarAleatorio(n, diff);
  N = { n, diff, sol: p.sol, rc: p.rc, cc: p.cc, cur: vacia(n), nombre, t: 0, pistas: 0, done: false, reto: reto ? api.reto.fecha() : null };
  tipo = nombre ? 'dibujo' : 'azar'; api.setPref('tipo', tipo);
  hist.vaciar(); ocupado = false;
  crono = new Cronometro(crono ? crono.alTick : () => {}, 0);
  construir(); arrancar(); pintar(); guardar();
}
async function borrar() {
  if (!N || N.done || !hayProgreso() || !await api.confirmar('¿Borrar todas las casillas?')) return;
  hist.push(copia(N.cur)); N.cur = vacia(N.n); pintar(); guardar();
}
function deshacer() {
  if (!N || N.done) return;
  const h = hist.pop(); if (!h) { api.aviso('Nada que deshacer'); return; }
  N.cur = h; pintar(); guardar();
}
function pista() {
  if (!N || N.done) return;
  const malas = [];
  for (let i = 0; i < N.n; i++) for (let j = 0; j < N.n; j++) { const v = N.cur[i][j], q = N.sol[i][j]; if (q ? v !== 1 : v === 1) malas.push([i, j]); }
  if (!malas.length) return;
  const [i, j] = malas[rnd(malas.length)];
  hist.push(copia(N.cur)); N.cur[i][j] = N.sol[i][j] ? 1 : 2; N.pistas = (N.pistas || 0) + 1;
  api.sonido('ok'); pintarEstado();
}
function guardar() {
  if (!N) return;
  const d = { n: N.n, diff: N.diff, sol: N.sol, cur: N.cur, nombre: N.nombre, t: N.t, pistas: N.pistas || 0, reto: N.reto || null, hist: hist ? hist.toJSON().slice(-MAX_DESHACER) : [] };
  const r = resumen(d); api.guardar(d, r.texto, r.fin);
}

/* ---------- pintado: la cuadrícula se construye una vez por panel y luego se parchea ---------- */
let need = 3, ro = null, okPrev = { r: new Set(), c: new Set() };
const SEP = 2, GAP = 2, PWMAX = 26;   // SEP: hueco extra entre bloques de 5 (pista aparte: no cambia el tamaño de las casillas)
function construir() {
  const n = N.n; need = Math.max(panelDe(n, N.diff), pistasMax(N.rc, N.cc));
  const tab = $('#ngTab'), sep = j => j % 5 === 4 && j < n - 1, sp = '<i class="sp"></i>';
  const ent = []; for (let j = 0; j < n; j++) { ent.push(j); if (sep(j)) ent.push(-1); }
  const fila = f => '<div></div>' + ent.map(j => j < 0 ? '<i class="sp sph"></i>' : f(j)).join('');
  let h = fila(j => `<div class="cc">${N.cc[j].map(x => `<span>${x}</span>`).join('')}</div>`);
  for (let i = 0; i < n; i++) {
    h += `<div class="rc">${N.rc[i].map(x => `<span>${x}</span>`).join('')}</div>` + ent.map(j => j < 0 ? sp : `<button type="button" class="c ${(i + j) % 2 ? 'al' : ''}" data-i="${i}" data-j="${j}" aria-label="Fila ${i + 1}, columna ${j + 1}"></button>`).join('');
    if (sep(i)) h += '<div class="sp sph"></div>' + ent.map(() => sp).join('');
  }
  tab.innerHTML = h;
  ccEl = [...tab.querySelectorAll('.cc')]; rcEl = [...tab.querySelectorAll('.rc')];
  const bs = [...tab.querySelectorAll('.c')]; cel = Array.from({ length: n }, (_, i) => bs.slice(i * n, i * n + n));
  medir();
  if (!ro && window.ResizeObserver) { ro = new ResizeObserver(() => medir()); ro.observe($('.ngwrap')); }
}
// Tamaños en píxeles enteros: todas las casillas, filas y columnas miden exactamente igual y el panel ocupa todo el ancho posible
function medir() {
  const w = document.querySelector('.ngwrap'), tab = $('#ngTab'); if (!w || !tab || !N) return;
  const cs = getComputedStyle(w), W = Math.floor(w.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)); if (W < 100) return;
  const n = N.n, seps = Math.floor((n - 1) / 5), tot = t => { const pw = Math.min(PWMAX, Math.floor(t * .66)); return { pw, cab: need * pw + (need - 1) * GAP + 6 + GAP, w: 0 }; };
  let t = Math.floor(W / n), d = tot(t);
  for (; t > 10; t--) { d = tot(t); if (d.cab + n * t + seps * SEP <= W) break; }
  const pw = d.pw, cab = d.cab, trk = [...Array(n).keys()].flatMap(j => j % 5 === 4 && j < n - 1 ? [t + 'px', SEP + 'px'] : [t + 'px']).join(' ');
  tab.style.cssText = `--t:${t}px;--pw:${pw}px;--rh:${Math.min(pw, t - 2 - 4)}px;--fs:${Math.max(8, Math.min(18, Math.floor(pw * .74)))}px;grid-template-columns:${W - n * t - seps * SEP}px ${trk};grid-template-rows:${cab}px ${trk}`;   // la columna de pistas absorbe los píxeles sobrantes
}
function pintarCelda(i, j) {
  const v = N.cur[i][j], b = cel[i][j];
  b.classList.toggle('f', v === 1); b.classList.toggle('mal', malas.has(i * N.n + j));
  const t = v === 2 ? '✕' : ''; if (b.textContent !== t) b.textContent = t;
  b.setAttribute('aria-label', `Fila ${i + 1}, columna ${j + 1}, ${v === 1 ? 'rellena' : v === 2 ? 'marcada vacía' : 'sin marcar'}`);
}
function pintar() {
  if (!N) return;
  const n = N.n, cu = N.cur.map(r => r.map(v => v === 1 ? 1 : 0));
  for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) pintarCelda(i, j); rcEl[i].classList.toggle('ok', same(runs(cu[i]), N.rc[i])); }
  const cols = colsOf(cu, n); ccEl.forEach((e, j) => e.classList.toggle('ok', same(runs(cols[j]), N.cc[j])));
  okPrev = { r: new Set([...Array(n).keys()].filter(i => same(runs(cu[i]), N.rc[i]))), c: new Set([...Array(n).keys()].filter(j => same(runs(cols[j]), N.cc[j]))) };
  const ok = completo(N);
  if (ok && !N.done) {
    N.done = true; crono.detener(); N.t = crono.s;
    api.registrar({ res: 'victoria', tiempo: N.t, variante: N.reto ? 'Reto del día' : `${n}×${n}`, limpio: !N.pistas });
    if (N.reto && api.reto.completar(N.reto)) setTimeout(() => api.aviso('📅 ¡Reto del día completado!'), 300);
    api.sonido('ganar'); api.vibrar([60, 40, 60]); guardar();
  }
  $('#ngTab').classList.toggle('ganado', N.done);
  pintarReto();
  { const pad = $('#ngAcc'), bm = pad.querySelector('[data-ac="m"]'); bm.textContent = modo === 'f' ? '⬛ Rellenar' : '❌ Marcar'; bm.classList.toggle('on', modo === 'x'); bm.setAttribute('aria-pressed', String(modo === 'x'));
    ['undo', 'pista', 'comprobar'].forEach(k => { pad.querySelector(`[data-ac="${k}"]`).disabled = !!N.done; }); }
  const m = $('#ngMsg'); m.className = 'msg' + (N.done ? ' win' : '');
  m.textContent = N.done ? `¡Completado en ${fmtTiempo(N.t)}!${N.nombre ? ` Era: ${N.nombre}.` : ''}` : '';
  $('#ngCrono').textContent = fmtTiempo(N.t);
}

function pintarReto() {
  const r = $('#ngReto'); if (!r || !N) return;
  const hoy = api.reto.fecha(), hecho = api.reto.hecho(), jugando = N.reto === hoy, k = `${hoy}|${hecho}|${jugando}`;
  if (r.dataset.k === k) return; r.dataset.k = k;
  r.innerHTML = `<div class="reto ${hecho ? 'hecho' : ''}"><span>${hecho ? '✅' : '📅'}</span><div><b>Reto del día · ${api.reto.texto(hoy)}</b>${hecho ? 'Completado. Vuelve mañana para otro.' : jugando ? 'Estás jugando el reto: el mismo panel para todo el mundo.' : `Un ${RETO.n}×${RETO.n} de nivel ${LVL[RETO.diff].toLowerCase()}, el mismo para todos hoy.`}</div>${hecho || jugando ? '' : '<button class="btn on" data-ac="reto">Jugar</button>'}</div>`;
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
  const i = +b.dataset.i, j = +b.dataset.j, objetivo = modo === 'f' ? 1 : 2, prev = N.cur[i][j];
  drag = { i0: i, j0: j, prev, val: prev === objetivo ? 0 : objetivo, eje: null, mov: false };
  activar(i, j);
}
function pMove(e) {
  if (!drag || !N) return;
  const c = celdaEn(e.clientX, e.clientY); if (!c) return;
  const [i, j] = c;
  if (!drag.eje) {
    if (i === drag.i0 && j === drag.j0) return;
    drag.eje = i === drag.i0 ? 'fila' : j === drag.j0 ? 'col' : null; if (!drag.eje) return;
    drag.mov = true; hist.push(copia(N.cur)); setCelda(drag.i0, drag.j0, drag.val);
  }
  if ((drag.eje === 'fila' && i !== drag.i0) || (drag.eje === 'col' && j !== drag.j0)) return;
  setCelda(i, j, drag.val); activar(i, j);
}
function pUp() {
  if (!drag) return;
  const d = drag; drag = null; activar(null);
  if (d.mov) { api.sonido('click'); pintarEstado(); return; }
  // un toque: rellena → ✕ → limpia (en modo ✕ alterna ✕ / limpia)
  hist.push(copia(N.cur)); setCelda(d.i0, d.j0, modo === 'f' ? (d.prev + 1) % 3 : (d.prev === 2 ? 0 : 2)); api.sonido('click'); pintarEstado();
}
// Al completar una fila o columna (la pista se pone en verde), las casillas vacías que le queden se marcan solas con ✕. Solo actúa sobre líneas que acaban de completarse
function autoX() {
  const n = N.n, cu = N.cur.map(r => r.map(v => v === 1 ? 1 : 0)), cols = colsOf(cu, n); let c = false;
  const llena = (i, j) => { if (N.cur[i][j] === 0) { N.cur[i][j] = 2; c = true; } };
  for (let i = 0; i < n; i++) if (!okPrev.r.has(i) && same(runs(cu[i]), N.rc[i])) for (let j = 0; j < n; j++) llena(i, j);
  for (let j = 0; j < n; j++) if (!okPrev.c.has(j) && same(runs(cols[j]), N.cc[j])) for (let i = 0; i < n; i++) llena(i, j);
  return c;
}
function pintarEstado() { if (!N.done) autoX(); if (malas.size) { malas = new Set(); for (let i = 0; i < N.n; i++) for (let j = 0; j < N.n; j++) cel[i][j].classList.remove('mal'); } pintar(); guardar(); }
// ✔ Comprobar: marca en rojo lo que has puesto mal (rellena donde no toca, o ✕ donde sí); se quita al seguir jugando
function comprobar() {
  if (!N || N.done) return;
  malas = new Set(); for (let i = 0; i < N.n; i++) for (let j = 0; j < N.n; j++) { const v = N.cur[i][j]; if ((v === 1 && !N.sol[i][j]) || (v === 2 && N.sol[i][j])) malas.add(i * N.n + j); }
  for (let i = 0; i < N.n; i++) for (let j = 0; j < N.n; j++) cel[i][j].classList.toggle('mal', malas.has(i * N.n + j));
  api.aviso(malas.size ? `${malas.size} casilla${malas.size > 1 ? 's' : ''} incorrecta${malas.size > 1 ? 's' : ''}` : '¡Todo lo marcado es correcto!'); api.sonido(malas.size ? 'error' : 'ok');
}
function clic(e) {
  const b = e.target.closest('button'); if (!b || !N) return;
  if (b.classList.contains('c')) {              // teclado (Enter/Espacio): detail === 0
    if (e.detail !== 0 || N.done) return;
    const i = +b.dataset.i, j = +b.dataset.j, pv = N.cur[i][j];
    hist.push(copia(N.cur)); N.cur[i][j] = modo === 'f' ? (pv + 1) % 3 : (pv === 2 ? 0 : 2); pintarCelda(i, j); pintarEstado(); return;
  }
  if (b.dataset.size) return nuevo(+b.dataset.size, N.diff);
  if (b.dataset.diff) return nuevo(N.n, b.dataset.diff, false, 'azar');
  if (b.dataset.tipo) { if (b.dataset.tipo === tipo) return; return nuevo(N.n, N.diff, false, b.dataset.tipo); }
  const ac = b.dataset.ac;
  if (ac === 'undo') deshacer(); else if (ac === 'nuevo') nuevo(N.n, N.diff); else if (ac === 'reto') nuevo(RETO.n, RETO.diff, false, 'azar', true); else if (ac === 'borrar') borrar(); else if (ac === 'aspecto') asp.abrir();
}
function reglas() {
  api.modal('Nonogram', `<ul>
    <li>Los números de cada fila y columna indican cuántas casillas rellenas seguidas hay y en qué orden.</li>
    <li>Entre dos grupos hay al menos una casilla vacía. Cada línea tiene como máximo 3 números en Fácil, 4 en Medio y 5 en Difícil.</li>
    <li><b>Toca</b> una casilla: la primera vez se rellena, la segunda se marca con ✕ y la tercera se limpia. <b>Arrastra</b> el dedo por una fila o columna para pintar de golpe.</li>
    <li>Bajo el panel hay un menú con un botón <b>Rellenar / Marcar</b> (cada pulsación cambia lo que pinta el arrastre: rellenar o ✕), <b>Deshacer</b>, <b>Pista</b> y <b>Comprobar</b> (marca en rojo lo incorrecto) (corrige una casilla; con pistas no cuenta el récord de tiempo).</li>
    <li>Las pistas se ponen en <b>verde</b> cuando esa línea ya está bien.</li>
    <li>Los paneles aleatorios se resuelven siempre por lógica; el modo <b>Dibujo</b> usa imágenes hechas a mano en todos los tamaños (5×5, 10×10 y 15×15).</li><li><b>Reto del día</b>: un panel 10×10 igual para todo el mundo. El historial de deshacer se guarda con la partida.</li></ul>`);
}
