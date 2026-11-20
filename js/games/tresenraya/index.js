import { crearDuelo } from '../../core/duelo.js';
import { grupoTablero, grupoFondo, grupoPersonaje, imgDeValores } from '../../core/aspectos.js';
import { gruposFichas, estilo } from '../../core/fichas.js';
import { variablesTintadas } from '../../core/tinte.js';
import { VARIANTES, estadoInicial, jugadas, aplicar, validarEstado, ia, reglasHTML } from './reglas.js';

let cel = [], tab = null, prevN = -1, vAct = null;
// Marcas: cruces/aros neutros (se tiñen con el color de cada lado) y parejas de objetos ilustrados
const PARES = { animales: ['pj/an-gato', 'pj/an-perro'], espacio: ['objetos/cohete', 'objetos/platillo'], comida: ['objetos/pizza', 'objetos/hamburguesa'], deporte: ['objetos/futbol', 'objetos/baloncesto'], mundo: ['objetos/planeta', 'objetos/luna'], pirata: ['objetos/cofre', 'objetos/ancla'], viaje: ['objetos/mochila', 'objetos/brujula'], dulce: ['objetos/donut', 'objetos/helado'] };
const NPARES = { animales: 'Gato y perro', espacio: 'Cohete y platillo', comida: 'Pizza y hamburguesa', deporte: 'Fútbol y baloncesto', mundo: 'Planeta y luna', pirata: 'Cofre y ancla', viaje: 'Mochila y brújula', dulce: 'Donut y helado' };
const estiloM = f => /^c[1-6]$/.test(f) ? f.slice(1) : '1';
const marca = (val, fichas, pj) => pj ? `<img class="pji" src="${pj}" alt="">` : PARES[fichas] ? `<img class="mkp" src="img/${PARES[fichas][val - 1]}.webp" alt="">` : `<i class="mki ${val === 1 ? 'x' : 'o'}"></i>`;
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
  const V = VARIANTES[v], n = V.n, linea = new Set(e.fin ? e.fin.linea : []), emo = imgDeValores(ctx.valores()), est = estilo(ctx.valores());
  const raiz = tab.closest('.juego-tresenraya') || tab;      // 🎨 Fichas: color de cada marca (--tr-x / --tr-o) y tamaño
  est.hex ? raiz.style.setProperty('--tr-x', est.hex) : raiz.style.removeProperty('--tr-x'); est.hex2 ? raiz.style.setProperty('--tr-o', est.hex2) : raiz.style.removeProperty('--tr-o');
  { const k = estiloM(ctx.valores().fichas); variablesTintadas(raiz, [['--tr-xi', `img/tresenraya/cruz-${k}.webp`, est.hex || '#2F6BFF'], ['--tr-oi', `img/tresenraya/aro-${k}.webp`, est.hex2 || '#FF4757']], k + (est.hex || '') + (est.hex2 || '')); }
  raiz.style.setProperty('--fx-esc', est.esc);      // «Personajes»: tu marca es tu personaje
  if (prevN < 0) prevN = e.n;
  for (let i = 0; i < n * n; i++) {
    const val = e.b[i], b = cel[i], pj = emo && val && val === ctx.yo() ? emo : '', kk = val + pj, cambio = b.dataset.v !== kk;
    if (cambio) { b.dataset.v = kk; b.innerHTML = val ? marca(val, fichasAct, pj) : ''; }
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
  id: 'tresenraya', css: new URL('./tresenraya.css', import.meta.url), iaModulo: new URL('./reglas.js', import.meta.url).href, variantes: VARIANTES, nombres: ['X', 'O'],
  chip: (n, vals = {}) => PARES[vals.fichas] ? `<img class="ch pji" src="img/${PARES[vals.fichas][n - 1]}.webp" alt="">` : `<i class="ch tr${n}">${n === 1 ? '✕' : '○'}</i>`,
  aspecto: [{ ...{ ...grupoFondo('#duTab'), def: 't-n-mesa-juegos-1' }, tt: true }, grupoPersonaje('Personajes (tu marca)'), 
    { ...grupoTablero(), tt: true },
    ...gruposFichas({ pocos: true, titulo: 'Fichas', icono: '❌', lados: ['✕', '○'], textura: false, formas: false, nombresColor: ['Color Ficha X', 'Color Ficha O'] }),
    { clave: 'fichas', enEstilos: true, etiqueta: 'Símbolos', titulo: 'Símbolos de las marcas', icono: '❌', ventana: true, forma: 'figura', def: 'clasico', opciones: [...[1, 2, 3, 4, 5, 6].map(k => ({ id: k === 1 ? 'clasico' : 'c' + k, nombre: 'Cruz y aro ' + k, sec: 'Cruces y aros (con tu color)', img: `img/tresenraya/cruz-${k}.webp` })), ...Object.keys(PARES).map(k => ({ id: k, nombre: NPARES[k], sec: 'Parejas ilustradas', img: `img/${PARES[k][0]}.webp` }))] },
  ],
  estadoInicial, jugadas, aplicar, validarEstado, ia, reglasHTML, vista: { montar, pintar },
});
export const { mount, unmount, validar, resumen } = duelo;
export const migrarV1 = d => d;
