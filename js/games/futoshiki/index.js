import { $, esperar, fmtTiempo } from '../../core/dom.js';
import { Pila } from '../../core/undo.js';
import { Cronometro } from '../../core/cronometro.js';
import { grupoTableroDN, grupoColoresNumeros, coloresTablero } from '../../core/aspectos.js';
import { variablesTintadas } from '../../core/tinte.js';
import { TAMANOS, DIFICULTADES, generar, evaluar } from './motor.js';

let S = null, api = null, asp = null, root = null, crono = null, hist = null, cel = [], fl = {}, ocupado = false, notasOn = false, onKey = null, malas = new Set();
const IMG = new URL('../../../img/futoshiki/', import.meta.url).href, FLECHAS = ['flechai', 'flechad', 'flechaa', 'flechab'];

/* ---------- validación / resumen ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || !TAMANOS.includes(d.n) || !Object.hasOwn(DIFICULTADES, d.dif)) return null;
  const n = d.n, N = n * n, ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, arr = (a, f) => Array.isArray(a) && a.length === N && a.every(f);
  if (!arr(d.sol, v => ent(v, 1, n)) || !arr(d.dado, v => ent(v, 0, n)) || !arr(d.h, v => ent(v, 0, 2)) || !arr(d.v, v => ent(v, 0, 2)) || !arr(d.cur, v => ent(v, 0, n))) return null;
  const p = { n, dado: d.dado, h: d.h, v: d.v }, e = evaluar(p, d.sol);
  if (!e.completo) return null;                                        // la solución guardada debe cumplirlo todo
  for (let i = 0; i < N; i++) { if (d.dado[i] && d.dado[i] !== d.sol[i]) return null; if (d.dado[i] && d.cur[i] !== d.dado[i]) return null; }
  const maxN = (1 << (n + 1)) - 1;
  const notas = Array.isArray(d.notas) && d.notas.length === N && d.notas.every(v => ent(v, 0, maxN)) ? d.notas.slice() : new Array(N).fill(0);
  const hist = Array.isArray(d.hist) ? d.hist.filter(x => x && Array.isArray(x.cur) && x.cur.length === N && x.cur.every(v => ent(v, 0, n)) && Array.isArray(x.notas) && x.notas.length === N && x.notas.every(v => ent(v, 0, maxN))).slice(-60) : [];
  return { n, dif: d.dif, sol: d.sol.slice(), dado: d.dado.slice(), h: d.h.slice(), v: d.v.slice(), cur: d.cur.slice(), notas, hist, t: ent(d.t, 0, 1e7) ? d.t : 0, pistas: ent(d.pistas, 0, 1e5) ? d.pistas : 0,
    reto: typeof d.reto === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.reto) ? d.reto : null };
}
export const migrarV1 = d => d;
const completo = d => d.cur.every((v, i) => v === d.sol[i]);
export function resumen(d) {
  const ok = completo(d), lle = d.cur.filter(Boolean).length, pre = d.reto ? '📅 Reto · ' : '';
  return { texto: pre + (ok ? `${d.n}×${d.n} · ${DIFICULTADES[d.dif].nombre} · resuelto` : `${d.n}×${d.n} · ${DIFICULTADES[d.dif].nombre} · ${lle}/${d.n * d.n}`), fin: ok };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; notasOn = false; ocupado = false; malas = new Set();
  asp = api.aspecto([grupoTableroDN(), grupoColoresNumeros()], () => { pintarImagenes(); if (S) pintar(); });
  await api.css(new URL('./futoshiki.css', import.meta.url));
  const g = api.cargar();
  S = g ? { ...g, sel: 0 } : null;
  hist = new Pila(60, g ? g.hist : []);
  root.innerHTML = `<div id="fuReto"></div>
    <div class="info"><span class="mut" id="fuInfo"></span><span id="fuCrono" aria-label="Tiempo">0:00</span></div>
    <div class="fu" id="fuTab" role="group" aria-label="Tablero de Futoshiki"></div>
    <div class="msg" id="fuMsg" role="status" aria-live="polite"></div>
    <div class="kpad" id="fuPad"></div>
    <div class="kpad" id="fuAcc" style="--n2:4"><button class="acc" data-ac="notas" aria-pressed="false">✏️ Notas</button><button class="acc" data-ac="undo">↶ Deshacer</button><button class="acc" data-ac="pista">💡 Pista</button><button class="acc" data-ac="comprobar">✔ Comprobar</button></div>${api.barraHtml()}`;
  root.addEventListener('click', clic);
  onKey = teclado; document.addEventListener('keydown', onKey);
  api.barra({ nueva: () => nueva(S.n, S.dif, false, true),
    salir: () => { location.hash = '#/cat/logica'; },
    crono: () => crono,
    config: { valores: () => ({ n: S.n, dif: S.dif }), grupos: v => [{ clave: 'n', titulo: 'Tamaño', opciones: TAMANOS.map(t => [t, `${t}×${t}`]) }, { clave: 'dif', titulo: 'Nivel', nota: (DIFICULTADES[v.dif] || {}).ayuda, opciones: Object.entries(DIFICULTADES).map(([k, x]) => [k, x.nombre]) }], aplicar: v => nueva(v.n, v.dif, true, true) } });
  menu();
  crono = new Cronometro(() => { if (S) { S.t = crono.s; $('#fuCrono').textContent = fmtTiempo(crono.s); if (crono.s % 15 === 0) guardar(); } });
  if (!S) await nueva(api.pref('n', 5), api.pref('dif', 'medio'), true);
  else { construir(); arrancar(); pintar(); }
}
const RETO = { n: 5, dif: 'medio' };
function menu() { api.menu([{ texto: 'Nuevo panel', accion: () => nueva(S.n, S.dif, false, true) }, { texto: '📅 Reto del día', accion: () => nueva(RETO.n, RETO.dif, false, true, true) }, { texto: 'Comprobar', accion: comprobar }, { texto: 'Marcar errores al instante', accion: () => { api.setPref('errores', !api.pref('errores', false)); pintar(); menu(); }, activo: api.pref('errores', false) }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: '📖 Reglas', accion: reglas }]); }
export function unmount() {
  if (S && crono) { S.t = crono.s; guardar(); }
  if (crono) crono.detener();
  document.removeEventListener('keydown', onKey);
  if (root) root.removeEventListener('click', clic);
  S = null; crono = null; cel = []; fl = {}; asp = null;
}
function arrancar() { crono.s = S.t; if (!S.done) crono.iniciar(); else crono.detener(); $('#fuCrono').textContent = fmtTiempo(S.t); }

/* ---------- imágenes (variables CSS con el color elegido) ---------- */
function pintarImagenes() {      // casillas y flechas: imágenes grises teñidas con los colores del Tablero
  const t = coloresTablero(asp && asp.valores.tablero), L = (n, h) => ['--f-' + n, IMG + 'liso-' + n + '.webp', h];
  variablesTintadas(root, [L('celda', t.cel), L('dado', t.dado), L('mala', t.cel), ...FLECHAS.map((f, k) => ['--f' + k, IMG + 'liso-' + f + '.webp', t.flecha])], 'fu' + t.id);
}

