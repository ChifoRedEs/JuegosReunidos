import { $, esc, esperar } from '../../core/dom.js';
import { grupoTablero, grupoFondo, grupoPersonaje, emojiPersonaje } from '../../core/aspectos.js';
import * as T from './motor.js';

const FORMAS = ['circulo', 'estrella', 'diamante', 'cuadrado'];
let S = null, api = null, asp = null, root = null, timer = null, rodando = false, cfg = { nCat: 6, modo: 'opciones', nivel: 'medio', banco: 'mix', jug: [['Tú', 'h'], ['CPU 1', 'c'], ['CPU 2', 'c'], ['CPU 3', 'c']] }, reg = false;

/* ---------- validación / resumen ---------- */
export function validar(d) { const s = d && T.validar(d.s); return s ? { s, reg: !!d.reg } : null; }
export const migrarV1 = d => d;
export function resumen(d) {
  const s = d.s;
  return s.fase === 'fin' ? { texto: `${s.jug.length} jugadores · ganó ${s.jug[s.ganador].nombre}`, fin: true } : { texto: `${s.jug.length} jugadores · ronda ${s.ronda} · ${s.jug[s.turno].nombre}`, fin: false };
}

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; rodando = false;
  asp = api.aspecto([grupoFondo('#tvB'), grupoPersonaje('Personajes (tu ficha)'), grupoTablero(), { clave: 'ficha', titulo: 'Fichas de los jugadores', def: 'circulo', opciones: [{ id: 'circulo', nombre: '● Círculo' }, { id: 'estrella', nombre: '★ Estrella' }, { id: 'diamante', nombre: '◆ Diamante' }, { id: 'cuadrado', nombre: '■ Cuadrado' }] }], () => { if (S) pintar(); });
  await api.css(new URL('./trivial.css', import.meta.url));
  const c0 = api.pref('cfg', null); if (c0 && [6, 9].includes(c0.nCat) && ['opciones', 'escribir'].includes(c0.modo) && T.NIVEL[c0.nivel] && Array.isArray(c0.jug) && c0.jug.length === 4) cfg = { ...c0, banco: T.BANCOS[c0.banco] ? c0.banco : 'mix', jug: c0.jug.map(([n, t]) => [String(n).slice(0, 14), ['h', 'c', 'n'].includes(t) ? t : 'c']) };
  const g = api.cargar(); S = g ? g.s : null; reg = g ? g.reg : false;
  root.addEventListener('click', clic); root.addEventListener('input', alEscribir); root.addEventListener('keydown', alTecla);
  api.barra({ nueva: () => { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; clearTimeout(timer); empezar(); },
    salir: () => { clearTimeout(timer); api.borrar(); setup(); },
    pausar: () => clearTimeout(timer),
    reanudar: () => { if (S && S.fase !== 'fin') bucle(); },
    config: { valores: () => ({ j0: cfg.jug[0][1], j1: cfg.jug[1][1], j2: cfg.jug[2][1], j3: cfg.jug[3][1], nCat: cfg.nCat, banco: cfg.banco, modo: cfg.modo, nivel: cfg.nivel }), grupos: v => [...[0, 1, 2, 3].map(i => ({ clave: 'j' + i, titulo: `Jugador ${i + 1} · ${cfg.jug[i][0]}`, opciones: [['h', 'Persona'], ['c', 'CPU'], ['n', 'Nadie']] })), { clave: 'nCat', titulo: 'Quesitos', opciones: [[6, '6 categorías'], [9, '9 (completo)']] }, { clave: 'banco', titulo: 'Preguntas', opciones: Object.entries(T.BANCOS) }, { clave: 'modo', titulo: 'Respuestas', opciones: [['opciones', '4 opciones'], ['escribir', 'Escribir']] }, { clave: 'nivel', titulo: 'Nivel CPU', opciones: Object.entries(T.NIVEL).map(([k, x]) => [k, x.nombre]) }], aplicar: v => { if ([0, 1, 2, 3].filter(i => v['j' + i] !== 'n').length < 2) { api.aviso('Hacen falta al menos 2 jugadores'); return; } [0, 1, 2, 3].forEach(i => { cfg.jug[i][1] = v['j' + i]; }); cfg.nCat = v.nCat; cfg.banco = v.banco; cfg.modo = v.modo; cfg.nivel = v.nivel; empezar(); } } });
  api.menu([{ texto: 'Nueva partida', accion: nuevaSetup }, { texto: '🎨 Apariencia', accion: () => asp.abrir() }, { texto: 'Reglas', accion: reglas }]);
  if (S) { armar(); pintar(); bucle(); } else setup();
}
export function unmount() { clearTimeout(timer); if (root) { root.removeEventListener('click', clic); root.removeEventListener('input', alEscribir); root.removeEventListener('keydown', alTecla); } S = null; asp = null; }
function guardar() { if (!S) return; const d = { s: S, reg }; const r = resumen(d); api.guardar(d, r.texto, r.fin); }

