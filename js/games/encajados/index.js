// Encajados: empuja todas las cajas hasta las metas. Campaña de 20 niveles, niveles generados sin fin y reto del día.
import { pieMenu } from '../../core/pie.js';
import { $, esc } from '../../core/dom.js';
import { enSegundoPlano } from '../../core/ia/remoto.js';
import * as K from './motor.js';
import { NIVELES } from './niveles.js';
import { estilo, aplicarVars, oscuro } from '../../core/fichas.js';
// Personajes del almacén (img/encajados/<id>-abajo|arriba|izq|der.webp): h = hombres y m = mujeres, de cuerpo entero.
const PROPIOS = [['h1', 'Mozo con gorra'], ['h2', 'Obrero barbudo'], ['h3', 'Repartidor'], ['h4', 'Abuelo del almacén'], ['m1', 'Capataz'], ['m2', 'Mecánica'], ['m3', 'Repartidora'], ['m4', 'Abuela del almacén']];
const CUERPO = /^[hm]\d$/;   // los de cuerpo entero se dibujan algo más pequeños que la caja

const MOTOR = new URL('./motor.js', import.meta.url).href;
const MODOS = { campana: '🗺️ Campaña', azar: '🎲 Generados' };
const MAX_HIST = 400;
// 🎨 Apariencia: escenario (muros, suelo y metas), cajas y personaje. Los colores están en encajados.css (.tema-… y .cajas-…)
const TEMAS = {   // 4 escenarios, cada uno con su versión de día (modo Claro) y de noche (modo Nocturno)
  almacen: { nombre: 'Almacén', sw: ['#6B7A99', '#EFE6D8'], modo: 'claro' }, jardin: { nombre: 'Jardín', sw: ['#3E8E5A', '#F3EBD8'], modo: 'claro' },
  desierto: { nombre: 'Desierto', sw: ['#B5651D', '#F6DFB0'], modo: 'claro' }, hielo: { nombre: 'Hielo', sw: ['#3A5BA0', '#EAF6FF'], modo: 'claro' },
  'almacen-n': { nombre: 'Cian', sw: ['#2A3B86', '#29D9FF'], modo: 'oscuro' }, 'jardin-n': { nombre: 'Lima', sw: ['#14684A', '#7CFF4D'], modo: 'oscuro' },
  'desierto-n': { nombre: 'Naranja', sw: ['#8A3A0E', '#FF9A1F'], modo: 'oscuro' }, 'hielo-n': { nombre: 'Magenta', sw: ['#4A2A6E', '#FF2EC4'], modo: 'oscuro' },
};
// Cajas: imágenes de img/encajados (la primera es la de siempre)
const ESTILOS = { ladrillo: 'Ladrillo', piedra: 'Piedra', metal: 'Metal industrial' };   // texturas grises de img/encajados/escenario, teñidas con los colores del escenario
const MARCAS = { cinta: 'Cinta de seguridad', rayas: 'Cinta roja y blanca', amarilla: 'Cinta amarilla', avisos: 'Cinta de avisos', esquinas: 'Esquinas blancas', 'esquinas-rojas': 'Esquinas rojas', discontinua: 'Línea discontinua', puntos: 'Puntos pintados' };   // img/encajados/marca
const CAJAS = { caja: 'Madera', metal: 'Metal', tec: 'Tecnológica', carton: 'Cartón', cuerdas: 'Cuerdas', hielo: 'Hielo', piedra: 'Piedra', blindada: 'Blindada' };
const SUF = { izquierda: 'izq', derecha: 'der', arriba: 'arriba', abajo: 'abajo' };
let dirV = 'abajo';
const ficha = () => ({ sec: 'propios' });
// Cada personaje tiene un sprite por dirección
const urlJug = () => `img/encajados/${asp.valores.ficha}-${SUF[dirV] || 'abajo'}.webp`;
let S = null, L = null, api = null, asp = null, root = null, cfg = { modo: 'campana', tam: 'mediano' };
let V3 = null, hay3d = false, modo3d = false, forzar2d = false, tok3 = 0;
const quiere3D = () => hay3d && !forzar2d && !!asp && (asp.valores.vista || '2d') === '3d';
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
  api = a; root = r; ocupado = false; andando = null; forzar2d = false; modo3d = false;
  hay3d = false;   // sin vista 3D
  asp = api.aspecto([{ clave: 'vista', titulo: 'Vista del almacén', icono: '🧊', def: '2d', opciones: [{ id: '3d', nombre: '🧊 3D' }, { id: '2d', nombre: '🔲 2D clásica' }] },
    { clave: 'tema', titulo: 'Tablero', icono: '🏭', def: 'almacen', defModo: { claro: 'almacen', oscuro: 'almacen-n' }, opciones: Object.entries(TEMAS).map(([id, t]) => ({ id, nombre: t.nombre, sw: t.sw, modo: t.modo, sec: t.modo === 'claro' ? 'Día' : 'Noche' })) },
    { clave: 'estilo', titulo: 'Escenario', icono: '🧱', def: 'ladrillo', opciones: Object.entries(ESTILOS).map(([id, nombre]) => ({ id, nombre })) },
    { clave: 'marca', titulo: 'Marca de meta', icono: '🚧', ventana: true, forma: 'figura', def: 'cinta', opciones: Object.entries(MARCAS).map(([id, nombre]) => ({ id, nombre, img: `img/encajados/marca/${id}.webp` })) },
    { clave: 'cajas', titulo: 'Cajas', icono: '📦', ventana: true, forma: 'figura', def: 'caja', opciones: Object.entries(CAJAS).map(([id, nombre]) => ({ id, nombre, img: `img/encajados/caja${id === 'caja' ? '' : '-' + id}.webp` })) },
    { clave: 'ficha', titulo: 'Personaje', icono: '🧑', ventana: true, forma: 'figura', def: 'h1', opciones: PROPIOS.map(([id, nombre]) => ({ id, nombre, sec: id[0] === 'h' ? 'Hombres' : 'Mujeres', img: `img/encajados/${id}-abajo.webp` })) }],
  () => { if (S && $('#skTab')) { if (modo3d !== quiere3D()) armar(); else { construir(); pintar(); } } });
  await api.css(new URL('../../../css/fichas.css', import.meta.url)); await api.css(new URL('./encajados.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && MODOS[c0.modo] && K.TAMANOS[c0.tam]) cfg = { ...c0 };
  S = api.cargar(); L = S ? K.leer(S.mapa) : null;
  root.addEventListener('click', clic);
  onKey = tecla; document.addEventListener('keydown', onKey);
  api.barra({ nueva: () => { if (S && S.modo === 'campana') nivelCampana(S.nivel); else generado(cfg.tam || 'mediano'); },
    salir: () => { location.hash = '#/cat/logica'; },
    etiqueta: 'Nuevo nivel',
    config: { valores: () => ({ modo: cfg.modo, tam: cfg.tam }), grupos: v => [{ clave: 'modo', titulo: 'Modo', opciones: Object.entries(MODOS) }, { clave: 'tam', titulo: 'Tamaño del almacén', visible: v.modo !== 'campana', opciones: Object.entries(K.TAMANOS).map(([k, t]) => [k, `${t.nombre} · ${t.cajas} cajas`]) }], aplicar: v => { cfg.modo = v.modo; cfg.tam = v.tam; api.setPref('cfg', cfg); if (v.modo === 'campana') elegirModo('campana'); else generado(v.tam); } } });
  api.menu([{ texto: '🗺️ Campaña', accion: () => elegirModo('campana') }, { texto: '🎲 Nivel generado', accion: () => elegirModo('azar') }, { texto: '📅 Reto del día', accion: () => reto() },
    { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: '📖 Reglas', accion: reglas }]);
  if (S) armar(); else elegirModo(cfg.modo);
}
export function unmount() { cerrar3D(); modo3d = false; serie++; clearTimeout(andando); andando = null; document.removeEventListener('keydown', onKey); if (root) root.removeEventListener('click', clic); S = null; L = null; asp = null; }
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
    ${pieMenu({ seguir: S && !S.done ? 'volver' : null, sinNueva: true })}`;
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

/* ---------- vista 3D ---------- */
function cerrar3D() { tok3++; if (V3) { V3.destruir(); V3 = null; } }
async function iniciar3D() {
  const t = ++tok3, host = $('#skTab'); if (!host || !L) return; host.dataset.iniciando = '1';
  try {
    const b3 = await import('../../core/escena3d.js'), { crearEncajados3D } = await import('./vista3d.js'); if (t !== tok3 || !root) return;
    const v = await crearEncajados3D(host, L, { cajas: asp.valores.cajas }); if (t !== tok3 || !root) { v.destruir(); return; }
    b3.botonesCamara(host, v.E); const g = host.querySelector('[data-cam="girar"]'); if (g) g.remove();       // girar cambiaría el sentido de los gestos
    v.alDeslizar = d => paso(d); v.alCasilla = i => irA(i); V3 = v; delete host.dataset.iniciando; v.recolor({ cajas: asp.valores.cajas, est: estilo(asp.valores) }); pintar(); V3.pintar({ cajas: S.cajas, jugador: S.jugador, emoji: urlJug(), volteo: false, nuevo: true });
  } catch (e) { console.error(e); if (t === tok3 && root && S) { forzar2d = true; armar(); } }
}

/* ---------- tablero ---------- */
function armar() {
  root.innerHTML = `<div class="skcab"><b id="skTit"></b><span id="skCont"></span></div>
    <div id="skTab" role="application" aria-label="Almacén: usa las flechas o desliza el dedo"></div>
    <div class="msg" id="skMsg" role="status" aria-live="polite"></div>
    <div class="skctl"><div class="skdpad"><button class="btn" data-dir="izquierda" aria-label="Izquierda">◀</button><button class="btn" data-dir="arriba" aria-label="Arriba">▲</button><button class="btn" data-dir="abajo" aria-label="Abajo">▼</button><button class="btn" data-dir="derecha" aria-label="Derecha">▶</button></div>
      <div class="skacc"><button class="btn" data-ac="deshacer">↶ Deshacer</button><button class="btn" data-ac="pista">💡 Pista</button><button class="btn" data-ac="reiniciar">⟲ Reiniciar</button></div></div>
    ${api.barraHtml()}`;
  cerrar3D(); modo3d = quiere3D();
  const tab = $('#skTab');
  if (!modo3d) {
  tab.addEventListener('pointerdown', e => { gesto = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  tab.addEventListener('pointerup', e => {
    if (!gesto) return; const dx = e.clientX - gesto.x, dy = e.clientY - gesto.y; gesto = null;
    if (Math.hypot(dx, dy) > 24) return paso(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'derecha' : 'izquierda') : (dy > 0 ? 'abajo' : 'arriba'));
    const c = e.target.closest('[data-c]'); if (c) irA(+c.dataset.c);
  });
  }
  construir(); pintar();
}
// 🎨 Cajas: color (variables --caja / --caja2 que leen el CSS 2D y la vista 3D), tamaño y textura/forma (css/fichas.css)
function aplicarCajas(tab) {
  const e = estilo(asp.valores); aplicarVars(tab, e);
  if (e.hex) { tab.style.setProperty('--caja', e.hex); tab.style.setProperty('--caja2', oscuro(e.hex)); } else { tab.style.removeProperty('--caja'); tab.style.removeProperty('--caja2'); }
  return e;
}
function construir() {
  const tab = $('#skTab'); if (!tab || !L) return;
  if (modo3d) {
    tab.className = `e3d sk3 tema-${asp.valores.tema} cajas-${asp.valores.cajas}`; const e3 = aplicarCajas(tab);
    if (V3) V3.recolor({ cajas: asp.valores.cajas, est: e3 }); else if (!tab.dataset.iniciando) iniciar3D();
    return;
  }
  tab.className = `sktab tema-${asp.valores.tema} cajas-${asp.valores.cajas} est-${asp.valores.estilo} marca-${asp.valores.marca}${String(asp.valores.tema).endsWith('-n') ? ' noche' : ''}`; aplicarCajas(tab);
  tab.style.setProperty('--w', L.w); tab.style.setProperty('--h', L.h);
  let html = '';
  for (let i = 0; i < L.w * L.h; i++) html += `<div class="skc ${L.muro[i] ? 'muro' : L.fuera[i] ? 'fuera' : 'suelo'}${!L.muro[i] && !L.fuera[i] && ((i % L.w) * 3 + ((i / L.w) | 0) * 5) % 4 === 0 ? ' b' : ''}${L.meta[i] ? ' meta' : ''}" data-c="${i}"></div>`;
  html += L.cajas.map((_, k) => `<div class="skcaja fxb" data-k="${k}"></div>`).join('') + `<div class="skjug${CUERPO.test(asp.valores.ficha) ? ' cuerpo' : ''}"><span><img src="${urlJug()}" alt=""></span></div>`;
  tab.innerHTML = html;
}
const pos = i => `--x:${i % L.w};--y:${(i / L.w) | 0}`;
function pintar() {
  if (!S || !$('#skTab')) return;
  if (modo3d) { if (V3) V3.pintar({ cajas: S.cajas, jugador: S.jugador, emoji: urlJug(), volteo: false }); }
  else S.cajas.forEach((c, k) => { const el = $(`#skTab [data-k="${k}"]`); el.setAttribute('style', pos(c)); el.classList.toggle('en', !!L.meta[c]); });
  const j = modo3d ? null : $('#skTab .skjug'); if (j) { j.setAttribute('style', pos(S.jugador));
  j.classList.toggle('cuerpo', CUERPO.test(asp.valores.ficha)); const im = j.querySelector('img'); if (im && im.getAttribute('src') !== urlJug()) im.src = urlJug(); }  
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
  dirV = dir; if (dir === 'izquierda' || dir === 'derecha') mira = dir;
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
  api.sonido('ganar'); api.vibrar([60, 40, 60]); if (V3) V3.celebrar();
}
function deshacer() {
  if (!S || S.done || andando || !S.hist.length) return;
  const [c, j, m, e] = S.hist.pop(); S.cajas = c; S.jugador = j; S.movs = m; S.empujes = e; api.sonido('click'); pintar(); guardar();
}
async function reiniciar() {
  if (!S || andando) return;
  if (S.movs && !S.done && !await api.confirmar('¿Volver a empezar el nivel?')) return;
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
  else if (a === 'volver') armar(); else if (a === 'generar') generado(cfg.tam); else if (a === 'reto') reto();
  else if (a === 'siguiente') nivelCampana(S.nivel + 1); else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas();
}
function reglas() {
  api.modal('Encajados', `<ul><li>Eres el mozo del almacén: <b>empuja todas las cajas</b> hasta las casillas marcadas.</li>
    <li>Solo puedes <b>empujar</b> (nunca tirar) y de una en una: dos cajas seguidas no se mueven.</li>
    <li>Cuidado con las esquinas: una caja arrinconada fuera de su meta ya no sale. Te avisaré si pasa.</li>
    <li>Muévete deslizando el dedo sobre el almacén, con las flechas de pantalla o del teclado (también WASD). <b>Toca una casilla</b> y el personaje irá andando hasta allí.</li>
    <li>↶ Deshacer (también Z) no tiene límite y se guarda con la partida. ⟲ Reiniciar vuelve al principio del nivel.</li>
    <li>🎨 <b>Apariencia</b>: 4 escenarios con versión de día y de noche (según el modo Claro/Nocturno), 8 tipos de caja y 8 personajes del almacén que se giran según hacia dónde avanzan.</li>
    <li>💡 <b>Pista</b>: busco la mejor solución desde donde estás y hago por ti el siguiente empuje.</li>
    <li><b>Campaña</b>: 20 niveles de dificultad creciente. <b>Generados</b>: niveles nuevos sin fin en 3 tamaños, siempre con solución. <b>Reto del día</b>: el mismo nivel para todo el mundo.</li></ul>`);
}
