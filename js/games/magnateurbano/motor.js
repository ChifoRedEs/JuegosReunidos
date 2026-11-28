// Aeropuerto · reglas. No toca el DOM: habla con la interfaz mediante `h` (hooks, todos asíncronos salvo color y flash).
// Hooks: render, log(html, clase), paso(jugador), dados(a, b), flash(jugador, importe), color(jugador) → #hex,
// pregunta(titulo, html, botones) → botón, carta(mazo, carta, auto), aterriza(casilla, jugador, auto, extra) (ficha emergente al caer: impuestos, esquinas y alquileres),
// comprar(casilla, jugador) → bool, puja(casilla, jugador, actual) → importe, aceptar(a, b, oferta) → bool, casilla(jugador) → índice (Billete dorado),
// gestionar(partida, jugador), fin(ganador, motivo).
import { ZONAS, MULT, SALARIO, FIANZA, MEJORAS, JETS, TERMINAL, SERVICIO, EMBARQUE, PRISION, PARAISO, CONTROL, TOTAL, CASILLAS, MAZOS, LIBRE } from './datos.js';

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const d6 = () => 1 + Math.floor(Math.random() * 6);
const barajar = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const r5 = x => Math.round(x / 5) * 5;
export const REGLAS = { bote: true, subasta: true, dinero: 1600, rondas: 0 };   // rondas: 0 = sin límite
const COMPRABLE = ['destino', 'terminal', 'servicio'];
const VALOR_TARJETA = 110;                                                       // lo que vale para la CPU una tarjeta de «sal de la Prisión»

// ---------- IA de los bots ----------
class IA {
  constructor(g) { this.g = g; this.vetos = {}; }
  completa(s, p) { const g = this.g; return s.tipo === 'destino' && g.zona(s).every(x => x === s || x.dueno === g.idx(p)); }
  comprar(s, p) { return p.dinero - s.precio >= (this.completa(s, p) ? 0 : s.tipo === 'destino' ? 150 : 100); }
  pujar(s, p, actual) { const max = Math.min(s.precio * (this.completa(s, p) ? 1.5 : .9), p.dinero - 100); return actual + 10 <= max ? actual + 10 : 0; }
  elegir(p, op) {
    if (op.includes('Usar tarjeta')) return 'Usar tarjeta';
    if (op.includes(`Pagar ${FIANZA} M`)) return p.dinero > 350 ? `Pagar ${FIANZA} M` : 'Intentar dobles';
    return op[0];
  }
  gestionar(p) {
    const g = this.g, i = g.idx(p);
    for (let n = 0; n < 60; n++) {
      const o = g.propias(i), u = o.find(s => s.hip && p.dinero > s.precio + 200 && g.puedeDeshipotecar(s));
      if (u) { g.deshipotecar(u); continue; }
      const b = o.filter(s => g.puedeMejorar(s) && p.dinero - ZONAS[s.g].mejora >= 250).sort((a, c) => a.of - c.of)[0];
      if (!b) break; g.mejorar(b);
    }
  }
  reunir(p, importe) {      // baja categorías e hipoteca hasta reunir el importe
    const g = this.g, i = g.idx(p);
    while (p.dinero < importe) {
      const o = g.propias(i), s = o.find(x => g.puedeBajar(x));
      if (s) { g.bajar(s); continue; }
      const m = o.filter(x => g.puedeHipotecar(x)).sort((a, b) => a.precio - b.precio)[0];
      if (!m) break; g.hipotecar(m);
    }
    return p.dinero >= importe;
  }
  // ¿Acepta el bot b la oferta? Valora más lo que le acerca a una zona completa y pide más por lo que completaría la del otro
  aceptar(b, o, a) {
    const g = this.g, bi = g.idx(b), ai = g.idx(a), v = s => s.precio * (s.hip ? .5 : 1);
    const recibe = o.da.reduce((t, i) => { const s = g.c[i]; return t + v(s) * (s.tipo === 'destino' && g.zona(s).every(x => x.dueno === bi || o.da.includes(x.id)) ? 1.6 : 1); }, o.daM + o.daL.length * VALOR_TARJETA);
    const entrega = o.pide.reduce((t, i) => {
      const s = g.c[i], zona = g.zona(s);
      let m = s.tipo !== 'destino' ? 1.3 : g.tieneZona(bi, s.g) ? 2.5 : zona.some(x => x !== s && x.dueno === bi) ? 1.8 : 1.3;
      if (s.tipo === 'destino' && zona.every(x => x === s || x.dueno === ai || o.pide.includes(x.id))) m += .3;   // le completaría la zona al otro
      return t + v(s) * m;
    }, o.pideM + o.pideL.length * VALOR_TARJETA * 1.3);
    return recibe >= entrega * 1.05 && b.dinero + o.daM - o.pideM >= 50;
  }
  // Al empezar su turno, el bot intenta comprar el destino que le falta para completar una zona (como mucho una oferta por turno)
  async negociar(p) {
    const g = this.g, i = g.idx(p);
    for (const k of Object.keys(ZONAS)) {
      const zona = g.c.filter(x => x.g === k), faltan = zona.filter(x => x.dueno !== i);
      if (faltan.length !== 1 || zona.some(x => x.of)) continue;
      const s = faltan[0]; if (s.dueno === null) continue;
      const b = g.jug[s.dueno], clave = `${i}>${s.id}`;
      if (b.fuera || (this.vetos[clave] || 0) >= g.ronda) continue;
      const oferta = Math.min(Math.round(s.precio * (1.5 + Math.random() * .6) / 10) * 10, p.dinero - 150);
      if (oferta < s.precio * 1.2) continue;
      const ok = await g.proponer(p, b, { da: [], daM: oferta, daL: [], pide: [s.id], pideM: 0, pideL: [] });
      if (!ok) this.vetos[clave] = g.ronda + (b.bot ? 2 : 6);            // a las personas no se les vuelve a preguntar en 6 rondas
      return;
    }
  }
  // Billete dorado: la casilla que más le conviene (completar una zona > comprar algo libre > Embarque > Paraíso con bote)
  elegirCasilla(p) {
    const g = this.g, yo = g.idx(p); let mejor = EMBARQUE, puntos = 150;
    g.c.forEach((s, i) => {
      if (i === p.pos || i === CONTROL) return;
      let v = 0;
      if (COMPRABLE.includes(s.tipo)) {
        if (s.dueno === null && p.dinero >= s.precio + 100) v = s.precio * (this.completa(s, p) ? 8 : 1.1);
        else if (s.dueno !== null && s.dueno !== yo && !s.hip) v = -400 - s.of * 100;
      } else if (i === PARAISO && g.reglas.bote) v = g.bote;
      else if (s.tipo === 'impuesto') v = -s.importe;
      if (v > puntos) { puntos = v; mejor = i; }
    });
    return mejor;
  }
}

