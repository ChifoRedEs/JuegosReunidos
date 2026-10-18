import { $, esc } from '../../core/dom.js';
import { crearTeclado } from '../../core/teclado.js';
import { silabas } from './silabas.js';
import * as E from './motor.js';
import * as D from '../../core/diccionario.js';

let S = null, api = null, asp = null, root = null, reg = false, tk = null, reloj = null, cpuT = null, onKey = null;
let texto = '', duda = '', restante = 0, ultimo = 0, bocadillo = '', marcador = { g: 0, p: 0, record: 0 };
let cfg = { modo: 'cpu', nivel: 'normal', enlace: 'silaba', tiempo: 30, nombres: ['Jugador 1', 'Jugador 2', 'Jugador 3', 'Jugador 4'], n: 2 };

/* ---------- validación / resumen ---------- */
export function validar(d) {
  const s = d && E.validar(d.s); if (!s) return null;
  const m = d.marcador && typeof d.marcador === 'object' ? d.marcador : {}, e = v => (Number.isInteger(v) && v >= 0 && v <= 99999 ? v : 0);
  return { s, marcador: { g: e(m.g), p: e(m.p), record: e(m.record) }, reg: !!d.reg };
}
export const migrarV1 = d => d;
export function resumen(d) {
  const s = d.s;
  if (s.fase === 'fin') return { texto: s.modo === 'solo' ? `Cadena récord: ${s.mejorCadena}` : `Ganó ${s.jug[s.ganador].nombre}`, fin: true };
  return { texto: s.modo === 'solo' ? `${s.jug[0].palabras} palabras · ${s.jug[0].vidas} vidas` : `${s.jug.map(j => `${j.nombre} ${'❤️'.repeat(j.vidas)}`).join(' · ')}`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; texto = ''; duda = ''; bocadillo = '';
  asp = api.aspecto([{ clave: 'tema', titulo: 'Colores', def: 'menta', opciones: [{ id: 'menta', nombre: 'Menta', sw: ['#12B76A', '#0B7A4B'] }, { id: 'coral', nombre: 'Coral', sw: ['#FF6B6B', '#C2334D'] }, { id: 'lila', nombre: 'Lila', sw: ['#8B5CF6', '#5B2DD4'] }] }], () => { if (S) pintar(); });
  await api.css(new URL('./encadenadas.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && ['solo', 'cpu', 'grupo'].includes(c0.modo) && E.NIVEL[c0.nivel] && E.ENLACES[c0.enlace] && E.TIEMPOS.includes(c0.tiempo)) cfg = { ...cfg, ...c0 };
  E.diccionario(aprendidas());
  // Diccionario grande en segundo plano: cuando llega, valida cualquier palabra real y da más variedad a la CPU
  Promise.all([D.cargar(), D.cargarLemas()]).then(([a, b]) => { if (a || b) E.ampliar({ existe: a ? D.existe : null, palabras: b ? D.lemas('todos', { min: 3 }) : [] }); });
  const g = api.cargar();
  if (g) { S = g.s; marcador = g.marcador; reg = g.reg; } else S = null;
  tk = crearTeclado({ filas: ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM', '✔'], borrar: true, alPulsar: tecla, titulo: 'Encadenadas · escribe tu palabra' });
  root.addEventListener('click', clic); root.addEventListener('input', alEscribir); onKey = teclado; document.addEventListener('keydown', onKey);
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Cómo se juega', accion: reglas }]);
  if (S) { armar(); empezarTurno(); } else setup();
}
export function unmount() { parar(); document.removeEventListener('keydown', onKey); if (root) { root.removeEventListener('click', clic); root.removeEventListener('input', alEscribir); } if (tk) { tk.destruir(); tk = null; } S = null; asp = null; }
function guardar() { if (!S) return; const d = { s: S, marcador, reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }
const aprendidas = () => { const a = api.pref('aprendidas', []); return Array.isArray(a) ? a.filter(w => typeof w === 'string').slice(-500) : []; };

/* ---------- pantallas ---------- */
function setup() {
  S = null; parar(); if (tk) tk.cerrar();
  const seg = (k, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${cfg[k] === v ? 'on' : ''}" data-cfg="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  root.innerHTML = `<p class="note">Cada palabra tiene que empezar por la <b>última sílaba</b> de la anterior: ca·<b>SA</b> → <b>SA</b>·po → <b>PO</b>·llo… Sin repetir. Si no se te ocurre ninguna a tiempo, pierdes una vida.</p>
    <div class="bar"><span class="lbl">Modo</span>${seg('modo', [['cpu', 'Contra la CPU'], ['solo', 'Solo (récord)'], ['grupo', 'En grupo']])}</div>
    ${cfg.modo === 'cpu' ? `<div class="bar"><span class="lbl">Nivel</span>${seg('nivel', Object.entries(E.NIVEL))}</div>` : ''}
    ${cfg.modo === 'grupo' ? `<div class="bar"><span class="lbl">Jugadores</span>${seg('n', [[2, '2'], [3, '3'], [4, '4']])}</div>${cfg.nombres.slice(0, cfg.n).map((n, i) => `<input class="ennom" data-name="${i}" maxlength="14" value="${esc(n)}" aria-label="Nombre del jugador ${i + 1}">`).join('')}` : ''}
    <div class="bar"><span class="lbl">Enlazar con</span>${seg('enlace', Object.entries(E.ENLACES))}</div>
    <div class="bar"><span class="lbl">Tiempo</span>${seg('tiempo', E.TIEMPOS.map(t => [t, t ? `${t} s` : 'Sin límite']))}</div>
    <p class="note">${cfg.modo === 'cpu' ? 'La CPU difícil intenta dejarte sílabas complicadas. ' : cfg.modo === 'grupo' ? 'Os pasáis el móvil por turnos; si alguien dice una palabra que no está en el diccionario, decidís entre todos si vale. ' : 'Encadena tus propias palabras: ¿hasta dónde llegas? '}Cada jugador tiene ${E.VIDAS} vidas.${marcador.record ? ` Tu récord en solitario: ${marcador.record} palabras.` : ''}</p>
    <div class="bar"><button class="btn on" data-ac="start">¡A encadenar!</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>`;
}
function armar() {
  root.innerHTML = `<div class="enjug" id="enJug"></div>
    <div class="encadena" id="enCadena"></div>
    <div class="enreq" id="enReq"></div>
    <div class="enbarra" id="enBarra"><i id="enBarraI"></i></div>
    <div class="enresp" id="enResp" role="button" tabindex="0" data-ac="teclado" aria-label="Tu palabra: toca para escribir"></div>
    <div class="endud" id="enDuda" hidden></div>
    <div class="bar enacc" id="enAcc"><button class="btn on" data-ac="jugar">✔ Jugar</button><button class="btn" data-ac="nose">🏳️ No sé</button><button class="btn tkabrir" data-ac="teclado" aria-label="Abrir teclado">⌨️</button></div>
    <div id="enFin"></div>
    <ul class="enlog" id="enLog"></ul>
    <div class="bar"><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button><button class="btn" data-ac="nueva">Nueva partida</button></div>`;
}
function nuevaSetup() { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; parar(); api.borrar(); setup(); }
function empezar() {
  api.setPref('cfg', cfg);
  S = E.crear({ modo: cfg.modo, nivel: cfg.nivel, enlace: cfg.enlace, tiempo: cfg.tiempo, jugadores: cfg.nombres.slice(0, cfg.n).map(n => ({ nombre: n.trim() || 'Jugador' })), aprendidas: aprendidas() });
  reg = false; texto = ''; duda = ''; bocadillo = '';
  armar(); guardar(); empezarTurno();
}

/* ---------- turnos y reloj ---------- */
const humano = () => S && S.fase === 'jugar' && !S.jug[S.turno].cpu;
function parar() { clearInterval(reloj); reloj = null; clearTimeout(cpuT); cpuT = null; }
function empezarTurno() {
  parar(); if (!S) return;
  if (S.fase === 'fin') { pintar(); return cierre(); }
  restante = S.tiempo * 1000; ultimo = performance.now(); duda = ''; texto = '';
  pintar();
  if (S.tiempo) reloj = setInterval(() => {
    const ahora = performance.now(), dt = ahora - ultimo; ultimo = ahora;
    if (!S || S.fase !== 'jugar' || document.hidden || document.querySelector('.modal') || duda) return;
    restante -= Math.min(dt, 500); pintarBarra();
    if (restante <= 0) { parar(); api.sonido('error'); api.vibrar([60, 30, 60]); E.fallar(S, 'tiempo'); guardar(); api.aviso('⏰ ¡Se acabó el tiempo!'); empezarTurno(); }
  }, 100);
  if (S.jug[S.turno].cpu) { if (tk) tk.cerrar(); turnoCPU(); } else if (tk) tk.abrir();
}
function turnoCPU() {
  bocadillo = '🤔 Pensando…'; pintar();
  const espera = 1200 + Math.random() * (S.nivel === 'facil' ? 3500 : 2200);
  cpuT = setTimeout(() => {
    if (!S || S.fase !== 'jugar' || !S.jug[S.turno].cpu) return;
    const w = E.cpuPalabra(S);
    if (w) { E.jugar(S, w); bocadillo = ''; api.sonido('ok'); } else { E.fallar(S); bocadillo = ''; api.sonido('error'); api.aviso('¡La CPU no encuentra palabra! Pierde una vida.'); }
    guardar(); empezarTurno();
  }, S.tiempo ? Math.min(espera, S.tiempo * 1000 - 800) : espera);
}

/* ---------- acciones ---------- */
function jugar(confirmada = false) {
  if (!humano()) return;
  if (!texto.trim()) { api.aviso('Escribe una palabra.'); return; }
  const err = E.jugar(S, texto, confirmada);
  if (err === 'NO_DIC') { duda = texto; pintar(); return; }
  if (err) { api.sonido('error'); api.aviso(err); return; }
  if (confirmada) { const a = aprendidas(); a.push(E.norm(texto)); api.setPref('aprendidas', [...new Set(a)].slice(-500)); }
  api.sonido('ok'); api.vibrar(15); texto = ''; duda = ''; guardar(); empezarTurno();
}
function nose() {
  if (!humano()) return;
  if (!api.confirmar('¿No encuentras palabra? Perderás una vida.')) return;
  E.fallar(S); api.sonido('error'); texto = ''; guardar(); empezarTurno();
}
function tecla(k) {
  if (!humano() || duda) return;
  if (k === '✔') return jugar();
  if (k === '⌫') texto = texto.slice(0, -1); else if (texto.length < 24) texto += k;
  pintarResp();
}
function teclado(e) {
  if (!S || document.querySelector('.modal') || /INPUT|TEXTAREA/.test(document.activeElement.tagName) || e.ctrlKey || e.metaKey || e.altKey || !humano() || duda) return;
  if (e.key === 'Enter') { e.preventDefault(); return jugar(); }
  if (e.key === 'Backspace') { e.preventDefault(); return tecla('⌫'); }
  if (e.key.length === 1 && /[a-zñáéíóúü]/i.test(e.key)) { texto += e.key.toUpperCase(); pintarResp(); }
}

/* ---------- pintado ---------- */
// Palabra con su última sílaba resaltada (y la primera si enlaza con la anterior)
function palabraHTML(w, enlaza) {
  const s = silabas(E.bonita(w)); if (!s.length) return esc(w);
  return s.map((x, i) => `<span class="${i === s.length - 1 ? 'ult' : ''} ${i === 0 && enlaza ? 'pri' : ''}">${esc(x)}</span>`).join('<i>·</i>');
}
function pintarBarra() {
  const b = $('#enBarra'); if (!b) return;
  b.hidden = !S.tiempo || S.fase !== 'jugar';
  const f = S.tiempo ? Math.max(0, restante / (S.tiempo * 1000)) : 1;
  $('#enBarraI').style.width = `${f * 100}%`; b.classList.toggle('poco', f < .3);
}
function pintarResp() {
  const el = $('#enResp'); if (!el) return;
  el.hidden = !humano();
  el.innerHTML = texto ? `${esc(texto)}<i class="cursor"></i>` : `<span class="ph">Empieza por ${esc(S.req.toUpperCase())}…</span><i class="cursor"></i>`;
}
function pintar() {
  if (!S || !$('#enJug')) return;
  const fin = S.fase === 'fin';
  $('#enJug').innerHTML = S.jug.map((J, k) => `<div class="enj ${k === S.turno && !fin ? 'turno' : ''} ${J.vidas ? '' : 'fuera'}"><b>${J.cpu ? '🤖 ' : ''}${esc(J.nombre)}</b><span>${'❤️'.repeat(J.vidas)}${'🤍'.repeat(E.VIDAS - J.vidas)}</span><small>${J.palabras} palabra${J.palabras === 1 ? '' : 's'}</small>${k === S.turno && J.cpu && bocadillo ? `<div class="enbo">${esc(bocadillo)}</div>` : ''}</div>`).join('')
    + (S.modo === 'solo' ? `<div class="enj"><b>Cadena</b><span>${S.cadena.filter(c => !c.inicio).length}</span><small>récord ${Math.max(marcador.record, S.mejorCadena)}</small></div>` : '');
  const vis = S.cadena.slice(-5);
  $('#enCadena').innerHTML = vis.map((c, i) => `<div class="enw ${i === vis.length - 1 ? 'ultima' : ''} ${c.inicio ? 'ini' : ''}">${c.inicio ? '<small>Empieza la cadena</small>' : `<small>${esc(S.jug[c.j] ? S.jug[c.j].nombre : '')}</small>`}<b>${palabraHTML(c.w, i > 0 && !c.inicio)}</b></div>`).join('<span class="enflecha">→</span>');
  const el = $('#enCadena'); el.scrollLeft = el.scrollWidth;
  $('#enReq').innerHTML = fin ? '' : `<span>${S.jug[S.turno].cpu ? 'La CPU busca una palabra que empiece por' : `${S.modo === 'grupo' ? `<b>${esc(S.jug[S.turno].nombre)}</b>: ` : ''}Empieza por`}</span><b class="sil">${esc(S.req.toUpperCase())}</b>${S.ajuste ? `<small>${esc(S.ajuste)}</small>` : ''}`;
  pintarBarra(); pintarResp();
  const d = $('#enDuda');
  d.hidden = !duda;
  d.innerHTML = duda ? `<p>«<b>${esc(duda)}</b>» no está en mi diccionario. ${S.modo === 'grupo' ? '¿Los demás aceptáis que es una palabra válida?' : '¿Seguro que es una palabra válida? (Si dices que sí, la aprenderé.)'}</p><div class="bar" style="justify-content:center"><button class="btn on" data-ac="sivale">✔ Sí, vale</button><button class="btn" data-ac="novale">✏️ La cambio</button></div>` : '';
  $('#enAcc').hidden = !humano() || !!duda;
  pintarFin();
  $('#enLog').innerHTML = S.log.map(x => `<li>${esc(x)}</li>`).join('');
}
function pintarFin() {
  const el = $('#enFin'); if (S.fase !== 'fin') { el.innerHTML = ''; return; }
  const t = S.modo === 'solo' ? `🔗 Cadena más larga: ${S.mejorCadena} palabras` : S.modo === 'cpu' ? (S.ganador === 0 ? '🏆 ¡Le ganas a la CPU!' : '🤖 Gana la CPU') : `🏆 ¡Gana ${esc(S.jug[S.ganador].nombre)}!`;
  el.innerHTML = `<div class="enres"><h3>${t}</h3><p class="note">${S.jug.map(J => `${esc(J.nombre)}: ${J.palabras} palabras`).join(' · ')}${S.modo === 'solo' ? ` · récord: ${marcador.record}` : ''}</p>
    <div class="bar" style="justify-content:center"><button class="btn on" data-ac="otra">🔁 Otra partida</button><button class="btn" data-ac="setup">Cambiar opciones</button></div></div>`;
}
function cierre() {
  parar(); if (tk) tk.cerrar();
  if (!reg) {
    reg = true;
    if (S.modo === 'cpu') { const g = S.ganador === 0; if (g) marcador.g++; else marcador.p++; api.registrar({ res: g ? 'victoria' : 'derrota', variante: `${E.NIVEL[S.nivel]} · ${E.ENLACES[S.enlace]}` }); api.sonido(g ? 'ganar' : 'perder'); }
    else if (S.modo === 'solo') { const nuevo = S.mejorCadena > marcador.record; marcador.record = Math.max(marcador.record, S.mejorCadena); api.registrar({ res: 'partida', variante: `Solo · cadena de ${S.mejorCadena}` }); api.sonido(nuevo ? 'ganar' : 'ok'); if (nuevo) api.aviso('🎉 ¡Nuevo récord!'); }
    else { api.registrar({ res: 'partida', variante: `Grupo de ${S.jug.length}` }); api.sonido('ganar'); }
  }
  pintar(); guardar();
}

/* ---------- entrada ---------- */
function alEscribir(e) { if (e.target.dataset && e.target.dataset.name != null) cfg.nombres[+e.target.dataset.name] = e.target.value.slice(0, 14); }
function clic(e) {
  const b = e.target.closest('button,[data-ac]'); if (!b) return; const d = b.dataset;
  if (d.cfg) { cfg[d.cfg] = ['tiempo', 'n'].includes(d.cfg) ? +d.v : d.v; return setup(); }
  const a = d.ac;
  if (a === 'start') empezar(); else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas(); else if (a === 'nueva') nuevaSetup();
  else if (a === 'setup') { api.borrar(); setup(); } else if (a === 'otra') { api.borrar(); empezar(); }
  else if (!S) return;
  else if (a === 'teclado') { if (humano() && !duda) tk.abrir(); }
  else if (a === 'jugar') jugar(); else if (a === 'nose') nose();
  else if (a === 'sivale') jugar(true);
  else if (a === 'novale') { duda = ''; texto = ''; pintar(); tk.abrir(); }
}
function reglas() {
  api.modal('Encadenadas', `<ul><li>Cada palabra debe empezar por la <b>última sílaba</b> de la anterior (o por la última letra o las dos últimas, según la opción elegida): ca·<b>sa</b> → <b>sa</b>·po → <b>po</b>·llo.</li>
    <li>Palabras de al menos 3 letras, sin repetir ninguna de la partida. Las tildes no importan.</li>
    <li>Como ninguna palabra empieza por «rr», la sílaba «rro» se enlaza con «ro» (pe·rro → ro·sa). Si ninguna palabra empieza por esa sílaba (mue·<b>ble</b>, can·<b>ción</b>…), vale con sus <b>dos últimas letras</b>; la app te lo avisa.</li>
    <li>Escribe con el <b>teclado emergente</b> (toca la casilla o ⌨️) y pulsa ✔. Si la palabra no está en el diccionario de la app, te pregunta si existe: si dices que sí, la aprende para siempre.</li>
    <li>La app usa el <b>diccionario de LibreOffice</b> (unas 590.000 formas: plurales y conjugaciones incluidas) para comprobar tus palabras, y la CPU elige entre unas 47.000 palabras base. La primera vez se descarga (≈1,5 MB) y queda guardado para jugar sin conexión.</li>
    <li>Si se te acaba el tiempo o pulsas 🏳️ «No sé», pierdes una vida y empieza una cadena nueva. Cada jugador tiene ${E.VIDAS} vidas: gana el último que quede (en solitario, intenta batir tu récord de cadena).</li></ul>`);
}
