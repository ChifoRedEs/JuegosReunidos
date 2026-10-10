import { $, esc, rnd } from '../../core/dom.js';
import { PC, PNAME, PSTART, PSAFE, PHOUSE, PTRACK, PTRI, PCORR, PIPS, pXY, pKey } from './tablero.js';
import { nombre, actual, esCPU, nuevaPartida, legales, tirar, mover, siguiente, mejorJugada } from './reglas.js';

const VEL = { rapida: .5, normal: 1, lenta: 1.7 };
let P = null, api = null, asp = null, rootEl = null, modo = 'setup', timer = null, ivDado = null, ivAnim = null, rodando = false, ptsMov = [], ultFoco = '';
let cfgSetup = { am: 'h', az: 'c', ro: 'c', ve: 'c' }, nombres = {}, libre = false;
const velMult = () => VEL[api.pref('vel', 'normal')] || 1;
const zoom = () => +(asp && asp.valores.zoom) || 1.4;
const forma = () => (asp && asp.valores.fichas) || 'canica';

/* ---------- validación / migración ---------- */
export function validar(x) {
  if (!x || typeof x !== 'object' || !Array.isArray(x.order) || x.order.length < 2 || x.order.length > 4 || new Set(x.order).size !== x.order.length || !x.order.every(c => PC.includes(c))) return null;
  if (!x.cfg || typeof x.cfg !== 'object' || !x.pieces || typeof x.pieces !== 'object' || !x.order.every(c => ['h', 'c'].includes(x.cfg[c]) && Array.isArray(x.pieces[c]) && x.pieces[c].length === 4 && x.pieces[c].every(p => Number.isInteger(p) && p >= -1 && p <= 71))) return null;
  const ok = Number.isInteger(x.turn) && x.turn >= 0 && x.turn < x.order.length && ['roll', 'move', 'pass', 'over'].includes(x.phase)
    && Number.isInteger(x.step) && x.step >= 0 && x.step <= 20 && ['die', 'bonus', 'libre'].includes(x.kind)
    && Array.isArray(x.pend) && x.pend.every(v => v === 0 || v === 10 || v === 20) && Number.isInteger(x.sixes) && x.sixes >= 0 && x.sixes < 3
    && (x.die == null || (Number.isInteger(x.die) && x.die >= 1 && x.die <= 6)) && (x.lastMoved == null || [0, 1, 2, 3].includes(x.lastMoved))
    && (x.phase !== 'over' || x.order.includes(x.winner));
  if (!ok) return null;
  const names = {}; if (x.names && typeof x.names === 'object') for (const c of x.order) if (typeof x.names[c] === 'string') names[c] = x.names[c].slice(0, 14);
  const cfg = {}; PC.forEach(c => { cfg[c] = x.order.includes(c) ? x.cfg[c] : null; });
  return { cfg, names, order: x.order.slice(), pieces: Object.fromEntries(x.order.map(c => [c, x.pieces[c].slice()])), turn: x.turn, phase: x.phase, die: x.die ?? null,
    step: x.step, kind: x.kind, pend: x.pend.slice(), sixes: x.sixes, again: !!x.again, lastMoved: x.lastMoved ?? null, winner: x.phase === 'over' ? x.winner : null,
    salidaLibre: !!x.salidaLibre, primera: Object.fromEntries(x.order.map(c => [c, !!(x.primera && x.primera[c])])), extraSalida: !!x.extraSalida };
}
export const migrarV1 = d => d;
export function resumen(d) {
  const nm = c => (d.names && d.names[c]) || PNAME[c];
  if (d.phase === 'over') return { texto: `Ganó ${nm(d.winner)}`, fin: true };
  return { texto: `${d.order.length} jugadores · turno de ${nm(d.order[d.turn])}`, fin: false };
}
function restaurar(d) {
  P = { ...d, note: '', log: ['Partida cargada.'], moves: [], ov: null, anim: false };
  if (P.phase === 'move') { P.moves = legales(P, actual(P), P.step, P.kind); if (!P.moves.length) { P.phase = 'pass'; P.note = 'Sin movimientos posibles.'; } }
  if (P.phase === 'pass') P.note = P.note || 'Continuando…';
}
function guardar() {
  if (!P) return;
  const d = { cfg: P.cfg, names: P.names, order: P.order, pieces: P.pieces, turn: P.turn, phase: P.phase, die: P.die, step: P.step, kind: P.kind, pend: P.pend, sixes: P.sixes, again: P.again, lastMoved: P.lastMoved, winner: P.winner, salidaLibre: P.salidaLibre, primera: P.primera, extraSalida: P.extraSalida };
  const r = resumen(d); api.guardar(d, r.texto, r.fin);
}

