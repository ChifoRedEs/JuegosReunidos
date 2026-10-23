// Scrabble en español: tablero de 15 × 15, 100 fichas (con CH, LL, RR y Ñ), contra la CPU (3 niveles) o entre 2-4 personas
// en el mismo móvil. Las palabras se comprueban con el diccionario común (core/diccionario.js) en un Worker (trabajador.js).
import { $, esc } from '../../core/dom.js';
import { grupoFondo } from '../../core/aspectos.js';
import { anotarPartida, htmlPartidas } from '../../core/historial.js';
import * as M from './motor.js';

const TABLEROS = {
  clasico: ['Clásico', ['#EFE6CF', '#D9453B', '#2E7BC4']], torneo: ['Torneo', ['#1E7A4E', '#C8372D', '#2763B6']], madera: ['Madera', ['#D9B98A', '#9E2B25', '#2E5D7D']],
  noche: ['Noche', ['#1E2546', '#FF4F7B', '#00B3FF']], pastel: ['Pastel', ['#FFF8EF', '#FF8FA3', '#8EC5FF']], mar: ['Mar', ['#E6F4F7', '#0E6E8C', '#F08A4B']],
};
const FICHAS = {
  marfil: ['Marfil', ['#F7E7BE', '#2A1C0B']], madera: ['Madera', ['#D8A86A', '#2B1606']], negro: ['Negras', ['#23252B', '#F5F0E6']], azul: ['Azules', ['#2F6BFF', '#fff']],
  rosa: ['Rosas', ['#FFB6D0', '#3A0D1C']], menta: ['Menta', ['#9FE6C4', '#0B3A26']], oro: ['Doradas', ['#F4C542', '#3A2A00']],
};
const ROTULO = { T: '3P', D: '2P', t: '3L', d: '2L' }, NOMBRE_P = { T: 'palabra triple', D: 'palabra doble', t: 'letra triple', d: 'letra doble' };

let S = null, api = null, asp = null, root = null, reg = false, onKey = null, onVis = null;
let temp = [], sel = -1, cursor = null, cambio = null, previa = null, nPrevia = 0, pensando = false, serie = 0, tapado = false, dicOk = null, zoom = false, arr = null, aviso = '';
let cfg = { jug: 2, rival: 'cpu', nivel: 'medio' };

/* ---------- diccionario y CPU en un Worker (con respaldo en la página) ---------- */
let wk = null, wkMal = false, nId = 0, local = null; const pend = new Map();
function pedir(tipo, a) {
  if (!wk && !wkMal) {
    try {
      wk = new Worker(new URL('./trabajador.js', import.meta.url), { type: 'module' });
      wk.onmessage = e => { const p = pend.get(e.data.id); if (!p) return; pend.delete(e.data.id); if (e.data.error) p.fallo(e.data.error); else p.ok(e.data.r); };
      wk.onerror = () => { wkMal = true; wk = null; for (const [id, p] of pend) { pend.delete(id); p.otra(); } };
    } catch { wkMal = true; wk = null; }
  }
  if (wkMal) return enLocal(tipo, a);
  return new Promise((ok, mal) => {
    const id = ++nId, otra = () => enLocal(tipo, a).then(ok, mal);
    pend.set(id, { ok, otra, fallo: m => (m === 'sin-diccionario' ? mal(new Error(m)) : otra()) });
    wk.postMessage({ id, tipo, a });
  });
}
async function enLocal(tipo, a) {
  if (!local) local = (async () => {
    const [D, Dc, Sv] = await Promise.all([import('../../core/diccionario.js'), import('./diccio.js'), import('./servicio.js')]);
    if (!(await D.cargar())) { local = null; throw new Error('sin-diccionario'); }
    return { dic: Dc.construir(D), Sv };
  })();
  const { dic, Sv } = await local; return Sv.atender(M, dic, tipo, a);
}

