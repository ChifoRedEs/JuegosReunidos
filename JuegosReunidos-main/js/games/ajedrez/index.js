import { crearDuelo } from '../../core/duelo.js';
import { esc } from '../../core/dom.js';
import { VARIANTES, estadoInicial, jugadas, aplicar, validarEstado, ia, reglasHTML, rendirse, jaque, de, a, coronacion, NOMBRE_PIEZA, aPGN, dePGN } from './reglas.js';

const GLIFO = ['', '♟', '♞', '♝', '♜', '♛', '♚'].map(g => g && g + '\uFE0E');   // \uFE0E: forzar el dibujo de texto (no emoji)
const INICIALES = [0, 8, 2, 2, 2, 1, 0], VALOR = [0, 1, 3, 3, 5, 9, 0];
let cont = null, celdas = [], ctxR = null, eAct = null, sel = null, legal = [], flip = false, prom = null, arr = null, cuentaAnt = -1;
// Reloj (minutos + segundos de incremento por jugada), revisión de la partida y caché de posiciones para revisar
const RELOJES = { no: { nombre: 'Sin reloj' }, '3+2': { base: 3, inc: 2 }, '5+3': { base: 5, inc: 3 }, '10+5': { base: 10, inc: 5 }, '15+10': { base: 15, inc: 10 } };
let apiRef = null, relojCfg = 'no', tic = null, tAnt = 0, ultGuardado = 0, rev = null, posRev = [];
const relojActual = () => { const r = RELOJES[relojCfg]; return r && r.base ? { base: r.base * 60000, inc: r.inc * 1000 } : null; };
const fmtReloj = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return s < 20 && ms > 0 ? (Math.max(0, ms) / 1000).toFixed(1) : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

const casillaDe = d => (flip ? 63 - d : d);
const color = p => (p >> 3) + 1;                    // 1 blancas · 2 negras
const piezaHTML = p => `<span class="pz ${p >> 3 ? 'n' : 'b'}">${GLIFO[p & 7]}</span>`;

function montar(c, ctx) {
  cont = c; ctxR = ctx; eAct = null; sel = null; prom = null; arr = null; cuentaAnt = -1; rev = null; posRev = [];
  apiRef = ctx.api ? ctx.api() : null;
  relojCfg = apiRef ? apiRef.pref('reloj', 'no') : 'no'; if (!RELOJES[relojCfg]) relojCfg = 'no';
  c.innerHTML = `<div class="axw">
    <div class="axrel" id="axRelA" hidden></div>
    <div class="axcap" id="axCapA"></div>
    <div class="axtw"><div class="axtab" id="axTab" role="grid" aria-label="Tablero de ajedrez">${Array.from({ length: 64 }, (_, d) => `<button type="button" class="sq" data-d="${d}"><span class="cr"></span><span class="cf"></span><span class="pc"></span></button>`).join('')}</div>
      <div class="axprom" id="axProm" hidden></div></div>
    <div class="axcap" id="axCapB"></div>
    <div class="axrel" id="axRelB" hidden></div>
    <div class="axest" id="axEst" aria-live="polite"></div>
    <div class="axrev" id="axRev" hidden><button type="button" class="btn" data-rv="ini" aria-label="Al principio">⏮</button><button type="button" class="btn" data-rv="ant" aria-label="Jugada anterior">◀</button><span id="axRevN"></span><button type="button" class="btn" data-rv="sig" aria-label="Jugada siguiente">▶</button><button type="button" class="btn" data-rv="fin" aria-label="Posición actual">⏭</button><button type="button" class="btn on" data-rv="salir">Volver</button></div>
    <details class="axjug" open><summary>📜 Jugadas</summary><ol class="axlista" id="axLista"></ol>
      <div class="bar"><button type="button" class="btn" data-ax="revisar">🔍 Revisar</button><button type="button" class="btn" data-ax="pgn">📤 PGN</button><button type="button" class="btn" data-ax="importar">📥 Importar</button></div></details>
    <div class="bar"><span class="lbl">⏱️ Reloj</span><div class="seg">${Object.entries(RELOJES).map(([k, r]) => `<button type="button" class="btn" data-rl="${k}">${r.nombre || k}</button>`).join('')}</div></div></div>`;
  celdas = [...c.querySelectorAll('.sq')];
  const tab = c.querySelector('#axTab');
  tab.addEventListener('pointerdown', pDown); tab.addEventListener('pointermove', pMove);
  tab.addEventListener('pointerup', pUp); tab.addEventListener('pointercancel', pCancel);
  tab.addEventListener('click', e => { if (e.detail === 0) { const b = e.target.closest('.sq'); if (b) tocar(casillaDe(+b.dataset.d)); } });   // teclado (Intro)
  c.addEventListener('click', clicExtra);
  clearInterval(tic); tAnt = performance.now(); tic = setInterval(correReloj, 200);
  c.querySelector('#axProm').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const m = b.dataset.m; ocultarProm(); if (m) ctxR.jugar(+m); else repintar();
  });
}

