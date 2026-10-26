// Hotel · juego de compra y construcción de hoteles: compra terrenos, pide licencias de obras, levanta hoteles por fases,
// abre entradas en el Ayuntamiento y cobra las noches de los rivales. Gana el último jugador en pie. Tablero 3D (Three.js) con respaldo SVG.
import { $, esc, esperar } from '../../core/dom.js';
import { gruposFichas, estilo } from '../../core/fichas.js';
import { grupoFondo } from '../../core/aspectos.js';
import { HOTELES, IDS_HOTEL, nEdif, tarifa, COLORES_JUGADOR, COCHES, DINERO_INICIAL, SALARIO, MAX_ENTRADAS, CASILLAS_DE, NOMBRE_CASILLA, INFO_TIPO, EXTRA_LEYENDA, TIPO, LADOS } from './datos.js';
import * as M from './motor.js';
import { crearDado3D } from '../../core/dado3d.js';

const VELOCIDAD = { normal: { nombre: 'Normal', paso: 170, bot: 750, dado: 900 }, rapida: { nombre: 'Rápida', paso: 60, bot: 280, dado: 450 }, sin: { nombre: 'Sin animaciones', paso: 0, bot: 0, dado: 0 } };
const NIVELES = ['', 'Fácil', 'Normal', 'Difícil'];
let S = null, api = null, asp = null, root = null, vivo = false, V = null, hay3d = false, forzar2d = false, modo3d = false, tok3 = 0, ses = 0, bloqueado = false, sel = null, plan = {}, onKey = null, dadoVis = 0;
let cfg = { jug: [['Tú', 'h'], ['CPU 1', 'c'], ['CPU 2', 'c'], ['CPU 3', 'n']], nivel: 2, limite: 0, vel: 'normal' };
const quiere3D = () => hay3d && !forzar2d && !!asp && (asp.valores.vista || '2d') === '3d';
const vel = () => VELOCIDAD[cfg.vel] || VELOCIDAD.normal;
let enPausa = false;
const pausa = async ms => { if (ms) await esperar(ms); while (enPausa && vivo) await esperar(120); };   // «Pausa / Salir» congela los turnos de la CPU y las animaciones
const eur = n => M.fmt(n);
const estrellas = h => { const e = S.hot[h].etapa; return e ? '★'.repeat(Math.min(5, e)) + (S.hot[h].inst ? '🏊' : '') : ''; };

/* ---------- validación / resumen ---------- */
export function validar(d) { return M.validar(d) ? d : null; }
export const migrarV1 = () => null;
export function resumen(d) {
  if (d.fase === 'fin') return { texto: `Ganó ${d.jug[d.ganador].nombre}`, fin: true };
  const vivos = d.jug.filter(p => p.vivo), rico = vivos.reduce((a, b) => (M.patrimonio(d, d.jug.indexOf(b)) > M.patrimonio(d, d.jug.indexOf(a)) ? b : a));
  return { texto: `${vivos.length} jugadores · ronda ${d.ronda} · ${rico.nombre} va en cabeza`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; vivo = true; bloqueado = false; V = null; sel = null; plan = {}; forzar2d = false; modo3d = false; ses++;
  try { hay3d = (await import('../../core/escena3d.js')).hayWebGL(); } catch { hay3d = false; }
  if (!vivo) return;
  asp = api.aspecto([{ clave: 'vista', titulo: 'Vista del tablero', icono: '🧊', def: '2d', opciones: [{ id: '3d', nombre: '🧊 3D' }, { id: '2d', nombre: '🔲 2D clásica' }] }, grupoFondo('#htVista'), ...gruposFichas({ pocos: true, titulo: 'Coches de los jugadores', icono: '🚗', lados: ['Jugador 1', 'Jugador 2', 'Jugador 3', 'Jugador 4'], formas: false })],
    () => { if (!S) return; if (modo3d !== quiere3D()) { armar(); } else if (V) V.recolor(); pintar(); });
  await api.css(new URL('../../../css/fichas.css', import.meta.url));
  await api.css(new URL('./hotel.css', import.meta.url));
  const c0 = api.pref('cfg', null);
  if (c0 && Array.isArray(c0.jug) && c0.jug.length === 4) cfg = { ...cfg, ...c0, vel: VELOCIDAD[c0.vel] ? c0.vel : 'normal', nivel: [1, 2, 3].includes(c0.nivel) ? c0.nivel : 2, jug: c0.jug.map(([n, t], i) => [String(n).slice(0, 14), ['h', 'c', 'n'].includes(t) ? t : 'c']) };
  const g = api.cargar(); S = g && M.validar(g) ? g : null;
  root.addEventListener('click', clic); root.addEventListener('input', alEscribir);
  onKey = e => { if (e.code === 'Space' && S && !bloqueado && S.fase === 'tirar' && !S.jug[S.turno].cpu && !/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) { e.preventDefault(); humano({ t: 'tirar' }); } };
  document.addEventListener('keydown', onKey);
  api.barra({ nueva: () => { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; bloqueado = false; empezar(); },
    salir: () => { enPausa = false; ses++; bloqueado = false; api.borrar(); location.hash = '#/cat/tablero'; },
    pausar: () => { enPausa = true; },
    reanudar: () => { enPausa = false; },
    config: { pantalla: () => nuevaSetup() } });
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '🏨 Hoteles', accion: () => hoteles() }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  if (S && S.fase !== 'fin') { armar(); pintar(); ciclo(); } else setup();
}
export function unmount() {
  vivo = false; enPausa = false; ses++; quitarDado(); cerrarVista(); document.removeEventListener('keydown', onKey);
  if (root) { root.removeEventListener('click', clic); root.removeEventListener('input', alEscribir); }
  document.querySelectorAll('.htmodal').forEach(m => m.remove());
  S = null; asp = null; bloqueado = false;
}
function guardar() { if (!S) return; const r = resumen(S); api.guardar(S, r.texto, r.fin); }
function cerrarVista() { tok3++; if (V) { V.destruir(); V = null; } }

