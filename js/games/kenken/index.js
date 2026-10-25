import { $, esperar, fmtTiempo } from '../../core/dom.js';
import { Pila } from '../../core/undo.js';
import { Cronometro } from '../../core/cronometro.js';
import { grupoTablero, grupoFondo } from '../../core/aspectos.js';
import { TAMANOS, DIFICULTADES, generar, cumple, simbolo } from './generador.js';

let S = null, api = null, asp = null, root = null, crono = null, hist = null, cel = [], ocupado = false, notasOn = false, onKey = null, info = null, malas = new Set();
const vecinos = (n, i) => { const r = i / n | 0, c = i % n, o = []; if (r > 0) o.push(i - n); if (r < n - 1) o.push(i + n); if (c > 0) o.push(i - 1); if (c < n - 1) o.push(i + 1); return o; };

/* ---------- validación / resumen ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || !TAMANOS.includes(d.n) || !Object.hasOwn(DIFICULTADES, d.dif)) return null;
  const n = d.n, N = n * n, ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  if (!Array.isArray(d.sol) || d.sol.length !== N || !d.sol.every(v => ent(v, 1, n))) return null;
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (d.sol[i] === d.sol[j] && ((i / n | 0) === (j / n | 0) || i % n === j % n)) return null;      // cuadrado latino
  if (!Array.isArray(d.cages) || d.cages.length < 1 || d.cages.length > N) return null;
  const visto = new Set(), cages = [];
  for (const g of d.cages) {
    if (!g || !Array.isArray(g.cells) || !g.cells.length || g.cells.length > 6 || !g.cells.every(i => ent(i, 0, N - 1) && !visto.has(i)) || !['=', '+', '-', 'x', '/'].includes(g.op) || !ent(g.t, 1, 5000)) return null;
    g.cells.forEach(i => visto.add(i));
    if (g.op === '=' && g.cells.length !== 1) return null; if ((g.op === '-' || g.op === '/') && g.cells.length !== 2) return null;
    if (!cumple(g, g.cells.map(i => d.sol[i]))) return null;
    cages.push({ cells: g.cells.slice().sort((a, b) => a - b), op: g.op, t: g.t });
  }
  if (visto.size !== N) return null;
  if (!Array.isArray(d.cur) || d.cur.length !== N || !d.cur.every(v => ent(v, 0, n))) return null;
  const notas = Array.isArray(d.notas) && d.notas.length === N && d.notas.every(v => ent(v, 0, (1 << (n + 1)) - 1)) ? d.notas.slice() : new Array(N).fill(0);
  const hist = Array.isArray(d.hist) ? d.hist.filter(h => h && Array.isArray(h.cur) && h.cur.length === N && h.cur.every(v => ent(v, 0, n)) && Array.isArray(h.notas) && h.notas.length === N && h.notas.every(v => ent(v, 0, (1 << (n + 1)) - 1))).slice(-60) : [];
  return { n, dif: d.dif, sol: d.sol.slice(), cages, cur: d.cur.slice(), notas, t: ent(d.t, 0, 1e7) ? d.t : 0, pistas: ent(d.pistas, 0, 1e5) ? d.pistas : 0, hist,
    reto: typeof d.reto === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.reto) ? d.reto : null };
}
export const migrarV1 = d => d;
const completo = d => d.sol.every((v, i) => d.cur[i] === v);
export function resumen(d) {
  const ok = completo(d), lle = d.cur.filter(Boolean).length;
  const pre = d.reto ? '📅 Reto · ' : '';
  return { texto: pre + (ok ? `${d.n}×${d.n} · ${DIFICULTADES[d.dif].nombre} · resuelto` : `${d.n}×${d.n} · ${DIFICULTADES[d.dif].nombre} · ${lle}/${d.n * d.n}`), fin: ok };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; notasOn = false; ocupado = false; malas = new Set();
  asp = api.aspecto([grupoFondo('#kkTab'), grupoTablero(), { clave: 'jaulas', titulo: 'Jaulas', def: 'bordes', opciones: [{ id: 'bordes', nombre: 'Solo bordes' }, { id: 'colores', nombre: 'De colores', sw: ['#FF8FA3', '#FFC857', '#6FD99B', '#6FCFE8', '#B79BFF'] }] }, { clave: 'numeros', titulo: 'Números', def: 'redondo', opciones: [{ id: 'redondo', nombre: 'Redondos' }, { id: 'clasico', nombre: 'Clásicos' }] }]);
  await api.css(new URL('./kenken.css', import.meta.url));
  const g = api.cargar();
  S = g ? { ...g, sel: 0 } : null;
  hist = new Pila(60, g ? g.hist : []);
  root.innerHTML = `<div id="kkReto"></div>
    <div class="info"><span class="mut" id="kkInfo"></span><span id="kkCrono" aria-label="Tiempo">0:00</span></div>
    <div class="kk" id="kkTab" role="group" aria-label="Tablero de KenKen"></div>
    <div class="msg" id="kkMsg" role="status" aria-live="polite"></div>
    <div class="kpad" id="kkPad"></div>
    <div class="kpad" id="kkAcc" style="--n2:4"><button class="acc" data-ac="notas" aria-pressed="false">✏️ Notas</button><button class="acc" data-ac="undo">↶ Deshacer</button><button class="acc" data-ac="pista">💡 Pista</button><button class="acc" data-ac="comprobar">✔ Comprobar</button></div>${api.barraHtml()}`;
  root.addEventListener('click', clic);
  onKey = teclado; document.addEventListener('keydown', onKey);
  api.barra({ nueva: () => nueva(S.n, S.dif, false, true),
    salir: () => { location.hash = '#/cat/logica'; },
    crono: () => crono,
    config: { valores: () => ({ n: S.n, dif: S.dif }), grupos: v => [{ clave: 'n', titulo: 'Tamaño', opciones: TAMANOS.map(t => [t, `${t}×${t}`]) }, { clave: 'dif', titulo: 'Nivel', nota: (DIFICULTADES[v.dif] || {}).ayuda, opciones: Object.entries(DIFICULTADES).map(([k, x]) => [k, x.nombre]) }], aplicar: v => nueva(v.n, v.dif, true, true) } });
  menu();
  crono = new Cronometro(() => { if (S) { S.t = crono.s; $('#kkCrono').textContent = fmtTiempo(crono.s); if (crono.s % 15 === 0) guardar(); } });
  if (!S) { await nueva(api.pref('n', 5), api.pref('dif', 'medio'), true); }
  else { prepararInfo(); construir(); arrancar(); pintar(); }
}
const RETO = { n: 6, dif: 'medio' };
function menu() { api.menu([{ texto: 'Nuevo panel', accion: () => nueva(S.n, S.dif, false, true) }, { texto: '📅 Reto del día', accion: () => nueva(RETO.n, RETO.dif, false, true, true) }, { texto: 'Comprobar', accion: comprobar }, { texto: 'Marcar errores al instante', accion: () => { api.setPref('errores', !api.pref('errores', false)); pintar(); menu(); }, activo: api.pref('errores', false) }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Cómo se juega', accion: reglas }]); }
export function unmount() {
  if (S && crono) { S.t = crono.s; guardar(); }
  if (crono) crono.detener();
  document.removeEventListener('keydown', onKey);
  if (root) root.removeEventListener('click', clic);
  S = null; crono = null; cel = []; asp = null;
}
function arrancar() { crono.s = S.t; if (!S.done) crono.iniciar(); else crono.detener(); $('#kkCrono').textContent = fmtTiempo(S.t); }

/* ---------- partida ---------- */
const hayProgreso = () => S && !S.done && S.cur.some(Boolean);
async function nueva(n, dif, forzar = false, cerrar = false, reto = false) {
  if (ocupado) return;
  if (reto && S && S.reto === api.reto.fecha()) { api.aviso(S.done ? 'Ya has completado el reto de hoy' : 'Ya estás jugando el reto de hoy'); return; }
  if (!forzar && hayProgreso() && !api.confirmar('¿Empezar un panel nuevo? Perderás el actual.')) return;
  ocupado = true; if (crono) crono.detener();
  $('#kkMsg').textContent = 'Generando panel…'; await esperar(30);
  const p = reto ? api.reto.generar(() => generar(n, dif)) : generar(n, dif);
  S = { n, dif, sol: p.sol, cages: p.cages, cur: new Array(n * n).fill(0), notas: new Array(n * n).fill(0), t: 0, pistas: 0, sel: 0, done: false, reto: reto ? api.reto.fecha() : null };
  if (!reto) { api.setPref('n', n); api.setPref('dif', dif); } hist.vaciar(); malas = new Set(); ocupado = false; notasOn = false;
  crono = new Cronometro(crono.alTick, 0);
  prepararInfo(); construir(); arrancar(); pintar(); guardar();
  }
