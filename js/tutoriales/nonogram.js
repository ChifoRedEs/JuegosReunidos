// Tutorial de Nonogram
const OBJ = ['11111', '00100', '00100', '00100', '00100'];
export const TUTORIAL = {
  titulo: 'Nonogram',
  pasos: [
    { t: 'Dibujar con números', h: `<p>Los números de cada <b>fila</b> y <b>columna</b> dicen cuántas casillas seguidas hay que <b>rellenar</b>, en orden. Si pone <b>3 1</b>: un bloque de 3 casillas, al menos un hueco, y luego 1 casilla.</p><p>Al terminar aparece un dibujo escondido.</p><div class="tt-box">Una fila de 5 con pista <b>5</b> se rellena entera. Una con <b>0</b> queda vacía. Con <b>1 1 1</b> en 5 casillas: ■ □ ■ □ ■.</div>` },
    { t: 'Ejercicio: dibuja una T', h: `<p>Tablero 5×5. Filas: <b>5</b>, <b>1</b>, <b>1</b>, <b>1</b>, <b>1</b>. Columnas: <b>1</b>, <b>1</b>, <b>5</b>, <b>1</b>, <b>1</b>. Toca las casillas para rellenarlas. Pista: la fila de "5" va entera y la columna de "5" también.</p>`, req: true,
      demo(z, ctx) {
        const F = ['5', '1', '1', '1', '1'], C = ['1', '1', '5', '1', '1']; const v = OBJ.map(r => [...r].map(() => 0));
        let h = '<div class="tt-g" style="grid-template-columns:24px repeat(5,38px)"><div></div>' + C.map(c => `<div class="tt-k neg" style="min-height:24px;font-size:13px;display:flex;align-items:center;justify-content:center">${c}</div>`).join('');
        for (let y = 0; y < 5; y++) { h += `<div class="tt-k neg" style="font-size:13px;display:flex;align-items:center;justify-content:center">${F[y]}</div>`; for (let x = 0; x < 5; x++) h += `<button class="tt-k" type="button" data-p="${y}${x}"></button>`; }
        z.innerHTML = h + '</div>';
        const bs = [...z.querySelectorAll('button')];
        const pinta = () => { bs.forEach(b => { const y = +b.dataset.p[0], x = +b.dataset.p[1]; b.style.background = v[y][x] ? 'var(--ink,#222)' : ''; }); };
        const chk = () => { pinta(); const bien = OBJ.every((r, y) => [...r].every((c, x) => +c === v[y][x])); if (bien) ctx.ok('✅ ¡Una T! Los números te lo dibujaron.'); else ctx.info(''); };
        bs.forEach(b => b.onclick = () => { const y = +b.dataset.p[0], x = +b.dataset.p[1]; v[y][x] ^= 1; chk(); });
        return { ver: () => { OBJ.forEach((r, y) => [...r].forEach((c, x) => { v[y][x] = +c; })); chk(); } };
      } },
    { t: 'Marcar vacías y arrastrar', h: `<ul><li>En el juego, cada toque rota: <b>rellenar → ✕ (vacía) → borrar</b>. La ✕ te recuerda qué casillas descartaste.</li><li><b>Arrastra</b> el dedo para pintar muchas casillas de una vez.</li><li>Cuando una pista ya está cumplida, se <b>tacha</b>.</li></ul><p>Empieza por las filas y columnas con pistas grandes: dejan poco margen y siempre se pueden rellenar algunas casillas seguro.</p>` },
  ],
};
