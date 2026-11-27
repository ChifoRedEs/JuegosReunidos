// Aeropuerto · compra billetes de Destino, Terminales y servicios, mejora tus vuelos y arruina a tus rivales (2 a 4 jugadores, personas o CPU).
import { pieMenu } from '../../core/pie.js';
import { $, esc, esperar } from '../../core/dom.js';
import { grupoTableroDN, coloresTablero } from '../../core/aspectos.js';
import { FIGURAS, fondoFigura, urlFigura } from '../../core/figuras.js';
import { COLORES, IDS_POCOS } from '../../core/fichas.js';
import { crearDado3D } from '../../core/dado3d.js';
import { ZONAS, TIPOS, NIVELES, MULT, SALARIO, FIANZA, MEJORAS, JETS, TERMINAL, SERVICIO, CASILLAS, MAZOS, MAZO_NOMBRE, IMG, TOTAL } from './datos.js';
import { Partida, REGLAS, validar as validarPartida } from './motor.js';

const ABORTO = Symbol('aborto');                 // al salir del juego a mitad de turno
const VELOCIDAD = { normal: { nombre: 'Normal', paso: 150, bot: 550, dado: 900 }, rapida: { nombre: 'Rápida', paso: 45, bot: 200, dado: 450 }, sin: { nombre: 'Sin animaciones', paso: 0, bot: 0, dado: 0 } };
let G = null, api = null, asp = null, root = null, vivo = false, jugando = false, reg = false, pendiente = null, onKey = null, sesion = 0, enPausa = false, D3 = null, tokD = 0;
// sesion: cambia al salir del juego o empezar otra partida; los turnos que estuvieran a medias se cancelan (ABORTO)
let cfg = { fich: null, jug: [['Tú', 'h'], ['CPU 1', 'c'], ['CPU 2', 'c'], ['CPU 3', 'n']], bote: true, subasta: true, dinero: 1600, rondas: 0, vel: 'normal' };

