import { $, esperar, fmtTiempo } from '../../core/dom.js';
import { Pila } from '../../core/undo.js';
import { Cronometro } from '../../core/cronometro.js';
import { grupoTableroDN, grupoColoresNumeros } from '../../core/aspectos.js';
import { TAMANOS, DIFICULTADES, generar, evaluar, vecinos } from './motor.js';

let S = null, api = null, asp = null, root = null, crono = null, hist = null, cel = [], ocupado = false, onKey = null, malas = new Set(), ev = null;

/* ---------- validación / resumen ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || !TAMANOS.includes(d.n) || !Object.hasOwn(DIFICULTADES, d.dif)) return null;
  const n = d.n, N = n * n, ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, arr = (a, f) => Array.isArray(a) && a.length === N && a.every(f);
  if (!arr(d.muro, v => v === 0 || v === 1) || !arr(d.num, v => ent(v, -1, 4)) || !arr(d.sol, v => v === 0 || v === 1) || !arr(d.cur, v => ent(v, 0, 2))) return null;
  for (let i = 0; i < N; i++) { if (!d.muro[i] && d.num[i] >= 0) return null; if (d.muro[i] && d.sol[i]) return null; if (d.muro[i] && d.cur[i]) return null; }
  const p = { n, muro: d.muro, num: d.num };
  if (!evaluar(p, d.sol).completo) return null;                       // la solución guardada debe ser válida
  const hist = Array.isArray(d.hist) ? d.hist.filter(h => Array.isArray(h) && h.length === N && h.every(v => ent(v, 0, 2))).slice(-60) : [];
  return { n, dif: d.dif, muro: d.muro.slice(), num: d.num.slice(), sol: d.sol.slice(), cur: d.cur.slice(), t: ent(d.t, 0, 1e7) ? d.t : 0, pistas: ent(d.pistas, 0, 1e5) ? d.pistas : 0, hist,
    reto: typeof d.reto === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.reto) ? d.reto : null };
}
export const migrarV1 = d => d;
const bombillas = c => c.map(v => (v === 1 ? 1 : 0));
const completo = d => evaluar(d, bombillas(d.cur)).completo;
export function resumen(d) {
  const ok = completo(d), nb = d.cur.filter(v => v === 1).length, pre = d.reto ? '📅 Reto · ' : '';
  return { texto: pre + (ok ? `${d.n}×${d.n} · ${DIFICULTADES[d.dif].nombre} · resuelto` : `${d.n}×${d.n} · ${DIFICULTADES[d.dif].nombre} · ${nb} bombilla${nb === 1 ? '' : 's'}`), fin: ok };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; ocupado = false; malas = new Set();
  asp = api.aspecto([grupoTableroDN(), grupoColoresNumeros()], () => { if (S) pintar(); });
  await api.css(new URL('./akari.css', import.meta.url));
  const g = api.cargar();
  S = g ? { ...g, sel: 0 } : null;
  hist = new Pila(80, g ? g.hist : []);
  root.innerHTML = `<div id="akReto"></div>
    <div class="info"><span class="mut" id="akInfo"></span><span id="akCrono" aria-label="Tiempo">0:00</span></div>
    <div class="ak" id="akTab" role="group" aria-label="Tablero de Akari"></div>
    <div class="msg" id="akMsg" role="status" aria-live="polite"></div>
    <div class="kpad" id="akAcc" style="--n2:3"><button class="acc" data-ac="undo">↶ Deshacer</button><button class="acc" data-ac="pista">💡 Pista</button><button class="acc" data-ac="comprobar">✔ Comprobar</button></div>${api.barraHtml()}`;
  root.addEventListener('click', clic);
  onKey = teclado; document.addEventListener('keydown', onKey);
  api.barra({ nueva: () => nueva(S.n, S.dif, false, true),
    salir: () => { location.hash = '#/cat/logica'; },
    crono: () => crono,
    config: { valores: () => ({ n: S.n, dif: S.dif }), grupos: v => [{ clave: 'n', titulo: 'Tamaño', opciones: TAMANOS.map(t => [t, `${t}×${t}`]) }, { clave: 'dif', titulo: 'Nivel', nota: (DIFICULTADES[v.dif] || {}).ayuda, opciones: Object.entries(DIFICULTADES).map(([k, x]) => [k, x.nombre]) }], aplicar: v => nueva(v.n, v.dif, true, true) } });
  menu();
  crono = new Cronometro(() => { if (S) { S.t = crono.s; $('#akCrono').textContent = fmtTiempo(crono.s); if (crono.s % 15 === 0) guardar(); } });
  if (!S) await nueva(api.pref('n', 7), api.pref('dif', 'medio'), true);
  else { construir(); arrancar(); pintar(); }
}
const RETO = { n: 7, dif: 'medio' };
function menu() { api.menu([{ texto: 'Nuevo panel', accion: () => nueva(S.n, S.dif, false, true) }, { texto: '📅 Reto del día', accion: () => nueva(RETO.n, RETO.dif, false, true, true) }, { texto: 'Comprobar', accion: comprobar }, { texto: 'Marcar errores al instante', accion: () => { api.setPref('errores', !api.pref('errores', false)); pintar(); menu(); }, activo: api.pref('errores', false) }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: '📖 Reglas', accion: reglas }]); }
export function unmount() {
  if (S && crono) { S.t = crono.s; guardar(); }
  if (crono) crono.detener();
  document.removeEventListener('keydown', onKey);
  if (root) root.removeEventListener('click', clic);
  S = null; crono = null; cel = []; asp = null; ev = null;
}
function arrancar() { crono.s = S.t; if (!S.done) crono.iniciar(); else crono.detener(); $('#akCrono').textContent = fmtTiempo(S.t); }

/* ---------- imágenes (variables CSS, con el color elegido) ---------- */