/* ---------- pantallas ---------- */
function setup() {
  S = null; clearTimeout(timer); const n = cfg.jug.filter(j => j[1] !== 'n').length;
  root.innerHTML = `<p class="note">Responde preguntas de cultura general (de tipo test o definiciones: ¿qué término es?) y mueve tu ficha por el tablero. Reúne un quesito de cada categoría y responde la pregunta final en el centro.</p>
    ${cfg.jug.map(([nom, t], i) => `<div class="jugfila" style="--c:${T.COLORES_J[i]}"><span class="jf-dot"></span><input class="nom" data-name="${i}" maxlength="14" value="${esc(nom)}" aria-label="Nombre del jugador ${i + 1}"><div class="seg">${[['h', 'Persona'], ['c', 'CPU'], ['n', 'Nadie']].map(([k, l]) => `<button class="btn ${t === k ? 'on' : ''}" data-tipo="${i},${k}">${l}</button>`).join('')}</div></div>`).join('')}
    <div class="bar"><span class="lbl">Quesitos</span><div class="seg"><button class="btn ${cfg.nCat === 6 ? 'on' : ''}" data-ncat="6">6 categorías</button><button class="btn ${cfg.nCat === 9 ? 'on' : ''}" data-ncat="9">9 (completo)</button></div></div>
    <div class="bar"><span class="lbl">Preguntas</span><div class="seg">${Object.entries(T.BANCOS).map(([k, l]) => `<button class="btn ${cfg.banco === k ? 'on' : ''}" data-banco="${k}">${l}</button>`).join('')}</div></div>
    <div class="bar"><span class="lbl">Respuestas</span><div class="seg"><button class="btn ${cfg.modo === 'opciones' ? 'on' : ''}" data-modo="opciones">4 opciones</button><button class="btn ${cfg.modo === 'escribir' ? 'on' : ''}" data-modo="escribir">Escribir</button></div></div>
    <div class="bar"><span class="lbl">Nivel CPU</span><div class="seg">${Object.entries(T.NIVEL).map(([k, v]) => `<button class="btn ${cfg.nivel === k ? 'on' : ''}" data-niv="${k}">${v.nombre}</button>`).join('')}</div></div>
    <div class="bar"><button class="btn on" data-ac="start" ${n < 2 ? 'disabled' : ''}>Empezar partida</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button><button class="btn" data-ac="reglas">Reglas</button></div>
    <p class="note">${cfg.nCat === 6 ? 'Geografía, Historia, Ciencias, Arte y literatura, Espectáculos y Deportes.' : 'Añade Mitología y filosofía, Gastronomía y Cultura general (partidas más largas).'} Banco de 450 definiciones y ${cfg.nCat * 15} preguntas clásicas.</p>`;
}
function armar() {
  root.innerHTML = `<div class="tvj" id="tvJ"></div><svg class="tvb" id="tvB" viewBox="0 0 320 320" role="img" aria-label="Tablero circular del Trivial"></svg><div class="tvpanel" id="tvP"></div><ul class="tvlog" id="tvL"></ul>
    <div class="bar"><button class="btn" data-ac="reglas">Reglas</button></div>${api.barraHtml()}`;
}
function nuevaSetup() { if (S && S.fase !== 'fin' && !api.confirmar('¿Abandonar la partida actual?')) return; clearTimeout(timer); api.borrar(); setup(); }
function empezar() {
  const jugadores = cfg.jug.map(([nombre, t]) => ({ nombre: nombre.trim() || 'Jugador', cpu: t === 'c', activo: t !== 'n' })).filter(j => j.activo);
  api.setPref('cfg', cfg); S = T.crear({ nCat: cfg.nCat, modo: cfg.modo, nivel: cfg.nivel, banco: cfg.banco, jugadores }); reg = false; armar(); pintar(); guardar(); bucle();
}

