// Air Hockey: contra la CPU (3 niveles) o 2 jugadores en el mismo móvil (cada uno controla su mitad con un dedo).
import { pieMenu } from '../../core/pie.js';
import { $ } from '../../core/dom.js';
import * as A from './motor.js';
import { grupoFondo, grupoPantalla, grupoPersonaje, emojiPersonaje } from '../../core/aspectos.js';

let S = null, api = null, asp = null, root = null, raf = 0, tPrev = 0, reg = false, cv = null, ctx = null, dpr = 1, esc = 1;
let onKey = null, onKeyUp = null, onVis = null, onRes = null, dedos = new Map(), obj = [null, null], teclas = {}, rastro = [], cartel = null, ultGolpe = 0, hudAnt = '';
let eraJugando = false;
let cfg = { modo: 'cpu', nivel: 'medio', meta: 7 };
const IMG = 'img/airhockey/';
const MESAS = [
  ['clasica-1', 'Verde azulado', ['#1B7870', '#E3DCCC']], ['clasica-2', 'Mostaza', ['#9F893E', '#E2DAC5']], ['clasica-3', 'Ciruela', ['#4C2542', '#E0D5C1']],
  ['neon-1', 'Neón azul', ['#061D2B', '#33D6FF']], ['neon-2', 'Neón naranja', ['#2C0F09', '#FF7A2E']], ['neon-3', 'Neón turquesa', ['#071F21', '#2EF0D0']],
];
const MAZOS = [['rojo', 'Rojo', '#E0483C'], ['azul', 'Azul', '#2F6BFF'], ['verde', 'Verde', '#1CAE69'], ['amarillo', 'Amarillo', '#E9B23B'], ['naranja', 'Naranja', '#E8602F'], ['morado', 'Morado', '#7A4FC9'], ['menta', 'Menta', '#4FD3BD'], ['turquesa', 'Turquesa', '#1E8B85']];
const DISCOS = [['crema', 'Crema', '#FBF3E2'], ['cian', 'Cian', '#4FD6C4'], ['verde', 'Verde', '#3CC63C'], ['rojo', 'Rojo', '#D82A2A']];
const COLM = Object.fromEntries(MAZOS.map(m => [m[0], m[2]]));
const colJ = j => COLM[asp && asp.valores[j === 0 ? 'mazo' : 'mazo2']] || (j === 0 ? '#E0483C' : '#2F6BFF');
// Mesa: la imagen lleva su propio marco; el campo de juego (canvas) ocupa el recuadro interior
const CAMPO = { x: 50 / 572, y: 52 / 1024, w: 472 / 572, h: 920 / 1024 };
const imgs = {};
const imgDe = n => { let i = imgs[n]; if (!i) { i = imgs[n] = new Image(); i.onload = () => { if (S && cv) dibujar(); }; i.src = IMG + n + '.webp'; } return i; };
const nombres = () => (S && S.modo === 'dos' ? ['Jugador 1', 'Jugador 2'] : ['Tú', 'CPU']);

