// Magnate Urbano · juego de compraventa de empresas tecnológicas (2 a 4 jugadores, personas o CPU).
import { $, esc, esperar } from '../../core/dom.js';
import { gruposFichas, estilo } from '../../core/fichas.js';
import { grupoTablero, grupoFondo } from '../../core/aspectos.js';
import { FICHAS as PERSONAJES, opcionesPersonajes } from '../../core/personajes.js';
import { GRUPOS, CASILLAS, NUBE, RED, SALARIO, FIANZA, OFICINAS, SEDES, COLORES_JUGADOR, FICHAS } from './datos.js';
import { crearDado3D, grupoDado } from '../../core/dado3d.js';
import { Partida, REGLAS, validar as validarPartida } from './motor.js';

const ABORTO = Symbol('aborto');                 // al salir del juego a mitad de turno
const ICONO = { nube: '☁️', noticias: '📰', tendencias: '📈', impuesto: '💸' };
// Iconos de las oficinas (hasta 4 por casilla) y de la sede central, a elegir en 🎨 Apariencia. Los personajes y cajas son los de Encajados.
const EDIFICIOS = {
  casas: { nombre: '🏠 + 🏨 Casas y hotel', of: '🏠', sede: '🏨' }, oficinas: { nombre: '🏢 + 🏙️ Oficinas y rascacielos', of: '🏢', sede: '🏙️' },
  obreros: { nombre: '👷 + 🏗️ Obreros y grúa', of: '👷', sede: '🏗️' }, tecnicos: { nombre: '👨‍🔧 + 🏭 Técnicos y fábrica', of: '👨‍🔧', sede: '🏭' },
  astronautas: { nombre: '👨‍🚀 + 🚀 Astronautas y cohete', of: '👨‍🚀', sede: '🚀' }, cajas: { nombre: '📦 + 🏬 Cajas y almacén', of: '📦', sede: '🏬' },
};
const VELOCIDAD = { normal: { nombre: 'Normal', paso: 150, bot: 550, dado: 900 }, rapida: { nombre: 'Rápida', paso: 45, bot: 200, dado: 450 }, sin: { nombre: 'Sin animaciones', paso: 0, bot: 0, dado: 0 } };
// Vista 3D opcional (Three.js): tablero en anillo compartido con Hotel (js/core/anillo3d.js). Los edificios son las oficinas (pisos) y la sede (5.º piso con corona).
let vista = null, mod3d = null, botones3d = null, hay3d = false, tok3 = 0, forzar2d = false, modo3d = false;
const TIPO3 = { empresa: 'destino', nube: 'aero', red: 'serv', noticias: 'suerte', tendencias: 'imprevisto' };
// 🧑 Fichas: color de cada jugador (por su color de partida), tamaño y textura (js/core/fichas.js)
const cj = c => { const e = estilo(asp.valores), k = COLORES_JUGADOR.indexOf(c); return [e.hex, e.hex2, e.hex3, e.hex4][k] || c; };
const estado3D = () => ({ jug: G.jug.map(p => ({ ...p, color: cj(p.color) })), c: G.c.map(s => ({ ...s, tipo: TIPO3[s.tipo] || s.tipo, nivel: s.of, ico: s.ico || (s.tipo === 'nube' ? '☁️' : undefined) })) });
const quiere3D = () => hay3d && !forzar2d && asp && (asp.valores.vista || '2d') === '3d';
function cerrar3D() { tok3++; if (vista) { vista.destruir(); vista = null; } }
let G = null, api = null, asp = null, root = null, vivo = false, jugando = false, reg = false, pendiente = null, onKey = null, sesion = 0;
// sesion: cambia al salir del juego o empezar otra partida; los turnos que estuvieran a medias se cancelan (ABORTO)
let cfg = { jug: [['Tú', 'h', 0], ['CPU 1', 'c', 1], ['CPU 2', 'c', 2], ['CPU 3', 'n', 3]], bote: true, subasta: true, dinero: 1600, rondas: 0, vel: 'normal' };

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
  api = a; root = r; vivo = true; jugando = false; pendiente = null; vista = null; forzar2d = false; hay3d = false;
  try { const b = await import('../../core/escena3d.js'); if (b.hayWebGL()) { mod3d = await import('../../core/anillo3d.js'); botones3d = b.botonesCamara; hay3d = true; } } catch (e) { console.error(e); }
  if (!vivo) return;
  asp = api.aspecto([...grupoDado(), { clave: 'vista', titulo: 'Vista del tablero', icono: '🧊', def: '2d', opciones: [{ id: '3d', nombre: '🧊 3D' }, { id: '2d', nombre: '🔲 2D clásica' }] }, grupoFondo('#mtTab'), grupoTablero(),
    { clave: 'ficha', titulo: 'Tu personaje (jugador 1)', icono: '🧑', def: 'auto', opciones: [{ id: 'auto', nombre: 'El de la configuración', sec: 'Por defecto' }, ...opcionesPersonajes()] },
    { clave: 'edif', titulo: 'Iconos de oficinas y sede (vista 2D)', icono: '🏠', def: 'casas', opciones: Object.entries(EDIFICIOS).map(([id, e]) => ({ id, nombre: e.nombre })) },
    { clave: 'estilo', titulo: 'Estilo de los edificios (vista 3D)', icono: '🏢', def: 'rascacielos', opciones: Object.entries(mod3d ? mod3d.ESTILOS : { rascacielos: { nombre: '🌃 Rascacielos' } }).map(([id, e]) => ({ id, nombre: e.nombre })) },
    ...gruposFichas({ pocos: true, titulo: 'Fichas', tituloEstilos: 'Estilos de Fichas', icono: '🎩', lados: ['Jugador 1', 'Jugador 2', 'Jugador 3', 'Jugador 4'], formas: false })],
  () => {
    if (D3) D3.estilo(asp.valores);
    if (G && root.querySelector('#mtJug')) {
      if (modo3d !== quiere3D()) { armar(); pintar(); return; }
      aplicarPersonaje(); if (vista) { vista.estiloHotel(asp.valores.estilo || 'rascacielos'); vista.tema(); } pintar();
    }
  });
  await api.css(new URL('../../../css/fichas.css', import.meta.url));
  await api.css(new URL('./magnate.css', import.meta.url));
  const c0 = api.pref('cfg', null);
  if (c0 && Array.isArray(c0.jug) && c0.jug.length === 4) cfg = { ...cfg, ...c0, vel: VELOCIDAD[c0.vel] ? c0.vel : 'normal', jug: c0.jug.map(([n, t, f], i) => [String(n).slice(0, 14), ['h', 'c', 'n'].includes(t) ? t : 'n', Number.isInteger(f) && FICHAS[f] ? f : i]) };
  const g = api.cargar(); reg = g ? g.reg : false;
  sesion++; G = g ? Partida.desde(g.g, crearGanchos(sesion)) : null;
  root.addEventListener('click', clic); root.addEventListener('input', alEscribir);
  onKey = e => { if (e.code === 'Space' && !pendiente && G && !/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) { e.preventDefault(); jugar(); } };
  document.addEventListener('keydown', onKey);
  api.barra({ nueva: () => { if (G && !G.terminada && !api.confirmar('¿Abandonar la partida actual?')) return; sesion++; if (pendiente) { pendiente(ABORTO); pendiente = null; } enPausa = false; empezar(); },
    salir: () => { enPausa = false; sesion++; if (pendiente) { pendiente(ABORTO); pendiente = null; } api.borrar(); location.hash = '#/cat/tablero'; },
    pausar: () => { enPausa = true; },
    reanudar: () => { enPausa = false; },
    config: { valores: () => ({ j0: cfg.jug[0][1], j1: cfg.jug[1][1], j2: cfg.jug[2][1], j3: cfg.jug[3][1], dinero: cfg.dinero, rondas: cfg.rondas, vel: cfg.vel, bote: cfg.bote, subasta: cfg.subasta }), grupos: v => [...[0, 1, 2, 3].map(i => ({ clave: 'j' + i, titulo: `Jugador ${i + 1} · ${cfg.jug[i][0]}`, opciones: [['h', 'Persona'], ['c', 'CPU'], ['n', 'Nadie']] })), { clave: 'dinero', titulo: 'Dinero', opciones: [1200, 1600, 2000].map(x => [x, x + 'M']) }, { clave: 'rondas', titulo: 'Duración', opciones: [[0, 'Hasta la quiebra'], [20, '20 rondas'], [40, '40 rondas']] }, { clave: 'vel', titulo: 'Velocidad', opciones: Object.entries(VELOCIDAD).map(([k, x]) => [k, x.nombre]) }, { clave: 'bote', titulo: 'Bote del Paraíso Fiscal', opciones: [[true, 'Sí'], [false, 'No']] }, { clave: 'subasta', titulo: 'Subastas', opciones: [[true, 'Sí'], [false, 'No']] }], aplicar: v => { enPausa = false; if ([0, 1, 2, 3].filter(i => v['j' + i] !== 'n').length < 2) { api.aviso('Hacen falta al menos 2 jugadores'); return; } [0, 1, 2, 3].forEach(i => { cfg.jug[i][1] = v['j' + i]; }); cfg.dinero = v.dinero; cfg.rondas = v.rondas; cfg.vel = v.vel; cfg.bote = v.bote; cfg.subasta = v.subasta; empezar(); } } });
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '🏢 Mis empresas', accion: () => gestionarDesdeBoton() }, { texto: '🤝 Intercambiar', accion: () => intercambioDesdeBoton() },
    { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  if (G && !G.terminada) { armar(); pintar(); log(`Partida recuperada: ronda ${G.ronda}.`); if (G.p().bot) jugar(); }
  else setup();
}
export function unmount() {
  vivo = false; enPausa = false; jugando = false; sesion++;
  if (pendiente) { pendiente(ABORTO); pendiente = null; }
  document.removeEventListener('keydown', onKey);
  if (root) { root.removeEventListener('click', clic); root.removeEventListener('input', alEscribir); }
  quitarDado(); cerrar3D(); G = null; asp = null;
}
function guardar() { if (!G) return; const d = { g: G.toJSON(), reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }
const vel = () => VELOCIDAD[cfg.vel] || VELOCIDAD.normal;
let enPausa = false;
const pausa = async ms => { if (ms) await esperar(ms); while (enPausa && vivo) await esperar(120); };   // «Pausa / Salir» congela los turnos de la CPU y las animaciones


/* ---------- pantalla de inicio ---------- */
function setup() {
  G = null; jugando = false; quitarDado(); cerrar3D();
  const n = cfg.jug.filter(j => j[1] !== 'n').length;
  root.innerHTML = `<p class="note">Compra empresas tecnológicas, completa sectores, abre oficinas y cobra alquiler a tus rivales. Gana quien siga en pie cuando los demás quiebren${cfg.rondas ? ` o quien tenga más patrimonio tras ${cfg.rondas} rondas` : ''}.</p>
    ${cfg.jug.map(([nom, t, f], i) => `<div class="jugfila" style="--c:${cj(COLORES_JUGADOR[i])}"><button class="mtfichab" data-ficha="${i}" aria-label="Cambiar ficha del jugador ${i + 1}">${FICHAS[f]}</button><input class="nom" data-name="${i}" maxlength="14" value="${esc(nom)}" aria-label="Nombre del jugador ${i + 1}"><div class="seg">${[['h', 'Persona'], ['c', 'CPU'], ['n', 'Nadie']].map(([k, l]) => `<button class="btn ${t === k ? 'on' : ''}" data-tipo="${i},${k}">${l}</button>`).join('')}</div></div>`).join('')}
    <div class="bar"><span class="lbl">Dinero</span><div class="seg">${[1200, 1600, 2000].map(v => `<button class="btn ${cfg.dinero === v ? 'on' : ''}" data-dinero="${v}">${v}M</button>`).join('')}</div></div>
    <div class="bar"><span class="lbl">Duración</span><div class="seg">${[[0, 'Hasta la quiebra'], [20, '20 rondas'], [40, '40 rondas']].map(([v, l]) => `<button class="btn ${cfg.rondas === v ? 'on' : ''}" data-rondas="${v}">${l}</button>`).join('')}</div></div>
    <div class="bar"><span class="lbl">Velocidad</span><div class="seg">${Object.entries(VELOCIDAD).map(([k, v]) => `<button class="btn ${cfg.vel === k ? 'on' : ''}" data-vel="${k}">${v.nombre}</button>`).join('')}</div></div>
    <label class="chk"><input type="checkbox" data-op="bote" ${cfg.bote ? 'checked' : ''}><span><b>Bote del Paraíso Fiscal</b>: los impuestos, multas y fianzas se acumulan y se los lleva quien caiga en el Paraíso Fiscal.</span></label>
    <label class="chk"><input type="checkbox" data-op="subasta" ${cfg.subasta ? 'checked' : ''}><span><b>Subastas</b>: si quien cae en una empresa libre no la compra, se subasta entre todos.</span></label>
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
  G.jug[i].ficha = e; const t = root.querySelector(`.mtficha[data-j="${i}"]`); if (t) t.textContent = e; guardar();
}
function empezar() {
  const jugadores = cfg.jug.map(([nombre, t, f], i) => ({ nombre: nombre.trim() || `Jugador ${i + 1}`, ficha: FICHAS[f], color: COLORES_JUGADOR[i], bot: t === 'c', t })).filter(j => j.t !== 'n');
  if (jugadores.length < 2) return;
  const mio = personajeElegido(), h = jugadores.find(j => !j.bot);
  if (mio && h) { h.ficha = mio; jugadores.forEach(j => { if (j !== h && j.ficha === mio) j.ficha = FICHAS.find(f => !jugadores.some(q => q.ficha === f)) || j.ficha; }); }
  api.setPref('cfg', cfg);
  sesion++; G = new Partida(jugadores, crearGanchos(sesion), { bote: cfg.bote, subasta: cfg.subasta, dinero: cfg.dinero, rondas: cfg.rondas }); reg = false;
  armar(); pintar(); log(`¡Empieza la partida! Cada jugador recibe ${cfg.dinero}M.`); guardar();
  if (G.p().bot) jugar();
}

/* ---------- tablero ---------- */
// Posición en la rejilla 11×11 (la casilla 0 abajo a la derecha, en sentido horario)
const celda = i => (i <= 10 ? [11, 11 - i] : i < 20 ? [21 - i, 1] : i <= 30 ? [1, i - 19] : [i - 29, 11]);
const lado = i => (i % 10 === 0 ? 'esq' : i < 10 ? 'ab' : i < 20 ? 'iz' : i < 30 ? 'ar' : 'de');
function armar() {
  quitarDado(); cerrar3D(); modo3d = quiere3D();
  const centro = `<b class="mttit">Magnate<br>Urbano</b>
        <div class="mtturno" id="mtTurno"></div>
        <div class="mtacc"><button class="btn" data-ac="gestionar" id="mtGes">🏢 Empresas</button><button class="btn" data-ac="trato" id="mtTrato">🤝 Trato</button></div>
        <small class="mtbote" id="mtBote"></small>`;
  const pie = `<div class="dadozona" id="mtDado"></div>
    <div class="msg mtmsg" id="mtMsg" role="status" aria-live="polite"></div>
    <ul class="mtlog" id="mtLog" aria-label="Historial de la partida"></ul>`;
  if (modo3d) {
    root.innerHTML = `<div class="mtjug" id="mtJug"></div>
      <div class="e3d" id="mtTab"><div class="e3d-carga" id="mtCarga">Preparando el tablero…</div></div>
      <div class="mtpanel">${centro.replace('<b class="mttit">Magnate<br>Urbano</b>', '')}</div>
      ${pie}${api.barraHtml()}`;
    iniciar3D(++tok3); iniciarDado();
    return;
  }
  root.innerHTML = `<div class="mtjug" id="mtJug"></div>
    <div class="mttab" id="mtTab">
      ${G.c.map((s, i) => { const [f, c] = celda(i); return `<button type="button" class="mtc ${lado(i)} ${s.tipo}" data-c="${i}" style="grid-row:${f};grid-column:${c}" aria-label="${esc(s.nombre)}">
        ${s.g ? `<span class="mtbanda" style="--g:${GRUPOS[s.g].color}"></span>` : ''}<span class="mtnom ${s.nombre.length > 8 && s.tipo === 'empresa' ? 'largo' : ''}">${s.tipo === 'esquina' ? `<i>${s.ico}</i>${esc(s.corto)}` : `${s.ico || ICONO[s.tipo] ? `<i>${s.ico || ICONO[s.tipo]}</i>` : ''}${esc(s.nombre)}`}</span><span class="mttk"></span></button>`; }).join('')}
      <div class="mtcentro">
        ${centro}
      </div>
    </div>
    ${pie}${api.barraHtml()}`;
  G.jug.forEach((p, i) => { if (!p.fuera) colocar(i); });
  iniciarDado();
}
let D3 = null, tokD = 0;
function quitarDado() { tokD++; if (D3) { D3.destruir(); D3 = null; } }
async function iniciarDado() {
  const t = ++tokD, host = $('#mtDado'); if (!host || !G) return;
  const d = await crearDado3D(host, { n: 2, etiqueta: 'Dados: toca para tirar', alClic: () => { if (G && !G.p().bot) jugar(); } });
  if (t !== tokD || !d) { if (d) d.destruir(); return; }
  D3 = d; D3.estilo(asp.valores); if (G) pintar();
}
async function iniciar3D(t) {
  const host = $('#mtTab');
  try {
    const v = await mod3d.crearVista(host, { estilo: asp.valores.estilo || 'rascacielos', grupos: GRUPOS, titulo: 'MAGNATE', subtitulo: 'URBANO', iconos: { suerte: '📰', imprevisto: '📈' } });
    if (!vivo || t !== tok3 || !G) { v.destruir(); return; }
    v.alTocar = i => { if (!G) return; const s = G.c[i]; if (s.precio && !jugando) dialogo(esc(s.nombre), fichaEmpresa(s), ['Cerrar'], { cancelable: true }).catch(() => {}); else if (!s.precio) api.aviso(textoCasilla(s)); };
    vista = v; v.construir(estado3D()); botones3d(host, v); const c = $('#mtCarga'); if (c) c.remove(); pintar();
  } catch (e) { console.error(e); if (t === tok3 && vivo && G) { forzar2d = true; armar(); pintar(); } }
}
function colocar(i) {
  if (modo3d) return;
  const p = G.jug[i], cel = root.querySelector(`.mtc[data-c="${p.pos}"] .mttk`); if (!cel) return;
  let t = root.querySelector(`.mtficha[data-j="${i}"]`);
  if (!t) { t = document.createElement('span'); t.className = 'mtficha fx'; t.dataset.j = i; t.textContent = p.ficha; }
  t.style.setProperty('--c', cj(p.color));
  cel.append(t); t.classList.remove('salta'); void t.offsetWidth; t.classList.add('salta');
}
function pintar() {
  if (!G || !$('#mtTab')) return;
  if (!modo3d) G.c.forEach((s, i) => {
    const d = root.querySelector(`.mtc[data-c="${i}"]`), o = s.dueno === null ? null : G.jug[s.dueno];
    d.style.setProperty('--dueno', o ? cj(o.color) : 'transparent'); d.classList.toggle('propia', !!o); d.classList.toggle('hip', s.hip);
    const b = d.querySelector('.mtbanda'), ed = EDIFICIOS[asp.valores.edif] || EDIFICIOS.casas;
    if (b) { d.classList.toggle('con', s.of > 0); b.innerHTML = s.of === 5 ? `<i class="mtsede">${ed.sede}</i>` : [1, 2, 3, 4].map(k => `<i class="${k <= s.of ? 'on' : ''}">${k <= s.of ? ed.of : ''}</i>`).join(''); }
    d.setAttribute('aria-label', `${s.nombre}${s.precio ? ` · ${s.precio}M` : ''}${o ? ` · de ${o.nombre}` : ''}${s.hip ? ' · hipotecada' : ''}${s.of ? ` · ${s.of === 5 ? 'sede central' : s.of + ' oficinas'}` : ''}`);
  });
  const act = G.terminada ? -1 : G.turno;
  $('#mtJug').innerHTML = G.jug.map((p, i) => {
    const mias = G.propias(i);
    return `<div class="mtj ${i === act ? 'turno' : ''} ${p.fuera ? 'fuera' : ''} ${i === G.ganador ? 'gana' : ''}" style="--c:${cj(p.color)}" data-j="${i}"><span class="mtji">${esc(p.ficha)}</span><b>${esc(p.nombre)}</b><span class="mtdin">${p.fuera ? 'Quiebra' : p.dinero + 'M'}</span>
      <small>${p.fuera ? '' : `Patrimonio ${G.patrimonio(p)}M${p.bot ? ' · CPU' : ''}${p.espera ? ' · 🕵️' : ''}${p.pases.length ? ' · 🎫' + (p.pases.length > 1 ? '×2' : '') : ''}`}</small>
      <span class="mtchips">${mias.map(s => `<i class="${s.hip ? 'h' : ''}" style="background:${s.g ? GRUPOS[s.g].color : 'var(--mut)'}" title="${esc(s.nombre)}"></i>`).join('')}</span></div>`;
  }).join('');
  const p = G.p(), humano = !p.bot && !p.fuera && !G.terminada, libre = humano && !jugando;
  $('#mtTurno').innerHTML = G.terminada ? `🏆 Gana <b>${esc(G.jug[G.ganador].nombre)}</b>` : `Turno de <b style="color:${cj(p.color)}">${esc(p.ficha)} ${esc(p.nombre)}</b>${p.espera ? '<br><small>retenido en la Auditoría</small>' : ''}`;
  $('#mtBote').textContent = `${G.reglas.bote ? `Bote: ${G.bote}M · ` : ''}Ronda ${G.ronda}${G.reglas.rondas ? ` de ${G.reglas.rondas}` : ''}`;
  if (D3) { D3.color(cj(p.color)); D3.activar(libre && !G.terminada, `Toca los dados para tirar · ${p.nombre}`); }
  $('#mtGes').disabled = !libre; $('#mtTrato').disabled = !libre || G.jug.filter(q => !q.fuera).length < 2;
  if (vista) { vista.fichas(estilo(asp.valores)); vista.actualizar(estado3D()); vista.resaltar(G.terminada ? -1 : p.pos, cj(p.color)); }
}
function log(html, clase = '') {
  const L = $('#mtLog'); if (!L) return;
  const li = document.createElement('li'); li.className = clase; li.innerHTML = html; L.prepend(li);
  while (L.children.length > 80) L.lastChild.remove();
  const m = $('#mtMsg'); if (m) { m.innerHTML = html; m.className = 'msg mtmsg ' + clase; }
}

/* ---------- diálogos (hoja inferior, como el resto de la app) ---------- */
function dialogo(titulo, cuerpo, botones, { cancelable = false, auto = 0 } = {}) {
  return new Promise(res => {
    const m = document.createElement('div'); m.className = 'modal mtmodal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    const h = document.createElement('div'); h.className = 'hoja';
    h.innerHTML = `<h2>${titulo}</h2><div class="cuerpo"></div><div class="bar mtbotones">${botones.map((b, i) => `<button type="button" class="btn ${i ? '' : 'on'}" data-b="${i}">${esc(b)}</button>`).join('')}</div>`;
    const c = h.querySelector('.cuerpo'); if (typeof cuerpo === 'string') c.innerHTML = cuerpo; else c.append(cuerpo);
    m.append(h); document.body.append(m);
    let t = null;
    const fin = v => { if (!m.isConnected) return; clearTimeout(t); m.remove(); document.removeEventListener('keydown', tecla); if (pendiente === fin) pendiente = null; res(v); };
    const tecla = e => { if (e.key === 'Escape' && cancelable) fin(null); };
    h.querySelector('.mtbotones').addEventListener('click', e => { const b = e.target.closest('[data-b]'); if (b) fin(botones[+b.dataset.b]); });
    if (cancelable) m.addEventListener('click', e => { if (e.target === m) fin(null); });
    document.addEventListener('keydown', tecla); pendiente = fin;
    if (auto) t = setTimeout(() => fin(botones[0]), auto);
    setTimeout(() => { const b = h.querySelector('.mtbotones .btn.on'); if (b) b.focus(); }, 30);
  });
}
function fichaEmpresa(s) {
  const filas = s.tipo === 'empresa'
    ? [['Alquiler', s.alquiler + 'M'], ['Con el sector completo', s.alquiler * 2 + 'M'], ...[1, 2, 3, 4, 5].map(k => [k < 5 ? `${k} oficina${k > 1 ? 's' : ''}` : '🏢 Sede central', Math.round(s.alquiler * GRUPOS[s.g].mult[k - 1]) + 'M']), ['Cada oficina cuesta', GRUPOS[s.g].oficina + 'M']]
    : s.tipo === 'nube' ? NUBE.alquiler.map((v, k) => [`${k + 1} nube${k ? 's' : ''}`, v + 'M'])
      : [['1 red', `${RED.veces[0]} × dados`], ['2 redes', `${RED.veces[1]} × dados`]];
  filas.push(['Hipoteca', s.precio / 2 + 'M']);
  if (s.dueno !== null && G) filas.push(['Dueño', esc(G.jug[s.dueno].nombre) + (s.hip ? ' · hipotecada' : '')]);
  return `<div class="mtcarta"><div class="mtcab" style="--g:${s.g ? GRUPOS[s.g].color : s.tipo === 'nube' ? '#7A8199' : '#5A6BA8'}"><small>${s.g ? GRUPOS[s.g].sector : s.tipo === 'nube' ? 'Nube' : 'Red'}</small>${esc(s.nombre)}<small>Precio ${s.precio}M</small></div>
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
    vigila();
    if (modo3d) { if (vista) await vista.mover(G.idx(p), p.pos, vel().paso); if (vel().paso) api.sonido('click'); }
    else { colocar(G.idx(p)); if (vel().paso) { api.sonido('click'); await pausa(vel().paso); } }
    vigila();
  },
  dados: async (a, b) => {
    vigila(); api.sonido('dado');
    if (D3) { D3.color(cj(G.p().color)); await D3.tirar([a, b], vel().dado); } else await pausa(vel().paso ? 400 : 0);
    await pausa(vel().paso ? 200 : 0); vigila();
  },
  flash: (p, v) => {
    if (!vivo || sid !== sesion || !v) return; const c = root.querySelector(`.mtj[data-j="${G.idx(p)}"]`); if (!c) return;
    const f = document.createElement('span'); f.className = 'mtflash ' + (v < 0 ? 'neg' : 'pos'); f.textContent = (v > 0 ? '+' : '') + v + 'M'; c.append(f); setTimeout(() => f.remove(), 1300);
    if (v > 0) api.sonido('ok');
  },
  pregunta: async (t, x, b) => vigila(await dialogo(esc(t), `<p>${x}</p>`, b)),
  carta: async (mazo, t, auto) => { vigila(); api.sonido('ok'); return vigila(await dialogo(mazo === 'noticias' ? '📰 Noticias Tech' : '📈 Tendencias Tech', `<p class="mtcartatxt mt${mazo}">${esc(t)}</p>`, ['Entendido'], { auto: auto ? (vel().bot ? 1700 : 600) : 0 })); },
  comprar: async (s, p) => vigila(await dialogo(`${esc(p.nombre)}: ¿comprar ${esc(s.nombre)}?`, fichaEmpresa(s) + `<p class="note">Tienes ${p.dinero}M.</p>`, [`Comprar por ${s.precio}M`, 'No comprar'])) === `Comprar por ${s.precio}M`,
  puja: async (s, q, actual) => {
    const cont = document.createElement('div'), min = actual + 10;
    cont.innerHTML = fichaEmpresa(s) + `<p>${esc(q.nombre)}: la puja va por <b>${actual}M</b>. Tienes ${q.dinero}M.</p><input class="pedir" type="number" inputmode="numeric" min="${min}" max="${q.dinero}" step="10" value="${Math.min(q.dinero, min)}" aria-label="Tu puja">`;
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
  api.registrar({ res, variante: `${G.jug.length} jugadores${G.reglas.rondas ? ` · ${G.reglas.rondas} rondas` : ''}` });
  if (res === 'victoria') api.vibrar([60, 40, 60]);
}

/* ---------- bucle de turnos ---------- */
// La persona pulsa «Tirar»; las CPU juegan solas hasta que vuelva a tocar a una persona.
async function jugar() {
  if (jugando || !G || G.terminada) return;
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

/* ---------- gestionar empresas ---------- */
async function gestionar(p, sid = sesion) {
  const i = G.idx(p), cont = document.createElement('div');
  const dibujar = () => {
    const mias = G.propias(i);
    cont.innerHTML = `<p class="note">Dinero: <b>${p.dinero}M</b> · el banco tiene ${G.oficinas} oficinas y ${G.sedes} sedes.</p>` + (mias.length ? mias.map(s => `<div class="mtges"><i style="background:${s.g ? GRUPOS[s.g].color : 'var(--mut)'}"></i><span>${esc(s.nombre)}${s.of ? ` <small>${s.of === 5 ? '🏢 sede' : '▪'.repeat(s.of)}</small>` : ''}${s.hip ? ' <small>· hipotecada</small>' : ''}</span>
      ${s.tipo === 'empresa' ? `<button class="btn" data-g="mas" data-s="${s.id}" ${G.puedeConstruir(s) ? '' : 'disabled'} aria-label="Abrir oficina en ${esc(s.nombre)} (${GRUPOS[s.g].oficina}M)">＋</button><button class="btn" data-g="menos" data-s="${s.id}" ${G.puedeVender(s) ? '' : 'disabled'} aria-label="Vender oficina de ${esc(s.nombre)}">－</button>` : ''}
      ${s.hip ? `<button class="btn" data-g="desh" data-s="${s.id}" ${G.puedeDeshipotecar(s) ? '' : 'disabled'}>Pagar ${G.costeDeshipotecar(s)}M</button>` : `<button class="btn" data-g="hip" data-s="${s.id}" ${G.puedeHipotecar(s) ? '' : 'disabled'}>Hipotecar +${s.precio / 2}M</button>`}</div>`).join('')
      : '<p>Todavía no tienes ninguna empresa.</p>') + '<p class="note">Para abrir oficinas necesitas el sector completo y sin hipotecas, y hay que construir de forma pareja. Con 4 oficinas, la siguiente es la 🏢 sede central.</p>';
  };
  cont.addEventListener('click', e => {
    const b = e.target.closest('[data-g]'); if (!b) return; const s = G.c[+b.dataset.s];
    ({ mas: () => G.construir(s), menos: () => G.vender(s), hip: () => G.hipotecar(s), desh: () => G.deshipotecar(s) })[b.dataset.g]();
    api.sonido('click'); dibujar(); pintar();
  });
  dibujar(); const r = await dialogo(`🏢 Empresas de ${esc(p.nombre)}`, cont, ['Cerrar'], { cancelable: true }); if (r === ABORTO) vigilaSesion(-1); vigilaSesion(sid);
}
async function gestionarDesdeBoton() {
  if (!G || jugando || G.terminada || G.p().bot) return;
  const sid = sesion; jugando = true;
  try { await gestionar(G.p(), sid); } catch (e) { if (e !== ABORTO) throw e; return; } finally { if (sid === sesion) jugando = false; }
  guardar(); pintar();
}

/* ---------- intercambios ---------- */
async function intercambioDesdeBoton() {
  if (!G || jugando || G.terminada || G.p().bot) return;
  const a = G.p(), otros = G.jug.filter(q => q !== a && !q.fuera); if (!otros.length) return;
  const sid = sesion; jugando = true;
  try {
    const cont = document.createElement('div'); let b = otros[0];
    const libres = j => G.propias(G.idx(j)).filter(s => !G.grupo(s).some(x => x.of));
    const dibujar = () => {
      cont.innerHTML = `<div class="bar"><span class="lbl">Con</span><div class="seg">${otros.map(q => `<button type="button" class="btn ${q === b ? 'on' : ''}" data-con="${G.idx(q)}">${esc(q.ficha)} ${esc(q.nombre)}</button>`).join('')}</div></div>
        <div class="mttrato">${[[a, 'Tú das', 'da'], [b, `Pides a ${esc(b.nombre)}`, 'pide']].map(([j, t, k]) => `<div><b>${t}</b>${libres(j).map(s => `<label class="mtop"><input type="checkbox" data-${k}="${s.id}"><i style="background:${s.g ? GRUPOS[s.g].color : 'var(--mut)'}"></i>${esc(s.nombre)}${s.hip ? ' <small>(hip.)</small>' : ''}</label>`).join('') || '<p class="note">Sin empresas que ofrecer.</p>'}
          <label class="mtdinero">Dinero <input class="pedir" type="number" inputmode="numeric" min="0" max="${j.dinero}" step="10" value="0" data-m="${k}"></label><small class="note">Tiene ${j.dinero}M</small></div>`).join('')}</div>`;
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
function clic(e) {
  const b = e.target.closest('button,[data-op]'); if (!b) return; const d = b.dataset;
  if (d.tipo) { const [i, t] = d.tipo.split(','); cfg.jug[+i][1] = t; api.setPref('cfg', cfg); return setup(); }
  if (d.ficha) { const i = +d.ficha, usadas = cfg.jug.map(j => j[2]); let f = cfg.jug[i][2]; do f = (f + 1) % FICHAS.length; while (usadas.includes(f) && f !== cfg.jug[i][2]); cfg.jug[i][2] = f; api.setPref('cfg', cfg); return setup(); }
  if (d.dinero) { cfg.dinero = +d.dinero; api.setPref('cfg', cfg); return setup(); }
  if (d.rondas) { cfg.rondas = +d.rondas; api.setPref('cfg', cfg); return setup(); }
  if (d.vel) { cfg.vel = d.vel; api.setPref('cfg', cfg); return G ? pintar() : setup(); }
  if (d.op) { cfg[d.op] = b.checked; api.setPref('cfg', cfg); return; }
  if (d.c != null && G) { const s = G.c[+d.c]; if (s.precio && !jugando) dialogo(esc(s.nombre), fichaEmpresa(s), ['Cerrar'], { cancelable: true }).catch(() => {}); else if (!s.precio) api.aviso(textoCasilla(s)); return; }
  const a = d.ac;
  if (a === 'start') empezar(); else if (a === 'tirar') jugar(); else if (a === 'gestionar') gestionarDesdeBoton(); else if (a === 'trato') intercambioDesdeBoton();
  else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas(); else if (a === 'nueva') nuevaSetup();
}
function textoCasilla(s) {
  if (s.tipo === 'impuesto') return `${s.nombre}: pagas ${s.importe}M.`;
  if (s.tipo === 'noticias' || s.tipo === 'tendencias') return `${s.nombre}: roba una carta.`;
  return { 0: `Ronda de Inversión: cobras ${SALARIO}M cada vez que pasas.`, 10: 'Sala de Espera: de visita no pasa nada. Aquí esperan los retenidos por la Auditoría.', 20: 'Paraíso Fiscal: si el bote está activado, te lo llevas entero.', 30: 'Auditoría Fiscal: vas directamente a la Sala de Espera, retenido.' }[s.id] || s.nombre;
}
function reglas() {
  api.modal('Magnate Urbano', `<ul>
    <li>Tira los dos dados y avanza. Si caes en una empresa, nube o red libre, puedes comprarla; si no la compras, se subasta (si las subastas están activadas).</li>
    <li>Si caes en una empresa de otro jugador, le pagas el alquiler. Con todo el <b>sector</b> (mismo color) el alquiler básico se duplica y puedes abrir <b>oficinas</b> (hasta 4) y luego la <b>🏢 sede central</b>, que lo multiplican.</li>
    <li>Las <b>nubes</b> ☁️ cobran según cuántas tenga su dueño (${NUBE.alquiler.join(', ')}M) y las <b>redes</b> 📡🛰️, ${RED.veces[0]} veces lo que saques en los dados (${RED.veces[1]} veces si tiene las dos).</li>
    <li>Al pasar por la <b>Ronda de Inversión</b> cobras ${SALARIO}M. En 📰 Noticias Tech y 📈 Tendencias Tech robas una carta.</li>
    <li>La <b>Auditoría Fiscal</b> te retiene en la Sala de Espera: sal pagando ${FIANZA}M, con un 🎫 pase o sacando dobles (tienes tres intentos). Tres dobles seguidos también te mandan allí.</li>
    <li>Con dobles vuelves a tirar. Puedes <b>hipotecar</b> empresas (cobras la mitad de su precio; recuperarlas cuesta un 10 % más) y vender oficinas a mitad de precio.</li>
    <li>🤝 <b>Tratos</b>: en tu turno puedes proponer cambiar empresas y dinero con otro jugador. Las CPU también te harán ofertas cuando les falte una empresa para completar un sector.</li>
    <li>Si no puedes pagar, quiebras y quedas fuera. Gana el último que siga en pie (o quien tenga más patrimonio si elegiste un límite de rondas). El banco tiene ${OFICINAS} oficinas y ${SEDES} sedes.</li>
    <li>Toca cualquier casilla para ver su ficha. Con la tecla Espacio también se tiran los dados.</li></ul>
    <p class="note">Las marcas de las empresas pertenecen a sus dueños: el juego no tiene relación con ellas.</p>`);
}
