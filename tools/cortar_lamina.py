#!/usr/bin/env python3
"""Corta una lámina de IA con fondo magenta (#FF00FF) en piezas sueltas con transparencia.
Uso: python3 tools/cortar_lamina.py LAMINA.jpg COLS FILAS SALIDA_DIR nombre1 nombre2 ... [--max 256] [--q 88]
Las piezas se numeran de izquierda a derecha y de arriba abajo. Un nombre «-» se salta esa pieza."""
import sys, os
from PIL import Image, ImageFilter
import numpy as np

def quitar_magenta(im):
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # «magentez»: cuánto se parece al magenta (R y B altos, G bajo)
    mag = np.minimum(r, b) - g
    alfa = np.clip(1.0 - (mag - 60) / 90.0, 0, 1)            # <60 opaco, >150 transparente
    alfa = np.where(mag > 150, 0, alfa)
    # quita el halo magenta de los bordes semitransparentes
    out = a.copy()
    borde = (alfa > 0) & (alfa < 1) | ((mag > 25) & (alfa > 0))
    exceso = np.clip(mag, 0, None) * 0.9
    out[..., 0] = np.where(borde, np.maximum(r - exceso * .5, 0), r)
    out[..., 2] = np.where(borde, np.maximum(b - exceso * .5, 0), b)
    rgba = np.dstack([out, alfa * 255]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(rgba, 'RGBA')

def cortar(ruta, cols, filas, salida, nombres, maxlado=256, q=88, margen=0.01):
    im = quitar_magenta(Image.open(ruta))
    W, H = im.size
    cw, ch = W / cols, H / filas
    os.makedirs(salida, exist_ok=True)
    hechos = []
    for i, nombre in enumerate(nombres):
        if nombre == '-': continue
        c, f = i % cols, i // cols
        celda = im.crop((int(c * cw), int(f * ch), int((c + 1) * cw), int((f + 1) * ch)))
        al = np.asarray(celda)[..., 3]
        ys, xs = np.where(al > 40)
        if len(xs) == 0: print('vacía', nombre); continue
        caja = (max(xs.min() - 2, 0), max(ys.min() - 2, 0), min(xs.max() + 3, celda.width), min(ys.max() + 3, celda.height))
        p = celda.crop(caja)
        if max(p.size) > maxlado:
            k = maxlado / max(p.size); p = p.resize((max(1, round(p.width * k)), max(1, round(p.height * k))), Image.LANCZOS)
        p.save(os.path.join(salida, nombre + '.webp'), quality=q, method=6)
        hechos.append((nombre, p.size))
    return hechos

if __name__ == '__main__':
    a = sys.argv[1:]; mx, q = 256, 88
    if '--max' in a: i = a.index('--max'); mx = int(a[i + 1]); del a[i:i + 2]
    if '--q' in a: i = a.index('--q'); q = int(a[i + 1]); del a[i:i + 2]
    ruta, cols, filas, salida, *nombres = a
    for n, s in cortar(ruta, int(cols), int(filas), salida, nombres, mx, q): print(n, s)
