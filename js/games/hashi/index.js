import { $, esperar, fmtTiempo } from '../../core/dom.js';
import { Pila } from '../../core/undo.js';
import { Cronometro } from '../../core/cronometro.js';
import { NIVELES, construir, generar, resuelto, grados, bloqueada, componentes, pista as buscarPista } from './motor.js';

const U = 100, PH = 99, RETO = { dif: 'normal' };
const IMG = n => new URL(`./img/${n}.webp`, import.meta.url).href;
let S = null, api = null, asp = null, root = null, crono = null, hist = null, rehacer = [], P = null, par = null, ocupado = false, boyas = false, sel = -1, ultimo = -1, malas = new Set(), pista_ = null, tPista = 0, onKey = null, arr = null;
const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
// Temas de islas (3 dibujos cada uno). «Mezcladas» elige un tema por puzle y «Revueltas» los mezcla en el mismo tablero; Navidad solo sale sola en diciembre y enero.
const TEMAS = { tropical: ['isla1', 'isla2', 'isla3'], hielo: ['hielo1', 'hielo2', 'hielo3'], volcan: ['volcan1', 'volcan2', 'volcan3'], desierto: ['desierto1', 'desierto2', 'desierto3'], otono: ['otono1', 'otono2', 'otono3'], navidad: ['navidad1', 'navidad2', 'navidad3'] };
const navidadActiva = () => { const m = new Date().getMonth(); return m === 11 || m === 0; };
const temasAuto = () => Object.keys(TEMAS).filter(t => t !== 'navidad' || navidadActiva());
let semilla = 0;
function imgIsla(r, c, n, modo) {
  const l = temasAuto(), tema = TEMAS[modo] ? modo : modo === 'revuelto' ? l[(r * 5 + c * 3 + n) % l.length] : l[semilla % l.length];
  return TEMAS[tema][(r * 7 + c * 13 + n) % 3];
}

