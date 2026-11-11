// Palabras Cruzadas en español (sin DOM: se usa en la página, en el Worker de la CPU y en las pruebas con Node).
// Tablero de 15 × 15 (índice = fila * 15 + columna), 100 fichas como el Palabras Cruzadas español: CH, LL, RR y Ñ son una ficha
// y no hay K ni W. Dentro del motor cada ficha es un carácter: 'a'…'z', 'ñ', '1' = CH, '2' = LL, '3' = RR y '?' = comodín.
// El tablero es una cadena de 225 caracteres ('.' = vacía); `bl` guarda las casillas donde hay un comodín (valen 0).
export const N = 15, CENTRO = 112;
// ficha: [cuántas hay, puntos]
export const FICHAS = {
  a: [12, 1], e: [12, 1], o: [9, 1], i: [6, 1], s: [6, 1], n: [5, 1], l: [4, 1], r: [5, 1], u: [5, 1], t: [4, 1],
  d: [5, 2], g: [2, 2], c: [4, 3], b: [2, 3], m: [2, 3], p: [2, 3], h: [2, 4], f: [1, 4], v: [1, 4], y: [1, 4],
  1: [1, 5], q: [1, 5], j: [1, 8], 2: [1, 8], 'ñ': [1, 8], 3: [1, 8], x: [1, 8], z: [1, 10], '?': [2, 0],
};
export const LETRAS = Object.keys(FICHAS).filter(t => t !== '?').sort((a, b) => ver(a).localeCompare(ver(b), 'es'));   // lo que puede ser un comodín
export const valor = t => (FICHAS[t] ? FICHAS[t][1] : 0);
export function ver(t) { return t === '1' ? 'CH' : t === '2' ? 'LL' : t === '3' ? 'RR' : t === '?' ? '' : t.toUpperCase(); }
export const verPalabra = w => [...w].map(ver).join('');
const VOCAL = new Set(['a', 'e', 'i', 'o', 'u']);
export const NIVELES = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };

// Casillas de premio: 'T' palabra ×3, 'D' palabra ×2, 't' letra ×3, 'd' letra ×2 (el tablero clásico, simétrico)
export const PREMIO = (() => {
  const p = Array(225).fill('.');
  const pon = (ch, lista) => { for (const [r, c] of lista) for (const [a, b] of [[r, c], [r, 14 - c], [14 - r, c], [14 - r, 14 - c], [c, r], [c, 14 - r], [14 - c, r], [14 - c, 14 - r]]) p[a * 15 + b] = ch; };
  pon('T', [[0, 0], [0, 7]]); pon('D', [[1, 1], [2, 2], [3, 3], [4, 4], [7, 7]]); pon('t', [[1, 5], [5, 5]]); pon('d', [[0, 3], [2, 6], [3, 7], [6, 6]]);
  return p.join('');
})();
const LM = { d: 2, t: 3 }, WM = { D: 2, T: 3 };

/* ---------- partida ---------- */
function barajar(a, rnd = Math.random) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function bolsaNueva(rnd) { const b = []; for (const [t, [n]] of Object.entries(FICHAS)) for (let k = 0; k < n; k++) b.push(t); return barajar(b, rnd); }
export function crear({ jugadores = [{ nombre: 'Tú' }, { nombre: 'CPU', cpu: true }], nivel = 'medio', rnd = Math.random } = {}) {
  const S = { v: 1, nivel: NIVELES[nivel] ? nivel : 'medio', jug: jugadores.map(j => ({ nombre: String(j.nombre).slice(0, 14), cpu: !!j.cpu, pts: 0, atril: [] })),
    turno: 0, bolsa: bolsaNueva(rnd), tab: '.'.repeat(225), bl: [], ult: [], hist: [], sin: 0, fase: 'jugar', ganador: -1, final: null };
  for (const j of S.jug) reponer(S, j);
  return S;
}
function reponer(S, j) { while (j.atril.length < 7 && S.bolsa.length) j.atril.push(S.bolsa.pop()); }
export const vacio = tab => tab.indexOf('.') >= 0 && !/[^.]/.test(tab);
const fila = i => (i / 15) | 0, col = i => i % 15;

