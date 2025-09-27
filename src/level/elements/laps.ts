/// <reference path="./types.ts" />

namespace Jamble {
  export interface LapsElementConfig {
    value?: number;
  }

  export class LapsElement implements LevelElement, TransformLevelElement {
    readonly id: string;
    readonly type: LevelElementType = 'laps';
    readonly el: HTMLElement;
    readonly collidable: boolean = false;
    readonly deadly: boolean = false;    // Laps counter is non-collidable and harmless
    private value: number;
    
    // Transform-based properties (for consistency, though not used for collision)
    private transform: ElementTransform;
    private collisionConfig: CollisionConfig;

    constructor(id: string, el: HTMLElement, config?: LapsElementConfig){
      this.id = id;
      this.el = el;
      this.el.classList.add('jamble-laps');
      this.el.setAttribute('aria-hidden', 'true');
      this.el.style.display = 'none';
      this.value = clampLaps(config?.value);
      
      // Initialize transform for consistency (not used for collision since non-collidable)
      this.transform = {
        x: 0,
        y: 0,
        width: 20,
        height: 20
      };
      
      // Initialize collision config (not used but required for interface)
      this.collisionConfig = {
        shape: 'rect',
        scaleX: 1,
        scaleY: 1,
        offsetX: 0,
        offsetY: 0
      };
    }

    rect(): DOMRect {
      return this.el.getBoundingClientRect();
    }

    // TransformElement interface implementation
    getTransform(): ElementTransform {
      return { ...this.transform };
    }

    getCollisionConfig(): CollisionConfig {
      return { ...this.collisionConfig };
    }

    syncVisualToTransform(): void {
      // LapsElement is non-visual/non-collidable, no sync needed
      // This method exists for interface compliance
    }

    getValue(): number {
      return this.value;
    }

    setValue(next: number): void {
      this.value = clampLaps(next);
    }

    increment(): number {
      this.value = clampLaps(this.value + 1);
      return this.value;
    }
  }

  function clampLaps(value?: number): number {
    if (!Number.isFinite(value)) return 1;
    return Math.max(1, Math.min(9, Math.floor(value!)));
  }
}
