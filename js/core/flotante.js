// Menú flotante (como el panel de tiro de Billar): una tira de botones con un asa «Mover» que se puede arrastrar por la pantalla.
// Al principio se coloca justo debajo de `ancla` (deja un hueco para no tapar nada); si el jugador lo mueve, se recuerda dónde.
//
//   const fl = crearFlotante(api, { ancla: elemento, botones: [{ id, texto }], alClic: id => …, raiz: root });
//   fl.marcar(id, true|false)      resalta un botón (modos)      fl.activar(id, true|false)   habilita / deshabilita
//   fl.destruir()                  quitar en unmount
export function crearFlotante(api, { ancla, botones, alClic, raiz, clave = 'flot' }) {
  const panel = document.createElement('div'); panel.className = 'flotante'; panel.setAttribute('role', 'group'); panel.setAttribute('aria-label', 'Controles');
  panel.innerHTML = `<div class="flasa" title="Arrastra para mover los controles"><span aria-hidden="true"></span><small>Mover</small></div><div class="flbtns" style="--nb:${botones.length}">${botones.map(b => `<button type="button" class="btn" data-fl="${b.id}">${b.texto}</button>`).join('')}</div>`;
  document.body.append(panel);
  const hueco = document.createElement('div'); hueco.className = 'flhueco'; ancla.after(hueco);
  let pos = null, arr = null; const p0 = api.pref(clave, null); if (p0 && Number.isFinite(p0.x) && Number.isFinite(p0.y)) pos = { x: p0.x, y: p0.y };
  const cabecera = () => { const t = document.querySelector('.top'); return t ? t.getBoundingClientRect().bottom : 0; };
  function colocar() {
    if (!panel.isConnected) return;
    const w = panel.offsetWidth, h = panel.offsetHeight, vw = document.documentElement.clientWidth || innerWidth, vh = innerHeight, mg = 6;
    hueco.style.height = pos ? '0px' : (h + 8) + 'px';
    let x, y;
    if (pos) { x = pos.x; y = pos.y; } else { const r = hueco.getBoundingClientRect(); x = (vw - w) / 2; y = r.top + 2; }
    x = Math.min(Math.max(mg, x), Math.max(mg, vw - w - mg)); y = Math.min(Math.max(pos ? mg : cabecera() + 4, y), Math.max(mg, vh - h - mg));
    panel.style.left = x + 'px'; panel.style.top = y + 'px';
  }
  const asa = panel.querySelector('.flasa');
  asa.addEventListener('pointerdown', e => {
    if (e.button > 0) return; e.preventDefault();
    const r = panel.getBoundingClientRect(); arr = { dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId };
    try { asa.setPointerCapture(e.pointerId); } catch { /* ignorar */ }
    panel.classList.add('mov');
  });
  asa.addEventListener('pointermove', e => { if (!arr || e.pointerId !== arr.id) return; pos = { x: e.clientX - arr.dx, y: e.clientY - arr.dy }; colocar(); });
  const suelta = e => { if (!arr || e.pointerId !== arr.id) return; arr = null; panel.classList.remove('mov'); api.setPref(clave, pos); };
  asa.addEventListener('pointerup', suelta); asa.addEventListener('pointercancel', suelta);
  asa.addEventListener('dblclick', () => { pos = null; api.setPref(clave, null); colocar(); });     // doble toque en el asa: vuelve a su sitio
  panel.addEventListener('click', e => { const b = e.target.closest('[data-fl]'); if (b && !b.disabled) alClic(b.dataset.fl); });
  const on = () => colocar();
  addEventListener('resize', on); addEventListener('scroll', on, { passive: true });
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(on) : null; if (ro) ro.observe(raiz || ancla.parentElement);
  colocar(); requestAnimationFrame(colocar);
  return {
    panel,
    marcar(id, v) { const b = panel.querySelector(`[data-fl="${id}"]`); if (b) { b.classList.toggle('on', !!v); b.setAttribute('aria-pressed', String(!!v)); } },
    activar(id, v) { const b = panel.querySelector(`[data-fl="${id}"]`); if (b) b.disabled = !v; },
    recolocar: colocar,
    destruir() { removeEventListener('resize', on); removeEventListener('scroll', on); if (ro) ro.disconnect(); panel.remove(); hueco.remove(); },
  };
}