/* ---------- fichas de los jugadores: figura con peana y color, cada uno la suya (botón «Fichas» de la pantalla de inicio) ---------- */
const FIGS = FIGURAS.filter(f => f.dir !== 'p');                 // solo animales y vehículos (tienen peana)
const DEF_FIG = ['leon', 'gato', 'perro', 'tigre'], DEF_COL = ['rojo-m', 'azul-m', 'verde-m', 'amarillo-m'];
const COL_OPC = COLORES.filter(c => IDS_POCOS.includes(c.id) && !['blanco', 'plata', 'gris'].includes(c.id));
const hexId = id => (COLORES.find(c => c.id === id) || COLORES[0]).hex;
const figDe = k => { const v = cfg.fich && cfg.fich[k] && cfg.fich[k][0]; return FIGS.some(f => f.id === v) ? v : DEF_FIG[k]; };
function paleta() {                                                // color efectivo de cada asiento (nunca dos iguales)
  const usados = new Set(), out = [];
  for (let k = 0; k < 4; k++) {
    const v = cfg.fich && cfg.fich[k] && cfg.fich[k][1]; let h = COL_OPC.some(c => c.id === v) ? hexId(v) : hexId(DEF_COL[k]);
    if (usados.has(h)) h = [...DEF_COL.map(hexId), ...COL_OPC.map(c => c.hex)].find(x => !usados.has(x));
    usados.add(h); out.push(h);
  }
  return out;
}
let PAL = ['#E5383B', '#2F6BFF', '#0FB56A', '#F5A60B'];
const colK = k => PAL[k] || '#2F6BFF';
const col = p => colK(p.k);
const figuraFicha = (k, cls = '') => `<i class="figp mtfg ${cls}" data-fig="${figDe(k)}" data-c="${colK(k)}"></i>`;
function repintarFig(raiz = document) {      // cada figura se pide una sola vez y se pinta ella sola cuando está teñida (sin repintar todas: evita avalanchas)
  raiz.querySelectorAll('.mtfg').forEach(e => {
    const k = e.dataset.fig + '|' + e.dataset.c; if (e.dataset.k === k && e.classList.contains('fig')) return; e.dataset.k = k;
    if (!fondoFigura(e, e.dataset.fig, e.dataset.c, () => { if (e.dataset.k === k) fondoFigura(e, e.dataset.fig, e.dataset.c); })) e.style.backgroundImage = `url("${urlFigura(e.dataset.fig)}")`;   // mientras se tiñe, la figura neutra (nunca un hueco)
  });
}
const sinTexto = html => String(html).replace(/<[^>]*>/g, '');
const colorDe = k => { const v = cfg.fich && cfg.fich[k] && cfg.fich[k][1]; return COL_OPC.some(c => c.id === v) ? v : DEF_COL[k]; };
// Ventana «Fichas» de un jugador: figura (animales y vehículos) y color; solo cambia la suya.
async function elegirFicha(k) {
  const cuerpo = document.createElement('div'); let f = figDe(k), c = colorDe(k);
  const otros = new Set([0, 1, 2, 3].filter(i => i !== k && cfg.jug[i][1] !== 'n').map(i => colorDe(i)));
  const dibujar = () => {
    cuerpo.innerHTML = `<div class="mtfichab grande" style="--c:${hexId(c)}"><i class="figp mtfg" data-fig="${f}" data-c="${hexId(c)}"></i></div>
      <p class="mtsub">Figura</p><div class="mtfigs">${FIGS.map(x => `<button type="button" class="mtfb ${x.id === f ? 'on' : ''}" data-f="${x.id}" aria-label="${esc(x.nombre)}" title="${esc(x.nombre)}"><i class="figp" style="background-image:url('${urlFigura(x.id)}')"></i></button>`).join('')}</div>
      <p class="mtsub">Color</p><div class="mtcols">${COL_OPC.map(x => `<button type="button" class="mtcb ${x.id === c ? 'on' : ''}" data-k="${x.id}" aria-label="${esc(x.nombre)}" title="${esc(x.nombre)}${otros.has(x.id) ? ' (en uso)' : ''}" style="background:${x.hex}">${otros.has(x.id) ? '<small>•</small>' : ''}</button>`).join('')}</div>`;
    repintarFig(cuerpo);
  };
  cuerpo.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.f) f = b.dataset.f; else if (b.dataset.k) c = b.dataset.k; else return; dibujar(); });
  dibujar();
  const r = await dialogo(`Ficha de ${esc(cfg.jug[k][0] || 'Jugador ' + (k + 1))}`, cuerpo, ['Guardar', 'Cancelar'], { cancelable: true });
  if (r !== 'Guardar') return;
  cfg.fich = cfg.fich || DEF_FIG.map((x, i) => [x, DEF_COL[i]]); cfg.fich[k] = [f, c];
  api.setPref('cfg', cfg); PAL = paleta(); setup();
}

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
  api = a; root = r; vivo = true; jugando = false; pendiente = null;
  asp = api.aspecto([{ ...grupoTableroDN('Tablero') }], () => { PAL = paleta(); temaDado(); if (G && root.querySelector('#mtJug')) { tokensFig(); pintar(); } else if (!G) setup(); });
  PAL = paleta();
  await api.css(new URL('./magnateurbano.css', import.meta.url));
  const c0 = api.pref('cfg', null);
  if (c0 && Array.isArray(c0.jug) && c0.jug.length === 4) cfg = { ...cfg, ...c0, fich: Array.isArray(c0.fich) && c0.fich.length === 4 ? c0.fich.map(x => [String(x && x[0]), String(x && x[1])]) : null, vel: VELOCIDAD[c0.vel] ? c0.vel : 'normal', jug: c0.jug.map(([n, t]) => [String(n).slice(0, 14), ['h', 'c', 'n'].includes(t) ? t : 'n']) };
  const g = api.cargar(); reg = g ? g.reg : false;
  sesion++; G = g ? Partida.desde(g.g, crearGanchos(sesion)) : null;
  root.addEventListener('click', clic); root.addEventListener('input', alEscribir);
  onKey = e => { if (e.code === 'Space' && !pendiente && G && !/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) { e.preventDefault(); jugar(); } };
  document.addEventListener('keydown', onKey);
  api.barra({ nueva: async () => { if (G && !G.terminada && !await api.confirmar('¿Abandonar la partida actual?')) return; sesion++; if (pendiente) { pendiente(ABORTO); pendiente = null; } enPausa = false; empezar(); },
    salir: () => { enPausa = false; sesion++; if (pendiente) { pendiente(ABORTO); pendiente = null; } api.borrar(); location.hash = '#/cat/tablero'; },
    pausar: () => { enPausa = true; },
    reanudar: () => { enPausa = false; },
    config: { valores: () => ({ j0: cfg.jug[0][1], j1: cfg.jug[1][1], j2: cfg.jug[2][1], j3: cfg.jug[3][1], dinero: cfg.dinero, rondas: cfg.rondas, vel: cfg.vel, bote: cfg.bote, subasta: cfg.subasta }),
      grupos: v => [...[0, 1, 2, 3].map(i => ({ clave: 'j' + i, titulo: `Jugador ${i + 1} · ${cfg.jug[i][0]}`, opciones: [['h', 'Persona'], ['c', 'CPU'], ['n', 'Nadie']] })),
        { clave: 'dinero', titulo: 'Dinero inicial', opciones: [1200, 1600, 2000].map(x => [x, x + ' M']) }, { clave: 'rondas', titulo: 'Duración', opciones: [[0, 'Hasta la bancarrota'], [20, '20 rondas'], [40, '40 rondas']] },
        { clave: 'vel', titulo: 'Velocidad', opciones: Object.entries(VELOCIDAD).map(([k, x]) => [k, x.nombre]) }, { clave: 'bote', titulo: 'Bote del Paraíso Fiscal', opciones: [[true, 'Sí'], [false, 'No']] }, { clave: 'subasta', titulo: 'Subastas', opciones: [[true, 'Sí'], [false, 'No']] }],
      aplicar: v => { enPausa = false; if ([0, 1, 2, 3].filter(i => v['j' + i] !== 'n').length < 2) { api.aviso('Hacen falta al menos 2 jugadores'); return; } [0, 1, 2, 3].forEach(i => { cfg.jug[i][1] = v['j' + i]; }); cfg.dinero = v.dinero; cfg.rondas = v.rondas; cfg.vel = v.vel; cfg.bote = v.bote; cfg.subasta = v.subasta; empezar(); } } });
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '🧳 Mis destinos', accion: () => gestionarDesdeBoton() }, { texto: '🤝 Negociar', accion: () => intercambioDesdeBoton() },
    { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: '📖 Reglas', accion: reglas }]);
  if (G && !G.terminada) { armar(); pintar(); log(`Partida recuperada: ronda ${G.ronda}.`); if (G.p().bot) jugar(); }
  else setup();
}
export function unmount() {
  vivo = false; enPausa = false; jugando = false; sesion++;
  if (pendiente) { pendiente(ABORTO); pendiente = null; }
  document.removeEventListener('keydown', onKey);
  if (root) { root.removeEventListener('click', clic); root.removeEventListener('input', alEscribir); }
  quitarDado(); G = null; asp = null;
}
function guardar() { if (!G) return; const d = { g: G.toJSON(), reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }
const vel = () => VELOCIDAD[cfg.vel] || VELOCIDAD.normal;
const pausa = async ms => { if (ms) await esperar(ms); while (enPausa && vivo) await esperar(120); };   // «Pausa / Salir» congela los turnos de la CPU y las animaciones

/* ---------- pantalla de inicio (Configuración de partida, como en los juegos de Lógica) ---------- */
function setup() {
  G = null; jugando = false; quitarDado();
  const n = cfg.jug.filter(j => j[1] !== 'n').length;
  root.innerHTML = `<p class="note">Compra billetes de destino, terminales y servicios del aeropuerto; con todos los destinos de una zona mejora tus vuelos y cobra más a tus rivales. Gana quien siga en pie cuando los demás quiebren${cfg.rondas ? ` o quien tenga más patrimonio tras ${cfg.rondas} rondas` : ''}.</p>
    ${cfg.jug.map(([nom, t], i) => `<div class="jugfila" style="--c:${colK(i)}"><input class="nom" data-name="${i}" maxlength="14" value="${esc(nom)}" aria-label="Nombre del jugador ${i + 1}"><button type="button" class="btn mtfbtn" data-ficha="${i}" aria-label="Fichas del jugador ${i + 1}"><span class="mtfichab" aria-hidden="true">${figuraFicha(i)}</span>Fichas</button><div class="seg">${[['h', 'Persona'], ['c', 'CPU'], ['n', 'Nadie']].map(([k, l]) => `<button class="btn ${t === k ? 'on' : ''}" data-tipo="${i},${k}">${l}</button>`).join('')}</div></div>`).join('')}
    <div class="bar"><span class="lbl">Dinero inicial</span><div class="seg">${[1200, 1600, 2000].map(v => `<button class="btn ${cfg.dinero === v ? 'on' : ''}" data-dinero="${v}">${v} M</button>`).join('')}</div></div>
    <div class="bar"><span class="lbl">Duración</span><div class="seg">${[[0, 'Hasta la bancarrota'], [20, '20 rondas'], [40, '40 rondas']].map(([v, l]) => `<button class="btn ${cfg.rondas === v ? 'on' : ''}" data-rondas="${v}">${l}</button>`).join('')}</div></div>
    <div class="bar"><span class="lbl">Velocidad</span><div class="seg">${Object.entries(VELOCIDAD).map(([k, v]) => `<button class="btn ${cfg.vel === k ? 'on' : ''}" data-vel="${k}">${v.nombre}</button>`).join('')}</div></div>
    <label class="chk"><input type="checkbox" data-op="bote" ${cfg.bote ? 'checked' : ''}><span><b>Bote del Paraíso Fiscal</b>: los impuestos, multas y fianzas se acumulan y se los lleva quien caiga en el Paraíso Fiscal.</span></label>
    <label class="chk"><input type="checkbox" data-op="subasta" ${cfg.subasta ? 'checked' : ''}><span><b>Subastas</b>: si quien cae en un destino libre no lo compra, se subasta entre todos.</span></label>
    ${pieMenu({ deshabilitado: n < 2 })}
    <p class="note">${n < 2 ? 'Hacen falta al menos 2 jugadores.' : `${n} jugadores. Las personas se pasan el móvil por turnos. Cada jugador elige su figura y color con el botón «Fichas».`}</p>`;
  repintarFig(root);
}
async function nuevaSetup() {
  if (G && !G.terminada && !await api.confirmar('¿Abandonar la partida actual?')) return;
  sesion++; if (pendiente) { pendiente(ABORTO); pendiente = null; }
  api.borrar(); setup();
}
function empezar() {
  const jugadores = cfg.jug.map(([nombre, t], i) => ({ nombre: nombre.trim() || `Jugador ${i + 1}`, k: i, bot: t === 'c', t })).filter(j => j.t !== 'n');
  if (jugadores.length < 2) return;
  api.setPref('cfg', cfg); PAL = paleta();
  sesion++; G = new Partida(jugadores, crearGanchos(sesion), { bote: cfg.bote, subasta: cfg.subasta, dinero: cfg.dinero, rondas: cfg.rondas }); reg = false;
  armar(); pintar(); log(`¡Empieza la partida! Cada jugador recibe ${cfg.dinero} M.`); guardar();
  if (G.p().bot) jugar();
}

/* ---------- tablero ---------- */
// Rejilla 7 columnas × 13 filas con 36 casillas iguales (5:4) en anillo: la casilla 0 (Embarque) abajo a la derecha, en sentido horario.
const celda = i => { const n = i + 1; return n <= 7 ? [13, 8 - n] : n <= 18 ? [20 - n, 1] : n === 19 ? [1, 1] : n <= 24 ? [1, n - 18] : n === 25 ? [1, 7] : [n - 24, 7]; };
const tiraDe = s => (s.tipo === 'destino' ? ZONAS[s.g] : s.tipo === 'carta' ? TIPOS[s.mazo] : TIPOS[s.tipo] || TIPOS.esquina);
const alq = (s, i) => (i ? Math.max(5, Math.round(s.alquiler * MULT[i] / 5) * 5) : s.alquiler);
function armar() {
  quitarDado();
  root.innerHTML = `<div class="mtjug" id="mtJug"></div>
    <div class="mttab" id="mtTab">
      ${G.c.map((s, i) => { const [f, c] = celda(i), t = tiraDe(s), dos = s.corto.includes('|'); return `<button type="button" class="mtc ${s.tipo}" data-c="${i}" style="grid-row:${f};grid-column:${c}" aria-label="${esc(s.nombre)}">
        <img class="f" src="${IMG(s.img)}" alt="" draggable="false"><i class="ow"></i><img class="up" alt="" hidden draggable="false"><span class="tk"></span>
        <span class="pl${dos ? ' d' : ''}" style="background:${t.color};color:${t.tinta}">${esc(s.corto).replace('|', '<br>')}</span></button>`; }).join('')}
      <div class="mtcentro" id="mtCentro">
        <img class="dorso r" src="${IMG('dorso-retrasos')}" alt="Mazo de Retrasos" draggable="false"><img class="dorso s" src="${IMG('dorso-souvenirs')}" alt="Mazo de Souvenirs" draggable="false">
        <div class="mtmid"><div class="dadozona" id="mtDado"></div><div class="mtst"><div class="mtturno" id="mtTurno"></div><small class="mtbote" id="mtBote"></small></div>
          <button type="button" class="btn on mtgo" id="mtGo" data-ac="tirar">🎲 Tirar</button></div>
      </div>
    </div>
    <div class="mtacc"><button type="button" class="btn" data-ac="gestionar" id="mtGes">🧳 Mis destinos</button><button type="button" class="btn" data-ac="trato" id="mtTrato">🤝 Negociar</button></div>
    <div class="msg mtmsg" id="mtMsg" role="status" aria-live="polite"></div>
    <ul class="mtlog" id="mtLog" aria-label="Historial de la partida"></ul>${api.barraHtml()}`;
  G.jug.forEach((p, i) => { if (!p.fuera) colocar(i); });
  iniciarDado();
}
async function iniciarDado() {
  const t = ++tokD, host = $('#mtDado'); if (!host || !G) return;
  const d = await crearDado3D(host, { n: 2, etiqueta: 'Dados: toca para tirar', alClic: () => { if (G && !G.p().bot) jugar(); } });
  if (t !== tokD || !d) { if (d) d.destruir(); return; }
  D3 = d; temaDado(); if (G) pintar();
}
function quitarDado() { tokD++; if (D3) { D3.destruir(); D3 = null; } }
const accTablero = () => coloresTablero((asp && asp.valores.tablero) || 'dia1').acc;
function temaDado() { if (D3) D3.color(accTablero()); }
function tokensFig() { if (!G) return; G.jug.forEach((p, i) => { const t = root.querySelector(`.mtficha[data-j="${i}"]`); if (t) { t.dataset.fig = figDe(p.k); t.dataset.c = col(p); t.style.setProperty('--c', col(p)); } }); repintarFig(root); }
function colocar(i) {
  const p = G.jug[i], cel = root.querySelector(`.mtc[data-c="${p.pos}"] .tk`); if (!cel) return;
  let t = root.querySelector(`.mtficha[data-j="${i}"]`);
  if (!t) { t = document.createElement('span'); t.className = 'mtficha mtfg'; t.dataset.j = i; }
  t.dataset.fig = figDe(p.k); t.dataset.c = col(p); t.style.setProperty('--c', col(p));
  fondoFigura(t, t.dataset.fig, t.dataset.c, () => repintarFig(root));
  cel.append(t); t.classList.remove('salta'); void t.offsetWidth; t.classList.add('salta');
}
function pintar() {
  if (!G || !$('#mtTab')) return;
  G.c.forEach((s, i) => {
    const d = root.querySelector(`.mtc[data-c="${i}"]`), o = s.dueno === null ? null : G.jug[s.dueno];
    d.style.setProperty('--dueno', o ? col(o) : 'transparent'); d.classList.toggle('propia', !!o); d.classList.toggle('hip', s.hip);
    const up = d.querySelector('.up'); if (up) { const n = NIVELES[s.of]; up.hidden = !(s.tipo === 'destino' && s.of > 0); if (!up.hidden) up.src = IMG(n.id); }
    d.setAttribute('aria-label', `${s.nombre}${s.precio ? ` · ${s.precio} M` : ''}${o ? ` · de ${o.nombre}` : ''}${s.hip ? ' · hipotecado' : ''}${s.of ? ` · ${NIVELES[s.of].nombre}` : ''}`);
  });
  const act = G.terminada ? -1 : G.turno;
  $('#mtJug').innerHTML = G.jug.map((p, i) => {
    const ins = [p.espera ? '🔒' : '', p.pierde ? '⏸️' : '', p.huelga ? '✊' : '', p.libres.length ? '🎟️' + (p.libres.length > 1 ? '×2' : '') : ''].filter(Boolean).join(' ');
    return `<button type="button" class="mtj ${i === act ? 'turno' : ''} ${p.fuera ? 'fuera' : ''} ${i === G.ganador ? 'gana' : ''}" style="--c:${col(p)}" data-j="${i}" aria-label="${esc(p.nombre)}: ${p.dinero} M. Ver patrimonio">
      <span class="mtji">${figuraFicha(p.k)}</span><span class="mtjt"><b>${esc(p.nombre)}</b><small>${p.fuera ? 'Bancarrota' : p.dinero.toLocaleString('es-ES') + ' M'}${ins ? ' ' + ins : ''}</small></span></button>`;
  }).join('');
  repintarFig(root);
  const p = G.p(), humano = !p.bot && !p.fuera && !G.terminada, libre = humano && !jugando;
  $('#mtTurno').innerHTML = G.terminada ? `🏆 Gana <b>${esc(G.jug[G.ganador].nombre)}</b>` : `Turno de <b style="color:${col(p)}">${esc(p.nombre)}</b>${p.espera ? '<small>retenido en la Prisión</small>' : p.pierde ? '<small>pierde este turno</small>' : ''}`;
  $('#mtBote').textContent = `${G.reglas.bote ? `Bote: ${G.bote} M · ` : ''}Ronda ${G.ronda}${G.reglas.rondas ? ` de ${G.reglas.rondas}` : ''}`;
  if (D3) D3.activar(libre && !G.terminada, '');
  const go = $('#mtGo'); go.disabled = !libre || G.terminada; go.textContent = G.terminada ? '🏆 Fin' : p.bot ? '⏳ Juega ' + p.nombre : p.espera ? '🔓 Tu turno' : '🎲 Tirar';
  $('#mtGes').disabled = !libre; $('#mtTrato').disabled = !libre || G.jug.filter(q => !q.fuera).length < 2;
}
function log(html, clase = '') {
  const L = $('#mtLog'); if (!L) return;
  const li = document.createElement('li'); li.className = clase; li.innerHTML = html; L.prepend(li);
  while (L.children.length > 80) L.lastChild.remove();
  const m = $('#mtMsg'); if (m) { m.innerHTML = html; m.className = 'msg mtmsg ' + clase; }
}

/* ---------- ventanas ---------- */
// Hoja inferior (preguntas, gestión, tratos) o, con `tarjeta`, ficha emergente en el centro de la pantalla.
const TEMA_VARS = ['--tb-line', '--tb-cell', '--tb-alt', '--tb-acc', '--tb-ink', '--tb-soft', '--tb-hi', '--tb-strong'];
function dialogo(titulo, cuerpo, botones, { cancelable = false, auto = 0, tarjeta = false } = {}) {
  return new Promise(res => {
    const m = document.createElement('div'); m.className = 'modal mtmodal' + (tarjeta ? ' tj' : ''); m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    if (root) { const cs = getComputedStyle(root); TEMA_VARS.forEach(v => m.style.setProperty(v, cs.getPropertyValue(v))); m.dataset.tablero = root.dataset.tablero || ''; }
    const h = document.createElement('div'); h.className = 'hoja';
    const bt = botones.length ? `<div class="bar mtbotones">${botones.map((b, i) => `<button type="button" class="btn ${i ? '' : 'on'}" data-b="${i}">${esc(b)}</button>`).join('')}</div>` : '';
    h.innerHTML = `${tarjeta ? '' : `<h2>${titulo}</h2>`}<div class="cuerpo"></div>${bt}`;
    const c = h.querySelector('.cuerpo'); if (typeof cuerpo === 'string') c.innerHTML = cuerpo; else c.append(cuerpo);
    m.append(h); document.body.append(m); repintarFig(m);
    let t = null;
    const fin = v => { if (!m.isConnected) return; clearTimeout(t); m.remove(); document.removeEventListener('keydown', tecla); if (pendiente === fin) pendiente = null; res(v); };
    const tecla = e => { if (e.key === 'Escape' && cancelable) fin(null); };
    const b = h.querySelector('.mtbotones'); if (b) b.addEventListener('click', e => { const x = e.target.closest('[data-b]'); if (x) fin(botones[+x.dataset.b]); });
    if (cancelable) m.addEventListener('click', e => { if (e.target === m) fin(null); });
    document.addEventListener('keydown', tecla); pendiente = fin;
    if (auto) t = setTimeout(() => fin(botones[0] !== undefined ? botones[0] : null), auto);
    setTimeout(() => { const x = h.querySelector('.mtbotones .btn.on'); if (x) x.focus(); }, 30);
  });
}
const autoMs = () => (vel().bot ? Math.max(1100, vel().bot * 2.4) : 500);

/* ---------- fichas emergentes ---------- */
function cabecera(img, nombre, sub, t, ar) { return `<div class="mti" style="aspect-ratio:${ar}"><img src="${img}" alt="" draggable="false"><div class="mtban" style="--c:${t.color};--t:${t.tinta}"><b>${esc(nombre)}</b><span>${esc(sub)}</span></div></div>`; }
const fila = (img, a, b, cl = '') => `<div class="${cl}">${img ? `<img src="${IMG(img)}" alt="">` : '<span></span>'}${a}<em>${b}</em></div>`;
function dueno(s) { if (!G || s.dueno === null) return ''; const o = G.jug[s.dueno]; return `<div class="mtdu"><i style="background:${col(o)}"></i>De <b>${esc(o.nombre)}</b>${s.hip ? ' · hipotecado' : ''}</div>`; }
function fichaCasilla(s, extra = {}) {
  const t = tiraDe(s), cab = cabecera(IMG(s.img), s.nombre, s.sub, t, '5/4');
  let cuerpo = '';
  if (s.tipo === 'destino') {
    cuerpo = `<div class="tb">${NIVELES.map((n, i) => fila(n.id, n.nombre, alq(s, i) + ' M', s.of === i && s.dueno !== null ? 'act' : '')).join('')}</div>
      <p class="mtnota">Con todos los destinos de ${esc(ZONAS[s.g].nombre)} el billete cobra el doble y ya puedes mejorar los vuelos.</p>
      <div class="ft"><span>Mejora de vuelo: ${ZONAS[s.g].mejora} M</span><span>Hipoteca: ${s.precio / 2} M</span></div>`;
  } else if (s.tipo === 'terminal') {
    cuerpo = `<div class="tb">${TERMINAL.alquiler.map((v, i) => fila('', `${i + 1} terminal${i ? 'es' : ''}`, v + ' M')).join('')}</div><div class="ft"><span>Precio: ${s.precio} M</span><span>Hipoteca: ${s.precio / 2} M</span></div>`;
  } else if (s.tipo === 'servicio') {
    cuerpo = `<div class="tb">${SERVICIO.veces.map((v, i) => fila('', `${i + 1} servicio${i ? 's' : ''}`, `${v} × dados`)).join('')}</div><p class="mtnota">Servicios: Agencia de Viajes y Duty Free. El alquiler depende de lo que saquen los dados.</p><div class="ft"><span>Precio: ${s.precio} M</span><span>Hipoteca: ${s.precio / 2} M</span></div>`;
  } else if (s.tipo === 'impuesto') {
    cuerpo = `<div class="big neg">Pagas ${s.importe} M</div>${G && G.reglas.bote ? '<p class="mtnota">El dinero va al bote del Paraíso Fiscal.</p>' : ''}`;
  } else if (s.tipo === 'carta') {
    cuerpo = `<p>${s.mazo === 'souvenirs' ? 'Roba una carta Souvenir: casi siempre son buenas noticias.' : 'Roba una carta de Retrasos: los imprevistos del viaje.'}</p>`;
  } else {
    cuerpo = `<p>${{ embarque: `Cada vez que pasas por Embarque cobras ${SALARIO} M.`, prision: 'Si solo pasas por aquí, es una visita: no pasa nada. Aquí esperan los retenidos por el Control de Seguridad.', paraiso: 'Te llevas todo el bote de impuestos y multas (si el bote está activado).', control: 'Aquí te retienen: vas directo a la Prisión Aduanera.' }[s.clave]}</p>`;
  }
  let nota = '';
  if (extra.alquiler) nota = `<div class="big neg">Pagas ${extra.alquiler} M a ${esc(extra.a.nombre)}</div>`;
  else if (extra.huelga) nota = `<div class="big">${esc(extra.a.nombre)} está en huelga: no cobra</div>`;
  else if (extra.propia) nota = '<div class="big">Es tuyo: sin alquiler</div>';
  else if (extra.hip) nota = '<div class="big">Hipotecado: sin alquiler</div>';
  return `<div class="mtk">${cab}<div class="bd">${cuerpo}${nota}${extra.alquiler || extra.huelga || extra.propia || extra.hip ? '' : dueno(s)}</div></div>`;
}
function fichaCarta(mazo, c) {
  const t = TIPOS[mazo], bad = /^[−-]|pierd|retroced|Vuelve|Ve a la Prisión|No cobras/.test(c.e) && !c.libre;
  return `<div class="mtk">${cabecera(IMG(c.img), c.t, mazo === 'souvenirs' ? 'Carta Souvenir' : 'Carta Retrasos', t, '1/1')}<div class="bd"><p>${esc(c.x)}</p><div class="big ${bad || mazo === 'retrasos' && !c.libre ? 'neg' : 'pos'}">${esc(c.e)}</div></div></div>`;
}
function filasMano(p) { return p.libres.length ? `<p class="mtnota">Tarjetas «sal de la Prisión»: ${p.libres.map(m => `<b>${MAZOS[m].find(c => c.libre).t}</b>`).join(', ')}.</p>` : ''; }

/* ---------- ganchos que usa el motor ---------- */
// Cada partida recibe los suyos: si la sesión cambia (salir del juego, partida nueva), el turno a medias se cancela.
function crearGanchos(sid) {
const vigila = v => { if (!vivo || sid !== sesion || v === ABORTO) throw ABORTO; return v; };
return {
  render: () => { if (vivo && sid === sesion) pintar(); },
  log: (m, c) => { if (vivo && sid === sesion) log(m, c); },
  color: p => col(p),
  paso: async p => {
    vigila(); colocar(G.idx(p)); if (vel().paso) { api.sonido('click'); await pausa(vel().paso); }
    vigila();
  },
  dados: async (a, b) => {
    vigila(); api.sonido('dado');
    if (D3) { temaDado(); await D3.tirar([a, b], vel().dado); } else await pausa(vel().paso ? 400 : 0);
    await pausa(vel().paso ? 200 : 0); vigila();
  },
  flash: (p, v) => {
    if (!vivo || sid !== sesion || !v) return; const c = root.querySelector(`.mtj[data-j="${G.idx(p)}"]`); if (!c) return;
    const f = document.createElement('span'); f.className = 'mtflash ' + (v < 0 ? 'neg' : 'pos'); f.textContent = (v > 0 ? '+' : '') + v + ' M'; c.append(f); setTimeout(() => f.remove(), 1300);
    if (v > 0) api.sonido('ok');
  },
  pregunta: async (t, x, b) => vigila(await dialogo(esc(t), `<p>${x}</p>`, b)),
  carta: async (mazo, c, auto) => { vigila(); api.sonido('ok'); return vigila(await dialogo('', fichaCarta(mazo, c), ['Aceptar'], { tarjeta: true, auto: auto ? autoMs() : 0 })); },
  aterriza: async (s, p, auto, extra) => { vigila(); return vigila(await dialogo('', fichaCasilla(s, extra), ['Aceptar'], { tarjeta: true, auto: auto ? autoMs() : 0 })); },
  comprar: async (s, p) => {
    const op = [`Comprar · ${s.precio} M`, G.reglas.subasta ? 'Subastar' : 'No comprar'];
    return vigila(await dialogo('', `${fichaCasilla(s)}<p class="mtsaldo"><b style="color:${col(p)}">${esc(p.nombre)}</b>: tienes ${p.dinero} M</p>`, op, { tarjeta: true })) === op[0];
  },
  puja: async (s, q, actual) => {
    const cont = document.createElement('div'), min = actual + 10;
    cont.innerHTML = `${fichaCasilla(s)}<div class="mtpuja"><p><b style="color:${col(q)}">${esc(q.nombre)}</b>: la puja va por <b>${actual} M</b>. Tienes ${q.dinero} M.</p><input class="pedir" type="number" inputmode="numeric" min="${min}" max="${q.dinero}" step="10" value="${Math.min(q.dinero, min)}" aria-label="Tu puja"></div>`;
    const r = vigila(await dialogo('', cont, ['Pujar', 'Retirarse'], { tarjeta: true }));
    const v = Math.floor(+cont.querySelector('input').value || 0);
    return r === 'Pujar' && v > actual && v <= q.dinero ? v : 0;
  },
  aceptar: async (a, b, o) => vigila(await dialogo(`🤝 ${esc(b.nombre)}: ¿aceptas el trato?`, `<p><b>${esc(a.nombre)}</b> te da: <b>${listaTrato(o.da, o.daM, o.daL)}</b></p><p>A cambio pide: <b>${listaTrato(o.pide, o.pideM, o.pideL)}</b></p>`, ['Aceptar', 'Rechazar'])) === 'Aceptar',
  casilla: async p => {
    const cont = document.createElement('div'); let eleg = -1;
    cont.innerHTML = `<p>Billete dorado: elige a dónde viajas.</p><div class="mtelige">${G.c.map((s, i) => (i === 24 || i === p.pos ? '' : `<button type="button" class="btn" data-i="${i}" style="--c:${tiraDe(s).color}"><i></i>${esc(s.nombre)}${s.dueno !== null ? ` <small>(${esc(G.jug[s.dueno].nombre)})</small>` : ''}</button>`)).join('')}</div>`;
    cont.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; eleg = +b.dataset.i; cont.querySelectorAll('[data-i]').forEach(x => x.classList.toggle('on', x === b)); });
    do { vigila(await dialogo('✈️ Billete dorado', cont, ['Viajar'])); } while (eleg < 0);
    return eleg;
  },
  gestionar: async (g, p) => gestionar(p, sid),
  fin: async (p, motivo) => {
    vigila(); pintar(); registrarFin(p);
    api.sonido(p.bot && G.jug.some(q => !q.bot) && G.jug.filter(q => !q.bot).length === 1 ? 'perder' : 'ganar');
    await dialogo(`🏆 ¡${esc(p.nombre)} gana la partida!`, `<p>${esc(motivo)}.</p><p>Patrimonio final: <b>${G.patrimonio(p)} M</b>.</p>`, ['Ver el tablero']);
  },
};
}
const vigilaSesion = sid => { if (!vivo || sid !== sesion) throw ABORTO; };
const nombreTarjeta = m => MAZOS[m].find(c => c.libre).t;
const listaTrato = (ids, m, tj = []) => [...ids.map(i => esc(G.c[i].nombre)), ...tj.map(x => `«${esc(nombreTarjeta(x))}»`), m ? m + ' M' : ''].filter(Boolean).join(', ') || 'nada';
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

