namespace Jamble {
  export type LevelElementType = 'tree' | 'empty';

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
    private activeIds = new Set<string>();

    add(element: LevelElement, options?: { active?: boolean }): void {
      this.elements.set(element.id, element);
      const active = options && options.active === false ? false : true;
      if (active) this.activeIds.add(element.id);
      else this.activeIds.delete(element.id);
    }

    remove(id: string): void {
      this.elements.delete(id);
      this.activeIds.delete(id);
    }

    setActive(id: string, active: boolean): void {
      if (!this.elements.has(id)) return;
      if (active) this.activeIds.add(id);
      else this.activeIds.delete(id);
    }

    isActive(id: string): boolean {
      return this.activeIds.has(id);
    }

    get<T extends LevelElement = LevelElement>(id: string): T | undefined {
      return this.elements.get(id) as T | undefined;
    }

    getPositionable(id: string): PositionableLevelElement | undefined {
      const el = this.elements.get(id);
      if (!el || !this.activeIds.has(id)) return undefined;
      if (isPositionableLevelElement(el)) return el;
      return undefined;
    }

    getPositionablesByType(type: LevelElementType): PositionableLevelElement[] {
      const list: PositionableLevelElement[] = [];
      this.activeIds.forEach(id => {
        const el = this.elements.get(id);
        if (!el || el.type !== type) return;
        if (isPositionableLevelElement(el)) list.push(el);
      });
      return list;
    }

    forEach(cb: (element: LevelElement) => void): void {
      this.activeIds.forEach(id => {
        const el = this.elements.get(id);
        if (el) cb(el);
      });
    }

    getByType(type: LevelElementType): LevelElement[] {
      const list: LevelElement[] = [];
      this.activeIds.forEach(id => {
        const el = this.elements.get(id);
        if (el && el.type === type) list.push(el);
      });
      return list;
    }

    someCollidable(predicate: (element: LevelElement) => boolean): boolean {
      for (const id of this.activeIds){
        const el = this.elements.get(id);
        if (!el || !el.collidable) continue;
        if (predicate(el)) return true;
      }
      return false;
    }

    clear(): void {
      this.elements.clear();
      this.activeIds.clear();
    }

    all(): LevelElement[] {
      const list: LevelElement[] = [];
      this.activeIds.forEach(id => {
        const el = this.elements.get(id);
        if (el) list.push(el);
      });
      return list;
    }
  }
}
