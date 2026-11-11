// Magnate Urbano · reglas. No toca el DOM: habla con la interfaz mediante `h` (hooks, todos asíncronos).
// Hooks: render, log(html, clase), paso(jugador), dados(a, b), flash(jugador, importe), pregunta(titulo, html, botones) → botón,
// carta(mazo, texto, auto), comprar(casilla, jugador) → bool, puja(casilla, jugador, actual) → importe, aceptar(a, b, oferta) → bool,
// gestionar(partida, jugador), fin(ganador, motivo).
import { GRUPOS, CASILLAS, NOTICIAS, TENDENCIAS, SALARIO, FIANZA, OFICINAS, SEDES, NUBE, RED, ESPERA, PARAISO, AUDITORIA } from './datos.js';

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const d6 = () => 1 + Math.floor(Math.random() * 6);
const barajar = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const REGLAS = { bote: true, subasta: true, dinero: 1600, rondas: 0 };   // rondas: 0 = sin límite
export const MAZOS = { noticias: NOTICIAS, tendencias: TENDENCIAS };
const COMPRABLE = ['empresa', 'nube', 'red'];

// ---------- IA de los bots ----------
class IA {
  constructor(g) { this.g = g; this.vetos = {}; }
  completa(s, p) { const g = this.g; return s.tipo === 'empresa' && g.grupo(s).every(x => x === s || x.dueno === g.idx(p)); }
  comprar(s, p) { return p.dinero - s.precio >= (this.completa(s, p) ? 0 : 150); }
  pujar(s, p, actual) { const max = Math.min(s.precio * (this.completa(s, p) ? 1.5 : .9), p.dinero - 100); return actual + 10 <= max ? actual + 10 : 0; }
  elegir(p, op) {
    if (op.includes('Usar pase')) return 'Usar pase';
    if (op.includes(`Pagar ${FIANZA}M`)) return p.dinero > 420 ? `Pagar ${FIANZA}M` : 'Intentar dobles';
    return op[0];
  }
  gestionar(p) {
    const g = this.g, i = g.idx(p);
    for (let n = 0; n < 40; n++) {
      const o = g.propias(i), u = o.find(s => s.hip && p.dinero > s.precio + 200 && g.puedeDeshipotecar(s));
      if (u) { g.deshipotecar(u); continue; }
      const b = o.filter(s => g.puedeConstruir(s) && p.dinero - GRUPOS[s.g].oficina >= 250).sort((a, c) => a.of - c.of)[0];
      if (!b) break; g.construir(b);
    }
  }
  reunir(p, importe) {      // vende oficinas e hipoteca hasta reunir el importe
    const g = this.g, i = g.idx(p);
    while (p.dinero < importe) {
      const o = g.propias(i), s = o.find(x => g.puedeVender(x));
      if (s) { g.vender(s); continue; }
      const m = o.filter(x => g.puedeHipotecar(x)).sort((a, b) => a.precio - b.precio)[0];
      if (!m) break; g.hipotecar(m);
    }
    return p.dinero >= importe;
  }
  // ¿Acepta el bot b la oferta? Valora más lo que le acerca a un grupo y pide más por lo que completaría el del otro
  aceptar(b, o, a) {
    const g = this.g, bi = g.idx(b), ai = g.idx(a), v = s => s.precio * (s.hip ? .5 : 1);
    const recibe = o.da.reduce((t, i) => { const s = g.c[i]; return t + v(s) * (s.tipo === 'empresa' && g.grupo(s).every(x => x.dueno === bi || o.da.includes(x.id)) ? 1.6 : 1); }, o.daM);
    const entrega = o.pide.reduce((t, i) => {
      const s = g.c[i], grupo = g.grupo(s);
      let m = s.tipo !== 'empresa' ? 1.3 : g.tieneGrupo(bi, s.g) ? 2.5 : grupo.some(x => x !== s && x.dueno === bi) ? 1.8 : 1.3;
      if (s.tipo === 'empresa' && grupo.every(x => x === s || x.dueno === ai || o.pide.includes(x.id))) m += .3;   // le completaría el grupo al otro
      return t + v(s) * m;
    }, o.pideM);
    return recibe >= entrega * 1.05 && b.dinero + o.daM - o.pideM >= 50;
  }
  // Al empezar su turno, el bot intenta comprar la empresa que le falta para completar un grupo (como mucho una oferta por turno)
  async negociar(p) {
    const g = this.g, i = g.idx(p);
    for (const k of Object.keys(GRUPOS)) {
      const grupo = g.c.filter(x => x.g === k), faltan = grupo.filter(x => x.dueno !== i);
      if (faltan.length !== 1 || grupo.some(x => x.of)) continue;
      const s = faltan[0]; if (s.dueno === null) continue;
      const b = g.jug[s.dueno], clave = `${i}>${s.id}`;
      if (b.fuera || (this.vetos[clave] || 0) >= g.ronda) continue;
      const oferta = Math.min(Math.round(s.precio * (1.5 + Math.random() * .6) / 10) * 10, p.dinero - 150);
      if (oferta < s.precio * 1.2) continue;
      const ok = await g.proponer(p, b, { da: [], daM: oferta, pide: [s.id], pideM: 0 });
      if (!ok) this.vetos[clave] = g.ronda + (b.bot ? 2 : 6);            // a las personas no se les vuelve a preguntar en 6 rondas
      return;
    }
  }
}

