// Base compartida de juegos de cartas (BlackJack, Klondike, Texas Hold'em…).
// Una carta es un entero 0..51: palo = id / 13 | 0 (0 ♠, 1 ♥, 2 ♦, 3 ♣), rango = id % 13 (0 = As … 12 = K).
// Las cartas se dibujan con HTML/CSS (css/cartas.css, se carga con api.css()).
import { shuffle } from './dom.js';

export const PALOS = [{ s: '♠', n: 'picas' }, { s: '♥', n: 'corazones' }, { s: '♦', n: 'diamantes' }, { s: '♣', n: 'tréboles' }];
export const RANGOS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const paloDe = id => id / 13 | 0;
export const rangoDe = id => id % 13;
export const esRoja = id => { const p = paloDe(id); return p === 1 || p === 2; };
export const nombreCarta = id => `${RANGOS[rangoDe(id)]} de ${PALOS[paloDe(id)].n}`;
export const nuevaBaraja = (mazos = 1) => Array.from({ length: 52 * mazos }, (_, i) => i % 52);
export const barajar = a => shuffle(a);
export function cartaHTML(id, { oculta = false, clase = '', estilo = '' } = {}) {
  if (oculta) return `<div class="carta dorso ${clase}" style="${estilo}" aria-label="Carta boca abajo"></div>`;
  const p = paloDe(id), r = RANGOS[rangoDe(id)], s = PALOS[p].s;
  return `<div class="carta p${p} ${clase}" data-k="${claveFr(id)}" style="${estilo}" aria-label="${nombreCarta(id)}"><b class="cr">${r}</b><i class="cs">${s}</i><span class="cc">${s}</span></div>`;
}

/* ---------- baraja española (40 cartas) ----------
   id = palo * 10 + posición; palos: 0 oros, 1 copas, 2 espadas, 3 bastos; posiciones 0..9 = 1,2,3,4,5,6,7,sota(10),caballo(11),rey(12). */
