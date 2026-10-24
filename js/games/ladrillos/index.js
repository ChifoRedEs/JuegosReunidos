import { $, esc } from '../../core/dom.js';
import * as L from './motor.js';
import { grupoFondo, grupoPersonaje, emojiPersonaje, tapeteElegido } from '../../core/aspectos.js';
import { imagenTapete, pintarTapete } from '../../core/cartas.js';

let S = null, api = null, asp = null, root = null, raf = 0, tPrev = 0, reg = false, cv = null, ctx = null, dpr = 1, escala = 1;
let onKey = null, onKeyUp = null, onVis = null, onRes = null, gesto = null, teclas = { izq: false, der: false }, palaX = null, particulas = [], aviso = null, nuevoRecord = false;
let hudAnt = '', capaLad = null, podioPos = -1, ed = null;           // ed = nivel en edición { i, nombre, filas, pincel, espejo }
let cfg = { modo: 'campana', nivel: 1 };
const COLORES = ['', '#FF4757', '#FF9F1C', '#FFD43B', '#2ECC71', '#2F80ED', '#9B5DE5'];
const CAP_COLOR = { ancha: '#2F80ED', multi: '#9B5DE5', lenta: '#2ECC71', laser: '#FF4757', fuego: '#FF9F1C', vida: '#FF5DA2' };
const TEMAS = { noche: ['#141B47', '#0A0F2C'], aurora: ['#1B4D5C', '#0B1E3F'], atardecer: ['#5B2A86', '#1F0F3A'] };

