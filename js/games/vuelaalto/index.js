import { $, esc } from '../../core/dom.js';
import * as M from './motor.js';
import { grupoFondo, grupoPantalla, grupoPersonaje, emojiPersonaje } from '../../core/aspectos.js';

let S = null, Mu = null, api = null, asp = null, root = null, cv = null, ctx = null, dpr = 1, k = 1, raf = 0, acc = 0, tPrev = 0, reg = false;
let onKey = null, onKeyUp = null, onUp = null, onVis = null, onRes = null, hold = false, efectos = [], hudAnt = '', recordAct = 0, nuevoRecord = false, podioPos = -1, eraJugando = false;
let cfg = { ...M.CFG_DEF }, prog = { max: 1, est: {} };

/* ---------- escenarios ---------- */
const TH = {
  dia: { n: 'Día', cielo: ['#6EC1F2', '#CFEBFB'], col: ['#9ADB84', '#74C25F'], suelo: ['#7BC043', '#DED895', '#C9C171'], tubo: ['#5DBB3A', '#3E8E2A', '#9BE56E'], nube: '#FFFFFF', obj: 'nubes' },
  atardecer: { n: 'Atardecer', cielo: ['#FF8F5E', '#FFDCA3'], col: ['#C96F8E', '#9C5180'], suelo: ['#B5654A', '#E7B77A', '#CF9C62'], tubo: ['#C75B3A', '#8F3F28', '#EE9068'], nube: '#FFE9D2', obj: 'nubes' },
  noche: { n: 'Noche', cielo: ['#0A1038', '#2B3C92'], col: ['#1D2A6E', '#16215A'], suelo: ['#3E8E7A', '#2B3A55', '#222E47'], tubo: ['#3C8F8A', '#27605D', '#66CFC8'], nube: '#4A5CB0', obj: 'estrellas' },
  nieve: { n: 'Nieve', cielo: ['#A9CDEB', '#EAF4FC'], col: ['#FFFFFF', '#D5E6F4'], suelo: ['#FFFFFF', '#EEF6FC', '#D2E3F1'], tubo: ['#8BD2F5', '#559FCE', '#D3F1FF'], nube: '#FFFFFF', obj: 'nieve' },
  desierto: { n: 'Desierto', cielo: ['#F4BE5E', '#FCE8B4'], col: ['#E7B067', '#D29443'], suelo: ['#D9A24E', '#EBC57F', '#D3AA66'], tubo: ['#C9893F', '#9C6428', '#E8B574'], nube: '#FFF3D6', obj: 'nubes' },
  selva: { n: 'Selva', cielo: ['#52B384', '#BBE9CA'], col: ['#2F8F4E', '#237038'], suelo: ['#3F9B3A', '#6B4A2B', '#573A20'], tubo: ['#7A4F2B', '#573619', '#A27549'], nube: '#DDF5E4', obj: 'nubes' },
  volcan: { n: 'Volcán', cielo: ['#2E0B0B', '#C23B1A'], col: ['#2A1414', '#481C13'], suelo: ['#FF5A1F', '#2A1A1A', '#1F1212'], tubo: ['#5A4545', '#2B2222', '#8A7070'], nube: '#6B2A22', obj: 'brasas' },
  espacio: { n: 'Espacio', cielo: ['#040210', '#1D1558'], col: ['#2A2260', '#1D1745'], suelo: ['#7C7CC4', '#2B2B3F', '#1E1E2E'], tubo: ['#9AA3B8', '#667086', '#CDD4E3'], nube: '#3B2F8A', obj: 'estrellas' },
};
const PASO = { auto: null };

