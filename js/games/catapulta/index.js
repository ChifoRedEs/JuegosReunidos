// Catapulta — lanza pájaros con el tirachinas y derriba las fortalezas de los cerdos piratas. Física con Matter.js (js/vendor).
import { $, esc } from '../../core/dom.js';
import * as C from './motor.js';
import { NIVELES, validarNivel } from './niveles.js';

let api = null, root = null, M = null, m = null, cv = null, ctx = null, dpr = 1, escala = 1;
let raf = 0, tPrev = 0, acum = 0, fase = 'menu', nivel = 1, drag = null, part = [], textos = [], onVis = null, onRes = null, onKey = null, cerrando = false, finTimer = 0, parpadeo = 0;
let hudAnt = '', ultimo = null;                // ultimo: resultado del nivel jugado { n, pts, est, record }

export function validar(d) { return d && validarNivel(d.nivel) ? { nivel: d.nivel } : null; }
export const migrarV1 = d => d;
export const resumen = d => ({ texto: `Nivel ${d.nivel} · ${NIVELES[d.nivel - 1].nombre}`, fin: false });

function cargarMatter() {
  if (window.Matter) return Promise.resolve(window.Matter);
  return new Promise((ok, ko) => { const s = document.createElement('script'); s.src = new URL('../../vendor/matter.min.js', import.meta.url); s.onload = () => ok(window.Matter); s.onerror = () => ko(new Error('matter')); document.head.append(s); });
}
const prog = () => { const p = api.pref('prog', []); return Array.isArray(p) ? p.map(x => x && Number.isInteger(x.est) ? { est: Math.min(3, Math.max(0, x.est)), pts: Math.max(0, x.pts | 0) } : { est: 0, pts: 0 }) : []; };
const nivelMax = () => { const p = prog(); let n = 1; while (n < NIVELES.length && p[n - 1] && p[n - 1].est > 0) n++; return n; };

export async function mount(r, a) {
  api = a; root = r; cerrando = false; part = []; textos = [];
  await api.css(new URL('./catapulta.css', import.meta.url));
  root.innerHTML = '<p class="note">Cargando el motor de física…</p>';
  try { M = await cargarMatter(); } catch { root.innerHTML = '<p class="note">No se pudo cargar el motor de física. Comprueba la conexión y vuelve a entrar.</p>'; return; }
  if (cerrando) return;
  root.addEventListener('click', clic);
  onVis = () => { if (document.hidden) pausar(); }; document.addEventListener('visibilitychange', onVis);
  onRes = () => { if (cv) { ajustar(); dibujar(); } }; addEventListener('resize', onRes);
  onKey = e => { if (fase === 'apuntar' || fase === 'vuelo') { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toque(); } } };
  document.addEventListener('keydown', onKey);
  api.barra({ etiqueta: 'Reintentar', nueva: () => jugar(nivel), salir: () => { pausar(); location.hash = '#/cat/arcade'; }, pausar: () => pausar(), reanudar: () => { if (fase === 'pausa') seguir(); },
    config: { valores: () => ({ nivel }), grupos: () => [{ clave: 'nivel', titulo: 'Nivel', opciones: NIVELES.map((n, i) => [i + 1, `${i + 1}`]).filter(([i]) => i <= nivelMax()) }], aplicar: v => jugar(+v.nivel) } });
  api.menu([{ texto: '🗺️ Niveles', accion: () => { pausar(); menu(); } }, { texto: 'Cómo se juega', accion: () => { pausar(); reglas(); } }]);
  const g = api.cargar();
  if (g && g.nivel <= nivelMax()) jugar(g.nivel); else menu();
}
export function unmount() {
  cerrando = true; pausar(); cancelAnimationFrame(raf); raf = 0; clearTimeout(finTimer);
  document.removeEventListener('visibilitychange', onVis); removeEventListener('resize', onRes); document.removeEventListener('keydown', onKey);
  if (root) root.removeEventListener('click', clic);
  if (m) { try { M.World.clear(m.engine.world); M.Engine.clear(m.engine); } catch { /* nada */ } }
  m = null; cv = null; ctx = null;
}