/* ---------- validación / resumen ---------- */
export function validar(d) { const s = d && L.validar(d.s); return s ? { s, reg: !!d.reg } : null; }
export const migrarV1 = d => d;
export function resumen(d) { const s = d.s; return s.fase === 'fin' ? { texto: `${L.MODOS[s.modo]} · ${s.puntos.toLocaleString('es-ES')} puntos · nivel ${s.nivel}`, fin: true } : { texto: `Nivel ${s.nivel} · ${s.puntos.toLocaleString('es-ES')} puntos · ${'❤️'.repeat(s.vidas)}`, fin: false }; }

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; particulas = []; aviso = null; nuevoRecord = false;
  asp = api.aspecto([grupoFondo('', true), grupoPersonaje('Personajes (la bola)'), { clave: 'fondo', titulo: 'Fondo', def: 'noche', opciones: [{ id: 'noche', nombre: 'Noche', sw: TEMAS.noche }, { id: 'aurora', nombre: 'Aurora', sw: TEMAS.aurora }, { id: 'atardecer', nombre: 'Atardecer', sw: TEMAS.atardecer }] }], () => { if (S) dibujar(); });
  await api.css(new URL('./ladrillos.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && L.MODOS[c0.modo] && Number.isInteger(c0.nivel)) cfg = { ...cfg, ...c0 };
  const g = api.cargar(); S = g ? g.s : null; reg = g ? g.reg : false;
  root.addEventListener('click', clic);
  onKey = teclaAbajo; onKeyUp = teclaArriba; document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKeyUp);
  onVis = () => { if (document.hidden) pausar(); }; document.addEventListener('visibilitychange', onVis);
  onRes = () => { if (cv && S) { ajustar(); dibujar(); } }; addEventListener('resize', onRes);
  api.menu([{ texto: 'Nueva partida', accion: () => { pausar(); setup(); } }, { texto: '🏆 Podio (10 mejores)', accion: () => { pausar(); verPodio(); } }, { texto: '✏️ Editor de niveles', accion: () => { pausar(); editar(-1); } }, { texto: '⏸️ Pausa', accion: pausar }, { texto: '🎨 Apariencia', accion: () => { pausar(); asp.abrir(); } }, { texto: 'Cómo se juega', accion: () => { pausar(); reglas(); } }]);
  if (S && S.fase !== 'fin') { armar(); dibujar(); if (S.fase === 'listo') arrancar(); } else setup();
}
export function unmount() {
  pausar(); cancelAnimationFrame(raf); raf = 0;
  document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKeyUp); document.removeEventListener('visibilitychange', onVis); removeEventListener('resize', onRes);
  if (root) root.removeEventListener('click', clic); S = null; cv = null; asp = null; ed = null;
}
function guardar() { if (!S) return; const d = { s: { ...S, bolas: [], capsulas: [], disparos: [] }, reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }
const nivelMax = () => Math.max(1, Math.min(L.NIVELES.length, api.pref('nivelMax', 1)));
// Niveles creados con el editor: [{ nombre, filas }], guardados en las preferencias (entran en la copia de seguridad)
const misNiveles = () => { const l = api.pref('misNiveles', []); return Array.isArray(l) ? l.filter(x => x && typeof x.nombre === 'string' && L.validarPlano(x.filas)).slice(0, 30) : []; };

/* ---------- pantallas ---------- */
function setup() {
  cancelAnimationFrame(raf); raf = 0; if (S && S.fase !== 'fin') guardar();
  const seg = (k, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${cfg[k] === v ? 'on' : ''}" data-cfg="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  ed = null;
  if (cfg.nivel > nivelMax()) cfg.nivel = 1;
  const rC = api.record(L.MODOS.campana), rA = api.record(L.MODOS.aleatorio), mis = misNiveles();
  root.innerHTML = `<p class="note">Mueve la pala para que la bola no caiga y rompe todos los ladrillos (los de metal no se rompen). Atrapa las cápsulas que caen para conseguir ventajas.</p>
    <div class="bar"><span class="lbl">Modo</span>${seg('modo', Object.entries(L.MODOS))}</div>
    ${cfg.modo === 'propio' ? `<div class="ldmis">${mis.length ? mis.map((n, i) => `<div class="ldmi"><span class="ldmini">${miniatura(n.filas)}</span><b>${esc(n.nombre)}</b><button class="btn on" data-ac="jugarmio" data-i="${i}">▶️</button><button class="btn" data-ac="editar" data-i="${i}" aria-label="Editar">✏️</button><button class="btn danger" data-ac="borrarmio" data-i="${i}" aria-label="Borrar">🗑️</button></div>`).join('') : '<p class="note">Todavía no has creado ningún nivel. Diseña el tuyo con el editor: elige un tipo de ladrillo y pinta casillas.</p>'}
      <div class="bar"><button class="btn" data-ac="editar" data-i="-1">✏️ Crear un nivel</button></div></div>` : cfg.modo === 'campana' ? `<div class="bar"><span class="lbl">Empezar en</span><div class="seg ldniv">${Array.from({ length: L.NIVELES.length }, (_, k) => k + 1).map(n => `<button class="btn ${cfg.nivel === n ? 'on' : ''}" data-cfg="nivel" data-v="${n}" ${n > nivelMax() ? 'disabled title="Llega a este nivel para desbloquearlo"' : ''}>${n > nivelMax() ? '🔒' : n}</button>`).join('')}</div></div>` : '<p class="note">Niveles generados al azar, cada vez con más ladrillos y más rápidos.</p>'}
    <div class="ldcaps">${Object.entries(L.CAPSULAS).map(([k, c]) => `<span><i style="--c:${CAP_COLOR[k]}">${c.letra}</i>${c.nombre}</span>`).join('')}</div>
    ${rC || rA ? `<div class="ldrecs"><b>🏆 Tus récords</b>${rC ? `<span>Campaña: <b>${rC.toLocaleString('es-ES')}</b></span>` : ''}${rA ? `<span>Aleatorio: <b>${rA.toLocaleString('es-ES')}</b></span>` : ''}</div>` : ''}
    <div class="bar">${S && S.fase !== 'fin' ? '<button class="btn on" data-ac="seguir">▶️ Continuar partida</button>' : ''}${cfg.modo === 'propio' ? '' : `<button class="btn ${S && S.fase !== 'fin' ? '' : 'on'}" data-ac="start">🧱 Nueva partida</button>`}<button class="btn" data-ac="podio">🏆 Podio</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button></div>`;
}
const COLOR_PIEZA = { '1': COLORES[1], '2': COLORES[2], '3': COLORES[3], '4': COLORES[4], '5': COLORES[5], '6': COLORES[6], D: '#5AA9E6', T: '#E0A400', M: '#7A8597', '?': '#FF5DA2' };
const miniatura = filas => `<svg viewBox="0 0 10 8" aria-hidden="true">${filas.flatMap((f, y) => [...f].map((ch, x) => ch === '.' ? '' : `<rect x="${x + .06}" y="${y + .1}" width=".88" height=".8" rx=".15" fill="${COLOR_PIEZA[ch]}"/>`)).join('')}</svg>`;

/* ---------- editor de niveles ---------- */
const NOMBRE_PIEZA = { '.': 'Borrar', '1': 'Rojo', '2': 'Naranja', '3': 'Amarillo', '4': 'Verde', '5': 'Azul', '6': 'Morado', D: '2 golpes', T: '3 golpes', M: 'Metal', '?': 'Sorpresa' };
function editar(i) {
  cancelAnimationFrame(raf); raf = 0; if (S && S.fase !== 'fin') guardar();
  const mis = misNiveles(), base = i >= 0 && mis[i] ? mis[i] : null;
  ed = { i: base ? i : -1, nombre: base ? base.nombre : `Nivel ${mis.length + 1}`, filas: base ? base.filas.map(f => [...f]) : Array.from({ length: L.FILAS }, () => Array(L.COLS).fill('.')), pincel: '1', espejo: true };
  cfg.modo = 'propio';
  root.innerHTML = `<p class="note">Elige un ladrillo abajo y toca (o arrastra por) las casillas para pintarlo. Con «Simetría» se pinta también la casilla opuesta.</p>
    <input class="pedir" id="ldNom" maxlength="24" value="${esc(ed.nombre)}" aria-label="Nombre del nivel">
    <div class="lded" id="ldEd" role="grid" aria-label="Editor del nivel"></div>
    <div class="ldpal" id="ldPal">${L.PIEZAS_EDITOR.map(ch => `<button type="button" class="btn" data-pin="${ch}" aria-label="${NOMBRE_PIEZA[ch]}"><i style="${ch === '.' ? '' : `background:${COLOR_PIEZA[ch]}`}">${ch === '.' ? '✕' : ch === '?' ? '?' : ch === 'D' ? '2' : ch === 'T' ? '3' : ch === 'M' ? '■' : ''}</i><small>${NOMBRE_PIEZA[ch]}</small></button>`).join('')}</div>
    <div class="bar"><button class="btn" data-ac="espejo" id="ldEsp">↔️ Simetría</button><button class="btn" data-ac="vaciar">🧹 Vaciar</button><button class="btn" data-ac="azar">🎲 Al azar</button></div>
    <div class="bar"><button class="btn on" data-ac="guardarnivel">💾 Guardar</button><button class="btn" data-ac="probar">▶️ Probar</button><button class="btn" data-ac="opciones">Cancelar</button></div>`;
  const g = $('#ldEd');
  g.innerHTML = Array.from({ length: L.FILAS * L.COLS }, (_, k) => `<button type="button" class="ldc" data-c="${k}" aria-label="Fila ${(k / L.COLS | 0) + 1}, columna ${k % L.COLS + 1}"></button>`).join('');
  let pintando = false;
  const pintarEn = e => { const b = document.elementFromPoint(e.clientX, e.clientY); if (b && b.dataset && b.dataset.c != null && g.contains(b)) poner(+b.dataset.c); };
  g.addEventListener('pointerdown', e => { pintando = true; e.preventDefault(); pintarEn(e); });
  g.addEventListener('pointermove', e => { if (pintando) pintarEn(e); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) g.addEventListener(ev, () => { pintando = false; });
  g.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.c != null) { e.preventDefault(); poner(+e.target.dataset.c); } });
  pintarEditor();
}
function poner(k) {
  const f = k / L.COLS | 0, c = k % L.COLS;
  ed.filas[f][c] = ed.pincel; if (ed.espejo) ed.filas[f][L.COLS - 1 - c] = ed.pincel;
  pintarEditor();
}
function pintarEditor() {
  if (!ed) return;
  root.querySelectorAll('.ldc').forEach(b => { const k = +b.dataset.c, ch = ed.filas[k / L.COLS | 0][k % L.COLS]; if (b.dataset.v === ch) return; b.dataset.v = ch; b.style.background = ch === '.' ? '' : COLOR_PIEZA[ch]; b.textContent = ch === '?' ? '?' : ch === 'D' ? '2' : ch === 'T' ? '3' : ''; });
  root.querySelectorAll('[data-pin]').forEach(b => b.classList.toggle('on', b.dataset.pin === ed.pincel));
  const e = $('#ldEsp'); if (e) e.classList.toggle('on', ed.espejo);
}
function planoEditor() { return ed.filas.map(f => f.join('')); }
function guardarNivel() {
  const filas = L.validarPlano(planoEditor());
  if (!filas) { api.aviso('Pon al menos un ladrillo que se pueda romper'); return null; }
  const nombre = ($('#ldNom').value || '').trim().slice(0, 24) || 'Mi nivel', mis = misNiveles();
  if (ed.i >= 0 && mis[ed.i]) mis[ed.i] = { nombre, filas }; else { if (mis.length >= 30) { api.aviso('Máximo 30 niveles: borra alguno'); return null; } mis.push({ nombre, filas }); ed.i = mis.length - 1; }
  api.setPref('misNiveles', mis); api.sonido('ok');
  return mis[ed.i];
}
function jugarPropio(n) {
  api.setPref('cfg', cfg);
  S = L.crear({ modo: 'propio', plano: n.filas, nombre: n.nombre }); reg = false; nuevoRecord = false; podioPos = -1; api.borrar(); ed = null;
  particulas = []; palaX = null; armar(); dibujar(); arrancar();
}
function armar() {
  root.innerHTML = `<div class="ldhud" id="ldHud"></div>
    <div class="ldzona" id="ldZona"><canvas id="ldCv" aria-label="Campo del rompe-ladrillos"></canvas><div class="ldover" id="ldOver" data-ac="tocar"></div></div>
    <p class="note ldayuda">Arrastra el dedo (en cualquier parte del campo) para mover la pala · toca para lanzar la bola · ← → y espacio con teclado.</p>
    <div class="bar"><button class="btn" data-ac="pausa">⏸️ Pausa</button><button class="btn" data-ac="opciones">⚙️ Opciones</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button></div>`;
  cv = $('#ldCv'); ctx = cv.getContext('2d'); dpr = Math.min(window.devicePixelRatio || 1, 3); hudAnt = ''; capaLad = null;
  ajustar();
  const z = $('#ldZona');
  z.addEventListener('pointerdown', e => { gesto = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now(), id: e.pointerId, raton: e.pointerType === 'mouse' }; try { z.setPointerCapture(e.pointerId); } catch { /* nada */ } });
  z.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse' && (!gesto || gesto.raton)) { const r = cv.getBoundingClientRect(); palaX = (e.clientX - r.left) / r.width * L.ANCHO; return; }   // ratón: la pala sigue al puntero
    if (!gesto || e.pointerId !== gesto.id) return;
    palaX = (palaX ?? S.pala.x) + (e.clientX - gesto.x) / escala * 1.25; gesto.x = e.clientX;      // dedo: movimiento relativo (no tapa la pala)
  });
  z.addEventListener('pointerup', e => {
    if (!gesto || e.pointerId !== gesto.id) return;
    const g = gesto; gesto = null;
    if (Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < 12 && performance.now() - g.t < 350) tocar();
  });
  z.addEventListener('pointercancel', () => { gesto = null; });
  pintarHud(); pintarOver();
}
function ajustar() {
  if (!cv) return;
  const ancho = Math.floor(cv.parentElement.getBoundingClientRect().width), alto = Math.round(ancho * L.ALTO / L.ANCHO);
  cv.width = ancho * dpr; cv.height = alto * dpr; cv.style.width = ancho + 'px'; cv.style.height = alto + 'px'; escala = ancho / L.ANCHO; capaLad = null;
}
function empezar(seguir = false) {
  api.setPref('cfg', cfg);
  if (!seguir || !S || S.fase === 'fin') {
    if (S && S.modo === 'propio' && S.plano) { const n = { filas: S.plano, nombre: S.nombrePlano }; return jugarPropio(n); }   // «Otra» con tu nivel
    const m = cfg.modo === 'propio' ? 'campana' : cfg.modo;
    S = L.crear({ modo: m, nivel: m === 'campana' ? cfg.nivel : 1 }); reg = false; nuevoRecord = false; podioPos = -1; api.borrar();
  }
  if (S.fase === 'pausa') S.fase = 'listo';
  particulas = []; palaX = null; armar(); dibujar(); arrancar();
}

