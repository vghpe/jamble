/// <reference path="./types.ts" />

namespace Jamble {
  export class LevelElementManager {
    private elements = new Map<string, LevelElement>();
    private activeIds = new Set<string>();
    private registry: LevelElementRegistry | null = null;

    constructor(registry?: LevelElementRegistry){
      if (registry) this.registry = registry;
    }

    attachRegistry(registry: LevelElementRegistry): void {
      this.registry = registry;
    }

    getRegistry(): LevelElementRegistry | null {
      return this.registry;
    }

    add(element: LevelElement, options?: { active?: boolean }): void {
      this.elements.set(element.id, element);
      const lifecycleCtx: LevelElementLifecycleContext = { manager: this };
      if (element.init) element.init(lifecycleCtx);
      const active = options && options.active === false ? false : true;
      if (active){
        this.activeIds.add(element.id);
        if (element.activate) element.activate(lifecycleCtx);
      } else {
        this.activeIds.delete(element.id);
      }
    }

    spawnFromRegistry(id: string, options: { instanceId?: string; config?: any; host?: HTMLElement; active?: boolean } = {}): LevelElement | undefined {
      if (!this.registry) return undefined;
      const descriptorId = options.instanceId || id;
      if (this.elements.has(descriptorId)) return this.elements.get(descriptorId);
      const instance = this.registry.create(id, {
        manager: this,
        config: options.config,
        host: options.host,
        instanceId: descriptorId
      });
      if (!instance) return undefined;
      this.add(instance, { active: options.active });
      return instance;
    }

    remove(id: string): void {
      const element = this.elements.get(id);
      if (!element){
        this.activeIds.delete(id);
        return;
      }
      const lifecycleCtx: LevelElementLifecycleContext = { manager: this };
      if (this.activeIds.has(id) && element.deactivate) element.deactivate(lifecycleCtx);
      if (element.dispose) element.dispose(lifecycleCtx);
      this.elements.delete(id);
      this.activeIds.delete(id);
    }

    setActive(id: string, active: boolean): void {
      const element = this.elements.get(id);
      if (!element) return;
      const lifecycleCtx: LevelElementLifecycleContext = { manager: this };
      if (active){
        if (!this.activeIds.has(id)){
          this.activeIds.add(id);
          if (element.activate) element.activate(lifecycleCtx);
        }
      } else if (this.activeIds.has(id)){
        this.activeIds.delete(id);
        if (element.deactivate) element.deactivate(lifecycleCtx);
      }
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
        const hit = predicate(el);
        if (hit){
          if (el.onCollision) el.onCollision({ manager: this });
          return true;
        }
      }
      return false;
    }

    tick(deltaMs: number): void {
      if (deltaMs <= 0) return;
      const ctx: LevelElementTickContext = { manager: this, deltaMs };
      for (const id of this.activeIds){
        const el = this.elements.get(id);
        if (!el || !el.tick) continue;
        el.tick(ctx);
      }
    }

    clear(): void {
      const ids = Array.from(this.elements.keys());
      ids.forEach(id => this.remove(id));
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
