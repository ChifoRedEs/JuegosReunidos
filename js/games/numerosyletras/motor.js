// Números y Letras (sin DOM, probable con Node). Partida de varias rondas que alternan Letras y Cifras.
// Letras: 9 letras (vocales y consonantes a elegir) → la palabra más larga del diccionario (core/diccionario.js).
// Cifras: 6 números (del 1 al 10, 25, 50, 75 y 100) → acercarse lo más posible a un número de 3 cifras con + − × ÷.

export const VOCALES = { A: 12, E: 12, I: 7, O: 9, U: 4 };
export const CONSONANTES = { B: 2, C: 4, D: 5, F: 1, G: 2, H: 1, J: 1, L: 5, M: 3, N: 6, 'Ñ': 1, P: 3, Q: 1, R: 7, S: 7, T: 5, V: 1, X: 1, Y: 1, Z: 1 };
export const MIN_VOCALES = 3, MIN_CONSONANTES = 3, NUM_LETRAS = 9;
const sortear = (bolsa, rnd) => { const t = Object.values(bolsa).reduce((a, b) => a + b, 0); let x = rnd() * t; for (const [l, p] of Object.entries(bolsa)) if ((x -= p) < 0) return l; return Object.keys(bolsa)[0]; };
export const sacarLetra = (tipo, rnd = Math.random) => sortear(tipo === 'v' ? VOCALES : CONSONANTES, rnd);
export const esVocal = l => 'AEIOU'.includes(l);
// ¿Qué botones se pueden pulsar todavía? (al menos 3 vocales y 3 consonantes)
export function puedePedir(letras) {
  const v = letras.filter(esVocal).length, c = letras.length - v, quedan = NUM_LETRAS - letras.length;
  return { v: quedan > 0 && quedan > Math.max(0, MIN_CONSONANTES - c), c: quedan > 0 && quedan > Math.max(0, MIN_VOCALES - v) };
}
export function letrasAlAzar(rnd = Math.random) {
  const nv = 3 + Math.floor(rnd() * 2), out = [];                     // 3 o 4 vocales
  for (let k = 0; k < NUM_LETRAS; k++) out.push(sacarLetra(k < nv ? 'v' : 'c', rnd));
  return out;
}
const sinTildes = p => String(p).toUpperCase().replace(/Ñ/g, '\0').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\0/g, 'Ñ');
// ¿Se puede escribir la palabra con esas letras (cada una una sola vez)?
export function cabe(palabra, letras) {
  const quedan = letras.slice();
  for (const l of sinTildes(palabra)) { const i = quedan.indexOf(l); if (i < 0) return false; quedan.splice(i, 1); }
  return true;
}
export const puntosLetras = p => (p.length === NUM_LETRAS ? 18 : p.length);     // como en el programa: 9 letras valen el doble

// ---------- cifras ----------
export const PEQUENOS = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10], GRANDES = [25, 50, 75, 100];
export function numerosAlAzar(rnd = Math.random) {
  const g = rnd() < .35 ? 2 : rnd() < .75 ? 1 : 0, peq = PEQUENOS.slice(), gra = GRANDES.slice(), out = [];
  for (let k = 0; k < g; k++) out.push(gra.splice(Math.floor(rnd() * gra.length), 1)[0]);
  while (out.length < 6) out.push(peq.splice(Math.floor(rnd() * peq.length), 1)[0]);
  return { numeros: out.sort((a, b) => a - b), objetivo: 101 + Math.floor(rnd() * 899) };
}
export function operar(a, op, b) {
  if (op === '+') return a + b;
  if (op === '-') return a > b ? a - b : null;                     // sin negativos ni cero
  if (op === '×') return a * b;
  if (op === '÷') return b > 1 && a % b === 0 ? a / b : null;       // división exacta
  return null;
}
// Mejor solución: búsqueda exhaustiva combinando parejas. usar = máximo de números que se pueden emplear (para la CPU fácil)
export function resolverCifras(numeros, objetivo, { usar = 6 } = {}) {
  let mejor = { valor: numeros.reduce((a, b) => (Math.abs(b - objetivo) < Math.abs(a - objetivo) ? b : a)), pasos: [] };
  const visto = new Set();
  const rec = (ns, pasos, usados) => {
    for (const n of ns) if (Math.abs(n - objetivo) < Math.abs(mejor.valor - objetivo)) mejor = { valor: n, pasos: pasos.slice() };
    if (mejor.valor === objetivo || ns.length < 2 || usados >= usar) return;
    const clave = ns.slice().sort((a, b) => a - b).join(','); if (visto.has(clave)) return; visto.add(clave);
    for (let i = 0; i < ns.length; i++) for (let j = 0; j < ns.length; j++) {
      if (i === j) continue;
      for (const op of ['+', '-', '×', '÷']) {
        if ((op === '+' || op === '×') && i > j) continue;               // conmutativas: una vez
        const r = operar(ns[i], op, ns[j]); if (r === null || (op === '×' && (ns[i] === 1 || ns[j] === 1))) continue;
        const resto = ns.filter((_, k) => k !== i && k !== j); resto.push(r);
        pasos.push([ns[i], op, ns[j], r]); rec(resto, pasos, usados + (usados ? 1 : 2)); pasos.pop();
        if (mejor.valor === objetivo) return;
      }
    }
  };
  rec(numeros.slice(), [], 0);
  return mejor;
}
export const puntosCifras = (valor, objetivo) => { const d = Math.abs(valor - objetivo); return d === 0 ? 10 : d <= 5 ? 7 : d <= 10 ? 5 : 0; };

