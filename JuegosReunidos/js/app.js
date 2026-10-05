// Shell de la aplicación: rutas por hash, menú, estadísticas, ajustes y copia de seguridad.
import { JUEGOS, CATEGORIAS, PROXIMAMENTE } from './registry.js';
import { $, el, esc, fmtTiempo } from './core/dom.js';
import * as store from './core/storage.js';
import * as aj from './core/ajustes.js';
import * as stats from './core/stats.js';
import * as son from './core/sonido.js';

const app = $('#app'), tit = $('#titulo'), btnAtras = $('#atras'), btnMas = $('#mas'), nav = $('#nav');
const RUTAS = [['inicio', '🏠', 'Inicio', '#/'], ['stats', '📊', 'Estadísticas', '#/stats'], ['ajustes', '⚙️', 'Ajustes', '#/ajustes']];
let actual = null, token = 0, menuItems = [];
const V1_KEY = 'juegos-reunidos-save';

aj.aplicarTema();

/* ---------- utilidades de interfaz ---------- */
function aviso(texto) {
  const t = el('div', { class: 'toast', role: 'status' }, texto);
  document.body.append(t); setTimeout(() => t.remove(), 2400);
}
function hoja(contenido) {
  const m = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, el('div', { class: 'hoja' }, contenido));
  const cerrar = () => { m.remove(); document.removeEventListener('keydown', esc_); };
  const esc_ = e => { if (e.key === 'Escape') cerrar(); };
  m.addEventListener('click', e => { if (e.target === m) cerrar(); });
  document.addEventListener('keydown', esc_);
  document.body.append(m);
  return cerrar;
}
function modal(titulo, html) {
  const cuerpo = el('div', { class: 'cuerpo' }); cuerpo.innerHTML = html;
  const b = el('button', { class: 'btn on', style: 'margin-top:12px' }, 'Cerrar');
  const cerrar = hoja([el('h2', {}, titulo), cuerpo, b]); b.addEventListener('click', cerrar);
}
function abrirMenu() {
  if (!menuItems.length) return;
  let cerrar;
  const items = menuItems.map(it => el('button', { class: 'item' + (it.peligro ? ' danger' : ''), 'aria-pressed': it.activo == null ? false : String(!!it.activo), onclick: () => { cerrar(); it.accion(); } }, it.texto));
  cerrar = hoja([el('h2', {}, tit.textContent), ...items]);
}
btnMas.addEventListener('click', abrirMenu);
btnAtras.addEventListener('click', () => { location.hash = '#/'; });

/* ---------- API que reciben los juegos ---------- */
function crearApi(j, ent, mod, root) {
  const id = j.id;
  return {
    id, root,
    cargar() { if (!ent) return null; try { return mod.validar(ent.datos) || null; } catch { return null; } },
    guardar: (datos, resumen = null, fin = false) => store.setJuego(id, datos, resumen, fin),
    borrar: () => store.borrarJuego(id),
    registrar: r => stats.registrar(id, r),
    pref: (k, d) => aj.pref(id, k, d), setPref: (k, v) => aj.setPref(id, k, v),
    sonido: son.play, vibrar: son.vibrar,
    confirmar: txt => window.confirm(txt),
    aviso, modal,
    titulo: t => { tit.textContent = t; },
    menu(items) { menuItems = items || []; btnMas.hidden = !menuItems.length; },
    css(url) {
      const href = String(url);
      if ([...document.querySelectorAll('link[data-juego]')].some(l => l.href === href)) return Promise.resolve();
      return new Promise(res => { const l = el('link', { rel: 'stylesheet', href, 'data-juego': id }); l.onload = l.onerror = () => res(); document.head.append(l); });
    },
  };
}

