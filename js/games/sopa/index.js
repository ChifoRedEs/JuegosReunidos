import { $, esc, esperar, fmtTiempo } from '../../core/dom.js';
import { Cronometro } from '../../core/cronometro.js';
import { grupoTablero } from '../../core/aspectos.js';
import { TEMAS } from './palabras.js';
import { NIVELES, DIRS8, generar, linea, ajustar } from './generador.js';

const LVL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
const MARCAS = {
  arcoiris: ['#FF4757', '#FF9F1C', '#E6B800', '#2ED573', '#12CBC4', '#2F6BFF', '#8B5CF6', '#FF4FA3', '#7CB518', '#EE5A24'],
  pastel: ['#FF8FA3', '#FFB86B', '#F2D14B', '#6FD99B', '#6FCFE8', '#8FA8FF', '#C79BFF', '#FF9AD1', '#A8D86B', '#FFA17A'],
  mono: ['var(--tb-acc)'],
};
let S = null, api = null, asp = null, root = null, crono = null, cel = [], ancla = null, sel = null, arrastre = false, pistaCel = -1, pistaT = null, ocupado = false;
const temaNombre = t => t === 'mezcla' ? 'Mezcla' : TEMAS[t].nombre;

/* ---------- validación / resumen ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object') return null;
  const tema = d.tema === 'mezcla' || Object.hasOwn(TEMAS, d.tema) ? d.tema : null, nivel = Object.hasOwn(LVL, d.nivel) ? d.nivel : null;
  if (!tema || !nivel) return null;
  const n = NIVELES[nivel].n, N = n * n;
  if (d.n !== n || !Array.isArray(d.grid) || d.grid.length !== N || !d.grid.every(c => typeof c === 'string' && /^[A-Z]$/.test(c))) return null;
  if (!Array.isArray(d.palabras) || d.palabras.length !== NIVELES[nivel].palabras) return null;
  const palabras = [];
  for (const w of d.palabras) {
    if (!w || typeof w.p !== 'string' || !/^[A-Z]{3,12}$/.test(w.p) || !Number.isInteger(w.f) || w.f < 0 || w.f >= N || !Array.isArray(w.d) || w.d.length !== 2 || !DIRS8.some(x => x[0] === w.d[0] && x[1] === w.d[1])) return null;
    const r0 = w.f / n | 0, c0 = w.f % n;
    for (let t = 0; t < w.p.length; t++) { const r = r0 + w.d[0] * t, c = c0 + w.d[1] * t; if (r < 0 || r >= n || c < 0 || c >= n || d.grid[r * n + c] !== w.p[t]) return null; }
    palabras.push({ p: w.p, f: w.f, d: w.d.slice() });
  }
  const hall = [], vistos = new Set();
  if (Array.isArray(d.halladas)) for (const h of d.halladas) {
    if (!h || !Number.isInteger(h.i) || h.i < 0 || h.i >= palabras.length || vistos.has(h.i) || !Number.isInteger(h.a) || !Number.isInteger(h.b) || h.a < 0 || h.b < 0 || h.a >= N || h.b >= N || !linea(n, h.a, h.b)) continue;
    vistos.add(h.i); hall.push({ i: h.i, a: h.a, b: h.b, r: h.r ? 1 : 0 });
  }
  return { tema, nivel, n, grid: d.grid.slice(), palabras, halladas: hall, t: Number.isInteger(d.t) && d.t >= 0 ? d.t : 0, pistas: Number.isInteger(d.pistas) && d.pistas >= 0 ? d.pistas : 0, rendido: !!d.rendido };
}
export const migrarV1 = d => d;
const nHalladas = d => d.halladas.filter(h => !h.r).length;
const completa = d => nHalladas(d) === d.palabras.length;
export function resumen(d) {
  const fin = completa(d) || d.rendido;
  return { texto: `${temaNombre(d.tema)} · ${LVL[d.nivel]} · ${d.rendido ? 'reveladas' : nHalladas(d) + '/' + d.palabras.length}`, fin };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; ocupado = false; ancla = null; sel = null; arrastre = false; pistaCel = -1;
  asp = api.aspecto([grupoTablero(),
    { clave: 'marca', titulo: 'Subrayado de palabras', def: 'arcoiris', opciones: [{ id: 'arcoiris', nombre: 'Arcoíris', sw: ['#FF4757', '#E6B800', '#2ED573', '#2F6BFF'] }, { id: 'pastel', nombre: 'Pastel', sw: ['#FF8FA3', '#F2D14B', '#6FD99B', '#8FA8FF'] }, { id: 'mono', nombre: 'Un color', sw: ['#2F6BFF'] }] },
    { clave: 'letras', titulo: 'Letras', def: 'redondo', opciones: [{ id: 'redondo', nombre: 'Redondas' }, { id: 'imprenta', nombre: 'Imprenta' }, { id: 'clasico', nombre: 'Clásicas' }] }],
    () => { if (S) pintar(); });
  await api.css(new URL('./sopa.css', import.meta.url));
  const g = api.cargar();
  S = g ? { ...g } : null;
  root.innerHTML = `
    <details class="ops" id="spOps"><summary id="spSum"></summary>
      <div class="bar"><span class="lbl">Tema</span><div class="seg">${[...Object.entries(TEMAS), ['mezcla', { nombre: 'Mezcla', icono: '🎲' }]].map(([k, t]) => `<button class="btn" data-tema="${k}">${t.icono} ${t.nombre}</button>`).join('')}</div></div>
      <div class="bar"><span class="lbl">Nivel</span><div class="seg">${Object.entries(LVL).map(([k, l]) => `<button class="btn" data-niv="${k}">${l}</button>`).join('')}</div></div>
    </details>
    <div class="info"><span class="mut" id="spInfo"></span><span id="spCrono" aria-label="Tiempo">0:00</span></div>
    <div class="spw0"><div class="spg" id="spGrid" role="group" aria-label="Sopa de letras"></div><svg class="spo" id="spSvg" aria-hidden="true"></svg></div>
    <div class="msg" id="spMsg" role="status" aria-live="polite"></div>
    <div class="spl" id="spList"></div>
    <div class="bar"><button class="btn on" data-ac="nueva">Nueva sopa</button><button class="btn" data-ac="pista">💡 Pista</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button></div>`;
  root.addEventListener('click', clic);
  const gr = $('#spGrid');
  gr.addEventListener('pointerdown', pDown); gr.addEventListener('pointermove', pMove); gr.addEventListener('pointerup', pUp); gr.addEventListener('pointercancel', pCancel);
  api.menu([
    { texto: 'Nueva sopa', accion: () => nueva(S.tema, S.nivel) },
    { texto: '💡 Pista', accion: pista },
    { texto: 'Mostrar soluciones', accion: rendirse, peligro: true },
    { texto: '🎨 Apariencia', accion: () => asp.abrir() },
    { texto: 'Cómo se juega', accion: reglas },
  ]);
  crono = new Cronometro(() => { if (S) { S.t = crono.s; $('#spCrono').textContent = fmtTiempo(crono.s); if (crono.s % 15 === 0) guardar(); } });
  if (!S) { $('#spOps').open = true; await nueva(api.pref('tema', 'animales'), api.pref('nivel', 'medio'), true); }
  else { construir(); arrancar(); pintar(); }
}
export function unmount() {
  if (S && crono) { S.t = crono.s; guardar(); }
  if (crono) crono.detener();
  clearTimeout(pistaT);
  if (root) root.removeEventListener('click', clic);
  S = null; crono = null; cel = []; asp = null;
}
function arrancar() { crono.s = S.t; if (!completa(S) && !S.rendido) crono.iniciar(); else crono.detener(); $('#spCrono').textContent = fmtTiempo(S.t); }

/* ---------- partida ---------- */
const hayProgreso = () => S && !completa(S) && !S.rendido && S.halladas.length > 0;
async function nueva(tema, nivel, forzar = false) {
  if (ocupado) return;
  if (!forzar && hayProgreso() && !api.confirmar('¿Empezar una sopa nueva? Perderás la actual.')) return;
  if (!Object.hasOwn(TEMAS, tema) && tema !== 'mezcla') tema = 'animales';
  ocupado = true; if (crono) crono.detener();
  await esperar(20);
  const g = generar(tema, nivel);
  S = { tema, nivel, n: g.n, grid: g.grid, palabras: g.palabras, halladas: [], t: 0, pistas: 0, rendido: false };
  api.setPref('tema', tema); api.setPref('nivel', nivel);
  ocupado = false; ancla = null; sel = null; pistaCel = -1;
  crono = new Cronometro(crono.alTick, 0);
  construir(); arrancar(); pintar(); guardar();
  $('#spOps').open = false;
}
function guardar() { if (!S) return; const d = { tema: S.tema, nivel: S.nivel, n: S.n, grid: S.grid, palabras: S.palabras, halladas: S.halladas, t: S.t, pistas: S.pistas, rendido: S.rendido }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }
function rendirse() {
  if (!S || completa(S) || S.rendido || !api.confirmar('¿Mostrar todas las palabras? La partida no contará en estadísticas.')) return;
  S.palabras.forEach((w, i) => { if (!S.halladas.some(h => h.i === i)) S.halladas.push({ i, a: w.f, b: w.f + (w.p.length - 1) * (w.d[0] * S.n + w.d[1]), r: 1 }); });
  S.rendido = true; crono.detener(); pintar(); guardar();
}
function pista() {
  if (!S || completa(S) || S.rendido) return;
  const pend = S.palabras.map((w, i) => i).filter(i => !S.halladas.some(h => h.i === i));
  const w = S.palabras[pend[Math.random() * pend.length | 0]];
  S.pistas++; pistaCel = w.f; clearTimeout(pistaT); pistaT = setTimeout(() => { pistaCel = -1; if (S) pintar(); }, 4000);
  api.sonido('ok'); pintar(); guardar();
}

