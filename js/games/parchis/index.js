import { $, esc, rnd } from '../../core/dom.js';
import { PC, PNAME, PCOL, PINK, PSAFE, PHOUSE, PTRACK, PTRI, PCORR, PSTART, PIPS, absOf, pXY, pKey } from './tablero.js';
import { nombre, actual, esCPU, nuevaPartida, legales, tirar, mover, siguiente, mejorJugada } from './reglas.js';

const VEL = { rapida: .5, normal: 1, lenta: 1.7 };
let P = null, api = null, rootEl = null, modo = 'setup', timer = null, ivDado = null, ivAnim = null, rodando = false;
let cfgSetup = { am: 'h', az: 'c', ro: 'c', ve: 'c' }, nombres = {};
const velMult = () => VEL[api.pref('vel', 'normal')] || 1;

/* ---------- validación / migración ---------- */
export function validar(x) {
  if (!x || typeof x !== 'object' || !Array.isArray(x.order) || x.order.length < 2 || x.order.length > 4 || new Set(x.order).size !== x.order.length || !x.order.every(c => PC.includes(c))) return null;
  if (!x.cfg || typeof x.cfg !== 'object' || !x.pieces || typeof x.pieces !== 'object' || !x.order.every(c => ['h', 'c'].includes(x.cfg[c]) && Array.isArray(x.pieces[c]) && x.pieces[c].length === 4 && x.pieces[c].every(p => Number.isInteger(p) && p >= -1 && p <= 71))) return null;
  const ok = Number.isInteger(x.turn) && x.turn >= 0 && x.turn < x.order.length && ['roll', 'move', 'pass', 'over'].includes(x.phase)
    && Number.isInteger(x.step) && x.step >= 0 && x.step <= 20 && ['die', 'bonus'].includes(x.kind)
    && Array.isArray(x.pend) && x.pend.every(v => v === 10 || v === 20) && Number.isInteger(x.sixes) && x.sixes >= 0 && x.sixes < 3
    && (x.die == null || (Number.isInteger(x.die) && x.die >= 1 && x.die <= 6)) && (x.lastMoved == null || [0, 1, 2, 3].includes(x.lastMoved))
    && (x.phase !== 'over' || x.order.includes(x.winner));
  if (!ok) return null;
  const names = {}; if (x.names && typeof x.names === 'object') for (const c of x.order) if (typeof x.names[c] === 'string') names[c] = x.names[c].slice(0, 14);
  const cfg = {}; PC.forEach(c => { cfg[c] = x.order.includes(c) ? x.cfg[c] : null; });
  return { cfg, names, order: x.order.slice(), pieces: Object.fromEntries(x.order.map(c => [c, x.pieces[c].slice()])), turn: x.turn, phase: x.phase, die: x.die ?? null,
    step: x.step, kind: x.kind, pend: x.pend.slice(), sixes: x.sixes, again: !!x.again, lastMoved: x.lastMoved ?? null, winner: x.phase === 'over' ? x.winner : null };
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
  const d = { cfg: P.cfg, names: P.names, order: P.order, pieces: P.pieces, turn: P.turn, phase: P.phase, die: P.die, step: P.step, kind: P.kind, pend: P.pend, sixes: P.sixes, again: P.again, lastMoved: P.lastMoved, winner: P.winner };
  const r = resumen(d); api.guardar(d, r.texto, r.fin);
}

