import { $, esc } from '../../core/dom.js';
import { hacerOrdenable, ordenarMano } from '../../core/arrastrar.js';
import * as R from './motor.js';
import { gruposFichas, estilo, oscuro, claro, luz } from '../../core/fichas.js';
import { grupoMesa } from '../../core/aspectos.js';

let S = null, api = null, asp = null, root = null, timer = null, reg = false, arr = null;
let V3 = null, hay3d = false, modo3d = false, forzar2d = false, tok3 = 0;
const quiere3D = () => hay3d && !forzar2d && !!asp && (asp.valores.vista || '2d') === '3d';
let W = null, recientes = new Set(), marcador = { g: 0, p: 0 };
let cfg = { rivales: 1, nivel: 'medio' }, ord = { modo: 'color', ids: [] };
const MODOS = ['color', 'numero', 'libre'];

/* ---------- validación / resumen ---------- */
export function validar(d) {
  const s = d && R.validar(d.s); if (!s) return null;
  const m = d.marcador && typeof d.marcador === 'object' ? d.marcador : {}, e = v => (Number.isInteger(v) && v >= 0 && v <= 99999 ? v : 0);
  const o = d.ord && MODOS.includes(d.ord.modo) ? { modo: d.ord.modo, ids: Array.isArray(d.ord.ids) ? [...new Set(d.ord.ids.filter(x => Number.isInteger(x) && x >= 0 && x <= 105))] : [] } : null;
  return { s, marcador: { g: e(m.g), p: e(m.p) }, reg: !!d.reg, ord: o };
}
export const migrarV1 = d => d;
export function resumen(d) {
  const s = d.s;
  if (s.fase === 'fin') return { texto: s.ganador === 0 ? '¡Ganaste!' : `Ganó ${s.jug[s.ganador].nombre}`, fin: true };
  return { texto: `${s.jug.length} jugadores · te quedan ${s.jug[0].fichas.length} fichas`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; W = null; recientes = new Set(); arr = null; forzar2d = false; modo3d = false;
  try { hay3d = (await import('../../core/escena3d.js')).hayWebGL(); } catch { hay3d = false; }
  asp = api.aspecto([
    ...(hay3d ? [{ clave: 'vista', titulo: 'Vista de la mesa', icono: '🧊', def: '2d', opciones: [{ id: '3d', nombre: '🧊 3D' }, { id: '2d', nombre: '🔲 2D clásica' }] }] : []),
    grupoMesa(),
    { clave: 'fichas', titulo: 'Fichas', def: 'marfil', opciones: [{ id: 'marfil', nombre: 'Marfil', sw: ['#FFF8E7'] }, { id: 'blanco', nombre: 'Blanco', sw: ['#FFFFFF'] }, { id: 'oscuro', nombre: 'Oscuras', sw: ['#26304F'] }] },
    ...gruposFichas({ pocos: true, titulo: 'Fichas · personalizar', icono: '🀫', formas: false, tamano: ['pequeno', 'normal'] }),
  ], () => { aplicarFichas(); if (S && $('#rmMesa')) { if (modo3d !== quiere3D()) { armar(); pintar(); } else { if (V3) V3.recolor(); pintar(); } } });
  await api.css(new URL('../../../css/fichas.css', import.meta.url));
  await api.css(new URL('./rummy.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && [1, 2, 3].includes(c0.rivales) && R.NIVEL[c0.nivel]) cfg = { ...c0 };
  ord = { modo: MODOS.includes(api.pref('orden', 'color')) ? api.pref('orden', 'color') : 'color', ids: [] };
  const g = api.cargar();
  if (g) { S = g.s; marcador = g.marcador; reg = g.reg; if (g.ord) ord = g.ord; } else S = null;
  root.addEventListener('click', clic);
  api.barra({ nueva: () => { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; clearTimeout(timer); empezar(); },
    salir: () => { clearTimeout(timer); api.borrar(); location.hash = '#/cat/tablero'; },
    pausar: () => clearTimeout(timer),
    reanudar: () => { if (S && S.fase !== 'fin') bucle(); },
    config: { valores: () => ({ ...cfg }), grupos: v => [{ clave: 'rivales', titulo: 'Rivales', opciones: [[1, '1 CPU'], [2, '2 CPU'], [3, '3 CPU']] }, { clave: 'nivel', titulo: 'Nivel', opciones: Object.entries(R.NIVEL) }], aplicar: v => { Object.assign(cfg, v); empezar(); } } });
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  if (S) { armar(); empezarTurno(); pintar(); bucle(); } else setup();
}
export function unmount() { cerrar3D(); modo3d = false; clearTimeout(timer); if (arr) { arr.destruir(); arr = null; } if (root) root.removeEventListener('click', clic); S = null; asp = null; W = null; }
function guardar() { if (!S) return; const d = { s: S, marcador, reg, ord }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- pantallas ---------- */
function setup() {
  S = null; W = null; clearTimeout(timer);
  const seg = (k, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${cfg[k] === v ? 'on' : ''}" data-cfg="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  root.innerHTML = `<p class="note">El clásico juego de fichas numeradas: forma <b>grupos</b> (mismo número, colores distintos) y <b>escaleras</b> (números seguidos del mismo color), reorganiza la mesa a tu favor y quédate sin fichas antes que nadie.</p>
    <div class="bar"><span class="lbl">Rivales</span>${seg('rivales', [[1, '1 CPU'], [2, '2 CPU'], [3, '3 CPU']])}</div>
    <div class="bar"><span class="lbl">Nivel</span>${seg('nivel', Object.entries(R.NIVEL))}</div>
    <p class="note">Marcador: ${marcador.g} ganadas · ${marcador.p} perdidas.</p>
    <div class="bar"><button class="btn on" data-ac="start">Repartir fichas</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>`;
}
function armar() {
  cerrar3D(); modo3d = quiere3D();
  root.innerHTML = `<div class="rmrivales" id="rmRiv"></div>
    ${modo3d ? '<div class="e3d rm3" id="rmMesa"></div>' : '<div class="rmmesa" id="rmMesa"></div>'}
    <div class="rmmsg" id="rmMsg" role="status" aria-live="polite"></div>
    <div class="bar rmdest" id="rmDest"></div>
    <div class="rmatril">
      <div class="rmatcab"><b>Tu atril</b><span id="rmCuenta"></span><span class="ordbar rmord" id="rmOrd"><button type="button" data-ord="color">Color</button><button type="button" data-ord="numero">Número</button></span></div>
      <div class="rmfichas" id="rmAtril"></div>
    </div>
    <div class="bar rmacc" id="rmAcc"></div>
    <div id="rmFin"></div>
    <div class="rmlogs"><div class="rmlogc"><b>Tus jugadas</b><ul class="rmlog" id="rmLog"></ul></div><div class="rmlogc"><b>CPUs</b><ul class="rmlog" id="rmLogCpu"></ul></div></div>${api.barraHtml()}`;
  if (arr) arr.destruir();
  arr = hacerOrdenable($('#rmAtril'), { sel: '.rmf', clave: el => +el.dataset.id, alSoltar: ids => { ord = { modo: 'libre', ids }; pintar(); guardar(); } });
  if (modo3d) iniciar3D();
}
// 🀫 Fichas: color del cuerpo (--fz/--fz2/--fb; si es oscuro se aclaran los números), tamaño y textura (js/core/fichas.js)
function aplicarFichas() {
  const r = root; if (!r) return; const e = estilo(asp.valores), P = ['--fz', '--fz2', '--fb', '--k0', '--k1', '--k2', '--k3'];
  if (!e.hex) { for (const n of P) r.style.removeProperty(n); } else {
    r.style.setProperty('--fz', claro(e.hex, .12)); r.style.setProperty('--fz2', oscuro(e.hex, .12)); r.style.setProperty('--fb', oscuro(e.hex, .38));
    const K = luz(e.hex) < .6 ? ['#FFC2C9', '#A9CCFF', '#FFD9A0', '#FFFFFF'] : null;       // fichas oscuras o intensas: números claros para que se lean
    ['--k0', '--k1', '--k2', '--k3'].forEach((n, i) => K ? r.style.setProperty(n, K[i]) : r.style.removeProperty(n));
  }
  r.style.setProperty('--fx-esc', e.esc);
}
function cerrar3D() { tok3++; if (V3) { V3.destruir(); V3 = null; } }
async function iniciar3D() {
  const t = ++tok3, host = $('#rmMesa'); if (!host) return;
  try {
    const b3 = await import('../../core/escena3d.js'), { crearRummy3D } = await import('./vista3d.js'); if (t !== tok3 || !root) return;
    const v = crearRummy3D(host); b3.botonesCamara(host, v.E); const g = host.querySelector('[data-cam="girar"]'); if (g) g.remove();
    v.alFicha = id => { if (S && S.fase === 'jugar' && S.turno === 0) elegir(id); }; v.alJugada = k => { if (W && W.sel.size) mover(k); };
    V3 = v; v.recolor(); if (S) pintar();
  } catch (e) { console.error(e); if (t === tok3 && root && S) { forzar2d = true; armar(); pintar(); } }
}
function nuevaSetup() { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; clearTimeout(timer); api.borrar(); setup(); }
function empezar() {
  api.setPref('cfg', cfg);
  const jugadores = [{ nombre: 'Tú', cpu: false }, ...Array.from({ length: cfg.rivales }, (_, k) => ({ nombre: cfg.rivales === 1 ? 'CPU' : `CPU ${k + 1}`, cpu: true }))];
  S = R.crear({ jugadores, nivel: cfg.nivel }); reg = false; recientes = new Set(); ord = { modo: ord.modo === 'libre' ? 'color' : ord.modo, ids: [] };
  armar(); empezarTurno(); pintar(); guardar(); bucle();
}
// Copia de trabajo del turno: puedes mover fichas libremente; solo se aplica al pulsar «Terminar turno».
function empezarTurno() { W = S && S.fase === 'jugar' && S.turno === 0 ? { mesa: S.mesa.map(s => s.slice()), mano: S.jug[0].fichas.slice(), sel: new Set(), inicio: new Set(S.jug[0].fichas) } : null; }
const cambiado = () => W && W.mano.length !== S.jug[0].fichas.length;

/* ---------- pintado ---------- */
const fichaHTML = (id, extra = '') => `<button type="button" class="rmf fx ${R.esComodin(id) ? 'jk' : 'c' + R.color(id)} ${extra}" data-id="${id}" aria-label="${R.esComodin(id) ? 'Comodín' : `${R.numero(id)} ${R.COLORES[R.color(id)]}`}">${R.esComodin(id) ? '★' : R.numero(id)}</button>`;
const ordenAtril = m => ordenarMano(m, ord, { palo: x => (R.esComodin(x) ? 9 : R.color(x)), num: x => (R.esComodin(x) ? 99 : R.numero(x)) });
function pintar() {
  if (!S || !$('#rmMesa')) return;
  const miTurno = S.fase === 'jugar' && S.turno === 0 && W, mesa = W ? W.mesa : S.mesa, mano = W ? W.mano : S.jug[0].fichas, yo = S.jug[0];
  const sel = W ? W.sel : new Set();
  $('#rmRiv').innerHTML = S.jug.map((j, k) => k === 0 ? '' : `<div class="rmriv ${S.turno === k && S.fase === 'jugar' ? 'turno' : ''}"><b>${esc(j.nombre)}</b><span>${j.fichas.length} 🀫</span><small>${j.bajado ? '✓ bajado' : 'sin bajar'}</small></div>`).join('') + `<div class="rmriv bolsa"><b>Bolsa</b><span>${S.bolsa.length}</span><small>fichas</small></div>`;
  // mesa
  const editable = id => miTurno && (yo.bajado || W.inicio.has(id));
  aplicarFichas(); if (modo3d && V3) V3.fichas(estilo(asp.valores));
  if (modo3d) { if (V3) V3.pintar({ mesa, validas: mesa.map(R.valida), sel, recientes, mias: W ? W.inicio : new Set(), editable, conMas: !!(miTurno && sel.size) }); }
  else $('#rmMesa').innerHTML = mesa.length ? mesa.map((s, k) => {
    const ok = R.valida(s);
    return `<div class="rmset ${ok ? '' : 'mal'}">${s.map(id => fichaHTML(id, `${sel.has(id) ? 'sel' : ''} ${recientes.has(id) ? 'nueva' : ''} ${W && W.inicio.has(id) ? 'mia' : ''} ${editable(id) ? '' : 'fija'}`)).join('')}${miTurno && sel.size ? `<button type="button" class="rmmas" data-dest="${k}" aria-label="Añadir a esta jugada">＋</button>` : ''}</div>`;
  }).join('') : '<p class="rmvacia">La mesa está vacía. La primera bajada de cada jugador debe sumar 30 puntos.</p>';
  // destinos para las fichas elegidas
  const todasMias = W && [...sel].every(id => W.inicio.has(id));
  $('#rmDest').innerHTML = miTurno && sel.size ? `<button class="btn on" data-dest="nueva">＋ Nueva jugada (${sel.size})</button>${[...sel].some(id => !W.mano.includes(id)) && todasMias ? '<button class="btn" data-dest="atril">↩ Devolver al atril</button>' : ''}<button class="btn" data-ac="nosel">Soltar</button>` : '';
  $('#rmDest').hidden = !(miTurno && sel.size);
  // atril
  root.querySelectorAll('#rmOrd [data-ord]').forEach(b => b.classList.toggle('on', b.dataset.ord === ord.modo));
  if (!(arr && arr.activo())) $('#rmAtril').innerHTML = ordenAtril(mano).map(id => fichaHTML(id, sel.has(id) ? 'sel' : '')).join('');
  $('#rmCuenta').textContent = `${mano.length} fichas · ${R.puntosMano(mano)} puntos`;
  // mensaje
  const m = $('#rmMsg');
  if (S.fase === 'fin') m.innerHTML = S.ganador === 0 ? '🏆 <b>¡Has ganado!</b>' : `<b>${esc(S.jug[S.ganador].nombre)}</b> gana la partida.`;
  else if (!miTurno) m.textContent = `${S.jug[S.turno].nombre} está pensando…`;
  else {
    const err = cambiado() ? R.comprobar(S, 0, W.mesa, W.mano) : '';
    if (!yo.bajado) {
      const nuevos = W.mesa.filter(s => s.every(id => W.inicio.has(id)) && R.valida(s)).reduce((t, s) => t + R.analizar(s).valor, 0);
      m.innerHTML = `Primera bajada: necesitas <b>${R.BAJADA}</b> puntos con tus fichas · llevas <b>${nuevos}</b>.${err && cambiado() ? `<br><small>${esc(err)}</small>` : ''}`;
    } else m.innerHTML = !cambiado() ? 'Tu turno: toca fichas para elegirlas y luego su destino, o roba una ficha.' : err ? `⚠️ ${esc(err)}` : '✔ Todo correcto: pulsa «Terminar turno».';
  }
  // acciones
  const acc = $('#rmAcc');
  acc.innerHTML = miTurno ? `${cambiado() ? '<button class="btn" data-ac="reset">↺ Deshacer cambios</button><button class="btn on" data-ac="terminar">✔ Terminar turno</button>' : `<button class="btn on" data-ac="robar">${S.bolsa.length ? '🀫 Robar ficha' : 'Pasar'}</button>`}<button class="btn" data-ac="pista">💡 Sugerir</button>` : '';
  acc.hidden = !miTurno;
  pintarFin();
  const reg = S.log.map(l => { const m = /^(-?\d)\|(.*)$/.exec(l); return m ? [+m[1], m[2]] : [-1, l]; }), li = a => a.map(([, t]) => `<li>${esc(t)}</li>`).join('') || '<li class="vacio">—</li>';
  $('#rmLog').innerHTML = li(reg.filter(([j]) => j <= 0)); $('#rmLogCpu').innerHTML = li(reg.filter(([j]) => j > 0));
}
function pintarFin() {
  const el = $('#rmFin'); if (S.fase !== 'fin') { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="rmres"><h3>${S.ganador === 0 ? '🏆 ¡Victoria!' : 'Fin de la partida'}</h3>${S.jug.map((j, k) => `<div class="rmrf ${k === S.ganador ? 'gana' : ''}"><div class="rmrh"><b>${esc(j.nombre)}</b><span>${j.puntos > 0 ? '+' : ''}${j.puntos} puntos</span></div><div class="rmfichas peq">${j.fichas.map(id => fichaHTML(id, 'fija')).join('') || '<small>Sin fichas</small>'}</div></div>`).join('')}
    <div class="bar" style="justify-content:center"><button class="btn on" data-ac="otra">🔁 Otra partida</button><button class="btn" data-ac="setup">Cambiar opciones</button></div></div>`;
}

/* ---------- acciones del jugador ---------- */
function elegir(id) {
  if (!W) return;
  const enMano = W.mano.includes(id);
  if (!enMano && !S.jug[0].bajado && !W.inicio.has(id)) { api.aviso('Hasta tu primera bajada no puedes mover las fichas de la mesa.'); return; }
  if (W.sel.has(id)) W.sel.delete(id); else W.sel.add(id);
  api.sonido('click'); pintar();
}
function mover(dest) {
  if (!W || !W.sel.size) return;
  const ids = [...W.sel];
  if (dest === 'atril' && ids.some(id => !W.inicio.has(id))) { api.aviso('Solo puedes devolver al atril las fichas que eran tuyas.'); return; }
  W.mano = W.mano.filter(id => !W.sel.has(id));
  W.mesa = W.mesa.map(s => s.filter(id => !W.sel.has(id)));
  if (dest === 'atril') W.mano.push(...ids);
  else if (dest === 'nueva') W.mesa.push(R.ordenarJugada(ids));
  else { const k = +dest; if (W.mesa[k]) W.mesa[k] = R.ordenarJugada([...W.mesa[k], ...ids]); }
  W.mesa = W.mesa.filter(s => s.length);
  W.sel = new Set(); api.sonido('mover'); pintar();
}
function terminar() {
  const err = R.jugar(S, 0, W.mesa, W.mano);
  if (err) { api.sonido('error'); api.aviso(err); return; }
  recientes = new Set(); api.sonido('ok'); W = null; pintar(); guardar(); bucle();
}
function bucle() {
  clearTimeout(timer); if (!S) return;
  if (S.fase === 'fin') { W = null; return cierre(); }
  if (S.turno === 0) { if (!W) empezarTurno(); pintar(); return; }
  W = null; pintar();
  timer = setTimeout(() => {
    if (!S) return;
    const p = S.turno, antes = new Set(S.mesa.flat()), sug = R.sugerir(S, p);
    if (sug && !R.jugar(S, p, sug.mesa, sug.mano)) { recientes = new Set(S.mesa.flat().filter(id => !antes.has(id))); api.sonido('mover'); }
    else { R.robar(S, p); recientes = new Set(); api.sonido('click'); }
    guardar(); bucle();
  }, 950);
}
function cierre() {
  if (!reg) {
    reg = true; const gano = S.ganador === 0; if (gano) marcador.g++; else marcador.p++;
    api.registrar({ res: gano ? 'victoria' : 'derrota', variante: `${S.jug.length} jugadores · ${R.NIVEL[S.nivel]}` });
    api.sonido(gano ? 'ganar' : 'perder'); if (gano) api.vibrar([60, 40, 60]);
  }
  pintar(); guardar();
}

/* ---------- entrada ---------- */
function clic(e) {
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.cfg) { cfg[d.cfg] = d.cfg === 'nivel' ? d.v : +d.v; return setup(); }
  if (d.id != null && S) { if (S.fase === 'jugar' && S.turno === 0 && !b.classList.contains('fija')) elegir(+d.id); return; }
  if (d.dest != null) return mover(d.dest);
  if (d.ord) { ord = { modo: d.ord, ids: [] }; api.setPref('orden', d.ord); api.sonido('click'); if (S) { pintar(); guardar(); } return; }
  const a = d.ac;
  if (a === 'start') empezar(); else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas(); else if (a === 'nueva') nuevaSetup();
  else if (a === 'setup') { api.borrar(); setup(); } else if (a === 'otra') { api.borrar(); empezar(); }
  else if (!S || !W) return;
  else if (a === 'nosel') { W.sel = new Set(); pintar(); }
  else if (a === 'reset') { empezarTurno(); api.sonido('click'); pintar(); }
  else if (a === 'terminar') terminar();
  else if (a === 'robar') { R.robar(S, 0); W = null; recientes = new Set(); api.sonido('click'); guardar(); bucle(); }
  else if (a === 'pista') {
    const sug = R.sugerir({ ...S, jug: S.jug.map(j => ({ ...j })) }, 0, 'dificil');
    if (!sug) { api.aviso('No veo ninguna jugada: te toca robar.'); return; }
    W.mesa = sug.mesa.map(s => s.slice()); W.mano = sug.mano.slice(); W.sel = new Set();
    api.aviso('Jugada sugerida colocada: revísala y pulsa «Terminar turno» (o «Deshacer cambios»).'); pintar();
  }
}
function reglas() {
  api.modal('Rummy', `<ul><li>106 fichas: del 1 al 13 en cuatro colores (dos de cada) y 2 comodines ★. Cada jugador empieza con 14.</li>
    <li><b>Jugadas</b>: <b>grupo</b> = 3 o 4 fichas del mismo número y colores distintos; <b>escalera</b> = 3 o más números seguidos del mismo color (el 13 no enlaza con el 1). El comodín sustituye a cualquier ficha.</li>
    <li>En tu turno: <b>juega fichas</b> o <b>roba</b> una de la bolsa.</li>
    <li><b>Primera bajada</b>: debe sumar al menos ${R.BAJADA} puntos solo con fichas tuyas (el comodín vale lo que sustituye) y sin tocar la mesa.</li>
    <li>Después puedes <b>reorganizar la mesa</b> como quieras (partir escaleras, cambiar fichas de jugada…), siempre que al terminar el turno todas las jugadas sean válidas y hayas jugado al menos una ficha tuya. Las fichas de la mesa no vuelven al atril.</li>
    <li><b>Cómo mover</b>: toca una o varias fichas (se elevan) y luego toca el ＋ de una jugada o «Nueva jugada». Las jugadas no válidas se marcan en rojo. «Deshacer cambios» devuelve todo como al empezar el turno.</li>
    <li>Ordena tu atril por color o número, o <b>arrastra</b> las fichas para colocarlas a tu gusto. 💡 Sugerir coloca una jugada posible para que la revises.</li>
    <li>Gana quien se queda sin fichas: suma los puntos que les quedan a los demás (comodín = ${R.COMODIN_PUNTOS}). Si se acaba la bolsa y nadie puede jugar, gana quien tenga menos puntos.</li></ul>`);
}