/* ---------- partida ---------- */
const hayProgreso = () => S && !S.done && S.cur.some(Boolean);
async function nueva(n, dif, forzar = false, cerrar = false, reto = false) {
  if (ocupado) return;
  if (reto && S && S.reto === api.reto.fecha()) { api.aviso(S.done ? 'Ya has completado el reto de hoy' : 'Ya estás jugando el reto de hoy'); return; }
  if (!forzar && hayProgreso() && !api.confirmar('¿Empezar un panel nuevo? Perderás el actual.')) return;
  ocupado = true; if (crono) crono.detener();
  $('#akMsg').textContent = 'Generando panel…'; await esperar(30);
  const p = reto ? api.reto.generar(() => generar(n, dif)) : generar(n, dif);
  S = { n, dif, muro: p.muro, num: p.num, sol: p.sol, cur: new Array(n * n).fill(0), t: 0, pistas: 0, sel: 0, done: false, reto: reto ? api.reto.fecha() : null };
  if (!reto) { api.setPref('n', n); api.setPref('dif', dif); } hist.vaciar(); malas = new Set(); ocupado = false;
  crono = new Cronometro(crono.alTick, 0);
  construir(); arrancar(); pintar(); guardar();
}
function guardar() { if (!S) return; const d = { n: S.n, dif: S.dif, muro: S.muro, num: S.num, sol: S.sol, cur: S.cur, t: S.t, pistas: S.pistas, reto: S.reto || null, hist: hist ? hist.toJSON().slice(-60) : [] }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }
function pintarReto() {
  const r = $('#akReto'); if (!r || !S) return;
  const hoy = api.reto.fecha(), hecho = api.reto.hecho(), jugando = S.reto === hoy, k = `${hoy}|${hecho}|${jugando}`;
  if (r.dataset.k === k) return; r.dataset.k = k;
  r.innerHTML = `<div class="reto ${hecho ? 'hecho' : ''}"><span>${hecho ? '✅' : '📅'}</span><div><b>Reto del día · ${api.reto.texto(hoy)}</b>${hecho ? 'Completado. Vuelve mañana para otro.' : jugando ? 'Estás jugando el reto: el mismo panel para todo el mundo.' : `Un ${RETO.n}×${RETO.n} de nivel ${DIFICULTADES[RETO.dif].nombre.toLowerCase()}, el mismo para todos hoy.`}</div>${hecho || jugando ? '' : '<button class="btn on" data-ac="reto">Jugar</button>'}</div>`;
}
const push = () => hist.push(S.cur.slice());

