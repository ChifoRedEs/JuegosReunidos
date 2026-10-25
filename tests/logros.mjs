// Pruebas de los logros: node tests/logros.mjs
import { definiciones } from '../js/core/logros.js';
let f = 0; const t = (n, c) => { if (!c) { f++; console.log('✗', n); } else console.log('✓', n); };
const cat = { logica: ['a', 'b'], tablero: ['c'], cartas: ['d'], palabras: ['e'], arcade: ['f'] };
const D = definiciones(cat);
t('50 logros', D.length === 50);
t('ids únicos y válidos', new Set(D.map(d => d.id)).size === 50 && D.every(d => /^[a-z0-9]{1,20}$/.test(d.id)));
t('con textos e icono', D.every(d => d.nombre && d.desc && d.icono));
t('ninguno se cumple sin datos', D.every(d => { try { return !d.cumple({}); } catch { return false; } }));
const S = (o = {}) => ({ partidas: 0, victorias: 0, derrotas: 0, tablas: 0, racha: 0, mejorRacha: 0, tiempos: {}, records: {}, ...o });
const T = { a: S({ partidas: 60, victorias: 45, mejorRacha: 21, tiempos: { x: 10, y: 20, z: 30, w: 40, v: 50 } }), b: S({ partidas: 1 }), c: S({ partidas: 1, victorias: 1 }), d: S({ partidas: 1 }), e: S({ partidas: 1 }), f: S({ partidas: 1, records: { g: 31000 } }) };
const ok = id => D.find(d => d.id === id).cumple(T);
t('lógicas concretas', ok('racha20') && ok('esp25') && ok('punteria') && ok('rayo') && ok('niveles5') && ok('arcade30k') && ok('todologica') && !ok('gana10') && ok('imbatible') && !ok('p500'));
console.log(f ? `${f} FALLOS` : 'Todo OK'); process.exit(f ? 1 : 0);
