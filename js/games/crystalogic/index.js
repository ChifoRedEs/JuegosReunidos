// Crystalogic: programa a tu avatar. Pon las fichas en el programa para que recoja todos los cristales y termine sobre el portal.
// Campaña de 50 niveles (5 tramos), niveles aleatorios, reto del día y editor con códigos para compartir. Reglas y solucionador en motor.js.
import { $, esc } from '../../core/dom.js';
import { grupoFondo } from '../../core/aspectos.js';
import * as M from './motor.js';
import { NIVELES } from './niveles.js';
import { TUTO } from './tutorial.js';

const PAL = {
  vivo: { nombre: 'Vivos', c: { r: '#E5383B', g: '#25B35A', b: '#2F6BFF' } }, pastel: { nombre: 'Pastel', c: { r: '#FF8A8F', g: '#6FCF97', b: '#8DB3FF' } },
  daltonico: { nombre: 'Daltonismo', c: { r: '#D55E00', g: '#E8D530', b: '#0072B2' } }, oscuro: { nombre: 'Intensos', c: { r: '#B3122F', g: '#0E7A3F', b: '#1B3FA0' } },
};
const AVATARES = { mago: ['🧙', 'Mago'], zorro: ['🦊', 'Zorro'], robot: ['🤖', 'Robot'], gato: ['🐱', 'Gato'], cohete: ['🚀', 'Cohete'], buho: ['🦉', 'Búho'] };
const GEMAS = { azul: ['#38BDF8', 'Azul'], rosa: ['#F472B6', 'Rosa'], verde: ['#34D399', 'Verde'], dorado: ['#FBBF24', 'Dorado'], morado: ['#A78BFA', 'Morado'] };
const FONDOS = { pergamino: ['#F4E9CF', '#D9C48F', 'Pergamino'], noche: ['#222A5E', '#0F1536', 'Noche'], bosque: ['#DDF0D5', '#9CCB8E', 'Bosque'], hielo: ['#E6F3FF', '#A9D2F5', 'Hielo'] };
const GLIFO = { r: '»', g: '≈', b: '^' };
const SOL_MAX = 30;

let api = null, asp = null, root = null, D = null, V = {};
let vista = 'menu', cur = null, sel = { tok: null, slot: null }, undo = [], run = null, auto = false, tmr = 0, vel = 1, ED = null, ocupado = false, generando = 0;

/* ---------- datos guardados ---------- */
const nuevosDatos = () => ({ v: 1, tuto: 0, prog: {}, cur: null, mis: [], racha: { ult: '', n: 0 }, diario: { f: '', e: 0 } });
const idsCamp = () => M.TRAMOS.flatMap(t => NIVELES[t.id].map((_, i) => t.id + (i + 1)));
const nivelCamp = id => { const t = NIVELES[id[0]]; return t ? t[+id.slice(1) - 1] || null : null; };
function validarCur(c) {
  if (!c || typeof c !== 'object') return null;
  const L = c.tipo === 'camp' ? nivelCamp(String(c.id)) : c.tipo === 'tuto' ? (TUTO[+String(c.id).slice(1) - 1] || {}).L : M.validar(c.L);
  if (!L || !['camp', 'azar', 'diario', 'mio', 'tuto'].includes(c.tipo)) return null;
  const A = Array.isArray(c.A) && c.A.length === L.sc.length ? c.A.map((x, i) => (Number.isInteger(x) && (L.sc[i].k === 'a' ? x >= 0 && x <= 2 : x >= -2 && x <= M.MAX_CRIS) ? x : null)) : L.sc.map(() => null);
  const R = { tipo: c.tipo, id: String(c.id || ''), L, A, h: Math.max(0, c.h | 0), n: Math.max(0, c.n | 0), ok: !!c.ok, e: Math.max(0, Math.min(3, c.e | 0)), p: Math.max(0, c.p | 0) };
  if (c.tr && M.TRAMOS.some(t => t.id === c.tr)) R.tr = c.tr;
  return R;
}
export function validar(d) {
  if (!d || typeof d !== 'object') return null;
  const R = nuevosDatos();
  for (const id of idsCamp()) { const p = d.prog && d.prog[id]; if (p && Number.isInteger(p.e) && p.e >= 1 && p.e <= 3) R.prog[id] = { e: p.e, p: Math.max(0, p.p | 0) }; }
  R.tuto = Math.max(0, Math.min(TUTO.length, d.tuto | 0));
  R.cur = validarCur(d.cur);
  if (Array.isArray(d.mis)) for (const q of d.mis.slice(0, SOL_MAX)) { const L = M.validar(q); if (L) R.mis.push(L); }
  if (d.racha && typeof d.racha.ult === 'string') R.racha = { ult: d.racha.ult.slice(0, 10), n: Math.max(0, d.racha.n | 0) };
  if (d.diario && typeof d.diario.f === 'string') R.diario = { f: d.diario.f.slice(0, 10), e: Math.max(0, Math.min(3, d.diario.e | 0)) };
  return R;
}
export const migrarV1 = d => d;
const estrellasTotal = d => Object.values(d.prog).reduce((s, p) => s + p.e, 0);
export function resumen(d) { const n = Object.keys(d.prog).length; return { texto: `${n}/50 niveles · ${estrellasTotal(d)} ★`, fin: n >= 50 }; }
function guardar() { if (!D) return; const r = resumen(D); api.guardar(D, r.texto, r.fin); }

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; vista = 'menu'; cur = null; run = null; ED = null; auto = false; ocupado = false;
  V = {};
  asp = api.aspecto([
    grupoFondo('.cry'),
    { clave: 'avatar', titulo: 'Avatar', icono: '🧙', def: 'mago', opciones: Object.entries(AVATARES).map(([id, [e, n]]) => ({ id, nombre: `${e} ${n}` })) },
    { clave: 'gema', titulo: 'Cristales', icono: '💎', def: 'azul', opciones: Object.entries(GEMAS).map(([id, [c, n]]) => ({ id, nombre: n, sw: [c, c] })) },
    { clave: 'caminos', titulo: 'Colores de los caminos', icono: '🎨', def: 'vivo', opciones: Object.entries(PAL).map(([id, t]) => ({ id, nombre: t.nombre, sw: [t.c.r, t.c.b] })) },
    { clave: 'simb', titulo: 'Símbolos en los caminos', icono: '🔣', def: 'si', opciones: [{ id: 'si', nombre: 'Con símbolos (ayuda con el color)' }, { id: 'no', nombre: 'Sin símbolos' }] },
    { clave: 'mapa', titulo: 'Fondo del mapa', icono: '🗺️', def: 'pergamino', opciones: Object.entries(FONDOS).map(([id, [c1, c2, n]]) => ({ id, nombre: n, sw: [c1, c2] })) },
  ], () => { if (root) { leerAsp(); if (vista === 'juego') pintarJuego(); else if (vista === 'editor') pintarEditor(); else pintarMenu(); } });
  await api.css(new URL('./crystalogic.css', import.meta.url));
  leerAsp();
  D = api.cargar() || nuevosDatos();
  vel = [1, 2, 4].includes(api.pref('vel', 1)) ? api.pref('vel', 1) : 1;
  root.addEventListener('click', clic);
  api.barra({ etiqueta: 'Niveles', nueva: () => irMenu(), salir: () => { location.hash = '#/cat/logica'; },
    config: { nota: 'Elige cómo se abren los niveles y la velocidad de la ejecución.', valores: () => ({ libre: !!api.pref('libre', false), vel }),
      grupos: () => [{ clave: 'libre', titulo: 'Niveles de la campaña', opciones: [[false, 'En orden'], [true, 'Todos abiertos']] }, { clave: 'vel', titulo: 'Velocidad al ejecutar', opciones: [[1, 'Normal'], [2, 'Rápida'], [4, 'Muy rápida']] }],
      aplicar: v => { api.setPref('libre', !!v.libre); vel = v.vel; api.setPref('vel', vel); irMenu(); } } });
  api.menu([{ texto: '🗺️ Niveles', accion: () => irMenu() }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas },
    { texto: '🗑️ Borrar progreso', peligro: true, accion: () => { if (api.confirmar('¿Borrar todo el progreso y «Mis niveles»?')) { D = nuevosDatos(); guardar(); irMenu(); } } }]);
  if (D.cur && !D.cur.ok) { cur = D.cur; vista = 'menu'; }
  if (!D.tuto && !Object.keys(D.prog).length && !D.mis.length) { abrirTuto(1); return; }   // primera vez: directo al tutorial
  pintarMenu();
}
export function unmount() {
  clearTimeout(tmr); tmr = 0; auto = false; generando++;
  if (root) root.removeEventListener('click', clic);
  root = null; asp = null; run = null;
}
function leerAsp() { V = asp ? asp.valores : {}; }
const pal = () => (PAL[V.caminos] || PAL.vivo).c;
const avatar = () => (AVATARES[V.avatar] || AVATARES.mago)[0];
const gema = () => (GEMAS[V.gema] || GEMAS.azul)[0];

