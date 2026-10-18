#!/usr/bin/env python3
"""Reduce y convierte imágenes de cartas a WebP ligero (requiere Pillow:  pip install pillow).
Uso:
    python tools/optimizar_imagenes.py ORIGEN DESTINO [--ancho 240] [--calidad 78]
Recorre ORIGEN (carpeta con barajas o dorsos), conserva la estructura de subcarpetas y los nombres de archivo,
y guarda cada imagen como .webp de 240 px de ancho en DESTINO (suficiente para pantallas de 3×). Después sube DESTINO a img/cartas/... en GitHub."""
import argparse, os
from PIL import Image

p = argparse.ArgumentParser()
p.add_argument('origen'); p.add_argument('destino')
p.add_argument('--ancho', type=int, default=240); p.add_argument('--calidad', type=int, default=78)
a = p.parse_args()
n = 0; antes = 0; despues = 0
for base, _, files in os.walk(a.origen):
    for f in sorted(files):
        nombre, ext = os.path.splitext(f)
        if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
            continue
        ruta = os.path.join(base, f)
        rel = os.path.relpath(base, a.origen)
        salida = os.path.normpath(os.path.join(a.destino, rel))
        os.makedirs(salida, exist_ok=True)
        im = Image.open(ruta)
        im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') and 'transparency' in im.info or im.mode in ('RGBA', 'LA') else 'RGB')
        if im.width > a.ancho:
            im = im.resize((a.ancho, round(im.height * a.ancho / im.width)), Image.LANCZOS)
        destino = os.path.join(salida, nombre + '.webp')
        im.save(destino, 'WEBP', quality=a.calidad, method=6)
        antes += os.path.getsize(ruta); despues += os.path.getsize(destino); n += 1
print('%d imágenes: %.1f MB → %.1f MB' % (n, antes / 1e6, despues / 1e6))
