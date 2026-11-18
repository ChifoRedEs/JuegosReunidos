// Tutorial de Dale Otra Vez
const IMG = new URL('../../img/daleotravez/', import.meta.url).href;
// Ejercicio: el tema es «Frutas»; ya se dijeron pera y manzana. Hay que elegir la única respuesta que vale.
const OPC = [['pera', 'repe'], ['coche', 'fuera'], ['fresa', 'ok'], ['manzana', 'repe']];
function ejercicio(z, ctx) {
  z.innerHTML = `<div style="text-align:center;margin:8px 0"><img src="${IMG}t-frutas.webp" alt="" width="64" height="64"><p style="margin:2px 0"><b>Tema: Frutas</b></p><p class="mut" style="margin:2px 0">Ya se dijeron: <b>manzana</b> (rival) y <b>pera</b> (tú). Es tu turno.</p>
    <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:8px">${OPC.map(([t], i) => `<button type="button" class="btn" data-i="${i}">${t}</button>`).join('')}</div></div>`;
  z.querySelectorAll('button').forEach(b => { b.onclick = () => {
    const [t, k] = OPC[+b.dataset.i];
    if (k === 'ok') ctx.ok('✅ ¡Correcto! «fresa» es una fruta y nadie la había dicho.');
    else if (k === 'repe') ctx.mal(`❌ «${t}» ya se dijo: repetir hace perder la ronda.`);
    else ctx.mal('❌ «coche» no es una fruta. Una respuesta de otro tema también hace perder la ronda.');
  }; });
  return { ver: () => ctx.ok('✅ «fresa»: es una fruta y no se había dicho.') };
}
export const TUTORIAL = {
  titulo: 'Dale Otra Vez',
  pasos: [
    { t: 'El concurso', h: `<p>Sale un <b>tema</b> (frutas, países, deportes…) y tú y tu rival os turnáis para decir <b>una respuesta</b> de ese tema, sin parar.</p><p>Gana la ronda quien aguante más. El concurso se juega <b>al mejor de 3, 5 o 7 rondas</b>.</p>` },
    { t: 'Cuándo pierdes la ronda', h: `<ul><li>Si <b>repites</b> una respuesta que ya se dijo.</li><li>Si <b>se acaba el tiempo</b> (la barra verde se vacía y se pone roja).</li><li>Si dices algo que <b>no es del tema</b>.</li></ul>` },
    { t: 'Ejercicio', h: `<p>Elige la respuesta correcta: tiene que ser del tema y no haberse dicho todavía.</p>`, req: true, demo: ejercicio },
    { t: '«Otra vez» y consejos', h: `<ul><li>Si escribes algo que la app no reconoce, tienes <b>2 «Otra vez»</b> por ronda: no pierdes, pero debes probar de nuevo.</li><li>Valen plurales, sinónimos habituales y una letra mal escrita.</li><li>Empieza por lo más común; deja las respuestas raras para cuando el rival se quede sin ideas.</li></ul>` },
  ],
};
