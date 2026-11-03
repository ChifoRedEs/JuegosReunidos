// Bingo Mobile — el bingo de bolsillo: tus cartones en 3D, el bombo y el tablero, hasta 8 jugadores CPU que cantan línea y bingo, fichas y apuestas.
// Marcas a mano o automáticas, uno o varios premios de línea, la voz del dispositivo canta las bolas.
import { $, esc } from '../../core/dom.js';
import * as B from '../../core/bingo/motor.js';
import * as Par from '../../core/bingo/partida.js';
import { APODOS } from '../../core/bingo/apodos.js';
import { hablar, parar as pararVoz, estadoVoz, avisoSinVoz } from '../../core/bingo/voz.js';
import { crearVista, colorBola } from '../../core/bingo/vista3d.js';
import { crearCartones } from '../../core/bingo/cartones3d.js';
import { grupoFondo } from '../../core/aspectos.js';
import { gruposFichas, estilo, lienzoTextura } from '../../core/fichas.js';

let api = null, root = null, asp = null, cfg = {}, G = null, V = null, CV = null, ocupado = false, timer = 0, cuenta = 0, tCuenta = 0, vivo = false, tok = 0, banco = 500, claim = null, tClaim = 0, calAnt = '';
const COLORES_MARCA = { rojo: '#E5322D', azul: '#1E6FE5', verde: '#1E9E5A', morado: '#7B3FD1' };

