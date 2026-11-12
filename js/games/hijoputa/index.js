// Hijoputa — Mau-Mau con baraja española: casa por palo o número, sota = comodín, 2 = +2 acumulable, as = el siguiente roba y pierde el turno,
// rey = repites turno, y con una sola carta hay que gritar «¡Hijoputa!» o te caen 5 cartas. Contra 1–3 CPU.
import { pieMenu } from '../../core/pie.js';
import { $, esc } from '../../core/dom.js';
import { cartaEsHTML, asegurarSprites, nombreEs } from '../../core/cartas.js';
import { grupoMesa, grupoDorso, grupoBarajaEs } from '../../core/aspectos.js';
import * as H from './motor.js';

let S = null, api = null, asp = null, root = null, timer = 0, reg = false, nueva = -1, bocadillos = {}, ocupado = false;
let cfg = { rivales: 3, nivel: 'medio' };
const COLOR_PALO = ['#E2A400', '#D32F2F', '#1E5AA8', '#2E7D32'];

/* ---------- datos ---------- */
export const validar = d => { const s = d && H.validar(d.s); return s ? { s, reg: !!d.reg } : null; };
export const migrarV1 = d => d;
export function resumen(d) {
  const s = d.s;
  if (s.fase === 'fin') return { texto: s.ganador === 0 ? '¡Ganaste!' : `Ganó ${s.jug[s.ganador].nombre}`, fin: true };
  return { texto: `Te quedan ${s.jug[0].mano.length} carta${s.jug[0].mano.length === 1 ? '' : 's'}`, fin: false };
}
const guardar = () => { if (!S) return; const r = resumen({ s: S }); api.guardar({ s: S, reg }, r.texto, r.fin); };

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; nueva = -1; bocadillos = {}; ocupado = false; asegurarSprites();
  asp = api.aspecto([grupoMesa(), grupoDorso(), grupoBarajaEs()]);
  await api.css(new URL('../../../css/cartas.css', import.meta.url)); await api.css(new URL('./hijoputa.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && [1, 2, 3].includes(c0.rivales) && H.NIVEL[c0.nivel]) cfg = { ...c0 };
  const g = api.cargar(); if (g) { S = g.s; reg = g.reg; } else S = null;
  root.addEventListener('click', clic);
  api.barra({ nueva: nuevaSetup, salir: () => { clearTimeout(timer); api.borrar(); location.hash = '#/cat/cartas'; }, pausar: () => clearTimeout(timer), reanudar: () => { if (S && S.fase !== 'fin') bucle(); },
    config: { valores: () => ({ ...cfg }), grupos: () => [{ clave: 'rivales', titulo: 'Rivales', opciones: [[1, '1 CPU'], [2, '2 CPU'], [3, '3 CPU']] }, { clave: 'nivel', titulo: 'Nivel', opciones: Object.entries(H.NIVEL) }], aplicar: v => { Object.assign(cfg, v); empezar(); } } });
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: '📖 Reglas', accion: reglas }]);
  if (S) { armar(); pintar(); bucle(); } else setup();
}
export function unmount() { clearTimeout(timer); if (root) root.removeEventListener('click', clic); S = null; asp = null; }

