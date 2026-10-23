// Mesa de póker en 3D (Three.js) compartida por Texas Hold'em y Póker cubierto: tapete oval con borde de madera,
// cartas con relieve (grosor y sombra), fichas apiladas, botón del repartidor y carteles de jugador.
// Se importa de forma dinámica; no guarda estado de juego: el juego llama a V.pintar(datos) tras cada cambio.
import { crearEscena, T, lienzo, textura } from './escena3d.js';
import { PALOS, RANGOS, paloDe, rangoDe } from './cartas.js';

const RX = 5, RZ = 3.3, CW = .64, CH = .9, CD = .03;
const css = (el, v, d) => getComputedStyle(el).getPropertyValue(v).trim() || d;
const rr = (x, a, b, w, h, r) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); };
const lerp = (a, b, k) => a + (b - a) * k;

export function crearMesaCartas3D(cont, o = {}) {
  const E = crearEscena(cont, { fov: 36, az: 0, pol: .78, polMin: .25, polMax: 1.3, radio: 4.5, margen: .4, objetivo: [0, 0, .25], distMin: 6, distMax: 24, sombraRadio: 8, sombraTam: 1536, sol: { pos: [-3, 11, 6], int: 2.1 }, hemi: { int: 1.7 }, sueloY: -.32, etiqueta: o.etiqueta || 'Mesa de póker en 3D' });
  const V = { alCarta: null };
  const esc = E.escena, cache = new Map();
  let colores = {};
  const leer = () => { colores = { f1: css(cont, '--mesa1', '#12A05C'), f2: css(cont, '--mesa2', '#0A6B3C'), d1: css(cont, '--d1', '#2F6BFF'), d2: css(cont, '--d2', '#1B3FA8') }; };
  leer();

  /* ---------- texturas ---------- */
  const cara = id => {
    if (cache.has(id)) return cache.get(id);
    const c = lienzo(256, 358), x = c.getContext('2d'), p = paloDe(id), R = RANGOS[rangoDe(id)], s = PALOS[p].s + '︎', col = p === 1 || p === 2 ? '#D92B3F' : '#1B2340', fig = 'JQK'.includes(R);
    x.fillStyle = '#fff'; rr(x, 3, 3, 250, 352, 24); x.fill(); x.strokeStyle = '#bcc3d2'; x.lineWidth = 5; x.stroke();
    x.fillStyle = col; x.textAlign = 'center'; x.textBaseline = 'middle';
    const esquina = () => { x.font = `800 ${R.length > 1 ? 58 : 68}px "Baloo 2",system-ui,sans-serif`; x.fillText(R, 44, 56); x.font = '52px system-ui,sans-serif'; x.fillText(s, 44, 112); };
    esquina(); x.save(); x.translate(256, 358); x.rotate(Math.PI); esquina(); x.restore();
    if (fig) { x.font = '800 150px "Baloo 2",system-ui,sans-serif'; x.fillText(R, 128, 160); x.font = '84px system-ui,sans-serif'; x.fillText(s, 128, 252); }
    else { x.font = '150px system-ui,sans-serif'; x.fillText(s, 128, 186); }
    const t = textura(c, 8); cache.set(id, t); return t;
  };
  const dorso = () => {
    const c = lienzo(256, 358), x = c.getContext('2d');
    x.fillStyle = '#fff'; rr(x, 3, 3, 250, 352, 24); x.fill();
    const g = x.createLinearGradient(0, 0, 256, 358); g.addColorStop(0, colores.d1); g.addColorStop(1, colores.d2);
    x.fillStyle = g; rr(x, 16, 16, 224, 326, 14); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.4)'; x.lineWidth = 3; x.save(); rr(x, 16, 16, 224, 326, 14); x.clip();
    for (let i = -360; i < 360; i += 36) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 358, 358); x.moveTo(i + 358, 0); x.lineTo(i, 358); x.stroke(); }
    x.restore(); x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 4; rr(x, 28, 28, 200, 302, 10); x.stroke();
    return textura(c, 8);
  };
  let dorsoTex = dorso();
  const matDorso = new T.MeshStandardMaterial({ map: dorsoTex, roughness: .5 });
  const matLado = new T.MeshStandardMaterial({ color: 0xf1f3f8, roughness: .6 });

  /* ---------- mesa ---------- */
  const tapete = new T.Mesh(new T.CylinderGeometry(1, 1, .3, 64), new T.MeshStandardMaterial({ color: colores.f1, roughness: .95 }));
  tapete.scale.set(RX, 1, RZ); tapete.position.y = -.17; tapete.receiveShadow = true; esc.add(tapete);
  const centro = new T.Mesh(new T.CylinderGeometry(1, 1, .02, 64), new T.MeshStandardMaterial({ color: colores.f2, roughness: 1 }));
  centro.scale.set(RX * .62, 1, RZ * .5); centro.position.set(0, -.015, -.1); esc.add(centro);
  const borde = new T.Mesh(new T.TorusGeometry(1, .09, 12, 80), new T.MeshStandardMaterial({ color: 0x6b3f22, roughness: .55 }));
  borde.rotation.x = Math.PI / 2; borde.scale.set(RX + .1, RZ + .1, 1.3); borde.position.y = -.02; borde.castShadow = true; esc.add(borde);
  const base = new T.Mesh(new T.CylinderGeometry(1, 1, .1, 64), new T.MeshStandardMaterial({ color: 0x4a2a16, roughness: .7 }));
  base.scale.set(RX + .35, 1, RZ + .35); base.position.y = -.28; esc.add(base);

  /* ---------- cartas ---------- */
  const GC = new T.BoxGeometry(CW, CD, CH), slots = [];
  function crearSlot(padre, k) {
    const cara_ = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .45 });
    const m = new T.Mesh(GC, [matLado, matLado, cara_, matDorso, matLado, matLado]); m.castShadow = true; m.receiveShadow = true; m.visible = false; m.userData.k = k;
    padre.add(m);
    const s = { m, cara: cara_, id: null, oc: false, vivo: false, t: { x: 0, y: 0, z: 0, ry: 0, rz: 0, e: 1 }, c: { x: 0, y: 0, z: 0, ry: 0, rz: 0, e: 1 } };
    slots.push(s); return s;
  }
  function ponSlot(s, id, oculta, p) {
    if (id == null) { s.m.visible = false; s.id = null; s.vivo = false; return; }
    const rz = oculta ? Math.PI : 0, t = s.t;
    if (!s.vivo) { s.vivo = true; s.m.visible = true; Object.assign(s.c, { x: p.x, y: 1.6, z: p.z - .6, ry: p.ry + .5, rz: rz + (oculta ? 0 : Math.PI), e: p.e }); }
    if (s.id !== id) { s.id = id; s.cara.map = cara(id); s.cara.needsUpdate = true; }
    s.oc = oculta; Object.assign(t, { x: p.x, y: p.y || .02, z: p.z, ry: p.ry || 0, rz, e: p.e || 1 });
    s.cara.color.set(p.gris ? 0x8a8f9c : 0xffffff);
  }

  /* ---------- fichas, botón y carteles ---------- */
  const TIER = [0xE0243A, 0x2F6BFF, 0x1FA55C, 0x2b2f45, 0xB074FF];
  function pila(n) {
    const g = new T.Group(); if (!(n > 0)) return g;
    const tier = n < 25 ? 0 : n < 100 ? 1 : n < 400 ? 2 : n < 1500 ? 3 : 4, nc = Math.min(10, 1 + Math.floor(Math.log2(n / 5 + 1) * 1.3));
    const mA = new T.MeshStandardMaterial({ color: TIER[tier], roughness: .45 }), mB = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .5 });
    const stacks = nc > 6 ? 2 : 1;
    for (let sIdx = 0; sIdx < stacks; sIdx++) {
      const cuantas = stacks === 1 ? nc : sIdx === 0 ? Math.ceil(nc * .6) : Math.floor(nc * .4);
      for (let i = 0; i < cuantas; i++) {
        const f = new T.Mesh(new T.CylinderGeometry(.2, .2, .07, 20), mA), a = new T.Mesh(new T.CylinderGeometry(.205, .205, .02, 20), mB);
        f.position.set(sIdx * .42, .04 + i * .075, 0); a.position.set(sIdx * .42, .04 + i * .075, 0); f.castShadow = true; g.add(f, a);
      }
    }
    return g;
  }
  function cartel(l) {
    const c = lienzo(512, 150), x = c.getContext('2d');
    x.globalAlpha = l.fold || l.fuera ? .55 : 1;
    x.fillStyle = 'rgba(14,20,40,.82)'; rr(x, 4, 4, 504, 142, 34); x.fill();
    x.lineWidth = 8; x.strokeStyle = l.gana ? '#3DDC84' : l.turno ? '#FFC21A' : 'rgba(255,255,255,.28)'; x.stroke();
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff';
    let f = 46; x.font = `800 ${f}px "Baloo 2",system-ui,sans-serif`; const t1 = `${l.nombre} · 🪙 ${l.stack}`;
    while (x.measureText(t1).width > 470 && f > 24) { f -= 2; x.font = `800 ${f}px "Baloo 2",system-ui,sans-serif`; }
    x.fillText(t1, 256, 48);
    const t2 = l.fuera ? 'Eliminado' : [l.txt, l.sub].filter(Boolean).join(' · ');
    f = 34; x.font = `700 ${f}px "Baloo 2",system-ui,sans-serif`; x.fillStyle = l.sub ? '#FFE08A' : '#dfe6ff';
    while (x.measureText(t2).width > 470 && f > 18) { f -= 2; x.font = `700 ${f}px "Baloo 2",system-ui,sans-serif`; }
    x.fillText(t2, 256, 105);
    return textura(c, 4);
  }
  function texto(t, w = 256, h = 96, fs = 64, fondo = 'rgba(14,20,40,.8)') {
    const c = lienzo(w, h), x = c.getContext('2d'); x.fillStyle = fondo; rr(x, 3, 3, w - 6, h - 6, h / 2.2); x.fill();
    x.fillStyle = '#FFE08A'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `800 ${fs}px "Baloo 2",system-ui,sans-serif`; x.fillText(t, w / 2, h / 2 + 3); return textura(c, 4);
  }
  const sprite = (tex, w, h) => { const s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false })); s.scale.set(w, h, 1); s.renderOrder = 10; return s; };
  const botonD = (() => { const c = lienzo(128, 128), x = c.getContext('2d'); x.fillStyle = '#fff'; x.beginPath(); x.arc(64, 64, 60, 0, 7); x.fill(); x.strokeStyle = '#17214A'; x.lineWidth = 8; x.stroke(); x.fillStyle = '#17214A'; x.font = '800 76px "Baloo 2",system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('D', 64, 70); return textura(c); })();

  /* ---------- asientos ---------- */
  function crearAsiento(esYo, px, pz, nCartas) {
    const g = new T.Group(); esc.add(g);
    const A = { g, esYo, px, pz, sig: '', slots: Array.from({ length: nCartas }, (_, k) => crearSlot(g, esYo ? k : -1)), cartel: null, anillo: null, pila: null, apTxt: null, boton: null };
    A.anillo = new T.Mesh(new T.RingGeometry(1, 1.12, 48), new T.MeshBasicMaterial({ color: 0xFFC21A, transparent: true, opacity: .0, side: T.DoubleSide }));
    A.anillo.rotation.x = -Math.PI / 2; A.anillo.scale.set(esYo ? 2.6 : 1.45, esYo ? 1.15 : .98, 1); A.anillo.position.set(px, .012, pz); esc.add(A.anillo);
    A.boton = new T.Sprite(new T.SpriteMaterial({ map: botonD, transparent: true, depthTest: false })); A.boton.scale.set(.42, .42, 1); A.boton.renderOrder = 11; A.boton.visible = false; esc.add(A.boton);
    return A;
  }
  let asientos = [], yo = null, nBots = -1, nCartasBot = -1;
  const mesa = new T.Group(); esc.add(mesa);
  const huecos = Array.from({ length: 5 }, (_, k) => { const h = new T.Mesh(new T.PlaneGeometry(CW * .98, CH * .98), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .16 })); h.rotation.x = -Math.PI / 2; h.position.set((k - 2) * .92, .006, -.15); h.scale.setScalar(1.1); esc.add(h); return h; });
  const tab = Array.from({ length: 5 }, (_, k) => crearSlot(mesa, -2 - k));
  let boteG = null, boteTxt = null, botePos = { x: 0, z: -1.15 };
  function reconstruir(nb, nc, ncYo) {
    for (const A of asientos) { esc.remove(A.g, A.anillo, A.boton); if (A.cartel) esc.remove(A.cartel); if (A.pila) esc.remove(A.pila); if (A.apTxt) esc.remove(A.apTxt); for (const s of A.slots) slots.splice(slots.indexOf(s), 1); }
    if (yo) { esc.remove(yo.g, yo.anillo, yo.boton); if (yo.cartel) esc.remove(yo.cartel); if (yo.pila) esc.remove(yo.pila); if (yo.apTxt) esc.remove(yo.apTxt); for (const s of yo.slots) slots.splice(slots.indexOf(s), 1); }
    asientos = []; nBots = nb; nCartasBot = nc;
    for (let k = 0; k < nb; k++) { const th = -(k + 1) * 2 * Math.PI / (nb + 1); asientos.push(crearAsiento(false, Math.sin(th) * RX * .68, Math.cos(th) * RZ * .62 - .1, nc)); asientos[k].th = th; }
    yo = crearAsiento(true, 0, 1.95, ncYo); yo.th = 0;
    E.tocables = yo.slots.map(s => s.m);
  }
  function actualizarAsiento(A, d, n, esYo) {
    const cartas = d.cartas || [];
    const sig = JSON.stringify([d.nombre, d.stack, d.txt, d.sub, d.turno, d.gana, d.fold, d.fuera]);
    if (A.sig !== sig) {
      A.sig = sig;
      if (A.cartel) { A.cartel.material.map.dispose(); A.cartel.material.map = cartel(d); A.cartel.material.needsUpdate = true; }
      else { A.cartel = sprite(cartel(d), esYo ? 3.3 : 2.7, esYo ? .97 : .79); esc.add(A.cartel); }
    }
    A.cartel.position.set(A.px, esYo ? .3 : .55, A.pz + (esYo ? 1.38 : -.85));
    A.anillo.material.color.set(d.gana ? 0x3DDC84 : 0xFFC21A); A.anillo.userData.on = d.gana ? 1 : d.turno ? 2 : 0;
    A.boton.visible = !!d.boton && !d.fuera; A.boton.position.set(A.px + (esYo ? 1.9 : 1.15), .08, A.pz + (esYo ? .2 : .1));
    const total = A.slots.length, sep = esYo ? .86 : .56, esc_ = esYo ? 1.25 : .9;
    A.slots.forEach((s, k) => {
      const c = cartas[k];
      if (c == null || d.fuera) return ponSlot(s, null);
      const off = (k - (total - 1) / 2), lift = esYo && d.elige && d.elige.has(k);
      const oculta = !d.ver;
      ponSlot(s, c, oculta, { x: A.px + off * sep * (esYo && total > 2 ? 1 : 1), y: lift ? .42 : (d.fold ? .015 : .02), z: A.pz - (lift ? .2 : 0), ry: -off * .07, e: esc_, gris: d.fold || lift });
    });
    if (A.pila) { esc.remove(A.pila); A.pila.traverse(x => { if (x.geometry) x.geometry.dispose(); }); A.pila = null; }
    if (A.apTxt) { A.apTxt.material.map.dispose(); esc.remove(A.apTxt); A.apTxt = null; }
    if (d.apuesta > 0) {
      const bx = esYo ? 1.7 : A.px * .55, bz = esYo ? .85 : A.pz * .5 + .1;
      A.pila = pila(d.apuesta); A.pila.position.set(bx, 0, bz); esc.add(A.pila);
      A.apTxt = sprite(texto(String(d.apuesta), 180, 80, 54), .8, .36); A.apTxt.position.set(bx, .5, bz + .36); esc.add(A.apTxt);
    }
  }

  V.pintar = D => {
    const nb = D.bots.length, nc = Math.max(...D.bots.map(b => (b.cartas || []).length), D.nCartas || 2), ncYo = Math.max((D.yo.cartas || []).length, D.nCartas || 2);
    if (nb !== nBots || nc !== nCartasBot || !yo || yo.slots.length !== ncYo) reconstruir(nb, nc, ncYo);
    D.bots.forEach((b, k) => actualizarAsiento(asientos[k], b, nc, false));
    actualizarAsiento(yo, D.yo, ncYo, true);
    huecos.forEach((h, k) => { h.visible = k >= D.tablero.length && !!D.mostrarTablero; });
    tab.forEach((s, k) => { const c = D.tablero[k]; if (c == null) ponSlot(s, null); else ponSlot(s, c, false, { x: (k - 2) * .92, y: .02, z: -.15, ry: 0, e: 1.1 }); });
    if (boteG) { esc.remove(boteG); boteG.traverse(x => { if (x.geometry) x.geometry.dispose(); }); boteG = null; }
    if (boteTxt) { boteTxt.material.map.dispose(); esc.remove(boteTxt); boteTxt = null; }
    if (D.bote > 0) {
      boteG = new T.Group(); const p1 = pila(D.bote); boteG.add(p1); boteG.position.set(botePos.x, 0, botePos.z); esc.add(boteG);
      boteTxt = sprite(texto('Bote ' + D.bote, 300, 84, 50), 1.5, .42); boteTxt.position.set(botePos.x + .2, .78, botePos.z + .1); esc.add(boteTxt);
    }
    E.marcar();
  };
  V.recolor = () => {
    leer(); tapete.material.color.set(colores.f1); centro.material.color.set(colores.f2);
    dorsoTex.dispose(); dorsoTex = dorso(); matDorso.map = dorsoTex; matDorso.needsUpdate = true; E.marcar();
  };

  /* ---------- animación y toques ---------- */
  E.alFrame = ahora => {
    let mueve = false;
    for (const s of slots) {
      if (!s.vivo) continue; const c = s.c, t = s.t;
      const dx = t.x - c.x, dy = t.y - c.y, dz = t.z - c.z, dr = t.ry - c.ry, dq = t.rz - c.rz, de = t.e - c.e;
      if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) + Math.abs(dr) + Math.abs(dq) + Math.abs(de) > .002) {
        c.x = lerp(c.x, t.x, .24); c.y = lerp(c.y, t.y, .24); c.z = lerp(c.z, t.z, .24); c.ry = lerp(c.ry, t.ry, .24); c.rz = lerp(c.rz, t.rz, .24); c.e = lerp(c.e, t.e, .24); mueve = true;
      } else Object.assign(c, t);
      s.m.position.set(c.x, c.y, c.z); s.m.rotation.set(0, c.ry, c.rz); s.m.scale.setScalar(c.e);
    }
    const p = .5 + .5 * Math.sin(ahora / 260);
    for (const A of [...asientos, yo]) if (A && A.anillo) { const on = A.anillo.userData.on; A.anillo.material.opacity = on === 1 ? .85 : on === 2 ? .35 + .5 * p : 0; if (on) mueve = true; }
    return mueve;
  };
  E.alTocar = ev => {
    if (!V.alCarta || !yo) return;
    const h = E.raycast(ev, yo.slots.map(s => s.m)); if (h.length) { const k = h[0].object.userData.k; if (k >= 0) V.alCarta(k); }
  };
  V.camara = m => E.camara(m);
  V.destruir = () => { for (const t of cache.values()) t.dispose(); E.destruir(); };
  V.E = E;
  E.iniciar();
  return V;
}