/* ---------- reloj ---------- */
// Corre el tiempo del bando que mueve (desde la primera jugada de las blancas; se para si la app no está visible)
function correReloj() {
  const ahora = performance.now(), dt = Math.min(1000, ahora - tAnt); tAnt = ahora;
  if (!ctxR || !eAct || !eAct.reloj || eAct.fin || eAct.n === 0 || rev != null || document.hidden || ctxR.estado() !== eAct) return;
  const k = eAct.turn - 1; eAct.reloj.ms[k] = Math.max(0, eAct.reloj.ms[k] - dt);
  if (eAct.reloj.ms[k] <= 0) {
    ctxR.sonido('perder');
    ctxR.ponerEstado({ ...eAct, reloj: { ...eAct.reloj, ms: eAct.reloj.ms.slice() }, fin: { w: 3 - eAct.turn, motivo: 'Tiempo agotado' } });
    return;
  }
  pintarReloj();
  if (ahora - ultGuardado > 5000) { ultGuardado = ahora; ctxR.guardar(); }
}
function pintarReloj() {
  if (!cont) return;
  const e = eAct, r = e && e.reloj, A = cont.querySelector('#axRelA'), B = cont.querySelector('#axRelB');
  A.hidden = B.hidden = !r; if (!r) return;
  const abajo = flip ? 2 : 1, arriba = 3 - abajo;
  for (const [el, lado] of [[B, abajo], [A, arriba]]) {
    const ms = r.ms[lado - 1], activo = !e.fin && e.turn === lado && e.n > 0;
    const html = `<span>${lado === 1 ? '♔ Blancas' : '♚ Negras'}</span><b>${fmtReloj(ms)}</b>`;
    if (el.dataset.k !== html + activo) { el.dataset.k = html + activo; el.innerHTML = html; el.className = 'axrel' + (activo ? ' on' : '') + (ms < 20000 ? ' poco' : ''); }
  }
}

