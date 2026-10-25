import { $, esc } from '../../core/dom.js';
import * as F from './motor.js';
import { gruposFichas, estilo, oscuro } from '../../core/fichas.js';
import { grupoFondo } from '../../core/aspectos.js';

let S = null, api = null, asp = null, root = null, timer = null, reg = false, onKey = null;
// Vista 3D (Three.js) del tablero grande; el contenedor se conserva entre pintados y se recoloca en el DOM
let V3 = null, hostEl = null, hay3d = false, forzar2d = false, tok3 = 0;
const quiere3D = () => hay3d && !forzar2d && !!asp && (asp.valores.vista || '2d') === '3d';
const usa3D = () => !!V3 && quiere3D();
function cerrar3D() { tok3++; if (V3) { try { V3.destruir(); } catch { /* nada */ } V3 = null; } if (hostEl) { hostEl.remove(); hostEl = null; } }
let sel = 0, vertical = false, pista = -1, efecto = null, marcador = { g: 0, p: 0 };
let cfg = { modo: 'cpu', nivel: 'medio', flota: 'espanola', tocar: false, repetir: true };

/* ---------- validación / resumen ---------- */
export function validar(d) {
  const s = d && F.validar(d.s); if (!s) return null;
  const m = d.marcador && typeof d.marcador === 'object' ? d.marcador : {}, e = v => (Number.isInteger(v) && v >= 0 && v <= 99999 ? v : 0);
  return { s, marcador: { g: e(m.g), p: e(m.p) }, reg: !!d.reg };
}
export const migrarV1 = d => d;
export function resumen(d) {
  const s = d.s, nom = F.nombres(s);
  if (s.fase === 'fin') return { texto: s.modo === 'cpu' ? (s.ganador === 0 ? '¡Ganaste!' : 'Ganó la CPU') : `Ganó ${nom[s.ganador]}`, fin: true };
  if (s.fase === 'colocar') return { texto: `${F.FLOTAS[s.flota].nombre} · colocando barcos`, fin: false };
  return { texto: `${F.FLOTAS[s.flota].nombre} · quedan ${F.quedan(s, 1).length} barcos rivales${s.modo === 'dos' ? '' : ` · ${F.NIVEL[s.nivel]}`}`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; sel = 0; vertical = false; pista = -1; efecto = null; forzar2d = false;
  try { hay3d = (await import('../../core/escena3d.js')).hayWebGL(); } catch { hay3d = false; }
  asp = api.aspecto([{ clave: 'vista', titulo: 'Vista del tablero', icono: '🧊', def: '2d', opciones: [{ id: '3d', nombre: '🧊 3D' }, { id: '2d', nombre: '🔲 2D clásica' }] }, grupoFondo('#flCuerpo'), 
    { clave: 'mar', titulo: 'Color del mar', def: 'oceano', opciones: [{ id: 'oceano', nombre: 'Océano', sw: ['#2F80ED', '#1B4FA8'] }, { id: 'tropical', nombre: 'Tropical', sw: ['#16C1C8', '#0B8A9A'] }, { id: 'noche', nombre: 'Noche', sw: ['#2A3A78', '#141C40'] }, { id: 'papel', nombre: 'Papel', sw: ['#EEF2FB', '#9DB0D8'] }] },
    { clave: 'barcos', titulo: 'Color de los barcos', def: 'gris', opciones: [{ id: 'gris', nombre: 'Gris naval', sw: ['#6B7A90'] }, { id: 'verde', nombre: 'Verde militar', sw: ['#5F7A3A'] }, { id: 'naranja', nombre: 'Naranja', sw: ['#F07B22'] }] },
    ...gruposFichas({ pocos: true, titulo: 'Barcos', icono: '🚢', formas: false, tamano: ['pequeno', 'normal'] }),
  ], () => { aplicarFichas(); if (!S) return; if (quiere3D() && !V3) iniciar3D(); else if (V3 && !quiere3D()) cerrar3D(); else if (V3) V3.recolor(); pintar(); });
  await api.css(new URL('../../../css/fichas.css', import.meta.url));
  await api.css(new URL('./flota.css', import.meta.url));
  const c0 = api.pref('cfg', null);
  if (c0 && ['cpu', 'dos'].includes(c0.modo) && F.NIVEL[c0.nivel] && F.FLOTAS[c0.flota]) cfg = { ...cfg, ...c0, tocar: !!c0.tocar, repetir: c0.repetir !== false };
  const g = api.cargar();
  if (g) { S = g.s; marcador = g.marcador; reg = g.reg; } else S = null;
  root.addEventListener('click', clic); onKey = teclado; document.addEventListener('keydown', onKey);
  api.barra({ nueva: () => { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; clearTimeout(timer); empezar(); },
    salir: () => { clearTimeout(timer); api.borrar(); setup(); },
    pausar: () => clearTimeout(timer),
    reanudar: () => { if (S && S.fase !== 'fin') bucle(); },
    config: { valores: () => ({ ...cfg }), grupos: v => [{ clave: 'modo', titulo: 'Modo', opciones: [['cpu', 'Contra CPU'], ['dos', '2 jugadores']] }, { clave: 'nivel', titulo: 'Nivel', visible: v.modo === 'cpu', opciones: Object.entries(F.NIVEL) }, { clave: 'flota', titulo: 'Flota', opciones: Object.entries(F.FLOTAS).map(([k, f]) => [k, f.nombre]) }, { clave: 'tocar', titulo: 'Barcos juntos', opciones: [[false, 'No se tocan'], [true, 'Pueden tocarse']] }, { clave: 'repetir', titulo: 'Al acertar', opciones: [[true, 'Vuelves a disparar'], [false, 'Pasa el turno']] }], aplicar: v => { Object.assign(cfg, v); empezar(); } } });
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  if (S) { armar(); pintar(); bucle(); } else setup();
}
export function unmount() { cerrar3D(); clearTimeout(timer); document.removeEventListener('keydown', onKey); if (root) root.removeEventListener('click', clic); S = null; asp = null; }
function guardar() { if (!S) return; const d = { s: S, marcador, reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- pantalla de inicio ---------- */
function setup() {
  S = null; clearTimeout(timer); cerrar3D();
  const seg = (k, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${cfg[k] === v ? 'on' : ''}" data-cfg="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  root.innerHTML = `<p class="note">Coloca tu flota en secreto y dispara por coordenadas al mar enemigo. Gana quien hunda antes todos los barcos del rival.</p>
    <div class="bar"><span class="lbl">Modo</span>${seg('modo', [['cpu', 'Contra CPU'], ['dos', '2 jugadores']])}</div>
    ${cfg.modo === 'cpu' ? `<div class="bar"><span class="lbl">Nivel</span>${seg('nivel', Object.entries(F.NIVEL))}</div>` : ''}
    <div class="bar"><span class="lbl">Flota</span>${seg('flota', Object.entries(F.FLOTAS).map(([k, f]) => [k, f.nombre]))}</div>
    <p class="note">${F.FLOTAS[cfg.flota].desc}</p>
    <div class="bar"><span class="lbl">Barcos juntos</span>${seg('tocar', [[false, 'No se tocan'], [true, 'Pueden tocarse']])}</div>
    <div class="bar"><span class="lbl">Al acertar</span>${seg('repetir', [[true, 'Vuelves a disparar'], [false, 'Pasa el turno']])}</div>
    <p class="note">${cfg.modo === 'dos' ? 'Dos jugadores en este dispositivo: entre turnos aparece una pantalla para pasar el móvil sin ver la flota del otro. ' : ''}Marcador: ${marcador.g} ganadas · ${marcador.p} perdidas.</p>
    <div class="bar"><button class="btn on" data-ac="start">Colocar la flota</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>`;
}
function armar() {
  cerrar3D(); if (quiere3D()) iniciar3D();
  root.innerHTML = `<div class="flmsg" id="flMsg" role="status" aria-live="polite"></div>
    <div id="flCuerpo"></div><ul class="fllog" id="flLog"></ul>
    <div class="bar"><button class="btn" data-ac="reglas">Reglas</button></div>${api.barraHtml()}`;
}
async function iniciar3D() {
  const t = ++tok3;
  try {
    const b3 = await import('../../core/escena3d.js'), { crearFlota3D } = await import('./vista3d.js'); if (t !== tok3 || !root) return;
    const h = document.createElement('div'); h.className = 'e3d'; h.id = 'flHost'; const ph = $('#fl3dph'); if (ph) ph.replaceWith(h);
    const v = await crearFlota3D(h, { alCelda: i => { if (!S) return; if (S.fase === 'colocar') tocarPropio(i); else if (S.fase === 'jugar') disparar(i); } });
    if (t !== tok3 || !root) { v.destruir(); h.remove(); return; }
    b3.botonesCamara(h, v.E); hostEl = h; V3 = v; pintar();
  } catch (e) { console.error(e); if (t === tok3) { forzar2d = true; if (hostEl) { hostEl.remove(); hostEl = null; } if (S && root) pintar(); } }
}
function datos3D(tipo, p, opts = {}) {
  const n = S.n, rival = 1 - p, owner = tipo === 'propio' ? p : rival;
  const lista = tipo === 'propio' ? S.barcos[p] : S.barcos[rival].filter(b => b.celdas && (opts.revelar || F.hundido(S, rival, b)));
  const barcos = lista.filter(b => b.celdas).map(b => ({ k: S.barcos[owner].indexOf(b), celdas: b.celdas, len: b.len, v: b.len > 1 && b.celdas[1] - b.celdas[0] === n, hundido: S.fase !== 'colocar' && F.hundido(S, owner, b), marcado: opts.marcado === S.barcos[owner].indexOf(b) }));
  const ult = S.ultimo && (tipo === 'propio' ? S.ultimo.p === rival : S.ultimo.p === p) ? S.ultimo.i : -1;
  return { n, barcos, tiros: tipo === 'propio' ? S.tiros[rival] : S.tiros[p], ult, pista: tipo === 'rival' ? pista : -1 };
}
function adoptar3D(tipo, p, opts) {
  const ph = $('#fl3dph'); if (!ph || !hostEl) return;
  ph.replaceWith(hostEl); V3.recolor(); V3.fichas(estilo(asp.valores)); V3.pintar(datos3D(tipo, p, opts)); V3.E.redimensionar(); V3.E.marcar();
}
function nuevaSetup() { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; clearTimeout(timer); api.borrar(); setup(); }
function empezar() {
  api.setPref('cfg', cfg); S = F.crear(cfg); reg = false; sel = 0; vertical = false; pista = -1;
  armar(); pintar(); guardar();
}

/* ---------- tableros ---------- */
// Dibuja un tablero n×n. tipo: 'propio' (tus barcos y los disparos del rival) o 'rival' (tus disparos).
function tablero(id, p, tipo, opts = {}) {
  const n = S.n, rival = 1 - p, tiros = tipo === 'propio' ? S.tiros[rival] : S.tiros[p];
  const mios = tipo === 'propio' ? S.barcos[p] : (opts.revelar ? S.barcos[rival] : []);
  const enBarco = new Map(); mios.forEach((b, k) => b.celdas && b.celdas.forEach((c, j) => enBarco.set(c, { k, j, len: b.len, v: b.len > 1 && b.celdas[1] - b.celdas[0] === n })));
  const ult = S.ultimo && (tipo === 'propio' ? S.ultimo.p === rival : S.ultimo.p === p) ? S.ultimo.i : -1;
  let h = `<div class="fltab ${tipo} ${opts.clase || ''}" id="${id}" style="--n:${n}" role="grid" aria-label="${tipo === 'propio' ? 'Tu flota' : 'Mar enemigo'}"><span class="esq"></span>`;
  for (let c = 0; c < n; c++) h += `<span class="cab">${c + 1}</span>`;
  for (let f = 0; f < n; f++) {
    h += `<span class="cab">${F.LETRAS[f]}</span>`;
    for (let c = 0; c < n; c++) {
      const i = f * n + c, t = tiros[i], b = enBarco.get(i);
      const cls = ['cel'];
      if (b) { cls.push('barco', 'fxb', b.v ? 'v' : 'h'); if (b.j === 0) cls.push('ini'); if (b.j === b.len - 1) cls.push('fin'); if (b.len === 1) cls.push('uno'); if (opts.marcado === b.k) cls.push('marcado'); if (tipo === 'rival') cls.push('revelado'); }
      cls.push(['', 'agua', 'tocado', 'hundido', 'deducida'][t]);
      if (i === ult) cls.push('ult'); if (i === pista && tipo === 'rival') cls.push('pista');
      if (efecto && efecto.i === i && efecto.tablero === id) cls.push('fx-' + efecto.res);
      const est = ['sin disparar', 'agua', 'tocado', 'hundido', 'agua'][t];
      h += `<button type="button" class="${cls.join(' ')}" data-t="${id}" data-i="${i}" aria-label="${F.nombreCasilla(n, i)}: ${b && tipo === 'propio' ? 'barco, ' : ''}${est}"></button>`;
    }
  }
  return h + '</div>';
}
const listaBarcos = (p, de) => `<div class="flrest">${S.barcos[de].map(b => { const hund = S.fase === 'colocar' ? false : F.hundido(S, de, b); return `<span class="${hund ? 'hund' : ''}" title="${b.nombre}">${'<i></i>'.repeat(b.len)}</span>`; }).join('')}</div>`;

/* ---------- pintado ---------- */
// 🚢 Barcos: color del casco (--bc/--bc2, también en 3D), tamaño y textura (js/core/fichas.js)
function aplicarFichas() {
  const r = root; if (!r || !asp) return; const e = estilo(asp.valores);
  if (e.hex) { r.style.setProperty('--bc', e.hex); r.style.setProperty('--bc2', oscuro(e.hex, .3)); } else { r.style.removeProperty('--bc'); r.style.removeProperty('--bc2'); }
  r.style.setProperty('--fx-esc', e.esc);
}
function pintar() {
  aplicarFichas();
  if (!S || !$('#flCuerpo')) return;
  const nom = F.nombres(S), cuerpo = $('#flCuerpo'), msg = $('#flMsg');
  if (S.fase === 'colocar') {
    const p = S.colocando, B = S.barcos[p];
    if (B[sel] && B[sel].celdas && B.some(b => !b.celdas)) sel = B.findIndex(b => !b.celdas);
    msg.innerHTML = `<b>${S.modo === 'dos' ? esc(nom[p]) + ': c' : 'C'}oloca tu flota.</b> Elige un barco y toca la casilla de su proa. Toca un barco ya colocado para moverlo.`;
    cuerpo.innerHTML = `${usa3D() ? '<div id="fl3dph"></div>' : tablero('flPropio', p, 'propio', { clase: 'grande colocando', marcado: sel })}
      <div class="flpaleta">${B.map((b, k) => `<button type="button" class="flb ${k === sel ? 'sel' : ''} ${b.celdas ? 'puesto' : ''}" data-barco="${k}" aria-label="${b.nombre} de ${b.len}${b.celdas ? ', colocado' : ''}"><span>${'<i></i>'.repeat(b.len)}</span><small>${b.nombre}</small></button>`).join('')}</div>
      <div class="bar flacc"><button class="btn" data-ac="girar">${vertical ? '↕️ Vertical' : '↔️ Horizontal'}</button><button class="btn" data-ac="azar">🎲 Al azar</button><button class="btn" data-ac="limpiar">🧹 Quitar</button><button class="btn on" data-ac="listo" ${F.completa(S, p) ? '' : 'disabled'}>✔ ¡Listo!</button></div>`;
  } else if (S.fase === 'pasar') {
    const sig = S.siguiente, u = S.ultimo;
    msg.innerHTML = '';
    cuerpo.innerHTML = `<div class="flpasa"><div class="ico">📱</div><h3>Pasa el móvil a ${esc(nom[sig.p])}</h3>
      <p>${u && sig.tipo === 'jugar' ? `Último disparo de ${esc(nom[u.p])}: ${F.nombreCasilla(S.n, u.i)} → <b>${u.res}</b>.` : sig.tipo === 'colocar' ? `${esc(nom[sig.p])} coloca ahora su flota. ¡Que no mire nadie!` : '¡Empieza la batalla!'}</p>
      <button class="btn on" data-ac="continuar">Soy ${esc(nom[sig.p])}, continuar</button></div>`;
  } else {
    const yo = S.modo === 'cpu' ? 0 : S.turno, rival = 1 - yo, fin = S.fase === 'fin', miTurno = !fin && (S.modo === 'dos' || S.turno === 0);
    const c = S.cuenta[yo], pct = c.t ? Math.round(c.a / c.t * 100) : 0;
    if (fin) msg.innerHTML = S.modo === 'cpu' ? (S.ganador === 0 ? '🏆 <b>¡Has hundido toda la flota enemiga!</b>' : '💥 <b>La CPU ha hundido tu flota.</b>') : `🏆 <b>¡${esc(nom[S.ganador])} gana!</b>`;
    else if (!miTurno) msg.innerHTML = '🎯 La CPU está apuntando…';
    else msg.innerHTML = `${S.modo === 'dos' ? `<b>${esc(nom[yo])}</b>: toca` : 'Toca'} una casilla del <b>mar enemigo</b> para disparar.`;
    cuerpo.innerHTML = `<div class="flcab"><b>🎯 Mar enemigo</b><span>Disparos ${c.t} · aciertos ${pct} %</span></div>
      ${usa3D() ? '<div id="fl3dph"></div>' : tablero('flRival', yo, 'rival', { clase: `grande ${miTurno ? 'activo' : ''}`, revelar: fin })}
      <div class="flcab"><span>Barcos de ${S.modo === 'cpu' ? 'la CPU' : esc(nom[rival])}:</span>${listaBarcos(yo, rival)}</div>
      ${fin ? `<div class="bar" style="justify-content:center"><button class="btn on" data-ac="revancha">🔁 Revancha</button><button class="btn" data-ac="setup">Cambiar opciones</button></div>` : `<div class="bar flacc"><button class="btn" data-ac="pista" ${miTurno ? '' : 'disabled'}>💡 Pista</button></div>`}
      <div class="flcab"><b>⚓ ${S.modo === 'cpu' ? 'Tu flota' : `Flota de ${esc(nom[yo])}`}</b>${listaBarcos(rival, yo)}</div>
      ${tablero('flPropio', yo, 'propio', { clase: 'peque' })}`;
  }
  if (usa3D()) { if (S.fase === 'colocar') adoptar3D('propio', S.colocando, { marcado: sel }); else if (S.fase !== 'pasar') adoptar3D('rival', S.modo === 'cpu' ? 0 : S.turno, { revelar: S.fase === 'fin' }); }
  $('#flLog').innerHTML = S.log.map(l => `<li>${esc(l)}</li>`).join('');
  efecto = null;
}

/* ---------- acciones ---------- */
function tocarPropio(i) {
  const p = S.colocando, k = F.barcoEn(S, p, i);
  if (k >= 0) {                                           // recoger un barco colocado para moverlo
    const b = S.barcos[p][k]; vertical = b.len > 1 && b.celdas[1] - b.celdas[0] === S.n; F.quitar(S, p, k); sel = k; api.sonido('click'); pintar(); guardar(); return;
  }
  if (!S.barcos[p][sel]) return;
  if (S.barcos[p][sel].celdas) F.quitar(S, p, sel);
  if (!F.colocar(S, p, sel, i, vertical)) {
    const otra = F.colocar(S, p, sel, i, !vertical);       // si no cabe así, prueba girado
    if (!otra) { api.sonido('error'); api.aviso(S.tocar ? 'No cabe ahí.' : 'No cabe ahí (los barcos no pueden tocarse, ni en diagonal).'); return; }
    vertical = !vertical;
  }
  api.sonido('mover');
  const sig = S.barcos[p].findIndex(b => !b.celdas); if (sig >= 0) sel = sig;
  pintar(); guardar();
}
function disparar(i) {
  const yo = S.modo === 'cpu' ? 0 : S.turno;
  if (S.fase !== 'jugar' || (S.modo === 'cpu' && S.turno !== 0)) return;
  const t = S.tiros[yo][i];
  if (t === 4) { api.aviso('Ahí no puede haber barcos: es agua junto a un barco hundido.'); return; }
  if (t !== 0) return;
  const r = F.disparar(S, yo, i); if (!r) return;
  pista = -1; efecto = { i, res: r.res, tablero: 'flRival' }; sonar(r);
  pintar(); guardar(); bucle();
}
function sonar(r) {
  if (r.res === 'agua') api.sonido('click');
  else if (r.res === 'tocado') { api.sonido('captura'); api.vibrar(40); }
  else { api.sonido('ok'); api.vibrar([60, 30, 60]); if (!r.fin) api.aviso(`¡Hundido! ${r.barco}`); }
}
function bucle() {
  clearTimeout(timer); if (!S) return;
  if (S.fase === 'fin') return cierre();
  if (S.modo !== 'cpu' || S.fase !== 'jugar' || S.turno !== 1) return;
  timer = setTimeout(() => {
    if (!S) return;
    const i = F.cpuDisparo(S), r = F.disparar(S, 1, i); if (!r) return;
    efecto = { i, res: r.res, tablero: 'flPropio' }; sonar(r); pintar(); guardar(); bucle();
  }, 750);
}
function cierre() {
  if (!reg) {
    reg = true;
    if (S.modo === 'cpu') {
      const gano = S.ganador === 0; if (gano) marcador.g++; else marcador.p++;
      api.registrar({ res: gano ? 'victoria' : 'derrota', variante: `${F.FLOTAS[S.flota].nombre} · ${F.NIVEL[S.nivel]}` });
      api.sonido(gano ? 'ganar' : 'perder'); if (gano) api.vibrar([60, 40, 60]);
    } else { api.registrar({ res: 'partida', variante: `${F.FLOTAS[S.flota].nombre} · 2 jugadores` }); api.sonido('ganar'); api.victoria(); }
  }
  pintar(); guardar();
}

/* ---------- entrada ---------- */
function clic(e) {
  const c = e.target.closest('[data-i]');
  if (c && S) { const i = +c.dataset.i; if (c.dataset.t === 'flPropio' && S.fase === 'colocar') return tocarPropio(i); if (c.dataset.t === 'flRival') return disparar(i); return; }
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.cfg) { const v = d.v === 'true' ? true : d.v === 'false' ? false : d.v; cfg[d.cfg] = v; return setup(); }
  if (d.barco != null && S && S.fase === 'colocar') { sel = +d.barco; api.sonido('click'); return pintar(); }
  const a = d.ac;
  if (a === 'start') empezar(); else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas(); else if (a === 'nueva') nuevaSetup();
  else if (a === 'setup') { api.borrar(); setup(); }
  else if (a === 'revancha') { api.borrar(); empezar(); }
  else if (!S) return;
  else if (a === 'girar') { vertical = !vertical; api.sonido('click'); pintar(); }
  else if (a === 'azar') { F.alAzar(S, S.colocando); sel = 0; api.sonido('dado'); pintar(); guardar(); }
  else if (a === 'limpiar') { S.barcos[S.colocando].forEach((_, k) => F.quitar(S, S.colocando, k)); sel = 0; pintar(); guardar(); }
  else if (a === 'listo') { if (F.listo(S, S.colocando)) { sel = 0; vertical = false; api.sonido('ok'); pintar(); guardar(); bucle(); } }
  else if (a === 'continuar') { if (F.continuar(S)) { sel = 0; vertical = false; api.sonido('click'); pintar(); guardar(); } }
  else if (a === 'pista') { const yo = S.modo === 'cpu' ? 0 : S.turno; pista = F.sugerencia(S, yo, 'dificil'); api.sonido('click'); pintar(); }
}
function teclado(e) {
  if (!S || S.fase !== 'colocar' || document.querySelector('.modal') || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (e.key === 'r' || e.key === 'R') { vertical = !vertical; pintar(); }
}
function reglas() {
  api.modal('Hundir la Flota', `<ul><li>Cada jugador coloca su flota en secreto en su tablero. Los barcos van en horizontal o vertical${cfg.tocar ? '' : ' y, si eliges «No se tocan», no pueden tocarse ni en diagonal'}.</li>
    <li><b>Colocar</b>: elige un barco abajo, decide ↔️/↕️ y toca la casilla de la proa (si no cabe así, se prueba girado). Toca un barco colocado para moverlo, o usa 🎲 Al azar.</li>
    <li><b>Disparar</b>: toca una casilla del mar enemigo. Verás <b>agua</b> (punto), <b>tocado</b> (🔥) o <b>hundido</b> (barco a la vista). Con «Vuelves a disparar», si aciertas sigues tirando.</li>
    <li>Cuando hundes un barco y no se pueden tocar, sus casillas vecinas se marcan solas como agua.</li>
    <li>Debajo ves los barcos que le quedan al rival y los tuyos; los hundidos aparecen tachados.</li>
    <li>💡 <b>Pista</b> marca la casilla con más probabilidad de esconder un barco (con lo que tú sabes, sin trampas).</li>
    <li>Gana quien hunda primero toda la flota rival. A 2 jugadores, entre turnos aparece una pantalla para pasar el móvil.</li></ul>`);
}
