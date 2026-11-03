// Bingo Live — el bingo de sala: la pantalla es el tablero de las 90 bolas (bombo, carril y tablero en 3D), un botón saca la bola y la voz del
// dispositivo la canta. Los jugadores usan cartones de papel; «Comprobar cartón» valida línea y bingo con los números que han salido.
import { $, esc } from '../../core/dom.js';
import * as B from '../../core/bingo/motor.js';
import { APODOS } from '../../core/bingo/apodos.js';
import { hablar, parar as pararVoz, estadoVoz, avisoSinVoz } from '../../core/bingo/voz.js';
import { crearVista, colorBola } from '../../core/bingo/vista3d.js';
import { grupoFondo } from '../../core/aspectos.js';
import { gruposFichas, estilo, lienzoTextura } from '../../core/fichas.js';

let api = null, root = null, asp = null, cfg = {}, S = null, V = null, ocupado = false, timer = 0, cuenta = 0, tCuenta = 0, vivo = false, tok = 0;

/* ---------- datos ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.orden) || d.orden.length !== 90) return null;
  if ([...d.orden].sort((a, b) => a - b).some((v, i) => v !== i + 1)) return null;
  if (!Number.isInteger(d.n) || d.n < 0 || d.n > 90) return null;
  const l = Number.isInteger(d.lineas) ? Math.max(0, Math.min(2, d.lineas)) : 0;
  return { orden: d.orden.slice(), n: d.n, lineas: l, bingo: !!d.bingo, reg: !!d.reg };
}
export const migrarV1 = d => d;
export function resumen(d) { return { texto: d.bingo ? `¡Bingo! · ${d.n} bolas` : `Bola ${d.n}/90${d.lineas ? ' · línea cantada' : ''}`, fin: !!d.bingo || d.n >= 90 }; }
const nueva = () => ({ orden: B.nuevoBombo(), n: 0, lineas: 0, bingo: false, reg: false });
const guardar = () => { const r = resumen(S); api.guardar(S, r.texto, r.fin); };
const CFG = [
  { k: 'apodos', t: '🗣️ Apodos', def: 'tombola', o: [['numero', 'Solo el número'], ['tombola', 'Los de la tómbola']] },
  { k: 'voz', t: '🔊 Voz', def: 'si', o: [['si', 'Cantar las bolas'], ['no', 'Sin voz']] },
  { k: 'saca', t: '🎱 Sacar bola', def: 'boton', o: [['boton', 'Con el botón'], ['auto', 'Automático']] },
  { k: 'tiempo', t: '⏱️ Tiempo entre bolas (modo automático)', def: '8', o: ['5', '8', '12', '20', '30'].map(t => [t, t + ' s']) },
  { k: 'premios', t: '🏆 Premios', def: 'lb', o: [['b', 'Solo Bingo'], ['lb', 'Línea y Bingo'], ['llb', 'Dos líneas y Bingo']] },
];
const val = k => { const c = CFG.find(x => x.k === k); return c ? (cfg[k] || c.def) : (asp && asp.valores[k]) || ''; };
const salidos = () => new Set(S.orden.slice(0, S.n));
const premios = () => val('premios') || 'lb';
const lineasMax = () => (premios() === 'llb' ? 2 : premios() === 'lb' ? 1 : 0);

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; vivo = true; ocupado = false; tok++;
  cfg = { ...(api.pref('cfg', null) || api.pref('aspecto', {}) || {}) };
  asp = api.aspecto([
    grupoFondo('#bgEsc'),
    { clave: 'bolas', titulo: 'Bolas · Color', icono: '🎨', def: 'clasico', opciones: [{ id: 'clasico', nombre: 'Clásicas', sw: ['#E53935', '#F9C80E', '#1E88E5'] }, { id: 'pastel', nombre: 'Pastel', sw: ['#F28B82', '#FDE293', '#8AB4F8'] }, { id: 'neon', nombre: 'Neón', sw: ['#FF1744', '#FFEA00', '#2979FF'] }] },
    ...gruposFichas({ clave: 'bola', titulo: 'Bola', color: false, formas: false, tamano: false, tituloEstilos: 'Texturas', icono: '✨' }),
    { clave: 'calidad', titulo: 'Calidad 3D', icono: '🧊', def: 'alta', opciones: [{ id: 'alta', nombre: 'Alta' }, { id: 'ligera', nombre: 'Ligera (móviles flojos)' }] },
  ], alCambiar);
  await api.css(new URL('./bingolive.css', import.meta.url));
  S = api.cargar() || nueva();
  armar();
  api.barra({ etiqueta: 'Nueva partida', nueva: nuevaPartida, salir: () => { parar(); location.hash = '#/cat/tablero'; }, pausar: () => parar(), reanudar: o => { if (o === 'salir') programar(); }, config: { pantalla: () => configuracion() } });
  api.menu([{ texto: 'Reglas del Bingo Live', accion: reglas }]);
  root.addEventListener('click', clic);
  await montarVista();
  hud(); botones(); programar();
}
export function unmount() {
  vivo = false; tok++; clearTimeout(timer); clearInterval(tCuenta); pararVoz();
  if (root) root.removeEventListener('click', clic);
  if (V) { try { V.destruir(); } catch { /* nada */ } V = null; }
  root = null;
}
let calAnt = '';
function alCambiar() {
  if (!root) return;
  if (val('calidad') !== calAnt) { calAnt = val('calidad'); montarVista().then(() => hud()); }
  else if (V && V.paleta) V.paleta(val('bolas') || 'clasico');
  hud(); botones(); programar();
}
function configuracion() {
  const cuerpo = () => CFG.map(c => `<div class="bgCfg"><b>${c.t}</b><div class="seg">${c.o.map(([id, n]) => `<button class="btn ${val(c.k) === id ? 'on' : ''}" data-cf="${c.k}" data-v="${id}">${n}</button>`).join('')}</div></div>`).join('');
  const m = api.modal('⚙️ Configuración de pantalla', `<div id="bgCfgC">${cuerpo()}</div><p class="note">El aspecto (colores de las bolas, texturas, tapete y calidad 3D) está en 🎨 Apariencia.</p>`);
  m.cuerpo.addEventListener('click', e => {
    const b = e.target.closest('[data-cf]'); if (!b) return;
    cfg[b.dataset.cf] = b.dataset.v; api.setPref('cfg', { ...cfg }); m.cuerpo.querySelector('#bgCfgC').innerHTML = cuerpo(); hud(); botones();
  });
  const o = new MutationObserver(() => { if (!document.body.contains(m.cuerpo)) { o.disconnect(); programar(); } }); o.observe(document.body, { childList: true, subtree: true });
}

