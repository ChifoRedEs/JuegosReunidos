// Worms (Arcade) · vista: pantalla de ajustes, canvas, controles táctiles/teclado, cámara, efectos y guardado.
// La lógica está en motor.js (físicas, armas, turnos) e ia.js (CPU), ambos sin DOM.
import { $, esc } from '../../core/dom.js';
import * as M from './motor.js';
import { crearPiloto } from './ia.js';
import { grupoEscenario, grupoPersonaje } from '../../core/aspectos.js';
import { imagenTapete } from '../../core/cartas.js';
import { gruposFichas, estilo, rgb, claro, oscuro, pixelTextura } from '../../core/fichas.js';
import { FICHAS } from '../../core/personajes.js';

let S = null, api = null, asp = null, root = null, raf = 0, tPrev = 0, cv = null, ctx = null, dpr = 1, cw = 360, ch = 280, zona = null;
let onKey = null, onKeyUp = null, onVis = null, onRes = null, piloto = null, pausa = false, terCv = null, finMostrado = false, hudAnt = '', panelAnt = '';
let cam = { x: 0, y: 0, libre: false }, vistaW = 430, anims = [], parts = [], shake = 0, ultExp = null, teclas = { izq: false, der: false, arr: false, aba: false }, cargando = false, bannerT = 0, ticAnt = new Map();
const punteros = new Map();
let pinch = null;
let eraPausa = false;
let cfg = { n: 3, mapa: 'colinas', modo: 'cpu', nivel: 1, tiempo: 30, cajas: true };
const ZOOM_MIN = 280;

const PAL = {
  bosque:    { top: [96, 166, 60], tope: [140, 204, 88], mid: [124, 88, 52], deep: [70, 48, 30], agua: ['rgba(54,140,205,.62)', '#9fd8ff'] },
  ciudad:    { top: [150, 160, 172], tope: [188, 198, 208], mid: [112, 120, 132], deep: [64, 70, 84], agua: ['rgba(60,120,172,.62)', '#a8d2f2'] },
  deportivo: { top: [200, 90, 60], tope: [232, 126, 90], mid: [160, 72, 50], deep: [102, 46, 34], agua: ['rgba(70,150,200,.62)', '#a8dcf5'] },
  desierto:  { top: [238, 198, 114], tope: [252, 224, 152], mid: [206, 152, 80], deep: [150, 102, 56], agua: ['rgba(60,160,190,.62)', '#a4e4ef'] },
  espacio:   { top: [170, 170, 188], tope: [208, 208, 226], mid: [112, 112, 136], deep: [64, 64, 88], agua: ['rgba(110,60,200,.55)', '#c9a6ff'] },
  infierno:  { top: [255, 122, 42], tope: [255, 176, 72], mid: [112, 38, 30], deep: [54, 18, 16], agua: ['rgba(240,84,18,.78)', '#ffc66b'] },
  lago:      { top: [112, 192, 74], tope: [154, 224, 104], mid: [142, 106, 64], deep: [88, 64, 40], agua: ['rgba(46,150,224,.6)', '#a6e2ff'] },
  medieval:  { top: [118, 172, 82], tope: [152, 204, 110], mid: [150, 140, 118], deep: [96, 88, 72], agua: ['rgba(60,122,184,.62)', '#a6d0f0'] },
};
const paletaBase = () => PAL[String((asp && asp.valores.esc) || '').slice(2)] || PAL.bosque;
// 🎨 Terreno: si se elige un color, la tierra se tiñe de él (superficie, capas y fondo) y se conserva el agua del escenario
const paleta = () => { const b = paletaBase(), e = asp ? estilo(asp.valores) : null; if (!e || !e.hex) return b; return { ...b, tope: rgb(claro(e.hex, .3)), top: rgb(e.hex), mid: rgb(oscuro(e.hex, .22)), deep: rgb(oscuro(e.hex, .5)) }; };
const urlIcono = n => new URL(`../../../img/worms/${n}.webp`, import.meta.url).href;
const ICON = {};
const ico = n => { let im = ICON[n]; if (!im) { im = ICON[n] = new Image(); im.src = urlIcono(n); } return im.complete && im.naturalWidth ? im : null; };
const PRECARGA = ['lanzamisiles', 'escopeta', 'granada-explosiva', 'granada-racimo', 'granada-sagrada', 'dinamita', 'ataque-aereo', 'cuerda', 'teletransporte', 'misil1', 'misil2', 'explosion1', 'explosion2', 'explosion3', 'tumba1', 'tumba2', 'tumba3', 'bomba-aerea'];

/* ---------- validación / resumen ---------- */
export function validar(d) { const s = d && M.validar(d.s); return s ? { s } : null; }
export const migrarV1 = d => d;
export function resumen(d) {
  const s = d.s, a = s.gus.filter(w => w.vivo && w.eq === 0).length, b = s.gus.filter(w => w.vivo && w.eq === 1).length, n = s.cfg.n;
  if (s.ganador !== null) return { texto: `${n} vs ${n} · ${s.ganador === -1 ? 'Tablas' : 'Ganó ' + (s.ganador === 1 && s.cfg.modo === 'cpu' ? 'la CPU' : M.EQUIPOS[s.ganador])}`, fin: true };
  return { texto: `${n} vs ${n} · ${M.MAPAS[s.cfg.mapa]} · ${a}–${b} gusanos`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; S = null; finMostrado = false; pausa = false; anims = []; parts = []; shake = 0;
  const c0 = api.pref('cfg', null); if (c0 && typeof c0 === 'object') cfg = { ...cfg, ...limpiarCfg(c0) };
  asp = api.aspecto([
    grupoEscenario('.wmfondo'),
    { ...grupoPersonaje('Personajes · equipo Rojo'), clave: 'pj' },
    { ...grupoPersonaje('Personajes · equipo Azul o CPU'), clave: 'pj2' },
    ...gruposFichas({ titulo: 'Terreno', icono: '⛰️', pocos: true, formas: false, tamano: false }),
  ], () => { if (S) { construirTerreno(); dibujar(); } });
  await api.css(new URL('../../../css/fichas.css', import.meta.url)); await api.css(new URL('./worms.css', import.meta.url));
  PRECARGA.forEach(ico);
  root.addEventListener('click', clic);
  onKey = teclaAbajo; onKeyUp = teclaArriba; document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKeyUp);
  onVis = () => { if (document.hidden) poner_pausa(true); }; document.addEventListener('visibilitychange', onVis);
  onRes = () => { if (cv && S) { ajustar(); dibujar(); } }; addEventListener('resize', onRes);
  api.barra({ nueva: () => nuevaPartida(),
    salir: () => ajustes(),
    pausar: () => { eraPausa = pausa; poner_pausa(true); },
    reanudar: o => { if (o === 'salir' && !eraPausa) poner_pausa(false); },
    config: { valores: () => ({ modo: cfg.modo, nivel: cfg.nivel, n: cfg.n, mapa: cfg.mapa, tiempo: cfg.tiempo, cajas: cfg.cajas }), grupos: v => [{ clave: 'modo', titulo: 'Modo', opciones: [['cpu', '🤖 Contra la CPU'], ['dos', '👥 2 jugadores']] }, { clave: 'nivel', titulo: 'Nivel de la CPU', visible: v.modo === 'cpu', opciones: M.NIVELES.map((n, i) => [i, n]) }, { clave: 'n', titulo: 'Gusanos por equipo', opciones: M.TAMANOS.map(n => [n, String(n)]) }, { clave: 'mapa', titulo: 'Mapa', opciones: [...Object.entries(M.MAPAS), ['azar', '🎲 Al azar']] }, { clave: 'tiempo', titulo: 'Tiempo por turno', opciones: M.TIEMPOS.map(t => [t, t + ' s']) }, { clave: 'cajas', titulo: 'Cajas de suministros', opciones: [[true, '📦 Sí'], [false, 'No']] }], aplicar: v => { Object.assign(cfg, v); nuevaPartida(); } } });
  api.menu([
    { texto: 'Nueva partida', accion: () => { if (!S || S.turno.fase === 'fin' || api.confirmar('¿Dejar la partida actual?')) ajustes(); } },
    { texto: '🎒 Armas', accion: () => armas() },
    { texto: '⏸️ Pausa', accion: () => poner_pausa(true) },
    { texto: '⏭️ Terminar turno', accion: () => { if (humano()) M.terminarTurno(S); } },
    { texto: '🎨 Apariencia', accion: () => { poner_pausa(true); asp.abrir(); } },
    { texto: 'Cómo se juega', accion: () => { poner_pausa(true); reglas(); } },
  ]);
  const g = api.cargar();
  if (g && g.s.ganador === null) { try { S = M.restaurar(g.s); } catch { S = null; } }
  if (S) empezar(); else ajustes();
}
export function unmount() {
  cancelAnimationFrame(raf); raf = 0;
  document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKeyUp); document.removeEventListener('visibilitychange', onVis); removeEventListener('resize', onRes);
  if (root) root.removeEventListener('click', clic);
  S = null; cv = null; asp = null; piloto = null; terCv = null; root = null; zona = null; punteros.clear(); pinch = null;
}
export const _depurar = () => ({ S, cam, asp, piloto });   // solo para pruebas

