// Tutorial de Bombardeo (buscaminas)
export const TUTORIAL = {
  titulo: 'Bombardeo',
  pasos: [
    { t: 'El objetivo', h: `<p>Debajo de las casillas hay <b>minas</b> escondidas. Tienes que <b>abrir todas las casillas que no tienen mina</b> sin pisar ninguna.</p><p>Al abrir una casilla aparece un <b>número</b>: cuántas minas hay en las <b>8 casillas que la rodean</b> (arriba, abajo, lados y diagonales).</p><p>La primera casilla que abres <b>siempre es segura</b>.</p>` },
    { t: 'Leer un número', h: `<p>Un <b>1</b> significa: entre sus 8 vecinas hay <b>exactamente 1 mina</b>. Un <b>2</b>, dos minas, y así. Las casillas que ya están abiertas no tienen mina, así que solo cuentan las <b>tapadas</b>.</p>
      <div class="tt-box">Si un número tiene tantas casillas tapadas como minas indica, <b>todas son minas</b>. Si ya has marcado tantas minas como indica, <b>el resto de vecinas son seguras</b>.</div>` },
    { t: 'Ejercicio: encuentra la mina', h: `<p>Toca la casilla donde esté la mina para marcarla 🚩. El <b>1</b> de la izquierda solo tiene <b>una</b> casilla tapada a su alrededor.</p>`, req: true,
      demo(z, ctx) {
        // 1 | ? ; 1 | 1  (el 1 de la izquierda tiene solo una vecina tapada)
        z.innerHTML = `<div class="tt-g" style="grid-template-columns:repeat(3,48px)"><div class="tt-k">1</div><button class="tt-k tapa" data-m="1" type="button" aria-label="Casilla tapada"></button><div class="tt-k">1</div><div class="tt-k">1</div><div class="tt-k">1</div><div class="tt-k">1</div></div>`;
        const b = z.querySelector('button');
        b.onclick = () => { b.textContent = '🚩'; ctx.ok('✅ ¡Eso es! Ese 1 solo veía una casilla tapada, así que ahí estaba la mina. (En el juego: pulsación larga = bandera.)'); };
        return { ver: () => b.click() };
      } },
    { t: 'Ejercicio: abre las seguras', h: `<p>La mina 🚩 ya está marcada. El <b>1</b> tiene ya su mina, así que <b>las demás casillas tapadas a su alrededor son seguras</b>. Ábrelas todas (toca las tapadas, salvo la bandera).</p>`, req: true,
      demo(z, ctx) {
        z.innerHTML = `<div class="tt-g" style="grid-template-columns:repeat(3,48px)"><button class="tt-k tapa" data-s="1" type="button"></button><button class="tt-k tapa" data-s="1" type="button"></button><button class="tt-k tapa" data-s="1" type="button"></button><button class="tt-k tapa" data-s="1" type="button"></button><div class="tt-k">1</div><button class="tt-k tapa" data-m="1" type="button">🚩</button><button class="tt-k tapa" data-s="1" type="button"></button><button class="tt-k tapa" data-s="1" type="button"></button><button class="tt-k tapa" data-s="1" type="button"></button></div>`;
        const bs = [...z.querySelectorAll('button[data-s]')]; let abiertas = 0;
        bs.forEach(b => b.onclick = () => { if (b.dataset.on) return; b.dataset.on = 1; b.className = 'tt-k'; b.textContent = ''; abiertas++; if (abiertas === bs.length) ctx.ok('✅ ¡Perfecto! Así se avanza: deducir, abrir, y deducir otra vez.'); else ctx.info(`Seguras abiertas: ${abiertas}/${bs.length}`); });
        z.querySelector('[data-m]').onclick = () => ctx.mal('❌ ¡Esa es la mina! No la pises: ábrelas las demás.');
        return { ver: () => bs.forEach(b => b.click()) };
      } },
    { t: 'Cómo se juega en la app', h: `<ul><li><b>Toca</b> una casilla para abrirla; <b>mantén pulsado</b> para poner una bandera 🚩.</li><li>Toca un <b>número ya cumplido</b> (con sus banderas) para abrir de golpe el resto de su alrededor.</li><li>💡 <b>Pista</b> señala una casilla segura. 🧠 <b>Sin adivinar</b> genera tableros que se pueden resolver siempre con lógica.</li></ul>` },
  ],
};