/* ---------- inicio ---------- */
function setup() {
  S = null; quitarDado(); cerrarVista(); sel = null; plan = {};
  const n = cfg.jug.filter(j => j[1] !== 'n').length;
  root.innerHTML = `<p class="note">Compra los terrenos junto al camino, pide <b>licencias de obras</b> y levanta tus hoteles fase a fase. Abre <b>entradas</b> al pasar por el Ayuntamiento: cada vez que un rival cae en una, te paga las noches. Gana el último jugador que no se arruine${cfg.limite ? ` (o quien tenga más patrimonio tras ${cfg.limite} rondas)` : ''}.</p>
    ${cfg.jug.map(([nom, t], i) => `<div class="jugfila" style="--c:${cj(COLORES_JUGADOR[i])}"><span class="htfichab" aria-hidden="true">${COCHES[i]}</span><input class="nom" data-name="${i}" maxlength="14" value="${esc(nom)}" aria-label="Nombre del jugador ${i + 1}"><div class="seg">${[['h', 'Persona'], ['c', 'CPU'], ['n', 'Nadie']].map(([k, l]) => `<button class="btn ${t === k ? 'on' : ''}" data-tipo="${i},${k}">${l}</button>`).join('')}</div></div>`).join('')}
    <div class="bar"><span class="lbl">Duración</span><div class="seg">${[[0, 'Hasta la quiebra'], [40, '40 rondas'], [80, '80 rondas']].map(([v, l]) => `<button class="btn ${cfg.limite === v ? 'on' : ''}" data-limite="${v}">${l}</button>`).join('')}</div></div>
    <div class="bar"><span class="lbl">Nivel de la CPU</span><div class="seg">${[1, 2, 3].map(k => `<button class="btn ${cfg.nivel === k ? 'on' : ''}" data-nivel="${k}">${NIVELES[k]}</button>`).join('')}</div></div>
    <div class="bar"><span class="lbl">Velocidad</span><div class="seg">${Object.entries(VELOCIDAD).map(([k, v]) => `<button class="btn ${cfg.vel === k ? 'on' : ''}" data-vel="${k}">${v.nombre}</button>`).join('')}</div></div>
    <div class="bar"><button class="btn on" data-ac="start" ${n < 2 ? 'disabled' : ''}>Empezar</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>
    <p class="note">${n < 2 ? 'Hacen falta al menos 2 jugadores.' : `${n} jugadores, ${eur(DINERO_INICIAL)} cada uno. Las personas se pasan el móvil por turnos.`}</p>`;
}
function nuevaSetup() {
  if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return;
  ses++; bloqueado = false; api.borrar(); setup();
}
function empezar() {
  const act = cfg.jug.filter(j => j[1] !== 'n'); if (act.length < 2) return;
  api.setPref('cfg', cfg); ses++;
  S = M.crear({ n: act.length, nombres: act.map(([n], i) => n.trim() || `Jugador ${i + 1}`), cpu: act.map(j => j[1] === 'c'), nivel: cfg.nivel, limite: cfg.limite, semilla: (Math.random() * 4294967296) >>> 0 });
  sel = null; plan = {}; armar(); pintar(); guardar(); ciclo();
}

