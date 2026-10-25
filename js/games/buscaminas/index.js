import { crearFlotante } from '../../core/flotante.js';
import { $, fmtTiempo } from '../../core/dom.js';
import { Cronometro } from '../../core/cronometro.js';
import { grupoTablero, grupoFondo } from '../../core/aspectos.js';
import { NIVELES, LIMITES, maxMinas, medidas, nuevo, abrir, acorde, bandera, pista as pistaMotor, banderas, crearCache, crearMinasLogicas } from './motor.js';

const LVL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil', personal: 'Personalizado' };
const RETO = 'medio';
const MINAS = { bomba: '💣', calavera: '☠️', pez: '🐡', volcan: '🌋' }, BANDERAS = { bandera: '🚩', estrella: '⭐', corazon: '❤️', pirata: '🏴‍☠️' };
let flot = null, S = null, nivel = 'medio', api = null, asp = null, root = null, crono = null, cel = [], cache = crearCache(), modo = 'abrir', pst = null, pstT = null, press = null, onKey = null, pulsando = false;

/* ---------- validación / resumen ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || !Object.hasOwn(LVL, d.nivel)) return null;
  const c = medidas(d.nivel, d), N = c.w * c.h;
  if (d.nivel === 'personal' && (c.w !== d.w || c.h !== d.h || c.m !== d.m)) return null;
  if (!Array.isArray(d.rev) || d.rev.length !== N || !d.rev.every(v => v === 0 || v === 1 || v === 2)) return null;
  let minas = null;
  if (d.minas != null) {
    if (!Array.isArray(d.minas) || d.minas.length !== c.m || !d.minas.every(i => Number.isInteger(i) && i >= 0 && i < N) || new Set(d.minas).size !== c.m) return null;
    minas = d.minas.slice().sort((a, b) => a - b);
  } else if (d.rev.some(v => v !== 0)) return null;
  const fin = d.fin === 'gana' || d.fin === 'pierde' ? d.fin : null;
  if (minas && !fin && minas.some(i => d.rev[i] === 1)) return null;
  if (fin && !minas) return null;
  return { nivel: d.nivel, w: c.w, h: c.h, m: c.m, minas, rev: d.rev.slice(), fin, boom: Number.isInteger(d.boom) && d.boom >= -1 && d.boom < N ? d.boom : -1,
    t: Number.isInteger(d.t) && d.t >= 0 ? d.t : 0, pistas: Number.isInteger(d.pistas) && d.pistas >= 0 ? d.pistas : 0, reg: !!d.reg,
    sa: !!d.sa, reto: typeof d.reto === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.reto) ? d.reto : null };
}
export const migrarV1 = d => d;
export function resumen(d) {
  const nom = (d.reto ? '📅 Reto · ' : '') + (d.nivel === 'personal' ? `${d.w}×${d.h} · ${d.m} minas` : LVL[d.nivel]);
  if (d.fin) return { texto: `${nom} · ${d.fin === 'gana' ? '¡Ganaste!' : 'Boom'}`, fin: true };
  const a = d.rev.filter(v => v === 1).length, total = d.w * d.h - d.m;
  return { texto: `${nom} · ${Math.round(a / total * 100)}% despejado`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; modo = 'abrir'; pst = null; press = null; pulsando = false;
  asp = api.aspecto([grupoFondo('#bmTab'), grupoTablero(),
    { clave: 'minas', titulo: 'Minas', def: 'bomba', opciones: Object.entries(MINAS).map(([id, e]) => ({ id, nombre: e })) },
    { clave: 'banderas', titulo: 'Banderas', def: 'bandera', opciones: Object.entries(BANDERAS).map(([id, e]) => ({ id, nombre: e })) },
    { clave: 'estilo', titulo: 'Estilo de las casillas', def: 'relieve', opciones: [{ id: 'relieve', nombre: 'Relieve' }, { id: 'plano', nombre: 'Planas' }] }],
    () => { cel.forEach(b => { b.dataset.k = ''; }); pintar(); });
  await api.css(new URL('./buscaminas.css', import.meta.url));
  const g = api.cargar();
  nivel = g ? g.nivel : (Object.hasOwn(LVL, api.pref('nivel', 'medio')) ? api.pref('nivel', 'medio') : 'medio');
  S = g ? { ...g } : { ...nuevo(nivel, dims()), nivel, t: 0, pistas: 0, reg: false, sa: api.pref('sa', true) };
  cache = crearCache();
  root.innerHTML = `<div id="bmReto"></div>
    <div class="bmtop"><div class="bmc" id="bmMinas" aria-label="Minas restantes">000</div><button class="bmf" id="bmCara" data-ac="nueva" aria-label="Nueva partida">😀</button><div class="bmc t" id="bmT" aria-label="Tiempo">000</div></div>
    <div class="bm" id="bmTab" role="group" aria-label="Campo de minas"></div>
    <div class="msg" id="bmMsg" role="status" aria-live="polite"></div>
${api.barraHtml()}`;
  flot = crearFlotante(api, { ancla: $('#bmTab'), raiz: root, botones: [{ id: 'abrir', texto: '👆 Abrir' }, { id: 'bandera', texto: '🚩 Bandera' }, { id: 'pista', texto: '💡 Pista' }],
    alClic: id => { if (id === 'pista') pista(); else { modo = id; pintar(); } } });
  root.addEventListener('click', clic);
  const tab = $('#bmTab');
  tab.addEventListener('pointerdown', pDown); tab.addEventListener('pointerup', pUp); tab.addEventListener('pointercancel', pCancel); tab.addEventListener('pointerleave', pCancel);
  tab.addEventListener('contextmenu', e => { e.preventDefault(); const b = e.target.closest('.bc'); if (b) accion(+b.dataset.i, 'bandera'); });
  onKey = teclado; tab.addEventListener('keydown', onKey);
  api.barra({ nueva: () => nueva(S.nivel),
    salir: () => { location.hash = '#/cat/logica'; },
    crono: () => crono,
    config: { valores: () => { const dd = S.nivel === 'personal' ? { w: S.w, h: S.h, m: S.m } : dims(); const m = medidas('personal', dd); return { nivel: S.nivel, sa: !!api.pref('sa', true), w: m.w, h: m.h, dens: [10, 15, 20, 25, 30].reduce((a, p) => Math.abs(p - 100 * m.m / (m.w * m.h)) < Math.abs(a - 100 * m.m / (m.w * m.h)) ? p : a, 15) }; }, grupos: v => [{ clave: 'nivel', titulo: 'Nivel', opciones: Object.entries(LVL).map(([k, l]) => [k, `${l}${NIVELES[k] ? ` ${NIVELES[k].w}×${NIVELES[k].h}` : ''}`]) }, { clave: 'w', titulo: 'Ancho', visible: v.nivel === 'personal', opciones: [5, 8, 10, 12, 14, 16, 18, 20].map(x => [x, String(x)]) }, { clave: 'h', titulo: 'Alto', visible: v.nivel === 'personal', opciones: [5, 8, 10, 12, 16, 20, 24].map(x => [x, String(x)]) }, { clave: 'dens', titulo: 'Minas', visible: v.nivel === 'personal', opciones: [[10, 'Pocas'], [15, 'Normal'], [20, 'Muchas'], [25, 'Muchísimas'], [30, 'Máximo']] }, { clave: 'sa', titulo: 'Tableros', opciones: [[true, '🧠 Sin adivinar'], [false, '🎲 Clásicos']] }], aplicar: v => { api.setPref('sa', v.sa); if (v.nivel === 'personal') api.setPref('dims', medidas('personal', { w: v.w, h: v.h, m: Math.max(1, Math.min(maxMinas(v.w, v.h), Math.round(v.w * v.h * v.dens / 100))) })); nueva(v.nivel, true); } } });
  api.menu([{ texto: 'Nueva partida', accion: () => nueva(S.nivel) }, { texto: '📅 Reto del día', accion: () => nueva(RETO, false, true) }, { texto: '💡 Pista', accion: pista }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Cómo se juega', accion: reglas }]);
  crono = new Cronometro(() => { if (S) { S.t = crono.s; pintarTiempo(); if (crono.s % 15 === 0) guardar(); } });
  construir(); arrancar(); pintar();
}
export function unmount() {
  if (S && crono) { S.t = crono.s; guardar(); }
  if (crono) crono.detener();
  clearTimeout(pstT); clearTimeout(press && press.lp); if (flot) { flot.destruir(); flot = null; }
  if (root) root.removeEventListener('click', clic);
  S = null; crono = null; cel = []; asp = null; press = null;
}
function arrancar() { crono.s = S.t; if (S.minas && !S.fin) crono.iniciar(); else crono.detener(); }

/* ---------- partida ---------- */
const hayProgreso = () => S && S.minas && !S.fin;
// Medidas del tablero personalizado (preferencia)
function dims() { const p = api.pref('dims', null); return p && typeof p === 'object' ? p : { w: 10, h: 12, m: 18 }; }
function nueva(niv, forzar = false, reto = false) {
  if (reto && S && S.reto === api.reto.fecha()) { api.aviso(S.fin ? 'Ya has jugado el reto de hoy' : 'Ya estás jugando el reto de hoy'); return; }
  if (reto && api.reto.hecho()) { api.aviso('Ya has completado el reto de hoy'); return; }
  if (!forzar && hayProgreso() && !api.confirmar('¿Empezar una partida nueva? Perderás la actual.')) return;
  nivel = niv; if (!reto) api.setPref('nivel', niv);
  if (crono) crono.detener();
  S = { ...nuevo(niv, dims()), nivel: niv, t: 0, pistas: 0, reg: false, sa: reto ? true : api.pref('sa', true), reto: reto ? api.reto.fecha() : null }; cache = crearCache(); pst = null;
  if (reto) {                                       // el reto: minas fijas para todos y se empieza abriendo el centro
    const centro = (S.h >> 1) * S.w + (S.w >> 1);
    S.minas = api.reto.generar(() => crearMinasLogicas(S.w, S.h, S.m, centro, 60000).minas);
    abrir(S, centro, cache);
  }
  crono = new Cronometro(crono.alTick, 0); construir(); arrancar(); pintar(); guardar();
}
function guardar() { if (!S) return; const d = { nivel: S.nivel, minas: S.minas, rev: S.rev, fin: S.fin, boom: S.boom, t: S.t, pistas: S.pistas, reg: S.reg, sa: !!S.sa, reto: S.reto || null, ...(S.nivel === 'personal' ? { w: S.w, h: S.h, m: S.m } : {}) }; const r = resumen({ ...d, w: S.w, h: S.h, m: S.m }); api.guardar(d, r.texto, r.fin); }
function accion(i, tipo) {
  if (!S || S.fin) return;
  const sinMinas = !S.minas;
  let hizo = false;
  if (tipo === 'bandera') hizo = bandera(S, i);
  else if (S.rev[i] === 1) hizo = acorde(S, i, cache);
  else if (S.rev[i] === 0) hizo = abrir(S, i, cache);
  if (!hizo) { if (tipo !== 'bandera') api.sonido('error'); return; }
  if (sinMinas && S.minas) { crono.iniciar(); }
  pst = null;
  api.sonido(tipo === 'bandera' ? 'click' : 'mover'); api.vibrar(tipo === 'bandera' ? 15 : 6);
  if (S.fin && !S.reg) {
    S.reg = true; crono.detener(); S.t = crono.s;
    api.registrar({ res: S.fin === 'gana' ? 'victoria' : 'derrota', tiempo: S.t, variante: S.reto ? 'Reto del día' : S.nivel === 'personal' ? `${S.w}×${S.h} · ${S.m} minas` : LVL[S.nivel], limpio: S.pistas === 0 });
    if (S.reto && S.fin === 'gana' && api.reto.completar(S.reto)) setTimeout(() => api.aviso('📅 ¡Reto del día completado!'), 300);
    api.sonido(S.fin === 'gana' ? 'ganar' : 'perder'); api.vibrar(S.fin === 'gana' ? [60, 40, 60] : [120]);
  }
  pintar(); guardar();
}
function pista() {
  if (!S || S.fin) return;
  const p = pistaMotor(S, cache); if (!p) { api.aviso('No hay nada que sugerir'); return; }
  S.pistas++; pst = p; clearTimeout(pstT); pstT = setTimeout(() => { pst = null; if (S) pintar(); }, 4500);
  api.sonido('ok'); pintar(); guardar();
}