/* ---------- revisión, PGN y opciones propias ---------- */
function posicion(k) {                            // posición tras k jugadas (se calcula una vez y se guarda)
  if (!eAct || !eAct.movs) return null;
  if (posRev.length !== eAct.movs.length + 1 || posRev.movs !== eAct.movs) {
    const l = [estadoInicial()]; for (const m of eAct.movs) l.push(aplicar(l[l.length - 1], m));
    posRev = l; posRev.movs = eAct.movs;
  }
  return posRev[k];
}
function clicExtra(ev) {
  const b = ev.target.closest('button,[data-k]'); if (!b || !eAct) return;
  const d = b.dataset, api = apiRef;
  if (d.rl) {
    relojCfg = d.rl; if (api) api.setPref('reloj', d.rl);
    if (eAct.n === 0 && !eAct.fin) ctxR.ponerEstado(estadoInicial(relojActual()), { limpiar: true });       // aún no se ha movido: se aplica ya
    else if (api) api.aviso('El reloj se aplicará en la próxima partida');
    return repintar();
  }
  if (d.ax === 'revisar') {
    if (!eAct.movs) { if (api) api.aviso('Esta partida es de una versión anterior y no se puede revisar'); return; }
    if (!eAct.n) { if (api) api.aviso('Todavía no hay jugadas'); return; }
    rev = Math.max(0, eAct.n - 1); sel = null; return repintar();
  }
  if (d.rv) {
    const n = eAct.n;
    if (d.rv === 'salir') rev = null; else rev = Math.max(0, Math.min(n, d.rv === 'ini' ? 0 : d.rv === 'fin' ? n : rev + (d.rv === 'sig' ? 1 : -1)));
    ctxR.sonido('click'); return repintar();
  }
  if (d.k != null && b.closest('#axLista') && eAct.movs) { rev = +d.k; ctxR.sonido('click'); return repintar(); }
  if (d.ax === 'pgn') return exportarPGN();
  if (d.ax === 'importar') return importarPGN();
}
function exportarPGN() {
  const api = apiRef; if (!api) return;
  const cpu = ctxR.modo() === 'cpu', yo = ctxR.yo();
  const txt = aPGN(eAct, { blancas: cpu ? (yo === 1 ? 'Yo' : 'CPU') : 'Jugador 1', negras: cpu ? (yo === 2 ? 'Yo' : 'CPU') : 'Jugador 2' });
  const m = api.modal('📤 Partida en PGN', `<p class="note">El formato estándar del ajedrez: puedes pegarlo en Lichess, Chess.com o cualquier programa para analizar la partida.</p><textarea class="pedir" rows="8" readonly spellcheck="false"></textarea><div class="bar"><button class="btn on" data-pgn="copiar">📋 Copiar</button><button class="btn" data-pgn="bajar">💾 Descargar .pgn</button></div>`);
  const ta = m.cuerpo.querySelector('textarea'); ta.value = txt;
  m.cuerpo.addEventListener('click', async e => {
    const b = e.target.closest('[data-pgn]'); if (!b) return;
    if (b.dataset.pgn === 'copiar') { try { await navigator.clipboard.writeText(txt); api.aviso('📋 PGN copiado'); } catch { ta.select(); api.aviso('Selecciona el texto y cópialo'); } }
    else { const u = URL.createObjectURL(new Blob([txt], { type: 'application/x-chess-pgn' })), l = document.createElement('a'); l.href = u; l.download = `partida-${new Date().toISOString().slice(0, 10)}.pgn`; document.body.append(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000); }
  });
}
async function importarPGN() {
  const api = apiRef; if (!api) return;
  const txt = await api.pedirTexto('📥 Importar partida', { tipo: 'area', max: 20000, nota: 'Pega un PGN o una lista de jugadas (en notación inglesa o española). La partida seguirá desde la última posición.', placeholder: '1. e4 e5 2. Nf3 Nc6 3. Bb5 …' });
  if (txt == null || !txt.trim()) return;
  const r = dePGN(txt);
  if (r.error) { api.modal('No se pudo importar', `<p>${esc(r.error)}</p>`); return; }
  if (eAct && eAct.n && !eAct.fin && !api.confirmar('¿Cambiar la partida actual por la importada?')) return;
  rev = null; ctxR.ponerEstado(r.e, { limpiar: true });
  api.aviso(`Partida importada: ${r.e.n} jugadas${r.e.fin ? ' · ' + r.e.fin.motivo : ''}`);
}

