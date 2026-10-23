import { $, esc } from '../../core/dom.js';
import { cartaHTML } from '../../core/cartas.js';
import { grupoMesa, grupoDorso, grupoBarajaFr } from '../../core/aspectos.js';
import * as H from './motor.js';

const NIVEL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
let S = null, api = null, asp = null, root = null, timer = null, prevTab = 0, cfg = { bots: 3, nivel: 'medio', modo: 'torneo', ciegas: 'baja' }, consejo = true, subir = 0, ocupado = false;
let V3 = null, hay3d = false, modo3d = false, forzar2d = false, tok3 = 0;
const quiere3D = () => hay3d && !forzar2d && !!asp && (asp.valores.vista || '3d') === '3d';
// Estadísticas de tus manos (acumuladas en las preferencias): VPIP = manos en las que pusiste fichas voluntariamente antes del flop
const EST0 = { manos: 0, vpip: 0, pfr: 0, ganadas: 0, showdowns: 0, showGanados: 0, mayorBote: 0, mejor: 0, mejorTxt: '' };
const est = () => ({ ...EST0, ...(api.pref('estad', {}) || {}) });
function contarMano() {
  if (!S || S.fase !== 'fin' || S.cuenta === S.mano || !S.jug[0].cartas.length) return;
  S.cuenta = S.mano;
  const E = est(), r = S.resultado, mio = S.mio || {};
  E.manos++; if (mio.vpip) E.vpip++; if (mio.pfr) E.pfr++;
  const g = r && r.ganadores.find(x => x.i === 0);
  if (g) { E.ganadas++; E.mayorBote = Math.max(E.mayorBote, g.monto); }
  if (r && r.showdown && !S.jug[0].fold) {
    E.showdowns++; if (g) E.showGanados++;
    const v = r.valores && r.valores[0]; if (Number.isFinite(v) && v > E.mejor) { E.mejor = v; E.mejorTxt = H.nombreMano(v); }
  }
  api.setPref('estad', E);
}
function verEstad() {
  const E = est(), pc = (a, b) => (b ? Math.round(a / b * 100) + ' %' : '–');
  api.modal('📊 Tus estadísticas de póker', E.manos ? `<table class="tabla">
    <tr><td>Manos jugadas</td><td>${E.manos}</td></tr>
    <tr><td>VPIP (entras en el bote)</td><td>${pc(E.vpip, E.manos)}</td></tr>
    <tr><td>PFR (subes antes del flop)</td><td>${pc(E.pfr, E.manos)}</td></tr>
    <tr><td>Manos ganadas</td><td>${E.ganadas} (${pc(E.ganadas, E.manos)})</td></tr>
    <tr><td>Enfrentamientos ganados</td><td>${E.showGanados} de ${E.showdowns} (${pc(E.showGanados, E.showdowns)})</td></tr>
    <tr><td>Mayor bote ganado</td><td>🪙 ${E.mayorBote}</td></tr>
    <tr><td>Mejor mano enseñada</td><td>${esc(E.mejorTxt || '–')}</td></tr></table>
    <p class="note">Como referencia, un jugador sólido en mesas de 4-6 suele tener un VPIP de 20-30 % y un PFR algo menor. ${E.manos >= 30 && E.vpip / E.manos > .45 ? 'Juegas muchas manos: prueba a retirarte más con cartas flojas.' : E.manos >= 30 && E.vpip / E.manos < .15 ? 'Juegas muy pocas manos: puedes permitirte entrar algo más.' : ''}</p>
    <div class="bar"><button class="btn danger" data-borrarest>Borrar estadísticas</button></div>` : '<p>Juega unas manos y aquí verás tus estadísticas.</p>');
  const b = document.querySelector('[data-borrarest]'); if (b) b.addEventListener('click', () => { if (api.confirmar('¿Borrar tus estadísticas de póker?')) { api.setPref('estad', {}); document.querySelector('.modal')?.remove(); api.aviso('Estadísticas borradas'); } });
}

