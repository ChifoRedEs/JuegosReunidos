// Guerra de Orugas · CPU. Elige el disparo simulando la misma física que el juego (viento, rebotes, mecha) y lo ejecuta como una persona:
// mueve el gusano, gira el punto de mira, carga la potencia y dispara. Sin DOM (se prueba con Node).
// La planificación es un generador: cada `yield` cede el control, así la CPU piensa por trozos sin congelar la pantalla.
import * as M from './motor.js';

const ERR = [{ ang: 9, pot: .18 }, { ang: 3.2, pot: .07 }, { ang: .8, pot: .02 }];   // fallo de puntería por nivel
const ARMAS_NIVEL = [['misil', 'granada', 'escopeta'], ['misil', 'granada', 'racimo', 'escopeta', 'aereo'], ['misil', 'granada', 'racimo', 'sagrada', 'escopeta', 'aereo', 'dinamita']];

function simular(sim, w, arma, ang, pot, temp) {
  sim.snd.length = 0; sim.fx.length = 0;
  const p = M.crearLanzamiento(w, arma, ang, pot, temp);
  for (let i = 0; i < 300; i++) { const r = M.avanzarProy(sim, p, 1 / 40); if (r) return r.fuera ? null : r; }
  return null;
}
function puntuar(S, w, x, y, E, pesoPropio = 1) {
  let sc = 0; const rd = E.r * 1.9;
  for (const g of S.gus) {
    if (!g.vivo) continue; const c = M.centro(g), d = Math.hypot(c.x - x, c.y - y) - 6; if (d >= rd) continue;
    const dm = E.d * (1 - Math.max(0, d) / rd);
    if (g.eq === w.eq) sc -= dm * (g.id === w.id ? 1.7 * pesoPropio : 1.25); else sc += dm + (dm >= g.hp ? 22 : 0);
  }
  return sc;
}
function rayo(S, w, ang) {
  const d = M.dirApunte(w, ang), c = { x: w.x, y: w.y - 10 };
  for (let s = 12; s <= 340; s += 3) {
    const px = c.x + d.x * s, py = c.y + d.y * s;
    for (const o of S.gus) { if (!o.vivo || o.id === w.id) continue; const oc = M.centro(o); if (Math.abs(oc.x - px) < 8 && Math.abs(oc.y - py) < 10) return o; }
    if (M.solido(S, px, py)) return null;
  }
  return null;
}
export function planificar(S, nivel = 1) { const g = planGen(S, nivel); let r; while (!(r = g.next()).done); return r.value; }
function* planGen(S, nivel = 1) {
  let cuenta = 0;
  const T = S.turno, w = M.activo(S), yo = T.eq, sim = { ...S, snd: [], fx: [] };
  const permitidas = ARMAS_NIVEL[nivel].filter(id => M.municion(S, yo, id) > 0);
  const enemigos = S.gus.filter(g => g.vivo && g.eq !== yo).sort((a, b) => Math.abs(a.x - w.x) - Math.abs(b.x - w.x));
  if (!enemigos.length) return { sc: -1e9 };
  const hacia = enemigos[0].x >= w.x ? 1 : -1, dirs = nivel >= 2 ? [hacia, -hacia] : [hacia];
  let mejor = { sc: -1e9 };
  const probar = (sc, plan) => { if (sc > mejor.sc) mejor = { sc, ...plan }; };
  for (const dir of dirs) {
    const wd = { ...w, dir };
    for (const id of permitidas) {
      if (id === 'misil' || id === 'granada' || id === 'racimo' || id === 'sagrada') {
        const temps = id === 'misil' ? [3] : nivel === 0 ? [3] : [2, 4];
        for (const temp of temps) for (let ang = -25; ang <= 82; ang += 5) for (let pot = .3; pot <= 1.001; pot += .08) {
          if (++cuenta % 40 === 0) yield;
          const pt = simular(sim, wd, id, ang, pot, temp); if (!pt) continue;
          let sc = puntuar(S, w, pt.x, pt.y, M.EXPL[id]); if (id === 'racimo') sc *= 1.25;
          probar(sc - (id === 'sagrada' ? 4 : 0), { arma: id, ang, pot, temp, dir });
        }
      } else if (id === 'escopeta') {
        for (let ang = -45; ang <= 82; ang += 3) { const o = rayo(S, wd, ang); if (o) probar(o.eq === yo ? -40 : 38 + (o.hp <= 25 ? 22 : 0), { arma: 'escopeta', ang, pot: 0, dir }); }
      }
    }
  }
  for (const id of permitidas) {
    if (id === 'dinamita') {
      for (const e of enemigos) if (Math.abs(e.x - w.x) < 70 && Math.abs(e.y - w.y) < 34) { const dir = e.x > w.x ? 1 : -1; probar(puntuar(S, w, w.x + dir * 7, w.y - 9, M.EXPL.dinamita, 0) * .9, { arma: 'dinamita', ang: 0, pot: 0, dir }); }
    } else if (id === 'aereo') {
      for (const e of enemigos.slice(0, 5)) {
        const dir = e.x < S.W / 2 ? 1 : -1; let sc = 0;
        for (let k = 0; k < 5; k++) { const bx = e.x + (k - 2) * 42 + dir * 40; sc += puntuar(S, w, bx, M.superficie(S, bx, 0) - 4, M.EXPL.bomba); }
        probar(sc - 6, { arma: 'aereo', ang: 0, pot: 0, obj: { x: e.x, y: e.y } });
      }
    }
  }
  return mejor;
}
const sumaAngulo = (a, b, paso) => (Math.abs(b - a) <= paso ? b : a + Math.sign(b - a) * paso);