export const PALOS_ES = ['oros', 'copas', 'espadas', 'bastos'];
export const RANGOS_ES = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
export const paloEs = id => id / 10 | 0;
export const rangoEs = id => RANGOS_ES[id % 10];
export const nombreEs = id => { const r = rangoEs(id); return `${r === 10 ? 'Sota' : r === 11 ? 'Caballo' : r === 12 ? 'Rey' : r === 1 ? 'As' : r} de ${PALOS_ES[paloEs(id)]}`; };
export const nuevaBarajaEs = () => Array.from({ length: 40 }, (_, i) => i);
const SPRITES = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="es-0" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#F2B600" stroke="#8A5A00" stroke-width="1.5"/><circle cx="12" cy="12" r="6.2" fill="none" stroke="#8A5A00" stroke-width="1.2"/><circle cx="12" cy="12" r="2.2" fill="#8A5A00"/></symbol>
<symbol id="es-1" viewBox="0 0 24 24"><path d="M5 2.5h14c0 7.5-2.5 11.5-7 11.5S5 10 5 2.5z" fill="#E0243A" stroke="#7A0F1E" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 14v6M7 21.5h10" stroke="#7A0F1E" stroke-width="2.2" stroke-linecap="round" fill="none"/></symbol>
<symbol id="es-2" viewBox="0 0 24 24"><path d="M12 1l3.2 12H8.8z" fill="#A9BEEF" stroke="#1B2D6B" stroke-width="1.3" stroke-linejoin="round"/><path d="M6.5 13.2h11M12 13.2v7.3" stroke="#1B2D6B" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="22" r="1.6" fill="#1B2D6B"/></symbol>
<symbol id="es-3" viewBox="0 0 24 24"><path d="M9.2 2c-2.2 0-3.7 2.2-3.2 4.3L8.6 20c.3 1.5 1.4 2.2 3.4 2.2s3.1-.7 3.4-2.2L18 6.3C18.5 4.2 17 2 14.8 2z" fill="#3FAE6A" stroke="#14653A" stroke-width="1.4"/><circle cx="10" cy="8.5" r="1.1" fill="#14653A"/><circle cx="14" cy="13" r="1.1" fill="#14653A"/><circle cx="11" cy="17" r="1" fill="#14653A"/></symbol>
</defs></svg>`;
export function asegurarSprites() { if (typeof document !== 'undefined' && !document.getElementById('es-sprites')) { const d = document.createElement('div'); d.id = 'es-sprites'; d.innerHTML = SPRITES; document.body.appendChild(d); } }
const PIPS = { 1: [[50, 56, 1.9]], 2: [[50, 34], [50, 80]], 3: [[50, 30], [50, 56], [50, 82]], 4: [[36, 36], [66, 36], [36, 80], [66, 80]], 5: [[36, 34], [66, 34], [51, 57], [36, 82], [66, 82]], 6: [[36, 34], [66, 34], [36, 58], [66, 58], [36, 82], [66, 82]], 7: [[36, 34], [66, 34], [51, 46], [36, 58], [66, 58], [36, 82], [66, 82]] };
export function cartaEsHTML(id, { oculta = false, clase = '', estilo = '' } = {}) {
  if (oculta) return `<div class="carta es dorso ${clase}" style="${estilo}" aria-label="Carta boca abajo"></div>`;
  const p = paloEs(id), r = rangoEs(id), sim = r === 10 ? 'S' : r === 11 ? 'C' : r === 12 ? 'R' : r, ico = (x, y, k = 1) => `<svg class="pip" viewBox="0 0 24 24" style="left:${x}%;top:${y}%;--k:${k}"><use href="#es-${p}"/></svg>`;
  const centro = r <= 7 ? PIPS[r].map(([x, y, k]) => ico(x, y, k || 1)).join('') : `<span class="fig">${sim}</span>${ico(50, 74, 1.3)}`;
  return `<div class="carta es e${p} ${clase}" data-k="${claveEs(id)}" style="${estilo}" aria-label="${nombreEs(id)}"><b class="cr">${sim}</b><svg class="mini" viewBox="0 0 24 24"><use href="#es-${p}"/></svg>${centro}</div>`;
}

/* ---------- barajas y dorsos de imagen (carpeta img/cartas) ----------
   El índice img/cartas/barajas.json lo genera tools/generar_barajas.py (GitHub Actions lo ejecuta al subir imágenes).
   Aquí se carga una vez y se inyecta una hoja de estilos con una regla por carta; los juegos no cambian su HTML:
   la opción elegida en 🎨 Apariencia llega como data-barajaes / data-barajafr / data-dorso en el contenedor del juego. */
const ESP_L = ['O', 'C', 'E', 'B'], FR_L = ['P', 'C', 'D', 'T'];
const n2 = n => String(n).padStart(2, '0');
const claveEs = id => ESP_L[paloEs(id)] + n2(rangoEs(id));
const claveFr = id => FR_L[paloDe(id)] + n2(rangoDe(id) + 1);
export const BARAJAS = { espanola: [], francesa: [], dorsos: [] };
const RAIZ_IMG = new URL('../../img/cartas/', import.meta.url);
const EXT_OK = ['webp', 'png', 'jpg', 'jpeg'];
const ID_OK = /^[a-z0-9-]{1,40}$/;
const rutaOk = r => typeof r === 'string' && r.length < 200 && !r.includes('..') && !r.startsWith('/') && !/[\\"<>]/.test(r);
const urlImg = r => new URL(r.split('/').map(encodeURIComponent).join('/'), RAIZ_IMG).href;
export const urlCarta = (b, clave) => urlImg(`${b.ruta}/${clave.slice(1)}-${clave[0]}.${b.ext}`);
export const urlMuestra = b => urlImg(`${b.ruta}/${b.muestra}.${b.ext}`);
export const urlDorso = d => urlImg(d.archivo);

function cssBarajas() {
  const r = [], ESP = 'background-size:100% 100%', RAD = 'border-radius:calc(var(--cw) * .09)';
  for (const b of BARAJAS.espanola) {
    const sel = `.juego[data-barajaes="${b.id}"]`;
    for (const rg of RANGOS_ES) for (const l of ESP_L) r.push(`${sel} .carta.es[data-k="${l}${n2(rg)}"]{background-image:url("${urlCarta(b, l + n2(rg))}")}`);
  }
  for (const b of BARAJAS.francesa) {
    const sel = `.juego[data-barajafr="${b.id}"]`;
    for (let rg = 1; rg <= 13; rg++) for (const l of FR_L) r.push(`${sel} .carta:not(.es)[data-k="${l}${n2(rg)}"]{background-image:url("${urlCarta(b, l + n2(rg))}")}`);
    if (b.joker) r.push(`${sel} .carta.comodin{background:url("${urlImg(`${b.ruta}/00.${b.ext}`)}") center/100% 100% no-repeat;border:0;${RAD}}${sel} .carta.comodin>*{display:none}`);
  }
  for (const d of BARAJAS.dorsos) r.push(`.juego[data-dorso="${d.id}"] .carta.dorso{background:#fff url("${urlDorso(d)}") center/cover no-repeat;border:0;${RAD}}`);
  return r.join('\n');
}
const limpiar = (lista, tipo) => (Array.isArray(lista) ? lista : []).filter(x => x && ID_OK.test(x.id) && typeof x.nombre === 'string'
  && (tipo === 'dorso' ? rutaOk(x.archivo) && EXT_OK.includes(String(x.archivo).split('.').pop()) : rutaOk(x.ruta) && rutaOk(x.muestra) && EXT_OK.includes(x.ext)));

let promesa = null;
export function cargarBarajas() {
  if (!promesa) promesa = (async () => {
    try {
      const r = await fetch(new URL('barajas.json', RAIZ_IMG));
      if (!r.ok) throw new Error('barajas.json ' + r.status);
      const d = await r.json();
      BARAJAS.espanola = limpiar(d.espanola); BARAJAS.francesa = limpiar(d.francesa); BARAJAS.dorsos = limpiar(d.dorsos, 'dorso');
      let st = document.getElementById('cartas-img-css');
      if (!st) { st = document.createElement('style'); st.id = 'cartas-img-css'; document.head.appendChild(st); }
      st.textContent = cssBarajas();
    } catch (e) { console.warn('Sin barajas de imagen:', e && e.message); promesa = null; }   // se reintenta al abrir otro juego
    return BARAJAS;
  })();
  return promesa;
}

// Descarga de antemano las imágenes elegidas (así quedan en la caché sin conexión y no parpadean al repartir).
const precargadas = new Set();
export function precargarSeleccion(vals) {
  const lanzar = u => { if (!precargadas.has(u)) { precargadas.add(u); new Image().src = u; } };
  const b = (vals.barajaes && BARAJAS.espanola.find(x => x.id === vals.barajaes)) || (vals.barajafr && BARAJAS.francesa.find(x => x.id === vals.barajafr));
  if (b) {
    const es = BARAJAS.espanola.includes(b);
    if (es) RANGOS_ES.forEach(rg => ESP_L.forEach(l => lanzar(urlCarta(b, l + n2(rg)))));
    else for (let rg = 1; rg <= 13; rg++) FR_L.forEach(l => lanzar(urlCarta(b, l + n2(rg))));
  }
  const d = vals.dorso && BARAJAS.dorsos.find(x => x.id === vals.dorso); if (d) lanzar(urlDorso(d));
}
