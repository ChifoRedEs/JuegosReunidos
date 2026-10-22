// Cifras y Letras: rondas alternas de Letras (la palabra más larga con 9 letras) y Cifras (llegar a un número con 6).
import { $, esc } from '../../core/dom.js';
import { grupoFondo, grupoTablero } from '../../core/aspectos.js';
import * as D from '../../core/diccionario.js';
import * as C from './motor.js';

const NIVEL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
const FICHAS = { tele: { nombre: 'Concurso', sw: ['#1D3A8A', '#FFD23F'] }, madera: { nombre: 'Madera', sw: ['#E8C48A', '#6B4423'] }, pizarra: { nombre: 'Pizarra', sw: ['#25332B', '#F3F1E7'] }, color: { nombre: 'Del tablero', sw: ['#6A3DF0', '#fff'] } };
let S = null, api = null, asp = null, root = null, reloj = null, onKey = null, onVis = null, reg = false, sel = [], pasos = [], pend = null, dicListo = false;
let cfg = { rondas: 6, tiempo: 45, rival: 'cpu', nivel: 'medio' };

/* ---------- validación / resumen ---------- */
export function validar(d) { const s = d && C.validar(d.s); return s ? { s, reg: !!d.reg } : null; }
export const migrarV1 = d => d;
export function resumen(d) {
  const s = d.s, pre = s.reto ? '📅 Reto · ' : '';
  if (s.fase === 'fin') return { texto: pre + (s.rival === 'cpu' ? `${s.puntos[0]}-${s.puntos[1]} contra la CPU` : `${s.puntos[0]} puntos`), fin: true };
  return { texto: pre + `Ronda ${s.ronda + 1}/${s.rondas} · ${s.puntos[0]} puntos`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; sel = []; pasos = []; pend = null;
  asp = api.aspecto([{ ...grupoFondo('.cymesa'), def: 'azar' }, grupoTablero(),
    { clave: 'fichas', titulo: 'Fichas', def: 'tele', opciones: Object.entries(FICHAS).map(([id, f]) => ({ id, nombre: f.nombre, sw: f.sw })) }], () => pintar());
  await api.css(new URL('./cifrasletras.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && C.RONDAS.includes(c0.rondas) && C.TIEMPOS.includes(c0.tiempo) && NIVEL[c0.nivel]) cfg = { ...cfg, ...c0 };
  const g = api.cargar(); S = g ? g.s : null; reg = g ? g.reg : false;
  dicListo = D.cargado(); D.cargar().then(ok => { dicListo = ok; if (S) pintar(); });           // el diccionario (≈1,5 MB la primera vez)
  root.addEventListener('click', clic);
  onKey = tecla; document.addEventListener('keydown', onKey);
  onVis = () => { if (document.hidden) { pararReloj(); guardar(); } else if (S && S.fase === 'pensar') arrancarReloj(); }; document.addEventListener('visibilitychange', onVis);
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '📅 Reto del día', accion: reto }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  armar();
  if (S && S.fase === 'pensar') arrancarReloj();
}
export function unmount() {
  pararReloj(); guardar();
  document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis);
  if (root) root.removeEventListener('click', clic);
  S = null; asp = null;
}
function guardar() { if (!S) return; const d = { s: S, reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- pantallas ---------- */
function armar() {
  root.innerHTML = `<div id="cyReto"></div>
    <details class="ops" id="cyOps"><summary id="cySum"></summary>
      <div class="bar"><span class="lbl">Rondas</span><div class="seg">${C.RONDAS.map(n => `<button class="btn" data-cfg="rondas" data-v="${n}">${n}</button>`).join('')}</div></div>
      <div class="bar"><span class="lbl">Tiempo</span><div class="seg">${C.TIEMPOS.map(t => `<button class="btn" data-cfg="tiempo" data-v="${t}">${t ? t + ' s' : 'Sin límite'}</button>`).join('')}</div></div>
      <div class="bar"><span class="lbl">Rival</span><div class="seg"><button class="btn" data-cfg="rival" data-v="cpu">🤖 CPU</button><button class="btn" data-cfg="rival" data-v="solo">👤 Solo</button></div></div>
      <div class="bar" id="cyNiv"><span class="lbl">Nivel</span><div class="seg">${Object.entries(NIVEL).map(([k, l]) => `<button class="btn" data-cfg="nivel" data-v="${k}">${l}</button>`).join('')}</div></div>
      <div class="bar"><button class="btn on" data-ac="start">Nueva partida</button></div></details>
    <div class="cymesa" id="cyMesa"></div>
    <div class="bar" style="justify-content:center"><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>`;
  if (!S) { $('#cyOps').open = true; empezar(); return; }
  pintar();
}
function empezar(reto = null) {
  pararReloj(); api.setPref('cfg', cfg);
  S = C.crear(reto ? { rondas: 4, tiempo: 45, rival: 'solo', nivel: 'medio', reto } : cfg); reg = false; sel = []; pasos = []; pend = null;
  if (reto) S.datos = api.reto.generar(() => [C.letrasAlAzar(Math.random), C.numerosAlAzar(Math.random), C.letrasAlAzar(Math.random), C.numerosAlAzar(Math.random)]);
  prepararRonda(); pintar(); guardar();
}
function nuevaSetup() { if (S && S.fase !== 'fin' && S.ronda && !api.confirmar('¿Empezar una partida nueva?')) return; empezar(); $('#cyOps').open = false; }
function reto() {
  if (api.reto.hecho()) { api.aviso('Ya has completado el reto de hoy'); return; }
  if (S && S.reto === api.reto.fecha() && S.fase !== 'fin') return;
  if (S && S.fase !== 'fin' && S.ronda && !api.confirmar('¿Dejar la partida actual y jugar el reto del día?')) return;
  empezar(api.reto.fecha());
}
// Ronda nueva: en el reto los datos ya están sorteados; si no, se eligen letras / se sacan números
function prepararRonda() {
  S.letras = []; S.numeros = []; S.objetivo = 0; S.mia = null; S.cpu = null; S.mejor = null; sel = []; pasos = []; pend = null; S.quedan = S.tiempo;
  const tipo = C.tipoRonda(S.ronda);
  if (S.datos) { const d = S.datos[S.ronda]; if (tipo === 'letras') S.letras = d.slice(); else { S.numeros = d.numeros.slice(); S.objetivo = d.objetivo; } S.fase = 'pensar'; arrancarReloj(); }
  else S.fase = 'elegir';
}

/* ---------- reloj ---------- */
function arrancarReloj() { pararReloj(); if (!S || !S.tiempo) return; let t0 = performance.now(); reloj = setInterval(() => { const t = performance.now(); S.quedan = Math.max(0, S.quedan - (t - t0) / 1000); t0 = t; pintarReloj(); if (S.quedan <= 0) { pararReloj(); api.sonido('error'); enviar(); } else if (S.quedan < 5.05 && Math.abs(S.quedan - Math.round(S.quedan)) < .06) api.sonido('click'); }, 100); }
function pararReloj() { clearInterval(reloj); reloj = null; }
function pintarReloj() { const b = $('#cyBarra'); if (!b || !S.tiempo) return; b.style.setProperty('--p', S.quedan / S.tiempo); b.classList.toggle('poco', S.quedan < 10); $('#cySeg').textContent = Math.ceil(S.quedan); }

/* ---------- pintado ---------- */
const ficha = (t, extra = '') => `<span class="cyf ${extra}">${t}</span>`;
function pintar() {
  if (!S || !$('#cyMesa')) return;
  root.dataset.fichas = asp.valores.fichas;
  pintarReto();
  root.querySelectorAll('[data-cfg]').forEach(b => b.classList.toggle('on', String(cfg[b.dataset.cfg]) === b.dataset.v));
  $('#cyNiv').hidden = cfg.rival !== 'cpu';
  $('#cySum').textContent = `⚙️ ${cfg.rondas} rondas · ${cfg.tiempo ? cfg.tiempo + ' s' : 'sin límite'} · ${cfg.rival === 'cpu' ? 'CPU ' + NIVEL[cfg.nivel].toLowerCase() : 'solo'}`;
  const tipo = C.tipoRonda(S.ronda), m = $('#cyMesa');
  const marcador = `<div class="cymarc"><span class="yo"><small>Tú</small><b>${S.puntos[0]}</b></span><em>${S.fase === 'fin' ? 'Final' : `Ronda ${S.ronda + 1} de ${S.rondas}`}<br><b>${S.fase === 'fin' ? '' : tipo === 'letras' ? '🔤 Letras' : '🔢 Cifras'}</b></em>${S.rival === 'cpu' ? `<span><small>CPU ${NIVEL[S.nivel].toLowerCase()}</small><b>${S.puntos[1]}</b></span>` : '<span class="vacio"></span>'}</div>`;
  const barra = S.fase === 'pensar' && S.tiempo ? `<div class="cybarra" id="cyBarra" style="--p:${S.quedan / S.tiempo}"><i></i><span id="cySeg">${Math.ceil(S.quedan)}</span></div>` : '';
  m.innerHTML = marcador + barra + (S.fase === 'fin' ? htmlFin() : S.fase === 'resultado' ? htmlResultado(tipo) : tipo === 'letras' ? htmlLetras() : htmlCifras());
}
function pintarReto() {
  const r = $('#cyReto'); if (!r) return;
  const hoy = api.reto.fecha(), hecho = api.reto.hecho(), jugando = S && S.reto === hoy && S.fase !== 'fin', k = `${hoy}|${hecho}|${jugando}`;
  if (r.dataset.k === k) return; r.dataset.k = k;
  r.innerHTML = `<div class="reto ${hecho ? 'hecho' : ''}"><span>${hecho ? '✅' : '📅'}</span><div><b>Reto del día · ${api.reto.texto(hoy)}</b>${hecho ? 'Completado. Vuelve mañana para otro.' : jugando ? 'Estás jugando el reto: las mismas letras y cifras para todo el mundo.' : '4 rondas (2 de letras y 2 de cifras), las mismas para todos hoy.'}</div>${hecho || jugando ? '' : '<button class="btn on" data-ac="reto">Jugar</button>'}</div>`;
}
function htmlLetras() {
  if (S.fase === 'elegir') {
    const p = C.puedePedir(S.letras), hueco = Array.from({ length: 9 }, (_, i) => ficha(S.letras[i] || '', S.letras[i] ? '' : 'vacia')).join('');
    return `<p class="cyayuda">Pide 9 letras: al menos ${C.MIN_VOCALES} vocales y ${C.MIN_CONSONANTES} consonantes.</p><div class="cyfila l9">${hueco}</div>
      <div class="bar cyctl"><button class="btn on" data-ac="vocal" ${p.v ? '' : 'disabled'}>Vocal</button><button class="btn on" data-ac="consonante" ${p.c ? '' : 'disabled'}>Consonante</button><button class="btn" data-ac="azar" ${S.letras.length ? 'disabled' : ''}>🎲 Al azar</button></div>`;
  }
  const usados = new Set(sel), palabra = sel.map(i => S.letras[i]).join('');
  return `<p class="cyayuda">Forma la palabra más larga que puedas con estas letras (cada una una vez). Tócalas o escríbelas.</p>
    <div class="cyfila l9">${S.letras.map((l, i) => `<button type="button" class="cyf ${usados.has(i) ? 'usada' : ''}" data-l="${i}" ${usados.has(i) ? 'disabled' : ''}>${l}</button>`).join('')}</div>
    <div class="cypal" aria-live="polite">${palabra ? [...palabra].map(l => ficha(l, 'mini')).join('') : '<span class="cyvacio">Tu palabra</span>'}</div>
    <div class="bar cyctl"><button class="btn" data-ac="borrarL">⌫</button><button class="btn" data-ac="limpiar">Borrar</button><button class="btn on" data-ac="enviar" ${dicListo ? '' : 'disabled'}>${dicListo ? '✔ Listo' : 'Cargando diccionario…'}</button></div>`;
}
function disponibles() {                              // números que quedan tras los pasos (con su procedencia)
  const l = S.numeros.map((n, i) => ({ n, k: 'o' + i }));
  pasos.forEach(([a, , b, r], s) => { l.splice(l.findIndex(x => x.k === a.k), 1); l.splice(l.findIndex(x => x.k === b.k), 1); l.push({ n: r, k: 'p' + s }); });
  return l;
}
function htmlCifras() {
  if (S.fase === 'elegir') return `<p class="cyayuda">Seis números y un objetivo de tres cifras: acércate todo lo que puedas con + − × ÷ (resultados enteros y positivos).</p>
    <div class="cyobj">${'?'.repeat(3)}</div><div class="cyfila">${Array.from({ length: 6 }, () => ficha('', 'vacia num')).join('')}</div>
    <div class="bar cyctl"><button class="btn on" data-ac="sacar">🎲 Sacar números</button></div>`;
  const disp = disponibles(), mejor = disp.reduce((a, x) => (Math.abs(x.n - S.objetivo) < Math.abs(a.n - S.objetivo) ? x : a), disp[0]);
  return `<div class="cyobj">${S.objetivo}</div>
    <div class="cyfila">${disp.map(x => `<button type="button" class="cyf num ${pend && pend.a.k === x.k ? 'sel' : ''} ${x.k[0] === 'p' ? 'nuevo' : ''}" data-n="${x.k}">${x.n}</button>`).join('')}</div>
    <div class="cyops">${['+', '-', '×', '÷'].map(o => `<button type="button" class="btn ${pend && pend.op === o ? 'on' : ''}" data-op="${o}" ${pend ? '' : 'disabled'}>${o === '-' ? '−' : o}</button>`).join('')}</div>
    <ol class="cypasos">${pasos.map(([a, o, b, r]) => `<li>${a.n} ${o === '-' ? '−' : o} ${b.n} = <b>${r}</b></li>`).join('') || '<li class="cyvacio">Toca un número, una operación y otro número</li>'}</ol>
    <p class="cyayuda">Tu resultado: <b>${mejor.n}</b> ${mejor.n === S.objetivo ? '🎯' : `(a ${Math.abs(mejor.n - S.objetivo)})`}</p>
    <div class="bar cyctl"><button class="btn" data-ac="deshacerC" ${pasos.length ? '' : 'disabled'}>↶ Deshacer</button><button class="btn on" data-ac="enviar">✔ Listo</button></div>`;
}
function htmlResultado(tipo) {
  const h = S.hist[S.hist.length - 1], cpu = S.rival === 'cpu';
  const fila = (quien, txt, pts, ok) => `<div class="cyres ${ok ? '' : 'mal'}"><small>${quien}</small><b>${txt}</b><i>+${pts}</i></div>`;
  let cuerpo;
  if (tipo === 'letras') {
    cuerpo = fila('Tú', S.mia.palabra ? esc(S.mia.palabra) + (S.mia.valida ? '' : ` <span class="cyno">${S.mia.motivo}</span>`) : '—', h.pts[0], S.mia.valida)
      + (cpu ? fila('CPU', esc(S.cpu.palabra || '—'), h.pts[1], true) : '')
      + `<div class="cymejor"><small>Las más largas posibles</small>${(S.mejor || []).slice(0, 6).map(p => `<span>${esc(p)}</span>`).join('') || 'Ninguna'}</div>`;
  } else {
    cuerpo = fila('Tú', `${S.mia.valor} ${S.mia.valor === S.objetivo ? '🎯' : `(a ${Math.abs(S.mia.valor - S.objetivo)})`}`, h.pts[0], true)
      + (cpu ? fila('CPU', `${S.cpu.valor} ${S.cpu.valor === S.objetivo ? '🎯' : `(a ${Math.abs(S.cpu.valor - S.objetivo)})`}`, h.pts[1], true) : '')
      + `<div class="cymejor"><small>${S.mejor.valor === S.objetivo ? 'Una solución exacta' : `Lo más cerca posible: ${S.mejor.valor}`}</small><ol class="cypasos">${S.mejor.pasos.map(([a, o, b, r]) => `<li>${a} ${o === '-' ? '−' : o} ${b} = <b>${r}</b></li>`).join('') || '<li>Basta con uno de los números</li>'}</ol></div>`;
  }
  const ultima = S.ronda + 1 >= S.rondas;
  return `<div class="cyresw">${cuerpo}</div><div class="bar cyctl"><button class="btn on" data-ac="siguiente">${ultima ? 'Ver el resultado final' : 'Siguiente ronda ▶'}</button></div>`;
}
function htmlFin() {
  const [a, b] = S.puntos, cpu = S.rival === 'cpu';
  const t = !cpu ? `Has sumado <b>${a}</b> puntos en ${S.rondas} rondas.` : a > b ? '🏆 ¡Has ganado a la CPU!' : a < b ? 'Ha ganado la CPU' : '🤝 Empate';
  return `<div class="cyfin"><p>${t}</p><table class="tabla">${S.hist.map((h, i) => `<tr><td>${i + 1}. ${h.tipo === 'letras' ? '🔤' : '🔢'} ${esc(h.resumen)}</td><td><b>${h.pts[0]}</b>${cpu ? ` · ${h.pts[1]}` : ''}</td></tr>`).join('')}</table>
    <div class="bar cyctl"><button class="btn on" data-ac="start">🔁 Otra partida</button></div></div>`;
}

/* ---------- jugar ---------- */
function pedir(tipo) { if (S.letras.length >= 9) return; $('#cyOps').open = false; S.letras.push(C.sacarLetra(tipo)); api.sonido('click'); if (S.letras.length === 9) empezarPensar(); else { pintar(); guardar(); } }
function empezarPensar() { S.fase = 'pensar'; S.quedan = S.tiempo; sel = []; pintar(); arrancarReloj(); guardar(); }
function enviar() {
  if (S.fase !== 'pensar') return;
  if (C.tipoRonda(S.ronda) === 'letras' && !dicListo) { api.aviso('El diccionario aún no está cargado'); return; }
  pararReloj();
  const tipo = C.tipoRonda(S.ronda);
  if (tipo === 'letras') {
    const p = sel.map(i => S.letras[i]).join(''), forms = D.formables(S.letras.join(''), { min: 2, max: 9 }).map(w => w.toUpperCase());
    const valida = p.length >= 2 && D.existe(p);
    S.mia = { palabra: p, valida, motivo: !p ? '' : p.length < 2 ? 'demasiado corta' : 'no está en el diccionario' };
    const cp = S.rival === 'cpu' ? C.palabraCPU(forms, S.nivel) : ''; S.cpu = S.rival === 'cpu' ? { palabra: cp, valida: !!cp } : null;
    S.mejor = forms.filter(w => w.length === (forms[0] || '').length).concat(forms.filter(w => w.length < (forms[0] || '').length)).slice(0, 6);
  } else {
    const disp = disponibles(), m = disp.reduce((a, x) => (Math.abs(x.n - S.objetivo) < Math.abs(a.n - S.objetivo) ? x : a), disp[0]);
    S.mia = { valor: m.n, pasos: pasos.map(([a, o, b, r]) => [a.n, o, b.n, r]) };
    S.cpu = S.rival === 'cpu' ? C.cifrasCPU(S.numeros, S.objetivo, S.nivel) : null;
    S.mejor = C.resolverCifras(S.numeros, S.objetivo);
  }
  const pts = C.puntuar(S, tipo, S.mia, S.cpu); S.puntos[0] += pts[0]; S.puntos[1] += pts[1];
  S.hist.push({ tipo, pts, resumen: tipo === 'letras' ? `${S.mia.palabra || '—'}${S.mia.valida ? '' : ' ✗'}` : `${S.objetivo} → ${S.mia.valor}` });
  S.fase = 'resultado'; api.sonido(pts[0] ? 'ok' : 'error'); pintar(); guardar();
}
function siguiente() {
  S.ronda++;
  if (S.ronda >= S.rondas) return terminar();
  prepararRonda(); pintar(); guardar();
}
function terminar() {
  S.fase = 'fin'; pintar(); guardar();
  if (reg) return; reg = true;
  const [a, b] = S.puntos;
  if (S.rival === 'cpu') api.registrar({ res: a > b ? 'victoria' : a < b ? 'derrota' : 'tablas', variante: `${S.rondas} rondas · ${NIVEL[S.nivel]}` });
  else api.registrar({ res: 'partida', variante: S.reto ? 'Reto del día' : `${S.rondas} rondas`, puntos: a });
  if (S.reto && api.reto.completar(S.reto)) setTimeout(() => api.aviso('📅 ¡Reto del día completado!'), 400);
  api.sonido(S.rival === 'cpu' && a < b ? 'perder' : 'ganar'); guardar();
}
function tocarNumero(k) {
  const x = disponibles().find(q => q.k === k); if (!x) return;
  if (!pend) { pend = { a: x }; }
  else if (!pend.op) { pend = pend.a.k === x.k ? null : { a: x }; }
  else if (pend.a.k !== x.k) {
    const r = C.operar(pend.a.n, pend.op, x.n);
    if (r === null) { api.aviso(pend.op === '÷' ? 'La división tiene que ser exacta' : 'El resultado tiene que ser positivo'); api.sonido('error'); pend = null; return pintar(); }
    pasos.push([pend.a, pend.op, x, r]); pend = null; api.sonido(r === S.objetivo ? 'ganar' : 'click');
  }
  pintar();
}

/* ---------- entrada ---------- */
function tecla(e) {
  if (!S || S.fase !== 'pensar' || document.querySelector('.modal') || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (e.key === 'Enter') { e.preventDefault(); return enviar(); }
  if (C.tipoRonda(S.ronda) !== 'letras') return;
  if (e.key === 'Backspace') { e.preventDefault(); sel.pop(); return pintar(); }
  if (e.key.length !== 1) return;
  const L = e.key.toUpperCase() === 'Ñ' ? 'Ñ' : e.key.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const i = S.letras.findIndex((x, k) => x === L && !sel.includes(k)); if (i >= 0) { sel.push(i); pintar(); }
}
function clic(e) {
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.cfg) { cfg[d.cfg] = ['rondas', 'tiempo'].includes(d.cfg) ? +d.v : d.v; api.setPref('cfg', cfg); return pintar(); }
  if (d.l != null) { sel.push(+d.l); api.sonido('click'); return pintar(); }
  if (d.n) return tocarNumero(d.n);
  if (d.op) { if (pend) { pend.op = d.op; pintar(); } return; }
  const a = d.ac;
  if (a === 'start') { empezar(); $('#cyOps').open = false; } else if (a === 'reto') reto();
  else if (a === 'vocal') pedir('v'); else if (a === 'consonante') pedir('c');
  else if (a === 'azar') { S.letras = C.letrasAlAzar(); empezarPensar(); }
  else if (a === 'sacar') { $('#cyOps').open = false; const r = C.numerosAlAzar(); S.numeros = r.numeros; S.objetivo = r.objetivo; api.sonido('dado'); empezarPensar(); }
  else if (a === 'borrarL') { sel.pop(); pintar(); } else if (a === 'limpiar') { sel = []; pintar(); }
  else if (a === 'deshacerC') { pasos.pop(); pend = null; pintar(); }
  else if (a === 'enviar') enviar(); else if (a === 'siguiente') siguiente();
  else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas();
}
function reglas() {
  api.modal('Cifras y Letras', `<ul><li>La partida alterna rondas de <b>Letras</b> y de <b>Cifras</b>. Tienes ${S && S.tiempo ? S.tiempo + ' segundos' : 'el tiempo elegido'} para pensar (o sin límite).</li>
    <li>🔤 <b>Letras</b>: pide 9 letras eligiendo vocal o consonante (al menos 3 de cada) y forma la palabra más larga que puedas, usando cada letra una sola vez. Vale cualquier palabra del diccionario, también plurales, femeninos y verbos conjugados; las tildes no importan. Cada letra es un punto y una palabra de 9 letras vale 18.</li>
    <li>🔢 <b>Cifras</b>: con seis números y + − × ÷ acércate lo más posible al objetivo. Cada número se usa una vez como mucho, las divisiones tienen que ser exactas y no valen resultados negativos. Exacto: 10 puntos; a 5 o menos: 7; a 10 o menos: 5.</li>
    <li>Contra la CPU, en cada ronda solo puntúa la mejor respuesta (si empatáis, los dos). Al final de cada ronda ves las mejores palabras posibles o una solución.</li>
    <li>📅 <b>Reto del día</b>: 4 rondas con las mismas letras y cifras para todo el mundo.</li>
    <li>El diccionario es el de LibreOffice (unas 590.000 palabras); la primera vez se descarga y queda guardado para jugar sin conexión.</li></ul>`);
}
