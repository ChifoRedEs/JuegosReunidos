// Hotel · compra destinos turísticos, levanta hoteles piso a piso (1 a 5 estrellas) y cobra por noche. Tablero en 3D (Three.js).
// 2 a 4 jugadores, personas o CPU de 3 niveles.
import { $, esc, esperar } from '../../core/dom.js';
import { grupoTablero, grupoFondo } from '../../core/aspectos.js';
import { FICHAS as PERSONAJES, opcionesPersonajes } from '../../core/personajes.js';
import { GRUPOS, CASILLAS, AERO, SERV, SALARIO, FIANZA, MAX_NIVEL, COLORES_JUGADOR, FICHAS } from './datos.js';
import { Partida, REGLAS, NIVELES_CPU, validar as validarPartida } from './motor.js';

const ABORTO = Symbol('aborto');                 // al salir del juego a mitad de turno
const VELOCIDAD = { normal: { nombre: 'Normal', paso: 170, bot: 600, dado: 950 }, rapida: { nombre: 'Rápida', paso: 60, bot: 220, dado: 480 }, sin: { nombre: 'Sin animaciones', paso: 0, bot: 0, dado: 0 } };
let G = null, api = null, asp = null, root = null, vivo = false, jugando = false, reg = false, pendiente = null, onKey = null, sesion = 0;
let vista = null, modulo3d = null, obsTema = null, mqTema = null, retema = null;
// sesion: cambia al salir del juego o empezar otra partida; los turnos que estuvieran a medias se cancelan (ABORTO)
let cfg = { jug: [['Tú', 'h', 0], ['CPU 1', 'c', 1], ['CPU 2', 'c', 2], ['CPU 3', 'n', 3]], bote: true, subasta: true, dinero: 1600, rondas: 0, cpu: 1, vel: 'normal' };

