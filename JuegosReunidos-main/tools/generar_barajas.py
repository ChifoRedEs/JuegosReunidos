#!/usr/bin/env python3
"""Genera img/cartas/barajas.json: el índice de barajas y dorsos que la app ofrece en 🎨 Apariencia.
GitHub Pages no puede «listar» carpetas, así que este archivo le dice a la app qué imágenes existen.
Se ejecuta solo (GitHub Actions) al subir imágenes a img/cartas/, o a mano:   python tools/generar_barajas.py

Convención de nombres (¡respeta mayúsculas y minúsculas!):
  img/cartas/espanola/<MAZO>/NN-X.ext   NN = 01..07, 10, 11, 12 (también valen 08 y 09)   X = O oros · C copas · E espadas · B bastos
  img/cartas/francesa/<MAZO>/NN-X.ext   NN = 01..13 (01 = As, 11 = J, 12 = Q, 13 = K)      X = P picas · C corazones · D diamantes · T tréboles
  <MAZO>/00.ext                         comodín (opcional)
  <MAZO>/info.json                      opcional: {"nombre": "Nombre que verás en la app"}
  img/cartas/dorsos/<nombre>.ext        dorsos (valen para las dos barajas)
  img/cartas/dorsos/nombres.json        opcional: {"arcoiris": "Arcoíris"}
Formatos: webp (recomendado), png, jpg, jpeg. Un mazo incompleto no se publica (el aviso dice qué cartas faltan)."""
import json, os, re, struct, unicodedata

RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
CARTAS = os.path.join(RAIZ, 'img', 'cartas')
EXTS = ('.webp', '.png', '.jpg', '.jpeg')
TIPOS = {
    'espanola': {'rangos': [1, 2, 3, 4, 5, 6, 7, 10, 11, 12], 'palos': 'OCEB', 'muestra': '01-O', 'ratio': 1.55},
    'francesa': {'rangos': list(range(1, 14)), 'palos': 'PCDT', 'muestra': '01-P', 'ratio': 1.4},
}
avisos = []


def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-') or 'sin-nombre'


def bonito(s):
    return re.sub(r'[-_]+', ' ', s).strip().capitalize()