/* ---------- pantallas ---------- */
function setup() {
  S = null; clearTimeout(timer);
  const seg = (k, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${cfg[k] === v ? 'on' : ''}" data-cfg="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  root.innerHTML = `<p class="note">Baraja española: tira una carta del <b>mismo palo o número</b>. La <b>sota</b> es comodín, el <b>2</b> acumula castigo, el <b>as</b> hace robar y perder turno, el <b>rey</b> repite. Con una sola carta, ¡grita <b>HIJOPUTA</b>! Gana quien se quede sin cartas.</p>
    <div class="bar"><span class="lbl">Rivales</span>${seg('rivales', [[1, '1 CPU'], [2, '2 CPU'], [3, '3 CPU']])}</div>
    <div class="bar"><span class="lbl">Nivel</span>${seg('nivel', Object.entries(H.NIVEL))}</div>
    ${pieMenu({})}`;
}
function armar() {
  root.innerHTML = `<div class="hptop"><span id="hpInfo"></span><span id="hpSt"></span></div>
    <div class="mesa hpm">
      <div class="hpops" id="hpOps"></div>
      <div class="hpcentro"><button type="button" class="hpmazo" id="hpMazo" data-ac="robar" aria-label="Robar carta del mazo"></button><div class="hpdesc" id="hpDesc"></div><div class="hppalo" id="hpPalo"></div></div>
      <div class="hpmsg" id="hpMsg" role="status" aria-live="polite"></div>
      <div class="hpmano" id="hpMano"></div>
    </div>
    <div class="bar hpacc" id="hpAcc"></div>
    <ul class="hplog" id="hpLog"></ul>
    <div id="hpRes"></div>
    <div class="bar"><button class="btn" data-ac="reglas">📖 Reglas</button></div>${api.barraHtml()}`;
}
function nuevaSetup() { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; clearTimeout(timer); api.borrar(); setup(); }
function empezar() {
  asp.sortear(); api.setPref('cfg', cfg); clearTimeout(timer);
  S = H.crear({ jugadores: [{ nombre: 'Tú', cpu: false }, ...Array.from({ length: cfg.rivales }, (_, k) => ({ nombre: `CPU ${k + 1}`, cpu: true }))], nivel: cfg.nivel });
  reg = false; nueva = -1; bocadillos = {}; ocupado = false; armar(); pintar(); guardar(); bucle();
}

/* ---------- pintado ---------- */
const mias = () => (S.fase === 'jugar' || S.fase === 'robo') && S.turno === 0 && !ocupado;
function pintar() {
  if (!S || !$('#hpMano')) return;
  const mi = mias(), op = mi ? new Set(H.jugables(S, 0)) : new Set(), yo = S.jug[0];
  $('#hpInfo').textContent = S.fase === 'fin' ? 'Fin de la partida' : S.turno === 0 ? 'Tu turno' : `Turno de ${S.jug[S.turno].nombre}`;
  $('#hpSt').textContent = `Mazo ${S.mazo.length} · Descarte ${S.desc.length}`;
  $('#hpOps').style.setProperty('--no', S.jug.length - 1);
  $('#hpOps').innerHTML = S.jug.map((J, k) => k === 0 ? '' : `<button type="button" class="hpseat ${S.turno === k && S.fase !== 'fin' ? 'turno' : ''} ${S.acusable === k ? 'pilla' : ''}" data-acusar="${k}" aria-label="${esc(J.nombre)}, ${J.mano.length} cartas${S.acusable === k ? ', no ha gritado: toca para acusarle' : ''}"><span class="nom">${esc(J.nombre)}</span><span class="cs">${J.mano.slice(0, 9).map(() => cartaEsHTML(0, { oculta: true })).join('')}</span><span class="n">${J.mano.length} carta${J.mano.length === 1 ? '' : 's'}</span>${bocadillos[k] ? `<span class="bocadillo">${esc(bocadillos[k])}</span>` : ''}${S.acusable === k ? '<span class="acusa">🎯 ¡Acúsale!</span>' : ''}</button>`).join('');
  const puedeRobar = mi && S.fase === 'jugar' && (S.castigo > 0 || !op.size);
  const mz = $('#hpMazo'); mz.innerHTML = `${cartaEsHTML(0, { oculta: true })}<b class="cnt">${S.mazo.length}</b>`; mz.classList.toggle('vale', puedeRobar); mz.disabled = !puedeRobar;
  $('#hpDesc').innerHTML = cartaEsHTML(H.tope(S), { clase: nueva === S.desc.length ? 'in' : '' });
  $('#hpPalo').innerHTML = `<span class="pbadge" style="--c:${COLOR_PALO[S.paloActivo]}" aria-label="Palo activo: ${H.PALOS[S.paloActivo]}"><svg viewBox="0 0 24 24"><use href="#es-${S.paloActivo}"/></svg></span><small>${H.PALOS[S.paloActivo]}</small>${S.castigo ? `<b class="cast">+${S.castigo}</b>` : ''}`;
  const msg = $('#hpMsg');
  if (S.fase === 'fin') msg.innerHTML = S.ganador === 0 ? '🏆 <b>¡Has ganado!</b>' : `<b>${esc(S.jug[S.ganador].nombre)}</b> se queda sin cartas.`;
  else if (!mi) msg.textContent = S.turno === 0 ? '…' : `${S.jug[S.turno].nombre} está pensando…`;
  else if (S.fase === 'robo') msg.textContent = 'Has robado una carta que encaja: júgala o pasa.';
  else if (S.castigo) msg.textContent = op.size ? `Castigo +${S.castigo}: encadena otro 2 o roba ${S.castigo}.` : `Castigo +${S.castigo}: no tienes un 2. Toca el mazo y roba ${S.castigo}.`;
  else msg.textContent = op.size ? 'Tu turno: toca una carta marcada.' : 'No tienes carta que encaje: toca el mazo para robar.';
  const n = yo.mano.length, ang = Math.min(5, 36 / Math.max(1, n)), mano = yo.mano.slice().sort((a, b) => H.palo(a) - H.palo(b) || H.pos(a) - H.pos(b));
  $('#hpMano').className = 'hpmano' + (mi ? ' turno' : '');
  $('#hpMano').style.setProperty('--n', n);
  $('#hpMano').innerHTML = mano.map((c, i) => { const m = i - (n - 1) / 2; return `<button type="button" class="hpc ${op.has(c) ? 'vale' : ''}" data-c="${c}" style="--r:${(m * ang).toFixed(2)}deg;--y:${(Math.abs(m) ** 1.6 * 1.2).toFixed(1)}px" aria-label="${nombreEs(c)}${op.has(c) ? ', se puede jugar' : ''}">${cartaEsHTML(c)}</button>`; }).join('');
  const acc = $('#hpAcc'), grita = yo.mano.length === 1 && !yo.gritado && S.fase !== 'fin';
  acc.innerHTML = (grita ? '<button class="btn hpgrito" data-ac="gritar">📣 ¡HIJOPUTA!</button>' : '') + (mi && S.fase === 'robo' ? '<button class="btn on" data-ac="pasar">✋ Guardar y pasar</button>' : '');
  acc.hidden = !acc.innerHTML;
  $('#hpLog').innerHTML = S.log.map(l => `<li>${esc(l)}</li>`).join('');
  pintarRes(); nueva = -1;
}
function pintarRes() {
  const el = $('#hpRes'); if (!S || S.fase !== 'fin') { if (el) el.innerHTML = ''; return; }
  const seg = Math.max(1, Math.round((Date.now() - S.t0) / 1000)), t = `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
  el.innerHTML = `<div class="hpres"><h3>${S.ganador === 0 ? '🏆 ¡Has ganado!' : `Gana ${esc(S.jug[S.ganador].nombre)}`}</h3>
    <table><tr><th></th><th>Jugadas</th><th>Robadas</th><th>Penas</th><th>Quedan</th></tr>${S.jug.map((J, k) => `<tr class="${k === S.ganador ? 'gana' : ''}"><td>${esc(J.nombre)}</td><td>${S.st.jugadas[k]}</td><td>${S.st.robadas[k]}</td><td>${S.st.penas[k]}</td><td>${J.mano.length}</td></tr>`).join('')}</table>
    <p class="note">${S.st.turnos} turnos · ${t}</p><div class="bar"><button class="btn on" data-ac="otra">Volver a jugar</button><button class="btn" data-ac="setup">Cambiar ajustes</button></div></div>`;
}

/* ---------- avisos y flujo ---------- */
function decir(k, texto) { bocadillos[k] = texto; pintar(); setTimeout(() => { delete bocadillos[k]; if (S) pintar(); }, 1700); }
function fin() {
  clearTimeout(timer); guardar();
  if (!reg) { reg = true; api.registrar({ res: S.ganador === 0 ? 'victoria' : 'derrota', variante: `${S.jug.length - 1} CPU · ${H.NIVEL[S.nivel]}` }); guardar(); }
  api.sonido(S.ganador === 0 ? 'ganar' : 'error'); pintar();
}
function bucle() {
  clearTimeout(timer); if (!S) return;
  if (S.fase === 'fin') { fin(); return; }
  if (S.jug[S.turno].cpu) timer = setTimeout(pasoCPU, 1150);
  else pintar();
}
// Efectos de una jugada (propia o de una CPU): avisos y gritos
function tras(i, r, carta) {
  nueva = S.desc.length; api.sonido('tic');
  if (r.castigoGrito) { api.sonido('error'); api.aviso(`🚨 ¡${S.jug[i].nombre === 'Tú' ? 'No has gritado' : S.jug[i].nombre + ' no gritó'} Hijoputa! +${H.PENA} cartas.`); }
  else if (r.victima !== undefined) api.aviso(`🅰️ ${S.jug[r.victima].nombre === 'Tú' ? 'Robas 1 y pierdes el turno' : S.jug[r.victima].nombre + ' roba 1 y pierde el turno'}.`);
  else if (r.extra) api.aviso(`👑 ¡${S.jug[i].nombre === 'Tú' ? 'Repites' : S.jug[i].nombre + ' repite'} turno!`);
  else if (H.esDos(carta)) api.aviso(`✌️ Castigo acumulado: +${S.castigo}.`);
  if (!r.ganador && S.jug[i].cpu && H.cpuGrita(S, i)) { decir(i, '¡HIJOPUTA!'); api.aviso(`📣 ¡${S.jug[i].nombre} grita HIJOPUTA!`); }
}
function pasoCPU() {
  if (!S || S.fase === 'fin' || !S.jug[S.turno].cpu) return; const i = S.turno;
  const p = H.pillar(S, i);
  if (p >= 0) { api.sonido('error'); api.aviso(`🎯 ¡${S.jug[i].nombre} pilla a ${S.jug[p].nombre === 'Tú' ? 'ti' : S.jug[p].nombre}! +${H.PENA} cartas.`); pintar(); guardar(); timer = setTimeout(pasoCPU, 1100); return; }
  const d = H.decidir(S, i);
  if (d.tipo === 'jugar') { const r = H.jugar(S, i, d.carta, d.palo); if (r.ok) tras(i, r, d.carta); }
  else if (d.tipo === 'robar') { const r = H.robar(S, i); if (r.castigo) api.aviso(`📥 ${S.jug[i].nombre} roba ${r.cartas} por el castigo.`); }
  else H.pasar(S, i);
  pintar(); guardar(); bucle();
}
function jugarCarta(c) {
  if (!S || !mias() || !H.jugables(S, 0).includes(c)) { if (S && mias()) { api.sonido('error'); api.aviso(S.castigo ? 'Con el castigo solo vale otro 2.' : 'Esa carta no encaja: mismo palo o mismo número.'); } return; }
  if (H.esSota(c)) {
    const m = api.modal('🃏 Sota: elige el palo', `<div class="hppalos">${H.PALOS.map((n, p) => `<button type="button" class="hpelige" data-p="${p}" style="--c:${COLOR_PALO[p]}"><svg viewBox="0 0 24 24"><use href="#es-${p}"/></svg><span>${n}</span></button>`).join('')}</div>`);
    m.cuerpo.addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return; m.cerrar(); ejecutar(c, +b.dataset.p); });
    return;
  }
  ejecutar(c, -1);
}
function ejecutar(c, palo) {
  const r = H.jugar(S, 0, c, palo); if (!r.ok) return; tras(0, r, c); pintar(); guardar(); bucle();
}
function robarYo() {
  if (!S || !mias() || S.fase !== 'jugar') return;
  if (!S.castigo && H.puedeJugar(S, 0)) { api.sonido('error'); api.aviso('Tienes cartas que encajan: juega una.'); return; }
  const r = H.robar(S, 0); if (!r.ok) return; api.sonido('tic');
  if (r.castigo) api.aviso(`📥 Robas ${r.cartas} por el castigo y pierdes el turno.`);
  else if (r.pasa) api.aviso(r.cartas ? 'Robas una carta y no encaja: pasas.' : 'No quedan cartas: pasas.');
  pintar(); guardar(); bucle();
}
function clic(e) {
  const k = e.target.closest('[data-c]'); if (k && S) return jugarCarta(+k.dataset.c);
  const ac = e.target.closest('[data-acusar]'); if (ac && S) return acusar(+ac.dataset.acusar);
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.cfg) { cfg[d.cfg] = d.cfg === 'nivel' ? d.v : +d.v; return setup(); }
  const a = d.ac;
  if (a === 'start') empezar(); else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas();
  else if (a === 'setup') { api.borrar(); setup(); } else if (a === 'otra') { api.borrar(); empezar(); }
  else if (!S) return;
  else if (a === 'robar') robarYo();
  else if (a === 'pasar') { if (H.pasar(S, 0)) { api.sonido('tic'); pintar(); guardar(); bucle(); } }
  else if (a === 'gritar') { if (H.gritar(S, 0)) { api.sonido('bola'); api.aviso('📣 ¡HIJOPUTA!'); decirYo(); pintar(); guardar(); } }
}
function decirYo() { /* el aviso ya sale como mensaje; el botón desaparece al gritar */ }
function acusar(k) {
  if (!S || S.fase === 'fin') return;
  if (H.acusar(S, k)) { api.sonido('ganar'); api.aviso(`🎯 ¡Pillado! ${S.jug[k].nombre} no gritó y roba ${H.PENA} cartas.`); pintar(); guardar(); }
  else if (S.jug[k].mano.length === 1 && S.jug[k].gritado) api.aviso(`${S.jug[k].nombre} ya había gritado.`);
  else api.aviso('Falsa alarma: solo se acusa a quien se queda con una carta sin gritar.');
}
function reglas() {
  api.modal('Hijoputa', `<ul><li>Baraja española de 40 cartas, 7 para cada jugador (2 a 4 jugadores). Se juega una carta del <b>mismo palo o del mismo número</b> que la de arriba.</li>
    <li>Si no puedes jugar, toca el <b>mazo</b> y roba <b>una</b> carta: si encaja, la juegas o la guardas y pasas.</li>
    <li><b>Sota</b>: comodín, se puede tirar sobre cualquier carta y eliges el nuevo palo.</li>
    <li><b>2</b>: el siguiente roba 2 y pierde el turno, salvo que tenga otro 2 y lo encadene (el castigo se acumula: +2, +4, +6…).</li>
    <li><b>As</b>: el siguiente roba 1 y pierde el turno.</li>
    <li><b>Rey</b>: repites turno.</li>
    <li><b>¡Hijoputa!</b> Cuando te quedes con <b>una sola carta</b> pulsa el botón antes de jugar la última. Si no lo haces y te pillan (o juegas la última sin haber gritado) robas <b>5 cartas</b>. Y tú puedes pillar a las CPU: toca su zona cuando aparezca «¡Acúsale!».</li>
    <li>Gana quien se queda sin cartas.</li></ul>`);
}