const limpiarCfg = c => ({
  n: M.TAMANOS.includes(c.n) ? c.n : 3, mapa: c.mapa === 'azar' || Object.hasOwn(M.MAPAS, c.mapa) ? c.mapa : 'colinas', modo: c.modo === 'dos' ? 'dos' : 'cpu',
  nivel: Math.max(0, Math.min(2, Math.trunc(Number(c.nivel)) || 0)), tiempo: M.TIEMPOS.includes(c.tiempo) ? c.tiempo : 30, cajas: c.cajas !== false,
});
function guardar() {
  if (!S) return; const d = { s: M.guardable(S) }, r = resumen(d); api.guardar(d, r.texto, r.fin);
}

/* ---------- pantalla de ajustes ---------- */
function ajustes() {
  cancelAnimationFrame(raf); raf = 0; cv = null; zona = null; S = null; piloto = null; cargando = false; Object.keys(teclas).forEach(k => teclas[k] = false);
  const hay = api.cargar(), sigue = hay && hay.s.ganador === null;
  const seg = (k, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${cfg[k] === v ? 'on' : ''}" data-cfg="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const fila = (t, k, ops) => `<div class="bar"><span class="lbl">${t}</span>${seg(k, ops)}</div>`;
  root.innerHTML = `<p class="note">Worms: dos ejércitos de gusanos se turnan para disparar, balancearse con la cuerda ninja y volar el terreno por los aires. Gana el último equipo en pie.</p>
    ${fila('Modo', 'modo', [['cpu', '🤖 Contra la CPU'], ['dos', '👥 2 jugadores']])}
    ${cfg.modo === 'cpu' ? fila('Nivel', 'nivel', M.NIVELES.map((n, i) => [i, n])) : ''}
    ${fila('Gusanos por equipo', 'n', M.TAMANOS.map(n => [n, String(n)]))}
    <p class="note" style="margin:-6px 0 0">${cfg.n} contra ${cfg.n}: ${cfg.n * 2} gusanos en el campo</p>
    ${fila('Mapa', 'mapa', [...Object.entries(M.MAPAS), ['azar', '🎲 Al azar']])}
    ${fila('Tiempo por turno', 'tiempo', M.TIEMPOS.map(t => [t, t + ' s']))}
    ${fila('Cajas de suministros', 'cajas', [[true, '📦 Sí'], [false, 'No']])}
    <div class="bar">${sigue ? '<button class="btn on" data-ac="seguir">▶️ Continuar partida</button>' : ''}<button class="btn ${sigue ? '' : 'on'}" data-ac="nueva">🪱 Nueva partida</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>`;
}

function nuevaPartida() {
  api.setPref('cfg', cfg);
  if (asp) asp.sortear();
  const mapa = cfg.mapa === 'azar' ? Object.keys(M.MAPAS)[Math.random() * 4 | 0] : cfg.mapa;
  S = M.crear({ ...cfg, mapa });
  api.borrar(); finMostrado = false; empezar();
}

/* ---------- partida ---------- */
function empezar() {
  const cpu = S.eq[1].cpu; piloto = cpu ? crearPiloto(S, S.cfg.nivel) : null;
  anims = []; parts = []; shake = 0; ultExp = null; hudAnt = ''; panelAnt = ''; ticAnt = new Map(); finMostrado = false; bannerT = 0; cargando = false; pausa = false;
  armar(); construirTerreno();
  const w = M.activo(S); if (w) { cam.x = w.x; cam.y = w.y - 40; cam.libre = false; }
  vistaW = Math.min(vistaW, S.W); if (vistaW < ZOOM_MIN) vistaW = Math.min(430, S.W);
  dibujar(); tPrev = performance.now(); raf = requestAnimationFrame(frame);
}
function armar() {
  root.innerHTML = `<div class="wmfondo wmjuego" id="wmJ">
    <div class="wmhud" id="wmHud"></div>
    <div class="wmzona" id="wmZona"><canvas id="wmCv" aria-label="Campo de batalla"></canvas><div class="wmban" id="wmBan" aria-live="polite"></div><div class="wmcpu" id="wmCpu" hidden>🤖 La CPU está jugando…</div><div class="wmpausa" id="wmPausa" hidden data-ac="seguirpausa"><b>⏸️ Pausa</b><small>Toca para seguir</small></div><div class="wmfin" id="wmFin" hidden></div></div>
    <div class="wmpanel" id="wmPanel">
      <div class="wmfila">
        <button class="btn wmarma" id="wmArma" data-ac="armas" aria-label="Elegir arma"></button>
        <button class="btn" id="wmTemp" data-ac="temp" aria-label="Tiempo de la mecha" hidden></button>
        <button class="btn wmz" data-ac="zmenos" aria-label="Alejar">➖</button><button class="btn wmz" data-ac="zmas" aria-label="Acercar">➕</button><button class="btn wmz" data-ac="centrar" aria-label="Centrar en mi gusano">🎯</button>
      </div>
      <div class="wmmandos">
        <div class="wmpad">
          <button class="btn wmb" data-hold="izq" aria-label="Izquierda">◀</button><button class="btn wmb" data-hold="der" aria-label="Derecha">▶</button>
          <button class="btn wmb" data-ac="salto" aria-label="Saltar hacia delante">⤴️</button><button class="btn wmb" data-ac="alto" aria-label="Saltar hacia arriba">⤒</button>
        </div>
        <div class="wmpad2">
          <button class="btn wmb" data-hold="arr" aria-label="Apuntar arriba o acortar cuerda">▲</button>
          <button class="btn wmb" data-hold="aba" aria-label="Apuntar abajo o alargar cuerda">▼</button>
          <button class="wmfuego" id="wmFuego" data-hold="fuego" aria-label="Disparar"><i id="wmPot"></i><span id="wmFTxt">FUEGO</span></button>
        </div>
      </div>
      <div class="bar wmbajo"><button class="btn" data-ac="pasar">⏭️ Pasar turno</button></div>${api.barraHtml()}
      <p class="note wmayuda">Teclado: ← → andar · ↑ ↓ apuntar · Intro salto · Retroceso salto alto (con ← → sale inclinado) · Espacio (mantén) fuego · Tab armas · +/− zoom · 1–9 armas</p>
    </div></div>`;
  cv = $('#wmCv'); ctx = cv.getContext('2d'); zona = $('#wmZona'); ajustar();
  zona.addEventListener('pointerdown', ptrAbajo); zona.addEventListener('pointermove', ptrMueve); zona.addEventListener('pointerup', ptrArriba); zona.addEventListener('pointercancel', ptrArriba);
  zona.addEventListener('wheel', e => { e.preventDefault(); zoomPor(e.deltaY > 0 ? 1.15 : 1 / 1.15); }, { passive: false });
  const holdIni = e => { const b = e.target.closest('[data-hold]'); if (!b || !root || !root.contains(b)) return; e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch { /* nada */ } hold(b.dataset.hold, true); };
  const holdFin = e => { const b = e.target.closest('[data-hold]'); if (b) hold(b.dataset.hold, false); };
  const panel = $('#wmPanel'); panel.addEventListener('pointerdown', holdIni); panel.addEventListener('pointerup', holdFin); panel.addEventListener('pointercancel', holdFin); panel.addEventListener('lostpointercapture', holdFin);
  panel.addEventListener('contextmenu', e => e.preventDefault());
}
function ajustar() {
  if (!zona || !cv) return;
  cw = Math.max(240, zona.clientWidth || 360); ch = Math.round(Math.min(Math.max(cw * .8, 250), Math.max(250, innerHeight * .5)));
  dpr = Math.min(window.devicePixelRatio || 1, 2); cv.style.height = ch + 'px'; cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
}
const humano = () => !!(S && !pausa && !S.eq[S.turno.eq].cpu && (S.turno.fase === 'turno' || S.turno.fase === 'retirada'));
const escala = () => cw / vistaW;
function poner_pausa(v) {
  if (!S || S.turno.fase === 'fin') return; pausa = v; const p = $('#wmPausa'); if (p) p.hidden = !v;
  if (v) { cargando = false; S.turno.pot = 0; Object.keys(teclas).forEach(k => teclas[k] = false); S.turno.bal = 0; S.turno.reel = 0; }
}

/* ---------- bucle ---------- */
function frame(t) {
  raf = requestAnimationFrame(frame);
  if (!S || !cv) return;
  const dt = Math.min((t - tPrev) / 1000, .05); tPrev = t;
  if (!pausa) {
    entrada(dt);
    if (piloto && S.eq[S.turno.eq].cpu) piloto.tick(dt);
    M.paso(S, dt);
  }
  procesar(dt); camara(dt); dibujar(t / 1000); interfaz();
  if (S.guardarPendiente) { S.guardarPendiente = false; guardar(); }
  if (S.turno.fase === 'fin' && !finMostrado) final();
}

/* ---------- entrada ---------- */
function hold(k, v) {
  if (!S) return;
  if (k === 'fuego') {
    if (v) { if (!humano()) return; const A = M.ARMAS[S.turno.arma]; if (A.tipo === 'carga' && M.puedeDisparar(S)) { cargando = true; S.turno.pot = 0; } return; }
    soltarFuego(); return;
  }
  teclas[k] = v;
}
function soltarFuego() {
  if (!S) return; const T = S.turno, A = M.ARMAS[T.arma];
  if (!humano()) { cargando = false; T.pot = 0; return; }
  if (A.tipo === 'carga') { if (cargando) { cargando = false; if (!M.disparar(S, Math.max(.06, T.pot))) api.sonido('error'); T.pot = 0; } return; }
  cargando = false;
  if (!M.puedeDisparar(S)) { api.sonido('error'); if (A.tipo === 'objetivo' && !T.obj) api.aviso('Toca el mapa para elegir el punto'); return; }
  M.disparar(S);
}
function entrada(dt) {
  if (!humano()) { M.balancear(S, 0); M.recoger(S, 0); return; }
  const w = M.activo(S), T = S.turno; if (!w || !w.vivo) return;
  if (w.est === 'cuerda') {
    M.balancear(S, (teclas.der ? 1 : 0) - (teclas.izq ? 1 : 0)); M.recoger(S, (teclas.aba ? 1 : 0) - (teclas.arr ? 1 : 0));
    if (teclas.izq !== teclas.der) M.dirigir(S, teclas.der ? 1 : -1);
  } else {
    M.balancear(S, 0); M.recoger(S, 0);
    if (w.vuela && w.est === 'salto' && teclas.izq !== teclas.der) M.impulsar(S, teclas.der ? 1 : -1, dt);
    if (teclas.izq !== teclas.der) { M.caminar(S, teclas.der ? 1 : -1, dt); cam.libre = false; }
    else if (w.est === 'camina') w.est = 'quieto';
    if (teclas.arr !== teclas.aba) M.apuntar(S, ((teclas.arr ? 1 : 0) - (teclas.aba ? 1 : 0)) * 55 * dt);
  }
  if (cargando) { T.pot = Math.min(1, T.pot + dt * .85); if (T.pot >= 1) soltarFuego(); }
}
const MAPA_TECLAS = { ArrowLeft: 'izq', ArrowRight: 'der', ArrowUp: 'arr', ArrowDown: 'aba', a: 'izq', d: 'der', w: 'arr', s: 'aba' };
function teclaAbajo(e) {
  if (!S || !cv || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('.modal')) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (MAPA_TECLAS[k]) { e.preventDefault(); teclas[MAPA_TECLAS[k]] = true; return; }
  if (k === ' ' || k === 'Spacebar') { e.preventDefault(); if (!e.repeat) hold('fuego', true); return; }
  if (k === 'Enter') { e.preventDefault(); if (humano()) M.saltar(S, 'adelante'); return; }
  if (k === 'Backspace') { e.preventDefault(); if (humano()) M.saltar(S, 'alto', (teclas.der ? 1 : 0) - (teclas.izq ? 1 : 0)); return; }
  if (k === 'Tab') { e.preventDefault(); armas(); return; }
  if (k === '+' || k === '=') { zoomPor(1 / 1.2); return; }
  if (k === '-') { zoomPor(1.2); return; }
  if (k === '0' || k === 'c') { cam.libre = false; return; }
  if (k === 'p' || k === 'Escape') { poner_pausa(!pausa); return; }
  if (/^[1-9]$/.test(k) && humano()) { const id = M.ORDEN[+k - 1]; if (id && M.elegirArma(S, id)) api.sonido('click'); else api.sonido('error'); }
}
function teclaArriba(e) {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (MAPA_TECLAS[k]) teclas[MAPA_TECLAS[k]] = false;
  else if (k === ' ' || k === 'Spacebar') hold('fuego', false);
}
function zoomPor(f) { vistaW = Math.max(ZOOM_MIN, Math.min(S ? S.W : 2000, vistaW * f)); }
function aMundo(e) { const r = cv.getBoundingClientRect(), k = escala(); return { x: (e.clientX - r.left - cw / 2) / k + cam.x, y: (e.clientY - r.top - ch / 2) / k + cam.y }; }
function ptrAbajo(e) {
  if (e.target.closest('.wmfin,.wmpausa')) return;
  try { zona.setPointerCapture(e.pointerId); } catch { /* nada */ }
  punteros.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now(), mov: false });
  if (punteros.size === 2) { const [a, b] = [...punteros.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), w: vistaW }; }
}
function ptrMueve(e) {
  const p = punteros.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (punteros.size >= 2 && pinch) { const [a, b] = [...punteros.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (d > 10) vistaW = Math.max(ZOOM_MIN, Math.min(S.W, pinch.w * pinch.d / d)); p.mov = true; return; }
  if (!p.mov && Math.hypot(p.x - p.x0, p.y - p.y0) > 9) p.mov = true;
  if (p.mov) { cam.libre = true; const k = escala(); cam.x -= dx / k; cam.y -= dy / k; }
}
function ptrArriba(e) {
  const p = punteros.get(e.pointerId); punteros.delete(e.pointerId); if (punteros.size < 2) pinch = null;
  if (!p || p.mov || !S || performance.now() - p.t > 600) return;
  const w = aMundo(e);
  if (humano() && M.ARMAS[S.turno.arma].tipo === 'objetivo' && M.fijarObjetivo(S, w.x, w.y)) api.sonido('click');
}

/* ---------- clics de la interfaz ---------- */
function clic(e) {
  const b = e.target.closest('[data-cfg],[data-ac]'); if (!b || !root.contains(b)) return;
  if (b.dataset.cfg) { const k = b.dataset.cfg, v = b.dataset.v; cfg[k] = k === 'cajas' ? v === 'true' : (k === 'mapa' || k === 'modo') ? v : +v; api.sonido('click'); if (!S) ajustes(); return; }
  const ac = b.dataset.ac;
  if (ac === 'nueva') nuevaPartida();
  else if (ac === 'seguir') { const g = api.cargar(); if (g) { S = M.restaurar(g.s); empezar(); } }
  else if (ac === 'aspecto') asp.abrir();
  else if (ac === 'reglas') reglas();
  else if (ac === 'armas') armas();
  else if (ac === 'salto') { if (humano() && !M.saltar(S, 'adelante')) api.sonido('error'); }
  else if (ac === 'alto') { if (humano() && !M.saltar(S, 'alto', (teclas.der ? 1 : 0) - (teclas.izq ? 1 : 0))) api.sonido('error'); }
  else if (ac === 'zmas') zoomPor(1 / 1.25);
  else if (ac === 'zmenos') zoomPor(1.25);
  else if (ac === 'centrar') cam.libre = false;
  else if (ac === 'temp') { if (humano()) { M.ajustarTemp(S, S.turno.temp % 5 + 1); api.sonido('click'); } }
  else if (ac === 'seguirpausa') poner_pausa(false);
  else if (ac === 'pasar') { if (humano()) { M.terminarTurno(S); api.sonido('click'); } else api.aviso('Espera a tu turno'); }
  else if (ac === 'nuevaJ') { if (!S || S.turno.fase === 'fin' || api.confirmar('¿Dejar la partida actual y crear otra?')) ajustes(); }
  else if (ac === 'aspectoJ') { poner_pausa(true); asp.abrir(); }
  else if (ac === 'salir') { if (!S || S.turno.fase === 'fin' || api.confirmar('¿Salir? La partida queda guardada.')) { guardar(); location.hash = '#/cat/arcade'; } }
  else if (ac === 'otra') nuevaPartida();
  else if (ac === 'menu') ajustes();
}
function armas() {
  if (!S || !humano()) { if (S && S.turno.fase !== 'fin') api.aviso('Espera a tu turno'); return; }
  const T = S.turno, m = api.modal('🎒 Armas', `<div class="wmarmas">${M.ORDEN.map((id, i) => {
    const A = M.ARMAS[id], n = M.municion(S, T.eq, id), off = n <= 0 || (T.usado && A.tipo !== 'cuerda');
    return `<button class="wmar ${T.arma === id ? 'on' : ''}" data-arma="${id}" ${off ? 'disabled' : ''}><img src="${urlIcono(A.icono)}" alt=""><b>${i + 1}. ${A.nombre}</b><i>${n === Infinity ? '∞' : '×' + n}</i><small>${A.desc}</small></button>`;
  }).join('')}</div>`);
  m.cuerpo.addEventListener('click', e => { const b = e.target.closest('[data-arma]'); if (!b || b.disabled) return; if (humano() && M.elegirArma(S, b.dataset.arma)) { api.sonido('click'); panelAnt = ''; } m.cerrar(); });
}
function reglas() {
  api.modal('Cómo se juega', `<p>Dos equipos de gusanos se turnan. En cada turno juega un gusano: muévelo, apunta y dispara. Gana el equipo que deje sin gusanos al otro.</p>
  <p><b>Moverse:</b> ◀ ▶ andar (sube cuestas y baja pendientes), ⤴️ salto hacia delante y ⤒ salto alto (recto hacia arriba; si mantienes ◀ o ▶ sale inclinado). En el aire, ◀ ▶ te empujan hacia un lado. Caer de muy alto hace daño y el agua o el borde del mapa matan.</p>
  <p><b>Disparar:</b> ▲ ▼ mueven la mira. En <i>Lanzamisiles</i> y las granadas mantén FUEGO para dar potencia y suéltalo. Las granadas rebotan y explotan a los segundos que elijas con ⏱. El viento (arriba) empuja los misiles.</p>
  <p><b>Armas:</b> Escopeta (2 disparos), Lanzamisiles, Granada Explosiva, de Racimo (5 bombitas) y Sagrada (enorme), Dinamita (5 s), Ataque Aéreo y Teletransporte (toca el mapa y pulsa ¡YA!; hay pocos).</p>
  <p><b>Cuerda Ninja:</b> lánzala hacia arriba para engancharte al terreno (las rocas flotantes sirven). ◀ ▶ te balancean, ▲ ▼ la acortan o alargan, ⤴️ te suelta y FUEGO la vuelve a lanzar.</p>
  <p><b>Después de atacar</b> tienes unos segundos para ponerte a salvo. Los gusanos muertos dejan una <b>tumba</b> (también se destruye). Las <b>cajas</b> que caen con paracaídas dan vida o armas. Tras unas rondas <b>sube el agua</b>.</p>
  <p>Arrastra el mapa con el dedo para mirar; con dos dedos (o ➖ ➕) haces zoom; 🎯 vuelve a tu gusano.</p>`);
}

/* ---------- efectos ---------- */
function procesar(dt) {
  for (const f of S.fx.splice(0)) {
    if (f.t === 'expl') {
      if (terCv) { const c = terCv.getContext('2d'); c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(f.x, f.y, f.r + .5, 0, 7); c.fill(); c.globalCompositeOperation = 'source-atop'; const g = c.createRadialGradient(f.x, f.y, Math.max(1, f.r - 1), f.x, f.y, f.r + 9); g.addColorStop(0, 'rgba(24,14,8,.7)'); g.addColorStop(1, 'rgba(24,14,8,0)'); c.fillStyle = g; c.beginPath(); c.arc(f.x, f.y, f.r + 9, 0, 7); c.fill(); c.restore(); }
      anims.push({ k: 'expl', x: f.x, y: f.y, r: f.r, c: f.k, t: 0, dur: f.r > 40 ? .8 : .55 });
      const pal = paleta(), n = Math.min(26, 6 + f.r / 2.2 | 0);
      for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 90 + Math.random() * (140 + f.r * 4); parts.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 70, t: 0, dur: .8 + Math.random() * .8, g: 700, r: 1.5 + Math.random() * 2.5, c: `rgb(${pal.mid[0]},${pal.mid[1]},${pal.mid[2]})` }); }
      for (let i = 0; i < 4 + f.r / 12; i++) anims.push({ k: 'humo', x: f.x + (Math.random() - .5) * f.r, y: f.y + (Math.random() - .5) * f.r * .6, r: f.r * (.25 + Math.random() * .3), t: -Math.random() * .15, dur: 1 + Math.random() * .6 });
      anims.push({ k: 'flash', x: f.x, y: f.y, r: f.r, t: 0, dur: .2 });
      const nd = Math.min(14, 4 + f.r / 5 | 0), nb = Math.min(24, 6 + f.r / 3 | 0), tierra = `rgb(${Math.max(0, pal.mid[0] - 40)},${Math.max(0, pal.mid[1] - 40)},${Math.max(0, pal.mid[2] - 40)})`;
      for (let i = 0; i < nd; i++) { const a = -Math.PI / 2 + (Math.random() - .5) * 2.4, v = 120 + Math.random() * (120 + f.r * 3); parts.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, dur: 1 + Math.random() * .9, g: 650, r: 3 + Math.random() * 4, c: i % 3 ? tierra : `rgb(${pal.mid[0]},${pal.mid[1]},${pal.mid[2]})`, rot: Math.random() * 6, vr: (Math.random() - .5) * 14, rastro: true }); }
      for (let i = 0; i < nb; i++) { const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * (110 + f.r * 2.5); parts.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 90, t: 0, dur: .6 + Math.random() * .8, g: 380, r: 1.3 + Math.random() * 1.8, c: Math.random() < .5 ? '#ffd166' : '#ff8a3d', brasa: true }); }
      anims.push({ k: 'polvo', x: f.x, y: f.y + f.r * .3, r: f.r, t: 0, dur: 1.1 });
      shake = Math.max(shake, Math.min(9, f.r / 6)); ultExp = { x: f.x, y: f.y, t: S.reloj };
      if (f.r >= 30) api.vibrar(f.r >= 55 ? [40, 30, 40] : 25);
    } else if (f.t === 'dano') anims.push({ k: 'txt', x: f.x, y: f.y, txt: '-' + f.n, c: f.n >= 40 ? '#ff4d4d' : '#ffffff', t: 0, dur: 1.3 });
    else if (f.t === 'texto') anims.push({ k: 'txt', x: f.x, y: f.y, txt: f.txt, c: f.c || '#fff', t: 0, dur: 1.6 });
    else if (f.t === 'splash') { for (let i = 0; i < 12; i++) parts.push({ x: f.x + (Math.random() - .5) * 14, y: f.y, vx: (Math.random() - .5) * 120, vy: -120 - Math.random() * 200, t: 0, dur: .9, g: 700, r: 2 + Math.random() * 2, c: paleta().agua[1] }); }
    else if (f.t === 'humo') for (let i = 0; i < (f.n || 5); i++) anims.push({ k: 'humo', x: f.x + (Math.random() - .5) * 14, y: f.y, r: 7 + Math.random() * 6, t: -Math.random() * .2, dur: 1.2 });
    else if (f.t === 'tele') anims.push({ k: 'tele', x: f.x, y: f.y, t: 0, dur: .9 });
    else if (f.t === 'traza') anims.push({ k: 'traza', x: f.x, y: f.y, x2: f.x2, y2: f.y2, t: 0, dur: .22 });
    else if (f.t === 'fogonazo') anims.push({ k: 'fogonazo', x: f.x, y: f.y, t: 0, dur: .12 });
    else if (f.t === 'gancho') anims.push({ k: 'gancho', x: f.x, y: f.y, ax: f.ax, ay: f.ay, fallo: !!f.fallo, t: 0, dur: f.fallo ? .3 : .14 });
    else if (f.t === 'chispa') for (let i = 0; i < (f.n || 5); i++) parts.push({ x: f.x, y: f.y, vx: (Math.random() - .5) * 160, vy: -Math.random() * 140, t: 0, dur: .5, g: 600, r: 1.6, c: f.c || '#fc3' });
    else if (f.t === 'aviso') { const b = $('#wmBan'); if (b) { b.textContent = f.txt; b.classList.add('on'); bannerT = 1.6; } }
  }
  for (const s of S.snd.splice(0)) api.sonido(s);
  // mechas: un «tic» cada segundo que cae
  for (const p of S.proy) if (p.t > 0 && (p.k === 'granada' || p.k === 'racimo' || p.k === 'sagrada' || p.k === 'dinamita')) { const n = Math.ceil(p.t), ant = ticAnt.get(p); if (ant !== undefined && n !== ant) api.sonido('tic'); ticAnt.set(p, n); }
  if (ticAnt.size > 30) ticAnt = new Map();
  for (const a of anims) a.t += dt; anims = anims.filter(a => a.t < a.dur);
  for (const p of parts) { p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.rot !== undefined) p.rot += p.vr * dt; if (p.rastro && anims.length < 140 && Math.random() < dt * 16) anims.push({ k: 'humo', x: p.x, y: p.y, r: 2.5 + Math.random() * 2, t: 0, dur: .6, claro: true }); }
  parts = parts.filter(p => p.t < p.dur); if (parts.length > 420) parts.splice(0, parts.length - 420);
  shake = Math.max(0, shake - dt * 22);
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) { const b = $('#wmBan'); if (b) b.classList.remove('on'); } }
}

