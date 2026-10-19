// Sokoban: empuja todas las cajas hasta las metas. Campaña de 20 niveles, niveles generados sin fin y reto del día.
import { $, esc } from '../../core/dom.js';
import { enSegundoPlano } from '../../core/ia/remoto.js';
import * as K from './motor.js';
import { NIVELES } from './niveles.js';

const MOTOR = new URL('./motor.js', import.meta.url).href;
const MODOS = { campana: '🗺️ Campaña', azar: '🎲 Generados' };
const MAX_HIST = 400;
// 🎨 Apariencia: escenario (muros, suelo y metas), cajas y personaje. Los colores están en sokoban.css (.tema-… y .cajas-…)
const TEMAS = {
  almacen: { nombre: 'Almacén', sw: ['#6B7A99', '#EFE6D8'] }, hielo: { nombre: 'Hielo', sw: ['#3A5BA0', '#EAF6FF'] }, jardin: { nombre: 'Jardín', sw: ['#3E8E5A', '#F3EBD8'] },
  noche: { nombre: 'Noche', sw: ['#1B2147', '#2E3566'] }, desierto: { nombre: 'Desierto', sw: ['#B5651D', '#F6DFB0'] }, caramelo: { nombre: 'Caramelo', sw: ['#E84A8A', '#FFE6F1'] },
  mina: { nombre: 'Mina', sw: ['#4A3B33', '#8C7B6B'] }, playa: { nombre: 'Playa', sw: ['#1FA2B8', '#FFF1C9'] },
};
const CAJAS = {
  madera: { nombre: 'Madera', sw: ['#C98A4B', '#9C6230'] }, roja: { nombre: 'Rojas', sw: ['#FF5A5F', '#C0303A'] }, azul: { nombre: 'Azules', sw: ['#4C8DFF', '#2453B8'] },
  verde: { nombre: 'Verdes', sw: ['#3DCB7A', '#1E8F4E'] }, dorada: { nombre: 'Doradas', sw: ['#FFD23F', '#C99A00'] }, metal: { nombre: 'Metálicas', sw: ['#B8C2D1', '#6D7A8F'] },
  regalo: { nombre: 'Regalos', sw: ['#9B5DE5', '#FFD23F'] }, carton: { nombre: 'Cartón', sw: ['#D9B27C', '#A8834F'] },
};
// Personajes por secciones. Los de «Animales» y «Vehículos» se giran según hacia dónde caminan.
const PERSONAJES = {
  Hombres: ['👨', '👨🏻', '👨🏽', '👨🏿', '👨‍🦰', '👨‍🦱', '👨‍🦳', '👨‍🦲', '🧔', '👴', '👦'],
  Mujeres: ['👩', '👩🏻', '👩🏽', '👩🏿', '👩‍🦰', '👩‍🦱', '👩‍🦳', '👱‍♀️', '🧕', '👵', '👧'],
  Oficios: ['👷', '👷‍♀️', '👮', '👮‍♀️', '🧑‍🚒', '👨‍🚒', '👩‍🚒', '👨‍🍳', '👩‍🍳', '👨‍🔧', '👩‍🔧', '👨‍⚕️', '👩‍⚕️', '👨‍🌾', '👩‍🌾', '👨‍🏭', '👩‍🏭', '👨‍🚀', '👩‍🚀', '🕵️', '💂', '🧑‍🎨'],
  Fantasía: ['🧙', '🧝', '🧚', '🧛', '🧟', '🧞', '🦸', '🦹', '🥷', '🤖', '👽', '👻', '🎅', '🤶'],
  Animales: ['🐧', '🐱', '🐶', '🦊', '🐻', '🐼', '🐨', '🐸', '🐵', '🐷', '🐰', '🦁', '🐯', '🐮', '🐔', '🦉', '🐢', '🦖', '🐘', '🦒'],
  Vehículos: ['🚜', '🚗', '🚕', '🚙', '🛻', '🚚', '🏎️', '🚓', '🚑', '🚒', '🛺', '🚲', '🛵', '🏍️'],
};
const NOMBRE_SEC = { Hombres: 'Hombre', Mujeres: 'Mujer', Oficios: 'Oficio', Fantasía: 'Fantasía', Animales: 'Animal', Vehículos: 'Vehículo' };
const FICHAS = Object.fromEntries(Object.entries(PERSONAJES).flatMap(([sec, l]) => l.map((e, i) => [`${sec.slice(0, 3).toLowerCase()}${i}`, { e, sec }])));
const GIRAN = new Set(['Animales', 'Vehículos']);
const ficha = () => FICHAS[asp.valores.ficha] || FICHAS.ofi0;
let S = null, L = null, api = null, asp = null, root = null, cfg = { modo: 'campana', tam: 'mediano' };
let onKey = null, gesto = null, andando = null, ocupado = false, serie = 0, mira = 'izquierda';

