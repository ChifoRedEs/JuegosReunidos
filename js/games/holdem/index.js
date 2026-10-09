import { $, esc } from '../../core/dom.js';
import { cartaHTML } from '../../core/cartas.js';
import { grupoMesa, grupoDorso, grupoPalos } from '../../core/aspectos.js';
import * as H from './motor.js';

const NIVEL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
let S = null, api = null, asp = null, root = null, timer = null, prevTab = 0, cfg = { bots: 3, nivel: 'medio' }, consejo = true, subir = 0, ocupado = false;

/* ---------- validación / resumen ---------- */
export function validar(d) { return H.validar(d); }
export const migrarV1 = d => d;
export function resumen(d) {
  const yo = d.jug[0];
  if (d.fase === 'terminado' || (d.fase === 'fin' && H.evaluarFin(d))) return { texto: `${yo.stack > 0 ? '¡Campeón!' : 'Eliminado'} · mano ${d.mano}`, fin: true };
  return { texto: `Mano ${d.mano} · ${yo.stack} fichas · ${d.jug.length - 1} bots`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; ocupado = false;
  asp = api.aspecto([grupoMesa(), grupoDorso(), grupoPalos()]);
  await api.css(new URL('../../../css/cartas.css', import.meta.url)); await api.css(new URL('./holdem.css', import.meta.url));
  const g = api.cargar(); S = g; consejo = api.pref('consejo', true);
  const c0 = api.pref('cfg', null); if (c0 && c0.bots >= 2 && c0.bots <= 5 && NIVEL[c0.nivel]) cfg = { bots: c0.bots, nivel: c0.nivel };
  root.addEventListener('click', clic); root.addEventListener('input', alMover);
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: 'Mostrar mis probabilidades', accion: () => { consejo = !consejo; api.setPref('consejo', consejo); pintar(); }, activo: consejo }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Ranking de manos', accion: ranking }, { texto: 'Reglas', accion: reglas }]);
  if (S) { prevTab = S.tablero.length; armar(); pintar(); bucle(); } else setup();
}
export function unmount() { clearTimeout(timer); if (root) { root.removeEventListener('click', clic); root.removeEventListener('input', alMover); } S = null; asp = null; }
function guardar() { if (!S) return; const r = resumen(S); api.guardar(S, r.texto, r.fin); }

/* ---------- pantallas ---------- */
function setup() {
  S = null; clearTimeout(timer);
  root.innerHTML = `<p class="note">Torneo contra bots: empiezas con 1000 fichas y las ciegas suben cada ${H.MANOS_POR_NIVEL} manos. Gana quien se quede con todas las fichas.</p>
    <div class="bar"><span class="lbl">Rivales</span><div class="seg">${[2, 3, 4, 5].map(n => `<button class="btn ${cfg.bots === n ? 'on' : ''}" data-bots="${n}">${n} bots</button>`).join('')}</div></div>
    <div class="bar"><span class="lbl">Nivel</span><div class="seg">${Object.entries(NIVEL).map(([k, l]) => `<button class="btn ${cfg.nivel === k ? 'on' : ''}" data-niv="${k}">${l}</button>`).join('')}</div></div>
    <div class="bar"><button class="btn on" data-ac="start">Empezar torneo</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="rank">Ranking de manos</button></div>
    <p class="note">Cada bot tiene su estilo: conservador, equilibrado, agresivo o farolero. En Fácil se equivocan más; en Difícil calculan más simulaciones.</p>`;
}
function armar() {
  const nb = S.jug.length - 1;
  root.innerHTML = `<div class="mesa hm"><div class="hbots" id="hBots" style="--nb:${Math.min(nb, 3)}"></div>
    <div class="hcentro"><div class="hbote" id="hBote"></div><div class="hboard" id="hBoard"></div><div class="hmsg" id="hMsg" role="status" aria-live="polite"></div></div>
    <div class="yo" id="hYo"></div></div><div class="hpanel" id="hPanel"></div><ul class="hlog" id="hLog"></ul>
    <div class="bar"><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="rank">Ranking</button><button class="btn" data-ac="nueva">Nueva partida</button></div>`;
}
function nuevaSetup() { if (S && S.fase !== 'terminado' && !api.confirmar('¿Abandonar el torneo actual?')) return; api.borrar(); setup(); }
function empezar() {
  S = H.crear(cfg.bots, cfg.nivel); api.setPref('cfg', cfg); prevTab = 0; armar(); H.nuevaMano(S); pintar(); guardar(); bucle();
}

