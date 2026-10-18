// Cronómetro que se pausa solo cuando la pestaña no está visible.
export class Cronometro {
  constructor(alTick, seg = 0) {
    this.s = seg; this.alTick = alTick; this.id = null; this.activo = false;
    this._vis = () => (document.hidden ? this._parar() : this._seguir());
  }
  iniciar() { if (this.activo) return; this.activo = true; document.addEventListener('visibilitychange', this._vis); this._seguir(); }
  pausar() { this.activo = false; this._parar(); }
  detener() { this.pausar(); document.removeEventListener('visibilitychange', this._vis); }
  _seguir() { if (!this.activo || this.id || document.hidden) return; this.id = setInterval(() => { this.s++; if (this.alTick) this.alTick(this.s); }, 1000); }
  _parar() { clearInterval(this.id); this.id = null; }
}
