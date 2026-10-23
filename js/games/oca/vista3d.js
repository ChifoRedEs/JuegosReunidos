// Vista 3D del Juego de la Oca (Three.js): tablero en espiral 8×8 con casillas en relieve y fichas con forma de peón.
//   const V = await crearOca3D(contenedor, { espiral, casillas })   (espiral[n] = [fila, col]; casillas[n] = { tipo, ico, nombre })
//   V.pintar({ fichas: [{ j, color, f, c, dx, dz, emoji, turno, mueve }] }) · V.recolor() (lee las variables --o-* del contenedor) · V.camara(modo) · V.destruir()
import { T, crearEscena, lienzo, textura, emojiTextura, EMOJI_FUENTE } from '../../core/escena3d.js';

const PERFIL = [[0, 0], [.38, 0], [.4, .05], [.32, .13], [.22, .28], [.13, .46], [.21, .5], [.19, .56], [.1, .6], [0, .6]];
const Y = .08;

export async function crearOca3D(cont, o) {
  const E = crearEscena(cont, { fov: 36, pol: .8, polMin: .22, polMax: 1.28, radio: 4.9, margen: 1.2, distMin: 6, distMax: 30, sombraRadio: 8, sol: { pos: [-4, 11, 7], int: 2.2 }, hemi: { int: 1.8 }, sueloY: -.32,
    etiqueta: 'Tablero de la Oca en 3D: arrastra para girar la vista' });
  const V = { E }, ESP = o.espiral, CAS = o.casillas, n = ESP.length;
  const mesa = new T.Mesh(new T.BoxGeometry(8.7, .34, 8.7), new T.MeshStandardMaterial({ roughness: .6 })); mesa.position.y = -.17; mesa.receiveShadow = true; E.escena.add(mesa);
  const gT = new T.BoxGeometry(.94, .16, .94), tiles = [];
  for (let k = 0; k < n; k++) {
    const [f, c] = ESP[k], lado = new T.MeshStandardMaterial({ roughness: .6 }), cara = new T.MeshStandardMaterial({ roughness: .5 });
    const m = new T.Mesh(gT, [lado, lado, cara, lado, lado, lado]); m.position.set(c - 3.5, Y - .08, f - 3.5); m.receiveShadow = true; E.escena.add(m); tiles.push({ m, lado, cara, k });
  }
  function dibujar(t, cs) {
    const k = t.k, cas = CAS[k], tipo = k === 0 ? 'salida' : cas ? cas.tipo : '', c = lienzo(160, 160), x = c.getContext('2d');
    const fondo = tipo === 'oca' ? cs.oca : tipo === 'fin' ? cs.fin : tipo === 'salida' ? '#EEF3FF' : cas ? cs.esp : (k % 2 ? cs.c2 : cs.c1);
    x.fillStyle = fondo; x.fillRect(0, 0, 160, 160); x.strokeStyle = cs.bd; x.lineWidth = 8; x.strokeRect(4, 4, 152, 152);
    x.fillStyle = cs.ink; x.textBaseline = 'top'; x.textAlign = 'left'; x.font = '800 34px Nunito, sans-serif'; if (k) x.fillText(String(k), 12, 8);
    const ico = k === 0 ? '🚩' : cas ? cas.ico : ''; if (ico) { x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `70px ${EMOJI_FUENTE}`; x.fillText(ico, 80, 94); }
    if (t.cara.map) t.cara.map.dispose(); t.cara.map = textura(c, 4); t.cara.color.set('#ffffff'); t.cara.needsUpdate = true; t.lado.color.set(cs.bd);
  }
  V.recolor = () => {
    const s = getComputedStyle(cont), v = nm => s.getPropertyValue(nm).trim() || '#999999';
    const cs = { c1: v('--o-c1'), c2: v('--o-c2'), bd: v('--o-bd'), ink: v('--o-ink'), oca: v('--o-oca'), esp: v('--o-esp'), fin: v('--o-fin') };
    mesa.material.color.set(v('--o-mesa')); tiles.forEach(t => dibujar(t, cs)); E.marcar();
  };
  // ----- fichas -----
  const gPeon = new T.LatheGeometry(PERFIL.map(([r, y]) => new T.Vector2(r, y)), 24), piezas = new T.Group(); E.escena.add(piezas);
  let mapa = new Map();
  V.pintar = S => {
    const vistas = new Set();
    for (const p of S.fichas) {
      vistas.add(p.j); let g = mapa.get(p.j);
      if (g && (g.userData.emoji !== (p.emoji || '') || g.userData.color !== p.color)) { piezas.remove(g); mapa.delete(p.j); g = null; }
      const tx = p.c - 3.5 + (p.dx || 0), tz = p.f - 3.5 + (p.dz || 0);
      if (!g) {
        g = new T.Group();
        if (p.emoji) {                                                       // solo el avatar elegido, sobre una peana fina del color del jugador
          const peana = new T.Mesh(new T.CylinderGeometry(.3, .34, .06, 28), new T.MeshStandardMaterial({ color: p.color, roughness: .35 })); peana.position.y = .03; peana.castShadow = true; g.add(peana);
          const sp = new T.Sprite(new T.SpriteMaterial({ map: emojiTextura(p.emoji, 128), transparent: true, depthWrite: false })); sp.scale.set(.9, .9, .9); sp.position.y = .55; g.add(sp);
        } else {
          const cu = new T.Mesh(gPeon, new T.MeshStandardMaterial({ color: p.color, roughness: .3, metalness: .08 })); cu.castShadow = true; cu.scale.setScalar(.95); g.add(cu);
          const cabeza = new T.Mesh(new T.SphereGeometry(.2, 20, 14), cu.material); cabeza.position.y = .72; cabeza.castShadow = true; g.add(cabeza);
        }
        g.position.set(tx, Y, tz); g.userData = { emoji: p.emoji || '', color: p.color }; piezas.add(g); mapa.set(p.j, g);
      }
      Object.assign(g.userData, { tx, tz, turno: !!p.turno, mueve: !!p.mueve });
    }
    for (const [j, g] of mapa) if (!vistas.has(j)) { piezas.remove(g); mapa.delete(j); }
    E.marcar();
  };
  let ult = 0, t0 = 0;
  E.alFrame = ahora => {
    const dt = ult ? Math.min(.05, (ahora - ult) / 1000) : .016; ult = ahora; t0 += dt; const k = 1 - Math.exp(-dt * 12); let sigue = false;
    for (const g of mapa.values()) {
      const u = g.userData, dx = u.tx - g.position.x, dz = u.tz - g.position.z, d = Math.hypot(dx, dz);
      if (d > .004) { g.position.x += dx * k; g.position.z += dz * k; sigue = true; } else { g.position.x = u.tx; g.position.z = u.tz; }
      g.position.y = Y + (d > .004 ? Math.min(.8, d * .4) : 0) + (u.turno ? Math.abs(Math.sin(t0 * 4)) * .14 : 0) + (u.mueve ? .1 : 0);
      if (u.turno) sigue = true;
    }
    return sigue;
  };
  V.camara = E.camara; V.destruir = () => E.destruir();
  V.recolor(); E.iniciar();
  return V;
}
