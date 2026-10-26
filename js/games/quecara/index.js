import { $, esc } from '../../core/dom.js';
import * as M from './motor.js';
import { svgDe } from './avatar.js';
import { GRUPOS_PREGUNTAS, disponibles } from './preguntas.js';
import { grupoFondo, grupoDorso } from '../../core/aspectos.js';
import { BARAJAS, cargarBarajas, urlDorso } from '../../core/cartas.js';

let S = null, api = null, asp = null, root = null, timer = 0, reg = false, onKey = null;
let cfg = { ...M.CFG_DEF }, sel = -1, arriesgando = false, pensando = false, grupoSel = 'persona';

const MARCOS = {
  blanco: { nombre: 'Blanco', sw: ['#FFFFFF'] }, crema: { nombre: 'Crema', sw: ['#FFF3D6'] }, azul: { nombre: 'Azul', sw: ['#DCE8FF'] },
  verde: { nombre: 'Verde', sw: ['#DDF5E4'] }, rosa: { nombre: 'Rosa', sw: ['#FFE0EE'] }, oscuro: { nombre: 'Oscuro', sw: ['#2B2F44'] },
};
const COLUMNAS = { 12: 4, 20: 5, 24: 4, 30: 5 };

/* ---------- validación / resumen ---------- */
export function validar(d) { const s = d && M.validar(d.s); return s ? { s, reg: !!d.reg } : null; }
export const migrarV1 = d => d;
export const resumen = d => M.resumen(d.s);

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; sel = -1; arriesgando = false; pensando = false;
  try { await cargarBarajas(); } catch { /* sin dorsos de imagen: se usa el dorso dibujado */ }
  asp = api.aspecto([
    grupoFondo('#qcTab'),
    grupoDorso(),
    { clave: 'marco', titulo: 'Color de las cartas', icono: '🎴', def: 'blanco', opciones: Object.entries(MARCOS).map(([id, m]) => ({ id, nombre: m.nombre, sw: m.sw })) },
    { clave: 'nombres', titulo: 'Nombre bajo la cara', icono: '🔤', def: 'si', opciones: [{ id: 'si', nombre: 'Mostrar' }, { id: 'no', nombre: 'Ocultar' }] },
  ], () => aplicarAspecto());
  await api.css(new URL('./quecara.css', import.meta.url));
  const c0 = M.cfgValida(api.pref('cfg', null)); if (c0) cfg = c0;
  const g = api.cargar();
  if (g) { S = g.s; reg = g.reg; } else S = null;
  root.addEventListener('click', clic); onKey = teclado; document.addEventListener('keydown', onKey);
  api.barra({
    nueva: () => { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; empezar(); },
    salir: () => { parar(); api.borrar(); location.hash = '#/cat/tablero'; },
    pausar: () => { clearTimeout(timer); pensando = false; },
    reanudar: () => bucle(),
    config: {
      valores: () => ({ ...cfg }),
      grupos: v => [
        { clave: 'modo', titulo: 'Modo', opciones: Object.entries(M.MODOS) },
        { clave: 'nivel', titulo: 'Nivel de la CPU', visible: v.modo === 'cpu', opciones: Object.entries(M.NIVEL) },
        { clave: 'n', titulo: 'Caras en el tablero', opciones: Object.entries(M.TAMANOS).map(([k, l]) => [Number(k), l]) },
        { clave: 'conjunto', titulo: 'Caras', opciones: Object.entries(M.CONJUNTOS) },
        { clave: 'fallo', titulo: 'Si fallas al arriesgar', opciones: Object.entries(M.FALLO) },
        { clave: 'tumbar', titulo: 'Tumbar las caras', opciones: Object.entries(M.TUMBAR) },
        { clave: 'empieza', titulo: 'Empieza', opciones: Object.entries(M.empiezaTexto(v.modo)) },
      ],
      aplicar: v => { cfg = M.cfgValida(v) || cfg; empezar(); },
    },
  });
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  if (S) { armar(); pintar(); bucle(); } else setup();
}
export function unmount() { clearTimeout(timer); document.removeEventListener('keydown', onKey); if (root) root.removeEventListener('click', clic); S = null; asp = null; root = null; }
function guardar() { if (!S) return; const d = { s: S, reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }
function parar() { clearTimeout(timer); pensando = false; }
const nom = () => M.nombres(S);

/* ---------- pantalla de inicio ---------- */
function setup() {
  S = null; parar(); sel = -1; arriesgando = false;
  const seg = (k, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${String(cfg[k]) === String(v) ? 'on' : ''}" data-cfg="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  root.innerHTML = `<p class="note">Cada jugador elige en secreto una cara del tablero. Por turnos, preguntad por un rasgo («¿lleva gafas?») y tumbad las caras que ya no pueden ser. ¡Gana quien adivine primero la cara del rival!</p>
    <div class="bar"><span class="lbl">Modo</span>${seg('modo', Object.entries(M.MODOS))}</div>
    ${cfg.modo === 'cpu' ? `<div class="bar"><span class="lbl">Nivel de la CPU</span>${seg('nivel', Object.entries(M.NIVEL))}</div>` : ''}
    <div class="bar"><span class="lbl">Caras en el tablero</span>${seg('n', Object.entries(M.TAMANOS))}</div>
    <div class="bar"><span class="lbl">Caras</span>${seg('conjunto', Object.entries(M.CONJUNTOS))}</div>
    <div class="bar"><span class="lbl">Si fallas al arriesgar</span>${seg('fallo', Object.entries(M.FALLO))}</div>
    <div class="bar"><span class="lbl">Tumbar las caras</span>${seg('tumbar', Object.entries(M.TUMBAR))}</div>
    <div class="bar"><span class="lbl">Empieza</span>${seg('empieza', Object.entries(M.empiezaTexto(cfg.modo)))}</div>
    <p class="note">${cfg.modo === 'dos' ? 'Dos jugadores en este dispositivo: entre turnos aparece una pantalla para pasar el móvil sin ver el tablero del otro. ' : ''}${cfg.conjunto === 'azar' ? 'Cada partida estrena caras nuevas, generadas al azar.' : 'Las 30 caras clásicas del juego (con menos caras se eligen al azar entre ellas).'}</p>
    <div class="bar"><button class="btn on" data-ac="start">▶️ Empezar</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>`;
}
function nuevaSetup() { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; parar(); api.borrar(); setup(); }
function empezar() {
  parar(); api.setPref('cfg', cfg);
  S = M.crear(cfg); reg = false; sel = -1; arriesgando = false;
  armar(); pintar(); guardar(); bucle();
}

/* ---------- tablero ---------- */
function armar() {
  const cols = COLUMNAS[S.n] || 5;
  root.innerHTML = `<div class="qcmsg" id="qcMsg" role="status" aria-live="polite"></div>
    <div class="qctab" id="qcTab" style="--c:${cols}" role="group" aria-label="Tablero de caras">${S.caras.map((f, i) =>
      `<button type="button" class="qcc" data-i="${i}"><span class="qci"><span class="qcfront">${svgDe(f)}<b>${esc(f.nm)}</b></span><span class="qcback"><i>?</i></span></span></button>`).join('')}</div>
    <div class="qcpanel" id="qcPanel"></div>
    <ul class="qclog" id="qclog" aria-label="Preguntas hechas"></ul>
    ${api.barraHtml()}`;
  aplicarAspecto();
}
function aplicarAspecto() {
  const tab = $('#qcTab'); if (!tab || !asp) return;
  const d = BARAJAS.dorsos.find(x => x.id === asp.valores.dorso);
  if (d) tab.style.setProperty('--dorso', `url("${urlDorso(d)}")`); else tab.style.removeProperty('--dorso');
  tab.classList.toggle('con-dorso', !!d);
}
const miniCara = i => `<div class="qcmini">${svgDe(S.caras[i])}</div>`;
const quienDijo = p => (S.modo === 'cpu' ? (p === 0 ? 'Tú' : 'La CPU') : nom()[p]);

function banner(p) {
  const u = S.ult; if (!u) return '';
  if (u.g) return `<div class="qcres">${esc(quienDijo(u.p))} arriesgó con <b>${esc(u.g)}</b>… <b class="${u.ok ? 'si' : 'no'}">${u.ok ? '¡acertó!' : 'falló'}</b></div>`;
  const quien = S.modo === 'cpu' ? (u.p === 0 ? 'Tu pregunta' : 'La CPU te preguntó') : (u.p === p ? 'Tu pregunta' : `${nom()[u.p]} te preguntó`);
  return `<div class="qcres">${quien}: «${esc(u.q)}»<div class="gr"><b class="${u.r ? 'si' : 'no'}">${u.r ? '✅ SÍ' : '❌ NO'}</b></div></div>`;
}
function pintar() {
  if (!S || !root) return;
  const msg = $('#qcMsg'), panel = $('#qcPanel'), tab = $('#qcTab'); if (!msg || !panel || !tab) return;
  const p = S.modo === 'cpu' ? 0 : S.turno, n = nom();
  const humano = S.modo === 'dos' || S.turno === 0;
  const cartas = tab.querySelectorAll('.qcc');
  tab.hidden = S.fase === 'paso';
  cartas.forEach((b, i) => {
    const tum = S.fase === 'turno' || S.fase === 'fin' ? !!S.tumba[p][i] : false;
    b.classList.toggle('down', tum); b.classList.toggle('sel', S.fase === 'elegir' && i === sel);
    b.classList.toggle('sec', S.fase === 'fin' && (i === S.secreto[0] || i === S.secreto[1]));
    b.setAttribute('aria-label', `${S.caras[i].nm}${tum ? ', tumbada' : ''}${S.fase === 'elegir' && i === sel ? ', elegida' : ''}`);
    b.setAttribute('aria-pressed', tum ? 'true' : 'false');
  });
  tab.classList.toggle('arriesgando', arriesgando && S.fase === 'turno');
  if (S.fase === 'paso') {
    msg.textContent = '';
    const dest = n[S.turno], aElegir = S.sig === 'elegir';
    panel.innerHTML = `<div class="qcpaso"><h3>🔄 Pasa el móvil</h3><p>Ahora le toca a <b>${esc(dest)}</b>${aElegir ? ': elegirá su personaje secreto' : ''}. ${aElegir ? 'El otro jugador no debe mirar.' : ''}</p><button class="btn on" data-ac="seguir">Soy ${esc(dest)}</button></div>`;
  } else if (S.fase === 'elegir') {
    const q = S.modo === 'cpu' ? 'Toca la cara que será tu personaje secreto.' : `${n[S.turno]}: toca la cara que será tu personaje secreto.`;
    msg.textContent = q;
    panel.innerHTML = `${sel >= 0 ? `<div class="qcsec">${miniCara(sel)}<div><small>Has elegido a</small><b>${esc(S.caras[sel].nm)}</b></div></div>` : ''}<div class="bar"><button class="btn on" data-ac="elegir" ${sel < 0 ? 'disabled' : ''}>✅ Este es mi personaje</button></div>`;
  } else if (S.fase === 'turno') {
    const sec = S.secreto[p];
    const cabecera = `<div class="qcsec">${miniCara(sec)}<div><small>${S.modo === 'cpu' ? 'Tu personaje secreto' : `Personaje secreto de ${esc(n[p])}`}</small><b>${esc(S.caras[sec].nm)}</b></div><div class="qcque"><small>Quedan</small><b>${M.quedan(S, p)}</b></div></div>`;
    if (!humano) {
      msg.textContent = pensando ? '🤖 La CPU está pensando…' : 'Turno de la CPU.';
      panel.innerHTML = cabecera + (pensando ? '' : banner(p));
    } else {
      msg.textContent = S.pregunto ? 'Tumba las caras que ya no pueden ser y termina el turno.' : arriesgando ? '🎯 Toca la cara que crees que es.' : (S.modo === 'cpu' ? 'Tu turno: pregunta o arriesga.' : `Turno de ${n[S.turno]}: pregunta o arriesga.`);
      panel.innerHTML = `${cabecera}${banner(p)}<div class="bar qcbar" style="--n:${S.pregunto && S.tumbar === 'mano' ? 4 : 3}">
        <button class="btn on" data-ac="preguntar" ${S.pregunto ? 'disabled' : ''}>❓ Preguntar</button>
        <button class="btn ${arriesgando ? 'on' : ''}" data-ac="arriesgar" ${S.pregunto ? 'disabled' : ''}>${arriesgando ? '✖ Cancelar' : '🎯 Arriesgar'}</button>
        ${S.pregunto && S.tumbar === 'mano' ? '<button class="btn" data-ac="auto">🪄 Tumbar por mí</button>' : ''}
        <button class="btn ${S.pregunto ? 'on' : ''}" data-ac="terminar" ${S.pregunto ? '' : 'disabled'}>✅ Pasar turno</button></div>`;
    }
  } else {
    msg.innerHTML = `<b>${S.modo === 'cpu' ? (S.ganador === 0 ? '🏆 ¡Has ganado!' : '😔 Ha ganado la CPU') : `🏆 ¡Gana ${esc(n[S.ganador])}!`}</b>`;
    panel.innerHTML = `${banner(S.modo === 'cpu' ? 0 : S.ganador)}<div class="qcreveal"><div class="qcsec">${miniCara(S.secreto[0])}<div><small>${esc(S.modo === 'cpu' ? 'Tu personaje' : `Personaje de ${n[0]}`)}</small><b>${esc(S.caras[S.secreto[0]].nm)}</b></div></div>
      <div class="qcsec">${miniCara(S.secreto[1])}<div><small>${esc(S.modo === 'cpu' ? 'Personaje de la CPU' : `Personaje de ${n[1]}`)}</small><b>${esc(S.caras[S.secreto[1]].nm)}</b></div></div></div>
      <div class="bar"><button class="btn on" data-ac="nueva">🔁 Otra partida</button></div>`;
  }
  const lg = $('#qclog');
  if (lg) lg.innerHTML = S.hist.slice(-8).reverse().map(h => `<li><b>${esc(quienDijo(h.p))}:</b> ${h.g ? `arriesgó con ${esc(h.g)} — ${h.ok ? '¡acertó!' : 'falló'}` : `${esc(h.q)} — <b class="${h.r ? 'si' : 'no'}">${h.r ? 'Sí' : 'No'}</b>`}</li>`).join('');
}

/* ---------- acciones ---------- */
function bucle() {
  clearTimeout(timer); pensando = false;
  if (!S) return;
  if (S.fase === 'fin') { finPartida(); pintar(); return; }
  if (S.fase !== 'turno' || S.modo !== 'cpu' || S.turno !== 1) return;
  pensando = true; pintar();
  timer = setTimeout(() => {
    pensando = false; if (!S) return;
    const r = M.turnoCpu(S); guardar();
    if (r && r.tipo === 'pregunta') api.sonido(r.r ? 'ok' : 'click');
    if (S.fase === 'fin') finPartida();
    pintar();
  }, 1300);
}
function finPartida() {
  if (!S || S.fase !== 'fin') return;
  if (!reg) {
    reg = true; guardar();
    const r = S.modo === 'cpu' ? (S.ganador === 0 ? 'victoria' : 'derrota') : 'partida';
    api.registrar({ res: r, variante: S.modo === 'cpu' ? S.nivel : 'dos' });
    api.sonido(S.modo === 'cpu' && S.ganador === 1 ? 'perder' : 'ganar');
  }
}
function turnoActual() { return S.modo === 'cpu' ? 0 : S.turno; }
function clic(e) {
  const cfgB = e.target.closest('[data-cfg]');
  if (cfgB && !S) { cfg[cfgB.dataset.cfg] = cfgB.dataset.cfg === 'n' ? Number(cfgB.dataset.v) : cfgB.dataset.v; setup(); return; }
  const ac = e.target.closest('[data-ac]');
  if (ac) {
    const a = ac.dataset.ac;
    if (a === 'start') return empezar();
    if (a === 'aspecto') return asp.abrir();
    if (a === 'reglas') return reglas();
    if (!S) return;
    if (a === 'nueva') return nuevaSetup();
    if (a === 'seguir') { if (M.continuar(S)) { guardar(); pintar(); bucle(); } return; }
    if (a === 'elegir') {
      if (sel < 0 || !M.elegirSecreto(S, S.turno, sel)) return;
      sel = -1; api.sonido('ok'); guardar(); pintar(); bucle(); return;
    }
    if (S.fase !== 'turno') return;
    const p = turnoActual();
    if (a === 'preguntar') return abrirPreguntas();
    if (a === 'arriesgar') { arriesgando = !arriesgando; pintar(); return; }
    if (a === 'terminar') { if (M.terminar(S, p)) { arriesgando = false; api.sonido('click'); guardar(); pintar(); bucle(); } return; }
    if (a === 'auto') { if (M.tumbarSegunUltima(S, p)) { api.sonido('click'); guardar(); pintar(); } return; }
    return;
  }
  const c = e.target.closest('.qcc'); if (!c || !S) return;
  const i = Number(c.dataset.i);
  if (S.fase === 'elegir') { sel = i; api.sonido('click'); pintar(); return; }
  if (S.fase !== 'turno' || (S.modo === 'cpu' && S.turno !== 0)) return;
  if (arriesgando) return confirmarArriesgo(i);
  if (M.alternar(S, turnoActual(), i)) { api.sonido('click'); guardar(); pintar(); }
}
function teclado(e) {
  if (!S || S.fase !== 'turno' || document.querySelector('.modal')) return;
  if (e.key === 'p' || e.key === 'P') { if (!S.pregunto && (S.modo === 'dos' || S.turno === 0)) abrirPreguntas(); }
}

function abrirPreguntas() {
  if (!S || S.fase !== 'turno' || S.pregunto) return;
  const disp = disponibles(S.caras), p = turnoActual();
  const grupos = GRUPOS_PREGUNTAS.filter(([g]) => disp.some(q => q.grupo === g));
  if (!grupos.some(([g]) => g === grupoSel)) grupoSel = grupos[0][0];
  const m = api.modal('❓ ¿Qué quieres preguntar?', '');
  const pintaLista = () => {
    m.cuerpo.innerHTML = `<p class="note">Se responde con sí o no sobre el personaje secreto de ${S.modo === 'cpu' ? 'la CPU' : esc(nom()[1 - p])}.</p>
      <div class="seg qctabs">${grupos.map(([g, l]) => `<button type="button" class="btn ${g === grupoSel ? 'on' : ''}" data-g="${g}">${l}</button>`).join('')}</div>
      <div class="qclista">${disp.filter(q => q.grupo === grupoSel).map(q => `<button type="button" class="btn" data-q="${q.id}">${esc(q.texto)}</button>`).join('')}</div>`;
  };
  pintaLista();
  m.cuerpo.addEventListener('click', e => {
    const g = e.target.closest('[data-g]'); if (g) { grupoSel = g.dataset.g; pintaLista(); return; }
    const q = e.target.closest('[data-q]'); if (!q) return;
    m.cerrar();
    if (!S || S.fase !== 'turno' || S.pregunto) return;
    const r = M.preguntar(S, p, q.dataset.q);
    if (r === null) return;
    api.sonido(r ? 'ok' : 'click'); guardar(); pintar();
  });
}
function confirmarArriesgo(i) {
  const f = S.caras[i], p = turnoActual();
  const m = api.modal('🎯 ¿Es esta la cara?', `<div class="qcgrande">${svgDe(f)}</div><p class="qcnombre"><b>${esc(f.nm)}</b></p>
    <p class="note">${S.fallo === 'pierde' ? 'Si fallas, pierdes la partida.' : 'Si fallas, pierdes el turno.'}</p>
    <div class="bar"><button class="btn on" data-q="si">Sí, arriesgo con ${esc(f.nm)}</button></div>`);
  m.cuerpo.addEventListener('click', e => {
    if (!e.target.closest('[data-q]')) return;
    m.cerrar(); arriesgando = false;
    if (!S || S.fase !== 'turno') return;
    const r = M.arriesgar(S, p, i); if (!r) return;
    api.sonido(r.ok ? 'ok' : 'error'); guardar();
    if (r.fin) finPartida();
    pintar(); bucle();
  });
}

/* ---------- reglas ---------- */
function reglas() {
  api.modal('¿Qué cara tienes? · Reglas', `<ul>
    <li><b>Objetivo</b>: adivinar antes que el rival cuál es su personaje secreto.</li>
    <li><b>Preparación</b>: los dos veis el mismo tablero de caras. Cada jugador elige en secreto una. Con 2 jugadores aparece una pantalla para pasar el móvil sin que se vea el tablero del otro.</li>
    <li><b>En tu turno</b> haces <b>una</b> de estas dos cosas: <b>❓ preguntar</b> por un rasgo (¿es una chica? ¿lleva gafas? ¿tiene barba? ¿lleva sombrero?…) o <b>🎯 arriesgar</b> diciendo quién crees que es.</li>
    <li>La respuesta es <b>sí o no</b> y la da la propia aplicación, así que nadie puede equivocarse ni hacer trampa.</li>
    <li>Con la respuesta, <b>tumba</b> las caras que ya no pueden ser (tócalas para tumbarlas o levantarlas). Si prefieres, pulsa «🪄 Tumbar por mí» o activa el tumbado <b>automático</b> en la configuración. Después, termina el turno.</li>
    <li><b>Arriesgar</b>: si aciertas, <b>ganas</b>. Si fallas, según la regla elegida, <b>pierdes la partida</b> (como en el juego original) o <b>solo el turno</b>.</li>
    <li><b>Rasgos que se pueden preguntar</b>: persona, color y tipo de pelo, sombreros y gorros, lazo o diadema, color de ojos, sombra de ojos, gafas, barba, bigote, perilla, pecas, pendientes, sonrisa, tono de piel y color de la ropa. Los sombreros tapan el pelo: quien lleva uno no tiene «pelo de color» a la vista.</li>
    <li><b>Contra la CPU</b>: Fácil (pregunta casi al azar), Medio (hace buenas preguntas) y Difícil (siempre la que mejor divide las caras que le quedan).</li>
    <li>Tableros de 12, 20, 24 (el clásico) o 30 caras, con las 30 caras por defecto o caras nuevas al azar cada partida.</li>
    <li>Dibujos de las caras: <b>Vue Color Avatar</b>, de LeoKu (licencia MIT, github.com/Codennnn/vue-color-avatar). Las piezas de bigote, perilla, barba, gafas de sol, pecas, pelo rizado, entradas, gorra, sombrero de ala y de copa, lazo y diadema son nuevas, dibujadas para este juego en el mismo estilo.</li>
  </ul>`);
}
