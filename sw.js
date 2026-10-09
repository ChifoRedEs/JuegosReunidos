// Service worker: guarda la app en caché para que funcione sin conexión.
// La lista de archivos y VERSION se regeneran con:  python tools/generar_sw.py
const VERSION = 'jr-e3f621c4c4';
const ARCHIVOS = [
/*ARCHIVOS-INICIO*/
'./',
'./index.html',
'./manifest.webmanifest',
'./css/base.css',
'./css/cartas.css',
'./data/nonogramas/pixelart.json',
'./icons/icon-192.png',
'./icons/icon-512.png',
'./icons/icon-maskable-512.png',
'./icons/icon.svg',
'./js/app.js',
'./js/registry.js',
'./js/core/ajustes.js',
'./js/core/aspectos.js',
'./js/core/cartas.js',
'./js/core/cronometro.js',
'./js/core/dom.js',
'./js/core/duelo.js',
'./js/core/sonido.js',
'./js/core/stats.js',
'./js/core/storage.js',
'./js/core/undo.js',
'./js/core/ia/minimax.js',
'./js/games/_plantilla/index.js',
'./js/games/blackjack/blackjack.css',
'./js/games/blackjack/index.js',
'./js/games/blackjack/motor.js',
'./js/games/buscaminas/buscaminas.css',
'./js/games/buscaminas/index.js',
'./js/games/buscaminas/motor.js',
'./js/games/conecta4/conecta4.css',
'./js/games/conecta4/index.js',
'./js/games/conecta4/reglas.js',
'./js/games/crucigrama/crucigrama.css',
'./js/games/crucigrama/generador.js',
'./js/games/crucigrama/index.js',
'./js/games/crucigrama/pistas.js',
'./js/games/damas/damas.css',
'./js/games/damas/ia.js',
'./js/games/damas/index.js',
'./js/games/damas/reglas.js',
'./js/games/holdem/holdem.css',
'./js/games/holdem/index.js',
'./js/games/holdem/motor.js',
'./js/games/klondike/index.js',
'./js/games/klondike/klondike.css',
'./js/games/klondike/motor.js',
'./js/games/nonogram/index.js',
'./js/games/nonogram/nonogram.css',
'./js/games/nonogram/solver.js',
'./js/games/parchis/index.js',
'./js/games/parchis/parchis.css',
'./js/games/parchis/reglas.js',
'./js/games/parchis/tablero.js',
'./js/games/sopa/generador.js',
'./js/games/sopa/index.js',
'./js/games/sopa/palabras.js',
'./js/games/sopa/sopa.css',
'./js/games/sudoku/generador.js',
'./js/games/sudoku/index.js',
'./js/games/sudoku/sudoku.css',
'./js/games/tresenraya/index.js',
'./js/games/tresenraya/reglas.js',
'./js/games/tresenraya/tresenraya.css'
/*ARCHIVOS-FIN*/
];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;     // las fuentes de Google van directas a la red
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(res => {
    if (res.ok) { const copia = res.clone(); caches.open(VERSION).then(c => c.put(req, copia)); }
    return res;
  }).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
