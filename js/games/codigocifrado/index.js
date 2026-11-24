// Código Cifrado: descubre el código de colores con las pistas (negras y blancas), o pon tú el código y mira cómo lo descifra la máquina.
// Vista 2D (HTML) o 3D (Three.js). Reglas y lógica en motor.js.
import { pieMenu } from '../../core/pie.js';
import { $, esc } from '../../core/dom.js';
import { Cronometro } from '../../core/cronometro.js';
import { grupoTableroDN } from '../../core/aspectos.js';
import * as M from './motor.js';

const SIMB = ['●', '▲', '■', '◆', '★', '♥', '☘', '☾'];
let roPanel = null, S = null, api = null, asp = null, root = null, crono = null, serie = 0, sel = -1, onKey = null, V3 = null, hay3d = false, modo3d = false, forzar2d = false, tok3 = 0, tIA = 0, pop = -1;
let panel = null, posPanel = null, arrP = null, onRes = null;
let cfg = { modo: 'adivinar', rival: 'uno', preset: 'medio', ...M.PRESETS.medio };
// Etiquetas de dos renglones (todas las opciones del mismo tamaño)
const LRIVAL = { uno: 'Un\njugador', cpu: 'Contra\nla CPU', dos: 'Dos\npersonas' };
const nomJ = (i, rival) => (rival === 'cpu' ? (i === 0 ? 'Tú' : 'La CPU') : `El jugador ${i + 1}`);
const R = () => M.roles(S);
const quiere3D = () => hay3d && !forzar2d && !!asp && (asp.valores.vista || '2d') === '3d';
const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const nombreVar = d => { const p = Object.values(M.PRESETS).find(x => x.pos === d.pos && x.col === d.col && x.max === d.max); return `${p ? p.nombre : 'Personalizado'} · ${d.pos} bolas, ${d.col} colores${d.rep ? '' : ', sin repetir'}`; };
const claveRec = d => `${d.pos}-${d.col}-${d.rep ? 1 : 0}-${d.max}`;

