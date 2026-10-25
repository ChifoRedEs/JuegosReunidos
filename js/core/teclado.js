// Teclado emergente compartido por los juegos de letras (Crucigrama, El Ahorcado, Ruleta Millonaria…).
// Sale al tocar una casilla de letras, se puede arrastrar por la pantalla desde la barra superior y se cierra con ✕.
// La posición elegida se recuerda (una sola para todos los juegos) y siempre se mantiene dentro de la pantalla.
//
//   const tk = crearTeclado({ filas: ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM'], borrar: true, alPulsar: l => …, titulo: 'Teclado' });
//   tk.abrir() · tk.cerrar() · tk.abierto() · tk.titulo(texto) · tk.actualizar((letra, boton) => { boton.disabled = …; boton.className = … })
//   tk.destruir()  (llamar en unmount)
// alPulsar recibe la letra en mayúsculas o '⌫' para borrar.
import { el } from './dom.js';
import { leer, escribir } from './storage.js';

const K_POS = 'teclado:pos', MARGEN = 6;

export function crearTeclado({ filas, borrar = false, alPulsar, titulo = 'Teclado', alCerrar = null } = {}) {
  const cerrarBtn = el('button', { type: 'button', class: 'tkx', 'aria-label': 'Cerrar teclado' }, '✕');
  const barra = el('div', { class: 'tkbar' }, el('span', { class: 'tkasa', 'aria-hidden': 'true' }), el('span', { class: 'tktit' }, titulo), cerrarBtn);
  const cuerpo = el('div', { class: 'tkfilas' }, filas.map((f, i) => el('div', { class: 'tkfila' },
    [...f].map(l => el('button', { type: 'button', class: 'tkk', 'data-tk': l, 'aria-label': 'Letra ' + l }, l)),
    borrar && i === filas.length - 1 ? el('button', { type: 'button', class: 'tkk tkdel', 'data-tk': '⌫', 'aria-label': 'Borrar' }, '⌫') : null)));
  const caja = el('div', { class: 'tkflot', role: 'dialog', 'aria-label': titulo, hidden: true }, barra, cuerpo);
  document.body.append(caja);

  let pos = leer(K_POS, null), arr = null, abierto = false;
  const limitar = () => {
    if (!abierto) return;
    const w = caja.offsetWidth, h = caja.offsetHeight, vw = innerWidth, vh = innerHeight;
    if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) pos = { x: (vw - w) / 2, y: vh - h - 96 };
    pos.x = Math.min(Math.max(MARGEN, pos.x), Math.max(MARGEN, vw - w - MARGEN));
    pos.y = Math.min(Math.max(MARGEN, pos.y), Math.max(MARGEN, vh - h - MARGEN));
    caja.style.left = pos.x + 'px'; caja.style.top = pos.y + 'px';
  };

  // Pulsar teclas: pointerdown con preventDefault para que el foco no salte ni se haga zoom/scroll
  const pulsar = e => {
    const b = e.target.closest('[data-tk]'); if (!b || b.disabled) return;
    e.preventDefault(); b.classList.add('pul'); setTimeout(() => b.classList.remove('pul'), 120);
    alPulsar && alPulsar(b.dataset.tk);
  };
  const teclaKbd = e => { if (e.key !== 'Enter' && e.key !== ' ') return; const b = e.target.closest('[data-tk]'); if (b && !b.disabled) { e.preventDefault(); alPulsar && alPulsar(b.dataset.tk); } };
  cuerpo.addEventListener('pointerdown', pulsar);
  cuerpo.addEventListener('keydown', teclaKbd);

  // Arrastrar desde la barra
  const pDown = e => {
    if (e.target === cerrarBtn || e.button > 0) return;
    e.preventDefault();
    const r = caja.getBoundingClientRect(); arr = { dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId };
    try { barra.setPointerCapture(e.pointerId); } catch { /* ignorar */ }
    caja.classList.add('mov');
  };
  const pMove = e => { if (!arr || e.pointerId !== arr.id) return; pos = { x: e.clientX - arr.dx, y: e.clientY - arr.dy }; limitar(); };
  const pUp = e => { if (!arr || e.pointerId !== arr.id) return; arr = null; caja.classList.remove('mov'); escribir(K_POS, pos); };
  barra.addEventListener('pointerdown', pDown); barra.addEventListener('pointermove', pMove);
  barra.addEventListener('pointerup', pUp); barra.addEventListener('pointercancel', pUp);

  const cerrar = () => { if (!abierto) return; abierto = false; caja.hidden = true; alCerrar && alCerrar(); };
  cerrarBtn.addEventListener('click', cerrar);
  const esc = e => { if (e.key === 'Escape' && abierto && !document.querySelector('.modal')) cerrar(); };
  document.addEventListener('keydown', esc);
  addEventListener('resize', limitar);

  return {
    abrir() { if (abierto) return; abierto = true; caja.hidden = false; limitar(); },
    cerrar,
    alternar() { abierto ? cerrar() : this.abrir(); },
    abierto: () => abierto,
    titulo(t) { barra.querySelector('.tktit').textContent = t; caja.setAttribute('aria-label', t); },
    actualizar(fn) { cuerpo.querySelectorAll('[data-tk]').forEach(b => fn(b.dataset.tk, b)); },
    destruir() { document.removeEventListener('keydown', esc); removeEventListener('resize', limitar); caja.remove(); },
  };
}
