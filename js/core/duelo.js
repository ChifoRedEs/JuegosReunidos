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
//   vista: { montar(cont, ctx, v), pintar(e, ctx, v) }   ctx = { jugar(mov), puedeJugar(), pista }
// }
import { $ } from './dom.js';

const NIVEL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
const INICIO = { tu: 'Yo', cpu: 'CPU', alterna: 'Alternar' };
const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;

export function crearDuelo(def) {
  const VARS = Object.keys(def.variantes);
  let S = null, api = null, root = null, timer = null, pensando = false, ctx = null;
  const J = () => def.variantes[S.v];

  /* ---------- validación y resumen (los usa también la importación) ---------- */
  function validar(d) {
    if (!d || typeof d !== 'object' || !Object.hasOwn(def.variantes, d.v)) return null;
    const e = def.validarEstado(d.e, d.v); if (!e) return null;
    const hist = Array.isArray(d.hist) ? d.hist.slice(-60).map(h => def.validarEstado(h, d.v)).filter(Boolean) : [];
    const m = d.marcador && typeof d.marcador === 'object' ? d.marcador : {};
    return {
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
    const nom = def.variantes[d.v].nombre;
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
      S = { v: Object.hasOwn(def.variantes, pv) ? pv : VARS[0], modo: api.pref('modo', 'cpu') === 'dos' ? 'dos' : 'cpu', nivel: Object.hasOwn(NIVEL, pn) ? pn : 'medio',
        inicio: Object.hasOwn(INICIO, pi) ? pi : 'alterna', yo: 1, e: null, hist: [], marcador: { p1: 0, p2: 0, t: 0 }, reg: false };
    }
    ctx = {
      pista: null,
      puedeJugar: () => !!S && !S.e.fin && !pensando && (S.modo === 'dos' || S.e.turn === S.yo),
      jugar: m => {
        if (!ctx.puedeJugar()) return false;
        if (!def.jugadas(S.e, S.v).includes(m)) { api.sonido('error'); return false; }
        hacer(m); return true;
      },
    };
    root.innerHTML = `
      <details class="ops" id="duOps"><summary id="duSum"></summary>
      <div class="bar"><span class="lbl">Tablero</span><div class="seg">${VARS.map(k => `<button class="btn" data-var="${k}">${def.variantes[k].corto}</button>`).join('')}</div></div>
      <div class="bar"><span class="lbl">Modo</span><div class="seg"><button class="btn" data-modo="cpu">Contra CPU</button><button class="btn" data-modo="dos">2 jugadores</button></div></div>
      <div class="bar" id="duNiv"><span class="lbl">Nivel</span><div class="seg">${Object.entries(NIVEL).map(([k, l]) => `<button class="btn" data-niv="${k}">${l}</button>`).join('')}</div></div>
      <div class="bar"><span class="lbl">Empieza</span><div class="seg">${Object.entries(INICIO).map(([k, l]) => `<button class="btn" data-ini="${k}">${l}</button>`).join('')}</div></div>
      </details>
      <div class="duM" id="duMarc"></div>
      <div class="msg duMsg" id="duMsg" role="status" aria-live="polite"></div>
      <div id="duTab"></div>
      <div class="bar"><button class="btn on" data-ac="nueva">Nueva partida</button><button class="btn" data-ac="undo">↶ Deshacer</button><button class="btn" data-ac="pista">💡 Pista</button></div>
      <p class="note" id="duReg"></p>`;
    root.addEventListener('click', clic);
    api.menu([
      { texto: 'Nueva partida', accion: () => nuevaPartida() },
      { texto: 'Deshacer', accion: deshacer },
      { texto: 'Pista', accion: pista },
      { texto: 'Reiniciar marcador', accion: reiniciarMarcador, peligro: true },
      { texto: 'Reglas', accion: reglas },
    ]);
    if (!S.e) { $('#duOps').open = true; nuevaPartida(true, true); return; }
    $('#duOps').open = !S.hist.length && !S.e.fin;
    montarTablero(); pintar(); siguiente();
  }
  function unmount() {
    clearTimeout(timer); timer = null; pensando = false;
    if (root) root.removeEventListener('click', clic);
    S = null; ctx = null; root = null;
  }
  const montarTablero = () => def.vista.montar($('#duTab'), ctx, S.v);

  /* ---------- partida ---------- */
  const progreso = () => S.hist.length > 0 && !S.e.fin;
  function nuevaPartida(forzar = false, remontar = false) {
    if (!forzar && progreso() && !api.confirmar('¿Empezar una partida nueva? Perderás la actual.')) return;
    clearTimeout(timer); pensando = false;
    const termino = S.e && S.e.fin;
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
    timer = setTimeout(() => {
      if (!S || !pensando || S.e.fin) { pensando = false; return; }
      const m = def.ia(S.e, S.v, S.nivel, false);
      pensando = false;
      if (S && m != null) hacer(m);
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
  function pista() {
    if (!ctx.puedeJugar()) return;
    const m = def.ia(S.e, S.v, 'dificil', true);
    if (m != null) { ctx.pista = m; pintar(); }
  }
  function reiniciarMarcador() {
    if (!api.confirmar('¿Poner el marcador a cero?')) return;
    S.marcador = { p1: 0, p2: 0, t: 0 }; pintar(); guardar();
  }
  function guardar() {
    if (!S) return;
    const d = { v: S.v, modo: S.modo, nivel: S.nivel, inicio: S.inicio, yo: S.yo, e: S.e, hist: S.hist.slice(-40), marcador: S.marcador, reg: S.reg };
    const r = resumen(d); api.guardar(d, r.texto, r.fin);
  }

  /* ---------- pintado ---------- */
  function mensaje() {
    const e = S.e, cpu = S.modo === 'cpu';
    if (e.fin) {
      const w = e.fin.w;
      if (!w) return ['Tablas. ¡Buena partida!', ''];
      return [`${def.chip(w)} ${cpu ? (w === S.yo ? '¡Has ganado!' : 'Ha ganado la CPU') : `¡Gana ${def.nombres[w - 1]}!`}`, cpu && w !== S.yo ? 'err' : 'win'];
    }
    if (cpu && e.turn !== S.yo) return [`${def.chip(e.turn)} Piensa la CPU…`, ''];
    return [`${def.chip(e.turn)} ${cpu ? 'Tu turno' : `Turno de ${def.nombres[e.turn - 1]}`}`, ''];
  }
  function pintarMsg() { const [t, c] = mensaje(), m = $('#duMsg'); if (m) { m.innerHTML = t; m.className = 'msg duMsg ' + c; } }
  function pintar() {
    if (!S) return;
    const e = S.e, cpu = S.modo === 'cpu', s1 = S.yo, s2 = 3 - S.yo;
    root.querySelectorAll('[data-var]').forEach(b => b.classList.toggle('on', b.dataset.var === S.v));
    root.querySelectorAll('[data-modo]').forEach(b => b.classList.toggle('on', b.dataset.modo === S.modo));
    root.querySelectorAll('[data-niv]').forEach(b => b.classList.toggle('on', b.dataset.niv === S.nivel));
    root.querySelectorAll('[data-ini]').forEach(b => b.classList.toggle('on', b.dataset.ini === S.inicio));
    $('#duNiv').style.display = cpu ? '' : 'none';
    $('#duSum').textContent = `⚙️ ${J().corto} · ${cpu ? 'CPU ' + NIVEL[S.nivel] : '2 jugadores'} · empieza ${S.inicio === 'tu' ? 'tú' : S.inicio === 'cpu' ? 'la CPU' : 'alterno'}`;
    const M = S.marcador;
    $('#duMarc').innerHTML = `<div class="${!e.fin && e.turn === s1 ? 'turno' : ''}"><b>${M.p1}</b><small>${def.chip(s1)} ${cpu ? 'Tú' : 'Jugador 1'}</small></div>
      <div><b>${M.t}</b><small>Empates</small></div>
      <div class="${!e.fin && e.turn === s2 ? 'turno' : ''}"><b>${M.p2}</b><small>${def.chip(s2)} ${cpu ? 'CPU' : 'Jugador 2'}</small></div>`;
    pintarMsg();
    root.querySelector('[data-ac="undo"]').disabled = indiceDeshacer() < 0;
    root.querySelector('[data-ac="pista"]').disabled = !ctx.puedeJugar();
    def.vista.pintar(e, ctx, S.v);
  }

  /* ---------- entrada ---------- */
  function clic(ev) {
    const b = ev.target.closest('button[data-var],button[data-modo],button[data-niv],button[data-ini],button[data-ac]');
    if (!b || !S) return;
    const d = b.dataset;
    if (d.var) {
      if (d.var === S.v) return;
      if (progreso() && !api.confirmar('Cambiar de tablero empieza una partida nueva. ¿Continuar?')) return;
      S.v = d.var; api.setPref('v', S.v); nuevaPartida(true, true);
    } else if (d.modo) {
      if (d.modo === S.modo) return;
      if (progreso() && !api.confirmar('Cambiar de modo empieza una partida nueva. ¿Continuar?')) return;
      S.modo = d.modo; api.setPref('modo', S.modo); nuevaPartida(true, false);
    } else if (d.niv) { S.nivel = d.niv; api.setPref('nivel', S.nivel); pintar(); guardar(); }
    else if (d.ini) {
      S.inicio = d.ini; api.setPref('inicio', S.inicio);
      if (!S.hist.length && !S.e.fin) nuevaPartida(true, false);
      else { api.aviso('Se aplicará en la próxima partida'); pintar(); guardar(); }
    } else if (d.ac === 'nueva') nuevaPartida();
    else if (d.ac === 'undo') deshacer();
    else if (d.ac === 'pista') pista();
  }
  function reglas() { api.modal(J().nombre, def.reglasHTML(S.v)); }

  return { mount, unmount, validar, resumen };
}