/* ---------- evaluar una jugada ---------- */
// coloc = [{ i: casilla, t: ficha (letra que representa), b: true si es comodín }]
// Devuelve { ok, error, palabras: [{ w, pts, celdas }], pts, bingo }. Con dic comprueba además que existan las palabras.
export function evaluar(tab, bl, coloc, dic = null) {
  const mal = error => ({ ok: false, error, palabras: [], pts: 0 });
  if (!coloc.length) return mal('Coloca alguna ficha en el tablero.');
  const M = tab.split(''), B = new Set(bl), nuevas = new Set();
  for (const c of coloc) {
    if (!(c.i >= 0 && c.i < 225) || M[c.i] !== '.' || nuevas.has(c.i)) return mal('Esa casilla ya está ocupada.');
    M[c.i] = c.t; nuevas.add(c.i); if (c.b) B.add(c.i);
  }
  const primera = vacio(tab), rs = new Set(coloc.map(c => fila(c.i))), cs = new Set(coloc.map(c => col(c.i)));
  if (rs.size > 1 && cs.size > 1) return mal('Las fichas tienen que ir en una misma fila o columna.');
  if (primera && !nuevas.has(CENTRO)) return mal('La primera palabra tiene que pasar por la estrella del centro.');
  if (primera && coloc.length < 2) return mal('La primera palabra tiene que tener al menos 2 fichas.');
  const lleno = (r, c) => r >= 0 && r < 15 && c >= 0 && c < 15 && M[r * 15 + c] !== '.';
  let dir;
  if (coloc.length > 1) dir = rs.size === 1 ? 'h' : 'v';
  else { const r = fila(coloc[0].i), c = col(coloc[0].i); dir = lleno(r, c - 1) || lleno(r, c + 1) ? 'h' : 'v'; }
  const [dr, dc] = dir === 'h' ? [0, 1] : [1, 0];
  // palabra a lo largo de una dirección que pasa por (r, c)
  const palabraEn = (r, c, ar, ac) => {
    while (lleno(r - ar, c - ac)) { r -= ar; c -= ac; }
    const celdas = []; while (lleno(r, c)) { celdas.push(r * 15 + c); r += ar; c += ac; }
    return celdas;
  };
  const r0 = fila(coloc[0].i), c0 = col(coloc[0].i), principal = palabraEn(r0, c0, dr, dc);
  for (const c of coloc) if (!principal.includes(c.i)) return mal('Las fichas tienen que quedar seguidas, sin huecos.');
  const grupos = [];
  if (principal.length >= 2) grupos.push(principal);
  for (const c of coloc) { const p = palabraEn(fila(c.i), col(c.i), dc, dr); if (p.length >= 2) grupos.push(p); }
  if (!grupos.length) return mal('Forma una palabra de al menos 2 letras.');
  if (!primera && !grupos.some(g => g.some(i => !nuevas.has(i)))) return mal('La palabra tiene que tocar alguna ficha que ya esté en el tablero.');
  const palabras = grupos.map(celdas => {
    let s = 0, mult = 1;
    for (const i of celdas) { const v = B.has(i) ? 0 : valor(M[i]); if (nuevas.has(i)) { s += v * (LM[PREMIO[i]] || 1); mult *= WM[PREMIO[i]] || 1; } else s += v; }
    return { w: celdas.map(i => M[i]).join(''), pts: s * mult, celdas };
  });
  const bingo = coloc.length === 7, pts = palabras.reduce((a, p) => a + p.pts, 0) + (bingo ? 50 : 0);
  if (dic) {
    const malas = palabras.filter(p => !dic.existe(p.w));
    if (malas.length) return { ok: false, error: `${malas.map(p => verPalabra(p.w)).join(', ')} no ${malas.length > 1 ? 'están' : 'está'} en el diccionario.`, palabras, pts, bingo, malas: malas.map(p => p.w) };
  }
  return { ok: true, error: '', palabras, pts, bingo };
}

