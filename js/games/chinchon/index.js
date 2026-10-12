import { $, esc } from '../../core/dom.js';
import { cartaEsHTML, asegurarSprites, nombreEs } from '../../core/cartas.js';
import { grupoMesa, grupoDorso } from '../../core/aspectos.js';
import * as C from './motor.js';
import { hacerOrdenable, ordenarMano, validarOrden } from '../../core/arrastrar.js';

let S = null, api = null, asp = null, root = null, timer = null, reg = false, sel = null, robada = -1, ocupado = false;
const MODOS = ['jugadas', 'palo', 'numero', 'libre'];
let ord = { modo: 'jugadas', ids: [] }, arr = null;
let cfg = { rivales: 1, nivel: 'medio', limite: 100, cierre: 5 }, marcador = { g: 0, p: 0 };

/* ---------- validación / resumen ---------- */
export function validar(d) {
  const s = d && C.validar(d.s); if (!s) return null;
  const m = d.marcador && typeof d.marcador === 'object' ? d.marcador : {}, e = v => (Number.isInteger(v) && v >= 0 && v <= 99999 ? v : 0);
  return { s, marcador: { g: e(m.g), p: e(m.p) }, reg: !!d.reg, ord: validarOrden(d.ord, MODOS) };
}
export const migrarV1 = d => d;
export function resumen(d) {
  const s = d.s;
  if (s.fase === 'fin') return { texto: `${s.jug.length} jugadores · ${s.ganador === 0 ? '¡Ganaste!' : `ganó ${s.jug[s.ganador].nombre}`}`, fin: true };
  return { texto: `Mano ${s.mano} · tienes ${s.jug[0].total} de ${s.limite}`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; sel = null; robada = -1; ocupado = false; asegurarSprites();
  asp = api.aspecto([grupoMesa(), grupoDorso()]);
  await api.css(new URL('../../../css/cartas.css', import.meta.url)); await api.css(new URL('./chinchon.css', import.meta.url));
  const c0 = api.pref('cfg', null);
  if (c0 && [1, 2, 3].includes(c0.rivales) && C.NIVEL[c0.nivel] && C.LIMITES.includes(c0.limite) && C.CIERRES.includes(c0.cierre)) cfg = { ...c0 };
  const g = api.cargar();
  const modoPref = MODOS.includes(api.pref('orden', 'jugadas')) ? api.pref('orden', 'jugadas') : 'jugadas';
  ord = { modo: modoPref, ids: [] }; arr = null;
  if (g) { S = g.s; marcador = g.marcador; reg = g.reg; if (g.ord) ord = g.ord; } else S = null;
  root.addEventListener('click', clic); root.addEventListener('keydown', tecla);
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  if (S) { armar(); pintar(); bucle(); } else setup();
}
export function unmount() { if (arr) { arr.destruir(); arr = null; } clearTimeout(timer); if (root) { root.removeEventListener('click', clic); root.removeEventListener('keydown', tecla); } S = null; asp = null; }
function guardar() { if (!S) return; const d = { s: S, marcador, reg, ord }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- pantallas ---------- */
function setup() {
  S = null; clearTimeout(timer);
  const seg = (k, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${cfg[k] === v ? 'on' : ''}" data-cfg="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  root.innerHTML = `<p class="note">Chinchón con baraja española de 40 cartas. Forma tríos, cuartetos y escaleras del mismo palo, y cierra cuando te queden pocas cartas sueltas. Si pasas del límite de puntos quedas eliminado: gana el último que quede… o quien haga <b>chinchón</b> (escalera de 7).</p>
    <div class="bar"><span class="lbl">Rivales</span>${seg('rivales', [[1, '1 CPU'], [2, '2 CPU'], [3, '3 CPU']])}</div>
    <div class="bar"><span class="lbl">Nivel</span>${seg('nivel', Object.entries(C.NIVEL))}</div>
    <div class="bar"><span class="lbl">Límite</span>${seg('limite', C.LIMITES.map(v => [v, `${v} puntos`]))}</div>
    <div class="bar"><span class="lbl">Cerrar con</span>${seg('cierre', C.CIERRES.map(v => [v, `≤ ${v} sueltos`]))}</div>
    <p class="note">Marcador: ${marcador.g} ganadas · ${marcador.p} perdidas.</p>
    <div class="bar"><button class="btn on" data-ac="start">Repartir</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>`;
}
function armar() {
  root.innerHTML = `<div class="chtop"><span id="chInfo"></span><span id="chMarc"></span></div>
    <div class="mesa chm">
      <div class="chopps" id="chOpps"></div>
      <div class="chcentro">
        <button type="button" class="chpila" data-ac="mazo" id="chMazo" aria-label="Robar del mazo"></button>
        <button type="button" class="chpila" data-ac="descarte" id="chDesc" aria-label="Robar del descarte"></button>
      </div>
      <div class="chmsg" id="chMsg" role="status" aria-live="polite"></div>
      <div class="ordbar" id="chOrd"><span>Ordenar:</span><button type="button" data-ord="jugadas">Jugadas</button><button type="button" data-ord="palo">Palo</button><button type="button" data-ord="numero">Número</button><em id="chOrdLibre">✋ a tu gusto</em></div>
      <div class="chmano" id="chMano"></div>
      <div class="chsue" id="chSue"></div>
    </div>
    <div class="bar chacc" id="chAcc"><button class="btn" data-ac="tirar" id="chTirar">🗑️ Tirar carta</button><button class="btn on" data-ac="cerrar" id="chCerrar">🔒 Cerrar</button></div>
    <div id="chRec"></div>
    <ul class="chlog" id="chLog"></ul>
    <div class="bar"><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button><button class="btn" data-ac="nueva">Nueva partida</button></div>`;
  montarArrastre();
}
function montarArrastre() {
  if (arr) arr.destruir();
  arr = hacerOrdenable($('#chMano'), { sel: '.chc', puede: () => !!S && S.fase !== 'recuento' && S.fase !== 'fin',
    alSoltar: ids => { ord = { modo: 'libre', ids }; api.sonido('click'); pintar(); guardar(); } });
}
function nuevaSetup() { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; clearTimeout(timer); api.borrar(); setup(); }
function empezar() {
  api.setPref('cfg', cfg);
  const jugadores = [{ nombre: 'Tú', cpu: false }, ...Array.from({ length: cfg.rivales }, (_, k) => ({ nombre: cfg.rivales === 1 ? 'CPU' : `CPU ${k + 1}`, cpu: true }))];
  S = C.crear({ jugadores, nivel: cfg.nivel, limite: cfg.limite, cierre: cfg.cierre }); reg = false; sel = null; robada = -1; ord = { modo: ord.modo === 'libre' ? 'jugadas' : ord.modo, ids: [] };
  armar(); pintar(); guardar(); bucle();
}

/* ---------- pintado ---------- */
const carta = (c, extra = '') => cartaEsHTML(c, { clase: extra });
const fila = cs => cs.map(c => carta(c)).join('');
function pintar() {
  if (!S || !$('#chOpps')) return;
  const yo = S.manos[0], miTurno = S.turno === 0 && (S.fase === 'robar' || S.fase === 'descartar');
  $('#chInfo').textContent = `Mano ${S.mano} · límite ${S.limite} puntos`;
  $('#chMarc').textContent = `✔ ${marcador.g} · ✘ ${marcador.p}`;
  // rivales
  const opps = S.jug.map((j, k) => k).slice(1);
  $('#chOpps').style.setProperty('--no', opps.length);
  $('#chOpps').innerHTML = opps.map(k => { const j = S.jug[k], turno = S.turno === k && (S.fase === 'robar' || S.fase === 'descartar');
    return `<div class="chseat ${turno ? 'turno' : ''} ${j.fuera ? 'fuera' : ''}"><div class="nom">${esc(j.nombre)}</div><div class="cs">${j.fuera ? '<span class="elim">Eliminado</span>' : S.manos[k].map(() => cartaEsHTML(0, { oculta: true })).join('')}</div><div class="pts"><b>${j.total}</b> / ${S.limite}</div></div>`; }).join('');
  // mazo y descarte
  const top = S.descarte[S.descarte.length - 1], puedeRobar = miTurno && S.fase === 'robar' && !ocupado;
  $('#chMazo').innerHTML = `${S.mazo.length ? cartaEsHTML(0, { oculta: true }) : '<div class="vacio">↻</div>'}<small>Mazo · ${S.mazo.length}</small>`;
  $('#chDesc').innerHTML = `${top != null ? carta(top) : '<div class="vacio"></div>'}<small>Descarte</small>`;
  $('#chMazo').classList.toggle('activa', puedeRobar); $('#chDesc').classList.toggle('activa', puedeRobar && top != null);
  $('#chMazo').disabled = !puedeRobar; $('#chDesc').disabled = !puedeRobar || top == null;
  $('#chDesc').setAttribute('aria-label', top != null ? `Robar del descarte: ${nombreEs(top)}` : 'Descarte vacío');
  // mi mano ordenada en jugadas
  const r = C.mejor(yo), cierres = miTurno && S.fase === 'descartar' ? C.cierres(S, 0) : [], cierra = new Set(cierres.map(x => x.c));
  if (sel != null && !yo.includes(sel)) sel = null;
  const cartaMano = c => `<div class="chc ${sel === c ? 'sel' : ''} ${c === robada ? 'nueva' : ''} ${c === S.cogida ? 'bloq' : ''} ${cierra.has(c) ? 'cierra' : ''}" data-c="${c}" role="button" tabindex="0" aria-label="${nombreEs(c)}${c === S.cogida ? ' (recién cogida del descarte: no se puede tirar)' : ''}">${carta(c)}</div>`;
  const vista = S.fase === 'recuento' || S.fase === 'fin';
  $('#chMano').className = 'chmano' + (miTurno && S.fase === 'descartar' ? ' turno' : '');
  root.querySelectorAll('#chOrd [data-ord]').forEach(b => b.classList.toggle('on', b.dataset.ord === ord.modo));
  $('#chOrdLibre').hidden = ord.modo !== 'libre'; $('#chOrd').hidden = vista;
  if (!(arr && arr.activo())) {                       // nunca repintar la mano mientras se arrastra una carta
    if (vista) $('#chMano').innerHTML = '';
    else if (ord.modo === 'jugadas') $('#chMano').innerHTML = r.ligas.map(l => `<div class="chg liga" title="${l.every(c => C.pos(c) === C.pos(l[0])) ? 'Trío / cuarteto' : 'Escalera'}">${l.map(cartaMano).join('')}</div>`).join('') + (r.sueltas.length ? `<div class="chg">${r.sueltas.map(cartaMano).join('')}</div>` : '');
    else {
      const enLiga = new Set(r.ligas.flat());
      $('#chMano').innerHTML = `<div class="chg plano">${ordenarMano(yo, ord, { palo: C.palo, num: C.pos }).map(c => cartaMano(c).replace('class="chc ', `class="chc ${enLiga.has(c) ? 'enliga ' : ''}`)).join('')}</div>`;
    }
  }
  $('#chSue').textContent = vista ? '' : `Sueltas: ${r.puntos} punto${r.puntos === 1 ? '' : 's'} · Tienes ${S.jug[0].total} de ${S.limite}`;
  // acciones
  const desc = miTurno && S.fase === 'descartar';
  $('#chAcc').hidden = !desc;
  $('#chTirar').disabled = !desc || sel == null || sel === S.cogida;
  $('#chCerrar').disabled = !desc || sel == null || !cierra.has(sel);
  const op = cierres.find(x => x.c === sel);
  $('#chCerrar').textContent = op && op.chinchon ? '🏆 ¡Chinchón!' : op ? `🔒 Cerrar${op.puntos ? ` (${op.puntos})` : ' (−10)'}` : '🔒 Cerrar';
  // mensaje
  const m = $('#chMsg'); let t = '';
  if (S.fase === 'fin') t = S.ganador === 0 ? '🏆 ¡Has ganado la partida!' : `${esc(S.jug[S.ganador].nombre)} gana la partida.`;
  else if (S.fase === 'recuento') t = S.recuento && S.recuento.nula ? 'Mano nula: se vuelve a repartir.' : `${esc(S.jug[S.recuento.cierra].nombre)} cierra.`;
  else if (!miTurno) t = `${esc(S.jug[S.turno].nombre)} está jugando…`;
  else if (S.fase === 'robar') t = 'Tu turno: roba del mazo o del descarte.';
  else if (cierres.some(x => x.chinchon)) t = '¡Tienes CHINCHÓN! Elige la carta que sobra y pulsa el botón.';
  else if (cierres.length) t = '¡Puedes cerrar! Elige la carta a tirar (marcadas en verde).';
  else t = sel == null ? 'Elige una carta para tirar.' : `Vas a tirar: ${nombreEs(sel)}.`;
  m.innerHTML = t;
  pintarRecuento();
  $('#chLog').innerHTML = S.log.map(l => `<li>${esc(l)}</li>`).join('');
}
function pintarRecuento() {
  const el = $('#chRec');
  if (S.fase !== 'recuento' && S.fase !== 'fin') { el.innerHTML = ''; return; }
  const R = S.recuento;
  if (!R || R.nula) { el.innerHTML = `<div class="chres"><h3>Mano nula</h3><p class="note">El mazo se agotó dos veces sin que nadie cerrara. No se suman puntos.</p><div class="bar" style="justify-content:center"><button class="btn on" data-ac="siguiente">Siguiente mano</button></div></div>`; return; }
  const filas = R.filas.map(f => {
    const j = S.jug[f.j], cierra = f.j === R.cierra;
    return `<div class="chrf ${cierra ? 'cierra' : ''}"><div class="chrh"><b>${cierra ? '🔒 ' : ''}${esc(j.nombre)}</b><span>${R.chinchon ? (cierra ? '¡CHINCHÓN!' : '') : `${f.puntos > 0 ? '+' : ''}${f.puntos} → <b>${j.total}</b>${j.fuera ? ' · eliminado' : ''}`}</span></div>
      <div class="chrc">${f.ligas.map(l => `<span class="g liga">${fila(l)}</span>`).join('')}${f.coloca.length ? `<span class="g coloca" title="Colocadas en las jugadas de quien cierra">${fila(f.coloca)}</span>` : ''}${f.sueltas.length ? `<span class="g suelta">${fila(f.sueltas)}</span>` : ''}</div></div>`;
  }).join('');
  const fin = S.fase === 'fin';
  el.innerHTML = `<div class="chres"><h3>${fin ? (R.chinchon ? '🏆 ¡Chinchón!' : '🏆 Fin de la partida') : `Recuento de la mano ${S.mano}`}</h3>${filas}
    <p class="note">Verde: jugadas · azul: cartas colocadas en las jugadas de quien cierra · rojo: sueltas (suman puntos).</p>
    <div class="bar" style="justify-content:center">${fin ? '<button class="btn on" data-ac="setup">Nueva partida</button>' : '<button class="btn on" data-ac="siguiente">Siguiente mano</button>'}</div></div>`;
}

/* ---------- jugadas ---------- */
function robarHumano(desc) {
  if (!S || S.turno !== 0 || S.fase !== 'robar' || ocupado) return;
  const c = C.robar(S, desc); if (c === false) return;
  if (c === 'nula') { api.sonido('error'); pintar(); guardar(); return; }
  robada = c; sel = null; api.sonido('click'); pintar(); guardar();
}
function tirarHumano() {
  if (!S || S.turno !== 0 || S.fase !== 'descartar' || sel == null) return;
  if (sel === S.cogida) { api.aviso('No puedes tirar la carta que acabas de coger del descarte.'); return; }
  C.tirar(S, sel); sel = null; robada = -1; api.sonido('mover'); pintar(); guardar(); bucle();
}
function cerrarHumano() {
  if (!S || S.turno !== 0 || S.fase !== 'descartar' || sel == null) return;
  if (!C.cerrar(S, sel)) { api.aviso(`Para cerrar, las cartas sueltas deben sumar ${S.cierre} o menos.`); return; }
  sel = null; robada = -1; api.sonido(S.recuento.chinchon ? 'ganar' : 'ok'); api.vibrar([40, 30, 40]); pintar(); guardar(); bucle();
}
// Si te eliminan, la partida termina para ti: gana quien menos puntos tenga de los que siguen.
function finSiEliminado() {
  if (!S || S.fase !== 'recuento' || !S.jug[0].fuera) return;
  const quedan = C.activos(S); let g = quedan[0]; quedan.forEach(k => { if (S.jug[k].total < S.jug[g].total) g = k; });
  S.ganador = g; S.fase = 'fin'; S.log.unshift(`Quedas eliminado. Gana ${S.jug[g].nombre}, que va con menos puntos.`); S.log.length = Math.min(S.log.length, 6);
}
function bucle() {
  clearTimeout(timer); if (!S) return;
  finSiEliminado();
  if (S.fase === 'fin') return cierre();
  if (S.fase === 'recuento' || S.turno === 0) return;
  ocupado = true;
  timer = setTimeout(() => {
    if (!S) return;
    const desc = C.cpuRobar(S), c = C.robar(S, desc);
    if (c === 'nula') { ocupado = false; api.sonido('error'); pintar(); guardar(); return; }
    api.sonido('click'); pintar();
    timer = setTimeout(() => {
      if (!S) return;
      const t = C.cpuTirar(S);
      if (t.cerrar) { C.cerrar(S, t.c); api.sonido(S.recuento && S.recuento.chinchon ? 'perder' : 'ok'); } else { C.tirar(S, t.c); api.sonido('mover'); }
      ocupado = false; pintar(); guardar(); bucle();
    }, 750);
  }, 650);
}
function cierre() {
  ocupado = false;
  if (!reg) {
    reg = true; const gano = S.ganador === 0;
    if (gano) marcador.g++; else marcador.p++;
    api.registrar({ res: gano ? 'victoria' : 'derrota', variante: `${S.jug.length} jugadores · ${S.limite} puntos` });
    api.sonido(gano ? 'ganar' : 'perder'); if (gano) api.vibrar([60, 40, 60]);
  }
  pintar(); guardar();
}

/* ---------- entrada ---------- */
function elegir(c) {
  if (!S || S.turno !== 0 || S.fase !== 'descartar') return;
  if (sel === c && c !== S.cogida) {                  // segundo toque: cerrar si se puede, si no tirar
    if (C.cierres(S, 0).some(x => x.c === c)) cerrarHumano(); else tirarHumano();
    return;
  }
  sel = c; api.sonido('click'); pintar();
}
function tecla(e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.c != null) { e.preventDefault(); elegir(+e.target.dataset.c); } }
function clic(e) {
  const k = e.target.closest('[data-c]'); if (k && S) return elegir(+k.dataset.c);
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.cfg) { const v = d.cfg === 'nivel' ? d.v : +d.v; cfg[d.cfg] = v; return setup(); }
  if (d.ord) { ord = { modo: d.ord, ids: [] }; api.setPref('orden', d.ord); api.sonido('click'); if (S) { pintar(); guardar(); } return; }
  const a = d.ac;
  if (a === 'start') empezar(); else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas(); else if (a === 'nueva') nuevaSetup();
  else if (a === 'setup') { api.borrar(); setup(); }
  else if (!S) return;
  else if (a === 'mazo') robarHumano(false); else if (a === 'descarte') robarHumano(true);
  else if (a === 'tirar') tirarHumano(); else if (a === 'cerrar') cerrarHumano();
  else if (a === 'siguiente') { if (C.siguienteMano(S)) { sel = null; robada = -1; api.sonido('click'); pintar(); guardar(); bucle(); } }
}
function reglas() {
  api.modal('Chinchón', `<ul><li>Se juega con la <b>baraja española de 40 cartas</b>. Cada jugador recibe 7 cartas.</li>
    <li><b>Jugadas</b>: tríos o cuartetos del mismo número, y escaleras de 3 o más cartas seguidas del mismo palo (el 7 va seguido de la sota). Tu mano se ordena sola mostrando tus jugadas.</li>
    <li>En tu turno <b>robas</b> una carta (del mazo o la de arriba del descarte) y <b>tiras</b> una. No puedes tirar la carta que acabas de coger del descarte.</li>
    <li>Toca una carta para elegirla y pulsa 🗑️ Tirar (o tócala otra vez).</li>
    <li><b>Ordenar tu mano</b>: «Jugadas» agrupa solo tus combinaciones; «Palo» y «Número» ordenan las cartas (las que forman jugada llevan una marca verde). También puedes <b>arrastrar</b> cualquier carta para colocarla donde quieras.</li>
    <li><b>Cerrar</b>: al tirar, si las cartas que no forman jugada suman ${S ? S.cierre : cfg.cierre} o menos, puedes cerrar la mano. Las cartas con las que se puede cerrar se marcan en verde. Cerrar sin ninguna suelta <b>resta 10 puntos</b>.</li>
    <li>Al cerrar, los demás enseñan sus cartas: las que no forman jugada suman puntos (del 1 al 7 su valor; sota, caballo y rey, 10). Se colocan solas en las jugadas de quien cierra si encajan.</li>
    <li><b>¡Chinchón!</b>: escalera de 7 cartas del mismo palo. Gana la partida al instante.</li>
    <li>Quien pasa del límite (50 o 100 puntos) queda <b>eliminado</b>. Gana el último jugador que quede.</li>
    <li>Si el mazo se agota dos veces sin que nadie cierre, la mano es nula y se reparte de nuevo.</li></ul>`);
}