/* ---------- validación / resumen ---------- */
export function validar(d) { const s = d && A.validar(d.s); return s ? { s, reg: !!d.reg } : null; }
export const migrarV1 = d => d;
export function resumen(d) {
  const s = d.s, n = s.modo === 'dos' ? ['Jugador 1', 'Jugador 2'] : ['Tú', 'CPU'];
  return { texto: `${n[0]} ${s.goles[0]} – ${s.goles[1]} ${n[1]}${s.modo === 'cpu' ? ` · ${A.NIVELES[s.nivel].nombre}` : ''}${s.fase === 'fin' ? (A.ganador(s) === 0 ? (s.modo === 'cpu' ? ' · ¡ganaste!' : ' · gana el 1') : (s.modo === 'cpu' ? ' · perdiste' : ' · gana el 2')) : ''}`, fin: s.fase === 'fin' };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; dedos = new Map(); obj = [null, null]; rastro = []; cartel = null;
  asp = api.aspecto([grupoFondo(''), grupoPantalla(''), grupoPersonaje('Personajes (tu mazo)'), { clave: 'mesa', titulo: 'Mesa', def: 'clasica-1', opciones: MESAS.map(([id, nombre, sw]) => ({ id, nombre, sw })) }, { clave: 'mazo', titulo: 'Tu mazo', def: 'rojo', opciones: MAZOS.map(([id, nombre, c]) => ({ id, nombre, sw: [c, c] })) }, { clave: 'mazo2', titulo: 'Mazo rival', def: 'azul', opciones: MAZOS.map(([id, nombre, c]) => ({ id, nombre, sw: [c, c] })) }, { clave: 'disco', titulo: 'Disco', def: 'crema', opciones: DISCOS.map(([id, nombre, c]) => ({ id, nombre, sw: [c, c] })) }], () => { if (S) dibujar(); });
  await api.css(new URL('./airhockey.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && A.MODOS[c0.modo] && A.NIVELES[c0.nivel] && A.METAS.includes(c0.meta)) cfg = { ...c0 };
  const g = api.cargar(); S = g ? g.s : null; reg = g ? g.reg : false;
  root.addEventListener('click', clic);
  onKey = e => { if (!S || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return; if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { teclas[e.key] = true; e.preventDefault(); if (S.fase === 'listo' || S.fase === 'pausa') seguir(); } else if (e.key === ' ' || e.key === 'p') { e.preventDefault(); if (S.fase === 'juego' || S.fase === 'gol') pausar(); else if (S.fase !== 'fin') seguir(); } };
  onKeyUp = e => { teclas[e.key] = false; };
  document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKeyUp);
  onVis = () => { if (document.hidden) pausar(); }; document.addEventListener('visibilitychange', onVis);
  onRes = () => { if (cv && S) { ajustar(); dibujar(); } }; addEventListener('resize', onRes);
  api.barra({ nueva: () => empezar(),
    salir: () => { pausar(); location.hash = '#/cat/arcade'; },
    pausar: () => { eraJugando = !!S && (S.fase === 'juego' || S.fase === 'gol'); pausar(); },
    reanudar: o => { if (o === 'salir' && eraJugando) seguir(); },
    config: { valores: () => ({ modo: cfg.modo, nivel: cfg.nivel, meta: cfg.meta }), grupos: v => [{ clave: 'modo', titulo: 'Modo', opciones: Object.entries(A.MODOS) }, { clave: 'nivel', titulo: 'Nivel de la CPU', visible: v.modo === 'cpu', opciones: Object.entries(A.NIVELES).map(([k, n]) => [k, n.nombre]) }, { clave: 'meta', titulo: 'Partido a', opciones: A.METAS.map(m => [m, `${m} goles`]) }], aplicar: v => { Object.assign(cfg, v); empezar(); } } });
  api.menu([{ texto: 'Nueva partida', accion: () => { pausar(); setup(); } }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: '📖 Reglas', accion: reglas }]);
  if (S && S.fase !== 'fin') { if (S.fase !== 'listo') S.fase = 'pausa'; armar(); } else setup();
}
export function unmount() {
  pausar(); cancelAnimationFrame(raf); raf = 0;
  document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKeyUp); document.removeEventListener('visibilitychange', onVis); removeEventListener('resize', onRes);
  if (root) root.removeEventListener('click', clic); S = null; cv = null; asp = null;
}
function guardar() { if (!S) return; const d = { s: S, reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- pantallas ---------- */
function setup() {
  cancelAnimationFrame(raf); raf = 0;
  const seg = (k, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${cfg[k] === v ? 'on' : ''}" data-cfg="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  root.innerHTML = `<p class="note">Mueve tu mazo con el dedo (o con el ratón o las flechas) y mete el disco en la portería rival. ${cfg.modo === 'dos' ? 'En <b>2 jugadores</b>, cada uno juega desde su lado del móvil: el de abajo con la mitad de abajo y el de arriba con la de arriba, a la vez.' : 'Solo puedes moverte por tu mitad de la mesa.'}</p>
    <div class="bar"><span class="lbl">Modo</span>${seg('modo', Object.entries(A.MODOS))}</div>
    ${cfg.modo === 'cpu' ? `<div class="bar"><span class="lbl">Nivel</span>${seg('nivel', Object.entries(A.NIVELES).map(([k, n]) => [k, n.nombre]))}</div>` : ''}
    <div class="bar"><span class="lbl">Partido a</span>${seg('meta', A.METAS.map(m => [m, `${m} goles`]))}</div>
    ${pieMenu({ seguir: S && S.fase !== 'fin' ? 'seguir' : null })}`;
}
function armar() {
  root.innerHTML = `<div class="ahhud" id="ahHud"></div>
    <div class="ahzona" id="ahZona"><canvas id="ahCv" aria-label="Mesa de air hockey"></canvas><div class="ahover" id="ahOver" hidden></div></div>
    ${api.barraHtml()}`;
  cv = $('#ahCv'); ctx = cv.getContext('2d'); dpr = Math.min(window.devicePixelRatio || 1, 3); hudAnt = '';
  cv.addEventListener('pointerdown', dedoAbajo); cv.addEventListener('pointermove', dedoMueve);
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) cv.addEventListener(t, dedoArriba);
  // Tocar la mesa en pausa (o antes de empezar) arranca el juego y ese mismo dedo ya mueve el mazo
  $('#ahOver').addEventListener('pointerdown', e => { if (!S || S.fase === 'fin' || e.target.closest('button')) return; seguir(); dedoAbajo(e); });
  ajustar(); dibujar(); pintarHud(); pintarOver();
}
function ajustar() {
  if (!cv) return;
  const zona = $('#ahZona'), anchoMax = zona.parentElement.getBoundingClientRect().width;
  const proporcion = (A.ANCHO / CAMPO.w) / (A.ALTO / CAMPO.h);                              // ancho / alto de toda la mesa (marco incluido)
  const altoDisp = Math.max(400, innerHeight - zona.getBoundingClientRect().top - 90);       // que quepa entera en pantalla
  const zw = Math.floor(Math.min(anchoMax, 520, altoDisp * proporcion)), zh = Math.round(zw / proporcion);
  zona.style.width = zw + 'px'; zona.style.height = zh + 'px';
  const cw = zw * CAMPO.w, ch = zh * CAMPO.h;
  cv.style.cssText = `left:${(CAMPO.x * 100).toFixed(3)}%;top:${(CAMPO.y * 100).toFixed(3)}%;width:${(CAMPO.w * 100).toFixed(3)}%;height:${(CAMPO.h * 100).toFixed(3)}%`;
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); esc = cw / A.ANCHO;
}
function empezar() {
  api.setPref('cfg', cfg);
  S = A.crear({ modo: cfg.modo, nivel: cfg.nivel, meta: cfg.meta }); reg = false; rastro = []; cartel = null; api.borrar();
  armar(); guardar();
}
function seguir() {
  if (!S || S.fase === 'fin') return;
  if (S.fase === 'listo' || S.fase === 'pausa') S.fase = S.espera > 0 ? 'gol' : 'juego';
  pintarOver(); cancelAnimationFrame(raf); tPrev = performance.now(); raf = requestAnimationFrame(bucle);
}
function pausar() {
  if (!S || (S.fase !== 'juego' && S.fase !== 'gol')) return;
  S.fase = 'pausa'; cancelAnimationFrame(raf); raf = 0; teclas = {}; dedos.clear(); obj = [null, null]; guardar(); pintarOver();
}

/* ---------- entrada: dedos, ratón y flechas ---------- */
function aMesa(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * A.ANCHO, y: (e.clientY - r.top) / r.height * A.ALTO }; }
function dedoAbajo(e) {
  if (!S) return;
  if (S.fase === 'listo' || S.fase === 'pausa') seguir();
  const p = aMesa(e), j = S.modo === 'dos' && p.y < A.ALTO / 2 ? 1 : 0;     // contra la CPU, cualquier dedo mueve tu mazo
  if ([...dedos.values()].includes(j)) return;                             // ese lado ya tiene un dedo
  dedos.set(e.pointerId, j); obj[j] = p; try { cv.setPointerCapture(e.pointerId); } catch { /* puntero ya liberado */ } e.preventDefault();
}
function dedoMueve(e) { const j = dedos.get(e.pointerId); if (j === undefined) { if (e.pointerType === 'mouse' && S && S.fase === 'juego') obj[0] = aMesa(e); return; } obj[j] = aMesa(e); }
function dedoArriba(e) { const j = dedos.get(e.pointerId); if (j === undefined) return; dedos.delete(e.pointerId); obj[j] = null; }
function objetivoTeclado(dt) {
  const dx = (teclas.ArrowRight ? 1 : 0) - (teclas.ArrowLeft ? 1 : 0), dy = (teclas.ArrowDown ? 1 : 0) - (teclas.ArrowUp ? 1 : 0);
  if (!dx && !dy) return null;
  const m = S.m[0], v = 1700 * dt * 4;
  return { x: m.x + dx * v, y: m.y + dy * v };
}

