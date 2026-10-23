// Núcleo 3D común (Three.js r160, js/vendor/). Cada juego lo importa de forma dinámica, así el resto de la app no descarga Three.js.
// crearEscena(contenedor, opciones) → objeto E con renderer, escena, cámara orbital, tweens, selección por toque y destrucción limpia.
import * as T from '../vendor/three.module.min.js';
export { T };

export const lienzo = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export const textura = (c, aniso = 4) => { const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = aniso; return t; };
export const suave = t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const EMOJI_FUENTE = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
export function hayWebGL() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch { return false; }
}
export const emojiTextura = (e, tam = 128) => { const c = lienzo(tam, tam), x = c.getContext('2d'); x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `${tam * .72}px ${EMOJI_FUENTE}`; x.fillText(e, tam / 2, tam * .55); return textura(c); };

/* opciones: { fov, az, pol, dist, distMin, distMax, polMin, polMax, radio (para encuadrar), objetivo:[x,y,z], orbita (true), sombras (true),
   sol:{pos:[x,y,z], int}, hemi:{int}, sueloY, sombraOpacidad, antialias } */
export function crearEscena(cont, o = {}) {
  const E = { T, tocables: [], alTocar: null, alFrame: null };
  const renderer = new T.WebGLRenderer({ antialias: o.antialias !== false, alpha: true, powerPreference: 'default' });
  renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = T.SRGBColorSpace;
  const sombras = o.sombras !== false;
  if (sombras) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; }
  const cv = renderer.domElement; cv.className = 'e3d-cv'; cv.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
  if (o.etiqueta) { cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', o.etiqueta); }
  cont.append(cv);
  const escena = new T.Scene(), cam = new T.PerspectiveCamera(o.fov || 38, 1, .1, 200);
  escena.add(new T.HemisphereLight(0xffffff, 0x8a93b8, (o.hemi && o.hemi.int) || 1.9));
  const sol = new T.DirectionalLight(0xffffff, (o.sol && o.sol.int) || 2.2); const sp = (o.sol && o.sol.pos) || [-5, 11, 7]; sol.position.set(...sp);
  if (sombras) {
    sol.castShadow = true; sol.shadow.mapSize.set(o.sombraTam || 1536, o.sombraTam || 1536); const R = o.sombraRadio || 9;
    Object.assign(sol.shadow.camera, { left: -R, right: R, top: R, bottom: -R, near: 1, far: 40 }); sol.shadow.bias = -.0004; sol.shadow.normalBias = .02;
    const suelo = new T.Mesh(new T.PlaneGeometry(80, 80), new T.ShadowMaterial({ opacity: o.sombraOpacidad == null ? .28 : o.sombraOpacidad }));
    suelo.rotation.x = -Math.PI / 2; suelo.position.y = o.sueloY == null ? -.01 : o.sueloY; suelo.receiveShadow = true; escena.add(suelo);
  }
  escena.add(sol);
  const obj = o.objetivo || [0, 0, 0];
  const C = { az: o.az || 0, pol: o.pol == null ? .9 : o.pol, dist: o.dist || 14, tx: obj[0], ty: obj[1], tz: obj[2] };
  Object.assign(C, { objAz: C.az, objPol: C.pol, objDist: C.dist, objTx: C.tx, objTz: C.tz });
  let sucio = true, vivo = true, raf = 0, w = 0, h = 0;
  const marcar = () => { sucio = true; };
  const distMin = o.distMin || 5, distMax = o.distMax || 40, polMin = o.polMin == null ? .15 : o.polMin, polMax = o.polMax == null ? 1.4 : o.polMax;
  const encuadre = () => (o.radio ? Math.min(distMax, Math.max(distMin, o.radio / (Math.tan(cam.fov * Math.PI / 360) * Math.min(1, cam.aspect)) + (o.margen == null ? 2 : o.margen))) : (o.dist || 14));
  function colocarCam() {
    const sp2 = Math.sin(C.pol);
    cam.position.set(C.tx + C.dist * sp2 * Math.sin(C.az), C.ty + C.dist * Math.cos(C.pol), C.tz + C.dist * sp2 * Math.cos(C.az)); cam.lookAt(C.tx, C.ty, C.tz);
  }
  function redimensionar() {
    const r = cont.getBoundingClientRect(), nw = Math.max(100, Math.round(r.width)), nh = Math.max(100, Math.round(r.height));
    if (nw === w && nh === h) return; w = nw; h = nh;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
    const d0 = encuadre(), rel = E.base ? C.objDist / E.base : 1; E.base = d0; C.objDist = C.dist = Math.min(distMax, Math.max(distMin, d0 * rel)); colocarCam(); marcar();
  }
  // ----- tweens (con temporizador de respaldo por si el navegador pausa requestAnimationFrame) -----
  const tweens = new Set();
  function tween(ms, f) {
    return new Promise(res => {
      if (!ms || !vivo) { f(1); marcar(); return res(); }
      const t = { t0: performance.now(), ms, f, res, fin: false };
      t.guarda = setTimeout(() => { if (!t.fin) { t.fin = true; tweens.delete(t); f(1); marcar(); res(); } }, ms + 400);
      tweens.add(t); marcar();
    });
  }
  // ----- ratón / dedo: arrastrar gira, pellizcar o rueda acerca, un toque selecciona -----
  const punteros = new Map(); let mov = 0, dist0 = 0;
  const ray = new T.Raycaster(), v2 = new T.Vector2();
  E.raycast = (ev, lista = E.tocables) => {
    const r = cv.getBoundingClientRect(); v2.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v2, cam); return ray.intersectObjects(lista, true);
  };
  E.plano = (ev, y = 0) => {                                          // punto del plano horizontal y=… bajo el puntero
    const r = cv.getBoundingClientRect(); v2.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v2, cam); const p = new T.Vector3(); return ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), -y), p) ? p : null;
  };
  const orbita = o.orbita !== false;
  E.alArrastrar = null;                                              // (ev, dx, dy, fase) → true si el juego usa el arrastre (la cámara no gira)
  let propio = false;
  const bajar = e => { cv.setPointerCapture(e.pointerId); punteros.set(e.pointerId, { x: e.clientX, y: e.clientY }); mov = 0; propio = !!(E.alArrastrar && punteros.size === 1 && E.alArrastrar(e, 0, 0, 'ini')); if (punteros.size === 2) { const [a, b] = [...punteros.values()]; dist0 = Math.hypot(a.x - b.x, a.y - b.y); } };
  const mover = e => {
    const p = punteros.get(e.pointerId); if (!p) { if (E.alMover) E.alMover(e); return; }
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (propio) { mov += Math.abs(dx) + Math.abs(dy); E.alArrastrar(e, dx, dy, 'mov'); marcar(); return; }
    if (punteros.size === 1) { mov += Math.abs(dx) + Math.abs(dy); if (orbita) { C.objAz -= dx * .0085; C.objPol = Math.min(polMax, Math.max(polMin, C.objPol - dy * .006)); } }
    else if (punteros.size === 2 && orbita) { const [a, b] = [...punteros.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (dist0) C.objDist = Math.min(distMax, Math.max(distMin, C.objDist * dist0 / d)); dist0 = d; mov += 20; }
    marcar();
  };
  const soltar = e => {
    const p = punteros.get(e.pointerId); punteros.delete(e.pointerId); dist0 = 0;
    if (propio) { propio = false; E.alArrastrar(e, 0, 0, e.type === 'pointerup' ? 'fin' : 'cancel'); if (mov >= 7) return; }
    if (p && mov < 7 && e.type === 'pointerup' && !punteros.size && E.alTocar) E.alTocar(e);
  };
  const rueda = e => { if (!orbita) return; e.preventDefault(); C.objDist = Math.min(distMax, Math.max(distMin, C.objDist * Math.exp(e.deltaY * .0012))); marcar(); };
  cv.addEventListener('pointerdown', bajar); cv.addEventListener('pointermove', mover); cv.addEventListener('pointerup', soltar); cv.addEventListener('pointercancel', soltar); cv.addEventListener('wheel', rueda, { passive: false });
  const ro = new ResizeObserver(redimensionar); ro.observe(cont);
  function bucle() {
    if (!vivo) return; raf = requestAnimationFrame(bucle); const ahora = performance.now();
    for (const t of [...tweens]) { const u = Math.min(1, (ahora - t.t0) / t.ms); t.f(u); if (u >= 1 && !t.fin) { t.fin = true; clearTimeout(t.guarda); tweens.delete(t); t.res(); } }
    if (E.alFrame && E.alFrame(ahora)) sucio = true;
    const k = .22, dA = C.objAz - C.az, dP = C.objPol - C.pol, dD = C.objDist - C.dist, dX = C.objTx - C.tx, dZ = C.objTz - C.tz;
    if (Math.abs(dA) > 1e-4 || Math.abs(dP) > 1e-4 || Math.abs(dD) > 1e-3 || Math.abs(dX) > 1e-3 || Math.abs(dZ) > 1e-3) { C.az += dA * k; C.pol += dP * k; C.dist += dD * k; C.tx += dX * k; C.tz += dZ * k; colocarCam(); sucio = true; }
    if (tweens.size) sucio = true;
    if (sucio) { sucio = false; renderer.render(escena, cam); }
  }
  // cámara: 'girar' (90°), 'cenital' (alterna vista desde arriba), 'reset', o un objeto {az,pol,dist}
  E.camara = modo => {
    if (modo === 'girar') C.objAz = Math.round(C.objAz / (Math.PI / 2) + 1) * (Math.PI / 2);
    else if (modo === 'cenital') C.objPol = C.objPol < .35 ? (E.pol0 == null ? .9 : E.pol0) : .12;
    else if (modo && typeof modo === 'object') { if (modo.az != null) C.objAz = modo.az; if (modo.pol != null) C.objPol = modo.pol; if (modo.dist != null) C.objDist = modo.dist; }
    else { C.objAz = Math.round(C.objAz / (Math.PI * 2)) * Math.PI * 2; C.objPol = E.pol0 == null ? .9 : E.pol0; C.objDist = E.base || encuadre(); C.objTx = obj[0]; C.objTz = obj[2]; }
    marcar();
  };
  E.pol0 = C.pol;
  E.iniciar = () => { redimensionar(); C.dist = C.objDist = E.base = encuadre(); colocarCam(); if (!raf) raf = requestAnimationFrame(bucle); marcar(); };
  E.renderer = renderer; E.escena = escena; E.cam = cam; E.C = C; E.canvas = cv; E.sol = sol; E.marcar = marcar; E.tween = tween; E.redimensionar = redimensionar;
  E.destruir = () => {
    vivo = false; cancelAnimationFrame(raf); ro.disconnect(); for (const t of tweens) { clearTimeout(t.guarda); t.res(); } tweens.clear();
    cv.removeEventListener('pointerdown', bajar); cv.removeEventListener('pointermove', mover); cv.removeEventListener('pointerup', soltar); cv.removeEventListener('pointercancel', soltar); cv.removeEventListener('wheel', rueda);
    escena.traverse(x => { if (x.geometry) x.geometry.dispose(); const ms = x.material ? (Array.isArray(x.material) ? x.material : [x.material]) : []; for (const m of ms) { if (m.map) m.map.dispose(); m.dispose(); } });
    renderer.dispose(); try { renderer.forceContextLoss(); } catch { /* nada */ } cv.remove();
  };
  return E;
}

// Botones flotantes de cámara (girar 90°, vista desde arriba, reencuadrar) sobre el contenedor de la escena
export function botonesCamara(host, E) {
  const d = document.createElement('div'); d.className = 'e3d-cam'; d.setAttribute('role', 'group'); d.setAttribute('aria-label', 'Cámara');
  d.innerHTML = '<button type="button" class="btn" data-cam="girar" aria-label="Girar el tablero 90 grados" title="Girar">⟳</button><button type="button" class="btn" data-cam="cenital" aria-label="Vista desde arriba" title="Desde arriba">⤒</button><button type="button" class="btn" data-cam="reset" aria-label="Reencuadrar" title="Reencuadrar">⌖</button>';
  d.addEventListener('click', e => { const b = e.target.closest('[data-cam]'); if (b) E.camara(b.dataset.cam); });
  d.addEventListener('pointerdown', e => e.stopPropagation());
  host.append(d); return d;
}
