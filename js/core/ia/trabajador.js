// Worker genérico para las IA de tablero: importa el módulo de reglas indicado y ejecuta una de sus funciones.
// Así la CPU «piensa» sin congelar la pantalla. Lo usa core/ia/remoto.js.
const cache = new Map();
self.onmessage = async e => {
  const { id, mod, fn, args } = e.data;
  try {
    if (!cache.has(mod)) cache.set(mod, import(mod));
    const m = await cache.get(mod);
    self.postMessage({ id, r: m[fn](...args) });
  } catch (err) { self.postMessage({ id, error: String(err && err.message || err) }); }
};
