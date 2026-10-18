#!/usr/bin/env python3
"""Genera el diccionario de juegos de palabras (Letras, Scrabble…) a partir del diccionario ortográfico de LibreOffice.
    python tools/generar_diccionario.py
Entrada:  tools/diccionario/es_ANY.aff y es_ANY.dic (diccionario español de LibreOffice/RLA-ES, versión 2.1, de Santiago Bosio;
          licencia triple GPL 3 / LGPL 3 / MPL 1.1) y tools/diccionario/extra.txt (palabras que le faltan).
Salida:   data/diccionario/es-<hash>.txt  — todas las formas (plurales, femeninos, conjugaciones…) de 2 a 15 letras,
          en minúsculas y SIN tildes (la ñ se conserva; la ü pasa a u), agrupadas por longitud: una línea «N:palabras…»
          con las palabras de N letras pegadas y en orden alfabético (así se buscan sin trocear el texto).
          data/diccionario/lemas-<hash>.txt — las ~59.000 palabras base (sin conjugar), CON tildes, de 3 a 15 letras, en tres
          líneas: «n:» sustantivos y adjetivos y «v:» verbos en infinitivo (el resto de entradas sueltas del .dic, sobre todo
          formas verbales irregulares y pronombres pegados, no se incluye). Para los demás juegos de palabras.
          data/diccionario/indice.json — nombres de los archivos actuales, número de palabras y recuento por longitud.
Se excluyen los nombres propios (los que empiezan por mayúscula) y las palabras con guiones, puntos o números."""
import hashlib, json, os, re, unicodedata
from collections import defaultdict

RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ORIGEN = os.path.join(RAIZ, 'tools', 'diccionario')
DESTINO = os.path.join(RAIZ, 'data', 'diccionario')
MIN, MAX = 2, 15

# ---- lectura del archivo de afijos (.aff) ----
reglas = {}                                         # flag -> (tipo, cruza, [(quitar, poner, flags_siguientes, condición)])
lineas = open(os.path.join(ORIGEN, 'es_ANY.aff'), encoding='utf-8').read().split('\n')
i = 0
while i < len(lineas):
    p = lineas[i].split()
    if len(p) >= 4 and p[0] in ('PFX', 'SFX') and p[2] in ('Y', 'N') and p[3].isdigit():
        tipo, flag, n, L = p[0], p[1], int(p[3]), []
        for k in range(n):
            q = lineas[i + 1 + k].split()
            quitar = '' if q[2] == '0' else q[2]
            poner, _, sig = q[3].partition('/')
            cond = q[4] if len(q) > 4 else '.'
            L.append((quitar, '' if poner == '0' else poner, sig, re.compile(('^' + cond) if tipo == 'PFX' else (cond + '$'))))
        reglas[flag] = (tipo, p[2] == 'Y', L); i += n + 1
    else:
        i += 1

def sufijos(w, flags, nivel=0):                     # devuelve (forma, admite_prefijo)
    out = []
    for f in flags:
        r = reglas.get(f)
        if not r or r[0] != 'SFX': continue
        for quitar, poner, sig, cond in r[2]:
            if cond.search(w) and w.endswith(quitar):
                nw = (w[:len(w) - len(quitar)] if quitar else w) + poner
                out.append((nw, r[1]))
                if sig and nivel < 2: out += [(x, r[1] and c) for x, c in sufijos(nw, sig, nivel + 1)]   # sufijos encadenados
    return out
def prefijos(w, flags):
    out = []
    for f in flags:
        r = reglas.get(f)
        if not r or r[0] != 'PFX': continue
        for quitar, poner, _, cond in r[2]:
            if cond.search(w) and w.startswith(quitar): out.append((poner + w[len(quitar):], r[1]))
    return out

formas = set()
lemas = {'n': set(), 'v': set(), 'o': set()}
def tipo_lema(w, flags):
    if re.search(r'(ar|er|ir|ír)$', w) and 'S' not in flags: return 'v'
    return 'n' if ('S' in flags or 'G' in flags) else 'o'