/* ---------- partida ---------- */
const hayProgreso = () => S && !S.done && S.cur.some((v, i) => v && !S.dado[i]);
async function nueva(n, dif, forzar = false, cerrar = false, reto = false) {
  if (ocupado) return;
  if (reto && S && S.reto === api.reto.fecha()) { api.aviso(S.done ? 'Ya has completado el reto de hoy' : 'Ya estás jugando el reto de hoy'); return; }
  if (!forzar && hayProgreso() && !await api.confirmar('¿Empezar un panel nuevo? Perderás el actual.')) return;
  ocupado = true; if (crono) crono.detener();
  $('#fuMsg').textContent = 'Generando panel…'; await esperar(30);
  const p = reto ? api.reto.generar(() => generar(n, dif)) : generar(n, dif);
  S = { n, dif, dado: p.dado, h: p.h, v: p.v, sol: p.sol, cur: p.dado.slice(), notas: new Array(n * n).fill(0), t: 0, pistas: 0, sel: p.dado.findIndex(x => !x), done: false, reto: reto ? api.reto.fecha() : null };
  if (S.sel < 0) S.sel = 0;
  if (!reto) { api.setPref('n', n); api.setPref('dif', dif); } hist.vaciar(); malas = new Set(); ocupado = false; notasOn = false;
  crono = new Cronometro(crono.alTick, 0);
  construir(); arrancar(); pintar(); guardar();
}
function guardar() { if (!S) return; const d = { n: S.n, dif: S.dif, dado: S.dado, h: S.h, v: S.v, sol: S.sol, cur: S.cur, notas: S.notas, t: S.t, pistas: S.pistas, reto: S.reto || null, hist: hist ? hist.toJSON().slice(-60) : [] }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }
function pintarReto() {
  const r = $('#fuReto'); if (!r || !S) return;
  const hoy = api.reto.fecha(), hecho = api.reto.hecho(), jugando = S.reto === hoy, k = `${hoy}|${hecho}|${jugando}`;
  if (r.dataset.k === k) return; r.dataset.k = k;
  r.innerHTML = `<div class="reto ${hecho ? 'hecho' : ''}"><span>${hecho ? '✅' : '📅'}</span><div><b>Reto del día · ${api.reto.texto(hoy)}</b>${hecho ? 'Completado. Vuelve mañana para otro.' : jugando ? 'Estás jugando el reto: el mismo panel para todo el mundo.' : `Un ${RETO.n}×${RETO.n} de nivel ${DIFICULTADES[RETO.dif].nombre.toLowerCase()}, el mismo para todos hoy.`}</div>${hecho || jugando ? '' : '<button class="btn on" data-ac="reto">Jugar</button>'}</div>`;
}
const push = () => hist.push({ cur: S.cur.slice(), notas: S.notas.slice() });