/* ---------- validación / resumen ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || !Object.hasOwn(NIVELES, d.dif) || !Array.isArray(d.isl) || d.isl.length < 2 || d.isl.length > 120) return null;
  const vistos = new Set();
  for (const x of d.isl) {
    if (!Array.isArray(x) || x.length !== 3 || !ent(x[0], 0, 40) || !ent(x[1], 0, 40) || !ent(x[2], 1, 8)) return null;
    vistos.add(x[0] * 100 + x[1]);
  }
  if (vistos.size !== d.isl.length) return null;
  for (const x of d.isl) if (vistos.has((x[0] + 1) * 100 + x[1]) || vistos.has(x[0] * 100 + x[1] + 1)) return null;     // islas pegadas: no válido
  const Q = construir(d.isl.map(x => x.slice())), n = Q.E.length;
  const vec = (v, max) => Array.isArray(v) && v.length === n && v.every(q => ent(q, 0, max));
  if (!vec(d.sol, 2) || !resuelto(Q, d.sol) || !vec(d.cur, 2) || !(d.marc === undefined || vec(d.marc, 1))) return null;
  const hist = Array.isArray(d.hist) ? d.hist.filter(h => h && vec(h.cur, 2) && vec(h.marc, 1)).slice(-80).map(h => ({ cur: h.cur.slice(), marc: h.marc.slice() })) : [];
  return { dif: d.dif, isl: d.isl.map(x => x.slice()), sol: d.sol.slice(), cur: d.cur.slice(), marc: d.marc ? d.marc.slice() : new Array(n).fill(0), hist,
    t: ent(d.t, 0, 1e7) ? d.t : 0, pistas: ent(d.pistas, 0, 1e5) ? d.pistas : 0, reto: typeof d.reto === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.reto) ? d.reto : null };
}
export const migrarV1 = d => d;
export function resumen(d) {
  const Q = construir(d.isl.map(x => x.slice())), g = grados(Q, d.cur), ok = resuelto(Q, d.cur), hechas = d.isl.filter((x, i) => g[i] === x[2]).length;
  const w = Math.max(...d.isl.map(x => x[1])) + 1, h = Math.max(...d.isl.map(x => x[0])) + 1, pre = d.reto ? '📅 Reto · ' : '';
  return { texto: pre + `${w}×${h} · ${NIVELES[d.dif].nombre} · ${ok ? 'resuelto' : `${hechas}/${d.isl.length} islas`}`, fin: ok };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; ocupado = false; boyas = false; sel = -1; ultimo = -1; malas = new Set(); pista_ = null; arr = null; rehacer = [];
  asp = api.aspecto([
    { clave: 'islas', titulo: 'Islas', icono: '🏝️', def: 'mezcla', opciones: [{ id: 'mezcla', nombre: 'Mezcladas (un tema por puzle)' }, { id: 'revuelto', nombre: 'Revueltas (todos los temas)' }, { id: 'tropical', nombre: 'Tropical', img: IMG('isla1') }, { id: 'hielo', nombre: 'Helada', img: IMG('hielo1') }, { id: 'volcan', nombre: 'Volcánica', img: IMG('volcan1') }, { id: 'desierto', nombre: 'Desierto', img: IMG('desierto1') }, { id: 'otono', nombre: 'Otoño', img: IMG('otono1') }, { id: 'navidad', nombre: 'Navidad', img: IMG('navidad1') }] },
    { clave: 'adornos', titulo: 'Adornos del mar', icono: '⛵', def: 'si', opciones: [{ id: 'si', nombre: 'Con adornos' }, { id: 'no', nombre: 'Sin adornos' }] },
  ], () => { if (S) pintar(); });
  await api.css(new URL('./hashi.css', import.meta.url));
  const g = api.cargar();
  S = g ? { ...g, done: resuelto(construir(g.isl), g.cur) } : null;
  hist = new Pila(80, g ? g.hist : []);
  root.innerHTML = `<div id="hsReto"></div>
    <div class="info"><span class="mut" id="hsInfo"></span><span id="hsCrono" aria-label="Tiempo">0:00</span></div>
    <div class="hs-wrap" id="hsWrap"><div class="hs-mar"><div class="hs-ad" aria-hidden="true"><img class="ad-barco" src="${IMG('adorno-barco')}" alt=""><img class="ad-tortuga" src="${IMG('adorno-tortuga')}" alt=""><img class="ad-gaviotas" src="${IMG('adorno-gaviotas')}" alt=""></div>
      <svg id="hsSvg" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Tablero de Puentes Hashi" preserveAspectRatio="xMidYMid meet"></svg></div></div>
    <div class="msg" id="hsMsg" role="status" aria-live="polite"></div>
    <div class="hs-acc" id="hsAcc"><button class="acc" data-ac="undo"><i>↶</i>Deshacer</button><button class="acc" data-ac="redo"><i>↷</i>Rehacer</button><button class="acc" data-ac="boya" aria-pressed="false"><i>🛟</i>Boyas</button><button class="acc" data-ac="pista"><i>💡</i>Pista</button><button class="acc" data-ac="comprobar"><i>✔</i>Comprobar</button></div>${api.barraHtml()}`;
  const svg = $('#hsSvg');
  svg.addEventListener('pointerdown', abajo); svg.addEventListener('pointerup', arriba); svg.addEventListener('pointercancel', () => { arr = null; });
  root.addEventListener('click', clic);
  onKey = teclado; document.addEventListener('keydown', onKey);
  api.barra({ nueva: () => nueva(S.dif, false, true),
    salir: () => { location.hash = '#/cat/logica'; },
    crono: () => crono,
    config: { valores: () => ({ dif: S.dif }), grupos: v => [{ clave: 'dif', titulo: 'Nivel', nota: (NIVELES[v.dif] || {}).ayuda, opciones: Object.entries(NIVELES).map(([k, x]) => [k, x.nombre]) }], aplicar: v => nueva(v.dif, true, true) } });
  menu();
  crono = new Cronometro(() => { if (S) { S.t = crono.s; $('#hsCrono').textContent = fmtTiempo(crono.s); if (crono.s % 15 === 0) guardar(); } });
  if (!S) await nueva(api.pref('dif', 'normal'), true);
  else { preparar(); arrancar(); pintar(); }
}
function menu() {
  api.menu([{ texto: 'Nuevo puzle', accion: () => nueva(S.dif, false, true) }, { texto: '📅 Reto del día', accion: () => nueva(RETO.dif, false, true, true) }, { texto: 'Comprobar', accion: comprobar },
    { texto: 'Marcar errores al instante', accion: () => { api.setPref('errores', !api.pref('errores', false)); pintar(); menu(); }, activo: api.pref('errores', false) },
    { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Cómo se juega', accion: reglas }]);
}
export function unmount() {
  if (S && crono) { S.t = crono.s; guardar(); }
  if (crono) crono.detener();
  clearTimeout(tPista);
  document.removeEventListener('keydown', onKey);
  if (root) root.removeEventListener('click', clic);
  S = null; crono = null; P = null; par = null; asp = null;
}
function arrancar() { crono.s = S.t; if (!S.done) crono.iniciar(); else crono.detener(); $('#hsCrono').textContent = fmtTiempo(S.t); }
function preparar() {
  semilla = S.isl.reduce((a, x) => (a * 31 + x[0] * 17 + x[1] * 7 + x[2]) >>> 0, 7); P = construir(S.isl); par = new Map(); P.E.forEach((e, k) => { par.set(e.a * 1000 + e.b, k); par.set(e.b * 1000 + e.a, k); });
  const w = Math.max(...S.isl.map(x => x[1])) + 1, h = Math.max(...S.isl.map(x => x[0])) + 1, svg = $('#hsSvg');
  svg.setAttribute('viewBox', `0 0 ${w * U} ${h * U}`); svg.style.aspectRatio = `${w} / ${h}`; $('#hsWrap').style.setProperty('--w', w); $('#hsWrap').style.setProperty('--h', h);
}

/* ---------- partida ---------- */
const hayProgreso = () => S && !S.done && (S.cur.some(Boolean) || S.marc.some(Boolean));
async function nueva(dif, forzar = false, cerrar = false, reto = false) {
  if (ocupado) return;
  if (reto && S && S.reto === api.reto.fecha()) { api.aviso(S.done ? 'Ya has completado el reto de hoy' : 'Ya estás jugando el reto de hoy'); return; }
  if (!forzar && hayProgreso() && !api.confirmar('¿Empezar un puzle nuevo? Perderás el actual.')) return;
  ocupado = true; if (crono) crono.detener();
  $('#hsMsg').textContent = 'Preparando el archipiélago…'; await esperar(30);
  const p = reto ? api.reto.generar(() => generar(dif)) : generar(dif), n = construir(p.isl).E.length;
  S = { dif, isl: p.isl, sol: p.sol, cur: new Array(n).fill(0), marc: new Array(n).fill(0), t: 0, pistas: 0, done: false, reto: reto ? api.reto.fecha() : null };
  if (!reto) api.setPref('dif', dif);
  hist.vaciar(); rehacer = []; malas = new Set(); sel = -1; ultimo = -1; pista_ = null; ocupado = false; boyas = false;
  crono = new Cronometro(crono.alTick, 0);
  preparar(); arrancar(); pintar(); guardar();
}
function guardar() { if (!S) return; const d = { dif: S.dif, isl: S.isl, sol: S.sol, cur: S.cur, marc: S.marc, t: S.t, pistas: S.pistas, reto: S.reto || null, hist: hist ? hist.toJSON().slice(-80) : [] }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }
const instantanea = () => ({ cur: S.cur.slice(), marc: S.marc.slice() });
function pintarReto() {
  const r = $('#hsReto'); if (!r || !S) return;
  const hoy = api.reto.fecha(), hecho = api.reto.hecho(), jugando = S.reto === hoy, k = `${hoy}|${hecho}|${jugando}`;
  if (r.dataset.k === k) return; r.dataset.k = k;
  r.innerHTML = `<div class="reto ${hecho ? 'hecho' : ''}"><span>${hecho ? '✅' : '📅'}</span><div><b>Reto del día · ${api.reto.texto(hoy)}</b>${hecho ? 'Completado. Vuelve mañana para otro.' : jugando ? 'Estás jugando el reto: el mismo archipiélago para todo el mundo.' : `Un puzle de nivel ${NIVELES[RETO.dif].nombre.toLowerCase()}, el mismo para todos hoy.`}</div>${hecho || jugando ? '' : '<button class="btn on" data-ac="reto">Jugar</button>'}</div>`;
}

