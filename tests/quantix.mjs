// Pruebas del motor de «Quantix»: node tests/quantix.mjs
import * as M from '../js/games/quantix/motor.js';
let fallos = 0; const t = (n, c) => { if (!c) { fallos++; console.log('✗', n); } else console.log('✓', n); };
t('12 niveles', M.N_NIVELES === 12 && M.NIVELES.every(n => n.j.length >= 1 && n.obj >= 60));
t('cfg inválida rechazada', M.cfgValida({ ...M.CFG_DEF, nivel: 99 }) === null && M.cfgValida({ ...M.CFG_DEF, vidas: 4 }) === null && M.cfgValida(null) === null);
const S0 = M.crear({ ...M.CFG_DEF, nivel: 12 }, 7); S0.fase = 'jugar';
t('jefes en zona libre', S0.jefes.length === 3 && S0.jefes.every(b => !S0.g[Math.floor(b.y) * M.COLS + Math.floor(b.x)]));
t('empieza en 0 %', M.pct(S0) === 0);
t('sin anclaje en medio', M.anclaje(S0, 18, 24) === null && M.anclaje(S0, 2, 24) && M.anclaje(S0, 2, 24).x === 1);
// un jefe dentro del rectángulo que crece resta una vida
const A = M.crear({ ...M.CFG_DEF, nivel: 1 }, 3); A.fase = 'jugar'; const b = A.jefes[0]; b.x = 10.5; b.y = 10.5; b.vx = 0; b.vy = 0; A.jefes[0].v = 0;
t('arranca rect', M.empezarRect(A, 1, 1)); M.apuntar(A, 20, 20); let ev = []; for (let i = 0; i < 400 && !ev.includes('golpe'); i++) ev = M.paso(A);
t('el jefe en el cuadrado quita vida', ev.includes('golpe') && A.vidas === A.vidas0 - 1 && A.rect === null);
// reclamar un cuadrado lejos del jefe
const B = M.crear({ ...M.CFG_DEF, nivel: 1 }, 3); B.fase = 'jugar'; B.jefes[0].x = 30.5; B.jefes[0].y = 40.5; B.jefes[0].v = 0;
M.empezarRect(B, 1, 1); M.apuntar(B, 10, 10); while (!M.completo(B)) M.paso(B); const r = M.soltar(B);
t('reclama 10×10', r && r.celdas === 100 && Math.abs(M.pct(B) - 100 / M.INTERIOR * 100) < .01);
// una franja que parte el tablero deja sin jefe una parte: se descubre sola
const C = M.crear({ ...M.CFG_DEF, nivel: 1 }, 3); C.fase = 'jugar'; C.jefes[0].x = 5.5; C.jefes[0].y = 5.5; C.jefes[0].v = 0;
M.empezarRect(C, 1, 20); M.apuntar(C, 34, 22); while (!M.completo(C)) M.paso(C); const rc = M.soltar(C);
t('la zona sin jefe se descubre', rc && rc.celdas > 34 * 3 + 100);
// guardado
const s1 = JSON.parse(JSON.stringify(M.serializar(B))), v = M.validar(s1);
t('serializar/validar', v && v.g.every((x, i) => x === B.g[i]) && v.nivel === 1);
t('validar rechaza basura', M.validar({ ...s1, g: ['x'] }) === null && M.validar(null) === null && M.validar({ ...s1, ia: 'x' }) === null);
// piloto automático con mirada hacia delante (simula cada candidato con el mismo azar)
function intento(S, ax, ay, tx, ty) { const C = M.clonar(S); if (!M.empezarRect(C, ax, ay)) return null; M.apuntar(C, tx, ty); let n = 0; while (!M.completo(C) && n++ < 5000) { if (M.paso(C).includes('golpe')) return null; } const r = M.soltar(C); return r ? { C, celdas: r.celdas } : null; }
function juega(cfg, seed) {
  const S = M.crear(cfg, seed); S.fase = 'jugar'; let dec = 0, rr = 12345;
  const az = () => { rr = (rr * 1664525 + 1013904223) >>> 0; return rr / 4294967296; };
  while (S.fase === 'jugar' && dec < 400) {
    dec++;
    // pasan unos instantes para que los jefes se muevan
    let mej = null;
    for (let k = 0; k < 70; k++) {
      const ax = 1 + Math.floor(az() * (M.COLS - 2)), ay = 1 + Math.floor(az() * (M.ROWS - 2)), a = M.anclaje(S, ax, ay); if (!a) continue;
      const tx = a.x + (az() < .5 ? -1 : 1) * (2 + Math.floor(az() * 24)), ty = a.y + (az() < .5 ? -1 : 1) * (2 + Math.floor(az() * 32));
      const r = intento(S, a.x, a.y, tx, ty); if (r && (!mej || r.celdas > mej.celdas)) mej = { ...r, a, tx, ty };
    }
    if (mej) { M.empezarRect(S, mej.a.x, mej.a.y); M.apuntar(S, mej.tx, mej.ty); let n = 0; while (!M.completo(S) && n++ < 5000) M.paso(S); M.soltar(S); if (M.pct(S) >= S.obj) S.fase = 'meta'; }
    for (let i = 0; i < 20; i++) M.paso(S);
  }
  return S;
}
const mal = [];
for (let n = 1; n <= 12; n++) { const S = juega({ ...M.CFG_DEF, nivel: n, ia: 'maestro', vidas: 3 }, 100 + n); if (S.fase !== 'meta') mal.push(n + ':' + Math.round(M.pct(S)) + '%'); }
t('los 12 niveles se superan con IA Maestro' + (mal.length ? ' fallan ' + mal : ''), mal.length === 0);
console.log(fallos ? `${fallos} FALLOS` : 'Todo OK'); process.exit(fallos ? 1 : 0);
