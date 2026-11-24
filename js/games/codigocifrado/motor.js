// Código Cifrado · motor sin DOM (se prueba con Node).
// Un código secreto de `pos` bolas de `col` colores (con o sin repetidos). Cada intento recibe: negras = color y sitio correctos, blancas = color correcto en otro sitio.
// Estado: { v:1, modo:'adivinar'|'codigo', pos, col, rep, max, sec:[…]|null, jug:[[…]], fb:[[negras,blancas]], cur:[…] (-1 = hueco), done, gano, t, pistas, ia?:bool }
//  · «adivinar»: la máquina esconde el código y tú lo descubres.  · «codigo»: tú escondes el código (sec) y la máquina intenta adivinarlo (jug/fb los rellena ella).
export const MODOS = { adivinar: 'Tú adivinas', codigo: 'Tú pones el código' };
// Jugadores: «uno» (contra el código de la máquina, como siempre), «cpu» (contra la CPU) o «dos» (dos personas en el mismo dispositivo).
//  · adivinar + cpu/dos → duelo: el código lo esconde la máquina y los dos adivináis por turnos en el mismo tablero (intentos compartidos: `max` cada uno); gana quien lo descifra.
//  · codigo + cpu/dos → dos rondas: en la 1.ª uno esconde el código y el otro lo adivina; en la 2.ª se cambian los papeles. Gana quien use menos intentos (si no lo descifra, cuenta max+1).
//    Con la CPU: ronda 1 tú escondes y ella adivina; ronda 2 ella esconde y tú adivinas. Con dos personas: ronda 1 el J1 esconde y el J2 adivina; ronda 2 al revés.
export const RIVALES = { uno: 'Un jugador', cpu: 'Contra la CPU', dos: 'Dos personas' };
export const PRESETS = {
  facil: { nombre: 'Fácil', pos: 4, col: 5, rep: false, max: 12 },
  medio: { nombre: 'Medio', pos: 4, col: 6, rep: false, max: 10 },
  dificil: { nombre: 'Difícil', pos: 5, col: 8, rep: false, max: 12 },
  experto: { nombre: 'Experto', pos: 6, col: 8, rep: false, max: 12 },
};
export const POS = [3, 4, 5, 6], COLS = [4, 5, 6, 7, 8], MAXS = [6, 8, 10, 12, 15];
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const mulberry = a => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

export function cfgOk(c) { return !!c && POS.includes(c.pos) && COLS.includes(c.col) && typeof c.rep === 'boolean' && MAXS.includes(c.max) && (c.rival === undefined || Object.hasOwn(RIVALES, c.rival)) && (c.rep || c.col >= c.pos); }
export function cfgNorm(c) { const r = { pos: c.pos, col: c.col, rep: !!c.rep, max: c.max, rival: Object.hasOwn(RIVALES, c.rival) ? c.rival : 'uno' }; if (!r.rep && r.col < r.pos) r.col = r.pos; return r; }

