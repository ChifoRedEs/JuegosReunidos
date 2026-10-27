// Dado 3D común (Three.js, carga diferida). Un lienzo pequeño con 1 o 2 dados que ruedan y caen mostrando el valor decidido por el juego.
// Sirve para Partxis, Oca, Magnate Urbano y Hotel: el propio dado es el botón de tirar (no hay botón aparte).
//
//   const D = await crearDado3D(contenedor, { n: 1|2, alClic: () => …, etiqueta: 'Dado', color: '#FFFDF4' });
//   D.tirar([v1, v2], ms) → Promise (se resuelve cuando los dados han caído)     D.poner([v1, v2]) muestra valores sin animar (null = «?»)
//   D.activar(true|false, 'Toca el dado')  marca el dado como pulsable y muestra el aviso      D.color('#hex')  tinte del dado      D.destruir()
// Si el dispositivo no tiene WebGL se usa un dado plano (HTML) con la misma interfaz.
import { hayWebGL } from './escena3d.js';

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const VALOR_DE_CARA = [3, 4, 1, 6, 2, 5];                                   // +x, −x, +y, −y, +z, −z (las caras opuestas suman 7)
const NORMAL = { 3: [1, 0, 0], 4: [-1, 0, 0], 1: [0, 1, 0], 6: [0, -1, 0], 2: [0, 0, 1], 5: [0, 0, -1] };
function punto(x, cx, cy, r, forma) {
  x.beginPath();
  if (forma === 'cuadrado') x.rect(cx - r * .9, cy - r * .9, r * 1.8, r * 1.8);
  else if (forma === 'rombo') { x.moveTo(cx, cy - r * 1.15); x.lineTo(cx + r * 1.15, cy); x.lineTo(cx, cy + r * 1.15); x.lineTo(cx - r * 1.15, cy); x.closePath(); }
  else if (forma === 'estrella') { for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .5 : r * 1.25; x[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); }
  else x.arc(cx, cy, r, 0, 7);
  x.fill();
}
const claro = h => { const n = parseInt(h.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (.299 * r + .587 * g + .114 * b) / 255 > .55; };
// Apariencia común del dado: «Estilo» (color del cuerpo y de los puntos) y «Puntos» (forma). «jugador» = el color del jugador al que le toca.
export const ESTILOS_DADO = { jugador: { nombre: 'Color del jugador', sw: ['#E0243A', '#FFFFFF'] }, marfil: { nombre: 'Marfil', bg: '#FFFDF4', pip: '#1B1F33', sw: ['#FFFDF4', '#1B1F33'] }, negro: { nombre: 'Negro', bg: '#20232F', pip: '#FFFFFF', sw: ['#20232F', '#FFFFFF'] }, casino: { nombre: 'Casino', bg: '#C8102E', pip: '#FFFFFF', sw: ['#C8102E', '#FFFFFF'] }, cristal: { nombre: 'Cristal', bg: '#9BD3F5', pip: '#10346B', sw: ['#9BD3F5', '#10346B'] }, oro: { nombre: 'Oro', bg: '#E8B923', pip: '#4A2E00', sw: ['#E8B923', '#4A2E00'] }, jade: { nombre: 'Jade', bg: '#2E9E6B', pip: '#F4FFF8', sw: ['#2E9E6B', '#F4FFF8'] } };
export const grupoDado = () => [
  { clave: 'dado', titulo: 'Dado · Estilo', icono: '🎲', def: 'jugador', opciones: Object.entries(ESTILOS_DADO).map(([id, e]) => ({ id, nombre: e.nombre, sw: e.sw })) },
  { clave: 'dadoPuntos', titulo: 'Dado · Puntos', icono: '⚀', def: 'redondo', opciones: [{ id: 'redondo', nombre: '● Redondos' }, { id: 'cuadrado', nombre: '■ Cuadrados' }, { id: 'rombo', nombre: '◆ Rombos' }, { id: 'estrella', nombre: '★ Estrellas' }] },
];
const pausa = ms => new Promise(r => setTimeout(r, ms));

function envoltorio(cont, o) {
  const w = document.createElement('div'); w.className = 'dado3d'; w.setAttribute('role', 'button'); w.tabIndex = 0; w.setAttribute('aria-label', o.etiqueta || 'Dado');
  w.classList.toggle('dos', o.n === 2);
  const aviso = document.createElement('small'); aviso.className = 'dado3d-aviso'; aviso.hidden = true;
  cont.append(w, aviso); return { w, aviso };
}

export async function crearDado3D(cont, o = {}) {
  const n = o.n === 2 ? 2 : 1, { w, aviso } = envoltorio(cont, o);
  let activo = false, destruido = false, tinte = o.color || '#FFFDF4', est = { bg: null, pip: null, forma: 'redondo' };
  const clic = () => { if (activo && o.alClic) o.alClic(); };
  w.addEventListener('click', clic); w.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clic(); } });
  const base = {
    activar(v, texto) { activo = !!v; w.classList.toggle('listo', activo); w.setAttribute('aria-disabled', String(!activo)); aviso.hidden = !(activo && texto); aviso.textContent = texto || ''; },
    estaActivo: () => activo,
  };
  if (!hayWebGL()) return { ...base, ...plano(w, n, o, () => tinte, c => { tinte = c; }), destruir() { destruido = true; w.remove(); aviso.remove(); } };

  const T = await import('../vendor/three.module.min.js');
  if (destruido) return null;
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); renderer.setClearColor(0, 0); renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const cv = renderer.domElement; cv.style.cssText = 'display:block;width:100%;height:100%'; w.append(cv);
  const escena = new T.Scene(), cam = new T.PerspectiveCamera(24, 2, .1, 60);
  escena.add(new T.HemisphereLight(0xffffff, 0x9aa3c8, 2.0));
  const sol = new T.DirectionalLight(0xffffff, 2.1); sol.position.set(-3, 7, 4); sol.castShadow = true; sol.shadow.mapSize.set(1024, 1024);
  Object.assign(sol.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 20 }); sol.shadow.bias = -.0005; escena.add(sol);
  const suelo = new T.Mesh(new T.PlaneGeometry(40, 40), new T.ShadowMaterial({ opacity: .3 })); suelo.rotation.x = -Math.PI / 2; suelo.receiveShadow = true; escena.add(suelo);

  const SEP = 1.75, xs = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * SEP);
  const cacheTex = new Map();
  function carasMat(bg0) {
    const bg = est.bg || bg0, pip = est.pip, forma = est.forma;
    return VALOR_DE_CARA.map(v => {
      const k = bg + pip + forma + v; if (cacheTex.has(k)) return cacheTex.get(k);
      const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
      x.fillStyle = bg; x.fillRect(0, 0, 128, 128); x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 6; x.strokeRect(3, 3, 122, 122);
      const pc = pip || (claro(bg) ? '#1B1F33' : '#FFFFFF');
      for (const i of PIPS[v]) { const cx = 32 + (i % 3) * 32, cy = 32 + ((i / 3) | 0) * 32; x.fillStyle = v === 1 && !pip ? '#D6303A' : pc; punto(x, cx, cy, v === 1 ? 15 : 11, forma); }
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
      const m = new T.MeshStandardMaterial({ map: t, roughness: .32, metalness: 0 }); cacheTex.set(k, m); return m;
    });
  }
  const geo = new T.BoxGeometry(1, 1, 1);
  const dados = xs.map(x => { const m = new T.Mesh(geo, carasMat(tinte)); m.castShadow = true; m.position.set(x, .5, 0); escena.add(m); return m; });
  const arriba = new T.Vector3(0, 1, 0), vacio = new T.Quaternion().setFromEuler(new T.Euler(-.5, .7, .15));
  const qDe = (v, yaw) => { const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(...NORMAL[v]), arriba); return new T.Quaternion().setFromAxisAngle(arriba, yaw).multiply(q); };
  const yaws = xs.map((_, i) => (i ? -.35 : .3));
  let raf = 0, anim = null, sucio = true;
  const bucle = () => {
    raf = 0; if (destruido) return;
    if (anim) {
      const t = Math.min(1, (performance.now() - anim.t0) / anim.ms), e = 1 - Math.pow(1 - t, 3);
      dados.forEach((d, i) => {
        const a = anim.d[i], rot = new T.Quaternion().setFromAxisAngle(a.eje, (1 - e) * a.giro);
        d.quaternion.copy(rot).multiply(a.q);
        d.position.set(xs[i] + (1 - e) * a.dx, .5 + Math.abs(Math.sin(t * Math.PI * a.botes)) * a.alto * (1 - t) * (1 - t * .3), (1 - e) * a.dz);
      });
      if (t >= 1) { const r = anim.fin; anim = null; r(); }
      sucio = true;
    }
    if (sucio) { renderer.render(escena, cam); sucio = false; }
    if (anim) raf = requestAnimationFrame(bucle);
  };
  const pedir = () => { sucio = true; if (!raf) raf = requestAnimationFrame(bucle); };
  function ajustar() {
    const W = w.clientWidth || 200, H = w.clientHeight || 120; renderer.setSize(W, H, false); cam.aspect = W / H;
    const ancho = n === 1 ? 2.6 : 4.8; cam.fov = Math.max(24, 2 * Math.atan(Math.tan(12 * Math.PI / 180) * Math.max(1, (ancho / (3.1 * cam.aspect)))) * 180 / Math.PI);
    cam.position.set(0, 5.3, 5.4); cam.lookAt(0, .35, 0); cam.updateProjectionMatrix(); pedir();
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(ajustar) : null; if (ro) ro.observe(w); ajustar();
  const poner = vals => { dados.forEach((d, i) => { const v = vals && vals[i]; if (v >= 1 && v <= 6) d.quaternion.copy(qDe(v, yaws[i])); else d.quaternion.copy(vacio); d.position.set(xs[i], .5, 0); }); pedir(); };
  poner(null);
  return {
    ...base,
    poner,
    tirar(vals, ms = 900) {
      return new Promise(res => {
        if (anim) { anim.fin(); anim = null; }
        if (ms <= 0) { poner(vals); return res(); }
        anim = { t0: performance.now(), ms, fin: res, d: dados.map((_, i) => ({
          q: qDe(vals[i], yaws[i] + (Math.random() - .5) * .5), eje: new T.Vector3(Math.random() - .5, Math.random() - .3, Math.random() - .5).normalize(),
          giro: Math.PI * 2 * (2 + Math.random() * 2), dx: (i ? 1 : -1) * (1.2 + Math.random() * .8), dz: -1.2 - Math.random() * .8, botes: 3 + (Math.random() * 2 | 0), alto: 1.3 + Math.random() * .5 })) };
        pedir();
      });
    },
    color(hex) { if (!hex || hex === tinte) return; tinte = hex; const mats = carasMat(hex); dados.forEach(d => { d.material = mats; }); pedir(); },
    estilo(v) { est = aplicarEstilo(v); const mats = carasMat(tinte); dados.forEach(d => { d.material = mats; }); pedir(); },
    destruir() {
      destruido = true; if (raf) cancelAnimationFrame(raf); if (ro) ro.disconnect();
      cacheTex.forEach(m => { m.map.dispose(); m.dispose(); }); geo.dispose(); renderer.dispose(); w.remove(); aviso.remove();
    },
  };
}

