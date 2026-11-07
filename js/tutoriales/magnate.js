import { elige, fila } from '../core/tutorial.js';
// Tutorial de Magnate Urbano
export const TUTORIAL = {
  titulo: 'Magnate Urbano',
  pasos: [
    { t: 'El objetivo', h: `<p>Compra solares de la ciudad, levanta edificios y cobra rentas hasta que <b>todos los demás quiebren</b>.</p><p>En tu turno: tiras los dados 🎲, avanzas y actúas según la casilla.</p>` },
    { t: 'Comprar o subastar', h: `<p>Si caes en una propiedad libre, puedes <b>comprarla</b>. Si no la compras, sale a <b>subasta</b> y la puede comprar cualquiera. Si ya es de otro, le pagas una <b>renta</b>.</p>` },
    { t: 'Prueba: ¿qué hago?', h: `<p>Caes en un solar libre que cuesta 160M y tienes 500M. ¿Qué es lo más razonable?</p>`, req: true,
      demo(z, ctx) { return elige(z, [{ h: 'Comprarlo: así cobraré renta a los demás', ok: 1, por: '✅ Tienes dinero de sobra: comprar te da rentas futuras.' }, { h: 'Dejar que se subaste siempre', por: '❌ Es una opción, pero pierdes la ventaja de elegir.' }], ctx); } },
    { t: 'Sectores y edificios', h: `<p>Si juntas <b>todos los solares de un sector</b>, puedes construir. Se empieza con <b>oficinas</b> (hasta 4) y luego una <b>sede central</b>. Cada mejora sube mucho la renta.</p>` },
    { t: 'Dinero y trucos', h: `<ul><li>Cada vuelta, la <b>Ronda de Inversión</b> te paga <b>220M</b>.</li><li>Las <b>Noticias</b> y <b>Tendencias</b> traen sorpresas buenas y malas.</li><li>Una <b>Auditoría Fiscal</b> puede enviarte a revisión: puedes pagar la fianza de 60M.</li><li>Los <b>dobles</b> repiten turno.</li><li>Puedes <b>hipotecar</b> propiedades para conseguir efectivo o hacer 🤝 <b>tratos</b> con otros jugadores.</li></ul>` },
  ],
};
