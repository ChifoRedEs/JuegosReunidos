// Peticiones que la página hace al diccionario del Palabras Cruzadas (las atiende el Worker o, si no hay Worker, la propia página)
export function atender(M, dic, tipo, a) {
  if (tipo === 'cargar') return true;
  if (tipo === 'existen') return a.map(w => dic.existe(w));
  if (tipo === 'pensar') return M.pensar(a, dic);
  if (tipo === 'pista') { const m = M.mejor(a.tab, a.bl, a.atril, dic); return m ? { coloc: m.coloc, pts: m.pts, w: m.w } : null; }
  throw new Error('petición desconocida: ' + tipo);
}
