// Sonidos sintetizados con Web Audio (sin archivos) y vibración opcional.
import { ajustes } from './ajustes.js';
let ctx = null;
function tono(f, d, t0 = 0, tipo = 'sine', vol = 0.12) {
  const t = ctx.currentTime + t0, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + d + 0.02);
}
// Ruido filtrado (explosiones, disparos, chapuzones)
function ruido(d, t0 = 0, vol = 0.2, f0 = 1200, f1 = 120) {
  const t = ctx.currentTime + t0, n = Math.floor(ctx.sampleRate * d), b = ctx.createBuffer(1, n, ctx.sampleRate), c = b.getChannelData(0);
  for (let i = 0; i < n; i++) c[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = b; fl.type = 'lowpass'; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(fl).connect(g).connect(ctx.destination); s.start(t);
}
const S = {
  click: () => tono(520, 0.05, 0, 'triangle', 0.08),
  mover: () => { tono(300, 0.07, 0, 'triangle', 0.1); },
  captura: () => { tono(220, 0.09, 0, 'square', 0.07); tono(160, 0.12, 0.06, 'square', 0.07); },
  ok: () => { tono(660, 0.08); tono(880, 0.1, 0.07); },
  error: () => tono(180, 0.18, 0, 'sawtooth', 0.06),
  dado: () => { for (let i = 0; i < 4; i++) tono(240 + i * 35, 0.04, i * 0.07, 'square', 0.04); },
  ganar: () => [523, 659, 784, 1046].forEach((f, i) => tono(f, 0.18, i * 0.12, 'triangle', 0.12)),
  explosion: () => { ruido(0.7, 0, 0.35, 900, 60); tono(70, 0.4, 0, 'sine', 0.2); },
  disparo: () => { ruido(0.14, 0, 0.3, 4000, 400); tono(140, 0.1, 0, 'square', 0.06); },
  misil: () => { ruido(0.35, 0, 0.18, 2500, 300); tono(220, 0.25, 0, 'sawtooth', 0.04); },
  lanzar: () => { tono(260, 0.12, 0, 'triangle', 0.08); tono(180, 0.1, 0.05, 'triangle', 0.06); },
  salto: () => { tono(300, 0.06, 0, 'triangle', 0.08); tono(460, 0.09, 0.05, 'triangle', 0.08); },
  splash: () => ruido(0.45, 0, 0.22, 1800, 200),
  rebote: () => tono(150, 0.06, 0, 'square', 0.05),
  cuerda: () => { tono(700, 0.05, 0, 'square', 0.05); tono(420, 0.08, 0.04, 'triangle', 0.06); },
  tele: () => [880, 1320, 660, 1760].forEach((f, i) => tono(f, 0.1, i * 0.06, 'sine', 0.07)),
  bomba: () => { tono(900, 0.5, 0, 'sine', 0.05); tono(700, 0.5, 0.05, 'sine', 0.04); },
  avion: () => { tono(110, 0.7, 0, 'sawtooth', 0.05); tono(113, 0.7, 0, 'sawtooth', 0.04); },
  caja: () => { tono(660, 0.07, 0, 'triangle', 0.1); tono(990, 0.12, 0.07, 'triangle', 0.1); },
  tic: () => tono(1000, 0.03, 0, 'square', 0.04),
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
