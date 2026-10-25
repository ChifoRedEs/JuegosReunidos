// Vista 3D del Parchís (Three.js). Solo dibuja: el juego (index.js) le pasa el estado y recibe los toques.
//   const V = await crearParchis3D(contenedor, { alPieza(c, i), alDestino(to), alDado() })
//   V.pintar({ piezas: [{ c, i, x, z, esc, mov, emoji }], dest: [{ x, z, c, to, cap }], turno: c|null, casas: { c: { on, etq } }, forma })
//   V.dado(valor|null, rodando, color) · V.recolor() (lee las variables --pz-* del contenedor) · V.camara(modo) · V.destruir()
// Coordenadas del mundo: la rejilla 19×19 del tablero SVG, 1 casilla = 1 unidad, centro del tablero en (0,0).
import { T, crearEscena, lienzo, textura, emojiTextura } from '../../core/escena3d.js';
import { lienzoTextura } from '../../core/fichas.js';
import { PC, PSTART, PSAFE, PHOUSE, PTRACK, PTRI, PCORR, PIPS } from './tablero.js';

const mundo = v => v / 10 - 9.5;
const NOMBRE_VAR = { am: '--pz-am', az: '--pz-az', ro: '--pz-ro', ve: '--pz-ve' };
const Y0 = .06;                                              // altura de la cara superior de las casillas
const mezcla = (a, b, t) => new T.Color(a).lerp(new T.Color(b), t);

function estrellaTex(color) {
  const c = lienzo(128, 128), x = c.getContext('2d'); x.fillStyle = color; x.beginPath();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 24 : 54; x[k ? 'lineTo' : 'moveTo'](64 + Math.cos(a) * r, 66 + Math.sin(a) * r); }
  x.closePath(); x.fill(); return c;
}
function placa(w, rad) {                                      // rectángulo redondeado en el plano XY
  const s = new T.Shape(), h = w / 2;
  s.moveTo(-h + rad, -h); s.lineTo(h - rad, -h); s.quadraticCurveTo(h, -h, h, -h + rad); s.lineTo(h, h - rad); s.quadraticCurveTo(h, h, h - rad, h);
  s.lineTo(-h + rad, h); s.quadraticCurveTo(-h, h, -h, h - rad); s.lineTo(-h, -h + rad); s.quadraticCurveTo(-h, -h, -h + rad, -h); return s;
}
const PERFIL_PEON = [[0, 0], [.36, 0], [.38, .05], [.3, .12], [.2, .26], [.12, .42], [.2, .46], [.18, .52], [.1, .55], [0, .56]];

