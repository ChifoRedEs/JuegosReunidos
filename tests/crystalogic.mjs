// Pruebas de Crystalogic: node tests/crystalogic.mjs
import * as M from '../js/games/crystalogic/motor.js';
import { NIVELES } from '../js/games/crystalogic/niveles.js';
let fallos = 0;
const ok = (c, m) => { if (!c) { fallos++; console.error('✗', m); } };

// 50 niveles: 5 tramos × 10, válidos, con la solución guardada ganando y el par igual al mínimo del solucionador
for (const t of M.TRAMOS) {
  ok(NIVELES[t.id].length === 10, `tramo ${t.id} tiene 10 niveles`);
  NIVELES[t.id].forEach((L, i) => {
    const id = t.id + (i + 1), V = M.validar(L);
    ok(!!V, `${id} válido`); if (!V) return;
    const r = M.correr(L, L.sol); ok(r.ok, `${id}: su solución gana`);
    const S = M.resolver(L, { max: 600000 });
    ok(S.n >= 1 && S.completo, `${id}: el solucionador la encuentra (${S.n})`);
    ok(S.min === L.par, `${id}: par ${L.par} = mínimo ${S.min}`);
  });
}
// dificultad creciente en media (huecos + condiciones)
const dif = id => NIVELES[id].reduce((s, L) => s + L.sc.length + M.huecosC(L).length * 2, 0);
const d = M.TRAMOS.map(t => dif(t.id)); ok(d.every((x, i) => !i || x > d[i - 1]), 'la dificultad media crece por tramos: ' + d.join(' < '));

// reglas básicas con un nivel hecho a mano: 1 -r- 2 -g- 3, cristal en 2, portal en 3
const base = { n: [[0, 0], [1, 0], [2, 0]], e: [[0, 1, 'r', 0], [1, 2, 'g', 1]], l: [], c: [[1, 1]], t: [], s: 0, p: 2, sc: M.plantilla([['s', 2]]), f: [1, 1, 0], k: [] };
ok(M.correr(base, [0, 1]).ok, 'correr+deslizar gana');
ok(M.correr(base, [1, 0]).err === 'camino', 'sin camino verde desde 1');
ok(M.correr({ ...base, c: [[1, 1], [0, 1]], sc: base.sc }, [0, 1]).err === 'faltan', 'faltan cristales (en la salida solo se recoge al volver)');
ok(M.correr({ ...base, p: 1 }, [0, 1]).err === 'noportal', 'termina fuera del portal');
ok(M.correr({ ...base, e: [[0, 1, 'r', 0], [2, 1, 'g', 1]] }, [0, 1]).err === 'camino', 'un camino de un solo sentido no se recorre al revés');
// llegar al portal antes de tiempo no acaba el programa
const L3 = { ...base, c: [], p: 0, sc: M.plantilla([['s', 2]]), f: [2, 0, 0], e: [[0, 1, 'r', 0]] };
ok(M.correr(L3, [0, 0]).ok, 'ir y volver acaba en el portal');
// un hueco por llenar
ok(M.correr(base, [0, null]).err === 'hueco', 'hueco vacío');
// bucle infinito controlado
const Lb = { n: [[0, 0], [1, 0]], e: [[0, 1, 'r', 0]], l: [], c: [], t: [], s: 0, p: 1, sc: M.plantilla([['l', 1]]), f: [1, 0, 0], k: [-1] };
ok(M.correr(Lb, [0, -1]).err === 'bucle', 'bucle infinito detectado');
// cristales dobles: solo uno por visita
const Ld = { n: [[0, 0], [1, 0]], e: [[0, 1, 'r', 0]], l: [], c: [[1, 2]], t: [], s: 0, p: 1, sc: M.plantilla([['s', 3]]), f: [3, 0, 0], k: [] };
ok(M.correr(Ld, [0, 0, 0]).ok, 'dos cristales se recogen en dos visitas');
ok(M.correr({ ...Ld, sc: M.plantilla([['s', 1]]), f: [1, 0, 0] }, [0]).err === 'faltan', 'una visita no basta para dos cristales');
// condición de cristales
const Lc = { n: [[0, 0], [1, 0]], e: [[0, 1, 'r', 0]], l: [], c: [[1, 1]], t: [], s: 0, p: 0, sc: M.plantilla([['s', 1], ['i', 1, 1]]), f: [3, 0, 0], k: [1] };
ok(M.correr(Lc, [0, 1, 0, 0]).ok, 'condición «llevo 1» → sí');

// generador: determinista y siempre con solución
for (const t of M.TRAMOS) {
  const a = M.nuevoNivel(4242, t.id), b = M.nuevoNivel(4242, t.id);
  ok(a && JSON.stringify(a) === JSON.stringify(b), `generador determinista (${t.id})`);
  ok(a && M.correr(a, a.sol).ok && a.par === M.resolver(a).min, `aleatorio ${t.id} resoluble`);
}
// código para compartir
const L0 = NIVELES.n[3], cod = M.compartir(L0), L1 = M.leerCodigo(cod);
ok(L1 && JSON.stringify(L1.sc) === JSON.stringify(L0.sc) && L1.p === L0.p && JSON.stringify(L1.bl) === JSON.stringify(L0.bl), 'código ida y vuelta');
ok(M.leerCodigo('basura') === null && M.leerCodigo('') === null, 'código inválido rechazado');
// validación rechaza dos caminos del mismo color en un lugar
ok(M.validar({ ...base, e: [[0, 1, 'r', 0], [1, 2, 'r', 0]] }) === null, 'dos caminos del mismo color en un lugar no valen');
// pista
const P = M.pista(L0, L0.sc.map(() => null)); ok(P && P.hueco === 0 && !P.corregir, 'pista del primer hueco');
console.log(fallos ? `✗ ${fallos} fallos` : '✓ Crystalogic: todo correcto');
process.exit(fallos ? 1 : 0);