/* ---------- ciclo de vida ---------- */
export async function mount(root, a) {
  api = a; rootEl = root; rodando = false;
  await api.css(new URL('./parchis.css', import.meta.url));
  const c0 = api.pref('cfg', null);
  if (c0 && PC.every(c => ['h', 'c', null].includes(c0[c] ?? null)) && PC.filter(c => c0[c]).length >= 2) cfgSetup = { am: c0.am ?? null, az: c0.az ?? null, ro: c0.ro ?? null, ve: c0.ve ?? null };
  const n0 = api.pref('names', {}); nombres = n0 && typeof n0 === 'object' ? { ...n0 } : {};
  root.addEventListener('click', clic); root.addEventListener('input', alEscribir);
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: 'Reglas', accion: reglas }]);
  const g = api.cargar();
  if (g) { restaurar(g); modo = 'juego'; rJuego(); pintarJuego(); drive(); }
  else { P = null; modo = 'setup'; rSetup(); }
}
export function unmount() {
  clearTimeout(timer); clearInterval(ivDado); clearInterval(ivAnim); timer = ivDado = ivAnim = null; rodando = false;
  if (rootEl) { rootEl.removeEventListener('click', clic); rootEl.removeEventListener('input', alEscribir); }
  P = null;
}

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
  clearInterval(ivAnim);
  ivAnim = setInterval(() => {
    if (!P) { clearInterval(ivAnim); return; }
    P.ov[k0] = pasos[k]; if (tab) tab.innerHTML = pBoard(); k++;
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
    ${PC.map(c => `<div class="prow"><span class="dot" style="background:${PCOL[c]}"></span>
      <input class="nom" data-name="${c}" maxlength="14" placeholder="${PNAME[c]}" value="${esc(nombres[c] || '')}" aria-label="Nombre del jugador ${PNAME[c]}">
      <div class="seg">${[['h', 'Persona'], ['c', 'CPU'], ['n', 'Nadie']].map(([t, l]) => `<button class="btn ${(cfgSetup[c] || 'n') === t ? 'on' : ''}" data-cfg="${c},${t}">${l}</button>`).join('')}</div></div>`).join('')}
    <div class="bar"><span class="lbl">Velocidad CPU</span>${velBotones()}</div>
    <div class="bar"><button class="btn on" data-ac="start" ${n < 2 ? 'disabled' : ''}>Empezar partida</button>${n < 2 ? '<span class="note">Elige al menos 2 jugadores.</span>' : ''}</div>
    <details><summary>Reglas</summary>${listaReglas()}</details>
    <div class="pz">${pBoard()}</div>`;
}
const velBotones = () => `<div class="seg">${[['rapida', 'Rápida'], ['normal', 'Normal'], ['lenta', 'Lenta']].map(([k, l]) => `<button class="btn ${api.pref('vel', 'normal') === k ? 'on' : ''}" data-vel="${k}">${l}</button>`).join('')}</div>`;
function listaReglas() {
  return `<ul>
    <li>Sacas ficha de casa con un 5. Si puedes sacar, es obligatorio.</li>
    <li>Con un 6 vuelves a tirar. Si no te quedan fichas en casa, el 6 cuenta 7.</li>
    <li>Tres 6 seguidos: la última ficha movida vuelve a casa (salvo si está en el pasillo).</li>
    <li>Comer una ficha rival te da 20 casillas extra; meter una en meta, 10.</li>
    <li>En los seguros (casillas con círculo) y en las salidas no se come.</li>
    <li>Dos fichas del mismo color forman barrera: nadie puede pasar. Con un 6 debes abrirla.</li>
    <li>A meta se entra con el número exacto. Gana quien mete antes sus 4 fichas.</li>
    <li>Para mover, toca una ficha resaltada <b>o</b> la casilla de destino marcada con puntos.</li></ul>`;
}
function rJuego() {
  rootEl.innerHTML = `
    <div class="pz" id="pzTab"></div>
    <div class="pbar"><button type="button" class="die" id="pzDie" data-ac="roll" aria-label="Dado"></button><div><div class="msg" id="pzMsg" role="status" aria-live="polite"></div><div class="note" id="pzSub"></div></div></div>
    <div class="bar"><button class="btn on" id="pzRoll" data-ac="roll">Tirar dado</button><button class="btn" data-ac="setup">Nueva partida</button></div>
    <div class="bar"><span class="lbl">Velocidad CPU</span><span id="pzVel">${velBotones()}</span></div>
    <ul class="plog" id="pzLog"></ul>`;
}
function pintarDado(v, c, roda) {
  const d = $('#pzDie'); if (!d) return;
  d.style.setProperty('--pc', PCOL[c]); d.classList.toggle('roda', !!roda);
  if (v) { d.className = 'die' + (roda ? ' roda' : ''); d.innerHTML = [...Array(9).keys()].map(k => `<i class="${PIPS[v].includes(k) ? 'on' : ''}"></i>`).join(''); }
  else { d.className = 'die q'; d.textContent = '?'; }
}
function pintarJuego() {
  if (modo !== 'juego' || !P || !$('#pzTab')) return;
  if (!P.anim) $('#pzTab').innerHTML = pBoard();
  const over = P.phase === 'over', c = over ? P.winner : actual(P), who = nombre(P, c) + (esCPU(P, c) ? ' (CPU)' : '');
  const humano = !over && !esCPU(P, c);
  const msg = over ? `¡Gana ${nombre(P, P.winner)}!` : rodando ? `${who} tira…` : P.phase === 'pass' ? P.note : P.phase === 'roll' ? (esCPU(P, c) ? `${who} va a tirar…` : `${who}: tira el dado.`) : (esCPU(P, c) ? `${who} está pensando…` : `${who}: toca una ficha resaltada.`);
  const sub = over || rodando ? '' : P.phase === 'move' ? (P.kind === 'bonus' ? `Premio: cuenta ${P.step}.` : P.step === 7 ? 'El 6 cuenta 7: no quedan fichas en casa.' : `Mueve ${P.step}.`) : '';
  if (!rodando) pintarDado(P.die, c, false);
  const m = $('#pzMsg'); m.textContent = msg; m.className = 'msg' + (over ? ' win' : '');
  $('#pzSub').textContent = sub;
  $('#pzRoll').disabled = !(humano && P.phase === 'roll' && !rodando && !P.anim);
  $('#pzLog').innerHTML = P.log.map(l => `<li>${esc(l)}</li>`).join('');
  const v = $('#pzVel'); if (v) v.innerHTML = velBotones();
}

/* ---------- tablero SVG ---------- */
const posVis = (c, i) => (P.ov && P.ov[c + ',' + i] !== undefined ? P.ov[c + ',' + i] : P.pieces[c][i]);
function pBoard() {
  const cur = P && P.phase !== 'over' ? actual(P) : null, human = !!P && P.phase === 'move' && !esCPU(P, cur) && !P.anim;
  let s = `<svg viewBox="0 0 190 190" role="img" aria-label="Tablero de parchís"><rect width="190" height="190" style="fill:var(--card)"/>`;
  for (const c of PC) {
    const [hx, hy] = PHOUSE[c], cf = P ? P.cfg[c] : cfgSetup[c], on = !!cf;
    const etiqueta = on ? (nombres && !P ? (nombres[c] || '') : P ? (P.names[c] || '') : '') || (cf === 'c' ? 'CPU' : 'Persona') : '';
    s += `<g opacity="${on ? 1 : .3}"><rect x="${hx}" y="${hy}" width="80" height="80" fill="${PCOL[c]}"/>${cur === c ? `<rect x="${hx + 2}" y="${hy + 2}" width="76" height="76" fill="none" stroke-width="2" style="stroke:var(--ink)"/>` : ''}
      <circle cx="${hx + 40}" cy="${hy + 40}" r="23" style="fill:var(--card)"/>
      <text x="${hx + 40}" y="${hy + 75}" text-anchor="middle" font-size="7" font-weight="800" fill="${PINK[c]}" font-family="Nunito,sans-serif">${esc(etiqueta)}</text></g>`;
  }
  for (let n = 1; n <= 68; n++) {
    const [r, c] = PTRACK[n], st = PC.find(k => PSTART[k] === n);
    s += `<rect x="${c * 10}" y="${r * 10}" width="10" height="10" stroke-width=".5" ${st ? `fill="${PCOL[st]}" fill-opacity=".55" style="stroke:var(--line)"` : `style="stroke:var(--line);fill:var(${PSAFE.has(n) ? '--sel' : '--card'})"`}/>`;
    if (PSAFE.has(n)) s += `<circle cx="${c * 10 + 5}" cy="${r * 10 + 5}" r="3.6" fill="none" stroke-width=".5" style="stroke:var(--mut)"/>`;
    s += `<text x="${c * 10 + 5}" y="${r * 10 + 6.3}" text-anchor="middle" font-size="3.4" style="fill:var(--mut)" font-family="Nunito,sans-serif">${n}</text>`;
  }
  for (const c of PC) for (let k = 1; k <= 7; k++) { const [r, cc] = PCORR(c, k); s += `<rect x="${cc * 10}" y="${r * 10}" width="10" height="10" fill="${PCOL[c]}" fill-opacity=".4" stroke-width=".5" style="stroke:var(--line)"/>`; }
  for (const c of PC) s += `<polygon points="${PTRI[c]}" fill="${PCOL[c]}" stroke-width=".6" style="stroke:var(--card)"/>`;
  if (!P) return s + '</svg>';
  if (human) {           // casillas de destino tocables
    const seen = new Set();
    for (const m of P.moves) {
      if (seen.has(m.to)) continue; seen.add(m.to);
      const [x, y] = pXY(m.c, m.to, 0);
      s += `<g data-dest="${m.to}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="2.6" fill="none" stroke="${PCOL[m.c]}" stroke-width="1" stroke-dasharray="1 .8"/><circle cx="${x}" cy="${y}" r="6" fill="transparent"/></g>`;
    }
  }
  // fichas: dos en la misma casilla se dibujan una al lado de la otra
  const grp = {}, list = [];
  for (const c of P.order) P.pieces[c].forEach((_, i) => {
    const p = posVis(c, i);
    if (p >= 0 && p < 71) { const k = pKey(c, p); grp[k] = grp[k] || []; list.push({ c, i, p, k, n: grp[k].length }); grp[k].push(1); }
    else { const [x, y] = pXY(c, p, i); list.push({ c, i, p, x, y }); }
  });
  const mvSet = new Set(human ? P.moves.map(m => m.c + m.i) : []);
  list.forEach(o => { if (o.k) { const [x, y] = pXY(o.c, o.p, o.i), two = grp[o.k].length === 2; o.x = x + (two ? (o.n ? 2.6 : -2.6) : 0); o.y = y; } });
  list.sort((a, b) => mvSet.has(a.c + a.i) - mvSet.has(b.c + b.i));
  for (const o of list) {
    const mv = mvSet.has(o.c + o.i), r = o.p === 71 ? 2 : 3.2;
    s += `<g ${mv ? `data-pc="${o.c},${o.i}" style="cursor:pointer"` : ''}>
      ${mv ? `<circle class="mv" cx="${o.x}" cy="${o.y}" r="4.7" fill="none" stroke-width="1.1" style="stroke:var(--ink)"/>` : ''}
      <circle cx="${o.x}" cy="${o.y}" r="${r}" fill="${PCOL[o.c]}" stroke="rgba(0,0,0,.55)" stroke-width=".7"/>
      <circle cx="${o.x - r * .3}" cy="${o.y - r * .3}" r="${r * .3}" fill="#fff" opacity=".55"/>
      ${mv ? `<circle cx="${o.x}" cy="${o.y}" r="6.6" fill="transparent"/>` : ''}</g>`;
  }
  return s + '</svg>';
}

/* ---------- entrada ---------- */
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
    P = nuevaPartida(cfgSetup, nm); P.anim = false; modo = 'juego'; guardar(); rJuego(); pintarJuego(); drive();
  } else if (ac === 'roll') { if (P && P.phase === 'roll' && !esCPU(P, actual(P))) iniciarTirada(); }
  else if (ac === 'setup') nuevaSetup();
}
function reglas() { api.modal('Parchís', listaReglas()); }