/* ---------- pintado ---------- */
function construir() {
  const n = S.n, g = $('#akTab'); g.style.setProperty('--n', n);
  g.innerHTML = Array.from({ length: n * n }, (_, i) => S.muro[i]
    ? `<div class="ac ${S.num[i] >= 0 ? 'mn' : 'm'}" data-i="${i}" data-d="${S.num[i]}">${S.num[i] >= 0 ? `<span class="an">${S.num[i]}</span>` : ''}</div>`
    : `<button type="button" class="ac" data-i="${i}"></button>`).join('');
  cel = [...g.children];
}
function pintar() {
  if (!S) return;
  pintarReto();
  const n = S.n, N = n * n, auto = api.pref('errores', false);
  ev = evaluar(S, bombillas(S.cur));
  if (!S.done && ev.completo) { S.done = true; crono.detener(); S.t = crono.s; api.registrar({ res: 'victoria', tiempo: S.t, variante: S.reto ? 'Reto del día' : `${n}×${n} ${DIFICULTADES[S.dif].nombre}`, limpio: S.pistas === 0 }); if (S.reto && api.reto.completar(S.reto)) setTimeout(() => api.aviso('📅 ¡Reto del día completado!'), 300); api.sonido('ganar'); api.vibrar([60, 40, 60]); guardar(); }
  let sinLuz = 0;
  for (let i = 0; i < N; i++) {
    const b = cel[i];
    if (S.muro[i]) {
      const c = ev.muroMal[i] ? ' x' : ev.muroOk[i] ? ' ok' : ''; const k = (S.num[i] >= 0 ? 'ac mn' : 'ac m') + c; if (b.className !== k) b.className = k; continue;
    }
    const v = S.cur[i], lit = ev.iluminada[i]; if (!lit) sinLuz++;
    const mal = (malas.has(i)) || (auto && ((v === 1 && !S.sol[i]) || (v === 2 && S.sol[i])));
    const k = 'ac' + (v === 1 ? (ev.conflicto[i] ? ' c' : ' b') : v === 2 ? ' k' : lit ? ' l' : '') + (lit && v !== 1 ? ' l' : '') + (i === S.sel ? ' s' : '') + (mal ? ' w' : '') + (S.done ? ' f' : '');
    if (b.className !== k) b.className = k;
    b.setAttribute('aria-label', `Fila ${(i / n | 0) + 1}, columna ${i % n + 1}, ${v === 1 ? 'bombilla' : v === 2 ? 'marcada sin bombilla' : lit ? 'iluminada' : 'oscura'}`);
  }
  const nb = S.cur.filter(v => v === 1).length;
  $('#akInfo').textContent = `${nb} bombilla${nb === 1 ? '' : 's'}${sinLuz ? ` · ${sinLuz} casilla${sinLuz === 1 ? '' : 's'} a oscuras` : ''}${S.pistas ? ` · ${S.pistas} pista${S.pistas > 1 ? 's' : ''}` : ''}`;
  $('#akCrono').textContent = fmtTiempo(S.t);
  const m = $('#akMsg'); m.className = 'msg' + (S.done ? ' win' : ''); m.textContent = S.done ? `¡Panel resuelto en ${fmtTiempo(S.t)}!` : 'Ilumina todas las casillas. Dos bombillas no pueden verse y los números cuentan las vecinas.';
}