/* ---------- pintado ---------- */
const mostrarCartas = (i) => { const p = S.jug[i]; if (!p.cartas.length) return false; if (i === 0) return true; return S.resultado && S.resultado.showdown && !p.fold; };
function pintar() {
  if (!S || !$('#hBots')) return;
  const bots = S.jug.map((p, i) => i).slice(1), ocupados = S.fase === 'fin' || S.fase === 'terminado';
  $('#hBots').style.setProperty('--nb', Math.min(bots.length, 3));
  $('#hBots').innerHTML = bots.map(i => { const p = S.jug[i], t = S.turno === i;
    return `<div class="seat ${t ? 'turno' : ''} ${p.fold ? 'fold' : ''} ${p.fuera ? 'fuera' : ''}">${S.boton === i && !p.fuera ? '<span class="bt">D</span>' : ''}<div class="nom">${esc(p.nombre)}</div><div class="stk">🪙 ${p.stack}</div>
      <div class="cs">${p.cartas.length ? p.cartas.map(c => cartaHTML(c, { oculta: !mostrarCartas(i) })).join('') : ''}</div><div class="txt">${p.fuera ? 'Eliminado' : esc(p.txt)}</div>${p.apuesta ? `<span class="ap">${p.apuesta}</span>` : ''}</div>`; }).join('');
  $('#hBote').textContent = `Bote 🪙 ${H.bote(S)}`;
  $('#hBoard').innerHTML = [0, 1, 2, 3, 4].map(k => k < S.tablero.length ? cartaHTML(S.tablero[k], { clase: k >= prevTab ? 'in' : '', estilo: k >= prevTab ? `--dl:${(k - Math.min(prevTab, 3)) * .12}s;animation-delay:${(k - prevTab) * .15}s` : '' }) : '<div class="ph"></div>').join('');
  prevTab = S.tablero.length;
  const yo = S.jug[0];
  $('#hYo').className = 'yo' + (S.turno === 0 ? ' turno' : '') + (yo.fold ? ' fold' : '');
  $('#hYo').innerHTML = `${S.boton === 0 ? '<span class="bt">D</span>' : ''}<div class="nom">${esc(yo.nombre)} · 🪙 ${yo.stack} ${yo.apuesta ? `<span class="ap" style="background:#FFC21A;color:#3A2800;padding:1px 8px;border-radius:99px;font-size:12px">${yo.apuesta}</span>` : ''}</div><div class="cs">${yo.cartas.map(c => cartaHTML(c)).join('')}</div><div class="txt" style="font-size:12px;font-weight:800;min-height:16px">${esc(yo.txt)}</div>`;
  const m = $('#hMsg');
  if (S.fase === 'terminado' || (S.fase === 'fin' && H.evaluarFin(S))) m.textContent = yo.stack > 0 ? '🏆 ¡Has ganado el torneo!' : 'Has sido eliminado';
  else if (S.fase === 'fin') m.textContent = S.resultado ? S.resultado.texto : '';
  else if (S.turno === 0) m.textContent = 'Tu turno';
  else m.textContent = S.turno >= 0 ? `Juega ${S.jug[S.turno].nombre}…` : '';
  $('#hLog').innerHTML = S.log.map(l => `<li>${esc(l)}</li>`).join('');
  panel();
}
function panel() {
  const p = $('#hPanel'), fin = S.fase === 'fin' || S.fase === 'terminado';
  if (fin) {
    const ev = H.evaluarFin(S);
    p.innerHTML = ev || S.fase === 'terminado' ? `<div class="bar" style="justify-content:center"><button class="btn on" data-ac="setup">Nuevo torneo</button></div>` : `<div class="bar" style="justify-content:center"><button class="btn on" data-ac="siguiente">Siguiente mano</button></div>`;
    return;
  }
  if (S.turno !== 0 || ocupado) { p.innerHTML = ''; return; }
  const L = H.legal(S, 0), yo = S.jug[0], B = H.bote(S);
  if (subir < L.minTo || subir > L.maxTo) subir = L.minTo;
  let tip = '';
  if (consejo) { const riv = H.vivos(S).length - 1, eq = H.equidad(yo.cartas, S.tablero, riv, 450), nec = L.aPagar / (B + L.aPagar); tip = `<div class="htip">💡 Probabilidad de ganar ≈ <b>${Math.round(eq * 100)} %</b>${L.aPagar ? ` · para igualar necesitas más de un ${Math.round(nec * 100)} %` : ''}.</div>`; }
  p.innerHTML = `${tip}<div class="hbtns"><button class="btn danger" data-act="fold">Retirarse</button>${L.pasar ? '<button class="btn on" data-act="check">Pasar</button>' : `<button class="btn on" data-act="call">${L.llamar >= yo.stack ? 'All-in ' : 'Igualar '}${L.llamar}</button>`}</div>
    ${L.subir ? `<div class="hsub"><div>${S.apuestaMax ? 'Subir a' : 'Apostar'} <b id="hSub">${subir}</b></div><input type="range" id="hRng" min="${L.minTo}" max="${L.maxTo}" step="5" value="${subir}" aria-label="Cantidad a apostar">
      <div class="pre"><button class="btn" data-pre="0.5">½ bote</button><button class="btn" data-pre="1">Bote</button><button class="btn" data-pre="max">All-in</button></div><button class="btn on" style="width:100%" data-act="raise">${subir >= L.maxTo ? 'All-in' : S.apuestaMax ? 'Subir' : 'Apostar'} ${subir}</button></div>` : ''}`;
}
function alMover(e) { if (e.target.id !== 'hRng') return; subir = +e.target.value; $('#hSub').textContent = subir; const b = root.querySelector('[data-act="raise"]'); const L = H.legal(S, 0); b.textContent = `${subir >= L.maxTo ? 'All-in' : S.apuestaMax ? 'Subir' : 'Apostar'} ${subir}`; }