// ---------- partida ----------
export class Partida {
  // jugadores: [{ nombre, k (asiento 0-3), bot }]
  constructor(jugadores, h, reglas = {}) {
    this.h = h; this.reglas = { ...REGLAS, ...reglas };
    this.jug = jugadores.map(j => ({ nombre: j.nombre, k: j.k, bot: !!j.bot, dinero: this.reglas.dinero, pos: EMBARQUE, espera: false, intentos: 0, libres: [], gratis: 0, pierde: false, huelga: false, fuera: false }));
    this.c = CASILLAS.map((s, i) => ({ ...s, id: i, dueno: null, of: 0, hip: false }));     // estado propio, sin tocar CASILLAS
    this.mazos = { souvenirs: barajar(MAZOS.souvenirs.map((_, i) => i)), retrasos: barajar(MAZOS.retrasos.map((_, i) => i)) };
    this.turno = 0; this.ronda = 1; this.terminada = false; this.ganador = -1; this.motivo = '';
    this.bote = 0; this.mejoras = MEJORAS; this.jets = JETS; this.otra = false; this.ia = new IA(this);
  }
  toJSON() {
    return { v: 2, jug: this.jug.map(p => ({ ...p, libres: p.libres.slice() })), c: this.c.map(s => [s.dueno, s.of, s.hip]), reglas: this.reglas, mazos: this.mazos,
      turno: this.turno, ronda: this.ronda, terminada: this.terminada, ganador: this.ganador, motivo: this.motivo, bote: this.bote, mejoras: this.mejoras, jets: this.jets };
  }
  static desde(d, h) {
    const g = new Partida(d.jug, h, d.reglas);
    g.jug.forEach((p, i) => Object.assign(p, d.jug[i], { libres: d.jug[i].libres.slice() }));
    d.c.forEach(([dueno, of, hip], i) => Object.assign(g.c[i], { dueno, of, hip }));
    Object.assign(g, { mazos: { souvenirs: d.mazos.souvenirs.slice(), retrasos: d.mazos.retrasos.slice() }, turno: d.turno, ronda: d.ronda, terminada: d.terminada,
      ganador: d.ganador, motivo: d.motivo, bote: d.bote, mejoras: d.mejoras, jets: d.jets });
    return g;
  }
  p() { return this.jug[this.turno]; }
  idx(p) { return this.jug.indexOf(p); }
  col(p) { return (this.h.color && this.h.color(p)) || '#2F6BFF'; }
  n(p) { return `<b style="color:${this.col(p)}">${esc(p.nombre)}</b>`; }
  log(m, c) { this.h.log(m, c); }
  propias(i) { return this.c.filter(s => s.dueno === i); }
  zona(s) { return s.tipo === 'destino' ? this.c.filter(x => x.g === s.g) : [s]; }
  tieneZona(i, g) { return this.c.filter(x => x.g === g).every(x => x.dueno === i); }
  patrimonio(p) { return p.dinero + this.propias(this.idx(p)).reduce((t, s) => t + (s.hip ? s.precio / 2 : s.precio) + (s.of ? s.of * ZONAS[s.g].mejora : 0), 0); }
  elegir(p, t, x, op) { return p.bot ? Promise.resolve(this.ia.elegir(p, op)) : this.h.pregunta(t, x, op); }

