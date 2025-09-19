/// <reference path="./types.ts" />
/// <reference path="./slot-manager.ts" />

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
    private assignedSlot: SlotDefinition | null = null;
    private debugFlashTimer: number | null = null;

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
      let color = '#ff9800';
      let tag = 'ensure%';
      if (leftStyle.indexOf('%') !== -1){
        const pct = parseFloat(leftStyle);
        if (!Number.isNaN(pct)) pos = (pct / 100) * host.offsetWidth;
      } else {
        const raw = parseFloat(leftStyle);
        if (!Number.isNaN(raw)){
          pos = raw;
          color = '#2196f3';
          tag = 'ensurepx';
        }
      }
      if (!Number.isFinite(pos)) pos = host.offsetWidth / 2;
      const max = Math.max(0, host.offsetWidth - this.el.offsetWidth);
      pos = Math.max(0, Math.min(pos, max));
      this.positionPx = pos;
      this.applyPosition();
      this.debugFlash(tag + ':' + pos.toFixed(1), color);
    }

    private applyPosition(): void {
      if (this.positionPx === null) return;
      this.el.style.left = this.positionPx + 'px';
    }

    private applyVerticalFromSlot(): void {
      if (!this.assignedSlot) return;
      const host = this.resolveHost();
      if (!host) return;
      const hostHeight = host.offsetHeight || host.getBoundingClientRect().height || 0;
      const maxBottom = Math.max(0, hostHeight - this.el.offsetHeight);
      const originY = this.el.offsetHeight * 0.5;
      const target = this.assignedSlot.yPx - originY;
      const bottomPx = Math.max(0, Math.min(target, maxBottom));
      this.el.style.bottom = bottomPx + 'px';
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
      if (this.assignedSlot){
        this.assignSlot(this.assignedSlot);
      } else {
        this.ensurePosition();
      }
    }

    deactivate(): void {
      this.el.style.display = 'none';
    }

    dispose(): void {
      this.el.style.display = 'none';
    }

    getOrigin(): ElementOrigin {
      return { x: 0.5, y: 0.5, xUnit: 'fraction', yUnit: 'fraction' };
    }

    tick(ctx: LevelElementTickContext): void {
      if (ctx.deltaMs <= 0) return;
      if (this.assignedSlot){
        // host size may have changed; keep vertical aligned to slot and clamp horizontal bounds
        this.applyVerticalFromSlot();
      }
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

    assignSlot(slot: SlotDefinition, leftPx?: number): void {
      this.assignedSlot = slot;
      if (typeof leftPx === 'number'){
        this.setHorizontalPositionPx(leftPx, 'slot');
      }
      this.applyVerticalFromSlot();
      this.debugFlash('slot:' + slot.id, '#4caf50');
    }

    clearSlot(): void {
      this.assignedSlot = null;
      this.positionPx = null;
    }

    private setHorizontalPositionPx(px: number, tag: string): void {
      const host = this.resolveHost();
      let clamped = px;
      if (host){
        const max = Math.max(0, host.offsetWidth - this.el.offsetWidth);
        clamped = Math.max(0, Math.min(px, max));
      }
      this.positionPx = clamped;
      this.applyPosition();
      this.debugFlash(tag + ':' + clamped.toFixed(1), '#8bc34a');
    }

    private debugFlash(tag: string, color: string): void {
      if (!BirdElement.debugFlashesEnabled()) return;
      const el = this.el;
      el.dataset.jambleDebug = tag;
      const prevOutline = el.style.outline;
      const prevOffset = el.style.outlineOffset;
      el.style.outline = '2px solid ' + color;
      el.style.outlineOffset = '2px';
      if (this.debugFlashTimer !== null) window.clearTimeout(this.debugFlashTimer);
      this.debugFlashTimer = window.setTimeout(() => {
        el.style.outline = prevOutline;
        el.style.outlineOffset = prevOffset;
        if (el.dataset.jambleDebug === tag) delete el.dataset.jambleDebug;
        this.debugFlashTimer = null;
      }, 200);
    }

    private static debugFlashesEnabled(): boolean {
      if (typeof window === 'undefined') return false;
      const flags = (window as any).JambleDebug;
      if (!flags) return false;
      if (typeof flags === 'boolean') return flags;
      return !!(flags.birdFlashes || flags.elementFlashes);
    }
  }
}
