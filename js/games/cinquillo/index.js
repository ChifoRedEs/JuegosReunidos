import { $, esc } from '../../core/dom.js';
import { anotarPartida, htmlPartidas, historialVacio, validarHistorial, seguir, htmlTabla } from '../../core/historial.js';
import { cartaEsHTML, asegurarSprites, nombreEs, PALOS_ES } from '../../core/cartas.js';
import { grupoMesa, grupoDorso, grupoBarajaEs } from '../../core/aspectos.js';
import { hacerOrdenable, ordenarMano, validarOrden } from '../../core/arrastrar.js';
import * as C from './motor.js';

let S = null, api = null, asp = null, root = null, timer = null, reg = false, arr = null, nueva = -1;
let hm = historialVacio();                                   // tabla de puntos mano a mano (se guarda con la partida)
let cfg = { rivales: 3, nivel: 'medio', rondas: 3 }, marcador = { g: 0, p: 0 }, ord = { modo: 'palo', ids: [] };
const MODOS = ['palo', 'numero', 'libre'];
const pl = (n, s) => `${n} ${s}${n === 1 ? '' : 's'}`;

/* ---------- validación / resumen ---------- */
export function validar(d) {
  const s = d && C.validar(d.s); if (!s) return null;
  const m = d.marcador && typeof d.marcador === 'object' ? d.marcador : {}, e = v => (Number.isInteger(v) && v >= 0 && v <= 99999 ? v : 0);
  return { s, marcador: { g: e(m.g), p: e(m.p) }, reg: !!d.reg, ord: validarOrden(d.ord, MODOS), hm: validarHistorial(d.hm, s.jug ? s.jug.length : 2) };
}
export const migrarV1 = d => d;
export function resumen(d) {
  const s = d.s;
  if (s.fase === 'fin') return { texto: s.ganador === 0 ? '¡Ganaste la partida!' : `Ganó ${s.jug[s.ganador].nombre}`, fin: true };
  return { texto: `Mano ${s.ronda} de ${s.rondas} · te quedan ${pl(s.jug[0].mano.length, 'carta')}`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; arr = null; nueva = -1; asegurarSprites();
  asp = api.aspecto([grupoMesa(), grupoDorso(), grupoBarajaEs()]);
  await api.css(new URL('../../../css/cartas.css', import.meta.url)); await api.css(new URL('./cinquillo.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && [2, 3].includes(c0.rivales) && C.NIVEL[c0.nivel] && C.RONDAS.includes(c0.rondas)) cfg = { ...c0 };
  ord = { modo: MODOS.includes(api.pref('orden', 'palo')) ? api.pref('orden', 'palo') : 'palo', ids: [] };
  const g = api.cargar();
  if (g) { S = g.s; marcador = g.marcador; reg = g.reg; if (g.ord) ord = g.ord; hm = g.hm || historialVacio(); } else { S = null; hm = historialVacio(); }
  root.addEventListener('click', clic); root.addEventListener('keydown', tecla);
  api.barra({ nueva: () => { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; clearTimeout(timer); empezar(); },
    salir: () => { clearTimeout(timer); api.borrar(); setup(); },
    pausar: () => clearTimeout(timer),
    reanudar: () => { if (S && S.fase !== 'fin') bucle(); },
    config: { valores: () => ({ ...cfg }), grupos: v => [{ clave: 'rivales', titulo: 'Rivales', opciones: [[2, '2 CPU'], [3, '3 CPU']] }, { clave: 'nivel', titulo: 'Nivel', opciones: Object.entries(C.NIVEL) }, { clave: 'rondas', titulo: 'Partida', opciones: [[1, '1 mano'], [3, '3 manos'], [5, '5 manos']] }], aplicar: v => { Object.assign(cfg, v); empezar(); } } });
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '📜 Historial de la partida', accion: verHistorial }, { texto: '🗂️ Partidas anteriores', accion: () => api.modal('🗂️ Partidas anteriores', htmlPartidas(api)) }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  if (S) { armar(); pintar(); bucle(); } else setup();
}
export function unmount() { clearTimeout(timer); if (arr) { arr.destruir(); arr = null; } if (root) { root.removeEventListener('click', clic); root.removeEventListener('keydown', tecla); } S = null; asp = null; }
function guardar() { if (!S) return; const d = { s: S, marcador, reg, ord, hm }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- pantallas ---------- */
function setup() {
  S = null; clearTimeout(timer);
  const seg = (k, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${cfg[k] === v ? 'on' : ''}" data-cfg="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  root.innerHTML = `<p class="note">Cinquillo con baraja española: empieza el <b>5 de oros</b>. Cada palo se abre con un 5 y crece hacia arriba y hacia abajo. Quédate sin cartas antes que nadie.</p>
    <div class="bar"><span class="lbl">Rivales</span>${seg('rivales', [[2, '2 CPU'], [3, '3 CPU']])}</div>
    <div class="bar"><span class="lbl">Nivel</span>${seg('nivel', Object.entries(C.NIVEL))}</div>
    <div class="bar"><span class="lbl">Partida</span>${seg('rondas', [[1, '1 mano'], [3, '3 manos'], [5, '5 manos']])}</div>
    <p class="note">${cfg.rivales === 2 ? 'Con 3 jugadores se reparten 13 o 14 cartas a cada uno.' : 'Con 4 jugadores, 10 cartas a cada uno.'} Marcador: ${marcador.g} ganadas · ${marcador.p} perdidas.</p>
    <div class="bar"><button class="btn on" data-ac="start">Repartir</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>`;
}
function armar() {
  root.innerHTML = `<div class="cqtop"><span id="cqInfo"></span><span>✔ ${marcador.g} · ✘ ${marcador.p}</span></div>
    <div class="mesa cqm">
      <div class="cqops" id="cqOps"></div>
      <div class="cqmesa" id="cqMesa"></div>
      <div class="cqmsg" id="cqMsg" role="status" aria-live="polite"></div>
      <div class="ordbar" id="cqOrd"><span>Ordenar:</span><button type="button" data-ord="palo">Palo</button><button type="button" data-ord="numero">Número</button><em id="cqLibre">✋ a tu gusto</em></div>
      <div class="cqmano" id="cqMano"></div>
    </div>
    <div class="bar cqacc" id="cqAcc"></div>
    <div id="cqRes"></div>
    <ul class="cqlog" id="cqLog"></ul>
    <div class="bar"><button class="btn" data-ac="reglas">Reglas</button></div>${api.barraHtml()}`;
  if (arr) arr.destruir();
  arr = hacerOrdenable($('#cqMano'), { sel: '.cqc', alSoltar: ids => { ord = { modo: 'libre', ids }; pintar(); guardar(); } });
}
function nuevaSetup() { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; clearTimeout(timer); api.borrar(); setup(); }
function empezar() {
  asp.sortear();
  hm = historialVacio();
  api.setPref('cfg', cfg);
  const jugadores = [{ nombre: 'Tú', cpu: false }, ...Array.from({ length: cfg.rivales }, (_, k) => ({ nombre: `CPU ${k + 1}`, cpu: true }))];
  S = C.crear({ jugadores, nivel: cfg.nivel, rondas: cfg.rondas }); reg = false; nueva = -1; ord = { modo: ord.modo === 'libre' ? 'palo' : ord.modo, ids: [] };
  armar(); pintar(); guardar(); bucle();
}

/* ---------- pintado ---------- */
// Historial mano a mano: al terminar cada mano se apuntan los puntos que ha sumado cada uno
function puntosMano() {
  const act = S.jug.map(J => J.puntos), prev = hm.filas.reduce((t, f) => t.map((v, k) => v + f[k]), act.map(() => 0));
  return act.map((v, k) => v - prev[k]);
}
function seguirHistorial() { if (S && (S.fase === 'finRonda' || S.fase === 'fin') && !hm.marcada) seguir(hm, true, puntosMano()); else if (S && !(S.fase === 'finRonda' || S.fase === 'fin')) seguir(hm, false); }
function verHistorial() {
  if (!S) { api.modal('📜 Historial de la partida', htmlPartidas(api)); return; }
  api.modal('📜 Historial de la partida', htmlTabla(S.jug.map(J => J.nombre), hm.filas, { titulo: 'Mano', menosEsMejor: true }) + '<p class="note">Puntos sumados en cada mano: gana quien menos tenga.</p>');
}
function pintar() {
  seguirHistorial();
  if (!S || !$('#cqMesa')) return;
  const miTurno = S.fase === 'jugar' && S.turno === 0, ops = miTurno ? new Set(C.jugables(S, 0)) : new Set();
  $('#cqInfo').textContent = `Mano ${S.ronda} de ${S.rondas}`;
  // rivales
  $('#cqOps').style.setProperty('--no', S.jug.length - 1);
  $('#cqOps').innerHTML = S.jug.map((J, k) => k === 0 ? '' : `<div class="cqseat ${S.turno === k && S.fase === 'jugar' ? 'turno' : ''}"><div class="nom">${esc(J.nombre)}</div><div class="cs">${J.mano.map(() => cartaEsHTML(0, { oculta: true })).join('')}</div><div class="pts">${pl(J.mano.length, 'carta')} · ${J.puntos} pts</div>${S.ult && S.ult.j === k ? `<div class="bocadillo">${S.ult.c < 0 ? 'Paso' : '¡Juega!'}</div>` : ''}</div>`).join('');
  // mesa: una fila por palo con las 10 posiciones (el 5 en el centro)
  const sitio = new Set(); if (miTurno) ops.forEach(c => sitio.add(c));
  $('#cqMesa').innerHTML = [0, 1, 2, 3].map(p => {
    const m = S.mesa[p];
    return `<div class="cqfila" aria-label="${PALOS_ES[p]}"><svg class="cqpalo" viewBox="0 0 24 24"><use href="#es-${p}"/></svg>${Array.from({ length: 10 }, (_, k) => {
      const id = p * 10 + k, puesta = m && k >= m.lo && k <= m.hi;
      if (puesta) return `<div class="cqslot">${cartaEsHTML(id, { clase: id === nueva ? 'in' : '' })}</div>`;
      return `<div class="cqslot vacio ${sitio.has(id) ? 'cabe' : ''} ${k === 4 ? 'cinco' : ''}"></div>`;
    }).join('')}</div>`;
  }).join('');
  nueva = -1;
  // mensaje
  const msg = $('#cqMsg');
  if (S.fase === 'fin') msg.innerHTML = S.ganador === 0 ? '🏆 <b>¡Has ganado la partida!</b>' : `<b>${esc(S.jug[S.ganador].nombre)}</b> gana la partida.`;
  else if (S.fase === 'finRonda') msg.innerHTML = S.ganadorRonda === 0 ? '🎉 <b>¡Te has quedado sin cartas!</b>' : `<b>${esc(S.jug[S.ganadorRonda].nombre)}</b> se queda sin cartas.`;
  else if (!miTurno) msg.textContent = `${S.jug[S.turno].nombre} está pensando…`;
  else if (!S.mesa[0]) msg.textContent = 'Tienes el 5 de oros: ¡empiezas tú!';
  else msg.textContent = ops.size ? 'Tu turno: toca una carta que encaje (las marcadas).' : 'No tienes ninguna carta que encaje: pasa.';
  // mi mano
  root.querySelectorAll('#cqOrd [data-ord]').forEach(b => b.classList.toggle('on', b.dataset.ord === ord.modo));
  $('#cqLibre').hidden = ord.modo !== 'libre';
  if (!(arr && arr.activo())) {
    const mano = ordenarMano(S.jug[0].mano, ord, { palo: C.palo, num: C.pos });
    $('#cqMano').className = 'cqmano' + (miTurno ? ' turno' : '');
    $('#cqMano').innerHTML = mano.map(c => `<div class="cqc ${ops.has(c) ? 'vale' : ''}" data-c="${c}" role="button" tabindex="0" aria-label="${nombreEs(c)}${ops.has(c) ? ', se puede jugar' : ''}">${cartaEsHTML(c)}</div>`).join('');
  }
  $('#cqAcc').innerHTML = miTurno && !ops.size ? '<button class="btn on" data-ac="paso">✋ Paso</button>' : '';
  $('#cqAcc').hidden = !(miTurno && !ops.size);
  pintarRes();
  $('#cqLog').innerHTML = S.log.map(l => `<li>${esc(l)}</li>`).join('');
}
function pintarRes() {
  const el = $('#cqRes');
  if (S.fase !== 'finRonda' && S.fase !== 'fin') { el.innerHTML = ''; return; }
  const fin = S.fase === 'fin', orden = S.jug.map((J, k) => ({ ...J, k })).sort((a, b) => a.puntos - b.puntos);
  el.innerHTML = `<div class="cqres"><h3>${fin ? '🏆 Clasificación final' : `Fin de la mano ${S.ronda} de ${S.rondas}`}</h3>
    ${S.jug.map((J, k) => `<div class="cqrf ${k === S.ganadorRonda ? 'gana' : ''}"><b>${esc(J.nombre)}</b><div class="cs">${J.mano.map(c => cartaEsHTML(c)).join('') || '<small>Sin cartas ✔</small>'}</div><span>${k === S.ganadorRonda ? '+0' : `+${J.mano.length}`}</span></div>`).join('')}
    <table>${orden.map((J, i) => `<tr class="${fin && J.k === S.ganador ? 'gana' : ''}"><td>${i + 1}.º ${esc(J.nombre)}</td><td>${pl(J.puntos, 'punto')}</td></tr>`).join('')}</table>
    <p class="note">Cada carta que te queda al terminar una mano suma 1 punto. Gana quien menos puntos tenga.</p>
    <div class="bar" style="justify-content:center">${fin ? '<button class="btn on" data-ac="otra">🔁 Otra partida</button><button class="btn" data-ac="setup">Cambiar opciones</button>' : '<button class="btn on" data-ac="siguiente">Siguiente mano</button>'}</div></div>`;
}

/* ---------- flujo ---------- */
function jugarCarta(c) {
  if (!S || S.fase !== 'jugar' || S.turno !== 0) return;
  if (!C.cabe(S, c)) { api.sonido('error'); api.aviso(!S.mesa[0] ? 'La primera carta tiene que ser el 5 de oros.' : 'Esa carta no encaja: necesitas un 5 o la carta contigua a las de la mesa.'); return; }
  C.jugar(S, 0, c); nueva = c; api.sonido('mover'); pintar(); guardar(); bucle();
}
function bucle() {
  clearTimeout(timer); if (!S) return;
  if (S.fase === 'fin') return cierre();
  if (S.fase !== 'jugar' || S.turno === 0) return;
  timer = setTimeout(() => {
    if (!S) return;
    const j = S.turno, c = C.cpuCarta(S, j);
    if (c < 0) { C.pasar(S, j); api.sonido('click'); } else { C.jugar(S, j, c); nueva = c; api.sonido('mover'); }
    pintar(); guardar(); bucle();
  }, 800);
}
function cierre() {
  if (!reg) {
    reg = true; const gano = S.ganador === 0; if (gano) marcador.g++; else marcador.p++;
    anotarPartida(api, { res: gano ? 'g' : 'p', texto: `${S.jug.length} jugadores · ${S.rondas} mano${S.rondas > 1 ? 's' : ''} · tus puntos ${S.jug[0].puntos}` });
    api.registrar({ res: gano ? 'victoria' : 'derrota', variante: `${S.jug.length} jugadores · ${S.rondas} mano${S.rondas > 1 ? 's' : ''}` });
    api.sonido(gano ? 'ganar' : 'perder'); if (gano) api.vibrar([60, 40, 60]);
  }
  pintar(); guardar();
}

/* ---------- entrada ---------- */
function tecla(e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.c != null) { e.preventDefault(); jugarCarta(+e.target.dataset.c); } }
function clic(e) {
  const k = e.target.closest('[data-c]'); if (k && S) return jugarCarta(+k.dataset.c);
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.cfg) { cfg[d.cfg] = d.cfg === 'nivel' ? d.v : +d.v; return setup(); }
  if (d.ord) { ord = { modo: d.ord, ids: [] }; api.setPref('orden', d.ord); api.sonido('click'); if (S) { pintar(); guardar(); } return; }
  const a = d.ac;
  if (a === 'start') empezar(); else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas(); else if (a === 'nueva') nuevaSetup();
  else if (a === 'setup') { api.borrar(); setup(); } else if (a === 'otra') { api.borrar(); empezar(); }
  else if (!S) return;
  else if (a === 'paso') { if (C.pasar(S, 0)) { api.sonido('click'); pintar(); guardar(); bucle(); } }
  else if (a === 'siguiente') { if (C.siguienteRonda(S)) { api.sonido('click'); pintar(); guardar(); bucle(); } }
}
function reglas() {
  api.modal('Cinquillo', `<ul><li>Se reparte toda la baraja española de 40 cartas entre 3 o 4 jugadores.</li>
    <li>Empieza quien tiene el <b>5 de oros</b>, que es obligatorio jugar primero.</li>
    <li>Cada palo forma una fila en la mesa: se <b>abre con un 5</b> y luego solo se puede poner la carta <b>siguiente por arriba o por abajo</b> (… 4, 5, 6, 7, sota, caballo, rey). Las casillas donde encaja alguna de tus cartas se iluminan.</li>
    <li>Si puedes jugar, <b>tienes que jugar</b>. Si no tienes ninguna carta que encaje, pasas.</li>
    <li>Gana la mano quien se queda antes sin cartas. Los demás suman 1 punto por cada carta que les quede. Al final de la partida gana quien tenga menos puntos.</li>
    <li>Toca una carta marcada para jugarla. Puedes ordenar tu mano por palo o número, o arrastrar las cartas a tu gusto.</li></ul>`);
}
