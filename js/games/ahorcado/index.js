import { $, esc } from '../../core/dom.js';
import { grupoTablero, grupoFondo, grupoPantalla } from '../../core/aspectos.js';
import { NIVELES, temasDe, elegir, base, mayus } from './palabras.js';
import * as D from '../../core/diccionario.js';
import { DISENOS, TOTAL } from './dibujos.js';
import { crearTeclado } from '../../core/teclado.js';

const FILAS = ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM'], ALFABETO = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ', LETRA = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;
let S = null, api = null, asp = null, root = null, onKey = null, recienRevelada = new Set(), faseAnterior = 0, tk = null;

/* ---------- validación / resumen ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || !Object.hasOwn(NIVELES, d.nivel)) return null;
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, max = NIVELES[d.nivel].fallos;
  if (typeof d.palabra !== 'string' || d.palabra.length < 3 || d.palabra.length > 30 || !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ -]+$/.test(d.palabra)) return null;
  if (typeof d.pista !== 'string' || d.pista.length > 500 || typeof d.tema !== 'string' || !/^(mezcla|[cp]:[a-z]{2,12}|d:dic)$/.test(d.tema)) return null;
  const usadas = typeof d.usadas === 'string' && /^[A-ZÑ]*$/.test(d.usadas) && new Set(d.usadas).size === d.usadas.length ? d.usadas : null; if (usadas === null) return null;
  if (!ent(d.fallos, 0, max) || ![null, 'gana', 'pierde'].includes(d.fin)) return null;
  const m = d.marcador && typeof d.marcador === 'object' ? d.marcador : {};
  return { dos: !!d.dos, nivel: d.nivel, tema: d.tema, palabra: d.palabra, pista: d.pista, usadas, fallos: d.fallos, pistaVista: !!d.pistaVista, letraGratis: !!d.letraGratis, fin: d.fin, reg: !!d.reg,
    ultimas: Array.isArray(d.ultimas) ? d.ultimas.filter(x => typeof x === 'string').slice(-15).map(x => x.slice(0, 30)) : [], marcador: { g: ent(m.g, 0, 99999) ? m.g : 0, p: ent(m.p, 0, 99999) ? m.p : 0, racha: ent(m.racha, 0, 99999) ? m.racha : 0 } };
}
export const migrarV1 = d => d;
export function resumen(d) {
  const nom = d.dos ? '2 jugadores' : NIVELES[d.nivel].nombre;
  return d.fin ? { texto: `${nom} · ${d.fin === 'gana' ? '¡Acertada!' : 'Fallada'}`, fin: true } : { texto: `${nom} · ${d.fallos}/${NIVELES[d.nivel].fallos} fallos`, fin: false };
}
const letrasDe = p => [...p].filter(c => LETRA.test(c)).map(base);
const acertada = d => letrasDe(d.palabra).every(l => d.usadas.includes(l));

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; recienRevelada = new Set();
  asp = api.aspecto([grupoFondo('#ahFig'), grupoPantalla('raiz'), grupoTablero(), { clave: 'dibujo', titulo: 'Dibujo', def: 'clasico', opciones: Object.entries(DISENOS).map(([id, d]) => ({ id, nombre: d.nombre })) }], () => pintar(false));
  await api.css(new URL('./ahorcado.css', import.meta.url));
  const g = api.cargar(); S = g ? { ...g } : null;
  root.innerHTML = `
    <div class="ahinfo"><span class="ahvidas" id="ahVidas" aria-live="polite"></span><span id="ahMarc"></span></div>
    <div class="ahfig" id="ahFig"></div>
    <div class="ahword" id="ahWord" role="button" tabindex="0" data-ac="teclado"></div>
    <p class="ahtoca" id="ahToca">⌨️ Toca las casillas para escribir</p>
    <div class="ahpista" id="ahPista"></div>
    <div class="msg" id="ahMsg" role="status" aria-live="polite"></div>
    <div class="bar"><button class="btn on" data-ac="nueva">Otra palabra</button><button class="btn" data-ac="dos">👥 2 jugadores</button><button class="btn" data-ac="letra" id="ahLetra">💡 Letra</button><button class="btn" data-ac="pista" id="ahBtnPista">🔎 Pista</button><button class="btn tkabrir" data-ac="teclado" id="ahTk" aria-label="Abrir teclado">⌨️</button><button class="btn" data-ac="aspecto">🎨</button></div>${api.barraHtml()}`;
  tk = crearTeclado({ filas: FILAS, alPulsar: adivinar, titulo: 'El Ahorcado · elige una letra' });
  root.addEventListener('click', clic); root.addEventListener('keydown', teclaPalabra); onKey = teclado; document.addEventListener('keydown', onKey);
  api.barra({ nueva: () => nueva(S.nivel, S.tema),
    salir: () => { location.hash = '#/cat/palabras'; },
    config: { valores: () => ({ nivel: S.nivel, tema: S.tema }), grupos: v => [{ clave: 'nivel', titulo: 'Nivel', nota: (NIVELES[v.nivel] || {}).ayuda, opciones: Object.entries(NIVELES).map(([k, n]) => [k, n.nombre]) }, { clave: 'tema', titulo: 'Tema', opciones: temasDe(v.nivel).map(x => [x.id, `${x.icono} ${x.nombre}`]) }], alCambiar: (v, k) => { if (k === 'nivel' && !temasDe(v.nivel).some(x => x.id === v.tema)) v.tema = 'mezcla'; }, aplicar: v => nueva(v.nivel, v.tema, true) } });
  api.menu([{ texto: 'Otra palabra', accion: () => nueva(S.nivel, S.tema) }, { texto: '👥 2 jugadores: escribe tú la palabra', accion: dosJugadores }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Cómo se juega', accion: reglas }]);
  if (!S) { nueva(api.pref('nivel', 'facil'), 'mezcla', true); } else { faseAnterior = fase(); pintar(false); }
}
export function unmount() { document.removeEventListener('keydown', onKey); if (root) { root.removeEventListener('click', clic); root.removeEventListener('keydown', teclaPalabra); } if (tk) { tk.destruir(); tk = null; } S = null; asp = null; }
function guardar() { if (!S) return; const d = { ...S }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- partida ---------- */
const fase = () => (S.fallos ? Math.min(TOTAL, Math.ceil(S.fallos * TOTAL / NIVELES[S.nivel].fallos)) : 0);
async function nueva(nivel, tema, forzar = false) {
  if (tema === 'd:dic' && !D.lemasCargados()) {                  // la lista se descarga la primera vez (≈0,5 MB)
    api.aviso('📚 Cargando el diccionario…');
    const ok = await D.cargarLemas();
    if (!asp) return;                                              // se ha salido del juego mientras cargaba
    if (!ok) { api.aviso('No se pudo cargar el diccionario (sin conexión)'); tema = 'mezcla'; }
  }
  if (!forzar && S && !S.fin && S.usadas.length && !api.confirmar('¿Cambiar de palabra? Perderás la partida actual.')) return;
  if (!temasDe(nivel).some(t => t.id === tema)) tema = 'mezcla';
  const prev = S ? S.ultimas.slice() : [], marc = S ? S.marcador : { g: 0, p: 0, racha: 0 }, w = elegir(nivel, tema, prev);
  S = { nivel, tema, palabra: w.palabra, pista: w.pista, usadas: '', fallos: 0, pistaVista: NIVELES[nivel].pista === 'visible', letraGratis: false, fin: null, reg: false, ultimas: [...prev, w.palabra].slice(-15), marcador: marc };
  api.setPref('nivel', nivel); recienRevelada = new Set(); faseAnterior = 0; pintar(false); guardar();
}
// Dos jugadores en el mismo móvil: uno escribe la palabra secreta (y una pista opcional) y el otro la adivina
async function dosJugadores() {
  if (S && !S.fin && S.usadas.length && !api.confirmar('¿Empezar una partida de 2 jugadores? Perderás la palabra actual.')) return;
  const p = await api.pedirTexto('👥 Palabra secreta', { tipo: 'password', max: 30, nota: 'Jugador 1: escribe la palabra o frase que tendrá que adivinar el otro (que no mire). Solo letras, espacios y guiones.', placeholder: 'Palabra secreta' });
  if (p == null) return;
  const palabra = p.trim().replace(/\s+/g, ' ');
  if (palabra.length < 3 || !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ -]+$/.test(palabra)) { api.aviso('Escribe al menos 3 letras (sin números ni signos)'); return; }
  const q = await api.pedirTexto('🔎 Pista (opcional)', { max: 120, nota: 'Una pista para ayudar. Déjalo vacío si no quieres darla.', placeholder: 'Por ejemplo: «Es un animal»' });
  const nivel = S ? S.nivel : 'facil', prev = S ? S.ultimas.slice() : [], marc = S ? S.marcador : { g: 0, p: 0, racha: 0 }, pista = (q || '').trim();
  S = { dos: true, nivel, tema: 'mezcla', palabra: mayus(palabra), pista: pista || '(Sin pista)', usadas: '', fallos: 0, pistaVista: true, letraGratis: true, fin: null, reg: false, ultimas: prev, marcador: marc };
  recienRevelada = new Set(); faseAnterior = 0; pintar(false); guardar();
  api.aviso('Jugador 2: ¡adivina la palabra!');
}
function terminar(res) {
  S.fin = res; S.reg = true;
  if (S.dos) { api.sonido(res === 'gana' ? 'ganar' : 'perder'); api.registrar({ res: 'partida', variante: '2 jugadores' }); return; }
  if (res === 'gana') { S.marcador.g++; S.marcador.racha++; api.sonido('ganar'); api.vibrar([50, 30, 50]); } else { S.marcador.p++; S.marcador.racha = 0; api.sonido('perder'); }
  api.registrar({ res: res === 'gana' ? 'victoria' : 'derrota', variante: NIVELES[S.nivel].nombre });
}
function adivinar(l) {
  if (!S || S.fin || S.usadas.includes(l)) return;
  S.usadas += l;
  if (letrasDe(S.palabra).includes(l)) { api.sonido('click'); recienRevelada = new Set([l]); } else { S.fallos++; api.sonido('error'); api.vibrar(20); }
  if (acertada(S)) terminar('gana'); else if (S.fallos >= NIVELES[S.nivel].fallos) terminar('pierde');
  pintar(true); guardar();
}
function ayudaLetra() {
  if (!S || S.fin) return;
  const faltan = [...new Set(letrasDe(S.palabra))].filter(l => !S.usadas.includes(l)); if (!faltan.length) return;
  const cfg = NIVELES[S.nivel]; if (cfg.letra === 'gratis' && !S.letraGratis) S.letraGratis = true; else S.fallos++;
  const l = faltan[Math.random() * faltan.length | 0]; S.usadas += l; recienRevelada = new Set([l]); api.sonido('ok');
  if (acertada(S)) terminar('gana'); else if (S.fallos >= cfg.fallos) terminar('pierde');
  pintar(true); guardar();
}
function verPista() {
  if (!S || S.fin || S.pistaVista) return;
  S.pistaVista = true; S.fallos++; api.sonido('ok');
  if (S.fallos >= NIVELES[S.nivel].fallos) terminar('pierde');
  pintar(true); guardar();
}

