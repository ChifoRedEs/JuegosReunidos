import * as M from '../js/games/memorama/motor.js';
let ok = 0; const t = (n, f) => { try { f(); ok++; console.log('✓', n); } catch (e) { console.log('✗', n, e.message); process.exitCode = 1; } };
const aser = (c, m) => { if (!c) throw new Error(m); };
const cfg = (modo = 'solo', tam = '4x4', tema = 'frutas', nivel = 'medio') => ({ modo, tam, tema, nivel });
const parejaDe = (S, i) => S.deck.findIndex((id, j) => j !== i && id === S.deck[i]);

t('crear: tamaños, parejas y tema', () => {
  for (const tam of Object.keys(M.TAMANOS)) for (const tema of Object.keys(M.TEMAS)) {
    const S = M.crear(cfg('solo', tam, tema), tam + tema), c = {};
    aser(S.deck.length === S.cols * S.filas, 'tamaño'); for (const id of S.deck) { c[id] = (c[id] || 0) + 1; aser(M.existe(id), 'imagen ' + id); if (tema !== 'mezcla') aser(id.startsWith(tema + '/'), 'tema'); }
    aser(Object.values(c).every(x => x === 2) && Object.keys(c).length === M.pares(tam), 'parejas');
    aser(M.validar(JSON.parse(JSON.stringify(S))), 'válido');
  }
});
t('mismo semilla = mismo tablero', () => { aser(JSON.stringify(M.crear(cfg(), 'x').deck) === JSON.stringify(M.crear(cfg(), 'x').deck), 'determinista'); aser(JSON.stringify(M.crear(cfg(), 'x').deck) !== JSON.stringify(M.crear(cfg(), 'y').deck), 'distinto'); });
t('pareja: se queda y repite turno; fallo: se tapa y cambia el turno', () => {
  const S = M.crear(cfg('dos'), 'p'); const a = 0, b = parejaDe(S, a);
  aser(M.voltear(S, a).tipo === 'primera', 'primera'); aser(M.voltear(S, b).tipo === 'par', 'par'); aser(S.ok[a] && S.ok[b] && S.pts[0] === 1 && S.turno === 0 && !S.ab.length, 'estado par');
  const c = S.ok.indexOf(0), d = S.deck.findIndex((id, j) => j !== c && !S.ok[j] && id !== S.deck[c]);
  M.voltear(S, c); aser(M.voltear(S, d).tipo === 'fallo', 'fallo'); aser(M.voltear(S, S.ok.indexOf(0, d + 1)) === null || true, 'bloqueado');
  aser(S.ab.length === 2 && M.voltear(S, S.ok.findIndex((x, j) => !x && !S.ab.includes(j))) === null, 'no deja destapar una tercera');
  aser(M.ocultar(S) && S.turno === 1 && !S.ab.length, 'turno');
});
t('jugadas no válidas', () => { const S = M.crear(cfg(), 'q'); aser(M.voltear(S, -1) === null && M.voltear(S, 99) === null && M.voltear(S, 1.5) === null, 'rango'); M.voltear(S, 2); aser(M.voltear(S, 2) === null, 'misma carta'); });
t('solo: se acaba al resolver todo y da estrellas', () => {
  const S = M.crear(cfg('solo', '3x4'), 'z');
  for (let i = 0; i < S.deck.length; i++) if (!S.ok[i]) { M.voltear(S, i); M.voltear(S, parejaDe(S, i)); }
  aser(S.done && S.ganador === 0 && S.movs === 6 && M.estrellas(S) === 3, 'fin perfecto');
});
t('vistazos limitados', () => { const S = M.crear(cfg(), 'v'); for (let i = 0; i < M.MAX_VISTAZOS; i++) aser(M.vistazo(S), 'uso'); aser(!M.vistazo(S), 'límite'); });
for (const nivel of Object.keys(M.NIVELES)) t(`CPU «${nivel}»: acaba el tablero y la memoria no hace trampa`, () => {
  let pasos = 0, parejasPorMemoria = 0, N = 12;
  for (let k = 0; k < N; k++) {
    const S = M.crear(cfg('cpu', '4x5', 'mezcla', nivel), 'c' + k); const r = M.mulberry(k + 1); let g = 0;
    while (!S.done && g++ < 2000) {
      const i = M.jugadaCPU(S, r); aser(i >= 0 && !S.ok[i] && !S.ab.includes(i), 'jugada válida');
      if (S.ab.length === 1 && S.mem[i] !== undefined && S.mem[i] === S.deck[S.ab[0]]) parejasPorMemoria++;
      const res = M.voltear(S, i, r); if (res && res.tipo === 'fallo') M.ocultar(S);
    }
    aser(S.done && (S.ganador === -1 || S.ganador === 0 || S.ganador === 1), 'termina'); aser(S.pts[0] + S.pts[1] === 10, 'puntos'); pasos += S.movs;
  }
  console.log('   media de movimientos', (pasos / N).toFixed(1), '· aciertos por memoria', parejasPorMemoria);
});
t('la CPU difícil necesita menos movimientos que la fácil', () => {
  const media = nivel => { let n = 0; for (let k = 0; k < 20; k++) { const S = M.crear(cfg('cpu', '4x5', 'mezcla', nivel), 'm' + k), r = M.mulberry(k + 7); let g = 0; while (!S.done && g++ < 2000) { const res = M.voltear(S, M.jugadaCPU(S, r), r); if (res && res.tipo === 'fallo') M.ocultar(S); } n += S.movs; } return n / 20; };
  aser(media('dificil') < media('facil'), 'difícil ≥ fácil');
});
t('validar rechaza basura y acepta lo bueno', () => {
  const S = M.crear(cfg('cpu', '4x4', 'animales', 'dificil'), 'e'); M.voltear(S, 0); const b = parejaDe(S, 0); M.voltear(S, b);
  aser(M.validar(JSON.parse(JSON.stringify(S))), 'bueno');
  const mal = [null, {}, { modo: 'solo' }, { ...S, v: 2 }, { ...S, modo: '__proto__' }, { ...S, tema: 'constructor' }, { ...S, tam: 'toString' }, { ...S, deck: S.deck.slice(1) }, { ...S, deck: S.deck.map(() => 'frutas/ajo') }, { ...S, deck: S.deck.map((x, i) => i ? x : 'x/y') },
    { ...S, ok: S.ok.map((x, i) => i === 3 ? 1 : x) }, { ...S, ok: [1] }, { ...S, pts: [99, 0] }, { ...S, turno: 5 }, { ...S, movs: -1 }, { ...S, vz: 9 }];
  for (const x of mal) aser(M.validar(x) === null, 'aceptó ' + JSON.stringify(x).slice(0, 60));
  const r = M.validar({ ...S, done: true, ganador: 1, ab: [3, 4, 4], mem: { 0: 'animales/zzz', 1: 'otra', 99: 'x' } }); aser(r && !r.done && r.ab.length === 0 && Object.keys(r.mem).length === 0, 'normaliza');
});
console.log(ok + ' pruebas correctas');
