#!/usr/bin/env python3
"""Genera icons/icon-192.png, icon-512.png e icon-maskable-512.png sin dependencias (solo stdlib).
Uso:  python tools/generar_iconos.py"""
import struct, zlib, os, math

def png(path, n, margen, fondo):
    cols = {'r': (214, 69, 61), 'a': (43, 108, 176), 'v': (46, 158, 91), 'y': (242, 184, 75)}
    mid = n // 2; gap = n * 0.02; m = n * margen; 
    filas = []
    for y in range(n):
        fila = bytearray([0])
        for x in range(n):
            c = fondo
            # cuatro cuadrados de colores
            for (qx, qy, k) in ((0, 0, 'r'), (1, 0, 'a'), (0, 1, 'v'), (1, 1, 'y')):
                x0 = m + qx * (mid - m + gap) ; x1 = mid - gap if qx == 0 else n - m
                y0 = m + qy * (mid - m + gap) ; y1 = mid - gap if qy == 0 else n - m
                if x0 <= x < x1 and y0 <= y < y1:
                    c = cols[k]
            d = math.hypot(x - mid, y - mid)
            if d < n * 0.17: c = (27, 42, 58)                       # aro
            if d < n * 0.155: c = (255, 255, 255)                   # centro blanco
            if d < n * 0.06: c = (27, 42, 58)                       # punto
            fila += bytes(c)
        filas.append(bytes(fila))
    raw = b''.join(filas)
    def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    datos = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', n, n, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    open(path, 'wb').write(datos)

aqui = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons')
png(os.path.join(aqui, 'icon-192.png'), 192, 0.10, (238, 242, 239))
png(os.path.join(aqui, 'icon-512.png'), 512, 0.10, (238, 242, 239))
png(os.path.join(aqui, 'icon-maskable-512.png'), 512, 0.22, (238, 242, 239))   # zona segura mayor
print('Iconos generados en', os.path.normpath(aqui))
