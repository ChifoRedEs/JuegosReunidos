import { $, esc, esperar, fmtTiempo } from '../../core/dom.js';
import { Pila } from '../../core/undo.js';
import { Cronometro } from '../../core/cronometro.js';
import { PARES, candidatos, generar } from './generador.js';

const LVL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
let S = null, api = null, cel = [], hist = null, crono = null, notasOn = false, ocupado = false, onKey = null, rootEl = null;
const POP = m => { let n = 0; while (m) { n += m & 1; m >>= 1; } return n; };

/* ---------- validación / migración (también la usa la importación) ---------- */
const digitos = (a, min) => Array.isArray(a) && a.length === 81 && a.every(v => Number.isInteger(v) && v >= min && v <= 9);
export function validar(d) {
  if (!d || typeof d !== 'object' || !digitos(d.sol, 1) || !digitos(d.cur, 0) || !Array.isArray(d.given) || d.given.length !== 81) return null;
  // la solución debe ser un sudoku válido y las casillas dadas deben coincidir con ella
  for (let i = 0; i < 81; i++) { for (const j of PARES[i]) if (d.sol[j] === d.sol[i]) return null; if (d.given[i] && d.cur[i] !== d.sol[i]) return null; }
  const notas = Array.isArray(d.notas) && d.notas.length === 81 && d.notas.every(v => Number.isInteger(v) && v >= 0 && v < 1024) ? d.notas.slice() : new Array(81).fill(0);
  return {
    sol: d.sol.slice(), cur: d.cur.slice(), given: d.given.map(Boolean), notas,
    level: Object.hasOwn(LVL, d.level) ? d.level : 'medio',
    t: Number.isInteger(d.t) && d.t >= 0 ? d.t : 0, pistas: Number.isInteger(d.pistas) && d.pistas >= 0 ? d.pistas : 0,
  };
}
export const migrarV1 = d => d;
const rellenas = s => s.cur.filter(Boolean).length;
const completo = s => s.cur.every((v, i) => v && !conflicto(s, i));
function conflicto(s, i) { const v = s.cur[i]; return !!v && PARES[i].some(j => s.cur[j] === v); }
export function resumen(d) {
  const ok = completo(d);
  return { texto: ok ? `Completado · ${LVL[d.level]} · ${fmtTiempo(d.t)}` : `${LVL[d.level]} · ${rellenas(d)}/81`, fin: ok };
}

