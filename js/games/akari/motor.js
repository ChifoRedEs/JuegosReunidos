// Motor de Akari (sin DOM, probable con Node).
// Un panel es { n, muro: [n*n] 0/1, num: [n*n] -1 (sin número) o 0..4 (solo en muros), sol: [n*n] 0/1 (bombillas) } con solución ÚNICA.
import { shuffle } from '../../core/dom.js';

export const TAMANOS = [5, 7, 10, 12];
export const DIFICULTADES = {
  facil:   { nombre: 'Fácil',   ayuda: 'Muchos números y se resuelve sin adivinar.', dens: .20, num: 1,   minimizar: 0 },
  medio:   { nombre: 'Medio',   ayuda: 'Menos números: hay que razonar con la luz.', dens: .20, num: .75, minimizar: .5 },
  dificil: { nombre: 'Difícil', ayuda: 'Pocos números; puede pedirte probar y descartar.', dens: .18, num: .5, minimizar: 1 },
};

/* ---------- geometría ---------- */
// Para cada casilla blanca, las casillas blancas que la «ven» (misma fila o columna sin muro de por medio), ella incluida.
export function vistas(p) {
  const { n, muro } = p, v = new Array(n * n).fill(null);
  for (let i = 0; i < n * n; i++) {
    if (muro[i]) continue;
    const r = i / n | 0, c = i % n, l = [i];
    for (let k = c - 1; k >= 0 && !muro[r * n + k]; k--) l.push(r * n + k);
    for (let k = c + 1; k < n && !muro[r * n + k]; k++) l.push(r * n + k);
    for (let k = r - 1; k >= 0 && !muro[k * n + c]; k--) l.push(k * n + c);
    for (let k = r + 1; k < n && !muro[k * n + c]; k++) l.push(k * n + c);
    v[i] = l;
  }
  return v;
}
export const vecinos = (n, i) => { const r = i / n | 0, c = i % n, o = []; if (r > 0) o.push(i - n); if (r < n - 1) o.push(i + n); if (c > 0) o.push(i - 1); if (c < n - 1) o.push(i + 1); return o; };

/* ---------- resolutor ---------- */
// s[i]: 0 desconocido, 1 bombilla, 2 sin bombilla. Devuelve { n: nº de soluciones (hasta `tope`), sol, ramas } .
export function resolver(p, { tope = 2, sinRamas = false, inicial = null } = {}) {
  const { n, muro, num } = p, N = n * n, V = vistas(p);
  const blancas = []; for (let i = 0; i < N; i++) if (!muro[i]) blancas.push(i);
  const numerados = []; for (let i = 0; i < N; i++) if (muro[i] && num[i] >= 0) numerados.push([i, vecinos(n, i).filter(j => !muro[j]), num[i]]);
  let cuenta = 0, sol = null, ramas = 0, abortado = false;
  const propagar = s => {
    let cambio = true;
    while (cambio) {
      cambio = false;
      for (const b of blancas) {
        if (s[b] !== 1) continue;
        for (const j of V[b]) { if (j === b) continue; if (s[j] === 1) return false; if (s[j] === 0) { s[j] = 2; cambio = true; } }
      }
      for (const i of blancas) {
        let luz = false, cand = -1, nc = 0;
        for (const j of V[i]) { if (s[j] === 1) { luz = true; break; } if (s[j] === 0) { nc++; cand = j; } }
        if (luz) continue;
        if (nc === 0) return false;
        if (nc === 1) { s[cand] = 1; cambio = true; }
      }
      for (const [, ad, k] of numerados) {
        let b = 0, u = 0; for (const j of ad) { if (s[j] === 1) b++; else if (s[j] === 0) u++; }
        if (b > k || b + u < k) return false;
        if (u && b === k) { for (const j of ad) if (s[j] === 0) s[j] = 2; cambio = true; }
        else if (u && b + u === k) { for (const j of ad) if (s[j] === 0) s[j] = 1; cambio = true; }
      }
    }
    return true;
  };
  const rec = s => {
    if (cuenta >= tope || abortado) return;
    if (!propagar(s)) return;
    let mejor = -1, mc = 99;
    for (const i of blancas) if (s[i] === 0) { let c = 0; for (const j of V[i]) if (s[j] === 0) c++; if (c < mc) { mc = c; mejor = i; } }
    if (mejor < 0) { cuenta++; if (!sol) sol = s.slice(); return; }
    if (sinRamas) { abortado = true; return; }
    ramas++;
    const a = s.slice(); a[mejor] = 1; rec(a);
    if (cuenta >= tope) return;
    const b = s.slice(); b[mejor] = 2; rec(b);
  };
  const s0 = inicial ? inicial.slice() : new Array(N).fill(0);
  rec(s0);
  return { n: cuenta, sol: sol ? sol.map(v => (v === 1 ? 1 : 0)) : null, ramas, atascado: abortado };
}
export const unica = (p, sinRamas = false) => { const r = resolver(p, { tope: 2, sinRamas }); return r.n === 1; };