/* ---------- datos ---------- */
export const validar = d => Par.validar(d);
export const migrarV1 = d => d;
export const resumen = Par.resumen;
const guardar = () => { const r = Par.resumen(G); api.guardar(G, r.texto, r.fin); };
const CFG = [
  { k: 'cpus', t: '🤖 Jugadores CPU', def: '4', o: ['0', '1', '2', '4', '6', '8'].map(x => [x, x]), nueva: 1 },
  { k: 'cartones', t: '🎫 Tus cartones', def: '2', o: ['1', '2', '3', '4', '6'].map(x => [x, x]), nueva: 1 },
  { k: 'apuesta', t: '💰 Apuesta por cartón (fichas)', def: '10', o: ['5', '10', '20', '50'].map(x => [x, x]), nueva: 1 },
  { k: 'premios', t: '🏆 Premios', def: 'lb', o: [['b', 'Solo Bingo'], ['lb', 'Línea y Bingo'], ['llb', 'Dos líneas y Bingo']], nueva: 1 },
  { k: 'marcado', t: '✍️ Marcar números', def: 'manual', o: [['manual', 'A mano'], ['auto', 'Automático']] },
  { k: 'saca', t: '🎱 Sacar bola', def: 'boton', o: [['boton', 'Con el botón'], ['auto', 'Automático']] },
  { k: 'tiempo', t: '⏱️ Tiempo entre bolas (modo automático)', def: '8', o: ['5', '8', '12', '20', '30'].map(t => [t, t + ' s']) },
  { k: 'apodos', t: '🗣️ Apodos', def: 'tombola', o: [['numero', 'Solo el número'], ['tombola', 'Los de la tómbola']] },
  { k: 'voz', t: '🔊 Voz', def: 'si', o: [['si', 'Cantar las bolas'], ['no', 'Sin voz']] },
];
const val = k => { const c = CFG.find(x => x.k === k); return c ? (cfg[k] || c.def) : (asp && asp.valores[k]) || ''; };
const yo = () => G.jug[0];
const guardarBanco = () => api.setPref('fichas', banco);

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; vivo = true; ocupado = false; tok++; claim = null;
  cfg = { ...(api.pref('cfg', null) || {}) }; banco = +api.pref('fichas', 500); if (!(banco >= 0)) banco = 500;
  asp = api.aspecto([
    grupoFondo('#bmEsc'),
    { clave: 'bolas', titulo: 'Bolas · Color', icono: '🎨', def: 'clasico', opciones: [{ id: 'clasico', nombre: 'Clásicas', sw: ['#E53935', '#F9C80E', '#1E88E5'] }, { id: 'pastel', nombre: 'Pastel', sw: ['#F28B82', '#FDE293', '#8AB4F8'] }, { id: 'neon', nombre: 'Neón', sw: ['#FF1744', '#FFEA00', '#2979FF'] }] },
    ...gruposFichas({ clave: 'bola', titulo: 'Bola', color: false, formas: false, tamano: false, tituloEstilos: 'Texturas', icono: '✨' }),
    { clave: 'marca', titulo: 'Color de las marcas', icono: '🔴', def: 'rojo', opciones: Object.entries(COLORES_MARCA).map(([id, c]) => ({ id, nombre: id[0].toUpperCase() + id.slice(1), sw: [c] })) },
    { clave: 'calidad', titulo: 'Calidad 3D', icono: '🧊', def: 'alta', opciones: [{ id: 'alta', nombre: 'Alta' }, { id: 'ligera', nombre: 'Ligera (móviles flojos)' }] },
  ], alCambiar);
  await api.css(new URL('./bingomobile.css', import.meta.url));
  armar();
  api.barra({ etiqueta: 'Nueva partida', nueva: () => nuevaPartida(false), salir: () => { parar(); location.hash = '#/cat/tablero'; }, pausar: () => parar(), reanudar: o => { if (o === 'salir') programar(); }, config: { pantalla: () => configuracion() } });
  api.menu([{ texto: 'Reglas del Bingo Mobile', accion: reglas }]);
  root.addEventListener('click', clic);
  const previa = api.cargar(); G = previa && !previa.fin ? previa : null;
  await montarVistas();
  if (!G) nuevaPartida(true); else { restaurar(); }
  hud(); botones(); jugadores(); programar();
}
export function unmount() {
  vivo = false; tok++; clearTimeout(timer); clearInterval(tCuenta); clearTimeout(tClaim); pararVoz();
  if (root) root.removeEventListener('click', clic);
  for (const x of [V, CV]) if (x) { try { x.destruir(); } catch { /* nada */ } }
  V = CV = null; root = null;
}
function alCambiar() {
  if (!root) return;
  if (val('calidad') !== calAnt) { calAnt = val('calidad'); montarVistas().then(() => { restaurar(); hud(); }); }
  else { if (V && V.paleta) V.paleta(val('bolas') || 'clasico'); if (CV) CV.color(COLORES_MARCA[val('marca')] || COLORES_MARCA.rojo); }
  hud(); botones(); programar();
}