/* ---------- ciclo de vida ---------- */
const DEFS_ASPECTO = [
  { clave: 'tablero', titulo: 'Tablero', def: 'cielo', opciones: [{ id: 'cielo', nombre: 'Cielo', sw: ['#EAF1FF', '#fff'] }, { id: 'madera', nombre: 'Madera', sw: ['#C98F53', '#FFEFD0'] }, { id: 'oscuro', nombre: 'Noche', sw: ['#0E1430', '#232F63'] }, { id: 'caramelo', nombre: 'Caramelo', sw: ['#FFD3EA', '#FFF6FB'] }] },
  { clave: 'colores', titulo: 'Colores de los jugadores', def: 'clasico', opciones: [{ id: 'clasico', nombre: 'Clásicos', sw: ['#FFC21A', '#2F6BFF', '#FF4757', '#0FB56A'] }, { id: 'pastel', nombre: 'Pastel', sw: ['#FFD76A', '#7FA8FF', '#FF8FA0', '#7FDDA8'] }, { id: 'neon', nombre: 'Neón', sw: ['#FFE600', '#00C8FF', '#FF2E88', '#39E614'] }, { id: 'accesible', nombre: 'Daltonismo', sw: ['#F0E442', '#0072B2', '#D55E00', '#009E73'] }] },
  { clave: 'fichas', titulo: 'Forma de las fichas', def: 'canica', opciones: [{ id: 'canica', nombre: '● Canica' }, { id: 'peon', nombre: '♟ Peón' }, { id: 'estrella', nombre: '★ Estrella' }, { id: 'diamante', nombre: '◆ Diamante' }] },
  { clave: 'zoom', titulo: 'Tamaño del tablero (se desplaza solo)', def: '1.4', opciones: [{ id: '1', nombre: 'Todo' }, { id: '1.4', nombre: 'Grande' }, { id: '1.8', nombre: 'Muy grande' }] },
];
export async function mount(root, a) {
  api = a; rootEl = root; rodando = false; ultFoco = '';
  asp = api.aspecto(DEFS_ASPECTO, () => {
    if (modo === 'setup' || !P) { if (rootEl) rSetup(); return; }
    const t = $('#pzTab'); if (t) t.style.width = zoom() * 100 + '%';
    ultFoco = ''; pintarJuego();
  });
  await api.css(new URL('./parchis.css', import.meta.url));
  const c0 = api.pref('cfg', null);
  if (c0 && PC.every(c => ['h', 'c', null].includes(c0[c] ?? null)) && PC.filter(c => c0[c]).length >= 2) cfgSetup = { am: c0.am ?? null, az: c0.az ?? null, ro: c0.ro ?? null, ve: c0.ve ?? null };
  libre = !!api.pref('libre', false);
  const n0 = api.pref('names', {}); nombres = n0 && typeof n0 === 'object' ? { ...n0 } : {};
  root.addEventListener('click', clic); root.addEventListener('input', alEscribir); root.addEventListener('change', alCambiar);
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  const g = api.cargar();
  if (g) { restaurar(g); modo = 'juego'; rJuego(); pintarJuego(); drive(); }
  else { P = null; modo = 'setup'; rSetup(); }
}
export function unmount() {
  clearTimeout(timer); clearInterval(ivDado); clearInterval(ivAnim); timer = ivDado = ivAnim = null; rodando = false;
  if (rootEl) { rootEl.removeEventListener('click', clic); rootEl.removeEventListener('input', alEscribir); rootEl.removeEventListener('change', alCambiar); }
  P = null; asp = null;
}