/* ---------- interacción ---------- */
function tocar(sq) {
  if (!eAct || !ctxR.puedeJugar() || prom || rev != null) return;
  if (sel != null) {
    const cands = legal.filter(m => de(m) === sel && a(m) === sq);
    if (cands.length > 1) return mostrarProm(cands);
    if (cands.length === 1) { sel = null; ctxR.jugar(cands[0]); return; }
  }
  const p = eAct.b[sq];
  if (p && color(p) === eAct.turn && legal.some(m => de(m) === sq)) { sel = sel === sq ? null : sq; ctxR.sonido('click'); }
  else { if (p && color(p) === eAct.turn) ctxR.sonido('error'); sel = null; }
  repintar();
}
function pDown(e) {
  if (e.button > 0) return;
  const b = e.target.closest('.sq'); if (!b) return;
  arr = { sq: casillaDe(+b.dataset.d), x: e.clientX, y: e.clientY, ghost: null, id: e.pointerId };
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignorar */ }
}
function pMove(e) {
  if (!arr || e.pointerId !== arr.id) return;
  if (!arr.ghost) {
    if (Math.hypot(e.clientX - arr.x, e.clientY - arr.y) < 8) return;
    const p = eAct && eAct.b[arr.sq];
    if (!p || color(p) !== eAct.turn || !ctxR.puedeJugar() || prom || rev != null || !legal.some(m => de(m) === arr.sq)) { arr = null; return; }
    sel = arr.sq; repintar();
    const g = document.createElement('div'); g.className = 'axghost';                    // dentro del juego: hereda los colores de 🎨 Apariencia
    g.style.setProperty('--tam', celdas[0].getBoundingClientRect().width + 'px'); g.innerHTML = piezaHTML(p);
    cont.append(g); arr.ghost = g;
    celdas.forEach(c => c.classList.toggle('orig', casillaDe(+c.dataset.d) === arr.sq));
  }
  arr.ghost.style.left = e.clientX + 'px'; arr.ghost.style.top = e.clientY + 'px';
  const bajo = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.sq');
  celdas.forEach(c => c.classList.toggle('sobre', c === bajo));
}
function pUp(e) {
  if (!arr || e.pointerId !== arr.id) return;
  const d = arr; arr = null;
  if (!d.ghost) { tocar(d.sq); return; }
  d.ghost.remove(); celdas.forEach(c => c.classList.remove('sobre', 'orig'));
  const bajo = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.sq');
  if (bajo) { const sq = casillaDe(+bajo.dataset.d); if (sq !== d.sq) { tocar(sq); return; } }
  repintar();
}
function pCancel() { if (arr && arr.ghost) arr.ghost.remove(); arr = null; celdas.forEach(c => c.classList.remove('sobre', 'orig')); }
function mostrarProm(cands) {
  prom = cands; const s = eAct.turn === 2 ? 8 : 0;
  const el = cont.querySelector('#axProm');
  el.innerHTML = `<div class="axpc"><b>Coronar el peón</b><div class="axpo">${cands.slice().sort((x, y) => coronacion(y) - coronacion(x)).map(m => `<button type="button" data-m="${m}" aria-label="${NOMBRE_PIEZA[coronacion(m)]}">${piezaHTML(coronacion(m) | s)}<small>${NOMBRE_PIEZA[coronacion(m)]}</small></button>`).join('')}</div><button type="button" class="btn" data-cancel>Cancelar</button></div>`;
  el.hidden = false; ctxR.sonido('click');
  el.querySelector('button').focus({ preventScroll: true });
}
function ocultarProm() { prom = null; sel = null; const el = cont && cont.querySelector('#axProm'); if (el) { el.hidden = true; el.innerHTML = ''; } }

