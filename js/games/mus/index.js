import { $, esc } from '../../core/dom.js';
import { anotarPartida, htmlPartidas, historialVacio, validarHistorial, seguir, htmlTabla } from '../../core/historial.js';
import { cartaEsHTML, asegurarSprites, nombreEs } from '../../core/cartas.js';
import { grupoMesa, grupoDorso, grupoBarajaEs } from '../../core/aspectos.js';
import * as M from './motor.js';
import { hacerOrdenable, ordenarMano, validarOrden } from '../../core/arrastrar.js';

let S = null, api = null, asp = null, root = null, timer = null, reg = false, selDesc = new Set(), dichos = {}, lanceVisto = -9, manoVista = -1;
let hm = historialVacio();                                   // tabla de puntos mano a mano (se guarda con la partida)
let cfg = { nivel: 'medio', meta: 40, juegos: 1, reyes: 8 }, marcador = { g: 0, p: 0 };
const NOM = M.NOMBRES, MODOS = ['libre', 'palo', 'numero'];
let ord = { modo: 'libre', ids: [] }, arr = null;

/* ---------- validación / resumen ---------- */
export function validar(d) {
  const s = d && M.validar(d.s); if (!s) return null;
  const m = d.marcador && typeof d.marcador === 'object' ? d.marcador : {}, e = v => (Number.isInteger(v) && v >= 0 && v <= 99999 ? v : 0);
  return { s, marcador: { g: e(m.g), p: e(m.p) }, reg: !!d.reg, ord: validarOrden(d.ord, MODOS), hm: validarHistorial(d.hm, 2) };
}
export const migrarV1 = d => d;
export function resumen(d) {
  const s = d.s;
  if (s.fase === 'fin') return { texto: s.ganador === 0 ? '¡Ganasteis la partida!' : 'Perdisteis la partida', fin: true };
  return { texto: `Vosotros ${s.pts[0]} · Ellos ${s.pts[1]} (a ${s.meta})`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; selDesc = new Set(); dichos = {}; lanceVisto = -9; manoVista = -1; asegurarSprites();
  asp = api.aspecto([grupoMesa(), grupoDorso(), grupoBarajaEs()]);
  await api.css(new URL('../../../css/cartas.css', import.meta.url)); await api.css(new URL('./mus.css', import.meta.url));
  const c0 = api.pref('cfg', null);
  if (c0 && M.NIVEL[c0.nivel] && M.METAS.includes(c0.meta) && M.JUEGOS.includes(c0.juegos) && M.REYES.includes(c0.reyes)) cfg = { ...c0 };
  const g = api.cargar();
  const modoPref = MODOS.includes(api.pref('orden', 'libre')) ? api.pref('orden', 'libre') : 'libre';
  ord = { modo: modoPref, ids: [] }; arr = null;
  if (g) { S = g.s; marcador = g.marcador; reg = g.reg; if (g.ord) ord = g.ord; hm = g.hm || historialVacio(); } else { S = null; hm = historialVacio(); }
  root.addEventListener('click', clic); root.addEventListener('keydown', tecla);
  api.barra({ nueva: () => { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; clearTimeout(timer); empezar(); },
    salir: () => { clearTimeout(timer); api.borrar(); setup(); },
    pausar: () => clearTimeout(timer),
    reanudar: () => { if (S && S.fase !== 'fin') bucle(); },
    config: { valores: () => ({ ...cfg }), grupos: v => [{ clave: 'nivel', titulo: 'Nivel CPU', opciones: Object.entries(M.NIVEL) }, { clave: 'meta', titulo: 'Tantos', opciones: M.METAS.map(x => [x, `A ${x}`]) }, { clave: 'juegos', titulo: 'Partida', opciones: [[1, 'Un juego'], [2, 'Mejor de 3']] }, { clave: 'reyes', titulo: 'Reyes', opciones: [[8, '8 reyes'], [4, '4 reyes']] }], aplicar: v => { Object.assign(cfg, v); empezar(); } } });
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '📜 Historial de la partida', accion: verHistorial }, { texto: '🗂️ Partidas anteriores', accion: () => api.modal('🗂️ Partidas anteriores', htmlPartidas(api)) }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  if (S) { armar(); pintar(); bucle(); } else setup();
}
export function unmount() { if (arr) { arr.destruir(); arr = null; } clearTimeout(timer); if (root) { root.removeEventListener('click', clic); root.removeEventListener('keydown', tecla); } S = null; asp = null; }
function guardar() { if (!S) return; const d = { s: S, marcador, reg, ord, hm }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- pantallas ---------- */
function setup() {
  S = null; clearTimeout(timer);
  const seg = (k, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${cfg[k] === v ? 'on' : ''}" data-cfg="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  root.innerHTML = `<p class="note">Mus por parejas con baraja española: tú y tu compañero (enfrente) contra dos rivales. Se juegan cuatro lances —<b>Grande, Chica, Pares y Juego</b> (o Punto)— con envites, «quiero», «no quiero» y órdagos.</p>
    <div class="bar"><span class="lbl">Nivel CPU</span>${seg('nivel', Object.entries(M.NIVEL))}</div>
    <div class="bar"><span class="lbl">Tantos</span>${seg('meta', M.METAS.map(v => [v, `A ${v}`]))}</div>
    <div class="bar"><span class="lbl">Partida</span>${seg('juegos', [[1, 'Un juego'], [2, 'Mejor de 3']])}</div>
    <div class="bar"><span class="lbl">Reyes</span>${seg('reyes', [[8, '8 reyes'], [4, '4 reyes']])}</div>
    <p class="note">${cfg.reyes === 8 ? 'Con 8 reyes, los treses valen como reyes y los doses como ases.' : 'Con 4 reyes, cada carta vale lo que es.'} Marcador: ${marcador.g} ganadas · ${marcador.p} perdidas.</p>
    <div class="bar"><button class="btn on" data-ac="start">Repartir</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>`;
}
function armar() {
  root.innerHTML = `<div class="mstop" id="msTop"></div>
    <div class="mesa msm">
      <div class="msseat arriba" id="msS2"></div>
      <div class="msmid"><div class="msseat lado" id="msS3"></div><div class="mslances" id="msLances"></div><div class="msseat lado" id="msS1"></div></div>
      <div class="msmsg" id="msMsg" role="status" aria-live="polite"></div>
      <div class="msyo" id="msS0"></div>
      <div class="msmano" id="msMano"></div>
      <div class="ordbar" id="msOrd"><span>Ordenar:</span><button type="button" data-ord="palo">Palo</button><button type="button" data-ord="numero">Número</button><em>✋ o arrástralas</em></div>
      <div class="msinfo" id="msInfo"></div>
    </div>
    <div class="bar msacc" id="msAcc"></div>
    <div id="msRec"></div>
    <ul class="mslog" id="msLog"></ul>
    <div class="bar"><button class="btn" data-ac="reglas">Reglas</button></div>${api.barraHtml()}`;
  if (arr) arr.destruir();
  arr = hacerOrdenable($('#msMano'), { sel: '.msc', alSoltar: ids => { ord = { modo: 'libre', ids }; api.sonido('click'); pintar(); guardar(); } });
}
function nuevaSetup() { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; clearTimeout(timer); api.borrar(); setup(); }
function empezar() {
  asp.sortear();
  hm = historialVacio();
  api.setPref('cfg', cfg); S = M.crear({ nivel: cfg.nivel, meta: cfg.meta, juegos: cfg.juegos, reyes: cfg.reyes }); reg = false; selDesc = new Set(); dichos = {};
  armar(); pintar(); guardar(); bucle();
}

/* ---------- pintado ---------- */
const decir = (s, t) => { dichos[s] = t; };
// Historial mano a mano: al terminar cada mano se apuntan los puntos que ha sumado cada uno
function puntosMano() {
  return [0, 1].map(eq => S.recuento.lineas.filter(l => l.equipo === eq).reduce((s, l) => s + l.puntos, 0));
}
function seguirHistorial() { if (S && ((S.fase === 'recuento' || S.fase === 'fin') && !!S.recuento) && !hm.marcada) seguir(hm, true, puntosMano()); else if (S && !((S.fase === 'recuento' || S.fase === 'fin') && !!S.recuento)) seguir(hm, false); }
function verHistorial() {
  if (!S) { api.modal('📜 Historial de la partida', htmlPartidas(api)); return; }
  api.modal('📜 Historial de la partida', htmlTabla(['Vosotros', 'Ellos'], hm.filas, { titulo: 'Mano', menosEsMejor: false }) + '<p class="note">Tantos de cada pareja en cada mano.</p>');
}
function pintar() {
  seguirHistorial();
  if (!S || !$('#msTop')) return;
  if (manoVista !== S.nMano) { manoVista = S.nMano; dichos = {}; selDesc = new Set(); }
  if (S.fase === 'lance' && lanceVisto !== S.lance) { lanceVisto = S.lance; dichos = {}; }
  const r = S.reyes, habla = M.quienHabla(S), ver = S.fase === 'recuento' || S.fase === 'fin';
  $('#msTop').innerHTML = `<span class="eq e0">Vosotros <b>${S.pts[0]}</b></span><span class="meta">a ${S.meta}${S.juegosMeta > 1 ? ` · juegos ${S.juegos[0]}–${S.juegos[1]}` : ''}</span><span class="eq e1">Ellos <b>${S.pts[1]}</b></span>`;
  for (const s of [1, 2, 3]) {
    const decl = S.fase === 'lance' || ver ? [S.lance >= 2 || ver ? (S.decl.pares[s] ? 'Pares' : '') : '', S.lance >= 3 || ver ? (S.decl.juego[s] ? 'Juego' : '') : ''].filter(Boolean) : [];
    $('#msS' + s).className = `msseat ${s === 2 ? 'arriba' : 'lado'} p${s % 2} ${habla === s ? 'turno' : ''} ${s === S.mano ? 'esmano' : ''}`;
    $('#msS' + s).innerHTML = `<div class="nom">${s === S.mano ? '<i class="mn" title="Es mano">M</i>' : ''}${NOM[s]}</div>
      <div class="cs">${S.manos[s].map(c => (ver ? cartaEsHTML(c) : cartaEsHTML(0, { oculta: true }))).join('')}</div>
      <div class="decl">${decl.map(t => `<span>${t}</span>`).join('')}</div>${dichos[s] ? `<div class="bocadillo">${esc(dichos[s])}</div>` : ''}`;
  }
  // lances
  const L = S.lance;
  $('#msLances').innerHTML = [0, 1, 2, 3].map(k => {
    const a = S.apuestas[k], nombre = k === 3 && S.punto ? 'Punto' : M.LANCES[k], actual = S.fase === 'lance' && L === k;
    let est = actual ? (S.B && (S.B.apuesta || S.B.ordago) ? (S.B.ordago ? '¡Órdago!' : `${S.B.apuesta} en juego`) : 'hablando') : '';
    if (a) est = { paso: 'en paso', querido: `querido ${a.valor}`, noquiero: `no quiso (+${a.valor} ${a.equipo ? 'ellos' : 'vos.'})`, sin: 'sin envite', nadie: '—', ordago: 'órdago' }[a.estado];
    return `<div class="ml ${actual ? 'act' : ''} ${a ? 'hecho' : ''}"><b>${nombre}</b><small>${est}</small></div>`;
  }).join('');
  // tú
  const yoD = [];
  if (S.fase === 'lance' || ver) { if (S.lance >= 2 || ver) yoD.push(S.decl.pares[0] ? 'Pares' : ''); if (S.lance >= 3 || ver) yoD.push(S.decl.juego[0] ? 'Juego' : ''); }
  $('#msS0').className = `msyo ${habla === 0 ? 'turno' : ''}`;
  $('#msS0').innerHTML = `<span class="nom">${S.mano === 0 ? '<i class="mn" title="Eres mano">M</i>' : ''}Tú</span>${yoD.filter(Boolean).map(t => `<span class="dl">${t}</span>`).join('')}${dichos[0] ? `<span class="bocadillo">${esc(dichos[0])}</span>` : ''}`;
  const desc = S.fase === 'descarte' && !S.descSel[0];
  $('#msMano').className = 'msmano' + (desc ? ' desc' : '');
  root.querySelectorAll('#msOrd [data-ord]').forEach(b => b.classList.toggle('on', b.dataset.ord === ord.modo));
  const mia = ordenarMano(S.manos[0], ord, { palo: c => c / 10 | 0, num: c => -M.fuerza(c, r) });
  if (!(arr && arr.activo())) $('#msMano').innerHTML = mia.map(c => `<div class="msc ${selDesc.has(c) ? 'sel' : ''}" data-c="${c}" ${desc ? 'role="button" tabindex="0"' : ''} aria-label="${nombreEs(c)}${selDesc.has(c) ? ', para descartar' : ''}">${cartaEsHTML(c)}</div>`).join('');
  const sm = M.suma(S.manos[0], r);
  $('#msInfo').textContent = `Tu mano: ${M.nombrePares(S.manos[0], r)} · ${sm >= 31 ? `juego de ${sm}` : `${sm} al punto`}`;
  pintarAcciones(habla); pintarMensaje(habla); pintarRecuento();
  $('#msLog').innerHTML = S.log.map(l => `<li>${esc(l)}</li>`).join('');
}
function pintarMensaje(habla) {
  const m = $('#msMsg'); let t = '';
  if (S.fase === 'fin') t = S.ganador === 0 ? '🏆 ¡Ganáis la partida!' : 'Ganan los rivales.';
  else if (S.fase === 'recuento') t = S.recuento.finJuego != null ? (S.recuento.finJuego === 0 ? '🎉 ¡Ganáis el juego!' : 'Los rivales ganan el juego.') : 'Recuento de la mano';
  else if (S.fase === 'mus') t = habla === 0 ? '¿Mus o no hay mus?' : `Habla ${NOM[habla].toLowerCase()}…`;
  else if (S.fase === 'descarte') t = !S.descSel[0] ? 'Elige de 1 a 4 cartas para descartarte.' : 'Repartiendo…';
  else if (S.fase === 'lance') {
    const B = S.B, nl = M.nombreLance(S, S.lance);
    if (habla !== 0) t = `${nl}: habla ${NOM[habla].toLowerCase()}…`;
    else if (B.responde >= 0) t = `${nl}: ${B.ordago ? '¡te echan un órdago!' : `te envidan (${B.apuesta} en juego)`}. ¿Lo quieres?`;
    else t = `${nl}: ¿pasas o envidas?`;
  }
  m.textContent = t;
}
function pintarAcciones(habla) {
  const el = $('#msAcc'); let h = '';
  if (S.fase === 'mus' && habla === 0) h = '<button class="btn on" data-ac="mus">🔄 Mus</button><button class="btn" data-ac="nomus">✋ No hay mus</button>';
  else if (S.fase === 'descarte' && !S.descSel[0]) h = `<button class="btn on" data-ac="descartar" ${selDesc.size ? '' : 'disabled'}>Descartar ${selDesc.size || ''}</button>`;
  else if (S.fase === 'lance' && habla === 0) {
    const B = S.B;
    if (B.responde < 0) h = '<button class="btn" data-ac="paso">Paso</button><button class="btn on" data-ac="envido" data-n="2">Envido 2</button><button class="btn" data-ac="envido" data-n="5">Envido 5</button><button class="btn rojo" data-ac="ordago">Órdago</button>';
    else h = `<button class="btn on" data-ac="quiero">Quiero</button><button class="btn" data-ac="noquiero">No quiero</button>${B.ordago ? '' : '<button class="btn" data-ac="envido" data-n="2">Subo 2</button><button class="btn rojo" data-ac="ordago">Órdago</button>'}`;
  }
  el.innerHTML = h; el.hidden = !h;
}
function pintarRecuento() {
  const el = $('#msRec');
  if (S.fase !== 'recuento' && S.fase !== 'fin') { el.innerHTML = ''; return; }
  const R = S.recuento, r = S.reyes, fin = S.fase === 'fin';
  const manos = [0, 1, 2, 3].map(s => { const sm = M.suma(S.manos[s], r); return `<div class="mrh p${s % 2}"><b>${NOM[s]}</b><div class="cs">${S.manos[s].map(c => cartaEsHTML(c)).join('')}</div><small>${M.nombrePares(S.manos[s], r)} · ${sm >= 31 ? `juego ${sm}` : `${sm} al punto`}</small></div>`; }).join('');
  const lineas = R.lineas.map(l => `<tr><td>${l.L === 3 && S.punto ? 'Punto' : M.LANCES[l.L]}</td><td>${esc(l.texto)}</td><td class="e${l.equipo}">${l.equipo ? 'Ellos' : 'Vos.'} +${l.puntos}</td></tr>`).join('') || '<tr><td colspan="3">Nadie se lleva tantos en esta mano.</td></tr>';
  const sig = fin ? '<button class="btn on" data-ac="setup">Nueva partida</button>' : `<button class="btn on" data-ac="siguiente">${R.finJuego != null ? 'Siguiente juego' : 'Siguiente mano'}</button>`;
  el.innerHTML = `<div class="msres"><h3>${fin ? (S.ganador === 0 ? '🏆 ¡Partida ganada!' : 'Partida perdida') : R.finJuego != null ? 'Fin del juego' : `Recuento de la mano ${S.nMano}`}${R.ordago ? ' · órdago' : ''}</h3>
    <div class="mrmanos">${manos}</div><table>${lineas}</table>
    <p class="mrtot">Vosotros <b>${S.pts[0]}</b> · Ellos <b>${S.pts[1]}</b>${S.juegosMeta > 1 ? ` · juegos ${S.juegos[0]}–${S.juegos[1]}` : ''}</p>
    <div class="bar" style="justify-content:center">${sig}</div></div>`;
}

/* ---------- flujo ---------- */
const TXT = { paso: 'Paso', quiero: 'Quiero', noquiero: 'No quiero', ordago: '¡Órdago!' };
function accion(s, tipo, n) {
  const B = S.B, respondiendo = B && B.responde >= 0;
  if (!M.hablar(S, s, tipo, n)) return false;
  decir(s, tipo === 'envido' ? (respondiendo ? `Subo ${n}` : `Envido ${n}`) : TXT[tipo]);
  api.sonido(tipo === 'ordago' ? 'error' : tipo === 'quiero' ? 'ok' : 'click');
  return true;
}
function bucle() {
  clearTimeout(timer); if (!S) return;
  if (S.fase === 'fin') return cierre();
  if (S.fase === 'recuento') return;
  if (S.fase === 'descarte') {
    for (const s of [1, 2, 3]) if (!S.descSel[s]) M.elegirDescarte(S, s, M.cpuDescarte(S, s));
    pintar(); guardar(); return;
  }
  const h = M.quienHabla(S); if (h === 0 || h < 0) return;
  timer = setTimeout(() => {
    if (!S) return;
    if (S.fase === 'mus') { const q = M.cpuMus(S); M.decirMus(S, h, q); decir(h, q ? 'Mus' : 'No hay mus'); api.sonido('click'); }
    else if (S.fase === 'lance') { const d = M.cpuHablar(S); accion(h, d.tipo, d.n); }
    pintar(); guardar(); bucle();
  }, S.fase === 'mus' ? 650 : 900);
}
function cierre() {
  if (!reg) {
    reg = true; const gano = S.ganador === 0;
    if (gano) marcador.g++; else marcador.p++;
    anotarPartida(api, { res: gano ? 'g' : 'p', texto: `A ${S.meta} · ${S.reyes} reyes · juegos ${S.juegos[0]}–${S.juegos[1]}` });
    api.registrar({ res: gano ? 'victoria' : 'derrota', variante: `A ${S.meta} · ${S.reyes} reyes · ${M.NIVEL[S.nivel]}` });
    api.sonido(gano ? 'ganar' : 'perder'); if (gano) api.vibrar([60, 40, 60]);
  }
  pintar(); guardar();
}

/* ---------- entrada ---------- */
function toggleCarta(c) {
  if (!S || S.fase !== 'descarte' || S.descSel[0]) return;
  if (selDesc.has(c)) selDesc.delete(c); else if (selDesc.size < 4) selDesc.add(c);
  api.sonido('click'); pintar();
}
function tecla(e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.c != null) { e.preventDefault(); toggleCarta(+e.target.dataset.c); } }
function clic(e) {
  const k = e.target.closest('[data-c]'); if (k && S) return toggleCarta(+k.dataset.c);
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.cfg) { cfg[d.cfg] = d.cfg === 'nivel' ? d.v : +d.v; return setup(); }
  if (d.ord) { ord = { modo: ord.modo === d.ord ? 'libre' : d.ord, ids: ord.modo === d.ord ? ordenarMano(S ? S.manos[0] : [], ord, { palo: c => c / 10 | 0, num: c => -M.fuerza(c, S ? S.reyes : 8) }) : [] }; api.setPref('orden', ord.modo); api.sonido('click'); if (S) { pintar(); guardar(); } return; }
  const a = d.ac;
  if (a === 'start') empezar(); else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas(); else if (a === 'nueva') nuevaSetup();
  else if (a === 'setup') { api.borrar(); setup(); }
  else if (!S) return;
  else if (a === 'mus' || a === 'nomus') { if (M.decirMus(S, 0, a === 'mus')) { decir(0, a === 'mus' ? 'Mus' : 'No hay mus'); api.sonido('click'); pintar(); guardar(); bucle(); } }
  else if (a === 'descartar') { if (M.elegirDescarte(S, 0, [...selDesc])) { selDesc = new Set(); api.sonido('mover'); pintar(); guardar(); bucle(); } }
  else if (['paso', 'envido', 'ordago', 'quiero', 'noquiero'].includes(a)) {
    if (a === 'ordago' && !api.confirmar('¿Echar un órdago? Si lo quieren, este lance decide el juego entero.')) return;
    if (accion(0, a, +d.n || 2)) { pintar(); guardar(); bucle(); }
  }
  else if (a === 'siguiente') { if (M.siguienteMano(S)) { api.sonido('click'); pintar(); guardar(); bucle(); } }
}
function reglas() {
  api.modal('Mus', `<ul><li>Se juega por <b>parejas</b>: tú y tu compañero (enfrente) contra los dos rivales. Cada uno tiene 4 cartas. Es <b>mano</b> (M) quien habla primero; en los empates gana el más cercano a la mano.</li>
    <li><b>Mus</b>: si los cuatro dicen «mus», cada uno se descarta de 1 a 4 cartas y recibe otras. En cuanto alguien dice «no hay mus», empiezan los lances.</li>
    <li><b>Grande</b>: gana la mano con cartas más altas (rey, caballo, sota, 7…). <b>Chica</b>: la de cartas más bajas (ases primero).</li>
    <li><b>Pares</b> (solo quien los tiene): par (1 tanto), medias = trío (2) y duples = dos parejas o cuatro iguales (3).</li>
    <li><b>Juego</b>: sumar 31 o más (figuras valen 10). El mejor es 31, luego 32, 40, 37, 36, 35, 34 y 33. El 31 cobra 3 tantos; los demás, 2. Si nadie tiene juego se juega al <b>Punto</b>: gana quien más se acerque a 30 (+1).</li>
    <li>En cada lance puedes <b>pasar</b> o <b>envidar</b>. Si te envidan: <b>quiero</b> (se cobra al final quien gane), <b>no quiero</b> (el que envidó cobra ya 1 o lo que estaba querido antes) o <b>subir</b>. Grande y chica en paso valen 1 al ganador.</li>
    <li><b>Órdago</b>: si lo quieren, se enseñan las cartas y quien gane ese lance gana el juego entero.</li>
    <li>Con <b>8 reyes</b>, los treses cuentan como reyes y los doses como ases. Gana el juego la pareja que llegue antes a ${S ? S.meta : cfg.meta} tantos (los tantos se cuentan en orden: grande, chica, pares y juego).</li>
    <li><b>Ordenar tus cartas</b>: «Palo» o «Número» (de mayor a menor) las ordenan; vuelve a pulsar para dejarlas como estén. También puedes <b>arrastrar</b> cualquier carta para colocarla donde quieras.</li>
    <li>En tu pareja decides tú cuando os envidan. Tu compañero (CPU) habla por su cuenta cuando le toca.</li></ul>`);
}