/* ---------- validación / resumen ---------- */
export const validar = M.validar;
export const migrarV1 = d => d;
export function resumen(d) {
  const rv = d.rival && d.rival !== 'uno' ? ` · ${M.RIVALES[d.rival]}` : '', ro = M.rondas(d) > 1 ? ` · ronda ${d.ronda}/2` : '';
  const t = d.modo === 'codigo' && d.rival === 'uno' ? (d.sec ? (d.done ? `la máquina lo descifra en ${d.jug.length}` : `la máquina va por el intento ${d.jug.length + 1}`) : 'poniendo el código')
    : d.rival !== 'uno' && d.modo === 'adivinar' ? (d.done ? (d.gano ? `${nomJ(M.ganadorDuelo(d), d.rival).toLowerCase()} lo descifra` : 'nadie lo descifra') : `fila ${d.jug.length + 1} de ${M.filas(d)}`)
    : d.modo === 'codigo' ? (d.done ? (d.gano ? `descifrado en ${d.jug.length}` : 'sin descifrar') : `intento ${d.jug.length + 1} de ${d.max}`)
    : (d.done ? (d.gano ? `descifrado en ${d.jug.length} ${d.jug.length === 1 ? 'intento' : 'intentos'}` : 'sin descifrar') : `intento ${d.jug.length + 1} de ${d.max}`);
  return { texto: `${M.MODOS[d.modo]}${rv}${ro} · ${d.pos} bolas, ${d.col} colores · ${t}`, fin: d.done && (M.rondas(d) === 1 || d.ronda === 2) };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; forzar2d = false; modo3d = false; sel = -1; pop = -1; serie++;
  hay3d = false;   // sin vista 3D
  asp = api.aspecto([
    ...(hay3d ? [{ clave: 'vista', titulo: 'Vista del tablero', icono: '🧊', def: '2d', opciones: [{ id: '3d', nombre: '🧊 3D' }, { id: '2d', nombre: '🔲 2D clásica' }] }] : []),
    grupoTableroDN(),
  ], () => { if (S && $('#mmTab')) { if (modo3d !== quiere3D()) armar(); else if (V3) { V3.recolor(); pintar(); } else pintar(); } });
  await api.css(new URL('./codigocifrado.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && M.cfgOk(c0) && (c0.modo === 'adivinar' || c0.modo === 'codigo')) cfg = { modo: c0.modo, rival: Object.hasOwn(M.RIVALES, c0.rival) ? c0.rival : 'uno', preset: typeof c0.preset === 'string' ? ({ clasico: 'medio', super: 'dificil' }[c0.preset] || c0.preset) : 'personal', pos: c0.pos, col: c0.col, rep: c0.rep, max: c0.max };
  if (M.PRESETS[cfg.preset]) cfg.rep = M.PRESETS[cfg.preset].rep;                      // «Repetir colores» vuelve a «No» por defecto en todos los niveles
  S = api.cargar();
  root.addEventListener('click', clic);
  onKey = e => tecla(e); document.addEventListener('keydown', onKey);
  onRes = () => limitarPanel(); addEventListener('resize', onRes);
  api.barra({ nueva: () => jugar(),
    salir: () => { parar(); location.hash = '#/cat/logica'; },
    crono: () => crono,
    config: { valores: () => ({ modo: cfg.modo, rival: cfg.rival, preset: cfg.preset, pos: cfg.pos, col: cfg.col, rep: cfg.rep, max: cfg.max }), grupos: v => [{ clave: 'modo', titulo: 'Modo', opciones: Object.entries(M.MODOS).map(([k, l]) => [k, l]) }, { clave: 'rival', titulo: 'Jugadores', opciones: Object.keys(M.RIVALES).map(k => [k, LRIVAL[k]]) }, { clave: 'preset', titulo: 'Nivel', opciones: [...Object.entries(M.PRESETS).map(([k, p]) => [k, p.nombre]), ['personal', 'Personal']] }, { clave: 'pos', titulo: 'Bolas', visible: v.preset === 'personal', opciones: M.POS.map(n => [n, String(n)]) }, { clave: 'col', titulo: 'Colores', visible: v.preset === 'personal', opciones: M.COLS.map(n => [n, String(n)]) }, { clave: 'rep', titulo: 'Repetir colores', opciones: [[true, 'Sí'], [false, 'No']] }, { clave: 'max', titulo: 'Intentos', visible: v.preset === 'personal', opciones: M.MAXS.map(n => [n, String(n)]) }], alCambiar: (v, c) => { if (c === 'preset' && M.PRESETS[v.preset]) Object.assign(v, { pos: M.PRESETS[v.preset].pos, col: M.PRESETS[v.preset].col, rep: M.PRESETS[v.preset].rep, max: M.PRESETS[v.preset].max }); else if (c !== 'modo' && c !== 'rival' && c !== 'preset' && !v.rep && v.col < v.pos) v.col = M.COLS.find(x => x >= v.pos) || 8; }, aplicar: v => { Object.assign(cfg, v); jugar(); } } });
  api.menu([{ texto: 'Nueva partida', accion: () => { parar(); setup(); } }, { texto: '⌫ Borrar', accion: borrar }, { texto: '💡 Pista', accion: pedirPista },
    { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: '📖 Reglas', accion: reglas }]);
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
  const rec = api.pref('mejores', {})[claveRec(cfg)], solo = cfg.rival === 'uno';
  const nota = cfg.modo === 'adivinar'
    ? (solo ? 'La máquina esconde un <b>código de colores</b>. Prueba combinaciones: cada <b>clavija negra</b> es un color bien colocado y cada <b>blanca</b>, un color que está pero en otro sitio.'
      : `La máquina esconde un código y ${cfg.rival === 'cpu' ? 'tú y la <b>CPU</b>' : 'los <b>dos jugadores</b>'} lo buscáis <b>por turnos</b> en el mismo tablero: gana quien lo descifre. Cada uno tiene sus intentos.`)
    : (solo ? 'Esconde tú un código y mira cómo la máquina intenta descifrarlo con las mismas pistas. ¿Conseguirás despistarla?'
      : `Dos rondas: en la primera ${cfg.rival === 'cpu' ? 'tú escondes un código y la <b>CPU</b> lo adivina' : 'el <b>jugador 1</b> esconde un código y el <b>2</b> lo adivina'}; en la segunda se cambian los papeles. Gana quien use <b>menos intentos</b>.`);
  root.innerHTML = `<p class="note">${nota}</p>
    <div class="cfg-g"><span class="lbl">Modo</span>${seg('modo', Object.entries(M.MODOS).map(([k, v]) => [k, v]))}</div>
    <div class="cfg-g"><span class="lbl">Jugadores</span>${seg('rival', Object.keys(M.RIVALES).map(k => [k, LRIVAL[k]]))}</div>
    <div class="cfg-g"><span class="lbl">Nivel</span>${seg('preset', [...Object.entries(M.PRESETS).map(([k, v]) => [k, v.nombre]), ['personal', 'Personal']])}</div>
    ${cfg.preset === 'personal' ? `<div class="cfg-g"><span class="lbl">Bolas</span>${seg('pos', M.POS.map(n => [n, n]))}</div>
    <div class="cfg-g"><span class="lbl">Colores</span>${seg('col', M.COLS.map(n => [n, n]))}</div>` : ''}
    <div class="cfg-g"><span class="lbl">Repetir colores</span>${seg('rep', [[true, 'Sí'], [false, 'No']])}</div>
    ${cfg.preset === 'personal' ? `<div class="cfg-g"><span class="lbl">Intentos</span>${seg('max', M.MAXS.map(n => [n, n]))}</div>` : `<p class="note">${cfg.pos} bolas · ${cfg.col} colores · ${cfg.max} intentos</p>`}
    ${cfg.modo === 'adivinar' && solo && rec ? `<p class="note">🏆 Tu mejor marca aquí: <b>${rec.n}</b> ${rec.n === 1 ? 'intento' : 'intentos'} · ${fmt(rec.t)}</p>` : ''}
    ${pieMenu({ ac: 'jugar', seguir: S && !S.done ? 'volver' : null })}`;
}
function jugar() {
  api.setPref('cfg', cfg);
  S = M.nueva(cfg.modo, cfg); sel = -1; pop = -1; armar(); guardar();
}

/* ---------- tablero ---------- */
function armar() {
  cerrar3D(); modo3d = quiere3D(); parar();
  root.innerHTML = `<div class="mmcab"><b id="mmTit">${esc(M.MODOS[S.modo])}${S.rival !== 'uno' ? ' · ' + esc(M.RIVALES[S.rival]) : ''}</b><span id="mmInfo"></span></div>
    <div id="mmTab" ${modo3d ? 'class="e3d mm3"' : 'class="mmtab"'} style="--p:${S.pos}" role="application" aria-label="Tablero de Código Cifrado"></div>
    <p class="mmmsg" id="mmMsg" role="status" aria-live="polite"></p>
${api.barraHtml()}<div id="mmEsp" aria-hidden="true"></div>`;   // #mmEsp: hueco al final de la página del alto del panel flotante, para que al hacer scroll no tape el menú
  crearPanel();
  if (modo3d) iniciar3D();
  if (S.modo === 'adivinar' && S.rival === 'uno' && !S.done) { crono = new Cronometro(s => { S.t = s; info(); }, S.t); crono.iniciar(); }
  if (M.actor(S) === 'cpu') programarIA(700);
  pintar();
}
function info() {
  const e = $('#mmInfo'); if (!e || !S) return; const ro = M.rondas(S) > 1 ? `Ronda ${S.ronda}/2 · ` : '', duelo = R().adiv === 'duelo';
  e.textContent = S.sec === null ? ro + 'Elige el código' : S.done ? `${ro}${S.jug.length} ${S.jug.length === 1 ? 'intento' : 'intentos'}` : duelo ? `Fila ${S.jug.length + 1}/${M.filas(S)}` : `${ro}Intento ${S.jug.length + 1}/${S.max}${S.modo === 'adivinar' && S.rival === 'uno' ? ' · ' + fmt(S.t) : ''}`;
}
const bolaHtml = (c, extra = '', tag = 'span') => `<${tag} class="mmb ${c < 0 ? 'vacio' : ''} ${extra}" ${c >= 0 ? `data-c="${c}" data-s="${SIMB[c]}"` : ''}></${tag}>`;

function pintar2D() {
  const tab = $('#mmTab'); if (!tab) return;
  const ac = M.actor(S), oculta = ac === 'oculta', adivina = ac === 'adivina', rl = R(), duelo = rl.adiv === 'duelo', tags = S.rival === 'cpu' ? ['Tú', 'CPU'] : ['J1', 'J2'];
  const fc = Math.ceil(S.pos / 2);
  const slot = (c, i, ed) => ed ? `<button type="button" class="mmb ${c < 0 ? 'vacio' : ''} ${i === sel ? 'sel' : ''} ${i === pop ? 'pop' : ''}" ${c >= 0 ? `data-c="${c}" data-s="${SIMB[c]}"` : ''} data-slot="${i}" aria-label="Posición ${i + 1}${c >= 0 ? ', color ' + (c + 1) : ', vacía'}"></button>` : bolaHtml(c);
  const mostrar = S.sec && (S.done || (rl.ocul === 'hum' && rl.adiv === 'cpu'));
  const cod = S.sec === null ? S.cur : mostrar ? S.sec : Array(S.pos).fill(-1);
  let h = `<div class="mmmarco"><div class="mmsec" aria-label="Código secreto">${cod.map((c, i) => slot(c, i, oculta)).join('')}${S.sec && !mostrar ? '<div class="mmtapa" aria-hidden="true">?</div>' : ''}</div>`;
  for (let r = 0; r < S.max; r++) {
    const g = S.jug[r], f = S.fb[r], act = adivina && r === S.jug.length, q = duelo ? (r + S.ini) % 2 : -1;
    const fila = g || (act ? S.cur : Array(S.pos).fill(-1));
    h += `<div class="mmfila ${act ? 'act' : ''}"><span class="mmn${q >= 0 ? ' q' + q : ''}">${r + 1}${q >= 0 ? `<small>${tags[q]}</small>` : ''}</span><div class="mmslots">${fila.map((c, i) => slot(c, i, act)).join('')}</div><div class="mmfb" style="--fc:${fc}" ${f ? `aria-label="${f[0]} negras, ${f[1]} blancas"` : ''}>${Array.from({ length: S.pos }, (_, k) => `<i class="mmk ${f && k < f[0] ? 'n' : f && k < f[0] + f[1] ? 'b' : ''}"></i>`).join('')}</div></div>`;
  }
  tab.innerHTML = h + '</div>'; pop = -1;
}
function pintar() {
  if (!S) return; info();
  if (modo3d) { if (V3) V3.pintar({ S, sel }); } else pintar2D();
  document.querySelectorAll('#mmPal .mmb').forEach(b => b.classList.toggle('usado', !S.rep && S.cur.includes(+b.dataset.col)));
  const ok = $('#mmOk'), pbtn = $('#mmPista');
  const ac = M.actor(S), humano = ac === 'oculta' || ac === 'adivina';
  if (ok) { ok.hidden = !humano; ok.textContent = ac === 'oculta' ? '🔒 Fijar código' : '✔ Comprobar'; ok.disabled = !M.llena(S); }
  if (pbtn) pbtn.hidden = !(S.modo === 'adivinar' && S.rival === 'uno') || S.done;
  if (panel) { panel.hidden = !humano; sincronizarPanel(); limitarPanel(); }
  const m = $('#mmMsg'); if (!m) return;
  m.innerHTML = mensaje(ac);
}
function mensaje(ac) {
  const rl = R(), dos = S.rival === 'dos', cpu = S.rival === 'cpu', n = S.jug.length, pl = k => `${k} ${k === 1 ? 'intento' : 'intentos'}`;
  if (S.done) {
    if (S.rival === 'uno') {
      if (S.modo === 'adivinar') return S.gano ? `🎉 <b>¡Descifrado!</b> en ${pl(n)} · ${fmt(S.t)}` : '💔 <b>Se acabaron los intentos.</b> Ese era el código (arriba).';
      return S.gano ? `🤖 La máquina descifró tu código en <b>${pl(n)}</b>.` : `🏆 <b>¡Le has ganado!</b> La máquina no encontró tu código en ${S.max} intentos.`;
    }
    if (S.modo === 'adivinar') {
      const g = M.ganadorDuelo(S); if (g < 0) return '💔 <b>Nadie lo ha descifrado.</b> Ese era el código (arriba).';
      let k = 0; for (let r = 0; r < n; r++) if ((r + S.ini) % 2 === g) k++;
      return `🏆 <b>${nomJ(g, S.rival)}</b> ${g === 0 && cpu ? 'has descifrado' : 'ha descifrado'} el código en <b>${pl(k)}</b>.`;
    }
    const q1 = nomJ(1, S.rival), q0 = nomJ(0, S.rival);
    if (S.ronda === 1) return `Ronda 1: ${cpu ? 'la CPU' : 'el jugador 2'} ${S.gano ? `descifró el código en <b>${pl(n)}</b>` : '<b>no</b> lo descifró'}.<br><button type="button" class="btn on" data-ac="ronda">Ronda 2 ▶</button>`;
    const r = M.resultado2(S), cnt = (g, k) => (g ? pl(k) : 'sin descifrar');
    return `${r.ganador === 0 ? '🏆 <b>' + (cpu ? '¡Has ganado!' : '¡Gana el jugador 1!') + '</b>' : r.ganador === 1 ? '🏆 <b>' + (cpu ? 'Gana la CPU' : '¡Gana el jugador 2!') + '</b>' : '🤝 <b>¡Empate!</b>'}<br><small>${q0}: ${cnt(r.g0, r.n0)} · ${q1}: ${cnt(r.g1, r.n1)}</small>`;
  }
  if (ac === 'oculta') return dos ? `Jugador ${S.ronda === 1 ? 1 : 2}: esconde tu código (que no mire el otro) y pulsa «Fijar código».` : (S.rep ? 'Elige los colores de tu código secreto y pulsa «Fijar código».' : 'Elige tu código (sin repetir colores) y pulsa «Fijar código».');
  if (ac === 'cpu') return '🤖 La máquina está pensando…';
  if (rl.adiv === 'duelo') return dos ? `Turno del <b>jugador ${M.turnoDe(S) + 1}</b>. Toca los colores para formar tu intento.` : '<b>Tu turno</b>. Toca los colores para formar tu intento (la CPU juega después).';
  if (S.modo === 'codigo') return dos ? `Jugador ${S.ronda === 1 ? 2 : 1}: ¡descifra el código del jugador ${S.ronda === 1 ? 1 : 2}!` : 'Ronda 2: la CPU ha escondido un código. ¡Descífralo!';
  return n ? 'Toca los colores de abajo para rellenar la fila. ⚫ color y sitio · ⚪ color en otro sitio.' : 'Toca los colores de abajo para formar tu primer intento.';
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
const editando = () => { if (!S) return false; const a = M.actor(S); return a === 'oculta' || a === 'adivina'; };
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
    S.sec = S.cur.slice(); S.cur = Array(S.pos).fill(-1); sel = -1; api.sonido('ok'); pintar(); guardar(); if (M.actor(S) === 'cpu') programarIA(900); return;
  }
  const f = M.intentar(S); if (!f) { api.sonido('error'); return; }
  sel = -1; api.sonido(f[0] === S.pos ? 'ok' : 'mover'); api.vibrar(10);
  if (S.done) fin(); else { pintar(); guardar(); if (M.actor(S) === 'cpu') programarIA(900); }
}
function programarIA(ms) {
  clearTimeout(tIA); const tok = serie;
  tIA = setTimeout(() => {
    if (!S || tok !== serie || S.done || !S.sec || M.actor(S) !== 'cpu') return;
    const g = M.jugadaIA(S, 'ia' + S.jug.length + ':' + S.sec.join('')); if (!g || !M.intentar(S, g)) { S.done = true; S.gano = false; }
    api.sonido('mover'); if (S.done) fin(); else { pintar(); guardar(); if (M.actor(S) === 'cpu') programarIA(850); }
  }, ms);
}
async function pedirPista() {
  if (!S || S.done || S.modo !== 'adivinar' || S.rival !== 'uno') return;
  const p = M.pista(S, Math.random()); if (!p) { api.aviso('No encuentro ninguna combinación posible… revisa las pistas'); return; }
  S.cur = p.cod.slice(); sel = -1; S.pistas++; api.sonido('ok'); pintar(); guardar();
  const m = $('#mmMsg'); if (m) { m.innerHTML = `💡 Quedan <b>${p.n}</b> ${p.n === 1 ? 'combinación posible' : 'combinaciones posibles'}. He puesto una jugada que encaja con todas las pistas.`; }
}
function fin() {
  parar(); sel = -1;
  if (S.rival !== 'uno') {                                       // contra la CPU / dos personas
    const dos = S.rival === 'dos', v = nombreVar(S) + ` · ${M.RIVALES[S.rival]}`;
    if (S.modo === 'codigo' && S.ronda === 1) { api.sonido(S.gano ? 'mover' : 'ok'); pintar(); guardar(); return; }          // falta la 2.ª ronda
    const g = S.modo === 'adivinar' ? M.ganadorDuelo(S) : M.resultado2(S).ganador;
    if (dos) { api.registrar({ res: g === -1 ? 'tablas' : 'partida', variante: v }); api.sonido(g === -1 ? 'perder' : 'ganar'); pintar(); guardar(); if (g !== -1) api.victoria(); return; }
    api.registrar({ res: g === 0 ? 'victoria' : g === 1 ? 'derrota' : 'tablas', variante: v }); api.sonido(g === 1 ? 'perder' : g === 0 ? 'ganar' : 'mover'); if (g === 0) api.vibrar([60, 40, 60]); pintar(); guardar(); return;
  }
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
  panel = document.createElement('div'); panel.className = 'mmpanel juego-codigocifrado'; panel.setAttribute('role', 'group'); panel.setAttribute('aria-label', 'Colores y acciones');
  panel.innerHTML = `<div class="mmasa" title="Arrastra para mover el panel"><span aria-hidden="true"></span><small>Mover</small></div>
    <div class="mmpal" id="mmPal" style="--n:${S.col}">${Array.from({ length: S.col }, (_, c) => `<button type="button" class="mmb" data-c="${c}" data-s="${SIMB[c]}" data-col="${c}" aria-label="Color ${c + 1}"></button>`).join('')}</div>
    <div class="bar mmbar"><button class="btn on" data-ac="comprobar" id="mmOk">✔ Comprobar</button><button class="btn" data-ac="borrar">⌫ Borrar</button><button class="btn" data-ac="pista" id="mmPista">💡 Pista</button></div>`;
  document.body.append(panel); panel.addEventListener('click', clic);
  if (typeof ResizeObserver === 'function') { roPanel = new ResizeObserver(() => limitarPanel()); roPanel.observe(panel); }   // el hueco de #mmEsp sigue al alto del panel
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
// Hueco al final de la página: lo justo para que, con el scroll abajo del todo, el panel flotante no tape el menú (solo lo que el panel ocupa por encima del borde inferior, menos el margen que la página ya deja)
function espacioFinal() {
  const esp = $('#mmEsp'); if (!esp) return;
  if (!panel || panel.hidden) { esp.style.height = '0px'; return; }
  // Alto fijo = alto del panel + un respiro, menos lo que la página ya deja debajo (relleno y márgenes de los contenedores): no depende de dónde esté el panel
  let margen = 0; for (let n = esp.parentElement; n && n !== document.documentElement; n = n.parentElement) { const c = getComputedStyle(n); margen += (parseFloat(c.paddingBottom) || 0) + (parseFloat(c.marginBottom) || 0) + (parseFloat(c.borderBottomWidth) || 0); }
  esp.style.height = Math.max(0, Math.round(panel.offsetHeight + 8 - margen)) + 'px';
}
function limitarPanel() {
  if (!panel || panel.hidden) { espacioFinal(); return; }
  const w = panel.offsetWidth, h = panel.offsetHeight, vw = document.documentElement.clientWidth || innerWidth, vh = innerHeight, mg = 6;
  if (!posPanel) posPanel = { x: (vw - w) / 2, y: vh - h - 14 };                 // al principio: abajo y centrado
  const x = Math.min(Math.max(mg, posPanel.x), Math.max(mg, vw - w - mg)), y = Math.min(Math.max(mg, posPanel.y), Math.max(mg, vh - h - mg));
  panel.style.left = x + 'px'; panel.style.top = y + 'px';
  espacioFinal();
}
function quitarPanel() { if (roPanel) { roPanel.disconnect(); roPanel = null; } if (panel) { panel.remove(); panel = null; } arrP = null; }

/* ---------- entrada ---------- */
function tecla(e) {
  if (!S || !editando() || !$('#mmTab') || e.target.closest('input,textarea,select') || document.querySelector('.modal')) return;
  if (/^[1-8]$/.test(e.key)) { if (+e.key <= S.col) { e.preventDefault(); poner(+e.key - 1); } }
  else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); borrar(); }
  else if (e.key === 'Enter') { e.preventDefault(); comprobar(); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); const d = e.key === 'ArrowLeft' ? -1 : 1; sel = ((sel < 0 ? (d > 0 ? -1 : 0) : sel) + d + S.pos) % S.pos; pintar(); }
}
async function clic(e) {
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
  if (a === 'jugar') { if (S && !S.done && (S.jug.length || S.sec) && !await api.confirmar('¿Empezar una partida nueva y abandonar la actual?')) return; jugar(); }
  else if (a === 'volver') armar();
  else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas();
  else if (a === 'comprobar') comprobar(); else if (a === 'borrar') borrar(); else if (a === 'pista') pedirPista();
  else if (a === 'ronda') { if (S && S.done && M.rondas(S) === 2 && S.ronda === 1) { M.siguienteRonda(S); sel = -1; armar(); guardar(); } }
  else if (a === 'nueva') { if (S && !S.done && S.jug.length && !await api.confirmar('¿Abandonar esta partida?')) return; parar(); setup(); }
}
function reglas() {
  api.modal('Código Cifrado', `<ul><li>Hay un <b>código secreto</b> de 3 a 6 bolas de colores. En <b>Tú adivinas</b> lo esconde la máquina y tienes un número limitado de intentos para descubrirlo.</li>
    <li>Rellena una fila con los colores (toca un color; toca una bola de la fila para borrarla o para elegir su sitio) y pulsa <b>✔ Comprobar</b>.</li>
    <li>Cada <b>clavija negra</b> ⚫ = una bola con el color <i>y</i> el sitio correctos. Cada <b>blanca</b> ⚪ = un color que está en el código pero en otro sitio. Las clavijas no dicen cuál es cuál.</li>
    <li>«Repetir colores» está en No por defecto. Niveles: <b>Fácil</b> (4 bolas, 5 colores), <b>Medio</b> (4 bolas, 6 colores), <b>Difícil</b> (5 bolas, 8 colores), <b>Experto</b> (6 bolas, 8 colores) o <b>Personal</b>.</li>
    <li><b>Tú pones el código</b> (un jugador): escondes tú uno y la máquina intenta descifrarlo (sin estadísticas). Si no lo consigue en los intentos disponibles, ganas tú.</li>
    <li><b>Jugadores</b>: «Un jugador» (como siempre), «Contra la CPU» o «Dos personas». En <b>Tú adivinas</b> es un <b>duelo</b>: la máquina esconde el código y los dos lo buscáis por turnos en el mismo tablero (cada uno tiene sus intentos); gana quien lo descifre. En <b>Tú pones el código</b> son <b>dos rondas</b>: uno esconde y el otro adivina, y luego se cambian; gana quien use menos intentos (si no lo descifra, cuenta como un intento más que el máximo). Con dos personas, el que esconde el código no debe dejar que lo vea el otro.</li>
        <li>💡 <b>Pista</b>: te dice cuántas combinaciones siguen siendo posibles y rellena una que encaja con todo lo que sabes. Teclado: 1–8 colores, ← → posición, Retroceso borra, Intro comprueba.</li>
    <li>Con 🎨 Apariencia cambias el color del tablero (día y noche).</li></ul>`);
}