/* ---------- pantallas ---------- */
const estr = n => '★'.repeat(n) + '☆'.repeat(3 - n);
function menu() {
  cancelAnimationFrame(raf); raf = 0; fase = 'menu'; cv = null;
  const p = prog(), max = nivelMax();
  root.innerHTML = `<p class="note">Estira el tirachinas hacia atrás, apunta con la línea de puntos y suelta. Derriba las estructuras para vencer a los <b>cerdos piratas</b>. Consigue 3 estrellas en cada nivel.</p>
    <div class="ctniv">${NIVELES.map((n, i) => { const k = i + 1, e = p[i] ? p[i].est : 0, bloq = k > max; return `<button class="btn ${k === max ? 'on' : ''}" data-ac="nivel" data-n="${k}" ${bloq ? 'disabled' : ''}><b>${bloq ? '🔒' : k}</b><span>${esc(n.nombre)}</span><i>${estr(e)}</i>${p[i] && p[i].pts ? `<small>${p[i].pts.toLocaleString('es-ES')}</small>` : ''}</button>`; }).join('')}</div>
    <div class="ctaves">${Object.entries(C.AVES).map(([k, a]) => `<span><i style="--c:${a.color}"></i><b>${a.nombre}</b> ${a.hab}</span>`).join('')}</div>
    <div class="bar"><button class="btn on" data-ac="nivel" data-n="${max}">🪃 ${max === 1 && !p[0] ? 'Empezar' : 'Seguir: nivel ' + max}</button></div>`;
}
function reglas() {
  api.modal('Cómo se juega', `<p>Arrastra el pájaro hacia atrás (cuanto más lo estires, más fuerte sale) y suéltalo. La línea de puntos muestra el inicio de la trayectoria.</p>
    <p><b>Toca la pantalla en pleno vuelo</b> para usar la habilidad del pájaro.</p>
    <ul>${Object.values(C.AVES).map(a => `<li><b>${a.nombre}</b>: ${a.hab}</li>`).join('')}</ul>
    <p>La <b>madera</b> se parte con un golpe fuerte, el <b>hielo</b> se rompe casi con cualquier cosa y la <b>piedra</b> aguanta mucho. Cada pájaro que te sobre al ganar vale 10.000 puntos.</p>`);
}

function jugar(n) {
  if (!validarNivel(n)) n = 1;
  cancelAnimationFrame(raf); clearTimeout(finTimer); nivel = n;
  if (m) { try { M.World.clear(m.engine.world); M.Engine.clear(m.engine); } catch { /* nada */ } }
  m = C.crear(M, n); part = []; textos = []; drag = null; ultimo = null; hudAnt = ''; acum = 0;
  root.innerHTML = `<div class="cthud" id="ctHud"></div>
    <div class="ctzona" id="ctZona"><canvas id="ctCv" aria-label="Campo de juego"></canvas><div class="ctover" id="ctOver" hidden></div></div>
    <p class="note ctayuda" id="ctAyuda"></p>${api.barraHtml()}`;
  cv = $('#ctCv'); ctx = cv.getContext('2d'); dpr = Math.min(window.devicePixelRatio || 1, 3); ajustar();
  const z = $('#ctZona');
  z.addEventListener('pointerdown', abajo); z.addEventListener('pointermove', mover); z.addEventListener('pointerup', soltar); z.addEventListener('pointercancel', () => { cancelarArrastre(); });
  api.guardar({ nivel: n }, resumen({ nivel: n }).texto, false);
  api.titulo && api.titulo(`Catapulta · ${n}`);
  siguienteAve();
  tPrev = performance.now(); raf = requestAnimationFrame(bucle);
}
function ajustar() {
  if (!cv) return;
  const ancho = Math.floor(cv.parentElement.getBoundingClientRect().width), alto = Math.round(ancho * C.H / C.W);
  cv.width = ancho * dpr; cv.height = alto * dpr; cv.style.width = ancho + 'px'; cv.style.height = alto + 'px'; escala = ancho / C.W;
}
function siguienteAve() {
  if (!m.cola.length) { fase = 'espera'; return; }
  fase = 'apuntar'; m.lanzado = null; drag = null;
  const a = $('#ctAyuda'); if (a) a.textContent = `Siguiente: ${C.AVES[m.cola[0]].nombre} — ${C.AVES[m.cola[0]].hab}`;
  api.sonido('mover');
}

