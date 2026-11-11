// Migración de identificadores: en la 3.74 cada juego pasó a llamarse (en carpetas, archivos y claves guardadas)
// igual que su nombre público. Este módulo se ejecuta UNA vez al arrancar, antes que el resto, y traslada
// las partidas, estadísticas, podios, retos y preferencias guardadas del identificador antiguo al nuevo.
// También sirve para traducir copias de seguridad exportadas con versiones anteriores.
const PRE = 'jr2:';
export const IDS_ANTIGUOS = {
  buscaminas: 'bombardeo', crucigrama: 'crucigramas', conecta4: 'cuatroenlinea', sopa: 'sopaletras',
  freecell: 'cartablanca', pokercub: 'pokercubierto', kenken: 'calcudoku', kakuro: 'crucisumas',
  sokoban: 'encajados', klotski: 'deslizadas', mastermind: 'codigocifrado', hashi: 'puenteshashi',
  memorama: 'matchup', ruleta: 'ruletamillonaria', quecara: 'quecaratienes', flota: 'batallanaval',
  oca: 'juegodelaoca', rosco: 'elrosco', cifrasletras: 'numerosyletras', scrabble: 'palabrascruzadas',
  trivial: 'triviaquesitos', parchis: 'partxis', magnate: 'magnateurbano', worms: 'guerraorugas',
  ladrillos: 'rompeladrillos', ahorcado: 'elahorcado',
  // agrupaciones del menú
  'parchis-oca': 'partxis-oca', 'magnate-hotel': 'magnateurbano-hotel', 'buscaminas-klotski': 'bombardeo-deslizadas',
  'tresenraya-conecta4': 'tresenraya-cuatroenlinea', 'sopa-crucigramas': 'sopaletras-crucigramas',
};
export const idNuevo = id => (typeof id === 'string' && Object.prototype.hasOwnProperty.call(IDS_ANTIGUOS, id) ? IDS_ANTIGUOS[id] : id);

// Copia de un objeto { id: valor } con las claves traducidas (si ya existe la nueva, manda la nueva).
export function traducirClaves(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return o;
  const R = {};
  for (const [k, v] of Object.entries(o)) { const n = idNuevo(k); if (!(n in R) || n === k) R[n] = v; }
  return R;
}
// Traduce una copia de seguridad completa (versión 2) exportada con identificadores antiguos.
export function traducirCopia(o) {
  if (!o || typeof o !== 'object' || o.version !== 2) return o;
  const c = { ...o };
  c.juegos = traducirClaves(o.juegos); c.stats = traducirClaves(o.stats); c.podios = traducirClaves(o.podios);
  if (o.retos && typeof o.retos === 'object') {
    c.retos = {};
    for (const [f, l] of Object.entries(o.retos)) c.retos[f] = Array.isArray(l) ? [...new Set(l.map(idNuevo))] : l;
  }
  if (o.ajustes && typeof o.ajustes === 'object') {
    c.ajustes = { ...o.ajustes };
    if (Array.isArray(o.ajustes.fav)) c.ajustes.fav = [...new Set(o.ajustes.fav.map(idNuevo))];
    c.ajustes.j = traducirClaves(o.ajustes.j);
  }
  return c;
}

function migrarAlmacen() {
  try {
    if (localStorage.getItem(PRE + 'ids374')) return;
    const J = k => { try { const v = localStorage.getItem(PRE + k); return v == null ? null : JSON.parse(v); } catch { return null; } };
    const E = (k, v) => localStorage.setItem(PRE + k, JSON.stringify(v));
    // partidas y podios: una clave por juego
    for (const [viejo, nuevo] of Object.entries(IDS_ANTIGUOS)) {
      for (const tipo of ['juego:', 'podio:']) {
        const kv = PRE + tipo + viejo, kn = PRE + tipo + nuevo, v = localStorage.getItem(kv);
        if (v == null) continue;
        if (localStorage.getItem(kn) == null) localStorage.setItem(kn, v);
        localStorage.removeItem(kv);
      }
    }
    const ix = J('indice'); if (ix && typeof ix === 'object') E('indice', traducirClaves(ix));
    const st = J('stats'); if (st && typeof st === 'object') E('stats', traducirClaves(st));
    const re = J('retos');
    if (re && typeof re === 'object') { const R = {}; for (const [f, l] of Object.entries(re)) R[f] = Array.isArray(l) ? [...new Set(l.map(idNuevo))] : l; E('retos', R); }
    const aj = J('ajustes');
    if (aj && typeof aj === 'object') {
      if (Array.isArray(aj.fav)) aj.fav = [...new Set(aj.fav.map(idNuevo))];
      if (aj.j && typeof aj.j === 'object') aj.j = traducirClaves(aj.j);
      E('ajustes', aj);
    }
    localStorage.setItem(PRE + 'ids374', '1');
  } catch (e) { console.error('Migración de identificadores:', e); }
}
migrarAlmacen();
