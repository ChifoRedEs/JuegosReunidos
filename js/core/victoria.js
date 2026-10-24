// Celebración al ganar una partida (común a todos los juegos, actuales y futuros).
// La app la lanza sola cuando un juego llama a api.registrar({ res: 'victoria' }): un mensaje y una animación al azar
// y, debajo, el botón «Nueva partida». Los juegos nuevos no tienen que hacer nada.
// Las animaciones están en img/victoria/*.webp (los GIF originales, recomprimidos). Para añadir una: copia el .webp
// a esa carpeta y apúntala en ANIMACIONES.

const MENSAJES = ['¡Enhorabuena!', '¡Felicidades!', '¡Victoria!', '¡Ganas la partida!', '¡Lo has conseguido!', '¡Bien jugado!', '¡Eres un campeón!',
  '¡Brillante!', '¡Magistral!', '¡Excelente!', '¡Qué pasada!', '¡Imparable!', '¡Todo un maestro!', '¡Has ganado!', '¡Genial!', '¡Primer puesto!'];
const SUBTITULOS = ['Una partida para recordar', 'Se nota la práctica', 'Así se hace', 'Merece una celebración', 'Otra más para la colección', 'Jugada de campeón'];

// img = animación (webp) · fondo = degradado de la ventana · efecto = capa extra sobre toda la pantalla · alto = alto de la ventana (px)
const ANIMACIONES = [
  { img: 'fuegos-1.webp', fondo: '#05060f', efecto: null },
  { img: 'fuegos-2.webp', fondo: '#05060f', efecto: null },
  { img: 'confeti-1.webp', fondo: 'linear-gradient(160deg,#5b3fd1,#e0508f)', efecto: 'confeti' },
  { img: 'confeti-2.webp', fondo: 'linear-gradient(160deg,#1f7ae0,#25b8a0)', efecto: 'confeti' },
  { img: 'globos-1.webp', fondo: 'linear-gradient(180deg,#78c4ff,#d9f0ff)', efecto: null },
  { img: 'globos-2.webp', fondo: 'linear-gradient(180deg,#ffb38a,#ffe3c9)', efecto: null },
  { img: 'monedas.webp', fondo: 'linear-gradient(180deg,#1b1450,#4a2a8a)', efecto: ['🪙'] },
  { img: 'trofeo.webp', fondo: 'linear-gradient(180deg,#0d3b8e,#1a9b80)', efecto: 'confeti' },
  { img: null, fondo: 'linear-gradient(180deg,#ff9ec4,#ffd9a8)', efecto: ['💐', '🌸', '🌷', '🌹', '🌼', '🌻'], emoji: '💐' },   // ramos de flores (sin imagen)
  { img: null, fondo: 'linear-gradient(180deg,#1b1450,#3b2a99)', efecto: ['⭐', '✨', '🎉', '🎊'], emoji: '🏆' },
];
const COLORES = ['#ff5a5f', '#ffb400', '#2ec4b6', '#4361ee', '#b5179e', '#7ae582', '#ff8fab'];
const R = a => a[Math.floor(Math.random() * a.length)];
const reducido = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const BASE = new URL('../../img/victoria/', import.meta.url);

const CSS = `
.vic{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(15,10,50,.62);animation:vicIn .25s ease-out}
.vic-card{position:relative;z-index:2;width:min(92vw,380px);background:var(--card,#fff);color:var(--ink,#222);border-radius:26px;padding:18px 16px 16px;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.45);animation:vicPop .5s cubic-bezier(.2,1.4,.4,1)}
.vic-t{font-family:var(--f-titulo,inherit);font-weight:800;font-size:clamp(28px,8.5vw,38px);line-height:1.05;margin:0;background:linear-gradient(90deg,#ff5a5f,#ffb400,#2ec4b6,#4361ee,#b5179e);-webkit-background-clip:text;background-clip:text;color:transparent}
.vic-s{margin:4px 0 12px;font-size:14px;opacity:.75}
.vic-m{height:min(42vh,250px);border-radius:18px;overflow:hidden;display:flex;align-items:center;justify-content:center}
.vic-m img{max-width:100%;max-height:100%;object-fit:contain}
.vic-m b{font-size:96px;line-height:1;animation:vicBota 1.1s ease-in-out infinite alternate}
.vic-b{display:flex;flex-direction:column;gap:8px;margin-top:14px}
.vic-b .btn{width:100%}
.vic-fx{position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden}
.vic-fx canvas{width:100%;height:100%;display:block}
.vic-e{position:absolute;top:-12%;font-size:30px;animation:vicCae linear forwards}
.vic-e.sube{top:auto;bottom:-12%;animation-name:vicSube}
@keyframes vicIn{from{opacity:0}to{opacity:1}}
@keyframes vicPop{from{transform:scale(.6) translateY(20px);opacity:0}to{transform:none;opacity:1}}
@keyframes vicBota{from{transform:translateY(8px) rotate(-6deg)}to{transform:translateY(-8px) rotate(6deg)}}
@keyframes vicCae{to{transform:translateY(125vh) rotate(360deg)}}
@keyframes vicSube{to{transform:translateY(-125vh) rotate(-300deg)}}
@media (prefers-reduced-motion:reduce){.vic-card,.vic,.vic-m b{animation:none}}
`;