/* ---------- comprobación de una configuración del jugador ---------- */
// bom: [n*n] 0/1. Devuelve { iluminada:[bool], conflicto:[bool], muroMal:[bool], muroOk:[bool], completo }.
export function evaluar(p, bom) {
  const { n, muro, num } = p, N = n * n, V = vistas(p);
  const ilu = new Array(N).fill(false), conf = new Array(N).fill(false), mal = new Array(N).fill(false), ok = new Array(N).fill(false);
  for (let i = 0; i < N; i++) if (!muro[i] && bom[i]) { for (const j of V[i]) { ilu[j] = true; if (j !== i && bom[j]) conf[i] = true; } }
  let completo = true;
  for (let i = 0; i < N; i++) {
    if (muro[i]) {
      if (num[i] >= 0) { const c = vecinos(n, i).filter(j => !muro[j] && bom[j]).length; if (c > num[i]) mal[i] = true; else if (c === num[i]) ok[i] = true; else completo = false; }
    } else if (!ilu[i]) completo = false;
    if (conf[i]) completo = false;
  }
  for (let i = 0; i < N; i++) if (mal[i]) completo = false;
  return { iluminada: ilu, conflicto: conf, muroMal: mal, muroOk: ok, completo };
}

/* ---------- generador ---------- */
function muros(n, dens) {
  const N = n * n, muro = new Array(N).fill(0);
  for (let i = 0; i < N; i++) if (Math.random() < dens) muro[i] = 1;
  // sin tableros degenerados: al menos un 8 % de muros y ninguna fila/columna entera sin muros en tableros grandes
  return muro;
}
function iluminarAlAzar(p) {
  const { n, muro } = p, N = n * n, V = vistas(p), bom = new Array(N).fill(0), visto = new Array(N).fill(false);
  for (const i of shuffle([...Array(N).keys()].filter(k => !muro[k]))) { if (visto[i]) continue; bom[i] = 1; for (const j of V[i]) visto[j] = true; }
  return bom;
}
export function generar(n, nivel = 'medio') {
  const D = DIFICULTADES[nivel] || DIFICULTADES.medio, N = n * n;
  let mejor = null;
  for (let intento = 0; intento < 80; intento++) {
    const muro = muros(n, D.dens), p = { n, muro, num: new Array(N).fill(-1) };
    if (muro.filter(Boolean).length < Math.max(3, N * .08)) continue;
    const sol = iluminarAlAzar(p);
    const completo = new Array(N).fill(-1);
    for (let i = 0; i < N; i++) if (muro[i]) completo[i] = vecinos(n, i).filter(j => !muro[j] && sol[j]).length;
    // punto de partida: números en una parte de los muros; si no basta, se añaden más hasta que la solución sea única
    const ms = shuffle([...Array(N).keys()].filter(i => muro[i]));
    p.num = new Array(N).fill(-1); ms.forEach((i, k) => { if (k < ms.length * D.num) p.num[i] = completo[i]; });
    const faltan = ms.filter(i => p.num[i] < 0);
    let ok = unica(p);
    for (const i of faltan) { if (ok) break; p.num[i] = completo[i]; ok = unica(p); }
    if (!ok) continue;
    // minimizar: quitar números mientras siga habiendo una sola solución (y, en Fácil, que no haga falta adivinar)
    const quitables = shuffle(ms.filter(i => p.num[i] >= 0));
    const lim = Math.floor(quitables.length * D.minimizar);
    for (let k = 0; k < lim; k++) { const i = quitables[k], v = p.num[i]; p.num[i] = -1; if (!unica(p)) p.num[i] = v; }
    const r = resolver(p, { tope: 2 });
    if (r.n !== 1) continue;
    const sinAdivinar = !resolver(p, { tope: 2, sinRamas: true }).atascado;
    if (nivel === 'facil' && !sinAdivinar) { mejor = mejor || { n, muro: muro.slice(), num: p.num.slice(), sol: r.sol, ramas: r.ramas }; continue; }
    if (nivel === 'dificil' && sinAdivinar && intento < 40) { mejor = mejor || { n, muro: muro.slice(), num: p.num.slice(), sol: r.sol, ramas: r.ramas }; continue; }
    return { n, muro: muro.slice(), num: p.num.slice(), sol: r.sol, ramas: r.ramas };
  }
  if (mejor) return mejor;
  // último recurso: más muros y todos los números visibles, hasta que la solución sea única
  for (let k = 0; k < 400; k++) {
    const muro = muros(n, .24 + k * .0005), p = { n, muro, num: new Array(N).fill(-1) }, sol = iluminarAlAzar(p);
    for (let i = 0; i < N; i++) if (muro[i]) p.num[i] = vecinos(n, i).filter(j => !muro[j] && sol[j]).length;
    const r = resolver(p, { tope: 2 });
    if (r.n === 1) return { n, muro, num: p.num, sol: r.sol, ramas: r.ramas };
  }
  throw new Error('Akari: no se pudo generar el panel');
}
