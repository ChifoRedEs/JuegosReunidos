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
  return `<div class="carta p${p} ${clase}" style="${estilo}" aria-label="${nombreCarta(id)}"><b class="cr">${r}</b><i class="cs">${s}</i><span class="cc">${s}</span></div>`;
}
