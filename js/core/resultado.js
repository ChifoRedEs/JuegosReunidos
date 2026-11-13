// Tarjeta pequeña con Goli para los finales sin victoria (derrota, tablas), el primer sello de un juego y el aviso de «sin conexión».
// No tapa la pantalla ni pide nada: se retira sola a los 7 segundos o al tocarla.
const MENSAJES = {
  derrota: ['Esta vez no pudo ser. ¡Revancha!', 'Ánimo: la próxima es tuya.', 'Casi… ¡Otra y lo consigues!'],
  tablas: ['Tablas: nadie cede.', 'Empate: buena partida.'],
  sello: ['Nuevo destino sellado en tu pasaporte.'],
  offline: ['Sin conexión: tus juegos siguen funcionando.'],
};
const POSE = { derrota: 'derrota', tablas: 'tablas', sello: 'sellando', offline: 'durmiendo' };
const R = a => a[Math.floor(Math.random() * a.length)];

export function mostrarResultado({ res, primero = false, juego = '', nueva = null, etiqueta = 'Nueva partida' } = {}) {
  const tipo = primero && res !== 'offline' ? 'sello' : res; if (!MENSAJES[tipo]) return;
  document.querySelectorAll('.res-card').forEach(x => x.remove());
  const c = document.createElement('div'); c.className = 'res-card'; c.setAttribute('role', 'status');
  const im = new Image(); im.alt = ''; im.width = 64; im.height = 80; im.src = new URL('../../img/goli/' + POSE[tipo] + '.webp', import.meta.url).href;
  const tx = document.createElement('div'); tx.className = 'res-tx';
  const b = document.createElement('b'); b.textContent = tipo === 'sello' && juego ? juego + ': ' + R(MENSAJES.sello) : R(MENSAJES[tipo]); tx.append(b);
  c.append(im, tx);
  const cerrar = () => { clearTimeout(t); c.remove(); };
  if (nueva && (res === 'derrota' || res === 'tablas')) { const bn = document.createElement('button'); bn.type = 'button'; bn.className = 'btn on'; bn.textContent = etiqueta; bn.addEventListener('click', e => { e.stopPropagation(); cerrar(); nueva(); }); c.append(bn); }
  c.addEventListener('click', cerrar);
  document.body.append(c);
  const t = setTimeout(cerrar, 7000);
  return cerrar;
}
