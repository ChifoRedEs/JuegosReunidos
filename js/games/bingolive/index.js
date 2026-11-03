// Bingo Live — el bingo de sala: la pantalla es el tablero de las 90 bolas (bombo, carril y tablero en 3D), un botón saca la bola y la voz del
// dispositivo la canta. Los jugadores usan cartones de papel; «Comprobar cartón» valida línea y bingo con los números que han salido.
import { $, esc } from '../../core/dom.js';
import * as B from '../../core/bingo/motor.js';
import { APODOS } from '../../core/bingo/apodos.js';
import { hablar, parar as pararVoz, estadoVoz, avisoSinVoz } from '../../core/bingo/voz.js';
import { crearVista, COLORES_FILA } from '../../core/bingo/vista3d.js';

let api = null, root = null, asp = null, S = null, V = null, ocupado = false, timer = 0, cuenta = 0, tCuenta = 0, vivo = false, tok = 0;

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
const val = k => (asp && asp.valores[k]) || '';
const salidos = () => new Set(S.orden.slice(0, S.n));
const premios = () => val('premios') || 'lb';
const lineasMax = () => (premios() === 'llb' ? 2 : premios() === 'lb' ? 1 : 0);

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; vivo = true; ocupado = false; tok++;
  asp = api.aspecto([
    { clave: 'apodos', titulo: 'Apodos', icono: '🗣️', def: 'tombola', opciones: [{ id: 'numero', nombre: 'Solo el número' }, { id: 'tombola', nombre: 'Los de la tómbola' }] },
    { clave: 'voz', titulo: 'Voz', icono: '🔊', def: 'si', opciones: [{ id: 'si', nombre: 'Cantar las bolas' }, { id: 'no', nombre: 'Sin voz' }] },
    { clave: 'saca', titulo: 'Sacar bola', icono: '🎱', def: 'boton', opciones: [{ id: 'boton', nombre: 'Con el botón' }, { id: 'auto', nombre: 'Automático' }] },
    { clave: 'tiempo', titulo: 'Tiempo entre bolas', icono: '⏱️', def: '8', opciones: ['5', '8', '12', '20', '30'].map(t => ({ id: t, nombre: t + ' segundos' })) },
    { clave: 'premios', titulo: 'Premios', icono: '🏆', def: 'lb', opciones: [{ id: 'b', nombre: 'Solo Bingo' }, { id: 'lb', nombre: 'Línea y Bingo' }, { id: 'llb', nombre: 'Dos líneas y Bingo' }] },
    { clave: 'calidad', titulo: 'Calidad 3D', icono: '✨', def: 'alta', opciones: [{ id: 'alta', nombre: 'Alta' }, { id: 'ligera', nombre: 'Ligera (móviles flojos)' }] },
  ], alCambiar);
  await api.css(new URL('./bingolive.css', import.meta.url));
  S = api.cargar() || nueva();
  armar();
  api.barra({ etiqueta: 'Nueva partida', nueva: nuevaPartida, salir: () => { parar(); location.hash = '#/cat/tablero'; }, pausar: () => parar(), reanudar: o => { if (o === 'salir') programar(); }, config: { pantalla: () => asp.abrir() } });
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
  hud(); botones(); programar();
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
  try { v = await crearVista(host, { calidad: val('calidad'), alTocarBombo: () => sacar() }); } catch { v = await crearVista(host, { calidad: '2d' }); }
  if (!vivo || mio !== tok) { try { v.destruir(); } catch { /* nada */ } return; }
  V = v; S.orden.slice(0, S.n).forEach(n => V.encender(n));
}
const fraseDe = n => B.frase(n, val('apodos') || 'tombola', APODOS[n - 1]);
function hud() {
  const h = $('#bgHud'); if (!h) return; const n = S.n ? S.orden[S.n - 1] : 0;
  const ult = S.orden.slice(Math.max(0, S.n - 6), S.n).reverse();
  const chip = (t, ok) => `<span class="bgChip ${ok ? 'ok' : ''}">${ok ? '✓ ' : ''}${t}</span>`;
  const p = premios(), chips = (p === 'llb' ? [chip('1.ª línea', S.lineas >= 1), chip('2.ª línea', S.lineas >= 2)] : p === 'lb' ? [chip('Línea', S.lineas >= 1)] : []).concat(chip('Bingo', S.bingo)).join('');
  h.innerHTML = `<div class="bgAct">${n ? `<b class="bgBola" style="--c:${COLORES_FILA[B.decena(n)]}">${n}</b><span class="bgApodo">${val('apodos') === 'numero' ? '' : esc(APODOS[n - 1])}</span>` : '<span class="bgApodo">Pulsa «Sacar bola» para empezar</span>'}</div>
    <div class="bgInfo"><b>Bola ${S.n} de 90</b><div class="bgUlt">${ult.slice(1).map(x => `<i style="--c:${COLORES_FILA[B.decena(x)]}">${x}</i>`).join('')}</div><div class="bgChips">${chips}</div></div>`;
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

/* ---------- comprobar un cartón ---------- */
function comprobarCarton() {
  parar(); botones();
  if (!S.n) { api.aviso('Todavía no ha salido ninguna bola.'); programar(); return; }
  const filas = [0, 1, 2].map(r => `<div class="bgFila">${[0, 1, 2, 3, 4].map(c => `<input class="bgIn" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="off" data-r="${r}" data-c="${c}" aria-label="Fila ${r + 1}, número ${c + 1}">`).join('')}</div>`).join('');
  const m = api.modal('🔍 Comprobar cartón', `<p class="note">Escribe los 15 números del cartón, fila por fila (5 por fila).</p><div class="bgCarton">${filas}</div><div class="bar"><button class="btn on" data-bg="ver">Comprobar</button><button class="btn" data-bg="borrar">Borrar</button></div><div class="bgRes" id="bgRes" aria-live="polite"></div>`);
  const cu = m.cuerpo, ins = [...cu.querySelectorAll('.bgIn')];
  ins.forEach((el, i) => {
    el.addEventListener('input', () => { el.value = el.value.replace(/\D/g, '').slice(0, 2); if ((el.value.length === 2 || (el.value.length === 1 && +el.value > 9)) && ins[i + 1]) ins[i + 1].focus(); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ver(); } else if (e.key === 'Backspace' && !el.value && ins[i - 1]) ins[i - 1].focus(); });
  });
  if (ins[0]) setTimeout(() => ins[0].focus(), 50);
  const res = cu.querySelector('#bgRes');
  function ver() {
    const filasN = [0, 1, 2].map(r => ins.filter(x => +x.dataset.r === r).map(x => parseInt(x.value, 10)));
    const err = B.validarFilas(filasN.map(f => f.map(n => (Number.isNaN(n) ? 0 : n))));
    if (filasN.flat().some(n => Number.isNaN(n))) { res.className = 'bgRes mal'; res.textContent = 'Faltan números por escribir.'; return; }
    if (err) { res.className = 'bgRes mal'; res.textContent = err; return; }
    const c = B.comprobar(filasN, salidos()); let txt = '', cls = 'mal', voz = '';
    const lm = lineasMax();
    if (c.bingo) {
      if (S.bingo) { cls = 'ok'; txt = '✅ Bingo válido (ya estaba cantado).'; }
      else { S.bingo = true; S.lineas = Math.max(S.lineas, lm); cls = 'ok'; txt = '🏆 ¡BINGO correcto! Todos los números han salido.'; voz = '¡Bingo correcto!'; guardar(); finPartida(true); }
    } else if (c.lineas.length && lm && S.lineas < lm && c.lineas.length >= S.lineas + 1) {
      S.lineas++; cls = 'ok'; txt = `🎉 ¡Línea correcta! (fila ${c.lineas[0] + 1}). Faltan ${c.faltan.length} números para el bingo.`; voz = '¡Línea correcta!'; guardar();
    } else if (c.lineas.length) {
      cls = 'ok'; txt = lm ? `Tiene ${c.lineas.length === 1 ? 'una línea' : c.lineas.length + ' líneas'}, pero ${S.lineas >= lm ? 'esa línea ya estaba cantada' : 'no mejora lo cantado'}.` : 'Tiene línea, pero en esta partida solo se juega al bingo.';
    } else {
      const mejor = Math.max(...filasN.map(f => f.filter(n => salidos().has(n)).length));
      txt = `Todavía no: ninguna fila está completa (la mejor lleva ${mejor} de 5). Faltan: ${c.faltan.join(', ')}.`;
    }
    res.className = 'bgRes ' + cls; res.textContent = txt; hud();
    if (voz && val('voz') !== 'no') hablar(voz);
    if (cls === 'ok') api.sonido('ganar'); else api.sonido('error');
  }
  cu.addEventListener('click', e => {
    const b = e.target.closest('[data-bg]'); if (!b) return;
    if (b.dataset.bg === 'ver') ver(); else { ins.forEach(x => { x.value = ''; }); res.textContent = ''; res.className = 'bgRes'; if (ins[0]) ins[0].focus(); }
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
  <li>En <b>🎨 Apariencia</b> eliges si se cantan solo los números o también los apodos de la tómbola, si se saca con el botón o automáticamente cada cierto tiempo, y si se juega a bingo, línea y bingo o dos líneas y bingo.</li>
  <li>Cuando alguien cante <b>línea</b> o <b>bingo</b>, pulsa <b>🔍 Comprobar cartón</b>, escribe sus 15 números y la app dice si es correcto.</li>
  <li>La voz es la del dispositivo: para que funcione sin conexión necesita una voz en español instalada.</li></ul>`);
}

/* ---------- eventos ---------- */
function clic(e) {
  const b = e.target.closest('[data-ac]'); if (!b) return;
  if (b.dataset.ac === 'sacar') sacar(); else if (b.dataset.ac === 'comprobar') comprobarCarton();
}
