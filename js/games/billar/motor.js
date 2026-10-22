// Billar (sin DOM: se usa en la página, en un Worker para la CPU y en las pruebas con Node).
// Mesa vertical de 500 × 1000 (y hacia abajo); la cabecera, desde donde se saca, está abajo.
// Modos: Pool 8 (bola 8), Pool 9 y Snooker de 6 rojas. La bola 0 es siempre la blanca.
export const ANCHO = 500, ALTO = 1000;
export const MODOS = { pool8: 'Pool 8', pool9: 'Pool 9', snooker: 'Snooker (6 rojas)' };
const V_MAX = 1900, ROCE = 140, REB_BANDA = .78, REB_BOLA = .96, V_PARADA = 4;
export const radio = modo => (modo === 'snooker' ? 11 : 14.5);              // algo mayores que las reales: se ven y se tocan mejor en el móvil
export const TRONERAS = [[0, 0], [ANCHO, 0], [0, ALTO / 2], [ANCHO, ALTO / 2], [0, ALTO], [ANCHO, ALTO]];
const radioTronera = (k, r) => (k === 2 || k === 3 ? r * 2.05 : r * 2.45);
// Snooker: valores y puntos de colocación
export const SN = { 7: { n: 'amarilla', v: 2, p: [345, 800] }, 8: { n: 'verde', v: 3, p: [155, 800] }, 9: { n: 'marrón', v: 4, p: [250, 800] }, 10: { n: 'azul', v: 5, p: [250, 500] }, 11: { n: 'rosa', v: 6, p: [250, 270] }, 12: { n: 'negra', v: 7, p: [250, 90] } };
export const D = { x: 250, y: 800, r: 95 };                       // la «D» del snooker (zona de la blanca en mano)
export const valorSn = id => (id >= 1 && id <= 6 ? 1 : SN[id] ? SN[id].v : 0);
export const esRoja = (modo, id) => modo === 'snooker' && id >= 1 && id <= 6;

/* ---------- colocación inicial ---------- */
function triangulo(ids, cx, cy, r) {
  const out = [], fila = Math.ceil((Math.sqrt(8 * ids.length + 1) - 1) / 2); let k = 0;
  for (let f = 0; f < fila && k < ids.length; f++) for (let c = 0; c <= f && k < ids.length; c++) out.push({ id: ids[k++], x: cx + (c - f / 2) * r * 2.02, y: cy - f * r * 1.75 });
  return out;
}
export function colocar(modo) {
  const r = radio(modo), B = [];
  if (modo === 'pool8') {
    // triángulo: la 8 en el centro, una lisa y una rayada en las esquinas de atrás; el resto al azar
    const lisas = [1, 2, 3, 4, 5, 6, 7], rayadas = [9, 10, 11, 12, 13, 14, 15], mezcla = [...lisas, ...rayadas].sort(() => Math.random() - .5);
    const orden = new Array(15).fill(0); orden[4] = 8;
    const l = mezcla.find(x => x < 8), ry = mezcla.find(x => x > 8); orden[10] = l; orden[14] = ry;
    const resto = mezcla.filter(x => x !== l && x !== ry); for (let k = 0; k < 15; k++) if (!orden[k]) orden[k] = resto.pop();
    B.push(...triangulo(orden, 250, 250, r));
  } else if (modo === 'pool9') {
    // rombo 1-2-3-2-1: la 1 delante y la 9 en el centro
    const otras = [2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - .5);
    const pos = [[0, 0], [-1, 1], [1, 1], [-2, 2], [0, 2], [2, 2], [-1, 3], [1, 3], [0, 4]];
    pos.forEach(([dx, dy], k) => B.push({ id: k === 0 ? 1 : k === 4 ? 9 : otras.pop(), x: 250 + dx * r * 1.02, y: 250 - dy * r * 1.76 }));
  } else {
    B.push(...triangulo([1, 2, 3, 4, 5, 6], 250, 270 - r * 2.2, r));
    for (const id of [7, 8, 9, 10, 11, 12]) B.push({ id, x: SN[id].p[0], y: SN[id].p[1] });
  }
  B.push({ id: 0, x: modo === 'snooker' ? 270 : 250, y: modo === 'snooker' ? 820 : 760 });
  return B.map(b => ({ ...b, vx: 0, vy: 0, fuera: false }));
}