  alquilerBase(s) { return s.alquiler; }
  alquilerNivel(s, nivel) { return nivel ? Math.max(5, r5(s.alquiler * MULT[nivel])) : s.alquiler; }
  alquiler(s, tirada) {
    const suyas = this.propias(s.dueno);
    if (s.tipo === 'terminal') return TERMINAL.alquiler[suyas.filter(x => x.tipo === 'terminal').length - 1];
    if (s.tipo === 'servicio') return tirada * SERVICIO.veces[suyas.filter(x => x.tipo === 'servicio').length > 1 ? 1 : 0];
    if (s.of) return this.alquilerNivel(s, s.of);
    return this.tieneZona(s.dueno, s.g) ? s.alquiler * 2 : s.alquiler;
  }

  // ---------- mejoras de vuelo (uniformes, con límite del banco) e hipotecas ----------
  puedeMejorarGratis(s) {
    return s.tipo === 'destino' && s.dueno !== null && s.of < 5 && (s.of < 4 ? this.mejoras > 0 : this.jets > 0) && this.tieneZona(s.dueno, s.g) && this.zona(s).every(x => !x.hip && x.of >= s.of);
  }
  puedeMejorar(s) { const p = s.dueno !== null && this.jug[s.dueno]; return this.puedeMejorarGratis(s) && (p.gratis > 0 || p.dinero >= ZONAS[s.g].mejora); }
  mejorar(s, gratis = false) { const p = this.jug[s.dueno]; if (!gratis && p.gratis > 0) { p.gratis--; gratis = true; } if (!gratis) p.dinero -= ZONAS[s.g].mejora; if (s.of < 4) this.mejoras--; else { this.jets--; this.mejoras += 4; } s.of++; }
  // Plan de mejoras de una zona: «objetivo» = {índice de casilla: nivel}. Se prueba con las reglas reales y, si no es válido o no se aplica, todo vuelve a como estaba.
  planear(p, objetivo, aplicar = false) {
    const i = this.idx(p), ids = Object.keys(objetivo).map(Number), ss = ids.map(k => this.c[k]);
    if (!ss.every(s => s.dueno === i && s.tipo === 'destino')) return { ok: false, coste: 0 };
    const snap = { m: this.mejoras, j: this.jets, d: p.dinero, g: p.gratis, of: ss.map(s => s.of) }, antes = p.dinero;
    const fin = ok => { const r = { ok, coste: antes - p.dinero, gratis: snap.g - p.gratis }; if (!ok || !aplicar) { this.mejoras = snap.m; this.jets = snap.j; p.dinero = snap.d; p.gratis = snap.g; ss.forEach((s, k) => { s.of = snap.of[k]; }); } return r; };
    for (let n = 0; n < 60; n++) {                                   // primero se baja (de arriba abajo) y después se sube (de abajo arriba)
      const b = ss.filter(s => s.of > objetivo[this.c.indexOf(s)] && this.puedeBajar(s)).sort((a, c) => c.of - a.of)[0];
      if (!b) break; this.bajar(b);
    }
    for (let n = 0; n < 60; n++) {
      const pend = ss.filter(s => s.of !== objetivo[this.c.indexOf(s)]); if (!pend.length) return fin(true);
      const u = pend.filter(s => s.of < objetivo[this.c.indexOf(s)] && this.puedeMejorar(s)).sort((a, c) => a.of - c.of)[0];
      if (!u) return fin(false); this.mejorar(u);
    }
    return fin(false);
  }
  puedeBajar(s) { return s.of > 0 && this.zona(s).every(x => x.of <= s.of) && (s.of < 5 || this.mejoras >= 4); }
  bajar(s, cobra = true) { if (cobra) this.jug[s.dueno].dinero += ZONAS[s.g].mejora / 2; if (s.of === 5) { this.jets++; this.mejoras -= 4; } else this.mejoras++; s.of--; }
  puedeHipotecar(s) { return s.dueno !== null && !s.hip && this.zona(s).every(x => !x.of); }
  hipotecar(s) { this.jug[s.dueno].dinero += s.precio / 2; s.hip = true; }
  costeDeshipotecar(s) { return Math.ceil(s.precio * .55); }
  puedeDeshipotecar(s) { return s.hip && this.jug[s.dueno].dinero >= this.costeDeshipotecar(s); }
  deshipotecar(s) { this.jug[s.dueno].dinero -= this.costeDeshipotecar(s); s.hip = false; }

