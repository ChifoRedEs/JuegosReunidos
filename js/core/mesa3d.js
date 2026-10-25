// Tablero 3D de casillas cuadradas (Ajedrez y Damas). Solo dibuja: el juego le pasa la posición y recibe los toques.
//   const M = await crearMesa3D(contenedor, { n: 8, juego: 'ajedrez' | 'damas', alTocar(r, c), colores, forma })
//   M.pintar({ piezas: [{ r, c, t, col, emoji? }], ult: [[r, c]], sel: [[r, c]], dest: [[r, c, captura?]], jaque: [r, c] | null, pista: [[r, c]], flip })
//   t (ajedrez) = 'P' 'N' 'B' 'R' 'Q' 'K' · t (damas) = 'man' | 'rey' · col = 0 (blancas, abajo) | 1 (negras)
//   M.colores({ claro, oscuro, marco, p0, p1 }) · M.camara(modo) · M.destruir()
import { T, crearEscena, suave, textura, lienzo, emojiTextura } from './escena3d.js';
import { lienzoTextura } from './fichas.js';

const lathe = (pts, seg = 28) => new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y)), seg);
const BASE = [[0, 0], [.38, 0], [.4, .04], [.4, .09], [.34, .14], [.3, .17]];
function geoPieza(t) {                    // devuelve una lista de [geometría, x, y, z, rotY?]
  switch (t) {
    case 'P': return [[lathe([...BASE, [.17, .28], [.13, .4], [.22, .44], [.2, .5], [.1, .52], [0, .52]])], [new T.SphereGeometry(.19, 20, 14), 0, .66, 0]];
    case 'R': { const p = [[lathe([...BASE, [.27, .3], [.24, .52], [.33, .58], [.33, .7], [0, .7]])]]; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; p.push([new T.BoxGeometry(.13, .12, .13), Math.cos(a) * .25, .76, Math.sin(a) * .25, -a]); } return p; }
    case 'B': return [[lathe([...BASE, [.21, .3], [.14, .44], [.21, .54], [.2, .66], [.1, .82], [0, .86]])], [new T.SphereGeometry(.065, 12, 10), 0, .9, 0], [new T.BoxGeometry(.04, .2, .24), 0, .72, 0, 0.0]];
    case 'Q': { const p = [[lathe([...BASE, [.23, .3], [.17, .5], [.27, .72], [.31, .84], [.2, .88], [0, .88]])], [new T.SphereGeometry(.075, 12, 10), 0, 1.0, 0]]; for (let k = 0; k < 7; k++) { const a = k * Math.PI * 2 / 7; p.push([new T.ConeGeometry(.055, .16, 6), Math.cos(a) * .24, .92, Math.sin(a) * .24]); } return p; }
    case 'K': return [[lathe([...BASE, [.25, .3], [.19, .5], [.29, .72], [.31, .84], [.17, .9], [0, .9]])], [new T.BoxGeometry(.09, .34, .09), 0, 1.1, 0], [new T.BoxGeometry(.25, .09, .09), 0, 1.12, 0]];
    case 'N': {
      const s = new T.Shape(); const P = [[-.17, 0], [.2, 0], [.2, .16], [.3, .3], [.4, .4], [.42, .5], [.32, .54], [.22, .52], [.14, .68], [.05, .76], [-.02, .66], [-.13, .5], [-.21, .26]];
      s.moveTo(...P[0]); P.slice(1).forEach(q => s.lineTo(...q)); s.closePath();
      const g = new T.ExtrudeGeometry(s, { depth: .24, bevelEnabled: true, bevelThickness: .04, bevelSize: .035, bevelSegments: 3 }); g.translate(0, .22, -.12);
      return [[lathe([...BASE, [.24, .3], [.2, .4], [0, .42]])], [g, 0, 0, 0, 'cara']];
    }
  }
  return [];
}