/* ---------- navegación ---------- */
function irMenu() { parar(); vista = 'menu'; ED = null; pintarMenu(); }
function parar() { clearTimeout(tmr); tmr = 0; auto = false; run = null; sel = { tok: null, slot: null }; }
function abrir(tipo, id, L, extra) {
  parar(); undo = [];
  cur = { tipo, id, L, A: L.sc.map(() => null), h: 0, n: 0, ok: false, ...(extra || {}) };
  D.cur = cur; guardar(); vista = 'juego'; pintarJuego();
}
function abrirCamp(id) { abrir('camp', id, nivelCamp(id)); }
function abrirTuto(k) { abrir('tuto', 't' + k, TUTO[k - 1].L); }
const hoyKey = () => api.reto.fecha();
const tramoDiario = () => ['n', 'a', 'e', 'i', 'n', 'a', 'e'][new Date().getDay()];
function generarYAbrir(tipo, tramo, semilla, id) {
  const mi = ++generando;
  root.innerHTML = `<p class="note" role="status">⏳ Preparando un nivel ${tipo === 'diario' ? 'del reto del día' : 'aleatorio'}…</p>`;
  setTimeout(() => {
    if (mi !== generando || !root) return;
    const L = M.nuevoNivel(semilla, tramo, { intentos: 9000 });
    if (mi !== generando || !root) return;
    if (!L) { api.aviso('No se pudo crear el nivel, inténtalo otra vez.'); irMenu(); return; }
    abrir(tipo, id || '', L, { tr: tramo });
  }, 40);
}

/* ---------- menú ---------- */
const solvedTramo = t => NIVELES[t].filter((_, i) => D.prog[t + (i + 1)]).length;
function abierto(id) {
  if (api.pref('libre', false)) return true;
  const t = id[0], n = +id.slice(1), k = M.TRAMOS.findIndex(x => x.id === t);
  if (n > 1) return !!D.prog[t + (n - 1)];
  return k === 0 || solvedTramo(M.TRAMOS[k - 1].id) >= 7;
}
const estrellasHtml = e => `<span class="cryst" aria-label="${e} de 3 estrellas">${'★'.repeat(e)}${'☆'.repeat(3 - e)}</span>`;
function pintarMenu() {
  if (!root) return; vista = 'menu';
  const hoy = hoyKey(), dHecho = D.diario.f === hoy, tD = M.TRAMOS.find(t => t.id === tramoDiario());
  const rachaViva = D.racha.ult === hoy || D.racha.ult === ayer(hoy) ? D.racha.n : 0;
  const mis = D.mis.map((L, i) => `<div class="crymi"><b>${esc(L.nombre || 'Nivel ' + (i + 1))}</b><span class="note">${L.n.length} lugares · ${M.huecosA(L).length + M.huecosC(L).length} huecos</span>
    <span class="crybtns"><button class="btn on" data-ac="mio" data-i="${i}">▶️</button><button class="btn" data-ac="editmio" data-i="${i}">✏️</button><button class="btn" data-ac="compmio" data-i="${i}">📤</button><button class="btn danger" data-ac="delmio" data-i="${i}">🗑️</button></span></div>`).join('');
  root.innerHTML = `<div class="cry cry-menu" id="cryRoot">
    <div class="cryintro"><b>¿De qué va?</b> Un mago 🧙 recorre un mapa. Tú <b>le programas el camino</b> con fichas de colores. <b>Objetivo:</b> que recoja todos los cristales 💎 y termine en el portal 🌀.
      <ol><li>Mira el <b>mapa</b>: lugares unidos por caminos de colores.</li><li>Elige <b>fichas</b> de color y ponlas en los huecos del <b>programa</b>.</li><li>Pulsa <b>▶️ Ejecutar</b> y mira si lo consigue.</li></ol></div>
    <div class="bar"><button class="btn ${D.tuto >= TUTO.length ? '' : 'on'}" data-ac="tuto" data-k="${Math.min(D.tuto + 1, TUTO.length)}">🎓 ${D.tuto >= TUTO.length ? 'Repetir el tutorial' : D.tuto ? 'Seguir el tutorial (' + (D.tuto + 1) + '/' + TUTO.length + ')' : 'Aprende a jugar (tutorial de 4 niveles)'}</button></div>
    ${cur && !cur.ok ? '<div class="bar"><button class="btn on" data-ac="volver">▶️ Volver al nivel que dejaste</button></div>' : ''}
    <div class="bar"><span class="lbl">Retos</span>
      <button class="btn ${dHecho ? '' : 'on'}" data-ac="diario">🗓️ Reto del día (${tD.icono} ${tD.nombre}) ${dHecho ? estrellasHtml(D.diario.e) : ''}</button>
      <span class="note">🔥 Racha: <b>${rachaViva}</b> ${rachaViva === 1 ? 'día' : 'días'}</span></div>
    <div class="bar"><span class="lbl">Nivel aleatorio</span><div class="seg">${M.TRAMOS.map(t => `<button class="btn" data-ac="azar" data-t="${t.id}">${t.icono} ${t.nombre}</button>`).join('')}</div></div>
    <div class="bar"><span class="lbl">Campaña · ${Object.keys(D.prog).length}/50 · ${estrellasTotal(D)}/150 ★</span></div>
    ${M.TRAMOS.map((t, k) => { const ab = k === 0 || solvedTramo(M.TRAMOS[k - 1].id) >= 7 || api.pref('libre', false);
      return `<section class="crytramo ${ab ? '' : 'cerrado'}"><h3>${t.icono} ${t.nombre} <small>${solvedTramo(t.id)}/10${ab ? '' : ' · supera 7 del tramo anterior'}</small></h3>
      <div class="crygrid">${NIVELES[t.id].map((_, i) => { const id = t.id + (i + 1), p = D.prog[id], ok = abierto(id);
        return `<button class="cryn ${p ? 'hecho' : ''}" data-ac="camp" data-id="${id}" ${ok ? '' : 'disabled'} aria-label="${t.nombre} nivel ${i + 1}${ok ? '' : ', bloqueado'}"><b>${ok ? i + 1 : '🔒'}</b>${p ? estrellasHtml(p.e) : '<span class="cryst">☆☆☆</span>'}</button>`; }).join('')}</div></section>`; }).join('')}
    <div class="bar"><span class="lbl">Mis niveles (editor)</span>
      <button class="btn on" data-ac="nuevoed">➕ Crear un nivel</button><button class="btn" data-ac="importar">📥 Importar código</button></div>
    ${mis || '<p class="note">Aquí aparecerán los niveles que crees o importes. Puedes compartirlos con un código.</p>'}
    <div class="bar"><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">📖 Reglas</button></div>
  </div>${api.barraHtml()}`;
}
const ayer = f => { const d = new Date(f + 'T12:00:00'); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };

