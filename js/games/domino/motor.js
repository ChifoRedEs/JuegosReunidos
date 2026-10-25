// Dominó · motor sin DOM (se prueba con Node).
// Fichas [a,b]. La cadena es una lista de fichas orientadas [izq, der]; sus dos extremos son cadena[0][0] y cadena[último][1].
// Modos: robar (con pozo) · bloqueo (sin pozo, se pasa) · cinco (con pozo; puntúa cada jugada si los extremos suman múltiplo de 5) · parejas (4 jugadores, 2 contra 2, sin pozo).
// Estado: { v:1, modo, n, doble, objetivo, nivel, mano, pts:[por jugador o por equipo], manos:[[ficha…]…], pozo:[…], cadena, turno, pas (pases seguidos),
//           falta:[[números que cada jugador no tiene (pasó)]…], ultimo (última acción), fin:null|{tipo,ganador,jugador,puntos,pips}, ganador:null|-1|equipo (de la partida) }
export const MODOS = { robar: 'Clásico (con pozo)', bloqueo: 'Bloqueo (sin pozo)', cinco: 'De a cinco (puntúa)', parejas: 'Por parejas (2 contra 2)' };
export const NIVELES = { facil: 'Fácil', medio: 'Normal', dificil: 'Difícil' };
export const DOBLES = { 6: 'Doble 6 (28 fichas)', 9: 'Doble 9 (55 fichas)' };
export const OBJETIVOS = { 0: 'Una sola mano', 50: 'A 50 puntos', 100: 'A 100 puntos', 200: 'A 200 puntos' };
export const conPozo = modo => modo === 'robar' || modo === 'cinco';

const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const mulberry = a => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const barajar = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = r() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

export const todas = d => { const t = []; for (let a = 0; a <= d; a++) for (let b = a; b <= d; b++) t.push([a, b]); return t; };
export const suma = f => f[0] + f[1];
export const esDoble = f => f[0] === f[1];
// Fichas que se reparten a cada jugador
export function tamMano(modo, n, doble) {
  if (doble === 6) return conPozo(modo) ? (n === 4 ? 5 : 7) : 7;
  return conPozo(modo) ? ({ 2: 12, 3: 10, 4: 8 })[n] : 12;
}
export const equipos = S => (S.modo === 'parejas' ? 2 : S.n);
export const equipo = (S, p) => (S.modo === 'parejas' ? p % 2 : p);

export function cfgOk(c) {
  return !!c && Object.hasOwn(MODOS, c.modo) && [2, 3, 4].includes(c.n) && Object.hasOwn(DOBLES, c.doble) && Object.hasOwn(OBJETIVOS, c.objetivo) && Object.hasOwn(NIVELES, c.nivel)
    && (c.modo !== 'parejas' || c.n === 4);
}
export const normalizar = c => ({ modo: c.modo, n: c.modo === 'parejas' ? 4 : c.n, doble: +c.doble, objetivo: +c.objetivo, nivel: c.nivel });

export function crear(cfg, semilla) {
  const c = normalizar(cfg), r = mulberry(hash(semilla == null ? Math.random() + ':' + Date.now() : semilla));
  const S = { v: 1, ...c, mano: 0, pts: [], manos: [], pozo: [], cadena: [], turno: 0, pas: 0, falta: [], ultimo: null, fin: null, ganador: null };
  S.pts = Array(equipos(S)).fill(0);
  repartir(S, r, null);
  return S;
}

