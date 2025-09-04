/// <reference path="./constants.ts" />
namespace Jamble {
  export class Countdown {
    private el: HTMLElement;
    private timeout: number | null = null;
    private steps = 0;
    private stepMs = 0;

    constructor(el: HTMLElement){
      this.el = el;
    }

    start(totalMs: number): void {
      this.steps = Math.max(2, Math.ceil(totalMs / 1000));
      this.stepMs = totalMs / this.steps;
      this.el.style.display = 'block';
      this.tick(this.steps);
    }

    private tick(num: number): void {
      this.el.textContent = String(num);
      (this.el.style as CSSStyleDeclaration).animationDuration = this.stepMs + 'ms';
      this.el.classList.remove('jamble-animate');
      void this.el.offsetWidth; // restart animation
      this.el.classList.add('jamble-animate');
      if (this.timeout !== null) window.clearTimeout(this.timeout);
      this.timeout = window.setTimeout(() => {
        const next = num - 1;
        if (next >= 1) this.tick(next);
        else this.hide();
      }, this.stepMs);
    }

    hide(): void {
      if (this.timeout !== null) window.clearTimeout(this.timeout);
      this.timeout = null;
      this.el.style.display = 'none';
      this.el.classList.remove('jamble-animate');
    }

    updatePosition(x: number, y: number): void {
      if (this.el.style.display !== 'block') return;
      this.el.style.left = x + 'px';
      this.el.style.bottom = y + 'px';
    }
  }
}
