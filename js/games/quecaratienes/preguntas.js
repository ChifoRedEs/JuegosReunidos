// Preguntas de «¿Qué cara tienes?»: cada una se responde con sí/no mirando la cara secreta. Sin DOM.
import { SOMBREROS } from './avatar.js';

const hayPelo = f => !Object.hasOwn(SOMBREROS, f.pe) && f.pe !== 'clean';   // el sombrero tapa el pelo; «clean» es una cabeza sin pelo
const CALVO = ['clean', 'funny', 'receding'], LARGO = ['wave', 'danny', 'pixie'], CORTO = ['fonze', 'punk'];

export const GRUPOS_PREGUNTAS = [
  ['persona', '🧑 Persona'], ['pelo', '💇 Pelo'], ['cabeza', '🎩 Cabeza'], ['cara', '🙂 Cara'], ['piel', '🎨 Piel'], ['ropa', '👕 Ropa'],
];

const P = [];
const q = (id, grupo, texto, test) => P.push({ id, grupo, texto, test });

q('chico', 'persona', '¿Es un chico?', f => f.sx === 'h');
q('chica', 'persona', '¿Es una chica?', f => f.sx === 'm');

for (const [c, t] of [['negro', 'negro'], ['castano', 'castaño'], ['rubio', 'rubio'], ['pelirrojo', 'pelirrojo'], ['canoso', 'canoso (gris)'], ['azul', 'azul'], ['rosa', 'rosa'], ['morado', 'morado']])
  q('pelo-' + c, 'pelo', `¿Tiene el pelo ${t}?`, f => hayPelo(f) && f.pc === c);
q('calvo', 'pelo', '¿Es calvo o casi calvo?', f => CALVO.includes(f.pe));
q('largo', 'pelo', '¿Tiene el pelo largo?', f => LARGO.includes(f.pe));
q('corto', 'pelo', '¿Tiene el pelo corto?', f => CORTO.includes(f.pe));
q('rizado', 'pelo', '¿Tiene el pelo rizado?', f => f.pe === 'curly');
q('cresta', 'pelo', '¿Tiene cresta?', f => f.pe === 'punk');

q('sombrero', 'cabeza', '¿Lleva sombrero, gorra o gorro?', f => Object.hasOwn(SOMBREROS, f.pe));
q('gorro', 'cabeza', '¿Lleva un gorro de lana?', f => f.pe === 'beanie');
q('gorra', 'cabeza', '¿Lleva gorra?', f => f.pe === 'cap');
q('ala', 'cabeza', '¿Lleva sombrero de ala ancha?', f => f.pe === 'brim');
q('copa', 'cabeza', '¿Lleva sombrero de copa?', f => f.pe === 'tophat');
q('turbante', 'cabeza', '¿Lleva turbante?', f => f.pe === 'turban');
q('adorno', 'cabeza', '¿Lleva lazo o diadema?', f => f.ad !== 'none');
q('lazo', 'cabeza', '¿Lleva un lazo?', f => f.ad === 'bow');
q('diadema', 'cabeza', '¿Lleva diadema?', f => f.ad === 'band');

q('ojos-azul', 'cara', '¿Tiene los ojos azules?', f => f.oc === 'azul');
q('ojos-verde', 'cara', '¿Tiene los ojos verdes?', f => f.oc === 'verde');
q('ojos-marron', 'cara', '¿Tiene los ojos marrones?', f => f.oc === 'marron');
q('sombra', 'cara', '¿Lleva sombra de ojos?', f => f.oj === 'eyeshadow');
q('gafas', 'cara', '¿Lleva gafas?', f => f.ga !== 'none');
q('gafas-sol', 'cara', '¿Lleva gafas de sol?', f => f.ga === 'sun');
q('gafas-redondas', 'cara', '¿Lleva gafas redondas?', f => f.ga === 'round');
q('gafas-cuadradas', 'cara', '¿Lleva gafas cuadradas?', f => f.ga === 'square');
q('barba', 'cara', '¿Tiene barba?', f => f.bd === 'full' || f.bd === 'scruff');
q('bigote', 'cara', '¿Tiene bigote?', f => f.bd === 'mustache' || f.bd === 'full');
q('perilla', 'cara', '¿Tiene perilla?', f => f.bd === 'goatee');
q('pecas', 'cara', '¿Tiene pecas?', f => !!f.pk);
q('pendientes', 'cara', '¿Lleva pendientes?', f => f.ar !== 'none');
q('sonrie', 'cara', '¿Está sonriendo?', f => ['smile', 'laughing', 'smirk'].includes(f.bc));
q('abierta', 'cara', '¿Tiene la boca abierta?', f => f.bc === 'laughing' || f.bc === 'surprised');

q('piel-clara', 'piel', '¿Tiene la piel clara?', f => f.pi <= 1);
q('piel-morena', 'piel', '¿Tiene la piel morena?', f => f.pi === 2 || f.pi === 3);
q('piel-oscura', 'piel', '¿Tiene la piel oscura?', f => f.pi === 4);

for (const [c, t] of [['azul', 'azul'], ['rojo', 'roja'], ['amarillo', 'amarilla'], ['verde', 'verde'], ['morado', 'morada'], ['rosa', 'rosa']])
  q('ropa-' + c, 'ropa', `¿Lleva la ropa ${t}?`, f => f.rc === c);

export const PREGUNTAS = P;
const POR_ID = new Map(P.map(x => [x.id, x]));
export const pregunta = id => POR_ID.get(id) || null;
export const responde = (f, id) => { const p = POR_ID.get(id); return !!(p && p.test(f)); };
// Vector de respuestas de una cara (sirve para saber si dos caras se distinguen).
export const vectorDe = f => P.map(x => x.test(f));
// Preguntas con sentido en un tablero: las que no responden igual a todas las caras.
export function disponibles(caras) {
  return P.filter(p => { let t = 0; for (const f of caras) if (p.test(f)) t++; return t > 0 && t < caras.length; });
}
