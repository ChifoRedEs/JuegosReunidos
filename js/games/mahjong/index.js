import { $, esperar, fmtTiempo } from '../../core/dom.js';
import { Pila } from '../../core/undo.js';
import { Cronometro } from '../../core/cronometro.js';
import { grupoFondo } from '../../core/aspectos.js';
import { DISTRIBUCIONES, posiciones, generar, mezclar, jugadas, libres, libre, casan, valida, emparejable } from './motor.js';

let S = null, api = null, asp = null, root = null, crono = null, hist = null, el = [], pos = [], ocupado = false, onKey = null, onRes = null, ayuda = null, pistaPar = null, ro = null, anim = false;
const IMG = new URL('../../../img/mahjong/', import.meta.url).href;
const DX = .3, DY = .36;                                 // desplazamiento de cada altura (en medias fichas, ancho / alto)
const ALTO = 1.38;                                       // alto de una ficha respecto a su ancho

/* ---------- validación / resumen ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || !Object.hasOwn(DISTRIBUCIONES, d.id)) return null;
  const N = posiciones(d.id).length;
  if (!Array.isArray(d.caras) || d.caras.length !== N || !d.caras.every(valida) || !Array.isArray(d.vivo) || d.vivo.length !== N || !d.vivo.every(v => v === true || v === false)) return null;
  if (!emparejable(d.caras, d.vivo) || d.vivo.filter(Boolean).length % 2) return null;
  const hist = Array.isArray(d.hist) ? d.hist.filter(h => Array.isArray(h) && h.length === 2 && h.every(k => Number.isInteger(k) && k >= 0 && k < N && d.vivo[k] === false)).slice(-200) : [];
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  return { id: d.id, caras: d.caras.slice(), vivo: d.vivo.slice(), hist, t: ent(d.t, 0, 1e7) ? d.t : 0, pistas: ent(d.pistas, 0, 1e5) ? d.pistas : 0, mezclas: ent(d.mezclas, 0, 1e4) ? d.mezclas : 0,
    reto: typeof d.reto === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.reto) ? d.reto : null };
}
export const migrarV1 = d => d;
const quedan = d => d.vivo.filter(Boolean).length;
export function resumen(d) {
  const q = quedan(d), pre = d.reto ? '📅 Reto · ' : '';
  return { texto: pre + (q === 0 ? `${DISTRIBUCIONES[d.id].nombre} · resuelto` : `${DISTRIBUCIONES[d.id].nombre} · ${q} fichas`), fin: q === 0 };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; ocupado = false; pistaPar = null; anim = false;
  asp = api.aspecto([{ ...grupoFondo('#mjTab'), def: 't-n-mahjong-jade' },
    { clave: 'vientos', titulo: 'Vientos', icono: '🧭', def: 'brujula', opciones: [{ id: 'brujula', nombre: 'Con brújula' }, { id: 'letras', nombre: 'Con letras' }] },
    { clave: 'zoom', titulo: 'Tamaño de fichas', icono: '🔎', def: 'ajustado', opciones: [{ id: 'ajustado', nombre: 'Ajustado a la pantalla' }, { id: 'grande', nombre: 'Grande (se desplaza)' }] },
    { clave: 'libres', titulo: 'Fichas atrapadas', icono: '🀄', def: 'atenuar', opciones: [{ id: 'atenuar', nombre: 'Se ven más oscuras' }, { id: 'igual', nombre: 'Todas iguales' }] }], () => { if (S) { construir(); pintar(); } });
  await api.css(new URL('./mahjong.css', import.meta.url));
  const g = api.cargar();
  S = g ? { ...g, sel: -1 } : null;
  hist = new Pila(200, []);
  root.innerHTML = `<div id="mjReto"></div>
    <div class="info"><span class="mut" id="mjInfo"></span><span id="mjCrono" aria-label="Tiempo">0:00</span></div>
    <div class="mj" id="mjTab" role="group" aria-label="Tablero de Mahjong"><div class="mjb" id="mjB"></div></div>
    <div class="msg" id="mjMsg" role="status" aria-live="polite"></div>
    <div class="kpad" id="mjAcc" style="--n2:3"><button class="acc" data-ac="undo">↶ Deshacer</button><button class="acc" data-ac="pista">💡 Pista</button><button class="acc" data-ac="mezclar">🔀 Mezclar</button></div>${api.barraHtml()}`;
  root.addEventListener('click', clic);
  onKey = teclado; document.addEventListener('keydown', onKey);
  onRes = () => ajustar(); addEventListener('resize', onRes);
  api.barra({ nueva: () => nueva(S.id, false, true), etiqueta: 'Nueva partida',
    salir: () => { location.hash = '#/cat/cartas'; },
    crono: () => crono,
    config: { valores: () => ({ id: S.id }), grupos: v => [{ clave: 'id', titulo: 'Distribución', nota: (DISTRIBUCIONES[v.id] || {}).ayuda, opciones: Object.entries(DISTRIBUCIONES).map(([k, x]) => [k, x.nombre]) }], aplicar: v => nueva(v.id, true, true) } });
  menu();
  crono = new Cronometro(() => { if (S) { S.t = crono.s; $('#mjCrono').textContent = fmtTiempo(crono.s); if (crono.s % 15 === 0) guardar(); } });
  if (!S) await nueva(api.pref('id', 'tortuga'), true);
  else { reconstruirHist(); construir(); arrancar(); pintar(); }
}
const RETO = { id: 'tortuga' };
function menu() { api.menu([{ texto: 'Nueva partida', accion: () => nueva(S.id, false, true) }, { texto: '📅 Reto del día', accion: () => nueva(RETO.id, false, true, true) }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: '📖 Reglas', accion: reglas }]); }
export function unmount() {
  if (S && crono) { S.t = crono.s; guardar(); }
  if (crono) crono.detener();
  document.removeEventListener('keydown', onKey); removeEventListener('resize', onRes);
  if (root) root.removeEventListener('click', clic);
  if (ro) ro.disconnect(); ro = null;
  S = null; crono = null; el = []; asp = null; pos = [];
}
function arrancar() { crono.s = S.t; if (!S.done) crono.iniciar(); else crono.detener(); $('#mjCrono').textContent = fmtTiempo(S.t); }
function reconstruirHist() { hist.vaciar(); for (const h of S.hist) hist.push(h); }

/* ---------- partida ---------- */
const hayProgreso = () => S && quedan(S) > 0 && S.hist.length > 0;
async function nueva(id, forzar = false, cerrar = false, reto = false) {
  if (ocupado) return;
  if (reto && S && S.reto === api.reto.fecha()) { api.aviso(quedan(S) ? 'Ya estás jugando el reto de hoy' : 'Ya has completado el reto de hoy'); return; }
  if (!forzar && hayProgreso() && !api.confirmar('¿Empezar una partida nueva? Perderás la actual.')) return;
  ocupado = true; if (crono) crono.detener();
  $('#mjMsg').textContent = 'Repartiendo fichas…'; await esperar(30);
  const p = reto ? api.reto.generar(() => generar(id)) : generar(id);
  S = { id, caras: p.caras, vivo: new Array(p.caras.length).fill(true), hist: [], t: 0, pistas: 0, mezclas: 0, sel: -1, done: false, reto: reto ? api.reto.fecha() : null };
  if (!reto) api.setPref('id', id); hist.vaciar(); pistaPar = null; ocupado = false;
  crono = new Cronometro(crono.alTick, 0);
  construir(); arrancar(); pintar(); guardar();
}
function guardar() { if (!S) return; const d = { id: S.id, caras: S.caras, vivo: S.vivo, hist: S.hist.slice(-200), t: S.t, pistas: S.pistas, mezclas: S.mezclas, reto: S.reto || null }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }
function pintarReto() {
  const r = $('#mjReto'); if (!r || !S) return;
  const hoy = api.reto.fecha(), hecho = api.reto.hecho(), jugando = S.reto === hoy, k = `${hoy}|${hecho}|${jugando}`;
  if (r.dataset.k === k) return; r.dataset.k = k;
  r.innerHTML = `<div class="reto ${hecho ? 'hecho' : ''}"><span>${hecho ? '✅' : '📅'}</span><div><b>Reto del día · ${api.reto.texto(hoy)}</b>${hecho ? 'Completado. Vuelve mañana para otro.' : jugando ? 'Estás jugando el reto: el mismo reparto para todo el mundo.' : 'La Tortuga de hoy, con el mismo reparto para todos.'}</div>${hecho || jugando ? '' : '<button class="btn on" data-ac="reto">Jugar</button>'}</div>`;
}