/* ---------- cámara ---------- */
function foco() {
  const T = S.turno, w = M.activo(S);
  if (S.proy.length) { const p = S.proy.find(q => q.k !== 'minibomba') || S.proy[0]; return { x: p.x, y: p.y, rapido: true }; }
  if (S.aviones.length && !humano()) return { x: S.aviones[0].tx, y: 200 };
  if (ultExp && S.reloj - ultExp.t < 1.1) return { x: ultExp.x, y: ultExp.y };
  if (T.fase === 'resolver') { const v = S.gus.find(g => g.vivo && (g.vuela || g.est === 'cuerda')); if (v) return { x: v.x, y: v.y - 10 }; }
  return w ? { x: w.x, y: w.y - 30 } : { x: S.W / 2, y: S.H / 2 };
}
function camara(dt) {
  if (S.turno.fase === 'cambio' && S.turno.t > 1.3) cam.libre = false;
  if (!cam.libre) { const f = foco(), k = Math.min(1, dt * (f.rapido ? 9 : 4.5)); cam.x += (f.x - cam.x) * k; cam.y += (f.y - cam.y) * k; }
  const k = escala(), vw = cw / k, vh = ch / k;
  cam.x = vw >= S.W ? S.W / 2 : Math.max(vw / 2, Math.min(S.W - vw / 2, cam.x));
  const top = -240, bot = S.H + 8; cam.y = vh >= bot - top ? (top + bot) / 2 : Math.max(top + vh / 2, Math.min(bot - vh / 2, cam.y));
}