/* ---------- aplicar jugadas (ya comprobadas) ---------- */
const siguiente = S => { S.turno = (S.turno + 1) % S.jug.length; };
export function jugar(S, coloc, ev) {
  const j = S.jug[S.turno], M = S.tab.split('');
  for (const c of coloc) {
    M[c.i] = c.t; if (c.b) S.bl.push(c.i);
    const k = j.atril.indexOf(c.b ? '?' : c.t); if (k >= 0) j.atril.splice(k, 1);
  }
  S.tab = M.join(''); S.ult = coloc.map(c => c.i); j.pts += ev.pts; S.sin = 0;
  S.hist.push({ j: S.turno, t: 'j', w: ev.palabras.map(p => p.w).join(' '), p: ev.pts, b: ev.bingo ? 1 : 0 });
  reponer(S, j);
  if (!j.atril.length && !S.bolsa.length) return terminar(S, S.turno);
  siguiente(S); return null;
}
// Cambiar fichas: se devuelven a la bolsa y se roban otras tantas (solo si quedan al menos 7 en la bolsa)
export const puedeCambiar = S => S.bolsa.length >= 7;
export function cambiar(S, fichas, rnd = Math.random) {
  const j = S.jug[S.turno];
  if (!puedeCambiar(S) || !fichas.length) return false;
  const copia = j.atril.slice();
  for (const t of fichas) { const k = copia.indexOf(t); if (k < 0) return false; copia.splice(k, 1); }
  const nuevas = S.bolsa.splice(S.bolsa.length - fichas.length, fichas.length);
  j.atril = copia.concat(nuevas); S.bolsa.push(...fichas); barajar(S.bolsa, rnd);
  S.hist.push({ j: S.turno, t: 'c', n: fichas.length }); S.ult = [];
  return pasoSinPuntos(S) || true;
}
export function pasar(S) { S.hist.push({ j: S.turno, t: 'p' }); S.ult = []; return pasoSinPuntos(S) || true; }
// Si todos pasan o cambian varias vueltas seguidas (3 por jugador), la partida acaba
const LIMITE_SIN = S => 3 * S.jug.length;
function pasoSinPuntos(S) { S.sin++; if (S.sin >= LIMITE_SIN(S)) return terminar(S, -1); siguiente(S); return null; }
// Fin: cada uno resta lo que le queda en el atril; quien se ha quedado sin fichas suma lo de los demás
function terminar(S, cierra) {
  const resta = S.jug.map(j => j.atril.reduce((a, t) => a + valor(t), 0)), total = resta.reduce((a, b) => a + b, 0);
  S.final = S.jug.map((j, k) => (k === cierra ? total : -resta[k]));
  S.jug.forEach((j, k) => { j.pts = Math.max(0, j.pts + S.final[k]); });
  const max = Math.max(...S.jug.map(j => j.pts)), top = S.jug.map((j, k) => k).filter(k => S.jug[k].pts === max);
  S.ganador = top.length === 1 ? top[0] : -1; S.fase = 'fin'; S.cierra = cierra;
  return S.ganador;
}

