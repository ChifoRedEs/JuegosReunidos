import { $, esc } from '../../core/dom.js';
import { anotarPartida, htmlPartidas, historialVacio, validarHistorial, seguir, htmlTabla } from '../../core/historial.js';
import { cartaHTML, nombreCarta } from '../../core/cartas.js';
import { grupoMesa, grupoDorso, grupoBarajaFr } from '../../core/aspectos.js';
import { hacerOrdenable, ordenarMano } from '../../core/arrastrar.js';
import * as K from './motor.js';

let S = null, api = null, asp = null, root = null, timer = null, reg = false, arr = null, sel = null, robada = -1;
let hm = historialVacio();                                   // tabla de puntos mano a mano (se guarda con la partida)
let cfg = { rivales: 2, nivel: 'medio', comodines: true }, marcador = { g: 0, p: 0 }, ord = { modo: 'palo', ids: [] };
const MODOS = ['palo', 'numero', 'libre'];
const pl = (n, x) => `${n} ${x}${n === 1 ? '' : 's'}`;

/* ---------- validación / resumen ---------- */
export function validar(d) {
  const s = d && K.validar(d.s); if (!s) return null;
  const m = d.marcador && typeof d.marcador === 'object' ? d.marcador : {}, e = v => (Number.isInteger(v) && v >= 0 && v <= 99999 ? v : 0);
  const o = d.ord && MODOS.includes(d.ord.modo) ? { modo: d.ord.modo, ids: Array.isArray(d.ord.ids) ? [...new Set(d.ord.ids.filter(x => Number.isInteger(x) && x >= 0 && x <= 107))] : [] } : null;
  return { s, marcador: { g: e(m.g), p: e(m.p) }, reg: !!d.reg, ord: o, hm: validarHistorial(d.hm, s.jug ? s.jug.length : 2) };
}
export const migrarV1 = d => d;
export function resumen(d) {
  const s = d.s;
  if (s.fase === 'fin') return { texto: s.ganador === 0 ? '¡Ganaste!' : `Ganó ${s.jug[s.ganador].nombre}`, fin: true };
  return { texto: `Ronda ${s.ronda + 1}/7 · ${K.CONTRATOS[s.ronda].nombre} · llevas ${s.jug[0].total}`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; arr = null; sel = null; robada = -1;
  asp = api.aspecto([grupoMesa(), grupoDorso(), grupoBarajaFr()]);
  await api.css(new URL('../../../css/cartas.css', import.meta.url)); await api.css(new URL('./continental.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && [1, 2, 3].includes(c0.rivales) && K.NIVEL[c0.nivel]) cfg = { ...c0, comodines: c0.comodines !== false };
  ord = { modo: MODOS.includes(api.pref('orden', 'palo')) ? api.pref('orden', 'palo') : 'palo', ids: [] };
  const g = api.cargar();
  if (g) { S = g.s; marcador = g.marcador; reg = g.reg; if (g.ord) ord = g.ord; hm = g.hm || historialVacio(); } else { S = null; hm = historialVacio(); }
  root.addEventListener('click', clic); root.addEventListener('keydown', tecla);
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '📜 Historial de la partida', accion: verHistorial }, { texto: '🗂️ Partidas anteriores', accion: () => api.modal('🗂️ Partidas anteriores', htmlPartidas(api)) }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  if (S) { armar(); pintar(); bucle(); } else setup();
}
export function unmount() { clearTimeout(timer); if (arr) { arr.destruir(); arr = null; } if (root) { root.removeEventListener('click', clic); root.removeEventListener('keydown', tecla); } S = null; asp = null; }
function guardar() { if (!S) return; const d = { s: S, marcador, reg, ord, hm }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- pantallas ---------- */
function setup() {
  S = null; clearTimeout(timer);
  const seg = (k, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${cfg[k] === v ? 'on' : ''}" data-cfg="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  root.innerHTML = `<p class="note">Continental con dos barajas francesas y comodines opcionales: 7 rondas con un <b>contrato</b> cada vez más difícil. Bájate cuando lo tengas, coloca cartas en la mesa y quédate sin cartas. Gana quien menos puntos sume al final.</p>
    <div class="bar"><span class="lbl">Rivales</span>${seg('rivales', [[1, '1 CPU'], [2, '2 CPU'], [3, '3 CPU']])}</div>
    <div class="bar"><span class="lbl">Nivel</span>${seg('nivel', Object.entries(K.NIVEL))}</div>
    ${chkComodines()}
    <ol class="cnlista">${K.CONTRATOS.map((c, i) => `<li>${c.nombre} <small>(${K.cartasRonda(i)} cartas)</small></li>`).join('')}</ol>
    <p class="note">Marcador: ${marcador.g} ganadas · ${marcador.p} perdidas.</p>
    <div class="bar"><button class="btn on" data-ac="start">Repartir</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>`;
}
const chkComodines = () => `<label class="chk"><input type="checkbox" data-chk="comodines" ${cfg.comodines ? 'checked' : ''}><span><b>Jugar con comodines</b>: ${K.numComodines(cfg.rivales + 1, true)} con ${cfg.rivales + 1} jugadores (3 con 2 o 3 jugadores, 4 con 4).</span></label>`;
function armar() {
  root.innerHTML = `<div class="cntop" id="cnTop"></div>
    <div class="mesa cnm">
      <div class="cnops" id="cnOps"></div>
      <div class="cnjugadas" id="cnMesa"></div>
      <div class="cncentro"><button type="button" class="cnpila" data-ac="mazo" id="cnMazo"></button><button type="button" class="cnpila" data-ac="descarte" id="cnDesc"></button></div>
      <div class="cnmsg" id="cnMsg" role="status" aria-live="polite"></div>
      <div class="ordbar" id="cnOrd"><span>Ordenar:</span><button type="button" data-ord="palo">Palo</button><button type="button" data-ord="numero">Número</button><em id="cnLibre">✋ a tu gusto</em></div>
      <div class="cnmano" id="cnMano"></div>
      <div class="cninfo" id="cnInfo"></div>
    </div>
    <div class="bar cnacc" id="cnAcc"></div>
    <div id="cnRes"></div>
    <ul class="cnlog" id="cnLog"></ul>
    <div class="bar"><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button><button class="btn" data-ac="nueva">Nueva partida</button></div>`;
  if (arr) arr.destruir();
  arr = hacerOrdenable($('#cnMano'), { sel: '.cnc', alSoltar: ids => { ord = { modo: 'libre', ids }; pintar(); guardar(); } });
}
function nuevaSetup() { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; clearTimeout(timer); api.borrar(); setup(); }
function empezar() {
  asp.sortear();
  hm = historialVacio();
  api.setPref('cfg', cfg);
  const jugadores = [{ nombre: 'Tú', cpu: false }, ...Array.from({ length: cfg.rivales }, (_, k) => ({ nombre: cfg.rivales === 1 ? 'CPU' : `CPU ${k + 1}`, cpu: true }))];
  S = K.crear({ jugadores, nivel: cfg.nivel, comodines: cfg.comodines }); reg = false; sel = null; robada = -1; ord = { modo: ord.modo === 'libre' ? 'palo' : ord.modo, ids: [] };
  armar(); pintar(); guardar(); bucle();
}

/* ---------- pintado ---------- */
const cartaX = (id, clase = '') => (K.esComodin(id) ? `<div class="carta comodin ${clase}" aria-label="Comodín"><b class="cr">★</b><span class="cc">🃏</span></div>` : cartaHTML(K.carta(id), { clase }));
const nombreX = id => (K.esComodin(id) ? 'Comodín' : nombreCarta(K.carta(id)));
// Historial mano a mano: al terminar cada mano se apuntan los puntos que ha sumado cada uno
function puntosMano() {
  const act = S.jug.map(J => J.total), prev = hm.filas.reduce((t, f) => t.map((v, k) => v + f[k]), act.map(() => 0));
  return act.map((v, k) => v - prev[k]);
}
function seguirHistorial() { if (S && (S.fase === 'finRonda' || S.fase === 'fin') && !hm.marcada) seguir(hm, true, puntosMano()); else if (S && !(S.fase === 'finRonda' || S.fase === 'fin')) seguir(hm, false); }
function verHistorial() {
  if (!S) { api.modal('📜 Historial de la partida', htmlPartidas(api)); return; }
  api.modal('📜 Historial de la partida', htmlTabla(S.jug.map(J => J.nombre), hm.filas, { titulo: 'Ronda', menosEsMejor: true }) + '<p class="note">Puntos sumados en cada mano: gana quien menos tenga.</p>');
}
function pintar() {
  seguirHistorial();
  if (!S || !$('#cnMesa')) return;
  const yo = S.jug[0], miTurno = S.turno === 0 && (S.fase === 'robar' || S.fase === 'descartar'), Kc = K.contrato(S);
  if (sel != null && !yo.cartas.includes(sel)) sel = null;
  $('#cnTop').innerHTML = `<span class="ron">Ronda ${S.ronda + 1}/7</span><span class="con">📜 ${Kc.nombre}</span><span class="pts">Llevas ${yo.total} pts</span>`;
  $('#cnOps').style.setProperty('--no', S.jug.length - 1);
  $('#cnOps').innerHTML = S.jug.map((J, k) => k === 0 ? '' : `<div class="cnseat ${S.turno === k && S.fase !== 'finRonda' && S.fase !== 'fin' ? 'turno' : ''}"><div class="nom">${esc(J.nombre)}</div><div class="cs">${J.cartas.slice(0, 9).map(() => cartaHTML(0, { oculta: true })).join('')}</div><div class="pt">${pl(J.cartas.length, 'carta')} · ${J.total} pts${J.bajado ? ' · ✓ bajado' : ''}</div></div>`).join('');
  // jugadas bajadas, agrupadas por jugador
  const puedo = miTurno && S.fase === 'descartar' && K.puedeColocar(S, 0) && sel != null && yo.cartas.length > 1;
  const grupos = S.jug.map((J, j) => ({ j, sets: S.mesa.map((s, k) => ({ s, k })).filter(x => x.s.dueno === j) })).filter(g => g.sets.length);
  $('#cnMesa').innerHTML = grupos.length ? grupos.map(g => `<div class="cngr"><small>${esc(S.jug[g.j].nombre)}</small>${g.sets.map(({ s, k }) => { const cabe = puedo && K.encaja(S, k, sel); return `<div class="cnset ${cabe ? 'cabe' : ''}" ${cabe ? `data-col="${k}" role="button" tabindex="0" aria-label="Colocar aquí"` : ''}>${s.cartas.map(id => cartaX(id)).join('')}${cabe ? '<span class="mas">＋</span>' : ''}</div>`; }).join('')}</div>`).join('') : `<p class="cnvacia">Nadie se ha bajado todavía. Contrato: <b>${Kc.nombre.toLowerCase()}</b>.</p>`;
  // mazo y descarte
  const top = S.descarte[S.descarte.length - 1], robo = miTurno && S.fase === 'robar';
  $('#cnMazo').innerHTML = `${cartaHTML(0, { oculta: true })}<small>Mazo · ${S.mazo.length}</small>`;
  $('#cnDesc').innerHTML = `${top != null ? cartaX(top) : '<div class="vacio"></div>'}<small>Descarte</small>`;
  for (const id of ['#cnMazo', '#cnDesc']) { $(id).classList.toggle('activa', robo); $(id).disabled = !robo; }
  $('#cnDesc').setAttribute('aria-label', top != null ? `Robar del descarte: ${nombreX(top)}` : 'Descarte vacío');
  // mi mano
  const bajada = miTurno && S.fase === 'descartar' && !yo.bajado ? K.mejorBajada(yo.cartas, Kc) : null;
  const enBajada = new Set(bajada ? bajada.jugadas.flat() : []);
  root.querySelectorAll('#cnOrd [data-ord]').forEach(b => b.classList.toggle('on', b.dataset.ord === ord.modo));
  $('#cnLibre').hidden = ord.modo !== 'libre';
  if (!(arr && arr.activo())) {
    const mano = ordenarMano(yo.cartas, ord, { palo: x => (K.esComodin(x) ? 9 : K.palo(x)), num: x => (K.esComodin(x) ? 99 : K.rango(x)) });
    $('#cnMano').className = 'cnmano' + (miTurno && S.fase === 'descartar' ? ' turno' : '');
    $('#cnMano').innerHTML = mano.map(id => `<div class="cnc ${sel === id ? 'sel' : ''} ${id === robada ? 'nueva' : ''} ${id === S.cogida ? 'bloq' : ''} ${enBajada.has(id) ? 'liga' : ''}" data-c="${id}" role="button" tabindex="0" aria-label="${nombreX(id)}">${cartaX(id)}</div>`).join('');
  }
  $('#cnInfo').textContent = `${pl(yo.cartas.length, 'carta')} · ${pl(K.puntosMano(yo.cartas), 'punto')} en la mano${yo.bajado ? ' · ✓ te has bajado' : ''}`;
  // mensaje y acciones
  const m = $('#cnMsg');
  if (S.fase === 'fin') m.innerHTML = S.ganador === 0 ? '🏆 <b>¡Has ganado la partida!</b>' : `<b>${esc(S.jug[S.ganador].nombre)}</b> gana la partida.`;
  else if (S.fase === 'finRonda') m.innerHTML = S.ganadorRonda < 0 ? 'Se acabó el mazo: todos suman sus cartas.' : S.ganadorRonda === 0 ? '🎉 <b>¡Cierras la ronda!</b>' : `<b>${esc(S.jug[S.ganadorRonda].nombre)}</b> cierra la ronda.`;
  else if (!miTurno) m.textContent = `${S.jug[S.turno].nombre} está jugando…`;
  else if (S.fase === 'robar') m.textContent = 'Tu turno: roba del mazo o del descarte.';
  else if (bajada) m.innerHTML = '¡Tienes el contrato! Pulsa <b>⬇️ Bajarse</b> (las cartas marcadas en verde).';
  else if (puedo) m.textContent = 'Toca una jugada marcada para colocar la carta, o tírala.';
  else if (yo.bajado && !K.puedeColocar(S, 0)) m.textContent = 'Te acabas de bajar: tira una carta. Desde el próximo turno podrás colocar en la mesa.';
  else m.textContent = sel == null ? 'Elige una carta para tirar (o para colocar en la mesa).' : `Vas a tirar: ${nombreX(sel)}.`;
  const acc = $('#cnAcc'), desc = miTurno && S.fase === 'descartar';
  acc.innerHTML = desc ? `${bajada ? '<button class="btn on" data-ac="bajar">⬇️ Bajarse</button>' : ''}${K.puedeColocar(S, 0) && yo.cartas.some(c => S.mesa.some((_, k) => K.encaja(S, k, c))) && yo.cartas.length > 1 ? '<button class="btn" data-ac="todo">✨ Colocar lo posible</button>' : ''}<button class="btn ${bajada ? '' : 'on'}" data-ac="tirar" ${sel == null || (sel === S.cogida && yo.cartas.length > 1) ? 'disabled' : ''}>🗑️ Tirar</button>` : '';
  acc.hidden = !desc;
  pintarRes();
  $('#cnLog').innerHTML = S.log.map(l => `<li>${esc(l)}</li>`).join('');
}
function pintarRes() {
  const el = $('#cnRes');
  if (S.fase !== 'finRonda' && S.fase !== 'fin') { el.innerHTML = ''; return; }
  const fin = S.fase === 'fin';
  el.innerHTML = `<div class="cnres"><h3>${fin ? '🏆 Clasificación final' : `Fin de la ronda ${S.ronda + 1} · ${K.CONTRATOS[S.ronda].nombre}`}</h3>
    ${S.jug.map((J, k) => `<div class="cnrf ${k === S.ganadorRonda ? 'gana' : ''}"><b>${esc(J.nombre)}</b><div class="cs">${J.cartas.map(id => cartaX(id)).join('') || '<small>Cerró ✔</small>'}</div><span>+${J.rondas[J.rondas.length - 1] ?? 0}</span></div>`).join('')}
    <div class="cntabla"><table><tr><th></th>${K.CONTRATOS.map((_, i) => `<th>${i + 1}</th>`).join('')}<th>Total</th></tr>${S.jug.map((J, k) => `<tr class="${fin && k === S.ganador ? 'gana' : ''}"><td>${esc(J.nombre)}</td>${K.CONTRATOS.map((_, i) => `<td>${J.rondas[i] ?? ''}</td>`).join('')}<td><b>${J.total}</b></td></tr>`).join('')}</table></div>
    <div class="bar" style="justify-content:center">${fin ? '<button class="btn on" data-ac="otra">🔁 Otra partida</button><button class="btn" data-ac="setup">Cambiar opciones</button>' : `<button class="btn on" data-ac="siguiente">Ronda ${S.ronda + 2}: ${K.CONTRATOS[S.ronda + 1].nombre}</button>`}</div></div>`;
}

/* ---------- acciones ---------- */
function robarYo(delDesc) {
  if (!S || S.turno !== 0 || S.fase !== 'robar') return;
  const c = K.robar(S, 0, delDesc); if (c === false) return;
  sel = null; robada = c === 'fin' ? -1 : c; api.sonido('click'); pintar(); guardar(); if (c === 'fin') bucle();
}
function tirarYo() {
  if (sel == null) return;
  if (sel === S.cogida && S.jug[0].cartas.length > 1) { api.aviso('No puedes tirar la carta que acabas de coger del descarte.'); return; }
  K.tirar(S, 0, sel); sel = null; robada = -1; api.sonido('mover'); pintar(); guardar(); bucle();
}
function bajarYo() {
  const b = K.mejorBajada(S.jug[0].cartas, K.contrato(S)); if (!b) return;
  const err = K.bajar(S, 0, b.jugadas); if (err) { api.aviso(err); return; }
  sel = null; api.sonido('ok'); api.vibrar([40, 30, 40]); pintar(); guardar();
}
function colocarYo(k) {
  if (sel == null || !K.colocar(S, 0, sel, k)) { api.sonido('error'); return; }
  sel = null; api.sonido('mover'); pintar(); guardar();
}
function colocarTodo() {
  let n = 0, hecho = true; const J = S.jug[0];
  while (hecho && J.cartas.length > 1) { hecho = false; for (const c of J.cartas) { const k = S.mesa.findIndex((_, i) => K.encaja(S, i, c)); if (k >= 0 && K.colocar(S, 0, c, k)) { n++; hecho = true; break; } } }
  sel = null; if (n) api.sonido('mover'); api.aviso(n ? `Has colocado ${n} carta${n > 1 ? 's' : ''}.` : 'No hay cartas que encajen.'); pintar(); guardar();
}
function elegir(id) {
  if (!S || S.turno !== 0 || S.fase !== 'descartar') return;
  if (sel === id) return tirarYo();                        // segundo toque: tirar
  sel = id; api.sonido('click'); pintar();
}
function bucle() {
  clearTimeout(timer); if (!S) return;
  if (S.fase === 'fin') return cierre();
  if (S.fase === 'finRonda' || S.turno === 0) return;
  timer = setTimeout(() => { if (!S) return; K.cpuTurno(S, S.turno); api.sonido('mover'); pintar(); guardar(); bucle(); }, 1000);
}
function cierre() {
  if (!reg) {
    reg = true; const gano = S.ganador === 0; if (gano) marcador.g++; else marcador.p++;
    anotarPartida(api, { res: gano ? 'g' : 'p', texto: `${S.jug.length} jugadores · tus puntos ${S.jug[0].total}` });
    api.registrar({ res: gano ? 'victoria' : 'derrota', variante: `${S.jug.length} jugadores · ${K.NIVEL[S.nivel]}${S.nCom ? '' : ' · sin comodines'}` });
    api.sonido(gano ? 'ganar' : 'perder'); if (gano) api.vibrar([60, 40, 60]);
  }
  pintar(); guardar();
}

/* ---------- entrada ---------- */
function tecla(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const t = e.target; if (t.dataset && t.dataset.c != null) { e.preventDefault(); elegir(+t.dataset.c); } else if (t.dataset && t.dataset.col != null) { e.preventDefault(); colocarYo(+t.dataset.col); }
}
function clic(e) {
  const ck = e.target.closest('input[data-chk]'); if (ck) { cfg[ck.dataset.chk] = ck.checked; return setup(); }
  const col = e.target.closest('[data-col]'); if (col && S) return colocarYo(+col.dataset.col);
  const k = e.target.closest('[data-c]'); if (k && S) return elegir(+k.dataset.c);
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.cfg) { cfg[d.cfg] = d.cfg === 'nivel' ? d.v : +d.v; return setup(); }
  if (d.ord) { ord = { modo: d.ord, ids: [] }; api.setPref('orden', d.ord); api.sonido('click'); if (S) { pintar(); guardar(); } return; }
  const a = d.ac;
  if (a === 'start') empezar(); else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas(); else if (a === 'nueva') nuevaSetup();
  else if (a === 'setup') { api.borrar(); setup(); } else if (a === 'otra') { api.borrar(); empezar(); }
  else if (!S) return;
  else if (a === 'mazo') robarYo(false); else if (a === 'descarte') robarYo(true);
  else if (a === 'tirar') tirarYo(); else if (a === 'bajar') bajarYo(); else if (a === 'todo') colocarTodo();
  else if (a === 'siguiente') { if (K.siguienteRonda(S)) { sel = null; robada = -1; api.sonido('click'); pintar(); guardar(); bucle(); } }
}
function reglas() {
  api.modal('Continental', `<ul><li>Dos barajas francesas, con comodines si lo eliges al repartir (3 con 2 o 3 jugadores, 4 con 4). Son <b>7 rondas</b>, cada una con un contrato y más cartas: ${K.CONTRATOS.map((c, i) => `${i + 1}) ${c.nombre.toLowerCase()} (${K.cartasRonda(i)})`).join('; ')}.</li>
    <li><b>Trío</b>: 3 o más cartas del mismo número. <b>Escalera</b>: 4 o más cartas seguidas del mismo palo; el As puede ir abajo (A-2-3-4) o arriba (J-Q-K-A), pero no da la vuelta. Los comodines rellenan huecos (en cada jugada, al menos tantas cartas normales como comodines).</li>
    <li>En tu turno: <b>roba</b> del mazo o la carta de arriba del descarte, y <b>tira</b> una (no la que acabas de coger del descarte). Toca una carta para elegirla y pulsa 🗑️ Tirar, o tócala dos veces.</li>
    <li><b>Bajarse</b>: cuando tienes el contrato exacto, pulsa ⬇️ Bajarse (la app elige la mejor combinación; tus cartas del contrato se marcan en verde). Hay que quedarse al menos con una carta para tirar.</li>
    <li>Desde el <b>turno siguiente</b> a bajarte puedes <b>colocar</b> cartas en cualquier jugada de la mesa (tuya o de otros): elige la carta y toca la jugada marcada con ＋, o usa ✨ Colocar lo posible.</li>
    <li>La ronda acaba cuando alguien se queda sin cartas. Los demás suman: del 2 al 9 su valor, 10 y figuras 10, As 20 y comodín 50. Si el mazo se acaba dos veces, la ronda termina y todos suman lo que tengan.</li>
    <li>Tras la 7.ª ronda gana quien menos puntos tenga.</li></ul>`);
}
