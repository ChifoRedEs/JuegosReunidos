#!/usr/bin/env python3
"""Genera js/games/quecara/piezas.js a partir de tools/avatares/<pieza>/<forma>.svg

Las piezas de rostro son de «Vue Color Avatar» de LeoKu (licencia MIT, ver LICENSE-vue-color-avatar.txt);
las de bigote, perilla, barba, gafas de sol, pecas, pelo rizado, entradas, gorra, sombrero de ala, de copa, lazo y diadema son nuevas, dibujadas en el mismo estilo.
Cada SVG se reduce a su contenido (sin <svg>, sin <title>, sin espacios sobrantes); el marcador $fillColor se sustituye al pintar.
Uso: python tools/generar_piezas.py
"""
import json, re, pathlib
RAIZ = pathlib.Path(__file__).resolve().parent
ORIGEN = RAIZ / 'avatares'
DESTINO = RAIZ.parent / 'js' / 'games' / 'quecara' / 'piezas.js'

def reducir(txt):
    ini = txt.index('>', txt.index('<svg')) + 1
    c = txt[ini:txt.rindex('</svg>')]
    c = re.sub(r'<title>.*?</title>', '', c, flags=re.S)
    c = re.sub(r'<!--.*?-->', '', c, flags=re.S)
    c = re.sub(r'\s+', ' ', c)
    c = re.sub(r'>\s+<', '><', c)
    c = re.sub(r'\s*/>', '/>', c)
    c = re.sub(r'\s*=\s*', '=', c)
    c = c.replace('stroke="#000"', 'stroke="black"')
    return c.strip()

datos = {}
for carpeta in sorted(p for p in ORIGEN.iterdir() if p.is_dir()):
    datos[carpeta.name] = {f.stem: reducir(f.read_text(encoding='utf-8')) for f in sorted(carpeta.glob('*.svg'))}
total = sum(len(v) for d in datos.values() for v in d.values())
cab = ('// GENERADO por tools/generar_piezas.py — no editar a mano.\n'
       '// Piezas SVG para las caras de «¿Qué cara tienes?». Basadas en Vue Color Avatar de LeoKu (MIT, ver LICENSE-vue-color-avatar.txt) más piezas nuevas en el mismo estilo.\n')
DESTINO.write_text(cab + 'export const PIEZAS = ' + json.dumps(datos, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
print(f'{sum(len(d) for d in datos.values())} piezas, {total // 1024} KB -> {DESTINO.relative_to(RAIZ.parent)}')
