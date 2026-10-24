// Mastermind · vista 3D (Three.js): tablero con agujeros, bolas de colores, clavijas negras/blancas y bandeja de colores. Solo dibuja: index.js manda el estado con V.pintar().
import { crearEscena, T, lienzo, textura } from '../../core/escena3d.js';

const css = (el, v, d) => getComputedStyle(el).getPropertyValue(v).trim() || d;
export const SIMBOLOS = ['●', '▲', '■', '◆', '★', '♥', '☘', '☾'];
const RAD = .4, PEG = .13;

export function crearMastermind3D(cont, { pos, col, max }) {
  const W = Math.max(pos + 2.6, col + .6), Z0 = 0, ZR = 1.7, ZP = ZR + max + .9, H = ZP + 1.4;
  const E = crearEscena(cont, { fov: 36, az: 0, pol: .6, polMin: .18, polMax: 1.2, radio: Math.max(W * 1.15, H * .8) * .5 + .3, margen: .4, objetivo: [0, 0, H / 2 - .6], distMin: 5, distMax: 40, sombraRadio: Math.max(W, H) + 3, sombraTam: 1536, sol: { pos: [-4, 12, 5], int: 2.1 }, etiqueta: 'Tablero de Mastermind' });
  const esc = E.escena, V = { alColor: null, alSlot: null };
  let C = {}, estilo = 'bola', tex = new Map();
  const leer = () => { const j = cont.closest('.juego') || cont; estilo = j.dataset.estilo || 'bola'; C = { m1: css(cont, '--mm-marco', '#8A5A2B'), m2: css(cont, '--mm-marco2', '#5E3B1A'), hueco: css(cont, '--mm-hueco', '#2B1D12'), k: Array.from({ length: 8 }, (_, i) => css(cont, '--m' + i, '#888')) }; };
  leer();
  const matM = new T.MeshStandardMaterial({ color: C.m1, roughness: .55 }), matH = new T.MeshStandardMaterial({ color: C.hueco, roughness: .9 });
  const tablero = new T.Mesh(new T.BoxGeometry(W, .4, H + .2), matM); tablero.position.set(0, -.2, H / 2 - .5); tablero.receiveShadow = true; esc.add(tablero);
  const cab = new T.Mesh(new T.BoxGeometry(W - .3, .06, 1.1), matH); cab.position.set(0, .03, Z0); esc.add(cab);
  const xs = i => -W / 2 + 1 + i + (pos < 5 ? .4 : 0), xf = (k) => xs(pos - 1) + 1.05 + (k % Math.ceil(pos / 2)) * .36, zf = (r, k) => ZR + r + (k >= Math.ceil(pos / 2) ? .2 : -.2);
  const holeG = new T.CylinderGeometry(.27, .27, .04, 20), bolaG = new T.SphereGeometry(RAD, 28, 20), pegG = new T.SphereGeometry(PEG, 14, 10), hitG = new T.CylinderGeometry(.5, .5, .3, 12);
  const hitM = new T.MeshBasicMaterial({ visible: false });
  const mat = c => {
    const m = new T.MeshStandardMaterial({ color: c, roughness: estilo === 'plano' ? .9 : .25 });
    if (estilo === 'cristal') { m.transparent = true; m.opacity = .78; m.roughness = .05; m.metalness = .2; }
    return m;
  };
  const simbolo = i => {
    const k = i + '|' + 'w'; if (tex.has(k)) return tex.get(k);
    const c = lienzo(128, 128), x = c.getContext('2d'); x.fillStyle = 'rgba(255,255,255,.95)'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '800 84px system-ui,sans-serif'; x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 6; x.fillText(SIMBOLOS[i], 64, 68);
    const t = textura(c, 4); tex.set(k, t); return t;
  };
  const crearBola = (c, x, z, y = RAD) => {
    const m = new T.Mesh(bolaG, mat(C.k[c])); m.position.set(x, y, z); m.castShadow = true; esc.add(m);
    let s = null; if (estilo === 'simbolos') { s = new T.Mesh(new T.PlaneGeometry(.62, .62), new T.MeshBasicMaterial({ map: simbolo(c), transparent: true })); s.rotation.x = -Math.PI / 2; s.position.set(x, y + RAD + .005, z); esc.add(s); }
    return { m, s };
  };
  /* piezas dinámicas: se rehacen en cada pintar (pocas decenas de mallas) */
  let dyn = [];
  const limpiar = () => { for (const o of dyn) { esc.remove(o); if (o.material && o.userData.propio) o.material.dispose(); } dyn = []; };
  const add = o => { esc.add(o); dyn.push(o); return o; };
  const fijos = [];
  for (let r = 0; r < max; r++) for (let i = 0; i < pos; i++) { const h = new T.Mesh(holeG, matH); h.position.set(xs(i), .03, ZR + r); esc.add(h); fijos.push(h); }
  for (let i = 0; i < pos; i++) { const h = new T.Mesh(holeG, matH); h.position.set(xs(i), .08, Z0); esc.add(h); fijos.push(h); }
  const bola = (c, x, z, extra) => { const b = crearBola(c, x, z); dyn.push(b.m); if (b.s) dyn.push(b.s); if (extra) Object.assign(b.m.userData, extra); return b.m; };
  const peg = (color, x, z) => { const m = new T.Mesh(pegG, new T.MeshStandardMaterial({ color, roughness: .35 })); m.position.set(x, .13, z); m.userData.propio = true; add(m); };
  const mini = (x, z) => { const m = new T.Mesh(holeG, matH); m.scale.set(.4, 1, .4); m.position.set(x, .06, z); add(m); };

  V.pintar = D => {
    const S = D.S; limpiar(); const tocables = [];
    // fila del código secreto
    const mostrar = S.sec && (S.done || S.modo === 'codigo');
    if (S.sec === null && S.modo === 'codigo') {
      for (let i = 0; i < pos; i++) { const c = S.cur[i]; if (c >= 0) bola(c, xs(i), Z0); const h = new T.Mesh(hitG, hitM); h.position.set(xs(i), .15, Z0); h.userData.slot = i; add(h); tocables.push(h); if (D.sel === i) { const a = new T.Mesh(new T.TorusGeometry(.46, .04, 8, 24), new T.MeshBasicMaterial({ color: 0xFFD23F })); a.rotation.x = -Math.PI / 2; a.position.set(xs(i), .06, Z0); add(a); } }
    } else if (mostrar) S.sec.forEach((c, i) => bola(c, xs(i), Z0));
    else { const tapa = new T.Mesh(new T.BoxGeometry(pos + .4, .9, 1), new T.MeshStandardMaterial({ color: 0x1b1f33, roughness: .5 })); tapa.position.set(xs((pos - 1) / 2), .45, Z0); tapa.castShadow = true; tapa.userData.propio = true; add(tapa); }
    // intentos
    for (let r = 0; r < max; r++) {
      const z = ZR + r, jug = S.jug[r], actual = !S.done && S.sec && r === S.jug.length && S.modo === 'adivinar';
      if (jug) jug.forEach((c, i) => bola(c, xs(i), z));
      else if (actual) for (let i = 0; i < pos; i++) {
        const c = S.cur[i]; if (c >= 0) bola(c, xs(i), z);
        const h = new T.Mesh(hitG, hitM); h.position.set(xs(i), .15, z); h.userData.slot = i; add(h); tocables.push(h);
        if (D.sel === i) { const a = new T.Mesh(new T.TorusGeometry(.46, .04, 8, 24), new T.MeshBasicMaterial({ color: 0xFFD23F })); a.rotation.x = -Math.PI / 2; a.position.set(xs(i), .06, z); add(a); }
      }
      if (actual) { const m = new T.Mesh(new T.PlaneGeometry(W - .5, .96), new T.MeshBasicMaterial({ color: 0xFFD23F, transparent: true, opacity: .14 })); m.rotation.x = -Math.PI / 2; m.position.set(0, .045, z); add(m); }
      const f = S.fb[r]; for (let k = 0; k < pos; k++) { const x = xf(k), zz = zf(r, k); if (f && k < f[0]) peg(0x15161c, x, zz); else if (f && k < f[0] + f[1]) peg(0xf6f6f6, x, zz); else mini(x, zz); }
    }
    // bandeja de colores
    for (let c = 0; c < col; c++) {
      const b = bola(c, -col / 2 + .5 + c, ZP, { c }); tocables.push(b);
      if (!S.rep && S.cur.includes(c)) b.material.opacity = .4, b.material.transparent = true;
    }
    E.tocables = tocables; E.marcar();
  };
  V.recolor = () => { leer(); matM.color.set(C.m1); matH.color.set(C.hueco); for (const t of tex.values()) t.dispose(); tex = new Map(); E.marcar(); };
  E.alTocar = ev => {
    const hit = E.raycast(ev, E.tocables); if (!hit.length) return; const u = hit[0].object.userData;
    if (u.c != null && V.alColor) V.alColor(u.c); else if (u.slot != null && V.alSlot) V.alSlot(u.slot);
  };
  V.camara = m => E.camara(m);
  V.destruir = () => { for (const t of tex.values()) t.dispose(); E.destruir(); };
  V.E = E; E.iniciar();
  return V;
}