/* ---------- entrada ---------- */
const aMundo = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / escala, y: (e.clientY - r.top) / escala }; };
function abajo(e) {
  if (!m || !cv) return;
  if (fase === 'vuelo') { toque(); return; }
  if (fase !== 'apuntar') return;
  const p = aMundo(e);
  if (Math.hypot(p.x - C.HONDA.x, p.y - C.HONDA.y) < 85) { drag = { id: e.pointerId, x: p.x, y: p.y }; try { $('#ctZona').setPointerCapture(e.pointerId); } catch { /* nada */ } ajustarDrag(p); }
}
function mover(e) { if (drag && e.pointerId === drag.id) ajustarDrag(aMundo(e)); }
function ajustarDrag(p) {
  let dx = p.x - C.HONDA.x, dy = p.y - C.HONDA.y; const d = Math.hypot(dx, dy);
  if (d > C.ARRASTRE) { dx *= C.ARRASTRE / d; dy *= C.ARRASTRE / d; }
  if (C.HONDA.y + dy > C.SUELO - 14) dy = C.SUELO - 14 - C.HONDA.y;
  drag.x = C.HONDA.x + dx; drag.y = C.HONDA.y + dy;
}
function cancelarArrastre() { drag = null; }
function soltar(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const vx = (C.HONDA.x - drag.x) * C.K_LANZ, vy = (C.HONDA.y - drag.y) * C.K_LANZ, fz = Math.hypot(C.HONDA.x - drag.x, C.HONDA.y - drag.y);
  drag = null;
  if (fz < 14) return;
  C.lanzar(m, vx, vy); fase = 'vuelo'; api.sonido('captura'); api.vibrar(20);
  const a = $('#ctAyuda'); if (a) a.textContent = 'Toca la pantalla para usar la habilidad.';
}
function toque() { if (fase === 'vuelo' && m && C.habilidad(m)) { api.sonido('ok'); api.vibrar(15); } }