/* ---------- cámara: con zoom el tablero se desplaza solo hacia donde ocurre la acción ---------- */
function enfocar(pts, suave = true) {
  const v = $('#pzView'), t = $('#pzTab'); if (!v || !t || zoom() <= 1 || !pts.length) return;
  const k = t.clientWidth / 190, xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2 * k, cy = (Math.min(...ys) + Math.max(...ys)) / 2 * k;
  v.scrollTo({ left: Math.max(0, cx - v.clientWidth / 2), top: Math.max(0, cy - v.clientHeight / 2), behavior: suave ? 'smooth' : 'auto' });
}
function seguir(x, y) {
  const v = $('#pzView'), t = $('#pzTab'); if (!v || !t || zoom() <= 1) return;
  const k = t.clientWidth / 190, px = x * k - v.scrollLeft, py = y * k - v.scrollTop, mx = v.clientWidth * .22, my = v.clientHeight * .22;
  if (px < mx || px > v.clientWidth - mx || py < my || py > v.clientHeight - my) enfocar([[x, y]], false);
}
const ptsJugador = c => { const l = P.pieces[c].map((p, i) => [p, i]).filter(([p]) => p >= 0 && p < 71).map(([p, i]) => pXY(c, p, i)); return l.length ? l : [pXY(c, 0, 0)]; };

/* ---------- flujo de juego (el motor está en reglas.js; aquí van temporizadores y animación) ---------- */
function drive() {
  if (!P || P.phase === 'over' || P.anim || rodando) return;
  const c = actual(P), t = ms => ms * velMult();
  clearTimeout(timer);
  if (P.phase === 'pass') timer = setTimeout(() => { if (!P) return; siguiente(P); guardar(); pintarJuego(); drive(); }, t(1200));
  else if (esCPU(P, c) && P.phase === 'roll') timer = setTimeout(iniciarTirada, t(700));
  else if (esCPU(P, c) && P.phase === 'move') timer = setTimeout(() => { if (P && P.phase === 'move') jugarMov(mejorJugada(P)); }, t(650));
}
function iniciarTirada() {
  if (!P || P.phase !== 'roll' || rodando || P.anim) return;
  clearTimeout(timer); rodando = true; api.sonido('dado'); api.vibrar(10);
  const c = actual(P); let n = 0;
  pintarJuego();
  ivDado = setInterval(() => {
    pintarDado(1 + rnd(6), c, true);
    if (++n >= 6) {
      clearInterval(ivDado); ivDado = null; rodando = false;
      if (!P) return;
      tirar(P, 1 + rnd(6)); guardar(); pintarJuego(); drive();
    }
  }, 90);
}
function jugarMov(m) {
  if (!P || P.phase !== 'move' || P.anim || !m) return;
  clearTimeout(timer);
  const info = mover(P, m); guardar();
  if (!info) return;
  api.sonido(info.cap ? 'captura' : 'mover'); api.vibrar(info.cap ? 25 : 8);
  if (P.phase === 'over') {
    const humanos = P.order.filter(c => !esCPU(P, c));
    api.registrar({ res: humanos.length === 1 ? (humanos[0] === P.winner ? 'victoria' : 'derrota') : 'partida', variante: `${P.order.length} jugadores` });
    api.sonido(humanos.length !== 1 || humanos[0] === P.winner ? 'ganar' : 'perder');
  }
  animar(info, () => { pintarJuego(); drive(); });
}
function animar(info, fin) {
  const pasos = []; if (info.from === -1) pasos.push(0); else for (let p = info.from + 1; p <= info.to; p++) pasos.push(p);
  const k0 = info.c + ',' + info.i;
  P.anim = true; P.ov = { [k0]: info.from };
  if (info.cap) P.ov[info.cap.c + ',' + info.cap.i] = info.cap.p;       // la ficha comida se queda hasta que llega la otra
  const tab = $('#pzTab'); let k = 0;
  enfocar([pXY(info.c, info.from, info.i), pXY(info.c, info.to, info.i)]);
  clearInterval(ivAnim);
  ivAnim = setInterval(() => {
    if (!P) { clearInterval(ivAnim); return; }
    P.ov[k0] = pasos[k]; if (tab) tab.innerHTML = pBoard(); seguir(...pXY(info.c, pasos[k], info.i)); k++;
    if (k >= pasos.length) { clearInterval(ivAnim); ivAnim = null; setTimeout(() => { if (!P) return; P.anim = false; P.ov = null; fin(); }, 120 * velMult()); }
  }, Math.max(45, Math.round(110 * velMult())));
}

