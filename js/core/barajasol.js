// Descriptores de baraja para los Solitarios (Klondike, Spider y Carta Blanca): francesa (52 cartas, 13 rangos) o española (40 cartas, 10 rangos).
// Los motores leen S.baraja ('fr' | 'es') y usan estas funciones, así las mismas reglas valen para las dos barajas.
//   · id de carta: francesa palo*13 + rango (palos ♠ ♥ ♦ ♣) · española palo*10 + rango (oros, copas, espadas, bastos; rangos As,2…7,Sota,Caballo,Rey).
//   · «color» (para alternar en Klondike y Carta Blanca): francesa ♥♦ rojo, ♠♣ negro · española oros y copas un color, espadas y bastos el otro.
import { RANGOS, PALOS, PALOS_ES, asegurarSprites, cartaHTML, cartaEsHTML, nombreCarta, nombreEs } from './cartas.js';

const RANGOS_ESP = ['As', '2', '3', '4', '5', '6', '7', 'S', 'C', 'R'];
export const FR = {
  clave: 'fr', n: 13, total: 52, rey: 12,
  palo: id => id / 13 | 0, rango: id => id % 13, id: (p, r) => p * 13 + r,
  rojaPalo: p => p === 1 || p === 2, roja: id => { const p = id / 13 | 0; return p === 1 || p === 2; },
  simbolo: p => PALOS[p].s, nombre: id => RANGOS[id % 13] + PALOS[id / 13 | 0].s, nombreLargo: nombreCarta,
  html: cartaHTML, palosOpc: { 1: '♠', 2: '♠♥', 4: '♠♥♦♣' },
};
export const ES = {
  clave: 'es', n: 10, total: 40, rey: 9,
  palo: id => id / 10 | 0, rango: id => id % 10, id: (p, r) => p * 10 + r,
  rojaPalo: p => p < 2, roja: id => (id / 10 | 0) < 2,
  simbolo: p => ['🪙', '🍷', '🗡️', '🌿'][p], nombre: id => RANGOS_ESP[id % 10] + ['O', 'C', 'E', 'B'][id / 10 | 0], nombreLargo: nombreEs,
  html: cartaEsHTML, palosOpc: { 1: '🪙', 2: '🪙🍷', 4: '🪙🍷🗡️🌿' },
};
export const BARAJA = { fr: FR, es: ES };
export const de = S => (S && S.baraja === 'es' ? ES : FR);
export const claveValida = b => (b === 'es' ? 'es' : 'fr');
export { PALOS_ES };

// ¿Qué familia de baraja hay elegida en Apariencia? ('fr' | 'es')
export const familiaDe = asp => (/^esp/.test((asp && asp.valores && asp.valores.barajasol) || '') ? 'es' : 'fr');
export const asegurar = () => asegurarSprites();
