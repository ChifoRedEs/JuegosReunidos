// Sustituye en pantalla ciertos emojis por iconos ilustrados (conserva el texto original, solo lo oculta).
const MAPA = {
  estrella: '⭐', corazon: '❤️❤', 'corazon-roto': '💔', crono: '⏱️⏱⏲️', trofeo: '🏆', moneda: '🪙', candado: '🔒', 'candado-abierto': '🔓', papelera: '🗑️🗑', lapiz: '✏️✏', escoba: '🧹',
  grafico: '📊', disquete: '💾', repetir: '🔁🔄', mezclar: '🔀', apreton: '🤝', robot: '🤖', jugadores: '👥', calendario: '📅', mundo: '🌍🌎', cartas: '🃏', dados: '🎲',
  'check': '✅✔',
  'x': '❌✖',
  'flecha': '➡',
  'flecha-arriba': '⬆',
  'pregunta': '❓',
  'abaco': '🧮',
  'altavoz': '🔊🔉🔈',
  'arena': '⏳⌛',
  'banco': '🏦',
  'bolsa-dinero': '💰',
  'bomba': '💣',
  'burbuja': '💬',
  'cara-feliz': '😀😃😄',
  'cara-sonrisa': '🙂😊',
  'cara-triste': '😢☹😞',
  'cara-sorpresa': '😮😲',
  'cara-pensando': '🤔',
  'cara-decepcion': '😕😔',
  'cerebro': '🧠',
  'cesta': '🧺',
  'corazon-vacio': '🤍',
  'corona': '👑',
  'cuadro': '🖼',
  'destellos': '✨',
  'diana': '🎯',
  'explosion': '💥',
  'exportar': '📤',
  'importar': '📥',
  'historial': '📜',
  'joystick': '🕹',
  'maletin': '💼',
  'mapa': '🗺',
  'mazo-subasta': '🔨',
  'megafono': '📣📢',
  'meta': '🏁',
  'micro': '🎤',
  'ojos': '👀',
  'pasar': '⏭',
  'pin': '📍',
  'portapapeles': '📋',
  'pulgar': '👍',
  'rendirse': '🏳',
  'salida': '🚪',
  'saltar': '⏩',
  'tutorial': '🎓',
  'toque': '👆👉',
  'viento': '💨',
  'zoom': '🔍🔎',
  'gema': '💎',
  'ap-abc': '🔤',
  'ap-brujula': '🧭',
  'ap-cadena': '🔗',
  'ap-caja': '📦',
  'ap-camiseta': '👕',
  'ap-escuadra': '📐',
  'ap-ladrillo': '🧱',
  'ap-libros': '📚',
  'ap-madera': '🪵',
  'ap-num': '🔢',
  'ap-paisaje': '🏞',
  'ap-pajaro': '🐦',
  'ap-persona': '🧑',
  'ap-piedra': '🪨',
  'ap-puzzle': '🧩',
  'ap-prohibido': '🚫',
  'ap-isla': '🏝',
  'ap-guitarra': '🎸',
  'ap-herramientas': '🧰',
  'ap-tren': '🚆',
  'ap-carta-dorso': '🎴',
  'ap-mj-dragon': '🀄',
  'ic-historia': '🏛',
  'ic-ciencia': '🔬',
  'ic-teatro': '🎭',
  'ic-arte': '🎨',
  'ic-deporte': '⚽',
  'pz-deshacer': '↶',
  'pz-rehacer': '↷',
  'pz-goma': '⌫',
  'pz-varita': '🪄',
  'pz-notas': '📝',
  'pz-pluma': '✒',
  'ob-cohete': '🚀',
  'ob-pizza': '🍕',
  'ob-hamburguesa': '🍔',
  'ob-baloncesto': '🏀',
  'ob-donut': '🍩',
  'ob-helado': '🍦',
  'ob-tenis': '🎾',
  'ob-planeta': '🪐',
  'ob-luna': '🌙',
  'ob-estrella-fugaz': '🌠',
  'ob-platillo': '🛸',
  'ob-llave': '🔑',
  'ob-libro': '📖',
  'ob-mochila': '🎒',
  'ob-camara': '📷',
  'ob-ancla': '⚓',
  'ob-tienda': '⛺',
  'ob-cofre': '🧳',
  'an-perro': '🐶🐕',
  'an-gato': '🐱🐈',
  'an-caballo': '🐴',
  'an-cerdo': '🐷',
  'an-delfin': '🐬',
  'an-tortuga': '🐢',
  'an-leon': '🦁',
  'an-tigre': '🐯',
  'an-jirafa': '🦒',
  'an-aguila': '🦅',
  aviso: '⚠️⚠', llama: '🔥', rayo: '⚡', ojo: '👁️👁', bombilla: '💡', medalla: '🏅'
};
const NOM = {}; let re = '';
for (const [n, gs] of Object.entries(MAPA)) for (const g of [...gs.replace(/️/g, '')]) { NOM[g] = n; re += g.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&') + '|'; }
const RX = new RegExp(`(${re.slice(0, -1)})\\uFE0F?`, 'gu');
const SALTAR = /^(SCRIPT|STYLE|TEXTAREA|INPUT|SELECT|OPTION|TITLE|CANVAS|NOSCRIPT)$/;
function ok(n) { for (let p = n.parentElement; p; p = p.parentElement) { if (SALTAR.test(p.tagName) || p.classList.contains('emo') || p.hasAttribute('data-noemo') || p.namespaceURI !== 'http://www.w3.org/1999/xhtml') return false; } return true; }
function nodo(t) {
  const s = t.nodeValue; RX.lastIndex = 0; if (!RX.test(s)) return; RX.lastIndex = 0;
  const fr = document.createDocumentFragment(); let u = 0, m;
  while ((m = RX.exec(s))) {
    if (m.index > u) fr.append(s.slice(u, m.index));
    const e = document.createElement('span'); e.className = 'emo'; e.dataset.i = NOM[m[1]]; e.textContent = m[0]; fr.append(e); u = m.index + m[0].length;
  }
  if (u < s.length) fr.append(s.slice(u));
  t.replaceWith(fr);
}
function barrer(r) {
  if (r.nodeType === 3) { if (ok(r)) nodo(r); return; }
  if (r.nodeType !== 1) return;
  const w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT), l = []; for (let n = w.nextNode(); n; n = w.nextNode()) if (ok(n)) l.push(n);
  l.forEach(nodo);
}
let cola = new Set(), prog = false;
function vaciar() { prog = false; const c = cola; cola = new Set(); for (const n of c) if (n.isConnected) barrer(n); }
export function iniciarIconos() {
  if (window.__emo) return; window.__emo = true;
  barrer(document.body);
  new MutationObserver(ms => {
    for (const m of ms) { if (m.type === 'characterData') cola.add(m.target); else m.addedNodes.forEach(n => cola.add(n)); }
    if (!prog) { prog = true; requestAnimationFrame(vaciar); }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}
