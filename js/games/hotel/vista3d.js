// Vista 3D de Hotel (Three.js): camino con casillas, terrenos con hoteles de 8 estilos, entradas, coches, dados, Banco y Ayuntamiento.
//   const V = await crearHotel3D(contenedor)
//   V.pintar(S) · V.mover(j, camino, ms) · V.dado(v, ms) · V.resaltar({ casillas:[], lotes:[] }) · V.alTocar = ({tipo:'casilla'|'lote', id}) => … · V.recolor() · V.camara(modo) · V.destruir()
import { T, crearEscena, lienzo, textura, emojiTextura, EMOJI_FUENTE } from '../../core/escena3d.js';
import { INFO_TIPO, CAJA, MAPA, CAMINO, N, TIPO, HOTELES, IDS_HOTEL, TERRENOS, ANCLAS, LADOS, BANCO, AYUNTAMIENTO, LAGO, LINEA_BANCO, LINEA_AYTO, nEdif } from './datos.js';

const W = MAPA.W, H = MAPA.H, cx = c => c - W / 2, cz = r => r - H / 2;
const centro = ([r0, c0, r1, c1]) => ({ x: cx((c0 + c1 + 1) / 2), z: cz((r0 + r1 + 1) / 2), w: c1 - c0 + 1, d: r1 - r0 + 1 });
const tono = (hex, f) => { const c = new T.Color(hex); return f >= 0 ? c.lerp(new T.Color('#ffffff'), f) : c.multiplyScalar(1 + f); };

