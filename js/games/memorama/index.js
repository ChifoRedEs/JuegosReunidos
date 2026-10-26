// Match-Up: encuentra las parejas de imágenes. Un jugador (movimientos y tiempo), 2 jugadores por turnos o contra la máquina (3 niveles de memoria).
// Reglas y lógica en motor.js; los bancos de imágenes (img/memorama/<tema>) se listan en bancos.js (tools/generar_memorama.py).
import { $, esc } from '../../core/dom.js';
import { Cronometro } from '../../core/cronometro.js';
import { grupoFondo, grupoDorso } from '../../core/aspectos.js';
import { BARAJAS, cargarBarajas, urlDorso } from '../../core/cartas.js';
import { BANCOS } from './bancos.js';
import * as M from './motor.js';

const MARCOS = {
  blanco: { nombre: 'Blanco', sw: ['#ffffff', '#d7dbe8'] }, crema: { nombre: 'Crema', sw: ['#FFF3D6', '#E3C98F'] }, oscuro: { nombre: 'Oscuro', sw: ['#2B2F44', '#12141F'] },
  azul: { nombre: 'Azul', sw: ['#DCE8FF', '#3B6FD8'] }, verde: { nombre: 'Verde', sw: ['#DDF5E4', '#3E8E5A'] }, rosa: { nombre: 'Rosa', sw: ['#FFE0EE', '#D9488C'] },
};
const FORMAS = { redonda: 'Esquinas redondeadas', cuadrada: 'Cuadradas', circulo: 'Circulares' };
const PAUSA_FALLO = 1150;

let S = null, api = null, asp = null, root = null, crono = null, onKey = null, tim = 0, pausado = false, bloqueo = false, vista = false, cargado = false;
let cfg = { modo: 'solo', tema: 'frutas', tam: '4x4', nivel: 'medio' };
const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const nombreTema = t => M.TEMAS[t];
const variante = d => `${M.TAMANOS[d.tam].cols}×${M.TAMANOS[d.tam].filas} · ${nombreTema(d.tema)}`;

