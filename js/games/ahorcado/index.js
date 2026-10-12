import { $, esc } from '../../core/dom.js';
import { grupoTablero } from '../../core/aspectos.js';
import { NIVELES, temasDe, elegir, base, mayus } from './palabras.js';
import { DISENOS, TOTAL } from './dibujos.js';
import { crearTeclado } from '../../core/teclado.js';

const FILAS = ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM'], ALFABETO = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ', LETRA = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;
let S = null, api = null, asp = null, root = null, onKey = null, recienRevelada = new Set(), faseAnterior = 0, tk = null;

/* ---------- validación / resumen ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || !Object.hasOwn(NIVELES, d.nivel)) return null;
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, max = NIVELES[d.nivel].fallos;
  if (typeof d.palabra !== 'string' || d.palabra.length < 3 || d.palabra.length > 30 || !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ -]+$/.test(d.palabra)) return null;
  if (typeof d.pista !== 'string' || d.pista.length > 500 || typeof d.tema !== 'string' || !/^(mezcla|[cp]:[a-z]{2,12})$/.test(d.tema)) return null;
  const usadas = typeof d.usadas === 'string' && /^[A-ZÑ]*$/.test(d.usadas) && new Set(d.usadas).size === d.usadas.length ? d.usadas : null; if (usadas === null) return null;
  if (!ent(d.fallos, 0, max) || ![null, 'gana', 'pierde'].includes(d.fin)) return null;
  const m = d.marcador && typeof d.marcador === 'object' ? d.marcador : {};
  return { nivel: d.nivel, tema: d.tema, palabra: d.palabra, pista: d.pista, usadas, fallos: d.fallos, pistaVista: !!d.pistaVista, letraGratis: !!d.letraGratis, fin: d.fin, reg: !!d.reg,
    ultimas: Array.isArray(d.ultimas) ? d.ultimas.filter(x => typeof x === 'string').slice(-15).map(x => x.slice(0, 30)) : [], marcador: { g: ent(m.g, 0, 99999) ? m.g : 0, p: ent(m.p, 0, 99999) ? m.p : 0, racha: ent(m.racha, 0, 99999) ? m.racha : 0 } };
}
export const migrarV1 = d => d;
export function resumen(d) {
  return d.fin ? { texto: `${NIVELES[d.nivel].nombre} · ${d.fin === 'gana' ? '¡Acertada!' : 'Fallada'}`, fin: true } : { texto: `${NIVELES[d.nivel].nombre} · ${d.fallos}/${NIVELES[d.nivel].fallos} fallos`, fin: false };
}
const letrasDe = p => [...p].filter(c => LETRA.test(c)).map(base);
const acertada = d => letrasDe(d.palabra).every(l => d.usadas.includes(l));

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; recienRevelada = new Set();
  asp = api.aspecto([grupoTablero(), { clave: 'dibujo', titulo: 'Dibujo', def: 'clasico', opciones: Object.entries(DISENOS).map(([id, d]) => ({ id, nombre: d.nombre })) }], () => pintar(false));
  await api.css(new URL('./ahorcado.css', import.meta.url));
  const g = api.cargar(); S = g ? { ...g } : null;
  root.innerHTML = `
    <details class="ops" id="ahOps"><summary id="ahSum"></summary>
      <div class="bar"><span class="lbl">Nivel</span><div class="seg">${Object.entries(NIVELES).map(([k, n]) => `<button class="btn" data-niv="${k}">${n.nombre}</button>`).join('')}</div></div>
      <div class="bar"><span class="lbl">Tema</span><div class="seg" id="ahTemas"></div></div><p class="note" id="ahAyuda"></p></details>
    <div class="ahinfo"><span class="ahvidas" id="ahVidas" aria-live="polite"></span><span id="ahMarc"></span></div>
    <div class="ahfig" id="ahFig"></div>
    <div class="ahword" id="ahWord" role="button" tabindex="0" data-ac="teclado"></div>
    <p class="ahtoca" id="ahToca">⌨️ Toca las casillas para escribir</p>
    <div class="ahpista" id="ahPista"></div>
    <div class="msg" id="ahMsg" role="status" aria-live="polite"></div>
    <div class="bar"><button class="btn on" data-ac="nueva">Otra palabra</button><button class="btn" data-ac="letra" id="ahLetra">💡 Letra</button><button class="btn" data-ac="pista" id="ahBtnPista">🔎 Pista</button><button class="btn tkabrir" data-ac="teclado" id="ahTk" aria-label="Abrir teclado">⌨️</button><button class="btn" data-ac="aspecto">🎨</button></div>`;
  tk = crearTeclado({ filas: FILAS, alPulsar: adivinar, titulo: 'El Ahorcado · elige una letra' });
  root.addEventListener('click', clic); root.addEventListener('keydown', teclaPalabra); onKey = teclado; document.addEventListener('keydown', onKey);
  api.menu([{ texto: 'Otra palabra', accion: () => nueva(S.nivel, S.tema) }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Cómo se juega', accion: reglas }]);
  if (!S) { $('#ahOps').open = true; nueva(api.pref('nivel', 'facil'), 'mezcla', true); } else { faseAnterior = fase(); temas(); pintar(false); }
}
export function unmount() { document.removeEventListener('keydown', onKey); if (root) { root.removeEventListener('click', clic); root.removeEventListener('keydown', teclaPalabra); } if (tk) { tk.destruir(); tk = null; } S = null; asp = null; }
function guardar() { if (!S) return; const d = { ...S }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- partida ---------- */
const fase = () => (S.fallos ? Math.min(TOTAL, Math.ceil(S.fallos * TOTAL / NIVELES[S.nivel].fallos)) : 0);
function nueva(nivel, tema, forzar = false) {
  if (!forzar && S && !S.fin && S.usadas.length && !api.confirmar('¿Cambiar de palabra? Perderás la partida actual.')) return;
  if (!temasDe(nivel).some(t => t.id === tema)) tema = 'mezcla';
  const prev = S ? S.ultimas.slice() : [], marc = S ? S.marcador : { g: 0, p: 0, racha: 0 }, w = elegir(nivel, tema, prev);
  S = { nivel, tema, palabra: w.palabra, pista: w.pista, usadas: '', fallos: 0, pistaVista: NIVELES[nivel].pista === 'visible', letraGratis: false, fin: null, reg: false, ultimas: [...prev, w.palabra].slice(-15), marcador: marc };
  api.setPref('nivel', nivel); recienRevelada = new Set(); faseAnterior = 0; temas(); pintar(false); guardar();
}
function terminar(res) {
  S.fin = res; S.reg = true;
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
function temas() { const t = temasDe(S.nivel); $('#ahTemas').innerHTML = t.map(x => `<button class="btn ${S.tema === x.id ? 'on' : ''}" data-tema="${x.id}">${x.icono} ${x.nombre}</button>`).join(''); }
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
  root.querySelectorAll('[data-niv]').forEach(b => b.classList.toggle('on', b.dataset.niv === S.nivel));
  $('#ahSum').textContent = `⚙️ ${cfg.nombre} · ${t.icono} ${t.nombre}`; $('#ahAyuda').textContent = cfg.ayuda;
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
  const a = d.ac; if (a === 'nueva') nueva(S.nivel, S.tema, !!S.fin); else if (a === 'letra') ayudaLetra(); else if (a === 'pista') verPista(); else if (a === 'aspecto') asp.abrir();
}
function teclaPalabra(e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.id === 'ahWord') { e.preventDefault(); if (S && !S.fin) tk.abrir(); } }
function reglas() {
  api.modal('El Ahorcado', `<ul><li>Adivina la palabra eligiendo letras. Cada letra que no está en la palabra suma un fallo y completa el dibujo; si se completa, pierdes.</li>
    <li><b>Fácil y Medio</b> usan palabras cotidianas del crucigrama; <b>Difícil y Experto</b> usan términos del banco de 450 definiciones (geografía, historia, ciencia, arte, gastronomía…), con la pista oculta.</li>
    <li>La <b>pista</b> es la definición de la palabra. En Difícil y Experto verla cuesta un fallo, igual que 💡 Letra (en Fácil tienes una letra gratis).</li>
    <li>Las tildes no importan: la A vale para «á». Toca las casillas de la palabra (o ⌨️) para abrir el teclado: puedes arrastrarlo por la pantalla desde su barra y cerrarlo con ✕. Con el teclado del ordenador también puedes escribir las letras.</li>
    <li>En 🎨 Apariencia eliges paleta y dibujo: clásico, robot, globos o flor.</li></ul>`);
}
