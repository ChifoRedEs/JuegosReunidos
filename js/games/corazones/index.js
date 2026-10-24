// Corazones: 4 jugadores (tú y tres CPU), evita llevarte corazones y la dama de picas… o llévatelos todos.
import { $, esc } from '../../core/dom.js';
import { cartaHTML } from '../../core/cartas.js';
import { grupoMesa, grupoDorso, grupoBarajaFr } from '../../core/aspectos.js';
import { anotarPartida, htmlPartidas, htmlTabla } from '../../core/historial.js';
import * as C from './motor.js';

const NIVEL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
const FLECHA = { izquierda: '⬅️ a la izquierda (Oeste)', derecha: '➡️ a la derecha (Este)', enfrente: '⬆️ al de enfrente (Norte)', ninguno: 'Esta mano no se pasan cartas' };
let S = null, api = null, asp = null, root = null, timer = null, reg = false, sel = new Set(), cfg = { nivel: 'medio', meta: 100, luna: 'resto' };

/* ---------- validación / resumen ---------- */
export function validar(d) { const s = d && C.validar(d.s); return s ? { s, reg: !!d.reg } : null; }
export const migrarV1 = d => d;
export function resumen(d) {
  const s = d.s;
  if (s.fase === 'fin') { const g = C.ganadores(s); return { texto: g.includes(0) ? `¡Ganaste con ${s.total[0]} puntos!` : `Ganó ${C.NOMBRES[g[0]]} · tú ${s.total[0]}`, fin: true }; }
  return { texto: `Mano ${s.mano} · tus puntos ${s.total[0]} (a ${s.meta})`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; sel = new Set();
  asp = api.aspecto([grupoMesa(), grupoDorso(), grupoBarajaFr()]);
  await api.css(new URL('../../../css/cartas.css', import.meta.url)); await api.css(new URL('./corazones.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && NIVEL[c0.nivel] && C.METAS.includes(c0.meta)) cfg = { nivel: c0.nivel, meta: c0.meta, luna: c0.luna === 'resta' ? 'resta' : 'resto' };
  const g = api.cargar(); S = g ? g.s : null; reg = g ? g.reg : false;
  root.addEventListener('click', clic);
  api.barra({ nueva: () => { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; clearTimeout(timer); empezar(); },
    salir: () => { clearTimeout(timer); api.borrar(); setup(); },
    pausar: () => clearTimeout(timer),
    reanudar: () => { if (S && S.fase !== 'fin') bucle(); },
    config: { valores: () => ({ ...cfg }), grupos: v => [{ clave: 'nivel', titulo: 'Nivel', opciones: Object.entries(NIVEL) }, { clave: 'meta', titulo: 'Partida a', opciones: C.METAS.map(m => [m, `${m} puntos`]) }, { clave: 'luna', titulo: 'Tiro a la luna', opciones: [['resto', 'Los rivales +26'], ['resta', 'Tú −26']] }], aplicar: v => { Object.assign(cfg, v); empezar(); } } });
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '👀 Última baza', accion: verUltima }, { texto: '📜 Historial de la partida', accion: verHistorial },
    { texto: '🗂️ Partidas anteriores', accion: () => api.modal('🗂️ Partidas anteriores', htmlPartidas(api)) }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  if (S) { armar(); pintar(); bucle(); } else setup();
}
export function unmount() { clearTimeout(timer); if (root) root.removeEventListener('click', clic); S = null; asp = null; }
function guardar() { if (!S) return; const d = { s: S, reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- pantallas ---------- */
function setup() {
  S = null; clearTimeout(timer);
  const seg = (k, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${cfg[k] === v ? 'on' : ''}" data-cfg="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  root.innerHTML = `<p class="note">Juegas contra tres rivales. Cada <b>corazón</b> que te lleves suma 1 punto y la <b>dama de picas</b>, 13. Gana quien tenga <b>menos puntos</b> cuando alguien llegue a ${cfg.meta}. Pero si te llevas todos los corazones y la dama… ¡has «tirado a la luna»!</p>
    <div class="bar"><span class="lbl">Nivel</span>${seg('nivel', Object.entries(NIVEL))}</div>
    <div class="bar"><span class="lbl">Partida a</span>${seg('meta', C.METAS.map(m => [m, `${m} puntos`]))}</div>
    <div class="bar"><span class="lbl">Tiro a la luna</span>${seg('luna', [['resto', 'Los rivales +26'], ['resta', 'Tú −26']])}</div>
    <div class="bar"><button class="btn on" data-ac="start">❤️ Empezar</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>`;
}
function nuevaSetup() { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; api.borrar(); setup(); }
function empezar() {
  asp.sortear();
  api.setPref('cfg', cfg); S = C.crear(cfg); reg = false; sel = new Set();
  armar(); pintar(); guardar(); bucle();
}
function armar() {
  root.innerHTML = `<div class="mesa com">
      <div class="coseat n" id="coS2"></div>
      <div class="cofila"><div class="coseat o" id="coS1"></div><div class="cobaza" id="coBaza" aria-live="polite"></div><div class="coseat e" id="coS3"></div></div>
      <div class="comsg" id="coMsg" role="status" aria-live="polite"></div>
      <div class="coyo" id="coYo"></div>
      <div class="comano" id="coMano"></div>
    </div>
    <div id="coPanel"></div>
    <div class="cotabla" id="coTabla"></div>
    <div class="bar"><button class="btn" data-ac="ultima">👀 Última baza</button><button class="btn" data-ac="historial">📜 Historial</button></div>${api.barraHtml()}`;
}

/* ---------- pintado ---------- */
function pintar() {
  if (!S || !$('#coMano')) return;
  const pm = C.puntosMano(S);
  for (const j of [1, 2, 3]) {
    const n = S.manos[j].length;
    $(`#coS${j}`).className = `coseat ${['', 'o', 'n', 'e'][j]}${S.turno === j ? ' turno' : ''}`;
    $(`#coS${j}`).innerHTML = `<b>${C.NOMBRES[j]}</b><span class="cs">${Array.from({ length: Math.min(n, 13) }, () => cartaHTML(0, { oculta: true })).join('')}</span><small>${pm[j] ? `❤️ ${pm[j]}` : '—'}${S.pase[j] && S.fase === 'pasar' ? ' · ✔ pasa' : ''}</small>`;
  }
  // baza en el centro: cada carta en el lado de quien la jugó
  const mesa = S.fase === 'baza' || S.baza.length ? S.baza : [];
  const gan = S.fase === 'baza' ? C.ganadorBaza(S.baza) : -1;
  // solo se anima la carta que acaba de llegar a la mesa (y no se rehace si no ha cambiado nada)
  const claveBaza = mesa.map(x => x.c).join() + '|' + gan + '|' + S.rotos;
  if ($('#coBaza').dataset.k !== claveBaza) {
    const antes = +($('#coBaza').dataset.n || 0);
    $('#coBaza').innerHTML = mesa.map((x, k) => `<div class="cb p${x.j}${x.j === gan ? ' gana' : ''}${k >= antes ? ' in' : ''}">${cartaHTML(x.c)}</div>`).join('') || (S.rotos && S.fase === 'jugar' ? '<span class="cor">💔 corazones rotos</span>' : '');
    $('#coBaza').dataset.k = claveBaza; $('#coBaza').dataset.n = mesa.length;
  }
  // mi mano
  const turnoMio = S.fase === 'jugar' && S.turno === 0, ok = new Set(C.jugables(S, 0)), pasando = S.fase === 'pasar' && !S.pase[0];
  $('#coYo').innerHTML = `<b>Tú</b> · ${pm[0] ? `❤️ ${pm[0]} esta mano` : 'sin puntos esta mano'}`;
  $('#coYo').className = 'coyo' + (turnoMio || pasando ? ' turno' : '');
  $('#coMano').className = 'comano' + (turnoMio ? ' juega' : '') + (pasando ? ' pasa' : '');
  $('#coMano').innerHTML = S.manos[0].map(c => {
    const cls = [sel.has(c) ? 'sel' : '', turnoMio && !ok.has(c) ? 'no' : '', S.recibidas.includes(c) && S.nbaza === 0 ? 'nueva' : ''].filter(Boolean).join(' ');
    return `<button type="button" class="coc ${cls}" data-c="${c}" aria-label="${etiqueta(c)}${sel.has(c) ? ', elegida' : ''}" ${turnoMio && !ok.has(c) ? 'aria-disabled="true"' : ''}>${cartaHTML(c)}</button>`;
  }).join('');
  // mensaje y panel
  const m = $('#coMsg');
  if (S.fase === 'pasar') m.textContent = S.pase[0] ? 'Esperando a los demás…' : `Elige 3 cartas para pasar ${FLECHA[S.dir]}`;
  else if (S.fase === 'baza') m.textContent = `Se lleva la baza ${C.NOMBRES[gan]}${S.baza.some(x => C.puntos(x.c)) ? ` (+${S.baza.reduce((a, x) => a + C.puntos(x.c), 0)})` : ''}`;
  else if (S.fase === 'jugar') m.textContent = turnoMio ? (S.nbaza === 0 && !S.baza.length ? 'Sales tú con el 2 de tréboles' : S.baza.length ? 'Tu turno: sirve del palo si puedes' : 'Tu turno: sales tú') : `Juega ${C.NOMBRES[S.turno]}…`;
  else if (S.fase === 'finMano') m.textContent = S.lunaDe >= 0 ? `🌙 ¡${S.lunaDe === 0 ? 'Has' : C.NOMBRES[S.lunaDe] + ' ha'} tirado a la luna!` : 'Fin de la mano';
  else { const g = C.ganadores(S); m.textContent = g.includes(0) ? (g.length > 1 ? '🤝 ¡Empate en cabeza!' : '🏆 ¡Has ganado la partida!') : `Gana ${g.map(k => C.NOMBRES[k]).join(' y ')}`; }
  panel(); tabla();
}
const etiqueta = c => `${['As', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jota', 'Dama', 'Rey'][c % 13]} de ${['picas', 'corazones', 'diamantes', 'tréboles'][C.palo(c)]}`;
function panel() {
  const p = $('#coPanel');
  if (S.fase === 'pasar' && !S.pase[0]) {
    p.innerHTML = `<div class="bar" style="justify-content:center"><button class="btn" data-ac="sugerir">💡 Sugerir</button><button class="btn on" data-ac="pasar" ${sel.size === 3 ? '' : 'disabled'}>Pasar ${sel.size}/3 cartas</button></div>`;
  } else if (S.fase === 'finMano') {
    const f = S.hist[S.hist.length - 1];
    p.innerHTML = `<div class="cores"><b>Mano ${S.mano}</b>${[0, 1, 2, 3].map(k => `<span>${C.NOMBRES[k]} <i>${f[k] > 0 ? '+' : ''}${f[k]}</i></span>`).join('')}</div><div class="bar" style="justify-content:center"><button class="btn on" data-ac="siguiente">Siguiente mano ▶</button></div>`;
  } else if (S.fase === 'fin') {
    p.innerHTML = `<div class="bar" style="justify-content:center"><button class="btn on" data-ac="start">🔁 Otra partida</button><button class="btn" data-ac="opciones">Opciones</button></div>`;
  } else p.innerHTML = S.fase === 'jugar' && S.recibidas.length && S.nbaza === 0 ? `<p class="note" style="text-align:center">Las cartas recibidas están marcadas con ★</p>` : '';
}
function tabla() {
  const lider = Math.min(...S.total);
  $('#coTabla').innerHTML = `<div class="cotot">${[0, 1, 2, 3].map(k => `<span class="${S.total[k] === lider ? 'lid' : ''}"><small>${C.NOMBRES[k]}</small><b>${S.total[k]}</b></span>`).join('')}</div><p class="note" style="text-align:center">Partida a ${S.meta} · mano ${S.mano} · ${NIVEL[S.nivel]}</p>`;
}

/* ---------- flujo ---------- */
function bucle() {
  clearTimeout(timer); if (!S) return;
  if (S.fase === 'fin') return cierre();
  if (S.fase === 'pasar') {
    if (S.pase.slice(1).some(x => !x)) timer = setTimeout(() => { if (!S || S.fase !== 'pasar') return; for (const j of [1, 2, 3]) if (!S.pase[j]) C.elegirPase(S, j, C.sugerirPase(S, j)); pintar(); guardar(); bucle(); }, 300);
    return;
  }
  if (S.fase === 'baza') { timer = setTimeout(() => { if (!S) return; C.cerrarBaza(S); api.sonido(S.previa && S.previa.ganador === 0 && S.previa.puntos ? 'error' : 'ok'); pintar(); guardar(); bucle(); }, 1100); return; }
  if (S.fase === 'jugar' && S.turno !== 0) timer = setTimeout(() => { if (!S || S.fase !== 'jugar' || S.turno === 0) return; const j = S.turno; C.jugar(S, j, C.elegir(S, j)); api.sonido('mover'); pintar(); guardar(); bucle(); }, 550 + Math.random() * 350);
}
function cierre() {
  if (!reg) {
    reg = true; const g = C.ganadores(S), res = g.includes(0) ? (g.length > 1 ? 'tablas' : 'victoria') : 'derrota';
    api.registrar({ res, variante: `${NIVEL[S.nivel]} · a ${S.meta}` });
    anotarPartida(api, { res: res === 'victoria' ? 'g' : res === 'derrota' ? 'p' : 'e', texto: `${NIVEL[S.nivel]} · a ${S.meta} · tus puntos ${S.total[0]}${res === 'derrota' ? ` (ganó ${C.NOMBRES[g[0]]} con ${S.total[g[0]]})` : ''}` });
    api.sonido(res === 'derrota' ? 'perder' : 'ganar'); if (res === 'victoria') api.vibrar([60, 40, 60]);
  }
  pintar(); guardar();
}
function verUltima() {
  const u = S && S.previa; if (!u || !u.mesa.length) { api.aviso('Todavía no se ha cerrado ninguna baza'); return; }
  api.modal('👀 Última baza', `<div class="repaso">${u.mesa.map(x => `<div class="${x.j === u.ganador ? 'gana' : ''}">${cartaHTML(x.c)}<span>${esc(C.NOMBRES[x.j])}${x.j === u.ganador ? ' 🏆' : ''}</span></div>`).join('')}</div><p style="text-align:center">Se la lleva <b>${C.NOMBRES[u.ganador]}</b>${u.puntos ? ` con <b>${u.puntos}</b> punto${u.puntos > 1 ? 's' : ''}` : ' (sin puntos)'}.</p>`);
}
function verHistorial() {
  if (!S) { api.modal('📜 Historial', htmlPartidas(api)); return; }
  api.modal('📜 Historial de la partida', htmlTabla(C.NOMBRES, S.hist, { titulo: 'Mano', menosEsMejor: true, totales: S.total }) + '<p class="note">Puntos de cada mano: gana quien menos tenga al final.</p>');
}
function clic(e) {
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.cfg) { cfg[d.cfg] = d.cfg === 'meta' ? +d.v : d.v; api.setPref('cfg', cfg); return setup(); }
  if (d.c != null && S) {
    const c = +d.c;
    if (S.fase === 'pasar' && !S.pase[0]) { if (sel.has(c)) sel.delete(c); else if (sel.size < 3) sel.add(c); api.sonido('click'); return pintar(); }
    if (S.fase === 'jugar' && S.turno === 0) {
      if (!C.jugar(S, 0, c)) { api.sonido('error'); const o = C.jugables(S, 0); api.aviso(S.nbaza === 0 && !S.baza.length ? 'Se sale con el 2 de tréboles' : S.baza.length && o.some(x => C.palo(x) === C.palo(S.baza[0].c)) ? 'Tienes que servir del palo' : S.nbaza === 0 ? 'En la primera baza no se pueden tirar puntos' : 'Aún no se puede salir de corazones'); return; }
      api.sonido('mover'); pintar(); guardar(); bucle(); return;
    }
    return;
  }
  const a = d.ac;
  if (a === 'start') empezar(); else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas();
  else if (a === 'sugerir') { sel = new Set(C.sugerirPase(S, 0)); pintar(); }
  else if (a === 'pasar') { if (C.elegirPase(S, 0, [...sel])) { sel = new Set(); api.sonido('mover'); pintar(); guardar(); bucle(); } }
  else if (a === 'siguiente') { C.nuevaMano(S); sel = new Set(); pintar(); guardar(); bucle(); }
  else if (a === 'ultima') verUltima(); else if (a === 'historial') verHistorial();
  else if (a === 'opciones') { api.borrar(); setup(); } else if (a === 'nueva') nuevaSetup();
}
function reglas() {
  api.modal('Corazones', `<ul><li>Se juega con la baraja francesa entre 4: tú y tres rivales (Oeste, Norte y Este). Cada uno recibe 13 cartas.</li>
    <li><b>Pase</b>: antes de cada mano pasas 3 cartas, por turnos a la izquierda, a la derecha y al de enfrente; la cuarta mano no se pasa.</li>
    <li>Sale quien tiene el <b>2 de tréboles</b>. Hay que <b>servir del palo</b> que se sale si se puede; si no, puedes tirar cualquier carta. Se lleva la baza la carta más alta del palo de salida (el As es la más alta). No hay triunfo.</li>
    <li>Cada <b>corazón</b> vale 1 punto y la <b>dama de picas</b>, 13. En la primera baza no se pueden tirar puntos, y no se puede salir de corazones hasta que alguien haya tirado uno («corazones rotos»).</li>
    <li>🌙 <b>Tirar a la luna</b>: si te llevas los 13 corazones y la dama de picas, en vez de sumar 26 puntos se los sumas a cada rival (o te restas 26, según la opción elegida).</li>
    <li>La partida acaba cuando alguien llega a ${S ? S.meta : cfg.meta} puntos: gana quien tenga <b>menos</b>.</li>
    <li>Ayudas: 💡 sugerencia de qué cartas pasar, las cartas recibidas marcadas con ★, las que no puedes jugar en gris, 👀 última baza y 📜 historial mano a mano.</li></ul>`);
}