/* ---------- pintado (SVG) ---------- */
function puenteSvg(e, k, v, cls) {
  const A = S.isl[e.a], B = S.isl[e.b], x1 = A[1] * U + U / 2, y1 = A[0] * U + U / 2, len = Math.abs(B[1] - A[1]) * U + Math.abs(B[0] - A[0]) * U;
  const t = v === 1 ? 30 : 21, sc = t / PH, offs = v === 1 ? [0] : [-13, 13];
  return `<g class="hs-p ${cls}" data-e="${k}">${offs.map(o => e.hor
    ? `<g transform="translate(${x1},${y1 + o - t / 2}) scale(${sc})"><rect width="${len / sc}" height="${PH}" fill="url(#hsPat)"/></g>`
    : `<g transform="translate(${x1 + o + t / 2},${y1}) rotate(90) scale(${sc})"><rect width="${len / sc}" height="${PH}" fill="url(#hsPat)"/></g>`).join('')}</g>`;
}
function pintar() {
  if (!S || !P) return;
  pintarReto();
  const svg = $('#hsSvg'), N = S.isl.length, g = grados(P, S.cur), auto = api.pref('errores', false), mezcla = root.dataset.islas;
  if (!S.done && resuelto(P, S.cur)) {
    S.done = true; crono.detener(); S.t = crono.s; sel = -1;
    api.registrar({ res: 'victoria', tiempo: S.t, variante: S.reto ? 'Reto del día' : NIVELES[S.dif].nombre, limpio: S.pistas === 0 });
    if (S.reto && api.reto.completar(S.reto)) setTimeout(() => api.aviso('📅 ¡Reto del día completado!'), 300);
    api.sonido('ganar'); api.vibrar([60, 40, 60]); guardar();
  }
  const comp = componentes(P, S.cur), usa = new Set(); S.cur.forEach((v, k) => { if (v) { usa.add(P.E[k].a); usa.add(P.E[k].b); } });
  let sv = `<defs><pattern id="hsPat" patternUnits="userSpaceOnUse" width="768" height="${PH}"><image href="${IMG('puente')}" width="768" height="${PH}" preserveAspectRatio="none"/></pattern></defs>`;
  let capaP = '', capaH = '', capaB = '', capaI = '';
  P.E.forEach((e, k) => {
    const A = S.isl[e.a], B = S.isl[e.b], x1 = A[1] * U + U / 2, y1 = A[0] * U + U / 2, x2 = B[1] * U + U / 2, y2 = B[0] * U + U / 2, v = S.cur[k];
    if (v) capaP += puenteSvg(e, k, v, (k === ultimo ? 'pop ' : '') + (malas.has(k) || (auto && v > S.sol[k]) ? 'mal ' : '') + (S.done ? 'ok ' : ''));
    if (S.marc[k] && !v) capaB += `<image class="hs-boya${k === ultimo ? ' pop' : ''}" href="${IMG('boya')}" x="${(x1 + x2) / 2 - 24}" y="${(y1 + y2) / 2 - 24}" width="48" height="48"/>`;
    capaH += e.hor ? `<rect class="hs-hit" data-e="${k}" x="${x1 + 40}" y="${y1 - 34}" width="${Math.max(10, x2 - x1 - 80)}" height="68"/>` : `<rect class="hs-hit" data-e="${k}" x="${x1 - 34}" y="${y1 + 40}" width="68" height="${Math.max(10, y2 - y1 - 80)}"/>`;
  });
  const vecinos = new Set(); if (sel >= 0) P.inc[sel].forEach(e => { const o = P.E[e].a === sel ? P.E[e].b : P.E[e].a; if (S.cur[e] > 0 || !bloqueada(P, S.cur, e)) vecinos.add(o); });
  S.isl.forEach(([r, c, n], i) => {
    const cx = c * U + U / 2, cy = r * U + U / 2, ok = g[i] === n, mal = g[i] > n, v = imgIsla(r, c, n, mezcla);
    const cls = (ok ? 'ok ' : '') + (mal ? 'mal ' : '') + (i === sel ? 'sel ' : '') + (vecinos.has(i) ? 'vec ' : '') + (pista_ && pista_.includes(i) ? 'pis ' : '') + (S.done ? 'fin ' : '');
    capaI += `<g class="hs-i ${cls}" data-i="${i}" style="--d:${(i % 7) * 60}ms"><circle class="hs-halo" cx="${cx}" cy="${cy}" r="52"/><image href="${IMG(v)}" x="${cx - 46}" y="${cy - 46}" width="92" height="92"/><text class="hs-n" x="${cx}" y="${cy + 3}" text-anchor="middle" dominant-baseline="central">${n}</text><circle cx="${cx}" cy="${cy}" r="60" fill="transparent"/><title>Isla ${n}: ${g[i]} puente${g[i] === 1 ? '' : 's'} de ${n}</title></g>`;
  });
  svg.innerHTML = sv + `<g>${capaP}</g><g>${capaB}</g><g>${capaH}</g><g>${capaI}</g>`;
  ultimo = -1;
  const hechas = S.isl.filter((x, i) => g[i] === x[2]).length, puentes = S.cur.reduce((a, b) => a + b, 0);
  $('#hsInfo').textContent = `${hechas}/${N} islas completas · ${puentes} puente${puentes === 1 ? '' : 's'}${S.pistas ? ` · ${S.pistas} pista${S.pistas > 1 ? 's' : ''}` : ''}`;
  $('#hsCrono').textContent = fmtTiempo(S.t);
  const bb = root.querySelector('[data-ac="boya"]'); bb.classList.toggle('on', boyas); bb.setAttribute('aria-pressed', String(boyas));
  root.querySelector('[data-ac="undo"]').disabled = !hist.length || S.done; root.querySelector('[data-ac="redo"]').disabled = !rehacer.length || S.done;
  $('#hsWrap').classList.toggle('ganado', !!S.done);
  const m = $('#hsMsg'); m.className = 'msg' + (S.done ? ' win' : '');
  m.textContent = S.done ? `¡Archipiélago unido en ${fmtTiempo(S.t)}!` : boyas ? 'Modo boyas: toca entre dos islas para marcar «aquí no hay puente».' : sel >= 0 ? 'Isla elegida: toca otra isla en línea (o arrástrala hasta ella) para tender un puente.' : 'Une las islas: cada una lleva tantos puentes como su número. Toca dos islas o el hueco entre ellas.';
  void comp;
}