/* ---------- pantalla de juego ---------- */
function armar() {
  quitarDado(); cerrarVista(); modo3d = quiere3D();
  root.innerHTML = `<div class="htjug" id="htJug"></div>
    <div class="e3d htvista ${modo3d ? '' : 'ht2'}" id="htVista"><div class="e3d-carga" id="htCarga">Preparando el tablero…</div></div>
    <div class="dadozona" id="htDado"></div>
    <div class="htpanel"><div class="htturno" id="htTurno"></div><div class="htacc" id="htAcc"></div></div>
    <div class="msg htmsg" id="htMsg" role="status" aria-live="polite"></div>
    <ul class="htlog" id="htLog" aria-label="Historial de la partida"></ul>
    <div class="bar htdos"><button class="btn" data-ac="leyenda">📖 Leyenda</button><button class="btn" data-ac="hoteles">🏨 Hoteles</button></div>${api.barraHtml()}`;
  iniciarVista(); iniciarDado();
}
let D3 = null, tokD = 0;
function quitarDado() { tokD++; if (D3) { D3.destruir(); D3 = null; } }
async function iniciarDado() {
  const t = ++tokD, host = $('#htDado'); if (!host || !S) return;
  const d = await crearDado3D(host, { n: 1, etiqueta: 'Dado: toca para tirar', alClic: () => { if (S && !bloqueado && S.fase === 'tirar' && !S.jug[S.turno].cpu) humano({ t: 'tirar' }); } });
  if (t !== tokD || !d) { if (d) d.destruir(); return; }
  D3 = d; if (S) pintar();
}
async function iniciarVista() {
  const t = ++tok3, host = $('#htVista'); if (!host) return;
  try {
    let v;
    if (modo3d) {
      const b3 = await import('../../core/escena3d.js'), { crearHotel3D } = await import('./vista3d.js'); if (t !== tok3 || !root) return;
      host.replaceChildren(); v = await crearHotel3D(host); if (t !== tok3 || !root) { v.destruir(); return; } b3.botonesCamara(host, v.E);
    } else {
      const { crearHotel2D } = await import('./vista2d.js'); if (t !== tok3 || !root) return; host.replaceChildren(); v = crearHotel2D(host);
    }
    v.alTocar = alTocar; V = v; v.recolor(); pintar();
  } catch (e) {
    console.error(e);
    if (t === tok3 && root && S) { if (modo3d) { forzar2d = true; armar(); pintar(); } else { const c = $('#htCarga'); if (c) c.textContent = 'No se ha podido dibujar el tablero.'; } }
  }
}

