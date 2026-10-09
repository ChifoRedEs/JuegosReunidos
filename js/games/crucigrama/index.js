import { $, esperar, fmtTiempo } from '../../core/dom.js';
import { Cronometro } from '../../core/cronometro.js';
import { grupoTablero } from '../../core/aspectos.js';
import { BANCOS } from './pistas.js';
import { NIVELES, generar, numerar, celdasDe } from './generador.js';

const LVL = { mini: 'Mini', facil: 'Fácil', medio: 'Medio', dificil: 'Difícil', experto: 'Experto' };
const FILAS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
let S = null, api = null, asp = null, root = null, crono = null, ocupado = false, cel = [], info = null, onKey = null, malas = new Set();
const temaNombre = t => t === 'mezcla' ? 'Mezcla' : BANCOS[t].nombre;

/* ---------- validación / resumen ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object') return null;
  const tema = d.tema === 'mezcla' || Object.hasOwn(BANCOS, d.tema) ? d.tema : null, nivel = Object.hasOwn(LVL, d.nivel) ? d.nivel : null;
  if (!tema || !nivel || !Number.isInteger(d.w) || !Number.isInteger(d.h) || d.w < 4 || d.h < 4 || d.w > 17 || d.h > 17) return null;
  const N = d.w * d.h;
  if (!Array.isArray(d.sol) || d.sol.length !== N || !d.sol.every(x => x === '' || /^[A-Z]$/.test(x))) return null;
  if (!Array.isArray(d.cur) || d.cur.length !== N || !d.cur.every((x, i) => x === '' || (d.sol[i] && /^[A-Z]$/.test(x)))) return null;
  if (!Array.isArray(d.palabras) || d.palabras.length < 2 || d.palabras.length > 40) return null;
  const palabras = [];
  for (const x of d.palabras) {
    if (!x || typeof x.p !== 'string' || !/^[A-Z]{3,12}$/.test(x.p) || (x.d !== 'H' && x.d !== 'V') || !Number.isInteger(x.f) || x.f < 0 || x.f >= N || typeof x.def !== 'string' || x.def.length > 160) return null;
    const cs = celdasDe(d.w, x);
    if (x.d === 'H' && (x.f % d.w) + x.p.length > d.w) return null;
    if (x.d === 'V' && Math.floor(x.f / d.w) + x.p.length > d.h) return null;
    if (cs.some((c, i) => d.sol[c] !== x.p[i])) return null;
    palabras.push({ p: x.p, f: x.f, d: x.d, def: x.def });
  }
  return { tema, nivel, w: d.w, h: d.h, sol: d.sol.slice(), cur: d.cur.slice(), palabras, t: Number.isInteger(d.t) && d.t >= 0 ? d.t : 0, pistas: Number.isInteger(d.pistas) && d.pistas >= 0 ? d.pistas : 0 };
}
export const migrarV1 = d => d;
const completo = d => d.sol.every((x, i) => !x || d.cur[i] === x);
export function resumen(d) {
  const ok = completo(d), tot = d.sol.filter(Boolean).length, lle = d.cur.filter(Boolean).length;
  return { texto: ok ? `${temaNombre(d.tema)} · ${LVL[d.nivel]} · resuelto` : `${temaNombre(d.tema)} · ${LVL[d.nivel]} · ${Math.round(lle / tot * 100)}%`, fin: ok };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; ocupado = false; malas = new Set();
  asp = api.aspecto([grupoTablero(), { clave: 'letras', titulo: 'Letras', def: 'redondo', opciones: [{ id: 'redondo', nombre: 'Redondas' }, { id: 'imprenta', nombre: 'Imprenta' }, { id: 'clasico', nombre: 'Clásicas' }] }]);
  await api.css(new URL('./crucigrama.css', import.meta.url));
  const g = api.cargar();
  S = g ? { ...g, sel: null, done: completo(g) } : null;
  root.innerHTML = `
    <details class="ops" id="cwOps"><summary id="cwSum"></summary>
      <div class="bar"><span class="lbl">Tema</span><div class="seg">${[...Object.entries(BANCOS), ['mezcla', { nombre: 'Mezcla', icono: '🎲' }]].map(([k, t]) => `<button class="btn" data-tema="${k}">${t.icono} ${t.nombre}</button>`).join('')}</div></div>
      <div class="bar"><span class="lbl">Nivel</span><div class="seg">${Object.entries(LVL).map(([k, l]) => `<button class="btn" data-niv="${k}">${l} ${NIVELES[k].n}×${NIVELES[k].n}</button>`).join('')}</div></div>
    </details>
    <div class="info"><span class="mut" id="cwInfo"></span><span id="cwCrono" aria-label="Tiempo">0:00</span></div>
    <div class="cwban"><button data-ac="prev" aria-label="Pista anterior">‹</button><div class="tx" id="cwPista" aria-live="polite"></div><button data-ac="next" aria-label="Pista siguiente">›</button></div>
    <div class="cwv"><div class="cwg" id="cwGrid" role="group" aria-label="Crucigrama"></div></div>
    <div class="msg" id="cwMsg" role="status" aria-live="polite"></div>
    <div class="cwk" id="cwKeys">${FILAS.map((f, i) => `<div class="fila">${[...f].map(l => `<button data-l="${l}">${l}</button>`).join('')}${i === 2 ? '<button class="del" data-l="⌫" aria-label="Borrar">⌫</button>' : ''}</div>`).join('')}</div>
    <div class="bar"><button class="btn on" data-ac="nueva">Nuevo</button><button class="btn" data-ac="comprobar">✔ Comprobar</button><button class="btn" data-ac="letra">💡 Letra</button><button class="btn" data-ac="palabra">💡 Palabra</button><button class="btn" data-ac="aspecto">🎨</button></div>
    <details><summary>Todas las pistas</summary><div class="cwl" id="cwLista"></div></details>`;
  root.addEventListener('click', clic);
  onKey = teclado; document.addEventListener('keydown', onKey);
  api.menu([
    { texto: 'Nuevo crucigrama', accion: () => nueva(S.tema, S.nivel) }, { texto: 'Comprobar', accion: comprobar },
    { texto: 'Revelar letra', accion: () => revelar('letra') }, { texto: 'Revelar palabra', accion: () => revelar('palabra') },
    { texto: 'Marcar errores al instante', accion: () => { api.setPref('errores', !api.pref('errores', false)); pintar(); menuErrores(); }, activo: api.pref('errores', false) },
    { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Cómo se juega', accion: reglas },
  ]);
  crono = new Cronometro(() => { if (S) { S.t = crono.s; $('#cwCrono').textContent = fmtTiempo(crono.s); if (crono.s % 15 === 0) guardar(); } });
  if (!S) { $('#cwOps').open = true; await nueva(api.pref('tema', 'animales'), api.pref('nivel', 'medio'), true); }
  else { prepararInfo(); construir(); seleccionInicial(); arrancar(); pintar(); }
}
function menuErrores() { api.menu([
  { texto: 'Nuevo crucigrama', accion: () => nueva(S.tema, S.nivel) }, { texto: 'Comprobar', accion: comprobar },
  { texto: 'Revelar letra', accion: () => revelar('letra') }, { texto: 'Revelar palabra', accion: () => revelar('palabra') },
  { texto: 'Marcar errores al instante', accion: () => { api.setPref('errores', !api.pref('errores', false)); pintar(); menuErrores(); }, activo: api.pref('errores', false) },
  { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Cómo se juega', accion: reglas }]); }
export function unmount() {
  if (S && crono) { S.t = crono.s; guardar(); }
  if (crono) crono.detener();
  document.removeEventListener('keydown', onKey);
  if (root) root.removeEventListener('click', clic);
  S = null; crono = null; cel = []; asp = null;
}
function arrancar() { crono.s = S.t; if (!S.done) crono.iniciar(); else crono.detener(); $('#cwCrono').textContent = fmtTiempo(S.t); }

/* ---------- partida ---------- */
const hayProgreso = () => S && !S.done && S.cur.some(Boolean);
async function nueva(tema, nivel, forzar = false) {
  if (ocupado) return;
  if (!forzar && hayProgreso() && !api.confirmar('¿Empezar un crucigrama nuevo? Perderás el actual.')) return;
  if (tema !== 'mezcla' && !Object.hasOwn(BANCOS, tema)) tema = 'animales';
  ocupado = true; if (crono) crono.detener();
  await esperar(20);
  const g = generar(tema, nivel);
  S = { tema, nivel, w: g.w, h: g.h, sol: g.sol, palabras: g.palabras, cur: new Array(g.w * g.h).fill(''), t: 0, pistas: 0, sel: null, done: false };
  api.setPref('tema', tema); api.setPref('nivel', nivel); malas = new Set(); ocupado = false;
  crono = new Cronometro(crono.alTick, 0);
  prepararInfo(); construir(); seleccionInicial(); arrancar(); pintar(); guardar();
  $('#cwOps').open = false;
}
function guardar() { if (!S) return; const d = { tema: S.tema, nivel: S.nivel, w: S.w, h: S.h, sol: S.sol, cur: S.cur, palabras: S.palabras, t: S.t, pistas: S.pistas }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }
function prepararInfo() {
  const { num, orden } = numerar(S.w, S.palabras);
  const porCelda = Array.from({ length: S.w * S.h }, () => ({ H: -1, V: -1 }));
  S.palabras.forEach((x, wi) => celdasDe(S.w, x).forEach(c => { porCelda[c][x.d] = wi; }));
  info = { num, orden, porCelda };
}
function seleccionInicial() { const wi = info.orden[0], x = S.palabras[wi]; S.sel = { i: x.f, dir: x.d }; }
const palActiva = () => { const p = info.porCelda[S.sel.i]; const wi = p[S.sel.dir] >= 0 ? p[S.sel.dir] : p[S.sel.dir === 'H' ? 'V' : 'H']; return wi; };
function palCompleta(wi) { const x = S.palabras[wi]; return celdasDe(S.w, x).every((c, i) => S.cur[c] === x.p[i]); }