/* ---------- ciclo de vida ---------- */
export async function mount(root, a) {
  api = a; rootEl = root; hist = new Pila(300); notasOn = false; ocupado = false;
  await api.css(new URL('./sudoku.css', import.meta.url));
  const guardado = api.cargar();
  S = guardado ? { ...guardado, sel: -1, done: completo(guardado) } : null;
  root.innerHTML = `
    <div class="bar" id="sdNiv">${Object.entries(LVL).map(([k, l]) => `<button class="btn" data-niv="${k}">${l}</button>`).join('')}</div>
    <div class="info"><span class="mut" id="sdInfo"></span><span id="sdCrono" aria-label="Tiempo">0:00</span></div>
    <div class="sd" id="sdTab" role="group" aria-label="Tablero de Sudoku">${Array.from({ length: 81 }, (_, i) => `<button type="button" data-i="${i}"></button>`).join('')}</div>
    <div class="msg" id="sdMsg" role="status" aria-live="polite"></div>
    <div class="pad" id="sdPad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button type="button" data-n="${n}" aria-label="Poner ${n}">${n}<small></small></button>`).join('')}<button type="button" data-n="0" aria-label="Borrar">⌫</button></div>
    <div class="pad" id="sdAcc"><button type="button" class="acc" data-ac="notas" aria-pressed="false">✏️ Notas</button><button type="button" class="acc" data-ac="undo">↶ Deshacer</button><button type="button" class="acc" data-ac="pista">💡 Pista</button><button type="button" class="acc" data-ac="nuevo">Nuevo</button><button type="button" class="acc" data-ac="reglas">?</button></div>`;
  cel = [...root.querySelectorAll('#sdTab button')];
  root.addEventListener('click', clic);
  onKey = teclado; document.addEventListener('keydown', onKey);
  menuItems();
  crono = new Cronometro(() => { $('#sdCrono').textContent = fmtTiempo(crono.s); if (S) { S.t = crono.s; if (crono.s % 15 === 0) guardar(); } });
  if (!S) await nuevo('medio', true); else arrancar();
  pintar();
}
function menuItems() { api.menu([
  { texto: 'Nuevo juego', accion: () => nuevo(S ? S.level : 'medio') },
  { texto: 'Marcar errores al instante', accion: () => { api.setPref('errores', !api.pref('errores', false)); pintar(); menuItems(); }, activo: api.pref('errores', false) },
  { texto: 'Reiniciar tablero', accion: reiniciar, peligro: true },
  { texto: 'Reglas y consejos', accion: reglas },
]); }
export function unmount() {
  if (S) { S.t = crono ? crono.s : S.t; guardar(); }
  if (crono) crono.detener();
  document.removeEventListener('keydown', onKey);
  if (rootEl) rootEl.removeEventListener('click', clic);
  S = null; crono = null; cel = [];
}
function arrancar() { crono.s = S.t; if (!S.done) crono.iniciar(); else crono.detener(); }

/* ---------- partida ---------- */
const hayProgreso = () => S && !S.done && S.cur.some((v, i) => v && !S.given[i]);
async function nuevo(nivel, forzar = false) {
  if (ocupado) return;
  if (!forzar && hayProgreso() && !api.confirmar('¿Empezar un Sudoku nuevo? Perderás la partida actual.')) return;
  ocupado = true; crono.detener();
  $('#sdMsg').textContent = 'Generando tablero…'; $('#sdMsg').className = 'msg';
  await esperar(30);
  const { sol, cur } = generar(nivel);
  S = { sol, cur, given: cur.map(v => v > 0), notas: new Array(81).fill(0), level: nivel, t: 0, pistas: 0, sel: -1, done: false };
  hist.vaciar(); ocupado = false;
  crono = new Cronometro(crono.alTick, 0); arrancar();
  $('#sdCrono').textContent = '0:00';
  pintar(); guardar();
}
function reiniciar() {
  if (!S || S.done || !api.confirmar('¿Borrar todo lo que has escrito en este tablero?')) return;
  push(); S.cur = S.cur.map((v, i) => S.given[i] ? v : 0); S.notas.fill(0); pintar(); guardar();
}
function guardar() {
  if (!S) return;
  const d = { sol: S.sol, cur: S.cur, given: S.given, notas: S.notas, level: S.level, t: S.t, pistas: S.pistas };
  const r = resumen(d); api.guardar(d, r.texto, r.fin);
}
const push = () => hist.push({ cur: S.cur.slice(), notas: S.notas.slice() });

function poner(v) {
  if (!S || S.sel < 0 || S.given[S.sel] || S.done) return;
  const i = S.sel;
  if (notasOn && v) {
    if (S.cur[i]) return;
    push(); S.notas[i] ^= 1 << v;
  } else {
    if (S.cur[i] === v) return;
    push(); S.cur[i] = v; S.notas[i] = 0;
    if (v) for (const j of PARES[i]) S.notas[j] &= ~(1 << v);      // quita ese candidato en fila, columna y caja
    api.sonido(v ? 'click' : 'mover');
  }
  pintar(); guardar();
}
function deshacer() {
  if (!S || S.done) return;
  const h = hist.pop(); if (!h) { api.aviso('Nada que deshacer'); return; }
  S.cur = h.cur; S.notas = h.notas; pintar(); guardar();
}
function pista() {
  if (!S || S.done) return;
  const mal = i => !S.given[i] && S.cur[i] !== S.sol[i];
  let i = S.sel;
  if (!(i >= 0 && mal(i))) {                       // sin casilla útil seleccionada: elige la más fácil
    let mejor = [], p = 10;
    for (let k = 0; k < 81; k++) if (mal(k)) { const c = POP(candidatos(S.cur, k)); if (c < p) { p = c; mejor = [k]; } else if (c === p) mejor.push(k); }
    if (!mejor.length) return;
    i = mejor[Math.random() * mejor.length | 0];
  }
  push(); S.cur[i] = S.sol[i]; S.notas[i] = 0; for (const j of PARES[i]) S.notas[j] &= ~(1 << S.sol[i]);
  S.sel = i; S.pistas++; api.sonido('ok'); pintar(); guardar();
}

/* ---------- pintado (los botones se reutilizan: no se pierde el foco del teclado) ---------- */
function pintar() {
  if (!S) return;
  const errores = api.pref('errores', false), sv = S.sel >= 0 ? S.cur[S.sel] : 0;
  const ok = completo(S);
  if (ok && !S.done) {
    S.done = true; crono.detener(); S.t = crono.s;
    api.registrar({ res: 'victoria', tiempo: S.t, variante: LVL[S.level], limpio: S.pistas === 0 });
    api.sonido('ganar'); api.vibrar([60, 40, 60]); guardar();
  }
  for (let i = 0; i < 81; i++) {
    const v = S.cur[i]; let c = S.given[i] ? 'g' : 'u';
    if (S.sel >= 0 && i !== S.sel && PARES[S.sel].includes(i)) c += ' p';
    if (sv && v === sv) c += ' m';
    if (conflicto(S, i)) c += ' x'; else if (errores && v && !S.given[i] && v !== S.sol[i]) c += ' e';
    if (i === S.sel) c += ' s';
    const b = cel[i]; b.className = c;
    if (v) { if (b.dataset.k !== 'v' + v) { b.textContent = v; b.dataset.k = 'v' + v; } }
    else { const k = 'n' + S.notas[i]; if (b.dataset.k !== k) { b.dataset.k = k; b.innerHTML = S.notas[i] ? `<span class="nt">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<i>${S.notas[i] & (1 << n) ? n : ''}</i>`).join('')}</span>` : ''; } }
    b.setAttribute('aria-label', `Fila ${(i / 9 | 0) + 1}, columna ${i % 9 + 1}, ${v ? (S.given[i] ? 'dato ' : '') + v : S.notas[i] ? 'con notas' : 'vacía'}`);
  }
  const cuenta = new Array(10).fill(0); S.cur.forEach(v => { if (v) cuenta[v]++; });
  document.querySelectorAll('#sdPad [data-n]').forEach(b => { const n = +b.dataset.n; if (!n) return; const rest = Math.max(0, 9 - cuenta[n]); b.querySelector('small').textContent = rest; b.disabled = rest === 0 || S.done; });
  document.querySelectorAll('#sdNiv [data-niv]').forEach(b => b.classList.toggle('on', b.dataset.niv === S.level));
  const bn = document.querySelector('[data-ac="notas"]'); bn.classList.toggle('on', notasOn); bn.setAttribute('aria-pressed', String(notasOn));
  $('#sdInfo').textContent = `${LVL[S.level]} · ${rellenas(S)}/81${S.pistas ? ` · ${S.pistas} pista${S.pistas > 1 ? 's' : ''}` : ''}`;
  $('#sdCrono').textContent = fmtTiempo(S.t);
  const m = $('#sdMsg');
  m.className = 'msg' + (S.done ? ' win' : ''); m.textContent = S.done ? `¡Sudoku completado en ${fmtTiempo(S.t)}!` : notasOn ? 'Modo notas: los números se anotan como candidatos.' : 'Toca una casilla y elige un número.';
}

