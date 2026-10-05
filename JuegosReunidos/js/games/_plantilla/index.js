// PLANTILLA DE JUEGO — copia esta carpeta (js/games/_plantilla → js/games/<tu-id>), renombra y rellena.
// Después añade una línea en js/registry.js. Guía completa: docs/AÑADIR-JUEGO.md
//
// El módulo exporta (con nombre) estas funciones, que app.js llama:
//   mount(root, api)  pinta el juego dentro de `root`. Puede ser async.
//   unmount()         limpia temporizadores y listeners (se llama al salir del juego).
//   validar(datos)    devuelve los datos normalizados si son válidos, o null. Se usa al cargar y al importar copias.
//   migrarV1(seccion) solo para juegos que existían en la versión 1; en juegos nuevos: `export const migrarV1 = d => d;`
//   resumen(datos)    { texto: 'Medio · 32/81', fin: false } → se muestra en la ficha de Inicio.
//
// El objeto `api` ofrece:
//   api.cargar()                 datos guardados ya validados (o null)
//   api.guardar(datos, resumen, fin)   guarda la partida (llámalo tras cada cambio)
//   api.borrar()                 borra la partida guardada
//   api.registrar({res, tiempo, variante, limpio})   estadísticas: res = 'victoria'|'derrota'|'tablas'|'partida'
//   api.pref(k, def) / api.setPref(k, v)             preferencias propias del juego
//   api.sonido('click'|'mover'|'captura'|'ok'|'error'|'dado'|'ganar'|'perder'), api.vibrar(ms | [ms, ms…])
//   api.confirmar(texto) → boolean, api.aviso(texto), api.modal(titulo, html)
//   api.menu([{ texto, accion, peligro?, activo? }])  entradas del menú «⋯» de la cabecera
//   api.css(url)                 carga la hoja de estilos del juego: await api.css(new URL('./mi.css', import.meta.url))
//   api.titulo(texto)            cambia el título de la cabecera
import { $ } from '../../core/dom.js';

let api = null, datos = null, root = null;

export function validar(d) {
  if (!d || typeof d !== 'object' || !Number.isInteger(d.n) || d.n < 0) return null;
  return { n: d.n };
}
export const migrarV1 = d => d;
export const resumen = d => ({ texto: `${d.n} pulsaciones`, fin: false });

export async function mount(r, a) {
  api = a; root = r;
  datos = api.cargar() || { n: 0 };
  root.innerHTML = `<p class="msg" id="plMsg"></p><div class="bar"><button class="btn on" id="plBtn">Pulsar</button></div>`;
  root.addEventListener('click', clic);
  api.menu([{ texto: 'Reiniciar', accion: reiniciar, peligro: true }]);
  pintar();
}
export function unmount() { if (root) root.removeEventListener('click', clic); root = null; }

function clic(e) { if (e.target.id === 'plBtn') { datos.n++; api.sonido('click'); pintar(); guardar(); } }
function reiniciar() { if (api.confirmar('¿Reiniciar?')) { datos = { n: 0 }; pintar(); guardar(); } }
function guardar() { const r = resumen(datos); api.guardar(datos, r.texto, r.fin); }
function pintar() { $('#plMsg').textContent = `Llevas ${datos.n}.`; }
