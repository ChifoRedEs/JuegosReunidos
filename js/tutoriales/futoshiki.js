// Tutorial de Futoshiki
// Mini panel 3×3. Solución: 1 2 3 / 3 1 2 / 2 3 1. Dato: arriba a la izquierda = 1. h[1]: casilla (0,1) < (0,2). v[1]: (0,1) > (1,1).
const SOL = [[1, 2, 3], [3, 1, 2], [2, 3, 1]];
const DADO = { '0,0': 1 };
function mini(z, ctx) {
  const v = [[1, 0, 0], [0, 0, 0], [0, 0, 0]];
  let html = '<div class="tt-g" style="grid-template-columns:repeat(3,52px)">';
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
    const fijo = DADO[y + ',' + x];
    html += `<button class="tt-k${fijo ? ' fijo' : ''}" type="button" data-p="${y}${x}" style="width:52px;height:52px;position:relative">${fijo || ''}${x === 1 && y === 0 ? '<i style="position:absolute;right:-13px;top:14px;font-style:normal;font-size:20px;color:#B07A00">‹</i>' : ''}${x === 1 && y === 0 ? '<i style="position:absolute;left:18px;bottom:-15px;font-style:normal;font-size:20px;color:#B07A00">˄</i>' : ''}</button>`;
  }
  z.innerHTML = html + '</div><p style="text-align:center;font-size:13px;margin:4px 0 0">‹ = «el de la izquierda es menor».&nbsp; ˄ = «el de arriba es menor».</p>';
  const bt = [...z.querySelectorAll('button')];
  const txt = b => { const y = +b.dataset.p[0], x = +b.dataset.p[1]; return [y, x]; };
  function chk() {
    bt.forEach(b => { const [y, x] = txt(b); if (!DADO[y + ',' + x]) { const old = b.querySelectorAll('i'); b.textContent = v[y][x] || ''; old.forEach(i => b.append(i)); } });
    const f = v.flat(); if (f.some(n => !n)) { ctx.info(''); return; }
    for (let i = 0; i < 3; i++) { if (new Set(v[i]).size < 3) { ctx.mal('❌ Hay un número repetido en la fila ' + (i + 1) + '.'); return; } if (new Set(v.map(r => r[i])).size < 3) { ctx.mal('❌ Hay un número repetido en la columna ' + (i + 1) + '.'); return; } }
    if (!(v[0][1] < v[0][2])) { ctx.mal('❌ La flecha ‹ pide que el número de la izquierda sea menor que el de su derecha.'); return; }
    if (!(v[0][1] < v[1][1])) { ctx.mal('❌ La flecha ˄ pide que el número de arriba sea menor que el de abajo.'); return; }
    ctx.ok('✅ ¡Resuelto!');
  }
  bt.forEach(b => { const [y, x] = txt(b); if (DADO[y + ',' + x]) return; b.onclick = () => { v[y][x] = (v[y][x] + 1) % 4; chk(); }; });
  return { ver: () => { for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) v[y][x] = SOL[y][x]; chk(); } };
}
export const TUTORIAL = {
  titulo: 'Futoshiki',
  pasos: [
    { t: 'Las reglas básicas', h: `<p>Es como un Sudoku: en un tablero de <b>N×N</b> se escriben los números del <b>1 al N</b> sin repetir en ninguna fila ni columna.</p><p>Además, entre algunas casillas hay una <b>flecha de desigualdad</b>. La flecha apunta hacia la casilla con el número <b>menor</b>: ‹ quiere decir «el de la izquierda es menor que el de la derecha», y ˄ «el de arriba es menor que el de abajo».</p><p>Algunas casillas vienen ya con su número (marco grabado) y no se pueden cambiar.</p>` },
    { t: 'Ejercicio: un 3×3', h: `<p>Toca una casilla para cambiar su número (1, 2, 3). Hay un <b>1</b> dado arriba a la izquierda. Fíjate en las flechas: el número de arriba en medio debe ser <b>menor</b> que el de su derecha y también que el de debajo. Si te atascas, usa «👀 Muéstrame».</p>`, req: true, demo: mini },
    { t: 'Trucos y ayudas', h: `<ul><li>En un <b>1…N</b> con una flecha, el <b>1</b> solo puede estar en el lado menor y el <b>N</b> solo en el lado mayor.</li><li>Una cadena de flechas (a &lt; b &lt; c) obliga a que a no sea el mayor ni c el menor.</li><li>Usa ✏️ <b>Notas</b> para anotar candidatos y quitarlos cuando una flecha o una fila los descarte.</li><li>✔ <b>Comprobar</b> marca lo que está mal y 💡 <b>Pista</b> rellena una casilla. En Fácil nunca hace falta adivinar.</li></ul>` },
  ],
};
