/// <reference path="./types.ts" />

namespace Jamble {
  export class TreeElement implements PositionableLevelElement {
    readonly id: string;
    readonly type: LevelElementType;
    readonly el: HTMLElement;
    readonly collidable: boolean = true;
    private defaultDisplay: string = '';
    private initialized: boolean = false;
    private variant: 'ground' | 'ceiling';

    constructor(id: string, el: HTMLElement, variant: 'ground' | 'ceiling' = 'ground'){
      this.id = id;
      this.el = el;
      this.variant = variant;
      this.type = variant === 'ceiling' ? 'tree_ceiling' : 'tree';
      if (variant === 'ceiling'){
        this.el.classList.add('jamble-tree', 'jamble-tree-ceiling');
        this.el.textContent = '🌲';
      } else {
        this.el.classList.add('jamble-tree');
        if (this.el.classList.contains('jamble-tree-ceiling')) this.el.classList.remove('jamble-tree-ceiling');
        if (this.el.textContent === '🌲') this.el.textContent = '';
      }
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
      if (this.variant === 'ceiling') this.el.textContent = '🌲';
    }

    activate(): void {
      if (this.variant === 'ceiling') this.el.textContent = '🌲';
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
