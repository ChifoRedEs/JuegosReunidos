// Controlador reutilizable para juegos de dos jugadores por turnos (3 en raya, Conecta 4, y los que vengan).
// Gestiona: variantes de tablero, modo CPU / 2 jugadores, nivel, quién empieza, marcador, deshacer,
// pista, guardado, estadísticas, sonido y turno de la CPU. Cada juego aporta solo sus reglas, su IA y su vista.
//
// def = {
//   id, css (URL), variantes: { id: { nombre, corto, ... } }, nombres: ['X','O'], chip(n) -> HTML,
//   estadoInicial(v) -> e          e = { b, turn:1|2, n:nº de jugadas, ult, fin:null|{w:0|1|2, linea:[]}, ... } (JSON puro)
//   jugadas(e, v) -> [movs enteros] ([] si la partida terminó)
//   aplicar(e, mov, v) -> e nuevo (con fin calculado)
//   validarEstado(x, v) -> e normalizado | null
//   ia(e, v, nivel, rapido) -> mov
//   reglasHTML(v) -> html
//   vista: { montar(cont, ctx, v), pintar(e, ctx, v) }   ctx = { jugar(mov), puedeJugar(), pista, yo(), modo(), sonido(n) }
//   rendirse(e) -> e con fin (opcional: añade «Abandonar» al menú)
//   iaModulo: URL del módulo que exporta `ia` (opcional): la CPU piensa en un Worker sin congelar la pantalla
// }
// Además ofrece series «al mejor de 3 / 5» con su propio marcador.
import { $ } from './dom.js';
import { enSegundoPlano } from './ia/remoto.js';

const NIVEL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
const INICIO = { tu: 'Yo', cpu: 'CPU', alterna: 'Alternar' };
const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
const SERIES = { 1: 'Partida suelta', 3: 'Al mejor de 3', 5: 'Al mejor de 5' };
const serieVacia = n => ({ n, a: 0, b: 0, fin: 0 });