function guardar() { if (!S) return; const d = { n: S.n, dif: S.dif, sol: S.sol, cages: S.cages, cur: S.cur, notas: S.notas, t: S.t, pistas: S.pistas, reto: S.reto || null, hist: hist ? hist.toJSON().slice(-60) : [] }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }
function prepararInfo() {                          // jaula de cada casilla, casilla de la etiqueta y color (determinista) de cada jaula
  const n = S.n, jaulaDe = new Array(n * n), color = new Array(S.cages.length).fill(-1);
  S.cages.forEach((g, k) => g.cells.forEach(i => { jaulaDe[i] = k; }));
  S.cages.forEach((g, k) => { const usados = new Set(); for (const c of g.cells) for (const v of vecinos(n, c)) if (jaulaDe[v] !== k && color[jaulaDe[v]] >= 0) usados.add(color[jaulaDe[v]]); let x = 0; while (usados.has(x)) x++; color[k] = x % 6; });
  info = { jaulaDe, color };
}
function pintarReto() {
  const r = $('#kkReto'); if (!r || !S) return;
  const hoy = api.reto.fecha(), hecho = api.reto.hecho(), jugando = S.reto === hoy, k = `${hoy}|${hecho}|${jugando}`;
  if (r.dataset.k === k) return; r.dataset.k = k;
  r.innerHTML = `<div class="reto ${hecho ? 'hecho' : ''}"><span>${hecho ? '✅' : '📅'}</span><div><b>Reto del día · ${api.reto.texto(hoy)}</b>${hecho ? 'Completado. Vuelve mañana para otro.' : jugando ? 'Estás jugando el reto: el mismo panel para todo el mundo.' : `Un ${RETO.n}×${RETO.n} de nivel ${DIFICULTADES[RETO.dif].nombre.toLowerCase()}, el mismo para todos hoy.`}</div>${hecho || jugando ? '' : '<button class="btn on" data-ac="reto">Jugar</button>'}</div>`;
}
const push = () => hist.push({ cur: S.cur.slice(), notas: S.notas.slice() });

