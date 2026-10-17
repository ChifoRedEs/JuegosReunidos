// Motor de Hundir la Flota (sin DOM, probable con Node).
// Tablero n×n, casilla i = fila * n + columna (fila 0 = A). Jugador 0 (tú / jugador 1) y jugador 1 (CPU / jugador 2).
// S.tiros[p][i] = lo que el jugador p sabe del mar RIVAL: 0 sin disparar · 1 agua · 2 tocado · 3 hundido · 4 agua deducida
// (alrededor de un barco hundido cuando los barcos no pueden tocarse).
export const FLOTAS = {
  espanola: { nombre: 'Española', desc: '10×10 · 10 barcos (4, 3, 3, 2, 2, 2, 1, 1, 1, 1)', n: 10,
    barcos: [['Portaaviones', 4], ['Acorazado', 3], ['Acorazado', 3], ['Destructor', 2], ['Destructor', 2], ['Destructor', 2], ['Submarino', 1], ['Submarino', 1], ['Submarino', 1], ['Submarino', 1]] },
  clasica: { nombre: 'Internacional', desc: '10×10 · 5 barcos (5, 4, 3, 3, 2)', n: 10,
    barcos: [['Portaaviones', 5], ['Acorazado', 4], ['Crucero', 3], ['Submarino', 3], ['Destructor', 2]] },
  rapida: { nombre: 'Rápida', desc: '8×8 · 4 barcos (4, 3, 3, 2)', n: 8,
    barcos: [['Acorazado', 4], ['Crucero', 3], ['Submarino', 3], ['Destructor', 2]] },
  piratas: { nombre: '🏴‍☠️ Piratas', desc: '9×9 · 6 barcos piratas (galeón de 4, fragata y bergantín de 3, goleta y balandra de 2, chalupa de 1)', n: 9,
    barcos: [['Galeón', 4], ['Fragata', 3], ['Bergantín', 3], ['Goleta', 2], ['Balandra', 2], ['Chalupa', 1]] },
  armada: { nombre: 'Gran armada', desc: '12×12 · 8 barcos (5, 4, 4, 3, 3, 3, 2, 2): una batalla larga', n: 12,
    barcos: [['Portaaviones', 5], ['Acorazado', 4], ['Acorazado', 4], ['Crucero', 3], ['Crucero', 3], ['Submarino', 3], ['Destructor', 2], ['Destructor', 2]] },
  relampago: { nombre: 'Relámpago', desc: '6×6 · 3 barcos (3, 2, 2): partidas de un par de minutos', n: 6,
    barcos: [['Crucero', 3], ['Destructor', 2], ['Patrullera', 2]] },
};
export const NIVEL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
export const LETRAS = 'ABCDEFGHIJKL';
export const nombreCasilla = (n, i) => LETRAS[Math.floor(i / n)] + (i % n + 1);

