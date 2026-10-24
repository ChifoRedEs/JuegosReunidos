#!/usr/bin/env python3
"""Regenera js/games/memorama/bancos.js a partir de las carpetas img/memorama/<tema>/*.webp.
Cada tema es una carpeta con imágenes .webp (cuadradas, ~128 px) y un nombres.json opcional {"manzana": "Manzana"}.
Para añadir imágenes: copia los .webp a la carpeta del tema (o crea una carpeta nueva y dale nombre en TEMAS) y ejecuta:
    python tools/generar_memorama.py && python tools/generar_sw.py"""
import json, os
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
IMG = os.path.join(RAIZ, 'img', 'memorama')
TEMAS = {'frutas': ('Frutas y verduras', '🍎'), 'coches': ('Coches', '🚗'), 'pokemon': ('Pokémon', '⚡')}
out = {}
for tema in sorted(os.listdir(IMG)):
    d = os.path.join(IMG, tema)
    if not os.path.isdir(d): continue
    nom = {}
    if os.path.exists(os.path.join(d, 'nombres.json')): nom = json.load(open(os.path.join(d, 'nombres.json'), encoding='utf-8'))
    ids = sorted(os.path.splitext(f)[0] for f in os.listdir(d) if f.endswith('.webp'))
    titulo, icono = TEMAS.get(tema, (tema.capitalize(), '🖼️'))
    out[tema] = {'nombre': titulo, 'icono': icono, 'items': {i: nom.get(i, i.capitalize()) for i in ids}}
js = '// Banco de imágenes del Memorama (lo genera tools/generar_memorama.py a partir de img/memorama/<tema>/*.webp: no lo edites a mano).\n'
js += 'export const BANCOS = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n'
open(os.path.join(RAIZ, 'js', 'games', 'memorama', 'bancos.js'), 'w', encoding='utf-8').write(js)
print('bancos.js:', ', '.join('%s %d' % (k, len(v['items'])) for k, v in out.items()))
