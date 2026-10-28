// Shell de la aplicación: rutas por hash, menú, estadísticas, ajustes y copia de seguridad.
import { JUEGOS, CATEGORIAS, PROXIMAMENTE, GRUPOS, entradas } from './registry.js';
import { $, el, esc, fmtTiempo } from './core/dom.js';
import * as store from './core/storage.js';
import * as aj from './core/ajustes.js';
import * as stats from './core/stats.js';
import * as son from './core/sonido.js';
import { BARAJAS, urlTapete, buscarFondo, cargarBarajas, precargarSeleccion } from './core/cartas.js';
import * as logros from './core/logros.js';
import { conSemilla, conSemillaAsync, hoy, fechaLarga } from './core/semilla.js';
import { VERSION } from './version.js';

// «Palabras Cruzadas» (el nombre más largo) ocupa justo la zona clara del banner (50 % de su ancho); los demás, más cortos, caben siempre
function ajustarCabecera() {
  const h = document.getElementById('titulo'); if (!h || !h.clientWidth) return;
  const m = document.createElement('span'); m.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:400 100px Chewy,"Baloo 2",system-ui,sans-serif;letter-spacing:.2px'; m.textContent = 'Palabras Cruzadas';
  document.body.appendChild(m); const w = m.getBoundingClientRect().width; m.remove(); if (!w) return;
  h.style.setProperty('--tit-fs', Math.min(0.5 * h.clientWidth / w * 100, h.clientHeight * 0.78).toFixed(1) + 'px');
}
// En el móvil, al desplazar la página la barra del navegador se oculta/aparece y se dispara «resize» (solo cambia un poco el alto).
// Los juegos recalculan su tamaño con ese evento y el contenido se recoloca: la página «salta». Se ignoran esos cambios pequeños de alto.
{
  const addOrig = window.addEventListener.bind(window), remOrig = window.removeEventListener.bind(window), env = new WeakMap();
  window.addEventListener = function (tipo, fn, op) {
    if (tipo !== 'resize' || typeof fn !== 'function') return addOrig(tipo, fn, op);
    let w = innerWidth, h = innerHeight;
    const f = function (e) { if (innerWidth === w && Math.abs(innerHeight - h) < 130) return; w = innerWidth; h = innerHeight; return fn.call(this, e); };
    env.set(fn, f); return addOrig(tipo, f, op);
  };
  window.removeEventListener = function (tipo, fn, op) { return remOrig(tipo, tipo === 'resize' && env.has(fn) ? env.get(fn) : fn, op); };
}
window.addEventListener('resize', ajustarCabecera); ajustarCabecera();
if (document.fonts) { document.fonts.load('40px Chewy').then(ajustarCabecera).catch(() => {}); document.fonts.ready.then(ajustarCabecera); }
// Título de la cabecera: «Juegos» (amarillo) y «Reunidos» (azul) como en el logo; el nombre de cada juego cambia de color al azar (todos con buen contraste sobre blanco)
const COLORES_TITULO = ['#C62828', '#1565C0', '#2E7D32', '#6A1B9A', '#D84315', '#00796B', '#AD1457', '#283593', '#8D4B00', '#00838F'];
let colorTitulo = '';
const cabTxt = t => {
  const e = document.getElementById('titulotxt'); if (!e) return;
  if (t === 'Juegos Reunidos') { e.innerHTML = '<span class="cj">Juegos</span> <span class="cr">Reunidos</span>'; e.style.color = ''; return; }
  let c; do { c = COLORES_TITULO[Math.random() * COLORES_TITULO.length | 0]; } while (c === colorTitulo && COLORES_TITULO.length > 1);
  colorTitulo = c; e.textContent = t; e.style.color = c;
};
let nombreVista = '';       // nombre de la pantalla actual (título de la hoja de opciones); la cabecera es fija
const app = $('#app'), nav = $('#nav');
const RUTAS = [
  ['cat-logica', '🧠', 'Lógica', '#/cat/logica'],
  ['cat-tablero', '🎲', 'Tablero', '#/cat/tablero'],
  ['cat-cartas', '🃏', 'Cartas', '#/cat/cartas'],
  ['cat-palabras', '🔤', 'Palabras', '#/cat/palabras'],
  ['cat-arcade', '🕹️', 'Arcade', '#/cat/arcade'],
  ['stats', '📊', 'Estadísticas', '#/stats'],
  ['ajustes', '⚙️', 'Ajustes', '#/ajustes']
];
let actual = null, token = 0, menuItems = [];
// Antes había un menú ⋯ en la cabecera. Ahora «Reglas» va en la barra inferior y el resto de entradas (Historial, Pista, Podio, Compartir…) se abren desde «Pausa / Salir» → «Más opciones».
const RE_REGLAS = /^(Reglas|Reglamento|Cómo se juega)/i, RE_EN_BARRA = /Apariencia|^(Nuev[oa]\b|Otra palabra)|^⏸️ Pausa/i;
const itemReglas = () => menuItems.find(it => RE_REGLAS.test(it.texto));
const itemsExtra = () => menuItems.filter(it => !RE_REGLAS.test(it.texto) && !RE_EN_BARRA.test(it.texto));
const V1_KEY = 'juegos-reunidos-save';

aj.aplicarTema();
const CAT_IDS = Object.fromEntries(Object.keys(CATEGORIAS).map(k => [k, JUEGOS.filter(j => j.categoria === k).map(j => j.id)]));
// Si el almacenamiento del navegador está lleno, se avisa (antes la partida dejaba de guardarse sin decir nada).
let ultAvisoLleno = 0;
store.siFalla(() => { if (Date.now() - ultAvisoLleno > 15000) { ultAvisoLleno = Date.now(); setTimeout(() => aviso('⚠️ No se pudo guardar: el almacenamiento del navegador está lleno. Borra partidas en Ajustes.'), 0); } });

