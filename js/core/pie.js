// Pie común de todos los menús de partida: botón principal + Podio · Apariencia · Reglas.
// Todos los juegos lo usan, así que el menú de cualquier juego se maneja igual.
// Los clics siguen resolviéndose en cada juego con su `data-ac`: start|jugar|nueva (principal), seguir|volver (continuar),
// podio, aspecto y reglas.
//   ac        data-ac del botón principal (por defecto 'start')
//   seguir    data-ac del botón «Continuar partida» (null si no hay partida en curso)
//   sinNueva  true → no hay botón de «nueva partida» (p. ej. los niveles se eligen en la propia pantalla)
//   texto     rótulo propio del botón principal (solo si aporta información; por defecto «▶️ Jugar»)
//   deshabilitado  desactiva el principal (faltan jugadores…)
//   extra     botones secundarios específicos del juego (HTML), antes de Podio
//   podio     añade «🏆 Podio»     reglas   false → sin «📖 Reglas»     nota  texto suelto tras los botones
export function pieMenu({ ac = 'start', seguir = null, sinNueva = false, texto = '', deshabilitado = false, extra = '', podio = false, reglas = true, nota = '' } = {}) {
  const cont = seguir ? `<button class="btn on pm" data-ac="${seguir}">▶️ Continuar partida</button>` : '';
  const nueva = sinNueva ? '' : `<button class="btn pm${seguir ? '' : ' on'}" data-ac="${ac}"${deshabilitado ? ' disabled' : ''}>${texto || (seguir ? '🆕 Nueva partida' : '▶️ Jugar')}</button>`;
  return `<div class="bar pie">${cont}${nueva}${extra}${podio ? '<button class="btn" data-ac="podio">🏆 Podio</button>' : ''}<button class="btn" data-ac="aspecto">🎨 Apariencia</button>${reglas ? '<button class="btn" data-ac="reglas">📖 Reglas</button>' : ''}${nota ? `<span class="note">${nota}</span>` : ''}</div>`;
}
