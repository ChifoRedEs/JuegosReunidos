import { $, esc } from '../../core/dom.js';
import { TEMAS } from './temas.js';
import { NIVELES, RONDAS, OTRAVEZ, preparar, buscar, conocimiento, turnoCPU, retardoCPU, temaAlAzar, ganaPartida } from './motor.js';

const IMG = new URL('../../../img/daleotravez/', import.meta.url).href, NPJ = 12;
const NOMBRES = ['Lola', 'Hugo', 'Charo', 'Samuel', 'Marta', 'Teo', 'Pili', 'Omar', 'Irene', 'Nico', 'Rosa', 'Bruno'];
const TEMA = Object.fromEntries(TEMAS.map(t => [t.id, t])), ENT = {};
const entradas = id => ENT[id] || (ENT[id] = preparar(TEMA[id]));
let pausaMs = null, S = null, api = null, asp = null, root = null, timer = null, tCPU = null, tFin = 0, onKey = null, esc_ = 0, bloqueo = false;

/* ---------- validación / resumen ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || !Object.hasOwn(NIVELES, d.nivel) || !RONDAS.includes(d.rondas)) return null;
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  if (!ent(d.yo, 0, NPJ - 1) || !ent(d.rival, 0, NPJ - 1) || d.yo === d.rival) return null;
  if (!Array.isArray(d.pts) || d.pts.length !== 2 || !d.pts.every(v => ent(v, 0, 9)) || !ent(d.ronda, 1, d.rondas) || !ent(d.turno, 0, 1)) return null;
  if (typeof d.tema !== 'string' || !Object.hasOwn(TEMA, d.tema)) return null;
  const n = entradas(d.tema).length;
  if (!Array.isArray(d.dichas) || d.dichas.length > n || !d.dichas.every(x => Array.isArray(x) && ent(x[0], 0, n - 1) && (x[1] === 0 || x[1] === 1))) return null;
  if (new Set(d.dichas.map(x => x[0])).size !== d.dichas.length) return null;
  if (!Array.isArray(d.conoce) || !d.conoce.every(v => ent(v, 0, n - 1))) return null;
  if (!Array.isArray(d.vistos) || !d.vistos.every(v => typeof v === 'string' && Object.hasOwn(TEMA, v))) return null;
  if (![null, 'ronda', 'partida'].includes(d.fin)) return null;
  return { nivel: d.nivel, rondas: d.rondas, yo: d.yo, rival: d.rival, pts: d.pts.slice(), ronda: d.ronda, turno: d.turno, tema: d.tema, dichas: d.dichas.map(x => [x[0], x[1]]), conoce: [...new Set(d.conoce)],
    vistos: d.vistos.slice(-30), otra: ent(d.otra, 0, OTRAVEZ) ? d.otra : OTRAVEZ, fin: d.fin, quien: d.quien === 0 || d.quien === 1 ? d.quien : null, motivo: typeof d.motivo === 'string' ? d.motivo.slice(0, 160) : '', inicia: d.inicia === 1 ? 1 : 0, reg: !!d.reg };
}
export const migrarV1 = d => d;
export function resumen(d) {
  const nv = NIVELES[d.nivel].nombre;
  if (d.fin === 'partida') return { texto: `${nv} · ${d.pts[0]}–${d.pts[1]} · ${d.pts[0] > d.pts[1] ? '¡Ganada!' : 'Perdida'}`, fin: true };
  return { texto: `${nv} · ronda ${d.ronda}/${d.rondas} · ${d.pts[0]}–${d.pts[1]}`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; bloqueo = false;
  asp = api.aspecto([
    { clave: 'escenario', titulo: 'Plató', icono: '🎬', def: 'dia', ventana: true, forma: 'tapete', opciones: [{ id: 'dia', nombre: 'Plató clásico', img: IMG + 'plato-dia.webp' }, { id: 'neon', nombre: 'Plató neón', img: IMG + 'plato-neon.webp' }] },
    { clave: 'yo', titulo: 'Tu concursante', icono: '🧑‍🎤', def: 'c0', ventana: true, forma: 'carta', opciones: Array.from({ length: NPJ }, (_, k) => ({ id: 'c' + k, nombre: NOMBRES[k], img: `${IMG}c${k}-a.webp` })) },
  ], cambioAspecto);
  await api.css(new URL('./daleotravez.css', import.meta.url));
  const g = api.cargar(); S = g ? { ...g } : null;
  root.innerHTML = `<div class="dv-top"><span id="dvRonda"></span><b id="dvPts"></b></div>
    <div class="dv-plato" id="dvPlato">
      <div class="dv-p dv-yo"><div class="dv-bub" id="dvBubYo" hidden></div><img id="dvImgYo" alt=""><small id="dvNomYo"></small></div>
      <div class="dv-centro"><img id="dvIcono" alt=""><b id="dvTema"></b><span id="dvCuenta" class="mut"></span></div>
      <div class="dv-p dv-ri"><div class="dv-bub" id="dvBubRi" hidden></div><img id="dvImgRi" alt=""><small id="dvNomRi"></small></div>
    </div>
    <div class="dv-reloj" aria-hidden="true"><i id="dvBarra"></i></div>
    <div class="dv-msg" id="dvMsg" role="status" aria-live="polite"></div>
    <form class="dv-form" id="dvForm" autocomplete="off"><input id="dvTxt" type="text" enterkeyhint="send" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="40" placeholder="Escribe una respuesta…" aria-label="Tu respuesta"><button class="btn on" id="dvOk" type="submit">¡Dale!</button></form>
    <div class="dv-otra"><span class="mut">Otra vez:</span><span id="dvOtra"></span></div>
    <div class="dv-dichas" id="dvDichas" aria-label="Respuestas dichas"></div>
    <div class="dv-fin" id="dvFin" hidden></div>${api.barraHtml()}`;
  $('#dvForm').addEventListener('submit', enviar);
  root.addEventListener('click', clic);
  api.barra({ nueva: () => nueva(false), etiqueta: 'Nueva partida',
    pausar: () => { if (S && !S.fin && timer) { pausaMs = Math.max(500, tFin - Date.now()); parar(); } },
    reanudar: () => { if (S && !S.fin && pausaMs != null) { const r = pausaMs; pausaMs = null; turno(r); } }, salir: () => { location.hash = '#/cat/palabras'; },
    config: { valores: () => ({ nivel: S.nivel, rondas: S.rondas }), grupos: v => [{ clave: 'nivel', titulo: 'Nivel', nota: (NIVELES[v.nivel] || {}).ayuda, opciones: Object.entries(NIVELES).map(([k, x]) => [k, x.nombre]) }, { clave: 'rondas', titulo: 'Rondas', opciones: RONDAS.map(n => [n, `Al mejor de ${n}`]) }], aplicar: v => nueva(true, v) } });
  api.menu([{ texto: 'Nueva partida', accion: () => nueva(false) }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: '📖 Reglas', accion: reglas }]);
  if (!S) nueva(true); else reanudar();
}
export function unmount() {
  parar(); if (S) guardar();
  if (root) root.removeEventListener('click', clic);
  S = null; api = null; asp = null; root = null;
}
function parar() { clearInterval(timer); clearTimeout(tCPU); timer = tCPU = null; }
function guardar() { if (!S) return; const d = { ...S }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }
function cambioAspecto() {
  if (!root || !asp) return; const j = root.closest('.juego-daleotravez'); if (j) j.dataset.escenario = asp.valores.escenario || 'dia';
  const yo = Number((asp.valores.yo || 'c0').slice(1)) || 0;
  if (S && yo !== S.yo) { if (S.rival === yo) S.rival = S.yo; S.yo = yo; pintar(); guardar(); }
}

/* ---------- partida ---------- */
const hayProgreso = () => S && S.fin !== 'partida' && (S.ronda > 1 || S.dichas.length || S.pts[0] || S.pts[1]);
async function nueva(forzar, v) {
  if (!forzar && hayProgreso() && !await api.confirmar('¿Empezar una partida nueva? Perderás la actual.')) return;
  parar();
  const nivel = v ? v.nivel : (S ? S.nivel : api.pref('nivel', 'medio')), rondas = Number(v ? v.rondas : (S ? S.rondas : api.pref('rondas', 3))) || 3;
  api.setPref('nivel', nivel); api.setPref('rondas', rondas);
  const yo = Number((asp.valores.yo || 'c0').slice(1)) || 0; let rival; do rival = Math.floor(Math.random() * NPJ); while (rival === yo);
  S = { nivel, rondas, yo, rival, pts: [0, 0], ronda: 1, turno: 0, tema: 'granja', dichas: [], conoce: [], vistos: [], otra: OTRAVEZ, fin: null, quien: null, motivo: '', inicia: Math.random() < 0.5 ? 1 : 0, reg: false };
  $('#dvFin').hidden = true; empezarRonda();
}
function empezarRonda() {
  parar(); const t = temaAlAzar(S.vistos); S.tema = t.id; S.vistos.push(t.id);
  S.dichas = []; S.otra = OTRAVEZ; S.fin = null; S.quien = null; S.motivo = '';
  S.turno = (S.inicia + S.ronda - 1) % 2;                         // se alternan las salidas
  S.conoce = [...conocimiento(entradas(t.id).length, S.nivel)];
  $('#dvFin').hidden = true; pintar(); guardar(); turno();
}
function reanudar() { cambioAspecto(); $('#dvFin').hidden = true; pintar(); if (S.fin) mostrarFin(); else turno(); }
function turno(resto) {
  parar(); if (!S || S.fin) return; pintar(); pausaMs = null;
  const seg = NIVELES[S.nivel].seg; tFin = Date.now() + (resto || seg * 1000);
  timer = setInterval(reloj, 100); reloj();
  if (S.turno === 1) {
    tCPU = setTimeout(jugadaCPU, Math.min(retardoCPU(S.nivel), (resto || seg * 1000) - 800));
  } else { const i = $('#dvTxt'); if (i && !bloqueo) setTimeout(() => i.focus({ preventScroll: true }), 50); }
}
function reloj() {
  if (!S || !root) return; const resto = tFin - Date.now(), seg = NIVELES[S.nivel].seg * 1000;
  const b = $('#dvBarra'); if (b) { b.style.width = Math.max(0, resto / seg * 100) + '%'; b.classList.toggle('ap', resto < 4000); }
  if (resto <= 0) { parar(); acabar(S.turno, 'Se acabó el tiempo: ' + (S.turno === 0 ? 'no dijiste nada a tiempo.' : `${NOMBRES[S.rival]} no encontró respuesta.`)); }
}
function jugadaCPU() {
  if (!S || S.turno !== 1 || S.fin) return;
  const ent = entradas(S.tema), usadas = new Set(S.dichas.map(x => x[0])), i = turnoCPU(ent.length, usadas, new Set(S.conoce));
  if (i < 0) { parar(); return acabar(1, `${NOMBRES[S.rival]} se ha quedado sin ideas.`); }
  decir(1, i);
}
function decir(quien, i) {
  S.dichas.push([i, quien]); S.turno = 1 - quien; api.sonido(quien === 0 ? 'ok' : 'click');
  if (S.dichas.length >= entradas(S.tema).length) { parar(); S.fin = 'ronda'; S.quien = null; S.motivo = '¡No queda ninguna respuesta! Ronda en tablas.'; guardar(); return mostrarFin(); }
  guardar(); turno();
}
function enviar(ev) {
  ev.preventDefault(); if (!S || S.turno !== 0 || S.fin || bloqueo) return;
  const inp = $('#dvTxt'), txt = inp.value; if (!txt.trim()) return;
  const ent = entradas(S.tema), i = buscar(ent, txt);
  if (i < 0) {
    if (S.otra > 0) { S.otra--; api.sonido('error'); msg(`«${esc(txt.trim())}» no me suena en este tema. ¡Otra vez! (te quedan ${S.otra})`); inp.select(); pintarOtra(); guardar(); return; }
    parar(); return acabar(0, `«${txt.trim()}» no está entre las respuestas de este tema.`);
  }
  if (S.dichas.some(x => x[0] === i)) { parar(); return acabar(0, `Repetiste «${ent[i].nombre}»: ya estaba dicha.`); }
  inp.value = ''; msg(''); decir(0, i);
}
function acabar(perdedor, motivo) {
  parar(); if (!S || S.fin) return; api.sonido(perdedor === 0 ? 'error' : 'ganar');
  const g = 1 - perdedor; S.pts[g]++; S.quien = g; S.motivo = motivo;
  S.fin = ganaPartida(S.pts[g], S.rondas) ? 'partida' : 'ronda';
  if (S.fin === 'partida' && !S.reg) { S.reg = true; api.registrar({ res: g === 0 ? 'victoria' : 'derrota', variante: `${NIVELES[S.nivel].nombre} · al mejor de ${S.rondas}` }); }
  guardar(); pintar(); msg(''); mostrarFin();
}

