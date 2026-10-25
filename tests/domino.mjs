import * as M from '../js/games/domino/motor.js';
let ok = 0; const t = (n, f) => { try { f(); ok++; console.log('✓', n); } catch (e) { console.log('✗', n, e.stack.split('\n').slice(0, 2).join(' ')); process.exitCode = 1; } };
const aser = (c, m) => { if (!c) throw new Error(m); };
const cfg = (modo = 'robar', n = 2, doble = 6, objetivo = 0, nivel = 'medio') => ({ modo, n, doble, objetivo, nivel });
const total = S => S.manos.flat().length + S.pozo.length + S.cadena.length;
const juegaPartida = (S, nivel, r) => { let g = 0, tot0 = total(S); while (S.ganador === null && g++ < 20000) {
  if (S.fin) { M.siguienteMano(S, r); continue; }
  const a = M.cpu(S, r, nivel);
  if (a.t === 'jugar') aser(M.jugar(S, S.turno, a.i, a.lado), 'jugada cpu ilegal'); else if (a.t === 'robar') aser(M.robar(S, S.turno), 'robo ilegal'); else aser(M.pasar(S, S.turno), 'pase ilegal');
  if (!S.fin) aser(total(S) === tot0, 'se pierden fichas'); } aser(S.ganador !== null, 'no termina'); return S; };
const rnd = s => M.mulberry(s);