/* ---------- bucle ---------- */
function bucle(t) {
  if (!S || !cv) return;
  const dt = Math.max(1 / 240, Math.min((t - tPrev) / 1000, 1 / 20)); tPrev = t;
  if (S.fase === 'juego' || S.fase === 'gol') {
    const o0 = objetivoTeclado(dt) || obj[0];
    const ev = A.avanzar(S, dt, [o0, S.modo === 'dos' ? obj[1] : null]);
    efectos(ev);
    rastro.push({ x: S.disco.x, y: S.disco.y }); if (rastro.length > 10) rastro.shift();
  }
  if (cartel) { cartel.t -= dt; if (cartel.t <= 0) cartel = null; }
  dibujar(); pintarHud();
  if (S && S.fase !== 'pausa' && S.fase !== 'fin') raf = requestAnimationFrame(bucle);
}
function efectos(ev) {
  if (!ev.length) return;
  const ahora = performance.now();
  if (ev.includes('golpe') && ahora - ultGolpe > 70) { ultGolpe = ahora; api.sonido('click'); api.vibrar(12); }
  for (const g of ['gol0', 'gol1']) if (ev.includes(g)) {
    const j = +g[3], n = nombres(); rastro = [];
    cartel = { texto: S.modo === 'cpu' ? (j === 0 ? '¡GOOOL!' : 'Gol de la CPU') : `¡Gol de ${n[j]}!`, color: colJ(j), t: 1.1 };
    api.sonido(S.modo === 'cpu' && j === 1 ? 'error' : 'ok'); api.vibrar(j === 0 || S.modo === 'dos' ? [40, 30, 40] : 80); guardar();
  }
  if (ev.includes('fin')) terminar();
}
function terminar() {
  const g = A.ganador(S);
  if (!reg) {
    reg = true;
    if (S.modo === 'cpu') { api.registrar({ res: g === 0 ? 'victoria' : 'derrota', variante: `${A.NIVELES[S.nivel].nombre} · a ${S.meta}` }); api.sonido(g === 0 ? 'ganar' : 'perder'); if (g === 0) api.vibrar([60, 40, 60]); }
    else { api.registrar({ res: 'partida', variante: `2 jugadores · a ${S.meta}` }); api.sonido('ganar'); api.victoria(); }
  }
  guardar(); pintarOver();
}