/* ---------- validación / resumen ---------- */
export function validar(d) { const s = d && M.validar(d.s); return s ? { s, reg: !!d.reg } : null; }
export const migrarV1 = d => d;
export const resumen = d => M.resumen(d.s);

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; efectos = []; nuevoRecord = false; hold = false;
  asp = api.aspecto([grupoFondo(''), grupoPantalla(''), grupoPersonaje('Personaje'),
    { clave: 'esc', titulo: 'Escenario', def: 'auto', opciones: [{ id: 'auto', nombre: 'Según el nivel', sw: ['#6EC1F2', '#0A1038'] }, ...Object.entries(TH).map(([id, t]) => ({ id, nombre: t.n, sw: [t.cielo[0], t.cielo[1]] }))] }], () => { if (S) dibujar(); });
  await api.css(new URL('./vuelaalto.css', import.meta.url));
  const c0 = M.cfgValida({ ...M.CFG_DEF, ...api.pref('cfg', null) }); if (c0) cfg = c0;
  const p0 = api.pref('prog', null); if (p0 && Number.isInteger(p0.max)) prog = { max: Math.min(M.N_NIVELES, Math.max(1, p0.max)), est: p0.est && typeof p0.est === 'object' ? p0.est : {} };
  const g = api.cargar(); S = g ? g.s : null; reg = g ? g.reg : false;
  root.addEventListener('click', clic); onKey = teclado; document.addEventListener('keydown', onKey);
  onKeyUp = e => { if (['arrowup', ' ', 'w'].includes(e.key.toLowerCase())) hold = false; }; document.addEventListener('keyup', onKeyUp);
  onUp = () => { hold = false; }; addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp); addEventListener('blur', onUp);
  onRes = () => { if (cv && S) { ajustarTamano(); dibujar(); } }; addEventListener('resize', onRes);
  onVis = () => { if (document.hidden) { hold = false; pausar(); } }; document.addEventListener('visibilitychange', onVis);
  api.barra({ nueva: () => empezar(),
    salir: () => { pausar(); setup(); },
    pausar: () => { eraJugando = !!S && S.fase === 'jugar'; pausar(); },
    reanudar: o => { if (o === 'salir' && eraJugando) jugarYa(); },
    config: { valores: () => ({ ...cfg }), grupos: v => [
      { clave: 'modo', titulo: 'Modo', opciones: Object.entries(M.MODOS) },
      { clave: 'nivel', titulo: 'Nivel', visible: v.modo === 'niveles', opciones: Array.from({ length: M.N_NIVELES }, (_, i) => [i + 1, `${i + 1}`]) },
      { clave: 'dif', titulo: 'Dificultad', opciones: Object.entries(M.DIF).map(([k2, x]) => [k2, x.nombre]) },
      { clave: 'afl', titulo: 'Obstáculos', opciones: Object.entries(M.AFL).map(([k2, x]) => [k2, x.nombre]) },
      { clave: 'vel', titulo: 'Velocidad', opciones: Object.entries(M.VEL).map(([k2, x]) => [k2, x.nombre]) },
      { clave: 'ctl', titulo: 'Control', opciones: Object.entries(M.CTL).map(([k2, x]) => [k2, x.nombre]) },
      { clave: 'ext', titulo: 'Peligros', opciones: Object.entries(M.EXT) },
      { clave: 'abiertos', titulo: 'Niveles', visible: v.modo === 'niveles', opciones: [[false, 'Se desbloquean'], [true, 'Todos abiertos']] }], aplicar: v => { Object.assign(cfg, v); empezar(); } } });
  api.menu([{ texto: 'Nueva partida', accion: () => { pausar(); setup(); } }, { texto: '🏆 Podio (Infinito)', accion: () => { pausar(); verPodio(); } }, { texto: '⏸️ Pausa', accion: pausar }, { texto: '🎨 Apariencia', accion: () => { pausar(); asp.abrir(); } }, { texto: 'Cómo se juega', accion: () => { pausar(); reglas(); } }]);
  if (S && S.fase !== 'fin' && S.fase !== 'meta') { Mu = new M.Mundo(S); armar(); dibujar(); } else setup();
}
export function unmount() {
  pausar(); cancelAnimationFrame(raf); raf = 0;
  document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKeyUp); document.removeEventListener('visibilitychange', onVis);
  removeEventListener('resize', onRes); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp); removeEventListener('blur', onUp);
  if (root) root.removeEventListener('click', clic); S = null; Mu = null; cv = null; asp = null;
}
function guardar() { if (!S) return; const d = { s: { ...S }, reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }
const libre = n => cfg.abiertos || n <= prog.max;
const estrellasDe = n => '★'.repeat(prog.est[n] || 0) + '☆'.repeat(3 - (prog.est[n] || 0));

/* ---------- pantallas ---------- */
function setup() {
  cancelAnimationFrame(raf); raf = 0;
  if (S && (S.fase === 'pausa' || S.fase === 'jugar')) guardar();
  const seg = (c, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${cfg[c] === v ? 'on' : ''}" data-cfg="${c}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const grid = Array.from({ length: M.N_NIVELES }, (_, i) => { const n = i + 1, ok = libre(n); return `<button class="btn vanv ${cfg.nivel === n ? 'on' : ''}" data-niv="${n}" ${ok ? '' : 'disabled'} aria-label="Nivel ${n}"><b>${ok ? n : '🔒'}</b><small>${ok ? estrellasDe(n) : ''}</small></button>`; }).join('');
  const rec = api.record('Infinito · ' + M.DIF[cfg.dif].nombre);
  const m = cfg.modo === 'niveles';
  root.innerHTML = `<p class="note">Mantén pulsada la pantalla para <b>subir</b> y suéltala para <b>bajar</b>. Pasa entre los obstáculos, recoge 🪙 y llega a la meta.</p>
    <div class="bar"><span class="lbl">Modo</span>${seg('modo', Object.entries(M.MODOS))}</div>
    ${m ? `<div class="bar"><span class="lbl">Nivel</span></div><div class="vagrid">${grid}</div>
      <p class="note"><b>${cfg.nivel}. ${M.NOMBRES[cfg.nivel - 1]}</b> · ${M.TEMAS.includes(M.temaDe(cfg.nivel)) ? TH[M.temaDe(cfg.nivel)].n : ''} · ${M.distanciaNivel(cfg.nivel).toLocaleString('es-ES')} m</p>` : `<p class="note">Vuela sin fin: los obstáculos van aumentando de dificultad. ${rec ? `Tu récord (${M.DIF[cfg.dif].nombre}): <b>${rec}</b> puntos.` : ''}</p>`}
    <div class="bar"><span class="lbl">Dificultad</span>${seg('dif', Object.entries(M.DIF).map(([x, v]) => [x, v.nombre]))}</div>
    <div class="bar"><span class="lbl">Obstáculos</span>${seg('afl', Object.entries(M.AFL).map(([x, v]) => [x, v.nombre]))}</div>
    <div class="bar"><span class="lbl">Velocidad</span>${seg('vel', Object.entries(M.VEL).map(([x, v]) => [x, v.nombre]))}</div>
    <div class="bar"><span class="lbl">Control</span>${seg('ctl', Object.entries(M.CTL).map(([x, v]) => [x, v.nombre]))}</div>
    <div class="bar"><span class="lbl">Peligros</span>${seg('ext', Object.entries(M.EXT))}</div>
    <p class="note">Dificultad: tamaño del hueco y velocidad. Obstáculos: cuánto tardan en aparecer. Peligros: añade tubos móviles, pájaros, dobles huecos y hélices.</p>
    ${m ? `<div class="bar"><span class="lbl">Niveles</span>${seg('abiertos', [[false, 'Se desbloquean'], [true, 'Todos abiertos']])}</div>` : ''}
    <div class="bar">${S && S.fase === 'pausa' ? '<button class="btn on" data-ac="seguir">▶️ Continuar partida</button>' : ''}<button class="btn ${S && S.fase === 'pausa' ? '' : 'on'}" data-ac="start">🐦 Jugar</button><button class="btn" data-ac="podio">🏆 Podio</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button></div>`;
}
function armar() {
  root.innerHTML = `<div class="vahud"><span>🪙 <b id="vaMon">0</b></span><span class="pts"><b id="vaPts">0</b> puntos</span><span id="vaDist">0 m</span><button class="btn vapausa" data-ac="pausa" aria-label="Pausa">⏸️</button></div>
    <div class="vaprog" id="vaProg"><i id="vaBar"></i></div>
    <div class="vazona" id="vaZona"><canvas id="vaCv" aria-label="Zona de vuelo"></canvas><div class="vaover" id="vaOver"></div></div>
    <p class="note vaayuda">Mantén pulsado para subir · suelta para bajar. También con Espacio o ↑. Tecla P = pausa.</p>
    ${api.barraHtml()}`;
  cv = $('#vaCv'); ctx = cv.getContext('2d'); dpr = Math.min(window.devicePixelRatio || 1, 3); hudAnt = '';
  recordAct = S && S.modo === 'infinito' ? api.record(M.variante(S)) : 0;
  const zona = $('#vaZona');
  zona.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    hold = true; e.preventDefault();
    if (S && (S.fase === 'listo' || S.fase === 'pausa')) jugarYa();
  });
  zona.addEventListener('contextmenu', e => e.preventDefault());
  ajustarTamano(); pintarOver();
}
function ajustarTamano() {
  if (!cv) return;
  const w = Math.floor(cv.parentElement.getBoundingClientRect().width);
  if (cv.width === w * dpr) return;
  cv.width = w * dpr; cv.height = Math.round(w * dpr * M.H / M.W); cv.style.width = w + 'px'; cv.style.height = Math.round(w * M.H / M.W) + 'px'; k = cv.width / M.W;
}
function nivelSeguro() { if (!libre(cfg.nivel)) cfg.nivel = prog.max; }
function empezar(seguir = false) {
  nivelSeguro(); api.setPref('cfg', cfg);
  if (!seguir || !S || S.fase === 'fin' || S.fase === 'meta') { S = M.crear(cfg); Mu = new M.Mundo(S); reg = false; nuevoRecord = false; podioPos = -1; efectos = []; api.borrar(); }
  else if (!Mu) Mu = new M.Mundo(S);
  armar(); dibujar();
}