/* ---------- validación / resumen ---------- */
export function validar(d) { const g = d && validarPartida(d.g); return g ? { g, reg: !!d.reg } : null; }
export const migrarV1 = d => d;
export function resumen(d) {
  const g = d.g;
  if (g.terminada) return { texto: `Ganó ${g.jug[g.ganador].nombre}`, fin: true };
  const vivos = g.jug.filter(p => !p.fuera), lider = vivos.reduce((a, b) => (b.dinero > a.dinero ? b : a));
  return { texto: `${vivos.length} jugadores · ronda ${g.ronda} · ${lider.nombre} va en cabeza`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; vivo = true; jugando = false; pendiente = null; vista = null;
  r.innerHTML = '<p class="note">Cargando el tablero 3D…</p>';
  try { modulo3d = await import('./vista3d.js'); } catch (e) { console.error(e); r.innerHTML = '<p class="note">No se ha podido cargar el motor 3D. Comprueba la conexión y vuelve a entrar.</p>'; return; }
  if (!vivo) return;
  const { ESTILOS } = modulo3d;
  asp = api.aspecto([grupoFondo('#htVista'), grupoTablero(),
    { clave: 'ficha', titulo: 'Tu personaje (jugador 1)', icono: '🧑', def: 'auto', opciones: [{ id: 'auto', nombre: 'El de la configuración', sec: 'Por defecto' }, ...opcionesPersonajes()] },
    { clave: 'estilo', titulo: 'Estilo de los hoteles', icono: '🏨', def: 'moderno', opciones: Object.entries(ESTILOS).map(([id, e]) => ({ id, nombre: e.nombre })) }],
  () => { if (G && vista) { aplicarPersonaje(); vista.estiloHotel(asp.valores.estilo); vista.tema(); pintar(); } });
  await api.css(new URL('./hotel.css', import.meta.url));
  const c0 = api.pref('cfg', null);
  if (c0 && Array.isArray(c0.jug) && c0.jug.length === 4) cfg = { ...cfg, ...c0, vel: VELOCIDAD[c0.vel] ? c0.vel : 'normal', cpu: [0, 1, 2].includes(c0.cpu) ? c0.cpu : 1, jug: c0.jug.map(([n, t, f], i) => [String(n).slice(0, 14), ['h', 'c', 'n'].includes(t) ? t : 'n', Number.isInteger(f) && f >= 0 && f < FICHAS.length ? f : i]) };
  const g = api.cargar(); reg = g ? g.reg : false;
  sesion++; G = g ? Partida.desde(g.g, crearGanchos(sesion)) : null;
  root.addEventListener('click', clic); root.addEventListener('input', alEscribir);
  onKey = e => { if (e.code === 'Space' && !pendiente && G && vista && !/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) { e.preventDefault(); jugar(); } };
  document.addEventListener('keydown', onKey);
  retema = () => { if (vista) vista.tema(); };
  obsTema = new MutationObserver(retema); obsTema.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  mqTema = matchMedia('(prefers-color-scheme: dark)'); mqTema.addEventListener('change', retema);
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '🏨 Mis hoteles', accion: () => gestionarDesdeBoton() }, { texto: '🤝 Intercambiar', accion: () => intercambioDesdeBoton() },
    { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  if (G && !G.terminada) { await armar(); if (!vivo) return; pintar(); log(`Partida recuperada: ronda ${G.ronda}.`); if (G.p().bot) jugar(); }
  else setup();
}
export function unmount() {
  vivo = false; jugando = false; sesion++;
  if (pendiente) { pendiente(ABORTO); pendiente = null; }
  document.removeEventListener('keydown', onKey);
  if (root) { root.removeEventListener('click', clic); root.removeEventListener('input', alEscribir); }
  if (obsTema) obsTema.disconnect(); if (mqTema && retema) mqTema.removeEventListener('change', retema);
  if (vista) { vista.destruir(); vista = null; }
  G = null; asp = null;
}
function guardar() { if (!G) return; const d = { g: G.toJSON(), reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }
const vel = () => VELOCIDAD[cfg.vel] || VELOCIDAD.normal;
const pausa = ms => (ms ? esperar(ms) : Promise.resolve());

/* ---------- pantalla de inicio ---------- */
function setup() {
  G = null; jugando = false; if (vista) { vista.destruir(); vista = null; }
  const n = cfg.jug.filter(j => j[1] !== 'n').length;
  root.innerHTML = `<p class="note">Compra destinos turísticos, completa zonas y levanta hoteles piso a piso, de 1 a 5 estrellas. Gana quien siga en pie cuando los demás quiebren${cfg.rondas ? ` o quien tenga más patrimonio tras ${cfg.rondas} rondas` : ''}.</p>
    ${cfg.jug.map(([nom, t, f], i) => `<div class="jugfila" style="--c:${COLORES_JUGADOR[i]}"><button class="htfichab" data-ficha="${i}" aria-label="Cambiar ficha del jugador ${i + 1}">${FICHAS[f]}</button><input class="nom" data-name="${i}" maxlength="14" value="${esc(nom)}" aria-label="Nombre del jugador ${i + 1}"><div class="seg">${[['h', 'Persona'], ['c', 'CPU'], ['n', 'Nadie']].map(([k, l]) => `<button class="btn ${t === k ? 'on' : ''}" data-tipo="${i},${k}">${l}</button>`).join('')}</div></div>`).join('')}
    <div class="bar"><span class="lbl">Dinero inicial</span><div class="seg">${[1200, 1600, 2000].map(v => `<button class="btn ${cfg.dinero === v ? 'on' : ''}" data-dinero="${v}">${v}M</button>`).join('')}</div></div>
    <div class="bar"><span class="lbl">Duración</span><div class="seg">${[[0, 'Hasta la quiebra'], [20, '20 rondas'], [40, '40 rondas']].map(([v, l]) => `<button class="btn ${cfg.rondas === v ? 'on' : ''}" data-rondas="${v}">${l}</button>`).join('')}</div></div>
    <div class="bar"><span class="lbl">Nivel de la CPU</span><div class="seg">${NIVELES_CPU.map((l, k) => `<button class="btn ${cfg.cpu === k ? 'on' : ''}" data-cpu="${k}">${l}</button>`).join('')}</div></div>
    <div class="bar"><span class="lbl">Velocidad</span><div class="seg">${Object.entries(VELOCIDAD).map(([k, v]) => `<button class="btn ${cfg.vel === k ? 'on' : ''}" data-vel="${k}">${v.nombre}</button>`).join('')}</div></div>
    <label class="chk"><input type="checkbox" data-op="bote" ${cfg.bote ? 'checked' : ''}><span><b>Bote de las Vacaciones</b>: las tasas, multas y fianzas se acumulan y se las lleva quien caiga en la casilla de Vacaciones.</span></label>
    <label class="chk"><input type="checkbox" data-op="subasta" ${cfg.subasta ? 'checked' : ''}><span><b>Subastas</b>: si quien cae en un destino libre no lo compra, se subasta entre todos.</span></label>
    <div class="bar"><button class="btn on" data-ac="start" ${n < 2 ? 'disabled' : ''}>Empezar</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>
    <p class="note">${n < 2 ? 'Hacen falta al menos 2 jugadores.' : `${n} jugadores. Las personas se pasan el móvil por turnos.`}</p>`;
}
function nuevaSetup() {
  if (G && !G.terminada && !api.confirmar('¿Abandonar la partida actual?')) return;
  sesion++; if (pendiente) { pendiente(ABORTO); pendiente = null; }
  api.borrar(); setup();
}
// «Tu personaje»: sustituye la ficha del primer jugador humano; si otro jugador tenía la misma, éste pasa a una libre.
const personajeElegido = () => (PERSONAJES[asp.valores.ficha] || {}).e || null;
function aplicarPersonaje() {
  const i = G.jug.findIndex(p => !p.bot); if (i < 0) return;
  const orig = cfg.jug.filter(j => j[1] !== 'n')[i], e = personajeElegido() || (orig ? FICHAS[orig[2]] : null);
  if (!e || G.jug[i].ficha === e) return;
  G.jug[i].ficha = e; if (vista) vista.personaje(i, e); guardar();
}
async function empezar() {
  const jugadores = cfg.jug.map(([nombre, t, f], i) => ({ nombre: nombre.trim() || `Jugador ${i + 1}`, ficha: FICHAS[f], color: COLORES_JUGADOR[i], bot: t === 'c', t })).filter(j => j.t !== 'n');
  if (jugadores.length < 2) return;
  const mio = personajeElegido(), h = jugadores.find(j => !j.bot);
  if (mio && h) { h.ficha = mio; jugadores.forEach(j => { if (j !== h && j.ficha === mio) j.ficha = FICHAS.find(f => !jugadores.some(q => q.ficha === f)) || j.ficha; }); }
  api.setPref('cfg', cfg);
  sesion++; G = new Partida(jugadores, crearGanchos(sesion), { bote: cfg.bote, subasta: cfg.subasta, dinero: cfg.dinero, rondas: cfg.rondas, cpu: cfg.cpu }); reg = false;
  await armar(); if (!vivo || !G) return; pintar(); log(`¡Empieza la partida! Cada jugador recibe ${cfg.dinero}M.`); guardar();
  if (G.p().bot) jugar();
}

/* ---------- pantalla de juego ---------- */
async function armar() {
  const sid = sesion;
  if (vista) { vista.destruir(); vista = null; }
  root.innerHTML = `<div class="htjug" id="htJug"></div>
    <div class="htvista" id="htVista"><div class="htcam" role="group" aria-label="Cámara">
      <button type="button" class="btn" data-cam="girar" aria-label="Girar el tablero 90 grados" title="Girar">⟳</button>
      <button type="button" class="btn" data-cam="cenital" aria-label="Vista desde arriba" title="Desde arriba">⤒</button>
      <button type="button" class="btn" data-cam="reset" aria-label="Reencuadrar el tablero" title="Reencuadrar">⌖</button></div>
      <div class="htcarga" id="htCarga">Preparando el tablero…</div></div>
    <div class="htpanel">
      <div class="htturno" id="htTurno"></div>
      <button class="btn on grande" data-ac="tirar" id="htTirar">🎲 Tirar</button>
      <div class="htacc"><button class="btn" data-ac="gestionar" id="htGes">🏨 Hoteles</button><button class="btn" data-ac="trato" id="htTrato">🤝 Trato</button></div>
      <small class="htbote" id="htBote"></small>
    </div>
    <div class="msg htmsg" id="htMsg" role="status" aria-live="polite"></div>
    <ul class="htlog" id="htLog" aria-label="Historial de la partida"></ul>
    <div class="bar"><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button><button class="btn" data-ac="nueva">Nueva partida</button></div>`;
  try {
    const v = await modulo3d.crearVista($('#htVista'), { estilo: asp.valores.estilo });
    if (!vivo || sid !== sesion) { v.destruir(); return; }
    v.alTocar = i => { if (G) alTocarCasilla(i); };
    vista = v; v.construir(G); aplicarPersonaje();
    const c = $('#htCarga'); if (c) c.remove();
  } catch (e) {
    console.error(e); const c = $('#htCarga');
    if (c) c.innerHTML = 'Este dispositivo no permite mostrar el tablero en 3D (WebGL).<br><button class="btn" data-ac="reintentar">Reintentar</button>';
  }
}
function pintar() {
  if (!G || !$('#htJug')) return;
  const act = G.terminada ? -1 : G.turno;
  $('#htJug').innerHTML = G.jug.map((p, i) => {
    const mias = G.propias(i);
    return `<div class="htj ${i === act ? 'turno' : ''} ${p.fuera ? 'fuera' : ''} ${i === G.ganador ? 'gana' : ''}" style="--c:${p.color}" data-j="${i}"><span class="htji">${esc(p.ficha)}</span><b>${esc(p.nombre)}</b><span class="htdin">${p.fuera ? 'Quiebra' : p.dinero + 'M'}</span>
      <small>${p.fuera ? '' : `Patrimonio ${G.patrimonio(p)}M${p.bot ? ' · CPU' : ''}${p.espera ? ' · 😷' : ''}${p.pases.length ? ' · 🎫' + (p.pases.length > 1 ? '×2' : '') : ''}`}</small>
      <span class="htchips">${mias.map(s => `<i class="${s.hip ? 'h' : ''}" style="background:${s.g ? GRUPOS[s.g].color : 'var(--mut)'}" title="${esc(s.nombre)}${s.nivel ? ' · ' + s.nivel + '★' : ''}"></i>`).join('')}</span></div>`;
  }).join('');
  const p = G.p(), humano = !p.bot && !p.fuera && !G.terminada, libre = humano && !jugando;
  $('#htTurno').innerHTML = G.terminada ? `🏆 Gana <b>${esc(G.jug[G.ganador].nombre)}</b>` : `Turno de <b style="color:${p.color}">${esc(p.ficha)} ${esc(p.nombre)}</b>${p.espera ? '<br><small>en cuarentena</small>' : ''}`;
  $('#htBote').textContent = `${G.reglas.bote ? `Bote: ${G.bote}M · ` : ''}Ronda ${G.ronda}${G.reglas.rondas ? ` de ${G.reglas.rondas}` : ''} · CPU ${NIVELES_CPU[G.reglas.cpu].toLowerCase()}`;
  $('#htTirar').disabled = !libre; $('#htGes').disabled = !libre; $('#htTrato').disabled = !libre || G.jug.filter(q => !q.fuera).length < 2;
  $('#htTirar').hidden = G.terminada;
  if (vista) { vista.actualizar(G); vista.resaltar(G.terminada ? -1 : p.pos, p.color); }
}
function log(html, clase = '') {
  const L = $('#htLog'); if (!L) return;
  const li = document.createElement('li'); li.className = clase; li.innerHTML = html; L.prepend(li);
  while (L.children.length > 80) L.lastChild.remove();
  const m = $('#htMsg'); if (m) { m.innerHTML = html; m.className = 'msg htmsg ' + clase; }
}

/* ---------- diálogos (hoja inferior, como el resto de la app) ---------- */
function dialogo(titulo, cuerpo, botones, { cancelable = false, auto = 0 } = {}) {
  return new Promise(res => {
    const m = document.createElement('div'); m.className = 'modal htmodal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    const h = document.createElement('div'); h.className = 'hoja';
    h.innerHTML = `<h2>${titulo}</h2><div class="cuerpo"></div><div class="bar htbotones">${botones.map((b, i) => `<button type="button" class="btn ${i ? '' : 'on'}" data-b="${i}">${esc(b)}</button>`).join('')}</div>`;
    const c = h.querySelector('.cuerpo'); if (typeof cuerpo === 'string') c.innerHTML = cuerpo; else c.append(cuerpo);
    m.append(h); document.body.append(m);
    let t = null;
    const fin = v => { if (!m.isConnected) return; clearTimeout(t); m.remove(); document.removeEventListener('keydown', tecla); if (pendiente === fin) pendiente = null; res(v); };
    const tecla = e => { if (e.key === 'Escape' && cancelable) fin(null); };
    h.querySelector('.htbotones').addEventListener('click', e => { const b = e.target.closest('[data-b]'); if (b) fin(botones[+b.dataset.b]); });
    if (cancelable) m.addEventListener('click', e => { if (e.target === m) fin(null); });
    document.addEventListener('keydown', tecla); pendiente = fin;
    if (auto) t = setTimeout(() => fin(botones[0]), auto);
    setTimeout(() => { const b = h.querySelector('.htbotones .btn.on'); if (b) b.focus(); }, 30);
  });
}
const estrellas = n => '★'.repeat(n) + '☆'.repeat(MAX_NIVEL - n);
function fichaDestino(s) {
  const filas = s.tipo === 'destino'
    ? [['Noche sin hotel', s.alquiler + 'M'], ['Con la zona completa', s.alquiler * 2 + 'M'], ...[1, 2, 3, 4, 5].map(k => [`${estrellas(k)}`, Math.round(s.alquiler * GRUPOS[s.g].mult[k - 1]) + 'M']), ['Cada piso cuesta', GRUPOS[s.g].piso + 'M']]
    : s.tipo === 'aero' ? AERO.alquiler.map((v, k) => [`${k + 1} aeropuerto${k ? 's' : ''}`, v + 'M'])
      : [['1 servicio', `${SERV.veces[0]} × dados`], ['2 servicios', `${SERV.veces[1]} × dados`]];
  filas.push(['Hipoteca', s.precio / 2 + 'M']);
  if (s.dueno !== null && G) filas.push(['Dueño', esc(G.jug[s.dueno].nombre) + (s.hip ? ' · hipotecado' : '') + (s.nivel ? ` · ${estrellas(s.nivel)}` : '')]);
  return `<div class="htcarta"><div class="htcab" style="--g:${s.g ? GRUPOS[s.g].color : s.tipo === 'aero' ? '#7A8199' : '#5A6BA8'}"><small>${s.g ? GRUPOS[s.g].zona : s.tipo === 'aero' ? 'Aeropuerto' : 'Servicio'}</small>${esc(s.nombre)}<small>Precio ${s.precio}M</small></div>
    <table class="tabla">${filas.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table></div>`;
}

/* ---------- ganchos que usa el motor ---------- */
// Cada partida recibe los suyos: si la sesión cambia (salir del juego, partida nueva), el turno a medias se cancela.
function crearGanchos(sid) {
const vigila = v => { if (!vivo || sid !== sesion || v === ABORTO) throw ABORTO; return v; };
return {
  render: () => { if (vivo && sid === sesion) pintar(); },
  log: (m, c) => { if (vivo && sid === sesion) log(m, c); },
  paso: async p => {
    vigila(); const i = G.idx(p);
    if (vista) await vista.mover(i, p.pos, vel().paso);
    if (vel().paso) api.sonido('click');
    vigila();
  },
  dados: async (a, b) => {
    vigila(); api.sonido('dado');
    if (vista) await vista.dados(a, b, vel().dado);
    await pausa(vel().paso ? 200 : 0); vigila();
  },
  flash: (p, v) => {
    if (!vivo || sid !== sesion || !v) return; const c = root.querySelector(`.htj[data-j="${G.idx(p)}"]`); if (!c) return;
    const f = document.createElement('span'); f.className = 'htflash ' + (v < 0 ? 'neg' : 'pos'); f.textContent = (v > 0 ? '+' : '') + v + 'M'; c.append(f); setTimeout(() => f.remove(), 1300);
    if (v > 0) api.sonido('ok');
  },
  pregunta: async (t, x, b) => vigila(await dialogo(esc(t), `<p>${x}</p>`, b)),
  carta: async (mazo, t, auto) => { vigila(); api.sonido('ok'); return vigila(await dialogo(mazo === 'suerte' ? '🍀 Suerte viajera' : '🧳 Imprevisto', `<p class="htcartatxt ht${mazo}">${esc(t)}</p>`, ['Entendido'], { auto: auto ? (vel().bot ? 1800 : 5) : 0 })); },
  comprar: async (s, p) => vigila(await dialogo(`${esc(p.nombre)}: ¿comprar ${esc(s.nombre)}?`, fichaDestino(s) + `<p class="note">Tienes ${p.dinero}M.</p>`, [`Comprar por ${s.precio}M`, 'No comprar'])) === `Comprar por ${s.precio}M`,
  puja: async (s, q, actual) => {
    const cont = document.createElement('div'), min = actual + 10;
    cont.innerHTML = fichaDestino(s) + `<p>${esc(q.nombre)}: la puja va por <b>${actual}M</b>. Tienes ${q.dinero}M.</p><input class="pedir" type="number" inputmode="numeric" min="${min}" max="${q.dinero}" step="10" value="${Math.min(q.dinero, min)}" aria-label="Tu puja en millones">`;
    const r = vigila(await dialogo(`🔨 Subasta: ${esc(s.nombre)}`, cont, ['Pujar', 'Retirarse']));
    const v = Math.floor(+cont.querySelector('input').value || 0);
    return r === 'Pujar' && v > actual && v <= q.dinero ? v : 0;
  },
  aceptar: async (a, b, o) => vigila(await dialogo(`🤝 ${esc(b.nombre)}: ¿aceptas el trato?`, `<p><b>${esc(a.nombre)}</b> te da: <b>${listaTrato(o.da, o.daM)}</b></p><p>A cambio pide: <b>${listaTrato(o.pide, o.pideM)}</b></p>`, ['Aceptar', 'Rechazar'])) === 'Aceptar',
  gestionar: async (g, p) => gestionar(p, sid),
  fin: async (p, motivo) => {
    vigila(); pintar(); registrarFin(p);
    api.sonido(p.bot && G.jug.some(q => !q.bot) && G.jug.filter(q => !q.bot).length === 1 ? 'perder' : 'ganar');
    await dialogo(`🏆 ¡${esc(p.nombre)} gana la partida!`, `<p>${esc(motivo)}.</p><p>Patrimonio final: <b>${G.patrimonio(p)}M</b>.</p>`, ['Ver el tablero']);
  },
};
}
const vigilaSesion = sid => { if (!vivo || sid !== sesion) throw ABORTO; };
const listaTrato = (ids, m) => [...ids.map(i => esc(G.c[i].nombre)), m ? m + 'M' : ''].filter(Boolean).join(', ') || 'nada';
function registrarFin(gan) {
  if (reg) return; reg = true;
  const humanos = G.jug.filter(q => !q.bot);
  const res = humanos.length === 1 ? (humanos[0] === gan ? 'victoria' : 'derrota') : 'partida';
  api.registrar({ res, variante: `${G.jug.length} jugadores · CPU ${NIVELES_CPU[G.reglas.cpu].toLowerCase()}${G.reglas.rondas ? ` · ${G.reglas.rondas} rondas` : ''}` });
  if (res === 'victoria') api.vibrar([60, 40, 60]);
}

/* ---------- bucle de turnos ---------- */
// La persona pulsa «Tirar»; las CPU juegan solas hasta que vuelva a tocar a una persona.
async function jugar() {
  if (jugando || !G || G.terminada || !vista) return;
  const sid = sesion; jugando = true; pintar();
  try {
    do {
      await G.jugarTurno(); vigilaSesion(sid); guardar(); pintar();
      if (G.terminada) break;
      if (G.p().bot) await pausa(vel().bot);
      vigilaSesion(sid);
    } while (G.p().bot);
  } catch (e) { if (e !== ABORTO) { console.error(e); api.aviso('Algo ha fallado en este turno'); } if (sid === sesion) jugando = false; return; }
  if (sid === sesion) jugando = false;
  if (vivo) { pintar(); if (G && G.terminada) guardar(); }
}

/* ---------- gestionar hoteles ---------- */
async function gestionar(p, sid = sesion) {
  const i = G.idx(p), cont = document.createElement('div');
  const dibujar = () => {
    const mias = G.propias(i);
    cont.innerHTML = `<p class="note">Dinero: <b>${p.dinero}M</b></p>` + (mias.length ? mias.map(s => `<div class="htges"><i style="background:${s.g ? GRUPOS[s.g].color : 'var(--mut)'}"></i><span>${esc(s.nombre)}<br><small>${s.tipo === 'destino' ? (s.nivel ? estrellas(s.nivel) : 'Solar') : s.tipo === 'aero' ? 'Aeropuerto' : 'Servicio'}${s.hip ? ' · hipotecado' : ''}</small></span>
      ${s.tipo === 'destino' ? `<button class="btn" data-g="mas" data-s="${s.id}" ${G.puedeConstruir(s) ? '' : 'disabled'} aria-label="Añadir un piso en ${esc(s.nombre)} (${GRUPOS[s.g].piso}M)">＋ ${GRUPOS[s.g].piso}M</button><button class="btn" data-g="menos" data-s="${s.id}" ${G.puedeVender(s) ? '' : 'disabled'} aria-label="Quitar un piso en ${esc(s.nombre)}">－</button>` : ''}
      ${s.hip ? `<button class="btn" data-g="desh" data-s="${s.id}" ${G.puedeDeshipotecar(s) ? '' : 'disabled'}>Pagar ${G.costeDeshipotecar(s)}M</button>` : `<button class="btn" data-g="hip" data-s="${s.id}" ${G.puedeHipotecar(s) ? '' : 'disabled'}>Hipotecar +${s.precio / 2}M</button>`}</div>`).join('')
      : '<p>Todavía no tienes ningún destino.</p>') + '<p class="note">Para añadir pisos necesitas la zona completa y sin hipotecas, y hay que construir de forma pareja. Cada piso es una estrella más (hasta 5).</p>';
  };
  cont.addEventListener('click', e => {
    const b = e.target.closest('[data-g]'); if (!b) return; const s = G.c[+b.dataset.s];
    ({ mas: () => G.construir(s), menos: () => G.vender(s), hip: () => G.hipotecar(s), desh: () => G.deshipotecar(s) })[b.dataset.g]();
    api.sonido(b.dataset.g === 'mas' ? 'caja' : 'click'); dibujar(); pintar();
  });
  dibujar(); const r = await dialogo(`🏨 Destinos de ${esc(p.nombre)}`, cont, ['Cerrar'], { cancelable: true }); if (r === ABORTO) vigilaSesion(-1); vigilaSesion(sid);
}
async function gestionarDesdeBoton() {
  if (!G || !vista || jugando || G.terminada || G.p().bot) return;
  const sid = sesion; jugando = true;
  try { await gestionar(G.p(), sid); } catch (e) { if (e !== ABORTO) throw e; return; } finally { if (sid === sesion) jugando = false; }
  guardar(); pintar();
}

/* ---------- intercambios ---------- */
async function intercambioDesdeBoton() {
  if (!G || !vista || jugando || G.terminada || G.p().bot) return;
  const a = G.p(), otros = G.jug.filter(q => q !== a && !q.fuera); if (!otros.length) return;
  const sid = sesion; jugando = true;
  try {
    const cont = document.createElement('div'); let b = otros[0];
    const libres = j => G.propias(G.idx(j)).filter(s => !G.grupo(s).some(x => x.nivel));
    const dibujar = () => {
      cont.innerHTML = `<div class="bar"><span class="lbl">Con</span><div class="seg">${otros.map(q => `<button type="button" class="btn ${q === b ? 'on' : ''}" data-con="${G.idx(q)}">${esc(q.ficha)} ${esc(q.nombre)}</button>`).join('')}</div></div>
        <div class="httrato">${[[a, 'Tú das', 'da'], [b, `Pides a ${esc(b.nombre)}`, 'pide']].map(([j, t, k]) => `<div><b>${t}</b>${libres(j).map(s => `<label class="htop"><input type="checkbox" data-${k}="${s.id}"><i style="background:${s.g ? GRUPOS[s.g].color : 'var(--mut)'}"></i>${esc(s.nombre)}</label>`).join('') || '<small class="note">Nada que ceder</small>'}
          <label class="htdinero">Dinero <input class="pedir" type="number" inputmode="numeric" min="0" max="${j.dinero}" step="10" value="0" data-m="${k}"></label><small class="note">Tiene ${j.dinero}M</small></div>`).join('')}</div>`;
    };
    cont.addEventListener('click', e => { const x = e.target.closest('[data-con]'); if (x) { b = G.jug[+x.dataset.con]; dibujar(); } });
    dibujar();
    const r = await dialogo('🤝 Proponer un trato', cont, ['Proponer', 'Cancelar'], { cancelable: true }); if (r === ABORTO) return; vigilaSesion(sid);
    if (r !== 'Proponer') return;
    const ids = k => [...cont.querySelectorAll(`[data-${k}]:checked`)].map(x => +x.dataset[k]);
    const din = k => Math.max(0, Math.floor(+cont.querySelector(`[data-m="${k}"]`).value || 0));
    await G.proponer(a, b, { da: ids('da'), daM: din('da'), pide: ids('pide'), pideM: din('pide') });
  } catch (e) { if (e !== ABORTO) throw e; return; } finally { if (sid === sesion) jugando = false; }
  guardar(); pintar();
}

/* ---------- entrada ---------- */
function alEscribir(e) { const i = e.target.dataset.name; if (i != null) { cfg.jug[+i][0] = e.target.value; api.setPref('cfg', cfg); } }
function alTocarCasilla(i) {
  const s = G.c[i]; if (jugando && pendiente) return;
  if (s.precio) dialogo(esc(s.nombre), fichaDestino(s), ['Cerrar'], { cancelable: true }).catch(() => {}); else api.aviso(textoCasilla(s));
}
function clic(e) {
  const b = e.target.closest('button,[data-op]'); if (!b) return; const d = b.dataset;
  if (d.cam && vista) return vista.camara(d.cam);
  if (d.tipo) { const [i, t] = d.tipo.split(','); cfg.jug[+i][1] = t; api.setPref('cfg', cfg); return setup(); }
  if (d.ficha) { const i = +d.ficha, usadas = cfg.jug.map(j => j[2]); let f = cfg.jug[i][2]; do f = (f + 1) % FICHAS.length; while (usadas.includes(f) && f !== cfg.jug[i][2]); cfg.jug[i][2] = f; api.setPref('cfg', cfg); return setup(); }
  if (d.dinero) { cfg.dinero = +d.dinero; api.setPref('cfg', cfg); return setup(); }
  if (d.rondas) { cfg.rondas = +d.rondas; api.setPref('cfg', cfg); return setup(); }
  if (d.cpu) { cfg.cpu = +d.cpu; api.setPref('cfg', cfg); return setup(); }
  if (d.vel) { cfg.vel = d.vel; api.setPref('cfg', cfg); return G ? pintar() : setup(); }
  if (d.op) { cfg[d.op] = b.checked; api.setPref('cfg', cfg); return; }
  const a = d.ac;
  if (a === 'start') empezar(); else if (a === 'tirar') jugar(); else if (a === 'gestionar') gestionarDesdeBoton(); else if (a === 'trato') intercambioDesdeBoton();
  else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas(); else if (a === 'nueva') nuevaSetup(); else if (a === 'reintentar') { if (G) armar().then(() => { pintar(); }); }
}
function textoCasilla(s) {
  if (s.tipo === 'impuesto') return `${s.nombre}: pagas ${s.importe}M.`;
  if (s.tipo === 'suerte') return 'Suerte viajera: roba una carta.';
  if (s.tipo === 'imprevisto') return 'Imprevisto: roba una carta.';
  return { 0: `Salida: cobras ${SALARIO}M cada vez que pasas.`, 10: 'Cuarentena: de visita no pasa nada. Aquí esperan quienes tienen que guardar cuarentena.', 20: 'Vacaciones: si el bote está activado, te lo llevas entero.', 30: 'Control sanitario: te mandan directo a la Cuarentena.' }[s.id] || s.nombre;
}
function reglas() {
  api.modal('Hotel', `<ul>
    <li>Tira los dos dados y avanza. Si caes en un destino, aeropuerto o servicio libre, puedes comprarlo; si no lo compras, se subasta (si las subastas están activadas).</li>
    <li>Si caes en un destino de otro jugador, le pagas la noche. Con toda la <b>zona</b> (mismo color) el precio básico se duplica y puedes construir <b>pisos</b>: cada piso es una <b>estrella</b> más, hasta 5, y el alquiler sube mucho. Hay que construir de forma pareja en toda la zona.</li>
    <li>Los <b>aeropuertos</b> ✈️ cobran según cuántos tenga su dueño (${AERO.alquiler.join(', ')}M) y los <b>servicios</b> 🚢🚄, ${SERV.veces[0]} veces lo que saques en los dados (${SERV.veces[1]} veces si tiene los dos).</li>
    <li>Al pasar por la <b>Salida</b> cobras ${SALARIO}M. En 🍀 Suerte viajera y 🧳 Imprevisto robas una carta.</li>
    <li>El <b>Control sanitario</b> te manda a la Cuarentena: sal pagando ${FIANZA}M, con un 🎫 pase VIP o sacando dobles (tres intentos). Tres dobles seguidos también te mandan allí.</li>
    <li>Con dobles vuelves a tirar. Puedes <b>hipotecar</b> destinos sin pisos (cobras la mitad de su precio; recuperarlos cuesta un 10 % más) y vender pisos a mitad de precio.</li>
    <li>🤝 <b>Tratos</b>: en tu turno puedes proponer cambiar destinos y dinero con otro jugador.</li>
    <li>La CPU tiene tres niveles: <b>fácil</b> (compra con cautela y negocia poco), <b>normal</b> y <b>difícil</b> (arriesga más, construye antes y pide tratos).</li>
    <li>Si no puedes pagar, quiebras. Gana el último que siga en pie (o quien tenga más patrimonio si elegiste un límite de rondas).</li>
    <li>En el tablero 3D: arrastra para girar, pellizca (o rueda) para acercar y toca una casilla para ver su ficha. Con la tecla Espacio también se tiran los dados.</li></ul>
    <p class="note">Los destinos son lugares reales usados solo como nombre.</p>`);
}