/* ---------- mis destinos (mejorar vuelos, hipotecar) ---------- */
async function gestionar(p, sid = sesion) {
  const i = G.idx(p), cont = document.createElement('div');
  const dibujar = () => {
    const mias = G.propias(i);
    cont.innerHTML = `<p class="note">Dinero: <b>${p.dinero} M</b> · el banco tiene ${G.mejoras} mejoras de vuelo y ${G.jets} jets privados.</p>${filasMano(p)}` + (mias.length ? mias.map(s => `<div class="mtges"><i style="background:${tiraDe(s).color}"></i><span>${esc(s.nombre)}${s.of ? ` <small>· ${NIVELES[s.of].nombre}</small>` : ''}${s.hip ? ' <small>· hipotecado</small>' : ''}</span>
      ${s.tipo === 'destino' ? `<button class="btn" data-g="mas" data-s="${s.id}" ${G.puedeMejorar(s) ? '' : 'disabled'} aria-label="Mejorar el vuelo de ${esc(s.nombre)} (${ZONAS[s.g].mejora} M)">＋</button><button class="btn" data-g="menos" data-s="${s.id}" ${G.puedeBajar(s) ? '' : 'disabled'} aria-label="Bajar de categoría ${esc(s.nombre)}">－</button>` : ''}
      ${s.hip ? `<button class="btn" data-g="desh" data-s="${s.id}" ${G.puedeDeshipotecar(s) ? '' : 'disabled'}>Pagar ${G.costeDeshipotecar(s)} M</button>` : `<button class="btn" data-g="hip" data-s="${s.id}" ${G.puedeHipotecar(s) ? '' : 'disabled'}>Hipotecar +${s.precio / 2}</button>`}</div>`).join('')
      : '<p>Todavía no tienes ningún destino.</p>') + '<p class="note">Para mejorar los vuelos necesitas todos los destinos de la zona sin hipotecas, y hay que mejorar de forma pareja. Tras la Primera Clase llega el ✈️ Jet Privado. Bajar de categoría devuelve la mitad de lo que costó.</p>';
  };
  cont.addEventListener('click', e => {
    const b = e.target.closest('[data-g]'); if (!b) return; const s = G.c[+b.dataset.s];
    ({ mas: () => G.mejorar(s), menos: () => G.bajar(s), hip: () => G.hipotecar(s), desh: () => G.deshipotecar(s) })[b.dataset.g]();
    api.sonido('click'); dibujar(); pintar();
  });
  dibujar(); const r = await dialogo(`🧳 Destinos de ${esc(p.nombre)}`, cont, ['Cerrar'], { cancelable: true }); if (r === ABORTO) vigilaSesion(-1); vigilaSesion(sid);
}
async function gestionarDesdeBoton() {
  if (!G || jugando || G.terminada || G.p().bot) return;
  const sid = sesion; jugando = true;
  try { await gestionar(G.p(), sid); } catch (e) { if (e !== ABORTO) throw e; return; } finally { if (sid === sesion) jugando = false; }
  guardar(); pintar();
}

