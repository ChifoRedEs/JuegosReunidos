// Personajes (emojis) por secciones: los usan Encajados y Magnate en 🎨 Apariencia.
export const PERSONAJES = {
  Hombres: ['👨', '👨🏻', '👨🏽', '👨🏿', '👨‍🦰', '👨‍🦱', '👨‍🦳', '👨‍🦲', '🧔', '👴', '👦'],
  Mujeres: ['👩', '👩🏻', '👩🏽', '👩🏿', '👩‍🦰', '👩‍🦱', '👩‍🦳', '👱‍♀️', '🧕', '👵', '👧'],
  Oficios: ['👷', '👷‍♀️', '👮', '👮‍♀️', '🧑‍🚒', '👨‍🚒', '👩‍🚒', '👨‍🍳', '👩‍🍳', '👨‍🔧', '👩‍🔧', '👨‍⚕️', '👩‍⚕️', '👨‍🌾', '👩‍🌾', '👨‍🏭', '👩‍🏭', '👨‍🚀', '👩‍🚀', '🕵️', '💂', '🧑‍🎨'],
  Fantasía: ['🧙', '🧝', '🧚', '🧛', '🧟', '🧞', '🦸', '🦹', '🥷', '🤖', '👽', '👻', '🎅', '🤶'],
  Animales: ['🐧', '🐱', '🐶', '🦊', '🐻', '🐼', '🐨', '🐸', '🐵', '🐷', '🐰', '🦁', '🐯', '🐮', '🐔', '🦉', '🐢', '🦖', '🐘', '🦒'],
  Vehículos: ['🚜', '🚗', '🚕', '🚙', '🛻', '🚚', '🏎️', '🚓', '🚑', '🚒', '🛺', '🚲', '🛵', '🏍️'],
};
export const NOMBRE_SEC = { Hombres: 'Hombre', Mujeres: 'Mujer', Oficios: 'Oficio', Fantasía: 'Fantasía', Animales: 'Animal', Vehículos: 'Vehículo' };
export const FICHAS = Object.fromEntries(Object.entries(PERSONAJES).flatMap(([sec, l]) => l.map((e, i) => [`${sec.slice(0, 3).toLowerCase()}${i}`, { e, sec }])));
// Opciones listas para api.aspecto (rejilla de emojis con secciones)
export const opcionesPersonajes = () => Object.entries(FICHAS).map(([id, f]) => ({ id, emoji: f.e, sec: f.sec, nombre: `${NOMBRE_SEC[f.sec]} ${f.e}` }));