/* ---------- pintado ---------- */
function construir() {
  const tab = $('#bmTab'); tab.style.setProperty('--w', S.w);
  tab.innerHTML = Array.from({ length: S.w * S.h }, (_, i) => `<button type="button" class="bc h" data-i="${i}" aria-label="Fila ${(i / S.w | 0) + 1}, columna ${i % S.w + 1}, oculta"></button>`).join('');
  cel = [...tab.children];
}
const pad3 = n => String(Math.max(-99, Math.min(999, n))).padStart(3, '0');
function pintarTiempo() { const t = $('#bmT'); if (t) t.textContent = pad3(Math.min(999, S.t)); }
function pintar() {
  if (!S) return;
  const N = S.minas ? cache.get(S) : null, em = MINAS[asp.valores.minas], bd = BANDERAS[asp.valores.banderas], fin = S.fin;
  for (let i = 0; i < cel.length; i++) {
    const v = S.rev[i], esM = N && N.esM[i], num = N ? N.num[i] : 0;
    let cls = 'bc', html = '', lab = 'oculta';
    if (v === 1) {
      cls += ' r'; if (esM) { cls += i === S.boom ? ' boom' : ''; html = `<i class="em">${em}</i>`; lab = 'mina'; }
      else if (num) { cls += ' n' + num; html = num; lab = String(num); } else lab = 'vacía';
    } else if (v === 2) {
      if (fin === 'pierde' && !esM) { cls += ' h mal'; html = `<i class="em">${bd}</i>`; lab = 'bandera errónea'; }
      else { cls += ' h'; html = `<i class="em">${bd}</i>`; lab = 'bandera'; }
    } else if (fin === 'pierde' && esM) { cls += ' r'; html = `<i class="em">${em}</i>`; lab = 'mina'; }
    else cls += ' h';
    if (pst && pst.i === i) cls += ' pst' + (pst.tipo === 'mina' ? ' mina' : '');
    const key = cls + '|' + html; const b = cel[i];
    if (b.dataset.k !== key) { b.dataset.k = key; b.className = cls; b.innerHTML = html; b.setAttribute('aria-label', `Fila ${(i / S.w | 0) + 1}, columna ${i % S.w + 1}, ${lab}`); }
  }
  $('#bmTab').classList.toggle('fin', !!fin);
  pintarReto();
  $('#bmMinas').textContent = pad3(S.m - banderas(S));
  pintarTiempo();
  $('#bmCara').textContent = fin === 'gana' ? '😎' : fin === 'pierde' ? '😵' : pulsando ? '😮' : '😀';
  if (flot) { flot.marcar('abrir', modo === 'abrir'); flot.marcar('bandera', modo === 'bandera'); flot.activar('pista', !fin); }
  const m = $('#bmMsg'); m.className = 'msg' + (fin === 'gana' ? ' win' : fin === 'pierde' ? ' err' : '');
  m.textContent = fin === 'gana' ? `¡Despejado en ${fmtTiempo(S.t)}!` : fin === 'pierde' ? '¡Boom! Toca la carita para jugar otra vez.' : pst ? (pst.tipo === 'mina' ? 'Pista: aquí hay una mina.' : 'Pista: esta casilla es segura.') : modo === 'abrir' ? 'Toca para abrir · mantén pulsado para poner bandera.' : 'Toca para poner bandera · mantén pulsado para abrir.';
}