/* ---------- pantallas ---------- */
function nuevaSetup() {
  if (P && P.phase !== 'over' && !api.confirmar('¿Abandonar la partida actual?')) return;
  clearTimeout(timer); clearInterval(ivDado); clearInterval(ivAnim); rodando = false; P = null; api.borrar(); modo = 'setup'; rSetup();
}
function rSetup() {
  const n = PC.filter(c => cfgSetup[c]).length;
  rootEl.innerHTML = `
    <p class="note">Elige quién juega con cada color y, si quieres, escribe un nombre. Hacen falta al menos 2 jugadores; varias personas pueden jugar en el mismo dispositivo por turnos.</p>
    ${PC.map(c => `<div class="prow"><span class="dot" style="background:var(--pz-${c})"></span>
      <input class="nom" data-name="${c}" maxlength="14" placeholder="${PNAME[c]}" value="${esc(nombres[c] || '')}" aria-label="Nombre del jugador ${PNAME[c]}">
      <div class="seg">${[['h', 'Persona'], ['c', 'CPU'], ['n', 'Nadie']].map(([t, l]) => `<button class="btn ${(cfgSetup[c] || 'n') === t ? 'on' : ''}" data-cfg="${c},${t}">${l}</button>`).join('')}</div></div>`).join('')}
    <label class="chk"><input type="checkbox" id="pzLibre" ${libre ? 'checked' : ''}><span><b>Salida libre</b>: si no tienes ninguna ficha en juego, sales con una ficha con cualquier número (no hace falta un 5). Y si en tu primera tirada sacas un 5, sacas dos fichas de casa.</span></label>
    <div class="bar"><span class="lbl">Velocidad CPU</span>${velBotones()}</div>
    <div class="bar"><button class="btn on" data-ac="start" ${n < 2 ? 'disabled' : ''}>Empezar partida</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button>${n < 2 ? '<span class="note">Elige al menos 2 jugadores.</span>' : ''}</div>
    <details><summary>Reglas</summary>${listaReglas()}</details>
    <div class="pzv"><div class="pzb">${pBoard(true)}</div></div>`;
}
const velBotones = () => `<div class="seg">${[['rapida', 'Rápida'], ['normal', 'Normal'], ['lenta', 'Lenta']].map(([k, l]) => `<button class="btn ${api.pref('vel', 'normal') === k ? 'on' : ''}" data-vel="${k}">${l}</button>`).join('')}</div>`;
function listaReglas() {
  return `<ul>
    <li>Sacas ficha de casa con un 5. Si puedes sacar, es obligatorio. Con la opción <b>Salida libre</b> (al crear la partida), si no tienes fichas en juego sales con una ficha con cualquier número, y con un 5 en tu primera tirada sacas dos.</li>
    <li>Con un 6 vuelves a tirar. Si no te quedan fichas en casa, el 6 cuenta 7.</li>
    <li>Tres 6 seguidos: la última ficha movida vuelve a casa (salvo si está en el pasillo).</li>
    <li>Comer una ficha rival te da 20 casillas extra; meter una en meta, 10.</li>
    <li>En los seguros (casillas con estrella) y en las salidas no se come.</li>
    <li>Dos fichas del mismo color forman barrera: nadie puede pasar. Con un 6 debes abrirla.</li>
    <li>A meta se entra con el número exacto. Gana quien mete antes sus 4 fichas.</li>
    <li>Para mover, toca una ficha resaltada <b>o</b> la casilla de destino marcada (si ahí se come una ficha verás 💥).</li>
    <li>En 🎨 Apariencia eliges tablero, colores, forma de las fichas y tamaño; con zoom el tablero se desplaza solo hacia la acción.</li></ul>`;
}
function rJuego() {
  rootEl.innerHTML = `
    <div class="pzv" id="pzView"><div class="pzb" id="pzTab" style="width:${zoom() * 100}%"></div></div>
    <div class="pbar"><button type="button" class="die" id="pzDie" data-ac="roll" aria-label="Dado"></button><div><div class="msg" id="pzMsg" role="status" aria-live="polite"></div><div class="note" id="pzSub"></div></div></div>
    <div class="bar"><button class="btn on" id="pzRoll" data-ac="roll">Tirar dado</button><button class="btn" data-ac="setup">Nueva partida</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button></div>
    <div class="bar"><span class="lbl">Velocidad CPU</span><span id="pzVel">${velBotones()}</span></div>
    <ul class="plog" id="pzLog"></ul>`;
}
function pintarDado(v, c, roda) {
  const d = $('#pzDie'); if (!d) return;
  d.style.setProperty('--pc', `var(--pz-${c})`);
  if (v) { d.className = 'die' + (roda ? ' roda' : ''); d.innerHTML = [...Array(9).keys()].map(k => `<i class="${PIPS[v].includes(k) ? 'on' : ''}"></i>`).join(''); }
  else { d.className = 'die q'; d.textContent = '?'; }
}
function pintarJuego() {
  if (modo !== 'juego' || !P || !$('#pzTab')) return;
  if (!P.anim) $('#pzTab').innerHTML = pBoard();
  const over = P.phase === 'over', c = over ? P.winner : actual(P), who = nombre(P, c) + (esCPU(P, c) ? ' (CPU)' : '');
  const humano = !over && !esCPU(P, c);
  const msg = over ? `¡Gana ${nombre(P, P.winner)}!` : rodando ? `${who} tira…` : P.phase === 'pass' ? P.note : P.phase === 'roll' ? (esCPU(P, c) ? `${who} va a tirar…` : `${who}: tira el dado.`) : (esCPU(P, c) ? `${who} está pensando…` : `${who}: toca una ficha resaltada.`);
  const sub = over || rodando ? '' : P.phase === 'move' ? (P.kind === 'libre' ? (P.step ? `Salida libre: con el ${P.step} sacas una ficha de casa.` : 'Segunda salida: saca otra ficha de casa.') : P.kind === 'bonus' ? `Premio: cuenta ${P.step}.` : P.step === 7 ? 'El 6 cuenta 7: no quedan fichas en casa.' : `Mueve ${P.step}.`) : '';
  if (!rodando) pintarDado(P.die, c, false);
  const m = $('#pzMsg'); m.textContent = msg; m.className = 'msg' + (over ? ' win' : '');
  $('#pzSub').textContent = sub;
  $('#pzRoll').disabled = !(humano && P.phase === 'roll' && !rodando && !P.anim);
  $('#pzLog').innerHTML = P.log.map(l => `<li>${esc(l)}</li>`).join('');
  const v = $('#pzVel'); if (v) v.innerHTML = velBotones();
  const clave = `${P.turn}|${P.phase}|${P.step}|${P.order.length}`;
  if (!P.anim && !over && clave !== ultFoco) {
    ultFoco = clave;
    if (P.phase === 'move' && humano && ptsMov.length) enfocar(ptsMov);
    else if (P.phase === 'roll') enfocar(ptsJugador(c));
  }
}

