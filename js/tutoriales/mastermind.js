// Tutorial de Código Cifrado (mastermind)
const COL = ['#E5383B', '#2F6BFF', '#25B35A', '#F2C94C', '#8B5CF6', '#F08A00'], NOM = ['rojo', 'azul', 'verde', 'amarillo', 'morado', 'naranja'];
const bola = c => `<span class="tt-bola" style="display:inline-block;background:${COL[c]};cursor:default;width:32px;height:32px"></span>`;
function pistas(sec, int) {
  let n = 0, b = 0; const s = [], g = [];
  for (let i = 0; i < sec.length; i++) { if (sec[i] === int[i]) n++; else { s.push(sec[i]); g.push(int[i]); } }
  for (const x of g) { const k = s.indexOf(x); if (k >= 0) { b++; s.splice(k, 1); } }
  return [n, b];
}
const pegs = (n, b) => `<span class="tt-peg">${'<i class="n"></i>'.repeat(n)}${'<i class="b"></i>'.repeat(b)}</span>`;
export const TUTORIAL = {
  titulo: 'Código Cifrado',
  pasos: [
    { t: 'El objetivo', h: `<p>La máquina esconde un <b>código secreto</b>: una fila de bolas de colores (por ejemplo 4). Tú tienes que <b>adivinarlo</b> en pocos intentos.</p><p>En cada intento pones una fila de colores y la app te da <b>pistas</b> con clavijas, sin decirte cuál es cuál.</p><div class="tt-fila">${[0, 1, 2, 3].map(bola).join('')}<span>= ¿?</span></div>` },
    { t: 'Las clavijas', h: `<p>Imagina que el código secreto es: <span class="tt-fila" style="display:inline-flex">${[0, 1, 2, 3].map(bola).join('')}</span> y tú pruebas: <span style="display:inline-flex;gap:3px">${[0, 2, 4, 3].map(bola).join('')}</span></p>
      <ul><li><b>⚫ Clavija negra</b>: una bola con el <b>color y el sitio correctos</b> (aquí el rojo, 1.ª, y el amarillo, 4.ª).</li><li><b>⚪ Clavija blanca</b>: un color que <b>está en el código pero en otro sitio</b> (el verde: está, pero no en la 2.ª).</li><li>El morado no está: no da clavija.</li></ul><p>Resultado: ${pegs(2, 1)} (2 negras y 1 blanca).</p>` },
    { t: 'Pruébalo tú', h: `<p>Esta vez te enseño el código: <span class="tt-fila" style="display:inline-flex">${[0, 1, 2, 3].map(bola).join('')}</span> Toca las bolas de abajo para cambiar su color e intenta conseguir <b>2 negras ⚫⚫ y 1 blanca ⚪</b>.</p>`, req: true,
      demo(z, ctx) {
        const sec = [0, 1, 2, 3], int = [4, 4, 4, 4]; z.innerHTML = `<div class="tt-fila" id="mmI"></div>`;
        const fila = z.querySelector('#mmI');
        const pinta = () => {
          fila.innerHTML = ''; int.forEach((c, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'tt-bola'; b.style.background = COL[c]; b.setAttribute('aria-label', 'Bola ' + (i + 1) + ': ' + NOM[c]); b.onclick = () => { int[i] = (int[i] + 1) % COL.length; pinta(); }; fila.append(b); });
          const [n, b] = pistas(sec, int); fila.insertAdjacentHTML('beforeend', pegs(n, b));
          if (n === 2 && b === 1) ctx.ok('✅ ¡2 negras y 1 blanca! Has entendido las pistas.'); else ctx.info(`Ahora tienes ${n} negra${n === 1 ? '' : 's'} y ${b} blanca${b === 1 ? '' : 's'}. Busca 2 y 1.`);
        };
        pinta(); return { ver: () => { [0, 2, 4, 3].forEach((c, i) => { int[i] = c; }); pinta(); } };
      } },
    { t: 'Cómo deducir', h: `<ol><li>Empieza con un intento cualquiera y <b>lee las pistas</b>.</li><li>Cada intento nuevo debe ser <b>compatible con todas las pistas anteriores</b>: así cada vez quedan menos posibilidades.</li><li>Si no ves por dónde, pulsa 💡 <b>Pista</b>: te dice cuántas combinaciones siguen siendo posibles y rellena una que encaja con todo.</li></ol>
      <p class="tt-nota">Puedes elegir la dificultad (más bolas, más colores, repetir o no) y jugar al revés: <b>🔒 Tú pones el código</b> y la máquina intenta descifrarlo.</p>` },
  ],
};
