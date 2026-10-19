// Kakuro: generador de paneles con solución única, resolvedor por combinaciones y utilidades.
// Panel n×n (la fila 0 y la columna 0 son siempre negras). Casilla negra: { abajo, derecha } = sumas de las tiras
// que empiezan debajo / a su derecha (0 si no hay). Casilla blanca: un número del 1 al 9; en cada tira no se repiten.
import { conSemilla } from '../../core/semilla.js';

export const TAMANOS = [6, 8, 10];
export const DIFICULTADES = {
  facil: { nombre: 'Fácil', ayuda: 'Se resuelve solo con las combinaciones de cada suma, sin probar números al azar.' },
  medio: { nombre: 'Medio', ayuda: 'Hay que cruzar sumas horizontales y verticales con atención.' },
  dificil: { nombre: 'Difícil', ayuda: 'En algún momento tendrás que razonar varias casillas a la vez.' },
};

// ---------- combinaciones: para cada suma y longitud, los conjuntos de cifras distintas (máscara de bits 1..9) ----------
const POP = new Uint8Array(1024), SUMA = new Uint8Array(1024);
for (let m = 0; m < 1024; m++) for (let d = 1; d <= 9; d++) if (m & (1 << d)) { POP[m]++; SUMA[m] += d; }
const COMB = new Map();
for (let m = 2; m < 1024; m += 2) { const k = SUMA[m] * 16 + POP[m]; if (!COMB.has(k)) COMB.set(k, []); COMB.get(k).push(m); }
export const combinaciones = (suma, largo) => COMB.get(suma * 16 + largo) || [];
export const cifras = m => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => m & (1 << d));

// ---------- tiras (runs) a partir del dibujo ----------
// negra[i] true/false · devuelve [{ celdas: [...], dir: 'h'|'v', pista: índice de la casilla negra }]
export function tiras(n, negra) {
  const out = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const i = r * n + c; if (!negra[i]) continue;
    for (const [dir, dr, dc] of [['h', 0, 1], ['v', 1, 0]]) {
      const cel = []; let y = r + dr, x = c + dc;
      while (y < n && x < n && !negra[y * n + x]) { cel.push(y * n + x); y += dr; x += dc; }
      if (cel.length) out.push({ celdas: cel, dir, pista: i });
    }
  }
  return out;
}

// ---------- resolvedor ----------
// Devuelve { n: nº de soluciones (máx. limite), sol, adivina: si ha tenido que probar valores }
export function resolver(n, negra, ts, sumas, limite = 2, maxNodos = 1e9) {
  const N = n * n, dom = new Array(N).fill(0), runsDe = Array.from({ length: N }, () => []);
  ts.forEach((t, k) => t.celdas.forEach(i => runsDe[i].push(k)));
  for (let i = 0; i < N; i++) if (!negra[i]) dom[i] = 0x3FE;
  let soluciones = 0, sol = null, otra = null, adivina = false, nodos = 0, cortado = false;
  const propagar = D => {
    let cambio = true;
    while (cambio) {
      cambio = false;
      for (let k = 0; k < ts.length; k++) {
        const cel = ts[k].celdas; let union = 0, hay = false;
        for (const m of combinaciones(sumas[k], cel.length)) {
          // la combinación vale si cada casilla puede tomar alguna cifra suya y las fijas están dentro
          let ok = true, cubre = 0;
          for (const i of cel) { const x = D[i] & m; if (!x) { ok = false; break; } cubre |= x; }
          if (ok && cubre === m) { union |= m; hay = true; }
        }
        if (!hay) return false;
        for (const i of cel) { const nd = D[i] & union; if (nd !== D[i]) { if (!nd) return false; D[i] = nd; cambio = true; } }
        // tiras cortas o casi decididas: comprobación exacta (cada cifra que queda debe caber en alguna colocación válida)
        const abiertas = cel.filter(i => POP[D[i]] > 1).length;
        if (abiertas > 0 && abiertas <= 4) {
          const pos = cel.map(() => 0), L = cel.length, objetivo = sumas[k], asig = new Array(L);
          const dfs = (j, usado, suma) => {
            if (j === L) { if (suma === objetivo) for (let x = 0; x < L; x++) pos[x] |= 1 << asig[x]; return; }
            const quedan = L - j; if (suma + quedan > objetivo || suma + quedan * 9 < objetivo) return;    // poda por suma
            for (let d = 1; d <= 9; d++) if ((D[cel[j]] & (1 << d)) && !(usado & (1 << d)) && suma + d <= objetivo) { asig[j] = d; dfs(j + 1, usado | (1 << d), suma + d); }
          };
          dfs(0, 0, 0);
          for (let x = 0; x < L; x++) { const i = cel[x], nd = D[i] & pos[x]; if (nd !== D[i]) { if (!nd) return false; D[i] = nd; cambio = true; } }
        }
        // cifras ya decididas: fuera del resto de la tira
        for (const i of cel) if (POP[D[i]] === 1) for (const j of cel) if (j !== i && (D[j] & D[i])) { D[j] &= ~D[i]; if (!D[j]) return false; cambio = true; }
      }
    }
    return true;
  };
  const buscar = (D, prof) => {
    if (soluciones >= limite || cortado) return;
    if (++nodos > maxNodos) { cortado = true; return; }
    if (!propagar(D)) return;
    let mejor = -1, tam = 99;
    for (let i = 0; i < N; i++) if (!negra[i] && POP[D[i]] > 1 && POP[D[i]] < tam) { tam = POP[D[i]]; mejor = i; }
    if (mejor < 0) { soluciones++; const s = D.map((m, i) => (negra[i] ? 0 : Math.log2(m))); if (sol) otra = s; else sol = s; return; }
    adivina = true;
    for (const d of cifras(D[mejor])) { const E = D.slice(); E[mejor] = 1 << d; buscar(E, prof + 1); if (soluciones >= limite) return; }
  };
  buscar(dom, 0);
  return { n: cortado && soluciones < limite ? -1 : soluciones, sol, otra, adivina, nodos };   // -1: demasiado costoso, se descarta
}

