/// <reference path="./types.ts" />

namespace Jamble {
  export class TreeElement implements PositionableLevelElement {
    readonly id: string;
    readonly type: LevelElementType = 'tree';
    readonly el: HTMLElement;
    readonly collidable: boolean = true;
    private defaultDisplay: string = '';
    private initialized: boolean = false;

    constructor(id: string, el: HTMLElement){
      this.id = id;
      this.el = el;
    }

    rect(): DOMRect { return this.el.getBoundingClientRect(); }

    setLeftPct(pct: number): void {
      const n = Math.max(0, Math.min(100, pct));
      this.el.style.left = n.toFixed(1) + '%';
    }

    init(): void {
      if (this.initialized) return;
      this.initialized = true;
      const current = this.el.style.display;
      this.defaultDisplay = current && current !== 'none' ? current : '';
      this.el.style.display = 'none';
    }

    activate(): void {
      this.el.style.display = this.defaultDisplay;
    }

    deactivate(): void {
      this.el.style.display = 'none';
    }

    dispose(): void {
      this.el.style.display = 'none';
    }
  }
}