/* ---------- pintado ---------- */
const txtFase = {
  tirar: 'Tira el dado', ayto: 'Ayuntamiento: puedes comprar entradas', compra: 'Solar en venta', obras: 'Licencia de obras', entLibre: '¡Acceso gratuito!', faseLibre: '¡Construye una fase gratis!', deuda: 'Deuda: hay que vender', subasta: 'Subasta', fin: 'Fin de la partida',
};
// 🚗 Coches: color de cada jugador (por su color de partida), tamaño y textura (js/core/fichas.js)
const cj = c => { const e = estilo(asp.valores), k = COLORES_JUGADOR.indexOf(c); return [e.hex, e.hex2, e.hex3, e.hex4][k] || c; };
const estadoV = () => ({ ...S, jug: S.jug.map(p => ({ ...p, color: cj(p.color) })) });
const pintarV = () => { V.fichas(estilo(asp.valores)); V.pintar(estadoV()); };
function pintar() {
  if (!S || !$('#htJug')) return;
  const j = M.actor(S), tj = S.turno;
  if ((S.fase === 'ayto' || S.fase === 'entLibre') && !(sel && sel.h) && !S.jug[j].cpu) { const hs = [...new Set(M.legales(S).entradas.map(o => o.h))]; if (hs.length === 1) sel = { h: hs[0] }; }
  $('#htJug').innerHTML = S.jug.map((p, i) => `<div class="htj ${i === tj && S.fase !== 'fin' ? 'turno' : ''} ${p.vivo ? '' : 'fuera'} ${i === S.ganador ? 'gana' : ''}" style="--c:${cj(p.color)}" data-j="${i}"><span class="htji">${p.coche}</span><b>${esc(p.nombre)}${p.cpu ? ' 🤖' : ''}</b><span class="htdin">${eur(p.dinero)}</span>
    <small>${p.vivo ? M.titulos(S, i).map(h => `${HOTELES[h].nombre} ${estrellas(h)}`).join(' · ') || 'Sin hoteles' : 'Eliminado'}</small>
    <span class="htchips">${M.titulos(S, i).map(h => `<i style="background:${HOTELES[h].color}" title="${HOTELES[h].nombre}"></i>`).join('')}</span></div>`).join('');
  const p = S.jug[tj];
  $('#htTurno').innerHTML = S.fase === 'fin' ? `🏆 <b>${esc(S.jug[S.ganador].nombre)}</b> gana la partida<br><small>${esc(S.motivo)}</small>`
    : `<span style="color:${cj(p.color)}">${p.coche} <b>${esc(p.nombre)}</b></span> · ${txtFase[S.fase]}${S.fase === 'subasta' ? ` · puja ${esc(S.jug[j].nombre)}` : ''}<br><small>Ronda ${S.ronda}${S.limite ? '/' + S.limite : ''}${dadoVis ? ` · 🎲 ${dadoVis}` : ''}</small><br><button class="btn htcas" data-ac="leyenda" aria-label="Ver la leyenda de casillas"><i style="background:${INFO_TIPO[TIPO[p.pos]].color}"></i>📍 ${INFO_TIPO[TIPO[p.pos]].nombre} · 📖 leyenda</button>`;
  $('#htAcc').innerHTML = accionesHTML(j);
  if (D3) { D3.color(cj(p.color)); D3.activar(S.fase === 'tirar' && !S.jug[j].cpu && !bloqueado, `Toca el dado para tirar · ${p.nombre}`); }
  const L = S.log.slice(-60).reverse(); $('#htLog').innerHTML = L.map(t => `<li>${esc(t)}</li>`).join(''); const m = $('#htMsg'); if (m && S.log.length) m.textContent = S.log[S.log.length - 1];
  if (V) { pintarV(); V.resaltar(resaltados()); }
}
function resaltados() {
  if (S.fase === 'fin' || bloqueado) return {};
  const L = M.legales(S), h = {};
  if (S.jug[M.actor(S)].cpu) return h;
  if ((S.fase === 'ayto' || S.fase === 'entLibre') && sel && sel.h) h.casillas = L.entradas.filter(o => o.h === sel.h).map(o => o.sq);
  if (S.fase === 'compra') h.lotes = L.lotes.map(o => o.h);
  if (S.fase === 'obras') h.lotes = Object.keys(plan).filter(k => plan[k] > 0);
  if (S.fase === 'faseLibre') h.lotes = L.obras.map(o => o.h);
  if (S.fase === 'subasta') h.lotes = [S.sub.h];
  return h;
}
function accionesHTML(j) {
  if (S.fase === 'fin') return '<button class="btn on grande" data-ac="nueva">Nueva partida</button>';
  const p = S.jug[j], L = M.legales(S);
  if (p.cpu) return `<small class="htesp">${esc(p.nombre)} está pensando…</small>`;
  if (bloqueado) return '<small class="htesp">…</small>';
  const B = (ac, txt, on = true, dis = false) => `<button class="btn ${on ? 'on' : ''}" data-ac="${ac}" ${dis ? 'disabled' : ''}>${txt}</button>`;
  switch (S.fase) {
    case 'tirar': return L.inst.map(o => B('inst:' + o.h, `🏊 Instalación ${HOTELES[o.h].nombre} · ${eur(o.coste)}`, false)).join('');
    case 'ayto': case 'entLibre': {
      const hs = [...new Set(L.entradas.map(o => o.h))], gr = S.fase === 'entLibre';
      return `<p class="htex">${gr ? 'Entrada gratis' : 'Compra una entrada por hotel con edificio principal'}. Elige hotel y toca una casilla resaltada del camino.</p>`
        + hs.map(h => `<button class="btn ${sel && sel.h === h ? 'on' : ''}" data-ac="ent:${h}"><i class="htpt" style="background:${HOTELES[h].color}"></i>${HOTELES[h].nombre} · ${gr ? 'gratis' : eur(HOTELES[h].entrada)}</button>`).join('')
        + (sel && sel.h ? B('entauto', '📍 Elegir por mí', false) : '') + B('saltar', gr ? 'No poner' : 'Ahora no', false);
    }
    case 'compra': return L.lotes.map(o => B('comprar:' + o.h, `${o.forzosa ? '⚖️ Compra obligatoria' : '🏷️ Comprar'} ${HOTELES[o.h].nombre} · ${eur(o.precio)}`)).join('') + B('saltar', 'No comprar', false);
    case 'obras': {
      const filas = L.obras.map(o => { const n = plan[o.h] || 0, rest = nEdif(o.h) - o.etapa; return `<div class="htplan"><span><i class="htpt" style="background:${HOTELES[o.h].color}"></i><b>${HOTELES[o.h].nombre}</b> · ${o.etapa === 0 ? 'edificio principal' : 'ampliación ' + o.etapa} <small>${eur(o.coste)}</small></span><span class="htcont"><button class="btn" data-ac="plan-:${o.h}" ${n ? '' : 'disabled'} aria-label="Quitar una fase">−</button><b>${n}</b><button class="btn" data-ac="plan+:${o.h}" ${n < rest && planCoste(o.h) <= p.dinero ? '' : 'disabled'} aria-label="Añadir una fase">＋</button></span></div>`; }).join('');
      const arr = planArr(), c = arr.length ? M.costePlan(S, j, arr) : 0;
      return `<p class="htex">Declara qué quieres construir y tira el dado de permiso: 🟢 concedido (pagas), 🔴 denegado, <b>H</b> gratis, <b>×2</b> doble precio.</p>${filas}` + B('permiso', `🎲 Pedir permiso · ${eur(c)}`, true, !arr.length) + B('saltar', 'No construir', false);
    }
    case 'faseLibre': return L.obras.map(o => B('fase:' + o.h, `🏗️ ${HOTELES[o.h].nombre} · ${o.etapa === 0 ? 'edificio principal' : 'ampliación ' + o.etapa}`)).join('') + B('saltar', 'No construir', false);
    case 'deuda': return `<p class="htex neg">Debes <b>${eur(S.deuda.cant)}</b>${S.deuda.a >= 0 ? ' a ' + esc(S.jug[S.deuda.a].nombre) : ' al banco'}. Elige un hotel para subastarlo (se vende entero; si nadie puja, se derriba).</p>`
      + L.vender.map(h => B('vender:' + h, `🔨 ${HOTELES[h].nombre} ${estrellas(h)} · invertido ${eur(M.invertido(S, h))}`, false)).join('');
    case 'subasta': {
      const B2 = S.sub, mj = B2.mejor, q = S.jug[j], ops = [L.min, L.min + 400, L.min + 900].filter((x, i, a) => a.indexOf(x) === i);
      return `<p class="htex">Subasta de <b>${HOTELES[B2.h].nombre}</b> ${estrellas(B2.h)} · ${mj ? `mejor puja ${eur(mj.cant)} (${esc(S.jug[mj.j].nombre)})` : 'sin pujas'}. <b>${esc(q.nombre)}</b> tiene ${eur(q.dinero)}.</p>`
        + ops.map(x => B('puja:' + x, `Pujar ${eur(x)}`, x === L.min, x > q.dinero)).join('') + B('retirar', 'Retirarse', false);
    }
  }
  return '';
}
const planArr = () => Object.entries(plan).flatMap(([h, n]) => Array(n).fill(h));
const planCoste = h => { const a = planArr(); a.push(h); return M.costePlan(S, M.actor(S), a); };