  // ---------- dinero ----------
  async pagar(p, importe, a) {
    while (p.dinero < importe && !p.fuera) {
      if (p.bot) { if (!this.ia.reunir(p, importe)) await this.quiebra(p, a); this.h.render(); continue; }
      const c = await this.h.pregunta('Fondos insuficientes', `${this.n(p)} debe ${importe} M y solo tiene ${p.dinero} M. Baja categorías de vuelo o hipoteca destinos para reunirlo.`, ['Gestionar destinos', 'Declarar bancarrota']);
      if (c === 'Gestionar destinos') await this.h.gestionar(this, p); else await this.quiebra(p, a);
    }
    if (p.fuera) return false;
    p.dinero -= importe; this.h.flash(p, -importe);
    if (a) { a.dinero += importe; this.h.flash(a, importe); }
    this.h.render(); return true;
  }
  async multa(p, importe) { if (await this.pagar(p, importe, null) && this.reglas.bote) this.bote += importe; this.h.render(); }
  cobrar(p, importe) { p.dinero += importe; this.h.flash(p, importe); this.h.render(); }

  async quiebra(p, a) {
    this.log(`${this.n(p)} se declara en bancarrota.`, 'neg');
    const i = this.idx(p);
    this.propias(i).forEach(s => {
      if (s.of === 5) this.jets++; else this.mejoras += s.of;
      s.of = 0; if (a) s.dueno = this.idx(a); else { s.dueno = null; s.hip = false; }
    });
    if (a) { a.dinero += p.dinero; a.libres.push(...p.libres); }
    else for (const m of p.libres) this.mazos[m].push(LIBRE[m]);       // las tarjetas vuelven al final de su mazo
    p.dinero = 0; p.libres = []; p.gratis = 0; p.fuera = true;
    await this.comprobarFin();
  }
  // La partida termina con un solo jugador en pie, si ya no queda ninguna persona o al llegar al límite de rondas
  async comprobarFin(porRondas = false) {
    if (this.terminada) return true;
    const vivos = this.jug.filter(q => !q.fuera), humanos = this.jug.some(q => !q.bot);
    let g = null;
    if (vivos.length === 1) { g = vivos[0]; this.motivo = 'Único jugador que sigue en pie'; }
    else if (porRondas) { g = vivos.reduce((a, b) => (this.patrimonio(b) > this.patrimonio(a) ? b : a)); this.motivo = `Mayor patrimonio tras ${this.reglas.rondas} rondas`; }
    else if (humanos && !vivos.some(q => !q.bot)) { g = vivos.reduce((a, b) => (this.patrimonio(b) > this.patrimonio(a) ? b : a)); this.motivo = 'Ya no quedan personas en la partida: gana la CPU con más patrimonio'; }
    if (!g) return false;
    this.terminada = true; this.ganador = this.idx(g); this.h.render(); await this.h.fin(g, this.motivo); return true;
  }

