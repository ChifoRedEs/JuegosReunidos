// Póker cubierto (de descarte, 5 cartas) contra bots: torneo o partida libre, apertura libre o con jotas o mejor.
import { $, esc } from '../../core/dom.js';
import { cartaHTML } from '../../core/cartas.js';
import { grupoMesa, grupoDorso, grupoBarajaFr } from '../../core/aspectos.js';
import * as P from './motor.js';

const NIVEL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
let S = null, api = null, asp = null, root = null, timer = null, consejo = true, subir = 0, marcadas = new Set();
let V3 = null, hay3d = false, modo3d = false, forzar2d = false, tok3 = 0;
const quiere3D = () => hay3d && !forzar2d && !!asp && (asp.valores.vista || '3d') === '3d';
let cfg = { bots: 3, nivel: 'medio', modo: 'torneo', ante: 'baja', apertura: 'libre' };

// Estadísticas de tus manos (acumuladas en las preferencias)
const EST0 = { manos: 0, vpip: 0, ganadas: 0, showdowns: 0, showGanados: 0, mayorBote: 0, servidas: 0, mejor: 0, mejorTxt: '' };
const est = () => ({ ...EST0, ...(api.pref('estad', {}) || {}) });
function contarMano() {
  if (!S || S.fase !== 'fin' || S.cuenta === S.mano) return;
  S.cuenta = S.mano;
  const E = est(), r = S.resultado, yo = S.jug[0];
  E.manos++; if (S.mio && S.mio.vpip) E.vpip++; if (yo.cambio === 0) E.servidas++;
  const g = r && r.ganadores.find(x => x.i === 0);
  if (g) { E.ganadas++; E.mayorBote = Math.max(E.mayorBote, g.monto); }
  if (r && r.showdown && !yo.fold) { E.showdowns++; if (g) E.showGanados++; const v = r.valores && r.valores[0]; if (Number.isFinite(v) && v > E.mejor) { E.mejor = v; E.mejorTxt = P.nombreMano(v); } }
  api.setPref('estad', E);
}
function verEstad() {
  const E = est(), pc = (a, b) => (b ? Math.round(a / b * 100) + ' %' : '–');
  const m = api.modal('📊 Tus estadísticas de Póker cubierto', E.manos ? `<table class="tabla">
    <tr><td>Manos jugadas</td><td>${E.manos}</td></tr>
    <tr><td>Manos en las que pones fichas</td><td>${pc(E.vpip, E.manos)}</td></tr>
    <tr><td>Manos ganadas</td><td>${E.ganadas} (${pc(E.ganadas, E.manos)})</td></tr>
    <tr><td>Enfrentamientos ganados</td><td>${E.showGanados} de ${E.showdowns} (${pc(E.showGanados, E.showdowns)})</td></tr>
    <tr><td>Veces servido (sin cambiar)</td><td>${E.servidas}</td></tr>
    <tr><td>Mayor bote ganado</td><td>🪙 ${E.mayorBote}</td></tr>
    <tr><td>Mejor mano enseñada</td><td>${esc(E.mejorTxt || '–')}</td></tr></table>
    <div class="bar"><button class="btn danger" data-borrarest>Borrar estadísticas</button></div>` : '<p>Juega unas manos y aquí verás tus estadísticas.</p>');
  const b = m && m.cuerpo.querySelector('[data-borrarest]');
  if (b) b.addEventListener('click', () => { if (api.confirmar('¿Borrar tus estadísticas de Póker cubierto?')) { api.setPref('estad', {}); m.cerrar(); api.aviso('Estadísticas borradas'); } });
}