/* ---------- física ---------- */
// Simula hasta que todo se para. Devuelve info: { primero: id de la primera bola que toca la blanca, metidas: [ids],
// banda: alguna bola tocó banda después del primer contacto, golpes: nº de choques entre bolas, rebotes }
// Un paso de física de h segundos; devuelve true si algo sigue moviéndose. info acumula lo que pasa en el tiro:
// { primero: id de la primera bola que toca la blanca, metidas: [ids], banda: alguna toca banda tras el primer contacto }
export const nuevaInfo = () => ({ primero: null, metidas: [], banda: false, choques: 0, rebotes: 0 });
export function pasoFisica(bolas, r, h, info) {
  let mov = false;
  for (const b of bolas) {
    if (b.fuera || (!b.vx && !b.vy)) continue;
    const v = Math.hypot(b.vx, b.vy), f = Math.min(v, ROCE * h);
    b.vx -= b.vx / v * f; b.vy -= b.vy / v * f;
    if (Math.hypot(b.vx, b.vy) < V_PARADA) { b.vx = b.vy = 0; continue; }
    b.x += b.vx * h; b.y += b.vy * h; mov = true;
    for (let k = 0; k < 6; k++) { const [px, py] = TRONERAS[k]; if (Math.hypot(b.x - px, b.y - py) < radioTronera(k, r)) { b.fuera = true; b.vx = b.vy = 0; info.metidas.push(b.id); break; } }
    if (b.fuera) continue;
    if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx) * REB_BANDA; tocaBanda(info); }
    if (b.x > ANCHO - r) { b.x = ANCHO - r; b.vx = -Math.abs(b.vx) * REB_BANDA; tocaBanda(info); }
    if (b.y < r) { b.y = r; b.vy = Math.abs(b.vy) * REB_BANDA; tocaBanda(info); }
    if (b.y > ALTO - r) { b.y = ALTO - r; b.vy = -Math.abs(b.vy) * REB_BANDA; tocaBanda(info); }
  }
  for (let i = 0; i < bolas.length; i++) {
    const a = bolas[i]; if (a.fuera) continue;
    for (let j = i + 1; j < bolas.length; j++) {
      const b = bolas[j]; if (b.fuera) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy; if (d2 >= 4 * r * r || d2 === 0) continue;
      const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, solape = 2 * r - d;
      a.x -= nx * solape / 2; a.y -= ny * solape / 2; b.x += nx * solape / 2; b.y += ny * solape / 2;
      const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rv > 0) {
        const jj = rv * (1 + REB_BOLA) / 2; a.vx -= jj * nx; a.vy -= jj * ny; b.vx += jj * nx; b.vy += jj * ny; mov = true; info.choques++;
        if (info.primero === null && (a.id === 0 || b.id === 0)) info.primero = a.id === 0 ? b.id : a.id;
      }
    }
  }
  return mov;
}
// Simula hasta que todo se para (lo usan la CPU y las pruebas)
export function simular(bolas, r, { paso = 1 / 480, max = 14 } = {}) {
  const info = nuevaInfo();
  for (let t = 0; t < max; t += paso) if (!pasoFisica(bolas, r, paso, info)) break;
  for (const b of bolas) { b.vx = 0; b.vy = 0; }
  return info;
}
function tocaBanda(info) { info.rebotes++; if (info.primero !== null) info.banda = true; }
export function golpear(blanca, angulo, fuerza) { const v = Math.max(.05, Math.min(1, fuerza)) * V_MAX; blanca.vx = Math.cos(angulo) * v; blanca.vy = Math.sin(angulo) * v; }

