import { $, esc } from '../../core/dom.js';
import { grupoTablero, grupoFondo } from '../../core/aspectos.js';
import { crearTeclado } from '../../core/teclado.js';
import { CATEGORIAS } from './paneles.js';
import * as R from './motor.js';

const FILAS = ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM'];
const RUEDAS = {
  clasica: { nombre: 'Clásica', c: ['#FF4757', '#FFC21A', '#12B76A', '#2F6BFF', '#7A4DFF', '#FF7A1A'] },
  pastel: { nombre: 'Pastel', c: ['#FF8FA3', '#FFD166', '#7BDFF2', '#9EE6B8', '#CDB4DB', '#A0C4FF'] },
  neon: { nombre: 'Neón', c: ['#FF2E88', '#00C2E0', '#7FD400', '#FF9100', '#7C4DFF', '#00C853'] },
};
let S = null, api = null, asp = null, root = null, tk = null, timer = null, girando = false, reg = false, onKey = null, res = null, recien = new Set(), cv = null, dpr = 1;
// Vista 3D (Three.js) de la rueda: opcional, con vuelta automática a la rueda 2D si no hay WebGL
let V3 = null, modo3d = false, hay3d = false, forzar2d = false, tok3 = 0, claveRueda = '';
const quiere3D = () => hay3d && !forzar2d && !!asp && (asp.valores.vista || '2d') === '3d';
function cerrar3D() { tok3++; if (V3) { try { V3.destruir(); } catch { /* nada */ } V3 = null; } modo3d = false; claveRueda = ''; }
let cfg = { jug: [['Tú', 'h'], ['CPU 1', 'c'], ['CPU 2', 'c']], rondas: 4, nivel: 'medio' };