function pintarReto() {
  const r = $('#bmReto'); if (!r || !S) return;
  const hoy = api.reto.fecha(), hecho = api.reto.hecho(), jugando = S.reto === hoy && !S.fin, k = `${hoy}|${hecho}|${jugando}`;
  if (r.dataset.k === k) return; r.dataset.k = k;
  r.innerHTML = `<div class="reto ${hecho ? 'hecho' : ''}"><span>${hecho ? '✅' : '📅'}</span><div><b>Reto del día · ${api.reto.texto(hoy)}</b>${hecho ? 'Completado. Vuelve mañana para otro.' : jugando ? 'Estás jugando el reto: el mismo campo para todo el mundo, sin adivinar.' : 'Un campo medio sin adivinar, el mismo para todos hoy. Solo tienes un intento.'}</div>${hecho || jugando || (S.reto === hoy) ? '' : '<button class="btn on" data-ac="reto">Jugar</button>'}</div>`;
}
/* ---------- entrada: toque, pulsación larga y acorde ---------- */
function pDown(e) {
  const b = e.target.closest('.bc'); if (!b || !S || S.fin || e.button > 0) return;
  const i = +b.dataset.i; pulsando = true; $('#bmCara').textContent = '😮';
  const lp = setTimeout(() => { if (press) { press.largo = true; api.vibrar(25); accion(i, modo === 'abrir' ? 'bandera' : 'abrir'); } }, 380);
  press = { i, lp, largo: false };
}
function pUp(e) {
  pulsando = false; if (!press) return;
  const p = press; press = null; clearTimeout(p.lp);
  if (S) $('#bmCara').textContent = S.fin === 'gana' ? '😎' : S.fin === 'pierde' ? '😵' : '😀';
  if (p.largo) return;
  const b = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.bc'); if (!b || +b.dataset.i !== p.i) return;
  accion(p.i, modo === 'abrir' ? 'abrir' : 'bandera');
}
function pCancel() { pulsando = false; if (press) { clearTimeout(press.lp); press = null; } if (S) $('#bmCara').textContent = S.fin === 'gana' ? '😎' : S.fin === 'pierde' ? '😵' : '😀'; }
function teclado(e) {
  const b = e.target.closest('.bc'); if (!b || !S) return;
  const i = +b.dataset.i, w = S.w;
  const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -w, ArrowDown: w }[e.key];
  if (d) { e.preventDefault(); const c = i % w + (e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0), j = i + d; if (c >= 0 && c < w && j >= 0 && j < cel.length) cel[j].focus(); return; }
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); accion(i, modo === 'abrir' ? 'abrir' : 'bandera'); }
  else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); accion(i, 'bandera'); }
}
function clic(e) {
  const b = e.target.closest('button'); if (!b || !S) return;
  const d = b.dataset;
  if (d.niv) { if (d.niv !== S.nivel) nueva(d.niv); }
  else if (d.sa) { api.setPref('sa', d.sa === '1'); if (!S.minas) S.sa = d.sa === '1'; pintar(); api.aviso(d.sa === '1' ? 'Los próximos tableros se podrán resolver sin adivinar' : 'Tableros clásicos: a veces toca arriesgar'); }
  else if (d.ac === 'pers') {
    const v = {}; root.querySelectorAll('[data-dim]').forEach(i => { v[i.dataset.dim] = parseInt(i.value, 10); });
    const c = medidas('personal', v);
    if (c.w !== v.w || c.h !== v.h || c.m !== v.m) api.aviso(`Ancho ${LIMITES.w.join('–')}, alto ${LIMITES.h.join('–')} y como mucho ${maxMinas(c.w, c.h)} minas`);
    api.setPref('dims', c); nueva('personal');
  }
  else if (d.ac === 'reto') nueva(RETO, false, true);
  else if (d.modo) { modo = d.modo; pintar(); }
  else if (d.ac === 'nueva') nueva(S.nivel);
  else if (d.ac === 'pista') pista();
  else if (d.ac === 'aspecto') asp.abrir();
}
function reglas() {
  api.modal('Bombardeo', `<ul><li>Abre todas las casillas que no tienen mina. Cada número indica cuántas minas hay en las 8 casillas de alrededor.</li>
    <li>Tu <b>primer toque nunca es una mina</b>.</li>
    <li>Con <b>🧠 Sin adivinar</b> (por defecto) cada tablero se puede despejar entero por lógica desde tu primer toque; con <b>🎲 Clásicos</b> a veces toca arriesgar.</li>
    <li><b>Personalizado</b>: elige ancho, alto y número de minas. <b>Reto del día</b>: el mismo campo para todo el mundo, con un solo intento.</li>
    <li><b>Toca</b> para abrir y <b>mantén pulsado</b> para poner o quitar una bandera (o cambia el modo «Al tocar»).</li>
    <li>Toca un número que ya tiene sus banderas puestas para abrir de golpe el resto de casillas de su alrededor.</li>
    <li>💡 <b>Pista</b>: deduce una casilla segura o una mina con lo que ya ves (con pistas no cuenta el récord de tiempo).</li>
    <li>En 🎨 Apariencia cambias colores, minas, banderas y estilo de las casillas.</li></ul>`);
}