/* ---------- terreno ---------- */
function construirTerreno() {
  if (!S) return; const W = S.W, H = S.H, m = S.mask, pal = paleta(), tex = asp ? estilo(asp.valores).tex : null;
  terCv = document.createElement('canvas'); terCv.width = W; terCv.height = H;
  const c = terCv.getContext('2d'), img = c.createImageData(W, H), d = img.data, prof = new Int16Array(W);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!m[i]) { prof[x] = 0; continue; }
    const p = prof[x]++, ruido = ((Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0) % 15 - 7;
    let r, g, b;
    if (p < 2) [r, g, b] = pal.tope; else if (p < 7) { const t = (p - 2) / 5; r = pal.top[0] + (pal.mid[0] - pal.top[0]) * t * .5; g = pal.top[1] + (pal.mid[1] - pal.top[1]) * t * .5; b = pal.top[2] + (pal.mid[2] - pal.top[2]) * t * .5; }
    else { const t = Math.min(1, (p - 7) / 240); r = pal.mid[0] + (pal.deep[0] - pal.mid[0]) * t; g = pal.mid[1] + (pal.deep[1] - pal.mid[1]) * t; b = pal.mid[2] + (pal.deep[2] - pal.mid[2]) * t; }
    const borde = x === 0 || x === W - 1 || !m[i - 1] || !m[i + 1] || (y > 0 && !m[i - W]) || (y < H - 1 && !m[i + W]);
    if (tex) { const q = 1 + pixelTextura(tex, x, y); r *= q; g *= q; b *= q; }
    const f = borde ? .52 : 1, o = i * 4;
    d[o] = Math.max(0, Math.min(255, (r + ruido) * f)); d[o + 1] = Math.max(0, Math.min(255, (g + ruido) * f)); d[o + 2] = Math.max(0, Math.min(255, (b + ruido) * f)); d[o + 3] = 255;
  }
  c.putImageData(img, 0, 0);
}

