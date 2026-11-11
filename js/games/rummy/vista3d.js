// Rummy · mesa en 3D (Three.js): las jugadas se ven sobre un tapete con fichas con relieve (bisel y grosor reales).
// Las fichas se deslizan al reorganizar la mesa. El atril sigue siendo HTML (se arrastra para ordenarlo).
import { capaTextura } from '../../core/fichas.js';
import { crearEscena, T, lienzo, textura } from '../../core/escena3d.js';
import { BARAJAS, urlTapete } from '../../core/cartas.js';

const TW = .58, TH = .76, TD = .13, MESA_W = 8.4, MESA_H = 5.2, MAXW = 7.7;
const css = (el, v, d) => getComputedStyle(el).getPropertyValue(v).trim() || d;
const rr = (x, a, b, w, h, r) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); };
const lerp = (a, b, k) => a + (b - a) * k;
const esComodin = id => id >= 104, color = id => (id % 52) / 13 | 0, numero = id => id % 13 + 1;

export function crearRummy3D(cont) {
  const E = crearEscena(cont, { fov: 36, az: 0, pol: .6, polMin: .25, polMax: 1.2, radio: 3.8, margen: .5, objetivo: [0, 0, 0], distMin: 5, distMax: 22, sombraRadio: 8, sombraTam: 1536, sol: { pos: [-3, 11, 6], int: 2.1 }, hemi: { int: 1.7 }, sueloY: -.3, etiqueta: 'Mesa de Rummy en 3D' });
  const V = { alFicha: null, alJugada: null }, esc = E.escena;
  let col = {}, texCache = new Map(), estF = { tex: null, esc: 1 };
  const leer = el => { col = { r1: css(el, '--rm1', '#12A05C'), r2: css(el, '--rm2', '#0A6B3C'), fz: css(el, '--fz', '#FFF8E7'), fz2: css(el, '--fz2', '#EADFC4'), fb: css(el, '--fb', '#C9B88F'), k: [0, 1, 2, 3].map(i => css(el, '--k' + i, ['#E0243A', '#1F6BFF', '#F28C1B', '#1B2340'][i])) }; };
  leer(cont);

  /* tapete y borde */
  const matTapete = new T.MeshStandardMaterial({ color: col.r1, roughness: .95 });
  const tapete = new T.Mesh(new T.BoxGeometry(MESA_W, .3, MESA_H), matTapete); tapete.position.y = -.16; tapete.receiveShadow = true; esc.add(tapete);
  const centro = new T.Mesh(new T.PlaneGeometry(MESA_W - 1.2, MESA_H - 1.2), new T.MeshStandardMaterial({ color: col.r2, roughness: 1, transparent: true, opacity: .55 })); centro.rotation.x = -Math.PI / 2; centro.position.y = .001; esc.add(centro);
  const madera = new T.MeshStandardMaterial({ color: 0x6b3f22, roughness: .55 });
  for (const [w, h, x, z] of [[MESA_W + .6, .4, 0, -(MESA_H / 2 + .15)], [MESA_W + .6, .4, 0, MESA_H / 2 + .15], [.4, MESA_H, -(MESA_W / 2 + .15), 0], [.4, MESA_H, MESA_W / 2 + .15, 0]]) { const b = new T.Mesh(new T.BoxGeometry(w, .34, h), madera); b.position.set(x, -.02, z); b.castShadow = true; b.receiveShadow = true; esc.add(b); }

  /* ficha: rectángulo redondeado con bisel */
  const forma = new T.Shape(), r = .09, x0 = -TW / 2, y0 = -TH / 2;
  forma.moveTo(x0 + r, y0); forma.lineTo(-x0 - r, y0); forma.quadraticCurveTo(-x0, y0, -x0, y0 + r); forma.lineTo(-x0, -y0 - r); forma.quadraticCurveTo(-x0, -y0, -x0 - r, -y0); forma.lineTo(x0 + r, -y0); forma.quadraticCurveTo(x0, -y0, x0, -y0 - r); forma.lineTo(x0, y0 + r); forma.quadraticCurveTo(x0, y0, x0 + r, y0);
  const GF = new T.ExtrudeGeometry(forma, { depth: TD, bevelEnabled: true, bevelSize: .03, bevelThickness: .035, bevelSegments: 2, curveSegments: 5 }); GF.rotateX(-Math.PI / 2);
  const GP = new T.PlaneGeometry(1, 1); GP.rotateX(-Math.PI / 2);
  const matLado = new T.MeshStandardMaterial({ color: col.fb, roughness: .6 });

  const texFicha = id => {
    const k = esComodin(id) ? 'J' : color(id) + '-' + numero(id);
    if (texCache.has(k)) return texCache.get(k);
    const W = 160, H = 216, c = lienzo(W, H), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, col.fz); g.addColorStop(1, col.fz2); x.fillStyle = g; x.fillRect(0, 0, W, H); capaTextura(x, 0, 0, W, H, estF.tex);
    x.strokeStyle = 'rgba(0,0,0,.10)'; x.lineWidth = 5; rr(x, 14, 14, W - 28, H - 28, 16); x.stroke();
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (esComodin(id)) { const gr = x.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#FF8FB1'); gr.addColorStop(.5, '#FFD34D'); gr.addColorStop(1, '#6FA8FF'); x.fillStyle = gr; x.font = `800 132px system-ui,sans-serif`; x.fillText('★', W / 2, H / 2 + 6); }
    else { x.fillStyle = col.k[color(id)]; x.font = `800 ${numero(id) > 9 ? 108 : 124}px "Baloo 2",system-ui,sans-serif`; x.fillText(String(numero(id)), W / 2, H / 2 - 8); x.beginPath(); x.arc(W / 2, H - 38, 9, 0, 7); x.fill(); }
    const t = textura(c, 8); t.repeat.set(1 / TW, 1 / TH); t.offset.set(.5, .5); texCache.set(k, t); return t;
  };

  /* fichas (una malla por ficha, reutilizada) y jugadas */
  const fichas = new Map(), placas = [], marcas = [];
  const ficha = id => {
    let f = fichas.get(id);
    if (!f) {
      const mat = new T.MeshStandardMaterial({ roughness: .4, emissive: 0x000000 }), m = new T.Mesh(GF, [mat, matLado]); m.castShadow = true; m.receiveShadow = true; m.userData.id = id;
      esc.add(m); f = { m, mat, vivo: false, k: '', c: { x: 0, y: 3, z: 0 }, t: { x: 0, y: 0, z: 0 } }; fichas.set(id, f);
    }
    return f;
  };
  const sprite = (tex, w, h) => { const s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false })); s.scale.set(w, h, 1); s.renderOrder = 10; return s; };
  const mas = (() => { const c = lienzo(128, 160), x = c.getContext('2d'); x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 7; x.setLineDash([14, 10]); rr(x, 8, 8, 112, 144, 14); x.stroke(); x.setLineDash([]); x.fillStyle = '#fff'; x.font = '800 90px "Baloo 2",system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('+', 64, 84); return textura(c); })();
  const vacia = (() => { const c = lienzo(640, 120), x = c.getContext('2d'); x.fillStyle = 'rgba(0,0,0,.35)'; rr(x, 4, 4, 632, 112, 56); x.fill(); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '800 40px "Baloo 2",system-ui,sans-serif'; x.fillText('La mesa está vacía · 1.ª bajada: 30 puntos', 320, 62); return textura(c, 4); })();
  const hueco = sprite(vacia, 5.4, 1.0); hueco.position.set(0, .3, 0); esc.add(hueco);

  function disponer(mesa, conMas) {
    for (const s of [1, .88, .78, .68, .6, .52]) {
      const p = (TW + .06) * s, filas = []; let fila = [], x = 0;
      mesa.forEach((jug, k) => {
        const n = jug.length + (conMas ? 1 : 0), w = n * p + .2 * s;
        if (fila.length && x + w > MAXW) { filas.push(fila); fila = []; x = 0; }
        fila.push({ k, x, w, n }); x += w + .3 * s;
      });
      if (fila.length) filas.push(fila);
      const paso = (TH + .5) * s;
      if (filas.length * paso <= MESA_H - 1 || s === .52) return { s, p, paso, filas };
    }
  }
  let plano = null;
  V.pintar = D => {
    const { mesa, validas, sel, recientes, mias, editable, conMas } = D;
    hueco.visible = !mesa.length;
    for (const m of [...placas, ...marcas]) { esc.remove(m); m.material.dispose(); } placas.length = 0; marcas.length = 0;
    const L = disponer(mesa, conMas), usadas = new Set(); plano = L;
    if (L) L.filas.forEach((fila, fi) => {
      const z = (fi - (L.filas.length - 1) / 2) * L.paso;
      for (const J of fila) {
        const x0 = -MAXW / 2 + J.x, pl = new T.Mesh(GP, new T.MeshBasicMaterial({ color: validas[J.k] ? 0x000000 : 0xFF2E45, transparent: true, opacity: validas[J.k] ? .22 : .7 }));
        pl.scale.set(J.w, (TH + .2) * L.s, 1); pl.position.set(x0 + J.w / 2, .004, z); pl.userData.k = J.k; esc.add(pl); placas.push(pl);
        mesa[J.k].forEach((id, i) => {
          const f = ficha(id); usadas.add(id); const lev = sel.has(id), s = L.s;
          if (!f.vivo) { f.vivo = true; f.c = { x: 0, y: 2.4, z: z - 1.5, s }; }
          Object.assign(f.t, { x: x0 + .1 * s + L.p * (i + .5), y: lev ? .36 : .03, z, s });
          const key = (esComodin(id) ? 'J' : color(id) + '-' + numero(id)); if (f.k !== key) { f.k = key; f.mat.map = texFicha(id); f.mat.needsUpdate = true; }
          f.mat.emissive.set(lev ? 0x7a5a00 : recientes.has(id) ? 0x555555 : mias.has(id) ? 0x2b2200 : 0x000000);
          f.m.visible = true; f.m.userData.fija = !editable(id);
        });
        if (conMas) { const mk = new T.Mesh(GP, new T.MeshBasicMaterial({ map: mas, transparent: true })); mk.scale.set(TW * L.s, TH * L.s, 1); mk.position.set(x0 + .1 * L.s + L.p * (mesa[J.k].length + .5), .01, z); mk.userData.k = J.k; esc.add(mk); marcas.push(mk); }
      }
    });
    for (const [id, f] of fichas) if (!usadas.has(id)) { f.vivo = false; f.m.visible = false; }
    E.tocables = [...fichas.values()].filter(f => f.vivo).map(f => f.m).concat(placas, marcas);
    E.marcar();
  };
  let texTapete = null;
  V.fichas = e => {                                                      // 🀫 Apariencia: textura y tamaño de las fichas
    if (e.tex === estF.tex && e.esc === estF.esc) return; const nt = e.tex !== estF.tex; estF = { tex: e.tex, esc: e.esc };
    if (nt) { for (const t of texCache.values()) t.dispose(); texCache = new Map(); for (const f of fichas.values()) { f.k = ''; f.mat.map = null; f.mat.needsUpdate = true; } }
    E.marcar();
  };
  V.recolor = () => {
    leer(cont); matTapete.color.set(col.r1); centro.material.color.set(col.r2); matLado.color.set(col.fb);
    if (texTapete) { texTapete.dispose(); texTapete = null; } matTapete.map = null; centro.visible = true;
    const tp = BARAJAS.tapetes.find(t => t.id === (cont.closest('.juego') || cont).dataset.mesa);
    if (tp) { const c = lienzo(512, 512), x = c.getContext('2d'); x.fillStyle = col.r1; x.fillRect(0, 0, 512, 512); texTapete = textura(c, 4); matTapete.map = texTapete; matTapete.color.set(0xffffff); centro.visible = false;
      const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { x.drawImage(im, 0, 0, 512, 512); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, 0, 512, 512); texTapete.needsUpdate = true; E.marcar(); }; im.src = urlTapete(tp); }
    matTapete.needsUpdate = true;
    for (const t of texCache.values()) t.dispose(); texCache = new Map();
    for (const f of fichas.values()) { f.k = ''; f.mat.map = null; f.mat.needsUpdate = true; }
    E.marcar();
  };

  E.alFrame = () => {
    let mueve = false;
    for (const f of fichas.values()) {
      if (!f.vivo) continue; const c = f.c, t = f.t;
      if (Math.abs(t.x - c.x) + Math.abs(t.y - c.y) + Math.abs(t.z - c.z) + Math.abs(t.s - c.s) > .003) { c.x = lerp(c.x, t.x, .25); c.y = lerp(c.y, t.y, .25); c.z = lerp(c.z, t.z, .25); c.s = lerp(c.s, t.s, .25); mueve = true; } else Object.assign(c, t);
      f.m.position.set(c.x, c.y, c.z); f.m.scale.setScalar(c.s * estF.esc);
    }
    return mueve;
  };
  E.alTocar = ev => {
    const h = E.raycast(ev); if (!h.length) return;
    const o = h[0].object; if (o.userData.id != null) { if (V.alFicha && !o.userData.fija) V.alFicha(o.userData.id); }
    else if (o.userData.k != null && V.alJugada) V.alJugada(o.userData.k);
  };
  V.camara = m => E.camara(m);
  V.destruir = () => { for (const t of texCache.values()) t.dispose(); mas.dispose(); vacia.dispose(); E.destruir(); };
  V.E = E; E.iniciar();
  return V;
}