/* ---------- tablero SVG ---------- */
const CX = 160, CY = 160, RO = 154, RI = 120;
const P = (r, a) => [CX + r * Math.cos(a), CY + r * Math.sin(a)];
const sector = (r1, r2, a0, a1) => { const [x0, y0] = P(r2, a0), [x1, y1] = P(r2, a1), [x2, y2] = P(r1, a1), [x3, y3] = P(r1, a0); const g = a1 - a0 > Math.PI ? 1 : 0; return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r2} ${r2} 0 ${g} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}A${r1} ${r1} 0 ${g} 0 ${x3.toFixed(1)} ${y3.toFixed(1)}Z`; };
const estrella = (x, y, R) => Array.from({ length: 10 }, (_, k) => { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? R * .5 : R; return `${(x + Math.cos(a) * q).toFixed(1)},${(y + Math.sin(a) * q).toFixed(1)}`; }).join(' ');
function ficha(forma, x, y, col, ini, activa, emo = null) {
  const R = activa ? 9.5 : 8, cl = activa ? 'tok act' : 'tok';
  const f = forma === 'estrella' ? `<polygon class="${cl}" points="${estrella(x, y, R + 2)}" fill="${col}" stroke-linejoin="round"/>` : forma === 'diamante' ? `<polygon class="${cl}" points="${x},${y - R - 1.5} ${x + R + 1},${y} ${x},${y + R + 1.5} ${x - R - 1},${y}" fill="${col}" stroke-linejoin="round"/>` : forma === 'cuadrado' ? `<rect class="${cl}" x="${x - R + .5}" y="${y - R + .5}" width="${(R - .5) * 2}" height="${(R - .5) * 2}" rx="3" fill="${col}"/>` : `<circle class="${cl}" cx="${x}" cy="${y}" r="${R}" fill="${col}"/>`;
  if (emo) return f + `<text class="toc" x="${x}" y="${y + 1}" style="font-size:${activa ? 15 : 13}px" text-anchor="middle" dominant-baseline="central">${emo}</text>`;      // «Personajes»: tu ficha lleva tu personaje
  return f + `<text class="toc" x="${x}" y="${y + 3}">${esc(ini)}</text>`;
}
function tablero() {
  const N = S.N, cats = T.categorias(S.nCat), da = 2 * Math.PI / N, a0 = i => -Math.PI / 2 + i * da - da / 2, yo = S.jug[S.turno], humano = !yo.cpu && S.fase === 'mover';
  let h = '';
  for (let i = 0; i < N; i++) {
    const c = T.casilla(S, i), col = c.tipo === 'repite' ? 'var(--card)' : cats[c.cat].color, [mx, my] = P((RO + RI) / 2, a0(i) + da / 2);
    h += `<path class="sq" d="${sector(RI, RO, a0(i), a0(i) + da)}" fill="${col}"/>`;
    if (c.tipo === 'quesito') h += `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="${N > 40 ? 5 : 6.5}" fill="#fff" stroke="${col}" stroke-width="2.2"/><circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="${N > 40 ? 2.2 : 3}" fill="${col}"/>`;
    else if (c.tipo === 'repite') h += `<text x="${mx.toFixed(1)}" y="${(my + 3.4).toFixed(1)}" text-anchor="middle" font-size="${N > 40 ? 9 : 11}">🎲</text>`;
  }
  // centro: quesitos del jugador en turno
  h += `<circle class="hub" cx="${CX}" cy="${CY}" r="${RI - 4}"/>`;
  const R1 = 34, R2 = 74, dc = 2 * Math.PI / S.nCat;
  const enFinal = yo.centro && (S.fase === 'pregunta' || S.fase === 'resultado') && S.pregunta && S.pregunta.final;
  cats.forEach((cat, k) => { const tiene = enFinal ? yo.final.includes(k) : yo.q[k]; h += `<path d="${sector(R1, R2, -Math.PI / 2 + k * dc + .03, -Math.PI / 2 + (k + 1) * dc - .03)}" fill="${tiene ? cat.color : 'none'}" stroke="${cat.color}" stroke-width="2" opacity="${tiene ? 1 : .45}"/>`; });
  h += `<text class="hn" x="${CX}" y="${CY - 3}">${esc(yo.nombre)}</text><text class="hs" x="${CX}" y="${CY + 11}">${yo.centro ? `final ${yo.final.length}/${S.nCat}` : `${yo.q.filter(Boolean).length}/${S.nCat} quesitos`}</text>`;
  // fichas
  const porCasilla = {}; S.jug.forEach((p, j) => { (porCasilla[p.pos] = porCasilla[p.pos] || []).push(j); });
  S.jug.forEach((p, j) => { const grupo = porCasilla[p.pos], k = grupo.indexOf(j), a = a0(p.pos) + da / 2, r = (RO + RI) / 2 + (grupo.length > 1 ? (k - (grupo.length - 1) / 2) * 13 : 0), [x, y] = P(r, a); h += ficha(asp.valores.ficha, x, y, T.COLORES_J[j], p.nombre.trim()[0] ? p.nombre.trim()[0].toUpperCase() : '?', j === S.turno && S.fase !== 'fin', p.cpu ? null : emojiPersonaje(asp)); });
  if (humano) S.destinos.forEach((d, k) => { h += `<path class="dest" data-dir="${k ? 'a' : 'h'}" d="${sector(RI, RO, a0(d), a0(d) + da)}"><title>${k ? 'Antihorario' : 'Horario'}</title></path>`; });
  $('#tvB').innerHTML = h;
}

/* ---------- pintado ---------- */
function pintar() {
  if (!S || !$('#tvB')) return;
  const cats = T.categorias(S.nCat), yo = S.jug[S.turno];
  $('#tvJ').style.setProperty('--nj', S.jug.length);
  $('#tvJ').innerHTML = S.jug.map((p, j) => `<div class="tvp ${j === S.turno && S.fase !== 'fin' ? 'turno' : ''}" style="--c:${T.COLORES_J[j]}"><div class="nom"><i></i>${esc(p.nombre)}${p.centro ? ' 🏆' : ''}</div><div class="qs">${cats.map((c, k) => `<b class="${p.q[k] ? 'on' : ''}" style="--qc:${c.color}" title="${c.nombre}"></b>`).join('')}</div></div>`).join('');
  tablero();
  $('#tvL').innerHTML = S.log.map(l => `<li>${esc(l)}</li>`).join('');
  panel();
}
function panel() {
  const p = $('#tvP'), yo = S.jug[S.turno], cats = T.categorias(S.nCat), cpu = yo.cpu;
  if (S.fase === 'fin') {
    const ganador = S.jug[S.ganador];
    p.innerHTML = `<div class="tvres"><h3>🏆 ¡Gana ${esc(ganador.nombre)}!</h3><table>${S.jug.map((j, k) => `<tr><td>${esc(j.nombre)}</td><td>${j.q.filter(Boolean).length} quesitos · ${S.aciertos[k]} aciertos · ${S.fallos[k]} fallos</td></tr>`).join('')}</table></div><div class="bar" style="justify-content:center"><button class="btn on" data-ac="setup">Nueva partida</button></div>`; return;
  }
  if (S.fase === 'tirar') {
    p.innerHTML = rodando ? '<div class="tvdado">🎲 …</div>' : yo.centro ? (cpu ? `<div class="msg">${esc(yo.nombre)} juega la ronda final en el centro…</div>` : `<div class="tvfin0">🏆 Ronda final: acierta <b>${S.nCat} preguntas seguidas</b>, una de cada categoría. Si fallas una, lo intentas de nuevo en tu próximo turno.</div><div class="bar" style="justify-content:center"><button class="btn on" data-ac="centro">🏆 Empezar la ronda final</button></div>`)
      : cpu ? `<div class="msg">${esc(yo.nombre)} tira el dado…</div>` : '<div class="bar" style="justify-content:center"><button class="btn on" data-ac="tirar">🎲 Tirar el dado</button></div>';
  } else if (S.fase === 'mover') {
    const t = pos => { const c = T.casilla(S, pos); return c.tipo === 'repite' ? '🎲 tira otra vez' : `${cats[c.cat].icono} ${cats[c.cat].nombre}${c.tipo === 'quesito' ? ' · quesito' : ''}`; };
    p.innerHTML = `<div class="tvdado">🎲 ${S.dado}</div>` + (cpu ? `<div class="msg" style="text-align:center">${esc(yo.nombre)} elige hacia dónde…</div>` : `<div class="msg" style="text-align:center">Elige el sentido (o toca la casilla en el tablero)</div><div class="tvdir"><button class="btn" data-dir="a">↺ Antihorario<br><small>${t(S.destinos[1])}</small></button><button class="btn" data-dir="h">↻ Horario<br><small>${t(S.destinos[0])}</small></button></div>`);
  } else {
    const q = S.pregunta, cat = cats[q.cat], resuelta = S.fase === 'resultado';
    let cuerpo = '';
    if (S.modo === 'opciones') cuerpo = `<div class="ops">${q.opciones.map((o, i) => `<button class="op ${resuelta ? (i === q.correcta ? 'ok' : i === q.respuesta ? 'mal' : '') : ''}" data-op="${i}" ${resuelta || cpu ? 'disabled' : ''}>${'ABCD'[i]}. ${esc(o)}</button>`).join('')}</div>`;
    else cuerpo = resuelta ? '' : (cpu ? '' : `<div class="esc"><input id="tvTxt" type="text" autocomplete="off" autocapitalize="sentences" placeholder="${q.fuente === 'c' ? 'Escribe la respuesta…' : 'Escribe el término…'}" aria-label="Tu respuesta"><div class="tvdir"><button class="btn" data-ac="nosé">No lo sé</button><button class="btn on" data-ac="resp">Responder</button></div></div>`);
    const extraFin = !q.final || !resuelta ? '' : q.acierto ? (yo.final.length + 1 >= S.nCat ? ' · ¡Ronda final completada!' : ` · ¡Vas ${yo.final.length + 1}/${S.nCat}! Siguiente categoría…`) : ' · Ronda final fallida: lo intentarás de nuevo en tu próximo turno';
    const fb = resuelta ? `<div class="fb ${q.acierto ? 'ok' : 'mal'}">${q.acierto ? '✔ ¡Correcto!' : '✘ Incorrecto'}${extraFin} · ${S.modo === 'escribir' || !q.acierto ? `Respuesta: ${esc(q.resp)}` : esc(q.resp)}${S.modo === 'escribir' && q.respuesta ? `<br><small style="color:var(--mut)">Tu respuesta: ${esc(String(q.respuesta))}</small>` : ''}</div>` : '';
    p.innerHTML = `<div class="tvq" style="--c:${cat.color}"><div class="cab"><span>${cat.icono} ${cat.nombre}${q.final ? ` · FINAL ${yo.final.length + 1}/${S.nCat}` : ''}</span><small>${q.fuente === 'c' ? '❓ Pregunta' : '📖 ' + esc(q.tema)}</small></div>${q.final ? progresoFinal(yo, cats, q, resuelta) : ''}<div class="def">${esc(q.def)}</div>${cuerpo}${fb}</div>${resuelta && !cpu ? `<div class="bar" style="justify-content:center"><button class="btn on" data-ac="seguir">${q.final && q.acierto && yo.final.length + 1 < S.nCat ? 'Siguiente pregunta final' : 'Continuar'}</button></div>` : ''}${cpu && !resuelta ? `<div class="msg" style="text-align:center">${esc(yo.nombre)} piensa…</div>` : ''}`;
    if (!resuelta && !cpu && S.modo === 'escribir') setTimeout(() => { const i = $('#tvTxt'); if (i) i.focus({ preventScroll: true }); }, 50);
  }
}

function progresoFinal(yo, cats, q, resuelta) {
  return `<div class="tvfin" aria-label="Progreso de la ronda final">${cats.map((c, k) => { const hecha = yo.final.includes(k) || (resuelta && q.acierto && k === q.cat), actual = k === q.cat && !hecha, fallada = resuelta && !q.acierto && k === q.cat;
    return `<b class="${hecha ? 'on' : ''}${actual && !fallada ? ' act' : ''}${fallada ? ' mal' : ''}" style="--qc:${c.color}" title="${c.nombre}">${hecha ? '✓' : fallada ? '✕' : c.icono}</b>`; }).join('')}</div>`;
}

/* ---------- flujo ---------- */
function bucle() {
  clearTimeout(timer); if (!S) return;
  if (S.fase === 'fin') return cierre();
  const yo = S.jug[S.turno];
  if (S.fase === 'tirar' && yo.cpu) timer = setTimeout(tirarDado, 800);
  else if (S.fase === 'mover' && yo.cpu) timer = setTimeout(() => { T.mover(S, T.cpuSentido(S)); api.sonido('mover'); pintar(); guardar(); bucle(); }, 1100);
  else if (S.fase === 'pregunta' && yo.cpu) timer = setTimeout(() => { T.responder(S, T.cpuRespuesta(S)); api.sonido(S.pregunta.acierto ? 'ok' : 'error'); pintar(); guardar(); bucle(); }, 1700);
  else if (S.fase === 'resultado' && yo.cpu) timer = setTimeout(seguir, 2300);
}
async function tirarDado() {
  if (!S || S.fase !== 'tirar' || rodando) return;
  clearTimeout(timer); rodando = true; api.sonido('dado'); pintar();
  const d = $('#tvP'); for (let k = 0; k < 5; k++) { if (!S) return; if (d) d.innerHTML = `<div class="tvdado">🎲 ${1 + Math.floor(Math.random() * 6)}</div>`; await esperar(90); }
  rodando = false; if (!S) return; T.tirar(S); pintar(); guardar(); bucle();
}
function seguir() { if (!S || S.fase !== 'resultado') return; T.continuar(S); pintar(); guardar(); bucle(); }
function cierre() {
  if (!reg) {
    reg = true; const humanos = S.jug.filter(j => !j.cpu), gan = S.jug[S.ganador];
    api.registrar({ res: humanos.length === 1 ? (!gan.cpu ? 'victoria' : 'derrota') : 'partida', variante: `${S.jug.length} jugadores · ${S.nCat} quesitos` });
    api.sonido(!gan.cpu ? 'ganar' : 'perder'); if (!gan.cpu) api.vibrar([60, 40, 60]);
  }
  pintar(); guardar();
}
function responder(r) { if (!S || S.fase !== 'pregunta' || S.jug[S.turno].cpu) return; T.responder(S, r); api.sonido(S.pregunta.acierto ? 'ok' : 'error'); if (S.pregunta.acierto) api.vibrar(20); pintar(); guardar(); bucle(); }
function alEscribir(e) { if (e.target.dataset && e.target.dataset.name != null) { cfg.jug[+e.target.dataset.name][0] = e.target.value.slice(0, 14); } }
function alTecla(e) { if (e.key === 'Enter' && e.target.id === 'tvTxt') { e.preventDefault(); responder(e.target.value.trim() || null); } }
function clic(e) {
  const b = e.target.closest('button,[data-dir]'); if (!b) return; const d = b.dataset;
  if (d.tipo) { const [i, k] = d.tipo.split(','); cfg.jug[+i][1] = k; return setup(); }
  if (d.ncat) { cfg.nCat = +d.ncat; return setup(); } if (d.modo) { cfg.modo = d.modo; return setup(); } if (d.banco) { cfg.banco = d.banco; return setup(); } if (d.niv) { cfg.nivel = d.niv; return setup(); }
  if (d.dir && S && S.fase === 'mover' && !S.jug[S.turno].cpu) { T.mover(S, d.dir); api.sonido('mover'); pintar(); guardar(); return bucle(); }
  if (d.op != null) return responder(+d.op);
  const a = d.ac;
  if (a === 'start') empezar(); else if (a === 'aspecto') asp.abrir(); else if (a === 'reglas') reglas(); else if (a === 'nueva') nuevaSetup(); else if (a === 'setup') { api.borrar(); setup(); }
  else if (a === 'tirar' || a === 'centro') tirarDado(); else if (a === 'seguir') seguir();
  else if (a === 'resp') responder(($('#tvTxt') && $('#tvTxt').value.trim()) || null); else if (a === 'nosé') responder(null);
}
function reglas() {
  api.modal('Trivial', `<ul><li>De 2 a 4 jugadores (personas o CPU). En tu turno <b>tiras el dado</b> y mueves tu ficha esa cantidad de casillas en el sentido que prefieras.</li>
    <li>La casilla donde caes decide la categoría de la pregunta (cada color es una categoría). Te dan una <b>definición</b> y tienes que decir de qué término se trata, eligiendo entre 4 opciones o escribiéndolo.</li>
    <li>Si <b>aciertas</b> vuelves a tirar; si fallas, pasa el turno. Las casillas <b>🎲</b> te dejan tirar otra vez sin pregunta.</li>
    <li>Si aciertas en una casilla de <b>quesito</b> (la marcada con un círculo blanco), ganas el quesito de esa categoría.</li>
    <li>Con <b>todos los quesitos</b> vas al centro y juegas la <b>ronda final</b>: una pregunta de <b>cada categoría</b>, seguidas y sin fallar. Si las aciertas todas, ganas la partida. Si fallas una, pasa el turno y en tu <b>siguiente turno</b> vuelves a intentarlo desde el principio.</li>
    <li>Escribiendo, no importan las mayúsculas ni las tildes, valen las alternativas entre paréntesis y se perdonan erratas leves.</li>
    <li>Las preguntas salen de un banco de 450 definiciones en 9 categorías y no se repiten hasta agotarlas.</li></ul>`);
}