/* ---------- colocación ---------- */
export function celdasBarco(n, i0, len, vertical) {
  const f = Math.floor(i0 / n), c = i0 % n;
  if (vertical ? f + len > n : c + len > n) return null;
  return Array.from({ length: len }, (_, k) => (vertical ? (f + k) * n + c : f * n + c + k));
}
const vecinas = (n, i) => { const f = Math.floor(i / n), c = i % n, v = []; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { if (!a && !b) continue; const ff = f + a, cc = c + b; if (ff >= 0 && ff < n && cc >= 0 && cc < n) v.push(ff * n + cc); } return v; };
// ¿Se puede poner un barco en `celdas` sin pisar (ni tocar, si no se permite) a los demás? `salvo` = índice del barco que se mueve
export function cabe(S, p, celdas, salvo = -1) {
  if (!celdas) return false;
  const ocupadas = new Set(), cerca = new Set();
  S.barcos[p].forEach((b, k) => { if (k === salvo || !b.celdas) return; b.celdas.forEach(c => { ocupadas.add(c); if (!S.tocar) vecinas(S.n, c).forEach(v => cerca.add(v)); }); });
  return celdas.every(c => !ocupadas.has(c) && !cerca.has(c));
}
function flotaVacia(flota) { return FLOTAS[flota].barcos.map(([nombre, len]) => ({ nombre, len, celdas: null })); }
export function alAzar(S, p) {
  const tipos = flotaVacia(S.flota);
  for (let intento = 0; intento < 200; intento++) {
    S.barcos[p] = tipos.map(b => ({ ...b, celdas: null })); let ok = true;
    for (let k = 0; k < S.barcos[p].length && ok; k++) {
      const len = S.barcos[p][k].len; let puesto = false;
      for (let t = 0; t < 300 && !puesto; t++) {
        const cs = celdasBarco(S.n, Math.floor(Math.random() * S.n * S.n), len, Math.random() < .5);
        if (cabe(S, p, cs, k)) { S.barcos[p][k].celdas = cs; puesto = true; }
      }
      ok = puesto;
    }
    if (ok) return true;
  }
  return false;
}
export function colocar(S, p, k, i0, vertical) {
  if (S.fase !== 'colocar' || S.colocando !== p || !S.barcos[p][k]) return false;
  const cs = celdasBarco(S.n, i0, S.barcos[p][k].len, vertical);
  if (!cabe(S, p, cs, k)) return false;
  S.barcos[p][k].celdas = cs; return true;
}
export function quitar(S, p, k) { if (S.fase !== 'colocar' || !S.barcos[p][k]) return false; S.barcos[p][k].celdas = null; return true; }
export const barcoEn = (S, p, i) => S.barcos[p].findIndex(b => b.celdas && b.celdas.includes(i));
export const completa = (S, p) => S.barcos[p].every(b => b.celdas);

/* ---------- partida ---------- */
export function crear({ flota = 'espanola', modo = 'cpu', nivel = 'medio', tocar = false, repetir = true } = {}) {
  const F = FLOTAS[flota] ? flota : 'espanola';
  const S = { flota: F, n: FLOTAS[F].n, modo: modo === 'dos' ? 'dos' : 'cpu', nivel: NIVEL[nivel] ? nivel : 'medio', tocar: !!tocar, repetir: !!repetir,
    fase: 'colocar', colocando: 0, siguiente: null, turno: 0, ganador: -1,
    barcos: [flotaVacia(F), flotaVacia(F)], tiros: [new Array(FLOTAS[F].n ** 2).fill(0), new Array(FLOTAS[F].n ** 2).fill(0)],
    cuenta: [{ t: 0, a: 0 }, { t: 0, a: 0 }], ultimo: null, log: [] };
  if (S.modo === 'cpu') alAzar(S, 1);
  return S;
}
export const nombres = S => (S.modo === 'cpu' ? ['Tú', 'CPU'] : ['Jugador 1', 'Jugador 2']);
const log = (S, t) => { S.log.unshift(t); if (S.log.length > 6) S.log.length = 6; };
export function listo(S, p) {
  if (S.fase !== 'colocar' || S.colocando !== p || !completa(S, p)) return false;
  if (S.modo === 'cpu') { S.fase = 'jugar'; S.turno = 0; log(S, '¡Empieza la batalla! Dispara al mar enemigo.'); }
  else if (p === 0) { S.fase = 'pasar'; S.siguiente = { tipo: 'colocar', p: 1 }; }
  else { S.fase = 'pasar'; S.siguiente = { tipo: 'jugar', p: 0 }; log(S, '¡Empieza la batalla!'); }
  return true;
}
export function continuar(S) {
  if (S.fase !== 'pasar' || !S.siguiente) return false;
  if (S.siguiente.tipo === 'colocar') { S.fase = 'colocar'; S.colocando = S.siguiente.p; }
  else { S.fase = 'jugar'; S.turno = S.siguiente.p; }
  S.siguiente = null; return true;
}
export const hundido = (S, rival, b) => b.celdas.every(c => S.tiros[1 - rival][c] >= 2);
export function disparar(S, p, i) {
  if (S.fase !== 'jugar' || S.turno !== p || !Number.isInteger(i) || i < 0 || i >= S.n * S.n) return null;
  const t = S.tiros[p]; if (t[i] !== 0 && t[i] !== 4) return null;     // 4 = agua deducida: se puede disparar (es agua segura)
  const rival = 1 - p, k = barcoEn(S, rival, i), nom = nombres(S)[p];
  S.cuenta[p].t++;
  let res, barco = null;
  if (k < 0) { t[i] = 1; res = 'agua'; }
  else {
    t[i] = 2; S.cuenta[p].a++; res = 'tocado'; const b = S.barcos[rival][k]; barco = b.nombre;
    if (hundido(S, rival, b)) {
      res = 'hundido'; b.celdas.forEach(c => { t[c] = 3; });
      if (!S.tocar) b.celdas.forEach(c => vecinas(S.n, c).forEach(v => { if (t[v] === 0) t[v] = 4; }));
    }
  }
  S.ultimo = { p, i, res };
  log(S, `${nom}: ${nombreCasilla(S.n, i)} → ${res === 'agua' ? 'agua' : res === 'tocado' ? '¡tocado!' : `¡hundido! (${barco.toLowerCase()})`}`);
  if (S.barcos[rival].every(b => hundido(S, rival, b))) { S.fase = 'fin'; S.ganador = p; log(S, `¡${nom} ${S.modo === 'cpu' && p === 0 ? 'hundes' : 'hunde'} toda la flota!`); return { res, barco, fin: true }; }
  if (res === 'agua' || !S.repetir) {
    if (S.modo === 'dos') { S.fase = 'pasar'; S.siguiente = { tipo: 'jugar', p: rival }; } else S.turno = rival;
  }
  return { res, barco, fin: false };
}
export const quedan = (S, rival) => S.barcos[rival].filter(b => !hundido(S, rival, b));