/* ---------- animación ---------- */
const flash = (j, txt, cl) => { const e = document.querySelector(`.htj[data-j="${j}"]`); if (!e) return; const f = document.createElement('span'); f.className = 'htflash ' + cl; f.textContent = txt; e.append(f); setTimeout(() => f.remove(), 1300); };
async function animar(evs) {
  const v = vel(), s = ses;
  for (const e of evs) {
    if (!vivo || s !== ses) return;
    switch (e.t) {
      case 'dado': api.sonido('dado'); dadoVis = e.v; if (D3) { D3.color(cj(S.jug[M.actor(S)].color)); await D3.tirar([e.v], v.dado); await pausa(v.dado ? 350 : 0); } else await pausa(v.dado / 2); break;
      case 'mover': api.sonido('mover'); if (V) await V.mover(e.j, e.camino, v.paso); break;
      case 'cobra': flash(e.j, '+' + eur(e.cant), 'pos'); api.sonido('ok'); await pausa(v.paso * 3); break;
      case 'paga': flash(e.j, '−' + eur(e.cant), 'neg'); if (e.a >= 0) flash(e.a, '+' + eur(e.cant), 'pos'); api.sonido('click'); await pausa(v.paso * 3); break;
      case 'permiso': api.sonido(e.cara === 'rojo' ? 'error' : 'ok'); aviso(`Dado de permiso: ${{ verde: '🟢 concedido', rojo: '🔴 DENEGADO', H: '🅷 concedido y GRATIS', x2: '✖️2 concedido a doble precio' }[e.cara]}`); await pausa(v.paso * 6); break;
      case 'estancia': aviso(`${S.jug[e.j].nombre} se aloja ${e.noches} noche${e.noches > 1 ? 's' : ''} en ${HOTELES[e.h].nombre}: ${eur(e.coste)}`); await pausa(v.paso * 4); break;
      case 'compra': case 'obra': case 'inst': case 'entrada': case 'vendido': api.sonido('ok'); if (V) pintarV(); await pausa(v.paso * 3); break;
      case 'demolido': case 'quiebra': api.sonido('perder'); await pausa(v.paso * 4); break;
      case 'extra': aviso('¡Un 6! Vuelve a tirar.'); break;
      case 'fin': api.sonido('ganar'); break;
    }
  }
}
function aviso(t) { const m = $('#htMsg'); if (m) m.textContent = t; }