/* ---------- dibujo del mapa ---------- */
const pos = (L, i) => [10 + L.n[i][0] * 20, 10 + L.n[i][1] * 20];
function geomArista(L, [a, b, c, d]) {
  const pa = pos(L, a), pb = pos(L, b), dx = pb[0] - pa[0], dy = pb[1] - pa[1], len = Math.hypot(dx, dy), v = [dx / len, dy / len];
  const ps = [pa[0] + v[0] * 6, pa[1] + v[1] * 6], pe = [pb[0] - v[0] * 6, pb[1] - v[1] * 6];
  let ctrl = null, mid = [(ps[0] + pe[0]) / 2, (ps[1] + pe[1]) / 2], tan = v;
  if (c === 'b') { ctrl = [mid[0] - v[1] * 4.4, mid[1] + v[0] * 4.4]; mid = [.25 * ps[0] + .5 * ctrl[0] + .25 * pe[0], .25 * ps[1] + .5 * ctrl[1] + .25 * pe[1]]; const tx = pe[0] - ctrl[0], ty = pe[1] - ctrl[1], tl = Math.hypot(tx, ty); tan = [tx / tl, ty / tl]; }
  const f = n => n.toFixed(1), path = ctrl ? `M${f(ps[0])} ${f(ps[1])}Q${f(ctrl[0])} ${f(ctrl[1])} ${f(pe[0])} ${f(pe[1])}` : `M${f(ps[0])} ${f(ps[1])}L${f(pe[0])} ${f(pe[1])}`;
  let flecha = '';
  if (d) { const bx = pe[0] - tan[0] * 3.6, by = pe[1] - tan[1] * 3.6; flecha = `${f(pe[0] + tan[0] * 1.2)},${f(pe[1] + tan[1] * 1.2)} ${f(bx - tan[1] * 2.2)},${f(by + tan[0] * 2.2)} ${f(bx + tan[1] * 2.2)},${f(by - tan[0] * 2.2)}`; }
  return { path, mid, flecha };
}
const ANG = { r: -90, g: 150, b: 30 };
function centroBucle(L, n, c) { const [x, y] = pos(L, n), a = ANG[c] * Math.PI / 180; return [x + 8.4 * Math.cos(a), y + 8.4 * Math.sin(a)]; }
function trollSvg(t, x, y) {
  const col = t === 'o' ? '#FF8A1A' : '#8B5CF6';
  return `<g transform="translate(${x} ${y})"><path d="M-2.6 -1.6 L-1.8 -4 L-0.6 -2.4 M2.6 -1.6 L1.8 -4 L0.6 -2.4" stroke="${col}" stroke-width=".9" fill="none"/><circle r="3" fill="${col}" stroke="#222" stroke-width=".4"/><circle cx="-1.1" cy="-.4" r=".7" fill="#fff"/><circle cx="1.1" cy="-.4" r=".7" fill="#fff"/><path d="M-1.2 1.1Q0 2 1.2 1.1" stroke="#222" stroke-width=".4" fill="none"/></g>`;
}
function gemaSvg(x, y, n) {
  return `<g class="gem" transform="translate(${x} ${y})"><path d="M0 -3.6L3 -.6L0 3.8L-3 -.6Z" fill="${gema()}" stroke="#1d2b53" stroke-width=".55"/><path d="M-3 -.6H3M-1.1 -.6L0 -3.6L1.1 -.6" stroke="#fff" stroke-opacity=".7" stroke-width=".4" fill="none"/>${n > 1 ? `<circle cx="3.2" cy="-3.2" r="2.1" fill="#1d2b53"/><text x="3.2" y="-2.2" text-anchor="middle" font-size="3" fill="#fff" font-weight="800">${n}</text>` : ''}</g>`;
}
// o: { cr: cristales por nodo (por defecto los del nivel), ed: modo editor, aSel: nodo elegido, av: nodo del avatar }
function svgMapa(L, o = {}) {
  if (o.ed) M.olvidar(L);
  const P = pal(), I = M.info(L), cr = o.cr || I.cr, simb = V.simb !== 'no';
  let vb = '0 0 120 100';
  if (!o.ed) {
    const xs = L.n.map((_, i) => pos(L, i)[0]), ys = L.n.map((_, i) => pos(L, i)[1]);
    let x0 = Math.min(...xs) - 15, x1 = Math.max(...xs) + 15, y0 = Math.min(...ys) - 15, y1 = Math.max(...ys) + 15;
    if (x1 - x0 < 76) { const m = (x0 + x1) / 2; x0 = m - 38; x1 = m + 38; }
    if (y1 - y0 < 52) { const m = (y0 + y1) / 2; y0 = m - 26; y1 = m + 26; }
    vb = `${x0} ${y0} ${x1 - x0} ${y1 - y0}`;
  }
  let h = `<svg class="crysvg" viewBox="${vb}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa del nivel">`;
  if (o.ed) for (let c = 0; c < M.GC; c++) for (let r = 0; r < M.GR; r++) h += `<circle cx="${10 + c * 20}" cy="${10 + r * 20}" r="1.3" class="crygp"/>`;
  L.e.forEach((q, k) => {
    const g = geomArista(L, q), col = P[q[2]];
    h += `<g class="crye" data-e="${k}"><path d="${g.path}" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="3.8" stroke-linecap="round"/><path d="${g.path}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round" ${q[2] === 'g' ? 'stroke-dasharray="3.2 1.9"' : ''}/>${g.flecha ? `<polygon points="${g.flecha}" fill="${col}" stroke="#fff" stroke-width=".5"/>` : ''}`;
    if (simb) h += `<circle cx="${g.mid[0].toFixed(1)}" cy="${g.mid[1].toFixed(1)}" r="2.5" fill="#fff" stroke="${col}" stroke-width=".7"/><text x="${g.mid[0].toFixed(1)}" y="${(g.mid[1] + 1.35).toFixed(1)}" text-anchor="middle" font-size="4" font-weight="900" fill="#222">${GLIFO[q[2]]}</text>`;
    h += '</g>';
  });
  (L.l || []).forEach(([n, c]) => { const [x, y] = centroBucle(L, n, c), col = P[c]; h += `<g class="cryl"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.3" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="3.2"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.3" fill="none" stroke="${col}" stroke-width="1.7" ${c === 'g' ? 'stroke-dasharray="2.4 1.4"' : ''}/>${simb ? `<text x="${x.toFixed(1)}" y="${(y + 1.3).toFixed(1)}" text-anchor="middle" font-size="3.6" font-weight="900" fill="#222">${GLIFO[c]}</text>` : ''}</g>`; });
  L.n.forEach((_, i) => {
    const [x, y] = pos(L, i), esP = i === L.p, esS = i === L.s;
    if (esP) h += `<circle class="cryportal" cx="${x}" cy="${y}" r="8.3" fill="none" stroke="#8B5CF6" stroke-width="1.5" stroke-dasharray="3 2"/><circle cx="${x}" cy="${y}" r="7" fill="#C4B5FD" fill-opacity=".55"/>`;
    if (esS) h += `<circle cx="${x}" cy="${y}" r="7.4" fill="none" stroke="#16A34A" stroke-width=".9" stroke-dasharray="1.4 1.6"/>`;
    if (!o.ed && (esS || esP)) h += `<text class="cryetq" x="${x}" y="${y + 12.6}" text-anchor="middle" font-size="3.6" font-weight="900" fill="${esP ? '#6D28D9' : '#15803D'}">${esP ? (esS ? 'SALIDA Y PORTAL' : 'PORTAL') : 'SALIDA'}</text>`;
    h += `<g class="crynodo ${o.aSel === i ? 'sel' : ''}" data-n="${i}"><circle cx="${x}" cy="${y}" r="5.7" fill="${esP ? '#EDE9FE' : '#fff'}" stroke="#2b3566" stroke-width=".9"/><text x="${x}" y="${y + 1.9}" text-anchor="middle" font-size="5.4" font-weight="800" fill="#1d2b53">${i + 1}</text></g>`;
  });
  L.n.forEach((_, i) => {
    const [x, y] = pos(L, i);
    if (cr[i] > 0) h += `<g data-g="${i}">${gemaSvg(x + 5.2, y - 6, cr[i])}</g>`; else h += `<g data-g="${i}" style="display:none"></g>`;
    const tr = (L.t || []).find(q => q[0] === i); if (tr) h += trollSvg(tr[1], x - 5.4, y + 6.2);
  });
  if (!o.ed) { const [x, y] = pos(L, o.av != null ? o.av : L.s); h += `<g id="cryAv" class="cryav" style="transform:translate(${x}px,${y}px)"><circle r="4.9" fill="#fff" fill-opacity=".92" stroke="#2b3566" stroke-width=".6"/><text y="2.3" text-anchor="middle" font-size="6.4">${avatar()}</text></g>`; }
  return h + '</svg>';
}