/* ---------- bucle ---------- */
function arrancar() { cancelAnimationFrame(raf); tPrev = performance.now(); raf = requestAnimationFrame(bucle); }
function bucle(t) {
  if (!S) return;
  const dt = Math.min(t - tPrev, 50); tPrev = t;
  if (S.fase === 'jugar' || S.fase === 'listo') {
    if (teclas.izq || teclas.der) palaX = (palaX ?? S.pala.x) + (teclas.der - teclas.izq) * .95 * dt;
    const ev = L.avanzar(S, dt, { x: palaX });
    if (palaX != null) palaX = S.pala.x;
    efectos(ev);
  }
  particulas = particulas.filter(p => (p.t -= dt) > 0); particulas.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += .0016 * dt; });
  dibujar(); pintarHud();
  if (S.fase === 'jugar' || S.fase === 'listo' || particulas.length) raf = requestAnimationFrame(bucle); else raf = 0;
}
function efectos(ev) {
  if (!ev.length) return;
  for (const e of ev) {
    if (e === 'rompe') api.sonido('click');
    else if (e === 'pala') api.sonido('mover');
    else if (e === 'duro' || e === 'metal') api.sonido('captura');
    else if (e.startsWith('capsula:')) { const k = e.slice(8); api.sonido('ok'); api.vibrar(25); aviso = { txt: L.CAPSULAS[k].nombre, c: CAP_COLOR[k], t: performance.now() }; }
    else if (e === 'vida') { api.sonido('error'); api.vibrar([60, 40, 60]); if (S.fase !== 'fin') { guardar(); pintarOver(); } }
    else if (e === 'nivel') { api.sonido('ganar'); api.vibrar([40, 30, 80]); if (S.modo === 'campana') api.setPref('nivelMax', Math.max(nivelMax(), Math.min(L.NIVELES.length, S.nivel + 1))); guardar(); pintarOver(); }
    else if (e === 'fin') terminar();
  }
  // partículas de los ladrillos rotos (se comparan con el fotograma anterior)
  if (ev.includes('rompe') || ev.includes('duro')) for (const b of S.bolas) for (let k = 0; k < 7; k++) particulas.push({ x: b.x, y: b.y, vx: (Math.random() - .5) * .5, vy: (Math.random() - .8) * .4, t: 450, c: COLORES[1 + Math.floor(Math.random() * 6)] });
}
function tocar() {
  if (!S) return;
  if (S.fase === 'pausa') { S.fase = S.bolas.some(b => !b.pegada) ? 'jugar' : 'listo'; pintarOver(); arrancar(); return; }
  if (S.fase === 'listo') { L.sacar(S); api.sonido('mover'); pintarOver(); if (!raf) arrancar(); }
  else if (S.fase === 'nivel') { L.siguienteNivel(S); particulas = []; guardar(); pintarOver(); arrancar(); }
}
function pausar() { if (!S || (S.fase !== 'jugar' && S.fase !== 'listo')) return; S.fase = 'pausa'; teclas = { izq: false, der: false }; guardar(); pintarOver(); }
function terminar() {
  if (!reg) {
    reg = true; const v = L.variante(S), antes = api.record(v); nuevoRecord = S.puntos > antes && S.puntos > 0;
    api.registrar({ res: 'partida', variante: v, puntos: S.puntos });
    api.sonido(nuevoRecord ? 'ganar' : 'perder');
  }
  guardar(); pintarOver(); anotarPodio();
}
async function anotarPodio() {
  if (!S || S.fase !== 'fin' || podioPos >= 0) return;
  const v = L.variante(S);
  if (!api.podio.entra(v, S.puntos)) return;
  podioPos = await api.podio.anotar(v, S.puntos);
  if (S && S.fase === 'fin') pintarOver();
}
function verPodio() {
  const vs = Object.values(L.MODOS).filter(v => api.podio.lista(v).length);
  api.modal('🏆 Podio', vs.length ? vs.map(v => `<h3>${esc(v)}</h3>${api.podio.html(v)}`).join('') : '<p>Juega una partida y entra en la tabla de los 10 mejores.</p>');
}

