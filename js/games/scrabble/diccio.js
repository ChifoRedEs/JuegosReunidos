// Diccionario del Palabras Cruzadas (sin DOM: se usa en el Worker de la CPU, en la página si no hay Worker y en las pruebas con Node).
// Parte del diccionario común (core/diccionario.js, ~590.000 formas sin tildes) y lo pasa a FICHAS: en el Palabras Cruzadas en español
// CH, LL y RR son una sola ficha, así que «calle» son 4 fichas (c·a·LL·e). Dentro del motor cada ficha es UN carácter:
// las letras normales, la ñ y '1' = CH, '2' = LL, '3' = RR. No hay K ni W en la bolsa, así que esas palabras no se pueden jugar.
//
//   const dic = construir(D)   // D = módulo core/diccionario.js ya cargado (o cualquier objeto con palabras(n))
//   dic.existe('ca2e')          // ¿«calle» existe?
//   dic.rango(n) / dic.estrechar(...)   // búsqueda por prefijos para generar jugadas (ver motor.js)
export const aFichas = w => w.replace(/ch/g, '1').replace(/ll/g, '2').replace(/rr/g, '3');

export function construir(D) {
  const L = [];
  for (let n = 2; n <= 15; n++) {
    for (const w of D.palabras(n)) {
      if (w.indexOf('k') >= 0 || w.indexOf('w') >= 0) continue;
      const t = w.indexOf('ch') >= 0 || w.indexOf('ll') >= 0 || w.indexOf('rr') >= 0 ? aFichas(w) : w;
      if (t.length < 2) continue;
      (L[t.length] || (L[t.length] = [])).push(t);
    }
  }
  const T = [];
  for (let n = 2; n <= 15; n++) T[n] = L[n] ? L[n].sort().join('') : '';
  return crearDic(T);
}

export function crearDic(T) {
  const total = n => (T[n] ? T[n].length / n : 0);
  return {
    total,
    existe(w) {
      const n = w.length, t = T[n]; if (!t) return false;
      let lo = 0, hi = t.length / n - 1;
      while (lo <= hi) { const m = (lo + hi) >> 1, x = t.substr(m * n, n); if (x === w) return true; if (x < w) lo = m + 1; else hi = m - 1; }
      return false;
    },
    // Palabras de n fichas cuyo carácter k es `code`, dentro del rango [lo, hi) (que ya comparten los k primeros): → [a, b) o null
    estrechar(n, lo, hi, k, code) {
      const t = T[n]; let a = lo, b = hi;
      while (a < b) { const m = (a + b) >> 1; if (t.charCodeAt(m * n + k) < code) a = m + 1; else b = m; }
      let c = a, d = hi;
      while (c < d) { const m = (c + d) >> 1; if (t.charCodeAt(m * n + k) <= code) c = m + 1; else d = m; }
      return a < c ? [a, c] : null;
    },
  };
}