/* ---------- validación / resumen ---------- */
export const validar = M.validar;
export const migrarV1 = d => d;
export function resumen(d) {
  const n = d.deck.length / 2, hechas = d.ok.reduce((a, x) => a + x, 0) / 2;
  const t = d.done ? (d.modo === 'solo' ? `completado en ${d.movs} movimientos` : d.ganador === -1 ? 'empate' : `gana ${d.modo === 'cpu' ? (d.ganador === 0 ? 'el jugador' : 'la máquina') : 'el jugador ' + (d.ganador + 1)}`) : `${hechas} de ${n} parejas`;
  return { texto: `${M.MODOS[d.modo]} · ${variante(d)} · ${t}`, fin: d.done };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; pausado = false; bloqueo = false; vista = false; clearTimeout(tim); tim = 0;
  try { await cargarBarajas(); } catch { /* sin dorsos de imagen: se usa el dorso dibujado */ }
  asp = api.aspecto([
    grupoFondo('#mrTab'),
    grupoDorso(),
    { clave: 'marco', titulo: 'Color de las cartas', icono: '🎴', def: 'blanco', opciones: Object.entries(MARCOS).map(([id, t]) => ({ id, nombre: t.nombre, sw: t.sw })) },
    { clave: 'forma', titulo: 'Forma de las cartas', icono: '⬜', def: 'redonda', opciones: Object.entries(FORMAS).map(([id, nombre]) => ({ id, nombre })) },
    { clave: 'nombres', titulo: 'Nombre bajo la imagen', icono: '🔤', def: 'si', opciones: [{ id: 'si', nombre: 'Mostrar' }, { id: 'no', nombre: 'Ocultar' }] },
  ], () => { aplicarAspecto(); });
  await api.css(new URL('./memorama.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && M.cfgOk(c0)) cfg = { modo: c0.modo, tema: c0.tema, tam: c0.tam, nivel: c0.nivel };
  S = api.cargar();
  root.addEventListener('click', clic);
  root.addEventListener('change', e => { const sel = e.target.closest('select[data-cfgsel]'); if (sel) { cfg[sel.dataset.cfgsel] = sel.value; api.setPref('cfg', cfg); setup(); } });
  onKey = e => tecla(e); document.addEventListener('keydown', onKey);
  api.barra({
    nueva: () => jugar(),
    salir: () => { parar(); location.hash = '#/cat/logica'; },
    crono: () => crono,
    pausar: () => { pausado = true; clearTimeout(tim); tim = 0; },
    reanudar: () => { pausado = false; siguiente(); },
    config: {
      valores: () => ({ modo: cfg.modo, tema: cfg.tema, tam: cfg.tam, nivel: cfg.nivel }),
      grupos: v => [
        { clave: 'modo', titulo: 'Modo', opciones: Object.entries(M.MODOS).map(([k, l]) => [k, (k === 'solo' ? '👤 ' : k === 'dos' ? '👥 ' : '🤖 ') + l]) },
        { clave: 'tema', titulo: 'Imágenes', desplegable: true, opciones: Object.entries(M.TEMAS).map(([k, l]) => [k, (BANCOS[k] ? BANCOS[k].icono + ' ' : '🎲 ') + l]) },
        { clave: 'tam', titulo: 'Tamaño del tablero', opciones: Object.entries(M.TAMANOS).map(([k, t]) => [k, `${t.nombre} ${t.cols}×${t.filas}`]) },
        { clave: 'nivel', titulo: 'Memoria de la máquina', visible: v.modo === 'cpu', opciones: Object.entries(M.NIVELES) },
      ],
      aplicar: v => { cfg = { modo: v.modo, tema: v.tema, tam: v.tam, nivel: v.nivel }; jugar(); },
    },
  });
  api.menu([{ texto: 'Nueva partida', accion: () => { parar(); setup(); } }, { texto: '👁️ Vistazo', accion: vistazo }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  cargado = true;
  if (S && !S.done) armar(); else setup();
}
export function unmount() {
  parar(); if (onKey) document.removeEventListener('keydown', onKey); onKey = null;
  if (root) root.removeEventListener('click', clic); S = null; asp = null; cargado = false;
}
function parar() { if (crono) { crono.detener(); crono = null; } clearTimeout(tim); tim = 0; bloqueo = false; vista = false; }
function guardar() { if (!S) return; const r = resumen(S); api.guardar(S, r.texto, S.done); }

/* ---------- pantalla de inicio ---------- */
function setup() {
  parar();
  const seg = (k, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${String(cfg[k]) === String(v) ? 'on' : ''}" data-cfg="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const mej = api.pref('mejores', {})[`${cfg.tam}:${cfg.tema}`];
  const nota = { solo: 'Destapa las cartas de dos en dos y encuentra todas las <b>parejas</b> con los menos movimientos posibles.', dos: 'Os turnáis para destapar dos cartas. Si son pareja, te las quedas y <b>repites turno</b>. Gana quien reúna más parejas.',
    cpu: 'Turnos contra la máquina. Cuanto mejor sea su <b>memoria</b>, menos se le escapan las cartas que ya ha visto.' }[cfg.modo];
  root.innerHTML = `<p class="note">${nota}</p>
    <div class="bar"><span class="lbl">Modo</span>${seg('modo', Object.entries(M.MODOS).map(([k, l]) => [k, (k === 'solo' ? '👤 ' : k === 'dos' ? '👥 ' : '🤖 ') + l]))}</div>
    <div class="bar"><span class="lbl">Imágenes</span><select class="desplegable" data-cfgsel="tema" aria-label="Imágenes">${Object.entries(M.TEMAS).map(([k, l]) => `<option value="${k}"${cfg.tema === k ? ' selected' : ''}>${(BANCOS[k] ? BANCOS[k].icono + ' ' : '🎲 ') + l}</option>`).join('')}</select></div>
    <div class="bar"><span class="lbl">Tablero</span>${seg('tam', Object.entries(M.TAMANOS).map(([k, t]) => [k, `${t.nombre} ${t.cols}×${t.filas}`]))}</div>
    <p class="note">${M.pares(cfg.tam)} parejas · ${M.TAMANOS[cfg.tam].cols * M.TAMANOS[cfg.tam].filas} cartas</p>
    ${cfg.modo === 'cpu' ? `<div class="bar"><span class="lbl">Memoria de la máquina</span>${seg('nivel', Object.entries(M.NIVELES))}</div>` : ''}
    ${cfg.modo === 'solo' && mej ? `<p class="note">🏆 Tu mejor marca aquí: <b>${mej.movs}</b> movimientos · ${fmt(mej.t)}</p>` : ''}
    <div class="bar"><button class="btn on" data-ac="jugar">▶️ Jugar</button>${S && !S.done ? '<button class="btn" data-ac="volver">Volver a la partida</button>' : ''}<button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>`;
}
function jugar() {
  api.setPref('cfg', cfg); parar(); if (asp) asp.sortear();
  S = M.crear(cfg); pausado = false; armar(); guardar();
}

/* ---------- tablero ---------- */
function armar() {
  parar(); const mem = S.modo !== 'solo';
  root.innerHTML = `<div class="mrcab"><b id="mrTit">${esc(M.MODOS[S.modo])}</b><span id="mrInfo"></span></div>
    ${mem ? '<div class="mrmarc" id="mrMarc"></div>' : ''}
    <p class="mrmsg" id="mrMsg" role="status" aria-live="polite"></p>
    <div id="mrTab" class="mrtab" data-tema="${S.tema}" style="--c:${S.cols}" role="group" aria-label="Tablero del memorama">${S.deck.map((id, i) => {
      const tm = id.split('/')[0];
      return `<button type="button" class="mrc" data-i="${i}" data-tema="${tm}"><span class="mri"><span class="mrdorso"><i>?</i></span><span class="mrcara"><img src="${M.urlDe(id)}" alt="" decoding="async"><b>${esc(M.nombreDe(id))}</b></span></span></button>`; }).join('')}</div>
    <div class="bar mrbar"><button class="btn" data-ac="vistazo" id="mrVz">👁️ Vistazo</button></div>${api.barraHtml()}`;
  aplicarAspecto();
  if (!S.done) { crono = new Cronometro(s => { S.t = s; info(); }, S.t); crono.iniciar(); }
  pintar();
  if (!S.done) siguiente();
}
// Dorso de imagen elegido en Apariencia (si no hay, se ve el dorso dibujado)
function aplicarAspecto() {
  const tab = $('#mrTab'); if (!tab || !asp) return;
  const d = BARAJAS.dorsos.find(x => x.id === asp.valores.dorso);
  if (d) tab.style.setProperty('--dorso', `url("${urlDorso(d)}")`); else tab.style.removeProperty('--dorso');
  tab.classList.toggle('con-dorso', !!d);
}
const quienJuega = () => (S.modo === 'cpu' ? (S.turno === 0 ? 'Tu turno' : 'Turno de la máquina') : `Turno del jugador ${S.turno + 1}`);
function info() { const e = $('#mrInfo'); if (!e || !S) return; e.textContent = `${S.movs} ${S.movs === 1 ? 'movimiento' : 'movimientos'} · ${fmt(S.t)}`; }
function pintar() {
  if (!S) return; info();
  const cartas = root.querySelectorAll('.mrc');
  cartas.forEach((b, i) => {
    const arriba = !!S.ok[i] || S.ab.includes(i) || vista;
    b.classList.toggle('up', arriba); b.classList.toggle('hit', !!S.ok[i]); b.classList.toggle('mal', S.ab.length === 2 && S.ab.includes(i));
    b.disabled = !!S.ok[i];
    b.setAttribute('aria-label', arriba ? `Carta ${i + 1}: ${M.nombreDe(S.deck[i])}${S.ok[i] ? ', pareja encontrada' : ''}` : `Carta ${i + 1}, boca abajo`);
  });
  const mar = $('#mrMarc');
  if (mar) {
    const n = j => (S.modo === 'cpu' ? (j === 0 ? 'Tú' : 'Máquina') : `Jugador ${j + 1}`);
    mar.innerHTML = [0, 1].map(j => `<div class="${!S.done && S.turno === j ? 'turno' : ''}"><small>${n(j)}</small><b>${S.pts[j]}</b></div>`).join('');
  }
  const vz = $('#mrVz'); if (vz) { vz.hidden = S.modo !== 'solo' || S.done; vz.disabled = S.vz >= M.MAX_VISTAZOS || bloqueo || vista; vz.textContent = `👁️ Vistazo (${M.MAX_VISTAZOS - S.vz})`; }
  const m = $('#mrMsg'); if (!m || vista) return;
  if (S.done) {
    if (S.modo === 'solo') m.innerHTML = `🎉 <b>¡Completado!</b> ${S.movs} movimientos · ${fmt(S.t)} · ${'⭐'.repeat(M.estrellas(S))}`;
    else m.innerHTML = S.ganador === -1 ? '🤝 <b>¡Empate!</b>' : `🏆 <b>${S.modo === 'cpu' ? (S.ganador === 0 ? '¡Has ganado!' : 'Gana la máquina') : `¡Gana el jugador ${S.ganador + 1}!`}</b> ${S.pts[0]} – ${S.pts[1]}`;
  } else m.textContent = S.modo === 'solo' ? 'Encuentra las parejas.' : quienJuega() + (S.modo === 'cpu' && S.turno === 1 ? '…' : '');
}

/* ---------- jugadas ---------- */
const turnoHumano = () => S && !S.done && !(S.modo === 'cpu' && S.turno === 1);
function destapar(i) {
  const res = M.voltear(S, i); if (!res) return false;
  api.sonido('click'); pintar();
  if (res.tipo === 'par') {
    api.sonido('ok'); api.vibrar(15); const m = $('#mrMsg'); if (m && !S.done) m.innerHTML = `✅ <b>${esc(M.nombreDe(S.deck[res.a]))}</b>`;
    guardar(); if (S.done) terminar(); else siguiente();
  } else if (res.tipo === 'fallo') { bloqueo = true; pintar(); guardar(); siguiente(); }
  else guardar();
  return true;
}
function tocar(i) {
  if (pausado || vista || !S || S.done) return;
  if (S.ab.length === 2) { if (!S.ab.includes(i) && !S.ok[i]) { clearTimeout(tim); ocultar(); if (turnoHumano()) destapar(i); } return; }   // tocar otra carta adelanta el final del fallo
  if (!turnoHumano()) return;
  destapar(i);
}
function ocultar() { tim = 0; bloqueo = false; M.ocultar(S); pintar(); guardar(); siguiente(); }
// Decide qué toca hacer a continuación (ocultar un fallo, mover la máquina…). Lo reanuda también la pausa.
function siguiente() {
  clearTimeout(tim); tim = 0; if (!S || S.done || pausado) return;
  if (S.ab.length === 2) { tim = setTimeout(ocultar, PAUSA_FALLO); return; }
  if (S.modo === 'cpu' && S.turno === 1) tim = setTimeout(() => { tim = 0; if (!S || S.done || pausado) return; destapar(M.jugadaCPU(S)); }, S.ab.length ? 800 : 650);
}
function vistazo() {
  if (!S || S.done || S.modo !== 'solo' || pausado || vista || bloqueo || !M.vistazo(S)) return;
  vista = true; pintar(); guardar(); api.sonido('click');
  setTimeout(() => { vista = false; if (S) pintar(); }, 1400);
}
function terminar() {
  parar(); pintar();
  const v = variante(S), limpio = S.vz === 0;
  if (S.modo === 'solo') {
    const k = `${S.tam}:${S.tema}`, mej = api.pref('mejores', {}), a = mej[k];
    if (limpio && (!a || S.movs < a.movs || (S.movs === a.movs && S.t < a.t))) { mej[k] = { movs: S.movs, t: S.t }; api.setPref('mejores', mej); setTimeout(() => api.aviso('🏆 ¡Nuevo récord en este tablero!'), 400); }
    api.registrar({ res: 'victoria', tiempo: S.t, variante: v, limpio }); api.sonido('ganar');
  } else if (S.modo === 'cpu') {
    api.registrar({ res: S.ganador === 0 ? 'victoria' : S.ganador === 1 ? 'derrota' : 'tablas', variante: `${v} · ${M.NIVELES[S.nivel]}` }); api.sonido(S.ganador === 1 ? 'perder' : 'ganar');
  } else { api.registrar({ res: S.ganador === -1 ? 'tablas' : 'partida', variante: `2 jugadores · ${v}` }); api.sonido('ganar'); if (S.ganador !== -1) api.victoria(); }
}

/* ---------- entrada ---------- */
function tecla(e) {
  if (!S || !$('#mrTab') || e.target.closest('input,textarea,select') || document.querySelector('.modal,.vic')) return;
  const cs = [...root.querySelectorAll('.mrc')], i = cs.indexOf(document.activeElement); if (i < 0) return;
  const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -S.cols, ArrowDown: S.cols }[e.key]; if (!d) return;
  e.preventDefault(); const j = i + d; if (j >= 0 && j < cs.length) cs[j].focus();
}
function clic(e) {
  const c = e.target.closest('.mrc'); if (c) return tocar(+c.dataset.i);
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.cfg) { cfg[d.cfg] = d.v; api.setPref('cfg', cfg); return setup(); }
  const a = d.ac;
  if (a === 'jugar') { if (S && !S.done && S.movs && !api.confirmar('¿Empezar una partida nueva y abandonar la actual?')) return; jugar(); }
  else if (a === 'volver') armar();
  else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas(); else if (a === 'vistazo') vistazo();
}
function reglas() {
  api.modal('Match-Up', `<ul><li>Todas las cartas empiezan <b>boca abajo</b>. En tu turno destapa <b>dos</b>: si tienen la misma imagen son <b>pareja</b> y se quedan a la vista; si no, se vuelven a tapar. Memoriza dónde está cada una.</li>
    <li><b>👤 Un jugador</b>: encuentra todas las parejas con los menos movimientos y el menor tiempo (⭐⭐⭐ si casi no fallas). Hay hasta 3 <b>👁️ vistazos</b> que enseñan todo el tablero un instante (no cuentan para el récord).</li>
    <li><b>👥 2 jugadores</b> y <b>🤖 contra la máquina</b>: si aciertas una pareja te la quedas y <b>repites turno</b>. Gana quien reúna más. La máquina solo recuerda lo que ha visto, y su memoria depende del nivel.</li>
    <li>Tras un fallo puedes tocar otra carta para no esperar. Teclado: flechas para moverte, Intro o espacio para destapar.</li>
    <li>Imágenes: frutas y verduras, animales, comida, banderas del mundo, transportes y más categorías, o todo mezclado. Tableros de 12 a 48 cartas.</li>
    <li>Con 🎨 Apariencia cambias el tapete, el dorso, el color y la forma de las cartas y si se ve el nombre.</li></ul>`);
}