/* ---------- partida ---------- */
export function crear({ modo = 'pool8', jugadores = [{ nombre: 'Tú', cpu: false }, { nombre: 'CPU', cpu: true }], nivel = 'medio' } = {}) {
  const S = { modo: MODOS[modo] ? modo : 'pool8', nivel, jug: jugadores.map(j => ({ nombre: j.nombre, cpu: !!j.cpu, grupo: null, puntos: 0 })), turno: 0,
    bolas: colocar(modo), fase: 'apuntar', enMano: true, rotura: true, abierta: true, objetivo: 'roja', ganador: -1, msg: '', tiros: 0, faltas: [0, 0] };
  S.msg = S.modo === 'snooker' ? 'Saque: coloca la blanca en la D y tira a las rojas' : 'Saque: coloca la blanca detrás de la línea y rompe';
  return S;
}
export const enMesa = (S, id) => S.bolas.some(b => b.id === id && !b.fuera);
export const blanca = S => S.bolas.find(b => b.id === 0);
const grupoDe = id => (id >= 1 && id <= 7 ? 'lisas' : id >= 9 && id <= 15 ? 'rayadas' : null);
export const quedanDelGrupo = (S, g) => S.bolas.filter(b => !b.fuera && grupoDe(b.id) === g).length;
const rojasEnMesa = S => S.bolas.filter(b => !b.fuera && esRoja(S.modo, b.id)).length;
export function menor(S) { let m = 99; for (const b of S.bolas) if (!b.fuera && b.id && b.id < m) m = b.id; return m; }
// Bolas a las que se puede tirar legalmente (las que deben tocarse primero)
export function legales(S) {
  const vivas = S.bolas.filter(b => !b.fuera && b.id !== 0).map(b => b.id);
  if (S.modo === 'pool9') return [menor(S)];
  if (S.modo === 'pool8') {
    const g = S.jug[S.turno].grupo;
    if (!g) return vivas.filter(id => id !== 8);
    const mias = vivas.filter(id => grupoDe(id) === g); return mias.length ? mias : [8];
  }
  if (rojasEnMesa(S) || S.colorLibre) return S.objetivo === 'roja' ? vivas.filter(id => id <= 6) : vivas.filter(id => id >= 7);   // roja / color a elegir
  return [Math.min(...vivas)];                                    // colores en orden: amarilla → negra
}
// ¿Puede ponerse la blanca aquí? (bola en mano)
export function sitioValido(S, x, y) {
  const r = radio(S.modo);
  if (x < r || x > ANCHO - r || y < r || y > ALTO - r) return false;
  if (S.modo === 'snooker' && (Math.hypot(x - D.x, y - D.y) > D.r || y < D.y)) return false;
  if (S.modo !== 'snooker' && S.rotura && y < 750) return false;      // en el saque, detrás de la línea de cabecera
  if (TRONERAS.some(([px, py], k) => Math.hypot(x - px, y - py) < radioTronera(k, r) + r)) return false;
  return S.bolas.every(b => b.fuera || b.id === 0 || Math.hypot(b.x - x, b.y - y) >= 2 * r + 1);
}
function reponer(S, id, [x, y]) {                                // vuelve a poner una bola en su punto (o lo más cerca libre)
  const b = S.bolas.find(q => q.id === id), r = radio(S.modo);
  for (let k = 0; k < 60; k++) { const yy = y - k * r * .7 * (k % 2 ? 1 : -1); if (S.bolas.every(q => q === b || q.fuera || Math.hypot(q.x - x, q.y - yy) >= 2 * r + 1)) { Object.assign(b, { x, y: yy, fuera: false, vx: 0, vy: 0 }); return; } }
  Object.assign(b, { x, y, fuera: false });
}
const otro = S => (S.turno + 1) % S.jug.length;
// Aplica las reglas al resultado de un tiro (info de simular). Devuelve un texto para mostrar.
export function resolver(S, info) {
  const j = S.jug[S.turno], nombre = j.nombre, blancaDentro = info.metidas.includes(0), metidas = info.metidas.filter(id => id !== 0);
  const leg = S.legalesAntes || legales(S);
  S.tiros++; let falta = '', sigue = false, txt = '';
  const hayFalta = m => { if (!falta) falta = m; };
  if (blancaDentro) hayFalta('la blanca ha entrado en una tronera');
  if (info.primero === null) hayFalta('la blanca no ha tocado ninguna bola');
  else if (!leg.includes(info.primero)) hayFalta(`había que tocar primero ${nombreBolas(S, leg)}`);
  if (S.modo !== 'snooker' && !S.rotura && !falta && !metidas.length && !info.banda) hayFalta('ninguna bola ha tocado banda tras el golpe');

  if (S.modo === 'pool8') {
    if (metidas.includes(8)) {
      const g = j.grupo, limpio = g && quedanDelGrupo(S, g) === 0 && !falta;
      if (S.rotura && !blancaDentro) { reponer(S, 8, [250, 250]); txt = 'La 8 ha entrado en el saque: vuelve a su sitio. '; }
      else { S.ganador = limpio ? S.turno : otro(S); S.fase = 'fin'; S.msg = limpio ? `🏆 ¡${nombre} mete la 8 y gana!` : `${nombre} mete la 8 antes de tiempo: ¡gana ${S.jug[otro(S)].nombre}!`; return S.msg; }
    }
    if (!falta && S.abierta && !S.rotura) {
      const primera = metidas.find(id => grupoDe(id));
      if (primera) { const g = grupoDe(primera); j.grupo = g; S.jug[otro(S)].grupo = g === 'lisas' ? 'rayadas' : 'lisas'; S.abierta = false; txt += `${nombre} juega con las ${g}. `; }
    }
    if (!falta) sigue = j.grupo ? metidas.some(id => grupoDe(id) === j.grupo) : metidas.some(id => grupoDe(id));
  } else if (S.modo === 'pool9') {
    if (metidas.includes(9)) {
      if (!falta) { S.ganador = S.turno; S.fase = 'fin'; S.msg = `🏆 ¡${nombre} mete la 9 y gana!`; return S.msg; }
      reponer(S, 9, [250, 250]); txt = 'La 9 vuelve a su sitio por la falta. ';
    }
    if (!falta) sigue = metidas.length > 0;
  } else {
    // snooker: roja y color alternos mientras quedan rojas (los colores vuelven a su sitio); tras la última roja,
    // un color a elegir y después los colores en orden, de la amarilla a la negra
    const rojasAntes = S.rojasAntes ?? rojasEnMesa(S), conRojas = rojasAntes > 0 || !!S.colorLibre, era = S.objetivo;
    if (!falta) {
      if (era === 'roja' && rojasAntes) { if (metidas.some(id => id >= 7)) hayFalta('ha entrado un color cuando tocaba roja'); }
      else if (conRojas) { if (metidas.some(id => id <= 6)) hayFalta('ha entrado una roja cuando tocaba color'); else if (metidas.some(id => id !== info.primero)) hayFalta('ha entrado un color distinto del que tocaste'); }
      else if (metidas.some(id => id !== leg[0])) hayFalta('ha entrado una bola que no tocaba');
    }
    if (falta) {
      const pena = Math.max(4, ...leg.map(valorSn), ...(info.primero ? [valorSn(info.primero)] : []), ...metidas.map(valorSn));
      S.jug[otro(S)].puntos += pena; txt += `+${pena} para ${S.jug[otro(S)].nombre}. `;
      for (const id of metidas) if (id >= 7) reponer(S, id, SN[id].p);
    } else {
      const pts = metidas.reduce((a, id) => a + valorSn(id), 0); j.puntos += pts; sigue = pts > 0;
      if (conRojas) for (const id of metidas) if (id >= 7) reponer(S, id, SN[id].p);
      if (pts) txt += `${nombre} suma ${pts}. `;
    }
    if (rojasEnMesa(S)) { S.objetivo = !falta && sigue && era === 'roja' ? 'color' : 'roja'; S.colorLibre = false; }
    else if (rojasAntes && era === 'roja' && !falta && sigue) { S.colorLibre = true; S.objetivo = 'color'; }   // acaba de entrar la última roja
    else { S.colorLibre = false; S.objetivo = 'color'; }
    if (!S.bolas.some(b => !b.fuera && b.id !== 0)) {                                            // ya no queda ninguna: fin del frame
      const [a, b] = S.jug.map(x => x.puntos); S.ganador = a === b ? -1 : a > b ? 0 : 1; S.fase = 'fin';
      S.msg = S.ganador < 0 ? `Empate a ${a}` : `🏆 ¡${S.jug[S.ganador].nombre} gana el frame ${Math.max(a, b)}-${Math.min(a, b)}!`; return S.msg;
    }
  }
  S.rotura = false;
  if (falta) {
    S.faltas[S.turno]++; S.turno = otro(S); S.enMano = true;
    const bb = blanca(S); if (blancaDentro) { bb.fuera = false; Object.assign(bb, S.modo === 'snooker' ? { x: 250, y: 840 } : { x: 250, y: 760 }); }
    S.msg = `Falta: ${falta}. ${txt}Bola en mano para ${S.jug[S.turno].nombre === 'Tú' ? 'ti' : S.jug[S.turno].nombre}.`;
  } else {
    if (!sigue) S.turno = otro(S);
    const tu = n => n === 'Tú';
    S.enMano = false; S.msg = txt + (sigue ? (tu(nombre) ? 'Sigues tirando.' : `${nombre} sigue tirando.`) : tu(S.jug[S.turno].nombre) ? 'Te toca.' : `Turno de ${S.jug[S.turno].nombre}.`);
  }
  S.fase = 'apuntar'; S.legalesAntes = null; S.rojasAntes = null;
  return S.msg;
}
export function nombreBolas(S, ids) {
  if (S.modo === 'snooker') return ids.every(id => id <= 6) ? 'una roja' : ids.length === 1 ? `la ${SN[ids[0]].n}` : 'un color';
  if (ids.length === 1) return `la ${ids[0]}`;
  const g = grupoDe(ids[0]); return ids.every(id => grupoDe(id) === g) && g ? `una de las ${g}` : 'cualquier bola menos la 8';
}
// Antes de tirar se apunta qué era legal (el resultado se juzga con eso)
export function prepararTiro(S) { S.legalesAntes = legales(S); S.rojasAntes = rojasEnMesa(S); S.fase = 'rodando'; }

