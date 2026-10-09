import { $, esperar } from '../../core/dom.js';
import { cartaHTML } from '../../core/cartas.js';
import { grupoMesa, grupoDorso, grupoPalos } from '../../core/aspectos.js';
import * as BJ from './motor.js';

let S = null, api = null, asp = null, root = null, prev = { banca: 0, manos: [] }, bloqueo = false, tBloq = null, regRonda = 0, consejoOn = true;
const NOMBRE_RES = { gana: 'Gana', bj: '¡Blackjack!', pierde: 'Pierdes', empate: 'Empate', rend: 'Rendida', pasa: 'Te pasas' };

/* ---------- validación / resumen ---------- */
export function validar(d) {
  const e = d && BJ.validarEstado(d.s); if (!e) return null;
  if (e.fase === 'banca') return null;
  return { s: e, regRonda: Number.isInteger(d.regRonda) && d.regRonda >= 0 ? d.regRonda : 0 };
}
export const migrarV1 = d => d;
export const resumen = d => ({ texto: `${d.s.fichas} fichas · mejor ${d.s.pico}`, fin: false });

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; bloqueo = false;
  asp = api.aspecto([grupoMesa(), grupoDorso(), grupoPalos()]);
  await api.css(new URL('../../../css/cartas.css', import.meta.url)); await api.css(new URL('./blackjack.css', import.meta.url));
  const g = api.cargar(); S = g ? g.s : BJ.nuevoEstado(); regRonda = g ? g.regRonda : 0; consejoOn = api.pref('consejo', true);
  prev = { banca: S.banca.length, manos: S.manos.map(h => h.c.length) };
  root.innerHTML = `
    <div class="bjtop"><div class="bjbank">🪙 <span id="bjF">0</span><small id="bjPico"></small></div><button class="btn" data-ac="consejo" id="bjCons"></button></div>
    <div class="mesa bjmesa"><div><div class="bjlbl">Banca <span class="bjb" id="bjTB"></span></div><div class="bjrow" id="bjBanca"></div></div>
      <div class="bjmsg" id="bjMsg" role="status" aria-live="polite"></div>
      <div><div class="bjmanos" id="bjManos"></div></div></div>
    <div id="bjPanel"></div>
    <div class="bar"><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>`;
  root.addEventListener('click', clic);
  api.menu([{ texto: 'Consejo de estrategia', accion: () => alternarConsejo(), activo: consejoOn }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Empezar de cero (1000 fichas)', accion: reiniciar, peligro: true }, { texto: 'Reglas', accion: reglas }]);
  pintar();
}
export function unmount() { clearTimeout(tBloq); if (root) root.removeEventListener('click', clic); S = null; asp = null; }
function guardar() { if (!S) return; const d = { s: S, regRonda }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }
function alternarConsejo() { consejoOn = !consejoOn; api.setPref('consejo', consejoOn); pintar(); }
function reiniciar() { if (!api.confirmar('¿Volver a 1000 fichas y barajar de nuevo?')) return; S = BJ.nuevoEstado(); regRonda = 0; prev = { banca: 0, manos: [] }; pintar(); guardar(); }

/* ---------- pintado ---------- */
const totTxt = c => { const { t, suave } = BJ.total(c); return suave && t <= 21 ? `${t - 10}/${t}` : String(t); };
function filaCartas(cs, previas, { oculta2 = false, esBanca = false, inicial = false } = {}) {
  return cs.map((c, i) => {
    const nueva = i >= previas; let dl = 0;
    if (nueva) dl = inicial ? (esBanca ? [.2, .6] : [0, .4])[i] ?? 0 : esBanca ? (i - previas) * .45 : (i - previas) * .2;
    return cartaHTML(c, { oculta: oculta2 && i === 1, clase: nueva ? 'in' : '', estilo: nueva ? `--dl:${dl}s` : '' });
  }).join('');
}
function pintar() {
  if (!S) return;
  const jugando = S.fase === 'jugador' || S.fase === 'seguro', inicial = prev.banca === 0 && S.banca.length > 0;
  $('#bjF').textContent = S.fichas; $('#bjPico').textContent = `mejor ${S.pico}`;
  $('#bjCons').textContent = `💡 Consejo: ${consejoOn ? 'sí' : 'no'}`;
  $('#bjBanca').innerHTML = filaCartas(S.banca, prev.banca, { oculta2: jugando || bloqueo && false, esBanca: true, inicial });
  $('#bjTB').textContent = !S.banca.length ? '' : jugando ? String(BJ.valor(S.banca[0])) : bloqueo ? '…' : totTxt(S.banca);
  $('#bjManos').innerHTML = S.manos.map((h, i) => {
    const act = S.fase === 'jugador' && i === S.act, fin = S.fase === 'fin' && !bloqueo;
    return `<div class="mano ${act ? 'act' : ''}"><div class="bjrow">${filaCartas(h.c, prev.manos[i] ?? 0, { inicial })}</div>
      <span class="bjb">${totTxt(h.c)}</span><span class="bjb apu">🪙 ${h.ap}</span>${fin && h.res ? `<span class="bjb ${h.res === 'bj' ? 'bj' : h.res}">${NOMBRE_RES[h.res]}</span>` : ''}</div>`;
  }).join('');
  prev = { banca: S.banca.length, manos: S.manos.map(h => h.c.length) };
  const m = $('#bjMsg');
  if (S.fase === 'apuesta') m.textContent = S.fichas < BJ.APUESTA_MIN ? 'Te has quedado sin fichas' : S.barajado ? 'Se ha barajado el zapato · haz tu apuesta' : 'Haz tu apuesta';
  else if (S.fase === 'seguro') m.textContent = 'La banca enseña un as';
  else if (S.fase === 'jugador') m.textContent = S.manos.length > 1 ? `Mano ${S.act + 1} de ${S.manos.length}` : 'Tu turno';
  else if (bloqueo) m.textContent = 'La banca juega…';
  else { const r = S.resultado; m.textContent = r.texto === 'victoria' ? `¡Ganas ${r.neto} fichas!` : r.texto === 'derrota' ? `Pierdes ${-r.neto} fichas` : 'Empate: recuperas tu apuesta'; }
  panel();
}
function panel() {
  const p = $('#bjPanel'), c = BJ.consejo(S);
  if (bloqueo) { p.innerHTML = ''; return; }
  if (S.fase === 'apuesta') {
    if (S.fichas < BJ.APUESTA_MIN) { p.innerHTML = '<div class="bar"><button class="btn on" data-ac="recargar">Recargar 1000 fichas</button></div>'; return; }
    p.innerHTML = `<div class="bjapuesta">Apuesta: 🪙 <b>${S.apuesta}</b></div>
      <div class="bjfichas">${BJ.FICHAS.map(f => `<button class="chip c${f}" data-ch="${f}" ${S.apuesta + f > S.fichas ? 'disabled' : ''} aria-label="Añadir ${f} fichas">${f}</button>`).join('')}</div>
      <div class="bar" style="justify-content:center"><button class="btn" data-ac="borrar">Borrar</button><button class="btn" data-ac="todo" ${S.fichas ? '' : 'disabled'}>Todo</button><button class="btn on" data-ac="repartir" ${S.apuesta < BJ.APUESTA_MIN ? 'disabled' : ''}>Repartir</button></div>`;
  } else if (S.fase === 'seguro') {
    const coste = Math.floor(S.manos[0].ap / 2);
    p.innerHTML = `<div class="bjtip">¿Quieres seguro? Cuesta 🪙 ${coste} y paga 2 a 1 si la banca tiene blackjack.${consejoOn ? `<br>💡 ${BJ.consejoSeguro()}` : ''}</div>
      <div class="bar" style="justify-content:center"><button class="btn" data-ac="seg-no">No, gracias</button><button class="btn on" data-ac="seg-si" ${S.fichas < coste ? 'disabled' : ''}>Sí, seguro</button></div>`;
  } else if (S.fase === 'jugador') {
    const ok = BJ.acciones(S), B = (a, t) => `<button class="btn ${consejoOn && c && c.accion === a ? 'on' : ''}" data-ac="${a}" ${ok[a] ? '' : 'disabled'}>${t}</button>`;
    p.innerHTML = `${consejoOn && c ? `<div class="bjtip">💡 ${c.texto}</div>` : ''}<div class="bjact">${B('pedir', 'Pedir')}${B('plantarse', 'Plantarse')}${B('doblar', 'Doblar')}${B('dividir', 'Dividir')}${B('rendirse', 'Rendirse')}</div>`;
  } else p.innerHTML = '<div class="bar" style="justify-content:center"><button class="btn on" data-ac="siguiente">Siguiente mano</button></div>';
}
async function tras(prevFase) {            // animación de la banca y registro de resultados
  const nuevasBanca = Math.max(0, S.banca.length - prev.banca);
  if (prevFase !== 'fin' && S.fase === 'fin') {
    bloqueo = nuevasBanca > 0; pintar();
    if (bloqueo) { await esperar(nuevasBanca * 450 + 600); if (!S) return; bloqueo = false; }
    if (regRonda !== S.ronda) {
      regRonda = S.ronda; const r = S.resultado;
      api.registrar({ res: r.texto === 'victoria' ? 'victoria' : r.texto === 'derrota' ? 'derrota' : 'tablas' });
      api.sonido(r.texto === 'victoria' ? 'ganar' : r.texto === 'derrota' ? 'perder' : 'ok'); if (r.texto === 'victoria') api.vibrar([40, 30, 40]);
    }
  }
  pintar(); guardar();
}
function clic(e) {
  const b = e.target.closest('button'); if (!b || !S || bloqueo) return;
  const f = S.fase, d = b.dataset;
  if (d.ch) { BJ.apostar(S, +d.ch); api.sonido('click'); return pintar(); }
  const ac = d.ac;
  if (ac === 'aspecto') return asp.abrir(); if (ac === 'reglas') return reglas(); if (ac === 'consejo') return alternarConsejo();
  if (ac === 'borrar') { BJ.apostar(S, 0); return pintar(); }
  if (ac === 'todo') { S.apuesta = S.fichas; return pintar(); }
  if (ac === 'recargar') { BJ.recargar(S); api.registrar({ res: 'derrota' }); return tras(f); }
  if (ac === 'repartir') { if (BJ.repartir(S)) { api.sonido('mover'); tras(f); } return; }
  if (ac === 'seg-si' || ac === 'seg-no') { BJ.seguro(S, ac === 'seg-si'); return tras(f); }
  if (ac === 'siguiente') { BJ.nuevaRonda(S); prev = { banca: 0, manos: [] }; return tras(f); }
  if (['pedir', 'plantarse', 'doblar', 'dividir', 'rendirse'].includes(ac)) { if (BJ.accion(S, ac)) { api.sonido('mover'); tras(f); } }
}
function reglas() {
  api.modal('BlackJack', `<ul><li>Suma más que la banca sin pasarte de <b>21</b>. Las figuras valen 10 y el as 1 u 11.</li>
    <li>Un <b>blackjack</b> (as + figura) paga 3 a 2. La banca se planta con 17 (también con 17 blando) y juega con 6 barajas.</li>
    <li><b>Doblar</b>: duplicas la apuesta y recibes una sola carta. <b>Dividir</b>: con dos cartas de igual valor haces dos manos (hasta 4; con ases solo una carta más por mano).</li>
    <li><b>Rendirse</b>: recuperas la mitad de la apuesta (solo con las dos primeras cartas). <b>Seguro</b>: si la banca enseña un as, apuestas media apuesta a que tiene blackjack.</li>
    <li>💡 El <b>consejo</b> te dice la jugada de la estrategia básica; jugando así la ventaja de la casa baja a menos de un 0,5 %.</li>
    <li>Las fichas son ficticias y se guardan. Si te quedas sin ellas, puedes recargar.</li></ul>`);
}