/* ---------- pantalla ---------- */
function armar() {
  root.innerHTML = `<div class="bgHud" id="bmHud"></div>
    <div class="bmWrap"><div class="bgEsc bmEsc" id="bmEsc"></div>
    <div class="bmAcc" id="bmAcc"><button class="btn on" id="bmSacar" data-ac="sacar">🎱 Sacar bola</button><button class="btn bmL" id="bmLinea" data-ac="linea">🙋 ¡Línea!</button><button class="btn bmB" id="bmBingo" data-ac="bingo">🏆 ¡Bingo!</button></div></div>
    <p class="note bgNota" id="bmNota"></p>
    <div class="bmCar" id="bmCar"></div>
    <div class="bmJug" id="bmJug"></div>${api.barraHtml()}`;
}
async function montarVistas() {
  const mio = ++tok, h1 = $('#bmEsc'), h2 = $('#bmCar'); if (!h1 || !h2) return;
  for (const x of [V, CV]) if (x) { try { x.destruir(); } catch { /* nada */ } }
  V = CV = null; h1.innerHTML = ''; h2.innerHTML = ''; calAnt = val('calidad');
  const mk = async f => { try { return await f(val('calidad')); } catch { return await f('2d'); } };
  const v = await mk(c => crearVista(h1, { calidad: c, paleta: val('bolas') || 'clasico', escala: .62, zonaArribaPx: 138, bomboAbajo: true, reservaPx: 130, alDisponer: colocarBotones, alTocarBombo: () => sacar() }));
  const cv = await mk(c => crearCartones(h2, { calidad: c, colorMarca: COLORES_MARCA[val('marca')] || COLORES_MARCA.rojo, alTocar: tocarCelda }));
  if (!vivo || mio !== tok) { v.destruir(); cv.destruir(); return; }
  V = v; CV = cv;
}
function restaurar() {
  if (!G || !V || !CV) return;
  G.orden.slice(0, G.n).forEach(n => V.encender(n));
  CV.poner(yo().cartones); yo().cartones.forEach((_, i) => CV.marcas(i, new Set(yo().marcas[i])));
}
// Los botones llenan el hueco libre del panel (calculado por la vista): a la derecha del bombo en vertical y encima del bombo en horizontal
function colocarBotones(i) {
  const a = $('#bmAcc'); if (!a) return;
  const z = i.zona || (i.vertical ? { left: 190, top: 8, width: 150, height: 120 } : { left: 8, top: 8, width: 150, height: 120 });
  Object.assign(a.style, { left: z.left + 'px', top: z.top + 'px', width: z.width + 'px', height: z.height + 'px', right: 'auto', transform: 'none' });
}
const cacheTex = new Map();
function fondoBola(hex) {
  const est = estilo(asp ? asp.valores : {}, 'bola'); if (!est.tex) return '';
  const k = hex + est.tex; if (!cacheTex.has(k)) { try { cacheTex.set(k, lienzoTextura(hex, est, 128).toDataURL()); } catch { cacheTex.set(k, ''); } }
  return cacheTex.get(k) ? `--tx:url(${cacheTex.get(k)}) center/cover;` : '';
}
const nombreDe = id => G.jug[id].nombre;
function hud() {
  const h = $('#bmHud'); if (!h || !G) return; const n = G.n ? G.orden[G.n - 1] : 0, pal = val('bolas') || 'clasico';
  const ult = G.orden.slice(Math.max(0, G.n - 6), G.n).reverse();
  const chips = G.premios.map(p => { const ok = p.g.length; return `<span class="bgChip ${ok ? 'ok' : ''}">${ok ? '✓ ' : ''}${Par.ETIQUETA[p.id]}${ok ? ' · ' + esc(p.g.map(nombreDe).join(', ')) : ''}</span>`; }).join('');
  h.innerHTML = `<div class="bgAct">${n ? `<b class="bgBola" style="--c:${colorBola(pal, n)};${fondoBola(colorBola(pal, n))}"><em>${n}</em></b><span class="bgApodo">${val('apodos') === 'numero' ? '' : esc(APODOS[n - 1])}</span>` : '<span class="bgApodo">Pulsa «Sacar bola» para empezar</span>'}</div>
    <div class="bgInfo"><b>Bola ${G.n} de 90</b><div class="bgUlt">${ult.slice(1).map(x => `<i style="--c:${colorBola(pal, x)}">${x}</i>`).join('')}</div><div class="bgChips"><span class="bgChip bmFi">💰 ${banco}</span><span class="bgChip">🏦 Bote ${G.bote}</span></div></div>
    <div class="bgChips bmPrem">${chips}</div>`;
}
function botones() {
  const b = $('#bmSacar'); if (!b || !G) return; const auto = val('saca') === 'auto', fin = G.fin || G.n >= 90, pend = Par.pendiente(G);
  b.disabled = ocupado || fin;
  b.textContent = fin ? '🏁 Fin' : auto ? (cuenta > 0 ? `⏳ ${cuenta} s` : '🎱 Sacar ya') : '🎱 Sacar bola';
  const l = $('#bmLinea'), g = $('#bmBingo');
  if (l) { l.hidden = G.premiosTipo === 'b'; l.disabled = fin || ocupado || !pend || pend === 'b'; }
  if (g) g.disabled = fin || ocupado;
  const nota = $('#bmNota'); if (nota) nota.textContent = val('marcado') === 'auto' ? 'Marcado automático: tus números se marcan solos.' : 'Toca en tus cartones los números que vayan saliendo. ¡Y canta línea y bingo antes que los demás!';
}
function jugadores() {
  const c = $('#bmJug'); if (!c || !G) return;
  c.innerHTML = '<b class="bmTit">Jugadores</b>' + G.jug.map(j => {
    const f = Par.faltanJugador(j), l = Par.faltanLinea(j), gana = G.premios.filter(p => p.g.includes(j.id)).map(p => `${Par.ETIQUETA[p.id]} +${p.imp}`).join(' · ');
    return `<div class="bmFila ${j.cpu ? '' : 'yo'} ${f <= 3 ? 'cerca' : ''}"><span class="bmAv">${j.e}</span><b>${esc(j.nombre)}</b><small>${j.cartones.length > 1 ? j.cartones.length + ' cartones · ' : ''}${G.n ? `línea a ${l} · bingo a ${f}` : ''}</small><em>${esc(gana)}</em></div>`;
  }).join('');
}

