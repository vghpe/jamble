namespace Jamble {
  export type LevelElementType = 'tree' | 'bird' | 'empty';

  export interface LevelElementLifecycleContext {
    manager: LevelElementManager;
  }

  export interface LevelElementTickContext {
    manager: LevelElementManager;
    deltaMs: number;
  }

  export interface LevelElementCollisionContext {
    manager: LevelElementManager;
    // Future phases can extend with player references or impact metadata
  }

  export interface LevelElement {
    readonly id: string;
    readonly type: LevelElementType;
    readonly el: HTMLElement;
    readonly collidable: boolean;
    rect(): DOMRect;
    init?(ctx: LevelElementLifecycleContext): void;
    activate?(ctx: LevelElementLifecycleContext): void;
    deactivate?(ctx: LevelElementLifecycleContext): void;
    tick?(ctx: LevelElementTickContext): void;
    onCollision?(ctx: LevelElementCollisionContext): void;
    dispose?(ctx: LevelElementLifecycleContext): void;
  }

  export interface PositionableLevelElement extends LevelElement {
    setLeftPct(pct: number): void;
  }

  export function isPositionableLevelElement(el: LevelElement): el is PositionableLevelElement {
    return typeof (el as PositionableLevelElement).setLeftPct === 'function';
  }

  export interface LevelElementDescriptor<TConfig = any> {
    id: string;
    name: string;
    type: LevelElementType;
    defaults?: TConfig;
    create: (options: LevelElementFactoryOptions<TConfig>) => LevelElement;
  }

  export interface LevelElementFactoryOptions<TConfig = any> {
    id: string;
    manager: LevelElementManager;
    config: TConfig;
    host?: HTMLElement;
  }

  export interface LevelElementCreateOptions<TConfig = any> {
    manager: LevelElementManager;
    config?: TConfig;
    host?: HTMLElement;
    instanceId?: string;
  }

  export class LevelElementRegistry {
    private descriptors = new Map<string, LevelElementDescriptor<any>>();

    register<TConfig = any>(desc: LevelElementDescriptor<TConfig>): void {
      this.descriptors.set(desc.id, desc as LevelElementDescriptor<any>);
    }

    unregister(id: string): void {
      this.descriptors.delete(id);
    }

    get<TConfig = any>(id: string): LevelElementDescriptor<TConfig> | undefined {
      return this.descriptors.get(id) as LevelElementDescriptor<TConfig> | undefined;
    }

    create<TConfig = any>(elementId: string, options: LevelElementCreateOptions<TConfig>): LevelElement | undefined {
      const desc = this.descriptors.get(elementId) as LevelElementDescriptor<TConfig> | undefined;
      if (!desc) return undefined;
      const cfg = (options.config !== undefined ? options.config : desc.defaults) as TConfig;
      const instId = options.instanceId || elementId;
      const factoryOptions: LevelElementFactoryOptions<TConfig> = {
        id: instId,
        manager: options.manager,
        host: options.host,
        config: cfg
      };
      return desc.create(factoryOptions);
    }
  }

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