/* ---------- control del turno ---------- */
async function ejecutar(d) {
  const s = ses; bloqueado = true; pintar();
  let r = M.decidir(S, d);
  if (!r.ok) { api.sonido('error'); if (S.jug[M.actor(S)].cpu) { console.error('Decisión de CPU inválida', d, r.msg); r = M.decidir(S, fallback()); } if (!r.ok) { bloqueado = false; pintar(); return false; } }
  await animar(r.ev); if (!vivo || s !== ses) return false;
  bloqueado = false; if (r.ev.some(e => e.t === 'turno' || e.t === 'extra')) { dadoVis = 0; sel = null; plan = {}; }
  sel = ['ayto', 'entLibre'].includes(S.fase) ? sel : null; if (S.fase !== 'obras') plan = {};
  pintar(); guardar(); return true;
}
const fallback = () => ({ tirar: { t: 'tirar' }, deuda: { t: 'vender', h: M.titulos(S, S.turno)[0] }, subasta: { t: 'retirar' } }[S.fase] || { t: 'saltar' });
let corriendo = false;
async function ciclo() {
  if (corriendo) return; corriendo = true; const s = ses;
  try {
    while (vivo && s === ses && S && S.fase !== 'fin') {
      const j = M.actor(S); if (!S.jug[j].cpu) break;
      pintar(); await pausa(vel().bot); if (!vivo || s !== ses) return;
      if (!(await ejecutar(M.cpuDecide(S)))) break;
    }
  } finally { if (s === ses) corriendo = false; }
  if (vivo && s === ses && S) { pintar(); if (S.fase === 'fin') final(); }
}
async function humano(d) {
  if (bloqueado || corriendo || !S || S.fase === 'fin') return; if (S.jug[M.actor(S)].cpu) return;
  if (!(await ejecutar(d))) return; ciclo(); if (S && S.fase === 'fin') final();
}
function final() { api.sonido('ganar'); }

