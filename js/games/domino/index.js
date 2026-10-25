// Dominó: clásico con pozo, bloqueo, «de a cinco» y por parejas, de 2 a 4 jugadores (tú contra la máquina), con fichas doble 6 o doble 9.
// Reglas y lógica en motor.js. Apariencia: Tapete + Fichas (color, textura, forma, tamaño y puntos).
import { $, esc } from '../../core/dom.js';
import { grupoFondo } from '../../core/aspectos.js';
import * as M from './motor.js';

/* ---------- apariencia de las fichas ---------- */
const hsl = (h, s, l) => { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase(); };
const NEUTROS = [['marfil', 'Marfil', '#F4EEDC'], ['blanco', 'Blanco', '#FFFFFF'], ['plata', 'Plata', '#C3C7CF'], ['gris', 'Gris', '#8A8F98'], ['grafito', 'Grafito', '#3A3D45'], ['negro', 'Negro', '#17181C'],
  ['dorado', 'Dorado', '#D4AF37'], ['bronce', 'Bronce', '#A5682A'], ['crema', 'Crema', '#EBD9A8'], ['hueso', 'Hueso', '#E6DCC3']];
const TONOS = [['Rojo', 0], ['Naranja', 26], ['Amarillo', 48], ['Lima', 78], ['Verde', 128], ['Esmeralda', 158], ['Turquesa', 178], ['Cian', 195], ['Azul', 215], ['Índigo', 238], ['Violeta', 268], ['Magenta', 305], ['Rosa', 338]];
const COLORES = [...NEUTROS.map(([id, nombre, hex]) => ({ id, nombre, hex })),
  ...TONOS.flatMap(([n, h]) => [['c', 'claro', 75, 72], ['m', '', 72, 48], ['o', 'oscuro', 68, 28]].map(([k, suf, s, l]) => ({ id: `${n.toLowerCase().replace('í', 'i')}-${k}`, nombre: `${n} ${suf}`.trim(), hex: hsl(h, s, l) })))];
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const luz = h => { const [r, g, b] = hexRgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const TEXTURAS = { liso: ['Liso', ['#EDE6D2', '#CFC5A6']], brillante: ['Brillante', ['#FFFFFF', '#9EA6B5']], marmol: ['Mármol', ['#F4F1EA', '#8F8C86']], madera: ['Madera', ['#B07A45', '#6B4423']],
  granito: ['Granito', ['#9AA0A8', '#3C3F45']], carbono: ['Fibra de carbono', ['#3B3F47', '#15161A']], metal: ['Metal cepillado', ['#D9DDE3', '#7C838E']], cristal: ['Cristal', ['#D6F1FF', '#7BC3EA']] };
const FORMAS = { redonda: 'Esquinas redondeadas', cuadrada: 'Esquinas cuadradas', pildora: 'Píldora', biselada: 'Biselada', marcada: 'Con marco grueso' };
const TAMANOS = { pequeno: ['Pequeñas', .8], normal: ['Normales', 1], grande: ['Grandes', 1.25] };
const PUNTOS = { auto: 'Automático (contraste)', color: 'Clásicos de colores', negro: 'Negros', blanco: 'Blancos', oro: 'Dorados', numeros: 'Números' };
const PCOL = { negro: '#15161A', blanco: '#FFFFFF', oro: '#D4AF37' };

let S = null, api = null, asp = null, root = null, tim = 0, pausado = false, sel = null, pista = null, anim = false, registrada = false, onResize = null, cap = 6;
let cfg = { modo: 'robar', n: 2, doble: 6, objetivo: 0, nivel: 'medio' };
const num = { n: 1, doble: 1, objetivo: 1 };
const nombre = p => (p === 0 ? 'Tú' : S.modo === 'parejas' ? (p === 2 ? 'Tu pareja' : `Rival ${p === 1 ? 1 : 2}`) : S.n === 2 ? 'Rival' : `CPU ${p}`);
const nombreEq = t => (S.modo === 'parejas' ? (t === 0 ? 'Tu equipo' : 'Equipo rival') : nombre(t));
const corto = c => `${M.MODOS[c.modo].split(' (')[0]} · ${c.n} jug. · doble ${c.doble}`;

/* ---------- validación / resumen ---------- */
export const validar = M.validar;
export const migrarV1 = d => d;
export function resumen(d) {
  const eq = d.modo === 'parejas' ? 2 : d.n, pts = d.pts.map((x, i) => `${d.modo === 'parejas' ? (i ? 'Ellos' : 'Nosotros') : i === 0 ? 'Tú' : 'J' + (i + 1)} ${x}`).join(' · ');
  const t = d.ganador === null ? `mano ${d.mano}` : d.ganador === -1 ? 'empate' : d.ganador === 0 ? 'ganaste' : 'perdiste'; void eq;
  return { texto: `${corto(d)} · ${pts} · ${t}`, fin: d.ganador !== null };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; pausado = false; sel = null; pista = null; clearTimeout(tim); tim = 0;
  asp = api.aspecto([
    grupoFondo('#dmMesa'),
    { clave: 'fichas', titulo: 'Fichas · Color', icono: '🎨', def: 'marfil', opciones: COLORES.map(c => ({ id: c.id, nombre: c.nombre, sw: [c.hex] })) },
    { clave: 'textura', titulo: 'Fichas · Textura', icono: '✨', def: 'brillante', opciones: Object.entries(TEXTURAS).map(([id, [nombre, sw]]) => ({ id, nombre, sw })) },
    { clave: 'forma', titulo: 'Fichas · Forma', icono: '📐', def: 'redonda', opciones: Object.entries(FORMAS).map(([id, nombre]) => ({ id, nombre })) },
    { clave: 'tamano', titulo: 'Fichas · Tamaño', icono: '🔎', def: 'normal', opciones: Object.entries(TAMANOS).map(([id, [nombre]]) => ({ id, nombre })) },
    { clave: 'puntos', titulo: 'Fichas · Puntos', icono: '⚫', def: 'auto', opciones: Object.entries(PUNTOS).map(([id, nombre]) => ({ id, nombre })) },
  ], () => { aplicarAspecto(); if (S && $('#dmCad')) { medir(); pintar(); } });
  await api.css(new URL('./domino.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && M.cfgOk(c0)) cfg = M.normalizar(c0);
  S = api.cargar();
  root.addEventListener('click', clic);
  onResize = () => { if (S && $('#dmCad')) { medir(); pintar(); } }; window.addEventListener('resize', onResize);
  api.barra({
    nueva: () => jugar(),
    salir: () => { parar(); setup(); },
    pausar: () => { pausado = true; clearTimeout(tim); tim = 0; },
    reanudar: () => { pausado = false; siguiente(); },
    config: {
      valores: () => ({ ...cfg }),
      grupos: v => [
        { clave: 'modo', titulo: 'Modo de juego', opciones: Object.entries(M.MODOS) },
        { clave: 'n', titulo: 'Jugadores', visible: v.modo !== 'parejas', opciones: [[2, '2 jugadores'], [3, '3 jugadores'], [4, '4 jugadores']] },
        { clave: 'doble', titulo: 'Fichas', opciones: Object.entries(M.DOBLES).map(([k, l]) => [+k, l]) },
        { clave: 'objetivo', titulo: 'La partida termina…', opciones: Object.entries(M.OBJETIVOS).map(([k, l]) => [+k, l]) },
        { clave: 'nivel', titulo: 'Nivel de la máquina', opciones: Object.entries(M.NIVELES) },
      ],
      alCambiar: (v, clave) => { if (clave === 'modo' && v.modo === 'parejas') v.n = 4; },
      aplicar: v => { cfg = M.normalizar(v); jugar(); },
    },
  });
  api.menu([{ texto: 'Nueva partida', accion: () => { parar(); setup(); } }, { texto: '💡 Pista', accion: darPista }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  if (S && S.ganador === null) armar(); else setup();
}
export function unmount() {
  parar(); if (onResize) window.removeEventListener('resize', onResize); onResize = null;
  if (root) root.removeEventListener('click', clic); S = null; asp = null;
}
function parar() { clearTimeout(tim); tim = 0; sel = null; pista = null; }
function guardar() { if (!S) return; const r = resumen(S); api.guardar(S, r.texto, S.ganador !== null); }

/* ---------- apariencia ---------- */
function aplicarAspecto() {
  if (!asp || !root) return;
  const v = asp.valores, c = COLORES.find(x => x.id === v.fichas) || COLORES[0], dark = luz(c.hex) < .45;
  root.style.setProperty('--dm-c', c.hex);
  root.style.setProperty('--dm-p', PCOL[v.puntos] || (dark ? '#F4F4F6' : '#17181C'));
  root.style.setProperty('--dm-l', dark ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.45)');
  root.style.setProperty('--tm', (TAMANOS[v.tamano] || TAMANOS.normal)[1]);
}
function medir() {
  const mesa = $('#dmMesa'); if (!mesa) return;
  const W = Math.max(240, mesa.clientWidth - 16), f = (TAMANOS[asp && asp.valores.tamano] || TAMANOS.normal)[1];
  const ts = Math.max(12, Math.min(26, Math.floor(W / 15))) * f; mesa.style.setProperty('--ts', ts + 'px');
  cap = Math.max(3, Math.floor(W / (2 * ts + 9)));
}

/* ---------- pantalla de inicio ---------- */
function setup() {
  parar();
  const seg = (k, ops) => `<div class="seg">${ops.map(([v, l]) => `<button class="btn ${String(cfg[k]) === String(v) ? 'on' : ''}" data-cfg="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const nota = { robar: 'Cada uno recibe sus fichas y el resto forma el <b>pozo</b>. Si no puedes jugar, <b>robas</b> hasta tener ficha. Gana quien se queda sin fichas.',
    bloqueo: 'Sin pozo: si no tienes ficha, <b>pasas</b>. Si nadie puede mover se cierra el juego y gana quien menos puntos tenga en la mano.',
    cinco: 'Como el clásico, pero cada vez que los dos extremos suman un <b>múltiplo de 5</b> te llevas esos puntos. Los dobles en un extremo cuentan por las dos mitades.',
    parejas: '<b>4 jugadores, 2 contra 2</b> (tú y la pareja de enfrente). Sin pozo. Los puntos de cada mano van al equipo ganador.' }[cfg.modo];
  root.innerHTML = `<p class="note">${nota}</p>
    <div class="bar"><span class="lbl">Modo</span>${seg('modo', Object.entries(M.MODOS))}</div>
    ${cfg.modo === 'parejas' ? '' : `<div class="bar"><span class="lbl">Jugadores</span>${seg('n', [[2, '👤 2'], [3, '👥 3'], [4, '👥 4']])}</div>`}
    <div class="bar"><span class="lbl">Fichas</span>${seg('doble', Object.entries(M.DOBLES).map(([k, l]) => [k, l]))}</div>
    <div class="bar"><span class="lbl">La partida termina…</span>${seg('objetivo', Object.entries(M.OBJETIVOS))}</div>
    <div class="bar"><span class="lbl">Nivel de la máquina</span>${seg('nivel', Object.entries(M.NIVELES))}</div>
    <div class="bar"><button class="btn on" data-ac="jugar">▶️ Jugar</button>${S && S.ganador === null ? '<button class="btn" data-ac="volver">Volver a la partida</button>' : ''}<button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>`;
}
function jugar() {
  api.setPref('cfg', cfg); parar(); S = M.crear(cfg); pausado = false; registrada = false; anim = true; armar(); guardar();
}

/* ---------- dibujo ---------- */
const celdas = n => { const p = { 0: [], 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9], 7: [1, 3, 4, 5, 6, 7, 9], 8: [1, 2, 3, 4, 6, 7, 8, 9], 9: [1, 2, 3, 4, 5, 6, 7, 8, 9] }[n]; return Array.from({ length: 9 }, (_, k) => `<i${p.includes(k + 1) ? ' class="p"' : ''}></i>`).join(''); };
const mitad = n => `<span class="dmh" data-n="${n}">${celdas(n)}<em>${n}</em></span>`;
const ficha = (f, extra = '', attrs = '') => `<span class="dmt${f[0] === f[1] ? ' d' : ''} ${extra}" ${attrs}>${mitad(f[0])}<b class="dml"></b>${mitad(f[1])}</span>`;
const dorso = () => '<i class="dmb"></i>';

function armar() {
  parar(); registrada = S.ganador !== null;
  root.innerHTML = `<div class="dmcab"><b>${esc(M.MODOS[S.modo])}</b><span id="dmInfo"></span></div>
    <div class="dmpts" id="dmPts"></div><div class="dmjug" id="dmJug"></div>
    <p class="dmmsg" id="dmMsg" role="status" aria-live="polite"></p>
    <div id="dmMesa" class="dmmesa"><div class="dmcad" id="dmCad"></div><div class="dmlados" id="dmLados" hidden></div><div class="dmmano" id="dmMano"></div></div>
    <div class="bar dmbar"><button class="btn" data-ac="robar" id="dmRobar">🂠 Robar</button><button class="btn" data-ac="pista">💡 Pista</button></div>
    <div id="dmFin"></div>${api.barraHtml()}`;
  aplicarAspecto(); medir(); pintar();
  if (S.fin) finDeMano(true); else siguiente();
}
const turnoHumano = () => S && !S.fin && S.turno === 0;
function describe(u) {
  if (!u) return ''; const q = nombre(u.p);
  if (u.tipo === 'ficha') return `${q} ${u.abre ? 'sale con' : 'pone'} ${u.f[0]}|${u.f[1]}${u.pts ? ` · <b>+${u.pts}</b>` : ''}`;
  return u.tipo === 'robo' ? `${q} roba una ficha` : `${q} pasa`;
}
function pintar() {
  if (!S || !$('#dmCad')) return;
  const eq = M.equipos(S), e = M.extremos(S), mia = turnoHumano(), mv = mia ? M.jugables(S, 0) : [], ok = new Set(mv.map(m => m.i));
  $('#dmInfo').textContent = `Mano ${S.mano}${M.conPozo(S.modo) ? ` · Pozo: ${S.pozo.length}` : ''}${S.objetivo ? ` · A ${S.objetivo}` : ''}`;
  $('#dmPts').innerHTML = Array.from({ length: eq }, (_, t) => `<div class="${!S.fin && M.equipo(S, S.turno) === t ? 'turno' : ''}"><small>${esc(nombreEq(t))}</small><b>${S.pts[t]}</b></div>`).join('');
  $('#dmJug').innerHTML = Array.from({ length: S.n - 1 }, (_, k) => k + 1).map(p => { const m = S.manos[p].length;
    return `<div class="dmj${!S.fin && S.turno === p ? ' turno' : ''}"><small>${esc(nombre(p))}</small><span>${dorso().repeat(Math.min(m, 14))}${m > 14 ? `<u>+${m - 14}</u>` : ''}</span><b>${m}</b></div>`; }).join('');
  // cadena en serpiente (las filas impares van de derecha a izquierda)
  const c = S.cadena;
  if (!c.length) $('#dmCad').innerHTML = `<p class="dmvac">${mia ? '¡Sales tú! Elige cualquier ficha.' : 'Sale ' + esc(nombre(S.turno)) + '…'}</p>`;
  else {
    const filas = []; for (let i = 0; i < c.length; i += cap) filas.push(c.slice(i, i + cap).map((f, k) => [f, i + k]));
    const lado = sel != null ? mv.filter(m => m.i === sel).map(m => m.lado) : [], nuevo = anim && S.ultimo && S.ultimo.tipo === 'ficha' ? (S.ultimo.lado === 'd' ? c.length - 1 : 0) : -1;
    $('#dmCad').innerHTML = filas.map((fila, r) => `<div class="dmrow${r % 2 ? ' rev' : ''}">${fila.map(([f, gi]) => {
      const fin = c.length > 1 ? (gi === 0 ? 'i' : gi === c.length - 1 ? 'd' : '') : '';
      const objetivo = fin && lado.includes(fin);
      return ficha(f, `${fin ? 'ext' : ''} ${objetivo ? 'obj' : ''} ${gi === nuevo ? 'nuevo' : ''}`, fin ? `data-end="${fin}"` : ''); }).join('')}</div>`).join('');
  }
  $('#dmMano').innerHTML = S.manos[0].map((f, i) => `<button type="button" class="dmx${mia && ok.has(i) ? ' ok' : ''}${sel === i ? ' sel' : ''}${pista === i ? ' pista' : ''}${mia && mv.length && !ok.has(i) ? ' no' : ''}" data-i="${i}" aria-label="Ficha ${f[0]} y ${f[1]}">${ficha(f, 'v')}</button>`).join('');
  // elegir extremo cuando la ficha encaja en los dos
  const lb = $('#dmLados'), ops = sel != null ? mv.filter(m => m.i === sel) : [];
  if (ops.length > 1 && e) { lb.hidden = false; lb.innerHTML = `<span>Poner en:</span><button class="btn" data-lado="i">⬅️ ${e[0]}</button><button class="btn" data-lado="d">${e[1]} ➡️</button>`; } else lb.hidden = true;
  const rb = $('#dmRobar'); rb.hidden = !M.conPozo(S.modo) || !!S.fin; rb.disabled = !(mia && M.puedeRobar(S, 0) && !pausado); rb.textContent = `🂠 Robar (${S.pozo.length})`;
  const m = $('#dmMsg'); let t = describe(S.ultimo);
  if (!S.fin) t += `${t ? ' · ' : ''}${mia ? (M.puedeRobar(S, 0) ? '<b>No tienes ficha: roba del pozo</b>' : M.debePasar(S, 0) ? '<b>No tienes ficha: pasas</b>' : '<b>Tu turno</b>') : `Turno de ${esc(nombre(S.turno))}…`}`;
  m.innerHTML = t; anim = false;
}

/* ---------- jugadas ---------- */
function ejecutar(p, a) {
  let r = null;
  if (a.t === 'jugar') { r = M.jugar(S, p, a.i, a.lado); if (r) { api.sonido(r.pts ? 'ok' : 'mover'); if (r.pts && p === 0) api.aviso(`+${r.pts} puntos`); } }
  else if (a.t === 'robar') { r = M.robar(S, p); if (r) api.sonido('click'); }
  else { r = M.pasar(S, p); if (r) api.sonido('error'); }
  if (!r) return false;
  sel = null; pista = null; anim = true; pintar(); guardar();
  if (S.fin) finDeMano(false); else siguiente();
  return true;
}
function siguiente() {
  clearTimeout(tim); tim = 0; if (!S || S.fin || pausado) return;
  const p = S.turno;
  if (p === 0) { if (M.debePasar(S, 0)) tim = setTimeout(() => { tim = 0; if (S && !S.fin && !pausado && S.turno === 0) ejecutar(0, { t: 'pasar' }); }, 1100); return; }
  tim = setTimeout(() => { tim = 0; if (S && !S.fin && !pausado && S.turno === p) ejecutar(p, M.cpu(S)); }, 700 + Math.random() * 500);
}
function tocarFicha(i) {
  if (!turnoHumano() || pausado) return;
  const ops = M.jugables(S, 0).filter(m => m.i === i);
  if (!ops.length) { api.sonido('error'); const e = M.extremos(S); const m = $('#dmMsg'); if (m && e) m.innerHTML = `Esa ficha no encaja: los extremos son <b>${e[0]}</b> y <b>${e[1]}</b>`; return; }
  pista = null;
  if (ops.length === 1) return void ejecutar(0, { t: 'jugar', i, lado: ops[0].lado });
  sel = sel === i ? null : i; api.sonido('click'); pintar();
}
function elegirLado(lado) { if (sel == null) return; const i = sel; ejecutar(0, { t: 'jugar', i, lado }); }
function darPista() {
  if (!turnoHumano() || pausado) return api.aviso('La pista solo está disponible en tu turno');
  const a = M.cpu(S, Math.random, 'dificil'); sel = null;
  if (a.t === 'jugar') { pista = a.i; pintar(); const e = M.extremos(S), m = $('#dmMsg'); if (m) m.innerHTML = `💡 Prueba la ficha marcada${e ? ` en el extremo ${a.lado === 'i' ? 'izquierdo (' + e[0] + ')' : 'derecho (' + e[1] + ')'}` : ''}`; }
  else { pista = null; pintar(); const m = $('#dmMsg'); if (m) m.innerHTML = a.t === 'robar' ? '💡 No tienes ficha que encaje: <b>roba del pozo</b>' : '💡 No puedes jugar: pasa'; }
}

/* ---------- fin de mano / partida ---------- */
function finDeMano(restaurada) {
  parar(); pintar();
  const f = S.fin, ganaTxt = f.ganador < 0 ? 'Empate: nadie suma puntos' : `${nombreEq(f.ganador)} ${f.ganador === 0 && S.modo !== 'parejas' ? 'sumas' : 'suma'} <b>${f.puntos}</b> ${f.puntos === 1 ? 'punto' : 'puntos'}`;
  const motivo = f.tipo === 'domino' ? `🀄 <b>${esc(nombre(f.jugador))}</b> se queda sin fichas` : '🔒 <b>Juego cerrado</b>: nadie puede mover';
  let fin = `<div class="dmfin"><p>${motivo}. ${ganaTxt}.</p><div class="dmrev">${S.manos.map((m, p) => m.length ? `<div><small>${esc(nombre(p))} · ${f.pips[p]}</small><span>${m.map(x => ficha(x, 'mini')).join('')}</span></div>` : '').join('')}</div>`;
  if (S.ganador === null) fin += '<div class="bar"><button class="btn on" data-ac="sigmano">▶️ Siguiente mano</button></div>';
  else {
    const g = S.ganador, txt = g === -1 ? '🤝 <b>¡Empate!</b>' : g === 0 ? `🏆 <b>${S.modo === 'parejas' ? '¡Ganáis la partida!' : '¡Has ganado la partida!'}</b>` : `😞 <b>${S.modo === 'parejas' ? 'Gana el equipo rival' : 'Gana ' + esc(nombre(g))}</b>`;
    fin += `<p class="dmgan">${txt}</p><div class="bar"><button class="btn on" data-ac="jugar">🆕 Nueva partida</button></div>`;
  }
  $('#dmFin').innerHTML = fin + '</div>'; guardar();
  if (restaurada) return;
  api.sonido(S.ganador === 0 || f.ganador === 0 ? 'ganar' : 'perder');
  if (S.ganador !== null && !registrada) { registrada = true; api.registrar({ res: S.ganador === -1 ? 'tablas' : S.ganador === 0 ? 'victoria' : 'derrota', variante: corto(S) }); }
}
function siguienteMano() { M.siguienteMano(S); $('#dmFin').innerHTML = ''; sel = null; pista = null; anim = true; medir(); pintar(); guardar(); siguiente(); }

/* ---------- entrada ---------- */
function clic(e) {
  const x = e.target.closest('.dmx'); if (x) return tocarFicha(+x.dataset.i);
  const ext = e.target.closest('.ext.obj'); if (ext) return elegirLado(ext.dataset.end);
  const l = e.target.closest('[data-lado]'); if (l) return elegirLado(l.dataset.lado);
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.cfg) { cfg[d.cfg] = num[d.cfg] ? +d.v : d.v; if (d.cfg === 'modo' && d.v === 'parejas') cfg.n = 4; cfg = M.normalizar(cfg); api.setPref('cfg', cfg); return setup(); }
  const a = d.ac;
  if (a === 'jugar') { if (S && S.ganador === null && S.cadena.length > 2 && !api.confirmar('¿Empezar una partida nueva y abandonar la actual?')) return; jugar(); }
  else if (a === 'volver') armar(); else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas();
  else if (a === 'robar') { if (turnoHumano() && M.puedeRobar(S, 0) && !pausado) ejecutar(0, { t: 'robar' }); }
  else if (a === 'pista') darPista(); else if (a === 'sigmano') siguienteMano();
}
function reglas() {
  api.modal('Dominó', `<ul><li>Cada jugador recibe sus fichas. Sale quien tenga el <b>doble más alto</b> (su ficha se pone sola). Después, por turnos, pon una ficha cuyo número coincida con uno de los <b>dos extremos</b> de la cadena. Si la ficha encaja por los dos lados, elige el extremo.</li>
    <li><b>Clásico</b>: si no tienes ficha, robas del pozo hasta poder jugar; si el pozo se acaba, pasas. <b>Bloqueo</b> y <b>Por parejas</b>: sin pozo, pasas. <b>De a cinco</b>: como el clásico, y cada jugada que deje los extremos sumando un múltiplo de 5 puntúa esa suma (un doble en un extremo cuenta por las dos mitades).</li>
    <li>Gana la mano quien se queda sin fichas y suma los puntos de las fichas de los rivales. Si nadie puede mover, el juego se <b>cierra</b> y gana quien menos puntos tenga en la mano.</li>
    <li>Partida: a una sola mano o hasta 50, 100 o 200 puntos. <b>Por parejas</b>: tú y la ficha de enfrente (tu pareja) contra los otros dos; los puntos van al equipo.</li>
    <li>💡 La pista te señala una buena jugada. La máquina tiene 3 niveles; en Difícil recuerda qué números les faltan a los demás.</li>
    <li>🎨 En Apariencia cambias el tapete y las fichas: color (más de 60), textura, forma, tamaño y estilo de los puntos.</li></ul>`);
}
