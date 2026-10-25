import * as F from '../js/core/fichas.js';
let ok = 0; const t = (n, f) => { try { f(); ok++; console.log('✓', n); } catch (e) { console.log('✗', n, e.message); process.exitCode = 1; } };
const aser = (c, m) => { if (!c) throw new Error(m); };
t('colores: ids únicos y hex válidos (más de 45)', () => { aser(F.COLORES.length > 45, 'pocos'); aser(new Set(F.COLORES.map(c => c.id)).size === F.COLORES.length, 'ids repetidos'); aser(F.COLORES.every(c => /^#[0-9A-F]{6}$/i.test(c.hex)), 'hex'); });
t('gruposFichas: claves, valores por defecto y opciones', () => {
  const g = F.gruposFichas({ titulo: 'Cajas' }); aser(g.map(x => x.clave).join() === 'fcolor,ftex,fforma,ftam', 'claves');
  aser(g.every(x => x.opciones.some(o => o.id === x.def)), 'def en opciones'); aser(g[0].titulo === 'Cajas · Color', 'título');
  aser(F.gruposFichas({ formas: false, tamano: false }).length === 2, 'sin forma ni tamaño'); aser(F.gruposFichas({ tamano: ['pequeno', 'normal'] }).at(-1).opciones.length === 2, 'tamaño limitado');
  aser(F.gruposFichas({ clave: 'x' })[0].clave === 'xcolor', 'prefijo');
});
t('estilo: original por defecto y lectura de lo elegido', () => {
  const e0 = F.estilo({}); aser(!e0.hay && e0.hex === null && e0.tex === null && e0.forma === null && e0.esc === 1, 'original');
  const e = F.estilo({ fcolor: 'rojo-m', ftex: 'marmol', fforma: 'pildora', ftam: 'pequeno' }); aser(e.hay && /^#/.test(e.hex) && e.tex === 'marmol' && e.forma === 'pildora' && e.esc < 1, 'elegido');
  const x = F.estilo({ fcolor: 'no-existe', ftex: 'original', fforma: 'original', ftam: 'normal' }); aser(!x.hay, 'valores raros = original');
  aser(F.estilo({ fcolor: 'azul-m' }).clave !== F.estilo({ fcolor: 'verde-m' }).clave, 'clave de caché distinta');
});
t('color: mezcla, oscuro/claro y variantes', () => {
  aser(F.mezcla('#000000', '#FFFFFF', .5) === '#808080', 'mezcla'); aser(F.luz(F.oscuro('#FF0000')) < F.luz('#FF0000') && F.luz(F.claro('#FF0000')) > F.luz('#FF0000'), 'luz');
  const v = F.variantes('#3D7AE8', 6); aser(v.length === 6 && new Set(v).size === 6 && v.every(c => /^#[0-9a-f]{6}$/.test(c)), 'variantes'); aser(F.luz(v[0]) > F.luz(v[5]), 'de claro a oscuro');
});
t('pixelTextura: determinista y acotada', () => {
  for (const tx of Object.keys(F.TEXTURAS).filter(k => k !== 'original')) for (let i = 0; i < 400; i++) { const x = i * 7 % 331, y = i * 13 % 257, a = F.pixelTextura(tx, x, y); aser(a === F.pixelTextura(tx, x, y) && a >= -.6 && a <= .6, tx + ' ' + a); }
  aser(F.pixelTextura('original', 3, 4) === 0, 'original = 0');
});
console.log(ok + ' pruebas correctas');