/* ---------- entrada ---------- */
function alEscribir(e) { const i = e.target.dataset.name; if (i != null) { cfg.jug[+i][0] = e.target.value; api.setPref('cfg', cfg); } }
function clic(e) {
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.tipo) { const [i, t] = d.tipo.split(','); cfg.jug[+i][1] = t; api.setPref('cfg', cfg); return setup(); }
  if (d.limite != null && d.limite !== '') { cfg.limite = +d.limite; api.setPref('cfg', cfg); return setup(); }
  if (d.nivel) { cfg.nivel = +d.nivel; api.setPref('cfg', cfg); return setup(); }
  if (d.vel) { cfg.vel = d.vel; api.setPref('cfg', cfg); return S ? pintar() : setup(); }
  const a = d.ac; if (!a) return; const [k, arg] = a.split(':');
  switch (k) {
    case 'start': return empezar();
    case 'aspecto': return asp.abrir();
    case 'reglas': return reglas();
    case 'nueva': return nuevaSetup();
    case 'hoteles': return hoteles();
    case 'leyenda': return leyenda();
    case 'tirar': return humano({ t: 'tirar' });
    case 'inst': return humano({ t: 'instalacion', h: arg });
    case 'saltar': return humano({ t: 'saltar' });
    case 'comprar': return humano({ t: 'comprar', h: arg });
    case 'fase': return humano({ t: 'fase', h: arg });
    case 'vender': return humano({ t: 'vender', h: arg });
    case 'retirar': return humano({ t: 'retirar' });
    case 'puja': return humano({ t: 'pujar', cant: +arg });
    case 'permiso': return humano({ t: 'obras', plan: planArr() });
    case 'plan+': if (planCoste(arg) >= 0) plan[arg] = (plan[arg] || 0) + 1; return pintar();
    case 'plan-': plan[arg] = Math.max(0, (plan[arg] || 0) - 1); return pintar();
    case 'ent': {
      if (bloqueado) return; sel = { h: arg }; pintar();
      const ops = M.legales(S).entradas.filter(o => o.h === arg); if (ops.length === 1) humano({ t: 'entrada', h: arg, sq: ops[0].sq }); return;
    }
    case 'entauto': {
      if (!sel) return; const j = M.actor(S), ops = M.legales(S).entradas.filter(o => o.h === sel.h).sort((x, y) => M.puntuaEntrada(S, j, y.sq) - M.puntuaEntrada(S, j, x.sq));
      if (ops[0]) humano({ t: 'entrada', h: sel.h, sq: ops[0].sq }); return;
    }
  }
}
function alTocar(t) {
  if (!S) return;
  if (t.tipo === 'casilla') {
    if (!bloqueado && (S.fase === 'ayto' || S.fase === 'entLibre') && sel && sel.h && !S.jug[M.actor(S)].cpu) {
      const o = M.legales(S).entradas.find(x => x.h === sel.h && x.sq === t.id); if (o) return humano({ t: 'entrada', h: sel.h, sq: t.id });
    }
    return leyenda(TIPO[t.id], t.id);
  }
  if (t.tipo === 'lote') modal(`${HOTELES[t.id].nombre}`, fichaHotel(t.id));
}

