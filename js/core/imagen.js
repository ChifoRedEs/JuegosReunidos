// Imagen para compartir (el sello de una victoria, el pasaporte…): se dibuja en un canvas y se envía con la hoja de compartir del móvil
// o, si el navegador no puede, se descarga como PNG.
const BASE = new URL('../../img/marca/', import.meta.url);
const cargar = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = new URL(src, BASE).href; });
const TIT = "'Fraunces',Georgia,serif", TXT = "'Nunito',system-ui,sans-serif";

function ajustarTexto(c, t, x, y, max, fuente, px, col) {
  let f = px; do { c.font = fuente.replace('#', f); f -= 2; } while (c.measureText(t).width > max && f > 24);
  c.fillStyle = col; c.fillText(t, x, y);
}
/** Devuelve un Blob PNG de 1080×1080: { titulo, linea, pie } */
export async function crearImagen({ titulo = '', linea = '', pie = '' }) {
  try { await document.fonts.load("900 40px Fraunces"); await document.fonts.load("800 30px Nunito"); } catch { /* sin fuentes: se usa la de reserva */ }
  const W = 1080, cv = document.createElement('canvas'); cv.width = cv.height = W; const c = cv.getContext('2d');
  const fondo = await cargar('fondo-papel.webp');
  c.fillStyle = '#F4EBD9'; c.fillRect(0, 0, W, W);
  if (fondo) { const p = c.createPattern(fondo, 'repeat'); if (p) { c.fillStyle = p; c.fillRect(0, 0, W, W); } }
  c.fillStyle = 'rgba(244,235,217,.35)'; c.fillRect(0, 0, W, W);
  c.lineWidth = 10; c.strokeStyle = '#14213D'; c.strokeRect(36, 36, W - 72, W - 72);
  c.lineWidth = 3; c.setLineDash([16, 12]); c.strokeStyle = 'rgba(20,33,61,.45)'; c.strokeRect(62, 62, W - 124, W - 124); c.setLineDash([]);
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  ajustarTexto(c, titulo, W / 2, 190, W - 200, `900 #px ${TIT}`, 84, '#14213D');
  const sello = await cargar('sello.webp'), S = 500, sx = W / 2, sy = 520;
  c.save(); c.translate(sx, sy); c.rotate(-0.1);
  c.shadowColor = 'rgba(20,33,61,.35)'; c.shadowOffsetY = 10; c.shadowBlur = 0;
  if (sello) c.drawImage(sello, -S / 2, -S / 2, S, S);
  c.shadowColor = 'transparent'; c.fillStyle = '#FFF8EC'; c.font = `900 ${S * 0.34}px ${TIT}`; c.textBaseline = 'middle'; c.fillText('GO', 0, S * 0.02); c.restore();
  c.textBaseline = 'alphabetic';
  ajustarTexto(c, linea, W / 2, 840, W - 180, `900 #px ${TIT}`, 68, '#E4572E');
  if (pie) ajustarTexto(c, pie, W / 2, 905, W - 180, `800 #px ${TXT}`, 38, '#34405F');
  ajustarTexto(c, 'JugamiGO · 60 juegos', W / 2, 985, W - 200, `900 #px ${TIT}`, 36, '#14213D');
  return new Promise(res => cv.toBlob(res, 'image/png'));
}
/** Crea la imagen y la comparte (o la descarga). aviso: función para mostrar mensajes. */
export async function compartirImagen({ titulo, linea, pie, texto = '' }, aviso = () => {}) {
  const blob = await crearImagen({ titulo, linea, pie }); if (!blob) { aviso('No se pudo crear la imagen'); return; }
  const f = new File([blob], 'jugamigo.png', { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'JugamiGO', text: texto }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'jugamigo.png';
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  aviso('📥 Imagen guardada: ya puedes enviarla');
}