/* ---------- utilidades de interfaz ---------- */
function aviso(texto, ms = 2400) {
  document.querySelectorAll('.toast').forEach(x => x.remove());
  const t = el('div', { class: 'toast', role: 'status' }, texto);
  document.body.append(t); setTimeout(() => t.remove(), ms);
}
// Avisos de logros nuevos (uno detrás de otro)
function avisarLogros(nuevos) { nuevos.forEach((d, k) => setTimeout(() => { aviso(`🏅 Logro: ${d.icono} ${d.nombre}`, 2800); son.play('ganar'); }, 600 + k * 3000)); }
const revisarLogros = () => avisarLogros(logros.revisar(CAT_IDS));
// Pedir un texto con la hoja modal (nombres del podio, palabra secreta del Ahorcado…). Devuelve null si se cancela.
function pedirTexto(titulo, { valor = '', max = 14, nota = '', tipo = 'text', placeholder = '' } = {}) {
  return new Promise(res => {
    const area = tipo === 'area';                                // texto largo de varias líneas (p. ej. un PGN)
    const inp = area ? el('textarea', { class: 'pedir', rows: '8', maxlength: String(max), placeholder, spellcheck: 'false', 'aria-label': titulo })
      : el('input', { class: 'pedir', type: tipo, maxlength: String(max), value: valor, placeholder, autocomplete: 'off', 'aria-label': titulo });
    if (area) inp.value = valor;
    let hecho = false, cerrar;
    const fin = v => { if (hecho) return; hecho = true; cerrar(); res(v); };
    const ok = el('button', { class: 'btn on', type: 'button', onclick: () => fin(inp.value) }, 'Aceptar');
    const no = el('button', { class: 'btn', type: 'button', onclick: () => fin(null) }, 'Cancelar');
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !area) { e.preventDefault(); fin(inp.value); } });
    cerrar = hoja([el('h2', {}, titulo), nota ? el('p', { class: 'note' }, nota) : null, inp, el('div', { class: 'bar', style: 'margin-top:12px' }, no, ok)], () => fin(null));
    setTimeout(() => { inp.focus(); inp.select(); }, 60);
  });
}
// Compartir un texto: hoja del sistema si existe; si no, al portapapeles.
async function compartir(texto) {
  const url = location.href.split('#')[0];
  try {
    if (navigator.share) { await navigator.share({ title: 'Juegos Reunidos', text: texto, url }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(texto + '\n' + url); aviso('📋 Copiado: pégalo donde quieras'); }
  catch { modal('Compartir', `<p>Copia este texto:</p><p><b>${esc(texto)}</b><br>${esc(url)}</p>`); }
}
function hoja(contenido, alCerrar = null) {
  const m = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, el('div', { class: 'hoja' }, contenido));
  let cerrada = false;
  const cerrar = () => { if (cerrada) return; cerrada = true; m.remove(); document.removeEventListener('keydown', esc_); if (alCerrar) alCerrar(); };
  const esc_ = e => { if (e.key === 'Escape' && [...document.querySelectorAll('.modal')].pop() === m) cerrar(); };   // con ventanas apiladas, Esc cierra solo la de encima
  m.addEventListener('click', e => { if (e.target === m) cerrar(); });
  document.addEventListener('keydown', esc_);
  document.body.append(m);
  return cerrar;
}
function modal(titulo, html) {
  const cuerpo = el('div', { class: 'cuerpo' }); cuerpo.innerHTML = html;
  const b = el('button', { class: 'btn on', style: 'margin-top:12px' }, 'Cerrar');
  const cerrar = hoja([el('h2', {}, titulo), cuerpo, b]); b.addEventListener('click', cerrar);
  return { cuerpo, cerrar };
}
function abrirMenu(lista) {
  if (!lista || !lista.length) return;
  let cerrar;
  const items = lista.map(it => el('button', { class: 'item' + (it.peligro ? ' danger' : ''), 'aria-pressed': it.activo == null ? false : String(!!it.activo), onclick: () => { cerrar(); it.accion(); } }, it.texto));
  cerrar = hoja([el('h2', {}, nombreVista), ...items]);
}

/* ---------- API que reciben los juegos ---------- */
function crearApi(j, ent, mod, root) {
  const id = j.id;
  let abrirAsp = null, defBarra = null;
  // Barra inferior común (Nuevo panel / Configurar / Apariencia / Pausa-Salir): cada juego la pide con api.barraHtml() al final de su pantalla de partida.
  const PANEL = ['sopa', 'crucigrama', 'rosco', 'ruleta', 'encadenadas', 'cifrasletras', 'ahorcado'];
  let celebrada = 0;
  function victoria() {
    if (aj.ajustes().celebrar === false || Date.now() - celebrada < 3000) return;
    celebrada = Date.now();
    setTimeout(() => {
      if (!root.isConnected) return;
      import('./core/victoria.js').then(m => { if (root.isConnected) m.celebrar({ etiqueta: etiquetaNueva(), nueva: defBarra && defBarra.nueva ? () => defBarra.nueva() : null }); }).catch(() => {});
    }, 900);
  }
  const etiquetaNueva = () => (defBarra && defBarra.etiqueta) || (j.categoria === 'logica' || PANEL.includes(id) ? 'Nuevo panel' : 'Nueva partida');
  // Pausa: el juego puede dar `pausar()/reanudar()` propios y/o `crono: () => cronómetro` (se para y se reanuda solo si estaba en marcha).
  const parar_ = () => {
    let c = null, activo = false;
    try { c = defBarra && defBarra.crono ? defBarra.crono() : null; activo = !!(c && c.activo); if (activo) c.pausar(); defBarra && defBarra.pausar && defBarra.pausar(); } catch (e) { console.error(e); }
    return origen => { try { if (activo && c && !c.activo) c.iniciar(); defBarra && defBarra.reanudar && defBarra.reanudar(origen); } catch (e) { console.error(e); } };
  };
  const pausaTemp = fn => { const seguir = parar_(); fn(() => seguir('aux')); };
  function abrirConfig() {
    const c = defBarra && defBarra.config; if (!c) return;
    if (c.pantalla) { c.pantalla(); return; }       // el juego usa su propia pantalla de configuración (la inicial)
    pausaTemp(volver => {
      const vals = { ...c.valores() }, cont = el('div', { class: 'cfg-cont' });
      let aplicado = false, cerrar;
      const pintar = () => {
        cont.replaceChildren(...c.grupos(vals).filter(g => g.visible !== false).map(g => el('div', { class: 'cfg-g' }, el('span', { class: 'lbl' }, g.titulo),
          g.desplegable
            ? el('select', { class: 'desplegable', 'data-ks': g.clave, 'aria-label': g.titulo }, ...g.opciones.map(([v, l]) => el('option', { value: JSON.stringify(v), selected: String(vals[g.clave]) === String(v) }, l)))
            : el('div', { class: 'seg' }, ...g.opciones.map(([v, l]) => el('button', { type: 'button', class: 'btn' + (String(vals[g.clave]) === String(v) ? ' on' : ''), 'data-k': g.clave, 'data-v': JSON.stringify(v) }, l))),
          g.nota ? el('small', { class: 'note' }, g.nota) : null)));
      };
      cont.addEventListener('click', e => {
        const b = e.target.closest('button[data-k]'); if (!b) return;
        vals[b.dataset.k] = JSON.parse(b.dataset.v); if (c.alCambiar) c.alCambiar(vals, b.dataset.k); pintar();
      });
      cont.addEventListener('change', e => { const sl = e.target.closest('select[data-ks]'); if (!sl) return; vals[sl.dataset.ks] = JSON.parse(sl.value); if (c.alCambiar) c.alCambiar(vals, sl.dataset.ks); pintar(); });
      pintar();
      const emp = el('button', { class: 'btn on', onclick: () => { aplicado = true; cerrar(); c.aplicar({ ...vals }); } }, '▶️ ' + etiquetaNueva());
      cerrar = hoja([el('h2', {}, '⚙️ Configurar partida'), el('p', { class: 'note' }, c.nota || 'Elige las opciones y empieza una partida nueva. La partida actual se abandona.'), cont,
        el('div', { class: 'bar', style: 'margin-top:14px' }, el('button', { class: 'btn', onclick: () => cerrar() }, 'Cancelar'), emp)], () => { if (!aplicado) volver(); });
    });
  }
  function preguntarSalir() {
    const seguir = parar_();
    let decidido = false, cerrar;
    const no = el('button', { class: 'btn on', onclick: () => { decidido = true; cerrar(); seguir('salir'); } }, 'No, seguir jugando');
    const si = el('button', { class: 'btn', onclick: () => { decidido = true; cerrar(); if (defBarra && defBarra.salir) defBarra.salir(); else location.hash = j.categoria ? '#/cat/' + j.categoria : '#/'; } }, 'Sí, salir');
    const extra = itemsExtra();
    const mas = extra.length ? el('button', { class: 'btn', style: 'width:100%;margin-top:10px', onclick: () => { decidido = true; cerrar(); seguir('salir'); setTimeout(() => abrirMenu(extra), 0); } }, '⋯ Más opciones del juego') : null;
    cerrar = hoja([el('h2', {}, '⏸️ Partida en pausa'), el('p', {}, '¿Salir de la partida?'), el('div', { class: 'bar', style: 'margin-top:14px' }, si, no), mas], () => { if (!decidido) seguir('salir'); });
  }
  return {
    barra(def) { defBarra = def; },
    barraHtml() {
      return `<div class="barra-gen" role="group" aria-label="Controles de la partida"><button type="button" data-gen="nueva"><span aria-hidden="true">🆕</span>${esc(etiquetaNueva())}</button><button type="button" data-gen="config"><span aria-hidden="true">⚙️</span>Configurar partida</button>${abrirAsp ? '<button type="button" data-gen="aspecto"><span aria-hidden="true">🎨</span>Apariencia</button>' : ''}<button type="button" data-gen="reglas"><span aria-hidden="true">📖</span>Reglas</button><button type="button" data-gen="salir"><span aria-hidden="true">⏸️</span>Pausa / Salir</button></div>`;
    },
    gen(ac) {
      if (!defBarra) return;
      if (ac === 'nueva') { if (defBarra.nueva) defBarra.nueva(); }
      else if (ac === 'config') abrirConfig();
      else if (ac === 'aspecto') { if (abrirAsp) pausaTemp(volver => abrirAsp(volver)); }
      else if (ac === 'reglas') { const r = itemReglas(); if (r) r.accion(); }
      else if (ac === 'salir') preguntarSalir();
    },
    id, root,
    cargar() { if (!ent) return null; try { return mod.validar(ent.datos) || null; } catch { return null; } },
    guardar: (datos, resumen = null, fin = false) => store.setJuego(id, datos, resumen, fin),
    borrar: () => store.borrarJuego(id),
    registrar: r => { stats.registrar(id, r); revisarLogros(); if (r && r.res === 'victoria') victoria(); },
    // Victoria: mensaje y animación al azar con el botón de nueva partida (core/victoria.js), común a todos los juegos.
    // Se lanza sola con registrar({ res: 'victoria' }); los modos sin CPU (2 jugadores) que no puntúan llaman a api.victoria() al acabar con ganador.
    victoria,
    record: variante => stats.record(id, variante),
    pref: (k, d) => aj.pref(id, k, d), setPref: (k, v) => aj.setPref(id, k, v),
    sonido: son.play, vibrar: son.vibrar,
    confirmar: txt => window.confirm(txt),
    aviso, modal, pedirTexto,
    compartir: texto => compartir(texto),
    titulo: t => { nombreVista = t; },
    // El menú de cada juego lleva al final «Compartir resultado» (texto del resumen de la partida guardada).
    menu(items) {
      menuItems = (items || []).slice();
      if (menuItems.length) menuItems.push({ texto: '📤 Compartir resultado', accion: () => {
        const r = store.getResumen(id);
        compartir(`${j.icono} ${j.nombre}${r && r.resumen ? ': ' + r.resumen + (r.fin ? '' : ' (en juego)') : ''} · Juegos Reunidos`);
      } });
    },
    // Reto del día: el mismo tablero para todo el mundo (generado con semilla fecha + juego)
    reto: {
      fecha: () => hoy(),
      texto: f => fechaLarga(f || hoy()),
      generar: (fn, f = hoy()) => conSemilla(`${f}:${id}`, fn),
      generarAsync: (fn, f = hoy()) => conSemillaAsync(`${f}:${id}`, fn),
      hecho: (f = hoy()) => logros.retoHecho(f, id),
      completar(f = hoy()) {
        if (logros.retoHecho(f, id)) return false;
        logros.marcarReto(f, id); revisarLogros(); return true;
      },
    },
    // Tabla local de los 10 mejores (juegos arcade). menos=true: gana el valor más bajo (tiempos).
    podio: {
      lista: v => { const P = store.leer('podio:' + id, {}) || {}; return Array.isArray(P[v]) ? P[v] : []; },
      entra(v, valor, menos = false) { const l = this.lista(v); return valor > 0 && (l.length < 10 || (menos ? valor < l[l.length - 1].p : valor > l[l.length - 1].p)); },
      async anotar(v, valor, menos = false) {
        if (!this.entra(v, valor, menos)) return -1;
        const n = await pedirTexto('🏆 ¡Entras en el podio!', { valor: aj.pref('_', 'nombre', ''), nota: 'Escribe tu nombre para la tabla de los 10 mejores.', placeholder: 'Tu nombre' });
        const nombre = (n == null ? '' : n).trim().slice(0, 14) || 'Anónimo';
        if (n != null && n.trim()) aj.setPref('_', 'nombre', nombre);
        const P = store.leer('podio:' + id, {}) || {}, l = Array.isArray(P[v]) ? P[v] : [], f = Date.now();
        l.push({ n: nombre, p: valor, f }); l.sort((a, b) => (menos ? a.p - b.p : b.p - a.p) || a.f - b.f);
        P[v] = l.slice(0, 10); store.escribir('podio:' + id, P);
        return P[v].findIndex(x => x.f === f);
      },
      html(v, { formato = x => x.toLocaleString('es-ES'), marcar = -1 } = {}) {
        const l = this.lista(v); if (!l.length) return '<p class="note">Todavía no hay puntuaciones.</p>';
        return `<ol class="podio">${l.map((x, k) => `<li class="${k === marcar ? 'yo' : ''}"><span>${['🥇', '🥈', '🥉'][k] || k + 1 + '.'}</span><b>${esc(x.n)}</b><i>${formato(x.p)}</i><small>${new Date(x.f).toLocaleDateString('es-ES')}</small></li>`).join('')}</ol>`;
      },
    },
    aspecto(defs, alCambiar) {
      // `elec` = lo elegido y guardado (puede ser «azar»); `vals` = lo que se aplica de verdad (data-<clave> y asp.valores).
      defs = defs.filter(g => g.opciones.some(o => !o.azar && !o.nada) || !g.opciones.some(o => o.azar));   // sin imágenes que sortear, el grupo se oculta
      // Grupos propios «Forma de las fichas» (enEstilos) se integran en el desplegable «Estilos de Fichas» si el juego lo tiene.
      defs.forEach(g => { if (g.clave === 'vista') g.oculto = true; });                // 2D/3D: ya está el botón flotante de la esquina superior izquierda
      // `junto: clave` = este grupo se une, como subgrupo, al desplegable de otro grupo (p. ej. los edificios 2D y 3D de Magnate).
      defs.filter(g => g.junto).forEach(g => { const d = defs.find(x => x.clave === g.junto); if (d) { d.sub = d.sub || [d]; d.sub.push(g); g.oculto = true; } });
      // «Tapete y Tablero»: el tapete (imagen de fondo) y el color del tablero (grupos marcados con `tt`) comparten un único desplegable.
      const tts = defs.filter(g => g.tt).sort((x, y) => (/tapete|mesa/.test(y.clave) ? 1 : 0) - (/tapete|mesa/.test(x.clave) ? 1 : 0));
      if (tts.length > 1) { tts.forEach(g => { if (!g.etiqueta) g.etiqueta = /tapete|mesa/.test(g.clave) ? 'Tapete' : 'Tablero'; }); tts[0].sub = tts; tts[0].titulo = tts[0].ttTitulo || 'Tapete y Tablero'; tts[0].icono = '🖼️'; tts.slice(1).forEach(g => { g.oculto = true; }); }
      const est = defs.find(g => g.sub && g.estilos);
      if (est) defs.filter(g => g.enEstilos).forEach(g => { est.sub.splice(Math.min(1, est.sub.length), 0, g); g.oculto = true; });
      const gd = aj.pref(id, 'aspecto', {}) || {}, elec = {}, vals = {};
      const resolver = nuevo => defs.forEach(g => {
        if (elec[g.clave] !== 'azar') { vals[g.clave] = elec[g.clave]; return; }
        if (!nuevo && vals[g.clave]) return;
        const az = g.opciones.find(o => o.azar), l = g.opciones.filter(o => !o.azar && !o.nada && (!az || !az.solo || az.solo.includes(o.id))), c = l.length > 1 ? l.filter(o => o.id !== vals[g.clave]) : l;   // distinta de la anterior
        vals[g.clave] = c[Math.random() * c.length | 0].id;
      });
      // Grupo con `sel` («Fondo de Tablero»): la imagen elegida va a --tapete-url y una regla de <style> la pone detrás del tablero del juego.
      const gFs = defs.filter(g => g.sel !== undefined), gF = gFs[0];
      let stF = document.getElementById('jr-tapete-sel'); if (!stF) { stF = document.createElement('style'); stF.id = 'jr-tapete-sel'; document.head.append(stF); }
      stF.textContent = gFs.filter(g => g.sel).map((g, k, arr) => { const despues = gFs.slice(gFs.indexOf(g) + 1).map(x => `:not([data-${x.clave}^="t-"])`).join(''); return `.juego[data-${g.clave}^="t-"]${despues}${g.sel === 'raiz' ? '' : ' ' + g.sel}{background:var(--tapete-url) center/cover no-repeat!important;padding:6px;box-sizing:border-box;border-radius:14px}`; }).join('\n');
      const poner = () => {
        defs.forEach(g => { root.dataset[g.clave] = vals[g.clave]; }); precargarSeleccion(vals);
        let t = null; for (const g of gFs) { const x = buscarFondo(vals[g.clave]); if (x) t = x; }       // «Fondo de Pantalla» (último grupo) pasa por delante del «Tapete»
        if (t) root.style.setProperty('--tapete-url', `url("${urlTapete(t)}")`); else root.style.removeProperty('--tapete-url');
      };
      defs.forEach(g => { elec[g.clave] = g.opciones.some(o => o.id === gd[g.clave]) ? gd[g.clave] : g.def; });
      resolver(true); poner();
      const guardar = () => aj.setPref(id, 'aspecto', { ...elec });
      const refrescarVista = () => { if (btnVista) { const es3 = vals.vista === '3d'; btnVista.textContent = es3 ? '🔲 Ver en 2D' : '🧊 Ver en 3D'; btnVista.setAttribute('aria-label', es3 ? 'Cambiar a la vista 2D' : 'Cambiar a la vista 3D'); } };
      quitarVista();
      if (defs.some(g => g.clave === 'vista')) {
        btnVista = el('button', { type: 'button', class: 'btn vista-flot' }); document.body.append(btnVista); root.classList.add('con-vista'); posVista(); refrescarVista();
        btnVista.addEventListener('click', () => { elec.vista = vals.vista === '3d' ? '2d' : '3d'; delete vals.vista; resolver(false); poner(); guardar(); refrescarVista(); if (alCambiar) alCambiar({ ...vals }); });
      }
      // 🎨 Apariencia (igual en todos los juegos): una ventana con una sección desplegable por grupo (se abre una a la vez).
      // Cada sección muestra sus opciones como botones, muestras de color, iconos o miniaturas de imagen, según el grupo.
      const abrir = (alCerrarV) => {
        const boton = (g, o) => el('button', { type: 'button', class: 'btn ap-o' + (o.emoji ? ' ap-e' : '') + (elec[g.clave] === o.id ? ' on' : ''), 'data-g': g.clave, 'data-o': o.id, ...(o.emoji || g.soloColor ? { title: o.nombre, 'aria-label': o.nombre } : {}) },
          ...(o.emoji ? [o.emoji] : [...(o.sw || []).map(c => el('i', { class: 'sw', style: `background:${c}` })), ...(g.soloColor ? [] : [o.nombre])]));
        const actual = g => g.opciones.find(x => x.id === elec[g.clave]) || g.opciones[0];
        const resumenSec = new Map();
        const pintarResumen = g => {
          const o = actual(g), r = resumenSec.get(g.clave); if (!r) return;
          if (g.sub) { r.replaceChildren(el('span', { class: 'ap-li' }, g.icono || '🎨'), el('b', {}, g.titulo), el('small', {}, g.sub.map(sg => { const x = actual(sg); return (x.emoji ? x.nombre.replace(x.emoji, '').trim() : x.nombre) || x.nombre; }).join(' · '))); return; }
          if (g.multi) { r.replaceChildren(el('span', { class: 'ap-li' }, g.icono || '🎨'), el('b', {}, g.titulo), el('small', { class: 'ap-mres' }, ...g.multi.map(sg => { const x = sg.opciones.find(q => q.id === elec[sg.clave]); return x && x.sw ? el('i', { class: 'sw', style: `background:${x.sw[0]}` }) : el('i', { class: 'sw orig' }, '↩'); }))); return; }
          const ico = g.icono ? el('span', { class: 'ap-li' }, g.icono) : o.emoji ? el('span', { class: 'ap-li' }, o.emoji) : o.sw ? el('span', { class: 'ap-lsw' }, ...o.sw.map(c => el('i', { class: 'sw', style: `background:${c}` }))) : el('span', { class: 'ap-li' }, '🎨');
          r.replaceChildren(ico, el('b', {}, g.titulo), el('small', {}, g.soloColor && o.sw ? '' : o.emoji ? o.nombre.replace(o.emoji, '').trim() || o.nombre : o.nombre));
        };
        const elegir = (g, idO) => { elec[g.clave] = idO; delete vals[g.clave]; resolver(false); poner(); guardar(); refrescarVista(); pintarResumen(g); const r = alCambiar && alCambiar({ ...vals }); if (r && r.volver) { Object.assign(elec, r.volver); defs.forEach(x => { if (x.clave in r.volver) delete vals[x.clave]; }); resolver(false); poner(); guardar(); pintarResumen(g); } };
        // Sección única de color para varios bandos: leyenda (quién es cada color) + una sola paleta; un color elegido por un bando no puede repetirse en otro.
        const cuerpoMulti = g => {
          const slots = g.multi; let act = 0; const cont = el('div', { class: 'ap-multi' });
          const pintar = () => {
            const usados = new Set(slots.map(x => elec[x.clave]).filter(x => x !== 'original')), sg = slots[act];
            cont.replaceChildren(
              el('div', { class: 'ap-ley', role: 'group', 'aria-label': 'Leyenda de colores' }, ...slots.map((x, i) => { const q = x.opciones.find(z => z.id === elec[x.clave]);
                return el('button', { type: 'button', class: 'ap-slot' + (i === act ? ' on' : ''), 'data-s': i }, q && q.sw ? el('i', { class: 'sw', style: `background:${q.sw[0]}` }) : el('i', { class: 'sw orig' }, '↩'), el('span', {}, g.leyenda[i])); })),
              el('small', { class: 'ap-sec' }, `Elige el color de: ${g.leyenda[act]}`),
              el('div', { class: 'seg' }, ...sg.opciones.map(o => { const b = boton(sg, o); if (o.id !== 'original' && usados.has(o.id) && elec[sg.clave] !== o.id) { b.classList.add('dis'); b.disabled = true; b.title = o.nombre + ' (ya en uso)'; } return b; })));
          };
          cont.addEventListener('click', e => {
            const sl = e.target.closest('.ap-slot'); if (sl) { act = +sl.dataset.s; pintar(); return; }
            const b = e.target.closest('.ap-o'); if (!b || b.disabled) return;
            elegir(slots[act], b.dataset.o); pintarResumen(g); if (act < slots.length - 1) act++; pintar();
          });
          pintar(); return cont;
        };
        // Varios grupos en un solo desplegable («Estilos de Fichas», «Estilos de Dados»): cada subgrupo con su rótulo.
        const cuerpoSub = g => {
          const cont = el('div', { class: 'ap-sub' });
          for (const sg of g.sub) {
            const cu = cuerpoDe(Object.assign(Object.create(sg), { sub: null })); cu.classList.add('ap-cuerpo');
            cu.addEventListener('click', e => {
              const b = e.target.closest('.ap-o, .ap-ficha'); if (!b || b.dataset.o == null) return;
              elegir(sg, b.dataset.o); cu.querySelectorAll('.ap-o,.ap-ficha').forEach(x => x.classList.toggle('on', x.dataset.o === elec[sg.clave])); pintarResumen(g);
            });
            cont.append(el('small', { class: 'ap-sec' }, sg.etiqueta || sg.titulo), cu);
          }
          return cont;
        };
        const cuerpoDe = g => {
          if (g.multi) return cuerpoMulti(g);
          if (g.sub) return cuerpoSub(g);
          const imgs = g.opciones.some(o => o.img) && g.forma;
          if (imgs) return el('div', { class: 'ap-rej ap-' + g.forma }, ...g.opciones.map(o => el('button', { type: 'button', class: 'ap-ficha' + (elec[g.clave] === o.id ? ' on' : ''), 'data-o': o.id, title: o.nombre },
            o.img ? el('img', { src: o.img, alt: '', loading: 'lazy' }) : el('span', { class: 'ap-azar' }, o.icono || (o.nada ? '🚫' : '🎲')), el('small', {}, o.nombre))));
          const out = []; let sec = null;
          for (const o of g.opciones) { if (o.sec && o.sec !== sec) { sec = o.sec; out.push(el('small', { class: 'ap-sec' }, sec)); } out.push(boton(g, o)); }
          return el('div', { class: g.opciones.some(o => o.emoji) ? 'ap-emojis' : 'seg' }, out);
        };
        const secciones = defs.filter(g => !g.oculto).map(g => {
          const det = el('details', { class: 'ap-det' }), sum = el('summary', { class: 'ap-link' }); resumenSec.set(g.clave, sum); pintarResumen(g);
          const cuerpo = cuerpoDe(g); cuerpo.classList.add('ap-cuerpo');
          if (!g.multi && !g.sub) cuerpo.addEventListener('click', e => {
            const b = e.target.closest('.ap-o, .ap-ficha'); if (!b) return;
            const idO = b.dataset.o; if (idO == null) return;
            elegir(g, idO); cuerpo.querySelectorAll('.ap-o,.ap-ficha').forEach(x => x.classList.toggle('on', x.dataset.o === elec[g.clave]));
          });
          det.append(sum, cuerpo);
          det.addEventListener('toggle', () => { if (det.open) secciones_.forEach(d => { if (d !== det) d.open = false; }); });
          return det;
        });
        const secciones_ = secciones; if (secciones.length === 1) secciones[0].open = true;
        const wrap = el('div', { class: 'ap-acordeon' }, ...secciones);
        let cerrar;
        const rest = el('button', { class: 'btn', onclick: () => { defs.forEach(g => { elec[g.clave] = g.def; delete vals[g.clave]; }); resolver(true); poner(); guardar(); refrescarVista(); if (alCambiar) alCambiar({ ...vals }); cerrar(); } }, 'Restablecer');
        const ok = el('button', { class: 'btn on', onclick: () => cerrar() }, 'Listo');
        cerrar = hoja([el('h2', {}, '🎨 Apariencia'), wrap, el('div', { class: 'bar', style: 'margin-top:14px' }, rest, ok)], typeof alCerrarV === 'function' ? alCerrarV : null);
      };
      abrirAsp = abrir;
      return { valores: vals, abrir, sortear() { resolver(true); poner(); }, elegida: c => elec[c], elegir(c, v) { elec[c] = v; delete vals[c]; resolver(false); poner(); guardar(); } };   // sortear(): nueva baraja/dorso al azar (partida nueva)
    },
    css(url) {
      const href = String(url);
      if ([...document.querySelectorAll('link[data-juego]')].some(l => l.href === href)) return Promise.resolve();
      // Las hojas de /css/ (cartas.css) son compartidas; las de cada juego solo se activan mientras ese juego está abierto.
      const comun = new URL(href).pathname.includes('/css/');
      return new Promise(res => { const l = el('link', { rel: 'stylesheet', href, 'data-juego': comun ? '*' : id }); l.onload = l.onerror = () => res(); document.head.append(l); });
    },
  };
}

/* ---------- rutas ---------- */
function ruta() {
  const rutaHash = location.hash.replace(/^#\/?/, '').split('?')[0];
  const [a, b] = rutaHash.split('/');
  if (a === 'juego' && JUEGOS.some(j => j.id === b)) return { v: 'juego', id: b, cat: JUEGOS.find(j => j.id === b).categoria };
  if (a === 'cat' && Object.keys(CATEGORIAS).includes(b)) return { v: 'inicio', cat: b };
  return { v: a === 'stats' || a === 'ajustes' ? a : 'inicio', cat: null };
}
// Botón flotante 2D/3D (solo en los juegos con grupo de Apariencia «vista»): cambia de vista al instante desde cualquier punto de la pantalla.
let btnVista = null;
const quitarVista = () => { if (btnVista) { btnVista.remove(); btnVista = null; } };
const posVista = () => { const t = document.querySelector('.top'); if (btnVista && t) btnVista.style.top = Math.round(t.getBoundingClientRect().bottom + 8) + 'px'; };
window.addEventListener('resize', posVista);
async function cerrarJuego() {
  quitarVista();
  if (!actual) return;
  const a = actual; actual = null;
  try { await a.mod.unmount?.(); } catch (e) { console.error(e); }
  menuItems = [];
}
async function render() {
  const t = ++token;
  await cerrarJuego();
  const r = ruta();
  // Dentro de un juego queda marcada la pestaña de su categoría
  nav.innerHTML = RUTAS.map(([k, ic, tx, h]) => {
    const activa = k === 'cat-' + (r.cat || '') ? (r.v === 'inicio' || r.v === 'juego') : k === r.v;
    return `<a href="${h}" class="${activa ? 'on' : ''}" ${activa ? 'aria-current="page"' : ''}><span aria-hidden="true">${ic}</span><b>${tx}</b></a>`;
  }).join('');
  app.innerHTML = '';
  document.body.classList.toggle('fijo', r.v === 'inicio');
  document.body.classList.toggle('fondo', r.v === 'stats' || r.v === 'ajustes');   // mismo fondo que las categorías          // inicio y categorías: pantalla fija, sin desplazamiento
  if (r.v === 'juego') return abrirJuego(r.id, t);
  if (r.v === 'inicio') vInicio(r.cat); else ({ stats: vStats, ajustes: vAjustes })[r.v]();
  window.scrollTo(0, 0);
}
async function abrirJuego(id, t) {
  const j = JUEGOS.find(x => x.id === id);
  nombreVista = j.nombre; cabTxt(j.nombre);
  app.innerHTML = '<p class="note">Cargando…</p>';
  let mod;
  await cargarBarajas();                       // índice de barajas/dorsos de imagen (no falla: sin él solo salen las cartas dibujadas)
  try { mod = await j.cargar(); } catch (e) { console.error(e); if (t === token) app.innerHTML = '<p class="msg err">No se pudo cargar el juego. Comprueba la conexión y recarga.</p>'; return; }
  if (t !== token) return;
  // Desactiva las hojas de estilo de otros juegos abiertos antes (evita choques de nombres de clase) y reactiva las de este.
  document.querySelectorAll('link[data-juego]').forEach(l => { l.disabled = !(l.dataset.juego === '*' || l.dataset.juego === id); });
  const root = el('div', { class: 'juego juego-' + id });
  app.innerHTML = ''; app.append(root);
  const api = crearApi(j, store.getJuego(id), mod, root);
  actual = { j, mod, api };
  window.scrollTo(0, 0);                                    // arriba al entrar (antes de montar: un montaje lento no debe devolver al jugador arriba cuando ya ha bajado)
  try { await mod.mount(root, api); } catch (e) { console.error(e); root.innerHTML = '<p class="msg err">Error al abrir el juego.</p>'; }
}
window.addEventListener('hashchange', render);
/* Deslizar a izquierda/derecha cambia de pantalla en el orden del menú superior (Lógica → … → Ajustes).
   En una partida solo cuenta si el gesto empieza en el fondo (no sobre tableros, botones, campos ni lienzos) y es claramente horizontal. */
(() => {
  let t0 = null;
  const INTERACTIVO = 'button,a,input,select,textarea,canvas,label,summary,[role=button],[tabindex],[draggable=true],.e3d,.ck,.hoja,.modal,.flotante,[class*=tab],[class*=tablero],[class*=rejilla],[class*=grid]';
  const desplazable = n => { for (; n && n !== document.body; n = n.parentElement) { const o = getComputedStyle(n).overflowX; if ((o === 'auto' || o === 'scroll') && n.scrollWidth > n.clientWidth + 2) return true; } return false; };
  document.addEventListener('touchstart', e => {
    t0 = null; if (e.touches.length !== 1 || document.querySelector('.hoja,.modal,.htmodal,.flotante')) return;
    const r = ruta(), tg = e.target; if (!(tg instanceof Element)) return;
    if (r.v === 'juego' && (tg.closest(INTERACTIVO) || desplazable(tg))) return;
    if (r.v !== 'juego' && desplazable(tg)) return;
    t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), r };
  }, { passive: true });
  document.addEventListener('touchend', e => {
    const g = t0; t0 = null; if (!g || !e.changedTouches.length) return;
    const dx = e.changedTouches[0].clientX - g.x, dy = e.changedTouches[0].clientY - g.y;
    if (Date.now() - g.t > 700 || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
    const id = g.r.v === 'juego' ? 'cat-' + g.r.cat : g.r.v === 'inicio' ? (g.r.cat ? 'cat-' + g.r.cat : null) : g.r.v;
    const i = RUTAS.findIndex(x => x[0] === id); if (i < 0) return;
    const n = RUTAS[i + (dx < 0 ? 1 : -1)]; if (n) location.hash = n[3];
  }, { passive: true });
})();
app.addEventListener('click', e => { const b = e.target.closest('[data-grupo]'); if (b) elegirJuego(b.dataset.grupo); const g = e.target.closest('[data-gen]'); if (g && actual) actual.api.gen(g.dataset.gen); });

/* ---------- inicio ---------- */
function enCursoDe(j) { const e = store.getResumen(j.id); return e && !e.fin && e.resumen ? e : null; }
function ficha(j) {
  const e = store.getResumen(j.id);
  const curso = e && !e.fin && e.resumen;
  const sub = curso ? 'Continuar · ' + esc(e.resumen) : e && e.fin && e.resumen ? esc(e.resumen) : esc(j.descripcion);
  return `<a class="ficha ${curso ? 'curso' : ''}" href="#/juego/${j.id}" style="--c:${j.color}"><span class="ico" aria-hidden="true">${j.icono}</span><b>${esc(j.nombre)}</b><small>${sub}</small></a>`;
}
// Ficha de un grupo de juegos: al pulsarla se abre la ventana para elegir uno
function fichaGrupo(g, js) {
  const cur = js.filter(enCursoDe), sub = cur.length ? 'Continuar · ' + esc(cur.map(j => j.nombre).join(' · ')) : esc(js.map(j => j.nombre).join(' · '));
  return `<button type="button" class="ficha ${cur.length ? 'curso' : ''}" data-grupo="${g.id}" style="--c:${g.color}" aria-haspopup="dialog"><span class="ico" aria-hidden="true">${g.icono}</span><b>${esc(g.nombre)}</b><small>${sub}</small></button>`;
}
function elegirJuego(gid) {
  const g = GRUPOS.find(x => x.id === gid); if (!g) return;
  const js = g.juegos.map(id => JUEGOS.find(x => x.id === id));
  const opciones = js.map(j => { const e = store.getResumen(j.id), cur = e && !e.fin && e.resumen;
    return `<a class="eleg" href="#/juego/${j.id}" data-cerrar style="--c:${j.color}"><span class="ico" aria-hidden="true">${j.icono}</span><span class="eleg-t"><b>${esc(j.nombre)}</b><small>${cur ? 'Continuar · ' + esc(e.resumen) : esc(j.descripcion)}</small></span><i aria-hidden="true">›</i></a>`; }).join('');
  const cerrar = hoja([el('h2', {}, `${g.icono} ${g.nombre}`), el('p', { class: 'note' }, '¿A qué quieres jugar?'), (() => { const d = el('div', { class: 'elegir' }); d.innerHTML = opciones; d.addEventListener('click', e => { if (e.target.closest('[data-cerrar]')) cerrar(); }); return d; })(),
    el('div', { class: 'bar', style: 'margin-top:12px' }, el('button', { class: 'btn', onclick: () => cerrar() }, 'Cancelar'))]);
}
// Inicio por categorías plegables: solo se abre una a la vez y se recuerda la última abierta.
const COLOR_CAT = { logica: '#6B4DE0', tablero: '#E0553D', cartas: '#C8243E', palabras: '#D98A00', arcade: '#2F6BFF' };
const ICONO_CAT = { logica: '🧠', tablero: '🎲', cartas: '🃏', palabras: '🔤', arcade: '🕹️' };
function vInicio(filtro = null) {
  const nombreFiltro = filtro ? CATEGORIAS[filtro] : null;
  nombreVista = nombreFiltro || 'Juegos Reunidos'; cabTxt('Juegos Reunidos');
  const cats = Object.entries(CATEGORIAS).filter(([k]) => JUEGOS.some(j => j.categoria === k) && (!filtro || filtro === k));
  if (!filtro) {                                                    // Pantalla de inicio: el logo de fondo y las categorías a todo el alto (sin desplazamiento)
    app.innerHTML = `<div class="ini" role="navigation" aria-label="Categorías de juegos">${cats.map(([k, n]) => {
      const js = JUEGOS.filter(j => j.categoria === k), enCurso = js.filter(j => { const e = store.getResumen(j.id); return e && !e.fin && e.resumen; }).length;
      return `<a class="ini-cat" href="#/cat/${k}" style="--c:${COLOR_CAT[k] || '#6B4DE0'}"><span class="ini-ico" aria-hidden="true">${ICONO_CAT[k] || '🎮'}</span><span class="ini-t"><b>Juegos de ${esc(n)}</b><small>${js.length} juegos${enCurso ? ` · ${enCurso} en curso` : ''}</small></span><span class="ini-fl" aria-hidden="true">›</span></a>`;
    }).join('')}</div>`;
    return;
  }
  const grupos = cats.map(([k, n]) => {
    const es = entradas(k), js = JUEGOS.filter(j => j.categoria === k);
    const enCurso = js.filter(j => { const e = store.getResumen(j.id); return e && !e.fin && e.resumen; }).length;
    return `<section class="cat-seccion" data-cat="${k}">
      <h2 class="cat"><span class="cico" aria-hidden="true">${ICONO_CAT[k] || '🎮'}</span><span class="cnom">${esc(n)}</span>${enCurso ? `<span class="cact" title="Partidas en curso">${enCurso} en curso</span>` : ''}</h2>
      <div class="rejilla">${es.map(x => x.tipo === 'grupo' ? fichaGrupo(x.g, x.js) : ficha(x.j)).join('')}</div></section>`;
  }).join('');
  app.innerHTML = grupos + '';
}

/* ---------- estadísticas ---------- */
function vStats(catSel = null) { const y = scrollY; vStats_(catSel); if (ruta().v === 'stats') scrollTo(0, y); }
function vStats_(catSel = null) {
  nombreVista = 'Estadísticas'; cabTxt('Juegos Reunidos');
  const T = stats.todas();
  revisarLogros();
  const G = logros.conseguidos(), defs = logros.definiciones(CAT_IDS), nG = defs.filter(d => G[d.id]).length;
  const R = logros.todosRetos(), diasR = Object.values(R).filter(l => Array.isArray(l) && l.length).length, totR = Object.values(R).reduce((a, l) => a + (Array.isArray(l) ? l.length : 0), 0);
  const retosHoy = (R[hoy()] || []).map(id => JUEGOS.find(j => j.id === id)).filter(Boolean);
  const panelLogros = `<details class="panel plog"><summary><h3>🏅 Logros · ${nG}/${defs.length}</h3><span class="plogi">${defs.filter(d => G[d.id]).map(d => d.icono).join('') || `<small>Toca para ver los ${defs.length} logros</small>`}</span></summary><div class="logros">${defs.map(d => `<div class="logro ${G[d.id] ? 'on' : ''}" title="${esc(d.desc)}"><span>${G[d.id] ? d.icono : '🔒'}</span><b>${esc(d.nombre)}</b><small>${esc(d.desc)}</small></div>`).join('')}</div></details>
    <div class="panel"><h3>📅 Retos del día</h3><p class="note">${totR ? `Has completado ${totR} reto${totR === 1 ? '' : 's'} en ${diasR} día${diasR === 1 ? '' : 's'}.` : 'Sudoku, Nonogram, Bombardeo, Calcudoku, CruciSumas, Encajados, Sopa de letras, Crucigramas y Números y Letras tienen un «Reto del día»: el mismo tablero para todo el mundo.'}${retosHoy.length ? ` Hoy: ${retosHoy.map(j => j.icono + ' ' + esc(j.nombre)).join(', ')}.` : ''}</p></div>`;
  const cats = Object.entries(CATEGORIAS).filter(([k]) => JUEGOS.some(j => j.categoria === k));
  const solicitada = catSel || new URLSearchParams(location.hash.split('?')[1] || '').get('categoria');
  const elegida = cats.some(([k]) => k === solicitada) ? solicitada : cats[0]?.[0];
  const tabs = `<div class="stats-tabs" role="tablist" aria-label="Categorías de estadísticas">${cats.map(([k, n]) => `<button type="button" role="tab" class="stats-tab ${k === elegida ? 'on' : ''}" aria-selected="${k === elegida}" data-stat-cat="${k}"><span>${ICONO_CAT[k] || '🎮'}</span>${n}</button>`).join('')}</div>`;
  // Fichas pequeñas de los juegos de la categoría; al pulsar una se abre su estadística en una ventana
  const tabla = j => {
    const s = T[j.id];
    if (!s || !s.partidas) return '<p class="note">Todavía sin partidas terminadas.</p>';
    const tiempos = Object.entries(s.tiempos || {}).map(([k, v]) => `<tr><td>Mejor tiempo · ${esc(k)}</td><td>${fmtTiempo(v)}</td></tr>`).join('')
      + Object.entries(s.records || {}).map(([k, v]) => `<tr><td>🏆 Récord · ${esc(k)}</td><td>${v.toLocaleString('es-ES')}</td></tr>`).join('');
    return `<table class="tabla">
      <tr><td>Partidas</td><td>${s.partidas}</td></tr>
      ${s.victorias || s.derrotas || s.tablas ? `<tr><td>Victorias · derrotas · tablas</td><td>${s.victorias} · ${s.derrotas} · ${s.tablas}</td></tr><tr><td>Racha actual · mejor racha</td><td>${s.racha} · ${s.mejorRacha}</td></tr>` : ''}
      ${tiempos}</table>`;
  };
  const cards = JUEGOS.filter(j => j.categoria === elegida).map(j => {
    const s = T[j.id], n = s && s.partidas ? s.partidas : 0;
    return `<button type="button" class="st-ficha ${n ? '' : 'vacia'}" data-stat-juego="${j.id}" style="--c:${j.color}" aria-haspopup="dialog"><span class="st-i" aria-hidden="true">${j.icono}</span><b>${esc(j.nombre)}</b><small>${n ? n + (n === 1 ? ' partida' : ' partidas') : 'sin partidas'}</small></button>`;
  }).join('');
  app.innerHTML = panelLogros + tabs + `<div class="stats-fichas">${cards || '<p class="note">No hay juegos en esta categoría.</p>'}</div><div class="bar stats-reset-actions"><button class="btn danger" id="stResetCat">Reiniciar estadísticas de ${esc(elegida ? CATEGORIAS[elegida] : 'esta categoría')}</button><button class="btn danger" id="stResetAll">Reiniciar Todas las Estadísticas</button></div><p class="note">Los 🏅 logros ya conseguidos no se pierden al reiniciar las estadísticas.</p>`;
  app.querySelectorAll('[data-stat-cat]').forEach(b => b.addEventListener('click', () => {
    history.replaceState(null, '', '#/stats?categoria=' + b.dataset.statCat);      // sin cambiar de pantalla: no salta el scroll
    const y = scrollY; vStats(b.dataset.statCat); scrollTo(0, y);
  }));
  app.querySelectorAll('[data-stat-juego]').forEach(b => b.addEventListener('click', () => {
    const j = JUEGOS.find(x => x.id === b.dataset.statJuego); if (!j) return;
    const cerrar = hoja([el('h2', {}, `${j.icono} ${j.nombre}`), (() => { const d = el('div', { class: 'cuerpo' }); d.innerHTML = tabla(j); return d; })(), el('div', { class: 'bar', style: 'margin-top:12px' }, el('button', { class: 'btn on', onclick: () => cerrar() }, 'Cerrar'))]);
    const h = [...document.querySelectorAll('.modal > .hoja')].pop(); if (h) h.classList.add('hoja-img');
  }));
  $('#stResetCat').addEventListener('click', () => {
    const nombre = CATEGORIAS[elegida] || 'esta categoría';
    if (!confirm(`¿Borrar únicamente las estadísticas de ${nombre}? Las demás categorías se conservarán.`)) return;
    const idsCategoria = new Set(JUEGOS.filter(j => j.categoria === elegida).map(j => j.id));
    const restantes = Object.fromEntries(Object.entries(stats.todas()).filter(([id]) => !idsCategoria.has(id)));
    stats.importar(restantes);
    vStats();
  });
  $('#stResetAll').addEventListener('click', () => {
    if (confirm('¿Borrar todas las estadísticas de todas las categorías? Esta acción no se puede deshacer.')) { stats.reiniciar(); vStats(); }
  });
}

/* ---------- ajustes y copia de seguridad ---------- */
let msgAj = { t: '', err: false };
// Ajustes → «Sin conexión»: cuántos juegos están guardados en el móvil para jugar sin internet.
async function estadoSinConexion() {
  const el = $('#gOff'), bar = $('#gOffBar'); if (!el) return;
  if (!('serviceWorker' in navigator) || !('caches' in window)) { el.textContent = '⚠️ Este navegador no permite jugar sin conexión.'; return; }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const listos = (await Promise.all(JUEGOS.map(j => caches.match(new URL(`js/games/${j.id}/index.js`, location.href).href)))).filter(Boolean).length;
    if (!$('#gOff')) return;
    const activo = !!(reg && reg.active);
    if (activo && listos === JUEGOS.length) { el.textContent = `✅ Lista para jugar sin conexión: los ${JUEGOS.length} juegos están guardados en este dispositivo.`; bar.hidden = true; }
    else if (activo && listos) { el.textContent = `⚠️ Solo ${listos} de ${JUEGOS.length} juegos están guardados. Con internet, pulsa «Volver a intentarlo».`; bar.hidden = false; }
    else { el.textContent = reg && (reg.installing || reg.waiting) ? '⏳ Guardando los juegos para usarlos sin conexión… espera unos segundos.' : '⚠️ El modo sin conexión aún no está listo. Abre la app con internet y pulsa «Volver a intentarlo».'; bar.hidden = false; if (reg && (reg.installing || reg.waiting)) setTimeout(estadoSinConexion, 3000); }
  } catch { el.textContent = '⚠️ No se pudo comprobar el modo sin conexión.'; }
}
function vAjustes() { const y = scrollY; vAjustes_(); if (ruta().v === 'ajustes') scrollTo(0, y); }   // al volver a pintar (cambiar un ajuste…) no se salta arriba
function vAjustes_() {
  nombreVista = 'Ajustes'; cabTxt('Juegos Reunidos');
  const A = aj.ajustes();
  const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="btn ${A[k] === v ? 'on' : ''}" data-set="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  app.innerHTML = `
  <div class="panel"><h3>Apariencia</h3><div class="fila"><span>Tema</span>${seg('tema', [['auto', 'Auto'], ['claro', 'Claro'], ['oscuro', 'Oscuro']])}</div></div>
  <div class="panel"><h3>Sonido y vibración</h3>
    <div class="fila"><span>Sonidos</span>${seg('sonido', [[true, 'Sí'], [false, 'No']])}</div>
    <div class="fila"><span>Vibración</span>${seg('vibracion', [[true, 'Sí'], [false, 'No']])}</div></div>
  <div class="panel"><h3>Victorias</h3>
    <div class="fila"><span>Celebrar al ganar</span>${seg('celebrar', [[true, 'Sí'], [false, 'No']])}</div></div>
  <div class="panel"><h3>Copia de seguridad</h3>
    <p class="note">Tus partidas y estadísticas se guardan solo en este navegador. Exporta un archivo .json para pasarlas a otro dispositivo o como copia.</p>
    <div class="bar"><button class="btn on" id="gExp">Exportar .json</button>
      <label class="btn file">Importar .json<input type="file" id="gImp" accept=".json,application/json"></label>
      <button class="btn danger" id="gBor">Borrar partidas</button></div>
    <div class="msg ${msgAj.err ? 'err' : 'win'}" role="status">${esc(msgAj.t)}</div></div>
  <div class="panel"><h3>Sin conexión</h3><p class="note" id="gOff" role="status">Comprobando…</p><div class="bar" id="gOffBar" hidden><button class="btn" id="gOffRe">🔄 Volver a intentarlo</button></div></div>
  <div class="panel"><h3>Acerca de</h3><p class="note">Juegos Reunidos · ${JUEGOS.length} juegos${matchMedia('(display-mode: standalone)').matches ? '' : '. Puedes instalarla desde el menú del navegador («Añadir a pantalla de inicio»)'}.</p>
    <p class="note">Créditos: los dibujos de las caras de «¿Qué Cara Tienes?» están basados en <b>Vue Color Avatar</b>, de LeoKu (licencia MIT).</p></div>
  <p class="version">Juegos Reunidos · versión ${VERSION} · by ChifoRedEs</p>`;
  app.querySelectorAll('[data-set]').forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.v; aj.set(b.dataset.set, v === 'true' ? true : v === 'false' ? false : v); const y = scrollY; vAjustes(); scrollTo(0, y);
  }));
  estadoSinConexion();
  $('#gOffRe').addEventListener('click', async () => {
    $('#gOff').textContent = 'Descargando los juegos… deja la app abierta unos segundos.';
    try { const r = await navigator.serviceWorker.getRegistration(); if (r) await r.update(); else await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }); } catch { /* sin red */ }
    setTimeout(estadoSinConexion, 4000);
  });
  $('#gExp').addEventListener('click', exportar);
  $('#gBor').addEventListener('click', () => {
    if (!confirm('¿Borrar todas las partidas guardadas en este navegador? (Las estadísticas se conservan.)')) return;
    JUEGOS.forEach(j => store.borrarJuego(j.id)); msgAj = { t: 'Partidas borradas.', err: false }; vAjustes();
  });
  $('#gImp').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = async () => {
      try { const got = await importar(JSON.parse(rd.result)); msgAj = { t: got.length ? `Importado: ${got.join(', ')}.` : 'Copia importada (sin partidas guardadas).', err: false }; }
      catch (err) { msgAj = { t: err instanceof SyntaxError ? 'El archivo no es un JSON válido.' : err.message, err: true }; }
      vAjustes();
    };
    rd.onerror = () => { msgAj = { t: 'No se pudo leer el archivo.', err: true }; vAjustes(); };
    rd.readAsText(f);
  });
}
function exportar() {
  const juegos = {}; JUEGOS.forEach(j => { const e = store.getJuego(j.id); if (e) juegos[j.id] = e; });
  const podios = {}; JUEGOS.forEach(j => { const p = store.leer('podio:' + j.id, null); if (p) podios[j.id] = p; });
  const obj = { app: 'juegos-reunidos', version: 2, fecha: new Date().toISOString(), juegos, stats: stats.todas(), ajustes: aj.ajustes(), logros: logros.conseguidos(), retos: logros.todosRetos(), podios };
  const a = el('a', { href: URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })), download: `juegos-reunidos-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  msgAj = { t: 'Archivo exportado.', err: false }; vAjustes();
}
// Valida cada partida con el propio módulo del juego (validar / migrarV1) antes de guardarla.
async function ingestar(j, datos, desdeV1) {
  const mod = await j.cargar();
  const d = mod.validar(desdeV1 ? mod.migrarV1(datos) : datos);
  if (!d) return false;
  const r = mod.resumen ? mod.resumen(d) : null;
  store.setJuego(j.id, d, r ? r.texto : null, r ? r.fin : false);
  return true;
}
async function importar(o) {
  if (!o || typeof o !== 'object' || o.app !== 'juegos-reunidos') throw new Error('El archivo no es una copia de Juegos Reunidos.');
  const got = [];
  for (const j of JUEGOS) {
    try {
      if (o.version === 2 && o.juegos && o.juegos[j.id] && typeof o.juegos[j.id] === 'object') { if (await ingestar(j, o.juegos[j.id].datos, false)) got.push(j.nombre); }
      else if (o.version === 1 && o[j.v1] && typeof o[j.v1] === 'object') { if (await ingestar(j, o[j.v1], true)) got.push(j.nombre); }
    } catch (e) { console.error(e); }
  }
  if (o.version === 2) {
    stats.importar(o.stats); aj.importar(o.ajustes); logros.importar(o.logros); logros.importarRetos(o.retos);
    if (o.podios && typeof o.podios === 'object') for (const j of JUEGOS) importarPodio(j.id, o.podios[j.id]);
  }
  if (!got.length && o.version !== 2) throw new Error('El archivo no contiene partidas reconocibles de Juegos Reunidos.');
  return got;
}
// Podio (top 10) de un juego: se mezcla con el de este dispositivo
function importarPodio(id, P) {
  if (!P || typeof P !== 'object') return;
  const A = store.leer('podio:' + id, {}) || {};
  for (const [v, l] of Object.entries(P)) {
    if (typeof v !== 'string' || v.length > 60 || !Array.isArray(l)) continue;
    const ok = l.filter(x => x && typeof x.n === 'string' && Number.isFinite(x.p) && Number.isFinite(x.f)).map(x => ({ n: x.n.slice(0, 14), p: x.p, f: x.f }));
    const menos = /sprint/i.test(v), todo = [...(A[v] || []), ...ok].filter((x, k, a) => a.findIndex(y => y.f === x.f && y.n === x.n) === k);
    A[v] = todo.sort((a, b) => (menos ? a.p - b.p : b.p - a.p) || a.f - b.f).slice(0, 10);
  }
  store.escribir('podio:' + id, A);
}
// Migración única desde la versión 1 (una sola clave con todo). La clave antigua se conserva como respaldo.
async function migrarV1() {
  if (store.leer('migrado')) return;
  try {
    const raw = localStorage.getItem(V1_KEY);
    if (raw) await importar(JSON.parse(raw));
  } catch (e) { console.error('Migración v1:', e); }
  store.escribir('migrado', true);
}

/* ---------- arranque ---------- */
// Service worker: comprueba si hay versión nueva en cada arranque y, cuando la nueva toma el control, recarga una vez
// para que se vea al momento (sin esto, la versión nueva solo aparecía en la siguiente apertura de la app).
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const habiaVersion = !!navigator.serviceWorker.controller;
  let recargado = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (habiaVersion && !recargado) { recargado = true; location.reload(); } });
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {});
  // en segundo plano: guardar las imágenes de los naipes para jugar sin conexión (solo baja las que falten)
  // Como baraja y dorso cambian al azar, se guardan todas las imágenes (~3 MB), salvo con «Ahorro de datos» activado.
  const elegidas = () => [...BARAJAS.espanola, ...BARAJAS.francesa, ...BARAJAS.dorsos, ...BARAJAS.tapetes, ...BARAJAS.fondos].map(x => x.id);
  const ahorro = navigator.connection && navigator.connection.saveData;
  if (!ahorro) navigator.serviceWorker.ready.then(r => setTimeout(() => r.active && r.active.postMessage({ tipo: 'guardar-cartas', ids: elegidas() }), 4000)).catch(() => {});
}
migrarV1().then(render);
