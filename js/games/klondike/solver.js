// Analizador de Klondike: busca (con las cartas ocultas que conoce el programa) si desde la posición actual
// existe alguna forma de ganar. Devuelve 'ganable' (hay solución), 'cerrado' (se agotó la búsqueda: no hay) o 'incierto' (se acabó el tiempo).
import * as K from './motor.js';
import { paloDe, rangoDe, esRoja } from '../../core/cartas.js';

const clon = S => ({ tab: S.tab.map(c => ({ d: c.d.slice(), u: c.u.slice() })), fund: S.fund.map(f => f.slice()), stock: S.stock.slice(), waste: S.waste.slice(), robar: S.robar, mov: 0, extra: S.extra });
const clave = S => { const cs = []; for (let i = 1; i < 8; i++) cs.push(S.tab[i].d.length + ':' + S.tab[i].u.join('.')); cs.sort(); return S.tab[0].u.join('.') + '|' + cs.join('|') + '#' + S.fund.map(f => f.length).join('') + '#' + S.stock.join('.') + '#' + S.waste.join('.'); };
function seguro(S, id) {                       // subir a la base sin perder nada: ninguna carta de color opuesto del rango anterior lo necesita
  const r = rangoDe(id); if (r <= 1) return true;
  const [a, b] = esRoja(id) ? [0, 3] : [1, 2];
  return S.fund[a].length >= r && S.fund[b].length >= r;
}
function movimientosSeguros(S) {
  for (let hecho = true; hecho;) {
    hecho = false;
    const orig = [{ t: 'waste' }, ...S.tab.map((c, col) => ({ t: 'tab', col, idx: c.u.length - 1 }))];
    for (const o of orig) {
      if (o.t === 'waste' ? !S.waste.length : o.idx < 0) continue;
      if (K.puede(S, o, { t: 'fund' }) && seguro(S, K.cartaDe(S, o))) { K.mover(S, o, { t: 'fund' }); hecho = true; }
    }
  }
}
function candidatos(S) {
  const c = [], orig = [];
  if (S.waste.length) orig.push({ t: 'waste' });
  S.tab.forEach((col, i) => col.u.forEach((_, idx) => orig.push({ t: 'tab', col: i, idx })));
  for (const o of orig) {
    if (K.puede(S, o, { t: 'fund' })) c.push({ o, a: { t: 'fund' }, p: 90 });
    for (let col = S.extra ? 0 : 1; col < 8; col++) {
      if (!K.puede(S, o, { t: 'tab', col })) continue;
      const vacia = !S.tab[col].u.length;
      let p = o.t === 'waste' ? 70 : 40;
      if (o.t === 'tab') {
        const orig = S.tab[o.col];
        if (o.idx === 0 && orig.d.length) p = 85;
        else if (o.idx === 0 && vacia) continue;                       // mover un bloque entero a un hueco vacío no cambia nada
        else if (o.idx === 0) p = col === 0 ? 30 : 60;
        else if (col === 0) p = 25;
      } else if (col === 0) p = 20;
      c.push({ o, a: { t: 'tab', col }, p });
    }
  }
  for (let p = 0; p < 4; p++) { const f = S.fund[p]; if (f.length > 2) { const o = { t: 'fund', p }; for (let col = S.extra ? 0 : 1; col < 8; col++) if (K.puede(S, o, { t: 'tab', col }) && S.tab[col].u.length) c.push({ o, a: { t: 'tab', col }, p: 10 }); } }
  c.sort((x, y) => y.p - x.p);
  return c;
}
export function resolver(S0, { ms = 2500, maxVistos = 1500000 } = {}) {
  const t0 = performance.now(), visto = new Set(); let nodos = 0, abortar = false, ok = false;
  const entrar = S => {                          // 'win' | null (ya visto) | marco de búsqueda
    movimientosSeguros(S);
    if (K.gana(S)) return 'win';
    const k = clave(S); if (visto.has(k)) return null; visto.add(k);
    return { S, c: candidatos(S), i: 0, robo: false };
  };
  const pila = [], e0 = entrar(clon(S0));        // búsqueda en profundidad iterativa (sin límite de recursión)
  if (e0 === 'win') ok = true; else if (e0) pila.push(e0);
  while (!ok && pila.length) {
    if ((++nodos & 127) === 0 && (performance.now() - t0 > ms || visto.size > maxVistos)) { abortar = true; break; }
    const f = pila[pila.length - 1]; let hijo = null;
    if (f.i < f.c.length) { const m = f.c[f.i++]; hijo = clon(f.S); K.mover(hijo, m.o, m.a); }
    else if (!f.robo) { f.robo = true; if (f.S.stock.length || f.S.waste.length) { const T = clon(f.S); if (K.robarStock(T)) hijo = T; } }
    if (!hijo) { if (f.i >= f.c.length && f.robo) pila.pop(); continue; }
    const e = entrar(hijo); if (e === 'win') { ok = true; break; } if (e) pila.push(e);
  }
  return { r: ok ? 'ganable' : abortar ? 'incierto' : 'cerrado', nodos, ms: Math.round(performance.now() - t0) };
}
