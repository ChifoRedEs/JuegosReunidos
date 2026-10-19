// Recorrido de 9 hoyos del Minigolf (diseño propio). Coordenadas en una mesa de 400 × 700 (y hacia abajo).
// borde: polígono del césped (la bola no sale de él) · muros: polígonos interiores · topes: bumpers redondos {x, y, r}
// arena / agua: polígonos (arena frena mucho; agua = +1 golpe y la bola vuelve a donde estaba)
// rampas: { p: polígono, ax, ay } aceleración constante · molinos: { x, y, l: largo de cada aspa, w: vueltas por segundo, aspas }
const R = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
export const HOYOS = [
  { nombre: 'Calentamiento', par: 2, salida: [200, 590], hoyo: [200, 140],
    borde: R(110, 80, 290, 650) },
  { nombre: 'La curva', par: 3, salida: [130, 590], hoyo: [290, 160],
    borde: [[60, 80], [340, 80], [340, 300], [210, 300], [210, 650], [60, 650]] },
  { nombre: 'Cuesta arriba', par: 3, salida: [200, 610], hoyo: [200, 130],
    borde: R(90, 70, 310, 660), rampas: [{ p: R(90, 300, 310, 460), ax: 0, ay: 260 }], arena: [R(150, 190, 250, 230)] },
  { nombre: 'Pinball', par: 2, salida: [200, 600], hoyo: [200, 130],
    borde: R(70, 70, 330, 650), topes: [{ x: 200, y: 380, r: 26 }, { x: 130, y: 280, r: 20 }, { x: 270, y: 280, r: 20 }, { x: 150, y: 470, r: 16 }, { x: 250, y: 470, r: 16 }] },
  { nombre: 'El lago', par: 3, salida: [200, 610], hoyo: [300, 140],
    borde: R(60, 70, 340, 660), agua: [[[60, 330], [250, 330], [250, 420], [60, 420]], [[315, 330], [340, 330], [340, 420], [315, 420]]] },
  { nombre: 'Zigzag', par: 3, salida: [100, 610], hoyo: [300, 120],
    borde: R(60, 70, 340, 660), muros: [R(60, 440, 260, 470), R(140, 260, 340, 290)] },
  { nombre: 'El molino', par: 3, salida: [200, 610], hoyo: [200, 130],
    borde: R(70, 70, 330, 660), muros: [R(70, 360, 170, 390), R(230, 360, 330, 390)], molinos: [{ x: 200, y: 375, l: 62, w: .35, aspas: 4 }] },
  { nombre: 'El embudo', par: 2, salida: [200, 620], hoyo: [200, 170],
    borde: [[200, 70], [340, 230], [300, 660], [100, 660], [60, 230]], arena: [[[150, 250], [250, 250], [270, 290], [130, 290]]], topes: [{ x: 200, y: 420, r: 14 }] },
  { nombre: 'Gran final', par: 4, salida: [90, 620], hoyo: [310, 110],
    borde: R(50, 60, 350, 660), muros: [R(50, 480, 240, 505), R(160, 250, 350, 275)],
    agua: [R(270, 380, 350, 450)], rampas: [{ p: R(50, 280, 160, 480), ax: 0, ay: 150 }], topes: [{ x: 200, y: 380, r: 18 }], arena: [R(250, 150, 350, 175)] },
];
export const PAR_TOTAL = HOYOS.reduce((a, h) => a + h.par, 0);