export async function crearMesa3D(cont, o) {
  const n = o.n || 8, mitad = (n - 1) / 2, ajedrez = o.juego === 'ajedrez';
  const E = crearEscena(cont, { fov: 36, pol: .86, polMin: .22, polMax: 1.28, radio: n / 2 + .95, margen: 2.6, distMin: 6, distMax: 34, sombraRadio: n / 2 + 3, sol: { pos: [-4, 11, 8], int: 2.2 }, hemi: { int: 1.8 }, sueloY: -.32,
    etiqueta: ajedrez ? 'Tablero de ajedrez en 3D: toca una pieza y su casilla de destino; arrastra para girar' : 'Tablero de damas en 3D: toca una ficha y su casilla de destino; arrastra para girar' });
  const M = { E }, col = { claro: '#F0D9B5', oscuro: '#B58863', marco: '#5A3A22', p0: '#FFFFFF', p1: '#1E1E24', ...(o.colores || {}) };
  const pos = (r, c) => [c - mitad, r - mitad];
  // ----- tablero -----
  const marco = new T.Mesh(new T.BoxGeometry(n + .9, .34, n + .9), new T.MeshStandardMaterial({ color: col.marco, roughness: .6 })); marco.position.y = -.2; marco.receiveShadow = true; E.escena.add(marco);
  const matC = new T.MeshStandardMaterial({ color: col.claro, roughness: .7 }), matO = new T.MeshStandardMaterial({ color: col.oscuro, roughness: .7 });
  const gCas = new T.BoxGeometry(1, .06, 1), cas = [], ov = [], pun = [], aro = [];
  const matOv = new T.MeshBasicMaterial({ transparent: true, opacity: .5, depthWrite: false });
  const gPlano = new T.PlaneGeometry(.98, .98), gPunto = new T.CircleGeometry(.17, 20), gAro = new T.RingGeometry(.36, .47, 28);
  const squares = new T.Group(); E.escena.add(squares);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const [x, z] = pos(r, c), clara = ajedrez ? (r + c) % 2 === 0 : (r + c) % 2 === 0;
    const m = new T.Mesh(gCas, clara ? matC : matO); m.position.set(x, -.03 + .0, z); m.receiveShadow = true; m.userData.rc = [r, c]; squares.add(m); cas.push(m);
    const p = new T.Mesh(gPlano, matOv.clone()); p.rotation.x = -Math.PI / 2; p.position.set(x, .004, z); p.visible = false; E.escena.add(p); ov.push(p);
    const d = new T.Mesh(gPunto, new T.MeshBasicMaterial({ color: '#1FAA59', transparent: true, opacity: .8, depthWrite: false })); d.rotation.x = -Math.PI / 2; d.position.set(x, .008, z); d.visible = false; E.escena.add(d); pun.push(d);
    const a = new T.Mesh(gAro, new T.MeshBasicMaterial({ color: '#E5484D', transparent: true, opacity: .85, depthWrite: false, side: T.DoubleSide })); a.rotation.x = -Math.PI / 2; a.position.set(x, .009, z); a.visible = false; E.escena.add(a); aro.push(a);
  }
  // etiquetas de coordenadas (a-h / 8-1) en el marco, solo en ajedrez
  if (ajedrez) {
    const cl = lienzo(512, 64), x = cl.getContext('2d'); x.fillStyle = 'rgba(255,255,255,.85)'; x.font = '800 40px Nunito, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let f = 0; f < 8; f++) x.fillText('abcdefgh'[f], 32 + f * 64, 34);
    const tl = textura(cl), mt = new T.MeshBasicMaterial({ map: tl, transparent: true, depthWrite: false });
    const fa = new T.Mesh(new T.PlaneGeometry(8, 1), mt); fa.rotation.x = -Math.PI / 2; fa.position.set(0, .002, 4.25); E.escena.add(fa);
    const cr = lienzo(64, 512), y = cr.getContext('2d'); y.fillStyle = 'rgba(255,255,255,.85)'; y.font = '800 40px Nunito, sans-serif'; y.textAlign = 'center'; y.textBaseline = 'middle';
    for (let k = 0; k < 8; k++) y.fillText(String(8 - k), 32, 32 + k * 64);
    const mr = new T.MeshBasicMaterial({ map: textura(cr), transparent: true, depthWrite: false });
    const ra = new T.Mesh(new T.PlaneGeometry(1, 8), mr); ra.rotation.x = -Math.PI / 2; ra.position.set(-4.25, .002, 0); E.escena.add(ra);
  }
  // ----- piezas -----
  const piezasG = new T.Group(); E.escena.add(piezasG);
  const mats = [new T.MeshStandardMaterial({ color: col.p0, roughness: .38, metalness: .06 }), new T.MeshStandardMaterial({ color: col.p1, roughness: .38, metalness: .1 })];
  let estF = { tex: null, esc: 1 }, estK = '';       // 🎨 Fichas: textura y tamaño de las piezas
  const cacheGeo = {};
  const geos = t => cacheGeo[t] || (cacheGeo[t] = geoPieza(t));
  const matOro = new T.MeshStandardMaterial({ color: '#E8B923', roughness: .3, metalness: .5 });
  function crearPieza(p) {
    const g = new T.Group(); g.scale.setScalar(estF.esc); g.userData.t = p.t; g.userData.col = p.col; g.userData.emoji = p.emoji || '';
    if (ajedrez) {
      for (const [geo, x = 0, y = 0, z = 0, ex] of geos(p.t)) {
        const m = new T.Mesh(geo, mats[p.col]); m.castShadow = true; m.position.set(x, y, z);
        if (ex === 'cara') m.rotation.y = 0; else if (typeof ex === 'number') m.rotation.y = ex;
        g.add(m);
        if (ex === 'cara') { g.userData.cabeza = m; }
      }
      if (p.t === 'N') g.rotation.y = p.col === 0 ? Math.PI / 2 : -Math.PI / 2;       // el caballo mira hacia el rival
    } else {
      const forma = o.forma || 'disco', apilar = p.t === 'rey' ? 2 : 1;
      for (let k = 0; k < (p.emoji ? 0 : apilar); k++) {
        let geo;
        if (forma === 'gema') geo = new T.CylinderGeometry(.36, .4, .17, 8); else if (forma === 'cuadrada') geo = new T.BoxGeometry(.72, .17, .72); else geo = new T.CylinderGeometry(.37, .4, .17, 36);
        const m = new T.Mesh(geo, mats[p.col]); m.position.y = .085 + k * .17; m.castShadow = true; g.add(m);
        const ar = new T.Mesh(forma === 'cuadrada' ? new T.BoxGeometry(.52, .02, .52) : new T.TorusGeometry(forma === 'anillo' ? .27 : .25, forma === 'anillo' ? .045 : .02, 8, 32), mats[p.col === 0 ? 1 : 0]);
        if (forma !== 'cuadrada') ar.rotation.x = Math.PI / 2; ar.position.y = .17 + k * .17 + (forma === 'cuadrada' ? 0 : 0); ar.material = new T.MeshStandardMaterial({ color: p.col === 0 ? '#00000022' : '#ffffff', roughness: .5, transparent: true, opacity: forma === 'anillo' ? .5 : .28 }); g.add(ar);
      }
      if (p.t === 'rey' && !p.emoji) { const co = new T.Mesh(new T.TorusGeometry(.2, .05, 10, 24), matOro); co.rotation.x = Math.PI / 2; co.position.y = .17 * 2 + .05; g.add(co); const es = new T.Mesh(new T.OctahedronGeometry(.1), matOro); es.position.y = .17 * 2 + .15; es.scale.y = 1.2; g.add(es); }
      if (p.emoji) {                                                       // solo el avatar elegido, sobre una peana fina del color de la pieza
        const pe = new T.Mesh(forma === 'cuadrada' ? new T.BoxGeometry(.72, .06, .72) : new T.CylinderGeometry(.37, .4, .06, 36), mats[p.col]); pe.position.y = .03; pe.castShadow = true; g.add(pe);
        const sp = new T.Sprite(new T.SpriteMaterial({ map: emojiTextura(p.emoji, 128), transparent: true, depthWrite: false })); sp.scale.set(.85, .85, .85); sp.position.y = .5; g.add(sp);
        if (p.t === 'rey') { const co = new T.Mesh(new T.TorusGeometry(.3, .05, 10, 28), matOro); co.rotation.x = Math.PI / 2; co.position.y = .09; g.add(co); }
      }
    }
    return g;
  }
  let actuales = new Map();                      // 'r,c' -> grupo
  const clave = (r, c) => r + ',' + c;
  function colocarEn(g, r, c) { const [x, z] = pos(r, c); g.position.set(x, 0, z); g.userData.rc = [r, c]; }
  let ultFlip = null;
  M.pintar = S => {
    const nuevas = new Map(S.piezas.map(p => [clave(p.r, p.c), p]));
    const sig = new Map(), huerfanas = [];
    for (const [k, g] of actuales) {
      const p = nuevas.get(k);
      if (p && g.userData.t === p.t && g.userData.col === p.col && g.userData.emoji === (p.emoji || '')) sig.set(k, g); else huerfanas.push([k, g]);
    }
    const aniadir = [];
    for (const [k, p] of nuevas) if (!sig.has(k)) aniadir.push([k, p]);
    for (const [k, p] of aniadir) {
      const g = crearPieza(p); colocarEn(g, p.r, p.c); piezasG.add(g); sig.set(k, g);
      // busca la pieza «huérfana» del mismo color que más cerca estaba: es la que se ha movido hasta aquí
      let mejor = -1, md = 1e9;
      huerfanas.forEach(([, og], i) => {
        const promo = og.userData.t === 'P' || og.userData.t === 'man';           // un peón o ficha puede coronar y cambiar de tipo
        if (og.userData.col !== p.col || (og.userData.t !== p.t && !promo)) return;
        const [rr, cc] = og.userData.rc, d = Math.hypot(rr - p.r, cc - p.c); if (d < md) { md = d; mejor = i; }
      });
      if (mejor >= 0 && S.animar !== false) {
        const [[, og]] = huerfanas.splice(mejor, 1); const [ar, ac] = og.userData.rc; piezasG.remove(og); disponer(og);
        const [x0, z0] = pos(ar, ac), [x1, z1] = pos(p.r, p.c), salto = p.t === 'N' ? .7 : .28; g.position.set(x0, 0, z0); 
        E.tween(Math.min(520, 240 + md * 45), t => { const e = suave(t); g.position.set(x0 + (x1 - x0) * e, Math.sin(t * Math.PI) * salto, z0 + (z1 - z0) * e); });
      }
    }
    for (const [, og] of huerfanas) { const g = og; const s0 = g.scale.x; E.tween(S.animar === false ? 0 : 260, t => { g.scale.setScalar(Math.max(.001, s0 * (1 - suave(t)))); if (t >= 1) { piezasG.remove(g); disponer(g); } }); }
    actuales = sig;
    // marcas
    const ovC = (r, c) => ov[r * n + c];
    ov.forEach(p => { p.visible = false; }); pun.forEach(p => { p.visible = false; }); aro.forEach(p => { p.visible = false; });
    const col2 = (r, c, color, op) => { const p = ovC(r, c); if (!p) return; p.visible = true; p.material.color.set(color); p.material.opacity = op; };
    (S.ult || []).forEach(([r, c]) => col2(r, c, '#FFD93D', .42));
    (S.pista || []).forEach(([r, c]) => col2(r, c, '#4DA3FF', .55));
    (S.ruta || []).forEach(([r, c]) => col2(r, c, '#9BE15D', .55));
    if (S.jaque) col2(S.jaque[0], S.jaque[1], '#FF3B3B', .6);
    (S.sel || []).forEach(([r, c]) => col2(r, c, '#33D17A', .62));
    if (S.marcas !== false) (S.dest || []).forEach(([r, c, cap]) => { (cap ? aro : pun)[r * n + c].visible = true; });
    if (S.flip !== ultFlip) { ultFlip = S.flip; E.camara({ az: S.flip ? Math.PI : 0 }); }
    E.marcar();
  };
  function disponer(g) { g.traverse(x => { if (x.userData && x.userData.cabeza) { /* geometría compartida: no se libera */ } }); }
  M.colores = c => {
    Object.assign(col, c); matC.color.set(col.claro); matO.color.set(col.oscuro); marco.material.color.set(col.marco); mats[0].color.set(col.p0); mats[1].color.set(col.p1); E.marcar();
  };
  M.fichas = e => {
    const k = (e.tex || '') + '|' + e.esc; if (k === estK) return; estK = k; estF = { tex: e.tex, esc: e.esc };
    const mapa = e.tex ? textura(lienzoTextura('#FFFFFF', { tex: e.tex, forma: null }, 128)) : null;
    for (const m of mats) { if (m.map) m.map.dispose(); m.map = mapa; m.needsUpdate = true; }
    for (const g of actuales.values()) g.scale.setScalar(e.esc);
    E.marcar();
  };
  M.camara = E.camara;
  E.tocables = [squares, piezasG];
  E.alTocar = ev => {
    const hits = E.raycast(ev, [squares, piezasG]);
    for (const h of hits) { let x = h.object; while (x && !x.userData.rc) x = x.parent; if (x && x.userData.rc) { const [r, c] = x.userData.rc; if (o.alTocar) o.alTocar(r, c); return; } }
  };
  M.destruir = () => E.destruir();
  E.iniciar();
  return M;
}