/* ---------- pintado ---------- */
const urlCara = f => {
  const v = asp && asp.valores.vientos === 'letras' && f.startsWith('vie-') ? 'let-' + f.slice(4) : f;
  return `${IMG}${v}.webp`;
};
function construir() {
  pos = posiciones(S.id);
  const b = $('#mjB'); b.style.setProperty('--sel', `url("${IMG}sel.webp")`); b.style.setProperty('--pista', `url("${IMG}pista.webp")`);
  b.innerHTML = pos.map((p, i) => `<button type="button" class="mt" data-i="${i}" style="--x:${p.x};--y:${p.y};--z:${p.z};background-image:url('${urlCara(S.caras[i])}')" aria-label="Ficha"></button>`).join('');
  el = [...b.children]; ajustar();
}
// Tamaño del tablero: una media ficha mide `u` píxeles de ancho.
function ajustar() {
  const c = $('#mjTab'), b = $('#mjB'); if (!c || !b || !pos.length) return;
  const W = Math.max(...pos.map(p => p.x)) + 2, H = Math.max(...pos.map(p => p.y)) + 2, Z = Math.max(...pos.map(p => p.z));
  const gr = asp && asp.valores.zoom === 'grande', cw = c.clientWidth - 14, u = Math.floor(Math.min(cw / (W + Z * DX + .6) * (gr ? 1.6 : 1), gr ? 40 : 26) * 10) / 10;
  c.classList.toggle('gr', !!gr);
  b.style.setProperty('--u', u + 'px'); b.style.setProperty('--dx', DX); b.style.setProperty('--dy', DY); b.style.setProperty('--alto', ALTO);
  b.style.width = Math.ceil((W + Z * DX + .6) * u) + 'px'; b.style.height = Math.ceil((H * ALTO + Z * DY + .6) * u) + 'px';
}
function pintar() {
  if (!S) return;
  pintarReto();
  const q = quedan(S), L = new Set(libres(pos, S.vivo)), J = q ? jugadas(pos, S.vivo, S.caras) : [];
  S.done = q === 0;
  if (S.done && !S.registrado) {
    S.registrado = true; crono.detener(); S.t = crono.s;
    api.registrar({ res: 'victoria', tiempo: S.t, variante: S.reto ? 'Reto del día' : DISTRIBUCIONES[S.id].nombre, limpio: S.pistas === 0 && S.mezclas === 0 });
    if (S.reto && api.reto.completar(S.reto)) setTimeout(() => api.aviso('📅 ¡Reto del día completado!'), 300);
    api.sonido('ganar'); api.vibrar([60, 40, 60]); guardar();
  }
  const atenuar = asp.valores.libres !== 'igual';
  for (let i = 0; i < el.length; i++) {
    const b = el[i], vivo = S.vivo[i];
    if (b.hidden === vivo) b.hidden = !vivo;
    if (!vivo) continue;
    const k = 'mt' + (L.has(i) ? ' lb' : atenuar ? ' ob' : '') + (i === S.sel ? ' s' : '') + (pistaPar && pistaPar.includes(i) ? ' pi' : '');
    if (b.className !== k) b.className = k;
  }
  $('#mjInfo').textContent = `${q} ficha${q === 1 ? '' : 's'} · ${J.length} jugada${J.length === 1 ? '' : 's'}${S.pistas ? ` · ${S.pistas} pista${S.pistas > 1 ? 's' : ''}` : ''}`;
  $('#mjCrono').textContent = fmtTiempo(S.t);
  const m = $('#mjMsg'); m.className = 'msg' + (S.done ? ' win' : '');
  m.textContent = S.done ? `¡Tablero despejado en ${fmtTiempo(S.t)}!` : !J.length ? 'No quedan jugadas. Prueba 🔀 Mezclar o ↶ Deshacer.' : 'Quita parejas de fichas iguales que estén libres.';
  if (!S.done && !J.length) m.classList.add('mal');
}