/* ---------- dibujo ---------- */
function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function dibujar() {
  if (!S || !cv || !ctx) return;
  const k = escala * dpr, T = TEMAS[asp.valores.fondo] || TEMAS.noche, ahora = performance.now();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const tap = tapeteElegido(asp), im = tap ? imagenTapete(tap, () => dibujar()) : null;      // «Fondo de Tablero»
  if (im) pintarTapete(ctx, im, cv.width, cv.height, .4);
  else { const g = ctx.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, T[0]); g.addColorStop(1, T[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height); }
  ctx.setTransform(k, 0, 0, k, 0, 0);
  // ladrillos: los fijos se pintan en una capa aparte y solo se rehace cuando se rompe o agrieta alguno
  const firma = S.ladrillos.map(l => l.c + l.f * 10 + l.golpes * 100).join(',') + '|' + cv.width;
  if (!capaLad || capaLad.firma !== firma) {
    const f = capaLad && capaLad.cv.width === cv.width && capaLad.cv.height === cv.height ? capaLad.cv : document.createElement('canvas');
    f.width = cv.width; f.height = cv.height; const g2 = f.getContext('2d'); g2.setTransform(k, 0, 0, k, 0, 0);
    for (const l of S.ladrillos) if (l.tipo !== 's') pintarLadrillo(g2, l, ahora);
    capaLad = { firma, cv: f };
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(capaLad.cv, 0, 0); ctx.setTransform(k, 0, 0, k, 0, 0);
  for (const l of S.ladrillos) if (l.tipo === 's') pintarLadrillo(ctx, l, ahora);      // los «?» cambian de color: en vivo
  dibujarResto(k, ahora);
}
function pintarLadrillo(ctx, l, ahora) {
  {
    const r = L.rectLadrillo(l), x = r.x + 3, y = r.y + 3, w = r.w - 6, h = r.h - 6;
    let c1, c2;
    if (l.tipo === 'm') { c1 = '#C9D1DC'; c2 = '#7A8597'; }
    else if (l.tipo === 'd') { c1 = '#B9E6FF'; c2 = '#5AA9E6'; }
    else if (l.tipo === 't') { c1 = '#FFE9A6'; c2 = '#E0A400'; }
    else if (l.tipo === 's') { const h2 = (ahora / 8 + l.c * 30) % 360; c1 = `hsl(${h2},90%,72%)`; c2 = `hsl(${(h2 + 60) % 360},85%,55%)`; }
    else { c1 = COLORES[l.color]; c2 = COLORES[l.color]; }
    const gg = ctx.createLinearGradient(0, y, 0, y + h); gg.addColorStop(0, c1); gg.addColorStop(1, c2);
    ctx.fillStyle = gg; rrEn(ctx, x, y, w, h, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; rrEn(ctx, x + 4, y + 3, w - 8, 7, 4); ctx.fill();
    if (l.tipo === 'm') { ctx.fillStyle = '#5B6474'; for (const px of [x + 9, x + w - 9]) { ctx.beginPath(); ctx.arc(px, y + h / 2, 4, 0, Math.PI * 2); ctx.fill(); } }
    if (l.tipo === 's') { ctx.fillStyle = '#fff'; ctx.font = '800 26px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', x + w / 2, y + h / 2 + 2); }
    if ((l.tipo === 'd' && l.golpes === 1) || (l.tipo === 't' && l.golpes < 3)) {                  // grietas
      ctx.strokeStyle = 'rgba(30,30,60,.55)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + w * .3, y); ctx.lineTo(x + w * .42, y + h * .5); ctx.lineTo(x + w * .36, y + h);
      if (l.tipo === 't' && l.golpes === 1) { ctx.moveTo(x + w * .7, y); ctx.lineTo(x + w * .6, y + h * .55); ctx.lineTo(x + w * .72, y + h); } ctx.stroke();
    }
  }
}
function rrEn(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
function dibujarResto(k, ahora) {
  // cápsulas
  for (const c of S.capsulas) {
    ctx.fillStyle = CAP_COLOR[c.tipo]; rr(c.x - 34, c.y - 16, 68, 32, 16); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(c.x - 28, c.y - 13, 56, 9, 5); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '800 22px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(L.CAPSULAS[c.tipo].letra, c.x, c.y + 1);
  }
  // disparos
  ctx.fillStyle = '#FF6B7A'; for (const d of S.disparos) ctx.fillRect(d.x - 3, d.y - 18, 6, 18);
  // pala
  const p = S.pala, px = p.x - p.w / 2;
  const gp = ctx.createLinearGradient(0, L.PALA_Y, 0, L.PALA_Y + L.PALA_H); gp.addColorStop(0, '#FFFFFF'); gp.addColorStop(1, S.efectos.ancha ? '#7FB2FF' : '#B8C2E0');
  ctx.fillStyle = gp; rr(px, L.PALA_Y, p.w, L.PALA_H, 13); ctx.fill();
  ctx.fillStyle = S.efectos.fuego ? '#FF9F1C' : '#FF4757'; rr(px, L.PALA_Y, 22, L.PALA_H, 11); ctx.fill(); rr(px + p.w - 22, L.PALA_Y, 22, L.PALA_H, 11); ctx.fill();
  if (S.efectos.laser) { ctx.fillStyle = '#FF4757'; ctx.fillRect(px + 10, L.PALA_Y - 14, 8, 16); ctx.fillRect(px + p.w - 18, L.PALA_Y - 14, 8, 16); }
  // bolas
  for (const b of S.bolas) {                                    // halo con un círculo translúcido (shadowBlur es muy caro en móvil)
    ctx.fillStyle = S.efectos.fuego ? 'rgba(255,159,28,.28)' : 'rgba(159,208,255,.28)'; ctx.beginPath(); ctx.arc(b.x, b.y, L.RADIO * 1.9, 0, Math.PI * 2); ctx.fill();
    const emo = emojiPersonaje(asp);      // «Personajes»: la bola es tu personaje
    if (emo) { ctx.font = `${Math.round(L.RADIO * 3)}px system-ui,'Apple Color Emoji','Segoe UI Emoji',sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(emo, b.x, b.y + L.RADIO * .1); continue; }
    ctx.fillStyle = S.efectos.fuego ? '#FFB347' : '#FFFFFF'; ctx.beginPath(); ctx.arc(b.x, b.y, L.RADIO, 0, Math.PI * 2); ctx.fill();
  }
  // partículas
  for (const q of particulas) { ctx.globalAlpha = Math.max(0, q.t / 450); ctx.fillStyle = q.c; ctx.fillRect(q.x - 5, q.y - 5, 10, 10); } ctx.globalAlpha = 1;
  // aviso de cápsula
  if (aviso && ahora - aviso.t < 1200) { ctx.globalAlpha = 1 - (ahora - aviso.t) / 1200; ctx.fillStyle = aviso.c; ctx.font = '800 54px "Baloo 2", Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(aviso.txt, L.ANCHO / 2, 900 - (ahora - aviso.t) / 12); ctx.globalAlpha = 1; }
}
function pintarHud() {
  const h = $('#ldHud'); if (!h || !S) return;
  const ef = Object.entries(S.efectos).map(([k, ms]) => `<i style="--c:${CAP_COLOR[k]}" title="${L.CAPSULAS[k].nombre}">${L.CAPSULAS[k].letra}<small>${Math.ceil(ms / 1000)}</small></i>`).join('');
  const html = `<span><small>Puntos</small><b>${S.puntos.toLocaleString('es-ES')}</b></span><span><small>Nivel</small><b>${S.nivel}</b></span><span><small>Vidas</small><b class="vid">${'❤️'.repeat(Math.min(S.vidas, 6))}</b></span>${ef ? `<span class="ef">${ef}</span>` : ''}`;
  if (html !== hudAnt) { hudAnt = html; h.innerHTML = html; }         // solo cuando cambia (antes, 60 veces por segundo)
}
function pintarOver() {
  const o = $('#ldOver'); if (!o || !S) return;
  o.hidden = S.fase === 'jugar';
  if (S.fase === 'listo') { o.className = 'ldover suave'; o.innerHTML = `<div><b>Nivel ${S.nivel}</b><span>Toca para lanzar la bola</span></div>`; }
  else if (S.fase === 'pausa') { o.className = 'ldover'; o.innerHTML = '<div><b>⏸️ Pausa</b><span>Toca para seguir</span></div>'; }
  else if (S.fase === 'nivel') { o.className = 'ldover'; o.innerHTML = `<div><b>🎉 ¡Nivel ${S.nivel} superado!</b><span>Bonus: +${(500 + S.vidas * 100).toLocaleString('es-ES')}</span><span class="bts"><button class="btn on" data-ac="tocar">Nivel ${S.nivel + 1} ▶</button></span></div>`; }
  else if (S.fase === 'fin') { o.className = 'ldover'; o.innerHTML = `<div><b>💥 ¡Fin de la partida!</b><span class="g">${S.puntos.toLocaleString('es-ES')} puntos</span><span>Llegaste al nivel ${S.nivel}</span>${nuevoRecord ? '<span class="rec">🎉 ¡Nuevo récord!</span>' : ''}${podioPos >= 0 ? `<span>🏆 Puesto ${podioPos + 1} del podio</span>` : ''}<span class="bts"><button class="btn on" data-ac="otra">🔁 Otra</button><button class="btn" data-ac="opciones">⚙️ Opciones</button></span></div>`; }
}

/* ---------- entrada ---------- */
function teclaAbajo(e) {
  if (!S || !cv || document.querySelector('.modal') || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a') { teclas.izq = true; e.preventDefault(); }
  else if (k === 'ArrowRight' || k === 'd') { teclas.der = true; e.preventDefault(); }
  else if (k === ' ' || k === 'Enter') { e.preventDefault(); if (S.fase === 'fin') empezar(); else tocar(); }
  else if (k === 'p' || k === 'P' || k === 'Escape') { if (S.fase === 'jugar' || S.fase === 'listo') pausar(); else tocar(); }
}
function teclaArriba(e) { if (e.key === 'ArrowLeft' || e.key === 'a') teclas.izq = false; if (e.key === 'ArrowRight' || e.key === 'd') teclas.der = false; }
function clic(e) {
  const b = e.target.closest('button,[data-ac]'); if (!b) return; const d = b.dataset;
  if (d.cfg) { cfg[d.cfg] = d.cfg === 'nivel' ? +d.v : d.v; api.setPref('cfg', cfg); return setup(); }
  if (d.pin != null && ed) { ed.pincel = d.pin; return pintarEditor(); }
  const a = d.ac;
  if (a === 'editar') return editar(+d.i);
  if (a === 'jugarmio') { const n = misNiveles()[+d.i]; if (n) jugarPropio(n); return; }
  if (a === 'borrarmio') { const mis = misNiveles(); if (mis[+d.i] && api.confirmar(`¿Borrar «${mis[+d.i].nombre}»?`)) { mis.splice(+d.i, 1); api.setPref('misNiveles', mis); setup(); } return; }
  if (ed) {
    if (a === 'espejo') { ed.espejo = !ed.espejo; return pintarEditor(); }
    if (a === 'vaciar') { ed.filas = ed.filas.map(f => f.map(() => '.')); return pintarEditor(); }
    if (a === 'azar') { const p = L.crear({ modo: 'aleatorio', nivel: 1 + Math.floor(Math.random() * 8) }); ed.filas = Array.from({ length: L.FILAS }, () => Array(L.COLS).fill('.')); for (const l of p.ladrillos) ed.filas[l.f][l.c] = l.tipo === 'n' ? String(l.color) : { d: 'D', t: 'T', m: 'M', s: '?' }[l.tipo]; return pintarEditor(); }
    if (a === 'guardarnivel') { if (guardarNivel()) { api.aviso('Nivel guardado'); setup(); } return; }
    if (a === 'probar') { const n = guardarNivel(); if (n) jugarPropio(n); return; }
  }
  if (a === 'start') empezar(); else if (a === 'seguir') empezar(true); else if (a === 'otra') empezar();
  else if (a === 'opciones') { pausar(); setup(); } else if (a === 'podio') verPodio(); else if (a === 'aspecto') { pausar(); asp.abrir(); }
  else if (a === 'pausa') { if (S && (S.fase === 'jugar' || S.fase === 'listo')) pausar(); else tocar(); }
  else if (a === 'tocar' && b.tagName === 'BUTTON') tocar();
}
function reglas() {
  api.modal('Rompe-Ladrillos', `<ul><li>Mueve la pala para devolver la bola y rompe todos los ladrillos del nivel. Si la bola cae por abajo, pierdes una vida (tienes ${L.VIDAS}).</li>
    <li>Según dónde golpee la bola en la pala, sale más o menos inclinada: usa los extremos para apuntar.</li>
    <li>Ladrillos: de colores (1 golpe), <b>azules</b> (2 golpes), <b>dorados</b> (3 golpes; se agrietan), de <b>metal</b> (no se rompen) y <b>?</b> (siempre sueltan una cápsula).</li>
    <li>Cápsulas: <b>A</b> pala ancha · <b>M</b> multibola · <b>L</b> bola lenta · <b>Z</b> láser (la pala dispara sola) · <b>F</b> bola de fuego (atraviesa los ladrillos) · <b>+</b> vida extra. Los efectos duran 12 segundos.</li>
    <li>Romper ladrillos seguidos sin tocar la pala da puntos extra; al superar un nivel ganas un bonus por cada vida que te quede.</li>
    <li><b>Controles</b>: arrastra el dedo por cualquier parte del campo (la pala se mueve con él sin que el dedo la tape) y toca para lanzar. Con ratón, la pala sigue al puntero; con teclado, ← → y espacio.</li>
    <li>En la Campaña hay ${L.NIVELES.length} niveles: al llegar a uno se desbloquea para empezar desde él. Después del último, vuelven a empezar más rápidos.</li>
    <li><b>Mis niveles</b>: con el ✏️ editor diseñas tus propios niveles (hasta 30). Cada vez que superas el tuyo, se repite más rápido.</li></ul>`);
}