/* ---------- pintar ---------- */
function msg(t) { const m = $('#dvMsg'); if (m) m.innerHTML = t; }
function pintarOtra() { $('#dvOtra').innerHTML = Array.from({ length: OTRAVEZ }, (_, k) => `<img class="${k < S.otra ? '' : 'gasta'}" src="${IMG}o-otra.webp" alt="" width="22" height="22">`).join(''); }
function pintar() {
  if (!S || !root) return; const t = TEMA[S.tema], ent = entradas(S.tema), j = root.closest('.juego-daleotravez'); if (j) j.dataset.escenario = asp.valores.escenario || 'dia';
  $('#dvRonda').textContent = S.fin === 'partida' ? 'Final' : `Ronda ${S.ronda} de ${S.rondas}`;
  $('#dvPts').textContent = `Tú ${S.pts[0]} – ${S.pts[1]} ${NOMBRES[S.rival]}`;
  $('#dvIcono').src = `${IMG}t-${t.icono}.webp`; $('#dvTema').textContent = t.nombre; $('#dvCuenta').textContent = `${S.dichas.length} dicha${S.dichas.length === 1 ? '' : 's'}`;
  const hab = (q, im, nom, bub) => {
    const ult = [...S.dichas].reverse().find(x => x[1] === q), hablando = !S.fin && S.turno === q;
    $(im).src = `${IMG}c${q === 0 ? S.yo : S.rival}-${hablando ? 'b' : 'a'}.webp`; $(nom).textContent = q === 0 ? 'Tú' : NOMBRES[S.rival];
    const b = $(bub); b.hidden = !ult; b.textContent = ult ? ent[ult[0]].nombre : '';
    b.parentElement.classList.toggle('turno', hablando);
  };
  hab(0, '#dvImgYo', '#dvNomYo', '#dvBubYo'); hab(1, '#dvImgRi', '#dvNomRi', '#dvBubRi');
  $('#dvDichas').innerHTML = S.dichas.map(([i, q]) => `<span class="${q === 0 ? 'yo' : 'ri'}">${esc(ent[i].nombre)}</span>`).join('');
  const mio = S.turno === 0 && !S.fin; $('#dvForm').classList.toggle('apag', !mio); $('#dvTxt').disabled = !mio; $('#dvOk').disabled = !mio;
  if (!S.fin) msg(mio ? 'Tu turno: di algo que no se haya dicho.' : `Turno de ${NOMBRES[S.rival]}…`);
  pintarOtra();
}
function mostrarFin() {
  parar(); const f = $('#dvFin'), ent = entradas(S.tema), usadas = new Set(S.dichas.map(x => x[0]));
  const resto = ent.filter(e => !usadas.has(e.i)).slice(0, 8).map(e => e.nombre);
  const gano = S.quien === 0, tabla = S.quien === null, partida = S.fin === 'partida';
  const ic = tabla ? 'o-otra' : gano ? (partida ? 'o-copa' : 'o-ok') : 'o-no';
  const tit = partida ? (gano ? '¡Has ganado el concurso!' : `${NOMBRES[S.rival]} gana el concurso`) : tabla ? 'Ronda en tablas' : gano ? '¡Punto para ti!' : `Punto para ${NOMBRES[S.rival]}`;
  f.innerHTML = `<img src="${IMG}${ic}.webp" alt="" width="64" height="64"><h3>${esc(tit)}</h3><p>${esc(S.motivo)}</p>${resto.length ? `<p class="mut">También valían: ${esc(resto.join(', '))}…</p>` : ''}<p><b>Tú ${S.pts[0]} – ${S.pts[1]} ${esc(NOMBRES[S.rival])}</b></p><div class="bar"><button class="btn on" data-ac="${partida ? 'nueva' : 'sig'}">${partida ? 'Otra partida' : 'Siguiente ronda'}</button></div>`;
  f.hidden = false; f.querySelector('button').focus({ preventScroll: true });
}
function clic(e) {
  const b = e.target.closest('[data-ac]'); if (!b || !root.contains(b)) return;
  if (b.dataset.ac === 'sig') { S.ronda++; empezarRonda(); } else if (b.dataset.ac === 'nueva') nueva(true);
}
function reglas() {
  api.modal('Dale Otra Vez', `<ul><li>Cada ronda sale un <b>tema</b> (frutas, deportes, países…). Tú y tu rival os turnáis para decir <b>una respuesta del tema</b>.</li>
    <li>Pierdes la ronda si <b>repites</b> algo que ya se dijo, si <b>te quedas sin tiempo</b> o si dices algo que no es del tema.</li>
    <li>Si escribes algo que no reconozco, tienes ${OTRAVEZ} <b>«Otra vez»</b> por ronda: no pierdes, pero tienes que intentarlo de nuevo.</li>
    <li>Se admiten plurales, sinónimos habituales, mayúsculas y tildes; una letra mal escrita también.</li>
    <li>Gana el concurso quien consiga más de la mitad de las rondas.</li></ul>`);
}