/* ---------- bucle ---------- */
function jugarYa() {
  if (!S || S.fase === 'fin' || S.fase === 'meta') return;
  S.fase = 'jugar'; tPrev = performance.now(); acc = 0; pintarOver();
  cancelAnimationFrame(raf); raf = requestAnimationFrame(bucle);
}
function bucle(t) {
  if (!S || S.fase !== 'jugar') return;
  acc += Math.min(t - tPrev, 100) / 1000; tPrev = t;
  while (acc >= M.DT && S.fase === 'jugar') {
    acc -= M.DT;
    const ev = M.paso(S, Mu, hold, M.DT);
    if (ev === 'moneda') { api.sonido('click'); api.vibrar(10); efectos.push({ t: performance.now(), x: S.x, y: S.y }); }
    else if (ev === 'suelo' || ev === 'choque') { finPartida(false); break; }
    else if (ev === 'meta') { finPartida(true); break; }
  }
  dibujar(); pintarHud();
  if (S && S.fase === 'jugar') raf = requestAnimationFrame(bucle);
}
function pausar() {
  if (!S || S.fase !== 'jugar') return;
  S.fase = 'pausa'; cancelAnimationFrame(raf); raf = 0; hold = false; guardar(); pintarOver(); dibujar();
}
function finPartida(gana) {
  cancelAnimationFrame(raf); raf = 0; hold = false;
  const v = M.variante(S), antes = S.modo === 'infinito' ? api.record(v) : 0;
  if (gana) {
    const e = prog.est[S.nivel] || 0; if (S.est > e) prog.est[S.nivel] = S.est;
    if (S.nivel < M.N_NIVELES && S.nivel >= prog.max) prog.max = S.nivel + 1;
    api.setPref('prog', prog); api.sonido('ganar'); api.vibrar([60, 40, 60, 40, 120]);
  } else { api.sonido('perder'); api.vibrar([80, 40, 120]); efectos.push({ t: performance.now(), x: S.x, y: S.y, fin: 1 }); }
  if (!reg) { reg = true; api.registrar({ res: gana ? 'victoria' : 'partida', variante: v, puntos: S.puntos }); }
  nuevoRecord = S.modo === 'infinito' && S.puntos > antes && S.puntos > 0;
  guardar(); pintarHud();
  const t0 = performance.now(), anima = t => { dibujar(); if (t - t0 < 700 && S && cv) requestAnimationFrame(anima); else { pintarOver(); anotarPodio(); } };
  requestAnimationFrame(anima);
}
async function anotarPodio() {
  if (!S || S.fase !== 'fin' || S.modo !== 'infinito' || podioPos >= 0) return;
  const v = M.variante(S), p = S.puntos;
  if (!api.podio.entra(v, p)) return;
  podioPos = await api.podio.anotar(v, p);
  if (S && S.fase === 'fin') pintarOver();
}
function verPodio() {
  const vs = Object.keys(M.DIF).map(d => M.variante({ modo: 'infinito', dif: d })).filter(v => api.podio.lista(v).length);
  api.modal('🏆 Podio · Infinito', vs.length ? vs.map(v => `<h3>${esc(v)}</h3>${api.podio.html(v)}`).join('') : '<p>Juega una partida en modo Infinito y entra en la tabla de los 10 mejores.</p>');
}