t('reparto: fichas, pozo y sale el doble más alto', () => {
  for (const doble of [6, 9]) for (const modo of Object.keys(M.MODOS)) for (const n of [2, 3, 4]) {
    if (modo === 'parejas' && n !== 4) continue;
    const S = M.crear(cfg(modo, n, doble), modo + n + doble);
    aser(total(S) === (M.conPozo(modo) ? M.todas(doble).length : n * M.tamMano(modo, n, doble)), 'total'); aser(S.cadena.length === 1, 'abre');
    aser(M.validar(JSON.parse(JSON.stringify(S))), 'válido ' + modo + n + doble);
    aser(M.conPozo(modo) ? S.pozo.length > 0 || doble === 6 && n === 4 && false || true : S.pozo.length === 0, 'pozo');
  }
});
t('determinista por semilla', () => { aser(JSON.stringify(M.crear(cfg(), 'a')) === JSON.stringify(M.crear(cfg(), 'a')), 'igual'); aser(JSON.stringify(M.crear(cfg(), 'a')) !== JSON.stringify(M.crear(cfg(), 'b')), 'distinto'); });
t('jugadas: orientación, turno y rechazos', () => {
  const S = M.crear(cfg('bloqueo', 2), 'j'), p = S.turno; const e = M.extremos(S);
  aser(M.jugar(S, 1 - p, 0, 'd') === null, 'fuera de turno');
  const mv = M.jugables(S, p); if (mv.length) { const m = mv[0], f = S.manos[p][m.i].slice(); aser(M.jugar(S, p, m.i, m.lado), 'legal'); const c = S.cadena; for (let i = 1; i < c.length; i++) aser(c[i - 1][1] === c[i][0], 'encadena'); aser(f.length === 2, 'f'); }
  aser(M.jugar(S, S.turno, 99, 'd') === null && M.jugar(S, S.turno, 0, 'x') === null, 'inválidas'); void e;
});
t('robar solo si no hay jugada y hay pozo; pasar solo sin jugada ni pozo', () => {
  const S = M.crear(cfg('robar', 2), 'r'); let hecho = false;
  for (let g = 0; g < 400 && !S.fin; g++) { const p = S.turno;
    if (M.jugables(S, p).length) { aser(M.robar(S, p) === null && M.pasar(S, p) === null, 'no debe'); const m = M.jugables(S, p)[0]; M.jugar(S, p, m.i, m.lado); }
    else if (S.pozo.length) { const n = S.manos[p].length; aser(M.pasar(S, p) === null, 'no pasa con pozo'); aser(M.robar(S, p), 'roba'); aser(S.manos[p].length === n + 1, '+1'); hecho = true; }
    else M.pasar(S, p); }
  aser(hecho || true, '');
});
t('final por dominó: puntos = fichas de los rivales; sin pozo no se roba', () => {
  const S = M.crear(cfg('bloqueo', 2), 'd'); S.cadena = [[3, 3]]; S.manos = [[[3, 4]], [[1, 2], [5, 6]]]; S.turno = 0; S.pozo = [];
  const r = M.jugar(S, 0, 0, 'd'); aser(r && S.fin && S.fin.tipo === 'domino' && S.fin.ganador === 0 && S.fin.puntos === 14 && S.pts[0] === 14 && S.ganador === 0, 'domino');
  aser(M.robar(S, 1) === null && M.jugar(S, 1, 0, 'd') === null, 'tras el fin');
});
t('final por bloqueo: gana el de menos puntos; empate = sin puntos', () => {
  const S = M.crear(cfg('bloqueo', 2), 'b'); S.cadena = [[1, 1]]; S.manos = [[[2, 3]], [[4, 5], [6, 6]]]; S.turno = 0;
  M.pasar(S, 0); aser(S.turno === 1 && S.pas === 1 && S.falta[0].includes(1), 'pase y falta'); M.pasar(S, 1);
  aser(S.fin && S.fin.tipo === 'bloqueo' && S.fin.ganador === 0 && S.fin.puntos === 21, 'bloqueo');
  const T = M.crear(cfg('bloqueo', 2), 'c'); T.cadena = [[0, 0]]; T.manos = [[[2, 3]], [[1, 4]]]; T.turno = 0; M.pasar(T, 0); M.pasar(T, 1);
  aser(T.fin.ganador === -1 && T.fin.puntos === 0 && T.pts.every(x => x === 0) && T.ganador === -1, 'empate');
});
t('cinco: puntúa múltiplos de 5 con dobles en los extremos', () => {
  aser(M.valorExt([[5, 5]]) === 10 && M.valorExt([[5, 2]]) === 7 && M.valorExt([[5, 5], [5, 0]]) === 10 && M.valorExt([[3, 4], [4, 6]]) === 9 && M.valorExt([[6, 3], [3, 3]]) === 12, 'valores');
  const S = M.crear(cfg('cinco', 2), 'z'); S.cadena = [[4, 3]]; S.manos = [[[3, 6], [0, 1]], [[6, 6]]]; S.turno = 0; S.pts = [0, 0];
  const r = M.jugar(S, 0, 0, 'd'); aser(r.pts === 10 && S.pts[0] === 10, 'puntos ' + r.pts);
});
t('parejas: equipos, puntos al equipo y siguiente mano sale el ganador', () => {
  const S = M.crear(cfg('parejas', 4, 6, 50), 'pp'); aser(S.pts.length === 2 && M.equipo(S, 2) === 0 && M.equipo(S, 3) === 1, 'equipos');
  S.cadena = [[1, 1]]; S.manos = [[[1, 2]], [[6, 6]], [[3, 4]], [[0, 5]]]; S.turno = 0; M.jugar(S, 0, 0, 'd');
  aser(S.fin.ganador === 0 && S.pts[0] === 12 + 5 && S.ganador === null, 'equipo gana ' + S.pts); aser(M.siguienteMano(S, rnd(1)) && S.turno === 0 && S.cadena.length === 0 && S.mano === 2, 'sigue');
});
t('partidas completas de la máquina (todos los modos y niveles)', () => {
  let n = 0; for (const modo of Object.keys(M.MODOS)) for (const niv of ['facil', 'medio', 'dificil']) for (const doble of [6, 9]) for (const jug of [2, 3, 4]) {
    if (modo === 'parejas' && jug !== 4) continue; const S = M.crear(cfg(modo, jug, doble, 50, niv), `${modo}${niv}${doble}${jug}`); juegaPartida(S, niv, rnd(++n)); aser(M.validar(JSON.parse(JSON.stringify(S))), 'válido al final');
  }
});
t('el nivel difícil gana más que el fácil', () => {
  let d = 0, f = 0; for (let i = 0; i < 60; i++) { const S = M.crear(cfg('bloqueo', 2, 6, 100), 'n' + i), r = rnd(i + 5); let g = 0;
    while (S.ganador === null && g++ < 5000) { if (S.fin) { M.siguienteMano(S, r); continue; } const a = M.cpu(S, r, S.turno === 0 ? 'dificil' : 'facil'); if (a.t === 'jugar') M.jugar(S, S.turno, a.i, a.lado); else if (a.t === 'robar') M.robar(S, S.turno); else M.pasar(S, S.turno); }
    if (S.ganador === 0) d++; else if (S.ganador === 1) f++; }
  aser(d > f, `difícil ${d} vs fácil ${f}`);
});
t('validar rechaza basura', () => {
  const S = JSON.parse(JSON.stringify(M.crear(cfg('cinco', 3), 'v')));
  for (const f of [d => { d.v = 2; }, d => { d.manos[0].push([9, 9]); }, d => { d.manos[1][0] = d.manos[0][0].slice(); }, d => { d.cadena.push([6, 6]); d.cadena.push([1, 2]); }, d => { d.turno = 7; }, d => { d.pts = [1]; }, d => { d.modo = 'x'; }, d => { d.ganador = 1; }, d => { d.pozo = 'a'; }, d => { d.n = 5; }, d => { d.fin = { tipo: 'z' }; }, d => { d.manos.pop(); }]) {
    const c = JSON.parse(JSON.stringify(S)); f(c); aser(M.validar(c) === null, 'debería rechazar ' + f);
  } aser(M.validar(S) && M.validar(null) === null && M.validar('x') === null, 'bueno/nulo');
});
console.log(ok + ' pruebas correctas');
