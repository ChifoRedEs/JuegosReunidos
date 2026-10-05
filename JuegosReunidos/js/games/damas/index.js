import { $ } from '../../core/dom.js';
import { REGLAS, tableroInicial, jugadas, aplicar, contar, clavePos, esRey, dueno } from './reglas.js';
import { elegir } from './ia.js';

const NIVEL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
let C = null, api = null, sq = [], timer = null, pensando = false, rootEl = null, anim = null;
const R = () => REGLAS[C.regla];
const pos = p => p.join();
const igual = (a, b) => a[0] === b[0] && a[1] === b[1];

/* ---------- validación / migración ---------- */
const coord = p => Array.isArray(p) && p.length === 2 && p.every(v => Number.isInteger(v) && v >= 0 && v < 8);
const tab8 = g => Array.isArray(g) && g.length === 8 && g.every(r => Array.isArray(r) && r.length === 8 && r.every(v => [0, 'w', 'b', 'W', 'B'].includes(v)));
export function validar(d) {
  if (!d || typeof d !== 'object' || !tab8(d.b) || !['w', 'b'].includes(d.turn)) return null;
  const ult = d.ultimo && Array.isArray(d.ultimo.path) && d.ultimo.path.every(coord) && Array.isArray(d.ultimo.caps) && d.ultimo.caps.every(coord) ? { path: d.ultimo.path, caps: d.ultimo.caps } : null;
  const hist = Array.isArray(d.hist) ? d.hist.filter(h => h && tab8(h.b) && ['w', 'b'].includes(h.turn) && Number.isInteger(h.sp)).slice(-10).map(h => ({ b: h.b, turn: h.turn, sp: h.sp, ultimo: h.ultimo && h.ultimo.path && h.ultimo.path.every(coord) && Array.isArray(h.ultimo.caps) && h.ultimo.caps.every(coord) ? h.ultimo : null })) : [];
  const reps = {};
  if (d.reps && typeof d.reps === 'object') for (const [k, v] of Object.entries(d.reps).slice(0, 400)) if (typeof k === 'string' && k.length < 80 && Number.isInteger(v) && v > 0 && v < 10) reps[k] = v;
  return { b: d.b.map(r => r.slice()), turn: d.turn, regla: Object.hasOwn(REGLAS, d.regla) ? d.regla : 'espanola', nivel: Object.hasOwn(NIVEL, d.nivel) ? d.nivel : 'medio',
    ultimo: ult, sp: Number.isInteger(d.sp) && d.sp >= 0 ? d.sp : 0, reps, hist, over: !!d.over, res: ['w', 'b', 'tablas'].includes(d.res) ? d.res : null, reg: !!d.reg };
}
// La versión 1 solo guardaba {b, turn} y usaba reglas tipo inglesa.
export const migrarV1 = d => ({ b: d.b, turn: d.turn, regla: 'inglesa', nivel: 'medio' });
const textoFin = res => res === 'w' ? '¡Ganaste!' : res === 'b' ? 'Perdiste' : 'Tablas';
export function resumen(d) {
  if (d.over && d.res) return { texto: `${textoFin(d.res)} · ${REGLAS[d.regla].nombre}`, fin: true };
  const n = contar(d.b); return { texto: `${REGLAS[d.regla].nombre} · ${NIVEL[d.nivel]} · ⚪${n.w} 🔴${n.b}`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(root, a) {
  api = a; rootEl = root; pensando = false; anim = null;
  await api.css(new URL('./damas.css', import.meta.url));
  const g = api.cargar();
  root.innerHTML = `
    <div class="bar"><span class="lbl">Reglas</span>${Object.entries(REGLAS).map(([k, r]) => `<button class="btn" data-reg="${k}">${r.nombre}</button>`).join('')}</div>
    <div class="bar"><span class="lbl">Nivel CPU</span>${Object.entries(NIVEL).map(([k, l]) => `<button class="btn" data-niv="${k}">${l}</button>`).join('')}</div>
    <div class="msg" id="dmMsg" role="status" aria-live="polite"></div>
    <div class="ck" id="dmTab" role="group" aria-label="Tablero de damas"></div>
    <div class="cnt" id="dmCnt"></div>
    <div class="bar"><button class="btn on" data-ac="nueva">Nueva partida</button><button class="btn" data-ac="undo">↶ Deshacer</button></div>
    <p class="note" id="dmReg"></p>`;
  const tab = $('#dmTab');
  tab.innerHTML = Array.from({ length: 64 }, (_, k) => { const r = k >> 3, c = k & 7, d = (r + c) % 2 === 1; return `<div class="sq ${d ? 'd' : ''}" data-r="${r}" data-c="${c}" ${d ? 'tabindex="0" role="button"' : ''}></div>`; }).join('');
  sq = [...tab.children];
  root.addEventListener('click', clic); tab.addEventListener('keydown', tecla);
  api.menu([
    { texto: 'Nueva partida', accion: () => nueva(C.regla, C.nivel) },
    { texto: 'Deshacer jugada', accion: deshacer },
    { texto: 'Reglamento', accion: reglamento },
  ]);
  if (g) { C = { ...g, ruta: null }; C.jug = jugadas(C.b, C.turn, R()); if (!C.over) comprobarFin(); }
  else { C = null; nueva(api.pref('regla', 'espanola'), api.pref('nivel', 'medio'), true); return; }
  pintar();
  if (!C.over && C.turn === 'b') programarCPU();
}
export function unmount() {
  clearTimeout(timer); timer = null; pensando = false;
  if (rootEl) rootEl.removeEventListener('click', clic);
  C = null; sq = []; anim = null;
}

/* ---------- partida ---------- */
const hayProgreso = () => C && !C.over && C.hist.length > 0;
function nueva(regla, nivel, forzar = false) {
  if (!forzar && hayProgreso() && !api.confirmar('¿Empezar una partida nueva? Perderás la actual.')) return;
  clearTimeout(timer); pensando = false; anim = null;
  C = { b: tableroInicial(), turn: 'w', regla, nivel, over: false, res: null, ultimo: null, sp: 0, reps: {}, hist: [], ruta: null, reg: false };
  C.reps[clavePos(C.b, 'w')] = 1; C.jug = jugadas(C.b, 'w', R());
  api.setPref('regla', regla); api.setPref('nivel', nivel);
  pintar(); guardar();
}
function comprobarFin() {
  C.jug = jugadas(C.b, C.turn, R());
  if (!C.jug.length) { C.over = true; C.res = C.turn === 'w' ? 'b' : 'w'; }
  else if (C.sp >= 40) { C.over = true; C.res = 'tablas'; }
  else if ((C.reps[clavePos(C.b, C.turn)] || 0) >= 3) { C.over = true; C.res = 'tablas'; }
}
function guardar() {
  if (!C) return;
  const d = { b: C.b, turn: C.turn, regla: C.regla, nivel: C.nivel, ultimo: C.ultimo, sp: C.sp, reps: C.reps, hist: C.hist, over: C.over, res: C.res, reg: C.reg };
  const r = resumen(d); api.guardar(d, r.texto, r.fin);
}
function jugar(m) {
  if (C.turn === 'w') { C.hist.push({ b: C.b, turn: C.turn, ultimo: C.ultimo, sp: C.sp }); if (C.hist.length > 10) C.hist.shift(); }
  const [fr, fc] = m.path[0], peon = !esRey(C.b[fr][fc]);
  C.b = aplicar(C.b, m); C.ultimo = { path: m.path, caps: m.caps };
  C.sp = (m.caps.length || peon) ? 0 : C.sp + 1;
  C.turn = C.turn === 'w' ? 'b' : 'w';
  const k = clavePos(C.b, C.turn); C.reps[k] = (C.reps[k] || 0) + 1; C.ruta = null;
  anim = { de: m.path[0], a: m.path[m.path.length - 1] };
  comprobarFin();
  api.sonido(m.caps.length ? 'captura' : 'mover'); api.vibrar(m.caps.length ? 25 : 8);
  if (C.over && !C.reg) {
    C.reg = true;
    api.registrar({ res: C.res === 'w' ? 'victoria' : C.res === 'b' ? 'derrota' : 'tablas', variante: `${R().nombre} · ${NIVEL[C.nivel]}` });
    api.sonido(C.res === 'w' ? 'ganar' : C.res === 'b' ? 'perder' : 'ok');
  }
  pintar(); guardar();
  if (!C.over && C.turn === 'b') programarCPU();
}
function programarCPU() {
  pensando = true; pintarMsg();
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (!C || C.turn !== 'b' || C.over) { pensando = false; return; }
    const m = elegir(C.b, 'b', R(), C.nivel);
    pensando = false;
    if (C && m) jugar(m);
  }, 450);
}
function deshacer() {
  if (!C || pensando) return;
  const h = C.hist.pop(); if (!h) { api.aviso('Nada que deshacer'); return; }
  C.b = h.b; C.turn = h.turn; C.ultimo = h.ultimo; C.sp = h.sp; C.over = false; C.res = null; C.ruta = null; anim = null;
  C.reps = { [clavePos(C.b, C.turn)]: 1 }; C.jug = jugadas(C.b, C.turn, R());
  pintar(); guardar();
}