/* ---------- bucle ---------- */
function bucle(t) {
  if (!m || !cv) return;
  const dt = Math.min(t - tPrev, 100); tPrev = t; acum += dt;
  let n = 0;
  while (acum >= C.PASO && n++ < 6) { acum -= C.PASO; efectos(C.paso(m)); revisar(); }
  if (n >= 6) acum = 0;
  for (const p of part) { p.x += p.vx; p.y += p.vy; p.vy += .22; p.t -= 1; p.a = Math.max(0, p.t / p.t0); }
  part = part.filter(p => p.t > 0);
  for (const x of textos) { x.y -= .6; x.t -= 1; }
  textos = textos.filter(x => x.t > 0);
  parpadeo += dt;
  dibujar(); pintarHud();
  if (fase !== 'menu' && fase !== 'pausa' && fase !== 'fin') raf = requestAnimationFrame(bucle); else raf = 0;
}
function revisar() {
  if (fase === 'vuelo' && !C.enVuelo(m)) { fase = 'espera'; m.reposo = 0; const a = $('#ctAyuda'); if (a) a.textContent = ''; }
  if (fase === 'espera') {
    m.reposo = (m.reposo || 0) + 1;
    const todos = C.cerdosVivos(m) === 0;
    if ((C.quieto(m) && m.reposo > 45) || m.reposo > 420 || (todos && m.reposo > 90)) {
      if (todos) terminar(true);
      else if (!m.cola.length) terminar(false);
      else siguienteAve();
    }
  }
}
function efectos(ev) {
  for (const e of ev) {
    if (e.t === 'rompe') { api.sonido('click'); const col = { madera: '#C98A4B', piedra: '#9AA3B2', hielo: '#BFE9FF' }[e.m]; for (let k = 0; k < 9; k++) part.push({ x: e.x + (Math.random() - .5) * e.w, y: e.y + (Math.random() - .5) * e.h, vx: (Math.random() - .5) * 5, vy: -Math.random() * 4, t: 40, t0: 40, c: col, r: 2 + Math.random() * 3 }); textos.push({ x: e.x, y: e.y, s: String({ madera: 500, piedra: 800, hielo: 300 }[e.m]), t: 45 }); }
    else if (e.t === 'cerdo') { api.sonido('perder'); api.vibrar(30); for (let k = 0; k < 14; k++) part.push({ x: e.x, y: e.y, vx: (Math.random() - .5) * 6, vy: -Math.random() * 5, t: 50, t0: 50, c: k % 2 ? '#8FD14F' : '#fff', r: 3 + Math.random() * 3 }); textos.push({ x: e.x, y: e.y - 10, s: '5000', t: 60 }); }
    else if (e.t === 'bomba') { api.sonido('error'); api.vibrar([40, 30, 60]); for (let k = 0; k < 26; k++) { const a = Math.random() * 6.283, v = 2 + Math.random() * 7; part.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 36, t0: 36, c: k % 3 ? '#FF9F1C' : '#FFE08A', r: 3 + Math.random() * 4 }); } }
    else if (e.t === 'hab') { for (let k = 0; k < 8; k++) part.push({ x: e.x, y: e.y, vx: (Math.random() - .5) * 4, vy: (Math.random() - .5) * 4, t: 20, t0: 20, c: '#fff', r: 2 }); }
    else if (e.t === 'golpe' && e.f > .5) api.sonido('mover');
  }
}
function terminar(gana) {
  fase = 'fin'; clearTimeout(finTimer);
  const bon = gana ? C.bonus(m) : 0, pts = m.puntos + bon;
  if (gana) {
    const est = C.estrellas(nivel, pts), p = prog(); while (p.length < NIVELES.length) p.push({ est: 0, pts: 0 });
    const antes = p[nivel - 1], record = pts > antes.pts;
    p[nivel - 1] = { est: Math.max(antes.est, est), pts: Math.max(antes.pts, pts) }; api.setPref('prog', p);
    api.registrar({ res: 'partida', variante: `Nivel ${nivel}`, puntos: pts });
    ultimo = { n: nivel, pts, bon, est, record, gana };
    api.sonido('ganar'); api.vibrar([40, 30, 80]);
    if (nivel === NIVELES.length && p.every(x => x.est > 0)) { ultimo.campana = true; api.registrar({ res: 'victoria', variante: 'Campaña', puntos: p.reduce((s, x) => s + x.pts, 0) }); }
  } else { ultimo = { n: nivel, pts, bon: 0, est: 0, gana: false }; api.sonido('perder'); }
  finTimer = setTimeout(() => { if (!cv) return; pintarOver(); dibujar(); }, gana ? 500 : 400);
}
function pintarOver() {
  const o = $('#ctOver'); if (!o) return;
  if (fase === 'pausa') { o.hidden = false; o.innerHTML = '<div><b>⏸️ Pausa</b><span class="bts"><button class="btn on" data-ac="seguir">Seguir</button></span></div>'; return; }
  if (fase !== 'fin' || !ultimo) { o.hidden = true; return; }
  const u = ultimo, sig = u.gana && u.n < NIVELES.length;
  o.hidden = false;
  o.innerHTML = u.gana
    ? `<div><b>🎉 ¡Nivel ${u.n} superado!</b><span class="ctest">${estr(u.est)}</span><span class="g">${u.pts.toLocaleString('es-ES')} puntos</span>${u.bon ? `<span>Incluye ${u.bon.toLocaleString('es-ES')} por pájaros sobrantes</span>` : ''}${u.record ? '<span class="rec">¡Mejor marca del nivel!</span>' : ''}${u.campana ? '<span class="rec">🏴‍☠️ ¡Campaña completada!</span>' : ''}<span class="bts">${sig ? `<button class="btn on" data-ac="nivel" data-n="${u.n + 1}">Nivel ${u.n + 1} ▶</button>` : ''}<button class="btn" data-ac="nivel" data-n="${u.n}">Repetir</button><button class="btn" data-ac="menu">Niveles</button></span></div>`
    : `<div><b>☠️ Los cerdos resisten</b><span>Te has quedado sin pájaros. Prueba otro ángulo o usa las habilidades.</span><span class="bts"><button class="btn on" data-ac="nivel" data-n="${u.n}">Reintentar</button><button class="btn" data-ac="menu">Niveles</button></span></div>`;
}
function pausar() { if (!m || !cv || fase === 'menu' || fase === 'fin' || fase === 'pausa') return; m.faseAntes = fase; fase = 'pausa'; drag = null; pintarOver(); }
function seguir() { if (fase !== 'pausa') return; fase = m.faseAntes || 'apuntar'; pintarOver(); tPrev = performance.now(); acum = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(bucle); }
function clic(e) {
  const b = e.target.closest('[data-ac]'); if (!b) return;
  const ac = b.dataset.ac;
  if (ac === 'nivel') { const n = +b.dataset.n; if (n <= nivelMax()) jugar(n); }
  else if (ac === 'menu') menu();
  else if (ac === 'seguir') seguir();
}
function pintarHud() {
  const h = $('#ctHud'); if (!h || !m) return;
  const s = `${nivel}|${m.puntos}|${C.cerdosVivos(m)}|${m.cola.join()}`; if (s === hudAnt) return; hudAnt = s;
  h.innerHTML = `<span><small>Nivel</small><b>${nivel}</b></span><span><small>Puntos</small><b>${m.puntos.toLocaleString('es-ES')}</b></span><span><small>Cerdos</small><b>🐷 ${C.cerdosVivos(m)}</b></span><span><small>Pájaros</small><b class="ctcola">${m.cola.map(k => `<i style="--c:${C.AVES[k].color}"></i>`).join('') || '—'}</b></span>`;
}

