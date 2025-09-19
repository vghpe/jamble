/// <reference path="./types.ts" />

namespace Jamble {
  export interface LapsElementConfig {
    value?: number;
  }

  export class LapsElement implements LevelElement {
    readonly id: string;
    readonly type: LevelElementType = 'laps';
    readonly el: HTMLElement;
    readonly collidable: boolean = false;
    private value: number;

    constructor(id: string, el: HTMLElement, config?: LapsElementConfig){
      this.id = id;
      this.el = el;
      this.el.classList.add('jamble-laps');
      this.el.setAttribute('aria-hidden', 'true');
      this.el.style.display = 'none';
      this.value = clampLaps(config?.value);
    }

    rect(): DOMRect {
      return this.el.getBoundingClientRect();
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