/* ---------- dibujo del pergamino ---------- */
const LX = [52, 150, 248], RH = 58, TOP = 58;
const sx = s => LX[s.x], sy = s => TOP + s.y * RH;
function hexPts(x, y, r) { return [[x + r, y], [x + r / 2, y + r * .87], [x - r / 2, y + r * .87], [x - r, y], [x - r / 2, y - r * .87], [x + r / 2, y - r * .87]].map(p => p.map(v => v.toFixed(1)).join(',')).join(' '); }
function tokenCond(v, x, y, sz = 1) {
  if (v >= 0) return `<text x="${x}" y="${y + 6 * sz}" text-anchor="middle" font-size="${17 * sz}" font-weight="900" fill="#1d2b53">=${v}</text><path d="M${x - 9 * sz} ${y - 12 * sz}l4 -4 4 4 -4 5z" fill="${gema()}" stroke="#1d2b53" stroke-width="1" transform="translate(${5 * sz} ${1 * sz})"/>`;
  const col = v === -1 ? '#FF8A1A' : '#8B5CF6';
  return `<circle cx="${x}" cy="${y}" r="${11 * sz}" fill="${col}" stroke="#222" stroke-width="1.2"/><circle cx="${x - 4 * sz}" cy="${y - 2 * sz}" r="${2.2 * sz}" fill="#fff"/><circle cx="${x + 4 * sz}" cy="${y - 2 * sz}" r="${2.2 * sz}" fill="#fff"/><path d="M${x - 4 * sz} ${y + 4.5 * sz}Q${x} ${y + 8 * sz} ${x + 4 * sz} ${y + 4.5 * sz}" stroke="#222" stroke-width="1.4" fill="none"/>`;
}
function svgPergamino(L, A, o = {}) {
  const P = pal(), sc = L.sc, maxY = Math.max(...sc.map(s => s.y)), H = TOP + (maxY + 1) * RH + 36;
  let h = `<svg class="crysvg crysc" viewBox="0 0 300 ${H}" role="group" aria-label="Pergamino con ${sc.length} huecos"><defs><marker id="cryfl" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#475569"/></marker></defs>`;
  const flecha = (d, cls = '') => `<path d="${d}" class="cryfl ${cls}" fill="none" stroke="#475569" stroke-width="2.2" marker-end="url(#cryfl)"/>`;
  const s0 = sc[0]; h += `<text x="${sx(s0)}" y="14" text-anchor="middle" font-size="12" font-weight="800" fill="#475569">▶ EMPIEZA AQUÍ</text>${flecha(`M${sx(s0)} 20 V${sy(s0) - (s0.k === 'a' ? 22 : 24)}`)}`;
  sc.forEach((s, i) => {
    const x = sx(s), y = sy(s), r = s.k === 'a' ? 20 : 22;
    const hacia = (t, etq, cls) => {
      if (t < 0) { h += flecha(`M${x} ${y + r} V${y + r + 20}`) + `<text x="${x}" y="${y + r + 34}" text-anchor="middle" font-size="13">🏁</text>`; return; }
      const d = sc[t], xt = sx(d), yt = sy(d), rt = d.k === 'a' ? 20 : 22;
      if (yt <= y && !(yt === y && xt !== x)) { const xr = Math.max(x, xt) + 46; h += flecha(`M${x + r} ${y} H${xr} V${yt} H${xt + rt + 1}`, cls); if (etq) h += etq(xr - 12, y - 6); return; }
      if (xt === x) { h += flecha(`M${x} ${y + r} V${yt - rt - 1}`, cls); if (etq) h += etq(x + 12, y + r + 12); return; }
      if (s.k === 'c') { const xo = xt < x ? x - r : x + r; h += flecha(`M${xo} ${y} H${xt} V${yt - rt - 1}`, cls); if (etq) h += etq((xo + xt) / 2, y - 6); return; }
      const ym = (y + r + yt - rt) / 2; h += flecha(`M${x} ${y + r} V${ym} H${xt} V${yt - rt - 1}`, cls);
    };
    if (s.k === 'a') hacia(s.n);
    else {
      hacia(s.n, (ex, ey) => `<text x="${ex}" y="${ey}" text-anchor="middle" font-size="15" font-weight="900" fill="#16A34A">✔</text>`);
      hacia(s.no, (ex, ey) => `<text x="${ex}" y="${ey}" text-anchor="middle" font-size="15" font-weight="900" fill="#DC2626">✘</text>`);
    }
  });
  sc.forEach((s, i) => {
    const x = sx(s), y = sy(s), v = A[i], cls = ['cryslot', o.sel === i ? 'sel' : '', o.act === i ? 'act' : '', v == null ? 'vacio' : ''].join(' ');
    h += `<g class="${cls}" data-s="${i}" tabindex="0" role="button" aria-label="Hueco ${i + 1}, ${s.k === 'a' ? 'acción' : 'condición'}${v == null ? ', vacío' : ''}">`;
    if (s.k === 'a') {
      h += v == null ? `<circle cx="${x}" cy="${y}" r="20" class="cryhv"/>` : `<circle cx="${x}" cy="${y}" r="20" fill="${P[M.COLS[v]]}" stroke="#1d2b53" stroke-width="2"/><text x="${x}" y="${y + 9}" text-anchor="middle" font-size="26" font-weight="900" fill="#fff" stroke="#00000055" stroke-width=".8">${GLIFO[M.COLS[v]]}</text>`;
    } else {
      h += `<polygon points="${hexPts(x, y, 23)}" class="${v == null ? 'cryhv' : 'cryhc'}"/>${v == null ? '' : tokenCond(v, x, y)}`;
    }
    h += `<text x="${x + (s.k === 'a' ? 17 : 21)}" y="${y + 22}" text-anchor="middle" font-size="10" fill="#64748b" font-weight="800">${i + 1}</text></g>`;
  });
  return h + '</svg>';
}

/* ---------- pantalla de juego ---------- */
function fichasQuedan() {
  const L = cur.L, f = [...L.f], k = [...L.k];
  L.sc.forEach((s, i) => { const v = cur.A[i]; if (v == null) return; if (s.k === 'a') f[v]--; else { const j = k.indexOf(v); if (j >= 0) k.splice(j, 1); } });
  return { f, k };
}
function bandeja() {
  const q = fichasQuedan(), P = pal(), cnt = new Map(); cur.L.k.forEach(v => cnt.set(v, (cnt.get(v) || 0) + 1));
  const act = [0, 1, 2].filter(c => cur.L.f[c] > 0).map(c => `<button type="button" class="crytok ${sel.tok && sel.tok.t === 'a' && sel.tok.v === c ? 'sel' : ''}" data-ac="tok" data-t="a" data-v="${c}" style="--tc:${P[M.COLS[c]]}" ${q.f[c] <= 0 ? 'disabled' : ''}><b>${GLIFO[M.COLS[c]]}</b><span>${M.NOMBRE_COL[M.COLS[c]]}</span><i>×${q.f[c]}</i></button>`).join('');
  const con = [...cnt.keys()].sort((a, b) => b - a).map(v => { const n = q.k.filter(x => x === v).length;
    return `<button type="button" class="crytok cond ${sel.tok && sel.tok.t === 'c' && sel.tok.v === v ? 'sel' : ''}" data-ac="tok" data-t="c" data-v="${v}" ${n <= 0 ? 'disabled' : ''}><b>${v >= 0 ? '=' + v : v === -1 ? '🟠' : '🟣'}</b><span>${v >= 0 ? 'Llevo ' + v + ' cristales' : v === -1 ? 'Troll naranja aquí' : 'Troll morado aquí'}</span><i>×${n}</i></button>`; }).join('');
  return act + con;
}
function pintarJuego() {
  if (!root || !cur) return; vista = 'juego';
  const L = cur.L, tr = cur.tipo === 'camp' ? M.TRAMOS.find(t => t.id === cur.id[0]) : M.TRAMOS.find(t => t.id === cur.tr);
  const tu = cur.tipo === 'tuto' ? +cur.id.slice(1) : 0;
  const titulo = cur.tipo === 'tuto' ? `🎓 Tutorial ${tu}/${TUTO.length} · ${TUTO[tu - 1].titulo}` : cur.tipo === 'camp' ? `${tr.icono} ${tr.nombre} · Nivel ${cur.id.slice(1)}` : cur.tipo === 'diario' ? '🗓️ Reto del día' : cur.tipo === 'azar' ? `🎲 Aleatorio${tr ? ' · ' + tr.nombre : ''}` : `✏️ ${esc(L.nombre || 'Mi nivel')}`;
  const I = M.info(L);
  root.innerHTML = `<div class="cry cry-juego" id="cryRoot">
    <div class="crycab"><b>${titulo}</b><span id="cryInfo" class="note"></span></div>
    ${tu ? `<div class="crytexto">${TUTO[tu - 1].texto}</div>` : ''}
    <div class="cryobj" id="cryObj"></div>
    <div class="crymapa" id="cryMapa"></div>
    <p class="crymsg" id="cryMsg" role="status" aria-live="polite"></p>
    <div class="crybar">
      <button class="btn on" data-ac="run" id="cryRun">▶️ Ejecutar</button><button class="btn" data-ac="paso" id="cryPaso">⏭ Paso</button><button class="btn" data-ac="reset" id="cryReset" aria-label="Reiniciar la ejecución">⟲</button>
      <button class="btn" data-ac="undo" id="cryUndo" aria-label="Deshacer">↩️ Deshacer</button><button class="btn" data-ac="vaciar" aria-label="Vaciar el programa">🧹 Vaciar</button><button class="btn" data-ac="pista">💡 Pista</button><button class="btn" data-ac="vel" id="cryVel" aria-label="Velocidad">⏩ ×${vel}</button>
    </div>
    <div class="cryguia" id="cryGuia"></div>
    <h4 class="cryh4">🧩 Fichas <small>(toca una y luego un hueco)</small></h4>
    <div class="crytray" id="cryTray"></div>
    <h4 class="cryh4">📜 Programa <small>(se lee de arriba abajo)</small></h4>
    <div class="cryscwrap"><div class="cryscroll" id="cryScroll"></div></div>
    <div id="cryRes"></div>
  </div>${api.barraHtml()}`;
  $('#cryMapa').innerHTML = svgMapa(L, { av: run ? run.nodo : null, cr: run ? run.cr : I.cr });
  objetivo(); repintarProg(); info();
  if (cur.ok) mostrarRes(); else msg(mensajeInicial());
}
function mensajeInicial() { const I = M.info(cur.L); return I.total ? `Recoge ${I.total === 1 ? 'el cristal' : 'los ' + I.total + ' cristales'} y termina en el portal 🌀 (lugar ${cur.L.p + 1}). Rellena los huecos del programa.` : `No hay cristales: solo tienes que terminar en el portal 🌀 (lugar ${cur.L.p + 1}).`; }
function objetivo() {
  const o = $('#cryObj'); if (!o || !cur) return; const L = cur.L, I = M.info(L);
  o.innerHTML = `<span class="chip">🧙 Empiezas en el <b>${L.s + 1}</b></span><span class="chip">${I.total ? `💎 Recoge <b>${I.total}</b>` : '💎 Sin cristales'}</span><span class="chip">🌀 Acaba en el <b>${L.p + 1}</b></span>`;
}
function guia() {
  const g = $('#cryGuia'); if (!g || !cur) return;
  let t = '';
  if (cur.ok) t = '';
  else if (run && !run.fin) t = '⏳ Ejecutando… mira cómo se mueve el mago por el mapa.';
  else if (llena()) t = '✅ Programa completo. Pulsa <b>▶️ Ejecutar</b> (o ⏭ Paso para ir despacio).';
  else if (sel.tok) t = '👉 Ahora toca un <b>hueco numerado</b> del programa para poner la ficha.';
  else if (sel.slot != null) t = `👉 Toca una <b>ficha de abajo</b> para ponerla en el hueco ${sel.slot + 1}.`;
  else t = '👉 <b>Paso 1:</b> toca una ficha de abajo. <b>Paso 2:</b> toca un hueco numerado del programa. Repite hasta llenarlos todos.';
  g.innerHTML = t; g.hidden = !t;
}
function msg(t, cls = '') { const m = $('#cryMsg'); if (m) { m.className = 'crymsg ' + cls; m.innerHTML = t; } }
function info() { const e = $('#cryInfo'); if (!e || !cur) return; const par = cur.L.par; e.textContent = cur.tipo === 'tuto' ? '' : `${cur.n ? cur.n + (cur.n === 1 ? ' intento' : ' intentos') + ' · ' : ''}${par ? 'mejor posible: ' + par + (par === 1 ? ' paso' : ' pasos') : ''}`; }
function repintarProg() {
  const sc = $('#cryScroll'), tray = $('#cryTray'); if (!sc || !cur) return;
  sc.innerHTML = svgPergamino(cur.L, cur.A, { sel: sel.slot, act: run && !run.fin ? run.pc : null });
  tray.innerHTML = bandeja();
  const u = $('#cryUndo'); if (u) u.disabled = !undo.length;
  guia();
}
const llena = () => cur.A.every(v => v != null);

