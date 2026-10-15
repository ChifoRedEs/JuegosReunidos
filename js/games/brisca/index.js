import { $, esc } from '../../core/dom.js';
import { cartaEsHTML, asegurarSprites, PALOS_ES } from '../../core/cartas.js';
import { grupoMesa, grupoDorso, grupoBarajaEs } from '../../core/aspectos.js';
import * as B from './motor.js';
import { elegir } from './ia.js';

const NIVEL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
let S = null, api = null, asp = null, root = null, timer = null, cfg = { n: 2, nivel: 'medio', cambio: false }, marcador = { g: 0, p: 0, e: 0 }, reg = false, prevMesa = 0;

/* ---------- validación / resumen ---------- */
export function validar(d) {
  const s = d && B.validar(d.s); if (!s) return null;
  const m = d.marcador && typeof d.marcador === 'object' ? d.marcador : {}, e = (v) => (Number.isInteger(v) && v >= 0 && v <= 99999 ? v : 0);
  return { s, marcador: { g: e(m.g), p: e(m.p), e: e(m.e) }, reg: !!d.reg };
}
export const migrarV1 = d => d;
export function resumen(d) {
  const s = d.s, tipo = s.n === 4 ? 'Parejas' : `${s.n} jugadores`;
  if (s.fase === 'fin') return { texto: `${tipo} · ${s.resultado.humano === 'gana' ? '¡Ganaste!' : s.resultado.humano === 'empate' ? 'Empate' : 'Perdiste'}`, fin: true };
  return { texto: `${tipo} · ${NIVEL[s.nivel]} · baza ${s.ronda + 1}`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; prevMesa = 0; asegurarSprites();
  asp = api.aspecto([grupoMesa(), grupoDorso(), grupoBarajaEs()]);
  await api.css(new URL('../../../css/cartas.css', import.meta.url)); await api.css(new URL('./brisca.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && [2, 3, 4].includes(c0.n) && NIVEL[c0.nivel]) cfg = { n: c0.n, nivel: c0.nivel, cambio: !!c0.cambio };
  const g = api.cargar();
  if (g) { S = g.s; marcador = g.marcador; reg = g.reg; } else S = null;
  root.addEventListener('click', clic);
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  if (S) { armar(); prevMesa = S.mesa.length; pintar(); bucle(); } else setup();
}
export function unmount() { clearTimeout(timer); if (root) root.removeEventListener('click', clic); S = null; asp = null; }
function guardar() { if (!S) return; const d = { s: S, marcador, reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- pantallas ---------- */
function setup() {
  S = null; clearTimeout(timer);
  root.innerHTML = `<p class="note">Brisca con baraja española. Gana quien suma más puntos (el total de la baraja son 120): con 2 jugadores se necesitan más de 60; en parejas, la pareja que más sume.</p>
    <div class="bar"><span class="lbl">Jugadores</span><div class="seg"><button class="btn ${cfg.n === 2 ? 'on' : ''}" data-n="2">2 · tú vs CPU</button><button class="btn ${cfg.n === 3 ? 'on' : ''}" data-n="3">3 · cada uno por su cuenta</button><button class="btn ${cfg.n === 4 ? 'on' : ''}" data-n="4">4 · en parejas</button></div></div>
    <div class="bar"><span class="lbl">Nivel</span><div class="seg">${Object.entries(NIVEL).map(([k, l]) => `<button class="btn ${cfg.nivel === k ? 'on' : ''}" data-niv="${k}">${l}</button>`).join('')}</div></div>
    <label class="chk"><input type="checkbox" id="brCambio" ${cfg.cambio ? 'checked' : ''}><span><b>Cambiar el 7 del triunfo</b>: cuando salgas tú, puedes cambiar tu 7 de triunfo por la carta de triunfo que se ve en el mazo.</span></label>
    <p class="note">${cfg.n === 4 ? 'Juegas con el compañero de enfrente (CPU) contra los otros dos. ' : ''}${cfg.n === 3 ? 'Con 3 jugadores se retira el 2 de oros. ' : ''}Marcador: ${marcador.g} ganadas · ${marcador.p} perdidas · ${marcador.e} empates.</p>
    <div class="bar"><button class="btn on" data-ac="start">Repartir</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>`;
  root.querySelector('#brCambio').addEventListener('change', e => { cfg.cambio = e.target.checked; });
}
function armar() {
  root.innerHTML = `<div class="brtop"><span id="brInfo"></span><span class="brtri" id="brTri"></span></div>
    <div class="mesa brm"><div class="bropps" id="brOpps"></div>
      <div class="brcentro"><div id="brMazo"></div><div class="brbaza" id="brBaza"></div></div>
      <div class="brmsg" id="brMsg" role="status" aria-live="polite"></div><div class="brmano" id="brMano"></div></div>
    <div class="bar" id="brAcc"></div><div id="brFin"></div>`;
}
function nuevaSetup() { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la mano actual?')) return; clearTimeout(timer); api.borrar(); setup(); }
function empezar(lider = null) {
  api.setPref('cfg', cfg); S = B.nueva(cfg.n, cfg.nivel, cfg.cambio, lider); reg = false; prevMesa = 0; armar(); pintar(); guardar(); bucle();
}

/* ---------- pintado ---------- */
const nombres = n => (n === 2 ? ['Tú', 'CPU'] : n === 3 ? ['Tú', 'CPU 1', 'CPU 2'] : ['Tú', 'Rival 1', 'Compañero', 'Rival 2']);
function pintar() {
  if (!S || !$('#brOpps')) return;
  const nom = nombres(S.n), pts = B.puntosEquipo(S), yoE = B.equipoDe(S, 0), opp = [...Array(S.n).keys()].slice(1);
  $('#brOpps').style.setProperty('--no', opp.length);
  $('#brOpps').innerHTML = opp.map(j => `<div class="brseat ${S.turno === j ? 'turno' : ''}"><div class="nom">${nom[j]}</div>${S.n === 4 ? `<div class="eq">${B.equipoDe(S, j) === yoE ? 'tu pareja' : 'rivales'}</div>` : ''}<div class="cs">${S.manos[j].map(() => cartaEsHTML(0, { oculta: true })).join('')}</div><div class="pts">${S.ganadas[j].length} cartas</div></div>`).join('');
  const triSvg = `<svg viewBox="0 0 24 24"><use href="#es-${S.triunfo}"/></svg>`;
  $('#brTri').innerHTML = `${triSvg} Triunfo: ${PALOS_ES[S.triunfo]}`;
  $('#brMazo').innerHTML = S.mazo.length ? `<div class="brmazos"><div class="mz">${cartaEsHTML(0, { oculta: true })}<small>${S.mazo.length} en el mazo</small></div><div class="mz">${cartaEsHTML(S.triunfoCarta, {})}<small>Triunfo</small></div></div>` : '<div class="mz"><small>Mazo vacío<br>Triunfo: ' + PALOS_ES[S.triunfo] + '</small></div>';
  const mesa = S.mesa.length ? S.mesa : S.fase === 'jugando' ? [] : [];
  const ub = S.fase === 'baza' ? { mesa: S.mesa, ganador: B.ganadorMesa(S) } : null;
  $('#brBaza').innerHTML = (S.fase === 'baza' ? S.mesa : mesa).map((m, i) => `<div class="it ${ub && ub.ganador === m.j ? 'gana' : ''}">${cartaEsHTML(m.c, { clase: i >= prevMesa ? 'in' : '' })}${nom[m.j]}</div>`).join('') || (S.ultimaBaza && S.fase !== 'fin' ? `<div class="note" style="color:#fff;opacity:.8">Última baza: ${nom[S.ultimaBaza.ganador]} (+${S.ultimaBaza.puntos})</div>` : '');
  prevMesa = S.mesa.length;
  const turnoMio = S.fase === 'jugando' && S.turno === 0;
  $('#brMano').className = 'brmano' + (turnoMio ? ' turno' : '');
  $('#brMano').innerHTML = S.manos[0].map(c => `<div data-c="${c}" role="button" tabindex="0" aria-label="${(c / 10 | 0) === S.triunfo ? 'Triunfo, ' : ''}jugar carta">${cartaEsHTML(c, { clase: (c / 10 | 0) === S.triunfo ? 't' : '' })}</div>`).join('');
  $('#brInfo').textContent = S.n === 4 ? `Tu pareja: ${pts[yoE]} · rivales: ${pts[1 - yoE]}` : `Tus puntos: ${pts[0]}`;
  const m = $('#brMsg');
  if (S.fase === 'fin') m.textContent = S.resultado.humano === 'gana' ? '🏆 ¡Has ganado la mano!' : S.resultado.humano === 'empate' ? 'Empate' : 'Has perdido la mano';
  else if (S.fase === 'baza') m.textContent = `Gana la baza ${nom[B.ganadorMesa(S)]}`;
  else m.textContent = turnoMio ? 'Tu turno: toca una carta' : `Juega ${nom[S.turno]}…`;
  $('#brAcc').innerHTML = B.puedeCambiar(S, 0) ? '<button class="btn on" data-ac="cambiar">🔄 Cambiar el 7 del triunfo</button>' : '';
  $('#brFin').innerHTML = S.fase === 'fin' ? `<div class="brres"><table>${nom.map((n, j) => ({ n, j })).filter(x => S.n !== 4 || x.j < 2).map(({ j }) => `<tr><td>${S.n === 4 ? (j === 0 ? 'Tu pareja (tú y compañero)' : 'Rivales') : nom[j]}</td><td>${S.resultado.puntos[S.n === 4 ? (j === 0 ? B.equipoDe(S, 0) : 1 - B.equipoDe(S, 0)) : j]} puntos</td></tr>`).join('')}</table></div><div class="bar" style="justify-content:center"><button class="btn on" data-ac="otra">Otra mano</button><button class="btn" data-ac="setup">Cambiar ajustes</button></div>` : '';
}

/* ---------- flujo ---------- */
function bucle() {
  clearTimeout(timer); if (!S) return;
  if (S.fase === 'fin') return cierre();
  if (S.fase === 'baza') { timer = setTimeout(() => { if (!S) return; B.cerrarBaza(S); api.sonido('ok'); pintar(); guardar(); bucle(); }, 1300); return; }
  if (S.turno !== 0) timer = setTimeout(() => { if (!S || S.fase !== 'jugando' || S.turno === 0) return; const j = S.turno, c = elegir(S, j, S.nivel); B.jugar(S, j, c); api.sonido('mover'); pintar(); guardar(); bucle(); }, 650 + Math.random() * 350);
}
function cierre() {
  if (!reg) {
    reg = true; const r = S.resultado.humano; if (r === 'gana') marcador.g++; else if (r === 'pierde') marcador.p++; else marcador.e++;
    api.registrar({ res: r === 'gana' ? 'victoria' : r === 'pierde' ? 'derrota' : 'tablas', variante: `${S.n === 4 ? 'Parejas' : S.n + ' jugadores'} · ${NIVEL[S.nivel]}` });
    api.sonido(r === 'gana' ? 'ganar' : r === 'pierde' ? 'perder' : 'ok'); if (r === 'gana') api.vibrar([60, 40, 60]);
  }
  pintar(); guardar();
}
function jugarMia(c) { if (!S || S.fase !== 'jugando' || S.turno !== 0) return; if (B.jugar(S, 0, c)) { api.sonido('mover'); pintar(); guardar(); bucle(); } }
function clic(e) {
  const carta = e.target.closest('#brMano [data-c]'); if (carta) return jugarMia(+carta.dataset.c);
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.n) { cfg.n = +d.n; return setup(); } if (d.niv) { cfg.nivel = d.niv; return setup(); }
  const a = d.ac;
  if (a === 'start') empezar(); else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas();
  else if (a === 'cambiar') { if (B.cambiar(S, 0)) { api.sonido('ok'); pintar(); guardar(); } }
  else if (a === 'otra') { const l = (S.lider + 1) % S.n; empezar(l); } else if (a === 'setup') { api.borrar(); setup(); }
}
function reglas() {
  api.modal('Brisca', `<ul><li>Se juega con la baraja española de 40 cartas. Cada jugador tiene 3 cartas; la carta que se ve bajo el mazo marca el <b>triunfo</b> (el palo más fuerte).</li>
    <li>En cada baza todos juegan una carta. <b>No hay obligación de servir ni de matar</b>. Gana la baza el triunfo más alto; si no hay triunfos, la carta más alta del palo con el que se salió. El ganador se lleva las cartas, roba primero y sale en la siguiente.</li>
    <li>Orden de las cartas: <b>As, 3, Rey, Caballo, Sota, 7, 6, 5, 4, 2</b>. Valen: As 11, 3 → 10, Rey 4, Caballo 3, Sota 2; el resto, 0. Hay 120 puntos en total.</li>
    <li>Con <b>2</b> jugadores gana quien pase de 60 (60 es empate). Con <b>3</b> se retira el 2 de oros y gana quien más puntos tenga. Con <b>4</b> juegas en pareja con el jugador de enfrente.</li>
    <li>Opcional: <b>cambiar el 7 del triunfo</b> por la carta visible cuando salgas tú y aún queden cartas en el mazo.</li>
    <li>Niveles: Fácil comete errores, Medio juega como un jugador de experiencia y Difícil simula el resto de la partida con las cartas que aún no se han visto.</li></ul>`);
}