/* ---------- pintado ---------- */
function pintar(anima) {
  if (!S) return;
  const cfg = NIVELES[S.nivel], f = fase(), t = temasDe(S.nivel).find(x => x.id === S.tema) || temasDe(S.nivel)[0];
  $('#ahFig').innerHTML = DISENOS[asp.valores.dibujo].svg(S.fin === 'pierde' ? TOTAL : f, !!anima && f > faseAnterior); faseAnterior = f;
  $('#ahVidas').innerHTML = Array.from({ length: cfg.fallos }, (_, i) => (i < cfg.fallos - S.fallos ? '❤️' : '🖤')).join('');
  $('#ahMarc').textContent = `✔ ${S.marcador.g} · ✘ ${S.marcador.p}${S.marcador.racha > 1 ? ` · racha ${S.marcador.racha}` : ''}`;
  const palabras = S.palabra.split(' ').map(w => [...w].map(c => {
    if (!LETRA.test(c)) return `<span class="ahl sep">${esc(c)}</span>`;
    const b = base(c), vis = S.usadas.includes(b), perdida = S.fin === 'pierde' && !vis;
    return `<span class="ahl ${perdida ? 'fallo' : ''} ${vis && recienRevelada.has(b) && anima ? 'nuevo' : ''}">${vis || perdida ? esc(mayus(c)) : ''}</span>`;
  }).join(''));
  $('#ahWord').innerHTML = palabras.map(w => `<span class="ahw">${w}</span>`).join(''); $('#ahWord').setAttribute('aria-label', 'Palabra: ' + [...S.palabra].map(c => (LETRA.test(c) ? (S.usadas.includes(base(c)) || S.fin ? c : 'espacio vacío') : c)).join(' '));
  const faltaPista = !S.pistaVista;
  $('#ahPista').innerHTML = faltaPista ? `<small>Pista oculta</small>Ver la pista cuesta un fallo. ${S.palabra.replace(/[ -]/g, '').length} letras${S.palabra.includes(' ') ? ` en ${S.palabra.split(' ').length} palabras` : ''}.` : `<small>Pista</small>${esc(S.pista)}`;
  $('#ahBtnPista').style.display = faltaPista && !S.fin ? '' : 'none';
  $('#ahLetra').disabled = !!S.fin; $('#ahLetra').textContent = cfg.letra === 'gratis' && !S.letraGratis ? '💡 Letra gratis' : '💡 Letra (−1)';
  if (tk) { const ls = letrasDe(S.palabra); tk.actualizar((l, b) => { const usada = S.usadas.includes(l); b.disabled = usada || !!S.fin; b.className = 'tkk' + (usada ? (ls.includes(l) ? ' ok' : ' mal') : ''); }); if (S.fin) tk.cerrar(); }
  $('#ahWord').classList.toggle('activa', !S.fin); $('#ahToca').hidden = !!S.fin; $('#ahTk').disabled = !!S.fin;
  const m = $('#ahMsg'); m.className = 'msg' + (S.fin === 'gana' ? ' win' : S.fin === 'pierde' ? ' err' : '');
  m.textContent = S.fin === 'gana' ? '🎉 ¡Palabra acertada!' : S.fin === 'pierde' ? `Era «${S.palabra}». ¡Inténtalo con otra!` : '';
}

