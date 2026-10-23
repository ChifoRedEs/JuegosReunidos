// Hotel · vista 3D del tablero con Three.js (js/vendor/three.module.min.js, cargado solo al abrir este juego).
// No conoce las reglas: recibe el estado de la partida (`actualizar`) y anima fichas, dados y pisos.
import * as T from '../../vendor/three.module.min.js';
import { GRUPOS } from './datos.js';

// ---------- geometría del tablero: 11×11 casillas, esquinas de 1,5 y 9 casillas de 1 por lado ----------
const CE = 1.5, MITAD = 6;                       // tamaño de esquina y semilado del tablero (12 en total)
const centro = k => (k === 1 ? -5.25 : k === 11 ? 5.25 : k - 6);
const celda = i => (i <= 10 ? [11, 11 - i] : i < 20 ? [21 - i, 1] : i <= 30 ? [1, i - 19] : [i - 29, 11]);   // [fila, columna] como en Magnate
const lado = i => (i % 10 === 0 ? 'esq' : i < 10 ? 'ab' : i < 20 ? 'iz' : i < 30 ? 'ar' : 'de');
const ANG = { ab: 0, iz: -Math.PI / 2, ar: Math.PI, de: Math.PI / 2, esq: 0 };
export function posCasilla(i) { const [f, c] = celda(i); return { x: centro(c), z: centro(f), lado: lado(i), ang: ANG[lado(i)] }; }

// Estilos de hotel (🎨 Apariencia): colores de muro, cristal y tejado, y forma de la cubierta
export const ESTILOS = {
  moderno: { nombre: '🏙️ Moderno', muro: '#EAF2FF', vidrio: '#4C9BFF', techo: '#A9BBDD', cubierta: 'plano' },
  clasico: { nombre: '🏛️ Clásico', muro: '#F3E3C3', vidrio: '#8B5E3C', techo: '#B5523B', cubierta: 'tejado' },
  resort: { nombre: '🌴 Resort', muro: '#FFFFFF', vidrio: '#2BC4D6', techo: '#F4B942', cubierta: 'tejado' },
  rascacielos: { nombre: '🌃 Rascacielos', muro: '#39426B', vidrio: '#FFE27A', techo: '#6B77B0', cubierta: 'escalonado' },
};
const NIV_ALTO = .26;                              // alto de cada piso

const lienzo = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const textura = (c, aniso = 4) => { const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = aniso; return t; };
const suave = t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// Ajusta el texto a un ancho máximo (parte en dos líneas si hace falta)
function textoAjustado(x, txt, cx, cy, ancho, tam, peso = 800, fam = 'Nunito, system-ui, sans-serif', interl = 1.02) {
  const cabe = (ls, t) => { x.font = `${peso} ${t}px ${fam}`; return ls.every(l => x.measureText(l).width <= ancho); };
  let t1 = tam; while (t1 > 10 && !cabe([txt], t1)) t1--;
  let lineas = [txt], t = t1;
  const pal = txt.split(' ');
  if (pal.length > 1 && t1 < tam * .8) {
    const m = Math.ceil(pal.length / 2), dos = [pal.slice(0, m).join(' '), pal.slice(m).join(' ')];
    let t2 = tam; while (t2 > 10 && !cabe(dos, t2)) t2--;
    if (t2 > t1 * 1.2) { lineas = dos; t = t2; }
  }
  x.font = `${peso} ${t}px ${fam}`;
  const h = t * interl, y0 = cy - (lineas.length - 1) * h / 2;
  lineas.forEach((l, k) => x.fillText(l, cx, y0 + k * h));
  return t;
}