/* ---------- validación / resumen ---------- */
export function validar(d) { return H.validar(d); }
export const migrarV1 = d => d;
export function resumen(d) {
  const yo = d.jug[0];
  if (d.modo === 'libre') { const n = H.neto(d); return { texto: `Partida libre · mano ${d.mano} · ${n >= 0 ? '+' : ''}${n} fichas`, fin: d.fase === 'terminado' }; }
  if (d.fase === 'terminado' || (d.fase === 'fin' && H.evaluarFin(d))) return { texto: `${yo.stack > 0 ? '¡Campeón!' : 'Eliminado'} · mano ${d.mano}`, fin: true };
  return { texto: `Mano ${d.mano} · ${yo.stack} fichas · ${d.jug.length - 1} bots`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; ocupado = false; forzar2d = false; modo3d = false;
  try { hay3d = (await import('../../core/escena3d.js')).hayWebGL(); } catch { hay3d = false; }
  asp = api.aspecto([...(hay3d ? [{ clave: 'vista', titulo: 'Vista de la mesa', icono: '🧊', def: '3d', opciones: [{ id: '3d', nombre: '🧊 3D (Three.js)' }, { id: '2d', nombre: '🔲 2D clásica' }] }] : []), grupoMesa(), grupoDorso(), grupoBarajaFr()],
    () => { if (S && $('#hMsg')) { if (modo3d !== quiere3D()) { armar(); pintar(); } else if (V3) { V3.recolor(); pintar(); } } });
  await api.css(new URL('../../../css/cartas.css', import.meta.url)); await api.css(new URL('./holdem.css', import.meta.url));
  const g = api.cargar(); S = g; consejo = api.pref('consejo', true);
  const c0 = api.pref('cfg', null); if (c0 && c0.bots >= 2 && c0.bots <= 5 && NIVEL[c0.nivel]) cfg = { bots: c0.bots, nivel: c0.nivel, modo: c0.modo === 'libre' ? 'libre' : 'torneo', ciegas: H.CIEGAS_LIBRE[c0.ciegas] ? c0.ciegas : 'baja' };
  root.addEventListener('click', clic); root.addEventListener('input', alMover);
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '📊 Mis estadísticas', accion: verEstad }, { texto: 'Mostrar mis probabilidades', accion: () => { consejo = !consejo; api.setPref('consejo', consejo); pintar(); }, activo: consejo }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Ranking de manos', accion: ranking }, { texto: 'Reglas', accion: reglas }]);
  if (S) { prevTab = S.tablero.length; armar(); pintar(); bucle(); } else setup();
}
export function unmount() { cerrar3D(); modo3d = false; clearTimeout(timer); if (root) { root.removeEventListener('click', clic); root.removeEventListener('input', alMover); } S = null; asp = null; }
function guardar() { if (!S) return; const r = resumen(S); api.guardar(S, r.texto, r.fin); }

