// Ejecuta la IA de un juego en un Worker (core/ia/trabajador.js) y devuelve una promesa con la jugada.
// Si el navegador no admite Workers de módulos (o falla algo), se ejecuta en el hilo principal como antes.
//   const m = await enSegundoPlano(urlDelModulo, 'nombreFuncion', [args…], funcionLocal);
let w = null, roto = false, n = 0;
const pend = new Map();
function trabajador() {
  if (w || roto) return w;
  try {
    w = new Worker(new URL('./trabajador.js', import.meta.url), { type: 'module' });
    w.onmessage = e => { const p = pend.get(e.data.id); if (!p) return; pend.delete(e.data.id); if (e.data.error) p.fallo(e.data.error); else p.ok(e.data.r); };
    w.onerror = () => { roto = true; w = null; for (const p of pend.values()) p.fallo('worker'); pend.clear(); };
  } catch { roto = true; w = null; }
  return w;
}
export function enSegundoPlano(mod, fn, args, local) {
  const t = trabajador();
  if (!t) return Promise.resolve().then(() => local(...args));
  return new Promise(res => {
    const id = ++n;
    pend.set(id, { ok: res, fallo: () => { roto = true; res(local(...args)); } });   // si el Worker falla, se calcula aquí
    t.postMessage({ id, mod: String(mod), fn, args });
  });
}
