// Vista 3D del bingo (Three.js vía core/escena3d.js): el bombo con sus bolas, el carril por el que baja la bola que sale y el tablero de 90 números.
// Si no hay WebGL se usa una versión 2D con el mismo movimiento. Lo comparten Bingo Live y Bingo Mobile.
import { crearEscena, hayWebGL, lienzo, textura, suave, T } from '../escena3d.js';
import { decena } from './motor.js';

export const COLORES_FILA = ['#E53935', '#FB8C00', '#F9C80E', '#7CB342', '#00ACC1', '#1E88E5', '#5E35B1', '#D81B60', '#6D4C41'];
const colBola = n => COLORES_FILA[decena(n)];

function dibujarBola(n, activa, w, h) {
  const c = lienzo(w, h), x = c.getContext('2d');
  x.fillStyle = activa ? colBola(n) : '#3b4a5c'; x.fillRect(0, 0, w, h);
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,.28)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.25)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (const cx of [w * .25, w * .75]) {                                    // la esfera tiene el número de frente (u = .25) y de espaldas (u = .75)
    x.beginPath(); x.arc(cx, h / 2, h * .34, 0, 6.2832); x.fillStyle = activa ? '#fff' : '#566478'; x.fill();
    x.fillStyle = activa ? '#1b1f2a' : '#8693a6'; x.font = `800 ${h * .36}px "Baloo 2", system-ui, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n), cx, h / 2 + h * .02);
    if (n === 6 || n === 9) { x.fillRect(cx - h * .09, h / 2 + h * .2, h * .18, h * .035); }       // subrayado para distinguir 6 y 9
  }
  return c;
}

export async function crearVista(cont, o = {}) {
  if (!hayWebGL() || o.calidad === '2d') return crearVista2D(cont);
  const alta = o.calidad !== 'ligera';
  const E = crearEscena(cont, { orbita: false, sombras: false, fov: 32, pol: 1.5, az: 0, dist: 30, distMin: 4, distMax: 120, antialias: alta, hemi: { int: 1.5 }, sol: { pos: [-6, 10, 20], int: 2 }, etiqueta: 'Bombo y tablero del bingo' });
  const esc = E.escena, seg = alta ? [28, 20] : [14, 10], TW = alta ? 256 : 128;
  const offTex = new Map(), litTex = new Map();
  const tex = (n, act) => { const m = act ? litTex : offTex; if (!m.has(n)) m.set(n, textura(dibujarBola(n, act, TW, TW / 2), 4)); return m.get(n); };
  let L = null, vivo = true;

  /* ----- tablero ----- */
  const tablero = new T.Group(); esc.add(tablero);
  const losa = new T.Mesh(new T.BoxGeometry(10.8, 9.8, .3), new T.MeshStandardMaterial({ color: 0x0d4a33, roughness: .8 })); losa.position.z = -.3; tablero.add(losa);
  const marco = new T.Mesh(new T.BoxGeometry(11.2, 10.2, .2), new T.MeshStandardMaterial({ color: 0xc9a227, roughness: .4, metalness: .5 })); marco.position.z = -.45; tablero.add(marco);
  const huecos = new T.InstancedMesh(new T.CircleGeometry(.47, 24), new T.MeshBasicMaterial({ color: 0x07281c }), 90), m4 = new T.Matrix4();
  const pos = n => ({ x: ((n - 1) % 10 - 4.5), y: 4 - decena(n) });
  for (let n = 1; n <= 90; n++) { const p = pos(n); m4.makeTranslation(p.x, p.y, -.1); huecos.setMatrixAt(n - 1, m4); }
  tablero.add(huecos);
  const bolasT = [], geoT = new T.SphereGeometry(.42, seg[0], seg[1]);
  for (let n = 1; n <= 90; n++) {
    const mat = new T.MeshStandardMaterial({ map: tex(n, false), roughness: .45, metalness: .05 }), b = new T.Mesh(geoT, mat), p = pos(n);
    b.position.set(p.x, p.y, .05); b.scale.setScalar(.8); b.userData = { n, on: false }; tablero.add(b); bolasT[n] = b;
  }
  const encender = (n, anim) => {
    const b = bolasT[n]; if (!b || b.userData.on) return; b.userData.on = true;
    b.material.map = tex(n, true); b.material.emissive = new T.Color(0xffffff); b.material.emissiveMap = b.material.map; b.material.emissiveIntensity = .25; b.material.needsUpdate = true;
    if (anim) E.tween(420, u => { b.scale.setScalar(.8 + .5 * Math.sin(Math.PI * u) + .2 * u); });
    else b.scale.setScalar(1);
    if (anim) E.tween(10, () => { b.scale.setScalar(1); });
  };
  const apagarTodas = () => { for (let n = 1; n <= 90; n++) { const b = bolasT[n]; b.userData.on = false; b.material.map = tex(n, false); b.material.emissive = new T.Color(0x000000); b.material.emissiveMap = null; b.material.emissiveIntensity = 0; b.material.needsUpdate = true; b.scale.setScalar(.8); } E.marcar(); };

  /* ----- bombo ----- */
  const bombo = new T.Group(); esc.add(bombo);
  const drum = new T.Group(); bombo.add(drum);
  const R = 2.4;
  const jaula = new T.LineSegments(new T.EdgesGeometry(new T.IcosahedronGeometry(R, alta ? 2 : 1)), new T.LineBasicMaterial({ color: 0xcfd8e6 })); drum.add(jaula);
  const cristal = new T.Mesh(new T.SphereGeometry(R * .99, 24, 16), new T.MeshStandardMaterial({ color: 0x9fd4ff, transparent: true, opacity: .13, roughness: .2, depthWrite: false })); drum.add(cristal);
  const aro = new T.Mesh(new T.TorusGeometry(R, .06, 8, 40), new T.MeshStandardMaterial({ color: 0xc9a227, metalness: .6, roughness: .35 })); drum.add(aro);
  const patas = new T.Mesh(new T.BoxGeometry(.22, R * 1.1, .22), new T.MeshStandardMaterial({ color: 0x8a5a2b, roughness: .6 }));
  const pata1 = patas.clone(), pata2 = patas.clone(); pata1.position.set(-R * .55, -R * 1.2, 0); pata1.rotation.z = .35; pata2.position.set(R * .55, -R * 1.2, 0); pata2.rotation.z = -.35; bombo.add(pata1, pata2);
  const manivela = new T.Mesh(new T.BoxGeometry(R * .7, .12, .12), new T.MeshStandardMaterial({ color: 0xc9a227, metalness: .5, roughness: .4 })); manivela.position.set(R * 1.05, 0, 0); drum.add(manivela);
  const boca = new T.Mesh(new T.CylinderGeometry(.42, .55, .7, 16, 1, true), new T.MeshStandardMaterial({ color: 0xb8c2d0, metalness: .5, roughness: .35, side: T.DoubleSide })); bombo.add(boca);
  const interiores = [], nI = alta ? 18 : 8, geoI = new T.SphereGeometry(.36, 14, 10);
  for (let i = 0; i < nI; i++) { const m = new T.Mesh(geoI, new T.MeshStandardMaterial({ color: new T.Color(COLORES_FILA[i % 9]), roughness: .4 })); m.userData = { a: Math.random() * 6.28, r: .5 + Math.random() * (R - 1), w: (Math.random() < .5 ? -1 : 1) * (.6 + Math.random() * .8), z: (Math.random() - .5) * 1.6, ph: Math.random() * 6 }; drum.add(m); interiores.push(m); }

  /* ----- carril ----- */
  let carril = null, curva = null;
  /* ----- disposición según el formato de la pantalla ----- */
  function disponer() {
    const r = cont.getBoundingClientRect(), asp = Math.max(.3, r.width / Math.max(1, r.height)), vertical = asp < 1.25;
    let cx, cy, ancho, alto;
    if (vertical) { bombo.position.set(-2.2, 8.4, 0); tablero.position.set(0, 0, 0); L = { vertical, sal: new T.Vector3(-2.2 + R * .52, 8.4 - R * .98, .6), fin: new T.Vector3(3.6, 5.9, .6) }; cx = 0; cy = 5.7; ancho = 11.6; alto = 17; }
    else { bombo.position.set(-8.3, .6, 0); tablero.position.set(2.6, 0, 0); L = { vertical, sal: new T.Vector3(-8.3 + R * .52, .6 - R * .98, .6), fin: new T.Vector3(-3.2, 5.6, .6) }; cx = -2.5; cy = 1.6; ancho = 20.8; alto = 11.6; }
    boca.position.set(L.sal.x - (vertical ? .0 : 0) - .2, L.sal.y + .25, .2); boca.rotation.z = .35;
    pata1.position.y = pata2.position.y = -R * 1.2;
    // carril: del pico del bombo hasta encima del tablero
    const a = L.sal.clone(), d = L.fin.clone();
    const pts = [a, new T.Vector3(a.x + .5, a.y - 1.1, .6), new T.Vector3((a.x + d.x) / 2, Math.min(a.y, d.y) + (a.y - d.y) * .45 - .6, .6), d];
    curva = new T.CatmullRomCurve3(pts);
    if (carril) { esc.remove(carril); carril.geometry.dispose(); }
    carril = new T.Mesh(new T.TubeGeometry(curva, 32, .3, 8, false), new T.MeshStandardMaterial({ color: 0x9fb0c4, metalness: .55, roughness: .35, transparent: true, opacity: .55 })); carril.position.z = -.25; esc.add(carril);
    // cámara
    const tan = Math.tan(16 * Math.PI / 180) * 2, d0 = Math.max(alto * 1.06 / tan, ancho * 1.06 / (tan * asp));
    E.C.tx = E.C.objTx = cx; E.C.ty = cy; E.C.dist = E.C.objDist = E.base = d0; E.camara({ az: 0, pol: 1.5, dist: d0 }); E.marcar();
  }
  E.iniciar(); disponer();
  const ro = new ResizeObserver(() => { if (vivo) disponer(); }); ro.observe(cont);

  /* ----- animación continua del bombo ----- */
  let giro = .25, giroObj = .25, ocupado = false, ult = performance.now(), par = 0;
  E.alFrame = ahora => {
    const dt = Math.min(.05, (ahora - ult) / 1000); ult = ahora; par++;
    if (!ocupado && !o.siempre && (par & 1)) return false;                       // en reposo se dibuja a la mitad de fotogramas
    giro += (giroObj - giro) * Math.min(1, dt * 6); drum.rotation.z -= giro * dt;
    for (const m of interiores) { const u = m.userData; u.a += u.w * giro * dt * 1.6; m.position.set(Math.cos(u.a) * u.r, Math.sin(u.a * 1.3 + u.ph) * u.r * .8 - .2, u.z * Math.cos(u.a * .7)); }
    return true;
  };
  E.alTocar = ev => { if (!o.alTocarBombo) return; const h = E.raycast(ev, [jaula, cristal, boca, aro]); if (h.length) o.alTocarBombo(); };
  const nuevaBola = n => {
    const m = new T.Mesh(new T.SphereGeometry(1, seg[0], seg[1]), new T.MeshStandardMaterial({ map: tex(n, true), roughness: .4, emissive: 0xffffff, emissiveMap: tex(n, true), emissiveIntensity: .2 }));
    m.scale.setScalar(.01); esc.add(m); return m;
  };
  const rodar = (m, d) => { m.rotation.x += d * 2.2; m.rotation.y += d * .7; };
  async function sacar(n, cb = {}) {
    if (!vivo) return; ocupado = true;
    giroObj = 4.2; if (cb.alAgitar) cb.alAgitar();
    await E.tween(1100, () => {});
    const R1 = L.vertical ? 1.15 : 1.05, big = nuevaBola(n), c0 = bombo.position.clone(); c0.z = .4;
    await E.tween(380, u => { const k = suave(u); big.position.lerpVectors(c0, L.sal, k); big.scale.setScalar(.2 + (R1 - .2) * k); rodar(big, .06); });
    giroObj = .25; if (cb.alSalir) cb.alSalir();
    let t0 = 0; await E.tween(1500, u => { const k = suave(u); const p = curva.getPointAt(k); big.position.set(p.x, p.y + R1 * .2, p.z + .35); rodar(big, (k - t0) * 9); t0 = k; });
    const fin = L.fin.clone(), dst = new T.Vector3(); tablero.localToWorld(dst.set(pos(n).x, pos(n).y, .1));
    await E.tween(750, u => { const k = suave(u); big.position.lerpVectors(fin, dst, k); big.position.z += Math.sin(Math.PI * k) * 1.6; big.scale.setScalar(R1 + (.42 - R1) * k); rodar(big, .05); });
    esc.remove(big); big.geometry.dispose(); big.material.dispose();
    encender(n, true); ocupado = false; if (cb.alLlegar) cb.alLlegar(); E.marcar();
  }
  return {
    es3d: true, sacar, ocupado: () => ocupado,
    encender: n => { encender(n, false); E.marcar(); }, reiniciar: () => apagarTodas(),
    destruir: () => { vivo = false; ro.disconnect(); for (const m of [...offTex.values(), ...litTex.values()]) m.dispose(); E.destruir(); },
  };
}

/* ---------- versión 2D (sin WebGL) ---------- */
function crearVista2D(cont) {
  cont.innerHTML = '<div class="bg2d" role="img" aria-label="Tablero del bingo"><div class="bg2d-g"></div><div class="bg2d-b" hidden></div></div>';
  const g = cont.querySelector('.bg2d-g'), big = cont.querySelector('.bg2d-b'), celdas = [];
  for (let n = 1; n <= 90; n++) { const c = document.createElement('i'); c.textContent = n; c.style.setProperty('--c', colBola(n)); g.append(c); celdas[n] = c; }
  let ocupado = false;
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  async function sacar(n, cb = {}) {
    ocupado = true; if (cb.alAgitar) cb.alAgitar();
    big.hidden = false; big.textContent = n; big.style.setProperty('--c', colBola(n)); big.className = 'bg2d-b rueda';
    await esperar(1100); if (cb.alSalir) cb.alSalir(); await esperar(1500);
    big.className = 'bg2d-b cae'; await esperar(700); big.hidden = true; celdas[n].classList.add('on'); ocupado = false; if (cb.alLlegar) cb.alLlegar();
  }
  return { es3d: false, sacar, ocupado: () => ocupado, encender: n => celdas[n] && celdas[n].classList.add('on'), reiniciar: () => celdas.forEach(c => c && c.classList.remove('on')), destruir: () => { cont.innerHTML = ''; } };
}