/* ---------- pantallas ---------- */
function setup() {
  S = null; clearTimeout(timer);
  root.innerHTML = `<p class="note">${cfg.modo === 'libre' ? `Partida libre: ciegas fijas y sin eliminación. Si alguien se queda sin fichas, recompra ${H.STACK}. Juega las manos que quieras y levántate de la mesa cuando te apetezca: cuenta lo que has ganado o perdido.` : `Torneo contra bots: empiezas con ${H.STACK} fichas y las ciegas suben cada ${H.MANOS_POR_NIVEL} manos. Gana quien se quede con todas las fichas.`}</p>
    <div class="bar"><span class="lbl">Modo</span><div class="seg"><button class="btn ${cfg.modo === 'torneo' ? 'on' : ''}" data-hmodo="torneo">🏆 Torneo</button><button class="btn ${cfg.modo === 'libre' ? 'on' : ''}" data-hmodo="libre">🃏 Partida libre</button></div></div>
    ${cfg.modo === 'libre' ? `<div class="bar"><span class="lbl">Ciegas</span><div class="seg">${Object.entries(H.CIEGAS_LIBRE).map(([k, [a, b]]) => `<button class="btn ${cfg.ciegas === k ? 'on' : ''}" data-ciegas="${k}">${a}/${b}</button>`).join('')}</div></div>` : ''}
    <div class="bar"><span class="lbl">Rivales</span><div class="seg">${[2, 3, 4, 5].map(n => `<button class="btn ${cfg.bots === n ? 'on' : ''}" data-bots="${n}">${n} bots</button>`).join('')}</div></div>
    <div class="bar"><span class="lbl">Nivel</span><div class="seg">${Object.entries(NIVEL).map(([k, l]) => `<button class="btn ${cfg.nivel === k ? 'on' : ''}" data-niv="${k}">${l}</button>`).join('')}</div></div>
    <div class="bar"><button class="btn on" data-ac="start">${cfg.modo === 'libre' ? 'Sentarse a la mesa' : 'Empezar torneo'}</button><button class="btn" data-ac="estad">📊 Mis estadísticas</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="rank">Ranking de manos</button></div>
    <p class="note">Cada bot tiene su estilo: conservador, equilibrado, agresivo o farolero. En Fácil se equivocan más; en Difícil calculan más simulaciones.</p>`;
}
function armar() {
  const nb = S.jug.length - 1;
  cerrar3D(); modo3d = quiere3D();
  root.innerHTML = `${modo3d ? '<div class="e3d pk3" id="hVista"></div><div class="hcentro hc3"><div class="hbote" id="hBote"></div><div class="hmsg" id="hMsg" role="status" aria-live="polite"></div></div>' : `<div class="mesa hm"><div class="hbots" id="hBots" style="--nb:${Math.min(nb, 3)}"></div>
    <div class="hcentro"><div class="hbote" id="hBote"></div><div class="hboard" id="hBoard"></div><div class="hmsg" id="hMsg" role="status" aria-live="polite"></div></div>
    <div class="yo" id="hYo"></div></div>`}<div class="hpanel" id="hPanel"></div><ul class="hlog" id="hLog"></ul>
    <div class="bar">${S.modo === 'libre' ? '<button class="btn" data-ac="levantarse">🚪 Levantarse de la mesa</button>' : ''}<button class="btn" data-ac="estad">📊</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="rank">Ranking</button><button class="btn" data-ac="nueva">Nueva partida</button></div>`;
  if (modo3d) iniciar3D();
}
function nuevaSetup() { if (S && S.modo === 'libre' && S.fase !== 'terminado') return levantarse(); if (S && S.fase !== 'terminado' && !api.confirmar('¿Abandonar el torneo actual?')) return; api.borrar(); setup(); }
// Partida libre: al levantarse se anota el balance (ganada si terminas con más fichas de las que compraste)
function levantarse() {
  if (!S || S.modo !== 'libre') return;
  if (S.turno >= 0 && !api.confirmar('La mano sigue en juego: si te levantas, la pierdes. ¿Levantarte?')) return;
  if (!api.confirmar(`¿Levantarte de la mesa? Balance: ${H.neto(S) >= 0 ? '+' : ''}${H.neto(S)} fichas.`)) return;
  const n = H.neto(S); clearTimeout(timer);
  if (S.mano > 0 && !S.reg) { S.reg = true; api.registrar({ res: n > 0 ? 'victoria' : n < 0 ? 'derrota' : 'tablas', variante: `Partida libre · ${NIVEL[S.nivel]}`, puntos: Math.max(0, n) }); }
  S.fase = 'terminado'; S.turno = -1; guardar();
  api.modal('🚪 Te levantas de la mesa', `<p>Has jugado <b>${S.mano}</b> manos y terminas con <b>${n >= 0 ? '+' : ''}${n}</b> fichas${S.compras[0] > 1 ? ` (recompraste ${S.compras[0] - 1} ${S.compras[0] === 2 ? 'vez' : 'veces'})` : ''}.</p>`);
  setup();
}
function empezar() {
  asp.sortear();
  S = H.crear(cfg.bots, cfg.nivel, 'Tú', cfg.modo, cfg.ciegas); S.mio = { vpip: false, pfr: false }; api.setPref('cfg', cfg); prevTab = 0; armar(); H.nuevaMano(S); pintar(); guardar(); bucle();
}