// ---------- partida ----------
export class Partida {
  constructor(jugadores, h, reglas = {}) {
    this.h = h; this.reglas = { ...REGLAS, ...reglas };
    this.jug = jugadores.map(j => ({ nombre: j.nombre, ficha: j.ficha, color: j.color, bot: !!j.bot, dinero: this.reglas.dinero, pos: 0, espera: false, intentos: 0, pases: [], fuera: false }));
    this.c = CASILLAS.map((s, i) => ({ ...s, id: i, dueno: null, of: 0, hip: false }));     // estado propio, sin tocar CASILLAS
    this.mazos = { noticias: barajar(NOTICIAS.map((_, i) => i)), tendencias: barajar(TENDENCIAS.map((_, i) => i)) };
    this.turno = 0; this.ronda = 1; this.terminada = false; this.ganador = -1; this.motivo = '';
    this.bote = 0; this.oficinas = OFICINAS; this.sedes = SEDES; this.ia = new IA(this);
  }
  toJSON() {
    return { v: 1, jug: this.jug.map(p => ({ ...p, pases: p.pases.slice() })), c: this.c.map(s => [s.dueno, s.of, s.hip]), reglas: this.reglas, mazos: this.mazos,
      turno: this.turno, ronda: this.ronda, terminada: this.terminada, ganador: this.ganador, motivo: this.motivo, bote: this.bote, oficinas: this.oficinas, sedes: this.sedes };
  }
  static desde(d, h) {
    const g = new Partida(d.jug, h, d.reglas);
    g.jug.forEach((p, i) => Object.assign(p, d.jug[i], { pases: d.jug[i].pases.slice() }));
    d.c.forEach(([dueno, of, hip], i) => Object.assign(g.c[i], { dueno, of, hip }));
    Object.assign(g, { mazos: { noticias: d.mazos.noticias.slice(), tendencias: d.mazos.tendencias.slice() }, turno: d.turno, ronda: d.ronda, terminada: d.terminada,
      ganador: d.ganador, motivo: d.motivo, bote: d.bote, oficinas: d.oficinas, sedes: d.sedes });
    return g;
  }
  p() { return this.jug[this.turno]; }
  idx(p) { return this.jug.indexOf(p); }
  n(p) { return `<b style="color:${p.color}">${esc(p.ficha)} ${esc(p.nombre)}</b>`; }
  log(m, c) { this.h.log(m, c); }
  propias(i) { return this.c.filter(s => s.dueno === i); }
  grupo(s) { return s.tipo === 'empresa' ? this.c.filter(x => x.g === s.g) : [s]; }
  tieneGrupo(i, g) { return this.c.filter(x => x.g === g).every(x => x.dueno === i); }
  patrimonio(p) { return p.dinero + this.propias(this.idx(p)).reduce((t, s) => t + (s.hip ? s.precio / 2 : s.precio) + (s.of ? s.of * GRUPOS[s.g].oficina : 0), 0); }
  elegir(p, t, x, op) { return p.bot ? Promise.resolve(this.ia.elegir(p, op)) : this.h.pregunta(t, x, op); }