// ---------- CPU ----------
// palabras: lista de formables (más largas primero) · devuelve la palabra que «encuentra» la CPU según el nivel
export function palabraCPU(palabras, nivel, rnd = Math.random) {
  if (!palabras.length) return '';
  const max = palabras[0].length, objetivoLargo = nivel === 'dificil' ? max - (rnd() < .2 ? 1 : 0) : nivel === 'medio' ? max - 1 - (rnd() < .4 ? 1 : 0) : Math.min(max - 2, 4 + Math.floor(rnd() * 2));
  const l = palabras.filter(p => p.length === Math.max(2, objetivoLargo)); const c = l.length ? l : palabras.filter(p => p.length <= objetivoLargo);
  return (c.length ? c : palabras)[Math.floor(rnd() * (c.length ? c.length : palabras.length))];
}
export function cifrasCPU(numeros, objetivo, nivel) { return resolverCifras(numeros, objetivo, { usar: nivel === 'dificil' ? 6 : nivel === 'medio' ? 4 : 3 }); }

// ---------- partida ----------
export const TIEMPOS = [30, 45, 60, 0];                                  // 0 = sin límite
export const RONDAS = [4, 6, 10];
export const tipoRonda = k => (k % 2 === 0 ? 'letras' : 'cifras');
export function crear({ rondas = 6, tiempo = 45, rival = 'cpu', nivel = 'medio', reto = null } = {}) {
  return { rondas: RONDAS.includes(rondas) ? rondas : 6, tiempo: TIEMPOS.includes(tiempo) ? tiempo : 45, rival: rival === 'solo' ? 'solo' : 'cpu', nivel, reto,
    ronda: 0, puntos: [0, 0], fase: 'elegir', letras: [], numeros: [], objetivo: 0, mia: null, cpu: null, mejor: null, hist: [] };
}
// Puntos de la ronda (como en el programa: solo puntúa la mejor respuesta; si empatan, los dos)
export function puntuar(S, tipo, mia, cpu) {
  let pm = 0, pc = 0;
  if (tipo === 'letras') { pm = mia.valida ? puntosLetras(mia.palabra) : 0; pc = cpu && cpu.valida ? puntosLetras(cpu.palabra) : 0; }
  else { pm = mia.valor ? puntosCifras(mia.valor, S.objetivo) : 0; pc = cpu ? puntosCifras(cpu.valor, S.objetivo) : 0; if (pm && pc) { const dm = Math.abs(mia.valor - S.objetivo), dc = Math.abs(cpu.valor - S.objetivo); if (dm < dc) pc = 0; else if (dc < dm) pm = 0; } }
  if (tipo === 'letras' && cpu && pm && pc) { if (mia.palabra.length > cpu.palabra.length) pc = 0; else if (cpu.palabra.length > mia.palabra.length) pm = 0; }
  if (S.rival === 'solo') pc = 0;
  return [pm, pc];
}
export function validar(d) {
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  if (!d || !RONDAS.includes(d.rondas) || !TIEMPOS.includes(d.tiempo) || !['cpu', 'solo'].includes(d.rival) || !['facil', 'medio', 'dificil'].includes(d.nivel)) return null;
  if (!ent(d.ronda, 0, d.rondas) || !Array.isArray(d.puntos) || d.puntos.length !== 2 || !d.puntos.every(p => ent(p, 0, 1000)) || !['elegir', 'pensar', 'resultado', 'fin'].includes(d.fase)) return null;
  const letrasOk = Array.isArray(d.letras) && d.letras.length <= 9 && d.letras.every(l => Object.hasOwn(VOCALES, l) || Object.hasOwn(CONSONANTES, l));
  const numOk = Array.isArray(d.numeros) && d.numeros.length <= 6 && d.numeros.every(n => ent(n, 1, 100)) && ent(d.objetivo, 0, 999);
  if (!letrasOk || !numOk) return null;
  const hist = Array.isArray(d.hist) ? d.hist.filter(h => h && ['letras', 'cifras'].includes(h.tipo) && Array.isArray(h.pts) && h.pts.length === 2).slice(-10) : [];
  return { ...d, letras: d.letras.slice(), numeros: d.numeros.slice(), puntos: d.puntos.slice(), hist, fase: d.fase === 'pensar' ? 'pensar' : d.fase,
    quedan: Number.isFinite(d.quedan) ? Math.max(0, Math.min(60, d.quedan)) : d.tiempo, reto: typeof d.reto === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.reto) ? d.reto : null };
}
