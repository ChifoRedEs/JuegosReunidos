// Base para juegos de cartas (BlackJack, Póker, Klondike, Brisca…). Se ampliará con esos juegos.
// Las cartas se dibujan con HTML/CSS (sin imágenes). Estilos en css/cartas.css (se carga con api.css()).
import { shuffle } from './dom.js';

export const PALOS_FR = [{ id: 'P', s: '♠', rojo: false }, { id: 'C', s: '♥', rojo: true }, { id: 'D', s: '♦', rojo: true }, { id: 'T', s: '♣', rojo: false }];
export const VALORES_FR = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const PALOS_ES = [{ id: 'o', s: '🪙', rojo: false }, { id: 'c', s: '🍷', rojo: true }, { id: 'e', s: '⚔️', rojo: false }, { id: 'b', s: '🪵', rojo: false }];
export const VALORES_ES = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

export function baraja(tipo = 'francesa', mazos = 1) {
  const palos = tipo === 'espanola' ? PALOS_ES : PALOS_FR, vals = tipo === 'espanola' ? VALORES_ES : VALORES_FR, out = [];
  for (let m = 0; m < mazos; m++) for (const p of palos) for (const v of vals) out.push({ palo: p.id, v, rojo: p.rojo, s: p.s });
  return out;
}
export const barajar = shuffle;
export function cartaHTML(c, { oculta = false, extra = '' } = {}) {
  if (oculta) return `<div class="carta dorso ${extra}" aria-label="Carta boca abajo"></div>`;
  return `<div class="carta ${c.rojo ? 'rojo' : ''} ${extra}" aria-label="${c.v} ${c.s}"><span class="cv">${c.v}</span><span class="cp">${c.s}</span></div>`;
}
