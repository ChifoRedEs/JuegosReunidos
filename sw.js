// Service worker: guarda la app en caché para que funcione sin conexión.
// La lista de archivos y VERSION se regeneran con:  python tools/generar_sw.py
const VERSION = 'jr-9a6f860de8';
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
'./img/cartas/barajas.json',
'./img/cartas/dorsos/nombres.json',
'./js/app.js',
'./js/registry.js',
'./js/core/ajustes.js',
'./js/core/arrastrar.js',
'./js/core/aspectos.js',
'./js/core/cartas.js',
'./js/core/cronometro.js',
'./js/core/definiciones.js',
'./js/core/dom.js',
'./js/core/duelo.js',
'./js/core/sonido.js',
'./js/core/stats.js',
'./js/core/storage.js',
'./js/core/teclado.js',
'./js/core/undo.js',
'./js/core/ia/minimax.js',
'./js/games/ahorcado/ahorcado.css',
'./js/games/ahorcado/dibujos.js',
'./js/games/ahorcado/index.js',
'./js/games/ahorcado/palabras.js',
'./js/games/ajedrez/ajedrez.css',
'./js/games/ajedrez/index.js',
'./js/games/ajedrez/reglas.js',
'./js/games/blackjack/blackjack.css',
'./js/games/blackjack/index.js',
'./js/games/blackjack/motor.js',
'./js/games/bloques/bloques.css',
'./js/games/bloques/index.js',
'./js/games/bloques/motor.js',
'./js/games/brisca/brisca.css',
'./js/games/brisca/ia.js',
'./js/games/brisca/index.js',
'./js/games/brisca/motor.js',
'./js/games/buscaminas/buscaminas.css',
'./js/games/buscaminas/index.js',
'./js/games/buscaminas/motor.js',
'./js/games/chinchon/chinchon.css',
'./js/games/chinchon/index.js',
'./js/games/chinchon/motor.js',
'./js/games/cinquillo/cinquillo.css',
'./js/games/cinquillo/index.js',
'./js/games/cinquillo/motor.js',
'./js/games/conecta4/conecta4.css',
'./js/games/conecta4/index.js',
'./js/games/conecta4/reglas.js',
'./js/games/continental/continental.css',
'./js/games/continental/index.js',
'./js/games/continental/motor.js',
'./js/games/crucigrama/crucigrama.css',
'./js/games/crucigrama/generador.js',
'./js/games/crucigrama/index.js',
'./js/games/crucigrama/pistas.js',
'./js/games/damas/damas.css',
'./js/games/damas/ia.js',
'./js/games/damas/index.js',
'./js/games/damas/reglas.js',
'./js/games/encadenadas/diccionario.js',
'./js/games/encadenadas/encadenadas.css',
'./js/games/encadenadas/index.js',
'./js/games/encadenadas/motor.js',
'./js/games/encadenadas/silabas.js',
'./js/games/flota/flota.css',
'./js/games/flota/index.js',
'./js/games/flota/motor.js',
'./js/games/holdem/holdem.css',
'./js/games/holdem/index.js',
'./js/games/holdem/motor.js',
'./js/games/kenken/generador.js',
'./js/games/kenken/index.js',
'./js/games/kenken/kenken.css',
'./js/games/klondike/index.js',
'./js/games/klondike/klondike.css',
'./js/games/klondike/motor.js',
'./js/games/klondike/solver.js',
'./js/games/klondike/solver.worker.js',
'./js/games/ladrillos/index.js',
'./js/games/ladrillos/ladrillos.css',
'./js/games/ladrillos/motor.js',
'./js/games/mus/index.js',
'./js/games/mus/motor.js',
'./js/games/mus/mus.css',
'./js/games/nonogram/index.js',
'./js/games/nonogram/nonogram.css',
'./js/games/nonogram/solver.js',
'./js/games/oca/index.js',
'./js/games/oca/motor.js',
'./js/games/oca/oca.css',
'./js/games/parchis/index.js',
'./js/games/parchis/parchis.css',
'./js/games/parchis/reglas.js',
'./js/games/parchis/tablero.js',
'./js/games/rosco/index.js',
'./js/games/rosco/motor.js',
'./js/games/rosco/palabras.js',
'./js/games/rosco/rosco.css',
'./js/games/ruleta/index.js',
'./js/games/ruleta/motor.js',
'./js/games/ruleta/paneles.js',
'./js/games/ruleta/ruleta.css',
'./js/games/rummy/index.js',
'./js/games/rummy/motor.js',
'./js/games/rummy/rummy.css',
'./js/games/serpiente/index.js',
'./js/games/serpiente/motor.js',
'./js/games/serpiente/serpiente.css',
'./js/games/sopa/generador.js',
'./js/games/sopa/index.js',
'./js/games/sopa/palabras.js',
'./js/games/sopa/sopa.css',
'./js/games/sudoku/generador.js',
'./js/games/sudoku/index.js',
'./js/games/sudoku/sudoku.css',
'./js/games/tresenraya/index.js',
'./js/games/tresenraya/reglas.js',
'./js/games/tresenraya/tresenraya.css',
'./js/games/trivial/index.js',
'./js/games/trivial/motor.js',
'./js/games/trivial/trivial.css'
/*ARCHIVOS-FIN*/
];
// Tipografías de Google Fonts (Baloo 2 y Nunito): se guardan en una caché aparte que NO se borra al actualizar la app,
// para que sin conexión los textos se vean igual que con internet. Debe ser la MISMA dirección que en index.html.
const FUENTES = 'jr-fuentes';
const FUENTES_CSS = 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&family=Nunito:wght@500;700;800&display=swap';
const esFuente = url => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
async function guardarFuentes() {                 // descarga la hoja de estilos y todos los archivos de letra que enlaza
  const c = await caches.open(FUENTES), res = await fetch(FUENTES_CSS, { cache: 'reload' });
  if (!res.ok) return;
  await c.put(FUENTES_CSS, res.clone());
  const urls = [...(await res.text()).matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(m => m[1]);
  await Promise.all(urls.map(u => c.match(u).then(ya => ya || fetch(u).then(r => (r.ok ? c.put(u, r) : null)))));
}

// Guarda los archivos uno a uno: si alguno falla (por ejemplo, uno que no se ha subido a GitHub), los demás se guardan igual
// y la app sigue funcionando sin conexión. (Con addAll, un solo fallo cancelaba la instalación entera.)
async function guardarApp() {
  const c = await caches.open(VERSION);
  const r = await Promise.allSettled(ARCHIVOS.map(async u => {
    const res = await fetch(new Request(u, { cache: 'reload' }));
    if (!res.ok) throw new Error(u + ' → ' + res.status);
    await c.put(u, res);
  }));
  const fallos = r.filter(x => x.status === 'rejected');
  if (fallos.length) console.warn('Sin conexión no estarán disponibles:', fallos.map(x => x.reason && x.reason.message));
  if (fallos.length > ARCHIVOS.length / 2) throw new Error('Demasiados archivos fallidos: se reintentará');   // probablemente sin red
}

// cache: 'reload' obliga a bajar cada archivo del servidor: sin esto, la caché HTTP del navegador (GitHub Pages guarda ~10 min)
// podía meter archivos ANTIGUOS en la versión nueva y los cambios no se veían.
self.addEventListener('install', e => {
  e.waitUntil(Promise.all([
    guardarApp(),
    guardarFuentes().catch(() => {}),             // sin conexión o si Google falla, la app se instala igual
  ]).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== FUENTES).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (esFuente(url)) {                            // fuentes: primero la copia guardada; si no está, se descarga y se guarda
    e.respondWith(caches.open(FUENTES).then(c => c.match(req, { ignoreVary: true }).then(r => r || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }))).catch(() => new Response('', { status: 200, headers: { 'Content-Type': url.hostname === 'fonts.googleapis.com' ? 'text/css' : 'font/woff2' } })));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(res => {
    if (res.ok) { const copia = res.clone(); caches.open(VERSION).then(c => c.put(req, copia)); }
    return res;
  }).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