/* ---------- generador de jugadas ---------- */
// Todas las jugadas posibles con el atril en el tablero: [{ coloc, pts, w }]. Se recorren las 15 filas y las 15 columnas;
// en cada una, cada tramo (inicio, largo) que toca el juego se rellena ficha a ficha estrechando el rango del diccionario.
export function generar(tab, bl, atril, dic, { max = 15, comodines = true } = {}) {
  const M = tab.split(''), B = new Set(bl), primera = vacio(tab), out = [];
  const cuenta = {}; for (const t of atril) if (t !== '?' || comodines) cuenta[t] = (cuenta[t] || 0) + 1;
  const nAtril = Object.values(cuenta).reduce((a, b) => a + b, 0); if (!nAtril) return out;
  const vecino = i => { const r = fila(i), c = col(i); return (r > 0 && M[i - 15] !== '.') || (r < 14 && M[i + 15] !== '.') || (c > 0 && M[i - 1] !== '.') || (c < 14 && M[i + 1] !== '.'); };
  for (const h of [true, false]) {
    const idx = (L, p) => (h ? L * 15 + p : p * 15 + L);
    // letras que caben en cada casilla vacía según la palabra perpendicular, y los puntos de esa palabra
    const cruce = new Array(225).fill(null), cruceP = new Array(225).fill(0), conCruce = new Array(225).fill(false);
    for (let L = 0; L < 15; L++) for (let p = 0; p < 15; p++) {
      const i = idx(L, p); if (M[i] !== '.') continue;
      let a = '', b = '', s = 0;
      for (let q = L - 1; q >= 0 && M[idx(q, p)] !== '.'; q--) { const k = idx(q, p); a = M[k] + a; s += B.has(k) ? 0 : valor(M[k]); }
      for (let q = L + 1; q < 15 && M[idx(q, p)] !== '.'; q++) { const k = idx(q, p); b += M[k]; s += B.has(k) ? 0 : valor(M[k]); }
      if (!a && !b) continue;
      const ok = new Set(); for (const t of LETRAS) if (dic.existe(a + t + b)) ok.add(t);
      cruce[i] = ok; cruceP[i] = s; conCruce[i] = true;
    }
    for (let L = 0; L < 15; L++) {
      const celda = p => M[idx(L, p)];
      for (let s = 0; s < 15; s++) {
        if (s > 0 && celda(s - 1) !== '.') continue;
        let vac = 0, toca = false;
        for (let n = 1; s + n <= 15; n++) {
          const p = s + n - 1, i = idx(L, p);
          if (M[i] === '.') { vac++; if (primera ? i === CENTRO : vecino(i)) toca = true; } else toca = true;
          if (vac > nAtril || vac > max) break;
          if (n < 2 || !vac || !toca) continue;
          if (s + n < 15 && celda(s + n) !== '.') continue;            // la palabra seguiría: ese largo no vale
          if (!dic.total(n)) continue;
          buscar(L, s, n);
        }
      }
    }
    function buscar(L, s, n) {
      const pal = [], col2 = [];
      const rec = (k, lo, hi) => {
        if (k === n) { anotar(L, s, n, pal.join(''), col2.slice()); return; }
        const i = idx(L, s + k);
        if (M[i] !== '.') { const r = dic.estrechar(n, lo, hi, k, M[i].charCodeAt(0)); if (!r) return; pal.push(M[i]); rec(k + 1, r[0], r[1]); pal.pop(); return; }
        const permit = cruce[i];
        for (const t of Object.keys(cuenta)) {
          if (!cuenta[t]) continue;
          const opciones = t === '?' ? LETRAS : [t];
          cuenta[t]--;
          for (const x of opciones) {
            if (permit && !permit.has(x)) continue;
            const r = dic.estrechar(n, lo, hi, k, x.charCodeAt(0)); if (!r) continue;
            pal.push(x); col2.push({ i, t: x, b: t === '?' }); rec(k + 1, r[0], r[1]); col2.pop(); pal.pop();
          }
          cuenta[t]++;
        }
      };
      rec(0, 0, dic.total(n));
    }
    function anotar(L, s, n, w, coloc) {
      let sum = 0, mult = 1, extra = 0; const nuevas = new Set(coloc.map(c => c.i));
      for (let k = 0; k < n; k++) {
        const i = idx(L, s + k);
        if (nuevas.has(i)) {
          const c = coloc.find(x => x.i === i), v = c.b ? 0 : valor(c.t), lm = LM[PREMIO[i]] || 1, wm = WM[PREMIO[i]] || 1;
          sum += v * lm; mult *= wm;
          if (conCruce[i]) extra += (cruceP[i] + v * lm) * wm;
        } else sum += B.has(i) ? 0 : valor(M[i]);
      }
      const pts = sum * mult + extra + (coloc.length === 7 ? 50 : 0);
      out.push({ coloc, pts, w, h });
    }
  }
  // una sola ficha sale en las dos direcciones: se queda una
  const vistos = new Set();
  return out.filter(m => { if (m.coloc.length > 1) return true; const k = m.coloc[0].i + m.coloc[0].t + m.coloc[0].b; if (vistos.has(k)) return false; vistos.add(k); return true; });
}