/* ---------- fichas de hotel y diálogos ---------- */
function fichaHotel(h) {
  const D = HOTELES[h], H = S.hot[h], n = nEdif(h), dueno = H.dueno >= 0 ? S.jug[H.dueno] : null;
  const fila = (nom, coste, renta, hecho) => `<tr class="${hecho ? 'hecho' : ''}"><td>${hecho ? '✅' : '▫️'} ${nom}</td><td>${eur(coste)}</td><td>${renta ? eur(renta) : '—'}</td></tr>`;
  return `<div class="htcarta" style="--g:${D.color}"><div class="htcab">${D.nombre}<small>${dueno ? 'Propietario: ' + esc(dueno.nombre) : 'Terreno libre'} · ${H.etapa ? '★'.repeat(Math.min(5, H.etapa)) : 'sin edificar'}${H.inst ? ' · 🏊' : ''}</small></div>
    <table class="tabla"><thead><tr><th></th><th>Coste</th><th>Noche</th></tr></thead><tbody>
      ${fila('Terreno', D.tierra, 0, H.dueno >= 0)}
      ${D.edif.map((e, k) => fila(k === 0 ? 'Edificio principal' : 'Ampliación ' + k, e.c, e.r, H.etapa > k)).join('')}
      ${fila('Instalación de ocio', D.inst.c, D.inst.r, H.inst)}
    </tbody></table></div>
    <p class="note">Entrada: ${eur(D.entrada)} (máximo ${MAX_ENTRADAS}). Entradas abiertas: <b>${H.ents.length}</b>. Si un rival cae en una, paga noches × tarifa actual: <b>${eur(M.tarifaDe(S, h))}</b>/noche.${H.dueno >= 0 && H.etapa === 0 ? ' El terreno vacío puede comprarse a mitad de precio por otro jugador que caiga en una casilla de compra junto a él.' : ''}</p>`;
}
function leyenda(resalta, sq) {
  const aqui = S && S.fase !== 'fin' ? TIPO[S.jug[S.turno].pos] : null, tipo = resalta || aqui, cont = document.createElement('div');
  const fila = (ico, corto, nombre, desc, color, marca) => `<div class="htley ${marca ? 'on' : ''}"><span class="htlsw" style="background:${color}"><b>${ico}</b><small>${corto}</small></span><div><b>${nombre}</b>${marca ? `<em> ${marca}</em>` : ''}<p>${desc}</p></div></div>`;
  let extra = '';
  if (sq != null) { const h = S && S.entDe[sq]; extra = `<p class="note">Casilla tocada: <b>${esc(NOMBRE_CASILLA(sq))}</b>${h ? ` · Entrada de <b>${HOTELES[h].nombre}</b>${S.hot[h].dueno >= 0 ? ' (de ' + esc(S.jug[S.hot[h].dueno].nombre) + ')' : ''}` : ''}.</p>`; }
  cont.innerHTML = extra + Object.entries(INFO_TIPO).map(([k, I]) => fila(k === 'P' ? 'P' : I.ico || '·', I.corto || 'CAMINO', I.nombre, I.desc, I.color, k === tipo ? (resalta && sq != null ? '← la que has tocado' : '📍 estás aquí') : '')).join('')
    + '<h3 class="htlh">Otras marcas del tablero</h3>' + EXTRA_LEYENDA.map(e => fila(e.ico, '', e.nombre, e.desc, e.color, '')).join('');
  modal('📖 Leyenda de casillas', cont);
}
function hoteles() {
  if (!S) return;
  const cont = document.createElement('div');
  cont.innerHTML = IDS_HOTEL.map(h => { const H = S.hot[h], d = H.dueno >= 0 ? S.jug[H.dueno] : null; return `<details class="htdet"><summary><i class="htpt" style="background:${HOTELES[h].color}"></i><b>${HOTELES[h].nombre}</b> <span>${d ? esc(d.nombre) : 'libre'} ${estrellas(h)} · ${eur(M.tarifaDe(S, h))}/noche</span></summary>${fichaHotel(h)}</details>`; }).join('');
  modal('🏨 Hoteles', cont);
}
function modal(titulo, cuerpo) {
  const m = document.createElement('div'); m.className = 'modal htmodal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
  const h = document.createElement('div'); h.className = 'hoja'; h.innerHTML = `<h2>${titulo}</h2><div class="cuerpo"></div><div class="bar"><button type="button" class="btn on">Cerrar</button></div>`;
  const c = h.querySelector('.cuerpo'); if (typeof cuerpo === 'string') c.innerHTML = cuerpo; else c.append(cuerpo);
  m.append(h); document.body.append(m);
  const fin = () => { m.remove(); document.removeEventListener('keydown', tecla); }, tecla = e => { if (e.key === 'Escape') fin(); };
  h.querySelector('.btn').addEventListener('click', fin); m.addEventListener('click', e => { if (e.target === m) fin(); }); document.addEventListener('keydown', tecla);
}
function reglas() {
  api.modal('Hotel', `<ul>
    <li><b>Objetivo</b>: ser el último jugador en pie. Cada uno empieza con ${eur(DINERO_INICIAL)} y un coche en el aparcamiento.</li>
    <li>Tira el dado y avanza. Los coches no comparten casilla (si está ocupada, avanzas a la siguiente libre). Con un <b>6</b> vuelves a tirar al terminar.</li>
    <li>Al pasar por la <b>Caja</b> 🏦 cobras ${eur(SALARIO)} (con 3-4 jugadores, deja de pagar cuando quedan dos).</li>
    <li>🏷️ <b>Solar en venta</b>: compras el terreno de un hotel pegado a esa casilla (uno por turno). No puedes construir en él hasta tu siguiente turno. Si el terreno de un rival sigue <b>vacío</b>, puedes quedártelo por la mitad del precio (compra obligatoria).</li>
    <li>📋 <b>Licencia de obras</b>: necesitas algún terreno. Declaras lo que construyes (edificio principal, luego ampliaciones, en orden) y tiras el dado de permiso: 🟢 concedido (pagas), 🔴 denegado, <b>H</b> gratis, <b>×2</b> doble precio. Si te lo conceden, tienes que construir y pagar (si no llegas, subastas hoteles).</li>
    <li>🏊 <b>Instalaciones de ocio</b>: con el hotel completo, antes de tirar puedes comprar su instalación (sin permiso). Sube mucho la tarifa.</li>
    <li>🏛️ Al pasar por el <b>Ayuntamiento</b> compras una <b>entrada</b> por cada hotel con edificio principal (en una casilla del camino junto a su terreno; máximo ${MAX_ENTRADAS}, una por casilla). 🚪 En «entrada libre» la pones gratis; 🏗️ «fase libre» te regala un edificio.</li>
    <li><b>Estancias</b>: si caes en una entrada de un hotel ajeno, tiras el dado para saber las noches y pagas noches × tarifa por noche del hotel (según lo construido).</li>
    <li><b>Deudas</b>: si no puedes pagar, subastas hoteles enteros entre los demás (sin precio mínimo). Si nadie puja, el hotel se derriba. Sin dinero ni hoteles, quedas eliminado.</li>
    <li>Precios y tarifas de la edición de 1986. El trazado del camino es propio y se ha simplificado el «robo» de entradas y el reparto de dinero.</li>
  </ul>`);
}
