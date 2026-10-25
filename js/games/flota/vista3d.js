// Vista 3D de Hundir la Flota (Three.js): mar con barcos en relieve, chapoteos, fuego y barcos hundidos.
// Solo dibuja el tablero grande (colocar tu flota / disparar al mar enemigo); el juego le pasa los datos y recibe los toques.
//   const V = await crearFlota3D(contenedor, { alCelda(i) })
//   V.pintar({ n, barcos: [{ k, celdas, len, v, hundido, marcado }], tiros: [0 libre|1 agua|2 tocado|3 hundido|4 deducida], ult, pista, etiquetas })
//   V.recolor() (lee --m1 --m2 --ml --bc --bc2 del contenedor) · V.camara(modo) · V.destruir()
import { lienzoTextura } from '../../core/fichas.js';
import { T, crearEscena, lienzo, textura, emojiTextura, suave } from '../../core/escena3d.js';

export async function crearFlota3D(cont, o = {}) {
  const E = crearEscena(cont, { fov: 36, pol: .8, polMin: .2, polMax: 1.25, radio: 6.4, margen: 1.6, distMin: 6, distMax: 34, sombraRadio: 9, sol: { pos: [-4, 12, 7], int: 2.1 }, hemi: { int: 1.9 }, sueloY: -.4,
    etiqueta: 'Tablero de Hundir la flota en 3D: toca una casilla; arrastra para girar la vista' });
  const V = { E }, raiz = new T.Group(); E.escena.add(raiz);
  const mAgua = [new T.MeshStandardMaterial({ roughness: .25, metalness: .05 }), new T.MeshStandardMaterial({ roughness: .25, metalness: .05 })];
  const mCaja = new T.MeshStandardMaterial({ roughness: .6 }), mCasco = new T.MeshStandardMaterial({ roughness: .45, metalness: .15 }), mCabina = new T.MeshStandardMaterial({ roughness: .5, metalness: .1 });
  const mHund = new T.MeshStandardMaterial({ color: '#2b2f3a', roughness: .8 });
  const mLinea = new T.LineBasicMaterial({ transparent: true });
  let n = 0, celdas = [], barcosG = new T.Group(), marcasG = new T.Group(), rotulos = null, tirosPrev = [], nPrev = -1;
  raiz.add(barcosG, marcasG);
  const pos = i => [(i % n) - (n - 1) / 2, ((i / n) | 0) - (n - 1) / 2];
  function construirMar() {
    while (raiz.children.length > 2) { const x = raiz.children[raiz.children.length - 1]; raiz.remove(x); x.traverse(q => { if (q.geometry) q.geometry.dispose(); if (q.material && q.material.map) q.material.map.dispose(); }); }
    celdas = []; tirosPrev = []; const c = new T.Mesh(new T.BoxGeometry(n + .7, .4, n + .7), mCaja); c.position.y = -.22; c.receiveShadow = true; raiz.add(c);
    const g = new T.BoxGeometry(.98, .1, .98);
    for (let i = 0; i < n * n; i++) { const [x, z] = pos(i); const m = new T.Mesh(g, mAgua[(Math.floor(i / n) + i) % 2]); m.position.set(x, -.04, z); m.receiveShadow = true; m.userData.i = i; raiz.add(m); celdas.push(m); }
    // rótulos de filas (A…) y columnas (1…)
    const cl = lienzo(64 * n, 64), x1 = cl.getContext('2d'); x1.fillStyle = 'rgba(255,255,255,.9)'; x1.font = '800 38px Nunito, sans-serif'; x1.textAlign = 'center'; x1.textBaseline = 'middle';
    for (let k = 0; k < n; k++) x1.fillText(String(k + 1), 32 + k * 64, 34);
    const a = new T.Mesh(new T.PlaneGeometry(n, 1), new T.MeshBasicMaterial({ map: textura(cl), transparent: true, depthWrite: false })); a.rotation.x = -Math.PI / 2; a.position.set(0, -.18 + .2 + .0, -(n / 2) - .02 - .02); a.position.y = .002 - .0; a.position.z = -(n / 2) - .05; raiz.add(a);
    const cr = lienzo(64, 64 * n), x2 = cr.getContext('2d'); x2.fillStyle = 'rgba(255,255,255,.9)'; x2.font = '800 38px Nunito, sans-serif'; x2.textAlign = 'center'; x2.textBaseline = 'middle';
    for (let k = 0; k < n; k++) x2.fillText('ABCDEFGHIJKL'[k], 32, 34 + k * 64);
    const b = new T.Mesh(new T.PlaneGeometry(1, n), new T.MeshBasicMaterial({ map: textura(cr), transparent: true, depthWrite: false })); b.rotation.x = -Math.PI / 2; b.position.set(-(n / 2) - .05, .002, 0); raiz.add(b);
    E.tocables = celdas; E.base = null; E.redimensionar(); E.marcar();
  }
  // ----- barcos -----
  function barco(b, muerto) {
    const L = Math.max(.7, b.len - .12), W = b.len === 1 ? .52 : .66, g = new T.Group();
    const s = new T.Shape(); s.moveTo(-L / 2, -W / 2); s.lineTo(L / 2 - Math.min(.45, L * .35), -W / 2); s.quadraticCurveTo(L / 2, -W / 2, L / 2, 0); s.quadraticCurveTo(L / 2, W / 2, L / 2 - Math.min(.45, L * .35), W / 2); s.lineTo(-L / 2, W / 2); s.closePath();
    const hg = new T.ExtrudeGeometry(s, { depth: .22, bevelEnabled: true, bevelSize: .04, bevelThickness: .03, bevelSegments: 2 }); hg.rotateX(-Math.PI / 2);
    const casco = new T.Mesh(hg, muerto ? mHund : mCasco); casco.castShadow = true; g.add(casco);
    if (b.len === 1) { const t = new T.Mesh(new T.CylinderGeometry(.09, .12, .22, 12), muerto ? mHund : mCabina); t.position.set(-.02, .38, 0); t.castShadow = true; g.add(t); }
    else {
      const nc = Math.max(1, Math.min(3, b.len - 1));
      for (let k = 0; k < nc; k++) { const cab = new T.Mesh(new T.BoxGeometry(.34, .2 + (k === 0 ? .1 : 0), W * .6), muerto ? mHund : mCabina); cab.position.set(-L / 2 + .38 + k * (L - .9) / Math.max(1, nc - 1 || 1) * (nc > 1 ? 1 : 0), .36 + (k === 0 ? .05 : 0), 0); cab.castShadow = true; g.add(cab); }
      if (b.len >= 3) { const ch = new T.Mesh(new T.CylinderGeometry(.08, .1, .3, 12), muerto ? mHund : mCasco); ch.position.set(-L / 2 + .38, .62, 0); g.add(ch); }
    }
    return g;
  }
  const gMarca = new T.CylinderGeometry(.16, .16, .05, 18), gAro = new T.RingGeometry(.28, .4, 28), gOnda = new T.RingGeometry(.2, .3, 28);
  V.pintar = S => {
    if (S.n !== nPrev) { n = S.n; nPrev = n; construirMar(); }
    while (barcosG.children.length) barcosG.remove(barcosG.children[0]);
    while (marcasG.children.length) marcasG.remove(marcasG.children[0]);
    for (const b of S.barcos || []) {
      if (!b.celdas) continue; const g = barco(b, b.hundido), [x0, z0] = pos(b.celdas[0]), [x1, z1] = pos(b.celdas[b.celdas.length - 1]);
      g.position.set((x0 + x1) / 2, .02, (z0 + z1) / 2); if (b.v) g.rotation.y = -Math.PI / 2;
      if (b.hundido) { g.position.y = -.12; g.rotation.z = .22; }
      if (b.marcado) { const a = new T.Mesh(new T.RingGeometry(.1, .14, 4), new T.MeshBasicMaterial({ color: '#FFD93D', side: T.DoubleSide })); a.visible = false; g.add(a); g.position.y += .12; const l = new T.Mesh(new T.BoxGeometry(Math.max(.7, b.len - .1) + .3, .03, .9), new T.MeshBasicMaterial({ color: '#FFD93D', transparent: true, opacity: .35 })); l.position.y = -.16; g.add(l); }
      g.scale.setScalar(estF.esc); barcosG.add(g);
    }
    const nuevos = [];
    S.tiros.forEach((t, i) => {
      if (!t) return; const [x, z] = pos(i), g = new T.Group(); g.position.set(x, .02, z);
      if (t === 1) { const d = new T.Mesh(gMarca, new T.MeshStandardMaterial({ color: '#FFFFFF', roughness: .5, transparent: true, opacity: .92 })); d.position.y = .03; g.add(d); const r = new T.Mesh(gOnda, new T.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: .55, side: T.DoubleSide })); r.rotation.x = -Math.PI / 2; r.position.y = .01; g.add(r); }
      else if (t === 4) { const d = new T.Mesh(new T.CylinderGeometry(.08, .08, .03, 12), new T.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: .35 })); d.position.y = .02; g.add(d); }
      else { const sp = new T.Sprite(new T.SpriteMaterial({ map: emojiTextura(t === 3 ? '💥' : '🔥', 96), transparent: true, depthWrite: false })); sp.scale.set(.75, .75, .75); sp.position.y = .62; g.add(sp); const c = new T.Mesh(new T.ConeGeometry(.15, .22, 12), new T.MeshStandardMaterial({ color: '#FF5A1F', emissive: '#FF3B00', emissiveIntensity: .6 })); c.position.y = .22; g.add(c); }
      if (tirosPrev.length && tirosPrev[i] !== t && S.animar !== false) { nuevos.push(g); g.scale.setScalar(.01); }
      marcasG.add(g);
    });
    for (const g of nuevos) E.tween(420, t => { const e = suave(t), r = 1 + Math.sin(t * Math.PI) * .35; g.scale.setScalar(Math.max(.01, e * r)); });
    tirosPrev = S.tiros.slice();
    const sob = (i, color, op) => { if (i == null || i < 0) return; const [x, z] = pos(i); const m = new T.Mesh(gAro, new T.MeshBasicMaterial({ color, transparent: true, opacity: op, side: T.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, .045, z); marcasG.add(m); };
    sob(S.ult, '#FFD93D', .9); sob(S.pista, '#4DA3FF', .95);
    E.marcar();
  };
  let estF = { tex: null, esc: 1 }, mapaF = null;
  V.fichas = e => {                                                      // 🚢 Apariencia: textura y tamaño de los barcos (el color llega en --bc/--bc2)
    if (e.tex === estF.tex && e.esc === estF.esc) return; const nt = e.tex !== estF.tex; estF = { tex: e.tex, esc: e.esc };
    if (nt) { if (mapaF) mapaF.dispose(); mapaF = e.tex ? textura(lienzoTextura('#FFFFFF', { tex: e.tex, forma: null }, 128)) : null; mCasco.map = mapaF; mCasco.needsUpdate = true; mCabina.map = mapaF; mCabina.needsUpdate = true; }
    for (const g of barcosG.children) g.scale.setScalar(e.esc);
    E.marcar();
  };
  V.recolor = () => {
    const s = getComputedStyle(cont), v = nm => s.getPropertyValue(nm).trim() || '#2F80ED';
    mAgua[0].color.set(v('--m1')); mAgua[1].color.set(new T.Color(v('--m1')).lerp(new T.Color(v('--m2')), .45)); mCaja.color.set(v('--m2'));
    mCasco.color.set(v('--bc')); mCabina.color.set(v('--bc2')); E.marcar();
  };
  E.alTocar = ev => { const h = E.raycast(ev, celdas)[0]; if (h && h.object.userData.i != null && o.alCelda) o.alCelda(h.object.userData.i); };
  V.camara = E.camara; V.destruir = () => E.destruir();
  V.recolor(); E.iniciar();
  return V;
}