export async function crearHotel3D(cont) {
  const E = crearEscena(cont, { fov: 34, az: 0, pol: .7, polMin: .2, polMax: 1.3, radio: 8.3, margen: 0.2, distMin: 6, objetivo: [(CAJA.c0 + CAJA.c1 + 1) / 2 - W / 2, 0, (CAJA.r0 + CAJA.r1 + 1) / 2 - H / 2], distMax: 40, sombraRadio: 13, sombraTam: 2048, sol: { pos: [-7, 15, 10], int: 2.3 }, hemi: { int: 1.8 }, sueloY: -.3,
    etiqueta: 'Tablero de Hotel en 3D: arrastra para girar la vista' });
  const V = { E, alTocar: null }, S3 = E.escena;
  const mats = new Map();
  const mat = (color, o = {}) => { const k = color + JSON.stringify(o); let m = mats.get(k); if (!m) { m = new T.MeshStandardMaterial({ color, roughness: .62, ...o }); mats.set(k, m); } return m; };
  const caja = (w, h, d, m, x, y, z, sombra = true) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = sombra; o.receiveShadow = true; return o; };
  const etiqueta = (txt, bg, fg = '#fff', w = 1.7) => {
    const c = lienzo(256, 64), x = c.getContext('2d'); x.fillStyle = bg; x.beginPath(); x.roundRect(4, 6, 248, 52, 18); x.fill(); x.lineWidth = 4; x.strokeStyle = 'rgba(255,255,255,.85)'; x.stroke();
    x.fillStyle = fg; x.font = '800 30px Nunito, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 128, 34);
    const s = new T.Sprite(new T.SpriteMaterial({ map: textura(c), transparent: true, depthTest: false })); s.scale.set(w, w / 4, 1); s.renderOrder = 20; return s;
  };

  // ----- base del tablero -----
  const bw = CAJA.c1 - CAJA.c0 + 1, bh = CAJA.r1 - CAJA.r0 + 1, bx = (CAJA.c0 + CAJA.c1 + 1) / 2 - W / 2, bz = (CAJA.r0 + CAJA.r1 + 1) / 2 - H / 2;
  const marco = new T.Mesh(new T.BoxGeometry(bw + 1.1, .34, bh + 1.1), new T.MeshStandardMaterial({ color: '#8A5A3B', roughness: .7 })); marco.position.set(bx, -.18, bz); marco.receiveShadow = true; S3.add(marco);
  const hierba = new T.Mesh(new T.BoxGeometry(bw + .5, .06, bh + .5), new T.MeshStandardMaterial({ color: '#8CCB6A', roughness: .9 })); hierba.position.set(bx, -.03, bz); hierba.receiveShadow = true; S3.add(hierba);
  const ocupado = new Set(CAMINO.map(([r, c]) => r + ',' + c));
  const marca = ([r0, c0, r1, c1]) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) ocupado.add(r + ',' + c); };
  for (const id of IDS_HOTEL) TERRENOS[id].forEach(([r, c]) => ocupado.add(r + ',' + c));
  marca([BANCO.f0, BANCO.c0, BANCO.f1, BANCO.c1]); marca([AYUNTAMIENTO.f0, AYUNTAMIENTO.c0, AYUNTAMIENTO.f1, AYUNTAMIENTO.c1]); marca([LAGO.f0, LAGO.c0, LAGO.f1, LAGO.c1]);

  // ----- casillas del camino -----
  const tocables = E.tocables, tiles = [], texTile = {};
  const tilTex = t => {
    if (texTile[t]) return texTile[t]; const I = INFO_TIPO[t], c = lienzo(128, 128), x = c.getContext('2d');
    x.fillStyle = I.color; x.fillRect(0, 0, 128, 128); x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 7; x.strokeRect(6, 6, 116, 116);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (t === 'N') { x.fillStyle = 'rgba(255,255,255,.7)'; for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(34 + k * 30, 64, 6, 0, 6.3); x.fill(); } }
    else {
      if (t === 'P') { x.fillStyle = '#fff'; x.font = '900 70px Nunito, sans-serif'; x.fillText('P', 64, 52); } else { x.font = `62px ${EMOJI_FUENTE}`; x.fillText(I.ico, 64, 54); }
      x.fillStyle = '#fff'; x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 4; x.font = '900 23px Nunito, sans-serif'; x.fillText(I.corto, 64, 104);
    }
    return (texTile[t] = textura(c));
  };
  const asfalto = mat('#5E6370');
  CAMINO.forEach(([r, c]) => { const b = caja(1.04, .06, 1.04, mat('#3F4450'), cx(c + .5), .03, cz(r + .5), false); b.receiveShadow = true; S3.add(b); });
  CAMINO.forEach(([r, c], i) => {
    const t = TIPO[i], top = new T.MeshStandardMaterial({ map: tilTex(t), roughness: .5 });
    const m = new T.Mesh(new T.BoxGeometry(.95, .1, .95), [asfalto, asfalto, top, asfalto, asfalto, asfalto]); m.position.set(cx(c + .5), .05, cz(r + .5)); m.receiveShadow = true;
    m.userData.sq = i; S3.add(m); tocables.push(m); tiles.push(m);
  });
  const centroCasilla = i => ({ x: cx(CAMINO[i][1] + .5), z: cz(CAMINO[i][0] + .5) });

  // ----- terrenos -----
  const placas = {}, grupos = {}, estado = {};
  for (const id of IDS_HOTEL) {
    const D = HOTELES[id]; placas[id] = [];
    for (const [r, c] of TERRENOS[id]) {
      const m = caja(1, .08, 1, new T.MeshStandardMaterial({ color: tono(D.color, .5), roughness: .8 }), cx(c + .5), .04, cz(r + .5), false); m.userData.lote = id; S3.add(m); tocables.push(m); placas[id].push(m);
    }
    const g = new T.Group(); g.userData.lote = id; S3.add(g); grupos[id] = g; tocables.push(g);
    const a = centro([Math.min(...TERRENOS[id].map(t => t[0])), Math.min(...TERRENOS[id].map(t => t[1])), Math.max(...TERRENOS[id].map(t => t[0])), Math.max(...TERRENOS[id].map(t => t[1]))]);
    const e = etiqueta(D.nombre, D.color, '#fff', 1.5); e.position.set(a.x, 1.7, a.z); e.userData.lote = id; S3.add(e); estado[id] = { stages: [], etiq: e, sig: '', bandera: null, ox: a.x, oz: a.z };
  }

  // ----- construcción de edificios -----
  function texVent(color, nx, ny) {
    const c = lienzo(64, 64), x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, 64, 64); x.fillStyle = 'rgba(255,255,255,.78)';
    for (let i = 0; i < 2; i++) x.fillRect(8 + i * 30, 14, 20, 30); x.fillStyle = 'rgba(0,0,0,.14)'; x.fillRect(0, 54, 64, 10);
    const t = textura(c, 2); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(nx, ny); return t;
  }
  const cuerpo = (w, h, d, color, x = 0, y = 0, z = 0) => {
    const lado = new T.MeshStandardMaterial({ map: texVent(color, Math.max(1, Math.round(w * 1.6)), Math.max(1, Math.round(h * 2.2))), roughness: .6 });
    const lado2 = new T.MeshStandardMaterial({ map: texVent(color, Math.max(1, Math.round(d * 1.6)), Math.max(1, Math.round(h * 2.2))), roughness: .6 });
    const top = mat(tono(color, -.18));
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), [lado2, lado2, top, top, lado, lado]); m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; return m;
  };
  const cono = (r, h, seg, color, y, rot = Math.PI / 4, sx = 1, sz = 1) => { const m = new T.Mesh(new T.ConeGeometry(r, h, seg), mat(color)); m.position.y = y + h / 2; m.rotation.y = rot; m.scale.set(sx, 1, sz); m.castShadow = true; return m; };
  const palmera = (x, z, s = 1) => {
    const g = new T.Group(); const tr = new T.Mesh(new T.CylinderGeometry(.03 * s, .045 * s, .5 * s, 6), mat('#8B5E34')); tr.position.y = .25 * s; tr.castShadow = true; g.add(tr);
    for (let i = 0; i < 5; i++) { const h = new T.Mesh(new T.ConeGeometry(.12 * s, .34 * s, 4), mat('#2E9D4B')); h.position.set(Math.cos(i * 1.26) * .13 * s, .52 * s, Math.sin(i * 1.26) * .13 * s); h.rotation.set(Math.sin(i * 1.26) * 1.3, 0, -Math.cos(i * 1.26) * 1.3); h.castShadow = true; g.add(h); }
    g.position.set(x, 0, z); return g;
  };
  function piscina(w, d) {
    const g = new T.Group(); g.add(caja(w, .1, d, mat('#F4F4F4'), 0, .05, 0)); g.add(caja(w - .16, .11, d - .16, new T.MeshStandardMaterial({ color: '#3EC1EA', roughness: .15, metalness: .1 }), 0, .06, 0, false));
    if (w > .8) { const p = new T.Mesh(new T.CylinderGeometry(.02, .02, .55, 6), mat('#999')); p.position.set(w / 2 - .12, .3, d / 2 - .12); g.add(p); g.add(cono(.2, .1, 10, '#E4573D', .55, 0)); g.children[g.children.length - 1].position.set(w / 2 - .12, .6, d / 2 - .12); }
    g.add(palmera(-w / 2 + .14, -d / 2 + .14, .8)); return g;
  }
  function edificio(id, k) {
    const D = HOTELES[id], n = nEdif(id), ancla = centro(ANCLAS[id][k]), g = new T.Group(); g.position.set(ancla.x, .08, ancla.z);
    const w = Math.max(.45, ancla.w - .22), d = Math.max(.45, ancla.d - .22), col = D.color, main = k === 0, fac = k === n;
    if (fac) { g.add(piscina(w, d)); return g; }
    const alto = main ? 1 : .72, f = D.estilo;
    if (f === 'pagoda') { const tiers = main ? 3 : 2; let y = 0; for (let i = 0; i < tiers; i++) { const s = 1 - i * .2; g.add(cuerpo(w * s * .92, .38, d * s * .92, col, 0, y, 0)); const ro = cono(Math.max(w, d) * s * .78, .24, 4, '#8C2B2B', y + .38); ro.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); g.add(ro); y += .5; } g.add(cono(.05, .3, 6, '#F2B600', y - .02)); }
    else if (f === 'boomerang') { const L = Math.max(w, d) * .62; for (const s of [-1, 1]) { const b = cuerpo(L, 1.05, .46, '#1FA2A6', 0, 0, 0); b.position.set(Math.cos(.5) * L * .45 * s, .525, Math.sin(.5) * L * .45 * s * -1 * (d > w ? 1 : 1)); b.rotation.y = s * .5; g.add(b); } g.add(caja(.5, 1.05, .5, mat(tono(col, -.1)), 0, .525, 0)); g.add(cono(.18, .25, 10, '#F2B600', 1.05, 0)); }
    else if (f === 'clasico') { g.add(cuerpo(w, alto + .1, d, col)); const r = cono(Math.max(w, d) * .74, .36, 4, '#44474F', alto + .1); r.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); g.add(r); }
    else if (f === 'torre') { const h = main ? 2.1 : 1.1 + k * .18; g.add(cuerpo(w, h, d, '#4C86D6')); g.add(caja(w * .6, .14, d * .6, mat('#2A4F8F'), 0, h + .07, 0)); if (main) { const an = new T.Mesh(new T.CylinderGeometry(.02, .02, .5, 5), mat('#ddd')); an.position.y = h + .38; g.add(an); } }
    else if (f === 'hexagono') { const r = Math.min(w, d) * .5, h = main ? 1.35 : .85; const cy = new T.Mesh(new T.CylinderGeometry(r, r, h, 6), new T.MeshStandardMaterial({ map: texVent(col, 6, Math.round(h * 2.2)), roughness: .55 })); cy.position.y = h / 2; cy.castShadow = true; g.add(cy); g.add(cono(r * 1.1, .38, 6, '#E0B84A', h, 0)); }
    else if (f === 'playa') { g.add(cuerpo(w, .5, d, col)); g.add(cuerpo(w * .8, .46, d * .8, tono(col, .15).getStyle(), 0, .5, 0)); g.add(caja(w * .9, .05, d * .9, mat('#fff'), 0, .98, 0)); if (main) g.add(palmera(w / 2 - .1, d / 2 - .1, .9)); }
    else if (f === 'cupula') { const r = Math.min(w, d) * (main ? .42 : .22); if (main) { g.add(cuerpo(w * .9, .55, d * .9, '#F1E6C8')); const cu = new T.Mesh(new T.SphereGeometry(r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('#FAF3DE')); cu.position.y = .55; cu.castShadow = true; g.add(cu); g.add(cono(.04, .3, 6, '#E0B84A', .55 + r - .02)); for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const m = new T.Mesh(new T.CylinderGeometry(.06, .07, .9, 8), mat('#FAF3DE')); m.position.set(sx * w * .46, .45, sz * d * .46); m.castShadow = true; g.add(m); g.add(cono(.08, .16, 8, '#E0B84A', .9)); g.children[g.children.length - 1].position.set(sx * w * .46, .98, sz * d * .46); } } else { const m = new T.Mesh(new T.CylinderGeometry(.14, .18, 1.1, 10), mat('#FAF3DE')); m.position.y = .55; m.castShadow = true; g.add(m); g.add(cono(.17, .26, 10, '#E0B84A', 1.1, 0)); } }
    else { const r = Math.min(w, d) * .5; const cy = new T.Mesh(new T.CylinderGeometry(r * .9, r, main ? .55 : .42, 14), mat('#D9B88A')); cy.position.y = (main ? .55 : .42) / 2; cy.castShadow = true; g.add(cy); g.add(cono(r * 1.25, main ? .7 : .5, 14, '#9A6B2F', main ? .55 : .42, 0)); if (w > 1.3 && main) { const h2 = cy.clone(); h2.scale.setScalar(.7); h2.position.set(w * .26, .2, d * .12); g.add(h2); } }
    return g;
  }

  // ----- Banco, Ayuntamiento, lago, árboles -----
  const edifPublico = (rect, tipo) => {
    const a = centro(rect), g = new T.Group(); g.position.set(a.x, .06, a.z);
    if (tipo === 'banco') {
      g.add(cuerpo(a.w * .9, .62, a.d * .86, '#F3EBD6')); for (let i = 0; i < 5; i++) { const col = new T.Mesh(new T.CylinderGeometry(.05, .05, .6, 8), mat('#fff')); col.position.set(-a.w * .38 + i * a.w * .19, .3, a.d * .46); col.castShadow = true; g.add(col); }
      const sh = new T.Shape(); sh.moveTo(-a.w * .5, 0); sh.lineTo(a.w * .5, 0); sh.lineTo(0, .38); sh.closePath(); const fr = new T.Mesh(new T.ExtrudeGeometry(sh, { depth: a.d * .86, bevelEnabled: false }), mat('#C9A24A')); fr.position.set(0, .62, -a.d * .43); fr.rotation.y = 0; fr.castShadow = true; g.add(fr);
      const e = etiqueta('🏦 BANCO', '#7A5A12', '#fff', 1.5); e.position.y = 1.35; g.add(e);
    } else {
      g.add(cuerpo(a.w * .86, .7, a.d * .8, '#C4694B')); g.add(cono(Math.max(a.w, a.d) * .6, .3, 4, '#5A3A2F', .7).clone()); g.children[g.children.length - 1].scale.set(a.w / Math.max(a.w, a.d) * 1.1, 1, a.d / Math.max(a.w, a.d) * 1.1);
      const to = cuerpo(.34, .95, .34, '#C4694B', a.w * .22, .7, 0); g.add(to); g.add(cono(.26, .3, 4, '#5A3A2F', 1.65).clone()); g.children[g.children.length - 1].position.x = a.w * .22;
      const e = etiqueta('🏛️ AYUNTAMIENTO', '#3A4F8F', '#fff', 1.9); e.position.y = 2.3; g.add(e);
    }
    S3.add(g); return g;
  };
  edifPublico([BANCO.f0, BANCO.c0, BANCO.f1, BANCO.c1], 'banco'); edifPublico([AYUNTAMIENTO.f0, AYUNTAMIENTO.c0, AYUNTAMIENTO.f1, AYUNTAMIENTO.c1], 'ayto');
  { const a = centro([LAGO.f0, LAGO.c0, LAGO.f1, LAGO.c1]); const l = new T.Mesh(new T.CylinderGeometry(.5, .5, .05, 24), new T.MeshStandardMaterial({ color: '#4DB7E8', roughness: .15, metalness: .1 })); l.scale.set(a.w * .98, 1, a.d * .98); l.position.set(a.x, .03, a.z); l.receiveShadow = true; S3.add(l); }
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  for (let r = CAJA.r0; r <= CAJA.r1; r++) for (let c = CAJA.c0; c <= CAJA.c1; c++) {
    if (ocupado.has(r + ',' + c)) continue; const q = hash(r, c); if (q > .45) continue;
    const g = new T.Group(), s = .7 + hash(c, r) * .6; const tr = new T.Mesh(new T.CylinderGeometry(.05, .07, .3 * s, 6), mat('#7B5230')); tr.position.y = .15 * s; tr.castShadow = true; g.add(tr);
    const co = new T.Mesh(new T.IcosahedronGeometry(.26 * s, 0), mat(q > .3 ? '#3FA45B' : '#58B96B')); co.position.y = .42 * s; co.castShadow = true; g.add(co);
    g.position.set(cx(c + .5) + (hash(r + 3, c) - .5) * .4, 0, cz(r + .5) + (hash(r, c + 7) - .5) * .4); S3.add(g);
  }
  // líneas del Banco y del Ayuntamiento cruzando el camino
  const linea = (i, color, emoji) => {
    const a = centroCasilla(i), b = centroCasilla((i + 1) % N), mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, horiz = Math.abs(b.x - a.x) > .1;
    const m = caja(horiz ? .12 : .98, .13, horiz ? .98 : .12, mat(color, { emissive: color, emissiveIntensity: .25 }), mx, .1, mz, false); S3.add(m);
    const s = new T.Sprite(new T.SpriteMaterial({ map: emojiTextura(emoji, 96), transparent: true, depthTest: false })); s.scale.set(.5, .5, .5); s.position.set(mx, .65, mz); s.renderOrder = 15; S3.add(s);
  };
  linea(LINEA_BANCO, '#F2B600', '🏦'); linea(LINEA_AYTO, '#2F9BFF', '🏛️');

  // ----- coches -----
  const coches = [];
  function crearCoche(color) {
    const g = new T.Group(), cm = mat(color, { roughness: .3, metalness: .2 });
    g.add(caja(.56, .16, .3, cm, 0, .17, 0)); g.add(caja(.28, .15, .26, mat('#DDEEFF', { roughness: .15 }), -.04, .32, 0)); g.add(caja(.1, .06, .22, cm, -.04, .41, 0));
    for (const [x, z] of [[-.18, -.16], [.18, -.16], [-.18, .16], [.18, .16]]) { const w = new T.Mesh(new T.CylinderGeometry(.07, .07, .06, 10), mat('#222')); w.rotation.x = Math.PI / 2; w.position.set(x, .08, z); g.add(w); }
    g.scale.setScalar(.92); S3.add(g); return g;
  }
  const rumbo = (a, b) => Math.atan2(-(b.z - a.z), b.x - a.x);
  function colocar(j, g, pos) {
    const c = centroCasilla(pos), nx = centroCasilla((pos + 1) % N);
    const off = pos === 0 ? (j - 1.5) * .21 : 0; g.position.set(c.x, .1, c.z + off); g.rotation.y = rumbo(c, nx);
  }
  V.mover = (j, camino, ms = 190) => {
    const g = coches[j]; if (!g || camino.length < 2) return Promise.resolve(); g.userData.anim = true;
    const pts = camino.map(centroCasilla), seg = pts.length - 1;
    return E.tween(ms * seg, u => {
      const t = u * seg, i = Math.min(seg - 1, Math.floor(t)), f = t - i, a = pts[i], b = pts[i + 1];
      g.position.set(a.x + (b.x - a.x) * f, .1 + Math.sin(f * Math.PI) * .09, a.z + (b.z - a.z) * f); g.rotation.y = rumbo(a, b);
      if (u >= 1) { const fin = camino[camino.length - 1]; colocar(j, g, fin); g.userData.anim = false; }
    });
  };

  // ----- dado -----
  const PIPS = { 1: [[2, 2]], 2: [[1, 1], [3, 3]], 3: [[1, 1], [2, 2], [3, 3]], 4: [[1, 1], [3, 1], [1, 3], [3, 3]], 5: [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]], 6: [[1, 1], [3, 1], [1, 2], [3, 2], [1, 3], [3, 3]] };
  const texDado = {};
  const cara = n => texDado[n] || (texDado[n] = (() => { const c = lienzo(96, 96), x = c.getContext('2d'); x.fillStyle = '#FBFBFB'; x.fillRect(0, 0, 96, 96); x.strokeStyle = '#ddd'; x.lineWidth = 6; x.strokeRect(2, 2, 92, 92); x.fillStyle = n === 1 ? '#D33' : '#222'; for (const [a, b] of PIPS[n]) { x.beginPath(); x.arc(a * 24, b * 24, n === 1 ? 11 : 8, 0, 6.3); x.fill(); } return textura(c, 2); })());
  let dado = null;
  V.dado = (v, ms = 900) => {
    if (dado) { S3.remove(dado); dado = null; }
    const otros = [1, 2, 3, 4, 5, 6].filter(n => n !== v && n !== 7 - v), a = otros[0], b = otros[1];
    const ms2 = [a, 7 - a, v, 7 - v, b, 7 - b].map(n => new T.MeshStandardMaterial({ map: cara(n), roughness: .35 }));
    const d = new T.Mesh(new T.BoxGeometry(.8, .8, .8), ms2); d.castShadow = true; dado = d; S3.add(d);
    const x0 = (Math.random() - .5) * 2, z0 = 1.2 + Math.random(), sx = (Math.random() * 4 + 4) * (Math.random() < .5 ? -1 : 1), sz = (Math.random() * 4 + 4) * (Math.random() < .5 ? -1 : 1);
    return E.tween(ms, u => {
      const k = 1 - u; d.position.set(x0 * (1 - u * .3), .4 + Math.abs(Math.sin(u * Math.PI * 3)) * 1.7 * k, z0 + 5 * k * k); d.rotation.set(sx * k * k, 0, sz * k * k);
    });
  };
  V.quitarDado = () => { if (dado) { S3.remove(dado); dado = null; E.marcar(); } };

  // ----- pintar el estado -----
  const ents = new Map(), flags = {};
  const portico = (hid, sq) => {
    const g = new T.Group(), D = HOTELES[hid], c = centroCasilla(sq), l = LADOS[sq].find(x => x.h === hid), dir = l ? l.d : [-1, 0], cm = mat(D.color);
    const horiz = dir[0] !== 0; // dir = [df, dc] desde el camino hacia el terreno
    g.add(caja(.07, .5, .07, cm, -.22, .3, 0)); g.add(caja(.07, .5, .07, cm, .22, .3, 0)); g.add(caja(.56, .1, .12, cm, 0, .58, 0)); g.add(caja(.4, .04, .1, mat('#fff'), 0, .66, 0));
    g.position.set(c.x + dir[1] * .38, .1, c.z + dir[0] * .38); g.rotation.y = horiz ? 0 : Math.PI / 2; return g;
  };
  V.pintar = S => {
    S.jug.forEach((p, j) => {
      if (!coches[j]) { coches[j] = crearCoche(p.color); colocar(j, coches[j], p.pos); }
      const g = coches[j]; g.visible = p.vivo; if (!g.userData.anim) colocar(j, g, p.pos);
    });
    for (const id of IDS_HOTEL) {
      const Hh = S.hot[id], st = estado[id], D = HOTELES[id], n = nEdif(id), objetivo = Hh.etapa + (Hh.inst ? 1 : 0);
      if (objetivo < st.stages.length) { for (const s of st.stages) grupos[id].remove(s); st.stages = []; }
      while (st.stages.length < objetivo) { const k = st.stages.length < Hh.etapa ? st.stages.length : n; const e = edificio(id, k); e.userData.nace = performance.now(); e.scale.y = .001; grupos[id].add(e); st.stages.push(e); }
      const sig = Hh.dueno + '|' + objetivo;
      if (sig !== st.sig) {
        st.sig = sig; const dueno = Hh.dueno >= 0 ? S.jug[Hh.dueno] : null;
        if (st.bandera) { S3.remove(st.bandera); st.bandera = null; }
        if (dueno) { const b = new T.Group(); const mastil = new T.Mesh(new T.CylinderGeometry(.025, .025, 1.0, 6), mat('#eee')); mastil.position.y = .5; b.add(mastil); b.add(caja(.42, .26, .03, mat(dueno.color, { emissive: dueno.color, emissiveIntensity: .25 }), .22, .88, 0)); const c0 = TERRENOS[id][0]; b.position.set(cx(c0[1] + .2), .08, cz(c0[0] + .2)); S3.add(b); st.bandera = b; }
        S3.remove(st.etiq); st.etiq.material.map.dispose(); st.etiq.material.dispose();
        const e = etiqueta(D.nombre + (objetivo ? ' ' + '★'.repeat(Math.min(5, Math.max(1, Hh.etapa))) : ''), dueno ? dueno.color : '#7B8190', '#fff', 1.7); e.position.set(st.ox, 1.75, st.oz); e.userData.lote = id; S3.add(e); st.etiq = e;
      }
    }
    for (let sq = 0; sq < N; sq++) {
      const want = S.entDe[sq], cur = ents.get(sq);
      if (cur && cur.h !== want) { S3.remove(cur.g); ents.delete(sq); }
      if (want && !(cur && cur.h === want)) { const g = portico(want, sq); S3.add(g); ents.set(sq, { h: want, g }); }
    }
    E.marcar();
  };
  // ----- resaltado -----
  const anillos = [], resLotes = new Set(); let tt = 0;
  V.resaltar = (cfg = {}) => {
    for (const a of anillos) S3.remove(a); anillos.length = 0;
    for (const sq of cfg.casillas || []) { const c = centroCasilla(sq), m = new T.Mesh(new T.RingGeometry(.3, .47, 28), new T.MeshBasicMaterial({ color: '#FFC21A', side: T.DoubleSide, transparent: true, opacity: .95, depthTest: false })); m.rotation.x = -Math.PI / 2; m.position.set(c.x, .17, c.z); m.userData.sq = sq; m.renderOrder = 12; S3.add(m); anillos.push(m); }
    resLotes.clear(); for (const h of cfg.lotes || []) resLotes.add(h);
    for (const id of IDS_HOTEL) for (const m of placas[id]) { m.material.emissive.set(resLotes.has(id) ? '#FFC21A' : '#000000'); m.material.emissiveIntensity = resLotes.has(id) ? .5 : 0; }
    E.marcar();
  };
  let ult = 0;
  E.alFrame = ahora => {
    const dt = ult ? Math.min(.05, (ahora - ult) / 1000) : .016; ult = ahora; tt += dt; let sigue = false;
    for (const id of IDS_HOTEL) for (const e of estado[id].stages) { if (e.userData.nace) { const u = Math.min(1, (ahora - e.userData.nace) / 650), s = 1 - Math.pow(1 - u, 3); e.scale.y = Math.max(.001, s * (1 + Math.sin(u * Math.PI) * .12)); if (u >= 1) { e.scale.y = 1; e.userData.nace = 0; } sigue = true; } }
    if (anillos.length) { const s = 1 + Math.sin(tt * 6) * .14; for (const a of anillos) a.scale.setScalar(s); sigue = true; }
    if (resLotes.size) { for (const h of resLotes) for (const m of placas[h]) m.material.emissiveIntensity = .35 + (Math.sin(tt * 5) + 1) * .22; sigue = true; }
    return sigue;
  };
  // ----- toques -----
  E.alTocar = ev => {
    const hit = E.raycast(ev, tocables.concat(anillos)); if (!hit.length || !V.alTocar) return;
    for (const h of hit) { let o = h.object; while (o) { if (o.userData && o.userData.sq != null) return V.alTocar({ tipo: 'casilla', id: o.userData.sq }); if (o.userData && o.userData.lote) return V.alTocar({ tipo: 'lote', id: o.userData.lote }); o = o.parent; } }
  };
  V.recolor = () => {
    const s = getComputedStyle(cont), v = (n, d) => s.getPropertyValue(n).trim() || d;
    hierba.material.color.set(v('--ht-hierba', '#8CCB6A')); marco.material.color.set(v('--ht-marco', '#8A5A3B')); E.marcar();
  };
  V.camara = E.camara; V.destruir = () => { for (const k of Object.keys(texDado)) texDado[k].dispose(); E.destruir(); };
  V.recolor(); E.iniciar();
  return V;
}