def expandir(w, flags):
    formas.add(w)
    sx = sufijos(w, flags)
    formas.update(x for x, _ in sx)
    for pw, cruza in prefijos(w, flags):
        formas.add(pw)
        if cruza: formas.update(p2 for x, c in sx if c for p2, _ in prefijos(x, flags))

for linea in open(os.path.join(ORIGEN, 'es_ANY.dic'), encoding='utf-8').read().split('\n')[1:]:
    linea = linea.strip()
    if linea:
        w, _, flags = linea.partition('/'); expandir(w, flags)
        if re.fullmatch(r'[a-záéíóúüñ]{3,15}', w): lemas[tipo_lema(w, flags)].add(w)

# ---- palabras añadidas a mano ----
def plural(w):
    if re.search(r'[áéíóú]$', w) or w[-1] in 'aeiou': return w + 's'
    if w.endswith('z'): return w[:-1] + 'ces'
    return w + 'es'
extra = 0
for linea in open(os.path.join(ORIGEN, 'extra.txt'), encoding='utf-8'):
    linea = linea.strip()
    if not linea or linea.startswith('#'): continue
    w, _, f = linea.partition('/')
    nuevas = [w] + ([w[:-1] + 'a'] if 'G' in f and w.endswith('o') else [])
    if 'S' in f: nuevas += [plural(x) for x in list(nuevas)]
    formas.update(nuevas); extra += len(nuevas)
    if re.fullmatch(r'[a-záéíóúüñ]{3,15}', w): lemas['n' if f else tipo_lema(w, f)].add(w)

# ---- normalizar y filtrar ----
def normalizar(w):
    w = w.lower().replace('ñ', '\0')
    w = ''.join(c for c in unicodedata.normalize('NFD', w) if unicodedata.category(c) != 'Mn')
    return w.replace('\0', 'ñ')
finales = sorted({normalizar(w) for w in formas if re.fullmatch(r'[a-záéíóúüñ]+', w) and MIN <= len(w) <= MAX})
por_long = defaultdict(list)
for w in finales: por_long[len(w)].append(w)
texto = '\n'.join(f'{n}:{"".join(por_long[n])}' for n in sorted(por_long)) + '\n'
h = hashlib.sha1(texto.encode()).hexdigest()[:8]
os.makedirs(DESTINO, exist_ok=True)
for f in os.listdir(DESTINO):
    if re.fullmatch(r'es-[0-9a-f]{8}\.txt', f): os.remove(os.path.join(DESTINO, f))
archivo = f'es-{h}.txt'
open(os.path.join(DESTINO, archivo), 'w', encoding='utf-8').write(texto)
texto_l = '\n'.join(f'{t}:{" ".join(sorted(lemas[t]))}' for t in 'nv') + '\n'
for f in os.listdir(DESTINO):
    if re.fullmatch(r'lemas-[0-9a-f]{8}\.txt', f): os.remove(os.path.join(DESTINO, f))
archivo_l = f'lemas-{hashlib.sha1(texto_l.encode()).hexdigest()[:8]}.txt'
open(os.path.join(DESTINO, archivo_l), 'w', encoding='utf-8').write(texto_l)
json.dump({'archivo': archivo, 'palabras': len(finales), 'longitudes': {str(n): len(por_long[n]) for n in sorted(por_long)},
           'lemas': archivo_l, 'lemasPorTipo': {t: len(lemas[t]) for t in 'nv'},
           'fuente': 'Diccionario español de LibreOffice (RLA-ES) 2.1, Santiago Bosio · GPL 3 / LGPL 3 / MPL 1.1'},
          open(os.path.join(DESTINO, 'indice.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'{len(finales)} palabras ({extra} añadidas a mano) → data/diccionario/{archivo} ({len(texto.encode()) / 1e6:.1f} MB)')
print(f'{len(lemas["n"]) + len(lemas["v"])} palabras base (sustantivos y adjetivos {len(lemas["n"])} · verbos {len(lemas["v"])}) → data/diccionario/{archivo_l} ({len(texto_l.encode()) / 1e6:.2f} MB)')
