// Hotel · motor de reglas (puro, sin DOM). Estado serializable en JSON.
// Reglas basadas en el «Hotel» de Milton Bradley (1986): compra de terrenos, permisos de obras, edificios por fases,
// instalaciones de ocio, entradas (Ayuntamiento), estancias por noches, subastas por deudas y quiebra.
import {
  HOTELES, IDS_HOTEL, nEdif, tarifa, DINERO_INICIAL, SALARIO, PRECIO_MIN_PUJA, MAX_ENTRADAS, DADO_PERMISO,
  COLORES_JUGADOR, COCHES, N, TIPO, LINEA_BANCO, LINEA_AYTO, CASILLAS_DE, ADYACENTES,
} from './datos.js';

// ---------- utilidades ----------
export function rnd(S) {
  S.sem = (S.sem + 0x6D2B79F5) >>> 0; let t = S.sem;
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const d6 = S => 1 + Math.floor(rnd(S) * 6);
const lg = (S, s) => { S.log.push(s); if (S.log.length > 120) S.log.splice(0, S.log.length - 120); };
const eur = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €';
export const fmt = eur;
export const vivos = S => S.jug.filter(p => p.vivo).length;
export const titulos = (S, j) => IDS_HOTEL.filter(h => S.hot[h].dueno === j);
export const actor = S => (S.fase === 'subasta' && S.sub ? S.sub.pend[S.sub.cur] : S.turno);
// Dinero invertido en un hotel (terreno + edificios + instalación)
export function invertido(S, h) {
  const H = S.hot[h], D = HOTELES[h]; if (H.dueno < 0) return 0;
  let v = D.tierra; for (let i = 0; i < H.etapa; i++) v += D.edif[i].c; if (H.inst) v += D.inst.c; return v;
}
export const tarifaDe = (S, h) => tarifa(h, S.hot[h].etapa, S.hot[h].inst);
export const completo = (S, h) => S.hot[h].etapa >= nEdif(h);
export function patrimonio(S, j) {
  let v = S.jug[j].dinero; for (const h of titulos(S, j)) v += Math.round(invertido(S, h) * 0.5) + S.hot[h].ents.length * 50; return v;
}

// ---------- creación ----------
export function crear(o = {}) {
  const n = Math.max(2, Math.min(4, o.n || 4));
  const jug = Array.from({ length: n }, (_, i) => ({
    nombre: o.nombres?.[i] || `Jugador ${i + 1}`, cpu: !!o.cpu?.[i], nivel: o.niveles?.[i] ?? o.nivel ?? 2,
    color: COLORES_JUGADOR[i], coche: COCHES[i], pos: 0, dinero: DINERO_INICIAL, vivo: true, turnos: 0,
  }));
  const hot = {}; for (const id of IDS_HOTEL) hot[id] = { dueno: -1, etapa: 0, inst: false, desde: 0, ents: [] };
  const S = {
    v: 2, n, inicial: n, sem: (o.semilla ?? Date.now()) >>> 0, jug, hot, entDe: Array(N).fill(null),
    turno: 0, ronda: 1, limite: o.limite || 0, fase: 'tirar', dado: 0, seis: false, compro: false,
    pasos: [], ayto: {}, deuda: null, sub: null, ganador: -1, motivo: '', log: [],
  };
  jug[0].turnos = 1;
  lg(S, `Empieza ${jug[0].nombre}. Cada jugador tiene ${eur(DINERO_INICIAL)}.`);
  return S;
}

// ---------- opciones legales ----------
function opcionesEntrada(S, j, gratis) {
  const p = S.jug[j], out = [];
  for (const h of IDS_HOTEL) {
    const H = S.hot[h];
    if (H.dueno !== j || H.etapa < 1 || H.ents.length >= MAX_ENTRADAS) continue;
    if (!gratis && S.ayto[h]) continue;
    const precio = gratis ? 0 : HOTELES[h].entrada; if (precio > p.dinero) continue;
    for (const sq of CASILLAS_DE[h]) if (S.entDe[sq] == null && TIPO[sq] !== 'P') out.push({ h, sq, precio });
  }
  return out;
}
function opcionesLote(S, j) {
  const p = S.jug[j], pos = p.pos, out = [];
  if (S.compro) return out;
  for (const h of ADYACENTES[pos]) {
    const H = S.hot[h], t = HOTELES[h].tierra;
    if (H.dueno === -1 && t <= p.dinero) out.push({ h, precio: t, forzosa: false });
    else if (H.dueno >= 0 && H.dueno !== j && H.etapa === 0 && Math.round(t / 2) <= p.dinero) out.push({ h, precio: Math.round(t / 2), forzosa: true, a: H.dueno });
  }
  return out;
}
function opcionesObra(S, j) {
  const p = S.jug[j], out = [];
  for (const h of IDS_HOTEL) {
    const H = S.hot[h]; if (H.dueno !== j || H.etapa >= nEdif(h) || p.turnos <= H.desde) continue;
    out.push({ h, coste: HOTELES[h].edif[H.etapa].c, etapa: H.etapa });
  }
  return out;
}
function opcionesFase(S, j) {
  const out = [];
  for (const h of IDS_HOTEL) { const H = S.hot[h]; if (H.dueno === j && H.etapa < nEdif(h)) out.push({ h, etapa: H.etapa }); }
  return out;
}
function opcionesInst(S, j) {
  const out = [];
  for (const h of IDS_HOTEL) { const H = S.hot[h]; if (H.dueno === j && H.etapa >= nEdif(h) && !H.inst && HOTELES[h].inst.c <= S.jug[j].dinero) out.push({ h, coste: HOTELES[h].inst.c }); }
  return out;
}
// Valida y calcula el coste base de un plan de obras [h, h, ...] (cada aparición = una fase más)
export function costePlan(S, j, plan) {
  const cnt = {}, p = S.jug[j]; let coste = 0;
  if (!Array.isArray(plan) || !plan.length) return -1;
  for (const h of plan) {
    const H = S.hot[h]; if (!H || H.dueno !== j || p.turnos <= H.desde) return -1;
    const e = H.etapa + (cnt[h] || 0); if (e >= nEdif(h)) return -1;
    coste += HOTELES[h].edif[e].c; cnt[h] = (cnt[h] || 0) + 1;
  }
  return coste;
}

export function legales(S) {
  const f = S.fase, j = actor(S), L = { fase: f, actor: j };
  if (f === 'tirar') { L.tirar = true; L.inst = opcionesInst(S, j); }
  else if (f === 'ayto') L.entradas = opcionesEntrada(S, j, false);
  else if (f === 'entLibre') L.entradas = opcionesEntrada(S, j, true);
  else if (f === 'compra') L.lotes = opcionesLote(S, j);
  else if (f === 'obras') L.obras = opcionesObra(S, j);
  else if (f === 'faseLibre') L.obras = opcionesFase(S, j);
  else if (f === 'deuda') L.vender = titulos(S, j);
  else if (f === 'subasta') { const B = S.sub; L.min = B.mejor ? B.mejor.cant + PRECIO_MIN_PUJA : PRECIO_MIN_PUJA; L.max = S.jug[j].dinero; L.mejor = B.mejor; L.h = B.h; }
  return L;
}

// ---------- flujo ----------
function nuevoTurnoFlags(S) { S.compro = false; S.ayto = {}; S.pasos = []; S.dado = 0; }
function fin(S, ev, g, motivo) {
  S.fase = 'fin'; S.ganador = g; S.motivo = motivo || ''; ev.push({ t: 'fin', g });
  lg(S, `🏆 ¡Gana ${S.jug[g].nombre}! ${motivo || ''}`);
}
function demoler(S, h) {
  const H = S.hot[h]; for (const sq of H.ents) S.entDe[sq] = null;
  S.hot[h] = { dueno: -1, etapa: 0, inst: false, desde: 0, ents: [] };
}
function quiebra(S, ev, j) {
  const p = S.jug[j]; p.vivo = false; p.dinero = 0;
  for (const h of titulos(S, j)) demoler(S, h);
  ev.push({ t: 'quiebra', j }); lg(S, `💥 ${p.nombre} se arruina y queda eliminado.`);
  S.pasos = []; S.seis = false;
  if (vivos(S) === 1) fin(S, ev, S.jug.findIndex(q => q.vivo), 'Último jugador en pie.');
}
function finTurno(S, ev) {
  if (S.fase === 'fin') return;
  const j = S.turno;
  if (vivos(S) <= 1) return fin(S, ev, S.jug.findIndex(q => q.vivo), 'Último jugador en pie.');
  nuevoTurnoFlags(S);
  if (S.seis && S.jug[j].vivo) {
    S.seis = false; S.jug[j].turnos++; S.fase = 'tirar'; ev.push({ t: 'extra', j }); lg(S, `${S.jug[j].nombre} sacó un 6 y vuelve a tirar.`); return;
  }
  S.seis = false;
  let k = j;
  do { k = (k + 1) % S.n; if (k <= j && S.jug[k].vivo) S.ronda++; } while (!S.jug[k].vivo);
  if (S.limite && S.ronda > S.limite) {
    let g = 0, mejor = -1; S.jug.forEach((q, i) => { if (q.vivo) { const v = patrimonio(S, i); if (v > mejor) { mejor = v; g = i; } } });
    return fin(S, ev, g, `Fin de las ${S.limite} rondas: mayor patrimonio (${eur(mejor)}).`);
  }
  S.turno = k; S.jug[k].turnos++; S.fase = 'tirar'; ev.push({ t: 'turno', j: k });
}
// Cobro: devuelve 'ok' | 'espera' (hay que vender hoteles) | 'quiebra'
function pagar(S, ev, j, cant, a, motivo) {
  if (cant <= 0) return 'ok';
  S.deuda = { j, cant, a, motivo: motivo || '' };
  return liquidar(S, ev);
}
function liquidar(S, ev) {
  const D = S.deuda, p = S.jug[D.j], pago = Math.min(p.dinero, D.cant);
  if (pago > 0) { p.dinero -= pago; D.cant -= pago; if (D.a >= 0) S.jug[D.a].dinero += pago; ev.push({ t: 'paga', j: D.j, a: D.a, cant: pago }); }
  if (D.cant <= 0) { S.deuda = null; return 'ok'; }
  if (!titulos(S, D.j).length) { S.deuda = null; quiebra(S, ev, D.j); return 'quiebra'; }
  lg(S, `${p.nombre} debe ${eur(D.cant)} y tiene que vender hoteles en subasta.`);
  S.fase = 'deuda'; return 'espera';
}
function seguir(S, ev, r) { if (r === 'ok') avanzar(S, ev); else if (r === 'quiebra') finTurno(S, ev); }

function avanzar(S, ev) {
  for (;;) {
    if (S.fase === 'fin') return;
    const paso = S.pasos.shift(); const j = S.turno, p = S.jug[j];
    if (!paso) { finTurno(S, ev); return; }
    if (paso === 'ayto') { if (opcionesEntrada(S, j, false).length) { S.fase = 'ayto'; return; } continue; }
    if (paso === 'estancia') {
      const h = S.entDe[p.pos]; if (h == null) continue;
      const H = S.hot[h]; if (H.dueno < 0 || H.dueno === j || H.etapa < 1) continue;
      const noches = d6(S), coste = noches * tarifaDe(S, h);
      ev.push({ t: 'estancia', j, h, noches, coste });
      lg(S, `${p.nombre} se aloja ${noches} noche${noches > 1 ? 's' : ''} en ${HOTELES[h].nombre} (${eur(tarifaDe(S, h))}/noche): paga ${eur(coste)} a ${S.jug[H.dueno].nombre}.`);
      const r = pagar(S, ev, j, coste, H.dueno, 'estancia');
      if (r !== 'ok') { if (r === 'quiebra') finTurno(S, ev); return; }
      continue;
    }
    if (paso === 'casilla') {
      const t = TIPO[p.pos];
      if (t === 'C' && opcionesLote(S, j).length) { S.fase = 'compra'; return; }
      if (t === 'O' && titulos(S, j).length && opcionesObra(S, j).length) { S.fase = 'obras'; return; }
      if (t === 'E' && opcionesEntrada(S, j, true).length) { S.fase = 'entLibre'; return; }
      if (t === 'F' && opcionesFase(S, j).length) { S.fase = 'faseLibre'; return; }
      continue;
    }
  }
}

function mover(S, ev, j, d) {
  const p = S.jug[j], de = p.pos, cam = [de]; let pos = de, cruzoAyto = false, cobro = 0;
  const salario = !(S.inicial >= 3 && vivos(S) <= 2);
  const paso = () => {
    if (pos === LINEA_BANCO && salario) cobro += SALARIO;
    if (pos === LINEA_AYTO) cruzoAyto = true;
    pos = (pos + 1) % N; cam.push(pos);
  };
  for (let k = 0; k < d; k++) paso();
  while (pos !== 0 && S.jug.some((q, i) => i !== j && q.vivo && q.pos === pos)) paso();
  p.pos = pos;
  ev.push({ t: 'mover', j, de, a: pos, camino: cam });
  if (cobro) { p.dinero += cobro; ev.push({ t: 'cobra', j, cant: cobro }); lg(S, `${p.nombre} pasa por el Banco y cobra ${eur(cobro)}.`); }
  S.pasos = [];
  if (cruzoAyto) { S.pasos.push('ayto'); lg(S, `${p.nombre} pasa por el Ayuntamiento.`); }
  S.pasos.push('estancia', 'casilla');
}

// ---------- decisiones ----------
const err = msg => ({ ok: false, msg });
function empezarSub(S, ev, h) {
  const vend = S.deuda.j, pend = [];
  for (let k = 1; k < S.n; k++) { const q = (vend + k) % S.n; if (S.jug[q].vivo && S.jug[q].dinero >= PRECIO_MIN_PUJA) pend.push(q); }
  S.sub = { h, vend, pend, cur: 0, mejor: null };
  ev.push({ t: 'subasta', h, vend }); lg(S, `Subasta de ${HOTELES[h].nombre} (de ${S.jug[vend].nombre}).`);
  S.fase = 'subasta'; avanzarSub(S, ev);
}
function avanzarSub(S, ev) {
  const B = S.sub;
  for (;;) {
    if (!B.pend.length) return cerrarSub(S, ev);
    if (B.mejor && B.pend.length === 1 && B.pend[0] === B.mejor.j) return cerrarSub(S, ev);
    B.cur %= B.pend.length;
    const q = B.pend[B.cur];
    if (B.mejor && q === B.mejor.j) { B.cur = (B.cur + 1) % B.pend.length; continue; }
    const min = B.mejor ? B.mejor.cant + PRECIO_MIN_PUJA : PRECIO_MIN_PUJA;
    if (S.jug[q].dinero < min) { B.pend.splice(B.cur, 1); continue; }
    return;
  }
}
function cerrarSub(S, ev) {
  const B = S.sub, H = S.hot[B.h]; S.sub = null;
  if (B.mejor) {
    const b = S.jug[B.mejor.j], v = S.jug[B.vend];
    b.dinero -= B.mejor.cant; v.dinero += B.mejor.cant; H.dueno = B.mejor.j; H.desde = b.turnos;
    ev.push({ t: 'vendido', h: B.h, a: B.mejor.j, de: B.vend, cant: B.mejor.cant });
    lg(S, `${HOTELES[B.h].nombre} se adjudica a ${b.nombre} por ${eur(B.mejor.cant)}.`);
  } else {
    demoler(S, B.h); ev.push({ t: 'demolido', h: B.h });
    lg(S, `Nadie puja: ${HOTELES[B.h].nombre} se derriba y queda libre.`);
  }
  S.fase = 'deuda'; seguir(S, ev, liquidar(S, ev));
}

export function decidir(S, d) {
  const ev = [], f = S.fase;
  if (f === 'fin') return err('La partida ha terminado.');
  const j = actor(S), p = S.jug[j], L = legales(S);
  switch (d.t) {
    case 'tirar': {
      if (f !== 'tirar') return err('Ahora no toca tirar.');
      const v = d6(S); S.dado = v; ev.push({ t: 'dado', j, v }); lg(S, `${p.nombre} saca un ${v}.`);
      if (v === 6) S.seis = true;
      mover(S, ev, j, v); avanzar(S, ev); break;
    }
    case 'instalacion': {
      if (f !== 'tirar') return err('Las instalaciones se compran antes de tirar.');
      const o = L.inst.find(x => x.h === d.h); if (!o) return err('No puedes construir esa instalación.');
      p.dinero -= o.coste; S.hot[d.h].inst = true; ev.push({ t: 'inst', j, h: d.h, coste: o.coste });
      lg(S, `${p.nombre} construye la instalación de ocio de ${HOTELES[d.h].nombre} (${eur(o.coste)}).`); break;
    }
    case 'entrada': {
      if (f !== 'ayto' && f !== 'entLibre') return err('Ahora no puedes poner entradas.');
      const o = L.entradas.find(x => x.h === d.h && x.sq === d.sq); if (!o) return err('Entrada no permitida ahí.');
      p.dinero -= o.precio; S.hot[d.h].ents.push(o.sq); S.entDe[o.sq] = d.h;
      if (f === 'ayto') S.ayto[d.h] = true;
      ev.push({ t: 'entrada', j, h: d.h, sq: o.sq, precio: o.precio });
      lg(S, `${p.nombre} abre una entrada de ${HOTELES[d.h].nombre}${o.precio ? ' por ' + eur(o.precio) : ' gratis'}.`);
      if (f === 'entLibre' || !opcionesEntrada(S, j, false).length) avanzar(S, ev);
      break;
    }
    case 'saltar': {
      if (!['ayto', 'compra', 'obras', 'entLibre', 'faseLibre'].includes(f)) return err('No hay nada que saltar.');
      avanzar(S, ev); break;
    }
    case 'comprar': {
      if (f !== 'compra') return err('Ahora no puedes comprar.');
      const o = L.lotes.find(x => x.h === d.h); if (!o) return err('No puedes comprar ese terreno.');
      p.dinero -= o.precio; if (o.forzosa) S.jug[o.a].dinero += o.precio;
      S.hot[d.h].dueno = j; S.hot[d.h].desde = p.turnos; S.compro = true;
      ev.push({ t: 'compra', j, h: d.h, precio: o.precio, forzosa: o.forzosa, de: o.a });
      lg(S, o.forzosa ? `${p.nombre} compra obligatoriamente el terreno de ${HOTELES[d.h].nombre} a ${S.jug[o.a].nombre} por ${eur(o.precio)}.` : `${p.nombre} compra el terreno de ${HOTELES[d.h].nombre} por ${eur(o.precio)}.`);
      avanzar(S, ev); break;
    }
    case 'obras': {
      if (f !== 'obras') return err('Ahora no puedes pedir permiso de obras.');
      const coste = costePlan(S, j, d.plan); if (coste < 0) return err('Plan de obras no válido.');
      if (coste > p.dinero) return err('No tienes dinero para ese plan.');
      const cara = DADO_PERMISO[Math.floor(rnd(S) * 6)]; ev.push({ t: 'permiso', j, cara });
      if (cara === 'rojo') { lg(S, `Permiso DENEGADO a ${p.nombre}.`); avanzar(S, ev); break; }
      const pagoCoste = cara === 'H' ? 0 : cara === 'x2' ? coste * 2 : coste;
      for (const h of d.plan) { S.hot[h].etapa++; ev.push({ t: 'obra', j, h, etapa: S.hot[h].etapa }); }
      lg(S, `Permiso ${cara === 'H' ? 'GRATIS (H)' : cara === 'x2' ? 'a DOBLE precio' : 'concedido'}: ${p.nombre} construye ${d.plan.map(h => HOTELES[h].nombre).join(', ')} (${eur(pagoCoste)}).`);
      seguir(S, ev, pagar(S, ev, j, pagoCoste, -1, 'obras')); break;
    }
    case 'fase': {
      if (f !== 'faseLibre') return err('Ahora no hay fase libre.');
      if (!L.obras.find(x => x.h === d.h)) return err('No puedes construir ahí.');
      S.hot[d.h].etapa++; ev.push({ t: 'obra', j, h: d.h, etapa: S.hot[d.h].etapa });
      lg(S, `${p.nombre} construye gratis una fase de ${HOTELES[d.h].nombre}.`); avanzar(S, ev); break;
    }
    case 'vender': {
      if (f !== 'deuda') return err('No estás en deuda.');
      if (!L.vender.includes(d.h)) return err('Ese hotel no es tuyo.');
      empezarSub(S, ev, d.h); break;
    }
    case 'pujar': {
      if (f !== 'subasta') return err('No hay subasta.');
      const cant = Math.round(d.cant); if (!(cant >= L.min) || cant > L.max) return err('Puja no válida.');
      const B = S.sub; B.mejor = { j, cant }; B.cur = (B.cur + 1) % B.pend.length;
      ev.push({ t: 'puja', j, cant }); lg(S, `${p.nombre} puja ${eur(cant)}.`); avanzarSub(S, ev); break;
    }
    case 'retirar': {
      if (f !== 'subasta') return err('No hay subasta.');
      const B = S.sub; B.pend.splice(B.cur, 1); lg(S, `${p.nombre} se retira de la subasta.`); avanzarSub(S, ev); break;
    }
    default: return err('Decisión desconocida.');
  }
  return { ok: true, ev };
}

// ---------- CPU ----------
const RESERVA = [0, 300, 1000, 1600];
export function puntuaEntrada(S, j, sq) {
  let s = 0;
  for (let i = 0; i < S.n; i++) { if (i === j || !S.jug[i].vivo) continue; const dist = (sq - S.jug[i].pos + N) % N; if (dist >= 1 && dist <= 6) s += 1; else if (dist <= 12) s += 0.3; }
  return s;
}
export function cpuDecide(S) {
  const f = S.fase, j = actor(S), p = S.jug[j], L = legales(S), niv = p.nivel || 2, res = RESERVA[niv];
  if (f === 'tirar') {
    const o = L.inst.filter(x => p.dinero - x.coste >= res).sort((a, b) => tarifa(b.h, 1, true) / b.coste - tarifa(a.h, 1, true) / a.coste)[0];
    return o ? { t: 'instalacion', h: o.h } : { t: 'tirar' };
  }
  if (f === 'ayto' || f === 'entLibre') {
    const ops = L.entradas.filter(o => p.dinero - o.precio >= (f === 'entLibre' ? -1 : res * 0.6));
    if (!ops.length) return { t: 'saltar' };
    ops.sort((a, b) => (tarifaDe(S, b.h) - tarifaDe(S, a.h)) || (puntuaEntrada(S, j, b.sq) - puntuaEntrada(S, j, a.sq)));
    const mejorH = ops[0].h, de = ops.filter(o => o.h === mejorH).sort((a, b) => puntuaEntrada(S, j, b.sq) - puntuaEntrada(S, j, a.sq))[0];
    if (f === 'ayto' && niv === 1 && S.hot[de.h].ents.length >= 2) return { t: 'saltar' };
    return { t: 'entrada', h: de.h, sq: de.sq };
  }
  if (f === 'compra') {
    const ops = L.lotes.filter(o => p.dinero - o.precio >= res * 0.7);
    if (!ops.length) return { t: 'saltar' };
    const val = o => { const D = HOTELES[o.h]; const total = D.tierra + D.edif.reduce((a, e) => a + e.c, 0) + D.inst.c; return (D.inst.r / total) * (o.forzosa ? 1.4 : 1) + (S.hot[o.h].dueno >= 0 ? 0.02 : 0); };
    ops.sort((a, b) => val(b) - val(a)); return { t: 'comprar', h: ops[0].h };
  }
  if (f === 'obras' || f === 'faseLibre') {
    const ops = L.obras;
    if (f === 'faseLibre') {
      if (!ops.length) return { t: 'saltar' };
      ops.sort((a, b) => HOTELES[b.h].edif[b.etapa].c - HOTELES[a.h].edif[a.etapa].c); return { t: 'fase', h: ops[0].h };
    }
    const sc = ops.map(o => ({ ...o, g: (HOTELES[o.h].edif[o.etapa].r - (o.etapa ? HOTELES[o.h].edif[o.etapa - 1].r : 0)) / o.coste + (o.etapa === 0 ? 0.0004 : 0) })).sort((a, b) => b.g - a.g);
    const plan = []; let tot = 0; const cnt = {};
    for (const o of sc) {
      const h = o.h; let e = S.hot[h].etapa;
      while (e + (cnt[h] || 0) < nEdif(h)) {
        const c = HOTELES[h].edif[e + (cnt[h] || 0)].c;
        if (p.dinero - (tot + c) * 2 >= res * 0.5 && (plan.length === 0 || niv >= 3)) { plan.push(h); cnt[h] = (cnt[h] || 0) + 1; tot += c; } else break;
        if (niv < 3) break;
      }
      if (plan.length && niv < 3) break;
    }
    if (!plan.length) { const m = sc.find(o => o.coste <= p.dinero - res * 0.3 && niv === 1); if (m) return { t: 'obras', plan: [m.h] }; return { t: 'saltar' }; }
    return { t: 'obras', plan };
  }
  if (f === 'deuda') {
    const mine = L.vender.slice().sort((a, b) => invertido(S, a) - invertido(S, b));
    const need = S.deuda.cant; const ok = mine.find(h => invertido(S, h) * 0.8 >= need);
    return { t: 'vender', h: ok || mine[mine.length - 1] };
  }
  if (f === 'subasta') {
    const h = S.sub.h, f2 = [0, 0.7, 0.9, 1.05][niv];
    const valor = (invertido(S, h) || HOTELES[h].tierra) * f2 * (S.hot[h].etapa ? 0.75 : 0.9);
    const paso = Math.max(100, Math.round((valor * 0.08) / 50) * 50);
    const sig = Math.max(L.min, (S.sub.mejor ? S.sub.mejor.cant : 0) + paso);
    if (sig <= valor && sig <= p.dinero - res * 0.2) return { t: 'pujar', cant: sig };
    return { t: 'retirar' };
  }
  return { t: 'saltar' };
}

// ---------- persistencia ----------
export function validar(S) {
  return !!S && S.v === 2 && Array.isArray(S.jug) && S.jug.length >= 2 && S.hot && Array.isArray(S.entDe) && S.entDe.length === N
    && IDS_HOTEL.every(h => S.hot[h] && Array.isArray(S.hot[h].ents));
}
export const migrarV1 = () => null;
export function resumen(S) {
  if (!validar(S)) return '';
  if (S.fase === 'fin') return `Terminada · gana ${S.jug[S.ganador].nombre}`;
  return `Ronda ${S.ronda} · ${vivos(S)} jugadores`;
}