/* ---------- pintado ---------- */
function construir() {
  const g = $('#cwGrid'); const cs = Math.max(22, Math.min(44, Math.floor((Math.min(window.innerWidth, 520) - 40) / S.w)));
  g.style.setProperty('--w', S.w); g.style.setProperty('--cs', cs + 'px');
  g.innerHTML = S.sol.map((l, i) => l ? `<button type="button" class="c" data-i="${i}">${info.num.has(i) ? `<span class="n">${info.num.get(i)}</span>` : ''}<span class="l"></span></button>` : '<div class="b"></div>').join('');
  cel = [...g.children];
  $('#cwLista').innerHTML = ['H', 'V'].map(d => `<div><h3>${d === 'H' ? 'Horizontales' : 'Verticales'}</h3>${info.orden.filter(wi => S.palabras[wi].d === d).map(wi => `<button data-w="${wi}"><b>${info.num.get(S.palabras[wi].f)}</b>${S.palabras[wi].def}</button>`).join('')}</div>`).join('');
  root.querySelectorAll('[data-tema]').forEach(b => b.classList.toggle('on', b.dataset.tema === S.tema));
  root.querySelectorAll('[data-niv]').forEach(b => b.classList.toggle('on', b.dataset.niv === S.nivel));
}
function pintar() {
  if (!S) return;
  const wi = palActiva(), act = new Set(celdasDe(S.w, S.palabras[wi])), auto = api.pref('errores', false);
  if (!S.done && completo(S)) {
    S.done = true; crono.detener(); S.t = crono.s;
    api.registrar({ res: 'victoria', tiempo: S.t, variante: LVL[S.nivel], limpio: S.pistas === 0 });
    api.sonido('ganar'); api.vibrar([60, 40, 60]); guardar();
  }
  cel.forEach((b, i) => {
    if (!b.dataset.i) return;
    const ii = +b.dataset.i, v = S.cur[ii];
    const mal = v && (malas.has(ii) || (auto && v !== S.sol[ii]));
    b.className = 'c' + (act.has(ii) ? ' w' : '') + (S.sel.i === ii ? ' s' : '') + (mal ? ' x' : '') + (S.done ? ' ok' : '');
    const l = b.querySelector('.l'); if (l.textContent !== v) l.textContent = v;
  });
  const x = S.palabras[wi];
  $('#cwPista').innerHTML = `<small>${info.num.get(x.f)} · ${x.d === 'H' ? 'Horizontal' : 'Vertical'} · ${x.p.length} letras</small>${x.def}`;
  root.querySelectorAll('#cwLista button').forEach(b => { const k = +b.dataset.w; b.classList.toggle('on', k === wi); b.classList.toggle('ok', palCompleta(k)); });
  const tot = S.sol.filter(Boolean).length, lle = S.cur.filter(Boolean).length;
  $('#cwSum').textContent = `⚙️ ${temaNombre(S.tema)} · ${LVL[S.nivel]}`;
  $('#cwInfo').textContent = `${lle}/${tot} letras${S.pistas ? ` · ${S.pistas} ayuda${S.pistas > 1 ? 's' : ''}` : ''}`;
  $('#cwCrono').textContent = fmtTiempo(S.t);
  const m = $('#cwMsg'); m.className = 'msg' + (S.done ? ' win' : ''); m.textContent = S.done ? `¡Crucigrama resuelto en ${fmtTiempo(S.t)}!` : '';
  const ac = cel[S.sel.i]; if (ac && ac.scrollIntoView && !S.done) ac.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/* ---------- entrada ---------- */
function escribir(l) {
  if (!S || S.done) return;
  const wi = palActiva(), cs = celdasDe(S.w, S.palabras[wi]), k = cs.indexOf(S.sel.i);
  if (l === '⌫') {
    if (S.cur[S.sel.i]) S.cur[S.sel.i] = ''; else if (k > 0) { S.sel.i = cs[k - 1]; S.cur[S.sel.i] = ''; }
    malas.delete(S.sel.i);
  } else {
    S.cur[S.sel.i] = l; malas.delete(S.sel.i); api.sonido('click');
    if (k < cs.length - 1) S.sel.i = cs[k + 1];
  }
  pintar(); guardar();
}
function tocarCelda(i) {
  if (!S || S.done) return;
  const p = info.porCelda[i];
  if (S.sel.i === i && p.H >= 0 && p.V >= 0) S.sel.dir = S.sel.dir === 'H' ? 'V' : 'H';
  else { S.sel.i = i; if (p[S.sel.dir] < 0) S.sel.dir = S.sel.dir === 'H' ? 'V' : 'H'; }
  pintar();
}
function irPista(delta) { const pos = info.orden.indexOf(palActiva()), wi = info.orden[(pos + delta + info.orden.length) % info.orden.length], x = S.palabras[wi]; const vacia = celdasDe(S.w, x).find(c => !S.cur[c]); S.sel = { i: vacia ?? x.f, dir: x.d }; pintar(); }
function comprobar() {
  if (!S || S.done) return;
  malas = new Set(S.cur.map((v, i) => (v && v !== S.sol[i] ? i : -1)).filter(i => i >= 0));
  api.aviso(malas.size ? `${malas.size} letra${malas.size > 1 ? 's' : ''} incorrecta${malas.size > 1 ? 's' : ''}` : '¡Todo lo escrito es correcto!'); api.sonido(malas.size ? 'error' : 'ok'); pintar();
}
function revelar(que) {
  if (!S || S.done) return;
  const cs = que === 'letra' ? [S.sel.i] : celdasDe(S.w, S.palabras[palActiva()]);
  cs.forEach(c => { S.cur[c] = S.sol[c]; malas.delete(c); }); S.pistas++; api.sonido('ok'); pintar(); guardar();
}
function teclado(e) {
  if (!S || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('.modal') || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (/^[a-zA-Z]$/.test(e.key)) escribir(e.key.toUpperCase());
  else if (e.key === 'Backspace') { e.preventDefault(); escribir('⌫'); }
  else if (e.key.startsWith('Arrow')) {
    e.preventDefault(); const d = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
    let r = S.sel.i / S.w | 0, c = S.sel.i % S.w;
    for (let k = 0; k < 15; k++) { r += d[0]; c += d[1]; if (r < 0 || c < 0 || r >= S.h || c >= S.w) break; if (S.sol[r * S.w + c]) { S.sel.dir = d[0] ? 'V' : 'H'; if (info.porCelda[r * S.w + c][S.sel.dir] < 0) S.sel.dir = S.sel.dir === 'H' ? 'V' : 'H'; S.sel.i = r * S.w + c; break; } }
    pintar();
  } else if (e.key === 'Tab') { e.preventDefault(); irPista(e.shiftKey ? -1 : 1); }
}
function clic(e) {
  const b = e.target.closest('button'); if (!b || !S) return;
  const d = b.dataset;
  if (d.i != null && b.classList.contains('c')) return tocarCelda(+d.i);
  if (d.l) return escribir(d.l);
  if (d.w != null) { const x = S.palabras[+d.w]; S.sel = { i: x.f, dir: x.d }; return pintar(); }
  if (d.tema) return nueva(d.tema, S.nivel);
  if (d.niv) return nueva(S.tema, d.niv);
  const ac = d.ac;
  if (ac === 'nueva') nueva(S.tema, S.nivel); else if (ac === 'prev') irPista(-1); else if (ac === 'next') irPista(1);
  else if (ac === 'comprobar') comprobar(); else if (ac === 'letra') revelar('letra'); else if (ac === 'palabra') revelar('palabra'); else if (ac === 'aspecto') asp.abrir();
}
function reglas() {
  api.modal('Crucigrama', `<ul><li>Rellena las palabras que se cruzan usando las pistas. El número de cada casilla indica a qué pista corresponde.</li>
    <li>Toca una casilla para elegirla; <b>tócala otra vez</b> para cambiar entre horizontal y vertical. Con ‹ › saltas de pista en pista.</li>
    <li><b>✔ Comprobar</b> marca en rojo lo que está mal. <b>💡 Letra / Palabra</b> revelan ayuda (con ayudas no cuenta el récord de tiempo).</li>
    <li>En el menú ⋯ puedes activar «Marcar errores al instante». Con el teclado: letras, Borrar, flechas y Tab.</li>
    <li>Los temas tienen definiciones propias; en 🎨 Apariencia cambias colores y letras.</li></ul>`);
}
