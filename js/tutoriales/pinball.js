// Tutorial de Pinball
const IMG = new URL('../../img/pinball/', import.meta.url).href;
// Ejercicio: cargar el muelle. Hay que mantener pulsado hasta pasar de la mitad de la barra y soltar.
function muelle(z, ctx) {
  z.innerHTML = `<div style="text-align:center;margin:10px 0"><img src="${IMG}resorte.webp" alt="" width="90" style="transform:rotate(-90deg);margin:20px 0 4px"><div style="height:14px;width:min(100%,260px);margin:6px auto;background:rgba(0,0,0,.15);border-radius:8px;overflow:hidden"><i id="pbtB" style="display:block;height:100%;width:0;background:#F5C542"></i></div><button type="button" class="btn on" id="pbtL" style="min-height:52px;touch-action:none;user-select:none">⬆ Mantén y suelta</button></div>`;
  const b = z.querySelector('#pbtL'), barra = z.querySelector('#pbtB'); let t0 = 0, raf = 0, v = 0;
  const loop = () => { v = Math.min(1, (performance.now() - t0) / 1100); barra.style.width = v * 100 + '%'; raf = requestAnimationFrame(loop); };
  const abajo = e => { e.preventDefault(); if (raf) return; t0 = performance.now(); raf = requestAnimationFrame(loop); };
  const arriba = () => { if (!raf) return; cancelAnimationFrame(raf); raf = 0; if (v >= 0.5) ctx.ok('✅ ¡Lanzada! Con esa fuerza la bola llega arriba y entra en la mesa.'); else ctx.mal('❌ Demasiado flojo: la bola se cae otra vez al carril. Mantén más tiempo.'); barra.style.width = '0'; v = 0; };
  b.addEventListener('pointerdown', abajo); b.addEventListener('pointerup', arriba); b.addEventListener('pointerleave', arriba); b.addEventListener('pointercancel', arriba);
  return { ver: () => ctx.ok('✅ Con la barra por encima de la mitad, la bola llega arriba.'), fin: () => cancelAnimationFrame(raf) };
}
export const TUTORIAL = {
  titulo: 'Pinball',
  pasos: [
    { t: 'El objetivo', h: `<p>Consigue <b>los máximos puntos</b> con tus 3 (o 5) bolas. La bola rebota por la mesa y tú la mantienes en juego con las <b>aletas</b>.</p><p>Los <b>bumpers</b> redondos dan 100 puntos cada vez que los toca la bola y las gomas triangulares de abajo dan 10 y empujan con fuerza.</p>` },
    { t: 'Ejercicio: lanzar la bola', h: `<p>La bola espera en el carril de la derecha. Mantén pulsado <b>Lanzar</b> para tensar el muelle y suelta: cuanto más tiempo, más fuerza. Prueba pasando de la mitad de la barra.</p>`, req: true, demo: muelle },
    { t: 'Las aletas', h: `<p>Con <b>◀</b> y <b>▶</b> (o las flechas del teclado, o Z y M) subes cada aleta. Pulsa justo cuando la bola llegue a ella para devolverla arriba; si la dejas pasar por el hueco central, pierdes la bola.</p><p>Una <b>bola salvada</b>: si la pierdes poco después de lanzarla, te la devolvemos gratis (una vez por bola).</p>` },
    { t: 'Luces y multiplicador', h: `<p>Cada bumper que toques se <b>ilumina</b>. Cuando tengas los 5 encendidos ganas <b>1.000 puntos</b> y sube el multiplicador <b>×2, ×3… hasta ×5</b> (se pierde al caer la bola). ¡Todos los puntos siguientes valen más!</p>` },
  ],
};