/* ---------- negociar (destinos, dinero y tarjetas «sal de la Prisión») ---------- */
async function intercambioDesdeBoton() {
  if (!G || jugando || G.terminada || G.p().bot) return;
  const a = G.p(), otros = G.jug.filter(q => q !== a && !q.fuera); if (!otros.length) return;
  const sid = sesion; jugando = true;
  try {
    const cont = document.createElement('div'); let b = otros[0];
    const libres = j => G.propias(G.idx(j)).filter(s => !G.zona(s).some(x => x.of));
    const dibujar = () => {
      cont.innerHTML = `<div class="bar"><span class="lbl">Con</span><div class="seg">${otros.map(q => `<button type="button" class="btn ${q === b ? 'on' : ''}" data-con="${G.idx(q)}">${figuraFicha(q.k, 'mini')} ${esc(q.nombre)}</button>`).join('')}</div></div>
        <div class="mttrato">${[[a, 'Tú das', 'da'], [b, `Pides a ${esc(b.nombre)}`, 'pide']].map(([j, t, k]) => `<div><b>${t}</b>${libres(j).map(s => `<label class="mtop"><input type="checkbox" data-${k}="${s.id}"><i style="background:${tiraDe(s).color}"></i>${esc(s.nombre)}${s.hip ? ' <small>(hip.)</small>' : ''}</label>`).join('')}
          ${[...new Set(j.libres)].map(m => `<label class="mtop"><input type="checkbox" data-${k}L="${m}"><i class="tj"></i>🎟️ ${esc(nombreTarjeta(m))}</label>`).join('')}${libres(j).length || j.libres.length ? '' : '<p class="note">Nada que ofrecer.</p>'}
          <label class="mtdinero">Dinero <input class="pedir" type="number" inputmode="numeric" min="0" max="${j.dinero}" step="10" value="0" data-m="${k}"></label><small class="note">Tiene ${j.dinero} M</small></div>`).join('')}</div>`;
      repintarFig(cont);
    };
    cont.addEventListener('click', e => { const x = e.target.closest('[data-con]'); if (x) { b = G.jug[+x.dataset.con]; dibujar(); } });
    dibujar();
    const r = await dialogo('🤝 Proponer un trato', cont, ['Proponer', 'Cancelar'], { cancelable: true }); if (r === ABORTO) return; vigilaSesion(sid);
    if (r !== 'Proponer') return;
    const ids = k => [...cont.querySelectorAll(`[data-${k}]:checked`)].map(x => +x.dataset[k]);
    const tj = k => [...cont.querySelectorAll(`[data-${k}L]:checked`)].map(x => x.dataset[k + 'L']);
    const din = k => Math.max(0, Math.floor(+cont.querySelector(`[data-m="${k}"]`).value || 0));
    await G.proponer(a, b, { da: ids('da'), daM: din('da'), daL: tj('da'), pide: ids('pide'), pideM: din('pide'), pideL: tj('pide') });
  } catch (e) { if (e !== ABORTO) throw e; return; } finally { if (sid === sesion) jugando = false; }
  guardar(); pintar();
}