/* ---------- pintado ---------- */
const mostrarCartas = (i) => { const p = S.jug[i]; if (!p.cartas.length) return false; if (i === 0) return true; return S.resultado && S.resultado.showdown && !p.fold; };
function pintar() {
  if (!S || !$('#hMsg')) return;
  const bots = S.jug.map((p, i) => i).slice(1), ocupados = S.fase === 'fin' || S.fase === 'terminado';
  if (!modo3d) pintar2D(bots);
  else if (V3) pintar3D(bots);
  $('#hBote').textContent = `Bote 🪙 ${H.bote(S)}${S.modo === 'libre' ? ` · ciegas ${S.sb}/${S.bb} · balance ${H.neto(S) >= 0 ? '+' : ''}${H.neto(S)}` : ''}`;
  pie();
}
function pintar2D(bots) {
  $('#hBots').style.setProperty('--nb', Math.min(bots.length, 3));
  $('#hBots').innerHTML = bots.map(i => { const p = S.jug[i], t = S.turno === i;
    return `<div class="seat ${t ? 'turno' : ''} ${p.fold ? 'fold' : ''} ${p.fuera ? 'fuera' : ''}">${S.boton === i && !p.fuera ? '<span class="bt">D</span>' : ''}<div class="nom">${esc(p.nombre)}</div><div class="stk">🪙 ${p.stack}</div>
      <div class="cs">${p.cartas.length ? p.cartas.map(c => cartaHTML(c, { oculta: !mostrarCartas(i) })).join('') : ''}</div><div class="txt">${p.fuera ? 'Eliminado' : esc(p.txt)}</div>${p.apuesta ? `<span class="ap">${p.apuesta}</span>` : ''}</div>`; }).join('');
  $('#hBoard').innerHTML = [0, 1, 2, 3, 4].map(k => k < S.tablero.length ? cartaHTML(S.tablero[k], { clase: k >= prevTab ? 'in' : '', estilo: k >= prevTab ? `--dl:${(k - Math.min(prevTab, 3)) * .12}s;animation-delay:${(k - prevTab) * .15}s` : '' }) : '<div class="ph"></div>').join('');
  prevTab = S.tablero.length;
  const yo = S.jug[0];
  $('#hYo').className = 'yo' + (S.turno === 0 ? ' turno' : '') + (yo.fold ? ' fold' : '');
  $('#hYo').innerHTML = `${S.boton === 0 ? '<span class="bt">D</span>' : ''}<div class="nom">${esc(yo.nombre)} · 🪙 ${yo.stack} ${yo.apuesta ? `<span class="ap" style="background:#FFC21A;color:#3A2800;padding:1px 8px;border-radius:99px;font-size:12px">${yo.apuesta}</span>` : ''}</div><div class="cs">${yo.cartas.map(c => cartaHTML(c)).join('')}</div><div class="txt" style="font-size:12px;font-weight:800;min-height:16px">${esc(yo.txt)}</div>`;
}
function pintar3D(bots) {
  const mostrar = i => mostrarCartas(i), dat = (i, esYo) => { const p = S.jug[i]; return { nombre: p.nombre, stack: p.stack, txt: p.fuera ? '' : p.txt, fold: p.fold, fuera: p.fuera, turno: S.turno === i, apuesta: p.apuesta, boton: S.boton === i, cartas: p.cartas, ver: esYo || mostrar(i), gana: !!(S.resultado && S.resultado.ganadores.some(g => g.i === i)) }; };
  V3.pintar({ bote: H.bote(S), tablero: S.tablero, nCartas: 2, mostrarTablero: true, bots: bots.map(i => dat(i, false)), yo: dat(0, true) });
  prevTab = S.tablero.length;
}
function pie() {
  const yo = S.jug[0], m = $('#hMsg');
  if (S.fase === 'terminado' || (S.fase === 'fin' && H.evaluarFin(S))) m.textContent = S.modo === 'libre' ? 'Te has levantado de la mesa' : yo.stack > 0 ? '🏆 ¡Has ganado el torneo!' : 'Has sido eliminado';
  else if (S.fase === 'fin') m.textContent = S.resultado ? S.resultado.texto : '';
  else if (S.turno === 0) m.textContent = 'Tu turno';
  else m.textContent = S.turno >= 0 ? `Juega ${S.jug[S.turno].nombre}…` : '';
  $('#hLog').innerHTML = S.log.map(l => `<li>${esc(l)}</li>`).join('');
  panel();
}
function cerrar3D() { tok3++; if (V3) { V3.destruir(); V3 = null; } }
async function iniciar3D() {
  const t = ++tok3, host = $('#hVista'); if (!host) return;
  try {
    const b3 = await import('../../core/escena3d.js'), { crearMesaCartas3D } = await import('../../core/mesacartas3d.js'); if (t !== tok3 || !root) return;
    const v = crearMesaCartas3D(host, { etiqueta: "Mesa de Texas Hold'em en 3D" }); b3.botonesCamara(host, v.E); const g = host.querySelector('[data-cam="girar"]'); if (g) g.remove();
    V3 = v; v.recolor(); if (S) pintar();
  } catch (e) { console.error(e); if (t === tok3 && root && S) { forzar2d = true; armar(); pintar(); } }
}
function panel() {
  const p = $('#hPanel'), fin = S.fase === 'fin' || S.fase === 'terminado';
  if (fin) {
    const ev = H.evaluarFin(S);
    p.innerHTML = ev || S.fase === 'terminado' ? `<div class="bar" style="justify-content:center"><button class="btn on" data-ac="setup">Nuevo torneo</button></div>` : `<div class="bar" style="justify-content:center"><button class="btn on" data-ac="siguiente">Siguiente mano</button></div>`;
    return;
  }
  if (S.turno !== 0 || ocupado) { p.innerHTML = ''; return; }
  const L = H.legal(S, 0), yo = S.jug[0], B = H.bote(S);
  if (subir < L.minTo || subir > L.maxTo) subir = L.minTo;
  let tip = '';
  if (consejo) { const riv = H.vivos(S).length - 1, eq = H.equidad(yo.cartas, S.tablero, riv, 450), nec = L.aPagar / (B + L.aPagar); tip = `<div class="htip">💡 Probabilidad de ganar ≈ <b>${Math.round(eq * 100)} %</b>${L.aPagar ? ` · para igualar necesitas más de un ${Math.round(nec * 100)} %` : ''}.</div>`; }
  p.innerHTML = `${tip}<div class="hbtns"><button class="btn danger" data-act="fold">Retirarse</button>${L.pasar ? '<button class="btn on" data-act="check">Pasar</button>' : `<button class="btn on" data-act="call">${L.llamar >= yo.stack ? 'All-in ' : 'Igualar '}${L.llamar}</button>`}</div>
    ${L.subir ? `<div class="hsub"><div>${S.apuestaMax ? 'Subir a' : 'Apostar'} <b id="hSub">${subir}</b></div><input type="range" id="hRng" min="${L.minTo}" max="${L.maxTo}" step="5" value="${subir}" aria-label="Cantidad a apostar">
      <div class="pre"><button class="btn" data-pre="0.5">½ bote</button><button class="btn" data-pre="1">Bote</button><button class="btn" data-pre="max">All-in</button></div><button class="btn on" style="width:100%" data-act="raise">${subir >= L.maxTo ? 'All-in' : S.apuestaMax ? 'Subir' : 'Apostar'} ${subir}</button></div>` : ''}`;
}
function alMover(e) { if (e.target.id !== 'hRng') return; subir = +e.target.value; $('#hSub').textContent = subir; const b = root.querySelector('[data-act="raise"]'); const L = H.legal(S, 0); b.textContent = `${subir >= L.maxTo ? 'All-in' : S.apuestaMax ? 'Subir' : 'Apostar'} ${subir}`; }