/* ---------- pintado ---------- */
const repintar = () => { if (eAct && ctxR) pintar(eAct, ctxR); };
function pintar(eReal, ctx) {
  if (!cont || !celdas.length) return;
  ctxR = ctx;
  if (eReal !== eAct) {
    if (eAct && eReal.n !== eAct.n + 1) rev = null;                    // partida nueva, deshacer o importación: fuera de la revisión
    eAct = eReal; sel = null; if (prom) ocultarProm();
    const e = eReal;
    legal = e.fin ? [] : jugadas(e);
    const piezas = e.b.filter(Boolean).length;
    if (cuentaAnt >= 0 && piezas < cuentaAnt && e.n > 0) ctx.sonido('captura');
    cuentaAnt = piezas;
  }
  if (rev != null && (!eAct.movs || rev > eAct.n)) rev = null;
  const revisando = rev != null && rev !== eAct.n, e = revisando ? posicion(rev) : eAct;   // en revisión se pinta la posición elegida
  flip = ctx.modo() === 'cpu' && ctx.yo() === 2;
  const jq = e.fin && e.fin.motivo !== 'Jaque mate' ? -1 : jaque(e), marcas = (ctx.valores().marcas || 'si') === 'si';
  const destinos = new Map(); if (sel != null) legal.filter(m => de(m) === sel).forEach(m => destinos.set(a(m), true));
  const pd = ctx.pista != null ? de(ctx.pista) : -1, pa = ctx.pista != null ? a(ctx.pista) : -1, ult = e.ult || [];
  const puede = ctx.puedeJugar() && !revisando;
  celdas.forEach((c, d) => {
    const sq = casillaDe(d), r = sq >> 3, f = sq & 7, p = e.b[sq];
    const cls = 'sq ' + ((r + f) & 1 ? 'osc' : 'cla') + (ult.includes(sq) ? ' ult' : '') + (sel === sq ? ' sel' : '') + (destinos.has(sq) && marcas ? (p || (e.ep === sq && (e.b[sel] & 7) === 1) ? ' dcap' : ' dest') : '')
      + (destinos.has(sq) && !marcas ? ' dsin' : '') + (jq === sq ? ' jaque' : '') + (sq === pd || sq === pa ? ' pista' : '') + (puede && p && color(p) === e.turn ? ' mia' : '');
    if (c.className !== cls) c.className = cls;
    const pc = c.lastElementChild, k = String(p);
    if (pc.dataset.p !== k) { pc.innerHTML = p ? piezaHTML(p) : ''; pc.dataset.p = k; }
    c.children[0].textContent = (d & 7) === 0 ? String(8 - r) : '';
    c.children[1].textContent = (d >> 3) === 7 ? 'abcdefgh'[f] : '';
    c.setAttribute('aria-label', `${'abcdefgh'[f]}${8 - r}${p ? ', ' + NOMBRE_PIEZA[p & 7] + (p >> 3 ? ' negro' : ' blanco') : ''}${sq === jq ? ', en jaque' : ''}`);
  });
  cont.querySelector('#axTab').classList.toggle('on', puede);
  // piezas capturadas y ventaja de material
  const cuenta = [[0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0]], mat = [0, 0];
  e.b.forEach(p => { if (p) { cuenta[p >> 3][p & 7]++; mat[p >> 3] += VALOR[p & 7]; } });
  const comidas = s => [5, 4, 3, 2, 1].map(t => (GLIFO[t] ? `<span class="pz ${s ? 'n' : 'b'}">${GLIFO[t]}</span>`.repeat(Math.max(0, INICIALES[t] - cuenta[s][t])) : '')).join('');
  const abajo = flip ? 1 : 0, arriba = abajo ^ 1, dif = mat[abajo] - mat[arriba];
  cont.querySelector('#axCapA').innerHTML = comidas(abajo) + (dif < 0 ? `<b>+${-dif}</b>` : '');
  cont.querySelector('#axCapB').innerHTML = comidas(arriba) + (dif > 0 ? `<b>+${dif}</b>` : '');
  // estado
  const est = cont.querySelector('#axEst');
  est.className = 'axest' + (e.fin ? ' fin' : jq >= 0 ? ' jq' : '');
  est.textContent = e.fin ? `${e.fin.motivo}${e.fin.w ? ` · ganan las ${e.fin.w === 1 ? 'blancas' : 'negras'}` : ' · tablas'}` : jq >= 0 ? '¡Jaque!' : e.n ? '' : 'Mueven las blancas';
  // lista de jugadas
  const E = eAct, lista = cont.querySelector('#axLista'), base = E.n - E.san.length, marca = rev != null ? rev - 1 - base : E.san.length - 1;
  const html = [];
  for (let i = 0; i < E.san.length; i++) {
    const nj = base + i;
    if (nj % 2 === 0 || i === 0) html.push(`<li value="${(nj >> 1) + 1}">${nj % 2 ? '<span class="vac">…</span>' : ''}`);
    html.push(`<span class="${i === marca ? 'ultj' : ''}" ${E.movs ? `data-k="${nj + 1}" role="button" tabindex="0"` : ''}>${esc(E.san[i])}</span>`);
    if (nj % 2 === 1 || i === E.san.length - 1) html.push('</li>');
  }
  const nuevo = html.join('') || '<li class="vacio">Aún no hay jugadas.</li>', kl = E.san.length + '|' + marca;
  if (lista.dataset.k !== kl) { lista.innerHTML = nuevo; lista.dataset.k = kl; const u = lista.querySelector('.ultj'); if (u && rev != null) u.scrollIntoView({ block: 'nearest' }); else lista.scrollTop = lista.scrollHeight; }
  // barra de revisión y botones
  const rv = cont.querySelector('#axRev'); rv.hidden = rev == null;
  if (rev != null) cont.querySelector('#axRevN').textContent = rev === 0 ? 'Inicio' : `Jugada ${rev} de ${E.n}`;
  if (revisando) { est.className = 'axest'; est.textContent = '🔍 Revisando la partida (no se puede mover)'; }
  cont.querySelector('[data-ax="revisar"]').disabled = !E.movs || !E.n;
  cont.querySelectorAll('[data-rl]').forEach(b => b.classList.toggle('on', b.dataset.rl === relojCfg));
  pintarReloj();
}

