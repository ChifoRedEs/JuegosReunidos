// Desplegable propio (en lugar del selector nativo del móvil): mismo diseño que el resto de la app.
// Convierte los <select class="desplegable"> de una zona: el <select> original queda oculto y sigue siendo la fuente del valor
// (al elegir se le asigna el valor y se lanza su evento «change», así los listeners que ya existen siguen funcionando igual).
export function mejorarSelects(raiz) {
  if (!raiz) return;
  raiz.querySelectorAll('select.desplegable:not([data-dd])').forEach(mejorar);
}
const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
function mejorar(sel) {
  sel.dataset.dd = '1'; sel.style.display = 'none'; sel.setAttribute('aria-hidden', 'true'); sel.tabIndex = -1;
  const ops = [...sel.options], etq = sel.getAttribute('aria-label') || '';
  const btn = h('button', 'ap-dd-btn'); btn.type = 'button'; btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false'); if (etq) btn.setAttribute('aria-label', etq);
  const lista = h('div', 'ap-dd-lista'); lista.setAttribute('role', 'listbox'); if (etq) lista.setAttribute('aria-label', etq); lista.hidden = true;
  const filas = ops.map(o => { const b = h('button', 'ap-dd-o'); b.type = 'button'; b.setAttribute('role', 'option'); b.dataset.v = o.value; b.append(h('span', 'ap-dd-n', o.textContent), (() => { const m = h('em', 'ap-dd-ok', '✓'); m.setAttribute('aria-hidden', 'true'); return m; })()); lista.append(b); return b; });
  const pinta = () => {
    const o = ops.find(x => x.value === sel.value) || ops[0]; const fl = h('em', 'ap-dd-fl', '▾'); fl.setAttribute('aria-hidden', 'true');
    btn.replaceChildren(h('span', 'ap-dd-n', o ? o.textContent : ''), fl);
    filas.forEach(f => { const on = o && f.dataset.v === o.value; f.classList.toggle('on', !!on); f.setAttribute('aria-selected', String(!!on)); });
  };
  const abre = v => { lista.hidden = !v; btn.setAttribute('aria-expanded', String(v)); btn.classList.toggle('open', v); if (v) { const on = lista.querySelector('.on'); if (on) lista.scrollTop = Math.max(0, on.offsetTop - 60); } };
  btn.addEventListener('click', () => abre(lista.hidden));
  lista.addEventListener('click', e => {
    const f = e.target.closest('.ap-dd-o'); if (!f) return;
    const cambia = sel.value !== f.dataset.v; sel.value = f.dataset.v; pinta(); abre(false); btn.focus();
    if (cambia) sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const caja = h('div', 'ap-dd'); caja.append(btn, lista);
  caja.addEventListener('keydown', e => { if (e.key === 'Escape' && !lista.hidden) { e.stopPropagation(); abre(false); btn.focus(); } });
  sel.insertAdjacentElement('afterend', caja); pinta();
}