/* ---------- flujo ---------- */
function bucle() {
  clearTimeout(timer); if (!S || S.turno < 0 || !['preflop', 'flop', 'turn', 'river'].includes(S.fase)) { cierre(); return; }
  const i = S.turno; if (!S.jug[i].bot) return;
  timer = setTimeout(() => { if (!S || S.turno !== i) return; const a = H.decidir(S, i); if (!H.actuar(S, i, a)) H.actuar(S, i, H.legal(S, i).pasar ? { t: 'check' } : { t: 'call' }); api.sonido('click'); pintar(); guardar(); bucle(); }, 650 + Math.random() * 450);
}
function cierre() {
  if (!S || S.fase !== 'fin') { if (S) { pintar(); } return; }
  const ev = H.evaluarFin(S);
  if (ev) S.fase = 'terminado';
  if (ev && !S.reg) { S.reg = true; api.registrar({ res: ev, variante: `${S.jug.length - 1} bots · ${NIVEL[S.nivel]}` }); api.sonido(ev === 'victoria' ? 'ganar' : 'perder'); if (ev === 'victoria') api.vibrar([60, 40, 60]); }
  else if (!ev && S.resultado && S.resultado.ganadores.some(g => g.i === 0)) api.sonido('ok');
  pintar(); guardar();
}
function humano(a) { if (!S || S.turno !== 0) return; if (H.actuar(S, 0, a)) { api.sonido('click'); pintar(); guardar(); bucle(); } }
function clic(e) {
  const b = e.target.closest('button'); if (!b) return;
  const d = b.dataset;
  if (d.bots) { cfg.bots = +d.bots; return setup(); } if (d.niv) { cfg.nivel = d.niv; return setup(); }
  if (d.pre) { const L = H.legal(S, 0), B = H.bote(S); subir = d.pre === 'max' ? L.maxTo : Math.max(L.minTo, Math.min(L.maxTo, Math.round((S.apuestaMax + (B + L.aPagar) * +d.pre) / 5) * 5)); return panel(); }
  if (d.act) return humano({ t: d.act, a: subir });
  const ac = d.ac;
  if (ac === 'start') empezar(); else if (ac === 'aspecto') asp.abrir(); else if (ac === 'rank') ranking();
  else if (ac === 'siguiente') { H.nuevaMano(S); prevTab = 0; pintar(); guardar(); bucle(); }
  else if (ac === 'setup') { api.borrar(); setup(); } else if (ac === 'nueva') nuevaSetup();
}
function ranking() {
  api.modal('Ranking de manos', `<div class="hrank"><b>1</b><span>Escalera real (10-J-Q-K-A del mismo palo)</span><b>2</b><span>Escalera de color</span><b>3</b><span>Póker (4 iguales)</span><b>4</b><span>Full (trío + pareja)</span><b>5</b><span>Color (5 del mismo palo)</span><b>6</b><span>Escalera (5 seguidas)</span><b>7</b><span>Trío</span><b>8</b><span>Doble pareja</span><b>9</b><span>Pareja</span><b>10</b><span>Carta alta</span></div>`);
}
function reglas() {
  api.modal("Texas Hold'em", `<ul><li>Cada jugador recibe 2 cartas y se reparten 5 comunes (flop de 3, turn y river). Haces la mejor mano de 5 con tus cartas y las comunes.</li>
    <li>Rondas de apuestas: <b>pasar</b> (si nadie ha apostado), <b>igualar</b>, <b>subir</b> o <b>retirarse</b>. Puedes ir <b>all-in</b> con todas tus fichas; los all-in cortos generan botes secundarios.</li>
    <li>El botón <b>D</b> marca al repartidor; los dos jugadores siguientes ponen las ciegas, que suben cada ${H.MANOS_POR_NIVEL} manos.</li>
    <li>Torneo: ganas cuando eliminas a todos los bots; pierdes si te quedas sin fichas.</li>
    <li>💡 «Mostrar mis probabilidades» (menú ⋯) calcula tu opción de ganar y la compara con lo que cuesta igualar.</li></ul>`);
}