const duelo = crearDuelo({
  id: 'ajedrez', css: new URL('./ajedrez.css', import.meta.url), iaModulo: new URL('./reglas.js', import.meta.url).href, variantes: VARIANTES, nombres: ['Blancas', 'Negras'],
  chip: n => `<i class="ch axch${n}">${GLIFO[6]}</i>`,
  aspecto: [
    { clave: 'tablero', titulo: 'Colores del tablero', def: 'madera', opciones: [{ id: 'madera', nombre: 'Madera', sw: ['#F0D9B5', '#B58863'] }, { id: 'torneo', nombre: 'Torneo', sw: ['#EEEED2', '#769656'] }, { id: 'oceano', nombre: 'Océano', sw: ['#E4EDFF', '#5B7FD6'] }, { id: 'uva', nombre: 'Uva', sw: ['#F3E8FF', '#8B5CF6'] }, { id: 'noche', nombre: 'Noche', sw: ['#4A5486', '#232A55'] }] },
    { clave: 'piezas', titulo: 'Colores de las piezas', def: 'clasicas', opciones: [{ id: 'clasicas', nombre: 'Blancas y negras', sw: ['#FFFFFF', '#1E1E24'] }, { id: 'marfil', nombre: 'Marfil y ébano', sw: ['#FFF4DC', '#4A2E17'] }, { id: 'colores', nombre: 'Oro y morado', sw: ['#FFD43B', '#5B2DD4'] }] },
    { clave: 'marcas', titulo: 'Marcar las casillas posibles', def: 'si', opciones: [{ id: 'si', nombre: 'Sí' }, { id: 'no', nombre: 'No' }] },
  ],
  estadoInicial: () => estadoInicial(relojActual()), jugadas, aplicar, validarEstado, ia, reglasHTML, rendirse, vista: { montar, pintar },
});
export const { mount, validar, resumen } = duelo;
export function unmount() { pCancel(); clearInterval(tic); tic = null; if (ctxR && eAct && eAct.reloj) ctxR.guardar(); cont = null; celdas = []; eAct = null; ctxR = null; rev = null; posRev = []; return duelo.unmount(); }
export const migrarV1 = d => d;
