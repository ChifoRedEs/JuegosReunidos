export const TUTORIAL = {
  titulo: 'El Ahorcado',
  pasos: [
    { t: 'La idea', h: `<p>Adivina la palabra eligiendo letras. Cada letra que <b>no está</b> suma un fallo y completa el dibujo; si se completa, pierdes. Las tildes no importan.</p>` },
    { t: 'Pruébalo', h: `<p>Pista: <i>"Lugar donde vive una persona"</i> (4 letras). Elige letras sin pasar de 3 fallos.</p>`, req: true,
      demo(z, ctx) {
        const W = 'CASA', L = 'AEOSCTLRM'.split(''); const ac = new Set(); let fal = 0;
        const dib = () => { z.innerHTML = `<div class="tt-fila" style="font-size:28px;letter-spacing:8px">${[...W].map(x => ac.has(x) ? x : '_').join(' ')}</div><p>Fallos: ${'❌'.repeat(fal) || '—'} (máx. 3)</p><div class="tt-fila">${L.map(x => `<button class="tt-k" type="button" data-l="${x}" ${ac.has(x) || (fal >= 3) ? 'disabled' : ''} style="width:40px;height:40px">${x}</button>`).join('')}</div>`;
          z.querySelectorAll('button').forEach(b => b.onclick = () => { const l = b.dataset.l; ac.add(l); if (!W.includes(l)) fal++; dib();
            if ([...W].every(x => ac.has(x))) ctx.ok('✅ ¡CASA! Palabra completa.'); else if (fal >= 3) ctx.mal('❌ Demasiados fallos. Pulsa Atrás y vuelve a entrar para repetirlo, o 👀 Muéstrame.'); else ctx.info(''); }); };
        dib(); return { ver: () => { [...W].forEach(x => ac.add(x)); fal = 0; dib(); ctx.ok('✅ Así: C, A y S.'); } };
      } },
    { t: 'Ayudas y 2 jugadores', h: `<ul><li>La <b>pista</b> es la definición. En Difícil y Experto verla cuesta un fallo, igual que 💡 Letra.</li><li>📚 Modo diccionario con palabras raras.</li><li>👥 <b>2 jugadores</b>: uno escribe la palabra secreta y le pasa el móvil al otro.</li></ul>` },
  ],
};