/* ---------- edición del pergamino por el jugador ---------- */
function cambio() { if (run || tmr) reiniciar(true); }
function dispo(t, v, excepto) {
  const A = cur.A.slice(); if (excepto != null) A[excepto] = null;
  const f = [...cur.L.f], k = [...cur.L.k];
  cur.L.sc.forEach((s, i) => { const x = A[i]; if (x == null) return; if (s.k === 'a') f[x]--; else { const j = k.indexOf(x); if (j >= 0) k.splice(j, 1); } });
  return t === 'a' ? f[v] > 0 : k.includes(v);
}
function poner(i, v) { undo.push(cur.A.slice()); if (undo.length > 60) undo.shift(); cur.A[i] = v; guardarCur(); }
function guardarCur() { D.cur = cur; guardar(); }
function siguienteVacio(desde) { const n = cur.A.length; for (let k = 1; k <= n; k++) { const j = (desde + k) % n; if (cur.A[j] == null) return j; } return null; }
function tocarHueco(i) {
  cambio(); if (cur.ok) return;
  const s = cur.L.sc[i];
  if (sel.tok && sel.tok.t === s.k) {
    const { t, v } = sel.tok;
    if (cur.A[i] === v) poner(i, null);
    else if (dispo(t, v, i)) { poner(i, v); if (!dispo(t, v, null)) sel.tok = null; sel.slot = null; }
    else api.aviso('No te quedan fichas de ese tipo.');
    api.sonido('click');
  } else if (cur.A[i] != null) { poner(i, null); api.sonido('click'); }
  else sel.slot = sel.slot === i ? null : i;
  repintarProg(); msg(mensajeInicial());
}
function tocarFicha(t, v) {
  cambio(); if (cur.ok) return;
  if (sel.slot != null && cur.L.sc[sel.slot].k === t) {
    const i = sel.slot;
    if (dispo(t, v, i)) { poner(i, v); sel.slot = siguienteVacio(i); api.sonido('click'); } else api.aviso('No te quedan fichas de ese tipo.');
    sel.tok = null;
  } else sel.tok = sel.tok && sel.tok.t === t && sel.tok.v === v ? null : { t, v };
  repintarProg(); msg(mensajeInicial());
}

/* ---------- ejecución ---------- */
const dur = () => 560 / vel;
function actualizarBotones() {
  const r = $('#cryRun'); if (r) r.textContent = auto ? '⏸ Pausa' : '▶️ Ejecutar';
}
function ejecutar() {
  if (cur.ok) return;
  if (auto) { auto = false; clearTimeout(tmr); tmr = 0; actualizarBotones(); return; }
  if (!llena()) { const j = cur.A.findIndex(v => v == null); sel.slot = j; repintarProg(); msg('⚠️ Rellena <b>todos</b> los huecos del programa antes de ejecutar.', 'mal'); api.sonido('error'); return; }
  if (!run || run.fin) { reiniciar(true); crearRun(); }
  auto = true; actualizarBotones(); avanzar();
}
function crearRun() { run = M.iniciar(cur.L, cur.A); cur.n++; info(); sel = { tok: null, slot: null }; repintarProg(); }
function unPaso() {
  if (cur.ok) return;
  if (!llena()) { ejecutar(); return; }
  if (!run || run.fin) { reiniciar(true); crearRun(); }
  auto = false; actualizarBotones(); if (!tmr) avanzar(true);
}
function reiniciar(silencio) {
  clearTimeout(tmr); tmr = 0; auto = false; run = null;
  if (!root || !cur) return;
  const m = $('#cryMapa'); if (m && vista === 'juego') m.innerHTML = svgMapa(cur.L);
  repintarProg(); actualizarBotones(); if (!silencio) msg(mensajeInicial());
}
function avanzar(uno) {
  if (!run || run.fin || !root) return;
  const ev = M.paso(run), d = dur();
  repintarProg();
  if (ev.t === 'mov') {
    const av = $('#cryAv'), [x, y] = pos(cur.L, ev.hasta);
    if (av) { av.style.transition = `transform ${d}ms ease-in-out`; av.style.transform = `translate(${x}px,${y}px)`; }
    api.sonido('mover');
    tmr = setTimeout(() => {
      tmr = 0; if (!root) return;
      const g = document.querySelector(`#cryMapa [data-g="${ev.hasta}"]`);
      if (ev.cris) { api.sonido('ok'); if (g) { const q = run.cr[ev.hasta]; g.style.display = q > 0 ? '' : 'none'; g.innerHTML = q > 0 ? gemaSvg(pos(cur.L, ev.hasta)[0] + 5.2, pos(cur.L, ev.hasta)[1] - 6, q) : ''; } }
      terminarPaso(ev, uno);
    }, d);
  } else if (ev.t === 'cond') {
    msg(`Hueco ${ev.slot + 1}: ${ev.si ? '✔ <b>sí</b>' : '✘ <b>no</b>'}`);
    tmr = setTimeout(() => { tmr = 0; if (root) terminarPaso(ev, uno); }, d * .75);
  } else terminarPaso(ev, uno);
}
function terminarPaso(ev, uno) {
  const fin = ev.fin || (ev.t === 'error' ? ev.res : null);
  if (fin) { auto = false; actualizarBotones(); resultado(fin); return; }
  if (auto && !uno) tmr = setTimeout(() => { tmr = 0; avanzar(); }, 120 / vel); else actualizarBotones();
}
function textoError(r) {
  const L = cur.L;
  if (r.err === 'camino') return `El hueco ${r.slot + 1} pide <b>${M.NOMBRE_COL[r.col].toLowerCase()}</b>, pero desde el lugar ${r.desde + 1} no sale ningún camino de ese color (o va en sentido contrario).`;
  if (r.err === 'noportal') return `El programa terminó en el lugar ${r.nodo + 1}, pero el portal está en el ${L.p + 1}.`;
  if (r.err === 'faltan') return `Llegaste al portal, pero faltan <b>${r.faltan}</b> ${r.faltan === 1 ? 'cristal' : 'cristales'}. El programa siempre se ejecuta entero.`;
  if (r.err === 'bucle') return 'El programa se repite sin parar. Revisa las condiciones del programa.';
  return 'Falta alguna ficha.';
}
function resultado(r) {
  if (r.ok) { ganar(r); return; }
  api.sonido('error'); api.vibrar(60);
  msg('❌ ' + textoError(r) + ' Cambia fichas y vuelve a probar.', 'mal');
  const m = $('#cryMapa'); if (m) { m.classList.remove('tiembla'); void m.offsetWidth; m.classList.add('tiembla'); }
}
function ganar(r) {
  const par = cur.L.par || r.pasos, sinAyuda = cur.h === 0, e = 1 + (sinAyuda ? 1 : 0) + (sinAyuda && r.pasos <= par ? 1 : 0);
  cur.ok = true; cur.e = e; cur.p = r.pasos;
  if (cur.tipo === 'tuto') { D.tuto = Math.max(D.tuto, +cur.id.slice(1)); D.cur = cur; guardar(); api.sonido('ganar'); mostrarRes(); return; }
  if (cur.tipo === 'camp') { const p = D.prog[cur.id]; if (!p || e > p.e || (e === p.e && r.pasos < p.p)) D.prog[cur.id] = { e: Math.max(e, p ? p.e : 0), p: p && e < p.e ? p.p : r.pasos }; }
  if (cur.tipo === 'diario') {
    const hoy = hoyKey(); D.diario = { f: hoy, e: Math.max(e, D.diario.f === hoy ? D.diario.e : 0) };
    if (D.racha.ult !== hoy) D.racha = { ult: hoy, n: D.racha.ult === ayer(hoy) ? D.racha.n + 1 : 1 };
    api.reto.completar(hoy);
  }
  D.cur = cur; guardar();
  const tr = cur.tipo === 'camp' ? M.TRAMOS.find(t => t.id === cur.id[0]) : M.TRAMOS.find(t => t.id === cur.tr);
  api.registrar({ res: 'victoria', variante: tr ? tr.nombre : 'Mis niveles', limpio: sinAyuda });
  api.sonido('ganar'); api.vibrar([40, 40, 80]);
  mostrarRes();
}
function siguienteId() {
  const ids = idsCamp(), k = ids.indexOf(cur.id); return k >= 0 && k + 1 < ids.length ? ids[k + 1] : null;
}
function mostrarRes() {
  if (cur.tipo === 'tuto') {
    const k = +cur.id.slice(1), ultimo = k >= TUTO.length;
    msg('🎉 <b>¡Muy bien!</b> ' + (ultimo ? 'Has terminado el tutorial. ¡Ya sabes jugar!' : 'Pasa al siguiente paso del tutorial.'), 'bien');
    const R = $('#cryRes'); if (R) R.innerHTML = `<div class="bar">${ultimo ? '<button class="btn on" data-ac="camp" data-id="p1">▶️ Empezar la campaña</button>' : `<button class="btn on" data-ac="tuto" data-k="${k + 1}">▶️ Siguiente (${k + 1}/${TUTO.length})</button>`}<button class="btn" data-ac="repetir">🔁 Repetir</button><button class="btn" data-ac="menu">🗺️ Niveles</button></div>`;
    const rb = $('#cryRun'); if (rb) rb.disabled = true; return;
  }
  const e = cur.e || (cur.p ? 1 : 1), nx = cur.tipo === 'camp' ? siguienteId() : null;
  msg(`🎉 <b>¡Nivel superado!</b> ${estrellasHtml(Math.min(3, e))} · ${cur.p || '?'} ${cur.p === 1 ? 'paso' : 'pasos'}${cur.L.par ? ` (mejor posible: ${cur.L.par})` : ''}`, 'bien');
  const R = $('#cryRes'); if (!R) return;
  const ayuda = cur.h ? `<p class="note">Con ${cur.h} ${cur.h === 1 ? 'pista' : 'pistas'}: sin ellas ganas más estrellas (★★ sin pistas, ★★★ sin pistas y con los pasos mínimos).</p>` : e < 3 ? '<p class="note">★★★ = sin pistas y con el menor número de pasos posible.</p>' : '';
  R.innerHTML = `${ayuda}<div class="bar">${nx && abierto(nx) ? `<button class="btn on" data-ac="camp" data-id="${nx}">▶️ Siguiente nivel</button>` : ''}
    ${cur.tipo === 'azar' ? `<button class="btn on" data-ac="azar" data-t="${cur.tr}">🎲 Otro aleatorio</button>` : ''}<button class="btn" data-ac="repetir">🔁 Repetir</button><button class="btn" data-ac="menu">🗺️ Niveles</button></div>`;
  const rb = $('#cryRun'); if (rb) rb.disabled = true;
}
function pista() {
  if (cur.ok) return; cambio();
  const p = M.pista(cur.L, cur.A);
  if (!p) { api.aviso(llena() ? 'Ya está todo colocado: pulsa Ejecutar.' : 'No hay pista para este nivel.'); return; }
  const s = cur.L.sc[p.hueco], t = s.k, v = p.valor;
  const dst = cur.A.slice(); dst[p.hueco] = null;
  if (!dispo(t, v, p.hueco)) { const j = cur.L.sc.findIndex((x, i) => i !== p.hueco && x.k === t && cur.A[i] === v && cur.L.sol && cur.A[i] !== cur.L.sol[i]); if (j >= 0) { undo.push(cur.A.slice()); cur.A[j] = null; } }
  poner(p.hueco, v); cur.h++; sel = { tok: null, slot: null };
  repintarProg(); msg(`💡 Pista: en el hueco ${p.hueco + 1} va ${t === 'a' ? '«' + M.NOMBRE_COL[M.COLS[v]].toLowerCase() + '»' : M.tokTexto(v).toLowerCase()}${p.corregir ? ' (estaba mal colocado)' : ''}.`);
}