/* ---------- tablero SVG ---------- */
const posVis = (c, i) => (P.ov && P.ov[c + ',' + i] !== undefined ? P.ov[c + ',' + i] : P.pieces[c][i]);
const estrellaPts = (x, y, R, r) => Array.from({ length: 10 }, (_, k) => { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r : R; return (x + Math.cos(a) * q).toFixed(2) + ',' + (y + Math.sin(a) * q).toFixed(2); }).join(' ');
function ficha(f, c, x, y, r) {
  const col = `style="fill:var(--pz-${c})"`, st = 'stroke="rgba(0,0,0,.55)" stroke-width=".8" stroke-linejoin="round"';
  if (f === 'estrella') return `<polygon points="${estrellaPts(x, y + .3, r * 1.3, r * .56)}" ${col} ${st}/><circle cx="${x}" cy="${y}" r="${r * .26}" fill="#fff" opacity=".6"/>`;
  if (f === 'diamante') return `<polygon points="${x},${y - r * 1.18} ${x + r * .98},${y} ${x},${y + r * 1.18} ${x - r * .98},${y}" ${col} ${st}/><polygon points="${x},${y - r * 1.18} ${x + r * .98},${y} ${x},${y}" fill="#fff" opacity=".3"/>`;
  if (f === 'peon') {
    const b = `M${x - .38 * r},${y - .1 * r} L${x + .38 * r},${y - .1 * r} C${x + .45 * r},${y + .3 * r} ${x + .85 * r},${y + .55 * r} ${x + .98 * r},${y + .98 * r} L${x - .98 * r},${y + .98 * r} C${x - .85 * r},${y + .55 * r} ${x - .45 * r},${y + .3 * r} ${x - .38 * r},${y - .1 * r} Z`;
    return `<path d="${b}" ${col} ${st}/><circle cx="${x}" cy="${y - .62 * r}" r="${r * .52}" ${col} ${st}/><circle cx="${x - r * .16}" cy="${y - .78 * r}" r="${r * .15}" fill="#fff" opacity=".65"/>`;
  }
  return `<circle cx="${x}" cy="${y}" r="${r}" ${col} ${st}/><circle cx="${x - r * .32}" cy="${y - r * .34}" r="${r * .3}" fill="#fff" opacity=".6"/>`;
}
function pBoard(preview) {
  const cur = P && P.phase !== 'over' ? actual(P) : null, human = !!P && P.phase === 'move' && !esCPU(P, cur) && !P.anim, f = forma();
  let s = `<svg class="pzs" viewBox="0 0 190 190" role="img" aria-label="Tablero de parchís"><rect class="bg" width="190" height="190"/>`;
  // casas pequeñas y discretas: el protagonismo es del recorrido
  for (const c of PC) {
    const [hx, hy] = PHOUSE[c], cf = P ? P.cfg[c] : cfgSetup[c], on = !!cf;
    const etiqueta = on ? ((P ? P.names[c] : nombres[c]) || (cf === 'c' ? 'CPU' : 'Persona')) : '';
    s += `<g opacity="${on ? 1 : .3}"><rect x="${hx + 4}" y="${hy + 4}" width="72" height="72" rx="14" style="fill:var(--pz-${c});fill-opacity:.12"/>
      ${cur === c ? `<rect class="turn" x="${hx + 4}" y="${hy + 4}" width="72" height="72" rx="14" fill="none" stroke-width="2.4" style="stroke:var(--pz-${c})"/>` : ''}
      <circle cx="${hx + 40}" cy="${hy + 40}" r="19.5" style="fill:var(--pz-cell);stroke:var(--pz-${c})" stroke-width="1.6"/>
      <text class="pzt" x="${hx + 40}" y="${hy + 70}" text-anchor="middle" font-size="6.5" font-weight="800">${esc(etiqueta)}</text></g>`;
  }
  // recorrido: casillas grandes, redondeadas y llamativas
  for (let n = 1; n <= 68; n++) {
    const [r, c] = PTRACK[n], st = PC.find(k => PSTART[k] === n), x = c * 10, y = r * 10;
    s += `<rect x="${x + .6}" y="${y + .6}" width="8.8" height="8.8" rx="2.4" stroke-width=".7" style="stroke:var(--pz-line);fill:${st ? `var(--pz-${st})` : 'var(--pz-cell)'}"/>`;
    if (PSAFE.has(n) && !st) s += `<polygon points="${estrellaPts(x + 5, y + 5.2, 3.4, 1.5)}" style="fill:var(--pz-star)"/>`;
    if (st) s += `<polygon points="${estrellaPts(x + 5, y + 5.2, 3, 1.3)}" fill="#fff" opacity=".85"/>`;
  }
  for (const c of PC) for (let k = 1; k <= 7; k++) { const [r, cc] = PCORR(c, k); s += `<rect x="${cc * 10 + .6}" y="${r * 10 + .6}" width="8.8" height="8.8" rx="2.4" stroke-width=".7" style="stroke:var(--pz-line);fill:var(--pz-${c});fill-opacity:${(.32 + k * .08).toFixed(2)}"/>`; }
  for (const c of PC) s += `<polygon points="${PTRI[c]}" stroke-width=".8" stroke-linejoin="round" style="stroke:var(--pz-cell);fill:var(--pz-${c})"/>`;
  if (!P) return s + '</svg>';
  ptsMov = [];
  const mvSet = new Set(human ? P.moves.map(m => m.c + m.i) : []);
  if (human) {           // casillas de destino: ficha fantasma + anillo giratorio (+💥 si se come)
    const seen = new Set();
    for (const m of P.moves) {
      const key = m.c + m.to; ptsMov.push(pXY(m.c, m.from, m.i), pXY(m.c, m.to, m.i));
      if (seen.has(key)) continue; seen.add(key);
      const [x, y] = pXY(m.c, m.to, m.i);
      s += `<g data-dest="${m.to}" style="cursor:pointer"><circle class="dst" cx="${x}" cy="${y}" r="6.3" style="stroke:var(--pz-${m.c});fill:var(--pz-${m.c});fill-opacity:.18"/><g opacity=".5">${ficha(f, m.c, x, y, m.to === 71 ? 3 : 4.2)}</g>
        ${m.cap ? `<text x="${x + 5}" y="${y - 3}" font-size="6.5">💥</text>` : ''}<circle cx="${x}" cy="${y}" r="8" fill="transparent"/></g>`;
    }
  }
  // fichas: dos en la misma casilla se dibujan una al lado de la otra
  const grp = {}, list = [];
  for (const c of P.order) P.pieces[c].forEach((_, i) => {
    const p = posVis(c, i);
    if (p >= 0 && p < 71) { const k = pKey(c, p); grp[k] = grp[k] || []; list.push({ c, i, p, k, n: grp[k].length }); grp[k].push(1); }
    else { const [x, y] = pXY(c, p, i); list.push({ c, i, p, x, y }); }
  });
  list.forEach(o => { if (o.k) { const [x, y] = pXY(o.c, o.p, o.i), two = grp[o.k].length === 2; o.x = x + (two ? (o.n ? 3.3 : -3.3) : 0); o.y = y; o.two = two; } });
  list.sort((a, b) => mvSet.has(a.c + a.i) - mvSet.has(b.c + b.i));
  for (const o of list) {
    const mv = mvSet.has(o.c + o.i), r = o.p === 71 ? 3 : o.p === -1 ? 5.1 : o.two ? 3.3 : 4.6;
    s += `<g ${mv ? `data-pc="${o.c},${o.i}" style="cursor:pointer"` : ''}>${mv ? `<circle class="mv" cx="${o.x}" cy="${o.y}" r="${r + 2.2}"/>` : ''}${ficha(f, o.c, o.x, o.y, r)}${mv ? `<circle cx="${o.x}" cy="${o.y}" r="${r + 3.5}" fill="transparent"/>` : ''}</g>`;
  }
  return s + '</svg>';
}