export function crearDuelo(def) {
  const VARS = Object.keys(def.variantes);
  let S = null, api = null, root = null, timer = null, pensando = false, ctx = null, asp = null, turnoIA = 0, pausado = false;
  // La IA: en un Worker si el juego da su módulo; si no, en el hilo principal
  const calcular = (e, v, nivel, rapido) => (def.iaModulo
    ? enSegundoPlano(def.iaModulo, 'ia', [e, v, nivel, rapido], def.ia)
    : Promise.resolve().then(() => def.ia(e, v, nivel, rapido)));
  const chip = n => def.chip(n, asp ? asp.valores : {});
  const J = () => def.variantes[S.v];

  /* ---------- validación y resumen (los usa también la importación) ---------- */
  function validar(d) {
    if (!d || typeof d !== 'object' || !Object.hasOwn(def.variantes, d.v)) return null;
    const e = def.validarEstado(d.e, d.v); if (!e) return null;
    const hist = Array.isArray(d.hist) ? d.hist.slice(-60).map(h => def.validarEstado(h, d.v)).filter(Boolean) : [];
    const m = d.marcador && typeof d.marcador === 'object' ? d.marcador : {};
    const sr = d.serie && typeof d.serie === 'object' && SERIES[d.serie.n] ? d.serie : null;
    const serie = sr ? { n: sr.n, a: ent(sr.a, 0, 3) ? sr.a : 0, b: ent(sr.b, 0, 3) ? sr.b : 0, fin: [0, 1, 2].includes(sr.fin) ? sr.fin : 0 } : serieVacia(1);
    return { serie,
      v: d.v, modo: d.modo === 'dos' ? 'dos' : 'cpu', nivel: Object.hasOwn(NIVEL, d.nivel) ? d.nivel : 'medio',
      inicio: Object.hasOwn(INICIO, d.inicio) ? d.inicio : 'alterna', yo: d.yo === 2 ? 2 : 1, e, hist,
      marcador: { p1: ent(m.p1, 0, 99999) ? m.p1 : 0, p2: ent(m.p2, 0, 99999) ? m.p2 : 0, t: ent(m.t, 0, 99999) ? m.t : 0 }, reg: !!d.reg,
    };
  }
  function textoFin(d) {
    const w = d.e.fin.w;
    if (!w) return 'Tablas';
    return d.modo === 'cpu' ? (w === d.yo ? 'Ganaste' : 'Perdiste') : `Ganó ${def.nombres[w - 1]}`;
  }
  function resumen(d) {
    const nom = def.variantes[d.v].nombre, sr = d.serie;
    if (sr && sr.fin) return { texto: `${nom} · ${sr.fin === 1 ? (d.modo === 'cpu' ? 'Ganaste la serie' : 'Serie para el jugador 1') : (d.modo === 'cpu' ? 'Perdiste la serie' : 'Serie para el jugador 2')} ${sr.a}-${sr.b}`, fin: true };
    if (d.e.fin) return { texto: `${nom} · ${textoFin(d)}`, fin: true };
    return { texto: `${nom} · ${d.modo === 'cpu' ? NIVEL[d.nivel] : '2 jugadores'}`, fin: false };
  }

  /* ---------- ciclo de vida ---------- */
  async function mount(r, a) {
    api = a; root = r; pensando = false;
    await api.css(def.css);
    const g = api.cargar();
    if (g) S = { ...g, hist: g.hist.slice() };
    else {
      const pv = api.pref('v', VARS[0]), pn = api.pref('nivel', 'medio'), pi = api.pref('inicio', 'alterna');
      const ps = api.pref('serie', 1);
      S = { v: Object.hasOwn(def.variantes, pv) ? pv : VARS[0], modo: api.pref('modo', 'cpu') === 'dos' ? 'dos' : 'cpu', nivel: Object.hasOwn(NIVEL, pn) ? pn : 'medio',
        inicio: Object.hasOwn(INICIO, pi) ? pi : 'alterna', yo: 1, e: null, hist: [], marcador: { p1: 0, p2: 0, t: 0 }, reg: false, serie: serieVacia(SERIES[ps] ? ps : 1) };
    }
    asp = api.aspecto(def.aspecto || [], () => { montarTablero(); pintar(); });
    ctx = {
      pista: null, valores: () => asp.valores,
      yo: () => (S ? S.yo : 1), modo: () => (S ? S.modo : 'cpu'), sonido: n => api.sonido(n),
      rendirse: def.rendirse ? () => rendirse() : null,
      pausado: () => pausado,
      puedeJugar: () => !!S && !pausado && !S.e.fin && !pensando && (S.modo === 'dos' || S.e.turn === S.yo),
      jugar: m => {
        if (!ctx.puedeJugar()) return false;
        if (!def.jugadas(S.e, S.v).includes(m)) { api.sonido('error'); return false; }
        hacer(m); return true;
      },
      // Para las vistas con funciones propias (reloj, importar una partida…):
      api: () => api,
      estado: () => (S ? S.e : null),
      guardar: () => guardar(),
      // Sustituye el estado de la partida (p. ej. al importar o al agotarse el tiempo). Si viene terminado, se apunta el resultado.
      ponerEstado(e, { limpiar = false } = {}) {
        if (!S || !e) return;
        clearTimeout(timer); pensando = false; turnoIA++;
        if (limpiar) { S.hist = []; S.reg = false; } else { S.hist.push(S.e); if (S.hist.length > 60) S.hist.shift(); }
        S.e = e; ctx.pista = null;
        if (S.e.fin && !S.reg) terminar();
        pintar(); guardar();
        if (!S.e.fin) siguiente();
      },
    };
    api.barra({
      nueva: () => nuevaPartida(true, false),
      salir: () => { location.hash = '#/cat/tablero'; },
      pausar: () => { pausado = true; },
      reanudar: () => { pausado = false; if (S && ctx) { pintar(); siguiente(); } },
      config: {
        valores: () => ({ v: S.v, modo: S.modo, nivel: S.nivel, serie: S.serie.n, inicio: S.inicio, ...(def.cfgExtra ? def.cfgExtra.valores() : {}) }),
        grupos: v => [
          { clave: 'v', titulo: 'Tablero', opciones: VARS.map(k => [k, def.variantes[k].corto]) },
          { clave: 'modo', titulo: 'Modo', opciones: [['cpu', 'Contra CPU'], ['dos', '2 jugadores']] },
          { clave: 'nivel', titulo: 'Nivel de la CPU', visible: v.modo === 'cpu', opciones: Object.entries(NIVEL) },
          { clave: 'serie', titulo: 'Partidas', opciones: Object.entries(SERIES).map(([k, l]) => [+k, l]) },
          { clave: 'inicio', titulo: 'Empieza', opciones: Object.entries(INICIO) },
          ...(def.cfgExtra ? def.cfgExtra.grupos(v) : []),
        ],
        aplicar: v => {
          S.v = v.v; S.modo = v.modo; S.nivel = v.nivel; S.inicio = v.inicio; S.serie = serieVacia(v.serie);
          api.setPref('v', S.v); api.setPref('modo', S.modo); api.setPref('nivel', S.nivel); api.setPref('inicio', S.inicio); api.setPref('serie', v.serie);
          if (def.cfgExtra) def.cfgExtra.aplicar(v);
          nuevaPartida(true, true);
        },
      },
    });
    root.innerHTML = `
      <div class="duM" id="duMarc"></div>
      <div class="duSerie" id="duSerie" hidden></div>
      <div class="msg duMsg" id="duMsg" role="status" aria-live="polite"></div>
      <div id="duTab"></div>
      <div class="bar"><button class="btn" data-ac="undo">↶ Deshacer</button><button class="btn" data-ac="pista">💡 Pista</button></div>
      <p class="note" id="duReg"></p>${api.barraHtml()}`;
    root.addEventListener('click', clic);
    api.menu([
      { texto: 'Nueva partida', accion: () => nuevaPartida() },
      { texto: 'Deshacer', accion: deshacer },
      { texto: 'Pista', accion: pista },
      { texto: '🎨 Apariencia', accion: () => asp.abrir() },
      ...(def.rendirse ? [{ texto: '🏳️ Abandonar la partida', accion: () => rendirse(), peligro: true }] : []),
      { texto: 'Reiniciar marcador', accion: reiniciarMarcador, peligro: true },
      { texto: 'Reglas', accion: reglas },
    ]);
    if (!S.e) { nuevaPartida(true, true); return; }
    montarTablero(); pintar(); siguiente();
  }
  function unmount() {
    clearTimeout(timer); timer = null; pensando = false; turnoIA++;
    if (root) root.removeEventListener('click', clic);
    S = null; ctx = null; root = null; asp = null; pausado = false;
  }
  const montarTablero = () => def.vista.montar($('#duTab'), ctx, S.v);

  /* ---------- partida ---------- */
  const progreso = () => S.hist.length > 0 && !S.e.fin;
  function nuevaPartida(forzar = false, remontar = false) {
    if (!forzar && progreso() && !api.confirmar('¿Empezar una partida nueva? Perderás la actual.')) return;
    clearTimeout(timer); pensando = false; turnoIA++;
    const termino = S.e && S.e.fin;
    if (S.serie.fin || S.serie.n === 1) S.serie = serieVacia(S.serie.n);   // la serie terminada empieza de nuevo
    if (S.inicio === 'tu') S.yo = 1; else if (S.inicio === 'cpu') S.yo = 2; else if (termino) S.yo = 3 - S.yo;
    S.e = def.estadoInicial(S.v); S.hist = []; S.reg = false; ctx.pista = null;
    if (remontar) montarTablero();
    pintar(); guardar(); siguiente();
  }
  function hacer(m) {
    S.hist.push(S.e); if (S.hist.length > 60) S.hist.shift();
    S.e = def.aplicar(S.e, m, S.v); ctx.pista = null;
    api.sonido('mover'); api.vibrar(8);
    if (S.e.fin) terminar();
    pintar(); guardar();
    if (!S.e.fin) siguiente();
  }
  function terminar() {
    const w = S.e.fin.w;
    if (!w) S.marcador.t++; else if (w === S.yo) S.marcador.p1++; else S.marcador.p2++;
    S.reg = true;
    const sr = S.serie;
    if (sr.n > 1 && !sr.fin && w) {
      if (w === S.yo) sr.a++; else sr.b++;
      const meta = Math.ceil(sr.n / 2);
      if (sr.a >= meta || sr.b >= meta) {
        sr.fin = sr.a >= meta ? 1 : 2;
        const txt = S.modo === 'cpu' ? (sr.fin === 1 ? '🏆 ¡Has ganado la serie!' : 'La CPU gana la serie') : `🏆 ¡${sr.fin === 1 ? 'Jugador 1' : 'Jugador 2'} gana la serie!`;
        setTimeout(() => api && api.aviso(`${txt} (${sr.a}-${sr.b})`, 3200), 500);
      }
    }
    if (S.modo === 'cpu') {
      api.registrar({ res: !w ? 'tablas' : w === S.yo ? 'victoria' : 'derrota', variante: `${J().nombre} · ${NIVEL[S.nivel]}` });
      api.sonido(!w ? 'ok' : w === S.yo ? 'ganar' : 'perder');
    } else api.sonido(w ? 'ganar' : 'ok');
    if (w) api.vibrar([40, 30, 40]);
  }
  function siguiente() {
    if (!S || S.e.fin || S.modo !== 'cpu' || S.e.turn === S.yo) return;
    pensando = true; pintarMsg();
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (pausado) return;
      if (!S || !pensando || S.e.fin) { pensando = false; return; }
      const tok = ++turnoIA, e0 = S.e;
      const m = await calcular(S.e, S.v, S.nivel, false);
      if (!S || tok !== turnoIA || S.e !== e0) return;           // la partida cambió mientras pensaba
      if (pausado) { pensando = false; return; }
      pensando = false;
      if (m != null && def.jugadas(S.e, S.v).includes(m)) hacer(m); else pintar();
    }, 380);
  }
  function indiceDeshacer() {
    if (!S || S.e.fin || pensando || !S.hist.length) return -1;
    if (S.modo === 'dos') return S.hist.length - 1;
    for (let k = S.hist.length - 1; k >= 0; k--) if (S.hist[k].turn === S.yo) return k;
    return -1;
  }
  function deshacer() {
    const k = indiceDeshacer(); if (k < 0) { api.aviso('Nada que deshacer'); return; }
    S.e = S.hist[k]; S.hist.length = k; ctx.pista = null; pintar(); guardar();
  }
  async function pista() {
    if (!ctx.puedeJugar()) return;
    const e0 = S.e, b = root.querySelector('[data-ac="pista"]'); if (b) { b.disabled = true; b.textContent = '💭 Pensando…'; }
    const m = await calcular(S.e, S.v, 'dificil', true);
    if (b) b.textContent = '💡 Pista';
    if (!S || S.e !== e0) return;
    if (m != null) ctx.pista = m;
    pintar();
  }
  function rendirse() {
    if (!S || S.e.fin || !S.hist.length) { api.aviso('No hay ninguna partida en juego'); return; }
    if (!api.confirmar('¿Abandonar la partida? Contará como derrota.')) return;
    clearTimeout(timer); pensando = false;
    if (S.modo === 'cpu' && S.e.turn !== S.yo) S.e = { ...S.e, turn: S.yo };   // abandona quien juega, no la CPU
    S.e = def.rendirse(S.e); terminar(); pintar(); guardar();
  }
  function reiniciarMarcador() {
    if (!api.confirmar('¿Poner el marcador a cero?')) return;
    S.marcador = { p1: 0, p2: 0, t: 0 }; S.serie = serieVacia(S.serie.n); pintar(); guardar();
  }
  function guardar() {
    if (!S) return;
    const d = { v: S.v, modo: S.modo, nivel: S.nivel, inicio: S.inicio, yo: S.yo, e: S.e, hist: S.hist.slice(-40), marcador: S.marcador, reg: S.reg, serie: S.serie };
    const r = resumen(d); api.guardar(d, r.texto, r.fin);
  }

  /* ---------- pintado ---------- */
  function mensaje() {
    const e = S.e, cpu = S.modo === 'cpu';
    if (e.fin) {
      const w = e.fin.w;
      if (!w) return ['Tablas. ¡Buena partida!', ''];
      return [`${chip(w)} ${cpu ? (w === S.yo ? '¡Has ganado!' : 'Ha ganado la CPU') : `¡Gana ${def.nombres[w - 1]}!`}`, cpu && w !== S.yo ? 'err' : 'win'];
    }
    if (cpu && e.turn !== S.yo) return [`${chip(e.turn)} Piensa la CPU…`, ''];
    return [`${chip(e.turn)} ${cpu ? 'Tu turno' : `Turno de ${def.nombres[e.turn - 1]}`}`, ''];
  }
  function pintarMsg() { const [t, c] = mensaje(), m = $('#duMsg'); if (m) { m.innerHTML = t; m.className = 'msg duMsg ' + c; } }
  function pintar() {
    if (!S) return;
    const e = S.e, cpu = S.modo === 'cpu', s1 = S.yo, s2 = 3 - S.yo;
    const ds = $('#duSerie'), sr = S.serie;
    ds.hidden = sr.n === 1;
    if (sr.n > 1) ds.innerHTML = `${SERIES[sr.n]}: <b>${sr.a} – ${sr.b}</b>${sr.fin ? ` · ${sr.fin === 1 ? (cpu ? '¡serie tuya!' : 'serie del jugador 1') : (cpu ? 'serie para la CPU' : 'serie del jugador 2')}` : ` · gana quien llegue a ${Math.ceil(sr.n / 2)}`}`;
    const M = S.marcador;
    $('#duMarc').innerHTML = `<div class="${!e.fin && e.turn === s1 ? 'turno' : ''}"><b>${M.p1}</b><small>${chip(s1)} ${cpu ? 'Tú' : 'Jugador 1'}</small></div>
      <div><b>${M.t}</b><small>Empates</small></div>
      <div class="${!e.fin && e.turn === s2 ? 'turno' : ''}"><b>${M.p2}</b><small>${chip(s2)} ${cpu ? 'CPU' : 'Jugador 2'}</small></div>`;
    pintarMsg();
    root.querySelector('[data-ac="undo"]').disabled = indiceDeshacer() < 0;
    root.querySelector('[data-ac="pista"]').disabled = !ctx.puedeJugar();
    def.vista.pintar(e, ctx, S.v);
  }

  /* ---------- entrada ---------- */
  function clic(ev) {
    const b = ev.target.closest('button[data-ac]');
    if (!b || !S) return;
    const d = b.dataset;
    if (d.ac === 'nueva') nuevaPartida();
    else if (d.ac === 'undo') deshacer();
    else if (d.ac === 'pista') pista();
    else if (d.ac === 'aspecto') asp.abrir();
  }
  function reglas() { api.modal(J().nombre, def.reglasHTML(S.v)); }

  return { mount, unmount, validar, resumen };
}