/* ---------- pintado ---------- */
function construir() {
  const n = S.n, gr = $('#spGrid');
  gr.style.setProperty('--n', n);
  gr.innerHTML = S.grid.map((c, i) => `<button type="button" class="spc" data-i="${i}" aria-label="Fila ${(i / n | 0) + 1}, columna ${i % n + 1}, letra ${c}">${c}</button>`).join('');
  cel = [...gr.children]; $('#spSvg').setAttribute('viewBox', `0 0 ${n} ${n}`);
  root.querySelectorAll('[data-tema]').forEach(b => b.classList.toggle('on', b.dataset.tema === S.tema));
  root.querySelectorAll('[data-niv]').forEach(b => b.classList.toggle('on', b.dataset.niv === S.nivel));
}
const centro = (n, i) => [(i % n) + .5, (i / n | 0) + .5];
function colorDe(i) { const p = MARCAS[asp.valores.marca] || MARCAS.arcoiris; return p[i % p.length]; }
function dibujar() {
  const n = S.n; let h = '';
  for (const f of S.halladas) {
    const [x1, y1] = centro(n, f.a), [x2, y2] = centro(n, f.b);
    h += f.r ? `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width=".72" style="stroke:var(--mut)" opacity=".45" stroke-dasharray=".25 .3"/>` : `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width=".78" style="stroke:${colorDe(f.i)}" opacity=".48"/>`;
  }
  if (sel) { const [x1, y1] = centro(n, sel.a), [x2, y2] = centro(n, sel.b); h += `<line class="sel" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width=".78"/>`; }
  if (pistaCel >= 0) { const [x, y] = centro(n, pistaCel); h += `<circle class="hint" cx="${x}" cy="${y}" r=".46"/>`; }
  $('#spSvg').innerHTML = h;
}
function pintar() {
  if (!S) return;
  const fin = completa(S) || S.rendido;
  if (completa(S) && !S.done) {
    S.done = true; crono.detener(); S.t = crono.s;
    api.registrar({ res: 'victoria', tiempo: S.t, variante: LVL[S.nivel], limpio: S.pistas === 0 });
    api.sonido('ganar'); api.vibrar([60, 40, 60]); guardar();
  }
  cel.forEach((b, i) => b.classList.toggle('an', ancla === i));
  $('#spSum').textContent = `⚙️ ${temaNombre(S.tema)} · ${LVL[S.nivel]}`;
  $('#spInfo').textContent = `${nHalladas(S)}/${S.palabras.length} palabras${S.pistas ? ` · ${S.pistas} pista${S.pistas > 1 ? 's' : ''}` : ''}`;
  $('#spCrono').textContent = fmtTiempo(S.t);
  $('#spList').innerHTML = S.palabras.map((w, i) => { const h = S.halladas.find(x => x.i === i); return `<span class="${h ? (h.r ? 'rev' : 'ok') : ''}" ${h && !h.r ? `style="background:${colorDe(i)}"` : ''}>${w.p}</span>`; }).join('');
  const m = $('#spMsg'); m.className = 'msg' + (completa(S) ? ' win' : '');
  m.textContent = completa(S) ? `¡Sopa completada en ${fmtTiempo(S.t)}!` : S.rendido ? 'Soluciones reveladas. Prueba con una sopa nueva.' : ancla != null ? 'Toca la última letra de la palabra.' : 'Arrastra por las letras o toca la primera y la última.';
  dibujar();
}