/* ---------- pantalla ---------- */
function armar() {
  root.innerHTML = `<div class="bgHud" id="bgHud"></div>
    <div class="bgEsc" id="bgEsc"></div>
    <div class="bar bgAcc"><button class="btn on" id="bgSacar" data-ac="sacar">🎱 Sacar bola</button><button class="btn" data-ac="comprobar">🔍 Comprobar cartón</button></div>
    <p class="note bgNota" id="bgNota"></p>${api.barraHtml()}`;
}
async function montarVista() {
  const mio = ++tok, host = $('#bgEsc'); if (!host) return;
  if (V) { try { V.destruir(); } catch { /* nada */ } V = null; }
  host.innerHTML = ''; calAnt = val('calidad');
  let v = null;
  try { v = await crearVista(host, { calidad: val('calidad'), paleta: val('bolas') || 'clasico', alTocarBombo: () => sacar() }); } catch { v = await crearVista(host, { calidad: '2d' }); }
  if (!vivo || mio !== tok) { try { v.destruir(); } catch { /* nada */ } return; }
  V = v; S.orden.slice(0, S.n).forEach(n => V.encender(n));
}
const fraseDe = n => B.frase(n, val('apodos') || 'tombola', APODOS[n - 1]);
function hud() {
  const h = $('#bgHud'); if (!h) return; const n = S.n ? S.orden[S.n - 1] : 0;
  const ult = S.orden.slice(Math.max(0, S.n - 6), S.n).reverse(), pal = val('bolas') || 'clasico';
  const chip = (t, ok) => `<span class="bgChip ${ok ? 'ok' : ''}">${ok ? '✓ ' : ''}${t}</span>`;
  const p = premios(), chips = (p === 'llb' ? [chip('1.ª línea', S.lineas >= 1), chip('2.ª línea', S.lineas >= 2)] : p === 'lb' ? [chip('Línea', S.lineas >= 1)] : []).concat(chip('Bingo', S.bingo)).join('');
  h.innerHTML = `<div class="bgAct">${n ? `<b class="bgBola" style="--c:${colorBola(pal, n)};${fondoBola(colorBola(pal, n))}"><em>${n}</em></b><span class="bgApodo">${val('apodos') === 'numero' ? '' : esc(APODOS[n - 1])}</span>` : '<span class="bgApodo">Pulsa «Sacar bola» para empezar</span>'}</div>
    <div class="bgInfo"><b>Bola ${S.n} de 90</b><div class="bgUlt">${ult.slice(1).map(x => `<i style="--c:${colorBola(pal, x)}">${x}</i>`).join('')}</div><div class="bgChips">${chips}</div></div>`;
}
const cacheTex = new Map();
function fondoBola(hex) {                                              // textura elegida para la bola grande de arriba (Apariencia → Texturas)
  const est = estilo(asp ? asp.valores : {}, 'bola'); if (!est.tex) return '';
  const k = hex + est.tex; if (!cacheTex.has(k)) { try { cacheTex.set(k, lienzoTextura(hex, est, 128).toDataURL()); } catch { cacheTex.set(k, ''); } }
  return cacheTex.get(k) ? `--tx:url(${cacheTex.get(k)}) center/cover;` : '';
}
function botones() {
  const b = $('#bgSacar'); if (!b) return; const auto = val('saca') === 'auto', fin = S.n >= 90;
  b.disabled = ocupado || fin || (auto && false);
  b.textContent = fin ? '🏁 Fin de las bolas' : auto ? (cuenta > 0 ? `⏳ Siguiente en ${cuenta} s` : '🎱 Sacar bola ahora') : '🎱 Sacar bola';
  const nota = $('#bgNota'); if (nota) nota.textContent = auto ? `Modo automático: una bola cada ${val('tiempo') || 8} segundos.` : '';
}

