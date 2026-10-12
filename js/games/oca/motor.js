// Motor del Juego de la Oca (reglas clásicas españolas). Sin DOM, probable con Node.
// Casillas 1..63 (0 = salida). Cada tirada devuelve el camino recorrido y los «eventos» para que la vista los anime.
export const OCAS = [5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59];
export const FIN = 63;
export const CASILLAS = {
  6: { tipo: 'puente', nombre: 'Puente', ico: '🌉' }, 12: { tipo: 'puente', nombre: 'Puente', ico: '🌉' },
  19: { tipo: 'posada', nombre: 'Posada', ico: '🏨' }, 31: { tipo: 'pozo', nombre: 'Pozo', ico: '🕳️' },
  42: { tipo: 'laberinto', nombre: 'Laberinto', ico: '🌀' }, 56: { tipo: 'carcel', nombre: 'Cárcel', ico: '⛓️' },
  26: { tipo: 'dados', nombre: 'Dados', ico: '🎲' }, 53: { tipo: 'dados', nombre: 'Dados', ico: '🎲' },
  58: { tipo: 'muerte', nombre: 'Muerte', ico: '💀' }, 63: { tipo: 'fin', nombre: 'Jardín de la Oca', ico: '🏁' },
};
OCAS.forEach(n => { CASILLAS[n] = { tipo: 'oca', nombre: 'Oca', ico: '🦢' }; });
export const COLORES = ['#E0243A', '#2F6BFF', '#12A05C', '#F2B600'];
export const NOMBRES_COLOR = ['Roja', 'Azul', 'Verde', 'Amarilla'];
const PIERDE = { posada: 1, carcel: 2 };

export function crear({ jugadores, dados = 1, pozo = 'rescate' }) {
  return { dados: dados === 2 ? 2 : 1, pozo: pozo === 'turnos' ? 'turnos' : 'rescate', turno: 0, fase: 'tirar', ganador: -1, nTurno: 1, ultima: null, log: [],
    jug: jugadores.slice(0, 4).map((j, k) => ({ nombre: String(j.nombre).slice(0, 14) || `Jugador ${k + 1}`, cpu: !!j.cpu, color: j.color ?? k, pos: 0, pierde: 0, pozo: false, tiradas: 0 })) };
}
const v = (J, el, tu) => (J.nombre === 'Tú' ? tu : el);          // «CPU saca» / «Tú sacas»
const log = (S, t) => { S.log.unshift(t); if (S.log.length > 7) S.log.length = 7; };
const nombre = (S, j) => S.jug[j].nombre;
// Siguiente jugador que puede tirar (los que pierden turno lo van consumiendo; los del pozo esperan rescate)
function pasarTurno(S) {
  for (let vuelta = 0; vuelta < 50; vuelta++) {
    S.turno = (S.turno + 1) % S.jug.length; S.nTurno++;
    const J = S.jug[S.turno];
    if (J.pozo) { log(S, `${J.nombre} ${v(J, 'sigue', 'sigues')} en el pozo.`); continue; }
    if (J.pierde > 0) { J.pierde--; log(S, `${J.nombre} ${v(J, 'pierde', 'pierdes')} el turno${J.pierde ? ` (${v(J, 'le', 'te')} queda${J.pierde > 1 ? 'n' : ''} ${J.pierde})` : ''}.`); continue; }
    return;
  }
}
// tirada: valores de los dados (opcional, para pruebas). Devuelve { dados, camino, eventos, otra, fin }
export function tirar(S, valores) {
  if (S.fase !== 'tirar') return null;
  const j = S.turno, J = S.jug[j], d = valores || Array.from({ length: S.dados }, () => 1 + Math.floor(Math.random() * 6));
  const suma = d.reduce((a, b) => a + b, 0), camino = [], eventos = [];
  let pos = J.pos, otra = false;
  J.tiradas++;
  // primera tirada con dos dados: 6+3 → 26, 5+4 → 53
  if (S.dados === 2 && J.tiradas === 1 && J.pos === 0 && (has(d, 6, 3) || has(d, 5, 4))) {
    const a = has(d, 6, 3) ? 26 : 53; for (let k = 1; k <= suma; k++) camino.push(k);
    eventos.push({ tipo: 'dados', de: suma, a, texto: `¡${d.join(' y ')} en la primera tirada! Va directa a la ${a}.` }); pos = a;
  } else {
    // avanzar casilla a casilla, rebotando si se pasa de la 63
    let dir = 1;
    for (let k = 0; k < suma; k++) { if (pos === FIN) dir = -1; pos += dir; camino.push(pos); }
    if (dir === -1) eventos.push({ tipo: 'rebote', de: FIN, a: pos, texto: `Se pasa de la 63 y rebota hasta la ${pos}.` });
  }
  // efecto de la casilla (puede encadenar: rebote → oca, etc.)
  for (let g = 0; g < 1; g++) {                            // una sola casilla especial por tirada
    const c = CASILLAS[pos]; if (!c) break;
    if (c.tipo === 'oca' && !eventos.some(e => e.tipo === 'oca' && e.de === pos)) {
      const sig = OCAS.find(n => n > pos) ?? FIN; eventos.push({ tipo: 'oca', de: pos, a: sig, texto: sig === FIN ? '¡De oca a oca… y al jardín de la Oca!' : 'De oca a oca y tiro porque me toca.' }); pos = sig; otra = sig !== FIN; break;
    }
    if (c.tipo === 'puente' && !eventos.some(e => e.tipo === 'puente')) { const a = pos === 6 ? 12 : 6; eventos.push({ tipo: 'puente', de: pos, a, texto: 'De puente a puente y tiro porque me lleva la corriente.' }); pos = a; otra = true; break; }
    if (c.tipo === 'dados' && !eventos.some(e => e.tipo === 'dados')) { const a = pos === 26 ? 53 : 26; eventos.push({ tipo: 'dados', de: pos, a, texto: 'De dado a dado y tiro porque me ha tocado.' }); pos = a; otra = true; break; }
    if (c.tipo === 'laberinto') { eventos.push({ tipo: 'laberinto', de: 42, a: 30, texto: '¡Laberinto! Vuelve a la casilla 30.' }); pos = 30; break; }
    if (c.tipo === 'muerte') { eventos.push({ tipo: 'muerte', de: 58, a: 1, texto: '¡La muerte! Vuelve a empezar desde la casilla 1.' }); pos = 1; break; }
    if (c.tipo === 'posada' || c.tipo === 'carcel') { J.pierde = PIERDE[c.tipo]; eventos.push({ tipo: c.tipo, de: pos, a: pos, texto: c.tipo === 'posada' ? 'Se queda en la posada: pierde 1 turno.' : '¡A la cárcel! Pierde 2 turnos.' }); break; }
    if (c.tipo === 'pozo') {
      if (S.pozo === 'turnos') { J.pierde = 2; eventos.push({ tipo: 'pozo', de: 31, a: 31, texto: 'Cae en el pozo: pierde 2 turnos.' }); }
      else {
        const otro = S.jug.findIndex((x, k) => k !== j && x.pozo);
        J.pozo = true; eventos.push({ tipo: 'pozo', de: 31, a: 31, texto: otro >= 0 ? `Cae en el pozo y rescata a ${nombre(S, otro)}.` : 'Cae en el pozo: no saldrá hasta que otro jugador caiga y lo rescate.' });
        if (otro >= 0) S.jug[otro].pozo = false;
      }
      break;
    }
    break;
  }
  J.pos = pos;
  S.ultima = { j, dados: d, de: camino.length ? camino[0] - 1 : J.pos, a: pos };
  log(S, `${J.nombre} ${v(J, 'saca', 'sacas')} ${d.join(' + ')}${d.length > 1 ? ` = ${suma}` : ''} → casilla ${pos}.${eventos.length ? ' ' + eventos[eventos.length - 1].texto : ''}`);
  if (pos === FIN) { S.fase = 'fin'; S.ganador = j; log(S, `🏆 ¡${J.nombre} ${v(J, 'llega', 'llegas')} al jardín de la Oca y ${v(J, 'gana', 'ganas')}!`); return { dados: d, camino, eventos, otra: false, fin: true }; }
  if (otra) log(S, `${J.nombre} ${v(J, 'vuelve', 'vuelves')} a tirar.`); else pasarTurno(S);
  return { dados: d, camino, eventos, otra, fin: false };
}
const has = (d, a, b) => d.length === 2 && ((d[0] === a && d[1] === b) || (d[0] === b && d[1] === a));

