// Mastermind: descubre el código de colores con las pistas (negras y blancas), o pon tú el código y mira cómo lo descifra la máquina.
// Vista 2D (HTML) o 3D (Three.js). Reglas y lógica en motor.js.
import { $, esc } from '../../core/dom.js';
import { Cronometro } from '../../core/cronometro.js';
import { grupoFondo } from '../../core/aspectos.js';
import * as M from './motor.js';

const SIMB = ['●', '▲', '■', '◆', '★', '♥', '☘', '☾'];
const MARCOS = {
  madera: { nombre: 'Madera', sw: ['#8A5A2B', '#2B1D12'] }, nogal: { nombre: 'Nogal oscuro', sw: ['#5B3A29', '#1E1410'] }, pizarra: { nombre: 'Pizarra', sw: ['#5B6577', '#1D222C'] },
  azul: { nombre: 'Azul', sw: ['#3B6FD8', '#142750'] }, verde: { nombre: 'Verde', sw: ['#3E8E5A', '#12331F'] }, rosa: { nombre: 'Rosa', sw: ['#D9488C', '#4A1431'] },
};
const PALETAS = {
  vivo: { nombre: 'Vivos', sw: ['#E53935', '#1E88E5', '#43A047', '#FDD835'] }, pastel: { nombre: 'Pastel', sw: ['#FF9AA2', '#9CC4FF', '#A8E6A1', '#FFE9A0'] },
  joya: { nombre: 'Joyas', sw: ['#B3123F', '#1B4FB3', '#0F8A52', '#C98A00'] }, retro: { nombre: 'Retro', sw: ['#C8553D', '#3D7EA6', '#6B9A4A', '#E0B341'] },
};
const ESTILOS = {
  bola: { nombre: 'Bolas brillantes', sw: ['#ffffff', '#E53935'] }, plano: { nombre: 'Planas', sw: ['#E53935', '#E53935'] }, cristal: { nombre: 'Cristal', sw: ['#ffe0e0', '#E53935'] }, simbolos: { nombre: 'Con símbolos (daltonismo)', sw: ['#E53935', '#8a1c1a'] },
};
let S = null, api = null, asp = null, root = null, crono = null, serie = 0, sel = -1, onKey = null, V3 = null, hay3d = false, modo3d = false, forzar2d = false, tok3 = 0, tIA = 0, pop = -1;
let panel = null, posPanel = null, arrP = null, onRes = null;
let cfg = { modo: 'adivinar', preset: 'clasico', ...M.PRESETS.clasico };
const quiere3D = () => hay3d && !forzar2d && !!asp && (asp.valores.vista || '2d') === '3d';
const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const nombreVar = d => { const p = Object.values(M.PRESETS).find(x => x.pos === d.pos && x.col === d.col && x.rep === d.rep && x.max === d.max); return `${p ? p.nombre : 'Personalizado'} · ${d.pos} bolas, ${d.col} colores${d.rep ? '' : ', sin repetir'}`; };
const claveRec = d => `${d.pos}-${d.col}-${d.rep ? 1 : 0}-${d.max}`;