  alquiler(s, tirada) {
    const suyas = this.propias(s.dueno);
    if (s.tipo === 'nube') return NUBE.alquiler[suyas.filter(x => x.tipo === 'nube').length - 1];
    if (s.tipo === 'red') return tirada * RED.veces[suyas.filter(x => x.tipo === 'red').length > 1 ? 1 : 0];
    if (s.of) return Math.round(s.alquiler * GRUPOS[s.g].mult[s.of - 1]);
    return this.tieneGrupo(s.dueno, s.g) ? s.alquiler * 2 : s.alquiler;
  }

  // ---------- oficinas (construcción uniforme, con límite del banco) e hipotecas ----------
  puedeConstruir(s) {
    return s.tipo === 'empresa' && s.dueno !== null && s.of < 5 && (s.of < 4 ? this.oficinas > 0 : this.sedes > 0) && this.tieneGrupo(s.dueno, s.g)
      && this.grupo(s).every(x => !x.hip && x.of >= s.of) && this.jug[s.dueno].dinero >= GRUPOS[s.g].oficina;
  }
  construir(s) { this.jug[s.dueno].dinero -= GRUPOS[s.g].oficina; if (s.of < 4) this.oficinas--; else { this.sedes--; this.oficinas += 4; } s.of++; }
  puedeVender(s) { return s.of > 0 && this.grupo(s).every(x => x.of <= s.of) && (s.of < 5 || this.oficinas >= 4); }
  vender(s) { this.jug[s.dueno].dinero += GRUPOS[s.g].oficina / 2; if (s.of === 5) { this.sedes++; this.oficinas -= 4; } else this.oficinas++; s.of--; }
  puedeHipotecar(s) { return s.dueno !== null && !s.hip && this.grupo(s).every(x => !x.of); }
  hipotecar(s) { this.jug[s.dueno].dinero += s.precio / 2; s.hip = true; }
  costeDeshipotecar(s) { return Math.ceil(s.precio * .55); }
  puedeDeshipotecar(s) { return s.hip && this.jug[s.dueno].dinero >= this.costeDeshipotecar(s); }
  deshipotecar(s) { this.jug[s.dueno].dinero -= this.costeDeshipotecar(s); s.hip = false; }