// Reparte una mano nueva. quien = jugador que sale (null → sale quien tenga el doble más alto, o la ficha más alta, y su ficha se pone sola)
export function repartir(S, r, quien) {
  const fichas = barajar(todas(S.doble), r), k = tamMano(S.modo, S.n, S.doble);
  S.manos = Array.from({ length: S.n }, (_, p) => fichas.slice(p * k, (p + 1) * k).sort((x, y) => suma(y) - suma(x) || y[0] - x[0]));
  S.pozo = conPozo(S.modo) ? fichas.slice(S.n * k) : [];
  S.cadena = []; S.pas = 0; S.falta = Array.from({ length: S.n }, () => []); S.fin = null; S.ultimo = null; S.mano++;
  if (quien == null) {
    let mejor = null;
    S.manos.forEach((m, p) => m.forEach((f, i) => { const kk = (esDoble(f) ? 1000 : 0) + suma(f) * 10 + f[0]; if (!mejor || kk > mejor.k) mejor = { k: kk, p, i }; }));
    S.turno = mejor.p; const f = S.manos[mejor.p][mejor.i];
    const pts = poner(S, mejor.p, mejor.i, 'c'); S.ultimo = { p: mejor.p, tipo: 'ficha', f: S.cadena[0].slice(), lado: 'c', pts, abre: true };
    S.turno = (mejor.p + 1) % S.n;
  } else S.turno = quien;
  return S;
}

export const extremos = S => (S.cadena.length ? [S.cadena[0][0], S.cadena[S.cadena.length - 1][1]] : null);
export function jugables(S, p) {
  const out = [], e = extremos(S);
  S.manos[p].forEach(([a, b], i) => {
    if (!e) { out.push({ i, lado: 'c' }); return; }
    if (a === e[0] || b === e[0]) out.push({ i, lado: 'i' });
    if (a === e[1] || b === e[1]) out.push({ i, lado: 'd' });
  });
  return out;
}
export const puedeRobar = (S, p = S.turno) => conPozo(S.modo) && S.pozo.length > 0 && jugables(S, p).length === 0;
export const debePasar = (S, p = S.turno) => jugables(S, p).length === 0 && !(conPozo(S.modo) && S.pozo.length > 0);

// Valor de los extremos de una cadena (el doble de un extremo cuenta por sus dos mitades)
export function valorExt(c) {
  if (!c.length) return 0; if (c.length === 1) return c[0][0] + c[0][1];
  const L = c[0], R = c[c.length - 1]; return (L[0] === L[1] ? 2 * L[0] : L[0]) + (R[0] === R[1] ? 2 * R[1] : R[1]);
}
const orientar = (f, lado, e) => {
  if (lado === 'c') return [f[0], f[1]];
  if (lado === 'i') return f[1] === e[0] ? [f[0], f[1]] : [f[1], f[0]];
  return f[0] === e[1] ? [f[0], f[1]] : [f[1], f[0]];
};
// Coloca la ficha i de la mano p (sin comprobar turno). Devuelve los puntos de la jugada (solo modo «cinco»).
function poner(S, p, i, lado) {
  const f = S.manos[p].splice(i, 1)[0], e = extremos(S), o = orientar(f, lado, e);
  if (lado === 'i') S.cadena.unshift(o); else S.cadena.push(o);
  if (S.modo !== 'cinco') return 0;
  const v = valorExt(S.cadena); if (v > 0 && v % 5 === 0) { S.pts[equipo(S, p)] += v; return v; } return 0;
}

export function jugar(S, p, i, lado) {
  if (!S || S.fin || p !== S.turno || !jugables(S, p).some(m => m.i === i && m.lado === lado)) return null;
  const f = S.manos[p][i].slice(), pts = poner(S, p, i, lado);
  S.pas = 0; S.ultimo = { p, tipo: 'ficha', f: lado === 'i' ? S.cadena[0].slice() : S.cadena[S.cadena.length - 1].slice(), lado, pts };
  if (!S.manos[p].length) finMano(S, 'domino', p); else S.turno = (p + 1) % S.n;
  return { f, pts, fin: S.fin };
}
export function robar(S, p) {
  if (!S || S.fin || p !== S.turno || !puedeRobar(S, p)) return null;
  const f = S.pozo.pop(); S.manos[p].push(f); S.manos[p].sort((x, y) => suma(y) - suma(x) || y[0] - x[0]);
  S.ultimo = { p, tipo: 'robo' }; return f;
}
export function pasar(S, p) {
  if (!S || S.fin || p !== S.turno || !debePasar(S, p)) return null;
  const e = extremos(S); for (const v of e) if (!S.falta[p].includes(v)) S.falta[p].push(v);
  S.pas++; S.ultimo = { p, tipo: 'pase' };
  if (S.pas >= S.n) finMano(S, 'bloqueo', p); else S.turno = (p + 1) % S.n;
  return { fin: S.fin };
}