/* ---------- dibujo ---------- */
const COL_MAT = { madera: ['#D9A066', '#B4753A', '#8A5524'], piedra: ['#B7BFCB', '#8D97A7', '#6A7484'], hielo: ['#E4F6FF', '#A9DDF5', '#7DC3E6'] };
function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function dibujar() {
  if (!m || !cv || !ctx) return;
  const k = escala * dpr; ctx.setTransform(k, 0, 0, k, 0, 0);
  // cielo y colinas
  const cielo = ctx.createLinearGradient(0, 0, 0, C.SUELO); cielo.addColorStop(0, '#6EC6F5'); cielo.addColorStop(1, '#CFF0FF');
  ctx.fillStyle = cielo; ctx.fillRect(0, 0, C.W, C.H);
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (const [x, y, s] of [[160, 70, 1], [520, 110, .8], [780, 60, 1.1]]) { ctx.beginPath(); ctx.ellipse(x, y, 46 * s, 16 * s, 0, 0, 6.3); ctx.ellipse(x + 30 * s, y - 8 * s, 30 * s, 16 * s, 0, 0, 6.3); ctx.ellipse(x - 28 * s, y - 4 * s, 26 * s, 13 * s, 0, 0, 6.3); ctx.fill(); }
  ctx.fillStyle = '#8CCB7A'; ctx.beginPath(); ctx.moveTo(0, C.SUELO); ctx.quadraticCurveTo(220, 330, 460, C.SUELO); ctx.quadraticCurveTo(700, 380, 900, C.SUELO); ctx.fill();
  ctx.fillStyle = '#5FA34E'; ctx.fillRect(0, C.SUELO, C.W, 8);
  const tierra = ctx.createLinearGradient(0, C.SUELO + 8, 0, C.H); tierra.addColorStop(0, '#9B6B3F'); tierra.addColorStop(1, '#6E4A2A');
  ctx.fillStyle = tierra; ctx.fillRect(0, C.SUELO + 8, C.W, C.H - C.SUELO - 8);
  // tirachinas (parte de atrás)
  const H = C.HONDA, tirando = drag || null;
  ctx.strokeStyle = '#6B4423'; ctx.lineWidth = 11; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(H.x + 4, C.SUELO); ctx.lineTo(H.x + 4, H.y + 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(H.x + 4, H.y + 40); ctx.lineTo(H.x - 10, H.y - 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(H.x + 4, H.y + 40); ctx.lineTo(H.x + 18, H.y - 2); ctx.stroke();
  // trayectoria
  if (tirando) {
    const vx = (H.x - drag.x) * C.K_LANZ, vy = (H.y - drag.y) * C.K_LANZ;
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = 'rgba(40,40,60,.35)'; ctx.lineWidth = 1;
    C.trayectoria(vx, vy, 16, 4).forEach((p, i) => { const r = Math.max(2, 5 - i * .18); ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.3); ctx.fill(); ctx.stroke(); });
  }
  // gomas y pájaro en la honda
  const ave = m.cola[0] && (fase === 'apuntar' || fase === 'pausa') ? m.cola[0] : null;
  const pos = tirando ? { x: drag.x, y: drag.y } : { x: H.x, y: H.y };
  if (ave) {
    ctx.strokeStyle = '#3B2414'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(H.x - 10, H.y - 2); ctx.lineTo(pos.x - 6, pos.y); ctx.stroke();
    pajaro(pos.x, pos.y, C.AVES[ave].r, ave, 0);
    ctx.beginPath(); ctx.strokeStyle = '#3B2414'; ctx.moveTo(H.x + 18, H.y - 2); ctx.lineTo(pos.x + 6, pos.y); ctx.stroke();
  }
  // pájaros en espera, junto a la honda
  m.cola.slice(ave ? 1 : 0, 5).forEach((c, i) => pajaro(70 - i * 34, C.SUELO - C.AVES[c].r, C.AVES[c].r, c, 0));
  // bloques
  for (const b of m.bloques) bloque(b);
  for (const c of m.cerdos) if (c.vivo) cerdo(c);
  for (const o of m.vuelan) pajaro(o.cuerpo.position.x, o.cuerpo.position.y, o.r, o.clase, o.cuerpo.angle);
  // partículas y puntos
  for (const p of part) { ctx.globalAlpha = p.a; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.3); ctx.fill(); }
  ctx.globalAlpha = 1; ctx.font = '800 18px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.55)';
  for (const t of textos) { ctx.globalAlpha = Math.min(1, t.t / 20); ctx.strokeText(t.s, t.x, t.y); ctx.fillStyle = '#fff'; ctx.fillText(t.s, t.x, t.y); }
  ctx.globalAlpha = 1;
}
function bloque(b) {
  const c = b.cuerpo, d = COL_MAT[b.m], w = b.w, h = b.h, da = 1 - b.vida / b.vida0;
  ctx.save(); ctx.translate(c.position.x, c.position.y); ctx.rotate(c.angle);
  rr(-w / 2, -h / 2, w, h, 3); ctx.fillStyle = d[1]; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = d[2]; ctx.stroke();
  ctx.fillStyle = d[0]; rr(-w / 2 + 2, -h / 2 + 2, w - 4, Math.min(5, h / 3), 2); ctx.fill();
  ctx.strokeStyle = d[2]; ctx.lineWidth = 1;
  if (b.m === 'madera') { ctx.globalAlpha = .45; ctx.beginPath(); if (w >= h) for (let x = -w / 2 + 14; x < w / 2 - 6; x += 22) { ctx.moveTo(x, -h / 2 + 4); ctx.lineTo(x + 5, h / 2 - 4); } else for (let y = -h / 2 + 14; y < h / 2 - 6; y += 22) { ctx.moveTo(-w / 2 + 3, y); ctx.lineTo(w / 2 - 3, y + 4); } ctx.stroke(); ctx.globalAlpha = 1; }
  else if (b.m === 'piedra') { ctx.globalAlpha = .5; ctx.beginPath(); ctx.moveTo(-w / 2 + 3, -h / 4); ctx.lineTo(0, h / 6); ctx.lineTo(w / 2 - 3, -h / 8); ctx.stroke(); ctx.globalAlpha = 1; }
  else { ctx.globalAlpha = .7; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-w / 2 + 5, h / 2 - 5); ctx.lineTo(-w / 2 + 12, h / 2 - 12); ctx.stroke(); ctx.globalAlpha = 1; }
  if (da > .3) { ctx.strokeStyle = 'rgba(30,20,10,.65)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-w * .2, -h / 2); ctx.lineTo(-w * .05, 0); ctx.lineTo(-w * .22, h / 2); if (da > .6) { ctx.moveTo(w * .25, -h / 2); ctx.lineTo(w * .1, h * .1); ctx.lineTo(w * .3, h / 2); } ctx.stroke(); }
  ctx.restore();
}
function cerdo(c) {
  const p = c.cuerpo.position, r = c.r, da = 1 - c.vida / c.vida0;
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(c.cuerpo.angle * .5);
  ctx.fillStyle = '#8FD14F'; ctx.strokeStyle = '#4C8A25'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#8FD14F'; ctx.beginPath(); ctx.arc(-r * .6, -r * .8, r * .28, 0, 6.3); ctx.arc(r * .6, -r * .8, r * .28, 0, 6.3); ctx.fill(); ctx.stroke();
  // pañuelo pirata
  ctx.fillStyle = '#D6362F'; ctx.beginPath(); ctx.moveTo(-r * .95, -r * .22); ctx.quadraticCurveTo(0, -r * 1.3, r * .95, -r * .22); ctx.lineTo(r * .85, -r * .5); ctx.quadraticCurveTo(0, -r * 1.35, -r * .85, -r * .5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; for (const x of [-.5, 0, .5]) { ctx.beginPath(); ctx.arc(r * x, -r * .72, r * .06, 0, 6.3); ctx.fill(); }
  // ojo, parche, hocico
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * .38, -r * .05, r * .24, 0, 6.3); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(r * .42, -r * .03, r * .1, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.arc(-r * .38, -r * .05, r * .26, 0, 6.3); ctx.fill(); ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-r * .38, -r * .3); ctx.lineTo(-r * .8, -r * .6); ctx.stroke();
  ctx.fillStyle = '#B5E27C'; ctx.strokeStyle = '#4C8A25'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, r * .38, r * .42, r * .28, 0, 0, 6.3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#4C8A25'; ctx.beginPath(); ctx.arc(-r * .14, r * .38, r * .06, 0, 6.3); ctx.arc(r * .14, r * .38, r * .06, 0, 6.3); ctx.fill();
  if (da > .35) { ctx.strokeStyle = 'rgba(40,60,20,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(r * .1, -r * .3); ctx.lineTo(r * .3, r * .1); ctx.lineTo(r * .15, r * .5); ctx.stroke(); }
  ctx.restore();
}
function pajaro(x, y, r, clase, ang) {
  const d = C.AVES[clase];
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.fillStyle = d.color; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.ellipse(0, r * .45, r * .7, r * .45, 0, 0, 6.3); ctx.fill();
  // cresta según clase
  ctx.fillStyle = d.color; ctx.strokeStyle = 'rgba(0,0,0,.45)';
  ctx.beginPath(); if (clase === 'acelerador') { ctx.moveTo(-r * .5, -r * .8); ctx.lineTo(0, -r * 1.6); ctx.lineTo(r * .5, -r * .8); } else if (clase === 'divisible') { ctx.moveTo(-r * .4, -r * .85); ctx.lineTo(-r * .2, -r * 1.45); ctx.lineTo(0, -r * .95); ctx.lineTo(r * .3, -r * 1.45); ctx.lineTo(r * .45, -r * .8); } else if (clase === 'bomba') { ctx.arc(0, -r * 1.05, r * .22, 0, 6.3); } else { ctx.moveTo(-r * .3, -r * .9); ctx.quadraticCurveTo(0, -r * 1.7, r * .35, -r * .85); }
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * .22, -r * .18, r * .3, 0, 6.3); ctx.arc(r * .62, -r * .18, r * .26, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(r * .3, -r * .16, r * .12, 0, 6.3); ctx.arc(r * .64, -r * .16, r * .1, 0, 6.3); ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(r * .0, -r * .55); ctx.lineTo(r * .7, -r * .38); ctx.stroke();
  ctx.fillStyle = '#FFAA1A'; ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(r * .55, r * .02); ctx.lineTo(r * 1.15, r * .24); ctx.lineTo(r * .5, r * .42); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
