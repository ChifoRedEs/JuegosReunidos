// Separación en sílabas del español (reglas ortográficas habituales).
// - Diptongos: vocal abierta (a, e, o) + cerrada (i, u) sin tilde, o dos cerradas: van en la misma sílaba (cie-lo, cui-da).
// - Hiato: dos vocales abiertas (le-ón) o cerrada con tilde (dí-a, ba-úl).
// - Consonantes entre vocales: V-CV · grupos inseparables (pl, pr, bl, br, cl, cr, dr, fl, fr, gl, gr, tr) y ch, ll, rr van juntos.
const FUERTES = 'aeoáéóíú', DEBILES = 'iuü';
const GRUPOS = new Set(['pl', 'pr', 'bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'tr', 'kr', 'kl', 'ch', 'll', 'rr']);
const esVocal = c => FUERTES.includes(c) || DEBILES.includes(c);
const fuerte = c => FUERTES.includes(c);

export function silabas(palabra) {
  const w = palabra.toLowerCase().replace(/[^a-záéíóúüñ]/g, '');
  if (!w) return [];
  // unidades: letras, con ch / ll / rr como una sola consonante
  const u = [];
  for (let i = 0; i < w.length; i++) { const d = w.slice(i, i + 2); if (d === 'ch' || d === 'll' || d === 'rr') { u.push(d); i++; } else u.push(w[i]); }
  // la «y» es vocal al final de palabra o delante de consonante (rey, muy, Ayto.)
  const voc = u.map((c, i) => (c === 'y' ? (i === u.length - 1 || (u[i + 1] && !esVocal(u[i + 1]))) && i > 0 : esVocal(c)));
  const vocal = i => voc[i];
  // núcleos: grupos de vocales seguidas, partidos por los hiatos
  const nucleos = []; // [inicio, fin] índices de unidades
  for (let i = 0; i < u.length; i++) {
    if (!vocal(i)) continue;
    let j = i;
    while (j + 1 < u.length && vocal(j + 1)) {
      const a = u[j] === 'y' ? 'i' : u[j], b = u[j + 1] === 'y' ? 'i' : u[j + 1];
      if (fuerte(a) && fuerte(b)) break;                      // hiato (incluye vocal cerrada con tilde)
      j++;
    }
    nucleos.push([i, j]); i = j;
  }
  // la «h» entre vocales no separa (ahu-ma): se trata como consonante normal, que es lo habitual al silabear
  if (!nucleos.length) return [w];
  const cortes = [];                                          // índice de unidad donde empieza cada sílaba (salvo la primera)
  for (let k = 0; k < nucleos.length - 1; k++) {
    const a = nucleos[k][1] + 1, b = nucleos[k + 1][0], n = b - a;   // consonantes entre los dos núcleos: unidades [a, b)
    if (n === 0) cortes.push(b);
    else if (n === 1) cortes.push(a);
    else if (n === 2) cortes.push(GRUPOS.has(u[a] + u[a + 1]) ? a : a + 1);
    else if (n === 3) cortes.push(GRUPOS.has(u[a + 1] + u[a + 2]) ? a + 1 : a + 2);
    else cortes.push(a + 2);
  }
  const out = []; let ini = 0;
  for (const c of cortes) { out.push(u.slice(ini, c).join('')); ini = c; }
  out.push(u.slice(ini).join(''));
  return out;
}
export const ultimaSilaba = p => { const s = silabas(p); return s[s.length - 1] || ''; };