/* ---------- dibujo ---------- */
function dibujar() {
  if (!cv || !S) return;
  const k = esc * dpr, W = A.ANCHO, H = A.ALTO, bocaX = (W - A.PORTERIA) / 2, v = asp.valores;
  const zona = $('#ahZona'), mesa = MESAS.some(m => m[0] === v.mesa) ? v.mesa : 'clasica-1', url = `url(${IMG}mesa-${mesa}.webp)`;
  if (zona && zona.dataset.mesa !== mesa) { zona.dataset.mesa = mesa; zona.style.backgroundImage = url; }
  ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(bocaX, 0, A.PORTERIA, 8); ctx.fillRect(bocaX, H - 8, A.PORTERIA, 8);      // bocas de las porterías
  // estela y disco
  const d = S.disco, di = imgDe('disco-' + (DISCOS.some(x => x[0] === v.disco) ? v.disco : 'crema')), ok = i => i.complete && i.naturalWidth;
  const estelaCol = { crema: '#FBF3E2', cian: '#4FD6C4', verde: '#3CC63C', rojo: '#D82A2A' }[v.disco] || '#FBF3E2';
  rastro.forEach((p, i) => { ctx.globalAlpha = (i + 1) / rastro.length * .22; ctx.fillStyle = estelaCol; ctx.beginPath(); ctx.arc(p.x, p.y, A.R_DISCO * (.5 + i / rastro.length / 2), 0, Math.PI * 2); ctx.fill(); });
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.arc(d.x + 4, d.y + 6, A.R_DISCO, 0, Math.PI * 2); ctx.fill();
  const rd = A.R_DISCO * 1.12; if (ok(di)) ctx.drawImage(di, d.x - rd, d.y - rd, rd * 2, rd * 2); else { ctx.fillStyle = estelaCol; ctx.beginPath(); ctx.arc(d.x, d.y, A.R_DISCO, 0, Math.PI * 2); ctx.fill(); }
  // mazos
  S.m.forEach((m, j) => {
    const id = j === 0 ? v.mazo : v.mazo2, nombre = COLM[id] ? id : (j === 0 ? 'rojo' : 'azul'), im = imgDe('mazo-' + nombre), r = A.R_MAZO * 1.14;
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.arc(m.x + 4, m.y + 7, A.R_MAZO, 0, Math.PI * 2); ctx.fill();
    if (ok(im)) ctx.drawImage(im, m.x - r, m.y - r, r * 2, r * 2); else { ctx.fillStyle = COLM[nombre]; ctx.beginPath(); ctx.arc(m.x, m.y, A.R_MAZO, 0, Math.PI * 2); ctx.fill(); }
    const emo = j === 0 ? emojiPersonaje(asp) : null;      // «Personajes»: tu mazo lleva tu personaje
    if (emo) { ctx.font = `${Math.round(A.R_MAZO * 1.2)}px system-ui,'Apple Color Emoji','Segoe UI Emoji',sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(emo, m.x, m.y - A.R_MAZO * .1); }
  });
  if (cartel) {
    ctx.globalAlpha = Math.min(1, cartel.t * 2); ctx.fillStyle = cartel.color; ctx.font = "800 64px 'Baloo 2', system-ui, sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 10; ctx.strokeText(cartel.texto, W / 2, H / 2); ctx.fillText(cartel.texto, W / 2, H / 2); ctx.globalAlpha = 1;
  }
}
function pintarHud() {
  const h = $('#ahHud'); if (!h || !S) return;
  const n = nombres(), html = `<span style="--c:${colJ(0)}"><small>${n[0]}</small><b>${S.goles[0]}</b></span><em>a ${S.meta}${S.modo === 'cpu' ? ` · ${A.NIVELES[S.nivel].nombre}` : ''}</em><span style="--c:${colJ(1)}"><small>${n[1]}</small><b>${S.goles[1]}</b></span>`;
  if (html !== hudAnt) { hudAnt = html; h.innerHTML = html; }
}
function pintarOver() {
  const o = $('#ahOver'); if (!o || !S) return;
  const n = nombres();
  if (S.fase === 'juego' || S.fase === 'gol') { o.hidden = true; return; }
  o.hidden = false;
  if (S.fase === 'fin') {
    const g = A.ganador(S), gano = S.modo === 'cpu' ? g === 0 : null;
    o.innerHTML = `<div class="fin"><b>${gano === null ? `🏆 ¡Gana ${n[g]}!` : gano ? '🏆 ¡Has ganado!' : 'Ha ganado la CPU'}</b><span class="g">${S.goles[0]} – ${S.goles[1]}</span><span>${S.golpes} golpes · tiro más rápido ${Math.round(S.maxVel / 10)} km/h</span><span class="bts"><button class="btn on" data-ac="start">🔁 Revancha</button><button class="btn" data-ac="opciones">Opciones</button></span></div>`;
  } else o.innerHTML = `<div><b>${S.fase === 'pausa' ? '⏸️ En pausa' : '🏒 ¿Preparado?'}</b><span>${S.modo === 'dos' ? 'Cada jugador mueve su mazo desde su mitad' : 'Arrastra tu mazo por tu mitad de la mesa'}</span><span>Toca para ${S.fase === 'pausa' ? 'seguir' : 'empezar'}</span></div>`;
}

/* ---------- botones ---------- */
function clic(e) {
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.cfg) { cfg[d.cfg] = d.cfg === 'meta' ? +d.v : d.v; api.setPref('cfg', cfg); return setup(); }
  const a = d.ac;
  if (a === 'start') { e.stopPropagation(); empezar(); }
  else if (a === 'seguir') { armar(); } else if (a === 'pausa') { if (S && (S.fase === 'juego' || S.fase === 'gol')) pausar(); else seguir(); }
  else if (a === 'opciones') { e.stopPropagation(); pausar(); setup(); } else if (a === 'aspecto') { pausar(); asp.abrir(); } else if (a === 'reglas') { pausar(); reglas(); }
}
function reglas() {
  api.modal('Air Hockey', `<ul><li>Arrastra tu mazo (el de abajo) para golpear el disco y meterlo en la portería de arriba. Solo puedes moverte por tu mitad.</li>
    <li>Cuanto más rápido muevas el mazo al golpear, más fuerte sale el disco. Los rebotes en las bandas sirven para engañar al rival.</li>
    <li>Tras cada gol saca quien lo ha recibido. Gana quien llegue antes a los goles elegidos (5, 7 o 10).</li>
    <li><b>2 jugadores</b>: poned el móvil plano sobre la mesa; cada uno juega con un dedo en su mitad, a la vez.</li>
    <li>También puedes jugar con el ratón o con las flechas del teclado. Espacio o P para pausar.</li></ul>`);
}