/* ---------- entrada ---------- */
function alCambiar(e) { if (e.target.id === 'pzLibre') { libre = e.target.checked; api.setPref('libre', libre); } }
function alEscribir(e) {
  const c = e.target.dataset && e.target.dataset.name; if (!c) return;
  nombres[c] = e.target.value.slice(0, 14); api.setPref('names', nombres);
}
function clic(e) {
  const pc = e.target.closest('[data-pc]');
  if (pc && P && P.phase === 'move' && !esCPU(P, actual(P)) && !P.anim) { const [c, i] = pc.dataset.pc.split(','), m = P.moves.find(m => m.c === c && m.i === +i); if (m) jugarMov(m); return; }
  const ds = e.target.closest('[data-dest]');
  if (ds && P && P.phase === 'move' && !esCPU(P, actual(P)) && !P.anim) { const m = P.moves.find(m => m.to === +ds.dataset.dest); if (m) jugarMov(m); return; }
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.cfg) { const [c, t] = b.dataset.cfg.split(','); cfgSetup[c] = t === 'n' ? null : t; api.setPref('cfg', cfgSetup); return rSetup(); }
  if (b.dataset.vel) { api.setPref('vel', b.dataset.vel); return modo === 'setup' ? rSetup() : pintarJuego(); }
  const ac = b.dataset.ac;
  if (ac === 'start') {
    if (PC.filter(c => cfgSetup[c]).length < 2) return;
    const nm = {}; PC.forEach(c => { if (cfgSetup[c] && nombres[c] && nombres[c].trim()) nm[c] = nombres[c].trim().slice(0, 14); });
    P = nuevaPartida(cfgSetup, nm, { salidaLibre: libre }); P.anim = false; modo = 'juego'; ultFoco = ''; guardar(); rJuego(); pintarJuego(); drive();
  } else if (ac === 'roll') { if (P && P.phase === 'roll' && !esCPU(P, actual(P))) iniciarTirada(); }
  else if (ac === 'setup') nuevaSetup();
  else if (ac === 'aspecto') asp.abrir();
}
function reglas() { api.modal('Parchís', listaReglas()); }
