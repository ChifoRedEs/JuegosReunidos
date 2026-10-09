#!/usr/bin/env python3
"""Regenera en sw.js la lista de archivos a cachear y la VERSION (hash del contenido).
Ejecútalo cada vez que añadas o cambies archivos, antes de publicar:
    python tools/generar_sw.py
Al cambiar VERSION, los móviles descargan la versión nueva y borran la caché antigua."""
import hashlib, os, re

RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
EXCLUIR_DIRS = {'tools', 'docs', 'tests', '.git', 'node_modules'}
EXCLUIR_ARCHIVOS = {'sw.js', 'package.json', 'README.md', '.gitignore', 'fuentes.txt'}
EXT = {'.html', '.css', '.js', '.json', '.webmanifest', '.svg', '.png', '.ico', '.woff2', '.txt'}

archivos = []
for base, dirs, files in os.walk(RAIZ):
    dirs[:] = sorted(d for d in dirs if d not in EXCLUIR_DIRS)
    for f in sorted(files):
        if f in EXCLUIR_ARCHIVOS or os.path.splitext(f)[1].lower() not in EXT:
            continue
        archivos.append(os.path.relpath(os.path.join(base, f), RAIZ).replace(os.sep, '/'))

h = hashlib.sha1()
for a in archivos:
    h.update(a.encode()); h.update(open(os.path.join(RAIZ, a), 'rb').read())
version = 'jr-' + h.hexdigest()[:10]

ruta = os.path.join(RAIZ, 'sw.js')
s = open(ruta, encoding='utf-8').read()
lista = ',\n'.join("'./%s'" % a for a in archivos)
s = re.sub(r"/\*ARCHIVOS-INICIO\*/.*?/\*ARCHIVOS-FIN\*/", "/*ARCHIVOS-INICIO*/\n'./',\n%s\n/*ARCHIVOS-FIN*/" % lista, s, flags=re.S)
s = re.sub(r"const VERSION = '[^']*';", "const VERSION = '%s';" % version, s)
open(ruta, 'w', encoding='utf-8').write(s)
print('sw.js actualizado: %d archivos, versión %s' % (len(archivos) + 1, version))
