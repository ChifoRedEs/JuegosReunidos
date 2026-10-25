import { $, esperar, fmtTiempo, rnd } from '../../core/dom.js';
import { Pila } from '../../core/undo.js';
import { Cronometro } from '../../core/cronometro.js';
import { grupoTablero, grupoFondo } from '../../core/aspectos.js';
import { crearFlotante } from '../../core/flotante.js';
import { SIZES, runs, colsOf, generarAleatorio } from './solver.js';

const LVL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
const MAX_DESHACER = 40, RETO = { n: 10, diff: 'medio' };
const NCELL = { 5: 52, 10: 34, 15: 26, 20: 20 }, NFONT = { 5: 14, 10: 12, 15: 11, 20: 10 };
let asp = null, N = null, api = null, hist = null, crono = null, modo = 'f', tipo = 'azar', banco = null, ocupado = false, rootEl = null;
let cel = [], rcEl = [], ccEl = [], drag = null, activo = null, flot = null;
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
  asp = api.aspecto([grupoFondo('.ngwrap'), grupoTablero(),
    { clave: 'relleno', titulo: 'Color del relleno', def: 'azul', opciones: [{ id: 'azul', nombre: 'Azul', sw: ['#2F6BFF'] }, { id: 'rosa', nombre: 'Rosa', sw: ['#FF3FA4'] }, { id: 'verde', nombre: 'Verde', sw: ['#0FB56A'] }, { id: 'naranja', nombre: 'Naranja', sw: ['#FF7A1A'] }, { id: 'violeta', nombre: 'Violeta', sw: ['#7A4DFF'] }] },
    { clave: 'forma', titulo: 'Forma de las casillas rellenas', def: 'redondeado', opciones: [{ id: 'redondeado', nombre: '▢ Redondeada' }, { id: 'cuadrado', nombre: '■ Cuadrada' }, { id: 'circulo', nombre: '● Círculo' }, { id: 'estrella', nombre: '★ Estrella' }, { id: 'corazon', nombre: '♥ Corazón' }] }]);
  modo = 'f'; ocupado = false; drag = null;
  tipo = api.pref('tipo', 'azar');
  await api.css(new URL('./nonogram.css', import.meta.url));
  const g = api.cargar();
  N = g ? { ...g, rc: g.sol.map(runs), cc: colsOf(g.sol, g.n).map(runs), done: completo(g) } : null;
  hist = new Pila(MAX_DESHACER, g ? g.hist : []);
  root.innerHTML = `<div id="ngReto"></div>
    <div class="info"><span class="mut">Toca: rellenar → ✕ → limpiar · arrastra para pintar una línea</span><span id="ngCrono">0:00</span></div>
    <div class="ngwrap"><div class="ng" id="ngTab"></div></div>
    <div class="msg" id="ngMsg" role="status" aria-live="polite"></div>${api.barraHtml()}`;
  flot = crearFlotante(api, { ancla: root.querySelector('.ngwrap'), raiz: root, botones: [{ id: 'f', texto: '■ Rellenar' }, { id: 'x', texto: '✕ Marcar X' }, { id: 'undo', texto: '↶ Deshacer' }, { id: 'pista', texto: '💡 Pista' }],
    alClic: id => { if (id === 'f' || id === 'x') { modo = id; pintar(); } else if (id === 'undo') deshacer(); else if (id === 'pista') pista(); } });
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
    { texto: 'Reglas', accion: reglas },
  ]);
  crono = new Cronometro(() => { if (N) { N.t = crono.s; $('#ngCrono').textContent = fmtTiempo(crono.s); if (crono.s % 15 === 0) guardar(); } });
  if (!N) await nuevo(10, 'medio', true); else { construir(); arrancar(); pintar(); }
}
export function unmount() {
  if (N && crono) { N.t = crono.s; guardar(); }
  if (crono) crono.detener();
  if (rootEl) { rootEl.removeEventListener('click', clic); rootEl.removeEventListener('pointerdown', pDown); rootEl.removeEventListener('pointermove', pMove); rootEl.removeEventListener('pointerup', pUp); rootEl.removeEventListener('pointercancel', pUp); }
  if (flot) { flot.destruir(); flot = null; }
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
async function nuevo(n, diff, forzar = false, nuevoTipo = tipo, reto = false) {
  if (ocupado) return;
  if (reto && N && N.reto === api.reto.fecha()) { api.aviso(N.done ? 'Ya has completado el reto de hoy' : 'Ya estás jugando el reto de hoy'); return; }
  if (reto) nuevoTipo = 'azar';
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
  if (!p) p = reto ? await api.reto.generarAsync(() => generarAleatorio(n, diff)) : await generarAleatorio(n, diff);
  N = { n, diff, sol: p.sol, rc: p.rc, cc: p.cc, cur: vacia(n), nombre, t: 0, pistas: 0, done: false, reto: reto ? api.reto.fecha() : null };
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
function construir() {
  const n = N.n, fs = NFONT[n];
  const clueW = Math.max(...N.rc.map(r => r.reduce((s, x) => s + String(x).length * fs * .62 + 4, 0))) + 8;
  const tab = $('#ngTab');
  tab.style.cssText = `--n:${n};--fs:${fs}px;--cs:max(14px,min(calc((min(100vw,520px) - 42px - ${Math.round(clueW)}px) / ${n}),${NCELL[n]}px))`;
  let h = '<div></div>' + N.cc.map(c => `<div class="cc">${c.map(x => `<span>${x}</span>`).join('')}</div>`).join('');
  for (let i = 0; i < n; i++) {
    h += `<div class="rc">${N.rc[i].map(x => `<span>${x}</span>`).join('')}</div>`;
    for (let j = 0; j < n; j++) h += `<button type="button" class="c ${j % 5 === 4 && j < n - 1 ? 'm5' : ''} ${i % 5 === 4 && i < n - 1 ? 'b5' : ''}" data-i="${i}" data-j="${j}" aria-label="Fila ${i + 1}, columna ${j + 1}"></button>`;
  }
  tab.innerHTML = h;
  ccEl = [...tab.querySelectorAll('.cc')]; rcEl = [...tab.querySelectorAll('.rc')];
  const bs = [...tab.querySelectorAll('.c')]; cel = Array.from({ length: n }, (_, i) => bs.slice(i * n, i * n + n));
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
    api.registrar({ res: 'victoria', tiempo: N.t, variante: N.reto ? 'Reto del día' : `${n}×${n}`, limpio: !N.pistas });
    if (N.reto && api.reto.completar(N.reto)) setTimeout(() => api.aviso('📅 ¡Reto del día completado!'), 300);
    api.sonido('ganar'); api.vibrar([60, 40, 60]); guardar();
  }
  $('#ngTab').classList.toggle('ganado', N.done);
  pintarReto();
  if (flot) { flot.marcar('f', modo === 'f'); flot.marcar('x', modo === 'x'); flot.activar('undo', !N.done); flot.activar('pista', !N.done); }
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
function pintarEstado() { pintar(); guardar(); }
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
    <li>Entre dos grupos hay al menos una casilla vacía.</li>
    <li><b>Toca</b> una casilla: la primera vez se rellena, la segunda se marca con ✕ y la tercera se limpia. <b>Arrastra</b> el dedo por una fila o columna para pintar de golpe.</li>
    <li>El <b>menú flotante</b> (se mueve con el asa «Mover») tiene <b>Rellenar</b> y <b>Marcar X</b> (qué pinta el arrastre; en Marcar X el toque alterna ✕), <b>Deshacer</b> y <b>Pista</b> (corrige una casilla; con pistas no cuenta el récord de tiempo).</li>
    <li>Las pistas se <b>tachan</b> cuando esa línea ya está bien.</li>
    <li>Los paneles aleatorios se resuelven siempre por lógica; el modo <b>Dibujo</b> usa imágenes hechas a mano en todos los tamaños (de 5×5 a 20×20).</li><li><b>Reto del día</b>: un panel 10×10 igual para todo el mundo. El historial de deshacer se guarda con la partida.</li></ul>`);
}