export function validar(d) {
  if (!d || typeof d !== 'object' || ![1, 2].includes(d.dados) || !['rescate', 'turnos'].includes(d.pozo) || !Array.isArray(d.jug) || d.jug.length < 2 || d.jug.length > 4) return null;
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  const jug = [];
  for (const j of d.jug) { if (!j || typeof j.nombre !== 'string' || !ent(j.pos, 0, 63) || !ent(j.pierde, 0, 3) || !ent(j.color, 0, 3) || !ent(j.tiradas, 0, 99999)) return null; jug.push({ nombre: j.nombre.slice(0, 14), cpu: !!j.cpu, color: j.color, pos: j.pos, pierde: j.pierde, pozo: !!j.pozo && j.pos === 31, tiradas: j.tiradas }); }
  if (!['tirar', 'fin'].includes(d.fase) || !ent(d.turno, 0, jug.length - 1) || !ent(d.ganador, -1, jug.length - 1)) return null;
  return { dados: d.dados, pozo: d.pozo, turno: d.turno, fase: d.fase, ganador: d.ganador, nTurno: ent(d.nTurno, 1, 999999) ? d.nTurno : 1, jug,
    ultima: d.ultima && ent(d.ultima.j, 0, jug.length - 1) && Array.isArray(d.ultima.dados) && d.ultima.dados.every(v => ent(v, 1, 6)) ? { j: d.ultima.j, dados: d.ultima.dados.slice(0, 2), de: ent(d.ultima.de, 0, 63) ? d.ultima.de : 0, a: ent(d.ultima.a, 0, 63) ? d.ultima.a : 0 } : null,
    log: Array.isArray(d.log) ? d.log.filter(x => typeof x === 'string').slice(0, 7).map(x => x.slice(0, 160)) : [] };
}

// Coordenadas en espiral para dibujar las casillas 0..63 en una cuadrícula 8×8 (de fuera hacia dentro; la 63 queda en el centro)
export const ESPIRAL = (() => {
  const n = 8, out = []; let top = 0, bot = n - 1, izq = 0, der = n - 1;
  while (top <= bot && izq <= der) {
    for (let c = izq; c <= der; c++) out.push([bot, c]); bot--;
    for (let f = bot; f >= top; f--) out.push([f, der]); der--;
    if (top <= bot) { for (let c = der; c >= izq; c--) out.push([top, c]); top++; }
    if (izq <= der) { for (let f = top; f <= bot; f++) out.push([f, izq]); izq++; }
  }
  return out;                                              // out[casilla] = [fila, columna]
})();