/* ---------- dibujo ---------- */
const FUENTE_EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
function fondo() {
  const esc_ = asp && asp.valores.esc, im = esc_ && imagenTapete(esc_, () => { if (S) dibujar(); });
  if (!im) { const g = ctx.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, '#8ecbff'); g.addColorStop(1, '#e8f6ff'); ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch); return; }
  const k = Math.max(cw / im.naturalWidth, ch / im.naturalHeight) * 1.18, iw = im.naturalWidth * k, ih = im.naturalHeight * k;
  const fx = S ? Math.max(0, Math.min(1, cam.x / S.W)) : .5, fy = S ? Math.max(0, Math.min(1, (cam.y + 240) / (S.H + 248))) : .5;
  ctx.drawImage(im, -(iw - cw) * fx, -(ih - ch) * fy, iw, ih);
}
const spr = (n, x, y, w, ang = 0, vuelta = false) => { const im = ico(n); if (!im) return false; const h = w * im.naturalHeight / im.naturalWidth; ctx.save(); ctx.translate(x, y); if (ang) ctx.rotate(ang); if (vuelta) ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); return true; };
const colEq = e => M.COLORES[e];
function avatar(eq) { const id = asp && asp.valores[eq ? 'pj2' : 'pj']; return id && id !== 'auto' && FICHAS[id] ? FICHAS[id].e : null; }

