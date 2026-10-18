// Sonidos sintetizados con Web Audio (sin archivos) y vibración opcional.
import { ajustes } from './ajustes.js';
let ctx = null;
function tono(f, d, t0 = 0, tipo = 'sine', vol = 0.12) {
  const t = ctx.currentTime + t0, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + d + 0.02);
}
const S = {
  click: () => tono(520, 0.05, 0, 'triangle', 0.08),
  mover: () => { tono(300, 0.07, 0, 'triangle', 0.1); },
  captura: () => { tono(220, 0.09, 0, 'square', 0.07); tono(160, 0.12, 0.06, 'square', 0.07); },
  ok: () => { tono(660, 0.08); tono(880, 0.1, 0.07); },
  error: () => tono(180, 0.18, 0, 'sawtooth', 0.06),
  dado: () => { for (let i = 0; i < 4; i++) tono(240 + i * 35, 0.04, i * 0.07, 'square', 0.04); },
  ganar: () => [523, 659, 784, 1046].forEach((f, i) => tono(f, 0.18, i * 0.12, 'triangle', 0.12)),
  perder: () => [392, 330, 262].forEach((f, i) => tono(f, 0.22, i * 0.15, 'triangle', 0.1)),
};
export function play(nombre) {
  if (!ajustes().sonido || !S[nombre]) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    S[nombre]();
  } catch { /* sin audio */ }
}
export function vibrar(ms) { if (ajustes().vibracion && navigator.vibrate) { try { navigator.vibrate(ms); } catch { /* ignorar */ } } }
