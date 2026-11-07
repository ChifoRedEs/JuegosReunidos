// Tutorial de Encajados (sokoban)
const NIV = [
  { t: ['#######', '#@ $ .#', '#######'], txt: 'Empuja la caja 📦 hasta el objetivo 🎯.' },
  { t: ['#####', '#.  #', '# $ #', '#  @#', '#####'], txt: 'Esta vez hay que dar la vuelta: empuja primero hacia un lado y luego hacia arriba.' },
];
function nivel(z, ctx, def) {
  let m, px, py, hist;
  const carga = () => { m = def.t.map(r => r.split('')); hist = []; for (let y = 0; y < m.length; y++) for (let x = 0; x < m[y].length; x++) if (m[y][x] === '@') { px = x; py = y; m[y][x] = ' '; } };
  const obj = []; def.t.forEach((r, y) => [...r].forEach((c, x) => { if (c === '.') obj.push([x, y]); }));
  const esObj = (x, y) => obj.some(o => o[0] === x && o[1] === y);
  z.innerHTML = `<div class="tt-s-wrap"><div id="sk" class="tt-sk"></div><div class="tt-dpad"><button type="button" data-d="u" aria-label="Arriba">⬆️</button><br><button type="button" data-d="l" aria-label="Izquierda">⬅️</button><button type="button" data-d="d" aria-label="Abajo">⬇️</button><button type="button" data-d="r" aria-label="Derecha">➡️</button><br><button type="button" data-d="z">⟲ Reiniciar</button></div></div>`;
  const cont = z.querySelector('#sk');
  const dib = () => {
    cont.style.gridTemplateColumns = `repeat(${m[0].length},36px)`;
    cont.innerHTML = m.map((r, y) => r.map((c, x) => {
      let s = '', cl = 'tt-s';
      if (c === '#') cl += ' muro'; else { if (esObj(x, y)) s = '🎯'; if (c === '$') s = '📦'; if (x === px && y === py) s = '🧍'; }
      return `<div class="${cl}">${s}</div>`;
    }).join('')).join('');
    const ok = obj.every(o => m[o[1]][o[0]] === '$');
    if (ok) ctx.ok('✅ ¡Nivel resuelto! Recuerda: solo se empuja, nunca se tira.'); return ok;
  };
  const mueve = d => {
    const [dx, dy] = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] }[d]; const nx = px + dx, ny = py + dy, c = m[ny][nx];
    if (c === '#') return;
    if (c === '$') { const bx = nx + dx, by = ny + dy; if (m[by][bx] !== ' ' && m[by][bx] !== '.') { ctx.mal('❌ La caja no puede ir ahí (hay un muro u otra caja).'); return; } m[ny][nx] = ' '; m[by][bx] = '$'; }
    px = nx; py = ny; ctx.info(''); dib();
  };
  // los '.' del mapa son objetivos: los tratamos como suelo
  def = { ...def, t: def.t };
  carga(); m = m.map(r => r.map(c => c === '.' ? ' ' : c)); dib();
  z.onclick = e => { const b = e.target.closest('button[data-d]'); if (!b) return; if (b.dataset.d === 'z') { carga(); m = m.map(r => r.map(c => c === '.' ? ' ' : c)); ctx.info(''); dib(); } else mueve(b.dataset.d); };
  return d => { for (const k of d) mueve(k); };
}
export const TUTORIAL = {
  titulo: 'Encajados',
  pasos: [
    { t: 'El objetivo', h: `<p>Eres el 🧍 almacenero. Tienes que llevar todas las cajas 📦 a las casillas marcadas con 🎯.</p><ul><li>Solo puedes <b>empujar</b> una caja, nunca tirar de ella.</li><li>Solo se empuja <b>una caja a la vez</b>: no puedes empujar dos seguidas ni una contra un muro.</li></ul><p>Mover: flechas del teclado, deslizando el dedo o tocando la casilla de al lado.</p>` },
    { t: 'Ejercicio 1', h: `<p>${NIV[0].txt}</p>`, req: true, demo(z, ctx) { const mv = nivel(z, ctx, NIV[0]); return { ver: () => mv('rrr'.split('')) }; } },
    { t: 'Ejercicio 2: pensar antes', h: `<p>${NIV[1].txt}</p><p class="tt-nota">Si te atascas, ⟲ Reiniciar. En el juego también hay ↶ Deshacer sin límite.</p>`, req: true,
      demo(z, ctx) { const mv = nivel(z, ctx, NIV[1]); return { ver: () => mv('uldlu'.split('')) }; } },
    { t: 'Cuidado con los rincones', h: `<p>Una caja pegada a un <b>rincón</b> (dos muros en ángulo) ya no se puede mover nunca más y el nivel se queda sin solución.</p><div class="tt-box">Antes de empujar, pregúntate: <i>¿podré sacarla de ahí después?</i></div><p>Si te equivocas, ↶ y a probar otra cosa. 💡 <b>Pista</b> te sugiere el siguiente movimiento.</p>` },
  ],
};
