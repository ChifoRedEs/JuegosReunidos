// Pruebas del motor de «Vuela Alto»: node tests/vuelaalto.mjs
import * as M from '../js/games/vuelaalto/motor.js';
let fallos = 0; const t = (n, c) => { if (!c) { fallos++; console.log('✗', n); } else console.log('✓', n); };
t('24 niveles con nombre', M.N_NIVELES === 24 && M.NOMBRES.length === 24);
t('distancias crecientes y largas', M.distanciaNivel(1) >= 700 && M.distanciaNivel(24) > M.distanciaNivel(1) * 3);
const a = new M.Mundo(M.crear({ ...M.CFG_DEF, nivel: 5 })), b = new M.Mundo(M.crear({ ...M.CFG_DEF, nivel: 5 }));
t('mundo repetible', JSON.stringify(a.obst) === JSON.stringify(b.obst) && a.obst.length > 30);
t('cfg inválida rechazada', M.cfgValida({ ...M.CFG_DEF, nivel: 99 }) === null && M.cfgValida(null) === null);
const S = M.crear(M.CFG_DEF); S.fase = 'jugar'; const m = new M.Mundo(S);
for (let i = 0; i < 100; i++) M.paso(S, m, false);
t('sin pulsar cae', S.vy > 0 && S.y > M.H / 2 - 30);
const S2 = M.crear(M.CFG_DEF); S2.fase = 'jugar'; const m2 = new M.Mundo(S2); const y0 = S2.y;
for (let i = 0; i < 40; i++) M.paso(S2, m2, true);
t('pulsando sube', S2.y < y0 && S2.vy < 0);
while (S.fase === 'jugar') M.paso(S, m);
t('termina al tocar el suelo', S.fase === 'fin' && S.motivo === 'suelo');
const v = M.validar(JSON.parse(JSON.stringify({ ...M.crear(M.CFG_DEF), fase: 'jugar' })));
t('validar acepta y pausa', v && v.fase === 'pausa');
t('validar rechaza basura', M.validar({ v: 1, modo: 'x' }) === null && M.validar({ ...M.crear(M.CFG_DEF), x: NaN }) === null && M.validar(null) === null);
// piloto automático: busca un camino con mirada hacia delante
const CH = 10, DEPTH = 9;
function plan(S, m, tg) {
  let best = null;
  const rec = (T, d, first, cost) => {
    if (d === DEPTH) { const c = cost + Math.abs(T.y - tg); if (!best || c < best.c) best = { c, first }; return; }
    for (const h of (d === 0 || T.vy < 0) ? [true, false] : [false, true]) {
      const U = { ...T, cogidas: [] }; let r = null; for (let i = 0; i < CH && !r; i++) r = M.fisica(U, m, h, M.DT);
      if (!r) rec(U, d + 1, d === 0 ? h : first, cost + Math.abs(U.y - tg) * .02);
    }
  };
  rec(S, 0, null, 0); return best ? best.first : null;
}
function vuela(cfg) {
  const S = M.crear(cfg), m = new M.Mundo(S); S.fase = 'jugar'; let n = 0, hold = false;
  while (S.fase === 'jugar' && n < 3e6) { if (n % CH === 0) { const tg = M.objetivo(S, m), p = plan(S, m, tg); hold = p === null ? S.y > tg : p; } M.paso(S, m, hold); n++; }
  return S;
}
const falla = [];
for (let n = 1; n <= 24; n++) { const r = vuela({ ...M.CFG_DEF, nivel: n }); if (r.fase !== 'meta') falla.push(n); else if (r.est < 1 || r.puntos <= 0) falla.push(n); }
t('los 24 niveles se pueden completar (Normal)' + (falla.length ? ' fallan ' + falla : ''), falla.length === 0);
const f2 = [];
for (const n of [1, 6, 12, 18, 24]) { const r = vuela({ ...M.CFG_DEF, nivel: n, dif: 'facil', afl: 'baja', ctl: 'suave' }); if (r.fase !== 'meta') f2.push(n); }
t('Fácil/Baja/Suave completable' + (f2.length ? ' fallan ' + f2 : ''), f2.length === 0);
const inf = vuela({ ...M.CFG_DEF, modo: 'infinito', nivel: 1 }); t('Infinito llega lejos (>1500 m)', M.metros(inf) > 1500);
console.log(fallos ? `${fallos} FALLOS` : 'Todo OK'); process.exit(fallos ? 1 : 0);
