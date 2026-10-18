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
    # Las carpetas que empiezan por "_" (js/games/_plantilla) no se publican en GitHub Pages si Jekyll está activo:
    # si entraran en la lista, la instalación sin conexión fallaría entera. Además la plantilla no se usa para jugar.
    dirs[:] = sorted(d for d in dirs if d not in EXCLUIR_DIRS and not d.startswith('_') and not d.startswith('.'))
    for f in sorted(files):
        if f in EXCLUIR_ARCHIVOS or os.path.splitext(f)[1].lower() not in EXT:
            continue
        # El diccionario (~6 MB) no se instala con la app: se baja solo cuando un juego lo pide (caché jr-diccionario)
        if re.fullmatch(r'(es|lemas)-[0-9a-f]{8}\.txt', f) and base.replace(os.sep, '/').endswith('data/diccionario'):
            continue
        archivos.append(os.path.relpath(os.path.join(base, f), RAIZ).replace(os.sep, '/'))

h = hashlib.sha1()
for a in archivos:
    h.update(a.encode()); h.update(open(os.path.join(RAIZ, a), 'rb').read())
ruta = os.path.join(RAIZ, 'sw.js')
s = open(ruta, encoding='utf-8').read()
# La lógica del propio sw.js también cuenta (sin la lista ni la versión), para que un cambio en él genere versión nueva.
h.update(re.sub(r"/\*ARCHIVOS-INICIO\*/.*?/\*ARCHIVOS-FIN\*/|const VERSION = '[^']*';", '', s, flags=re.S).encode())
version = 'jr-' + h.hexdigest()[:10]
lista = ',\n'.join("'./%s'" % a for a in archivos)
s = re.sub(r"/\*ARCHIVOS-INICIO\*/.*?/\*ARCHIVOS-FIN\*/", "/*ARCHIVOS-INICIO*/\n'./',\n%s\n/*ARCHIVOS-FIN*/" % lista, s, flags=re.S)
s = re.sub(r"const VERSION = '[^']*';", "const VERSION = '%s';" % version, s)
open(ruta, 'w', encoding='utf-8').write(s)
print('sw.js actualizado: %d archivos, versión %s' % (len(archivos) + 1, version))
