// Kakuro: «crucigrama de sumas». Mismo formato que Calcudoku y Sudoku: tamaño y nivel, notas, deshacer guardado,
// pista, comprobar, errores automáticos, reto del día y 🎨 Apariencia. Ayuda propia: las combinaciones de cada suma.
import { $, fmtTiempo } from '../../core/dom.js';
import { Pila } from '../../core/undo.js';
import { Cronometro } from '../../core/cronometro.js';
import { grupoTablero, grupoFondo } from '../../core/aspectos.js';
import { enSegundoPlano } from '../../core/ia/remoto.js';
import { TAMANOS, DIFICULTADES, tiras, combinaciones, cifras, generarTrabajo } from './generador.js';

const GEN = new URL('./generador.js', import.meta.url).href, RETO = { n: 8, dif: 'medio' };
let S = null, api = null, asp = null, root = null, crono = null, hist = null, cel = [], ocupado = false, notasOn = false, onKey = null, ts = [], runsDe = [], malas = new Set(), serie = 0, altoComb = 0;

/* ---------- validación / resumen ---------- */
const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
export function validar(d) {
  if (!d || typeof d !== 'object' || !TAMANOS.includes(d.n) || !Object.hasOwn(DIFICULTADES, d.dif)) return null;
  const n = d.n, N = n * n;
  if (!Array.isArray(d.negra) || d.negra.length !== N || !Array.isArray(d.sol) || d.sol.length !== N || !Array.isArray(d.pista) || d.pista.length !== N) return null;
  const negra = d.negra.map(Boolean);
  for (let i = 0; i < n; i++) if (!negra[i] || !negra[i * n]) return null;
  if (!d.sol.every((v, i) => (negra[i] ? v === 0 : ent(v, 1, 9)))) return null;
  const t = tiras(n, negra);
  for (const r of t) {                                         // cada tira: sin repetidos y la suma de la pista
    const vs = r.celdas.map(i => d.sol[i]), p = d.pista[r.pista];
    if (r.celdas.length < 2 || new Set(vs).size !== vs.length || !p || p[r.dir === 'h' ? 'derecha' : 'abajo'] !== vs.reduce((a, b) => a + b, 0)) return null;
  }
  const lim = (1 << 10) - 1;
  if (!Array.isArray(d.cur) || d.cur.length !== N || !d.cur.every((v, i) => (negra[i] ? v === 0 : ent(v, 0, 9)))) return null;
  const notas = Array.isArray(d.notas) && d.notas.length === N && d.notas.every(v => ent(v, 0, lim)) ? d.notas.slice() : new Array(N).fill(0);
  const hist = Array.isArray(d.hist) ? d.hist.filter(h => h && Array.isArray(h.cur) && h.cur.length === N && h.cur.every((v, i) => (negra[i] ? v === 0 : ent(v, 0, 9))) && Array.isArray(h.notas) && h.notas.length === N && h.notas.every(v => ent(v, 0, lim))).slice(-60) : [];
  const pista = d.pista.map((p, i) => (negra[i] && p ? { abajo: ent(p.abajo, 0, 45) ? p.abajo : 0, derecha: ent(p.derecha, 0, 45) ? p.derecha : 0 } : null));
  return { done: d.sol.every((v, i) => negra[i] || d.cur[i] === v), n, dif: d.dif, negra, pista, sol: d.sol.slice(), cur: d.cur.slice(), notas, hist, t: ent(d.t, 0, 1e7) ? d.t : 0, pistas: ent(d.pistas, 0, 1e5) ? d.pistas : 0,
    reto: typeof d.reto === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.reto) ? d.reto : null };
}
export const migrarV1 = d => d;
const blancas = d => d.negra.reduce((a, b) => a + (b ? 0 : 1), 0);
const completo = d => d.sol.every((v, i) => d.negra[i] || d.cur[i] === v);
export function resumen(d) {
  const ok = completo(d), lle = d.cur.filter(Boolean).length, pre = d.reto ? '📅 Reto · ' : '';
  return { texto: pre + `${d.n}×${d.n} · ${DIFICULTADES[d.dif].nombre} · ${ok ? 'resuelto' : `${lle}/${blancas(d)}`}`, fin: ok };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; notasOn = false; ocupado = false; malas = new Set();
  asp = api.aspecto([grupoFondo('#kaTab'), grupoTablero(), { clave: 'negras', titulo: 'Casillas de las sumas', def: 'oscuras', opciones: [{ id: 'oscuras', nombre: 'Oscuras', sw: ['#1B2340'] }, { id: 'tablero', nombre: 'Color del tablero', sw: ['#6A3DF0'] }, { id: 'claras', nombre: 'Claras', sw: ['#D7DCEB'] }] },
    { clave: 'numeros', titulo: 'Números', def: 'redondo', opciones: [{ id: 'redondo', nombre: 'Redondos' }, { id: 'clasico', nombre: 'Clásicos' }] }]);
  await api.css(new URL('./kakuro.css', import.meta.url));
  const g = api.cargar();
  S = g ? { ...g, sel: primeraBlanca(g) } : null;
  hist = new Pila(60, g ? g.hist : []);
  root.innerHTML = `<div id="kaReto"></div>
    <div class="info"><span class="mut" id="kaInfo"></span><span id="kaCrono" aria-label="Tiempo">0:00</span></div>
    <div class="ka" id="kaTab" role="group" aria-label="Tablero de Kakuro"></div>
    <div class="msg" id="kaMsg" role="status" aria-live="polite"></div>
    <div class="kpad" id="kaPad" style="--n2:5"></div>
    <div class="kpad" id="kaAcc" style="--n2:4"><button class="acc" data-ac="notas" aria-pressed="false">✏️ Notas</button><button class="acc" data-ac="undo">↶ Deshacer</button><button class="acc" data-ac="pista">💡 Pista</button><button class="acc" data-ac="comprobar">✔ Comprobar</button></div>
    <div class="kacomb" id="kaComb" aria-live="polite"></div>${api.barraHtml()}`;
  root.addEventListener('click', clic);
  onKey = teclado; document.addEventListener('keydown', onKey);
  api.barra({ nueva: () => nueva(S.n, S.dif, false, true),
    salir: () => { location.hash = '#/cat/logica'; },
    crono: () => crono,
    config: { valores: () => ({ n: S.n, dif: S.dif }), grupos: v => [{ clave: 'n', titulo: 'Tamaño', opciones: TAMANOS.map(t => [t, `${t}×${t}`]) }, { clave: 'dif', titulo: 'Nivel', nota: (DIFICULTADES[v.dif] || {}).ayuda, opciones: Object.entries(DIFICULTADES).map(([k, x]) => [k, x.nombre]) }], aplicar: v => nueva(v.n, v.dif, true, true) } });
  menu();
  crono = new Cronometro(() => { if (S) { S.t = crono.s; $('#kaCrono').textContent = fmtTiempo(crono.s); if (crono.s % 15 === 0) guardar(); } });
  if (!S) { await nueva(api.pref('n', 8), api.pref('dif', 'medio'), true); }
  else { preparar(); construir(); arrancar(); pintar(); }
}
function menu() {
  api.menu([{ texto: 'Nuevo panel', accion: () => nueva(S ? S.n : 8, S ? S.dif : 'medio', false, true) }, { texto: '📅 Reto del día', accion: () => nueva(RETO.n, RETO.dif, false, true, true) },
    { texto: 'Comprobar', accion: comprobar }, { texto: 'Marcar errores automáticamente', accion: () => { api.setPref('errores', !api.pref('errores', false)); pintar(); menu(); }, activo: api.pref('errores', false) },
    { texto: 'Mostrar combinaciones', accion: () => { api.setPref('combos', !api.pref('combos', true)); pintar(); menu(); }, activo: api.pref('combos', true) },
    { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
}
export function unmount() {
  serie++;
  if (S && crono) { S.t = crono.s; guardar(); }
  if (crono) crono.detener();
  document.removeEventListener('keydown', onKey);
  if (root) root.removeEventListener('click', clic);
  S = null; crono = null; cel = []; asp = null;
}
function arrancar() { crono.s = S.t; if (!completo(S)) crono.iniciar(); else crono.detener(); $('#kaCrono').textContent = fmtTiempo(S.t); }
const primeraBlanca = d => d.negra.findIndex(b => !b);

/* ---------- partida ---------- */
const hayProgreso = () => S && !completo(S) && S.cur.some(Boolean);
async function nueva(n, dif, forzar = false, cerrar = false, reto = false) {
  if (ocupado) return;
  if (reto && S && S.reto === api.reto.fecha()) { api.aviso(completo(S) ? 'Ya has completado el reto de hoy' : 'Ya estás jugando el reto de hoy'); return; }
  if (!forzar && hayProgreso() && !api.confirmar('¿Empezar un panel nuevo? Perderás el actual.')) return;
  ocupado = true; const tok = ++serie; if (crono) crono.detener();
  $('#kaMsg').className = 'msg'; $('#kaMsg').textContent = '🧮 Generando un panel con solución única…';
  const semilla = reto ? `${api.reto.fecha()}:kakuro` : null;
  const p = await enSegundoPlano(GEN, 'generarTrabajo', [n, dif, 2500, semilla], generarTrabajo);       // en un Worker
  if (tok !== serie || !root) return;
  ocupado = false;
  if (!p) { api.aviso('No se pudo generar el panel: prueba otra vez'); return; }
  S = { n, dif, negra: p.negra, pista: p.pista, sol: p.sol, cur: p.sol.map(() => 0), notas: p.sol.map(() => 0), t: 0, pistas: 0, sel: p.negra.findIndex(b => !b), reto: reto ? api.reto.fecha() : null };
  if (!reto) { api.setPref('n', n); api.setPref('dif', dif); }
  hist.vaciar(); malas = new Set(); notasOn = false;
  crono = new Cronometro(crono.alTick, 0);
  preparar(); construir(); arrancar(); pintar(); guardar();
  }
function guardar() { if (!S) return; const d = { n: S.n, dif: S.dif, negra: S.negra, pista: S.pista, sol: S.sol, cur: S.cur, notas: S.notas, t: S.t, pistas: S.pistas, reto: S.reto || null, hist: hist ? hist.toJSON().slice(-60) : [] }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }
function preparar() {
  altoComb = 0;
  ts = tiras(S.n, S.negra).map(t => ({ ...t, suma: S.pista[t.pista][t.dir === 'h' ? 'derecha' : 'abajo'] }));
  runsDe = Array.from({ length: S.n * S.n }, () => []); ts.forEach((t, k) => t.celdas.forEach(i => runsDe[i].push(k)));
}
const push = () => hist.push({ cur: S.cur.slice(), notas: S.notas.slice() });
function pintarReto() {
  const r = $('#kaReto'); if (!r || !S) return;
  const hoy = api.reto.fecha(), hecho = api.reto.hecho(), jugando = S.reto === hoy, k = `${hoy}|${hecho}|${jugando}`;
  if (r.dataset.k === k) return; r.dataset.k = k;
  r.innerHTML = `<div class="reto ${hecho ? 'hecho' : ''}"><span>${hecho ? '✅' : '📅'}</span><div><b>Reto del día · ${api.reto.texto(hoy)}</b>${hecho ? 'Completado. Vuelve mañana para otro.' : jugando ? 'Estás jugando el reto: el mismo panel para todo el mundo.' : `Un ${RETO.n}×${RETO.n} de nivel ${DIFICULTADES[RETO.dif].nombre.toLowerCase()}, el mismo para todos hoy.`}</div>${hecho || jugando ? '' : '<button class="btn on" data-ac="reto">Jugar</button>'}</div>`;
}

/* ---------- pintado ---------- */
function construir() {
  const n = S.n, g = $('#kaTab'); g.style.setProperty('--n', n);
  g.innerHTML = Array.from({ length: n * n }, (_, i) => {
    if (S.negra[i]) {
      const p = S.pista[i];
      return `<div class="kn0${p && (p.abajo || p.derecha) ? ' clave' : ''}" aria-hidden="true">${p && p.derecha ? `<span class="pd">${p.derecha}</span>` : ''}${p && p.abajo ? `<span class="pa">${p.abajo}</span>` : ''}</div>`;
    }
    return `<button type="button" class="kb" data-i="${i}"><span class="kv"></span><span class="knt"></span></button>`;
  }).join('');
  cel = [...g.children];
  $('#kaPad').innerHTML = Array.from({ length: 9 }, (_, v) => `<button data-v="${v + 1}" aria-label="Poner ${v + 1}">${v + 1}</button>`).join('') + '<button data-v="0" aria-label="Borrar">⌫</button>';
}
function pintar() {
  if (!S) return;
  pintarReto();
  const n = S.n, N = n * n, auto = api.pref('errores', false), hecho = completo(S);
  if (hecho && !S.done) {
    S.done = true; crono.detener(); S.t = crono.s;
    api.registrar({ res: 'victoria', tiempo: S.t, variante: S.reto ? 'Reto del día' : `${n}×${n} ${DIFICULTADES[S.dif].nombre}`, limpio: S.pistas === 0 });
    if (S.reto && api.reto.completar(S.reto)) setTimeout(() => api.aviso('📅 ¡Reto del día completado!'), 300);
    api.sonido('ganar'); api.vibrar([60, 40, 60]); guardar();
  }
  // repetidos en una tira y tiras completas que no suman lo que piden
  const dup = new Set(), tmal = new Set(), selRuns = new Set(runsDe[S.sel] || []);
  ts.forEach((t, k) => {
    const vs = t.celdas.map(i => S.cur[i]);
    t.celdas.forEach((i, a) => { if (vs[a] && vs.indexOf(vs[a]) !== a) { dup.add(i); dup.add(t.celdas[vs.indexOf(vs[a])]); } });
    if (vs.every(Boolean) && vs.reduce((x, y) => x + y, 0) !== t.suma) tmal.add(k);
  });
  for (let i = 0; i < N; i++) {
    if (S.negra[i]) continue;
    const b = cel[i], v = S.cur[i], x = dup.has(i) || (v && (malas.has(i) || (auto && v !== S.sol[i]))), enSel = runsDe[i].some(k => selRuns.has(k));
    b.className = 'kb' + (i === S.sel ? ' s' : enSel ? ' p' : '') + (x ? ' x' : '') + (runsDe[i].some(k => tmal.has(k)) ? ' jx' : '') + (hecho ? ' ok' : '');
    const kv = b.querySelector('.kv'); if (kv.textContent !== (v ? String(v) : '')) kv.textContent = v || '';
    const kn = b.querySelector('.knt'), notas = !v && S.notas[i] ? cifras(S.notas[i]).join(' ') : '';
    if (kn.dataset.k !== notas) { kn.dataset.k = notas; kn.innerHTML = notas ? [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<i>${S.notas[i] & (1 << d) ? d : ''}</i>`).join('') : ''; }
    const [h, vv] = ['h', 'v'].map(dir => ts[runsDe[i].find(k => ts[k].dir === dir)]);
    b.setAttribute('aria-label', `Fila ${(i / n | 0)}, columna ${i % n}${h ? `, suma horizontal ${h.suma} en ${h.celdas.length}` : ''}${vv ? `, suma vertical ${vv.suma} en ${vv.celdas.length}` : ''}, ${v ? 'valor ' + v : 'vacía'}`);
  }
  // marca las sumas de las tiras de la casilla elegida
  cel.forEach((c, i) => { if (S.negra[i]) c.classList.toggle('activa', ts.some((t, k) => selRuns.has(k) && t.pista === i)); });
  pintarCombinaciones();
  const lle = S.cur.filter(Boolean).length;
  $('#kaInfo').textContent = `${lle}/${blancas(S)} casillas${S.pistas ? ` · ${S.pistas} pista${S.pistas > 1 ? 's' : ''}` : ''}`;
  $('#kaCrono').textContent = fmtTiempo(S.t);
  document.querySelectorAll('#kaPad [data-v]').forEach(b => { b.disabled = hecho; });
  const bn = root.querySelector('[data-ac="notas"]'); bn.classList.toggle('on', notasOn); bn.setAttribute('aria-pressed', String(notasOn));
  const m = $('#kaMsg'); m.className = 'msg' + (hecho ? ' win' : '');
  m.textContent = hecho ? `¡Panel resuelto en ${fmtTiempo(S.t)}!` : notasOn ? 'Modo notas: los números se anotan a lápiz.' : 'Cada tira suma el número de su pista, con cifras del 1 al 9 sin repetir.';
}
// Ayuda propia del Kakuro: las combinaciones posibles de las dos sumas de la casilla elegida (tachadas las que ya no encajan)
function combHtml(i, marcar) {
  return runsDe[i].map(k => {
    const t = ts[k], puestos = marcar ? t.celdas.map(j => S.cur[j]).filter(Boolean) : [], lista = combinaciones(t.suma, t.celdas.length);
    return `<div><b>${t.dir === 'h' ? '→' : '↓'} ${t.suma} en ${t.celdas.length}</b>${lista.map(m => { const ds = cifras(m), vale = puestos.every(v => ds.includes(v)); return `<span class="${vale ? '' : 'no'}">${ds.join('')}</span>`; }).join('')}</div>`;
  }).join('');
}
// Altura de la caja = la que necesita la casilla con más combinaciones de este panel: así caben todas sin scroll y nada se mueve
function medirCombinaciones(c) {
  const m = document.createElement('div'); m.className = 'kacomb'; m.style.cssText = `position:absolute;visibility:hidden;height:auto;overflow:visible;left:0;top:0;width:${c.clientWidth}px`;
  const hs = []; S.negra.forEach((neg, i) => { if (!neg) { const w = document.createElement('div'); w.style.cssText = 'display:flex;flex-direction:column;gap:4px'; w.innerHTML = combHtml(i, false); m.append(w); hs.push(w); } });
  c.parentNode.append(m); const alto = Math.max(...hs.map(w => w.offsetHeight), 0); m.remove(); return alto + 2;
}
function pintarCombinaciones() {
  const c = $('#kaComb'); if (!c) return;
  if (!api.pref('combos', true)) { c.innerHTML = ''; c.style.height = '0px'; c.style.margin = '0'; return; }
  c.style.margin = '';
  if (!S || completo(S) || S.negra[S.sel]) { c.innerHTML = ''; return; }
  if (!altoComb || altoComb.w !== c.clientWidth) altoComb = { w: c.clientWidth, h: medirCombinaciones(c) };
  c.style.height = altoComb.h + 'px';
  c.innerHTML = combHtml(S.sel, true);
}

/* ---------- entrada ---------- */
function poner(v) {
  if (!S || completo(S) || S.negra[S.sel]) return; const i = S.sel;
  if (notasOn && v) { if (S.cur[i]) return; push(); S.notas[i] ^= 1 << v; }
  else { if (S.cur[i] === v) return; push(); S.cur[i] = v; S.notas[i] = 0; malas.delete(i); api.sonido(v ? 'click' : 'mover'); }
  pintar(); guardar();
}
function deshacer() { if (!S || completo(S)) return; const h = hist.pop(); if (!h) { api.aviso('Nada que deshacer'); return; } S.cur = h.cur; S.notas = h.notas; malas = new Set(); pintar(); guardar(); }
function comprobar() {
  if (!S || completo(S)) return; malas = new Set(S.cur.map((v, i) => (v && v !== S.sol[i] ? i : -1)).filter(i => i >= 0));
  api.aviso(malas.size ? `${malas.size} casilla${malas.size > 1 ? 's' : ''} incorrecta${malas.size > 1 ? 's' : ''}` : '¡Todo lo escrito es correcto!'); api.sonido(malas.size ? 'error' : 'ok'); pintar();
}
function pista() {
  if (!S || completo(S)) return;
  let i = S.sel; if (S.negra[i] || S.cur[i] === S.sol[i]) { const c = S.cur.map((v, k) => (!S.negra[k] && v !== S.sol[k] ? k : -1)).filter(k => k >= 0); if (!c.length) return; i = c[Math.random() * c.length | 0]; S.sel = i; }
  push(); S.cur[i] = S.sol[i]; S.notas[i] = 0; malas.delete(i); S.pistas++; api.sonido('ok'); pintar(); guardar();
}
function mover(dr, dc) {
  const n = S.n; let r = S.sel / n | 0, c = S.sel % n;
  for (let k = 0; k < n; k++) { r = Math.min(n - 1, Math.max(0, r + dr)); c = Math.min(n - 1, Math.max(0, c + dc)); if (!S.negra[r * n + c]) { S.sel = r * n + c; break; } }
  pintar();
}
function teclado(e) {
  if (!S || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('.modal') || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (/^[1-9]$/.test(e.key)) poner(+e.key);
  else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') poner(0);
  else if (e.key === 'n' || e.key === 'N') { notasOn = !notasOn; pintar(); }
  else if (e.key === 'z' || e.key === 'Z') deshacer();
  else if (e.key.startsWith('Arrow')) { e.preventDefault(); mover({ ArrowUp: -1, ArrowDown: 1 }[e.key] || 0, { ArrowLeft: -1, ArrowRight: 1 }[e.key] || 0); }
}
function clic(e) {
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.ac === 'reto') return nueva(RETO.n, RETO.dif, false, true, true);
  if (d.ac === 'aspecto') return asp.abrir();
  if (!S) return;
  if (b.classList.contains('kb')) { S.sel = +d.i; return pintar(); }
  if (d.v != null) return poner(+d.v);
  if (d.n) return nueva(+d.n, S.dif); if (d.dif) return nueva(S.n, d.dif);
  const ac = d.ac;
  if (ac === 'notas') { notasOn = !notasOn; pintar(); } else if (ac === 'undo') deshacer(); else if (ac === 'pista') pista(); else if (ac === 'comprobar') comprobar(); else if (ac === 'nuevo') nueva(S.n, S.dif, false, true);
}
function reglas() {
  api.modal('Kakuro', `<ul><li>Es un <b>crucigrama de sumas</b>: rellena las casillas blancas con cifras del <b>1 al 9</b>.</li>
    <li>Cada casilla oscura con números da la suma de una <b>tira</b>: el número de arriba a la derecha es la suma de las casillas que tiene a su derecha, y el de abajo a la izquierda, la de las que tiene debajo.</li>
    <li>En una misma tira <b>no se repite ninguna cifra</b>. Por ejemplo, 4 en dos casillas solo puede ser 1 + 3.</li>
    <li>🧮 Debajo del tablero ves las <b>combinaciones posibles</b> de las dos sumas de la casilla elegida; las tachadas ya no encajan con lo que has puesto (se puede ocultar en el menú ⋯).</li>
    <li>✏️ <b>Notas</b> para anotar candidatos, ↶ <b>Deshacer</b> (se guarda con la partida), ✔ <b>Comprobar</b> marca los errores y 💡 <b>Pista</b> rellena una casilla (con pistas no cuenta el récord).</li>
    <li>Todos los paneles tienen <b>una única solución</b>. En Fácil basta con razonar las combinaciones; en Difícil hay que cruzar varias tiras a la vez.</li></ul>`);
}