  // ---------- subastas e intercambios ----------
  async subasta(s, desde) {
    const k = this.idx(desde) + 1, orden = [...this.jug.slice(k), ...this.jug.slice(0, k)].filter(q => !q.fuera);
    this.log(`Subasta de <b>${esc(s.nombre)}</b>.`);
    let puja = 0, gana = null; const fuera = new Set();
    for (;;) {
      let mov = false;
      for (const q of orden) {
        if (fuera.has(q) || q === gana) continue;
        if (q.dinero <= puja) { fuera.add(q); continue; }
        const b = q.bot ? this.ia.pujar(s, q, puja) : await this.h.puja(s, q, puja);
        if (Number.isInteger(b) && b > puja && b <= q.dinero) { puja = b; gana = q; mov = true; this.log(`${this.n(q)} puja ${b} M.`); } else fuera.add(q);
      }
      if (!mov || orden.every(q => fuera.has(q) || q === gana)) break;
    }
    if (gana) { gana.dinero -= puja; s.dueno = this.idx(gana); this.h.flash(gana, -puja); this.log(`${this.n(gana)} gana <b>${esc(s.nombre)}</b> por ${puja} M.`, 'compra'); this.h.render(); }
    else this.log('Nadie puja: sigue libre.');
  }
  // oferta: { da: [ids que entrega a], daM, daL: [tarjetas «sal de la Prisión» que entrega: 'souvenirs'|'retrasos'], pide: [ids que pide a b], pideM, pideL }
  ofertaValida(a, b, o) {
    const ent = v => Number.isInteger(v) && v >= 0;
    const libres = (ids, j) => Array.isArray(ids) && new Set(ids).size === ids.length && ids.every(i => this.c[i] && this.c[i].dueno === this.idx(j) && !this.zona(this.c[i]).some(x => x.of));
    const tarjetas = (l, j) => Array.isArray(l) && l.every(m => Object.hasOwn(MAZOS, m)) && Object.keys(MAZOS).every(m => l.filter(x => x === m).length <= j.libres.filter(x => x === m).length);
    return ent(o.daM) && ent(o.pideM) && o.daM <= a.dinero && o.pideM <= b.dinero && libres(o.da, a) && libres(o.pide, b) && tarjetas(o.daL, a) && tarjetas(o.pideL, b)
      && (o.da.length + o.pide.length + o.daL.length + o.pideL.length + o.daM + o.pideM) > 0;
  }
  async proponer(a, b, o) {
    o = { daL: [], pideL: [], ...o };
    if (!this.ofertaValida(a, b, o)) { if (a.bot) return false; await this.h.pregunta('Oferta no válida', 'Revisa la oferta: nadie puede dar más dinero ni más cosas de las que tiene, y no puede estar vacía.', ['Entendido']); return false; }
    const ok = b.bot ? this.ia.aceptar(b, o, a) : await this.h.aceptar(a, b, o);
    if (!ok) { this.log(`${this.n(b)} rechaza el trato de ${this.n(a)}.`); return false; }
    o.da.forEach(i => { this.c[i].dueno = this.idx(b); }); o.pide.forEach(i => { this.c[i].dueno = this.idx(a); });
    const quita = (j, l) => l.forEach(m => j.libres.splice(j.libres.indexOf(m), 1));
    quita(a, o.daL); quita(b, o.pideL); a.libres.push(...o.pideL); b.libres.push(...o.daL);
    a.dinero += o.pideM - o.daM; b.dinero += o.daM - o.pideM;
    this.log(`${this.n(a)} y ${this.n(b)} cierran un trato.`, 'compra'); this.h.render(); return true;
  }

  // ---------- movimiento ----------
  async tirar() { const a = d6(), b = d6(); await this.h.dados(a, b); this.log(`${this.n(this.p())} saca ${a} + ${b} = ${a + b}.`); return [a, b]; }
  async avanzar(p, n) {
    for (let i = 0; i < n; i++) {
      p.pos = (p.pos + 1) % TOTAL;
      if (p.pos === EMBARQUE) { this.log(`${this.n(p)} cobra ${SALARIO} M al pasar por Embarque.`, 'pos'); this.cobrar(p, SALARIO); }
      await this.h.paso(p);
    }
  }
  async irA(p, destino) { await this.avanzar(p, (destino - p.pos + TOTAL) % TOTAL); }          // viaja hacia delante, cobrando Embarque si pasa
  async saltar(p, destino) { p.pos = destino; await this.h.paso(p); }                          // se coloca sin pasar por las casillas intermedias
  async aPrision(p) {
    p.pos = PRISION; p.espera = true; p.intentos = 0; this.otra = false;
    this.log(`${this.n(p)} va a la Prisión Aduanera.`, 'neg'); await this.h.paso(p); this.h.render();
  }