/* ---------- IA: densidad de probabilidad (y pista para el jugador) ---------- */
// Solo usa lo que el jugador p puede saber: sus disparos y qué barcos rivales están hundidos (se anuncia).
export function mapaProbabilidad(S, p) {
  const n = S.n, t = S.tiros[p], peso = new Array(n * n).fill(0), rival = 1 - p;
  const restantes = quedan(S, rival).map(b => b.len), tocados = [];
  for (let i = 0; i < n * n; i++) if (t[i] === 2) tocados.push(i);
  for (const len of restantes) for (let i0 = 0; i0 < n * n; i0++) for (const v of [false, true]) {
    if (len === 1 && v) continue;
    const cs = celdasBarco(n, i0, len, v); if (!cs || cs.some(c => t[c] === 1 || t[c] === 3 || t[c] === 4)) continue;
    const toca = cs.filter(c => t[c] === 2).length;
    if (tocados.length && !toca) continue;                  // hay un barco tocado: solo cuentan las posiciones que lo continúan
    const w = tocados.length ? 1 + toca * 20 : 1;
    cs.forEach(c => { if (t[c] === 0) peso[c] += w; });
  }
  return peso;
}
export function sugerencia(S, p, nivel = 'dificil') {
  const t = S.tiros[p], libres = []; for (let i = 0; i < t.length; i++) if (t[i] === 0) libres.push(i);
  if (!libres.length) return -1;
  const peso = mapaProbabilidad(S, p), azar = a => a[Math.floor(Math.random() * a.length)];
  const hayTocado = t.some(v => v === 2);
  if (nivel === 'facil') {                                  // despistado: persigue poco los tocados y olvida el agua deducida
    if (hayTocado && Math.random() < .4) { const max = Math.max(...libres.map(i => peso[i])); return azar(libres.filter(i => peso[i] === max)); }
    const sinMirar = []; for (let i = 0; i < t.length; i++) if (t[i] === 0 || t[i] === 4) sinMirar.push(i);
    return azar(sinMirar);
  }
  if (nivel === 'medio' && !hayTocado) {                     // busca al azar entre las casillas con bastantes opciones
    const max = Math.max(...libres.map(i => peso[i])); const buenas = libres.filter(i => peso[i] >= max * .55); return azar(buenas.length ? buenas : libres);
  }
  const max = Math.max(...libres.map(i => peso[i]));
  return azar(libres.filter(i => peso[i] === max));
}
export const cpuDisparo = S => sugerencia(S, 1, S.nivel);