function dibujarGusano(w, t, esAct) {
  if (!w.vivo) return;
  const emo = avatar(w.eq), col = colEq(w.eq), muriendo = w.hp <= 0;
  ctx.save(); ctx.translate(w.x, w.y);
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 2.6, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -.5, 8.5, 3, 0, 0, 7); ctx.stroke();
  const rebote = w.est === 'camina' ? -Math.abs(Math.sin(t * 15)) * 1.6 : 0, inc = w.vuela || w.est === 'cuerda' ? Math.max(-.5, Math.min(.5, w.vx / 500)) : 0;
  ctx.translate(0, rebote); ctx.rotate(inc);
  if (emo) { ctx.save(); ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -11, 12.5, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#000'; ctx.font = `20px ${FUENTE_EMOJI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.scale(w.dir, 1); if (muriendo) ctx.globalAlpha = .7; ctx.fillText(emo, 0, -10.5); ctx.restore(); }
  else {
    ctx.scale(w.dir, 1);
    const g = ctx.createLinearGradient(-6, -18, 6, -1); g.addColorStop(0, muriendo ? '#c9c9c9' : '#FFB3C8'); g.addColorStop(1, muriendo ? '#8d8d8d' : '#F0789B');
    ctx.fillStyle = g; ctx.strokeStyle = muriendo ? '#555' : '#A33D63'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-5.5, -1); ctx.quadraticCurveTo(-7.5, -9, -4, -15); ctx.quadraticCurveTo(0, -19.5, 4.5, -15); ctx.quadraticCurveTo(7.5, -9, 5.5, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(163,61,99,.5)'; ctx.lineWidth = .9; for (const yy of [-4, -7.5]) { ctx.beginPath(); ctx.moveTo(-5.4, yy); ctx.quadraticCurveTo(0, yy + 2, 5.4, yy); ctx.stroke(); }
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-5, -14.2); ctx.quadraticCurveTo(0, -20.5, 5.2, -14.2); ctx.lineTo(5.6, -12.2); ctx.quadraticCurveTo(0, -17.5, -5.5, -12.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(1.2, -10.2, 2.7, 3.2, 0, 0, 7); ctx.ellipse(4.2, -10.2, 2.3, 2.9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(2.2, -10, 1.2, 0, 7); ctx.arc(4.9, -10, 1.1, 0, 7); ctx.fill();
    ctx.strokeStyle = '#7a2a48'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(3.2, -6.2, 1.6, .2, Math.PI - .2); ctx.stroke();
  }
  ctx.restore();
  // etiqueta con la vida
  ctx.save(); ctx.translate(w.x, w.y - 28); ctx.font = 'bold 9px Nunito,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const txt = String(Math.max(0, Math.ceil(w.hp))), tw = ctx.measureText(txt).width + 8;
  ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.roundRect(-tw / 2, -6, tw, 12, 6); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillText(txt, 0, .5);
  if (esAct) { const nom = w.nombre; const nw = ctx.measureText(nom).width + 10; ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.beginPath(); ctx.roundRect(-nw / 2, -20, nw, 12, 6); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(nom, 0, -13.5);
    ctx.fillStyle = '#FFD23F'; ctx.strokeStyle = '#7a5a00'; ctx.lineWidth = 1; const b = Math.sin(t * 6) * 2.5; ctx.beginPath(); ctx.moveTo(-5, -30 + b); ctx.lineTo(5, -30 + b); ctx.lineTo(0, -23 + b); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}
function dibujarCaja(c) {
  ctx.save(); ctx.translate(c.x, c.y);
  if (c.cae && c.paracaidas !== false && c.y < S.H) { ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, -26, 17, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-17, -26); ctx.lineTo(-6, -14); ctx.moveTo(17, -26); ctx.lineTo(6, -14); ctx.moveTo(0, -43); ctx.lineTo(0, -14); ctx.stroke(); }
  const salud = c.tipo === 'salud'; ctx.fillStyle = salud ? '#fff' : '#C98B3C'; ctx.strokeStyle = salud ? '#999' : '#6b4416'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.roundRect(-8, -14, 16, 14, 2); ctx.fill(); ctx.stroke();
  if (salud) { ctx.fillStyle = '#E5484D'; ctx.fillRect(-1.6, -12, 3.2, 10); ctx.fillRect(-5, -8.6, 10, 3.2); } else { ctx.strokeStyle = '#6b4416'; ctx.beginPath(); ctx.moveTo(-8, -14); ctx.lineTo(8, 0); ctx.moveTo(8, -14); ctx.lineTo(-8, 0); ctx.stroke(); ctx.fillStyle = '#FFD23F'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('★', 0, -4); }
  ctx.restore();
}
function numeroSobre(txt, x, y, tam) { ctx.font = `bold ${tam}px Nunito,sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2.4; ctx.strokeText(txt, x, y); ctx.fillText(txt, x, y); }
function dibujarProy(p, t) {
  const k = p.k;
  if (k === 'misil') { spr('misil1', p.x, p.y, 30, p.ang - Math.PI / 4); const L = 18; ctx.fillStyle = 'rgba(255,200,80,.6)'; ctx.beginPath(); ctx.arc(p.x - Math.cos(p.ang) * L, p.y - Math.sin(p.ang) * L, 3 + Math.random() * 2, 0, 7); ctx.fill(); }
  else if (k === 'granada') spr('granada-explosiva', p.x, p.y, 20, p.rot || 0);
  else if (k === 'racimo') spr('granada-racimo', p.x, p.y, 17, p.rot || 0);
  else if (k === 'sagrada') spr('granada-sagrada', p.x, p.y, 22, p.rot || 0);
  else if (k === 'dinamita') { spr('dinamita', p.x, p.y - 6, 26); ctx.fillStyle = '#FFD23F'; ctx.beginPath(); ctx.arc(p.x - 9, p.y - 14 + Math.sin(t * 40), 2 + Math.random() * 1.5, 0, 7); ctx.fill(); numeroSobre(String(Math.ceil(Math.max(0, p.t))), p.x, p.y - 22, 10); }
  else if (k === 'bomba') spr('misil2', p.x, p.y, 20, p.ang - Math.PI / 2);
  else if (k === 'minibomba') spr('misil2', p.x, p.y, 10, p.ang - Math.PI / 2);
  if ((k === 'granada' || k === 'racimo' || k === 'sagrada') && p.t > 0) numeroSobre(String(Math.ceil(p.t)), p.x, p.y - 14, 9);
}
function dibujarAnims() {
  for (const a of anims) {
    const p = Math.max(0, a.t / a.dur); if (a.t < 0) continue;
    if (a.k === 'expl') {
      const nombre = a.c === 'racimo' || a.c === 'bomba' ? 'explosion2' : a.c === 'minibomba' || a.c === 'escopeta' || a.c === 'ultimo' ? 'explosion3' : 'explosion1', tam = (a.c === 'sagrada' ? 2.9 : 2.5) * a.r * (.55 + p * .55);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; { const R = a.r * (.75 + p * .85), al = Math.max(0, 1 - p * 1.15), g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, R); g.addColorStop(0, `rgba(255,255,235,${al})`); g.addColorStop(.25, `rgba(255,214,90,${al * .9})`); g.addColorStop(.6, `rgba(255,110,30,${al * .7})`); g.addColorStop(1, 'rgba(120,20,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(a.x, a.y, R, 0, 7); ctx.fill(); } ctx.restore();
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - p * p * 1.1);
      if (a.c === 'sagrada') { const g = ctx.createRadialGradient(a.x, a.y, 4, a.x, a.y, a.r * 2.4); g.addColorStop(0, 'rgba(255,245,170,.95)'); g.addColorStop(1, 'rgba(255,220,80,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(a.x, a.y, a.r * 2.4, 0, 7); ctx.fill(); }
      if (!spr(nombre, a.x, a.y, tam)) { ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(a.x, a.y, a.r * (.6 + p), 0, 7); ctx.fill(); }
      ctx.globalAlpha = Math.max(0, .8 - p); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(a.x, a.y, a.r * (.5 + p * 1.5), 0, 7); ctx.stroke(); ctx.restore();
    } else if (a.k === 'flash') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const R = a.r * 3.2, g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, R); g.addColorStop(0, `rgba(255,250,220,${.85 * (1 - p)})`); g.addColorStop(1, 'rgba(255,200,80,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(a.x, a.y, R, 0, 7); ctx.fill(); ctx.restore(); }
    else if (a.k === 'polvo') { ctx.save(); ctx.globalAlpha = Math.max(0, .55 * (1 - p)); ctx.strokeStyle = '#d9c7a3'; ctx.lineWidth = 6 * (1 - p) + 1; ctx.beginPath(); ctx.ellipse(a.x, a.y, a.r * (.6 + p * 1.7), a.r * (.18 + p * .3), 0, 0, 7); ctx.stroke(); ctx.restore(); }
    else if (a.k === 'humo') { ctx.save(); const R = a.r * (1 + p * 1.1), y = a.y - p * (a.claro ? 14 : 34); ctx.globalAlpha = Math.max(0, (a.claro ? .4 : .55) * (1 - p)); const g = ctx.createRadialGradient(a.x, y, 0, a.x, y, R); const c0 = a.claro ? '210,210,210' : (p < .3 ? '90,70,60' : '70,70,74'); g.addColorStop(0, `rgba(${c0},1)`); g.addColorStop(1, `rgba(${c0},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(a.x, y, R, 0, 7); ctx.fill(); ctx.restore(); }
    else if (a.k === 'txt') { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - Math.max(0, p - .6) / .4); ctx.font = 'bold 13px Nunito,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.fillStyle = a.c; const y = a.y - p * 34; ctx.strokeText(a.txt, a.x, y); ctx.fillText(a.txt, a.x, y); ctx.restore(); }
    else if (a.k === 'tele') { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - p); spr('teletransporte', a.x, a.y, 20 + p * 46, p * 8); ctx.restore(); }
    else if (a.k === 'traza') { ctx.save(); ctx.globalAlpha = 1 - p; ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x2, a.y2); ctx.stroke(); ctx.restore(); }
    else if (a.k === 'fogonazo') { ctx.save(); ctx.fillStyle = '#ffd966'; ctx.globalAlpha = 1 - p; ctx.beginPath(); ctx.arc(a.x, a.y, 7 * (1 - p * .4), 0, 7); ctx.fill(); ctx.restore(); }
    else if (a.k === 'gancho') { ctx.save(); ctx.globalAlpha = a.fallo ? 1 - p : 1; ctx.strokeStyle = '#d2a679'; ctx.lineWidth = 2; const q = a.fallo ? Math.min(1, p * 3) : Math.min(1, p * 1.2); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + (a.ax - a.x) * q, a.y + (a.ay - a.y) * q); ctx.stroke(); ctx.restore(); }
  }
  for (const q of parts) {
    ctx.globalAlpha = Math.max(0, 1 - q.t / q.dur);
    if (q.brasa) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * 1.6, 0, 7); ctx.globalAlpha *= .45; ctx.fill(); ctx.globalAlpha = Math.max(0, 1 - q.t / q.dur); ctx.beginPath(); ctx.arc(q.x, q.y, q.r * .8, 0, 7); ctx.fill(); ctx.restore(); }
    else if (q.rot !== undefined) { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillStyle = q.c; ctx.fillRect(-q.r, -q.r * .6, q.r * 2, q.r * 1.2); ctx.restore(); }
    else { ctx.fillStyle = q.c; ctx.fillRect(q.x - q.r / 2, q.y - q.r / 2, q.r, q.r); }
  } ctx.globalAlpha = 1;
}
function dibujarAgua(t, x0, x1) {
  const pal = paleta().agua, y = S.agua, ola = x => y + Math.sin(x * .045 + t * 2.2) * 2.6 + Math.sin(x * .021 - t * 1.3) * 2;
  ctx.fillStyle = pal[0]; ctx.beginPath(); ctx.moveTo(x0 - 20, S.H + 200);
  for (let x = x0 - 20; x <= x1 + 20; x += 10) ctx.lineTo(x, ola(x));
  ctx.lineTo(x1 + 20, S.H + 200); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = pal[1]; ctx.lineWidth = 1.6; ctx.beginPath(); for (let x = x0 - 20; x <= x1 + 20; x += 10) { x === x0 - 20 ? ctx.moveTo(x, ola(x)) : ctx.lineTo(x, ola(x)); } ctx.stroke();
}
function dibujar(t = performance.now() / 1000) {
  if (!cv || !S || !ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cw, ch); fondo();
  const k = escala(), sx = shake ? (Math.random() - .5) * shake : 0, sy = shake ? (Math.random() - .5) * shake : 0;
  ctx.save(); ctx.translate(cw / 2 - cam.x * k + sx, ch / 2 - cam.y * k + sy); ctx.scale(k, k);
  const x0 = cam.x - cw / 2 / k, x1 = cam.x + cw / 2 / k;
  if (terCv) ctx.drawImage(terCv, 0, 0);
  const T = S.turno, act = M.activo(S);
  for (const tb of S.tumbas) spr('tumba' + (tb.tipo + 1), tb.x, tb.y - 12, 26);
  for (const c of S.cajas) dibujarCaja(c);
  for (const w of S.gus) if (w !== act) dibujarGusano(w, t, false);
  for (const w of S.gus) if (w.vivo && w.est === 'cuerda' && w.cuerda) { ctx.strokeStyle = '#6b4416'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w.x, w.y - 10); ctx.lineTo(w.cuerda.ax, w.cuerda.ay); ctx.stroke(); ctx.strokeStyle = '#d9a46a'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.fillStyle = '#ddd'; ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(w.cuerda.ax, w.cuerda.ay, 3, 0, 7); ctx.fill(); ctx.stroke(); }
  if (act) dibujarGusano(act, t, T.fase === 'turno' || T.fase === 'retirada' || T.fase === 'cambio');
  for (const p of S.proy) dibujarProy(p, t);
  for (const a of S.aviones) { ctx.save(); ctx.translate(a.x, a.y); spr('ataque-aereo', 0, 0, 110, 0, a.dir > 0); ctx.restore(); }
  dibujarAnims();
  dibujarAgua(t, x0, x1);
  if (act && act.vivo && humano()) {
    const A = M.ARMAS[T.arma];
    if (T.obj && !T.usado) { const r = 14 + Math.sin(t * 8) * 3; ctx.save(); ctx.translate(T.obj.x, T.obj.y); ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.moveTo(-r - 6, 0); ctx.lineTo(r + 6, 0); ctx.moveTo(0, -r - 6); ctx.lineTo(0, r + 6); ctx.stroke(); if (T.arma === 'aereo') { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(-90, 0); ctx.lineTo(90, 0); ctx.stroke(); } ctx.restore(); }
    if (T.fase === 'turno' && !T.usado && !act.vuela && (A.tipo === 'carga' || A.tipo === 'rafaga' || A.tipo === 'cuerda')) {
      const d = M.dirApunte(act, T.ang), cx = act.x, cy = act.y - 10, L = 52;
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.setLineDash([2, 5]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx + d.x * 16, cy + d.y * 16); ctx.lineTo(cx + d.x * (L - 6), cy + d.y * (L - 6)); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#fff'; ctx.fillStyle = 'rgba(255,60,60,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx + d.x * L, cy + d.y * L, 5.2, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx + d.x * (L - 9), cy + d.y * (L - 9)); ctx.lineTo(cx + d.x * (L + 9), cy + d.y * (L + 9)); ctx.stroke();
      if (T.pot > 0) { for (let i = 0; i < 10; i++) { const f = (i + 1) / 10; if (f > T.pot + .02) break; ctx.fillStyle = `hsl(${120 - f * 120},90%,52%)`; ctx.beginPath(); ctx.arc(cx + d.x * (20 + f * 34), cy + d.y * (20 + f * 34), 1.8 + f * 2.2, 0, 7); ctx.fill(); } }
      ctx.restore();
    }
  }
  ctx.restore();
  const izq = cam.x - cw / 2 / k, der = cam.x + cw / 2 / k;   // fuera del mapa: velo oscuro
  if (izq < 0) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, Math.min(cw, -izq * k), ch); }
  if (der > S.W) { const a = Math.min(cw, (der - S.W) * k); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(cw - a, 0, a, ch); }
}