  async jugarTurno() {
    const p = this.p();
    if (p.bot) { await this.ia.negociar(p); if (p.fuera || this.terminada) return; this.ia.gestionar(p); this.h.render(); }
    p.huelga = false;
    if (p.pierde) { p.pierde = false; this.log(`${this.n(p)} pierde este turno por el retraso.`, 'neg'); await this.siguiente(); return; }
    if (p.espera) {
      const op = [`Pagar ${FIANZA} M`]; if (p.libres.length) op.push('Usar tarjeta'); op.push('Intentar dobles');
      const c = await this.elegir(p, 'Prisión Aduanera', `${this.n(p)} está retenido en la Prisión Aduanera. ¿Cómo quiere salir?`, op);
      if (c === `Pagar ${FIANZA} M`) { await this.multa(p, FIANZA); if (!p.fuera) { p.espera = false; this.log(`${this.n(p)} paga ${FIANZA} M y sale.`); } }
      else if (c === 'Usar tarjeta') { const m = p.libres.shift(); this.mazos[m].push(LIBRE[m]); p.espera = false; this.log(`${this.n(p)} usa su tarjeta y sale gratis.`); }
      else {
        const [a, b] = await this.tirar();
        if (a === b) { p.espera = false; this.log('¡Dobles! Sale de la Prisión.'); await this.avanzar(p, a + b); await this.caer(p, a + b); }
        else if (++p.intentos >= 3) { this.log(`Tercer intento fallido: paga ${FIANZA} M.`); await this.multa(p, FIANZA); if (!p.fuera) { p.espera = false; await this.avanzar(p, a + b); await this.caer(p, a + b); } }
        else this.log('No saca dobles.');
        await this.siguiente(); return;
      }
    }
    let otra = true, n = 0; this.otra = false;
    while (otra && !p.fuera && !this.terminada && !p.espera) {
      const [a, b] = await this.tirar(); otra = a === b;
      if (otra && ++n === 3) { this.log('Tres dobles seguidos: ¡demasiado sospechoso!', 'neg'); await this.aPrision(p); break; }
      await this.avanzar(p, a + b); await this.caer(p, a + b);
      if (this.otra) { otra = true; this.otra = false; }
      if (otra && !p.fuera && !this.terminada && !p.espera) { if (!p.bot) await this.h.pregunta('¡Otra vez!', `${this.n(p)} tira de nuevo.`, ['Tirar de nuevo']); } else otra = false;
    }
    await this.siguiente();
  }
  async siguiente() {
    if (this.terminada) return;
    const antes = this.turno;
    do { this.turno = (this.turno + 1) % this.jug.length; } while (this.p().fuera);
    if (this.turno <= antes) {                                                   // ha dado la vuelta: nueva ronda
      this.ronda++;
      if (this.reglas.rondas && this.ronda > this.reglas.rondas) { this.ronda = this.reglas.rondas; await this.comprobarFin(true); return; }
    }
    this.h.render();
  }