/* ---------- sacar bolas ---------- */
async function sacar() {
  if (!vivo || ocupado || !V || S.n >= 90 || S.bingo) { if (S && S.n >= 90) botones(); return; }
  if (document.querySelector('.modal')) return;
  clearTimeout(timer); clearInterval(tCuenta); cuenta = 0; ocupado = true; botones();
  const n = S.orden[S.n]; S.n++; guardar();
  let hablado = Promise.resolve();
  await V.sacar(n, {
    alAgitar: () => api.sonido('bombo'),
    alSalir: () => { if (val('voz') !== 'no') hablado = cantar(n); },
    alLlegar: () => { hud(); api.sonido('bola'); },
  });
  await hablado;
  ocupado = false; hud(); botones();
  if (S.n >= 90) finPartida(false);
  programar();
}
async function cantar(n) {
  const est = estadoVoz();
  if (!est.hay) { if (avisoSinVoz()) api.aviso('Este dispositivo no tiene voz: se ven los números en pantalla.'); return false; }
  const ok = await hablar(fraseDe(n));
  if (!ok && avisoSinVoz()) api.aviso(est.local ? 'No se pudo cantar la bola.' : 'Sin conexión puede que no haya voz: instala una voz en español en los ajustes del dispositivo.');
  return ok;
}
function programar() {
  clearTimeout(timer); clearInterval(tCuenta); cuenta = 0; botones();
  if (!vivo || val('saca') !== 'auto' || S.n >= 90 || S.bingo || ocupado) return;
  const seg = Math.max(3, +val('tiempo') || 8); cuenta = seg; botones();
  tCuenta = setInterval(() => { if (!document.querySelector('.modal') && !document.hidden) cuenta = Math.max(0, cuenta - 1); botones(); }, 1000);
  const espera = () => { if (!vivo) return; if (cuenta > 0 || document.querySelector('.modal') || document.hidden) { timer = setTimeout(espera, 400); return; } clearInterval(tCuenta); sacar(); };
  timer = setTimeout(espera, 400);
}
function parar() { clearTimeout(timer); clearInterval(tCuenta); cuenta = 0; pararVoz(); }