// Confeti de colores a pantalla completa (canvas), ~4 s
function confeti(capa) {
  const cv = document.createElement('canvas'); capa.append(cv);
  const dpr = Math.min(devicePixelRatio || 1, 2), W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr, c = cv.getContext('2d');
  const ps = Array.from({ length: 150 }, () => ({ x: Math.random() * W, y: -Math.random() * H * .6, w: (6 + Math.random() * 8) * dpr, h: (4 + Math.random() * 6) * dpr,
    vy: (2.2 + Math.random() * 3.2) * dpr, vx: (Math.random() - .5) * 2.4 * dpr, a: Math.random() * 6.28, va: (Math.random() - .5) * .3, col: R(COLORES) }));
  let t0 = 0, raf = 0;
  const paso = t => {
    if (!cv.isConnected) return;
    if (!t0) t0 = t; const dt = t - t0;
    c.clearRect(0, 0, W, H);
    for (const p of ps) {
      p.x += p.vx + Math.sin((p.y + p.a * 50) / (60 * dpr)) * .8 * dpr; p.y += p.vy; p.a += p.va;
      c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.globalAlpha = dt > 3200 ? Math.max(0, 1 - (dt - 3200) / 1000) : 1; c.fillStyle = p.col; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); c.restore();
    }
    if (dt < 4300) raf = requestAnimationFrame(paso); else cv.remove();
  };
  raf = requestAnimationFrame(paso);
  return () => cancelAnimationFrame(raf);
}
// Lluvia (o subida) de emojis: monedas, flores…
function lluvia(capa, emojis, sube) {
  for (let i = 0; i < 26; i++) {
    const e = document.createElement('span'); e.className = 'vic-e' + (sube ? ' sube' : ''); e.textContent = R(emojis);
    const d = 2.6 + Math.random() * 2.4;
    e.style.cssText = `left:${Math.random() * 96}%;font-size:${22 + Math.random() * 20}px;animation-duration:${d}s;animation-delay:${Math.random() * 1.6}s`;
    capa.append(e);
  }
  setTimeout(() => { for (const e of capa.querySelectorAll('.vic-e')) e.remove(); }, 6500);
}

/** Muestra la celebración. opciones: { nueva: () => void, etiqueta: 'Nueva partida' } */
export function celebrar({ nueva = null, etiqueta = 'Nueva partida' } = {}) {
  if (typeof document === 'undefined' || document.querySelector('.vic')) return null;
  if (!document.getElementById('jr-victoria')) { const s = document.createElement('style'); s.id = 'jr-victoria'; s.textContent = CSS; document.head.append(s); }
  const quieta = reducido();
  const a = quieta ? ANIMACIONES.find(x => x.img === 'trofeo.webp') : R(ANIMACIONES);
  const fondo = document.createElement('div'); fondo.className = 'vic'; fondo.setAttribute('role', 'dialog'); fondo.setAttribute('aria-modal', 'true'); fondo.setAttribute('aria-label', 'Has ganado la partida');
  const fx = document.createElement('div'); fx.className = 'vic-fx'; fx.setAttribute('aria-hidden', 'true');
  const card = document.createElement('div'); card.className = 'vic-card';
  const t = document.createElement('h2'); t.className = 'vic-t'; t.textContent = R(MENSAJES);
  const s = document.createElement('p'); s.className = 'vic-s'; s.textContent = R(SUBTITULOS);
  const m = document.createElement('div'); m.className = 'vic-m'; m.style.background = a.fondo; m.setAttribute('aria-hidden', 'true');
  if (a.img) { const im = new Image(); im.alt = ''; im.decoding = 'async'; im.src = new URL(a.img, BASE).href; m.append(im); }
  else { const b = document.createElement('b'); b.textContent = a.emoji; m.append(b); }
  const bs = document.createElement('div'); bs.className = 'vic-b';
  let parar = () => {};
  const cerrar = () => { parar(); fondo.remove(); document.removeEventListener('keydown', tecla); };
  const tecla = e => { if (e.key === 'Escape') cerrar(); };
  if (nueva) { const bn = document.createElement('button'); bn.type = 'button'; bn.className = 'btn on grande'; bn.textContent = '🆕 ' + etiqueta; bn.addEventListener('click', () => { cerrar(); nueva(); }); bs.append(bn); }
  const bc = document.createElement('button'); bc.type = 'button'; bc.className = 'btn'; bc.textContent = 'Ver el tablero'; bc.addEventListener('click', cerrar); bs.append(bc);
  card.append(t, s, m, bs); fondo.append(fx, card);
  fondo.addEventListener('click', e => { if (e.target === fondo) cerrar(); });
  document.addEventListener('keydown', tecla); document.body.append(fondo);
  const primero = bs.firstChild; if (primero) primero.focus({ preventScroll: true });
  if (!quieta && a.efecto) {
    if (a.efecto === 'confeti') parar = confeti(fx);
    else lluvia(fx, a.efecto, a.emoji === '💐');
  }
  return cerrar;
}