/* ---------- validación ---------- */
export function validar(d) {
  if (!d || typeof d !== 'object' || !FLOTAS[d.flota] || d.n !== FLOTAS[d.flota].n || !['cpu', 'dos'].includes(d.modo) || !NIVEL[d.nivel]) return null;
  if (!['colocar', 'pasar', 'jugar', 'fin'].includes(d.fase)) return null;
  const n = d.n, ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, F = FLOTAS[d.flota].barcos;
  if (!ent(d.colocando, 0, 1) || !ent(d.turno, 0, 1) || !ent(d.ganador, -1, 1)) return null;
  if (!Array.isArray(d.barcos) || d.barcos.length !== 2 || !Array.isArray(d.tiros) || d.tiros.length !== 2) return null;
  const barcos = [];
  for (const lista of d.barcos) {
    if (!Array.isArray(lista) || lista.length !== F.length) return null;
    barcos.push(lista.map((b, k) => {
      const celdas = b && Array.isArray(b.celdas) && b.celdas.length === F[k][1] && b.celdas.every(c => ent(c, 0, n * n - 1)) ? b.celdas.slice() : null;
      return { nombre: F[k][0], len: F[k][1], celdas };
    }));
  }
  const tiros = d.tiros.map(t => (Array.isArray(t) && t.length === n * n && t.every(v => ent(v, 0, 4)) ? t.slice() : null));
  if (tiros.some(t => !t)) return null;
  const S = { flota: d.flota, n, modo: d.modo, nivel: d.nivel, tocar: !!d.tocar, repetir: !!d.repetir, fase: d.fase, colocando: d.colocando, turno: d.turno, ganador: d.ganador,
    siguiente: d.siguiente && ['colocar', 'jugar'].includes(d.siguiente.tipo) && ent(d.siguiente.p, 0, 1) ? { tipo: d.siguiente.tipo, p: d.siguiente.p } : null,
    barcos, tiros, cuenta: [0, 1].map(k => { const c = Array.isArray(d.cuenta) && d.cuenta[k]; return { t: c && ent(c.t, 0, 9999) ? c.t : 0, a: c && ent(c.a, 0, 9999) ? c.a : 0 }; }),
    ultimo: d.ultimo && ent(d.ultimo.p, 0, 1) && ent(d.ultimo.i, 0, n * n - 1) && ['agua', 'tocado', 'hundido'].includes(d.ultimo.res) ? { ...d.ultimo } : null,
    log: Array.isArray(d.log) ? d.log.filter(x => typeof x === 'string').slice(0, 6).map(x => x.slice(0, 120)) : [] };
  if (S.fase === 'pasar' && !S.siguiente) return null;
  // fuera de la colocación, las dos flotas deben estar completas y bien colocadas
  for (const p of [0, 1]) {
    const lista = S.barcos[p], colocados = lista.filter(b => b.celdas);
    const enColocacion = S.fase === 'colocar' || (S.fase === 'pasar' && S.siguiente.tipo === 'colocar');
    if (!enColocacion && colocados.length !== lista.length) return null;
    for (let k = 0; k < lista.length; k++) { const b = lista[k]; if (!b.celdas) continue; const f = Math.floor(b.celdas[0] / n), v = b.celdas[1] != null && b.celdas[1] - b.celdas[0] === n; if (!b.celdas.every((c, j) => c === b.celdas[0] + j * (v ? n : 1)) || (!v && Math.floor(b.celdas[b.celdas.length - 1] / n) !== f)) return null; if (!cabe(S, p, b.celdas, k)) return null; }
  }
  return S;
}