/* ---------- comprobar un cartón (panel táctil) ---------- */
// Línea: se comprueban solo los 5 números de la línea. Bingo: los 15 números del cartón. Se eligen tocando los números en un mini-panel del 1 al 90.
function comprobarCarton() {
  parar(); botones();
  if (!S.n) { api.aviso('Todavía no ha salido ninguna bola.'); programar(); return; }
  const pal = val('bolas') || 'clasico', datos = { linea: Array(5).fill(0), bingo: Array(15).fill(0) };
  let modo = 'linea', act = 0;
  const lista = () => datos[modo], hueco = () => { const i = lista().findIndex(x => !x); return i < 0 ? 0 : i; };
  const html = () => {
    const l = lista(), filas = modo === 'linea' ? 1 : 3, usados = new Set(l.filter(Boolean));
    const slots = Array.from({ length: filas }, (_, r) => `<div class="bgFila">${[0, 1, 2, 3, 4].map(c => { const i = r * 5 + c; return `<button class="bgSlot ${i === act ? 'act' : ''} ${l[i] ? 'lleno' : ''}" data-i="${i}" aria-label="Número ${i + 1}${l[i] ? ': ' + l[i] : ' vacío'}">${l[i] || ''}</button>`; }).join('')}</div>`).join('');
    const teclas = Array.from({ length: 90 }, (_, k) => k + 1).map(n => `<button class="bgKey" style="--c:${colorBola(pal, n)}" data-n="${n}" ${usados.has(n) ? 'disabled' : ''}>${n}</button>`).join('');
    return `<div class="seg bgModo"><button class="btn ${modo === 'linea' ? 'on' : ''}" data-md="linea">Línea · 5 números</button><button class="btn ${modo === 'bingo' ? 'on' : ''}" data-md="bingo">Bingo · 15 números</button></div>
      <p class="note">${modo === 'linea' ? 'Toca los 5 números de la línea cantada.' : 'Toca los 15 números del cartón.'} Toca un hueco para cambiarlo.</p>
      <div class="bgCarton">${slots}</div><div class="bgTeclas">${teclas}</div>
      <div class="bar"><button class="btn on" data-bg="ver">Comprobar</button><button class="btn" data-bg="atras">⌫ Quitar</button><button class="btn" data-bg="borrar">Borrar</button></div>
      <div class="bgRes" id="bgRes" aria-live="polite"></div>`;
  };
  const m = api.modal('🔍 Comprobar cartón', `<div id="bgCk">${html()}</div>`), cu = m.cuerpo, raiz = () => cu.querySelector('#bgCk');
  const pintar = () => { raiz().innerHTML = html(); };
  const res = (txt, cls) => { const r = cu.querySelector('#bgRes'); r.className = 'bgRes ' + cls; r.textContent = txt; };
  const lm = () => lineasMax();
  function ver() {
    const l = lista(), cuantos = modo === 'linea' ? 5 : 15, err = B.validarNumeros(l, cuantos);
    if (err) { res(err, 'mal'); api.sonido('error'); return; }
    const c = B.comprobarNumeros(l, salidos()); let voz = '';
    if (modo === 'linea') {
      if (c.ok) {
        if (!lm()) res('Los 5 números han salido, pero en esta partida solo se juega al bingo.', 'ok');
        else if (S.lineas >= lm()) res('✅ Los 5 números han salido, pero ese premio de línea ya estaba cantado.', 'ok');
        else { S.lineas++; guardar(); res(`🎉 ¡Línea correcta! Los 5 números han salido.${lm() > 1 && S.lineas < lm() ? ' Queda una línea más.' : ''}`, 'ok'); voz = '¡Línea correcta!'; }
      } else res(`Línea incorrecta: ${c.faltan.length === 1 ? 'no ha salido el' : 'no han salido los'} ${c.faltan.join(', ')}.`, 'mal');
    } else if (c.ok) {
      if (S.bingo) res('✅ Bingo válido (ya estaba cantado).', 'ok');
      else { S.bingo = true; S.lineas = Math.max(S.lineas, lm()); guardar(); res('🏆 ¡BINGO correcto! Los 15 números han salido.', 'ok'); voz = '¡Bingo correcto!'; finPartida(true); }
    } else res(`Todavía no es bingo: faltan ${c.faltan.length} números (${c.faltan.join(', ')}).`, 'mal');
    hud(); api.sonido(c.ok ? 'ganar' : 'error');
    if (voz && val('voz') !== 'no') hablar(voz);
  }
  cu.addEventListener('click', e => {
    const bm = e.target.closest('[data-md]'); if (bm) { modo = bm.dataset.md; act = hueco(); pintar(); return; }
    const sl = e.target.closest('.bgSlot'); if (sl) { act = +sl.dataset.i; lista()[act] = 0; pintar(); return; }
    const k = e.target.closest('.bgKey');
    if (k && !k.disabled) { const l = lista(); l[act] = +k.dataset.n; const sig = l.findIndex((x, i) => !x && i !== act); act = sig < 0 ? Math.min(l.length - 1, act + 1) : sig; pintar(); return; }
    const b = e.target.closest('[data-bg]'); if (!b) return;
    if (b.dataset.bg === 'ver') ver();
    else if (b.dataset.bg === 'atras') { const l = lista(); let i = l.length - 1; while (i >= 0 && !l[i]) i--; if (i >= 0) { l[i] = 0; act = i; } pintar(); }
    else { datos[modo] = Array(datos[modo].length).fill(0); act = 0; pintar(); }
  });
  const o = new MutationObserver(() => { if (!document.body.contains(cu)) { o.disconnect(); programar(); } }); o.observe(document.body, { childList: true, subtree: true });
}