/* ---------- respaldo sin WebGL: dado plano ---------- */
function plano(w, n, o, getTinte, setTinte) {
  let est = { bg: null, pip: null, forma: 'redondo' };
  w.classList.add('plano'); w.innerHTML = Array.from({ length: n }, () => '<span class="d2"></span>').join('');
  const cara = (el, v) => { const bg = est.bg || getTinte(); el.style.background = bg; el.style.color = est.pip || (claro(bg) ? '#1B1F33' : '#fff'); el.dataset.forma = est.forma; el.innerHTML = v ? [...Array(9).keys()].map(k => `<i class="${PIPS[v].includes(k) ? 'on' : ''}"></i>`).join('') : '<b>?</b>'; };
  const els = [...w.querySelectorAll('.d2')];
  let ult = null;
  const poner = vals => { ult = vals; els.forEach((e, i) => { e.classList.remove('roda'); cara(e, vals && vals[i]); }); };
  poner(null);
  return {
    poner,
    async tirar(vals, ms = 900) {
      if (ms <= 0) return poner(vals);
      els.forEach(e => e.classList.add('roda'));
      const fin = performance.now() + Math.min(ms, 700);
      while (performance.now() < fin) { els.forEach(e => cara(e, 1 + (Math.random() * 6 | 0))); els.forEach(e => e.classList.add('roda')); await pausa(90); }
      poner(vals);
    },
    color(h) { if (h) { setTinte(h); els.forEach(e => { e.style.background = est.bg || h; }); } },
    estilo(v) { est = aplicarEstilo(v); poner(ult); },
  };
}

export function aplicarEstilo(v) {
  const e = ESTILOS_DADO[v && v.dado] || ESTILOS_DADO.jugador, forma = ['redondo', 'cuadrado', 'rombo', 'estrella'].includes(v && v.dadoPuntos) ? v.dadoPuntos : 'redondo';
  return { bg: e.bg || null, pip: e.pip || null, forma };
}
