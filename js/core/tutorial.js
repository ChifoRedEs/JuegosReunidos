// Motor de tutoriales: una ventana con pasos (texto + dibujo + mini-ejercicio opcional) y utilidades para dibujar cartas y fichas.
// Cada tutorial vive en js/tutoriales/<id-del-juego>.js y exporta { titulo, pasos:[{ t, h, demo?, req? }] }.
//   t: título del paso · h: HTML del paso · demo(zona, ctx): monta un ejercicio dentro de `zona` y puede devolver { ver() } (botón «Muéstrame»)
//   req: true → no se puede pasar al siguiente hasta resolver el ejercicio (o pulsar «Muéstrame»)
//   ctx: { ok(msg), mal(msg), info(msg) } para dar respuesta al jugador.
import { esc } from './dom.js';

export function crearTutorial(def, { cerrar = () => {}, hecho = () => {} } = {}) {
  const raiz = document.createElement('div'); raiz.className = 'tt';
  let i = 0; const resuelto = new Set();
  const dibujar = () => {
    const p = def.pasos[i], ultimo = i === def.pasos.length - 1;
    raiz.innerHTML = `<div class="tt-cab"><b>🎓 ${esc(def.titulo)}</b><span>${i + 1} / ${def.pasos.length}</span></div>
      <div class="tt-pts" aria-hidden="true">${def.pasos.map((_, k) => `<i class="${k < i ? 'h' : k === i ? 'a' : ''}"></i>`).join('')}</div>
      <h3 class="tt-t">${p.t}</h3><div class="tt-h">${p.h || ''}</div><div class="tt-demo"></div><p class="tt-fb" role="status" aria-live="polite"></p>
      <div class="tt-nav"><button type="button" class="btn" data-t="ant" ${i ? '' : 'hidden'}>‹ Atrás</button><button type="button" class="btn" data-t="ver" hidden>👀 Muéstrame</button>
      <button type="button" class="btn on" data-t="sig">${ultimo ? '¡Listo!' : 'Siguiente ›'}</button></div>`;
    const fb = raiz.querySelector('.tt-fb'), bSig = raiz.querySelector('[data-t=sig]'), bVer = raiz.querySelector('[data-t=ver]');
    const bloquear = () => { bSig.disabled = !!p.req && !resuelto.has(i); };
    const ctx = {
      ok: m => { resuelto.add(i); fb.className = 'tt-fb bien'; fb.textContent = m || '✅ ¡Muy bien!'; bloquear(); },
      mal: m => { fb.className = 'tt-fb mal'; fb.textContent = m || '❌ Prueba otra vez.'; },
      info: m => { fb.className = 'tt-fb'; fb.textContent = m || ''; },
    };
    bloquear();
    if (p.demo) {
      let r = null; try { r = p.demo(raiz.querySelector('.tt-demo'), ctx); } catch (e) { console.error(e); }
      if (resuelto.has(i)) ctx.ok();
      if (r && r.ver) { bVer.hidden = false; bVer.onclick = () => { r.ver(); ctx.ok('👀 Así se hace. Ahora inténtalo tú si quieres, o sigue.'); }; }
    }
    raiz.querySelector('[data-t=ant]').onclick = () => { i--; dibujar(); raiz.scrollIntoView({ block: 'nearest' }); };
    bSig.onclick = () => { if (ultimo) { hecho(); cerrar(); } else { i++; dibujar(); } };
  };
  dibujar();
  return raiz;
}

/* ---------- utilidades para dibujar ---------- */
const PALOS = { oros: ['🪙', 'oros'], copas: ['🍷', 'copas'], espadas: ['⚔️', 'espadas'], bastos: ['🌿', 'bastos'] };
const NOM = { 8: 'Sota', 9: 'Caballo', 10: 'Rey', 1: 'As' };
// Carta española: n = 1..7, 10 sota, 11 caballo, 12 rey (como en la baraja de 40)
export function cartaEs(n, palo, extra = '') {
  const nom = { 10: 'Sota', 11: 'Caballo', 12: 'Rey' }[n] || String(n), corto = { 10: 'S', 11: 'C', 12: 'R' }[n] || n;
  return `<span class="tt-c p-${palo} ${extra}" title="${nom} de ${palo}"><b>${corto}</b><i>${PALOS[palo][0]}</i></span>`;
}
const FR = { picas: ['♠', 'n'], corazones: ['♥', 'r'], diamantes: ['♦', 'r'], treboles: ['♣', 'n'] };
export function cartaFr(n, palo, extra = '') {
  const r = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }[n] || n;
  return `<span class="tt-c fr ${FR[palo][1]} ${extra}"><b>${r}</b><i>${FR[palo][0]}</i></span>`;
}
const COL_FICHA = { rojo: '#E5383B', azul: '#2F6BFF', negro: '#222', naranja: '#F08A00' };
export const ficha = (n, color, extra = '') => `<span class="tt-f ${extra}" style="--fc:${COL_FICHA[color] || color}"><b>${n}</b></span>`;
export const fila = (html, cls = '') => `<div class="tt-fila ${cls}">${html}</div>`;

// Ejercicio «marca todas las que cumplan»: items [{ h, ok }]
export function marcar(zona, items, ctx, { boton = 'Comprobar', pista = '' } = {}) {
  zona.innerHTML = `<div class="tt-fila tt-sel">${items.map((it, k) => `<button type="button" class="tt-op" data-k="${k}">${it.h}</button>`).join('')}</div><div class="tt-fila"><button type="button" class="btn on" data-c>${boton}</button></div>`;
  const bt = [...zona.querySelectorAll('.tt-op')];
  bt.forEach(b => { b.onclick = () => { b.classList.toggle('sel'); ctx.info(''); }; });
  zona.querySelector('[data-c]').onclick = () => {
    const mal = items.findIndex((it, k) => bt[k].classList.contains('sel') !== !!it.ok);
    if (mal < 0) ctx.ok(); else ctx.mal(items[mal].ok ? '❌ Te falta alguna: esa también se puede jugar.' : (items[mal].por || '❌ Hay una marcada que no se puede.'));
  };
  return { ver: () => bt.forEach((b, k) => b.classList.toggle('sel', !!items[k].ok)) };
}
// Ejercicio «elige una»: opciones [{ h, ok, por }]
export function elige(zona, opciones, ctx) {
  zona.innerHTML = `<div class="tt-col">${opciones.map((o, k) => `<button type="button" class="tt-op l" data-k="${k}">${o.h}</button>`).join('')}</div>`;
  const bt = [...zona.querySelectorAll('.tt-op')];
  bt.forEach((b, k) => { b.onclick = () => { bt.forEach(x => x.classList.remove('sel')); b.classList.add('sel'); if (opciones[k].ok) ctx.ok(opciones[k].por || ''); else ctx.mal(opciones[k].por || '❌ No es esa.'); }; });
  return { ver: () => bt.forEach((b, k) => b.classList.toggle('sel', !!opciones[k].ok)) };
}
// Casilla que va cambiando de valor al tocarla: vacía → 1 → 2 … → max → vacía
export function ciclo(btn, max, cb = () => {}) {
  let v = 0; const pon = x => { v = x; btn.textContent = v || ''; };
  btn.onclick = () => { pon((v + 1) % (max + 1)); cb(v); };
  return { set: x => { pon(x); cb(v); }, get: () => v };
}