/* ---------- pintado ---------- */
function construir() {
  const n = S.n, g = $('#fuTab'), m = 2 * n - 1; g.style.setProperty('--n', n);
  g.style.gridTemplateColumns = g.style.gridTemplateRows = Array.from({ length: m }, (_, k) => (k % 2 ? '.42fr' : '1fr')).join(' ');
  let h = ''; cel = []; fl = {};
  for (let R = 0; R < m; R++) for (let C = 0; C < m; C++) {
    const r = R / 2, c = C / 2;
    if (R % 2 === 0 && C % 2 === 0) { const i = (R / 2) * n + C / 2; h += `<button type="button" class="fc" data-i="${i}"><span class="fv"></span><span class="fn"></span></button>`; }
    else if (R % 2 === 0) { const i = (R / 2) * n + (C - 1) / 2, k = S.h[i]; h += k ? `<i class="fa fh" data-k="h${i}" data-d="${k === 1 ? 'i' : 'd'}"></i>` : '<i></i>'; }
    else if (C % 2 === 0) { const i = ((R - 1) / 2) * n + C / 2, k = S.v[i]; h += k ? `<i class="fa fvv" data-k="v${i}" data-d="${k === 1 ? 'a' : 'b'}"></i>` : '<i></i>'; }
    else h += '<i></i>';
  }
  g.innerHTML = h; cel = [...g.querySelectorAll('.fc')]; g.querySelectorAll('.fa').forEach(e => { fl[e.dataset.k] = e; });
  const pad = $('#fuPad'); pad.style.setProperty('--n2', n + 1);
  pad.innerHTML = Array.from({ length: n }, (_, v) => `<button data-v="${v + 1}" aria-label="Poner ${v + 1}">${v + 1}</button>`).join('') + '<button data-v="0" aria-label="Borrar">⌫</button>';
  pintarImagenes();
}
function pintar() {
  if (!S) return;
  pintarReto();
  const n = S.n, N = n * n, auto = api.pref('errores', false);
  const ev = evaluar(S, S.cur);
  if (!S.done && completo(S)) { S.done = true; crono.detener(); S.t = crono.s; api.registrar({ res: 'victoria', tiempo: S.t, variante: S.reto ? 'Reto del día' : `${n}×${n} ${DIFICULTADES[S.dif].nombre}`, limpio: S.pistas === 0 }); if (S.reto && api.reto.completar(S.reto)) setTimeout(() => api.aviso('📅 ¡Reto del día completado!'), 300); api.sonido('ganar'); api.vibrar([60, 40, 60]); guardar(); }
  for (let i = 0; i < N; i++) {
    const b = cel[i], v = S.cur[i], fijo = !!S.dado[i], x = ev.dup.has(i) || malas.has(i) || (auto && v && v !== S.sol[i]);
    const k = 'fc' + (fijo ? ' fijo' : '') + (i === S.sel ? ' s' : '') + (x ? ' x' : '') + (S.done ? ' ok' : '');
    if (b.className !== k) b.className = k;
    if (b.dataset.d !== String(v || '')) b.dataset.d = v || '';
    const fv = b.firstChild; if (fv.textContent !== (v ? String(v) : '')) fv.textContent = v || '';
    const fn = b.lastChild, notas = !v && S.notas[i] ? [...Array(n).keys()].map(d => (S.notas[i] & (1 << (d + 1)) ? d + 1 : '')).join(' ') : '';
    if (fn.dataset.k !== notas) { fn.dataset.k = notas; fn.innerHTML = notas ? [...Array(n).keys()].map(d => `<i>${S.notas[i] & (1 << (d + 1)) ? d + 1 : ''}</i>`).join('') : ''; }
    b.setAttribute('aria-label', `Fila ${(i / n | 0) + 1}, columna ${i % n + 1}, ${fijo ? 'dado ' + v : v ? 'valor ' + v : 'vacía'}`);
  }
  for (const [k, e] of Object.entries(fl)) e.classList.toggle('x', ev.mala.has(k));
  const lle = S.cur.filter(Boolean).length;
  $('#fuInfo').textContent = `${lle}/${N} casillas${S.pistas ? ` · ${S.pistas} pista${S.pistas > 1 ? 's' : ''}` : ''}`;
  $('#fuCrono').textContent = fmtTiempo(S.t);
  document.querySelectorAll('#fuPad [data-v]').forEach(b => { b.disabled = S.done; });
  const bn = root.querySelector('[data-ac="notas"]'); bn.classList.toggle('on', notasOn); bn.setAttribute('aria-pressed', String(notasOn));
  const m = $('#fuMsg'); m.className = 'msg' + (S.done ? ' win' : ''); m.textContent = S.done ? `¡Panel resuelto en ${fmtTiempo(S.t)}!` : notasOn ? 'Modo notas: los números se anotan a lápiz.' : `Del 1 al ${n} sin repetir en filas ni columnas, respetando las flechas.`;
}