export async function crearParchis3D(cont, o = {}) {
  const E = crearEscena(cont, { fov: 36, pol: .92, polMin: .25, polMax: 1.3, radio: 10.4, margen: 2.8, distMin: 8, distMax: 60, sombraRadio: 13, sol: { pos: [-6, 17, 10], int: 2.2 }, hemi: { int: 1.8 }, sueloY: -.32,
    etiqueta: 'Tablero de parchís en 3D: toca una ficha resaltada o su casilla de destino; arrastra para girar' });
  const V = { E }, grupo = new T.Group(); E.escena.add(grupo);
  let col = {}, forma = 'canica', tTurno = null;
  // ----- materiales (se recolorean con V.recolor) -----
  const mBase = new T.MeshStandardMaterial({ roughness: .7 }), mMarco = new T.MeshStandardMaterial({ roughness: .6 });
  const mCel = new T.MeshStandardMaterial({ roughness: .55 }), mIni = {}, mCas = {}, mPlaca = {}, mCirc = {}, mAro = {}, mFicha = {}, mTri = {};
  for (const c of PC) {
    mIni[c] = new T.MeshStandardMaterial({ roughness: .5 }); mPlaca[c] = new T.MeshStandardMaterial({ roughness: .7, transparent: true });
    mCirc[c] = new T.MeshStandardMaterial({ roughness: .6, transparent: true }); mAro[c] = new T.MeshStandardMaterial({ roughness: .5, transparent: true });
    mFicha[c] = new T.MeshStandardMaterial({ roughness: .3, metalness: .08 }); mTri[c] = new T.MeshStandardMaterial({ roughness: .5 });
    mCas[c] = Array.from({ length: 7 }, () => new T.MeshStandardMaterial({ roughness: .55 }));
  }
  const texEstrella = { seguro: null, salida: null }, matEst = { seguro: new T.MeshBasicMaterial({ transparent: true, depthWrite: false }), salida: new T.MeshBasicMaterial({ transparent: true, depthWrite: false }) };
  // ----- tablero -----
  const losa = new T.Mesh(new T.BoxGeometry(19.8, .3, 19.8), mBase); losa.position.y = -.1 - .02; losa.receiveShadow = true; grupo.add(losa);
  const marco = new T.Mesh(new T.BoxGeometry(20.4, .26, 20.4), mMarco); marco.position.y = -.17 - .02; marco.receiveShadow = true; grupo.add(marco);
  const gPlaca = new T.ExtrudeGeometry(placa(7.3, 1.3), { depth: .05, bevelEnabled: false }); gPlaca.rotateX(-Math.PI / 2);
  const casas = {};
  for (const c of PC) {
    const [hx, hy] = PHOUSE[c], cx = mundo(hx + 40), cz = mundo(hy + 40);
    const pl = new T.Mesh(gPlaca, mPlaca[c]); pl.position.set(cx, Y0 - .06 + .01, cz); pl.receiveShadow = true; grupo.add(pl);
    const circ = new T.Mesh(new T.CylinderGeometry(1.95, 1.95, .04, 40), mCirc[c]); circ.position.set(cx, Y0 + .015, cz); circ.receiveShadow = true; grupo.add(circ);
    const aro = new T.Mesh(new T.CylinderGeometry(2.1, 2.1, .03, 40), mAro[c]); aro.position.set(cx, Y0 + .005, cz); aro.receiveShadow = true; grupo.add(aro);
    const turno = new T.Mesh(new T.RingGeometry(5.0, 5.28, 4, 1, Math.PI / 4), new T.MeshBasicMaterial({ transparent: true, opacity: .9, side: T.DoubleSide })); turno.rotation.x = -Math.PI / 2; turno.position.set(cx, Y0 + .03, cz); turno.visible = false; grupo.add(turno);
    const lc = lienzo(320, 72), lt = textura(lc), lm = new T.Mesh(new T.PlaneGeometry(4.4, 1), new T.MeshBasicMaterial({ map: lt, transparent: true, depthWrite: false }));
    lm.rotation.x = -Math.PI / 2; lm.position.set(cx, Y0 + .06, mundo(hy + 70)); grupo.add(lm);
    casas[c] = { pl, circ, aro, turno, lc, lt, lm, etq: null };
  }
  // casillas del recorrido (68) y pasillos de meta (7 por color)
  const gCel = new T.BoxGeometry(.92, .1, .92), gEst = new T.PlaneGeometry(.78, .78), estrellas = [];
  for (let n = 1; n <= 68; n++) {
    const [r, cc] = PTRACK[n], st = PC.find(k => PSTART[k] === n), x = cc - 9, z = r - 9;
    const m = new T.Mesh(gCel, st ? mIni[st] : mCel); m.position.set(x, Y0 - .05, z); m.receiveShadow = true; grupo.add(m);
    if (st || PSAFE.has(n)) { const e = new T.Mesh(gEst, st ? matEst.salida : matEst.seguro); e.rotation.x = -Math.PI / 2; e.position.set(x, Y0 + .004, z); grupo.add(e); estrellas.push(e); }
  }
  for (const c of PC) for (let k = 1; k <= 7; k++) { const [r, cc] = PCORR(c, k); const m = new T.Mesh(gCel, mCas[c][k - 1]); m.position.set(cc - 9, Y0 - .05, r - 9); m.receiveShadow = true; grupo.add(m); }
  for (const c of PC) {                                          // triángulos de la meta
    const pts = PTRI[c].split(' ').map(s => s.split(',').map(Number)), sh = new T.Shape();
    pts.forEach(([px, py], k) => sh[k ? 'lineTo' : 'moveTo'](mundo(px), -mundo(py))); sh.closePath();
    const g = new T.ExtrudeGeometry(sh, { depth: .1, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
    const m = new T.Mesh(g, mTri[c]); m.position.y = -.04; m.receiveShadow = true; m.castShadow = true; grupo.add(m);
  }
  // ----- dado -----
  const NORMALES = { 3: [1, 0, 0], 4: [-1, 0, 0], 1: [0, 1, 0], 6: [0, -1, 0], 2: [0, 0, 1], 5: [0, 0, -1] }, ORDEN = [3, 4, 1, 6, 2, 5];
  const cacheDado = new Map();
  function caraDado(v, color) {
    const k = v + color; if (cacheDado.has(k)) return cacheDado.get(k);
    const c = lienzo(128, 128), x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, 128, 128); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, 0, 128, 10);
    x.fillStyle = '#fff'; for (const p of PIPS[v]) { x.beginPath(); x.arc(32 + (p % 3) * 32, 32 + ((p / 3) | 0) * 32, 11, 0, 7); x.fill(); }
    const m = new T.MeshStandardMaterial({ map: textura(c, 2), roughness: .35 }); cacheDado.set(k, m); return m;
  }
  const dado = new T.Mesh(new T.BoxGeometry(.9, .9, .9), ORDEN.map(v => caraDado(v, '#888888'))); dado.position.set(0, Y0 + .45 + .05, 0); dado.castShadow = true; dado.userData.dado = true; dado.visible = false; grupo.add(dado);
  let rodando = false, qObj = null, colorDado = '';
  V.dado = (v, roda, color) => {
    const cd = color || colorDado || '#888888';
    if (cd !== colorDado) { colorDado = cd; dado.material = ORDEN.map(f => caraDado(f, cd)); }
    dado.visible = true;
    if (roda) { rodando = true; qObj = null; }
    else if (v) { rodando = false; const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(...NORMALES[v]), new T.Vector3(0, 1, 0)); q.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), (v * 1.7) % 6.28)); qObj = q; }
    else { rodando = false; qObj = null; dado.visible = false; }
    E.marcar();
  };
  // ----- fichas -----
  const piezasG = new T.Group(), destG = new T.Group(); grupo.add(piezasG, destG);
  const geos = {};
  function geoFicha(f) {
    if (geos[f]) return geos[f];
    if (f === 'peon') { geos[f] = new T.LatheGeometry(PERFIL_PEON.map(([r, y]) => new T.Vector2(r, y)), 24); }
    else if (f === 'estrella') {
      const s = new T.Shape(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? .22 : .5; s[k ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } s.closePath();
      const g = new T.ExtrudeGeometry(s, { depth: .2, bevelEnabled: true, bevelThickness: .05, bevelSize: .04, bevelSegments: 2 }); g.rotateX(-Math.PI / 2); g.translate(0, .06, 0); geos[f] = g;
    } else if (f === 'diamante') { const g = new T.OctahedronGeometry(.4); g.scale(1, 1.35, 1); g.translate(0, .55, 0); geos[f] = g; }
    else { geos[f] = new T.SphereGeometry(.36, 28, 20); geos[f].translate(0, .36, 0); }
    return geos[f];
  }
  const gAroMov = new T.RingGeometry(.46, .6, 32), gAroDest = new T.RingGeometry(.4, .52, 32), gDisco = new T.CircleGeometry(.42, 28), gToque = new T.CircleGeometry(.75, 12);
  const mToque = new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const gPeana = new T.CylinderGeometry(.36, .4, .06, 28).translate(0, .03, 0);   // con avatar solo se ve una peana fina del color
  function crearFicha(p) {
    const g = new T.Group(), cuerpo = new T.Mesh(p.emoji ? gPeana : geoFicha(forma), mFicha[p.c]); cuerpo.castShadow = true; g.add(cuerpo);
    if (forma === 'canica' && !p.emoji) { const br = new T.Mesh(new T.SphereGeometry(.09, 10, 8), new T.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: .65 })); br.position.set(-.13, .54, .16); g.add(br); }
    const aro = new T.Mesh(gAroMov, new T.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: .95, side: T.DoubleSide, depthWrite: false })); aro.rotation.x = -Math.PI / 2; aro.position.y = .02; aro.visible = false; aro.name = 'aro'; g.add(aro);
    const tq = new T.Mesh(gToque, mToque); tq.rotation.x = -Math.PI / 2; tq.position.y = .05; tq.name = 'toque'; g.add(tq);
    if (p.emoji) { const sp = new T.Sprite(new T.SpriteMaterial({ map: emojiTextura(p.emoji, 96), transparent: true, depthWrite: false })); sp.scale.set(.95, .95, .95); sp.position.y = .56; sp.name = 'emoji'; g.add(sp); }
    g.userData = { pc: [p.c, p.i], emoji: p.emoji || '', mov: false };
    return g;
  }
  let fichas = new Map();                                          // 'c,i' -> grupo
  V.pintar = S => {
    if (S.forma && S.forma !== forma) { forma = S.forma; for (const g of fichas.values()) piezasG.remove(g); fichas = new Map(); }
    const vistas = new Set();
    for (const p of S.piezas) {
      const k = p.c + ',' + p.i; vistas.add(k);
      let g = fichas.get(k);
      if (g && g.userData.emoji !== (p.emoji || '')) { const [x, z] = [g.position.x, g.position.z]; piezasG.remove(g); g = null; fichas.delete(k); p._x = x; p._z = z; }
      if (!g) { g = crearFicha(p); g.position.set(p._x ?? p.x, Y0, p._z ?? p.z); piezasG.add(g); fichas.set(k, g); }
      Object.assign(g.userData, { tx: p.x, tz: p.z, ts0: p.esc || 1, ts: (p.esc || 1) * escF, mov: !!p.mov });
      const aro = g.getObjectByName('aro'); aro.visible = !!p.mov; aro.material.color.set(p.mov ? '#FFFFFF' : '#000');
    }
    for (const [k, g] of fichas) if (!vistas.has(k)) { piezasG.remove(g); fichas.delete(k); }
    // destinos
    while (destG.children.length) destG.remove(destG.children[0]);
    for (const d of S.dest || []) {
      const g = new T.Group(); g.position.set(d.x, Y0 + .012, d.z);
      const disco = new T.Mesh(gDisco, new T.MeshBasicMaterial({ color: col[d.c], transparent: true, opacity: .45, depthWrite: false, side: T.DoubleSide })); disco.rotation.x = -Math.PI / 2; g.add(disco);
      const aro = new T.Mesh(gAroDest, new T.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: .95, depthWrite: false, side: T.DoubleSide })); aro.rotation.x = -Math.PI / 2; aro.position.y = .01; g.add(aro);
      const tq = new T.Mesh(gToque, mToque); tq.rotation.x = -Math.PI / 2; tq.position.y = .03; g.add(tq);
      if (d.cap) { const sp = new T.Sprite(new T.SpriteMaterial({ map: emojiTextura('💥', 96), transparent: true, depthWrite: false })); sp.scale.set(.8, .8, .8); sp.position.set(.2, .7, 0); g.add(sp); }
      g.userData = { dest: d.to, ghost: true }; destG.add(g);
    }
    // casas
    tTurno = S.turno || null;
    for (const c of PC) {
      const cs = casas[c], inf = (S.casas && S.casas[c]) || { on: false, etq: '' };
      for (const m of [mPlaca[c], mCirc[c], mAro[c]]) m.opacity = inf.on ? 1 : .3;
      cs.turno.visible = tTurno === c; cs.turno.material.color.set(col[c] || '#fff');
      if (cs.etq !== inf.etq) { cs.etq = inf.etq; const x = cs.lc.getContext('2d'); x.clearRect(0, 0, 320, 72); x.fillStyle = col.tinta || '#17214A'; x.font = '800 40px Nunito, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(inf.etq || '', 160, 38, 300); cs.lt.needsUpdate = true; }
    }
    E.marcar();
  };
  // ----- apariencia de las fichas: textura y tamaño (js/core/fichas.js) -----
  let escF = 1, kF = '';
  V.fichas = e => {
    const k = (e.tex || '') + '|' + e.esc; if (k === kF) return; kF = k; escF = e.esc;
    const mapa = e.tex ? textura(lienzoTextura('#FFFFFF', { tex: e.tex, forma: null }, 128)) : null;
    for (const c of PC) { if (mFicha[c].map) mFicha[c].map.dispose(); mFicha[c].map = mapa; mFicha[c].needsUpdate = true; }
    for (const g of fichas.values()) g.userData.ts = (g.userData.ts0 || 1) * escF;
    E.marcar();
  };
  // ----- colores -----
  V.recolor = () => {
    const cs = getComputedStyle(cont), v = n => cs.getPropertyValue(n).trim() || '#888888';
    const bg = v('--pz-bg'), cel = v('--pz-cell'), line = v('--pz-line'), star = v('--pz-star'), tinta = v('--pz-ink');
    col = { tinta }; for (const c of PC) col[c] = v(NOMBRE_VAR[c]);
    mBase.color.set(bg); mMarco.color.set(line); mCel.color.set(cel);
    for (const c of PC) {
      mIni[c].color.set(col[c]); mFicha[c].color.set(col[c]); mTri[c].color.set(col[c]);
      mPlaca[c].color.copy(mezcla(bg, col[c], .3)); mCirc[c].color.set(cel); mAro[c].color.set(col[c]);
      mCas[c].forEach((m, k) => m.color.copy(mezcla(cel, col[c], .3 + (k + 1) * .09)));
    }
    for (const [k, color] of [['seguro', star], ['salida', '#FFFFFF']]) { if (texEstrella[k]) texEstrella[k].dispose(); texEstrella[k] = textura(estrellaTex(color), 4); matEst[k].map = texEstrella[k]; matEst[k].needsUpdate = true; }
    for (const c of PC) casas[c].etq = null;                     // fuerza redibujar los nombres con el color de tinta nuevo
    E.marcar();
  };
  V.recolor();
  // ----- animación -----
  let ult = 0, t0 = 0;
  E.alFrame = ahora => {
    const dt = ult ? Math.min(.05, (ahora - ult) / 1000) : .016; ult = ahora; t0 += dt;
    let sigue = false;
    const k = 1 - Math.exp(-dt * 13);
    for (const g of fichas.values()) {
      const u = g.userData, dx = u.tx - g.position.x, dz = u.tz - g.position.z, d = Math.hypot(dx, dz);
      if (d > .004) { g.position.x += dx * k; g.position.z += dz * k; sigue = true; } else { g.position.x = u.tx; g.position.z = u.tz; }
      g.position.y = Y0 + (d > .004 ? Math.min(.9, d * .42) : 0) + (u.mov ? Math.abs(Math.sin(t0 * 5)) * .16 : 0);
      const s = g.scale.x, sn = s + ((u.ts || 1) - s) * k; g.scale.setScalar(Math.abs(sn - (u.ts || 1)) < .002 ? (u.ts || 1) : sn);
      if (u.mov) { sigue = true; const a = g.getObjectByName('aro'); if (a) { a.material.opacity = .55 + .45 * Math.abs(Math.sin(t0 * 5)); a.scale.setScalar(1 + .12 * Math.abs(Math.sin(t0 * 5))); } }
    }
    if (destG.children.length) { sigue = true; const s = 1 + .1 * Math.sin(t0 * 5); for (const g of destG.children) g.scale.set(s, 1, s); }
    if (dado.visible) {
      if (rodando) { dado.rotation.x += dt * 13; dado.rotation.y += dt * 9; dado.rotation.z += dt * 7; dado.position.y = Y0 + .5 + Math.abs(Math.sin(t0 * 11)) * .6; sigue = true; }
      else if (qObj) {
        dado.quaternion.slerp(qObj, 1 - Math.exp(-dt * 14)); dado.position.y += (Y0 + .5 - dado.position.y) * (1 - Math.exp(-dt * 14));
        if (dado.quaternion.angleTo(qObj) > .01) sigue = true; else { dado.quaternion.copy(qObj); dado.position.y = Y0 + .5; }
      }
    }
    return sigue;
  };
  // ----- toques -----
  E.tocables = [piezasG, destG, dado];
  E.alTocar = ev => {
    const hits = E.raycast(ev, [piezasG, destG, dado]);
    for (const h of hits) {
      let x = h.object; while (x && !x.userData.pc && x.userData.dest === undefined && !x.userData.dado) x = x.parent;
      if (!x) continue;
      if (x.userData.dado) { if (o.alDado) o.alDado(); return; }
      if (x.userData.dest !== undefined) { if (o.alDestino) o.alDestino(x.userData.dest); return; }
      if (x.userData.pc && x.userData.mov) { if (o.alPieza) o.alPieza(...x.userData.pc); return; }
    }
  };
  V.camara = E.camara; V.destruir = () => E.destruir();
  E.iniciar();
  return V;
}
