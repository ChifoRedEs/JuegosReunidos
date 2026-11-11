// Vista 3D del Billar (Three.js). La física y las reglas siguen en motor.js; esto solo dibuja la mesa, las bolas y el taco.
//   const V = await crearBillar3D(contenedor, { ancho, alto, M, alApuntar(ev, fase) })
//   V.mesa(canvas) → textura de la mesa (madera + tapete + troneras, dibujada por el juego) · V.madera('#hex')
//   V.sup (ctx) → lámina transparente sobre el tapete (guía de apuntado) · V.supListo() tras dibujar en ella
//   V.pintar({ bolas: [{ id, x, y, fuera, color, raya, num }], r, taco: null | { x, y, ang, sep, c1, c2 } })
//   V.aMesa(ev) → [x, y] en coordenadas de la mesa del motor · V.camara(modo) · V.destruir()
import { T, crearEscena, lienzo, textura } from '../../core/escena3d.js';

const S = .02;                                                  // unidades del motor → unidades del mundo (la mesa mide 10 × 20)
const RAIL = .5;

export async function crearBillar3D(cont, o) {
  const W = o.ancho, H = o.alto, M = o.M, TW = (W + 2 * M) * S, TH = (H + 2 * M) * S;
  const E = crearEscena(cont, { fov: 36, pol: .34, polMin: .1, polMax: 1.2, radio: TW / 2 + .5, margen: 1.5, distMin: 8, distMax: 60, sombraRadio: 13, sol: { pos: [-4, 16, 5], int: 2.3 }, hemi: { int: 1.7 }, sueloY: -.62,
    etiqueta: 'Mesa de billar en 3D: toca o arrastra sobre el tapete para apuntar' });
  const V = { E }, g = new T.Group(); E.escena.add(g);
  // ----- mesa -----
  const matFieltro = new T.MeshStandardMaterial({ roughness: .95 }), matMadera = new T.MeshStandardMaterial({ roughness: .55 });
  const base = new T.Mesh(new T.BoxGeometry(TW, .6, TH), matMadera); base.position.y = -.31; base.receiveShadow = true; g.add(base);
  const fieltro = new T.Mesh(new T.PlaneGeometry(TW, TH), matFieltro); fieltro.rotation.x = -Math.PI / 2; fieltro.receiveShadow = true; fieltro.position.y = .002; g.add(fieltro);
  const cx = 0, cz = 0, gx = W * S, gz = H * S, bw = M * S;
  const rails = [[gx + 2 * bw, bw, 0, -(gz / 2 + bw / 2)], [gx + 2 * bw, bw, 0, gz / 2 + bw / 2], [bw, gz, -(gx / 2 + bw / 2), 0], [bw, gz, gx / 2 + bw / 2, 0]];
  for (const [w, d, x, z] of rails) { const m = new T.Mesh(new T.BoxGeometry(w, RAIL, d), matMadera); m.position.set(cx + x, RAIL / 2, cz + z); m.castShadow = true; m.receiveShadow = true; g.add(m); }
  // acolchado interior de las bandas (misma tela, más oscura)
  const matAcol = new T.MeshStandardMaterial({ roughness: .95 }); V._acol = matAcol;
  for (const [w, d, x, z] of [[gx, .14, 0, -(gz / 2 + .07)], [gx, .14, 0, gz / 2 + .07], [.14, gz + .28, -(gx / 2 + .07), 0], [.14, gz + .28, gx / 2 + .07, 0]]) { const m = new T.Mesh(new T.BoxGeometry(w, RAIL * .72, d), matAcol); m.position.set(x, RAIL * .36, z); g.add(m); }
  let texMesa = null;
  V.mesa = canvas => { if (texMesa) texMesa.dispose(); texMesa = textura(canvas, 8); matFieltro.map = texMesa; matFieltro.needsUpdate = true; E.marcar(); };
  V.madera = (c, fieltroColor) => { matMadera.color.set(c); matAcol.color.set(fieltroColor || '#1F8A4C').multiplyScalar(.78); E.marcar(); };
  // lámina de guías sobre el tapete (se dibuja en 2D y se proyecta)
  const ps = .9, sc = lienzo(Math.round((W + 2 * M) * ps), Math.round((H + 2 * M) * ps)), sctx = sc.getContext('2d'), tSup = textura(sc, 4);
  const sup = new T.Mesh(new T.PlaneGeometry(TW, TH), new T.MeshBasicMaterial({ map: tSup, transparent: true, depthWrite: false })); sup.rotation.x = -Math.PI / 2; sup.position.y = .012; sup.renderOrder = 2; g.add(sup);
  V.sup = sctx; V.supEsc = ps; V.supCanvas = sc;
  V.supListo = () => { tSup.needsUpdate = true; E.marcar(); };
  // ----- bolas -----
  const bolasG = new T.Group(); g.add(bolasG); const mallas = new Map(), texCache = new Map();
  function texBola(b) {
    const k = [b.id, b.color, b.raya ? 1 : 0, b.num ? 1 : 0].join('|'); if (texCache.has(k)) return texCache.get(k);
    const c = lienzo(256, 128), x = c.getContext('2d');
    x.fillStyle = b.raya ? '#FBFAF5' : b.color; x.fillRect(0, 0, 256, 128); if (b.raya) { x.fillStyle = b.color; x.fillRect(0, 34, 256, 60); }
    if (b.num && b.id) for (const u of [64, 192]) {
      x.fillStyle = '#fff'; x.beginPath(); x.arc(u, 64, 27, 0, 7); x.fill(); x.fillStyle = '#111'; x.font = `900 ${b.id > 9 ? 30 : 36}px Nunito, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(b.id), u, 66);
    }
    const t = textura(c, 4); texCache.set(k, t); return t;
  }
  let gBola = null, rBola = 0;
  V.pintar = Sx => {
    const r = Sx.r * S;
    if (!gBola || rBola !== r) { rBola = r; gBola = new T.SphereGeometry(r, 36, 26); for (const m of mallas.values()) { bolasG.remove(m); } mallas.clear(); }
    for (const b of Sx.bolas) {
      let m = mallas.get(b.id);
      const sig = [b.color, b.raya, b.num].join();
      if (m && m.userData.sig !== sig) { bolasG.remove(m); mallas.delete(b.id); m = null; }
      if (!m) { m = new T.Mesh(gBola, new T.MeshStandardMaterial({ map: texBola(b), roughness: .22, metalness: .02 })); m.castShadow = true; m.userData = { sig, px: null, pz: null }; bolasG.add(m); mallas.set(b.id, m); m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); }
      m.visible = !b.fuera; const wx = (b.x - W / 2) * S, wz = (b.y - H / 2) * S;
      if (m.userData.px != null) {                                         // rodar: giro alrededor del eje perpendicular al avance
        const dx = wx - m.userData.px, dz = wz - m.userData.pz, d = Math.hypot(dx, dz);
        if (d > 1e-5) { const q = new T.Quaternion().setFromAxisAngle(new T.Vector3(dz / d, 0, -dx / d), d / r); m.quaternion.premultiply(q); }
      }
      m.userData.px = wx; m.userData.pz = wz; m.position.set(wx, r, wz);
    }
    // taco
    if (Sx.taco) {
      if (!taco) crearTaco(); const t = Sx.taco, dx = Math.cos(t.ang), dy = Math.sin(t.ang);
      taco.visible = true; taco.position.set((t.x - dx * t.sep - W / 2) * S, r, (t.y - dy * t.sep - H / 2) * S); taco.rotation.set(0, -t.ang, -.09);
      if (taco.userData.c1 !== t.c1 || taco.userData.c2 !== t.c2) { taco.userData.c1 = t.c1; taco.userData.c2 = t.c2; tacoMats[0].color.set(t.c1); tacoMats[1].color.set(t.c2); }
    } else if (taco) taco.visible = false;
    E.marcar();
  };
  let taco = null; const tacoMats = [new T.MeshStandardMaterial({ roughness: .5 }), new T.MeshStandardMaterial({ roughness: .5 })];
  function crearTaco() {
    taco = new T.Group(); taco.rotation.order = 'YXZ';
    const L = 6.6, mk = (r0, r1, l, x, mat) => { const c = new T.Mesh(new T.CylinderGeometry(r1, r0, l, 14), mat); c.rotation.z = Math.PI / 2; c.position.x = x; c.castShadow = true; taco.add(c); return c; };
    mk(.08, .07, .12, -.06, new T.MeshStandardMaterial({ color: '#3A6FD8', roughness: .8 }));                    // tiza
    mk(.1, .08, .1, -.17, new T.MeshStandardMaterial({ color: '#F1ECE1', roughness: .5 }));                       // virola
    mk(.16, .1, L * .55, -.22 - L * .275, tacoMats[0]);                                                             // fuste
    mk(.24, .16, L * .45, -.22 - L * .55 - L * .225, tacoMats[1]);                                                  // culata
    g.add(taco); taco.visible = false;
  }
  // ----- entrada -----
  V.aMesa = ev => { const p = E.plano(ev, rBola || .34); return p ? [p.x / S + W / 2, p.z / S + H / 2] : [W / 2, H / 2]; };
  E.alArrastrar = (ev, dx, dy, fase) => { if (!o.alApuntar) return false; if (fase === 'ini') return !!o.alApuntar(ev, 'ini'); o.alApuntar(ev, fase); return true; };
  V.camara = E.camara; V.destruir = () => E.destruir();
  E.iniciar();
  return V;
}