/* ---------- validación / resumen ---------- */
export function validar(d) { const s = d && R.validar(d.s); return s ? { s, reg: !!d.reg } : null; }
export const migrarV1 = d => d;
export function resumen(d) {
  const s = d.s;
  return s.fase === 'fin' ? { texto: `Ganó ${s.jug[s.ganador].nombre} · ${R.dinero(s.jug[s.ganador].total)}`, fin: true } : { texto: `Ronda ${s.ronda}/${s.rondas} · ${s.jug[s.turno].nombre}`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; girando = false; res = null; recien = new Set(); forzar2d = false; modo3d = false;
  try { hay3d = (await import('../../core/escena3d.js')).hayWebGL(); } catch { hay3d = false; }
  asp = api.aspecto([{ clave: 'vista', titulo: 'Vista de la ruleta', icono: '🧊', def: '2d', opciones: [{ id: '3d', nombre: '🧊 3D' }, { id: '2d', nombre: '🔲 2D clásica' }] }, grupoFondo('#rlJuego'), grupoTablero('Colores del panel'), { clave: 'ruleta', titulo: 'Colores de la ruleta', def: 'clasica', opciones: Object.entries(RUEDAS).map(([id, x]) => ({ id, nombre: x.nombre, sw: x.c.slice(0, 4) })) }], () => { if (S) { if (cv && modo3d !== quiere3D()) armar(); else { claveRueda = ''; dibujar(); } pintar(); } });
  await api.css(new URL('./ruleta.css', import.meta.url));
  const c0 = api.pref('cfg', null);
  if (c0 && R.RONDAS.includes(c0.rondas) && R.NIVEL[c0.nivel] && Array.isArray(c0.jug) && c0.jug.length === 3) cfg = { ...c0, jug: c0.jug.map(([n, t]) => [String(n).slice(0, 14), ['h', 'c', 'n'].includes(t) ? t : 'c']) };
  const g = api.cargar(); S = g ? g.s : null; reg = g ? g.reg : false;
  tk = crearTeclado({ filas: FILAS, borrar: true, alPulsar: tecla, titulo: 'Ruleta de la Suerte' });
  root.addEventListener('click', clic); root.addEventListener('input', alEscribir); root.addEventListener('keydown', teclaPanel);
  onKey = teclado; document.addEventListener('keydown', onKey);
  api.barra({ nueva: () => { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; clearTimeout(timer); empezar(); },
    salir: () => { clearTimeout(timer); api.borrar(); setup(); },
    pausar: () => clearTimeout(timer),
    reanudar: () => { if (S && S.fase !== 'fin' && !girando) bucle(); },
    config: { valores: () => ({ j0: cfg.jug[0][1], j1: cfg.jug[1][1], j2: cfg.jug[2][1], rondas: cfg.rondas, nivel: cfg.nivel }), grupos: v => [...[0, 1, 2].map(i => ({ clave: 'j' + i, titulo: `Jugador ${i + 1} · ${cfg.jug[i][0]}`, opciones: [['h', 'Persona'], ['c', 'CPU'], ['n', 'Nadie']] })), { clave: 'rondas', titulo: 'Rondas', opciones: R.RONDAS.map(k => [k, String(k)]) }, { clave: 'nivel', titulo: 'Nivel CPU', opciones: Object.entries(R.NIVEL).map(([k, x]) => [k, x.nombre]) }], aplicar: v => { if ([0, 1, 2].filter(i => v['j' + i] !== 'n').length < 1) { api.aviso('Elige al menos un jugador'); return; } [0, 1, 2].forEach(i => { cfg.jug[i][1] = v['j' + i]; }); cfg.rondas = v.rondas; cfg.nivel = v.nivel; empezar(); } } });
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Cómo se juega', accion: reglas }]);
  if (S) { armar(); pintar(); bucle(); } else setup();
}
export function unmount() {
  clearTimeout(timer); timer = null;
  document.removeEventListener('keydown', onKey);
  if (root) { root.removeEventListener('click', clic); root.removeEventListener('input', alEscribir); root.removeEventListener('keydown', teclaPanel); }
  if (tk) { tk.destruir(); tk = null; }
  cerrar3D(); S = null; asp = null; cv = null; girando = false;
}
function guardar() { if (!S) return; const d = { s: S, reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- pantalla de nueva partida ---------- */
function setup() {
  S = null; res = null; clearTimeout(timer); if (tk) tk.cerrar(); cv = null; cerrar3D();
  const n = cfg.jug.filter(j => j[1] !== 'n').length;
  root.innerHTML = `<p class="note">Gira la ruleta, di consonantes para ganar dinero, compra vocales y resuelve el panel antes que nadie. Gana quien más dinero acumule al final de las rondas.</p>
    ${cfg.jug.map(([nom, t], i) => `<div class="jugfila" style="--c:${COL[i]}"><span class="jf-dot"></span><input class="nom" data-name="${i}" maxlength="14" value="${esc(nom)}" aria-label="Nombre del jugador ${i + 1}"><div class="seg">${[['h', 'Persona'], ['c', 'CPU'], ['n', 'Nadie']].map(([k, l]) => `<button class="btn ${t === k ? 'on' : ''}" data-tipo="${i},${k}">${l}</button>`).join('')}</div></div>`).join('')}
    <div class="bar"><span class="lbl">Rondas</span><div class="seg">${R.RONDAS.map(k => `<button class="btn ${cfg.rondas === k ? 'on' : ''}" data-rondas="${k}">${k}</button>`).join('')}</div></div>
    <div class="bar"><span class="lbl">Nivel CPU</span><div class="seg">${Object.entries(R.NIVEL).map(([k, v]) => `<button class="btn ${cfg.nivel === k ? 'on' : ''}" data-niv="${k}">${v.nombre}</button>`).join('')}</div></div>
    <div class="bar"><button class="btn on" data-ac="start" ${n < 1 ? 'disabled' : ''}>Empezar partida</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>
    <p class="note">${n < 1 ? 'Elige al menos un jugador.' : n === 1 ? 'Un solo jugador: juegas para hacer tu mejor marca.' : `${n} jugadores por turnos en este dispositivo.`}</p>`;
}
const COL = ['#FF4757', '#2F6BFF', '#12B76A'];
function nuevaSetup() { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; clearTimeout(timer); api.borrar(); setup(); }
function empezar() {
  const jugadores = cfg.jug.filter(j => j[1] !== 'n').map(([nombre, t]) => ({ nombre: nombre.trim() || 'Jugador', cpu: t === 'c' }));
  if (!jugadores.length) return;
  api.setPref('cfg', cfg); S = R.crear({ jugadores, rondas: cfg.rondas, nivel: cfg.nivel }); reg = false; res = null;
  armar(); pintar(); guardar(); bucle();
}

/* ---------- pantalla de juego ---------- */
function armar() {
  cerrar3D(); modo3d = quiere3D();
  root.innerHTML = `<div class="rlj" id="rlJ"></div>
    <div class="rlpanel" id="rlPanel" data-ac="teclado" tabindex="0" role="button" aria-label="Panel">
      <div class="rlboard" id="rlBoard"></div><div class="rlcat" id="rlCat"></div></div>
    <p class="rltoca" id="rlToca"></p>
    <div class="msg" id="rlMsg" role="status" aria-live="polite"></div>
    <div class="bar rlresbar" id="rlResBar" hidden><button class="btn" data-ac="rescancel">Cancelar</button><button class="btn on" data-ac="rescomp" id="rlResOk">✔ Comprobar solución</button></div>
    <div class="rlfin" id="rlFin" hidden></div>
    <div class="rljuego" id="rlJuego">
      <div class="rlwheel ${modo3d ? 'r3' : ''}">${modo3d ? '<div class="e3d rl3d" id="rl3d"></div>' : '<div class="rlptr" aria-hidden="true"></div>'}<canvas id="rlCanvas" width="400" height="400" aria-label="Ruleta de premios"${modo3d ? ' style="display:none"' : ''}></canvas><div class="rlval" id="rlVal" aria-live="polite"></div></div>
      <div class="bar rlacc"><button class="btn on rlgirar" data-ac="girar" id="rlGirar">🎡 Girar</button><button class="btn" data-ac="vocal" id="rlVocal">Comprar vocal · ${R.dinero(R.PRECIO_VOCAL)}</button><button class="btn" data-ac="resolver" id="rlResolver">🧩 Resolver</button><button class="btn tkabrir" data-ac="teclado" id="rlTk" aria-label="Abrir teclado">⌨️</button></div>
    </div>
    <ul class="rllog" id="rlLog"></ul>
    <div class="bar"><button class="btn" data-ac="reglas">Reglas</button></div>${api.barraHtml()}`;
  cv = $('#rlCanvas'); dpr = Math.min(window.devicePixelRatio || 1, 3); cv.width = 400 * dpr; cv.height = 400 * dpr;
  if (modo3d) iniciar3D(); else dibujar();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (cv) { claveRueda = ''; dibujar(); } });
}
async function iniciar3D() {
  const t = ++tok3;
  try {
    const b3 = await import('../../core/escena3d.js'), { crearRuleta3D } = await import('./vista3d.js'); if (t !== tok3 || !cv) return;
    const host = $('#rl3d'); if (!host) return;
    const v = await crearRuleta3D(host, { n: R.SEGS.length, alTocar: () => { if (S && S.fase === 'girar' && humano() && !girando && !res) girar(); } });
    if (t !== tok3 || !cv) { v.destruir(); return; }
    b3.botonesCamara(host, v.E); V3 = v; claveRueda = ''; dibujar();
  } catch (e) { console.error(e); if (t === tok3 && cv) { forzar2d = true; armar(); pintar(); } }
}

/* ---------- ruleta ---------- */
const luz = hex => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
function dibujar() {
  if (!cv || !S) return;
  if (modo3d) {
    if (!V3) return;
    if (claveRueda !== asp.valores.ruleta) { claveRueda = asp.valores.ruleta; const c = document.createElement('canvas'); c.width = c.height = 800; pintarRueda(c.getContext('2d'), 0, 2); V3.rueda(c); }
    V3.girar(S.rot); return;
  }
  pintarRueda(cv.getContext('2d'), S.rot, dpr);
}
function pintarRueda(ctx, rot, esc) {
  const cols = RUEDAS[asp.valores.ruleta].c, n = R.SEGS.length, a = 2 * Math.PI / n, Rr = 188;
  ctx.setTransform(esc, 0, 0, esc, 0, 0); ctx.clearRect(0, 0, 400, 400); ctx.save(); ctx.translate(200, 200);
  ctx.beginPath(); ctx.arc(0, 0, Rr + 8, 0, 2 * Math.PI); ctx.fillStyle = '#FFC21A'; ctx.fill();
  for (let i = 0; i < n; i++) {
    const v = R.SEGS[i], s = rot + i * a, fondo = v === 'Q' ? '#17214A' : v === 'P' ? '#FFFFFF' : cols[i % cols.length];
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, Rr, s, s + a); ctx.closePath(); ctx.fillStyle = fondo; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.save(); ctx.rotate(s + a / 2); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillStyle = luz(fondo) > .62 ? '#17214A' : '#FFFFFF';
    if (typeof v === 'number') { ctx.font = "800 22px 'Baloo 2', Nunito, sans-serif"; ctx.fillText(String(v), Rr - 12, 2); }
    else { ctx.font = "800 12px Nunito, sans-serif"; ctx.fillText(v === 'Q' ? 'QUIEBRA' : 'PIERDE TURNO', Rr - 10, 1); }
    ctx.restore();
  }
  for (let i = 0; i < n; i++) { const g = rot + i * a; ctx.beginPath(); ctx.arc(Math.cos(g) * (Rr + 3), Math.sin(g) * (Rr + 3), 3.6, 0, 2 * Math.PI); ctx.fillStyle = '#FFF6D6'; ctx.fill(); }
  ctx.beginPath(); ctx.arc(0, 0, 36, 0, 2 * Math.PI); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#FFC21A'; ctx.stroke();
  ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🎡', 0, 2);
  ctx.restore();
}
const idxEn = r => { const a = 2 * Math.PI / R.SEGS.length, t = (((-Math.PI / 2 - r) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); return Math.floor(t / a) % R.SEGS.length; };
async function girar() {
  if (!S || S.fase !== 'girar' || girando || res || !R.quedan(S, false).length) return;
  clearTimeout(timer); girando = true; tk.cerrar(); pintar();
  const ini = S.rot, delta = 2 * Math.PI * (4 + Math.random() * 2) + Math.random() * 2 * Math.PI;
  const lento = matchMedia('(prefers-reduced-motion: reduce)').matches, dur = lento ? 900 : 4000, t0 = performance.now();
  let ultimo = idxEn(ini);
  await new Promise(fin => {
    const paso = now => {
      if (!S || !cv) return fin();
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      S.rot = ini + delta * e; dibujar();
      const k = idxEn(S.rot); if (k !== ultimo) { ultimo = k; if (!lento) api.sonido('click'); }
      if (p < 1) requestAnimationFrame(paso); else fin();
    };
    requestAnimationFrame(paso);
  });
  girando = false; if (!S) return;
  S.rot %= 2 * Math.PI;
  const v = R.caer(S, idxEn(S.rot));
  $('#rlVal').textContent = v === 'Q' ? 'Quiebra' : v === 'P' ? 'Pierde turno' : R.dinero(v);
  $('#rlVal').className = 'rlval ' + (v === 'Q' ? 'mal' : v === 'P' ? 'pt' : 'ok');
  if (v === 'Q') { api.sonido('perder'); api.vibrar([40, 30, 40]); } else if (v === 'P') api.sonido('error'); else api.sonido('ok');
  pintar(); guardar(); abrirSiToca(); bucle();
}

/* ---------- jugadas ---------- */
const humano = () => S && !R.jugador(S).cpu;
function abrirSiToca() { if (humano() && (S.fase === 'consonante' || S.fase === 'vocal')) tk.abrir(); }
function pedir(L) {
  if (!S || girando || res) return;
  const vocal = R.VOCALES.includes(L);
  if (S.fase === 'consonante' && vocal) { api.aviso('Ahora toca consonante. Las vocales se compran.'); return; }
  if (S.fase === 'vocal' && !vocal) { api.aviso('Has comprado una vocal: elige A, E, I, O o U.'); return; }
  const antes = S.ronda, n = R.pedir(S, L); if (n < 0) return;
  recien = n > 0 ? new Set([L]) : new Set();
  if (n > 0) { api.sonido(S.fase === 'ronda' || S.fase === 'fin' ? 'ganar' : 'ok'); api.vibrar(20); } else { api.sonido('error'); }
  if (!(S.fase === 'consonante' || S.fase === 'vocal')) tk.cerrar();
  if (S.ronda === antes) $('#rlVal').textContent = '';
  pintar(); guardar(); bucle();
}
function comprarVocal() {
  if (!S || girando || res || S.fase !== 'girar') return;
  const p = R.jugador(S);
  if (!R.quedan(S, true).length) { api.aviso('No quedan vocales por descubrir.'); return; }
  if (p.banco < R.PRECIO_VOCAL) { api.aviso(`Necesitas ${R.dinero(R.PRECIO_VOCAL)} en esta ronda para comprar una vocal.`); return; }
  R.comprarVocal(S); api.sonido('click'); pintar(); guardar(); abrirSiToca(); bucle();
}

/* ---------- resolver el panel con el teclado emergente ---------- */
const ocultas = () => [...R.panel(S).t].map((ch, i) => (R.esLetra(ch) && !S.usadas.includes(R.base(ch)) ? i : -1)).filter(i => i >= 0);
function empezarResolver() {
  if (!S || girando || S.fase !== 'girar' || !humano()) return;
  const oc = ocultas(); if (!oc.length) return;
  res = { letras: {}, cur: oc[0] }; api.sonido('click'); tk.abrir(); pintar();
}
function cancelarResolver() { res = null; tk.cerrar(); pintar(); }
function escribirRes(L) {
  const oc = ocultas(), k = oc.indexOf(res.cur);
  if (L === '⌫') {
    if (res.letras[res.cur]) delete res.letras[res.cur]; else if (k > 0) { res.cur = oc[k - 1]; delete res.letras[res.cur]; }
  } else {
    res.letras[res.cur] = L; api.sonido('click');
    const sig = oc.slice(k + 1).find(i => !res.letras[i]) ?? oc.find(i => !res.letras[i]);
    if (sig != null) res.cur = sig;
  }
  pintar();
}
function comprobarRes() {
  if (!res) return;
  const oc = ocultas(); if (oc.some(i => !res.letras[i])) { api.aviso('Completa todas las casillas vacías.'); return; }
  const texto = [...R.panel(S).t].map((ch, i) => (res.letras[i] != null ? res.letras[i] : ch)).join('');
  res = null; tk.cerrar();
  const ok = R.resolver(S, texto);
  if (ok) { recien = new Set(R.letrasPanel(S)); api.sonido('ganar'); api.vibrar([60, 40, 60]); } else { api.sonido('error'); api.vibrar(40); }
  $('#rlVal').textContent = ''; pintar(); guardar(); bucle();
}

/* ---------- pintado ---------- */
function pintar() {
  if (!S || !$('#rlBoard')) return;
  const yo = R.jugador(S), fin = S.fase === 'fin', finRonda = S.fase === 'ronda' || fin, cons = R.quedan(S, false).length, voc = R.quedan(S, true).length;
  $('#rlJ').style.setProperty('--nj', S.jug.length);
  $('#rlJ').innerHTML = S.jug.map((p, j) => `<div class="rlp ${j === S.turno && !finRonda ? 'turno' : ''} ${finRonda && (fin ? j === S.ganador : j === S.ganadorRonda) ? 'gana' : ''}" style="--c:${COL[j]}"><div class="nom"><i></i>${esc(p.nombre)}${p.cpu ? ' 🤖' : ''}</div><b>${R.dinero(p.banco)}</b><small>Total ${R.dinero(p.total)}</small></div>`).join('');
  // panel de letras
  const t = R.panel(S).t;
  $('#rlBoard').style.setProperty('--n', Math.max(8, ...t.split(' ').map(w => w.length)));
  $('#rlBoard').innerHTML = t.split(' ').map((w, wi, arr) => {
    const ini = arr.slice(0, wi).reduce((n, x) => n + x.length + 1, 0);
    return `<span class="rlw">${[...w].map((ch, k) => {
      const i = ini + k;
      if (!R.esLetra(ch)) return `<span class="rlt sig">${esc(ch)}</span>`;
      const L = R.base(ch), vis = S.usadas.includes(L);
      if (vis) return `<span class="rlt vis${recien.has(L) ? ' nuevo' : ''}">${esc(ch.toUpperCase())}</span>`;
      if (res) return `<span class="rlt res${res.cur === i ? ' cur' : ''}" data-i="${i}">${res.letras[i] || ''}</span>`;
      return '<span class="rlt"></span>';
    }).join('')}</span>`;
  }).join('');
  recien = new Set();
  $('#rlCat').innerHTML = `Pista: <b>${CATEGORIAS[R.panel(S).c]}</b>`;
  $('#rlPanel').classList.toggle('activo', humano() && !finRonda && (!!res || S.fase === 'consonante' || S.fase === 'vocal'));
  $('#rlPanel').setAttribute('aria-label', `Panel. Pista: ${CATEGORIAS[R.panel(S).c]}. ` + [...t].map(ch => (R.esLetra(ch) ? (S.usadas.includes(R.base(ch)) ? ch : 'hueco') : ch)).join(' '));
  // mensaje para el jugador
  const toca = $('#rlToca'); let m = '';
  if (fin) m = `🏆 ¡${S.jug[S.ganador].nombre} gana con ${R.dinero(S.jug[S.ganador].total)}!`;
  else if (S.fase === 'ronda') m = `🎉 ${S.jug[S.ganadorRonda].nombre} resuelve el panel.`;
  else if (yo.cpu) m = girando ? `${yo.nombre} gira la ruleta…` : `${yo.nombre} está pensando…`;
  else if (res) m = 'Escribe las letras que faltan y pulsa Comprobar.';
  else if (girando) m = '¡Gira, gira…!';
  else if (S.fase === 'consonante') m = `${yo.nombre}, di una consonante: ${R.dinero(S.valor)} por cada una.`;
  else if (S.fase === 'vocal') m = `${yo.nombre}, elige una vocal.`;
  else m = cons ? `Te toca, ${yo.nombre}: gira, compra una vocal o resuelve.` : `No quedan consonantes, ${yo.nombre}: compra una vocal o resuelve.`;
  const ms = $('#rlMsg'); ms.textContent = m; ms.className = 'msg' + (finRonda ? ' win' : '');
  toca.textContent = humano() && !finRonda && !girando && (S.fase === 'consonante' || S.fase === 'vocal' || res) ? '⌨️ Toca el panel si cierras el teclado' : '';
  toca.hidden = !toca.textContent;
  // botones
  const libre = humano() && S.fase === 'girar' && !girando && !res;
  $('#rlGirar').disabled = !libre || !cons;
  $('#rlVocal').disabled = !libre || !voc || yo.banco < R.PRECIO_VOCAL;
  $('#rlResolver').disabled = !libre;
  $('#rlTk').disabled = !humano() || finRonda || girando || !(res || S.fase === 'consonante' || S.fase === 'vocal');
  $('#rlResBar').hidden = !res;
  if (res) $('#rlResOk').disabled = ocultas().some(i => !res.letras[i]);
  $('#rlJuego').hidden = finRonda;
  const f = $('#rlFin'); f.hidden = !finRonda;
  if (finRonda) {
    const orden = S.jug.map((j, k) => ({ ...j, k })).sort((a, b) => b.total - a.total);
    f.innerHTML = `<h3>${fin ? '🏆 Clasificación final' : `Fin de la ronda ${S.ronda} de ${S.rondas}`}</h3><table>${orden.map(j => `<tr><td><i style="background:${COL[j.k]}"></i>${esc(j.nombre)}</td><td>${R.dinero(j.total)}</td></tr>`).join('')}</table>
      <div class="bar" style="justify-content:center">${fin ? '<button class="btn on" data-ac="setup">Nueva partida</button>' : '<button class="btn on" data-ac="ronda">Siguiente ronda</button>'}</div>`;
  }
  $('#rlLog').innerHTML = S.log.map(l => `<li>${esc(l)}</li>`).join('');
  refrescarTeclado();
}
function refrescarTeclado() {
  if (!tk || !S) return;
  const ls = R.letrasPanel(S), modo = res ? 'res' : humano() ? S.fase : '';
  tk.titulo(res ? 'Resolver el panel' : modo === 'consonante' ? `Elige una consonante · ${R.dinero(S.valor)}` : modo === 'vocal' ? 'Elige una vocal' : 'Ruleta de la Suerte');
  tk.actualizar((l, b) => {
    const vocal = R.VOCALES.includes(l), usada = S.usadas.includes(l);
    if (l === '⌫') { b.disabled = modo !== 'res'; b.className = 'tkk tkdel'; return; }
    if (modo === 'res') { b.disabled = false; b.className = 'tkk' + (vocal ? ' vocal' : ''); return; }
    b.disabled = usada || !((modo === 'consonante' && !vocal) || (modo === 'vocal' && vocal));
    b.className = 'tkk' + (vocal ? ' vocal' : '') + (usada ? (ls.has(l) ? ' ok' : ' mal') : '');
  });
  if (!res && !(humano() && (S.fase === 'consonante' || S.fase === 'vocal'))) tk.cerrar();
}

/* ---------- flujo y CPU ---------- */
function bucle() {
  clearTimeout(timer); if (!S || girando) return;
  if (S.fase === 'fin') return cierre();
  if (S.fase === 'ronda') { if (S.jug.every(j => j.cpu)) timer = setTimeout(() => { if (S && R.siguienteRonda(S)) { pintar(); guardar(); bucle(); } }, 3000); return; }
  if (!R.jugador(S).cpu) return;
  if (S.fase === 'girar') timer = setTimeout(() => {
    if (!S) return; const d = R.cpuDecidir(S);
    if (d === 'girar') girar();
    else if (d === 'vocal') { R.comprarVocal(S); api.sonido('click'); pintar(); guardar(); bucle(); }
    else { const ok = R.resolver(S, R.cpuAcierta(S) ? R.panel(S).t : ''); if (ok) recien = new Set(R.letrasPanel(S)); api.sonido(ok ? 'ok' : 'error'); pintar(); guardar(); bucle(); }
  }, 1100);
  else if (S.fase === 'consonante' || S.fase === 'vocal') timer = setTimeout(() => {
    if (!S) return; const L = R.cpuLetra(S), n = R.pedir(S, L); recien = n > 0 ? new Set([L]) : new Set();
    api.sonido(n > 0 ? 'ok' : 'error'); $('#rlVal').textContent = ''; pintar(); guardar(); bucle();
  }, 1200);
}
function cierre() {
  if (!reg) {
    reg = true; const humanos = S.jug.filter(j => !j.cpu), gan = S.jug[S.ganador];
    api.registrar({ res: humanos.length === 1 && S.jug.length > 1 ? (!gan.cpu ? 'victoria' : 'derrota') : 'partida', variante: `${S.rondas} rondas` });
    api.sonido(!gan.cpu ? 'ganar' : 'perder'); if (!gan.cpu) api.vibrar([60, 40, 60]);
  }
  pintar(); guardar();
}

/* ---------- entrada ---------- */
function tecla(l) {
  if (!S) return;
  if (res) return escribirRes(l);
  if (l === '⌫' || !humano()) return;
  pedir(l);
}
function teclado(e) {
  if (!S || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('.modal') || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (res && e.key === 'Backspace') { e.preventDefault(); return escribirRes('⌫'); }
  if (res && e.key === 'Enter') { e.preventDefault(); return comprobarRes(); }
  const l = e.key.length === 1 ? R.base(e.key) : '';
  if (l && R.LETRAS.includes(l)) { if (e.target === document.getElementById('rlPanel') && e.key === ' ') return; tecla(l); }
}
function teclaPanel(e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.id === 'rlPanel' && !res) { e.preventDefault(); abrirTeclado(); } }
function abrirTeclado() { if (S && humano() && !girando && (res || S.fase === 'consonante' || S.fase === 'vocal')) tk.abrir(); else if (S && humano() && S.fase === 'girar' && !girando) api.aviso('Primero gira la ruleta, compra una vocal o pulsa Resolver.'); }
function alEscribir(e) { if (e.target.dataset && e.target.dataset.name != null) cfg.jug[+e.target.dataset.name][0] = e.target.value.slice(0, 14); }
function clic(e) {
  const t = e.target.closest('[data-i]');
  if (t && res) { res.cur = +t.dataset.i; tk.abrir(); pintar(); return; }
  const b = e.target.closest('button,[data-ac]'); if (!b) return; const d = b.dataset;
  if (d.tipo) { const [i, k] = d.tipo.split(','); cfg.jug[+i][1] = k; return setup(); }
  if (d.rondas) { cfg.rondas = +d.rondas; return setup(); }
  if (d.niv) { cfg.nivel = d.niv; return setup(); }
  const a = d.ac;
  if (a === 'start') empezar(); else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas(); else if (a === 'nueva') nuevaSetup();
  else if (a === 'setup') { api.borrar(); setup(); }
  else if (!S) return;
  else if (a === 'girar') girar(); else if (a === 'vocal') comprarVocal(); else if (a === 'resolver') empezarResolver();
  else if (a === 'teclado') abrirTeclado(); else if (a === 'rescancel') cancelarResolver(); else if (a === 'rescomp') comprobarRes();
  else if (a === 'ronda') { if (R.siguienteRonda(S)) { $('#rlVal').textContent = ''; api.sonido('click'); pintar(); guardar(); bucle(); } }
}
function reglas() {
  api.modal('Ruleta de la Suerte', `<ul><li>De 1 a 3 jugadores (personas o CPU) por turnos. Hay que descubrir la frase oculta del panel; la <b>pista</b> dice de qué trata.</li>
    <li>En tu turno <b>gira la ruleta</b>: si cae en un premio, di una <b>consonante</b> y ganas ese premio por cada vez que aparece. Si aciertas, sigues jugando.</li>
    <li><b>Quiebra</b> te deja sin el dinero de la ronda y <b>Pierde turno</b> pasa el turno. Si dices una letra que no está, también pasa el turno.</li>
    <li>Las <b>vocales</b> se compran por ${R.dinero(R.PRECIO_VOCAL)} del dinero de la ronda.</li>
    <li><b>🧩 Resolver</b>: escribe las letras que faltan en las casillas del panel y pulsa Comprobar. Si aciertas, te llevas al marcador el dinero de la ronda; si fallas, pasa el turno.</li>
    <li>El <b>teclado emergente</b> aparece cuando hay que elegir letra (o al tocar el panel o ⌨️). Puedes arrastrarlo por la pantalla desde su barra y cerrarlo con ✕. Con el teclado del ordenador también puedes escribir.</li>
    <li>Las tildes no importan. Al final de las rondas gana quien más dinero acumule.</li></ul>`);
}