/* ---------- entrada ---------- */
function ciclar(i, v) {
  if (!S || S.done || S.muro[i]) return;
  const nv = v == null ? (S.cur[i] + 1) % 3 : v; if (nv === S.cur[i]) return;
  push(); S.cur[i] = nv; malas.delete(i); api.sonido(nv === 1 ? 'click' : 'mover'); pintar(); guardar();
}
function deshacer() { if (!S || S.done) return; const h = hist.pop(); if (!h) { api.aviso('Nada que deshacer'); return; } S.cur = h; malas = new Set(); pintar(); guardar(); }
function comprobar() {
  if (!S || S.done) return; malas = new Set(S.cur.map((v, i) => ((v === 1 && !S.sol[i]) || (v === 2 && S.sol[i]) ? i : -1)).filter(i => i >= 0));
  api.aviso(malas.size ? `${malas.size} casilla${malas.size > 1 ? 's' : ''} mal puesta${malas.size > 1 ? 's' : ''}` : '¡Todo lo puesto es correcto!'); api.sonido(malas.size ? 'error' : 'ok'); pintar();
}
function pista() {
  if (!S || S.done) return;
  const malos = S.cur.map((v, i) => ((v === 1 && !S.sol[i]) || (v === 2 && S.sol[i]) ? i : -1)).filter(i => i >= 0);
  const faltan = S.sol.map((v, i) => (v && S.cur[i] !== 1 ? i : -1)).filter(i => i >= 0);
  const c = malos.length ? malos : faltan; if (!c.length) return;
  const i = c[Math.random() * c.length | 0]; push(); S.cur[i] = S.sol[i] ? 1 : 0; S.sel = i; malas.delete(i); S.pistas++; api.sonido('ok'); pintar(); guardar();
}
function teclado(e) {
  if (!S || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('.modal') || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const k = e.key.toLowerCase();
  if (k === 'z') deshacer();
  else if (k === 'b' || k === ' ' || k === 'enter') { e.preventDefault(); ciclar(S.sel, S.cur[S.sel] === 1 ? 0 : 1); }
  else if (k === 'x') ciclar(S.sel, S.cur[S.sel] === 2 ? 0 : 2);
  else if (k === 'backspace' || k === 'delete') ciclar(S.sel, 0);
  else if (k.startsWith('arrow')) { e.preventDefault(); const n = S.n, r = S.sel / n | 0, c = S.sel % n; const nr = Math.min(n - 1, Math.max(0, r + ({ arrowup: -1, arrowdown: 1 }[k] || 0))), nc = Math.min(n - 1, Math.max(0, c + ({ arrowleft: -1, arrowright: 1 }[k] || 0))); S.sel = nr * n + nc; pintar(); }
}
function clic(e) {
  if (!S) return; const celda = e.target.closest('.ac'); if (celda && celda.tagName === 'BUTTON') { const i = +celda.dataset.i; S.sel = i; return ciclar(i), pintar(); }
  const b = e.target.closest('button'); if (!b) return; const ac = b.dataset.ac;
  if (ac === 'undo') deshacer(); else if (ac === 'pista') pista(); else if (ac === 'comprobar') comprobar(); else if (ac === 'nuevo') nueva(S.n, S.dif, false, true); else if (ac === 'reto') nueva(RETO.n, RETO.dif, false, true, true); else if (ac === 'aspecto') asp.abrir();
}
function reglas() {
  api.modal('Akari', `<ul><li>Coloca <b>bombillas</b> 💡 en las casillas claras hasta <b>iluminar todas</b>. Cada bombilla ilumina su fila y su columna hasta chocar con un muro.</li>
    <li>Dos bombillas <b>no pueden iluminarse entre sí</b> (si se ven, se marcan en rojo).</li>
    <li>Un <b>número</b> en un muro dice cuántas bombillas hay en las <b>4 casillas pegadas</b> a él (arriba, abajo, izquierda y derecha). Un 0 no tiene ninguna.</li>
    <li>Toca una casilla para poner una bombilla; otro toque la marca con ✖ (aquí seguro que no hay bombilla) y otro la deja vacía. Con teclado: B bombilla, X marca, Z deshacer.</li>
    <li>✔ <b>Comprobar</b> señala lo mal puesto y 💡 <b>Pista</b> coloca o quita una bombilla (con pistas no cuenta el récord).</li>
    <li>Todos los paneles tienen una única solución. En 🎨 Apariencia eliges casillas (crema, lisas, madera o piedra) y su color.</li></ul>`);
}
