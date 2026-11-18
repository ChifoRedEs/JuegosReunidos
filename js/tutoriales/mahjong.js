// Tutorial de Mahjong solitario
const IMG = new URL('../../img/mahjong/', import.meta.url).href;
// Ejercicio: una fila de 6 fichas. Solo las de los extremos están libres: hay que ir quitando parejas de fuera hacia dentro.
const FILA = ['cir-1', 'bam-5', 'dra-r', 'dra-r', 'bam-5', 'cir-1'];
function fila(z, ctx) {
  const vivo = FILA.map(() => true); let sel = -1;
  z.innerHTML = '<div style="display:flex;justify-content:center;gap:2px;margin:10px 0" id="mjtt">' + FILA.map((f, i) => `<button type="button" data-i="${i}" style="width:48px;height:66px;border:0;padding:0;background:url('${IMG}${f}.webp') center/100% 100% no-repeat transparent;cursor:pointer;transition:filter .15s,transform .15s"></button>`).join('') + '</div>';
  const bt = [...z.querySelectorAll('button')];
  const libre = i => { let izq = false, der = false; for (let j = i - 1; j >= 0; j--) if (vivo[j]) { izq = true; break; } for (let j = i + 1; j < vivo.length; j++) if (vivo[j]) { der = true; break; } return !(izq && der); };
  const pinta = () => { bt.forEach((b, k) => { b.hidden = !vivo[k]; b.style.filter = libre(k) ? '' : 'brightness(.8)'; b.style.transform = k === sel ? 'translateY(-4px)' : ''; }); if (!vivo.some(Boolean)) ctx.ok('✅ ¡Fila despejada!'); else ctx.info(''); };
  bt.forEach((b, i) => { b.onclick = () => {
    if (!vivo[i]) return;
    if (!libre(i)) { ctx.mal('❌ Esa ficha está atrapada: tiene fichas a los dos lados. Empieza por los extremos.'); return; }
    if (sel < 0) { sel = i; pinta(); return; }
    if (sel === i) { sel = -1; pinta(); return; }
    if (FILA[sel] === FILA[i]) { vivo[sel] = vivo[i] = false; sel = -1; pinta(); } else { ctx.mal('❌ No son iguales. Busca una pareja idéntica entre las fichas libres.'); sel = -1; pinta(); }
  }; });
  pinta();
  return { ver: () => { vivo.fill(false); sel = -1; pinta(); } };
}
export const TUTORIAL = {
  titulo: 'Mahjong',
  pasos: [
    { t: 'El objetivo', h: `<p>Tienes un montón de fichas apiladas. Tu misión es <b>quitar todas</b> emparejándolas de dos en dos: solo se pueden quitar <b>dos fichas iguales</b>.</p><p>Hay fichas de círculos, bambúes y caracteres (del 1 al 9), vientos, dragones, <b>flores</b> y <b>estaciones</b>. Las 4 flores se pueden emparejar entre sí aunque sean distintas, y las 4 estaciones también.</p>` },
    { t: 'Fichas libres', h: `<p>No vale cualquier ficha. Una ficha está <b>libre</b> si:</p><ul><li>no tiene <b>ninguna ficha encima</b>, y</li><li>tiene <b>libre su lado izquierdo o su lado derecho</b>.</li></ul><p>Las fichas atrapadas se ven <b>más oscuras</b>. Cuando quitas una pareja, se liberan las que había debajo o al lado.</p>` },
    { t: 'Ejercicio: una fila', h: `<p>En esta fila solo las dos de los extremos están libres. Toca una y después su pareja igual: así se van abriendo las demás, de fuera hacia dentro.</p>`, req: true, demo: fila },
    { t: 'Trucos y ayudas', h: `<ul><li>Piensa antes de quitar: da prioridad a las fichas de <b>arriba del todo</b> y a las que tapan muchas otras.</li><li>Si hay varias fichas iguales, quita primero las que <b>liberan más fichas</b>.</li><li>💡 <b>Pista</b> te enseña una jugada, ↶ <b>Deshacer</b> devuelve la última pareja y 🔀 <b>Mezclar</b> reparte de nuevo las fichas que quedan (siempre con solución).</li></ul>` },
  ],
};