/* ---------- rutas ---------- */
function ruta() {
  const [a, b] = location.hash.replace(/^#\/?/, '').split('/');
  if (a === 'juego' && JUEGOS.some(j => j.id === b)) return { v: 'juego', id: b };
  return { v: a === 'stats' || a === 'ajustes' ? a : 'inicio' };
}
async function cerrarJuego() {
  if (!actual) return;
  const a = actual; actual = null;
  try { await a.mod.unmount?.(); } catch (e) { console.error(e); }
  menuItems = []; btnMas.hidden = true;
}
async function render() {
  const t = ++token;
  await cerrarJuego();
  const r = ruta();
  nav.innerHTML = RUTAS.map(([k, ic, tx, h]) => `<a href="${h}" class="${(r.v === 'juego' ? 'inicio' : r.v) === k ? 'on' : ''}"><span>${ic}</span>${tx}</a>`).join('');
  app.innerHTML = '';
  if (r.v === 'juego') return abrirJuego(r.id, t);
  btnAtras.hidden = true; btnMas.hidden = true;
  ({ inicio: vInicio, stats: vStats, ajustes: vAjustes })[r.v]();
  window.scrollTo(0, 0);
}
async function abrirJuego(id, t) {
  const j = JUEGOS.find(x => x.id === id);
  tit.textContent = j.nombre; btnAtras.hidden = false; btnMas.hidden = true;
  app.innerHTML = '<p class="note">Cargando…</p>';
  let mod;
  try { mod = await j.cargar(); } catch (e) { console.error(e); if (t === token) app.innerHTML = '<p class="msg err">No se pudo cargar el juego. Comprueba la conexión y recarga.</p>'; return; }
  if (t !== token) return;
  const root = el('div', { class: 'juego juego-' + id });
  app.innerHTML = ''; app.append(root);
  const api = crearApi(j, store.getJuego(id), mod, root);
  actual = { j, mod, api };
  try { await mod.mount(root, api); } catch (e) { console.error(e); root.innerHTML = '<p class="msg err">Error al abrir el juego.</p>'; }
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', render);

/* ---------- inicio ---------- */
function ficha(j) {
  const e = store.getJuego(j.id);
  const curso = e && !e.fin && e.resumen;
  const sub = curso ? 'Continuar · ' + esc(e.resumen) : e && e.fin && e.resumen ? esc(e.resumen) : esc(j.descripcion);
  return `<a class="ficha ${curso ? 'curso' : ''}" href="#/juego/${j.id}" style="--c:${j.color}"><span class="ico" aria-hidden="true">${j.icono}</span><b>${esc(j.nombre)}</b><small>${sub}</small></a>`;
}
function vInicio() {
  tit.textContent = 'Juegos Reunidos';
  const grupos = Object.entries(CATEGORIAS).map(([k, n]) => {
    const js = JUEGOS.filter(j => j.categoria === k);
    return js.length ? `<section><h2 class="cat">${n}</h2><div class="rejilla">${js.map(ficha).join('')}</div></section>` : '';
  }).join('');
  app.innerHTML = grupos + (PROXIMAMENTE.length ? `<div class="soon">Próximamente: ${PROXIMAMENTE.map(esc).join(' · ')}.</div>` : '');
}

/* ---------- estadísticas ---------- */
function vStats() {
  tit.textContent = 'Estadísticas';
  const T = stats.todas();
  const cards = JUEGOS.map(j => {
    const s = T[j.id];
    if (!s || !s.partidas) return `<div class="panel"><h3>${j.icono} ${esc(j.nombre)}</h3><p class="note">Todavía sin partidas terminadas.</p></div>`;
    const tiempos = Object.entries(s.tiempos || {}).map(([k, v]) => `<tr><td>Mejor tiempo · ${esc(k)}</td><td>${fmtTiempo(v)}</td></tr>`).join('');
    return `<div class="panel"><h3>${j.icono} ${esc(j.nombre)}</h3><table class="tabla">
      <tr><td>Partidas</td><td>${s.partidas}</td></tr>
      ${s.victorias || s.derrotas || s.tablas ? `<tr><td>Victorias · derrotas · tablas</td><td>${s.victorias} · ${s.derrotas} · ${s.tablas}</td></tr><tr><td>Racha actual · mejor racha</td><td>${s.racha} · ${s.mejorRacha}</td></tr>` : ''}
      ${tiempos}</table></div>`;
  }).join('');
  app.innerHTML = cards + '<div class="bar"><button class="btn danger" id="stReset">Reiniciar estadísticas</button></div>';
  $('#stReset').addEventListener('click', () => { if (confirm('¿Borrar todas las estadísticas?')) { stats.reiniciar(); vStats(); } });
}

/* ---------- ajustes y copia de seguridad ---------- */
let msgAj = { t: '', err: false };
function vAjustes() {
  tit.textContent = 'Ajustes';
  const A = aj.ajustes();
  const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="btn ${A[k] === v ? 'on' : ''}" data-set="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  app.innerHTML = `
  <div class="panel"><h3>Apariencia</h3><div class="fila"><span>Tema</span>${seg('tema', [['auto', 'Auto'], ['claro', 'Claro'], ['oscuro', 'Oscuro']])}</div></div>
  <div class="panel"><h3>Sonido y vibración</h3>
    <div class="fila"><span>Sonidos</span>${seg('sonido', [[true, 'Sí'], [false, 'No']])}</div>
    <div class="fila"><span>Vibración</span>${seg('vibracion', [[true, 'Sí'], [false, 'No']])}</div></div>
  <div class="panel"><h3>Copia de seguridad</h3>
    <p class="note">Tus partidas y estadísticas se guardan solo en este navegador. Exporta un archivo .json para pasarlas a otro dispositivo o como copia.</p>
    <div class="bar"><button class="btn on" id="gExp">Exportar .json</button>
      <label class="btn file">Importar .json<input type="file" id="gImp" accept=".json,application/json"></label>
      <button class="btn danger" id="gBor">Borrar partidas</button></div>
    <div class="msg ${msgAj.err ? 'err' : 'win'}" role="status">${esc(msgAj.t)}</div></div>
  <div class="panel"><h3>Acerca de</h3><p class="note">Juegos Reunidos · versión 2.0. Funciona sin conexión una vez cargada${matchMedia('(display-mode: standalone)').matches ? '' : '; puedes instalarla desde el menú del navegador («Añadir a pantalla de inicio»)'}.</p></div>`;
  app.querySelectorAll('[data-set]').forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.v; aj.set(b.dataset.set, v === 'true' ? true : v === 'false' ? false : v); vAjustes();
  }));
  $('#gExp').addEventListener('click', exportar);
  $('#gBor').addEventListener('click', () => {
    if (!confirm('¿Borrar todas las partidas guardadas en este navegador? (Las estadísticas se conservan.)')) return;
    JUEGOS.forEach(j => store.borrarJuego(j.id)); msgAj = { t: 'Partidas borradas.', err: false }; vAjustes();
  });
  $('#gImp').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = async () => {
      try { const got = await importar(JSON.parse(rd.result)); msgAj = { t: got.length ? `Importado: ${got.join(', ')}.` : 'Copia importada (sin partidas guardadas).', err: false }; }
      catch (err) { msgAj = { t: err instanceof SyntaxError ? 'El archivo no es un JSON válido.' : err.message, err: true }; }
      vAjustes();
    };
    rd.onerror = () => { msgAj = { t: 'No se pudo leer el archivo.', err: true }; vAjustes(); };
    rd.readAsText(f);
  });
}
function exportar() {
  const juegos = {}; JUEGOS.forEach(j => { const e = store.getJuego(j.id); if (e) juegos[j.id] = e; });
  const obj = { app: 'juegos-reunidos', version: 2, fecha: new Date().toISOString(), juegos, stats: stats.todas(), ajustes: aj.ajustes() };
  const a = el('a', { href: URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })), download: `juegos-reunidos-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  msgAj = { t: 'Archivo exportado.', err: false }; vAjustes();
}
// Valida cada partida con el propio módulo del juego (validar / migrarV1) antes de guardarla.
async function ingestar(j, datos, desdeV1) {
  const mod = await j.cargar();
  const d = mod.validar(desdeV1 ? mod.migrarV1(datos) : datos);
  if (!d) return false;
  const r = mod.resumen ? mod.resumen(d) : null;
  store.setJuego(j.id, d, r ? r.texto : null, r ? r.fin : false);
  return true;
}
async function importar(o) {
  if (!o || typeof o !== 'object' || o.app !== 'juegos-reunidos') throw new Error('El archivo no es una copia de Juegos Reunidos.');
  const got = [];
  for (const j of JUEGOS) {
    try {
      if (o.version === 2 && o.juegos && o.juegos[j.id] && typeof o.juegos[j.id] === 'object') { if (await ingestar(j, o.juegos[j.id].datos, false)) got.push(j.nombre); }
      else if (o.version === 1 && o[j.v1] && typeof o[j.v1] === 'object') { if (await ingestar(j, o[j.v1], true)) got.push(j.nombre); }
    } catch (e) { console.error(e); }
  }
  if (o.version === 2) { stats.importar(o.stats); aj.importar(o.ajustes); }
  if (!got.length && o.version !== 2) throw new Error('El archivo no contiene partidas reconocibles de Juegos Reunidos.');
  return got;
}
// Migración única desde la versión 1 (una sola clave con todo). La clave antigua se conserva como respaldo.
async function migrarV1() {
  if (store.leer('migrado')) return;
  try {
    const raw = localStorage.getItem(V1_KEY);
    if (raw) await importar(JSON.parse(raw));
  } catch (e) { console.error('Migración v1:', e); }
  store.escribir('migrado', true);
}

/* ---------- arranque ---------- */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {});
migrarV1().then(render);
