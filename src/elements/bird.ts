/// <reference path="./types.ts" />

namespace Jamble {
  export interface BirdElementConfig {
    speed?: number;
    direction?: 1 | -1;
  }

  export class BirdElement implements LevelElement {
    readonly id: string;
    readonly type: LevelElementType = 'bird';
    readonly el: HTMLElement;
    readonly collidable: boolean = true;
    private defaultDisplay: string = '';
    private initialized: boolean = false;
    private positionPx: number | null = null;
    private direction: 1 | -1;
    private speedPxPerSec: number;

    constructor(id: string, el: HTMLElement, cfg?: BirdElementConfig){
      this.id = id;
      this.el = el;
      this.el.classList.add('jamble-bird');
      this.el.textContent = '🐦';
      this.speedPxPerSec = Math.max(5, Math.min(400, cfg?.speed ?? 40));
      this.direction = cfg?.direction === -1 ? -1 : 1;
    }

    rect(): DOMRect { return this.el.getBoundingClientRect(); }

    private resolveHost(): HTMLElement | null {
      return (this.el.offsetParent as HTMLElement | null) || this.el.parentElement;
    }

    private ensurePosition(): void {
      if (this.positionPx !== null) return;
      const host = this.resolveHost();
      if (!host) return;
      const leftStyle = this.el.style.left || '50%';
      let pos = 0;
      if (leftStyle.indexOf('%') !== -1){
        const pct = parseFloat(leftStyle);
        if (!Number.isNaN(pct)) pos = (pct / 100) * host.offsetWidth;
      } else {
        const raw = parseFloat(leftStyle);
        if (!Number.isNaN(raw)) pos = raw;
      }
      if (!Number.isFinite(pos)) pos = host.offsetWidth / 2;
      pos = Math.max(0, Math.min(pos, Math.max(0, host.offsetWidth - this.el.offsetWidth)));
      this.positionPx = pos;
      this.applyPosition();
    }

    private applyPosition(): void {
      if (this.positionPx === null) return;
      this.el.style.left = this.positionPx + 'px';
    }

    init(): void {
      if (this.initialized) return;
      this.initialized = true;
      const current = this.el.style.display;
      this.defaultDisplay = current && current !== 'none' ? current : '';
      this.el.style.display = 'none';
      this.ensurePosition();
    }

    activate(): void {
      this.el.style.display = this.defaultDisplay || '';
      this.ensurePosition();
    }

    deactivate(): void {
      this.el.style.display = 'none';
    }

    dispose(): void {
      this.el.style.display = 'none';
    }

    tick(ctx: LevelElementTickContext): void {
      if (ctx.deltaMs <= 0) return;
      this.ensurePosition();
      if (this.positionPx === null) return;
      const host = this.resolveHost();
      if (!host) return;

      const maxX = Math.max(0, host.offsetWidth - this.el.offsetWidth);
      if (maxX <= 0) return;

      const deltaSec = ctx.deltaMs / 1000;
      const next = this.positionPx + this.direction * this.speedPxPerSec * deltaSec;

      if (next <= 0){
        this.positionPx = 0;
        this.direction = 1;
      } else if (next >= maxX){
        this.positionPx = maxX;
        this.direction = -1;
      } else {
        this.positionPx = next;
      }

      this.applyPosition();
    }
  }
}