/* ---------- validación / resumen ---------- */
export function validar(d) { const s = d && M.validar(d.s); return s ? { s, reg: !!d.reg } : null; }
export const migrarV1 = d => d;
export function resumen(d) {
  const s = d.s, pts = s.jug.map(j => `${j.nombre} ${j.pts}`).join(' · ');
  if (s.fase === 'fin') return { texto: `${s.ganador < 0 ? 'Empate' : `Ganó ${s.jug[s.ganador].nombre}`} · ${pts}`, fin: true };
  return { texto: pts, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; temp = []; sel = -1; cursor = null; cambio = null; previa = null; pensando = false; tapado = false; arr = null; aviso = '';
  asp = api.aspecto([
    { ...grupoFondo('.scmesa'), def: 'azar' },
    { clave: 'tabsc', titulo: 'Tablero', icono: '🟥', ventana: true, def: 'clasico', opciones: Object.entries(TABLEROS).map(([id, [n, sw]]) => ({ id, nombre: n, sw })) },
    { clave: 'fichas', titulo: 'Fichas', icono: '🔤', ventana: true, def: 'marfil', opciones: Object.entries(FICHAS).map(([id, [n, sw]]) => ({ id, nombre: n, sw })) },
    { clave: 'rotulo', titulo: 'Casillas de premio', def: 'si', opciones: [{ id: 'si', nombre: 'Con texto (3P, 2L…)' }, { id: 'no', nombre: 'Solo color' }] },
  ], () => pintar());
  await api.css(new URL('./scrabble.css', import.meta.url));
  zoom = !!api.pref('zoom', false);
  const c0 = api.pref('cfg', null); if (c0 && [2, 3, 4].includes(c0.jug) && ['cpu', 'personas'].includes(c0.rival) && M.NIVELES[c0.nivel]) cfg = { ...c0 };
  const g = api.cargar(); S = g ? g.s : null; reg = g ? g.reg : false;
  root.addEventListener('click', clic);
  onKey = tecla; document.addEventListener('keydown', onKey);
  onVis = () => { if (document.hidden) guardar(); }; document.addEventListener('visibilitychange', onVis);
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '🗂️ Partidas anteriores', accion: () => api.modal('🗂️ Partidas anteriores', htmlPartidas(api)) }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  if (dicOk === null) pedir('cargar').then(() => { dicOk = true; if (S && root) { pintar(); revisarPrevia(); } }, () => { dicOk = false; if (root) pintar(); });
  if (S && S.fase !== 'fin') armar(); else setup();
}
export function unmount() {
  serie++; finArrastre(); guardar();
  document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis);
  if (root) root.removeEventListener('click', clic);
  S = null; asp = null; root = null;
}
function guardar() { if (!S || !api) return; const d = { s: S, reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- pantalla de opciones ---------- */
function setup() {
  serie++; temp = []; cambio = null; cursor = null;
  const seg = (k, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${cfg[k] === v ? 'on' : ''}" data-cfg="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  root.innerHTML = `<div class="scmesa scinicio">
    <p class="note">Forma palabras cruzadas con tus 7 fichas y suma puntos con las casillas de premio. En español <b>CH</b>, <b>LL</b> y <b>RR</b> son una sola ficha y no hay K ni W.</p>
    <div class="bar"><span class="lbl">Jugadores</span>${seg('jug', [[2, '2'], [3, '3'], [4, '4']])}</div>
    <div class="bar"><span class="lbl">Rivales</span>${seg('rival', [['cpu', '🤖 CPU'], ['personas', '👥 Personas']])}</div>
    ${cfg.rival === 'cpu' ? `<div class="bar"><span class="lbl">Nivel</span>${seg('nivel', Object.entries(M.NIVELES))}</div>` : ''}
    <div class="bar"><button class="btn on" data-ac="start">🔠 Empezar</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>
    ${dicOk === false ? '<p class="msg mal">No se ha podido cargar el diccionario. Conéctate a internet una vez para descargarlo (luego funciona sin conexión).</p>' : ''}</div>`;
}
function nuevaSetup() { if (S && S.fase !== 'fin' && S.hist.length && !api.confirmar('¿Abandonar la partida actual?')) return; api.borrar(); S = null; setup(); }
function empezar() {
  api.setPref('cfg', cfg); serie++;
  const n = cfg.jug, jugadores = cfg.rival === 'cpu'
    ? [{ nombre: 'Tú' }, ...Array.from({ length: n - 1 }, (_, k) => ({ nombre: n > 2 ? `CPU ${k + 1}` : 'CPU', cpu: true }))]
    : Array.from({ length: n }, (_, k) => ({ nombre: `Jugador ${k + 1}` }));
  S = M.crear({ jugadores, nivel: cfg.nivel }); reg = false; asp.sortear && asp.sortear();
  api.borrar(); armar(); guardar();
}

/* ---------- partida ---------- */
function armar() {
  temp = []; sel = -1; cursor = null; cambio = null; previa = null; aviso = '';
  root.innerHTML = `<div class="scmesa" id="scMesa">
      <div class="schud" id="scHud"></div>
      <div class="msg scmsg" id="scMsg" role="status" aria-live="polite"></div>
      <div class="sctabw ${zoom ? 'zoom' : ''}" id="scTabW"><div class="sctab" id="scTab">${Array.from({ length: 225 }, (_, i) => `<button type="button" class="scc" data-i="${i}"></button>`).join('')}</div></div>
      <div class="scprev" id="scPrev"></div>
      <div class="scatril" id="scAtril" aria-label="Tus fichas"></div>
      <div class="scctl" id="scCtl"></div>
      <div class="sctapa" id="scTapa" hidden></div>
    </div>
    <details class="schist"><summary>📜 Jugadas</summary><ol id="scHist"></ol></details>
    <div class="bar" style="justify-content:center"><button class="btn" data-ac="zoom" id="scZoom"></button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button><button class="btn" data-ac="nueva">Nueva partida</button></div>`;
  const tab = $('#scTab'), atr = $('#scAtril');
  tab.addEventListener('pointerdown', abajoTablero); atr.addEventListener('pointerdown', abajoAtril);
  tapado = S.fase !== 'fin' && humanos() > 1 && !S.jug[S.turno].cpu;
  pintar(); turnoCPU();
}
const humanos = () => S.jug.filter(j => !j.cpu).length;
const jugadorHumano = () => S && S.fase === 'jugar' && !S.jug[S.turno].cpu && !pensando;
const atrilVisible = () => { if (!S) return []; const j = humanos() === 1 ? S.jug.find(x => !x.cpu) : S.jug[S.turno]; return j ? j.atril : []; };
const usado = k => temp.some(t => t.k === k);

/* ---------- pintar ---------- */
function pintar() {
  if (!S || !root || !$('#scTab')) return;
  const turnoMio = jugadorHumano();
  // marcador
  $('#scHud').innerHTML = S.jug.map((j, k) => `<span class="${k === S.turno && S.fase !== 'fin' ? 'turno' : ''} ${S.ganador === k && S.fase === 'fin' ? 'gana' : ''}"><small>${esc(j.nombre)}${j.cpu ? ' 🤖' : ''}</small><b>${j.pts}</b></span>`).join('')
    + `<span class="scbolsa" title="Fichas en la bolsa"><small>Bolsa</small><b>🎒 ${S.bolsa.length}</b></span>`;
  $('#scHud').style.setProperty('--n', S.jug.length + 1);
  // tablero
  const nuevas = new Map(temp.map(t => [t.i, t])), ult = new Set(S.ult), bl = new Set(S.bl), celdas = $('#scTab').children;
  for (let i = 0; i < 225; i++) {
    const c = celdas[i], t = S.tab[i], tm = nuevas.get(i); let cls = 'scc', html = '', lab = '';
    if (t !== '.' || tm) {
      const letra = tm ? tm.t : t, esBl = tm ? tm.b : bl.has(i);
      cls += ' f' + (esBl ? ' bl' : '') + (tm ? ' tmp' : '') + (ult.has(i) && !tm ? ' ult' : '') + (M.ver(letra).length > 1 ? ' dos' : '');
      html = `<span class="scl">${M.ver(letra)}</span>${esBl ? '' : `<sub>${M.valor(letra)}</sub>`}`; lab = `${M.ver(letra)}${tm ? ' (puesta ahora)' : ''}`;
    } else {
      const p = M.PREMIO[i];
      if (i === M.CENTRO) { cls += ' p-D centro'; html = '★'; lab = 'Centro, palabra doble'; }
      else if (p !== '.') { cls += ' p-' + p; html = `<i>${ROTULO[p]}</i>`; lab = NOMBRE_P[p]; }
      if (cursor && cursor.i === i) { cls += ' cur ' + cursor.dir; html = `<em>${cursor.dir === 'h' ? '➡' : '⬇'}</em>`; }
    }
    if (c.className !== cls) c.className = cls;
    if (c.innerHTML !== html) c.innerHTML = html;
    const al = `Fila ${(i / 15 | 0) + 1}, columna ${i % 15 + 1}${lab ? ': ' + lab : ''}`; if (c.getAttribute('aria-label') !== al) c.setAttribute('aria-label', al);
  }
  // atril
  const atril = tapado ? [] : atrilVisible(), atr = $('#scAtril');
  atr.innerHTML = atril.map((t, k) => usado(k) ? '<span class="scf hueco"></span>'
    : `<button type="button" class="scf${t === '?' ? ' bl' : ''}${M.ver(t).length > 1 ? ' dos' : ''}${sel === k ? ' sel' : ''}${cambio && cambio.has(k) ? ' cam' : ''}" data-k="${k}" aria-label="${t === '?' ? 'Comodín' : 'Letra ' + M.ver(t)}"><span class="scl">${t === '?' ? '?' : M.ver(t)}</span>${t === '?' ? '' : `<sub>${M.valor(t)}</sub>`}</button>`).join('')
    + Array.from({ length: Math.max(0, 7 - atril.length) }, () => '<span class="scf vacia"></span>').join('');
  atr.classList.toggle('apagado', !turnoMio && S.fase !== 'fin');
  // mensaje y vista previa
  const j = S.jug[S.turno];
  let msg = aviso;
  if (S.fase === 'fin') msg = S.ganador < 0 ? '🤝 ¡Empate!' : `🏆 ¡${S.jug[S.ganador].nombre === 'Tú' ? 'Has ganado' : 'Gana ' + S.jug[S.ganador].nombre}!`;
  else if (dicOk === false) msg = 'No se ha podido cargar el diccionario: conéctate a internet una vez para descargarlo.';
  else if (!msg) msg = pensando ? `${j.nombre} está pensando…` : turnoMio ? (humanos() > 1 ? `Turno de ${j.nombre}.` : 'Te toca.') + (M.vacio(S.tab) ? ' La primera palabra pasa por la ★.' : '') : '';
  if (dicOk === null && S.fase !== 'fin') msg = 'Preparando el diccionario… ' + msg;
  $('#scMsg').textContent = msg;
  pintarPrevia(); pintarCtl(); pintarHist();
  $('#scZoom').textContent = zoom ? '🔍 Tablero normal' : '🔍 Ampliar tablero';
  $('#scTabW').classList.toggle('zoom', zoom);
  const tapa = $('#scTapa');
  tapa.hidden = !tapado;
  if (tapado) tapa.innerHTML = `<button class="btn on" data-ac="destapar">👀 Turno de ${esc(j.nombre)}: ver mis fichas</button><small>Pasa el móvil a ${esc(j.nombre)}.</small>`;
}
function pintarPrevia() {
  const p = $('#scPrev'); if (!p) return;
  if (S.fase === 'fin' || !temp.length || !previa) { p.className = 'scprev'; p.textContent = cambio ? 'Toca las fichas que quieres cambiar.' : cursor && jugadorHumano() ? 'Toca tus fichas para escribir desde la flecha (toca otra vez la casilla para cambiar la dirección).' : ''; return; }
  const ev = previa.ev;
  if (!ev.ok && !ev.malas) { p.className = 'scprev mal'; p.textContent = ev.error; return; }
  const pal = ev.palabras.map(x => `<b class="${previa.malas && previa.malas.includes(x.w) ? 'no' : ''}">${M.verPalabra(x.w)}</b> ${x.pts}`).join(' · ');
  if (previa.estado === 'mirando') { p.className = 'scprev'; p.innerHTML = `${pal} · comprobando…`; return; }
  if (previa.estado === 'mal') { p.className = 'scprev mal'; p.innerHTML = `❌ ${pal} — ${previa.malas.map(M.verPalabra).join(', ')} no ${previa.malas.length > 1 ? 'están' : 'está'} en el diccionario`; return; }
  p.className = 'scprev bien'; p.innerHTML = `✅ ${pal}${ev.bingo ? ' · <b>¡Scrabble! +50</b>' : ''} → <b>+${ev.pts}</b>`;
}
function pintarCtl() {
  const c = $('#scCtl'); if (!c) return;
  if (S.fase === 'fin') {
    const fil = S.jug.map((j, k) => `<tr class="${S.ganador === k ? 'gana' : ''}"><td>${esc(j.nombre)}</td><td>${S.final ? (S.final[k] > 0 ? '+' : '') + S.final[k] : ''}</td><td><b>${j.pts}</b></td></tr>`).join('');
    c.innerHTML = `<table class="tabla scfin"><tr><th>Jugador</th><th>Fichas al final</th><th>Puntos</th></tr>${fil}</table>
      <div class="bar" style="justify-content:center"><button class="btn on" data-ac="start">🔁 Otra partida</button><button class="btn" data-ac="opciones">Opciones</button></div>`;
    return;
  }
  const mio = jugadorHumano() && !tapado, ok = mio && previa && previa.estado === 'bien' && dicOk;
  if (cambio) {
    c.innerHTML = `<button class="btn on" data-ac="hacercambio" ${cambio.size ? '' : 'disabled'}>🔄 Cambiar ${cambio.size || ''} ${cambio.size === 1 ? 'ficha' : 'fichas'}</button><button class="btn" data-ac="cancelar">Cancelar</button>`;
    return;
  }
  c.innerHTML = `<button class="btn on scjugar" data-ac="jugar" ${ok ? '' : 'disabled'}>✅ Jugar${ok ? ' +' + previa.ev.pts : ''}</button>
    <button class="btn" data-ac="recoger" ${mio && temp.length ? '' : 'disabled'} title="Devolver las fichas al atril">↩️ Recoger</button>
    <button class="btn" data-ac="mezclar" ${mio ? '' : 'disabled'}>🔀 Mezclar</button>
    <button class="btn" data-ac="pista" ${mio && dicOk ? '' : 'disabled'}>💡 Pista</button>
    <button class="btn" data-ac="cambiar" ${mio && M.puedeCambiar(S) ? '' : 'disabled'} title="${M.puedeCambiar(S) ? 'Cambiar fichas con la bolsa' : 'Solo se puede cambiar con 7 o más fichas en la bolsa'}">🔄 Cambiar</button>
    <button class="btn" data-ac="pasar" ${mio ? '' : 'disabled'}>⏭️ Pasar</button>`;
}
function pintarHist() {
  const h = $('#scHist'); if (!h) return;
  const txt = x => { const n = esc(S.jug[x.j].nombre); return x.t === 'j' ? `<b>${n}</b> · ${esc(x.w.split(' ').map(M.verPalabra).join(', '))} · <b>+${x.p}</b>${x.b ? ' 🌟' : ''}` : x.t === 'c' ? `<b>${n}</b> cambia ${x.n} ${x.n === 1 ? 'ficha' : 'fichas'}` : `<b>${n}</b> pasa`; };
  const html = S.hist.length ? S.hist.slice().reverse().map(x => `<li>${txt(x)}</li>`).join('') : '<li class="note">Todavía no hay jugadas.</li>';
  if (h.innerHTML !== html) h.innerHTML = html;
}

/* ---------- vista previa de la jugada (puntos y palabras) ---------- */
function revisarPrevia() {
  const n = ++nPrevia;
  if (!S || !temp.length) { previa = null; pintarPrevia(); pintarCtl(); return; }
  const coloc = temp.map(t => ({ i: t.i, t: t.t, b: t.b })), ev = M.evaluar(S.tab, S.bl, coloc);
  previa = { ev, coloc, estado: ev.ok ? 'mirando' : 'error' }; pintarPrevia(); pintarCtl();
  if (!ev.ok || !dicOk) return;
  pedir('existen', ev.palabras.map(p => p.w)).then(r => {
    if (n !== nPrevia || !previa) return;
    previa.malas = ev.palabras.filter((p, k) => !r[k]).map(p => p.w); previa.estado = previa.malas.length ? 'mal' : 'bien';
    pintarPrevia(); pintarCtl();
  }, () => {});
}

/* ---------- colocar fichas ---------- */
function poner(k, i) {
  if (!jugadorHumano() || tapado || cambio || S.tab[i] !== '.' || usado(k)) return false;
  const atril = atrilVisible(), t = atril[k]; if (t === undefined) return false;
  const quita = temp.findIndex(x => x.i === i); if (quita >= 0) temp.splice(quita, 1);
  if (t === '?') { elegirLetra(l => { temp.push({ i, t: l, b: true, k }); despuesDePoner(i); }); return true; }
  temp.push({ i, t, b: false, k }); despuesDePoner(i); return true;
}
function despuesDePoner(i) {
  sel = -1; api.sonido('click');
  if (cursor && cursor.i === i) avanzarCursor();
  pintar(); revisarPrevia();
}
function avanzarCursor() {
  const d = cursor.dir === 'h' ? 1 : 15; let i = cursor.i;
  while (true) { const r0 = i / 15 | 0; i += d; if (i > 224 || (d === 1 && (i / 15 | 0) !== r0)) { cursor = null; return; } if (S.tab[i] === '.' && !temp.some(t => t.i === i)) { cursor.i = i; return; } }
}
function quitar(i) { const k = temp.findIndex(x => x.i === i); if (k < 0) return; temp.splice(k, 1); cursor = null; api.sonido('click'); pintar(); revisarPrevia(); }
function recoger() { temp = []; cursor = null; sel = -1; previa = null; pintar(); revisarPrevia(); }
function elegirLetra(fn) {
  const m = api.modal('Comodín: ¿qué letra es?', `<p class="note">El comodín vale 0 puntos, pero hace de la letra que elijas.</p><div class="scletras">${M.LETRAS.map(t => `<button class="btn" data-l="${t}">${M.ver(t)}</button>`).join('')}</div>`);
  m.cuerpo.addEventListener('click', e => { const b = e.target.closest('[data-l]'); if (!b) return; m.cerrar(); fn(b.dataset.l); });
}
// Tocar una casilla del tablero
function tocarCasilla(i) {
  if (!jugadorHumano() || tapado || cambio) return;
  if (temp.some(t => t.i === i)) { if (sel >= 0) { quitar(i); poner(sel, i); } else quitar(i); return; }
  if (S.tab[i] !== '.') return;
  if (sel >= 0) { poner(sel, i); return; }
  cursor = cursor && cursor.i === i ? (cursor.dir === 'h' ? { i, dir: 'v' } : null) : { i, dir: 'h' };
  pintar();
}
// Tocar una ficha del atril
function tocarFicha(k) {
  if (!jugadorHumano() || tapado) return;
  if (cambio) { if (cambio.has(k)) cambio.delete(k); else cambio.add(k); pintar(); return; }
  if (cursor) { poner(k, cursor.i); return; }
  sel = sel === k ? -1 : k; pintar();
}

/* ---------- arrastrar fichas (del atril al tablero y dentro del tablero) ---------- */
function abajoAtril(e) {
  const b = e.target.closest('.scf[data-k]'); if (!b || e.button > 0 || !jugadorHumano() || tapado || cambio) return;
  arr = { k: +b.dataset.k, desde: null, x: e.clientX, y: e.clientY, id: e.pointerId, el: b, on: false };
  escucharArrastre();
}
function abajoTablero(e) {
  const c = e.target.closest('.scc.tmp'); if (!c || e.button > 0 || !jugadorHumano() || tapado) return;
  const t = temp.find(x => x.i === +c.dataset.i); if (!t) return;
  arr = { k: t.k, desde: t.i, x: e.clientX, y: e.clientY, id: e.pointerId, el: c, on: false };
  escucharArrastre();
}
function escucharArrastre() { addEventListener('pointermove', moverArrastre, { passive: false }); addEventListener('pointerup', soltarArrastre); addEventListener('pointercancel', finArrastre); }
function moverArrastre(e) {
  if (!arr || e.pointerId !== arr.id) return;
  if (!arr.on) {
    if (Math.hypot(e.clientX - arr.x, e.clientY - arr.y) < 9) return;
    arr.on = true; const r = arr.el.getBoundingClientRect(), g = arr.el.cloneNode(true);
    g.className = 'scf scfant' + (arr.el.classList.contains('bl') ? ' bl' : '') + (arr.el.classList.contains('dos') ? ' dos' : '');
    g.style.width = Math.max(r.width, 40) + 'px'; g.style.height = Math.max(r.height, 40) + 'px'; arr.g = g; document.body.append(g);
    arr.el.classList.add('scorig');
  }
  e.preventDefault();
  arr.g.style.left = e.clientX - arr.g.offsetWidth / 2 + 'px'; arr.g.style.top = e.clientY - arr.g.offsetHeight - 14 + 'px';
  const c = destino(e); document.querySelectorAll('.scc.sobre').forEach(x => { if (x !== c) x.classList.remove('sobre'); }); if (c) c.classList.add('sobre');
}
const destino = e => { const el = document.elementFromPoint(e.clientX, e.clientY - 30) || document.elementFromPoint(e.clientX, e.clientY); const c = el && el.closest('.scc'); return c && (S.tab[+c.dataset.i] === '.') ? c : null; };
function soltarArrastre(e) {
  if (!arr || e.pointerId !== arr.id) return;
  const a = arr, c = a.on ? destino(e) : null; finArrastre();
  if (!a.on) return;                                                   // fue un toque: lo atiende el clic
  bloqueoClic = Date.now() + 350;
  if (a.desde !== null) {                                               // movía una ficha ya puesta
    const t = temp.find(x => x.i === a.desde); if (!t) return;
    if (!c) { quitar(a.desde); return; }                               // soltada fuera: vuelve al atril
    const i = +c.dataset.i; if (i === a.desde) return;
    const otra = temp.find(x => x.i === i); if (otra) otra.i = a.desde; t.i = i; cursor = null; api.sonido('click'); pintar(); revisarPrevia(); return;
  }
  if (c) poner(a.k, +c.dataset.i);
}
let bloqueoClic = 0;
function finArrastre() {
  removeEventListener('pointermove', moverArrastre); removeEventListener('pointerup', soltarArrastre); removeEventListener('pointercancel', finArrastre);
  if (arr) { if (arr.g) arr.g.remove(); if (arr.el) arr.el.classList.remove('scorig'); }
  document.querySelectorAll('.scc.sobre').forEach(x => x.classList.remove('sobre'));
  arr = null;
}

/* ---------- acciones ---------- */
function jugar() {
  if (!jugadorHumano() || !previa || previa.estado !== 'bien') return;
  const ev = previa.ev, coloc = previa.coloc, j = S.jug[S.turno];
  const palabra = M.verPalabra(ev.palabras[0].w);
  M.jugar(S, coloc, ev); temp = []; cursor = null; sel = -1; previa = null;
  aviso = `${j.nombre === 'Tú' ? 'Juegas' : j.nombre + ' juega'} ${palabra} (+${ev.pts})${ev.bingo ? ' · ¡Scrabble! 🌟' : ''}`;
  api.sonido(ev.bingo ? 'ganar' : 'ok'); if (ev.bingo) api.vibrar([40, 30, 40]);
  trasTurno();
}
function pasar() { if (!jugadorHumano() || !api.confirmar('¿Pasar el turno sin jugar?')) return; const j = S.jug[S.turno]; recoger(); M.pasar(S); aviso = `${j.nombre === 'Tú' ? 'Pasas' : j.nombre + ' pasa'}.`; trasTurno(); }
function hacerCambio() {
  if (!cambio || !cambio.size) return;
  const j = S.jug[S.turno], fichas = [...cambio].map(k => j.atril[k]), n = fichas.length;
  cambio = null; M.cambiar(S, fichas); aviso = `${j.nombre === 'Tú' ? 'Cambias' : j.nombre + ' cambia'} ${n} ${n === 1 ? 'ficha' : 'fichas'}.`; api.sonido('mover'); trasTurno();
}
function trasTurno() {
  guardar();
  if (S.fase === 'fin') { terminar(); return; }
  tapado = humanos() > 1 && !S.jug[S.turno].cpu;
  pintar(); turnoCPU();
}
async function pista() {
  if (!jugadorHumano() || !dicOk) return;
  const tok = serie, atril = atrilVisible();
  aviso = '💡 Buscando la mejor jugada…'; pintar();
  let m = null; try { m = await pedir('pista', { tab: S.tab, bl: S.bl, atril }); } catch { /* */ }
  if (tok !== serie || !S) return;
  if (!m) { aviso = '💡 No hay ninguna jugada posible: cambia fichas o pasa.'; pintar(); return; }
  // pone la jugada en el tablero (sin jugarla): se puede jugar, mover o recoger
  temp = []; const libres = atril.map((t, k) => k);
  for (const c of m.coloc) { const k = libres.find(k2 => atril[k2] === (c.b ? '?' : c.t)); libres.splice(libres.indexOf(k), 1); temp.push({ i: c.i, t: c.t, b: c.b, k }); }
  cursor = null; sel = -1; aviso = `💡 La mejor jugada vale ${m.pts} puntos.`; pintar(); revisarPrevia();
}
async function turnoCPU() {
  if (!S || S.fase !== 'jugar' || !S.jug[S.turno].cpu || pensando) return;
  pensando = true; const tok = ++serie; pintar();
  const t0 = performance.now();
  let d;
  try { d = await pedir('pensar', S); } catch { pensando = false; dicOk = false; pintar(); return; }
  await new Promise(r => setTimeout(r, Math.max(0, 700 - (performance.now() - t0))));
  if (tok !== serie || !S) return;
  const j = S.jug[S.turno];
  pensando = false;
  if (d.tipo === 'jugar') {
    const ev = M.evaluar(S.tab, S.bl, d.coloc);
    M.jugar(S, d.coloc, ev); aviso = `${j.nombre} juega ${M.verPalabra(ev.palabras[0].w)} (+${ev.pts})${ev.bingo ? ' · ¡Scrabble! 🌟' : ''}`;
    api.sonido('mover');
  } else if (d.tipo === 'cambiar') { const n = d.fichas.length; M.cambiar(S, d.fichas); aviso = `${j.nombre} cambia ${n} ${n === 1 ? 'ficha' : 'fichas'}.`; }
  else { M.pasar(S); aviso = `${j.nombre} pasa.`; }
  trasTurno();
}
function terminar() {
  tapado = false; cambio = null; temp = []; pintar();
  if (reg) return; reg = true;
  const cpu = S.jug.some(j => j.cpu), g = S.ganador, yo = S.jug.findIndex(j => !j.cpu);
  const res = !cpu ? 'partida' : g < 0 ? 'tablas' : g === yo ? 'victoria' : 'derrota';
  const variante = `${S.jug.length} jugadores${cpu ? ' · ' + M.NIVELES[S.nivel] : ' · personas'}`;
  api.registrar({ res, variante, puntos: S.jug[Math.max(0, yo)].pts });
  anotarPartida(api, { res: res === 'victoria' ? 'g' : res === 'derrota' ? 'p' : 'e', texto: `${variante} · ${S.jug.map(j => `${j.nombre} ${j.pts}`).join(', ')}` });
  api.sonido(res === 'derrota' ? 'perder' : 'ganar'); if (res === 'victoria') api.vibrar([60, 40, 60]);
  guardar();
}

/* ---------- entrada ---------- */
function clic(e) {
  if (Date.now() < bloqueoClic) return;
  const celda = e.target.closest('.scc'); if (celda) { tocarCasilla(+celda.dataset.i); return; }
  const f = e.target.closest('.scf[data-k]'); if (f) { tocarFicha(+f.dataset.k); return; }
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.cfg) { cfg[d.cfg] = d.cfg === 'jug' ? +d.v : d.v; api.setPref('cfg', cfg); setup(); return; }
  const a = d.ac;
  if (a === 'start') empezar(); else if (a === 'opciones') { api.borrar(); S = null; setup(); }
  else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas(); else if (a === 'nueva') nuevaSetup();
  else if (a === 'zoom') { zoom = !zoom; api.setPref('zoom', zoom); pintar(); }
  else if (a === 'destapar') { tapado = false; aviso = ''; pintar(); }
  else if (a === 'jugar') jugar(); else if (a === 'recoger') recoger(); else if (a === 'pasar') pasar(); else if (a === 'pista') pista();
  else if (a === 'mezclar') { if (!jugadorHumano()) return; recoger(); const at = atrilVisible(); for (let i = at.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [at[i], at[k]] = [at[k], at[i]]; } guardar(); pintar(); }
  else if (a === 'cambiar') { if (!jugadorHumano() || !M.puedeCambiar(S)) return; recoger(); cambio = new Set(); pintar(); }
  else if (a === 'cancelar') { cambio = null; pintar(); }
  else if (a === 'hacercambio') hacerCambio();
}
function tecla(e) {
  if (!S || !jugadorHumano() || tapado || document.querySelector('.modal') || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (e.key === 'Enter') { if (previa && previa.estado === 'bien') { e.preventDefault(); jugar(); } return; }
  if (e.key === 'Escape') { recoger(); return; }
  if (e.key === 'Backspace') { const t = temp.pop(); if (t) { e.preventDefault(); if (cursor) cursor.i = t.i; pintar(); revisarPrevia(); } return; }
  if (!cursor || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
  const l = e.key.toLowerCase(); if (!/^[a-zñ]$/.test(l)) return;
  const at = atrilVisible(); let k = at.findIndex((t, kk) => t === l && !usado(kk));
  if (k < 0) k = at.findIndex((t, kk) => t === '?' && !usado(kk));
  if (k < 0) { api.sonido('error'); return; }
  e.preventDefault();
  if (at[k] === '?') { temp.push({ i: cursor.i, t: l, b: true, k }); despuesDePoner(cursor.i); } else poner(k, cursor.i);
}
function reglas() {
  api.modal('Scrabble', `<ul>
    <li><b>Objetivo</b>: sumar más puntos que los rivales formando palabras que se cruzan en el tablero, como en un crucigrama.</li>
    <li><b>Cómo jugar</b>: arrastra tus fichas al tablero o toca una ficha y después una casilla. También puedes tocar una casilla vacía (sale una flecha ➡; tócala otra vez para ⬇) y luego tus fichas, que se van poniendo seguidas. Toca una ficha puesta para devolverla. Con teclado: escribe las letras desde la flecha, ⌫ borra, Intro juega y Esc recoge.</li>
    <li>Las fichas de un turno van en <b>una sola fila o columna</b>, seguidas (pueden usar letras que ya están) y tocando alguna ficha del tablero. La primera palabra pasa por la <b>★</b>.</li>
    <li>Cuentan <b>todas las palabras nuevas</b> que se formen, también las que se cruzan. Debajo del tablero verás las palabras y los puntos antes de jugar.</li>
    <li><b>Premios</b>: <b>2L</b> / <b>3L</b> doblan o triplican la letra; <b>2P</b> / <b>3P</b> la palabra entera. Solo cuentan la primera vez que se cubren. Usar las 7 fichas en un turno es un <b>¡Scrabble!</b>: +50 puntos.</li>
    <li><b>Fichas</b>: 100, como el Scrabble en español. <b>CH</b>, <b>LL</b> y <b>RR</b> son una sola ficha (CALLE = C·A·LL·E) y no se pueden formar con dos fichas. No hay K ni W. Los 2 <b>comodines</b> valen 0 y hacen de cualquier letra.</li>
    <li><b>Cambiar</b> fichas o <b>pasar</b> gasta el turno. Solo se puede cambiar si quedan al menos 7 fichas en la bolsa. 💡 <b>Pista</b> pone en el tablero la jugada que más puntos da (luego puedes jugarla o recogerla).</li>
    <li><b>Final</b>: cuando la bolsa está vacía y alguien gasta todas sus fichas (o si todos pasan varias vueltas seguidas). Cada uno resta lo que le queda en el atril y quien cierra suma lo de los demás.</li>
    <li>Diccionario: unas 590.000 palabras (con plurales y verbos conjugados) del diccionario español de LibreOffice. En 🎨 Apariencia cambias el fondo, el tablero, las fichas y los rótulos de las casillas.</li></ul>`);
}
