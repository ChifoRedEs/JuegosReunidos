// Voz del móvil o del navegador (Web Speech, speechSynthesis): no descarga nada y puede funcionar sin conexión si el dispositivo
// tiene una voz española instalada (se prefieren las voces locales, que no necesitan internet).
const hay = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
let lista = [], avisada = false;
function cargarVoces() { if (!hay()) return; try { lista = speechSynthesis.getVoices() || []; } catch { lista = []; } }
if (hay()) { cargarVoces(); try { speechSynthesis.addEventListener('voiceschanged', cargarVoces); } catch { /* nada */ } }
export function elegirVoz() {
  cargarVoces(); const es = lista.filter(v => /^es([-_]|$)/i.test(v.lang));
  return es.find(v => v.localService && /es[-_]ES/i.test(v.lang)) || es.find(v => v.localService) || es.find(v => /es[-_]ES/i.test(v.lang)) || es[0] || null;
}
// { hay: ¿se puede hablar?, local: ¿la voz funciona sin conexión?, nombre }
export function estadoVoz() { if (!hay()) return { hay: false, local: false, nombre: '' }; const v = elegirVoz(); return { hay: true, local: !!(v && v.localService), nombre: v ? v.name : '' }; }
let token = 0;
export function parar() { token++; if (hay()) { try { speechSynthesis.cancel(); } catch { /* nada */ } } }
// Dice el texto y devuelve una promesa que se cumple al terminar (o a los 12 s como mucho). Si no hay voz, se cumple enseguida con false.
export function hablar(texto, { vel = .95, vol = 1, tono = 1 } = {}) {
  if (!hay() || !texto) return Promise.resolve(false);
  const mio = ++token;
  return new Promise(res => {
    let fin = false; const acabar = ok => { if (!fin) { fin = true; clearTimeout(t); res(ok); } };
    const t = setTimeout(() => acabar(false), 12000);
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(texto); u.lang = 'es-ES'; u.rate = vel; u.volume = vol; u.pitch = tono;
      const v = elegirVoz(); if (v) u.voice = v;
      u.onend = () => acabar(mio === token); u.onerror = () => acabar(false);
      speechSynthesis.speak(u);
    } catch { acabar(false); }
  });
}
export const avisoSinVoz = () => { if (avisada) return false; avisada = true; return true; };
