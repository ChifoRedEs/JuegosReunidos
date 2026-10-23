// Vista 3D de la Ruleta de la Suerte (Three.js): rueda con grosor, clavos, puntero y sombra.
// El dibujo de la rueda (colores y premios) lo hace el juego en un canvas; aquí se pone como cara superior y se hace girar.
//   const V = await crearRuleta3D(contenedor, { n, alTocar() })
//   V.rueda(canvas) · V.girar(rot) (mismo ángulo en radianes que usa el juego, sentido horario) · V.camara(modo) · V.destruir()
import { T, crearEscena, textura } from '../../core/escena3d.js';

export async function crearRuleta3D(cont, o = {}) {
  const E = crearEscena(cont, { fov: 34, pol: .72, polMin: .3, polMax: 1.15, radio: 5.9, margen: 1.4, az: 0, distMin: 8, distMax: 30, sombraRadio: 8, sol: { pos: [-3, 10, 7], int: 2.2 }, hemi: { int: 1.8 }, sueloY: -.45,
    etiqueta: 'Ruleta de premios en 3D: toca la rueda para girarla' });
  const V = { E }, R = 5.2;
  const mOro = new T.MeshStandardMaterial({ color: '#FFC21A', roughness: .3, metalness: .55 }), mCara = new T.MeshStandardMaterial({ roughness: .45 });
  const rueda = new T.Group(); E.escena.add(rueda);
  const cuerpo = new T.Mesh(new T.CylinderGeometry(R + .25, R + .25, .5, 64), mOro); cuerpo.position.y = -.26; cuerpo.castShadow = true; cuerpo.receiveShadow = true; rueda.add(cuerpo);
  const cara = new T.Mesh(new T.CircleGeometry(R, 72), mCara); cara.rotation.x = -Math.PI / 2; cara.position.y = .0; cara.receiveShadow = true; rueda.add(cara);
  const n = o.n || 24, gClavo = new T.SphereGeometry(.14, 12, 10);
  for (let i = 0; i < n; i++) { const a = i * 2 * Math.PI / n, c = new T.Mesh(gClavo, new T.MeshStandardMaterial({ color: '#FFF6D6', roughness: .3, metalness: .4 })); c.position.set(Math.cos(a) * (R + .02), .06, Math.sin(a) * (R + .02)); c.castShadow = true; rueda.add(c); }
  const eje = new T.Mesh(new T.CylinderGeometry(.95, 1.1, .35, 32), mOro); eje.position.y = .16; eje.castShadow = true; rueda.add(eje);
  const tapa = new T.Mesh(new T.CylinderGeometry(.62, .62, .06, 32), new T.MeshStandardMaterial({ color: '#FFFFFF', roughness: .4 })); tapa.position.y = .36; rueda.add(tapa);
  // peana y puntero fijo (arriba de la imagen = lado lejano)
  const peana = new T.Mesh(new T.CylinderGeometry(R + .9, R + 1.1, .4, 64), new T.MeshStandardMaterial({ color: '#2A2F5A', roughness: .6 })); peana.position.y = -.7; peana.receiveShadow = true; E.escena.add(peana);
  const punt = new T.Group(); const cono = new T.Mesh(new T.ConeGeometry(.42, 1.1, 20), new T.MeshStandardMaterial({ color: '#FF4757', roughness: .35 })); cono.rotation.z = Math.PI; cono.position.y = .0; cono.castShadow = true; punt.add(cono);
  const bola = new T.Mesh(new T.SphereGeometry(.34, 18, 14), new T.MeshStandardMaterial({ color: '#FF4757', roughness: .3 })); bola.position.y = .66; punt.add(bola);
  punt.position.set(0, .65, -(R - .35)); punt.rotation.x = -.18; E.escena.add(punt);
  let tex = null;
  V.rueda = canvas => { if (tex) tex.dispose(); tex = textura(canvas, 8); mCara.map = tex; mCara.needsUpdate = true; E.marcar(); };
  V.girar = rot => { rueda.rotation.y = -rot; E.marcar(); };
  E.alTocar = ev => { if (E.raycast(ev, [cara, cuerpo]).length && o.alTocar) o.alTocar(); };
  V.camara = E.camara; V.destruir = () => E.destruir();
  E.iniciar();
  return V;
}
