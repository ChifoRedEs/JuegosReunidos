// Reglas de las Damas (sin DOM: se puede probar con Node).
// Tablero 8×8: b[fila][col] con 0 | 'w' | 'b' | 'W' | 'B' (mayúscula = dama). Blancas abajo (suben), rojas arriba.
// Casillas jugables: (fila + col) impar.
export const REGLAS = {
  espanola: { nombre: 'Españolas', voladora: true, mayoria: true,
    texto: 'Dama voladora (recorre cualquier distancia en diagonal), los peones solo capturan hacia delante y rige la <b>ley de la mayoría</b>: si puedes capturar, debes elegir la secuencia que más piezas se lleve.' },
  inglesa: { nombre: 'Inglesas', voladora: false, mayoria: false,
    texto: 'La dama se mueve y captura de una casilla en una, en las cuatro diagonales. Los peones capturan hacia delante. Capturar es obligatorio, pero puedes elegir cualquier captura.' },
};
export const esRey = p => p === 'W' || p === 'B';
export const dueno = p => p.toLowerCase();
const inb = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const dirsPeon = p => p === 'w' ? [[-1, 1], [-1, -1]] : [[1, 1], [1, -1]];
const yaCap = (caps, r, c) => caps.some(x => x[0] === r && x[1] === c);

export function tableroInicial() {
  const b = Array.from({ length: 8 }, () => Array(8).fill(0));
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2) { if (r < 3) b[r][c] = 'b'; else if (r > 4) b[r][c] = 'w'; }
  return b;
}
// Cadenas de captura. Las piezas capturadas permanecen en el tablero hasta el final de la jugada
// (bloquean el paso y no se pueden saltar dos veces). Un peón que corona termina su jugada.
function cadenas(b, r, c, p, R, caps, path, out) {
  let sigue = false;
  const rey = esRey(p);
  for (const [dr, dc] of rey ? DIAG : dirsPeon(p)) {
    if (rey && R.voladora) {
      let rr = r + dr, cc = c + dc;
      while (inb(rr, cc) && b[rr][cc] === 0) { rr += dr; cc += dc; }
      if (!inb(rr, cc)) continue;
      const m = b[rr][cc];
      if (dueno(m) === dueno(p) || yaCap(caps, rr, cc)) continue;
      let lr = rr + dr, lc = cc + dc;
      while (inb(lr, lc) && b[lr][lc] === 0) { sigue = true; cadenas(b, lr, lc, p, R, [...caps, [rr, cc]], [...path, [lr, lc]], out); lr += dr; lc += dc; }
    } else {
      const mr = r + dr, mc = c + dc, lr = r + 2 * dr, lc = c + 2 * dc;
      if (!inb(lr, lc)) continue;
      const m = b[mr][mc];
      if (m && dueno(m) !== dueno(p) && b[lr][lc] === 0 && !yaCap(caps, mr, mc)) {
        sigue = true;
        if (!rey && ((p === 'w' && lr === 0) || (p === 'b' && lr === 7))) out.push({ path: [...path, [lr, lc]], caps: [...caps, [mr, mc]] });
        else cadenas(b, lr, lc, p, R, [...caps, [mr, mc]], [...path, [lr, lc]], out);
      }
    }
  }
  if (!sigue && path.length > 1) out.push({ path, caps });
}
// Jugadas legales de `color`: { path:[[f,c],…], caps:[[f,c],…] }. Si hay capturas, solo se devuelven capturas.
export function jugadas(b, color, R) {
  const saltos = [], pasos = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = b[r][c]; if (!p || dueno(p) !== color) continue;
    const t = b.map(x => x.slice()); t[r][c] = 0;
    cadenas(t, r, c, p, R, [], [[r, c]], saltos);
    if (saltos.length) continue;
    const rey = esRey(p);
    for (const [dr, dc] of rey ? DIAG : dirsPeon(p)) {
      let nr = r + dr, nc = c + dc;
      while (inb(nr, nc) && b[nr][nc] === 0) {
        pasos.push({ path: [[r, c], [nr, nc]], caps: [] });
        if (!(rey && R.voladora)) break;
        nr += dr; nc += dc;
      }
    }
  }
  if (saltos.length) {
    if (R.mayoria) { const max = Math.max(...saltos.map(m => m.caps.length)); return saltos.filter(m => m.caps.length === max); }
    return saltos;
  }
  return pasos;
}
export function aplicar(b, m) {
  const t = b.map(x => x.slice()), [fr, fc] = m.path[0], [er, ec] = m.path[m.path.length - 1];
  let p = t[fr][fc]; t[fr][fc] = 0; m.caps.forEach(([r, c]) => { t[r][c] = 0; });
  if (p === 'w' && er === 0) p = 'W'; if (p === 'b' && er === 7) p = 'B';
  t[er][ec] = p; return t;
}
export const clavePos = (b, turno) => b.map(r => r.map(x => x || '.').join('')).join('') + turno;
export const contar = b => { let w = 0, r = 0; for (const f of b) for (const p of f) if (p) { if (dueno(p) === 'w') w++; else r++; } return { w, b: r }; };