/* ---------- IA ---------- */
const NIV = { facil: { err: .045, pot: [.45, .7], cand: 10 }, medio: { err: .018, pot: [.35, .55, .8], cand: 18 }, dificil: { err: .005, pot: [.3, .45, .6, .8, 1], cand: 30 } };
const copia = bs => bs.map(b => ({ ...b }));
// Busca el mejor tiro: para cada bola legal y cada tronera calcula el «golpe fantasma» y simula varias fuerzas
export function pensar(S, semillaRnd = Math.random) {
  const N = NIV[S.nivel] || NIV.medio, r = radio(S.modo), b0 = blanca(S), leg = legales(S), cands = [];
  for (const id of leg) {
    const o = S.bolas.find(b => b.id === id && !b.fuera); if (!o) continue;
    for (const [px, py] of TRONERAS) {
      const dx = px - o.x, dy = py - o.y, d = Math.hypot(dx, dy), gx = o.x - dx / d * 2 * r, gy = o.y - dy / d * 2 * r;
      const ang = Math.atan2(gy - b0.y, gx - b0.x), corte = Math.abs(Math.atan2(Math.sin(ang - Math.atan2(dy, dx)), Math.cos(ang - Math.atan2(dy, dx))));
      if (corte > 1.35) continue;                                       // corte imposible
      cands.push({ ang, id, cal: corte + d / 900 });
    }
    cands.push({ ang: Math.atan2(o.y - b0.y, o.x - b0.x), id, cal: 2 });       // tiro directo a la bola (seguridad)
  }
  cands.sort((a, b) => a.cal - b.cal);
  let mejor = null;
  for (const c of cands.slice(0, N.cand)) for (const f of N.pot) {
    const bolas = copia(S.bolas), bb = bolas.find(b => b.id === 0); golpear(bb, c.ang, f);
    const info = simular(bolas, r, { paso: 1 / 240 });
    const nota = valorar(S, info, bolas);
    if (!mejor || nota > mejor.nota) mejor = { ang: c.ang, fuerza: f, nota };
  }
  if (!mejor) { const o = S.bolas.find(b => !b.fuera && b.id && leg.includes(b.id)) || S.bolas.find(b => !b.fuera && b.id); mejor = { ang: Math.atan2(o.y - b0.y, o.x - b0.x), fuerza: .5, nota: 0 }; }
  mejor.ang += (semillaRnd() - .5) * 2 * N.err;                         // pulso: cuanto más fácil, más se desvía
  return mejor;
}
function valorar(S, info, bolas) {
  const leg = legales(S), blancaDentro = info.metidas.includes(0), met = info.metidas.filter(id => id);
  let n = 0;
  if (blancaDentro || info.primero === null || !leg.includes(info.primero)) n -= 120;
  if (S.modo === 'pool8') {
    const g = S.jug[S.turno].grupo;
    if (met.includes(8)) n += g && quedanDelGrupo(S, g) === 0 && n >= 0 ? 1000 : -2000;
    n += met.filter(id => (g ? grupoDe(id) === g : grupoDe(id))).length * 100 - met.filter(id => g && grupoDe(id) && grupoDe(id) !== g).length * 40;
  } else if (S.modo === 'pool9') { if (met.includes(9)) n += n >= 0 ? 1000 : -300; n += met.length * 100; }
  else n += met.reduce((a, id) => a + valorSn(id), 0) * (n >= 0 ? 60 : -30);
  const bb = bolas.find(b => b.id === 0);                                // que la blanca quede lejos de las troneras
  if (bb && !bb.fuera) n -= TRONERAS.some(([x, y]) => Math.hypot(bb.x - x, bb.y - y) < 40) ? 15 : 0;
  return n + (info.banda ? 2 : 0);
}
// Bola en mano para la CPU: prueba varios sitios y se queda con el que deja el mejor tiro
export function sitioCPU(S) {
  let mejor = null;
  for (let k = 0; k < 18; k++) {
    const x = S.modo === 'snooker' ? D.x + (Math.random() - .5) * 1.8 * D.r : 40 + Math.random() * 420, y = S.modo === 'snooker' ? D.y + Math.random() * D.r * .9 : S.rotura ? 760 + Math.random() * 180 : 60 + Math.random() * 880;
    if (!sitioValido(S, x, y)) continue;
    const bb = blanca(S), antes = { x: bb.x, y: bb.y }; bb.x = x; bb.y = y;
    const p = pensar({ ...S, nivel: 'facil', bolas: S.bolas });
    bb.x = antes.x; bb.y = antes.y;
    if (!mejor || p.nota > mejor.nota) mejor = { x, y, nota: p.nota };
  }
  return mejor || { x: 250, y: S.modo === 'snooker' ? 840 : 800 };
}