export function finMano(S, tipo, jugador) {
  const pips = S.manos.map(m => m.reduce((a, f) => a + suma(f), 0)), eq = equipos(S);
  const tot = Array(eq).fill(0); pips.forEach((x, p) => { tot[equipo(S, p)] += x; });
  let ganador, jug = jugador;
  if (tipo === 'domino') ganador = equipo(S, jugador);
  else {
    const mn = Math.min(...tot), g = tot.map((x, i) => (x === mn ? i : -1)).filter(i => i >= 0);
    ganador = g.length === 1 ? g[0] : -1;
    if (ganador >= 0) jug = pips.map((x, p) => [x, p]).filter(([, p]) => equipo(S, p) === ganador).sort((a, b) => a[0] - b[0])[0][1];
  }
  let puntos = ganador < 0 ? 0 : pips.reduce((a, x, p) => a + (equipo(S, p) === ganador ? 0 : x), 0);
  if (S.modo === 'cinco') puntos = Math.round(puntos / 5) * 5;
  if (ganador >= 0) S.pts[ganador] += puntos;
  S.fin = { tipo, ganador, jugador: jug, puntos, pips };
  if (S.objetivo === 0) S.ganador = ganador;
  else { const mx = Math.max(...S.pts); if (mx >= S.objetivo && S.pts.filter(x => x === mx).length === 1) S.ganador = S.pts.indexOf(mx); }
  S.turno = jug;
}
export function siguienteMano(S, r = Math.random) {
  if (!S || !S.fin || S.ganador !== null) return false;
  repartir(S, r, S.fin.jugador); return true;
}

/* ---------- máquina ---------- */
function simular(S, p, m) {
  const f = S.manos[p][m.i], e = extremos(S), o = orientar(f, m.lado, e), c = S.cadena.slice();
  if (m.lado === 'i') c.unshift(o); else c.push(o); return c;
}
export function cpu(S, r = Math.random, nivel = S.nivel) {
  const p = S.turno, mv = jugables(S, p);
  if (!mv.length) return puedeRobar(S, p) ? { t: 'robar' } : { t: 'pasar' };
  if (nivel === 'facil') { const m = mv[r() * mv.length | 0]; return { t: 'jugar', i: m.i, lado: m.lado }; }
  let mejor = null;
  for (const m of mv) {
    const f = S.manos[p][m.i], c = simular(S, p, m), resto = S.manos[p].filter((_, j) => j !== m.i);
    const ext = [c[0][0], c[c.length - 1][1]], cuenta = v => resto.filter(t => t[0] === v || t[1] === v).length;
    let s = suma(f) * .8 + (esDoble(f) ? 3 : 0) + (nivel === 'dificil' ? 2 : 1.2) * (cuenta(ext[0]) + cuenta(ext[1]));
    if (!resto.length) s += 100;
    if (S.modo === 'cinco') { const v = valorExt(c); if (v > 0 && v % 5 === 0) s += v * 2.5; }
    if (nivel === 'dificil') {
      for (let k = 1; k < S.n; k++) {
        const q = (p + k) % S.n, amigo = S.modo === 'parejas' && q % 2 === p % 2;
        for (const v of ext) if (S.falta[q].includes(v)) s += amigo ? -3 : 3;
      }
      if (S.modo === 'cinco' && S.cadena.length) { const v0 = valorExt(S.cadena); void v0; }
    }
    s += r() * (nivel === 'dificil' ? .3 : 1.5);
    if (!mejor || s > mejor.s) mejor = { s, m };
  }
  return { t: 'jugar', i: mejor.m.i, lado: mejor.m.lado };
}