/* ---------- CPU ---------- */
// Valor de lo que queda en el atril (para no gastar el comodín o la S por pocos puntos y no quedarse con letras malas)
const VALE = { '?': 24, s: 7, e: 3, a: 2, r: 2, n: 2, l: 1, o: 1, t: 1, i: 0, d: 0, c: 0, m: 0, p: 0, u: -1, b: -1, y: -1, z: 0, g: -2, h: -2, f: -2, v: -3, 1: -2, j: -2, x: -2, 2: -3, 'ñ': -3, 3: -3, q: -7 };
export function valorResto(resto) {
  if (!resto.length) return 0;
  let v = 0; const vistas = {};
  for (const t of resto) { v += VALE[t] || 0; vistas[t] = (vistas[t] || 0) + 1; if (vistas[t] > 1 && t !== '?') v -= 3 * (vistas[t] - 1); }
  const voc = resto.filter(t => VOCAL.has(t)).length, cons = resto.filter(t => !VOCAL.has(t) && t !== '?').length;
  v -= Math.abs(voc - cons) * 1.5; if (!voc && resto.length > 2 && !resto.includes('?')) v -= 6;
  return v;
}
const restoTras = (atril, coloc) => { const r = atril.slice(); for (const c of coloc) { const k = r.indexOf(c.b ? '?' : c.t); if (k >= 0) r.splice(k, 1); } return r; };
// Decide la jugada de la CPU: { tipo: 'jugar', coloc, pts, w } | { tipo: 'cambiar', fichas } | { tipo: 'pasar' }
export function pensar(S, dic, rnd = Math.random) {
  const j = S.jug[S.turno], niv = S.nivel;
  const movs = generar(S.tab, S.bl, j.atril, dic, niv === 'facil' ? { max: 5, comodines: rnd() < .5 } : {});
  if (!movs.length) {
    if (puedeCambiar(S)) return { tipo: 'cambiar', fichas: elegirCambio(j.atril) };
    return { tipo: 'pasar' };
  }
  let elegida;
  if (niv === 'dificil') {
    const fin = S.bolsa.length === 0;
    for (const m of movs) m.nota = m.pts + (fin ? 0 : valorResto(restoTras(j.atril, m.coloc)));
    movs.sort((a, b) => b.nota - a.nota); elegida = movs[0];
    if (elegida.nota < 4 && puedeCambiar(S) && elegida.pts < 8) return { tipo: 'cambiar', fichas: elegirCambio(j.atril) };
  } else if (niv === 'medio') {
    for (const m of movs) m.nota = m.pts + .5 * valorResto(restoTras(j.atril, m.coloc));
    movs.sort((a, b) => b.nota - a.nota);
    elegida = movs[Math.min(movs.length - 1, Math.floor(rnd() * 4))];
  } else {
    movs.sort((a, b) => a.pts - b.pts);
    const a = Math.floor(movs.length * .25), b = Math.max(a + 1, Math.floor(movs.length * .6));
    elegida = movs[a + Math.floor(rnd() * (b - a))];
  }
  return { tipo: 'jugar', coloc: elegida.coloc, pts: elegida.pts, w: elegida.w };
}
// Fichas que cambia la CPU: se queda con el comodín, una S y una mezcla razonable
export function elegirCambio(atril) {
  const queda = [], fuera = [];
  for (const t of atril) {
    const voc = queda.filter(x => VOCAL.has(x)).length, cons = queda.filter(x => !VOCAL.has(x) && x !== '?').length;
    const bueno = t === '?' || (t === 's' && !queda.includes('s')) || (['e', 'a', 'r', 'n', 'l', 'o'].includes(t) && !queda.includes(t) && (VOCAL.has(t) ? voc < 2 : cons < 2));
    (bueno && queda.length < 4 ? queda : fuera).push(t);
  }
  return fuera.length ? fuera : atril.slice();
}
// La mejor jugada para el atril (💡 Pista)
export function mejor(tab, bl, atril, dic) {
  const movs = generar(tab, bl, atril, dic);
  let m = null; for (const x of movs) if (!m || x.pts > m.pts) m = x;
  return m;
}

