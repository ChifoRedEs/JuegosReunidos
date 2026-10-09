import { crearDuelo } from '../../core/duelo.js';
import { grupoTablero } from '../../core/aspectos.js';
import { VARIANTES, estadoInicial, jugadas, aplicar, validarEstado, ia, reglasHTML } from './reglas.js';

let cel = [], tab = null, prevN = -1, vAct = null;
const EMOJIS = { animales: ['🐱', '🐶'], espacio: ['🚀', '👽'], comida: ['🍕', '🍔'], deporte: ['⚽', '🏀'] };
const MARCA = { 1: '<svg class="mk x" viewBox="0 0 40 40" aria-hidden="true"><path d="M9 9L31 31"/><path d="M31 9L9 31"/></svg>', 2: '<svg class="mk o" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="12.5"/></svg>' };

function marca(val, fichas) { return fichas && EMOJIS[fichas] ? `<i class="em" aria-hidden="true">${EMOJIS[fichas][val - 1]}</i>` : MARCA[val]; }
let fichasAct = 'clasico';
function montar(cont, ctx, v) {
  const n = VARIANTES[v].n; vAct = v; prevN = -1; fichasAct = ctx.valores().fichas;
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
    if (cambio) { b.dataset.v = val; b.innerHTML = val ? marca(val, fichasAct) : ''; }
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
  chip: (n, vals = {}) => EMOJIS[vals.fichas] ? `<i class="ch em">${EMOJIS[vals.fichas][n - 1]}</i>` : `<i class="ch tr${n}">${n === 1 ? '✕' : '○'}</i>`,
  aspecto: [
    grupoTablero(),
    { clave: 'fichas', titulo: 'Fichas', def: 'clasico', opciones: [{ id: 'clasico', nombre: '✕ ○ Clásicas' }, { id: 'animales', nombre: '🐱 🐶 Animales' }, { id: 'espacio', nombre: '🚀 👽 Espacio' }, { id: 'comida', nombre: '🍕 🍔 Comida' }, { id: 'deporte', nombre: '⚽ 🏀 Deporte' }] },
    { clave: 'colores', titulo: 'Colores de las fichas clásicas', def: 'cielo', opciones: [{ id: 'cielo', nombre: 'Azul / Rojo', sw: ['#2F6BFF', '#FF4757'] }, { id: 'bosque', nombre: 'Verde / Naranja', sw: ['#0FA971', '#FF8A00'] }, { id: 'fantasia', nombre: 'Violeta / Rosa', sw: ['#8B3DFF', '#FF3FA4'] }, { id: 'dorado', nombre: 'Negro / Oro', sw: ['#1B2340', '#E8A800'] }] },
  ],
  estadoInicial, jugadas, aplicar, validarEstado, ia, reglasHTML, vista: { montar, pintar },
});
export const { mount, unmount, validar, resumen } = duelo;
export const migrarV1 = d => d;