/* ---------- dibujo ---------- */
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const temaAct = () => TH[asp.valores.esc && TH[asp.valores.esc] ? asp.valores.esc : (S.modo === 'niveles' ? M.temaDe(S.nivel) : M.TEMAS[Math.min(7, Math.floor(M.metros(S) / 1500))])] || TH.dia;
function dibujar() {
  if (!S || !cv || !ctx || !Mu) return;
  const T = temaAct(), ahora = performance.now(), cam = S.x - M.PX;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  const sh = efectos.find(e => e.fin && ahora - e.t < 350); if (sh) { const f = (1 - (ahora - sh.t) / 350) * 6; ctx.translate((Math.random() - .5) * f, (Math.random() - .5) * f); }
  // cielo
  const gr = ctx.createLinearGradient(0, 0, 0, M.SUELO); gr.addColorStop(0, T.cielo[0]); gr.addColorStop(1, T.cielo[1]); ctx.fillStyle = gr; ctx.fillRect(-10, -10, M.W + 20, M.H + 20);
  fondoLejano(T, cam, ahora);
  // monedas, obstáculos, pájaros
  const x1 = cam + M.W + 40;
  if (S.modo === 'niveles' && Mu.fin < x1 + 40) meta(Mu.fin - cam);
  for (const o of M.visibles(Mu, cam, x1)) obstaculo(o, o.x0 - cam, T);
  for (const c of M.monedasVis(Mu, cam, x1)) moneda(c.x - cam, c.y + Math.sin(ahora / 260 + c.id) * 3);
  for (const a of M.avesVis(Mu, cam, x1)) { const p = M.posAve(a, S.t); if (p.x - cam > -30 && p.x - cam < M.W + 30) pajaro(p.x - cam, p.y, ahora); }
  suelo(T, cam);
  // efectos
  efectos = efectos.filter(e => ahora - e.t < 600);
  for (const e of efectos) if (!e.fin) { const f = (ahora - e.t) / 400; if (f < 1) { ctx.globalAlpha = 1 - f; ctx.strokeStyle = '#FFD43B'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x - cam, e.y, 14 + f * 22, 0, 6.283); ctx.stroke(); ctx.globalAlpha = 1; } }
  personaje(ahora);
}
function fondoLejano(T, cam, t) {
  // colinas en dos capas con desplazamiento más lento
  for (const [i, f, alt, a] of [[0, .12, 150, 28], [1, .28, 105, 20]]) {
    ctx.fillStyle = T.col[i]; ctx.beginPath(); ctx.moveTo(0, M.SUELO);
    for (let x = 0; x <= M.W; x += 12) { const w = x + cam * f; ctx.lineTo(x, M.SUELO - alt * .5 + Math.sin(w / (70 + i * 30)) * a * .6 + Math.sin(w / 31 + i) * a * .25); }
    ctx.lineTo(M.W, M.SUELO); ctx.closePath(); ctx.fill();
  }
  if (T.obj === 'estrellas') {
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 40; i++) { const x = ((hash(i) * 600 - cam * (.04 + hash(i + 9) * .06)) % 420 + 420) % 420 - 30, y = hash(i + 50) * 300 + 10, r = .6 + hash(i + 3) * 1.2; ctx.globalAlpha = .5 + .5 * Math.sin(t / 400 + i); ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); }
    ctx.globalAlpha = 1;
    const lx = 290 - cam * .015; ctx.fillStyle = T === TH.espacio ? '#7C6BD6' : '#F5F1D0'; ctx.beginPath(); ctx.arc(lx % 460 > 0 ? lx % 460 : lx % 460 + 460, 70, T === TH.espacio ? 26 : 20, 0, 6.283); ctx.fill();
  } else if (T.obj === 'nieve' || T.obj === 'brasas') {
    for (let i = 0; i < 34; i++) {
      const sp = T.obj === 'nieve' ? 22 + hash(i) * 30 : -25 - hash(i) * 30;
      const x = ((hash(i + 1) * 420 - cam * .15 + Math.sin(t / 900 + i) * 10) % 400 + 400) % 400, y = ((hash(i + 7) * 450 + t / 1000 * sp) % 450 + 450) % 450;
      ctx.fillStyle = T.obj === 'nieve' ? '#FFFFFF' : (i % 2 ? '#FFB347' : '#FF5A1F'); ctx.globalAlpha = .8; ctx.beginPath(); ctx.arc(x, y, 1.4 + hash(i + 3) * 1.6, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = T.nube;
    for (let i = 0; i < 6; i++) { const x = ((i * 97 - cam * (.06 + (i % 3) * .03)) % 520 + 520) % 520 - 80, y = 40 + hash(i + 2) * 150, s = .8 + hash(i + 11) * .7; ctx.globalAlpha = .85; nube(x, y, s); }
    ctx.globalAlpha = 1;
  }
}
function nube(x, y, s) { ctx.beginPath(); ctx.arc(x, y, 14 * s, 0, 6.283); ctx.arc(x + 16 * s, y - 8 * s, 18 * s, 0, 6.283); ctx.arc(x + 36 * s, y, 14 * s, 0, 6.283); ctx.rect(x, y, 36 * s, 14 * s); ctx.fill(); }
function suelo(T, cam) {
  ctx.fillStyle = T.suelo[1]; ctx.fillRect(0, M.SUELO, M.W, M.H - M.SUELO);
  ctx.fillStyle = T.suelo[2]; for (let x = -(cam % 24) - 24; x < M.W; x += 24) { ctx.beginPath(); ctx.moveTo(x, M.SUELO + 10); ctx.lineTo(x + 12, M.SUELO + 10); ctx.lineTo(x + 24, M.SUELO + 24); ctx.lineTo(x + 12, M.SUELO + 24); ctx.fill(); }
  ctx.fillStyle = T.suelo[0]; ctx.fillRect(0, M.SUELO, M.W, 9); ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(0, M.SUELO + 9, M.W, 2);
}
function columna(x, y0, y1, T, tapa) {            // tubo vertical entre y0 e y1 (tapa: 'abajo' o 'arriba' en el extremo del hueco)
  if (y1 - y0 < 1) return;
  const [c1, c2, c3] = T.tubo, w = M.PW;
  ctx.fillStyle = c1; ctx.fillRect(x, y0, w, y1 - y0); ctx.fillStyle = c3; ctx.fillRect(x + 6, y0, 7, y1 - y0); ctx.fillStyle = c2; ctx.fillRect(x + w - 10, y0, 10, y1 - y0);
  const th = 20; for (const t of tapa) {
    const yy = t === 'abajo' ? y1 - th : y0;
    ctx.fillStyle = c1; ctx.fillRect(x - 4, yy, w + 8, th); ctx.fillStyle = c3; ctx.fillRect(x, yy, 7, th); ctx.fillStyle = c2; ctx.fillRect(x + w - 6, yy, 10, th);
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.strokeRect(x - 4, yy, w + 8, th);
  }
  ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 2; ctx.strokeRect(x, y0, w, y1 - y0);
}
function obstaculo(o, x, T) {
  const d = o.mov ? o.mov.a * Math.sin(o.mov.w * S.t + o.mov.ph) : 0, h2 = o.h / 2;
  if (o.k === 'tubo') { columna(x, -6, o.cy + d - h2, T, ['abajo']); columna(x, o.cy + d + h2, M.SUELO, T, ['arriba']); }
  else if (o.k === 'doble') {
    columna(x, -6, o.cy + d - h2, T, ['abajo']); columna(x, o.cy + d + h2, o.c2 + d - h2, T, ['arriba', 'abajo']); columna(x, o.c2 + d + h2, M.SUELO, T, ['arriba']);
  } else {
    const a = o.ph + o.w * S.t, dx = Math.cos(a) * o.L, dy = Math.sin(a) * o.L, cx = o.cx - (S.x - M.PX);
    ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(cx - dx, o.cy - dy); ctx.lineTo(cx + dx, o.cy + dy); ctx.stroke();
    ctx.strokeStyle = T.tubo[2]; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(cx - dx, o.cy - dy); ctx.lineTo(cx + dx, o.cy + dy); ctx.stroke();
    ctx.fillStyle = '#E7471D'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + s * dx, o.cy + s * dy, 8, 0, 6.283); ctx.fill(); }
    ctx.fillStyle = T.tubo[1]; ctx.beginPath(); ctx.arc(cx, o.cy, 9, 0, 6.283); ctx.fill(); ctx.fillStyle = '#FFD43B'; ctx.beginPath(); ctx.arc(cx, o.cy, 4, 0, 6.283); ctx.fill();
  }
}
function moneda(x, y) {
  ctx.fillStyle = '#FFD43B'; ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#C58A00'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#FFF3A3'; ctx.beginPath(); ctx.arc(x - 2.5, y - 2.5, 3, 0, 6.283); ctx.fill();
}
function pajaro(x, y, t) {
  ctx.save(); ctx.translate(x, y); ctx.font = "24px system-ui,'Apple Color Emoji','Segoe UI Emoji',sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.rotate(Math.sin(t / 120) * .15); ctx.fillText('🦅', 0, 1); ctx.restore();
}
function meta(x) {
  const n = 12, h = M.SUELO / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? '#111' : '#FFF'; ctx.fillRect(x + j * 14, i * h, 14, h); }
  ctx.fillStyle = '#E7471D'; ctx.fillRect(x - 6, 0, 6, M.SUELO); ctx.fillRect(x + 28, 0, 6, M.SUELO);
  ctx.font = '800 16px system-ui,sans-serif'; ctx.fillStyle = '#FFF'; ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.textAlign = 'center'; ctx.strokeText('META', x + 14, 20); ctx.fillText('META', x + 14, 20);
}
function personaje(t) {
  const emo = emojiPersonaje(asp) || '🐦', y = S.y + (S.fase === 'listo' ? Math.sin(t / 250) * 5 : 0);
  ctx.save(); ctx.translate(M.PX, y);
  const ang = Math.max(-.6, Math.min(.9, S.vy / 360)); ctx.rotate(S.fase === 'fin' ? Math.min(1.4, ang + .5) : ang);
  if (!emojiPersonaje(asp)) ctx.scale(-1, 1);                           // el pájaro de siempre mira hacia la derecha
  ctx.font = "32px system-ui,'Apple Color Emoji','Segoe UI Emoji',sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(emo, 0, 2);
  ctx.restore();
}
function pintarHud() {
  if (!S || !$('#vaPts')) return;
  const m = M.metros(S), pr = S.modo === 'niveles' ? Math.min(100, Math.round(S.x / Mu.fin * 100)) : 0;
  const clave = S.puntos + '|' + S.mon + '|' + m + '|' + pr; if (clave === hudAnt) return; hudAnt = clave;
  $('#vaPts').textContent = S.puntos.toLocaleString('es-ES'); $('#vaMon').textContent = S.mon;
  $('#vaDist').textContent = S.modo === 'niveles' ? `${m} / ${M.distanciaNivel(S.nivel)} m` : `${m} m`;
  $('#vaBar').style.width = (S.modo === 'niveles' ? pr : 0) + '%'; $('#vaProg').hidden = S.modo !== 'niveles';
  if (S.modo === 'infinito') $('#vaDist').title = `Récord ${Math.max(recordAct, S.puntos)}`;
}
function pintarOver() {
  const o = $('#vaOver'); if (!o || !S) return;
  o.hidden = S.fase === 'jugar'; const nom = S.modo === 'niveles' ? `Nivel ${S.nivel}: ${M.NOMBRES[S.nivel - 1]}` : 'Modo Infinito';
  if (S.fase === 'listo') o.innerHTML = `<div><b>🐦 ¡Preparado!</b><span>${esc(nom)}</span><span>Mantén pulsado para subir, suelta para bajar</span></div>`;
  else if (S.fase === 'pausa') o.innerHTML = `<div><b>⏸️ Pausa</b><span>${esc(nom)} · ${M.metros(S)} m</span><span>Mantén pulsado para seguir</span></div>`;
  else if (S.fase === 'meta') {
    const sig = S.nivel < M.N_NIVELES;
    o.innerHTML = `<div class="fin"><b>🏁 ¡Nivel superado!</b><span class="est">${'★'.repeat(S.est)}${'☆'.repeat(3 - S.est)}</span><span class="g">${S.puntos.toLocaleString('es-ES')} puntos · ${S.mon} 🪙</span><span class="bts">${sig ? '<button class="btn on" data-ac="siguiente">➡️ Siguiente</button>' : ''}<button class="btn ${sig ? '' : 'on'}" data-ac="otra">🔁 Repetir</button><button class="btn" data-ac="opciones">⚙️ Niveles</button></span></div>`;
  } else if (S.fase === 'fin') o.innerHTML = `<div class="fin"><b>${S.motivo === 'suelo' ? '🌍 ¡Al suelo!' : '💥 ¡Choque!'}</b><span class="g">${S.puntos.toLocaleString('es-ES')} puntos · ${M.metros(S)} m</span>${S.modo === 'niveles' ? `<span>Has llegado al ${Math.round(S.x / Mu.fin * 100)}% del nivel</span>` : ''}${nuevoRecord ? '<span class="rec">🎉 ¡Nuevo récord!</span>' : ''}${podioPos >= 0 ? `<span>🏆 Puesto ${podioPos + 1} del podio</span>` : ''}<span class="bts"><button class="btn on" data-ac="otra">🔁 Otra vez</button><button class="btn" data-ac="opciones">⚙️ Opciones</button></span></div>`;
}

