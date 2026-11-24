// Estado del usuario. Aún no hay cuentas ni servidor: esta capa solo prepara la estructura.
//  · usuarioActual(): null = invitado. Más adelante devolverá { alias, ... } con la sesión iniciada.
//  · esPremium(): hoy sale de un interruptor de PRUEBA (Usuario → «Modo prueba»); luego vendrá de la compra real.
import { leer, escribir } from './storage.js';
export const usuarioActual = () => null;
export const esPremium = () => leer('premiumPrueba', false) === true;
export const ponerPremiumPrueba = v => escribir('premiumPrueba', !!v);
