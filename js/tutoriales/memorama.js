export const TUTORIAL = {
  titulo: 'Match-Up',
  pasos: [
    { t: 'La idea', h: `<p>Todas las cartas empiezan <b>boca abajo</b>. En tu turno destapas <b>dos</b>: si tienen la misma imagen son <b>pareja</b> y se quedan a la vista; si no, se vuelven a tapar. Memoriza dónde está cada una.</p>` },
    { t: 'Pruébalo', h: `<p>Encuentra las 4 parejas destapando cartas de dos en dos.</p>`, req: true,
      demo(z, ctx) {
        const em = ['🍎', '🐶', '🌍', '🚗']; let c = [...em, ...em]; c = c.map((e, i) => [e, (i * 5 + 3) % 8]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
        let abiertas = [], hechas = new Set(), bloq = false, mov = 0;
        z.innerHTML = `<div class="tt-g" style="grid-template-columns:repeat(4,52px)">${c.map((e, i) => `<button class="tt-k" data-i="${i}" type="button" style="width:52px;height:52px;font-size:24px">❔</button>`).join('')}</div>`;
        const bs = [...z.querySelectorAll('button')];
        const pon = (i, v) => { bs[i].textContent = v ? c[i] : '❔'; };
        bs.forEach((b, i) => b.onclick = () => {
          if (bloq || hechas.has(i) || abiertas.includes(i)) return; pon(i, 1); abiertas.push(i);
          if (abiertas.length === 2) { mov++; const [a, d] = abiertas;
            if (c[a] === c[d]) { hechas.add(a); hechas.add(d); abiertas = []; ctx.info('¡Pareja!'); if (hechas.size === 8) ctx.ok(`✅ ¡Todas las parejas en ${mov} intentos!`); }
            else { bloq = true; ctx.info('No coinciden: se vuelven a tapar.'); setTimeout(() => { pon(a, 0); pon(d, 0); abiertas = []; bloq = false; }, 800); } }
        });
        return { ver: () => { c.forEach((e, i) => pon(i, 1)); hechas = new Set(c.map((_, i) => i)); ctx.ok('Así queda el tablero resuelto.'); } };
      } },
    { t: 'Modos de juego', h: `<ul><li><b>Un jugador</b>: menos movimientos y menos tiempo. Hay hasta 3 <b>👁️ vistazos</b>.</li><li><b>2 jugadores</b> o <b>contra la máquina</b>: si aciertas una pareja repites turno. Gana quien reúna más.</li></ul>` },
  ],
};
