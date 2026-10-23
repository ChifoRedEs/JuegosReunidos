import { $, esc, esperar } from '../../core/dom.js';
import * as O from './motor.js';
import { grupoFondo, grupoPersonaje, emojiPersonaje } from '../../core/aspectos.js';

let animJ = -1;
// Vista 3D (Three.js): opcional, con vuelta automática al tablero HTML si no hay WebGL
let V3 = null, hay3d = false, modo3d = false, forzar2d = false, tok3 = 0;
const quiere3D = () => hay3d && !forzar2d && !!asp && (asp.valores.vista || '3d') === '3d';
function cerrar3D() { tok3++; if (V3) { try { V3.destruir(); } catch { /* nada */ } V3 = null; } }
let S = null, api = null, asp = null, root = null, timer = null, reg = false, anim = false, vis = {}, dadosVis = null, msgEvento = '';
let cfg = { jug: [['Tú', 'h'], ['CPU 1', 'c'], ['CPU 2', 'n'], ['CPU 3', 'n']], dados: 1, pozo: 'rescate' };

/* ---------- validación / resumen ---------- */
export function validar(d) { const s = d && O.validar(d.s); return s ? { s, reg: !!d.reg } : null; }
export const migrarV1 = d => d;
export function resumen(d) {
  const s = d.s;
  if (s.fase === 'fin') return { texto: `Ganó ${s.jug[s.ganador].nombre}`, fin: true };
  const lider = s.jug.reduce((a, b) => (b.pos > a.pos ? b : a));
  return { texto: `${s.jug.length} jugadores · ${lider.nombre} va en la ${lider.pos}`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; anim = false; vis = {}; dadosVis = null; msgEvento = ''; forzar2d = false; modo3d = false;
  try { hay3d = (await import('../../core/escena3d.js')).hayWebGL(); } catch { hay3d = false; }
  asp = api.aspecto([{ clave: 'vista', titulo: 'Vista del tablero', icono: '🧊', def: '3d', opciones: [{ id: '3d', nombre: '🧊 3D (Three.js)' }, { id: '2d', nombre: '🔲 2D clásica' }] }, grupoFondo('#ocTab'), grupoPersonaje('Personajes (tu ficha)'), { clave: 'tablero', titulo: 'Tablero', def: 'clasico', opciones: [{ id: 'clasico', nombre: 'Clásico', sw: ['#FFF3D6', '#7CC36B'] }, { id: 'alegre', nombre: 'Alegre', sw: ['#FFE3F1', '#8B5CF6'] }, { id: 'noche', nombre: 'Noche', sw: ['#2A3460', '#F2B600'] }] }], () => { if (!S) return; if (modo3d !== quiere3D()) armar(); else if (V3) V3.recolor(); pintar(); });
  await api.css(new URL('./oca.css', import.meta.url));
  const c0 = api.pref('cfg', null);
  if (c0 && Array.isArray(c0.jug) && c0.jug.length === 4 && [1, 2].includes(c0.dados)) cfg = { ...cfg, ...c0, jug: c0.jug.map(([n, t]) => [String(n).slice(0, 14), ['h', 'c', 'n'].includes(t) ? t : 'n']) };
  const g = api.cargar(); S = g ? g.s : null; reg = g ? g.reg : false;
  root.addEventListener('click', clic); root.addEventListener('input', alEscribir);
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  if (S) { armar(); pintar(); bucle(); } else setup();
}
export function unmount() { cerrar3D(); modo3d = false; clearTimeout(timer); if (root) { root.removeEventListener('click', clic); root.removeEventListener('input', alEscribir); } S = null; asp = null; anim = false; }
function guardar() { if (!S) return; const d = { s: S, reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- pantalla de inicio ---------- */
function setup() {
  S = null; clearTimeout(timer); cerrar3D(); modo3d = false;
  const n = cfg.jug.filter(j => j[1] !== 'n').length;
  root.innerHTML = `<p class="note">El clásico de toda la vida: tira el dado, salta de oca a oca, cruza puentes y evita la posada, el pozo, el laberinto, la cárcel y la muerte. Gana quien llegue <b>justo</b> a la casilla 63.</p>
    ${cfg.jug.map(([nom, t], i) => `<div class="jugfila" style="--c:${O.COLORES[i]}"><span class="jf-dot"></span><input class="nom" data-name="${i}" maxlength="14" value="${esc(nom)}" aria-label="Nombre del jugador ${i + 1}"><div class="seg">${[['h', 'Persona'], ['c', 'CPU'], ['n', 'Nadie']].map(([k, l]) => `<button class="btn ${t === k ? 'on' : ''}" data-tipo="${i},${k}">${l}</button>`).join('')}</div></div>`).join('')}
    <div class="bar"><span class="lbl">Dados</span><div class="seg"><button class="btn ${cfg.dados === 1 ? 'on' : ''}" data-dados="1">1 dado</button><button class="btn ${cfg.dados === 2 ? 'on' : ''}" data-dados="2">2 dados</button></div></div>
    <div class="bar"><span class="lbl">Pozo</span><div class="seg"><button class="btn ${cfg.pozo === 'rescate' ? 'on' : ''}" data-pozo="rescate">Hasta que te rescaten</button><button class="btn ${cfg.pozo === 'turnos' ? 'on' : ''}" data-pozo="turnos">2 turnos</button></div></div>
    <div class="bar"><button class="btn on" data-ac="start" ${n < 2 ? 'disabled' : ''}>Empezar</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>
    <p class="note">${n < 2 ? 'Hacen falta al menos 2 jugadores.' : `${n} jugadores. Las personas se pasan el móvil por turnos.`}${cfg.dados === 2 ? ' Con 2 dados, si en la primera tirada sacas 6 y 3 vas a la 26; con 5 y 4, a la 53.' : ''}</p>`;
}
function armar() {
  cerrar3D(); modo3d = quiere3D();
  root.innerHTML = `<div class="ocjug" id="ocJug"></div>
    ${modo3d ? '<div class="e3d" id="ocTab"></div>' : `<div class="octab" id="ocTab">${O.ESPIRAL.map(([f, c], n) => {
      const k = O.CASILLAS[n]; return `<div class="occ ${n === 0 ? 'salida' : k ? k.tipo : ''} ${n % 2 ? 'imp' : ''}" style="grid-row:${f + 1};grid-column:${c + 1}" title="${n === 0 ? 'Salida' : k ? `${n} · ${k.nombre}` : n}"><span class="num">${n === 0 ? '' : n}</span>${n === 0 ? '<span class="ico">🚩</span>' : k ? `<span class="ico">${k.ico}</span>` : ''}</div>`;
    }).join('')}<div class="ocfichas" id="ocFichas"></div></div>`}
    <div class="ocmsg" id="ocMsg" role="status" aria-live="polite"></div>
    <div class="ocacc"><div class="ocdados" id="ocDados" aria-hidden="true"></div><button class="btn on octirar" data-ac="tirar" id="ocTirar">🎲 Tirar</button></div>
    <div id="ocFin"></div>
    <ul class="oclog" id="ocLog"></ul>
    <div class="bar"><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button><button class="btn" data-ac="nueva">Nueva partida</button></div>`;
  if (modo3d) iniciar3D();
}
async function iniciar3D() {
  const t = ++tok3;
  try {
    const b3 = await import('../../core/escena3d.js'), { crearOca3D } = await import('./vista3d.js'); if (t !== tok3 || !root) return;
    const host = $('#ocTab'); if (!host) return;
    const v = await crearOca3D(host, { espiral: O.ESPIRAL, casillas: O.CASILLAS });
    if (t !== tok3 || !root) { v.destruir(); return; }
    b3.botonesCamara(host, v.E); V3 = v; if (S) pintar();
  } catch (e) { console.error(e); if (t === tok3 && root && S) { forzar2d = true; armar(); pintar(); } }
}
function pintar3D() {
  if (!V3 || !S) return;
  const porCasilla = {}; S.jug.forEach((_, j) => { const p = posDe(j); (porCasilla[p] = porCasilla[p] || []).push(j); });
  const emo = emojiPersonaje(asp);
  V3.pintar({ fichas: S.jug.map((J, j) => {
    const p = posDe(j), [f, c] = O.ESPIRAL[p], grupo = porCasilla[p], k = grupo.indexOf(j), m = grupo.length;
    return { j, color: O.COLORES[J.color], f, c, dx: m > 1 ? (k % 2 ? .22 : -.22) : 0, dz: m > 2 ? (k < 2 ? -.2 : .2) : 0, emoji: emo && !J.cpu ? emo : '',
      turno: j === (anim ? animJ : S.turno) && (S.fase === 'tirar' || anim), mueve: vis[j] != null };
  }) });
}
function nuevaSetup() { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; clearTimeout(timer); anim = false; api.borrar(); setup(); }
function empezar() {
  const jugadores = cfg.jug.map(([nombre, t], k) => ({ nombre: nombre.trim() || O.NOMBRES_COLOR[k], cpu: t === 'c', color: k, t })).filter(j => j.t !== 'n');
  if (jugadores.length < 2) return;
  api.setPref('cfg', cfg); S = O.crear({ jugadores, dados: cfg.dados, pozo: cfg.pozo }); reg = false; vis = {}; dadosVis = null; msgEvento = '';
  armar(); pintar(); guardar(); bucle();
}

/* ---------- pintado ---------- */
const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const dadoHTML = v => `<span class="dado">${Array.from({ length: 9 }, (_, k) => `<i class="${PIPS[v].includes(k + 1) ? 'on' : ''}"></i>`).join('')}</span>`;
const posDe = j => (vis[j] != null ? vis[j] : S.jug[j].pos);
function colocarFichas() {
  if (modo3d) return pintar3D();
  const el = $('#ocFichas'); if (!el) return;
  const porCasilla = {}; S.jug.forEach((_, j) => { const p = posDe(j); (porCasilla[p] = porCasilla[p] || []).push(j); });
  if (!el.children.length) el.innerHTML = S.jug.map((J, j) => `<span class="ocf" data-f="${j}" style="--c:${O.COLORES[J.color]}"></span>`).join('');
  S.jug.forEach((J, j) => {
    const p = posDe(j), [f, c] = O.ESPIRAL[p], grupo = porCasilla[p], k = grupo.indexOf(j), m = grupo.length;
    const dx = m > 1 ? (k % 2 ? .22 : -.22) : 0, dy = m > 2 ? (k < 2 ? -.2 : .2) : m === 2 ? 0 : 0;
    const f0 = el.querySelector(`[data-f="${j}"]`);
    const emo = emojiPersonaje(asp), pj = !!emo && !J.cpu; f0.textContent = pj ? emo : ''; f0.classList.toggle('pj', pj);      // «Personajes»: tu ficha lleva el emoji
    f0.style.left = `${(c + .5 + dx) * 12.5}%`; f0.style.top = `${(f + .58 + dy) * 12.5}%`;
    f0.classList.toggle('turno', j === (anim ? animJ : S.turno) && (S.fase === 'tirar' || anim)); f0.classList.toggle('mueve', vis[j] != null);
  });
}
function pintar() {
  if (!S || !$('#ocTab')) return;
  const tj = anim ? animJ : S.turno;
  $('#ocJug').innerHTML = S.jug.map((J, j) => `<div class="ocj ${j === tj && (S.fase === 'tirar' || anim) ? 'turno' : ''} ${S.fase === 'fin' && j === S.ganador ? 'gana' : ''}" style="--c:${O.COLORES[J.color]}"><i></i><b>${esc(J.nombre)}${J.cpu ? ' 🤖' : ''}</b><span>${posDe(j) === 0 ? 'Salida' : `Casilla ${posDe(j)}`}</span>${J.pozo ? '<small>🕳️ en el pozo</small>' : J.pierde ? `<small>${J.pierde} turno${J.pierde > 1 ? 's' : ''} sin tirar</small>` : ''}</div>`).join('');
  colocarFichas();
  const J = S.jug[anim ? animJ : S.turno], humano = !J.cpu;
  const d = dadosVis || (S.ultima ? S.ultima.dados : Array(S.dados).fill(1));
  $('#ocDados').innerHTML = d.map(dadoHTML).join('');
  $('#ocDados').classList.toggle('rodando', !!dadosVis);
  const btn = $('#ocTirar'); btn.disabled = anim || S.fase !== 'tirar' || !humano; btn.hidden = S.fase === 'fin';
  btn.textContent = S.fase === 'tirar' ? `🎲 Tirar · ${J.nombre}` : '🎲 Tirar';
  btn.style.setProperty('--c', O.COLORES[J.color]);
  const m = $('#ocMsg');
  if (S.fase === 'fin') m.innerHTML = `🏆 <b>¡${esc(S.jug[S.ganador].nombre)} ${S.jug[S.ganador].nombre === 'Tú' ? 'llegas al jardín de la Oca y ganas' : 'llega al jardín de la Oca y gana'}!</b>`;
  else if (msgEvento) m.innerHTML = msgEvento;
  else m.innerHTML = humano ? `Turno de <b style="color:${O.COLORES[J.color]}">${esc(J.nombre)}</b>: ¡tira el dado!` : `${esc(J.nombre)} va a tirar…`;
  $('#ocFin').innerHTML = S.fase === 'fin' ? `<div class="bar" style="justify-content:center"><button class="btn on" data-ac="otra">🔁 Otra partida</button><button class="btn" data-ac="setup">Cambiar jugadores</button></div>` : '';
  $('#ocLog').innerHTML = S.log.map(l => `<li>${esc(l)}</li>`).join('');
}

/* ---------- tirar y animar ---------- */
async function tirar() {
  if (!S || anim || S.fase !== 'tirar') return;
  anim = true; clearTimeout(timer); msgEvento = '';
  const j = S.turno, J = S.jug[j], desde = J.pos, r = O.tirar(S); animJ = j;
  if (!r) { anim = false; return; }
  const lento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  vis = { [j]: desde };
  // dados girando
  api.sonido('dado');
  if (!lento) for (let k = 0; k < 6; k++) { dadosVis = r.dados.map(() => 1 + Math.floor(Math.random() * 6)); pintar(); await esperar(70); if (!S) return; }
  dadosVis = null; msgEvento = `${esc(J.nombre)} ${J.nombre === 'Tú' ? 'sacas' : 'saca'} <b>${r.dados.join(' + ')}${r.dados.length > 1 ? ` = ${r.dados[0] + r.dados[1]}` : ''}</b>`; pintar();
  // avance casilla a casilla
  for (const p of r.camino) { vis[j] = p; colocarFichas(); api.sonido('click'); await esperar(lento ? 40 : 170); if (!S) return; }
  // efectos especiales
  for (const e of r.eventos) {
    msgEvento = `<span class="ocrima">${CASILLA_ICO(e)} ${esc(e.texto)}</span>`; pintar();
    api.sonido(['muerte', 'carcel', 'pozo', 'laberinto', 'posada'].includes(e.tipo) ? 'error' : e.tipo === 'rebote' ? 'click' : 'ok');
    if (['oca', 'puente', 'dados'].includes(e.tipo)) api.vibrar(30);
    await esperar(lento ? 200 : 650); if (!S) return;
    if (e.a !== e.de && e.tipo !== 'rebote') { vis[j] = e.a; colocarFichas(); await esperar(lento ? 150 : 500); if (!S) return; }
  }
  vis = {}; anim = false;
  if (!r.eventos.length) msgEvento = '';
  if (r.otra) msgEvento = `${msgEvento ? msgEvento + '<br>' : ''}<b>¡${esc(J.nombre)} ${J.nombre === 'Tú' ? 'vuelves' : 'vuelve'} a tirar!</b>`;
  pintar(); guardar(); bucle();
}
const CASILLA_ICO = e => ({ oca: '🦢', puente: '🌉', dados: '🎲', laberinto: '🌀', muerte: '💀', posada: '🏨', carcel: '⛓️', pozo: '🕳️', rebote: '↩️' }[e.tipo] || '');
function bucle() {
  clearTimeout(timer); if (!S || anim) return;
  if (S.fase === 'fin') return cierre();
  if (S.jug[S.turno].cpu) timer = setTimeout(tirar, 1100);
}
function cierre() {
  if (!reg) {
    reg = true; const humanos = S.jug.filter(j => !j.cpu), gan = S.jug[S.ganador];
    api.registrar({ res: humanos.length === 1 ? (!gan.cpu ? 'victoria' : 'derrota') : 'partida', variante: `${S.jug.length} jugadores · ${S.dados} dado${S.dados > 1 ? 's' : ''}` });
    api.sonido(!gan.cpu || humanos.length !== 1 ? 'ganar' : 'perder'); api.vibrar([60, 40, 60]);
  }
  pintar(); guardar();
}

/* ---------- entrada ---------- */
function alEscribir(e) { if (e.target.dataset && e.target.dataset.name != null) cfg.jug[+e.target.dataset.name][0] = e.target.value.slice(0, 14); }
function clic(e) {
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.tipo) { const [i, k] = d.tipo.split(','); cfg.jug[+i][1] = k; return setup(); }
  if (d.dados) { cfg.dados = +d.dados; return setup(); }
  if (d.pozo) { cfg.pozo = d.pozo; return setup(); }
  const a = d.ac;
  if (a === 'start') empezar(); else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas(); else if (a === 'nueva') nuevaSetup();
  else if (a === 'setup') { api.borrar(); setup(); } else if (a === 'otra') { api.borrar(); empezar(); }
  else if (a === 'tirar' && S && !S.jug[S.turno].cpu) tirar();
}
function reglas() {
  api.modal('Juego de la Oca', `<ul><li>Por turnos, cada jugador tira el dado y avanza su ficha. Gana quien llegue <b>exactamente</b> a la casilla 63; si te pasas, rebotas hacia atrás lo que sobre.</li>
    <li>🦢 <b>Oca</b> (5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54 y 59): «de oca a oca y tiro porque me toca». Saltas a la siguiente oca y vuelves a tirar.</li>
    <li>🌉 <b>Puente</b> (6 y 12): «de puente a puente y tiro porque me lleva la corriente».</li>
    <li>🎲 <b>Dados</b> (26 y 53): «de dado a dado y tiro porque me ha tocado».</li>
    <li>🏨 <b>Posada</b> (19): pierdes 1 turno. ⛓️ <b>Cárcel</b> (56): pierdes 2 turnos.</li>
    <li>🕳️ <b>Pozo</b> (31): no sales hasta que otro jugador caiga y te rescate (o 2 turnos, según la opción elegida).</li>
    <li>🌀 <b>Laberinto</b> (42): vuelves a la 30. 💀 <b>Muerte</b> (58): vuelves a la casilla 1.</li>
    <li>Con 2 dados: en la primera tirada, 6 y 3 te llevan a la 26 y 5 y 4 a la 53.</li></ul>`);
}