/* ---------- entrada ---------- */
function teclado(e) {
  if (!S || !cv || document.querySelector('.modal') || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const key = e.key.toLowerCase();
  if (key === ' ' || key === 'arrowup' || key === 'w') { e.preventDefault(); if (e.repeat) return; hold = true; if (S.fase === 'listo' || S.fase === 'pausa') jugarYa(); }
  else if (key === 'p') { if (S.fase === 'jugar') pausar(); else if (S.fase === 'pausa') jugarYa(); }
  else if (key === 'enter' && (S.fase === 'fin' || S.fase === 'meta')) empezar();
}
function clic(e) {
  const b = e.target.closest('button,[data-ac]'); if (!b) return; const d = b.dataset;
  if (d.cfg) { cfg[d.cfg] = d.v === 'true' ? true : d.v === 'false' ? false : d.v; api.setPref('cfg', cfg); return setup(); }
  if (d.niv) { cfg.nivel = +d.niv; api.setPref('cfg', cfg); return setup(); }
  const a = d.ac;
  if (a === 'start' || a === 'otra') empezar(); else if (a === 'seguir') empezar(true);
  else if (a === 'siguiente') { cfg.nivel = Math.min(M.N_NIVELES, S.nivel + 1); empezar(); }
  else if (a === 'opciones') { pausar(); setup(); } else if (a === 'podio') verPodio(); else if (a === 'aspecto') { pausar(); asp.abrir(); }
  else if (a === 'pausa') { if (S && S.fase === 'jugar') pausar(); else if (S && S.fase === 'pausa') jugarYa(); }
}
function reglas() {
  api.modal('Vuela Alto', `<ul><li><b>Mantén pulsada</b> la pantalla (o la tecla Espacio / ↑) para que tu personaje <b>suba</b>; <b>suelta</b> para que baje. No hace falta pulsar repetidamente.</li>
    <li>Cruza los huecos entre los obstáculos sin tocarlos ni caer al suelo. Cada puerta superada suma 10 puntos y cada 🪙 recogida, 25.</li>
    <li><b>Niveles</b>: ${M.N_NIVELES} niveles, cada vez más largos y difíciles, con 8 escenarios distintos. Al llegar a la meta ganas hasta 3 ★ según las monedas recogidas (⅓ de ★ por llegar, 2 con la mitad, 3 con el 90 %). Superar un nivel desbloquea el siguiente.</li>
    <li><b>Infinito</b>: sin meta; el recorrido se endurece poco a poco y entras en el podio con tu puntuación.</li>
    <li><b>Peligros</b>: tubos que se mueven, pájaros 🦅, dobles huecos y hélices giratorias (según el nivel o la opción «Peligros»).</li>
    <li><b>Ajustes</b>: dificultad (tamaño de los huecos y velocidad), obstáculos (cada cuánto aparecen), velocidad general y tipo de control (suave, normal o ágil).</li>
    <li>En 🎨 Apariencia puedes cambiar el personaje, el escenario y el fondo. Si sales, la partida se pausa y se guarda.</li></ul>`);
}