def leer_json(ruta):
    try:
        with open(ruta, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def dimensiones(ruta):
    """Ancho y alto de PNG / JPEG / WebP sin librerías externas (o None)."""
    try:
        with open(ruta, 'rb') as f:
            d = f.read(65536)
        if d[:8] == b'\x89PNG\r\n\x1a\n':
            return struct.unpack('>II', d[16:24])
        if d[:4] == b'RIFF' and d[8:12] == b'WEBP':
            t = d[12:16]
            if t == b'VP8 ':
                return struct.unpack('<HH', d[26:30])[0] & 0x3FFF, struct.unpack('<HH', d[26:30])[1] & 0x3FFF
            if t == b'VP8L':
                b = struct.unpack('<I', d[21:25])[0]
                return (b & 0x3FFF) + 1, ((b >> 14) & 0x3FFF) + 1
            if t == b'VP8X':
                return int.from_bytes(d[24:27], 'little') + 1, int.from_bytes(d[27:30], 'little') + 1
        if d[:2] == b'\xff\xd8':
            i = 2
            while i < len(d) - 9:
                if d[i] != 0xFF:
                    i += 1
                    continue
                m = d[i + 1]
                if m in (0xC0, 0xC1, 0xC2):
                    return struct.unpack('>HH', d[i + 7:i + 9])[::-1]
                i += 2 + struct.unpack('>H', d[i + 2:i + 4])[0]
    except Exception:
        pass
    return None


def barajas(tipo):
    cfg = TIPOS[tipo]
    base = os.path.join(CARTAS, tipo)
    salida = []
    if not os.path.isdir(base):
        return salida
    for carpeta in sorted(os.listdir(base)):
        ruta = os.path.join(base, carpeta)
        if not os.path.isdir(ruta) or carpeta.startswith(('.', '_')):
            continue
        nombres = {os.path.splitext(f)[0]: os.path.splitext(f)[1] for f in os.listdir(ruta)
                   if os.path.splitext(f)[1] in EXTS}              # sensible a mayúsculas: lo mismo que verá GitHub Pages
        necesarias = ['%02d-%s' % (r, p) for p in cfg['palos'] for r in cfg['rangos']]
        ext = None
        for e in EXTS:                                               # extensión que cubre más cartas
            n = sum(1 for c in necesarias if nombres.get(c) == e)
            if n and (ext is None or n > sum(1 for c in necesarias if nombres.get(c) == ext)):
                ext = e
        if ext is None:
            avisos.append('%s/%s: no tiene cartas con el nombre esperado (ej. %s.webp); se ignora' % (tipo, carpeta, cfg['muestra']))
            continue
        faltan = [c for c in necesarias if nombres.get(c) != ext]
        if faltan:
            avisos.append('%s/%s: INCOMPLETA (%d de %d), no se publica. Faltan (con extensión %s): %s'
                          % (tipo, carpeta, len(necesarias) - len(faltan), len(necesarias), ext, ', '.join(faltan[:12]) + ('…' if len(faltan) > 12 else '')))
            continue
        dim = dimensiones(os.path.join(ruta, cfg['muestra'] + ext))
        ratio = round(dim[1] / dim[0], 3) if dim else cfg['ratio']
        if abs(ratio - cfg['ratio']) > 0.12:
            avisos.append('%s/%s: las cartas miden %.2f de alto por 1 de ancho y la app espera ≈ %.2f; se verán algo deformadas. Recórtalas o escálalas.'
                          % (tipo, carpeta, ratio, cfg['ratio']))
        info = leer_json(os.path.join(ruta, 'info.json'))
        nombre = info.get('nombre') if isinstance(info.get('nombre'), str) and info.get('nombre').strip() else bonito(carpeta)
        jok = nombres.get('00')                                    # el comodín puede tener otra extensión que el resto del mazo
        salida.append({'id': slug(carpeta), 'nombre': nombre[:40], 'ruta': '%s/%s' % (tipo, carpeta), 'ext': ext[1:],
                       'ratio': ratio, 'joker': jok[1:] if jok else False, 'muestra': cfg['muestra']})
    ids = [b['id'] for b in salida]
    for i in set(ids):
        if ids.count(i) > 1:
            avisos.append('%s: dos carpetas dan el mismo identificador «%s»; cambia el nombre de una' % (tipo, i))
    return salida


def dorsos():
    base = os.path.join(CARTAS, 'dorsos')
    salida = []
    if not os.path.isdir(base):
        return salida
    nombres = leer_json(os.path.join(base, 'nombres.json'))
    for f in sorted(os.listdir(base)):
        n, e = os.path.splitext(f)
        if e not in EXTS:
            continue
        nom = nombres.get(n) if isinstance(nombres.get(n), str) else bonito(n)
        salida.append({'id': 'i-' + slug(n), 'nombre': nom[:30], 'archivo': 'dorsos/' + f})
    salida.sort(key=lambda d: d['nombre'].lower())   # agrupa por color en la lista de la app
    return salida


indice = {'version': 1, 'espanola': barajas('espanola'), 'francesa': barajas('francesa'), 'dorsos': dorsos()}
os.makedirs(CARTAS, exist_ok=True)
with open(os.path.join(CARTAS, 'barajas.json'), 'w', encoding='utf-8') as f:
    json.dump(indice, f, ensure_ascii=False, indent=1)
    f.write('\n')
print('barajas.json: %d española(s), %d francesa(s), %d dorso(s)' % (len(indice['espanola']), len(indice['francesa']), len(indice['dorsos'])))
for a in avisos:
    print('AVISO ' + a)