/* ---------- entrada ---------- */
function tocar(i) {
  if (!S || S.done || anim || !S.vivo[i]) return;
  pistaPar = null;
  if (!libre(pos, S.vivo, i)) { api.sonido('error'); const b = el[i]; b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); setTimeout(() => b.classList.remove('no'), 350); return; }
  if (S.sel === i) { S.sel = -1; api.sonido('mover'); return pintar(); }
  if (S.sel >= 0 && casan(S.caras[S.sel], S.caras[i])) {
    const a = S.sel, b = i; S.sel = -1; S.vivo[a] = S.vivo[b] = false; S.hist.push([a, b]); hist.push([a, b]);
    api.sonido('ok'); api.vibrar(15); el[a].classList.add('va'); el[b].classList.add('va'); anim = true;
    setTimeout(() => { anim = false; if (S) pintar(); guardar(); }, 220);
    return;
  }
  S.sel = i; api.sonido('click'); pintar();
}
function deshacer() {
  if (!S || S.done || anim) return; const h = hist.pop(); if (!h) { api.aviso('Nada que deshacer'); return; }
  S.hist.pop(); S.vivo[h[0]] = S.vivo[h[1]] = true; S.sel = -1; pistaPar = null; pintar(); guardar();
}
function pista() {
  if (!S || S.done) return; const J = jugadas(pos, S.vivo, S.caras);
  if (!J.length) { api.aviso('No hay jugadas: prueba a mezclar'); return; }
  pistaPar = J[Math.random() * J.length | 0]; S.sel = -1; S.pistas++; api.sonido('ok'); pintar(); guardar();
}
function barajar() {
  if (!S || S.done) return;
  const m = mezclar(pos, S.vivo, S.caras); if (!m) { api.aviso('No se ha podido mezclar'); return; }
  S.caras = m; S.mezclas++; S.sel = -1; pistaPar = null; api.sonido('dado'); construir(); pintar(); guardar();
  api.aviso('🔀 Fichas mezcladas: la partida sigue teniendo solución');
}
function teclado(e) {
  if (!S || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('.modal') || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const k = e.key.toLowerCase();
  if (k === 'z') deshacer(); else if (k === 'h') pista(); else if (k === 'm') barajar();
}
function clic(e) {
  if (!S) return; const t = e.target.closest('.mt'); if (t) return tocar(+t.dataset.i);
  const b = e.target.closest('button'); if (!b) return; const ac = b.dataset.ac;
  if (ac === 'undo') deshacer(); else if (ac === 'pista') pista(); else if (ac === 'mezclar') barajar(); else if (ac === 'nuevo') nueva(S.id, false, true); else if (ac === 'reto') nueva(RETO.id, false, true, true); else if (ac === 'aspecto') asp.abrir();
}
function reglas() {
  api.modal('Mahjong solitario', `<ul><li>Quita <b>parejas de fichas iguales</b> hasta despejar todo el tablero.</li>
    <li>Una ficha solo se puede coger si está <b>libre</b>: sin ninguna ficha encima y con su <b>lado izquierdo o derecho despejado</b>. Las fichas atrapadas se ven más oscuras.</li>
    <li>Las <b>4 flores</b> casan entre sí aunque sean distintas, y las <b>4 estaciones</b> también.</li>
    <li>Toca una ficha libre y después su pareja. Si te equivocas, tócala otra vez para soltarla.</li>
    <li>↶ <b>Deshacer</b> devuelve la última pareja, 💡 <b>Pista</b> te enseña una jugada y 🔀 <b>Mezclar</b> reparte de nuevo las fichas que quedan (siempre con solución). Con pistas o mezclas no cuenta el récord.</li>
    <li>Todos los repartos tienen solución, aunque no siempre se llega a ella a la primera: piensa qué fichas liberan más. En 🎨 Apariencia eliges la mesa, los vientos y si las fichas atrapadas se oscurecen.</li></ul>`);
}
