#!/usr/bin/env python3
"""Corta una lámina de IA con fondo magenta SIN cuadrícula fija: detecta cada pieza (también las anchas o las de tamaño distinto).
Uso: python3 tools/cortar_auto.py LAMINA.jpg SALIDA_DIR nombre1 nombre2 ... [--max 256] [--q 88] [--union 22] [--ver]
Orden de lectura: de arriba abajo y de izquierda a derecha. Un nombre «-» descarta esa pieza. --ver solo lista lo detectado.
Devuelve error si el número de piezas no coincide con el de nombres (para no desplazar ninguna)."""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
sys.path.insert(0, os.path.dirname(__file__))
from cortar_lamina import quitar_magenta

def piezas(ruta, union=4, sinmarco=False):
    im = quitar_magenta(Image.open(ruta)); al = np.asarray(im)[..., 3]
    masc = al > 40
    lab, n = ndi.label(ndi.binary_dilation(masc, iterations=union))
    lab = np.where(masc, lab, 0)
    out = []
    for k in range(1, n + 1):
        ys, xs = np.where(lab == k)
        if len(xs) < 600: continue                         # polvo
        out.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1, k))
    if not out: return im, lab, []
    if sinmarco:                                   # descarta recuadros que contienen otras piezas (marcos dibujados por la IA)
        out = [a for a in out if not any(b is not a and b[0] >= a[0] and b[1] >= a[1] and b[2] <= a[2] and b[3] <= a[3] for b in out)]
    # filas por centro vertical
    out.sort(key=lambda b: (b[1] + b[3]) / 2)
    hmed = np.median([b[3] - b[1] for b in out]); filas = []
    for b in out:
        cy = (b[1] + b[3]) / 2
        if filas and abs(cy - filas[-1][0]) < hmed * .55: filas[-1][1].append(b); filas[-1][0] = np.mean([(q[1] + q[3]) / 2 for q in filas[-1][1]])
        else: filas.append([cy, [b]])
    orden = [b for f in filas for b in sorted(f[1], key=lambda b: (b[0] + b[2]) / 2)]
    return im, lab, orden

def cortar(ruta, salida, nombres, maxlado=256, q=88, union=4, ver=False, sinmarco=False):
    im, lab, orden = piezas(ruta, union, sinmarco)
    if ver or len(orden) != len(nombres):
        print(f'{len(orden)} piezas detectadas, {len(nombres)} nombres'); [print(i + 1, b[:4]) for i, b in enumerate(orden)]
        if len(orden) != len(nombres): sys.exit(1)
        return
    os.makedirs(salida, exist_ok=True)
    arr = np.asarray(im)
    for nombre, (x0, y0, x1, y1, k) in zip(nombres, orden):
        if nombre == '-': continue
        sub = arr[y0:y1, x0:x1].copy()
        sub[..., 3] = np.where(lab[y0:y1, x0:x1] == k, sub[..., 3], 0)       # solo los píxeles de ESTA pieza
        m = 2; p = Image.fromarray(np.pad(sub, ((m, m), (m, m), (0, 0))), 'RGBA')
        if max(p.size) > maxlado:
            f = maxlado / max(p.size); p = p.resize((max(1, round(p.width * f)), max(1, round(p.height * f))), Image.LANCZOS)
        p.save(os.path.join(salida, nombre + '.webp'), quality=q, method=6); print(nombre, p.size)

if __name__ == '__main__':
    a = sys.argv[1:]; mx, q, un, ver = 256, 88, 4, False
    if '--max' in a: i = a.index('--max'); mx = int(a[i + 1]); del a[i:i + 2]
    if '--q' in a: i = a.index('--q'); q = int(a[i + 1]); del a[i:i + 2]
    if '--union' in a: i = a.index('--union'); un = int(a[i + 1]); del a[i:i + 2]
    sm = '--sinmarco' in a
    if sm: a.remove('--sinmarco')
    if '--ver' in a: a.remove('--ver'); ver = True
    ruta, salida, *nombres = a
    cortar(ruta, salida, nombres, mx, q, un, ver, sm)