/* ---------- validación ---------- */
export function validar(d) {
  const num = (v, a, b) => Number.isFinite(v) && v >= a && v <= b, ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  if (!d || !MODOS[d.modo] || !['facil', 'medio', 'dificil'].includes(d.nivel) || !Array.isArray(d.jug) || d.jug.length !== 2) return null;
  if (!['apuntar', 'fin'].includes(d.fase === 'rodando' ? 'apuntar' : d.fase) || !ent(d.turno, 0, 1)) return null;
  const ids = d.modo === 'snooker' ? 13 : d.modo === 'pool9' ? 10 : 16;
  if (!Array.isArray(d.bolas) || d.bolas.length !== ids || new Set(d.bolas.map(b => b && b.id)).size !== ids) return null;
  if (!d.bolas.every(b => b && ent(b.id, 0, ids - 1) && num(b.x, -50, ANCHO + 50) && num(b.y, -50, ALTO + 50))) return null;
  const jug = d.jug.map(j => (j && typeof j.nombre === 'string' ? { nombre: j.nombre.slice(0, 14), cpu: !!j.cpu, grupo: ['lisas', 'rayadas'].includes(j.grupo) ? j.grupo : null, puntos: ent(j.puntos, 0, 999) ? j.puntos : 0 } : null));
  if (jug.includes(null)) return null;
  return { modo: d.modo, nivel: d.nivel, jug, turno: d.turno, bolas: d.bolas.map(b => ({ id: b.id, x: b.x, y: b.y, vx: 0, vy: 0, fuera: !!b.fuera })),
    fase: d.fase === 'fin' ? 'fin' : 'apuntar', enMano: !!d.enMano, rotura: !!d.rotura, abierta: d.abierta !== false, objetivo: d.objetivo === 'color' ? 'color' : 'roja',
    colorLibre: !!d.colorLibre, ganador: ent(d.ganador, -1, 1) ? d.ganador : -1, msg: typeof d.msg === 'string' ? d.msg.slice(0, 200) : '', tiros: ent(d.tiros, 0, 1e5) ? d.tiros : 0,
    faltas: Array.isArray(d.faltas) && d.faltas.length === 2 && d.faltas.every(f => ent(f, 0, 1e4)) ? d.faltas.slice() : [0, 0] };
}