// Papeles de la ronda actual: quién esconde el código (ocul: 'cpu' | 'hum') y quién lo adivina (adiv: 'hum' | 'cpu' | 'duelo')
export function roles(S) {
  if (S.modo === 'adivinar') return { ocul: 'cpu', adiv: S.rival === 'uno' ? 'hum' : 'duelo' };
  if (S.rival === 'uno') return { ocul: 'hum', adiv: 'cpu' };
  if (S.rival === 'cpu') return S.ronda === 1 ? { ocul: 'hum', adiv: 'cpu' } : { ocul: 'cpu', adiv: 'hum' };
  return { ocul: 'hum', adiv: 'hum' };
}
export const filas = S => (roles(S).adiv === 'duelo' ? S.max * 2 : S.max);       // filas del tablero (en el duelo, `max` intentos para cada uno)
export const rondas = S => (S.modo === 'codigo' && S.rival !== 'uno' ? 2 : 1);
export const turnoDe = S => (S.jug.length + S.ini) % 2;                           // duelo: 0 = tú / jugador 1, 1 = CPU / jugador 2
// Quién tiene que actuar ahora: 'oculta' (un humano pone el código) | 'adivina' (un humano prueba) | 'cpu' (mueve la máquina) | null (nadie: acabó)
export function actor(S) {
  if (S.done) return null; const R = roles(S);
  if (S.sec === null) return R.ocul === 'hum' ? 'oculta' : null;
  if (R.adiv === 'hum') return 'adivina'; if (R.adiv === 'cpu') return 'cpu';
  return S.rival === 'dos' || turnoDe(S) === 0 ? 'adivina' : 'cpu';
}
// Duelo: quién descifró el código (0 = tú / J1, 1 = CPU / J2) o -1 si nadie
export const ganadorDuelo = S => (S.gano ? (S.jug.length - 1 + S.ini) % 2 : -1);
const cuenta = (x, max) => (x.gano ? x.n : max + 1);
// Dos rondas, al acabar la 2.ª: intentos de cada jugador (0 = tú / J1 adivina en la 2.ª; 1 = CPU / J2 adivina en la 1.ª) y ganador
export function resultado2(S) {
  const i1 = cuenta(S.res[0], S.max), i0 = cuenta({ n: S.jug.length, gano: S.gano }, S.max);
  return { i0, i1, g0: S.gano, g1: S.res[0].gano, n0: S.jug.length, n1: S.res[0].n, ganador: i0 < i1 ? 0 : i1 < i0 ? 1 : -1 };
}
// Pasa a la 2.ª ronda (se cambian los papeles)
export function siguienteRonda(S, r = Math.random) {
  S.res = [{ n: S.jug.length, gano: S.gano }]; S.ronda = 2; S.jug = []; S.fb = []; S.cur = Array(S.pos).fill(-1); S.done = false; S.gano = false; S.t = 0; S.pistas = 0;
  S.sec = roles(S).ocul === 'cpu' ? secretoAzar(S, r) : null;
}

// Valoración de un intento contra un secreto → [negras, blancas]
export function valorar(sec, g) {
  let n = 0; const a = [], b = [];
  for (let i = 0; i < sec.length; i++) { if (sec[i] === g[i]) n++; else { a[sec[i]] = (a[sec[i]] || 0) + 1; b[g[i]] = (b[g[i]] || 0) + 1; } }
  let w = 0; for (let c = 0; c < a.length; c++) if (a[c] && b[c]) w += Math.min(a[c], b[c]);
  return [n, w];
}
export function codigoValido(c, pos, col, rep) {
  if (!Array.isArray(c) || c.length !== pos) return false;
  if (!c.every(x => Number.isInteger(x) && x >= 0 && x < col)) return false;
  return rep || new Set(c).size === c.length;
}
export function nueva(modo, cfg, semilla) {
  const c = cfgNorm(cfg), r = mulberry(hash(semilla == null ? Math.random() : semilla)), S = { v: 1, modo, ...c, ronda: 1, res: [], ini: 0, sec: null, jug: [], fb: [], cur: Array(c.pos).fill(-1), done: false, gano: false, t: 0, pistas: 0 };
  if (modo === 'adivinar' && c.rival !== 'uno') S.ini = r() * 2 | 0;
  if (modo === 'adivinar') S.sec = secretoAzar(c, r);
  return S;
}
export function secretoAzar(c, r = Math.random) {
  const s = [], libres = Array.from({ length: c.col }, (_, i) => i);
  for (let i = 0; i < c.pos; i++) { if (c.rep) s.push(r() * c.col | 0); else s.push(libres.splice(r() * libres.length | 0, 1)[0]); }
  return s;
}
export const llena = S => S.cur.every(x => x >= 0);
export const repetidoMal = S => !S.rep && new Set(S.cur).size !== S.cur.length;

