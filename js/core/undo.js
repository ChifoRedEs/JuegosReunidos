// Pila de deshacer genérica: guarda copias del estado (el juego decide qué es "estado").
export class Pila {
  constructor(max = 200, items = []) { this.max = max; this.a = Array.isArray(items) ? items.slice(-max) : []; }
  push(x) { this.a.push(x); if (this.a.length > this.max) this.a.shift(); }
  pop() { return this.a.pop(); }
  get length() { return this.a.length; }
  vaciar() { this.a.length = 0; }
  toJSON() { return this.a; }
}
