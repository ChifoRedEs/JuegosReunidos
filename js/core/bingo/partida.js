// Lógica de una partida de Bingo Mobile (sin pantalla): jugadores (tú + hasta 8 CPU), cartones, marcas, premios y reparto del bote.
// Todo el estado es JSON (se guarda tal cual). Tú eres siempre jug[0].
import { nuevoBombo, crearCarton, numerosDe, numerosFila } from './motor.js';

export const NOMBRES = [['Paco', '🧓'], ['Lola', '👵'], ['Manolo', '👨‍🦲'], ['Charo', '👩‍🦰'], ['Pepe', '🧔'], ['Conchi', '👩‍🦳'], ['Luis', '👨‍🦱'], ['Mari', '👱‍♀️']];
export const PREMIOS = { b: ['b'], lb: ['l1', 'b'], llb: ['l1', 'l2', 'b'] };
export const PORCIENTO = { b: { b: 1 }, lb: { l1: .2, b: .8 }, llb: { l1: .15, l2: .15, b: .7 } };
export const ETIQUETA = { l1: 'Línea', l2: 'Segunda línea', b: 'Bingo' };

// o: { cpus (0–8), cartones (1–6, los tuyos), apuesta (fichas por cartón), premios ('b' | 'lb' | 'llb') }
export function crear(o, rnd = Math.random) {
  const cpus = Math.max(0, Math.min(8, o.cpus | 0)), cj = Math.max(1, Math.min(6, o.cartones | 0 || 1)), prem = PREMIOS[o.premios] ? o.premios : 'lb';
  const jug = [{ id: 0, nombre: 'Tú', e: '🙂', cpu: false, cartones: Array.from({ length: cj }, () => crearCarton(rnd)), marcas: Array.from({ length: cj }, () => []), ganado: 0 }];
  for (let i = 0; i < cpus; i++) jug.push({ id: i + 1, nombre: NOMBRES[i][0], e: NOMBRES[i][1], cpu: true, cartones: [crearCarton(rnd)], marcas: [[]], ganado: 0 });
  const apuesta = Math.max(1, o.apuesta | 0 || 10), bote = apuesta * (cj + cpus);
  return { orden: nuevoBombo(rnd), n: 0, apuesta, premiosTipo: prem, bote, jug, premios: PREMIOS[prem].map(id => ({ id, g: [], imp: 0, n: 0 })), fin: false, reg: false };
}
export const salidos = P => new Set(P.orden.slice(0, P.n));
export const coste = P => P.apuesta * P.jug[0].cartones.length;

export const filasHechas = (carton, marcas) => { const m = new Set(marcas); return carton.filter(f => numerosFila(f).every(n => m.has(n))).length; };
export const cartonLleno = (carton, marcas) => { const m = new Set(marcas); return numerosDe(carton).every(n => m.has(n)); };
export const faltanBingo = (carton, marcas) => { const m = new Set(marcas); return numerosDe(carton).filter(n => !m.has(n)).length; };
export const faltanJugador = j => Math.min(...j.cartones.map((c, i) => faltanBingo(c, j.marcas[i])));
export const faltanLinea = j => Math.min(...j.cartones.map((c, i) => { const m = new Set(j.marcas[i]); return Math.min(...c.map(f => numerosFila(f).filter(n => !m.has(n)).length)); }));

export const pendiente = P => (P.fin ? null : (P.premios.find(p => !p.g.length) || {}).id || null);
export function cumple(j, id) {
  return j.cartones.some((c, i) => id === 'b' ? cartonLleno(c, j.marcas[i]) : filasHechas(c, j.marcas[i]) >= (id === 'l2' ? 2 : 1));
}
// CPU que cumplen el premio pendiente
export const candidatosCPU = P => { const id = pendiente(P); return id ? P.jug.filter(j => j.cpu && cumple(j, id)) : []; };

// Saca la siguiente bola. Las CPU marcan todo lo que sale; tú solo si `auto` (marcado automático).
export function sacarBola(P, auto) {
  if (P.fin || P.n >= 90) return 0;
  const n = P.orden[P.n++];
  for (const j of P.jug) if (j.cpu || auto) j.cartones.forEach((c, i) => { if (numerosDe(c).includes(n)) j.marcas[i].push(n); });
  return n;
}
// Marcado manual de tus cartones: 'ok' | 'ya' | 'no-salio' | 'no-esta'
export function marcar(P, ci, n) {
  const j = P.jug[0]; if (!numerosDe(j.cartones[ci]).includes(n)) return 'no-esta';
  if (j.marcas[ci].includes(n)) return 'ya';
  if (!salidos(P).has(n)) return 'no-salio';
  j.marcas[ci].push(n); return 'ok';
}
// Reparte el premio entre los ganadores (ids). Devuelve el importe de cada uno.
export function adjudicar(P, id, ids) {
  const p = P.premios.find(x => x.id === id); if (!p || p.g.length || !ids.length) return 0;
  const tot = Math.floor(P.bote * PORCIENTO[P.premiosTipo][id]), parte = Math.floor(tot / ids.length);
  p.g = ids.slice(); p.imp = parte; p.n = P.n; ids.forEach(i => { P.jug[i].ganado += parte; });
  if (id === 'b') P.fin = true;
  return parte;
}
export function validar(P) {
  try {
    if (!P || !Array.isArray(P.orden) || P.orden.length !== 90 || !Number.isInteger(P.n) || P.n < 0 || P.n > 90) return null;
    if (!Array.isArray(P.jug) || P.jug.length < 1 || P.jug.length > 9 || !PREMIOS[P.premiosTipo] || !Array.isArray(P.premios)) return null;
    for (const j of P.jug) if (!Array.isArray(j.cartones) || !j.cartones.length || j.cartones.length !== j.marcas.length || j.cartones.some(c => c.length !== 3 || c.some(f => f.length !== 9))) return null;
    return P;
  } catch { return null; }
}
export const resumen = P => ({ texto: P.fin ? `Fin · bola ${P.n}/90` : `Bola ${P.n}/90 · bote ${P.bote}`, fin: P.fin || P.n >= 90 });