/* ---------- editor ---------- */
const GRUPOS_ED = ['lugar', 'camino', 'cristal', 'troll', 'salida', 'portal', 'borrar'];
function nuevoED(L) {
  const base = L ? { n: L.n.map(q => [...q]), e: L.e.map(q => [...q]), l: L.l.map(q => [...q]), c: L.c.map(q => [...q]), t: L.t.map(q => [...q]), s: L.s, p: L.p } : { n: [], e: [], l: [], c: [], t: [], s: -1, p: -1 };
  return { L: base, bloques: L ? bloquesDe(L) : [['s', 3]], tool: 'lugar', col: 'r', dir: 0, a: null, A: null, nombre: L ? L.nombre || '' : '', idx: -1, msg: '', ok: false };
}
// Los niveles creados con el editor (o generados) guardan sus bloques en `bl`; si falta, se parte de una secuencia simple.
function bloquesDe(L) { return Array.isArray(L.bl) && L.bl.length ? L.bl.map(b => b.slice()) : [['s', Math.min(L.sc.length, 8)]]; }
function scED() { return M.plantilla(ED.bloques); }
function nHuecos(bl) { return M.plantilla(bl).length; }
function abrirEditor(L, idx) {
  parar(); ED = nuevoED(L || null); ED.idx = idx == null ? -1 : idx;
  ED.A = scED().map(() => null);
  if (L && L.sol && L.sol.length === ED.A.length) ED.A = L.sol.slice();
  vista = 'editor'; pintarEditor();
}
function pintarEditor() {
  if (!root || !ED) return; vista = 'editor';
  const P = pal(), sc = scED(), L = ED.L;
  const herr = [['lugar', '📍 Lugar'], ['camino', '🔗 Camino'], ['cristal', '💎 Cristal'], ['troll', '👹 Troll'], ['salida', '🚩 Salida'], ['portal', '🌀 Portal'], ['borrar', '🗑️ Borrar']];
  const bloquesH = ED.bloques.map((b, k) => b[0] === 's' ? `<div class="cryblo"><span>Acciones</span><button class="btn" data-ac="blq" data-k="${k}" data-d="-1">−</button><b>${b[1]}</b><button class="btn" data-ac="blq" data-k="${k}" data-d="1">+</button><button class="btn danger" data-ac="blqdel" data-k="${k}">✕</button></div>`
    : b[0] === 'i' ? `<div class="cryblo"><span>Si / no · sí</span><button class="btn" data-ac="blq" data-k="${k}" data-j="1" data-d="-1">−</button><b>${b[1]}</b><button class="btn" data-ac="blq" data-k="${k}" data-j="1" data-d="1">+</button><span>no</span><button class="btn" data-ac="blq" data-k="${k}" data-j="2" data-d="-1">−</button><b>${b[2]}</b><button class="btn" data-ac="blq" data-k="${k}" data-j="2" data-d="1">+</button><button class="btn danger" data-ac="blqdel" data-k="${k}">✕</button></div>`
      : `<div class="cryblo"><span>Bucle de</span><button class="btn" data-ac="blq" data-k="${k}" data-d="-1">−</button><b>${b[1]}</b><button class="btn" data-ac="blq" data-k="${k}" data-d="1">+</button><span>acciones</span><button class="btn danger" data-ac="blqdel" data-k="${k}">✕</button></div>`).join('');
  root.innerHTML = `<div class="cry cry-ed" id="cryRoot">
    <div class="crycab"><b>✏️ Editor de niveles</b><span class="note">${L.n.length} lugares · ${sc.length} huecos</span></div>
    <p class="note">1) Dibuja el <b>mapa</b>: lugares y caminos (color + sentido). 2) Coloca cristales, trolls, la <b>salida</b> y el <b>portal</b>. 3) Monta el <b>programa</b> y escribe una <b>solución</b> tocando los huecos. 4) Prueba y guarda: otras personas tendrán que adivinar tu solución con las fichas que uses.</p>
    <div class="seg crytools">${herr.map(([k, t]) => `<button class="btn ${ED.tool === k ? 'on' : ''}" data-ac="herr" data-k="${k}">${t}</button>`).join('')}</div>
    ${ED.tool === 'camino' ? `<div class="bar"><span class="lbl">Camino</span><div class="seg">${M.COLS.map(c => `<button class="btn ${ED.col === c ? 'on' : ''}" data-ac="edcol" data-c="${c}"><span style="color:${P[c]}">■</span> ${M.NOMBRE_COL[c]} ${GLIFO[c]}</button>`).join('')}</div>
      <div class="seg"><button class="btn ${ED.dir === 0 ? 'on' : ''}" data-ac="eddir" data-d="0">↔ Ida y vuelta</button><button class="btn ${ED.dir === 1 ? 'on' : ''}" data-ac="eddir" data-d="1">→ Un sentido</button></div>
      <p class="note">Toca un lugar y luego otro vecino (también en diagonal). Tocar el mismo lugar dos veces crea un <b>bucle</b>. Cada lugar solo puede tener <b>un camino de cada color</b>.</p></div>` : ''}
    <div class="crymapa ed" id="cryMapa">${svgMapa(L, { ed: true, aSel: ED.a })}</div>
    <p class="crymsg" id="cryMsg" role="status">${ED.msg || ''}</p>
    <h3 class="cryh">Programa</h3>
    ${bloquesH}
    <div class="bar"><button class="btn" data-ac="blqadd" data-t="s">+ Acciones</button><button class="btn" data-ac="blqadd" data-t="i">+ Si / no</button><button class="btn" data-ac="blqadd" data-t="l">+ Bucle</button></div>
    <p class="note">Toca un hueco para ir cambiando su ficha (correr → deslizar → saltar → vacío; en las condiciones: troll naranja, troll morado, =0, =1…). Esa será la <b>solución</b>.</p>
    <div class="cryscwrap"><div class="cryscroll" id="cryScroll">${svgPergamino({ ...L, sc }, ED.A, {})}</div></div>
    <div class="bar"><span class="lbl">Nombre</span><input id="cryNom" class="crynom" maxlength="30" placeholder="Mi nivel" value="${esc(ED.nombre)}"></div>
    <div class="bar"><button class="btn" data-ac="edprobar">🧪 Probar</button><button class="btn on" data-ac="edguardar">💾 Guardar</button><button class="btn" data-ac="edsalir">⬅ Salir</button></div>
  </div>${api.barraHtml()}`;
}
function edMsg(t, cls = '') { ED.msg = t; const m = $('#cryMsg'); if (m) { m.className = 'crymsg ' + cls; m.innerHTML = t; } }
function edBorrarNodo(i) {
  const L = ED.L, f = x => x > i ? x - 1 : x;
  L.n.splice(i, 1); L.e = L.e.filter(q => q[0] !== i && q[1] !== i).map(q => [f(q[0]), f(q[1]), q[2], q[3]]);
  L.l = L.l.filter(q => q[0] !== i).map(q => [f(q[0]), q[1]]); L.c = L.c.filter(q => q[0] !== i).map(q => [f(q[0]), q[1]]); L.t = L.t.filter(q => q[0] !== i).map(q => [f(q[0]), q[1]]);
  L.s = L.s === i ? -1 : f(L.s); L.p = L.p === i ? -1 : f(L.p);
}
function distSeg(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy))); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); }
function edTocarMapa(ev) {
  const svg = $('#cryMapa svg'); if (!svg) return;
  const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; const q = pt.matrixTransform(svg.getScreenCTM().inverse());
  const c = Math.round((q.x - 10) / 20), r = Math.round((q.y - 10) / 20), L = ED.L;
  if (c < 0 || r < 0 || c >= M.GC || r >= M.GR) return;
  const i = L.n.findIndex(n => n[0] === c && n[1] === r), t = ED.tool;
  ED.ok = false;
  if (t === 'lugar') { if (i < 0) { if (L.n.length >= M.MAX_NODOS) { edMsg('Máximo ' + M.MAX_NODOS + ' lugares.', 'mal'); return; } L.n.push([c, r]); } }
  else if (t === 'borrar') {
    if (i >= 0) edBorrarNodo(i);
    else { const p = [q.x, q.y]; let best = -1, bd = 4; L.e.forEach((e, k) => { const d = distSeg(p, pos(L, e[0]), pos(L, e[1])); if (d < bd) { bd = d; best = k; } }); if (best >= 0) L.e.splice(best, 1); else { const li = L.l.findIndex(([n, col]) => { const [x, y] = centroBucle(L, n, col); return Math.hypot(x - q.x, y - q.y) < 4.5; }); if (li >= 0) L.l.splice(li, 1); } }
  } else if (i < 0) return;
  else if (t === 'cristal') { const k = L.c.findIndex(x => x[0] === i), n = k >= 0 ? L.c[k][1] : 0, m = (n + 1) % 4; if (k >= 0) L.c.splice(k, 1); if (m) L.c.push([i, m]); }
  else if (t === 'troll') { const k = L.t.findIndex(x => x[0] === i), cur_ = k >= 0 ? L.t[k][1] : null; if (k >= 0) L.t.splice(k, 1); const nx = cur_ === null ? 'o' : cur_ === 'o' ? 'p' : null; if (nx) L.t.push([i, nx]); }
  else if (t === 'salida') L.s = i;
  else if (t === 'portal') L.p = i;
  else if (t === 'camino') {
    if (ED.a == null) ED.a = i;
    else if (ED.a === i) {
      ED.a = null; const col = ED.col, k = L.l.findIndex(x => x[0] === i && x[1] === col);
      if (k >= 0) L.l.splice(k, 1); else { L.l.push([i, col]); if (!M.info({ ...L, n: L.n, e: L.e, l: L.l }).ok) { L.l.pop(); edMsg('Ese lugar ya tiene un camino de ese color.', 'mal'); pintarEditor(); return; } }
    } else {
      const a = ED.a; ED.a = null; const na = L.n[a], nb = L.n[i];
      if (Math.max(Math.abs(na[0] - nb[0]), Math.abs(na[1] - nb[1])) !== 1) { edMsg('Los lugares unidos deben ser vecinos (también en diagonal).', 'mal'); pintarEditor(); return; }
      if (na[0] !== nb[0] && na[1] !== nb[1]) { const o1 = L.n.findIndex(n => n[0] === na[0] && n[1] === nb[1]), o2 = L.n.findIndex(n => n[0] === nb[0] && n[1] === na[1]); if (o1 >= 0 && o2 >= 0 && L.e.some(e => (e[0] === o1 && e[1] === o2) || (e[0] === o2 && e[1] === o1))) { edMsg('Dos diagonales no pueden cruzarse.', 'mal'); pintarEditor(); return; } }
      const old = L.e.findIndex(e => (e[0] === a && e[1] === i) || (e[0] === i && e[1] === a)), ant = old >= 0 ? L.e[old] : null;
      if (old >= 0) L.e.splice(old, 1);
      L.e.push([a, i, ED.col, ED.dir]);
      if (!M.info({ n: L.n, e: L.e, l: L.l, c: [], t: [] }).ok) { L.e.pop(); if (ant) L.e.push(ant); edMsg('Ese lugar ya tiene un camino de ese color (o el otro extremo).', 'mal'); pintarEditor(); return; }
    }
  }
  pintarEditor();
}
function edTocarHueco(i) {
  const s = scED()[i], ciclo = s.k === 'a' ? [null, 0, 1, 2] : [null, -1, -2, 0, 1, 2, 3, 4, 5, 6, 7];
  const k = ciclo.indexOf(ED.A[i]); ED.A[i] = ciclo[(k + 1) % ciclo.length]; ED.ok = false;
  $('#cryScroll').innerHTML = svgPergamino({ ...ED.L, sc: scED() }, ED.A, {});
}
function nivelDesdeED() {
  const L = ED.L, sc = scED(), A = ED.A;
  if (L.n.length < 2) return { err: 'Pon al menos 2 lugares.' };
  if (L.s < 0) return { err: 'Falta la <b>salida</b> 🚩 (donde empieza el avatar).' };
  if (L.p < 0) return { err: 'Falta el <b>portal</b> 🌀.' };
  if (L.e.length < 1) return { err: 'Une los lugares con caminos.' };
  if (A.some(v => v == null)) return { err: 'Escribe la solución: pon una ficha en <b>todos</b> los huecos del programa.' };
  const f = [0, 0, 0], k = []; sc.forEach((s, i) => { if (s.k === 'a') f[A[i]]++; else k.push(A[i]); });
  const N = M.validar({ n: L.n, e: L.e, l: L.l, c: L.c, t: L.t, s: L.s, p: L.p, sc, f, k, nombre: ED.nombre || '', bl: ED.bloques });
  if (!N) return { err: 'El nivel no es válido (revisa los caminos).' };
  const r = M.correr(N, A);
  return { N, A, r };
}
function edProbar(guardarNivel) {
  ED.nombre = ($('#cryNom') || {}).value || ED.nombre;
  const R = nivelDesdeED(); if (R.err) { edMsg('⚠️ ' + R.err, 'mal'); return; }
  if (!R.r.ok) { edMsg('❌ Tu solución no funciona: ' + textoErrorDe(R.N, R.r), 'mal'); return; }
  if (!guardarNivel) { ED.ok = true; edMsg(`✅ ¡Funciona! Tu solución usa <b>${R.r.pasos}</b> pasos. Ya puedes guardar el nivel.`, 'bien'); return; }
  const N = R.N; N.nombre = (ED.nombre || '').trim().slice(0, 30) || `Mi nivel ${D.mis.length + 1}`; N.sol = R.A.slice(); N.par = R.r.pasos;
  if (M.espacio(N) < 200000) { const S = M.resolver(N, { max: 200000 }); if (S.n) { N.par = S.min; N.sol = S.mejor; } }
  if (ED.idx >= 0) D.mis[ED.idx] = N; else { if (D.mis.length >= SOL_MAX) { edMsg('Ya tienes ' + SOL_MAX + ' niveles. Borra alguno.', 'mal'); return; } D.mis.push(N); ED.idx = D.mis.length - 1; }
  guardar(); api.sonido('ok'); edMsg(`💾 Guardado en «Mis niveles». Código para compartir en el menú (📤).`, 'bien');
}
function textoErrorDe(L, r) { const k = cur; cur = { L }; const t = textoError(r); cur = k; return t; }

