// Vista 3D del Encajados (Three.js): almacén con muros de ladrillo, suelo ajedrezado, metas brillantes, cajas con relieve y el personaje elegido (solo el avatar).
//   const V = await crearEncajados3D(contenedor, L, { cajas: 'madera' })
//   V.pintar({ cajas: [celda…], jugador, emoji, volteo, nuevo }) · V.alCasilla(i) · V.alDeslizar(dir) · V.recolor() · V.camara(modo) · V.celebrar() · V.destruir()
import { T, crearEscena, lienzo, textura, emojiTextura } from '../../core/escena3d.js';
import { estilo, capaTextura, oscuro, geoCaja } from '../../core/fichas.js';

const ALTO_MURO = .46, TAM_CAJA = .84;

export async function crearEncajados3D(cont, L, o = {}) {
  const W = L.w, H = L.h, M = Math.max(W, H);
  const E = crearEscena(cont, { fov: 36, az: 0, pol: .62, polMin: .25, polMax: 1.3, radio: M * .52 + .6, margen: .6, distMin: 5, distMax: 40, sombraRadio: M * .8 + 2, sombraTam: 2048, sol: { pos: [-M * .5, M * 1.5, M * .9], int: 2.3 }, hemi: { int: 1.9 }, sueloY: -.01,
    etiqueta: 'Almacén de Encajados en 3D: desliza el dedo para mover al personaje' });
  const V = { E, alCasilla: null, alDeslizar: null }, S3 = E.escena;
  const X = i => (i % W) - W / 2 + .5, Z = i => ((i / W) | 0) - H / 2 + .5;
  let C = { muro: '#6B7A99', muro2: '#56637F', suelo: '#EFE6D8', suelo2: '#E6DBC9', caja: '#C98A4B', caja2: '#9C6230', meta: '#FF4757' };
  let estiloCaja = o.cajas || 'madera', EST = estilo({}), tc = TAM_CAJA;       // EST = 🎨 Cajas (color, textura, forma, tamaño); tc = lado actual de la caja

  // ----- escenario -----
  const mSuelo = [new T.MeshStandardMaterial({ roughness: .8 }), new T.MeshStandardMaterial({ roughness: .8 })];
  const gSuelo = new T.BoxGeometry(1, .12, 1), gMuro = new T.BoxGeometry(.98, ALTO_MURO, .98);
  const texLadrillo = () => {
    const c = lienzo(128, 128), x = c.getContext('2d'); x.fillStyle = C.muro; x.fillRect(0, 0, 128, 128); x.strokeStyle = C.muro2; x.lineWidth = 6;
    for (let f = 0; f < 4; f++) { const y = f * 32; x.beginPath(); x.moveTo(0, y); x.lineTo(128, y); x.stroke(); const off = f % 2 ? 32 : 0; for (let k = 0; k < 3; k++) { const px = off + k * 64; x.beginPath(); x.moveTo(px, y); x.lineTo(px, y + 32); x.stroke(); } }
    x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(0, 0, 128, 14); return textura(c, 4);
  };
  const mMuroLado = new T.MeshStandardMaterial({ roughness: .75 }), mMuroTapa = new T.MeshStandardMaterial({ roughness: .6 });
  const suelos = [], muros = [], metas = [], tocables = E.tocables;
  for (let i = 0; i < W * H; i++) {
    if (L.fuera[i]) continue;
    if (L.muro[i]) { const m = new T.Mesh(gMuro, [mMuroLado, mMuroLado, mMuroTapa, mMuroLado, mMuroLado, mMuroLado]); m.position.set(X(i), ALTO_MURO / 2, Z(i)); m.castShadow = m.receiveShadow = true; m.userData.c = i; S3.add(m); tocables.push(m); muros.push(m); continue; }
    const f = new T.Mesh(gSuelo, mSuelo[(((i % W) + ((i / W) | 0)) & 1)]); f.position.set(X(i), -.06, Z(i)); f.receiveShadow = true; f.userData.c = i; S3.add(f); tocables.push(f); suelos.push(f);
    if (L.meta[i]) {
      const g = new T.Group(), disco = new T.Mesh(new T.CylinderGeometry(.3, .3, .03, 28), new T.MeshStandardMaterial({ roughness: .3, emissiveIntensity: .45 })), aro = new T.Mesh(new T.TorusGeometry(.38, .035, 8, 32), new T.MeshStandardMaterial({ roughness: .3, emissiveIntensity: .5 }));
      aro.rotation.x = Math.PI / 2; aro.position.y = .02; disco.position.y = .02; g.add(disco, aro); g.position.set(X(i), 0, Z(i)); S3.add(g); metas.push({ g, disco, aro, i });
    }
  }
  // ----- cajas -----
  let gCaja = new T.BoxGeometry(TAM_CAJA, TAM_CAJA, TAM_CAJA);
  function texCaja(en) {
    const c = lienzo(160, 160), x = c.getContext('2d'), a = en ? '#2ECC71' : (EST.hex || C.caja), b = en ? '#1E8F4E' : (EST.hex ? oscuro(EST.hex) : C.caja2);
    x.fillStyle = a; x.fillRect(0, 0, 160, 160);
    if (en) { x.strokeStyle = b; x.lineWidth = 12; x.strokeRect(6, 6, 148, 148); x.fillStyle = '#fff'; x.font = '900 100px Nunito, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('✓', 80, 88); return textura(c, 4); }
    if (estiloCaja === 'regalo') { x.fillStyle = b; x.fillRect(64, 0, 32, 160); x.fillRect(0, 64, 160, 32); x.beginPath(); x.ellipse(80, 62, 30, 16, 0, 0, 6.3); x.fill(); x.strokeStyle = a; x.lineWidth = 5; x.stroke(); }
    else if (estiloCaja === 'metal') { x.strokeStyle = b; x.lineWidth = 12; x.strokeRect(6, 6, 148, 148); x.fillStyle = b; for (const [px, py] of [[24, 24], [136, 24], [24, 136], [136, 136]]) { x.beginPath(); x.arc(px, py, 9, 0, 6.3); x.fill(); } x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 6; x.beginPath(); x.moveTo(30, 80); x.lineTo(130, 80); x.stroke(); }
    else if (estiloCaja === 'carton') { x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(0, 0, 160, 8); x.fillStyle = '#C9A06A'; x.fillRect(0, 66, 160, 28); x.strokeStyle = b; x.lineWidth = 6; x.strokeRect(3, 3, 154, 154); }
    else { x.strokeStyle = b; x.lineWidth = 12; x.strokeRect(6, 6, 148, 148); x.lineWidth = 9; x.beginPath(); x.moveTo(14, 14); x.lineTo(146, 146); x.moveTo(146, 14); x.lineTo(14, 146); x.stroke(); x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = 3; for (let k = 1; k < 5; k++) { x.beginPath(); x.moveTo(8, k * 32); x.lineTo(152, k * 32); x.stroke(); } }
    if (EST.tex) capaTextura(x, 0, 0, 160, 160, EST.tex);
    if (EST.forma === 'marcada') { x.lineWidth = 14; x.strokeStyle = oscuro(en ? '#2ECC71' : (EST.hex || C.caja), .5); x.strokeRect(7, 7, 146, 146); }
    return textura(c, 4);
  }
  const mCajaN = new T.MeshStandardMaterial({ roughness: .6 }), mCajaE = new T.MeshStandardMaterial({ roughness: .5, emissive: '#1E8F4E', emissiveIntensity: .25 });
  const cajas = L.cajas.map(() => { const m = new T.Mesh(gCaja, mCajaN); m.castShadow = m.receiveShadow = true; m.position.set(0, tc / 2, 0); S3.add(m); return { m, tx: 0, tz: 0, en: null, nuevo: true, salto: 0 }; });
  // ----- jugador: solo el avatar elegido -----
  const sombra = new T.Mesh(new T.CircleGeometry(.3, 20), new T.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .28, depthWrite: false })); sombra.rotation.x = -Math.PI / 2; sombra.position.y = .01; S3.add(sombra);
  let jug = null, emojiAct = '', tj = { x: 0, z: 0 }, volt = 1, t0 = 0, ult = 0, mueve = 0, bote = 0;
  V.pintar = s => {
    if (s.emoji !== emojiAct) { if (jug) { S3.remove(jug); jug.material.map.dispose(); jug.material.dispose(); } emojiAct = s.emoji; jug = new T.Sprite(new T.SpriteMaterial({ map: emojiTextura(s.emoji, 128), transparent: true, depthWrite: false })); jug.scale.set(.95, .95, .95); S3.add(jug); jug.position.set(X(s.jugador), .5, Z(s.jugador)); sombra.position.x = jug.position.x; sombra.position.z = jug.position.z; }
    tj = { x: X(s.jugador), z: Z(s.jugador) }; volt = s.volteo ? -1 : 1;
    s.cajas.forEach((c, k) => {
      const q = cajas[k], en = !!L.meta[c]; q.tx = X(c); q.tz = Z(c);
      if (q.nuevo) { q.m.position.set(q.tx, tc / 2, q.tz); q.nuevo = false; }
      if (q.en !== en) { if (q.en != null && en) q.salto = 1; q.en = en; q.m.material = en ? mCajaE : mCajaN; q.m.material.map = en ? V._tE : V._tN; q.m.material.needsUpdate = true; }
    });
    if (s.nuevo) { cajas.forEach((q, k) => { q.m.position.set(X(s.cajas[k]), tc / 2, Z(s.cajas[k])); }); jug.position.set(tj.x, .5, tj.z); }
    E.marcar();
  };
  V.celebrar = () => { bote = 1.6; E.marcar(); };
  E.alFrame = ahora => {
    const dt = ult ? Math.min(.05, (ahora - ult) / 1000) : .016; ult = ahora; t0 += dt; const k = 1 - Math.exp(-dt * 16); let sigue = false;
    for (const q of cajas) {
      const dx = q.tx - q.m.position.x, dz = q.tz - q.m.position.z;
      if (Math.abs(dx) + Math.abs(dz) > .003) { q.m.position.x += dx * k; q.m.position.z += dz * k; sigue = true; } else { q.m.position.x = q.tx; q.m.position.z = q.tz; }
      if (q.salto > 0) { q.salto = Math.max(0, q.salto - dt * 3); q.m.position.y = tc / 2 + Math.sin((1 - q.salto) * Math.PI) * .22; sigue = true; } else q.m.position.y = tc / 2;
      if (bote > 0 && q.en) q.m.position.y += Math.abs(Math.sin(t0 * 7 + q.tx)) * .25 * Math.min(1, bote);
    }
    if (jug) {
      const dx = tj.x - jug.position.x, dz = tj.z - jug.position.z, d = Math.hypot(dx, dz);
      if (d > .004) { jug.position.x += dx * k; jug.position.z += dz * k; mueve = 1; sigue = true; } else { jug.position.x = tj.x; jug.position.z = tj.z; mueve = 0; }
      jug.position.y = .5 + (mueve ? Math.abs(Math.sin(t0 * 22)) * .1 : 0) + (bote > 0 ? Math.abs(Math.sin(t0 * 8)) * .3 : 0);
      jug.scale.x += (.95 * volt - jug.scale.x) * Math.min(1, dt * 18);
      sombra.position.x = jug.position.x; sombra.position.z = jug.position.z;
    }
    if (bote > 0) { bote -= dt; sigue = true; }
    for (const m of metas) { const p = .4 + .2 * Math.sin(t0 * 3 + m.i); m.disco.material.emissiveIntensity = p; m.aro.material.emissiveIntensity = p + .1; sigue = true; }
    return sigue;
  };
  // ----- colores del escenario (variables CSS del tema elegido) -----
  V.recolor = (ids = {}) => {
    if (ids.cajas) estiloCaja = ids.cajas;
    if (ids.est) { EST = ids.est; tc = TAM_CAJA * EST.esc; gCaja.dispose(); gCaja = geoCaja(T, tc, tc, tc, EST.forma); for (const q of cajas) { q.m.geometry = gCaja; q.m.position.y = tc / 2; } }
    const s = getComputedStyle(cont), v = (n, d) => s.getPropertyValue(n).trim() || d;
    C = { muro: v('--muro', C.muro), muro2: v('--muro2', C.muro2), suelo: v('--suelo', C.suelo), suelo2: v('--suelo2', C.suelo2), caja: v('--caja', C.caja), caja2: v('--caja2', C.caja2), meta: v('--meta', C.meta) };
    mSuelo[0].color.set(C.suelo); mSuelo[1].color.set(C.suelo2);
    if (mMuroLado.map) mMuroLado.map.dispose(); mMuroLado.map = texLadrillo(); mMuroLado.color.set('#ffffff'); mMuroLado.needsUpdate = true; mMuroTapa.color.set(tono(C.muro, .18));
    for (const m of metas) { m.disco.material.color.set(C.meta); m.disco.material.emissive.set(C.meta); m.aro.material.color.set('#ffffff'); m.aro.material.emissive.set(C.meta); }
    if (V._tN) V._tN.dispose(); if (V._tE) V._tE.dispose(); V._tN = texCaja(false); V._tE = texCaja(true);
    mCajaN.map = V._tN; mCajaN.color.set('#ffffff'); mCajaN.needsUpdate = true; mCajaE.map = V._tE; mCajaE.color.set('#ffffff'); mCajaE.needsUpdate = true;
    E.marcar();
  };
  const tono = (hex, f) => '#' + new T.Color(hex).lerp(new T.Color('#ffffff'), f).getHexString();
  // ----- gestos: deslizar mueve (la cámara solo se acerca con dos dedos o la rueda); tocar una casilla = ir hasta allí -----
  let sx = 0, sy = 0;
  E.alArrastrar = (ev, dx, dy, fase) => {
    if (fase === 'ini') { sx = 0; sy = 0; return true; }
    if (fase === 'mov') { sx += dx; sy += dy; return true; }
    if (fase === 'fin' && Math.hypot(sx, sy) > 24 && V.alDeslizar) V.alDeslizar(Math.abs(sx) > Math.abs(sy) ? (sx > 0 ? 'derecha' : 'izquierda') : (sy > 0 ? 'abajo' : 'arriba'));
    return true;
  };
  E.alTocar = ev => { const h = E.raycast(ev, tocables); if (h.length && h[0].object.userData.c != null && V.alCasilla) V.alCasilla(h[0].object.userData.c); };
  V.camara = E.camara; V.destruir = () => E.destruir();
  V.recolor(); E.iniciar();
  return V;
}