/* ---------- patrimonio de un jugador (al tocar su ficha) ---------- */
function verJugador(i) {
  const p = G.jug[i], mias = G.propias(i);
  const filas = mias.length ? mias.map(s => `<div class="mtges"><i style="background:${tiraDe(s).color}"></i><span>${esc(s.nombre)}${s.of ? ` <small>· ${NIVELES[s.of].nombre}</small>` : ''}${s.hip ? ' <small>· hipotecado</small>' : ''}</span></div>`).join('') : '<p class="note">Todavía no tiene ningún destino.</p>';
  dialogo(`${figuraFicha(p.k, 'mini')} ${esc(p.nombre)}${p.bot ? ' · CPU' : ''}`, `<p>Dinero: <b>${p.dinero} M</b> · Patrimonio: <b>${G.patrimonio(p)} M</b></p>${p.fuera ? '<p>En bancarrota.</p>' : ''}${p.espera ? '<p>🔒 Retenido en la Prisión Aduanera.</p>' : ''}${filasMano(p)}${filas}`, ['Cerrar'], { cancelable: true }).catch(() => {});
}

/* ---------- entrada ---------- */
function alEscribir(e) { const i = e.target.dataset.name; if (i != null) { cfg.jug[+i][0] = e.target.value; api.setPref('cfg', cfg); } }
function clic(e) {
  const b = e.target.closest('button,[data-op]'); if (!b) return; const d = b.dataset;
  if (d.ficha != null) return elegirFicha(+d.ficha);
  if (d.tipo) { const [i, t] = d.tipo.split(','); cfg.jug[+i][1] = t; api.setPref('cfg', cfg); return setup(); }
  if (d.dinero) { cfg.dinero = +d.dinero; api.setPref('cfg', cfg); return setup(); }
  if (d.rondas) { cfg.rondas = +d.rondas; api.setPref('cfg', cfg); return setup(); }
  if (d.vel) { cfg.vel = d.vel; api.setPref('cfg', cfg); return G ? pintar() : setup(); }
  if (d.op) { cfg[d.op] = b.checked; api.setPref('cfg', cfg); return; }
  if (d.j != null && G && b.classList.contains('mtj')) return verJugador(+d.j);
  if (d.c != null && G) { if (!jugando) dialogo('', fichaCasilla(G.c[+d.c]), ['Cerrar'], { tarjeta: true, cancelable: true }).catch(() => {}); return; }
  const a = d.ac;
  if (a === 'start') empezar(); else if (a === 'tirar') jugar(); else if (a === 'gestionar') gestionarDesdeBoton(); else if (a === 'trato') intercambioDesdeBoton();
  else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas(); else if (a === 'nueva') nuevaSetup();
}
function reglas() {
  api.modal('Aeropuerto', `<ul>
    <li>Tira los dos dados y avanza por el aeropuerto. Si caes en un <b>destino</b>, una <b>terminal</b> o un <b>servicio</b> libre, puedes comprarlo; si no lo compras, se subasta (si las subastas están activadas).</li>
    <li>Si caes en un billete de otro jugador, le pagas el alquiler. Con <b>todos los destinos de una zona</b> (mismo color) el billete cobra el doble y puedes <b>mejorar los vuelos</b>: Clase Turista, Premium, Ejecutiva, Primera Clase y, por último, el ✈️ <b>Jet Privado</b>. Hay que mejorar de forma pareja y el banco tiene ${MEJORAS} mejoras y ${JETS} jets.</li>
    <li>Las <b>terminales</b> cobran según cuántas tenga su dueño (${TERMINAL.alquiler.join(', ')} M) y los <b>servicios</b> (Agencia de Viajes y Duty Free), ${SERVICIO.veces[0]} veces lo que saques en los dados (${SERVICIO.veces[1]} veces si tiene los dos).</li>
    <li>Al pasar por <b>Embarque</b> cobras ${SALARIO} M. En las casillas <b>Souvenir</b> robas una carta casi siempre buena y en <b>Retrasos</b>, una con los imprevistos del viaje. Los impuestos y multas van al bote del <b>Paraíso Fiscal</b>: quien caiga allí se lo lleva.</li>
    <li>Solo el <b>Control de Seguridad</b> te manda a la <b>Prisión Aduanera</b> (y las cartas «Cola interminable» o tres dobles seguidos). Si caes en la Prisión de paso, es una visita y no pasa nada. Para salir: paga ${FIANZA} M, usa una tarjeta o saca dobles (tres intentos).</li>
    <li>Hay dos tarjetas de <b>«sal de la Prisión»</b> (Acreditación VIP y Seguro de viaje): te las quedas hasta que las uses, y se pueden <b>vender o cambiar</b> en 🤝 Negociar. Al usarlas vuelven al final de su mazo.</li>
    <li>Con dobles vuelves a tirar. Puedes <b>hipotecar</b> destinos (cobras la mitad; recuperarlos cuesta un 10 % más) y bajar de categoría (cobras la mitad de lo que costó).</li>
    <li>🤝 <b>Negociar</b>: en tu turno puedes proponer cambiar destinos, tarjetas y dinero con otro jugador. Las CPU también te harán ofertas cuando les falte un destino para completar una zona.</li>
    <li>Si no puedes pagar, quiebras y quedas fuera. Gana el último que siga en pie (o quien tenga más patrimonio si elegiste un límite de rondas).</li>
    <li>Toca cualquier casilla para ver su ficha y cualquier jugador para ver su patrimonio. Con la tecla Espacio también se tiran los dados.</li></ul>
    <p class="note">Los destinos son lugares reales del mundo; el juego no tiene relación con ninguna marca ni aerolínea.</p>`);
}