/* ---------- validación / resumen ---------- */
export const validar = M.validar;
export const migrarV1 = d => d;
export function resumen(d) {
  const t = d.modo === 'codigo' ? (d.sec ? (d.done ? `la máquina lo descifra en ${d.jug.length}` : `la máquina va por el intento ${d.jug.length + 1}`) : 'poniendo el código')
    : (d.done ? (d.gano ? `descifrado en ${d.jug.length} ${d.jug.length === 1 ? 'intento' : 'intentos'}` : 'sin descifrar') : `intento ${d.jug.length + 1} de ${d.max}`);
  return { texto: `${M.MODOS[d.modo]} · ${d.pos} bolas, ${d.col} colores · ${t}`, fin: d.done };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; forzar2d = false; modo3d = false; sel = -1; pop = -1; serie++;
  try { hay3d = (await import('../../core/escena3d.js')).hayWebGL(); } catch { hay3d = false; }
  asp = api.aspecto([
    ...(hay3d ? [{ clave: 'vista', titulo: 'Vista del tablero', icono: '🧊', def: '2d', opciones: [{ id: '3d', nombre: '🧊 3D' }, { id: '2d', nombre: '🔲 2D clásica' }] }] : []),
    grupoFondo('#mmTab'),
    { clave: 'marco', titulo: 'Tablero', icono: '🪵', def: 'madera', opciones: Object.entries(MARCOS).map(([id, t]) => ({ id, nombre: t.nombre, sw: t.sw })) },
    { clave: 'paleta', titulo: 'Colores de las bolas', icono: '🎨', def: 'vivo', opciones: Object.entries(PALETAS).map(([id, t]) => ({ id, nombre: t.nombre, sw: t.sw })) },
    { clave: 'estilo', titulo: 'Estilo de las bolas', icono: '🔴', def: 'bola', opciones: Object.entries(ESTILOS).map(([id, t]) => ({ id, nombre: t.nombre, sw: t.sw })) },
  ], () => { if (S && $('#mmTab')) { if (modo3d !== quiere3D()) armar(); else if (V3) { V3.recolor(); pintar(); } else pintar(); } });
  await api.css(new URL('./mastermind.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && M.cfgOk(c0) && (c0.modo === 'adivinar' || c0.modo === 'codigo')) cfg = { modo: c0.modo, preset: typeof c0.preset === 'string' ? c0.preset : 'personal', pos: c0.pos, col: c0.col, rep: c0.rep, max: c0.max };
  S = api.cargar();
  root.addEventListener('click', clic);
  onKey = e => tecla(e); document.addEventListener('keydown', onKey);
  onRes = () => limitarPanel(); addEventListener('resize', onRes);
  api.barra({ nueva: () => jugar(),
    salir: () => { parar(); setup(); },
    crono: () => crono,
    config: { valores: () => ({ modo: cfg.modo, preset: cfg.preset, pos: cfg.pos, col: cfg.col, rep: cfg.rep, max: cfg.max }), grupos: v => [{ clave: 'modo', titulo: 'Modo', opciones: Object.entries(M.MODOS).map(([k, l]) => [k, (k === 'adivinar' ? '🔍 ' : '🔒 ') + l]) }, { clave: 'preset', titulo: 'Nivel', opciones: [...Object.entries(M.PRESETS).map(([k, p]) => [k, p.nombre]), ['personal', '⚙️ A tu gusto']] }, { clave: 'pos', titulo: 'Bolas', visible: v.preset === 'personal', opciones: M.POS.map(n => [n, String(n)]) }, { clave: 'col', titulo: 'Colores', visible: v.preset === 'personal', opciones: M.COLS.map(n => [n, String(n)]) }, { clave: 'rep', titulo: 'Repetir colores', visible: v.preset === 'personal', opciones: [[true, 'Sí'], [false, 'No']] }, { clave: 'max', titulo: 'Intentos', visible: v.preset === 'personal', opciones: M.MAXS.map(n => [n, String(n)]) }], alCambiar: (v, c) => { if (c === 'preset' && M.PRESETS[v.preset]) Object.assign(v, { pos: M.PRESETS[v.preset].pos, col: M.PRESETS[v.preset].col, rep: M.PRESETS[v.preset].rep, max: M.PRESETS[v.preset].max }); else if (c !== 'modo' && c !== 'preset' && !v.rep && v.col < v.pos) v.col = M.COLS.find(x => x >= v.pos) || 8; }, aplicar: v => { Object.assign(cfg, v); jugar(); } } });
  api.menu([{ texto: 'Nueva partida', accion: () => { parar(); setup(); } }, { texto: '⌫ Borrar', accion: borrar }, { texto: '💡 Pista', accion: pedirPista },
    { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  if (S && !S.done) armar(); else setup();
}
export function unmount() {
  cerrar3D(); modo3d = false; serie++; parar(); quitarPanel(); if (onRes) removeEventListener('resize', onRes); onRes = null; if (onKey) document.removeEventListener('keydown', onKey); onKey = null;
  if (root) root.removeEventListener('click', clic); S = null; asp = null;
}
function parar() { if (crono) { crono.detener(); crono = null; } clearTimeout(tIA); tIA = 0; }
function guardar() { if (!S) return; const r = resumen(S); api.guardar(S, r.texto, S.done); }

/* ---------- pantalla de inicio ---------- */
function setup() {
  cerrar3D(); modo3d = false; sel = -1; parar(); quitarPanel();
  const seg = (k, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${String(cfg[k]) === String(v) ? 'on' : ''}" data-cfg="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const rec = api.pref('mejores', {})[claveRec(cfg)];
  root.innerHTML = `<p class="note">${cfg.modo === 'adivinar'
    ? 'La máquina esconde un <b>código de colores</b>. Prueba combinaciones: cada <b>clavija negra</b> es un color bien colocado y cada <b>blanca</b>, un color que está pero en otro sitio.'
    : 'Esconde tú un código y mira cómo la máquina intenta descifrarlo con las mismas pistas. ¿Conseguirás despistarla?'}</p>
    <div class="bar"><span class="lbl">Modo</span>${seg('modo', Object.entries(M.MODOS).map(([k, v]) => [k, (k === 'adivinar' ? '🔍 ' : '🔒 ') + v]))}</div>
    <div class="bar"><span class="lbl">Nivel</span>${seg('preset', [...Object.entries(M.PRESETS).map(([k, v]) => [k, v.nombre]), ['personal', '⚙️ A tu gusto']])}</div>
    ${cfg.preset === 'personal' ? `<div class="bar"><span class="lbl">Bolas</span>${seg('pos', M.POS.map(n => [n, n]))}</div>
    <div class="bar"><span class="lbl">Colores</span>${seg('col', M.COLS.map(n => [n, n]))}</div>
    <div class="bar"><span class="lbl">Repetir</span>${seg('rep', [[true, 'Sí'], [false, 'No']])}</div>
    <div class="bar"><span class="lbl">Intentos</span>${seg('max', M.MAXS.map(n => [n, n]))}</div>` : `<p class="note">${cfg.pos} bolas · ${cfg.col} colores · ${cfg.rep ? 'se pueden repetir' : 'sin repetir colores'} · ${cfg.max} intentos</p>`}
    ${cfg.modo === 'adivinar' && rec ? `<p class="note">🏆 Tu mejor marca aquí: <b>${rec.n}</b> ${rec.n === 1 ? 'intento' : 'intentos'} · ${fmt(rec.t)}</p>` : ''}
    <div class="bar"><button class="btn on" data-ac="jugar">▶️ Jugar</button>${S && !S.done ? '<button class="btn" data-ac="volver">Volver a la partida</button>' : ''}<button class="btn" data-ac="aspecto">🎨 Apariencia</button></div>`;
}
function jugar() {
  api.setPref('cfg', cfg);
  S = M.nueva(cfg.modo, cfg); sel = -1; pop = -1; armar(); guardar();
}

/* ---------- tablero ---------- */
function armar() {
  cerrar3D(); modo3d = quiere3D(); parar();
  root.innerHTML = `<div class="mmcab"><b id="mmTit">${esc(M.MODOS[S.modo])}</b><span id="mmInfo"></span></div>
    <div id="mmTab" ${modo3d ? 'class="e3d mm3"' : 'class="mmtab"'} style="--p:${S.pos}" role="application" aria-label="Tablero de Mastermind"></div>
    <p class="mmmsg" id="mmMsg" role="status" aria-live="polite"></p>
${api.barraHtml()}`;
  crearPanel();
  if (modo3d) iniciar3D();
  if (S.modo === 'adivinar' && !S.done) { crono = new Cronometro(s => { S.t = s; info(); }, S.t); crono.iniciar(); }
  if (S.modo === 'codigo' && S.sec && !S.done) programarIA(700);
  pintar();
}
function info() { const e = $('#mmInfo'); if (!e || !S) return; e.textContent = S.sec === null ? 'Elige tu código' : S.done ? `${S.jug.length} ${S.jug.length === 1 ? 'intento' : 'intentos'}` : `Intento ${S.jug.length + 1}/${S.max}${S.modo === 'adivinar' ? ' · ' + fmt(S.t) : ''}`; }
const bolaHtml = (c, extra = '', tag = 'span') => `<${tag} class="mmb ${c < 0 ? 'vacio' : ''} ${extra}" ${c >= 0 ? `data-c="${c}" data-s="${SIMB[c]}"` : ''}></${tag}>`;

function pintar2D() {
  const tab = $('#mmTab'); if (!tab) return;
  const editable = !S.done && ((S.modo === 'adivinar' && S.sec) || (S.modo === 'codigo' && S.sec === null));
  const fc = Math.ceil(S.pos / 2);
  const slot = (c, i, ed) => ed ? `<button type="button" class="mmb ${c < 0 ? 'vacio' : ''} ${i === sel ? 'sel' : ''} ${i === pop ? 'pop' : ''}" ${c >= 0 ? `data-c="${c}" data-s="${SIMB[c]}"` : ''} data-slot="${i}" aria-label="Posición ${i + 1}${c >= 0 ? ', color ' + (c + 1) : ', vacía'}"></button>` : bolaHtml(c);
  const mostrar = S.sec && (S.done || S.modo === 'codigo');
  const cod = S.sec === null ? S.cur : mostrar ? S.sec : Array(S.pos).fill(-1);
  let h = `<div class="mmmarco"><div class="mmsec" aria-label="Código secreto">${cod.map((c, i) => slot(c, i, S.sec === null && editable)).join('')}${S.sec && !mostrar ? '<div class="mmtapa" aria-hidden="true">?</div>' : ''}</div>`;
  for (let r = 0; r < S.max; r++) {
    const g = S.jug[r], f = S.fb[r], act = editable && S.modo === 'adivinar' && r === S.jug.length;
    const fila = g || (act ? S.cur : Array(S.pos).fill(-1));
    h += `<div class="mmfila ${act ? 'act' : ''}"><span class="mmn">${r + 1}</span><div class="mmslots">${fila.map((c, i) => slot(c, i, act)).join('')}</div><div class="mmfb" style="--fc:${fc}" ${f ? `aria-label="${f[0]} negras, ${f[1]} blancas"` : ''}>${Array.from({ length: S.pos }, (_, k) => `<i class="mmk ${f && k < f[0] ? 'n' : f && k < f[0] + f[1] ? 'b' : ''}"></i>`).join('')}</div></div>`;
  }
  tab.innerHTML = h + '</div>'; pop = -1;
}
function pintar() {
  if (!S) return; info();
  if (modo3d) { if (V3) V3.pintar({ S, sel }); } else pintar2D();
  document.querySelectorAll('#mmPal .mmb').forEach(b => b.classList.toggle('usado', !S.rep && S.cur.includes(+b.dataset.col)));
  const ok = $('#mmOk'), pbtn = $('#mmPista');
  if (ok) { ok.hidden = S.done || (S.modo === 'codigo' && !!S.sec); ok.textContent = S.modo === 'codigo' && S.sec === null ? '🔒 Fijar código' : '✔ Comprobar'; ok.disabled = !M.llena(S); }
  if (pbtn) pbtn.hidden = S.modo !== 'adivinar' || S.done;
  if (panel) { panel.hidden = S.done || (S.modo === 'codigo' && !!S.sec); sincronizarPanel(); limitarPanel(); }
  const m = $('#mmMsg'); if (!m) return;
  if (S.done) {
    const sec = '';
    m.innerHTML = S.modo === 'adivinar' ? (S.gano ? `🎉 <b>¡Descifrado!</b> en ${S.jug.length} ${S.jug.length === 1 ? 'intento' : 'intentos'} · ${fmt(S.t)}` : '💔 <b>Se acabaron los intentos.</b> Ese era el código (arriba).')
      : (S.gano ? `🤖 La máquina descifró tu código en <b>${S.jug.length}</b> ${S.jug.length === 1 ? 'intento' : 'intentos'}.` : `🏆 <b>¡Le has ganado!</b> La máquina no encontró tu código en ${S.max} intentos.`) + sec;
  } else if (S.modo === 'codigo') m.textContent = S.sec ? '🤖 La máquina está pensando…' : (S.rep ? 'Elige los colores de tu código secreto y pulsa «Fijar código».' : 'Elige tu código (sin repetir colores) y pulsa «Fijar código».');
  else m.textContent = S.jug.length ? 'Toca los colores de abajo para rellenar la fila. ⚫ color y sitio · ⚪ color en otro sitio.' : 'Toca los colores de abajo para formar tu primer intento.';
}

/* ----- vista 3D ----- */
function cerrar3D() { tok3++; if (V3) { V3.destruir(); V3 = null; } }
async function iniciar3D() {
  const t = ++tok3, host = $('#mmTab'); if (!host || !S) return;
  try {
    const b3 = await import('../../core/escena3d.js'), { crearMastermind3D } = await import('./vista3d.js'); if (t !== tok3 || !root) return;
    const v = crearMastermind3D(host, { pos: S.pos, col: S.col, max: S.max }); b3.botonesCamara(host, v.E);
    v.alColor = poner; v.alSlot = tocarSlot; V3 = v; v.recolor(); pintar();
  } catch (e) { console.error(e); if (t === tok3 && root && S) { forzar2d = true; armar(); } }
}

/* ---------- jugadas ---------- */
const editando = () => S && !S.done && ((S.modo === 'adivinar' && S.sec) || (S.modo === 'codigo' && S.sec === null));
function poner(c) {
  if (!editando()) return;
  const vacio = S.cur.indexOf(-1), i = sel >= 0 ? sel : vacio; if (i < 0) { api.sonido('error'); return; }
  if (!S.rep && S.cur.some((x, k) => x === c && k !== i)) { api.sonido('error'); api.aviso('En este nivel no se pueden repetir colores'); return; }
  S.cur[i] = c; pop = i; sel = S.cur.indexOf(-1); api.sonido('click'); api.vibrar(6); pintar(); guardar();
}
function tocarSlot(i) {
  if (!editando()) return;
  if (S.cur[i] >= 0) { S.cur[i] = -1; sel = i; api.sonido('click'); } else sel = sel === i ? -1 : i;
  pintar();
}
function borrar() {
  if (!editando()) return;
  let i = sel >= 0 && S.cur[sel] >= 0 ? sel : -1; if (i < 0) for (let k = S.pos - 1; k >= 0; k--) if (S.cur[k] >= 0) { i = k; break; }
  if (i < 0) { api.sonido('error'); return; } S.cur[i] = -1; sel = i; api.sonido('click'); pintar(); guardar();
}
function comprobar() {
  if (!editando()) return;
  if (!M.llena(S)) { api.sonido('error'); api.aviso('Rellena todas las bolas'); return; }
  if (S.sec === null) {                                        // modo «codigo»: fija el secreto y empieza la máquina
    S.sec = S.cur.slice(); S.cur = Array(S.pos).fill(-1); sel = -1; api.sonido('ok'); pintar(); guardar(); programarIA(900); return;
  }
  const f = M.intentar(S); if (!f) { api.sonido('error'); return; }
  sel = -1; api.sonido(f[0] === S.pos ? 'ok' : 'mover'); api.vibrar(10);
  if (S.done) fin(); else { pintar(); guardar(); }
}
function programarIA(ms) {
  clearTimeout(tIA); const tok = serie;
  tIA = setTimeout(() => {
    if (!S || tok !== serie || S.done || !S.sec) return;
    const g = M.jugadaIA(S, 'ia' + S.jug.length + ':' + S.sec.join('')); if (!g || !M.intentar(S, g)) { S.done = true; S.gano = false; }
    api.sonido('mover'); if (S.done) fin(); else { pintar(); guardar(); programarIA(850); }
  }, ms);
}
async function pedirPista() {
  if (!S || S.done || S.modo !== 'adivinar') return;
  const p = M.pista(S, Math.random()); if (!p) { api.aviso('No encuentro ninguna combinación posible… revisa las pistas'); return; }
  S.cur = p.cod.slice(); sel = -1; S.pistas++; api.sonido('ok'); pintar(); guardar();
  const m = $('#mmMsg'); if (m) { m.innerHTML = `💡 Quedan <b>${p.n}</b> ${p.n === 1 ? 'combinación posible' : 'combinaciones posibles'}. He puesto una jugada que encaja con todas las pistas.`; }
}
function fin() {
  parar(); sel = -1;
  if (S.modo === 'adivinar') {
    const Mj = api.pref('mejores', {}), k = claveRec(S); let record = false;
    if (S.gano && (!Mj[k] || S.jug.length < Mj[k].n || (S.jug.length === Mj[k].n && S.t < Mj[k].t))) { Mj[k] = { n: S.jug.length, t: S.t }; api.setPref('mejores', Mj); record = true; }
    api.registrar({ res: S.gano ? 'victoria' : 'derrota', variante: nombreVar(S), tiempo: S.gano ? S.t : undefined, limpio: S.gano && !S.pistas });
    api.sonido(S.gano ? 'ganar' : 'perder'); if (S.gano) api.vibrar([60, 40, 60]); pintar(); guardar();
    if (S.gano) setTimeout(() => { if (S && S.done) api.aviso(`🎉 ¡Descifrado en ${S.jug.length} ${S.jug.length === 1 ? 'intento' : 'intentos'}!${record ? ' · 🏆 ¡Nuevo récord!' : ''}`); }, 300);
  } else { api.sonido(S.gano ? 'perder' : 'ganar'); pintar(); guardar(); }
}

/* ---------- panel flotante de colores (arrastrable, como el de Billar) ---------- */
function crearPanel() {
  quitarPanel();
  panel = document.createElement('div'); panel.className = 'mmpanel juego-mastermind'; panel.setAttribute('role', 'group'); panel.setAttribute('aria-label', 'Colores y acciones');
  panel.innerHTML = `<div class="mmasa" title="Arrastra para mover el panel"><span aria-hidden="true"></span><small>Mover</small></div>
    <div class="mmpal" id="mmPal">${Array.from({ length: S.col }, (_, c) => `<button type="button" class="mmb" data-c="${c}" data-s="${SIMB[c]}" data-col="${c}" aria-label="Color ${c + 1}"></button>`).join('')}</div>
    <div class="bar mmbar"><button class="btn on" data-ac="comprobar" id="mmOk">✔ Comprobar</button><button class="btn" data-ac="borrar">⌫ Borrar</button><button class="btn" data-ac="pista" id="mmPista">💡 Pista</button></div>`;
  document.body.append(panel); panel.addEventListener('click', clic);
  const asa = panel.querySelector('.mmasa');
  asa.addEventListener('pointerdown', e => {
    if (e.button > 0) return; e.preventDefault();
    const r = panel.getBoundingClientRect(); arrP = { dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId };
    try { asa.setPointerCapture(e.pointerId); } catch { /* */ }
    panel.classList.add('mov');
  });
  asa.addEventListener('pointermove', e => { if (!arrP || e.pointerId !== arrP.id) return; posPanel = { x: e.clientX - arrP.dx, y: e.clientY - arrP.dy }; limitarPanel(); });
  const suelta = e => { if (!arrP || e.pointerId !== arrP.id) return; arrP = null; panel.classList.remove('mov'); api.setPref('panel', posPanel); };
  asa.addEventListener('pointerup', suelta); asa.addEventListener('pointercancel', suelta);
  const p = api.pref('panel', null); posPanel = p && Number.isFinite(p.x) && Number.isFinite(p.y) ? { ...p } : null;
  sincronizarPanel(); limitarPanel();
}
// El panel vive en <body>: copia la Apariencia elegida (paleta, estilo…) para que sus bolas se vean igual que las del tablero
function sincronizarPanel() { if (!panel || !root) for (const k of Object.keys(panel.dataset)) delete panel.dataset[k]; if (panel && root) Object.assign(panel.dataset, root.dataset); }
function limitarPanel() {
  if (!panel || panel.hidden) return;
  const w = panel.offsetWidth, h = panel.offsetHeight, vw = document.documentElement.clientWidth || innerWidth, vh = innerHeight, mg = 6;
  if (!posPanel) posPanel = { x: (vw - w) / 2, y: vh - h - 14 };                 // al principio: abajo y centrado
  const x = Math.min(Math.max(mg, posPanel.x), Math.max(mg, vw - w - mg)), y = Math.min(Math.max(mg, posPanel.y), Math.max(mg, vh - h - mg));
  panel.style.left = x + 'px'; panel.style.top = y + 'px';
}
function quitarPanel() { if (panel) { panel.remove(); panel = null; } arrP = null; }

/* ---------- entrada ---------- */
function tecla(e) {
  if (!S || !editando() || !$('#mmTab') || e.target.closest('input,textarea,select') || document.querySelector('.modal')) return;
  if (/^[1-8]$/.test(e.key)) { if (+e.key <= S.col) { e.preventDefault(); poner(+e.key - 1); } }
  else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); borrar(); }
  else if (e.key === 'Enter') { e.preventDefault(); comprobar(); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); const d = e.key === 'ArrowLeft' ? -1 : 1; sel = ((sel < 0 ? (d > 0 ? -1 : 0) : sel) + d + S.pos) % S.pos; pintar(); }
}
function clic(e) {
  const sl = e.target.closest('[data-slot]'); if (sl) return tocarSlot(+sl.dataset.slot);
  const pc = e.target.closest('[data-col]'); if (pc) return poner(+pc.dataset.col);
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.cfg) {
    const v = d.v === 'true' ? true : d.v === 'false' ? false : /^\d+$/.test(d.v) ? +d.v : d.v;
    if (d.cfg === 'modo') cfg.modo = v;
    else if (d.cfg === 'preset') { cfg.preset = v; if (M.PRESETS[v]) Object.assign(cfg, { pos: M.PRESETS[v].pos, col: M.PRESETS[v].col, rep: M.PRESETS[v].rep, max: M.PRESETS[v].max }); }
    else { cfg[d.cfg] = v; if (!cfg.rep && cfg.col < cfg.pos) cfg.col = M.COLS.find(c => c >= cfg.pos) || 8; }
    return setup();
  }
  const a = d.ac;
  if (a === 'jugar') { if (S && !S.done && (S.jug.length || S.sec) && !api.confirmar('¿Empezar una partida nueva y abandonar la actual?')) return; jugar(); }
  else if (a === 'volver') armar();
  else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas();
  else if (a === 'comprobar') comprobar(); else if (a === 'borrar') borrar(); else if (a === 'pista') pedirPista();
  else if (a === 'nueva') { if (S && !S.done && S.jug.length && !api.confirmar('¿Abandonar esta partida?')) return; parar(); setup(); }
}
function reglas() {
  api.modal('Mastermind', `<ul><li>Hay un <b>código secreto</b> de 3 a 6 bolas de colores. En <b>🔍 Tú adivinas</b> lo esconde la máquina y tienes un número limitado de intentos para descubrirlo.</li>
    <li>Rellena una fila con los colores (toca un color; toca una bola de la fila para borrarla o para elegir su sitio) y pulsa <b>✔ Comprobar</b>.</li>
    <li>Cada <b>clavija negra</b> ⚫ = una bola con el color <i>y</i> el sitio correctos. Cada <b>blanca</b> ⚪ = un color que está en el código pero en otro sitio. Las clavijas no dicen cuál es cuál.</li>
    <li>Niveles: <b>Fácil</b> (4 bolas, 5 colores, sin repetir), <b>Clásico</b> (4 bolas, 6 colores), <b>Súper</b> (5 bolas, 8 colores), <b>Experto</b> (6 bolas, 8 colores) o <b>A tu gusto</b>.</li>
    <li><b>🔒 Tú pones el código</b>: escondes tú uno y la máquina intenta descifrarlo (sin estadísticas). Si no lo consigue en los intentos disponibles, ganas tú.</li>
    <li>💡 <b>Pista</b>: te dice cuántas combinaciones siguen siendo posibles y rellena una que encaja con todo lo que sabes. Teclado: 1–8 colores, ← → posición, Retroceso borra, Intro comprueba.</li>
    <li>Con 🎨 Apariencia cambias tablero, colores, estilo de las bolas (hay uno con símbolos para daltonismo), fondo y vista 2D/3D.</li></ul>`);
}