/* ---------- pintado ---------- */
function construir() {
  const n = S.n, g = $('#kkTab'); g.style.setProperty('--n', n);
  g.innerHTML = Array.from({ length: n * n }, (_, i) => {
    const k = info.jaulaDe[i], cg = S.cages[k], r = i / n | 0, c = i % n, mismo = j => info.jaulaDe[j] === k;
    const b = (r === 0 || !mismo(i - n) ? ' bt' : '') + (c === n - 1 || !mismo(i + 1) ? ' br' : '') + (r === n - 1 || !mismo(i + n) ? ' bb' : '') + (c === 0 || !mismo(i - 1) ? ' bl' : '');
    return `<button type="button" class="kc${b}" data-i="${i}" data-cc="${info.color[k]}">${cg.cells[0] === i ? `<span class="kl">${cg.t}${simbolo(cg.op)}</span>` : ''}<span class="kv"></span><span class="kn"></span></button>`;
  }).join('');
  cel = [...g.children];
  const pad = $('#kkPad'); pad.style.setProperty('--n2', n + 1);
  pad.innerHTML = Array.from({ length: n }, (_, v) => `<button data-v="${v + 1}" aria-label="Poner ${v + 1}">${v + 1}</button>`).join('') + '<button data-v="0" aria-label="Borrar">⌫</button>';
}
function pintar() {
  if (!S) return;
  pintarReto();
  const n = S.n, N = n * n, auto = api.pref('errores', false), sv = S.cur[S.sel];
  if (!S.done && completo(S)) { S.done = true; crono.detener(); S.t = crono.s; api.registrar({ res: 'victoria', tiempo: S.t, variante: S.reto ? 'Reto del día' : `${n}×${n} ${DIFICULTADES[S.dif].nombre}`, limpio: S.pistas === 0 }); if (S.reto && api.reto.completar(S.reto)) setTimeout(() => api.aviso('📅 ¡Reto del día completado!'), 300); api.sonido('ganar'); api.vibrar([60, 40, 60]); guardar(); }
  const dup = new Set();
  for (let i = 0; i < N; i++) { const v = S.cur[i]; if (!v) continue; for (let j = i + 1; j < N; j++) if (S.cur[j] === v && ((i / n | 0) === (j / n | 0) || i % n === j % n)) { dup.add(i); dup.add(j); } }
  const jmal = new Set(); S.cages.forEach((g, k) => { const vs = g.cells.map(i => S.cur[i]); if (vs.every(Boolean) && !cumple(g, vs)) jmal.add(k); });
  for (let i = 0; i < N; i++) {
    const b = cel[i], v = S.cur[i], x = dup.has(i) || (v && (malas.has(i) || (auto && v !== S.sol[i])));
    const fijo = S.cages[info.jaulaDe[i]].op === '=';
    b.className = b.className.replace(/ (s|p|x|jx|ok|fijo)(?= |$)/g, '') + (i === S.sel ? ' s' : '') + (x ? ' x' : '') + (jmal.has(info.jaulaDe[i]) ? ' jx' : '') + (S.done ? ' ok' : '') + (fijo ? ' fijo' : '');
    const kv = b.querySelector('.kv'); if (kv.textContent !== (v ? String(v) : '')) kv.textContent = v || '';
    const kn = b.querySelector('.kn'), notas = !v && S.notas[i] ? [...Array(n).keys()].map(d => (S.notas[i] & (1 << (d + 1)) ? d + 1 : '')).join(' ') : '';
    if (kn.dataset.k !== notas) { kn.dataset.k = notas; kn.innerHTML = notas ? [...Array(n).keys()].map(d => `<i style="font-style:normal">${S.notas[i] & (1 << (d + 1)) ? d + 1 : ''}</i>`).join('') : ''; }
    b.setAttribute('aria-label', `Fila ${(i / n | 0) + 1}, columna ${i % n + 1}, jaula ${S.cages[info.jaulaDe[i]].t}${simbolo(S.cages[info.jaulaDe[i]].op)}, ${v ? 'valor ' + v : 'vacía'}`);
  }
  const lle = S.cur.filter(Boolean).length;
  $('#kkInfo').textContent = `${lle}/${N} casillas${S.pistas ? ` · ${S.pistas} pista${S.pistas > 1 ? 's' : ''}` : ''}`;
  $('#kkCrono').textContent = fmtTiempo(S.t);
  document.querySelectorAll('#kkPad [data-v]').forEach(b => { b.disabled = S.done; });
  const bn = root.querySelector('[data-ac="notas"]'); bn.classList.toggle('on', notasOn); bn.setAttribute('aria-pressed', String(notasOn));
  const m = $('#kkMsg'); m.className = 'msg' + (S.done ? ' win' : ''); m.textContent = S.done ? `¡Panel resuelto en ${fmtTiempo(S.t)}!` : notasOn ? 'Modo notas: los números se anotan a lápiz.' : 'Cada fila y columna lleva del 1 al ' + n + ' sin repetir; las jaulas deben dar su resultado.';
}

