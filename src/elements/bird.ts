/// <reference path="./types.ts" />

namespace Jamble {
  export class BirdElement implements LevelElement {
    readonly id: string;
    readonly type: LevelElementType = 'bird';
    readonly el: HTMLElement;
    readonly collidable: boolean = true;
    private defaultDisplay: string = '';
    private initialized: boolean = false;

    constructor(id: string, el: HTMLElement){
      this.id = id;
      this.el = el;
      this.el.classList.add('jamble-bird');
      this.el.textContent = '🐦';
    }

    rect(): DOMRect { return this.el.getBoundingClientRect(); }

    init(): void {
      if (this.initialized) return;
      this.initialized = true;
      const current = this.el.style.display;
      this.defaultDisplay = current && current !== 'none' ? current : '';
      this.el.style.display = 'none';
    }

    activate(): void {
      this.el.style.display = this.defaultDisplay || '';
    }

    deactivate(): void {
      this.el.style.display = 'none';
    }

    dispose(): void {
      this.el.style.display = 'none';
    }
  }
}