/* ---------- entrada ---------- */
function teclado(e) {
  if (!S || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('.modal') || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const l = e.key.length === 1 ? e.key.toUpperCase() : ''; if (l && ALFABETO.includes(l)) adivinar(l);
}
function clic(e) {
  const b = e.target.closest('button,[data-ac]'); if (!b || !S) return; const d = b.dataset;
  if (d.ac === 'teclado') { if (!S.fin) tk.abrir(); return; }
  if (d.niv) return nueva(d.niv, 'mezcla'); if (d.tema) return nueva(S.nivel, d.tema);
  const a = d.ac; if (a === 'dos') return dosJugadores(); if (a === 'nueva') nueva(S.nivel, S.tema, !!S.fin); else if (a === 'letra') ayudaLetra(); else if (a === 'pista') verPista(); else if (a === 'aspecto') asp.abrir();
}
function teclaPalabra(e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.id === 'ahWord') { e.preventDefault(); if (S && !S.fin) tk.abrir(); } }
function reglas() {
  api.modal('El Ahorcado', `<ul><li>Adivina la palabra eligiendo letras. Cada letra que no está en la palabra suma un fallo y completa el dibujo; si se completa, pierdes.</li>
    <li><b>Fácil y Medio</b> usan palabras cotidianas del crucigrama; <b>Difícil y Experto</b> usan términos del banco de 450 definiciones (geografía, historia, ciencia, arte, gastronomía…), con la pista oculta.</li>
    <li>La <b>pista</b> es la definición de la palabra. En Difícil y Experto verla cuesta un fallo, igual que 💡 Letra (en Fácil tienes una letra gratis).</li>
    <li>Las tildes no importan: la A vale para «á». Toca las casillas de la palabra (o ⌨️) para abrir el teclado: puedes arrastrarlo por la pantalla desde su barra y cerrarlo con ✕. Con el teclado del ordenador también puedes escribir las letras.</li>
    <li>En 🎨 Apariencia eliges paleta y dibujo: clásico, robot, globos o flor.</li>
    <li>📚 <b>Diccionario</b>: palabras al azar del diccionario de LibreOffice (unas 47.000). No tienen definición: la pista dice si es verbo o sustantivo/adjetivo y por qué letra empieza. ¡Muchas son raras!</li>
    <li>👥 <b>2 jugadores</b>: uno escribe la palabra secreta (y, si quiere, una pista) y le pasa el móvil al otro para que la adivine. Los fallos permitidos son los del nivel elegido.</li></ul>`);
}