/* ---------- validación ---------- */
export function validar(d) {
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, ficha = t => typeof t === 'string' && Object.hasOwn(FICHAS, t);
  if (!d || typeof d !== 'object' || d.v !== 1 || !NIVELES[d.nivel] || !Array.isArray(d.jug) || d.jug.length < 2 || d.jug.length > 4) return null;
  if (typeof d.tab !== 'string' || d.tab.length !== 225 || ![...d.tab].every(t => t === '.' || (t !== '?' && ficha(t)))) return null;
  if (!Array.isArray(d.bolsa) || !d.bolsa.every(ficha) || !ent(d.turno, 0, d.jug.length - 1)) return null;
  const jug = d.jug.map(j => (j && typeof j.nombre === 'string' && Array.isArray(j.atril) && j.atril.length <= 7 && j.atril.every(ficha) && ent(j.pts, 0, 99999)
    ? { nombre: j.nombre.slice(0, 14), cpu: !!j.cpu, pts: j.pts, atril: j.atril.slice() } : null));
  if (jug.includes(null)) return null;
  const bl = Array.isArray(d.bl) ? d.bl.filter(i => ent(i, 0, 224) && d.tab[i] !== '.') : [];
  // el total de fichas tiene que cuadrar (100): tablero + bolsa + atriles
  const cuenta = {}; const sumar = t => { cuenta[t] = (cuenta[t] || 0) + 1; };
  [...d.tab].forEach((t, i) => { if (t !== '.') sumar(bl.includes(i) ? '?' : t); }); d.bolsa.forEach(sumar); jug.forEach(j => j.atril.forEach(sumar));
  if (Object.entries(FICHAS).some(([t, [n]]) => (cuenta[t] || 0) !== n)) return null;
  const hist = Array.isArray(d.hist) ? d.hist.filter(h => h && ent(h.j, 0, jug.length - 1) && ['j', 'c', 'p'].includes(h.t)).slice(-200).map(h => ({ j: h.j, t: h.t, w: typeof h.w === 'string' ? h.w.slice(0, 120) : '', p: ent(h.p, 0, 9999) ? h.p : 0, n: ent(h.n, 0, 7) ? h.n : 0, b: h.b ? 1 : 0 })) : [];
  return { v: 1, nivel: d.nivel, jug, turno: d.turno, bolsa: d.bolsa.slice(), tab: d.tab, bl, ult: Array.isArray(d.ult) ? d.ult.filter(i => ent(i, 0, 224) && d.tab[i] !== '.') : [], hist,
    sin: ent(d.sin, 0, 99) ? d.sin : 0, fase: d.fase === 'fin' ? 'fin' : 'jugar', ganador: ent(d.ganador, -1, jug.length - 1) ? d.ganador : -1,
    final: Array.isArray(d.final) && d.final.length === jug.length && d.final.every(x => ent(x, -999, 999)) ? d.final.slice() : null, cierra: ent(d.cierra, -1, 3) ? d.cierra : -1 };
}
