// Tutorial de Akari
// Mini panel 4×4:  M# = muro con número, M = muro sin número, . = casilla clara
const P = ['.2..', '...M', 'M...', '..0.'];
const SOL = [[1, 0, 0, 1], [0, 1, 0, 0], [0, 0, 0, 1], [1, 0, 0, 0]];
const el = (r, c) => P[r][c];
function mini(z, ctx) {
  const N = 4, v = Array.from({ length: N }, () => new Array(N).fill(0));
  let html = '<div class="tt-g" style="grid-template-columns:repeat(4,52px)">';
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const c = el(y, x); html += c === '.' ? `<button class="tt-k" type="button" data-p="${y}${x}" style="width:52px;height:52px"></button>` : `<div class="tt-k neg" style="width:52px;height:52px;font-size:20px">${c === 'M' ? '' : c}</div>`; }
  z.innerHTML = html + '</div>';
  const bt = [...z.querySelectorAll('button')], mur = (y, x) => y >= 0 && y < N && x >= 0 && x < N && el(y, x) !== '.';
  function eval_() {
    const il = Array.from({ length: N }, () => new Array(N).fill(false)); let conf = false;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (v[y][x] === 1) {
      il[y][x] = true;
      for (const [dy, dx] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { let a = y + dy, b = x + dx; while (a >= 0 && a < N && b >= 0 && b < N && el(a, b) === '.') { il[a][b] = true; if (v[a][b] === 1) conf = true; a += dy; b += dx; } }
    }
    bt.forEach(b => { const y = +b.dataset.p[0], x = +b.dataset.p[1]; b.textContent = v[y][x] === 1 ? '💡' : v[y][x] === 2 ? '✖' : ''; b.style.background = v[y][x] === 1 ? '#FFE9A0' : il[y][x] ? '#FFF6D0' : ''; });
    if (conf) { ctx.mal('❌ Dos bombillas se están viendo entre sí.'); return; }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (el(y, x) >= '0' && el(y, x) <= '4') { let c = 0; for (const [dy, dx] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const a = y + dy, b = x + dx; if (a >= 0 && a < N && b >= 0 && b < N && v[a][b] === 1) c++; } if (c > +el(y, x)) { ctx.mal('❌ El número ' + el(y, x) + ' tiene demasiadas bombillas pegadas.'); return; } }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (el(y, x) === '.' && !il[y][x]) { ctx.info(''); return; }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (el(y, x) >= '0' && el(y, x) <= '4') { let c = 0; for (const [dy, dx] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const a = y + dy, b = x + dx; if (a >= 0 && a < N && b >= 0 && b < N && v[a][b] === 1) c++; } if (c !== +el(y, x)) { ctx.info(''); return; } }
    ctx.ok('✅ ¡Todo iluminado y sin choques!');
  }
  bt.forEach(b => { b.onclick = () => { const y = +b.dataset.p[0], x = +b.dataset.p[1]; v[y][x] = (v[y][x] + 1) % 3; eval_(); }; });
  return { ver: () => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (el(y, x) === '.') v[y][x] = SOL[y][x] ? 1 : 0; eval_(); } };
}
export const TUTORIAL = {
  titulo: 'Akari',
  pasos: [
    { t: 'El objetivo', h: `<p>Tienes un tablero con casillas claras y <b>muros</b> oscuros. Tu misión es colocar <b>bombillas</b> 💡 hasta que <b>todas las casillas claras estén iluminadas</b>.</p><p>Cada bombilla ilumina en <b>línea recta</b>, hacia arriba, abajo, izquierda y derecha, hasta que choca con un muro. Y una regla de oro: <b>dos bombillas no pueden iluminarse entre sí</b>.</p>` },
    { t: 'Los números de los muros', h: `<p>Algunos muros llevan un <b>número</b>: es la cantidad de bombillas que hay en las <b>cuatro casillas pegadas</b> al muro (arriba, abajo, izquierda y derecha).</p><ul><li>Un <b>0</b> no tiene ninguna bombilla a su alrededor: puedes marcar ✖ esas casillas.</li><li>Un <b>4</b> está rodeado de bombillas por los cuatro lados.</li><li>Un <b>1</b> en una esquina con una sola vecina clara: ahí va la bombilla.</li></ul><p>Las casillas vecinas a un muro <b>sin número</b> no tienen ninguna restricción.</p>` },
    { t: 'Ejercicio: ilumínalo todo', h: `<p>Toca una casilla para poner 💡; otro toque pone ✖ (aquí seguro que no hay bombilla) y otro la deja vacía. Empieza por el <b>0</b>: las casillas pegadas a él no pueden llevar bombilla. Si te atascas, usa «👀 Muéstrame».</p>`, req: true, demo: mini },
    { t: 'Trucos y ayudas', h: `<ul><li>Una casilla que <b>solo puede ser iluminada desde ella misma</b> (rodeada de muros o ✖) lleva bombilla.</li><li>Si un muro ya tiene todas sus bombillas, marca ✖ las demás vecinas.</li><li>Cuando pones una bombilla, las casillas que ve ya no pueden llevar otra: márcalas.</li><li>✔ <b>Comprobar</b> te dice qué casillas están mal puestas y 💡 <b>Pista</b> coloca una bombilla por ti. En Fácil nunca hace falta adivinar.</li></ul>` },
  ],
};