/* ---------- entrada: selección paso a paso (muestra el recorrido de las capturas) ---------- */
const candidatas = () => C.jug.filter(m => m.path.length >= C.ruta.length && C.ruta.every((p, k) => igual(p, m.path[k])));
function tocar(r, c) {
  if (!C || C.over || C.turn !== 'w' || pensando) return;
  const p = C.b[r][c];
  if (C.ruta) {
    const cands = candidatas(), n = C.ruta.length;
    if (n === 1 && igual(C.ruta[0], [r, c])) { C.ruta = null; return pintar(); }
    if (cands.some(m => m.path[n] && igual(m.path[n], [r, c]))) {      // siguiente casilla del recorrido
      C.ruta.push([r, c]);
      const fin = candidatas().find(m => m.path.length === C.ruta.length);
      if (fin) return jugar(fin);
      api.sonido('click'); return pintar();
    }
    const dest = cands.filter(m => igual(m.path[m.path.length - 1], [r, c]));    // atajo: casilla final inequívoca
    if (dest.length === 1) return jugar(dest[0]);
    if (n > 1) { api.sonido('error'); return; }                         // a mitad de una cadena no se cancela por error
  }
  if (p && dueno(p) === 'w' && C.jug.some(m => igual(m.path[0], [r, c]))) { C.ruta = [[r, c]]; api.sonido('click'); }
  else { C.ruta = null; if (p) api.sonido('error'); }
  pintar();
}
function clic(e) {
  const s = e.target.closest('.sq');
  if (s) return tocar(+s.dataset.r, +s.dataset.c);
  const b = e.target.closest('button'); if (!b || !C) return;
  if (b.dataset.reg) { if (b.dataset.reg !== C.regla) { if (!hayProgreso() || api.confirmar('Cambiar de reglas empieza una partida nueva. ¿Continuar?')) nueva(b.dataset.reg, C.nivel, true); } }
  else if (b.dataset.niv) { C.nivel = b.dataset.niv; api.setPref('nivel', C.nivel); pintar(); guardar(); }
  else if (b.dataset.ac === 'nueva') nueva(C.regla, C.nivel);
  else if (b.dataset.ac === 'undo') deshacer();
}
function tecla(e) { if (e.key !== 'Enter' && e.key !== ' ') return; const s = e.target.closest('.sq'); if (s) { e.preventDefault(); tocar(+s.dataset.r, +s.dataset.c); } }