/* ---------- interfaz (HUD y panel) ---------- */
function interfaz() {
  if (!S) return; const T = S.turno, w = M.activo(S), cpu = S.eq[T.eq].cpu;
  const n = S.cfg.n * M.HP, barra = e => { const hp = M.hpEquipo(S, e), v = M.vivos(S, e).length; return `<div class="wmeq ${T.eq === e && T.fase !== 'fin' ? 'act' : ''}" style="--c:${M.COLORES[e]}"><b>${S.eq[e].cpu ? '🤖 CPU' : (e ? '🔵 ' : '🔴 ') + S.eq[e].nombre}</b><span class="wmbarra"><i style="width:${Math.round(hp / n * 100)}%"></i></span><small>${v} 🪱 · ${hp} ❤️</small></div>`; };
  const tiempo = T.fase === 'turno' ? Math.ceil(Math.max(0, T.t)) : T.fase === 'retirada' ? '🏃' + Math.ceil(Math.max(0, T.t)) : '·';
  const v = S.viento, wv = `<span class="wmviento" title="Viento"><i class="${v < 0 ? 'izq' : 'der'}" style="width:${Math.abs(v) * 5}%"></i><em></em></span>`;
  const h = `${barra(0)}<div class="wmcen"><div class="wmtime ${T.fase === 'turno' && T.t <= 5 ? 'ur' : ''}">${tiempo}</div><div class="wmv">💨 ${v === 0 ? '0' : (v < 0 ? '◀ ' + -v : v + ' ▶')}${wv}</div><small>Ronda ${S.ronda}</small></div>${barra(1)}`;
  if (h !== hudAnt) { hudAnt = h; $('#wmHud').innerHTML = h; }
  if (T.fase === 'cambio' && w && T.t > 0.1) { const b = $('#wmBan'); if (b && !b.classList.contains('on')) { b.innerHTML = `<b style="color:${M.COLORES[T.eq]}">${S.eq[T.eq].cpu ? '🤖 CPU' : S.eq[T.eq].nombre}</b> · ${esc(w.nombre)}`; b.classList.add('on'); bannerT = 1.3; } }
  const cp = $('#wmCpu'); if (cp) cp.hidden = !(cpu && T.fase !== 'fin' && !pausa);
  const A = M.ARMAS[T.arma], n_ = M.municion(S, T.eq, T.arma), h2 = !!w && humano(), usado = T.usado;
  const fuego = A.tipo === 'carga' ? 'MANTÉN<br>FUEGO' : A.tipo === 'rafaga' ? `FUEGO<br>${2 - T.disp}` : A.tipo === 'suelta' ? 'SOLTAR' : A.tipo === 'objetivo' ? (T.obj ? '¡YA!' : 'ELIGE<br>PUNTO') : (w && w.est === 'cuerda' ? 'OTRO<br>GANCHO' : 'LANZAR<br>CUERDA');
  const key = [T.arma, n_, T.temp, h2, usado, fuego, T.fase === 'fin', cpu, T.obj ? 1 : 0].join('|');
  if (key !== panelAnt) {
    panelAnt = key;
    $('#wmArma').innerHTML = `<img src="${urlIcono(A.icono)}" alt=""><span>${A.nombre}</span><i>${n_ === Infinity ? '∞' : '×' + n_}</i>`;
    const tb = $('#wmTemp'); tb.hidden = !A.temp; tb.textContent = `⏱${T.temp}`;
    $('#wmFTxt').innerHTML = fuego; $('#wmPanel').classList.toggle('off', !h2);
  }
  const pot = $('#wmPot'); if (pot) pot.style.height = Math.round((cargando ? T.pot : 0) * 100) + '%';
  const fb = $('#wmFuego'); if (fb) fb.classList.toggle('lista', h2 && M.puedeDisparar(S));
}

