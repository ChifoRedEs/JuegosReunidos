import { crearDuelo } from '../../core/duelo.js';
import { VARIANTES, estadoInicial, jugadas, aplicar, validarEstado, ia, reglasHTML } from './reglas.js';

let tab = null, cols = [], discos = [], holes = [], prevN = -1, vAct = null;

function montar(cont, ctx, v) {
  const V = VARIANTES[v]; vAct = v; prevN = -1;
  let h = `<div class="c4w t1" style="--cols:${V.cols}" role="group" aria-label="Tablero de Conecta, ${V.cols} columnas">`;
  for (let c = 0; c < V.cols; c++) {
    h += `<button type="button" class="col" data-c="${c}" aria-label="Columna ${c + 1}"><span class="pre"></span><span class="cells">`;
    for (let r = 0; r < V.filas; r++) h += `<span class="hole${r === 0 && c === 0 ? ' tl' : ''}${r === 0 && c === V.cols - 1 ? ' tr' : ''}${r === V.filas - 1 && c === 0 ? ' bl' : ''}${r === V.filas - 1 && c === V.cols - 1 ? ' br' : ''}"><i class="d"></i></span>`;
    h += '</span></button>';
  }
  cont.innerHTML = h + '</div>';
  tab = cont.firstElementChild; cols = [...tab.children];
  holes = []; discos = [];
  for (let r = 0; r < V.filas; r++) for (let c = 0; c < V.cols; c++) { const hl = cols[c].querySelectorAll('.hole')[r]; holes[r * V.cols + c] = hl; discos[r * V.cols + c] = hl.firstElementChild; }
  tab.addEventListener('click', e => { const b = e.target.closest('.col'); if (b) ctx.jugar(+b.dataset.c); });
  tab.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const i = cols.indexOf(document.activeElement); if (i < 0) return;
    e.preventDefault(); cols[Math.min(V.cols - 1, Math.max(0, i + (e.key === 'ArrowLeft' ? -1 : 1)))].focus();
  });
}
function pintar(e, ctx, v) {
  if (!tab || v !== vAct) return;
  const V = VARIANTES[v], linea = new Set(e.fin ? e.fin.linea : []);
  if (prevN < 0) prevN = e.n;
  for (let i = 0; i < V.cols * V.filas; i++) {
    const val = e.b[i], d = discos[i], hl = holes[i], r = i / V.cols | 0, c = i % V.cols;
    const key = val + (i === e.ult ? 'u' : '') + (linea.has(i) ? 'g' : '');
    if (d.dataset.k !== key) {
      const prev = +d.dataset.val || 0, cae = val && prev !== val && i === e.ult && e.n === prevN + 1;
      const conserva = val && prev === val && d.classList.contains('cae');
      d.className = 'd' + (val ? ' p' + val : '') + (i === e.ult ? ' ult' : '') + (cae || conserva ? ' cae' : '');
      if (cae) d.style.setProperty('--f', r);
      d.dataset.k = key; d.dataset.val = val;
      hl.classList.toggle('gana', linea.has(i));
    }
  }
  cols.forEach((b, c) => {
    const lleno = e.b[c] !== 0;
    b.classList.toggle('lleno', lleno); b.classList.toggle('pista', ctx.pista === c);
    const libres = e.b.filter((z, i) => i % V.cols === c && !z).length;
    b.setAttribute('aria-label', `Columna ${c + 1}, ${lleno ? 'llena' : libres + ' libres'}`);
    if (lleno) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
  });
  tab.classList.toggle('on', ctx.puedeJugar());
  tab.classList.toggle('fin', !!e.fin && e.fin.w > 0);
  tab.classList.toggle('t1', e.turn === 1); tab.classList.toggle('t2', e.turn === 2);
  prevN = e.n;
}

const duelo = crearDuelo({
  id: 'conecta4', css: new URL('./conecta4.css', import.meta.url), variantes: VARIANTES, nombres: ['Rojo', 'Amarillo'],
  chip: n => `<i class="ch c4${n}"></i>`,
  estadoInicial, jugadas, aplicar, validarEstado, ia, reglasHTML, vista: { montar, pintar },
});
export const { mount, unmount, validar, resumen } = duelo;
export const migrarV1 = d => d;