/* ---------- eventos ---------- */
function clic(e) {
  if (!root) return;
  const hs = e.target.closest('[data-s]');
  if (hs && vista === 'juego') { tocarHueco(+hs.dataset.s); return; }
  if (hs && vista === 'editor') { edTocarHueco(+hs.dataset.s); return; }
  if (vista === 'editor' && e.target.closest('#cryMapa')) { edTocarMapa(e); return; }
  const g = e.target.closest('[data-gen]'); if (g) { api.gen(g.dataset.gen); return; }
  const b = e.target.closest('[data-ac]'); if (!b || b.disabled) return;
  accion(b.dataset.ac, b.dataset);
}
async function accion(a, d) {
  switch (a) {
    case 'camp': abrirCamp(d.id); break;
    case 'tuto': abrirTuto(+d.k); break;
    case 'azar': generarYAbrir('azar', d.t, (Math.random() * 4e9) >>> 0); break;
    case 'diario': {
      const hoy = hoyKey(), t = tramoDiario();
      if (cur && cur.tipo === 'diario' && !cur.ok && D.cur && D.cur.tipo === 'diario' && D.diario.f !== hoy) { /* sigue el de ayer: se regenera */ }
      generarYAbrir('diario', t, M.semillaDe('crystalogic:' + hoy), ''); break;
    }
    case 'volver': if (cur) { vista = 'juego'; undo = []; pintarJuego(); } break;
    case 'menu': irMenu(); break;
    case 'repetir': abrir(cur.tipo, cur.id, cur.L, { tr: cur.tr }); break;
    case 'aspecto': asp.abrir(); break;
    case 'reglas': reglas(); break;
    case 'run': ejecutar(); break;
    case 'paso': unPaso(); break;
    case 'reset': reiniciar(); break;
    case 'undo': if (undo.length && !cur.ok) { cambio(); cur.A = undo.pop(); guardarCur(); repintarProg(); } break;
    case 'vaciar': if (!cur.ok) { cambio(); undo.push(cur.A.slice()); cur.A = cur.A.map(() => null); sel = { tok: null, slot: null }; guardarCur(); repintarProg(); msg(mensajeInicial()); } break;
    case 'pista': pista(); break;
    case 'vel': vel = vel === 1 ? 2 : vel === 2 ? 4 : 1; api.setPref('vel', vel); { const v = $('#cryVel'); if (v) v.textContent = `⏩ ×${vel}`; } break;
    case 'tok': tocarFicha(d.t, +d.v); break;
    case 'mio': abrir('mio', 'm' + d.i, D.mis[+d.i]); break;
    case 'delmio': if (api.confirmar('¿Borrar este nivel?')) { D.mis.splice(+d.i, 1); guardar(); pintarMenu(); } break;
    case 'editmio': abrirEditor(D.mis[+d.i], +d.i); break;
    case 'compmio': compartirNivel(D.mis[+d.i]); break;
    case 'importar': importar(); break;
    case 'nuevoed': abrirEditor(null); break;
    case 'herr': ED.tool = d.k; ED.a = null; pintarEditor(); break;
    case 'edcol': ED.col = d.c; pintarEditor(); break;
    case 'eddir': ED.dir = +d.d; pintarEditor(); break;
    case 'blq': {
      const b = ED.bloques[+d.k], j = d.j ? +d.j : 1, nv = b[j] + (+d.d), copia = ED.bloques.map(x => x.slice()); copia[+d.k][j] = nv;
      const min = b[0] === 'i' ? 0 : 1; if (nv < min || nv > 8 || nHuecos(copia) > M.MAX_HUECOS) break;
      if (b[0] === 'i' && copia[+d.k][1] + copia[+d.k][2] === 0) break;
      ED.bloques = copia; ED.A = scED().map(() => null); ED.ok = false; pintarEditor(); break;
    }
    case 'blqdel': if (ED.bloques.length > 1) { ED.bloques.splice(+d.k, 1); ED.A = scED().map(() => null); pintarEditor(); } break;
    case 'blqadd': {
      const nb = d.t === 's' ? ['s', 1] : d.t === 'i' ? ['i', 1, 1] : ['l', 2], copia = [...ED.bloques.map(x => x.slice()), nb];
      if (nHuecos(copia) > M.MAX_HUECOS) { edMsg('El programa admite como mucho ' + M.MAX_HUECOS + ' huecos.', 'mal'); break; }
      ED.bloques = copia; ED.A = scED().map(() => null); pintarEditor(); break;
    }
    case 'edprobar': edProbar(false); break;
    case 'edguardar': edProbar(true); break;
    case 'edsalir': if (api.confirmar('¿Salir del editor? Lo que no hayas guardado se perderá.')) irMenu(); break;
  }
}
async function compartirNivel(L) {
  const cod = M.compartir(L);
  const m = api.modal('📤 Código del nivel', `<p class="note">Copia este código y envíalo: quien lo reciba lo pega en «Importar código».</p><textarea class="crycod" readonly rows="6" onclick="this.select()">${esc(cod)}</textarea><div class="bar"><button class="btn on" id="cryCopia">📋 Copiar</button></div>`);
  const bt = m && m.cuerpo ? m.cuerpo.querySelector('#cryCopia') : document.getElementById('cryCopia');
  if (bt) bt.onclick = async () => { try { await navigator.clipboard.writeText(cod); api.aviso('Código copiado'); } catch { api.compartir(cod); } };
}
async function importar() {
  const t = await api.pedirTexto('📥 Importar nivel', { nota: 'Pega aquí el código del nivel.', placeholder: 'Código' });
  if (t == null || !t.trim()) return;
  const L = M.leerCodigo(t);
  if (!L) { api.aviso('Ese código no es válido.'); return; }
  if (D.mis.length >= SOL_MAX) { api.aviso('Ya tienes ' + SOL_MAX + ' niveles. Borra alguno.'); return; }
  if (!L.nombre) L.nombre = 'Importado ' + (D.mis.length + 1);
  const S = M.espacio(L) < 200000 ? M.resolver(L, { max: 200000 }) : null;
  if (S && !S.n) { api.aviso('Ese nivel no tiene solución.'); return; }
  if (S) { L.par = S.min; L.sol = S.mejor; }
  D.mis.push(L); guardar(); pintarMenu(); api.aviso('Nivel importado');
}
function reglas() {
  api.modal('Cómo se juega', `<ul class="cryreglas">
    <li><b>Objetivo:</b> programar al mago 🧙 para que <b>recoja todos los cristales</b> 💎 y <b>termine sobre el portal</b> 🌀.</li>
    <li><b>El mapa:</b> círculos numerados (lugares) unidos por <b>caminos de colores</b>. El mago empieza en la <b>SALIDA</b> (anillo verde).</li>
    <li><b>Las fichas:</b> cada una mueve al mago por el camino de <b>su color</b> que salga del lugar donde está: <b>rojo » correr</b>, <b>verde ≈ deslizar</b>, <b>azul ^ saltar</b>. Los caminos con flecha solo se recorren en ese sentido; un círculo pequeño en un lugar es un camino que te deja donde estás.</li>
    <li><b>El programa</b> (abajo) tiene <b>huecos numerados</b>. Empieza por el ① («EMPIEZA AQUÍ») y sigue las flechas. Rellena <b>todos</b> los huecos usando las fichas que te dan (cada una, una vez).</li>
    <li><b>Cómo se ponen:</b> toca una ficha y luego un hueco (o al revés). Tocar una ficha ya puesta la quita.</li>
    <li>Pulsa <b>▶️ Ejecutar</b> para ver al mago seguir tu programa, o <b>⏭ Paso</b> para ir ficha a ficha. Si falla, el mensaje te dice dónde: cambia fichas y prueba otra vez.</li>
    <li><b>Hexágonos:</b> son preguntas. «=2» = «¿llevo exactamente 2 cristales?»; 🟠/🟣 = «¿hay un troll naranja/morado en este lugar?». <b>✔ sí</b> sigue por una flecha y <b>✘ no</b> por la otra. Si una flecha vuelve hacia arriba, el programa se repite.</li>
    <li>Un lugar con varios cristales da <b>uno</b> por visita. Si pasas por el portal antes del final, el programa <b>sigue</b>: cuenta dónde termina.</li>
    <li><b>Estrellas:</b> ★ resolver · ★★ sin pistas · ★★★ sin pistas y con los pasos mínimos. 💡 Pista te coloca una ficha.</li>
    <li>Además: <b>reto del día</b>, niveles <b>aleatorios</b> y un <b>editor</b> para crear niveles y compartirlos con un código.</li></ul>`);
}
