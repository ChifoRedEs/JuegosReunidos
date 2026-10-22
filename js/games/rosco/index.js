import { $, esc } from '../../core/dom.js';
import { crearTeclado } from '../../core/teclado.js';
import * as R from './motor.js';
import { grupoFondo } from '../../core/aspectos.js';

let S = null, api = null, asp = null, root = null, reg = false, tk = null, reloj = null, cpuT = null, onKey = null, onVis = null;
let texto = '', ultimo = 0, flash = null, bocadillo = '', marcador = { g: 0, p: 0, e: 0, mejor: 0 };
let cfg = { modo: 'solo', nivel: 'normal', tiempo: 200 };

/* ---------- validación / resumen ---------- */
export function validar(d) {
  const s = d && R.validar(d.s); if (!s) return null;
  const m = d.marcador && typeof d.marcador === 'object' ? d.marcador : {}, e = v => (Number.isInteger(v) && v >= 0 && v <= 99999 ? v : 0);
  return { s, marcador: { g: e(m.g), p: e(m.p), e: e(m.e), mejor: Math.min(25, e(m.mejor)) }, reg: !!d.reg };
}
export const migrarV1 = d => d;
export function resumen(d) {
  const s = d.s, a = R.aciertos(s.jug[0]);
  if (s.fase === 'fin') return { texto: s.modo === 'cpu' ? (s.ganador === 0 ? `¡Ganaste! ${a} aciertos` : s.ganador === -2 ? `Empate a ${a}` : `Ganó la CPU (${a} aciertos)`) : `${a} de 25 aciertos`, fin: true };
  return { texto: `${s.modo === 'cpu' ? 'Duelo' : 'Contrarreloj'} · ${a} aciertos · ${Math.ceil(s.jug[0].tiempo / 1000)} s`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; texto = ''; flash = null; bocadillo = '';
  asp = api.aspecto([grupoFondo('#rcRosco'), { clave: 'rosco', titulo: 'Colores del rosco', def: 'azul', opciones: [{ id: 'azul', nombre: 'Azul de concurso', sw: ['#1E4FD8', '#0B1E5B'] }, { id: 'morado', nombre: 'Morado', sw: ['#8B5CF6', '#3B1E7A'] }, { id: 'noche', nombre: 'Noche', sw: ['#2A3460', '#0E1330'] }] }], () => { if (S) pintar(); });
  await api.css(new URL('./rosco.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && ['solo', 'cpu'].includes(c0.modo) && R.NIVEL[c0.nivel] && R.TIEMPOS.includes(c0.tiempo)) cfg = { ...c0 };
  const g = api.cargar();
  if (g) { S = g.s; marcador = g.marcador; reg = g.reg; } else S = null;
  tk = crearTeclado({ filas: ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM', '⏩✔'], borrar: true, alPulsar: tecla, titulo: 'El Rosco · escribe tu respuesta' });
  root.addEventListener('click', clic); onKey = teclado; document.addEventListener('keydown', onKey);
  onVis = () => { ultimo = performance.now(); }; document.addEventListener('visibilitychange', onVis);
  api.menu([{ texto: 'Nuevo rosco', accion: nuevaSetup }, { texto: '🏳️ Plantarse', accion: plantarse }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Cómo se juega', accion: reglas }]);
  if (S) { armar(); pintar(); arrancar(); } else setup();
}
export function unmount() {
  parar(); document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis);
  if (root) root.removeEventListener('click', clic); if (tk) { tk.destruir(); tk = null; } if (S) guardar(); S = null; asp = null;
}
function guardar() { if (!S) return; const d = { s: S, marcador, reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- pantalla de inicio ---------- */
function setup() {
  S = null; parar(); if (tk) tk.cerrar();
  const seg = (k, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${cfg[k] === v ? 'on' : ''}" data-cfg="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  root.innerHTML = `<p class="note">Una definición por cada letra del abecedario: «empieza por…» o «contiene la…». Responde o di <b>pasapalabra</b> para volver a ella en la siguiente vuelta, antes de que se acabe el tiempo.</p>
    <div class="bar"><span class="lbl">Modo</span>${seg('modo', [['solo', 'Contrarreloj'], ['cpu', 'Duelo contra la CPU']])}</div>
    <div class="bar"><span class="lbl">Nivel</span>${seg('nivel', Object.entries(R.NIVEL))}</div>
    <div class="bar"><span class="lbl">Tiempo</span>${seg('tiempo', R.TIEMPOS.map(t => [t, `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`]))}</div>
    <p class="note">${cfg.modo === 'cpu' ? 'Duelo: cada uno tiene su rosco y su reloj. Si fallas o dices pasapalabra, le toca a la CPU; gana quien más acierte. ' : ''}Fácil: palabras cotidianas · Normal: algo más variadas · Difícil: incluye las definiciones del Trivial.<br>Tu mejor marca: ${marcador.mejor} aciertos${marcador.g + marcador.p + marcador.e ? ` · Duelos: ${marcador.g} ganados, ${marcador.p} perdidos, ${marcador.e} empates` : ''}.</p>
    <div class="bar"><button class="btn on" data-ac="start">¡Empezar el rosco!</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>`;
}
function armar() {
  root.innerHTML = `<div class="rcpanel" id="rcRival"></div>
    <div class="rcdef" id="rcDef" aria-live="polite"></div>
    <div class="rcresp" id="rcResp" role="button" tabindex="0" data-ac="teclado" aria-label="Tu respuesta: toca para escribir"></div>
    <div class="bar rcacc" id="rcAcc"><button class="btn on" data-ac="responder">✔ Responder</button><button class="btn rcpasa" data-ac="pasa">⏩ Pasapalabra</button><button class="btn tkabrir" data-ac="teclado" aria-label="Abrir teclado">⌨️</button></div>
    <div class="rcrosco" id="rcRosco">${R.LETRAS.map((L, i) => { const a = (i / R.LETRAS.length) * 2 * Math.PI - Math.PI / 2; return `<span class="rcl" data-i="${i}" style="left:${50 + 44 * Math.cos(a)}%;top:${50 + 44 * Math.sin(a)}%">${L}</span>`; }).join('')}
      <div class="rccentro"><div class="rctiempo" id="rcTiempo"></div><div class="rcac" id="rcAc"></div></div></div>
    <div id="rcFin"></div>
    <ul class="rclog" id="rcLog"></ul>
    <div class="bar"><button class="btn" data-ac="plantarse">🏳️ Plantarse</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="nueva">Nuevo rosco</button></div>`;
}
function nuevaSetup() { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar este rosco?')) return; parar(); api.borrar(); setup(); }
function empezar() {
  api.setPref('cfg', cfg);
  const vistas = api.pref('vistas', []);
  S = R.crear({ modo: cfg.modo, nivel: cfg.nivel, tiempo: cfg.tiempo, vistas: Array.isArray(vistas) ? vistas : [] });
  api.setPref('vistas', [...(Array.isArray(vistas) ? vistas : []), ...S.jug.flatMap(J => J.letras.map(l => R.base(l.resp[0])))].slice(-160));
  reg = false; texto = ''; bocadillo = '';
  armar(); pintar(); guardar(); arrancar(); tk.abrir();
}

/* ---------- reloj y turnos ---------- */
function arrancar() {
  parar(); if (!S || S.fase !== 'jugar') return cierre();
  ultimo = performance.now();
  reloj = setInterval(() => {
    if (!S || S.fase !== 'jugar') return parar();
    const ahora = performance.now(), dt = ahora - ultimo; ultimo = ahora;
    if (document.hidden || document.querySelector('.modal')) return;      // pausa si la app no está a la vista o hay una ventana abierta
    const turnoAntes = S.turno, termino = R.descontar(S, Math.min(dt, 500));
    if (termino) { api.sonido('error'); texto = ''; if (cpuT) { clearTimeout(cpuT); cpuT = null; } guardar(); pintar(); if (S.fase === 'fin') return cierre(); if (S.turno !== turnoAntes) siguienteTurno(); return; }
    pintarTiempo();
    if (Math.floor(S.jug[S.turno].tiempo / 1000) % 5 === 0) guardar();
  }, 200);
  siguienteTurno();
}
function parar() { clearInterval(reloj); reloj = null; clearTimeout(cpuT); cpuT = null; }
function siguienteTurno() {
  clearTimeout(cpuT); cpuT = null;
  if (!S || S.fase !== 'jugar') return;
  if (S.jug[S.turno].cpu) { if (tk) tk.cerrar(); pintar(); cpuJuega(); }
  else pintar();
}
function cpuJuega() {
  if (!S || S.fase !== 'jugar' || !S.jug[S.turno].cpu) return;
  const d = R.cpuPiensa(S); bocadillo = '🤔 …'; pintar();
  cpuT = setTimeout(() => {
    if (!S || S.fase !== 'jugar' || !S.jug[S.turno].cpu) return;
    const l = R.actual(S);
    if (d.tipo === 'pasa') { bocadillo = '⏩ ¡Pasapalabra!'; R.pasapalabra(S); api.sonido('click'); }
    else { const r = R.responder(S, d.texto); bocadillo = r === 'ok' ? `✔ ${l.resp[0]}` : '✘ Falla'; flash = { j: 1, i: R.LETRAS.indexOf(l.L), ok: r === 'ok' }; api.sonido(r === 'ok' ? 'ok' : 'error'); }
    guardar();
    if (S.fase === 'fin') { pintar(); return cierre(); }
    if (S.jug[S.turno].cpu) cpuJuega(); else { pintar(); api.aviso('¡Te toca!'); tk.abrir(); }
  }, d.ms);
}

/* ---------- acciones del jugador ---------- */
const miTurno = () => S && S.fase === 'jugar' && !S.jug[S.turno].cpu;
function responder() {
  if (!miTurno()) return;
  if (!texto.trim()) { api.aviso('Escribe tu respuesta o di pasapalabra.'); return; }
  const l = R.actual(S), r = R.responder(S, texto);
  flash = { j: 0, i: R.LETRAS.indexOf(l.L), ok: r === 'ok' };
  if (r === 'ok') { api.sonido('ok'); api.vibrar(20); }
  else { api.sonido('error'); api.vibrar([40, 30, 40]); api.aviso(`✘ Era «${l.resp[0]}»`); }
  texto = ''; guardar();
  if (S.fase === 'fin') { pintar(); return cierre(); }
  siguienteTurno();
}
function pasa() {
  if (!miTurno()) return;
  if (!R.pasapalabra(S)) { api.aviso('Es la única letra que te queda: ¡responde!'); return; }
  texto = ''; api.sonido('click'); guardar(); siguienteTurno();
}
function plantarse() {
  if (!S || S.fase !== 'jugar' || !miTurno()) return;
  if (!api.confirmar('¿Plantarte? Las letras que te quedan se darán por no contestadas.')) return;
  R.plantarse(S); texto = ''; guardar(); if (S.fase === 'fin') { pintar(); return cierre(); } siguienteTurno();
}
function tecla(k) {
  if (!miTurno()) return;
  if (k === '✔') return responder();
  if (k === '⏩') return pasa();
  if (k === '⌫') texto = texto.slice(0, -1); else if (texto.length < 24) texto += k;
  pintarResp();
}
function teclado(e) {
  if (!S || document.querySelector('.modal') || /INPUT|TEXTAREA/.test(document.activeElement.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (!miTurno()) return;
  if (e.key === 'Enter') { e.preventDefault(); return responder(); }
  if (e.key === 'Backspace') { e.preventDefault(); return tecla('⌫'); }
  if (e.key === 'Tab') { e.preventDefault(); return pasa(); }
  if (e.key.length === 1 && /[a-zñáéíóúü]/i.test(e.key)) { texto += e.key.toUpperCase(); pintarResp(); }
}

/* ---------- pintado ---------- */
const mmss = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function pintarTiempo() {
  const J = S.jug[0], el = $('#rcTiempo'); if (!el) return;
  el.textContent = mmss(J.tiempo); el.classList.toggle('poco', J.tiempo < 20000 && !J.fin);
  const t2 = $('#rcT2'); if (t2) { t2.textContent = `⏱ ${mmss(J.tiempo)}`; t2.classList.toggle('poco', J.tiempo < 20000); }
  if (S.modo === 'cpu') { const t = $('#rcTcpu'); if (t) t.textContent = mmss(S.jug[1].tiempo); }
}
function pintarResp() {
  const el = $('#rcResp'); if (!el) return;
  el.innerHTML = miTurno() ? (texto ? `${esc(texto)}<i class="cursor"></i>` : '<span class="ph">Toca aquí para escribir…</span><i class="cursor"></i>') : '';
  el.classList.toggle('activa', miTurno());
}
function pintar() {
  if (!S || !$('#rcRosco')) return;
  const J = S.jug[0], l = R.actual(S, 0), fin = S.fase === 'fin';
  // mi rosco
  root.querySelectorAll('#rcRosco .rcl').forEach((el, i) => {
    const x = J.letras[i];
    el.className = 'rcl' + (x.estado === 1 ? ' ok' : x.estado === 2 ? ' mal' : '') + (!fin && i === J.idx && !J.fin ? ' act' : '') + (flash && flash.j === 0 && flash.i === i ? (flash.ok ? ' fxok' : ' fxmal') : '');
  });
  $('#rcAc').innerHTML = `<b>${R.aciertos(J)}</b> aciertos${R.fallos(J) ? ` · ${R.fallos(J)} fallos` : ''}`;
  pintarTiempo();
  // rival (duelo)
  const rv = $('#rcRival');
  if (S.modo === 'cpu') {
    const C = S.jug[1];
    rv.hidden = false;
    rv.innerHTML = `<div class="rcrv ${S.turno === 1 && !fin ? 'turno' : ''}"><div class="rch"><b>🤖 CPU</b><span id="rcTcpu">${mmss(C.tiempo)}</span><span><b>${R.aciertos(C)}</b> aciertos</span></div>
      <div class="rcmini">${C.letras.map((x, i) => `<i class="${x.estado === 1 ? 'ok' : x.estado === 2 ? 'mal' : ''} ${i === C.idx && S.turno === 1 && !fin ? 'act' : ''} ${flash && flash.j === 1 && flash.i === i ? 'fx' : ''}">${x.L}</i>`).join('')}</div>
      ${S.turno === 1 && !fin && bocadillo ? `<div class="rcbo">${esc(bocadillo)}</div>` : ''}</div>`;
  } else rv.hidden = true;
  flash = null;
  // definición
  const def = $('#rcDef');
  if (fin) def.innerHTML = '';
  else if (S.turno === 1 && S.modo === 'cpu') { const c = R.actual(S, 1); def.innerHTML = `<div class="rcquien">Turno de la CPU</div><div class="rcletra">${c.tipo === 'empieza' ? 'Empieza por' : 'Contiene la'} <b>${c.L}</b></div><p>${esc(c.def)}</p>`; }
  else def.innerHTML = `<div class="rcletra">${l.tipo === 'empieza' ? 'Empieza por' : 'Contiene la'} <b>${l.L}</b><span class="rcmini-t" id="rcT2">⏱ ${mmss(J.tiempo)}</span><span class="rcmini-a">✔ ${R.aciertos(J)}</span></div><p>${esc(l.def)}</p>`;
  pintarResp();
  const acc = $('#rcAcc'); acc.hidden = !miTurno();
  $('#rcResp').hidden = !miTurno();
  pintarFin();
  $('#rcLog').innerHTML = S.log.map(x => `<li>${esc(x)}</li>`).join('');
}
function pintarFin() {
  const el = $('#rcFin'); if (S.fase !== 'fin') { el.innerHTML = ''; return; }
  const J = S.jug[0], a = R.aciertos(J), mal = J.letras.filter(x => x.estado !== 1);
  const titulo = S.modo === 'cpu' ? (S.ganador === 0 ? '🏆 ¡Ganas el duelo!' : S.ganador === -2 ? '🤝 ¡Empate!' : '🤖 Gana la CPU') : a === 25 ? '🏆 ¡ROSCO COMPLETO!' : `${a} de 25 aciertos`;
  el.innerHTML = `<div class="rcres"><h3>${titulo}</h3>
    ${S.modo === 'cpu' ? `<p class="note">Tú: <b>${a}</b> aciertos y ${R.fallos(J)} fallos · CPU: <b>${R.aciertos(S.jug[1])}</b> aciertos y ${R.fallos(S.jug[1])} fallos.</p>` : `<p class="note">${R.fallos(J)} fallos · ${R.pendientes(J)} sin contestar · te sobraron ${mmss(J.tiempo)}.</p>`}
    ${mal.length ? `<div class="rcsol"><b>Soluciones:</b>${mal.map(x => `<div class="${x.estado === 2 ? 'mal' : ''}"><i>${x.L}</i><b>${esc(x.resp[0])}</b>${x.estado === 2 && x.dada ? `<small>tú: ${esc(x.dada)}</small>` : x.estado === 0 ? '<small>sin contestar</small>' : ''}</div>`).join('')}</div>` : ''}
    <div class="bar" style="justify-content:center"><button class="btn on" data-ac="otra">🔁 Otro rosco</button><button class="btn" data-ac="setup">Cambiar opciones</button></div></div>`;
}
function cierre() {
  parar(); if (tk) tk.cerrar(); if (!S) return;
  if (!reg) {
    reg = true; const a = R.aciertos(S.jug[0]); marcador.mejor = Math.max(marcador.mejor, a);
    if (S.modo === 'cpu') {
      const r = S.ganador === 0 ? 'victoria' : S.ganador === -2 ? 'empate' : 'derrota'; marcador[r === 'victoria' ? 'g' : r === 'empate' ? 'e' : 'p']++;
      api.registrar({ res: r, variante: `Duelo · ${R.NIVEL[S.nivel]}` }); api.sonido(r === 'victoria' ? 'ganar' : r === 'empate' ? 'ok' : 'perder');
    } else { api.registrar({ res: a >= 13 ? 'victoria' : 'partida', variante: `Contrarreloj · ${R.NIVEL[S.nivel]} · ${a} aciertos` }); api.sonido(a >= 20 ? 'ganar' : 'ok'); }
    if (a === 25) api.vibrar([60, 40, 60, 40, 120]);
  }
  pintar(); guardar();
}

/* ---------- entrada ---------- */
function clic(e) {
  const b = e.target.closest('button,[data-ac]'); if (!b) return; const d = b.dataset;
  if (d.cfg) { cfg[d.cfg] = d.cfg === 'tiempo' ? +d.v : d.v; return setup(); }
  const a = d.ac;
  if (a === 'start') empezar(); else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas(); else if (a === 'nueva') nuevaSetup();
  else if (a === 'setup') { api.borrar(); setup(); } else if (a === 'otra') { api.borrar(); empezar(); }
  else if (a === 'teclado') { if (miTurno()) tk.abrir(); }
  else if (a === 'responder') responder(); else if (a === 'pasa') pasa(); else if (a === 'plantarse') plantarse();
}
function reglas() {
  api.modal('El Rosco', `<ul><li>Hay una definición por cada letra del abecedario (sin K ni W). Fíjate si la palabra <b>empieza por</b> esa letra o la <b>contiene</b>.</li>
    <li>Escribe la respuesta con el <b>teclado emergente</b> (toca la casilla de respuesta o ⌨️; puedes arrastrarlo y cerrarlo con ✕) y pulsa ✔. Las tildes no importan.</li>
    <li>Si no la sabes, di <b>⏩ Pasapalabra</b>: volverás a esa letra en la siguiente vuelta.</li>
    <li>El reloj solo corre en tu turno y se para si sales de la app. Con el teclado del ordenador: Intro responde, Tab es pasapalabra.</li>
    <li><b>Duelo contra la CPU</b>: cada uno tiene su rosco y su reloj. Mientras aciertes sigues; si fallas o dices pasapalabra, le toca al rival. Gana quien más acierte (a igualdad, quien menos falle).</li>
    <li>Al terminar verás las soluciones de las letras que fallaste o no contestaste.</li></ul>`);
}
