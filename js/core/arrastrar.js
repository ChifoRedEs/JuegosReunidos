// Reordenar elementos arrastrándolos (cartas de la mano en Chinchón, Mus…).
// Un toque corto sigue siendo un «clic» normal (elegir la carta); solo si el dedo se mueve más de `umbral` píxeles empieza el arrastre.
// Mientras se arrastra, la carta va moviéndose dentro de la mano para dejar ver dónde caerá; al soltar se llama a alSoltar(nuevoOrden).
//
//   const arr = hacerOrdenable(contenedor, { sel: '[data-c]', alSoltar: ids => … });
//   arr.activo()   → true mientras se arrastra (el juego no debe repintar la mano en ese momento)
//   arr.destruir() → quitar los eventos (en unmount)
// Los elementos arrastrables necesitan `touch-action: none` en el CSS para que el móvil no haga scroll al moverlos.
export function hacerOrdenable(cont, { sel = '[data-c]', clave = el => +el.dataset.c, alSoltar, umbral = 8, puede = () => true } = {}) {
  let d = null, bloqueaHasta = 0;
  const items = () => [...cont.querySelectorAll(sel)];

  const down = e => {
    if (e.button > 0 || !puede()) return;
    const it = e.target.closest(sel); if (!it || !cont.contains(it)) return;
    d = { it, x: e.clientX, y: e.clientY, id: e.pointerId, on: false };
  };
  const empezar = () => {
    const r = d.it.getBoundingClientRect(), g = d.it.cloneNode(true);
    g.classList.add('arrfantasma'); g.removeAttribute('data-c'); g.removeAttribute('tabindex'); g.setAttribute('aria-hidden', 'true');
    g.style.width = r.width + 'px'; g.style.height = r.height + 'px';
    d.ox = d.x - r.left; d.oy = d.y - r.top; d.g = g; d.on = true;
    (cont.closest('.juego') || document.body).append(g);
    d.it.classList.add('arrorig');
    try { cont.setPointerCapture(d.id); } catch { /* ignorar */ }
  };
  const move = e => {
    if (!d || e.pointerId !== d.id) return;
    if (!d.on) { if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < umbral) return; empezar(); }
    e.preventDefault();
    d.g.style.left = e.clientX - d.ox + 'px'; d.g.style.top = e.clientY - d.oy + 'px';
    // la carta más cercana al dedo decide el hueco (antes o después de ella)
    let mejor = null, md = Infinity;
    for (const x of items()) {
      if (x === d.it) continue;
      const r = x.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, dist = Math.hypot(e.clientX - cx, (e.clientY - cy) * 1.6);
      if (dist < md) { md = dist; mejor = { x, antes: e.clientX < cx }; }
    }
    if (!mejor) return;
    const { x, antes } = mejor;
    if (antes ? x.previousElementSibling !== d.it : x.nextElementSibling !== d.it) x.parentNode.insertBefore(d.it, antes ? x : x.nextSibling);
  };
  const up = e => {
    if (!d || e.pointerId !== d.id) return;
    const fue = d; d = null;
    if (!fue.on) return;                                   // fue un toque: lo gestiona el clic normal del juego
    fue.g.remove(); fue.it.classList.remove('arrorig');
    bloqueaHasta = Date.now() + 400;                       // que el clic que llega justo después no elija la carta
    alSoltar && alSoltar(items().map(clave));
  };
  const cancel = e => { if (!d || e.pointerId !== d.id) return; if (d.on) { d.g.remove(); d.it.classList.remove('arrorig'); alSoltar && alSoltar(items().map(clave)); } d = null; };
  const clickCaptura = e => { if (Date.now() < bloqueaHasta) { e.stopPropagation(); e.preventDefault(); bloqueaHasta = 0; } };

  cont.addEventListener('pointerdown', down);
  cont.addEventListener('pointermove', move);
  cont.addEventListener('pointerup', up);
  cont.addEventListener('pointercancel', cancel);
  cont.addEventListener('click', clickCaptura, true);
  return {
    activo: () => !!(d && d.on),
    destruir() {
      if (d && d.g) d.g.remove(); d = null;
      cont.removeEventListener('pointerdown', down); cont.removeEventListener('pointermove', move);
      cont.removeEventListener('pointerup', up); cont.removeEventListener('pointercancel', cancel); cont.removeEventListener('click', clickCaptura, true);
    },
  };
}

// Orden de una mano según el modo elegido. 'libre' respeta el orden guardado (las cartas nuevas van al final).
// `pos` y `palo` son funciones del juego; `num` permite ordenar por fuerza (Mus) en lugar de por número.
export function ordenarMano(mano, ord, { palo, num }) {
  if (ord.modo === 'palo') return mano.slice().sort((a, b) => palo(a) - palo(b) || num(a) - num(b));
  if (ord.modo === 'numero') return mano.slice().sort((a, b) => num(a) - num(b) || palo(a) - palo(b));
  const ids = (ord.ids || []).filter(c => mano.includes(c));
  for (const c of mano) if (!ids.includes(c)) ids.push(c);
  ord.ids = ids; return ids.slice();
}
export function validarOrden(o, modos) {
  if (!o || typeof o !== 'object' || !modos.includes(o.modo)) return null;
  const ids = Array.isArray(o.ids) ? [...new Set(o.ids.filter(c => Number.isInteger(c) && c >= 0 && c <= 107))].slice(0, 110) : [];
  return { modo: o.modo, ids };
}