  // ---------- casillas ----------
  async caer(p, tirada) {
    const s = this.c[p.pos];
    this.log(`${this.n(p)} cae en <b>${esc(s.nombre)}</b>.`);
    if (COMPRABLE.includes(s.tipo)) await this.caerCompra(p, s, tirada);
    else if (s.tipo === 'impuesto') { await this.h.aterriza(s, p, p.bot); this.log(`${this.n(p)} paga ${s.importe} M de ${esc(s.nombre)}.`, 'neg'); await this.multa(p, s.importe); }
    else if (s.tipo === 'carta') await this.robar(p, s.mazo);
    else if (s.tipo === 'esquina') {
      if (s.clave === 'control') { await this.h.aterriza(s, p, p.bot); this.log(`${this.n(p)} no pasa el Control de Seguridad.`, 'neg'); await this.aPrision(p); }
      else if (s.clave === 'paraiso') {
        await this.h.aterriza(s, p, p.bot);
        if (this.reglas.bote && this.bote) { this.log(`${this.n(p)} se lleva el bote del Paraíso Fiscal: ${this.bote} M.`, 'pos'); const v = this.bote; this.bote = 0; this.cobrar(p, v); }
      } else if (s.clave === 'prision') { await this.h.aterriza(s, p, p.bot); this.log(`${this.n(p)} visita la Prisión Aduanera: sin consecuencias.`); }
      else await this.h.aterriza(s, p, p.bot);
    }
  }
  async caerCompra(p, s, tirada, doble = false) {
    const yo = this.idx(p);
    if (s.dueno === null) {
      let compra = false;
      if (p.dinero >= s.precio) compra = p.bot ? this.ia.comprar(s, p) : await this.h.comprar(s, p);
      if (compra) { p.dinero -= s.precio; s.dueno = yo; this.log(`${this.n(p)} compra <b>${esc(s.nombre)}</b> por ${s.precio} M.`, 'compra'); this.h.flash(p, -s.precio); this.h.render(); }
      else { this.log(`${this.n(p)} no compra ${esc(s.nombre)}.`); if (this.reglas.subasta) await this.subasta(s, p); }
    } else if (s.dueno === yo) await this.h.aterriza(s, p, p.bot, { propia: true });
    else if (s.hip) await this.h.aterriza(s, p, p.bot, { hip: true });
    else {
      const o = this.jug[s.dueno];
      if (o.huelga) { await this.h.aterriza(s, p, p.bot, { huelga: true, a: o }); this.log(`${this.n(o)} está en huelga: no cobra el alquiler.`); return; }
      const r = this.alquiler(s, tirada || d6() + d6()) * (doble ? 2 : 1);
      await this.h.aterriza(s, p, p.bot, { alquiler: r, a: o });
      this.log(`${this.n(p)} paga ${r} M de alquiler a ${this.n(o)}.`, 'neg'); await this.pagar(p, r, o);
    }
  }
  async robar(p, mazo) {
    const lista = this.mazos[mazo], k = lista.shift(), c = MAZOS[mazo][k];
    if (!c.libre) lista.push(k);                       // la tarjeta de «sal de la Prisión» se queda en la mano hasta que se use o se negocie
    await this.h.carta(mazo, c, p.bot); this.log(`${this.n(p)} roba «${esc(c.t)}»: ${esc(c.e)}`);
    if (c.d > 0) this.cobrar(p, c.d);
    else if (c.d < 0) await this.multa(p, -c.d);
    else if (c.todos) { for (const q of this.jug) { if (q === p || q.fuera || p.fuera || this.terminada) continue; if (c.todos > 0) await this.pagar(q, c.todos, p); else await this.pagar(p, -c.todos, q); } }
    else if (c.porDestino) { const t = this.propias(this.idx(p)).filter(s => s.tipo === 'destino').length * c.porDestino; if (t) this.cobrar(p, t); else this.log('No tiene destinos: no cobra nada.'); }
    else if (c.porTerminal) { const t = this.propias(this.idx(p)).filter(s => s.tipo === 'terminal').length * c.porTerminal; if (t) this.cobrar(p, t); else this.log('No tiene terminales: no cobra nada.'); }
    else if (c.ir !== undefined) { await this.irA(p, c.ir); await this.caer(p, 0); }
    else if (c.avanza) { await this.avanzar(p, c.avanza); await this.caer(p, 0); }
    else if (c.atras) { await this.saltar(p, (p.pos + TOTAL - c.atras) % TOTAL); await this.caer(p, 0); }
    else if (c.terminal) { let d = p.pos; do { d = (d + TOTAL - 1) % TOTAL; } while (this.c[d].tipo !== 'terminal'); await this.saltar(p, d); await this.caer(p, 0); }
    else if (c.otra) this.otra = true;
    else if (c.mejora) {
      p.gratis++; this.log(`${this.n(p)} guarda una mejora de vuelo gratis: se aplica la próxima vez que mejore un destino.`, 'pos'); this.h.render();
    } else if (c.elige) {
      const d = p.bot ? this.ia.elegirCasilla(p) : await this.h.casilla(p);
      await this.irA(p, d); this.log(`${this.n(p)} viaja a <b>${esc(this.c[p.pos].nombre)}</b>.`); await this.caer(p, 0);
    } else if (c.embarque) { await this.saltar(p, EMBARQUE); if (c.cobra) { this.log(`${this.n(p)} cobra ${SALARIO} M.`, 'pos'); this.cobrar(p, SALARIO); } }
    else if (c.prision) await this.aPrision(p);
    else if (c.libre) p.libres.push(mazo);
    else if (c.pierdeTurno) p.pierde = true;
    else if (c.huelga) p.huelga = true;
    else if (c.averia) {
      const [pm, pj] = c.averia, t = this.propias(this.idx(p)).reduce((a, s) => a + (s.tipo !== 'destino' ? 0 : s.of === 5 ? pj : s.of * pm), 0);
      if (t) { this.log(`${this.n(p)} paga ${t} M de reparaciones.`, 'neg'); await this.multa(p, t); } else this.log(`${this.n(p)} no tiene mejoras: no paga nada.`);
    } else if (c.pierdeMejora) {
      const s = this.propias(this.idx(p)).filter(x => this.puedeBajar(x)).sort((a, b) => b.of - a.of)[0];
      if (s) { this.bajar(s, false); this.log(`${this.n(p)} pierde una mejora en ${esc(s.nombre)}.`, 'neg'); this.h.render(); } else { this.log(`${this.n(p)} no tiene mejoras: paga ${c.pierdeMejora} M.`, 'neg'); await this.multa(p, c.pierdeMejora); }
    }
  }
}