/* ---------- partida ---------- */
function nuevaPartida(forzar) {
  if (!forzar && G && !G.fin && G.n > 0 && !api.confirmar('¿Empezar una partida nueva? Pierdes la actual (las apuestas no se devuelven).')) return;
  parar(); claim = null;
  G = Par.crear({ cpus: +val('cpus'), cartones: +val('cartones'), apuesta: +val('apuesta'), premios: val('premios') });
  const coste = Par.coste(G);
  if (banco < coste) { banco = Math.max(500, coste); api.aviso('La banca te presta fichas: ahora tienes ' + banco + ' 💰'); }
  banco -= coste; guardarBanco(); ocupado = false;
  if (V) V.reiniciar(); if (CV) { CV.poner(yo().cartones); }
  guardar(); hud(); botones(); jugadores(); programar();
}
async function sacar() {
  if (!vivo || ocupado || !V || !G || G.fin || G.n >= 90) return;
  if (document.querySelector('.modal')) return;
  flushClaim(); if (G.fin) return;
  clearTimeout(timer); clearInterval(tCuenta); cuenta = 0; ocupado = true; botones();
  const n = Par.sacarBola(G, val('marcado') === 'auto'); guardar();
  let hablado = Promise.resolve();
  await V.sacar(n, {
    alAgitar: () => api.sonido('bombo'),
    alSalir: () => { if (val('voz') !== 'no') hablado = cantar(n); },
    alLlegar: () => { hud(); api.sonido('bola'); if (val('marcado') === 'auto' && CV) yo().cartones.forEach((c, i) => { if (B.numerosDe(c).includes(n)) CV.marcas(i, new Set(yo().marcas[i]), n); }); jugadores(); },
  });
  await hablado;
  ocupado = false; if (G.n >= 90 && !G.fin) { G.fin = true; guardar(); }
  hud(); botones(); jugadores(); evaluarCPU();
  if (G.fin) finPartida(); else programar();
}
async function cantar(n) {
  const est = estadoVoz();
  if (!est.hay) { if (avisoSinVoz()) api.aviso('Este dispositivo no tiene voz: se ven los números en pantalla.'); return false; }
  const ok = await hablar(B.frase(n, val('apodos') || 'tombola', APODOS[n - 1]));
  if (!ok && avisoSinVoz()) api.aviso(est.local ? 'No se pudo cantar la bola.' : 'Sin conexión puede que no haya voz: instala una voz en español en los ajustes del dispositivo.');
  return ok;
}
function programar() {
  clearTimeout(timer); clearInterval(tCuenta); cuenta = 0; botones();
  if (!vivo || !G || val('saca') !== 'auto' || G.fin || G.n >= 90 || ocupado) return;
  cuenta = Math.max(3, +val('tiempo') || 8); botones();
  tCuenta = setInterval(() => { if (!document.querySelector('.modal') && !document.hidden) cuenta = Math.max(0, cuenta - 1); botones(); }, 1000);
  const espera = () => { if (!vivo) return; if (cuenta > 0 || document.querySelector('.modal') || document.hidden) { timer = setTimeout(espera, 400); return; } clearInterval(tCuenta); sacar(); };
  timer = setTimeout(espera, 400);
}
function parar() { clearTimeout(timer); clearInterval(tCuenta); cuenta = 0; pararVoz(); }