export function crearPiloto(S, nivel = 1, r = Math.random) {
  let turnoId = -1, plan = null, gen = null, modo = 'espera', t = 0, reub = 0, camina = 0, dirCam = 1, huye = 0, dirHuye = 1, tiros = 0;
  function nuevo() { turnoId = S.turnos; plan = null; gen = null; modo = 'pensar'; t = .5 + r() * .7; reub = 0; camina = 0; huye = 0; tiros = 0; }
  function precipicio(w, dir) {   // ¿hay suelo cerca a un paso de distancia?
    const x = w.x + dir * 14; for (let y = w.y - 28; y <= w.y + 36; y++) if (M.solido(S, x, y) && !M.solido(S, x, y - 1)) return y < S.agua - 16;
    return false;
  }
  function andar(w, dir, dt) {
    if (!precipicio(w, dir)) return false;
    if (!M.caminar(S, dir, dt) && !w.vuela) M.saltar(S, 'adelante'); return true;
  }
  return {
    get modo() { return modo; },
    tick(dt) {
      const Tn = S.turno, w = M.activo(S);
      if (Tn.fase === 'cambio' || Tn.fase === 'fin' || !w || !w.vivo) { modo = 'espera'; return; }
      if (turnoId !== S.turnos) nuevo();
      if (Tn.fase === 'resolver') return;
      if (Tn.fase === 'retirada') { if (huye > 0) { huye -= dt; andar(w, dirHuye, dt); } return; }
      t -= dt;
      if (modo === 'pensar') {
        if (t > 0) return;
        if (w.vuela && w.est !== 'cuerda') { t = .2; return; }
        gen = planGen(S, nivel); modo = 'calculando'; return;
      }
      if (modo === 'calculando') {
        const lim = performance.now() + 6; let res = null;
        while (performance.now() < lim) { res = gen.next(); if (res.done) break; }
        if (!res || !res.done) return;
        plan = res.value; gen = null; modo = 'decidir'; return;
      }
      if (modo === 'decidir') {
        const lejos = plan.sc < 9 && reub < 3;
        if (lejos) {
          const en = S.gus.filter(g => g.vivo && g.eq !== Tn.eq).sort((a, b) => Math.abs(a.x - w.x) - Math.abs(b.x - w.x))[0];
          if (en) { dirCam = en.x >= w.x ? 1 : -1; camina = .9 + r() * .9; reub++; modo = 'caminar'; return; }
        }
        if (plan.sc <= 0 && nivel > 0 && M.municion(S, Tn.eq, 'tele') > 0 && r() < .6) {
          const en = S.gus.filter(g => g.vivo && g.eq !== Tn.eq)[0];
          if (en) { const x = Math.max(30, Math.min(S.W - 30, en.x + (r() < .5 ? -1 : 1) * (110 + r() * 80))), y = Math.max(30, M.superficie(S, x, 0) - 24); M.elegirArma(S, 'tele'); M.fijarObjetivo(S, x, y); M.disparar(S); return; }
        }
        if (!plan.arma || plan.sc <= 0) { const o = S.gus.find(g => g.vivo && g.eq !== Tn.eq); if (!o || plan.sc < -15) { M.terminarTurno(S); return; } plan = plan.arma ? plan : { arma: 'misil', ang: 35, pot: .6, dir: o.x >= w.x ? 1 : -1, sc: 0 }; }
        M.elegirArma(S, plan.arma); if (plan.temp) M.ajustarTemp(S, plan.temp);
        if (plan.dir) M.dirigir(S, plan.dir);
        if (plan.arma !== 'aereo' && plan.arma !== 'dinamita') { const e = ERR[nivel]; plan = { ...plan, ang: plan.ang + (r() * 2 - 1) * e.ang, pot: Math.max(.1, Math.min(1, plan.pot * (1 + (r() * 2 - 1) * e.pot))) }; }
        modo = 'apuntar'; t = .4; return;
      }
      if (modo === 'caminar') { camina -= dt; andar(w, dirCam, dt); if (camina <= 0 || t <= -6) { modo = 'pensar'; t = .35; } return; }
      if (modo === 'apuntar') {
        if (plan.arma === 'aereo') { M.fijarObjetivo(S, plan.obj.x, plan.obj.y); modo = 'disparo'; t = .5; return; }
        if (plan.arma === 'dinamita') { modo = 'disparo'; t = .4; return; }
        const nuevaAng = sumaAngulo(Tn.ang, plan.ang, 70 * dt); M.apuntar(S, nuevaAng - Tn.ang);
        if (Math.abs(Tn.ang - plan.ang) < .6) { modo = plan.arma === 'escopeta' ? 'disparo' : 'cargar'; t = .3; }
        return;
      }
      if (modo === 'cargar') { if (t > 0) return; Tn.pot = Math.min(1, Tn.pot + dt * .9); if (Tn.pot >= plan.pot) { modo = 'disparo'; t = 0; } return; }
      if (modo === 'disparo') {
        if (t > 0) return;
        const arma = plan.arma; M.disparar(S, arma === 'misil' || arma === 'granada' || arma === 'racimo' || arma === 'sagrada' ? Math.max(.05, Tn.pot) : 0); tiros++;
        if (arma === 'escopeta' && Tn.fase === 'turno' && tiros < 2) { modo = 'pensar'; t = .6; return; }
        if (arma === 'dinamita') { huye = 3.4; dirHuye = plan.dir ? -plan.dir : -w.dir; }
        modo = 'hecho'; return;
      }
    },
  };
}