// ---------- generador ----------
// tiras largas = demasiadas combinaciones (paneles ambiguos y lentos de generar)
const maxTira = n => (n >= 10 ? 5 : 7);
// Dibujo de casillas negras con simetría central. Se añaden negras de una en una (con su simétrica) y solo se aceptan
// si no dejan tiras de una sola casilla ni separan el panel en trozos; se para al tener la densidad buscada y tiras ≤ 7.
function dibujo(n, rnd) {
  const negra = new Array(n * n).fill(false), sim = i => { const r = i / n | 0, c = i % n; return (n - r) % n * n + (n - c) % n; };
  for (let i = 0; i < n; i++) { negra[i] = true; negra[i * n] = true; }
  const interior = (n - 1) * (n - 1), objetivo = interior * (n <= 6 ? .2 : n <= 8 ? .28 : .3), MAX_TIRA = maxTira(n);
  const valido = () => {
    let blancas = 0, primera = -1;
    for (let i = 0; i < n * n; i++) if (!negra[i]) { blancas++; if (primera < 0) primera = i; if (largo(n, negra, i, 0, 1) === 1 || largo(n, negra, i, 1, 0) === 1) return false; }
    if (!blancas) return false;
    const visto = new Set([primera]), cola = [primera];
    while (cola.length) { const i = cola.pop(), r = i / n | 0, c = i % n; for (const [y, x] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) { const j = y * n + x; if (y >= 0 && x >= 0 && y < n && x < n && !negra[j] && !visto.has(j)) { visto.add(j); cola.push(j); } } }
    return visto.size === blancas;
  };
  const largaMax = () => { let m = 0; for (let i = 0; i < n * n; i++) if (!negra[i]) m = Math.max(m, largo(n, negra, i, 0, 1), largo(n, negra, i, 1, 0)); return m; };
  const cand = []; for (let r = 1; r < n; r++) for (let c = 1; c < n; c++) cand.push(r * n + c);
  for (let k = cand.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [cand[k], cand[j]] = [cand[j], cand[k]]; }
  let negras = 0;
  for (const i of cand) {
    if (negra[i]) continue;
    if (negras >= objetivo && largaMax() <= MAX_TIRA) break;
    const s = sim(i), ya = negra[s];
    negra[i] = true; negra[s] = true;
    if (valido()) negras += i === s || ya ? 1 : 2; else { negra[i] = false; negra[s] = ya; }
  }
  return largaMax() <= MAX_TIRA && valido() ? negra : null;
}
function largo(n, negra, i, dr, dc) {
  let r = i / n | 0, c = i % n, L = 1;
  for (let y = r - dr, x = c - dc; y >= 0 && x >= 0 && !negra[y * n + x]; y -= dr, x -= dc) L++;
  for (let y = r + dr, x = c + dc; y < n && x < n && !negra[y * n + x]; y += dr, x += dc) L++;
  return L;
}
// orden de prueba al rellenar: al azar pero favoreciendo 1, 2, 8 y 9, que dan sumas con menos combinaciones posibles
const PESO = [0, 5, 3, 1.4, 1, 1, 1, 1.4, 3, 5];
const ordenCifras = () => [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => [d, Math.random() ** (1 / PESO[d])]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
function rellenar(n, negra, ts) {
  const N = n * n, val = new Array(N).fill(0), runsDe = Array.from({ length: N }, () => []);
  ts.forEach((t, k) => t.celdas.forEach(i => runsDe[i].push(k)));
  const orden = negra.map((b, i) => (b ? -1 : i)).filter(i => i >= 0);
  let pasos = 0;
  const rec = k => {
    if (k === orden.length) return true;
    if (++pasos > 20000) return false;
    const i = orden[k], usados = new Set(); for (const t of runsDe[i]) for (const j of ts[t].celdas) if (val[j]) usados.add(val[j]);
    for (const d of ordenCifras()) { if (usados.has(d)) continue; val[i] = d; if (rec(k + 1)) return true; val[i] = 0; }
    return false;
  };
  return rec(0) ? val : null;
}
// ms: tiempo máximo orientativo; pasado ese tiempo se da por bueno un panel único aunque no sea del nivel pedido.
// (El reto del día pasa Infinity para que el resultado no dependa de la velocidad del dispositivo.)
export function generar(n = 8, dif = 'medio', ms = 2500) {
  const rnd = Math.random, t0 = Date.now();
  let reserva = null;
  for (let intento = 0; intento < 300; intento++) {
    if (reserva && Date.now() - t0 > ms) return reserva;
    const negra = dibujo(n, rnd); if (!negra) continue;
    const ts = tiras(n, negra);
    const runsDe = Array.from({ length: n * n }, () => []); ts.forEach((t, k) => t.celdas.forEach(i => runsDe[i].push(k)));
    for (let k = 0; k < 4; k++) {
      const val = rellenar(n, negra, ts); if (!val) break;
      let sumas, r;
      // si hay dos soluciones, se cambia una cifra donde se diferencian y se vuelve a probar (suele converger en pocas vueltas)
      for (let arreglo = 0; arreglo < 30; arreglo++) {
        sumas = ts.map(t => t.celdas.reduce((s, i) => s + val[i], 0));
        r = resolver(n, negra, ts, sumas, 2, 400 + n * 60);
        if (r.n !== 2) break;
        const dif = r.sol.map((v, i) => (v !== r.otra[i] ? i : -1)).filter(i => i >= 0), i = dif[Math.floor(Math.random() * dif.length)];
        const usados = new Set(); for (const t of runsDe[i]) for (const j of ts[t].celdas) if (j !== i) usados.add(val[j]);
        const libres = ordenCifras().filter(d => !usados.has(d) && d !== val[i]); if (!libres.length) break;
        val[i] = libres[0];
      }
      if (!r || r.n !== 1) continue;
      const pista = negra.map(() => null);
      ts.forEach((t, j) => { const p = pista[t.pista] || (pista[t.pista] = { abajo: 0, derecha: 0 }); p[t.dir === 'h' ? 'derecha' : 'abajo'] = sumas[j]; });
      const panel = { n, negra, pista, sol: val };
      const ok = dif === 'facil' ? !r.adivina : dif === 'dificil' ? r.adivina : true;
      if (ok) return panel;
      if (!reserva) reserva = panel;
    }
  }
  return reserva;
}

// Para el Worker (core/ia/remoto.js): con semilla (reto del día) el panel es el mismo en cualquier dispositivo
export const generarTrabajo = (n, dif, ms, semilla) => (semilla ? conSemilla(semilla, () => generar(n, dif, Infinity)) : generar(n, dif, ms));