  // ---------- dinero ----------
  async pagar(p, importe, a) {
    while (p.dinero < importe && !p.fuera) {
      if (p.bot) { if (!this.ia.reunir(p, importe)) await this.quiebra(p, a); this.h.render(); continue; }
      const c = await this.h.pregunta('Fondos insuficientes', `${this.n(p)} debe ${importe}M y solo tiene ${p.dinero}M. Vende oficinas o hipoteca empresas para reunirlo.`, ['Gestionar empresas', 'Declarar bancarrota']);
      if (c === 'Gestionar empresas') await this.h.gestionar(this, p); else await this.quiebra(p, a);
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
      if (s.of === 5) this.sedes++; else this.oficinas += s.of;
      s.of = 0; if (a) s.dueno = this.idx(a); else { s.dueno = null; s.hip = false; }
    });
    if (a) { a.dinero += p.dinero; a.pases.push(...p.pases); }
    else for (const m of p.pases) this.mazos[m].push(MAZOS[m].findIndex(c => c.libre));       // los pases vuelven a su mazo
    p.dinero = 0; p.pases = []; p.fuera = true;
    await this.comprobarFin();
  }
  // La partida termina con un solo jugador en pie, si ya no queda ninguna persona o al llegar al límite de rondas
  async comprobarFin(porRondas = false) {
    if (this.terminada) return true;
    const vivos = this.jug.filter(q => !q.fuera), humanos = this.jug.some(q => !q.bot);
    let g = null;
    if (vivos.length === 1) { g = vivos[0]; this.motivo = 'Único jugador que sigue en pie'; }
    else if (porRondas) { g = vivos.reduce((a, b) => (this.patrimonio(b) > this.patrimonio(a) ? b : a)); this.motivo = `Mayor patrimonio tras ${this.reglas.rondas} rondas`; }
    else if (humanos && !vivos.some(q => !q.bot)) { g = vivos.reduce((a, b) => (this.patrimonio(b) > this.patrimonio(a) ? b : a)); this.motivo = 'Ya no quedan personas en la partida: gana el bot con más patrimonio'; }
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
        if (Number.isInteger(b) && b > puja && b <= q.dinero) { puja = b; gana = q; mov = true; this.log(`${this.n(q)} puja ${b}M.`); } else fuera.add(q);
      }
      if (!mov || orden.every(q => fuera.has(q) || q === gana)) break;
    }
    if (gana) { gana.dinero -= puja; s.dueno = this.idx(gana); this.h.flash(gana, -puja); this.log(`${this.n(gana)} gana <b>${esc(s.nombre)}</b> por ${puja}M.`, 'compra'); this.h.render(); }
    else this.log('Nadie puja: la empresa sigue libre.');
  }
  // oferta: { da: [ids que entrega a], daM: dinero que entrega a, pide: [ids que pide a b], pideM }
  ofertaValida(a, b, o) {
    const ent = v => Number.isInteger(v) && v >= 0;
    const libres = (ids, j) => ids.every(i => this.c[i] && this.c[i].dueno === this.idx(j) && !this.grupo(this.c[i]).some(x => x.of));
    return ent(o.daM) && ent(o.pideM) && o.daM <= a.dinero && o.pideM <= b.dinero && libres(o.da, a) && libres(o.pide, b) && (o.da.length + o.pide.length + o.daM + o.pideM) > 0;
  }
  async proponer(a, b, o) {
    if (!this.ofertaValida(a, b, o)) { if (a.bot) return false; await this.h.pregunta('Oferta no válida', 'Revisa los importes: nadie puede dar más dinero del que tiene, y la oferta no puede estar vacía.', ['Entendido']); return false; }
    const ok = b.bot ? this.ia.aceptar(b, o, a) : await this.h.aceptar(a, b, o);
    if (!ok) { this.log(`${this.n(b)} rechaza el intercambio de ${this.n(a)}.`); return false; }
    o.da.forEach(i => { this.c[i].dueno = this.idx(b); }); o.pide.forEach(i => { this.c[i].dueno = this.idx(a); });
    a.dinero += o.pideM - o.daM; b.dinero += o.daM - o.pideM;
    this.log(`${this.n(a)} y ${this.n(b)} cierran un intercambio.`, 'compra'); this.h.render(); return true;
  }

  // ---------- movimiento ----------
  async tirar() { const a = d6(), b = d6(); await this.h.dados(a, b); this.log(`${this.n(this.p())} saca ${a} + ${b} = ${a + b}.`); return [a, b]; }
  async avanzar(p, n) {
    for (let i = 0; i < n; i++) {
      p.pos = (p.pos + 1) % 40;
      if (!p.pos) { this.log(`${this.n(p)} cobra ${SALARIO}M al pasar por la Ronda de Inversión.`, 'pos'); this.cobrar(p, SALARIO); }
      await this.h.paso(p);
    }
  }
  async aAuditoria(p) {
    p.pos = ESPERA; p.espera = true; p.intentos = 0;
    this.log(`${this.n(p)} va a la Auditoría Fiscal.`, 'neg'); await this.h.paso(p); this.h.render();
  }

  async jugarTurno() {
    const p = this.p();
    if (p.bot) { await this.ia.negociar(p); if (p.fuera || this.terminada) return; this.ia.gestionar(p); this.h.render(); }
    if (p.espera) {
      const op = [`Pagar ${FIANZA}M`]; if (p.pases.length) op.push('Usar pase'); op.push('Intentar dobles');
      const c = await this.elegir(p, 'Auditoría Fiscal', `${this.n(p)} está retenido en la Auditoría. ¿Cómo quiere salir?`, op);
      if (c === `Pagar ${FIANZA}M`) { await this.multa(p, FIANZA); if (!p.fuera) { p.espera = false; this.log(`${this.n(p)} paga ${FIANZA}M y sale.`); } }
      else if (c === 'Usar pase') { const m = p.pases.shift(); this.mazos[m].push(MAZOS[m].findIndex(x => x.libre)); p.espera = false; this.log(`${this.n(p)} usa su pase y sale.`); }
      else {
        const [a, b] = await this.tirar();
        if (a === b) { p.espera = false; this.log('¡Dobles! Sale de la Auditoría.'); await this.avanzar(p, a + b); await this.caer(p, a + b); }
        else if (++p.intentos >= 3) { this.log(`Tercer intento fallido: paga ${FIANZA}M.`); await this.multa(p, FIANZA); if (!p.fuera) { p.espera = false; await this.avanzar(p, a + b); await this.caer(p, a + b); } }
        else this.log('No saca dobles.');
        await this.siguiente(); return;
      }
    }
    let otra = true, n = 0;
    while (otra && !p.fuera && !this.terminada && !p.espera) {
      const [a, b] = await this.tirar(); otra = a === b;
      if (otra && ++n === 3) { this.log('Tres dobles seguidos: ¡demasiado sospechoso!', 'neg'); await this.aAuditoria(p); break; }
      await this.avanzar(p, a + b); await this.caer(p, a + b);
      if (otra && !p.fuera && !this.terminada && !p.espera) { if (!p.bot) await this.h.pregunta('¡Dobles!', `${this.n(p)} tira otra vez.`, ['Tirar de nuevo']); } else otra = false;
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
    if (COMPRABLE.includes(s.tipo)) await this.caerEmpresa(p, s, tirada);
    else if (s.tipo === 'impuesto') { this.log(`${this.n(p)} paga ${s.importe}M de ${esc(s.nombre)}.`, 'neg'); await this.multa(p, s.importe); }
    else if (s.tipo === 'noticias' || s.tipo === 'tendencias') await this.robar(p, s.tipo);
    else if (s.id === AUDITORIA) await this.aAuditoria(p);
    else if (s.id === PARAISO && this.reglas.bote && this.bote) { this.log(`${this.n(p)} se lleva el bote del Paraíso Fiscal: ${this.bote}M.`, 'pos'); const v = this.bote; this.bote = 0; this.cobrar(p, v); }
  }
  async caerEmpresa(p, s, tirada, doble = false) {
    const yo = this.idx(p);
    if (s.dueno === null) {
      let compra = false;
      if (p.dinero >= s.precio) compra = p.bot ? this.ia.comprar(s, p) : await this.h.comprar(s, p);
      if (compra) { p.dinero -= s.precio; s.dueno = yo; this.log(`${this.n(p)} compra <b>${esc(s.nombre)}</b> por ${s.precio}M.`, 'compra'); this.h.flash(p, -s.precio); this.h.render(); }
      else { this.log(`${this.n(p)} no compra ${esc(s.nombre)}.`); if (this.reglas.subasta) await this.subasta(s, p); }
    } else if (s.dueno !== yo && !s.hip) {
      const o = this.jug[s.dueno], r = this.alquiler(s, tirada || d6() + d6()) * (doble ? 2 : 1);
      this.log(`${this.n(p)} paga ${r}M de alquiler a ${this.n(o)}.`, 'neg'); await this.pagar(p, r, o);
    }
  }
  async robar(p, mazo) {
    const lista = this.mazos[mazo], k = lista.shift(), c = MAZOS[mazo][k];
    if (!c.libre) lista.push(k);                       // el pase se queda en la mano del jugador hasta que lo use
    await this.h.carta(mazo, c.t, p.bot); this.log(`${this.n(p)} roba: ${esc(c.t)}`);
    if (c.d > 0) this.cobrar(p, c.d);
    else if (c.d < 0) await this.multa(p, -c.d);
    else if (c.ir !== undefined) { await this.avanzar(p, (c.ir - p.pos + 40) % 40); await this.caer(p, 0); }
    else if (c.atras) { p.pos = (p.pos + 40 - c.atras) % 40; await this.h.paso(p); await this.caer(p, 0); }
    else if (c.auditoria) await this.aAuditoria(p);
    else if (c.libre) p.pases.push(mazo);
    else if (c.nube) {
      let n = 1; while (this.c[(p.pos + n) % 40].tipo !== 'nube') n++;
      await this.avanzar(p, n); const s = this.c[p.pos]; this.log(`${this.n(p)} llega a <b>${esc(s.nombre)}</b>.`); await this.caerEmpresa(p, s, 0, true);
    } else if (c.obras) {
      const [po, ps] = c.obras, mias = this.propias(this.idx(p)), t = mias.reduce((a, s) => a + (s.of === 5 ? ps : s.of * po), 0);
      if (t) { this.log(`${this.n(p)} paga ${t}M en obras.`, 'neg'); await this.multa(p, t); } else this.log(`${this.n(p)} no tiene oficinas: no paga nada.`);
    } else if (c.todos) for (const q of this.jug) { if (q === p || q.fuera || p.fuera || this.terminada) continue; if (c.todos > 0) await this.pagar(q, c.todos, p); else await this.pagar(p, -c.todos, q); }
  }
}

