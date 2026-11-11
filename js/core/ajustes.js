// Ajustes globales (tema, sonido, vibración) y preferencias por juego.
import { leer, escribir } from './storage.js';
const DEF = { tema: 'auto', sonido: true, vibracion: true, celebrar: true, fav: [], texto: 'normal', contraste: 'normal', anim: true, j: {} };
let A = { ...DEF, ...(leer('ajustes', {}) || {}) };
if (!A.j || typeof A.j !== 'object') A.j = {};
const guardar = () => escribir('ajustes', A);

export const ajustes = () => A;
export function set(k, v) { A[k] = v; guardar(); if (k === 'tema') aplicarTema(); aplicarAccesibilidad(); }
export const pref = (id, k, def) => (A.j[id] && A.j[id][k] !== undefined ? A.j[id][k] : def);
export function setPref(id, k, v) { A.j[id] = { ...(A.j[id] || {}), [k]: v }; guardar(); }
export function importar(o) {
  if (!o || typeof o !== 'object') return;
  if (['auto', 'claro', 'oscuro'].includes(o.tema)) A.tema = o.tema;
  if (typeof o.sonido === 'boolean') A.sonido = o.sonido;
  if (typeof o.vibracion === 'boolean') A.vibracion = o.vibracion;
  if (typeof o.celebrar === 'boolean') A.celebrar = o.celebrar;
  if (Array.isArray(o.fav)) A.fav = [...new Set(o.fav.filter(x => typeof x === 'string' && x.length < 40))].slice(0, 100);
  if (['normal', 'grande', 'enorme'].includes(o.texto)) A.texto = o.texto;
  if (['normal', 'alto'].includes(o.contraste)) A.contraste = o.contraste;
  if (typeof o.anim === 'boolean') A.anim = o.anim;
  if (o.j && typeof o.j === 'object') for (const [id, p] of Object.entries(o.j)) if (p && typeof p === 'object') {
    const antes = A.j[id] || {};
    A.j[id] = { ...p };
    // palabras aprendidas (Encadenadas): se suman a las que ya había en este dispositivo en vez de sustituirlas
    if (Array.isArray(antes.aprendidas) || Array.isArray(p.aprendidas))
      A.j[id].aprendidas = [...new Set([...(antes.aprendidas || []), ...(p.aprendidas || [])].filter(w => typeof w === 'string'))].slice(-500);
  }
  guardar(); aplicarTema(); aplicarAccesibilidad();
}
// Accesibilidad: tamaño del texto de paneles y listas, contraste alto y animaciones (los estilos están en css/pasaporte.css)
export function aplicarAccesibilidad() {
  const r = document.documentElement;
  if (A.texto && A.texto !== 'normal') r.dataset.texto = A.texto; else delete r.dataset.texto;
  if (A.contraste === 'alto') r.dataset.contraste = 'alto'; else delete r.dataset.contraste;
  if (A.anim === false) r.dataset.anim = 'no'; else delete r.dataset.anim;
}
aplicarAccesibilidad();
const mqOscuro = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
export function aplicarTema() {
  const r = document.documentElement;
  if (A.tema === 'auto') delete r.dataset.theme; else r.dataset.theme = A.tema === 'claro' ? 'light' : 'dark';
  const oscuro = A.tema === 'oscuro' || (A.tema === 'auto' && mqOscuro && mqOscuro.matches);
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = oscuro ? '#4B2DB8' : '#6A3DF0';
}
// En «Auto», si el sistema cambia de claro a oscuro con la app abierta, se actualiza también la barra del navegador.
if (mqOscuro && mqOscuro.addEventListener) mqOscuro.addEventListener('change', () => { if (A.tema === 'auto') aplicarTema(); });