// ---------- validación de una partida guardada ----------
export function validar(d) {
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  if (!d || typeof d !== 'object' || d.v !== 2 || !Array.isArray(d.jug) || d.jug.length < 2 || d.jug.length > 4) return null;
  const n = d.jug.length, r = d.reglas || {};
  const reglas = { bote: !!r.bote, subasta: !!r.subasta, dinero: ent(r.dinero, 500, 5000) ? r.dinero : REGLAS.dinero, rondas: ent(r.rondas, 0, 500) ? r.rondas : 0 };
  const jug = d.jug.map(p => p && typeof p === 'object' && typeof p.nombre === 'string' && ent(p.k, 0, 3) && ent(p.dinero, 0, 1e7) && ent(p.pos, 0, TOTAL - 1) && ent(p.intentos, 0, 3)
    && Array.isArray(p.libres) && p.libres.length <= 2 && (p.gratis === undefined || ent(p.gratis, 0, 99)) && p.libres.every(m => Object.hasOwn(MAZOS, m))
    ? { nombre: p.nombre.slice(0, 14), k: p.k, bot: !!p.bot, dinero: p.dinero, pos: p.pos, espera: !!p.espera, intentos: p.intentos, libres: p.libres.slice(), gratis: p.gratis || 0, pierde: !!p.pierde, huelga: !!p.huelga, fuera: !!p.fuera } : null);
  if (jug.includes(null) || new Set(jug.map(p => p.k)).size !== n || !Array.isArray(d.c) || d.c.length !== TOTAL) return null;
  const c = d.c.map((x, i) => {
    if (!Array.isArray(x) || x.length !== 3) return null;
    const [dueno, of, hip] = x, s = CASILLAS[i];
    if (!COMPRABLE.includes(s.tipo)) return dueno === null && of === 0 && !hip ? x : null;
    if (!(dueno === null || ent(dueno, 0, n - 1)) || !ent(of, 0, s.tipo === 'destino' ? 5 : 0) || (dueno === null && (of || hip)) || (hip && of)) return null;
    return [dueno, of, !!hip];
  });
  if (c.includes(null)) return null;
  const mazo = (l, m) => Array.isArray(l) && l.every(k => ent(k, 0, MAZOS[m].length - 1)) && new Set(l).size === l.length ? l.slice() : null;
  const mazos = { souvenirs: mazo(d.mazos && d.mazos.souvenirs, 'souvenirs'), retrasos: mazo(d.mazos && d.mazos.retrasos, 'retrasos') };
  if (!mazos.souvenirs || !mazos.retrasos) return null;
  for (const m of Object.keys(MAZOS)) if (mazos[m].length + jug.reduce((t, p) => t + p.libres.filter(x => x === m).length, 0) !== MAZOS[m].length) return null;
  const mej = c.reduce((t, [, of]) => t + (of < 5 ? of : 0), 0), jets = c.filter(([, of]) => of === 5).length;
  if (!ent(d.turno, 0, n - 1) || jug[d.turno].fuera && !d.terminada || !ent(d.ronda, 1, 1e5) || !ent(d.bote, 0, 1e7) || d.mejoras !== MEJORAS - mej || d.jets !== JETS - jets) return null;
  if (jug.filter(p => !p.fuera).length < 1) return null;
  return { v: 2, jug, c, reglas, mazos, turno: d.turno, ronda: d.ronda, terminada: !!d.terminada, ganador: ent(d.ganador, -1, n - 1) ? d.ganador : -1,
    motivo: typeof d.motivo === 'string' ? d.motivo.slice(0, 120) : '', bote: d.bote, mejoras: d.mejoras, jets: d.jets };
}
