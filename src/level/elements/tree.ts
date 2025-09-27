/// <reference path="./types.ts" />
/// <reference path="../slots/slot-layout-manager.ts" />

namespace Jamble {
  export class TreeElement implements PositionableLevelElement, TransformLevelElement {
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
      
      // Initialize transform with logical dimensions (get initial size from DOM once)
      // Trees are typically 10px wide × 30px tall based on CSS
      this.transform = {
        x: 0, // Will be set by positioning logic
        y: variant === 'ceiling' ? 70 : 0, // Ceiling trees at top, ground trees at bottom
        width: 10,
        height: 30
      };
      
      // Initialize collision config for more forgiving tree collision
      this.collisionConfig = {
        shape: 'rect',
        scaleX: 0.8,  // Make collision box smaller than visual (8px wide)
        scaleY: 0.83, // Make collision box smaller than visual (25px tall)
        offsetX: 0,
        offsetY: 0
      };
    }

    private transform: ElementTransform;
    private collisionConfig: CollisionConfig;

    rect(): DOMRect { return this.el.getBoundingClientRect(); }

    // TransformElement interface implementation
    getTransform(): ElementTransform {
      return { ...this.transform };
    }

    getCollisionConfig(): CollisionConfig {
      return { ...this.collisionConfig };
    }

    syncVisualToTransform(): void {
      // Trees are positioned via CSS (percentage-based), so sync is handled by setLeftPct
      // This method exists for interface compliance
    }

    // Hybrid collision detection - DOM for position, transform data for sizing
    getCollisionShape(): CollisionShape {
      // Get current visual position from DOM (reliable)
      const visualRect = this.el.getBoundingClientRect();
      
      // Calculate collision size from transform + config (configurable)
      const collisionWidth = this.transform.width * this.collisionConfig.scaleX;
      const collisionHeight = this.transform.height * this.collisionConfig.scaleY;
      
      // Center the collision box within the visual bounds
      const offsetX = (visualRect.width - collisionWidth) / 2 + this.collisionConfig.offsetX;
      const offsetY = (visualRect.height - collisionHeight) / 2 + this.collisionConfig.offsetY;
      
      const collisionBounds = new DOMRect(
        visualRect.x + offsetX,
        visualRect.y + offsetY,
        collisionWidth,
        collisionHeight
      );
      
      return CollisionManager.createRectShape(collisionBounds, 'deadly');
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
