// Klotski: puzle de bloques deslizantes («fichas de colores») y puzle de fichas numeradas, con varios tamaños y niveles.
// Vista 2D (HTML) o 3D (Three.js). Reglas y generación en motor.js.
import { $, esc } from '../../core/dom.js';
import { enSegundoPlano } from '../../core/ia/remoto.js';
import { Cronometro } from '../../core/cronometro.js';
import { grupoFondo } from '../../core/aspectos.js';
import { gruposFichas, estilo, aplicarVars, variantes, luz, oscuro, claro } from '../../core/fichas.js';
import * as K from './motor.js';

const MOTOR = new URL('./motor.js', import.meta.url).href;
const MARCOS = {
  madera: { nombre: 'Madera', sw: ['#8A5A2B', '#2B1D12'] }, nogal: { nombre: 'Nogal oscuro', sw: ['#5B3A29', '#1E1410'] }, pizarra: { nombre: 'Pizarra', sw: ['#5B6577', '#1D222C'] },
  azul: { nombre: 'Azul', sw: ['#3B6FD8', '#142750'] }, verde: { nombre: 'Verde', sw: ['#3E8E5A', '#12331F'] }, rosa: { nombre: 'Rosa', sw: ['#D9488C', '#4A1431'] },
};
const PALETAS = {
  vivo: { nombre: 'Vivos', sw: ['#FF5A5F', '#4C8DFF', '#3DCB7A', '#FFD23F'] }, pastel: { nombre: 'Pastel', sw: ['#FFA8B0', '#9CC4FF', '#9BE3B8', '#FFE08A'] },
  joya: { nombre: 'Joyas', sw: ['#B3123F', '#1B4FB3', '#0F8A52', '#C98A00'] }, mono: { nombre: 'Azules', sw: ['#9CC4FF', '#4C8DFF', '#2453B8', '#142E73'] },
};
const ESTILOS = {
  clasico: { nombre: 'Clásicas', sw: ['#4C8DFF', '#2453B8'] }, madera: { nombre: 'Madera', sw: ['#C98A4B', '#9C6230'] }, cristal: { nombre: 'Cristal', sw: ['#BFE3FF', '#6EA8E8'] }, plano: { nombre: 'Planas', sw: ['#FF8A3D'] },
};
const FLECHAS = ['⬆️', '➡️', '⬇️', '⬅️'], NOMBRE_DIR = ['arriba', 'a la derecha', 'abajo', 'a la izquierda'];
let S = null, api = null, asp = null, root = null, cfg = { modo: 'colores', tam: '4x5', nivel: 'medio' }, crono = null, ocupado = false, serie = 0;
let sel = -1, pistaMov = null, onKey = null, V3 = null, hay3d = false, modo3d = false, forzar2d = false, tok3 = 0, arr = null, nuevo = true;
const quiere3D = () => hay3d && !forzar2d && !!asp && (asp.valores.vista || '2d') === '3d';
const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/* ---------- validación / resumen ---------- */
export const validar = K.validar;
export const migrarV1 = d => d;
export function resumen(d) { return { texto: `${K.MODOS[d.modo]} ${d.tam.replace('x', '×')} · ${d.done ? `resuelto en ${d.movs} movimientos` : `${d.movs} movimientos`}`, fin: d.done }; }

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; ocupado = false; forzar2d = false; modo3d = false; sel = -1; pistaMov = null; nuevo = true;
  try { hay3d = (await import('../../core/escena3d.js')).hayWebGL(); } catch { hay3d = false; }
  asp = api.aspecto([
    ...(hay3d ? [{ clave: 'vista', titulo: 'Vista del tablero', icono: '🧊', def: '2d', opciones: [{ id: '3d', nombre: '🧊 3D' }, { id: '2d', nombre: '🔲 2D clásica' }] }] : []),
    grupoFondo('#klTab'),
    { clave: 'marco', titulo: 'Tablero', icono: '🪵', def: 'madera', opciones: Object.entries(MARCOS).map(([id, t]) => ({ id, nombre: t.nombre, sw: t.sw })) },
    { clave: 'paleta', titulo: 'Colores de las fichas', icono: '🎨', def: 'vivo', opciones: Object.entries(PALETAS).map(([id, t]) => ({ id, nombre: t.nombre, sw: t.sw })) },
    { clave: 'estilo', titulo: 'Estilo de las fichas', icono: '🧩', def: 'clasico', opciones: Object.entries(ESTILOS).map(([id, t]) => ({ id, nombre: t.nombre, sw: t.sw })) },
    ...gruposFichas({ titulo: 'Fichas', icono: '🟦', color: false, tamano: ['pequeno', 'normal'] }),
  ], () => { if (S && $('#klTab')) { if (modo3d !== quiere3D()) armar(); else if (V3) { V3.recolor(aplicarFichas()); pintar(); } else aplicarFichas(); } });
  await api.css(new URL('../../../css/fichas.css', import.meta.url)); await api.css(new URL('./klotski.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && K.dims(c0.modo, c0.tam) && K.NIVELES[c0.nivel]) cfg = { modo: c0.modo, tam: c0.tam, nivel: c0.nivel };
  S = api.cargar();
  root.addEventListener('click', clic);
  onKey = e => tecla(e); document.addEventListener('keydown', onKey);
  api.barra({ nueva: () => { cfg = { modo: S.modo, tam: S.tam, nivel: cfg.nivel }; parar(); jugar(); },
    salir: () => { parar(); setup(); },
    crono: () => crono,
    config: { valores: () => ({ modo: cfg.modo, tam: cfg.tam, nivel: cfg.nivel }), grupos: v => [{ clave: 'modo', titulo: 'Modo', opciones: Object.entries(K.MODOS).map(([k, l]) => [k, (k === 'colores' ? '🟦 ' : '🔢 ') + l]) }, { clave: 'tam', titulo: 'Tablero', opciones: Object.entries(K.TAMANOS[v.modo]).map(([k, t]) => [k, t.nombre]) }, { clave: 'nivel', titulo: 'Nivel', opciones: Object.entries(K.NIVELES) }], alCambiar: (v, c) => { if (c === 'modo' && !K.TAMANOS[v.modo][v.tam]) v.tam = v.modo === 'colores' ? '4x5' : '4x4'; }, aplicar: v => { cfg = { modo: v.modo, tam: v.tam, nivel: v.nivel }; parar(); jugar(); } } });
  api.menu([{ texto: 'Nueva partida', accion: () => { parar(); setup(); } }, { texto: '↶ Deshacer', accion: deshacer }, { texto: '💡 Pista', accion: pedirPista }, { texto: '↺ Reiniciar este puzle', accion: reiniciar },
    { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  if (S && !S.done) armar(); else setup();
}
export function unmount() {
  cerrar3D(); modo3d = false; serie++; parar(); if (onKey) document.removeEventListener('keydown', onKey); onKey = null;
  if (root) root.removeEventListener('click', clic); S = null; asp = null; arr = null;
}
function parar() { if (crono) { crono.detener(); crono = null; } }
function guardar() { if (!S) return; const r = resumen(S); api.guardar(S, r.texto, S.done); }

/* ---------- pantalla de inicio ---------- */
function setup() {
  cerrar3D(); modo3d = false; sel = -1; pistaMov = null;
  const seg = (k, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${cfg[k] === v ? 'on' : ''}" data-cfg="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const mej = api.pref('mejores', {})[`${cfg.modo}:${cfg.tam}:${cfg.nivel}`];
  root.innerHTML = `<p class="note">${cfg.modo === 'colores'
    ? 'Desliza los bloques por el tablero para llevar el <b>bloque grande ★</b> hasta la <b>salida</b>, abajo. Cada bloque se mueve en línea recta: ¡piensa antes de mover!'
    : 'Ordena las fichas del <b>1</b> al <b>' + (K.dims('numeros', cfg.tam).w * K.dims('numeros', cfg.tam).h - 1) + '</b> deslizándolas por el hueco. Toca una ficha y se mueve toda la fila hacia el hueco.'}</p>
    <div class="bar"><span class="lbl">Modo</span>${seg('modo', Object.entries(K.MODOS).map(([k, v]) => [k, (k === 'colores' ? '🟦 ' : '🔢 ') + v]))}</div>
    <div class="bar"><span class="lbl">Tablero</span>${seg('tam', Object.entries(K.TAMANOS[cfg.modo]).map(([k, v]) => [k, v.nombre]))}</div>
    <div class="bar"><span class="lbl">Nivel</span>${seg('nivel', Object.entries(K.NIVELES))}</div>
    ${mej ? `<p class="note">🏆 Tu mejor marca aquí: <b>${mej.movs}</b> movimientos · ${fmt(mej.t)}</p>` : ''}
    <div class="bar"><button class="btn on" data-ac="jugar">▶️ Jugar</button>${S && !S.done ? '<button class="btn" data-ac="volver">Volver a la partida</button>' : ''}<button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>`;
}
async function jugar() {
  if (ocupado) return; ocupado = true; const tok = ++serie;
  api.setPref('cfg', cfg);
  root.innerHTML = '<p class="msg klcargando">🧩 Preparando un puzle…</p>';
  const g = await enSegundoPlano(MOTOR, 'nueva', [cfg.modo, cfg.tam, cfg.nivel, String(Math.random())], K.nueva);   // en un Worker: la pantalla no se congela
  if (tok !== serie || !root) return;
  ocupado = false;
  if (!g) { api.aviso('No se pudo crear el puzle: prueba otra vez'); return setup(); }
  S = K.validar(g); S.pistas = 0; nuevo = true; armar(); guardar();
}

/* ---------- tablero ---------- */
function armar() {
  cerrar3D(); modo3d = quiere3D(); sel = -1; pistaMov = null; parar();
  const T = K.dims(S.modo, S.tam);
  root.innerHTML = `<div class="klcab"><b id="klTit">${esc(K.MODOS[S.modo])} · ${esc(T.nombre)}</b><span id="klInfo"></span></div>
    <div id="klTab" ${modo3d ? 'class="e3d kl3"' : 'class="kltab"'} style="--w:${S.w};--h:${S.h}" role="application" aria-label="Tablero de Klotski: toca o arrastra las fichas"></div>
    <p class="klmsg" id="klMsg" role="status" aria-live="polite"></p>
    <div class="bar klbar"><button class="btn" data-ac="deshacer">↶ Deshacer</button><button class="btn" data-ac="pista">💡 Pista</button><button class="btn" data-ac="reiniciar">↺ Reiniciar</button></div>${api.barraHtml()}`;
  aplicarFichas();
  if (modo3d) iniciar3D(); else construir2D();
  if (!S.done) { crono = new Cronometro(s => { S.t = s; info(); }, S.t); crono.iniciar(); }
  pintar();
}
// 🎨 Fichas: un solo color (se reparte en 6 tonos para distinguir las piezas), tamaño; textura y forma van por css/fichas.css (2D) y vista3d.js (3D)
function aplicarFichas() {
  const tab = $('#klTab'), e = estilo(asp.valores), N = ['--k0', '--k1', '--k2', '--k3', '--k4', '--k5', '--kg', '--kt']; if (!tab) return e;
  aplicarVars(tab, e);
  if (e.hex) { variantes(e.hex, 6).forEach((c, i) => tab.style.setProperty('--k' + i, c)); const clara = luz(e.hex) > .5; tab.style.setProperty('--kg', clara ? oscuro(e.hex, .6) : claro(e.hex, .65)); tab.style.setProperty('--kt', luz(e.hex) > .55 ? '#2b2f3a' : '#fff'); }
  else N.forEach(n => tab.style.removeProperty(n));
  return e;
}
function info() { const e = $('#klInfo'); if (e) e.textContent = `${S.movs} mov. · ${fmt(S.t)}`; }
const colorDe = i => (S.modo === 'colores' ? (i === 0 ? 'var(--kg)' : `var(--k${(i - 1) % 6})`) : `var(--k${i % S.w % 6})`);

/* ----- vista 2D ----- */
function construir2D() {
  const tab = $('#klTab'), gx = K.metaX(S.w);
  tab.innerHTML = `<div class="klmarco"><div class="kltray" id="klTray"></div>${S.modo === 'colores' ? `<span class="klsal" style="--gx:${gx}"></span>` : ''}</div>${S.modo === 'colores' ? `<div class="klsalt" style="--gx:${gx}">⬇ SALIDA</div>` : ''}`;
  const tray = $('#klTray');
  tray.innerHTML = S.p.map((q, i) => `<div class="klp ${S.modo === 'colores' && i === 0 ? 'esp' : ''}" data-i="${i}" role="button" tabindex="-1" aria-label="${S.modo === 'colores' ? (i === 0 ? 'Bloque grande' : 'Bloque ' + i) : 'Ficha ' + (i + 1)}" style="--c:${colorDe(i)};--pw:${q[2]};--ph:${q[3]}"><i class="fx">${S.modo === 'numeros' ? `<b>${i + 1}</b>` : i === 0 ? '<b>★</b>' : ''}</i></div>`).join('');
  tray.addEventListener('pointerdown', abajo2D);
  tray.addEventListener('pointermove', mover2D);
  tray.addEventListener('pointerup', soltar2D);
  tray.addEventListener('pointercancel', soltar2D);
}
function limites(i) {                                          // cuántas casillas puede deslizarse la pieza i en cada dirección
  if (S.modo === 'colores') { const g = K.rejilla(S.p, S.w, S.h); return [0, 1, 2, 3].map(d => K.maxDist(S.p, S.w, S.h, i, d, g)); }
  const m = K.haciaHueco(S, i), r = [0, 0, 0, 0]; if (m) r[m.d] = 1; return r;
}
// Convierte un arrastre (en casillas, con signo) en { d, amt }
function arrastre(i, dxc, dyc) {
  const lim = limites(i), horiz = Math.abs(dxc) >= Math.abs(dyc), d = horiz ? (dxc > 0 ? 1 : 3) : (dyc > 0 ? 2 : 0), v = horiz ? Math.abs(dxc) : Math.abs(dyc);
  return { d, amt: Math.min(v, lim[d]) };
}
let gesto = null;
function abajo2D(e) {
  const p = e.target.closest('.klp'); if (!p || !S || S.done || ocupado) return;
  const tray = $('#klTray'); tray.setPointerCapture(e.pointerId);
  gesto = { i: +p.dataset.i, x: e.clientX, y: e.clientY, cel: tray.getBoundingClientRect().width / S.w, el: p, mov: 0, d: -1, amt: 0 };
}
function mover2D(e) {
  if (!gesto) return; const dx = e.clientX - gesto.x, dy = e.clientY - gesto.y; gesto.mov = Math.max(gesto.mov, Math.abs(dx) + Math.abs(dy));
  if (gesto.mov < 6) return;
  const a = arrastre(gesto.i, dx / gesto.cel, dy / gesto.cel); gesto.d = a.d; gesto.amt = a.amt; gesto.el.classList.add('arrastra');
  const [ux, uy] = K.DIR[a.d]; gesto.el.style.transform = `translate(${ux * a.amt * gesto.cel}px,${uy * a.amt * gesto.cel}px)`;
}
function soltar2D(e) {
  if (!gesto) return; const g = gesto; gesto = null;
  g.el.classList.remove('arrastra'); g.el.style.transform = '';
  if (e.type === 'pointercancel') return;
  if (g.mov < 6) return tocarPieza(g.i);
  const dist = Math.round(g.amt); if (g.d >= 0 && dist >= 1) mover(g.i, g.d, dist); else if (g.d >= 0) api.sonido('error');
}

/* ----- vista 3D ----- */
function cerrar3D() { tok3++; if (V3) { V3.destruir(); V3 = null; } }
async function iniciar3D() {
  const t = ++tok3, host = $('#klTab'); if (!host || !S) return;
  try {
    const b3 = await import('../../core/escena3d.js'), { crearKlotski3D } = await import('./vista3d.js'); if (t !== tok3 || !root) return;
    const v = crearKlotski3D(host, { w: S.w, h: S.h, modo: S.modo }); b3.botonesCamara(host, v.E);
    v.limites = limites; v.alMover = mover; v.alToque = tocarPieza; v.alCelda = tocarCelda; V3 = v; v.recolor(aplicarFichas()); pintar();
  } catch (e) { console.error(e); if (t === tok3 && root && S) { forzar2d = true; armar(); } }
}

/* ---------- pintado ---------- */
function destinos() {
  if (S.modo !== 'colores' || sel < 0) return [];
  const r = []; for (const o of K.opciones(S, sel)) for (const c of K.franja(S, sel, o.d, o.dist)) if (!r.some(z => z[0] === c[0] && z[1] === c[1])) r.push(c);
  return r;
}
function pintar() {
  if (!S) return; info();
  const dest = destinos();
  if (modo3d) { if (V3) V3.pintar({ p: S.p, modo: S.modo, sel, destinos: dest, pista: pistaMov, nuevo }); nuevo = false; }
  else if ($('#klTray')) {
    const tray = $('#klTray'); tray.classList.toggle('hecho', S.done);
    tray.querySelectorAll('.klp').forEach(el => {
      const i = +el.dataset.i, q = S.p[i]; el.style.setProperty('--x', q[0]); el.style.setProperty('--y', q[1]);
      el.classList.toggle('sel', i === sel); el.classList.toggle('pista', !!pistaMov && pistaMov.i === i);
      if (S.modo === 'numeros') el.classList.toggle('bien', q[0] === i % S.w && q[1] === (i / S.w | 0));
    });
    tray.querySelectorAll('.kldot').forEach(d => d.remove());
    for (const [x, y] of dest) { const d = document.createElement('button'); d.type = 'button'; d.className = 'kldot'; d.dataset.cx = x; d.dataset.cy = y; d.style.cssText = `--x:${x};--y:${y}`; d.setAttribute('aria-label', 'Mover aquí'); tray.append(d); }
    nuevo = false;
  }
  const m = $('#klMsg'); if (!m) return;
  if (S.done) m.innerHTML = `🎉 <b>¡Resuelto!</b> ${S.movs} movimientos${S.opt ? ` (mínimo posible: ${S.opt})` : ''} · ${fmt(S.t)}`;
  else if (pistaMov) m.innerHTML = S.modo === 'colores' ? `💡 Mueve el bloque marcado ${NOMBRE_DIR[pistaMov.d]}${pistaMov.dist > 1 ? ` (${pistaMov.dist} casillas)` : ''} ${FLECHAS[pistaMov.d]}` : `💡 Toca la ficha <b>${pistaMov.i + 1}</b>`;
  else m.textContent = S.modo === 'colores' ? (sel >= 0 ? 'Toca un punto para mover el bloque, o arrástralo.' : 'Toca o arrastra un bloque. Lleva el ★ a la salida.') : 'Toca una ficha de la fila o columna del hueco, o arrástrala.';
}

/* ---------- jugadas ---------- */
function mover(i, d, dist) {
  if (!S || S.done || ocupado) return;
  const ok = S.modo === 'colores' ? K.deslizar(S, i, d, dist) : (K.haciaHueco(S, i) || {}).d === d && K.empujar(S, i);
  if (!ok) { api.sonido('error'); return; }
  api.sonido('mover'); api.vibrar(8); sel = S.modo === 'colores' ? i : -1; pistaMov = null; pintar();
  if (K.resuelto(S)) ganar(); else guardar();
}
function tocarPieza(i) {
  if (!S || S.done || ocupado) return;
  if (S.modo === 'numeros') { const m = K.haciaHueco(S, i); if (!m) { api.sonido('error'); return; } return mover(i, m.d, 1); }
  const op = K.opciones(S, i);
  if (!op.length) { api.sonido('error'); sel = i; pintar(); return; }
  if (op.length === 1 && sel !== i) { return mover(i, op[0].d, op[0].dist); }       // un único movimiento posible: se hace directamente
  sel = sel === i ? -1 : i; api.sonido('click'); pintar();
}
function tocarCelda(x, y) {
  if (!S || S.done || ocupado || S.modo !== 'colores' || sel < 0) return;
  const o = K.destinoEn(S, sel, x, y); if (o) mover(sel, o.d, o.dist); else { sel = -1; pintar(); }
}
function deshacer() { if (!S || ocupado) return; if (!K.deshacer(S)) { api.aviso('No hay nada que deshacer'); return; } sel = -1; pistaMov = null; if (!crono && !S.done) { crono = new Cronometro(s => { S.t = s; info(); }, S.t); crono.iniciar(); } api.sonido('click'); pintar(); guardar(); }
function reiniciar() { if (!S || ocupado) return; if (S.movs && !S.done && !api.confirmar('¿Volver a empezar este puzle?')) return; K.reiniciar(S); S.t = 0; sel = -1; pistaMov = null; if (!crono) { crono = new Cronometro(s => { S.t = s; info(); }, 0); crono.iniciar(); } else crono.s = 0; pintar(); guardar(); }
async function pedirPista() {
  if (!S || S.done || ocupado) return; ocupado = true; const m = $('#klMsg'); if (m) m.textContent = '💡 Buscando la mejor jugada…';
  const peque = { modo: S.modo, w: S.w, h: S.h, p: S.p };
  const r = await enSegundoPlano(MOTOR, 'pista', [peque], K.pista); ocupado = false; if (!S || !root) return;
  if (!r) { api.aviso('No encuentro una pista ahora mismo'); pintar(); return; }
  S.pistas = (S.pistas || 0) + 1; pistaMov = r; if (S.modo === 'colores') sel = r.i; api.sonido('click'); pintar(); guardar();
}
function ganar() {
  S.done = true; parar(); sel = -1; pistaMov = null;
  const M = api.pref('mejores', {}), k = `${S.modo}:${S.tam}:${S.nivel}`; let record = false;
  if (!M[k] || S.movs < M[k].movs) { M[k] = { movs: S.movs, t: S.t }; api.setPref('mejores', M); record = true; }
  api.registrar({ res: 'victoria', variante: `${K.MODOS[S.modo]} ${S.tam.replace('x', '×')} · ${K.NIVELES[S.nivel]}`, tiempo: S.t, limpio: !S.pistas });
  api.sonido('ganar'); api.vibrar([60, 40, 60]); pintar(); guardar();
  if (V3) V3.celebrar && V3.celebrar();
  setTimeout(() => { if (S && S.done) { const est = S.opt ? (S.movs <= S.opt * 1.15 ? '⭐⭐⭐' : S.movs <= S.opt * 1.6 ? '⭐⭐' : '⭐') : ''; api.aviso(`🎉 ¡Resuelto en ${S.movs} movimientos! ${est}${record ? ' · 🏆 ¡Nuevo récord!' : ''}`); } }, 350);
}

/* ---------- entrada ---------- */
function tecla(e) {
  if (!S || S.done || ocupado || !$('#klTab') || e.target.closest('input,textarea') || document.querySelector('.modal')) return;
  const d = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[e.key]; if (d === undefined) return; e.preventDefault();
  if (S.modo === 'numeros') {                                  // la ficha que está al otro lado del hueco se mueve en esa dirección
    const [bx, by] = K.hueco(S), x = bx - K.DIR[d][0], y = by - K.DIR[d][1], i = S.p.findIndex(q => q[0] === x && q[1] === y);
    if (i >= 0) mover(i, d, 1); else api.sonido('error'); return;
  }
  if (sel < 0) { sel = 0; pintar(); return; }
  if (K.maxDist(S.p, S.w, S.h, sel, d) >= 1) mover(sel, d, 1); else api.sonido('error');
}
function clic(e) {
  const dot = e.target.closest('.kldot'); if (dot) return tocarCelda(+dot.dataset.cx, +dot.dataset.cy);
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.cfg) {
    if (d.cfg === 'modo') { cfg.modo = d.v; if (!K.TAMANOS[cfg.modo][cfg.tam]) cfg.tam = cfg.modo === 'colores' ? '4x5' : '4x4'; } else cfg[d.cfg] = d.v;
    return setup();
  }
  const a = d.ac;
  if (a === 'jugar') { if (S && !S.done && S.movs && !api.confirmar('¿Empezar un puzle nuevo y abandonar el actual?')) return; jugar(); }
  else if (a === 'volver') { armar(); }
  else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas();
  else if (a === 'deshacer') deshacer(); else if (a === 'pista') pedirPista(); else if (a === 'reiniciar') reiniciar();
  else if (a === 'nueva') { if (S && !S.done && S.movs && !api.confirmar('¿Abandonar este puzle?')) return; parar(); setup(); }
}
function reglas() {
  api.modal('Klotski', `<ul><li><b>Fichas de colores</b> (Klotski clásico): hay bloques de varios tamaños y solo dos casillas vacías. Lleva el <b>bloque grande ★</b> hasta la <b>salida</b> del borde inferior.</li>
    <li>Un bloque se desliza en línea recta, tantas casillas como quieras, y eso cuenta como <b>1 movimiento</b>. Toca un bloque para ver adónde puede ir (si solo tiene un movimiento posible, se hace solo) o arrástralo.</li>
    <li><b>Fichas con números</b>: ordénalas de 1 a n dejando el hueco en la esquina inferior derecha. Toca una ficha y se desplazan todas las de su fila o columna hasta el hueco (1 movimiento).</li>
    <li>Varios tableros (4×4 a 5×6 en colores; 3×3 a 5×5 en números) y 4 niveles. En colores, al terminar verás el <b>mínimo de movimientos</b> posible y ganas ⭐ por acercarte.</li>
    <li>↶ Deshacer sin límite, ↺ Reiniciar el puzle, 💡 Pista (calcula la mejor jugada) y 🎨 Apariencia: tablero, colores y estilo de las fichas, fondo y vista 2D/3D. Con teclado: flechas.</li></ul>`);
}
