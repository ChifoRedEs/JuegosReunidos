// Klotski · vista 3D (Three.js): bandeja con marco, fichas con relieve que se deslizan, destinos marcados y arrastre con el dedo.
// Solo dibuja: el juego (index.js) pasa el estado con V.pintar() y recibe V.alMover / V.alToque / V.alCelda.
import { crearEscena, T, lienzo, textura } from '../../core/escena3d.js';
import { metaX, DIR } from './motor.js';

const css = (el, v, d) => getComputedStyle(el).getPropertyValue(v).trim() || d;
const rr = (x, a, b, w, h, r) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); };
const lerp = (a, b, k) => a + (b - a) * k;
import { estilo, capaTextura, oscuro } from '../../core/fichas.js';
const GAP = .09, ALTO = .36;

const estilo0 = () => estilo({});       // 🎨 Fichas: color (ya viene en --k0…), textura, forma y tamaño elegidos
const ef = E => Math.min(1, E.esc);
export function crearKlotski3D(cont, { w, h, modo }) {
  const M = Math.max(w, h);
  const E = crearEscena(cont, { fov: 36, az: 0, pol: .55, polMin: .2, polMax: 1.15, radio: M * .5 + .85, margen: .5, objetivo: [0, 0, .1], distMin: 5, distMax: 30, sombraRadio: M + 3, sombraTam: 1536, sol: { pos: [-3, 11, 6], int: 2.1 }, hemi: { int: 1.7 }, sueloY: -.3, etiqueta: 'Tablero de Klotski en 3D' });
  const V = { limites: () => [0, 0, 0, 0], alMover: null, alToque: null, alCelda: null }, esc = E.escena;
  let col = {}, tex = new Map(), sel = -1, pistaI = -1, estilo = 'clasico', EST = estilo0();
  const leer = () => {
    const j = cont.closest('.juego') || cont; estilo = j.dataset.estilo || 'clasico';
    col = { m1: css(cont, '--kl-marco', '#8A5A2B'), m2: css(cont, '--kl-marco2', '#5E3B1A'), hueco: css(cont, '--kl-hueco', '#2B1D12'), kg: css(cont, '--kg', '#E0243A'), kt: css(cont, '--kt', '#ffffff'), k: [0, 1, 2, 3, 4, 5].map(i => css(cont, '--k' + i, ['#FF5A5F', '#4C8DFF', '#3DCB7A', '#FFD23F', '#9B5DE5', '#FF8A3D'][i])) };
  };
  leer();

  /* bandeja: suelo, marco con la salida en el borde inferior */
  const matMarco = new T.MeshStandardMaterial({ color: col.m1, roughness: .55 }), matSuelo = new T.MeshStandardMaterial({ color: col.hueco, roughness: .9 });
  const suelo = new T.Mesh(new T.BoxGeometry(w, .2, h), matSuelo); suelo.position.y = -.1; suelo.receiveShadow = true; suelo.userData.suelo = true; esc.add(suelo);
  const rej = lienzo(64 * w, 64 * h), rx = rej.getContext('2d'); rx.strokeStyle = 'rgba(255,255,255,.1)'; rx.lineWidth = 2;
  for (let i = 0; i <= w; i++) { rx.beginPath(); rx.moveTo(i * 64, 0); rx.lineTo(i * 64, 64 * h); rx.stroke(); } for (let i = 0; i <= h; i++) { rx.beginPath(); rx.moveTo(0, i * 64); rx.lineTo(64 * w, i * 64); rx.stroke(); }
  const lineas = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: textura(rej, 4), transparent: true })); lineas.rotation.x = -Math.PI / 2; lineas.position.y = .003; esc.add(lineas);
  const gx = metaX(w), BT = .32, BH = .5;
  const pared = (ax, az, bx, bz) => { const m = new T.Mesh(new T.BoxGeometry(bx, BH, bz), matMarco); m.position.set(ax, BH / 2 - .2, az); m.castShadow = true; m.receiveShadow = true; esc.add(m); };
  pared(0, -h / 2 - BT / 2, w + 2 * BT, BT); pared(-w / 2 - BT / 2, 0, BT, h); pared(w / 2 + BT / 2, 0, BT, h);
  if (modo === 'colores') {
    const izq = gx, der = w - gx - 2;
    if (izq > 0) pared(-w / 2 + izq / 2 - BT / 2, h / 2 + BT / 2, izq + BT, BT);
    if (der > 0) pared(w / 2 - der / 2 + BT / 2, h / 2 + BT / 2, der + BT, BT);
    const sal = new T.Mesh(new T.PlaneGeometry(2, .6), new T.MeshBasicMaterial({ map: (() => { const c = lienzo(256, 80), x = c.getContext('2d'); x.fillStyle = '#FFC21A'; x.font = '800 44px "Baloo 2",system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('▼ SALIDA ▼', 128, 42); return textura(c, 4); })(), transparent: true }));
    sal.rotation.x = -Math.PI / 2; sal.position.set(-w / 2 + gx + 1, .01, h / 2 + .55); esc.add(sal);
  } else pared(0, h / 2 + BT / 2, w + 2 * BT, BT);

  /* fichas */
  const geos = new Map();
  const geo = (pw, ph) => {
    const k = pw + 'x' + ph + '|' + EST.forma + '|' + ef(EST); if (geos.has(k)) return geos.get(k);
    const W = (pw - GAP * 2) * ef(EST), H = (ph - GAP * 2) * ef(EST), m = Math.min(W, H), f = EST.forma;
    const r = f === 'cuadrada' ? .015 : f === 'pildora' ? m / 2 - .001 : f === 'redonda' ? m * .24 : f === 'marcada' ? m * .1 : f === 'biselada' ? m * .2 : Math.min(.2, m * .22), s = new T.Shape(), x0 = -W / 2, y0 = -H / 2;
    const esq = (cx, cy, x, y) => (f === 'biselada' ? s.lineTo(x, y) : s.quadraticCurveTo(cx, cy, x, y));
    s.moveTo(x0 + r, y0); s.lineTo(-x0 - r, y0); esq(-x0, y0, -x0, y0 + r); s.lineTo(-x0, -y0 - r); esq(-x0, -y0, -x0 - r, -y0); s.lineTo(x0 + r, -y0); esq(x0, -y0, x0, -y0 - r); s.lineTo(x0, y0 + r); esq(x0, y0, x0 + r, y0);
    const g = new T.ExtrudeGeometry(s, { depth: ALTO, bevelEnabled: true, bevelSize: .035, bevelThickness: .045, bevelSegments: 2, curveSegments: 5 }); g.rotateX(-Math.PI / 2); geos.set(k, g); return g;
  };
  const colorDe = (i) => modo === 'colores' ? (i === 0 ? col.kg : col.k[(i - 1) % 6]) : col.k[(i % w) % 6];
  const texDe = (i, pw, ph) => {
    const etiqueta = modo === 'numeros' ? String(i + 1) : i === 0 ? '★' : '', c0 = colorDe(i), key = [pw, ph, c0, etiqueta, estilo, col.kt, EST.clave].join('|');
    if (tex.has(key)) return tex.get(key);
    const PX = 128, W = pw * PX, H = ph * PX, c = lienzo(W, H), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, W, H);
    if (estilo === 'plano') { g.addColorStop(0, c0); g.addColorStop(1, c0); }
    else if (estilo === 'madera') { g.addColorStop(0, '#E7B778'); g.addColorStop(1, '#B07A3E'); }
    else { g.addColorStop(0, '#ffffff'); g.addColorStop(.12, c0); g.addColorStop(1, c0); }
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    if (estilo === 'madera') { x.fillStyle = c0; x.globalAlpha = .38; x.fillRect(0, 0, W, H); x.globalAlpha = 1; x.strokeStyle = 'rgba(0,0,0,.10)'; x.lineWidth = 2; for (let i = 0; i < W; i += 14) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 6, H); x.stroke(); } }
    if (estilo === 'clasico' || estilo === 'cristal') { x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 6; rr(x, 14, 14, W - 28, H - 28, 18); x.stroke(); }
    if (EST.tex) capaTextura(x, 0, 0, W, H, EST.tex);
    if (EST.forma === 'marcada') { x.lineWidth = 16; x.strokeStyle = oscuro(c0, .5); x.strokeRect(8, 8, W - 16, H - 16); }
    if (etiqueta) { x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = estilo === 'madera' && etiqueta !== '★' ? '#3b2410' : etiqueta === '★' ? '#fff7c2' : col.kt; x.shadowColor = 'rgba(0,0,0,.4)'; x.shadowBlur = 6; x.shadowOffsetY = 3; x.font = `800 ${etiqueta === '★' ? Math.min(W, H) * .8 : PX * (etiqueta.length > 1 ? .56 : .66)}px "Baloo 2",system-ui,sans-serif`; x.fillText(etiqueta, W / 2, H / 2 + PX * .04); }
    const t = textura(c, 8); t.repeat.set(1 / ((pw - GAP * 2) * ef(EST)), 1 / ((ph - GAP * 2) * ef(EST))); t.offset.set(.5, .5); tex.set(key, t); return t;
  };
  const piezas = [];
  const crearPieza = i => {
    const mc = new T.MeshStandardMaterial({ roughness: .38 }), ms = new T.MeshStandardMaterial({ roughness: .5 });
    const m = new T.Mesh(new T.BufferGeometry(), [mc, ms]); m.castShadow = true; m.receiveShadow = true; m.userData.i = i; esc.add(m);
    return { m, mc, ms, i, k: '', c: { x: 0, y: 3, z: 0 }, t: { x: 0, y: 0, z: 0 }, off: { x: 0, z: 0, tx: 0, tz: 0 } };
  };
  const dots = [];
  const dotGeo = new T.CircleGeometry(.18, 24), dotMat = new T.MeshBasicMaterial({ color: 0xFFC21A, transparent: true, opacity: .9 });
  const celda = (x, y) => [-w / 2 + x + .5, h / 2 - h + y + .5];     // centro de la casilla (x, y) en el plano

  V.pintar = D => {
    sel = D.sel; pistaI = D.pista ? D.pista.i : -1;
    while (piezas.length < D.p.length) piezas.push(crearPieza(piezas.length));
    D.p.forEach(([px, py, pw, ph], i) => {
      const P = piezas[i], key = [pw, ph, i, estilo, EST.forma, ef(EST)].join('|');
      if (P.k !== key) { P.k = key; P.m.geometry = geo(pw, ph); }
      P.mc.map = texDe(i, pw, ph); P.mc.needsUpdate = true; P.ms.color.set(colorDe(i)).multiplyScalar(.62);
      const estr = estilo === 'cristal'; P.mc.transparent = P.ms.transparent = estr; P.mc.opacity = P.ms.opacity = estr ? .86 : 1; P.mc.metalness = estr ? .25 : 0;
      const [cx, cz] = celda(px + (pw - 1) / 2, py + (ph - 1) / 2);
      P.t.x = cx; P.t.z = cz; P.t.y = i === sel ? .14 : 0; if (D.nuevo || P.c.y === 3) { P.c.x = cx; P.c.z = cz; P.c.y = 2 + i * .05; }
      P.mc.emissive.set(i === sel ? 0x6b5200 : i === pistaI ? 0x0c7a3c : 0x000000);
    });
    dots.forEach(d => esc.remove(d)); dots.length = 0;
    for (const [x, y] of D.destinos || []) { const d = new T.Mesh(dotGeo, dotMat); d.rotation.x = -Math.PI / 2; const [cx, cz] = celda(x, y); d.position.set(cx, .012, cz); d.userData.cx = x; d.userData.cy = y; esc.add(d); dots.push(d); }
    E.tocables = [...piezas.map(p => p.m), suelo];
    E.marcar();
  };
  V.recolor = est => {
    if (est) EST = est; leer();
    for (const g of geos.values()) g.dispose(); geos.clear(); matMarco.color.set(col.m1); matSuelo.color.set(col.hueco);
    for (const t of tex.values()) t.dispose(); tex = new Map(); for (const P of piezas) P.k = '';
    E.marcar();
  };
  V.celebrar = () => { E.tween(900, u => { for (const P of piezas) P.m.rotation.y = Math.sin(u * Math.PI * 2) * .12 * (1 - u); }).then(() => { for (const P of piezas) P.m.rotation.y = 0; E.marcar(); }); };

  /* arrastre: los píxeles se convierten en casillas según cómo se ve el tablero (vale con la cámara girada) */
  const v3 = new T.Vector3();
  const pantalla = (x, y, z) => { v3.set(x, 0, z).project(E.cam); const r = cont.getBoundingClientRect(); return [(v3.x * .5 + .5) * r.width, (-v3.y * .5 + .5) * r.height]; };
  let drag = null;
  E.alArrastrar = (ev, dx, dy, fase) => {
    if (fase === 'ini') {
      const hit = E.raycast(ev, piezas.map(p => p.m)); if (!hit.length) return false;
      const i = hit[0].object.userData.i; drag = { i, ax: 0, ay: 0, d: -1, amt: 0, mov: 0 }; return true;
    }
    if (!drag) return false;
    if (fase === 'mov') {
      drag.ax += dx; drag.ay += dy; drag.mov += Math.abs(dx) + Math.abs(dy);
      const o = pantalla(0, 0, 0), ex = pantalla(1, 0, 0), ez = pantalla(0, 0, 1), vx = [ex[0] - o[0], ex[1] - o[1]], vz = [ez[0] - o[0], ez[1] - o[1]], det = vx[0] * vz[1] - vx[1] * vz[0] || 1e-6;
      const u = (drag.ax * vz[1] - drag.ay * vz[0]) / det, v = (vx[0] * drag.ay - vx[1] * drag.ax) / det;      // desplazamiento en casillas: u en x, v en z
      if (drag.mov < 6) return true;
      const lim = V.limites(drag.i), horiz = Math.abs(u) >= Math.abs(v), d = horiz ? (u > 0 ? 1 : 3) : (v > 0 ? 2 : 0), val = horiz ? Math.abs(u) : Math.abs(v);
      drag.d = d; drag.amt = Math.min(val, lim[d]); const P = piezas[drag.i]; P.off.tx = DIR[d][0] * drag.amt; P.off.tz = DIR[d][1] * drag.amt; return true;
    }
    const P = piezas[drag.i], g = drag; drag = null; P.off.tx = P.off.tz = 0;
    if (fase === 'fin' && g.mov >= 6 && g.d >= 0) { const dist = Math.round(g.amt); if (dist >= 1 && V.alMover) V.alMover(g.i, g.d, dist); }
    E.marcar(); return true;
  };
  E.alTocar = ev => {
    const hit = E.raycast(ev, E.tocables); if (!hit.length) return;
    const o = hit[0].object;
    if (o.userData.i != null) { if (V.alToque) V.alToque(o.userData.i); return; }
    const p = hit[0].point, cx = Math.floor(p.x + w / 2), cy = Math.floor(p.z + h / 2);
    if (cx >= 0 && cx < w && cy >= 0 && cy < h && V.alCelda) V.alCelda(cx, cy);
  };
  E.alFrame = ahora => {
    let mueve = false; const pul = .5 + .5 * Math.sin(ahora / 240);
    piezas.forEach((P, i) => {
      const c = P.c, t = P.t, o = P.off;
      o.x = lerp(o.x, o.tx, .5); o.z = lerp(o.z, o.tz, .5);
      if (Math.abs(t.x - c.x) + Math.abs(t.z - c.z) + Math.abs(t.y - c.y) > .003) { c.x = lerp(c.x, t.x, .3); c.z = lerp(c.z, t.z, .3); c.y = lerp(c.y, t.y, .3); mueve = true; } else { c.x = t.x; c.z = t.z; c.y = t.y; }
      if (Math.abs(o.tx - o.x) + Math.abs(o.tz - o.z) > .003) mueve = true;
      P.m.position.set(c.x + o.x, c.y, c.z + o.z);
      if (i === pistaI) { P.mc.emissiveIntensity = .5 + pul; mueve = true; } else P.mc.emissiveIntensity = 1;
    });
    if (dots.length) { dotMat.opacity = .55 + .4 * pul; mueve = true; }
    return mueve;
  };
  V.camara = m => E.camara(m);
  V.destruir = () => { for (const t of tex.values()) t.dispose(); for (const g of geos.values()) g.dispose(); E.destruir(); };
  V.E = E; E.iniciar();
  return V;
}
