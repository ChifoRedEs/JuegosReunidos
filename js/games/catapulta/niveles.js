// Niveles de Catapulta. Coordenadas del mundo lógico 900×540; el suelo está en y = 480.
// Ayudantes: B(material, centroX, base, ancho, alto) · P(centroX, base, radio) — «base» es la y de la parte inferior.
export const B = (m, x, base, w, h) => ({ m, x, y: base - h / 2, w, h });
export const P = (x, base, r = 19) => ({ x, y: base - r, r });
const S = 480;
// Ayudantes para las pantallas nuevas: fila de cubos, pila de cubos y casa (dos postes + techo).
const fila = (m, xs, base) => xs.map(x => B(m, x, base, 40, 40));
const pila = (m, x, n) => Array.from({ length: n }, (_, i) => B(m, x, S - i * 40, 40, 40));
const casa = (x, w, h, mp, mt, base = S) => [B(mp, x - w / 2, base, 16, h), B(mp, x + w / 2, base, 16, h), B(mt, x, base - h, w + 16, 14)];

export const NIVELES = [
  { nombre: 'Primer asalto', aves: ['normal', 'normal', 'normal', 'normal'], est: [12000, 19000],
    bloques: [B('madera', 620, S, 16, 70), B('madera', 720, S, 16, 70), B('madera', 670, S - 70, 130, 14)],
    cerdos: [P(670, S), P(670, S - 84)] },
  { nombre: 'Casa de hielo', aves: ['normal', 'normal', 'divisible', 'normal'], est: [22000, 32500],
    bloques: [B('hielo', 590, S, 16, 60), B('hielo', 710, S, 16, 60), B('madera', 650, S - 60, 160, 14), B('piedra', 820, S, 40, 40)],
    cerdos: [P(650, S), P(650, S - 74), P(820, S - 40)] },
  { nombre: 'Fortín de piedra', aves: ['normal', 'acelerador', 'acelerador', 'divisible'], est: [16500, 24500],
    bloques: [B('piedra', 600, S, 20, 80), B('piedra', 700, S, 20, 80), B('piedra', 650, S - 80, 150, 16),
      B('madera', 620, S - 96, 14, 50), B('madera', 680, S - 96, 14, 50), B('madera', 650, S - 146, 100, 14)],
    cerdos: [P(650, S), P(650, S - 160), P(780, S)] },
  { nombre: 'Tres torres', aves: ['normal', 'bomba', 'divisible', 'acelerador', 'normal'], est: [28000, 41500],
    bloques: [B('hierro', 560, S, 40, 40), B('madera', 560, S - 40, 40, 40),
      B('piedra', 680, S, 40, 40), B('hielo', 680, S - 40, 40, 40), B('madera', 680, S - 80, 40, 40),
      B('piedra', 800, S, 40, 40), B('hielo', 800, S - 40, 40, 40)],
    cerdos: [P(560, S - 80), P(680, S - 120), P(800, S - 80)] },
  { nombre: 'La fortaleza pirata', aves: ['normal', 'divisible', 'acelerador', 'bomba', 'bomba'], est: [25500, 38000],
    bloques: [B('piedra', 560, S, 18, 70), B('hierro', 640, S, 18, 70), B('hierro', 720, S, 18, 70), B('piedra', 800, S, 18, 70),
      B('madera', 600, S - 70, 120, 14), B('madera', 760, S - 70, 120, 14),
      B('hielo', 570, S - 84, 14, 50), B('hielo', 630, S - 84, 14, 50), B('madera', 600, S - 134, 100, 14),
      B('hielo', 760, S - 84, 40, 40)],
    cerdos: [P(600, S), P(760, S), P(600, S - 148), P(760, S - 124)] },
  ...[
  { nombre: 'Dos casitas', aves: 'n n d n', est: [19500, 28500], bloques: [...casa(600, 80, 60, 'madera', 'madera'), ...casa(780, 80, 60, 'hielo', 'madera')], cerdos: [P(600, S), P(780, S)] },
  { nombre: 'Pirámide de hielo', aves: 'n n a n', est: [24000, 35500], bloques: [...fila('hielo', [600, 640, 680, 720], S), ...fila('hielo', [620, 660, 700], S - 40), ...fila('hielo', [640, 680], S - 80)],
    cerdos: [P(660, S - 120), P(800, S)] },
  { nombre: 'Puente de piedra', aves: 'n a b n', est: [19000, 27500], bloques: [B('piedra', 600, S, 20, 100), B('piedra', 760, S, 20, 100), B('piedra', 680, S - 100, 200, 16), B('madera', 640, S - 116, 14, 50), B('madera', 720, S - 116, 14, 50)],
    cerdos: [P(680, S), P(680, S - 116)] },
  { nombre: 'Torre alta', aves: 'n n d a', est: [22500, 32500], bloques: [...fila('madera', [700], S), ...fila('hielo', [700], S - 40), ...fila('piedra', [700], S - 80), ...fila('hielo', [700], S - 120), ...fila('madera', [700], S - 160)],
    cerdos: [P(700, S - 200), P(600, S), P(800, S)] },
  { nombre: 'Muro de hierro', aves: 'n a b b n', est: [22500, 32500], bloques: [B('hierro', 580, S, 20, 130), ...casa(730, 90, 70, 'piedra', 'madera')], cerdos: [P(730, S), P(730, S - 84), P(850, S)] },
  { nombre: 'Doble piso', aves: 'n n d a b', est: [22500, 33500], bloques: [...casa(680, 120, 60, 'madera', 'piedra'), ...casa(680, 80, 60, 'hielo', 'madera', S - 74)], cerdos: [P(680, S), P(680, S - 74), P(830, S)] },
  { nombre: 'Castillo', aves: 'n d a b b', est: [27000, 40000], bloques: [...casa(620, 80, 70, 'piedra', 'piedra'), ...casa(780, 80, 70, 'piedra', 'piedra'), B('hierro', 700, S, 40, 40)],
    cerdos: [P(620, S), P(780, S), P(620, S - 84), P(780, S - 84)] },
  { nombre: 'Hielo quebradizo', aves: 'n n n d a', est: [22000, 32500], bloques: [...casa(700, 200, 60, 'hielo', 'hielo'), B('hielo', 640, S, 14, 60), B('hielo', 760, S, 14, 60), B('piedra', 700, S - 74, 40, 40)],
    cerdos: [P(670, S), P(730, S), P(700, S - 114)] },
  { nombre: 'Escalera', aves: 'n a a b', est: [22000, 32000], bloques: [...pila('piedra', 640, 2), ...pila('piedra', 680, 3), ...pila('piedra', 720, 4), ...pila('piedra', 600, 1)],
    cerdos: [P(640, S - 80), P(720, S - 160), P(820, S)] },
  { nombre: 'Torres gemelas', aves: 'n d a b', est: [27500, 40000], bloques: [B('madera', 600, S, 40, 40), B('hierro', 600, S - 40, 40, 40), B('hielo', 600, S - 80, 40, 40), B('madera', 800, S, 40, 40), B('hierro', 800, S - 40, 40, 40), B('hielo', 800, S - 80, 40, 40), B('madera', 700, S - 120, 260, 14)],
    cerdos: [P(650, S - 134), P(750, S - 134), P(700, S)] },
  { nombre: 'Búnker de hierro', aves: 'a a b b n', est: [23500, 34500], bloques: [...casa(700, 90, 70, 'hierro', 'piedra'), ...casa(560, 80, 60, 'piedra', 'madera')], cerdos: [P(700, S), P(700, S - 84), P(560, S)] },
  { nombre: 'Molino', aves: 'n n d a', est: [25000, 37000], bloques: [...pila('madera', 700, 3), B('madera', 700, S - 120, 160, 14), B('hielo', 700, S - 134, 40, 40), B('hielo', 700, S - 174, 40, 40)],
    cerdos: [P(640, S - 134), P(760, S - 134), P(700, S - 214), P(820, S)] },
  { nombre: 'Laberinto de muros', aves: 'n a b b d', est: [22500, 33000], bloques: [B('madera', 580, S, 16, 120), B('piedra', 660, S, 16, 120), B('hielo', 740, S, 16, 120), B('hierro', 820, S, 16, 120),
      B('madera', 620, S - 120, 104, 14), B('hielo', 700, S - 120, 104, 14), B('madera', 780, S - 120, 104, 14)],
    cerdos: [P(620, S), P(700, S), P(780, S)] },
  { nombre: 'Fortaleza real', aves: 'n d a b b n', est: [26500, 39000], bloques: [...casa(620, 100, 80, 'piedra', 'hierro'), ...casa(780, 100, 80, 'piedra', 'hierro'), B('hielo', 700, S - 94, 100, 14)],
    cerdos: [P(620, S), P(780, S), P(620, S - 94), P(780, S - 94)] },
  { nombre: 'El gran final', aves: 'n d a a b b', est: [28000, 41000], bloques: [...casa(560, 70, 60, 'madera', 'madera'), ...pila('hierro', 680, 2), ...pila('piedra', 680, 2).map(b => ({ ...b, y: b.y - 80 })), ...casa(810, 90, 80, 'piedra', 'hierro'), ...casa(810, 60, 50, 'hielo', 'madera', S - 94)],
    cerdos: [P(560, S), P(680, S - 160), P(810, S), P(810, S - 94)] },
  ].map(n => ({ ...n, aves: n.aves.split(' ').map(c => ({ n: 'normal', d: 'divisible', a: 'acelerador', b: 'bomba' })[c]) })),
];

export const validarNivel = n => Number.isInteger(n) && n >= 1 && n <= NIVELES.length;
