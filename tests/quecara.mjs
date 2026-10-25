// Pruebas de «¿Qué cara tienes?»: caras, preguntas, reglas y CPU. Uso: node tests/quecara.mjs
import * as M from '../js/games/quecara/motor.js';
import { CARAS_DEFECTO } from '../js/games/quecara/defecto.js';
import { caraValida, svgDe, generarCaras, generarSimple, crearRng } from '../js/games/quecara/avatar.js';
import { PREGUNTAS, vectorDe, responde, disponibles } from '../js/games/quecara/preguntas.js';
let ok = 0; const t = (n, f) => { try { f(); ok++; console.log('✓', n); } catch (e) { console.log('✗', n, e.message); process.exitCode = 1; } };
const aser = (c, m) => { if (!c) throw new Error(m); };
const rng = s => crearRng(s);
const dist = (a, b) => { const x = vectorDe(a), y = vectorDe(b); let d = 0; for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) d++; return d; };

t('las 30 caras por defecto son válidas, con nombre único y se distinguen por ≥ 2 preguntas', () => {
  aser(CARAS_DEFECTO.length === 30, 'no son 30');
  aser(new Set(CARAS_DEFECTO.map(f => f.nm)).size === 30, 'nombres repetidos');
  for (const f of CARAS_DEFECTO) aser(caraValida(f), 'inválida ' + f.nm);
  for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) aser(dist(CARAS_DEFECTO[i], CARAS_DEFECTO[j]) >= 2, `${CARAS_DEFECTO[i].nm} y ${CARAS_DEFECTO[j].nm} casi iguales`);
  const h = CARAS_DEFECTO.filter(f => f.sx === 'h').length; aser(h >= 14 && h <= 16, 'reparto de sexos ' + h);
});
t('todas las preguntas útiles en el tablero por defecto (48 de 48 como mucho 1 sin usar)', () => { aser(disponibles(CARAS_DEFECTO).length >= 44, 'pocas preguntas ' + disponibles(CARAS_DEFECTO).length); });
t('cada cara dibuja un SVG con ids únicos', () => {
  const a = svgDe(CARAS_DEFECTO[0]), b = svgDe(CARAS_DEFECTO[0]); aser(a.startsWith('<svg') && a.endsWith('</svg>'), 'svg');
  const ids = s => [...s.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  aser(ids(a).length > 0 && !ids(a).some(i => ids(b).includes(i)), 'ids repetidos entre caras');
  aser(!svgDe(CARAS_DEFECTO[0]).includes('$fillColor'), 'color sin sustituir');
});
t('generador aleatorio: caras válidas, distintas y repetibles', () => {
  for (const n of [12, 20, 24, 30]) {
    const c = generarCaras(n, 100 + n, vectorDe) || generarSimple(n, 100 + n); aser(c.length === n, 'cantidad');
    for (const f of c) aser(caraValida(f), 'inválida');
    aser(new Set(c.map(f => f.nm)).size === n, 'nombres');
  }
  aser(JSON.stringify(generarCaras(30, 5, vectorDe)) === JSON.stringify(generarCaras(30, 5, vectorDe)), 'no repetible');
  for (let s = 1; s <= 25; s++) { const c = generarSimple(12, s); for (const f of c) aser(caraValida(f), 'simple inválida'); }
});
t('caraValida rechaza basura', () => {
  const f = CARAS_DEFECTO[0];
  for (const x of [null, 3, {}, { ...f, sx: 'x' }, { ...f, pe: '__proto__' }, { ...f, pi: 9 }, { ...f, oc: 'rojo' }, { ...f, pc: 'verde' }, { ...f, nm: '' }, { ...f, ro: 'constructor' }]) aser(caraValida(x) === null, 'acepta ' + JSON.stringify(x).slice(0, 50));
});
t('las preguntas responden coherentemente', () => {
  const g = { ...CARAS_DEFECTO.find(f => f.sx === 'h'), ga: 'sun', bd: 'full', pe: 'cap', pc: 'rojo', oc: 'azul', pk: 1, pi: 4 };
  const si = ['chico', 'gafas', 'gafas-sol', 'barba', 'bigote', 'sombrero', 'gorra', 'ojos-azul', 'pecas', 'piel-oscura'], no = ['chica', 'perilla', 'gafas-redondas', 'copa', 'ojos-verde', 'pelo-rojo', 'pelo-negro', 'calvo'];
  for (const id of si) aser(responde(g, id), id + ' debería ser sí');
  for (const id of no) aser(!responde(g, id), id + ' debería ser no');
  aser(!responde(g, 'inexistente'), 'pregunta desconocida');
  aser(!responde({ ...g, pe: 'brim', pc: 'negro' }, 'pelo-negro'), 'el sombrero tapa el pelo');
});

const jugar = (cfg, sem = 1) => { const r = rng(sem); const S = M.crear(cfg, r); return { S, r }; };
t('crear: 30 / 24 / 12 caras, tableros barajados y sin repetir', () => {
  for (const n of [12, 20, 24, 30]) for (const conjunto of ['clasicas', 'azar']) {
    const { S } = jugar({ ...M.CFG_DEF, n, conjunto }, n); aser(S.caras.length === n && new Set(S.caras.map(f => f.nm)).size === n, `${n} ${conjunto}`);
    aser(M.validar(JSON.parse(JSON.stringify(S))), 'no valida');
  }
});
t('contra CPU: elegir, preguntar, tumbar, terminar y ganar acertando', () => {
  const { S, r } = jugar({ ...M.CFG_DEF, empieza: 'j1' }, 3);
  aser(S.fase === 'elegir' && M.elegirSecreto(S, 0, 4, r) && S.fase === 'turno' && S.turno === 0, 'inicio');
  aser(M.terminar(S, 0) === false, 'no se puede terminar sin preguntar');
  const objetivo = S.caras[S.secreto[1]], res = M.preguntar(S, 0, 'chico'); aser(res === (objetivo.sx === 'h'), 'respuesta');
  aser(M.preguntar(S, 0, 'chica') === null, 'una pregunta por turno');
  aser(M.arriesgar(S, 0, 0) === null, 'no se arriesga tras preguntar');
  const k = M.tumbarSegunUltima(S, 0); aser(k > 0 && S.tumba[0].every((t, i) => !t || (S.caras[i].sx === 'h') !== res), 'tumbar');
  aser(S.tumba[0][S.secreto[1]] === 0, 'no tumba la correcta');
  aser(M.terminar(S, 0) && S.turno === 1 && S.fase === 'turno', 'pasa a la CPU');
  const c = M.turnoCpu(S, r); aser(c && S.turno === 0 && !S.pregunto, 'CPU juega y vuelve el turno');
  const g = M.arriesgar(S, 0, S.secreto[1]); aser(g && g.ok && S.fase === 'fin' && S.ganador === 0, 'gana');
});
t('arriesgar mal: pierde la partida o el turno según la regla', () => {
  let { S, r } = jugar({ ...M.CFG_DEF, empieza: 'j1', fallo: 'pierde' }, 4); M.elegirSecreto(S, 0, 0, r);
  const mal = (S.secreto[1] + 1) % S.n; const x = M.arriesgar(S, 0, mal); aser(!x.ok && S.fase === 'fin' && S.ganador === 1, 'pierde la partida');
  ({ S, r } = jugar({ ...M.CFG_DEF, empieza: 'j1', fallo: 'turno' }, 4)); M.elegirSecreto(S, 0, 0, r);
  const y = M.arriesgar(S, 0, (S.secreto[1] + 1) % S.n); aser(!y.ok && S.fase === 'turno' && S.turno === 1 && S.tumba[0][(S.secreto[1] + 1) % S.n] === 1, 'pierde el turno');
});
t('2 jugadores: pantallas de paso, secretos privados y turnos', () => {
  const { S } = jugar({ ...M.CFG_DEF, modo: 'dos', empieza: 'j2' }, 8);
  aser(S.fase === 'elegir' && S.turno === 0 && M.elegirSecreto(S, 0, 1) && S.fase === 'paso' && S.turno === 1 && S.sig === 'elegir', 'j1 elige');
  aser(M.elegirSecreto(S, 1, 2) === false, 'no se elige antes de continuar'); aser(M.continuar(S) && S.fase === 'elegir', 'continuar');
  aser(M.elegirSecreto(S, 1, 2) && S.fase === 'paso' && S.sig === 'turno' && S.turno === 1, 'j2 elige y empieza el 2');
  aser(M.continuar(S) && S.fase === 'turno', 'arranca');
  aser(M.preguntar(S, 0, 'chico') === null, 'turno ajeno');
  aser(M.preguntar(S, 1, 'gafas') === responde(S.caras[1], 'gafas'), 'pregunta sobre la cara del otro');
  aser(M.terminar(S, 1) && S.fase === 'paso' && S.turno === 0, 'paso al otro jugador');
});
t('tumbado automático', () => {
  const { S, r } = jugar({ ...M.CFG_DEF, empieza: 'j1', tumbar: 'auto' }, 9); M.elegirSecreto(S, 0, 0, r);
  M.preguntar(S, 0, 'gafas'); aser(S.tumba[0].some(x => x) && S.tumba[0][S.secreto[1]] === 0, 'auto');
});
t('la CPU gana a todos los niveles contra un secreto fijo y no se equivoca al deducir', () => {
  for (const nivel of ['facil', 'medio', 'dificil']) {
    let total = 0, N = 40;
    for (let s = 1; s <= N; s++) {
      const { S, r } = jugar({ ...M.CFG_DEF, nivel, empieza: 'j2', n: s % 2 ? 30 : 24, conjunto: s % 3 ? 'clasicas' : 'azar' }, 100 + s); M.elegirSecreto(S, 0, s % S.n, r);
      let g = 0;
      while (S.fase === 'turno' && g < 60) {
        if (S.turno === 1) { const c = M.turnoCpu(S, r); aser(c, 'CPU sin jugada'); if (c.tipo === 'pregunta') aser(S.cpu.cand.includes(S.secreto[0]), 'descarta la cara buena'); g++; }
        else { M.preguntar(S, 0, 'chico'); M.terminar(S, 0); }
      }
      aser(S.fase === 'fin' && S.ganador === 1, `${nivel}: no gana (${g} turnos, fase ${S.fase})`); total += g;
    }
    console.log('   ', nivel, 'media', (total / N).toFixed(1), 'turnos');
  }
});
t('la CPU difícil necesita pocas preguntas', () => {
  let t5 = 0, N = 30; for (let s = 1; s <= N; s++) {
    const { S, r } = jugar({ ...M.CFG_DEF, nivel: 'dificil', empieza: 'j2' }, 500 + s); M.elegirSecreto(S, 0, s % 30, r);
    let g = 0; while (S.fase === 'turno') { if (S.turno === 1) { M.turnoCpu(S, r); g++; } else { M.preguntar(S, 0, 'chico'); M.terminar(S, 0); } } t5 += g;
  } aser(t5 / N <= 7.5, 'media ' + (t5 / N).toFixed(1));
});
t('validar rechaza basura y acepta una partida real', () => {
  const { S, r } = jugar({ ...M.CFG_DEF, empieza: 'j1' }, 12); M.elegirSecreto(S, 0, 3, r); M.preguntar(S, 0, 'gafas'); M.terminar(S, 0); M.turnoCpu(S, r);
  const J = JSON.parse(JSON.stringify(S)); aser(M.validar(J), 'buena');
  for (const x of [null, {}, { ...J, v: 2 }, { ...J, modo: '__proto__' }, { ...J, n: 5 }, { ...J, caras: J.caras.slice(1) }, { ...J, secreto: [99, 0] }, { ...J, tumba: [[1], [2]] }, { ...J, fase: 'otra' }, { ...J, fase: 'fin', ganador: -1 }, { ...J, fase: 'turno', secreto: [-1, 3] }, { ...J, ganador: 1 }])
    aser(M.validar(x) === null, 'acepta ' + JSON.stringify(x).slice(0, 60));
  const raro = M.validar({ ...J, hist: [{ p: 0, q: 'x'.repeat(500), r: 1 }, { p: 5 }, 7], ult: { p: 0, q: 'a', r: 1, id: '__proto__' }, cpu: { cand: [0, 0, 999, 'a'], usadas: ['__proto__', 'gafas'] } });
  aser(raro && raro.hist.length === 1 && raro.hist[0].q.length === 90 && raro.ult.id === null && raro.cpu.cand.length === 1 && raro.cpu.usadas.length === 1, 'saneado');
});
t('resumen para la ficha de Inicio', () => {
  const { S, r } = jugar({ ...M.CFG_DEF, empieza: 'j1' }, 2); aser(/eligiendo/.test(M.resumen(S).texto), 'elegir'); M.elegirSecreto(S, 0, 0, r); aser(/preguntas/.test(M.resumen(S).texto), 'juego');
  M.arriesgar(S, 0, S.secreto[1]); aser(M.resumen(S).fin && /Ganaste/.test(M.resumen(S).texto), 'fin');
});
console.log(ok, 'pruebas correctas');