/* ---------- validación de partidas guardadas ---------- */
const fichaOk = (f, d) => Array.isArray(f) && f.length === 2 && f.every(x => Number.isInteger(x) && x >= 0 && x <= d);
export function validar(d) {
  try {
    if (!d || typeof d !== 'object' || d.v !== 1 || !cfgOk(d)) return null;
    const eq = d.modo === 'parejas' ? 2 : d.n;
    if (!Array.isArray(d.manos) || d.manos.length !== d.n || !Array.isArray(d.pozo) || !Array.isArray(d.cadena)) return null;
    const vistas = new Set(), canon = f => (f[0] <= f[1] ? f[0] + '-' + f[1] : f[1] + '-' + f[0]);
    const todasF = [...d.manos.flat(), ...d.pozo, ...d.cadena];
    for (const f of todasF) { if (!fichaOk(f, d.doble)) return null; const k = canon(f); if (vistas.has(k)) return null; vistas.add(k); }
    for (let i = 1; i < d.cadena.length; i++) if (d.cadena[i - 1][1] !== d.cadena[i][0]) return null;
    if (!conPozo(d.modo) && d.pozo.length) return null;
    const ent = (v, mx) => Number.isInteger(v) && v >= 0 && v <= mx;
    if (!ent(d.turno, d.n - 1) || !ent(d.pas, d.n) || !ent(d.mano, 9999) || !Array.isArray(d.pts) || d.pts.length !== eq || !d.pts.every(x => ent(x, 99999))) return null;
    if (!(d.ganador === null || d.ganador === -1 || ent(d.ganador, eq - 1))) return null;
    let fin = null;
    if (d.fin) {
      const f = d.fin; if (typeof f !== 'object' || (f.tipo !== 'domino' && f.tipo !== 'bloqueo') || !(f.ganador === -1 || ent(f.ganador, eq - 1)) || !ent(f.jugador, d.n - 1) || !ent(f.puntos, 99999)) return null;
      fin = { tipo: f.tipo, ganador: f.ganador, jugador: f.jugador, puntos: f.puntos, pips: d.manos.map(m => m.reduce((a, x) => a + x[0] + x[1], 0)) };
    } else if (d.ganador !== null) return null;
    const falta = Array.from({ length: d.n }, (_, p) => (Array.isArray(d.falta && d.falta[p]) ? d.falta[p].filter(x => ent(x, d.doble)) : []));
    const u = d.ultimo && typeof d.ultimo === 'object' && ent(d.ultimo.p, d.n - 1) && ['ficha', 'robo', 'pase'].includes(d.ultimo.tipo) && (d.ultimo.tipo !== 'ficha' || fichaOk(d.ultimo.f, d.doble))
      ? { p: d.ultimo.p, tipo: d.ultimo.tipo, f: d.ultimo.f && d.ultimo.f.slice(), lado: ['i', 'd', 'c'].includes(d.ultimo.lado) ? d.ultimo.lado : 'd', pts: ent(d.ultimo.pts, 9999) ? d.ultimo.pts : 0, abre: !!d.ultimo.abre } : null;
    return { v: 1, modo: d.modo, n: d.n, doble: d.doble, objetivo: d.objetivo, nivel: d.nivel, mano: d.mano, pts: d.pts.slice(), manos: d.manos.map(m => m.map(f => f.slice())), pozo: d.pozo.map(f => f.slice()),
      cadena: d.cadena.map(f => f.slice()), turno: d.turno, pas: d.pas, falta, ultimo: u, fin, ganador: d.ganador };
  } catch { return null; }
}