/* ---------- final ---------- */
function final() {
  finMostrado = true; cargando = false; guardar();
  const g = S.ganador, cpu = S.cfg.modo === 'cpu', variante = `${S.cfg.n} vs ${S.cfg.n} · ${M.MAPAS[S.cfg.mapa]}`;
  if (cpu) api.registrar({ res: g === -1 ? 'tablas' : g === 0 ? 'victoria' : 'derrota', variante: `${variante} · ${M.NIVELES[S.cfg.nivel]}`, tiempo: Math.round(S.reloj) });
  else { api.registrar({ res: g === -1 ? 'tablas' : 'partida', variante: `2 jugadores · ${variante}` }); if (g !== -1) api.victoria(); }
  api.sonido(g === 1 && cpu ? 'perder' : 'ganar'); if (!(g === 1 && cpu)) api.vibrar([60, 40, 60]);
  const quien = g === -1 ? 'Tablas' : cpu ? (g === 0 ? '¡Has ganado!' : 'Gana la CPU') : `¡Gana el equipo ${M.EQUIPOS[g]}!`;
  const vivosG = g >= 0 ? M.vivos(S, g).map(w => `<li>${esc(w.nombre)} · ${w.hp} ❤️</li>`).join('') : '';
  const f = $('#wmFin'); if (!f) return;
  f.innerHTML = `<div class="wmfintarj"><h2>${g === -1 ? '🤝' : '🏆'} ${quien}</h2><p>${S.turnos} turnos · ronda ${S.ronda} · ${Math.round(S.reloj / 60)} min</p>${vivosG ? `<ul class="wmsup">${vivosG}</ul>` : ''}<div class="bar"><button class="btn on" data-ac="otra">🪱 Otra partida</button><button class="btn" data-ac="menu">Ajustes</button></div></div>`;
  f.hidden = false;
}