/* ---------- entrada ---------- */
function clic(e) {
  const b = e.target.closest('button'); if (!b || !S) return;
  if (b.dataset.i != null) { S.sel = +b.dataset.i; return pintar(); }
  if (b.dataset.n != null) return poner(+b.dataset.n);
  if (b.dataset.niv) return nuevo(b.dataset.niv);
  const ac = b.dataset.ac;
  if (ac === 'notas') { notasOn = !notasOn; pintar(); }
  else if (ac === 'undo') deshacer();
  else if (ac === 'pista') pista();
  else if (ac === 'nuevo') nuevo(S.level);
  else if (ac === 'reglas') reglas();
}
function teclado(e) {
  if (!S || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('.modal')) return;
  if (/^[0-9]$/.test(e.key)) poner(+e.key);
  else if (e.key === 'Backspace' || e.key === 'Delete') poner(0);
  else if (e.key === 'n' || e.key === 'N') { notasOn = !notasOn; pintar(); }
  else if (e.key === 'z' || e.key === 'Z') deshacer();
  else if (e.key.startsWith('Arrow')) {
    e.preventDefault();
    const base = S.sel < 0 ? 0 : S.sel, r = base / 9 | 0, c = base % 9;
    const nr = Math.min(8, Math.max(0, r + ({ ArrowUp: -1, ArrowDown: 1 }[e.key] || 0))), nc = Math.min(8, Math.max(0, c + ({ ArrowLeft: -1, ArrowRight: 1 }[e.key] || 0)));
    S.sel = nr * 9 + nc; pintar(); cel[S.sel].focus({ preventScroll: true });
  }
}
function reglas() {
  api.modal('Sudoku', `<ul>
    <li>Rellena la cuadrícula para que cada fila, columna y caja de 3×3 contenga los números del 1 al 9.</li>
    <li>Todos los tableros tienen <b>una única solución</b>: nunca hace falta adivinar.</li>
    <li><b>Notas</b>: anota candidatos a lápiz; al poner un número se borran solos en su fila, columna y caja.</li>
    <li>La <b>Pista</b> rellena la casilla elegida (o la más fácil si no hay ninguna). Con pistas no cuenta el récord de tiempo.</li>
    <li>El número pequeño de cada tecla indica cuántos te quedan por colocar.</li>
    <li>Teclado: 1-9, Borrar, flechas, <kbd>N</kbd> notas, <kbd>Z</kbd> deshacer.</li></ul>`);
}