/* ---------- marcar y cantar ---------- */
function tocarCelda(ci, r, c, n) {
  if (!G || G.fin || !n || val('marcado') === 'auto') return;
  let res = ocupado && n === G.orden[G.n - 1] ? 'no-salio' : Par.marcar(G, ci, n);
  if (res === 'ok') { CV.marcas(ci, new Set(yo().marcas[ci]), n); api.sonido('tic'); guardar(); jugadores(); }
  else if (res === 'no-salio') { api.sonido('error'); api.aviso(`El ${n} todavía no ha salido.`); }
}
// Las CPU cantan un poco después de que salga la bola: tienes unos segundos para ganarles
function evaluarCPU() {
  if (!G || G.fin || claim) return;
  const id = Par.pendiente(G), cs = id ? Par.candidatosCPU(G) : []; if (!cs.length) return;
  const ret = cs.map(j => ({ id: j.id, d: 1100 + Math.random() * 2600 })).sort((a, b) => a.d - b.d);
  claim = { id, gan: ret.filter(x => x.d <= ret[0].d + 350).map(x => x.id) };
  clearTimeout(tClaim); tClaim = setTimeout(resolverCPU, ret[0].d);
}
function resolverCPU() {
  if (!claim || !G) return; const { id, gan } = claim; claim = null; clearTimeout(tClaim);
  if (Par.pendiente(G) !== id) return;
  anunciar(id, gan);
  if (!G.fin) evaluarCPU();
}
function flushClaim() { if (claim) resolverCPU(); }
function anunciar(id, gan) {
  const imp = Par.adjudicar(G, id, gan), nombres = gan.map(nombreDe).join(' y ');
  if (gan.includes(0)) { banco += imp; guardarBanco(); api.sonido('ganar'); api.vibrar && api.vibrar(); }
  guardar(); hud(); jugadores(); botones();
  const txt = `${gan.includes(0) ? '🎉 ¡' + Par.ETIQUETA[id] + ' para ti!' : `${Par.ETIQUETA[id] === 'Bingo' ? '😮' : '📣'} ${nombres} canta${gan.length > 1 ? 'n' : ''} ${Par.ETIQUETA[id].toLowerCase()}`}: +${imp} 💰`;
  api.aviso(txt);
  if (val('voz') !== 'no') hablar(gan.includes(0) ? `¡${Par.ETIQUETA[id]} correcto!` : `¡${Par.ETIQUETA[id]} de ${nombres}!`);
  if (G.fin) finPartida();
}
function cantarMio(tipo) {
  if (!G || G.fin || ocupado) return; const id = Par.pendiente(G); if (!id) return;
  const quiero = tipo === 'bingo' ? 'b' : (id === 'b' ? null : id);
  if (!quiero) { api.aviso('Las líneas ya están cantadas.'); return; }
  if (!Par.cumple(yo(), id)) { api.sonido('error'); api.aviso(tipo === 'bingo' ? '¡Falsa alarma! Aún no tienes bingo (¿te falta marcar algún número?).' : '¡Falsa alarma! Todavía no tienes ninguna línea completa marcada.'); return; }
  if (quiero !== id) { api.aviso('Antes toca ' + Par.ETIQUETA[id].toLowerCase() + '.'); return; }
  if (claim) { clearTimeout(tClaim); claim = null; }
  anunciar(id, [0]); if (!G.fin) evaluarCPU();
}
function finPartida() {
  parar(); clearTimeout(tClaim); claim = null;
  const gane = G.premios.some(p => p.id === 'b' && p.g.includes(0)), tot = yo().ganado;
  if (!G.reg) { G.reg = true; api.registrar({ res: gane ? 'victoria' : 'derrota', variante: `${G.jug.length - 1} CPU · ${yo().cartones.length} cartón${yo().cartones.length > 1 ? 'es' : ''}` }); guardar(); }
  hud(); botones(); jugadores();
  const filas = G.premios.map(p => `<li><b>${Par.ETIQUETA[p.id]}</b>: ${p.g.length ? esc(p.g.map(nombreDe).join(', ')) + ' (+' + p.imp + ')' : 'nadie'}</li>`).join('');
  const m = api.modal(gane ? '🏆 ¡Bingo!' : '🎱 Fin de la partida', `<ul>${filas}</ul><p>Has ganado <b>${tot}</b> fichas en esta partida (apostaste ${Par.coste(G)}). Ahora tienes <b>${banco}</b> 💰.</p><div class="bar"><button class="btn on" data-bm="otra">Jugar otra</button></div>`);
  m.cuerpo.addEventListener('click', e => { if (e.target.closest('[data-bm="otra"]')) { m.cerrar(); nuevaPartida(true); } });
}