// ---------- validación de una partida guardada ----------
export function validar(d) {
  const ent = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  if (!d || typeof d !== 'object' || d.v !== 1 || !Array.isArray(d.jug) || d.jug.length < 2 || d.jug.length > 4) return null;
  const n = d.jug.length, r = d.reglas || {};
  const reglas = { bote: !!r.bote, subasta: !!r.subasta, dinero: ent(r.dinero, 500, 5000) ? r.dinero : REGLAS.dinero, rondas: ent(r.rondas, 0, 500) ? r.rondas : 0 };
  const jug = d.jug.map(p => p && typeof p === 'object' && typeof p.nombre === 'string' && typeof p.ficha === 'string' && /^#[0-9a-f]{6}$/i.test(p.color)
    && ent(p.dinero, 0, 1e7) && ent(p.pos, 0, 39) && ent(p.intentos, 0, 3) && Array.isArray(p.pases) && p.pases.length <= 2 && p.pases.every(m => Object.hasOwn(MAZOS, m))
    ? { nombre: p.nombre.slice(0, 14), ficha: p.ficha.slice(0, 16), color: p.color, bot: !!p.bot, dinero: p.dinero, pos: p.pos, espera: !!p.espera, intentos: p.intentos, pases: p.pases.slice(), fuera: !!p.fuera } : null);
  if (jug.includes(null) || !Array.isArray(d.c) || d.c.length !== 40) return null;
  const c = d.c.map((x, i) => {
    if (!Array.isArray(x) || x.length !== 3) return null;
    const [dueno, of, hip] = x, s = CASILLAS[i];
    if (!COMPRABLE.includes(s.tipo)) return dueno === null && of === 0 && !hip ? x : null;
    if (!(dueno === null || ent(dueno, 0, n - 1)) || !ent(of, 0, s.tipo === 'empresa' ? 5 : 0) || (dueno === null && (of || hip)) || (hip && of)) return null;
    return [dueno, of, !!hip];
  });
  if (c.includes(null)) return null;
  const mazo = (l, m) => Array.isArray(l) && l.every(k => ent(k, 0, MAZOS[m].length - 1)) && new Set(l).size === l.length ? l.slice() : null;
  const mazos = { noticias: mazo(d.mazos && d.mazos.noticias, 'noticias'), tendencias: mazo(d.mazos && d.mazos.tendencias, 'tendencias') };
  if (!mazos.noticias || !mazos.tendencias) return null;
  for (const m of Object.keys(MAZOS)) if (mazos[m].length + jug.reduce((t, p) => t + p.pases.filter(x => x === m).length, 0) !== MAZOS[m].length) return null;
  const ofi = c.reduce((t, [, of]) => t + (of < 5 ? of : 0), 0), sed = c.filter(([, of]) => of === 5).length;
  if (!ent(d.turno, 0, n - 1) || jug[d.turno].fuera && !d.terminada || !ent(d.ronda, 1, 1e5) || !ent(d.bote, 0, 1e7) || d.oficinas !== OFICINAS - ofi || d.sedes !== SEDES - sed) return null;
  if (jug.filter(p => !p.fuera).length < 1) return null;
  return { v: 1, jug, c, reglas, mazos, turno: d.turno, ronda: d.ronda, terminada: !!d.terminada, ganador: ent(d.ganador, -1, n - 1) ? d.ganador : -1,
    motivo: typeof d.motivo === 'string' ? d.motivo.slice(0, 120) : '', bote: d.bote, oficinas: d.oficinas, sedes: d.sedes };
}