// Envía el intento actual (o el indicado). Devuelve el [negras, blancas] o null si no es válido.
export function intentar(S, g = S.cur) {
  if (S.done || !S.sec || S.jug.length >= filas(S) || !codigoValido(g, S.pos, S.col, S.rep)) return null;
  const f = valorar(S.sec, g); S.jug.push(g.slice()); S.fb.push(f); S.cur = Array(S.pos).fill(-1);
  if (f[0] === S.pos) { S.done = true; S.gano = true; } else if (S.jug.length >= filas(S)) { S.done = true; S.gano = false; }
  return f;
}
// Códigos compatibles con todas las respuestas ya recibidas (hasta `lim`); n = total contado
export function candidatos(S, lim = 4000) {
  const { pos, col, rep } = S, g = Array(pos).fill(0), out = []; let n = 0;
  const ok = () => { if (!rep) { for (let i = 0; i < pos; i++) for (let j = i + 1; j < pos; j++) if (g[i] === g[j]) return false; } for (let k = 0; k < S.jug.length; k++) { const f = valorar(g, S.jug[k]), e = S.fb[k]; if (f[0] !== e[0] || f[1] !== e[1]) return false; } return true; };
  const rec = i => {
    if (i === pos) { if (ok()) { n++; if (out.length < lim) out.push(g.slice()); } return; }
    for (let c = 0; c < col; c++) { if (!rep && g.slice(0, i).includes(c)) continue; g[i] = c; rec(i + 1); }
  };
  rec(0); return { lista: out, n };
}
// Pista: un código compatible con lo que ya sabes (y cuántos quedan)
export function pista(S, semilla = Math.random()) {
  const { lista, n } = candidatos(S, 2000); if (!lista.length) return null;
  const r = mulberry(hash(semilla)); return { cod: lista[r() * lista.length | 0], n };
}
// Jugada de la máquina (modo «codigo»): primer intento clásico, luego uno compatible al azar
export function jugadaIA(S, semilla = Math.random()) {
  if (!S.jug.length) { const g = []; for (let i = 0; i < S.pos; i++) g.push(S.rep ? (i < (S.pos + 1) >> 1 ? 0 : Math.min(1, S.col - 1)) : i); return g; }
  const p = pista(S, semilla); return p ? p.cod : null;
}
export function validar(d) {
  if (!d || typeof d !== 'object' || (d.modo !== 'adivinar' && d.modo !== 'codigo')) return null;
  if (!cfgOk(d)) return null;
  const { pos, col, rep } = d, rival = Object.hasOwn(RIVALES, d.rival) ? d.rival : 'uno';
  const base = { modo: d.modo, rival, max: d.max, ronda: 1 }, nr = rondas(base), ronda = nr === 2 && d.ronda === 2 ? 2 : 1;
  const res = Array.isArray(d.res) ? d.res.filter(x => x && Number.isInteger(x.n) && x.n >= 0 && x.n <= d.max * 2).slice(0, 1).map(x => ({ n: x.n, gano: !!x.gano })) : [];
  if (ronda === 2 && res.length !== 1) return null;
  const R = roles({ ...base, ronda }), fil = R.adiv === 'duelo' ? d.max * 2 : d.max;
  if (d.sec !== null && !codigoValido(d.sec, pos, col, rep)) return null;
  if (R.ocul === 'cpu' && !d.sec) return null;
  if (!Array.isArray(d.jug) || !Array.isArray(d.fb) || d.jug.length !== d.fb.length || d.jug.length > fil) return null;
  for (let i = 0; i < d.jug.length; i++) {
    if (!codigoValido(d.jug[i], pos, col, rep)) return null;
    if (d.sec) { const f = valorar(d.sec, d.jug[i]); if (!Array.isArray(d.fb[i]) || d.fb[i][0] !== f[0] || d.fb[i][1] !== f[1]) return null; }
  }
  const cur = Array.isArray(d.cur) && d.cur.length === pos && d.cur.every(x => Number.isInteger(x) && x >= -1 && x < col) ? d.cur.slice() : Array(pos).fill(-1);
  const S = { v: 1, modo: d.modo, rival, ronda, res, ini: d.ini === 1 && d.modo === 'adivinar' && rival !== 'uno' ? 1 : 0, pos, col, rep, max: d.max, sec: d.sec ? d.sec.slice() : null, jug: d.jug.map(x => x.slice()), fb: d.fb.map(x => x.slice()), cur,
    done: !!d.done, gano: !!d.gano, t: Math.max(0, Math.min(86400, d.t | 0)), pistas: Math.max(0, Math.min(999, d.pistas | 0)) };
  const ult = S.fb[S.fb.length - 1];
  if (ult && ult[0] === pos) { S.done = true; S.gano = true; } else if (S.jug.length >= fil) { S.done = true; S.gano = false; } else if (S.done) { S.done = false; S.gano = false; }
  return S;
}