/* ---------- flujo ---------- */
function bucle() {
  clearTimeout(timer); if (!S || S.turno < 0 || !['preflop', 'flop', 'turn', 'river'].includes(S.fase)) { cierre(); return; }
  const i = S.turno; if (!S.jug[i].bot) return;
  timer = setTimeout(() => { if (!S || S.turno !== i) return; const a = H.decidir(S, i); if (!H.actuar(S, i, a)) H.actuar(S, i, H.legal(S, i).pasar ? { t: 'check' } : { t: 'call' }); api.sonido('click'); pintar(); guardar(); bucle(); }, 650 + Math.random() * 450);
}
function cierre() {
  if (!S || S.fase !== 'fin') { if (S) { pintar(); } return; }
  contarMano();
  const ev = H.evaluarFin(S);
  if (ev) S.fase = 'terminado';
  if (ev && !S.reg) { S.reg = true; api.registrar({ res: ev, variante: `${S.jug.length - 1} bots · ${NIVEL[S.nivel]}` }); api.sonido(ev === 'victoria' ? 'ganar' : 'perder'); if (ev === 'victoria') api.vibrar([60, 40, 60]); }
  else if (!ev && S.resultado && S.resultado.ganadores.some(g => g.i === 0)) api.sonido('ok');
  pintar(); guardar();
}
function humano(a) {
  if (!S || S.turno !== 0) return;
  const pre = S.fase === 'preflop';
  if (H.actuar(S, 0, a)) {
    if (pre && (a.t === 'call' || a.t === 'raise')) S.mio.vpip = true;
    if (pre && a.t === 'raise') S.mio.pfr = true; api.sonido('click'); pintar(); guardar(); bucle(); } }