export async function crearVista(cont, opciones = {}) {
  const V = { estilo: opciones.estilo || 'moderno', pj: opciones.pj || {} };
  // ---------- renderer, escena y cámara ----------
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const cv = renderer.domElement; cv.className = 'htcv'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Tablero de Hotel en 3D: arrastra para girar, pellizca para acercar, toca una casilla para ver su ficha');
  cont.append(cv);
  const escena = new T.Scene();
  const cam = new T.PerspectiveCamera(38, 1, .1, 120);
  const hemi = new T.HemisphereLight(0xffffff, 0x8a93b8, 1.9); escena.add(hemi);
  const sol = new T.DirectionalLight(0xffffff, 2.2); sol.position.set(-5, 11, 7); sol.castShadow = true;
  sol.shadow.mapSize.set(1536, 1536); Object.assign(sol.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 }); sol.shadow.bias = -.0004; sol.shadow.normalBias = .02;
  escena.add(sol);

  // cámara orbital propia: az (giro), pol (inclinación desde la vertical), dist
  const CAM0 = { az: 0, pol: .88, dist: 17 };
  const C = { ...CAM0, objAz: 0, objPol: .88, objDist: 17, tx: 0, tz: 0 };
  let sucio = true, vivo = true, raf = 0, w = 0, h = 0;
  const marcar = () => { sucio = true; };
  const distBase = () => Math.min(26, Math.max(11, 6.6 / (Math.tan(cam.fov * Math.PI / 360) * Math.min(1, cam.aspect)) + 2.2));
  function colocarCam() {
    const sp = Math.sin(C.pol), x = C.tx + C.dist * sp * Math.sin(C.az), z = C.tz + C.dist * sp * Math.cos(C.az), y = C.dist * Math.cos(C.pol);
    cam.position.set(x, y, z); cam.lookAt(C.tx, 0, C.tz);
  }
  function redimensionar() {
    const r = cont.getBoundingClientRect(); const nw = Math.max(120, Math.round(r.width)), nh = Math.max(120, Math.round(r.height));
    if (nw === w && nh === h) return; w = nw; h = nh;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
    const d0 = distBase(); const rel = C.objDist / (C.base || d0); C.base = d0; C.objDist = C.dist = Math.min(30, Math.max(8, d0 * rel)); colocarCam(); marcar();
  }

  // ---------- tema (colores del tablero tomados del CSS) ----------
  const tema = {};
  function leerTema() {
    const cs = getComputedStyle(cont);
    for (const k of ['line', 'cell', 'alt', 'acc', 'ink', 'soft', 'hi', 'strong']) tema[k] = cs.getPropertyValue('--tb-' + k).trim() || '#888';
  }
  leerTema();

  // ---------- tablero ----------
  const tablero = new T.Group(); escena.add(tablero);
  const geoLosa = new T.BoxGeometry(MITAD * 2 + .5, .22, MITAD * 2 + .5);
  const losa = new T.Mesh(geoLosa, new T.MeshLambertMaterial({ color: tema.line })); losa.position.y = -.13; losa.receiveShadow = true; tablero.add(losa);
  const suelo = new T.Mesh(new T.PlaneGeometry(60, 60), new T.ShadowMaterial({ opacity: .28 })); suelo.rotation.x = -Math.PI / 2; suelo.position.y = -.245; suelo.receiveShadow = true; escena.add(suelo);
  const centroMat = new T.MeshLambertMaterial({ color: tema.alt });
  const centroMesh = new T.Mesh(new T.PlaneGeometry(9, 9), centroMat); centroMesh.rotation.x = -Math.PI / 2; centroMesh.position.y = .002; centroMesh.receiveShadow = true; tablero.add(centroMesh);

  const casillas = [];          // { grupo, plano, barra, base, pos, hotel, firma, ... }
  const planos = [];            // para el raycaster
  const geoBase = {};           // cajas por tamaño
  function textoCasilla(s) {
    const es = s.tipo === 'esquina', W = es ? 288 : 192, H = es ? 288 : 288, c = lienzo(W, H), x = c.getContext('2d');
    x.fillStyle = es ? tema.alt : (s.tipo === 'destino' ? tema.cell : (s.tipo === 'impuesto' || s.tipo === 'suerte' || s.tipo === 'imprevisto') ? tema.soft : tema.cell);
    x.fillRect(0, 0, W, H); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = tema.ink;
    const emoji = (e, tam, y) => { x.font = `${tam}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; x.fillText(e, W / 2, y); x.fillStyle = tema.ink; };
    if (es) { emoji(s.ico, 120, H * .42); textoAjustado(x, s.corto, W / 2, H * .82, W - 24, 44, 900, '"Baloo 2", Nunito, sans-serif'); }
    else {
      const banda = s.tipo === 'destino' ? 96 : 0;
      if (banda) { x.fillStyle = GRUPOS[s.g].color; x.fillRect(0, 0, W, banda); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, banda - 5, W, 5); x.fillStyle = tema.ink; }
      const yc = banda ? banda + (H - banda) * .38 : H * .32;
      if (s.tipo === 'destino') textoAjustado(x, s.nombre, W / 2, yc + 6, W - 14, 58, 900, '"Baloo 2", Nunito, sans-serif');
      else {
        const ico = s.ico || { impuesto: '💸', suerte: '🍀', imprevisto: '🧳' }[s.tipo];
        emoji(ico, 84, H * .24); textoAjustado(x, s.nombre, W / 2, H * .56, W - 14, 46, 900, '"Baloo 2", Nunito, sans-serif');
      }
      const pie = s.precio ? `${s.precio}M` : s.importe ? `−${s.importe}M` : '';
      if (pie) { x.fillStyle = tema.strong; x.font = '900 50px "Baloo 2", Nunito, sans-serif'; x.fillText(pie, W / 2, H - 32); }
    }
    return c;
  }
  function construirTablero(G) {
    G.c.forEach((s, i) => {
      const P = posCasilla(i), es = s.tipo === 'esquina', ancho = es ? CE : 1, fondo = CE;
      const g = new T.Group(); g.position.set(P.x, 0, P.z); g.rotation.y = P.ang; tablero.add(g);
      const clave = ancho + 'x' + fondo; const geo = geoBase[clave] || (geoBase[clave] = new T.BoxGeometry(ancho - .04, .1, fondo - .04));
      const base = new T.Mesh(geo, new T.MeshLambertMaterial({ color: tema.cell })); base.position.y = .03; base.receiveShadow = true; g.add(base);
      const mat = new T.MeshLambertMaterial({ map: textura(textoCasilla(s)) });
      const plano = new T.Mesh(new T.PlaneGeometry(ancho - .08, fondo - .08), mat); plano.rotation.x = -Math.PI / 2; plano.position.y = .0815; plano.receiveShadow = true; plano.userData.casilla = i; g.add(plano); planos.push(plano);
      const barra = new T.Mesh(new T.BoxGeometry(ancho - .16, .06, .09), new T.MeshLambertMaterial({ color: 0xffffff })); barra.position.set(0, .11, fondo / 2 - .09); barra.visible = false; barra.castShadow = true; g.add(barra);
      const solar = new T.Mesh(new T.BoxGeometry(.5, .05, .3), new T.MeshLambertMaterial({ color: 0xffffff })); solar.position.set(0, .11, -.5); solar.visible = false; solar.castShadow = true; g.add(solar);
      casillas.push({ g, plano, mat, barra, solar, s, es, hotel: null, firma: '', niv: 0, hotelGrupo: new T.Group() });
      casillas[i].hotelGrupo.position.set(0, .08, es ? 0 : -.5); g.add(casillas[i].hotelGrupo);
    });
  }

  // ---------- centro del tablero: logotipo, piscina y palmeras ----------
  let logoTex = null, logo = null;
  function pintarCentro() {
    centroMat.color.set(tema.alt); losa.material.color.set(tema.line);
    const c = lienzo(512, 512), x = c.getContext('2d');
    x.fillStyle = 'rgba(0,0,0,0)'; x.clearRect(0, 0, 512, 512); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = tema.strong; x.font = '900 118px "Baloo 2", Nunito, sans-serif'; x.fillText('HOTEL', 256, 214);
    x.fillStyle = tema.hi; x.font = '70px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.fillText('★ ★ ★ ★ ★', 256, 316);
    x.fillStyle = tema.ink; x.globalAlpha = .75; x.font = '800 36px Nunito, sans-serif'; x.fillText('DESTINOS DEL MUNDO', 256, 392); x.globalAlpha = 1;
    if (logoTex) logoTex.dispose(); logoTex = textura(c);
    if (!logo) { logo = new T.Mesh(new T.PlaneGeometry(6.4, 6.4), new T.MeshBasicMaterial({ transparent: true, depthWrite: false })); logo.rotation.x = -Math.PI / 2; logo.position.set(0, .01, -1.5); tablero.add(logo); }
    logo.material.map = logoTex; logo.material.needsUpdate = true;
  }
  function decoracion() {
    const agua = new T.Mesh(new T.CylinderGeometry(1.1, 1.1, .04, 40), new T.MeshLambertMaterial({ color: '#4CC9F0' })); agua.scale.set(1.5, 1, .8); agua.position.set(-2.4, .03, 3.1); agua.receiveShadow = true; tablero.add(agua);
    const borde = new T.Mesh(new T.TorusGeometry(1.1, .06, 8, 40), new T.MeshLambertMaterial({ color: '#F4F1E8' })); borde.rotation.x = Math.PI / 2; borde.scale.set(1.5, .8, 1); borde.position.set(-2.4, .06, 3.1); tablero.add(borde);
    const palma = (px, pz, s = 1) => {
      const g = new T.Group(); g.position.set(px, 0, pz); g.scale.setScalar(s);
      const tr = new T.Mesh(new T.CylinderGeometry(.05, .08, .9, 6), new T.MeshLambertMaterial({ color: '#8B5E3C' })); tr.position.y = .45; tr.rotation.z = .12; tr.castShadow = true; g.add(tr);
      for (let k = 0; k < 6; k++) { const hoja = new T.Mesh(new T.ConeGeometry(.12, .7, 4), new T.MeshLambertMaterial({ color: '#2FAE60' })); hoja.position.set(Math.cos(k * 1.047) * .28 + .1, .95, Math.sin(k * 1.047) * .28); hoja.rotation.set(Math.sin(k * 1.047) * 1.1, 0, -Math.cos(k * 1.047) * 1.1); g.add(hoja); }
      tablero.add(g);
    };
    palma(-3.6, 1.7, 1.1); palma(-1.0, 3.5, .9); palma(3.4, -3.4, 1); palma(3.0, 3.3, .85); palma(-3.5, -3.2, .95);
    const sombrilla = (px, pz, col) => { const p = new T.Group(); p.position.set(px, 0, pz); const m = new T.Mesh(new T.CylinderGeometry(.02, .02, .55, 5), new T.MeshLambertMaterial({ color: '#d8d8d8' })); m.position.y = .28; p.add(m); const t = new T.Mesh(new T.ConeGeometry(.34, .2, 10), new T.MeshLambertMaterial({ color: col })); t.position.y = .6; t.castShadow = true; p.add(t); tablero.add(p); };
    sombrilla(-0.9, 2.2, '#FF4FA3'); sombrilla(-3.6, 3.5, '#FFC21A'); sombrilla(3.8, 0.4, '#FF7A1A');
  }

  // ---------- hoteles ----------
  const matCache = new Map();
  const mat = (clave, mk) => { let m = matCache.get(clave); if (!m) { m = mk(); matCache.set(clave, m); } return m; };
  function texVentanas(est, apagado) {
    const c = lienzo(128, 64), x = c.getContext('2d'); x.fillStyle = est.muro; x.fillRect(0, 0, 128, 64);
    x.fillStyle = est.vidrio; for (let k = 0; k < 4; k++) x.fillRect(10 + k * 30, 14, 20, 36);
    x.fillStyle = 'rgba(255,255,255,.35)'; for (let k = 0; k < 4; k++) x.fillRect(10 + k * 30, 14, 20, 8);
    if (apagado) { x.fillStyle = 'rgba(120,120,120,.55)'; x.fillRect(0, 0, 128, 64); }
    return textura(c);
  }
  const matPiso = (est, hip) => mat(`piso|${V.estilo}|${hip}`, () => new T.MeshLambertMaterial({ map: texVentanas(est, hip) }));
  const matTecho = (est, hip) => mat(`techo|${V.estilo}|${hip}`, () => new T.MeshLambertMaterial({ color: hip ? '#777' : est.techo }));
  const matColor = (col, hip) => mat(`col|${col}|${hip}`, () => new T.MeshLambertMaterial({ color: hip ? '#8d8d8d' : col }));
  const geoPiso = new T.BoxGeometry(.7, NIV_ALTO, .46).translate(0, NIV_ALTO / 2, 0);
  const geoLobby = new T.BoxGeometry(.76, .3, .5).translate(0, .15, 0);
  const geoToldo = new T.BoxGeometry(.82, .04, .22).translate(0, 0, .24);
  const geoTejado = new T.ConeGeometry(.5, .3, 4).rotateY(Math.PI / 4).translate(0, .14, 0);
  const geoAntena = new T.CylinderGeometry(.012, .012, .3, 4).translate(0, .15, 0);
  const geoMastil = new T.CylinderGeometry(.012, .012, .34, 4).translate(0, .17, 0);
  const geoBandera = new T.PlaneGeometry(.2, .12).translate(.1, 0, 0);
  const geoCorona = new T.BoxGeometry(.5, .16, .34).translate(0, .08, 0);
  const geoEstrella = new T.OctahedronGeometry(.07);

  // Construye el edificio de un destino con `nivel` pisos (1-5) y devuelve la lista de pisos para animar el crecimiento
  function construirHotel(ci, nivel, color, hip, desde) {
    const C0 = casillas[ci], est = ESTILOS[V.estilo] || ESTILOS.moderno, gr = C0.hotelGrupo;
    for (const ch of [...gr.children]) gr.remove(ch);
    const pisos = [], ahora = performance.now();
    for (let k = 0; k < nivel; k++) {
      const m = new T.Mesh(k === 0 ? geoLobby : geoPiso, k === 0 ? matColor(est.muro, hip) : matPiso(est, hip)); m.castShadow = true; m.receiveShadow = true;
      m.userData = { alto: k === 0 ? .3 : NIV_ALTO, nuevo: k >= desde ? ahora + (k - desde) * 220 : 0 };
      if (k === 0) { const t = new T.Mesh(geoToldo, matColor(color, hip)); t.position.y = .22; t.castShadow = true; m.add(t); const pu = new T.Mesh(new T.BoxGeometry(.14, .18, .02), matTecho(est, hip)); pu.position.set(-.2, .09, .255); m.add(pu); }
      gr.add(m); pisos.push(m);
    }
    const coronaG = new T.Group(); gr.add(coronaG);
    // cubierta según el estilo
    const cub = est.cubierta;
    const tope = new T.Group(); coronaG.add(tope);
    if (nivel === 5) {
      const co = new T.Mesh(geoCorona, matColor('#F5C02B', hip)); co.castShadow = true; tope.add(co);
      const sp = new T.Mesh(geoAntena, matColor('#F5C02B', hip)); sp.position.y = .16; tope.add(sp);
      const es = new T.Mesh(geoEstrella, matColor('#FFE066', hip)); es.position.y = .5; es.scale.set(1.2, 1.4, 1.2); tope.add(es);
    } else if (cub === 'tejado') { const t = new T.Mesh(geoTejado, matTecho(est, hip)); t.scale.set(1.12, 1, .78); t.castShadow = true; tope.add(t); }
    else if (cub === 'escalonado') { const t = new T.Mesh(new T.BoxGeometry(.42, .12, .28).translate(0, .06, 0), matTecho(est, hip)); t.castShadow = true; tope.add(t); const a = new T.Mesh(geoAntena, matTecho(est, hip)); a.position.y = .12; tope.add(a); }
    else { const t = new T.Mesh(new T.BoxGeometry(.7, .04, .48).translate(0, .02, 0), matTecho(est, hip)); t.castShadow = true; tope.add(t); const a = new T.Mesh(geoAntena, matTecho(est, hip)); a.position.set(.2, .04, 0); tope.add(a); }
    // bandera del dueño
    const mas = new T.Mesh(geoMastil, matColor('#E8E8E8', hip)); mas.position.set(-.28, .0, .14); tope.add(mas);
    const ban = new T.Mesh(geoBandera, new T.MeshLambertMaterial({ color: hip ? '#8d8d8d' : color, side: T.DoubleSide })); ban.position.set(-.28, .3, .14); tope.add(ban);
    gr.userData = { pisos, tope, ini: ahora };
    colocarPisos(gr); return gr;
  }
  // Apila los pisos según su altura visible (los nuevos van «naciendo» desde el suelo)
  function colocarPisos(gr, ahora = performance.now()) {
    let y = 0, anim = false;
    for (const m of gr.userData.pisos) {
      const n = m.userData.nuevo; let e = 1;
      if (n) { e = Math.min(1, Math.max(0, (ahora - n) / 260)); if (e < 1) anim = true; e = suave(e); }
      m.visible = !n || ahora >= n; m.scale.y = Math.max(.001, e); m.position.y = y; y += m.userData.alto * e;
    }
    gr.userData.tope.position.y = y; return anim;
  }

  // ---------- fichas ----------
  const fichas = [];
  const texEmoji = (e) => { const c = lienzo(128, 128), x = c.getContext('2d'); x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '92px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.fillText(e, 64, 70); return textura(c); };
  const geoDisco = new T.CylinderGeometry(.17, .2, .07, 20), geoPie = new T.CylinderGeometry(.045, .07, .3, 8).translate(0, .15, 0);
  function crearFicha(p, i) {
    const g = new T.Group();
    const disco = new T.Mesh(geoDisco, new T.MeshLambertMaterial({ color: p.color })); disco.position.y = .035; disco.castShadow = true; g.add(disco);
    const pie = new T.Mesh(geoPie, new T.MeshLambertMaterial({ color: p.color })); pie.position.y = .07; pie.castShadow = true; g.add(pie);
    const sp = new T.Sprite(new T.SpriteMaterial({ map: texEmoji(p.ficha), transparent: true, depthWrite: false })); sp.scale.set(.52, .52, 1); sp.position.y = .6; g.add(sp);
    escena.add(g); fichas[i] = { g, sp, pos: p.pos, x: 0, z: 0, ficha: p.ficha };
  }
  // posición de una ficha dentro de su casilla (varias fichas en la misma casilla se reparten)
  function destinoFicha(i, pos, G) {
    const P = posCasilla(pos), en = G.jug.map((q, k) => (!q.fuera && q.pos === pos ? k : -1)).filter(k => k >= 0), n = Math.max(1, en.length), k = Math.max(0, en.indexOf(i));
    const R = n > 1 ? .26 : 0, a = (k / n) * Math.PI * 2 + .6, es = P.lado === 'esq';
    const ox = Math.cos(a) * R, oz = Math.sin(a) * R + (es ? 0 : .22);
    const c = Math.cos(P.ang), s = Math.sin(P.ang);                                  // gira el desplazamiento local al sistema del tablero
    return { x: P.x + ox * c + oz * s, z: P.z - ox * s + oz * c };
  }

  // ---------- dados ----------
  const dados = [];
  const CARAS = [3, 4, 1, 6, 2, 5];                                   // +x, -x, +y, -y, +z, -z (opuestas suman 7)
  function texDado(v) {
    const c = lienzo(96, 96), x = c.getContext('2d'); x.fillStyle = '#FFFDF6'; x.fillRect(0, 0, 96, 96); x.strokeStyle = '#d9d2bf'; x.lineWidth = 6; x.strokeRect(3, 3, 90, 90);
    const P = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] }[v];
    x.fillStyle = v === 1 ? '#E63946' : '#1B1F3B'; for (const [a, b] of P) { x.beginPath(); x.arc(24 + a * 24, 24 + b * 24, v === 1 ? 11 : 8, 0, 7); x.fill(); }
    return textura(c, 2);
  }
  function crearDados() {
    const mats = CARAS.map(v => new T.MeshLambertMaterial({ map: texDado(v) }));
    for (let k = 0; k < 2; k++) {
      const m = new T.Mesh(new T.BoxGeometry(.52, .52, .52), mats); m.castShadow = true; m.position.set(k ? .6 : -.6, .31, k ? 1.3 : 1.7); m.rotation.y = k ? .5 : -.4; escena.add(m); dados.push(m);
    }
  }
  const ORIENT = { 1: [0, 0, 0], 6: [Math.PI, 0, 0], 3: [0, 0, Math.PI / 2], 4: [0, 0, -Math.PI / 2], 2: [-Math.PI / 2, 0, 0], 5: [Math.PI / 2, 0, 0] };
  const cuatro = (v, yaw) => { const q = new T.Quaternion().setFromEuler(new T.Euler(...ORIENT[v])); return new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), yaw).multiply(q); };

  // ---------- animaciones (tweens con garantía de fin aunque el navegador pause requestAnimationFrame) ----------
  const tweens = new Set();
  function tween(ms, f) {
    return new Promise(res => {
      if (!ms || !vivo) { f(1); marcar(); return res(); }
      const o = { t0: performance.now(), ms, f, res, fin: false };
      o.guarda = setTimeout(() => { if (!o.fin) { o.fin = true; tweens.delete(o); f(1); marcar(); res(); } }, ms + 400);
      tweens.add(o); marcar();
    });
  }
  const animPisos = new Set();

  // ---------- interacción ----------
  const punteros = new Map(); let mov = 0, dist0 = 0, ult = null;
  const ray = new T.Raycaster(), v2 = new T.Vector2();
  function alBajar(e) { cv.setPointerCapture(e.pointerId); punteros.set(e.pointerId, { x: e.clientX, y: e.clientY }); mov = 0; if (punteros.size === 2) { const [a, b] = [...punteros.values()]; dist0 = Math.hypot(a.x - b.x, a.y - b.y); } }
  function alMover(e) {
    const p = punteros.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (punteros.size === 1) { mov += Math.abs(dx) + Math.abs(dy); C.objAz -= dx * .0085; C.objPol = Math.min(1.38, Math.max(.2, C.objPol - dy * .006)); }
    else if (punteros.size === 2) { const [a, b] = [...punteros.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (dist0) C.objDist = Math.min(30, Math.max(8, C.objDist * dist0 / d)); dist0 = d; mov += 20; }
    marcar();
  }
  function alSoltar(e) {
    const p = punteros.get(e.pointerId); punteros.delete(e.pointerId); dist0 = 0;
    if (p && mov < 7 && e.type === 'pointerup' && !punteros.size) tocar(e);
  }
  function tocar(e) {
    const r = cv.getBoundingClientRect(); v2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v2, cam); const h = ray.intersectObjects(planos, false)[0];
    if (h && V.alTocar) V.alTocar(h.object.userData.casilla);
  }
  function alRueda(e) { e.preventDefault(); C.objDist = Math.min(30, Math.max(8, C.objDist * Math.exp(e.deltaY * .0012))); marcar(); }
  cv.addEventListener('pointerdown', alBajar); cv.addEventListener('pointermove', alMover); cv.addEventListener('pointerup', alSoltar); cv.addEventListener('pointercancel', alSoltar);
  cv.addEventListener('wheel', alRueda, { passive: false });
  cv.style.touchAction = 'none';
  const ro = new ResizeObserver(redimensionar); ro.observe(cont);

  // ---------- bucle ----------
  const sel = new T.Mesh(new T.RingGeometry(.22, .3, 28), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9, side: T.DoubleSide, depthWrite: false })); sel.rotation.x = -Math.PI / 2; sel.visible = false; escena.add(sel);
  function bucle() {
    if (!vivo) return; raf = requestAnimationFrame(bucle);
    const ahora = performance.now();
    for (const o of [...tweens]) { const t = Math.min(1, (ahora - o.t0) / o.ms); o.f(t); if (t >= 1 && !o.fin) { o.fin = true; clearTimeout(o.guarda); tweens.delete(o); o.res(); } }
    for (const gr of [...animPisos]) if (!colocarPisos(gr, ahora)) animPisos.delete(gr);
    // la cámara se acerca a su objetivo con suavizado
    const k = .22, dA = C.objAz - C.az, dP = C.objPol - C.pol, dD = C.objDist - C.dist;
    if (Math.abs(dA) > 1e-4 || Math.abs(dP) > 1e-4 || Math.abs(dD) > 1e-3) { C.az += dA * k; C.pol += dP * k; C.dist += dD * k; colocarCam(); sucio = true; }
    if (tweens.size || animPisos.size) sucio = true;
    if (sucio) { sucio = false; renderer.render(escena, cam); }
  }

  // ---------- API ----------
  let primera = true, GG = null;
  V.construir = G => {
    GG = G; construirTablero(G); pintarCentro(); decoracion(); crearDados();
    G.jug.forEach((p, i) => crearFicha(p, i)); redimensionar(); C.az = C.objAz = 0; C.pol = C.objPol = .88; C.dist = C.objDist = C.base = distBase(); colocarCam();
    V.actualizar(G, true); raf = requestAnimationFrame(bucle); marcar();
  };
  // Sincroniza edificios, dueños y fichas con el estado de la partida
  V.actualizar = (G, forzar = false) => {
    GG = G;
    G.c.forEach((s, i) => {
      const c = casillas[i]; if (!c || (s.tipo !== 'destino' && s.tipo !== 'aero' && s.tipo !== 'serv')) return;
      const o = s.dueno === null ? null : G.jug[s.dueno], firma = `${s.dueno}|${s.nivel}|${s.hip}|${o ? o.color : ''}|${V.estilo}`;
      if (firma === c.firma && !forzar) return;
      const antes = c.niv; c.firma = firma;
      c.barra.visible = !!o; c.solar.visible = !!o && !s.nivel;
      if (o) { c.barra.material.color.set(s.hip ? '#8d8d8d' : o.color); c.solar.material.color.set(s.hip ? '#8d8d8d' : o.color); }
      c.mat.color.set(s.hip ? '#8d8d8d' : '#ffffff');
      c.solar.visible = !!o && !s.nivel && s.tipo === 'destino';
      if (s.tipo === 'destino') {
        if (s.nivel && o) { const crece = s.nivel > antes && !forzar, g = construirHotel(i, s.nivel, o.color, s.hip, crece ? antes : Infinity); if (crece) animPisos.add(g); }
        else for (const ch of [...c.hotelGrupo.children]) c.hotelGrupo.remove(ch);
      }
      c.niv = s.nivel; marcar();
    });
    G.jug.forEach((p, i) => {
      if (!fichas[i]) return; const f = fichas[i];
      f.g.visible = !p.fuera;
      if (f.ficha !== p.ficha) { f.ficha = p.ficha; f.sp.material.map.dispose(); f.sp.material.map = texEmoji(p.ficha); f.sp.material.needsUpdate = true; }
      if (forzar || (f.pos !== p.pos && !f.anim)) { const d = destinoFicha(i, p.pos, G); f.g.position.set(d.x, .08, d.z); f.pos = p.pos; }
    });
    // si varias fichas comparten casilla, repártelas
    if (!forzar) G.jug.forEach((p, i) => { const f = fichas[i]; if (f && !f.anim && !p.fuera) { const d = destinoFicha(i, p.pos, G); if (Math.abs(f.g.position.x - d.x) + Math.abs(f.g.position.z - d.z) > .02) f.g.position.set(d.x, .08, d.z); } });
    marcar();
  };
  // Salto de una ficha hasta una casilla (una sola casilla por llamada, o un tramo largo si `vuelo`)
  V.mover = async (i, pos, ms) => {
    const f = fichas[i]; if (!f || !GG) return; f.anim = true;
    const a = f.g.position.clone(), d = destinoFicha(i, pos, GG); f.pos = pos;
    const lejos = Math.hypot(d.x - a.x, d.z - a.z), alto = ms && lejos > 1.6 ? .9 : .28;
    await tween(ms, t => f.g.position.set(a.x + (d.x - a.x) * t, .08 + Math.sin(t * Math.PI) * alto, a.z + (d.z - a.z) * t));
    f.g.position.set(d.x, .08, d.z); f.anim = false; marcar();
    // reajusta a las que compartían casilla
    V.actualizar(GG);
  };
  V.resaltar = (pos, color) => { if (pos == null || pos < 0) { sel.visible = false; marcar(); return; } const P = posCasilla(pos); sel.position.set(P.x, .12, P.z + 0); sel.material.color.set(color || '#ffffff'); sel.scale.setScalar(pos % 10 === 0 ? 2.2 : 1.9); sel.visible = true; marcar(); };
  V.dados = async (a, b, ms) => {
    const vals = [a, b], ini = dados.map(d => d.position.clone()), fin = dados.map((d, k) => cuatro(vals[k], Math.random() * 6.28));
    const dest = [new T.Vector3(-.9 + Math.random() * .3, .27, 1.3 + Math.random() * .3), new T.Vector3(.5 + Math.random() * .3, .27, 1.6 + Math.random() * .3)];
    await tween(ms, t => dados.forEach((d, k) => {
      const e = suave(t); d.position.set(ini[k].x + (dest[k].x - ini[k].x) * e, .27 + Math.sin(Math.min(1, t * 1.15) * Math.PI) * 1.5 * (1 - t * .3), ini[k].z + (dest[k].z - ini[k].z) * e);
      d.quaternion.copy(t < .7 ? new T.Quaternion().setFromEuler(new T.Euler(t * 14 + k, t * 11, t * 9 + k * 2)) : new T.Quaternion().slerpQuaternions(new T.Quaternion().setFromEuler(new T.Euler(.7 * 14 + k, .7 * 11, .7 * 9 + k * 2)), fin[k], (t - .7) / .3));
    }));
    dados.forEach((d, k) => { d.position.copy(dest[k]); d.quaternion.copy(fin[k]); }); marcar();
  };
  V.estiloHotel = id => { if (!ESTILOS[id] || id === V.estilo) return; V.estilo = id; if (GG) V.actualizar(GG, true); };
  V.personaje = (i, e) => { if (GG && GG.jug[i]) { GG.jug[i].ficha = e; V.actualizar(GG); } };
  V.tema = () => {
    leerTema(); casillas.forEach(c => { c.mat.map.dispose(); c.mat.map = textura(textoCasilla(c.s)); c.mat.needsUpdate = true; c.g.children[0].material.color.set(tema.cell); }); pintarCentro(); marcar();
  };
  V.camara = (modo) => {
    if (modo === 'girar') C.objAz = Math.round(C.objAz / (Math.PI / 2) + 1) * (Math.PI / 2);
    else if (modo === 'cenital') { C.objPol = C.objPol < .35 ? .88 : .12; }
    else { C.objAz = Math.round(C.objAz / (Math.PI * 2)) * Math.PI * 2; C.objPol = .88; C.objDist = C.base || distBase(); }
    marcar();
  };
  V.destruir = () => {
    vivo = false; cancelAnimationFrame(raf); ro.disconnect();
    for (const o of tweens) { clearTimeout(o.guarda); o.res(); } tweens.clear();
    cv.removeEventListener('pointerdown', alBajar); cv.removeEventListener('pointermove', alMover); cv.removeEventListener('pointerup', alSoltar); cv.removeEventListener('pointercancel', alSoltar); cv.removeEventListener('wheel', alRueda);
    escena.traverse(o => { if (o.geometry) o.geometry.dispose(); const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) { if (m.map) m.map.dispose(); m.dispose(); } });
    matCache.clear(); renderer.dispose(); try { renderer.forceContextLoss(); } catch (_) {} cv.remove();
  };
  V.renderizar = () => { sucio = true; }; V._C = C;
  V.canvas = cv;
  return V;
}
