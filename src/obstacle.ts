namespace Jamble {
  export class Obstacle {
    private el: HTMLElement;
    constructor(el: HTMLElement){ this.el = el; }
    rect(): DOMRect { return this.el.getBoundingClientRect(); }
    setLeftPct(pct: number): void {
      const n = Math.max(0, Math.min(100, pct));
      this.el.style.left = n.toFixed(1) + '%';
    }
  }
}