function clic(e) {
  const b = e.target.closest('button'); if (!b) return;
  const d = b.dataset;
  if (d.bots) { cfg.bots = +d.bots; return setup(); } if (d.niv) { cfg.nivel = d.niv; return setup(); }
  if (d.hmodo) { cfg.modo = d.hmodo; api.setPref('cfg', cfg); return setup(); } if (d.ciegas) { cfg.ciegas = d.ciegas; api.setPref('cfg', cfg); return setup(); }
  if (d.pre) { const L = H.legal(S, 0), B = H.bote(S); subir = d.pre === 'max' ? L.maxTo : Math.max(L.minTo, Math.min(L.maxTo, Math.round((S.apuestaMax + (B + L.aPagar) * +d.pre) / 5) * 5)); return panel(); }
  if (d.act) return humano({ t: d.act, a: subir });
  const ac = d.ac;
  if (ac === 'start') empezar(); else if (ac === 'aspecto') asp.abrir(); else if (ac === 'rank') ranking();
  else if (ac === 'siguiente') { H.nuevaMano(S); S.mio = { vpip: false, pfr: false }; prevTab = 0; pintar(); guardar(); bucle(); }
  else if (ac === 'estad') verEstad(); else if (ac === 'levantarse') levantarse();
  else if (ac === 'setup') { api.borrar(); setup(); } else if (ac === 'nueva') nuevaSetup();
}
function ranking() {
  api.modal('Ranking de manos', `<div class="hrank"><b>1</b><span>Escalera real (10-J-Q-K-A del mismo palo)</span><b>2</b><span>Escalera de color</span><b>3</b><span>Póker (4 iguales)</span><b>4</b><span>Full (trío + pareja)</span><b>5</b><span>Color (5 del mismo palo)</span><b>6</b><span>Escalera (5 seguidas)</span><b>7</b><span>Trío</span><b>8</b><span>Doble pareja</span><b>9</b><span>Pareja</span><b>10</b><span>Carta alta</span></div>`);
}
function reglas() {
  api.modal("Texas Hold'em", `<ul><li>Cada jugador recibe 2 cartas y se reparten 5 comunes (flop de 3, turn y river). Haces la mejor mano de 5 con tus cartas y las comunes.</li>
    <li>Rondas de apuestas: <b>pasar</b> (si nadie ha apostado), <b>igualar</b>, <b>subir</b> o <b>retirarse</b>. Puedes ir <b>all-in</b> con todas tus fichas; los all-in cortos generan botes secundarios.</li>
    <li>El botón <b>D</b> marca al repartidor; los dos jugadores siguientes ponen las ciegas, que suben cada ${H.MANOS_POR_NIVEL} manos.</li>
    <li>Torneo: ganas cuando eliminas a todos los bots; pierdes si te quedas sin fichas.</li>
    <li><b>Partida libre</b>: ciegas fijas (las eliges tú) y nadie queda eliminado: quien se arruina recompra ${H.STACK} fichas. Levántate cuando quieras y se anota tu balance.</li>
    <li>📊 <b>Mis estadísticas</b>: manos jugadas, VPIP, PFR, manos ganadas y tu mejor jugada, acumuladas entre partidas.</li>
    <li>💡 «Mostrar mis probabilidades» (menú ⋯) calcula tu opción de ganar y la compara con lo que cuesta igualar.</li></ul>`);
}