/* ---------- configuración y ayuda ---------- */
function configuracion() {
  const cuerpo = () => CFG.map(c => `<div class="bgCfg"><b>${c.t}</b><div class="seg">${c.o.map(([id, n]) => `<button class="btn ${val(c.k) === id ? 'on' : ''}" data-cf="${c.k}" data-v="${id}">${n}</button>`).join('')}</div></div>`).join('');
  const m = api.modal('⚙️ Configuración de pantalla', `<div id="bgCfgC">${cuerpo()}</div><p class="note">Jugadores, cartones, apuesta y premios valen para la <b>siguiente</b> partida. El aspecto está en 🎨 Apariencia.</p>`);
  m.cuerpo.addEventListener('click', e => {
    const b = e.target.closest('[data-cf]'); if (!b) return;
    cfg[b.dataset.cf] = b.dataset.v; api.setPref('cfg', { ...cfg }); m.cuerpo.querySelector('#bgCfgC').innerHTML = cuerpo(); hud(); botones();
  });
  const o = new MutationObserver(() => { if (!document.body.contains(m.cuerpo)) { o.disconnect(); programar(); } }); o.observe(document.body, { childList: true, subtree: true });
}
function reglas() {
  api.modal('📖 Bingo Mobile', `<p>Bingo de <b>90 bolas</b> con cartones de 3 filas × 9 columnas (15 números). Cada cartón cuesta lo que apuestes; todas las apuestas forman el <b>bote</b>.</p>
  <ul><li>Pulsa <b>🎱 Sacar bola</b> (o déjalo automático): la bola sale del bombo, baja por el carril y se canta.</li>
  <li><b>Marca</b> en tus cartones los números que salgan (o activa el marcado automático en ⚙️ Configurar partida).</li>
  <li>Con una fila completa pulsa <b>🙋 ¡Línea!</b>; con el cartón entero, <b>🏆 ¡Bingo!</b>. Las CPU cantan unos segundos después de completar: ¡sé más rápido!</li>
  <li>Premios del bote: solo bingo; línea (20 %) y bingo (80 %); o dos líneas (15 % + 15 %) y bingo (70 %). Si cantas sin tenerlo, es falsa alarma.</li>
  <li>Las fichas se guardan entre partidas; si te quedas sin ellas, la banca te presta 500.</li></ul>`);
}
function clic(e) {
  const b = e.target.closest('[data-ac]'); if (!b) return;
  const a = b.dataset.ac; if (a === 'sacar') sacar(); else cantarMio(a);
}
