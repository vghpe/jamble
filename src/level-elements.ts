namespace Jamble {
  export type LevelElementType = 'tree';

  export interface LevelElement {
    readonly id: string;
    readonly type: LevelElementType;
    readonly el: HTMLElement;
    readonly collidable: boolean;
    rect(): DOMRect;
  }

  export interface PositionableLevelElement extends LevelElement {
    setLeftPct(pct: number): void;
  }

  export function isPositionableLevelElement(el: LevelElement): el is PositionableLevelElement {
    return typeof (el as PositionableLevelElement).setLeftPct === 'function';
  }

  export class TreeElement implements PositionableLevelElement {
    readonly id: string;
    readonly type: LevelElementType = 'tree';
    readonly el: HTMLElement;
    readonly collidable: boolean = true;

    constructor(id: string, el: HTMLElement){
      this.id = id;
      this.el = el;
    }

    rect(): DOMRect { return this.el.getBoundingClientRect(); }

    setLeftPct(pct: number): void {
      const n = Math.max(0, Math.min(100, pct));
      this.el.style.left = n.toFixed(1) + '%';
    }
  }

  export class LevelElementManager {
    private elements = new Map<string, LevelElement>();

    add(element: LevelElement): void {
      this.elements.set(element.id, element);
    }

    remove(id: string): void {
      this.elements.delete(id);
    }

    get<T extends LevelElement = LevelElement>(id: string): T | undefined {
      return this.elements.get(id) as T | undefined;
    }

    getPositionable(id: string): PositionableLevelElement | undefined {
      const el = this.elements.get(id);
      if (el && isPositionableLevelElement(el)) return el;
      return undefined;
    }

    forEach(cb: (element: LevelElement) => void): void {
      this.elements.forEach(cb);
    }

    getByType(type: LevelElementType): LevelElement[] {
      const list: LevelElement[] = [];
      this.elements.forEach(el => { if (el.type === type) list.push(el); });
      return list;
    }

    someCollidable(predicate: (element: LevelElement) => boolean): boolean {
      for (const el of this.elements.values()){
        if (!el.collidable) continue;
        if (predicate(el)) return true;
      }
      return false;
    }

    clear(): void {
      this.elements.clear();
    }

    all(): LevelElement[] { return Array.from(this.elements.values()); }
  }
}