/* ---------- entrada: arrastrar o tocar inicio y fin ---------- */
const celdaEn = e => { const b = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.spc'); return b && $('#spGrid').contains(b) ? +b.dataset.i : null; };
function pDown(e) {
  if (!S || completa(S) || S.rendido || e.button > 0) return;
  const i = celdaEn(e); if (i == null) return;
  e.preventDefault(); try { $('#spGrid').setPointerCapture(e.pointerId); } catch { /* ignorar */ }
  arrastre = true; sel = { a: i, b: i, mov: false };
}
function pMove(e) {
  if (!arrastre || !sel) return;
  const i = celdaEn(e); if (i == null) return;
  const b = ajustar(S.n, sel.a, i);
  if (b !== sel.b) { sel.b = b; sel.mov = sel.mov || b !== sel.a; dibujar(); }
}
function pUp() {
  if (!arrastre || !sel) return;
  arrastre = false; const s = sel; sel = null;
  if (!s.mov || s.a === s.b) {                           // toque: primera y última letra
    if (ancla == null) ancla = s.a;
    else if (ancla === s.a) ancla = null;
    else { const b = ajustar(S.n, ancla, s.a); const a = ancla; ancla = null; intentar(a, b); }
  } else { ancla = null; intentar(s.a, s.b); }
  pintar();
}
function pCancel() { arrastre = false; sel = null; dibujar(); }
function intentar(a, b) {
  const cs = linea(S.n, a, b); if (!cs || cs.length < 2) return;
  const txt = cs.map(i => S.grid[i]).join(''), inv = [...txt].reverse().join('');
  const i = S.palabras.findIndex((w, k) => (w.p === txt || w.p === inv) && !S.halladas.some(h => h.i === k));
  if (i < 0) { api.sonido('error'); return; }
  S.halladas.push({ i, a, b, r: 0 }); api.sonido('ok'); api.vibrar(15); pistaCel = -1;
  guardar();
}
function clic(e) {
  const b = e.target.closest('button'); if (!b || !S) return;
  if (b.classList.contains('spc')) {                    // teclado (Intro): detail === 0
    if (e.detail !== 0 || completa(S) || S.rendido) return;
    const i = +b.dataset.i;
    if (ancla == null) ancla = i; else if (ancla === i) ancla = null; else { const a = ancla; ancla = null; intentar(a, ajustar(S.n, a, i)); }
    return pintar();
  }
  const d = b.dataset;
  if (d.tema) return nueva(d.tema, S.nivel);
  if (d.niv) return nueva(S.tema, d.niv);
  if (d.ac === 'nueva') nueva(S.tema, S.nivel); else if (d.ac === 'pista') pista(); else if (d.ac === 'aspecto') asp.abrir();
}
function reglas() {
  api.modal('Sopa de letras', `<ul><li>Encuentra todas las palabras de la lista escondidas en el tablero.</li>
    <li>En <b>Fácil</b> van en horizontal y vertical; en <b>Medio</b> también en diagonal; en <b>Difícil</b> en las 8 direcciones, ¡incluso al revés!</li>
    <li><b>Arrastra</b> el dedo de la primera a la última letra, o toca la primera y luego la última.</li>
    <li>💡 <b>Pista</b> señala la primera letra de una palabra pendiente (con pistas no cuenta el récord de tiempo).</li>
    <li>En 🎨 Apariencia cambias los colores del tablero, el subrayado y el tipo de letra.</li></ul>`);
}
