import { crearDuelo } from '../../core/duelo.js';
import { VARIANTES, estadoInicial, jugadas, aplicar, validarEstado, ia, reglasHTML } from './reglas.js';

let cel = [], tab = null, prevN = -1, vAct = null;
const MARCA = { 1: '<svg class="mk x" viewBox="0 0 40 40" aria-hidden="true"><path d="M9 9L31 31"/><path d="M31 9L9 31"/></svg>', 2: '<svg class="mk o" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="12.5"/></svg>' };

function montar(cont, ctx, v) {
  const n = VARIANTES[v].n; vAct = v; prevN = -1;
  cont.innerHTML = `<div class="trb" style="--n:${n}" role="group" aria-label="Tablero de ${n} por ${n}">${Array.from({ length: n * n }, (_, i) => `<button type="button" class="tc" data-i="${i}"></button>`).join('')}</div>`;
  tab = cont.firstElementChild; cel = [...tab.children];
  tab.addEventListener('click', e => { const b = e.target.closest('.tc'); if (b) ctx.jugar(+b.dataset.i); });
  tab.addEventListener('keydown', e => {
    const d = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key]; if (!d) return;
    const i = cel.indexOf(document.activeElement); if (i < 0) return;
    e.preventDefault();
    const r = Math.min(n - 1, Math.max(0, (i / n | 0) + d[0])), c = Math.min(n - 1, Math.max(0, i % n + d[1]));
    cel[r * n + c].focus();
  });
}
function pintar(e, ctx, v) {
  if (!tab || v !== vAct) return;
  const V = VARIANTES[v], n = V.n, linea = new Set(e.fin ? e.fin.linea : []);
  if (prevN < 0) prevN = e.n;
  for (let i = 0; i < n * n; i++) {
    const val = e.b[i], b = cel[i], cambio = b.dataset.v !== String(val);
    if (cambio) { b.dataset.v = val; b.innerHTML = val ? MARCA[val] : ''; }
    const viejo = V.max && val && e.q[val - 1].length >= V.max && e.q[val - 1][0] === i;
    const nuevo = val && i === e.ult && e.n === prevN + 1;
    b.className = 'tc' + (val ? ' l' : '') + (i === e.ult ? ' u' : '') + (linea.has(i) ? ' g' : '') + (viejo ? ' v' : '') + (ctx.pista === i ? ' p' : '')
      + ((cambio && nuevo) || (!cambio && b.classList.contains('n')) ? ' n' : '');
    b.setAttribute('aria-label', `Fila ${(i / n | 0) + 1}, columna ${i % n + 1}, ${val ? (val === 1 ? 'X' : 'O') : 'vacía'}`);
    if (val) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
  }
  tab.classList.toggle('on', ctx.puedeJugar());
  tab.classList.toggle('fin', !!e.fin && e.fin.w > 0);
  prevN = e.n;
}

const duelo = crearDuelo({
  id: 'tresenraya', css: new URL('./tresenraya.css', import.meta.url), variantes: VARIANTES, nombres: ['X', 'O'],
  chip: n => `<i class="ch tr${n}">${n === 1 ? '✕' : '○'}</i>`,
  estadoInicial, jugadas, aplicar, validarEstado, ia, reglasHTML, vista: { montar, pintar },
});
export const { mount, unmount, validar, resumen } = duelo;
export const migrarV1 = d => d;