/* ---------- validación / resumen ---------- */
export function validar(d) { return P.validar(d); }
export const migrarV1 = d => d;
export function resumen(d) {
  const yo = d.jug[0];
  if (d.modo === 'libre') { const n = P.neto(d); return { texto: `Partida libre · mano ${d.mano} · ${n >= 0 ? '+' : ''}${n} fichas`, fin: d.fase === 'terminado' }; }
  if (d.fase === 'terminado' || (d.fase === 'fin' && P.evaluarFin(d))) return { texto: `${yo.stack > 0 ? '¡Campeón!' : 'Eliminado'} · mano ${d.mano}`, fin: true };
  return { texto: `Mano ${d.mano} · ${yo.stack} fichas · ${d.jug.length - 1} bot${d.jug.length > 2 ? 's' : ''}`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; marcadas = new Set(); forzar2d = false; modo3d = false;
  try { hay3d = (await import('../../core/escena3d.js')).hayWebGL(); } catch { hay3d = false; }
  asp = api.aspecto([...(hay3d ? [{ clave: 'vista', titulo: 'Vista de la mesa', icono: '🧊', def: '3d', opciones: [{ id: '3d', nombre: '🧊 3D (Three.js)' }, { id: '2d', nombre: '🔲 2D clásica' }] }] : []), grupoMesa(), grupoDorso(), grupoBarajaFr()],
    () => { if (S && $('#pcMsg')) { if (modo3d !== quiere3D()) { armar(); pintar(); } else if (V3) { V3.recolor(); pintar(); } } });
  await api.css(new URL('../../../css/cartas.css', import.meta.url)); await api.css(new URL('./pokercub.css', import.meta.url));
  S = api.cargar(); consejo = api.pref('consejo', true);
  const c0 = api.pref('cfg', null);
  if (c0 && c0.bots >= 1 && c0.bots <= 5 && NIVEL[c0.nivel]) cfg = { bots: c0.bots, nivel: c0.nivel, modo: c0.modo === 'libre' ? 'libre' : 'torneo', ante: P.ANTE_LIBRE[c0.ante] ? c0.ante : 'baja', apertura: P.APERTURA[c0.apertura] ? c0.apertura : 'libre' };
  root.addEventListener('click', clic); root.addEventListener('input', alMover);
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '📊 Mis estadísticas', accion: verEstad },
    { texto: 'Mostrar consejos y probabilidades', accion: () => { consejo = !consejo; api.setPref('consejo', consejo); pintar(); }, activo: consejo },
    { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Ranking de manos', accion: ranking }, { texto: 'Reglas', accion: reglas }]);
  if (S) { armar(); pintar(); bucle(); } else setup();
}
export function unmount() { cerrar3D(); modo3d = false; clearTimeout(timer); if (root) { root.removeEventListener('click', clic); root.removeEventListener('input', alMover); } S = null; asp = null; }
function guardar() { if (!S) return; const r = resumen(S); api.guardar(S, r.texto, r.fin); }

/* ---------- pantallas ---------- */
function setup() {
  S = null; clearTimeout(timer);
  root.innerHTML = `<p class="note">Cada jugador recibe 5 cartas tapadas. Tras una ronda de apuestas puedes <b>cambiar hasta 3 cartas</b> (4 si te quedas con un as) y se apuesta otra vez. ${cfg.modo === 'libre' ? `Partida libre: entrada fija y sin eliminación (quien se arruina recompra ${P.STACK}).` : `Torneo: empiezas con ${P.STACK} fichas y la entrada sube cada ${P.MANOS_POR_NIVEL} manos.`}</p>
    <div class="bar"><span class="lbl">Modo</span><div class="seg"><button class="btn ${cfg.modo === 'torneo' ? 'on' : ''}" data-pmodo="torneo">🏆 Torneo</button><button class="btn ${cfg.modo === 'libre' ? 'on' : ''}" data-pmodo="libre">🃏 Partida libre</button></div></div>
    ${cfg.modo === 'libre' ? `<div class="bar"><span class="lbl">Entrada</span><div class="seg">${Object.entries(P.ANTE_LIBRE).map(([k, v]) => `<button class="btn ${cfg.ante === k ? 'on' : ''}" data-ante="${k}">${v} fichas</button>`).join('')}</div></div>` : ''}
    <div class="bar"><span class="lbl">Apertura</span><div class="seg">${Object.entries(P.APERTURA).map(([k, v]) => `<button class="btn ${cfg.apertura === k ? 'on' : ''}" data-apertura="${k}">${v}</button>`).join('')}</div></div>
    <div class="bar"><span class="lbl">Rivales</span><div class="seg">${[1, 2, 3, 4, 5].map(n => `<button class="btn ${cfg.bots === n ? 'on' : ''}" data-bots="${n}">${n}</button>`).join('')}</div></div>
    <div class="bar"><span class="lbl">Nivel</span><div class="seg">${Object.entries(NIVEL).map(([k, l]) => `<button class="btn ${cfg.nivel === k ? 'on' : ''}" data-niv="${k}">${l}</button>`).join('')}</div></div>
    <div class="bar"><button class="btn on" data-ac="start">${cfg.modo === 'libre' ? 'Sentarse a la mesa' : 'Empezar torneo'}</button><button class="btn" data-ac="estad">📊 Mis estadísticas</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="rank">Ranking de manos</button></div>
    <p class="note">${cfg.apertura === 'jotas' ? '<b>Jotas o mejor</b>: para hacer la primera apuesta hace falta al menos una pareja de jotas. Si nadie puede abrir, se reparte de nuevo y el bote se acumula. ' : ''}Cada bot tiene su estilo: conservador, equilibrado, agresivo o farolero.</p>`;
}
function armar() {
  cerrar3D(); modo3d = quiere3D();
  root.innerHTML = `${modo3d ? '<div class="e3d pk3" id="pcVista"></div><div class="pccentro hc3"><div class="pcbote" id="pcBote"></div><div class="pcmsg" id="pcMsg" role="status" aria-live="polite"></div></div>' : `<div class="mesa pcm"><div class="pcbots" id="pcBots"></div>
    <div class="pccentro"><div class="pcbote" id="pcBote"></div><div class="pcmsg" id="pcMsg" role="status" aria-live="polite"></div></div>
    <div class="pcyo" id="pcYo"></div></div>`}<div class="pcpanel" id="pcPanel"></div><ul class="pclog" id="pcLog"></ul>
    <div class="bar">${S.modo === 'libre' ? '<button class="btn" data-ac="levantarse">🚪 Levantarse de la mesa</button>' : ''}<button class="btn" data-ac="estad">📊</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="rank">Ranking</button><button class="btn" data-ac="nueva">Nueva partida</button></div>`;
  if (modo3d) iniciar3D();
}
function nuevaSetup() { if (S && S.modo === 'libre' && S.fase !== 'terminado') return levantarse(); if (S && S.fase !== 'terminado' && !api.confirmar('¿Abandonar el torneo actual?')) return; api.borrar(); setup(); }
function levantarse() {
  if (!S || S.modo !== 'libre') return;
  if (S.turno >= 0 && !api.confirmar('La mano sigue en juego: si te levantas, la pierdes. ¿Levantarte?')) return;
  const n = P.neto(S);
  if (!api.confirmar(`¿Levantarte de la mesa? Balance: ${n >= 0 ? '+' : ''}${n} fichas.`)) return;
  clearTimeout(timer);
  if (S.mano > 0 && !S.reg) { S.reg = true; api.registrar({ res: n > 0 ? 'victoria' : n < 0 ? 'derrota' : 'tablas', variante: `Partida libre · ${NIVEL[S.nivel]}` }); }
  S.fase = 'terminado'; S.turno = -1; guardar();
  api.modal('🚪 Te levantas de la mesa', `<p>Has jugado <b>${S.mano}</b> manos y terminas con <b>${n >= 0 ? '+' : ''}${n}</b> fichas.</p>`);
  setup();
}
function empezar() {
  asp.sortear();
  S = P.crear(cfg.bots, cfg.nivel, 'Tú', cfg.modo, cfg.ante, cfg.apertura); S.mio = { vpip: false }; api.setPref('cfg', cfg);
  armar(); P.nuevaMano(S); marcadas = new Set(); pintar(); guardar(); bucle();
}

/* ---------- pintado ---------- */
const enJuego = () => !['fin', 'terminado'].includes(S.fase);
const mostrarCartas = i => i === 0 || (S.resultado && S.resultado.showdown && !S.jug[i].fold);
function pintar() {
  if (!S || !$('#pcMsg')) return;
  const bots = S.jug.map((p, i) => i).slice(1), gan = new Set(S.resultado ? S.resultado.ganadores.map(g => g.i) : []);
  const yo = S.jug[0], descartando = S.fase === 'descarte' && S.turno === 0;
  if (!descartando) marcadas.clear();
  if (modo3d) { if (V3) pintar3D(bots, gan, descartando); } else pintar2D(bots, gan, descartando);
  pie(yo, descartando);
}
function pintar3D(bots, gan, descartando) {
  const yo = S.jug[0], dat = (i, esYo) => { const p = S.jug[i], ver = esYo || mostrarCartas(i); return { nombre: p.nombre, stack: p.stack, txt: p.fuera ? '' : (esYo ? [p.cartas.length && !p.fold ? P.nombreMano(P.valorMano(p.cartas)) : '', p.txt].filter(Boolean).join(' · ') : p.txt), sub: !esYo && S.resultado && S.resultado.showdown && !p.fold && !p.fuera && S.resultado.valores ? P.nombreMano(S.resultado.valores[i]) : '', fold: p.fold, fuera: p.fuera, turno: S.turno === i, gana: gan.has(i), apuesta: p.apuesta, boton: S.boton === i, cartas: p.cartas, ver, elige: esYo && descartando ? marcadas : null }; };
  V3.pintar({ bote: P.bote(S), tablero: [], nCartas: 5, mostrarTablero: false, bots: bots.map(i => dat(i, false)), yo: dat(0, true) });
}
function pintar2D(bots, gan, descartando) {
  const yo = S.jug[0];
  $('#pcBots').style.setProperty('--nb', Math.min(bots.length, 3));
  $('#pcBots').innerHTML = bots.map(i => {
    const p = S.jug[i], t = S.turno === i;
    return `<div class="seat ${t ? 'turno' : ''} ${p.fold ? 'fold' : ''} ${p.fuera ? 'fuera' : ''} ${gan.has(i) ? 'gana' : ''}">${S.boton === i && !p.fuera ? '<span class="bt">D</span>' : ''}<div class="nom">${esc(p.nombre)}</div><div class="stk">🪙 ${p.stack}</div>
      <div class="cs">${p.cartas.map(c => cartaHTML(c, { oculta: !mostrarCartas(i) })).join('')}</div>
      <div class="txt">${p.fuera ? 'Eliminado' : esc(p.txt)}${S.resultado && S.resultado.showdown && !p.fold && !p.fuera && S.resultado.valores ? `<small>${esc(P.nombreMano(S.resultado.valores[i]))}</small>` : ''}</div>${p.apuesta ? `<span class="ap">${p.apuesta}</span>` : ''}</div>`;
  }).join('');
  $('#pcYo').className = 'pcyo' + (S.turno === 0 ? ' turno' : '') + (yo.fold ? ' fold' : '') + (gan.has(0) ? ' gana' : '');
  $('#pcYo').innerHTML = `${S.boton === 0 ? '<span class="bt">D</span>' : ''}<div class="nom">${esc(yo.nombre)} · 🪙 ${yo.stack} ${yo.apuesta ? `<span class="ap">${yo.apuesta}</span>` : ''}</div>
    <div class="cs ${descartando ? 'elige' : ''}">${yo.cartas.map((c, k) => descartando ? `<button type="button" class="pcc ${marcadas.has(k) ? 'fuera' : ''}" data-carta="${k}" aria-pressed="${marcadas.has(k)}" aria-label="Carta ${k + 1}${marcadas.has(k) ? ': se cambia' : ''}">${cartaHTML(c)}</button>` : cartaHTML(c)).join('')}</div>
    <div class="txt">${yo.cartas.length && !yo.fold ? `<b>${esc(P.nombreMano(P.valorMano(yo.cartas)))}</b>` : ''}${yo.txt ? ` · ${esc(yo.txt)}` : ''}</div>`;
}
function pie(yo, descartando) {
  $('#pcBote').textContent = `Bote 🪙 ${P.bote(S)} · entrada ${S.ante}${S.modo === 'libre' ? ` · balance ${P.neto(S) >= 0 ? '+' : ''}${P.neto(S)}` : ''}`;
  const m = $('#pcMsg');
  if (S.fase === 'terminado' || (S.fase === 'fin' && P.evaluarFin(S))) m.textContent = S.modo === 'libre' ? 'Te has levantado de la mesa' : yo.stack > 0 ? '🏆 ¡Has ganado el torneo!' : 'Has sido eliminado';
  else if (S.fase === 'fin') m.textContent = S.resultado ? S.resultado.texto : '';
  else if (descartando) m.textContent = 'Toca las cartas que quieres cambiar';
  else if (S.turno === 0) m.textContent = S.fase === 'apuesta1' ? 'Tu turno · primera ronda de apuestas' : 'Tu turno · segunda ronda de apuestas';
  else m.textContent = S.turno >= 0 ? `${S.fase === 'descarte' ? 'Descarta' : 'Juega'} ${S.jug[S.turno].nombre}…` : '';
  $('#pcLog').innerHTML = S.log.map(l => `<li>${esc(l)}</li>`).join('');
  panel();
}
function cerrar3D() { tok3++; if (V3) { V3.destruir(); V3 = null; } }
async function iniciar3D() {
  const t = ++tok3, host = $('#pcVista'); if (!host) return;
  try {
    const b3 = await import('../../core/escena3d.js'), { crearMesaCartas3D } = await import('../../core/mesacartas3d.js'); if (t !== tok3 || !root) return;
    const v = crearMesaCartas3D(host, { etiqueta: 'Mesa de Póker cubierto en 3D' }); b3.botonesCamara(host, v.E); const g = host.querySelector('[data-cam="girar"]'); if (g) g.remove();
    v.alCarta = k => { if (S && S.fase === 'descarte' && S.turno === 0) { if (marcadas.has(k)) marcadas.delete(k); else marcadas.add(k); api.sonido('click'); pintar(); } };
    V3 = v; v.recolor(); if (S) pintar();
  } catch (e) { console.error(e); if (t === tok3 && root && S) { forzar2d = true; armar(); pintar(); } }
}
function panel() {
  const p = $('#pcPanel');
  if (!enJuego()) {
    const ev = P.evaluarFin(S);
    p.innerHTML = `<div class="bar" style="justify-content:center">${ev || S.fase === 'terminado' ? '<button class="btn on" data-ac="setup">Nueva partida</button>' : '<button class="btn on" data-ac="siguiente">Siguiente mano</button>'}</div>`;
    return;
  }
  if (S.turno !== 0) { p.innerHTML = ''; return; }
  const yo = S.jug[0];
  if (S.fase === 'descarte') {
    const sug = P.sugerirDescarte(yo.cartas), n = marcadas.size, ok = P.descarteValido(yo.cartas, [...marcadas]);
    p.innerHTML = `${consejo ? `<div class="htip">💡 Consejo: ${sug.length ? `cambia ${sug.length} carta${sug.length > 1 ? 's' : ''}` : 'quédate servido'}. <button class="btn" data-ac="usarConsejo">Marcarlas</button></div>` : ''}
      <div class="hbtns"><button class="btn" data-ac="servido">Servido (no cambio)</button><button class="btn on" data-ac="cambiar" ${n && ok ? '' : 'disabled'}>${n ? `Cambiar ${n} carta${n > 1 ? 's' : ''}` : 'Marca cartas'}</button></div>
      ${!ok ? '<p class="note">Puedes cambiar hasta 3 cartas, o 4 si te quedas con un as.</p>' : ''}`;
    return;
  }
  const L = P.legal(S, 0), B = P.bote(S);
  if (subir < L.minTo || subir > L.maxTo) subir = L.minTo;
  let tip = '';
  if (consejo) { const eq = P.equidad(yo.cartas, S, 0, 500), nec = L.aPagar / (B + L.aPagar); tip = `<div class="htip">💡 Probabilidad de ganar ≈ <b>${Math.round(eq * 100)} %</b>${S.fase === 'apuesta1' ? ' (contando el cambio de cartas)' : ''}${L.aPagar ? ` · para igualar necesitas más de un ${Math.round(nec * 100)} %` : ''}.</div>`; }
  const aviso = L.cerrada ? '<p class="note">Jotas o mejor: necesitas al menos una pareja de jotas para abrir. Puedes pasar.</p>' : '';
  p.innerHTML = `${tip}${aviso}<div class="hbtns"><button class="btn danger" data-act="fold">Retirarse</button>${L.pasar ? '<button class="btn on" data-act="check">Pasar</button>' : `<button class="btn on" data-act="call">${L.llamar >= yo.stack ? 'All-in ' : 'Igualar '}${L.llamar}</button>`}</div>
    ${L.subir ? `<div class="hsub"><div>${S.apuestaMax ? 'Subir a' : S.fase === 'apuesta1' ? 'Abrir con' : 'Apostar'} <b id="pcSub">${subir}</b></div><input type="range" id="pcRng" min="${L.minTo}" max="${L.maxTo}" step="5" value="${subir}" aria-label="Cantidad a apostar">
      <div class="pre"><button class="btn" data-pre="0.5">½ bote</button><button class="btn" data-pre="1">Bote</button><button class="btn" data-pre="max">All-in</button></div><button class="btn on" style="width:100%" data-act="raise">${textoSubir(L)}</button></div>` : ''}`;
}
const textoSubir = L => `${subir >= L.maxTo ? 'All-in' : S.apuestaMax ? 'Subir' : S.fase === 'apuesta1' ? 'Abrir' : 'Apostar'} ${subir}`;
function alMover(e) { if (e.target.id !== 'pcRng') return; subir = +e.target.value; $('#pcSub').textContent = subir; root.querySelector('[data-act="raise"]').textContent = textoSubir(P.legal(S, 0)); }

/* ---------- flujo ---------- */
function bucle() {
  clearTimeout(timer);
  if (!S || S.turno < 0 || !enJuego()) { cierre(); return; }
  const i = S.turno; if (!S.jug[i].bot) return;
  timer = setTimeout(() => {
    if (!S || S.turno !== i) return;
    if (S.fase === 'descarte') P.descartar(S, i, P.descarteBot(S, i));
    else { const a = P.decidir(S, i); if (!P.actuar(S, i, a)) P.actuar(S, i, P.legal(S, i).pasar ? { t: 'check' } : { t: 'call' }); }
    api.sonido('click'); pintar(); guardar(); bucle();
  }, (S.fase === 'descarte' ? 500 : 650) + Math.random() * 400);
}
function cierre() {
  if (!S || S.fase !== 'fin') { if (S) pintar(); return; }
  contarMano();
  const ev = P.evaluarFin(S);
  if (ev) S.fase = 'terminado';
  if (ev && !S.reg) { S.reg = true; api.registrar({ res: ev, variante: `${S.jug.length - 1} bot${S.jug.length > 2 ? 's' : ''} · ${NIVEL[S.nivel]}` }); api.sonido(ev === 'victoria' ? 'ganar' : 'perder'); if (ev === 'victoria') api.vibrar([60, 40, 60]); }
  else if (!ev && S.resultado && S.resultado.ganadores.some(g => g.i === 0)) api.sonido('ok');
  pintar(); guardar();
}
function humano(a) {
  if (!S || S.turno !== 0) return;
  const pre = S.fase === 'apuesta1';
  if (P.actuar(S, 0, a)) { if (pre && (a.t === 'call' || a.t === 'raise')) S.mio.vpip = true; api.sonido('click'); pintar(); guardar(); bucle(); }
}
function cambiar(idx) {
  if (!S || S.fase !== 'descarte' || S.turno !== 0) return;
  if (!P.descartar(S, 0, idx)) { api.sonido('error'); return; }
  marcadas = new Set(); api.sonido(idx.length ? 'dado' : 'click'); pintar(); guardar(); bucle();
}
function clic(e) {
  const b = e.target.closest('button'); if (!b) return;
  const d = b.dataset;
  if (d.bots) { cfg.bots = +d.bots; return setup(); } if (d.niv) { cfg.nivel = d.niv; return setup(); }
  if (d.pmodo) { cfg.modo = d.pmodo; api.setPref('cfg', cfg); return setup(); } if (d.ante) { cfg.ante = d.ante; api.setPref('cfg', cfg); return setup(); }
  if (d.apertura) { cfg.apertura = d.apertura; api.setPref('cfg', cfg); return setup(); }
  if (d.carta != null) { const k = +d.carta; if (marcadas.has(k)) marcadas.delete(k); else marcadas.add(k); api.sonido('click'); return pintar(); }
  if (d.pre) { const L = P.legal(S, 0), B = P.bote(S); subir = d.pre === 'max' ? L.maxTo : Math.max(L.minTo, Math.min(L.maxTo, Math.round((S.apuestaMax + (B + L.aPagar) * +d.pre) / 5) * 5)); return panel(); }
  if (d.act) return humano({ t: d.act, a: subir });
  const ac = d.ac;
  if (ac === 'start') empezar(); else if (ac === 'aspecto') asp.abrir(); else if (ac === 'rank') ranking();
  else if (ac === 'servido') cambiar([]); else if (ac === 'cambiar') cambiar([...marcadas]);
  else if (ac === 'usarConsejo') { marcadas = new Set(P.sugerirDescarte(S.jug[0].cartas)); pintar(); }
  else if (ac === 'siguiente') { P.nuevaMano(S); S.mio = { vpip: false }; marcadas = new Set(); pintar(); guardar(); bucle(); }
  else if (ac === 'estad') verEstad(); else if (ac === 'levantarse') levantarse();
  else if (ac === 'setup') { api.borrar(); setup(); } else if (ac === 'nueva') nuevaSetup();
}
function ranking() {
  api.modal('Ranking de manos', `<div class="hrank"><b>1</b><span>Escalera real (10-J-Q-K-A del mismo palo)</span><b>2</b><span>Escalera de color</span><b>3</b><span>Póker (4 iguales)</span><b>4</b><span>Full (trío + pareja)</span><b>5</b><span>Color (5 del mismo palo)</span><b>6</b><span>Escalera (5 seguidas)</span><b>7</b><span>Trío</span><b>8</b><span>Doble pareja</span><b>9</b><span>Pareja</span><b>10</b><span>Carta alta</span></div>`);
}
function reglas() {
  api.modal('Póker cubierto', `<ul><li>Todos ponen la <b>entrada</b> en el bote y reciben <b>5 cartas tapadas</b>.</li>
    <li><b>Primera ronda de apuestas</b>: pasar, abrir (primera apuesta), igualar, subir o retirarse. Con la opción <b>jotas o mejor</b>, solo puede abrir quien tenga al menos pareja de jotas; si nadie abre, se reparte de nuevo y el bote se queda.</li>
    <li><b>Descarte</b>: cada jugador cambia de 0 a 3 cartas (hasta 4 si se queda con un as). Quien no cambia ninguna está <b>servido</b>. Fíjate en cuántas cartas cambia cada rival: da pistas de su mano.</li>
    <li><b>Segunda ronda de apuestas</b> y, si quedan dos o más, se enseñan las cartas: gana la mejor mano de 5. Puedes ir all-in; los all-in cortos generan botes secundarios.</li>
    <li>Torneo: la entrada sube cada ${P.MANOS_POR_NIVEL} manos y gana quien se quede con todas las fichas. Partida libre: entrada fija y recompras de ${P.STACK} fichas.</li>
    <li>💡 Con los consejos activados (menú ⋯) ves tu probabilidad de ganar y qué cartas conviene cambiar.</li></ul>`);
}