/* ---------- validación / resumen ---------- */
const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
const mapaValido = m => typeof m === 'string' && m.length < 1000 && /^[#.$*@+ \n]+$/.test(m);
export function validar(d) {
  if (!d || typeof d !== 'object' || !['campana', 'azar', 'reto'].includes(d.modo)) return null;
  const mapa = d.modo === 'campana' ? (ent(d.nivel, 0, NIVELES.length - 1) ? NIVELES[d.nivel].mapa : null) : (mapaValido(d.mapa) ? d.mapa : null);
  if (!mapa) return null;
  let Lv; try { Lv = K.leer(mapa); } catch { return null; }
  if (Lv.jugador < 0 || !Lv.cajas.length) return null;
  const e = K.validarEstado(Lv, d); if (!e) return null;
  const hist = Array.isArray(d.hist) ? d.hist.filter(h => Array.isArray(h) && h.length === 4 && K.validarEstado(Lv, { cajas: h[0], jugador: h[1] }) && ent(h[2], 0, 1e6) && ent(h[3], 0, 1e6)).slice(-MAX_HIST) : [];
  return { modo: d.modo, nivel: d.modo === 'campana' ? d.nivel : 0, tam: K.TAMANOS[d.tam] ? d.tam : 'mediano', mapa, ...e, hist,
    movs: ent(d.movs, 0, 1e6) ? d.movs : 0, empujes: ent(d.empujes, 0, 1e6) ? d.empujes : 0, t: ent(d.t, 0, 1e7) ? d.t : 0, pistas: ent(d.pistas, 0, 1e4) ? d.pistas : 0,
    done: !!d.done, reto: typeof d.reto === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.reto) ? d.reto : null, nombre: typeof d.nombre === 'string' ? d.nombre.slice(0, 40) : '' };
}
export const migrarV1 = d => d;
const titulo = d => d.modo === 'campana' ? `Nivel ${d.nivel + 1} · ${NIVELES[d.nivel].nombre}` : d.modo === 'reto' ? '📅 Reto del día' : `Generado ${K.TAMANOS[d.tam].nombre.toLowerCase()}`;
export function resumen(d) { return { texto: `${titulo(d)} · ${d.done ? `resuelto en ${d.movs} movimientos` : `${d.empujes} empujes`}`, fin: d.done }; }

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; ocupado = false; andando = null;
  asp = api.aspecto([{ clave: 'tema', titulo: 'Escenario (muros y suelo)', def: 'almacen', opciones: Object.entries(TEMAS).map(([id, t]) => ({ id, nombre: t.nombre, sw: t.sw })) },
    { clave: 'cajas', titulo: 'Cajas', def: 'madera', opciones: Object.entries(CAJAS).map(([id, t]) => ({ id, nombre: t.nombre, sw: t.sw })) },
    { clave: 'ficha', titulo: 'Personaje', def: 'ofi0', opciones: Object.entries(FICHAS).map(([id, f]) => ({ id, emoji: f.e, sec: f.sec, nombre: `${NOMBRE_SEC[f.sec]} ${f.e}` })) }],
  () => { if (S && $('#skTab')) { construir(); pintar(); } });
  await api.css(new URL('./sokoban.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && MODOS[c0.modo] && K.TAMANOS[c0.tam]) cfg = { ...c0 };
  S = api.cargar(); L = S ? K.leer(S.mapa) : null;
  root.addEventListener('click', clic);
  onKey = tecla; document.addEventListener('keydown', onKey);
  api.menu([{ texto: '🗺️ Campaña', accion: () => elegirModo('campana') }, { texto: '🎲 Nivel generado', accion: () => elegirModo('azar') }, { texto: '📅 Reto del día', accion: () => reto() },
    { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Cómo se juega', accion: reglas }]);
  if (S) armar(); else elegirModo(cfg.modo);
}
export function unmount() { serie++; clearTimeout(andando); andando = null; document.removeEventListener('keydown', onKey); if (root) root.removeEventListener('click', clic); S = null; L = null; asp = null; }
function guardar() { if (!S) return; const r = resumen(S); api.guardar(S, r.texto, r.fin); }
const superados = () => { const s = api.pref('superados', []); return Array.isArray(s) ? s.filter(i => ent(i, 0, NIVELES.length - 1)) : []; };
const mejores = () => { const m = api.pref('mejores', {}); return m && typeof m === 'object' ? m : {}; };

/* ---------- pantallas ---------- */
function elegirModo(modo) {
  serie++; ocupado = false; cfg.modo = modo; api.setPref('cfg', cfg);
  const hechos = new Set(superados()), M = mejores(), siguiente = NIVELES.findIndex((_, i) => !hechos.has(i));
  const hoy = api.reto.fecha(), retoHecho = api.reto.hecho();
  root.innerHTML = `<div class="reto ${retoHecho ? 'hecho' : ''}"><span>${retoHecho ? '✅' : '📅'}</span><div><b>Reto del día · ${api.reto.texto(hoy)}</b>${retoHecho ? 'Completado. Vuelve mañana para otro.' : 'Un almacén mediano, el mismo para todo el mundo hoy.'}</div>${retoHecho ? '' : '<button class="btn on" data-ac="reto">Jugar</button>'}</div>
    <div class="bar"><div class="seg">${Object.entries(MODOS).map(([k, l]) => `<button class="btn ${modo === k ? 'on' : ''}" data-modo="${k}">${l}</button>`).join('')}</div></div>
    ${modo === 'campana' ? `<p class="note">${hechos.size} de ${NIVELES.length} niveles superados. Los niveles se desbloquean en orden.</p>
      <div class="skniveles">${NIVELES.map((n, i) => { const ok = hechos.has(i), libre = ok || i <= Math.max(0, siguiente === -1 ? NIVELES.length : siguiente), m = M[i];
        return `<button class="sknv ${ok ? 'ok' : ''}" data-nivel="${i}" ${libre ? '' : 'disabled'} aria-label="Nivel ${i + 1}: ${esc(n.nombre)}${ok ? ', superado' : ''}"><b>${i + 1}</b><span>${esc(n.nombre)}</span><small>${ok ? `✔ ${m ? m[0] + ' mov.' : ''}` : libre ? '' : '🔒'}</small></button>`; }).join('')}</div>`
    : `<p class="note">Niveles nuevos sin fin, creados al momento y comprobados: siempre tienen solución.</p>
      <div class="bar"><span class="lbl">Tamaño</span><div class="seg">${Object.entries(K.TAMANOS).map(([k, t]) => `<button class="btn ${cfg.tam === k ? 'on' : ''}" data-tam="${k}">${t.nombre} · ${t.cajas} cajas</button>`).join('')}</div></div>
      <div class="bar"><button class="btn on" data-ac="generar">🎲 Crear nivel</button></div>`}
    <div class="bar">${S && !S.done ? '<button class="btn" data-ac="volver">▶️ Volver a la partida</button>' : ''}<button class="btn" data-ac="aspecto">🎨 Apariencia</button></div>`;
}
function empezar(datos) {
  serie++; clearTimeout(andando); andando = null; ocupado = false;
  S = { ...datos, hist: [], movs: 0, empujes: 0, t: 0, pistas: 0, done: false };
  L = K.leer(S.mapa); S.cajas = L.cajas.slice(); S.jugador = L.jugador;
  armar(); guardar();
}
const nivelCampana = i => empezar({ modo: 'campana', nivel: i, tam: 'mediano', mapa: NIVELES[i].mapa, reto: null, nombre: NIVELES[i].nombre });
async function generado(tam, semilla = null) {
  if (ocupado) return; ocupado = true; const tok = ++serie;
  root.innerHTML = `<p class="msg sk-cargando">📦 Colocando las cajas…</p>`;
  const sem = semilla || String(Math.floor(Math.random() * 1e9));
  const g = await enSegundoPlano(MOTOR, 'generar', [tam, sem], K.generar);           // en un Worker: la pantalla no se congela
  if (tok !== serie || !root) return;
  ocupado = false;
  if (!g) { api.aviso('No se pudo crear el nivel: prueba otra vez'); return elegirModo(cfg.modo); }
  empezar({ modo: semilla ? 'reto' : 'azar', nivel: 0, tam, mapa: g.texto, reto: semilla ? api.reto.fecha() : null, nombre: '' });
}
function reto() {
  if (api.reto.hecho()) { api.aviso('Ya has completado el reto de hoy'); return; }
  if (S && S.reto === api.reto.fecha() && !S.done) return armar();
  generado('mediano', `${api.reto.fecha()}:sokoban`);
}

/* ---------- tablero ---------- */
function armar() {
  root.innerHTML = `<div class="skcab"><b id="skTit"></b><span id="skCont"></span></div>
    <div class="sktab" id="skTab" role="application" aria-label="Almacén: usa las flechas o desliza el dedo"></div>
    <div class="msg" id="skMsg" role="status" aria-live="polite"></div>
    <div class="skctl"><div class="skdpad"><button class="btn" data-dir="arriba" aria-label="Arriba">▲</button><button class="btn" data-dir="izquierda" aria-label="Izquierda">◀</button><button class="btn" data-dir="abajo" aria-label="Abajo">▼</button><button class="btn" data-dir="derecha" aria-label="Derecha">▶</button></div>
      <div class="skacc"><button class="btn" data-ac="deshacer">↶ Deshacer</button><button class="btn" data-ac="reiniciar">⟲ Reiniciar</button><button class="btn" data-ac="pista">💡 Pista</button><button class="btn" data-ac="menu">☰ Niveles</button></div></div>
    <div class="bar" style="justify-content:center"><button class="btn" data-ac="aspecto">🎨 Apariencia</button></div>`;
  const tab = $('#skTab');
  tab.addEventListener('pointerdown', e => { gesto = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  tab.addEventListener('pointerup', e => {
    if (!gesto) return; const dx = e.clientX - gesto.x, dy = e.clientY - gesto.y; gesto = null;
    if (Math.hypot(dx, dy) > 24) return paso(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'derecha' : 'izquierda') : (dy > 0 ? 'abajo' : 'arriba'));
    const c = e.target.closest('[data-c]'); if (c) irA(+c.dataset.c);
  });
  construir(); pintar();
}
function construir() {
  const tab = $('#skTab'); if (!tab || !L) return;
  tab.className = `sktab tema-${asp.valores.tema} cajas-${asp.valores.cajas}`;
  tab.style.setProperty('--w', L.w); tab.style.setProperty('--h', L.h);
  let html = '';
  for (let i = 0; i < L.w * L.h; i++) html += `<div class="skc ${L.muro[i] ? 'muro' : L.fuera[i] ? 'fuera' : 'suelo'}${L.meta[i] ? ' meta' : ''}" data-c="${i}"></div>`;
  html += L.cajas.map((_, k) => `<div class="skcaja" data-k="${k}"></div>`).join('') + `<div class="skjug"><span>${ficha().e}</span></div>`;
  tab.innerHTML = html;
}
const pos = i => `--x:${i % L.w};--y:${(i / L.w) | 0}`;
function pintar() {
  if (!S || !$('#skTab')) return;
  S.cajas.forEach((c, k) => { const el = $(`#skTab [data-k="${k}"]`); el.setAttribute('style', pos(c)); el.classList.toggle('en', !!L.meta[c]); });
  const j = $('#skTab .skjug'); j.setAttribute('style', pos(S.jugador));
  j.classList.toggle('derecha', mira === 'derecha' && GIRAN.has(ficha().sec));   // los emojis de animales y vehículos miran a la izquierda
  const enMeta = S.cajas.filter(c => L.meta[c]).length, M = S.modo === 'campana' ? mejores()[S.nivel] : null;
  $('#skTit').textContent = titulo(S);
  $('#skCont').innerHTML = `📦 ${enMeta}/${S.cajas.length} · 👣 ${S.movs} · 🫸 ${S.empujes}${M ? ` · récord ${M[0]}` : ''}`;
  const m = $('#skMsg');
  if (S.done) {
    m.className = 'msg win';
    const sig = S.modo === 'campana' && S.nivel < NIVELES.length - 1;
    m.innerHTML = `🎉 ¡Nivel resuelto en ${S.movs} movimientos y ${S.empujes} empujes!${S.pistas ? ` (con ${S.pistas} pista${S.pistas > 1 ? 's' : ''})` : ''} <span class="bar" style="justify-content:center;margin-top:6px">${sig ? '<button class="btn on" data-ac="siguiente">Siguiente nivel ▶</button>' : S.modo === 'azar' ? '<button class="btn on" data-ac="generar">🎲 Otro nivel</button>' : ''}<button class="btn" data-ac="menu">☰ Niveles</button></span>`;
  } else { m.className = 'msg'; m.textContent = atascado() ? '⚠️ Alguna caja ha quedado atascada en una esquina: deshaz o reinicia.' : ''; }
  root.querySelectorAll('[data-ac="deshacer"]').forEach(b => { b.disabled = !S.hist.length || S.done; });
}
// ¿Hay alguna caja fuera de meta en una casilla de la que ya no puede salir hacia ninguna meta?
let muertasL = null, muertasDe = null;
function atascado() { if (muertasDe !== L) { muertasL = K.muertas(L); muertasDe = L; } return S.cajas.some(c => !L.meta[c] && muertasL[c]); }

/* ---------- jugar ---------- */
function paso(dir, auto = false) {
  if (!S || S.done || (andando && !auto)) return false;
  const r = K.mover(L, S.cajas, S.jugador, dir); if (!r) { if (!auto) api.sonido('error'); return false; }
  S.hist.push([S.cajas, S.jugador, S.movs, S.empujes]); if (S.hist.length > MAX_HIST) S.hist.shift();
  if (dir === 'izquierda' || dir === 'derecha') mira = dir;
  S.cajas = r.cajas; S.jugador = r.jugador; S.movs++;
  if (r.empuje >= 0) { S.empujes++; api.sonido(L.meta[r.cajas[r.empuje]] ? 'ok' : 'click'); api.vibrar(10); }
  if (K.resuelto(L, S.cajas)) ganar();
  pintar(); guardar(); return true;
}
function irA(i) {                                                                // tocar una casilla: andar hasta allí (sin empujar)
  if (!S || S.done || andando || L.muro[i]) return;
  const x = i % L.w, y = (i / L.w) | 0, jx = S.jugador % L.w, jy = (S.jugador / L.w) | 0;
  if (Math.abs(x - jx) + Math.abs(y - jy) === 1) return paso(x > jx ? 'derecha' : x < jx ? 'izquierda' : y > jy ? 'abajo' : 'arriba');
  const ruta = K.camino(L, S.cajas, S.jugador, i); if (!ruta || !ruta.length) return;
  andarRuta(ruta);
}
function andarRuta(ruta, alAcabar = null) {
  const tok = serie, sig = () => { if (tok !== serie || !S) { andando = null; return; } const d = ruta.shift(); if (!d || !paso(d, true)) { andando = null; if (alAcabar) alAcabar(); return; } andando = setTimeout(sig, 75); };
  sig();
}
function ganar() {
  S.done = true;
  if (S.modo === 'campana') {
    const h = superados(); if (!h.includes(S.nivel)) api.setPref('superados', [...h, S.nivel]);
    const M = mejores(), m = M[S.nivel]; if (!m || S.movs < m[0]) { M[S.nivel] = [S.movs, S.empujes]; api.setPref('mejores', M); }
  }
  api.registrar({ res: 'victoria', variante: S.modo === 'campana' ? 'Campaña' : S.modo === 'reto' ? 'Reto del día' : `Generado ${K.TAMANOS[S.tam].nombre.toLowerCase()}`, limpio: !S.pistas });
  if (S.reto && api.reto.completar(S.reto)) setTimeout(() => api.aviso('📅 ¡Reto del día completado!'), 400);
  api.sonido('ganar'); api.vibrar([60, 40, 60]);
}
function deshacer() {
  if (!S || S.done || andando || !S.hist.length) return;
  const [c, j, m, e] = S.hist.pop(); S.cajas = c; S.jugador = j; S.movs = m; S.empujes = e; api.sonido('click'); pintar(); guardar();
}
function reiniciar() {
  if (!S || andando) return;
  if (S.movs && !S.done && !api.confirmar('¿Volver a empezar el nivel?')) return;
  S.cajas = L.cajas.slice(); S.jugador = L.jugador; S.hist = []; S.movs = 0; S.empujes = 0; S.done = false; S.pistas = 0; pintar(); guardar();
}
// Pista: el resolvedor (en un Worker) busca la solución desde la posición actual y hace por ti el siguiente empuje
async function pista() {
  if (!S || S.done || andando || ocupado) return;
  if (atascado()) { api.aviso('Así ya no tiene solución: deshaz algún movimiento'); return; }
  ocupado = true; const tok = serie, b = root.querySelector('[data-ac="pista"]'); if (b) b.textContent = '💭 Pensando…';
  const sol = await enSegundoPlano(MOTOR, 'resolver', [L, S.cajas, S.jugador, 150000], K.resolver);
  ocupado = false; if (b) b.textContent = '💡 Pista';
  if (tok !== serie || !S) return;
  if (!sol) { api.aviso('Desde aquí no encuentro solución: prueba a deshacer'); return; }
  S.pistas++;
  // camina hasta la caja y hace el primer empuje de la solución
  let cs = S.cajas, j = S.jugador; const hasta = [];
  for (const d of sol.pasos) { const r = K.mover(L, cs, j, d); hasta.push(d); cs = r.cajas; j = r.jugador; if (r.empuje >= 0) break; }
  andarRuta(hasta);
}

/* ---------- entrada ---------- */
function tecla(e) {
  if (!S || !$('#skTab') || /INPUT|TEXTAREA/.test(document.activeElement.tagName) || document.querySelector('.modal')) return;
  const mapa = { ArrowUp: 'arriba', ArrowDown: 'abajo', ArrowLeft: 'izquierda', ArrowRight: 'derecha', w: 'arriba', s: 'abajo', a: 'izquierda', d: 'derecha' };
  if (mapa[e.key]) { e.preventDefault(); paso(mapa[e.key]); }
  else if (e.key === 'z' || e.key === 'Backspace') { e.preventDefault(); deshacer(); }
  else if (e.key === 'r') reiniciar();
}
function clic(e) {
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.dir) return paso(d.dir);
  if (d.modo) return elegirModo(d.modo);
  if (d.tam) { cfg.tam = d.tam; api.setPref('cfg', cfg); return elegirModo('azar'); }
  if (d.nivel != null) return nivelCampana(+d.nivel);
  const a = d.ac;
  if (a === 'deshacer') deshacer(); else if (a === 'reiniciar') reiniciar(); else if (a === 'pista') pista();
  else if (a === 'menu') { clearTimeout(andando); andando = null; elegirModo(S && S.modo === 'campana' ? 'campana' : cfg.modo); }
  else if (a === 'volver') armar(); else if (a === 'generar') generado(cfg.tam); else if (a === 'reto') reto();
  else if (a === 'siguiente') nivelCampana(S.nivel + 1); else if (a === 'aspecto') asp.abrir();
}
function reglas() {
  api.modal('Sokoban', `<ul><li>Eres el mozo del almacén: <b>empuja todas las cajas</b> hasta las casillas marcadas.</li>
    <li>Solo puedes <b>empujar</b> (nunca tirar) y de una en una: dos cajas seguidas no se mueven.</li>
    <li>Cuidado con las esquinas: una caja arrinconada fuera de su meta ya no sale. Te avisaré si pasa.</li>
    <li>Muévete deslizando el dedo sobre el almacén, con las flechas de pantalla o del teclado (también WASD). <b>Toca una casilla</b> y el personaje irá andando hasta allí.</li>
    <li>↶ Deshacer (también Z) no tiene límite y se guarda con la partida. ⟲ Reiniciar vuelve al principio del nivel.</li>
    <li>🎨 <b>Apariencia</b>: 8 escenarios, 8 tipos de caja y más de 90 personajes (hombres, mujeres, oficios, fantasía, animales y vehículos). Los animales y vehículos se giran según hacia dónde avanzan.</li>
    <li>💡 <b>Pista</b>: busco la mejor solución desde donde estás y hago por ti el siguiente empuje.</li>
    <li><b>Campaña</b>: 20 niveles de dificultad creciente. <b>Generados</b>: niveles nuevos sin fin en 3 tamaños, siempre con solución. <b>Reto del día</b>: el mismo nivel para todo el mundo.</li></ul>`);
}
