/// <reference path="./types.ts" />
/// <reference path="../slots/slot-layout-manager.ts" />

namespace Jamble {
  export class TreeElement implements PositionableLevelElement {
    readonly id: string;
    readonly type: LevelElementType;
    readonly el: HTMLElement;
    readonly collidable: boolean = true;
    readonly deadly: boolean = true;     // Trees are deadly obstacles
    private defaultDisplay: string = '';
    private initialized: boolean = false;
    private variant: 'ground' | 'ceiling';

    constructor(id: string, el: HTMLElement, variant: 'ground' | 'ceiling' = 'ground'){
      this.id = id;
      this.el = el;
      this.variant = variant;
      this.type = variant === 'ceiling' ? 'tree_ceiling' : 'tree';
      this.el.classList.add('jamble-tree');
      if (variant === 'ceiling') this.el.classList.add('jamble-tree-ceiling');
    }

    rect(): DOMRect { return this.el.getBoundingClientRect(); }

    getCollisionShape(): CollisionShape {
      const visualRect = this.el.getBoundingClientRect();
      // Make collision box smaller than visual for more forgiving gameplay
      // CSS: trees are 10px wide × 30px tall, make collision 8px × 25px
      const collisionWidth = 8;
      const collisionHeight = 25;
      
      // Center the collision box within the visual bounds
      const offsetX = (visualRect.width - collisionWidth) / 2;
      const offsetY = (visualRect.height - collisionHeight) / 2;
      
      const collisionBounds = new DOMRect(
        visualRect.x + offsetX,
        visualRect.y + offsetY,
        collisionWidth,
        collisionHeight
      );
      
      return CollisionManager.createRectShape(collisionBounds);
    }

    setLeftPct(pct: number): void {
      const n = Math.max(0, Math.min(100, pct));
      this.el.style.left = n.toFixed(1) + '%';
    }

    isCeiling(): boolean { return this.variant === 'ceiling'; }

    applyVerticalFromSlot(slot: SlotDefinition, host: HTMLElement): void {
      if (!this.isCeiling()){
        this.el.style.top = 'auto';
        this.el.style.bottom = '0px';
        return;
      }
      const hostHeight = host.offsetHeight || host.getBoundingClientRect().height || 0;
      const clamped = Math.max(0, Math.min(hostHeight, slot.yPx));
      const topPx = Math.max(0, hostHeight - clamped);
      this.el.style.bottom = 'auto';
      this.el.style.top = topPx.toFixed(1) + 'px';
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

    getOrigin(): ElementOrigin {
      return this.isCeiling()
        ? { x: 0.65, y: 0, xUnit: 'fraction', yUnit: 'fraction' }
        : { x: 0.65, y: 0, xUnit: 'fraction', yUnit: 'fraction' };
    }
  }
}