/* ---------- fin y nueva partida ---------- */
function finPartida(bingo) {
  if (!S.reg) { S.reg = true; api.registrar({ res: 'partida', variante: 'Live' }); guardar(); }
  hud(); botones(); parar();
  if (bingo) api.aviso('🏆 ¡Bingo! Fin de la partida.'); else api.aviso('Ya han salido las 90 bolas.');
}
function nuevaPartida() {
  if (S.n > 0 && !S.bingo && S.n < 90 && !api.confirmar('¿Empezar una partida nueva? Se pierden las bolas sacadas.')) return;
  parar(); S = nueva(); guardar(); ocupado = false;
  if (V) V.reiniciar(); hud(); botones(); programar();
}
function reglas() {
  api.modal('📖 Bingo Live', `<p>Bingo de <b>90 bolas</b> para jugar en sala con <b>cartones de papel</b>: pon la pantalla en una tele o tablet y que la vea todo el mundo.</p>
  <ul><li>Pulsa <b>🎱 Sacar bola</b> (o toca el bombo): la bola sale del bombo, baja por el carril y se enciende en el tablero mientras la voz la canta.</li>
  <li>En <b>⚙️ Configurar partida</b> eliges si se cantan solo los números o también los apodos de la tómbola, la voz, si se saca con el botón o automáticamente cada cierto tiempo, y si se juega a bingo, línea y bingo o dos líneas y bingo.</li><li>En <b>🎨 Apariencia</b>: tapete del panel, colores y texturas de las bolas y calidad 3D.</li>
  <li>Cuando alguien cante <b>línea</b> o <b>bingo</b>, pulsa <b>🔍 Comprobar cartón</b> y toca en el panel los números: los 5 de la línea, o los 15 del cartón para el bingo. La app dice si todos han salido.</li>
  <li>La voz es la del dispositivo: para que funcione sin conexión necesita una voz en español instalada.</li></ul>`);
}

/* ---------- eventos ---------- */
function clic(e) {
  const b = e.target.closest('[data-ac]'); if (!b) return;
  if (b.dataset.ac === 'sacar') sacar(); else if (b.dataset.ac === 'comprobar') comprobarCarton();
}
