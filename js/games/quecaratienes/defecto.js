// Las 30 caras por defecto de «¿Qué cara tienes?»: 15 chicos y 15 chicas elegidos de las 60 para que todas las preguntas sirvan y cada pareja se distinga.
import { CARAS } from './caras.js';
const IDS = [6, 7, 8, 9, 10, 11, 14, 17, 20, 24, 25, 26, 27, 28, 32, 33, 34, 35, 36, 37, 39, 41, 44, 45, 48, 50, 51, 53, 54, 58];
export const CARAS_DEFECTO = IDS.map(id => ({ ...CARAS.find(f => f.id === id) }));