/* ---------- entrada ---------- */
function alternar(e, forzado = null) {
  if (!S || S.done) return;
  const v = S.cur[e];
  if (boyas && forzado === null) {
    if (v) { api.aviso('Ahí ya hay un puente'); return; }
    hist.push(instantanea()); rehacer = []; S.marc[e] ^= 1; ultimo = e; api.sonido('click'); malas = new Set(); pintar(); guardar(); return;
  }
  const sig = forzado === null ? (S.marc[e] ? 1 : (v + 1) % 3) : forzado;
  if (sig > 0 && v === 0 && bloqueada(P, S.cur, e)) { api.aviso('Cruzaría otro puente'); api.sonido('error'); api.vibrar(40); return; }
  hist.push(instantanea()); rehacer = []; S.cur[e] = sig; S.marc[e] = 0; ultimo = e; malas = new Set(); sel = -1; pista_ = null;
  api.sonido(sig ? 'click' : 'mover'); pintar(); guardar();
}
function destino(ev) { const t = document.elementFromPoint(ev.clientX, ev.clientY); return t ? t.closest('[data-i],[data-e]') : null; }
function abajo(ev) {
  if (!S || S.done || ev.button > 0) return;
  const t = ev.target.closest('[data-i],[data-e]'); arr = t ? (t.dataset.i != null ? { i: +t.dataset.i } : { e: +t.dataset.e }) : null;
}
function arriba(ev) {
  if (!S || S.done || !arr) return;
  const ini = arr; arr = null; const t = destino(ev); if (!t) return;
  if (ini.e != null) { if (t.dataset.e != null && +t.dataset.e === ini.e) alternar(ini.e); else if (t.dataset.i != null) { /* arrastre desde un puente: nada */ } return; }
  if (t.dataset.i == null) { sel = -1; pintar(); return; }
  const j = +t.dataset.i;
  if (j === ini.i) {                                                                    // toque en una isla
    if (sel < 0) { sel = j; api.sonido('click'); return pintar(); }
    if (sel === j) { sel = -1; return pintar(); }
    const e = par.get(sel * 1000 + j); if (e === undefined) { sel = j; api.aviso('Esas islas no se pueden unir'); return pintar(); }
    return alternar(e);
  }
  const e = par.get(ini.i * 1000 + j);                                                  // arrastre de una isla a otra
  if (e === undefined) { api.aviso('Esas islas no se pueden unir'); api.sonido('error'); sel = -1; return pintar(); }
  alternar(e);
}
function deshacer() { if (!S || S.done) return; const h = hist.pop(); if (!h) { api.aviso('Nada que deshacer'); return; } rehacer.push(instantanea()); S.cur = h.cur; S.marc = h.marc; malas = new Set(); sel = -1; pintar(); guardar(); }
function rehaz() { if (!S || S.done || !rehacer.length) return; hist.push(instantanea()); const h = rehacer.pop(); S.cur = h.cur; S.marc = h.marc; malas = new Set(); pintar(); guardar(); }
function comprobar() {
  if (!S || S.done) return; malas = new Set(); S.cur.forEach((v, k) => { if (v > S.sol[k]) malas.add(k); });
  api.aviso(malas.size ? `${malas.size} puente${malas.size > 1 ? 's' : ''} de más (en rojo)` : 'Todo lo que has puesto es correcto'); api.sonido(malas.size ? 'error' : 'ok'); pintar();
}
function pista() {
  if (!S || S.done) return; const p = buscarPista(P, S.cur, S.sol); if (!p) return;
  hist.push(instantanea()); rehacer = []; S.cur[p.e] = p.v; S.marc[p.e] = 0; S.pistas++; ultimo = p.e; sel = -1; malas = new Set();
  pista_ = [P.E[p.e].a, P.E[p.e].b]; clearTimeout(tPista); tPista = setTimeout(() => { pista_ = null; if (S) pintar(); }, 2200);
  api.sonido('ok'); pintar(); guardar();
}
function teclado(ev) {
  if (!S || ev.ctrlKey || ev.metaKey || ev.altKey || document.querySelector('.modal') || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (ev.key === 'z' || ev.key === 'Z') deshacer(); else if (ev.key === 'y' || ev.key === 'Y') rehaz(); else if (ev.key === 'b' || ev.key === 'B') { boyas = !boyas; pintar(); } else if (ev.key === 'Escape') { sel = -1; pintar(); }
}
function clic(ev) {
  const b = ev.target.closest('button'); if (!b || !S) return; const ac = b.dataset.ac;
  if (ac === 'undo') deshacer(); else if (ac === 'redo') rehaz(); else if (ac === 'boya') { boyas = !boyas; sel = -1; pintar(); } else if (ac === 'pista') pista(); else if (ac === 'comprobar') comprobar();
  else if (ac === 'nuevo') nueva(S.dif, false, true); else if (ac === 'reto') nueva(RETO.dif, false, true, true); else if (ac === 'aspecto') asp.abrir();
}
function reglas() {
  api.modal('Puentes Hashi', `<p style="text-align:center"><img src="${IMG('icono')}" alt="" width="96" height="96" style="border-radius:20px"></p><ul>
    <li>Cada <b>isla</b> lleva un número: son los <b>puentes</b> que deben salir de ella.</li>
    <li>Los puentes van en <b>línea recta</b>, horizontales o verticales, entre islas vecinas. Entre dos islas puede haber <b>uno o dos</b>.</li>
    <li>Los puentes <b>no se pueden cruzar</b> ni pasar por encima de otra isla.</li>
    <li>Al final, <b>todas las islas</b> deben quedar unidas en una sola red.</li>
    <li>Toca una isla y después otra en línea (o arrastra de una a otra): un toque pone un puente, otro lo dobla y el tercero lo quita. También vale tocar el hueco entre dos islas.</li>
    <li>🛟 <b>Boyas</b>: marca los huecos donde sabes que no hay puente. 💡 <b>Pista</b> tiende un puente correcto y ✔ <b>Comprobar</b> marca en rojo los que sobran.</li>
    <li>Todos los puzles tienen <b>una única solución</b>. Los tres primeros niveles se resuelven solo con deducción; el Experto y el Maestro pueden pedir probar hipótesis.</li></ul>`);
}