/* ---------- entrada ---------- */
function poner(v) {
  if (!S || S.done) return; const i = S.sel; if (S.dado[i]) return;
  if (notasOn && v) { if (S.cur[i]) return; push(); S.notas[i] ^= 1 << v; }
  else { if (S.cur[i] === v) return; push(); S.cur[i] = v; S.notas[i] = 0; malas.delete(i); api.sonido(v ? 'click' : 'mover'); }
  pintar(); guardar();
}
function deshacer() { if (!S || S.done) return; const h = hist.pop(); if (!h) { api.aviso('Nada que deshacer'); return; } S.cur = h.cur; S.notas = h.notas; malas = new Set(); pintar(); guardar(); }
function comprobar() {
  if (!S || S.done) return; malas = new Set(S.cur.map((v, i) => (v && v !== S.sol[i] ? i : -1)).filter(i => i >= 0));
  api.aviso(malas.size ? `${malas.size} casilla${malas.size > 1 ? 's' : ''} incorrecta${malas.size > 1 ? 's' : ''}` : '¡Todo lo escrito es correcto!'); api.sonido(malas.size ? 'error' : 'ok'); pintar();
}
function pista() {
  if (!S || S.done) return;
  let i = S.sel; if (S.cur[i] === S.sol[i]) { const c = S.cur.map((v, k) => (v !== S.sol[k] ? k : -1)).filter(k => k >= 0); if (!c.length) return; i = c[Math.random() * c.length | 0]; S.sel = i; }
  push(); S.cur[i] = S.sol[i]; S.notas[i] = 0; malas.delete(i); S.pistas++; api.sonido('ok'); pintar(); guardar();
}
function teclado(e) {
  if (!S || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('.modal') || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (/^[0-9]$/.test(e.key) && +e.key <= S.n) poner(+e.key);
  else if (e.key === 'Backspace' || e.key === 'Delete') poner(0);
  else if (e.key === 'n' || e.key === 'N') { notasOn = !notasOn; pintar(); }
  else if (e.key === 'z' || e.key === 'Z') deshacer();
  else if (e.key.startsWith('Arrow')) { e.preventDefault(); const n = S.n, r = S.sel / n | 0, c = S.sel % n; const nr = Math.min(n - 1, Math.max(0, r + ({ ArrowUp: -1, ArrowDown: 1 }[e.key] || 0))), nc = Math.min(n - 1, Math.max(0, c + ({ ArrowLeft: -1, ArrowRight: 1 }[e.key] || 0))); S.sel = nr * n + nc; pintar(); }
}
function clic(e) {
  const b = e.target.closest('button'); if (!b || !S) return; const d = b.dataset;
  if (b.classList.contains('fc')) { S.sel = +d.i; return pintar(); }
  if (d.v != null) return poner(+d.v);
  const ac = d.ac;
  if (ac === 'notas') { notasOn = !notasOn; pintar(); } else if (ac === 'undo') deshacer(); else if (ac === 'pista') pista(); else if (ac === 'comprobar') comprobar(); else if (ac === 'nuevo') nueva(S.n, S.dif, false, true); else if (ac === 'reto') nueva(RETO.n, RETO.dif, false, true, true); else if (ac === 'aspecto') asp.abrir();
}
function reglas() {
  api.modal('Futoshiki', `<ul><li>Rellena la cuadrícula con los números del <b>1 al ${S ? S.n : 'N'}</b> sin repetir ninguno en cada fila ni columna (como un Sudoku).</li>
    <li>Entre algunas casillas hay una <b>flecha</b>: apunta hacia la casilla con el número <b>más pequeño</b>. Si la flecha mira a la izquierda ‹, el número de la izquierda es menor que el de su derecha.</li>
    <li>Algunas casillas vienen ya con su número (con marco grabado): no se pueden cambiar.</li>
    <li>✏️ <b>Notas</b> para anotar candidatos, ✔ <b>Comprobar</b> marca los errores y 💡 <b>Pista</b> rellena una casilla (con pistas no cuenta el récord).</li>
    <li>Todos los paneles tienen una única solución y en Fácil nunca hace falta adivinar. En 🎨 Apariencia eliges casillas (crema, lisas, madera o piedra), su color y el tipo de número.</li></ul>`);
}