/* ---------- entrada ---------- */
function poner(v) {
  if (!S || S.done) return; const i = S.sel;
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
  if (b.classList.contains('kc')) { S.sel = +d.i; return pintar(); }
  if (d.v != null) return poner(+d.v);
  if (d.n) return nueva(+d.n, S.dif); if (d.dif) return nueva(S.n, d.dif);
  const ac = d.ac;
  if (ac === 'notas') { notasOn = !notasOn; pintar(); } else if (ac === 'undo') deshacer(); else if (ac === 'pista') pista(); else if (ac === 'comprobar') comprobar(); else if (ac === 'nuevo') nueva(S.n, S.dif, false, true); else if (ac === 'reto') nueva(RETO.n, RETO.dif, false, true, true); else if (ac === 'aspecto') asp.abrir();
}
function reglas() {
  api.modal('KenKen', `<ul><li>Rellena la cuadrícula con los números del <b>1 al ${S ? S.n : 'N'}</b> sin repetir ninguno en cada fila ni columna (como un Sudoku).</li>
    <li>Las <b>jaulas</b> (bordes gruesos) llevan un número y una operación: los números de la jaula, combinados con esa operación, deben dar ese resultado. En restas y divisiones el orden no importa (se resta el menor al mayor).</li>
    <li>Una jaula con un solo número es una casilla ya resuelta. Los números pueden repetirse dentro de una jaula si están en filas y columnas distintas.</li>
    <li>✏️ <b>Notas</b> para anotar candidatos, ✔ <b>Comprobar</b> marca los errores y 💡 <b>Pista</b> rellena una casilla (con pistas no cuenta el récord).</li>
    <li>Todos los paneles tienen una única solución. En 🎨 Apariencia eliges paleta, jaulas de colores y tipo de número.</li></ul>`);
}