/* ---------- pintado (las casillas se reutilizan; no se pierde el foco) ---------- */
function mensaje() {
  if (C.over) return C.res === 'w' ? '¡Has ganado!' : C.res === 'b' ? 'Has perdido. ¡Otra partida!' : `Tablas: ${C.sp >= 40 ? '20 jugadas por bando sin capturas ni peones' : 'posición repetida tres veces'}.`;
  if (C.turn === 'b' || pensando) return 'Piensa la máquina…';
  const cap = C.jug[0] && C.jug[0].caps.length;
  if (C.ruta && C.ruta.length > 1) return 'Sigue el recorrido: toca la siguiente casilla.';
  return cap ? `Tu turno: captura obligatoria${R().mayoria && cap > 1 ? ` (debes comer ${cap})` : ''}.` : 'Tu turno (blancas).';
}
function pintarMsg() { const m = $('#dmMsg'); if (m) { m.textContent = mensaje(); m.className = 'msg' + (C.over && C.res === 'w' ? ' win' : C.over && C.res === 'b' ? ' err' : ''); } }
function pintar() {
  if (!C) return;
  const ult = new Set(C.ultimo ? C.ultimo.path.map(pos) : []);
  const rutaS = new Set(C.ruta ? C.ruta.map(pos) : []), sig = new Set();
  if (C.ruta) candidatas().forEach(m => { const n = m.path[C.ruta.length]; if (n) sig.add(pos(n)); });
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = C.b[r][c], k = pos([r, c]), s = sq[r * 8 + c];
    const fl = (ult.has(k) ? 'l' : '') + (C.ruta && igual(C.ruta[0], [r, c]) ? 's' : rutaS.has(k) ? 'r' : '') + (sig.has(k) ? 't' : '');
    const key = (p || '') + '|' + fl;
    if (s.dataset.k === key) continue;
    s.dataset.k = key;
    s.className = 'sq' + ((r + c) % 2 ? ' d' : '') + [...fl].map(x => ' ' + x).join('');
    s.innerHTML = p ? `<div class="pc ${dueno(p)}">${esRey(p) ? '♛\uFE0E' : ''}</div>` : '';
    if ((r + c) % 2) s.setAttribute('aria-label', `Fila ${r + 1}, columna ${c + 1}, ${p ? (dueno(p) === 'w' ? 'ficha blanca' : 'ficha roja') + (esRey(p) ? ' dama' : '') : 'vacía'}`);
  }
  if (anim) {
    const d = sq[anim.de[0] * 8 + anim.de[1]].getBoundingClientRect(), a = sq[anim.a[0] * 8 + anim.a[1]], pc = a.firstElementChild;
    if (pc && pc.animate) { const ar = a.getBoundingClientRect(); pc.animate([{ transform: `translate(${d.left - ar.left}px,${d.top - ar.top}px)` }, { transform: 'none' }], { duration: 240, easing: 'ease-out' }); }
    anim = null;
  }
  const n = contar(C.b);
  $('#dmCnt').innerHTML = `<b>⚪ Blancas ${n.w}</b><span>comidas ${12 - n.w}</span><b>🔴 Rojas ${n.b}</b><span>comidas ${12 - n.b}</span>`;
  document.querySelectorAll('[data-reg]').forEach(b => b.classList.toggle('on', b.dataset.reg === C.regla));
  document.querySelectorAll('[data-niv]').forEach(b => b.classList.toggle('on', b.dataset.niv === C.nivel));
  $('#dmReg').innerHTML = `<b>${R().nombre}:</b> ${R().texto}`;
  pintarMsg();
}
function reglamento() {
  api.modal('Damas · ' + R().nombre, `<ul>
    <li>Juegas con las <b>blancas</b> (abajo). Las fichas se mueven en diagonal hacia delante y coronan al llegar a la última fila.</li>
    <li>${R().texto}</li>
    <li><b>Capturas múltiples</b>: toca tu ficha y luego cada casilla del recorrido; se marca el camino. También puedes tocar directamente la casilla final si solo hay un recorrido posible.</li>
    <li><b>Tablas</b>: 20 jugadas por bando solo con damas sin capturar, o la misma posición tres veces.</li>
    <li>La última jugada se resalta. «Deshacer» devuelve tu último movimiento y la respuesta de la CPU.</li></ul>`);
}
